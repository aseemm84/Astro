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

/* ---- 2b. the arms are the step -----------------------------------------
   The arm count printed on the closing card is a claim about geometry, and
   it is checked here against arithmetic the renderer never sees: the Sun
   moves 0.98565° a day, so the angle between one hiding and the next is that
   times the gap, and the number of arms is the denominator of the fraction
   of a circle it comes to. */
console.log("\nThe arm counts are the step between hidings");
{
  const r = await pg.evaluate(() => {
    const out = [];
    ["asta.venus", "asta.jupiter", "asta.mercury", "asta.saturn", "asta.mars"]
      .forEach(k => {
        const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
        const ev = R.events;
        const gap = (ev[ev.length - 1].t - ev[0].t) / (ev.length - 1) / 86400000;
        let step = 0;
        for (let i = 1; i < ev.length; i++) {
          let d = (ev[i].lon - ev[i - 1].lon) % 360;
          if (d < 0) d += 360;
          step += d;
        }
        step /= (ev.length - 1);
        const m = R.closing.big.match(/(\w+) arms/i);
        out.push({ k, gap, step, says: m ? m[1] : null,
                   line: R.closing.lines[0] });
      });
    return out;
  });
  const WORD = { Two: 2, Three: 3, Four: 4, Five: 5, Six: 6, Seven: 7,
                 Eight: 8, Nine: 9, Ten: 10, Eleven: 11, Twelve: 12 };
  r.forEach(q => {
    /* the Sun's own mean motion, independently */
    const want = (0.9856474 * q.gap) % 360;
    ok(Math.abs(((q.step - want + 540) % 360) - 180) < 1.2,
       q.k + ": the step between hidings is " + q.step.toFixed(1) +
       "°, and the Sun covers " + want.toFixed(1) + "° in " +
       q.gap.toFixed(1) + " days");
    const n = WORD[q.says] != null ? WORD[q.says] : +q.says;
    if (n) {
      const frac = q.step * n / 360;
      ok(Math.abs(frac - Math.round(frac)) * 360 / n < 4.5,
         q.k + ": " + n + " steps make " + frac.toFixed(3) +
         " whole circles, so " + n + " arms is what the figure has");
    } else {
      ok(/do not fall into arms/.test(q.line),
         q.k + ": names no arm count and says why");
    }
  });
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

/* ---- 8b. the mark ------------------------------------------------------
   THE REGRESSION THAT WAS ALREADY THERE. Loading assets/brand/mark.svg into
   an Image and drawing it taints the canvas when the page is opened as a
   local file: Chromium gives every file:// document its own opaque origin,
   so the site's own logo is cross-origin to the site. A tainted canvas
   refuses toDataURL, toBlob, getImageData and captureStream — every way
   this site has of producing a card, a still or a reel. Over http it never
   happens, which is why no harness had ever seen it, and the configuration
   it breaks is the one this site is for: a folder of files on a Mac.

   This file is loaded over file:// precisely so that it would. */
console.log("\nThe mark is on the frame, and does not poison it");
{
  const r = await pg.evaluate(async () => {
    const im = await window.SPReel.markReady();
    if (!im) return { loaded: false };
    const cv = document.getElementById("reel-canvas");
    const c = cv.getContext("2d");
    window.SPReel.frameAt(c, 1080, 1920, window.__reel.reel(), 0.5);
    let exportOk = true, grab = true;
    try { cv.toDataURL("image/png"); } catch (e) { exportOk = false; }
    let lit = 0;
    try {
      /* the foot band: the logo and the handle live here and nothing else
         bright does, so ink in this strip is the lockup */
      const d = c.getImageData(0, Math.round(1920 * 0.915), 1080,
                               Math.round(1920 * 0.075)).data;
      for (let i = 0; i < d.length; i += 4)
        if (d[i] > 55 || d[i + 1] > 45) lit++;
    } catch (e) { grab = false; }
    let streamOk = true;
    try { cv.captureStream(0).getVideoTracks()[0].requestFrame(); }
    catch (e) { streamOk = false; }
    return { loaded: true, exportOk, grab, lit, streamOk,
             src: im.src.slice(0, 11), w: im.width };
  });
  ok(r.loaded, "the mark loads");
  ok(r.src === "data:image/", "it is a data: URI, not a fetched file", r.src);
  ok(r.exportOk, "the canvas can still be exported to PNG after drawing it");
  ok(r.grab, "and read back with getImageData");
  ok(r.streamOk, "and captured as a stream, which is what recording needs");
  ok(r.lit > 900, "the foot band carries the lockup (" + r.lit + " lit px)");
}

/* ---- 8c. the other three engines ---------------------------------------
   The point of these is not variety. Each can only be made by a site that
   has the engine underneath, so each is checked against something outside
   the reel: the Siddhanta's drift against the modern ephemeris it is being
   compared to, its eclipses against the library's eclipse search, and the
   simulated orbits against the integrator's own conservation. */
console.log("\nThe reels from the other engines say true things");
{
  const r = await pg.evaluate(() => {
    const out = {};
    /* 1. the drift really is the gap between the two engines */
    const D = window.SPStories.build("ssdrift.jupiter",
      { t0: Date.parse("2026-01-01"), years: 40 });
    const S = window.SSEngine;
    let worst = 0;
    for (let i = 0; i < D.drift.t.length; i += 7) {
      const t = D.drift.t[i];
      const ss = S.trueLongitude("Guru", S.ahargana(t)).lon;
      const md = window.__kSidAt("Jupiter", new Date(t));
      let d = (ss - md) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
      worst = Math.max(worst, Math.abs(d - D.drift.err[i]));
    }
    out.driftWorst = worst;
    out.driftRange = [Math.min(...D.drift.err), Math.max(...D.drift.err)];

    /* 2. every eclipse the Siddhanta reel says is real, is real */
    const A = window.Astronomy;
    const t0 = Date.parse("2026-01-01"), t1 = t0 + 25 * 365.2564 * 86400000;
    const real = [];
    let l = A.SearchLunarEclipse(new Date(t0));
    for (let i = 0; i < 300 && l && l.peak.date.getTime() < t1; i++) {
      real.push(l.peak.date.getTime()); l = A.NextLunarEclipse(l.peak); }
    let s2 = A.SearchGlobalSolarEclipse(new Date(t0));
    for (let i = 0; i < 300 && s2 && s2.peak.date.getTime() < t1; i++) {
      real.push(s2.peak.date.getTime()); s2 = A.NextGlobalSolarEclipse(s2.peak); }
    const E = window.SPStories.build("sseclipse", { t0, years: 25 });
    let badConfirm = 0, badMiss = 0;
    E.events.forEach(e => {
      const near = real.some(t => Math.abs(t - e.t) < 2.5 * 86400000);
      if (e.tally === "confirmed" && !near) badConfirm++;
      if (e.tally === "missed" && !near) badMiss++;
    });
    out.confirmed = E.events.filter(e => e.tally === "confirmed").length;
    out.missed = E.events.filter(e => e.tally === "missed").length;
    out.badConfirm = badConfirm; out.badMiss = badMiss;
    /* the dates must be in this century, not the fifth: an ahargana is a
       julian day minus an epoch, and feeding one to msOf lands in year 415 */
    out.firstYear = new Date(E.events[0].t).getUTCFullYear();

    /* 3. the simulated path is the integrator's, and it ends where the run does */
    const M = window.SPStories.build("sim.stop", { t0: Date.now() });
    const last = Math.sqrt(M.orbit.x[M.orbit.x.length - 1] ** 2 +
                           M.orbit.y[M.orbit.y.length - 1] ** 2);
    const first = Math.sqrt(M.orbit.x[0] ** 2 + M.orbit.y[0] ** 2);
    out.fallFrom = first; out.fallTo = last;
    out.monotone = M.orbit.x.every((_, i) => i === 0 ||
      Math.sqrt(M.orbit.x[i] ** 2 + M.orbit.y[i] ** 2) <=
      Math.sqrt(M.orbit.x[i - 1] ** 2 + M.orbit.y[i - 1] ** 2) + 1);
    out.simClock = M.clockMode;
    const C = window.SPStories.build("sim.half", { t0: Date.now() });
    out.halfMax = Math.max(...C.orbit.x.map((v, i) =>
      Math.sqrt(v ** 2 + C.orbit.y[i] ** 2)));
    return out;
  });
  ok(r.driftWorst < 1e-9,
     "the drift plotted is exactly Siddhānta minus modern",
     "worst mismatch " + r.driftWorst);
  ok(Math.abs(r.driftRange[0]) + Math.abs(r.driftRange[1]) > 1,
     "and it is a real gap: " + r.driftRange[0].toFixed(2) + "° to " +
     r.driftRange[1].toFixed(2) + "° for Guru over 40 years");
  ok(r.firstYear > 2000 && r.firstYear < 2100,
     "Siddhānta eclipse dates land in this century, not the fifth",
     "first is " + r.firstYear);
  ok(r.badConfirm === 0,
     "every eclipse the reel calls confirmed is one the library also has",
     r.badConfirm + " were not");
  ok(r.badMiss === 0, "and every one it calls missed is real too");
  ok(r.confirmed > 20 && r.missed > 10,
     "it confirms " + r.confirmed + " and misses " + r.missed +
     " over 25 years");
  ok(r.monotone, "a stopped Moon falls monotonically inward");
  ok(r.fallTo < r.fallFrom * 0.1,
     "and the drawn path ends at the ground, not at the origin: " +
     Math.round(r.fallFrom).toLocaleString("en") + " km to " +
     Math.round(r.fallTo).toLocaleString("en"));
  ok(r.simClock === "days", "a four-day run is clocked in days, not years",
     r.simClock);
  ok(Math.abs(r.halfMax - 192200) / 192200 < 0.25,
     "the half-distance Moon orbits near half the distance: " +
     Math.round(r.halfMax).toLocaleString("en") + " km");
}

/* ---- 8d. it has to be smooth ---------------------------------------------
   The complaint that started this rework was that the video stutters, and a
   stutter is not something a screenshot can show. So it is measured: the
   whole frame, with a forced flush, because canvas calls are deferred and
   timing them individually reports zero and then one spike in ten.

   The budget is per frame in a SOFTWARE rasteriser — this harness runs
   headless with no GPU, so a real machine has considerable headroom on top.
   What is being guarded is the shape of the cost: it must not grow with how
   far through the run the playhead is, which is what redrawing every
   accumulated stroke every frame did. */
console.log("\nIt renders fast enough, and the cost does not grow");
{
  for (const k of ["eclipse.new", "thread.earth-jupiter", "asta.venus"]) {
    await choose(k);
    const r = await pg.evaluate(() => {
      const cv = document.getElementById("reel-canvas");
      const c = cv.getContext("2d");
      const R = window.__reel.reel();
      function timeAt(from, to) {
        for (let i = 0; i < 4; i++) window.SPReel.frameAt(c, 1080, 1920, R, from);
        c.getImageData(0, 0, 1, 1);
        const N = 30, t0 = performance.now();
        for (let i = 0; i < N; i++) {
          window.SPReel.frameAt(c, 1080, 1920, R, from + (to - from) * i / N);
          c.getImageData(0, 0, 1, 1);
        }
        return (performance.now() - t0) / N;
      }
      const early = timeAt(0.10, 0.22);
      const late = timeAt(0.80, 0.92);
      return { early: +early.toFixed(1), late: +late.toFixed(1) };
    });
    ok(r.late < 45, k + ": " + r.late + " ms a frame late in the run " +
       "(software rasteriser, no GPU)");
    ok(r.late < r.early * 1.9,
       k + ": the cost does not grow with the run — " + r.early +
       " ms early, " + r.late + " ms late");
  }
}

/* ---- 8e. the other render path --------------------------------------------
   Paper is not a recolouring of the dark themes. It has no additive pass at
   all — ink and wash on a sheet — so it is a second render path and gets its
   own checks: it must draw, it must be LIGHT (an additive path on a pale
   ground blows out to white), and the type must not inherit the tracking the
   dark theme's small caps use. */
console.log("\nThe paper theme is its own render path");
{
  await choose("eclipse.new");
  const r = await pg.evaluate(() => {
    const cv = document.getElementById("reel-canvas");
    const c = cv.getContext("2d");
    const R = window.__reel.reel();
    function stats(key) {
      R.pal = window.SPReel.pal(key);
      window.SPReel.frameAt(c, 1080, 1920, R, 0.6);
      const d = c.getImageData(0, 0, 1080, 1920).data;
      let sum = 0, n = 0, blown = 0;
      for (let i = 0; i < d.length; i += 40) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += v; n++;
        if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) blown++;
      }
      return { mean: sum / n, blown: blown / n, dark: R.pal.dark };
    }
    const gold = stats("gold"), paper = stats("paper"), dusk = stats("dusk");
    /* the subtitle must be set without tracking on paper: measured by asking
       the canvas what it would be, after a full frame has been drawn */
    R.pal = window.SPReel.pal("paper");
    window.SPReel.frameAt(c, 1080, 1920, R, 0.6);
    const ls = ("letterSpacing" in c) ? c.letterSpacing : "0px";
    R.pal = window.SPReel.pal("gold");
    return { gold, paper, dusk, ls };
  });
  ok(r.gold.mean < 70, "gold on black is dark: mean " +
     r.gold.mean.toFixed(0) + "/255");
  ok(r.paper.mean > 150, "paper is light: mean " +
     r.paper.mean.toFixed(0) + "/255");
  ok(r.dusk.mean > 140, "and so is dusk: mean " + r.dusk.mean.toFixed(0));
  ok(r.paper.blown < 0.02,
     "paper is not blown out — only " + (r.paper.blown * 100).toFixed(2) +
     "% of it is pure white, so it is not running through the additive path");
  ok(r.gold.blown < 0.02,
     "and neither is gold: " + (r.gold.blown * 100).toFixed(2) + "% white");
  ok(r.ls === "0px", "tracking does not leak out of a frame", r.ls);
}

