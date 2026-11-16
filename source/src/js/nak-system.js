/* ===== the nakṣatra system: equal or unequal, one answer for the whole site ====

   Every page asks this module which nakṣatra a sidereal longitude is in, how far
   through it, and which pāda, so a single setting in the master panel decides it
   everywhere: names, pādas, the Vimśottarī balance, wheels, the pañcāṅga.

   EQUAL (the default, and BPHS's own): 27 divisions of 13°20′ from Aśvinī 0°.

   UNEQUAL: the older scheme in which six nakṣatras are half the normal width,
   fifteen normal and six one-and-a-half (the 15-, 30- and 45-muhūrta classes of
   Garga, used in Brahmagupta's Khaṇḍakhādyaka and by later siddhāntins).
     short (½): Bharaṇī, Ārdrā, Āśleṣā, Svātī, Jyeṣṭhā, Śatabhiṣā
     long  (1½): Rohiṇī, Punarvasu, Uttara Phalgunī, Viśākhā, Uttarāṣāḍhā, Uttara Bhādrapadā
   Two ways of fixing the unit, chosen by a sub-setting:
     u27 — scaled to fill the circle: the units add to 27, so a unit is 13°20′
           (short 6°40′, normal 13°20′, long 20°). No Abhijit.
     u28 — the unit is the Moon's mean daily motion, 13°10′35″; the 4°14′ left
           over is Abhijit, placed after Uttarāṣāḍhā (28 nakṣatras).

   DAŚĀS. Vimśottarī and the other nakṣatra daśās count 27 nakṣatras. Under u28,
   Abhijit has no daśā lord of its own, so for a daśā its arc is counted with
   Uttarāṣāḍhā, the nakṣatra it was cut from: `d` and `dfrac` below give the
   27-nakṣatra index and the fraction through that merged arc. Under the other
   systems `d` and `dfrac` equal `i` and `frac`.

   PĀDAS. Each nakṣatra, whatever its width, is quartered.

   This file is concatenated into engine.js, site.js and the adopted pages'
   panel; the first copy to run defines window.NNak and the rest step aside. */
(function () {
  "use strict";
  var G = typeof window !== "undefined" ? window : globalThis;
  if (G.NNak) return;

  var NAMES = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā",
    "Pūrva Phalgunī", "Uttara Phalgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  var SHORT = [1, 5, 8, 14, 17, 23], LONG = [3, 6, 11, 15, 20, 25];
  var EQ = 40 / 3, MEAN = 13 + 10 / 60 + 35 / 3600;

  function readMode() {
    try {
      var st = JSON.parse(G.localStorage.getItem("nirayana.settings") || "{}") || {};
      if (st.nak !== "unequal") return "equal";
      return st.naksch === "u28" ? "u28" : "u27";
    } catch (e) { return "equal"; }
  }
  /* the edges for a system: [{i, start, end}], i = 27 for Abhijit */
  var TABLES = {};
  function table(m) {
    if (TABLES[m]) return TABLES[m];
    var out = [], a = 0;
    if (m === "equal") { for (var k = 0; k < 27; k++) out.push({ i: k, start: k * EQ, end: (k + 1) * EQ }); }
    else {
      var u = m === "u28" ? MEAN : EQ;
      for (var j = 0; j < 27; j++) {
        var w = SHORT.indexOf(j) >= 0 ? u / 2 : LONG.indexOf(j) >= 0 ? 1.5 * u : u;
        out.push({ i: j, start: a, end: a + w }); a += w;
        if (m === "u28" && j === 20) { out.push({ i: 27, start: a, end: a + (360 - 27 * MEAN) }); a += 360 - 27 * MEAN; }
      }
      out[out.length - 1].end = 360;            /* close the circle exactly */
    }
    TABLES[m] = out;
    return out;
  }
  var MODE = null;
  function mode() { if (MODE === null) MODE = readMode(); return MODE; }
  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function find(T, x) {
    for (var k = 0; k < T.length; k++) if (x < T[k].end) return T[k];
    return T[T.length - 1];
  }
  /* everything a page may want about a longitude */
  function at(lon, m) {
    m = m || mode();
    var T = table(m), x = norm(lon), e = find(T, x), span = e.end - e.start, frac = (x - e.start) / span;
    var r = { i: e.i, name: e.i === 27 ? "Abhijit" : NAMES[e.i], start: e.start, end: e.end, span: span,
              frac: frac, pada: Math.min(4, Math.floor(frac * 4) + 1), into: x - e.start, mode: m, d: e.i, dfrac: frac, dstart: e.start, dspan: span };
    if (m === "u28" && (e.i === 27 || e.i === 20)) {
      var U = T.filter(function (q) { return q.i === 20; })[0], A = T.filter(function (q) { return q.i === 27; })[0];
      r.d = 20; r.dstart = U.start; r.dspan = A.end - U.start; r.dfrac = (x - U.start) / r.dspan;
    }
    return r;
  }
  var LABEL = {
    equal: "equal nakṣatras (27 × 13°20′, BPHS)",
    u27: "unequal nakṣatras (Garga's ½·1·1½ widths, scaled to 360°)",
    u28: "unequal nakṣatras (Garga's ½·1·1½ widths on the Moon's mean motion, with Abhijit)"
  };
  G.NNak = {
    mode: mode,
    /* re-read the store, after the panel changes it */
    refresh: function () { MODE = null; return mode(); },
    at: at,
    idx: function (lon) { return at(lon).i; },
    edges: function (m) { return table(m || mode()).slice(); },
    names: NAMES.slice(),
    name: function (i) { return i === 27 ? "Abhijit" : NAMES[i]; },
    label: function (m) { return LABEL[m || mode()]; },
    count: function (m) { return (m || mode()) === "u28" ? 28 : 27; },
    isEqual: function () { return mode() === "equal"; },
    EQ: EQ, MEAN: MEAN, SHORT: SHORT.slice(), LONG: LONG.slice()
  };
  try { G.addEventListener("nirayana:settings", function () { MODE = null; }); } catch (e) {}
})();
