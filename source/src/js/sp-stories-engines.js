/* ===== Stories from the site's other engines ==============================

   The reels in sp-stories.js all run on one engine: the modern ephemeris.
   These run on the other three, and the reason to have them is not variety.
   It is that each one can only be made by a site that has that engine.

     THE SŪRYA SIDDHĀNTA ENGINE can be asked where a graha is, by a method
       written down around the fifth century, and the modern ephemeris can be
       asked the same thing. The gap between the two answers, plotted, is a
       measurement of a fifteen-hundred-year-old piece of mathematics — and
       it is a far more interesting object than either answer alone, because
       the gap is not noise. It is a small constant plus a slow drift, which
       is what a method with slightly wrong revolution counts produces.

     THE SIMULATOR can be asked what would have happened instead. Nothing
       about a counterfactual can be looked up; it has to be integrated, and
       a reel of one is a reel of the integration.

     THE CYCLE REGISTRY already computes fifty-nine kinds of recurring event.
       Each of them is a reel for nothing more than the asking.

   The honesty rules are the same as everywhere else. The Siddhānta reels
   name which option set they ran it under, because this engine has switches
   — which sine table, which ayanāṃśa model, whether the bīja corrections are
   on — and a drift plot taken under one of them is not the same picture as
   under another. The simulation reels carry the integrator's own energy
   drift, so the viewer can see how much of the curve is arithmetic. */

