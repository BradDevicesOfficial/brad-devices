#!/usr/bin/env node
/* brad-devices CI: static + artifact sanity checks with zero dependencies.
 *
 * Checks:
 *   1. Every *.html parses as balanced script blocks; inline <script> bodies
 *      must compile as JavaScript; external <script src> targets must exist.
 *   2. Every js/*.js file must parse as a script and every referenced
 *      brad_wasm_* export must exist in assets/bradvector.wasm.
 *   3. assets/bradvector.wasm must be a valid WebAssembly module exporting
 *      the full Bridge API surface (toolchain + BVLibs).
 *   4. sitemap.xml URLs must resolve to files in this repo; robots.txt must
 *      point at the sitemap.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, normalize, posix, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
let fails = 0, checks = 0;
const fail = (msg) => { fails++; console.log(`FAIL  ${msg}`); };

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e.startsWith(".")) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (extname(p) === ".html") out.push(p);
  }
  return out;
}

/* --- 1. HTML script balance + inline compile + src existence ----------- */
for (const html of walk(ROOT)) {
  const rel = posix.relative(posix.normalize(ROOT), posix.normalize(html));
  const src = readFileSync(html, "utf8");
  const opens = (src.match(/<script\b/gi) || []).length;
  const closes = (src.match(/<\/script\s*>/gi) || []).length;
  checks++;
  if (opens !== closes)
    fail(`${rel}: ${opens} <script> but ${closes} </script>`);

  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const attrs = m[1] || "", body = m[2] || "", trim = body.trim();
    const typeMatch = /\btype=(["'])([^"']*)\1/.exec(attrs);
    const type = typeMatch ? typeMatch[2] : "";
    if (type && !/^(text\/javascript|application\/javascript|module)$/i.test(type))
      continue; // JSON, MIME-tagged data, etc.
    const srcMatch = /\bsrc=(["'])([^"']+)\1/.exec(attrs);
    checks++;
    if (srcMatch) {
      const target = normalize(join(dirname(html), posix.normalize(srcMatch[2])));
      if (!existsSync(target)) fail(`${rel}: script src="${srcMatch[2]}" not found`);
      continue;
    }
    if (!trim || /^\s*<!--|<!--[\s\S]*?-->/.test(trim)) continue; // empty or comments only
    checks++;
    try { new Script(body, { filename: `${rel}:inline` }); }
    catch (e) { fail(`${rel}: inline script does not parse — ${e.message}`); }
  }
}

/* --- 2 + 3. wasm exports vs JS references + module validity ------------- */
const wasmPath = join(ROOT, "assets", "bradvector.wasm");
checks++;
let exports = [];
if (existsSync(wasmPath)) {
  try {
    const mod = new WebAssembly.Module(readFileSync(wasmPath));
    exports = WebAssembly.Module.exports(mod).map((e) => e.name);
  } catch (e) { fail(`assets/bradvector.wasm: not a valid WebAssembly module — ${e.message}`); }
} else fail("assets/bradvector.wasm missing");

const REQUIRED = [
  "brad_wasm_assemble", "brad_wasm_run", "brad_wasm_exec", "brad_wasm_step",
  "brad_wasm_continue", "brad_wasm_breakpoint", "brad_wasm_pc", "brad_wasm_cycles",
  "brad_wasm_read_s", "brad_wasm_read_v", "brad_wasm_read_p", "brad_wasm_mem",
  "brad_wasm_bvml_saxpy", "brad_wasm_bvml_dot", "brad_wasm_bvml_gemm",
  "brad_wasm_bvn_relu", "brad_wasm_bvn_affine", "brad_wasm_bvn_softmax",
  "brad_wasm_bvn_gelu", "brad_wasm_bvn_silu", "brad_wasm_lib_check",
];
for (const r of REQUIRED) {
  checks++;
  if (!exports.includes(r)) fail(`wasm missing export ${r}`);
}

for (const js of ["js/bradvector.js", "js/app.js"]) {
  const p = join(ROOT, ...js.split("/"));
  checks++;
  if (!existsSync(p)) { fail(`${js} missing`); continue; }
  const code = readFileSync(p, "utf8");
  try { new Script(code, { filename: js }); }
  catch (e) { fail(`${js} does not parse — ${e.message}`); continue; }
  for (const ref of code.match(/brad_wasm_[A-Za-z0-9_]+/g) || []) {
    checks++;
    if (!exports.includes(ref)) fail(`${js} references ${ref} but wasm does not export it`);
  }
}

/* --- 4. sitemap / robots ------------------------------------------------- */
for (const f of ["sitemap.xml", "robots.txt"]) {
  const p = join(ROOT, f);
  checks++;
  if (!existsSync(p)) { fail(`${f} missing`); continue; }
  const txt = readFileSync(p, "utf8");
  for (const loc of txt.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    checks++;
    const clean = loc[1].split("//")[1] || loc[1];
    const pathname = clean.includes("/") ? clean.slice(clean.indexOf("/")) : "/";
    const target = join(ROOT, posix.normalize(pathname === "/" ? "index.html" : pathname));
    if (!existsSync(target)) fail(`${f}: ${loc[1]} does not resolve to a file`);
  }
  if (f === "robots.txt" && !/sitemap:/i.test(txt)) fail("robots.txt does not reference a sitemap");
}

const sepLine = "─".repeat(24);
if (fails) {
  console.log(`${sepLine}\n${fails} check(s) FAILED (of ${checks} run)`);
  process.exit(1);
}
console.log(`OK  ${checks} checks passed`);