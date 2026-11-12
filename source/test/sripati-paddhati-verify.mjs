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

/* saptavarga iṣṭa / kaṣṭa, Adh. 4 śl. 8–11 — tables p.66 (good, evil) and
   p.68 (śubha / aśubha paṅkti), rows Rāśi, Horā, Drekkāṇa, Saptāṃśa,
   Navāṃśa, Dvādaśāṃśa, Triṃśāṃśa; printed to three decimals */
const SV_GOOD = { Sun:[.375,.187,.25,.25,.125,.187,.062], Moon:[.25,.25,.125,.125,.125,.187,.125],
  Mars:[.375,.187,.25,.187,.187,.125,.25], Mercury:[.25,.187,.031,.125,.125,.125,.125],
  Jupiter:[.75,.062,.25,.25,.187,.25,.187], Venus:[.25,.015,.015,.062,.015,.187,.031],
  Saturn:[.125,.062,.031,.062,.031,.031,.062] };
const SV_EVIL = { Sun:[.625,.313,.25,.25,.375,.313,.438], Moon:[.75,.25,.375,.375,.375,.313,.375],
  Mars:[.625,.313,.25,.313,.313,.375,.25], Mercury:[.75,.313,.469,.375,.375,.375,.375],
  Jupiter:[.25,.438,.25,.25,.313,.25,.313], Venus:[.75,.485,.485,.437,.485,.313,.468],
  Saturn:[.875,.437,.468,.437,.468,.468,.437] };
const SV_TOT = { Sun:[1.437,2.562], Moon:[1.187,2.813], Mars:[1.562,2.437], Mercury:[.968,3.031],
  Jupiter:[1.937,2.063], Venus:[.578,3.422], Saturn:[.406,3.593] };
const SV_GRIHA = { Sun:[.359,.640], Moon:[.297,.703], Mars:[.390,.609], Mercury:[.242,.758],
  Jupiter:[.484,.516], Venus:[.144,.855], Saturn:[.101,.898] };

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
           bhavaBala: J.bhava_bala, bhavaBalaNote: J.bhava_bala_note,
           phala: Object.fromEntries((J.grahas || []).map(
             (g) => [g.en || g.key, g.bhava_phala])) };
}), BIRTH);
const BB = { whole: B.bhavaBala, sri: S.bhavaBala, note: S.bhavaBalaNote };
/* his saptavarga tables, from HIS longitudes and HIS bhāvas (sandhis p.12) */
const SV = await pg.evaluate(([lon, sandhi]) => {
  const fwd = (a, b) => ((b - a) % 360 + 360) % 360;
  const bhavaOf = (g) => { const L = lon[g];
    for (let h = 1; h <= 12; h++) { const lo = sandhi[(h - 2 + 12) % 12], hi = sandhi[h - 1];
      if (fwd(lo, L) < fwd(lo, hi)) return h; } return 1; };
  return window.sripatiSaptavargaIK ? window.sripatiSaptavargaIK(lon, bhavaOf) : null;
}, [LON, SANDHI]);
const SVS = await pg.evaluate((b) => {
  const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: "sripati" }));
  const K = window.buildLocalChart(Object.assign({}, b, { houseSystem: "whole" }));
  const hs = window.buildKundliReport(J), hb = window.buildKundliReport(K);
  return { sri: J.shadbala.saptavarga_ishta_kashta, bphs: K.shadbala.saptavarga_ishta_kashta,
           shownSri: /second method — through the seven vargas/.test(hs),
           shownBphs: /second method — through the seven vargas/.test(hb) };
}, BIRTH);
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

/* ---------------------------------------------------- BHĀVA BALA, Adh. 3 ---
   His ṣaḍbala table, p.52, in rūpa — the input his bhāva bala consumes. */
const SB_BOOK = { Sun:9.015, Moon:8.197, Mars:7.731, Mercury:6.209,
                  Jupiter:8.613, Venus:7.459, Saturn:3.844 };
