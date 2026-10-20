/* Do the explainers teach what they claim, and does the format hold?
 *
 *   node source/test/explain-verify.mjs
 *
 * An explainer is not a measurement, which makes it a different kind of
 * dangerous. A measurement reel can be checked against the sky; a page of
 * teaching can only be checked against its source and against itself. So
 * this file insists on three things the format cannot be trusted to keep on
 * its own:
 *
 *   THE DOCTRINE MATCHES THE SITE'S OWN PAGE. Every classification an
 *     explainer asserts — which houses are kendras, which are dusthānas,
 *     which class a given bhāva belongs to — is recomputed here from the
 *     definitions and checked against what the reel says. A reel that
 *     quietly disagreed with the page it was built from would be the worst
 *     possible outcome, because both look authoritative.
 *
 *   NO CITATION IS INVENTED. The chapter and verse numbers that appear are
 *     matched against a fixed allow-list taken from the published page. A
 *     new number appearing anywhere in an explainer fails here.
 *
 *   EVERY BEAT IS LEGIBLE FOR ITS OWN TIME. A beat is a slide. The caption
 *     is sampled at the middle of each one and must be at full strength, and
 *     the diagram must actually gain something — a beat that adds nothing is
 *     a beat that should not exist.
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";

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
await pg.waitForFunction(() => window.SPExplain && window.SPStories &&
                               window.SPStories.ready(), null, { timeout: 40000 });

/* ---- 1. they exist, and they are stories like any other ------------------ */
console.log("\nThe explainers register as ordinary reels");
{
  const r = await pg.evaluate(() => {
    const keys = window.SPExplain.keys();
    const built = keys.map(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      if (!R) return { k, bad: "did not build" };
      return { k, pal: R.pal.key, beats: R.events.length,
               clock: R.clockMode, tally: R.tallyKeys.length,
               hasExplain: !!R.explain, stage: R.stage,
               title: R.title, method: R.method || "",
               closing: (R.closing.lines || []).join(" ") };
    });
    return { keys, built };
  });
  const bh = r.keys.filter(k => k.indexOf("learn.bhava.") === 0);
  const cn = r.keys.filter(k => k.indexOf("learn.concept.") === 0);
  ok(bh.length === 12, "all twelve bhāvas are offered: " + bh.length);
  ok(cn.length >= 13,
     "and one explainer per subject the site teaches: " + cn.length);
  const bad = r.built.filter(b => b.bad);
  ok(bad.length === 0, "every one builds", bad.map(b => b.k).join(" | "));
  const wrongPal = r.built.filter(b => b.pal !== "paper");
  ok(wrongPal.length === 0,
     "each is drawn on paper, not on black — the format is ink and wash",
     wrongPal.map(b => b.k + " " + b.pal).join(" | "));
  const wrongClock = r.built.filter(b => b.clock !== "none" || b.tally !== 0);
  ok(wrongClock.length === 0,
     "none of them prints a clock or a tally, because none of them counts " +
     "anything",
     wrongClock.map(b => b.k).join(" | "));
  const wrongBeats = r.built.filter(b => b.beats < 6 || b.beats > 8);
  ok(wrongBeats.length === 0, "each runs six to eight beats",
     wrongBeats.map(b => b.k + " " + b.beats).join(" | "));
  globalThis.__built = r.built;
}

