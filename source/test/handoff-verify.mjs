/* The app's two hand-off buttons, checked by using them.
 *
 * Both were reported dead in the desktop app, and both were. Print called
 * window.print(), which in that webview raises no dialog and throws nothing —
 * no result and no error, so the button simply did nothing. The dashboard
 * link was target="_blank", and a wrapper with no tabs opens no tab; pointed
 * at the same window instead, it worked but was not what was asked for.
 *
 * Neither can be solved by handing a URL to an external browser, because the
 * chart cannot travel with it: localStorage is per-origin and a browser
 * opening a file is a different origin, a full export is far too large for a
 * URL fragment, and writing a temp file would need the filesystem and shell
 * capabilities this build deliberately does not have.
 *
 * So each writes ONE self-contained file. This drives both buttons, saves
 * what they produce, opens each FROM DISK in a fresh context with no server
 * and no app around it, and requires that it renders with the chart already
 * in it and nothing missing. A file that only works while the app is running
 * would pass a smaller check and fail the reader.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { join, extname } from "node:path";
const { createRequire } = await import("node:module");
const { chromium } = createRequire(import.meta.url)("playwright");

const APP = join(process.cwd(), "app");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
                ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };
/* served over http, because that is what the app's own scheme behaves like —
   from file:// the page cannot read its own bundle and neither can the app's
   dashboard hand-off, which is the whole mechanism under test */
const server = createServer(async (q, r) => {
  try {
    const f = join(APP, decodeURIComponent((q.url || "/").split("?")[0]));
    const body = await readFile(f);
    r.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
    r.end(body);
  } catch { r.writeHead(404).end("not found"); }
});
const port = await new Promise(r => server.listen(0, "127.0.0.1", () => r(server.address().port)));

let pass = 0, fail = 0;
function head(t){ console.log("\n" + t); }
function is(c, t){ if (c) { pass++; console.log("  ok   " + t); }
                   else { fail++; console.log("  FAIL " + t); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });

await page.goto(`http://127.0.0.1:${port}/kundli.html`);
await page.waitForFunction(() => !!document.getElementById("k-go"), null, { timeout: 25000 });

head("The app build knows it is the app");
is(await page.evaluate(() => !!window.__isApp), "__isApp is set, so the two buttons take the app's path");

await page.evaluate(() => {
  try { localStorage.removeItem("nirayana.birth"); } catch (e) {}
  document.getElementById("k-name").value = "Aseem";
  document.getElementById("k-dob").value = "1984-12-15";
  document.getElementById("k-tob").value = "13:31";
  document.getElementById("k-lat").value = "28.8389";
  document.getElementById("k-lon").value = "78.7768";
  document.getElementById("k-tz").value = "5.5";
});
await page.click("#k-go");
await page.waitForFunction(() => !!document.getElementById("kreport"), null, { timeout: 40000 });
await page.evaluate(() => { const o = document.querySelector(".castover"); if (o) o.remove(); });
await page.click('[data-ktab="full"]');
await page.waitForTimeout(500);

head("The labels describe what the app will actually do");
const labels = await page.evaluate(() => [
  document.querySelector("[data-krprint]").textContent,
  document.querySelector("[data-kdash]").textContent]);
is(/Save the full report/.test(labels[0]),
   "Print reads “" + labels[0].trim() + "”, not “Print”, because it writes a file");
is(/Save the visual dashboard/.test(labels[1]),
   "the dashboard says it is being saved for a browser, not opened here");
is(await page.evaluate(() => document.querySelector("[data-kdash]").target !== "_blank"),
   "and it no longer carries target=\"_blank\", which opened nothing");

async function grab(selector, name) {
  const w = page.waitForEvent("download", { timeout: 90000 });
  await page.click(selector);
  const dl = await w;
  const out = "/tmp/hv-" + name + ".html";
  await dl.saveAs(out);
  return { file: out, name: dl.suggestedFilename(), size: statSync(out).size };
}

head("Both buttons produce a file");
const dash = await grab("[data-kdash]", "dash");
is(/dashboard\.html$/.test(dash.name) && dash.size > 300000,
   "the dashboard saves as " + dash.name + " (" + Math.round(dash.size / 1024) + " KB)");
is(/aseem/.test(dash.name), "named after the chart, so two charts do not overwrite each other");
const note = await page.evaluate(() => (document.querySelector(".kappnote") || {}).innerText || "");
is(/Downloads/.test(note), "and says on the page where it went, rather than in an alert");
const pr = await grab("[data-krprint]", "print");
is(/full-report\.html$/.test(pr.name) && pr.size > 200000,
   "the report saves as " + pr.name + " (" + Math.round(pr.size / 1024) + " KB)");
is(errs.length === 0, "no errors while building either" + (errs.length ? " — " + errs[0].slice(0, 120) : ""));

head("And each file works opened cold from disk, with no app and no server");
for (const [f, label, want] of [[dash.file, "dashboard", 20000], [pr.file, "full report", 50000]]) {
  const q = await ctx.newPage();
  const e2 = [];
  q.on("pageerror", x => e2.push(x.message));
  q.on("console", m => { if (m.type() === "error") e2.push("console: " + m.text()); });
  q.on("requestfailed", r => e2.push("missing: " + r.url().split("/").pop()));
  await q.goto("file://" + f);
  await q.waitForTimeout(3500);
  const r = await q.evaluate(() => ({
    len: (document.body.innerText || "").length,
    draws: document.querySelectorAll("svg,canvas").length,
    asks: /drop a file|choose a file|Export the chart/i.test(document.body.innerText || ""),
    named: /Aseem/.test(document.body.innerText || "")
  }));
  is(r.len > want, label + ": " + r.len.toLocaleString() + " characters of visible text");
  is(r.draws > 20, label + ": " + r.draws + " charts drawn");
  is(!r.asks, label + ": does not ask for a chart file — the chart is already in it");
  is(r.named, label + ": and it is the right chart");
  is(e2.length === 0, label + ": nothing missing, no errors" +
     (e2.length ? " — " + e2.slice(0, 2).join("; ") : ""));
  await q.close();
}

await browser.close();
server.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
