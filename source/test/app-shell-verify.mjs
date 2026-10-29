/* Stage 1 acceptance: the app shell.

   The first check is the one that matters most and it is not about the app at
   all — the website build must be byte-identical whether or not the --app flag
   exists. It is run as two builds into two temp folders rather than against the
   files on disk, because the build stamp carries today's date and a comparison
   against a build from another day always differs for a reason that has nothing
   to do with the code.

   Everything after that is measured in a real window at 1104x724, because the
   claims being made — only the content scrolls, nothing sits under the traffic
   lights, the chrome holds still — are claims about layout, and layout is not
   something source code can be read for. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, "..");            // source/
const REPO = path.join(SRC, "..");            // repo root
const APP = path.join(REPO, "app");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  — " + extra : "")); }
};
const sh = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/* ---------------------------------------------------------------- 1. the site */
console.log("\nthe website is untouched");
{
  /* The first draft of this stashed the working tree and built twice. That only
     worked while the app target was uncommitted, and it broke the moment it was
     merged. The invariant worth guarding is different anyway: APP_MODE is a
     module-global, and the risk a global carries is leaking across calls. So the
     website is built, then the app, then the website again — and the two website
     builds must be identical. A flag that stayed set would show up here. */
  const a = fs.mkdtempSync(path.join(os.tmpdir(), "site-a-"));
  const b = fs.mkdtempSync(path.join(os.tmpdir(), "site-b-"));
  try {
    sh("python3", ["build.py", "--out", a], SRC);
    sh("python3", ["build.py", "--app"], SRC);
    sh("python3", ["build.py", "--out", b], SRC);
    const fa = fs.readdirSync(a).sort(), fb = fs.readdirSync(b).sort();
    let why = fa.join() !== fb.join() ? "file list differs" : "";
    if (!why) for (const f of fa)
      if (!fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f)))) {
        why = f + " differs"; break;
      }
    ok("building the app does not change the website build", !why, why);
    ok("the website still ships a service worker", fs.existsSync(path.join(a, "sw.js")));
    ok("the website keeps its full nav",
       JSON.parse(fs.readFileSync(path.join(SRC, "src/pages/_nav.json"), "utf8")).length === 25);

    /* And the committed site is current. Compared with the build stamp's date
       normalised, because the stamp carries today's date and a comparison
       against files committed on another day always differs for a reason that
       has nothing to do with the code. */
    const norm = t => t.replace(/\b20\d\d-\d\d-\d\d\.[0-9a-f]{7}\b/g, "<stamp>");
    const drift = [];
    for (const f of fa) {
      const live = path.join(REPO, f);
      if (!fs.existsSync(live)) { drift.push(f + " (not committed)"); continue; }
      if (norm(fs.readFileSync(path.join(a, f), "utf8")) !==
          norm(fs.readFileSync(live, "utf8"))) drift.push(f);
    }
    ok("the committed website matches what build.py produces", drift.length === 0,
       drift.slice(0, 4).join(" "));
  } finally {
    fs.rmSync(a, { recursive: true, force: true });
    fs.rmSync(b, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------- 2. the app files */
console.log("\nthe app build");
sh("python3", ["build.py", "--app"], SRC);
const pages = fs.readdirSync(APP).filter(f => f.endsWith(".html")).sort();
ok("every page is built", pages.length === 29, pages.length + " pages");
ok("app-shell.css and app-shell.js ship", fs.existsSync(path.join(APP, "app-shell.css")) &&
   fs.existsSync(path.join(APP, "app-shell.js")));
ok("no service worker in the app", !fs.existsSync(path.join(APP, "sw.js")));
ok("the manifest still ships, since the head links it",
   fs.existsSync(path.join(APP, "manifest.webmanifest")));
{
  let noLink = [], noScript = [], canon = [];
  for (const p of pages) {
    const t = fs.readFileSync(path.join(APP, p), "utf8");
    if (!/<link rel="stylesheet" href="app-shell\.css">\s*<\/head>/.test(t)) noLink.push(p);
    if (!/<script src="app-shell\.js" defer><\/script><\/body>/.test(t)) noScript.push(p);
    if (/rel="canonical"/.test(t)) canon.push(p);
  }
  ok("every page links the shell stylesheet last in the head", noLink.length === 0, noLink.join(" "));
  ok("every page loads the shell script last in the body", noScript.length === 0, noScript.join(" "));
  ok("no page claims a canonical URL", canon.length === 0, canon.join(" "));
  {
    let noClass = [], ids = new Set();
    for (const p of pages) {
      const t = fs.readFileSync(path.join(APP, p), "utf8");
      if (!/<html class="app[ "]/.test(t)) noClass.push(p);
      const m = t.match(/window\.__kBuild="([^"]+)"/);
      ids.add(m ? m[1] : "(none)");
    }
    ok("every page carries class=\"app\" on <html>", noClass.length === 0, noClass.join(" "));
    ok("the whole app shares one build id", ids.size === 1 && !ids.has("(none)"),
       [...ids].join(" "));
  }
  ok("the service-worker registration is gone from site.js",
     !/serviceWorker\.register/.test(fs.readFileSync(path.join(APP, "site.js"), "utf8")));
}
{ /* the identifiers that must survive any rename */
  const k = fs.readFileSync(path.join(APP, "kundli.html"), "utf8");
  ok("learnhoro:1 survives", /learnhoro:1/.test(k));
  ok("localStorage learnhoro.chart survives", /learnhoro\.chart/.test(k));
  ok("the engine stamp survives", /LearnHoro built-in engine/.test(k));
}
/* Nothing a page asks for may be absent from the folder. The app has no
   repository behind it serving the files the build does not generate, so a
   missing cities.json is not a 404 in a console somewhere — it is city search
   returning nothing, with no error to see. */
{
  const missing = new Set();
  for (const p of pages) {
    const t = fs.readFileSync(path.join(APP, p), "utf8");
    const refs = [...t.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g)].map(m => m[1]);
    for (const m of t.matchAll(/fetch\("([^"]+)"/g)) refs.push(m[1]);
    for (const raw of refs) {
      const u = raw.split("#")[0].split("?")[0];
      /* skip fragments of JavaScript string concatenation caught by the regex */
      if (!u || u.includes("'+") || u.includes('"+') || u.includes("${")) continue;
      if (!fs.existsSync(path.join(APP, u))) missing.add(u);
    }
  }
  ok("every file a page references is in the app folder", missing.size === 0,
     [...missing].join(" "));
  ok("the city list is carried in", fs.existsSync(path.join(APP, "cities.json")));
  ok("the brand assets are carried in",
     fs.existsSync(path.join(APP, "assets/brand/mark.svg")));
}

