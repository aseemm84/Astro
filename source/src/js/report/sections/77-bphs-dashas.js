/* ============ The other daśās of BPHS Ch. 46 — conditional, rāśi and Kālacakra ============

   WHAT THIS IS. BPHS Vol. 2 Ch. 46 names many daśā systems besides Viṃśottarī.
   Viṃśottarī, Aṣṭottarī and Yoginī were already on the site. This module
   computes the rest that the chapter gives working rules for, each from the
   verse that states it, in the uploaded Santhanam translation:

     conditional nakṣatra daśās  vv. 24–43  Ṣoḍaśottarī, Dvādaśottarī,
                                            Pañcottarī, Śatābdikā,
                                            Caturaśīti-sama, Dvisaptati-sama,
                                            Ṣaṣṭi-hāyanī, Ṣaṭtriṃśat-sama
     Kāla daśā                   vv. 44–49
     Cakra daśā                  vv. 50–51
     Kālacakra daśā              vv. 52–91 (balance also v. 93)
     Chara daśā (BPHS)           vv. 155–167
     Sthira daśā + Brahma Graha  vv. 168–173
     Yogārdha daśā               v.  174
     Kendrādi daśā (rāśi/graha)  vv. 175–177
     Kāraka daśā                 v.  178
     Maṇḍūka daśā                vv. 179–180
     Trikoṇa daśā                vv. 183–184
     Dṛg daśā                    vv. 185–187
     Rāśi (lagna-nakṣatra) daśā  vv. 188–190
     Sandhyā and Pācaka daśā     vv. 204–206
     Tārā daśā                   vv. 207–209

   WHAT IS DELIBERATELY NOT COMPUTED, and why, said in the pane too:
     Śūla daśā (vv. 181–182) — given "for determining the time of death";
     Piṇḍa, Aṃśa, Naisargika / Aṣṭakavarga daśās (vv. 201–203) — their spans
       ARE the piṇḍāyu/aṃśāyu/naisargikāyu longevity figures. This site states
       longevity doctrine and never computes a lifespan for a person;
     Pañcasvara daśā (vv. 191–194) — needs the first syllable of the native's
       name, and the letter-to-svara table did not survive the scan;
     Ṣaṣṭi-hāyanī PERIODS — the verse's nakṣatra-to-lord table is an image the
       scan lost; its condition, lords and years are given, its dates are not.

   READINGS, stated wherever used. The translation is OCR'd and sometimes
   garbled; where a rule is ambiguous the engine's reading is named beside the
   result, and where a worked example in the book contradicts the verse, both
   are named (bphs-dasha-verify.mjs pins every example that can be checked).

   None of this is a prediction. A daśā is a period with a name on it. */

var BD_NAK_LORDLESS = null;
var BD_SERIAL = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
var BD_CHARA_ODD_PADA = [0, 1, 2, 6, 7, 8];          /* Meṣa–Mithuna, Tulā–Dhanus: v. 155–156 */
function bdMod(a, n) { return ((a % n) + n) % n; }
function bdModality(s) { return s % 3; }             /* 0 movable, 1 fixed, 2 dual */
function bdOddSign(s) { return s % 2 === 0; }        /* Meṣa is the 1st, an odd sign */
function bdOddPada(s) { return BD_CHARA_ODD_PADA.indexOf(bdMod(s, 12)) >= 0; }
function bdSthiraYears(s) { return [7, 8, 9][bdModality(s)]; }
function bdStep(from, k, fwd) { return fwd ? bdMod(from + k, 12) : bdMod(from - k, 12); }
function bdNak(lon) { var seg = 40 / 3, m = bdMod(lon, 360), i = Math.floor(m / seg); return { i: i, frac: (m - i * seg) / seg }; }
function bdExalted(p, sign) { return EXALT[p] != null && EXALT[p] === sign; }
function bdDebil(p, sign) { return EXALT[p] != null && bdMod(EXALT[p] + 6, 12) === sign; }

/* --- context every system reads --- */
function bdContext(D, J) {
  var C = { D: D, J: J, P: D.P, LS: D.LS, lag: (D.lagna && D.lagna.sidereal_deg) || 0 };
  C.signOf = function (p) { return D.P[p] ? D.P[p].sign : null; };
  C.count = [0,0,0,0,0,0,0,0,0,0,0,0];
  BD_SERIAL.forEach(function (p) { var s = C.signOf(p); if (s != null) C.count[s]++; });
  var moon = D.P.Moon ? D.P.Moon.sid : 0, sun = D.P.Sun ? D.P.Sun.sid : 0;
  C.nak = bdNak(moon);
  C.shukla = bdMod(moon - sun, 360) < 180;
  /* horā of the lagna (Parāśarī): odd sign — first half Sun, second Moon; even reversed */
  var ls = Math.floor(bdMod(C.lag, 360) / 30), ld = bdMod(C.lag, 30);
  C.lagnaHora = (bdOddSign(ls) === (ld < 15)) ? "Sun" : "Moon";
  C.navLagna = Math.floor(bdMod(C.lag, 360) / (10 / 3)) % 12;
  C.d12Lagna = bdMod(ls + Math.floor(ld / 2.5), 12);
  /* day / night / the two sandhyās of vv. 44–49: five ghaṭikās (2 h) each side
     of sunrise and of sunset. Before sunrise, the previous evening's sunset is
     taken as today's less 24 h, and after sunset the next sunrise as today's
     plus 24 h — a few minutes' error at most, stated in the pane. */
  var inp = D.input || {}, h = (inp.hour || 0) + (inp.minute || 0) / 60;
  C.timeOk = D.sunriseH != null && D.sunsetH != null;
  if (C.timeOk) {
    var r = D.sunriseH, s = D.sunsetH, seg;
    if (h >= r - 2 && h < r + 2) seg = { kind: "sandhya", name: "Khaṇḍa (the morning sandhyā)", start: r - 2 };
    else if (h >= r + 2 && h < s - 2) seg = { kind: "day", name: "Mugdha (day)", start: r + 2 };
    else if (h >= s - 2 && h < s + 2) seg = { kind: "sandhya", name: "Sudhā (the evening sandhyā)", start: s - 2 };
    else if (h >= s + 2) seg = { kind: "night", name: "Pūrṇa (night)", start: s + 2 };
    else seg = { kind: "night", name: "Pūrṇa (night)", start: s + 2 - 24 };
    seg.pastGhatika = (h - seg.start) / 0.4;
    C.seg = seg;
    C.isDay = h >= r && h < s;
  }
  C.sb = {};
  ((J && J.shadbala && J.shadbala.planets) || []).forEach(function (p) { C.sb[p.graha] = p.total_virupa; });
  return C;
}

/* the sign-strength rule the chapter states for Vṛścika/Kumbha (vv. 158–166):
   a sign with more grahas is stronger; then dual > fixed > movable. Used
   wherever the chapter says "whichever is stronger" between two signs and
   gives no other test — that reuse is the engine's reading, and is said. */
function bdSignStronger(C, a, b) {
  if (C.count[a] !== C.count[b]) return C.count[a] > C.count[b] ? a : b;
  if (bdModality(a) !== bdModality(b)) return bdModality(a) > bdModality(b) ? a : b;
  return null;
}
function bdSignRank(C, signs) {
  return signs.slice().sort(function (a, b) {
    if (C.count[a] !== C.count[b]) return C.count[b] - C.count[a];
    return bdModality(b) - bdModality(a);
  });
}
function bdStrongerLagna7(C) {
  var a = C.LS, b = bdMod(C.LS + 6, 12), w = bdSignStronger(C, a, b);
  return { sign: w == null ? a : w, tie: w == null };
}

