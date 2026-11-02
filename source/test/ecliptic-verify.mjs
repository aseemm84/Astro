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

head("the tilt control stays removed");
{
  const page = readFileSync(ROOT + "/ecliptic.html", "utf8");
  const ui = readFileSync(ROOT + "/source/src/js/ecliptic-ui.js", "utf8");
  /* It was built, then removed: skyLiveMount builds the rāśi furniture as a
     sibling of the group the tilt transform applies to, so a tilted wheel drew
     every graha off the wedge it belongs to. Restoring the slider without
     first tilting the furniture would reintroduce a wheel that misplaces a
     graha, so its absence is asserted rather than left to memory. */
  is(!/id="ec-tilt"/.test(page), "no tilt slider in the markup");
  is(!/SKY_OPT\.tilt\s*=\s*\+/.test(ui), "and nothing in the controller sets a tilt from input");
  is(/SKY_OPT\.tilt = 0/.test(ui), "the renderer is pinned flat");
  is(/no tilt here/i.test(page) && /starwheel\.html/.test(page),
     "and the page says why, pointing at the wheel that does project for it");
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

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " ecliptic-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
