/* Kālasetu's long-span reference: JPL DE422 where it exists, and a numerical
 * integration from DE422's own states beyond it.
 *
 * WHY A NEW REFERENCE. Kālasetu was first fitted to the site's modern engine
 * (astronomy-engine). Its planets are a truncated VSOP87 series, whose
 * time-power terms are only valid within a few millennia of today. Fitting a
 * 9000 – 3000 BCE set to it made Mars worse, not better: the fit was following
 * the series' own artefacts. So the reference is now:
 *   – Sun and planets: DE422 over its span (JD 625648.5 – 2816816.5, about
 *     3000 BCE – 3000 CE); outside it, nbody.mjs started from DE422's state at
 *     the span's edge. Measured across DE422's own 6000 years, that integration
 *     stays within 1″ for Mercury, Venus and the Earth and 7″ for Mars.
 *   – Moon and true node: DE422 over its span. Outside it there is no
 *     independent Moon: the integration, even with the Earth's J2 and a tidal
 *     term, drifts 2.8° from DE422 in 6000 years (a lunar theory needs the
 *     Earth's true pole, tidal lags and the Moon's own figure). So beyond DE422
 *     it is astronomy-engine's Moon brought onto DE422's tides: across their
 *     6000-year overlap astronomy-engine's Moon falls behind DE422
 *     quadratically (89′ by 2900 BCE — its lunar theory carries a different
 *     tidal acceleration from the one the site's ΔT tables assume), so a
 *     quadratic in time, fitted on the overlap, is added to its longitude and
 *     node, and its latitude is moved consistently (β = i sin F). Measured on
 *     the overlap that leaves about 6′ of scatter; beyond it, the uncertainty
 *     of the tidal acceleration itself grows as the square of the time.
 *   – Mean node: the published polynomial, as before.
 * The frame is the site's: apparent geocentric longitude in the true ecliptic
 * of date, as astronomy-engine rotates it (its Ecliptic()), less engine.js's
 * Samanvaya–Ecliptic ayanāṃśa. Apparent means astronomy-engine's convention:
 * light-time, and aberration by backdating the Earth too; the Moon geometric.
 * Civil time is carried to TT with the site's ΔT (deltat.js via MakeTime).
 *
 * RUN from the repo root (needs DE422: pip download de422, unpack):
 *   node source/tools/kalasetu-reference.mjs /path/to/de422 [--h 0.125]
 * writes source/data/kalasetu-reference.json: every set's fitting instants,
 * a fresh verification draw for kalasetu-verify, and the measured accuracy of
 * the integration and of the modern engine against it.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { integrate, initFromDE } from "./nbody.mjs";
import { loadAstro, ayanAt, norm, sdiff, meanNodeModern, trueNodeModern, NAMES, SETCFG, makeInstants } from "../test/fit-kalasetu.mjs";

const ROOT = process.cwd();
export const LON_BODIES = ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu", "Rāhu-true"];
export const LAT_BODIES = ["Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
const DEKEY = { "Sūrya": "Sun", "Budha": "Mercury", "Śukra": "Venus", "Maṅgala": "Mars", "Guru": "Jupiter", "Śani": "Saturn" };

function deStates(dir, jds) {
  const tmp = mkdtempSync(tmpdir() + "/de422-");
  writeFileSync(tmp + "/q.json", JSON.stringify({ jd: jds }));
  execFileSync("python3", ["-I", ROOT + "/source/tools/de422.py", dir, tmp + "/q.json", tmp + "/a.json"], { maxBuffer: 1 << 30 });
  return JSON.parse(readFileSync(tmp + "/a.json", "utf8"));
}
/* apparent geocentric EQJ vector of a body from barycentric states, the way
   astronomy-engine's GeoVector(body, t, true) does it */
function apparent(st, key, c) {
  const P = st.r[key], VP = st.v[key], E = st.r.Earth, VE = st.v.Earth;
  let tau = 0, g;
  for (let it = 0; it < 4; it++) {
    g = [0, 1, 2].map(k => (P[k] - tau * VP[k]) - (E[k] - tau * VE[k]));
    tau = Math.hypot(...g) / c;
  }
  return g;
}
function eclOf(A, vec, ms) {
  const t = A.MakeTime(new Date(ms)), e = A.Ecliptic(new A.Vector(vec[0], vec[1], vec[2], t));
  return { lon: e.elon, lat: e.elat, vec: e.vec };
}
/* the osculating node of a geocentric Moon state, in the ecliptic of date —
   engine.js trueNodeAt() does the same with a finite difference */
