/* Fit the Kālasetu Siddhānta long-span engine (source/src/js/kalasetu-engine.js).
 *
 * THE TARGET. This site's modern engine — astronomy-engine with the site's own
 * ΔT (deltat.js), apparent geocentric longitude in the ecliptic of date —
 * carried into the Samanvaya–Ecliptic frame with engine.js's own polynomial.
 * 3,600 instants spread over 1 Jan 5000 BCE – 31 Dec 3600 CE, each jittered
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
 * Run from the repo root:
 *   node source/test/fit-kalasetu.mjs            fit and report, write nothing
 *   node source/test/fit-kalasetu.mjs --write    replace source/data/kalasetu.json
 *   node source/test/fit-kalasetu.mjs --bodies Sūrya,Candra   only those (others kept from the file)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const DATA = ROOT + "/source/data/kalasetu.json";
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
export function makeReference(A, n, seed) {
  const t0 = Date.UTC(-4999, 0, 1), t1 = Date.UTC(3600, 11, 31, 23, 59, 59);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 1) / 2147483648; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const ms = t0 + (t1 - t0) * (i + rnd()) / n, jd = ms / 86400000 + 2440587.5, d = new Date(ms);
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

/* ---- run ----------------------------------------------------------------- */
if (import.meta.url === "file://" + process.argv[1]) {
  const A = loadAstro(), SL = loadSL(A);
  if (existsSync(DATA)) SL.setData(JSON.parse(readFileSync(DATA, "utf8")));
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
  const T0 = Date.now();
  const REF = makeReference(A, 3600, 20261114);
  const FIT = REF.filter(s => hash(s.key) < 0.5), HOLD = REF.filter(s => hash(s.key) >= 0.5);
  console.log(`reference: ${REF.length} instants (${FIT.length} fit, ${HOLD.length} held back) in ${((Date.now() - T0) / 1000).toFixed(1)} s`);

  /* the perturbation arguments are fixed functions of time (see ctx() in the
     engine), so the planets no longer depend on one another and each is
     fitted once */
  const ORDER = ["Sūrya", "Rāhu", "Candra", "Rāhu-true", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
  const LAT = b => b !== "Sūrya" && b !== "Rāhu";
  for (const b of ORDER) {
    if (only && !only.includes(b)) continue;
    const t = Date.now();
    if (b === "Rāhu-true") {
      lm(SL, b, SL.keysOf("Rāhu").filter(k => /^t/.test(k)), FIT, false, 40);
      const h = residuals(SL, b, HOLD, false);
      console.log(`true node held back: rms ${rms(h).toFixed(2)}′, worst ${worst(h).toFixed(2)}′`);
      continue;
    }
    const keys = SL.keysOf(b).filter(k => !(b === "Rāhu" && /^t/.test(k)));
    lm(SL, b, keys.filter(k => /^l[01]$/.test(k)), FIT, false, 30);
    lm(SL, b, keys.filter(k => !/^(ps|pc|L[1-9]|L\d\d|B[1-9]|B\d\d)/.test(k)), FIT, LAT(b), 40);
    lm(SL, b, keys, FIT, LAT(b), 80);
    const h = residuals(SL, b, HOLD, false);
    console.log(`${b.padEnd(8)} held back: rms ${rms(h).toFixed(2)}′, worst ${worst(h).toFixed(2)}′  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  }

  /* ---- what gets written: the parameters and the held-back measurement --- */
  const yr = ms => new Date(ms).getUTCFullYear();
  /* fourteen bands of 600 years from 5000 BCE; the last also takes 3401–3600 */
  const BANDS = []; for (let y = -5000; y < 3400; y += 600) BANDS.push(y);
  /* astronomical year −4999 (= 5000 BCE) opens band 0 */
  const bandOf = ms => {
    return Math.min(BANDS.length - 1, Math.max(0, Math.floor((yr(ms) + 4999) / 600))); };
  const resid = {};
  for (const b of SL.BODIES) {
    const lon = HOLD.map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
    const fitLon = FIT.map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
    const bands = BANDS.map(() => []);
    HOLD.forEach((s, i) => bands[bandOf(s.ms)].push(lon[i]));
    const o = { fit: { rms: +rms(fitLon).toFixed(3) },
                holdout: { rms: +rms(lon).toFixed(3), worst: +worst(lon).toFixed(3), n: lon.length },
                bands: bands.map((a, i) => ({ from: BANDS[i], rms: +rms(a).toFixed(3), worst: +worst(a).toFixed(3), n: a.length })) };
    if (LAT(b)) { const la = HOLD.map(s => (SL.latitude(b, s.ms) - s.lat[b]) * 60);
      o.latitude = { rms: +rms(la).toFixed(3), worst: +worst(la).toFixed(3) }; }
    resid[b] = o;
    console.log(`${b.padEnd(8)} lon ${o.holdout.rms.toFixed(2)}′ / ${o.holdout.worst.toFixed(2)}′` +
      (o.latitude ? `   lat ${o.latitude.rms.toFixed(2)}′ / ${o.latitude.worst.toFixed(2)}′` : "") +
      "   by 600-year band: " + o.bands.map(x => x.rms.toFixed(1)).join(" "));
  }
  { const h = residuals(SL, "Rāhu-true", HOLD, false), f = residuals(SL, "Rāhu-true", FIT, false);
    const tb = BANDS.map(() => []); HOLD.forEach((s, i) => tb[bandOf(s.ms)].push(h[i]));
    resid["Rāhu (true)"] = { fit: { rms: +rms(f).toFixed(3) }, holdout: { rms: +rms(h).toFixed(3), worst: +worst(h).toFixed(3), n: h.length },
      bands: tb.map((a, i) => ({ from: BANDS[i], rms: +rms(a).toFixed(3), worst: +worst(a).toFixed(3), n: a.length })),
      against: "engine.js trueNodeAt(), the modern branch: the osculating node" };
    console.log(`true node lon ${rms(h).toFixed(2)}′ / ${worst(h).toFixed(2)}′`); }
  const P = SL.params(), params = {};
  for (const b of SL.BODIES) { params[b] = {}; for (const k of SL.keysOf(b)) params[b][k] = +P[b][k].toPrecision(12); }
  const doc = {
    _provenance: {
      what: "The Kālasetu Siddhānta long-span engine's fitted numbers: corrections on the Later Sūrya Siddhānta's own mean-motion count, the orbit of each body, and the measured amplitudes of the further terms.",
      target: "This site's modern engine (astronomy-engine v2 with deltat.js), apparent geocentric ecliptic of date, in the Samanvaya–Ecliptic frame (engine.js AYAN_MODES.samanvaya_ecliptic). The mean node against the published polynomial engine.js meanNodeModern() uses.",
      span: "1 January 5000 BCE – 31 December 3600 CE (astronomical years −4999 to 3600), 3,600 instants, hashed half held back. Every residual below is the held-back half's unless labelled fit.",
      notTheText: "Not the Sūrya Siddhānta's answer. The time-count is the text's; the geometry is not — see the header of kalasetu-engine.js for exactly what was added and from where.",
      limits: "Agreement with the modern engine, not with the sky. The modern engine is checked against an independent reference only over 1000–3000 CE, and ΔT is uncertain by hours at the span's ends.",
      units: "residuals in arcminutes of longitude (latitude where given)"
    },
    generated: new Date().toISOString().slice(0, 10),
    frame: "samanvaya_ecliptic",
    span: { from: "-4999-01-01", to: "3600-12-31", label: "5000 BCE – 3600 CE" },
    samples: { total: REF.length, fit: FIT.length, holdout: HOLD.length, seed: 20261114 },
    terms: SL.terms(),
    residuals: resid,
    params
  };
  if (WRITE) { writeFileSync(DATA, JSON.stringify(doc, null, 1) + "\n"); console.log("wrote " + DATA); }
  else console.log("(not written — pass --write)");
}
