/* ===== The Shodaśavarga matrix — all sixteen divisions at once ============

   WHAT THIS ADDS over what the builder already had. The sixteen divisional
   mappings have been in the engine from the start, and several of the
   vargas have a panel of their own. What was missing is the thing a reader
   actually wants in front of them: one grid, sixteen rows by eleven
   columns, every graha in every division, so the eye can run DOWN a column
   and see where one graha is consistently strong, and ACROSS a row and see
   whether a division is crowded.

   That reading is the whole point of the sixteen-fold scheme. Vimśopaka
   strength exists precisely because a graha's dignity in one chart means
   little and its dignity across the set means a great deal. A page that
   shows the divisions one at a time makes the comparison impossible.

   WHAT IS NOT CLAIMED. The divisions themselves are BPHS Ch. 6, and the
   arithmetic is the engine's, unchanged — this file computes nothing new,
   it only arranges. The kārya line for each division (what it is read FOR)
   is the standard association of the tradition: BPHS names the divisions
   and gives their construction, and the topical assignments are developed
   in the commentarial and later literature. The column is labelled
   accordingly rather than being passed off as a verse.

   A NOTE ON D30. Trimśāṃśa has no 30th part in the ordinary sense — the
   division is into five unequal parts ruled by the five non-luminaries, so
   its cells never show Karka or Siṃha. That is correct, not a gap, and the
   footnote says so because it looks like a bug. */

var SV16 = [
  ["D1",  "Rāśi",           "the body and the whole life"],
  ["D2",  "Horā",           "wealth and sustenance"],
  ["D3",  "Drekkāṇa",       "siblings, courage, vitality"],
  ["D4",  "Caturthāṃśa",    "fixed property, home, fortune"],
  ["D7",  "Saptāṃśa",       "progeny and what issues from one"],
  ["D9",  "Navāṃśa",        "dharma, the spouse, inner ripening"],
  ["D10", "Daśāṃśa",        "action in the world, profession"],
  ["D12", "Dvādaśāṃśa",     "parents and lineage"],
  ["D16", "Ṣoḍaśāṃśa",      "vehicles, comforts, contentment"],
  ["D20", "Viṃśāṃśa",       "spiritual practice, upāsanā"],
  ["D24", "Caturviṃśāṃśa",  "learning and what is studied"],
  ["D27", "Saptaviṃśāṃśa",  "constitutional strength and weakness"],
  ["D30", "Triṃśāṃśa",      "ariṣṭa — the sources of difficulty"],
  ["D40", "Khavedāṃśa",     "maternal legacy, auspicious effects"],
  ["D45", "Akṣavedāṃśa",    "paternal legacy, conduct, character"],
  ["D60", "Ṣaṣṭyāṃśa",      "the karmic totality, root causation"]
];
function norm360(x){ return ((x % 360) + 360) % 360; }
var SV_BODIES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                 "Saturn", "Rahu", "Ketu"];

/* the matrix as data, so the exporter and the page share one source */
function shodashavargaMatrix(D) {
  if (!D || !D.planets) return null;
  var bySid = {};
  D.planets.forEach(function (p) { bySid[p.en] = p.sid; });
  var ascSid = D.lagna && D.lagna.sidereal_deg;
  return SV16.map(function (v) {
    var code = v[0];
    var row = { varga: code, name: v[1], karya: v[2], cells: {} };
    /* vargaLagna is the report bundle's own copy of the sixteen
       constructions; the engine's vargaSign is inside the engine's scope
       and not reachable from here. The two are the same arithmetic — the
       harness checks a sample of cells against the engine to make sure
       they stay that way. */
    row.cells.Lagna = (ascSid == null) ? null : vargaLagna(code, norm360(ascSid));
    SV_BODIES.forEach(function (b) {
      row.cells[b] = (bySid[b] == null) ? null
                   : vargaLagna(code, norm360(bySid[b]));
    });
    return row;
  });
}

/* how often each graha lands in the same rāśi across the sixteen — the
   number the grid exists to let someone read off, computed so it cannot
   be read off wrongly */
function vargaConcentration(M) {
  if (!M) return null;
  var out = {};
  ["Lagna"].concat(SV_BODIES).forEach(function (b) {
    var count = {}, best = null, bestN = 0;
    M.forEach(function (r) {
      var s = r.cells[b];
      if (s == null) return;
      count[s] = (count[s] || 0) + 1;
      if (count[s] > bestN) { bestN = count[s]; best = s; }
    });
    out[b] = { sign: best, times: bestN, of: M.length };
  });
  return out;
}

function shodashavargaSection(D) {
  var M = shodashavargaMatrix(D);
  if (!M) return "";
  var C = vargaConcentration(M);
  var cols = ["Lagna"].concat(SV_BODIES);

  var head = '<tr><th>Varga</th><th>Kārya</th>' +
    cols.map(function (b) {
      return '<th>' + esc(b === "Lagna" ? "Lagna" : (GL[b] || b)) + '</th>';
    }).join("") + '</tr>';

  var rows = M.map(function (r) {
    return '<tr><td><b>' + r.varga + '</b> <span class="svname">' +
      esc(r.name) + '</span></td><td class="svkarya">' + esc(r.karya) +
      '</td>' + cols.map(function (b) {
        var s = r.cells[b];
        return '<td class="svcell">' + (s == null ? "—" : SA[s]) + '</td>';
      }).join("") + '</tr>';
  }).join("");

  var conc = cols.map(function (b) {
    var c = C[b];
    if (!c || c.sign == null) return "";
    return '<li><b>' + esc(b === "Lagna" ? "Lagna" : b) + '</b> falls in ' +
      SA[c.sign] + ' in <b>' + c.times + '</b> of the ' + c.of +
      ' divisions</li>';
  }).join("");

  return '<p class="knote">All sixteen divisions of BPHS Ch. 6 at once. ' +
    'Read a <b>column</b> downward to see where one graha keeps landing ' +
    'across the set — that repetition is what vimśopaka strength measures ' +
    'and what a single divisional chart cannot show. Read a <b>row</b> ' +
    'across to see how crowded one division is.</p>' +
    '<div class="goscroll svwrap"><table class="ktbl gotbl svtbl"><thead>' +
    head + '</thead><tbody>' + rows + '</tbody></table></div>' +
    '<h4 class="ksub">Where each lands most often</h4>' +
    '<ul class="golist svconc">' + conc + '</ul>' +
    '<p class="knote">The division constructions are BPHS Ch. 6 and the ' +
    'arithmetic is the engine’s, unchanged. The <b>kārya</b> column — ' +
    'what each division is read <i>for</i> — is the standard association ' +
    'of the tradition rather than a line from the verses, which name the ' +
    'divisions and give their construction. <b>Triṃśāṃśa (D30)</b> is ' +
    'divided into five unequal parts ruled by the five non-luminaries, so ' +
    'its cells never show Karka or Siṃha; that is the construction, not a ' +
    'gap. Verse numbers in the uploaded scan are OCR-affected; confirm ' +
    'them in the PDF.</p>';
}
