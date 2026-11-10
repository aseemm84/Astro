/* shadbala-verify — pins the rupa/virupa layer.
 *
 * WHY THIS EXISTS. The Ayana Bala constant was wrong for the whole life of
 * this project (60*(24+decl)/48, a half range of 24 degrees that is not the
 * obliquity) and every suite passed anyway, because nothing pinned the
 * virupa layer at all. Shadbala moved and the gate did not notice. This
 * suite asserts the constants against the uploaded Santhanam translation,
 * the three Ayana extremes the verse fixes, and which components may and
 * may not move when the bhava frame changes.
 *
 * Run from the repo root: node source/test/shadbala-verify.mjs
 */
import { createRequire } from "module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const near = (a, b, t, m) => is(Math.abs(a - b) <= t, m + "  (" + a + " vs " + b + ")");
const head = (h) => console.log("\n" + h);

const br = await chromium.launch();
const pg = await br.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart, null, { timeout: 40000 });

const INP = { year: 1990, month: 3, day: 15, hour: 10, minute: 30,
              lat: 28.6139, lon: 77.2090, tzHours: 5.5 };

const grab = async (hs) => pg.evaluate((a) => {
  const D = window.buildLocalChart(Object.assign({}, a.INP, { houseSystem: a.hs }));
  const out = {};
  ((D.shadbala && D.shadbala.planets) || []).forEach((x) => { out[x.graha] = x; });
  return out;
}, { INP, hs });

const W = await grab("whole");
const S = await grab("sripati");
const G = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

head("page loaded clean");
is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs[0] : ""));
is(Object.keys(W).length === 7, "seven grahas carry shadbala (got " + Object.keys(W).length + ")");

/* ---- the constants, against the source -------------------------------- */
head("required strength — Vol. 1, Ch. 27, vv. 32-33 (390/360/300/420/390/330/300 virupas)");
const REQ = { Sun: 6.5, Moon: 6.0, Mars: 5.0, Mercury: 7.0, Jupiter: 6.5, Venus: 5.5, Saturn: 5.0 };
G.forEach((p) => is(W[p].required_rupa === REQ[p],
  p + " requires " + REQ[p] + " rupas (" + REQ[p] * 60 + " virupas)"));

head("naisargika — Ch. 27, v. 14 (one rupa / 7, times 1..7)");
const NAIS = { Saturn: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Moon: 6, Sun: 7 };
G.forEach((p) => near(W[p].naisargika, 60 * NAIS[p] / 7, 0.01,
  p + " naisargika = " + NAIS[p] + "/7 rupa"));

head("rupa / virupa conversion");
G.forEach((p) => near(W[p].total_rupa, W[p].total_virupa / 60, 1e-9,
  p + " total_rupa = total_virupa / 60"));
G.forEach((p) => near(W[p].ratio, W[p].total_rupa / REQ[p], 1e-9,
  p + " ratio = rupa / required"));

head("sthana is the sum of its five parts — Ch. 27, v. 6");
G.forEach((p) => {
  const x = W[p];
  near(x.sthana, x.uchcha + x.saptavargaja + x.ojha + x.kendradi + x.drekkana, 1e-6,
    p + " sthana = uchcha + saptavargaja + ojha + kendradi + drekkana");
});

head("total is the sum of the six balas — Ch. 27, vv. 24-25");
G.forEach((p) => {
  const x = W[p];
  near(x.total_virupa, x.sthana + x.dig + x.kala + x.cheshta + x.naisargika + x.drik, 1e-6,
    p + " total = sthana + dig + kala + cheshta + naisargika + drik");
});

head("component ceilings — maximum is one rupa (Ch. 27, vv. 1, 7-11)");
G.forEach((p) => is(W[p].uchcha >= 0 && W[p].uchcha <= 60, p + " uchcha within [0,60]"));
G.forEach((p) => is(W[p].dig >= 0 && W[p].dig <= 60, p + " dig within [0,60]"));
G.forEach((p) => is(W[p].cheshta >= 0 && W[p].cheshta <= 60, p + " cheshta within [0,60]"));
G.forEach((p) => is(W[p].ayana >= 0 && W[p].ayana <= (p === "Sun" ? 120 : 60),
  p + " ayana within [0," + (p === "Sun" ? 120 : 60) + "]"));

