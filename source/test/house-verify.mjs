/* ===== the global bhāva-frame switch ====================================

   The site can now compute every bhāva either whole-sign (the default, and
   what every figure this project has published was computed with) or Śrīpati.
   One switch, one frame, read by everything.

   THE FIRST AND MOST IMPORTANT PROPERTY IS THAT THE DEFAULT DID NOT MOVE.
   That is asserted here graha by graha and house by house against the
   arithmetic the engine used before the switch existed — ((sign − LS) mod 12)
   + 1 for occupancy and LORD[(LS + h − 1) mod 12] for lordship — recomputed
   independently in this file rather than read back from the engine, because a
   check that asks the engine what it thinks and then agrees with it is not a
   check.

   This harness exists because the suites that looked like they would catch a
   house regression do not: engine-verify, reference-verify and bhava-verify
   all still PASS with the frame deliberately returning house + 1 for every
   graha. They assert longitudes, dignities and bhāva significations, and
   never an occupancy. The plant is recorded at the bottom of this file as the
   acceptance test for the harness itself. */

import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const br = await chromium.launch();
const pg = await br.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart && window.__setHouseMode && window.SPSripati,
  null, { timeout: 40000 });

/* A spread of moments and places, including two latitudes high enough that
   the quadrants are badly unequal, and one on the equator where Śrīpati must
   very nearly collapse onto whole-sign. */
const CASES = [
  { n: "Delhi 1984",      y: 1984, mo: 5, d: 17, h: 14, mi: 35, lat: 28.6139, lon: 77.2090 },
  { n: "Chennai 1961",    y: 1961, mo: 11, d: 2, h: 5,  mi: 10, lat: 13.0827, lon: 80.2707 },
  { n: "Equator equinox", y: 2000, mo: 3, d: 20, h: 12, mi: 0,  lat: 0.0,     lon: 0.0 },
  { n: "Oslo 1975",       y: 1975, mo: 1, d: 9,  h: 3,  mi: 20, lat: 59.9139, lon: 10.7522 },
  { n: "Tromsø 1990",     y: 1990, mo: 12, d: 21, h: 23, mi: 45, lat: 69.6492, lon: 18.9553 }
];

const LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
              "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
/* the JSON names grahas in Sanskrit, so the expectation must too */
const SK = { Sun:"Sūrya", Moon:"Candra", Mars:"Maṅgala", Mercury:"Budha",
             Jupiter:"Guru", Venus:"Śukra", Saturn:"Śani" };

async function run(mode, c) {
  return pg.evaluate(([mode, c]) => {
    /* The frame is part of the chart INPUT, so it is passed here. The global
       setter is deliberately left pointing the other way first, to assert
       that the input wins — otherwise a page that had set the global earlier
       could silently decide a chart's house system. */
    window.__setHouseMode(mode === "sripati" ? "whole" : "sripati");
    const D = window.buildLocalChart({
      year: c.y, month: c.mo, day: c.d, hour: c.h, minute: c.mi,
      lat: c.lat, lon: c.lon, tzHours: 0, houseSystem: mode
    });
    const out = { mode: D.house_system.mode, lagSid: null,
                  house: {}, sid: {}, sign: {}, rulers: {}, bhavaRashi: {} };
    out.lagSid = D.lagna.sidereal_deg;
    out.LS = Math.floor((((out.lagSid % 360) + 360) % 360) / 30) % 12;
    (D.grahas || []).forEach((p) => {
      out.house[p.key] = p.bhava;
      out.sid[p.key] = p.sidereal_deg;
      out.sign[p.key] = p.rashi.idx;
    });
    (D.bhavas || []).forEach((b) => {
      out.rulers[b.idx + 1] = b.ruler;
      out.bhavaRashi[b.idx + 1] = b.rashi.idx;
    });
    out.hs = D.house_system || null;
    out.vargaD9 = (D.vargas || []).filter((v) => v.varga === "D9")[0] || null;
    return out;
  }, [mode, c]);
}

