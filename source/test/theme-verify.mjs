/* ===== The four themes, measured ==========================================

   WHY THIS IS A MEASUREMENT AND NOT A LOOK. The site's two stylesheets
   carry some six hundred and sixty literal colours. A theme redefines the
   tokens and overrides the surfaces it knows about, and the question that
   matters is the one nobody can answer by reading CSS: after all that, is
   there any text left on the page that cannot be read?

   So this walks every page in every theme, reads the COMPUTED colour and
   the computed background of every text node that actually renders, climbs
   to the nearest ancestor that paints a background (because that is what
   the text is really sitting on), and computes the WCAG contrast ratio. A
   theme that leaves a single label at 1.1:1 — black on near-black, the
   classic failure of a dark palette bolted onto a light stylesheet — fails
   here with the selector named, which is the only way to find it other than
   opening forty pages by hand.

   The bar is 4.5:1 for body text and 3:1 for large text, which is the WCAG
   AA line. The default (no theme) is measured too, as the control: if the
   untouched site fails a check, the check is wrong, not the site. */

import { readdirSync } from "node:fs";
import { createRequire } from "node:module";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const ROOT = "file://" + process.cwd() + "/";
/* every built page, so a theme cannot be right on the pages someone
   remembered to look at and wrong on the rest */
const PAGES = readdirSync(process.cwd())
  .filter((f) => f.endsWith(".html") && f !== "404.html")
  .sort();
const THEMES = ["", "midnight", "peetambari", "paper", "emerald"];

const br = await chromium.launch();
const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));

/* ---- the measurement, run inside the page ------------------------------ */
const AUDIT = () => {
  function parse(c) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3],
             a: m[4] === undefined ? 1 : +m[4] };
  }
  function lin(v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function lum(c) {
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  }
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /* A gradient has no backgroundColor, so climbing past it compares white
     text against the white body underneath and reports 1:1 on a masthead
     that is obviously legible. That was this harness's own first bug. The
     fix is not to skip gradients but to pull their colour stops out of
     background-image and judge the text against the WORST of them, which
     is stricter than judging it against an average and needs no
     screenshot. A gradient whose stops cannot be parsed is counted and
     reported rather than guessed at. */
  /* CSS paints background layers front to back, so the LAST comma-separated
     layer is the one underneath everything. The site's masthead is a stack
     of five 1px white radial dots — stars — over a dark linear gradient.
     Collecting stops from every layer therefore finds #fff and judges white
     masthead text against a star, which is how this harness first reported
     a perfectly legible headline at 1:1. Only the bottom layer is the
     surface; a 1px dot is not what a word sits on. */
  function bottomLayer(img) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < img.length; i++) {
      const c = img[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === "," && depth === 0) { parts.push(img.slice(start, i)); start = i + 1; }
    }
    parts.push(img.slice(start));
    return parts[parts.length - 1];
  }
  function stops(img) {
    const out = [];
    const re = /#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g;
    let m;
    img = bottomLayer(img);
    while ((m = re.exec(img))) {
      const t = m[0];
      if (t[0] === "#") {
        let h = t.slice(1);
        if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
        if (h.length >= 6)
          out.push({ r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16),
                     b: parseInt(h.slice(4,6),16), a: 1 });
      } else {
        const c = parse(t);
        /* a transparent stop is the layer beneath showing through, not a
           colour the text sits on */
        if (c && c.a > 0.85) out.push(c);
      }
    }
    return out;
  }
  /* what the text is actually sitting on: the first ancestor that paints
     anything opaque. A transparent div over a dark body is not a white
     box, and treating it as one is how false failures happen. Returns a
     LIST, because a gradient is several colours and all of them count. */
  function backdrop(el) {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const img = cs.backgroundImage;
      if (img && img !== "none") {
        const s = stops(img);
        const bg = parse(cs.backgroundColor);
        if (bg && bg.a > 0.85) s.push(bg);
        if (s.length) return s;
        return null;            /* opaque but unreadable: not guessed at */
      }
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0.85) return [bg];
      n = n.parentElement;
    }
    const b = parse(getComputedStyle(document.body).backgroundColor);
    return [b && b.a > 0.85 ? b : { r: 255, g: 255, b: 255, a: 1 }];
  }
  function sel(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    if (el.className && typeof el.className === "string")
      s += "." + el.className.trim().split(/\s+/).slice(0, 2).join(".");
    return s;
  }

  const bad = [];
  let seen = 0, skipped = 0;
  const all = document.querySelectorAll("body *");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    /* only elements with their own visible text, so a wrapper is not
       judged on its children's words */
    let own = "";
    for (let k = 0; k < el.childNodes.length; k++)
      if (el.childNodes[k].nodeType === 3) own += el.childNodes[k].nodeValue;
    own = own.trim();
    if (own.length < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (+cs.opacity < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.3) continue;
    seen++;
    const size = parseFloat(cs.fontSize) || 16;
    const bold = (+cs.fontWeight || 400) >= 700;
    /* WCAG: 18.66px bold or 24px counts as large text */
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const back = backdrop(el);
    if (!back) { skipped++; continue; }
    /* the worst stop decides: text must be readable everywhere the
       gradient goes, not on average */
    let got = 99;
    for (let j = 0; j < back.length; j++)
      got = Math.min(got, ratio(fg, back[j]));
    if (got < need)
      bad.push({ s: sel(el), got: Math.round(got * 100) / 100, need: need,
                 text: own.slice(0, 40) });
  }
  /* one line per distinct selector: forty table cells in the same state is
     one bug, not forty */
  const byS = {};
  bad.forEach((b) => {
    if (!byS[b.s] || byS[b.s].got > b.got) byS[b.s] = b;
  });
  return { seen: seen, skipped: skipped,
           bad: Object.keys(byS).map((k) => byS[k])
                              .sort((a, b) => a.got - b.got) };
};

