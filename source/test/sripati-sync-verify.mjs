/* ===== ONE CHART, THREE SURFACES, NO CONTRADICTIONS =====================
 *
 * The bhāva frame is a global toggle, and the same chart is shown in three
 * places that compute their house numbers by different routes:
 *
 *   1. the full report HTML      — buildKundliReport, rendered on kundli.html
 *   2. the analyst JSON          — buildLocalChart's payload, g.bhava
 *   3. the dashboard             — a SEPARATE renderer that re-casts the chart
 *
 * Every bug this toggle has produced was a disagreement between two of those
 * three, and every one of them LOOKED RIGHT in isolation: a chart placed by
 * rāśi under a Śrīpati title, three house columns that were silently empty, a
 * zodiac wheel that drew no cusps, a "whole-sign" chart filled from whichever
 * frame happened to be in force. Each was caught by eye, late, and only
 * because a particular number (bhāva 4's madhya at 118.68°, Cancer where
 * whole-sign says Leo) happened to be memorable.
 *
 * So this harness does not ask whether any one surface is self-consistent. It
 * extracts the SAME FACTS from all three and diffs them mechanically:
 *
 *   · which bhāva each graha occupies
 *   · which rāśi each bhāva's madhya falls in, and which lord follows from it
 *   · the frame each surface says it is using
 *
 * and it does this under BOTH frames, because a check that only runs under
 * Śrīpati cannot tell a frame-aware renderer from one that ignores the toggle
 * and happens to be asked for whole-sign.
 *
 * THE INVARIANT THAT CATCHES THE WHOLE BUG CLASS: under whole-sign, bhāva and
 * rāśi-from-lagna agree for every graha by construction; under Śrīpati they
 * must come apart for at least one. A renderer that shows them agreeing in
 * both frames is ignoring the toggle, whatever its titles claim. The reference
 * chart moves four of nine grahas, so "at least one" is a floor, not a guess.
 *
 * Run from the repo root.
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

const CWD = process.cwd();
let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* The reference chart. Delhi, a latitude where the quadrants are unequal
   enough that the two frames genuinely disagree. */
const BIRTH = { year: 1990, month: 3, day: 15, hour: 10, minute: 30,
                lat: 28.6139, lon: 77.2090, tzHours: 5.5 };
const GRAHAS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
/* the payload names grahas in Sanskrit; the report and dashboard in English */
const SK2EN = { "Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars","Budha":"Mercury",
                "Guru":"Jupiter","Śukra":"Venus","Śani":"Saturn","Rāhu":"Rahu","Ketu":"Ketu" };

const browser = await chromium.launch();
const errs = [];

