/* ===== Four points this chart already contains =============================

   Each of these is one line of arithmetic on longitudes the report has had all
   along. None of them needed new astronomy; they needed someone to divide by
   two and name the result.

   WHAT THEY ARE, AND WHOSE THEY ARE. This is the part that matters more than
   the arithmetic, and the part a feature request will not tell you:

     Bhṛgu Bindu   — the midpoint from Rāhu to the Moon. LATER TRADITION. It is
                     not in Parāśara. It is widely taught and widely useful and
                     it is still not Parāśara, and a reader deciding how much
                     weight to give it is entitled to know which.
     Yogi, Avayogi — Sun + Moon + 93°20′, and the point 186°40′ on from it, with
                     the nakṣatra lords of each. LATER TRADITION, same note.
     64th navāṃśa  — the navāṃśa 210° on from the Moon and from the lagna.
     22nd drekkāṇa — the drekkāṇa 210° on from the lagna.
                     These two are commonly cited as Parāśara's. The verse was
                     NOT located in the uploaded Santhanam OCR, which is poor in
                     the relevant chapters, so they are labelled as classical
                     and attributed with that caveat rather than given a chapter
                     number this project cannot stand behind. Fabricating the
                     citation would be worse than lacking it.

   WHAT IS NOT HERE. Puṣkara navāṃśa and Puṣkara bhāga were asked for and are
   absent. Both need a lookup table — which navāṃśas, which degrees — and the
   sources do not all print the same one. A table recalled from memory is a
   fabricated citation with a number on it. They go in when the table can be
   read from a source and cited to it.

   TONE. The 64th navāṃśa and the 22nd drekkāṇa belong to the ariṣṭa literature,
   which is about danger and death. They are reported here as positions and as
   what the tradition says they ARE, with no prediction attached to them and no
   suggestion that a transit over one means anything will happen. */

var DP_SRC = {
  bphs:      { label: "BPHS", cls: "dpb" },
  classical: { label: "classical", cls: "dpc" },
  tradition: { label: "later tradition", cls: "dpt" },
  astronomy: { label: "astronomy", cls: "dpa" }
};
function dpTag(k) {
  var s = DP_SRC[k] || DP_SRC.tradition;
  return '<span class="dptag ' + s.cls + '">' + esc(s.label) + "</span>";
}
function dpNorm(x) { return ((x % 360) + 360) % 360; }
/* a longitude written the way a chart writes one: 12° Siṃha 24′ */
function dpDeg(lon) {
  var L = dpNorm(lon), s = Math.floor(L / 30), d = L - s * 30;
  var deg = Math.floor(d), min = Math.round((d - deg) * 60);
  if (min === 60) { min = 0; deg++; }
  return deg + "° " + SA[s] + " " + (min < 10 ? "0" : "") + min + "′";
}

/* The midpoint from Rāhu FORWARD to the Moon — not the shorter arc between
   them. Those are the same point only when the two are less than 180° apart,
   and taking the near midpoint silently puts the result 180° out for about
   half of all charts. Going forward from Rāhu by half the forward distance is
   the definition, and it is unambiguous. */
function dpBhriguBindu(moon, rahu) {
  return dpNorm(rahu + dpNorm(moon - rahu) / 2);
}
function dpYogiPoint(sun, moon) { return dpNorm(sun + moon + 93 + 20 / 60); }

function derivedPointsSection(D) {
  if (!D || !D.P || !D.P.Moon || !D.P.Sun) return "";
  var moon = D.P.Moon.sid, sun = D.P.Sun.sid;
  var rahu = D.P.Rahu ? D.P.Rahu.sid : null;
  var lag = (D.lagna && D.lagna.sidereal_deg != null) ? D.lagna.sidereal_deg : null;
  var rows = [];

  if (rahu != null) {
    var bb = dpBhriguBindu(moon, rahu);
    rows.push({
      t: "Bhṛgu Bindu", src: "tradition", v: dpDeg(bb),
      nak: nakOf ? nakOf(bb) : null,
      w: "The midpoint of the arc running forward from Rāhu to the Moon. Later " +
         "tradition treats it as a point transits are felt over; it is not a " +
         "Parāśara concept and the report does not weigh it as one."
    });
  }

  var yp = dpYogiPoint(sun, moon);
  var av = dpNorm(yp + 186 + 40 / 60);
  var ynak = nakOf ? nakOf(yp) : null, anak = nakOf ? nakOf(av) : null;
  rows.push({
    t: "Yogi point", src: "tradition", v: dpDeg(yp), nak: ynak,
    w: "Sun plus Moon plus 93°20′. The lord of the nakṣatra it falls in is " +
       "called the Yogi planet" +
       (ynak && ynak.lord ? " — here " + esc(ynak.lord) : "") + "."
  });
  rows.push({
    t: "Avayogi point", src: "tradition", v: dpDeg(av), nak: anak,
    w: "186°40′ on from the Yogi point — six nakṣatras away. Its nakṣatra " +
       "lord is the Avayogi" + (anak && anak.lord ? " — here " + esc(anak.lord) : "") + "."
  });

  if (lag != null) {
    rows.push({
      t: "64th navāṃśa from the lagna", src: "classical", v: dpDeg(lag + 210),
      nak: nakOf ? nakOf(dpNorm(lag + 210)) : null,
      w: "210° on from the lagna, which is the fourth sign of the navāṃśa " +
         "reckoned from the lagna's own. The ariṣṭa literature names it a " +
         "sensitive degree. It is a position, not a forecast."
    });
    rows.push({
      t: "22nd drekkāṇa from the lagna", src: "classical", v: dpDeg(lag + 210),
      nak: null,
      w: "The same 210°, read as a drekkāṇa rather than a navāṃśa — the " +
         "eighth drekkāṇa counted from the lagna's. Reported for completeness; " +
         "the two coincide in degree and differ in what is read off it."
    });
  }
  rows.push({
    t: "64th navāṃśa from the Moon", src: "classical", v: dpDeg(moon + 210),
    nak: nakOf ? nakOf(dpNorm(moon + 210)) : null,
    w: "The same rule applied from the natal Moon instead of the lagna."
  });

  var h = '<p class="knote">Four points the chart already contained, each one ' +
    'arithmetic on longitudes above. <b>None of these is Parāśara’s.</b> ' +
    'Bhṛgu Bindu and the Yogi pair are later tradition; the 64th navāṃśa and ' +
    '22nd drekkāṇa are classical and usually attributed to BPHS, but the verse ' +
    'was not found in the uploaded translation, so they are not cited to a ' +
    'chapter here. The tag on each row says which.</p>';
  h += '<table class="ktable dptable"><thead><tr><th>Point</th><th>Source</th>' +
       "<th>Longitude</th><th>Nakṣatra</th></tr></thead><tbody>";
  rows.forEach(function (r) {
    h += "<tr><td><b>" + esc(r.t) + "</b></td><td>" + dpTag(r.src) + "</td>" +
         '<td class="knum">' + esc(r.v) + "</td><td>" +
         (r.nak ? esc(r.nak.name + (r.nak.lord ? " · " + r.nak.lord : "")) : "—") +
         "</td></tr>";
    h += '<tr class="dpwhy"><td colspan="4">' + r.w + "</td></tr>";
  });
  h += "</tbody></table>";
  h += '<p class="knote">No transit over any of these is flagged as an event, ' +
       'and nothing here is read as a prediction. The 64th navāṃśa and the 22nd ' +
       'drekkāṇa come from the literature on ariṣṭa, which is about danger; ' +
       'this report gives their positions and what the tradition says they are, ' +
       'and stops there.</p>';
  return h;
}
