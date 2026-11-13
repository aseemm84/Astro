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

/* THE EXCLUSION IS GONE. This block used to assert the opposite — that
   dashboard.html had no panel, "documented exclusion" — because the page is a
   standalone document that loads no site.js and no CSS bundle. That was a
   limitation recorded as an expectation, and when the limitation was fixed
   this assertion is what noticed. build.py now inlines css/settings.css and
   js/settings.js into the adopted pages, so the panel reaches them while they
   keep working as single files.

   What must still hold is the standalone property itself: ZERO external
   scripts. If the panel ever arrives as <script src=>, these pages stop
   working when opened straight off the filesystem, which is the whole reason
   they exist as single files. The dashboard's behaviour with the panel is
   checked further down, after the engine-page checks. */
{
  const pg2 = await br.newPage();
  await pg2.goto("file://" + CWD + "/dashboard.html");
  await pg2.waitForTimeout(800);
  const d = await pg2.evaluate(() => ({
    scripts: document.querySelectorAll("script[src]").length,
    links: document.querySelectorAll('link[rel="stylesheet"]').length,
    ns: !!window.NSettings
  }));
  is(d.scripts === 0,
    "dashboard.html still loads NO external scripts — it must work from file://");
  is(d.links === 0,
    "and no external stylesheets either, for the same reason");
  is(d.ns === true,
    "and it now has the settings panel anyway, inlined at build time");
  await pg2.close();
}

/* ---- 2. the defaults (Samanvaya–Ecliptic and Śrīpati since Nov 2026) ---- */
head("Defaults: Samanvaya–Ecliptic, Śrīpati, mean node, upper limb, d°m′");
const pg = await br.newPage();
pg.on("pageerror", (e) => errs.push("kundli: " + e.message));
await pg.goto("file://" + CWD + "/kundli.html");
await pg.waitForFunction(() => window.NSettings && window.buildLocalChart, null, { timeout: 40000 });
const def = await pg.evaluate(() => {
  try { localStorage.removeItem("nirayana.settings"); } catch (e) {}
  return window.NSettings.defaults();
});
is(def.ayan === "samanvaya_ecliptic", "ayanāṃśa defaults to Samanvaya–Ecliptic (" + def.ayan + ")");
is(def.house === "sripati", "bhāva frame defaults to Śrīpati (" + def.house + ")");
const formDef = await pg.evaluate(() => ({ ayan: document.getElementById("k-ayan").value,
  house: document.getElementById("k-house").value }));
