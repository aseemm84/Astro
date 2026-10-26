/* ===== The Śrīpati pane ===================================================

   The cusp arithmetic is next door in 72-sripati.js; this is what a reader
   does with it. Three things, in the order they are useful:

   1. THE TWO CHARTS SIDE BY SIDE. Whole-sign and Śrīpati, drawn the same
      way, so the disagreement is visible before it is described. If the
      two charts look identical the reader can stop reading, which is a
      perfectly good outcome and the commonest one.

   2. THE SHIFT REPORT. Exactly which grahas the two systems place
      differently, and — the part that decides whether the difference
      matters — how far each sits from the junction it crossed. A graha
      three degrees past a sandhi is a marginal call that a different
      ayanāṃśa or a four-minute birth-time correction would reverse. One
      sitting fifteen degrees inside its house is not. Software that
      reports the shift without the distance is reporting half the fact.

   3. THE CUSP TABLE AND THE INSPECTOR. Every bhāva's madhya, its sandhis,
      its width, its occupants under both systems, and the lord of the rāśi
      its madhya falls in. Clicking a row opens that one house.

   WHY THE WIDTHS ARE PRINTED. The whole argument for Śrīpati over equal
   houses is that the quadrants are unequal, so the houses should be.
   Measured at Abu Dhabi for a mid-afternoon birth the quadrants come out
   94.8° and 85.2° and the houses 28.4° to 31.6°; at high latitude the
   spread is far wider, and at the equator at an equinox it vanishes and
   Śrīpati agrees with equal houses exactly. Printing
   the widths turns a table that looks arbitrary into the consequence of the
   geometry, and shows the reader when Śrīpati and whole-sign are bound to
   disagree. */

