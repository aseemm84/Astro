/* ===== THE ŚRĪPATI PADDHATI, AGAINST ŚRĪPATI'S OWN WORKED HOROSCOPE ======
 *
 * Source: Śrīpatipaddhati, tr. V. Subrahmanya Sastri, Bangalore 1937.
 * Its first four adhyāyas carry one horoscope all the way through, printing
 * intermediate tables at every stage. That makes it the rarest thing this
 * project has had: an acceptance test written by the author of the method.
 *
 * Two kinds of check here, and the distinction matters.
 *
 *   1. BOOK CHECKS reproduce his printed tables from his own inputs. They
 *      test the FORMULA and are independent of this engine's astronomy —
 *      his longitudes and bhāvas are typed in from the page, so an ephemeris
 *      difference cannot mask or cause a failure.
 *   2. ENGINE CHECKS cast a chart through buildLocalChart in both paddhatis
 *      and assert that the branch actually bites, in the right direction, on
 *      the right quantities, and NOWHERE ELSE. A branch that silently also
 *      moved a BPHS figure would be the same silent-merge fault this work
 *      exists to remove, in a new place.
 *
 * ONE KNOWN DISAGREEMENT WITH THE BOOK, asserted rather than hidden: Venus's
 * bhāva-phala. The rule reproduces six of his seven planets to four decimals;
 * Venus comes out ·9702 where he prints ·9653. Reproducing ·9653 from his own
 * tabulated bhāva sphuṭas and his own Venus longitude would require the 12|1
 * sandhi to sit near 0°06′ instead of the 358°23′30″ his own table gives, so
 * the discrepancy is in the 1937 arithmetic, not in the rule. Six exact
 * matches are not bent to fit one outlier. The test pins BOTH the six and the
 * known divergence, so if anyone later "fixes" Venus the suite will say what
 * they broke.
 *
 * Run from the repo root.
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

const CWD = process.cwd();
let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const near = (a, b, tol, t) =>
  is(a != null && Math.abs(a - b) <= tol, t + "  (got " +
     (a == null ? "null" : (+a).toFixed(4)) + ", want " + b + " ±" + tol + ")");

/* ---------------------------------------------------------------- BOOK DATA
   Everything below is typed from the printed page, with its page number. */
const D = (s, d, m, sec) => s * 30 + d + m / 60 + sec / 3600;

/* bhāva sphuṭas (madhyas), table p.12 */
const BHAVA = [D(0,14,31,46), D(1,12,15,14), D(2,9,58,43), D(3,7,42,11),
               D(4,9,58,43),  D(5,12,15,14), D(6,14,31,46), D(7,12,15,14),
               D(8,9,58,43),  D(9,7,42,11),  D(10,9,58,43), D(11,12,15,14)];
/* sandhis, same table: index i is the sandhi between bhāva i+1 and i+2,
   the last being between the 12th and the 1st */
const SANDHI = [D(0,28,23,30), D(1,26,6,58),  D(2,23,50,27), D(3,23,50,27),
                D(4,26,6,58),  D(5,28,23,30), D(6,28,23,30), D(7,26,6,58),
                D(8,23,50,27), D(9,23,50,27), D(10,26,6,58), D(11,28,23,30)];
/* planetary longitudes, p.3 */
const LON = { Sun:D(0,17,43,30), Moon:D(9,14,29,39), Mars:D(11,27,53,9),
              Mercury:D(11,24,13,44), Jupiter:D(8,1,25,1), Venus:D(0,14,2,56),
              Saturn:D(0,27,55,41) };
/* bhāva-phala table, p.14 */
const PHALA = { Sun:[1,"avaroha",0.7694], Moon:[10,"avaroha",0.5791],
                Mars:[12,"avaroha",0.0313], Mercury:[12,"avaroha",0.2579],
                Jupiter:[9,"aroha",0.3823], Venus:[1,"aroha",0.9653],
                Saturn:[1,"avaroha",0.0334] };
const VENUS_BOOK_IS_WRONG = 0.9702;   /* what his own table implies */

/* iṣṭa / kaṣṭa, table p.61, from uchchabala and cheṣṭabala in rūpa (pp.23,50) */
const UCH = { Sun:0.957, Moon:0.397, Mars:0.667, Mercury:0.051,
              Jupiter:0.186, Venus:0.905, Saturn:0.044 };
const CHE = { Sun:0.810, Moon:0.518, Mars:0.189, Mercury:0.794,
              Jupiter:0.795, Venus:0.049, Saturn:0.062 };
const ISHTA = { Sun:0.880, Moon:0.453, Mars:0.355, Mercury:0.201,
                Jupiter:0.384, Venus:0.210, Saturn:0.052 };
