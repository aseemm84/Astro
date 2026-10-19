/* Do the reels show what they say they show?
 *
 *   node source/test/reel-verify.mjs
 *
 * A reel is the most persuasive object this site can make and therefore the
 * most dangerous one. A figure that is merely decorative looks exactly like a
 * figure that is a consequence; a count that was capped looks exactly like a
 * count that was complete; a caption placed for rhythm looks exactly like a
 * caption placed by an event. Nothing about the finished frame distinguishes
 * them, which is precisely why they have to be checked here.
 *
 * What this file insists on:
 *
 *   THE ECLIPSES ARE THE ECLIPSES. Every syzygy the reel marks is matched
 *     against the vendored ephemeris's own eclipse search — a completely
 *     separate code path — and the two must agree on which dates and on
 *     total-versus-partial, with no misses and no inventions.
 *
 *   THE COUNTS ARE THE PERIODS. The number of meetings a thread draws, the
 *     number of loops a vakrī reel shows, the interval between one hiding
 *     and the next: each is predicted from the two orbital periods by
 *     arithmetic the rendering knows nothing about, and must come out.
 *
 *   THE SPAN IS THE SPAN. A reel that says "800 years" must have events
 *     covering 800 years. This is a regression: the finder's cap used to
 *     bite silently and the closing card went on naming the span that had
 *     been asked for.
 *
 *   THE CLOCK NEVER GOES BACKWARDS, and a hold costs time rather than
 *     skipping it — so a viewer timing the year counter against the dates
 *     finds them consistent.
 *
 *   THE SAME PLAYHEAD GIVES THE SAME PIXELS, because a recorder re-renders
 *     frames and a reel that is subtly different on every pass cannot be
 *     recorded deterministically.
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createRequire } from "node:module";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (c, m, extra) => {
  if (c) { pass++; console.log("  ok   " + m); }
  else { fail++; console.log("  FAIL " + m + (extra ? "   " + extra : "")); }
};

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1300, height: 1000 } });
const errs = [];
pg.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
pg.on("pageerror", e => errs.push("PAGEERROR " + e.message));
await pg.goto("file://" + ROOT + "/reel.html");
await pg.waitForFunction(() => window.__reel, null, { timeout: 40000 });

const choose = async (k, opt) => {
  await pg.evaluate(([x, o]) => window.__reel.choose(x, o), [k, opt || null]);
  await pg.waitForFunction(() => window.__reel.ready(), null, { timeout: 120000 });
};

/* ---- 1. the eclipses, against the library's own search ------------------- */
console.log("\nThe marked syzygies are the eclipses");
for (const which of ["eclipse.new", "eclipse.full"]) {
  const r = await pg.evaluate((w) => {
    const t0 = Date.parse("2026-01-01"), t1 = t0 + 20 * 365.2564 * 86400000;
    const full = w === "eclipse.full";
    const truth = [];
    let e = full ? Astronomy.SearchLunarEclipse(new Date(t0))
                 : Astronomy.SearchGlobalSolarEclipse(new Date(t0));
    for (let g = 0; g < 500 && e && e.peak.date.getTime() < t1; g++) {
      truth.push({ t: e.peak.date.getTime(), kind: e.kind });
      e = full ? Astronomy.NextLunarEclipse(e.peak)
               : Astronomy.NextGlobalSolarEclipse(e.peak);
    }
    const R = window.SPStories.build(w, { t0, years: 20 });
    const mine = R.events.filter(x => x.marked);
    const near = (a, b) => Math.abs(a - b) < 1.2 * 86400000;
    const miss = truth.filter(q => !mine.some(x => near(x.t, q.t)));
    const extra = mine.filter(x => !truth.some(q => near(x.t, q.t)));
    let kindBad = 0;
    truth.forEach(q => {
      const m = mine.find(x => near(x.t, q.t));
      if (!m) return;
      const libCentral = full ? q.kind !== "penumbral" : q.kind !== "partial";
      if (libCentral !== (m.band === "central")) kindBad++;
    });
    return { truth: truth.length, mine: mine.length,
             miss: miss.length, extra: extra.length, kindBad,
             close: R.closing.big };
  }, which);
  ok(r.truth > 30, which + ": the library reports " + r.truth +
     " eclipses in 20 years");
  ok(r.miss === 0, which + ": the reel misses none of them", "missed " + r.miss);
  ok(r.extra === 0, which + ": the reel invents none", "invented " + r.extra);
  ok(r.kindBad === 0, which + ": central vs partial agrees on every one",
     r.kindBad + " disagreed");
  ok(r.mine === r.truth, which + ": " + r.close);
}

