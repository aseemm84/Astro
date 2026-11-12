/* Planetary war in the strength figures, by each paddhati's own rule.
 *
 * BPHS: Vol. 2 Ch. 79 v. 9 — war is two tārā grahas within one degree; Venus
 *   wins wherever he is, otherwise the northern graha. Vol. 1 Ch. 27 v. 20 —
 *   the full difference of their ṣaḍbalas moves from the vanquished to the
 *   victor.
 * Śrīpati: śl. 15½–16½ (Sastri p. 47) — the northern graha wins, Venus
 *   included; the difference ÷ the difference of latitudes (degrees, stated as
 *   the engine's reading of an unnamed unit) moves.
 *
 * Three charts. (1) The example in Santhanam's own note under Ch. 11: Mars and
 * Saturn at 209°24′, 03:47 on 15 Dec 1925, Saturn the winner at 2°25′N against
 * Mars's 0°21′N. (2) A real Venus war with Venus to the SOUTH, found by
 * scanning — the one configuration where the two paddhatis must name
 * DIFFERENT victors. (3) A chart with no war, where nothing may move.
 *
 * Every transfer is re-derived here from the pre-war totals (total − yuddha)
 * and the latitudes, by the rules above written out independently.
 *
 * Run from the repository root:  node source/test/yuddha-bala-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const br = await chromium.launch(); const pg = await br.newPage();
const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart && window.buildJyotishaPayload &&
  window.__deriveForExport && window.__kEclip && window.__gbKinds, null, { timeout: 60000 });

/* (2) find a Venus war with Venus south of its opponent, 2015–2030, noon UTC */
const venusSouth = await pg.evaluate(() => {
  const T = ["Mars", "Mercury", "Jupiter", "Saturn"];
  for (let ms = Date.UTC(2015, 0, 1, 12); ms < Date.UTC(2030, 0, 1); ms += 86400000) {
    const v = window.__kEclip("Venus", ms);
    for (const o of T) {
      const p = window.__kEclip(o, ms);
      const sep = Math.abs(((v.lon - p.lon) % 360 + 540) % 360 - 180);
      if (sep < 0.6 && v.lat < p.lat - 0.05) {
        const d = new Date(ms);
        return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
                 hour: 17, minute: 30, tzHours: 5.5, opponent: o };
      }
    }
  }
  return null;
});

const CASES = [
  { name: "Santhanam's example, 15 Dec 1925 03:47", b: { year: 1925, month: 12, day: 15, hour: 3, minute: 47,
    lat: 13.0827, lon: 80.2707, tzHours: 5.5 }, expectWar: ["Mars", "Saturn"], expectVictor: { whole: "Saturn", sripati: "Saturn" },
    lats: { Mars: 21 / 60, Saturn: 2 + 25 / 60 } },
  venusSouth && { name: `a Venus war, Venus south of ${venusSouth.opponent} (${venusSouth.year}-${venusSouth.month}-${venusSouth.day})`,
    b: Object.assign({ lat: 28.6139, lon: 77.209 }, venusSouth), expectWar: ["Venus", venusSouth.opponent],
    expectVictor: { whole: "Venus", sripati: venusSouth.opponent } },
  { name: "a chart with no war", b: { year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389,
    lon: 78.7768, tzHours: 5.5 }, expectWar: null },
].filter(Boolean);
is(!!venusSouth, "found a real Venus war with Venus to the south, 2015–2030");

