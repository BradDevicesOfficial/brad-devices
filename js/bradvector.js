/* bradvector.js — typed JS wrapper over the BradVector toolchain wasm.
 *
 * Mirrors the host-facing BradVector Platform API (src/include/brad/
 * bradlib.h) exported by src/wasm/wasm_bridge.c.  The wasm binary in
 * site/assets/bradvector.wasm is compiled by src/wasm/build.sh from the
 * repo's real bradc.c + bvbc.c + bvrt.c + bradgdb.c + bradlib.c.
 *
 * Example:
 *   BradVector.load().then(function () {
 *     var r = BradVector.compile(
 *       ".kernel add\\n" +
 *       "IADD S2, S1, S1\\n" +   // lane*2
 *       "STORE S16, S2, 0\\n" +
 *       "EXIT\\n" +
 *       ".end\\n");
 *     BradVector.create(1 << 20);
 *     var status = BradVector.launch("add", [0]) ? BradVector.exec(10000)
 *                                                : BradVector.Status.TRAP;
 *   });
 *
 * Notes:
 *  - the wasm allocator is a fixed 6 MB arena (freestanding bump
 *    allocator), so long-lived pages should compile a bounded number of
 *    programs; library free() is a no-op there by design.
 *  - the legacy demo exports (brad_wasm_assemble/run/gdb) reset that
 *    arena and are meant for the terminal replay; don't interleave them
 *    with this typed API in one page.
 */
