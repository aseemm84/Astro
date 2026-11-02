/* ============ Prastārāṣṭakavarga and the kakṣyā transit scanner ============

   WHAT THE PRASTĀRA IS. The bhinnāṣṭakavarga already on this site gives each
   graha a row of twelve numbers — how many bindus each sign carries in that
   graha's own reckoning. Those numbers are SUMS. The prastāra is the same
   thing with the sum not yet taken: eight rows, one per contributor, showing
   WHICH of them gave the bindu. The totals at the foot are the bhinna row,
   so the two cannot disagree; the point of keeping the rows is that the
   kakṣyā reading below needs them individually.

   WHAT A KAKṢYĀ IS. Each sign of 30° is divided into eight parts of 3°45′,
   and the eight belong, in fixed order, to Saturn, Jupiter, Mars, the Sun,
   Venus, Mercury, the Moon and the Lagna. A transiting graha is always in
   one of them. The reading is a single question: in the transiting graha's
   OWN prastāra, did the lord of the kakṣyā it is passing through give a
   bindu to that sign? If it did, the passage is read as supported; if not,
   not.

   This is finer than "how many bindus does this sign carry". A sign with six
   bindus still has two kakṣyās without one, and a graha crossing those two
   is crossing the unsupported part of a well-supported sign. That is the
   whole reason the division exists.

   TIER. BPHS gives ashtakavarga at length, including transit judgement by
   bindus, and the uploaded Santhanam edition carries it. The KAKṢYĀ
   refinement — the 3°45′ division and the fixed order of its eight lords —
   is standard ashtakavarga practice in the later literature; it is not
   quoted here from the uploaded files and is labelled as later practice
   rather than as Parāśara's own.

   A supported transit is not a good event and an unsupported one is not a
   bad one. This names a condition; it does not predict. */

var KAK_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Lagna"];
var KAK_SIZE = 30 / 8;                       /* 3°45′ */
var KAK_DEV = { Saturn: "शनि", Jupiter: "गुरु", Mars: "मङ्गल", Sun: "सूर्य",
                Venus: "शुक्र", Mercury: "बुध", Moon: "चन्द्र", Lagna: "लग्न" };

/* which kakṣyā a sidereal longitude falls in: 0..7 within its sign */
function kakshyaOf(sid) {
  var x = ((sid % 360) + 360) % 360, d = x - Math.floor(x / 30) * 30;
  return Math.min(7, Math.floor(d / KAK_SIZE));
}