/* ---- 8f. the grahas are grahas -------------------------------------------- */
console.log("\nThe bodies are the site's own, not glowing dots");
{
  const r = await pg.evaluate(() => {
    if (!window.SPBody || !window.SPBody.ready()) return { ready: false };
    const out = { ready: true, bodies: {} };
    ["Moon", "Jupiter", "Venus", "Mars", "Saturn", "Mercury", "Sun"]
      .forEach(n => {
        const cv = window.SPBody.disc(n, 48, { phase: 180 });
        if (!cv) { out.bodies[n] = null; return; }
        const c = cv.getContext("2d");
        const d = c.getImageData(0, 0, cv.width, cv.height).data;
        /* a textured disc has many distinct colours; a flat dot has one */
        const seen = new Set();
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          lit++;
          seen.add((d[i] >> 3) + "," + (d[i + 1] >> 3) + "," + (d[i + 2] >> 3));
        }
        out.bodies[n] = { lit, shades: seen.size, size: cv.width };
      });
    /* and the phase is real: a new Moon and a full Moon are not the same */
    const a = window.SPBody.disc("Moon", 40, { phase: 10 });
    const b = window.SPBody.disc("Moon", 40, { phase: 180 });
    function brightness(cv) {
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] * (d[i + 3] / 255);
      return s / (cv.width * cv.height);
    }
    out.newMoon = brightness(a);
    out.fullMoon = brightness(b);
    return out;
  });
  ok(r.ready, "the procedural body renderer is on the page");
  if (r.ready) {
    const thin = Object.keys(r.bodies).filter(n =>
      !r.bodies[n] || r.bodies[n].shades < 12);
    ok(thin.length === 0,
       "every graha renders a textured disc, not a flat dot — " +
       Object.keys(r.bodies).map(n => n + " " + (r.bodies[n] || {}).shades)
         .join(", "), thin.join(" | "));
    ok(r.fullMoon > r.newMoon * 3,
       "and the phase is real: a full Moon is " +
       (r.fullMoon / Math.max(0.01, r.newMoon)).toFixed(1) +
       "x brighter than a new one");
  }
}