/* ---- 2. the counts are the periods --------------------------------------- */
console.log("\nThe figures count what the periods predict");
{
  const P = { Mercury: 0.2408467, Venus: 0.6151973, Earth: 1.0000174,
              Mars: 1.8808476, Jupiter: 11.862615, Saturn: 29.447498 };
  const syn = (a, b) => 1 / Math.abs(1 / P[a] - 1 / P[b]);
  const cases = [
    ["thread.earth-jupiter", "Earth", "Jupiter"],
    ["thread.earth-venus", "Earth", "Venus"],
    ["thread.earth-saturn", "Earth", "Saturn"],
    ["thread.venus-jupiter", "Venus", "Jupiter"]
  ];
  for (const [key, a, b] of cases) {
    const r = await pg.evaluate(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      const ev = R.events;
      return { n: ev.length, years: R.years,
               gap: ev.length > 1
                 ? (ev[ev.length - 1].t - ev[0].t) / (ev.length - 1) / 86400000
                 : 0 };
    }, key);
    const want = syn(a, b) * 365.2564;
    ok(Math.abs(r.gap - want) / want < 0.03,
       key + ": meetings " + r.gap.toFixed(1) + " days apart, synodic period " +
       want.toFixed(1), "n=" + r.n);
  }
  const loops = [["vakri.mars", "Earth", "Mars"],
                 ["vakri.jupiter", "Earth", "Jupiter"],
                 ["vakri.venus", "Earth", "Venus"],
                 ["vakri.saturn", "Earth", "Saturn"]];
  for (const [key, a, b] of loops) {
    const r = await pg.evaluate(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      const back = R.events.filter(e => e.tally === "turns back").length;
      const fwd = R.events.filter(e => e.tally === "turns forward").length;
      return { back, fwd, years: R.years };
    }, key);
    const want = r.years / syn(a, b);
    ok(Math.abs(r.back - want) <= 1.2,
       key + ": " + r.back + " retrograde loops in " + r.years +
       " years, expected " + want.toFixed(1));
    ok(Math.abs(r.back - r.fwd) <= 1,
       key + ": it turns forward as often as it turns back",
       r.back + " vs " + r.fwd);
  }
  /* a hiding happens at every conjunction; the inner planets have two a
     synodic period (inferior and superior), the outer ones one */
  const astas = [["asta.venus", "Venus", 2], ["asta.mercury", "Mercury", 2],
                 ["asta.jupiter", "Jupiter", 1], ["asta.saturn", "Saturn", 1],
                 ["asta.mars", "Mars", 1]];
  for (const [key, b, per] of astas) {
    const r = await pg.evaluate(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      const ev = R.events;
      return { n: ev.length, years: R.years,
               gap: (ev[ev.length - 1].t - ev[0].t) / (ev.length - 1) / 86400000 };
    }, key);
    const want = syn("Earth", b) * 365.2564 / per;
    ok(Math.abs(r.gap - want) / want < 0.04,
       key + ": " + r.n + " hidings, one every " + r.gap.toFixed(1) +
       " days, expected " + want.toFixed(1));
  }
}

/* ---- 3. the span is the span --------------------------------------------
   THE REGRESSION. The finder caps how many events it will look for, and when
   the cap bit the reel went on printing the span it had been asked for. */
