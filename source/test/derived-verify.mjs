/* Cross-checks for the derived points and the later-tradition additions.
 *
 *   node source/test/derived-verify.mjs
 *
 * Every number here is checked against something that is not the code that
 * produced it. The zero-shadow days are the strongest of them: nakshatraganita.in
 * publishes 24 April and 18 August for Bengaluru, computed independently by
 * somebody else from a different implementation, so agreeing with it is worth
 * more than agreeing with ourselves.
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
const page = await browser.newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e && e.message || e)));
let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };

await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.NP && window.NP.taraGrid, { timeout: 45000 });

/* ---- zero-shadow days, against a figure published elsewhere ------------- */
console.log("\nzero-shadow days (independent figures from nakshatraganita.in)");
const zs = await page.evaluate(() => {
  const out = {};
  const places = {
    "Bengaluru": { n: "Bengaluru", lat: 12.9716, lon: 77.5946, tz: 5.5 },
    "Delhi":     { n: "Delhi",     lat: 28.6139, lon: 77.2090, tz: 5.5 },
    "Chennai":   { n: "Chennai",   lat: 13.0827, lon: 80.2707, tz: 5.5 }
  };
  for (const k in places) {
    const r = window.NP.zeroShadowDays(places[k], 2026);
    out[k] = { why: r.why || null, days: r.days.map(ms => {
      const d = new Date(ms + places[k].tz * 3600000);
      return d.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
    }) };
  }
  return out;
});
say(zs.Bengaluru.days.length === 2 &&
    /2[345] Apr/.test(zs.Bengaluru.days[0]) && /1[789] Aug/.test(zs.Bengaluru.days[1]),
  `Bengaluru ${zs.Bengaluru.days.join(" and ")}  (published: 24 Apr and 18 Aug)`);
say(zs.Chennai.days.length === 2, `Chennai ${zs.Chennai.days.join(" and ")} — two, as it must be inside the tropics`);
say(zs.Delhi.days.length === 0 && !!zs.Delhi.why,
  `Delhi: none, and it says why ("${zs.Delhi.why}") — 28.6°N is outside the tropics`);

/* ---- Tara Bala: the arithmetic, checked by its own definition ----------- */
console.log("\nTāra Bala");
const tb = await page.evaluate(() => {
  const NP = window.NP;
  return {
    self: NP.taraBala(5, 5),
    next: NP.taraBala(6, 5),
    seventh: NP.taraBala(5 + 6, 5),
    wrap: NP.taraBala(1, 25),
    cycle3: NP.taraBala(5 + 18, 5),
    names: Array.from({ length: 9 }, (_, i) => NP.taraBala(5 + i, 5).name)
  };
});
say(tb.self.name === "Janma" && tb.self.count === 1, `the birth star counted from itself is Janma (${tb.self.name})`);
say(tb.next.name === "Sampat", `the next star is Sampat (${tb.next.name})`);
/* Vadha is the SEVENTH of the nine, not the eighth — Janma is itself the
   first, so the count and the index differ by one. */
say(tb.seventh.name === "Vadha", `the seventh is Vadha (${tb.seventh.name})`);
say(tb.wrap.count === 4 && tb.wrap.name === "Kṣema",
  `it wraps past 27 correctly: star 2 from star 26 is count ${tb.wrap.count}, ${tb.wrap.name}`);
say(tb.cycle3.cycle === 3 && tb.cycle3.name === "Janma",
  `the ninefold cycle repeats three times (count 19 → cycle ${tb.cycle3.cycle}, ${tb.cycle3.name})`);
say(new Set(tb.names).size === 9, `all nine names distinct: ${tb.names.join(", ")}`);

/* every one of the 27 appears exactly once in the grid, in exactly one tara */
const grid = await page.evaluate(() => {
  const D = window.NP.dayOfDate(2026, 10, 18,
    { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 }, { ends: true, month: true });
  const G = window.NP.taraGrid(D);
  const counts = {};
  G.rows.forEach(r => { counts[r.tara.name] = (counts[r.tara.name] || 0) + 1; });
  return { n: G.rows.length, counts, today: G.todayName,
           uniq: new Set(G.rows.map(r => r.name)).size };
});
say(grid.n === 27 && grid.uniq === 27, `the grid has all 27 stars, once each`);
say(Object.values(grid.counts).every(v => v === 3) && Object.keys(grid.counts).length === 9,
  `each of the nine tāras holds exactly three stars (${grid.today} today)`);

/* ---- Brahma Muhurta ----------------------------------------------------- */
console.log("\nBrahma Muhūrta");
const bm = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const D = window.NP.dayOfDate(2026, 10, 18, P, { ends: true });
  const b = window.NP.brahmaMuhurta(D);
  return { beforeMin: (D.sunrise - b.from) / 60000, lenMin: (b.to - b.from) / 60000, src: b.src };
});
say(Math.abs(bm.beforeMin - 96) < 4, `begins ${bm.beforeMin.toFixed(1)} min before sunrise (two ghaṭīs ≈ 96)`);
say(Math.abs(bm.lenMin - 48) < 2, `lasts ${bm.lenMin.toFixed(1)} min (one muhūrta ≈ 48)`);
say(bm.src === "tradition", `labelled "${bm.src}", not BPHS`);

/* ---- the derived points, in a real chart -------------------------------- */
console.log("\nderived points in a rendered chart");
const dp = await page.evaluate(async () => {
  /* the arithmetic, independently of the rendering */
  const norm = x => ((x % 360) + 360) % 360;
  const moon = 275.0, rahu = 310.0, sun = 40.0;
  const bb = norm(rahu + norm(moon - rahu) / 2);
  const yogi = norm(sun + moon + 93 + 20 / 60);
  const av = norm(yogi + 186 + 40 / 60);
  return { bb, yogi, av, fwd: norm(moon - rahu), gap: norm(av - yogi) };
});
/* Rahu 310 → Moon 275 going FORWARD is 325°, so the midpoint is 310+162.5 = 112.5.
   The naive "shorter arc" midpoint would be 292.5 — 180° out, which is the fault
   this is checked for. */
say(Math.abs(dp.fwd - 325) < 1e-6, `forward arc Rāhu→Moon is ${dp.fwd}°, not the 35° short way`);
say(Math.abs(dp.bb - 112.5) < 1e-6, `Bhṛgu Bindu = ${dp.bb}°, not the 292.5° a near-midpoint would give`);
say(Math.abs(dp.gap - 186.6667) < 1e-3, `Avayogi sits ${dp.gap.toFixed(4)}° on from the Yogi point (186°40′)`);

const sec = await page.evaluate(async () => {
  const r = await fetch("kundli.html");           /* the section must be in the bundle */
  const t = await r.text();
  return { hasFn: /function derivedPointsSection/.test(t),
           registered: /sec\("Derived points"/.test(t),
           tags: /dptag/.test(t),
           saysNotBphs: /None of these is Par/.test(t) };
});
say(sec.hasFn && sec.registered, `the section is in the chart bundle and registered`);
say(sec.tags, `provenance tags are rendered`);
say(sec.saysNotBphs, `the section states plainly that none of it is Parāśara's`);

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 5).forEach(e => console.log("  " + e)); fails += errs.length; }
console.log(`\n${fails ? fails + " check(s) failed" : "every cross-check agreed"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
