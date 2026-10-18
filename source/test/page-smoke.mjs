/* Does any page render a hole where a value should be?
 *
 *   node source/test/page-smoke.mjs
 *
 * WHY THIS EXISTS. The now page printed its Hindu clock as "31:38:undefined"
 * to every reader for a week. The display had been taught to show the vipala
 * column; the function that builds the clock on that page — a private copy of
 * one that lives elsewhere — had not. Nothing threw, no test failed, the build
 * was clean, and the page looked finished apart from one word.
 *
 * That is a whole class: a field read that was never written, a lookup key
 * printed instead of its string, a number that came out NaN. Every one of them
 * reaches the reader as text, and text is therefore where to look for them. So
 * this loads each page, lets it settle, and reads what a person would actually
 * see.
 *
 * It deliberately checks the RENDERED TEXT rather than the source: a page can
 * be built from perfectly good files and still assemble them into nonsense.
 */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
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

/* Every built page, found rather than listed — a page added without being
   added here would otherwise be the one page never checked. */
const pages = (await readdir(ROOT)).filter(f => f.endsWith(".html"))
  .filter(f => f !== "404.html")
  .sort();

/* The marks of a hole — and the reason each is written the way it is.

   "undefined" matters only in a VALUE POSITION: after a colon, beside a digit,
   or alone on its line. This site's own prose contains the sentence "outside it
   the drift is undefined", which is correct English and not a fault, and a
   plain word match flagged it. A checker that cries wolf on good prose is one
   that gets switched off, so the pattern has to know a word from a hole. The
   real bug read "31:38:undefined" — a colon. */
const VAL = String.raw`(?:^|[\d:,;=/|(\[]\s*|\s[–—-]\s)`;
const HOLES = [
  { re: new RegExp(VAL + String.raw`undefined\b`, "m"),
    why: "a field read that was never written" },
  { re: new RegExp(VAL + String.raw`NaN\b`, "m"),
    why: "arithmetic on something that was not a number" },
  { re: /\[object Object\]/, why: "an object where a string was wanted" },
  { re: new RegExp(VAL + String.raw`null\b`, "m"),
    why: "a null printed as text" },
  { re: /\{\{[A-Z_]+\}\}/,   why: "an unreplaced build placeholder" },
  { re: /�/,            why: "a character the encoding could not carry" }
];

const browser = await chromium.launch();
let fails = 0, checked = 0;
console.log(`\nreading the rendered text of ${pages.length} pages\n`);

for (const f of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on("pageerror", e => errs.push(String(e && e.message || e)));
  try {
    await page.goto(`http://127.0.0.1:${port}/${f}`, { waitUntil: "load", timeout: 45000 });
    /* Pages that compute something fill themselves in after load, so settle
       rather than reading an empty shell and calling it clean. */
    await page.waitForTimeout(f === "kundli.html" || f === "dashboard.html" ? 2500 : 1600);
    /* The nav is the same two hundred characters on every page, so measuring
       the whole body hides a page that renders nothing of its own. <main> is
       the page's own contribution. */
    const text = await page.evaluate(() =>
      (document.querySelector("main") || document.body).innerText);
    checked++;
    const found = HOLES.filter(h => h.re.test(text));
    /* A page that renders almost nothing of its own has usually failed to
       build itself, which looks exactly like a page with nothing to say. The
       floor is low: the dashboard legitimately shows one line until a chart
       file is dropped on it, and that is a working page, not a broken one. */
    if (text.length < 60)
      found.push({ re: /x^/, why: `only ${text.length} characters of text — did it build?` });
    if (!found.length && !errs.length) {
      console.log(`  ok   ${f.padEnd(26)} ${text.length.toLocaleString()} chars`);
    } else {
      fails++;
      console.log(`  FAIL ${f.padEnd(26)}`);
      found.forEach(h => {
        const m = text.match(new RegExp(`.{0,45}${h.re.source}.{0,45}`, h.re.flags.replace("g", "")));
        console.log(`         ${h.why}: …${(m ? m[0] : "").replace(/\n/g, " ")}…`);
      });
      errs.slice(0, 2).forEach(e => console.log(`         threw: ${e.slice(0, 110)}`));
    }
  } catch (e) {
    fails++; checked++;
    console.log(`  FAIL ${f.padEnd(26)} ${String(e).slice(0, 90)}`);
  }
  await page.close();
}
console.log(`\n${fails ? fails + " of " + checked + " pages render a hole"
                       : checked + " pages render no holes, no thrown errors"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
