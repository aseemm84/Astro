/* Are the two clocks really two clocks?
 *
 *   node source/test/twoclock-verify.mjs
 *
 * The scene makes four claims that a viewer has to take on trust, and each one
 * is checkable against the longitudes the scene itself sampled:
 *
 *   1. the NAKṢATRA boundaries do not move. Every one sits at a multiple of
 *      13°20′ of sidereal longitude, at the start of the span and at the end.
 *
 *   2. the TITHI boundaries DO move, and by exactly the Sun's own motion —
 *      because they are defined from the Sun. The frame prints that slide; the
 *      test re-derives it from the Sun's longitude at the two ends and from
 *      the Sun's known mean rate, which must agree.
 *
 *   3. both counters advance about two or three steps in two and a half days,
 *      from the two different rates: the Moon's own (13.18°/day on average,
 *      11.8 to 15.4 with its distance) against 13°20′, and the elongation's
 *      (the Moon's less the Sun's) against 12°.
 *
 *   4. the crossings do not coincide. If they did, the scene's whole point
 *      would be wrong, so the test finds each crossing instant and asserts the
 *      nearest tithi crossing to each nakṣatra crossing is not within minutes.
 *
 * Claim 2 is the one worth the trouble. "The tithi grid is pinned to the Sun"
 * is easy to write and easy to get backwards, and a frame that rotated the
 * grid the wrong way, or not at all, would look entirely convincing.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  const { createRequire } = await import("node:module");
  ({ chromium } = createRequire(import.meta.url)("playwright"));
}
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
                ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  try {
    const body = await readFile(join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, "")));
    res.writeHead(200, { "content-type": TYPES[extname(url)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404).end("no"); }
});
const port = await new Promise(r => server.listen(0, "127.0.0.1", () => r(server.address().port)));
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/kundli.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__moProbe && window.__moTwoClockFacts,
                           { timeout: 30000 });

const R = await page.evaluate(() => {
  const cv = document.createElement("canvas");
  cv.width = 1080; cv.height = 1920;
  const P = { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  window.__moProbe(cv, "twoclocks", 0.5, P);
  const M = window.__moTwoClockFacts();
  if (!M) return null;
  const rows = M.rows, first = rows[0], last = rows[rows.length - 1];
  const days = (last.ms - first.ms) / 86400000;
  const norm = (x) => ((x % 360) + 360) % 360;

  /* 1. nakṣatra boundaries are multiples of 13°20′ — read off the Moon's
        longitude at each crossing instant: it must be ON a boundary. */
  const nakCross = [], tiCross = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].ni !== rows[i - 1].ni) nakCross.push(i);
    if (rows[i].ti !== rows[i - 1].ti) tiCross.push(i);
  }
  /* refine each crossing to the instant, by bisecting the index interval
     against a recomputed limb set — so the boundary longitude is exact
     rather than within one sample */
  const refine = (i, which) => {
    let lo = rows[i - 1].ms, hi = rows[i].ms;
    const idx = (ms) => {
      const L = window.__mgLimbs(ms);
      return which === "nak" ? L.nak.i : L.tithi.i;
    };
    const a = idx(lo);
    for (let k = 0; k < 44; k++) {
      const mid = (lo + hi) / 2;
      if (idx(mid) === a) lo = mid; else hi = mid;
    }
    const L = window.__mgLimbs((lo + hi) / 2);
    return { ms: (lo + hi) / 2, moon: L.moon, sun: L.sun, elong: L.elong };
  };
  const nakAt = nakCross.map(i => refine(i, "nak"));
  const tiAt = tiCross.map(i => refine(i, "tithi"));

  /* a nakṣatra boundary: Moon longitude is a multiple of 13°20′ */
  const nakErr = nakAt.map(x => {
    const v = x.moon / (40 / 3);
    return Math.abs(v - Math.round(v)) * (40 / 3) * 3600;   /* arcseconds */
  });
  /* a tithi boundary: the ELONGATION is a multiple of 12° — and the Moon's own
     longitude is NOT on any round number, which is the contrast */
  const tiErr = tiAt.map(x => {
    const v = x.elong / 12;
    return Math.abs(v - Math.round(v)) * 12 * 3600;
  });

  /* 2. the slide of the tithi grid = the Sun's own motion */
  const slide = norm(last.sun - first.sun);
  const sunRate = slide / days;

  /* 3. rates */
  const moonRate = norm(last.moon - first.moon) / days;
  const elongRate = norm(last.elong - first.elong) / days;

  /* 4. do the crossings coincide? */
  let closest = Infinity;
  for (const n of nakAt) for (const t of tiAt)
    closest = Math.min(closest, Math.abs(n.ms - t.ms) / 60000);

  return {
    days, slide, sunRate, moonRate, elongRate,
    nakN: nakAt.length, tiN: tiAt.length,
    frameNak: M.nC, frameTi: M.tC, frameSlide: M.slide,
    nakErrMax: Math.max(...nakErr), tiErrMax: Math.max(...tiErr),
    closestMin: closest,
    nakBounds: nakAt.map(x => +(x.moon).toFixed(4)),
    tiBounds: tiAt.map(x => +(x.elong).toFixed(4))
  };
});

