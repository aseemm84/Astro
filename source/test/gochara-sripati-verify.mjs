/* ===== The build spec's own acceptance suite =============================

   Phase 7 of the Shastra OS brief, written to the five tests it names
   rather than to what was convenient to assert. Each one is checked
   against a number that exists independently of this code — a sky event,
   an exact fraction, a rule stated in words — so passing means the
   engine agrees with something, not merely with itself.

   The deeper geometric properties of the Śrīpati construction live in
   sripati-verify.mjs, and the year-replay that catches missed ingresses
   lives in gochara-verify.mjs. This file is the spec's acceptance list and
   does not duplicate those; between them nothing is checked twice and
   nothing the spec asks for is unchecked. */

import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const br = await chromium.launch();
const pg = await br.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
await pg.goto("file://" + process.cwd() + "/kinetic-workstation.html");
await pg.waitForFunction(() => window.SPSripati && window.SPGochara &&
                               window.SPRashiphal && window.VarshikGochara,
                         null, { timeout: 45000 });

/* ---- 1. Śrīpati quadrant mathematics ------------------------------------ */
head("1. Śrīpati cusp quadrant math");
const q = await pg.evaluate(() => {
  const S = window.SPSripati;
  const asc = 100.0, mc = 10.0;              /* a 90° quadrant */
  const B = S.build(asc, mc);
  const d = (a, b) => {
    const x = Math.abs(((a - b) % 360 + 360) % 360);
    return Math.min(x, 360 - x);
  };
  const arc = (a, b) => ((b - a) % 360 + 360) % 360;
  /* an uneven case, where a bug has somewhere to hide */
  const B2 = S.build(217.3, 131.9);
  const thirds = [];
  [[10, 11, 12, 1], [1, 2, 3, 4], [4, 5, 6, 7], [7, 8, 9, 10]]
    .forEach((quad) => {
      const a = B2.madhya[quad[0]], b = B2.madhya[quad[3]];
      const span = arc(a, b);
      for (let k = 1; k <= 2; k++) {
        const want = (a + span * k / 3) % 360;
        thirds.push(d(B2.madhya[quad[k]], want));
      }
    });
  const mids = [];
  for (let h = 1; h <= 12; h++) {
    const a = B2.madhya[h], b = B2.madhya[h === 12 ? 1 : h + 1];
    mids.push(d(B2.sandhi[h], (a + arc(a, b) / 2) % 360));
  }
  return {
    h1: d(B.madhya[1], asc), h10: d(B.madhya[10], mc),
    h7: d(B.madhya[7], (asc + 180) % 360),
    h4: d(B.madhya[4], (mc + 180) % 360),
    worstThird: Math.max.apply(null, thirds),
    worstMid: Math.max.apply(null, mids)
  };
});
is(q.h1 < 1e-9 && q.h10 < 1e-9 && q.h7 < 1e-9 && q.h4 < 1e-9,
   "the four cardinal cusps ARE the four angles: H1=Lagna, H10=MC, " +
   "H7=Descendant, H4=IC, to within " +
   Math.max(q.h1, q.h4, q.h7, q.h10).toExponential(1) + "°");
is(q.worstThird < 1e-9,
   "each quadrant's two intermediate cusps divide its arc into three equal " +
   "parts — worst error " + q.worstThird.toExponential(1) + "° across all " +
   "four quadrants of an uneven chart");
is(q.worstMid < 1e-9,
   "every sandhi is the exact midpoint of its two adjacent cusps — worst " +
   "error " + q.worstMid.toExponential(1) + "°");

/* ---- 2. the chalita shift, at a junction -------------------------------- */
head("2. Chalit shift detection at a sandhi boundary");
const shift = await pg.evaluate(() => {
  const S = window.SPSripati;
  const B = S.build(100, 10);                /* equal quadrants, 30° houses */
  /* the junction that closes bhāva 1 */
  const s1 = B.sandhi[1];
  const before = (s1 - 0.5 + 360) % 360;
  const after = (s1 + 0.5) % 360;
  return { s1, hBefore: B.houseOf(before), hAfter: B.houseOf(after),
           /* and a graha one degree inside the junction must read a weak
              cusp effect, which is the point of knowing it is near one */
           wBefore: B.cuspStrength(before).frac,
           wAfter: B.cuspStrength(after).frac };
});
is(shift.hBefore === 1 && shift.hAfter === 2,
   "a longitude half a degree before the bhāva-1 junction reads bhāva 1, " +
   "and half a degree after it reads bhāva 2 — the shift is detected at " +
   "the junction, not at the sign boundary");