function nodeOf(A, r, v, ms) {
  const t = A.MakeTime(new Date(ms));
  const R = A.Rotation_EQJ_ECT(t), rr = A.RotateVector(R, new A.Vector(r[0], r[1], r[2], t)), vv = A.RotateVector(R, new A.Vector(v[0], v[1], v[2], t));
  const h = { x: rr.y * vv.z - rr.z * vv.y, y: rr.z * vv.x - rr.x * vv.z };
  return norm(Math.atan2(h.x, -h.y) * 180 / Math.PI);
}

/* astronomy-engine's Moon onto DE422's tides: Δλ, ΔΩ = c0 + c1 T + c2 T²
   (arcseconds, T Julian centuries from J2000), fitted on the overlap */
export function moonCorrection(A, dir, n = 1500) {
  const ms = makeInstants(n, 11, -2990, 2990).filter(m => { const y = new Date(m).getUTCFullYear(); return y < 0 || y > 99; });
  const R = buildReference(A, dir, ms, 0.125, () => {}, null);
  const X = [], yl = [], yn = [];
  R.forEach(r => { const m = modernAt(A, r.ms), T = (r.jd - 2451545) / 36525; X.push([1, T, T * T]);
    yl.push(sdiff(r.ref.Candra, m.ref.Candra) * 3600); yn.push(sdiff(r.ref["Rāhu-true"], m.ref["Rāhu-true"]) * 3600); });
  const fit = y => { const M = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    X.forEach((x, i) => { for (let a = 0; a < 3; a++) { for (let c = 0; c < 3; c++) M[a][c] += x[a] * x[c]; M[a][3] += x[a] * y[i]; } });
    for (let i = 0; i < 3; i++) for (let r = 0; r < 3; r++) { if (r === i) continue; const f = M[r][i] / M[i][i]; for (let c = i; c < 4; c++) M[r][c] -= f * M[i][c]; }
    const c = M.map((r, i) => r[3] / r[i]), res = y.map((v, i) => v - (c[0] + c[1] * X[i][1] + c[2] * X[i][2]));
    return { c: c.map(v => +v.toFixed(5)), rms: +Math.sqrt(res.reduce((p, v) => p + v * v, 0) / res.length).toFixed(1) }; };
  return { lon: fit(yl), node: fit(yn), n: R.length, note: "arcseconds; T in Julian centuries from J2000; residual rms is the scatter left on the overlap" };
}
const corrAt = (C, T) => C.c[0] + C.c[1] * T + C.c[2] * T * T;

