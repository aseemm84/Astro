/* Cross-checks for the reel scenes, against sources that are not the scenes.
 *
 *   node source/test/reel-verify.mjs
 *
 * A scene that draws and varies can still be wrong, and four of these five put
 * numbers on screen that a reader could check against a printed pañcāṅga. So
 * each number is checked here against something independent of the code that
 * produced it: the tithi boundaries against panchanga.js (a separate
 * implementation in a separate file), the shadow against closed-form spherical
 * trigonometry, the moonrise drift against the Moon's own mean motion, and the
 * phase drawing against the pixels it actually lays down.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { const { createRequire } = await import("node:module");
        ({ chromium } = createRequire(import.meta.url)("playwright")); }

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
const page = await browser.newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${port}/kundli.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.__moReelKeys, { timeout: 30000 });
/* panchanga.js is not in kundli.html; it is loaded here on purpose, so the
   check is made against an implementation written separately from the scenes. */
await page.evaluate(() => new Promise((ok, no) => {
  const s = document.createElement("script"); s.src = "panchanga.js";
  s.onload = ok; s.onerror = no; document.head.appendChild(s);
}));

const P = { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };

/* ---- 1. tithi boundaries vs panchanga.js -------------------------------- */
/* Compared AT SUNRISE, because that is the instant panchanga.js reports for,
   and comparing a boundary found from an arbitrary instant against one found
   from sunrise would be two right answers to two different questions. */
const t = await page.evaluate((P) => {
  const NP = window.NP, out = [];
  const t0 = Date.now();
  for (let i = 0; i < 8; i++) {
    const D = NP.day(t0 + i * 86400000,
                     { lat: P.lat, lon: P.lon, tz: P.tz, n: P.n }, { ends: true });
    if (!D) continue;
    const sr = D.sunrise;
    out.push({
      idx: window.__moTithiIdx(sr),
      end: window.__moTithiEnd(sr),
      hours: (D.at.tithi.ends - D.at.tithi.began) / 3600000,
      npIdx: D.at.tithi.i, npEnd: D.at.tithi.ends, npN: D.at.tithi.n,
      npName: D.at.tithi.paksha + " " + D.at.tithi.name
    });
  }
  return out;
}, P);
console.log("\ntithi boundaries vs panchanga.js");
t.forEach(r => {
  const idxOk = r.npIdx == null || r.npIdx === r.idx;
  const endOk = r.npEnd == null || Math.abs(r.npEnd - r.end) < 120000;   /* 2 minutes */
  say(idxOk && endOk,
    `${r.npName.padEnd(18)} ${r.hours.toFixed(2)} h` +
    `  index ${idxOk ? "agrees" : "DIFFERS (reel " + (r.idx + 1) + " vs np " + (r.npIdx + 1) + ")"}` +
    `  end ${(Math.abs(r.npEnd - r.end) / 1000).toFixed(0)} s apart`);
});
const hrs = t.map(r => r.hours);
say(Math.min(...hrs) > 19 && Math.max(...hrs) < 27,
  `every length inside the real range 19–27 h (saw ${Math.min(...hrs).toFixed(2)}–${Math.max(...hrs).toFixed(2)})`);

/* ---- 2. the shadow, against closed-form trigonometry -------------------- */
const sh = await page.evaluate((P) => {
  /* local apparent noon shadow from the Sun's declination alone:
       alt = 90 - |lat - dec|,  shadow = 12 / tan(alt)   */
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920;
  window.__moProbe(cv, "shadow", 0.5, P);
  return window.__moShadowFacts ? window.__moShadowFacts() : null;
}, P);
console.log("\nthe shadow stick");
if (!sh) { say(false, "no facts hook"); }
else {
  const R = Math.PI / 180;
  const altExpect = 90 - Math.abs(P.lat - sh.decAtNoon);
  const lenExpect = 12 / Math.tan(altExpect * R);
  say(Math.abs(lenExpect - sh.shortest) < 0.25,
    `shortest shadow ${sh.shortest.toFixed(2)} vs trigonometry ${lenExpect.toFixed(2)} aṅgulas`);
  say(Math.abs(12 * Math.tan(P.lat * R) - sh.aksha) < 0.01,
    `akṣabhā ${sh.aksha.toFixed(2)} = 12·tan(${P.lat}°)`);
  /* the shortest shadow is local apparent noon, which is within 20 minutes of
     mean noon corrected for longitude in any month */
  const meanNoonH = 12 + (15 * P.tz - P.lon) / 15;
  say(Math.abs(sh.shortestH - meanNoonH) < 0.35,
    `shortest at ${sh.shortestH.toFixed(2)} h local vs mean noon ${meanNoonH.toFixed(2)} h (equation of time)`);
}

/* ---- 3. moonrise drift -------------------------------------------------- */
const md = await page.evaluate((P) => {
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920;
  window.__moProbe(cv, "moondrift", 0.99, P);
  return window.__moDriftFacts ? window.__moDriftFacts() : null;
}, P);
console.log("\nmoonrise drift");
if (!md) say(false, "no facts hook");
else {
  say(md.rows === 30, `thirty rows (${md.rows})`);
  say(md.missing <= 2, `at most a couple of days without a moonrise (${md.missing})`);
  /* the mean drift is the Moon's synodic lag: 1440 min × (1/29.53) ≈ 48.8 min */
  say(Math.abs(md.avg - 48.8) < 6, `mean drift ${md.avg.toFixed(1)} min/day vs 48.8 expected`);
  say(md.spread > 15, `drift visibly varies day to day (spread ${md.spread.toFixed(0)} min)`);
  say(md.dateOk, `each row's moonrise falls on that row's own local date`);
}

/* ---- 4. the phase disc, measured off the canvas ------------------------- */
const ph = await page.evaluate(() => {
  const cv = document.createElement("canvas"); cv.width = 400; cv.height = 100;
  const c = cv.getContext("2d");
  const out = [];
  [45, 90, 135, 225, 270, 315].forEach((e, i) => {
    c.fillStyle = "#000"; c.fillRect(0, 0, 400, 100);
    window.__moPhaseProbe(c, 50, 50, 34, e);
    const d = c.getImageData(0, 0, 100, 100).data;
    let L = 0, R = 0;
    for (let y = 16; y < 84; y++) for (let x = 16; x < 84; x++) {
      const v = d[(y * 100 + x) * 4];
      if (x < 50) L += v; else R += v;
    }
    out.push({ e, left: L, right: R });
  });
  return out;
});
console.log("\nthe lit limb (waxing is lit on the right for a northern observer)");
ph.forEach(r => {
  const waxing = r.e < 180;
  const ok = waxing ? r.right > r.left * 1.25 : r.left > r.right * 1.25;
  say(ok, `elongation ${String(r.e).padStart(3)}°  ${waxing ? "waxing" : "waning"}` +
          `  lit ${r.right > r.left ? "right" : "left"}` +
          `  (${(Math.max(r.left, r.right) / Math.max(1, Math.min(r.left, r.right))).toFixed(1)}:1)`);
});

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 5).forEach(e => console.log("  " + e)); }
console.log(`\n${fails ? fails + " check(s) failed" : "every cross-check agreed"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