(function (global) {
  "use strict";

  var inst = null;
  var mem8 = null;
  var memV = null;

  /* string/arg staging area: 12 MB, above every .bss/.arena global */
  var enc = 0x0C00000;

  var Status = { OK: 0, TRAP: 1, TIMEOUT: 2, HALT: 3, OOB: 4 };

  function e() {
    if (!inst) throw new Error("BradVector wasm not loaded (await BradVector.load())");
    return inst.exports;
  }
  function mem() {
    if (!mem8) throw new Error("BradVector wasm not loaded (await BradVector.load())");
    return { u8: mem8, v: memV };
  }

  function putStr(s) {
    var a = new TextEncoder().encode(String(s));
    var base = enc;
    mem8.set(a, base);
    mem8[base + a.length] = 0;
    enc += a.length + 1;
    if (enc > 0xFD0000) throw new Error("wasm staging area exhausted");
    return { ptr: base, len: a.length };
  }

  function putArgs(args) {
    var n = args ? args.length : 0;
    var base = enc;
    for (var i = 0; i < n; i++) memV.setUint32(base + i * 4, args[i] >>> 0, true);
    enc += n * 4;
    if (enc > 0xFD0000) throw new Error("wasm staging area exhausted");
    return { ptr: base, len: n };
  }

  function cstr(ptr) {
    var s = "";
    for (var i = ptr; mem8[i]; i++) s += String.fromCharCode(mem8[i]);
    return s;
  }
  function cstrN(ptr, len) {
    var s = "";
    for (var i = 0; i < len; i++) s += String.fromCharCode(mem8[ptr + i]);
    return s;
  }

  /* f32 staging + float-bits helpers for the BVLibs exports. */
  function f32bits(v) {
    var d = new DataView(new ArrayBuffer(4));
    d.setFloat32(0, v, true);
    return d.getUint32(0, true);
  }
  function putF32(arr) {
    var n = arr.length;
    var base = (enc + 3) & ~3;
    for (var i = 0; i < n; i++) memV.setFloat32(base + i * 4, arr[i], true);
    enc = base + n * 4;
    if (enc > 0xFD0000) throw new Error("wasm staging area exhausted");
    return base;
  }
  function readF32(ptr, n) {
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) out[i] = memV.getFloat32(ptr + i * 4, true);
    return out;
  }
  function libSolo(op, x) {
    var n = x.length;
    var xp = putF32(x), op_ = putF32(new Float32Array(n));
    if (e()[op](xp, op_, n)) return null;
    return readF32(op_, n);
  }

  var BradVector = {
    Status: Status,
    ARCH: "BradVector v1.0 (BV — reference model)",
    loaded: function () { return !!inst; },

    /* Instantiate site/assets/bradvector.wasm.  Resolves on success. */
    load: function () {
      return fetch("/assets/bradvector.wasm").then(function (r) {
        if (!r.ok) throw new Error("wasm fetch " + r.status);
        return r.arrayBuffer();
      }).then(function (buf) {
        return WebAssembly.instantiate(buf, {});
      }).then(function (res) {
        inst = res.instance;
        mem8 = new Uint8Array(inst.exports.memory.buffer);
        memV = new DataView(inst.exports.memory.buffer);
        return inst;
      }, function (err) { inst = null; throw err; });
    },

    /* Compile .bvbs source text.  Result:
     *   { ok:true, kernels:[name...], insnCount:n }
     *   { ok:false, errorLine:n, errorMsg:"..." } */
    compile: function (src) {
      var t = putStr(src);
      var ex = e();
      if (!ex.brad_wasm_compile(t.ptr, t.len)) {
        return {
          ok: false,
          errorLine: ex.brad_wasm_error_line(),
          errorMsg: cstrN(ex.brad_wasm_error_msg(), ex.brad_wasm_error_msg_len())
        };
      }
      var nk = ex.brad_wasm_kernel_count();
      var kernels = [];
      for (var i = 0; i < nk; i++) kernels.push(cstr(ex.brad_wasm_kernel_name(i)));
      return { ok: true, kernels: kernels, insnCount: ex.brad_wasm_insn_count() };
    },

    /* Disassemble one instruction at pc into text. */
    disasm: function (pc) {
      var ex = e();
      if (ex.brad_wasm_disasm(pc >>> 0)) return "";
      return cstrN(ex.brad_wasm_out(), ex.brad_wasm_out_len());
    },

    /* ── session ── */
    create: function (memBytes) { return !!e().brad_wasm_create(memBytes >>> 0); },
    launch: function (kernel, args) {
      var k = putStr(kernel);
      var a = putArgs(args);
      return !!e().brad_wasm_launch(k.ptr, a.ptr, a.len);
    },
    exec: function (maxInsns) { return e().brad_wasm_exec(maxInsns >>> 0); },
    step: function () { return e().brad_wasm_step(); },
    continue: function () { return e().brad_wasm_continue(); },
    breakpoint: function (pc) {
      var id = e().brad_wasm_breakpoint(pc >>> 0);
      return id === 0xFFFFFFFF ? -1 : id;
    },

    /* ── inspection ── */
    pc: function () { return e().brad_wasm_pc(); },
    cycles: function () { return e().brad_wasm_cycles(); },
    readS: function (lane, reg) { return e().brad_wasm_read_s(lane >>> 0, reg >>> 0); },
    readV: function (lane, reg, lane16) { return e().brad_wasm_read_v(lane >>> 0, reg >>> 0, lane16 >>> 0); },
    readP: function (lane, preg) { return e().brad_wasm_read_p(lane >>> 0, preg >>> 0); },

    /* ── host access to kernel LOAD/STORE memory (flat SPMP) ── */
    memBase: function () { return e().brad_wasm_mem(); },
    memSize: function () { return e().brad_wasm_mem_size(); },
    memDataView: function () { return memV; },
    memBytes: function () {
      var ex = e();
      return new Uint8Array(ex.memory.buffer, ex.brad_wasm_mem(), ex.brad_wasm_mem_size());
    },
    writeU32: function (off, val) { memV.setUint32(off >>> 0, val >>> 0, true); return this; },
    readU32: function (off) { return memV.getUint32(off >>> 0, true); },

    /* ── BVLibs (BVML/BVN) ──
     * Reference GEMM / NN primitives running on the in-browser BVRT.
     * Each op takes/returns Float32Array (null on launch failure).
     * check() runs the bridge's self-check and returns {fails, report}. */
    lib: {
      bvmlSaxpy: function (a, x, y) {
        if (x.length !== y.length || !x.length) throw new Error("bvmlSaxpy: length mismatch");
        var n = x.length, xp = putF32(x), yp = putF32(y), op_ = putF32(new Float32Array(n));
        if (e().brad_wasm_bvml_saxpy(f32bits(a), xp, yp, op_, n)) return null;
        return readF32(op_, n);
      },
      bvmlDot: function (x, y) {
        if (x.length !== y.length || !x.length) throw new Error("bvmlDot: length mismatch");
        var n = x.length, xp = putF32(x), yp = putF32(y), op_ = putF32(new Float32Array(1));
        if (e().brad_wasm_bvml_dot(xp, yp, op_, n)) return null;
        return readF32(op_, 1)[0];
      },
      bvmlGemm: function (alpha, A, B, beta, C) {
        if (!(A && B && C) || !A.length || !B.length) throw new Error("bvmlGemm: empty input");
        var nC = C.length, nA = A.length, nB = B.length;
        var M = Math.round(Math.sqrt((nA * nC) / (nB || 1)));
        var Kk = Math.round(nA / M), N = Math.round(nB / Kk);
        if (!(M > 0 && Kk > 0 && N > 0 && M * N === nC && M * Kk === nA && Kk * N === nB))
          throw new Error("bvmlGemm: shapes not MxK * KxN -> MxN ([" + nA + "]x[" + nB + "] -> [" + nC + "])");
        var ap = putF32(A), bp = putF32(B), cp = putF32(C);
        if (e().brad_wasm_bvml_gemm(f32bits(alpha), ap, bp, f32bits(beta), cp, M, N, Kk)) return null;
        return readF32(cp, nC);
      },
      bvnRelu: function (x) { return libSolo("brad_wasm_bvn_relu", x); },
      bvnAffine: function (scale, bias, x) {
        var n = x.length, xp = putF32(x), op_ = putF32(new Float32Array(n));
        if (e().brad_wasm_bvn_affine(f32bits(scale), f32bits(bias), xp, op_, n)) return null;
        return readF32(op_, n);
      },
      bvnSoftmax: function (x) { return libSolo("brad_wasm_bvn_softmax", x); },
      bvnGelu: function (x) { return libSolo("brad_wasm_bvn_gelu", x); },
      bvnSilu: function (x) { return libSolo("brad_wasm_bvn_silu", x); },
      check: function () {
        var ex = e();
        var fails = ex.brad_wasm_lib_check();
        return { fails: fails, report: cstrN(ex.brad_wasm_out(), ex.brad_wasm_out_len()) };
      }
    }
  };

  if (global.BradVector) {
    throw new Error("bradvector.js: BradVector already defined");
  }
  global.BradVector = BradVector;
})(window);