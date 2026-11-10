/* ayanamsa-verify.mjs — the ayanāṃśa page.
 *
 * The page makes one claim that is worth more than all the others and is the
 * easiest to fake: that some quantities CANNOT move when the ayanāṃśa
 * changes, because it cancels out of them. Prose asserting an algebraic fact
 * is worth nothing, so the page measures it — and so does this, independently
 * of the page, straight from the engine. If the two ever disagree, the page
 * is wrong and this says so.
 *
 * The rest: every figure on the page is computed rather than typed, all
 * seventeen definitions arrive with the engine's own notes, a definition the
 * reader invents really does reach the engine, and the card is a real image.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
/* SOURCE FILES RESOLVE FROM THIS FILE, not from the working directory.
   The page under test is served from wherever the harness is run — the site
   root for the web build, app/ for the desktop one — but the SOURCE markup and
   the data files this harness reads live in one place. Using cwd for both made
   this suite throw ENOENT when run from app/, which is how it was found; the
   same fault was fixed in engine-verify for the same reason. */
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* ───── nothing is typed into the prose ──────────────────────────────────── */
head("no figure is written into the page by hand");
{
  const src = readFileSync(join(SRC, "src/pages/ayanamsa.html"), "utf8");
  /* a degree-and-minute figure in the prose would be a measurement frozen at
     the moment somebody typed it, and this page's whole stance is that its
     numbers are live. The written-out constants that ARE allowed are the ones
     that are definitions rather than measurements: the 23½° tilt, the twelve
     divisions, the 25,800-year period, 50 arcseconds a year. */
  const bad = (src.match(/\d+°\d+′/g) || []);
  is(bad.length === 0, "no degree-and-minute figures in the markup (" +
     (bad.slice(0, 3).join(", ") || "none") + ")");
  is(!/\b2[0-9]\.\d{2}°/.test(src), "and no decimal ayanāṃśa value either");
  /* THE COUNT IN WORDS, CHECKED AGAINST THE ENGINE RATHER THAN AGAINST A WORD.
     This used to assert that the string "seventeen" appeared, which is a test
     that holds a number steady rather than keeping it true: adding a mode left
     six places on this page, two on the accuracy page, the ruler's legend, the
     report pane's family comment, two builder shells and this line all saying
     "seventeen" while the engine carried nineteen, and every one of them
     passed. The expected word is now derived from the engine's own table, so
     the next mode added fails this until the prose is corrected. */
  const WORDS = ["zero","one","two","three","four","five","six","seven","eight",
    "nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
    "seventeen","eighteen","nineteen","twenty","twenty-one","twenty-two",
    "twenty-three","twenty-four","twenty-five"];
  const nModes = Object.keys(
    JSON.parse(readFileSync(join(SRC, "data/accuracy.json"), "utf8"))
      .ayanamsa.modes).length;
  const want = WORDS[nModes];
  is(!!want, "the engine carries a mode count this check can spell (" + nModes + ")");
  is(new RegExp("\\b" + want + "\\b", "i").test(src),
     "the count of definitions is stated in words, and the word matches the " +
     "engine's own table (" + nModes + " = \"" + want + "\")");
  /* And no OTHER number-word is left standing where it counts MODES. Scoped to
     that, because the page says "twelve divisions" and "fifty arcseconds" for
     good reasons and a blanket sweep flags those too — which it did on the
     first attempt here. The patterns below are the shapes the count actually
     appears in on this page. */
  /* Longest first, and refuse a match that is only the head of a longer
     compound: "\\btwenty\\b" fires inside "twenty-seven", so the sentence
     "three of the twenty-seven are used this way" — about the nakṣatras, not
     the modes — was reported as a stale mode count. */
  const alt = WORDS.slice(4).slice().sort((a, b) => b.length - a.length).join("|");
  const NOT_COMPOUND = "(?!-)";
  const SHAPES = [
    new RegExp("\\b(" + alt + ")" + NOT_COMPOUND + "\\s+(?:published\\s+)?(?:definitions|modes|answers|conventions)\\b", "gi"),
    new RegExp("\\b(?:of|like|than)\\s+the\\s+(" + alt + ")" + NOT_COMPOUND + "\\b", "gi"),
    new RegExp("\\bthe\\s+(" + alt + ")" + NOT_COMPOUND + "\\s+(?:disagree|above|here|span)", "gi"),
    new RegExp("^\\s*<h2[^>]*>\\s*(" + alt + ")" + NOT_COMPOUND + "\\s+answers", "gim")
  ];
  const found = [];
  for (const re of SHAPES) {
    let m;
    while ((m = re.exec(src))) found.push(m[1].toLowerCase());
  }
  const wrong = [...new Set(found.filter(w => w !== want))];
  is(found.length > 0, "the count is written out somewhere a reader will see it");
  is(wrong.length === 0,
     "and every place the markup counts the modes says \"" + want + "\"" +
     (wrong.length ? " — stale: " + wrong.join(", ") : " (" + found.length +
      " occurrences)"));
}

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open() {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1100 },
                                    acceptDownloads: true });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/ayanamsa.html");
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector("#ay-spread svg"),
                          null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(700);
  return { p, errs };
}
const quiet = e => !/cities\.json|scheme "file"/.test(e);

