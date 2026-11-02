/* The engine against an independent sky.
 *
 * Every other harness in this directory checks the site against itself: that
 * the two copies of the varga formulas agree, that the prastāra sums to the
 * bhinna totals, that the Chara lengths match cases counted by hand. All of it
 * is worth having and none of it would notice if the POSITIONS went wrong.
 * The longitudes come from astronomy-engine, the ayanāṃśa from polynomials
 * fitted to Swiss Ephemeris, the lagna from a closed form — and until this
 * file existed nothing compared any of them to a sky computed some other way.
 * A vendored-library bump, a mistyped coefficient or a frame slip would have
 * passed all 352 self-test checks and shipped.
 *
 * The reference is source/test/fixtures/reference-ecliptic.json, written by
 * make-reference-fixture.py from ERFA — the IAU's own SOFA algorithms — whose
 * provenance block states what it is accurate to and where it is not
 * independent. Read that block before changing a bar here.
 *
 * TWO THINGS THIS HARNESS LEARNED THE HARD WAY, both recorded because both
 * looked like engine faults:
 *
 * 1. COMPARE ON TT, NOT ON UTC. A position is a function of Terrestrial Time.
 *    astronomy-engine takes its Date argument as UT and applies its own ΔT;
 *    the fixture's TT is TAI-derived and predicts nothing. Comparing at a
 *    common UTC therefore compares two ΔT models as well as two skies. The
 *    first run of this harness showed the Moon drifting from 0.3″ at 1950 to
 *    219″ at 2200 — a clean monotonic ramp that is the signature of a
 *    timescale disagreement, not an ephemeris error, and which only became
 *    obvious when the residual was bucketed by half-century. ttUt() below
 *    solves for the UT that puts the engine at the fixture's TT, so the
 *    comparison is of astronomy alone. The ΔT disagreement is then measured
 *    and PRINTED, because it is a real uncertainty in civil-time results after
 *    2027 and belongs in the open, but it is not a failure.
 *
 * 2. THE BARS ARE NOT ALL EQUAL, AND THE LOOSE ONES ARE NOT CLAIMS. ERFA's
 *    plan94 has a documented longitude error of 71″ for Jupiter and 81″ for
 *    Saturn, against 0.1″ for the Sun. A bar for Saturn tight enough to be
 *    impressive would fail on the reference, not the engine. So each bar is
 *    derived from the reference's own stated accuracy plus headroom, and the
 *    Sun and Moon — which fix the ayanāṃśa frame, the nakṣatra, the tithi and
 *    every daśā boundary — are where the reference is strongest and the bars
 *    are tightest. That is the right way round for a Jyotiṣa engine.
 *
 * Run: node source/test/reference-verify.mjs  [--verbose]
 *      node source/test/reference-verify.mjs --prove   (plants faults, expects failure)
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const VERBOSE = process.argv.includes("--verbose");
const PROVE = process.argv.includes("--prove");

let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* ---- load the engine the way the browser does, minus the browser ---------- */

function loadEngine(mutate) {
  const Astronomy = require(ROOT + "/source/vendor/astronomy.browser.min.js");
  const g = {
    Astronomy, console, Date, Math, JSON, parseFloat, parseInt, isNaN, isFinite,
    String, Number, Array, Object, RegExp, Error, Boolean, Symbol, Map, Set,
    setTimeout, clearTimeout, encodeURIComponent, decodeURIComponent,
  };
  g.window = g; g.globalThis = g; g.self = g;
  g.document = {
    createElement: () => ({ style: {}, appendChild() {}, setAttribute() {},
                            classList: { add() {}, remove() {} } }),
    getElementById: () => null, querySelector: () => null,
    querySelectorAll: () => [], addEventListener() {},
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {} }, style: {} },
  };
  g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  g.navigator = { userAgent: "node", language: "en" };

  let src = readFileSync(ROOT + "/source/src/js/engine.js", "utf8");
  if (mutate) src = mutate(src);
  vm.runInContext(src, vm.createContext(g), { filename: "engine.js" });
  return { g, Astronomy };
}

/* ---- the TT match --------------------------------------------------------
   MakeTime takes UT days since J2000 and derives tt by adding its own ΔT, so
   finding the UT for a wanted TT is one fixed-point iteration on a function
   whose derivative is within 1e-7 of unity. Three passes is overkill.        */

function ttUt(Astronomy, jdTT) {
  const wantTT = jdTT - 2451545.0;
  let ut = wantTT;
  for (let i = 0; i < 4; i++) ut -= (Astronomy.MakeTime(ut).tt - wantTT);
  return ut;
}
const utToMs = ut => (ut + 2451545.0 - 2440587.5) * 86400000;

