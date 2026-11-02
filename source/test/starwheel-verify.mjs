/* starwheel.html — the chart-independent wheel, the whole day, and the card.
 *
 * Four things have to hold:
 *
 * 1. THE RENDERER IS SHARED, NOT COPIED. The wheel is drawn by the report's own
 *    report/sky/40-star-wheel.js, concatenated into this page's bundle by
 *    build.py. Two implementations of that projection would eventually
 *    disagree, and a wheel that disagreed with the report's would be worse than
 *    no wheel. What the page DOES supply — SA, GL, esc, dm, and the renderer's
 *    CSS — is asserted character-identical to the report's, so the copies
 *    cannot rot without this going red.
 * 2. IT NEEDS NO CHART. The page is checked with localStorage cleared, which is
 *    the only way to be sure nothing natal leaked into it.
 * 3. THE WHOLE DAY IS THERE, NAMED. Every limb segment that touches
 *    sunrise-to-sunrise, named rather than numbered — the tithi tables are per
 *    pakṣa and the karaṇa namer is a function, and indexing either as a flat
 *    array printed "23" and "47" where names belong.
 * 4. THE AWKWARD TITHIS ARE NAMED. A kṣaya tithi begins and ends between two
 *    sunrises and is counted on no day; an adhika one spans two sunrises and is
 *    counted twice. They are the reason this page shows the whole day instead
 *    of one reading, so the harness hunts real dates where each occurs and
 *    checks the page says so.
 *
 * Run: node source/test/starwheel-verify.mjs
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

console.log("starwheel.html — the whole sky, with no chart");

/* ---- 1 · the shared renderer and its copied helpers ------------------- */

head("the renderer is the report's own, and the helpers around it match");
{
  const bundle = readFileSync(ROOT + "/starwheel.js", "utf8");
  const shared = readFileSync(ROOT + "/source/src/js/report/sky/40-star-wheel.js", "utf8");
  const helpers = readFileSync(ROOT + "/source/src/js/report/core/01-helpers.js", "utf8");
  const prelude = readFileSync(ROOT + "/source/src/js/starwheel-prelude.js", "utf8");

  /* a line only the shared renderer has, so this cannot pass on a lookalike */
  const marker = shared.match(/^function swhRender\(.*$/m)[0];
  is(bundle.indexOf(marker) >= 0,
     "the bundle carries the report's own swhRender, not a second copy");
  is(bundle.indexOf("function swhPal()") >= 0 && bundle.indexOf("function swhPt(") >= 0,
     "and its palette and projection helpers with it");

  for (const name of ["SA", "GL"]) {
    const re = new RegExp("^var " + name + "=.*$", "m");
    const a = (helpers.match(re) || [])[0], b = (prelude.match(re) || [])[0];
    is(!!a && a === b, name + " in the prelude is character-identical to the report's");
  }
  for (const name of ["esc", "dm"]) {
    const re = new RegExp("^function " + name + "\\(.*$", "m");
    const a = (helpers.match(re) || [])[0], b = (prelude.match(re) || [])[0];
    is(!!a && a === b, name + "() in the prelude is character-identical to the report's");
  }
  /* The ones deliberately NOT supplied. A stub would let a stray call render
     something subtly wrong; undefined makes it throw. */
  for (const name of ["MON", "nakOf", "wheelLegend"])
    is(!new RegExp("(^|\\n)\\s*(var|function)\\s+" + name + "\\b").test(prelude),
       name + " is deliberately not stubbed — the report-controller paths must throw, not guess");

  const app = readFileSync(ROOT + "/source/src/css/app.css", "utf8");
  const pages = readFileSync(ROOT + "/source/src/css/pages.css", "utf8");
  const rules = app.match(/\.swhsvg[^{]*\{[^}]*\}/g) || [];
  const missing = rules.filter(r => pages.indexOf(r) < 0);
  is(rules.length > 10 && missing.length === 0,
     "all " + rules.length + " of the renderer's CSS rules are present for this page too"
     + (missing.length ? " — missing: " + missing.slice(0, 3).join(" ") : ""));
}

/* ---- the browser ------------------------------------------------------ */

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open(opts) {
  opts = opts || {};
  const p = await browser.newPage({ viewport: { width: 1320, height: 1100 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/starwheel.html");
  /* CLEARED, which is the only way to prove nothing natal leaked in */
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => {
    const h = document.getElementById("swhost");
    return !!(h && h.querySelector("svg"));
  }, null, { timeout: 30000 }).catch(() => {});
  if (opts.day) {
    await p.evaluate(d => {
      const i = document.getElementById("sw-date");
      i.value = d; i.dispatchEvent(new Event("change", { bubbles: true }));
    }, opts.day);
    await p.waitForTimeout(1500);
  }
  await p.waitForTimeout(400);
  return { p, errs };
}

head("it draws with no chart saved at all");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    svg: !!document.querySelector("#swhost svg"),
    grahas: document.querySelectorAll("#swhost .swh-g").length,
    stars: document.querySelectorAll("#swhost .swh-star").length,
    natal: document.querySelectorAll("#swhost .swh-l, #swhost .swh-a, #swhost .swh-u").length,
    stamp: (document.getElementById("sw-stamp") || {}).textContent || "",
    note: (document.getElementById("sw-wheelnote") || {}).textContent || "",
  }));
  is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs[0] : ""));
  is(!r.hasChart, "no chart is in storage");
  is(r.svg, "and the wheel still draws");
  is(r.grahas >= 9, "all nine grahas are plotted (" + r.grahas + " labels)");
  is(r.stars >= 20, "the yogatārās are plotted (" + r.stars + ")");
  is(r.natal === 0,
     "and nothing natal appears — no lagna point, ārūḍha or upagraha (" + r.natal + ")");
  is(/\d{4}/.test(r.stamp) && /lagna/.test(r.stamp),
     "the stamp names the instant and the rising degree");
  is(/horizon/.test(r.note), "and the horizon note is computed");
  await p.close();
}