/* ───── it draws with no chart at all ────────────────────────────────────── */
head("the page is chart-independent and fully drawn");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    rings: !!document.querySelector("#ay-rings svg"),
    cone: !!document.querySelector("#ay-cone svg"),
    terms: !!document.querySelector("#ay-terms svg"),
    dots: document.querySelectorAll("#ay-spread .ay-sprdot").length,
    modeRows: document.querySelectorAll("#ay-modetable tbody tr").length,
    notes: Array.from(document.querySelectorAll("#ay-modetable td.note"))
                .filter(td => (td.textContent || "").trim().length > 20).length,
    engineModes: Object.keys(window.__ayanModes || {}).length,
  }));
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors (" + errs.filter(quiet)[0] + ")");
  is(!r.hasChart, "no chart is stored");
  is(r.rings && r.cone && r.terms, "the rings, the precession figure and the term bars all draw");
  is(r.dots === r.engineModes && r.dots >= 19,
     "every definition the engine carries is on the spread (" + r.dots + ")");
  is(r.modeRows === r.engineModes, "and in the table (" + r.modeRows + ")");
  /* the notes come from the engine's own table, so the page cannot describe a
     definition in words the engine would not recognise */
  is(r.notes >= r.engineModes - 1,
     "each one carries the engine's own description (" + r.notes + "/" + r.modeRows + ")");
}

/* ───── the cancellation, measured here and not taken from the page ──────── */
head("what the ayanāṃśa cannot change — measured independently of the page");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    const inp = { year: 2026, month: 11, day: 3, hour: 6, minute: 30, second: 0,
                  tzHours: 5.5, lat: 23.17, lon: 75.78 };
    const out = {};
    ["lahiri", "raman", "fagan", "ss_text", "truerevati"].forEach(m => {
      const s = window.quickSky(Object.assign({}, inp, { ayanamsa: m }));
      const g = n => s.planets.filter(x => x.en === n)[0].sid;
      const sun = g("Sun"), moon = g("Moon");
      out[m] = { ayan: s.ayanamsa,
                 elong: ((moon - sun) % 360 + 360) % 360,
                 sum: ((moon + sun) % 360 + 360) % 360,
                 moon: moon };
    });
    return out;
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  const ks = Object.keys(r);
  const el = ks.map(k => r[k].elong);
  const spreadElong = Math.max(...el) - Math.min(...el);
  const ayRange = Math.max(...ks.map(k => r[k].ayan)) - Math.min(...ks.map(k => r[k].ayan));
  is(ayRange > 1,
     "the five definitions really do disagree, by " + ayRange.toFixed(2) + "°");
  /* the headline: an exact cancellation, so the tolerance is numerical noise
     and not a margin — a tenth of an arcsecond would already be a real bug */
  is(spreadElong * 3600 < 0.01,
     "the Moon–Sun elongation is identical across all five to " +
     (spreadElong * 3600).toExponential(1) + " arcsec — the tithi cannot move");
  const moonRange = Math.max(...ks.map(k => r[k].moon)) - Math.min(...ks.map(k => r[k].moon));
  is(Math.abs(moonRange - ayRange) < 1e-6,
     "while the Moon's own longitude moves by the full " + moonRange.toFixed(4) +
     "° — so this is cancellation, not a stuck engine");
  /* and the doubling */
  const a = r.lahiri, f = r.fagan;
  const ratio = (f.sum - a.sum) / (f.ayan - a.ayan);
  is(Math.abs(ratio + 2) < 0.001,
     "the yoga sum moves at exactly " + ratio.toFixed(4) +
     "× the ayanāṃśa — a sum carries the subtraction twice");
}

