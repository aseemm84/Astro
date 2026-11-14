/* What a reader is told about how their chart was made.
 *
 * Four things were found on 14 November 2026 by checking a real reader's
 * screenshots of their own chart (15 Dec 1984, 13:31 IST, Moradabad) against
 * the engine, and each is held here from the reader's side of the page:
 *
 * 1. BĀLĀDI GRADES. The "Age state" chart showed Bāla 50%, Kumāra 100% and
 *    Vṛddha 50%. BPHS, Vol. 1, Ch. 45, v. 4 (Santhanam) gives "one fourth,
 *    half, full, negligible and nil". The grades and the text's own words are
 *    asserted, and "negligible" must never be printed as "nil".
 *
 * 2. THE ENGINE IS SAID. The chart had been cast with the fitted Sūrya
 *    Siddhānta engine (the reader's Settings default) and nothing on it said
 *    so. A chart cast with a Siddhānta engine now carries a badge with what the
 *    engine costs THIS chart, and Settings asks once before such an engine
 *    becomes the default for every chart.
 *
 * 3. PLANET IMAGES ON THE DASHBOARD WHEEL, as an option; letters stay the
 *    default.
 *
 * 4. THE NODE ACTUALLY USED. A true-node request under a Siddhānta engine is
 *    answered with the mean node (the text has no other); the payload used to
 *    repeat the request as node_mode and the dashboard printed "true nodes".
 *
 * Run from the repo root: node source/test/reader-trust-verify.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });

/* Each cast gets its own browser context: a cast chart is stored, and the
   Kundli page then opens on the report with the form hidden. */
async function cast(opts, inCtx) {
  const c = inCtx || await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  await p.goto("file://" + ROOT + "/kundli.html");
  await p.waitForFunction(() => window.buildLocalChart && window.__kSidAt, null, { timeout: 60000 });
  await p.evaluate(o => {
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return;
      el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true })); };
    set("k-name", "Reader"); set("k-dob", "1984-12-15"); set("k-tob", "13:31");
    set("k-lat", 28.8386); set("k-lon", 78.7733); set("k-tz", 5.5);
    set("k-ayan", "samanvaya_ecliptic"); set("k-house", "sripati");
    set("k-node", o.node || "mean"); set("k-engine", o.engine || "modern");
    set("k-ssframe", o.frame || "ayan");
  }, opts);
  await p.click("#k-go");
  await p.waitForFunction(() => window.__kdata && window.__kdata.derived, null, { timeout: 60000 });
  await p.waitForTimeout(400);
  const J = await p.evaluate(() => window.__kdata);
  return { p, J, errs };
}

/* ---- 1. bālādi grades are BPHS's ---------------------------------------- */

head("bālādi avasthā grades are BPHS Ch. 45 v. 4's");
{
  const { p, J, errs } = await cast({ engine: "modern" });
  const WANT = { "Bāla": [25, "one fourth"], "Kumāra": [50, "half"], "Yuvā": [100, "full"],
                 "Vṛddha": [0, "negligible"], "Mṛta": [0, "nil"] };
  const ORDER = ["Bāla", "Kumāra", "Yuvā", "Vṛddha", "Mṛta"];
  let right = 0;
  for (const a of J.avasthas) {
    const g = J.grahas.find(x => x.key === a.graha);
    const s = g.rashi.idx, d = g.rashi.degInSign, odd = s % 2 === 0;
    let k = Math.floor(d / 6); if (!odd) k = 4 - k;
    const name = ORDER[Math.max(0, Math.min(4, k))];
    if (a.avastha_iast === name && a.strength_percent === WANT[name][0] && a.grade === WANT[name][1]) right++;
  }
  is(right === J.avasthas.length && right === 7,
     "all seven grahas carry the state v. 3 assigns and the grade v. 4 gives (" + right + "/7)");
  is(J.avasthas.every(a => /Ch\. 45/.test(a.source || "")), "and each names its source");
  const by = Object.fromEntries(J.avasthas.map(a => [a.graha, a]));
  is(by["Sūrya"].avastha_iast === "Bāla" && by["Sūrya"].strength_percent === 25,
     "the reader's Sūrya (Dhanus 2°51′, an odd sign): Bāla, one fourth — not the 50% shown before");
  is(by["Śani"].avastha_iast === "Mṛta" && by["Śani"].grade === "nil",
     "the reader's Śani (Vṛścika 2°20′, an even sign): Mṛta, nil");
  is(by["Śukra"].avastha_iast === "Yuvā" && by["Śukra"].strength_percent === 100,
     "the reader's Śukra (Makara 16°, even): Yuvā, full");
  const html = await p.evaluate(() => (document.getElementById("kreport") || document.body).innerHTML);
  is(!/50%\s*<\/span>/.test(html) || !/Bāla[^<]{0,40}50%/.test(html),
     "the report no longer prints Bāla at 50%");
  is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs[0] : ""));
  await p.close();
}

/* ---- 2 and 4. the engine and the node are said ------------------------- */

