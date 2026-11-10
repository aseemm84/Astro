/* graha-verify.mjs — graha-lab.html, the dignity ribbon.
 *
 * The page's whole claim is that the picture IS the dignity scheme. So the
 * checks here do not ask the page what it drew and compare it to the function
 * it drew it with — that would pass however wrong both were. They state the
 * classical scheme independently, in this file, and read it back off the
 * rendered geometry:
 *
 *   - the exaltation and debilitation signs for the seven, written out here
 *     from the standard BPHS statement, must be the signs the ribbon colours
 *     as exalted and debilitated;
 *   - those two must come out 180° apart, measured from the drawing rather
 *     than assumed, because a swapped pair of table entries is exactly the
 *     fault a visual check would sail past;
 *   - the mūlatrikoṇa stripes must be narrow bands of the stated widths, and
 *     the two that are swallowed by an exaltation sign must be ABSENT and
 *     declared absent — the page makes that claim in prose, so the prose is
 *     checked against the drawing too.
 *
 * The speed chart is checked the same way: against quickSky directly, not
 * against what the page says about it.
 */
import { createRequire } from "node:module";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const quiet = e => !/cities\.json|scheme "file"/.test(e);

/* The scheme, stated here and nowhere else in this file's reasoning. Signs are
   0 = Meṣa … 11 = Mīna. Mūlatrikoṇa as [sign, from°, to°]. */
const SCHEME = {
  Sun:     { ex: 0,  de: 6,  own: [4],     mt: [4, 0, 20] },
  Moon:    { ex: 1,  de: 7,  own: [3],     mt: [1, 3, 30] },
  Mars:    { ex: 9,  de: 3,  own: [0, 7],  mt: [0, 0, 12] },
  Mercury: { ex: 5,  de: 11, own: [2, 5],  mt: [5, 15, 20] },
  Jupiter: { ex: 3,  de: 9,  own: [8, 11], mt: [8, 0, 10] },
  Venus:   { ex: 11, de: 5,  own: [1, 6],  mt: [6, 0, 15] },
  Saturn:  { ex: 6,  de: 0,  own: [9, 10], mt: [10, 0, 20] },
};
const SEVEN = Object.keys(SCHEME);
const SKT = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha",
              Jupiter: "Guru", Venus: "Śukra", Saturn: "Śani" };

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open() {
  const p = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/graha-lab.html");
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  await p.waitForFunction(() => document.querySelectorAll("#gl-ribbon .gl-d").length > 10,
                          null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(600);
  return { p, errs };
}

/* Read the ribbon back as degree runs per row. The mapping from x to degrees
   is recovered from the drawing itself — the row's own leftmost edge and total
   width stand for 0° and 360° — so this does not depend on any constant the
   page or this file happens to hold. */
async function readRibbon(p) {
  return p.evaluate(() => {
    const svg = document.querySelector("#gl-ribbon svg");
    if (!svg) return null;
    const rows = [...svg.querySelectorAll("text.gl-row")]
      .map(t => ({ name: t.textContent.trim(), y: +t.getAttribute("y") }))
      .sort((a, b) => a.y - b.y);
    const bands = [...svg.querySelectorAll("rect.gl-d")]
      .filter(r => +r.getAttribute("height") > 20)      /* the key's swatches are short */
      .map(r => ({ x: +r.getAttribute("x"), w: +r.getAttribute("width"),
                   y: +r.getAttribute("y"), h: +r.getAttribute("height"),
                   d: [...r.classList].filter(c => c !== "gl-d")[0] }));
    const x0 = Math.min(...bands.map(b => b.x));
    const x1 = Math.max(...bands.map(b => b.x + b.w));
    const out = {};
    for (const row of rows) {
      const mine = bands.filter(b => row.y > b.y && row.y < b.y + b.h + 8)
        .sort((a, b) => a.x - b.x);
      out[row.name] = mine.map(b => ({
        d: b.d,
        from: (b.x - x0) / (x1 - x0) * 360,
        to: (b.x + b.w - x0) / (x1 - x0) * 360,
      }));
    }
    return out;
  });
}
const at = (runs, deg) => (runs.find(r => deg >= r.from - 1e-6 && deg < r.to + 1e-6) || {}).d;
const spanOf = (runs, kind) => {
  const r = runs.filter(x => x.d === kind);
  if (!r.length) return null;
  return { from: Math.min(...r.map(x => x.from)), to: Math.max(...r.map(x => x.to)),
           n: r.length };
};

head("the page stands up with no chart in storage");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    rows: document.querySelectorAll("#gl-ribbon text.gl-row").length,
    cells: document.querySelectorAll("#gl-at .axcell").length,
    cards: document.querySelectorAll("#gl-cards .glcard").length,
    live: document.querySelectorAll("#gl-cards .glnow").length,
    mt: document.querySelectorAll("#gl-mt tbody tr").length,
    dots: document.querySelectorAll("#gl-speed .gl-sdot").length,
  }));
  await p.close();
  is(errs.filter(quiet).length === 0,
     "no page errors (" + (errs.filter(quiet)[0] || "none") + ")");
  is(!r.hasChart, "nothing was read from a stored chart");
  is(r.rows === 7, "seven rows on the ribbon — the two nodes are not in the scheme ("
     + r.rows + ")");
  is(r.cells === 9 && r.cards === 9, "but all nine appear in the readout and the cards");
  is(r.live === 9, "and all nine carry a live position");
  is(r.mt === 7, "the mūlatrikoṇa table has the seven rows");
  is(r.dots === 9, "the speed chart plots nine grahas (" + r.dots + ")");
}