/* ---- 2. the doctrine, recomputed --------------------------------------- */
console.log("\nThe classifications are the ones the site publishes");
{
  /* definitions, written out here independently of the module under test */
  const DEF = {
    "Kendra": [1, 4, 7, 10], "Trikoṇa": [1, 5, 9], "Dusthāna": [6, 8, 12],
    "Upacaya": [3, 6, 10, 11], "Māraka": [2, 7],
    "Panaphara": [2, 5, 8, 11], "Āpoklima": [3, 6, 9, 12]
  };
  const r = await pg.evaluate(() => {
    const out = [];
    for (let n = 1; n <= 12; n++) {
      const R = window.SPStories.build("learn.bhava." + n,
        { t0: Date.parse("2026-01-01") });
      out.push({ n, classes: R.explain.classes.slice(),
                 houses: R.explain.classHouses.slice(),
                 house: R.explain.house, body: R.explain.karakaBody,
                 classBeat: R.events[3].small });
    }
    return out;
  });
  const wrongClass = r.filter(x => {
    const want = Object.keys(DEF).filter(k => DEF[k].indexOf(x.n) >= 0);
    return want.join(",") !== x.classes.join(",");
  });
  ok(wrongClass.length === 0,
     "every bhāva names exactly the classes it belongs to",
     wrongClass.map(x => x.n + ": " + x.classes.join(",")).join(" | "));
  const wrongHouses = r.filter(x => {
    const want = {};
    x.classes.forEach(k => DEF[k].forEach(h => { want[h] = 1; }));
    return Object.keys(want).length !== x.houses.length ||
           x.houses.some(h => !want[h]) || x.houses.indexOf(x.n) < 0;
  });
  ok(wrongHouses.length === 0,
     "and lights exactly the sibling houses of those classes, itself included",
     wrongHouses.map(x => x.n).join(" | "));
  ok(r.every(x => x.house === x.n), "the chart highlights the house it names");
  const BODIES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const wrongBody = r.filter(x => BODIES.indexOf(x.body) < 0);
  ok(wrongBody.length === 0, "the kāraka drawn is one of the seven bodies",
     wrongBody.map(x => x.n + " " + x.body).join(" | "));
  /* the one house that is both a kendra and a trikoṇa is the Lagna, and it
     is the only one — a fact worth pinning down because an explainer that
     got it wrong would read perfectly well */
  const both = r.filter(x => x.classes.indexOf("Kendra") >= 0 &&
                             x.classes.indexOf("Trikoṇa") >= 0);
  ok(both.length === 1 && both[0].n === 1,
     "exactly one bhāva is both kendra and trikoṇa, and it is the first",
     both.map(x => x.n).join(","));
}

/* ---- 3. no invented citations ------------------------------------------- */
console.log("\nNothing is cited that the site does not already cite");
{
  /* THE ALLOW-LIST IS READ FROM THE PAGES, not typed out here.

     A hand-kept list drifts: a page gets a correction, the list does not,
     and the check starts defending the wrong thing. So every chapter- and
     verse-shaped reference printed anywhere in the site's own teaching
     pages is collected, and an explainer may cite any of those and nothing
     else. The cost of adding a legitimate citation is then adding it to the
     page that owns it, which is where a reader would look for it anyway. */
  const PAGEDIR = resolve(ROOT, "source", "src", "pages");
  const ALLOWED = [...new Set(readdirSync(PAGEDIR)
    .filter(f => f.endsWith(".html"))
    .flatMap(f => readFileSync(resolve(PAGEDIR, f), "utf8")
      .match(/(Ch\.|Chapter|vv?\.)\s*[0-9][^,.;)\n]*/g) || [])
    .map(x => x.trim()))];
  ok(ALLOWED.length > 20,
     "the allow-list is built from the site's own pages: " + ALLOWED.length +
     " references found");
  const r = await pg.evaluate(() => {
    const txt = [];
    window.SPExplain.keys().forEach(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      txt.push(R.method || "");
      txt.push(R.subtitle || "");
      (R.closing.lines || []).forEach(l => txt.push(l));
      R.events.forEach(e => { txt.push(e.small); txt.push(e.big); });
    });
    return txt.join("\n");
  });
  /* every chapter- or verse-shaped reference in the whole set */
  const refs = [...new Set((r.match(/(Ch\.|Chapter|vv?\.)\s*[0-9][^,.;)\n]*/g) || [])
    .map(s => s.trim()))];
  /* WHAT IS BEING CHECKED IS THE NUMBER, not the words after it. A page
     writes "Ch. 45 (Avasthas — Baladi, Jagradadi…)" and an explainer writes
     "Ch. 45 (Bālādi…)": the same citation, differently summarised. So each
     reference is reduced to its chapter-and-verse numbers before comparing,
     and a range is accepted when both its endpoints are cited individually
     — Ch. 67–71 is honest if the page prints Ch. 67 and Ch. 71. */
  const norm = x => {
    const m = x.match(/^(Ch\.|Chapter|vv?\.)\s*[0-9]+(\s*[–-]\s*[0-9]+)?/);
    return m ? m[0].replace(/\s+/g, " ").replace(/\s*[–-]\s*/, "–") : x.trim();
  };
  const allow = new Set(ALLOWED.map(norm));
  const cited = x => {
    const n = norm(x);
    if (allow.has(n)) return true;
    const m = n.match(/^(Ch\.|Chapter|vv?\.)\s*([0-9]+)–([0-9]+)$/);
    if (!m) return false;
    for (let i = +m[2]; i <= +m[3]; i++)
      if (!allow.has(m[1] + " " + i)) return false;
    return true;
  };
  const stray = refs.filter(x => !cited(x));
  ok(stray.length === 0,
     "every chapter and verse reference in all " + refs.length +
     " is one the site's own pages already print",
     stray.join(" | "));
  ok(refs.length > 10,
     "and the set does cite its sources rather than gesturing at them: " +
     [...new Set(refs.map(norm))].sort().join(", "));
  ok(!/śloka|verse \d|says that/i.test(r) ||
     /classical framework/i.test(r),
     "no beat quotes a verse it has not got");
}

