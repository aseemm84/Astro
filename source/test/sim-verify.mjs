/* Does the simulator actually simulate?
 *
 *   node source/test/sim-verify.mjs
 *
 * A counterfactual engine is the easiest thing in this whole codebase to
 * fake. Nobody can check "what if the Moon stopped" against an observation,
 * so a page that simply ASSERTS an outcome and draws a tidy animation of it
 * is indistinguishable, from the outside, from one that integrates. The only
 * defence is to check the cases where an answer does exist:
 *
 *   the untouched run must reproduce the real Moon — its month, its distance,
 *     its inclination — because a model that cannot reproduce the world it
 *     starts from has no standing to describe a world it invents;
 *
 *   a stopped Moon must take the free-fall time that two-body mechanics says
 *     it takes, computed from the separation THIS run actually started at,
 *     not from a textbook mean;
 *
 *   a circular orbit at any radius must obey Kepler's third law;
 *
 *   a retrograde Moon must give the synodic month that 1/(1/P + 1/Y)
 *     predicts, which is arithmetic the integrator knows nothing about;
 *
 *   energy and angular momentum must hold, because a symplectic integrator
 *     that is drifting is an integrator with a bug;
 *
 *   and a change too small to resolve must be REFUSED rather than drawn.
 *
 * The last one is the one that matters most. An inch is below the noise of
 * any n-body integration; a page that animates it confidently is lying, and
 * this file fails if it does.
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createRequire } from "node:module";

/* the same two-step the other harnesses use: ESM resolution first, then a
   CommonJS require, which is the one that honours NODE_PATH */
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (c, m, extra) => {
  if (c) { pass++; console.log("  ok   " + m); }
  else { fail++; console.log("  FAIL " + m + (extra ? "   " + extra : "")); }
};
const near = (a, b, tol, m) =>
  ok(Math.abs(a - b) <= tol, m, "got " + a + " want " + b + " ±" + tol);

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
pg.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
pg.on("pageerror", e => errs.push("PAGEERROR " + e.message));
await pg.goto("file://" + ROOT + "/simulation.html");
await pg.waitForFunction(() => window.__sim && window.__sim.current(),
  null, { timeout: 30000 });

/* ---- 1. the world as it is ---------------------------------------------- */
console.log("\nThe untouched run reproduces the real Moon");
{
  const r = await pg.evaluate(() => {
    const S = window.SimEngine;
    const w = S.worldAt(Date.parse("2026-01-01"), ["Sun", "Earth", "Moon"]);
    const run = S.run(S.clone(w), 27.32 * 18, { samples: 720 });
    const sid = S.measurePeriod(run, "Moon", "Earth");
    const el = S.elements(run.world, "Moon", "Earth");
    return { sid: sid.periodDays, aliased: sid.aliased,
             syn: S.measureSynodic(run), a: el.a * 1.495978707e8,
             inc: el.inc, drift: run.energyDrift, mom: run.momentumDrift };
  });
  ok(!r.aliased, "the period measurement is not aliased");
  near(r.sid, 27.321661, 0.02, "sidereal month (real 27.321661 d)");
  near(r.syn, 29.530589, 0.05, "synodic month (real 29.530589 d)");
  near(r.a, 384400, 1500, "semi-major axis in km (real 384,400)");
  near(r.inc, 5.145, 0.35, "inclination to the ecliptic (real 5.145°)");
  ok(r.drift < 1e-6, "energy holds to better than a part in a million",
     "drift " + r.drift);
  ok(r.mom < 1e-10, "angular momentum holds", "drift " + r.mom);
}

/* ---- 2. the fall --------------------------------------------------------
   THE REGRESSION THAT MATTERS. A stopped Moon falls straight down, and a
   straight fall is the one case a fixed step cannot survive: near the end
   the Moon covers ten Earth radii in a single stride, steps clean over the
   ground, whips round a point mass and leaves at a speed it never had. The
   run then reports, smoothly and confidently, that the Moon ESCAPED — the
   exact opposite of what happens. So: it must collide, and it must do so at
   the time the two-body free-fall integral gives for the separation this
   particular run began at. */