head("the ribbon colours the signs the classical scheme names");
{
  const { p, errs } = await open();
  const runs = await readRibbon(p);
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  is(!!runs, "the ribbon was read back as degree runs");

  const badEx = [], badDe = [], badOwn = [];
  for (const g of SEVEN) {
    const r = runs[SKT[g]];
    if (!r) { badEx.push(g + ": no row"); continue; }
    const S = SCHEME[g];
    /* a degree in the middle of each sign, away from every boundary */
    if (at(r, S.ex * 30 + 15) !== "exalted") badEx.push(g + " → " + at(r, S.ex * 30 + 15));
    if (at(r, S.de * 30 + 15) !== "debilitated") badDe.push(g + " → " + at(r, S.de * 30 + 15));
    for (const s of S.own) {
      /* An own sign reads "own" only where nothing stronger claims the same
         degree. The precedence the page documents is exaltation, then
         debilitation, then mūlatrikoṇa, then ownership — so Budha's Kanyā,
         which is also its exaltation sign, reads exalted throughout and that
         is correct rather than a miss. Written out here as an order rather
         than as a list of exceptions, so it cannot quietly absorb a real one. */
      const deg = s * 30 + 25;
      const want = s === S.ex ? "exalted"
        : s === S.de ? "debilitated"
        : (S.mt[0] === s && 25 >= S.mt[1] && 25 < S.mt[2]) ? "moolatrikona"
        : "own";
      if (at(r, deg) !== want) {
        badOwn.push(g + " " + s + " → " + at(r, deg) + ", wanted " + want);
      }
    }
  }
  is(badEx.length === 0, "every exaltation sign is drawn exalted" +
     (badEx.length ? " — " + badEx.join("; ") : ""));
  is(badDe.length === 0, "every debilitation sign is drawn debilitated" +
     (badDe.length ? " — " + badDe.join("; ") : ""));
  is(badOwn.length === 0, "every own sign is drawn own" +
     (badOwn.length ? " — " + badOwn.join("; ") : ""));

  /* the geometric invariant: a swapped pair of entries would still colour two
     signs, but they would no longer be opposite */
  const offs = SEVEN.map(g => {
    const r = runs[SKT[g]] || [];
    const e = spanOf(r, "exalted"), d = spanOf(r, "debilitated");
    if (!e || !d) return { g, off: null };
    const mid = s => (s.from + s.to) / 2;
    let off = Math.abs(mid(e) - mid(d));
    return { g, off: Math.min(off, 360 - off) };
  });
  const offBad = offs.filter(o => o.off === null || Math.abs(o.off - 180) > 0.6);
  is(offBad.length === 0,
     "exaltation and debilitation are measured 180° apart for all seven" +
     (offBad.length ? " — " + JSON.stringify(offBad) : " (±" +
      Math.max(...offs.map(o => Math.abs(o.off - 180))).toFixed(3) + "°)"));
}

