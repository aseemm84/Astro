/* ===== Counterfactuals, and what follows from them ========================

   A SCENARIO IS A PERTURBATION, NOT A STORY. Each one here is a function that
   reaches into the world and changes something — a position, a velocity, a
   mass — and then hands it back to the integrator. What happens next is not
   written down anywhere in this file. That is the point: if "the Moon stops
   revolving" ended with the Moon falling because somebody wrote that it
   falls, the simulation would be a cartoon. It falls because the integrator
   puts it there, in four and a half days, and the harness checks that figure
   against the free-fall time you can work out with a pencil.

   THE SIMULATOR KNOWS ITS OWN RESOLUTION, which matters more here than in
   most places. Asked what happens if the Moon moves an inch away, the honest
   answer is that the change is far below anything this or any simulation
   could show — the sidereal month lengthens by about a fifth of a
   millisecond, and the integrator's own error on the unperturbed run is eight
   minutes. A tool that drew a confident little animation of that would be
   lying. So every scenario carries an analytic prediction as well, the
   measured result is compared against the noise floor, and when the change is
   below it the page says so and gives the arithmetic instead. Being told
   "this is too small for me to show you, and here is how small" is a better
   answer than a picture.

   WHAT MAKES THIS BELONG ON THIS SITE. The physical consequences — tides,
   month lengths, whether total eclipses remain possible — are the same ones
   any orrery would report. The ones that matter here are what each change
   does to the system the rest of the site teaches: the tithi is a thirtieth
   of a synodic month, the nakṣatra transit is a twenty-seventh of a sidereal
   month, Rāhu and Ketu ARE the nodes of the lunar orbit, and Viṃśottarī is
   started from the Moon's nakṣatra. Change the orbit and those change with
   it, in ways that can be computed rather than guessed. Stop the Moon
   altogether and most of them cease to exist, which is a thing worth seeing
   stated plainly. */

