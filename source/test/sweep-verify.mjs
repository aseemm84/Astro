/* The ±15-minute sweep: every boundary it reports is real, and none is missed.
 *
 * sensBoundaries finds, to half a second, the moments within a quarter-hour of
 * the recorded birth time at which the lagna sign, the D9/D10/D60 lagnas, the
 * Moon's nakṣatra and pāda — and under Śrīpati each graha's bhāva — change.
 * It uses the engine's cheap helpers (__kAsc, __kSidAt, SPSripati.build).
 *
 * This holds it to the FULL engine instead: for every event, the whole chart
 * is cast two seconds either side and must show the reported "from" and "to";
 * the values at the recorded time must equal the cast chart's; and a brute
 * scan with full casts every 30 s must find no change the sweep did not report.
 * The sweep pins the chart's own ayanāṃśa, so it is also run after casting a
 * different one, and must not move. Both paddhatis; the chart is one whose
 * frames genuinely differ.
 *
 * Run from the repository root:  node source/test/sweep-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const BIRTHS = [
  { year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389, lon: 78.7768,
    tzHours: 5.5, ayanamsa: "samanvaya_ecliptic", node: "mean", name: "A" },
  /* a graha ~2° from a Śrīpati sandhi, so a bhāva change genuinely falls in the
     window and the Śrīpati path is exercised by a crossing, not only checked */
  { year: 1987, month: 1, day: 18, hour: 4, minute: 6, lat: 27.8817, lon: 79.9092,
    tzHours: 5.5, ayanamsa: "samanvaya_ecliptic", node: "mean", name: "S" }];

const br = await chromium.launch(); const pg = await br.newPage();
const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart && window.buildJyotishaPayload && window.__deriveForExport,
                         null, { timeout: 60000 });

