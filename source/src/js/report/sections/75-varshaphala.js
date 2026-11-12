/* ================= Tājika Varṣaphala — the year's own chart =================

   WHAT IT IS. A chart cast not for the birth, but for the moment the Sun
   returns to the exact sidereal longitude it held at birth. That moment is
   the varṣapraveśa, the "entry of the year", and it moves: it is near the
   birthday but rarely on it to the hour, because a tropical year is not a
   whole number of days and the sidereal one differs again.

   TIER, STATED PLAINLY. Tājika is the Indo-Persian branch of the tradition.
   It is NOT in the uploaded Santhanam edition of BPHS, and nothing here
   should be read as Parāśara's. It is included because it is a complete and
   internally consistent annual system the user asked for, and because the
   discipline this site keeps is to say which tradition a rule comes from
   rather than to exclude everything outside one book. Every claim below is
   marked "Tājika, later tradition".

   WHAT IS COMPUTED, AND WHAT IS NOT:

     * The varṣapraveśa moment, by searching for the Sun's return to its natal
       sidereal longitude. Found by bisection on the engine's own ephemeris, to
       under a second, and the search is checked by recomputing the Sun at the
       answer rather than trusting the bracket.

     * The annual chart itself, cast by the same engine from that instant.
       Place matters and is a real choice: tradition casts it for the place
       the native IS, not the place they were born. Both are offered.

     * The Muntha, which advances one sign per completed year from the natal
       lagna. That rule is simple and undisputed.

     * The Varṣeśa (lord of the year) is NOT asserted. The five candidates are
       named, because naming them is honest and choosing between them needs
       Pañcavargīya bala — a five-fold strength calculation of some length
       whose own details vary between Tājika texts. Printing one name as
       though it were settled would be exactly the kind of false precision
       this site exists to avoid.

     * Mudda daśā, the year compressed: Viṃśottarī's proportions scaled so the
       nine periods fill one year rather than a hundred and twenty.

   None of it predicts anything. */

var VP_YEARLEN = 365.2563627;              /* sidereal year, days */

/* The Sun's sidereal longitude at a Julian day, from the engine's own
   ephemeris rather than from a mean rate — the difference across a year is
   a couple of days of the answer. */
function vpSunAt(jd) {
  try {
    var d = new Date((jd - 2440587.5) * 86400000);
    var v = window.__kSidAt ? window.__kSidAt("Sun", d) : null;
    return (v == null) ? null : ((v % 360) + 360) % 360;
  } catch (e) { return null; }
}
/* Signed angular difference, in degrees, folded to ±180 */
function vpDiff(a, b) { return (((a - b + 540) % 360) - 180); }

/* The varṣapraveśa for the Nth year: bisect for the Sun's return.
   The bracket is a day either side of the mean anniversary, which is ample —
   the Sun moves about a degree a day and the mean is never more than a few
   hours out. The answer is then CHECKED by recomputing the Sun there; a
   bracket that did not actually contain a crossing returns null rather than
   the midpoint of a bracket that never bracketed anything. */
function varshaPravesha(natalJd, natalSunSid, n) {
  if (natalSunSid == null || !window.__kSidAt) return null;
  var guess = natalJd + n * VP_YEARLEN;
  var lo = guess - 2, hi = guess + 2;
  var fLo = vpDiff(vpSunAt(lo), natalSunSid), fHi = vpDiff(vpSunAt(hi), natalSunSid);
  if (fLo == null || fHi == null) return null;
  if (!(fLo < 0 && fHi > 0)) {
    /* widen once rather than give up: a leap-year boundary can push it out */
    lo = guess - 5; hi = guess + 5;
    fLo = vpDiff(vpSunAt(lo), natalSunSid); fHi = vpDiff(vpSunAt(hi), natalSunSid);
    if (!(fLo < 0 && fHi > 0)) return null;
  }
  for (var k = 0; k < 60; k++) {
    var mid = (lo + hi) / 2, f = vpDiff(vpSunAt(mid), natalSunSid);
    if (f < 0) { lo = mid; fLo = f; } else { hi = mid; fHi = f; }
    if (hi - lo < 1e-9) break;
  }
  var jd = (lo + hi) / 2;
  var err = Math.abs(vpDiff(vpSunAt(jd), natalSunSid)) * 3600;   /* arcseconds */
  return err < 1 ? { jd: jd, errArcsec: err } : null;
}

/* Mudda daśā — Viṃśottarī's nine, scaled to fill one year.
   The starting lord is the nakṣatra lord of the Moon in the ANNUAL chart,
   and the first period carries the same proportional balance Viṃśottarī
   would give it. */
function muddaDasha(moonSid, startJd, yearDays) {
  if (moonSid == null) return [];
  var seg = 40 / 3, ni = Math.floor((((moonSid % 360) + 360) % 360) / seg);
  var lord = NL9[ni % 9], frac = ((((moonSid % 360) + 360) % 360) - ni * seg) / seg;
  var i0 = VSEQ.indexOf(lord), out = [], t = startJd;
  for (var i = 0; i < 9; i++) {
    var l = VSEQ[(i0 + i) % 9];
    var full = VY[l] / 120 * yearDays;
    var d = (i === 0) ? full * (1 - frac) : full;
    out.push({ lord: l, start: t, end: t + d, days: d, partial: i === 0 });
    t += d;
  }
  return { list: out, nak: NAKS[ni], lord: lord, balance: 1 - frac };
}