/* ---- Ayana Bala: the three points the verse fixes ---------------------- */
/* Ch. 27, vv. 15-17, translator's note: (23d27' +/- Kranti) x 1.2793, where
   1.2793 = 60 / (2 x 23d27'). The half range IS the obliquity.
 *
 * This must test the ENGINE's ayana, not a re-implementation of the formula.
 * An earlier draft of this block recomputed the closed form inside
 * pg.evaluate and compared it to itself, so it passed with the old 24/48
 * constant still in place. Instead we rebuild each graha's declination
 * INDEPENDENTLY, from the sidereal longitude and ecliptic latitude the chart
 * already publishes, and hold the engine's reported ayana against it. The
 * declination never comes from the ayana value, so the constant is genuinely
 * under test: restore 60*(24+decl)/48 in engine.js and these checks fail. */
head("Ayana Bala — Ch. 27, vv. 15-17, against independently derived declination");
const AY = await pg.evaluate(() => {
  const D = window.buildLocalChart({ year: 1990, month: 3, day: 15, hour: 10, minute: 30,
    lat: 28.6139, lon: 77.2090, tzHours: 5.5, houseSystem: "whole" });
  const T = (D.jd_utc - 2451545) / 36525;
  const OBL = 23.439291111 - 0.0130041667 * T - 1.638e-7 * T * T;
  const R = Math.PI / 180, se = Math.sin(OBL * R), ce = Math.cos(OBL * R);
  const decl = {};
  (D.grahas || []).forEach((g) => {
    const lam = (g.sidereal_deg + D.ayanamsha_deg) * R;   // back to tropical
    const bet = (g.ecliptic_latitude_deg || 0) * R;
    decl[g.key] = Math.asin(Math.sin(bet) * ce + Math.cos(bet) * se * Math.sin(lam)) / R;
  });
  const sb = {};
  ((D.shadbala && D.shadbala.planets) || []).forEach((x) => { sb[x.graha] = x.ayana; });
  return { OBL, decl, sb, keys: (D.grahas || []).map((g) => g.key) };
});
/* The chart publishes grahas under their IAST names, not the English ones
   the shadbala table is keyed by. */
const KEY = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala",
              Mercury: "Budha", Jupiter: "Guru", Venus: "Śukra",
              Saturn: "Śani" };
G.forEach((p) => {
  const d = AY.decl[KEY[p]];
  if (d == null) { no(p + " declination not recoverable from published fields"); return; }
  const dsign = (p === "Moon" || p === "Saturn") ? -1 : 1;
  let want = 60 * (AY.OBL + dsign * d) / (2 * AY.OBL);
  if (p === "Sun") want *= 2;
  want = Math.max(0, Math.min(p === "Sun" ? 120 : 60, want));
  /* Tolerance. Six of the seven agree to better than 0.003 virupa. The Moon
     agrees only to ~0.30, because reconstructing a tropical longitude as
     sidereal + ayanamsa is not exact enough for a body with 5 degrees of
     ecliptic latitude, and dec is far more sensitive to lambda there. 0.4 is
     therefore the honest bound for THIS cross-check; it is loose enough that
     it would not catch a subtle drift, which is why the discriminating
     assertion below — engine value is not the old 24/48 value, where the
     margin is 0.85 even for the Moon — is the one that pins the constant. */
  near(AY.sb[p], want, 0.4, p + " ayana matches (obliquity +/- kranti) scaled to one rupa");
  // The same declination under the discarded 24/48 half range:
  let old = 60 * (24 + dsign * d) / 48;
  if (p === "Sun") old *= 2;
  old = Math.max(0, Math.min(p === "Sun" ? 120 : 60, old));
  if (Math.abs(old - want) > 0.05)
    is(Math.abs(AY.sb[p] - old) > 0.04,
      p + " ayana is NOT the old 24/48 value (" + old.toFixed(3) + ")");
});
head("the discarded 24/48 half range could not reach the verse's limits");
near(60 * (AY.OBL + AY.OBL) / (2 * AY.OBL), 60, 1e-9,
  "corrected form reaches a full rupa at maximum favourable declination");
