/* ===== Twelve Candra-rāśi readings of a year's transits ===================

   WHAT THIS DOES. Takes the year computed next door and reads it from each
   of the twelve Moon signs in turn: which house each graha occupies counted
   from that sign, for how long, whether the classical gochara rules call
   that placement favourable, and which of the named Śani conditions are
   running. No birth data is needed, because none of this depends on any
   chart — a janma-rāśi is a starting point for counting, not a horoscope.

   WHY EVERY RULE CARRIES A TIER. This project's whole discipline is that a
   BPHS verse, a note by the translator and later tradition are three
   different kinds of statement and must never be presented as one. Transit
   doctrine is exactly where that collapses in popular astrology: "Sade
   Sati" is quoted as though Parāśara wrote it, and he did not. So each rule
   below carries the tier it belongs to, the page prints that tier beside
   it, and a reader can see at a glance which claims rest on the uploaded
   translation and which are later practice.

   WHAT THE UPLOADED EDITION ACTUALLY CONTAINS, having been read rather than
   assumed:

     * Vol. 2, Ch. 70 gives genuine BPHS transit doctrine, and it is
       ashtakavarga doctrine: a graha passing through a rāśi carrying more
       rekhās in its own ashtakavarga after Trikoṇa and Ekādhipatya
       śodhana is read as favourable for that graha's significations, with
       a worked example on the Moon's 4th house and the mother. That rule
       needs a chart, so it is applied only when one is loaded — and then
       it is the strongest thing on the page, because it is the only tier-1
       rule here.

     * Vol. 1, Ch. 31, in the translator's notes on Argala, sets out
       Gochara Vedha and states one pair in words: the Sun in the 3rd from
       the Moon transits favourably, that favour is curbed if another graha
       simultaneously transits the 9th from the Moon, Śani excepted, and
       the vedha lifts the moment a companion joins the Sun in the 3rd.
       That pair is implemented. The rest of the table is printed in the
       uploaded scan as a figure whose numerals did not survive OCR, so the
       other vedha pairs are NOT invented here; the page says so and points
       the reader at the PDF.

     * Sade Sati, Kaṇṭaka/Ardhāṣṭama Śani and Aṣṭama Śani are named and
       used throughout later tradition. They are labelled as such.

   WHAT IS NOT DONE. No event is predicted, no date is called good or bad
   for a decision, and nothing here is phrased as something that will
   happen. A transit is a condition the classical texts attach a tendency
   to, and the wording keeps it that way. */