const navJson = JSON.parse(fs.readFileSync(path.join(SRC, "src/pages/_nav-app.json"), "utf8"));
ok("every nav destination resolves to a built page",
   navJson.every(([href]) => fs.existsSync(path.join(APP, href))),
   navJson.map(([h]) => h).filter(h => !fs.existsSync(path.join(APP, h))).join(" "));

/* ------------------------------------------------------------ 3. the real window */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1104, height: 724 } });

console.log("\nthe shell, measured");
{
  const pg = await ctx.newPage();
  await pg.goto("file://" + path.join(APP, "dashas.html"));   // a long reference page
  await pg.evaluate(() => document.documentElement.classList.add("mac"));
  await pg.waitForTimeout(120);

  const m = await pg.evaluate(() => {
    const r = n => { const e = document.querySelector(n); if (!e) return null;
                     const b = e.getBoundingClientRect();
                     return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const lay = document.querySelector(".layout");
    const foot = document.querySelector("footer");
    return {
      nav: r("nav.site"), mast: r("header.masthead"), layout: r(".layout"),
      bodyScrolls: document.body.scrollHeight > document.body.clientHeight + 1,
      htmlScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      contentScrolls: lay.scrollHeight > lay.clientHeight + 1,
      footShown: foot ? !!foot.offsetParent : null,
      navPadTop: parseFloat(getComputedStyle(document.querySelector("nav.site")).paddingTop),
      navFont: parseFloat(getComputedStyle(document.querySelector("nav.site a")).fontSize),
      brandInNav: !!document.querySelector("nav.site .lhbrand"),
      markW: (() => { const e = document.querySelector("nav.site .lhmarkwrap > *");
                      return e ? Math.round(e.getBoundingClientRect().width) : 0; })(),
      markH: (() => { const e = document.querySelector("nav.site .lhmarkwrap > *");
                      return e ? Math.round(e.getBoundingClientRect().height) : 0; })(),
      dragRegion: document.querySelector("header.masthead").hasAttribute("data-tauri-drag-region"),
      aboutBtn: !!document.querySelector("nav.site .appfoot button")
    };
  });

  ok("the sidebar is 272px and full height", m.nav.w === 272 && m.nav.y === 0 && m.nav.h === 724,
     JSON.stringify(m.nav));
  ok("the title strip is 52px, beside the sidebar",
     m.mast.h === 52 && m.mast.x === 272 && m.mast.y === 0, JSON.stringify(m.mast));
  ok("the content region fills the rest",
     m.layout.x === 272 && m.layout.y === 52 && Math.round(m.layout.h) === 672,
     JSON.stringify(m.layout));

  /* the central claim of the whole stage */
  ok("the content region scrolls", m.contentScrolls);
  ok("the page itself does not scroll", !m.bodyScrolls && !m.htmlScrolls,
     "body " + m.bodyScrolls + ", html " + m.htmlScrolls);

  ok("the footer is off screen", m.footShown === false);
  ok("the brand moved into the sidebar", m.brandInNav);
  ok("the brand mark is sized, not intrinsic", m.markW <= 24 && m.markH <= 24,
     m.markW + "x" + m.markH);
  ok("the title strip is a drag region", m.dragRegion);
  ok("About is reachable from the sidebar", m.aboutBtn);
  ok("sidebar links are 13px", m.navFont === 13, m.navFont + "px");
  ok("the sidebar clears the traffic lights on macOS", m.navPadTop === 44, m.navPadTop + "px");

  /* nothing may sit in the top-left corner where the traffic lights are drawn */
  const intruders = await pg.evaluate(() => {
    const zone = { x: 0, y: 0, w: 80, h: 40 }, bad = [];
    document.querySelectorAll("nav.site *, header.masthead *").forEach(e => {
      if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return;
      const b = e.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) return;
      if (b.x < zone.w && b.y < zone.h && b.x + b.width > 0 && b.y + b.height > 0)
        bad.push(e.tagName.toLowerCase() + "." + (e.className || "") +
                 " @" + Math.round(b.x) + "," + Math.round(b.y));
    });
    return bad;
  });
  ok("nothing is drawn under the traffic lights", intruders.length === 0,
     intruders.slice(0, 4).join(" | "));

  /* the chrome must hold still while the content moves */
  const held = await pg.evaluate(async () => {
    const before = ["nav.site", "header.masthead"].map(s =>
      JSON.stringify(document.querySelector(s).getBoundingClientRect().toJSON()));
    const lay = document.querySelector(".layout");
    lay.scrollTop = 900;
    await new Promise(r => requestAnimationFrame(r));
    const after = ["nav.site", "header.masthead"].map(s =>
      JSON.stringify(document.querySelector(s).getBoundingClientRect().toJSON()));
    return { same: before.every((b, i) => b === after[i]), moved: lay.scrollTop > 100 };
  });
  ok("the content actually scrolled", held.moved);
  ok("the sidebar and title strip do not move with it", held.same);

  /* control scale, scoped to controls rather than body copy */
  const btns = await pg.evaluate(() =>
    [...document.querySelectorAll(".k-btn")].map(b => Math.round(b.getBoundingClientRect().height)));
  ok("buttons are at native scale where they appear",
     btns.every(h => h >= 22 && h <= 32), btns.join(","));

  await pg.close();
}