const LORD_OF = ["Mars","Venus","Mercury","Moon","Sun","Mercury",
                 "Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
const BOOK_SVAMI = [7.781,6.908,5.900,7.789,9.530,7.043,7.392,7.130,7.845,4.822,4.136,8.648];
const BOOK_DIG   = [0.462,0.308,0.692,1.000,0.179,0.179,null,0.846,0.308,1.000,0.641,0.358];
const CLS = (sg, deg) =>
  (sg===2||sg===6||sg===5||sg===10) ? "biped" :
  sg===8 ? (deg<15?"biped":"quadruped") :
  sg===9 ? (deg<15?"quadruped":"watery") :
  (sg===0||sg===1||sg===4) ? "quadruped" : sg===7 ? "keeta" : "watery";
const WEAKB = { biped:7, quadruped:4, watery:10, keeta:1 };

head("=== BOOK: bhāva-svāmi bala, Adh. 3 śl. 20–23 against his table p.56 ===");
for (let h = 1; h <= 12; h++) {
  const lo = arambha(h), wid = fwd(lo, virama(h));
  let sv = 0, cur = lo, done = 0, nParts = 0;
  while (done < wid - 1e-9) {
    const sg = Math.floor(cur / 30) % 12;
    let toEdge = (sg + 1) * 30 - cur; if (toEdge <= 1e-12) toEdge = 30;
    const step = Math.min(toEdge, wid - done);
    sv += (step / 30) * SB_BOOK[LORD_OF[sg]];
    cur = (cur + step) % 360; done += step; nParts++;
  }
  near(sv, BOOK_SVAMI[h - 1], 0.004,
    "bhāva " + h + " svāmi bala (" + nParts + " rāśi span" + (nParts > 1 ? "s" : "") + ")");
}
head("=== BOOK: and ÷30 is the rule, not ÷the bhāva's own width ===");
{
  /* bhāva 2 settles it: it is 27.72° wide, so the two readings diverge */
  const h = 2, lo = arambha(h), wid = fwd(lo, virama(h));
  let byThirty = 0, byWidth = 0, cur = lo, done = 0;
  while (done < wid - 1e-9) {
    const sg = Math.floor(cur / 30) % 12;
    let toEdge = (sg + 1) * 30 - cur; if (toEdge <= 1e-12) toEdge = 30;
    const step = Math.min(toEdge, wid - done);
    byThirty += (step / 30) * SB_BOOK[LORD_OF[sg]];
    byWidth  += (step / wid) * SB_BOOK[LORD_OF[sg]];
    cur = (cur + step) % 360; done += step;
  }
  is(Math.abs(wid - 30) > 2, "bhāva 2 is " + wid.toFixed(2) + "° wide, so the two readings differ");
  near(byThirty, BOOK_SVAMI[1], 0.004, "÷30 reproduces his printed 6·908");
  is(Math.abs(byWidth - BOOK_SVAMI[1]) > 0.4,
     "÷width gives " + byWidth.toFixed(3) + " and does not — so the weights " +
     "need not sum to one, and a narrow bhāva carries less than a full lord");
}

head("=== BOOK: bhāva dig bala, by the class of the madhya's rāśi ===");
for (let h = 1; h <= 12; h++) {
  const md = BHAVA[h - 1];
  const cl = CLS(Math.floor(md / 30) % 12, md % 30);
  let dd = Math.abs(fwd(BHAVA[WEAKB[cl] - 1], md)); if (dd > 180) dd = 360 - dd;
  const dig = dd / 3 / 60;
  if (BOOK_DIG[h - 1] == null) {
    /* Tulā in the 7th is biped, so its weak point is the 7th bhāva — itself.
       His table's ·830 in that column belongs to the adjacent row: with dig
       at nil his own total reconciles exactly (7·392 − ·093 + ·830 = 8·129). */
    near(dig, 0, 1e-9,
      "bhāva " + h + " (" + cl + ") is strengthless at its own madhya — dig bala nil");
  } else {
    near(dig, BOOK_DIG[h - 1], 0.004, "bhāva " + h + " dig bala (" + cl + ")");
  }
}

head("=== ENGINE: bhāva bala is produced, and only under Śrīpati ===");
is(BB.whole === null, "whole-sign emits no Śrīpati bhāva bala");
is(Array.isArray(BB.sri) && BB.sri.length === 12, "Śrīpati emits all twelve");
is(BB.sri.every((b) => Math.abs(b.total_rupa -
     (b.svami_rupa + (b.drg_virupa + b.guru_budha_virupa + b.dig_virupa) / 60)) < 1e-6),
   "each total is exactly its own four components, not rounded twice");
is(BB.sri.every((b) => b.spans.length >= 1 && b.spans.length <= 3),
   "every bhāva spans one to three rāśis");
is(BB.sri.some((b) => b.spans.length >= 2),
   "and at least one spans two — otherwise the pro-rating is never exercised");
is(BB.sri.every((b) => b.dig_virupa >= -1e-9 && b.dig_virupa <= 60 + 1e-9),
   "dig bala stays within nil to one rūpa");
is(new Set(BB.sri.map((b) => b.dig_class)).size >= 2,
   "more than one sign class occurs (" +
   [...new Set(BB.sri.map((b) => b.dig_class))].join(", ") + ")");
is(BB.note && /NOT applied/.test(BB.note),
   "and the payload says the ±1 rūpa occupancy rule is deliberately not applied");

head("=== ENGINE: tātkālika maitrī is read from the bhāva chakra ===");
is(/tātkālika maitrī read from the bhāva chakra/.test(
     (S.paddhati.follows_this_paddhati || []).join(" ")),
   "the paddhati block declares it, so the Ṣaḍbala shift is attributable");
is(G.some((g) => Math.abs(B.sb[g].sthana - S.sb[g].sthana) > 1e-9),
   "Sthāna Bala moves with it, as the chain Saptavargaja→Sthāna→Ṣaḍbala implies");

head("=== BOOK: saptavarga iṣṭa / kaṣṭa, Adh. 4 śl. 8–11, against his tables pp.66 and 68 ===");
is(!!SV, "the method is exposed (window.sripatiSaptavargaIK)");
if (SV) {
  /* he prints three decimals and TRUNCATES as often as he rounds (·0625 is
     printed ·062, ·03125 as ·031, ·4375 as ·437 and ·438): a cell matches if
     it is within one unit of the third decimal */
  let good = 0, evil = 0, cells = 0;
  for (const g of Object.keys(SV_GOOD)) for (let i = 0; i < 7; i++) {
    cells++;
    if (Math.abs(SV[g].good[i] - SV_GOOD[g][i]) <= 0.0011) good++;
    if (Math.abs(SV[g].evil[i] - SV_EVIL[g][i]) <= 0.0011) evil++;
  }
  is(good === cells, `every good-influence cell of his p.66 table (${good}/${cells})`);
  is(evil === cells, `every evil-influence cell (${evil}/${cells})`);
  is(Object.keys(SV_TOT).every((g) => Math.abs(SV[g].good_total_rupa - SV_TOT[g][0]) <= 0.003 &&
     Math.abs(SV[g].evil_total_rupa - SV_TOT[g][1]) <= 0.003), "every printed total, good and evil");
  is(Object.keys(SV_GRIHA).every((g) => Math.abs(SV[g].subha_panktee[0] - SV_GRIHA[g][0]) <= 0.0015 &&
     Math.abs(SV[g].asubha_panktee[0] - SV_GRIHA[g][1]) <= 0.0015), "every Gṛha row of the śubha and aśubha paṅkti (p.68)");
  is(Object.keys(SV_GRIHA).every((g) => SV[g].subha_panktee.slice(1).every((x) => Math.abs(x - SV[g].subha_panktee[0] / 2) < 1e-12)),
     "and the other six rows are half the Gṛha row, as śl. 11 says");
  /* the divergence from his own verse, asserted rather than hidden */
  is(SV.Sun.dignity[0] === "greatfriend" && SV.Saturn.dignity[0] === "neutral",
     "his table scores the Sun in Meṣa ⅜ and Saturn in Meṣa ⅛, not exaltation and debilitation");
  is(SV.Sun.verse_reading.dignity[0] === "exalted" && SV.Saturn.verse_reading.dignity[0] === "debilitated" &&
     SV.Sun.verse_reading.good_total_rupa > SV.Sun.good_total_rupa,
     "and the verse's reading, which does score them, is carried beside it as verse_reading");
}
is(SVS.sri && SVS.sri.grahas && Object.keys(SVS.sri.grahas).length === 7, "a Śrīpati chart carries it for all seven grahas");
is(SVS.bphs && SVS.bphs.applies === false && /Śrīpati method/.test(SVS.bphs.reason), "a BPHS chart says why it is absent");
is(SVS.shownSri && !SVS.shownBphs, "the report shows the tables under Śrīpati and not under BPHS");

head("Page errors");
is(errs.length === 0, errs.length ? errs.slice(0, 3).join(" | ") : "none");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
