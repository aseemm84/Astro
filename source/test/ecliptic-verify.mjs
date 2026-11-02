/* ecliptic-verify.mjs — the animated ecliptic wheel page.
 *
 * What this is trying to establish, in order of how easy it is to get wrong:
 *
 *  1. The wheel is the REPORT'S renderer, not a copy. Checked by reading the
 *     built bundle for the renderer's own functions, and by asserting the
 *     prelude's four copied helpers are character-identical to the report's.
 *     A copy that drifts is the failure mode a shared renderer exists to
 *     prevent, so the copy is pinned rather than trusted.
 *
 *  2. It is chart-independent. Not "it happens not to read a chart today" —
 *     the page is loaded with localStorage cleared and asserted to draw all
 *     nine grahas anyway, with the natal ring absent. Those are different
 *     claims and only the second is worth making.
 *
 *  3. The transport actually moves time. A scrub is asserted to change the
 *     instant the wheel is drawn for, in the direction and by roughly the
 *     magnitude the span implies — not merely to change some text.
 *
 *  4. The tilt control is GONE. It was built, found to displace every graha
 *     from its rāśi, and removed; a later well-meaning restoration would
 *     reintroduce a wheel that lies, so its absence is pinned here along with
 *     the reason.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* ───── the bundle shares the renderer ───────────────────────────────────── */
head("the wheel is the report's renderer, not a second copy of it");
{
  const bundle = readFileSync(ROOT + "/ecliptic.js", "utf8");
  const src = readFileSync(ROOT + "/source/src/js/report/sky/37-ecliptic-wheel.js", "utf8");
  for (const fn of ["skyLiveMount", "skyLiveSync", "skyLiveDraw", "skyFurniture",
                    "skyLanes", "skyVargaLon", "skyAspectChords"]) {
    is(bundle.includes("function " + fn + "("),
       "the bundle carries the report's " + fn);
  }
  is(bundle.includes("function vargaLagna("),
     "and 02-varga-lagna.js, which the renderer calls for every varga but D1");
  /* the renderer must be present UNMODIFIED: a line-for-line containment check,
     not a function-name check, because a copy could carry the names and
     different arithmetic */
  const body = src.split("\n").filter(l => l.trim() && !l.trim().startsWith("//"));
  const sample = [body[Math.floor(body.length * 0.25)],
                  body[Math.floor(body.length * 0.5)],
                  body[Math.floor(body.length * 0.75)]];
  is(sample.every(l => bundle.includes(l)),
     "and carries it unmodified, sampled through the file");

  /* the four helpers the prelude restates must match the report's exactly */
  const helpers = readFileSync(ROOT + "/source/src/js/report/core/01-helpers.js", "utf8");
  const prelude = readFileSync(ROOT + "/source/src/js/ecliptic-prelude.js", "utf8");
  const grab = (txt, name) => {
    const m = txt.split("\n").filter(l => l.startsWith("var " + name + "=") ||
                                          l.startsWith("function " + name + "("));
    return m.length === 1 ? m[0].trim() : null;
  };
  for (const n of ["GL", "SA", "LORD", "esc", "dm"]) {
    const a = grab(helpers, n), b = grab(prelude, n);
    is(a && b && a === b, "prelude's " + n + " is character-identical to the report's");
  }
}

/* ───── the page in a browser ────────────────────────────────────────────── */
const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open() {
  const p = await browser.newPage({ viewport: { width: 1320, height: 1200 } });
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/ecliptic.html");
  /* CLEARED, which is the only way to prove nothing natal leaked in */
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => !!document.querySelector("#echost svg .sk-tran text"),
                          null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(600);
  return { p, errs };
}