/* ---- 8g. the festivals ---------------------------------------------------
   A festival reel is the one place on this site where the output can be
   checked against something the whole world already knows: the date. If the
   engine says Dīvālī 2025 is any day but the 20th of October, everything
   else on the page is beside the point.

   The second check is the one that caught a real defect. A lunar month may
   not change its NAME in the middle of itself — and it did, because the
   month was named by back-projecting the Sun to the new moon with mean
   motions, which flips across a rāśi boundary when the true value sits
   within half a degree of it. April 2029 ran Chaitra, Vaishakha, Chaitra,
   Vaishakha on successive stretches of one lunation, and Rāma Navamī went
   missing in 2029 and 2048 because its rule names a month. */
console.log("\nThe festival dates are the published ones");
{
  /* widely published dates for 2025, as any almanac gives them */
  const KNOWN = {
    diwali: "2025-10-20", holi: "2025-03-14", janmashtami: "2025-08-16",
    mahashivaratri: "2025-02-26", dussehra: "2025-10-02",
    ramanavami: "2025-04-06", makara: "2025-01-14",
    navaratri: "2025-09-22", ugadi: "2025-03-30"
  };
  const r = await pg.evaluate((known) => {
    if (!window.SPFest || !window.SPFest.ready()) return { ready: false };
    const out = { ready: true, got: {} };
    Object.keys(known).forEach(k => {
      const d = window.SPFest.datesFor(k, 2025, 1);
      out.got[k] = (d && d.length) ? d[0].iso : null;
    });
    return out;
  }, KNOWN);
  ok(r.ready, "the festival rules and the pañcāṅga are on the page");
  if (r.ready) {
    const wrong = Object.keys(KNOWN).filter(k => r.got[k] !== KNOWN[k]);
    ok(wrong.length === 0,
       "all " + Object.keys(KNOWN).length + " match the published 2025 dates",
       wrong.map(k => k + ": got " + r.got[k] + " want " + KNOWN[k]).join(" | "));
  }
}