const KASHTA = { Sun:0.090, Moon:0.539, Mars:0.519, Mercury:0.442,
                 Jupiter:0.408, Venus:0.300, Saturn:0.947 };

const fwd = (a, b) => ((b - a) % 360 + 360) % 360;
const arambha = (h) => SANDHI[(h - 2 + 12) % 12];
const virama  = (h) => SANDHI[h - 1];

head("=== BOOK: bhāva-phala, Adh. 1 śl. 9–10 against his table p.14 ===");
for (const [name, lon] of Object.entries(LON)) {
  let h = null;
  for (let k = 1; k <= 12; k++)
    if (fwd(arambha(k), lon) < fwd(arambha(k), virama(k))) { h = k; break; }
  const md = BHAVA[h - 1];
  const rising = fwd(arambha(h), lon) < fwd(arambha(h), md);
  const num = rising ? fwd(arambha(h), lon) : fwd(lon, virama(h));
  const den = rising ? fwd(arambha(h), md)  : fwd(md, virama(h));
  const w = num / den;
  const [bh, dir, want] = PHALA[name];
  is(h === bh, name + " is in bhāva " + h + ", as the book has it");
  is((rising ? "aroha" : "avaroha") === dir,
     "  and is " + (rising ? "āroha" : "avaroha") + " — " +
     (rising ? "before" : "past") + " the madhya, as the book has it");
  if (name === "Venus")
    near(w, VENUS_BOOK_IS_WRONG, 0.0002,
      "  Venus reproduces the book's OWN bhāvas, not its printed ·9653 " +
      "(a 1937 arithmetic slip — see the header)");
  else
    near(w, want, 0.0002, "  weight matches the printed figure");
}

head("=== BOOK: iṣṭa / kaṣṭa, Adh. 4 śl. 6 against his table p.61 ===");
for (const n of Object.keys(UCH)) {
  near(Math.sqrt(UCH[n] * CHE[n]), ISHTA[n], 0.0015, n + " iṣṭa = √(uchcha × cheṣṭa)");
  near(Math.sqrt((1 - UCH[n]) * (1 - CHE[n])), KASHTA[n], 0.0015,
       n + " kaṣṭa = √(complements)");
}
head("=== BOOK: and BPHS Ch.28 v.6 is a DIFFERENT number, not a rescaling ===");
{
  const geo = Math.sqrt(UCH.Sun * CHE.Sun) * 60;          /* ·880 → 52·8 virūpa */
  const ari = (UCH.Sun * 60 + CHE.Sun * 60) / 2;          /* BPHS → 53·0 virūpa */
  is(Math.abs(geo - ari) > 0.1,
     "the two rules differ for the Sun (geometric " + geo.toFixed(2) +
     " vs arithmetic " + ari.toFixed(2) + " virūpa)");
  /* The gap is widest where the two rays are most lopsided, because a
     geometric mean is dragged down by the smaller factor while an arithmetic
     one is not. Mercury here is uchcha ·051 against cheṣṭa ·794. */
  const gM = Math.sqrt(UCH.Mercury * CHE.Mercury) * 60,
        aM = (UCH.Mercury * 60 + CHE.Mercury * 60) / 2;
  is(Math.abs(gM - aM) > 10,
     "and differ hugely for Mercury (" + gM.toFixed(2) + " vs " + aM.toFixed(2) +
     " virūpa) — lopsided rays separate the two rules");
  const rSun = (Math.sqrt(UCH.Sun * CHE.Sun) * 60) / ((UCH.Sun + CHE.Sun) * 30);
  const rMer = gM / aM;
  is(Math.abs(rSun - rMer) > 0.01,
     "and the ratio between the rules is not constant (" + rSun.toFixed(3) +
     " vs " + rMer.toFixed(3) + ") — so one is not a rescaling of the other");
}

/* ------------------------------------------------------------ ENGINE CHECKS */
const BIRTH = { year:1990, month:3, day:15, hour:10, minute:30,
                lat:28.6139, lon:77.2090, tzHours:5.5 };
const browser = await chromium.launch();
const pg = await browser.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + CWD + "/kundli.html");
await pg.waitForFunction(() => window.buildLocalChart && window.SPSripati,
  null, { timeout: 45000 });
const [B, S] = await pg.evaluate((b) => ["whole", "sripati"].map((m) => {
  const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
  const by = {}; (J.shadbala.planets || []).forEach((p) => { by[p.graha] = p; });
  return { mode: J.house_system.mode, paddhati: J.paddhati,
           sb: by, ikNote: J.shadbala.ishta_kashta_note,
           phala: Object.fromEntries((J.grahas || []).map(
             (g) => [g.en || g.key, g.bhava_phala])) };
}), BIRTH);
await pg.close();
await browser.close();