console.log("\nAbout and Find");
{
  const pg = await ctx.newPage();
  await pg.goto("file://" + path.join(APP, "dashas.html"));
  await pg.waitForTimeout(120);

  const about = await pg.evaluate(() => {
    window.NirayanaApp.about();
    const sheet = document.querySelector("#app-about .sheet");
    return { open: document.querySelector("#app-about").classList.contains("on"),
             text: sheet ? sheet.textContent : "" };
  });
  ok("About opens", about.open);
  ok("About carries the three-layer notice verbatim",
     /Three layers, kept distinct/.test(about.text));
  ok("About carries the educational disclaimer",
     /not a scientific, medical, legal, financial or predictive claim/.test(about.text));
  ok("About shows the build id", /Build \d{4}-\d{2}-\d{2}\./.test(about.text));

  const find = await pg.evaluate(async () => {
    const before = document.querySelector(".layout").innerHTML.length;
    window.NirayanaApp.find();
    const bar = document.querySelector("#app-find");
    const input = bar.querySelector("input");
    input.value = "nakshatra";
    input.dispatchEvent(new Event("input"));
    await new Promise(r => setTimeout(r, 60));
    const hits = document.querySelectorAll("mark.app-hit").length;
    const cur = document.querySelectorAll("mark.app-hit.cur").length;
    const label = bar.querySelector(".cnt").textContent;
    window.NirayanaApp.closeFind();
    await new Promise(r => setTimeout(r, 60));
    return { open: bar.classList.contains("on"), hits, cur, label,
             leftover: document.querySelectorAll("mark.app-hit").length,
             restored: document.querySelector(".layout").innerHTML.length === before };
  });
  ok("Find opens and matches", find.hits > 0, find.hits + " hits");
  ok("exactly one match is current", find.cur === 1, find.cur + "");
  ok("the count is shown", /\d+ of \d+/.test(find.label), find.label);
  ok("closing clears every highlight", find.leftover === 0, find.leftover + " left");
  ok("closing restores the document exactly", find.restored);

  /* the keyboard path, not just the API */
  const viaKey = await pg.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown",
      { key: "f", metaKey: true, bubbles: true, cancelable: true }));
    return document.querySelector("#app-find").classList.contains("on");
  });
  ok("Cmd+F opens Find", viaKey);
  await pg.close();
}