near(60 * (AY.OBL - AY.OBL) / (2 * AY.OBL), 0, 1e-9,
  "corrected form reaches nil at maximum adverse declination");
is(Math.abs(60 * (24 + AY.OBL) / 48 - 60) > 0.6,
  "24/48 fell " + (60 - 60 * (24 + AY.OBL) / 48).toFixed(3) + " virupa short of a full rupa");
is(Math.abs(60 * (24 - AY.OBL) / 48) > 0.6,
  "24/48 left " + (60 * (24 - AY.OBL) / 48).toFixed(3) + " virupa where nil was due");

head("Sun's cheshta follows his ayana — Ch. 27, v. 18");
near(W.Sun.cheshta, Math.min(60, W.Sun.ayana), 1e-9, "Sun cheshta = min(60, ayana)");
near(W.Moon.cheshta, Math.min(60, W.Moon.paksha), 1e-9, "Moon cheshta = min(60, paksha)");

/* ---- what the toggle may and may not move ------------------------------
 *
 * THESE SIX USED TO BE ASSERTED AS FRAME-INDEPENDENT, AND TWO NO LONGER ARE.
 * That is a change of design, not a regression, and it is worth stating
 * plainly because an unexplained loosening of a test is exactly how a real
 * fault gets waved through.
 *
 * The toggle stopped being a house-division switch and became a PADDHATI
 * selector: whole-sign means BPHS throughout, Śrīpati means Śrīpati's own
 * rules throughout. Two of these quantities are given DIFFERENTLY by the two
 * texts, so they must move with it:
 *
 *   ayana        BPHS Ch.27 vv.15-17 scales by the obliquity; Śrīpati Adh.3
 *                śl.15 scales by a 24° parama-krānti and fixes ½ rūpa at the
 *                equator. Neither is a rounding of the other.
 *   saptavargaja BPHS Ch.26 vv.2-4 is 45/30/20/15/10/4/2; Śrīpati Adh.3
 *                śl.2-3 is the halving ladder 45/30/22.5/15/7.5/3.75/1.875.
 *                Sastri quotes the BPHS ladder and says he is not using it.
 *
 * So the old equality is replaced by something STRONGER rather than weaker:
 * each is reconstructed from its own text's closed form, and the ladder
 * membership is checked arithmetically. The remaining four must still be
 * identical, because both texts give them identically, and those assertions
 * are untouched — they are what would catch the branch leaking.
 */
head("PADDHATI-INDEPENDENT: quantities both texts give identically");
G.forEach((p) => near(S[p].naisargika, W[p].naisargika, 1e-9,
  p + " naisargika identical (constant for all nativities; BPHS Ch.27 v.14 = Śrīpati Adh.3 śl.19)"));
G.forEach((p) => near(S[p].uchcha, W[p].uchcha, 1e-9,
  p + " uchcha identical (arc from the debilitation point in both)"));
G.forEach((p) => near(S[p].drik, W[p].drik, 1e-9,
  p + " drik identical (longitude-based sphuta drishti)"));
G.forEach((p) => near(S[p].ojha, W[p].ojha, 1e-9,
  p + " ojha identical (odd/even rasi and navamsa)"));

head("PADDHATI-DEPENDENT: ayana, on each text's own half range");
G.forEach((p) => {
  /* Use the SAME independently reconstructed declination the BPHS check above
     uses — not the BPHS ayana value. Recovering decl by inverting that value
     breaks wherever it is clamped: Jupiter's BPHS ayana saturates at 60, so
     the inversion returned the clamp rather than the true declination and the
     Śrīpati expectation came out 0.054 virupa wrong. The clamp is correct
     behaviour; reading a constant back through it is not. */
  const d = AY.decl[KEY[p]];
  if (d == null) { no(p + " declination not recoverable from published fields"); return; }
  const dsign = (p === "Moon" || p === "Saturn") ? -1 : 1;
  let want = 60 * (24 + dsign * d) / 48;
  if (p === "Sun") want *= 2;
  want = Math.max(0, Math.min(p === "Sun" ? 120 : 60, want));
  near(S[p].ayana, want, p === "Moon" ? 0.4 : 0.01,
    p + " Śrīpati ayana = 60·(24 ± decl)/48, his stated parama-krānti");
});
is(G.some((p) => Math.abs(S[p].ayana - W[p].ayana) > 0.05),
  "and the two paddhatis genuinely differ on it (max " +
  Math.max(...G.map((p) => Math.abs(S[p].ayana - W[p].ayana))).toFixed(3) +
  " virupa) — so neither constant is silently standing in for the other");