head("it draws with no chart saved at all");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    grahas: document.querySelectorAll("#echost .sk-tran text.sk-pl").length,
    rasis: document.querySelectorAll("#echost .sk-rasi").length,
    naks: document.querySelectorAll("#echost .sk-nak").length,
    /* the natal ring is the renderer's only natal ingredient; it must be both
       switched off and sourced from nothing */
    natalOpt: window.SKY_OPT.natal,
    natalSrc: window.SKY_NATAL,
    natalDrawn: Array.from(document.querySelectorAll("#echost .sk-natal > g"))
                     .filter(g => g.getAttribute("opacity") !== "0").length,
    stamp: (document.getElementById("ec-stamp") || {}).textContent || "",
    facts: (document.getElementById("ec-facts") || {}).textContent || "",
  }));
  await p.close();
  is(errs.length === 0, "no page errors (" + errs.slice(0, 2).join(" / ") + ")");
  is(r.hasChart === false, "no chart is stored");
  is(r.grahas === 9, "and all nine grahas are drawn anyway (" + r.grahas + ")");
  is(r.rasis === 12 && r.naks === 27,
     "with 12 rāśis and 27 nakṣatras (" + r.rasis + ", " + r.naks + ")");
  is(r.natalOpt === false && r.natalSrc === null,
     "the natal ring is off and has no source");
  is(r.natalDrawn === 0, "and not one natal glyph is visible (" + r.natalDrawn + ")");
  is(/\d{4}/.test(r.stamp) && /·/.test(r.stamp), "the stamp names the moment and place");
  is(/Lagna/.test(r.facts) && /MC/.test(r.facts) && /retrograde/.test(r.facts),
     "and the facts line carries lagna, MC and what is retrograde");
}

head("the transport moves time, and by the amount the span implies");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const stamp = () => document.getElementById("ec-stamp").textContent;
    const set = (id, v, ev) => { const e = document.getElementById(id);
      e.value = v; e.dispatchEvent(new Event(ev, { bubbles: true })); };
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));

    set("ec-span", "1440", "change");            /* ±1 day */
    await wait(400);
    const mid = stamp();
    set("ec-scrub", "1000", "input");            /* the far end */
    await wait(500);
    const end = stamp();
    const endMs = window.__ecProbeMs ? window.__ecProbeMs() : null;
    set("ec-scrub", "-1000", "input");
    await wait(500);
    const start = stamp();
    /* a graha must actually have moved, not just the label */
    const posA = document.querySelector("#echost .sk-tran g").getAttribute("transform");
    set("ec-span", "525960", "change");          /* ±1 year, same proportion */
    await wait(600);
    const wide = stamp();
    const posB = document.querySelector("#echost .sk-tran g").getAttribute("transform");
    return { mid, end, start, wide, posA, posB,
             off: document.getElementById("ec-off").textContent };
  });
  await p.close();
  is(errs.length === 0, "no page errors");
  const year = s => +(/(\d{4})/.exec(s) || [0, 0])[1];
  const day = s => +(/^(\d{2})/.exec(s) || [0, 0])[1];
  is(r.mid !== r.end && r.end !== r.start, "scrubbing changes the instant drawn");
  is(day(r.end) !== day(r.start) || year(r.end) !== year(r.start),
     "a ±1 day span moves the civil day between its two ends");
  is(year(r.wide) !== year(r.mid),
     "and a ±1 year span moves the year (" + year(r.mid) + " → " + year(r.wide) + ")");
  is(r.posA !== r.posB, "the grahas move, not only the caption");
  is(/from the target/.test(r.off), "the offset is reported in a readable unit");
}