console.log("\nA lunar month does not change its name in the middle");
{
  const r = await pg.evaluate(() => {
    const NP = window.NP, P = NP.savedPlace() || NP.PLACES[0];
    /* walk four years a day at a time, grouping by lunation: a month is the
       stretch between two new Moons, and every day in it must agree */
    const bad = [];
    let curStart = null, curName = null, lastPhase = null;
    for (let d = 0; d < 365 * 4; d++) {
      const ms = Date.UTC(2027, 0, 1, 12) + d * 86400000;
      const D = NP.day(ms, P, { month: true });
      const ph = D.phase;
      if (lastPhase != null && ph < lastPhase) {   /* a new Moon passed */
        curStart = ms; curName = D.masaFestival;
      } else if (curName != null && D.masaFestival !== curName) {
        bad.push(new Date(ms).toISOString().slice(0, 10) + ": " +
                 curName + " -> " + D.masaFestival);
        curName = D.masaFestival;
      } else if (curName == null) curName = D.masaFestival;
      lastPhase = ph;
    }
    return { bad: bad.slice(0, 6), n: bad.length };
  });
  ok(r.n === 0, "four years of lunations each keep one name throughout",
     r.bad.join(" | "));
}

console.log("\nEvery festival reel says true things about its dates");
{
  const r = await pg.evaluate(() => {
    const out = { rules: [], metonic: {}, gaps: {}, lun: null };
    const NP = window.NP, P = NP.savedPlace() || NP.PLACES[0];
    window.SPFest.LIST.forEach(q => {
      const d = window.SPFest.datesFor(q.fest, 2026, 24);
      if (!d || d.length < 10) { out.rules.push(q.fest + ": too few"); return; }
      /* the rule, re-applied: the day the reel found must carry the month
         and tithi the rule names */
      let rule = null;
      NP.FESTIVALS.forEach(f => { if (f.key === q.fest) rule = f; });
      d.forEach(x => {
        if (rule.solar != null) return;
        const want = (rule.t instanceof Array) ? rule.t[0] : rule.t;
        if (rule.after) return;
        const D = NP.day(x.t, P, { month: true });
        if (NP.masaIdx(D.masaFestival) !== rule.m)
          out.rules.push(q.fest + " " + x.iso + ": month " + D.masaFestival);
        /* A SKIPPED TITHI IS NOT A WRONG DATE. When a tithi begins and ends
           between two sunrises it is never current at one, and the rule
           falls to the following day — the kṣaya case the engine handles
           explicitly. So the sunrise tithi is the rule's own, or the next. */
        if (!rule.when && D.at.tithi.i !== want &&
            D.at.tithi.i !== (want + 1) % 30)
          out.rules.push(q.fest + " " + x.iso + ": tithi " + D.at.tithi.i);
      });
      const m = window.SPFest.metonic(d);
      out.metonic[q.fest] = m ? m.lag : null;
      out.gaps[q.fest] = (d.gaps || []).map(g => g.why);
    });
    /* the lunation reel: thirty moons, the festival's own tithi ringed, and
       a clock that starts at the new Moon rather than at today */
    const R = window.SPStories.build("fest.moon.diwali",
      { t0: Date.parse("2026-06-01") });
    out.lun = { n: R.lunation.n, mark: R.lunation.mark,
                markIdx: R.lunation.idx[R.lunation.mark],
                before: R.lunation.mark,
                after: R.lunation.n - 1 - R.lunation.mark,
                startsAtLunation: Math.abs(R.tl.t0 - R.lunation.t0) < 1000,
                days: (R.tl.t1 - R.tl.t0) / 86400000 };
    return out;
  });
  ok(r.rules.length === 0,
     "every date a reel plots satisfies the rule it names",
     r.rules.slice(0, 4).join(" | "));
  const lunar = Object.keys(r.metonic).filter(k => k !== "makara");
  const notNineteen = lunar.filter(k => r.metonic[k] !== 19);
  ok(notNineteen.length === 0,
     "all " + lunar.length + " lunar festivals return after 19 years — the " +
     "Metonic cycle, measured from the dates",
     notNineteen.map(k => k + ": " + r.metonic[k]).join(" | "));
  const badGaps = Object.keys(r.gaps).filter(k =>
    r.gaps[k].some(w => !w || w.length < 10));
  ok(badGaps.length === 0,
     "a year the rule admits no day is reported with its reason, not dropped",
     badGaps.join(" | "));
  ok(r.lun.n === 31, "the lunation ring is thirty-one tithis");
  ok(r.lun.mark === 15 && r.lun.before === r.lun.after,
     "with the festival in the middle: " + r.lun.before + " tithis before it " +
     "and " + r.lun.after + " after");
  ok(r.lun.markIdx === 29,
     "and the marked tithi is amāvāsyā, which the rule names, not caturdaśī, " +
     "which is what sunrise reads that day",
     "idx " + r.lun.markIdx);
  ok(r.lun.startsAtLunation,
     "the clock covers exactly the ring it draws, rather than the span the " +
     "reel was asked for");
  ok(r.lun.days > 28 && r.lun.days < 31,
     "and runs one lunation: " + r.lun.days.toFixed(2) + " days");
}