head("PADDHATI-DEPENDENT: saptavargaja, on each text's own ladder");
/* Every total is a sum of seven ladder entries. BPHS's entries are whole
   numbers, so its totals must be integers. Śrīpati's smallest entry is
   1.875 = 15/8, so his totals must be integers after multiplying by 8 — and
   must NOT all be integers themselves, or the halving ladder is not in use. */
G.forEach((p) => is(Math.abs(W[p].saptavargaja - Math.round(W[p].saptavargaja)) < 1e-9,
  p + " BPHS saptavargaja " + W[p].saptavargaja + " is a sum of 45/30/20/15/10/4/2"));
G.forEach((p) => is(Math.abs(S[p].saptavargaja * 8 - Math.round(S[p].saptavargaja * 8)) < 1e-9,
  p + " Śrīpati saptavargaja " + S[p].saptavargaja + " is a sum of the halving ladder (×8 integral)"));
is(G.some((p) => Math.abs(S[p].saptavargaja - Math.round(S[p].saptavargaja)) > 1e-9),
  "at least one Śrīpati total is fractional — proof the halving ladder is " +
  "actually in use and not the BPHS one rounded");
is(G.every((p) => S[p].saptavargaja <= 7 * 45 + 1e-9 && W[p].saptavargaja <= 7 * 45 + 1e-9),
  "and neither exceeds seven moolatrikona placements");

head("FRAME-DEPENDENT: dig bala is measured from the bhava madhya (Ch. 27, vv. 7-11)");
is(G.some((p) => Math.abs(S[p].dig - W[p].dig) > 1e-6),
  "at least one graha's dig bala moves under Sripati");
G.forEach((p) => is(S[p].dig >= 0 && S[p].dig <= 60,
  p + " sripati dig still within [0,60]"));

/* ---- the two Drik Bala decisions, pinned ------------------------------ */
head("Drik Bala keeps the quarter rule only — Ch. 27, v. 19 (decision on record)");
const DK = await pg.evaluate(() => {
  const D = window.buildLocalChart({ year: 1990, month: 3, day: 15, hour: 10, minute: 30,
    lat: 28.6139, lon: 77.2090, tzHours: 5.5, houseSystem: "whole" });
  const sid = {}; (D.grahas || []).forEach((g) => { sid[g.key] = g.sidereal_deg; });
  const K = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha",
              Jupiter: "Guru", Venus: "Śukra", Saturn: "Śani",
              Rahu: "Rāhu", Ketu: "Ketu" };
  const sph = (asp, a, b) => { const d = ((b - a) % 360 + 360) % 360; let v = 0;
    if (d > 30 && d <= 60) v = (d - 30) / 2; else if (d > 60 && d <= 90) v = (d - 60) + 15;
    else if (d > 90 && d <= 120) v = (120 - d) / 2 + 30; else if (d > 120 && d <= 150) v = 150 - d;
    else if (d > 150 && d <= 180) v = (d - 150) * 2; else if (d > 180 && d < 300) v = (300 - d) / 2;
    if (asp === "Mars" && ((d >= 90 && d <= 120) || (d >= 210 && d <= 240))) v += 15;
    if (asp === "Jupiter" && ((d >= 120 && d <= 150) || (d >= 240 && d <= 270))) v += 30;
    if (asp === "Saturn" && ((d >= 60 && d <= 90) || (d >= 270 && d <= 300))) v += 45;
    return Math.max(0, Math.min(60, v)); };
  const BEN = ["Jupiter", "Venus", "Mercury", "Moon"];
  const G = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const sb = {}; ((D.shadbala && D.shadbala.planets) || []).forEach((x) => { sb[x.graha] = x.drik; });
  const o = {};
  G.forEach((p) => {
    let q = 0, mj = 0;
    G.concat(["Rahu", "Ketu"]).forEach((x) => {
      if (x === p || sid[K[x]] == null) return;
      const v = sph(x, sid[K[x]], sid[K[p]]); if (!v) return;
      q += (BEN.indexOf(x) >= 0 ? v : -v) / 4;
      if (x === "Mercury" || x === "Jupiter") mj += v;
    });
    o[p] = { engine: sb[p], quarter: q, superAdd: q + mj, inPlace: q + mj * 0.75 };
  });
  return o;
});
G.forEach((p) => near(DK[p].engine, DK[p].quarter, 1e-6,
  p + " drik is the quarter rule exactly"));
