/* The measured siddhānta tier, and the honesty it has to keep.
 *
 * ss-engine.js can now swap the text's constants for constants fitted to a
 * modern sky. That is useful and it is dangerous, so four things have to hold
 * and all four are asserted here:
 *
 * 1. THE BARE TEXT IS UNCHANGED. bare() must restore every constant exactly,
 *    bit for bit, against a second engine instance that never heard of the
 *    measured tier. A fit that quietly perturbed the museum piece would
 *    destroy the only thing the museum piece is for.
 * 2. THE FIT DELIVERS WHAT IT CLAIMS, out of sample. The residuals are
 *    recomputed here from the fixture, on the holdout half the optimiser never
 *    saw, and checked against the figures committed in the data file.
 * 3. THE LIMIT IS WHERE THE DATA SAYS IT IS. The Moon's residual is regressed
 *    on the arguments of evection and variation and must still recover their
 *    textbook amplitudes — the claim "the limit is structural" is a
 *    measurement, and it is re-measured rather than quoted.
 * 4. NOTHING IS ATTRIBUTED TO A VERSE. Not one fitted number may be presented
 *    as the text's, and the data file must say so in its own provenance.
 *
 * Run: node source/test/siddhanta-measured-verify.mjs
 */

import { readFileSync } from "node:fs";
import vm from "node:vm";

const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

function loadSS() {
  const g = { console, Date, Math, JSON, parseFloat, parseInt, isNaN, isFinite,
              String, Number, Array, Object, RegExp, Error };
  g.window = g; g.globalThis = g;
  vm.runInContext(readFileSync(ROOT + "/source/src/js/ss-engine.js", "utf8"),
                  vm.createContext(g), { filename: "ss-engine.js" });
  return g.SSEngine;
}