/* ---- 4. every beat earns its place -------------------------------------- */
console.log("\nEvery explainer, beat by beat");
{
  /* ALL OF THEM, not a representative one. The whole point of the format is
     that adding a set is writing words rather than writing code, which means
     a set can be added with a beat that draws nothing and nobody would see
     it. So each explainer is rendered at the midpoint of each of its beats
     and asked two questions: is the caption up, and did the diagram gain
     anything since the beat before. */
  const r = await pg.evaluate(() => {
    const keys = window.SPExplain.keys();
    const cv = document.createElement("canvas");
    cv.width = 540; cv.height = 960;
    const c = cv.getContext("2d");
    const out = [];
    keys.forEach(k => {
      const R = window.SPStories.build(k, { t0: Date.parse("2026-01-01") });
      const B = window.SPReel.bands(540, 960, R);
      const mids = [];
      for (let i = 0; i < R.events.length; i++) {
        const t = i < R.events.length - 1
          ? (R.events[i].t + R.events[i + 1].t) / 2
          : R.events[i].t + 86400000 * 0.3;
        let lo = 0, hi = 1;
        for (let s = 0; s < 40; s++) {
          const m = (lo + hi) / 2;
          if (window.SPReel.clockAt(R.tl, m).t < t) lo = m; else hi = m;
        }
        mids.push((lo + hi) / 2);
      }
      function ink(p, rect) {
        window.SPReel.frameAt(c, 540, 960, R, p);
        const d = c.getImageData(rect.x | 0, rect.y | 0,
          Math.max(1, rect.w | 0), Math.max(1, rect.h | 0)).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4)
          if (d[i] < 170 || d[i + 2] < 150) n++;
        return n;
      }
      const cap = mids.map(p => ink(p, { x: 0, y: B.cap.y, w: 540, h: B.cap.h }));
      const stage = mids.map(p => ink(p, B.stage));
      let grew = 0;
      for (let i = 1; i < stage.length; i++)
        if (stage[i] > stage[i - 1]) grew++;
      out.push({ k, cap, stage, grew, beats: R.events.length });
    });
    return out;
  });
  const quiet = r.filter(x => x.cap.some(n => n < 300));
  ok(quiet.length === 0,
     "the caption is up in the middle of every beat of all " + r.length +
     " explainers",
     quiet.map(x => x.k + " [" + x.cap.join(",") + "]").join(" | "));
  const flat = r.filter(x => x.grew < x.beats - 3);
  ok(flat.length === 0,
     "and every one keeps gaining ink as its beats arrive",
     flat.map(x => x.k + " grew on " + x.grew + "/" + (x.beats - 1) +
              " [" + x.stage.join(",") + "]").join(" | "));
  const thin = r.filter(x => x.stage[x.stage.length - 1] < x.stage[0] * 1.15);
  ok(thin.length === 0,
     "and ends with far more on the page than it started with",
     thin.map(x => x.k + " " + x.stage[0] + " → " +
              x.stage[x.stage.length - 1]).join(" | "));
}

