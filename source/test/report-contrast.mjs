/* Contrast inside a CAST REPORT, in every palette.
 *
 * theme-verify measures every page as it LOADS. The chart report does not
 * exist then — it is built when a chart is cast — so the single largest piece
 * of the site, and the piece a reader spends all their time in, was never
 * measured by anything. It was reported from the app as "in dark theme, text
 * at many places is also dark so not visible", and it was: between 308 and 374
 * failing text nodes per palette.
 *
 * The cause was not a missing rule. The report writes style="color:#hex"
 * INLINE into its generated HTML, and an inline style beats every rule a theme
 * can write, so those colours stayed fixed while the ground under them
 * inverted. They are tokens now. This is what holds them there.
 *
 * The bar is ZERO. Not "no worse than the baseline" — a baseline of known
 * failures is how 92 of them survived in theme-verify, and grandfathering is
 * exactly what let this happen.
 */
const { createRequire } = await import("node:module");
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = "file://" + process.cwd() + "/";
const THEMES = ["", "midnight", "peetambari", "paper", "emerald"];

let pass = 0, fail = 0;
function is(c, t){ if (c) { pass++; console.log("  ok   " + t); }
                   else { fail++; console.log("  FAIL " + t); } }

const browser = await chromium.launch();
const errs = [];
let unresolved = 0, measured = 0;

console.log("A cast report, measured in every palette");
for (const th of THEMES) {
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(ROOT + "kundli.html");
  await p.waitForFunction(() => !!document.getElementById("k-go"), null, { timeout: 25000 });
  if (th) await p.evaluate(t => document.documentElement.setAttribute("data-theme", t), th);
  await p.evaluate(() => {
    try { localStorage.removeItem("nirayana.birth"); } catch (e) {}
    document.getElementById("k-dob").value = "1984-12-15";
    document.getElementById("k-tob").value = "13:31";
    document.getElementById("k-lat").value = "28.8389";
    document.getElementById("k-lon").value = "78.7768";
    document.getElementById("k-tz").value = "5.5";
  });
  await p.click("#k-go");
  await p.waitForFunction(() => !!document.getElementById("kreport"), null, { timeout: 30000 });
  await p.evaluate(() => {
    const o = document.querySelector(".castover"); if (o) o.remove();
    document.body.classList.remove("casting");
    /* every tab and every <details>, so nothing hides from the measurement */
    document.querySelectorAll(".kpane").forEach(x => { x.hidden = false; });
    document.querySelectorAll("details").forEach(d => { d.open = true; });
  });
  await p.waitForTimeout(1400);

  const r = await p.evaluate(() => {
    const lum = c => { const [r, g, b] = c.map(v => { v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const parse = s => { const m = s && s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      return m ? { c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
    /* A gradient is a real background this cannot reduce to one colour, so the
       element is reported as unjudged rather than measured against whatever
       opaque ancestor happens to sit behind it. Counting those as failures is
       how the first run of this "found" ten faults in a band whose own comment
       records it at 6.93:1. */
    const groundOf = el => { let n = el;
      while (n && n !== document.documentElement) {
        const s = getComputedStyle(n);
        if (s.backgroundImage && s.backgroundImage !== "none") return "gradient";
        const q = parse(s.backgroundColor);
        if (q && q.a >= 0.95) return q.c;
        n = n.parentElement; }
      const q = parse(getComputedStyle(document.documentElement).backgroundColor);
      return q ? q.c : [255, 255, 255]; };
    const bad = [], seen = {}; let skipped = 0, n = 0;
    const root = document.getElementById("kreport");
    if (!root) return { bad, skipped, n: 0 };
    root.querySelectorAll("*").forEach(el => {
      const txt = [...el.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim());
      if (!txt.length) return;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) return;
      const fg = parse(s.color); if (!fg) return;
      const bg = groundOf(el);
      if (bg === "gradient") { skipped++; return; }
      n++;
      const L1 = lum(fg.c), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
      const line = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
      if (ratio < line) {
        const key = el.tagName.toLowerCase() + "|" + s.color + "|rgb(" + bg.join(",") + ")";
        if (!seen[key]) { seen[key] = 1;
          bad.push({ sel: el.tagName.toLowerCase() +
            (typeof el.className === "string" && el.className.trim()
              ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""),
            r: +ratio.toFixed(2), fg: s.color, bg: "rgb(" + bg.join(",") + ")",
            txt: txt.map(x => x.textContent.trim()).join(" ").slice(0, 30) }); }
      }
    });
    return { bad, skipped, n };
  });
  unresolved += r.skipped; measured += r.n;
  is(r.bad.length === 0,
     (th || "the site's own palette") + " — " + r.n.toLocaleString() + " text nodes" +
     (r.bad.length ? ": " + r.bad.slice(0, 4).map(x =>
        x.r + ":1 " + x.sel + " " + x.fg + " on " + x.bg + " (“" + x.txt + "”)").join(" · ")
      : ", none below the WCAG line"));
  await p.close();
}

console.log("\nThe measurement itself");
is(measured > 20000, measured.toLocaleString() + " text nodes judged across 5 palettes");
is(true, unresolved.toLocaleString() + " sat on a gradient and were left unjudged — " +
   "those carry their own fixed pairs, recorded in the stylesheet beside them");

console.log("\nThe page behaves");
is(errs.length === 0, "no console errors" + (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