/* ---- statistics ---------------------------------------------------------- */

const sdiff = (a, b) => { const d = ((a - b) % 360 + 360) % 360; return d > 180 ? d - 360 : d; };
function stats(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const sum = a.reduce((p, c) => p + c, 0);
  return { n: a.length, mean: sum / a.length,
           p95: a[Math.min(a.length - 1, Math.floor(a.length * 0.95))],
           max: a[a.length - 1] };
}
const f3 = x => x.toFixed(3);

/* ---- the bars ------------------------------------------------------------
   Longitude and latitude, arcseconds, each the reference's own documented
   error with headroom for the engine's share. Tightening one is only honest
   if the reference improves (a JPL kernel would let every planet bar drop by
   an order of magnitude); loosening one is only honest with a reason written
   beside it.                                                                */

const BARS = {
  Sun:     { lon: 4,   lat: 3 },
  Moon:    { lon: 30,  lat: 25 },
  Mercury: { lon: 20,  lat: 14 },
  Venus:   { lon: 22,  lat: 14 },
  Mars:    { lon: 50,  lat: 14 },
  Jupiter: { lon: 100, lat: 20 },
  Saturn:  { lon: 110, lat: 32 },
};
/* The same polynomial sits in the generator and in engine.js, so this is a
   typo check, not a theory check. It is not zero because engine.js passes a
   UT-derived Julian day into a polynomial whose argument is TT; the node moves
   0.0022″/s, so the ΔT gap below shows up as up to ~0.8″ of node. That is
   0.03% of a nakṣatra and not worth touching production code for, but it is
   why the bar is 2″ and not 0.1″. */
const NODE_BAR = 2.0;
/* Sidereal angle. astronomy-engine and ERFA gst06a disagree by up to 12.4″
   across 1800–2200 — different nutation series and a different treatment of
   UT1−UTC, neither of which is available for past or future dates anyway. */
const GAST_BAR = 20.0;
/* The engine's closed form against the same intersection computed as vectors,
   both driven by the engine's OWN sidereal time and obliquity. This isolates
   the construction from its inputs, and it is exact: the measured worst case
   is 0.000″ at all four places. A bar of 0.001″ is therefore a real assertion
   and not a courtesy. */
const LAGNA_FORM_BAR = 0.001;
/* End to end, against the ERFA-driven reference. This is the construction plus
   the Earth-orientation difference above, and it is dominated by the latter:
   with identical inputs the two constructions agree exactly, so everything
   here is the 12.4″ sidereal-time gap seen through the geometry. Near the
   poles the ecliptic meets the horizon at a shallow angle and that gap is
   amplified roughly ninefold, which is why the polar bar is separate. Setting
   one bar for both would either fail at Tromsø or be meaningless elsewhere. */
const LAGNA_BAR = 40.0;
const LAGNA_POLAR_BAR = 150.0;
const POLAR_LAT = 66.5;

/* ---- run ---------------------------------------------------------------- */

const FIXTURE = ROOT + "/source/test/fixtures/reference-ecliptic.json";
const fx = JSON.parse(readFileSync(FIXTURE, "utf8"));
const PROV = fx._provenance;
const SAMPLES = fx.samples;

console.log("The engine against an independent sky");
console.log("  reference : " + PROV.reference.split(":")[0]
            + " (astropy " + PROV.astropy + ", pyerfa " + PROV.pyerfa
            + ", ephemeris " + PROV.ephemeris + ")");
console.log("  samples   : " + SAMPLES.length + " over " + PROV.span
            + ", stratified across all 12 months and all 24 hours");

head("the fixture is what it says it is");
is(SAMPLES.length >= 200, "at least 200 samples (" + SAMPLES.length + ")");
is(new Set(SAMPLES.map(s => +s.iso.slice(5, 7))).size === 12, "all twelve months appear");
is(new Set(SAMPLES.map(s => +s.iso.slice(11, 13))).size === 24, "all twenty-four hours appear");
is(SAMPLES.every(s => Number.isFinite(s.jdTT) && Number.isFinite(s.jdUTC)),
   "every sample carries both a TT and a UTC index");
is(!!PROV.notIndependent, "the fixture states where it is NOT independent");
is(!!PROV.referenceAccuracyArcsec, "the fixture carries the reference's own accuracy table");

/* the bars must be justified by that table, not chosen to pass */
head("every bar is justified by the reference's own accuracy");
for (const b of Object.keys(BARS)) {
  const refErr = PROV.referenceAccuracyArcsec[b];
  is(BARS[b].lon >= refErr,
     b + " longitude bar " + BARS[b].lon + "″ is not tighter than the reference's own "
     + refErr + "″");
}

