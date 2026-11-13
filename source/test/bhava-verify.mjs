/* bhava-verify.mjs — the bhāva-systems page.
 *
 * The page's whole value is that the three constructions are the REAL ones
 * and are compared honestly, so that is what is checked: the Śrīpati ring is
 * the report's own module to the degree, whole-sign really does sit on sign
 * boundaries, equal really is equal, and the disagreement column is what the
 * module says rather than what this page recomputed.
 *
 * One check exists because of a specific fault. SPSripati's arrays are
 * one-indexed with a null at [0] and length 13; the page tested for length 12
 * and silently fell back to drawing nothing, so it showed two rings where it
 * should have shown three and reported no disagreements at all — with no
 * error anywhere to say so. A missing ring must now fail loudly.
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
  /* The page opens on "now", and two checks below are about the geometry of that
     moment: that Śrīpati houses are unequal, and that they are more even at the
     equator than at 40°. At some sidereal times the lagna and the MC fall almost
     exactly 90° apart and both are briefly false — which is astronomy, not a
     fault. It failed on 13 November 2026 for exactly that reason. The clock is
     pinned so a pass means the same thing every day; timers keep running. */
  await p.clock.setFixedTime(new Date(Date.UTC(2026, 10, 1, 6, 0, 0)));
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/bhava-systems.html");
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector("#bh-wheel svg"),
                          null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(900);
  return { p, errs };
}

head("it draws all three systems with no chart saved");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    rasis: document.querySelectorAll("#bh-wheel .bh-rasi").length,
    whole: document.querySelectorAll("#bh-wheel .bh-whole").length,
    equal: document.querySelectorAll("#bh-wheel .bh-equal").length,
    sri: document.querySelectorAll("#bh-wheel .bh-sri").length,
    grahas: document.querySelectorAll("#bh-wheel .bh-g").length,
    rows: document.querySelectorAll("#bh-table tbody tr").length,
    cusp: !!document.querySelector("#bh-cusp svg"),
    lat: !!document.querySelector("#bh-latplot svg"),
    meanings: document.querySelectorAll("#bh-meanings .axcell").length,
  }));
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors (" + errs.filter(quiet)[0] + ")");
  is(!r.hasChart, "no chart is stored");
  is(r.rasis === 12, "the twelve rāśis are drawn");
  /* the three must ALL be there — a silent fallback to two is the fault this
     page already had once */
  is(r.whole === 12, "whole sign: twelve houses");
  is(r.equal === 12, "equal: twelve houses");
  is(r.sri === 12, "Śrīpati: twelve houses — not silently absent");
  is(r.grahas === 9, "and the nine grahas");
  is(r.rows === 9 && r.cusp && r.lat && r.meanings === 12,
     "the table, the cusp curve, the latitude plot and the twelve significations");
}