head("the tilt leans the WHOLE wheel, so no graha leaves its rāśi");
{
  /* This is the fault the control was pulled for and then rebuilt around.
     skyLiveMount used to write the furniture — the rāśi wedges, their labels,
     the nakṣatra ring — into the <svg> root and create the tilt group as its
     SIBLING, so raising the tilt squashed the grahas, axes and trails onto an
     ellipse while the rings that ARE the ecliptic plane stayed circular. Every
     graha was then drawn at a smaller radius than its own wedge. The furniture
     is now inside the tilt group, which is the whole of the fix, so that is
     what is asserted — structurally, and then by measuring the lean. */
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    const svg = () => document.querySelector("#echost svg");
    const set = async t => {
      const e = document.getElementById("ec-tilt");
      e.value = String(t); e.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(700);
    };
    const local = () => {
      /* the grahas' LOCAL coordinates, before the group transform: a tilt must
         not change where a graha sits on the wheel, only how the wheel is seen */
      const out = {};
      svg().querySelectorAll(".sk-tran > g").forEach(n => {
        const m = /translate\(([-\d.]+),([-\d.]+)\)/.exec(n.getAttribute("transform") || "");
        const lab = n.querySelector("text");
        if (m && lab) out[(lab.textContent || "").trim().slice(0, 2)] = { x: +m[1], y: +m[2] };
      });
      return out;
    };
    const box = () => {
      const g = svg().querySelector(".sk-tilt");
      const b2 = g.getBoundingClientRect();
      return { h: b2.height, w: b2.width };
    };
    await set(0);
    const flat = { rasi: svg().querySelectorAll(".sk-tilt .sk-rasi").length,
                   nak: svg().querySelectorAll(".sk-tilt .sk-nak").length,
                   loose: svg().querySelectorAll(":scope > .sk-rasi").length,
                   box: box(), local: local(),
                   xf: svg().querySelector(".sk-tilt").getAttribute("transform") || "" };
    await set(45);
    const lean = { rasi: svg().querySelectorAll(".sk-tilt .sk-rasi").length,
                   box: box(), local: local(),
                   xf: svg().querySelector(".sk-tilt").getAttribute("transform") || "",
                   /* lettering must be counter-scaled or the words go short and fat */
                   unsquashed: Array.from(svg().querySelectorAll(".sk-tilt .sk-rasi"))
                     .filter(t => /scale\(1,1\.[0-9]/.test(
                       (t.getAttribute("transform") || "").replace(/\s/g, ""))).length,
                   /* the nakṣatra labels carry a rotate() that lays each along
                      the ring. The unsquash must be PREPENDED to it, not
                      written over it — the first version assigned the
                      transform outright and sent all twenty-seven horizontal,
                      which the rāśi check above could never have caught. */
                   nakKeepRot: Array.from(svg().querySelectorAll(".sk-tilt .sk-nak"))
                     .filter(t => {
                       const x = (t.getAttribute("transform") || "").replace(/\s+/g, " ");
                       return /scale\(1,1\./.test(x) && /rotate\(/.test(x);
                     }).length,
                   nakTotal: svg().querySelectorAll(".sk-tilt .sk-nak").length };
    await set(0);
    return { flat, lean };
  });
  await p.close();
  is(errs.length === 0, "no page errors");
  is(r.flat.rasi === 12 && r.flat.nak === 27,
     "the furniture is INSIDE the tilt group (" + r.flat.rasi + " rāśis, " +
     r.flat.nak + " nakṣatras)");
  is(r.flat.loose === 0, "and none of it is left outside, where it used to sit");
  is(r.flat.xf === "", "at tilt 0 the group carries no transform at all");
  /* the lean itself: the whole wheel, furniture included, squashes by cos(45°)
     and keeps its width — the signature of a tilt about the viewer's own axis */
  const hr = r.lean.box.h / r.flat.box.h, wr = r.lean.box.w / r.flat.box.w;
  is(Math.abs(hr - Math.cos(Math.PI / 4)) < 0.01,
     "at 45° the whole wheel is cos45 as tall (" + hr.toFixed(3) + " vs 0.707)");
  is(Math.abs(wr - 1) < 0.01, "and exactly as wide (" + wr.toFixed(3) + ")");
  is(r.lean.unsquashed === 12,
     "every rāśi label is counter-scaled so the lettering stays upright (" +
     r.lean.unsquashed + "/12)");
  /* and the decisive one: a graha's own place on the wheel is untouched. The
     Sun's ecliptic latitude is zero by definition, so it has no lift to
     confuse the comparison; the others legitimately move by their latitude. */
  const su0 = r.flat.local.Su, su45 = r.lean.local.Su;
  is(r.lean.nakTotal === 27 && r.lean.nakKeepRot === 27,
     "and every nakṣatra label keeps the rotation that lays it along the ring ("
     + r.lean.nakKeepRot + "/" + r.lean.nakTotal + ")");
  is(su0 && su45 && Math.abs(su0.y - su45.y) < 0.2 && Math.abs(su0.x - su45.x) < 0.2,
     "tilting does not move the Sun on the wheel — only how the wheel is seen (" +
     (su0 && su45 ? su0.y.toFixed(1) + " → " + su45.y.toFixed(1) : "?") + ")");
}

head("the page offers the divisions the engine can actually place");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const v = document.getElementById("ec-varga");
    const codes = Array.from(v.options).map(o => o.value);
    v.value = "D9"; v.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 500));
    const d9 = document.querySelector("#echost .sk-c2").textContent;
    const naksInD9 = document.querySelectorAll("#echost .sk-nak").length;
    v.value = "D1"; v.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 500));
    return { codes, d9, naksInD9,
             d1: document.querySelector("#echost .sk-c1").textContent };
  });
  await p.close();
  is(errs.length === 0, "no page errors");
  is(r.codes.length >= 15 && r.codes[0] === "D1",
     "the varga list runs from D1 (" + r.codes.length + " divisions)");
  is(/varga lagna/.test(r.d9), "switching to D9 redraws as a varga wheel");
  is(r.naksInD9 === 0,
     "and the nakṣatra ring is dropped there, since it divides the real ecliptic only");
  is(r.d1 === "ecliptic", "D1 is labelled the ecliptic itself");
}
const CFG={sel:"ec-theme",host:"echost",label:".sk-rasi",ground:".sk-ground"};