console.log("\nA stopped Moon falls, and falls on schedule");
{
  const r = await pg.evaluate(() => {
    const Z = window.SimScenarios, out = [];
    for (const d of ["2026-10-19", "2026-11-01", "2026-11-08"]) {
      const c = Z.simulate(Z.byId("stop"), Date.parse(d), {});
      const f = c.result.frames[0].b;
      const E = f.find(x => x.name === "Earth"), M = f.find(x => x.name === "Moon");
      const r0 = Math.hypot(M.x - E.x, M.y - E.y, M.z - E.z) * 1.495978707e8;
      const mu = 3.986004418e5 * (1 + 0.0123000371);
      const x = (6371 + 1737.4) / r0;
      const t = Math.sqrt(r0 ** 3 / (2 * mu)) *
                (Math.acos(Math.sqrt(x)) + Math.sqrt(x * (1 - x))) / 86400;
      const ev = (c.result.events || []).filter(e => e.kind === "collision")[0];
      out.push({ r0, analytic: t, sim: ev ? ev.t : null, head: c.headline });
    }
    return out;
  });
  r.forEach(q => {
    ok(q.sim != null, "it strikes the Earth (started at " +
       Math.round(q.r0).toLocaleString("en") + " km)");
    ok(!/leaves|unbound/i.test(q.head), "it is not reported as escaping",
       q.head);
    if (q.sim != null)
      ok(Math.abs(q.sim - q.analytic) / q.analytic < 0.01,
         "fall time within 1% of the two-body integral " +
         q.analytic.toFixed(3) + " d", "got " + q.sim.toFixed(3));
  });
  ok(r[0].sim !== r[1].sim,
     "the fall time tracks the starting separation rather than a constant");
}

/* ---- 3. Kepler at an absurd radius -------------------------------------- */
console.log("\nKepler's third law holds where nothing is familiar");
{
  const r = await pg.evaluate(() => {
    const Z = window.SimScenarios, S = window.SimEngine;
    const c = Z.simulate(Z.byId("roche"), Date.parse("2026-01-01"), {});
    const m = S.measurePeriod(c.result.measured, "Moon", "Earth");
    const el = S.elements(c.result.measured.world, "Moon", "Earth");
    const mu = 2.959122082855911e-4 * (3.00348959632e-6 + 3.69430335e-8);
    return { measured: m.periodDays, aliased: m.aliased,
             kepler: 2 * Math.PI * Math.sqrt(el.a ** 3 / mu),
             spr: m.samplesPerTurn };
  });
  ok(!r.aliased, "a two-hour orbit is not measured through an eight-hour " +
     "sampling comb", "samples per turn " + r.spr.toFixed(1));
  ok(Math.abs(r.measured - r.kepler) / r.kepler < 0.02,
     "measured period matches a³ᐟ² to 2%",
     r.measured.toFixed(5) + " vs " + r.kepler.toFixed(5));
}

/* ---- 4. a retrograde month --------------------------------------------- */
console.log("\nA backwards Moon gives the arithmetic's synodic month");
{
  const r = await pg.evaluate(() => {
    const Z = window.SimScenarios, S = window.SimEngine;
    const c = Z.simulate(Z.byId("retrograde"), Date.parse("2026-01-01"), {});
    return { syn: c.synodic, sid: c.sidereal };
  });
  const want = 1 / (1 / r.sid + 1 / 365.256);
  ok(Math.abs(r.syn - want) < 0.15,
     "synodic = 1/(1/P + 1/Y) = " + want.toFixed(3) + " d",
     "got " + r.syn.toFixed(3));
  ok(r.syn < r.sid + 1,
     "the backwards month is SHORTER than the sidereal one, not longer");
}

/* ---- 5. the noise floor ------------------------------------------------- */
console.log("\nChanges below the noise are refused, not drawn");
{
  const r = await pg.evaluate(() => {
    const Z = window.SimScenarios, out = {};
    for (const id of ["inch", "metre", "km1000", "pct10"]) {
      const c = Z.simulate(Z.byId(id), Date.parse("2026-01-01"), {});
      out[id] = { resolvable: c.resolvable, change: c.changeDays,
                  noise: c.noiseDays, analytic: !!c.analytic };
    }
    return out;
  });
  ok(r.inch.resolvable === false, "an inch is not resolvable");
  ok(r.inch.analytic, "an inch is answered with arithmetic instead");
  ok(r.metre.resolvable === false, "a metre is not resolvable");
  ok(r.km1000.resolvable === true, "a thousand kilometres IS resolvable");
  ok(r.pct10.resolvable === true, "a tenth of the distance is resolvable");
  ok(r.inch.change < r.inch.noise,
     "the claimed change really is smaller than the model's own error");
}

