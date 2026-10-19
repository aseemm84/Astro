/* Are the horā lords right, and are the choghaḍiyā the day's own eighths?
 *
 *   node hora-verify.mjs
 *
 * WHY THIS AND NOT A GLANCE. A horā table looks right whenever it is a
 * seven-cycle, and every rotation of a seven-cycle looks exactly as plausible
 * as the correct one. So the test does not compare against a table typed here
 * — it asserts the two properties that only the correct rotation has:
 *
 *   the FIRST horā of a day belongs to that day's own lord, which is what ties
 *   the sequence to the weekday at all; and
 *
 *   the TWENTY-FIFTH horā — the first of the next day — belongs to the NEXT
 *   weekday's lord. That is the closure. 24 mod 7 is 3, so twenty-four steps
 *   down the Chaldean order land three places along, and the weekday lords are
 *   spaced exactly three apart in that order. A table off by one rotation
 *   passes the first check on one weekday and fails this one on all seven.
 *
 * It also checks the horā boundaries are twenty-fourths of THAT day's
 * sunrise-to-sunrise and the choghaḍiyā eighths of sunrise-to-sunset, because
 * a card that printed clock hours instead would look entirely normal.
 *
 * ONE THRESHOLD THAT HAD TO GO. The first version of this test also demanded
 * that a horā differ measurably from sixty minutes. It failed on all seven
 * days, and the code was right: those days are a week from the equinox, where
 * sunrise-to-sunrise is within a minute of 1440 and a horā really is 59.96
 * minutes. The claim "a horā is not a clock hour" is a claim about the YEAR,
 * not about a day, so it is now tested where it can be tested — between the
 * solstices, below — and the per-day check asserts only the exact twenty-fourth,
 * which is the part that holds every day.
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
await page.goto(`http://127.0.0.1:${port}/calendar.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.NP && window.NP.day, { timeout: 30000 });

const R = await page.evaluate(() => {
  const P = { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  /* the classical lord of each weekday */
  const WD_LORD = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  const out = { days: [], firstOk: 0, closeOk: 0, spanOk: 0, chogOk: 0, n: 0 };
  /* seven consecutive days, so every weekday is the first horā once */
  for (let k = 0; k < 7; k++) {
    const base = Date.UTC(2026, 2, 2 + k, 7, 0, 0) - P.tz * 3600000;
    const D = window.NP.day(base, P);
    if (!D || D.sunrise == null || D.nextSunrise == null) continue;
    out.n++;
    const span = (D.nextSunrise - D.sunrise) / 24;
    const at = (ms) => { const o = Object.assign({}, D); o.ms = ms; return o; };
    const lords = [];
    for (let i = 0; i < 24; i++)
      lords.push(window.NP.hora(at(D.sunrise + span * (i + 0.5))).lord);

    /* the weekday this day's sunrise falls on, computed the same way the
       implementation does but from the Date object rather than the JD */
    const loc = new Date(D.sunrise + P.tz * 3600000);
    const wd = loc.getUTCDay();

    /* 1. the first horā is the day's own lord */
    const first = lords[0] === WD_LORD[wd];
    if (first) out.firstOk++;

    /* 2. the twenty-fifth horā is the NEXT day's lord. Asked of the next day's
          own object, so this also checks the two days agree at the seam. */
    const D2 = window.NP.day(base + 86400000, P);
    const span2 = (D2.nextSunrise - D2.sunrise) / 24;
    const at2 = (ms) => { const o = Object.assign({}, D2); o.ms = ms; return o; };
    const next = window.NP.hora(at2(D2.sunrise + span2 * 0.5)).lord;
    const close = next === WD_LORD[(wd + 1) % 7];
    if (close) out.closeOk++;

    /* 3. the horā is a twenty-fourth of THIS day, not an hour */
    const h0 = window.NP.hora(at(D.sunrise + span * 0.5));
    const len = (h0.to - h0.from) / 60000;
    const spanOk = Math.abs(len - span / 60000) < 0.001;
    if (spanOk) out.spanOk++;

    /* 4. the choghaḍiyā is an eighth of sunrise-to-sunset */
    const part = (D.sunset - D.sunrise) / 8;
    const c0 = window.NP.choghadiya(at(D.sunrise + part * 0.5));
    const c7 = window.NP.choghadiya(at(D.sunrise + part * 7.5));
    const cOk = c0 && c7 && !c0.night && !c7.night &&
                Math.abs((c0.to - c0.from) - part) < 1000 &&
                Math.abs(c7.to - D.sunset) < 1000;
    if (cOk) out.chogOk++;

    out.days.push({
      wd: WD[wd], dayLord: WD_LORD[wd], first: lords[0], ok1: first,
      h25: next, want25: WD_LORD[(wd + 1) % 7], ok2: close,
      horaMin: +len.toFixed(2), ok3: spanOk,
      chog: c0 ? c0.name : "—", chogMin: c0 ? +((c0.to - c0.from) / 60000).toFixed(1) : 0,
      ok4: cOk,
      chain: lords.slice(0, 8).join(" ")
    });
  }
  return out;
});

