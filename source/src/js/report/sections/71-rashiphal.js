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


  /* ---- tier 3: Guru's transit and its vedha ------------------------------
     The build spec supplies the five obstruction pairs, which is how they
     come to be here at all: the uploaded Santhanam edition prints its
     gochara vedha table as a figure whose numerals did not survive the
     scan, so these could not be read from it. They are the standard pairs
     of later gochara practice — Phaladeepika and the texts that follow it
     — and they are labelled as that, not as Parāśara.

     The rule reads: Guru transiting one of his favourable houses from the
     Moon has that favour obstructed if a graha OTHER THAN THE SUN occupies
     the paired house at the same time. The Sun is excepted, which is why
     the pairing is stated as "non-Sun planet". */
  var GURU_VEDHA = { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 };

  function guruGochara(R, moonSign) {
    var G = window.SPGochara;
    return (R.spans.Jupiter || []).map(function (s) {
      var h = houseFrom(s.sign, moonSign);
      var good = GOOD.Jupiter.indexOf(h) >= 0;
      var vh = GURU_VEDHA[h] || null;
      var mid = (s.from + s.to) / 2;
      var blockers = [];
      if (good && vh) {
        var vSign = (moonSign + vh - 1) % 12;
        R.bodyList.forEach(function (b) {
          if (b === "Jupiter" || b === "Sun") return;
          if (G.signAtJd(R, b, mid) === vSign) blockers.push(DEV[b]);
        });
      }
      return { house: h, sign: s.sign, from: s.from, to: s.to,
               days: s.to - s.from, favourable: good,
               vedhaHouse: vh, blockers: blockers,
               clear: good && !blockers.length, tier: "later" };
    });
  }

  /* ---- tier 3: the nodal axis -------------------------------------------
     Rāhu and Ketu are always opposite, so what they transit is an AXIS
     rather than two placements, and the pair of houses is the unit a
     reading works with. */
  function nodalAxis(R, moonSign) {
    var G = window.SPGochara;
    return (R.spans.Rahu || []).map(function (s) {
      var rh = houseFrom(s.sign, moonSign);
      var kh = ((rh + 5) % 12) + 1;
      return { rahuHouse: rh, ketuHouse: kh,
               rahuSign: s.sign, ketuSign: (s.sign + 6) % 12,
               from: s.from, to: s.to, days: s.to - s.from,
               axis: rh + "\u2013" + kh,
               upachaya: (rh === 3 || rh === 6 || rh === 10 || rh === 11),
               tier: "later" };
    });
  }

  /* ---- tier 3: the Sarvāṣṭakavarga reception ----------------------------
     The 28-bindu line is a convention of later practice, not a figure from
     the Parāśara verses — BPHS Ch. 70 compares rekhās between rāśis rather
     than against a fixed threshold. It is useful and it is labelled.
     Needs a chart, like everything ashtakavarga. */
  function savReception(R, moonSign, D) {
    if (!D || !D.av || !D.av.sarva) return null;
    var sav = D.av.sarva, out = [];
    ["Saturn", "Jupiter"].forEach(function (b) {
      (R.spans[b] || []).forEach(function (s) {
        var n = sav[s.sign];
        out.push({ body: b, name: DEV[b], sign: s.sign, bindus: n,
                   house: houseFrom(s.sign, moonSign),
                   from: s.from, to: s.to, days: s.to - s.from,
                   reception: n >= 28 ? "buffered"
                            : (n <= 25 ? "thin" : "middling"),
                   tier: "later" });
      });
    });
    return out.length ? out : null;
  }

  /* ---- the four pillars --------------------------------------------------
     The spec asks for four structured readings rather than one block of
     prose, and the reason is sound: a reader wants the part that bears on
     the thing they came about. What each pillar says is assembled from the
     rules already computed above — it adds no new doctrine, it only sorts
     the same findings by the area of life the classical significations
     attach them to. Every line keeps the conditional voice, and the
     factors it rests on travel with it so the reader can see the working
     rather than be told a conclusion. */
  function pillars(r) {
    var find = function (b) {
      for (var i = 0; i < r.grahas.length; i++)
        if (r.grahas[i].body === b) return r.grahas[i];
      return null;
    };
    var sat = find("Saturn"), jup = find("Jupiter"), rah = find("Rahu");
    var guruClear = r.guru.filter(function (g) { return g.clear; });
    var guruBlocked = r.guru.filter(function (g) {
      return g.favourable && g.blockers.length;
    });
    var ss = r.sani.filter(function (s) {
      return [12, 1, 2].indexOf(s.house) >= 0;
    });
    var dhaiya = r.sani.filter(function (s) {
      return [4, 8].indexOf(s.house) >= 0;
    });
    var savJ = (r.sav || []).filter(function (x) { return x.body === "Jupiter"; });
    var savS = (r.sav || []).filter(function (x) { return x.body === "Saturn"; });

    function savLine(list) {
      if (!list || !list.length) return null;
      var worst = list.slice().sort(function (a, b) { return a.bindus - b.bindus; })[0];
      return SIGNS[worst.sign] + " carries " + worst.bindus +
             " sarvāṣṭakavarga bindus" +
             (worst.bindus >= 28 ? ", which later practice reads as a " +
               "well-received sign" : worst.bindus <= 25 ?
               ", which later practice reads as thin reception" :
               ", which is middling");
    }

    return [
      {
        key: "karma", title: "Career & karma",
        factors: [
          sat ? "Śani in the " + sat.mainHouse + "th from the rāśi" : null,
          jup ? "Guru in the " + jup.mainHouse + "th" : null,
          guruClear.length ? "Guru's favourable transit is unobstructed" : null,
          guruBlocked.length ? "Guru's favourable transit is obstructed from the " +
            guruBlocked[0].vedhaHouse + "th by " +
            guruBlocked[0].blockers.join(", ") : null
        ].filter(Boolean),
        text: (sat && [3, 6, 10, 11].indexOf(sat.mainHouse) >= 0)
          ? "Śani stands in an upacaya house from the rāśi, which the " +
            "gochara literature reads as the placement where effort " +
            "compounds rather than drains — traditionally associated with " +
            "work that is held to and outlasts competition."
          : (ss.length
            ? "Śani is running a Sade Sati phase, which later tradition " +
              "reads as a period of being held to what has actually been " +
              "built rather than to what was claimed. It is described as " +
              "demanding rather than adverse, and the texts attach the " +
              "weight to responsibility rather than to loss."
            : "Śani is in neither an upacaya house nor a named phase from " +
              "this rāśi, so the classical rules give the year no " +
              "particular professional signature from him.")
      },
      {
        key: "dhana", title: "Wealth & liquidity",
        factors: [
          jup ? "Guru in the " + jup.mainHouse + "th" : null,
          savLine(savJ), savLine(savS),
          ss.filter(function (s) { return s.house === 2; }).length
            ? "Śani is in the 2nd, the last Sade Sati phase" : null
        ].filter(Boolean),
        text: (!r.sav)
          ? "The ashtakavarga layer that the texts actually use for this — " +
            "how many bindus the transited rāśi carries — needs a chart. " +
            "Without one, only the house positions above can be read."
          : (savJ.length && savJ[0].bindus >= 28
            ? "Guru transits a well-received rāśi by the bindu count, " +
              "which later practice treats as a buffer that amplifies a " +
              "benefic transit and softens a difficult one."
            : "The bindu counts for the rāśis Guru and Śani transit are " +
              "not in the range later practice calls well-received, which " +
              "is read as a reason for ordinary caution rather than as a " +
              "forecast of loss.")
      },
      {
        key: "sambandha", title: "Karmic axis & relationships",
        factors: [
          r.nodes.length ? "Rāhu–Ketu on the " + r.nodes[0].axis + " axis" : null,
          rah ? "Rāhu in the " + rah.mainHouse + "th" : null
        ].filter(Boolean),
        text: r.nodes.length
          ? (r.nodes[0].upachaya
            ? "The nodal axis falls across upacaya ground from this rāśi. " +
              "Later tradition reads Rāhu there as favouring competition, " +
              "reach and visibility, with Ketu opposite withdrawing from " +
              "the matters of its own house."
            : "The nodal axis runs " + r.nodes[0].axis + " from this rāśi. " +
              "The classical reading attaches partnership, inherited or " +
              "shared resources and detachment to this pairing, " +
              "depending on which end carries the house in question.")
          : "Rāhu does not change rāśi during the year, so the axis is " +
            "steady throughout.",
      },
      {
        key: "swasthya", title: "Constitution & routine",
        factors: [
          dhaiya.length ? dhaiya[0].title : null,
          ss.length ? "a Sade Sati phase is running" : null,
          sat ? "Śani in the " + sat.mainHouse + "th" : null
        ].filter(Boolean),
        text: (dhaiya.length || ss.length)
          ? "The classical texts attach fatigue and the cost of " +
            "accumulated strain to these Śani conditions, and the " +
            "traditional counsel is regularity — sleep, food and work kept " +
            "to a rhythm — rather than any intervention. This is a " +
            "reflective framework and not medical guidance; anything that " +
            "actually concerns your health belongs with a clinician."
          : "None of the Śani conditions later tradition associates with " +
            "strain are running from this rāśi this year. Nothing here is " +
            "medical guidance in either direction."
      }
    ];
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
    var out = {
      year: R.year, moonSign: moonSign,
      signName: SIGNS[moonSign], lord: LORD[moonSign],
      grahas: grahas,
      sani: saniPhases(R, moonSign),
      sunVedha: sunVedha(R, moonSign),
      guru: guruGochara(R, moonSign),
      nodes: nodalAxis(R, moonSign),
      sav: savReception(R, moonSign, D),
      ashtaka: ashtaka(R, moonSign, D)
    };
    out.pillars = pillars(out);
    return out;
  }

  window.SPRashiphal = {
    SIGNS: SIGNS, LORD: LORD, GOOD: GOOD, DEV: DEV,
    GURU_VEDHA: GURU_VEDHA,
    read: read, houseFrom: houseFrom, fmt: fmt, days: days
  };
})();