/* ---- 8g2. the reel and the calendar must not disagree --------------------
   THE CHECK THAT SHOULD HAVE BEEN HERE FIRST. Two engines on one site that
   name different days for Dussehra is the worst failure this project can
   have, and it happened: the calendar said the 20th of October 2026 and the
   lunation reel captioned the 19th.

   Neither was wrong about the festival. The reel divided the lunation into
   thirty EQUAL slices, and tithis are not equal — the sixth tithi of Āśvina
   2026 covers two sunrises, which pushes every tithi after it a day late. So
   every date the reel prints is now checked against the day NP.festivalsOn
   names, which is the day the calendar page draws. */
console.log("\nEvery date a reel prints is the date the calendar gives");
{
  const r = await pg.evaluate(() => {
    const bad = [], NP = window.NP;
    const P = NP.savedPlace() || NP.PLACES[2];
    function engineDay(key, year) {
      const d = window.SPFest.datesFor(key, year, 1, P);
      return (d && d.length) ? d[0].iso : null;
    }
    function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
    window.SPFest.LIST.forEach(q => {
      for (let y = 2026; y <= 2029; y++) {
        const want = engineDay(q.fest, y);
        if (!want) continue;
        /* the "why does it move" reel: the caption for that year */
        const W = window.SPStories.build("fest.when." + q.fest,
          { t0: Date.UTC(y, 0, 1), years: 4, place: P });
        if (W) {
          const e = W.events.filter(x => new Date(x.t).getUTCFullYear() === y)[0];
          if (e && iso(e.t) !== want)
            bad.push(q.fest + " " + y + ": when-reel " + iso(e.t) +
                     " vs engine " + want);
        }
        if (y !== 2026) continue;
        /* the lunation reel: the caption on the ringed tithi, and its card */
        const L = window.SPStories.build("fest.moon." + q.fest,
          { t0: Date.UTC(y, 0, 1), place: P });
        if (!L) continue;
        const m = L.events[L.lunation.mark];
        if (!m) { bad.push(q.fest + ": no marked tithi"); continue; }
        /* the date the reel PRINTS, which is the thing a viewer reads — the
           event's own timestamp is the tithi's start and is a different
           quantity */
        const MON = ["JAN","FEB","MAR","APR","MAY","JUN",
                     "JUL","AUG","SEP","OCT","NOV","DEC"];
        const w = new Date(want + "T12:00:00Z");
        const shown = w.getUTCDate() + " " + MON[w.getUTCMonth()] + " " +
                      w.getUTCFullYear();
        if (m.big !== shown)
          bad.push(q.fest + " " + y + ": lunation ring prints " + m.big +
                   " vs engine " + shown);
        if (L.closing.big.indexOf(want) < 0)
          bad.push(q.fest + " " + y + ": closing card " + L.closing.big +
                   " vs engine " + want);
      }
    });
    return { bad: bad.slice(0, 6), n: bad.length };
  });
  ok(r.n === 0,
     "every festival reel agrees with NP.festivalsOn, which is what the " +
     "calendar draws", r.bad.join(" | "));
}