let bhavaCrossings = 0;
for (const BIRTH of BIRTHS) for (const mode of ["whole", "sripati"]) {
  const R = await pg.evaluate(([b, m]) => {
    const EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars", "Budha": "Mercury", "Guru": "Jupiter",
                 "Śukra": "Venus", "Śani": "Saturn", "Rāhu": "Rahu", "Ketu": "Ketu" };
    const VL = (code, sid) => {               /* the same formulas the report's vargaLagna uses */
      const s = Math.floor(sid / 30) % 12, d = sid - s * 30, odd = s % 2 === 0;
      if (code === "D9") return Math.floor(sid / (30 / 9)) % 12;
      if (code === "D10") { const p = Math.floor(d / 3); return odd ? (s + p) % 12 : (s + 8 + p) % 12; }
      if (code === "D60") return (s + Math.floor(d * 2)) % 12;
    };
    const inputAt = (offSec) => {
      const t = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute) + offSec * 1000;
      const d = new Date(t);
      return Object.assign({}, b, { houseSystem: m, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1,
        day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() + d.getUTCSeconds() / 60 });
    };
    const full = (offSec) => {
      const J = window.buildLocalChart(inputAt(offSec));
      const lag = J.lagna.sidereal_deg, moon = J.grahas.find((g) => g.key === "Candra").sidereal_deg;
      const s = { lagna: J.lagna.rashi.idx, D9: VL("D9", lag), D10: VL("D10", lag), D60: VL("D60", lag),
                  moon_nakshatra: Math.floor(moon / (40 / 3)) % 27, moon_pada: Math.floor(moon / (10 / 3)) % 108 };
      if (m === "sripati") J.grahas.forEach((g) => { s["bhava_" + (EN[g.key] || g.key)] = g.bhava; });
      return s;
    };
    const J0 = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    window.buildKundliReport(J0); J0.derived = window.__deriveForExport(J0) || {};
    const P = window.buildJyotishaPayload(J0);
    const B = P.derived.sensitivity && P.derived.sensitivity.plus_minus_15_minutes;
    const Bstd = J0.derived.sensitivity && J0.derived.sensitivity.plus_minus_15_minutes;
    /* after casting a different ayanāṃśa, the sweep must not move */
    window.buildLocalChart(Object.assign({}, b, { ayanamsa: "lahiri", houseSystem: m }));
    const Bafter = window.sensBoundaries ? null : null;
    let again = null;
    try { again = (function () { const J1 = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
      window.buildLocalChart(Object.assign({}, b, { ayanamsa: "lahiri", houseSystem: m }));
      return window.__sensBoundaries ? window.__sensBoundaries(J1, 15) : null; })(); } catch (e) { again = null; }
    /* every event, checked with full casts 2 s either side */
    const checks = (B ? B.events : []).map((e) => {
      const before = full(e.offset_sec - 2)[e.quantity], after = full(e.offset_sec + 2)[e.quantity];
      return { e, before, after, ok: before === e.from && after === e.to };
    });
    /* brute scan with full casts every 30 s: every change must be a reported event */
    const missed = [];
    let prev = full(-900);
    for (let s = -870; s <= 900; s += 30) {
      const cur = full(s);
      for (const k of Object.keys(cur)) if (cur[k] !== prev[k]) {
        const hit = B && B.events.some((e) => e.quantity === k && e.offset_sec > s - 30 - 1 && e.offset_sec <= s + 1);
        if (!hit) missed.push(k + "@" + s);
      }
      prev = cur;
    }
    const at0 = full(0);
    const html = window.buildKundliReport(J0);
    const host = document.createElement("div"); host.innerHTML = html;
    const tblRows = [...host.querySelectorAll("table")].filter((t) =>
      [...t.querySelectorAll("th")].map((x) => x.textContent.trim()).join("|") === "From recorded time|What changes|From → to")
      .reduce((n, t) => n + t.querySelectorAll("tbody tr, tr:not(:first-child)").length, 0);
    return { B, Bstd, again, checks, missed, at0, tblRows };
  }, [BIRTH, mode]);

  head(`[${BIRTH.name} · ${mode}] the sweep`);
  if (R.B) bhavaCrossings += R.B.events.filter((e) => e.quantity.startsWith("bhava_")).length;
  is(!!R.B && R.B.events.length > 0, `the analyst JSON carries it: ${R.B ? R.B.events.length : 0} boundaries within ±15 min`);
  if (!R.B) continue;
  is(JSON.stringify(R.B) === JSON.stringify(R.Bstd), "the standard export carries the identical block");
  is(R.B.events.every((e, i, a) => Math.abs(e.offset_sec) <= 900 && (i === 0 || a[i - 1].offset_sec <= e.offset_sec)),
     "events are inside the span and in time order");
  is(Object.keys(R.at0).every((k) => R.B.at_recorded_time[k] === R.at0[k]),
     "values at the recorded time equal a full cast's");
  const bad = R.checks.filter((c) => !c.ok);
  is(bad.length === 0, `every event confirmed by full casts 2 s either side (${R.checks.length})` +
     (bad.length ? " — " + bad.slice(0, 3).map((c) => `${c.e.quantity}@${c.e.offset_sec}s ${c.before}→${c.after} vs ${c.e.from}→${c.e.to}`).join("; ") : ""));
  is(R.missed.length === 0, "a brute scan with full casts every 30 s finds nothing the sweep missed" +
     (R.missed.length ? " — " + R.missed.slice(0, 5).join(", ") : ""));
  is(mode === "whole" ? !R.B.quantities.some((k) => k.startsWith("bhava_"))
                      : R.B.quantities.filter((k) => k.startsWith("bhava_")).length === 9,
     mode === "whole" ? "no bhāva rows under whole-sign (a bhāva is a sign there)" : "all nine grahas' Śrīpati bhāvas are swept");
  is(R.tblRows === R.B.events.length, `the report's table shows every boundary (${R.tblRows})`);
  is(R.again && JSON.stringify(R.again.events) === JSON.stringify(R.B.events),
     "run after casting another ayanāṃśa, it gives the same events — the chart's own mode is pinned");
  const first = R.B.events.slice(0, 4).map((e) => `${e.quantity} ${e.offset_sec > 0 ? "+" : ""}${e.offset_sec}s`).join(", ");
  console.log("       e.g. " + first);
}
head("the Śrīpati path was exercised by a real crossing");
is(bhavaCrossings > 0, `${bhavaCrossings} bhāva change(s) found and confirmed by full casts`);
head("no page errors"); is(errs.length === 0, errs.join(" | ") || "none");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
