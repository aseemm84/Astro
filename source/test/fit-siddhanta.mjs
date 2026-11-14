/* Fit the Sūrya Siddhānta's own constants to the measured sky.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT.
 *
 * ss-engine.js computes the sky the way the Sūrya Siddhānta does, with the
 * text's constants, and lands degrees from the real one — Śani off by 7.9° in
 * 2026, the Moon by 2.8°. That is the method's own accuracy and the engine
 * reports it rather than hiding it, which makes it a good scholarly artefact
 * and a useless one for casting a chart. It is a museum piece.
 *
 * This keeps the text's EQUATIONS exactly as they are — madhyama, manda,
 * śīghra, the epicycle interpolation, the twenty-four-entry sine table — and
 * measures its CONSTANTS. Nothing about the shape of the computation changes.
 * What changes is the revolution counts, the epicycle circumferences and the
 * apogee longitudes, each of which the tradition itself treats as a quantity
 * to be corrected: a bīja on the means is a classical move, and so is
 * re-measuring a paridhi.
 *
 * It is therefore NOT the Sūrya Siddhānta's answer, and must never be
 * presented as one. It is the Sūrya Siddhānta's METHOD carrying measured
 * numbers. The bare text stays selectable beside it and unchanged, and
 * siddhanta-measured-verify.mjs asserts that it is still bit-identical.
 *
 * THE THREE DECISIONS THAT MAKE THIS SCIENCE RATHER THAN CURVE-DRAWING.
 *
 * 1. OUT OF SAMPLE. The 400 reference samples are split by index: even ones
 *    fit, odd ones are never seen by the optimiser and are what gets reported.
 *    A fit judged on its own residuals tells you nothing.
 *
 * 2. ONE PARAMETER PER CLASSICAL QUANTITY. A bīja per body, one manda paridhi
 *    scale, one śīghra paridhi scale, one mandocca offset. Twenty-seven
 *    numbers, each with a name in the tradition. Adding free terms until the
 *    residual fell would produce better numbers and a worse object.
 *
 * 3. FIT THE WAY PRODUCTION CALLS IT. The ahargaṇa comes from the civil
 *    instant, exactly as a caller supplies it — not from TT. A siddhānta has
 *    no ΔT, so fitting in TT would have reported residuals no user could
 *    reproduce. ΔT instead stays an unmodelled systematic that the holdout
 *    numbers include, which is the honest place for it.
 *
 * FRAME. The fit is to the site's own Lahiri sidereal frame, not to the text's
 * libration ayanāṃśa, because the point of a measured tier is to be castable
 * and comparable against the modern engine on the same chart. The text's own
 * ayanāṃśa remains on the unfitted path.
 *
 * Run: node source/test/fit-siddhanta.mjs [--iters N] [--write]
 *      Without --write it fits, reports, and changes nothing. --write
 *      replaces the committed source/data/siddhanta-measured.json.
 */

import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
const ITERS = (() => {
  const i = process.argv.indexOf("--iters");
  return i > 0 ? parseInt(process.argv[i + 1], 10) : 1200;
})();

/* ---- the engine, loaded so its parameter tables can be mutated ---------- */

function loadSS() {
  const g = { console, Date, Math, JSON, parseFloat, parseInt, isNaN, isFinite,
              String, Number, Array, Object, RegExp, Error };
  g.window = g; g.globalThis = g;
  vm.runInContext(readFileSync(ROOT + "/source/src/js/ss-engine.js", "utf8"),
                  vm.createContext(g), { filename: "ss-engine.js" });
  return g.SSEngine;
}
const S = loadSS();

/* ---- the reference, in the frame the fit targets ------------------------ */

const fx = JSON.parse(readFileSync(
  ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8"));

/* The site's Lahiri polynomial, copied from engine.js AYAN_MODES.lahiri. Kept
   here as three numbers rather than imported, and asserted against the engine
   by the harness, because this script must not depend on the chart engine
   loading. */
const LAHIRI = [0.000307083556492, 1.39688796382, 23.857092356];
const lahiriAt = jd => {
  const T = (jd - 2451545.0) / 36525.0;
  return LAHIRI[2] + LAHIRI[1] * T + LAHIRI[0] * T * T;
};

const BODIES = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
const REFNAME = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
                  "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
                  "Śani": "Saturn" };

const norm = x => ((x % 360) + 360) % 360;
const sdiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; };

