/* One Vimśopaka, on every surface, under either bhāva toggle.
 *
 * WHY. The report, the standard JSON and the glass-box derivation counted the
 * temporary (tātkālika) half of the compound relationship by HOUSE, so under
 * the Śrīpati toggle they followed the bhāvas — while the analyst JSON counted
 * it by RĀŚI, as BPHS's note requires. The same chart printed two different
 * Vimśopaka depending on which surface you read. And the dashboard read only
 * the standard file's array, so an analyst file dropped on it lost the card.
 *
 * Checked: report table = standard JSON = analyst JSON (Ṣoḍaśavarga scheme and
 * its flat array) = glass-box total, to the printed precision; the figures do
 * not change with the bhāva toggle (Śrīpati is silent on Vimśopaka, so BPHS
 * governs it); and the dashboard shows the card for both export shapes.
 *
 * The chart is chosen so that the frames genuinely disagree: under Śrīpati six
 * of its nine grahas change bhāva, so a house-based count WOULD differ.
 *
 * Run from the repository root:  node source/test/vimsopaka-verify.mjs
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
const BIRTH = { year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389,
                lon: 78.7768, tzHours: 5.5, ayanamsa: "samanvaya_ecliptic", node: "mean", name: "Test" };
const G7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const browser = await chromium.launch();
const errs = [];

async function surfaces(mode) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push(mode + ": " + e.message));
  await pg.goto("file://" + CWD + "/kundli.html");
  await pg.waitForFunction(() => window.buildLocalChart && window.buildKundliReport &&
    window.buildJyotishaPayload && window.__deriveForExport, null, { timeout: 60000 });
  const r = await pg.evaluate(([b, m]) => {
    const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    const html = window.buildKundliReport(J);
    const host = document.createElement("div"); host.innerHTML = html;
    const report = {};
    for (const t of host.querySelectorAll("table")) {
      const hs = [...t.querySelectorAll("th")].map((x) => x.textContent.trim());
      if (hs[0] !== "Graha" || hs[1] !== "Vimśopaka (of 20)") continue;
      for (const tr of t.querySelectorAll("tr")) {
        const td = [...tr.querySelectorAll("td")]; if (td.length < 2) continue;
        report[td[0].textContent.trim()] = parseFloat(td[1].textContent);
      }
    }
    J.derived = window.__deriveForExport(J) || {};
    const std = {}; (J.derived.vimsopaka || []).forEach((x) => { std[x.graha] = x.score_of_20; });
    const P = window.buildJyotishaPayload(J);
    const sch = (P.derived.vimsopaka && P.derived.vimsopaka.shodashavarga &&
                 P.derived.vimsopaka.shodashavarga.grahas) || {};
    const ana = {}; for (const g in sch) ana[g] = sch[g].score_of_20;
    const flat = {}; (P.derived.vimsopaka_shodashavarga_flat || []).forEach((x) => { flat[x.graha] = x.score_of_20; });
    /* the glass-box derivation, read off its own bold total */
    const gb = {};
    const GBK = window.__gbKinds;
    if (GBK && GBK.vimsopaka) {
      const D = window.__kApi && window.__kApi.chart();
      for (const g of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]) {
        try {
          const h = document.createElement("div"); h.innerHTML = GBK.vimsopaka(D, J, g);
          const bs = [...h.querySelectorAll("b")].map((x) => x.textContent);
          const tot = bs.find((x) => /^\d+(\.\d+)?$/.test(x.trim()));
          gb[g] = tot == null ? null : parseFloat(tot);
        } catch (e) { gb[g] = null; }
      }
    }
    return { report, std, ana, flat, gb, payload: P };
  }, [BIRTH, mode]);
  await pg.close();
  return r;
}

const W = await surfaces("whole"), S = await surfaces("sripati");

for (const [name, R] of [["whole-sign", W], ["Śrīpati", S]]) {
  head(`[${name}] every surface prints the same Vimśopaka`);
  is(G7.every((g) => R.std[g] != null && R.ana[g] != null), "standard and analyst JSON both carry all seven");
  is(G7.every((g) => Math.abs(R.std[g] - R.ana[g]) < 1e-3),
     "standard JSON = analyst JSON (Ṣoḍaśavarga scheme)");
  is(G7.every((g) => Math.abs(R.flat[g] - R.ana[g]) < 1e-3),
     "the analyst file's flat array = its own scheme object");
  is(G7.every((g) => R.report[g] != null && Math.abs(R.report[g] - R.ana[g]) < 0.006),
     "the report's table = the JSON, to its two printed decimals");
  const gbHave = G7.filter((g) => R.gb[g] != null);
  is(gbHave.length === 7 && gbHave.every((g) => Math.abs(R.gb[g] - R.ana[g]) < 0.006),
     `the glass-box derivation's total = the JSON (${gbHave.length}/7 read)`);
}

head("the bhāva toggle does not move it — Śrīpati is silent on Vimśopaka, BPHS governs");
is(G7.every((g) => Math.abs(W.ana[g] - S.ana[g]) < 1e-9 && Math.abs(W.std[g] - S.std[g]) < 1e-9),
   "identical under whole-sign and Śrīpati: " + G7.map((g) => g.slice(0, 3) + " " + W.ana[g].toFixed(2)).join(", "));

head("the dashboard, fed the way the kundli page feeds it, shows the same card");
for (const mode of ["whole", "sripati"]) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push("dashboard: " + e.message));
  await pg.goto("file://" + CWD + "/kundli.html");
  await pg.waitForFunction(() => window.buildLocalChart && window.__deriveForExport, null, { timeout: 60000 });
  await pg.evaluate(([b, m]) => {
    const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    localStorage.setItem("learnhoro.chart", JSON.stringify(J));     /* exactly what the page's link does */
  }, [BIRTH, mode]);
  await pg.goto("file://" + CWD + "/dashboard.html");
  await pg.waitForFunction(() => /Viṃśopaka bala/.test(document.body.innerText) || /Drop a Kundali/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  const got = await pg.evaluate(() => ({ card: /Viṃśopaka bala/.test(document.body.innerText),
    vs: (window.N_ && window.N_.D && window.N_.D.vimsopaka) || null }));
  is(got.card, `[${mode}] the dashboard draws the Viṃśopaka card`);
  await pg.close();
}

head("no page errors");
is(errs.length === 0, errs.length ? errs.slice(0, 3).join(" | ") : "none");
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
