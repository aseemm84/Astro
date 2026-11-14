/* Fit the Kālasetu Siddhānta long-span engine (source/src/js/kalasetu-engine.js).
 *
 * THE TARGET. This site's modern engine — astronomy-engine with the site's own
 * ΔT (deltat.js), apparent geocentric longitude in the ecliptic of date —
 * carried into the Samanvaya–Ecliptic frame with engine.js's own polynomial.
 * 4,800 instants spread over 1 Jan 8000 BCE – 31 Dec 3600 CE, each jittered
 * inside its own slot so no two share a phase. Sampled as production calls the
 * engine: civil time in, no ΔT applied by the engine.
 *
 * THE SPLIT. A hash of the instant, not alternate indices (fit-siddhanta.mjs
 * explains why alternate indices resonate with Mars). Half fit, half held back;
 * every figure written is the held-back half's.
 *
 * THE OPTIMISER. Levenberg–Marquardt on a numerical Jacobian, staged per body:
 * the epoch and bīja first (so nothing has to wrap a circle), then the orbit,
 * then everything. Bodies in dependency order: the Sun (everything reads its
 * mean place), the node, the Moon, then the planets, Guru and Śani twice
 * because each one's perturbation reads the other's mean place.
 *
 * THE SETS. The engine carries three fitted sets (see its header): core
 * (5000 BCE – 3600 CE, centre J2000, kalasetu.json), early (9000 – 3000 BCE,
 * centre 6000 BCE, kalasetu-early.json) and deep (13000 – 8000 BCE, centre
 * 10500 BCE, kalasetu-deep.json). --set picks which one this run fits.
 *
 * Run from the repo root:
 *   node source/test/fit-kalasetu.mjs [--set core|early|deep]   fit and report, write nothing
 *   node source/test/fit-kalasetu.mjs --write    replace the set's data file
 *   node source/test/fit-kalasetu.mjs --bodies Sūrya,Candra   only those (others kept from the file)
 *   --measure            fit nothing: re-measure the file's own numbers (adds bias)
 *   --from-fit FILE      start from another fit, its polynomials re-centred exactly
 *                        on this set's centre; --order N keeps only orders ≤ N
 *                        (for a seed that would otherwise be extrapolated)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
/* the three sets: astronomical years, centre (millennia from J2000), samples, seed */
export const SETCFG = {
  core:  { file: "kalasetu.json",       y0: -4999,  y1: 3600,  tc: 0,     n: 3600, seed: 20261114, label: "5000 BCE – 3600 CE" },
  early: { file: "kalasetu-early.json", y0: -8999,  y1: -2999, tc: -8,    n: 3400, seed: 20261116, label: "9000 – 3000 BCE" },
  deep:  { file: "kalasetu-deep.json",  y0: -12999, y1: -7999, tc: -12.5, n: 3000, seed: 20261117, label: "13000 – 8000 BCE" } };
const SET = arg("--set", "core"), CFG = SETCFG[SET];
if (!CFG) throw new Error("--set must be core, early or deep");
const DATA = ROOT + "/source/data/" + CFG.file;
const only = (() => { const i = process.argv.indexOf("--bodies"); return i > 0 ? process.argv[i + 1].split(",") : null; })();

/* ---- the engines --------------------------------------------------------- */
export function loadAstro() {
  const g = { console, Date, Math, JSON, Float64Array, Array, Object, Error, Number, String,
              isNaN, isFinite, parseFloat, parseInt };
  g.window = g; g.globalThis = g; g.self = g;
  const c = vm.createContext(g);
  vm.runInContext(readFileSync(ROOT + "/source/vendor/astronomy.browser.min.js", "utf8"), c);
  vm.runInContext(readFileSync(ROOT + "/source/src/js/deltat.js", "utf8"), c);
  return g.Astronomy;
}
export function loadSL(A) {
  const g = { console, Date, Math, JSON, Array, Object, Error, Number, String, isNaN, isFinite };
  g.window = g; g.globalThis = g;
  vm.runInContext(readFileSync(ROOT + "/source/src/js/kalasetu-engine.js", "utf8"), vm.createContext(g));
  /* the same ΔT the modern engine uses, exactly as engine.js hands it over */
  if (A) g.KalasetuEngine.setDeltaT(deltaTOf(A));
  return g.KalasetuEngine;
}
export const deltaTOf = A => ms => { const t = A.MakeTime(new Date(ms)); return (t.tt - t.ut) * 86400; };
/* engine.js AYAN_MODES.samanvaya_ecliptic — asserted against the engine by
   kalasetu-verify.mjs, kept here as numbers so this script needs no browser */