for (const C of CASES) for (const mode of ["whole", "sripati"]) {
  const R = await pg.evaluate(([b, m]) => {
    const J = window.buildLocalChart(Object.assign({ ayanamsa: "lahiri", node: "mean", name: "Y", houseSystem: m }, b));
    const html = window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J);
    const D = window.__kApi && window.__kApi.chart();
    const gb = {};
    (J.shadbala.planets || []).forEach((p) => {
      const h = document.createElement("div"); h.innerHTML = window.__gbKinds.total(D, J, p.graha);
      gb[p.graha] = !/gbcheck bad/.test(h.innerHTML) && /gbcheck/.test(h.innerHTML);
    });
    const lat = {}, sid = {}; J.grahas.forEach((g) => { lat[g.key] = g.ecliptic_latitude_deg; sid[g.key] = g.sidereal_deg; });
    return { sb: J.shadbala, yud: J.graha_yuddha, pay: P.shadbala, gb, lat, sid,
             note: /Planetary war \(graha yuddha\)/.test(html) };
  }, [C.b, mode]);
  head(`[${C.name} · ${mode}]`);
  const W = R.sb.yuddha || [];
  const sumYud = R.sb.planets.reduce((a, p) => a + (p.yuddha || 0), 0);
  is(Math.abs(sumYud) < 1e-9, "strength is moved, never created: the yuddha column sums to zero");
  is(Object.values(R.gb).every(Boolean), "every glass-box Ṣaḍbala total still balances with the war included");
  is(R.sb.planets.every((p) => Math.abs((R.pay.planets[p.graha].yuddha_bala_virupas || 0) - (p.yuddha || 0)) < 1e-9),
     "the analyst JSON carries the same yuddha_bala_virupas");
  if (!C.expectWar) {
    is(W.length === 0 && R.sb.planets.every((p) => !p.yuddha), "no war, so nothing moves");
    is(!R.note, "and the report prints no war note");
    continue;
  }
  const w = W.find((x) => x.grahas.includes(C.expectWar[0]) && x.grahas.includes(C.expectWar[1]));
  is(!!w, `${C.expectWar.join(" and ")} are at war (${w ? (w.separation_deg * 60).toFixed(1) + "′ apart" : "not found"})`);
  if (!w) continue;
  if (C.lats) {
    /* The note prints Mars 0°21′N and — as the OCR'd text layer reads it —
       Saturn "2 N25". The engine gives Mars 0.36° (0°21′) and Saturn 2.084°,
       which is 2°05′ to the arcminute; heliocentric latitude (2.26°) matches
       neither. Both longitudes come out at the note's 209°24′. A one-digit
       OCR misread of "2 N05" is the likely account and is NOT asserted as
       settled: what is asserted is what decides the war — Mars's figure, the
       shared longitude, and Saturn standing to the north. */
    is(Math.abs(R.lat["Maṅgala"] - 21 / 60) < 0.05, `Mars's latitude matches the note's 0°21′N (${R.lat["Maṅgala"].toFixed(3)}°)`);
    is(R.lat["Śani"] > R.lat["Maṅgala"] && R.lat["Śani"] > 0, `Saturn is north of Mars, as the note says (${R.lat["Śani"].toFixed(3)}° = 2°${Math.round((R.lat["Śani"] - 2) * 60)}′)`);
    /* The note's 209°24′ is in the note's own ayanāṃśa, which it does not name;
       under Lahiri both planets sit at 208°15′. What a war turns on is that the
       two longitudes AGREE, and that the offset from the note is the SAME for
       both — an ayanāṃśa difference, not a position error. */
    const off = R.sid ? [R.sid["Maṅgala"], R.sid["Śani"]].map((x) => (209 + 24 / 60) - x) : null;
    is(!!off && Math.abs(off[0] - off[1]) < 0.02 && Math.abs(R.sid["Maṅgala"] - R.sid["Śani"]) < 1 / 60,
       `both longitudes agree to the arcminute, and differ from the note's 209°24′ by the same ${off ? off[0].toFixed(2) : "?"}° — an ayanāṃśa difference (the note implies ≈ ${off ? (22.82 - off[0]).toFixed(2) : "?"}°)`);
  }
  is(w.victor === C.expectVictor[mode], `${mode === "whole" ? "BPHS" : "Śrīpati"} names ${C.expectVictor[mode]} the victor (got ${w.victor})`);
  /* the transfer, re-derived from the pre-war totals */
  const pre = (g) => { const p = R.sb.planets.find((x) => x.graha === g); return p.total_virupa - p.yuddha; };
  const diff = Math.abs(pre(w.grahas[0]) - pre(w.grahas[1]));
  const dLat = Math.abs(w.latitude_deg[0] - w.latitude_deg[1]);
  const expect = mode === "whole" ? diff : diff / dLat;
  is(Math.abs(w.transfer_virupas - expect) < 1e-6,
     `transfer ${w.transfer_virupas.toFixed(2)} v = ${mode === "whole" ? "|Δ ṣaḍbala|" : "|Δ ṣaḍbala| ÷ |Δ latitude°|"} (${expect.toFixed(2)})`);
  const vic = R.sb.planets.find((p) => p.graha === w.victor), van = R.sb.planets.find((p) => p.graha === w.vanquished);
  is(Math.abs(vic.yuddha - w.transfer_virupas) < 1e-9 && Math.abs(van.yuddha + w.transfer_virupas) < 1e-9,
     "the victor gains it and the vanquished loses it");
  is(Math.abs(vic.ratio - vic.total_virupa / 60 / vic.required_rupa) < 1e-9, "totals, rūpas and ratios are recomputed after the war");
  const gy = (R.yud || []).find((x) => x.victor);
  is(!!gy && /prevail|paddhati/.test(gy.note) && gy.rule === w.rule, "graha_yuddha names the victor and the rule that chose it");
  is(R.note, "the report says who won, by how much, and by which text");
  if (mode === "sripati") is(/unit of latitude/.test(w.unit_note || ""), "the unstated unit is stated as a reading, not hidden");
}
head("no page errors"); is(errs.length === 0, errs.join(" | ") || "none");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
