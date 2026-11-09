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

/* Viṃśottarī mahādaśā years, in the order BPHS gives the lords. One circuit of
   the nine is 120 years and covers NINE nakṣatras — 120° — not one. */
const VIMS_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
                     Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const YEAR_DAYS = 365.2425;

/* THE DAŚĀ COST OF AN ARCSECOND OF MOON IS LORD-SPECIFIC. Read this before
   changing anything here, because the quantity has been got wrong twice, in
   two different directions.
 *
 * Mistake 1 — too small by ~500x: dividing by the Moon's DAILY MOTION, as
 * though an arcsecond of Moon cost its own travel time. It does not. The
 * Moon's position at birth fixes how far into a daśā the birth falls.
 *
 * Mistake 2 — too big by 120/lord-years: mapping the whole 120-year cycle
 * onto ONE nakṣatra of 13°20', giving 120*365.2425/48000 = 0.913 d/arcsec.
 * This is what shipped, and the old comment here warned against mistake 1
 * while committing mistake 2. The cycle spans nine nakṣatras, so traversing
 * one nakṣatra traverses THAT nakṣatra lord's years, not all 120.
 *
 * Correct: days = arcsec * years(lord) * 365.2425 / 48000, ranging from
 * 0.046 (Sun, 6 years) to 0.152 (Venus, 20 years). For prose that cannot
 * name a lord, the cycle average is 120 years over 120 degrees =
 * 365.2425/3600 = 0.101 d/arcsec — nine times smaller than what shipped.
 *
 * Verified independently of every constant here: the ayanāṃśa band panel
 * measures the Viṃśottarī balance at both edges of a +/-19.3' band through
 * __kVims.atMoon, with no rate constant involved, and reports 282 days
 * across the full 38.6' for a Jupiter mahādaśā. By hand,
 * 0.6433 * 16 * 365.2425 / 13.3333 = 282. The shipped rate predicted 2114. */
const dashaRateByLord = Object.fromEntries(
  Object.entries(VIMS_YEARS).map(([k, y]) => [k, r3(y * YEAR_DAYS / NAK)]));
const DASHA_RATE_AVG = YEAR_DAYS / 3600;          /* 120 years over 120° */
const RATE_MIN = Math.min(...Object.values(dashaRateByLord));
const RATE_MAX = Math.max(...Object.values(dashaRateByLord));

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
  /* See the long note above dashaRateByLord. This scalar is the CYCLE
     AVERAGE, not a universal rate: every consumer that prints it must say
     so, because the real figure depends on which lord owns the nakṣatra. */
  dashaDaysPerArcsec: r3(DASHA_RATE_AVG),
  dashaDaysPerArcsecByLord: dashaRateByLord,
  dashaDaysPerArcsecMin: r3(RATE_MIN),
  dashaDaysPerArcsecMax: r3(RATE_MAX),
  dashaRateLordMin: Object.keys(dashaRateByLord)
    .reduce((a, b) => (dashaRateByLord[b] < dashaRateByLord[a] ? b : a)),
  dashaRateLordMax: Object.keys(dashaRateByLord)
    .reduce((a, b) => (dashaRateByLord[b] > dashaRateByLord[a] ? b : a)),
  mahadashaDays: r3(MOON_W * DASHA_RATE_AVG),
  mahadashaDaysMin: r3(MOON_W * RATE_MIN),
  mahadashaDaysMax: r3(MOON_W * RATE_MAX),
  /* An antardaśā is MD x AD/120, so within a 20-year Venus period the cost
     of an arcsecond is the mahādaśā cost scaled by 20/120. */
  antardashaDays: r3(MOON_W * DASHA_RATE_AVG * 20 / 120),
  birthMinuteArcsec: r3(60 * MOON_RATE),
  birthMinuteDashaDays: r3(60 * MOON_RATE * DASHA_RATE_AVG),
  birthMinuteDashaDaysMin: r3(60 * MOON_RATE * RATE_MIN),
  birthMinuteDashaDaysMax: r3(60 * MOON_RATE * RATE_MAX),
  engineEquivalentBirthSeconds: Math.round(MOON_W / MOON_RATE),
};

/* ---- 6 · what the engines can actually do -----------------------------
   COUNTED FROM THE BUILT OUTPUT, not from memory and not from a list someone
   maintains by hand. A capabilities summary is exactly the kind of thing that
   drifts: a section gets renamed, a daśā is added, and the number on the page
   quietly becomes a claim nobody checked. Counting the artefact means the page
   can only ever overstate by as much as the build does. */

const built = readFileSync(ROOT + "/kundli.html", "utf8");
const engineSrc = readFileSync(ROOT + "/source/src/js/engine.js", "utf8");
const uniq = a => [...new Set(a)];