/* ---------- surfaces 1 and 2: the report page ---------------------------- */
async function fromKundli(mode) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push("kundli(" + mode + "): " + e.message));
  await pg.goto("file://" + CWD + "/kundli.html");
  await pg.waitForFunction(
    () => window.buildLocalChart && window.SPSripati && window.buildKundliReport,
    null, { timeout: 45000 });
  const out = await pg.evaluate(([b, m, sk]) => {
    const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    const html = window.buildKundliReport(J);
    const D = window.__kApi && window.__kApi.chart();

    /* ---- the analyst JSON ---- */
    const json = {
      frame: J.house_system && J.house_system.mode,
      fellBack: J.house_system && J.house_system.fell_back,
      fellBackWhy: J.house_system && J.house_system.fell_back_reason,
      mc: J.house_system && J.house_system.mc_sidereal_deg,
      bhava: {}, madhyaRashi: [], madhya: [],
      lagSign: J.lagna && J.lagna.rashi && J.lagna.rashi.idx,
      sign: {}
    };
    (J.grahas || []).forEach((g) => {
      const n = sk[g.en] || sk[g.sa] || g.en || g.key;
      json.bhava[n] = g.bhava;
      json.sign[n] = g.rashi && g.rashi.idx;
    });
    (J.bhavas || []).forEach((x) => {
      json.madhyaRashi.push(x.rashi && x.rashi.idx);
      json.madhya.push(x.madhya_deg == null ? null : +x.madhya_deg.toFixed(4));
    });

    /* ---- the report HTML, read out of the rendered DOM ---- */
    const host = document.createElement("div");
    host.innerHTML = html;
    const report = { frameTitle: null, southLabels: {}, grahaHouse: {}, headers: [] };

    /* the D1 north chart's title tells us which frame it claims */
    const figs = [...host.querySelectorAll("figure.kchartfig")];
    const d1 = figs.find((f) => /North Indian/.test(f.textContent || ""));
    if (d1) report.frameTitle = (d1.querySelector("figcaption b") || {}).textContent || null;

    /* the South chart: rāśi cell -> corner number(s) */
    const south = figs.find((f) => /South Indian/.test(f.textContent || ""));
    if (south) {
      const ss = [...south.querySelectorAll("text.ss")].map((t) => t.textContent.trim());
      const sh = [...south.querySelectorAll("text.sh")].map((t) => t.textContent.trim());
      ss.forEach((sg, i) => { report.southLabels[sg] = sh[i]; });
    }

    /* the Grahas table's House column */
    const tables = [...host.querySelectorAll("table")];
    const gt = tables.find((t) => {
      const h = [...t.querySelectorAll("th")].map((x) => x.textContent.trim());
      return h[0] === "Graha" && h.indexOf("House") >= 0;
    });
    if (gt) {
      const h = [...gt.querySelectorAll("th")].map((x) => x.textContent.trim());
      const iH = h.indexOf("House");
      [...gt.querySelectorAll("tr")].forEach((tr) => {
        const td = [...tr.querySelectorAll("td")];
        if (!td.length) return;
        const nm = (td[0].querySelector("span.kmut") || {}).textContent;
        if (nm) report.grahaHouse[nm.trim()] = td[iH].textContent.trim();
      });
    }
    /* every table header in the report, so a stray "House" claim shows up */
    tables.forEach((t) => [...t.querySelectorAll("th")]
      .forEach((x) => report.headers.push(x.textContent.trim())));

    return { json, report, derivedFrame: D && D.houseSystem && D.houseSystem.mode };
  }, [BIRTH, mode, SK2EN]);
  await pg.close();
  return out;
}

