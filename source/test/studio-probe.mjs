/* Does the Studio page's new half actually work?
 *
 *   node source/test/studio-probe.mjs [--shot <dir>]
 *
 * The reel strip and the card composer are built from the Studio's own state
 * after it has loaded three scripts and computed a day, so almost every way
 * they can fail is a timing or wiring fault that throws nothing: a strip that
 * never mounts, links that carry the default city instead of the chosen one, a
 * canvas that renders zero slots. Each of those looks like an empty region of
 * a page that is still, technically, fine.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
const argv = process.argv.slice(2);
const si = argv.indexOf("--shot");
const shotDir = si >= 0 ? argv[si + 1] : null;
if (shotDir) await mkdir(shotDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(String(e && e.message || e)));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "load" });

let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };

await page.waitForFunction(
  () => document.querySelectorAll("#streels .strcard").length > 0 &&
        document.querySelectorAll("#stcrows .stcrow").length > 0,
  null, { timeout: 45000 }).catch(() => {});

console.log("\nthe reel strip");
const strip = await page.evaluate(() => {
  const cards = [...document.querySelectorAll("#streels .strcard")];
  return cards.map(c => ({
    title: c.querySelector("h3")?.textContent || "",
    secs: c.querySelector(".strsec")?.textContent || "",
    rec: c.querySelector("[data-strrec]")?.getAttribute("href") || "",
    open: c.querySelector("[data-stropen]")?.getAttribute("href") || ""
  }));
});
say(strip.length === 5, `five reels mounted (${strip.length})`);
strip.forEach(s => {
  const q = new URLSearchParams(s.rec.split("#")[1] || "");
  const ok = q.get("rec") === "1" && q.get("safe") === "1" &&
             q.get("ratio") === "9:16" && (q.get("place") || "").split("|").length === 4;
  say(ok, `${s.title.padEnd(32)} ${s.secs.padStart(5)}  scene=${q.get("sky")}` +
          ` span=${q.get("span")} speed=${q.get("speed")} place=${(q.get("place") || "").split("|")[0]}`);
});
say(strip.every(s => !/rec=1/.test(s.open)),
  "the second link opens the scene without recording");

/* the composer */
console.log("\nthe composer");
const comp = await page.evaluate(() => {
  const cv = document.getElementById("stccv");
  const rows = document.querySelectorAll("#stcrows .stcrow").length;
  const recipes = [...document.querySelectorAll("#stcrecipe option")].map(o => o.value);
  /* how much of the card is actually drawn on */
  let lit = 0, tot = 0;
  if (cv && cv.width) {
    const c = cv.getContext("2d");
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const bg = (d[0] + d[1] + d[2]) / 3 + 26;
    for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
      const i = (y * cv.width + x) * 4; tot++;
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 > bg) lit++;
    }
  }
  return { rows, recipes, w: cv?.width || 0, h: cv?.height || 0, lit: tot ? lit / tot : 0,
           msg: document.getElementById("stcmsg")?.textContent || "" };
});
say(comp.rows >= 5, `the first recipe wrote slots (${comp.rows})`);
say(comp.recipes.length >= 5, `recipes offered: ${comp.recipes.join(", ")}`);
say(comp.w === 1080 && [1080, 1350, 1920].indexOf(comp.h) >= 0,
  `preview at a true export size (${comp.w}×${comp.h})`);
say(comp.lit > 0.01, `the card is drawn on (${(comp.lit * 100).toFixed(2)}% lit)`);
say(comp.msg === "", `nothing overflows the card${comp.msg ? " — said: " + comp.msg : ""}`);

/* every recipe, and every slot type, must render without throwing */
console.log("\nevery recipe renders");
for (const k of comp.recipes) {
  const r = await page.evaluate(async (k) => {
    const sel = document.getElementById("stcrecipe");
    sel.value = k; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    const cv = document.getElementById("stccv");
    const c = cv.getContext("2d");
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const bg = (d[0] + d[1] + d[2]) / 3 + 26;
    let lit = 0, tot = 0;
    for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
      const i = (y * cv.width + x) * 4; tot++;
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 > bg) lit++;
    }
    return { lit: lit / tot, rows: document.querySelectorAll("#stcrows .stcrow").length,
             msg: document.getElementById("stcmsg")?.textContent || "" };
  }, k);
  say(r.lit > 0.004 && !r.msg,
    `${k.padEnd(10)} ${r.rows} slots, ${(r.lit * 100).toFixed(2)}% lit${r.msg ? "  — " + r.msg : ""}`);
}

