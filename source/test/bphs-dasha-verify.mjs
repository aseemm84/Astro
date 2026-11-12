/* The other daśās of BPHS Ch. 46, held to the book's own worked answers.
 *
 * Every rule in 77-bphs-dashas.js is cited to a verse of the uploaded
 * Santhanam translation (Vol. 2 Ch. 46). Where that translation works an
 * example, the example is rebuilt here and the engine must give the book's
 * answer. The rāśi-daśā examples all use one chart, whose positions the OCR
 * kept only as signs: lagna Kumbha 26°28′05″, Sun Makara, Moon and Rāhu
 * Mithuna, Mars Vṛṣabha, Mercury Jupiter Venus Kumbha, Saturn Vṛścika, Ketu
 * Dhanus, with the Sun the ātmakāraka and Venus the amātyakāraka.
 *
 * Then the live page: the pane renders, both exports carry the identical
 * block, the running periods sit under as_of, both paddhatis, no errors.
 *
 * Run from the repository root:  node source/test/bphs-dasha-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); } else { fail++; console.log("  FAIL " + t); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const br = await chromium.launch(); const pg = await br.newPage();
const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.__bdTest && window.buildLocalChart && window.buildJyotishaPayload && window.__deriveForExport,
  null, { timeout: 60000 });

const SA = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
/* the example chart (degrees chosen inside the OCR'd signs; the Sun furthest
   through its sign, Venus next, as the translator's kāraka list requires) */
const EX = { lag: 300 + 26 + 28 / 60 + 5 / 3600, sid: { Sun: 270 + 29, Moon: 60 + 10, Mars: 30 + 5, Mercury: 300 + 3,
  Jupiter: 300 + 8, Venus: 300 + 28, Saturn: 210 + 4, Rahu: 60 + 25, Ketu: 240 + 25 } };

const R = await pg.evaluate((EX) => {
  const T = window.__bdTest, C = T.ctx(EX), X = T.rashi(C);
  const seq = (k, n) => X[k].periods.slice(0, n || 12).map((p) => p.lord != null && /graha|karaka/.test(k) ? p.lord : p.sign != null ? p.sign : p.lord);
  const yrs = (k, n) => X[k].periods.slice(0, n || 12).map((p) => p.years);
  return { chara: { start: X.chara.start, fwd: X.chara.forward, seq: seq("chara"), yrs: yrs("chara"), why0: X.chara.periods[0].why },
    brahma: X.sthira.brahma.graha, sthira: { seq: seq("sthira"), yrs: yrs("sthira") },
    yog: { seq: seq("yogardha"), yrs: yrs("yogardha") }, kend: seq("kendradi"), kendG: seq("kendradi_graha"), kendGy: yrs("kendradi_graha"),
    karaka: { seq: seq("karaka", 2), yrs: yrs("karaka", 2) }, mand: seq("manduka"), trik: seq("trikona", 3), drig: seq("drig"),
    drigY: yrs("drig"), sandhya: { seq: seq("sandhya", 2), yrs: yrs("sandhya", 2) } };
}, EX);

head("Chara daśā (vv. 155–167) — the translator's example");
is(R.chara.start === 10 && R.chara.fwd === true, "the 9th sign Tulā is in an odd pāda, so the daśās run forward from Kumbha (v. 167)");
is(R.chara.yrs[0] === 8, `Kumbha 8 years — counted backward to Rāhu, whose sign holds more grahas than Saturn's (got ${R.chara.yrs[0]}: ${R.chara.why0})`);
is(R.chara.seq[1] === 11 && R.chara.yrs[1] === 1, `Mīna 1 year (got ${R.chara.yrs[1]})`);
is(R.chara.seq[2] === 0 && R.chara.yrs[2] === 1, `Meṣa 1 year (got ${R.chara.yrs[2]})`);

head("Sthira, Brahma Graha, Yogārdha (vv. 168–174)");
is(R.brahma === "Mercury", `the Brahma Graha is Mercury, the 8th lord in the odd sign Kumbha (got ${R.brahma})`);
is(R.sthira.seq[0] === 10 && R.sthira.yrs[0] === 8 && R.sthira.seq[1] === 11 && R.sthira.yrs[1] === 9,
   "Sthira opens on Kumbha, forward: Kumbha 8 (fixed), Mīna 9 (dual)");
is(R.yog.seq[0] === 10 && R.yog.yrs[0] === 8 && R.yog.yrs[1] === 5, `Yogārdha: Kumbha ½(8+8) = 8, Mīna ½(1+9) = 5 (got ${R.yog.yrs.slice(0, 2)})`);

