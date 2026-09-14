/* Brad Devices brand site — shared interactions
   Dark/light theme persistence + Motion (motion.dev, the Framer Motion
   team's vanilla library) scroll-driven animations. */

(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var M = window.Motion || null;

  /* ---- Nav toggle ---- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
      });
    });
  }

  /* ---- Theme toggle + persistence ---- */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function syncThemeUI() {
    if (!themeBtn) return;
    var light = currentTheme() === "light";
    themeBtn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
    if (themeMeta) themeMeta.setAttribute("content", light ? "#F5F7FA" : "#0E1117");
  }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("bdTheme", next); } catch (e) {}
      syncThemeUI();
    });
    syncThemeUI();
  }

  /* ---- Reveal on scroll (Motion) ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var show = function (el) { el.classList.add("visible"); };

  if (M && revealEls.length && !reduce) {
    revealEls.forEach(function (el) {
      var grid = el.closest(".grid, .stat-wall, .timeline, .footer-grid");
      var idx = grid ? Array.prototype.indexOf.call(grid.children, el) : -1;
      var delay = idx < 0 ? 0 : Math.min(idx, 8) * 0.08;
      M.inView(el, function () {
        M.animate(el, { opacity: [0, 1], y: [26, 0] }, {
          duration: 0.75,
          delay: delay,
          easing: [0.22, 1, 0.36, 1]
        });
        setTimeout(function () { show(el); }, delay * 1000 + 750);
      }, { amount: 0.12, margin: "0px 0px -60px 0px" });
    });
  } else if (revealEls.length) {
    revealEls.forEach(show);
  }

  /* ---- Scroll progress rail ---- */
  var bar = document.getElementById("scroll-progress");
  if (M && bar && !reduce) {
    M.scroll(function (p) {
      bar.style.transform = "scaleX(" + p + ")";
    }, { target: document.documentElement, offset: ["start start", "end end"] });
  }

  /* ---- Hero scroll-linked fade + parallax (home only) ---- */
  var hero = document.getElementById("hero-home");
  var heroInner = document.getElementById("hero-inner");
  if (M && hero && heroInner && !reduce) {
    M.scroll(function (p) {
      heroInner.style.opacity = String(1 - p * 0.7);
      heroInner.style.transform = "translateY(" + (p * 70) + "px)";
    }, { target: hero, offset: ["start start", "end start"] });
  }

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var dur = 1400;
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(step);
  }
  var counterIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        runCounter(e.target);
        counterIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(function (el) { counterIO.observe(el); });

  /* ---- Live terminal replay ----
   * Replays a REAL, recorded session from the shipped toolchain.
   * Each line: cmd + out + ok.
   */
  window.BradTerminal = function (host, data, opts) {
    opts = opts || {};
    var speed = opts.speed || 42;          /* ms per character */
    var cmdWait = opts.cmdWait || 500;
    var lineWait = opts.lineWait || 120;

    host.innerHTML = "";
    var pre = document.createElement("div");
    pre.className = "term-body";
    host.appendChild(pre);

    var i = 0;
    function type(text, onDone) {
      var j = 0;
      var node = document.createElement("div");
      node.style.whiteSpace = "pre-wrap";
      pre.appendChild(node);
      (function tick() {
        if (j <= text.length) {
          node.textContent = text.slice(0, j);
          j++;
          setTimeout(tick, speed);
        } else {
          onDone();
        }
      })();
    }
    function cursorLine() {
      var node = document.createElement("div");
      node.className = "c-live";
      var p = document.createElement("span");
      p.className = "prompt";
      p.textContent = "$ ";
      var span = document.createElement("span");
      span.appendChild(document.createTextNode(""));
      span.appendChild(Object.assign(document.createElement("span"), { className: "term-cursor" }));
      node.appendChild(p);
      node.appendChild(span);
      pre.appendChild(node);
      return { node: node, span: span };
    }
    function next() {
      if (i >= data.length) {
        var done = document.createElement("div");
        done.className = "dim";
        done.style.marginTop = "14px";
        done.innerHTML = "&nbsp;◼ end of recorded session — real output from the reference toolchain in this repo";
        pre.appendChild(done);
        return;
      }
      var step = data[i++];
      var cur = cursorLine();
      var cmd = "$ " + step.cmd;
      type(cmd, function () {
        setTimeout(function () {
          cur.node.remove();
          var s = cur.span;
          s.parentNode.replaceChild(document.createElement("span"), s);
          var out = document.createElement("div");
          out.innerHTML = step.out + "&nbsp;<span class='term-cursor'></span>";
          out.style.whiteSpace = "pre-wrap";
          out.style.color = step.ok ? "var(--live)" : "var(--orbit-muted)";
          pre.appendChild(out);
          setTimeout(next, cmdWait);
        }, cmdWait);
      });
    }
    next();
  };

  /* ── Live loop: the toolchain itself, running in this tab. ──
   * bradvector.wasm is compiled from the repo's real bradc.c + bvrt.c
   * (clang --target=wasm32). The terminal below executes assemble, run
   * and gdb for real. Falls back to the recorded session if wasm fails. */
  window.BradWasm = (function () {
    var inst = null;
    function cstr() {
      var e = inst.exports;
      var len = e.brad_wasm_out_len();
      var mem = new Uint8Array(e.memory.buffer);
      var p = e.brad_wasm_out();
      var s = "";
      for (var i = 0; i < len; i++) s += String.fromCharCode(mem[p + i]);
      return s;
    }
    return {
      loaded: function () { return !!inst; },
      load: function () {
        return fetch("/assets/bradvector.wasm").then(function (r) {
          if (!r.ok) throw new Error("wasm fetch " + r.status);
          return r.arrayBuffer();
        }).then(function (buf) {
          return WebAssembly.instantiate(buf, {});
        }).then(function (res) {
          inst = res.instance;
          return inst;
        }, function (err) { inst = null; throw err; });
      },
      call: function (name) {
        if (!inst) throw new Error("wasm not loaded");
        var rc = inst.exports[name]();
        return { rc: rc, out: cstr() };
      }
    };
  })();

  window.BradLive = function (host, fallback, opts) {
    opts = opts || {};
    var speed = opts.speed || 1;               /* ms per char; wasm output is long */
    var cmdWait = opts.cmdWait || 500;

    host.innerHTML = "";
    var pre = document.createElement("div");
    pre.className = "term-body";
    host.appendChild(pre);

    function outMain(text, color, done) {
      var node = document.createElement("div");
      node.style.whiteSpace = "pre-wrap";
      if (color) node.style.color = color;
      pre.appendChild(node);
      var j = 0;
      (function tick() {
        if (j <= text.length) { node.textContent = text.slice(0, j); j++; setTimeout(tick, speed); }
        else if (done) done();
      })();
      return node;
    }
    function prompt(cmd, done) {
      var node = document.createElement("div");
      node.className = "c-live";
      var p = document.createElement("span");
      p.className = "prompt";
      p.textContent = "$ ";
      var span = document.createElement("span");
      span.appendChild(document.createTextNode(""));
      span.appendChild(Object.assign(document.createElement("span"), { className: "term-cursor" }));
      node.appendChild(p);
      node.appendChild(span);
      pre.appendChild(node);
      var j = 0;
      (function tick() {
        if (j <= cmd.length) { span.firstChild.textContent = cmd.slice(0, j); j++; setTimeout(tick, speed); }
        else { span.replaceChild(document.createElement("span"), span.firstChild); if (done) done(); }
      })();
    }
    function typed(label, fn, done) {
      prompt(label, function () {
        setTimeout(function () {
          var text;
          try { text = fn(); } catch (err) { text = "error: " + err.message; }
          outMain(text, "var(--live)", function () { setTimeout(done, cmdWait); });
        }, cmdWait);
      });
    }
    function run() {
      var steps = [
        { cmd: "bradc-cli saxpy.bvbs -o saxpy.bvbc -d",
          out: function () { return window.BradWasm.call("brad_wasm_assemble").out; } },
        { cmd: "bvrt saxpy.bvbc",
          out: function () { return window.BradWasm.call("brad_wasm_run").out; } },
        { cmd: "bradgdb saxpy.bvbc -b 4",
          out: function () { return window.BradWasm.call("brad_wasm_gdb").out; } },
        { cmd: "ctest --test-dir build",
          out: "100% tests passed, 11 tests out of 11\nBradVector platform · green" }
      ];
      var i = 0;
      var finalLine =
        "\n◼ live in your browser — bradvector.wasm compiled from the repo's bradc.c + bvrt.c, " +
        "executing just now in this tab.\n◼ the `ctest` line above is CI output captured from the repo.";
      function next() {
        if (i >= steps.length) { outMain(finalLine, "var(--orbit-muted)", null); return; }
        var s = steps[i++];
        typed(s.cmd, function () {
          return typeof s.out === "function" ? s.out() : s.out;
        }, next);
      }
      next();
    }
    window.BradWasm.load().then(run, function () {
      if (window.BradTerminal) window.BradTerminal(host, fallback, { speed: 1 });
      else outMain("live loop unavailable — showing recorded session", "var(--orbit-muted)", null);
    });
  };
})();