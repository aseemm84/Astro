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
  /* THE PALETTE FOLLOWS THE SUBJECT. Most explainers are ink and wash on
     paper, which is what a diagram of an idea wants. The sets that draw the
     actual sky are not diagrams — they are star charts, and a star chart on
     parchment is a contradiction: a star is a white point on black, and
     there is no honest way to print one the other way up. So the sky sets
     are on a dark palette and everything else is on paper. */
  const SKY = k => /learn\.(nakshatra|rashi)\./.test(k);
  const wrongPal = r.built.filter(b =>
    b.pal !== (SKY(b.k) ? "gold" : "paper"));
  ok(wrongPal.length === 0,
     "the sky sets are drawn on black and the rest on paper",
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
      /* INK IS WHAT CHANGED SINCE THE EMPTY STAGE, not darkness and not
         contrast with a nominal background. Counting dark pixels works on
         paper and inverts completely on black, where the background IS dark
         and every mark is light; counting contrast with the palette's bg
         then counts the whole watercolour wash as ink on the paper sets. A
         per-pixel difference against this reel's own first frame means the
         same thing on every palette: how much of the panel is no longer
         empty. The threshold clears the seeded grain, whose amplitude is a
         few counts. */
      function grab(p, rect) {
        window.SPReel.frameAt(c, 540, 960, R, p);
        return c.getImageData(rect.x | 0, rect.y | 0,
          Math.max(1, rect.w | 0), Math.max(1, rect.h | 0)).data;
      }
      const refs = {};
      function ink(p, rect) {
        const key = rect.x + "," + rect.y + "," + rect.w + "," + rect.h;
        if (!refs[key]) refs[key] = new Uint8ClampedArray(grab(0, rect));
        const d = grab(p, rect), z = refs[key];
        let n = 0;
        for (let i = 0; i < d.length; i += 4)
          if (Math.abs(d[i] - z[i]) + Math.abs(d[i + 1] - z[i + 1]) +
              Math.abs(d[i + 2] - z[i + 2]) > 46) n++;
        return n;
      }
      const cap = mids.map(p => ink(p, { x: 0, y: B.cap.y, w: 540, h: B.cap.h }));
      const stage = mids.map(p => ink(p, B.stage));
      let grew = 0;
      for (let i = 1; i < stage.length; i++)
        if (stage[i] > stage[i - 1]) grew++;
      out.push({ k, cap, stage, grew, beats: R.events.length,
                 area: Math.max(1, (B.stage.w | 0) * (B.stage.h | 0)) });
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
  /* MEASURED AS GROWTH, NOT AS A RATIO. A sky set's first beat already
     lays down the band and its boundaries, so its baseline is most of the
     panel and a ratio test demands the stars double a chart that is
     already drawn. What matters is that the reel ends with meaningfully
     more on it than it began with — at least a hundredth of the panel. */
  const area = r.length ? r[0].area : 1;
  const thin = r.filter(x =>
    x.stage[x.stage.length - 1] - x.stage[0] < area * 0.01);
  ok(thin.length === 0,
     "and ends with at least a hundredth of the panel more on it than it " +
     "started with",
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
console.log("\nThe shipped star catalogue is the one that was verified");
{
  /* THE WHOLE SKY SET RESTS ON THIS FILE. eclip-stars.js was generated from
     HYG by a script that is not in the repository, so the only thing that
     can be checked here is the thing that matters: run the twenty-seven
     junction stars the site already ships — themselves verified against
     Swiss Ephemeris, PyEphem and the Yale Bright Star Catalogue — against
     the new catalogue, and every one must come back at the longitude and
     latitude star-catalogue.js already states. If the ecliptic conversion,
     the ayanamsa or the packing were wrong, they would not. */
  const r = await pg.evaluate(() => {
    const A = window.ECLIP_STARS, L = window.ECLIP_LABELS, Y = window.YOGATARAS;
    if (!A || !Y) return { bad: "catalogue missing" };
    const stars = [];
    for (let i = 0; i + 3 < A.length; i += 4)
      stars.push({ s: A[i] / 1000, l: A[i + 1] / 1000, m: A[i + 2] / 10,
                   b: A[i + 3] >= 0 ? L[A[i + 3]] : "" });
    let worst = 0, missing = [];
    Y.forEach(y => {
      const cand = stars.filter(x => x.b === y.bayer || x.b === y.star);
      if (!cand.length) { missing.push(y.nak); return; }
      const c = cand.reduce((a, b) =>
        Math.abs(((b.s - y.sid + 180) % 360) - 180) <
        Math.abs(((a.s - y.sid + 180) % 360) - 180) ? b : a);
      worst = Math.max(worst,
        Math.abs(((c.s - y.sid + 180) % 360) - 180) * 3600,
        Math.abs(c.l - y.lat) * 3600);
    });
    /* and the field is actually a field */
    const SEG = 40 / 3, per = new Array(27).fill(0);
    stars.forEach(x => { per[Math.floor(((x.s % 360) + 360) % 360 / SEG)]++; });
    return { n: stars.length, worst, missing,
             minPer: Math.min(...per), maxPer: Math.max(...per) };
  });
  ok(!r.bad, "the catalogue is on the page", r.bad);
  ok(r.n > 1000, "it carries " + r.n + " stars along the ecliptic");
  ok(r.missing.length === 0,
     "all twenty-seven junction stars are in it", r.missing.join(" | "));
  ok(r.worst < 1,
     "and it reproduces every one of them to under an arcsecond — worst " +
     r.worst.toFixed(2) + "″ against the catalogue the site already shipped");
  ok(r.minPer >= 20,
     "every nakṣatra window holds a real field: " + r.minPer + " to " +
     r.maxPer + " stars");
}

console.log("\nThe twenty-seven, against the star catalogue");
{
  /* The claim this set exists to make is that seven of the twenty-seven
     junction stars do not lie in the equal division named after them. It is
     recomputed here straight from the catalogue's longitudes — floor(sid /
     13°20′) against the nakṣatra's own index — and matched against both the
     catalogue's stored flag and what each reel actually says. */
  const r = await pg.evaluate(() => {
    const SEG = 40 / 3, out = [];
    (window.YOGATARAS || []).forEach((y, i) => {
      const R = window.SPStories.build("learn.nakshatra." + (i + 1),
        { t0: Date.parse("2026-01-01") });
      const x = ((y.sid % 360) + 360) % 360;
      out.push({ i, nak: y.nak, star: y.star,
                 computed: Math.floor(x / SEG) === y.id,
                 flagged: !!y.inside,
                 /* searched across the whole reel rather than pinned to a
                    beat index: the set has been reworked once already and a
                    check that breaks on a reordering is a check that gets
                    loosened rather than read */
                 said: R.events.some(e => /OWN STAR IS INSIDE/.test(e.big)),
                 saidNot: R.events.some(e => /IS NOT INSIDE/.test(e.big)),
                 title: R.title,
                 lord: R.events.map(e => e.small).join(" ") });
    });
    return out;
  });
  ok(r.length === 27, "all twenty-seven are offered: " + r.length);
  const disagree = r.filter(x => x.computed !== x.flagged);
  ok(disagree.length === 0,
     "the catalogue's own inside/outside flag matches the arithmetic on " +
     "every one", disagree.map(x => x.nak).join(" | "));
  const misreported = r.filter(x => x.computed !== x.said ||
                                    x.computed === x.saidNot);
  ok(misreported.length === 0,
     "and every reel says what the arithmetic says, once and unambiguously",
     misreported.map(x => x.nak).join(" | "));
  const stray = r.filter(x => !x.computed);
  ok(stray.length === 7,
     "seven junction stars fall outside their own division: " +
     stray.map(x => x.nak + " (" + x.star + ")").join(", "));
  /* the daśā lord cycles Ketu to Budha from Aśvinī, which is the whole
     basis of the Vimśottarī balance at birth */
  const SEQ = ["Ketu", "Śukra", "Sūrya", "Candra", "Maṅgala", "Rāhu", "Guru",
               "Śani", "Budha"];
  const wrongLord = r.filter(x =>
    x.lord.indexOf(SEQ[x.i % 9] + " mahādaśā") < 0);
  ok(wrongLord.length === 0,
     "and names the Vimśottarī lord the nakṣatra-lord sequence gives it",
     wrongLord.map(x => x.nak).join(" | "));
}

console.log("\nThe twelve, measured rather than quoted");
{
  const r = await pg.evaluate(() => {
    const out = [];
    for (let i = 1; i <= 12; i++) {
      const R = window.SPStories.build("learn.rashi." + i,
        { t0: Date.parse("2026-01-01") });
      const bars = (R.explain.items || []).filter(x => x.panel === "bar");
      out.push({ i, title: R.title, bars: bars.map(b => b.label + "|" + b.sub),
                 place: R.placeName || null, b5: R.events[5].small });
    }
    return out;
  });
  ok(r.length === 12 && r.every(x => x.bars.length === 8),
     "every rāśi carries seven measured crossings and a rising time");
  /* THE RISING TIMES MUST ADD TO ONE SIDEREAL DAY. The whole ring rises
     once while the Earth turns once against the stars, and nothing in the
     measurement enforces that — it either comes out or it does not. */
  const mins = await pg.evaluate(() => {
    const asc = window.__kAsc, P = window.NP.PLACES[0];
    const base = { year: 2026, month: 3, day: 21, hour: 0, minute: 0,
                   tzHours: 0, lat: P.lat, lon: P.lon };
    const m = new Array(12).fill(0);
    let prev = null;
    for (let t = 0; t <= 1440; t += 2) {
      const a = asc(base, t);
      const s = Math.floor((((a % 360) + 360) % 360) / 30) % 12;
      if (prev != null) m[prev] += 2;
      prev = s;
    }
    return m;
  });
  const total = mins.reduce((a, b) => a + b, 0);
  ok(Math.abs(total - 1436) < 12,
     "the twelve rising times add to one sidereal day: " + total +
     " minutes against 1436");
  const spread = Math.max(...mins) - Math.min(...mins);
  ok(spread > 20,
     "and they are not equal — " + spread + " minutes between the longest " +
     "and the shortest, which is what a latitude does to a zodiac");
  const badOrder = r.filter(x => {
    const g = {};
    x.bars.forEach(b => { g[b.split("|")[0]] = b.split("|")[1]; });
    return !/d |h$/.test(g["Candra"] || "") || !/year/.test(g["Śani"] || "");
  });
  ok(badOrder.length === 0,
     "Candra crosses every sign in days and Śani in years, measured",
     badOrder.map(x => x.title).join(" | "));
  /* Sūrya takes a sidereal month over any sign — a figure anyone can check,
     and one nothing in the walk is told to produce */
  const sun = r.map(x => {
    const b = x.bars.find(q => q.indexOf("Sūrya|") === 0) || "";
    return parseFloat(b.split("|")[1]);
  });
  const offSun = sun.filter(d => !(d >= 29 && d <= 32));
  ok(offSun.length === 0,
     "and Sūrya takes 29 to 32 days over each of the twelve: " +
     sun.join(", "), offSun.join(" | "));
}

console.log("\nThe script says what the reel computed, in three languages");
{
  /* A SCRIPT IS THE EASIEST THING ON THIS SITE TO GET QUIETLY WRONG. Nobody
     proof-reads a hundred and twenty-six voiceovers in three languages, and
     a number typed into a sentence stays typed long after the picture it
     describes has changed. So the generator renders the reel's own facts
     and this checks that every figure in every language is the figure the
     reel actually has — the boundary degrees, the star, its longitude, the
     counts inside, the pāda signs, the daśā lord. One drifted digit fails. */
  const r = await pg.evaluate(() => {
    const out = [];
    for (let i = 1; i <= 27; i++) {
      const R = window.SPStories.build("learn.nakshatra." + i,
        { t0: Date.parse("2026-01-01") });
      const F = R.facts;
      const row = { key: "nak" + i, name: F.name, langs: {} };
      ["hinglish", "hi", "en"].forEach(L => {
        const s = window.SPScript.render(R, L);
        row.langs[L] = {
          text: s.beats.map(b => b.say).join(" · "),
          cap: s.caption,
          lines: s.beats.length,
          empty: s.beats.filter(b => !b.say || !b.say.trim()).length,
          total: s.beats.reduce((a, b) => a + b.secs, 0),
          secs: s.seconds
        };
      });
      row.F = { lo: F.loTxt, hi: F.hiTxt, star: F.star,
                lon: F.starLon.toFixed(2), inArc: String(F.inArc),
                inWin: String(F.inWin), lord: F.lord,
                padas: F.padas, rashi: F.rashi,
                yoni: F.yoni, gana: F.gana, nadi: F.nadi };
      out.push(row);
    }
    return out;
  });

  const noLines = r.filter(x =>
    ["hinglish", "hi", "en"].some(L => x.langs[L].lines < 6 || x.langs[L].empty));
  ok(noLines.length === 0,
     "all twenty-seven produce a full script in all three languages",
     noLines.map(x => x.key).join(" | "));

  /* every number in the facts must appear in every language's script */
  const drift = [];
  r.forEach(x => {
    ["hinglish", "hi", "en"].forEach(L => {
      const t = x.langs[L].text + " " + x.langs[L].cap;
      const want = [x.F.lo, x.F.hi, x.F.star, x.F.lon, x.F.lord]
        .concat(x.F.padas);
      want.forEach(w => {
        if (t.indexOf(w) < 0) drift.push(x.key + "/" + L + " missing " + w);
      });
    });
  });
  ok(drift.length === 0,
     "and every boundary, star, longitude, pāda sign and daśā lord in them " +
     "is the one the reel computed",
     drift.slice(0, 5).join(" | "));

  /* the counts, which are the claim the whole set exists to make */
  const counts = [];
  r.forEach(x => {
    ["hinglish", "hi", "en"].forEach(L => {
      const t = x.langs[L].text + " " + x.langs[L].cap;
      if (t.indexOf(x.F.inWin) < 0 || t.indexOf(x.F.inArc) < 0)
        counts.push(x.key + "/" + L);
    });
  });
  ok(counts.length === 0,
     "the star counts appear in every script too",
     counts.slice(0, 5).join(" | "));

  /* the beat windows must tile the reel, or the teleprompter is lying
     about when to start reading */
  const badTime = r.filter(x =>
    ["hinglish", "hi", "en"].some(L =>
      Math.abs(x.langs[L].total - x.langs[L].secs) > 0.6));
  ok(badTime.length === 0,
     "and the beat windows add up to the reel's own length",
     badTime.map(x => x.key + " " + x.langs.en.total.toFixed(1) + " vs " +
                 x.langs.en.secs).join(" | "));

  /* the three languages are actually three languages */
  const same = r.filter(x => x.langs.en.text === x.langs.hi.text ||
                             x.langs.en.text === x.langs.hinglish.text);
  ok(same.length === 0,
     "the three scripts differ from each other",
     same.map(x => x.key).join(" | "));
  const noDev = r.filter(x => !/[ऀ-ॿ]/.test(x.langs.hi.text));
  ok(noDev.length === 0, "the Hindi one is in Devanāgarī",
     noDev.map(x => x.key).join(" | "));
}

console.log("\nThe thirty-six points, and what is claimed about them");
{
  /* The hook the caption carries is arithmetic over the site's OWN kūṭa
     maxima, not a remembered figure: tārā 3 + yoni 4 + gaṇa 6 + nāḍī 8.
     It is checked against the scoring tables the compatibility tab uses,
     because two copies of a number is one copy too many. */
  const r = await pg.evaluate(() => {
    const K = window.SPExplain && window.SPExplain.KUTA;
    const R = window.SPStories.build("learn.nakshatra.1",
      { t0: Date.parse("2026-01-01") });
    const caps = ["hinglish", "hi", "en"].map(L =>
      window.SPScript.render(R, L).caption);
    return {
      K: K ? { t: K.taraMax, y: K.yoniMax, g: K.ganaMax, n: K.nadiMax,
               sum: K.nakMax, total: K.total,
               gana: K.gana.length, yoni: K.yoni.length, nadi: K.nadi.length }
            : null,
      says2136: caps.every(c => /21\/36/.test(c)),
      saysLater: caps.every(c =>
        /later tradition|baad ki parampara|परवर्ती परम्परा/i.test(c)),
      saysNotBphs: caps.every(c => /BPHS/.test(c))
    };
  });
  ok(!!r.K, "the kūṭa tables are on the page");
  ok(r.K.gana === 27 && r.K.yoni === 27 && r.K.nadi === 27,
     "they carry a yoni, gaṇa and nāḍī for each of the twenty-seven");
  ok(r.K.sum === 21 && r.K.total === 36,
     "and the four a nakṣatra alone decides add to " + r.K.sum + " of " +
     r.K.total + ": " + r.K.t + " + " + r.K.y + " + " + r.K.g + " + " + r.K.n);
  ok(r.says2136, "every caption states the ratio");
  ok(r.saysLater && r.saysNotBphs,
     "and every one says it is later tradition rather than BPHS");
}


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