/* ---- BPHS Chara years, vv. 155–166 ---- */
function bdCharaSignYears(C, sg) {
  var fwd = bdOddPada(sg), dist = function (to) { return fwd ? bdMod(to - sg, 12) : bdMod(sg - to, 12); };
  var lords = [LORD[sg]]; if (sg === 7) lords.push("Ketu"); if (sg === 10) lords.push("Rahu");
  var at = lords.map(function (l) { return { lord: l, at: C.signOf(l) }; }).filter(function (x) { return x.at != null; });
  var pick, why;
  if (at.length === 1) { pick = at[0]; why = "lord " + pick.lord; }
  else {
    var inSelf = at.filter(function (x) { return x.at === sg; }), out = at.filter(function (x) { return x.at !== sg; });
    if (inSelf.length === 2) { return { years: 12, lord: at[0].lord + " & " + at[1].lord, fwd: fwd, why: "both lords in the sign itself → 12 (v. 158)" }; }
    if (inSelf.length === 1) { pick = out[0]; why = inSelf[0].lord + " is in the sign, so count to " + pick.lord + " (v. 159)"; }
    else {
      var ex = out.filter(function (x) { return BD_SERIAL.some(function (p) { return C.signOf(p) === x.at && bdExalted(p, x.at); }); });
      if (ex.length === 1) { pick = ex[0]; why = "count to " + pick.lord + ": its sign holds an exalted graha (v. 165)"; }
      else {
        var w = bdSignStronger(C, out[0].at, out[1].at);
        if (w != null) { pick = out[0].at === w ? out[0] : out[1];
          why = "count to " + pick.lord + ": its sign is stronger (" + (C.count[out[0].at] !== C.count[out[1].at] ? "more grahas" : "dual > fixed > movable") + ", vv. 160–164)"; }
        else { var d0 = dist(out[0].at), d1 = dist(out[1].at); pick = d0 >= d1 ? out[0] : out[1];
          why = "the two signs are equal in strength; count to the larger number (v. 164)"; }
      }
    }
  }
  var d = dist(pick.at), y = d === 0 ? 12 : d, adj = 0;
  if (bdExalted(pick.lord, pick.at)) adj = 1; else if (bdDebil(pick.lord, pick.at)) adj = -1;
  return { years: y + adj, base: y, adj: adj, lord: pick.lord, lordAt: pick.at, fwd: fwd,
           why: why + "; " + (d === 0 ? "in the sign itself → 12" : (d + 1) + " signs counted " + (fwd ? "forward" : "backward") + " − 1") +
                (adj ? (adj > 0 ? "; +1, lord exalted" : "; −1, lord debilitated") + " (v. 166)" : "") };
}

/* ---- period lists ---- */
function bdLay(list, jd0, balanceYears) {
  var t = jd0;
  list.forEach(function (p, i) {
    var y = (i === 0 && balanceYears != null) ? balanceYears : p.years;
    p.run = y; p.start = t; p.end = t + y * DPY; t = p.end;
    if (i === 0 && balanceYears != null) p.partial = true;
  });
  return list;
}
function bdSignSeq(start, fwd, yearsFn) {
  var out = []; for (var k = 0; k < 12; k++) { var s = bdStep(start, k, fwd); out.push({ sign: s, years: yearsFn(s) }); }
  return out;
}
/* repeat a sequence to cover 120 years from birth */
function bdCover(list, jd0, bal, span) {
  var base = list.slice(), out = [], k = 0, el = 0;
  span = span || 120;
  while (el < span && k < 400) {
    var b = base[k % base.length], p = {}; for (var x in b) p[x] = b[x];
    p.cycle = Math.floor(k / base.length) + 1; out.push(p);
    el += (k === 0 && bal != null) ? bal : p.years; k++;
  }
  return bdLay(out, jd0, bal);
}