head("=== ENGINE: the payload declares its paddhati ===");
is(B.paddhati && B.paddhati.mode === "bphs", "whole-sign declares bphs");
is(S.paddhati && S.paddhati.mode === "sripati", "Śrīpati declares sripati");
is(S.paddhati.excluded.length === 1 && /āyurdāya/.test(S.paddhati.excluded[0].why),
   "and says WHY Śrīpati's own daśā system is not computed");
is(S.paddhati.bphs_by_default.length > 0 && B.paddhati.bphs_by_default.length === 0,
   "and names what still follows BPHS because Śrīpati is silent on it");

head("=== ENGINE: bhāva-phala exists only where it is meaningful ===");
is(Object.values(B.phala).every((v) => v === null),
   "whole-sign emits no bhāva-phala — equal bhāvas make the question empty");
{
  const vals = Object.values(S.phala).filter(Boolean);
  is(vals.length >= 7, "Śrīpati emits it for every graha (" + vals.length + ")");
  is(vals.every((v) => v.weight >= 0 && v.weight <= 1), "every weight is within 0..1");
  is(vals.some((v) => v.direction === "aroha") &&
     vals.some((v) => v.direction === "avaroha"),
     "both āroha and avaroha occur — the madhya is actually being straddled");
  is(vals.every((v) => Math.abs(v.weight -
       (v.bhavamsa_deg ? v.deg_from_sandhi / v.bhavamsa_deg : 0)) < 1e-6),
     "the reported weight is exactly its own reported ratio, not rounded twice");
}

head("=== ENGINE: the paddhati branch bites where it should ===");
const G = Object.keys(UCH);
is(G.some((g) => Math.abs(B.sb[g].ayana - S.sb[g].ayana) > 1e-9),
   "Ayana Bala differs between paddhatis (24° parama-krānti vs obliquity)");
is(G.some((g) => Math.abs(B.sb[g].saptavargaja - S.sb[g].saptavargaja) > 1e-9),
   "Saptavargaja differs (halving ladder vs 45/30/20/15/10/4/2)");
is(B.sb.Sun.ishta_kashta_rule === "arithmetic" &&
   S.sb.Sun.ishta_kashta_rule === "geometric",
   "iṣṭa/kaṣṭa switches rule with the paddhati");
is(/Ch\. 28, v\. 6/.test(B.sb.Sun.ishta_kashta_source) &&
   /Adh\. 4, śl\. 6/.test(S.sb.Sun.ishta_kashta_source),
   "and each cites its own text, so neither is credited to the other");
is(/not BPHS's/.test(S.ikNote) && /later tradition, not this verse/.test(B.ikNote),
   "each note names the OTHER tradition explicitly, so a reader cannot mistake "+
   "which rule produced the column");
is(Math.abs(B.sb.Sun.ishta - (B.sb.Sun.uchcha + B.sb.Sun.cheshta) / 2) < 1e-9,
   "BPHS iṣṭa is the arithmetic mean in virūpas (Ch. 28 v. 6 reduced)");
is(Math.abs(B.sb.Sun.kashta - (60 - B.sb.Sun.ishta)) < 1e-9,
   "and BPHS kaṣṭa is its complement from 60");
is(Math.abs(S.sb.Sun.ishta -
     Math.sqrt(S.sb.Sun.uchcha * S.sb.Sun.cheshta)) < 1e-9,
   "Śrīpati iṣṭa is the geometric mean");

head("=== ENGINE: and NOWHERE ELSE ===");
is(Math.abs(B.sb.Sun.naisargika - S.sb.Sun.naisargika) < 1e-9,
   "Naisargika is identical — both texts give it, identically");
is(G.every((g) => Math.abs(B.sb[g].naisargika - S.sb[g].naisargika) < 1e-9),
   "for every graha");
is(Math.abs(B.sb.Sun.tribhaga - S.sb.Sun.tribhaga) < 1e-9,
   "Tribhāga is identical — BPHS Ch.27 v.12 and Śrīpati Adh.3 śl.13 agree");
is(G.every((g) => B.sb[g].required_rupa === S.sb[g].required_rupa),
   "the required-Ṣaḍbala figures are identical in both (390/360/300/420/390/330/300)");
is(G.every((g) => Math.abs(B.sb[g].uchcha - S.sb[g].uchcha) < 1e-9),
   "Uchcha Bala is identical — both reduce to the arc from debilitation");

head("Page errors");
is(errs.length === 0, errs.length ? errs.slice(0, 3).join(" | ") : "none");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