head("Kendrādi (vv. 175–177)");
const kendBook = [10, 1, 7, 4, 2, 8, 11, 5, 9, 0, 3, 6];
is(JSON.stringify(R.kend) === JSON.stringify(kendBook),
   "rāśi: Kumbha; Vṛṣabha, Vṛścika, Siṃha; Mithuna, Dhanus, Mīna, Kanyā; Makara, Meṣa, Karka, Tulā — the book's order, by sign strength (" + R.kend.map((s) => SA[s]).join(", ") + ")");
is(R.kendG[0] === "Sun" && R.kendGy[0] === 5, `graha: the ātmakāraka Sun opens, 5 years — Makara back to Siṃha (got ${R.kendG[0]} ${R.kendGy[0]})`);

head("Kāraka (v. 178)");
is(R.karaka.seq[0] === "Sun" && R.karaka.yrs[0] === 11, `the Sun, 12th from the lagna: 11 years (got ${R.karaka.yrs[0]})`);
is(R.karaka.seq[1] === "Venus" && R.karaka.yrs[1] === 12, `then Venus, in the lagna: 12 years (got ${R.karaka.yrs[1]})`);

head("Maṇḍūka, Trikoṇa, Dṛg, Sandhyā");
is(JSON.stringify(R.mand.slice(0, 5)) === JSON.stringify([10, 1, 4, 7, 11]), "Maṇḍūka: Kumbha, Vṛṣabha, Siṃha, Vṛścika, then the duals from Mīna (vv. 179–180)");
is(JSON.stringify(R.trik) === JSON.stringify([10, 2, 6]), "Trikoṇa: Kumbha, Mithuna, Tulā — the strongest trine first (vv. 183–184)");
is(JSON.stringify(R.drig) === JSON.stringify([6, 4, 1, 10, 7, 9, 0, 3, 8, 11, 2, 5]),
   "Dṛg: Tulā, Siṃha, Vṛṣabha, Kumbha; Vṛścika, Makara, Meṣa, Karka; Dhanus, Mīna, Mithuna, Kanyā — the book's order (vv. 185–187)");
is(R.drigY.every((y, i) => y === [7, 8, 9][R.drig[i] % 3]), "Dṛg years are Sthira years");
is(R.sandhya.seq[0] === 10 && R.sandhya.yrs[0] === 10, "Sandhyā: from Kumbha, 10 years each (v. 204)");

head("Rāśi daśā (vv. 188–190)");
const RD = await pg.evaluate((EX) => {
  /* bhayāt 58/15 of bhabhog 59/31 ghaṭikās: put the Moon that far through Mṛgaśirā */
  const f = 3495 / 3571, moon = 4 * 40 / 3 + f * 40 / 3, spec = Object.assign({}, EX, { sid: Object.assign({}, EX.sid, { Moon: moon }) });
  const X = window.__bdTest.rashi(window.__bdTest.ctx(spec));
  return { pt: X.rashi.point_deg, start: X.rashi.start, bal: X.rashi.balance_years };
}, EX);
is(near(RD.pt, 300 + 18 + 48 / 60 + 22 / 3600, 1 / 3600), `lagna + 12 × bhayāt/bhabhog = Kumbha 18°48′22″ (got ${(RD.pt - 300).toFixed(5)}°)`);
is(RD.start === 10 && near(RD.bal, 8 - 8 * (18 + 48 / 60 + 22 / 3600) / 30, 1e-4) && near(RD.bal * 12, 2 * 12 + 11 + 24 / 30, 0.05),
   `balance 2 y 11 m 24 d of Kumbha's 8 years (got ${RD.bal.toFixed(4)} y)`);

