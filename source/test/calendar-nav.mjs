/* Do the calendar's arrows move what the view is showing?
 *
 *   node source/test/calendar-nav.mjs
 *
 * They used to step a month in every view, so in the day view › went from the
 * 18th of October to the 1st of November — it changed the month and reset the
 * day. Stepping through days one at a time is the reason the day view exists,
 * and it was the one thing the arrows could not do. Nothing threw and the page
 * looked correct after every press; only the number was wrong.
 *
 * Checked by pressing the real buttons and reading the permalink, which is the
 * one place the view's whole state is written down.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
            ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
            ".webmanifest": "application/manifest+json" };
const srv = createServer(async (q, r) => {
  try {
    const b = await readFile(join(ROOT, normalize(decodeURIComponent((q.url || "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "")));
    r.writeHead(200, { "content-type": T[extname(q.url)] || "application/octet-stream" }); r.end(b);
  } catch { r.writeHead(404).end("no"); }
});
const port = await new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = []; page.on("pageerror", e => errs.push(String(e && e.message || e)));
let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };

await page.goto(`http://127.0.0.1:${port}/calendar.html`, { waitUntil: "load" });
await page.waitForFunction(() => document.getElementById("cnext"), { timeout: 45000 });
await page.waitForTimeout(800);

const stateOf = () => page.evaluate(() => {
  const s = window.__calState ? window.__calState() : null;
  return s ? { y: s.y, m: s.m, d: s.d, view: s.view } : null;
});

async function setView(v) {
  await page.click(`[data-cview="${v}"]`);
  await page.waitForTimeout(500);
}
async function press(sel) { await page.click(sel); await page.waitForTimeout(550); }

/* ---- day view: one day at a time, across a month end ------------------- */
console.log("\nday view — the arrows must move one day");
await setView("day");
await page.evaluate(() => { const s = window.__calState(); s.y = 2026; s.m = 10; s.d = 30; window.__calRender(); });
await page.waitForTimeout(500);
let a = await stateOf();
await press("#cnext");
let b2 = await stateOf();
say(b2.y === 2026 && b2.m === 10 && b2.d === 31,
  `30 Oct → ${b2.d} ${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][b2.m]} ${b2.y}`);
await press("#cnext");
let c2 = await stateOf();
say(c2.y === 2026 && c2.m === 11 && c2.d === 1,
  `31 Oct → 1 Nov: it crosses the month end rather than stopping`);
await press("#cprev");
let d2 = await stateOf();
say(d2.m === 10 && d2.d === 31, `and back again: 1 Nov → 31 Oct`);

/* a year end, and a leap day */
await page.evaluate(() => { const s = window.__calState(); s.y = 2026; s.m = 12; s.d = 31; window.__calRender(); });
await page.waitForTimeout(400); await press("#cnext");
let e2 = await stateOf();
say(e2.y === 2027 && e2.m === 1 && e2.d === 1, `31 Dec 2026 → 1 Jan 2027`);
await page.evaluate(() => { const s = window.__calState(); s.y = 2028; s.m = 2; s.d = 28; window.__calRender(); });
await page.waitForTimeout(400); await press("#cnext");
let f2 = await stateOf();
say(f2.m === 2 && f2.d === 29, `28 Feb 2028 → 29 Feb: a leap day is not skipped`);

/* ---- month and almanac: one month ------------------------------------- */
for (const v of ["month", "almanac"]) {
  console.log(`\n${v} view — the arrows must move one month`);
  await setView(v);
  await page.evaluate(() => { const s = window.__calState(); s.y = 2026; s.m = 12; window.__calRender(); });
  await page.waitForTimeout(400);
  await press("#cnext");
  const g = await stateOf();
  say(g.y === 2027 && g.m === 1, `Dec 2026 → Jan 2027`);
  await press("#cprev");
  const h = await stateOf();
  say(h.y === 2026 && h.m === 12, `and back to Dec 2026`);
}

/* ---- year: one year ---------------------------------------------------- */
console.log("\nyear view — the arrows must move one year");
await setView("year");
const y0 = (await stateOf()).y;
await press("#cnext");
const y1 = (await stateOf()).y;
say(y1 === y0 + 1, `${y0} → ${y1}`);

/* ---- the range ends must hold ----------------------------------------- */
console.log("\nthe ends of the range");
await page.evaluate(() => { const s = window.__calState(); s.view = "day"; s.y = 2200; s.m = 12; s.d = 31; window.__calRender(); });
await page.waitForTimeout(400); await press("#cnext");
const z = await stateOf();
say(z.y === 2200 && z.m === 12 && z.d === 31, `31 Dec 2200 does not step past the end of the range`);
await page.evaluate(() => { const s = window.__calState(); s.view = "day"; s.y = 1800; s.m = 1; s.d = 1; window.__calRender(); });
await page.waitForTimeout(400); await press("#cprev");
const z2 = await stateOf();
say(z2.y === 1800 && z2.m === 1 && z2.d === 1, `1 Jan 1800 does not step before it`);

/* ---- the buttons say which unit they move ------------------------------ */
console.log("\nthe control says what it will do");
for (const [v, want] of [["day", "day"], ["month", "month"], ["year", "year"], ["almanac", "month"]]) {
  await setView(v);
  const lab = await page.getAttribute("#cnext", "aria-label");
  say(lab === "Next " + want, `${v.padEnd(8)} → "${lab}"`);
}

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 4).forEach(e => console.log("  " + e)); fails += errs.length; }
console.log(`\n${fails ? fails + " check(s) failed" : "every arrow moves what its view is showing"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