/* ===================== The Tājika reckonings of the year =====================

   SOURCE AND TIER. None of this is in BPHS. The rules are those of the Tājika
   manuals as B. V. Raman sets them out in "Varshaphal or the Hindu Progressed
   Horoscope" (cited below as Raman, by article), which follows Nīlakaṇṭha and
   Keśava. Where Raman's scan is illegible, the value used and where it comes
   from is named, and every such value is pinned in tajika-verify.mjs against
   whatever of Raman's text IS legible.

   Hadda (Raman Art. 36). The Tājika haddas are the Egyptian terms. Raman's
   legible rows — Meṣa: Jupiter 0–6, Venus 6–12, Mercury 12–20, Mars 20–25,
   Saturn 25–30; Mīna: Venus 0–12, Jupiter 12–16, Mercury 16–19, Mars 19–28,
   Saturn 28–30 — are exactly the Egyptian terms of Ptolemy's Tetrabiblos
   I.20, whose full table is used. Each row spans 30°; each planet's terms
   total Jupiter 79, Venus 82, Mercury 76, Mars 66, Saturn 57 — the classical
   totals, checked in the suite. */
var TJ_HADDA = [
  [["Jupiter",6],["Venus",12],["Mercury",20],["Mars",25],["Saturn",30]],
  [["Venus",8],["Mercury",14],["Jupiter",22],["Saturn",27],["Mars",30]],
  [["Mercury",6],["Jupiter",12],["Venus",17],["Mars",24],["Saturn",30]],
  [["Mars",7],["Venus",13],["Mercury",19],["Jupiter",26],["Saturn",30]],
  [["Jupiter",6],["Venus",11],["Saturn",18],["Mercury",24],["Mars",30]],
  [["Mercury",7],["Venus",17],["Jupiter",21],["Mars",28],["Saturn",30]],
  [["Saturn",6],["Mercury",14],["Jupiter",21],["Venus",28],["Mars",30]],
  [["Mars",7],["Venus",11],["Mercury",19],["Jupiter",24],["Saturn",30]],
  [["Jupiter",12],["Venus",17],["Mercury",21],["Saturn",26],["Mars",30]],
  [["Mercury",7],["Jupiter",14],["Venus",22],["Saturn",26],["Mars",30]],
  [["Mercury",7],["Venus",13],["Jupiter",20],["Mars",25],["Saturn",30]],
  [["Venus",12],["Jupiter",16],["Mercury",19],["Mars",28],["Saturn",30]]];
function tjHadda(sign, deg) { var r = TJ_HADDA[sign]; for (var i = 0; i < r.length; i++) if (deg < r[i][1]) return r[i][0]; return r[r.length - 1][0]; }
/* Keśava's natural relations (Raman Art. 12): two camps, no neutrals */
var TJ_CAMP = { Sun: 0, Moon: 0, Mars: 0, Jupiter: 0, Mercury: 1, Venus: 1, Saturn: 1, Rahu: 1 };
function tjRel(p, lord) { return p === lord ? "own" : TJ_CAMP[p] === TJ_CAMP[lord] ? "friend" : "enemy"; }
/* deep exaltation points (Raman Art. 34) */
var TJ_UCHCHA = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
var TJ_SEVEN = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
/* Pañcavargīya bala, Raman Arts. 32–40 */
function tjPanchavargiya(VD) {
  var out = {};
  TJ_SEVEN.forEach(function (g) {
    var p = VD.P[g]; if (!p) return;
    var lon = ((p.sid % 360) + 360) % 360, sign = Math.floor(lon / 30), deg = lon - sign * 30;
    var V = function (rel, own) { return rel === "own" ? own : rel === "friend" ? own / 2 : own / 4; };
    var kL = LORD[sign], kR = tjRel(g, kL);
    var debil = (TJ_UCHCHA[g] + 180) % 360, dd = Math.abs(lon - debil); if (dd > 180) dd = 360 - dd;
    var hL = tjHadda(sign, deg), hR = tjRel(g, hL);
    var dL = LORD[(sign + 4 * Math.floor(deg / 10)) % 12], dR = tjRel(g, dL);
    var nS = Math.floor(lon / (10 / 3)) % 12, nL = LORD[nS], nR = tjRel(g, nL);
    var parts = { kshetra: { lord: kL, relation: kR, value: V(kR, 30) },
                  uchcha: { from_debilitation_deg: dd, value: dd / 9 },
                  hadda: { lord: hL, relation: hR, value: V(hR, 15) },
                  drekkana: { lord: dL, relation: dR, value: V(dR, 10) },
                  navamsha: { sign: nS, lord: nL, relation: nR, value: V(nR, 5) } };
    var tot = parts.kshetra.value + parts.uchcha.value + parts.hadda.value + parts.drekkana.value + parts.navamsha.value;
    var q = tot / 4;
    out[g] = { parts: parts, total: tot, quarter: q,
      grade: q < 5 ? "weak" : q < 10 ? "ordinary" : q < 15 ? "powerful" : q < 20 ? "very strong" : "extraordinary" };
  });
  return out;
}
/* the Tri-rāśi lords (Raman Art. 46, whose diagram is illegible in the scan).
   The table used is the Tājika one built on the triplicity rulers: the first
   sign of each element takes the day ruler by day and the night ruler by
   night, the second sign the reverse, and the third the element's third
   ruler both ways round. Raman's two legible examples — Makara by day →
   Mars, Vṛṣabha by night → Moon — agree with it. [day, night] */
var TJ_TRIRASHI = [["Sun","Jupiter"],["Venus","Moon"],["Saturn","Mercury"],["Venus","Mars"],["Jupiter","Sun"],["Moon","Venus"],
                   ["Mercury","Saturn"],["Mars","Venus"],["Saturn","Saturn"],["Mars","Moon"],["Jupiter","Mercury"],["Moon","Mars"]];