head("Conditional nakṣatra daśās (vv. 24–43) — the openings of the worked examples");
const CO = await pg.evaluate(() => {
  const T = window.__bdTest, mk = (nakIdx, frac) => T.ctx({ lag: 15, sid: { Sun: 100, Moon: nakIdx * 40 / 3 + frac * 40 / 3, Mars: 1, Mercury: 2,
    Jupiter: 3, Venus: 4, Saturn: 5, Rahu: 6, Ketu: 186 } });
  const by = (C) => Object.fromEntries(T.conditional(C).map((c) => [c.key, c]));
  const rohini = by(mk(3, 615 / 3920)), mrig = by(mk(4, 0.3));
  return { shodasha: rohini.shodashottari.opening, shodashaBal: rohini.shodashottari.balance_years,
    pancha: mrig.panchottari.opening, shata: mrig.shatabdika.opening, shat: mrig.shattrimshat.opening, catur: mrig.chaturashiti.opening,
    shashti: mrig.shashtihayani };
});
is(CO.shodasha === "Venus", `Ṣoḍaśottarī: Rohiṇī, counted from Puṣya, opens on Venus (got ${CO.shodasha})`);
is(near(CO.shodashaBal, 18 - 18 * 615 / 3920, 1e-9), `and leaves 18 × (1 − 615/3920) = ${(18 - 18 * 615 / 3920).toFixed(4)} y — the book's 15 y 2 m 3 d (got ${CO.shodashaBal.toFixed(4)})`);
is(CO.pancha === "Mercury", `Pañcottarī: Mṛgaśirā, from Anurādhā, opens on Mercury (got ${CO.pancha})`);
is(CO.shata === "Mars", `Śatābdikā: Mṛgaśirā, from Revatī, opens on Mars (got ${CO.shata})`);
is(CO.shat === "Jupiter", `Ṣaṭtriṃśat-sama: Mṛgaśirā, from Śravaṇa, opens on Jupiter (got ${CO.shat})`);
/* the one example that does not fit the verse's inclusive count: recorded,
   not obeyed — the three above all count inclusively */
is(CO.catur === "Mercury", `Caturaśīti-sama follows the verse's inclusive count: Mercury (the book's example says Mars — noted in the pane)`);
is(CO.shashti.periods === null && /table/.test(CO.shashti.not_computed) && CO.shashti.years.slice(0, 3).join() === "10,10,10",
   "Ṣaṣṭi-hāyanī: condition and lords given, no dates (its nakṣatra table is lost), 10 years for Jupiter, Sun, Mars");

head("Kāla and Cakra (vv. 44–51)");
const KA = await pg.evaluate(() => {
  const T = window.__bdTest;
  /* 3 ghaṭikās 25 palas after a 06:00 sunrise: inside the morning sandhyā, 8/25 into it */
  const C = T.ctx({ lag: 15, sid: { Sun: 100, Moon: 70, Mars: 215, Mercury: 2, Jupiter: 3, Venus: 4, Saturn: 5, Rahu: 6, Ketu: 186 },
    sunrise: 6, sunset: 18, hour: 6, minute: (3 + 25 / 60) * 24 });
  const k = T.kala(C);
  const day = T.cakra(T.ctx({ lag: 15, sid: { Sun: 100, Moon: 70, Mars: 215, Mercury: 2, Jupiter: 3, Venus: 4, Saturn: 5, Rahu: 6, Ketu: 186 }, hour: 12 }));
  const night = T.cakra(T.ctx({ lag: 15, sid: { Sun: 100, Moon: 70, Mars: 215, Mercury: 2, Jupiter: 3, Venus: 4, Saturn: 5, Rahu: 6, Ketu: 186 }, hour: 23 }));
  return { seg: k.segment, past: k.past_ghatikas, unit: k.unit_years, y9: k.periods[8].years, day: day.start, night: night.start, sand: T.cakra(C).start };
});
is(/morning/.test(KA.seg) && near(KA.past, 8 + 25 / 60, 1e-6), `born in the morning sandhyā, 8/25 ghaṭikās into it (got ${KA.past.toFixed(4)})`);
is(near(KA.unit, (8 + 25 / 60) * 4 / 15, 1e-9) && near(KA.unit * 12, 2 * 12 + 2 + 28 / 30, 0.05), `unit ×4/15 = 2 y 2 m 28 d (got ${KA.unit.toFixed(4)} y)`);
is(near(KA.y9, KA.unit * 9, 1e-9), "Ketu, the ninth, runs nine units");
is(KA.day === 7, `Cakra, day birth: from the lagna lord's sign — Mars in Vṛścika, as in the book's example (got ${SA[KA.day]})`);
is(KA.night === 0 && KA.sand === 1, "night birth: from the lagna; sandhyā: from the 2nd sign");