const M = JSON.parse(readFileSync(ROOT + "/source/data/siddhanta-measured.json", "utf8"));
const fx = JSON.parse(readFileSync(
  ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8"));
const MP = M._provenance;

const norm = x => ((x % 360) + 360) % 360;
const sdiff = (a, b) => { const d = norm(a - b); return d > 180 ? d - 360 : d; };
const rms = a => Math.sqrt(a.reduce((p, c) => p + c * c, 0) / a.length);
const mean = a => a.reduce((p, c) => p + c, 0) / a.length;

const BODIES = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
const REFNAME = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
                  "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
                  "Śani": "Saturn" };

console.log("The measured siddhānta tier");
console.log("  " + MP.fitSamples + " fitted, " + MP.holdoutSamples
            + " held out, span " + MP.span);

/* ---- 4. the honesty of the data file (checked first: cheapest) ---------- */

head("not one fitted number is presented as the text's");
is(/NOT THE SŪRYA SIDDHĀNTA'S ANSWER/.test(MP.notTheText),
   "the data file says in its own provenance that this is not the text's answer");
is(/method carrying measured numbers/i.test(MP.notTheText),
   "and that it is the text's method with measured numbers");
is(/bare text stays selectable/i.test(MP.notTheText),
   "and that the bare text stays selectable");
is(/No free terms were added/.test(MP.parameters),
   "and that no free terms were added");
is(/even fitted, odd held out|never seen by the optimiser/.test(MP.outOfSample),
   "and that the reported figures are out of sample");
is(/no ΔT/.test(MP.timescale),
   "and that the fit is in civil time because a siddhānta has no ΔT");
{
  /* Every parameter name must be a classical quantity, not a free coefficient.
     This is the check that stops the tier drifting into curve-fitting. */
  const ALLOWED = /^(bija|epoch|mandaOdd|mandaEven|sighraOdd|sighraEven|mandocca)\./;
  const keys = Object.keys(M.params);
  const odd = keys.filter(k => !ALLOWED.test(k));
  is(odd.length === 0, "all " + keys.length + " parameters are named classical quantities"
     + (odd.length ? " — stray: " + odd.join(", ") : ""));
  /* The total is 46, and the total is the wrong number to bound. The fit is
     sequential and body-local: the Sun is fitted on its own five, then each
     body on its own four to seven, against 187 samples. What could overfit is
     the PER-BODY dimensionality, so that is what is bounded — and the holdout
     figures are the real guard either way. A total bar of 40 failed here and
     raising it to 50 without saying why would have been the quiet kind of
     loosening this project is supposed to avoid. */
  const perBody = {};
  for (const k of keys) {
    const b = k.split(".")[1];
    perBody[b] = (perBody[b] || 0) + 1;
  }
  const worstBody = Object.entries(perBody).sort((a, b) => b[1] - a[1])[0];
  is(worstBody[1] <= 8,
     "no body carries more than 8 fitted numbers (" + worstBody[0] + " has "
     + worstBody[1] + "), against " + MP.fitSamples + " fit samples");
  is(keys.length <= 50, "and " + keys.length + " in total, not hundreds");
}

/* ---- 1. the bare text is untouched ------------------------------------- */

head("the bare text survives the measured tier");
{
  const pristine = loadSS();          /* never told about the fit */
  const S = loadSS();
  S.setMeasured(M);
  S.measured();
  S.bare();

  const snap = E => JSON.stringify({
    rev: E.YUGA.rev, epi: E.EPI, mandocca: E.MANDOCCA, bija: E.OPT.bija,
  });
  is(snap(S) === snap(pristine),
     "after measured() then bare(), every constant is bit-identical to a fresh engine");

  const ms = Date.UTC(1984, 11, 15, 8, 1);
  const ah = S.ahargana(ms);
  let same = 0;
  for (const b of BODIES) {
    const a = S.trueLongitude(b, ah).lon, c = pristine.trueLongitude(b, ah).lon;
    if (Math.abs(a - c) < 1e-12) same++;
  }
  is(same === BODIES.length,
     "and all " + BODIES.length + " longitudes match the untouched engine exactly");

  /* and the measured path really does move them, or none of this means anything */
  S.measured();
  let moved = 0;
  for (const b of BODIES)
    if (Math.abs(sdiff(S.trueLongitude(b, ah).lon, pristine.trueLongitude(b, ah).lon)) > 0.05)
      moved++;
  is(moved === BODIES.length, "while measured() moves every one of them");
  is(S.isMeasured() === true, "and isMeasured() reports the tier is on");
  S.bare();
  is(S.isMeasured() === false, "and false once bare() is called");
}

/* ---- 2. the fit delivers what it claims, out of sample ----------------- */

head("the holdout residuals are what the data file says");
{
  const S = loadSS();
  S.setMeasured(M);
  is(S.measured() === true, "the fitted constants apply");

  const L = M.lahiri;
  const lahiriAt = jd => { const T = (jd - 2451545.0) / 36525.0;
    return L[2] + L[1] * T + L[0] * T * T; };
  /* the same deterministic split the fit used, recomputed here rather than
     stored, so a changed split cannot slip past as an improvement */
  const hash = s => { let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296; };
  const hold = fx.samples.filter(s => hash(s.iso) >= 0.5);
  is(hold.length === MP.holdoutSamples,
     "the holdout half recomputes to the same " + MP.holdoutSamples + " samples");

  console.log("  body       claimed   remeasured   worst");
  for (const b of BODIES) {
    const r = [];
    for (const s of hold) {
      const ms = (s.jdUTC - 2440587.5) * 86400000;
      const ref = norm(s.bodies[REFNAME[b]].lon - lahiriAt(s.jdUTC));
      r.push(sdiff(S.trueLongitude(b, S.ahargana(ms)).lon, ref) * 60);
    }
    const got = rms(r), claimed = M.residuals[b].holdout.rms;
    console.log("  " + b.padEnd(10) + claimed.toFixed(3).padStart(8) + "′"
      + got.toFixed(3).padStart(12) + "′" + Math.max(...r.map(Math.abs)).toFixed(2).padStart(9) + "′");
    is(Math.abs(got - claimed) < 0.01,
       b + ": holdout rms " + got.toFixed(3) + "′ matches the committed "
       + claimed.toFixed(3) + "′");
    is(got < M.residuals[b].bare.rms,
       b + ": and beats the bare text (" + M.residuals[b].bare.rms.toFixed(1) + "′)");
  }

  /* the bodies the fit DOES reach, held to it */
  for (const [b, bar] of [["Sūrya", 2], ["Guru", 8], ["Śani", 9], ["Śukra", 11]])
    is(M.residuals[b].holdout.rms < bar,
       b + " reaches under " + bar + "′ out of sample (" + M.residuals[b].holdout.rms + "′)");
  /* and the ones it does not, recorded as such so nobody quotes a better number */
  for (const b of ["Candra", "Maṅgala", "Budha"])
    is(M.residuals[b].holdout.rms > 40,
       b + " remains over 40′ (" + M.residuals[b].holdout.rms
       + "′) — recorded, not rounded away");
  S.bare();
}

/* ---- 2b. the node is fitted too ---------------------------------------
   The fitted tier shipped with the seven grahas corrected and Rāhu/Ketu left
   on the text's own constants, so a fitted chart's node sat degrees from the
   modern mean node — 3.9° on a 15 Dec 1984 chart, found by comparing a real
   reader's screenshots with the engine. The node is now fitted on the same
   samples and split, with two numbers of the same classical kinds. */

head("Rāhu and Ketu are fitted, out of sample, to the modern mean node");
{
  /* the reference polynomial the generator uses must be the chart engine's own
     mean node, or the fit is to a different node from the one readers compare */
  const COEF = "125.0445479-1934.1362891*T+0.0020754*T*T+T*T*T/467441-T*T*T*T/60616000";
  const eng = readFileSync(ROOT + "/source/src/js/engine.js", "utf8");
  const gen = readFileSync(ROOT + "/source/test/fit-siddhanta.mjs", "utf8").replace(/\s+/g, "");
  is(eng.includes("return norm(" + COEF + ");"),
     "engine.js meanNodeModern() is the published mean-node polynomial");
  is(gen.includes(COEF.replace(/\*T\*T\*T\//, "*T*T*T/")),
     "and fit-siddhanta.mjs fits to exactly that polynomial");
  const meanNodeModern = jd => { const T = (jd - 2451545.0) / 36525.0;
    return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
                + T * T * T / 467441 - T * T * T * T / 60616000); };

  is(M.params["epoch.Rāhu"] != null && M.params["bija.Rāhu"] != null,
     "the data file carries an epoch and a bīja for Rāhu");
  is(Object.keys(M.params).filter(k => /\.(Rāhu|Ketu)$/.test(k)).length === 2,
     "and only those two — the node has no equation for a paridhi or mandocca to scale");

  const S = loadSS(); S.setMeasured(M); S.measured();
  const L = M.lahiri;
  const lahiriAt = jd => { const T = (jd - 2451545.0) / 36525.0;
    return L[2] + L[1] * T + L[0] * T * T; };
  const hash = s => { let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296; };
  const r = [];
  for (const smp of fx.samples.filter(x => hash(x.iso) >= 0.5)) {
    const ms = (smp.jdUTC - 2440587.5) * 86400000;
    const ref = norm(meanNodeModern(smp.jdUTC) - lahiriAt(smp.jdUTC));
    r.push(sdiff(S.trueLongitude("Rāhu", S.ahargana(ms)).lon, ref) * 60);
  }
  const got = rms(r), worstR = Math.max(...r.map(Math.abs));
  is(Math.abs(got - M.residuals["Rāhu"].holdout.rms) < 0.01,
     "Rāhu: holdout rms " + got.toFixed(3) + "′ matches the committed "
     + M.residuals["Rāhu"].holdout.rms.toFixed(3) + "′");
  is(got < 1 && worstR < 1,
     "and is under one arcminute, worst " + worstR.toFixed(2) + "′, across 1800–2200");
  is(M.residuals["Rāhu"].bare.rms > 60,
     "against " + M.residuals["Rāhu"].bare.rms.toFixed(0) + "′ for the text as written — recorded, not hidden");

  /* the case that found it */
  const ms84 = Date.UTC(1984, 11, 15, 8, 1), jd84 = ms84 / 86400000 + 2440587.5;
  const a84 = S.ahargana(ms84);
  const d84 = sdiff(S.trueLongitude("Rāhu", a84).lon,
                    norm(meanNodeModern(jd84) - lahiriAt(jd84))) * 60;
  is(Math.abs(d84) < 1,
     "15 Dec 1984 13:31 IST: the fitted Rāhu is " + d84.toFixed(2) + "′ from the modern mean node (was 3.9°)");
  is(Math.abs(sdiff(S.trueLongitude("Ketu", a84).lon,
                    S.trueLongitude("Rāhu", a84).lon + 180)) < 1e-9,
     "and Ketu stays exactly opposite");

  /* bare() must give the text's node back, bit for bit */
  const pristine = loadSS();
  S.bare();
  is(Math.abs(S.trueLongitude("Rāhu", a84).lon - pristine.trueLongitude("Rāhu", a84).lon) < 1e-12,
     "bare() restores the text's own node exactly");
}

/* ---- 3. the limit is where the data says it is ------------------------- */

head("the Moon's limit is the absence of terms, re-measured not quoted");
{
  const D = M.lunarDiagnostic;
  is(!!D, "the data file carries the lunar diagnostic");
  is(D.correlationWithEvection > 0.8,
     "the residual correlates " + D.correlationWithEvection
     + " with the evection argument sin(2D−M)");
  is(Math.abs(D.amplitudeArcmin.evection - D.textbookArcmin.evection) < 2,
     "the evection amplitude recovered from the residual alone is "
     + D.amplitudeArcmin.evection + "′ against the textbook "
     + D.textbookArcmin.evection + "′");
  is(Math.abs(Math.abs(D.amplitudeArcmin.variation) - D.textbookArcmin.variation) < 2,
     "and the variation " + Math.abs(D.amplitudeArcmin.variation) + "′ against "
     + D.textbookArcmin.variation + "′");
  is(D.rmsAfterRemovingThem < D.rms / 3,
     "removing those two terms drops the rms from " + D.rms + "′ to "
     + D.rmsAfterRemovingThem + "′");
  is(/different astronomy wearing the same parameters/.test(D.reading),
     "and the file states that supplying them would be a different astronomy");

  /* No fitted parameter may be able to produce an evection: it is a function
     of the elongation, and nothing in this parameter set is. Asserted by
     construction — every parameter name is a body-local constant. */
  const elongationDependent = Object.keys(M.params).filter(k => /elong|evect|D2|argument/i.test(k));
  is(elongationDependent.length === 0,
     "no parameter is a function of the elongation, so no choice of them could supply one");
}

/* 5. THE GENERATOR MUST NOT WRITE UNLESS ASKED.
 *
 * fit-siddhanta.mjs sits in source/test/ beside the verify harnesses but it is
 * a GENERATOR, and it used to overwrite source/data/siddhanta-measured.json on
 * every run, unconditionally — which made "run everything in source/test/" a
 * destructive command. A glob over *.mjs picks it up, the committed fit is
 * replaced by a fresh one from a different seed, and nothing says so: the new
 * file is valid and every check above still passes against whatever is on
 * disk. A SHORT accidental run is the bad case, not a long one — at --iters 1
 * the holdout reaches 184.6′ against the committed fit's 61.6′.
 *
 * Asserted behaviourally rather than by reading the source for a flag: run it
 * with the cheapest possible fit and no --write, and demand the data file is
 * byte-identical afterwards. */
{
  const { execFileSync } = await import("node:child_process");
  const { createHash } = await import("node:crypto");
  const DATA = ROOT + "/source/data/siddhanta-measured.json";
  const sum = () => createHash("sha256").update(readFileSync(DATA)).digest("hex");
  const before = sum();
  let ran = false, out = "";
  try {
    out = execFileSync(process.execPath,
      [ROOT + "/source/test/fit-siddhanta.mjs", "--iters", "1"],
      { encoding: "utf8", timeout: 600000, stdio: ["ignore", "pipe", "pipe"] });
    ran = true;
  } catch (e) { out = String((e && e.stdout) || e); }
  is(ran, "the generator runs without --write" + (ran ? "" : ": " + out.slice(0, 160)));
  is(sum() === before,
     "and leaves source/data/siddhanta-measured.json BYTE-IDENTICAL — writing is " +
     "opt-in, so running the test directory cannot replace production data");
  is(/NOT WRITTEN/.test(out),
     "and says so, rather than finishing silently and leaving the reader to guess");
  is(/--write/.test(out),
     "naming the flag that would write, so the refit path stays discoverable");
}

console.log("\n" + (fail ? "FAIL" : "PASS") + " siddhanta-measured-verify — "
            + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
