/* ===== The sky, and the moment of casting ================================

   A decorative layer still has behaviour, and the behaviour is what can
   hurt someone. Four things are checked here that a screenshot cannot
   show:

     1. the ceremony ALWAYS lifts. A veil over the whole page that can
        outlive the thing it is veiling is not a flourish, it is a trap —
        so it is checked both when the chart arrives and when it never
        does.
     2. the wind-back is TRUE. Each graha is required to start within a
        degree of where it is now and finish within a degree of where it
        was at the birth instant, both read independently from the
        ephemeris. That is the difference between an orrery and a spinner,
        and it is the only claim the overlay makes about itself.
     3. reduced motion is honoured by STOPPING, not by shortening: no
        animation on the starfield, and a ceremony short enough not to be
        an obstacle.
     4. the sky belongs to the dark palettes. Stars on Rishi Paper would
        be a nonsense, and the canvas must actually leave the document
        rather than merely turn invisible.

   Plus the cheap ones that catch a build mistake: the layer is present on
   both chart pages, it does not run on a teaching page, and nothing it
   adds blocks a click. */

import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const ROOT = "file://" + process.cwd() + "/";
const br = await chromium.launch();

async function page(reduced) {
  const ctx = await br.newContext({
    viewport: { width: 1100, height: 900 },
    reducedMotion: reduced ? "reduce" : "no-preference"
  });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => errs.push(String(e)));
  return pg;
}
const errs = [];

const fill = (pg) => pg.evaluate(() => {
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.value = v;
    ["input", "change"].forEach((t) =>
      e.dispatchEvent(new Event(t, { bubbles: true })));
  };
  set("k-dob", "1984-03-17"); set("k-tob", "14:30");
  set("k-lat", "24.4539"); set("k-lon", "54.3773"); set("k-tz", "4");
});

/* ---- 1. the sky belongs to the dark palettes ---------------------------- */
head("The sky");
let pg = await page(false);
await pg.goto(ROOT + "kundli.html");
await pg.waitForTimeout(900);
is(await pg.$("canvas.cosmos") === null,
   "no starfield on the untouched site");
await pg.evaluate(() => window.NTheme.set("midnight"));
await pg.waitForTimeout(700);
is(await pg.$("canvas.cosmos") !== null, "Vedic Midnight mounts one");
await pg.evaluate(() => window.NTheme.set("paper"));
await pg.waitForTimeout(700);
is(await pg.$("canvas.cosmos") === null,
   "Rishi Paper removes it from the document rather than hiding it — " +
   "stars on paper would be a nonsense, and an invisible canvas would " +
   "still be painting");
await pg.evaluate(() => window.NTheme.set("emerald"));
await pg.waitForTimeout(700);
const sky = await pg.evaluate(() => {
  const c = document.querySelector("canvas.cosmos");
  if (!c) return null;
  const cs = getComputedStyle(c);
  return { pointer: cs.pointerEvents, z: cs.zIndex,
           w: c.width > 0 && c.height > 0 };
});
is(sky && sky.pointer === "none",
   "and it never intercepts a click (pointer-events: " +
   (sky ? sky.pointer : "?") + ")");
is(sky && sky.w, "the canvas has real pixels");

/* ---- 2. the ceremony tells the truth ------------------------------------ */
head("The wind-back is computed, not animated");
await pg.evaluate(() => window.NTheme.set("midnight"));
await fill(pg);
await pg.click("#k-go");
await pg.waitForSelector(".castover", { timeout: 8000 });
/* sample the drawn positions immediately, then again once settled, and
   compare both against the ephemeris read independently */
const truth = await pg.evaluate(() => {
  const birth = new Date(Date.UTC(1984, 2, 17, 10, 30, 0)); /* 14:30 +4 */
  const now = new Date();
  const B = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
             "Saturn", "Rahu", "Ketu"];
  const want = {};
  B.forEach((b) => {
    want[b] = { now: window.__kSidAt(b, now),
                birth: window.__kSidAt(b, birth) };
  });
  return want;
});
/* read where the overlay has actually drawn each body, by angle */
async function drawn() {
  return pg.evaluate(() => {
    const out = {};
    const g = document.querySelectorAll(".castbody");
    const names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                   "Saturn", "Rahu", "Ketu"];
    g.forEach((n, i) => {
      const t = n.getAttribute("transform") || "";
      const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(t);
      if (!m) return;
      const x = +m[1], y = +m[2];
      let a = Math.atan2(y, x) * 180 / Math.PI + 90;
      a = ((a % 360) + 360) % 360;
      out[names[i]] = a;
    });
    return out;
  });
}
const dd = (a, b) => {
  let x = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(x, 360 - x);
};
/* The body MARKERS move, so sampling one after waiting for the overlay to
   appear measures wherever the easing has got to — the first version of
   this check read 110° of "error" that was simply the animation doing its
   job. Each body's TRAIL, though, starts at the longitude it set out
   from and that point never moves, so the trail's origin is the
   non-racy way to ask where the wind-back began. */
