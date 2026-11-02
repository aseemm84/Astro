/* The certified window, and the band that admits when a chart is outside it.
 *
 * engine.js is checked against an independent sky over 1800–2200 and answers
 * outside that anyway, which is correct — the Sūrya Siddhānta page exists to
 * look at 500 CE, and an engine that refused would be useless for it. What was
 * wrong until now is that a chart dated 1350 came back looking exactly as
 * confident as one dated 1984, with nothing said about the difference.
 *
 * Three things have to hold, and the third is the one that would rot quietly:
 *
 * 1. INSIDE the window the report is unchanged. A caution that fires on an
 *    ordinary chart is worse than no caution, because it trains the reader to
 *    skip it.
 * 2. OUTSIDE it the band appears, names the year, and names the Moon as the
 *    limiting quantity.
 * 3. The figures the band quotes are the ones actually MEASURED, not numbers
 *    retyped into prose. Here the band is rendered and the figure it prints is
 *    parsed back out and compared against the committed wide fixture,
 *    remeasured from scratch in this file. If someone widens a band in
 *    engine.js without remeasuring, or improves the engine without updating
 *    the band, this is what notices.
 *
 * Run: node source/test/span-verify.mjs
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

function loadEngine() {
  const Astronomy = require(ROOT + "/source/vendor/astronomy.browser.min.js");
  const g = { Astronomy, console, Date, Math, JSON, parseFloat, parseInt, isNaN,
              isFinite, String, Number, Array, Object, RegExp, Error, Boolean };
  g.window = g; g.globalThis = g;
  g.document = { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }),
                 getElementById: () => null, querySelector: () => null,
                 querySelectorAll: () => [], addEventListener() {},
                 body: { appendChild() {} } };
  g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  vm.runInContext(readFileSync(ROOT + "/source/src/js/engine.js", "utf8"),
                  vm.createContext(g), { filename: "engine.js" });
  return { g, Astronomy };
}

const { g, Astronomy } = loadEngine();
const jdOfYear = y => 2451545.0 + (y - 2000) * 365.25;

console.log("The certified window and the out-of-window band");
console.log("  window: " + g.__kSpanWindow.join("–"));
console.log("  bands : " + g.__kSpanBands.map(b => b.from + "–" + b.to + " " + b.moon + "″").join(", "));

/* ---- 1. the window itself ------------------------------------------------ */