export const SAMANVAYA = [0.00030701309468, 1.39688795339, 20.895012118];
export const ayanAt = jd => { const T = (jd - 2451545) / 36525;
  return (SAMANVAYA[0] * T + SAMANVAYA[1]) * T + SAMANVAYA[2]; };
export const norm = x => ((x % 360) + 360) % 360;
export const sdiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; };
export const meanNodeModern = jd => { const T = (jd - 2451545) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000); };

/* engine.js trueNodeAt(), the modern branch, line for line: the ascending node
   of the Moon's instantaneous orbital plane in the ecliptic of date */
export function trueNodeModern(A, date) {
  const dt = 0.0005;
  const ec = t => { const e = A.Ecliptic(A.GeoVector(A.Body.Moon, t, false)); return e.vec ? e.vec : e; };
  const e0 = ec(new Date(date.getTime() - dt * 86400000)), e1 = ec(new Date(date.getTime() + dt * 86400000));
  const v = { x: e1.x - e0.x, y: e1.y - e0.y, z: e1.z - e0.z };
  const r = { x: (e0.x + e1.x) / 2, y: (e0.y + e1.y) / 2, z: (e0.z + e1.z) / 2 };
  const h = { x: r.y * v.z - r.z * v.y, y: r.z * v.x - r.x * v.z, z: r.x * v.y - r.y * v.x };
  return norm(Math.atan2(h.x, -h.y) * 180 / Math.PI);
}
export const NAMES = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars", "Budha": "Mercury",
                       "Guru": "Jupiter", "Śukra": "Venus", "Śani": "Saturn" };

/* ---- the reference ------------------------------------------------------ */
/* the default span is the whole engine's, 13000 BCE – 3600 CE */
/* the instants: n slots over the span, each jittered inside its own */
export function makeInstants(n, seed, y0 = -12999, y1 = 3600) {
  const t0 = Date.UTC(y0, 0, 1), t1 = Date.UTC(y1, 11, 31, 23, 59, 59);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 1) / 2147483648; };
  const out = [];
  for (let i = 0; i < n; i++) out.push(Math.round(t0 + (t1 - t0) * (i + rnd()) / n));
  return out;
}
export function makeReference(A, n, seed, y0 = -12999, y1 = 3600) {
  const out = [];
  for (const ms of makeInstants(n, seed, y0, y1)) {
    const jd = ms / 86400000 + 2440587.5, d = new Date(ms);
    const ay = ayanAt(jd), ref = {}, lat = {};
    for (const sa in NAMES) {
      const e = A.Ecliptic(A.GeoVector(A.Body[NAMES[sa]], d, true));
      ref[sa] = norm(e.elon - ay); lat[sa] = e.elat;
    }
    ref["Rāhu"] = norm(meanNodeModern(jd) - ay);
    ref["Rāhu-true"] = norm(trueNodeModern(A, d) - ay);
    out.push({ ms, jd, ref, lat, key: String(Math.round(ms)) });
  }
  return out;
}
/* the stored reference (source/tools/kalasetu-reference.mjs): JPL DE422 where
   it exists and an integration from its states beyond; rows are
   [ms, source, …longitudes, …latitudes] in this order */
