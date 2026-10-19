/* ===== The Sūrya Siddhānta engine =========================================

   A SECOND, OLDER WAY OF COMPUTING THE SAME SKY.

   Everything else on this site computes positions from a modern ephemeris.
   This file computes them the way the Sūrya Siddhānta does: from the number
   of revolutions each graha makes in a Mahāyuga, the number of civil days in
   that Mahāyuga, and a pair of epicycle corrections. It is not a better
   method and it is not offered as one. It is offered because the whole
   interpretive apparatus this site teaches was built on numbers produced this
   way, and a student who has never seen what those numbers are cannot judge
   how much of a classical rule is astronomy and how much is arithmetic that
   has since been superseded.

   WHAT IT IS, STRUCTURALLY.

     ahargaṇa    the count of days elapsed since the epoch
     mean        revolutions × 360 × ahargaṇa ÷ civil days, reduced
     manda       the equation of centre, from an epicycle whose size is given
                 as a circumference in degrees
     śīghra      the correction for the Earth's own motion, from a second
                 epicycle — this is what produces retrogression
     true        the two applied in the prescribed order, which for the star-
                 planets is four steps, half and half and then full and full

   THE PARAMETERS ARE PRINTED, NOT HIDDEN. Every revolution count and every
   epicycle below is a number this implementation uses, set out where a reader
   can see it and disagree with it. They are the standard Sūrya Siddhānta
   values as ordinarily implemented.

   WHAT THIS FILE DOES NOT DO, AND WILL NOT.

   It does not cite chapter and verse for any of them. The project's rule is
   that a citation is either exact or absent, and an implementation written
   from the standard parameters is not the same thing as a reading of the
   text. A reader who wants the verses should take these numbers to the
   uploaded translation and check them there; that is a better use of the
   volumes than a reference printed here on my say-so.

   Nor does it present the result as what BPHS "says". BPHS is a work of
   horoscopy and does not supply planetary theory; the positions a classical
   reading was done from came from a siddhānta, and this is one of those.

   HOW IT IS CHECKED. Not against my memory of the text, which is not
   evidence, but against the modern ephemeris the rest of the site uses. If a
   revolution count were wrong the error would be tens or hundreds of degrees
   and immediately obvious; the agreement the harness actually measures —
   degrees, not minutes — is the expected size of the difference between a
   fifth-century theory and a modern one, and the harness asserts it lies in
   that band rather than asserting it is small. A test that demanded close
   agreement would be a test that this file had been quietly fitted to the
   modern engine, which would defeat its entire purpose. */