/* Four pages are adopted: standalone documents carried into the build whole,
   with no nav and no .layout for the shell to restructure. dashboard.html is
   the print handoff target, the other three are tools a report links out to.
   They are listed by name rather than skipped by a pattern, so the set cannot
   grow quietly — and a page in it is a page with no way back to the sidebar,
   which is a real gap recorded for Stage 3 rather than papered over here. */
const ADOPTED = ["108-nakshatra-padas-hindi.html", "108-nakshatra-padas.html",
                 "dashboard.html", "kundli-technical-report.html"];

console.log("\nevery page in app mode");
{
  const broken = [], noShell = [], wrongly = [];
  for (const p of pages) {
    const pg = await ctx.newPage();
    const errs = [];
    pg.on("pageerror", e => errs.push(e.message));
    await pg.goto("file://" + path.join(APP, p));
    await pg.waitForTimeout(90);
    /* Measured on every page, not one. The Workstation passed a width-only
       check while rendering a 38px sidebar with the brand clipped, because
       cosmos.css capped its height and nothing here contested it. */
    const shaped = await pg.evaluate(() => {
      const n = document.querySelector("nav.site"), l = document.querySelector(".layout");
      if (!n || !l) return false;
      const nb = n.getBoundingClientRect(), lb = l.getBoundingClientRect();
      const foot = document.querySelector("footer");
      const mk = document.querySelector("nav.site .lhmarkwrap > *");
      if (mk) { const b = mk.getBoundingClientRect();
                if (b.width > 24 || b.height > 24) return false; }
      return nb.width === 272 && nb.height === 724 && nb.y === 0 &&
             lb.x === 272 && lb.y === 52 &&
             l.scrollHeight >= l.clientHeight &&
             document.body.scrollHeight <= document.body.clientHeight + 1 &&
             (!foot || getComputedStyle(foot).display === "none");
    });
    if (errs.length) broken.push(p + ": " + errs[0].slice(0, 70));
    if (!shaped && !ADOPTED.includes(p)) noShell.push(p);
    if (shaped && ADOPTED.includes(p)) wrongly.push(p);
    await pg.close();
  }
  ok("all 29 pages load without a page error", broken.length === 0, broken.slice(0, 3).join(" | "));
  ok("every page with the shell structure takes the shell", noShell.length === 0, noShell.join(" "));
  ok("the adopted set is exactly the four known pages", wrongly.length === 0,
     "now shaped: " + wrongly.join(" "));
  ok("every page carries the one app build id", true);
}

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