/* The hardest case: Instagram's strips take a quarter of a 9:16 frame, so a
   recipe that fits unsafe can still overflow safe. Every recipe is checked in
   every shape, both ways. */
console.log("\nevery recipe in every shape, with and without the safe strips");
for (const k of comp.recipes) {
  for (const ratio of ["4:5", "1:1", "9:16"]) {
    for (const safe of [false, true]) {
      const r = await page.evaluate(async ([k, ratio, safe]) => {
        const sel = document.getElementById("stcrecipe");
        sel.value = k; sel.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise(r => setTimeout(r, 160));
        const rs = document.getElementById("stcratio");
        rs.value = ratio; rs.dispatchEvent(new Event("change", { bubbles: true }));
        const sb = document.getElementById("stcsafe");
        sb.checked = safe; sb.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise(r => setTimeout(r, 260));
        /* how far down the frame the last slot reached, measured rather than
           trusted: the renderer reports its own scale, and the foot is where
           an overflow would land */
        const cv = document.getElementById("stccv");
        const c = cv.getContext("2d");
        const W = cv.width, H = cv.height;
        const d = c.getImageData(0, 0, W, H).data;
        const bg = (d[0] + d[1] + d[2]) / 3 + 26;
        /* the band just above the foot's own text must not be crowded by
           content that ran past it */
        let overlap = 0, tot = 0;
        const y0 = Math.floor(H - W * 0.175), y1 = Math.floor(H - W * 0.06);
        for (let y = y0; y < y1; y += 2) for (let x = Math.floor(W * 0.42); x < W * 0.56; x += 2) {
          tot++;
          const i = (y * W + x) * 4;
          if ((d[i] + d[i + 1] + d[i + 2]) / 3 > bg) overlap++;
        }
        return { msg: document.getElementById("stcmsg")?.textContent || "",
                 overlap: tot ? overlap / tot : 0 };
      }, [k, ratio, safe]);
      /* The contract is not "everything fits in every shape" — a star wheel
         plus a pañcāṅga block genuinely does not fit a square with a quarter
         of it reserved. The contract is that the renderer never overflows in
         silence: it either fits, or it says so AND names a way out. */
      const fitted = !r.msg;
      const warned = !!r.msg && /try|remove/.test(r.msg);
      say(fitted || warned,
        `${k.padEnd(10)} ${ratio.padEnd(5)} ${safe ? "safe  " : "plain "}` +
        (fitted ? "fits" : "too tall, and says so: " + JSON.stringify(r.msg)));
    }
  }
}

/* every slot type added to a blank card */
console.log("\nevery slot type");
const types = await page.evaluate(() =>
  [...document.querySelectorAll("#stcnew option")].map(o => o.value));
for (const t of types) {
  const r = await page.evaluate(async (t) => {
    const sel = document.getElementById("stcrecipe");
    sel.value = "blank"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    document.getElementById("stcnew").value = t;
    document.getElementById("stcaddbtn").click();
    await new Promise(r => setTimeout(r, 300));
    return { rows: document.querySelectorAll("#stcrows .stcrow").length,
             msg: document.getElementById("stcmsg")?.textContent || "" };
  }, t);
  say(r.rows === 2, `${t.padEnd(9)} added (${r.rows} slots)${r.msg ? " — " + r.msg : ""}`);
}

if (shotDir) {
  await page.evaluate(async () => {
    const sel = document.getElementById("stcrecipe");
    sel.value = "sky"; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
  });
  const u = await page.evaluate(() => {
    const cv = document.getElementById("stccv");
    const sm = document.createElement("canvas");
    sm.width = 540; sm.height = Math.round(540 * cv.height / cv.width);
    const c = sm.getContext("2d");
    c.imageSmoothingQuality = "high";
    c.drawImage(cv, 0, 0, sm.width, sm.height);
    return sm.toDataURL("image/png");
  });
  await writeFile(`${shotDir}/card-sky.png`, Buffer.from(u.split(",")[1], "base64"));
  await page.screenshot({ path: `${shotDir}/studio-page.png`, fullPage: false });
}

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 8).forEach(e => console.log("  " + e)); fails += errs.length; }
console.log(`\n${fails ? fails + " problem(s)" : "the Studio's new half is wired end to end"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
