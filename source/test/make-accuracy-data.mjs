/* Write source/data/accuracy.json — the figures the accuracy page draws.
 *
 * WHY THIS IS GENERATED AND NOT TYPED.
 *
 * A page about accuracy whose numbers were typed into its prose would be the
 * single most embarrassing file in the repository. So it has none: every
 * figure on accuracy.html comes from this file, this file is produced by
 * running the same measurements the harnesses run, and accuracy-verify.mjs
 * re-derives them and fails if the committed file has drifted.
 *
 * It measures, rather than reads, everything it can:
 *   - the modern engine against the ERFA reference, per body, at matched TT
 *   - the same across 1000–3000 by band
 *   - sidereal time, the mean node, the lagna construction and end to end
 *   - all seventeen ayanāṃśas at the present epoch, and their spread
 *   - the derived costs: fractions of each division, seconds, daśā days
 * and reads only what is already a committed measurement of its own:
 *   - the fitted siddhāntic tier and its lunar diagnostic
 *
 * Run: node source/test/make-accuracy-data.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

/* ---- engines ----------------------------------------------------------- */

function sandbox(extra) {
  const g = Object.assign({
    console, Date, Math, JSON, parseFloat, parseInt, isNaN, isFinite,
    String, Number, Array, Object, RegExp, Error, Boolean,
  }, extra || {});
  g.window = g; g.globalThis = g;
  g.document = {
    createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }),
    getElementById: () => null, querySelector: () => null,
    querySelectorAll: () => [], addEventListener() {}, body: { appendChild() {} },
  };
  g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  return g;
}
const Astronomy = require(ROOT + "/source/vendor/astronomy.browser.min.js");
const E = (() => {
  const g = sandbox({ Astronomy });
  vm.runInContext(readFileSync(ROOT + "/source/src/js/engine.js", "utf8"),
                  vm.createContext(g), { filename: "engine.js" });
  return g;
})();
const SS = (() => {
  const g = sandbox();
  vm.runInContext(readFileSync(ROOT + "/source/src/js/ss-engine.js", "utf8"),
                  vm.createContext(g), { filename: "ss-engine.js" });
  return g.SSEngine;
})();

/* ---- helpers ----------------------------------------------------------- */

const norm = x => ((x % 360) + 360) % 360;
const sdiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; };
const rms = a => Math.sqrt(a.reduce((p, c) => p + c * c, 0) / a.length);
const r3 = x => Math.round(x * 1000) / 1000;
const ttUt = jdTT => { const w = jdTT - 2451545.0; let ut = w;
  for (let i = 0; i < 4; i++) ut -= (Astronomy.MakeTime(ut).tt - w); return ut; };
const utToMs = ut => (ut + 2451545.0 - 2440587.5) * 86400000;

const BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const SA = { Sun: "Sūrya", Moon: "Candra", Mercury: "Budha", Venus: "Śukra",
             Mars: "Maṅgala", Jupiter: "Guru", Saturn: "Śani" };