/* ---------- surface 3: the dashboard ------------------------------------- */
async function fromDashboard(mode, payload) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push("dashboard(" + mode + "): " + e.message));
  await pg.addInitScript(([p, m]) => {
    try {
      localStorage.setItem("learnhoro.chart", p);
      localStorage.setItem("nirayana.settings", JSON.stringify({ house: m }));
    } catch (e) {}
  }, [payload, mode]);
  await pg.goto("file://" + CWD + "/dashboard.html");
  await pg.waitForFunction(() => window.__dashLast && window.__dashLast(),
    null, { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(4500);
  const out = await pg.evaluate((sk) => {
    const d = (window.__dashLast && window.__dashLast()) || {};
    const R = { frame: d.house_system && d.house_system.mode,
                bhava: {}, rasiFromLagna: {}, madhyaRashi: [],
                wheelCusps: null, chartTitle: null, bhavaHeader: null };
    (d.grahas || []).forEach((g) => {
      R.bhava[sk[g.en] || sk[g.sa] || g.en || g.key] = g.bhava;
    });
    (d.bhavas || []).forEach((x) => R.madhyaRashi.push(x.rashi && x.rashi.idx));

    /* the drawn D1 chart, by its aria-label */
    const d1 = [...document.querySelectorAll("svg")]
      .find((s) => /chart, ascendant/.test(s.getAttribute("aria-label") || ""));
    R.chartTitle = d1 ? d1.getAttribute("aria-label") : null;
    /* the drawn zodiac wheel's Śrīpati cusp lines */
    const w = [...document.querySelectorAll("svg")]
      .find((s) => (s.getAttribute("aria-label") || "") === "Zodiac wheel");
    R.wheelCusps = w ? w.querySelectorAll("line[stroke-dasharray]").length : null;

    /* the placements table, read as a reader sees it */
    const t = [...document.querySelectorAll("table")].find((t) =>
      [...t.querySelectorAll("th")].some((x) => /^Rāśi from lagna$/.test(x.textContent.trim())));
    if (t) {
      const h = [...t.querySelectorAll("th")].map((x) => x.textContent.trim());
      const iR = h.findIndex((x) => /^Rāśi from lagna$/.test(x));
      const iB = h.findIndex((x) => /^Bhāva \(/.test(x));
      R.bhavaHeader = h[iB];
      [...t.querySelectorAll("tbody tr")].forEach((tr) => {
        const td = [...tr.querySelectorAll("td")];
        if (td.length <= Math.max(iR, iB)) return;
        const nm = td[0].textContent.trim();
        R.rasiFromLagna[nm] = td[iR].textContent.trim();
        R.bhava_rendered = R.bhava_rendered || {};
        R.bhava_rendered[nm] = td[iB].textContent.trim();
      });
    }
    return R;
  }, SK2EN);
  await pg.close();
  return out;
}

const SIGNS = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā",
               "Vṛścika","Dhanus","Makara","Kumbha","Mīna"];

for (const mode of ["whole", "sripati"]) {
  head("=== " + mode.toUpperCase() + " ===");
  const K = await fromKundli(mode);
  const payload = JSON.stringify(await (async () => {
    /* re-cast the same chart to hand to the dashboard verbatim */
    const pg = await browser.newPage();
    await pg.goto("file://" + CWD + "/kundli.html");
    await pg.waitForFunction(() => window.buildLocalChart && window.SPSripati,
      null, { timeout: 45000 });
    const j = await pg.evaluate(([b, m]) =>
      window.buildLocalChart(Object.assign({}, b, { houseSystem: m })), [BIRTH, mode]);
    await pg.close();
    return j;
  })());
  const DASH = await fromDashboard(mode, payload);

  /* ---- 1. every surface agrees which frame it is in ---- */
  is(K.json.frame === mode, "the JSON reports the frame it was asked for (" + K.json.frame + ")");
  is(K.json.fellBack === false,
    "and did not fall back" + (K.json.fellBackWhy ? " (" + K.json.fellBackWhy + ")" : ""));
  is(DASH.frame === mode, "the dashboard re-casts into the same frame (" + DASH.frame + ")");

  /* ---- 2. graha -> bhāva is the same number on all three ---- */
  const mismatch = GRAHAS.filter((g) =>
    String(K.json.bhava[g]) !== String(DASH.bhava[g]));
  is(mismatch.length === 0,
    "graha→bhāva identical in the JSON and on the dashboard" +
    (mismatch.length ? " — differs for " + mismatch.join(", ") : ""));

  const rptMismatch = GRAHAS.filter((g) =>
    K.report.grahaHouse[g] != null &&
    String(K.report.grahaHouse[g]) !== String(K.json.bhava[g]));
  is(rptMismatch.length === 0,
    "and identical again in the report's Grahas table" +
    (rptMismatch.length ? " — differs for " + rptMismatch.join(", ") : ""));

  const dashRendered = DASH.bhava_rendered || {};
  const drawnMismatch = GRAHAS.filter((g) =>
    dashRendered[g] != null && String(dashRendered[g]) !== String(K.json.bhava[g]));
  is(drawnMismatch.length === 0,
    "and in the dashboard's RENDERED table, not merely its payload" +
    (drawnMismatch.length ? " — differs for " + drawnMismatch.join(", ") : ""));

  /* ---- 3. the frame actually bites (or provably does not) ---- */
  const lag = K.json.lagSign;
  const apart = GRAHAS.filter((g) => {
    const sg = K.json.sign[g];
    if (sg == null || lag == null) return false;
    return (((sg - lag) % 12 + 12) % 12 + 1) !== K.json.bhava[g];
  });
  if (mode === "whole") {
    is(apart.length === 0,
      "under whole-sign bhāva equals rāśi-from-lagna for every graha, by construction");
  } else {
    is(apart.length >= 1,
      "under Śrīpati bhāva and rāśi-from-lagna come apart — " + apart.length +
      " grahas (" + apart.join(", ") + "); a renderer showing no difference " +
      "is ignoring the toggle");
  }

  /* ---- 4. the pictures follow the frame, not just the numbers ---- */
  is(/Bhāva Chalita|Rāśi \(D1\)/.test(K.report.frameTitle || ""),
    "the report's D1 chart is titled (" + K.report.frameTitle + ")");
  is(mode === "sripati"
      ? /Bhāva Chalita/.test(K.report.frameTitle || "")
      : /Rāśi \(D1\)/.test(K.report.frameTitle || ""),
    "and the title names the frame in force, so the picture is not mislabelled");
  is(mode === "sripati"
      ? /Bhāva chalita/.test(DASH.chartTitle || "")
      : /North Indian chart/.test(DASH.chartTitle || ""),
    "the dashboard's D1 chart is labelled for the frame too (" + DASH.chartTitle + ")");
  is(mode === "sripati" ? DASH.wheelCusps === 12 : DASH.wheelCusps === 0,
    "the zodiac wheel draws " + DASH.wheelCusps + " Śrīpati cusp lines — " +
    (mode === "sripati" ? "twelve, from the engine's own bhāva sandhis"
                        : "none, because under whole-sign the sandhis are the rāśi boundaries"));
  is(DASH.bhavaHeader === (mode === "sripati" ? "Bhāva (Śrīpati)" : "Bhāva (whole-sign)"),
    "and the placements table names the frame in its own column header (" +
    DASH.bhavaHeader + ")");

  /* ---- 5. the bhāva madhyas agree between JSON and dashboard ---- */
  const madhyaDiff = K.json.madhyaRashi
    .map((r, i) => (String(r) === String(DASH.madhyaRashi[i]) ? null : i + 1))
    .filter(Boolean);
  is(madhyaDiff.length === 0,
    "each bhāva's madhya falls in the same rāśi on both" +
    (madhyaDiff.length ? " — differs at bhāva " + madhyaDiff.join(", ") : ""));

  /* ---- 6. the South chart's corner number is the frame's, not whole-sign's ---- */
  const south = K.report.southLabels;
  const southWrong = Object.keys(south).filter((sgName) => {
    const sg = SIGNS.indexOf(sgName);
    if (sg < 0) return false;
    const expect = K.json.madhyaRashi
      .map((r, i) => (r === sg ? i + 1 : null)).filter(Boolean).join("·");
    return String(south[sgName]) !== expect;
  });
  is(southWrong.length === 0,
    "the South chart's corner number is the bhāva whose madhya is in that rāśi" +
    (southWrong.length ? " — wrong in " + southWrong.join(", ") : ""));
  if (mode === "sripati") {
    const blanks = Object.values(south).filter((v) => v === "").length;
    const doubles = Object.values(south).filter((v) => /·/.test(v)).length;
    is(blanks > 0 && doubles > 0,
      "and under Śrīpati some rāśi carries two bhāva numbers (" + doubles +
      ") while another carries none (" + blanks + ") — which is what a " +
      "quadrant frame does, and what a single whole-sign number per cell cannot say");
  }

  /* ---- 7. no surface still claims a bare "House" it cannot support ---- */
  const bare = K.report.headers.filter((h) => h === "House from lagna");
  is(bare.length === 0,
    "no table heads a rāśi count as “House from lagna”" +
    (bare.length ? " — " + bare.length + " still do" : ""));
}

/* ===== SURFACE 4: THE ANALYST JSON ======================================
 *
 * The exported payload is the surface with no picture to give it away. A
 * chart drawn wrong is visible; a JSON that declares one convention above
 * figures computed under another is not, and it is the artifact that leaves
 * the session and gets read by someone who cannot check it against anything.
 *
 * Three faults lived here until now, all invisible from inside the file:
 * conventions.house_system was the pinned literal "whole sign"; the guide
 * block asserted whole-sign houses flatly in the very section its own
 * reading_order tells an analyst to read first; and the dṛṣṭi matrix was
 * cast with the BPHS speculum whatever the paddhati, under a note claiming
 * it was the same formula that fed Drik Bala.
 */
async function analystPayload(mode) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push("analyst(" + mode + "): " + e.message));
  await pg.goto("file://" + CWD + "/kundli.html");
  await pg.waitForFunction(() => window.buildLocalChart && window.SPSripati &&
    window.buildKundliReport && window.buildJyotishaPayload &&
    window.__deriveForExport, null, { timeout: 45000 });
  const out = await pg.evaluate(([b, m]) => {
    const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    window.buildKundliReport(J);
    /* attach the derived layer exactly as the download button does — the
       payload reads J.derived, so building it from a bare chart would test
       a file no user ever receives */
    J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J);
    const conv = (P.derived && P.derived.conventions) || {};
    const gd = (P.derived && P.derived.graha_drishti) || {};
    const ik = (P.derived && P.derived.ishta_kashta) || null;
    return {
      convHouse: conv.house_system || null,
      convMode: (conv.house_system_detail && conv.house_system_detail.mode) || null,
      paddhatiMode: (conv.paddhati && conv.paddhati.mode) || null,
      guideHouses: (P.derived && P.derived.guide && P.derived.guide.units &&
                    P.derived.guide.units.houses) || null,
      guideCaution: (P.derived && P.derived.guide && P.derived.guide.cautions &&
                     P.derived.guide.cautions[0]) || null,
      drishtiFormula: gd.drishti_formula || null,
      drishtiFrame: gd.house_count_view_frame || null,
      ikRule: ik && ik[0] && ik[0].rule,
      ikSource: ik && ik[0] && ik[0].source,
      ikFirst: ik && ik[0] && { g: ik[0].graha, i: ik[0].ishta, k: ik[0].kashta },
      engineIK: Object.fromEntries((J.shadbala.planets || []).map(
        (x) => [x.graha, [x.ishta, x.kashta, x.ishta_kashta_rule]])),
      engineMode: J.house_system.mode,
      /* what the file PROMISES about itself, and what it actually holds */
      promises: (conv.paddhati && conv.paddhati.follows_this_paddhati) || [],
      hasGrahaPhala: !!(P.grahas && P.grahas.Sun && P.grahas.Sun.bhava_phala),
      hasGrahaBhava: !!(P.grahas && P.grahas.Sun && P.grahas.Sun.bhava != null),
      bbKeys: (P.derived && P.derived.bhava_bala && P.derived.bhava_bala[0])
                ? Object.keys(P.derived.bhava_bala[0]) : [],
      hasReqComponents: !!(P.shadbala && P.shadbala.planets &&
                           P.shadbala.planets.Sun &&
                           P.shadbala.planets.Sun.required_components_virupas),
      hasComposition: !!(P.shadbala && P.shadbala.composition),
      sbAyana: !!(P.shadbala && P.shadbala.planets && P.shadbala.planets.Sun &&
                  P.shadbala.planets.Sun.components &&
                  P.shadbala.planets.Sun.components.ayana_virupas != null)
    };
  }, [BIRTH, mode]);
  await pg.close();
  return out;
}