/* Tājika aspect by sign (Raman Art. 13): 5/9 open friendly, 3/11 secret
   friendly, 1/7 open inimical, 4/10 secret inimical, 2/6/8/12 none. */
function tjAspect(fromSign, toSign) {
  var d = ((toSign - fromSign) % 12 + 12) % 12 + 1;
  if (d === 5 || d === 9) return { kind: "friendly", open: true, house: d };
  if (d === 3 || d === 11) return { kind: "friendly", open: false, house: d };
  if (d === 1 || d === 7) return { kind: "inimical", open: true, house: d };
  if (d === 4 || d === 10) return { kind: "inimical", open: false, house: d };
  return null;
}
/* dīptāṃśas — the orbs. Raman gives Jupiter 9 and Venus 7 in Art. 60; the
   rest are the standard Tājika values. */
var TJ_DIPTA = { Sun: 15, Moon: 12, Mars: 8, Mercury: 7, Jupiter: 9, Venus: 7, Saturn: 9 };
var TJ_SPEED = ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter", "Saturn"];   /* fastest first */
function tjYogas(VD) {
  var out = [];
  for (var i = 0; i < TJ_SEVEN.length; i++) for (var j = i + 1; j < TJ_SEVEN.length; j++) {
    var a = TJ_SEVEN[i], b = TJ_SEVEN[j], pa = VD.P[a], pb = VD.P[b]; if (!pa || !pb) continue;
    var asp = tjAspect(pa.sign, pb.sign); if (!asp) continue;
    var fast = TJ_SPEED.indexOf(a) < TJ_SPEED.indexOf(b) ? a : b, slow = fast === a ? b : a;
    var df = VD.P[fast].deg, ds = VD.P[slow].deg, orb = (TJ_DIPTA[a] + TJ_DIPTA[b]) / 2;
    var gap = ds - df, yoga = null;
    if (gap >= 0 && gap <= orb) yoga = "Itthaśāla";
    else if (gap < 0 && -gap <= orb) yoga = "Īśarāpha";
    out.push({ grahas: [a, b], aspect: asp.kind + (asp.open ? " (open)" : " (secret)"), house: asp.house,
               faster: fast, degree_gap: +gap.toFixed(3), orb: orb, yoga: yoga });
  }
  return out;
}
/* Sahams (Raman Arts. 64–75): A − B + C, adding 30° when C does not fall
   between B and A counted forward from B. */
function tjSaham(A, B, C) {
  var m = function (x) { return ((x % 360) + 360) % 360; };
  var between = m(C - B) < m(A - B);
  return { lon: m(A - B + C + (between ? 0 : 30)), added30: !between };
}
function tjSahams(VD, isDay) {
  var L = VD.lagna && VD.lagna.sidereal_deg != null ? VD.lagna.sidereal_deg : VD.LS * 30, P = function (g) { return VD.P[g].sid; };
  var S = {}, one = function (key, name, meaning, day, night, inferred) {
    var f = isDay ? day : night, r = tjSaham(f[0], f[1], f[2]);
    S[key] = { name: name, meaning: meaning, longitude: r.lon, sign: Math.floor(r.lon / 30), added_30: r.added30,
               formula: isDay ? day[3] : night[3], inferred_by_reversal: !!(inferred && inferred === (isDay ? "day" : "night")) };
  };
  one("punya", "Puṇya", "religious merit", [P("Moon"), P("Sun"), L, "Moon − Sun + lagna"], [P("Sun"), P("Moon"), L, "Sun − Moon + lagna"]);
  one("guru", "Guru", "the preceptor, learning", [P("Sun"), P("Moon"), L, "Sun − Moon + lagna"], [P("Moon"), P("Sun"), L, "Moon − Sun + lagna"]);
  var pu = S.punya.longitude, gu = S.guru.longitude;
  one("kirti", "Kīrti (Yaśas)", "fame", [P("Jupiter"), pu, L, "Jupiter − Puṇya + lagna"], [pu, P("Jupiter"), L, "Puṇya − Jupiter + lagna"]);
  one("mitra", "Mitra", "friends", [gu, pu, P("Venus"), "Guru saham − Puṇya saham + Venus"], [pu, gu, P("Venus"), "Puṇya saham − Guru saham + Venus"], "night");
  one("rajya", "Rājya", "authority, position", [P("Saturn"), P("Sun"), L, "Saturn − Sun + lagna"], [P("Sun"), P("Saturn"), L, "Sun − Saturn + lagna"], "day");
  one("putra", "Putra", "children", [P("Jupiter"), P("Moon"), L, "Jupiter − Moon + lagna"], [P("Jupiter"), P("Moon"), L, "Jupiter − Moon + lagna"]);
  one("jiva", "Jīva", "life, vitality", [P("Saturn"), P("Jupiter"), L, "Saturn − Jupiter + lagna"], [P("Jupiter"), P("Saturn"), L, "Jupiter − Saturn + lagna"]);
  one("vyapara", "Vyāpāra", "trade", [P("Mars"), P("Mercury"), L, "Mars − Mercury + lagna"], [P("Mercury"), P("Mars"), L, "Mercury − Mars + lagna"]);
  one("vivaha", "Vivāha", "marriage", [P("Venus"), P("Saturn"), L, "Venus − Saturn + lagna"], [P("Venus"), P("Saturn"), L, "Venus − Saturn + lagna"]);
  one("shatru", "Śatru", "opponents", [P("Mars"), P("Saturn"), L, "Mars − Saturn + lagna"], [P("Saturn"), P("Mars"), L, "Saturn − Mars + lagna"]);
  return S;
}
/* Pātyāyinī daśā (Raman Art. 49): the kṛṣāṃśas (degrees within the sign) of
   the seven grahas and the lagna, in ascending order; each one's share is its
   distance from the one before (the first, its own value), and the shares,
   which sum to the largest kṛṣāṃśa, are scaled to the year. */
