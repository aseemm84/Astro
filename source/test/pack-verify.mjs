/* Does the Studio actually produce a usable day's posting?
 *
 *   node source/test/pack-verify.mjs
 *
 * The pack and the carousel both end in a .zip the reader drags into
 * Instagram, so the only check that means anything is whether that archive
 * opens and what is inside it. A ZIP written by hand can be subtly wrong —
 * a bad CRC, a wrong offset, a length that disagrees with its header — and
 * every one of those produces a file that looks fine until somebody opens it.
 *
 * This drives the real buttons, captures the downloads, and reports the
 * archive's contents. The companion python step opens them with a real unzip.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = process.argv[2] || "/tmp/nirayana-pack-test";
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
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e && e.message || e)));
let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };

await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "load" });
await page.waitForFunction(() => document.getElementById("stpackgo") &&
  document.querySelectorAll("#stcrows .stcrow").length > 0, { timeout: 60000 });

async function grab(selector, label, before) {
  const want = page.waitForEvent("download", { timeout: 120000 });
  if (before) await before();
  await page.click(selector);
  const d = await want;
  const p = join(OUT, d.suggestedFilename());
  await d.saveAs(p);
  console.log(`  ↓    ${label}: ${d.suggestedFilename()}`);
  return p;
}

/* A card is a canvas, so the page smoke test cannot read it: a slot holding
   "[object Object]" is drawn as cleanly as one holding a tithi. The text is
   checkable before it becomes pixels, and that is where to check it — this
   found "Vikrama [object Object]" on the cover of every pack. */
console.log("\nwhat the slots say, before they become pixels");
const slotText = await page.evaluate(async () => {
  const bad = [];
  const sel = document.getElementById("stcrecipe");
  const recipes = [...sel.options].map(o => o.value);
  for (const r of recipes) {
    sel.value = r; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(z => setTimeout(z, 220));
    document.querySelectorAll("#stcrows .stcrow").forEach(row => {
      row.querySelectorAll("input,textarea").forEach(el => {
        if (/\[object Object\]|undefined|NaN/.test(el.value))
          bad.push(r + ": " + el.value.slice(0, 60));
      });
    });
  }
  /* and the pack's own slides, which no recipe builds */
  if (window.__ncPackSlides) {
    window.__ncPackSlides().forEach(sl => sl.slots.forEach(s2 => {
      const v = [s2.text, s2.size].filter(Boolean).join(" ");
      if (/\[object Object\]|undefined|NaN/.test(v)) bad.push("pack/" + sl.name + ": " + v.slice(0, 60));
    }));
  }
  return bad;
});
say(slotText.length === 0,
  slotText.length ? `slots holding a hole: ${JSON.stringify(slotText.slice(0, 3))}`
                  : "no recipe or pack slide holds [object Object], undefined or NaN");

console.log("\nthe day's pack");
await grab("#stpackgo", "pack");

console.log("\na three-slide carousel");
await grab("#stczip", "carousel", async () => {
  await page.selectOption("#stcrecipe", "panchanga");
  await page.waitForTimeout(400);
  await page.click("#stcaddslide"); await page.waitForTimeout(200);
  await page.click("#stcaddslide"); await page.waitForTimeout(400);
  const n = await page.evaluate(() => document.querySelectorAll("[data-slide]").length);
  say(n === 3, `three slides in the strip (${n})`);
});

console.log("\nthe same card in all three shapes");
await grab("#stcall", "all shapes");

console.log("\nthe month plan");
await page.click("#stplango");
await page.waitForFunction(
  () => document.querySelectorAll("#stplan tbody tr").length > 0, { timeout: 120000 });
const plan = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("#stplan tbody tr")];
  return { n: rows.length,
           first: rows[0]?.innerText.replace(/\s+/g, " ").trim(),
           hooks: new Set(rows.map(r => r.children[3]?.innerText)).size,
           reels: rows.filter(r => r.querySelector("a")).length };
});
say(plan.n === 30, `thirty days planned (${plan.n})`);
say(plan.hooks >= 5, `${plan.hooks} distinct hooks across the month — not the same card thirty times`);
console.log(`       first row: ${plan.first}`);
say(plan.reels > 0, `${plan.reels} of the days come with a matching reel link`);
/* The ranker is given two days of past events so yesterday's ingress can still
   lead today's post. It had no way to SAY "yesterday", so those arrived as
   "in -1 days" — on the live page, not only here. */
const neg = await page.evaluate(() =>
  [...document.querySelectorAll("#stplan tbody tr")]
    .map(r => r.innerText).filter(t => /-\d+ days|in -/.test(t)));
say(neg.length === 0,
  `no row counts the days backwards${neg.length ? ": " + JSON.stringify(neg[0]) : ""}`);
const past = await page.evaluate(() =>
  [...document.querySelectorAll("#stplan tbody tr")]
    .map(r => r.innerText).filter(t => /yesterday|days ago/.test(t)).length);
console.log(`       ${past} rows lead with something that already happened, said as past`);

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 5).forEach(e => console.log("  " + e)); fails += errs.length; }
console.log(`\narchives written to ${OUT}`);
console.log(fails ? `\n${fails} check(s) failed` : "\nthe Studio produced every archive it offers");
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