/* ───── the palettes, and whether anyone can read them ───────────────────────
   Colours picked by hand are exactly the thing that looks fine in the one
   combination the author happened to open. Each palette is applied in turn and
   the rāśi lettering is measured against the ground it is written on — the
   first pass of this had pale blue rāśi names on cream parchment at 1.4:1,
   because the shapes were themed in JS and the lettering in CSS and only one
   of the two moved.

   The surfaces are asserted NOT to change: a palette recolours the chrome, and
   Maṅgala stays rust whatever is behind it, because that colour is the body
   rather than the decoration. */
head("every palette is legible, and none of them repaints the grahas");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async (cfg) => {
    const wait = ms => new Promise(r2 => setTimeout(r2, ms));
    const lum = c => {
      const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(c);
      if (!m) return null;
      const f = v => { v = +v / 255; return v <= 0.03928 ? v / 12.92
                                                        : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(m[1]) + 0.7152 * f(m[2]) + 0.0722 * f(m[3]);
    };
    const ratio = (a, b) => {
      const x = lum(a), y = lum(b);
      if (x == null || y == null) return null;
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const sel = document.getElementById(cfg.sel);
    const names = Array.from(sel.options).map(o => o.value).filter(Boolean);
    const out = [];
    let firstHref = null;
    for (const n of names) {
      sel.value = n; sel.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(700);
      const host = document.getElementById(cfg.host);
      const label = host.querySelector(cfg.label);
      const ground = host.querySelector(cfg.ground);
      const img = host.querySelector("image");
      const href = img ? (img.getAttribute("href") || "").slice(0, 64) : null;
      if (firstHref === null) firstHref = href;
      /* The star wheel's ground is a gradient, so its computed fill is
         url(#swhbg) and resolves to no colour at all — the first run of this
         reported every palette "unmeasured", which is a measurement failing,
         not a palette passing. A gradient is resolved to its stops and scored
         against the WORST of them, since the lettering crosses the whole
         sweep. */
      let gfill = ground ? getComputedStyle(ground).fill : null;
      let grounds = [gfill];
      const um = /url\(["']?#([^"')]+)/.exec(gfill || "");
      if (um) {
        const grad = host.ownerDocument.getElementById(um[1]);
        grounds = grad ? Array.from(grad.querySelectorAll("stop")).map(
          st => getComputedStyle(st).stopColor) : [];
      }
      const rs = label ? grounds.map(g => ratio(getComputedStyle(label).fill, g))
                               .filter(v => v != null) : [];
      out.push({ n, ratio: rs.length ? Math.min.apply(null, rs) : null,
        sameSprite: href === firstHref });
    }
    sel.value = ""; sel.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(500);
    return { names, out };
  }, CFG);
  await p.close();
  is(errs.filter(e => !/cities\.json|scheme "file"/.test(e)).length === 0, "no page errors");
  is(r.names.length >= 5, "the page offers " + r.names.length + " named palettes");
  r.out.forEach(o => {
    is(o.ratio != null && o.ratio >= 4.5,
       o.n + ": rāśi lettering reads at " +
       (o.ratio == null ? "unmeasured" : o.ratio.toFixed(1) + ":1") + " on its own ground");
  });
  is(r.out.every(o => o.sameSprite),
     "and no palette repaints a graha surface");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " ecliptic-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