console.log("\nThe lunation's tithis are the real ones");
{
  const r = await pg.evaluate(() => {
    const L = window.SPStories.build("fest.moon.diwali",
      { t0: Date.parse("2026-01-01") }).lunation;
    /* A tithi begins when the Moon has gained a multiple of twelve degrees
       on the Sun — and on a centred ring the multiple is the tithi's OWN
       index, not its position in the array. The ring starts fifteen tithis
       before the festival, so position zero is rarely tithi zero. */
    let worst = 0, longest = 0, shortest = 1e9;
    for (let i = 1; i < L.n; i++) {
      const want = L.idx[i] * 12;
      let got = L.phaseAt(L.starts[i]);
      let d = Math.abs(got - want);
      if (d > 180) d = 360 - d;
      worst = Math.max(worst, d);
      const len = (L.starts[i + 1] - L.starts[i]) / 3600000;
      if (isFinite(len) && len > 0) {
        longest = Math.max(longest, len);
        shortest = Math.min(shortest, len);
      }
    }
    return { worst, longest, shortest };
  });
  ok(r.worst < 0.05,
     "each tithi starts where the elongation says it does, to " +
     r.worst.toFixed(4) + "°");
  ok(r.longest - r.shortest > 2,
     "and they are genuinely unequal — " + r.shortest.toFixed(1) + " to " +
     r.longest.toFixed(1) + " hours, which is why equal slices were wrong");
}