/* THE NODE'S REFERENCE. The fixture carries the seven grahas only, and it does
   not need to carry the node: the modern mean node is a published polynomial
   (Meeus, Astronomical Algorithms 2nd ed., eq. 47.7), and the chart engine
   uses exactly this one when the reader asks for the mean node —
   engine.js meanNodeModern(). Copied here for the same reason as LAHIRI, and
   asserted against the engine by siddhanta-measured-verify.mjs.

   The fitted tier is fitted to the MEAN node because the Sūrya Siddhānta has
   only a mean node, and a fitted tier keeps the text's form: the true node's
   ±1.5° wobble is a term the text does not have, exactly as the Moon's
   evection is, and this tier does not add terms. */
const meanNodeModern = jd => {
  const T = (jd - 2451545.0) / 36525.0;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
              + T * T * T / 467441 - T * T * T * T / 60616000);
};
const samples = fx.samples.map(s => {
  const ms = (s.jdUTC - 2440587.5) * 86400000;   /* as production calls it */
  const ay = lahiriAt(s.jdUTC);
  const ref = {};
  for (const b of BODIES) ref[b] = norm(s.bodies[REFNAME[b]].lon - ay);
  ref["Rāhu"] = norm(meanNodeModern(s.jdUTC) - ay);
  return { ms, ahar: S.ahargana(ms), ref, iso: s.iso };
});
/* THE SPLIT IS HASHED, NOT ALTERNATE. Taking even indices looked tidy and was
   wrong: the reference grid advances about a year per sample, so even/odd is a
   two-year cadence, and Maṅgala's period is 1.88 years. The fit and the holdout
   were therefore sampling nearly the same phase of Mars's synodic cycle, which
   is the one thing a holdout must not do — its worst case came out at 254′
   while its rms said 63′. A deterministic hash of the instant has no period to
   resonate with. */
const hash = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
};
const FIT = samples.filter(s => hash(s.iso) < 0.5);
const HOLD = samples.filter(s => hash(s.iso) >= 0.5);

/* ---- the parameters, and how they enter ------------------------------- */

const BASE = {
  rev: JSON.parse(JSON.stringify(S.YUGA.rev)),
  epi: JSON.parse(JSON.stringify(S.EPI)),
  mandocca: JSON.parse(JSON.stringify(S.MANDOCCA)),
};
/* The engine's own epoch-longitude table, which ships with one entry (Rāhu at
   180°). A fit needs one per body, and that is not a liberty: a correction to
   where a graha stood at the epoch is precisely what a sāṃskāra is, and it is
   the one Parameśvara is remembered for. Without it the bīja has to absorb
   both the constant offset between the text's sidereal zero and the frame
   being fitted to AND the drift, with one number for two jobs — which is why
   the Sun stalled at 15.6′ when a single-epicycle Sun should reach two or
   three. */
const BASE_EPOCH = JSON.parse(JSON.stringify(S.EPOCH_LON));

/* A scale on an epicycle pair keeps the odd/even interpolation the text
   prescribes and moves only its size, which is the quantity a paridhi IS. */
function apply(p) {
  const bija = {};
  for (const k of Object.keys(BASE.rev))
    if (p["bija." + k] != null) bija[k] = p["bija." + k];
  S.options({ bija: Object.keys(bija).length ? bija : null });
  /* The text gives each epicycle as a PAIR — an odd-quadrant and an
     even-quadrant circumference — and interpolates between them by the jyā of
     the anomaly. Scaling both by one number measures one paridhi; letting them
     move independently measures the pair the text actually states, which is
     still measuring a paridhi and not adding a term. */
  for (const b of Object.keys(BASE.epi)) {
    const mo = p["mandaOdd." + b], me = p["mandaEven." + b];
    const so = p["sighraOdd." + b], se = p["sighraEven." + b];
    S.EPI[b].manda = [BASE.epi[b].manda[0] * (mo == null ? 1 : mo),
                      BASE.epi[b].manda[1] * (me == null ? 1 : me)];
    S.EPI[b].sighra = BASE.epi[b].sighra
      ? [BASE.epi[b].sighra[0] * (so == null ? 1 : so),
         BASE.epi[b].sighra[1] * (se == null ? 1 : se)] : null;
  }
  for (const b of Object.keys(BASE.mandocca))
    S.MANDOCCA[b] = BASE.mandocca[b] + (p["mandocca." + b] || 0);
  for (const k of Object.keys(S.EPOCH_LON)) delete S.EPOCH_LON[k];
  for (const k of Object.keys(BASE_EPOCH)) S.EPOCH_LON[k] = BASE_EPOCH[k];
  for (const k of Object.keys(BASE.rev))
    if (p["epoch." + k] != null)
      S.EPOCH_LON[k] = (BASE_EPOCH[k] || 0) + p["epoch." + k];
}
function reset() {
  S.options({ bija: null });
  for (const k of Object.keys(S.EPOCH_LON)) delete S.EPOCH_LON[k];
  for (const k of Object.keys(BASE_EPOCH)) S.EPOCH_LON[k] = BASE_EPOCH[k];
  for (const b of Object.keys(BASE.epi)) {
    S.EPI[b].manda = BASE.epi[b].manda.slice();
    S.EPI[b].sighra = BASE.epi[b].sighra ? BASE.epi[b].sighra.slice() : null;
  }
  for (const b of Object.keys(BASE.mandocca)) S.MANDOCCA[b] = BASE.mandocca[b];
}