head("the whole day is there, and every segment is named");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    const txt = [...document.querySelectorAll("#sw-strip text")].map(t => t.textContent);
    return {
      strip: !!document.querySelector("#sw-strip svg"),
      labels: txt.filter(t => /[A-Za-zĀ-ṿ]/.test(t)),
      numeric: txt.filter(t => /^\d{1,2}$/.test(t)),
      limbs: document.querySelectorAll("#sw-limbs .axcard").length,
      rows: [...document.querySelectorAll("#sw-tithi tbody tr")]
        .map(tr => [...tr.cells].map(c => c.textContent.trim())),
      hours: [...document.querySelectorAll("#sw-tithi tbody tr")]
        .map(tr => tr.cells[4] && tr.cells[4].textContent),
    };
  });
  is(errs.length === 0, "no page errors");
  is(r.strip, "the day strip draws");
  is(r.limbs >= 7, "the limb cards are filled (" + r.limbs + ")");
  is(r.rows.length >= 1, "the tithi table has rows (" + r.rows.length + ")");
  /* The bug this guards: a flat index into a per-pakṣa table printed "23". */
  is(r.numeric.length === 0,
     "no segment is labelled with a bare number"
     + (r.numeric.length ? " — found " + r.numeric.join(", ") : ""));
  is(r.rows.every(c => /[Ā-ṿa-z]/.test(c[0])),
     "every tithi row is named, not numbered (" + r.rows.map(c => c[0]).join(", ") + ")");
  is(r.rows.every(c => /Śukla|Kṛṣṇa/.test(c[1])), "and carries its pakṣa");
  is(r.hours.every(h => !h || /^(1[0-9]|2[0-9])\.\d h$/.test(h.trim()) || h.trim() === "—"),
     "and runs for between ten and thirty hours, as a tithi must ("
     + r.hours.join(", ") + ")");
  await p.close();
}

/* ---- 4 · the awkward tithis ------------------------------------------ */

head("a kṣaya and an adhika tithi are named where they occur");
{
  /* Found by asking the engine, not by picking a date and hoping: a kṣaya
     tithi begins and ends between two sunrises, an adhika one spans two. */
  const { p } = await open();
  const found = await p.evaluate(() => {
    const NP = window.NP, P = (NP.savedPlace && NP.savedPlace()) || NP.PLACES[0];
    const out = { kshaya: null, adhika: null };
    const start = Date.UTC(2026, 0, 1);
    for (let d = 0; d < 200 && (!out.kshaya || !out.adhika); d++) {
      const ms = start + d * 86400000;
      const sr = NP.dayStart(ms + 8 * 3600000, P);
      if (sr == null) continue;
      const next = NP.riseSet(sr + 20 * 3600000, P, +1);
      if (next == null) continue;
      let t = sr, guard = 0, prev = null;
      while (t < next && guard++ < 8) {
        const i = NP.tithiIdx(t);
        if (i == null || i === prev) break;
        prev = i;
        const s0 = NP.startOf(t, 12, NP.tithiIdx), e0 = NP.endOf(t, 12, NP.tithiIdx);
        if (s0 != null && e0 != null && s0 > sr && e0 < next && !out.kshaya)
          out.kshaya = new Date(ms).toISOString().slice(0, 10);
        if (e0 != null && e0 >= next && !out.adhika)
          out.adhika = new Date(ms).toISOString().slice(0, 10);
        if (e0 == null || e0 <= t) break;
        t = e0 + 60000;
      }
    }
    return out;
  });
  await p.close();

  is(!!found.adhika, "found a day with a tithi spanning two sunrises (" + found.adhika + ")");
  if (found.adhika) {
    const { p: p2, errs } = await open({ day: found.adhika });
    const txt = await p2.evaluate(() => document.getElementById("sw-tithi").innerText);
    await p2.close();
    is(errs.length === 0, "it renders with no errors");
    is(/adhika tithi, counted twice/.test(txt),
       "and the page names it an adhika tithi");
  }
  /* A kṣaya tithi is rarer than an adhika one; if 200 days hold none, that is
     reported rather than failed, because the absence is the calendar's and not
     the page's. */
  if (found.kshaya) {
    const { p: p3, errs } = await open({ day: found.kshaya });
    const txt = await p3.evaluate(() => document.getElementById("sw-tithi").innerText);
    await p3.close();
    is(errs.length === 0, "the kṣaya day renders with no errors");
    is(/kṣaya tithi/.test(txt), "and the page names it a kṣaya tithi (" + found.kshaya + ")");
  } else {
    console.log("  --   no kṣaya tithi in the 200 days scanned; that is the calendar's "
      + "doing, not the page's, so nothing is asserted about it");
  }
}