is(shift.wBefore < 0.05 && shift.wAfter < 0.05,
   "and a graha sitting there reads almost no effect for either bhāva, " +
   "as the edition's sandhi rule requires (" +
   shift.wBefore.toFixed(3) + " / " + shift.wAfter.toFixed(3) + ")");

/* ---- 3. Saturn's 2027 ingress into Meṣa --------------------------------- */
head("3. Annual gochara ingress detection");
const sat = await pg.evaluate(() => {
  const V = window.VarshikGochara.calculateYearTransits(2027, "lahiri");
  const G = window.SPGochara;
  const ing = V.events.filter((e) => e.body === "Saturn" &&
                                     e.kind === "ingress");
  return ing.map((e) => ({
    iso: G.jdToDate(e.jd).toISOString(),
    to: e.to, from: e.from, retro: !!e.retro,
    /* the sign a minute either side, read straight from the ephemeris —
       so the assertion does not rest on the same code that found it */
    before: G.signOf(G.sid("Saturn", e.jd - 1 / 1440)),
    after: G.signOf(G.sid("Saturn", e.jd + 1 / 1440))
  }));
});
const toMesha = sat.filter((e) => e.to === 0);
is(toMesha.length === 1,
   "Saturn enters Meṣa exactly once in 2027 — found " + toMesha.length);
if (toMesha.length) {
  const e = toMesha[0];
  is(e.before === 11 && e.after === 0,
     "at that instant the ephemeris itself reports Mīna a minute before " +
     "and Meṣa a minute after, so the crossing is real and not an " +
     "artefact of the scan");
  is(/^2027-06-0[12]/.test(e.iso),
     "and it falls on " + e.iso.slice(0, 10) + ", in early June 2027");
}
is(sat.some((e) => e.to === 11 && e.retro),
   "and Saturn is also caught retrograding BACK into Mīna later in the " +
   "year — the second crossing a flat table drops" +
   (sat.length ? " (" + sat.length + " Saturn ingresses in all)" : ""));

/* ---- 4. a Mīna Moon in 2027 --------------------------------------------- */
head("4. Twelve Candra-rāśi predictions");
const mina = await pg.evaluate(() => {
  const R = window.SPGochara.year(2027), P = window.SPRashiphal;
  const r = P.read(R, 11, null);             /* 11 = Mīna */
  const G = window.SPGochara;
  return {
    sign: r.signName,
    sani: r.sani.map((s) => ({ house: s.house, title: s.title,
                               from: G.jdToDate(s.from).toISOString().slice(0, 10),
                               to: G.jdToDate(s.to).toISOString().slice(0, 10) })),
    pillars: r.pillars.map((p) => p.key),
    guru: r.guru.length, nodes: r.nodes.length
  };
});
is(mina.sign === "Mīna", "the 12th rāśi is Mīna");
const asta = mina.sani.filter((s) => s.house === 2);
is(asta.length >= 1,
   "with Saturn transiting Meṣa, a Mīna Moon is flagged Sade Sati last " +
   "phase — Asta Charaṇa, the 2nd from the Moon — from " +
   (asta[0] ? asta[0].from : "?") + " (" + (asta[0] ? asta[0].title : "") + ")");
is(mina.sani.some((s) => s.house === 1),
   "and the middle phase, Śani over the janma-rāśi itself, is flagged for " +
   "the part of the year Śani is still in Mīna — the two phases in one " +
   "year that a block-per-rāśi table cannot show");
is(mina.pillars.length === 4 &&
   mina.pillars.join(",") === "karma,dhana,sambandha,swasthya",
   "the reading carries all four life pillars");
is(mina.guru > 0 && mina.nodes > 0,
   "with Guru's gochara and the nodal axis both evaluated");

