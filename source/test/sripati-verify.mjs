/* ===== Śrīpati bhāva-chalita, checked against its own geometry ===========

   A house system can be verified without an external table, because its
   defining properties are checkable statements about itself:

     * the four angles ARE houses 1, 4, 7 and 10 — the lagna is the first
       madhya and the meridian the tenth, exactly, not approximately;
     * opposite madhyas are 180° apart, which is what trisecting opposite
       quadrants from the same two angles guarantees and what dividing all
       four independently would break;
     * the twelve house widths sum to 360° with nothing lost or doubled;
     * every sandhi is the midpoint of the two madhyas it separates;
     * a graha's house read from the sandhis is the same house read from
       nearest-madhya, since those are two statements of one rule.

   Then the behaviour: at the equator at an equinox the quadrants are equal
   and Śrīpati must collapse onto 30° houses — a degenerate case the
   construction has to get right, and one where an arithmetic slip shows up
   as houses of 29.9 and 30.1. And at a high latitude the spread must be
   large, because that is the entire reason to use the method.

   Finally the one thing a chalita pane exists to say: that it disagrees
   with whole-sign, where, and by how little. */

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
await pg.waitForFunction(() => window.SPSripati, null, { timeout: 40000 });

/* ---- 1. the geometry, over many ascendant/meridian pairs ---------------- */
head("The construction's own properties");
const geo = await pg.evaluate(() => {
  const S = window.SPSripati;
  const bad = { angles: [], opp: [], sum: [], mid: [], agree: [] };
  let n = 0, ties = 0;
  for (let asc = 0; asc < 360; asc += 7) {
    for (let off = 60; off <= 120; off += 5) {
      const mc = (asc - off + 360) % 360;      /* MC precedes the lagna */
      const B = S.build(asc, mc);
      n++;
      const d = (a, b) => {
        let x = Math.abs(((a - b) % 360 + 360) % 360);
        return Math.min(x, 360 - x);
      };
      if (d(B.madhya[1], asc) > 1e-9 || d(B.madhya[10], mc) > 1e-9)
        bad.angles.push(asc + "/" + off);
      for (let h = 1; h <= 6; h++)
        if (Math.abs(d(B.madhya[h], B.madhya[h + 6]) - 180) > 1e-9)
          bad.opp.push(asc + "/" + off + " h" + h);
      let sum = 0;
      for (let h = 1; h <= 12; h++) {
        const lo = B.sandhi[h === 1 ? 12 : h - 1], hi = B.sandhi[h];
        sum += ((hi - lo) % 360 + 360) % 360;
      }
      if (Math.abs(sum - 360) > 1e-7) bad.sum.push(asc + "/" + off + " = " + sum);
      for (let h = 1; h <= 12; h++) {
        const a = B.madhya[h], b = B.madhya[h === 12 ? 1 : h + 1];
        const want = (a + (((b - a) % 360 + 360) % 360) / 2) % 360;
        if (d(B.sandhi[h], want) > 1e-9) bad.mid.push(asc + "/" + off + " s" + h);
      }
      /* Nearest-madhya must agree with between-the-sandhis — EXCEPT at a
         sandhi itself, where the point is by construction equidistant from
         the two madhyas either side and "nearest" has no answer. Those are
         counted rather than failed: the convention that a house owns its
         opening sandhi is a choice, and a tie is not a disagreement. The
         first run of this harness reported 202 failures that were all
         exactly this, and no real disagreements at all. */
      for (let t = 0; t < 360; t += 11) {
        const byS = B.houseOf(t);
        let best = 1, bd = 999, second = 999;
        for (let h = 1; h <= 12; h++) {
          const x = d(t, B.madhya[h]);
          if (x < bd) { second = bd; bd = x; best = h; }
          else if (x < second) second = x;
        }
        if (byS === best) continue;
        if (Math.abs(second - bd) < 1e-6) { ties++; continue; }
        bad.agree.push(asc + "/" + off + " @" + t +
          " sandhi=" + byS + " nearest=" + best);
      }
    }
  }
  return { n, ties, bad: Object.keys(bad).reduce((o, k) => {
    o[k] = { n: bad[k].length, e: bad[k][0] }; return o; }, {}) };
});
is(geo.bad.angles.n === 0, geo.n + " ascendant/meridian pairs: the lagna is " +
   "exactly the 1st madhya and the meridian exactly the 10th");
is(geo.bad.opp.n === 0, "opposite madhyas are exactly 180° apart" +
   (geo.bad.opp.n ? " — " + geo.bad.opp.n + " are not, e.g. " + geo.bad.opp.e : ""));
is(geo.bad.sum.n === 0, "the twelve house widths sum to exactly 360°" +
   (geo.bad.sum.n ? " — e.g. " + geo.bad.sum.e : ""));
is(geo.bad.mid.n === 0, "every sandhi is the midpoint of its two madhyas");
is(geo.bad.agree.n === 0, "a longitude's house read from the sandhis is the " +
   "house whose madhya it is nearest — the two statements of the rule agree " +
   "everywhere except on the junctions themselves, where the point is " +
   "equidistant from both madhyas and the opening house takes it (" +
   geo.ties + " such ties)" +
   (geo.bad.agree.n ? " — but " + geo.bad.agree.n + " genuinely disagree, " +
    "e.g. " + geo.bad.agree.e : ""));