/* ---- 1. the machinery -------------------------------------------------- */
head("The picker");
await pg.goto(ROOT + "index.html");
await pg.waitForTimeout(400);
is(await pg.$(".themepick select") !== null, "every page carries a theme picker");
const list = await pg.evaluate(() => window.NTheme.list.map((t) => t[0]));
is(list.length === 5 && list[0] === "",
   "five choices, the first being the site's own palette");
is(await pg.evaluate(() => document.documentElement.hasAttribute("data-theme")) === false,
   "a reader who has never chosen gets no data-theme at all, so none of " +
   "the theme layer is in play");

/* the choice has to survive a navigation, which is the whole point */
await pg.evaluate(() => window.NTheme.set("midnight"));
await pg.goto(ROOT + "grahas.html");
await pg.waitForTimeout(300);
is(await pg.getAttribute("html", "data-theme") === "midnight",
   "the choice survives a navigation to another page");
is(await pg.evaluate(() => getComputedStyle(document.documentElement).colorScheme) === "dark",
   "a dark palette declares itself dark, so form controls follow");
const bar = await pg.getAttribute('meta[name="theme-color"]', "content");
is(bar === "#02040c", "the browser's own chrome is told the colour too (" + bar + ")");

/* ---- 2. no theme leaks into an unthemed page -------------------------- */
head("The default is untouched");
await pg.evaluate(() => window.NTheme.set(""));
await pg.goto(ROOT + "index.html");
await pg.waitForTimeout(250);
const plain = await pg.evaluate(() =>
  getComputedStyle(document.body).backgroundColor);
is(plain === "rgb(251, 251, 253)",
   "with no theme the page is still the paper it always was (" + plain + ")");

/* ---- 3. the contrast sweep --------------------------------------------
   THE TEST IS A COMPARISON, NOT AN ABSOLUTE. The site as written already
   has a handful of muted captions below the WCAG line — a grey hint under a
   control, a small label beside a figure. That is a pre-existing property of
   the stylesheet, and a theme feature is not the place to fix it or the
   place to be blamed for it. So the untouched site is measured first and its
   failures become the BASELINE, and each theme is then required to introduce
   no failure the baseline does not already have. A theme that leaves every
   one of those captions exactly as grey as it found them passes; a theme
   that turns one readable heading into black-on-black fails with the page
   and the selector named. The baseline itself is reported as a number, so it
   cannot quietly grow. */
head("Every page in every theme, measured");
const key = (p, s) => p + " \u00b7 " + s;
let checked = 0, unmeasured = 0;
const base = new Map();

async function sweep(theme) {
  const out = [];
  for (const page of PAGES) {
    await pg.goto(ROOT + page);
    await pg.evaluate((t) => {
      if (t) document.documentElement.setAttribute("data-theme", t);
      else document.documentElement.removeAttribute("data-theme");
    }, theme);
    /* the heavier pages build their panels from script; measuring a page
       mid-build reports colours nobody ever sees */
    await pg.waitForTimeout(260);
    const r = await pg.evaluate(AUDIT);
    checked += r.seen; unmeasured += r.skipped || 0;
    r.bad.forEach((b) => out.push(Object.assign({ page: page }, b)));
  }
  return out;
}

const b0 = await sweep("");
b0.forEach((r) => base.set(key(r.page, r.s), r.got));
ok("the site as written has " + base.size + " text element" +
   (base.size === 1 ? "" : "s") + " below the WCAG line; that is the " +
   "baseline every theme is held to" +
   (base.size ? " (worst: " + b0.sort((a, b) => a.got - b.got)
     .slice(0, 3).map((r) => r.s + " " + r.got + ":1 on " + r.page)
     .join(", ") + ")" : ""));

for (const theme of THEMES.filter((t) => t)) {
  const rows = await sweep(theme);
  /* a regression is a failure at a place the baseline had none, or one
     the theme made materially worse */
  const regs = rows.filter((r) => {
    const had = base.get(key(r.page, r.s));
    return had === undefined || r.got < had - 0.25;
  });
  const byS = {};
  regs.forEach((r) => { if (!byS[r.s] || byS[r.s].got > r.got) byS[r.s] = r; });
  const u = Object.keys(byS).map((k) => byS[k]).sort((a, b) => a.got - b.got);
  is(u.length === 0, theme + " introduces no unreadable text" +
     (u.length ? " \u2014 " + u.length + " regression" +
       (u.length > 1 ? "s" : "") + ": " +
       u.slice(0, 7).map((r) => r.s + " " + r.got + ":1 (needs " + r.need +
         ", " + r.page + ")").join("; ") : ""));
}
ok(checked.toLocaleString("en-GB") + " text elements measured across " +
   PAGES.length + " pages \u00d7 " + THEMES.length + " palettes" +
   (unmeasured ? "; " + unmeasured + " sat on a background this harness " +
                 "could not resolve to colours and were left unjudged" : ""));

head("The page behaves");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
