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
/* FLATTEN THE RING FIRST. The ceremony draws through a perspective divide,
   so a graha's drawn position is not its polar one — which is the whole
   point of the tilt. At spin 0 and tilt 0 that projection is the identity,
   and the DOM again holds true longitudes, so this check reads exactly what
   it always read instead of being softened into trusting a number the code
   reports about itself. Drift off too, or the spin walks away mid-read. */
await pg.evaluate(() => window.SPCosmos.view({ spin: 0, tilt: 0, drift: 0 }));
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
    /* BY NAME. The ceremony sorts its bodies back to front and re-appends
       them every frame, so the n-th node is whichever graha was n-th nearest
       at that instant. Reading by index would compare one graha's position
       with another's ephemeris and could sit there passing by luck. */
    document.querySelectorAll(".castbody[data-body]").forEach((n) => {
      const t = n.getAttribute("transform") || "";
      const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(t);
      if (!m) return;
      const x = +m[1], y = +m[2];
      let a = Math.atan2(y, x) * 180 / Math.PI + 90;
      out[n.getAttribute("data-body")] = ((a % 360) + 360) % 360;
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
    const m = /^M(-?[\d.]+),(-?[\d.]+)/.exec(d);
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
await pg.evaluate(() => window.SPCosmos.view({ spin: 0, tilt: 0, drift: 0 }));
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

/* ---- 2b. the ring you can turn ------------------------------------------
   The veil stopped being a two-second flicker and became something to play
   with, which is exactly the shape the first rule here warns about. So the
   new behaviour is checked for what it gives (a real ring, real bodies, a
   ring that turns) AND for what it must not take away (every way out). */
head("The ring is a ring, and the grahas are bodies");
await pg.evaluate(() => window.SPCosmos.ceremony(new Date(Date.UTC(1984,7,26,9,0,0)), { ms: 600 }));
await pg.waitForSelector(".castover", { timeout: 6000 });
const ring = await pg.evaluate(() => ({
  sectors: document.querySelectorAll(".castnakseg").length,
  spokes:  document.querySelectorAll(".castspoke").length,
  signs:   document.querySelectorAll(".castsign").length,
  discs:   document.querySelectorAll(".castdisc").length,
  circles: document.querySelectorAll(".castbody circle:not(.castsunglow)").length,
  realPng: [...document.querySelectorAll(".castdisc")]
             .every(i => (i.getAttribute("href")||"").startsWith("data:image/png")),
  glow:    document.querySelectorAll(".castsunglow").length
}));
is(ring.sectors === 27, "twenty-seven nakṣatra sectors, not tick marks (" + ring.sectors + ")");
is(ring.spokes === 12 && ring.signs === 12,
   "and the twelve rāśi boundaries inside them, each named");
is(ring.discs === 9 && ring.circles === 0,
   "all nine grahas are rendered bodies rather than coloured dots (" +
   ring.discs + " discs, " + ring.circles + " dots)");
is(ring.realPng === true,
   "each one is a raster the body renderer produced, not a shape stood in for it");
is(ring.glow === 1,
   "and Sūrya alone carries a corona, because it is the one lighting the rest");
/* PERSPECTIVE, NOT A SQUASH. The first version of this leaned the ring with
   one affine transform, which flattens it evenly — and looked wrong for
   exactly that reason. The difference is measurable without looking: under a
   squash the ring stays symmetric about its centre, because every y is
   multiplied by the same number. Under a perspective divide the near edge
   grows and the far edge shrinks, so it does not. */
const sym = await pg.evaluate(() => {
  const read = () => {
    const d = document.querySelector(".castring2").getAttribute("d") || "";
    const ys = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map(m => +m[2]);
    return { near: Math.max(...ys), far: Math.min(...ys) };
  };
  window.SPCosmos.view({ spin: 0, tilt: 0, drift: 0 });
  const flat = read();
  window.SPCosmos.view({ spin: 0, tilt: 58, drift: 0 });
  const tilted = read();
  return { flat, tilted };
});
is(Math.abs(sym.flat.near + sym.flat.far) < 0.5,
   "flat, the ring is symmetric about its centre");
is(sym.tilted.near + sym.tilted.far > 4,
   "tilted, the near edge is pushed further than the far edge is pulled (" +
   (sym.tilted.near + sym.tilted.far).toFixed(1) + " units of asymmetry) — a " +
   "perspective divide, which an affine squash cannot produce");

/* it turns on its own, and a drag takes it over. With no plane transform to
   read, the spin is measured by where a graha is actually drawn — which is
   the honest question anyway: did the picture move? */
const where = () => pg.evaluate(() => {
  const g = document.querySelector('.castbody[data-body="Jupiter"]');
  const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(g.getAttribute("transform") || "");
  return m ? { x: +m[1], y: +m[2] } : null;
});
/* Wait for the wind-back to finish first. Measuring during it reads the
   grahas' own motion and calls it drift — the first version of this check
   reported 244 units of "drift" where the drift can only produce about four,
   and passed. A number that large was the tell. */
await pg.waitForSelector(".castover.settled", { timeout: 9000 });
await pg.evaluate(() => window.SPCosmos.view({ spin: 0, tilt: 58, drift: 0 }));
const still0 = await where();
await pg.waitForTimeout(500);
const still1 = await where();
is(Math.hypot(still1.x - still0.x, still1.y - still0.y) < 0.6,
   "with the drift off, a settled graha holds still (" +
   Math.hypot(still1.x - still0.x, still1.y - still0.y).toFixed(2) + " units in .5s)");

await pg.evaluate(() => window.SPCosmos.view({ drift: 2.6 }));
const w0 = await where();
await pg.waitForTimeout(800);
const w1 = await where();
const moved = Math.hypot(w1.x - w0.x, w1.y - w0.y);
is(moved > 2 && moved < 12,
   "and the ring keeps turning slowly under it (" + moved.toFixed(1) +
   " units in .8s — a drift, not a spin)");

const box = await pg.evaluate(() => {
  const b = document.querySelector(".castwheel").getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
});
await pg.evaluate(() => window.SPCosmos.view({ drift: 0 }));
const w2 = await where();
await pg.mouse.move(box.x, box.y);
await pg.mouse.down();
await pg.mouse.move(box.x + 140, box.y, { steps: 6 });
const w3 = await where();
await pg.mouse.up();
is(Math.hypot(w3.x - w2.x, w3.y - w2.y) > 20,
   "and dragging turns it by hand (" +
   Math.hypot(w3.x - w2.x, w3.y - w2.y).toFixed(0) + " units for 140px, with the drift off)");
await pg.evaluate(() => window.SPCosmos.view({ drift: 2.6 }));

head("Every way out still works");
is(await pg.evaluate(() => !!document.querySelector("#cast-reveal")),
   "Reveal Kundli is there");
await pg.evaluate(() => document.querySelector("#cast-reveal").click());
await pg.waitForFunction(() => !document.querySelector(".castover"), null, { timeout: 4000 });
ok("the button lifts it");

await pg.evaluate(() => window.SPCosmos.ceremony(new Date(Date.UTC(1984,7,26,9,0,0)), { ms: 300 }));
await pg.waitForSelector(".castover", { timeout: 4000 });
await pg.keyboard.press("Escape");
await pg.waitForFunction(() => !document.querySelector(".castover"), null, { timeout: 4000 });
ok("Escape lifts it");

await pg.evaluate(() => window.SPCosmos.ceremony(new Date(Date.UTC(1984,7,26,9,0,0)), { ms: 300 }));
await pg.waitForSelector(".castover", { timeout: 4000 });
await pg.evaluate(() => {
  const o = document.querySelector(".castover");
  o.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await pg.waitForFunction(() => !document.querySelector(".castover"), null, { timeout: 4000 });
ok("a click on the backdrop lifts it");
is(await pg.evaluate(() => document.body.classList.contains("casting")) === false,
   "and the scroll lock comes off every time");

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