G.forEach((p) => {
  if (Math.abs(DK[p].superAdd - DK[p].quarter) < 0.05) return;  // no Me/Ju aspect to speak of
  is(Math.abs(DK[p].engine - DK[p].superAdd) > 0.05,
    p + " drik is NOT quarter + entire Mercury/Jupiter (" + DK[p].superAdd.toFixed(2) + ")");
  is(Math.abs(DK[p].engine - DK[p].inPlace) > 0.05,
    p + " drik is NOT entire-in-place-of-quarter (" + DK[p].inPlace.toFixed(2) + ")");
});
is(G.some((p) => DK[p].engine < 0),
  "at least one graha has NEGATIVE drik — malefic aspects still reduce strength, " +
  "which is the property both super-add readings destroyed");

head("aspectual value ceiling — Ch. 26 speculum peaks at 45 at 90deg, 60 at opposition");
const SP = await pg.evaluate(() => {
  const sph = (asp, d) => { let v = 0;
    if (d > 30 && d <= 60) v = (d - 30) / 2; else if (d > 60 && d <= 90) v = (d - 60) + 15;
    else if (d > 90 && d <= 120) v = (120 - d) / 2 + 30; else if (d > 120 && d <= 150) v = 150 - d;
    else if (d > 150 && d <= 180) v = (d - 150) * 2; else if (d > 180 && d < 300) v = (300 - d) / 2;
    if (asp === "Saturn" && ((d >= 60 && d <= 90) || (d >= 270 && d <= 300))) v += 45;
    return Math.max(0, Math.min(60, v)); };
  return { at90: sph("Venus", 90), at180: sph("Venus", 180), at150: sph("Venus", 150),
           at120: sph("Venus", 120), at60: sph("Venus", 60),
           sat90: sph("Saturn", 90), sat60: sph("Saturn", 60) };
});
near(SP.at60, 15, 1e-9, "speculum gives 15.00 at 60deg");
near(SP.at90, 45, 1e-9, "speculum peaks at 45.00 at 90deg");
near(SP.at120, 30, 1e-9, "speculum gives 30.00 at 120deg");
near(SP.at150, 0, 1e-9, "speculum gives nil at 150deg");
near(SP.at180, 60, 1e-9, "speculum gives a full rupa at the opposition");
is(SP.sat90 === 60, "Saturn's allowance is held at one rupa at 90deg, not the shortcut's 90");
is(SP.sat60 === 60, "Saturn at 60deg reaches one rupa, matching vv. 9-10's descent from 60");

head("kendradi follows the frame — Ch. 27, v. 5 (angle / succedent / cadent)");
is(G.some((p) => Math.abs(S[p].kendradi - W[p].kendradi) > 1e-6),
  "at least one graha's kendradi moves under Sripati");
G.concat([]).forEach((p) => {
  const okv = (v) => v === 60 || v === 30 || v === 15;
  is(okv(W[p].kendradi) && okv(S[p].kendradi),
    p + " kendradi is one of 60 / 30 / 15 in both frames" +
    " (" + W[p].kendradi + " -> " + S[p].kendradi + ")");
});
is(W.Mercury.kendradi !== S.Mercury.kendradi || W.Saturn.kendradi !== S.Saturn.kendradi,
  "a graha that changes bhava under Sripati changes kendradi band with it");

await br.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + "  " + pass + " ok, " + fail + " failed");
process.exit(fail ? 1 : 0);
