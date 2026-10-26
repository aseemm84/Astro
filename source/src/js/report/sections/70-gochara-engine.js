/* ===== Varṣika Gochara — the transits of a year ===========================

   WHAT THIS IS AND WHAT MAKES IT DIFFERENT FROM EVERYTHING ELSE IN THIS
   BUILDER. Every other panel here answers a question about one chart. This
   one answers a question about the sky: where the nine grahas go during a
   given year, when exactly each enters a new rāśi, and when each turns
   retrograde and direct again. It needs no birth data at all. Someone who
   has never cast a chart can ask what 2027 looks like and get an answer,
   and the twelve Candra-rāśi readings built on top of it are the same
   arithmetic read from twelve different starting signs.

   WHY THE TIMES ARE FOUND RATHER THAN TABULATED. A transit table copied
   from an almanac is a table for one ayanāṃśa, one node convention and one
   time zone, and it is wrong the moment any of those is changed. Here every
   instant is computed from the same ephemeris that casts the charts, with
   whatever ayanāṃśa is currently selected, by bracketing the event and
   bisecting to the minute. Change the ayanāṃśa and the ingress times move,
   because they should: an ingress is the moment a longitude crosses a
   boundary, and the ayanāṃśa is where the boundary is.

   THE TRAP A COARSE SCAN FALLS INTO. A planet near a sign boundary may
   cross it, turn retrograde, cross back, and cross a third time weeks
   later — Mercury does this routinely, Mars and Saturn do it at every
   station near a cusp. A scan that samples monthly and reports "the sign
   changed" finds one ingress where there were three, and the two it drops
   are the interesting ones. So the step is small enough that no excursion
   can hide inside it, and the result is checked by replaying it: walking
   the year through the returned events has to reproduce the sign the
   ephemeris actually reports on every day of that year. That check is in
   the harness, and it failed the first time.

   WHAT IS DELIBERATELY NOT HERE. No prediction. This file computes WHEN
   things happen. What any of it is held to mean belongs to the rule engine
   next door, which labels every rule with the tier it comes from. */

