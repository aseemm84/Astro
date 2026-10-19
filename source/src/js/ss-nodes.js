/* ===== The Sūrya Siddhānta, published into the studio =====================

   The engine computes; this file makes what it computes selectable, so the
   older sky can be drawn by the same composers as the modern one and, more
   to the point, drawn ALONGSIDE it.

   THE COMPARISON IS THE INTERESTING NODE, not the positions. Anyone can be
   told that a classical siddhānta differs from a modern ephemeris. Being able
   to select "the drift over five centuries" and watch the Sun's error climb
   from nothing to three degrees, on the same stage that draws everything
   else, is a different kind of knowing — and it is the one that lets a
   student judge for themselves how much of a classical rule rests on
   astronomy and how much on arithmetic that has since been improved.

   WHAT THESE NODES ARE NOT. They are not BPHS. BPHS is horoscopy and supplies
   no planetary theory; the positions a classical reading was done from came
   from a siddhānta, and this is one of those. Nothing here is labelled as
   doctrine, and nothing here cites a verse. */

(function () {
  "use strict";

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var DAY = 86400000;

  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) {
    var d = norm(a - b);
    return d > 180 ? d - 360 : d;
  }
  function modern(sa, ms) {
    if (!EN[sa]) return null;
    try { return window.__kSidAt(EN[sa], new Date(ms)); } catch (e) { return null; }
  }

  function reg(id, label, hint, roles, get) {
    window.SPNodes.register({ id: id, dom: "siddhanta", label: label,
                              hint: hint, roles: roles, get: get });
  }

  function publish() {
    if (!window.SPNodes || !window.SPNodes.register || !window.SSEngine) return;
    var S = window.SSEngine;

    /* each graha, where the Sūrya Siddhānta puts it */
    SA.forEach(function (sa) {
      reg("ss.lon." + sa, sa + " — Sūrya Siddhānta",
          "where the Sūrya Siddhānta puts it at this moment",
          ["lon"], function (C) {
            var q = S.trueLongitude(sa, S.ahargana(C.when));
            if (!q) return null;
            return { kind: "lon", deg: norm(q.lon), label: sa + " (SS)",
                     tone: sa === "Sūrya" ? "gold" : "glow" };
          });
    });

    reg("ss.all", "The nine — Sūrya Siddhānta",
        "all nine as the Sūrya Siddhānta computes them", ["lonset"],
        function (C) {
          var P = S.positions(C.when), items = [];
          SA.forEach(function (sa) {
            var q = P.grahas[sa];
            if (q) items.push({ deg: norm(q.lon), label: sa,
                                tone: sa === "Sūrya" ? "gold" : "glow" });
          });
          return items.length ? { kind: "lonset", items: items,
                                  label: "Sūrya Siddhānta" } : null;
        });

    /* the two skies on one ring — the node that makes the point */
    reg("ss.vsModern", "Sūrya Siddhānta against the modern sky",
        "the same nine computed both ways, on one ring, so the gaps are the " +
        "comparison", ["lonset"],
        function (C) {
          var P = S.positions(C.when), items = [];
          SA.forEach(function (sa) {
            var q = P.grahas[sa];
            if (!q) return;
            items.push({ deg: norm(q.lon), label: sa + " SS", tone: "mal" });
            var m = modern(sa, C.when);
            if (m != null) items.push({ deg: norm(m), label: sa, tone: "ben" });
          });
          return items.length ? { kind: "lonset", items: items,
                                  label: "older sky · modern sky" } : null;
        });

    /* how far apart they are, as bars — the readable form of the same thing */
    reg("ss.gaps", "How far apart the two skies are",
        "the difference between the Sūrya Siddhānta and the modern ephemeris, " +
        "graha by graha, at this moment", ["sset"],
        function (C) {
          var P = S.positions(C.when), items = [];
          SA.forEach(function (sa) {
            if (!EN[sa]) return;
            var q = P.grahas[sa], m = modern(sa, C.when);
            if (!q || m == null) return;
            var d = sdiff(q.lon, m);
            items.push({ k: sa, v: d,
                         work: q.lon.toFixed(2) + "° − " + m.toFixed(2) + "° = " +
                               d.toFixed(2) + "°" });
          });
          return items.length ? { kind: "sset", items: items, unit: "°",
                                  label: "Sūrya Siddhānta minus modern",
                                  max: 12 } : null;
        });

    /* THE DRIFT. The Sun's error against the span, which is the clearest
       single picture of what a three-and-a-half-minute year does over
       centuries: it climbs, steadily, and it is the reason a classical
       almanac and a modern one disagree about when a saṃkrānti falls. */
    reg("ss.drift", "The drift, over the span",
        "how far the Sūrya Siddhānta's Sun is from the modern one, across " +
        "whatever span is set — the long consequence of a year that is three " +
        "and a half minutes too long", ["series"],
        function (C) {
          var ok = false;
          try { ok = modern("Sūrya", C.when) != null; } catch (e) {}
          if (!ok) return null;
          return { kind: "series", unit: "°",
                   label: "Sūrya: Sūrya Siddhānta minus modern",
                   at: function (ms) {
                     var q = S.trueLongitude("Sūrya", S.ahargana(ms));
                     var m = modern("Sūrya", ms);
                     if (!q || m == null) return null;
                     return sdiff(q.lon, m);
                   } };
        });

    /* the same for the Moon, where the cause is different and worth seeing
       separately: a sidereal month a hundredth of a second too long */
    reg("ss.driftMoon", "The Moon's drift, over the span",
        "the Moon computed both ways, differenced across the span — its " +
        "cause is a sidereal month slightly too long, not the year",
        ["series"],
        function (C) {
          var ok = false;
          try { ok = modern("Candra", C.when) != null; } catch (e) {}
          if (!ok) return null;
          return { kind: "series", unit: "°",
                   label: "Candra: Sūrya Siddhānta minus modern",
                   at: function (ms) {
                     var q = S.trueLongitude("Candra", S.ahargana(ms));
                     var m = modern("Candra", ms);
                     if (!q || m == null) return null;
                     return sdiff(q.lon, m);
                   } };
        });

    /* the corrections themselves, for one graha — what the method actually
       does, rather than what it produces */
    ["Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
      reg("ss.working." + sa, sa + " — the working",
          "the mean place, the manda correction, the śīghra correction and " +
          "the true place, as the four steps give them", ["sset"],
          function (C) {
            var q = S.trueLongitude(sa, S.ahargana(C.when));
            if (!q) return null;
            return { kind: "sset", unit: "°",
                     label: sa + " — mean, corrected, true",
                     items: [
                       { k: "mean", v: norm(q.mean),
                         work: "revolutions × 360 × ahargaṇa ÷ civil days" },
                       { k: "manda", v: q.manda,
                         work: "the equation of centre, from the manda epicycle" },
                       { k: "śīghra", v: q.sighra,
                         work: "the correction that produces retrogression" },
                       { k: "true", v: norm(q.lon),
                         work: "after all four steps" }
                     ], max: 360 };
          });
    });

    /* the parameters, as a readable set */
    reg("ss.year", "The Sūrya Siddhānta year",
        "the sidereal year the revolution counts imply, against the modern " +
        "value — the single number behind the drift", ["sset"],
        function () {
          var K = S.constants();
          return { kind: "sset", unit: "d", label: "the year, two ways",
                   items: [
                     { k: "Sūrya Siddhānta", v: K.sidYearDays,
                       work: K.civilDays + " civil days ÷ " +
                             window.SSEngine.YUGA.rev["Sūrya"] + " revolutions" },
                     { k: "modern", v: K.modernSidYearDays,
                       work: "the sidereal year as measured now" }
                   ], max: 366 };
        });

    reg("ss.months", "The Sūrya Siddhānta months",
        "the synodic and sidereal months the revolution counts imply — the " +
        "synodic one is accurate to a tenth of a second", ["sset"],
        function () {
          var K = S.constants();
          return { kind: "sset", unit: "d", label: "the months",
                   items: [
                     { k: "synodic", v: K.synodicMonthDays,
                       work: "new Moon to new Moon" },
                     { k: "sidereal", v: K.sidMonthDays,
                       work: "once round the circle of stars" }
                   ], max: 30 };
        });


    /* ---- what the completed engine added ---------------------------------
       Each of these is a quantity the first version of this engine could not
       compute at all. They are published the same way as the rest, so the
       older sky's latitudes, days, eclipses and visibility can be drawn by
       the same composers as everything else on the wall. */

    reg("ss.latitudes", "Latitudes — Sūrya Siddhānta",
        "how far north or south of the ecliptic each graha stands, with the " +
        "modern figure beside it", ["sset"],
        function (C) {
          var a = S.ahargana(C.when), items = [];
          ["Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
            var v = S.latitudeOf(sa, a);
            if (v == null) return;
            var m = null;
            try { var e = window.__kEclip(EN[sa], C.when); m = e ? e.lat : null; }
            catch (x) {}
            items.push({ k: sa, v: v,
              work: m == null ? "Sūrya Siddhānta" :
                    v.toFixed(3) + "° against the modern " + m.toFixed(3) + "°" });
          });
          return items.length ? { kind: "sset", items: items, unit: "°",
            label: "vikṣepa — latitude", max: 9 } : null;
        });

    reg("ss.declinations", "Declinations — Sūrya Siddhānta",
        "north or south of the equator, taken of the sāyana longitude at the " +
        "text's obliquity of 24°", ["sset"],
        function (C) {
          var P = S.positions(C.when), items = [];
          SA.forEach(function (sa) {
            var q = P.grahas[sa];
            if (!q || q.declination == null) return;
            items.push({ k: sa, v: q.declination,
                         work: "at an obliquity of " + S.OBLIQUITY + "°" });
          });
          return items.length ? { kind: "sset", items: items, unit: "°",
            label: "krānti — declination", max: 30 } : null;
        });

    reg("ss.day", "The day, where you are",
        "sunrise, sunset, the length of the day and the ascensional " +
        "difference that makes it long or short", ["sset"],
        function (C) {
          var D = S.sunriseSunset(C.when, C.place);
          if (!D) return null;
          function hm(ms) {
            var d = new Date(ms + (C.place.tz || 0) * 3600000);
            return String(d.getUTCHours()).padStart(2, "0") + ":" +
                   String(d.getUTCMinutes()).padStart(2, "0");
          }
          return { kind: "sset", unit: "h", label: "the day at " + C.place.n,
            max: 24, items: [
              { k: "day", v: D.dayHours, work: "sunrise " + hm(D.sunrise) +
                ", sunset " + hm(D.sunset) },
              { k: "night", v: 24 - D.dayHours, work: "what is left" },
              { k: "cara", v: D.cara / 15, work: "the ascensional difference, " +
                D.cara.toFixed(3) + "° — what makes a summer day long" },
              { k: "equation of time", v: D.equationOfTimeMinutes / 60,
                work: "bhujāntara " + D.bhujantaraMinutes.toFixed(1) +
                      " min + udayāntara " + D.udayantaraMinutes.toFixed(1) + " min" }
            ] };
        });

    reg("ss.lagna", "The lagna — Sūrya Siddhānta",
        "the point of the ecliptic rising, walked out of the oblique " +
        "ascensions of the signs", ["lon"],
        function (C) {
          var L = S.lagna(C.when, C.place);
          if (!L) return null;
          return { kind: "lon", deg: norm(L.lon), label: "lagna (SS)",
                   tone: "gold" };
        });

    reg("ss.panchanga", "The pañcāṅga, the old way",
        "tithi, nakṣatra, yoga and karaṇa from Sūrya Siddhānta longitudes, " +
        "with the modern figures beside them", ["sset"],
        function (C) {
          var p = S.panchanga(C.when, C.place);
          var m = null;
          try { m = window.NP.day(C.when, C.place); } catch (x) {}
          var modT = m ? m.at.tithi.n + (m.at.tithi.paksha === "kṛṣṇa" ? 15 : 0) : null;
          return { kind: "sset", unit: "", label: "the five limbs, computed twice",
            max: 30, items: [
              { k: "tithi", v: p.tithi.n,
                work: p.tithi.paksha + " " + p.tithi.name +
                      (modT ? "  ·  modern says " + modT : "") },
              { k: "nakṣatra", v: p.nakshatra.n,
                work: p.nakshatra.name + " pāda " + p.nakshatra.pada +
                      (m ? "  ·  modern says " + m.at.nak.name : "") },
              { k: "yoga", v: p.yoga.n, work: p.yoga.name },
              { k: "karaṇa", v: p.karana.n, work: p.karana.name },
              { k: "vāra", v: p.vara.i + 1, work: p.vara.name + " — " + p.vara.english }
            ] };
        });

    reg("ss.diameters", "How big they look",
        "the apparent diameters of Sūrya and Candra, and the width of the " +
        "Earth's shadow where the Moon crosses it", ["sset"],
        function (C) {
          var a = S.ahargana(C.when);
          var sh = S.shadowDiameter(a);
          return { kind: "sset", unit: "′", label: "apparent size", max: 90,
            items: [
              { k: "Sūrya", v: S.apparentDiameter("Sūrya", a),
                work: S.SIZE["Sūrya"].diameter + " yojanas at its true distance" },
              { k: "Candra", v: S.apparentDiameter("Candra", a),
                work: S.SIZE["Candra"].diameter + " yojanas at its true distance" },
              { k: "the shadow", v: sh.minutes,
                work: "the Earth's shadow where the Moon passes through it" }
            ] };
        });

    reg("ss.visibility", "Near enough to the Sun to be lost",
        "each graha's distance from Sūrya against the arc it needs to be " +
        "seen at all — the kālāṃśas", ["sset"],
        function (C) {
          var a = S.ahargana(C.when), items = [];
          ["Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
            var h = S.heliacal(sa, a);
            if (!h) return;
            items.push({ k: sa, v: Math.abs(h.arc),
              work: "needs " + h.needs + "° — " +
                    (h.visible ? "visible, " + h.side : "lost in the beams") });
          });
          return items.length ? { kind: "sset", items: items, unit: "°",
            label: "distance from Sūrya, against what each needs", max: 180 } : null;
        });

    reg("ss.risingTimes", "How long each sign takes to rise",
        "the oblique ascensions at your latitude, in asus — the quantity the " +
        "lagna is walked out of", ["sset"],
        function (C) {
          if (!C.place || C.place.lat == null) return null;
          var rt = S.risingTimes(C.place.lat);
          var R = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
                   "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
          return { kind: "sset", unit: " asus", label: "rising times at " +
            C.place.n, max: 3000,
            items: rt.map(function (v, i) {
              return { k: R[i], v: v,
                       work: (v / 21600 * 24 * 60).toFixed(1) + " minutes of time" };
            }) };
        });

    reg("ss.eclipses", "Eclipses over the span",
        "every eclipse the Sūrya Siddhānta finds in the span, as intervals " +
        "on a line", ["spanset"],
        function (C) {
          var days = Math.max(60, C.spanDays || 365);
          var to = C.when + days * 86400000;
          var list;
          try { list = S.eclipsesIn(C.when, to, C.place); } catch (e) { return null; }
          if (!list.length) return null;
          var items = list.slice(0, 120).map(function (q) {
            var w = (q.e.halfDurationHours || 1.5) * 3600000;
            return { from: (q.e.at - w - C.when) / 86400000,
                     to: (q.e.at + w - C.when) / 86400000,
                     label: (q.kind === "lunar" ? "Candra" : "Sūrya") + " " +
                            new Date(q.e.at).toISOString().slice(0, 10),
                     tone: q.kind === "lunar" ? "mal" : "gold" };
          });
          return { kind: "spanset", items: items,
                   label: list.length + " eclipses in " + Math.round(days / 365.2564) +
                          " years" };
        });

    reg("ss.nodeDrift", "The node, against the real one",
        "Rāhu as the Sūrya Siddhānta places it and as a modern ephemeris " +
        "does, across the span — the quantity behind most of what it gets " +
        "wrong about eclipses", ["series"],
        function () {
          return { kind: "series", unit: "°", label: "Rāhu: SS minus modern",
            at: function (ms) {
              var d = S.nodeDrift(ms);
              return d.diff;
            } };
        });

    reg("ss.ayanamsa", "The ayanāṃśa, as this text has it",
        "the libration of the equinox the Sūrya Siddhānta describes, across " +
        "the span", ["series"],
        function () {
          return { kind: "series", unit: "°", label: "ayanāṃśa (SS)",
            at: function (ms) { return S.ayanamsa(ms); } };
        });

    reg("ss.tableCost", "What the sine table costs",
        "the difference between computing with the text's twenty-four " +
        "tabulated sines and computing with the modern function, in minutes " +
        "of arc, across the span", ["series"],
        function () {
          return { kind: "series", unit: "′", label: "table minus exact, Śani",
            at: function (ms) {
              var keep = S.OPT.sines;
              S.options({ sines: "exact" });
              var ex = S.trueLongitude("Śani", S.ahargana(ms));
              S.options({ sines: "table" });
              var tb = S.trueLongitude("Śani", S.ahargana(ms));
              S.options({ sines: keep });
              if (!ex || !tb) return null;
              var d = norm(tb.lon - ex.lon);
              return (d > 180 ? d - 360 : d) * 60;
            } };
        });

    reg("ss.jya", "The sine table itself",
        "the twenty-four jyās of a circle of radius 3438, against the sine " +
        "function they approximate", ["sset"],
        function () {
          return { kind: "sset", unit: "", label: "jyā, R = " + S.RAD, max: 3438,
            items: S.JYA.map(function (v, i) {
              var exact = S.RAD * Math.sin(i * 3.75 * Math.PI / 180);
              return { k: (i * 3.75).toFixed(2) + "°", v: v,
                       work: "exact " + exact.toFixed(1) + " — out by " +
                             (v - exact).toFixed(2) };
            }) };
        });

    /* a track over time, so a Sūrya Siddhānta graha can be animated like any
       other */
    SA.forEach(function (sa) {
      reg("ss.track." + sa, sa + " over time — Sūrya Siddhānta",
          "where the Sūrya Siddhānta puts it, across the span", ["series"],
          function () {
            return { kind: "series", unit: "°", label: sa + " (SS)",
                     at: function (ms) {
                       var q = window.SSEngine.trueLongitude(
                         sa, window.SSEngine.ahargana(ms));
                       return q ? norm(q.lon) : null;
                     }, range: [0, 360] };
          });
    });
  }

  window.SSNodes = { publish: publish };
  if (window.SPNodes && window.SSEngine) publish();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", publish);
  else setTimeout(publish, 0);
})();