head("a chart cast with a Siddhānta engine says so, with its cost on this chart");
{
  const { p, J } = await cast({ engine: "ssfit", frame: "ayan" });
  const V = J.engine && J.engine.vs_modern;
  is(J.engine.mode === "ssfit" && !!V, "the payload carries the engine and vs_modern");
  is(V && Math.abs(Math.abs(V.moon_deg) - 0.256) < 0.03,
     "its Moon is " + (V ? (Math.abs(V.moon_deg) * 60).toFixed(1) : "?") + "′ from the modern Moon in the same frame (expected ≈15′)");
  is(V && V.dasha_lord === "Sun", "the birth daśā lord is the Sun (Moon in Uttara Phalgunī)");
  const expect = V ? Math.abs(V.moon_deg) * 3600 * 6 * 365.2425 / 48000 : -1;
  is(V && Math.abs(V.dasha_shift_days - expect) <= 1,
     "and the daśā shift is the lord-specific rate: " + (V ? V.dasha_shift_days : "?") + " days");
  is(V && V.typical && V.typical.moon_arcmin > 30,
     "the engine's typical Moon error is carried too (" + (V && V.typical ? V.typical.moon_arcmin : "?") + "′), so one lucky chart cannot mislead");
  const badge = await p.evaluate(() => { const b = document.getElementById("k-engine-badge"); return b ? b.textContent : ""; });
  is(/fitted/.test(badge) && /not the modern ephemeris/.test(badge) && /Viṃśottarī/.test(badge),
     "the Kundli report opens with the badge, naming the engine and the daśā cost");
  is(/Modern ephemeris/.test(badge), "and says how to cast from the measured sky");
  await p.close();
}
{
  const { p, J } = await cast({ engine: "modern" });
  const badge = await p.evaluate(() => !!document.getElementById("k-engine-badge"));
  is(!badge && J.engine.vs_modern == null, "a modern chart carries no badge and no comparison");
  await p.close();
}

head("the node actually used is the node reported");
{
  const { p, J } = await cast({ engine: "ssfit", frame: "ayan", node: "true" });
  is(J.node_requested === "true" && J.node_mode === "mean",
     "true node asked for under the fitted engine: node_mode is 'mean', the request recorded beside it");
  is(/only a mean node/.test(J.node_note || ""), "and node_note says why");
  const note = await p.evaluate(() => { const n = document.getElementById("k-node-note"); return n ? n.textContent : ""; });
  is(/Mean node used/.test(note), "the report says so too");
  await p.close();
}
{
  const { p, J } = await cast({ engine: "modern", node: "true" });
  is(J.node_mode === "true" && J.node_note == null, "under the modern engine the true node is honoured, with no note");
  await p.close();
}

/* ---- 2b. Settings asks before a Siddhānta engine becomes the default ---- */

head("Settings asks once before casting every chart with a Siddhānta engine");
{
  const p = await ctx.newPage();
  await p.goto("file://" + ROOT + "/kundli.html");
  await p.waitForFunction(() => window.__ayanModes && window.NSettings, null, { timeout: 60000 });
  await p.evaluate(() => { try { localStorage.removeItem("nirayana.settings"); } catch (e) {} });
  const r = await p.evaluate(async () => {
    const S = window.NSettings; if (S.open) S.open();
    const sel = document.getElementById("nset-engine"); if (!sel) return { none: true };
    sel.value = "ssfit"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    const stored1 = JSON.parse(localStorage.getItem("nirayana.settings") || "{}").engine || "modern";
    const box = document.querySelector(".nsconfirm"), txt = box ? box.textContent : "";
    const shown = sel.value;
    box && box.querySelector("[data-nset-engine-ok]").click();
    const stored2 = JSON.parse(localStorage.getItem("nirayana.settings") || "{}").engine;
    localStorage.removeItem("nirayana.settings");
    return { stored1, txt, shown, stored2, gone: !document.querySelector(".nsconfirm") };
  });
  is(!r.none, "the Settings panel has an engine row on the Kundli page");
  is(r.stored1 === "modern" && r.shown === "modern",
     "choosing the fitted engine stores nothing yet, and the control stays on modern");
  is(/every chart/.test(r.txt) && /Viṃśottarī/.test(r.txt) && /study and comparison/.test(r.txt),
     "the question says what it costs and what it is for");
  is(r.stored2 === "ssfit" && r.gone, "an explicit yes stores it, and the question goes away");
  await p.close();
}

/* ---- 3. planet images on the dashboard wheel, as an option --------------- */

head("the dashboard wheel can show planet images; letters stay the default");
{
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const { p: q } = await cast({ engine: "modern" }, dctx);
  /* the Kundli page hands its chart to the dashboard this way when its link is followed */
  await q.evaluate(() => localStorage.setItem("learnhoro.chart", JSON.stringify(window.__kdata)));
  await q.goto("file://" + ROOT + "/dashboard.html");
  await q.waitForFunction(() => document.querySelector(".wheel svg"), null, { timeout: 60000 });
  const r = await q.evaluate(async () => {
    const wheel = document.querySelector(".wheel");
    const card = wheel.closest(".card") || wheel.parentNode;
    const before = wheel.querySelectorAll("svg image").length;
    const btn = [...card.querySelectorAll("button")].find(b => /Planet images/.test(b.textContent));
    if (!btn) return { nobtn: true, before };
    btn.click(); await new Promise(r => setTimeout(r, 300));
    const imgs = document.querySelectorAll(".wheel svg image").length;
    const titles = [...document.querySelectorAll(".wheel svg title")].map(t => t.textContent).join("|");
    return { before, imgs, stored: localStorage.getItem("nirayana.wheelImages"), titles,
             badge: !!document.getElementById("engine-badge") };
  });
  is(!r.nobtn, "the wheel card offers Letters / Planet images");
  is(r.before === 0, "letters are the default — no images until asked for");
  is(r.imgs >= 7, "Planet images draws the grahas as images (" + r.imgs + ")");
  is(/Saturn/.test(r.titles || ""), "and every marker keeps its name for screen readers and hover");
  is(r.stored === "1", "the choice is remembered in this browser");
  is(r.badge === false, "a modern chart shows no engine badge on the dashboard");
  await q.evaluate(() => { try { localStorage.removeItem("nirayana.wheelImages"); } catch (e) {} });
  await q.close();
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " reader-trust-verify — " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