function tjPatyayini(VD, startJd, yearDays) {
  var pts = TJ_SEVEN.filter(function (g) { return VD.P[g]; }).map(function (g) { return { lord: g, k: VD.P[g].deg }; });
  pts.push({ lord: "Lagna", k: VD.lagDeg != null ? VD.lagDeg : (((VD.lagna.sidereal_deg % 30) + 30) % 30) });
  pts.sort(function (a, b) { return a.k - b.k; });
  var top = pts[pts.length - 1].k, prev = 0, t = startJd;
  return pts.map(function (p) { var share = p.k - prev; prev = p.k; var d = top > 0 ? share / top * yearDays : 0;
    var o = { lord: p.lord, krishamsha: p.k, patyamsha: share, start: t, end: t + d, days: d }; t += d; return o; });
}
function tajikaYear(D, VD, cands0, isDay, vpJd, yearDays) {
  var PV = tjPanchavargiya(VD), vLag = VD.LS;
  var cands = cands0.map(function (c) {
    var g = c[1], p = VD.P[g], asp = p ? tjAspect(p.sign, vLag) : null;
    return { office: c[0], graha: g, rule: c[2], aspects_lagna: asp, pv: PV[g] || null };
  });
  var elig = cands.filter(function (c) { return c.aspects_lagna && c.pv; });
  var pool = elig.length ? elig : cands.filter(function (c) { return c.pv; });
  var best = null, tie = false;
  pool.forEach(function (c) { if (!best || c.pv.quarter > best.pv.quarter + 1e-9) { best = c; tie = false; } else if (Math.abs(c.pv.quarter - best.pv.quarter) < 1e-9 && c.graha !== best.graha) tie = true; });
  return { pv: PV, cands: cands, varshesha: best ? best.graha : null, tie: tie, from_eligible: elig.length > 0,
           yogas: tjYogas(VD), sahams: tjSahams(VD, isDay), patyayini: tjPatyayini(VD, vpJd, yearDays), isDay: isDay };
}

/* ONE COMPUTATION, TWO SURFACES. The report pane and the analyst JSON both
   read the year from here, so they cannot drift: the pane formats what this
   returns and the export serialises it. Before this, the JSON carried no
   varṣaphala at all while the pane computed one — the same "surface without
   its export" gap closed elsewhere for bhāva-phala and bhāva bala.
   Returns {err:"…"} when the year cannot be computed, never a guess. */
function varshaphalaData(D, J) {
  if (!D || !D.P || !D.P.Sun || !J || !J.input) return { err: "no-chart" };
  if (!window.__kSidAt || !window.buildLocalChart) return { err: "no-engine" };

  var natalSun = D.P.Sun.sid, inp = J.input;
  var age = Math.max(0, Math.floor((D.nowJd - D.jd) / VP_YEARLEN));
  var vp = varshaPravesha(D.jd, natalSun, age);
  /* if this year's entry has not happened yet, the running year began at the
     previous one — which is the year anybody asking is actually in */
  if (vp && vp.jd > D.nowJd) { age = Math.max(0, age - 1); vp = varshaPravesha(D.jd, natalSun, age); }
  if (!vp) return { err: "no-return" };

  var next = varshaPravesha(D.jd, natalSun, age + 1);
  var yearDays = next ? (next.jd - vp.jd) : VP_YEARLEN;

  /* the annual chart, cast by the same engine from that instant */
  var dt = new Date((vp.jd - 2440587.5) * 86400000 + (inp.tzHours || 0) * 3600000);
  var vinp = { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(),
               hour: dt.getUTCHours(), minute: dt.getUTCMinutes(),
               lat: inp.lat, lon: inp.lon, tzHours: inp.tzHours,
               ayanamsa: inp.ayanamsa, node: inp.node,
               /* the paddhati travels with the input, like the ayanāṃśa. This
                  list was built field by field and left it out, so under the
                  Śrīpati toggle the annual chart was quietly cast whole-sign
                  while everything around it followed Śrīpati.
                  varshaphala-verify.mjs pins it. */
               houseSystem: inp.houseSystem };
  var VJ = null, VD = null;
  try { VJ = window.buildLocalChart(vinp); VD = window.__derive(VJ); } catch (e) { VJ = null; }
  if (!VJ) return { err: "no-annual" };

  var vLag = VD.LS, muntha = (D.LS + age) % 12;
  var munthaLord = LORD[muntha];
  var munthaHouse = ((muntha - vLag) % 12 + 12) % 12 + 1;

  /* the five candidates for lord of the year, named rather than ranked.
     Tri-rāśi lord: by the varṣa lagna and whether the entry is by day or
     night — stated as the rule rather than resolved. */
  var isDay = (function () {
    var h = (VD.input && VD.input.hour != null) ? VD.input.hour + (VD.input.minute || 0) / 60 : 12;
    return (VD.sunriseH != null && VD.sunsetH != null)
            ? (h >= VD.sunriseH && h < VD.sunsetH) : (h >= 6 && h < 18);
  })();
  /* Tri-rāśi lord from the table above; Dina-rātri lord is the lord of the
     sign the Sun occupies by day, the Moon by night (Raman Art. 43–44). The
     earlier version named the Sun or the Moon themselves, which is not the
     rule. */
  var triRashi = TJ_TRIRASHI[vLag][isDay ? 0 : 1];
  var lum = isDay ? "Sun" : "Moon", lumSign = VD.P[lum] ? VD.P[lum].sign : null;
  var dinaRatri = lumSign != null ? LORD[lumSign] : lum;
  var cands = [
    ["Muntha lord", munthaLord, "lord of " + SA[muntha] + ", the Muntha sign"],
    ["Natal lagna lord", LORD[D.LS], "lord of " + SA[D.LS]],
    ["Varṣa lagna lord", LORD[vLag], "lord of " + SA[vLag] + ", rising at the entry"],
    ["Tri-rāśi lord", triRashi, SA[vLag] + " rising " + (isDay ? "by day" : "by night") + " (Raman Art. 46)"],
    ["Dina-rātri lord", dinaRatri, "lord of " + (lumSign != null ? SA[lumSign] : "—") + ", the " + lum + "'s sign — the " + lum + " because the entry is " + (isDay ? "by day" : "by night") + " (Raman Art. 44)"]
  ];

  /* Mudda */
  var MU = VD.P.Moon ? muddaDasha(VD.P.Moon.sid, vp.jd, yearDays) : null;

  var TJ = null; try { TJ = tajikaYear(D, VD, cands, isDay, vp.jd, yearDays); } catch (e) { TJ = null; }

  return { age: age, vp: vp, next: next, yearDays: yearDays, VJ: VJ, VD: VD,
           vLag: vLag, muntha: muntha, munthaLord: munthaLord, munthaHouse: munthaHouse,
           cands: cands, MU: MU, inp: inp, isDay: isDay, TJ: TJ };
}