console.log("\nA reel's stated span is the span its events cover");
{
  const r = await pg.evaluate(() => {
    const out = [];
    window.SPStories.TEMPLATES.forEach(T => {
      const R = window.SPStories.build(T.key, { t0: Date.parse("2026-01-01") });
      if (!R) { out.push({ key: T.key, bad: "did not build" }); return; }
      /* the span of what is DRAWN: the samples for a thread or a track, the
         events for a wheel or a whirl. A thread's meetings stop well before
         its last chord, so measuring a thread off its events understates it. */
      const c0 = R.cover ? R.cover.t0 : R.events[0].t;
      const c1 = R.cover ? R.cover.t1 : R.events[R.events.length - 1].t;
      const covered = (c1 - c0) / 86400000 / 365.2564;
      const clock = (R.tl.t1 - R.tl.t0) / 86400000 / 365.2564;
      const said = (R.closing.big + " " + R.subtitle).match(/(\d+)\s*years?/);
      out.push({ key: T.key, covered, clock, years: R.years,
                 said: said ? +said[1] : null,
                 truncated: R.truncated });
    });
    return out;
  });
  let bad = [];
  r.forEach(q => {
    if (q.bad) return bad.push(q.key + ": " + q.bad);
    /* the clock must not run past the last event by more than one gap */
    if (q.clock > q.covered * 1.08 + 1)
      bad.push(q.key + ": clock " + q.clock.toFixed(1) +
               "y vs events " + q.covered.toFixed(1) + "y");
    if (q.said != null && Math.abs(q.said - q.covered) > Math.max(2, q.covered * 0.04))
      bad.push(q.key + ": says " + q.said + "y, covers " + q.covered.toFixed(1) + "y");
  });
  ok(bad.length === 0, "all " + r.length + " templates cover what they claim",
     bad.slice(0, 4).join(" | "));
}

/* ---- 4. the clock ------------------------------------------------------- */
console.log("\nThe clock is monotonic and holds cost time");
{
  await choose("eclipse.new");
  const r = await pg.evaluate(() => {
    const R = window.__reel.reel(), S = window.SPReel;
    let prev = -Infinity, back = 0, held = 0;
    const N = 1500;
    for (let i = 0; i <= N; i++) {
      const c = S.clockAt(R.tl, i / N);
      if (c.t < prev - 1) back++;
      if (c.phase === "run" && c.held) held++;
      prev = c.t;
    }
    const a = S.clockAt(R.tl, 0), b = S.clockAt(R.tl, 1);
    return { back, held, t0: a.t, t1: b.t,
             wantT0: R.tl.t0, wantT1: R.tl.t1,
             holdSeconds: R.tl.holdSeconds,
             marked: R.events.filter(e => e.hold).length };
  });
  ok(r.back === 0, "the clock never runs backwards", r.back + " reversals");
  ok(r.held > 0, "it does pause at marked events (" + r.held + " sampled frames)");
  ok(Math.abs(r.t0 - r.wantT0) < 86400000, "it starts at the start");
  ok(Math.abs(r.t1 - r.wantT1) < 86400000, "it ends at the end");
  ok(r.holdSeconds > 0.02 && r.holdSeconds < 3,
     "each hold is " + r.holdSeconds.toFixed(2) + " s, not a jump and not a stall");
}

/* ---- 5. captions follow events, not the clock --------------------------- */
console.log("\nCaptions belong to events");
{
  const r = await pg.evaluate(() => {
    const R = window.__reel.reel(), S = window.SPReel;
    /* every caption in the reel must correspond to an event whose time is in
       the span, and every marked event must be reachable by some playhead */
    let unreachable = 0;
    const seen = new Set();
    for (let i = 0; i <= 2000; i++) {
      const c = S.clockAt(R.tl, i / 2000);
      let idx = -1;
      for (let k = 0; k < R.events.length; k++)
        if (R.events[k].t <= c.t) idx = k; else break;
      if (idx >= 0) seen.add(idx);
    }
    R.events.forEach((e, i) => { if (!seen.has(i) && e.marked) unreachable++; });
    const outside = R.events.filter(e => e.t < R.tl.t0 - 86400000 ||
                                         e.t > R.tl.t1 + 86400000).length;
    return { unreachable, outside, n: R.events.length, seen: seen.size };
  });
  ok(r.outside === 0, "no event sits outside the reel's own span");
  ok(r.unreachable === 0, "every marked event is reached by some playhead",
     r.unreachable + " unreachable");
  ok(r.seen > r.n * 0.5, "most events get a frame of their own (" +
     r.seen + " of " + r.n + ")");
}

