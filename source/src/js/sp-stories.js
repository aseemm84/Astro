/* ===== The stories ========================================================

   A template here is not a layout. It is a QUESTION together with the
   computation that answers it, and the reel is what that computation looks
   like while it is being carried out.

   That distinction decides everything about this file. A layout can be
   filled with anything; these cannot. "Why isn't there an eclipse every
   amāvāsyā?" is answered by finding every new Moon in the span and asking,
   at each one, how far the Moon was from the node — and the reel marks the
   ones that were close because they WERE close, not because a designer
   wanted a highlight every so often. If the span contains no eclipse the
   reel says so. If the finder returns four events the reel is four events
   long. Nothing here manufactures a rhythm.

   The captions are written from the computed quantities, so a caption can
   never say something the numbers do not. Where a figure is a convention
   rather than a measurement — the limit in degrees below which a syzygy
   becomes an eclipse is a range, not a line — the reel says which
   convention it used.

   WHAT IS NOT CLAIMED. These are astronomy, and are labelled astronomy. The
   rāśi names on the rim are the sidereal signs this site computes
   throughout; the figures the runs draw are facts about ratios of periods
   and carry no interpretive weight at all. A reel that drew a pentagram and
   implied it meant something would be a different and much worse kind of
   object than this one. */

(function () {
  "use strict";

  var DAY = 86400000, R2 = Math.PI / 180;
  function norm(d) { d %= 360; return d < 0 ? d + 360 : d; }
  function sep(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }

  function E() { return window.__kEclip; }
  function H() { return window.__kHelio; }
  function ready() {
    return !!(window.__kEclip && window.__kHelio && window.__kSidAt);
  }

  /* Sanskrit names as this site uses them everywhere else */
  var SA = { Sun: "Sūrya", Moon: "Candra", Mercury: "Budha", Venus: "Śukra",
             Mars: "Maṅgala", Jupiter: "Guru", Saturn: "Śani", Earth: "Earth" };
  var ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  var RASHI = window.SPReel ? window.SPReel.RASHI : [];
  function rashiOf(lon) { return RASHI[Math.floor(norm(lon) / 30) % 12]; }

  /* ---- root finding on a continuous function ------------------------------
     The same self-tuning forward scan the cycle nodes use: step forward,
     notice a sign change, bisect. It tunes its own step down to a quarter of
     the smallest gap it has seen, because any scheme that DECIDES where not
     to look can skip an event, and a skipped event is undetectable from the
     result — the figure still looks tidy. */
  function findAll(f, t0, t1, guessDays, cap) {
    cap = cap || 400;
    var out = [], step = Math.max(DAY * 0.25, (guessDays || 30) * DAY / 12);
    var minGap = Infinity, t = t0, prev = f(t);
    for (var g = 0; g < 200000 && t < t1 && out.length < cap; g++) {
      var tn = Math.min(t1, t + step), cu = f(tn);
      if (prev != null && cu != null && (prev < 0) !== (cu < 0) &&
          Math.abs(prev) < 150 && Math.abs(cu) < 150) {
        var lo = t, hi = tn, flo = prev;
        for (var k = 0; k < 60 && hi - lo > 1000; k++) {
          var mid = (lo + hi) / 2, v = f(mid);
          if (v == null) break;
          if ((flo < 0) === (v < 0)) { lo = mid; flo = v; } else hi = mid;
        }
        var r = (lo + hi) / 2;
        if (out.length) minGap = Math.min(minGap, r - out[out.length - 1]);
        out.push(r);
        if (out.length >= 3 && isFinite(minGap))
          step = Math.max(DAY * 0.25, Math.min(step, minGap / 4));
      }
      if (tn >= t1) break;
      t = tn; prev = cu;
    }
    return out;
  }

  /* THE SPAN A REEL COVERS IS THE SPAN ITS EVENTS COVER.

     The finder takes a cap, because an unbounded search over eight hundred
     years of ephemeris is a way to hang a phone. When the cap bites, the
     events stop early — and the first version went on printing the span that
     had been ASKED for. "400 hidings. 800 years." was two true numbers that
     did not belong to each other: four hundred hidings of Śani take about
     four hundred and fourteen years, and the reel had quietly stopped there.

     Every story now measures its own span off its own events, and the reel's
     clock is clamped to match, so the year counter cannot run past the last
     thing that happened. */
  function yearsOf(ev) {
    if (!ev || ev.length < 2) return 0;
    return (ev[ev.length - 1].t - ev[0].t) / DAY / 365.2564;
  }
  /* WHAT THE SPAN IS MEASURED OVER DEPENDS ON WHAT IS DRAWN.

     For a whirl or a node wheel the drawn thing IS the events, so their
     first and last bound the reel. For a thread it is not: the thread is
     drawn every few days across the whole span and the events are only the
     meetings, the last of which falls well before the end. Measuring a
     thread's span off its meetings understated Maṅgala & Earth by three
     years and stopped the clock while chords were still arriving.

     So each story declares the span of its own drawn content, and the reel's
     clock is clamped to that. */
  function cover(t0, t1) { return { t0: t0, t1: t1 }; }

  function elongFn(a, b) {
    return function (t) { var x = E()(a, t), y = E()(b, t);
      return (x && y) ? sep(x.lon, y.lon) : null; };
  }
  function oppFn(a, b) {
    return function (t) { var x = E()(a, t), y = E()(b, t);
      return (x && y) ? sep(x.lon, y.lon + 180) : null; };
  }

  /* ---- 1. the eclipse story ===============================================
     Every new Moon, and how far the Moon stood from the node at each.

     THE CONVENTION IS STATED. An eclipse is not "latitude below a number";
     whether one occurs depends on the Moon's and the Sun's apparent sizes
     and the observer's place, and the honest statement is that a solar
     eclipse somewhere on Earth is CERTAIN inside about 0.9 degrees of
     ecliptic latitude at conjunction, IMPOSSIBLE beyond about 1.6, and
     conditional between. So the reel marks three bands and names them,
     rather than drawing a line and implying one exists. */
  /* THE ECLIPSES ARE NOT DECIDED BY A THRESHOLD HERE.

     The first version classified a syzygy as an eclipse if the Moon's
     latitude was under a limit, and the limits had to be guessed: 0.9° for a
     central eclipse, 1.6° for a partial. Checked against the vendored
     ephemeris's own eclipse search over twenty years, that scheme invented
     one eclipse that does not happen and called six total-or-annular ones
     partial, because the real limits are not constants — they depend on how
     far away the Sun and the Moon happen to be that month, which is exactly
     the thing a fixed number cannot know.

     The library already solves this properly. So the reel asks it. Latitude
     is still what positions the dot, because latitude is what the picture is
     about; it is no longer what decides the label.

     The bands drawn on the ring are then MEASURED from the run rather than
     asserted: the outermost latitude that produced a central eclipse, and
     the outermost that produced any eclipse at all. */
  function eclipseList(full, t0, t1) {
    var A = window.Astronomy, out = [];
    if (!A) return null;
    try {
      if (full) {
        if (!A.SearchLunarEclipse) return null;
        var e = A.SearchLunarEclipse(new Date(t0));
        for (var g = 0; g < 2000 && e && e.peak.date.getTime() < t1; g++) {
          out.push({ t: e.peak.date.getTime(), kind: e.kind });
          e = A.NextLunarEclipse(e.peak);
        }
      } else {
        if (!A.SearchGlobalSolarEclipse) return null;
        var s = A.SearchGlobalSolarEclipse(new Date(t0));
        for (var h = 0; h < 2000 && s && s.peak.date.getTime() < t1; h++) {
          out.push({ t: s.peak.date.getTime(), kind: s.kind });
          s = A.NextGlobalSolarEclipse(s.peak);
        }
      }
    } catch (e2) { return null; }
    return out;
  }

  function eclipseStory(spec) {
    var full = spec.which === "purnima";
    var f = full ? oppFn("Moon", "Sun") : elongFn("Moon", "Sun");
    var ts = findAll(f, spec.t0, spec.t1, 29.53, 420);
    if (ts.length < 3) return null;
    var ecl = eclipseList(full, spec.t0 - 40 * DAY, spec.t1 + 40 * DAY);
    if (!ecl) return null;

    function kindAt(t) {
      for (var i = 0; i < ecl.length; i++)
        if (Math.abs(ecl[i].t - t) < 1.2 * DAY) return ecl[i].kind;
      return null;
    }

    var events = [], central = 0, partial = 0;
    var maxCentral = 0, maxAny = 0;
    for (var i = 0; i < ts.length; i++) {
      var m = E()("Moon", ts[i]);
      if (!m) continue;
      var lat = Math.abs(m.lat);
      var kind = kindAt(ts[i]);
      /* "central" means the shadow's axis reaches: total, annular or hybrid
         for the Sun; the umbra for the Moon. Everything else the library
         reports is a partial or penumbral event, which is still an eclipse. */
      var band = !kind ? "none"
        : ((full ? (kind === "total" || kind === "partial")
                 : (kind !== "partial")) ? "central" : "partial");
      if (band === "central") { central++; maxCentral = Math.max(maxCentral, lat); }
      if (band === "partial") partial++;
      if (band !== "none") maxAny = Math.max(maxAny, lat);
      events.push({
        t: ts[i], lon: m.lon, lat: m.lat, band: band, kind: kind,
        marked: band !== "none",
        hold: band === "central",
        tally: band === "none" ? (full ? "pūrṇimās" : "amāvāsyās") : band,
        big: window.SPReel.dateCaps(ts[i]),
        small: (full ? "Pūrṇimā in " : "Amāvāsyā in ") + rashiOf(m.lon) +
               " · " + lat.toFixed(2) + "° from the ecliptic",
        note: !kind ? null
          : (full ? kind.toUpperCase() + " LUNAR ECLIPSE"
                  : kind.toUpperCase() + " SOLAR ECLIPSE — SOMEWHERE ON EARTH")
      });
    }
    if (!events.length) return null;
    var yrs = yearsOf(events);
    var tot = central + partial;
    return {
      kicker: "Nirayana",
      title: full ? "Why isn\u2019t there an eclipse every Pūrṇimā?"
                  : "Why isn\u2019t there an eclipse every Amāvāsyā?",
      subtitle: "Every " + (full ? "full" : "new") + " Moon for " +
                yrs.toFixed(0) + " years, and how far each stood from the node.",
      stage: "nodes",
      inner: maxCentral || 1, outer: maxAny || 1.5,
      bandNote: "measured from this run, not assumed",
      events: events,
      tallyKeys: [full ? "pūrṇimās" : "amāvāsyās", "central", "partial"],
      /* the rim is drawn in sidereal longitude, and __kSidAt returns Rāhu
         sidereal, so no conversion is needed or wanted here */
      nodeAt: function (t) { return window.__kSidAt("Rahu", new Date(t)); },
      closing: {
        big: tot + " eclipse" + (tot === 1 ? "" : "s") + " in " +
             events.length + " " + (full ? "full" : "new") + " Moons",
        lines: [
          "The Moon\u2019s path is tilted about 5° to the Sun\u2019s. Most " +
          "months it passes above or below, and nothing happens.",
          "Only where the two paths cross can a shadow fall. The sages called " +
          "those two points Rāhu and Ketu. Astronomers call them the nodes. " +
          "They are the same two points.",
          central + " reached " + (full ? "the umbra" : "the ground as a " +
          "total or annular eclipse") + "; the other " + partial +
          " were partial. The furthest from the ecliptic any of them " +
          "managed was " + maxAny.toFixed(2) + "°."
        ]
      }
    };
  }

  /* ---- 2. the thread ======================================================
     A straight line between two planets, drawn every few days for centuries
     and never rubbed out. The envelope that appears is a fact about the
     ratio of their periods and about nothing else: no curve is fitted, no
     symmetry is imposed, and if the ratio were different the figure would be
     different without a line of this file changing. */
  function threadStory(spec) {
    var A = spec.a || "Earth", B = spec.b || "Jupiter";
    var every = spec.everyDays || 5;
    var t = spec.t0, a = [], b = [], ts = [], maxR = 0;
    var guard = 0;
    while (t <= spec.t1 && guard++ < 40000) {
      var ha = H()(A, t), hb = H()(B, t);
      if (ha && hb) {
        var pa = { x: Math.cos((ha.lon - 90) * R2) * ha.r,
                   y: Math.sin((ha.lon - 90) * R2) * ha.r };
        var pb = { x: Math.cos((hb.lon - 90) * R2) * hb.r,
                   y: Math.sin((hb.lon - 90) * R2) * hb.r };
        a.push(pa); b.push(pb); ts.push(t);
        maxR = Math.max(maxR, ha.r, hb.r);
      }
      t += every * DAY;
    }
    if (a.length < 20) return null;

    var sampleT0 = ts[0], sampleT1 = ts[ts.length - 1];
    /* the events are the meetings: every time the two line up as seen from
       the Sun, which is when the thread is shortest */
    var meets = findAll(function (q) {
      var x = H()(A, q), y = H()(B, q);
      return (x && y) ? sep(x.lon, y.lon) : null;
    }, spec.t0, spec.t1, 400, 60);
    var events = meets.map(function (q, i) {
      var y = E()(B, q);
      return {
        t: q, lon: y ? y.lon : 0, marked: true, hold: i < 3,
        tally: "meetings",
        big: window.SPReel.dateCaps(q),
        small: "Meeting " + (i + 1) + " — in a line with the Sun" +
               (y ? ", " + nameOf(B) + " in " + rashiOf(y.lon) : ""),
        note: i === 0 ? "A GOLDEN THREAD, DRAWN EVERY " + every + " DAYS" : null
      };
    });
    var yrs = (sampleT1 - sampleT0) / DAY / 365.2564;
    return {
      kicker: "Nirayana",
      title: nameOf(B) + " & " + nameOf(A),
      subtitle: "A line between them every " + every + " days. What will " +
                "they draw in " + yrs.toFixed(0) + " years?",
      stage: "thread",
      cover: cover(sampleT0, sampleT1),
      thread: { a: a, b: b, t: ts, maxR: maxR, alpha: spec.alpha || 0.14 },
      events: events,
      tallyKeys: ["meetings"],
      closing: {
        big: events.length + " meeting" + (events.length === 1 ? "" : "s") +
             ". " + yrs.toFixed(0) + " years. One figure.",
        lines: [
          "Nothing drew this but the two periods. " + nameOf(B) + " takes " +
          "about " + periodOf(B).toFixed(1) + " years to go round; " +
          nameOf(A) + " takes " + periodOf(A).toFixed(2) + ".",
          "Where the lines crowd, the light piles up. That is all the " +
          "brightness is: a long exposure of a straight line, moved " +
          Math.round((spec.t1 - spec.t0) / DAY / every).toLocaleString("en") +
          " times."
        ]
      }
    };
  }
  function nameOf(k) { return SA[k] || k; }
  var PERIOD = { Mercury: 0.2408, Venus: 0.6152, Earth: 1.0,
                 Mars: 1.8808, Jupiter: 11.862, Saturn: 29.457, Moon: 0.0748 };
  function periodOf(k) { return PERIOD[k] || 1; }

  /* ---- 3. the hiding (asta) ===============================================
     Every time a graha disappears into the Sun's glare, plotted where in the
     circle it happened. The orb is the classical one for that graha, and the
     reel names it, because "combust" is a rule with a number in it and the
     number is tradition's rather than astronomy's. */
  var ORB = { Candra: 12, Maṅgala: 17, Budha: 14, Guru: 11, Śukra: 10, Śani: 15 };
  function astaStory(spec) {
    var body = spec.body || "Venus";
    var sa = SA[body], orb = ORB[sa] || 12;
    var f = function (t) {
      var x = E()(body, t), s = E()("Sun", t);
      if (!x || !s) return null;
      return Math.abs(sep(x.lon, s.lon)) - orb;
    };
    var ts = findAll(f, spec.t0, spec.t1, body === "Mercury" ? 58 : 250, 2400);
    /* only the ENTRIES: the crossing where the gap is closing. Keeping the
       exits too doubles the count and halves the span without saying so. */
    var ev = [];
    for (var i = 0; i < ts.length; i++) {
      var before = f(ts[i] - DAY), after = f(ts[i] + DAY);
      if (before == null || after == null || !(after < before)) continue;
      var s = E()("Sun", ts[i]);
      if (!s) continue;
      ev.push({
        t: ts[i], lon: s.lon, marked: false, hold: ev.length < 3,
        tally: "hidings",
        big: window.SPReel.dateCaps(ts[i]),
        small: sa + " hides in " + rashiOf(s.lon) + " — within " + orb +
               "° of Sūrya",
        note: ev.length === 0 ? "ASTA — THE HIDING" : null
      });
    }
    if (ev.length < 3) return null;
    var lons = ev.map(function (e) { return e.lon; });
    var fit = armsFromStep(lons);
    var arms = fit && fit.visible ? fit.visible.q : (fit ? fit.q : 0);
    var yrs = yearsOf(ev);
    var step = meanStep(lons);
    return {
      kicker: "Nirayana",
      title: sa + " Asta",
      subtitle: "Every time " + sa + " hides in the Sun’s glare. Where does " +
                "it hide?",
      stage: "whirl",
      events: ev,
      tallyKeys: ["hidings"],
      closing: {
        big: ev.length + " hidings. " + yrs.toFixed(0) + " years." +
             (arms ? "  " + numword(arms) + " arms." : ""),
        lines: [
          fit ? armsLine(fit)
             : "These do not fall into arms: the step between them is not " +
               "near any simple fraction of the circle, and the reel says so " +
               "rather than naming a number.",
          "Every hiding is a date. Together they draw a whirl.",
          "The " + orb + "° limit is the classical orb for " + sa +
          ", not an astronomical boundary — the glare fades, it does not stop."
        ]
      }
    };
  }
  function meanStep(lons) {
    var s = 0, n = 0;
    for (var i = 1; i < lons.length; i++) {
      var d = norm(lons[i] - lons[i - 1]);
      s += d; n++;
    }
    return n ? s / n : 0;
  }

  /* HOW MANY ARMS, AND WHY CLUSTERING WAS THE WRONG QUESTION.

     Three hundred years of Sukra hidings plainly draw five arms, and asking
     a clusterer how many groups the longitudes fall into returned none —
     correctly. Each arm PRECESSES: the step between one hiding and the next
     is a little short of four fifths of a circle, so every arm sweeps most
     of a quadrant over the run and the longitudes end up spread everywhere.
     Cluster the raw longitudes and there is nothing to find; the arms are
     visible only because the radius carries time.

     The arms are a property of the STEP, not of the positions. So: take the
     mean step, and ask which small fraction p/q of a circle it is nearest.
     The denominator is the number of arms, the residual is how far each
     circuit falls short, and when nothing fits inside a few degrees the
     answer is honestly none. */
  function armsFromStep(lons) {
    var step = meanStep(lons);
    if (!(step > 0)) return null;
    function nearest(maxQ) {
      var best = null;
      for (var q = 2; q <= maxQ; q++)
        for (var pn = 1; pn < q; pn++) {
          if (gcd(pn, q) !== 1) continue;
          var err = Math.abs(step - 360 * pn / q);
          if (err > 180) err = 360 - err;
          if (!best || err < best.err) best = { p: pn, q: q, err: err };
        }
      /* Two bounds, and the second is what stops this finding a pattern in
         anything. A small step can be fitted by SOME fraction with a large
         denominator almost always, so the residual must also be small beside
         the step itself: a fit a quarter of a step out is not a fit, it is a
         coincidence with a big number in it. */
      if (!best || best.err > 4 || best.err > step * 0.25) return null;
      return best;
    }
    /* TWO ANSWERS, BOTH TRUE, AND THEY ARE DIFFERENT QUESTIONS.

       Budha's hidings step 57.1° — near a sixth of a circle, so the beads
       lie in six arms and six arms is what anybody looking at the figure
       counts. But 3/19 fits the step twelve times more tightly, and that is
       the number of steps before the pattern actually repeats. Reporting
       only the tight fit says "nineteen arms" about a picture with six;
       reporting only the loose one leaves out why they curl.

       So the headline counts what the eye counts, from the small
       denominators, and the closure is given separately. */
    var visible = nearest(12), closes = nearest(36);
    if (!visible && !closes) return null;
    return { step: step, visible: visible, closes: closes,
             q: (visible || closes).q, err: (visible || closes).err };
  }
  function armsLine(fit) {
    var v = fit.visible, c = fit.closes;
    var out = "Each hiding falls " + fit.step.toFixed(1) + "° on from the last";
    if (v) {
      out += " — " + v.p + "/" + v.q + " of a circle, " + v.err.toFixed(2) +
             "° short. So " + v.q + " of them carry it almost once round, " +
             "and that shortfall is why the arms curl instead of closing.";
      if (c && c.q !== v.q)
        out += " The figure repeats in earnest only after " + c.q + ".";
    } else {
      out += ", which is " + c.p + "/" + c.q + " of a circle to within " +
             c.err.toFixed(2) + "° — so the beads lie in " + c.q + " arms.";
    }
    return out;
  }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  var WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
               "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
  function numword(n) { return WORDS[n] ? WORDS[n][0].toUpperCase() +
                                          WORDS[n].slice(1) : String(n); }

  /* ---- 4. vakrī: the loops ================================================ */
  function vakriStory(spec) {
    var body = spec.body || "Mars", sa = SA[body];
    var every = spec.everyDays || 2;
    var t = spec.t0, lon = [], r = [], ts = [], rMin = 1e9, rMax = -1e9;
    var guard = 0;
    while (t <= spec.t1 && guard++ < 40000) {
      var g = E()(body, t), d = window.__kDist(body, t);
      if (g && d) {
        lon.push(g.lon); r.push(d); ts.push(t);
        rMin = Math.min(rMin, d); rMax = Math.max(rMax, d);
      }
      t += every * DAY;
    }
    if (lon.length < 30) return null;
    var trackT0 = ts[0], trackT1 = ts[ts.length - 1];
    /* a station is where apparent longitude stops: the derivative changes
       sign, found on the same scan */
    var f = function (q) {
      var a = E()(body, q - 0.5 * DAY), b = E()(body, q + 0.5 * DAY);
      return (a && b) ? sep(b.lon, a.lon) : null;
    };
    var sts = findAll(f, spec.t0, spec.t1, 180, 120);
    var ev = sts.map(function (q, i) {
      var g = E()(body, q);
      var after = f(q + 2 * DAY);
      var retro = after != null && after < 0;
      return {
        t: q, lon: g ? g.lon : 0, marked: true, hold: i < 2,
        tally: retro ? "turns back" : "turns forward",
        big: window.SPReel.dateCaps(q),
        small: sa + (retro ? " turns vakrī (retrograde) in "
                           : " turns mārgī (direct) in ") +
               (g ? rashiOf(g.lon) : "?"),
        note: i === 0 ? "A STATION — THE MOMENT IT STOPS" : null
      };
    });
    if (ev.length < 2) return null;
    var yrs = (trackT1 - trackT0) / DAY / 365.2564;
    return {
      kicker: "Nirayana",
      title: sa + " Vakrī",
      subtitle: "Why does a planet go backwards? Watch its real path, " +
                "longitude against distance.",
      stage: "loops",
      cover: cover(trackT0, trackT1),
      track: { lon: lon, r: r, t: ts, rMin: rMin, rMax: rMax },
      events: ev,
      tallyKeys: ["turns back", "turns forward"],
      closing: {
        big: Math.floor(ev.length / 2) + " loops in " + yrs.toFixed(0) + " years",
        lines: [
          "It never reverses. The Earth overtakes it on the inside, and from " +
          "a moving platform the slower thing appears to slide back.",
          "Drawn against distance, the reversal is a loop — which is what it " +
          "has been the whole time."
        ]
      }
    };
  }

  /* ---- 5. any cycle the site already computes ============================= */
  function cycleStory(spec) {
    var node = window.SPNodes && window.SPNodes.byId
      ? window.SPNodes.byId(spec.nodeId) : null;
    if (!node) return null;
    var ctx = { t0: spec.t0, t1: spec.t1, span: spec.t1 - spec.t0 };
    var V = null;
    try { V = node.get(ctx); } catch (e) { V = null; }
    if (!V || !V.events || V.events.length < 3) return null;
    var ev = V.events.map(function (e, i) {
      return { t: e.t, lon: e.lon, marked: false, hold: i < 2,
               tally: V.what || "events",
               big: window.SPReel.dateCaps(e.t),
               small: V.label + " in " + rashiOf(e.lon),
               note: i === 0 ? (V.what || "").toUpperCase() : null };
    });
    var yrs = yearsOf(ev);
    return {
      kicker: "Nirayana",
      title: V.label,
      subtitle: V.n + " of them in " + yrs.toFixed(0) + " years. Where do " +
                "they fall?",
      stage: "whirl",
      events: ev,
      tallyKeys: [V.what || "events"],
      closing: {
        big: V.n + " in " + yrs.toFixed(0) + " years" +
             (V.arms ? ". " + numword(V.arms) + " arms." : ""),
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

  /* ---- the catalogue ====================================================== */
  var TEMPLATES = [
    { key: "eclipse.new", group: "Eclipses",
      label: "Why isn’t there an eclipse every Amāvāsyā?",
      blurb: "Every new Moon for decades, each marked with how far it stood " +
             "from the node. The eclipses are the ones that land there.",
      years: 20, seconds: 34, build: function (s) {
        s.which = "amavasya"; return eclipseStory(s); } },
    { key: "eclipse.full", group: "Eclipses",
      label: "Why isn’t there an eclipse every Pūrṇimā?",
      blurb: "The same question from the other side of the month.",
      years: 20, seconds: 34, build: function (s) {
        s.which = "purnima"; return eclipseStory(s); } },

    { key: "thread.earth-jupiter", group: "The golden thread",
      label: "Guru & Earth", blurb: "A line between them every five days " +
      "for twelve years. Eleven meetings; one star.",
      years: 12, seconds: 30,
      build: function (s) { s.a = "Earth"; s.b = "Jupiter"; s.everyDays = 5;
                            return threadStory(s); } },
    { key: "thread.earth-venus", group: "The golden thread",
      label: "Śukra & Earth", blurb: "Every three days for eight years. " +
      "Five meetings, and the figure they close.",
      years: 8, seconds: 28,
      build: function (s) { s.a = "Earth"; s.b = "Venus"; s.everyDays = 3;
                            s.alpha = 0.115; return threadStory(s); } },
    { key: "thread.earth-mars", group: "The golden thread",
      label: "Maṅgala & Earth", blurb: "Every four days for sixteen years.",
      years: 16, seconds: 30,
      build: function (s) { s.a = "Earth"; s.b = "Mars"; s.everyDays = 4;
                            return threadStory(s); } },
    { key: "thread.earth-saturn", group: "The golden thread",
      label: "Śani & Earth", blurb: "Every seven days for thirty years — " +
      "one whole circuit of Śani.",
      years: 30, seconds: 32,
      build: function (s) { s.a = "Earth"; s.b = "Saturn"; s.everyDays = 7;
                            return threadStory(s); } },
    { key: "thread.venus-jupiter", group: "The golden thread",
      label: "Śukra & Guru", blurb: "The two brightest, threaded for twelve " +
      "years.", years: 12, seconds: 30,
      build: function (s) { s.a = "Venus"; s.b = "Jupiter"; s.everyDays = 4;
                            return threadStory(s); } },

    { key: "asta.venus", group: "The hiding",
      label: "Śukra Asta", blurb: "Every time Venus hides in the glare, for " +
      "three centuries. Five arms.", years: 300, seconds: 36,
      build: function (s) { s.body = "Venus"; return astaStory(s); } },
    { key: "asta.jupiter", group: "The hiding",
      label: "Guru Asta", blurb: "Jupiter hides every thirteen months. Six " +
      "centuries of them.", years: 600, seconds: 36,
      build: function (s) { s.body = "Jupiter"; return astaStory(s); } },
    { key: "asta.mercury", group: "The hiding",
      label: "Budha Asta", blurb: "The fastest hider — about six times a " +
      "year, counting both conjunctions.", years: 60, seconds: 34,
      build: function (s) { s.body = "Mercury"; return astaStory(s); } },
    { key: "asta.saturn", group: "The hiding",
      label: "Śani Asta", blurb: "Once a year, for eight centuries.",
      years: 800, seconds: 36,
      build: function (s) { s.body = "Saturn"; return astaStory(s); } },
    { key: "asta.mars", group: "The hiding",
      label: "Maṅgala Asta", blurb: "Mars hides about every two years.",
      years: 400, seconds: 34,
      build: function (s) { s.body = "Mars"; return astaStory(s); } },

    { key: "vakri.mars", group: "Going backwards",
      label: "Maṅgala Vakrī", blurb: "Why a planet appears to reverse — " +
      "drawn against its real distance, so the reversal is a loop.",
      years: 15, seconds: 30,
      build: function (s) { s.body = "Mars"; return vakriStory(s); } },
    { key: "vakri.jupiter", group: "Going backwards",
      label: "Guru Vakrī", blurb: "Jupiter turns back once a year, every year.",
      years: 12, seconds: 30,
      build: function (s) { s.body = "Jupiter"; s.everyDays = 3;
                            return vakriStory(s); } },
    { key: "vakri.mercury", group: "Going backwards",
      label: "Budha Vakrī", blurb: "Three times a year, and the loops are " +
      "tight.", years: 6, seconds: 28,
      build: function (s) { s.body = "Mercury"; s.everyDays = 1;
                            return vakriStory(s); } },
    { key: "vakri.venus", group: "Going backwards",
      label: "Śukra Vakrī", blurb: "The rarest of the bright ones — about " +
      "every nineteen months.", years: 16, seconds: 30,
      build: function (s) { s.body = "Venus"; s.everyDays = 2;
                            return vakriStory(s); } },
    { key: "vakri.saturn", group: "Going backwards",
      label: "Śani Vakrī", blurb: "Saturn spends a third of every year " +
      "going backwards.", years: 20, seconds: 30,
      build: function (s) { s.body = "Saturn"; s.everyDays = 4;
                            return vakriStory(s); } }
  ];

  function byKey(k) {
    for (var i = 0; i < TEMPLATES.length; i++)
      if (TEMPLATES[i].key === k) return TEMPLATES[i];
    return null;
  }
  function groups() {
    var seen = {}, out = [];
    TEMPLATES.forEach(function (t) {
      if (!seen[t.group]) { seen[t.group] = 1; out.push(t.group); } });
    return out;
  }

  /* ---- assembly ===========================================================
     The template produces the content; this turns it into a reel: the
     timeline, the palette, the render settings, and the footer promise that
     every output of this site carries. */
  function build(key, opts) {
    if (!ready()) return null;
    opts = opts || {};
    var T = byKey(key);
    if (!T) return null;
    var years = opts.years || T.years;
    var t0 = opts.t0 != null ? opts.t0 : Date.now();
    var spec = { t0: t0, t1: t0 + years * 365.2564 * DAY };
    for (var k in opts) if (opts.hasOwnProperty(k) && spec[k] === undefined)
      spec[k] = opts[k];
    var S = null;
    try { S = T.build(spec); } catch (e) { S = null; }
    if (!S) return null;

    var seconds = opts.seconds || T.seconds;
    S.key = key;
    S.pal = window.SPReel.pal(opts.palette || "gold");
    S.seconds = seconds;
    S.foot = opts.foot || "nirayana · computed in your browser · nothing sent anywhere";
    /* a story that knows what its own clock counts wins: a four-day
       simulation labelled "YEAR 0.0" is a clock measuring the wrong thing */
    S.clockMode = opts.clockMode || S.clockMode ||
                  (years > 40 ? "year" : "elapsed");
    /* HOW LONG A CAPTION TAKES TO ARRIVE, in days of simulated time.

       Tying it to the span over the length — a fifth of a second's worth of
       clock — reads well when events are far apart and fails completely when
       they are not. Venus hides every 292 days and a three-hundred-year reel
       advances 669 days a second, so every caption was still fading in when
       the next one replaced it: three hundred years of text at a third
       opacity. It is therefore capped at a quarter of the typical gap
       between this reel's own events, which is a property of the data rather
       than of the format. */
    var gaps = [];
    for (var gi = 1; gi < S.events.length; gi++)
      gaps.push((S.events[gi].t - S.events[gi - 1].t) / DAY);
    gaps.sort(function (x, y) { return x - y; });
    var typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 30;
    S.fadeDays = Math.max(0.2, Math.min(
      (spec.t1 - spec.t0) / DAY / seconds * 0.22, typical * 0.22));
    S.grainAmount = opts.grain == null ? 0.045 : opts.grain;
    S.grade = opts.grade == null ? 1 : opts.grade;
    S.bloomTight = opts.bloomTight == null ? 0.55 : opts.bloomTight;
    S.bloomWide = opts.bloomWide == null ? 0.40 : opts.bloomWide;
    S.seed = (t0 / DAY) | 0;
    var last = S.events[S.events.length - 1];
    var step = S.events.length > 1
      ? (last.t - S.events[0].t) / (S.events.length - 1) : 0;
    var endT = S.cover ? S.cover.t1
                       : Math.min(spec.t1, last.t + step * 0.6);
    S.tl = window.SPReel.buildTimeline(S.events, {
      t0: spec.t0, t1: endT, seconds: seconds,
      lead: opts.lead == null ? Math.min(2.2, seconds * 0.07) : opts.lead,
      tail: opts.tail == null ? Math.min(5.5, seconds * 0.17) : opts.tail,
      hold: opts.hold == null ? 0.65 : opts.hold
    });
    S.years = Math.round((endT - spec.t0) / DAY / 365.2564);
    S.askedYears = years;
    S.truncated = S.years < years - 1;
    S.t0 = spec.t0; S.t1 = endT;
    return S;
  }

  /* Other engines register their own stories through this rather than being
     listed here, so a template and the engine it needs live in one file and
     a missing engine costs its own reels and nothing else. */
  function add(T) {
    if (!T || !T.key || byKey(T.key)) return false;
    TEMPLATES.push(T);
    return true;
  }

  window.SPStories = {
    TEMPLATES: TEMPLATES, byKey: byKey, groups: groups, build: build, add: add,
    ready: ready, findAll: findAll,
    /* exposed so the harness can check the finder against brute force */
    _eclipse: eclipseStory, _thread: threadStory, _asta: astaStory
  };
})();