/* ---- 6. every scenario ends in an answer -------------------------------- */
console.log("\nEvery scenario runs and says something");
{
  const r = await pg.evaluate(() => {
    const Z = window.SimScenarios, bad = [];
    const t = Date.parse("2026-06-01");
    Z.SCENARIOS.forEach(s => {
      let c = null;
      try { c = Z.simulate(s, t, {}); } catch (e) { bad.push(s.id + ": threw " + e.message); return; }
      if (!c) return bad.push(s.id + ": no result");
      if (!c.headline) bad.push(s.id + ": no headline");
      /* "no Moon" has no lunar orbit to tabulate, so the claim is that
         every scenario says SOMETHING — a physical table or a jyotisa one */
      if (!c.rows.length && !c.jyotisha.length) bad.push(s.id + ": says nothing");
      if (!c.result.frames.length) bad.push(s.id + ": no frames");
      if (!isFinite(c.result.energyDrift)) bad.push(s.id + ": energy not finite");
    });
    return { n: Z.SCENARIOS.length, bad, groups: Z.groups().length,
             absent: Z.ABSENT.length };
  });
  ok(r.bad.length === 0, "all " + r.n + " scenarios produce an answer",
     r.bad.slice(0, 4).join(" | "));
  ok(r.groups >= 5, "they are sorted into " + r.groups + " groups");
  ok(r.absent >= 5, "the page states " + r.absent + " things it does not model");
  const rm = await pg.evaluate(() => {
    const c = window.SimScenarios.simulate(
      window.SimScenarios.byId("remove"), Date.parse("2026-06-01"), {});
    return { head: c.headline, jy: c.jyotisha.length,
             says: c.jyotisha.map(r => r[0]).join(" / ") };
  });
  ok(rm.jy >= 4, "removing the Moon still says what is lost: " + rm.says);
}

/* ---- 7. the picture ----------------------------------------------------- */
console.log("\nThe animation is of the run, and it moves");
{
  const r = await pg.evaluate(async () => {
    window.__sim.choose("half");
    await new Promise(r => setTimeout(r, 900));
    const cv = document.getElementById("sim-canvas");
    const hashes = [], lit = [];
    for (const p of [0, 0.2, 0.4, 0.6, 0.8]) {
      window.__sim.at(p);
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      let h = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 40 || d[i + 1] > 40 || d[i + 2] > 60) n++;
        h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0;
      }
      hashes.push(h); lit.push(n);
    }
    const dc = document.getElementById("sim-discs");
    const dd = dc.getContext("2d").getImageData(0, 0, dc.width, dc.height).data;
    let dn = 0; for (let i = 0; i < dd.length; i += 4) if (dd[i] > 60) dn++;
    return { distinct: new Set(hashes).size, lit, discs: dn };
  });
  ok(r.distinct === 5, "five playheads give five different frames",
     "distinct " + r.distinct);
  ok(Math.min(...r.lit) > 2000, "every frame has something on it",
     "least " + Math.min(...r.lit));
  ok(r.discs > 5000, "the disc comparison draws", "lit " + r.discs);
}

/* ---- 8. the page on a phone --------------------------------------------- */
console.log("\nThe page behaves");
{
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => {
    const W = document.documentElement.clientWidth, wide = [];
    document.querySelectorAll("*").forEach(e => {
      if (e.getBoundingClientRect().right > W + 1)
        wide.push(e.tagName + "." + (e.className || "").toString().slice(0, 24));
    });
    const small = [];
    document.querySelectorAll("button,input,select").forEach(e => {
      const b = e.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && b.height < 32) small.push(e.id || e.className);
    });
    return { wide: wide.slice(0, 5), small };
  });
  ok(r.wide.length === 0, "nothing hangs off the right edge", r.wide.join(" | "));
  ok(r.small.length === 0, "every control is at least 32px tall",
     r.small.join(" | "));
  ok(errs.length === 0, "no console errors", errs.slice(0, 3).join(" | "));
}

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
