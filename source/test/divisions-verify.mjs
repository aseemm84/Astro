/* divisions-verify.mjs — the rāśi / nakṣatra / pāda page.
 *
 * The page makes two claims that are worth more than the drawings, and both
 * are checkable rather than decorative:
 *
 *   - a PĀDA and a NAVĀṂŚA are the same division, so the navāṃśa sign of a
 *     longitude is just its pāda index modulo twelve. That is a shortcut, and
 *     a shortcut is exactly the kind of thing that is right for the case its
 *     author tried and wrong elsewhere — so it is checked against the
 *     classical rule (movable signs count from themselves, fixed from the
 *     ninth, dual from the fifth) for all twelve signs.
 *   - one arcminute of Moon is worth so many days of daśā. The same quantity
 *     is stated on the accuracy page per ARCSECOND, so the two pages must
 *     agree to a factor of sixty or one of them is wrong.
 *
 *     THEY ONCE AGREED AND WERE BOTH WRONG. Each mapped the whole 120-year
 *     Viṃśottarī cycle onto a SINGLE nakṣatra, giving 54.8 days per arcminute
 *     and 0.913 per arcsecond; the cross-check passed because both encoded the
 *     same wrong model by different routes. Agreement between two derivations
 *     of one mistake is not corroboration. One nakṣatra is its own lord's
 *     mahādaśā, so the quantity is a range, not a scalar.
 */
import { createRequire } from "node:module";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const quiet = e => !/cities\.json|scheme "file"/.test(e);

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open() {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/divisions.html");
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector("#dv-wheel svg"),
                          null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  return { p, errs };
}

head("the three divisions are all drawn, with no chart");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    padas: document.querySelectorAll("#dv-wheel .dv-pada").length,
    naks: document.querySelectorAll("#dv-wheel .dv-nak").length,
    rasis: document.querySelectorAll("#dv-wheel .dv-rasi").length,
    strip: document.querySelectorAll("#dv-pada .dv-pstrip").length,
    lords: document.querySelectorAll("#dv-lords .dv-lstrip").length,
    rows: document.querySelectorAll("#dv-table tbody tr").length,
    now: document.querySelectorAll("#dv-nowtab tbody tr").length,
  }));
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors (" + errs.filter(quiet)[0] + ")");
  is(!r.hasChart, "no chart is stored");
  is(r.rasis === 12 && r.naks === 27 && r.padas === 108,
     "12 rāśis, 27 nakṣatras, 108 pādas (" + r.rasis + "/" + r.naks + "/" + r.padas + ")");
  is(r.strip === 108 && r.lords === 27, "both flat strips are complete");
  is(r.rows === 12, "the classification table has twelve rows");
  is(r.now === 10, "and the sky now has nine grahas and the lagna (" + r.now + ")");
}

head("a pāda IS a navāṃśa — checked against the classical rule, not assumed");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const SA = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
                "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
    /* the classical construction, written out independently: a movable sign's
       navāṃśas count from itself, a fixed sign's from the ninth sign on, and
       a dual sign's from the fifth */
    const classical = lon => {
      const sg = Math.floor(lon / 30);
      const within = Math.floor((lon - sg * 30) / (30 / 9));
      const start = sg % 3 === 0 ? sg : (sg % 3 === 1 ? (sg + 8) % 12 : (sg + 4) % 12);
      return (start + within) % 12;
    };
    /* and the page's shortcut, read off the page itself */
    const read = async lon => {
      const el = document.getElementById("dv-lon");
      el.value = String(lon); el.dispatchEvent(new Event("input", { bubbles: true }));
      await w(90);
      const cells = [...document.querySelectorAll("#dv-read .axcell b")];
      return cells[3] ? cells[3].textContent.trim() : null;
    };
    const bad = [];
    /* one sample inside every navāṃśa of every sign: 108 of them */
    for (let sg = 0; sg < 12; sg++) {
      for (let k = 0; k < 9; k++) {
        const lon = sg * 30 + k * (30 / 9) + 0.5;
        const want = SA[classical(lon)];
        const got = await read(lon);
        if (got !== want) bad.push({ lon: +lon.toFixed(2), want, got });
        if (bad.length > 3) return { bad, n: 108 };
      }
    }
    return { bad, n: 108 };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.bad.length === 0,
     "all 108 pādas give the navāṃśa the classical rule gives" +
     (r.bad.length ? " — first miss " + JSON.stringify(r.bad[0]) : ""));
}

