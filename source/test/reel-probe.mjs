/* Does each reel scene actually draw something, and is it inside the safe area?
 *
 *   node source/test/reel-probe.mjs [scene ...]
 *
 * WHY MEASURE RATHER THAN LOOK. A scene that throws is obvious. A scene that
 * draws nothing, or draws everything into the strip Instagram covers with its
 * own caption, looks exactly like a scene that works — the canvas is dark either
 * way. So the probe renders real frames at real export size and counts lit
 * pixels: in the whole frame, and separately in each reserved strip.
 *
 * It also times the first frame, because every one of these scenes computes a
 * day or a lunation or eight years on first draw and a reel that takes four
 * seconds to show anything is a reel nobody waits for.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

/* Resolved by both mechanisms, for the reason run-self-test.mjs gives: an ESM
   import only walks node_modules up from this file, and a global install sits on
   the CommonJS path instead. */
let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try {
    const { createRequire } = await import("node:module");
    ({ chromium } = createRequire(import.meta.url)("playwright"));
  } catch {
    console.error("playwright is not installed on this machine.");
    process.exit(2);
  }
}

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".svg": "image/svg+xml",
                ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  try {
    const body = await readFile(join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, "")));
    res.writeHead(200, { "content-type": TYPES[extname(url)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404).end("no"); }
});
const port = await new Promise(r => server.listen(0, "127.0.0.1", () => r(server.address().port)));
const base = `http://127.0.0.1:${port}`;

/* --shots <dir> also writes a still of every scene there. Numbers prove a scene
   draws and varies; only a picture shows whether it is worth posting, and the
   two questions are close enough together to belong in one tool. */
const argv = process.argv.slice(2);
const si = argv.indexOf("--shots");
const shotDir = si >= 0 ? argv[si + 1] : null;
if (shotDir) { argv.splice(si, 2); await mkdir(shotDir, { recursive: true }); }
const want = argv;
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on("pageerror", e => errs.push(String(e)));
await page.goto(`${base}/kundli.html`, { waitUntil: "load" });
await page.waitForFunction(
  () => window.__moReelKeys && window.__moDeepKeys, { timeout: 30000 });

/* Both families: the day-dynamic five and the deep-time pair. Listing them
   from the page rather than here means a scene added to either file is
   probed without anyone remembering to add it. */
const keys = want.length ? want : await page.evaluate(
  () => (window.__moReelKeys || []).concat(window.__moDeepKeys || []));
console.log(`probing ${keys.length} scene(s) at 1080x1920\n`);

let bad = 0;
for (const key of keys) {
  const r = await page.evaluate(async (k) => {
    /* a canvas at true export size, driven by the scene directly — the pane's
       own preview canvas is small and would hide a layout fault */
    const cv = document.createElement("canvas");
    const S = { w: 1080, h: 1920 };
    cv.width = S.w; cv.height = S.h;
    const out = { key: k, frames: [], err: null, firstMs: 0 };
    /* Delhi, because four of these five are about a place and the probe must
       supply one rather than measuring the "no place" notice. */
    const P = { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
    try {
      const api = window.__moProbe;
      if (!api) throw new Error("no __moProbe hook");
      const t0 = performance.now();
      out.frames.push(api(cv, k, 0.02, P));
      out.firstMs = Math.round(performance.now() - t0);
      [0.3, 0.6, 0.95].forEach(p => out.frames.push(api(cv, k, p)));
    } catch (e) { out.err = String(e && e.message || e); }
    return out;
  }, key);

  if (r.err) { console.log(`  ${key.padEnd(11)}  THREW: ${r.err}`); bad++; continue; }
  const f = r.frames;
  const lit = f.map(x => x.lit);
  const minLit = Math.min(...lit);
  const varies = new Set(f.map(x => x.hash)).size;
  const worstBottom = Math.max(...f.map(x => x.bottom));
  const worstRight = Math.max(...f.map(x => x.right));
  const worstTop = Math.max(...f.map(x => x.top));
  const ok = minLit > 0.004 && varies >= 3 &&
             worstBottom < 0.5 && worstRight < 0.5 && worstTop < 0.5;
  if (!ok) bad++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${key.padEnd(11)}` +
    ` lit ${(minLit * 100).toFixed(2)}%–${(Math.max(...lit) * 100).toFixed(2)}%` +
    `  distinct ${varies}/4` +
    `  safe strips b/r/t ${(worstBottom * 100).toFixed(2)}/${(worstRight * 100).toFixed(2)}/${(worstTop * 100).toFixed(2)}%` +
    `  first frame ${r.firstMs} ms`
  );
  if (shotDir) {
    const u = await page.evaluate((k) => {
      /* Drawn at the scene's OWN coordinate system and only then reduced.
         moSize() is a fixed export size, not the canvas size, so a smaller
         canvas does not make a smaller picture — it makes a clipped one. */
      const cv = document.createElement("canvas");
      cv.width = 1080; cv.height = 1920;
      window.__moProbe(cv, k, 0.62,
        { n: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 });
      const sm = document.createElement("canvas");
      sm.width = 540; sm.height = 960;
      const sc = sm.getContext("2d");
      sc.imageSmoothingQuality = "high";
      sc.drawImage(cv, 0, 0, 540, 960);
      return sm.toDataURL("image/png");
    }, key);
    await writeFile(`${shotDir}/reel-${key}.png`, Buffer.from(u.split(",")[1], "base64"));
  }
}
if (errs.length) { console.log("\npage errors:"); errs.slice(0, 6).forEach(e => console.log("  " + e)); }
console.log(`\n${keys.length - bad}/${keys.length} scenes drew, varied and stayed clear of the reserved strips`);
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