/* ---- 5. serialisation ---------------------------------------------------- */
head("5. Zero-hallucination JSON serialisation");
/* a chart has to exist for the chart half of the payload */
await pg.evaluate(() => {
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.value = v;
    ["input", "change"].forEach((t) =>
      e.dispatchEvent(new Event(t, { bubbles: true })));
  };
  set("k-dob", "1984-03-17"); set("k-tob", "14:30");
  set("k-lat", "24.4539"); set("k-lon", "54.3773"); set("k-tz", "4");
});
await pg.click("#k-go");
await pg.waitForFunction(() => window.__kApi && window.__kApi.chart &&
                               window.__kApi.chart(), null, { timeout: 45000 });
await pg.waitForTimeout(2500);
await pg.click("[data-wstab=gochara]");
await pg.waitForTimeout(400);
await pg.click("#go-run");
await pg.waitForTimeout(3500);

const ser = await pg.evaluate(() => {
  const out = { errors: [] };
  let txt = null;
  try {
    const o = window.SPWorkstation.json();
    txt = JSON.stringify(o);
    out.kb = Math.round(txt.length / 1024);
    out.keys = Object.keys(o);
    out.hasManifest = !!(o.manifest && o.manifest.source_tiers);
    out.sripatiHouses = o.sripati ? o.sripati.houses.length : 0;
    out.shifts = o.sripati ? o.sripati.chalit_shifts.length : null;
    out.events = o.gochara ? o.gochara.events.length : 0;
    out.midYear = o.gochara ? o.gochara.mid_year.length : 0;
    out.readings = o.rashiphal ? o.rashiphal.readings.length : 0;
    out.vargas = o.shodashavarga ? o.shodashavarga.rows.length : 0;
    /* a payload that silently carries NaN or undefined is the failure
       mode this test exists for: JSON.stringify turns both into null or
       drops the key, and a model reading it cannot tell */
    out.nulls = (txt.match(/:null/g) || []).length;
    out.nan = /NaN|Infinity/.test(txt);
    /* round-trip, because a string that cannot be parsed back is not a
       serialisation */
    JSON.parse(txt);
    out.roundTrip = true;
  } catch (e) {
    out.errors.push(String(e));
    out.roundTrip = false;
  }
  /* The report's own exporter, checked through the path the page actually
     uses rather than by calling the function directly: every cast runs
     render(), which writes the full response plus its derived layer into
     #k-raw. Parsing that is the end-to-end check, and it was worth
     getting right — the first version of this test called
     __deriveForExport() with no argument, which throws, and reported the
     exporter as broken when it was the test that was. */
  try {
    const raw = document.getElementById("k-raw");
    const txt2 = raw && raw.textContent;
    if (!txt2) { out.reportExport = "absent"; }
    else {
      const j = JSON.parse(txt2);
      out.reportExport = true;
      out.reportKb = Math.round(txt2.length / 1024);
      out.reportHasDerived = !!(j && j.derived &&
                                Object.keys(j.derived).length);
      out.reportHasSripati = !!(j && j.derived && j.derived.sripati);
    }
  } catch (e) {
    out.errors.push("report export: " + String(e));
    out.reportExport = false;
  }
  return out;
});
is(ser.errors.length === 0, "the workstation payload serialises with no " +
   "exception" + (ser.errors.length ? " — " + ser.errors[0] : ""));
is(ser.roundTrip, "and parses back from its own string");
is(ser.hasManifest, "it carries a manifest naming the engine, the zodiac, " +
   "the ayanāṃśa, the house systems and what each source tier means");
is(ser.sripatiHouses === 12 && ser.shifts !== null,
   "all twelve Śrīpati bhāvas and the chalita shift list are in it");
is(ser.events > 0 && ser.midYear === 9,
   ser.events + " gochara events and a mid-year snapshot of all nine grahas");
is(ser.readings === 12, "all twelve Candra-rāśi readings");
is(ser.vargas === 16, "all sixteen divisions");
is(!ser.nan, "no NaN or Infinity anywhere in the payload");
is(ser.reportExport === true,
   "the report's own export, written into #k-raw by every cast, parses " +
   "back cleanly" + (ser.reportKb ? " (" + ser.reportKb + " KB)" : ""));