const sections = uniq([...built.matchAll(/sec\("([^"]{2,46})"/g)].map(m => m[1]));
const tabs = [...built.matchAll(/\["([a-z0-9]+)","([A-Z][^"]{1,22})",function/g)]
  .map(m => m[2]);
const scenes = uniq([...readFileSync(ROOT + "/motion.html", "utf8")
  .matchAll(/\bkey: *"([a-z0-9]+)"/g)].map(m => m[1]));

/* The families are the only hand-made thing here, and they are a GROUPING of
   the counted sections rather than a count of their own — every section must
   land in exactly one, which the harness asserts, so a new section cannot be
   silently left out of the picture. */
const FAMILY = [
  ["The chart itself", /chart|particulars|Grahas|Bhāva|ascendant|Upagraha|Dhūmādi|Chandra|Sudarśana|Conventions|Derived/i],
  ["Strength & dignity", /bala|Iṣṭa|Avasthā|friendship|strength/i],
  ["Divisional", /varga|Divisional|Ashtakavarga|Prastār|kakṣyā/i],
  ["Timing", /daśā|Varṣaphala|timeline|Sade/i],
  ["Aspects & yogas", /dṛṣṭi|Argala|Yoga|Kārak|Ārūḍha/i],
  ["Sky & transit", /sky|Gochara|Ingress|Eclipse|transit/i],
  ["Day tools", /Day tools|birth minute/i],
];
/* FIRST match wins, so the counts sum to the total. Allowing a section into
   two families made them add to 50 of 46 — "Ārūḍha & Kārakāṃśa charts" is both
   a chart and a kāraka, and a reader counting the bars would have found four
   more sections than exist. */
const taken = new Set();
const families = FAMILY.map(([name, re]) => {
  const members = sections.filter(s => !taken.has(s) && re.test(s));
  members.forEach(m => taken.add(m));
  return { name, count: members.length, members };
});
const unclassified = sections.filter(s => !taken.has(s));

const capabilities = {
  note: "Counted from the built kundli.html and motion.html, not from a "
      + "hand-kept list. accuracy-verify.mjs re-counts them and asserts every "
      + "section falls into exactly one family.",
  reportSections: sections.length,
  tabs: tabs.length, tabNames: tabs,
  vargas: (engineSrc.match(/case "D\d+":/g) || []).length,
  ayanamsaModes: Object.keys(E.__ayanModes).length,
  motionScenes: scenes.length,
  referencePages: 24,
  yogaRules: (engineSrc.match(/\badd\("/g) || []).length,
  families, unclassified,
  /* What each engine reaches across, in years. A capability is not only what
     it computes but over what span it will stand behind it. */
  reach: [
    { what: "Modern engine, checked", from: E.__kSpanWindow[0], to: E.__kSpanWindow[1],
      note: "held to an independent sky on " + dense.samples.length + " instants" },
    { what: "Modern engine, bounded", from: 1000, to: 3000,
      note: "disagreement quoted by band; nothing claimed outside" },
    { what: "Sūrya Siddhānta, as written", from: -3101, to: 3000,
      note: "the text's own epoch onward, at its own degree-level accuracy" },
    { what: "Measured siddhāntic tier", from: E.__kSpanWindow[0], to: E.__kSpanWindow[1],
      note: "fitted and validated out of sample over the same window" },
  ],
  /* The end-to-end path, which is the thing a reader actually wants to know:
     what you put in, and what comes out. */
  pipeline: [
    { step: "A moment and a place", detail: "date, time, latitude, longitude, zone" },
    { step: "Apparent positions", detail: "nine grahas, geocentric, true ecliptic of date" },
    { step: "A sidereal frame", detail: Object.keys(E.__ayanModes).length
        + " ayanāṃśa conventions, switchable after casting" },
    { step: "The chart", detail: "lagna, bhāvas by two systems, " +
        (engineSrc.match(/case "D\d+":/g) || []).length + " divisional charts" },
    { step: "Judgement", detail: "ṣaḍbala, ashtakavarga, avasthās, dṛṣṭi, yogas, ārūḍhas" },
    { step: "Timing", detail: "six daśā systems to prāṇa, varṣaphala, gochara, eclipses" },
    { step: "Out", detail: "a printable report, JSON, motion scenes, shareable cards" },
  ],
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
  divisions, cost, capabilities,
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
console.log("  daśā: " + cost.dashaDaysPerArcsec + " d/arcsec of Moon on the cycle"
  + " average (" + cost.dashaDaysPerArcsecMin + "–" + cost.dashaDaysPerArcsecMax
  + " by lord, " + cost.dashaRateLordMin + "–" + cost.dashaRateLordMax + ") → "
  + cost.mahadashaDays + " days (" + cost.mahadashaDaysMin + "–"
  + cost.mahadashaDaysMax + ")");
console.log("  size: " + (JSON.stringify(doc).length / 1024).toFixed(1) + " KB");
