/* Every section heading carries its own "In simple words" explanation.
 *
 * source/src/pages/_plain_sections.py holds one plain explanation per section;
 * build.py injects them and refuses to build if a heading has none. This holds
 * the BUILT pages to it, live in a browser:
 *   - on every page, every h2[id] gets exactly one button, and none is left bare;
 *   - the Kundli report's sections (drawn by script after casting) and the
 *     dashboard's sections (drawn from the saved chart) get theirs too, as they
 *     appear, and so does the technical report;
 *   - the button opens a dialog naming the section, with a real explanation;
 *     Escape and a click outside close it, and focus returns to the button;
 *   - nothing throws.
 *
 * Run from the repository root:  node source/test/secx-verify.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const is = (c, t) => { if (c) { pass++; } else { fail++; console.log("  FAIL " + t); } };
const root = process.cwd();
const br = await chromium.launch();
const errs = [];

const census = () => {
  const D = window.__secx && window.__secx.data;
  if (!D) return { none: true };
  /* the settings panel's own heading is a dialog's title, not a page section */
  const heads = [...document.querySelectorAll(D.sel)].filter((h) => !h.closest("#nset, .nset, [id^=nset]") && h.id !== "nset-h");
  const bare = heads.filter((h) => h.querySelectorAll(".secx-b").length !== 1)
    .map((h) => (h.id || window.__secx.titleOf(h)));
  return { n: heads.length, bare, btn: document.querySelectorAll(".secx-b").length };
};
async function openClose(pg, tag) {
  const R = await pg.evaluate(async () => {
    const b = document.querySelector(".secx-b"); if (!b) return null;
    b.click();
    const ov = document.querySelector(".secx-ov"), card = ov.querySelector(".secx-card");
    const open = !ov.hidden && card.getBoundingClientRect().height > 60;
    const title = card.querySelector("h3").textContent, body = card.querySelector(".secx-p").textContent;
    const role = card.getAttribute("role"), focusIn = card.contains(document.activeElement);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const escClosed = ov.hidden, back = document.activeElement === b;
    b.click(); ov.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { open, title, body, role, focusIn, escClosed, back, outClosed: ov.hidden };
  });
  is(!!R, `${tag}: has a button to press`);
  if (!R) return;
  is(R.open && R.role === "dialog" && R.focusIn, `${tag}: the button opens a dialog and moves focus into it`);
  is(R.title.length > 2 && R.body.length > 40, `${tag}: the dialog names the section ("${R.title}") and explains it`);
  is(R.escClosed && R.back, `${tag}: Escape closes it and returns focus to the button`);
  is(R.outClosed, `${tag}: a click outside closes it`);
}

/* every static page */
const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
let withSecs = 0;
for (const f of pages) {
  const t = fs.readFileSync(root + "/" + f, "utf8");
  const pg = await br.newPage();
  pg.on("pageerror", (e) => errs.push(f + ": " + e.message));
  await pg.goto("file://" + root + "/" + f, { waitUntil: "load" });
  await pg.waitForTimeout(150);
  const C = await pg.evaluate(census);
  const hasH2 = /<h2\b[^>]*\bid="/.test(t.replace(/<script\b[\s\S]*?<\/script>/g, ""));
  if (C.none) { is(!hasH2, `${f}: has section headings, so it must carry explanations`); await pg.close(); continue; }
  if (f === "dashboard.html") { await pg.close(); continue; }     /* below, with a chart */
  withSecs++;
  is(C.bare.length === 0, `${f}: every section heading has exactly one button (${C.n} headings; bare: ${C.bare.join(", ")})`);
  if (f === "index.html" || f === "kundli-technical-report.html" || f === "now.html") await openClose(pg, f);
  await pg.close();
}
is(withSecs >= 37, `section explanations on at least 37 pages (${withSecs})`);

/* the Kundli report, drawn after casting */
{
  const pg = await br.newPage();
  pg.on("pageerror", (e) => errs.push("kundli: " + e.message));
  await pg.goto("file://" + root + "/kundli.html");
  await pg.waitForFunction(() => document.querySelector("#k-go"), null, { timeout: 30000 });
  await pg.evaluate(() => {
    try { localStorage.removeItem("nirayana.birth"); } catch (e) {}
    document.getElementById("k-dob").value = "1984-12-15";
    document.getElementById("k-tob").value = "13:31";
    document.getElementById("k-lat").value = "28.8389";
    document.getElementById("k-lon").value = "78.7768";
    document.getElementById("k-tz").value = "5.5";
  });
  await pg.click("#k-go");
  await pg.waitForFunction(() => !!document.getElementById("kreport"), null, { timeout: 45000 });
  await pg.waitForTimeout(1500);
  await pg.waitForTimeout(300);
  const C = await pg.evaluate(() => {
    const ks = [...document.querySelectorAll("section.ksec > h3.kh")];
    return { n: ks.length, all: document.querySelectorAll("section.ksec").length, bare: ks.filter((h) => !h.querySelector(".secx-b")).map((h) => window.__secx.titleOf(h)) };
  });
  is(C.n > 30 && C.bare.length === 0, `kundli: every report section has its button (${C.n}/${C.all}; bare: ${C.bare.join(", ")})`);
  await openClose(pg, "kundli report");
  /* recasting must not double the buttons */
  await pg.evaluate(() => document.getElementById("k-go").click());
  await pg.waitForTimeout(2500);
  const dup = await pg.evaluate(() => [...document.querySelectorAll("section.ksec > h3.kh")].filter((h) => h.querySelectorAll(".secx-b").length > 1).length);
  is(dup === 0, `kundli: recasting leaves one button per section (${dup} doubled)`);

  /* hand the chart to the dashboard the way the page does */
  await pg.evaluate(() => {
    const J = window.buildLocalChart({ year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389,
      lon: 78.7768, tzHours: 5.5, node: "mean", name: "Test" });
    window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    localStorage.setItem("learnhoro.chart", JSON.stringify(J));
  });
  await pg.goto("file://" + root + "/dashboard.html");
  await pg.waitForFunction(() => document.querySelectorAll("section.sec[id] > header > h2").length > 10, null, { timeout: 60000 });
  await pg.waitForTimeout(500);
  const D = await pg.evaluate(() => {
    const hs = [...document.querySelectorAll("section.sec[id] > header > h2")]
      .filter((h) => !/^err-/.test(h.closest("section").id));
    return { n: hs.length, bare: hs.filter((h) => !h.querySelector(".secx-b")).map((h) => h.closest("section").id) };
  });
  is(D.n > 10 && D.bare.length === 0, `dashboard: every section has its button (${D.n}; bare: ${D.bare.join(", ")})`);
  await openClose(pg, "dashboard");
  await pg.close();
}

is(errs.length === 0, `no page errors (${errs.slice(0, 3).join(" | ")})`);
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