export const REF_LON = ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu", "Rāhu-true"];
export const REF_LAT = ["Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
export const REF_FILE = ROOT + "/source/data/kalasetu-reference.json";
export function loadStoredReference(set, file = REF_FILE) {
  const J = JSON.parse(readFileSync(file, "utf8")), S = J.sets[set];
  if (!S) throw new Error("no set " + set + " in " + file);
  return S.rows.map(row => { const ref = {}, lat = {};
    REF_LON.forEach((b, i) => { ref[b] = row[2 + i]; });
    REF_LAT.forEach((b, i) => { lat[b] = row[2 + REF_LON.length + i]; });
    return { ms: row[0], jd: row[0] / 86400000 + 2440587.5, ref, lat, src: row[1] ? "nbody" : "de422", key: String(row[0]) }; });
}
export const hash = s => { let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296; };

/* lon (and, where the body has one, lat) residuals in arcminutes */
/* THE RIDGE. Perturbation amplitudes enter as extra residuals of
   RIDGE × amplitude (arcminutes per degree), so a term costs something to
   grow. Without it the near-degenerate arguments (see the engine) trade
   against the orbit without limit: a 75° "perturbation" cancelled by its
   neighbours, harmless to the fit and meaningless to read. Added only while
   fitting (withRidge); every reported residual is the plain one. */
/* Set to 0. It was tried at 6 and at 40: it shrinks the individual terms
   but cannot make them physical (the great inequality still came out several
   times its real size), and it cost Śani up to 2′ of accuracy. The page
   therefore shows the planets' residuals across the span, not the terms. */
export const RIDGE = 0;
export function residuals(SL, b, set, withLat, withRidge) {
  const out = [];
  if (withRidge && RIDGE && SL.params()[b]) {
    const P = SL.params()[b];
    for (const k of Object.keys(P)) if (/^(ps|pc)/.test(k)) out.push(RIDGE * P[k]);
  }
  for (const s of set) {
    if (b === "Rāhu-true") { out.push(sdiff(SL.trueNode(s.ms), s.ref[b]) * 60); continue; }
    out.push(sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
    if (withLat) out.push((SL.latitude(b, s.ms) - s.lat[b]) * 60);
  }
  return out;
}
const mean = a => a.length ? a.reduce((p, c) => p + c, 0) / a.length : 0;
const rms = a => Math.sqrt(a.reduce((p, c) => p + c * c, 0) / a.length);
const worst = a => Math.max(...a.map(Math.abs));

function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    const d = M[i][i] || 1e-30;
    for (let r = 0; r < n; r++) { if (r === i) continue; const f = M[r][i] / d;
      if (f) for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c]; }
  }
  return M.map((r, i) => r[n] / (r[i] || 1e-30));
}
function lm(SL, b, keys, set, withLat, iters) {
  const P = SL.params()[b === "Rāhu-true" ? "Rāhu" : b];
  const res = () => residuals(SL, b, set, withLat, true);
  let lam = 1e-3, r = res(), f = r.reduce((p, c) => p + c * c, 0);
  for (let it = 0; it < iters; it++) {
    /* the linear amplitudes take their columns from the engine's closed-form
       basis — one pass over the samples instead of one per parameter, which
       for Guru and Śani (about 180 terms each) is the difference between
       seconds and the better part of an hour */
    const LIN = /^(ps|pc|L\d|B\d|t\d|t_\d)/;
    const BS = keys.some(k => LIN.test(k)) ? set.map(s => SL.basis(b, s.ms)) : null;
    const J = keys.map(k => {
      if (BS && LIN.test(k)) {
        const col = [];
        if (RIDGE && /^(ps|pc)/.test(k)) for (const kk of Object.keys(P)) if (/^(ps|pc)/.test(kk)) col.push(kk === k ? RIDGE : 0);
        for (const B of BS) { const v = B[k] || [0, 0]; col.push(v[0] * 60); if (withLat) col.push(v[1] * 60); }
        return col;
      }
      const h = 1e-6 * (Math.abs(P[k]) + 1e-2); P[k] += h;
      const r2 = res(); P[k] -= h; return r2.map((v, i) => (v - r[i]) / h); });
    const n = keys.length;
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      let s = 0; const a = J[i], c = J[j]; for (let t = 0; t < a.length; t++) s += a[t] * c[t];
      A[i][j] = A[j][i] = s; }
    const g = J.map(a => { let s = 0; for (let t = 0; t < a.length; t++) s += a[t] * r[t]; return s; });
    let ok = false;
    for (let tries = 0; tries < 8; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => i === j ? v * (1 + lam) + 1e-9 : v));
      const d = solve(Ad, g.map(x => -x)), old = keys.map(k => P[k]);
      keys.forEach((k, i) => { P[k] += d[i]; });
      const r2 = res(), f2 = r2.reduce((p, c) => p + c * c, 0);
      if (f2 < f) { const gain = (f - f2) / f; r = r2; f = f2; lam /= 3; ok = true;
        if (gain < 1e-7) it = iters; break; }
      keys.forEach((k, i) => { P[k] = old[i]; }); lam *= 4;
    }
    if (!ok) break;
  }
}