console.log("\nThe skipped and the repeated tithis balance");
{
  /* A window of thirty-one tithis is about thirty and a half days, so it
     holds about one tithi more than it has sunrises. Every tithi that
     catches two sunrises — vṛddhi — must cost another tithi its day. If the
     books do not balance, a sunrise has been dropped, which is exactly the
     bug that made Mahāśivarātri report a twenty-five-hour kṣaya tithi. */
  const r = await pg.evaluate(() => {
    const out = [];
    window.SPStories.TEMPLATES
      .filter(s => s.key.indexOf("fest.moon.") === 0)
      .forEach(s => {
        const L = window.SPStories.build(s.key,
          { t0: Date.parse("2026-01-01") }).lunation;
        const k = Object.keys(L.skipped).length;
        const v = Object.keys(L.twice).length;
        const filled = Object.keys(L.dayOf).length;
        let longestSkip = 0;
        for (let i = 0; i < L.n; i++)
          if (L.skipped[i])
            longestSkip = Math.max(longestSkip,
              (L.starts[i + 1] - L.starts[i]) / 3600000);
        out.push({ key: s.key.replace("fest.moon.", ""), k: k, v: v,
                   filled: filled, n: L.n, longestSkip: longestSkip });
      });
    return out;
  });
  const unbalanced = r.filter(x => x.filled + x.k !== x.n || x.k - x.v < 0 ||
                                   x.k - x.v > 1);
  ok(unbalanced.length === 0,
     "every tithi either has a day or is counted as skipped, and the skipped " +
     "outnumber the repeated by at most one",
     unbalanced.map(x => x.key + " k" + x.k + " v" + x.v + " f" + x.filled)
               .join(" | "));
  const tooLong = r.filter(x => x.longestSkip >= 24);
  ok(tooLong.length === 0,
     "and no skipped tithi is longer than a day, since one that long always " +
     "contains a sunrise",
     tooLong.map(x => x.key + " " + x.longestSkip.toFixed(1) + "h").join(" | "));
}

console.log("\nThe clock slows into the festival and comes out again");
{
  const r = await pg.evaluate(() => {
    const R = window.SPStories.build("fest.moon.diwali",
      { t0: Date.parse("2026-01-01") });
    const at = p => window.SPReel.clockAt(R.tl, p).t;
    const rate = (a, b) => Math.abs(at(b) - at(a)) / 86400000 / (b - a);
    /* where the clock reaches the marked tithi, in playhead terms */
    const centre = R.lunation.starts[R.lunation.mark];
    let arrive = 0;
    for (let p = 0; p <= 1; p += 0.002) if (at(p) <= centre) arrive = p;
    let back = 0;
    for (let i = 1; i <= 500; i++)
      if (at(i / 500) < at((i - 1) / 500) - 1000) back++;
    return { early: rate(0.12, 0.20), slow: rate(arrive - 0.01, arrive + 0.01),
             late: rate(0.72, 0.80), arrive: arrive, back: back,
             t0: at(0), t1: at(1), span0: R.tl.t0, span1: R.tl.t1 };
  });
  ok(r.slow < r.early / 4 && r.slow < r.late / 4,
     "the dial crawls through the festival — " + r.slow.toFixed(2) +
     " days per unit playhead against " + r.early.toFixed(2) + " before and " +
     r.late.toFixed(2) + " after");
  ok(r.back === 0, "the warped clock never runs backwards", r.back + " steps");
  ok(Math.abs(r.t0 - r.span0) < 1000 && Math.abs(r.t1 - r.span1) < 1000,
     "and still covers exactly the span it claims, start to finish");
}

