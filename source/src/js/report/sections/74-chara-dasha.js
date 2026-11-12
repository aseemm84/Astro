/* ================= Jaimini Chara Daśā — a sign-based clock =================

   WHAT THIS IS, AND WHOSE IT IS. Every daśā already on this site runs from a
   graha: Viṃśottarī from the Moon's nakṣatra, Yoginī and Aṣṭottarī likewise.
   Chara daśā runs from a RĀŚI. The sequence is the twelve signs in an order
   the lagna decides, and each sign's length is read off the distance from
   that sign to its own lord. Nothing about the Moon enters it.

   TIER. This is the Jaimini form as the later commentarial tradition states
   it. BPHS Vol. 2 Ch. 46 vv. 155–167 gives its own Chara daśā, and it differs
   in two places: the sequence runs forward or backward according to the pāda
   of the 9th sign (v. 167), not the lagna's; and Vṛścika/Kumbha go to the
   co-lord whose sign is STRONGER (vv. 158–166), with ±1 for an exalted or
   debilitated lord. That BPHS form is computed in 77-bphs-dashas.js and shown
   in "The other daśās of BPHS"; this pane keeps the Jaimini form beside it.

   WHERE THE TRADITION DIVIDES, said rather than smoothed over:

     * The direction. Counting is forward (zodiacal) from a sign that is
       "odd-footed" and backward from one that is "even-footed". Which signs
       are which is settled; whether the DAŚĀ SEQUENCE takes its direction
       from the lagna alone, or each sign takes its own, is not. The
       widely-taught rule, and the one used here, is that the lagna sets the
       direction for the whole sequence while each sign's LENGTH is counted in
       its own direction.

     * Vṛścika and Kumbha have two lords each — Mars with Ketu, Saturn with
       Rāhu. The stronger is to be used. "Stronger" is itself a Jaimini
       calculation of some length; this takes the co-lord that gives the
       LONGER period, states that it has done so, and names the alternative.
       That is a choice, not a derivation, and it is marked as one.

     * The antardaśā order. Some lineages run the sub-periods from the
       mahādaśā sign itself, some from the ninth from it. The first is used
       here and the second is named.

   None of this is a prediction. A daśā is a period with a name on it. */

var CHARA_DIRECT = [0, 1, 2, 6, 7, 8];     /* Meṣa–Mithuna, Tulā–Dhanus */
function charaOdd(sign) { return CHARA_DIRECT.indexOf(((sign % 12) + 12) % 12) >= 0; }

/* The classical rule is "count the signs from the sign to the sign its lord
   occupies, IN THE DIRECTION, and subtract one". Jyotiṣa counting is
   inclusive — the sign you start from is the first — so Mīna, Kumbha,
   Makara, Dhanus is four signs and the daśā is three years.

   Inclusive-minus-one is simply the exclusive distance, which is what
   charaSpan returns: 0 when the lord sits in the sign it rules, up to 11.
   charaYears maps that 0 to twelve, which is the one special case the rule
   names.

   Written out because the first version got both ends wrong at once. It
   returned 12 for the lord-in-own-sign case and then subtracted one, giving
   eleven; and it returned 1 for a lord in the next sign, which became zero
   and was rescued into twelve. The two special cases had been swapped, and
   every ordinary length was a year short. Both are pinned in the suite
   against hand-counted cases now. */
function charaSpan(from, to, fwd) {
  return fwd ? (((to - from) % 12) + 12) % 12 : (((from - to) % 12) + 12) % 12;
}
function charaYears(from, to, fwd) {
  var d = charaSpan(from, to, fwd);
  return d === 0 ? 12 : d;
}

var CHARA_LORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
                  "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
var CHARA_CO   = { 7: "Ketu", 10: "Rahu" };   /* Vṛścika, Kumbha */

/* The twelve periods, in order, with the reasoning for each length kept so
   the table can show its own working rather than asserting a number. */
function charaDashaList(D) {
  var LS = D.LS, fwd = charaOdd(LS), out = [], seq = [];
  for (var i = 0; i < 12; i++) seq.push(fwd ? (LS + i) % 12 : (((LS - i) % 12) + 12) % 12);
  seq.forEach(function (sg) {
    var own = charaOdd(sg);                 /* each sign counts in ITS own direction */
    var main = CHARA_LORD[sg], co = CHARA_CO[sg] || null;
    var cand = [{ lord: main, at: D.P[main] ? D.P[main].sign : null }];
    if (co && D.P[co]) cand.push({ lord: co, at: D.P[co].sign });
    var best = null, alt = null;
    cand.forEach(function (c) {
      if (c.at == null) return;
      var rec = { lord: c.lord, at: c.at, years: charaYears(sg, c.at, own) };
      if (!best || rec.years > best.years) { alt = best; best = rec; } else if (!alt) alt = rec;
    });
    if (!best) best = { lord: main, at: null, years: 1 };
    out.push({ sign: sg, years: best.years, lord: best.lord, lordAt: best.at,
               fwd: own, alt: alt, co: co });
  });
  return { seq: out, direction: fwd };
}

/* Antardaśās: twelve signs within the sign, each of a twelfth of the period,
   running from the mahādaśā sign in that sign's own direction. */