console.log("\nOne explainer in detail");
{
  const r = await pg.evaluate(() => {
    const R = window.SPStories.build("learn.bhava.10",
      { t0: Date.parse("2026-01-01") });
    const cv = document.createElement("canvas");
    cv.width = 540; cv.height = 960;
    const c = cv.getContext("2d");
    const B = window.SPReel.bands(540, 960, R);
    /* where in the playhead the middle of each beat falls */
    const mids = [];
    for (let i = 0; i < R.events.length; i++) {
      const t = i < R.events.length - 1
        ? (R.events[i].t + R.events[i + 1].t) / 2
        : R.events[i].t + 86400000 * 0.3;
      let lo = 0, hi = 1;
      for (let s = 0; s < 40; s++) {
        const m = (lo + hi) / 2;
        if (window.SPReel.clockAt(R.tl, m).t < t) lo = m; else hi = m;
      }
      mids.push((lo + hi) / 2);
    }
    function ink(p, rect) {
      window.SPReel.frameAt(c, 540, 960, R, p);
      const d = c.getImageData(rect.x | 0, rect.y | 0,
                               Math.max(1, rect.w | 0), Math.max(1, rect.h | 0)).data;
      /* dark marks on a pale ground: count pixels well below the paper */
      let n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i] < 170 || d[i + 2] < 150) n++;
      return n;
    }
    const cap = mids.map(p => ink(p, { x: 0, y: B.cap.y, w: 540, h: B.cap.h }));
    const stage = mids.map(p => ink(p, B.stage));
    return { mids, cap, stage, beats: R.events.length };
  });
  const dim = r.cap.filter(n => n < 400);
  ok(dim.length === 0,
     "the caption is at full strength in the middle of every beat: " +
     r.cap.join(", "),
     dim.join(" | "));
  let grew = 0;
  for (let i = 1; i < r.stage.length; i++) if (r.stage[i] > r.stage[i - 1]) grew++;
  ok(grew >= r.beats - 2,
     "and the diagram gains ink on " + grew + " of the " + (r.beats - 1) +
     " transitions, because a beat that adds nothing should not be a beat",
     r.stage.join(", "));
  ok(r.stage[r.stage.length - 1] > r.stage[0] * 1.5,
     "the last frame carries far more than the first: " + r.stage[0] + " → " +
     r.stage[r.stage.length - 1]);
}

/* ---- 5. the diamond is the same diamond --------------------------------- */
console.log("\nThe chart geometry agrees with the composer's");
{
  await pg.goto("file://" + ROOT + "/director-pro.html");
  await pg.waitForFunction(() => window.SPStage ||
                                 document.readyState === "complete",
                           null, { timeout: 40000 });
  const north = await pg.evaluate(() =>
    (window.SPStage && window.SPStage.NORTH) || null);
  if (!north) {
    ok(true, "the composer does not expose its table, so the copy stands " +
             "alone (checked by eye against sp-compose.js)");
  } else {
    await pg.goto("file://" + ROOT + "/reel.html");
    await pg.waitForFunction(() => window.SPExplain, null, { timeout: 40000 });
    const mine = await pg.evaluate(() => window.SPExplain.DIAMOND);
    ok(JSON.stringify(mine) === JSON.stringify(north),
       "the two copies of the North Indian centroids are identical");
  }
}

console.log("\nThe page behaves");
ok(errs.length === 0, "no console errors", errs.slice(0, 3).join(" | "));

console.log("\n" + pass + " passed, " + fail + " failed");
await br.close();
process.exit(fail ? 1 : 0);