/* The JSON view of the same computation. Field names say what each figure IS
   and which rule produced it; the tier is stated first because Tājika is not
   in the uploaded BPHS edition and nothing here may be read as Parāśara's. */
function varshaphalaJson(D, J) {
  var V = varshaphalaData(D, J);
  if (V.err) return { available: false, reason: {
    "no-chart": "no cast chart", "no-engine": "needs the built-in engine",
    "no-return": "the search for the Sun's return to its natal longitude did not converge, so nothing is given rather than something approximate",
    "no-annual": "the annual chart could not be cast" }[V.err] || V.err };
  var r = function (x, n) { return x == null ? null : +(+x).toFixed(n == null ? 4 : n); };
  var iso = function (jd) { return new Date((jd - 2440587.5) * 86400000).toISOString(); };
  var hsMode = (V.VJ.house_system && V.VJ.house_system.mode) || "whole-sign";
  var annual = {};
  ORD.forEach(function (g) {
    var p = V.VD.P[g]; if (!p) return;
    annual[g] = { longitude: r(p.sid), sign: p.sign, degree_in_sign: r(p.deg),
                  house: p.house, nakshatra: p.nak, pada: p.pada,
                  natal_sign: D.P[g] ? D.P[g].sign : null };
  });
  return {
    available: true,
    tier: "Tājika, later tradition — NOT in the uploaded Santhanam edition of BPHS",
    as_of_dependent: true,
    year_selection: "the running year at export time: the varṣa whose entry is the latest one not after derived.as_of.generated_jd",
    year_number: V.age + 1,
    completed_years: V.age,
    varsha_pravesha: { jd_utc: r(V.vp.jd, 6), utc: iso(V.vp.jd),
      local_time: hmOf(V.vp.jd, V.inp.tzHours), timezone_offset: V.inp.tzHours,
      sun_error_arcsec: r(V.vp.errArcsec, 3),
      method: "bisection on the engine's own ephemeris for the Sun's return to its natal sidereal longitude, then checked by recomputing the Sun at the answer" },
    next_varsha_pravesha_jd_utc: V.next ? r(V.next.jd, 6) : null,
    year_length_days: r(V.yearDays, 4),
    cast_for: { latitude: V.inp.lat, longitude: V.inp.lon,
      note: "Cast for the birth place given in input. Tradition casts the annual chart for where the native IS at the entry; recast with that place if it differs." },
    varsha_lagna: { sign: V.vLag, degree_in_sign: r(V.VD.lagDeg) },
    annual_chart_house_system: hsMode,
    annual_chart: annual,
    muntha: { sign: V.muntha, lord: V.munthaLord,
      house_from_varsha_lagna: V.munthaHouse,
      rule: "advances one sign per completed year from the natal lagna (natal lagna sign + completed years)",
      house_rule: "counted by rāśi from the varṣa lagna" },
    varshesha: (function () {
      var T = V.TJ;
      var cand = V.cands.map(function (c, i) {
        var p = V.VD.P[c[1]], tc = T ? T.cands[i] : null;
        return { office: c[0], graha: c[1], rule: c[2],
                 sign_in_annual_chart: p ? p.sign : null,
                 house_in_annual_chart: p ? p.house : null,
                 aspects_varsha_lagna: tc && tc.aspects_lagna ? tc.aspects_lagna.kind + (tc.aspects_lagna.open ? " (open)" : " (secret)") + ", from the " + tc.aspects_lagna.house + "th" : null,
                 panchavargiya_quarter: tc && tc.pv ? r(tc.pv.quarter, 4) : null };
      });
      if (!T) return { asserted: false, reason: "the Tājika strengths could not be computed for this year", candidates: cand };
      return { asserted: true, graha: T.varshesha, tie: T.tie,
        rule: "Of the five office-bearers, those that aspect the varṣa lagna by Tājika sign-aspect (from the 1st, 3rd, 4th, 5th, 7th, 9th, 10th or 11th) are eligible, and the one with the greatest Pañcavargīya bala holds the year (Raman Arts. 43, 47)." +
          (T.from_eligible ? "" : " None of the five aspects the lagna; the strongest of all five is taken — the engine's reading, since the text gives no rule for this case."),
        reading: "Raman's Art. 47 example also prefers a favourable aspect to an offensive one; where an eligible candidate's aspect is inimical this is shown, not used to re-rank.",
        candidates: cand };
    })(),
    panchavargiya_bala: V.TJ ? (function () { var o = {}; for (var g in V.TJ.pv) { var x = V.TJ.pv[g];
      o[g] = { kshetra: r(x.parts.kshetra.value), kshetra_lord: x.parts.kshetra.lord, uchcha: r(x.parts.uchcha.value),
               hadda: r(x.parts.hadda.value), hadda_lord: x.parts.hadda.lord, drekkana: r(x.parts.drekkana.value), drekkana_lord: x.parts.drekkana.lord,
               navamsha: r(x.parts.navamsha.value), navamsha_lord: x.parts.navamsha.lord, total: r(x.total), quarter: r(x.quarter), grade: x.grade }; }
      return { source: "Raman, Varshaphal, Arts. 32–40 (Tājika): kṣetra 30/15/7.5, hadda 15/7.5/3.75, drekkāṇa 10/5/2.5, navāṃśa 5/2.5/1.25 for own/friend/enemy by Keśava's two camps; uccha = distance from debilitation ÷ 9; total ÷ 4 graded <5 weak, <10 ordinary, <15 powerful, <20 very strong, else extraordinary. Haddas are the Egyptian terms.", grahas: o }; })() : null,
    tajika_aspects_and_yogas: V.TJ ? { rule: "Sign aspects 5/9 open friendly, 3/11 secret friendly, 1/7 open inimical, 4/10 secret inimical (Raman Art. 13). Itthaśāla: the faster graha behind the slower within half the sum of their dīptāṃśas (applying); Īśarāpha: just past it (separating). Degrees are degrees within the sign; mean-speed order Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn; retrogression is not modelled.",
      dipta: TJ_DIPTA, pairs: V.TJ.yogas } : null,
    sahams: V.TJ ? { rule: "A − B + C, plus 30° when C does not fall between B and A counted forward from B (Raman Arts. 64–65); day and night formulas reverse where Raman reverses them. Two night/day forms Raman's scan does not show legibly (Mitra by night, Rājya by day) are taken by the same reversal and flagged.",
      entry_by: V.isDay ? "day" : "night", sahams: (function () { var o = {}; for (var k in V.TJ.sahams) { var x = V.TJ.sahams[k];
        o[k] = { name: x.name, meaning: x.meaning, longitude: r(x.longitude), sign: x.sign, formula: x.formula, added_30: x.added_30, inferred_by_reversal: x.inferred_by_reversal }; } return o; })() } : null,
    patyayini_dasha: V.TJ ? { rule: "Raman Art. 49: kṛṣāṃśas of the seven grahas and the lagna in ascending order; each share is its distance from the one before, scaled so the shares fill the year (entry to next entry). The first period goes to the smallest kṛṣāṃśa.",
      periods: V.TJ.patyayini.map(function (x) { return { lord: x.lord, krishamsha: r(x.krishamsha), patyamsha: r(x.patyamsha),
        start_jd: r(x.start, 6), end_jd: r(x.end, 6), days: r(x.days, 3) }; }) } : null,
    mudda_dasha: (V.MU && V.MU.list) ? {
      rule: "Viṃśottarī's nine lords and proportions scaled to fill one year, starting from the nakṣatra lord of the Moon in the ANNUAL chart with that nakṣatra's balance",
      starting_nakshatra: V.MU.nak, starting_lord: V.MU.lord, balance_at_entry: r(V.MU.balance, 6),
      periods: V.MU.list.map(function (m) {
        return { lord: m.lord, start_jd: r(m.start, 6), end_jd: r(m.end, 6),
                 days: r(m.days, 3), partial: !!m.partial }; }) } : null,
    not_computed: ["Tājika yogas beyond Itthaśāla and Īśarāpha (Nakta, Yamayā, Maṇaū, Kamboola and the rest of the sixteen) — their rules are not in a legible source available here",
                   "Sahams beyond the ten Raman gives (Nīlakaṇṭha lists fifty)", "Dvādaśavargīya bala"],
    note: "A varṣaphala is read against the natal chart, not instead of it, and describes one year. It is not a forecast and not a basis for any decision that matters."
  };
}