function prastaraSection(D, J) {
  var AV = J && J.ashtakavarga;
  if (!AV || !AV.prastara) return "";
  var P = AV.prastara, order = AV.kakshya_order || KAK_ORDER;

  /* one 8 × 12 grid per graha, the eight rows summing to the bhinna row */
  var grids = AVORDER_R.map(function (pl) {
    var rows = order.map(function (c) {
      var r = P[pl] && P[pl][c];
      if (!r) return "";
      var cells = r.map(function (v, sg) {
        return '<td class="kb' + (v ? ' kbon' : '') + '">' + (v ? "●" : "·") + '</td>';
      }).join("");
      var n = r.reduce(function (a, x) { return a + x; }, 0);
      return '<tr><td><b>' + esc(c) + '</b></td>' + cells +
             '<td class="knum">' + n + '</td></tr>';
    }).join("");
    var bh = (AV.bhinna || []).filter(function (b) { return b.graha === pl; })[0];
    var tot = bh ? bh.bindus.map(function (v) {
        return '<td class="kb"><b>' + v + '</b></td>'; }).join("") : "";
    var head = ['<th>Contributor</th>'].concat(SA.map(function (s) {
      return '<th>' + s.slice(0, 2) + '</th>'; })).concat(['<th>n</th>']).join("");
    return '<h4 class="ksub">' + esc(pl) + ' — prastāra' +
      (bh ? ' <span class="kmut">(' + bh.total + ' bindus)</span>' : '') + '</h4>' +
      '<div class="ktwrap" tabindex="0" role="group"><table class="ktbl kprastara"><thead><tr>' +
      head + '</tr></thead><tbody>' + rows +
      '<tr class="kprtot"><td><b>Bhinnāṣṭakavarga</b></td>' + tot +
      '<td class="knum"><b>' + (bh ? bh.total : "") + '</b></td></tr>' +
      '</tbody></table></div>';
  }).join("");

  /* ---- the kakṣyā reading for every graha, right now ---- */
  var krows = AVORDER_R.map(function (pl) {
    var p = D.P[pl]; if (!p) return "";
    var k = kakshyaOf(p.sid), lord = order[k];
    var row = P[pl] && P[pl][lord];
    var has = row ? !!row[p.sign] : null;
    var into = (p.deg - k * KAK_SIZE);
    var bh = (AV.bhinna || []).filter(function (b) { return b.graha === pl; })[0];
    var bind = bh ? bh.bindus[p.sign] : null;
    return '<tr><td><b>' + esc(pl) + '</b></td>' +
      '<td>' + SA[p.sign] + ' ' + dm(p.deg) + '</td>' +
      '<td class="knum">' + (k + 1) + ' of 8</td>' +
      '<td>' + esc(lord) + ' <span class="kmut">' + KAK_DEV[lord] + '</span></td>' +
      '<td class="knum">' + dm(k * KAK_SIZE) + ' – ' + dm((k + 1) * KAK_SIZE) +
      ' <span class="kmut">(' + into.toFixed(2) + '° in)</span></td>' +
      '<td class="knum">' + (bind == null ? "—" : bind + "/8") + '</td>' +
      '<td style="font-weight:600;color:' +
        (has === null ? "inherit" : (has ? "var(--sem-good,#1c6b46)" : "var(--sem-bad,#a1493a)")) +
        '">' + (has === null ? "—" : (has ? "bindu" : "no bindu")) + '</td></tr>';
  }).join("");

  /* ---- and the whole of one sign, kakṣyā by kakṣyā, for the Moon's sign ----
     A worked strip, so the division is visible rather than asserted. */
  var strip = "";
  if (D.P.Moon) {
    var sg = D.P.Moon.sign, rowsK = order.map(function (c, i) {
      var cells = AVORDER_R.map(function (pl) {
        var r = P[pl] && P[pl][c], on = r ? !!r[sg] : false;
        return '<td class="kb' + (on ? ' kbon' : '') + '">' + (on ? "●" : "·") + '</td>';
      }).join("");
      return '<tr><td class="knum">' + (i + 1) + '</td>' +
        '<td class="knum">' + dm(i * KAK_SIZE) + '–' + dm((i + 1) * KAK_SIZE) + '</td>' +
        '<td><b>' + esc(c) + '</b></td>' + cells + '</tr>';
    }).join("");
    strip = '<h4 class="ksub">' + SA[sg] + ', kakṣyā by kakṣyā</h4>' +
      '<p class="knote">The Moon’s own sign, divided into its eight parts. Read a column ' +
      'downwards to see which stretches of this sign support that graha’s passage and which ' +
      'do not — the thing a bindu total cannot tell you.</p>' +
      '<div class="ktwrap" tabindex="0" role="group"><table class="ktbl kprastara"><thead><tr>' +
      '<th>#</th><th>Span</th><th>Kakṣyā lord</th>' +
      AVORDER_R.map(function (p) { return '<th>' + GL[p] + '</th>'; }).join("") +
      '</tr></thead><tbody>' + rowsK + '</tbody></table></div>' +
      '<p class="klegend">A filled circle means that kakṣyā’s lord gives a bindu to ' +
      SA[sg] + ' in that graha’s own ashtakavarga.</p>';
  }

  return '<p class="knote">The bhinnāṣṭakavarga gives each sign a number of bindus. The ' +
    '<b>prastāra</b> is that number before it was added up: eight rows showing <i>which</i> ' +
    'contributor gave each bindu. The totals at the foot of every grid are the bhinna row, so ' +
    'the two are one computation.</p>' +
    note("Study note — why the rows are worth keeping",
      "A sign with six bindus still has two kakṣyās without one. A graha crossing those two is crossing the unsupported part of a well-supported sign, and no total can tell you that.",
      "BPHS gives ashtakavarga at length, transit judgement by bindus included, and the uploaded Santhanam edition carries it. The KAKṢYĀ refinement — the 3°45′ division and the fixed order of its eight lords, Śani first and the Lagna last — is standard later ashtakavarga practice and is not quoted here from the uploaded files.",
      ["av", "aspect"]) +
    '<h4 class="ksub">Where each graha stands now</h4>' +
    '<p class="knote">For each graha: the kakṣyā it is passing through, whose it is, and whether ' +
    'that lord gives a bindu to the sign in <i>this graha’s own</i> ashtakavarga. The bindu ' +
    'column is the sign’s total, for contrast — a graha can sit in an unsupported ' +
    'kakṣyā of a well-supported sign, and that is the case worth seeing.</p>' +
    tbl(["Graha", "Position", "Kakṣyā", "Its lord", "Span in sign", "Sign total", "This kakṣyā"],
        [krows]) +
    strip +
    '<h4 class="ksub">The eight grids</h4>' + grids +
    '<div class="kbox kwarn"><b>A condition, not an event.</b> A supported passage is not a good ' +
    'thing happening and an unsupported one is not a bad thing happening. Ashtakavarga grades the ' +
    'ground a transit crosses; what is made of that ground depends on the rest of the chart, and ' +
    'on nothing this table can see.</div>';
}
var AVORDER_R = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
try { window.__kakshyaOf = kakshyaOf; window.__kakOrder = KAK_ORDER; } catch (e) {}