/* ---- the conditional nakṣatra daśās, vv. 24–43 ---- */
var BD_COND = [
  { key: "shodashottari", name: "Ṣoḍaśottarī", total: 116, verses: "vv. 24–26", from: 7, div: 8,
    lords: ["Sun", "Mars", "Jupiter", "Saturn", "Ketu", "Moon", "Mercury", "Venus"], years: [11, 12, 13, 14, 15, 16, 17, 18] },
  { key: "dvadashottari", name: "Dvādaśottarī", total: 112, verses: "vv. 27–28", toRevati: true, div: 8,
    lords: ["Sun", "Jupiter", "Ketu", "Mercury", "Rahu", "Mars", "Saturn", "Moon"], years: [7, 9, 11, 13, 15, 17, 19, 21] },
  { key: "panchottari", name: "Pañcottarī", total: 105, verses: "vv. 29–31", from: 16, div: 7,
    lords: ["Sun", "Mercury", "Saturn", "Mars", "Venus", "Moon", "Jupiter"], years: [12, 13, 14, 15, 16, 17, 18] },
  { key: "shatabdika", name: "Śatābdikā", total: 100, verses: "vv. 32–33", from: 26, div: 7,
    lords: ["Sun", "Moon", "Venus", "Mercury", "Jupiter", "Mars", "Saturn"], years: [5, 5, 10, 10, 20, 20, 30] },
  { key: "chaturashiti", name: "Caturaśīti-sama", total: 84, verses: "vv. 34–36", from: 14, div: 7,
    lords: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"], years: [12, 12, 12, 12, 12, 12, 12] },
  { key: "dvisaptati", name: "Dvisaptati-sama", total: 72, verses: "vv. 37–39", from: 18, div: 8,
    lords: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"], years: [9, 9, 9, 9, 9, 9, 9, 9] },
  { key: "shattrimshat", name: "Ṣaṭtriṃśat-sama", total: 36, verses: "vv. 42–43", from: 21, div: 8,
    lords: ["Moon", "Sun", "Jupiter", "Mars", "Mercury", "Saturn", "Venus", "Rahu"], years: [1, 2, 3, 4, 5, 6, 7, 8] }
];
/* the count the verses prescribe, inclusive of both ends (vv. 29–33, 42–43
   worked examples all confirm inclusive; the v. 34–36 example does not — see
   the pane). Returns the lord index. */
function bdCondIndex(sys, ni) {
  var n = sys.toRevati ? (26 - ni + 1) : (bdMod(ni - sys.from, 27) + 1);
  var r = n % sys.div; return (r === 0 ? sys.div : r) - 1;
}
function bdCondApplies(sys, C) {
  var LS = C.LS, L1 = LORD[LS], L7s = bdMod(LS + 6, 12), L10s = bdMod(LS + 9, 12);
  switch (sys.key) {
    case "shodashottari": {
      var verse = (!C.shukla && C.lagnaHora === "Sun") || (C.shukla && C.lagnaHora === "Moon");
      var ex = (C.shukla && C.lagnaHora === "Sun") || (!C.shukla && C.lagnaHora === "Moon");
      return { applies: verse, alt: ex,
        test: "lagna in the Sun's horā in Kṛṣṇa pakṣa, or the Moon's horā in Śukla pakṣa (the verse as usually read)",
        alt_test: "The translator's own example pairs Śukla pakṣa with the Sun's horā; by that pairing it " + (ex ? "applies" : "does not apply"),
        found: (C.shukla ? "Śukla" : "Kṛṣṇa") + " pakṣa, lagna in the " + C.lagnaHora + "'s horā" };
    }
    case "dvadashottari":
      return { applies: LORD[C.navLagna] === "Venus", test: "lagna in a navāṃśa of Venus (Vṛṣabha or Tulā)",
               found: "lagna navāṃśa " + SA[C.navLagna] + " (" + LORD[C.navLagna] + ")" };
    case "panchottari":
      return { applies: LS === 3 && C.d12Lagna === 3, test: "lagna Karka, in the Karka dvādaśāṃśa",
               found: "lagna " + SA[LS] + ", dvādaśāṃśa " + SA[C.d12Lagna] };
    case "shatabdika":
      return { applies: LS === C.navLagna, test: "vargottama lagna (same sign in rāśi and navāṃśa)",
               found: "lagna " + SA[LS] + ", navāṃśa " + SA[C.navLagna] };
    case "chaturashiti": {
      var l10 = LORD[L10s], at = C.signOf(l10);
      return { applies: at === L10s, test: "the 10th lord in the 10th (counted in signs from the lagna)",
               found: "10th lord " + l10 + " in " + (at == null ? "—" : SA[at]) };
    }
    case "dvisaptati": {
      var a1 = C.signOf(L1), l7 = LORD[L7s], a7 = C.signOf(l7);
      return { applies: a1 === L7s || a7 === LS, test: "the lagna lord in the 7th, or the 7th lord in the lagna (signs)",
               found: "lagna lord " + L1 + " in " + SA[a1] + "; 7th lord " + l7 + " in " + SA[a7] };
    }
    case "shattrimshat":
      if (!C.timeOk) return { applies: null, test: "day birth with lagna in the Sun's horā, or night birth in the Moon's horā", found: "sunrise/sunset unavailable" };
      return { applies: (C.isDay && C.lagnaHora === "Sun") || (!C.isDay && C.lagnaHora === "Moon"),
               test: "day birth with lagna in the Sun's horā, or night birth with lagna in the Moon's horā",
               found: (C.isDay ? "day" : "night") + " birth, lagna in the " + C.lagnaHora + "'s horā" };
  }
  return { applies: null, test: "", found: "" };
}
function bdConditional(C) {
  var out = [];
  BD_COND.forEach(function (sys) {
    var i0 = bdCondIndex(sys, C.nak.i), bal = sys.years[i0] * (1 - C.nak.frac), list = [];
    for (var k = 0; k < sys.lords.length; k++) { var j = (i0 + k) % sys.lords.length; list.push({ lord: sys.lords[j], years: sys.years[j] }); }
    var per = bdCover(list, C.D.jd, bal), ap = bdCondApplies(sys, C);
    out.push({ key: sys.key, name: sys.name, verses: "BPHS Vol. 2 Ch. 46 " + sys.verses, total_years: sys.total,
      count: sys.toRevati ? "janma nakṣatra to Revatī, inclusive, ÷ " + sys.div : "from " + NAKS[sys.from] + " to the janma nakṣatra, inclusive, ÷ " + sys.div,
      opening: sys.lords[i0], balance_years: bal, condition: ap, periods: per,
      lords: sys.lords, years: sys.years });
  });
  /* Ṣaṣṭi-hāyanī, vv. 40–41: condition and lords only */
  var sunL = C.signOf("Sun") === C.LS;
  out.push({ key: "shashtihayani", name: "Ṣaṣṭi-hāyanī", verses: "BPHS Vol. 2 Ch. 46 vv. 40–41", total_years: 60,
    lords: ["Jupiter", "Sun", "Mars", "Moon", "Mercury", "Venus", "Saturn", "Rahu"], years: [10, 10, 10, 6, 6, 6, 6, 6],
    condition: { applies: sunL, test: "the Sun in the lagna (sign)", found: "Sun in " + SA[C.signOf("Sun")] + ", lagna " + SA[C.LS] },
    periods: null,
    not_computed: "The verse allots the 28 nakṣatras (Abhijit included) to the eight lords in a table that is an image the uploaded scan lost; " +
      "the example fixes only that the Sun's group holds four nakṣatras with Rohiṇī before Mṛgaśirā. Dates would need the table, so none are given. " +
      "The text reads 13 years for Jupiter, the Sun and Mars; its own example (four nakṣatras at 2½ years) gives 10, and 3×10 + 5×6 = 60 is the system's name — 10 is used." });
  return out;
}

/* ---- Kāla daśā, vv. 44–49 ---- */
function bdKala(C) {
  if (!C.timeOk || !C.seg) return { available: false, reason: "sunrise and sunset could not be computed for this place and date" };
  var mult = C.seg.kind === "sandhya" ? 4 : 2, base = C.seg.pastGhatika * mult / 15;
  var list = BD_SERIAL.map(function (p, i) { return { lord: p, years: base * (i + 1), serial: i + 1 }; });
  return { available: true, verses: "BPHS Vol. 2 Ch. 46 vv. 44–49", segment: C.seg.name, past_ghatikas: C.seg.pastGhatika,
    multiplier: mult + "/15", unit_years: base, total_years: base * 45, periods: bdLay(list, C.D.jd, null),
    note: "Each graha's span is the unit × its serial number (Sun 1 … Ketu 9). Sandhyās are five ghaṭikās (2 h) either side of sunrise and sunset; " +
      "for a birth before sunrise the previous sunset is taken as today's less 24 h, after sunset the next sunrise as today's plus 24 h (minutes at most)." };
}

/* ---- Cakra daśā, vv. 50–51 ---- */
function bdCakra(C) {
  if (!C.timeOk || !C.seg) return { available: false, reason: "sunrise and sunset could not be computed" };
  var start, why;
  if (C.seg.kind === "sandhya") { start = bdMod(C.LS + 1, 12); why = "birth in a sandhyā → from the 2nd sign"; }
  else if (C.seg.kind === "night") { start = C.LS; why = "night birth → from the lagna"; }
  else { start = C.signOf(LORD[C.LS]); why = "day birth → from the sign of the lagna lord (" + LORD[C.LS] + ")"; }
  return { available: true, verses: "BPHS Vol. 2 Ch. 46 vv. 50–51", start: start, why: why,
    periods: bdCover(bdSignSeq(start, true, function () { return 10; }), C.D.jd, null) };
}

/* ---- Kālacakra, vv. 52–91, 93 ---- */
var BD_KC_SAVYA_A = [[0,1,2,3,4,5,6,7,8],[9,10,11,7,6,5,3,4,2],[1,0,11,10,9,8,0,1,2],[3,4,5,6,7,8,9,10,11]];
var BD_KC_SAVYA_B = [[7,6,5,3,4,2,1,0,11],[10,9,8,0,1,2,3,4,5],[6,7,8,9,10,11,7,6,5],[3,4,2,1,0,11,10,9,8]];
function bdRev(a) { return a.slice().reverse(); }
var BD_KC_APS_R = [bdRev(BD_KC_SAVYA_B[3]), bdRev(BD_KC_SAVYA_B[2]), bdRev(BD_KC_SAVYA_B[1]), bdRev(BD_KC_SAVYA_B[0])];
var BD_KC_APS_M = [bdRev(BD_KC_SAVYA_A[3]), bdRev(BD_KC_SAVYA_A[2]), bdRev(BD_KC_SAVYA_A[1]), bdRev(BD_KC_SAVYA_A[0])];
var BD_KC_GROUP = (function () {
  var g = []; [0,6,12,18,24,2,8,14,20,26].forEach(function (n) { g[n] = "A"; });
  [1,7,13,19,25].forEach(function (n) { g[n] = "B"; }); [3,9,15,21].forEach(function (n) { g[n] = "R"; });
  [4,5,10,11,16,17,22,23].forEach(function (n) { g[n] = "M"; }); return g; })();
var BD_KC_YEARS = { Sun: 5, Moon: 21, Mars: 7, Mercury: 9, Jupiter: 10, Venus: 16, Saturn: 4 };
function bdKcSeq(ni, pada) {
  var g = BD_KC_GROUP[ni];
  var t = g === "A" ? BD_KC_SAVYA_A : g === "B" ? BD_KC_SAVYA_B : g === "R" ? BD_KC_APS_R : BD_KC_APS_M;
  var seq = t[pada], savya = (g === "A" || g === "B");
  return { seq: seq, savya: savya, group: g,
           deha: savya ? seq[0] : seq[8], jiva: savya ? seq[8] : seq[0] };
}
function bdKcGati(a, b) {
  /* vv. 96–100: Maṇḍūkī — a jump over one sign (Kanyā→Karka, Siṃha→Mithuna);
     Markaṭī — back to the previous sign (Siṃha→Karka); Siṃhāvalokana —
     Mīna→Vṛścika, Dhanus→Meṣa, the long jumps between trines. */
  if ((a === 5 && b === 3) || (a === 4 && b === 2) || (a === 2 && b === 4) || (a === 3 && b === 5)) return "Maṇḍūkī";
  if ((a === 4 && b === 3) || (a === 3 && b === 4)) return "Markaṭī";
  if ((a === 11 && b === 7) || (a === 8 && b === 0) || (a === 7 && b === 11) || (a === 0 && b === 8)) return "Siṃhāvalokana";
  return null;
}
function bdKalacakra(C) {
  var moon = bdMod(C.P.Moon.sid, 360), padaAll = Math.floor(moon / (10 / 3)), ni = Math.floor(padaAll / 4), pada = padaAll % 4;
  var fracPada = (moon - padaAll * (10 / 3)) / (10 / 3);
  var K = bdKcSeq(ni, pada), total = K.seq.reduce(function (a, s) { return a + BD_KC_YEARS[LORD[s]]; }, 0);
  var expired = total * fracPada, acc = 0, i0 = 0;
  while (i0 < 9 && acc + BD_KC_YEARS[LORD[K.seq[i0]]] <= expired) { acc += BD_KC_YEARS[LORD[K.seq[i0]]]; i0++; }
  var list = [], prev = null, pa = padaAll, first = true, el = 0, idx = i0, guard = 0;
  while (el < 120 && guard < 200) {
    var KK = bdKcSeq(Math.floor(pa / 4) % 27, pa % 4);
    for (; idx < 9 && el < 120; idx++) {
      var s = KK.seq[idx], y = BD_KC_YEARS[LORD[s]], run = first ? (acc + y - expired) : y;
      list.push({ sign: s, lord: LORD[s], years: y, amsha_pada: (pa % 108), gati: prev == null ? null : bdKcGati(prev, s),
                  deha: idx === (KK.savya ? 0 : 8), jiva: idx === (KK.savya ? 8 : 0), savya: KK.savya });
      prev = s; el += run; first = false;
    }
    idx = 0; pa = (pa + 1) % 108; guard++;
  }
  var bal = acc + BD_KC_YEARS[LORD[K.seq[i0]]] - expired;
  return { verses: "BPHS Vol. 2 Ch. 46 vv. 52–91, 93", nakshatra: NAKS[ni], pada: pada + 1,
    chakra: K.savya ? "Savya" : "Apasavya", group_of: { A: "Aśvinī", B: "Bharaṇī", R: "Rohiṇī", M: "Mṛgaśirā" }[K.group],
    navamsha: SA[padaAll % 12], deha: K.deha, jiva: K.jiva, sequence: K.seq, pada_total_years: total,
    expired_years: expired, balance_years: bal, periods: bdLay(list, C.D.jd, bal),
    reading: "v. 89's table assigns 100/85/83/86 years by the navāṃśa sign, but both worked examples (vv. 90–93) take the total as the sum of the nine daśā years of the pāda — that sum is used, and it is what the two examples give. " +
      "The expired part is the pāda's elapsed fraction by the Moon's longitude (v. 93, kalās ÷ 200); vv. 90–91 divide by a nominal 15 ghaṭikās instead. " +
      "After the ninth sign the next pāda's nine follow — the engine's reading of how the sequence continues. vv. 99–100 name the gatis by one direction (Kanyā→Karka, Siṃha→Mithuna, Siṃha→Karka, Mīna→Vṛścika, Dhanus→Meṣa); the same jumps run the other way in the Apasavya chakra and are named alike. Deha and jīva are marked by position: the first and last amśa of each pāda (v. 94–95)." };
}

/* ---- the rāśi daśās, vv. 155–190, 204–209 ---- */
function bdBrahma(C) {
  var R = bdStrongerLagna7(C), cands = [], LSr = R.sign;
  [6, 8, 12].forEach(function (h) { var s = bdMod(LSr + h - 1, 12); cands.push({ h: h, lord: LORD[s], house: s }); });
  var deg = function (p) { var g = C.P[p]; if (!g) return 0; var d = bdMod(g.sid, 30); return (p === "Rahu" || p === "Ketu") ? 30 - d : d; };
  var within = [0, 1, 2, 3, 4, 5].map(function (k) { return bdMod(LSr - k, 12); });
  var q = cands.filter(function (c) { var at = C.signOf(c.lord);
    return (at != null && bdOddSign(at) && within.indexOf(at) >= 0) || (c.h === 8 && at === c.house); });
  var how;
  if (q.length) {
    q.sort(function (a, b) { return deg(b.lord) - deg(a.lord) || (C.sb[b.lord] || 0) - (C.sb[a.lord] || 0); });
    how = q.length > 1 ? "several qualify; the one furthest through its sign is taken (v. 173)" : "the one that qualifies";
  } else {
    q = cands.slice().sort(function (a, b) { return (C.sb[b.lord] || 0) - (C.sb[a.lord] || 0); });
    how = "none of the three lords stands in an odd sign within six signs of " + SA[LSr] + "; the strongest by Ṣaḍbala is taken (the text names no fallback — this is the engine's)";
  }
  return { graha: q[0].lord, sign: C.signOf(q[0].lord), from: LSr, from_tie: R.tie, how: how,
           candidates: cands.map(function (c) { return { house: c.h, lord: c.lord, at: C.signOf(c.lord) }; }) };
}
function bdRashiDashas(C) {
  var R = {}, jd = C.D.jd, S = bdStrongerLagna7(C);
  var strongNote = "Stronger of the lagna and the 7th by the sign-strength rule of vv. 160–164 (more grahas; then dual > fixed > movable)" + (S.tie ? "; the two tie and the lagna is taken" : "");
  var charaY = {}; for (var s = 0; s < 12; s++) charaY[s] = bdCharaSignYears(C, s);

  /* Chara — direction from the pāda of the 9th sign (v. 167) */
  var ninth = bdMod(C.LS + 8, 12), cFwd = bdOddPada(ninth);
  R.chara = { name: "Chara (BPHS)", verses: "vv. 155–167", start: C.LS, forward: cFwd,
    why: "the 9th sign " + SA[ninth] + " is in an " + (cFwd ? "odd" : "even") + " pāda, so the daśās run " + (cFwd ? "forward" : "backward") + " from the lagna (v. 167)",
    periods: bdCover(bdSignSeq(C.LS, cFwd, function (x) { return charaY[x].years; }).map(function (p) {
      var c = charaY[p.sign]; p.lord = c.lord; p.why = c.why; return p; }), jd, null),
    years_note: "After the twelve, the sequence repeats from the lagna (the translator's note to v. 167)." };

  /* Sthira — from the Brahma Graha's sign */
  var B = bdBrahma(C), sFwd = bdOddSign(B.sign);
  R.sthira = { name: "Sthira", verses: "vv. 168–173", start: B.sign, forward: sFwd, brahma: B,
    why: "Brahma Graha " + B.graha + " in " + SA[B.sign] + ", an " + (sFwd ? "odd sign → forward" : "even sign → backward") + "; movable 7, fixed 8, dual 9 years",
    periods: bdCover(bdSignSeq(B.sign, sFwd, bdSthiraYears), jd, null),
    reading: "Brahma Graha: of the lords of the 6th, 8th and 12th from the stronger of the lagna and 7th, one in an odd sign within the six signs counted back from it (the translator's example counts backward and includes the sign itself), or the 8th lord in the 8th. Some lineages exclude Saturn and the nodes; the translation admits them." };

  /* Yogārdha — v. 174 */
  var yFwd = bdOddSign(S.sign);
  R.yogardha = { name: "Yogārdha", verses: "v. 174", start: S.sign, forward: yFwd, why: strongNote + "; " + (yFwd ? "odd → forward" : "even → backward"),
    periods: bdCover(bdSignSeq(S.sign, yFwd, function (x) { return (charaY[x].years + bdSthiraYears(x)) / 2; }), jd, null) };

  /* Kendrādi (rāśi) — vv. 175–177 */
  var kFwd = bdOddSign(S.sign), kseq = [];
  [[0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11]].forEach(function (grp, gi) {
    var signs = grp.map(function (k) { return bdStep(S.sign, k, kFwd); });
    var ranked = gi === 0 ? [S.sign].concat(bdSignRank(C, signs.slice(1))) : bdSignRank(C, signs);
    ranked.forEach(function (x) { kseq.push({ sign: x, years: charaY[x].years, group: ["kendra", "paṇaphara", "āpoklima"][gi] }); });
  });
  R.kendradi = { name: "Kendrādi (rāśi)", verses: "vv. 175–176", start: S.sign, forward: kFwd,
    why: strongNote + "; kendras, then paṇapharas, then āpoklimas counted " + (kFwd ? "forward" : "backward") + ", each group in order of sign strength; Chara years",
    periods: bdCover(kseq, jd, null) };

  /* Kendrādi (graha, from the ātmakāraka) — vv. 175–177 */
  var AK = bdKarakas8(C)[0], akS = C.signOf(AK), gFwd = bdOddSign(akS), gseq = [];
  [[0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11]].forEach(function (grp, gi) {
    var signs = grp.map(function (k) { return bdStep(akS, k, gFwd); }), here = [];
    BD_SERIAL.forEach(function (p) { if (signs.indexOf(C.signOf(p)) >= 0) here.push(p); });
    here.sort(function (a, b) { if (gi === 0 && a === AK) return -1; if (gi === 0 && b === AK) return 1;
      var sa = C.sb[a], sbb = C.sb[b]; if (sa == null && sbb == null) return 0; if (sa == null) return 1; if (sbb == null) return -1; return sbb - sa; });
    here.forEach(function (p) { var y = bdGrahaOwnYears(C, p); gseq.push({ lord: p, sign: C.signOf(p), years: y.years, why: y.why, group: ["kendra", "paṇaphara", "āpoklima"][gi] }); });
  });
  R.kendradi_graha = { name: "Kendrādi (graha, from the ātmakāraka)", verses: "vv. 175–177", start: akS, forward: gFwd,
    why: "ātmakāraka " + AK + " in " + SA[akS] + "; grahas in kendras, paṇapharas, āpoklimas from it, each group by Ṣaḍbala (the nodes, which have none, after the rest); years from each graha to its own sign",
    periods: bdCover(gseq, jd, null) };

  /* Kāraka — v. 178 */
  var ks = bdKarakas8(C).map(function (p) { var d = bdMod(C.signOf(p) - C.LS, 12); return { lord: p, sign: C.signOf(p), years: d === 0 ? 12 : d }; });
  R.karaka = { name: "Kāraka", verses: "v. 178", why: "the eight chara kārakas in order (Rāhu by 30° − its degree, as in the translator's example); years = signs from the lagna to the kāraka, the lagna itself giving 12",
    periods: bdCover(ks, jd, null) };

  /* Maṇḍūka — vv. 179–180 */
  var mFwd = bdOddSign(S.sign), mseq = [];
  for (var off = 0; off < 3; off++) for (var j = 0; j < 4; j++) { var ms = bdStep(S.sign, off + 3 * j, mFwd); mseq.push({ sign: ms, years: bdSthiraYears(ms) }); }
  R.manduka = { name: "Maṇḍūka", verses: "vv. 179–180", start: S.sign, forward: mFwd, why: strongNote + "; every third sign, Sthira years",
    periods: bdCover(mseq, jd, null) };

  /* Trikoṇa — vv. 183–184 */
  var tr = [C.LS, bdMod(C.LS + 4, 12), bdMod(C.LS + 8, 12)], tStart = bdSignRank(C, tr)[0], tFwd = bdOddSign(tStart), tseq = [];
  for (var o2 = 0; o2 < 4; o2++) for (var t3 = 0; t3 < 3; t3++) { var ts = bdStep(tStart, o2 + 4 * t3, tFwd); tseq.push({ sign: ts, years: charaY[ts].years }); }
  R.trikona = { name: "Trikoṇa", verses: "vv. 183–184", start: tStart, forward: tFwd,
    why: "the strongest of the lagna's trines by the sign-strength rule; trine by trine, " + (tFwd ? "forward" : "backward") + "; Chara years",
    periods: bdCover(tseq, jd, null) };

  /* Dṛg — vv. 185–187 */
  var dseq = [];
  [8, 9, 10].forEach(function (k) {
    var s0 = bdMod(C.LS + k, 12); dseq.push({ sign: s0, years: bdSthiraYears(s0), role: (k + 1) + "th" });
    bdRashiAspects(s0).forEach(function (x) { dseq.push({ sign: x, years: bdSthiraYears(x), role: "aspected by " + SA[s0] }); });
  });
  R.drig = { name: "Dṛg", verses: "vv. 185–187", why: "the 9th, 10th and 11th signs, each followed by the signs it aspects (movable: counted backward; fixed: forward; dual: forward if odd, backward if even); Sthira years",
    periods: bdCover(dseq, jd, null) };

  /* Rāśi daśā — vv. 188–190 */
  var lagPlus = bdMod(C.lag + C.nak.frac * 360, 360), rS = Math.floor(lagPlus / 30), rFwd = bdOddSign(rS), rDeg = lagPlus - rS * 30;
  var rBal = bdSthiraYears(rS) * (1 - rDeg / 30);
  R.rashi = { name: "Rāśi (lagna + nakṣatra)", verses: "vv. 188–190", start: rS, forward: rFwd, point_deg: lagPlus,
    why: "lagna + 12 signs × the Moon's traversed fraction of its nakṣatra (" + (C.nak.frac * 100).toFixed(2) + "%) = " + SA[rS] + " " + rDeg.toFixed(2) + "°; balance = years × the untraversed part of that sign (v. 190)",
    balance_years: rBal, periods: bdCover(bdSignSeq(rS, rFwd, bdSthiraYears), jd, rBal),
    reading: "Bhayāt ÷ bhabhog is taken as the Moon's longitude fraction through its nakṣatra." };

  /* Sandhyā — v. 204, with Pācaka — vv. 205–206 */
  R.sandhya = { name: "Sandhyā", verses: "v. 204", start: C.LS, forward: true,
    why: "each sign from the lagna for a twelfth of the 120-year paramāyu (10 years) — the fixed maximum, not anyone's lifespan",
    periods: bdCover(bdSignSeq(C.LS, true, function () { return 10; }), jd, null) };

  /* Tārā — vv. 207–209 */
  var tara = ["Janma", "Sampat", "Vipat", "Kṣema", "Pratyari", "Sādhaka", "Vadha", "Mitra", "Atimitra"], tlist = [];
  var inK = BD_SERIAL.filter(function (p) { var d = bdMod(C.signOf(p) - C.LS, 12); return d % 3 === 0; });
  if (inK.length) {
    [0, 1, 2].forEach(function (g) {
      var here = BD_SERIAL.filter(function (p) { return bdMod(C.signOf(p) - C.LS, 12) % 3 === g; });
      here.sort(function (a, b) { var sa = C.sb[a], sbb = C.sb[b]; if (sa == null && sbb == null) return 0; if (sa == null) return 1; if (sbb == null) return -1; return sbb - sa; });
      here.forEach(function (p) { tlist.push({ lord: p, years: VY[p] }); });
    });
    tlist.forEach(function (x, i) { x.tara = tara[i]; });
  }
  R.tara = inK.length ? { name: "Tārā", verses: "vv. 207–209", applies: true,
    why: "grahas in kendras exist; the strongest of them (by Ṣaḍbala) opens, with Viṃśottarī years. The order after it is the engine's reading: the other kendra grahas, then paṇaphara, then āpoklima, each by strength, named Janma, Sampat … in turn.",
    periods: bdCover(tlist, jd, null) } : { name: "Tārā", verses: "vv. 207–209", applies: false, why: "no graha in a kendra; the text applies Tārā daśā only when there is one", periods: null };
  return R;
}
function bdRashiAspects(s) {
  var m = bdModality(s), out = [], seq;
  if (m === 0) { /* movable → fixed signs except the adjacent one, counted backward */
    for (var k = 1; k < 12; k++) { var x = bdMod(s - k, 12); if (bdModality(x) === 1 && x !== bdMod(s + 1, 12)) out.push(x); }
  } else if (m === 1) { /* fixed → movable except the adjacent, counted forward */
    for (var k2 = 1; k2 < 12; k2++) { var y = bdMod(s + k2, 12); if (bdModality(y) === 0 && y !== bdMod(s - 1, 12)) out.push(y); }
  } else { var fwd = bdOddSign(s);
    for (var k3 = 1; k3 < 12; k3++) { var z = fwd ? bdMod(s + k3, 12) : bdMod(s - k3, 12); if (bdModality(z) === 2) out.push(z); }
  }
  return out;
}
function bdKarakas8(C) {
  var deg = function (p) { var d = bdMod(C.P[p].sid, 30); return p === "Rahu" ? 30 - d : d; };
  return ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"].filter(function (p) { return C.P[p]; })
    .sort(function (a, b) { return deg(b) - deg(a); });
}
function bdGrahaOwnYears(C, p) {
  var own = []; for (var s = 0; s < 12; s++) if (LORD[s] === p) own.push(s);
  if (p === "Ketu") own = [7]; if (p === "Rahu") own = [10];
  var at = C.signOf(p), fwd = bdOddPada(at), best = null;
  own.forEach(function (o) { var d = fwd ? bdMod(o - at, 12) : bdMod(at - o, 12), y = d === 0 ? 12 : d; if (!best || y > best.y) best = { y: y, o: o }; });
  return { years: best.y, why: "from " + SA[at] + " " + (fwd ? "forward" : "backward") + " to its own " + SA[best.o] + (own.length > 1 ? " (the larger of its two signs, v. 177)" : "") };
}
function bdPacaka(md) {
  var u = md.years * 6 / 31, out = [], t = md.start;
  for (var k = 0; k < 12; k++) { var y = k === 0 ? u : (k < 4 ? u / 2 : u / 3);
    out.push({ sign: bdMod(md.sign + k, 12), years: y, start: t, end: t + y * DPY }); t += y * DPY; }
  return out;
}

function bphsDashaData(D, J) {
  if (!D || !D.P || !D.P.Moon || !D.P.Sun || D.LS == null) return null;
  var C = bdContext(D, J);
  return { conditional: bdConditional(C), kala: bdKala(C), cakra: bdCakra(C), kalacakra: bdKalacakra(C),
           rashi: bdRashiDashas(C), ctx: { lagnaHora: C.lagnaHora, shukla: C.shukla, nak: NAKS[C.nak.i], frac: C.nak.frac,
           segment: C.seg ? C.seg.name : null, navLagna: C.navLagna, d12Lagna: C.d12Lagna } };
}
function bdRunning(list, jd) { if (!list) return null; for (var i = 0; i < list.length; i++) if (jd >= list[i].start && jd < list[i].end) return list[i]; return null; }
function bdName(p) { return p.sign != null && p.lord == null ? SA[p.sign] : p.sign != null ? SA[p.sign] + " (" + p.lord + ")" : p.lord; }

/* ---- JSON ---- */
function bphsDashaJson(D, J) {
  var X = bphsDashaData(D, J); if (!X) return null;
  var per = function (list) { return list ? list.map(function (p) { var o = { years: +p.years.toFixed(6), run_years: +p.run.toFixed(6),
      start_jd: +p.start.toFixed(5), end_jd: +p.end.toFixed(5) };
    if (p.lord != null) o.lord = p.lord; if (p.sign != null) o.sign = p.sign; if (p.partial) o.balance_at_birth = true;
    if (p.cycle > 1) o.cycle = p.cycle; if (p.why) o.why = p.why; if (p.group) o.group = p.group; if (p.role) o.role = p.role;
    if (p.tara) o.tara = p.tara; if (p.gati) o.gati = p.gati; if (p.deha) o.deha = true; if (p.jiva) o.jiva = true; return o; }) : null; };
  var out = { source: "BPHS Vol. 2 Ch. 46 (Santhanam translation). Signs are 0 = Meṣa … 11 = Mīna; years of 365.2564 days, as every daśā on this site.",
    note: "Viṃśottarī, Aṣṭottarī and Yoginī are under their own keys. Every system here states its verses, its opening rule and, where the translation is ambiguous, the reading taken. Conditional systems carry condition.applies — the text prescribes them only for charts that meet it; they are computed for all charts so the condition can be checked against the result.",
    not_computed: {
      shoola: "vv. 181–182 — given for the time of death; not computed by rule of this site.",
      pinda_amsha_naisargika_ashtakavarga: "vv. 201–203 — spans are the piṇḍāyu/aṃśāyu/naisargikāyu longevity figures; this site states longevity doctrine and never computes a lifespan.",
      panchasvara: "vv. 191–194 — needs the first syllable of the native's name, and the letter-to-svara table did not survive the scan."
    }, conditional: {}, rashi: {} };
  X.conditional.forEach(function (c) { out.conditional[c.key] = { name: c.name, verses: c.verses, total_years: c.total_years,
    lords: c.lords, years: c.years, count: c.count || null, opening: c.opening || null,
    balance_years: c.balance_years != null ? +c.balance_years.toFixed(6) : null, condition: c.condition,
    periods: per(c.periods), not_computed: c.not_computed || undefined }; });
  out.kala = X.kala.available ? { verses: X.kala.verses, segment: X.kala.segment, past_ghatikas: +X.kala.past_ghatikas.toFixed(4),
    multiplier: X.kala.multiplier, unit_years: +X.kala.unit_years.toFixed(6), periods: per(X.kala.periods), note: X.kala.note } : X.kala;
  out.cakra = X.cakra.available ? { verses: X.cakra.verses, start_sign: X.cakra.start, why: X.cakra.why, periods: per(X.cakra.periods) } : X.cakra;
  var K = X.kalacakra;
  out.kalacakra = { verses: K.verses, nakshatra: K.nakshatra, pada: K.pada, chakra: K.chakra, reckoned_as: K.group_of,
    navamsha: K.navamsha, deha_sign: K.deha, jiva_sign: K.jiva, pada_sequence: K.sequence, pada_total_years: K.pada_total_years,
    expired_years: +K.expired_years.toFixed(6), balance_years: +K.balance_years.toFixed(6), reading: K.reading, periods: per(K.periods) };
  for (var k in X.rashi) { var r = X.rashi[k];
    out.rashi[k] = { name: r.name, verses: "BPHS Vol. 2 Ch. 46 " + r.verses, start_sign: r.start != null ? r.start : null,
      forward: r.forward != null ? r.forward : null, why: r.why, reading: r.reading || undefined,
      applies: r.applies != null ? r.applies : undefined,
      brahma_graha: r.brahma ? { graha: r.brahma.graha, sign: r.brahma.sign, reckoned_from: r.brahma.from, how: r.brahma.how, candidates: r.brahma.candidates } : undefined,
      balance_years: r.balance_years != null ? +r.balance_years.toFixed(6) : undefined, periods: per(r.periods) }; }
  out.rashi.chara.jaimini_variant = "The Jaimini Chara daśā (lagna-footed direction, longer-period co-lord) is the separate pane 'Chara daśā'; this is the BPHS v. 155–167 rule.";
  return out;
}
function bphsDashaRunningJson(D, J) {
  var X = bphsDashaData(D, J); if (!X) return null;
  var r = {}, jd = D.nowJd, one = function (list) { var p = bdRunning(list, jd); return p ? { name: bdName(p), start_jd: +p.start.toFixed(5), end_jd: +p.end.toFixed(5) } : null; };
  X.conditional.forEach(function (c) { if (c.periods) r[c.key] = one(c.periods); });
  if (X.kala.available) r.kala = one(X.kala.periods);
  if (X.cakra.available) r.cakra = one(X.cakra.periods);
  r.kalacakra = one(X.kalacakra.periods);
  for (var k in X.rashi) if (X.rashi[k].periods) r[k] = one(X.rashi[k].periods);
  return r;
}

/* ---- the pane ---- */
function bphsDashaSection(D, J) {
  var X = bphsDashaData(D, J); if (!X) return "";
  var jd = D.nowJd, H = [];
  var periodTable = function (list, cols, limit) {
    var rows = list.slice(0, limit || list.length).map(function (p) { var on = jd >= p.start && jd < p.end;
      return '<tr' + (on ? ' class="khl"' : '') + '><td><b>' + esc(bdName(p)) + '</b>' + (on ? ' <span class="kmut">← now</span>' : '') +
        (p.cycle > 1 ? ' <span class="kmut">cycle ' + p.cycle + '</span>' : '') + '</td><td class="knum">' + p.run.toFixed(2) +
        '</td><td>' + fmy(p.start) + ' – ' + fmy(p.end) + '</td>' +
        (cols ? '<td class="kmut">' + esc(cols(p) || "") + '</td>' : '') + '</tr>'; });
    return tbl(["Period", "Years", "From – to"].concat(cols ? ["Note"] : []), [rows.join("")]);
  };
  var det = function (title, sub, body) { return '<details class="kdt-md"><summary><b>' + title + '</b> <span class="kmut">' + sub + '</span></summary>' + body + '</details>'; };

  H.push('<p class="knote">BPHS Ch. 46 gives many daśā systems besides Viṃśottarī. Parāśara calls Viṃśottarī the one for general use and the rest for particular charts or purposes ' +
    '(the translator\'s note after v. 43). Each below is computed by the rule its verse states and cited to it; the conditional ones show whether this chart meets the condition, and are computed either way so the test can be checked.</p>');

  /* summary table */
  var sum = [];
  X.conditional.forEach(function (c) { var r = c.periods ? bdRunning(c.periods, jd) : null, a = c.condition.applies;
    sum.push('<tr><td><b>' + c.name + '</b></td><td class="kmut">' + c.verses.replace("BPHS Vol. 2 Ch. 46 ", "") + '</td><td>' +
      (a === true ? '<b>applies</b>' : a === false ? 'not indicated' : '—') + '</td><td>' + (r ? esc(bdName(r)) + ' <span class="kmut">to ' + fmy(r.end) + '</span>' : '<span class="kmut">not dated</span>') + '</td></tr>'); });
  [["Kāla", X.kala], ["Cakra", X.cakra], ["Kālacakra", X.kalacakra]].forEach(function (z) { var r = z[1].periods ? bdRunning(z[1].periods, jd) : null;
    sum.push('<tr><td><b>' + z[0] + '</b></td><td class="kmut">' + (z[1].verses || "").replace("BPHS Vol. 2 Ch. 46 ", "") + '</td><td>general</td><td>' + (r ? esc(bdName(r)) + ' <span class="kmut">to ' + fmy(r.end) + '</span>' : '—') + '</td></tr>'); });
  for (var k in X.rashi) { var R0 = X.rashi[k], r0 = R0.periods ? bdRunning(R0.periods, jd) : null;
    sum.push('<tr><td><b>' + R0.name + '</b></td><td class="kmut">' + R0.verses + '</td><td>' + (R0.applies === false ? "not indicated" : "rāśi daśā") + '</td><td>' + (r0 ? esc(bdName(r0)) + ' <span class="kmut">to ' + fmy(r0.end) + '</span>' : '—') + '</td></tr>'); }
  H.push(tbl(["System", "Verses", "For this chart", "Running now"], [sum.join("")]));

  /* conditional */
  var cb = "";
  X.conditional.forEach(function (c) {
    var a = c.condition, body = '<p class="knote">Condition: ' + esc(a.test) + '. This chart: ' + esc(a.found) + ' — <b>' +
      (a.applies === true ? "the condition is met" : a.applies === false ? "the condition is not met" : "cannot be judged") + '</b>.' +
      (a.alt_test ? ' <span class="kmut">' + esc(a.alt_test) + '.</span>' : '') + '</p>';
    body += '<p class="klegend">Lords and years: ' + c.lords.map(function (l, i) { return l + " " + c.years[i]; }).join(", ") + ' (total ' + c.total_years + ').';
    if (c.periods) body += ' Count ' + esc(c.count) + ': the janma nakṣatra ' + NAKS[bdNak(D.P.Moon.sid).i] + ' opens on <b>' + c.opening + '</b>, balance ' + c.balance_years.toFixed(3) + ' years. ' +
      'Each nakṣatra carries the lord\'s whole span, and the balance is the untraversed fraction of the janma nakṣatra (the Viṃśottarī method the verses refer to).';
    body += '</p>';
    if (c.key === "chaturashiti") body += '<p class="klegend">The translation\'s worked example (Mṛgaśirā → Mars) disagrees with the verse\'s inclusive count, which gives Mercury; the three other examples that can be checked (Pañcottarī, Śatābdikā, Ṣaṭtriṃśat-sama) all count inclusively, so the verse is followed.</p>';
    body += c.periods ? periodTable(c.periods, null, 14) : '<div class="kbox">' + esc(c.not_computed) + '</div>';
    cb += det(c.name, c.verses.replace("BPHS Vol. 2 Ch. 46 ", "") + " · " + (a.applies === true ? "applies" : "condition not met"), body);
  });
  H.push('<h4 class="ksub">Conditional nakṣatra daśās (vv. 24–43)</h4>' + cb);

  /* Kāla, Cakra, Kālacakra */
  var kb = "";
  if (X.kala.available) kb += det("Kāla daśā", "vv. 44–49", '<p class="knote">Birth in ' + esc(X.kala.segment) + ', ' + X.kala.past_ghatikas.toFixed(2) +
    ' ghaṭikās into it. × ' + X.kala.multiplier + ' gives a unit of ' + X.kala.unit_years.toFixed(4) + ' years; each graha\'s daśā is the unit × its serial number.</p>' +
    periodTable(X.kala.periods, function (p) { return "× " + p.serial; }) + '<p class="klegend">' + esc(X.kala.note) + '</p>');
  else kb += det("Kāla daśā", "vv. 44–49", '<div class="kbox">' + esc(X.kala.reason) + '</div>');
  if (X.cakra.available) kb += det("Cakra daśā", "vv. 50–51", '<p class="knote">' + esc(X.cakra.why) + '; ten years to each sign, forward.</p>' + periodTable(X.cakra.periods, null, 12));
  var KC = X.kalacakra;
  kb += det("Kālacakra daśā", "vv. 52–93", '<p class="knote">Moon in ' + KC.nakshatra + ' pāda ' + KC.pada + ' (navāṃśa ' + KC.navamsha + '): the <b>' + KC.chakra +
    '</b> chakra, reckoned as ' + KC.group_of + '. Deha ' + SA[KC.deha] + ', jīva ' + SA[KC.jiva] + '. The pāda\'s nine daśās — ' + KC.sequence.map(function (s) { return SA[s]; }).join(", ") +
    ' — total ' + KC.pada_total_years + ' years; ' + KC.expired_years.toFixed(3) + ' had run at birth, leaving ' + KC.balance_years.toFixed(3) + ' of ' + SA[KC.periods[0].sign] + '.</p>' +
    periodTable(KC.periods, function (p) { return [p.gati ? p.gati + " gati" : "", p.deha ? "deha" : "", p.jiva ? "jīva" : ""].filter(Boolean).join(", "); }, 16) +
    '<p class="klegend">' + esc(KC.reading) + ' Daśā years: Sun 5, Moon 21, Mars 7, Mercury 9, Jupiter 10, Venus 16, Saturn 4 (v. 84). Gatis by vv. 96–100.</p>' +
    '<div class="kbox kwarn">vv. 85–86 and 123–128 read the Kālacakra for the span of life and for death. Those readings are doctrine and are not applied to this chart.</div>');
  H.push('<h4 class="ksub">Kāla, Cakra and Kālacakra</h4>' + kb);

  /* rāśi daśās */
  var rb = "";
  for (var k2 in X.rashi) { var R = X.rashi[k2];
    var body = '<p class="knote">' + esc(R.why) + '.</p>';
    if (R.brahma) body += '<p class="klegend">Brahma Graha candidates (lords of the 6th, 8th, 12th from ' + SA[R.brahma.from] + '): ' +
      R.brahma.candidates.map(function (c) { return c.house + "th " + c.lord + " in " + SA[c.at]; }).join("; ") + '. ' + esc(R.brahma.how) + '.</p>';
    if (R.reading) body += '<p class="klegend">' + esc(R.reading) + '</p>';
    if (R.periods) {
      body += periodTable(R.periods, function (p) { return p.why || p.group || p.role || p.tara || ""; }, 12);
      if (k2 === "sandhya") { var md = bdRunning(R.periods, jd);
        if (md) { body += '<h4 class="ksub">Pācaka within ' + SA[md.sign] + ' (vv. 205–206)</h4>' +
          tbl(["Sign", "Years", "From – to"], [bdPacaka(md).map(function (a) { var on = jd >= a.start && jd < a.end;
            return '<tr' + (on ? ' class="khl"' : '') + '><td>' + SA[a.sign] + (on ? ' <span class="kmut">← now</span>' : '') + '</td><td class="knum">' + a.years.toFixed(3) + '</td><td>' + fmy(a.start) + ' – ' + fmy(a.end) + '</td></tr>'; }).join("")]) +
          '<p class="klegend">6/31 of the daśā to the first sign, half that to each of the next three, a third to each of the remaining eight — which sums to the whole.</p>'; } }
    }
    if (R.years_note) body += '<p class="klegend">' + esc(R.years_note) + '</p>';
    rb += det(R.name, R.verses, body);
  }
  H.push('<h4 class="ksub">Rāśi daśās (vv. 155–209)</h4>' + rb);
  H.push('<div class="kbox"><b>Not computed, by rule.</b> Śūla daśā (vv. 181–182) is given for the time of death. Piṇḍa, Aṃśa, Naisargika and Aṣṭakavarga daśās (vv. 201–203) ' +
    'take their spans from the piṇḍāyu, aṃśāyu and naisargikāyu longevity figures. This site states longevity doctrine but does not compute a lifespan for anyone. ' +
    'Pañcasvara daśā (vv. 191–194) needs the first syllable of the name, and its letter table did not survive the scan.</div>');
  H.push('<div class="kbox kwarn"><b>Read as periods, not verdicts.</b> These systems disagree with each other by design. The text offers them for particular charts and purposes, ' +
    'and a judgment drawn from one alone is not the BPHS method.</div>');
  return H.join("");
}
/* test hook: a context from bare positions, so the suite can rebuild the
   translator's example chart (whose longitudes the OCR only half-kept) and
   hold every rule to the book's own worked answers */
function bdTestCtx(spec) {
  var D = { P: {}, LS: Math.floor(spec.lag / 30) % 12, lagna: { sidereal_deg: spec.lag }, input: { hour: spec.hour || 12, minute: spec.minute || 0 },
            sunriseH: spec.sunrise != null ? spec.sunrise : 6, sunsetH: spec.sunset != null ? spec.sunset : 18, jd: 2451545, nowJd: 2451545 };
  for (var p in spec.sid) D.P[p] = { sign: Math.floor(spec.sid[p] / 30) % 12, sid: spec.sid[p] };
  return bdContext(D, spec.shadbala ? { shadbala: { planets: spec.shadbala } } : null);
}
try { window.__bdTest = { ctx: bdTestCtx, rashi: bdRashiDashas, kala: bdKala, cakra: bdCakra, kalacakra: bdKalacakra,
      conditional: bdConditional, pacaka: bdPacaka, chara: bdCharaSignYears, brahma: bdBrahma }; } catch (e) {}
try { window.__bphsDashas = bphsDashaData; window.__bphsDashaJson = bphsDashaJson; window.__bdCharaSignYears = bdCharaSignYears;
      window.__bdRashiAspects = bdRashiAspects; window.__bdKcSeq = bdKcSeq; window.__bdCondIndex = bdCondIndex; window.__bdCond = BD_COND; } catch (e) {}
