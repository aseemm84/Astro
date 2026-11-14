/* The engine is the reader's choice: modern, Sūrya Siddhānta as written, or
 * the fitted tier — site-wide in Settings, per page, and per chart.
 *
 * Holds the built site to:
 *   - modern is the default, and a chart cast with no engine named is the
 *     same chart as one cast with engine:"modern";
 *   - "as written" and "fitted" place every graha EXACTLY where ss-engine.js
 *     puts it (own frame), and the lagna shares that frame;
 *   - "ayan" frame carries the text's positions into the chosen ayanāṃśa;
 *   - the comparison pages (Sūrya Siddhānta, Engine Lab) stay modern whatever
 *     the site is set to, and the always-modern functions ignore the choice;
 *   - a per-page override stays on its page; a shared link carries the engine;
 *   - every chart names its engine;
 *   - Engine Lab explains the three engines and tabulates their real errors.
 *
 * Run from the repository root:  node source/test/engine-choice-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); } else { fail++; console.log("  FAIL " + t); } };
const R = process.cwd(), errs = [];
const br = await chromium.launch();
const B = { year: 2026, month: 11, day: 13, hour: 12, minute: 0, lat: 28.6139, lon: 77.209, tzHours: 5.5,
            node: "mean", houseSystem: "whole", ayanamsa: "lahiri" };

console.log("\nThe engine inside a chart");
{
  const p = await br.newPage(); p.on("pageerror", e => errs.push("kundli: " + e.message));
  await p.goto("file://" + R + "/kundli.html");
  await p.waitForFunction(() => window.buildLocalChart && window.__engine && window.SSEngine, null, { timeout: 60000 });
  const r = await p.evaluate((B) => {
    /* Date.UTC truncates a fractional hour, so the offset is applied in ms */
    const ms = Date.UTC(B.year, B.month - 1, B.day, 0, 0) + (B.hour + B.minute / 60 - B.tzHours) * 3600000;
    const SA = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha", Jupiter: "Guru", Venus: "Śukra", Saturn: "Śani" };
    const EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars", "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus", "Śani": "Saturn" };
    const sid = J => { const o = {}; (J.grahas || []).forEach(g => { if (EN[g.sa]) o[EN[g.sa]] = g.sidereal_deg; }); return o; };
    const J0 = window.buildLocalChart(Object.assign({}, B));
    const Jm = window.buildLocalChart(Object.assign({}, B, { engine: "modern" }));
    const Js = window.buildLocalChart(Object.assign({}, B, { engine: "ss", ssframe: "own" }));
    const Jf = window.buildLocalChart(Object.assign({}, B, { engine: "ssfit", ssframe: "own" }));
    const Ja = window.buildLocalChart(Object.assign({}, B, { engine: "ss", ssframe: "ayan" }));
    /* the reference: a SEPARATE ss-engine instance would be ideal; the page's
       own window.SSEngine is the site engine's, so read it in each tier */
    const S = window.SSEngine, FD = window.__SS_FIT_DATA;
    S.bare(); S.setMeasured(FD);
    const refBare = {}; Object.keys(SA).forEach(k => { refBare[k] = S.trueLongitude(SA[k], S.ahargana(ms)).lon; });
    S.measured();
    const refFit = {}; Object.keys(SA).forEach(k => { refFit[k] = S.trueLongitude(SA[k], S.ahargana(ms)).lon; });
    S.bare(); S.setMeasured(FD);
    const textAy = S.ayanamsa(ms);
    window.buildLocalChart(Object.assign({}, B, { engine: "modern" }));       /* leave it as found */
    return { s0: sid(J0), sm: sid(Jm), ss: sid(Js), sf: sid(Jf), sa: sid(Ja), refBare, refFit, textAy,
             e0: J0.engine, es: Js.engine, ef: Jf.engine,
             ay0: J0.ayanamsha_deg, ays: Js.ayanamsha_deg, ayf: Jf.ayanamsha_deg, aya: Ja.ayanamsha_deg,
             mode_s: Js.ayanamsa_mode, mode_a: Ja.ayanamsa_mode, stamp: Js.substrate_stamp };
  }, B);
  const keys = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const d = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
  is(r.e0 && r.e0.mode === "modern", "a chart cast with no engine named is cast with the modern one");
  is(keys.every(k => d(r.s0[k], r.sm[k]) < 1e-9), "and it is the same chart as one cast with engine: modern");
  is(keys.every(k => d(r.ss[k], r.refBare[k]) < 1e-6),
     "'as written' places every graha exactly where the Sūrya Siddhānta engine puts it");
  is(keys.every(k => d(r.sf[k], r.refFit[k]) < 1e-6),
     "'fitted' places every graha exactly where the fitted tier puts it");
  is(keys.some(k => d(r.sf[k], r.ss[k]) > 0.05), "and the two are genuinely different engines");
  is(r.mode_s === "ss_engine" && Math.abs(r.ays - r.textAy) < 1e-9,
     "in its own frame the lagna is converted with the text's own ayanāṃśa (" + r.ays.toFixed(3) + "°), one frame for the whole chart");
  is(Math.abs(r.ayf - r.ay0) < 1e-9, "the fitted tier's own frame is Lahiri, the frame it was fitted in");
  is(r.mode_a === "lahiri" && keys.every(k => d(r.sa[k], r.refBare[k] + r.textAy - r.aya) < 1e-6),
     "in the 'chosen ayanāṃśa' frame the text's positions are carried through its tropical into that convention");
  is(r.es.mode === "ss" && /Sūrya Siddhānta/.test(r.es.name) && /modern method/.test(r.es.note || ""),
     "the chart names its engine, and says what stays modern");
  is(/Sūrya Siddhānta/.test(r.stamp), "and so does its substrate stamp");
  await p.close();
}