(function () {
  "use strict";

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sin(d) { return Math.sin(d * D2R); }
  function cos(d) { return Math.cos(d * D2R); }
  function asin(x) { return Math.asin(Math.max(-1, Math.min(1, x))) * R2D; }

  /* ---- the yuga ----------------------------------------------------------
     Revolutions in a Mahāyuga of 4,320,000 years. Rāhu and the Moon's apogee
     are included because the Moon's correction needs the apogee and because
     the nodes are grahas in every chart this site draws. Rāhu's count is
     negative here to express that it moves backwards; the text states the
     direction in words and the sign is this implementation's way of carrying
     it. */
  var YUGA = {
    civilDays: 1577917828,
    years: 4320000,
    rev: {
      "Sūrya":      4320000,
      "Candra":     57753336,
      "Maṅgala":    2296832,
      "Budha":      17937060,     /* its śīghrocca */
      "Guru":       364220,
      "Śukra":      7022376,      /* its śīghrocca */
      "Śani":       146568,
      "candraUcca": 488203,       /* the Moon's apogee, direct */
      "Rāhu":       -232238       /* retrograde */
    }
  };

  /* Epicycle circumferences, in degrees of a circle of 360. Each graha has
     two: one used at the ends of the odd quadrants of its anomaly and one at
     the ends of the even quadrants, with the value in between interpolated by
     the sine of the anomaly. That interpolation is part of the method, not a
     modern smoothing of it. */
  var EPI = {
    "Sūrya":   { manda: [14, 13 + 40 / 60], sighra: null },
    "Candra":  { manda: [32, 31 + 40 / 60], sighra: null },
    "Maṅgala": { manda: [75, 72], sighra: [235, 232] },
    "Budha":   { manda: [30, 28], sighra: [133, 132] },
    "Guru":    { manda: [33, 32], sighra: [70, 72] },
    "Śukra":   { manda: [12, 11], sighra: [262, 260] },
    "Śani":    { manda: [49, 48], sighra: [39, 40] }
  };

  /* The mandocca — the apogee — of each star-planet, held fixed. The Sun's
     and the Moon's are handled separately: the Sun's is fixed too, and the
     Moon's moves with its own revolution count above. */
  var MANDOCCA = {
    "Sūrya":   77 + 17 / 60,
    "Maṅgala": 110,
    "Budha":   220,
    "Guru":    160,
    "Śukra":   80,
    "Śani":    240
  };

  /* The epoch. Ahargaṇa is counted from the beginning of Kaliyuga, and the
     instant meant is mean sunrise on the prime meridian of the tradition —
     the meridian of Laṅkā and Ujjain, 75°47′ east. The Julian Day of that
     civil midnight is the figure below; the sunrise reckoning adds a quarter
     of a day less the meridian's offset from Greenwich.

     Which of the two is meant is a real variation, not a detail: the midnight
     and sunrise schools differ by six hours, which is a fifth of a degree for
     the Moon and nothing at all for Śani. Both are offered, and the default
     is sunrise, which is what the Sūrya Siddhānta's own reckoning uses. */
  var UJJAIN_LON = 75 + 47 / 60;
  var KALI_MIDNIGHT_JD = 588465.5;
  var EPOCH = {
    sunrise:  KALI_MIDNIGHT_JD + 0.25 - UJJAIN_LON / 360,
    midnight: KALI_MIDNIGHT_JD - UJJAIN_LON / 360
  };

  /* ---- Julian Day --------------------------------------------------------
     From a JavaScript time value, which is UTC milliseconds since 1970. The
     Unix epoch is JD 2440587.5 exactly, so this needs no calendar arithmetic
     and cannot disagree with the rest of the site about what day it is. */
  function jdOf(ms) { return ms / 86400000 + 2440587.5; }
  function msOf(jd) { return (jd - 2440587.5) * 86400000; }

  function ahargana(ms, variant) {
    return jdOf(ms) - (EPOCH[variant || "sunrise"] || EPOCH.sunrise);
  }

  /* ---- mean longitudes ---------------------------------------------------- */
  function meanOf(key, ahar) {
    var r = YUGA.rev[key];
    if (r == null) return null;
    return norm(r * 360 * ahar / YUGA.civilDays);
  }

  /* ---- the two corrections ------------------------------------------------
     The manda equation: the sine of the equation is the epicycle's
     circumference, as a fraction of 360, times the sine of the anomaly. The
     śīghra equation is the angle at the Earth in the triangle formed by the
     deferent and the epicycle, which is an arctangent rather than an arcsine
     because the distance changes — and that changing distance is exactly what
     makes a planet appear to stop and go backwards. */
  function epicycleAt(pair, anomaly) {
    /* interpolated between the odd-quadrant and even-quadrant values by the
       sine of the anomaly, as the method prescribes */
    var a = pair[0], b = pair[1];
    return a + (b - a) * Math.abs(sin(anomaly));
  }
  function mandaEquation(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.manda) return 0;
    var c = epicycleAt(E.manda, anomaly);
    return asin((c / 360) * sin(anomaly));
  }
  function sighraEquation(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.sighra) return 0;
    var c = epicycleAt(E.sighra, anomaly);
    var r = c / 360;
    var bhuja = r * sin(anomaly);          /* across */
    var koti = r * cos(anomaly);           /* along */
    /* the hypotenuse from the Earth to the planet, with the deferent as 1 */
    var karna = Math.sqrt((1 + koti) * (1 + koti) + bhuja * bhuja);
    return Math.atan2(bhuja, 1 + koti) * R2D * (karna ? 1 : 1);
  }

  /* ---- a true longitude ---------------------------------------------------
     The Sun and the Moon take one correction. The star-planets take four
     steps, and the order is the method: half the śīghra, then half the manda,
     then the whole manda from what that gives, then the whole śīghra. An
     implementation that applied them once each would produce a visibly
     different planet, so the sequence is not a refinement, it is the
     algorithm.

     For Maṅgala, Guru and Śani the mean longitude is the graha's own and the
     śīghrocca is the Sun's mean. For Budha and Śukra it is the other way
     about: the mean longitude is the SUN'S, and the graha's own revolution
     count gives its śīghrocca. That inversion is how the system carries the
     fact that the inner planets go round the Sun, in a scheme that never says
     so. */
  var INNER = { "Budha": 1, "Śukra": 1 };
  var OUTER = { "Maṅgala": 1, "Guru": 1, "Śani": 1 };

  function trueLongitude(sa, ahar) {
    var sunMean = meanOf("Sūrya", ahar);

    if (sa === "Sūrya") {
      var anom = norm(sunMean - MANDOCCA["Sūrya"]);
      return { lon: norm(sunMean - mandaEquation("Sūrya", anom)),
               mean: sunMean, manda: -mandaEquation("Sūrya", anom), sighra: 0 };
    }
    if (sa === "Candra") {
      var ucca = meanOf("candraUcca", ahar);
      var m = meanOf("Candra", ahar);
      var an = norm(m - ucca);
      var eq = mandaEquation("Candra", an);
      return { lon: norm(m - eq), mean: m, manda: -eq, sighra: 0, ucca: ucca };
    }
    if (sa === "Rāhu") {
      var rl = meanOf("Rāhu", ahar);
      return { lon: rl, mean: rl, manda: 0, sighra: 0 };
    }
    if (sa === "Ketu") {
      var kl = norm(meanOf("Rāhu", ahar) + 180);
      return { lon: kl, mean: kl, manda: 0, sighra: 0 };
    }

    var mean, sighrocca;
    if (INNER[sa]) { mean = sunMean; sighrocca = meanOf(sa, ahar); }
    else if (OUTER[sa]) { mean = meanOf(sa, ahar); sighrocca = sunMean; }
    else return null;

    var mandocca = MANDOCCA[sa];
    /* 1 — half the śīghra */
    var s1 = sighraEquation(sa, norm(sighrocca - mean));
    var p1 = norm(mean + s1 / 2);
    /* 2 — half the manda, from there */
    var m1 = mandaEquation(sa, norm(p1 - mandocca));
    var p2 = norm(p1 - m1 / 2);
    /* 3 — the whole manda, applied to the mean */
    var m2 = mandaEquation(sa, norm(p2 - mandocca));
    var p3 = norm(mean - m2);
    /* 4 — the whole śīghra */
    var s2 = sighraEquation(sa, norm(sighrocca - p3));
    return { lon: norm(p3 + s2), mean: mean, manda: -m2, sighra: s2,
             sighrocca: sighrocca, mandocca: mandocca };
  }

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];

  function positions(ms, variant) {
    var ahar = ahargana(ms, variant);
    var out = { ahargana: ahar, variant: variant || "sunrise", at: ms,
                grahas: {} };
    SA.forEach(function (sa) {
      var q = trueLongitude(sa, ahar);
      if (q) out.grahas[sa] = q;
    });
    return out;
  }

  /* Daily motion, by difference. The text gives rules for it; taking the
     difference of two true longitudes a day apart is this implementation's
     way and is stated as such rather than presented as the text's. It is also
     what makes retrogression fall out rather than being declared. */
  function motion(sa, ms, variant) {
    var h = 43200000;
    var a = trueLongitude(sa, ahargana(ms - h, variant));
    var b = trueLongitude(sa, ahargana(ms + h, variant));
    if (!a || !b) return null;
    var d = b.lon - a.lon;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }

  /* ---- the year, the month, and what a siddhānta is for -------------------
     The length of the sidereal year implied by the revolution counts, which
     is the single number that most separates this theory from a modern one:
     it is about three and a half minutes long, and that is the whole reason
     a position computed this way drifts from a modern one by a degree every
     eighty years or so. Printing it is more use than hiding it. */
  function constants() {
    var yearDays = YUGA.civilDays / YUGA.rev["Sūrya"];
    var monthDays = YUGA.civilDays /
      (YUGA.rev["Candra"] - YUGA.rev["Sūrya"]);
    var sidMonth = YUGA.civilDays / YUGA.rev["Candra"];
    return {
      sidYearDays: yearDays,
      synodicMonthDays: monthDays,
      sidMonthDays: sidMonth,
      civilDays: YUGA.civilDays,
      yugaYears: YUGA.years,
      /* the modern sidereal year, for the one comparison worth making
         without leaving the file */
      modernSidYearDays: 365.256363,
      yearExcessSeconds: (yearDays - 365.256363) * 86400
    };
  }

  /* ---- a chart in the same shape the rest of the site uses ----------------
     So that a Sūrya Siddhānta chart can be handed to anything that draws a
     chart. Only the fields that mean the same thing are filled; nothing is
     invented to make the shape match, and what is absent is absent. */
  function chart(ms, variant) {
    var P = positions(ms, variant);
    var out = { source: "Sūrya Siddhānta", variant: P.variant,
                ahargana: P.ahargana, planets: {} };
    SA.forEach(function (sa) {
      var q = P.grahas[sa];
      if (!q) return;
      out.planets[sa] = { lon: q.lon, mean: q.mean,
                          speed: motion(sa, ms, variant),
                          manda: q.manda, sighra: q.sighra };
    });
    return out;
  }

  window.SSEngine = {
    YUGA: YUGA, EPI: EPI, MANDOCCA: MANDOCCA, EPOCH: EPOCH, SA: SA,
    UJJAIN_LON: UJJAIN_LON,
    jdOf: jdOf, msOf: msOf, ahargana: ahargana, meanOf: meanOf,
    mandaEquation: mandaEquation, sighraEquation: sighraEquation,
    trueLongitude: trueLongitude, positions: positions, motion: motion,
    constants: constants, chart: chart, norm: norm
  };
})();