function sripatiPane(D) {
  var A = window.SPSripati && window.SPSripati.analyse(D);
  if (!A)
    return '<p class="knote">Śrīpati houses are built from the ascendant ' +
      'and the meridian, and this chart has no meridian — which happens ' +
      'with incomplete input and at latitudes where the ecliptic does not ' +
      'cross the horizon in the ordinary way. Rather than invent one, the ' +
      'pane stops here. The whole-sign chart above is unaffected.</p>';

  var LS = D.LS, o = [];

  o.push('<p class="klead">Śrīpati bhāva-chalita takes the four angles — ' +
    'the lagna, the meridian and their opposites — and trisects each ' +
    'quadrant in longitude. The trisection points are the <b>bhāva ' +
    'madhya</b>, the middle of each house; the <b>bhāva sandhi</b>, where ' +
    'one house ends and the next begins, is the midpoint between ' +
    'consecutive madhyas. A graha belongs to the house whose madhya it ' +
    'lies nearest.</p>');

  /* the honest note about what the uploaded edition does and does not say */
  o.push('<div class="src"><span>Source</span> The uploaded Santhanam ' +
    'translation does not give this construction as a Parāśara verse, and ' +
    'this page does not claim it does — Śrīpati’s method is its own ' +
    'paddhati. What the edition does give is the doctrine the cusps are ' +
    'FOR: a graha <i>on</i> the cusp gives the full effect of that bhāva, ' +
    'one <i>at</i> the sandhi gives none of it, and between them the ' +
    'effect varies over about 15° — which the translator flags as a ' +
    'passage the Benares (Chaukhambha) edition carries among its special ' +
    'hints, in Vol. 1, Ch. 5. Bhāva Bala in Ch. 27 is likewise reckoned ' +
    'against the meridian, the nadir, the ascendant or the descendant, so ' +
    'the text’s own strength arithmetic presumes an angular frame. ' +
    'Verse numbers in the uploaded scan are OCR-affected; confirm them in ' +
    'the PDF.</div>');

  /* ---- the two charts ---------------------------------------------------- */
  var occW = {}, occS = {};
  A.rows.forEach(function (r) {
    (occW[r.whole] = occW[r.whole] || []).push(GL[r.body] + (r.retro ? "℞" : ""));
    (occS[r.sripati] = occS[r.sripati] || []).push(GL[r.body] + (r.retro ? "℞" : ""));
  });
  var cW = northChart(function (h) { return (LS + h - 1) % 12; },
    function (h) { var a = (occW[h] || []).slice(); if (h === 1) a.unshift("Lg"); return a; },
    "Whole-sign", "the frame the rest of this report reads from");
  var cS = northChart(function (h) { return A.houses[h - 1].sign; },
    function (h) { var a = (occS[h] || []).slice(); if (h === 1) a.unshift("Lg"); return a; },
    "Śrīpati bhāva-chalita", "quadrants trisected between the angles");
  o.push('<div class="kcharts spcharts">' + cW + cS + '</div>');

  /* ---- the shift report --------------------------------------------------- */
  o.push('<h4 class="ksub">What the two systems disagree about</h4>');
  if (!A.shifts.length) {
    o.push('<p class="kgood">Nothing. Every graha falls in the same bhāva ' +
      'under both systems, so a Śrīpati reading of this chart would place ' +
      'each one exactly where the whole-sign reading already does.</p>');
  } else {
    o.push('<table class="ktbl gotbl"><thead><tr><th>Graha</th>' +
      '<th>Whole-sign</th><th>Śrīpati</th><th>From the madhya</th>' +
      '<th>How near the junction</th></tr></thead><tbody>' +
      A.shifts.map(function (r) {
        var d = Math.abs(r.fromMadhya);
        /* distance to the nearer sandhi tells the reader how fragile the
           call is far better than distance from the madhya alone */
        var near = Math.min(
          ((r.lon - A.houses[r.sripati - 1].sandhiStart) % 360 + 360) % 360,
          ((A.houses[r.sripati - 1].sandhiEnd - r.lon) % 360 + 360) % 360);
        var frail = near < 3;
        return '<tr' + (frail ? ' class="spfrail"' : '') + '><td><b>' +
          esc(r.body) + '</b></td><td class="knum">' + r.whole + '</td>' +
          '<td class="knum">' + r.sripati + '</td>' +
          '<td class="knum">' + (r.fromMadhya >= 0 ? "+" : "") +
          r.fromMadhya.toFixed(2) + '°</td><td class="knum">' +
          near.toFixed(2) + '°' + (frail ?
            ' <span class="spwarn">marginal</span>' : '') + '</td></tr>';
      }).join("") + '</tbody></table>');
    var frailN = A.shifts.filter(function (r) {
      var near = Math.min(
        ((r.lon - A.houses[r.sripati - 1].sandhiStart) % 360 + 360) % 360,
        ((A.houses[r.sripati - 1].sandhiEnd - r.lon) % 360 + 360) % 360);
      return near < 3;
    }).length;
    o.push('<p class="knote">' + A.shifts.length + ' graha' +
      (A.shifts.length > 1 ? 's sit' : ' sits') + ' in a different bhāva ' +
      'under the two systems' + (frailN ?
        ', and ' + frailN + ' of those ' + (frailN > 1 ? "are" : "is") +
        ' within three degrees of a junction — close enough that a ' +
        'different ayanāṃśa, or a birth time a few minutes out, would ' +
        'move ' + (frailN > 1 ? "them" : "it") + ' back' : '') + '. ' +
      'This is why the shift is reported with its distance rather than on ' +
      'its own.</p>');
  }

  /* ---- the cusp table ----------------------------------------------------- */
  o.push('<h4 class="ksub">The twelve bhāvas</h4>');
  o.push('<table class="ktbl gotbl sptbl"><thead><tr><th>Bhāva</th>' +
    '<th>Sandhi (start)</th><th>Madhya (cusp)</th><th>Sandhi (end)</th>' +
    '<th>Width</th><th>Rāśi of the madhya</th><th>Lord</th>' +
    '<th>Occupants</th></tr></thead><tbody>' +
    A.houses.map(function (h) {
      return '<tr><td><b>' + h.house + '</b></td>' +
        '<td>' + SA[Math.floor(h.sandhiStart / 30) % 12] + ' ' + dm(h.sandhiStart % 30) + '</td>' +
        '<td class="spmad"><b>' + SA[h.sign] + ' ' + dm(h.madhya % 30) + '</b></td>' +
        '<td>' + SA[Math.floor(h.sandhiEnd / 30) % 12] + ' ' + dm(h.sandhiEnd % 30) + '</td>' +
        '<td class="knum">' + h.width.toFixed(2) + '°</td>' +
        '<td>' + SA[h.sign] + (h.sign !== h.wholeSign ?
          ' <span class="spdiff">(whole-sign: ' + SA[h.wholeSign] + ')</span>' : '') + '</td>' +
        '<td>' + esc(LORD[h.sign]) + '</td>' +
        '<td>' + (h.occupants.join(", ") || "—") + '</td></tr>';
    }).join("") + '</tbody></table>');

  /* ---- why the houses are uneven ------------------------------------------ */
  o.push('<p class="klegend">The four quadrants of this chart measure ' +
    A.quadrants.map(function (q) { return q.toFixed(1) + "°"; }).join(" · ") +
    ' — MC to lagna, lagna to IC, IC to descendant, descendant to MC. ' +
    'Trisecting them gives houses from ' + A.narrowest.toFixed(1) + '° to ' +
    A.widest.toFixed(1) + '° wide. That spread is the whole argument for ' +
    'the method: the quadrants are unequal because of the latitude and the ' +
    'obliquity, so houses that follow them are unequal too. At the equator ' +
    'and at the equinox they would all be 30° and Śrīpati would agree with ' +
    'equal houses exactly.</p>');

  /* ---- the 15° rule, applied ---------------------------------------------- */
  o.push('<h4 class="ksub">How near each graha sits to its cusp</h4>');
  o.push('<table class="ktbl gotbl"><thead><tr><th>Graha</th><th>Bhāva</th>' +
    '<th>From the madhya</th><th>Effect for that bhāva</th></tr></thead>' +
    '<tbody>' + A.rows.map(function (r) {
      var pct = r.strength == null ? null : Math.round(r.strength * 100);
      return '<tr><td><b>' + esc(r.body) + '</b></td>' +
        '<td class="knum">' + r.sripati + '</td>' +
        '<td class="knum">' + (r.fromMadhya >= 0 ? "+" : "") +
        r.fromMadhya.toFixed(2) + '°</td>' +
        '<td>' + (pct == null ? "—" :
          '<span class="spbar"><i style="width:' + pct + '%"></i></span> ' +
          pct + '%') + '</td></tr>';
    }).join("") + '</tbody></table>');
  o.push('<p class="knote">Read as the edition states it: full on the ' +
    'madhya, nothing at the sandhi, and a proportion between — over 15°, ' +
    'or over half the house where the house is narrower than 30°, since ' +
    'the text is explicit that a graha at the sandhi gives no result for ' +
    'that bhāva. This is a weight for reading, not a score, and it says ' +
    'nothing about whether the graha is strong in itself — that is ' +
    'ṣaḍbala, which this report computes separately.</p>');

  return o.join("");
}