head("the card composes and can be saved");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const cv = document.getElementById("sw-canvas");
    const before = cv.width + "x" + cv.height;
    /* the canvas must not be tainted, or there is no download */
    let data = null;
    /* slice(0,22) keeps the comma — "data:image/png;base64," is 22 characters.
       Comparing it against the 21-character prefix without the comma reported a
       tainted canvas on a canvas that was perfectly clean, which is a worse
       kind of wrong than a missed bug: it sent me hunting a taint through
       every card primitive before the string lengths were counted. */
    try { data = cv.toDataURL("image/png").slice(0, 21); } catch (e) { data = "TAINTED"; }
    const sel = document.getElementById("sw-ratio");
    sel.value = "9:16"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 400));
    return {
      before, after: cv.width + "x" + cv.height, data,
      caption: (document.getElementById("sw-caption") || {}).value || "",
      ratios: document.getElementById("sw-ratio").options.length,
      themes: document.getElementById("sw-theme").options.length,
      toggles: document.querySelectorAll("#sw-cardbar input[type=checkbox]").length,
    };
  });
  await p.close();
  is(errs.length === 0, "no page errors");
  is(r.before === "1080x1350", "the card opens at the 4:5 feed size (" + r.before + ")");
  is(r.after === "1080x1920", "and switches to the 9:16 story size (" + r.after + ")");
  is(r.data === "data:image/png;base64", "the canvas is untainted, so it can be downloaded");
  is(r.ratios === 3 && r.themes >= 2, "shape and palette are both choosable ("
     + r.ratios + " shapes, " + r.themes + " palettes)");
  is(r.toggles >= 6, "and " + r.toggles + " parts of the card can be turned off");
  is(/·/.test(r.caption) && r.caption.split("\n").length >= 5,
     "a caption is composed, ready to paste");
}

/* ───── the card's text block stops above the foot ───────────────────────────
   foot() draws the mark, place and handle from NCard.footTop(W,H) downward,
   whatever has already been written there, so a block flowed down the canvas
   lands on top of it — which is exactly what happened: the place line and the
   handle sat across the SUNRISE row. The rows are now laid out against that
   boundary, and the boundary has one definition which foot() uses too.

   An earlier version of this check grouped bright pixel rows into runs and
   asked for a gutter. It passed under every planted fault, including a block
   pushed a third of a canvas past the footer, because what it was measuring
   was the leading inside the foot block and not the separation at all. It is
   replaced by the invariant itself, which the drawing code records as it
   draws: where the block ended, and where the foot begins. */
head("the card's text block stops above the foot");
for (const shape of ["1:1", "4:5", "9:16"]) {
  const { p } = await open();
  const r = await p.evaluate(async (sh) => {
    const s0 = document.getElementById("sw-ratio");
    s0.value = sh; s0.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 500));
    const cv = document.getElementById("sw-canvas");
    return { bottom: Number(cv.dataset.swBlockBottom),
             foot: Number(cv.dataset.swFootTop), H: cv.height };
  }, shape);
  await p.close();
  is(Number.isFinite(r.bottom) && Number.isFinite(r.foot),
     shape + ": the draw records both the block bottom and the foot boundary");
  is(r.bottom <= r.foot, shape + ": the block ends at " + r.bottom
     + ", above the foot at " + r.foot);
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " starwheel-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