/* ───── the page's own reading of that agrees ────────────────────────────── */
head("and the page reports it, rather than asserting it");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    rows: document.querySelectorAll("#ay-impact tbody tr").length,
    yes: document.querySelectorAll("#ay-impact .aycheck li.yes").length,
    no: document.querySelectorAll("#ay-impact .aycheck li.no").length,
    text: (document.getElementById("ay-impact") || {}).textContent || "",
  }));
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.rows >= 4, "the impact table is filled from the engine (" + r.rows + " definitions)");
  is(r.no === 0, "every claim it makes about itself passes (" + r.yes + " checks, " +
     r.no + " failing)");
  is(/−2\.000×|-2\.000×/.test(r.text),
     "and it prints the measured doubling rather than the words 'twice'");
}

/* ───── a definition the reader invents reaches the engine ───────────────── */
head("an invented ayanāṃśa is a real one");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    const before = Object.keys(window.__ayanModes).length;
    document.querySelector('[data-ay="pin"]').click();
    await wait(400);
    const pinMsg = document.getElementById("ay-sandmsg").textContent;
    document.querySelector('[data-ay="apply"]').click();
    await wait(900);
    const sky = n => window.quickSky({ year: 2026, month: 11, day: 3, hour: 12,
      minute: 0, second: 0, tzHours: 5.5, lat: 23.17, lon: 75.78, ayanamsa: n }).ayanamsa;
    const mine = sky("yours"), lah = sky("lahiri");
    const during = Object.keys(window.__ayanModes).length;
    document.querySelector('[data-ay="drop"]').click();
    await wait(700);
    return { before, during, after: Object.keys(window.__ayanModes).length,
             pinMsg, mine, lah,
             stillThere: !!window.__ayanModes.yours };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.during === r.before + 1, "registering adds a definition to the engine's own table");
  /* The self-demonstrating default: the catalogue puts Spica at 179.985° in a
     Lahiri frame, so pinning Citrā at 180° must come out as Lahiri less 54
     arcseconds — which is why Lahiri is called Chitrapakṣa in the first
     place. If this ever drifts, either the catalogue or the pin arithmetic
     has moved. */
  const gap = (r.mine - r.lah) * 3600;
  is(Math.abs(gap + 54) < 1.5,
     "pinning Citrā at 180° lands at Lahiri " + gap.toFixed(1) +
     "″ — the offset of Spica from 180°, which is what Chitrapakṣa means");
  is(/Citrā pinned at 180°/.test(r.pinMsg), "and the page says so (" + r.pinMsg.trim() + ")");
  is(r.after === r.before && !r.stillThere, "removing it puts the table back as it was");
}

/* ───── the card ─────────────────────────────────────────────────────────── */
head("the card is a real image of the real drawing");
{
  const { p, errs } = await open();
  const dl = p.waitForEvent("download", { timeout: 90000 });
  await p.evaluate(() => document.querySelector('[data-ay="png"]').click());
  const d = await dl;
  const dir = "/tmp/claude-0/ayverify";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = dir + "/card.png";
  await d.saveAs(file);
  const dims = await p.evaluate(() => {
    const c = document.getElementById("ay-canvas");
    return { w: c.width, h: c.height };
  });
  /* the capture palette must be OFF again afterwards, or the page is left
     wearing its dark ink on a cream background */
  const clean = await p.evaluate(() =>
    !document.getElementById("ay-rings").hasAttribute("data-film"));
  await p.close();
  const buf = existsSync(file) ? readFileSync(file) : null;
  is(!!buf && buf.length > 40000, "a PNG comes out (" +
     (buf ? Math.round(buf.length / 1024) + " KB" : "missing") + ")");
  is(!!buf && buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG",
     "and it really is a PNG");
  is(dims.w === 1080 && dims.h === 1350, "at the feed size (" + dims.w + "x" + dims.h + ")");
  is(clean, "and the page is not left wearing the capture palette");
  is(errs.filter(quiet).length === 0, "no page errors");
}