export function buildReference(A, dir, msList, h = 0.125, log = () => {}, MC = null) {
  const tt = ms => A.MakeTime(new Date(ms)).tt + 2451545;
  const jds = msList.map(tt);
  const first = deStates(dir, [jds[0]]).constants, K = first;
  const lo = K.jalpha + 1, hi = K.jomega - 1;
  const inDE = jds.map(j => j >= lo && j <= hi);
  const D = deStates(dir, jds.filter((j, i) => inDE[i]));
  const deMap = new Map(); D.states.forEach(s => deMap.set(s.jd, s));
  const outJ = jds.filter((j, i) => !inDE[i]);
  const nb = new Map();
  if (outJ.length) {
    const e0 = deStates(dir, [lo, hi]).states;
    const back = outJ.filter(j => j < lo), fwd = outJ.filter(j => j > hi);
    const t0 = Date.now();
    if (back.length) integrate(initFromDE(e0[0], K), back, h, f => log(`  integrating back: ${(100 * f).toFixed(0)}%`))
      .forEach(s => nb.set(s.jd, s));
    if (fwd.length) integrate(initFromDE(e0[1], K), fwd, h).forEach(s => nb.set(s.jd, s));
    log(`  integration: ${outJ.length} instants in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const c = K.CLIGHT * 86400 / K.AU;
  return msList.map((ms, i) => {
    const jd = ms / 86400000 + 2440587.5, ay = ayanAt(jd), d = new Date(ms);
    const st = inDE[i] ? deMap.get(jds[i]) : nb.get(jds[i]);
    const ref = {}, lat = {};
    for (const sa in DEKEY) { const e = eclOf(A, apparent(st, DEKEY[sa], c), ms); ref[sa] = norm(e.lon - ay); lat[sa] = e.lat; }
    if (inDE[i]) {
      const e = eclOf(A, st.r.Moon, ms); ref["Candra"] = norm(e.lon - ay); lat["Candra"] = e.lat;
      ref["Rāhu-true"] = norm(nodeOf(A, st.r.Moon, st.v.Moon, ms) - ay);
    } else {
      const e = A.Ecliptic(A.GeoVector(A.Body.Moon, d, true)), node = trueNodeModern(A, d);
      if (!MC) throw new Error("a Moon outside DE422 needs the tidal correction (moonCorrection)");
      const T = (jds[i] - 2451545) / 36525, dl = corrAt(MC.lon, T) / 3600, dn = corrAt(MC.node, T) / 3600;
      const F = (e.elon - node) * Math.PI / 180, inc = 5.145 * Math.PI / 180;
      ref["Candra"] = norm(e.elon + dl - ay);
      lat["Candra"] = e.elat + inc * Math.cos(F) * (dl - dn) * 180 / Math.PI * Math.PI / 180;
      ref["Rāhu-true"] = norm(node + dn - ay);
    }
    ref["Rāhu"] = norm(meanNodeModern(jd) - ay);
    return { ms, jd, ref, lat, src: inDE[i] ? "de422" : "nbody", key: String(Math.round(ms)) };
  });
}

/* the modern engine at the same instants, as the old reference was built */
export function modernAt(A, ms) {
  const jd = ms / 86400000 + 2440587.5, ay = ayanAt(jd), d = new Date(ms), ref = {}, lat = {};
  for (const sa in NAMES) { const e = A.Ecliptic(A.GeoVector(A.Body[NAMES[sa]], d, true)); ref[sa] = norm(e.elon - ay); lat[sa] = e.elat; }
  ref["Rāhu"] = norm(meanNodeModern(jd) - ay); ref["Rāhu-true"] = norm(trueNodeModern(A, d) - ay);
  return { ref, lat };
}

const pack = r => [Math.round(r.ms), r.src === "de422" ? 0 : 1,
  ...LON_BODIES.map(b => +r.ref[b].toFixed(6)), ...LAT_BODIES.map(b => +r.lat[b].toFixed(6))];
export function unpack(row) {
  const ref = {}, lat = {};
  LON_BODIES.forEach((b, i) => { ref[b] = row[2 + i]; });
  LAT_BODIES.forEach((b, i) => { lat[b] = row[2 + LON_BODIES.length + i]; });
  return { ms: row[0], jd: row[0] / 86400000 + 2440587.5, ref, lat, src: row[1] ? "nbody" : "de422", key: String(row[0]) };
}
/* every set's instants, and the verification draw, from the stored file */
export function loadReference(file = ROOT + "/source/data/kalasetu-reference.json") {
  const J = JSON.parse(readFileSync(file, "utf8")), out = {};
  for (const k in J.sets) out[k] = J.sets[k].rows.map(unpack);
  return { doc: J, sets: out };
}

if (import.meta.url === "file://" + process.argv[1]) {
  const dir = process.argv[2], i = process.argv.indexOf("--h"), h = i > 0 ? +process.argv[i + 1] : 0.125;
  if (!dir) throw new Error("usage: node source/tools/kalasetu-reference.mjs /path/to/de422");
  const A = loadAstro(), log = s => console.log(s);
  /* the fitting instants of every set, and a fresh verification draw over the
     whole span (the seed differs, so no instant is shared) */
  const want = {};
  for (const k in SETCFG) want[k] = makeInstants(SETCFG[k].n, SETCFG[k].seed, SETCFG[k].y0, SETCFG[k].y1);
  want.verify = makeInstants(1800, 20261199, -12999, 3600);
  const all = [...new Set(Object.values(want).flat())].sort((p, q) => p - q);
  log(`reference: ${all.length} instants`);
  /* the integration checked against DE422 across DE422's own span: started
     at its first day, carried 6000 years forward, compared at 60 instants */
  const IC = (() => {
    const K = deStates(dir, [625650.5]), jd0 = 625650.5, js = [];
    for (let k = 1; k <= 60; k++) js.push(jd0 + k * (2816814.5 - jd0) / 60);
    const N = integrate(initFromDE(K.states[0], K.constants), js, h), D = deStates(dir, js).states, out = {};
    const ang = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) / Math.hypot(...q) * 206264.806;
    for (const b of ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"]) {
      const e = js.map((_, k) => ang(N[k].r[b].map((x, j) => x - N[k].r.Sun[j]), D[k].r[b].map((x, j) => x - D[k].r.Sun[j])));
      out[b] = { after_6000_years: +e[e.length - 1].toFixed(2), worst: +Math.max(...e).toFixed(2) };
    }
    return { note: "heliocentric direction, arcseconds, integration minus DE422 after starting from DE422 at 3000 BCE", step_days: h, bodies: out };
  })();
  log("integrator vs DE422 over 6000 years (″): " + Object.entries(IC.bodies).map(([b, v]) => b + " " + v.worst).join(", "));
  const MC = moonCorrection(A, dir);
  log(`Moon onto DE422's tides: Δλ = ${MC.lon.c.join(", ")} (″, 1, T, T²), scatter ${MC.lon.rms}″; node ${MC.node.c.join(", ")}, scatter ${MC.node.rms}″`);
  const R = buildReference(A, dir, all, h, log, MC), byMs = new Map(R.map(r => [r.ms, r]));
  /* the modern engine against it, in 600-year bands from 13000 BCE */
  const bands = []; for (let y = -13000; y + 600 <= 3800; y += 600) bands.push(y);
  const bandOf = ms => Math.min(bands.length - 1, Math.floor((new Date(ms).getUTCFullYear() + 12999) / 600));
  const modern = {};
  for (const b of LON_BODIES) modern[b] = bands.map(y => ({ from: y, d: [] }));
  for (const ms of want.verify) { const r = byMs.get(ms), m = modernAt(A, ms);
    for (const b of LON_BODIES) modern[b][bandOf(ms)].d.push(sdiff(m.ref[b], r.ref[b]) * 60); }
  const st = a => a.length ? { rms: +Math.sqrt(a.reduce((p, x) => p + x * x, 0) / a.length).toFixed(3),
    bias: +(a.reduce((p, x) => p + x, 0) / a.length).toFixed(3), worst: +Math.max(...a.map(Math.abs)).toFixed(3), n: a.length } : null;
  const modernStats = {}; for (const b of LON_BODIES) modernStats[b] = modern[b].map(x => ({ from: x.from, ...st(x.d) }));
  const doc = {
    _provenance: {
      what: "The reference Kālasetu is fitted and verified against (see the header of source/tools/kalasetu-reference.mjs).",
      sun_and_planets: "JPL DE422 (Folkner 2009) over JD 625648.5–2816816.5 (about 3000 BCE – 3000 CE); outside it, a numerical integration (source/tools/nbody.mjs: Sun, Moon and nine planets as point masses with DE422's masses and the Sun's post-Newtonian term, Yoshida sixth order, step " + h + " day) started from DE422's own states at its span's edges.",
      moon_and_true_node: "DE422 over its span; outside it astronomy-engine, the site's modern engine — not independent before 3000 BCE.",
      mean_node: "the published polynomial engine.js meanNodeModern() uses",
      frame: "apparent geocentric, true ecliptic of date (astronomy-engine's rotation), less engine.js's Samanvaya–Ecliptic ayanāṃśa; civil time to TT with deltat.js",
      columns: ["ms (civil, UTC)", "source (0 DE422, 1 integration)", ...LON_BODIES.map(b => b + " longitude°"), ...LAT_BODIES.map(b => b + " latitude°")]
    },
    generated: new Date().toISOString().slice(0, 10),
    integrator_check: IC,
    moon_correction: MC,
    modern_vs_reference: { note: "the modern engine (astronomy-engine) minus this reference, arcminutes, on the verification draw", bands: modernStats },
    sets: {}
  };
  for (const k in want) doc.sets[k] = { n: want[k].length, ...(SETCFG[k] || { y0: -12999, y1: 3600, seed: 20261199 }),
                                        rows: want[k].map(ms => pack(byMs.get(ms))) };
  writeFileSync(ROOT + "/source/data/kalasetu-reference.json", JSON.stringify(doc) + "\n");
  log("wrote source/data/kalasetu-reference.json");
  for (const b of ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu-true"])
    log(`modern − reference ${b.padEnd(9)} rms by band: ` + modernStats[b].map(x => x.rms != null ? x.rms.toFixed(1) : "–").join(" "));
}