head("mūlatrikoṇa — the narrow band, and the two it is hidden under");
{
  const { p, errs } = await open();
  const runs = await readRibbon(p);
  const tbl = await p.evaluate(() => [...document.querySelectorAll("#gl-mt tbody tr")]
    .map(tr => [...tr.cells].map(td => td.textContent.trim())));
  const why = await p.evaluate(() =>
    (document.querySelector("#why") ? document.querySelector("#why")
      .parentElement.textContent : "") || document.body.textContent);
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");

  /* independently: a band is visible exactly when its sign is NOT the
     exaltation sign, because exaltation is resolved first */
  const shouldShow = SEVEN.filter(g => SCHEME[g].mt[0] !== SCHEME[g].ex);
  const shouldHide = SEVEN.filter(g => SCHEME[g].mt[0] === SCHEME[g].ex);
  is(shouldHide.length === 2 && shouldHide.includes("Moon") && shouldHide.includes("Mercury"),
     "the scheme itself says exactly two are hidden, and they are Candra and Budha");

  const widthBad = [], showBad = [], hideBad = [];
  for (const g of SEVEN) {
    const r = runs[SKT[g]] || [];
    const s = spanOf(r, "moolatrikona");
    if (SCHEME[g].mt[0] === SCHEME[g].ex) {
      if (s) hideBad.push(g);
      continue;
    }
    if (!s) { showBad.push(g); continue; }
    const want = SCHEME[g].mt;
    if (Math.abs((s.to - s.from) - (want[2] - want[1])) > 0.5 ||
        Math.abs(s.from - (want[0] * 30 + want[1])) > 0.5) {
      widthBad.push(g + ": drawn " + s.from.toFixed(1) + "–" + s.to.toFixed(1) +
                    ", stated " + (want[0] * 30 + want[1]) + "–" + (want[0] * 30 + want[2]));
    }
  }
  is(showBad.length === 0, "the five visible stripes are all present" +
     (showBad.length ? " — missing " + showBad.join(", ") : ""));
  is(hideBad.length === 0, "and the two hidden ones are genuinely absent" +
     (hideBad.length ? " — " + hideBad.join(", ") + " drew one" : ""));
  is(widthBad.length === 0, "each stripe is drawn at its stated degrees" +
     (widthBad.length ? " — " + widthBad.join("; ") : ""));

  /* the prose makes a claim about those two; it must match the table */
  const eaten = tbl.filter(r => /exaltation wins/.test(r[r.length - 1]))
                   .map(r => r[0]);
  is(eaten.length === 2 && eaten.includes("Candra") && eaten.includes("Budha"),
     "the table flags exactly those two rows (" + eaten.join(", ") + ")");
  is(/Candra/.test(why) && /Budha/.test(why) && /exaltation/i.test(why),
     "and the page says so in prose rather than leaving a silent gap");
}