/* ───── the chart simulation ─────────────────────────────────────────────── */
head("the chart answers 'what actually changes' by changing");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    /* Pin the page's moment, and publish it so the expectation below is
       computed for the same instant. Without this the page draws "now" and
       the check compares it against some other day. */
    window.__ayVerifyWhen = { y: 2026, mo: 11, d: 3, h: 12, tz: 5.5,
                              lat: 23.17, lon: 75.78 };
    {
      const w = document.getElementById("ay-when");
      if (w) {
        w.value = "2026-11-03T12:00";
        w.dispatchEvent(new Event("input", { bubbles: true }));
        w.dispatchEvent(new Event("change", { bubbles: true }));
        await wait(450);
      }
    }
    const signs = () => [...document.querySelectorAll("#ay-chartedge tbody tr")]
      .map(tr => tr.querySelectorAll("td")[1].textContent);
    const set = async v => {
      const e = document.getElementById("ay-chartay");
      e.value = String(v); e.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(350);
    };
    const isChart = !!document.querySelector("#ay-chartsvg svg.kchartsvg");
    const glyphs = document.querySelectorAll("#ay-chartsvg .hp").length;
    await set(20); const a = signs();
    await set(28); const b = signs();
    const moved = a.filter((v, i) => v !== b[i]).length;
    /* Whether any graha happens to sit within the span of the seventeen is a
       property of the instant, not of the code, so the count is checked
       against one worked out here from the table's own printed figures
       rather than asserted to be non-zero — which would have been a test of
       the date. */
    const jd = y => 2451545.0 + (y - 2000) * 365.2425;
    const vals = Object.keys(window.__ayanModes)
      .map(k => window.__ayanFor(k, jd(2026))).filter(v => v != null);
    const span = Math.max(...vals) - Math.min(...vals);
    /* The expectation is worked out by ASKING the extreme definitions what
       rāśi each graha falls in, which is what the page now does. An earlier
       version of both compared the distance-to-boundary against the span,
       which is an approximation that is wrong on either side of a cusp. */
    const lo = Math.min(...vals), hi = Math.max(...vals);
    /* THE SAME INSTANT ON BOTH SIDES, which is the whole difficulty here.
       This expectation was first written against a hardcoded 3 November 2026
       while the page drew the live sky, so the two agreed on the day it was
       written and disagreed two days later, when one graha near a cusp moved
       across. Fixing the approximation inside the comparison (span-to-
       boundary → asking the extreme definitions) left that half of the fault
       in place. The caller now sets the page's own moment input to a fixed
       instant before reading the flags, and the same instant is used here, so
       neither side can wander. */
    const W = window.__ayVerifyWhen;
    const sky = window.quickSky({ year: W.y, month: W.mo, day: W.d, hour: W.h,
      minute: 0, second: 0, tzHours: W.tz, lat: W.lat, lon: W.lon,
      ayanamsa: "lahiri" });
    const base = sky.ayanamsa;
    const expected = sky.planets.filter(pl => {
      const trop = ((pl.sid + base) % 360 + 360) % 360;
      const sg = a2 => Math.floor((((trop - a2) % 360 + 360) % 360) / 30);
      return sg(lo) !== sg(hi);
    }).length;
    return { isChart, glyphs, n: a.length, moved,
             contested: document.querySelectorAll("#ay-chartedge .contest").length,
             expected, span: +span.toFixed(3) };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  /* the report's own northChart, not a lookalike built for this page */
  is(r.isChart, "the rāśi chart is the report's own chart builder");
  is(r.glyphs >= 9, "with every graha placed in it (" + r.glyphs + " glyphs)");
  is(r.n === 9, "and nine grahas in the table beside it");
  is(r.moved >= 3, "moving the ayanāṃśa from 20° to 28° moves " + r.moved +
     " of them into a different rāśi — which is the whole point of the section");
  is(r.contested === r.expected,
     "the contested flag marks exactly the grahas within the " + r.span +
     "° span of the family (" + r.contested + " flagged, " + r.expected +
     " qualify)");
}