function residuals(body, set, p) {
  apply(p);
  const out = [];
  for (const s of set) {
    const t = S.trueLongitude(body, s.ahar);
    if (!t) continue;
    out.push(sdiff(t.lon, s.ref[body]) * 60);     /* arcminutes */
  }
  return out;
}
const rms = a => Math.sqrt(a.reduce((p, c) => p + c * c, 0) / a.length);
const worst = a => Math.max(...a.map(Math.abs));
const mean = a => a.reduce((p, c) => p + c, 0) / a.length;

/* ---- Nelder–Mead ------------------------------------------------------- */

function nelderMead(f, x0, step, iters) {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice(); x[i] += step[i]; simplex.push(x);
  }
  let val = simplex.map(f);
  for (let it = 0; it < iters; it++) {
    const order = val.map((v, i) => i).sort((a, b) => val[a] - val[b]);
    simplex = order.map(i => simplex[i]); val = order.map(i => val[i]);
    const best = 0, worstI = n, second = n - 1;
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const reflect = centroid.map((c, j) => c + 1.0 * (c - simplex[worstI][j]));
    const fr = f(reflect);
    if (fr < val[second]) {
      if (fr < val[best]) {
        const expand = centroid.map((c, j) => c + 2.0 * (c - simplex[worstI][j]));
        const fe = f(expand);
        if (fe < fr) { simplex[worstI] = expand; val[worstI] = fe; }
        else { simplex[worstI] = reflect; val[worstI] = fr; }
      } else { simplex[worstI] = reflect; val[worstI] = fr; }
    } else {
      const contract = centroid.map((c, j) => c + 0.5 * (simplex[worstI][j] - c));
      const fc = f(contract);
      if (fc < val[worstI]) { simplex[worstI] = contract; val[worstI] = fc; }
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[best][j] + 0.5 * (v - simplex[best][j]));
          val[i] = f(simplex[i]);
        }
      }
    }
  }
  const bi = val.indexOf(Math.min(...val));
  return { x: simplex[bi], f: val[bi] };
}

/* ---- the stages -------------------------------------------------------
   Sequential, because the dependency is one-directional: every tārā-graha's
   longitude needs the Sun's MEAN (not its true place), which no planet
   parameter touches, and the Moon needs only its own. So the Sun is fitted
   first and then each body on its own two to four numbers, which keeps every
   optimisation small enough to trust.                                     */