/* ---- re-centring a fit ----------------------------------------------------
   A set's secular terms are polynomials in Tm − tc. Moving a fit from centre c0
   to c1 re-expands each one exactly: p(x) = Σ a_k x^k with x = y + (c1 − c0)
   gives q(y) = Σ_j y^j Σ_{k≥j} a_k C(k, j) d^(k−j). The amplitudes that drift
   (×T, ×T²) are re-expanded the same way within their group. */
function shift(a, d, order) {
  const b = new Array(a.length).fill(0), C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  for (let j = 0; j < a.length; j++) for (let k = j; k < a.length; k++) b[j] += a[k] * C(k, j) * Math.pow(d, k - j);
  return b.map((v, j) => j <= order ? v : 0);
}
export function recentre(SL, Q, c0, c1, order = 99) {
  const P = SL.params(), d = c1 - c0, E0 = { "Sūrya": 0.0167, "Budha": 0.2056, "Śukra": 0.0068, "Maṅgala": 0.0934, "Guru": 0.0484, "Śani": 0.0539 };
  const K = SL.keysAll();
  for (const b of SL.BODIES) {
    const src = (Q.params || {})[b] || {}, dst = P[b];
    for (const k of Object.keys(dst)) dst[k] = src[k] || 0;
    const fam = (pre, n) => { const a = []; for (let i = 0; i < n; i++) a.push(dst[pre + i] || 0); return a; };
    const put = (pre, a) => a.forEach((v, i) => { if ((pre + i) in dst) dst[pre + i] = v; });
    for (const [pre, n] of [["l", 6], ["c", 5], ["t_", 4], ["w", 6], ["n", 4], ["i", 4]]) {
      if (!((pre + "0") in dst)) continue;
      put(pre, shift(fam(pre, n), d, order));
    }
    if ("e1" in dst) {   /* e = E0(1 + e0) + 0.001 Σ e_k T^k */
      const a = fam("e", 6); a[0] = E0[b] * a[0] * 1000;
      const q = shift(a, d, order); q[0] = q[0] / (1000 * E0[b]); put("e", q);
    }
    /* drifting amplitudes: groups of the same argument at T^0, T^1, T^2 */
    const groups = (list, keyOf, tpOf, names) => {
      const G = {}; list.forEach((t, i) => { const g = keyOf(t); (G[g] = G[g] || [])[tpOf(t)] = i; });
      for (const g in G) { const idx = G[g]; if (idx.length < 2) continue;
        for (const nm of names) { const a = idx.map(i => i == null ? 0 : (dst[nm + i] || 0));
          const q = shift(a, d, 99); idx.forEach((i, j) => { if (i != null && (nm + i) in dst) dst[nm + i] = q[j]; }); } }
    };
    if (b === "Guru" || b === "Śani") groups(K.PERT[b], t => [t[0], t[1], t[2], t[4]].join(), t => t[3], ["ps", "pc"]);
    if (b === "Rāhu") groups(K.NODE_TRUE, t => t.slice(0, 5).join(), t => t[5], ["t"]);
  }
}