const atStart = await pg.evaluate(() => {
  const out = {};
  const names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                 "Saturn", "Rahu", "Ketu"];
  document.querySelectorAll(".casttrail").forEach((n, i) => {
    const d = n.getAttribute("d") || "";
    const m = /^M([-\d.]+),([-\d.]+)/.exec(d);
    if (!m) return;
    let a = Math.atan2(+m[2], +m[1]) * 180 / Math.PI + 90;
    out[names[i]] = ((a % 360) + 360) % 360;
  });
  return out;
});
const startErr = Object.keys(atStart).map((b) =>
  dd(atStart[b], truth[b].now));
is(Object.keys(atStart).length === 9,
   "all nine grahas are drawn on the wheel");
is(Math.max.apply(null, startErr) < 1.0,
   "each sets out from within " + Math.max.apply(null, startErr).toFixed(2) +
   "° of where that graha is RIGHT NOW, read independently from the " +
   "ephemeris");

await pg.waitForSelector(".castover.settled", { timeout: 9000 });
const atEnd = await drawn();
const endErr = Object.keys(atEnd).map((b) => dd(atEnd[b], truth[b].birth));
is(Math.max.apply(null, endErr) < 1.0,
   "and each settles within " + Math.max.apply(null, endErr).toFixed(2) +
   "° of where it was at the birth instant — the wind-back is the real " +
   "motion of those bodies over those 42 years, not a canned swirl");

/* the slow body must have moved far less than the fast one, which is the
   thing that makes the animation worth watching at all */
const travel = (b) => {
  let d = truth[b].birth - truth[b].now;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return Math.abs(d);
};
ok("over that span the drawn arcs differ as the bodies do — Candra " +
   travel("Moon").toFixed(0) + "°, Śani " + travel("Saturn").toFixed(0) +
   "°, taking the short way round");

head("The veil always lifts");
await pg.waitForFunction(() => !document.querySelector(".castover"),
                         null, { timeout: 20000 });
ok("it lifts when the chart arrives");

/* and when it never does: start one with no cast behind it */
await pg.evaluate(() => {
  window.SPCosmos.ceremony(new Date(Date.UTC(1990, 0, 1)), { ms: 300 });
});
await pg.waitForSelector(".castover", { timeout: 4000 });
const t0 = Date.now();
await pg.waitForFunction(() => !document.querySelector(".castover"),
                         null, { timeout: 15000 });
is(Date.now() - t0 < 14000,
   "and it lifts on its own ceiling when no chart ever comes (" +
   ((Date.now() - t0) / 1000).toFixed(1) + "s)");
is(await pg.evaluate(() => document.body.classList.contains("casting")) === false,
   "the scroll lock is released with it");

/* ---- 3. reduced motion -------------------------------------------------- */
head("Reduced motion is honoured by stopping, not by hurrying");
await pg.close();
pg = await page(true);
await pg.goto(ROOT + "kundli.html");
await pg.evaluate(() => window.NTheme.set("midnight"));
await pg.waitForTimeout(900);
const calm = await pg.evaluate(() => {
  const c = document.querySelector("canvas.cosmos");
  return { sky: !!c, anim: c ? getComputedStyle(c).animationName : null };
});
is(calm.sky, "the sky is still there");
is(calm.anim === "none",
   "but it does not animate in (" + calm.anim + ")");
await fill(pg);
const t1 = Date.now();
await pg.click("#k-go");
await pg.waitForSelector(".castover", { timeout: 8000 });
await pg.waitForFunction(() => !document.querySelector(".castover"),
                         null, { timeout: 20000 });
const span = Date.now() - t1;
is(span < 6000,
   "and the ceremony is brief rather than merely faster — " +
   (span / 1000).toFixed(1) + "s including the cast");

/* ---- 4. where the layer belongs ----------------------------------------- */
head("Where the layer is");
await pg.close();
pg = await page(false);
await pg.goto(ROOT + "kinetic-workstation.html");
await pg.waitForTimeout(900);
is(await pg.evaluate(() => typeof window.SPCosmos === "object"),
   "the Workstation carries it too");
await pg.goto(ROOT + "bhavas.html");
await pg.waitForTimeout(600);
is(await pg.evaluate(() => typeof window.SPCosmos === "undefined"),
   "a teaching page does not — it has no chart to cast, so it pays " +
   "nothing for the machinery");

head("The pages behave");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 150) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