/* ---- 1. whole-sign is bit-identical to the pre-switch arithmetic -------- */
head("Whole-sign mode reproduces the old inline arithmetic exactly");
let wholeAll = true, lordAll = true;
const whole = {};
for (const c of CASES) {
  const r = await run("whole", c);
  whole[c.n] = r;
  const LS = Math.floor((((r.lagSid % 360) + 360) % 360) / 30) % 12;
  is(LS === r.LS, `${c.n}: the engine's LS agrees with the lagna's own rāśi (${LS})`);
  let bad = [];
  /* a count check first: an empty graha list made every comparison below pass
     vacuously the first time this harness ran, which is the same
     unmeasured-therefore-fine trap it exists to catch */
  is(Object.keys(r.house).length === 9,
    `${c.n}: the chart returned 9 grahas to check (got ${Object.keys(r.house).length})`);
  for (const k of Object.keys(r.house)) {
    const want = ((r.sign[k] - LS) % 12 + 12) % 12 + 1;
    if (r.house[k] !== want) bad.push(`${k} got ${r.house[k]} want ${want}`);
  }
  is(bad.length === 0,
    `${c.n}: all ${Object.keys(r.house).length} grahas sit where ((sign−LS) mod 12)+1 puts them`
    + (bad.length ? " — " + bad.join(", ") : ""));
  if (bad.length) wholeAll = false;
  const lbad = [];
  for (let h = 1; h <= 12; h++) {
    const wantSign = (LS + h - 1) % 12;
    if (r.bhavaRashi[h] !== wantSign)
      lbad.push(`h${h} rāśi got ${r.bhavaRashi[h]} want ${wantSign}`);
    if (r.rulers[h] !== SK[LORD[wantSign]])
      lbad.push(`h${h} ruler got ${r.rulers[h]} want ${SK[LORD[wantSign]]}`);
  }
  is(lbad.length === 0, `${c.n}: every bhāva's rāśi and ruler match the lagna-counted rule`
    + (lbad.length ? " — " + lbad.join(", ") : ""));
  if (lbad.length) lordAll = false;
  is(r.hs && r.hs.mode === "whole" && r.hs.fell_back === false,
    `${c.n}: house_system declares whole-sign without claiming a fallback`);
}
is(wholeAll, "no case moved a graha's house in the default mode");
is(lordAll, "no case moved a house's lord in the default mode");

/* ---- 2. the mode actually takes effect --------------------------------- */
head("Śrīpati mode changes what it should");
let anyMoved = false, moonMovedSomewhere = false;
for (const c of CASES) {
  const r = await run("sripati", c);
  const w = whole[c.n];
  is(r.mode === "sripati", `${c.n}: the engine reports mode "sripati"`);
  /* the rāśi of every graha must be untouched — dignity reads it, and a
     house system has no business moving a graha between signs */
  const sgBad = Object.keys(r.sign).filter((k) => r.sign[k] !== w.sign[k]);
  is(sgBad.length === 0, `${c.n}: no graha changed rāśi` + (sgBad.length ? " — " + sgBad.join(", ") : ""));
  const sidBad = Object.keys(r.sid).filter((k) => Math.abs(r.sid[k] - w.sid[k]) > 1e-9);
  is(sidBad.length === 0, `${c.n}: no graha's longitude moved`
    + (sidBad.length ? " — " + sidBad.join(", ") : ""));
  const moved = Object.keys(r.house).filter((k) => r.house[k] !== w.house[k]);
  if (moved.length) { anyMoved = true; if (moved.indexOf("Moon") >= 0) moonMovedSomewhere = true; }
  console.log(`       ${c.n}: ${moved.length} of ${Object.keys(r.house).length} grahas change bhāva`
    + (moved.length ? " (" + moved.join(", ") + ")" : ""));
  /* every graha must still land in a real house */
  const rng = Object.keys(r.house).filter((k) => !(r.house[k] >= 1 && r.house[k] <= 12));
  is(rng.length === 0, `${c.n}: every graha is in a house 1–12` + (rng.length ? " — " + rng.join(", ") : ""));
}
is(anyMoved, "Śrīpati disagrees with whole-sign on at least one graha somewhere — "
  + "if nothing ever moves, the switch is not wired to anything");

/* ---- 3. the equator-at-equinox degenerate case ------------------------- */
head("At the equator at an equinox Śrīpati nearly collapses onto whole-sign");
const eq = await pg.evaluate(() => {
  const S = window.SPSripati.build(0, 270);
  const w = [];
  for (let h = 1; h <= 12; h++) {
    const lo = S.sandhi[h === 1 ? 12 : h - 1], hi = S.sandhi[h];
    w.push((((hi - lo) % 360) + 360) % 360);
  }
  return { widths: w, sum: w.reduce((a, b) => a + b, 0) };
});
const spread = Math.max(...eq.widths) - Math.min(...eq.widths);
is(spread < 0.001, `house widths are all 30° when the lagna is 0° and the MC 270° (spread ${spread.toFixed(6)}°)`);
is(Math.abs(eq.sum - 360) < 1e-6, `the twelve widths sum to 360° (${eq.sum.toFixed(9)})`);