function charaAntars(md) {
  var a = [], each = md.years / 12;
  for (var i = 0; i < 12; i++) {
    var sg = md.fwd ? (md.sign + i) % 12 : (((md.sign - i) % 12) + 12) % 12;
    a.push({ sign: sg, years: each, i: i });
  }
  return a;
}

function charaDashaSection(D) {
  if (!D.P || !D.P.Sun || D.LS == null) return "";
  var CD = charaDashaList(D), jd = D.jd, rows = [], t = jd, cur = null, curAt = 0;
  CD.seq.forEach(function (m, k) {
    m.start = t; m.end = t + m.years * DPY; t = m.end;
    if (D.nowJd >= m.start && D.nowJd < m.end) { cur = m; curAt = k; }
  });
  CD.seq.forEach(function (m) {
    var on = (m === cur);
    var why = m.lordAt == null ? "lord not placed"
      : (m.lordAt === m.sign
          ? "lord " + esc(m.lord) + " in the sign itself → 12"
          : "lord " + esc(m.lord) + " in " + SA[m.lordAt] + ", " +
            (charaSpan(m.sign, m.lordAt, m.fwd) + 1) + " signs counted " +
            (m.fwd ? "forward" : "backward") + " − 1");
    rows.push('<tr' + (on ? ' class="khl"' : '') + '><td><b>' + SA[m.sign] + '</b>' +
      (on ? ' <span class="kmut">← now</span>' : '') + '</td>' +
      '<td class="knum">' + m.years + ' y</td>' +
      '<td class="knum">' + fmy(m.start) + ' – ' + fmy(m.end) + '</td>' +
      '<td class="kmut">' + why + '</td>' +
      '<td class="kmut">' + (m.co
        ? (m.alt ? 'co-lord ' + esc(m.alt.lord) + ' would give ' + m.alt.years + ' y' : 'two lords')
        : '—') + '</td></tr>');
  });

  /* the running sub-period, which is the part anyone actually reads */
  var sub = "";
  if (cur) {
    var aa = charaAntars(cur), s = cur.start, srows = [];
    aa.forEach(function (a) {
      a.start = s; a.end = s + a.years * DPY; s = a.end;
      var on = (D.nowJd >= a.start && D.nowJd < a.end);
      srows.push('<tr' + (on ? ' class="khl"' : '') + '><td>' + SA[a.sign] +
        (on ? ' <span class="kmut">← now</span>' : '') + '</td>' +
        '<td class="knum">' + fmy(a.start) + ' – ' + fmy(a.end) + '</td>' +
        '<td class="kmut">' + (a.i === 0 ? "the mahādaśā sign itself" : ordinal(a.i + 1) +
          (cur.fwd ? " forward" : " backward")) + '</td></tr>');
    });
    sub = '<h4 class="ksub">Antardaśās within ' + SA[cur.sign] + '</h4>' +
      tbl(["Sign", "From – to", "Counted"], [srows.join("")]) +
      '<p class="klegend">Each is a twelfth of the mahādaśā, running from the mahādaśā sign ' +
      'in that sign’s own direction. Some lineages start the sub-periods from the ninth ' +
      'from the mahādaśā sign instead; that variant is not computed here.</p>';
  }

  return '<p class="knote">Chara daśā is a <b>sign-based</b> clock. Where Viṃśottarī runs from ' +
    'the Moon’s nakṣatra and gives each graha a fixed span, this runs through the twelve ' +
    'rāśis and reads each one’s length off the distance from that sign to its own lord. ' +
    'Nothing about the Moon enters it, which is why it can be read beside Viṃśottarī rather ' +
    'than against it.</p>' +
    note("Study note — whose system this is",
      "This pane is the Jaimini form from the later commentarial tradition. BPHS gives its own Chara daśā (Vol. 2 Ch. 46 vv. 155–167), computed in “The other daśās of BPHS”.",
      "The two differ. BPHS takes the direction of the whole sequence from the pāda of the 9th sign (v. 167) and gives Vṛścika and Kumbha to the co-lord in the stronger sign, adding one year for an exalted lord and taking one for a debilitated one (vv. 158–166). This pane follows the Jaimini lineage instead: direction from the lagna, the co-lord giving the longer period (the alternative named in the table), and sub-periods from the mahādaśā sign rather than the ninth from it. Each sign’s length — counted in its own direction, minus one — is the same in both.",
      ["dasha", "lagna"]) +
    '<p class="knote">The sequence runs <b>' + (CD.direction ? "forward" : "backward") +
    '</b> from ' + SA[D.LS] + ', because the lagna is in a ' +
    (CD.direction ? "forward-counting (odd-footed)" : "backward-counting (even-footed)") +
    ' sign.</p>' +
    tbl(["Rāśi", "Years", "From – to", "Why that many", "Co-lord"], [rows.join("")]) +
    sub +
    '<div class="kbox kwarn"><b>Read as a period, not a verdict.</b> A daśā is a stretch of time ' +
    'with a name on it. What the name is taken to mean depends on the sign’s lord, its ' +
    'occupants, the kārakas and the rest of the chart — and on which lineage’s reading ' +
    'of Chara daśā you are following, which is a choice this page cannot make for you.</div>';
}
function ordinal(n) {
  return n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
}
try { window.__charaDasha = charaDashaList; window.__charaSpan = charaSpan;
      window.__charaYears = charaYears;
      window.__charaOdd = charaOdd; } catch (e) {}
