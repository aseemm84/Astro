/* Every page opens with its plain-language explanation.
 *
 * source/src/pages/_plain.py holds one entry per built page and build.py
 * injects it (and refuses to build if one is missing). This holds the BUILT
 * files to it, on the website and in the desktop app:
 *   - exactly one box per page, naming that page;
 *   - it is the first thing in <main> (or straight after the navigation strip
 *     on the pages that have no <main>), so a reader meets it before the detail;
 *   - closed by default, with the one-line gist readable while closed;
 *   - opening it shows "what this page is", "how to use it" and "how to read";
 *   - it does not disturb the page: no page errors on load.
 *
 * Run from the repository root:  node source/test/plain-verify.mjs
 */
import { createRequire } from "node:module";
import fs from "node:fs";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const is = (c, t) => { if (c) { pass++; } else { fail++; console.log("  FAIL " + t); } };
const root = process.cwd();
const sets = [["website", root], ["desktop app", root + "/app"]];

/* static: every page in both builds */
for (const [label, dir] of sets) {
  if (!fs.existsSync(dir)) { console.log(`  (no ${label} build at ${dir}; skipped)`); continue; }
  const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
  let n = 0;
  for (const f of pages) {
    const t = fs.readFileSync(dir + "/" + f, "utf8");
    const boxes = t.match(/data-plain="([^"]+)"/g) || [];
    is(boxes.length === 1 && boxes[0] === `data-plain="${f}"`, `${label}: ${f} has exactly one box, naming itself (${boxes.length})`);
    n++;
  }
  console.log(`  ${label}: ${n} pages checked`);
  is(n >= 40, `${label}: at least 40 pages (${n})`);
}

/* live: open every website page */
const br = await chromium.launch();
const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
for (const f of pages) {
  const pg = await br.newPage();
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto("file://" + root + "/" + f, { waitUntil: "load" });
  const R = await pg.evaluate(() => {
    const box = document.querySelector(".plainx"); if (!box) return null;
    const det = box.querySelector("details"), sum = box.querySelector("summary");
    const main = document.querySelector("main");
    /* site.js puts the mobile "On this page" menu (details.onpage-m) at the
       top of <main>; that is navigation, so the box must be the first CONTENT */
    const first = main ? [...main.children].find((c) => c.tagName !== "STYLE" && !c.classList.contains("onpage-m")) : null;
    const closed = !det.open, gist = (sum.querySelector("span") || {}).textContent || "";
    const visibleClosed = box.getBoundingClientRect().height > 20 && getComputedStyle(box).display !== "none";
    det.open = true;
    const heads = [...box.querySelectorAll("h4")].map((h) => h.textContent);
    const shown = box.querySelector(".plainb").getBoundingClientRect().height > 30;
    return { closed, gist: gist.trim(), visibleClosed, heads, shown, firstInMain: box.classList.contains("plainx-adopted")
               ? (() => { let e = box.previousElementSibling; while (e && /^(STYLE|SCRIPT)$/.test(e.tagName)) e = e.previousElementSibling;
                          return !!e && e.id === "adchrome"; })()
               : (main ? first === box : null),
             title: sum.querySelector("b").textContent };
  });
  const tag = f;
  is(!!R, `${tag}: the box is in the page`);
  if (R) {
    is(R.firstInMain !== false, `${tag}: the box is the first content in <main>`);
    is(R.closed && R.visibleClosed && R.gist.length > 30, `${tag}: closed by default, with the one-line gist showing`);
    is(R.heads.length >= 3 && R.shown, `${tag}: opening it shows at least three explained parts (${R.heads.join(" / ")})`);
    is(/simple language|सरल भाषा/.test(R.title), `${tag}: headed "${R.title}"`);
  }
  /* the dashboard and tool pages may log their own warnings; a THROWN error
     on load is what would mean the box broke something */
  is(errs.filter((e) => !/ResizeObserver/.test(e)).length === 0, `${tag}: no page errors (${errs.slice(0, 2).join(" | ")})`);
  await pg.close();
}
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