head("the window is where the engine is actually checked");
{
  const ref = JSON.parse(readFileSync(ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8"));
  const span = ref._provenance.span.split("-").map(Number);
  is(g.__kSpanWindow[0] === span[0] && g.__kSpanWindow[1] === span[1],
     "the engine's window " + g.__kSpanWindow.join("–") + " is the span the reference "
     + "fixture covers (" + ref._provenance.span + ")");
}
is(g.__kSpan(jdOfYear(1984)).inside, "1984 is inside");
is(g.__kSpan(jdOfYear(1800)).inside, "1800, the first year, is inside");
is(g.__kSpan(jdOfYear(2200)).inside, "2200, the last year, is inside");
is(!g.__kSpan(jdOfYear(1799)).inside, "1799 is outside");
is(!g.__kSpan(jdOfYear(2201)).inside, "2201 is outside");
is(!g.__kSpan(jdOfYear(500)).inside, "500 CE is outside");

head("the year label reads as a year, including before the era");
is(g.__kSpan(jdOfYear(1350)).yearLabel === "1350 CE", "1350 → “1350 CE”");
/* 21 July 500 CE is decimal year 500.55. Rounding labelled it "501 CE" — a
   date the reader never typed — which the end-to-end render caught and no unit
   check would have. Pinned in both directions now. */
is(g.__kSpan(jdOfYear(500.55)).yearLabel === "500 CE",
   "mid-year 500.55 is labelled 500 CE, not 501 (floor, not round)");
is(g.__kSpan(jdOfYear(1999.99)).yearLabel === "1999 CE",
   "and 1999.99 is 1999 CE, not 2000");
is(/BCE$/.test(g.__kSpan(jdOfYear(-500)).yearLabel),
   "a negative year is labelled BCE, not “-500 CE” (" + g.__kSpan(jdOfYear(-500)).yearLabel + ")");

head("a date past the reference's own range quotes nothing");
is(g.__kSpan(jdOfYear(1350)).measured, "1350 is inside 1000–3000, so a figure is available");
is(!g.__kSpan(jdOfYear(500)).measured, "500 CE has no measured figure");
is(g.__kSpan(jdOfYear(500)).moonArcsec === null,
   "and the figure is null rather than an invented number");
is(!g.__kSpan(jdOfYear(3500)).measured, "3500 CE has no measured figure either");

/* ---- 2. the band, rendered --------------------------------------------- */

head("the band fires outside the window and never inside it");
/* The band lives in the report bundle, which is one concatenated closure, so
   it is exercised through the built page's own copy rather than re-imported.
   Pulling the two functions out of the built file is enough: they depend only
   on esc() and window.__kSpan, both of which are supplied here. */
const built = readFileSync(ROOT + "/kundli.html", "utf8");
function lift(name) {
  const at = built.indexOf("\nfunction " + name + "(");
  if (at < 0) return null;
  let i = built.indexOf("{", at), depth = 0, end = -1;
  for (let j = i; j < built.length; j++) {
    if (built[j] === "{") depth++;
    else if (built[j] === "}") { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  return built.slice(at, end);
}
const srcArc = lift("arcLabel"), srcSec = lift("secLabel"), srcBand = lift("spanBand");
is(!!srcArc && !!srcSec && !!srcBand,
   "arcLabel, secLabel and spanBand are all present in the built page");

const sandbox = {
  window: { __kSpan: g.__kSpan }, Math, String, Number, console,
  esc: s => String(s == null ? "" : s).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
};
vm.createContext(sandbox);
vm.runInContext(srcArc + "\n" + srcSec + "\n" + srcBand + "\n", sandbox);
const band = y => sandbox.spanBand({ jd: jdOfYear(y) });

is(band(1984) === "", "1984 renders no band at all");
is(band(2000) === "" && band(1800) === "" && band(2200) === "",
   "neither edge of the window renders a band");
for (const y of [1350, 1700, 2400, 2800]) {
  const b = band(y);
  is(b.indexOf("Outside the checked window") >= 0 && b.indexOf(String(y)) >= 0,
     y + " renders a band naming the year");
}
is(band(1350).indexOf("The Moon is the limit") >= 0,
   "the band names the Moon as the limiting quantity, not the ayanāṃśa");
is(band(1350).indexOf("ayanāṃśa is not the limit") >= 0,
   "and says plainly that the ayanāṃśa is not the limit, so no one tightens the wrong thing");
is(band(500).indexOf("deliberately") >= 0 && band(500).indexOf("worse than silence") >= 0,
   "500 CE says no figure is quoted and why, instead of quoting one");
is(band(1350).indexOf("disagreement") >= 0 && band(1350).indexOf("not an error") >= 0,
   "the band calls it a disagreement rather than an engine error");
is(band(1350).indexOf("still cast in full") >= 0,
   "the band says the chart is still cast — it is a disclosure, not a refusal");

/* ---- 3. the quoted figure is the measured one -------------------------- */

head("every quoted figure is remeasured here, from the fixture that samples it best");
{
  /* EACH BAND IS PAIRED WITH A FIXTURE, and the pairing matters. The certified
     window is certified by the DENSE 400-sample fixture; the wide fixture
     happens to place 60 samples inside it, and remeasuring the window from
     those 60 is how the certified Moon figure came to be quoted as 10″ when
     the dense fixture measures 14.8″. Every band now names its reference and
     this check uses the one it names. */
  const fixtures = {
    dense: JSON.parse(readFileSync(ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8")),
    wide: JSON.parse(readFileSync(ROOT + "/source/test/fixtures/reference-ecliptic-wide.json", "utf8")),
  };
  const sdiff = (a, b) => { const d = ((a - b) % 360 + 360) % 360; return d > 180 ? d - 360 : d; };
  const ttUt = jdTT => { const w = jdTT - 2451545.0; let ut = w;
    for (let i = 0; i < 4; i++) ut -= (Astronomy.MakeTime(ut).tt - w); return ut; };
  /* The rate at which the condition closes, measured locally rather than
     assumed: a tithi/yoga/karaṇa boundary is the Moon's ELONGATION from the
     Sun, a nakṣatra boundary the Moon alone. Taking the slowest rate over the
     band turns an arcsecond error into the worst-case seconds of time. */
  const rate = (ms, elong) => {
    const h = 600000;
    const at = t => elong
      ? sdiff(g.__kEclip("Moon", t).trop, g.__kEclip("Sun", t).trop)
      : g.__kEclip("Moon", t).trop;
    let d = at(ms + h) - at(ms - h);
    if (d > 180) d -= 360; if (d < -180) d += 360;
    return Math.abs(d * 3600 / (2 * h / 1000));
  };

  const m = {};
  for (const b of g.__kSpanBands) {
    const key = b.from + "-" + b.to;
    m[key] = { moon: 0, el: 0, elRate: Infinity, moRate: Infinity, n: 0 };
    for (const s of fixtures[b.ref].samples) {
      const y = +s.iso.slice(0, 4);
      if (y < b.from || y > b.to) continue;
      const ms = (ttUt(s.jdTT) + 2451545.0 - 2440587.5) * 86400000;
      const eE = sdiff(g.__kEclip("Moon", ms).trop, g.__kEclip("Sun", ms).trop);
      const eR = sdiff(s.bodies.Moon.lon, s.bodies.Sun.lon);
      m[key].moon = Math.max(m[key].moon, Math.abs(sdiff(g.__kEclip("Moon", ms).trop, s.bodies.Moon.lon)) * 3600);
      m[key].el = Math.max(m[key].el, Math.abs(sdiff(eE, eR)) * 3600);
      m[key].elRate = Math.min(m[key].elRate, rate(ms, true));
      m[key].moRate = Math.min(m[key].moRate, rate(ms, false));
      m[key].n++;
    }
    m[key].instant = Math.ceil(m[key].el / m[key].elRate);
    m[key].nak = Math.ceil(m[key].moon / m[key].moRate);
  }

  console.log("  band         ref      n   Moon″ quoted/meas   tithi s q/m    nakṣatra s q/m");
  for (const b of g.__kSpanBands) {
    const k = b.from + "-" + b.to, r = m[k];
    console.log("  " + k.padEnd(12) + b.ref.padEnd(8) + String(r.n).padStart(4)
      + ("   " + b.moon + " / " + r.moon.toFixed(1)).padEnd(19)
      + ("  " + b.instant + " / " + r.instant).padEnd(15)
      + "  " + b.nak + " / " + r.nak);
    is(r.n >= 40, k + ": its named fixture actually samples it (" + r.n + " samples)");
    /* Each quoted figure must bound its measurement and not wildly overstate
       it — a band quoting 600″ where 73″ was measured would be as useless as
       one quoting 10″. */
    for (const [label, q, meas] of [["Moon", b.moon, r.moon],
                                    ["tithi-end", b.instant, r.instant],
                                    ["nakṣatra-end", b.nak, r.nak]]) {
      is(meas <= q, k + " " + label + ": quoted " + q + " bounds the remeasured "
         + (typeof meas === "number" ? meas.toFixed(1) : meas));
      is(meas >= q * 0.5, k + " " + label + ": and does not overstate it ("
         + (typeof meas === "number" ? meas.toFixed(1) : meas) + " ≥ half of " + q + ")");
    }
  }
}

head("the band's own arithmetic, and what it no longer does");
{
  const S = g.__kSpan(jdOfYear(1350));
  /* It used to divide the Moon figure by 0.55″/s. That is the Moon's own rate,
     not the elongation's, and it understated 1000–1399 by about a fifth. The
     time figures are measured now, so this asserts they are NOT that quotient. */
  is(Math.abs(S.tithiSeconds - S.moonArcsec / 0.55) > 10,
     "the tithi figure is measured, not the Moon figure over 0.55″/s ("
     + S.tithiSeconds + " s, not " + Math.round(S.moonArcsec / 0.55) + " s)");
  is(S.tithiSeconds > S.nakSeconds,
     "a tithi boundary is looser than a nakṣatra one, because the elongation closes "
     + "more slowly than the Moon moves (" + S.tithiSeconds + " s vs " + S.nakSeconds + " s)");
  is(Math.abs(S.d60Fraction - S.moonArcsec / 1800) < 1e-9,
     "the D60 figure is the Moon figure over an 1800″ aṃśa (" + S.d60Fraction.toFixed(3) + ")");
  const inside = g.__kSpan(jdOfYear(1984));
  is(inside.tithiSeconds < 60 && inside.nakSeconds < 60,
     "inside the window both timing figures are under a minute (" + inside.tithiSeconds
     + " s, " + inside.nakSeconds + " s) — which is why printing to the minute is honest");
}

/* ---- 4. the band is VISIBLE, not merely present ------------------------
   The first version pushed the band onto the Full report only. It was in the
   DOM and in no visible tab, so innerHTML found it and a reader never would.
   Everything above would have passed. This casts real charts in a browser and
   reads innerText, which excludes hidden subtrees — the one check that can
   tell a disclosure from a disclosure-shaped string.                        */

head("the band is visible on the tab a reader lands on");
{
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  async function cast(dob) {
    const p = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    const errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto("file://" + ROOT + "/kundli.html");
    await p.waitForFunction(() => !!document.getElementById("k-go"), null, { timeout: 25000 });
    await p.evaluate(d => {
      try { localStorage.clear(); } catch (e) {}
      document.getElementById("k-dob").value = d;
      document.getElementById("k-tob").value = "13:31";
      document.getElementById("k-lat").value = "28.8389";
      document.getElementById("k-lon").value = "78.7768";
      document.getElementById("k-tz").value = "5.5";
    }, dob);
    await p.click("#k-go");
    await p.waitForFunction(() => !!document.getElementById("kreport"), null, { timeout: 45000 });
    await p.waitForTimeout(900);
    const text = await p.evaluate(() => document.getElementById("kreport").innerText);
    await p.close();
    return { text, errs };
  }

  const ordinary = await cast("1984-12-15");
  is(ordinary.text.indexOf("Outside the checked window") < 0,
     "an ordinary 1984 chart shows no band in the visible text");
  is(ordinary.errs.length === 0, "and casts with no page errors");

  for (const [dob, label, expect] of [
    ["1350-06-15", "1350 CE", "3.4′"],
    ["2400-03-09", "2400 CE", "56″"],
    ["0500-07-21", "500 CE", null],
  ]) {
    const r = await cast(dob);
    const seen = r.text.indexOf("Outside the checked window — " + label) >= 0;
    is(seen, dob + " shows a VISIBLE band reading “" + label + "”");
    is(r.errs.length === 0, dob + " casts with no page errors");
    if (expect) is(r.text.indexOf("differs by up to " + expect) >= 0,
      dob + " quotes the measured figure in the visible text (" + expect + ")");
    else is(r.text.indexOf("worse than silence") >= 0,
      dob + " states that no figure is quoted, in the visible text");
  }
  /* ---- the tolerance line on the pages that print instants --------------
     Nothing on this site printed a computed instant to the second — that part
     of the job was already right. What was missing is that an unqualified
     "05:42" reads as exact. Both pages now say how exact, from the engine's
     measured figures. Checked in innerText for the same reason as the band:
     present and invisible is the failure mode that already happened once. */

  head("the pages that print end-times say how exact they are");
  {
    const inside = g.__kSpan(jdOfYear(2026));
    async function pageText(file, prep) {
      const p = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
      const errs = []; p.on("pageerror", e => errs.push(e.message));
      await p.goto("file://" + ROOT + "/" + file);
      await p.waitForTimeout(2500);
      if (prep) await prep(p);
      const text = await p.evaluate(() => document.body.innerText);
      await p.close();
      return { text, errs };
    }

    const now = await pageText("now.html");
    is(now.errs.length === 0, "now.html loads with no page errors");
    is(now.text.indexOf("How exact these are") >= 0,
       "now.html shows the tolerance note in visible text");
    is(now.text.indexOf(inside.tithiSeconds + " seconds") >= 0,
       "and quotes the engine's measured " + inside.tithiSeconds + "-second tithi figure");
    is(now.text.indexOf(inside.nakSeconds + " seconds") >= 0,
       "and the measured " + inside.nakSeconds + "-second nakṣatra figure");

    const cal = await pageText("calendar.html");
    is(cal.errs.length === 0, "calendar.html loads with no page errors");
    is(cal.text.indexOf("How exact the end-times are") >= 0,
       "calendar.html shows the tolerance note in visible text");
    is(cal.text.indexOf(inside.tithiSeconds + " seconds") >= 0,
       "and quotes the measured figure for a present-day year");

    /* The calendar REFUSES outside its range where the chart engine DISCLOSES,
       and that split is deliberate: a month grid of end-times nobody should
       rely on is not worth printing, whereas a chart for 500 CE is. The split
       also means the calendar's note needs no out-of-window branch — such a
       branch would be unreachable code masquerading as a safeguard. Pinned
       here so neither half drifts: the refusal must happen, and it must say
       the range. */
    {
      const p = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
      const errs = []; p.on("pageerror", e => errs.push(e.message));
      await p.goto("file://" + ROOT + "/calendar.html");
      await p.waitForTimeout(2500);
      const guard = await p.evaluate(() => {
        const y = document.getElementById("cyearin");
        const before = y.value, min = y.min, max = y.max;
        y.value = "1600";
        y.dispatchEvent(new Event("change", { bubbles: true }));
        return { before: before, after: y.value, min: min, max: max };
      });
      await p.close();
      is(errs.length === 0, "calendar.html survives being sent to 1600");
      is(guard.min === "1800" && guard.max === "2200",
         "the year input declares the range on itself (min " + guard.min
         + ", max " + guard.max + ")");
      is(guard.after === guard.before,
         "and a year outside it is rejected and snapped back (" + guard.after
         + "), so the grid never renders end-times the engine cannot stand behind");
    }
  }

  await browser.close();
}

console.log("\n" + (fail ? "FAIL" : "PASS") + " span-verify — " + pass + " passed, "
            + fail + " failed");
process.exit(fail ? 1 : 0);
