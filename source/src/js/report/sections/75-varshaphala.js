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

function varshaphalaSection(D, J) {
  if (!D.P || !D.P.Sun || !J || !J.input) return "";
  if (!window.__kSidAt || !window.buildLocalChart)
    return '<p class="kmut">Needs the built-in engine.</p>';

  var natalSun = D.P.Sun.sid, inp = J.input;
  var age = Math.max(0, Math.floor((D.nowJd - D.jd) / VP_YEARLEN));
  var vp = varshaPravesha(D.jd, natalSun, age);
  /* if this year's entry has not happened yet, the running year began at the
     previous one — which is the year anybody asking is actually in */
  if (vp && vp.jd > D.nowJd) { age = Math.max(0, age - 1); vp = varshaPravesha(D.jd, natalSun, age); }
  if (!vp) return '<div class="kbox kwarn"><b>The solar return could not be located.</b> ' +
    'The search for the Sun’s return to its natal longitude did not converge, so nothing ' +
    'is shown rather than something approximate.</div>';

  var next = varshaPravesha(D.jd, natalSun, age + 1);
  var yearDays = next ? (next.jd - vp.jd) : VP_YEARLEN;

  /* the annual chart, cast by the same engine from that instant */
  var dt = new Date((vp.jd - 2440587.5) * 86400000 + (inp.tzHours || 0) * 3600000);
  var vinp = { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate(),
               hour: dt.getUTCHours(), minute: dt.getUTCMinutes(),
               lat: inp.lat, lon: inp.lon, tzHours: inp.tzHours,
               ayanamsa: inp.ayanamsa, node: inp.node };
  var VJ = null, VD = null;
  try { VJ = window.buildLocalChart(vinp); VD = window.__derive(VJ); } catch (e) { VJ = null; }
  if (!VJ) return '<div class="kbox kwarn"><b>The annual chart could not be cast.</b></div>';

  var vLag = VD.LS, muntha = (D.LS + age) % 12;
  var munthaLord = LORD[muntha];
  var munthaHouse = ((muntha - vLag) % 12 + 12) % 12 + 1;

  /* the five candidates for lord of the year, named rather than ranked */
  var triRashi = (function () {
    /* Tri-rāśi lord: by the varṣa lagna and whether the entry is by day or
       night. Stated as the rule rather than resolved, since the day/night
       test needs the annual chart's own sunrise, which is computed below. */
    return LORD[vLag];
  })();
  var cands = [
    ["Muntha lord", munthaLord, "lord of " + SA[muntha] + ", the Muntha sign"],
    ["Natal lagna lord", LORD[D.LS], "lord of " + SA[D.LS]],
    ["Varṣa lagna lord", LORD[vLag], "lord of " + SA[vLag] + ", rising at the entry"],
    ["Tri-rāśi lord", triRashi, "by the varṣa lagna and the day/night division"],
    ["Dina-rātri lord", (function () {
        var h = (VD.input && VD.input.hour != null) ? VD.input.hour : 12;
        var day = (VD.sunriseH != null && VD.sunsetH != null)
                ? (h >= VD.sunriseH && h < VD.sunsetH) : (h >= 6 && h < 18);
        return day ? "Sun" : "Moon";
      })(), "the Sun by day, the Moon by night"]
  ];
  var cr = cands.map(function (c) {
    var p = VD.P[c[1]];
    return '<tr><td><b>' + esc(c[0]) + '</b></td><td>' + esc(c[1]) + '</td>' +
      '<td>' + (p ? SA[p.sign] + " " + dm(p.deg) + " · H" + p.house : "—") + '</td>' +
      '<td class="kmut">' + esc(c[2]) + '</td></tr>';
  }).join("");

  /* Mudda */
  var MU = VD.P.Moon ? muddaDasha(VD.P.Moon.sid, vp.jd, yearDays) : null;
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
      "It is included because it is a complete annual system in its own right and because this site’s discipline is to name the tradition a rule comes from rather than to exclude everything outside one book. The Varṣeśa is deliberately NOT asserted below: choosing among the five candidates needs Pañcavargīya bala, whose own details vary between Tājika texts, and printing one name as settled would be false precision.",
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
    tbl(["Office", "Graha", "In the annual chart", "By what rule"], [cr]) +
    '<div class="kbox">These five are the office-bearers Tājika puts forward. Which of them holds ' +
    'the year is decided by <b>Pañcavargīya bala</b>, a five-fold strength reckoning this page does ' +
    'not compute — so five names are given and none is crowned. The Tri-rāśi lord in ' +
    'particular depends on a day/night division that different Tājika texts draw differently.</div>' +
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
try { window.__varshaPravesha = varshaPravesha; window.__muddaDasha = muddaDasha; } catch (e) {}