/* ───── the star-anchored definitions ────────────────────────────────────── */
head("the star-anchored definitions, and what the plot actually shows");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    const grab = () => ({
      lines: document.querySelectorAll("#ay-drift .ay-dline").length,
      note: document.getElementById("ay-driftnote").textContent,
      on: document.querySelectorAll("#ay-starwheel .ay-swstar.on").length,
      stars: document.querySelectorAll("#ay-starwheel .ay-swstar").length,
      out: document.querySelectorAll("#ay-starwheel .ay-swstar.out").length,
      zero: !!document.querySelector("#ay-starwheel .ay-swzero"),
      arc: !!document.querySelector("#ay-starwheel .ay-swarc"),
      ayan: !!document.querySelector("#ay-starwheel .ay-swequinox"),
      segs: document.querySelectorAll("#ay-starwheel .ay-swseg").length,
      seglabs: document.querySelectorAll("#ay-starwheel .ay-swseglab").length,
      foot: (document.querySelector("#ay-starwheel .ay-swfoot") || {}).textContent || "",
    });
    const citra = grab();
    const s2 = document.getElementById("ay-anchor");
    s2.value = "Revatī"; s2.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(700);
    const revati = grab();
    /* the engine's own note for its Citrā mode states a figure this page
       measures independently; if they ever disagree one of them is wrong */
    const engineNote = (window.__ayanModes.nirayana_citra || {}).note || "";
    return { citra, revati, engineNote,
             families: document.getElementById("ay-anchor").options.length };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.citra.stars === 27, "all twenty-seven junction stars are on the wheel");
  is(r.citra.on === 1, "with the anchor star marked");
  /* The figure's first version showed where the stars are and nothing about
     anchoring: no sidereal zero, so the section's whole claim — the ayanāṃśa
     is whatever puts THIS star at THAT longitude — had nothing to point at.
     These three are the parts that were missing, so they are pinned. */
  is(r.citra.zero, "the sidereal zero is drawn, which is what the anchor is measured from");
  is(r.citra.arc, "and the arc from it to the anchor longitude");
  is(r.citra.ayan, "with the ayanāṃśa back to the equinox in the same picture");
  is(r.citra.segs === 27 && r.citra.seglabs === 27,
     "the names sit on the twenty-seven equal divisions, which is what they name");
  /* Citrā's and Svātī's junction stars are 0.39° apart and BOTH lie in
     Citrā's segment, which is why the first drawing printed them on top of
     one another. That is the sky, so the page states it rather than nudging
     the labels apart. */
  is(r.citra.out === 7,
     "and the seven stars lying outside their own nakṣatra are marked (" +
     r.citra.out + ")");
  is(/7 of the 27 fall outside/.test(r.citra.foot),
     "the figure says so in words too");
  is(r.families >= 2, "and a family to choose (" + r.families + ")");
  is(r.citra.lines >= 2, "the Citrā family plots " + r.citra.lines + " definitions");
  is(r.revati.note !== r.citra.note && /Revat/.test(r.revati.note),
     "choosing Revatī replots it for that star");
  /* The page's measurement against the engine's own documented figure. The
     engine's note for this site's Citrā mode says it sits 49.2′ from True
     Chitrapakṣa; the plot derives that independently from the two modes, so
     agreement is a cross-check of the page AND of the note. */
  const m = /(\d+\.\d)′ away/.exec(
    (/Nirayana–Chitrapakṣa \(this site\) is ([\d.]+)′/.exec(r.citra.note) || [])[0] || "");
  const measured = Number((/Nirayana–Chitrapakṣa \(this site\) is ([\d.]+)′/
    .exec(r.citra.note) || [0, 0])[1]);
  is(/49\.2′ from True Chitrapak/.test(r.engineNote),
     "the engine's note states a figure for this site's Citrā mode");
  is(Math.abs(measured - 49.2) < 0.3,
     "and the plot measures it independently as " + measured +
     "′ — the two agree");
  /* the honest part: the page must not claim every curve drifts */
  is(!/every curve/i.test(r.citra.note), "the note reports each definition separately");
}