function varshaphalaSection(D, J) {
  if (!D.P || !D.P.Sun || !J || !J.input) return "";
  var V = varshaphalaData(D, J);
  if (V.err === "no-engine") return '<p class="kmut">Needs the built-in engine.</p>';
  if (V.err === "no-return") return '<div class="kbox kwarn"><b>The solar return could not be located.</b> ' +
    'The search for the Sun’s return to its natal longitude did not converge, so nothing ' +
    'is shown rather than something approximate.</div>';
  if (V.err === "no-annual") return '<div class="kbox kwarn"><b>The annual chart could not be cast.</b></div>';
  if (V.err) return "";
  var age = V.age, vp = V.vp, yearDays = V.yearDays, VD = V.VD, vLag = V.vLag,
      muntha = V.muntha, munthaHouse = V.munthaHouse, cands = V.cands, MU = V.MU, inp = V.inp;
  var T = V.TJ;
  var cr = cands.map(function (c, i) {
    var p = VD.P[c[1]], tc = T ? T.cands[i] : null, win = T && T.varshesha === c[1];
    return '<tr' + (win ? ' class="khl"' : '') + '><td><b>' + esc(c[0]) + '</b></td><td>' + esc(c[1]) + (win ? ' <span class="kmut">← Varṣeśa</span>' : '') + '</td>' +
      '<td>' + (p ? SA[p.sign] + " " + dm(p.deg) + " · H" + p.house : "—") + '</td>' +
      '<td class="kmut">' + esc(c[2]) + '</td>' +
      '<td>' + (tc ? (tc.aspects_lagna ? esc(tc.aspects_lagna.kind) + (tc.aspects_lagna.open ? " (open)" : " (secret)") : "no aspect") : "—") + '</td>' +
      '<td class="knum">' + (tc && tc.pv ? tc.pv.quarter.toFixed(2) : "—") + '</td></tr>';
  }).join("");
  var tjHtml = "";
  if (T) {
    var pvRows = TJ_SEVEN.map(function (g) { var x = T.pv[g]; if (!x) return ""; var P5 = x.parts;
      return '<tr><td><b>' + g + '</b></td><td class="knum">' + P5.kshetra.value.toFixed(2) + ' <span class="kmut">' + P5.kshetra.relation + '</span></td>' +
        '<td class="knum">' + P5.uchcha.value.toFixed(2) + '</td><td class="knum">' + P5.hadda.value.toFixed(2) + ' <span class="kmut">' + P5.hadda.lord + '</span></td>' +
        '<td class="knum">' + P5.drekkana.value.toFixed(2) + ' <span class="kmut">' + P5.drekkana.lord + '</span></td>' +
        '<td class="knum">' + P5.navamsha.value.toFixed(2) + ' <span class="kmut">' + P5.navamsha.lord + '</span></td>' +
        '<td class="knum"><b>' + x.quarter.toFixed(2) + '</b></td><td class="kmut">' + x.grade + '</td></tr>'; }).join("");
    var yRows = T.yogas.filter(function (y) { return y.yoga; }).map(function (y) {
      return '<tr><td><b>' + y.yoga + '</b></td><td>' + y.grahas.join(" – ") + '</td><td class="kmut">' + esc(y.aspect) + '</td>' +
        '<td class="knum">' + Math.abs(y.degree_gap).toFixed(2) + '° of ' + y.orb.toFixed(1) + '°</td><td class="kmut">' + y.faster + ' the faster</td></tr>'; }).join("");
    var sRows = Object.keys(T.sahams).map(function (k) { var x = T.sahams[k];
      return '<tr><td><b>' + esc(x.name) + '</b> <span class="kmut">' + esc(x.meaning) + '</span></td><td>' + SA[x.sign] + ' ' + dm(x.longitude % 30) + '</td>' +
        '<td class="kmut">' + esc(x.formula) + (x.added_30 ? ' + 30°' : '') + (x.inferred_by_reversal ? ' · by reversal' : '') + '</td></tr>'; }).join("");
    var pRows = T.patyayini.map(function (x) { var on = D.nowJd >= x.start && D.nowJd < x.end;
      return '<tr' + (on ? ' class="khl"' : '') + '><td><b>' + esc(x.lord) + '</b>' + (on ? ' <span class="kmut">← now</span>' : '') + '</td><td class="knum">' + x.krishamsha.toFixed(2) + '°</td>' +
        '<td class="knum">' + x.days.toFixed(1) + ' d</td><td class="knum">' + fdate(x.start) + ' – ' + fdate(x.end) + '</td></tr>'; }).join("");
    tjHtml = '<h4 class="ksub">Pañcavargīya bala</h4>' +
      tbl(["Graha", "Kṣetra", "Uccha", "Hadda", "Drekkāṇa", "Navāṃśa", "Total ÷ 4", "Grade"], [pvRows]) +
      '<p class="klegend">Raman Arts. 32–40: own/friend/enemy by Keśava\'s two camps (Sun, Moon, Mars, Jupiter; Mercury, Venus, Saturn), uccha = distance from debilitation ÷ 9. The haddas are the Egyptian terms — Raman\'s legible Meṣa and Mīna rows are exactly those.</p>' +
      '<h4 class="ksub">Itthaśāla and Īśarāpha</h4>' +
      (yRows ? tbl(["Yoga", "Grahas", "Aspect", "Gap", ""], [yRows]) : '<p class="kmut">No pair of aspecting grahas is within orb this year.</p>') +
      '<p class="klegend">Itthaśāla: the faster graha behind the slower and closing, within half the sum of their dīptāṃśas; Īśarāpha: just past. Degrees within the sign, mean-speed order; retrogression is not modelled. The other fourteen Tājika yogas are not computed — no legible statement of their rules was available.</p>' +
      '<h4 class="ksub">Sahams <span class="kmut">(entry by ' + (T.isDay ? "day" : "night") + ')</span></h4>' +
      tbl(["Saham", "At", "Formula"], [sRows]) +
      '<p class="klegend">Raman Arts. 64–75 give these ten (Nīlakaṇṭha lists fifty). A − B + C, adding 30° when C does not fall between B and A.</p>' +
      '<h4 class="ksub">Pātyāyinī daśā</h4>' + tbl(["Lord", "Kṛṣāṃśa", "Length", "From – to"], [pRows]) +
      '<p class="klegend">Raman Art. 49: the degrees-within-sign of the seven grahas and the lagna, in ascending order; each share is the gap from the one before, scaled to fill the year.</p>';
  }

  var mrows = "";
  if (MU && MU.list) mrows = MU.list.map(function (m) {
    var on = (D.nowJd >= m.start && D.nowJd < m.end);
    return '<tr' + (on ? ' class="khl"' : '') + '><td><b>' + esc(m.lord) + '</b>' +
      (on ? ' <span class="kmut">← now</span>' : '') + '</td>' +
      '<td class="knum">' + m.days.toFixed(1) + ' d</td>' +
      '<td class="knum">' + fdate(m.start) + ' – ' + fdate(m.end) + '</td>' +
      '<td class="kmut">' + (m.partial ? "balance at the entry" : "full share") + '</td></tr>';
  }).join("");

  /* the annual chart's own grahas, which is what the rest is read against */
  var prows = ORD.map(function (g) {
    var p = VD.P[g], n = D.P[g];
    if (!p) return "";
    return '<tr><td><b>' + esc(g) + '</b></td><td>' + SA[p.sign] + ' ' + dm(p.deg) + '</td>' +
      '<td class="knum">H' + p.house + '</td><td>' + esc(p.nak) + ' ' + p.pada + '</td>' +
      '<td class="kmut">' + (n ? "natally " + SA[n.sign] : "") + '</td></tr>';
  }).join("");

  return '<p class="knote">The <b>varṣaphala</b> is a chart for the moment the Sun returns to the ' +
    'exact sidereal longitude it held at birth — the <b>varṣapraveśa</b>. It is near the ' +
    'birthday and rarely on it to the hour, because a sidereal year is not a whole number of ' +
    'days. Everything on this page is read within that one year and then discarded; the next ' +
    'entry starts again.</p>' +
    note("Study note — this is Tājika, not BPHS",
      "Tājika is the Indo-Persian branch of the tradition. It is not in the uploaded Santhanam edition, and nothing here is Pārāśara’s.",
      "It is included because it is a complete annual system in its own right and because this site’s discipline is to name the tradition a rule comes from rather than to exclude everything outside one book. The Tājika rules used — Pañcavargīya bala, the Varṣeśa, the sahams, Pātyāyinī daśā — are B. V. Raman’s statement of them (Varshaphal, cited by article), and where his scan is illegible the value used and its provenance are named.",
      ["dasha", "lagna"]) +
    '<h4 class="ksub">The entry</h4>' +
    tbl(["", "", "", ""], ['<tr><td><b>Year</b></td><td>' + (age + 1) + '<span class="kmut"> (age ' +
      age + ' completed)</span></td><td><b>Varṣapraveśa</b></td><td class="knum">' +
      fdate(vp.jd) + ' · ' + hmOf(vp.jd, inp.tzHours) + ' local</td></tr>' +
      '<tr><td><b>Varṣa lagna</b></td><td>' + SA[vLag] + ' ' + dm(VD.lagDeg) + '</td>' +
      '<td><b>Year length</b></td><td class="knum">' + yearDays.toFixed(4) + ' days</td></tr>' +
      '<tr><td><b>Muntha</b></td><td>' + SA[muntha] + '</td><td><b>Muntha house</b></td>' +
      '<td class="knum">' + munthaHouse + '<span class="kmut"> from the varṣa lagna</span></td></tr>']) +
    '<p class="klegend">The entry was located by bisection on the engine’s own ephemeris and ' +
    'then checked by recomputing the Sun there: it sits within ' + vp.errArcsec.toFixed(3) +
    '″ of the natal longitude. The Muntha advances one sign per completed year from the ' +
    'natal lagna — ' + SA[D.LS] + ' plus ' + age + '.</p>' +
    '<h4 class="ksub">The annual chart</h4>' +
    tbl(["Graha", "Rāśi", "House", "Nakṣatra", "Natal"], [prows]) +
    '<h4 class="ksub">Candidates for Varṣeśa, lord of the year</h4>' +
    tbl(["Office", "Graha", "In the annual chart", "By what rule", "Aspects the varṣa lagna", "Pañcavargīya ÷ 4"], [cr]) +
    (T ? '<div class="kbox"><b>Varṣeśa: ' + esc(T.varshesha || "—") + '.</b> Of the five, those that aspect the varṣa lagna are eligible, and the strongest by Pañcavargīya bala holds the year (Raman Arts. 43, 47)' +
      (T.from_eligible ? '.' : '. None of the five aspects the lagna this year, so the strongest of all five is shown — the text gives no rule for that case.') +
      (T.tie ? ' Two candidates tie on strength; the first listed is shown.' : '') + '</div>' : '') +
    tjHtml +
    (mrows ? '<h4 class="ksub">Mudda daśā</h4>' +
      '<p class="knote">Viṃśottarī’s nine lords and their proportions, scaled so that they ' +
      'fill this one year instead of a hundred and twenty. It starts from the nakṣatra of the ' +
      'Moon <i>in the annual chart</i> — ' + esc(MU.nak) + ', lord ' + esc(MU.lord) +
      ' — and the first period carries that nakṣatra’s balance.</p>' +
      tbl(["Lord", "Length", "From – to", ""], [mrows]) : "") +
    '<div class="kbox kwarn"><b>One year, read as a year.</b> A varṣaphala describes a twelve-month ' +
    'frame and is traditionally read against the natal chart rather than instead of it: nothing in ' +
    'an annual chart is held to promise what the birth chart does not. It is not a forecast, and ' +
    'it is not a basis for any decision that matters.</div>';
}
/* local clock time for a jd, at a given UTC offset */
function hmOf(jd, tz) {
  var ms = (jd - 2440587.5) * 86400000 + (tz || 0) * 3600000, d = new Date(ms);
  return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
}
try { window.__tajika = { hadda: TJ_HADDA, haddaOf: tjHadda, pv: tjPanchavargiya, saham: tjSaham, aspect: tjAspect, trirashi: TJ_TRIRASHI, patyayini: tjPatyayini, yogas: tjYogas };
      window.__varshaPravesha = varshaPravesha; window.__muddaDasha = muddaDasha;
      window.__varshaphalaJson = varshaphalaJson; } catch (e) {}