/* ---- 6. the same playhead gives the same pixels ------------------------- */
console.log("\nRendering is deterministic");
{
  const r = await pg.evaluate(() => {
    const cv = document.getElementById("reel-canvas");
    const c = cv.getContext("2d");
    const R = window.__reel.reel();
    function hash(p) {
      window.SPReel.frameAt(c, 1080, 1920, R, p);
      const d = c.getImageData(0, 0, 1080, 1920).data;
      let h = 0;
      for (let i = 0; i < d.length; i += 97) h = (h * 33 + d[i]) | 0;
      return h;
    }
    const a = hash(0.37);
    hash(0.9); hash(0.1);          /* make it do other work in between */
    const b = hash(0.37);
    return { same: a === b, a, b };
  });
  ok(r.same, "re-rendering a playhead reproduces it exactly",
     r.a + " vs " + r.b);
}

/* ---- 7. every template renders and moves -------------------------------- */
console.log("\nEvery template renders, and the frame changes");
{
  const keys = await pg.evaluate(() => window.__reel.keys());
  const bad = [];
  for (const k of keys) {
    await choose(k);
    const r = await pg.evaluate(() => {
      const cv = document.getElementById("reel-canvas");
      const c = cv.getContext("2d"), hs = [], lit = [];
      for (const p of [0.08, 0.3, 0.55, 0.8, 0.97]) {
        window.__reel.at(p);
        const d = c.getImageData(0, 0, cv.width, cv.height).data;
        let h = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 45 || d[i + 1] > 45) n++;
          h = (h * 31 + d[i] + d[i + 1] * 3) | 0;
        }
        hs.push(h); lit.push(n);
      }
      const R = window.__reel.reel();
      return { distinct: new Set(hs).size, min: Math.min(...lit),
               events: R.events.length, ms: R.buildMs };
    });
    if (r.distinct < 5) bad.push(k + ": only " + r.distinct + " distinct frames");
    if (r.min < 8000) bad.push(k + ": a nearly empty frame (" + r.min + " lit)");
    if (r.events < 3) bad.push(k + ": only " + r.events + " events");
    if (r.ms > 9000) bad.push(k + ": took " + Math.round(r.ms) + " ms to build");
  }
  ok(bad.length === 0, "all " + keys.length + " templates render five " +
     "different, populated frames", bad.slice(0, 4).join(" | "));
}

/* ---- 8. the build race --------------------------------------------------
   REGRESSION. Choosing a second story while the first was still computing
   used to wake the pending build with the NEW key and the OLD template's
   span — a Jupiter thread built over twenty years and subtitled twelve. */
console.log("\nA story chosen mid-build gets its own span");
{
  const r = await pg.evaluate(async () => {
    window.__reel.choose("eclipse.new");          /* 20 years */
    window.__reel.choose("thread.earth-venus");   /* 8 years  */
    for (let i = 0; i < 400 && !window.__reel.ready(); i++)
      await new Promise(r => setTimeout(r, 25));
    const R = window.__reel.reel();
    return { key: R.key, years: R.years, sub: R.subtitle,
             covered: (R.events[R.events.length - 1].t - R.events[0].t)
               / 86400000 / 365.2564 };
  });
  ok(r.key === "thread.earth-venus", "the last story asked for is the one built",
     r.key);
  ok(r.years <= 9, "it has its own span, not the one it interrupted",
     r.years + " years");
  ok(/8 years/.test(r.sub), "and says so", r.sub);
}

/* ---- 9. the page -------------------------------------------------------- */
console.log("\nThe page behaves");
{
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(600);
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
    const cv = document.getElementById("reel-canvas");
    return { wide: wide.slice(0, 5), small,
             exportSize: cv.width + "x" + cv.height };
  });
  ok(r.wide.length === 0, "nothing hangs off the right edge", r.wide.join(" | "));
  ok(r.small.length === 0, "every control is at least 32px tall", r.small.join(" | "));
  ok(r.exportSize === "1080x1920",
     "the preview is the export, pixel for pixel: " + r.exportSize);
  ok(errs.length === 0, "no console errors", errs.slice(0, 3).join(" | "));
}

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