console.log("Seven consecutive days at New Delhi, March 2026\n");
console.log("  day  day-lord   1st horā    25th horā  want       horā   choghaḍiyā");
for (const d of R.days)
  console.log(`  ${d.wd}  ${d.dayLord.padEnd(9)} ${(d.ok1?"ok ":"NO ")}${d.first.padEnd(9)} ` +
              `${(d.ok2?"ok ":"NO ")}${d.h25.padEnd(9)} ${d.want25.padEnd(9)} ` +
              `${String(d.horaMin).padStart(5)}m${d.ok3?" ":"!"} ${d.chog} ${d.chogMin}m${d.ok4?"":" !"}`);
console.log("\n  first horā = the day's own lord ...... " + R.firstOk + "/" + R.n);
console.log("  25th horā  = the NEXT day's lord ..... " + R.closeOk + "/" + R.n);
console.log("  horā = 1/24 of this sunrise-to-sunrise  " + R.spanOk + "/" + R.n);
console.log("  choghaḍiyā = 1/8 of sunrise-to-sunset   " + R.chogOk + "/" + R.n);
/* The seasonal claim, where the season is actually there to be seen. */
const SEAS = await page.evaluate(() => {
  const P = { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const one = (y, mo, d) => {
    const D = window.NP.day(Date.UTC(y, mo, d, 7) - P.tz * 3600000, P);
    if (!D || D.sunrise == null || D.nextSunrise == null) return null;
    return { hora: (D.nextSunrise - D.sunrise) / 24 / 60000,
             chog: (D.sunset - D.sunrise) / 8 / 60000 };
  };
  return { jun: one(2026, 5, 21), dec: one(2026, 11, 21), mar: one(2026, 2, 20) };
});
console.log("\n  the same units across the year (New Delhi):");
["jun", "dec", "mar"].forEach(k => {
  const x = SEAS[k]; if (!x) return;
  console.log("    " + ({ jun: "21 Jun", dec: "21 Dec", mar: "20 Mar" })[k] +
              "   horā " + x.hora.toFixed(2) + " min   choghaḍiyā " + x.chog.toFixed(1) + " min");
});
/* A horā tracks sunrise-to-sunrise, which barely moves — so it stays near an
   hour all year, and that is correct rather than a flaw. A choghaḍiyā tracks
   the DAYLIGHT, which swings by hours, so this is where the difference from
   clock time is unmistakable. The test asserts the swing is real. */
const chogSwing = SEAS.jun && SEAS.dec ? Math.abs(SEAS.jun.chog - SEAS.dec.chog) : 0;
console.log("    choghaḍiyā swing between the solstices: " + chogSwing.toFixed(1) + " min" +
            "  (a clock hour would swing 0)");
const seasOk = chogSwing > 15;

console.log("\n  first eight lords each day (the Chaldean descent):");
for (const d of R.days) console.log("    " + d.wd + "  " + d.chain);
if (errs.length) { console.log("\npage errors:"); errs.slice(0,4).forEach(e=>console.log("  "+e)); }
const bad = (R.n !== 7) + (R.firstOk !== R.n) + (R.closeOk !== R.n) +
            (R.spanOk !== R.n) + (R.chogOk !== R.n) + (!seasOk);
console.log(bad ? "\nFAIL"
  : "\nthe horā chain closes on the weekday on all seven days, and both units\n" +
    "are measured against the day rather than the clock");
await browser.close(); server.close();
process.exit(bad ? 1 : 0);