/* ---- 4. it declines rather than inventing a meridian ------------------- */
head("The frame falls back and says so");
const fb = await pg.evaluate(() => {
  window.__setHouseMode("sripati");
  const f = window.__bhavaFrame(123.456, null);           /* no meridian */
  const g = window.__bhavaFrame(123.456, 33.0);           /* a real one */
  window.__setHouseMode("whole");
  const h = window.__bhavaFrame(123.456, 33.0);           /* mode off */
  return {
    noMC: { mode: f.mode, fellBack: f.fellBack, why: f.why, h: f.houseOfLon(200) },
    withMC: { mode: g.mode, fellBack: g.fellBack },
    off: { mode: h.mode, fellBack: h.fellBack }
  };
});
is(fb.noMC.mode === "whole" && fb.noMC.fellBack === true,
  "with no meridian it returns whole-sign and sets fellBack");
is(typeof fb.noMC.why === "string" && /meridian/i.test(fb.noMC.why),
  `the reason names the missing meridian ("${fb.noMC.why}")`);
is(fb.noMC.h >= 1 && fb.noMC.h <= 12, "the fallback frame still answers houseOfLon");
is(fb.withMC.mode === "sripati" && fb.withMC.fellBack === false,
  "with a meridian it returns a Śrīpati frame and does not claim a fallback");
is(fb.off.mode === "whole" && fb.off.fellBack === false,
  "with the mode off it is whole-sign WITHOUT claiming a fallback — "
  + "the default is a choice, not a failure");

/* ---- 5. lordship comes from the madhya, not the sandhi ----------------- */
head("Under Śrīpati a bhāva's lord is the lord of the rāśi holding its madhya");
const lord = await pg.evaluate(() => {
  window.__setHouseMode("sripati");
  const f = window.__bhavaFrame(123.456, 33.0);
  const out = [];
  for (let h = 1; h <= 12; h++) {
    const mad = f.sripati.madhya[h];
    const lo = f.sripati.sandhi[h === 1 ? 12 : h - 1];
    out.push({ h: h, madhyaSign: Math.floor((((mad % 360) + 360) % 360) / 30) % 12,
               sandhiSign: Math.floor((((lo % 360) + 360) % 360) / 30) % 12,
               frameSign: f.madhyaSignOfHouse(h), lord: f.lordOfHouse(h) });
  }
  window.__setHouseMode("whole");
  return out;
});
const mOK = lord.every((r) => r.frameSign === r.madhyaSign);
is(mOK, "madhyaSignOfHouse returns the madhya's rāśi for all twelve houses");
const lOK = lord.every((r) => r.lord === LORD[r.madhyaSign]);
is(lOK, "lordOfHouse is LORD[madhya's rāśi] for all twelve houses");
const split = lord.filter((r) => r.madhyaSign !== r.sandhiSign).length;
is(split > 0, `at least one bhāva spans two rāśis, so the choice of madhya over sandhi `
  + `is a real decision and not a tie (${split} of 12 differ here)`);

/* ---- 6. the mode is global, not per-call ------------------------------- */
head("The switch is a single piece of state");
const st = await pg.evaluate(() => {
  const a = window.__setHouseMode("sripati");
  const b = window.__houseMode();
  const c = window.__setHouseMode("nonsense");   /* anything not "sripati" */
  const d = window.__houseMode();
  window.__setHouseMode("whole");
  return { a, b, c, d };
});
is(st.a === "sripati" && st.b === "sripati", "setting sripati sticks and reads back");
is(st.c === "whole" && st.d === "whole", "an unknown mode falls to whole-sign rather than throwing");

is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
await br.close();

console.log(`\n${pass} passed, ${fail} failed`);
/* ---- the acceptance test for this harness ------------------------------
   Plant, in engine.js's wholeFrame:
       return ((... % 12 - LS) % 12 + 12) % 12 + 2;    // was + 1
   Section 1 must fail for every case. engine-verify, reference-verify and
   bhava-verify all still pass with that plant in place, which is why this
   file exists. */
process.exit(fail ? 1 : 0);