/* ───── the geometry of the drawings ─────────────────────────────────────── */
head("the figures are geometrically what they claim to be");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    const jd = y => 2451545.0 + (y - 2000) * 365.2425;
    const inv = (x, y, cx, cy) => {
      const a = Math.atan2(cy - y, x - cx) * 180 / Math.PI;
      return ((180 - a) % 360 + 360) % 360;
    };
    /* --- the rings: where do they put the vernal equinox? --- */
    const ringsAt = () => {
      const t = document.querySelector("#ay-rings .ay-ztrop");
      return inv(+t.getAttribute("x2"), +t.getAttribute("y2"), 350, 336);
    };
    const ay2026 = window.__ayanFor("lahiri", jd(2026));
    const atNow = ringsAt();
    /* and does it run BACKWARDS against the stars as the caption says? */
    const yr = document.getElementById("ay-year");
    yr.value = "2626"; yr.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(400);
    const atLater = ringsAt();
    yr.value = "2026"; yr.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(400);

    /* --- the star-anchor figure must agree with the rings --- */
    const eq = document.querySelector("#ay-starwheel .ay-swequinox");
    const swAt = inv(+eq.getAttribute("x2"), +eq.getAttribute("y2"), 380, 350);

    /* --- the derivation: two great circles cross exactly twice --- */
    const g = document.querySelector("#ay-derive svg");
    const [e1, e2] = g.querySelectorAll("ellipse");
    const cx = +e1.getAttribute("cx"), cy = +e1.getAttribute("cy");
    const R = +e1.getAttribute("rx"), r1 = +e1.getAttribute("ry"), r2 = +e2.getAttribute("ry");
    const marks = [...g.querySelectorAll(".ay-equinox")]
      .map(c => ({ x: +c.getAttribute("cx"), y: +c.getAttribute("cy") }));
    const onE = (m, rx, ry) =>
      Math.abs(((m.x - cx) / rx) ** 2 + ((m.y - cy) / ry) ** 2 - 1);

    /* --- the cone's half-angle is the obliquity --- */
    const top = document.querySelector("#ay-cone .ay-conetop");
    const coneHalf = Math.atan(+top.getAttribute("rx") / (250 - 70)) * 180 / Math.PI;

    return { ay2026, atNow, atLater, swAt, R, r1, r2,
             marks: marks.length,
             onEcl: marks.map(m => onE(m, R, r1)),
             onEqu: marks.map(m => onE(m, R, r2)),
             coneHalf };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");

  /* THE ONE THAT WAS WRONG. The ring's coordinate is sidereal longitude, so
     the vernal equinox belongs at −ayanāṃśa. Drawn at +ayanāṃśa it sat in
     sidereal Meṣa; it is in Mīna, which is what "the age of Pisces" means. */
  const want = ((-r.ay2026) % 360 + 360) % 360;
  is(Math.abs(r.atNow - want) < 0.05,
     "the rings put the equinox at " + r.atNow.toFixed(2) + "°, which is −ayanāṃśa");
  is(Math.floor(r.atNow / 30) === 11,
     "that is sidereal Mīna, where the equinox actually is");
  /* and it must creep BACKWARDS, as the caption under it says */
  const moved = ((r.atLater - r.atNow + 540) % 360) - 180;
  is(moved < -2,
     "six centuries on it has moved " + moved.toFixed(1) +
     "° — backwards against the stars, as the caption says");
  /* the two figures on this page must agree with each other; they did not */
  is(Math.abs(((r.swAt - r.atNow + 540) % 360) - 180) < 0.1,
     "the star-anchor figure puts it in the same place (" + r.swAt.toFixed(2) + "°)");

  /* two great circles meet at exactly two points, and those are the equinoxes */
  is(r.marks === 2, "the derivation marks exactly two crossings");
  is(r.r2 > 0, "the equator ellipse has a positive radius (" + r.r2 + ")");
  is(Math.max(...r.onEcl) < 1e-6 && Math.max(...r.onEqu) < 1e-6,
     "and both marks lie on BOTH circles, so the crossings are real crossings");
  is(Math.abs(r.r1 - r.r2) > 1,
     "the two are drawn at different tilts (" + r.r1 + " vs " + r.r2 + ")");

  is(Math.abs(r.coneHalf - 23.44) < 0.1,
     "the precession cone's half-angle is the obliquity, " +
     r.coneHalf.toFixed(2) + "°");
}

/* ───── the polynomial, driving the chart ───────────────────────────────── */
head("the equation itself can drive the chart, term by term");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const set = async (id, v, ev) => {
      const e = document.getElementById(id);
      e.value = String(v); e.dispatchEvent(new Event(ev, { bubbles: true })); await w(420);
    };
    const signs = () => [...document.querySelectorAll("#ay-chartedge tbody tr")]
      .map(t => t.querySelectorAll("td")[1].textContent);
    const ayRead = () => document.getElementById("ay-chartread").textContent;
    await set("ay-chartmode", "eq", "change");
    const shown = !document.getElementById("ay-charteqout").hidden;
    const worked = document.getElementById("ay-charteqout").textContent;

    /* the number driving the chart must BE the polynomial, recomputed here */
    const c0 = +document.getElementById("ay-ec0").value;
    const c1 = +document.getElementById("ay-ec1").value / 3600 * 100;
    const c2 = +document.getElementById("ay-ec2").value;
    const flat = worked.replace(/\s+/g, "");
    const m = /driveSthechartwith/.test(flat) ? null
            : /driveschartwith([\d.]+)°/.exec(flat) ||
              /drivesthechartwith([\d.]+)°/.exec(flat);
    const T = Number((/T=(-?[\d.]+)/.exec(flat) || [0, 0])[1]);
    const mine = c0 + c1 * T + c2 * T * T;

    /* at a present-day date the T² term is far too small to move anything —
       the page says so, so it is checked rather than taken on trust */
    const base = signs();
    await set("ay-ec2", 0.004, "input");
    const movedByC2 = base.filter((v, i) => v !== signs()[i]).length;
    const nowRead = ayRead();
    await set("ay-ec2", 0.000307, "input");

    /* and at a distant date it is not. The page claims this too. */
    await set("ay-when", "1200-06-15T12:00", "change");
    await w(300);
    const worked2 = document.getElementById("ay-charteqout").textContent.replace(/\s+/g, "");
    const T2 = Number((/T=(-?[\d.]+)/.exec(worked2) || [0, 0])[1]);
    const far = /c₂×T²([+−][\d.]+)°/.exec(worked2);
    return { shown, total: m ? +m[1] : null, mine, T, movedByC2, nowRead,
             T2, farC2: far ? Math.abs(+far[1].replace("−", "-")) : null,
             saysTiny: /far too small to move anything/.test(worked) };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.shown, "choosing 'from the equation' shows the arithmetic driving the chart");
  /* T is read back off a four-decimal display, so recomputing from it carries
     about 7×10⁻⁵° of rounding — the tolerance is that, not slack. A wrong
     coefficient or a wrong power would miss by orders of magnitude more. */
  is(r.total != null && Math.abs(r.total - r.mine) < 5e-4,
     "and the number it drives the chart with IS c₀ + c₁T + c₂T² (" +
     (r.total || 0).toFixed(6) + " vs " + r.mine.toFixed(6) + ")");
  /* the page's own claim about the quadratic term, tested both ways */
  is(r.saysTiny, "at a present-day date it reports the T² term as too small to matter");
  is(r.movedByC2 === 0,
     "and swinging that term across its whole range moves no graha at all");
  is(Math.abs(r.T2) > 7,
     "setting the moment to 1200 CE gives T = " + r.T2 + ", eight centuries out");
  is(r.farC2 != null && r.farC2 > 0.01,
     "where the same term now contributes " + (r.farC2 || 0).toFixed(4) +
     "° — so the page's 'it starts to matter' is true, not a figure of speech");
}

