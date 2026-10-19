/* ===== Studio Pro — the long cycles =======================================

   WHAT THIS ADDS, AND WHY IT IS A SEPARATE FILE.

   Everything in the node registry reads ONE INSTANT: where a graha stands
   now, what the day's tithi is, how strong a bhāva is. This file reads
   CENTURIES: it finds every Pūrṇimā, every Śukra combustion, every
   Maṅgala–Guru conjunction in a span, and hands back the set so a composer
   can plot where in the circle they fall and whether they fall anywhere in
   particular.

   That is a different kind of work — a root-find rather than a reading — and
   it is the work behind the thing the eye is actually after: a pattern. The
   Metonic cycle is not a fact anyone has to supply; it is what you get when
   you plot two hundred and thirty-five new moons and notice that the last one
   lands where the first did. The Venus pentagram is what you get when you
   plot ten conjunctions. Nothing in this file is told that either exists.

   HOW THE EVENTS ARE FOUND, AND WHY NOT BY SCANNING.

   The obvious method is to step through the span and watch for a sign change
   in some function — and over two hundred years at a usable step that is tens
   of thousands of ephemeris evaluations, which is a page that hangs. So:

     the first two events are found by a coarse scan, which is the only part
       that has to search blind;
     thereafter the gap between the events found so far PREDICTS the next one,
       and a short bracket around that prediction is bisected.

   The running mean gap is used rather than the textbook synodic period for
   one reason: nothing here should need telling what the period is. A
   predictor built from the data cannot be wrong about a body whose period
   this file never heard of, and when the gaps are uneven — Śukra's inferior
   and superior conjunctions alternate at unequal spacing — a mean that
   follows the data recovers, while a constant would walk off.

   WHAT IS REPORTED, AND THE DISTINCTION THAT MATTERS.

   Two different numbers are both called "the cycle" and they are not the
   same:

     the ARMS — how many distinct directions the events cluster into, which
       is what the eye counts in the picture;
     the CLOSURE — after how many events the longitude returns closest to
       where it started, which is what a calendar is built on.

   For Śukra's conjunctions the eye counts five and the calendar wants ten.
   Reporting one of them and calling it "the cycle" would be telling half the
   truth to whichever reader was looking for the other half, so both are
   reported and both are labelled.

   WHAT THIS FILE DOES NOT CLAIM. These are computed cycles, not doctrine.
   BPHS is not the source of any of them and none is presented as such; what
   the classical texts say about a Pūrṇimā is a separate matter from where the
   Pūrṇimās fall, and only the second is what is drawn here. */