/* ---- the measurement ---------------------------------------------------- */

const { g, Astronomy } = loadEngine(null);
const bodies = Object.keys(BARS);
const acc = {}; bodies.forEach(b => acc[b] = { lon: [], lat: [] });
const node = [], gast = [], dT = [];
const lag = {}, lagForm = {};
Object.keys(SAMPLES[0].lagna).forEach(p => { lag[p] = []; lagForm[p] = []; });

/* The same horizon-plane intersection as the generator's, in JS, so it can be
   driven by the engine's own sidereal time and obliquity. Independent of
   engine.js's closed form: linear in (cos λ, sin λ), two roots 180° apart, the
   rising one selected by azimuth. */
function vectorAscendant(gastHours, lonDeg, latDeg, oblDeg) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const n360 = x => ((x % 360) + 360) % 360;
  const th = n360(gastHours * 15 + lonDeg) * D2R, phi = latDeg * D2R, eps = oblDeg * D2R;
  const a = Math.cos(phi) * Math.cos(th);
  const b = Math.cos(eps) * Math.cos(phi) * Math.sin(th) + Math.sin(eps) * Math.sin(phi);
  const lam = Math.atan2(-a, b);
  for (const c of [lam, lam + Math.PI]) {
    const x = Math.cos(c), y = Math.sin(c) * Math.cos(eps), z = Math.sin(c) * Math.sin(eps);
    const ra = Math.atan2(y, x), dec = Math.asin(z), H = th - ra;
    const az = n360(Math.atan2(-Math.cos(dec) * Math.sin(H),
      Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H)) * R2D);
    if (az > 0 && az < 180) return n360(c * R2D);
  }
  return n360(lam * R2D);
}
const engineObliquity = jd => { const T = (jd - 2451545.0) / 36525.0;
  return 23.439291111 - 0.0130041667 * T - 1.638e-7 * T * T; };
const byEpoch = {};

/* The UTC instant comes from the ISO string, NOT from jdUTC. jdUTC is rounded
   to nine places in the fixture, which puts some instants a few tenths of a
   millisecond below the whole minute; rebuilding the engine's input from it
   through getUTCMinutes() then truncated 110 of 400 samples to the previous
   minute and showed up as a 0.2–0.4° lagna disagreement at every latitude. It
   looked exactly like a frame error. It was a rounding error in this file. */
const isoInput = iso => ({
  year: +iso.slice(0, 4), month: +iso.slice(5, 7), day: +iso.slice(8, 10),
  hour: +iso.slice(11, 13), minute: +iso.slice(14, 16), tzHours: 0,
});

for (const s of SAMPLES) {
  const ut = ttUt(Astronomy, s.jdTT);
  const ms = utToMs(ut);
  const msUTC = Date.parse(s.iso);
  const ep = Math.floor(+s.iso.slice(0, 4) / 50) * 50;
  byEpoch[ep] = byEpoch[ep] || { moon: [], sun: [] };

  for (const b of bodies) {
    const e = g.__kEclip(b, ms);
    const dl = Math.abs(sdiff(e.trop, s.bodies[b].lon)) * 3600;
    acc[b].lon.push(dl);
    acc[b].lat.push(Math.abs(e.lat - s.bodies[b].lat) * 3600);
    if (b === "Moon") byEpoch[ep].moon.push(dl);
    if (b === "Sun") byEpoch[ep].sun.push(dl);
  }

  const jd = ms / 86400000 + 2440587.5;
  node.push(Math.abs(sdiff(g.__kSidAt("Rahu", new Date(ms)) + g.__ayan(jd), s.meanNode)) * 3600);
  gast.push(Math.abs(Astronomy.SiderealTime(new Date(msUTC)) - s.gastHours) * 15 * 3600);
  dT.push(Math.abs((ms - msUTC) / 1000));

  /* the lagna, through the engine's own front door, ayanāṃśa added back */
  const inp = isoInput(s.iso);
  const engGast = Astronomy.SiderealTime(new Date(msUTC));
  const engObl = engineObliquity(msUTC / 86400000 + 2440587.5);
  for (const p of PROV.places) {
    const got = g.__kAsc({ ...inp, lat: p.lat, lon: p.lon }, 0) + g.__ayan(s.jdUTC);
    lag[p.name].push(Math.abs(sdiff(got, s.lagna[p.name])) * 3600);
    lagForm[p.name].push(Math.abs(sdiff(got,
      vectorAscendant(engGast, p.lon, p.lat, engObl))) * 3600);
  }
}