is(ser.reportHasDerived !== false,
   "and carries its derived layer, so the saved JSON is self-contained" +
   (ser.reportHasSripati ? ", Śrīpati cusps included" : ""));
ok("payload is " + ser.kb + " KB");

/* ---- 6. the Workstation's own panes ------------------------------------- */
head("6. The Workstation panes");
/* Both of these were real bugs, and both are the kind that a screenshot of
   a freshly-opened tab would never show. */
const panes = await pg.evaluate(async () => {
  const tabs = ["kundli", "gochara", "rashiphal", "ganita", "shifts",
                "varga", "dasha", "bala", "purna", "sav"];
  const click = (t) => {
    const n = document.querySelector("[data-wstab=" + t + "]");
    if (n) n.click();
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { lost: [], empty: [], first: {} };
  for (const t of tabs) {
    click(t); await wait(480);
    const host = document.getElementById("wp-" + t);
    const a = host ? host.innerHTML.length : 0;
    out.first[t] = a;
    if (a < 300) out.empty.push(t + " (" + a + ")");
    /* click the SAME tab again: the Gochara and Rāśiphal panels are live
       nodes moved into their host, and wiping a host that still held them
       destroyed them — 13,381 characters to 45 */
    click(t); await wait(480);
    const c = host ? host.innerHTML.length : 0;
    if (c < a * 0.5) out.lost.push(t + " (" + a + " \u2192 " + c + ")");
  }
  return out;
});
is(panes.empty.length === 0, "all ten panes render with content" +
   (panes.empty.length ? " \u2014 empty: " + panes.empty.join(", ") : ""));
is(panes.lost.length === 0,
   "and none of them empties when its own tab is clicked a second time" +
   (panes.lost.length ? " \u2014 lost: " + panes.lost.join(", ") : ""));
is((panes.first.purna || 0) > 100000,
   "the Pūrṇa pane carries the whole report, not a summary (" +
   Math.round((panes.first.purna || 0) / 1024) + " KB)");

const full = await pg.evaluate(() => ({
  sections: document.querySelectorAll("#wp-purna section[id^=ks-]").length,
  inReport: document.querySelectorAll("#k-out section[id^=ks-]").length,
  jumps: document.querySelectorAll("#wp-purna .wsjump a").length
}));
is(full.sections === full.inReport && full.sections > 30,
   "every one of the builder's " + full.inReport + " report sections is " +
   "reachable in the Workstation — the completeness guarantee, checked " +
   "by counting rather than by listing");
is(full.jumps === full.sections,
   "with a jump link for each");

/* The Gochara panel's nodes are PARKED off-stage whenever another view is
   open — that is how the same live controls serve two views without being
   duplicated. So it has to be the active tab when it is measured; the
   first version of this check ran after the loop had ended on another tab
   and found an empty pane that was not empty. */
await pg.click("[data-wstab=gochara]");
await pg.waitForTimeout(700);
const goch = await pg.evaluate(() => ({
  charts: document.querySelectorAll("#wp-gochara .wschart").length,
  next: document.querySelectorAll("#wp-gochara .wsnext").length,
  read: !!document.querySelector("#wp-gochara .wsownread")
}));
is(goch.charts >= 3, "the Gochara pane draws its transit charts (" +
   goch.charts + "): by rāśi, from the natal lagna, from the natal Moon");
is(goch.next > 0, "and the events coming next (" + goch.next + ")");
is(goch.read, "and the reading for THIS chart, not a menu of twelve");

/* every animated chart path must be able to finish: a literal dasharray
   is a guess about geometry, and the guess was 620 against a 1131-unit
   inner diamond, so two of its four edges never drew */
const draw = await pg.evaluate(() => {
  const ps = document.querySelectorAll("#wp-kundli .wsline");
  let bad = 0;
  ps.forEach((n) => { if (n.getAttribute("pathLength") !== "1") bad++; });
  return { n: ps.length, bad: bad };
});
is(draw.n > 0 && draw.bad === 0,
   "every animated chart line declares pathLength=1, so the draw " +
   "animation completes whatever the path's real length (" + draw.n +
   " paths)");

head("The page behaves");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 160) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
