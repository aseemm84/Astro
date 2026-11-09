/* ===== the master settings panel ========================================

   Six settings, one overlay, every page. What matters is not that the panel
   renders but that each row is WIRED TO SOMETHING — a picker that stores a
   value nothing reads is the failure this project keeps finding, and it looks
   identical to a working one from the outside. So every assertion here goes
   through an observable consequence: a chart field, a formatter's output, an
   attribute on <html>, or the key another module already reads.

   The defaults are asserted to be the site as it was before the panel existed.
   A reader who never opens it must get exactly yesterday's site. */

import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const br = await chromium.launch();
const errs = [];
const CWD = process.cwd();

/* ---- 1. it is on every page, engine or no engine ----------------------- */
head("The panel reaches every page");
/* Pages built from the shared shell, which is what loads site.js and so the
   panel. dashboard.html is deliberately NOT here: it is a standalone
   single-file page with its own chrome and no external scripts at all, so it
   carries neither the panel nor the theme picker — the latter was already true
   before this work. The exclusion is asserted below rather than left implicit,
   so that adding site.js to that page makes this harness notice. */
const PAGES = ["index.html", "grahas.html", "kundli.html", "ayanamsa.html",
               "now.html", "accuracy.html", "kinetic-workstation.html",
               "divisions.html", "calendar.html"];
for (const f of PAGES) {
  const pg = await br.newPage();
  pg.on("pageerror", (e) => errs.push(f + ": " + e.message));
  await pg.goto("file://" + CWD + "/" + f);
  await pg.waitForFunction(() => window.NSettings, null, { timeout: 30000 }).catch(() => {});
  const r = await pg.evaluate(() => {
    const btn = document.querySelector(".nsopen");
    if (btn) btn.click();
    const ov = document.querySelector(".nsover");
    return {
      api: !!(window.NSettings && window.NSettings.get),
      btn: !!btn,
      open: !!(ov && !ov.hasAttribute("hidden")),
      pickers: document.querySelectorAll(".themepick").length,
      rows: document.querySelectorAll(".nsover .nsrow select").length
    };
  });
  is(r.api && r.btn && r.open, `${f}: window.NSettings, a trigger, and the overlay opens`);
  is(r.pickers === 1, `${f}: exactly one theme picker on the page (got ${r.pickers})`);
  await pg.close();
}

/* the one documented exclusion, stated as a fact about that page */
{
  const pg2 = await br.newPage();
  await pg2.goto("file://" + CWD + "/dashboard.html");
  await pg2.waitForTimeout(800);
  const d = await pg2.evaluate(() => ({
    scripts: document.querySelectorAll("script[src]").length,
    ns: !!window.NSettings
  }));
  is(d.scripts === 0 && !d.ns,
    "dashboard.html is standalone — no external scripts, so no panel (documented exclusion)");
  await pg2.close();
}

/* ---- 2. the defaults are the site as it was ---------------------------- */
head("Defaults reproduce the pre-panel site");
const pg = await br.newPage();
pg.on("pageerror", (e) => errs.push("kundli: " + e.message));
await pg.goto("file://" + CWD + "/kundli.html");
await pg.waitForFunction(() => window.NSettings && window.buildLocalChart, null, { timeout: 40000 });
const def = await pg.evaluate(() => {
  try { localStorage.removeItem("nirayana.settings"); } catch (e) {}
  return window.NSettings.defaults();
});
is(def.ayan === "lahiri", "ayanāṃśa defaults to lahiri");
is(def.house === "whole", "bhāva frame defaults to whole-sign");
is(def.node === "mean", "lunar node defaults to mean");
is(def.riseconv === "limb", "sunrise defaults to upper limb");
is(def.degfmt === "dm", "degrees default to degrees-and-minutes");

/* ---- 3. each row is wired to an observable consequence ----------------- */
head("Every setting changes something that can be seen");