head("longitude and latitude, arcseconds, at matched Terrestrial Time");
console.log("  body       bar     mean      p95      max    |   lat bar   mean    p95    max");
for (const b of bodies) {
  const L = stats(acc[b].lon), T = stats(acc[b].lat);
  console.log("  " + b.padEnd(9)
    + String(BARS[b].lon).padStart(4) + "″"
    + f3(L.mean).padStart(9) + f3(L.p95).padStart(9) + f3(L.max).padStart(9)
    + "   | " + String(BARS[b].lat).padStart(6) + "″"
    + f3(T.mean).padStart(8) + f3(T.p95).padStart(7) + f3(T.max).padStart(7));
}
for (const b of bodies) {
  const L = stats(acc[b].lon), T = stats(acc[b].lat);
  is(L.max <= BARS[b].lon, b + " longitude within " + BARS[b].lon + "″ (worst " + f3(L.max) + "″)");
  is(T.max <= BARS[b].lat, b + " latitude within " + BARS[b].lat + "″ (worst " + f3(T.max) + "″)");
}

head("the node and the sidereal time");
const N = stats(node), G = stats(gast);
is(N.max <= NODE_BAR, "mean node within " + NODE_BAR + "″ (worst " + f3(N.max)
   + "″) — same polynomial both sides, so this is a typo check");
is(G.max <= GAST_BAR, "Greenwich apparent sidereal time within " + GAST_BAR
   + "″ of ERFA gst06a (worst " + f3(G.max) + "″)");
head("the lagna, construction and inputs separated");
console.log("  Given the engine's OWN sidereal time and obliquity, its closed form and an");
console.log("  independent horizon-plane intersection must agree exactly. What is left over");
console.log("  when the reference supplies its own Earth orientation is the 12.4″ sidereal");
console.log("  gap, seen through the geometry — ninefold near the pole.");
for (const p of PROV.places) {
  const F = stats(lagForm[p.name]), S = stats(lag[p.name]);
  const polar = Math.abs(p.lat) > POLAR_LAT;
  const bar = polar ? LAGNA_POLAR_BAR : LAGNA_BAR;
  console.log("  " + p.name.padEnd(11) + p.lat.toFixed(2).padStart(7) + "°"
    + (polar ? "  polar   " : "  ordinary")
    + "   construction " + f3(F.max) + "″   end-to-end " + f3(S.max) + "″ (bar " + bar + "″)");
  is(F.max <= LAGNA_FORM_BAR, p.name + ": the closed form equals the vector construction on "
     + "identical inputs, to " + LAGNA_FORM_BAR + "″ (worst " + F.max.toFixed(6) + "″)");
  is(S.max <= bar, p.name + ": end-to-end within " + bar + "″ of the ERFA-driven reference "
     + "(worst " + f3(S.max) + "″)");
}

/* ---- the ascendant branch fix, in both directions ------------------------
   The flip added to ascendant() must do two things: correct the polar case and
   change nothing anywhere else. Asserting only the first would let a fix that
   quietly perturbed every ordinary chart pass. So the engine is loaded a second
   time with the flip removed, and the two are compared place by place.        */

head("the ascendant branch fix corrects the poles and nothing else");
{
  const { g: gOld } = loadEngine(src =>
    src.replace("if(!isRisingPoint(a,ramc,eps,phi)) a+=Math.PI;",
                "/* flip removed for the regression comparison */"));
  const moved = {}; PROV.places.forEach(p => moved[p.name] = { n: 0, worst: 0 });
  for (const s of SAMPLES) {
    const inp = isoInput(s.iso);
    for (const p of PROV.places) {
      const a = g.__kAsc({ ...inp, lat: p.lat, lon: p.lon }, 0);
      const b = gOld.__kAsc({ ...inp, lat: p.lat, lon: p.lon }, 0);
      const d = Math.abs(sdiff(a, b));
      if (d > 1e-9) { moved[p.name].n++; moved[p.name].worst = Math.max(moved[p.name].worst, d); }
    }
  }
  for (const p of PROV.places) {
    const m = moved[p.name], polar = Math.abs(p.lat) > 66.5;
    console.log("  " + p.name.padEnd(11) + p.lat.toFixed(2).padStart(7) + "°   "
      + (polar ? "polar    " : "ordinary ")
      + m.n + "/" + SAMPLES.length + " instants moved"
      + (m.n ? ", worst " + m.worst.toFixed(3) + "°" : ""));
    if (polar) is(m.n > 0 && m.worst > 179 && m.worst < 181,
      p.name + " above the Arctic circle: the flip fires and moves the lagna by 180° ("
      + m.n + " of " + SAMPLES.length + ")");
    else is(m.n === 0,
      p.name + " at " + p.lat.toFixed(2) + "°: the flip never fires, lagna bit-identical "
      + "to before the fix");
  }
}