console.log("\nComparison pages stay modern");
for (const f of ["siddhanta.html", "engine-lab.html"]) {
  const p = await br.newPage(); p.on("pageerror", e => errs.push(f + ": " + e.message));
  await p.addInitScript(() => { try { localStorage.setItem("nirayana.settings", JSON.stringify({ engine: "ss" })); } catch (e) {} });
  await p.goto("file://" + R + "/" + f); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => ({ mode: window.__engine().mode, lock: !!document.querySelector(".npeng-lock"),
                                      sel: !!document.getElementById("np-engine-sel") }));
  is(r.mode === "modern" && r.lock && !r.sel, f + ": the site is set to the Siddhānta, the page stays modern and says why");
  await p.close();
}

console.log("\nSite setting, page override, and the always-modern functions");
{
  const ctx = await br.newContext();
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push("now: " + e.message));
  await p.addInitScript(() => { try { if (!sessionStorage.getItem("seeded")) {
    localStorage.setItem("nirayana.settings", JSON.stringify({ engine: "ss" })); sessionStorage.setItem("seeded", "1"); } } catch (e) {} });
  await p.goto("file://" + R + "/now.html"); await p.waitForTimeout(2000);
  const a = await p.evaluate(() => {
    const t = new Date(Date.UTC(2026, 10, 13, 6));
    return { mode: window.__engine().mode, sid: window.__kSidAt("Saturn", t), mod: window.__kSidAtModern("Saturn", t),
             sel: !!document.getElementById("np-engine-sel") };
  });
  is(a.mode === "ss" && a.sel, "Now follows the site's engine, and offers its own");
  is(Math.abs(a.sid - a.mod) > 0.5, "the engine moves Saturn by " + Math.abs(a.sid - a.mod).toFixed(2) + "° from the modern sky…");
  await p.selectOption("#np-engine-sel", "modern"); await p.waitForTimeout(2500);
  const b = await p.evaluate(() => window.__engine().mode);
  is(b === "modern", "a page override wins on that page");
  const q = await ctx.newPage(); await q.goto("file://" + R + "/calendar.html"); await q.waitForTimeout(1500);
  is((await q.evaluate(() => window.__engine().mode)) === "ss", "and stays on that page: the Calendar still follows the site");
  await ctx.close();
}

console.log("\nThe Kundli form and shared links");
{
  const p = await br.newPage(); p.on("pageerror", e => errs.push("kundli2: " + e.message));
  await p.goto("file://" + R + "/kundli.html#d=20261113&t=1200&p=28.6139,77.209,5.5&a=lahiri&hs=whole&en=ssfit&sf=own");
  await p.waitForFunction(() => document.getElementById("kreport"), null, { timeout: 60000 });
  const r = await p.evaluate(() => ({ e: document.getElementById("k-engine").value, conv: document.getElementById("k-conv").textContent,
    hash: location.hash }));
  is(r.e === "ssfit", "a link carrying en=ssfit opens with the fitted engine selected");
  is(/fitted/.test(r.conv), "the conventions line names it: " + r.conv);
  is(/en=ssfit/.test(r.hash), "and the link written back keeps it");
  await p.close();
}

console.log("\nEngine Lab explains the three, with their real errors");
{
  const p = await br.newPage(); p.on("pageerror", e => errs.push("engine-lab: " + e.message));
  await p.goto("file://" + R + "/engine-lab.html"); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => ({
    three: !!document.getElementById("three") && /as written/.test(document.querySelector(".eltbl3").textContent),
    gloss: document.querySelectorAll(".elgloss dt").length,
    rows: document.querySelectorAll("#el-errtab table.elerr")[0]?.querySelectorAll("tbody tr").length || 0,
    node: /Rāhu · Ketu/.test((document.querySelectorAll("#el-errtab table.elerr")[0] || {}).textContent || ""),
    dasha: /daśā date/.test(document.getElementById("el-errtab").textContent),
    note: (document.getElementById("el-errnote") || {}).textContent || "" }));
  is(r.three, "a plain-words section names modern, fitted and as written");
  is(r.gloss >= 6, "with a glossary of the page's terms (" + r.gloss + ")");
  /* seven grahas and, since 14 November 2026, the node: the fitted engine
     corrects Rāhu and Ketu too, so its error is reported beside the others */
  is(r.rows === 8 && r.node, "the error table has all seven grahas and the node (" + r.rows + " rows)");
  is(r.dasha && r.note.length > 100, "and turns the errors into tithi, pāda and daśā consequences");
  await p.close();
}

is(errs.length === 0, "no page errors (" + errs.slice(0, 3).join(" | ") + ")");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