is(formDef.ayan === "samanvaya_ecliptic" && formDef.house === "sripati",
  "and a fresh chart form shows them (" + formDef.ayan + ", " + formDef.house + ")");
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
  window.NSettings.set({ ayan: "raman", house: "whole", node: "true" });
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
is(chart.after.house === "whole", "setting the bhāva frame moves the chart form's picker");
is(chart.after.node === "true", "setting the node moves the chart form's picker");
is(chart.mode === "whole", "a chart built from the form is actually in that frame");
is(chart.ayanName === "raman", "…and in that ayanāṃśa");
is(chart.back.ayan === "samanvaya_ecliptic" && chart.back.house === "sripati",
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
is(corrupt.ayan === "samanvaya_ecliptic" && corrupt.house === "sripati",
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
is(clamped.house === "sripati" && clamped.degfmt === "dm",
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

/* ---- 6. the toggle must change the REPORT ON SCREEN -------------------
   This is the assertion that was missing, and its absence is why a shipped
   toggle appeared to do nothing. Every earlier check drove the engine
   directly — buildLocalChart then buildKundliReport — which bypasses the UI
   entirely. The auto-re-cast lived only in ui.js, so with it absent the
   engine checks all passed while a reader flipping the switch watched a
   report that never recomputed. A setting is not wired until the page a
   person is looking at changes. */
head("Changing a reckoning setting re-casts the chart a reader is looking at");
await pg.evaluate(() => {
  try { localStorage.clear(); } catch (e) {}
  /* clearing storage does NOT reset settings.js's in-memory cache, so an
     earlier section leaving the frame on sripati made the set() below a
     no-op that broadcast nothing and re-cast nothing. Set the baseline
     through the API, which is the only thing that updates the cache. */
  window.NSettings.set({ house: "whole" });
  document.getElementById("k-dob").value = "1975-01-09";
  document.getElementById("k-tob").value = "03:20";
  document.getElementById("k-lat").value = "59.9139";
  document.getElementById("k-lon").value = "10.7522";
  document.getElementById("k-tz").value = "1";
  document.getElementById("k-go").click();
});
await pg.waitForTimeout(4500);
const shot = () => pg.evaluate(() => {
  const f = [...document.querySelectorAll(".kchartfig")]
    .filter((x) => /North Indian/.test(x.textContent))[0];
  const vg = [...document.querySelectorAll(".kchartfig")]
    .filter((x) => /^D9 ·/.test((x.querySelector("figcaption") || {}).textContent || ""))[0];
  return {
    cap: f ? f.querySelector("figcaption").textContent : null,
    d1: f ? [...f.querySelectorAll("text")].map((t) => t.textContent).join(",") : null,
    d9: vg ? [...vg.querySelectorAll("text")].map((t) => t.textContent).join(",") : null,
    body: document.getElementById("k-out").innerText.length
  };
});
const preT = await shot();
await pg.evaluate(() => window.NSettings.set({ house: "sripati" }));
await pg.waitForTimeout(5500);
const postT = await shot();
is(preT.d1 && postT.d1 && preT.d1 !== postT.d1,
  "flipping the bhāva frame in the panel re-draws the D1 chart with no other action");
is(/Rāśi \(D1\)/.test(preT.cap || "") && /Bhāva Chalita/.test(postT.cap || ""),
  `and retitles it (“${(preT.cap||"").slice(0,22)}” → “${(postT.cap||"").slice(0,24)}”)`);
is(preT.d9 && postT.d9 && preT.d9 !== postT.d9,
  "the divisional charts change too — D1 to D60 carry the rāśi chart's bhāva");
await pg.evaluate(() => { window.NSettings.set({ house: "whole" }); });
await pg.waitForTimeout(4000);
const backT = await shot();
is(backT.d1 === preT.d1, "switching back restores the whole-sign chart exactly");

/* ---- the adopted pages: the dashboard ----------------------------------
   dashboard.html is a standalone document that loads no site.js and no CSS
   bundle, so for a while it was the ONE page with no settings panel at all —
   the settings reached every page built from a shell and stopped at the four
   adopted ones. build.py now inlines css/settings.css and js/settings.js into
   them.

   It is also a pure RENDERER: it displays a chart cast elsewhere and
   recomputes nothing. So the casting rows must be frozen there rather than
   offered, because a bhāva-frame picker that changed a stored key and not one
   pixel of the chart in front of you is "a switch that visibly does nothing" —
   which the degfmt note in settings.js refuses on this project's behalf. */
head("The dashboard, which renders a chart it did not compute");
{
  const dk = await br.newPage();
  await dk.goto("file://" + CWD + "/kundli.html");
  await dk.waitForFunction(() => window.buildLocalChart, null, { timeout: 40000 });
  /* cast in the NON-default frame (whole-sign, Lahiri) so the page has a
     difference with the stored defaults to notice and re-cast */
  const payload = await dk.evaluate(() => JSON.stringify(window.buildLocalChart({
    year: 1990, month: 3, day: 15, hour: 10, minute: 30,
    lat: 28.6139, lon: 77.2090, tzHours: 5.5, houseSystem: "whole", ayanamsa: "lahiri" })));
  await dk.close();

  const dp = await br.newPage();
  dp.on("pageerror", (e) => errs.push("dashboard: " + e));
  await dp.addInitScript((p) => {
    try { localStorage.setItem("learnhoro.chart", p); } catch (e) {}
  }, payload);
  await dp.goto("file://" + CWD + "/dashboard.html");
  await dp.waitForTimeout(5000);

  const base = await dp.evaluate(() => ({
    cards: document.querySelectorAll(".card").length,
    btn: !!document.querySelector(".nsopen"),
    mount: (() => { const b = document.querySelector(".nsopen");
      return b && b.parentElement ? b.parentElement.className : ""; })(),
    api: typeof window.NSettings,
    echarts: typeof window.echarts,
  }));
  is(base.cards > 20, "the dashboard still renders its chart (" + base.cards + " cards)");
  is(base.echarts === "object", "ECharts is intact — the inlined panel did not displace it");
  is(base.api === "object", "NSettings reached the page");
  is(base.btn === true, "the panel's button is mounted");
  is(/adchrome-links/.test(base.mount),
    "and it mounted into the adopted nav strip, not the floating fallback (" +
    base.mount + ")");

  await dp.evaluate(() => window.NSettings.open());
  await dp.waitForTimeout(400);
  const rows = await dp.evaluate(() =>
    [...document.querySelectorAll(".nsover .nsrow")].map((x) => ({
      label: (x.querySelector("label") || {}).textContent || "",
      select: !!x.querySelector("select"),
      note: ((x.querySelector(".nsnote") || {}).textContent || "").replace(/\s+/g, " "),
    })));
  const byLabel = (t) => rows.filter((r) => r.label.indexOf(t) === 0)[0];
  /* THE DASHBOARD NOW RE-CASTS. It used to be a pure renderer and these rows
     were frozen, which is what this block asserted. It carries the engine and
     72-sripati.js now, so it rebuilds the chart from the birth data the
     payload holds and the casting settings act for real. */
  ["Ayanāṃśa", "Bhāva frame", "Lunar nodes"].forEach((lab) => {
    const r = byLabel(lab);
    is(!!r && r.select === true, lab + " IS a live picker here — the page recasts");
  });
  /* Sunrise is the one that must STAY frozen, and it is the case that proves
     carrying an engine is not the same as honouring every setting:
     buildLocalChart() does not read riseconv at all — the convention re-dates
     the pañcāṅga, not a natal chart. The page declares window.__nsHonours and
     leaves it out. */
  is(!!byLabel("Sunrise") && byLabel("Sunrise").select === false,
    "Sunrise stays FROZEN even with the engine present — buildLocalChart " +
    "ignores riseconv, so a picker would change nothing here");
  is(await dp.evaluate(() => JSON.stringify(window.__nsHonours)) ===
     JSON.stringify(["ayan", "house", "node", "degfmt", "engine"]),
    "and the page declares exactly what it honours");
  is(!!byLabel("Degrees") && byLabel("Degrees").select === true,
    "Degrees IS offered here, because this page honours it");
  /* The palette row must be frozen too, and this is the one that bit back.
     theme.js was inlined here at one point so the Presentation slot would
     fill; the picker appeared, set data-theme, and changed nothing, because
     the token overrides are in theme.css which these pages do not load. Worse,
     dashboard.html runs its OWN light/dark system on the same attribute, with
     its own button that restyles the ECharts instances, so a stored site
     palette would have fought it. */
  is(!!byLabel("Palette") && byLabel("Palette").select === false,
    "Palette is frozen here — no dead picker");
  is(/carries its own styling/.test((byLabel("Palette") || {}).note || ""),
    "and says the page carries its own styling");
  is(await dp.evaluate(() => document.querySelectorAll(".themepick").length) === 0,
    "no theme picker is mounted on an adopted page at all");
  is(await dp.evaluate(() => typeof window.NTheme) === "undefined",
    "theme.js is NOT inlined here, which is what keeps the two systems apart");
  is(await dp.evaluate(() => !/\[object Object\]/.test(document.body.innerText)),
    "no [object Object] anywhere — house_system is an object, and .mode is shown");

  /* ---- the casting settings must MOVE THE CHART, not just the labels ----
     The payload above was cast whole-sign/Lahiri while the default setting
     is Śrīpati/Samanvaya, so the page should have re-cast itself on load and said so. */
  is(/Re-cast to match your settings/.test(await dp.evaluate(() => document.body.innerText)),
    "a chart cast under other settings is re-cast on arrival, and the page says so");
  const chartState = () => dp.evaluate(() => {
    const D = window.__dashLast && window.__dashLast();
    if (!D) return null;
    const bh = {}; (D.grahas || []).forEach((g) => { bh[g.key] = g.bhava; });
    const sb = {}; ((D.shadbala && D.shadbala.planets) || [])
      .forEach((x) => { sb[x.graha] = Math.round(x.total_virupa * 100); });
    return { mode: D.house_system && D.house_system.mode,
             fellBack: D.house_system && D.house_system.fell_back,
             ayan: D.ayanamsa_mode, ayDeg: Math.round(D.ayanamsha_deg * 1e4),
             bh: bh, sb: sb };
  });
  await dp.evaluate(() => window.NSettings.set({ house: "whole", ayan: "lahiri", node: "mean" }));
  await dp.waitForTimeout(4500);
  const W = await chartState();
  is(!!W && W.mode === "whole", "the chart is whole-sign when the setting is");
  await dp.evaluate(() => window.NSettings.set({ house: "sripati" }));
  await dp.waitForTimeout(4500);
  const SP = await chartState();
  is(!!SP && SP.mode === "sripati" && SP.fellBack === false,
    "setting Śrīpati re-casts the chart into the Śrīpati frame WITHOUT falling back");
  /* The fallback check above is the important half. engine.js does not
     implement Śrīpati itself — it asks for window.SPSripati and, absent,
     returns whole-sign with fell_back_reason "the Śrīpati module is not
     loaded on this page". With the engine but not 72-sripati.js the reader
     would have got a whole-sign chart labelled Śrīpati. */
  const movedBh = Object.keys(W.bh).filter((k) => W.bh[k] !== SP.bh[k]);
  is(movedBh.length >= 2,
    "and grahas actually change bhāva (" + movedBh.length + ": " +
    movedBh.join(", ") + ") — not a relabelling");
  const movedSb = Object.keys(W.sb).filter((k) => W.sb[k] !== SP.sb[k]);
  is(movedSb.length >= 4,
    "and the Ṣaḍbala totals move with the frame (" + movedSb.length + " of 7)");

  /* ---- AND THE DRAWN CHART MUST MOVE WITH IT ------------------------------
   * This is the check whose absence shipped a bug. Everything above asserts
   * the PAYLOAD changes frame, and it did — but the chart placed each graha
   * by G[p].sign and derived its house slots from the lagna sign, so the
   * picture stayed whole-sign no matter what the payload said. A chart is
   * what a reader actually looks at; asserting the data moved is not
   * asserting the chart did. */
  const chart = () => dp.evaluate(() => {
    const svg = document.querySelector(".kund svg");
    if (!svg) return null;
    return {
      aria: svg.getAttribute("aria-label") || "",
      /* the rāśi number printed in each house slot, in order */
      signs: [...svg.querySelectorAll("text.sn")].map((t) => t.textContent).join(" "),
      /* each non-label glyph with where it was drawn, so a graha changing
         house shows up as a changed position */
      items: [...svg.querySelectorAll("text")].filter((t) => !t.classList.contains("sn"))
        .map((t) => t.textContent.slice(0, 2) + "@" + Math.round(+t.getAttribute("x")) +
             "," + Math.round(+t.getAttribute("y"))).sort().join(" ")
    };
  });
  await dp.evaluate(() => window.NSettings.set({ house: "whole" }));
  await dp.waitForTimeout(4500);
  const cW = await chart();
  await dp.evaluate(() => window.NSettings.set({ house: "sripati" }));
  await dp.waitForTimeout(4500);
  const cS = await chart();
  is(!!cW && !!cS, "the kuṇḍalī is drawn in both frames");
  is(/North Indian/.test(cW.aria) && /[Bb]hāva chalita/.test(cS.aria),
    "it is a rāśi chart under whole-sign and a bhāva chalita chart under Śrīpati");
  is(cW.items !== cS.items,
    "grahas are drawn in different house slots — the picture follows, not just the data");
  /* The slot LABELS must change too, and this half was wrong first: the cusps
     were read from derived.sripati, which the report assembly builds and
     buildLocalChart does not, so it fell back to whole-sign silently and the
     labels came out identical. Under Śrīpati a rāśi can hold two bhāva
     madhyas while its neighbour holds none, so the sequence repeats and
     skips — which a whole-sign sequence never does. */
  is(cW.signs !== cS.signs,
    "and each slot is labelled with the rāśi holding its madhya, not the " +
    "whole-sign sequence (" + cW.signs + "  →  " + cS.signs + ")");
  const nums = cS.signs.split(" ").map(Number);
  is(new Set(nums).size < nums.length,
    "a rāśi repeats across two slots, which only a chalita chart does");
  await dp.evaluate(() => window.NSettings.set({ house: "whole" }));
  await dp.waitForTimeout(4500);
  const cBack = await chart();
  is(cBack.items === cW.items && cBack.signs === cW.signs,
    "and going back to whole-sign redraws the original chart exactly");
  await dp.evaluate(() => window.NSettings.set({ ayan: "raman" }));
  await dp.waitForTimeout(4500);
  const R = await chartState();
  is(!!R && R.ayan === "raman" && R.ayDeg !== SP.ayDeg,
    "changing the ayanāṃśa re-casts too (" + (SP.ayDeg / 1e4) + "° → " +
    (R.ayDeg / 1e4) + "°)");
  await dp.evaluate(() => window.NSettings.set({ house: "whole", ayan: "lahiri", node: "mean" }));
  await dp.waitForTimeout(4500);
  const back = await chartState();
  is(JSON.stringify(back.bh) === JSON.stringify(W.bh) &&
     JSON.stringify(back.sb) === JSON.stringify(W.sb) && back.ayDeg === W.ayDeg,
    "and returning to the original settings reproduces the original chart exactly");

  /* Degrees must actually redraw the page, not just store a value. */
  const fig = () => dp.evaluate(() => {
    const t = document.body.innerText;
    return { sec: (t.match(/\d+°\d{2}′\d{2}″/g) || []).length,
             dec: (t.match(/\d+\.\d{4}°/g) || []).length };
  });
  const f0 = await fig();
  await dp.evaluate(() => window.NSettings.set({ degfmt: "dms" }));
  await dp.waitForTimeout(2500);
  const f1 = await fig();
  is(f1.sec > f0.sec + 5,
    "setting Degrees to d/m/s redraws the dashboard with seconds (" +
    f0.sec + " → " + f1.sec + ")");
  await dp.evaluate(() => window.NSettings.set({ degfmt: "dec" }));
  await dp.waitForTimeout(2500);
  const f2 = await fig();
  is(f2.dec > f0.dec + 5,
    "and to decimal degrees likewise (" + f0.dec + " → " + f2.dec + ")");
  await dp.evaluate(() => window.NSettings.set({ degfmt: "dm" }));
  await dp.waitForTimeout(2500);
  const f3 = await fig();
  is(f3.sec === f0.sec && f3.dec === f0.dec,
    "and switching back restores the original figures exactly — this page's own " +
    "rounding is preserved on the default setting");
  await dp.close();
}

/* ---- the panel must not print ------------------------------------------
   It is fixed-position furniture at z-index 9999, so with it open the print
   output carried the whole overlay across the report and the PDF went from
   1.5 MB to 7.1 MB on the backdrop alone.

   Measured by RENDERING, not by computed display: an element inside a
   display:none ancestor still reports its own computed display, which is what
   made the first version of this investigation report a false positive
   elsewhere on the page. */
head("The panel is a control, so it must not print");
await pg.evaluate(() => { window.NSettings.open(); });
await pg.waitForTimeout(400);
const renders = (sel) => pg.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;                       /* absent counts as not printing */
  const boxed = e.getClientRects().length > 0;
  const vis = e.checkVisibility
    ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : boxed;
  return boxed && vis;
}, sel);
await pg.emulateMedia({ media: "screen" });
is(await renders(".nsover") === true,
  "the panel renders on screen when open, so the print check below means something");
await pg.emulateMedia({ media: "print" });
for (const sel of [".nsover", ".nsback", ".nspanel", ".nsx"]) {
  const r = await renders(sel);
  is(r === false || r === null, sel + " does not render in print media");
}
/* The clinching one, which no per-selector check establishes on its own: the
   print output must not change at all when the panel is open. */
const pdfOpen = await pg.pdf({ format: "A4", printBackground: true });
await pg.emulateMedia({ media: "screen" });
await pg.evaluate(() => { window.NSettings.close(); });
await pg.waitForTimeout(300);
await pg.emulateMedia({ media: "print" });
const pdfShut = await pg.pdf({ format: "A4", printBackground: true });
is(Math.abs(pdfOpen.length - pdfShut.length) < 4096,
  "print output is the same size with the panel open or shut (" +
  (pdfOpen.length / 1024).toFixed(0) + " KB vs " +
  (pdfShut.length / 1024).toFixed(0) + " KB)");
await pg.emulateMedia({ media: "screen" });

is(errs.length === 0, "no page errors on any page" + (errs.length ? ": " + errs.join(" | ") : ""));
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