head("Kālacakra (vv. 52–93)");
const KC = await pg.evaluate(() => {
  const T = window.__bdTest, run = (moon) => T.kalacakra(T.ctx({ lag: 15, sid: { Sun: 100, Moon: moon, Mars: 215, Mercury: 2, Jupiter: 3, Venus: 4, Saturn: 5, Rahu: 6, Ketu: 186 } }));
  const a = run(34 + 50 / 60);                    /* v. 93: Moon 1s 4°50′, Kṛttikā */
  const b = run(4 * 40 / 3 + 3 * 10 / 3 + 1);     /* v. 90–91: Mṛgaśirā 4th pāda */
  const all = []; for (let n = 0; n < 27; n++) for (let p = 0; p < 4; p++) { const s = window.__bdKcSeq(n, p);
    all.push(s.seq.reduce((t, x) => t + ({ 0: 7, 1: 16, 2: 9, 3: 21, 4: 5, 5: 9, 6: 16, 7: 7, 8: 10, 9: 4, 10: 4, 11: 10 })[x], 0)); }
  return { a: { nak: a.nakshatra, pada: a.pada, ch: a.chakra, tot: a.pada_total_years, exp: a.expired_years, first: a.periods[0].sign, bal: a.balance_years },
           b: { ch: b.chakra, tot: b.pada_total_years, deha: b.deha, jiva: b.jiva, seq: b.sequence, nav: b.navamsha },
           totals: [...new Set(all)].sort() };
});
is(KC.a.nak === "Krittika" && KC.a.pada === 3 && KC.a.ch === "Savya" && KC.a.tot === 83, `Kṛttikā pāda 3, Savya, a pāda of 83 years (got ${KC.a.nak} ${KC.a.pada} ${KC.a.ch} ${KC.a.tot})`);
is(near(KC.a.exp, 90 * 83 / 200, 1e-6), `90 kalās × 83 ÷ 200 = 37.35 y expired — the book's 37 y 4 m 6 d (got ${KC.a.exp.toFixed(4)})`);
is(KC.a.first === 9 && near(KC.a.bal, 3.65, 1e-6), `after Vṛṣabha, Meṣa, Mīna, Kumbha, the balance of Makara is 3 y 7 m 24 d (got ${SA[KC.a.first]} ${KC.a.bal.toFixed(4)})`);
is(KC.b.ch === "Apasavya" && KC.b.tot === 100 && KC.b.deha === 0 && KC.b.jiva === 8 && KC.b.nav === "Vṛścika",
   "Mṛgaśirā pāda 4: Apasavya, navāṃśa Vṛścika, deha Meṣa (Mars), jīva Dhanus (Jupiter), 100 years — the book's example");
is(JSON.stringify(KC.totals) === JSON.stringify([100, 83, 85, 86].sort()), `every one of the 108 pādas totals 100, 85, 83 or 86 years — v. 89's four figures (got ${KC.totals})`);

head("the live page, both paddhatis");
for (const mode of ["whole", "sripati"]) {
  const L = await pg.evaluate((m) => {
    const J = window.buildLocalChart({ year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389, lon: 78.7768, tzHours: 5.5,
      ayanamsa: "samanvaya_ecliptic", node: "mean", name: "A", houseSystem: m });
    const html = window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J);
    const B = J.derived.bphs_dashas, PB = P.derived.bphs_dashas;
    const covers = (list) => !list || (list.length && list[0].start_jd === +J.jd_utc.toFixed(5) ||
      Math.abs(list[0].start_jd - J.jd_utc) < 1e-4) && list.every((p, i) => i === 0 || Math.abs(p.start_jd - list[i - 1].end_jd) < 1e-4);
    const lists = B ? [].concat(Object.values(B.conditional).map((c) => c.periods), Object.values(B.rashi).map((r) => r.periods),
      [B.kalacakra.periods, B.kala.periods, B.cakra.periods]) : [];
    return { has: !!B && !B.available === false || !!B, pane: /The other daśās of BPHS/.test(html) && /Kālacakra daśā/.test(html) && /Not computed, by rule/.test(html),
      same: JSON.stringify(B) === JSON.stringify(PB), running: P.derived.as_of && P.derived.as_of.bphs_dashas_running,
      contiguous: lists.every(covers), n: lists.filter(Boolean).length, sys: B ? Object.keys(B.conditional).length + Object.keys(B.rashi).length + 3 : 0,
      noDeath: B && !("shoola" in B.rashi) && /death/.test(B.not_computed.shoola), jaimini: /vv\. 155–167/.test(html) };
  }, mode);
  is(L.has && L.pane, `[${mode}] the pane renders with every group, and the not-computed note`);
  is(L.same, `[${mode}] the standard and analyst exports carry the identical bphs_dashas block`);
  is(!!L.running && Object.keys(L.running).length >= 15, `[${mode}] the periods running at export time sit under derived.as_of.bphs_dashas_running`);
  is(L.contiguous && L.n >= 20, `[${mode}] all ${L.n} dated systems start at birth and run without gaps`);
  is(L.noDeath, `[${mode}] Śūla daśā is withheld, and the reason is stated`);
  is(L.jaimini, `[${mode}] the Jaimini Chara pane now cites the BPHS rule it differs from`);
}
head("no page errors"); is(errs.length === 0, errs.join(" | ") || "none");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
