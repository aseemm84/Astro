/* accuracy.html — that it says what the engines measure, and nothing else.
 *
 * A page about accuracy whose numbers were typed into its prose would be the
 * worst file in the repository. So four things have to hold:
 *
 * 1. THE DATA IS CURRENT. The generator is rerun into a scratch file and
 *    compared against the committed one, so a figure the engines no longer
 *    produce cannot sit on the page.
 * 2. NO FIGURE IS TYPED INTO THE PROSE. The page source is scanned for
 *    arcsecond, arcminute, degree and sample-count literals outside the data
 *    block. This is the check that actually enforces the promise the page
 *    opens with, and it is deliberately strict.
 * 3. THE FIGURES ARE THE HARNESSES' FIGURES. The ones the page leans on are
 *    cross-checked against the fixtures and the fitted-tier file directly.
 * 4. IT RENDERS, VISIBLY, WITH NO ERRORS. Eleven blocks, in a real browser,
 *    read from innerText — because a chart that renders into a hidden subtree
 *    passes every other check and reaches nobody.
 *
 * Run: node source/test/accuracy-verify.mjs
 */

import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

const DATA = ROOT + "/source/data/accuracy.json";
const D = JSON.parse(readFileSync(DATA, "utf8"));
const PAGE = readFileSync(ROOT + "/source/src/pages/accuracy.html", "utf8");

console.log("accuracy.html — the figures it draws");
console.log("  " + D._provenance.denseSamples + " dense + " + D._provenance.wideSamples
            + " wide samples, generated " + D._provenance.generated);

/* ---- 1 · the data is current ------------------------------------------ */

head("the committed figures are what the engines produce now");
{
  const dir = mkdtempSync(join(tmpdir(), "acc-"));
  const out = join(dir, "regen.json");
  let ok = false, why = "";
  try {
    execFileSync("node", [ROOT + "/source/test/make-accuracy-data.mjs", out],
                 { cwd: ROOT, stdio: "pipe" });
    const a = JSON.parse(readFileSync(DATA, "utf8"));
    const b = JSON.parse(readFileSync(out, "utf8"));
    /* the date stamp is the one field allowed to differ */
    delete a._provenance.generated; delete b._provenance.generated;
    ok = JSON.stringify(a) === JSON.stringify(b);
    if (!ok) {
      for (const k of Object.keys(b))
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) why += " " + k;
      why = " — differs in:" + why;
    }
  } catch (e) { why = " (" + String(e.message).split("\n")[0] + ")"; }
  rmSync(dir, { recursive: true, force: true });
  is(ok, "regenerating reproduces the committed file, bar its date stamp" + why);
}

/* ---- 2 · nothing is typed into the prose ------------------------------ */

