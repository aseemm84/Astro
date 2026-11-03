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

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* ───── nothing is typed into the prose ──────────────────────────────────── */
head("no figure is written into the page by hand");
{
  const src = readFileSync(ROOT + "/source/src/pages/ayanamsa.html", "utf8");
  /* a degree-and-minute figure in the prose would be a measurement frozen at
     the moment somebody typed it, and this page's whole stance is that its
     numbers are live. The written-out constants that ARE allowed are the ones
     that are definitions rather than measurements: the 23½° tilt, the twelve
     divisions, the 25,800-year period, 50 arcseconds a year. */
  const bad = (src.match(/\d+°\d+′/g) || []);
  is(bad.length === 0, "no degree-and-minute figures in the markup (" +
     (bad.slice(0, 3).join(", ") || "none") + ")");
  is(!/\b2[0-9]\.\d{2}°/.test(src), "and no decimal ayanāṃśa value either");
  is(/seventeen/i.test(src), "the count of definitions is stated in words, not as a stale number");
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
  is(r.dots === r.engineModes && r.dots >= 17,
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

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " ayanamsa-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