for (const mode of ["whole", "sripati"]) {
  head("=== ANALYST JSON (" + mode.toUpperCase() + ") ===");
  const A = await analystPayload(mode);
  is(A.convMode === mode,
    "conventions declares the frame the chart was cast in (" + A.convMode + ")");
  is(!/^whole sign$/.test(A.convHouse) || mode === "whole",
    "conventions.house_system is not the pinned literal \"whole sign\" " +
    "(it reads: " + String(A.convHouse).slice(0, 60) + "…)");
  /* the paddhati is named for its TEXT, not for the house division — the
     whole-sign frame is BPHS's, and conflating the two names is how the
     toggle got mistaken for a house switch in the first place */
  is(A.paddhatiMode === (mode === "sripati" ? "sripati" : "bphs"),
    "and carries the paddhati block, naming the text rather than the house " +
    "division (" + A.paddhatiMode + ")");
  is(mode === "sripati"
      ? /Śrīpati bhāva-chalita/.test(A.guideHouses || "")
      : /whole sign/.test(A.guideHouses || ""),
    "the guide's units line describes THIS chart's houses");
  is(mode === "sripati"
      ? /ŚRĪPATI paddhati/.test(A.guideCaution || "")
      : /Whole-sign houses are the default/.test(A.guideCaution || ""),
    "and its first caution does too");
  is(mode === "sripati"
      ? /Adh\. 2/.test(A.drishtiFormula || "")
      : /Ch\. 26/.test(A.drishtiFormula || ""),
    "the dṛṣṭi matrix names the formula it was cast with (" +
    String(A.drishtiFormula).slice(0, 40) + "…)");
  is(A.drishtiFrame === mode, "and the house-count view names its frame");
  is(A.ikRule === (mode === "sripati" ? "geometric" : "arithmetic"),
    "iṣṭa/kaṣṭa carries the rule actually used (" + A.ikRule + ")");
  is(mode === "sripati" ? /Adh\. 4/.test(A.ikSource || "")
                        : /Ch\. 28/.test(A.ikSource || ""),
    "and its citation (" + A.ikSource + ")");
  /* THE FILE MUST CONTAIN WHAT IT PROMISES ABOUT ITSELF.
     conventions.paddhati.follows_this_paddhati is a list of the quantities
     this chart is said to compute Śrīpati's way. Those sentences shipped
     before the quantities did: six real exports declared they followed
     "bhāva-phala, the graded effect within a bhāva" and "bhāva bala in its
     exact form" while carrying neither — the graha records had no
     bhava_phala at all, and derived.bhava_bala was still the quantised
     approximation (dig bala only ever 30 or 60, dṛk only multiples of 15).
     A promise with nothing behind it is the same fault as a card offering
     three house systems and printing three empty columns, and it is harder
     to see here because a JSON gives its reader nothing to compare against.
     So each promise is now tied to a field that must exist. */
  if (mode === "sripati") {
    const P = A.promises.join(" | ");
    is(/bhāva-phala/.test(P) === A.hasGrahaPhala,
      "the bhāva-phala it promises is actually on the grahas" +
      (A.hasGrahaPhala ? "" : " — PROMISED BUT ABSENT"));
    is(A.hasGrahaBhava, "and each graha names its bhāva");
    const exact = A.bbKeys.indexOf("dig_class") >= 0 && A.bbKeys.indexOf("spans") >= 0;
    is(/bhāva bala in its exact form/.test(P) === exact,
      "the bhāva bala it promises is the exact four-component form, not the " +
      "quantised approximation" + (exact ? "" : " — PROMISED BUT APPROXIMATE"));
    is(/per-head minimum/.test(P) === A.hasReqComponents,
      "the per-head minima it promises are present");
    is(/dṛṣṭi on his quarters table/.test(P) && /Adh\. 2/.test(A.drishtiFormula || ""),
      "and the dṛṣṭi it promises is the one it labels");
  }
  is(A.hasComposition, "the Ṣaḍbala composition names which six heads these are");
  is(A.sbAyana, "and Ayana Bala is reported separately, as both texts require");
  const ei = A.engineIK[A.ikFirst.g];
  is(ei && Math.abs(ei[0] - A.ikFirst.i) < 0.001 && Math.abs(ei[1] - A.ikFirst.k) < 0.001,
    "and its VALUES equal the engine's, rather than being recomputed here " +
    "(" + A.ikFirst.g + ": " + A.ikFirst.i.toFixed(3) + " / " + A.ikFirst.k.toFixed(3) + ")");
}

head("Page errors");
is(errs.length === 0, errs.length ? errs.slice(0, 4).join(" | ") : "none on any surface");

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