(function () {
  "use strict";

  var E = null;
  function eng() { return E || (E = window.SimEngine); }
  var AU_KM = 149597870.7;

  function moonAndEarth(w) {
    var S = eng();
    return { m: S.find(w, "Moon"), e: S.find(w, "Earth"), S: S };
  }
  /* scale the Moon's distance from the Earth, keeping the orbit circularised
     or not as asked — the velocity is scaled so the orbit stays an orbit
     rather than becoming a fall or a launch */
  function scaleDistance(w, factor, keepCircular) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var r = S.sub(q.m.p, q.e.p), v = S.sub(q.m.v, q.e.v);
    var R = S.len(r);
    var newR = R * factor;
    q.m.p = S.add(q.e.p, S.mul(r, factor));
    var mu = S.GM_SUN * (q.m.m + q.e.m);
    if (keepCircular) {
      /* a circular orbit in the same plane: the velocity perpendicular to the
         radius, in the direction it was already going */
      var h = S.cross(r, v);
      var dir = S.cross(h, S.mul(r, factor));
      var d = S.len(dir);
      q.m.v = S.add(q.e.v, S.mul(dir, Math.sqrt(mu / newR) / (d || 1)));
    } else {
      /* keep the same shape of orbit, scaled: speeds go as 1/√a */
      q.m.v = S.add(q.e.v, S.mul(v, 1 / Math.sqrt(factor)));
    }
  }
  function addDistanceKm(w, km) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var r = S.sub(q.m.p, q.e.p);
    var R = S.len(r);
    scaleDistance(w, (R + km / AU_KM) / R, false);
  }
  function scaleSpeed(w, factor) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var v = S.sub(q.m.v, q.e.v);
    q.m.v = S.add(q.e.v, S.mul(v, factor));
  }

  /* ---- the library -------------------------------------------------------- */
  var SCENARIOS = [
    { id: "none", group: "Reference", label: "Leave everything alone",
      question: "The world as it is — the reference every other run is " +
                "measured against.",
      days: 400, apply: function () {} },

    /* --- the small ones, which are the interesting ones --- */
    { id: "inch", group: "Move the Moon", label: "An inch further away",
      question: "What happens if the Moon moves an inch away?",
      days: 400, subNoise: true,
      apply: function (w) { addDistanceKm(w, 0.0000254); },
      analytic: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        var dr = 0.0000254 / (el.a * AU_KM);
        return {
          lead: "Nothing you could ever measure, and that is the answer.",
          rows: [
            ["The Moon moves", "2.54 cm, out of " +
              Math.round(el.a * AU_KM).toLocaleString("en") + " km"],
            ["A fractional change of", dr.toExponential(2)],
            ["The sidereal month lengthens by",
              (1.5 * dr * S.REAL.siderealMonth * 86400 * 1000).toFixed(3) +
              " milliseconds"],
            ["Tides weaken by", (3 * dr * 100).toExponential(2) + " per cent"],
            ["The Moon's apparent width shrinks by",
              (dr * 31 * 60 * 1000).toExponential(2) + " milliarcseconds"],
            ["The Moon does this to itself every",
              (2.54 / S.REAL.moonRecessionCmPerYear * 12).toFixed(1) + " months, " +
              "receding at " + S.REAL.moonRecessionCmPerYear + " cm a year"]
          ],
          moral: "The question is a good one and the answer is a number. An " +
                 "inch is about eight months of the recession that is " +
                 "happening anyway — so whatever an inch does, it has already " +
                 "happened many times since you were born, and nothing in any " +
                 "almanac noticed."
        };
      } },

    { id: "metre", group: "Move the Moon", label: "A metre further away",
      question: "And a metre?", days: 400, subNoise: true,
      apply: function (w) { addDistanceKm(w, 0.001); },
      analytic: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        var dr = 0.001 / (el.a * AU_KM);
        return { lead: "Still below anything observable.",
          rows: [
            ["The sidereal month lengthens by",
              (1.5 * dr * S.REAL.siderealMonth * 86400 * 1000).toFixed(2) +
              " milliseconds"],
            ["Which the recession covers in",
              (100 / S.REAL.moonRecessionCmPerYear).toFixed(0) + " years"]
          ],
          moral: "A metre is twenty-six years of natural recession. The month " +
                 "is a hundredth of a second longer." };
      } },

    { id: "km1000", group: "Move the Moon", label: "A thousand km further",
      question: "A thousand kilometres — a quarter of a per cent.",
      days: 400,
      apply: function (w) { addDistanceKm(w, 1000); } },

    { id: "pct10", group: "Move the Moon", label: "Ten per cent further",
      question: "Ten per cent further out.", days: 500,
      apply: function (w) { scaleDistance(w, 1.10, false); } },

    { id: "double", group: "Move the Moon", label: "Twice as far",
      question: "What if the Moon were twice as far away?", days: 900,
      apply: function (w) { scaleDistance(w, 2, true); } },

    { id: "half", group: "Move the Moon", label: "Half as far",
      question: "And half as far?", days: 300,
      apply: function (w) { scaleDistance(w, 0.5, true); } },

    { id: "roche", group: "Move the Moon", label: "At the Roche limit",
      question: "As close as a body held together by its own gravity can " +
                "come before it is pulled apart.",
      days: 60,
      apply: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        /* the fluid Roche limit: the Earth's radius times the cube root of
           twice the density ratio */
        var rhoE = 5.514, rhoM = 3.344;
        var d = 6371 * Math.pow(2 * rhoE / rhoM, 1 / 3);
        scaleDistance(w, d / (el.a * AU_KM), true);
      },
      note: "The simulator treats both bodies as points, so the Moon does not " +
            "come apart here — it orbits serenely at a distance where a real " +
            "Moon would be torn into a ring. That is a limit of the model and " +
            "is stated rather than hidden." },

    /* --- the velocity ones --- */
    { id: "stop", group: "Stop or speed the Moon",
      label: "The Moon stops revolving",
      question: "What happens if the Moon stops revolving?",
      days: 8,
      apply: function (w) { scaleSpeed(w, 0); } },

    { id: "slow", group: "Stop or speed the Moon", label: "Slowed to seven tenths",
      question: "Slowed, but not stopped.", days: 60,
      apply: function (w) { scaleSpeed(w, 0.7); } },

    { id: "fast", group: "Stop or speed the Moon", label: "A fifth faster",
      question: "Sped up by a fifth.", days: 400,
      apply: function (w) { scaleSpeed(w, 1.2); } },

    { id: "escape", group: "Stop or speed the Moon", label: "Past escape speed",
      question: "What if the Moon were moving just fast enough to leave?",
      days: 1200,
      apply: function (w) { scaleSpeed(w, 1.45); } },

    { id: "retrograde", group: "Stop or speed the Moon",
      label: "The Moon goes the other way",
      question: "What if the Moon orbited backwards?", days: 400,
      apply: function (w) { scaleSpeed(w, -1); } },

    /* --- remove and change --- */
    { id: "remove", group: "Change what is there", label: "No Moon at all",
      question: "What if there were no Moon?", days: 500,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.alive = false;
      } },

    { id: "massx2", group: "Change what is there", label: "A Moon twice as heavy",
      question: "Twice the mass, same orbit.", days: 400,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.m *= 2;
      } },

    { id: "massx10", group: "Change what is there", label: "A Moon ten times as heavy",
      question: "Ten times the mass — a third of a per cent of the Earth.",
      days: 400,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.m *= 10;
      } },

    { id: "incline", group: "Change what is there",
      label: "The lunar orbit tilted to 30°",
      question: "What if the Moon's orbit were tilted much further from the " +
                "ecliptic?", days: 500,
      apply: function (w) {
        var S = eng(), q = moonAndEarth(w);
        if (!q.m || !q.e) return;
        /* rotate the relative position and velocity about the line of nodes */
        var r = S.sub(q.m.p, q.e.p), v = S.sub(q.m.v, q.e.v);
        var extra = (30 - 5.14) * Math.PI / 180;
        var c = Math.cos(extra), s = Math.sin(extra);
        function rot(a) { return S.vec(a.x, a.y * c - a.z * s, a.y * s + a.z * c); }
        q.m.p = S.add(q.e.p, rot(r));
        q.m.v = S.add(q.e.v, rot(v));
      } },

    { id: "circular", group: "Change what is there",
      label: "A perfectly circular lunar orbit",
      question: "What if the Moon's orbit had no eccentricity at all?",
      days: 400,
      apply: function (w) { scaleDistance(w, 1, true); } },

    /* --- the Earth itself --- */
    { id: "earthstop", group: "The Earth", label: "The Earth stops turning",
      question: "What if the Earth stopped spinning?", days: 400,
      gravitational: false,
      apply: function (w) { w.spinHours = Infinity; } },

    { id: "earthfast", group: "The Earth", label: "A six-hour day",
      question: "What if the Earth turned four times as fast?", days: 400,
      gravitational: false,
      apply: function (w) { w.spinHours = 6; } },

    { id: "tilt0", group: "The Earth", label: "No axial tilt",
      question: "What if the Earth's axis were upright?", days: 400,
      gravitational: false,
      apply: function (w) { w.tilt = 0; } },

    { id: "tilt45", group: "The Earth", label: "A tilt of 45°",
      question: "What if the Earth leaned much further?", days: 400,
      gravitational: false,
      apply: function (w) { w.tilt = 45; } },

    { id: "tilt90", group: "The Earth", label: "Lying on its side",
      question: "What if the Earth rolled along its orbit like Uranus?",
      days: 400, gravitational: false,
      apply: function (w) { w.tilt = 90; } },

    /* --- the Sun and the rest --- */
    { id: "sunheavy", group: "The rest of the system",
      label: "A Sun a tenth heavier",
      question: "What if the Sun had ten per cent more mass?", days: 500,
      apply: function (w) {
        var S = eng(), s = S.find(w, "Sun");
        if (s) s.m *= 1.1;
      } },
    { id: "sunlight", group: "The rest of the system",
      label: "A Sun a tenth lighter",
      question: "And ten per cent less?", days: 500,
      apply: function (w) {
        var S = eng(), s = S.find(w, "Sun");
        if (s) s.m *= 0.9;
      } },
    { id: "nojupiter", group: "The rest of the system", label: "No Jupiter",
      question: "What if Jupiter were not there?", days: 800,
      needs: ["Sun", "Earth", "Moon", "Jupiter", "Venus", "Mars", "Saturn"],
      apply: function (w) {
        var S = eng(), j = S.find(w, "Jupiter");
        if (j) j.alive = false;
      } },
    { id: "jupiterclose", group: "The rest of the system",
      label: "Jupiter at half its distance",
      question: "What if Jupiter were twice as close?", days: 800,
      needs: ["Sun", "Earth", "Moon", "Jupiter", "Venus", "Mars", "Saturn"],
      apply: function (w) {
        var S = eng(), j = S.find(w, "Jupiter"), s = S.find(w, "Sun");
        if (!j || !s) return;
        var r = S.sub(j.p, s.p), v = S.sub(j.v, s.v);
        j.p = S.add(s.p, S.mul(r, 0.5));
        j.v = S.add(s.v, S.mul(v, Math.sqrt(2)));
      } }
  ];

  function byId(id) {
    for (var i = 0; i < SCENARIOS.length; i++)
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    return null;
  }

  /* ---- what follows ------------------------------------------------------- */

  /* The tide a body raises goes as its mass over the cube of its distance.
     Reported as a ratio to the tide now, because nobody has an intuition for
     the absolute figure and everybody has one for "half". */
  function tideRatio(aNew, mNew, aOld, mOld) {
    if (!aNew || !aOld) return null;
    return (mNew / mOld) * Math.pow(aOld / aNew, 3);
  }
  /* Angular width in minutes of arc, from a diameter in km and a distance. */
  function angularMin(diamKm, distKm) {
    return 2 * Math.atan2(diamKm / 2, distKm) * 180 / Math.PI * 60;
  }

  function consequences(res, w0, scenario, baseline, mres, wPerturbed) {
    var S = eng();
    var src = mres || res;
    var out = { id: scenario.id, label: scenario.label,
                question: scenario.question, rows: [], jyotisha: [],
                flags: {}, events: res.events.slice() };

    /* TWO SETS OF ELEMENTS, FOR TWO DIFFERENT QUESTIONS.

       "How far away is the Moon now" is about the orbit you set up, and must
       be read at the same moment as the one it is compared against — the
       osculating semi-major axis swings about two per cent across a month
       under the Sun's pull, so reading the end of one run against the start
       of another reports a two per cent change when nothing was changed at
       all. "Did it stay" is about the end of the run, and must be read there.
       Using one for both is how the untouched scenario came to claim the
       tides had weakened by two per cent. */
    var elStart = wPerturbed ? S.elements(wPerturbed, "Moon", "Earth") : null;
    var elEnd = S.elements(res.world, "Moon", "Earth");
    var el = elStart || elEnd;
    var moonGone = !S.find(res.world, "Moon") || !S.find(res.world, "Moon").alive;
    var elNow = elEnd;
    /* A MONTH IS A RETURN, so a Moon that is leaving has no month. Counting
       its angle swept and dividing gave numbers like "a sidereal month of
       373 days", which is not a long month — it is a body on its way out,
       measured as though it were coming back. */
    var unbound = elNow && !elNow.bound;
    var sid = (moonGone || unbound) ? null : S.measurePeriod(src, "Moon", "Earth");
    var syn = (moonGone || unbound) ? null : S.measureSynodic(src);
    if (sid && sid.aliased) sid = null;
    var baseSid = baseline && baseline.sidereal ? baseline.sidereal : S.REAL.siderealMonth;
    var baseSyn = baseline && baseline.synodic ? baseline.synodic : S.REAL.synodicMonth;
    /* The baseline distance is taken from the world BEFORE anything was
       touched, not from the end of the baseline run. Otherwise the untouched
       scenario compares one moment of a wobbling orbit against another and
       reports that nothing changed by half a per cent. */
    var el0 = S.elements(w0, "Moon", "Earth");
    var baseA = el0 ? el0.a : (S.REAL.moonDistanceKm / AU_KM);

    out.sidereal = sid ? sid.periodDays : null;
    out.synodic = syn;
    out.elements = el;
    out.moonGone = moonGone;

    /* did anything end? */
    var collision = null, escape = false;
    res.events.forEach(function (e) {
      if (e.kind === "collision") collision = e;
    });
    if (elEnd && !elEnd.bound) escape = true;
    out.flags.collision = !!collision;
    out.flags.escape = escape;
    out.flags.moonGone = moonGone;

    if (collision) {
      out.headline = collision.say + " after " + collision.t.toFixed(2) +
                     " days — " + (collision.t * 24).toFixed(1) + " hours.";
      out.rows.push(["How long it takes", collision.t.toFixed(3) + " days"]);
    } else if (escape) {
      out.headline = "The Moon is no longer bound to the Earth. It leaves.";
      out.rows.push(["Orbit", "unbound — eccentricity " +
        (el ? el.e.toFixed(3) : "—") + ", energy positive"]);
      /* the interesting case: it was bound on the two-body test and the Sun
         took it anyway, which looks like a bug until the Hill radius is on
         the page */
      var h2 = S.hillRadius(res.world);
      var el0 = S.elements(w0, "Moon", "Earth");
      if (h2 && el0) out.rows.push(["Why",
        "a two-body calculation would call this bound. It is the Sun that " +
        "takes it: the orbit's far point reaches past the Hill radius, " +
        Math.round(h2 * AU_KM).toLocaleString("en") + " km, where the Sun's " +
        "pull on the Moon exceeds the Earth's."]);
    } else if (moonGone) {
      out.headline = "There is no Moon.";
    } else if (el) {
      var dKm = el.a * AU_KM;
      out.headline = "A stable orbit, " + Math.round(dKm).toLocaleString("en") +
        " km across its long axis, going round in " +
        (sid ? sid.periodDays.toFixed(2) : el.periodDays.toFixed(2)) + " days.";
      out.rows.push(["Distance", Math.round(dKm).toLocaleString("en") + " km  (" +
        (dKm / S.REAL.moonDistanceKm).toFixed(4) + "× now)"]);
      out.rows.push(["Eccentricity", el.e.toFixed(4) +
        (el.e > 0.3 ? "  — a markedly elliptical orbit" : "")]);
      out.rows.push(["Inclination to the ecliptic", el.inc.toFixed(2) + "°"]);
      if (sid) out.rows.push(["Sidereal month", sid.periodDays.toFixed(4) +
        " days  (" + (sid.periodDays / baseSid).toFixed(4) + "× now)"]);
      if (syn) out.rows.push(["Synodic month", syn.toFixed(4) + " days  (" +
        (syn / baseSyn).toFixed(4) + "× now)"]);
      var tr = tideRatio(el.a, S.find(res.world, "Moon").m, baseA,
                         S.MASS.Moon);
      if (tr != null) {
        out.tide = tr;
        out.rows.push(["Lunar tides", tr < 1
          ? (1 / tr).toFixed(2) + " times weaker"
          : tr.toFixed(2) + " times stronger"]);
      }
      /* can there still be a total solar eclipse? */
      var peri = el.periapsis * AU_KM, apo = el.apoapsis * AU_KM;
      var biggest = angularMin(2 * S.RADIUS_KM.Moon, peri);
      var smallest = angularMin(2 * S.RADIUS_KM.Moon, apo);
      out.moonAngular = { min: smallest, max: biggest };
      var total = biggest >= S.REAL.sunAngularMax;
      var annularOnly = biggest < S.REAL.sunAngularMin;
      out.flags.totalEclipse = total;
      out.rows.push(["The Moon's apparent width",
        smallest.toFixed(2) + "′ to " + biggest.toFixed(2) + "′, against the " +
        "Sun's " + S.REAL.sunAngularMin + "′ to " + S.REAL.sunAngularMax + "′"]);
      /* where this orbit sits against the limit of the Earth's reach */
      var hill = S.hillRadius(res.world);
      el = elStart || elEnd;
      if (hill) {
        var frac = el.apoapsis / hill;
        out.hillFraction = frac;
        out.rows.push(["Against the Earth's reach",
          "the farthest point of this orbit is " + (frac * 100).toFixed(1) +
          "% of the Hill radius — the distance at which the Sun's pull " +
          "overtakes the Earth's" +
          (frac > 0.5 ? ". Beyond about half, an orbit is not reliably stable."
           : (frac > 0.33 ? ". Past a third, an orbit becomes sensitive." : ""))]);
      }
      out.rows.push(["Total solar eclipses", total
        ? "still possible"
        : (annularOnly ? "impossible — every solar eclipse is annular"
                       : "only barely, and rarely")]);
    }

    /* the Earth's own rotation, which gravity here does not touch */
    if (res.world.spinHours !== S.REAL.dayHours) {
      out.flags.spinChanged = true;
      out.rows.push(["The day", isFinite(res.world.spinHours)
        ? res.world.spinHours + " hours" : "never ends — the Earth keeps one " +
          "face to the Sun through its year, so a day becomes a year"]);
    }
    if (res.world.tilt !== S.REAL.tiltDegrees) {
      out.flags.tiltChanged = true;
      out.rows.push(["Axial tilt", res.world.tilt + "°, against " +
        S.REAL.tiltDegrees + "° now"]);
      out.rows.push(["Seasons", res.world.tilt === 0
        ? "none — every day the same length everywhere, all year"
        : (res.world.tilt >= 60
           ? "violent: the poles face the Sun directly for part of the year " +
             "and are in darkness for the rest"
           : "stronger than now, and the tropics move to " +
             res.world.tilt + "° of latitude")]);
    }

    /* the year, if the Earth itself was disturbed */
    var ey = S.measurePeriod(res, "Earth", "Sun");
    if (ey && Math.abs(ey.periodDays - S.REAL.siderealYear) > 1) {
      out.year = ey.periodDays;
      out.rows.push(["The year", ey.periodDays.toFixed(2) + " days  (" +
        (ey.periodDays / S.REAL.siderealYear).toFixed(4) + "× now)"]);
    }

    out.jyotisha = jyotisha(out, S);
    out.energyDrift = res.energyDrift;
    return out;
  }

  /* WHAT IT DOES TO THE SYSTEM THIS SITE TEACHES.

     Not a list of opinions. Every line is arithmetic on the numbers above: a
     tithi is a thirtieth of a synodic month by definition, a nakṣatra transit
     a twenty-seventh of a sidereal month, and Rāhu and Ketu are the two points
     where the lunar orbit crosses the ecliptic — so a Moon with no orbit has
     no nodes, and a scheme that begins from the Moon's nakṣatra has nothing
     to begin from. */
  function jyotisha(out, S) {
    var rows = [];
    if (out.flags.collision || out.flags.escape || out.moonGone) {
      rows.push(["Tithi", "ceases. A tithi is a twelfth of the Moon's " +
        "distance from the Sun, and there is no Moon to be at a distance."]);
      rows.push(["Pakṣa and māsa", "cease. Both are counted from new Moon to " +
        "full and back."]);
      rows.push(["Nakṣatra transit", "ceases. The Moon no longer moves " +
        "through them."]);
      rows.push(["Rāhu and Ketu", "cease to exist as points. They ARE the two " +
        "places the Moon's orbit crosses the ecliptic; with no orbit there " +
        "are no crossings."]);
      rows.push(["Eclipses", "none, ever again."]);
      rows.push(["Viṃśottarī", "has no starting point. The daśā at birth is " +
        "set by the Moon's nakṣatra and how far through it the Moon has got, " +
        "and neither quantity exists."]);
      rows.push(["What survives", "the Sun, the five star-planets, the " +
        "rāśis, the bhāvas and the lagna — everything that is solar or " +
        "diurnal. Roughly half of the apparatus, and not the half most " +
        "readings lean on."]);
      return rows;
    }
    if (!out.synodic || !out.sidereal) return rows;
    var tithi = out.synodic / 30, nak = out.sidereal / 27;
    var tNow = S.REAL.synodicMonth / 30, nNow = S.REAL.siderealMonth / 27;
    rows.push(["A tithi", (tithi * 24).toFixed(2) + " hours, against " +
      (tNow * 24).toFixed(2) + " now  (" + (tithi / tNow).toFixed(3) + "×)"]);
    rows.push(["A pakṣa", (out.synodic / 2).toFixed(2) + " days, against " +
      (S.REAL.synodicMonth / 2).toFixed(2) + " now"]);
    rows.push(["A lunar month", out.synodic.toFixed(2) + " days, against " +
      S.REAL.synodicMonth.toFixed(2) + " now"]);
    rows.push(["A nakṣatra transit", (nak * 24).toFixed(2) + " hours, against " +
      (nNow * 24).toFixed(2) + " now"]);
    rows.push(["Months in a year",
      (S.REAL.siderealYear / out.synodic).toFixed(3) + ", against " +
      (S.REAL.siderealYear / S.REAL.synodicMonth).toFixed(3) + " now"]);
    var adhika = S.REAL.siderealYear / out.synodic - 12;
    rows.push(["An intercalary month", adhika > 0.001
      ? "every " + (1 / adhika).toFixed(2) + " years, against every " +
        (1 / (S.REAL.siderealYear / S.REAL.synodicMonth - 12)).toFixed(2) + " now"
      : (adhika < -0.001
         ? "never — the year would be SHORT of twelve lunar months, so the " +
           "calendar would need months removed rather than added"
         : "almost exactly twelve months to the year")]);
    if (out.elements) {
      rows.push(["Rāhu and Ketu", "still exist — the orbit still crosses the " +
        "ecliptic, now at " + out.elements.inc.toFixed(2) +
        "° instead of 5.14°" + (out.elements.inc > 15
          ? ". Eclipse seasons would be much shorter and rarer, because the " +
            "Moon spends less time near the ecliptic."
          : ".")]);
    }
    if (out.flags.totalEclipse === false)
      rows.push(["Eclipses", "partial and annular only. The Moon is never " +
        "wide enough to cover the Sun, so there is no totality — and the " +
        "most dramatic thing Rāhu is said to do, it could no longer do."]);
    rows.push(["Viṃśottarī", "survives unchanged in structure — the hundred " +
      "and twenty years are a convention and not an astronomical period — but " +
      "the balance at birth shifts, because the Moon takes " +
      (nak / nNow).toFixed(3) + " times as long to cross a nakṣatra."]);
    return rows;
  }

  /* ---- running one -------------------------------------------------------- */
  function worldFor(scenario, ms) {
    var S = eng();
    return S.worldAt(ms, scenario.needs || ["Sun", "Earth", "Moon"]);
  }
  /* MEASURING AND SHOWING ARE TWO DIFFERENT RUNS, and conflating them is
     what produced a period eight times too long at the Roche limit.

     A measurement needs many samples per orbit and only a few orbits. A
     picture needs enough orbits to show the shape and few enough frames to
     draw. For the Moon as it is those are nearly the same run; for an orbit
     of two hours they are not remotely the same run. So the period is taken
     from a short dense run sized to the orbit, and the animation from a
     separate one sized to the eye. */
  function measureRun(S, w, opts) {
    var el = S.elements(w, "Moon", "Earth");
    var P = el && el.periodDays ? el.periodDays : S.REAL.siderealMonth;
    if (!(P > 0) || !isFinite(P)) P = S.REAL.siderealMonth;
    var turns = 18;
    var days = Math.max(P * turns, 2);
    /* forty samples a turn, which leaves a wide margin over the six the
       aliasing guard insists on */
    var samples = Math.min(20000, Math.max(900, Math.round(turns * 40)));
    return S.run(S.clone(w), days, { samples: samples });
  }
  /* how long to SHOW: the scenario's own figure, unless that would be
     hundreds of orbits, in which case enough to read the shape */
  function showDays(S, w, scenario) {
    var el = S.elements(w, "Moon", "Earth");
    var want = scenario.days || 400;
    if (!el || !el.periodDays || !isFinite(el.periodDays)) return want;
    var max = el.periodDays * 24;
    return Math.min(want, Math.max(el.periodDays * 3, max));
  }

  function simulate(scenario, ms, opts) {
    opts = opts || {};
    var S = eng();
    var w = worldFor(scenario, ms);
    if (!w) return null;
    var base = null;
    if (!opts.skipBaseline) {
      var br = measureRun(S, w, opts);
      var bs = S.measurePeriod(br, "Moon", "Earth");
      if (bs && bs.aliased) bs = null;
      base = { sidereal: bs ? bs.periodDays : null,
               synodic: S.measureSynodic(br),
               a: (S.elements(br.world, "Moon", "Earth") || {}).a,
               energyDrift: br.energyDrift,
               /* THE NOISE FLOOR: how far the untouched run's own measured
                  month sits from the real one. Any change smaller than this
                  is below what this simulation can see, and saying so is the
                  difference between a tool and a toy. */
               siderealError: bs
                 ? Math.abs(bs.periodDays - S.REAL.siderealMonth) : null };
    }
    var w2 = S.clone(w);
    scenario.apply(w2);
    /* the dense run, for the numbers */
    var mres = measureRun(S, w2, opts);
    /* and the one the animation is made of */
    var days = showDays(S, w2, scenario);
    var res = S.run(S.clone(w2), days, { samples: opts.samples || 900 });
    res.measured = mres;
    var cons = consequences(res, w, scenario, base, mres, w2);
    cons.baseline = base;
    cons.days = days;
    cons.note = scenario.note || null;
    cons.gravitational = scenario.gravitational !== false;
    /* is the change bigger than the noise? */
    if (base && base.siderealError != null && cons.sidereal != null) {
      var change = Math.abs(cons.sidereal - base.sidereal);
      cons.changeDays = change;
      cons.noiseDays = base.siderealError;
      cons.resolvable = change > base.siderealError * 2;
    }
    if (scenario.subNoise) cons.resolvable = false;
    if (scenario.analytic) {
      try { cons.analytic = scenario.analytic(w); } catch (e) {}
    }
    cons.result = res;
    return cons;
  }

  var ABSENT = [
    { what: "Tides raised on the bodies themselves",
      why: "every body here is a point mass, so there is no tidal bulge and " +
           "therefore no tidal braking — which is why this simulator will " +
           "report the Moon's orbit as stable for ten thousand years while " +
           "the real Moon recedes four centimetres a year. The mechanism that " +
           "does that is not in here" },
    { what: "The Roche limit as a physical event",
      why: "a point mass cannot be pulled apart. The Roche scenario puts the " +
           "Moon where a real one would disintegrate and then shows it " +
           "orbiting peacefully, which is the model's limit and not a result" },
    { what: "Spin-orbit coupling, and the Moon's stabilising of the tilt",
      why: "the Earth's rotation is carried as a number here, not as an " +
           "angular momentum the integrator acts on. The often-repeated claim " +
           "that losing the Moon would let the Earth's axis wander is about " +
           "exactly that coupling, so this simulator can report what a given " +
           "tilt would mean but cannot tell you whether the tilt would change" },
    { what: "Relativity",
      why: "Newtonian gravity throughout. For Mercury over a century this is " +
           "wrong by an arcminute or so; for the Earth and Moon over the spans " +
           "here it is far below everything else" },
    { what: "Anything about climate, life or weather",
      why: "a tilt of forty-five degrees would change the seasons, and what " +
           "that would do to a planet is a question for a different science " +
           "than this one. The page reports the geometry and stops" }
  ];

  window.SimScenarios = {
    SCENARIOS: SCENARIOS, byId: byId, simulate: simulate, worldFor: worldFor,
    consequences: consequences, jyotisha: jyotisha, ABSENT: ABSENT,
    tideRatio: tideRatio, angularMin: angularMin,
    groups: function () {
      var g = [];
      SCENARIOS.forEach(function (s) { if (g.indexOf(s.group) < 0) g.push(s.group); });
      return g;
    }
  };
})();