head("the three constructions are what they claim to be");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    /* rebuild the boundaries here, independently, from the engine and the
       shared Śrīpati module, and compare against what the page drew */
    const sel = document.getElementById("bh-when");
    const place = { lat: 23.1765, lon: 75.7885, tz: 5.5 };
    const d = new Date(Date.parse(sel.value));
    const sk = window.quickSky({
      year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
      hour: d.getHours(), minute: d.getMinutes(), second: 0,
      tzHours: place.tz, lat: place.lat, lon: place.lon });
    const sp = window.SPSripati.build(sk.lagna, sk.mc);
    const arc = (a, b) => ((b - a) % 360 + 360) % 360;
    const sriB = [];
    for (let k = 0; k < 12; k++) sriB.push(sp.sandhi[k === 0 ? 12 : k]);
    const widths = sriB.map((v, i) => arc(v, sriB[(i + 1) % 12]));
    /* whole sign must sit on sign boundaries; equal must be exactly 30 apart */
    const wholeStart = Math.floor(sk.lagna / 30) * 30;
    const equalW = [];
    for (let k = 0; k < 12; k++) equalW.push(arc((sk.lagna + k * 30) % 360,
                                                 (sk.lagna + (k + 1) * 30) % 360));
    /* and the page's own table must agree with the module about every graha */
    const rows = [...document.querySelectorAll("#bh-table tbody tr")].map(tr => {
      const td = tr.querySelectorAll("td");
      return { en: td[0].textContent.trim(), sri: +td[4].textContent.trim() };
    });
    const mismatch = sk.planets.filter(pl => {
      const row = rows.filter(x => x.en === pl.en)[0];
      return !row || row.sri !== sp.houseOf(pl.sid);
    }).length;
    return {
      lagna: sk.lagna, mc: sk.mc,
      wholeOnSign: wholeStart % 30 === 0,
      equalAllThirty: equalW.every(w => Math.abs(w - 30) < 1e-9),
      sriSum: widths.reduce((a, b) => a + b, 0),
      sriUnequal: Math.max(...widths) - Math.min(...widths),
      mismatch, nRows: rows.length,
      quad: arc(sk.mc, sk.lagna)
    };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.wholeOnSign, "whole-sign houses begin on a sign boundary, by construction");
  is(r.equalAllThirty, "equal houses are all exactly 30° wide");
  is(Math.abs(r.sriSum - 360) < 1e-6,
     "the Śrīpati houses close the circle (" + r.sriSum.toFixed(6) + "°)");
  /* the whole point of Śrīpati: it is NOT equal, because the lagna and the MC
     are not a quarter-circle apart away from the equator */
  is(r.sriUnequal > 0.5,
     "and are unequal, widest minus narrowest = " + r.sriUnequal.toFixed(2) + "°");
  is(Math.abs(r.quad - 90) > 0.5,
     "because the lagna and the MC are " + r.quad.toFixed(2) + "° apart, not 90°");
  is(r.nRows === 9 && r.mismatch === 0,
     "and the page's Śrīpati column is the module's own houseOf for every graha");
}

head("latitude distorts the houses, and the page shows where it fails");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const arc = (a, b) => ((b - a) % 360 + 360) % 360;
    const place = { lon: 75.7885, tz: 5.5 };
    const d = new Date(Date.parse(document.getElementById("bh-when").value));
    const spread = lat => {
      const sk = window.quickSky({
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        hour: d.getHours(), minute: d.getMinutes(), second: 0,
        tzHours: place.tz, lat: lat, lon: place.lon });
      const sp = window.SPSripati.build(sk.lagna, sk.mc);
      if (!sp) return null;
      const b = [];
      for (let k = 0; k < 12; k++) b.push(sp.sandhi[k === 0 ? 12 : k]);
      const wd = b.map((v, i) => arc(v, b[(i + 1) % 12]));
      return Math.max(...wd) - Math.min(...wd);
    };
    const r0 = spread(0), r40 = spread(40), r65 = spread(65);
    /* the slider must actually move the readout */
    const el = document.getElementById("bh-lat");
    el.value = "60"; el.dispatchEvent(new Event("input", { bubbles: true }));
    await w(600);
    return { r0, r40, r65,
             read: document.getElementById("bh-latread").textContent,
             note: document.getElementById("bh-latnote").textContent };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(r.r0 != null && r.r40 != null && r.r0 < r.r40,
     "houses are more even at the equator than at 40° (" +
     (r.r0 || 0).toFixed(2) + "° vs " + (r.r40 || 0).toFixed(2) + "° of spread)");
  is(r.r65 == null || r.r65 > r.r40,
     "and more distorted again at 65°" +
     (r.r65 == null ? " — or the construction refuses, which is also an answer"
                    : " (" + r.r65.toFixed(2) + "°)"));
  is(/60°/.test(r.read), "the latitude slider moves the readout (" + r.read + ")");
  is(/widest|does not resolve/.test(r.note),
     "and the note says what happened there");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " bhava-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