(function () {
  "use strict";

  var BODIES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                "Saturn", "Rahu", "Ketu"];
  /* the scan step for each body, in days. Chosen from how fast the body can
     move: the step must be short enough that the body cannot enter and
     leave a sign between two samples. The Moon crosses a sign in about two
     and a quarter days, so a quarter day is ample; Mercury's retrograde
     loops are the reason the inner planets get a half day rather than a
     whole one. */
  var STEP = { Moon: 0.25, Mercury: 0.5, Venus: 0.5, Sun: 0.5, Mars: 0.5,
               Jupiter: 1, Saturn: 1, Rahu: 1, Ketu: 1 };
  /* the nodes are always retrograde in the mean reckoning this engine uses,
     so a station search on them would return nothing and cost time */
  var STATIONS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

  function jdToDate(jd) { return new Date((jd - 2440587.5) * 86400000); }
  function dateToJd(d) { return d.getTime() / 86400000 + 2440587.5; }

  function sid(name, jd) {
    try { return window.__kSidAt(name, jdToDate(jd)); }
    catch (e) { return null; }
  }
  function signOf(lon) { return lon == null ? null : Math.floor(lon / 30) % 12; }

  /* Speed by central difference. An hour either side is wide enough that
     the ephemeris's own rounding does not dominate and narrow enough that
     the second derivative does not matter, which is what a station needs:
     at a station the speed is passing through zero and the curvature is
     what carries it across. */
  function speed(name, jd) {
    var h = 1 / 24;
    var a = sid(name, jd - h), b = sid(name, jd + h);
    if (a == null || b == null) return null;
    var d = b - a;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d / (2 * h);
  }

  /* ---- finding the instant ----------------------------------------------
     Bisection on a bracket that is known to contain exactly one crossing,
     to one minute. Forty iterations would be pointless: the ephemeris is
     not that good, and a minute is finer than any use this is put to. */
  function bisect(test, lo, hi) {
    var want = test(lo);
    for (var i = 0; i < 40 && (hi - lo) > 1 / 1440; i++) {
      var mid = (lo + hi) / 2;
      if (test(mid) === want) lo = mid; else hi = mid;
    }
    return hi;
  }

  /* ---- the year ---------------------------------------------------------
     Scanned per body, because the step differs per body and a shared step
     would be the Moon's for everything. */
  function ingresses(name, jd0, jd1) {
    var st = STEP[name] || 1, out = [];
    var prevJd = jd0, prevSign = signOf(sid(name, jd0));
    if (prevSign == null) return out;
    for (var jd = jd0 + st; jd <= jd1 + st; jd += st) {
      var t = Math.min(jd, jd1);
      var s = signOf(sid(name, t));
      if (s == null) break;
      if (s !== prevSign) {
        /* the bracket holds one crossing; which sign it enters is read
           after the fact rather than assumed, because a retrograde
           crossing enters the sign BEHIND */
        var at = bisect(function (x) { return signOf(sid(name, x)); },
                        prevJd, t);
        var sp = speed(name, at);
        out.push({ kind: "ingress", body: name, jd: at,
                   from: prevSign, to: signOf(sid(name, at + 1 / 1440)),
                   retro: sp != null && sp < 0 });
        prevSign = s;
      }
      prevJd = t;
      if (t >= jd1) break;
    }
    return out;
  }

  function stations(name, jd0, jd1) {
    if (STATIONS.indexOf(name) < 0) return [];
    var st = STEP[name] || 1, out = [];
    var prevJd = jd0, prevSp = speed(name, jd0);
    if (prevSp == null) return out;
    for (var jd = jd0 + st; jd <= jd1 + st; jd += st) {
      var t = Math.min(jd, jd1);
      var sp = speed(name, t);
      if (sp == null) break;
      if ((sp < 0) !== (prevSp < 0)) {
        var at = bisect(function (x) { return speed(name, x) < 0; },
                        prevJd, t);
        out.push({ kind: sp < 0 ? "retro" : "direct", body: name, jd: at,
                   sign: signOf(sid(name, at)), lon: sid(name, at) });
        prevSp = sp;
      }
      prevJd = t;
      if (t >= jd1) break;
    }
    return out;
  }

  /* ---- the whole year, merged ------------------------------------------- */
  var CACHE = {};
  function year(y, opts) {
    opts = opts || {};
    var withMoon = !!opts.moon;
    var key = y + "|" + (withMoon ? "m" : "") + "|" +
              (window.__ayan ? Math.round(window.__ayan(
                 dateToJd(new Date(Date.UTC(y, 6, 1)))) * 1e6) : 0);
    if (CACHE[key]) return CACHE[key];

    var jd0 = dateToJd(new Date(Date.UTC(y, 0, 1, 0, 0, 0)));
    var jd1 = dateToJd(new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0)));
    var events = [], bodies = {};
    BODIES.forEach(function (b) {
      if (b === "Moon" && !withMoon) return;
      var ing = ingresses(b, jd0, jd1);
      var sta = stations(b, jd0, jd1);
      events = events.concat(ing, sta);
      bodies[b] = { ingresses: ing, stations: sta,
                    start: sid(b, jd0), startSign: signOf(sid(b, jd0)) };
    });
    events.sort(function (a, b) { return a.jd - b.jd; });

    /* where each body sits through the year, as spans rather than events:
       this is what a reading needs ("Guru is in Meṣa from March"), and
       deriving it here means the reading cannot disagree with the list */
    var spans = {};
    BODIES.forEach(function (b) {
      if (!bodies[b]) return;
      var cur = { sign: bodies[b].startSign, from: jd0, to: jd1 };
      var arr = [];
      bodies[b].ingresses.forEach(function (e) {
        cur.to = e.jd; arr.push(cur);
        cur = { sign: e.to, from: e.jd, to: jd1 };
      });
      arr.push(cur);
      spans[b] = arr;
    });

    var R = { year: y, jd0: jd0, jd1: jd1, events: events,
              bodies: bodies, spans: spans,
              bodyList: BODIES.filter(function (b) { return !!bodies[b]; }) };
    CACHE[key] = R;
    return R;
  }

  /* the sign a body occupies at an instant, read from the spans rather than
     recomputed: a reading and the timeline beside it must never disagree */
  function signAtJd(R, body, jd) {
    var sp = R.spans[body];
    if (!sp) return signOf(sid(body, jd));
    for (var i = 0; i < sp.length; i++)
      if (jd >= sp[i].from && jd < sp[i].to) return sp[i].sign;
    return sp[sp.length - 1].sign;
  }

  /* how long a body spends in each sign during the year, in days — the
     figure that decides whether a transit is the year's theme or a
     fortnight of it */
  function daysInSign(R, body, sign) {
    var sp = R.spans[body], d = 0;
    if (!sp) return 0;
    sp.forEach(function (s) { if (s.sign === sign) d += (s.to - s.from); });
    return d;
  }

  /* ---- the mid-year snapshot --------------------------------------------
     A year is a span, and a span has no planetary positions — so a reader
     who asks "where is everything in 2027" needs one instant to look at.
     Noon UTC on 1 July is the convention: it is the middle of the year to
     within a few hours, and fixing it means two people comparing notes are
     looking at the same sky. Degrees are given within the rāśi, which is
     how a Jyotiṣa table is read, and the whole longitude is carried too so
     nothing has to be reconstructed from the formatting. */
  function dms(x) {
    var d = Math.floor(x), m = Math.floor((x - d) * 60);
    var sec = Math.round((((x - d) * 60) - m) * 60);
    if (sec === 60) { sec = 0; m += 1; }
    if (m === 60) { m = 0; d += 1; }
    return d + "\u00b0" + (m < 10 ? "0" : "") + m + "\u2032" +
           (sec < 10 ? "0" : "") + sec + "\u2033";
  }
  function snapshot(y, when) {
    var jd = when == null
      ? dateToJd(new Date(Date.UTC(y, 6, 1, 12, 0, 0)))
      : when;
    return BODIES.map(function (b) {
      var lon = sid(b, jd);
      if (lon == null) return { body: b, lon: null };
      var sg = signOf(lon), sp = speed(b, jd);
      return { body: b, lon: lon, sign: sg, deg: lon - sg * 30,
               dms: dms(lon - sg * 30), speed: sp,
               retro: sp != null && sp < 0,
               /* the nodes are retrograde by construction in the mean
                  reckoning, and saying so is more useful than a ℞ that
                  looks like news */
               alwaysRetro: (b === "Rahu" || b === "Ketu") };
    });
  }

  window.SPGochara = {
    snapshot: snapshot, dms: dms,
    BODIES: BODIES, year: year, sid: sid, speed: speed, signOf: signOf,
    signAtJd: signAtJd, daysInSign: daysInSign,
    jdToDate: jdToDate, dateToJd: dateToJd
  };

  /* The name the build spec asks for, over the same engine. One
     implementation, two doors: the spec's door takes an ayanāṃśa key and
     sets it before scanning, because an ingress time is meaningless
     without saying which ayanāṃśa drew the boundary. */
  window.VarshikGochara = {
    calculateYearTransits: function (targetYear, ayanamsaKey) {
      if (ayanamsaKey && window.__setAyan) {
        try { window.__setAyan(ayanamsaKey); } catch (e) {}
      }
      var R = year(targetYear, { moon: true });
      return {
        year: R.year, jdStart: R.jd0, jdEnd: R.jd1,
        ayanamsa: (window.__ayan ? window.__ayan(R.jd0) : null),
        ayanamsaKey: ayanamsaKey || null,
        events: R.events, spans: R.spans, bodies: R.bodies,
        midYear: snapshot(targetYear),
        midYearJd: dateToJd(new Date(Date.UTC(targetYear, 6, 1, 12, 0, 0)))
      };
    }
  };
})();