head("the two Samanvaya readings — and what is and is not new about them");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    const jd = y => 2451545.0 + (y - 2000) * 365.2425;
    const M = window.__ayanModes;
    const out = { keys: Object.keys(M), n: Object.keys(M).length };
    out.polar = M.samanvaya_polar ? {
      s: M.samanvaya_polar.s, name: M.samanvaya_polar.name,
      note: M.samanvaya_polar.note,
      atOwnJd: window.__ayanFor("samanvaya_polar", 1868970.25) * 3600,
      at2026: window.__ayanFor("samanvaya_polar", jd(2026)) } : null;
    out.ecl = M.samanvaya_ecliptic ? {
      s: M.samanvaya_ecliptic.s, name: M.samanvaya_ecliptic.name,
      note: M.samanvaya_ecliptic.note,
      atOwnJd: window.__ayanFor("samanvaya_ecliptic", 1903396.75) * 3600,
      at2026: window.__ayanFor("samanvaya_ecliptic", jd(2026)) } : null;
    /* the worst disagreement of each new mode with every other, across the
       band this engine is certified over and well beyond it */
    const near = k => {
      let best = null;
      for (const o of Object.keys(M)) {
        if (o === k) continue;
        let worst = 0;
        for (let y = 1000; y <= 3000; y += 10) {
          const d = Math.abs(window.__ayanFor(k, jd(y)) - window.__ayanFor(o, jd(y)));
          if (d > worst) worst = d;
        }
        if (!best || worst < best.worst) best = { o, worst };
      }
      return best;
    };
    out.nearPolar = near("samanvaya_polar");
    out.nearEcl = near("samanvaya_ecliptic");
    const vals = Object.keys(M).map(k => window.__ayanFor(k, jd(2026)));
    out.span = Math.max(...vals) - Math.min(...vals);
    return out;
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(!!r.polar && !!r.ecl, "both Samanvaya modes are registered with the engine");
  /* The ruler caps a tag at fourteen characters, so the specification's
     "Samanvaya (Polar)" / "Samanvaya (Ecliptic)" (seventeen and twenty) are
     carried as the full names and abbreviated for the tag, in the style
     "Nir. Citrā" already uses. self-test asserts the cap; this asserts the
     abbreviation is the one intended and not something arbitrary. */
  is(r.polar.s === "Sam. Polar" && r.ecl.s === "Sam. Ecliptic",
     "with short tags inside the ruler's fourteen-character cap (" +
     r.polar.s + ", " + r.ecl.s + ")");
  is(/Samanvaya–Polar/.test(r.polar.name) && /Samanvaya–Ecliptic/.test(r.ecl.name),
     "while the full names are the ones the specification asked for");

  /* 1. EACH VANISHES AT ITS OWN STATED EPOCH. An ayanāṃśa definition is a
     claim about when sidereal zero met the equinox, so the one thing it must
     do is read zero there. */
  is(Math.abs(r.polar.atOwnJd) < 3,
     "Samanvaya–Polar reads zero at its own JD 1868970.25 (" +
     r.polar.atOwnJd.toFixed(2) + "″)");
  is(Math.abs(r.ecl.atOwnJd) < 3,
     "Samanvaya–Ecliptic reads zero at its own JD 1903396.75 (" +
     r.ecl.atOwnJd.toFixed(2) + "″)");

  /* 2. THE POLAR NOTE MUST NOT REPEAT THE SPECIFICATION'S DATE SLIP.
     JD 1868970.25 is 17 December 404 CE in the Julian calendar — decimal year
     404.96, which is the stated "405.0 CE". The specification also called it
     "March 20" and "the vernal equinox"; 20 March 405 is JD 1869062.75, where
     this polynomial reads +14.4″ and not zero. The note states the epoch the
     arithmetic uses and says nothing about a month, and this check is what
     keeps it that way. */
  is(/405\.0 CE/.test(r.polar.note) && /1868970\.25/.test(r.polar.note),
     "the polar note gives the epoch the coefficients actually use");
  is(!/March|equinox/i.test(r.polar.note),
     "and does not claim a March date or an equinox for it");

  /* 2b. THE POLAR READING MUST NOT CALL ITSELF A SYNTHESIS.
   *
   * It was labelled one — "an inverse-variance least-squares centroid over the
   * Sūrya Siddhānta's polar dhruvakās … the synthesis is the author's own". It
   * is a FIVE-dhruvakā subset minimum. Combining the full 27-star ensemble
   * with the solar apogee of three texts puts the measured sidereal zero at
   * 493.6 ± 23 CE, which excludes this mode's 405.0 CE at 3.9σ — the very
   * constraint set the label claimed to synthesise. See
   * claude/samanvaya-ayanamsa-research.md §5–6.
   *
   * The mode is KEPT rather than retired, so a reader who stored it still gets
   * the figures they chose; what is corrected is the claim. These checks exist
   * because a note is the easiest thing in this project to quietly revert. */
  is(/NOT AS A SYNTHESIS/.test(r.polar.note),
     "the polar note tells the reader to take it as a subset minimum, not a synthesis");
  is(/\bFIVE\b/.test(r.polar.note),
     "and says how many dhruvakās it actually uses");
  is(/3\.9σ/.test(r.polar.note) && /493\.6/.test(r.polar.note),
     "and states the exclusion — 3.9σ from the measured 493.6 CE zero");
  is(!/synthesis is the author's own/.test(r.polar.note),
     "and the old claim that it IS a synthesis is gone");
  is(/Samanvaya–Ecliptic is/.test(r.polar.note),
     "and it points at the better-supported reading rather than leaving them as peers");

  /* 3. THE ECLIPTIC READING IS THE ARYABHATA MODE ALREADY HERE, and the note
     has to say so. Two entries presented as independent answers, when one is
     the other to under an arcsecond, would make this page's own argument
     false. */
  is(r.nearEcl.o === "aryabhata" && r.nearEcl.worst * 3600 < 1,
     "Samanvaya–Ecliptic agrees with " + r.nearEcl.o + " to " +
     (r.nearEcl.worst * 3600).toFixed(2) + "″ across 1000–3000 CE");
  is(/0\.28″|Āryabhaṭa/.test(r.ecl.note) && /one convention/.test(r.ecl.note),
     "and its note says so, rather than offering it as a separate answer");
  /* And it must carry what the measurement actually supports: 0.2σ from the
     27-star-plus-apogee zero of 493.6 ± 23 CE, stated as corroboration by
     independent derivation rather than as a new epoch — with the reason the
     single-star anchors are excluded from that fit, since they are
     definitions and not measurements. */
  is(/493\.6/.test(r.ecl.note) && /0\.2σ/.test(r.ecl.note),
     "the ecliptic note gives the measured zero it agrees with, and by how much");
  is(/±19\.3′|19\.3′/.test(r.ecl.note),
     "and the band on it, which is more use than another decimal place");
  is(/definitions and not measurements/.test(r.ecl.note),
     "and why the single-star anchors are excluded from that measurement");

  /* 4. THE POLAR READING IS GENUINELY NEW — otherwise there was no point. */
  is(r.nearPolar.worst * 60 > 10,
     "Samanvaya–Polar is a real addition: " + (r.nearPolar.worst * 60).toFixed(1) +
     "′ from its nearest neighbour (" + r.nearPolar.o + ")");

  /* 5. AND THE FAMILY'S SPREAD IS UNCHANGED, because both fall inside the
     existing endpoints. Every page that quotes 5.83° stays true. */
  is(Math.abs(r.span - 5.8289) < 0.002,
     "the spread across the family is still " + r.span.toFixed(4) +
     "° — neither new mode widens it");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " ayanamsa-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