const dense = JSON.parse(readFileSync(
  ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8"));
const wide = JSON.parse(readFileSync(
  ROOT + "/source/test/fixtures/reference-ecliptic-wide.json", "utf8"));
const fitted = JSON.parse(readFileSync(
  ROOT + "/source/data/siddhanta-measured.json", "utf8"));

/* ---- 1 · the modern engine against the reference ----------------------- */

const modern = {};
for (const b of BODIES) modern[b] = { lon: [], lat: [] };
const node = [], gast = [], lagEnd = {}, lagForm = {};
const PLACES = dense._provenance.places;
for (const p of PLACES) { lagEnd[p.name] = []; lagForm[p.name] = []; }

/* the same vector construction the reference harness uses, so the page can
   state the construction and the end-to-end figures separately */
function vectorAscendant(gastHours, lonDeg, latDeg, oblDeg) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI, n = x => ((x % 360) + 360) % 360;
  const th = n(gastHours * 15 + lonDeg) * D2R, phi = latDeg * D2R, eps = oblDeg * D2R;
  const a = Math.cos(phi) * Math.cos(th);
  const bb = Math.cos(eps) * Math.cos(phi) * Math.sin(th) + Math.sin(eps) * Math.sin(phi);
  const lam = Math.atan2(-a, bb);
  for (const c of [lam, lam + Math.PI]) {
    const x = Math.cos(c), y = Math.sin(c) * Math.cos(eps), z = Math.sin(c) * Math.sin(eps);
    const ra = Math.atan2(y, x), dec = Math.asin(z), H = th - ra;
    const az = n(Math.atan2(-Math.cos(dec) * Math.sin(H),
      Math.sin(dec) * Math.cos(phi) - Math.cos(dec) * Math.sin(phi) * Math.cos(H)) * R2D);
    if (az > 0 && az < 180) return n(c * R2D);
  }
  return n(lam * R2D);
}
const engineObliquity = jd => { const T = (jd - 2451545.0) / 36525.0;
  return 23.439291111 - 0.0130041667 * T - 1.638e-7 * T * T; };

for (const s of dense.samples) {
  const ms = utToMs(ttUt(s.jdTT)), msUTC = Date.parse(s.iso);
  for (const b of BODIES) {
    const e = E.__kEclip(b, ms);
    modern[b].lon.push(Math.abs(sdiff(e.trop, s.bodies[b].lon)) * 3600);
    modern[b].lat.push(Math.abs(e.lat - s.bodies[b].lat) * 3600);
  }
  const jd = ms / 86400000 + 2440587.5;
  node.push(Math.abs(sdiff(E.__kSidAt("Rahu", new Date(ms)) + E.__ayan(jd), s.meanNode)) * 3600);
  gast.push(Math.abs(Astronomy.SiderealTime(new Date(msUTC)) - s.gastHours) * 15 * 3600);
  const inp = { year: +s.iso.slice(0, 4), month: +s.iso.slice(5, 7), day: +s.iso.slice(8, 10),
                hour: +s.iso.slice(11, 13), minute: +s.iso.slice(14, 16), tzHours: 0 };
  const eg = Astronomy.SiderealTime(new Date(msUTC));
  const eo = engineObliquity(msUTC / 86400000 + 2440587.5);
  for (const p of PLACES) {
    const got = E.__kAsc({ ...inp, lat: p.lat, lon: p.lon }, 0) + E.__ayan(s.jdUTC);
    lagEnd[p.name].push(Math.abs(sdiff(got, s.lagna[p.name])) * 3600);
    lagForm[p.name].push(Math.abs(sdiff(got, vectorAscendant(eg, p.lon, p.lat, eo))) * 3600);
  }
}

const refErr = dense._provenance.referenceAccuracyArcsec;
const perBody = BODIES.map(b => ({
  en: b, sa: SA[b],
  lonWorst: r3(Math.max(...modern[b].lon)),
  lonRms: r3(rms(modern[b].lon)),
  latWorst: r3(Math.max(...modern[b].lat)),
  referenceOwnError: refErr[b],
}));

/* ---- 2 · by band, across 1000–3000 ------------------------------------- */

const bands = E.__kSpanBands.map(b => ({
  from: b.from, to: b.to, moon: b.moon, tithi: b.instant, nak: b.nak,
  certified: b.from === E.__kSpanWindow[0],
}));

/* also a per-sample Moon curve, so the page can draw the shape and not just
   the five step values */
const moonCurve = [];
for (const s of wide.samples) {
  const ms = utToMs(ttUt(s.jdTT));
  moonCurve.push({ y: +s.iso.slice(0, 4),
    d: r3(Math.abs(sdiff(E.__kEclip("Moon", ms).trop, s.bodies.Moon.lon)) * 3600) });
}
moonCurve.sort((a, b) => a.y - b.y);

/* ---- 3 · the ayanāṃśa spread ------------------------------------------- */

const JD_NOW = 2461000.5;
const ayan = Object.keys(E.__ayanModes).map(k => {
  const m = E.__ayanModes[k];
  /* Case-INSENSITIVE, and on the figure rather than the sentence. The first
     version matched "matches Swiss Ephemeris to 0.000″" literally and reported
     6 of 17, missing Fagan — whose note begins the clause with a capital after
     a full stop — and the three Swiss SS modes, which phrase it differently.
     Nine modes claim an exact match; a page about accuracy undercounting its
     own exact figures by a third would have been a poor start. */
  const swiss = /0\.000″/.test(m.note);
  const wobble = (m.note.match(/within ≈?([0-9]+)″/) || [])[1];
  return { key: k, name: m.name, tag: m.s, deg: r3(E.__ayanFor(k, JD_NOW)),
           exactToSwiss: swiss, wobbleArcsec: wobble ? +wobble : null };
}).sort((a, b) => a.deg - b.deg);
const ayanSpread = r3(ayan[ayan.length - 1].deg - ayan[0].deg);
/* The gap between the two STAR-ANCHORED definitions, which is the sharpest way
   to put the point that the classical anchors are mutually incompatible: Citrā
   held at 180° and Revatī held at its stated longitude cannot both be true, and
   this is by how much. Taken from the engine's own True modes rather than from
   a figure quoted in prose. */
const tc = ayan.find(a => a.key === "truechitra"), tr = ayan.find(a => a.key === "truerevati");
const anchorGapDeg = (tc && tr) ? r3(tc.deg - tr.deg) : null;

/* ---- 4 · the siddhāntic engines ---------------------------------------- */

const SSB = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
const siddhanta = SSB.map(b => ({
  sa: b,
  bareRms: fitted.residuals[b].bare.rms,
  measuredRms: fitted.residuals[b].holdout.rms,
  measuredWorst: fitted.residuals[b].holdout.worst,
  gain: fitted.residuals[b].gain,
}));

/* the bare text's divergence by year, straight from the engine */
const bareByYear = [500, 1000, 1500, 1900, 2000, 2026, 2100].map(y => {
  const ms = Date.UTC(y, 0, 1, 12);
  const ah = SS.ahargana(ms), jd = ms / 86400000 + 2440587.5;
  const row = { year: y };
  for (const b of SSB) {
    const t = SS.trueLongitude(b, ah);
    const ref = E.__kSidAt({ "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
      "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus", "Śani": "Saturn" }[b],
      new Date(ms));
    row[b] = r3(sdiff(t.lon, ref));
  }
  return row;
});

/* ---- 5 · what it costs ------------------------------------------------- */

const MOON_W = Math.max(...modern.Moon.lon);
const SUN_W = Math.max(...modern.Sun.lon);
const SAT_W = Math.max(...modern.Saturn.lon);
const MOON_RATE = 0.549, ELONG_RATE = 0.449;     /* ″/s, measured in span work */
const NAK = (40 / 3) * 3600;                      /* a nakṣatra, arcseconds */

const divisions = [
  { name: "Rāśi (D1)", deg: 30 },
  { name: "Nakṣatra", deg: 40 / 3 },
  { name: "Navāṃśa (D9) / pāda", deg: 10 / 3 },
  { name: "D27", deg: 30 / 27 },
  { name: "Ṣaṣṭyāṃśa (D60)", deg: 0.5 },
].map(d => ({
  name: d.name, deg: d.deg, arcsec: Math.round(d.deg * 3600),
  moonFraction: Math.round(d.deg * 3600 / MOON_W),
  saturnFraction: Math.round(d.deg * 3600 / SAT_W),
}));

const cost = {
  nakshatraBoundarySeconds: Math.round(MOON_W / MOON_RATE),
  tithiEndSeconds: Math.round(Math.hypot(MOON_W, SUN_W) / ELONG_RATE),
  /* A 120-year Viṃśottarī cycle maps onto ONE nakṣatra, so the conversion is
     120 years per 13°20′ — 0.913 days of daśā per arcsecond of Moon. Computing
     it from the Moon's daily motion instead gives an answer about five hundred
     times too small, which is a mistake worth leaving a note about. */
  dashaDaysPerArcsec: r3(120 * 365.2425 / NAK),
  mahadashaDays: r3(MOON_W * 120 * 365.2425 / NAK),
  antardashaDays: r3(MOON_W * 20 * 365.2425 / NAK),
  birthMinuteArcsec: r3(60 * MOON_RATE),
  birthMinuteDashaDays: r3(60 * MOON_RATE * 120 * 365.2425 / NAK),
  engineEquivalentBirthSeconds: Math.round(MOON_W / MOON_RATE),
};

/* ---- out -------------------------------------------------------------- */

const doc = {
  _provenance: {
    what: "Every figure the accuracy page draws.",
    why: "A page about accuracy whose numbers were typed into its prose would "
       + "be the worst file in the repository. These are measured by running "
       + "the same comparisons the harnesses run; accuracy-verify.mjs "
       + "re-derives them and fails if this file has drifted from the engines.",
    generator: "source/test/make-accuracy-data.mjs",
    checkedBy: "source/test/accuracy-verify.mjs",
    reference: dense._provenance.reference,
    referenceNote: dense._provenance.referenceAccuracyNote,
    denseSamples: dense.samples.length,
    wideSamples: wide.samples.length,
    span: dense._provenance.span,
    wideSpan: wide._provenance.span,
    certifiedWindow: E.__kSpanWindow,
    generated: new Date().toISOString().slice(0, 10),
  },
  modern: {
    library: "astronomy-engine v2 (MIT), ±1′ claimed against NOVAS",
    perBody,
    meanNodeWorst: r3(Math.max(...node)),
    gastWorst: r3(Math.max(...gast)),
    lagna: PLACES.map(p => ({
      place: p.name, lat: p.lat, polar: Math.abs(p.lat) > 66.5,
      constructionWorst: r3(Math.max(...lagForm[p.name])),
      endToEndWorst: r3(Math.max(...lagEnd[p.name])),
    })),
  },
  bands, moonCurve,
  ayanamsa: { atJd: JD_NOW, spreadDeg: ayanSpread, anchorGapDeg: anchorGapDeg, modes: ayan,
              exactToSwiss: ayan.filter(a => a.exactToSwiss).length },
  siddhanta: {
    measured: siddhanta,
    bareByYear,
    lunarDiagnostic: fitted.lunarDiagnostic,
    fitProvenance: {
      fitSamples: fitted._provenance.fitSamples,
      holdoutSamples: fitted._provenance.holdoutSamples,
      parameters: Object.keys(fitted.params).length,
      notTheText: fitted._provenance.notTheText,
    },
  },
  divisions, cost,
};

/* An optional argument sends the output elsewhere, which is how
   accuracy-verify.mjs regenerates into a scratch file and compares against the
   committed one. That comparison is what notices the page quoting figures the
   engines no longer produce. */
const OUT = process.argv[2] || (ROOT + "/source/data/accuracy.json");
writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
console.log("wrote " + OUT);
console.log("  modern: Sun " + perBody[0].lonWorst + "″, Moon " + perBody[1].lonWorst
  + "″, Saturn " + perBody[6].lonWorst + "″");
console.log("  ayanāṃśa spread: " + ayanSpread + "° across " + ayan.length + " modes");
console.log("  daśā: " + cost.dashaDaysPerArcsec + " days per arcsecond of Moon → "
  + cost.mahadashaDays + " days");
console.log("  size: " + (JSON.stringify(doc).length / 1024).toFixed(1) + " KB");