/* the three chart conventions reach the chart form, which reaches the chart */
const chart = await pg.evaluate(async () => {
  function form() {
    return { ayan: document.getElementById("k-ayan").value,
             house: document.getElementById("k-house").value,
             node: document.getElementById("k-node") ? document.getElementById("k-node").value : null };
  }
  window.NSettings.set({ ayan: "raman", house: "sripati", node: "true" });
  await new Promise((r) => setTimeout(r, 120));
  const after = form();
  /* and a chart built from the form must carry them */
  const J = window.buildLocalChart({ year: 1984, month: 5, day: 17, hour: 14, minute: 35,
    lat: 28.6139, lon: 77.209, tzHours: 5.5,
    ayanamsa: after.ayan, houseSystem: after.house });
  window.NSettings.set(window.NSettings.defaults());
  await new Promise((r) => setTimeout(r, 120));
  return { after, back: form(), mode: J.house_system.mode, ayanName: J.ayanamsa_mode };
});
is(chart.after.ayan === "raman", "setting the ayanāṃśa moves the chart form's picker");
is(chart.after.house === "sripati", "setting the bhāva frame moves the chart form's picker");
is(chart.after.node === "true", "setting the node moves the chart form's picker");
is(chart.mode === "sripati", "a chart built from the form is actually in that frame");
is(chart.ayanName === "raman", "…and in that ayanāṃśa");
is(chart.back.ayan === "lahiri" && chart.back.house === "whole",
  "resetting to defaults moves the pickers back");

/* sunrise must reach the key panchanga.js reads, and tell it, not just store */
const rise = await pg.evaluate(async () => {
  window.NSettings.set({ riseconv: "geom" });
  await new Promise((r) => setTimeout(r, 80));
  const legacy = localStorage.getItem("nirayana.riseconv");
  const np = (window.NP && window.NP.conv) ? window.NP.conv() : null;
  window.NSettings.set({ riseconv: "limb" });
  return { legacy: legacy, np: np };
});
is(rise.legacy === "geom",
  "sunrise is written to nirayana.riseconv, the key panchanga.js and now.js already read");
is(rise.np === null || rise.np === "geom",
  "…and NP is told directly, so a cached convention cannot go stale" +
  (rise.np === null ? " (NP not on this page)" : ""));

/* degrees must change the report formatter's actual output */
/* dm() is module-scoped in the report bundle, so it is tested through what a
   reader actually sees: the rendered report. A formatter checked by calling it
   directly could be right while nothing on the page used it. */
/* dm() is module-scoped in the report bundle, so it is tested through what a
   reader actually sees: the rendered report. The first version of this looked
   for the FIRST degree-shaped string in the HTML and kept matching d°m′s″
   produced by a DIFFERENT formatter — the report has several and only dm() is
   on this setting. So each mode asserts the presence of its own pattern and
   the ABSENCE of the others' distinctive ones, which is what distinguishes a
   wired setting from a coincidence. */
async function renderWith(fmt) {
  return pg.evaluate(async (fmt) => {
    window.NSettings.set({ degfmt: fmt });
    const J = window.buildLocalChart({ year: 1984, month: 5, day: 17, hour: 14,
      minute: 35, lat: 28.6139, lon: 77.209, tzHours: 5.5 });
    const html = window.buildKundliReport(J);
    return {
      dec: (html.match(/\d+\.\d{4}°/g) || []).length,
      dms: (html.match(/\d+°\d\d′\d\d″/g) || []).length,
      dm:  (html.match(/\d+°\d\d′(?!\d*″)/g) || []).length
    };
  }, fmt);
}
const cDm = await renderWith("dm"), cDms = await renderWith("dms"), cDec = await renderWith("dec");
await pg.evaluate(() => window.NSettings.set({ degfmt: "dm" }));
/* NOT "and no decimal degrees": the report contains 4-decimal degree strings
   from formatters that are not dm() and are not on this setting, so demanding
   zero of them was an expectation about the wrong thing. What matters is that
   the count MOVES with the setting. */
is(cDm.dm > 0, `default prints d°m′ (${cDm.dm} occurrences)`);
is(cDec.dec > cDm.dec,
  `and decimal mode adds decimal degrees (${cDm.dec} → ${cDec.dec})`);
is(cDec.dec > 0,
  `asking for decimal degrees puts them on the page (${cDec.dec} occurrences)`);
is(cDms.dms > cDm.dms,
  `asking for seconds adds d°m′s″ strings (${cDm.dms} → ${cDms.dms})`);
is(cDec.dm < cDm.dm,
  `and decimal mode removes d°m′ strings (${cDm.dm} → ${cDec.dm}) — ` +
  "a setting that leaves the count unchanged is not reaching the page");

/* theme must reach <html>, through NTheme and not a second writer */
const th = await pg.evaluate(async () => {
  const before = document.documentElement.getAttribute("data-theme");
  window.NTheme.set("midnight");
  const mid = document.documentElement.getAttribute("data-theme");
  window.NTheme.set("");
  return { before: before, mid: mid,
           after: document.documentElement.getAttribute("data-theme") };
});
is(th.mid === "midnight", "the theme reaches html[data-theme]");
is(th.after === null, "clearing it removes the attribute rather than setting a value");