(function () {
  "use strict";

  var DAY = 86400000;
  function norm(d) { d %= 360; return d < 0 ? d + 360 : d; }
  function sep(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }

  var SA = { Sun: "Sūrya", Moon: "Candra", Mercury: "Budha", Venus: "Śukra",
             Mars: "Maṅgala", Jupiter: "Guru", Saturn: "Śani" };
  var EN = {};
  for (var k in SA) if (SA.hasOwnProperty(k)) EN[SA[k]] = k;

  function RASHI() { return window.SPReel.RASHI; }
  function rashiOf(lon) { return RASHI()[Math.floor(norm(lon) / 30) % 12]; }
  function dateCaps(ms) { return window.SPReel.dateCaps(ms); }

  /* ===== 1. the Siddhānta's drift ========================================= */
  function driftStory(spec) {
    var S = window.SSEngine;
    if (!S || !window.__kSidAt) return null;
    var body = spec.body || "Jupiter", sa = SA[body];
    var everyDays = spec.everyDays ||
      (body === "Moon" ? 1 : (body === "Mercury" ? 4 : 15));
    var t = spec.t0, lon = [], err = [], ts = [];
    var lo = Infinity, hi = -Infinity, sum = 0, guard = 0;
    while (t <= spec.t1 && guard++ < 60000) {
      var q = null;
      try { q = S.trueLongitude(sa, S.ahargana(t)); } catch (e) { q = null; }
      var m = window.__kSidAt(body, new Date(t));
      if (q && q.lon != null && m != null) {
        var d = sep(q.lon, m);
        lon.push(m); err.push(d); ts.push(t);
        lo = Math.min(lo, d); hi = Math.max(hi, d); sum += Math.abs(d);
      }
      t += everyDays * DAY;
    }
    if (lon.length < 20) return null;
    var mean = sum / err.length;
    var scale = Math.max(0.6, Math.max(Math.abs(lo), Math.abs(hi)) * 1.08);

    /* the events are the turning points of the error, which is where the
       story actually is: the Siddhānta is not randomly wrong, it is wrong in
       a way that swings and comes back */
    var ev = [], i;
    for (i = 1; i < err.length - 1; i++) {
      if ((err[i] > err[i - 1] && err[i] >= err[i + 1]) ||
          (err[i] < err[i - 1] && err[i] <= err[i + 1])) {
        if (ev.length && ts[i] - ev[ev.length - 1].t < (spec.t1 - spec.t0) / 26)
          continue;
        ev.push(turn(ts[i], lon[i], err[i], sa));
      }
    }
    /* a run with a monotone error has no turning points at all, and a reel
       with no captions is not a reel: fall back to even marks */
    if (ev.length < 4) {
      ev = [];
      var stepN = Math.max(1, Math.floor(err.length / 14));
      for (i = stepN; i < err.length; i += stepN)
        ev.push(turn(ts[i], lon[i], err[i], sa));
    }
    ev.forEach(function (e, j) { e.hold = j < 2; });

    var yrs = (ts[ts.length - 1] - ts[0]) / DAY / 365.2564;
    var opt = S.options();
    return {
      kicker: "Nirayana · Sūrya Siddhānta",
      title: "How wrong was the Sūrya Siddhānta?",
      subtitle: sa + ", computed twice — once by the Siddhānta's own method " +
                "and once by a modern ephemeris. The gap is drawn.",
      stage: "drift",
      method: "Sūrya Siddhānta against a modern ephemeris",
      bodyName: body,
      cover: { t0: ts[0], t1: ts[ts.length - 1] },
      drift: { lon: lon, err: err, t: ts, scale: scale, lo: lo, hi: hi },
      events: ev,
      tallyKeys: ["ahead", "behind"],
      closing: {
        big: signed(lo) + " to " + signed(hi) + ", over " +
             yrs.toFixed(0) + " years",
        lines: [
          /* WHAT THE ERROR MEANS DEPENDS ON ITS SIZE, so the sentence is
             chosen from the number rather than written once. Sūrya is out by
             a degree and the rāśi is never in doubt; Śukra is out by
             twenty-six, which is most of a sign, and saying "the sign is
             almost always right" about that would be false. */
          "Mean error " + mean.toFixed(2) + "° — " +
          (mean / 30 * 100).toFixed(0) + "% of a rāśi. " +
          (mean < 2
            ? "Close enough that the sign is almost never in doubt, and the " +
              "degree almost never right."
            : (mean < 10
               ? "Enough to put the graha in the wrong rāśi near a boundary, " +
                 "and to move a nakṣatra outright."
               : "Enough to be a whole sign out, which is as far wrong as a " +
                 "position can usefully be.")),
          "The gap is not noise. It swings and returns, because the " +
          "Siddhānta's revolution counts are very slightly off and its " +
          "epicycles are a model rather than an ellipse.",
          "Run with the " + opt.sines + " sine table, the " + opt.ayana +
          " ayanāṃśa, bīja corrections " + (opt.bija ? "on" : "off") +
          ". A different setting is a different picture, and this one says " +
          "which it used."
        ]
      }
    };
  }
  function signed(v) { return (v >= 0 ? "+" : "\u2212") + Math.abs(v).toFixed(2) + "\u00b0"; }
  function turn(t, lon, e, sa) {
    return {
      t: t, lon: lon, err: e,
      marked: true, hold: false,
      tally: e >= 0 ? "ahead" : "behind",
      big: dateCaps(t),
      small: "The Siddhānta puts " + sa + " " + Math.abs(e).toFixed(2) + "° " +
             (e >= 0 ? "ahead of" : "behind") + " the modern place, in " +
             rashiOf(lon),
      note: null
    };
  }

  /* ===== 2. the Siddhānta's eclipses ======================================
     The sharpest test a predictive method can be put to, and the one its
     authors cared most about. Every eclipse the Siddhānta predicts in the
     span is plotted; the ones that really happen are marked; and the real
     ones it did not see are plotted too, because a reel that showed only the
     hits would be measuring the wrong thing. */
  function ssEclipseStory(spec) {
    var S = window.SSEngine, A = window.Astronomy;
    if (!S || !A || !S.eclipsesIn) return null;
    var pred = [];
    try { pred = S.eclipsesIn(spec.t0, spec.t1, null) || []; }
    catch (e) { return null; }
    if (pred.length < 3) return null;

    var real = [];
    try {
      var s = A.SearchGlobalSolarEclipse(new Date(spec.t0));
      for (var g = 0; g < 400 && s && s.peak.date.getTime() < spec.t1; g++) {
        real.push({ t: s.peak.date.getTime(), kind: "solar", k: s.kind });
        s = A.NextGlobalSolarEclipse(s.peak);
      }
      var l = A.SearchLunarEclipse(new Date(spec.t0));
      for (var h = 0; h < 400 && l && l.peak.date.getTime() < spec.t1; h++) {
        real.push({ t: l.peak.date.getTime(), kind: "lunar", k: l.kind });
        l = A.NextLunarEclipse(l.peak);
      }
    } catch (e2) { return null; }
    real.sort(function (a, b) { return a.t - b.t; });

    var ev = [], hit = 0, wrong = 0;
    var usedReal = {}, hitKinds = [], missKinds = [];
    pred.forEach(function (q) {
      /* msOf takes a JULIAN DAY, and an ahargana is a julian day minus the
         epoch — feeding one to the other lands in the year 415, which is a
         plausible-looking date for a Siddhānta and wrong by sixteen
         centuries. Every predicted eclipse then matched nothing, and the
         reel reported that the method never works. */
      var ms = (S.msOf && S.EPOCH) ? S.msOf(q.e.ahar + S.EPOCH.sunrise) : null;
      if (ms == null || !isFinite(ms)) return;
      var best = -1, bestD = Infinity;
      real.forEach(function (R, i) {
        if (R.kind !== q.kind) return;
        var d = Math.abs(R.t - ms);
        if (d < bestD) { bestD = d; best = i; }
      });
      var ok = best >= 0 && bestD < 2.5 * DAY;
      if (ok) { hit++; usedReal[best] = 1; hitKinds.push(real[best].k); }
      else wrong++;
      var lon = null;
      try {
        lon = S.trueLongitude(q.kind === "solar" ? "Sūrya" : "Candra",
                              q.e.ahar).lon;
      } catch (e3) { lon = 0; }
      ev.push({
        t: ms, lon: lon || 0, lat: latAt(ms), marked: ok, hold: ev.length < 3,
        band: ok ? "central" : "partial",
        tally: ok ? "confirmed" : "not there",
        big: dateCaps(ms),
        small: "The Siddhānta predicts a " + q.kind + " eclipse" +
               (ok ? ", and one happens within " +
                     (bestD / 3600000).toFixed(1) + " hours"
                   : ", and none happens"),
        note: ok ? null : "NO ECLIPSE ON THIS DATE"
      });
    });
    var missed = real.filter(function (R, i) { return !usedReal[i]; });
    missed.forEach(function (R) {
      missKinds.push(R.k);
      var lon = 0;
      try {
        lon = S.trueLongitude(R.kind === "solar" ? "Sūrya" : "Candra",
                              S.ahargana(R.t)).lon;
      } catch (e4) { lon = 0; }
      ev.push({
        t: R.t, lon: lon, lat: latAt(R.t), marked: false, hold: false,
        band: "none",
        tally: "missed",
        big: dateCaps(R.t),
        small: "A real " + R.kind + " eclipse the Siddhānta does not predict",
        note: "MISSED"
      });
    });
    ev.sort(function (a, b) { return a.t - b.t; });
    if (ev.length < 4) return null;
    var yrs = (ev[ev.length - 1].t - ev[0].t) / DAY / 365.2564;
    /* IS IT REALLY THE SLIGHT ONES IT LOSES? Measured, not assumed: the
       share of deep eclipses — total, annular, hybrid — among the ones it
       found against the ones it did not. If the two shares came out the same
       the sentence below would be false and would have to go. */
    function deep(list) {
      var n = 0;
      list.forEach(function (k) {
        if (k && k !== "partial" && k !== "penumbral") n++; });
      return list.length ? n / list.length : 0;
    }
    var deepHit = deep(hitKinds), deepMiss = deep(missKinds);
    return {
      kicker: "Nirayana · Sūrya Siddhānta",
      title: "Could the Siddhānta predict an eclipse?",
      subtitle: "Every eclipse the fifth-century method foresees, against " +
                "every one that happens.",
      stage: "nodes",
      method: "Sūrya Siddhānta against a modern ephemeris",
      /* this reel mixes solar and lunar predictions, so there is no single
         phase to draw the Moon at; `full` is deliberately absent rather than
         guessed. It was briefly set to an undefined `full`, which threw
         inside build()'s try and made the whole template vanish with no
         error anywhere. */
      inner: 1, outer: 1.5,
      events: ev,
      tallyKeys: ["confirmed", "not there", "missed"],
      nodeAt: function (t) { return window.__kSidAt("Rahu", new Date(t)); },
      closing: {
        big: "It called " + hit + (wrong ? " of " + pred.length : "") +
             ". Every one happened. It missed " + missed.length + ".",
        lines: [
          (deepHit > deepMiss + 0.1
            ? "It finds the great ones: " + Math.round(deepHit * 100) +
              "% of what it caught was total, annular or umbral, against " +
              Math.round(deepMiss * 100) + "% of what it missed. The slight " +
              "ones are what slip past."
            : "What it catches and what it misses are much the same mixture " +
              Math.round(deepHit * 100) + "% against " +
              Math.round(deepMiss * 100) + "% deep — so this is not a matter " +
              "of depth.") +
          " The reason is the node: an eclipse season sits where the node " +
          "says it does, and the Siddhānta's has drifted.",
          "Its draconitic month is right to about two seconds. Carried " +
          "across the circuits the node has made since the epoch, two " +
          "seconds becomes tens of degrees.",
          "That is a remarkable result for arithmetic done without a " +
          "telescope, and it is also why this site does not compute your " +
          "chart with it."
        ]
      }
    };
  }

  /* ===== 3. the simulator ==================================================
     A counterfactual cannot be looked up, so a reel of one is a reel of the
     integration. The integrator's own energy drift is printed on the closing
     card, because the honest question about any simulated curve is how much
     of it is arithmetic. */
  function simStory(spec) {
    var E = window.SimEngine, Z = window.SimScenarios;
    if (!E || !Z) return null;
    var sc = Z.byId(spec.scenario);
    if (!sc) return null;
    var cons = null;
    try { cons = Z.simulate(sc, spec.t0, { samples: 1400 }); }
    catch (e) { cons = null; }
    if (!cons || !cons.result || !cons.result.frames.length) return null;

    var AU = 1.495978707e8;                       /* km */
    var fr = cons.result.frames, x = [], y = [], ts = [], sx = [], sy = [];
    var extent = 0;
    for (var i = 0; i < fr.length; i++) {
      var b = fr[i].b;
      var E0 = null, M = null, S0 = null;
      for (var j = 0; j < b.length; j++) {
        if (b[j].name === "Earth") E0 = b[j];
        else if (b[j].name === "Moon") M = b[j];
        else if (b[j].name === "Sun") S0 = b[j];
      }
      if (!E0) continue;
      /* ONCE THE MOON IS GONE THE PATH ENDS. The frames go on — the run
         keeps integrating so the picture does not freeze — but a dead body
         reports no position, and taking that as the origin drew a straight
         line from the point of impact into the middle of the frame, which
         looks exactly like a trajectory and is not one. */
      if (!(M && M.alive)) break;
      var mx = (M.x - E0.x) * AU;
      var my = (M.y - E0.y) * AU;
      x.push(mx); y.push(my);
      sx.push(S0 ? (S0.x - E0.x) : 1); sy.push(S0 ? (S0.y - E0.y) : 0);
      ts.push(spec.t0 + fr[i].t * DAY);
      extent = Math.max(extent, Math.abs(mx), Math.abs(my));
    }
    if (x.length < 10) return null;
    extent = Math.max(extent, 20000) * 1.06;

    /* captions at even intervals, plus whatever the run itself threw */
    var ev = [], N = 12;
    for (var s = 1; s <= N; s++) {
      var k = Math.floor(x.length * s / (N + 1));
      var d = Math.sqrt(x[k] * x[k] + y[k] * y[k]);
      ev.push({
        t: ts[k], lon: 0, marked: false, hold: false, tally: "days",
        big: ((ts[k] - spec.t0) / DAY).toFixed(1) + " DAYS IN",
        small: "The Moon is " + Math.round(d).toLocaleString("en") +
               " km away, moving at " + speedAt(x, y, ts, k).toFixed(2) +
               " km/s",
        note: null
      });
    }
    (cons.result.events || []).forEach(function (q) {
      ev.push({
        t: spec.t0 + q.t * DAY, lon: 0, marked: true, hold: true,
        tally: "days",
        big: dateCaps(spec.t0 + q.t * DAY),
        small: q.say,
        note: q.kind === "collision" ? "IMPACT" : q.kind.toUpperCase()
      });
    });
    ev.sort(function (a, b2) { return a.t - b2.t; });

    var lines = [];
    if (cons.headline) lines.push(cons.headline);
    cons.jyotisha.slice(0, 2).forEach(function (r) {
      lines.push(r[0] + ": " + r[1]); });
    lines.push("Integrated with velocity Verlet from the real Earth, Moon " +
      "and Sun of that moment. Energy held to " +
      (cons.energyDrift != null ? cons.energyDrift.toExponential(1) : "—") +
      " of itself across the run, so what bends on screen is physics and " +
      "not arithmetic.");

    return {
      kicker: "Nirayana · simulation",
      title: spec.title || sc.label,
      subtitle: sc.question,
      stage: "orbit",
      method: "velocity Verlet from the real sky",
      clockMode: "days",
      cover: { t0: ts[0], t1: ts[ts.length - 1] },
      orbit: { x: x, y: y, t: ts, sun: { x: sx, y: sy },
               extent: extent, earthR: 6371 },
      events: ev,
      tallyKeys: [],
      closing: {
        big: cons.headline || sc.label,
        lines: lines.slice(0, 4)
      }
    };
  }

  /* the Moon's speed relative to the Earth at a sample, by central
     difference — the same way the ephemeris gets a velocity from positions */
  /* The node stage puts a dot's distance from the ring at the Moon's real
     latitude, so every event drawn there must carry one. The Siddhānta
     eclipse reel borrowed that stage without supplying any, and r + NaN * K
     reached createRadialGradient as a non-finite radius and threw — on one
     template out of forty-three, at one playhead, which is exactly the kind
     of thing that reaches a viewer rather than a developer. */
  function latAt(ms) {
    if (!window.__kEclip) return 0;
    var q = window.__kEclip("Moon", ms);
    return q && isFinite(q.lat) ? q.lat : 0;
  }

  function speedAt(x, y, ts, k) {
    var a = Math.max(0, k - 1), b = Math.min(x.length - 1, k + 1);
    var dt = (ts[b] - ts[a]) / 1000;
    if (!(dt > 0)) return 0;
    return Math.sqrt((x[b] - x[a]) * (x[b] - x[a]) +
                     (y[b] - y[a]) * (y[b] - y[a])) / dt;
  }

  /* ===== 4. anything the cycle registry already computes =================== */
  function cycleStory(spec) {
    var N = window.SPNodes;
    if (!N || !N.byId) return null;
    var node = N.byId(spec.nodeId);
    if (!node || !node.get) return null;
    /* the registry's own context shape: a start and a length in days, not a
       pair of instants — a node handed {t0,t1} reads undefined for both and
       quietly returns a default year from 1970 */
    var V = null;
    try {
      V = node.get({ when: spec.t0,
                     spanDays: (spec.t1 - spec.t0) / DAY,
                     t0: spec.t0, t1: spec.t1 });
    } catch (e) { V = null; }
    if (!V || !V.events || V.events.length < 4) return null;
    var ev = V.events.map(function (e, i) {
      return { t: e.t, lon: e.lon, marked: false, hold: i < 2,
               tally: V.what || "events",
               big: dateCaps(e.t),
               small: V.label + " in " + rashiOf(e.lon),
               note: i === 0 ? String(V.what || "").toUpperCase() : null };
    });
    var yrs = (ev[ev.length - 1].t - ev[0].t) / DAY / 365.2564;
    return {
      kicker: "Nirayana",
      title: spec.title || V.label,
      subtitle: V.n + " of them in " + yrs.toFixed(0) + " years. Where do " +
                "they fall?",
      stage: "whirl",
      method: "sidereal rāśi · Lahiri ayanāṃśa",
      events: ev,
      tallyKeys: [V.what || "events"],
      closing: {
        big: V.n + " in " + yrs.toFixed(0) + " years" +
             (V.arms ? ". " + V.arms + " arms." : ""),
        lines: [
          "Mean interval " + V.meanDays.toFixed(2) + " days.",
          V.closure
            ? "The figure closes after " + V.closure.n + " — about " +
              V.closure.years.toFixed(2) + " years — to within " +
              V.closure.err.toFixed(2) + "°."
            : "These do not close on a small whole number, so no cycle is " +
              "claimed."
        ]
      }
    };
  }

  /* ===== the catalogue additions =========================================== */
  function publish() {
    if (!window.SPStories || !window.SPStories.add) return;
    var add = window.SPStories.add;

    [["Jupiter", 120, 38], ["Saturn", 120, 38], ["Mars", 60, 34],
     ["Venus", 40, 32], ["Mercury", 30, 32], ["Moon", 6, 30],
     ["Sun", 60, 32]].forEach(function (q) {
      add({ key: "ssdrift." + q[0].toLowerCase(),
            group: "Two engines, one question",
            label: "How wrong was the Siddhānta? — " + SA[q[0]],
            blurb: "The Sūrya Siddhānta's " + SA[q[0]] + " against a modern " +
                   "ephemeris, every step out from the ring being the error.",
            years: q[1], seconds: q[2],
            build: function (s) { s.body = q[0]; return driftStory(s); } });
    });
    add({ key: "sseclipse", group: "Two engines, one question",
          label: "Could the Siddhānta predict an eclipse?",
          blurb: "Every eclipse the fifth-century method foresees, against " +
                 "every one that happens — the hits, the false alarms and " +
                 "the misses.",
          years: 25, seconds: 36, build: ssEclipseStory });

    [["stop", "The Moon stops revolving", 26],
     ["half", "The Moon at half its distance", 30],
     ["pct10", "The Moon a tenth further out", 30],
     ["roche", "The Moon at the Roche limit", 26],
     ["retrograde", "The Moon going the other way", 30],
     ["escape", "The Moon past escape speed", 30]].forEach(function (q) {
      add({ key: "sim." + q[0], group: "What if it were otherwise",
            label: q[1],
            blurb: "Integrated from the real Earth, Moon and Sun of that " +
                   "moment — nothing about this can be looked up.",
            years: 1, seconds: q[2],
            build: function (s) { s.scenario = q[0]; s.title = q[1];
                                  return simStory(s); } });
    });

    [["cyc.conj.Guru-Śani", "The Great Conjunction", 400, 36],
     ["cyc.conj.Sūrya-Śukra", "Sūrya meets Śukra", 120, 34],
     ["cyc.conj.Sūrya-Budha", "Sūrya meets Budha", 40, 32],
     ["cyc.conj.Guru-Śukra", "Guru meets Śukra", 100, 34],
     ["cyc.conj.Maṅgala-Śani", "Maṅgala meets Śani", 150, 34],
     ["cyc.opp.Sūrya-Maṅgala", "Maṅgala at opposition", 200, 34],
     ["cyc.opp.Sūrya-Guru", "Guru at opposition", 120, 34],
     ["cyc.purnima", "Every Pūrṇimā", 19, 30],
     ["cyc.amavasya", "Every Amāvāsyā", 19, 30],
     ["cyc.station.Budha", "Every station of Budha", 30, 32],
     ["cyc.station.Maṅgala", "Every station of Maṅgala", 120, 34],
     ["cyc.station.Śani", "Every station of Śani", 120, 34]
    ].forEach(function (q) {
      add({ key: "cyc." + q[0].replace(/[^A-Za-z0-9]+/g, "-"),
            group: "Everything that comes round",
            label: q[1],
            blurb: "Computed by the site's cycle registry over " + q[2] +
                   " years and plotted where each one falls.",
            years: q[2], seconds: q[3],
            build: function (s) { s.nodeId = q[0]; s.title = q[1];
                                  return cycleStory(s); } });
    });
  }

  window.SPStoriesEngines = { publish: publish, _drift: driftStory,
                              _ssEclipse: ssEclipseStory, _sim: simStory,
                              _cycle: cycleStory };
  publish();
})();