head("the arithmetic the page derives rather than quotes");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    note: (document.getElementById("dv-padanote") || {}).textContent || "",
    perarc: (document.getElementById("dv-perarc") || {}).textContent || "",
  }));
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  /* 27 × 4 = 108 and 108 ÷ 12 = 9, so a pāda and a navāṃśa are the same width */
  const pada = /A pāda is (\d+)°(\d+)′/.exec(r.note);
  const nav = /30° ÷ 9 = (\d+)°(\d+)′/.exec(r.note);
  is(!!pada && !!nav && pada[1] === nav[1] && pada[2] === nav[2],
     "the page measures a pāda and a navāṃśa at the same width (" +
     (pada ? pada[1] + "°" + pada[2] + "′" : "?") + ")");
  /* THIS BLOCK USED TO ASSERT THE BUG, TWICE. It recomputed the rate as
     120 / (360/27), the whole 120-year cycle across ONE nakṣatra, and then
     cross-checked it against the accuracy page's 0.913 — which was the same
     error reached by a different route. Two pages agreeing is not evidence
     when both encode the same wrong model, and the comment at the top of
     this file said exactly that about shortcuts.
   *
     Correct: one nakṣatra is its own lord's mahādaśā, so the page now prints
     a RANGE, from the Sun's 6 years to Venus's 20. */
  const nums = (/([\d.]+)\s*–\s*([\d.]+) days/.exec(r.perarc) || []).slice(1).map(Number);
  const NAKW = 360 / 27;
  const perArcmin = y => y / NAKW / 60 * 365.2425;
  const wantLo = perArcmin(6), wantHi = perArcmin(20);
  is(nums.length === 2 && Math.abs(nums[0] - wantLo) < 0.1 &&
                          Math.abs(nums[1] - wantHi) < 0.1,
     "one arcminute of Moon is " + (nums.join("–") || r.perarc.slice(0, 40)) +
     " days of daśā, independently " + wantLo.toFixed(1) + "–" + wantHi.toFixed(1) +
     " (the Sun's 6 years to Venus's 20)");
  /* Cross-check against the accuracy page, now that both are right: the
     per-arcsecond span there must be this per-arcminute span over sixty. */
  const ACCJ = require("../data/accuracy.json");
  is(Math.abs(nums[0] / 60 - ACCJ.cost.dashaDaysPerArcsecMin) < 0.002 &&
     Math.abs(nums[1] / 60 - ACCJ.cost.dashaDaysPerArcsecMax) < 0.002,
     "which is " + (nums[0] / 60).toFixed(3) + "–" + (nums[1] / 60).toFixed(3) +
     " days per arcsecond — the accuracy page's " +
     ACCJ.cost.dashaDaysPerArcsecMin + "–" + ACCJ.cost.dashaDaysPerArcsecMax +
     ", reached by a different route");
  /* and neither page may drift back to the figure that shipped */
  is(nums[1] / 60 < 0.913 && ACCJ.cost.dashaDaysPerArcsecMax < 0.913,
     "neither page is back at 0.913 d/arcsec, the whole cycle over one nakṣatra");
}

head("the nakṣatra lords are the nine, three times round");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    const cells = [...document.querySelectorAll("#dv-lords .dv-lglyph")]
      .map(t => t.textContent.trim());
    const first9 = cells.slice(0, 9).join(",");
    return { n: cells.length, first9,
             repeats: cells.slice(9, 18).join(",") === first9 &&
                      cells.slice(18, 27).join(",") === first9,
             start: cells.slice(0, 3).join(",") };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.n === 27, "twenty-seven nakṣatras in the strip");
  is(r.repeats, "the second and third nines are the same nine, in the same order");
  is(r.start === "Ke,Ve,Su",
     "and it opens Ketu, Venus, Sun — Aśvinī's lord is Ketu (" + r.start + ")");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " divisions-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