(function () {
  "use strict";

  var SIGNS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
               "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var LORD = ["Maṅgala", "Śukra", "Budha", "Candra", "Sūrya", "Budha",
              "Śukra", "Maṅgala", "Guru", "Śani", "Śani", "Guru"];

  /* ---- tier 3: the classical gochara "benefic places" -------------------
     The houses, counted from the janma-rāśi, in which each graha's transit
     is traditionally read as favourable. These are the standard lists of
     the gochara literature. The uploaded Santhanam edition presents them
     in Vol. 1, Ch. 31 as a figure; the numerals in that figure did not
     survive the scan, so these are given as later tradition and the reader
     is told to confirm the edition's own table in the PDF rather than take
     this page's word for it. */
  var GOOD = {
    Sun:     [3, 6, 10, 11],
    Moon:    [1, 3, 6, 7, 10, 11],
    Mars:    [3, 6, 11],
    Mercury: [2, 4, 6, 8, 10, 11],
    Jupiter: [2, 5, 7, 9, 11],
    Venus:   [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Saturn:  [3, 6, 11],
    Rahu:    [3, 6, 11],
    Ketu:    [3, 6, 11]
  };
  var DEV = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala",
              Mercury: "Budha", Jupiter: "Guru", Venus: "Śukra",
              Saturn: "Śani", Rahu: "Rāhu", Ketu: "Ketu" };

  function houseFrom(sign, moonSign) {
    return ((sign - moonSign) % 12 + 12) % 12 + 1;
  }
  function fmt(jd) {
    var d = window.SPGochara.jdToDate(jd);
    return d.toISOString().slice(0, 10);
  }
  function days(n) {
    if (n >= 60) return Math.round(n / 30.44) + " months";
    return Math.round(n) + " days";
  }

  /* ---- the spans of a graha through the houses of this rāśi ------------- */
  function housesOf(R, body, moonSign) {
    var sp = R.spans[body] || [];
    return sp.map(function (s) {
      return { house: houseFrom(s.sign, moonSign), sign: s.sign,
               from: s.from, to: s.to, days: s.to - s.from };
    });
  }

  /* ---- tier 3: the Śani conditions --------------------------------------
     Named in later tradition, computed here from the real transit rather
     than from a table of years: the phases begin and end when Śani
     actually crosses, retrogrades included, which is why a phase can be
     entered twice. */
  var SS_PHASE = {
    12: ["Sade Sati — first phase (12th from the Moon)",
         "Later tradition reads this as the opening stretch: expense, " +
         "matters at a distance, sleep and solitude, and a general " +
         "re-sorting of obligations."],
    1:  ["Sade Sati — middle phase (Śani over the janma-rāśi)",
         "Traditionally the most demanding stretch of the three, read as " +
         "a period of endurance, and of being held to what one has " +
         "actually built."],
    2:  ["Sade Sati — last phase (2nd from the Moon)",
         "Read as the settling stretch, bearing on family, speech and " +
         "the consolidation of resources."],
    4:  ["Kaṇṭaka Śani / Ardhāṣṭama Śani (4th from the Moon)",
         "Later tradition attaches this to home, land, vehicles and the " +
         "mother, and reads it as a period that asks for patience with " +
         "domestic matters."],
    8:  ["Aṣṭama Śani (8th from the Moon)",
         "Read as a period of upheaval and of things long postponed " +
         "coming due. The classical texts treat the 8th as the house of " +
         "what is hidden rather than as a forecast of harm."]
  };

  function saniPhases(R, moonSign) {
    var out = [];
    housesOf(R, "Saturn", moonSign).forEach(function (s) {
      var p = SS_PHASE[s.house];
      if (!p) return;
      out.push({ house: s.house, title: p[0], text: p[1],
                 sign: s.sign, from: s.from, to: s.to, days: s.days,
                 tier: "later" });
    });
    /* consecutive spans in the same house happen when Śani retrogrades
       back across a cusp and returns; they are one period, not three */
    var merged = [];
    out.forEach(function (s) {
      var l = merged[merged.length - 1];
      if (l && l.house === s.house) { l.to = s.to; l.days += s.days; }
      else merged.push(s);
    });
    return merged;
  }

  /* ---- tier 2: the one vedha pair the uploaded edition states in words --
     "the Sun in the 3rd house from the Moon during transit will be
     favourable. But his favourable disposition will remain curbed if
     simultaneously the 9th from the Moon is transited by another planet
     (than of course Saturn, which is an exception)." — and the vedha lifts
     when a companion joins the Sun in the 3rd. Implemented exactly that
     far and no further. */
  function sunVedha(R, moonSign) {
    var G = window.SPGochara;
    var third = (moonSign + 2) % 12, ninth = (moonSign + 8) % 12;
    var spans = (R.spans.Sun || []).filter(function (s) {
      return s.sign === third;
    });
    return spans.map(function (s) {
      var mid = (s.from + s.to) / 2;
      var blockers = [], companions = [];
      R.bodyList.forEach(function (b) {
        if (b === "Sun") return;
        var sg = G.signAtJd(R, b, mid);
        if (sg === ninth && b !== "Saturn") blockers.push(DEV[b]);
        if (sg === third) companions.push(DEV[b]);
      });
      return { from: s.from, to: s.to, blockers: blockers,
               companions: companions,
               state: !blockers.length ? "clear"
                      : (companions.length ? "lifted" : "obstructed"),
               tier: "commentary" };
    });
  }

  /* ---- tier 1: the ashtakavarga rule, when a chart is loaded ------------
     BPHS Vol. 2, Ch. 70. The bindus come from the chart that is open; with
     no chart there is nothing to read, and the page says so rather than
     substituting a number. */
  function ashtaka(R, moonSign, D) {
    if (!D || !D.av || !D.av.bhinna) return null;
    var out = [];
    /* the rekhās the text means are the ones AFTER Trikoṇa śodhana — "if
       the number of rekha is larger in any rasi after Trikona Shodhana,
       there will be gains ... when Mars passes through that rasi in
       transit". The builder already computes śodhana for its own
       ashtakavarga section, so the figure used here is the same one the
       reader can check on that page rather than a second opinion. Both are
       carried, because the raw bindu count is what most software shows and
       a reader comparing the two should be able to see why they differ. */
    var occupied = null;
    try {
      occupied = new Array(12).fill(false);
      (D.planets || []).forEach(function (p) {
        if (p && p.sign != null) occupied[p.sign] = true;
      });
    } catch (e) { occupied = null; }

    ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury"].forEach(function (b) {
      var row = null;
      D.av.bhinna.forEach(function (x) { if (x.graha === b) row = x; });
      if (!row || !row.bindus) return;
      var raw = row.bindus;
      var red = raw;
      try {
        if (typeof trikonaShodhana === "function") {
          red = trikonaShodhana(raw);
          if (occupied && typeof ekadhipatyaShodhana === "function")
            red = ekadhipatyaShodhana(red, occupied);
        }
      } catch (e) { red = raw; }
      (R.spans[b] || []).forEach(function (s) {
        out.push({ body: b, name: DEV[b], sign: s.sign,
                   bindus: raw[s.sign], reduced: red[s.sign],
                   house: houseFrom(s.sign, moonSign),
                   from: s.from, to: s.to, days: s.to - s.from,
                   tier: "bphs" });
      });
    });
    return out.length ? out : null;
  }

  /* ---- the whole reading ------------------------------------------------ */
  function read(R, moonSign, D) {
    var G = window.SPGochara;
    var grahas = R.bodyList.map(function (b) {
      var hs = housesOf(R, b, moonSign);
      /* the house this graha spends most of the year in is the one a
         reading is actually about */
      var best = hs.slice().sort(function (x, y) { return y.days - x.days; })[0];
      return {
        body: b, name: DEV[b], spans: hs,
        mainHouse: best ? best.house : null,
        mainSign: best ? best.sign : null,
        mainDays: best ? best.days : 0,
        favourable: best ? (GOOD[b] || []).indexOf(best.house) >= 0 : false,
        goodHouses: GOOD[b] || []
      };
    });
    return {
      year: R.year, moonSign: moonSign,
      signName: SIGNS[moonSign], lord: LORD[moonSign],
      grahas: grahas,
      sani: saniPhases(R, moonSign),
      sunVedha: sunVedha(R, moonSign),
      ashtaka: ashtaka(R, moonSign, D)
    };
  }

  window.SPRashiphal = {
    SIGNS: SIGNS, LORD: LORD, GOOD: GOOD, DEV: DEV,
    read: read, houseFrom: houseFrom, fmt: fmt, days: days
  };
})();
