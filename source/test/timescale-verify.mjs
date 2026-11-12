/* ΔT, sidereal time and obliquity, as published, held to independent formulas.
 *
 * The analyst JSON now carries jd_tt, delta_t_sec, lst_deg and both obliquities
 * (engine.js time_scales). Each is checked against something that is NOT the
 * engine: ΔT against the observed values for those years, the sidereal time
 * against the IAU 1982 GMST series, the mean obliquity against Meeus, and the
 * true−mean difference against the nutation the same block reports.
 *
 * Run from the repository root:  node source/test/timescale-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
/* observed ΔT (USNO/IERS), seconds, to the nearest tenth, for the year shown */
const CASES = [
  { b: { year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389, lon: 78.7768, tzHours: 5.5 }, dt: 54.0, tol: 1.5 },
  { b: { year: 2024, month: 5, day: 1, hour: 12, minute: 48, lat: 28.8389, lon: 78.7768, tzHours: 5.5 }, dt: 69.2, tol: 1.5 },
  { b: { year: 1950, month: 6, day: 1, hour: 6, minute: 0, lat: 19.076, lon: 72.8777, tzHours: 5.5 }, dt: 29.1, tol: 1.5 },
];
const br = await chromium.launch(); const pg = await br.newPage();
const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart && window.buildJyotishaPayload && window.__deriveForExport, null, { timeout: 60000 });

for (const C of CASES) {
  const r = await pg.evaluate((b) => {
    const J = window.buildLocalChart(Object.assign({ ayanamsa: "lahiri", node: "mean", name: "t" }, b));
    window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J);
    return { ts: J.time_scales, meta: P.meta };
  }, C.b);
  const ts = r.ts, m = r.meta, label = `${C.b.year}-${String(C.b.month).padStart(2, "0")}`;
  console.log(`\n${label}`);
  is(!!ts, "the chart publishes time_scales");
  if (!ts) continue;
  is(Math.abs(ts.delta_t_sec - C.dt) < C.tol, `ΔT ${ts.delta_t_sec.toFixed(2)} s against the observed ${C.dt} s`);
  is(Math.abs((ts.jd_tt - ts.jd_ut) * 86400 - ts.delta_t_sec) < 1e-3, "jd_tt − jd_ut is exactly ΔT");
  /* IAU 1982 GMST (Meeus 12.4), degrees */
  const T = (ts.jd_ut - 2451545) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (ts.jd_ut - 2451545) + 0.000387933 * T * T - T * T * T / 38710000;
  const lmst = ((gmst + C.b.lon) % 360 + 360) % 360;
  let d = Math.abs(lmst - ts.lst_deg); d = Math.min(d, 360 - d);
  is(d < 0.01, `local sidereal time ${ts.lst_deg.toFixed(4)}° within 0.01° of IAU 1982 GMST + longitude (Δ ${(d * 240).toFixed(2)} s of time; the equation of the equinoxes is at most ~1.2 s)`);
  const meeus = 23.4392911111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
  is(Math.abs(ts.obliquity_mean_deg - meeus) < 1e-4, `mean obliquity ${ts.obliquity_mean_deg.toFixed(6)}° = Meeus 22.2 (${meeus.toFixed(6)}°)`);
  is(Math.abs((ts.obliquity_true_deg - ts.obliquity_mean_deg) * 3600 - ts.nutation_obliquity_arcsec) < 0.5,
     `true − mean obliquity = the reported nutation in obliquity (${ts.nutation_obliquity_arcsec.toFixed(2)}″)`);
  is(m.jd_tt === ts.jd_tt && m.delta_t_sec === ts.delta_t_sec && m.lst_deg === ts.lst_deg &&
     m.eps_true_deg === ts.obliquity_true_deg && m.eps_mean_deg === ts.obliquity_mean_deg && m.jd_ut === ts.jd_ut,
     "the analyst JSON's meta carries the same values");
}
console.log("\nno page errors"); is(errs.length === 0, errs.join(" | ") || "none");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