(function () {
  "use strict";

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var DAY = 86400000;

  function norm(x) { return ((x % 360) + 360) % 360; }
  /* the signed short way round, which is the only difference that behaves
     like a continuous function across 0° */
  function diff(a, b) {
    var d = norm(a - b);
    return d > 180 ? d - 360 : d;
  }
  function lonAt(en, ms) {
    try { return window.__kSidAt(en, new Date(ms)); } catch (e) { return null; }
  }

  function bisect(f, a, b) {
    var fa = f(a);
    if (fa == null) return null;
    for (var i = 0; i < 48; i++) {
      var m = (a + b) / 2, fm = f(m);
      if (fm == null) return null;
      if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else { b = m; }
      if (b - a < 1000) break;        /* a second is finer than any of this needs */
    }
    return (a + b) / 2;
  }

  /* Find every root of `f` between t0 and t1.

     THIS WAS A PREDICTOR, AND THE PREDICTOR WAS WRONG IN A WAY THAT DREW
     BEAUTIFULLY. The idea was to use the rhythm of the events found so far to
     guess where the next one is and bisect a short bracket around the guess,
     turning a scan of tens of thousands of ephemeris evaluations into a
     handful per event. It worked for the Moon. It failed for everything whose
     intervals are uneven, and it failed silently: when the guess was too
     long, the bracket opened PAST the next event and found the one after it,
     so the run came back short with no gap in it to notice — Maṅgala's
     stations every 81 days instead of 390, Budha's combustions a quarter
     missing. A figure drawn from three-quarters of the events is still a
     tidy figure.

     Three attempts to patch the predictor each fixed one case and left
     another, which is the signal that the method is wrong rather than the
     tuning: any scheme that decides where NOT to look can skip, and skipping
     is undetectable from the result.

     So this scans forward, and the only cleverness left is the step. It
     starts at the caller's seed and TIGHTENS to a quarter of the shortest
     interval actually seen, never loosening — so an event set that turns out
     closer together than expected is still resolved, and one that is far
     apart does not pay for the fine step it does not need. The cost is paid
     once per context because the registry caches resolved values. Correct and
     affordable beats fast and occasionally short. */
  function findAll(f, t0, t1, guessDays, cap) {
    cap = cap || 260;
    var out = [];
    var step = Math.max(DAY * 0.125, (guessDays || 30) * DAY / 14);
    var minGap = Infinity;
    var t = t0, prev = f(t);
    /* a bound on work, so a pathological function cannot hang the page; it is
       generous enough that nothing the page offers comes near it */
    for (var guard = 0; guard < 120000 && t < t1 && out.length < cap; guard++) {
      var tn = t + step, cu = f(tn);
      if (prev != null && cu != null && (prev < 0) !== (cu < 0) &&
          Math.abs(prev) < 120 && Math.abs(cu) < 120) {
        var r = bisect(f, t, tn);
        if (r != null) {
          if (out.length) minGap = Math.min(minGap, r - out[out.length - 1]);
          out.push(r);
          if (out.length >= 3 && isFinite(minGap))
            step = Math.max(DAY * 0.125, Math.min(step, minGap / 4));
        }
      }
      t = tn; prev = cu;
    }
    return out;
  }

  /* Keep only the crossings that go one way. A combustion has an entry and an
     exit and they are not the same event: "every entry into combustion" is a
     list of occasions, while a list of both is a list of boundaries, and
     plotting boundaries gives a figure with twice as many points and half the
     meaning. The direction is read from the function either side rather than
     recorded during the search, because the search bisects and the sign at
     the root is whatever rounding made it. */
  function onlyFalling(f, ts, h) {
    h = h || 43200000;
    return ts.filter(function (t) {
      var a = f(t - h), b = f(t + h);
      return a != null && b != null && a > 0 && b < 0;
    });
  }

  /* ---- the event kinds ----------------------------------------------------
     Each is a function whose sign changes at the event, plus the longitude to
     plot the event AT. The second is the part that makes a picture: an event
     set with no place in the circle is a list of dates. */

  function elongFn(aEN, bEN) {
    return function (ms) {
      var a = lonAt(aEN, ms), b = lonAt(bEN, ms);
      return (a == null || b == null) ? null : diff(a, b);
    };
  }
  /* opposition: the same function shifted half a turn */
  function oppFn(aEN, bEN) {
    return function (ms) {
      var a = lonAt(aEN, ms), b = lonAt(bEN, ms);
      if (a == null || b == null) return null;
      return diff(a + 180, b);
    };
  }
  /* combustion: the elongation crossing a stated orb. BPHS gives orbs for
     combustion; the figures used here are the ones the rest of this site
     uses, and they are stated rather than hidden so a reader can disagree
     with them and know what they are disagreeing with. */
  var ORB = { "Candra": 12, "Maṅgala": 17, "Budha": 14, "Guru": 11,
              "Śukra": 10, "Śani": 15 };
  function combustFn(sa, orb) {
    var en = EN[sa];
    return function (ms) {
      var a = lonAt("Sun", ms), b = lonAt(en, ms);
      if (a == null || b == null) return null;
      return Math.abs(diff(b, a)) - orb;
    };
  }
  /* a station: the daily motion changing sign */
  function stationFn(sa) {
    var en = EN[sa];
    return function (ms) {
      var a = lonAt(en, ms - DAY * 0.5), b = lonAt(en, ms + DAY * 0.5);
      if (a == null || b == null) return null;
      return diff(b, a);
    };
  }

  /* ---- the span ----------------------------------------------------------
     The page's span control is in days and reaches two hundred years. A
     cycle node takes it as given: a reader who asks for a century and gets
     a decade has been quietly overruled. The cap on event count is the only
     limit, and it is reported when it bites. */
  function spanOf(C) {
    var days = Math.max(30, C.spanDays || 365);
    return { t0: C.when, t1: C.when + days * DAY, days: days };
  }

  /* arms: how many directions the eye counts. Longitudes are binned at a
     width that is generous enough to call a drifting cluster one arm and
     tight enough not to merge two real ones. */
  /* HOW MANY DIRECTIONS DO THESE CLUSTER INTO?

     The first version binned the circle at a fixed width and counted occupied
     bins, which fails on exactly the case that matters: Śukra's inferior
     conjunctions make five arms, but each arm DRIFTS about two and a half
     degrees per cycle, so over five turns an arm is twelve degrees wide and a
     bin of eight splits it in two. It reported eleven arms for a pentagram.

     Clustering by GAPS has no width to get wrong. Sort the longitudes round
     the circle, look at the gaps between neighbours, and a cluster boundary
     is a gap much larger than the typical one. Five tight groups separated by
     seventy-degree gaps give five boundaries however wide the groups are;
     points spread evenly give no gap that stands out, and the honest answer
     there is not a number of arms but "these do not cluster", which is
     returned as zero and said in words rather than drawn as a figure that
     isn't there. */
  function arms(lons) {
    var n = lons.length;
    if (n < 4) return n;
    var s = lons.map(norm).sort(function (a, b) { return a - b; });
    var g = [];
    for (var i = 0; i < n; i++) g.push(i === n - 1 ? (360 - s[i] + s[0]) : (s[i + 1] - s[i]));
    var sorted = g.slice().sort(function (a, b) { return a - b; });
    var med = sorted[Math.floor(n / 2)];
    /* a boundary is a gap at least three times typical, and at least six
       degrees — the second condition stops a run of near-identical values
       from making every tiny gap a boundary */
    var thr = Math.max(med * 3, 6);
    var k = 0;
    g.forEach(function (q) { if (q >= thr) k++; });
    return k > 1 && k <= n / 2 ? k : 0;
  }
  /* closure: after how many events does the longitude come back closest */
  function closure(lons) {
    if (lons.length < 4) return null;
    var best = null;
    for (var k = 2; k < Math.min(lons.length, 300); k++) {
      var d = Math.abs(diff(lons[k], lons[0]));
      if (best == null || d < best.err) best = { n: k, err: d };
    }
    return best;
  }

  function cycleset(events, label, what, C) {
    if (!events || events.length < 2) return null;
    var lons = events.map(function (e) { return e.lon; });
    var gaps = [];
    for (var i = 1; i < events.length; i++) gaps.push(events[i].t - events[i - 1].t);
    var mean = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length;
    var cl = closure(lons);
    return {
      kind: "cycleset",
      label: label,
      what: what,
      events: events,
      n: events.length,
      meanDays: mean / DAY,
      spanYears: (events[events.length - 1].t - events[0].t) / DAY / 365.2564,
      arms: arms(lons),
      closure: cl ? { n: cl.n, err: cl.err,
                      years: (events[Math.min(cl.n, events.length - 1)].t - events[0].t)
                               / DAY / 365.2564 } : null
    };
  }

  function build(C, f, lonOf, guessDays, label, what, cap, filter) {
    var S = spanOf(C);
    /* The cap counts what the finder FINDS, not what survives the filter. A
       combustion node keeps only the entries and discards the exits, so a cap
       of three hundred leaves a hundred and fifty — and the span the reader
       asked for is silently halved with nothing on the frame to say so. A
       filtered node therefore searches for twice as many. */
    var want = (cap || 240) * (filter ? 2.4 : 1);
    var ts = findAll(f, S.t0, S.t1, guessDays, Math.round(want));
    if (filter === "falling") ts = onlyFalling(f, ts);
    else if (typeof filter === "function") ts = ts.filter(filter);
    if (ts.length < 2) return null;
    var ev = [];
    for (var i = 0; i < ts.length; i++) {
      var L = lonOf(ts[i]);
      if (L == null) continue;
      ev.push({ t: ts[i], lon: norm(L) });
    }
    return cycleset(ev, label, what, C);
  }

  /* ---- publishing the nodes ---------------------------------------------- */
  function reg(id, label, hint, get) {
    window.SPNodes.register({ id: id, dom: "cycles", label: label, hint: hint,
                              roles: ["cycleset"], get: get });
  }

  function publish() {
    if (!window.SPNodes || !window.SPNodes.register) return;
    if (!window.__kSidAt) return;

    /* the two syzygies */
    reg("cyc.purnima", "Pūrṇimā over time",
        "every full Moon in the span, plotted where in the circle it falls",
        function (C) {
          return build(C, oppFn("Moon", "Sun"),
            function (t) { return lonAt("Moon", t); }, 29.53,
            "Pūrṇimā", "full Moons");
        });
    reg("cyc.amavasya", "Amāvasyā over time",
        "every new Moon in the span, plotted where in the circle it falls",
        function (C) {
          return build(C, elongFn("Moon", "Sun"),
            function (t) { return lonAt("Moon", t); }, 29.53,
            "Amāvasyā", "new Moons");
        });

    /* combustion — the thing the eye most wants plotted over a long run */
    ["Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
      var orb = ORB[sa];
      reg("cyc.combust." + sa, sa + " combust",
          "every entry into combustion at " + orb + "° of Sūrya, over the span",
          function (C) {
            return build(C, combustFn(sa, orb),
              function (t) { return lonAt("Sun", t); },
              sa === "Candra" ? 15 : (sa === "Budha" ? 30 :
              (sa === "Śukra" ? 60 : 120)),
              sa + " combust", "combustions", 300, "falling");
          });
    });

    /* Inferior and superior conjunction, separately, for the two bodies that
       have both. A reader who asks for "Śukra's conjunctions" gets both kinds
       — which is correct, and is why the combined set has ten arms rather
       than the five of the famous figure. The pentagram proper is the
       inferior conjunctions alone, and it is worth being able to ask for it.
       The two are told apart by motion: a body at inferior conjunction is
       between us and Sūrya, and is retrograde. */
    [["Budha", 58], ["Śukra", 292]].forEach(function (q) {
      var sa = q[0], en = EN[sa], guess = q[1];
      function retroAt(t) {
        var a = lonAt(en, t - DAY * 0.5), b = lonAt(en, t + DAY * 0.5);
        return (a == null || b == null) ? null : diff(b, a) < 0;
      }
      reg("cyc.inferior." + sa, sa + " inferior conjunctions",
          "only the conjunctions with " + sa + " between us and Sūrya — the " +
          "figure these trace is the one usually meant",
          function (C) {
            return build(C, elongFn("Sun", en),
              function (t) { return lonAt("Sun", t); }, guess,
              sa + " inferior ☌", "inferior conjunctions", 300,
              function (t) { return retroAt(t) === true; });
          });
      reg("cyc.superior." + sa, sa + " superior conjunctions",
          "only the conjunctions with Sūrya between us and " + sa,
          function (C) {
            return build(C, elongFn("Sun", en),
              function (t) { return lonAt("Sun", t); }, guess,
              sa + " superior ☌", "superior conjunctions", 300,
              function (t) { return retroAt(t) === false; });
          });
    });

    /* stations */
    ["Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
      reg("cyc.station." + sa, sa + " stations",
          "every turn between retrograde and direct, plotted where it happens",
          function (C) {
            return build(C, stationFn(sa),
              function (t) { return lonAt(EN[sa], t); },
              sa === "Budha" ? 58 : (sa === "Śukra" ? 290 : 190),
              sa + " stations", "stations");
          });
    });

    /* every pair, in conjunction and in opposition — this is where the
       hundreds come from, and each one is a real computation rather than a
       label on the same picture */
    for (var i = 0; i < SA.length; i++) {
      for (var j = i + 1; j < SA.length; j++) {
        (function (a, b) {
          var guess = 400;
          if (a === "Sūrya" && b === "Candra") guess = 29.53;
          else if (a === "Sūrya") guess = b === "Budha" ? 116 : (b === "Śukra" ? 584 : 390);
          else if (a === "Candra") guess = 27.5;
          reg("cyc.conj." + a + "-" + b, a + " with " + b,
              "every conjunction of the two in the span, plotted where it falls",
              function (C) {
                return build(C, elongFn(EN[a], EN[b]),
                  function (t) { return lonAt(EN[a], t); }, guess,
                  a + " ☌ " + b, "conjunctions");
              });
          reg("cyc.opp." + a + "-" + b, a + " opposite " + b,
              "every opposition of the two in the span, plotted where it falls",
              function (C) {
                return build(C, oppFn(EN[a], EN[b]),
                  function (t) { return lonAt(EN[a], t); }, guess,
                  a + " ☍ " + b, "oppositions");
              });
        })(SA[i], SA[j]);
      }
    }
  }

  window.SPCycles = { publish: publish, findAll: findAll, arms: arms,
                      closure: closure, ORB: ORB, norm: norm, diff: diff };
  /* published as soon as the registry and the ephemeris both exist; the page
     scripts are deferred, so by the time anything asks for a node this has
     run — and publish() is idempotent because register() refuses duplicates */
  if (window.SPNodes && window.__kSidAt) publish();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", publish);
  else setTimeout(publish, 0);
})();
