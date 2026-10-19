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