/* ---- run ----------------------------------------------------------------- */
if (import.meta.url === "file://" + process.argv[1]) {
  const A = loadAstro(), SL = loadSL(A);
  SL.use(SET);
  if (existsSync(DATA)) SL.setData(JSON.parse(readFileSync(DATA, "utf8")), SET);
  else SL.setData({ set: SET, params: null }, SET);
  SL.use(SET);
  /* --reset A,B: start those bodies from zero (the J2000 starting elements) */
  { const i = process.argv.indexOf("--reset");
    if (i > 0) for (const b of process.argv[i + 1].split(",")) { const P = SL.params()[b];
      for (const k of Object.keys(P)) P[k] = 0; console.log("reset " + b); } }
  /* --seed FILE: start from a parameter file keyed by English names (the
     prototype that established the term lists wrote one) */
  { const i = process.argv.indexOf("--seed");
    if (i > 0) { const Q = JSON.parse(readFileSync(process.argv[i + 1], "utf8")), P = SL.params();
      const EN = { Sun: "Sūrya", Mercury: "Budha", Venus: "Śukra", Mars: "Maṅgala", Jupiter: "Guru", Saturn: "Śani" };
      /* the orbit shape and the perturbation amplitudes only: the mean-place
         polynomials are refitted (they no longer carry ΔT), and the node and
         inclination start from J2000 because the seed never fitted latitude */
      for (const e in EN) if (Q[e]) for (const k in Q[e])
        if (k in P[EN[e]] && !/^(l\d|n0|n1|i0)$/.test(k)) P[EN[e]][k] = Q[e][k];
      for (const b of SL.BODIES) for (const k of Object.keys(P[b])) if (/^(l\d|c\d)$/.test(k)) P[b][k] = 0;
      console.log("seeded from " + process.argv[i + 1]); } }
  /* --from-fit FILE: re-centre another fit's polynomials on this set's centre */
  { const f = arg("--from-fit", null), order = +arg("--order", 99);
    if (f) { const Q = JSON.parse(readFileSync(f, "utf8"));
      recentre(SL, Q, (Q.tc || 0), CFG.tc, order);
      console.log(`seeded from ${f} (centre ${Q.tc || 0} → ${CFG.tc}, orders ≤ ${order})`); } }
  const MEASURE = process.argv.includes("--measure");
  const T0 = Date.now();
  /* the reference: the stored DE422 + integration one, unless asked for the
     site's modern engine (the reference Kālasetu was first fitted to) */
  const MODERN = process.argv.includes("--modern-reference") || !existsSync(REF_FILE);
  const REF = MODERN ? makeReference(A, CFG.n, CFG.seed, CFG.y0, CFG.y1) : loadStoredReference(SET);
  console.log("reference: " + (MODERN ? "the modern engine (astronomy-engine)" : "JPL DE422 + integration (kalasetu-reference.json)"));
  const FIT = REF.filter(s => hash(s.key) < 0.5), HOLD = REF.filter(s => hash(s.key) >= 0.5);
  console.log(`reference: ${REF.length} instants (${FIT.length} fit, ${HOLD.length} held back) in ${((Date.now() - T0) / 1000).toFixed(1)} s`);

  /* the perturbation arguments are fixed functions of time (see ctx() in the
     engine), so the planets no longer depend on one another and each is
     fitted once */
  const ORDER = ["Sūrya", "Rāhu", "Candra", "Rāhu-true", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
  /* THE MOON. Beyond DE422 there is no independent Moon: astronomy-engine's,
     even corrected onto DE422's tides, scatters 15′ from DE422 at 3000 BCE and
     the scatter grows as the square of the time. So the Moon and the true node
     are fitted on DE422's instants only, with their secular terms held to the
     cubic a lunar theory carries (Chapront's mean elements are cubic and
     quartic, the quartic negligible), and every set beyond DE422 takes that
     same Moon re-centred, not a fit of its own (--moon-from). */
  const MOON_ORDER = 3, inDE = s => s.src === "de422";
  /* --iters N: N times the usual Levenberg–Marquardt iterations, for a set
     started far from its answer */
  const IT = Math.max(1, +arg("--iters", 1));
  /* --sun-frame: the frame's tilt (the fa/fb rotation, see the engine) moves
     the Sun's longitude only at second order, so a fit started from zero has
     no gradient to follow; the planets, whose latitudes fix it at first order,
     share the same frame, so the Sun starts from their median */
  if (process.argv.includes("--sun-frame")) {
    const P = SL.params(), pl = ["Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
    for (const k of ["fa0", "fa1", "fa2", "fb0", "fb1", "fb2"]) {
      const v = pl.map(b => P[b][k] || 0).sort((x, y) => x - y); P["Sūrya"][k] = v[2];
    }
    console.log("the Sun's frame tilt from the planets' median: " + ["fa0", "fa1", "fa2", "fb0", "fb1", "fb2"].map(k => k + " " + P["Sūrya"][k].toFixed(4)).join(", "));
  }
  const MOON_FROM = arg("--moon-from", SET === "core" || MODERN ? null : ROOT + "/source/data/kalasetu.json");
  if (MOON_FROM) {
    const Q = JSON.parse(readFileSync(MOON_FROM, "utf8")), keep = JSON.parse(JSON.stringify(SL.params()));
    recentre(SL, Q, Q.tc || 0, CFG.tc, 99);
    const P = SL.params();
    for (const b of SL.BODIES) if (b !== "Candra" && b !== "Rāhu") P[b] = Object.assign(P[b], keep[b]);
    /* of Rāhu, only the true node's terms come with the Moon; the mean node is this set's own */
    for (const k of Object.keys(P["Rāhu"])) if (!/^t/.test(k)) P["Rāhu"][k] = keep["Rāhu"][k];
    console.log(`the Moon and the true node from ${MOON_FROM}, re-centred ${Q.tc || 0} → ${CFG.tc}`);
  }
  const LAT = b => b !== "Sūrya" && b !== "Rāhu";
  for (const b of ORDER) {
    if (MEASURE || (only && !only.includes(b))) continue;
    if (MOON_FROM && (b === "Candra" || b === "Rāhu-true")) continue;
    const t = Date.now();
    const lunar = !MODERN && (b === "Candra" || b === "Rāhu-true");
    const FITB = lunar ? FIT.filter(inDE) : FIT;
    if (lunar) {
      const P = SL.params()[b === "Candra" ? "Candra" : "Rāhu"];
      for (const k of Object.keys(P)) if (b === "Candra" ? /^[lc][4-9]$/.test(k) : /^t_[3-9]$/.test(k)) P[k] = 0;
    }
    const allowed = k => !lunar || !(b === "Candra" ? /^[lc][4-9]$/.test(k) : /^t_[3-9]$/.test(k));
    if (b === "Rāhu-true") {
      lm(SL, b, SL.keysOf("Rāhu").filter(k => /^t/.test(k)).filter(allowed), FITB, false, 40 * IT);
      const h = residuals(SL, b, HOLD, false);
      console.log(`true node held back: rms ${rms(h).toFixed(2)}′, worst ${worst(h).toFixed(2)}′`);
      continue;
    }
    const keys = SL.keysOf(b).filter(k => !(b === "Rāhu" && /^t/.test(k))).filter(allowed);
    lm(SL, b, keys.filter(k => /^l[01]$/.test(k)), FITB, false, 30 * IT);
    lm(SL, b, keys.filter(k => !/^(ps|pc|L[1-9]|L\d\d|B[1-9]|B\d\d)/.test(k)), FITB, LAT(b), 40 * IT);
    lm(SL, b, keys, FITB, LAT(b), 80 * IT);
    const h = residuals(SL, b, HOLD, false);
    console.log(`${b.padEnd(8)} held back: rms ${rms(h).toFixed(2)}′, worst ${worst(h).toFixed(2)}′  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }

  /* ---- what gets written: the parameters and the held-back measurement --- */
  const yr = ms => new Date(ms).getUTCFullYear();
  /* bands of 600 years from the set's first year; the last may run to 800 */
  const BANDS = []; for (let y = CFG.y0 - 1; y + 600 <= CFG.y1 + 200; y += 600) BANDS.push(y);
  /* astronomical year y0 (e.g. −4999 = 5000 BCE) opens band 0 */
  const bandOf = ms => {
    return Math.min(BANDS.length - 1, Math.max(0, Math.floor((yr(ms) - CFG.y0) / 600))); };
  const resid = {};
  for (const b of SL.BODIES) {
    const lon = HOLD.map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
    const fitLon = FIT.map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
    const bands = BANDS.map(() => []);
    HOLD.forEach((s, i) => bands[bandOf(s.ms)].push(lon[i]));
    const o = { fit: { rms: +rms(fitLon).toFixed(3) },
                holdout: { rms: +rms(lon).toFixed(3), bias: +mean(lon).toFixed(3), worst: +worst(lon).toFixed(3), n: lon.length },
                bands: bands.map((a, i) => ({ from: BANDS[i], rms: +rms(a).toFixed(3), bias: +mean(a).toFixed(3),
                                              worst: +worst(a).toFixed(3), n: a.length })) };
    /* within DE422 alone (about 3000 BCE – 3000 CE), where every body has an
       independent reference: the one figure to quote for the Moon */
    { const dl = HOLD.map((s, i) => s.src === "de422" ? lon[i] : null).filter(x => x != null);
      if (!MODERN && dl.length) o.de = { rms: +rms(dl).toFixed(3), bias: +mean(dl).toFixed(3), worst: +worst(dl).toFixed(3), n: dl.length }; }
    if (LAT(b)) { const la = HOLD.map(s => (SL.latitude(b, s.ms) - s.lat[b]) * 60);
      o.latitude = { rms: +rms(la).toFixed(3), worst: +worst(la).toFixed(3) }; }
    resid[b] = o;
    console.log(`${b.padEnd(8)} lon ${o.holdout.rms.toFixed(2)}′ / ${o.holdout.worst.toFixed(2)}′` +
      (o.latitude ? `   lat ${o.latitude.rms.toFixed(2)}′ / ${o.latitude.worst.toFixed(2)}′` : "") +
      "   by 600-year band: " + o.bands.map(x => x.rms.toFixed(1)).join(" "));
  }
  { const h = residuals(SL, "Rāhu-true", HOLD, false), f = residuals(SL, "Rāhu-true", FIT, false);
    const tb = BANDS.map(() => []); HOLD.forEach((s, i) => tb[bandOf(s.ms)].push(h[i]));
    resid["Rāhu (true)"] = { fit: { rms: +rms(f).toFixed(3) }, holdout: { rms: +rms(h).toFixed(3), bias: +mean(h).toFixed(3), worst: +worst(h).toFixed(3), n: h.length },
      bands: tb.map((a, i) => ({ from: BANDS[i], rms: +rms(a).toFixed(3), bias: +mean(a).toFixed(3), worst: +worst(a).toFixed(3), n: a.length })),
      against: "engine.js trueNodeAt(), the modern branch: the osculating node" };
    { const dl = HOLD.map((s, i) => s.src === "de422" ? h[i] : null).filter(x => x != null);
      if (!MODERN && dl.length) resid["Rāhu (true)"].de = { rms: +rms(dl).toFixed(3), bias: +mean(dl).toFixed(3), worst: +worst(dl).toFixed(3), n: dl.length };
      resid["Rāhu (true)"].against = MODERN ? resid["Rāhu (true)"].against : "the osculating node of DE422's Moon (beyond DE422: of astronomy-engine's, corrected)"; }
    console.log(`true node lon ${rms(h).toFixed(2)}′ / ${worst(h).toFixed(2)}′`); }
  const P = SL.params(), params = {};
  /* keys the file never had stay out of it while they are zero, so a
     re-measure leaves the file's parameters exactly as they were */
  const had = existsSync(DATA) ? (JSON.parse(readFileSync(DATA, "utf8")).params || {}) : {};
  for (const b of SL.BODIES) { params[b] = {}; for (const k of SL.keysOf(b)) {
    if (P[b][k] === 0 && had[b] && !(k in had[b]) && SET === "core") continue;
    params[b][k] = +P[b][k].toPrecision(12); } }
  const doc = {
    _provenance: {
      what: "The Kālasetu Siddhānta long-span engine's fitted numbers: corrections on the Later Sūrya Siddhānta's own mean-motion count, the orbit of each body, and the measured amplitudes of the further terms.",
      target: MODERN ? "This site's modern engine (astronomy-engine v2 with deltat.js), apparent geocentric ecliptic of date, in the Samanvaya–Ecliptic frame (engine.js AYAN_MODES.samanvaya_ecliptic). The mean node against the published polynomial engine.js meanNodeModern() uses."
        : "source/data/kalasetu-reference.json: JPL DE422 over about 3000 BCE – 3000 CE; beyond it, the Sun and planets from a numerical integration started from DE422's own states (source/tools/nbody.mjs), and the Moon and true node from astronomy-engine brought onto DE422's tidal acceleration. Apparent geocentric, true ecliptic of date, Samanvaya–Ecliptic frame; the mean node against the published polynomial.",
      span: `${CFG.label} (astronomical years ${CFG.y0} to ${CFG.y1}), ${CFG.n.toLocaleString("en")} instants, hashed half held back. Every residual below is the held-back half's unless labelled fit. Bias is the mean signed residual (engine − reference).`,
      notTheText: "Not the Sūrya Siddhānta's answer. The time-count is the text's; the geometry is not — see the header of kalasetu-engine.js for exactly what was added and from where.",
      limits: MODERN ? "Agreement with the modern engine, not with the sky. The modern engine is checked against an independent reference only over 1000–3000 CE; before about 5000 BCE its own series are extrapolated. ΔT is uncertain by hours at 5000 BCE and by most of a day at 13000 BCE."
        : "Agreement with the reference above. Before 3000 BCE the planets rest on the integration (checked against DE422 across DE422's own 6000 years) and the Moon on a corrected extrapolation whose uncertainty grows as the square of the time; ΔT is uncertain by hours at 5000 BCE and by most of a day at 13000 BCE.",
      units: "residuals in arcminutes of longitude (latitude where given)"
    },
    generated: new Date().toISOString().slice(0, 10),
    frame: "samanvaya_ecliptic",
    set: SET, tc: CFG.tc,
    moon: MODERN ? null : (MOON_FROM
      ? { fitted: false, from: MOON_FROM.replace(ROOT + "/", ""), note: "the Moon and the true node are the core set's, re-centred: fitted on DE422 (about 3000 BCE – 3000 CE) and carried here by their own secular terms. Their residuals below are against astronomy-engine's Moon brought onto DE422's tides, which is not an independent reference; read them as the spread between two extrapolations." }
      : { fitted: true, on: "DE422 instants only", secular_order: MOON_ORDER, note: "fitted on DE422's instants; outside about 3000 BCE – 3000 CE the Moon is this fit's own extrapolation, and its residuals there are against astronomy-engine's corrected Moon, not an independent reference" }),
    span: { from: `${CFG.y0}-01-01`, to: `${CFG.y1}-12-31`, label: CFG.label },
    samples: { total: REF.length, fit: FIT.length, holdout: HOLD.length, seed: CFG.seed },
    terms: SL.terms(),
    /* what the reference itself is worth, from the reference file: the
       integration against DE422, the Moon's correction, and the modern engine
       against the reference — kept with the core set, which every page loads */
    reference: MODERN ? null : (() => { const J = JSON.parse(readFileSync(REF_FILE, "utf8"));
      return SET === "core" ? { generated: J.generated, integrator_check: J.integrator_check, moon_correction: J.moon_correction,
                                modern_vs_reference: J.modern_vs_reference } : { generated: J.generated, see: "kalasetu.json reference" }; })(),
    residuals: resid,
    params
  };
  if (WRITE) { writeFileSync(DATA, JSON.stringify(doc, null, 1) + "\n"); console.log("wrote " + DATA); }
  else console.log("(not written — pass --write)");
}