head("the Δ T disagreement, stated rather than failed");
const D = stats(dT);
console.log("  the UT that puts the engine at the fixture's TT differs from the fixture's");
console.log("  UTC by " + f3(D.mean) + " s on average and " + f3(D.max) + " s at worst.");
console.log("  That is the gap between astronomy-engine's Δ T prediction and a TAI-derived");
console.log("  TT, and after 2027 it is a genuine uncertainty in any civil-time result.");
{
  const eps = Object.keys(byEpoch).sort((a, b) => a - b);
  console.log("  Moon longitude residual by half-century, AT MATCHED TT (arcsec, worst):");
  console.log("    " + eps.map(e => e + ": " + stats(byEpoch[e].moon).max.toFixed(1)).join("  "));
  console.log("  — flat, which is what tells you the earlier ramp was the timescale and");
  console.log("    not the ephemeris.");
}
is(D.max < 3600, "the Δ T gap stays under an hour across 1800–2200 (" + f3(D.max) + " s)");

/* ---- prove the checks bite ---------------------------------------------- */

head("the checks fail when the engine is wrong");
function withFault(name, mutate, probe) {
  const { g: gg, Astronomy: AA } = loadEngine(mutate);
  let worst = 0;
  for (const s of SAMPLES.slice(0, 60)) worst = Math.max(worst, probe(gg, AA, s));
  return { name, worst };
}

/* a) a one-arcminute frame slip on every longitude */
{
  const r = withFault("a 60″ shift on the ecliptic conversion",
    src => src.replace(
      "return {lon:norm(ev.elon-ayanamsa(jd)), trop:norm(ev.elon), lat:ev.elat};",
      "return {lon:norm(ev.elon-ayanamsa(jd)), trop:norm(ev.elon+1/60), lat:ev.elat};"),
    (gg, AA, s) => {
      const ms = utToMs(ttUt(AA, s.jdTT));
      return Math.abs(sdiff(gg.__kEclip("Sun", ms).trop, s.bodies.Sun.lon)) * 3600;
    });
  is(r.worst > BARS.Sun.lon,
     "a 60″ longitude shift trips the Sun's 4″ bar (reaches " + f3(r.worst) + "″)");
}

/* b) the obliquity mistyped in the lagna, which no other test would see */
{
  const r = withFault("obliquity 23.44 → 23.14 in the ascendant",
    src => src.replace("eps=(23.439291111-0.0130041667*T", "eps=(23.139291111-0.0130041667*T"),
    (gg, AA, s) => {
      const msUTC = (s.jdUTC - 2440587.5) * 86400000;
      const dt = new Date(msUTC);
      const p = PROV.places[0];
      const got = gg.__kAsc({ year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1,
                              day: dt.getUTCDate(), hour: dt.getUTCHours(),
                              minute: dt.getUTCMinutes(), tzHours: 0,
                              lat: p.lat, lon: p.lon }, 0) + gg.__ayan(s.jdUTC);
      return Math.abs(sdiff(got, s.lagna[p.name])) * 3600;
    });
  is(r.worst > LAGNA_BAR,
     "a 0.3° obliquity typo trips the lagna's " + LAGNA_BAR + "″ bar (reaches "
     + f3(r.worst) + "″)");
}

/* c) a sign flip in the node polynomial's quadratic term */
{
  const r = withFault("mean node quadratic sign flipped",
    src => src.replace("+0.0020754*T*T", "-0.0020754*T*T"),
    (gg, AA, s) => {
      const ms = utToMs(ttUt(AA, s.jdTT));
      const jd = ms / 86400000 + 2440587.5;
      return Math.abs(sdiff(gg.__kSidAt("Rahu", new Date(ms)) + gg.__ayan(jd), s.meanNode)) * 3600;
    });
  is(r.worst > NODE_BAR,
     "a sign flip in the node's quadratic term trips its " + NODE_BAR + "″ bar (reaches "
     + f3(r.worst) + "″)");
}

/* ---- out ---------------------------------------------------------------- */

console.log("\n" + (fail ? "FAIL" : "PASS") + " reference-verify — " + pass + " passed, "
            + fail + " failed");
if (VERBOSE) {
  console.log("\nprovenance:");
  for (const k of Object.keys(PROV)) {
    const v = PROV[k];
    console.log("  " + k + ": " + (typeof v === "object" ? JSON.stringify(v) : v));
  }
}
process.exit(fail ? 1 : 0);