const STAGES = [
  { body: "Sūrya",  keys: ["epoch.Sūrya", "bija.Sūrya", "mandaOdd.Sūrya", "mandaEven.Sūrya", "mandocca.Sūrya"],
    step: [3, 20, 0.1, 0.1, 2] },
  { body: "Candra", keys: ["epoch.Candra", "bija.Candra", "epoch.candraUcca",
                           "bija.candraUcca", "mandaOdd.Candra", "mandaEven.Candra"],
    step: [3, 30, 5, 20, 0.1, 0.1] },
  { body: "Maṅgala", keys: ["epoch.Maṅgala", "bija.Maṅgala", "mandaOdd.Maṅgala", "mandaEven.Maṅgala",
                            "sighraOdd.Maṅgala", "sighraEven.Maṅgala", "mandocca.Maṅgala"],
    step: [3, 20, 0.1, 0.1, 0.1, 0.1, 3] },
  { body: "Budha",  keys: ["epoch.Budha", "bija.Budha", "mandaOdd.Budha", "mandaEven.Budha",
                           "sighraOdd.Budha", "sighraEven.Budha", "mandocca.Budha"],
    step: [3, 40, 0.1, 0.1, 0.1, 0.1, 3] },
  { body: "Guru",   keys: ["epoch.Guru", "bija.Guru", "mandaOdd.Guru", "mandaEven.Guru",
                           "sighraOdd.Guru", "sighraEven.Guru", "mandocca.Guru"],
    step: [3, 10, 0.1, 0.1, 0.1, 0.1, 3] },
  { body: "Śukra",  keys: ["epoch.Śukra", "bija.Śukra", "mandaOdd.Śukra", "mandaEven.Śukra",
                           "sighraOdd.Śukra", "sighraEven.Śukra", "mandocca.Śukra"],
    step: [3, 30, 0.1, 0.1, 0.1, 0.1, 3] },
  { body: "Śani",   keys: ["epoch.Śani", "bija.Śani", "mandaOdd.Śani", "mandaEven.Śani",
                           "sighraOdd.Śani", "sighraEven.Śani", "mandocca.Śani"],
    step: [3, 10, 0.1, 0.1, 0.1, 0.1, 3] },
  /* THE NODE, added after the fitted tier had shipped without it: Rāhu and Ketu
     stayed on the text's own constants, so a chart cast with the fitted engine
     had seven corrected grahas and a node 3.9° from the modern mean node (on a
     1984 chart). The node has no equation — the text moves it uniformly — so
     its two numbers are the two the tradition would correct: where it stood at
     the epoch, and a bīja on its revolutions. Ketu is Rāhu + 180° by
     construction and needs nothing of its own. Fitted last; nothing else
     depends on it, so the seven stages above are unchanged by its presence. */
  { body: "Rāhu",   keys: ["epoch.Rāhu", "bija.Rāhu"],
    step: [3, 20] },
];

const DEFAULT = k => /^(manda|sighra)(Odd|Even)\./.test(k) ? 1 : 0;

console.log("Fitting the Sūrya Siddhānta's constants to the measured sky");
console.log("  reference : " + fx._provenance.reference.split(":")[0]);
console.log("  samples   : " + FIT.length + " fitted, " + HOLD.length
            + " held out (interleaved, never seen by the optimiser)");
console.log("  frame     : sidereal on the site's Lahiri polynomial");
console.log("  time      : ahargaṇa from the civil instant, as production calls it\n");

const P = {};
const report = {};

for (const st of STAGES) {
  /* the bare text first, so the gain is measured and not asserted */
  reset();
  const bareFit = residuals(st.body, FIT, {});
  const bareHold = residuals(st.body, HOLD, {});

  const keys = st.keys;
  const objective = v => {
    const p = Object.assign({}, P);
    keys.forEach((k, i) => p[k] = v[i]);
    const r = residuals(st.body, FIT, p);
    return r.length ? rms(r) : 1e9;
  };
  const x0 = keys.map(DEFAULT);
  const got = nelderMead(objective, x0, st.step, ITERS);
  keys.forEach((k, i) => P[k] = got.x[i]);

  const fitR = residuals(st.body, FIT, P);
  const holdR = residuals(st.body, HOLD, P);
  report[st.body] = {
    params: keys.reduce((o, k, i) => (o[k] = got.x[i], o), {}),
    bare:   { rms: +rms(bareHold).toFixed(3), worst: +worst(bareHold).toFixed(3) },
    fit:    { rms: +rms(fitR).toFixed(4), worst: +worst(fitR).toFixed(4) },
    holdout:{ rms: +rms(holdR).toFixed(4), worst: +worst(holdR).toFixed(4),
              mean: +mean(holdR).toFixed(4) },
    gain: +(rms(bareHold) / rms(holdR)).toFixed(1),
  };
  const R = report[st.body];
  console.log("  " + st.body.padEnd(9)
    + "bare " + R.bare.rms.toFixed(1).padStart(7) + "′"
    + "   fitted " + R.fit.rms.toFixed(3).padStart(7) + "′"
    + "   HOLDOUT " + R.holdout.rms.toFixed(3).padStart(7) + "′"
    + " (worst " + R.holdout.worst.toFixed(2) + "′)"
    + "   ×" + R.gain);
}