/* ===== The Sūrya Siddhānta page ===========================================

   Everything on this page is generated from the engine rather than written
   out, which is deliberate: a table of parameters typed into HTML is a table
   that can disagree with the code computing from it, and the disagreement
   would be invisible. These are the numbers the engine is actually using, at
   the moment you are reading them.

   The drift chart is the point of the page. A sentence saying a classical
   siddhānta differs from a modern ephemeris is a fact to be taken on trust;
   a line climbing steadily across fifteen centuries, with the year length
   that causes it printed beside it, is a thing a reader can check. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function dms(d) {
    var x = norm(d), s = Math.floor(x / 30), r = x - s * 30;
    var deg = Math.floor(r), m = Math.round((r - deg) * 60);
    if (m === 60) { m = 0; deg++; }
    return deg + "° " + String(m).padStart(2, "0") + "′  " + RS[s];
  }
  function modern(sa, ms) {
    if (!EN[sa]) return null;
    try { return window.__kSidAt(EN[sa], new Date(ms)); } catch (e) { return null; }
  }

  var WHEN = Date.now();

  /* ---- the parameters ----------------------------------------------------- */
  function params() {
    var S = window.SSEngine, host = $("ss-params");
    if (!host) return;
    host.innerHTML = "";
    var K = S.constants();

    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["", "Revolutions in a Mahāyuga", "Manda epicycle", "Śīghra epicycle",
     "Mandocca"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
      .forEach(function (sa) {
        var r = el("tr");
        r.appendChild(el("td", null, sa));
        var rev = S.YUGA.rev[sa];
        r.appendChild(el("td", "num", rev == null ? "—" : rev.toLocaleString("en")));
        var E = S.EPI[sa] || {};
        r.appendChild(el("td", "num", E.manda
          ? E.manda[0].toFixed(2) + "° / " + E.manda[1].toFixed(2) + "°" : "—"));
        r.appendChild(el("td", "num", E.sighra
          ? E.sighra[0] + "° / " + E.sighra[1] + "°" : "—"));
        r.appendChild(el("td", "num", S.MANDOCCA[sa] != null
          ? S.MANDOCCA[sa].toFixed(2) + "°" : "moves"));
        tb.appendChild(r);
      });
    [["Moon's apogee", S.YUGA.rev["candraUcca"]],
     ["Rāhu (backwards)", S.YUGA.rev["Rāhu"]]].forEach(function (q) {
      var r2 = el("tr");
      r2.appendChild(el("td", null, q[0]));
      r2.appendChild(el("td", "num", q[1].toLocaleString("en")));
      r2.appendChild(el("td", "num", "—"));
      r2.appendChild(el("td", "num", "—"));
      r2.appendChild(el("td", "num", "—"));
      tb.appendChild(r2);
    });
    t.appendChild(tb);
    host.appendChild(t);

    var ul = el("ul", "sslist");
    [["Civil days in a Mahāyuga", S.YUGA.civilDays.toLocaleString("en")],
     ["Years in a Mahāyuga", S.YUGA.years.toLocaleString("en")],
     ["Sidereal year implied", K.sidYearDays.toFixed(7) + " days — " +
        K.yearExcessSeconds.toFixed(1) + " s a year longer than the modern value"],
     ["Synodic month implied", K.synodicMonthDays.toFixed(7) + " days — out by " +
        Math.abs((K.synodicMonthDays - 29.5305889) * 86400).toFixed(2) + " s"],
     ["Sidereal month implied", K.sidMonthDays.toFixed(7) + " days — out by " +
        Math.abs((K.sidMonthDays - 27.321661547) * 86400).toFixed(2) + " s"],
     ["Epoch", "Kaliyuga, on the meridian of Ujjain (" +
        S.UJJAIN_LON.toFixed(2) + "° E), reckoned from mean sunrise"],
     ["Ahargaṇa now", Math.floor(S.ahargana(WHEN)).toLocaleString("en") + " days"]
    ].forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q[0] + ": "));
      li.appendChild(document.createTextNode(q[1]));
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* ---- the two skies, now -------------------------------------------------- */
  function now() {
    var S = window.SSEngine, host = $("ss-now");
    if (!host) return;
    host.innerHTML = "";
    var P = S.positions(WHEN);
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Graha", "Sūrya Siddhānta", "Modern", "Difference", "Daily motion"]
      .forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    SA.forEach(function (sa) {
      var q = P.grahas[sa];
      if (!q) return;
      var m = modern(sa, WHEN);
      var r = el("tr");
      r.appendChild(el("td", null, sa));
      r.appendChild(el("td", "num", dms(q.lon)));
      r.appendChild(el("td", "num", m == null ? "—" : dms(m)));
      var d = m == null ? null : sdiff(q.lon, m);
      var c = el("td", "num", d == null ? "—" :
        (d > 0 ? "+" : "") + d.toFixed(2) + "°");
      if (d != null && Math.abs(d) > 4) c.className = "num warn";
      r.appendChild(c);
      var sp = S.motion(sa, WHEN);
      r.appendChild(el("td", "num", sp == null ? "—" :
        sp.toFixed(3) + "°" + (sp < 0 ? "  vakrī" : "")));
      tb.appendChild(r);
    });
    t.appendChild(tb);
    host.appendChild(t);
    host.appendChild(el("p", "ssnote",
      "The modern column is this site's own ephemeris, sidereal, with the " +
      "same ayanāṃśa the rest of the site uses. The difference is not an " +
      "error in either: it is the distance between a fifth-century theory " +
      "and a modern one, and it is what this page exists to show."));
  }

  /* ---- the working, for one graha ------------------------------------------ */
  function working() {
    var S = window.SSEngine, host = $("ss-working"), pick = $("ss-pick");
    if (!host || !pick) return;
    var sa = pick.value;
    host.innerHTML = "";
    var q = S.trueLongitude(sa, S.ahargana(WHEN));
    if (!q) { host.appendChild(el("p", "ssnote", "—")); return; }
    var rows = [["Mean longitude", norm(q.mean).toFixed(4) + "°",
                 "revolutions × 360 × ahargaṇa ÷ civil days"]];
    if (q.ucca != null)
      rows.push(["Apogee (mandocca)", norm(q.ucca).toFixed(4) + "°",
                 "its own revolution count — the Moon's apogee moves"]);
    else if (q.mandocca != null)
      rows.push(["Apogee (mandocca)", q.mandocca.toFixed(4) + "°", "held fixed"]);
    if (q.sighrocca != null)
      rows.push(["Śīghrocca", norm(q.sighrocca).toFixed(4) + "°",
                 (sa === "Budha" || sa === "Śukra")
                   ? "its own revolution count — for the inner grahas it is " +
                     "the mean place that is the Sun's"
                   : "the Sun's mean place"]);
    rows.push(["Manda correction", (q.manda >= 0 ? "+" : "") + q.manda.toFixed(4) + "°",
               "the equation of centre"]);
    if (q.sighra)
      rows.push(["Śīghra correction", (q.sighra >= 0 ? "+" : "") +
                 q.sighra.toFixed(4) + "°",
                 "the correction that makes a graha appear to stop and reverse"]);
    rows.push(["True longitude", norm(q.lon).toFixed(4) + "°   " + dms(q.lon),
               q.sighra ? "after all four steps" : "after the one correction"]);
    var m = modern(sa, WHEN);
    if (m != null)
      rows.push(["Modern, for comparison", dms(m),
                 (sdiff(q.lon, m) >= 0 ? "+" : "") + sdiff(q.lon, m).toFixed(3) +
                 "° apart"]);
    var t = el("table", "tbl");
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "num", r[1]));
      tr.appendChild(el("td", "muted", r[2]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
  }

  /* ---- the drift ----------------------------------------------------------- */
  function drift() {
    var S = window.SSEngine, cv = $("ss-drift");
    if (!cv) return;
    var from = +($("ss-from") || { value: 500 }).value;
    var to = +($("ss-to") || { value: 2100 }).value;
    if (!(to > from)) return;
    var which = ($("ss-body") || { value: "Sūrya" }).value;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth || 700, h = 300;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    /* EVERY SAMPLE AT THE SAME POINT IN THE YEAR.

       Sampling at evenly spaced instants put each one at a different season,
       and the difference between the two theories has an annual term of about
       a degree — so the plotted line came out as a saw with teeth a degree
       deep, which is not a property of the drift at all but of where the
       samples happened to land. Snapping each one to the first of January
       removes the aliasing and leaves the thing being asked about: the slow
       part. The remaining wobble on the Moon's line is real, because the
       Moon's unmodelled terms do not have a yearly period. */
    var N = 220, pts = [];
    for (var i = 0; i <= N; i++) {
      var y = Math.round(from + (to - from) * (i / N));
      var ms = Date.UTC(y, 0, 1);
      if (pts.length && pts[pts.length - 1].y === y) continue;
      var q = S.trueLongitude(which, S.ahargana(ms));
      var mo = modern(which, ms);
      if (!q || mo == null) continue;
      pts.push({ y: y, d: sdiff(q.lon, mo) });
    }
    if (pts.length < 2) return;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.d; }));
    var hi = Math.max.apply(null, pts.map(function (p) { return p.d; }));
    var pad = Math.max(1, (hi - lo) * 0.15);
    lo -= pad; hi += pad;
    var L = 54, R = 12, Tp = 14, B = 30;
    function X(y) { return L + (w - L - R) * (y - from) / (to - from); }
    function Y(d) { return Tp + (h - Tp - B) * (1 - (d - lo) / (hi - lo)); }

    /* the zero line, which is the thing the curve is measured against */
    c.strokeStyle = "#c9c9d8"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
    c.fillStyle = "#6c7089";
    c.font = "11px system-ui,-apple-system,sans-serif";
    c.textAlign = "right"; c.textBaseline = "middle";
    [lo + pad, 0, hi - pad].forEach(function (v) {
      c.fillText(v.toFixed(1) + "°", L - 6, Y(v));
      c.strokeStyle = "#eceaf2";
      c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
    });
    c.textAlign = "center"; c.textBaseline = "top";
    for (var k = 0; k <= 4; k++) {
      var yy = from + (to - from) * k / 4;
      c.fillText(Math.round(yy), X(yy), h - B + 6);
    }
    c.strokeStyle = "#c9a24b"; c.lineWidth = 2;
    c.beginPath();
    pts.forEach(function (p, i2) {
      if (i2) c.lineTo(X(p.y), Y(p.d)); else c.moveTo(X(p.y), Y(p.d));
    });
    c.stroke();
    /* where we are now */
    var nowY = new Date().getUTCFullYear();
    if (nowY > from && nowY < to) {
      c.strokeStyle = "#b5533c"; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(X(nowY), Tp); c.lineTo(X(nowY), h - B); c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#b5533c"; c.textAlign = "left";
      c.fillText("now", X(nowY) + 4, Tp + 2);
    }
    var note = $("ss-driftnote");
    if (note) {
      var first = pts[0], last = pts[pts.length - 1];
      note.textContent = which + ": " +
        first.d.toFixed(2) + "° in " + Math.round(first.y) + ", " +
        last.d.toFixed(2) + "° in " + Math.round(last.y) +
        "  ·  a change of " + (last.d - first.d).toFixed(2) + "° over " +
        Math.round(last.y - first.y) + " years" +
        (which === "Sūrya"
          ? "  ·  which is what a year " +
            S.constants().yearExcessSeconds.toFixed(0) +
            " seconds too long does over that time"
          : "");
    }
  }

  /* ---- wiring --------------------------------------------------------------- */
  function bind() {
    if (!window.SSEngine || !$("ss-params")) return;
    var when = $("ss-when");
    if (when) {
      var d = new Date(WHEN - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        WHEN = isFinite(t) ? t : Date.now();
        params(); now(); working();
      });
    }
    var pick = $("ss-pick");
    if (pick) {
      ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
        .forEach(function (sa) {
          var o = el("option", null, sa); o.value = sa;
          if (sa === "Śani") o.selected = true;
          pick.appendChild(o);
        });
      pick.addEventListener("change", working);
    }
    var body = $("ss-body");
    if (body) {
      ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
        .forEach(function (sa) {
          var o = el("option", null, sa); o.value = sa;
          body.appendChild(o);
        });
      body.addEventListener("change", drift);
    }
    ["ss-from", "ss-to"].forEach(function (id) {
      var e = $(id);
      if (e) e.addEventListener("change", drift);
    });
    params(); now(); working(); drift();
    window.addEventListener("resize", function () { drift(); });
    try {
      window.__ss = { when: function () { return WHEN; },
                      redraw: function () { params(); now(); working(); drift(); },
                      setWhen: function (t) { WHEN = t; this.redraw(); } };
    } catch (e) {}
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