head("the live half agrees with the engine, not with itself");
{
  const { p, errs } = await open();
  const r = await p.evaluate(() => {
    const names = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
                   "Rahu", "Ketu"];
    /* Ask the engine the same question the page asked it — AT THE SAME
       MOMENT. This used to build a fresh new Date() here, seconds to minutes
       after the page had computed, and then demand identical speeds back.
       Near a station a graha's speed changes fast enough to break that, and
       the headline ratio (fastest over slowest) moves fastest of all, so the
       check flaked on timing rather than on anything being wrong.
       window.__glMoment() reports the instant and place the page used. */
    const M = window.__glMoment && window.__glMoment();
    const tz = M ? M.tz : 0;
    const d = new Date((M ? M.when : Date.now()) + tz * 3600000);
    /* MIRROR THE PAGE'S CALL EXACTLY, tzHours included. The page shifts the
       instant by tz and then ALSO passes tzHours: tz; this test passed
       tzHours: 0 with the shifted date, which is a different instant by tz
       hours — 5.5 of them for Ujjain. That, not timing, was most of the
       disagreement. Asking the same question means the same arguments. */
    const sk = window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz,
      lat: M && M.lat != null ? M.lat : 23.1765,
      lon: M && M.lon != null ? M.lon : 75.7885 });
    const sp = {}; sk.planets.forEach(x => { sp[x.en] = x; });
    const drawn = [...document.querySelectorAll("#gl-speed text.gl-sval")]
      .map(t => parseFloat(t.textContent));
    const rows = [...document.querySelectorAll("#gl-speed text.gl-row")]
      .map(t => t.textContent.trim());
    return {
      engine: names.map(n => sp[n] ? +Math.abs(sp[n].speed).toFixed(3) : null),
      names, drawn, rows,
      nodeOpp: sp.Rahu && sp.Ketu
        ? Math.abs(((sp.Rahu.sid - sp.Ketu.sid) % 360 + 360) % 360 - 180) : 999,
      nodeRetro: sp.Rahu && sp.Rahu.speed < 0 && sp.Ketu && sp.Ketu.speed < 0,
      note: (document.getElementById("gl-speednote") || {}).textContent || "",
      /* the unrounded speeds the note was built from */
      srows: (window.__glSpeedRows || []).map(x => x.v),
      dign: [...document.querySelectorAll("#gl-cards .glcard")].map(c => {
        const n = c.querySelector(".glhead b"), g = c.querySelector(".gldig");
        return [n ? n.textContent.trim() : "?", g ? g.textContent.trim() : null];
      }),
    };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  /* the drawn values, sorted, must be the engine's values, sorted */
  const eng = r.engine.filter(v => v != null).sort((a, b) => b - a);
  const drawn = r.drawn.slice().sort((a, b) => b - a);
  is(eng.length === drawn.length &&
     eng.every((v, i) => Math.abs(v - drawn[i]) < 0.0015),
     "every speed on the chart is a speed quickSky reported (" + drawn.length + " of "
     + eng.length + ")");
  is(r.rows.length > 1 && r.drawn.length === r.rows.length &&
     r.drawn.every((v, i) => i === 0 || v <= r.drawn[i - 1] + 1e-9),
     "and they are drawn in descending order, fastest first");
  /* The headline ratio is arithmetic the page claims, so check it against the
     page's OWN plotted numbers rather than against a fresh engine call. The
     note is built as rows[0].v / rows[last].v from exactly those values, so
     this tests the claim it actually makes and cannot drift with the clock.
     Deriving `want` from a separate quickSky was the other half of the flake:
     with the slowest graha near a station the quotient is large and moving,
     and a ±1 tolerance on it is not a meaningful bound.
     It must come from the UNROUNDED rows, not the printed ones: the chart
     prints toFixed(3) and the note divides the full values, which differ by
     two whole units in the quotient when the denominator is near zero. */
  const ratio = /moving ([\d,]+) times/.exec(r.note);
  is(r.srows.length === drawn.length,
     "the page published the unrounded speeds the note was built from");
  const want = Math.max(...r.srows) / Math.min(...r.srows);
  is(!!ratio && Math.abs(Number(ratio[1].replace(/,/g, "")) - Math.round(want)) <= 1,
     "the headline ratio is the measured one (" + (ratio ? ratio[1] : "?") +
     " vs " + want.toFixed(0) + ")");
  is(r.nodeOpp < 1e-6, "Rāhu and Ketu are exactly opposite, as a pair of nodes must be");
  is(r.nodeRetro, "and both are retrograde");
  const nodes = r.dign.filter(d => /Rāhu|Ketu/.test(d[0]));
  is(nodes.length === 2 && nodes.every(d => d[1] === "no rulership scheme"),
     "the two nodes' cards report no rulership scheme rather than guessing one");
  is(r.dign.filter(d => d[1] && d[1] !== "no rulership scheme").length === 7,
     "and the other seven each carry a named condition");
}

head("the pointer readout follows the ribbon");
{
  const { p, errs } = await open();
  const r = await p.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const set = async deg => {
      const el = document.getElementById("gl-lon");
      el.value = String(deg); el.dispatchEvent(new Event("input", { bubbles: true }));
      await w(80);
      const out = {};
      document.querySelectorAll("#gl-at .axcell").forEach(c => {
        out[c.querySelector("b").textContent.trim()] =
          c.querySelector("span").textContent.trim();
      });
      return { read: (document.getElementById("gl-lonread") || {}).textContent, out };
    };
    return { sun0: await set(15), sun180: await set(195), sat200: await set(205) };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "no page errors");
  /* Meṣa 15° — Sūrya exalted, Śani debilitated; Tulā 15° — the reverse */
  is(r.sun0.out["Sūrya"] === "exalted" && r.sun0.out["Śani"] === "debilitated",
     "at Meṣa 15° the readout has Sūrya exalted and Śani fallen (" +
     r.sun0.out["Sūrya"] + " / " + r.sun0.out["Śani"] + ")");
  is(r.sun180.out["Sūrya"] === "debilitated" && r.sun180.out["Śani"] === "exalted",
     "and at Tulā 15° the two have changed places");
  is(/Me[sṣ]a 15/.test(r.sun0.read || "") || /15°0/.test(r.sun0.read || ""),
     "the degree readout names the sign and degree (" + r.sun0.read + ")");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " graha-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