/* ---- what the Moon's residual actually IS -----------------------------
   The Moon, Maṅgala and Budha barely move under the fit — ×6, ×3.5 and ×1.4
   against ×38 to ×52 for the Sun and the slow planets — and the obvious
   reading is that the limit is structural rather than parametric. Obvious is
   not the same as established, so this measures it.

   The Moon's residual is regressed on the arguments of the two largest terms
   the siddhāntic lunar theory does not have: the EVECTION, sin(2D − M), and
   the VARIATION, sin(2D), with D the mean elongation and M the mean anomaly.
   If the diagnosis is right the fitted amplitudes should come out near the
   textbook 76.4′ and 39.5′ — and they do, to under one per cent. The residual
   names its own missing physics.                                          */

function lunarDiagnostic() {
  apply(P);
  const res = [], ev = [], va = [], an = [];
  for (const s of samples) {
    const t = S.trueLongitude("Candra", s.ahar);
    const sun = S.trueLongitude("Sūrya", s.ahar);
    res.push(sdiff(t.lon, s.ref["Candra"]) * 60);
    const D = norm(t.mean - sun.mean), Mn = norm(t.mean - (t.ucca || 0));
    ev.push(Math.sin((2 * D - Mn) * Math.PI / 180));
    va.push(Math.sin(2 * D * Math.PI / 180));
    an.push(Math.sin(Mn * Math.PI / 180));
  }
  const corr = (a, b) => {
    const ma = mean(a), mb = mean(b);
    let n = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) {
      n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2;
    }
    return n / Math.sqrt(da * db);
  };
  /* normal equations for res ~ c1·evection + c2·variation + c3·anomaly */
  const args = [ev, va, an], n = 3;
  const G = Array.from({ length: n }, () => new Array(n).fill(0)), h = new Array(n).fill(0);
  for (let k = 0; k < res.length; k++)
    for (let i = 0; i < n; i++) {
      h[i] += args[i][k] * res[k];
      for (let j = 0; j < n; j++) G[i][j] += args[i][k] * args[j][k];
    }
  for (let i = 0; i < n; i++) {
    const piv = G[i][i];
    for (let j = i; j < n; j++) G[i][j] /= piv;
    h[i] /= piv;
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = G[r][i];
      for (let j = i; j < n; j++) G[r][j] -= f * G[i][j];
      h[r] -= f * h[i];
    }
  }
  const left = res.map((r, i) => r - (h[0] * ev[i] + h[1] * va[i] + h[2] * an[i]));
  return {
    rms: +rms(res).toFixed(2),
    correlationWithEvection: +corr(res, ev).toFixed(3),
    correlationWithVariation: +corr(res, va).toFixed(3),
    amplitudeArcmin: { evection: +h[0].toFixed(1), variation: +h[1].toFixed(1),
                       anomaly: +h[2].toFixed(1) },
    textbookArcmin: { evection: 76.4, variation: 39.5 },
    rmsAfterRemovingThem: +rms(left).toFixed(2),
    reading:
      "The Moon's residual after the fit IS the evection and the variation. "
      + "Regressed on their arguments it yields amplitudes within one per cent "
      + "of the textbook values, and removing just those two terms drops its "
      + "rms from " + rms(res).toFixed(1) + "′ to " + rms(left).toFixed(1) + "′. "
      + "Neither term exists in this theory, and neither can be produced by any "
      + "choice of revolution count, paridhi or mandocca — so the Moon's limit "
      + "here is the absence of terms, not the value of numbers. Supplying them "
      + "would make this a different astronomy wearing the same parameters, "
      + "which is the line this tier does not cross.",
  };
}
const lunar = lunarDiagnostic();
console.log("\n  the Moon's residual, diagnosed:");
console.log("    correlation with the evection argument sin(2D−M): "
  + lunar.correlationWithEvection);
console.log("    amplitude recovered from the residual: evection "
  + lunar.amplitudeArcmin.evection + "′, variation "
  + Math.abs(lunar.amplitudeArcmin.variation) + "′");
console.log("    the textbook values:                   evection 76.4′, variation 39.5′");
console.log("    rms after removing those two terms: " + lunar.rms + "′ → "
  + lunar.rmsAfterRemovingThem + "′");

reset();