/* ---- 4. the store survives a reload, and a bad store does not break it -- */
head("Persistence, and what happens when the store misbehaves");
const persist = await pg.evaluate(() => {
  window.NSettings.set({ ayan: "raman", house: "sripati" });
  return localStorage.getItem("nirayana.settings");
});
is(/raman/.test(persist) && /sripati/.test(persist), "settings are written as one JSON object");
await pg.reload();
await pg.waitForFunction(() => window.NSettings, null, { timeout: 30000 });
const after = await pg.evaluate(() => {
  const s = window.NSettings.get();
  /* a corrupt store must give defaults, not a thrown page */
  localStorage.setItem("nirayana.settings", "{not json");
  let rec = null;
  try { rec = JSON.parse(JSON.stringify(s)); } catch (e) {}
  return { s: s, rec: rec };
});
is(after.s.ayan === "raman" && after.s.house === "sripati",
  "they survive a reload");
await pg.reload();
await pg.waitForFunction(() => window.NSettings, null, { timeout: 30000 });
const corrupt = await pg.evaluate(() => {
  const s = window.NSettings.get();
  localStorage.removeItem("nirayana.settings");
  return s;
});
is(corrupt.ayan === "lahiri" && corrupt.house === "whole",
  "a corrupt store falls back to defaults instead of throwing");
const junk = await pg.evaluate(() => {
  /* an unknown value for a closed set must not be honoured */
  localStorage.setItem("nirayana.settings", JSON.stringify({ house: "placidus", degfmt: "cubits" }));
  return null;
});
await pg.reload();
await pg.waitForFunction(() => window.NSettings, null, { timeout: 30000 });
const clamped = await pg.evaluate(() => {
  const s = window.NSettings.get();
  localStorage.removeItem("nirayana.settings");
  return s;
});
is(clamped.house === "whole" && clamped.degfmt === "dm",
  "a value outside the closed set is clamped to the default, not passed through");

/* ---- 5. the re-cast offer, which is the whole precedence decision ------- */
head("A chart cast with different settings is offered a re-cast, not silently changed");
/* Driven the way a reader hits it: a chart saved under one frame, the master
   set to the other, and the page reloaded so the real restore path runs. The
   earlier version of this block called a module-private function, failed to
   reach it, and fell back to asserting that an API exists — which is not a
   test of the precedence decision at all. */
await pg.evaluate(() => {
  localStorage.setItem("nirayana.birth", JSON.stringify({
    year: 1984, month: 5, day: 17, hour: 14, minute: 35,
    lat: 28.6139, lon: 77.209, tzHours: 5.5,
    ayanamsa: "lahiri", houseSystem: "whole", node: "mean", name: null }));
  localStorage.setItem("nirayana.settings", JSON.stringify({ house: "sripati" }));
});
await pg.reload();
await pg.waitForFunction(() => window.NSettings && document.getElementById("k-house"),
  null, { timeout: 40000 });
await pg.waitForTimeout(2500);
const recast = await pg.evaluate(() => {
  const bar = document.getElementById("k-recast");
  return { bar: !!bar, text: bar ? bar.textContent : "",
           formHouse: document.getElementById("k-house").value,
           hasKeepBtn: !!document.getElementById("k-recast-keep") };
});
is(recast.formHouse === "sripati",
  `the master's frame is the one applied, not the file's (form reads ${recast.formHouse})`);
is(recast.bar, "a notice appears saying the chart was cast with different settings");
is(/bh\u0101va frame/i.test(recast.text) && /whole/.test(recast.text) && /sripati/.test(recast.text),
  "the notice names the setting and both values");
is(recast.hasKeepBtn, "and offers a button to use the settings it was cast with");
const kept = await pg.evaluate(async () => {
  const b = document.getElementById("k-recast-keep");
  if (!b) return null;
  b.click();
  await new Promise((r) => setTimeout(r, 1200));
  return { formHouse: document.getElementById("k-house").value,
           barGone: !document.getElementById("k-recast") };
});
is(kept && kept.formHouse === "whole",
  "clicking it restores the frame the chart was cast with");
is(kept && kept.barGone, "and the notice is removed rather than left stale");
await pg.evaluate(() => {
  localStorage.removeItem("nirayana.birth");
  localStorage.removeItem("nirayana.settings");
});

is(errs.length === 0, "no page errors on any page" + (errs.length ? ": " + errs.join(" | ") : ""));
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