console.log("\nA caption names the tithi the rule names");
{
  const r = await pg.evaluate(() => {
    const W = window.SPStories.build("fest.when.dussehra",
      { t0: Date.parse("2026-01-01") });
    const e = W.events[0];
    return { small: e.small, big: e.big };
  });
  ok(/Daśamī/.test(r.small),
     "Vijayadaśamī's caption says daśamī: " + r.small);
  ok(/at sunrise still/.test(r.small),
     "and says what sunrise read instead, which is why the rule names a " +
     "window");
}

/* ---- 8h. the place -------------------------------------------------------
   A control that does nothing is worse than no control. The picker is only
   worth having if moving it moves the dates — so this checks that it does,
   against a place far enough away for the answer to differ, and that a reel
   which used it says so on the frame. */
console.log("\nThe place picker changes what it should and nothing else");
{
  const r = await pg.evaluate(() => {
    const out = {};
    out.hasInput = !!document.querySelector("#reel-place .npfind");
    const DEL = window.NP.PLACES[2];
    const NYC = { n: "New York, US", lat: 40.7128, lon: -74.0060, tz: -5 };
    const a = window.SPFest.datesFor("diwali", 2026, 6, DEL).map(q => q.iso);
    const b = window.SPFest.datesFor("diwali", 2026, 6, NYC).map(q => q.iso);
    out.delhi = a; out.nyc = b;
    out.differ = a.filter((x, i) => b[i] && x !== b[i]).length;
    /* the cache must be per place, or the second lookup returns the first */
    const a2 = window.SPFest.datesFor("diwali", 2026, 6, DEL).map(q => q.iso);
    out.stable = a2.join() === a.join();
    /* a place-dependent reel carries the name; a thread reel does not */
    const F = window.SPStories.build("fest.when.diwali",
      { t0: Date.parse("2026-01-01"), place: NYC });
    const T = window.SPStories.build("thread.earth-venus",
      { t0: Date.parse("2026-01-01") });
    out.festPlace = F.placeName;
    out.threadPlace = T.placeName || null;
    return out;
  });
  ok(r.hasInput, "the picker is on the page");
  ok(r.differ > 0,
     "moving the place moves the dates: Delhi " + r.delhi.join(" ") +
     " against New York " + r.nyc.join(" "));
  ok(r.stable, "and the cache is per place, not shared between them");
  ok(/New York/.test(r.festPlace || ""),
     "a festival reel carries the place it was computed for", r.festPlace);
  ok(!r.threadPlace,
     "a reel that does not depend on a place does not claim one",
     String(r.threadPlace));

  /* and the frame actually prints it */
  const ink = await pg.evaluate(() => {
    const cv = document.getElementById("reel-canvas");
    const c = cv.getContext("2d");
    const R = window.SPStories.build("fest.when.diwali",
      { t0: Date.parse("2026-01-01"), place: window.NP.PLACES[2] });
    function litRow(reel) {
      window.SPReel.frameAt(c, 1080, 1920, reel, 0.5);
      const B = window.SPReel.bands(1080, 1920);
      const y = Math.round(B.tally.y + 1080 * 0.014);
      const d = c.getImageData(0, y, 1080, Math.round(1080 * 0.03)).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i] > 40 || d[i + 1] > 40) n++;
      return n;
    }
    const withPlace = litRow(R);
    const T = window.SPStories.build("thread.earth-venus",
      { t0: Date.parse("2026-01-01") });
    const without = litRow(T);
    return { withPlace, without, place: R.placeName || null,
             noPlace: T.placeName || null, method: T.method || null,
             festMethod: R.method || null };
  });
  ok(ink.withPlace > 300,
     "and the frame prints it: " + ink.withPlace + " lit pixels on that line");
  /* THE LINE IS PROVENANCE, NOT A PRIVACY NOTICE. It used to carry the same
     promise on every reel, which told a viewer nothing about the picture
     they were looking at; now it says where the reel was computed for and by
     what method. A reel that does not depend on a place says only the
     method, so the line is never empty — what must be absent is the place. */
  ok(ink.without > 200,
     "a reel with no place still names its method on that line (" +
     ink.without + " lit pixels)");
  ok(!ink.noPlace && !!ink.method && !!ink.place && !!ink.festMethod,
     "and it is the method alone: \"" + ink.method + "\" against \"" +
     "computed for " + ink.place + " · " + ink.festMethod + "\"");
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