if (!R) { console.log("FAIL: no sampled span"); await browser.close(); server.close(); process.exit(1); }

console.log(`Span: ${R.days.toFixed(3)} days, New Delhi\n`);
console.log("1. the nakṣatra boundaries sit on multiples of 13°20′");
R.nakBounds.forEach((b, i) => console.log(`     crossing ${i + 1}: Moon ${b}°   = ${(b / (40 / 3)).toFixed(6)} × 13°20′`));
console.log(`   worst departure from a boundary: ${R.nakErrMax.toFixed(3)}″`);
console.log("\n2. the tithi boundaries sit on multiples of 12° OF ELONGATION");
R.tiBounds.forEach((b, i) => console.log(`     crossing ${i + 1}: elongation ${b}°   = ${(b / 12).toFixed(6)} × 12°`));
console.log(`   worst departure: ${R.tiErrMax.toFixed(3)}″`);
console.log("\n3. the grid's slide is the Sun's own motion");
console.log(`   slide over the span ......... ${R.slide.toFixed(4)}°`);
console.log(`   frame printed .............. ${(+R.frameSlide).toFixed(4)}°`);
console.log(`   implied Sun rate ........... ${R.sunRate.toFixed(4)}°/day`);
console.log(`   the Sun's known mean rate .. 0.9856°/day`);
console.log("\n4. the two rates, which is why the counters go out of step");
console.log(`   Moon      ${R.moonRate.toFixed(3)}°/day against a 13.3333° sector`);
console.log(`   elongation ${R.elongRate.toFixed(3)}°/day against a 12° wedge`);
console.log(`   crossings counted: ${R.nakN} nakṣatra, ${R.tiN} tithi` +
            `   (frame says ${R.frameNak} and ${R.frameTi})`);
console.log(`   nearest nakṣatra crossing to a tithi crossing: ${R.closestMin.toFixed(0)} min apart`);

const checks = [
  ["nakṣatra boundaries exact", R.nakErrMax < 2],
  ["tithi boundaries exact (in elongation)", R.tiErrMax < 2],
  ["frame's slide matches the longitudes", Math.abs(R.slide - R.frameSlide) < 0.0005],
  /* the true Sun, not the mean one: about 0.953°/day at aphelion (early July)
     and 1.019°/day at perihelion (early January), so the check holds on any
     date rather than only away from January */
  ["slide = the Sun's own motion (0.95–1.02°/day through the year)",
   R.sunRate > 0.950 && R.sunRate < 1.022],
  /* The Moon's speed is not a constant: about 11.8°/day at apogee and 15.4°/day
     at perigee. These two checks used to assert the MEAN, 13.18 ± 1.2, which
     is only true near mean distance — so the suite passed or failed with the
     Moon's anomaly on the day it ran, and failed in November 2026 with the
     Moon near apogee at 11.97°/day, correctly measured. Asserted now: the
     rate lies inside the Moon's real range, and the elongation's rate is the
     Moon's less the Sun's — which holds on every date and is far tighter. */
  [`Moon's rate inside its real range, 11.7–15.5°/day (got ${R.moonRate.toFixed(3)})`,
   R.moonRate > 11.7 && R.moonRate < 15.5],
  [`elongation rate = Moon's rate − Sun's rate (${R.elongRate.toFixed(3)} vs ${(R.moonRate - R.sunRate).toFixed(3)})`,
   Math.abs(R.elongRate - (R.moonRate - R.sunRate)) < 0.01],
  ["frame's counts match the crossings", R.nakN === R.frameNak && R.tiN === R.frameTi],
  ["the crossings do not coincide", R.closestMin > 20]
];
console.log("");
let bad = 0;
for (const [name, ok] of checks) { if (!ok) bad++; console.log(`  ${ok ? "ok  " : "FAIL"} ${name}`); }
if (errs.length) { console.log("\npage errors:"); errs.slice(0, 4).forEach(e => console.log("  " + e)); }
console.log(bad ? "\nFAIL" : "\nboth scales check out, and they are measured from different things");
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
