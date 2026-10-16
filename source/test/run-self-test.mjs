/* Headless runner for test/self-test.html.
 *
 *   node source/test/run-self-test.mjs            run against the built site
 *   node source/test/run-self-test.mjs --keep     leave the browser open on failure
 *
 * WHY THIS EXISTS. The suite is three hundred-odd checks that only ever ran when
 * somebody remembered to open a page and press a button, which means in practice
 * it ran when something had already gone wrong. Driving it from the command line
 * makes it a thing you run after every change instead, and makes it something a
 * workflow can run on its own.
 *
 * It is a BUILD-MACHINE tool and no part of the site. The site itself needs no
 * toolchain, no server and no network; this file is how the site gets checked,
 * not how it runs. The server below exists only because an iframe loading
 * kundli.html from file:// is a cross-origin frame the suite cannot read.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".svg": "image/svg+xml",
                ".png": "image/png", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const path = join(ROOT, normalize(url).replace(/^(\.\.[/\\])+/, ""));
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

const port = await new Promise(r => server.listen(0, "127.0.0.1", () => r(server.address().port)));
const base = `http://127.0.0.1:${port}`;

/* Resolve playwright by either mechanism. An ESM import only searches node_modules
   up from this file; a global install sits on the CommonJS path instead, which ESM
   does not honour. Trying both means the runner works from a project install and
   from a global one without the caller needing to know which they have. */
let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  try {
    const { createRequire } = await import("node:module");
    ({ chromium } = createRequire(import.meta.url)("playwright"));
  } catch {
    console.error("playwright is not installed on this machine.\n" +
                  "  npm i -D playwright   (the site needs neither; this runner does)");
    server.close(); process.exit(2);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* Any uncaught error in the page is a failure even if every check passes: the
   suite reports what it asked about, and a thrown exception is the thing it did
   not think to ask about. */
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e && e.message || e)));
page.on("console", m => { if (m.type() === "error") pageErrors.push("console: " + m.text()); });

await page.goto(`${base}/test/self-test.html`, { waitUntil: "load" });
await page.click("#run");
await page.waitForFunction(
  () => { const s = document.getElementById("status"); return s && /^(Done\.|Stopped:)/.test(s.textContent); },
  null, { timeout: 180000 });

const out = await page.evaluate(() => ({
  status: document.getElementById("status").textContent,
  rows: (window.results || []).filter(r => r.name)
                              .map(r => ({ name: r.name, pass: !!r.pass, detail: r.detail || "" }))
}));

const failed = out.rows.filter(r => !r.pass);
for (const f of failed) console.log("  FAIL  " + f.name + (f.detail ? "  — " + f.detail : ""));
for (const e of pageErrors) console.log("  ERROR " + e);
console.log(`\n${out.rows.length - failed.length}/${out.rows.length} checks passed  (${out.status})`);
if (pageErrors.length) console.log(`${pageErrors.length} uncaught page error(s)`);

const ok = failed.length === 0 && pageErrors.length === 0 && out.status === "Done.";
if (!ok && process.argv.includes("--keep")) { console.log("\n--keep: browser left open"); await new Promise(() => {}); }
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