head("not one figure is written into the page");
{
  /* Strip the data block and look at what a reader sees. A bare number with a
     unit on it, in prose that promises every figure is measured, is the exact
     thing this page must not contain — so the scan is for the units, not for
     digits in general: chapter numbers, years and the 120-year Viṃśottarī
     cycle are prose about the tradition, not measurements of this engine. */
  const body = PAGE.replace(/\{\{DATA:[a-z0-9-]+\}\}/g, "")
                   .replace(/<script[\s\S]*?<\/script>/g, "");
  const PATTERNS = [
    [/\d+(\.\d+)?\s*(&Prime;|″)/g, "an arcsecond figure"],
    /* Not preceded by a degree sign: "359°50′" and "3°20′" are a longitude and
       a division, both definitions rather than measurements of this engine. */
    [/(?<!(&deg;|°)\s?)\b\d+(\.\d+)?\s*(&prime;|′)/g, "an arcminute figure"],
    [/\d+\.\d+\s*(&deg;|°)/g, "a fractional-degree figure"],
    [/\b\d{3,4}\s+(instants|samples)\b/g, "a sample count"],
  ];
  const found = [];
  for (const [re, what] of PATTERNS) {
    const m = body.match(re);
    if (m) found.push(what + ": " + [...new Set(m)].slice(0, 5).join(", "));
  }
  is(found.length === 0,
     "no measured figure appears in the prose — every one arrives from the data"
     + (found.length ? "\n         " + found.join("\n         ") : ""));
  is(/\{\{DATA:accuracy\}\}/.test(PAGE),
     "the page inlines its data rather than fetching it, so it works from file://");
  is(!/fetch\s*\(|XMLHttpRequest/.test(
       readFileSync(ROOT + "/source/src/js/accuracy.js", "utf8")),
     "and its script makes no network call of any kind");
}

/* ---- 3 · the figures are the harnesses' figures ----------------------- */

head("the figures cross-check against the fixtures");
{
  const dense = JSON.parse(readFileSync(
    ROOT + "/source/test/fixtures/reference-ecliptic.json", "utf8"));
  const wide = JSON.parse(readFileSync(
    ROOT + "/source/test/fixtures/reference-ecliptic-wide.json", "utf8"));
  const fitted = JSON.parse(readFileSync(
    ROOT + "/source/data/siddhanta-measured.json", "utf8"));

  is(D._provenance.denseSamples === dense.samples.length,
     "the dense sample count matches the fixture (" + dense.samples.length + ")");
  is(D._provenance.wideSamples === wide.samples.length,
     "and the wide one (" + wide.samples.length + ")");
  is(D.moonCurve.length === wide.samples.length,
     "the band curve has a point per wide sample");
  for (const b of D.modern.perBody)
    is(b.referenceOwnError === dense._provenance.referenceAccuracyArcsec[b.en],
       b.sa + " carries the reference's own documented error (" + b.referenceOwnError + "″)");
  for (const m of D.siddhanta.measured)
    is(m.measuredRms === fitted.residuals[m.sa].holdout.rms,
       m.sa + "'s measured figure is the fit's own holdout rms (" + m.measuredRms + "′)");
  is(D.siddhanta.lunarDiagnostic.amplitudeArcmin.evection
       === fitted.lunarDiagnostic.amplitudeArcmin.evection,
     "the evection amplitude is the fit's, not a retyped one");
  is(D.siddhanta.fitProvenance.holdoutSamples === fitted._provenance.holdoutSamples,
     "and the holdout count is the fit's (" + fitted._provenance.holdoutSamples + ")");
}

head("the capabilities are counted from the build, not kept by hand");
{
  const K = D.capabilities;
  is(/Counted from the built/.test(K.note),
     "the capabilities block says it is counted from the artefact");
  const famTotal = K.families.reduce((p, f) => p + f.count, 0);
  is(famTotal === K.reportSections,
     "the families sum exactly to the " + K.reportSections + " sections (" + famTotal + ")");
  is(K.unclassified.length === 0,
     "every section falls into a family"
     + (K.unclassified.length ? " — stray: " + K.unclassified.join(", ") : ""));
  /* The same counts, taken straight from the built files here, so a page that
     overstated its own scope would fail rather than impress. */
  const built = readFileSync(ROOT + "/kundli.html", "utf8");
  const secs = new Set([...built.matchAll(/sec\("([^"]{2,46})"/g)].map(m => m[1]));
  is(K.reportSections === secs.size,
     "the section count re-counts from kundli.html (" + secs.size + ")");
  const eng = readFileSync(ROOT + "/source/src/js/engine.js", "utf8");
  is(K.vargas === (eng.match(/case "D\d+":/g) || []).length,
     "the varga count re-counts from the engine (" + K.vargas + ")");
  is(K.tabNames.length === K.tabs && K.tabs >= 10,
     "the tab names and count agree (" + K.tabs + ")");
  is(K.reach.length >= 4 && K.reach.every(r => r.from < r.to && r.note),
     "every reach span runs forwards and carries its own note");
  is(K.pipeline.length >= 6 && K.pipeline.every(p => p.step && p.detail),
     "the pipeline has " + K.pipeline.length + " steps, each with its detail");
}

head("the derived costs are arithmetic on the measured residual");
{
  const moon = D.modern.perBody.find(b => b.en === "Moon").lonWorst;
  const NAK = (40 / 3) * 3600;
  is(Math.abs(D.cost.dashaDaysPerArcsec - 120 * 365.2425 / NAK) < 1e-3,
     "daśā days per arcsecond is 120 years over one nakṣatra ("
     + D.cost.dashaDaysPerArcsec + ")");
  is(Math.abs(D.cost.mahadashaDays - moon * D.cost.dashaDaysPerArcsec) < 0.02,
     "the mahādaśā figure is that times the Moon's residual ("
     + D.cost.mahadashaDays.toFixed(2) + " days)");
  /* The error this guards against, which I made in prose earlier: dividing by
     the Moon's own daily motion instead of mapping the nakṣatra onto the
     120-year cycle gives an answer about 500× too small. */
  const wrong = moon / (13.176 * 3600 / 86400) / 86400;
  is(D.cost.mahadashaDays / wrong > 100,
     "and is not the Moon's daily motion by mistake, which would give "
     + wrong.toFixed(3) + " days instead of " + D.cost.mahadashaDays.toFixed(1));
  is(D.divisions.every(d => d.moonFraction === Math.round(d.arcsec / moon)),
     "every division fraction is its width over the Moon's residual");
  is(D.ayanamsa.spreadDeg
       === Math.round((D.ayanamsa.modes[D.ayanamsa.modes.length - 1].deg
                       - D.ayanamsa.modes[0].deg) * 1000) / 1000,
     "the ayanāṃśa spread is the range of the modes themselves ("
     + D.ayanamsa.spreadDeg + "°)");
  is(D.ayanamsa.exactToSwiss === 9,
     "nine of the nineteen modes claim an exact Swiss match ("
     + D.ayanamsa.exactToSwiss + ")");
}

/* ---- 4 · it renders, visibly ------------------------------------------ */

head("every block renders, in a browser, into visible text");
{
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/accuracy.html");
  await p.waitForTimeout(1800);

  const r = await p.evaluate(() => {
    const ids = ["ax-counts", "ax-families", "ax-pipeline", "ax-reach",
                 "ax-headline", "ax-scale", "ax-divtable", "ax-ayan", "ax-cost",
                 "ax-bands", "ax-bandtable", "ax-bare", "ax-fit", "ax-evection",
                 "ax-precision"];
    const filled = {}, over = {};
    for (const id of ids) {
      const n = document.getElementById(id);
      filled[id] = !!(n && n.children.length);
      const s = n && n.querySelector("svg");
      if (s) {
        const bb = s.getBBox(), vb = s.viewBox.baseVal;
        over[id] = (bb.y + bb.height > vb.height + 1) || (bb.x + bb.width > vb.width + 1);
      }
    }
    const spans = [...document.querySelectorAll(".axn")];
    return {
      filled, over,
      emptySpans: spans.filter(n => !n.textContent.trim()).map(n => n.getAttribute("data-k")),
      spanCount: spans.length,
      text: document.body.innerText,
      inNav: [...document.querySelectorAll("nav.site a")].some(a => a.textContent === "Accuracy"),
    };
  });
  await p.close();
  await browser.close();

  is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs[0] : ""));
  const unfilled = Object.keys(r.filled).filter(k => !r.filled[k]);
  is(unfilled.length === 0, "all 15 blocks are filled"
     + (unfilled.length ? " — empty: " + unfilled.join(", ") : ""));
  /* An SVG renders happily with its contents outside the viewBox, so nothing
     looks wrong and the last two rows are simply gone. This caught exactly
     that on the first chart. */
  const spill = Object.keys(r.over).filter(k => r.over[k]);
  is(spill.length === 0, "no chart spills outside its own viewBox"
     + (spill.length ? " — " + spill.join(", ") : ""));
  is(r.emptySpans.length === 0, "every inline figure resolved ("
     + r.spanCount + " of them)"
     + (r.emptySpans.length ? " — empty: " + r.emptySpans.join(", ") : ""));
  is(r.inNav, "the page is in the site navigation");
  is(r.text.indexOf("undefined") < 0 && r.text.indexOf("NaN") < 0,
     "no “undefined” or “NaN” reaches the visible text");

  /* the figures that matter must be ON the page, not merely in the data */
  const moon = D.modern.perBody.find(b => b.en === "Moon").lonWorst;
  for (const [what, needle] of [
    ["the Moon's residual", moon + "″"],
    ["the ayanāṃśa spread", D.ayanamsa.spreadDeg + "°"],
    ["the daśā cost", Math.round(D.cost.mahadashaDays) + " days"],
    ["the evection recovery", D.siddhanta.lunarDiagnostic.amplitudeArcmin.evection + "′"],
  ]) is(r.text.indexOf(needle) >= 0, what + " is in the visible text (" + needle + ")");
}

console.log("\n" + (fail ? "FAIL" : "PASS") + " accuracy-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