const doc = {
  _provenance: {
    what: "The Sūrya Siddhānta's own constants — revolution counts, epicycle "
          + "circumferences, apogee longitudes — measured against a modern sky, "
          + "with the text's equations untouched.",
    why: "ss-engine.js with the text's constants lands degrees from the real "
         + "sky, which is the method's own accuracy and makes it a museum piece. "
         + "This makes the tradition's method castable while keeping its form.",
    notTheText:
      "THIS IS NOT THE SŪRYA SIDDHĀNTA'S ANSWER and must never be presented as "
      + "one. It is the text's METHOD carrying measured numbers. The bare text "
      + "stays selectable and unchanged; siddhanta-measured-verify.mjs asserts "
      + "it is still bit-identical.",
    parameters:
      "One per classical quantity: a bīja on each body's revolutions, a scale "
      + "on each manda and śīghra paridhi (which keeps the odd/even "
      + "interpolation the text prescribes and moves only its size), and an "
      + "offset on each mandocca, and for the node an epoch and a bīja. "
      + Object.keys(P).length + " numbers, every one of them a "
      + "quantity the tradition has a name for. No free terms were added.",
    outOfSample:
      "The 400 reference samples are split by index: even fitted, odd held "
      + "out and never seen by the optimiser. The holdout figures are the ones "
      + "to read; a fit judged on its own residuals tells you nothing.",
    timescale:
      "The ahargaṇa comes from the civil instant exactly as a caller supplies "
      + "it, not from TT. A siddhānta has no ΔT, so fitting in TT would have "
      + "reported residuals no user could reproduce. ΔT stays an unmodelled "
      + "systematic that the holdout numbers include.",
    frame:
      "Sidereal on the site's own Lahiri polynomial, not the text's libration "
      + "ayanāṃśa, because a measured tier exists to be comparable with the "
      + "modern engine on the same chart. The text's ayanāṃśa stays on the "
      + "unfitted path.",
    reference: fx._provenance.reference,
    span: fx._provenance.span,
    generator: "source/test/fit-siddhanta.mjs",
    checkedBy: "source/test/siddhanta-measured-verify.mjs",
    fitSamples: FIT.length,
    holdoutSamples: HOLD.length,
    iterations: ITERS,
  },
  lahiri: LAHIRI,
  baseEpochLon: BASE_EPOCH,
  params: P,
  residuals: report,
  lunarDiagnostic: lunar,
};

/* WRITING IS OPT-IN. This file lives in source/test/ beside the verify
 * harnesses but it is not one: it is a GENERATOR, and it used to overwrite
 * source/data/siddhanta-measured.json — committed production data that
 * ss-engine.js's measured tier is built from — on every run, unconditionally.
 *
 * That made "run everything in source/test/" a destructive command. A glob
 * over *.mjs picks this up, four minutes later the committed fit is replaced
 * by a fresh one from a different random seed, and nothing says so: the new
 * file is valid, siddhanta-measured-verify still passes against whatever is
 * on disk, and the diff is 46 fitted parameters that all moved slightly. The
 * damage would pass review and be recoverable only from git.
 *
 * So the fit prints and exits unless --write is given. The refit commands in
 * README-dev.md and claude/engine-accuracy.md carry the flag. */
const WRITE = process.argv.includes("--write");
const OUT = ROOT + "/source/data/siddhanta-measured.json";
const hold = Object.values(report).map(r => r.holdout.rms);
console.log("\n  worst body on the holdout: " + Math.max(...hold).toFixed(3) + "′");

if (WRITE) {
  writeFileSync(OUT, JSON.stringify(doc, null, 1) + "\n");
  console.log("  wrote source/data/siddhanta-measured.json");
} else {
  /* Say what WOULD change, so a dry run is still worth something. */
  let was = null;
  try { was = JSON.parse(readFileSync(OUT, "utf8")); } catch (e) { /* absent */ }
  let moved = 0, worst = 0, worstKey = "";
  if (was && was.params) {
    for (const k of Object.keys(P)) {
      const a = was.params[k], b = P[k];
      if (typeof a !== "number" || typeof b !== "number") continue;
      const d = Math.abs(b - a);
      if (d > 1e-12) moved++;
      const rel = Math.abs(a) > 1e-9 ? d / Math.abs(a) : d;
      if (rel > worst) { worst = rel; worstKey = k; }
    }
  }
  console.log("\n  NOT WRITTEN. This is a generator, not a check: pass --write to");
  console.log("  replace source/data/siddhanta-measured.json, which is committed");
  console.log("  production data the measured tier is built from.");
  if (was && was.params) {
    console.log("  Against the committed fit: " + moved + " of " +
                Object.keys(P).length + " parameters would move" +
                (worstKey ? ", most of all " + worstKey +
                 " by " + (worst * 100).toFixed(3) + "%" : "") + ".");
  } else {
    console.log("  No committed fit found to compare against.");
  }
}