/* ---- 2. the degenerate case -------------------------------------------- */
head("Where it must collapse onto equal houses");
const deg = await pg.evaluate(() => {
  const S = window.SPSripati;
  /* equal quadrants: MC exactly 90° before the lagna */
  const B = S.build(100, 10);
  const w = [];
  for (let h = 1; h <= 12; h++) {
    const lo = B.sandhi[h === 1 ? 12 : h - 1], hi = B.sandhi[h];
    w.push(((hi - lo) % 360 + 360) % 360);
  }
  return { min: Math.min.apply(null, w), max: Math.max.apply(null, w) };
});
is(Math.abs(deg.min - 30) < 1e-9 && Math.abs(deg.max - 30) < 1e-9,
   "with equal quadrants every house is exactly 30.000000° — measured " +
   deg.min.toFixed(6) + " to " + deg.max.toFixed(6));

const ext = await pg.evaluate(() => {
  const S = window.SPSripati;
  const B = S.build(100, 40);        /* a 60° quadrant: a high latitude */
  const w = [];
  for (let h = 1; h <= 12; h++) {
    const lo = B.sandhi[h === 1 ? 12 : h - 1], hi = B.sandhi[h];
    w.push(((hi - lo) % 360 + 360) % 360);
  }
  return { min: Math.min.apply(null, w), max: Math.max.apply(null, w) };
});
is(ext.max - ext.min > 15, "with a 60° quadrant the houses spread from " +
   ext.min.toFixed(1) + "° to " + ext.max.toFixed(1) + "°, which is the " +
   "whole reason the method exists");

/* ---- 3. the 15° cusp rule ----------------------------------------------- */
head("The effect-by-distance rule the edition states");
const cusp = await pg.evaluate(() => {
  const B = window.SPSripati.build(100, 10);
  const mad = B.madhya[1];
  const at = (d) => B.cuspStrength((mad + d + 360) % 360);
  /* Past the sandhi a graha is in the NEXT house, where it sits just
     inside that house's opening junction — so its weight there is near
     zero, not zero, and that is correct rather than a bug. The first run
     of this harness asserted "beyond the sandhi reads nothing" and was
     measuring the next house's near-zero. What must be checked instead is
     that the weight falls monotonically from madhya to junction and
     reaches exactly zero at it. */
  const walk = [];
  for (let d = 0; d <= 15; d += 0.25) walk.push(at(d).frac);
  let mono = true;
  for (let i = 1; i < walk.length; i++) if (walk[i] > walk[i - 1] + 1e-12) mono = false;
  return { on: at(0).frac, plus7: at(7.5).frac, minus7: at(-7.5).frac,
           edge: at(15).frac, mono,
           nextHouse: at(15.0001).house !== at(0).house,
           nextWeight: at(15.0001).frac };
});
is(Math.abs(cusp.on - 1) < 1e-9, "a graha on the madhya reads full effect");
is(Math.abs(cusp.plus7 - 0.5) < 1e-6 && Math.abs(cusp.minus7 - 0.5) < 1e-6,
   "half-way to the sandhi reads half, equally on both sides");
is(cusp.edge < 1e-9,
   "at the sandhi it reads exactly nothing for that bhāva, as the edition " +
   "states");
is(cusp.mono, "and the weight falls without a step from the madhya to the " +
   "junction");
is(cusp.nextHouse && cusp.nextWeight < 1e-4,
   "a hair past the junction the graha belongs to the NEXT bhāva, where it " +
   "sits at its opening junction and reads near nothing for that one too");

/* ---- 4. a real chart ---------------------------------------------------- */
head("A chart cast through the page");
const set = (id, v) => pg.evaluate(([i, x]) => {
  const e = document.getElementById(i);
  if (!e) return false;
  e.value = x;
  ["input", "change"].forEach((t) => e.dispatchEvent(new Event(t, { bubbles: true })));
  return true;
}, [id, v]);
await set("k-dob", "1984-03-17");
await set("k-tob", "14:30");
await set("k-lat", "24.4539");
await set("k-lon", "54.3773");
await set("k-tz", "4");
await pg.click("#k-go");
await pg.waitForFunction(() => window.__kApi && window.__kApi.chart &&
                               window.__kApi.chart(), null, { timeout: 40000 });
const real = await pg.evaluate(() => {
  const D = window.__kApi.chart();
  const A = window.SPSripati.analyse(D);
  /* every graha must land in exactly one house under each system */
  const okHouses = A.rows.every((r) => r.sripati >= 1 && r.sripati <= 12 &&
                                       r.whole >= 1 && r.whole <= 12);
  /* the occupant lists must account for every graha exactly once */
  const counted = A.houses.reduce((n, h) => n + h.occupants.length, 0);
  return { okHouses, counted, planets: A.rows.length,
           shifts: A.shifts.length,
           quad: A.quadrants.map((q) => +q.toFixed(2)),
           widths: [+A.narrowest.toFixed(2), +A.widest.toFixed(2)],
           tab: !!document.querySelector("[data-ktab=sripati]") };
});
is(real.okHouses, "every graha lands in a real bhāva under both systems");
is(real.counted === real.planets,
   "the twelve occupant lists account for all " + real.planets +
   " grahas exactly once");
is(real.quad[0] + real.quad[1] + real.quad[2] + real.quad[3] > 359.99,
   "the four quadrants sum to the circle: " + real.quad.join(" + "));
is(real.tab, "the Śrīpati pane has its own tab in the report");
ok("this chart: houses " + real.widths[0] + "° to " + real.widths[1] +
   "°, " + real.shifts + " graha" + (real.shifts === 1 ? "" : "s") +
   " placed differently from whole-sign");

await pg.click("[data-ktab=sripati]");
await pg.waitForTimeout(700);
const paneTxt = await pg.textContent("#kp-sripati");
is(/does not give this construction as a Parāśara verse/.test(paneTxt),
   "the pane says plainly that the construction is not a BPHS verse");
is(/Benares|Chaukhambha/.test(paneTxt),
   "and attributes the 15° doctrine to the edition that carries it");

head("The page behaves");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
