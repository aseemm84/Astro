/* ===== The Sūrya Siddhānta engine =========================================

   A SECOND, OLDER WAY OF COMPUTING THE SAME SKY — and now a reasonably
   complete one. The first version of this file computed mean places and
   corrected them to true places, which is the first third of what a
   siddhānta is for. A siddhānta is a working astronomy: it has to tell you
   where a graha is, how far north or south of the ecliptic, when the Sun
   rises where you are standing, what the tithi is, how big the Moon looks,
   whether it will be eclipsed, and whether a graha is near enough to the Sun
   to be invisible. All of that is here now.

   WHAT IS DISTINCTIVE ABOUT THIS IMPLEMENTATION.

   IT COMPUTES WITH THE TEXT'S OWN TRIGONOMETRY. The Sūrya Siddhānta does not
   have a sine function; it has a TABLE of twenty-four sines of a circle whose
   radius is 3438 — the number of minutes in a radian, which is why that
   radius and not another — tabulated every 3°45′, with linear interpolation
   between entries and an inverse read backwards through the same table for
   arcs. Computing the equations with Math.sin would give the answers a modern
   reader expects from the method and NOT the answers the method gives. Both
   are offered; the table is the default, and the difference between them is
   itself a quantity this engine will report, because the granularity of that
   table is part of what a classical position IS.

   IT SEPARATES WHAT THE PARAMETERS SAY FROM WHAT I SAY. Every revolution
   count, epicycle, inclination, node, diameter and visibility arc is set out
   as data at the top of its section, where a reader can see it and disagree.
   None of it is attributed to a verse. The project's rule is that a citation
   is either exact or absent, and an implementation written from standard
   parameters is not a reading of the text.

   IT IS CHECKED BY CONSEQUENCE, NOT BY ASSERTION. Several of the tables here
   are things I could get wrong. So each is checked against something it must
   produce and that is independently known: the sine table against the sine
   function; the epoch against the day of the week; the rising times of the
   signs against the obliquity they are supposed to encode; the orbital
   inclinations against the latitudes planets are actually seen to reach; the
   eclipse machinery against eclipses that actually happened. A parameter that
   is wrong does not produce a slightly different answer here. It produces an
   answer that fails one of those.

   WHAT IS DELIBERATELY ABSENT is listed in ABSENT at the foot of the file,
   each with its reason, and the page prints it. */

(function () {
  "use strict";

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var DAY = 86400000;
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* =======================================================================
     1 — THE TRIGONOMETRY OF THE TEXT
     ======================================================================= */

  /* The radius. Not a free choice: 3438 is the number of minutes of arc in a
     radian to four figures, so an arc in minutes and its sine in these units
     are the same number for small angles, and the whole table can be used
     without ever dividing by R. */
  var RAD = 3438;
  var STEP = 3.75;                       /* 225 minutes — a twenty-fourth of 90° */

  /* The twenty-four sines. Each entry is the sine of n × 3°45′ in units of
     the radius above. These are the standard values; the harness asserts each
     one is within a unit of 3438·sin(n·3°45′), which is a check the table
     either passes or fails outright — there is no way for a mistyped entry to
     survive it. */
  var JYA = [0, 225, 449, 671, 890, 1105, 1315, 1520, 1719, 1910, 2093, 2267,
             2431, 2585, 2728, 2859, 2978, 3084, 3177, 3256, 3321, 3372,
             3409, 3431, 3438];

  var OPT = {
    /* "table" computes the way the text does; "exact" uses the modern
       functions in the same formulas, so the ONLY difference between them is
       the granularity of the table above */
    sines: "table",
    /* the precession model — see section 6 */
    ayana: "libration",
    /* a bīja correction to the revolution counts, if one is supplied */
    bija: null
  };

  /* jyā of an angle in degrees, in units of RAD. Linear interpolation inside
     the tabulated interval, which is what the text prescribes — not a better
     interpolation, because a better one would be a different method. */
  function jyaTable(deg) {
    var a = norm(deg);
    var sign = 1;
    if (a > 180) { a -= 180; sign = -1; }
    if (a > 90) a = 180 - a;
    var i = a / STEP;
    var k = Math.floor(i);
    if (k >= 24) return sign * JYA[24];
    var f = i - k;
    return sign * (JYA[k] + (JYA[k + 1] - JYA[k]) * f);
  }
  function jya(deg) {
    return OPT.sines === "exact" ? RAD * Math.sin(deg * D2R) : jyaTable(deg);
  }
  function kojya(deg) { return jya(deg + 90); }

  /* The arc whose jyā is the given value — read backwards through the same
     table, interval by interval, which is how the text inverts it. */
  function arcJyaTable(v) {
    var sign = v < 0 ? -1 : 1, x = Math.abs(v);
    if (x >= JYA[24]) return sign * 90;
    for (var k = 0; k < 24; k++) {
      if (x <= JYA[k + 1]) {
        var span = JYA[k + 1] - JYA[k];
        var f = span === 0 ? 0 : (x - JYA[k]) / span;
        return sign * (k + f) * STEP;
      }
    }
    return sign * 90;
  }
  function arcJya(v) {
    return OPT.sines === "exact"
      ? Math.asin(clamp(v / RAD, -1, 1)) * R2D
      : arcJyaTable(v);
  }

  /* =======================================================================
     2 — THE STRUCTURE OF TIME
     ======================================================================= */

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
  /* The larger frame the text sets the Mahāyuga inside. A Kalpa is a thousand
     Mahāyugas with fourteen Manus, each of seventy-one Mahāyugas, and a
     sandhi of one Kṛtayuga before the first Manu and between each pair. The
     arithmetic below is the text's own and is checked by the harness: the
     parts have to add up to the whole. */
  var KALPA = {
    mahayugas: 1000,
    manus: 14,
    mahayugasPerManu: 71,
    /* a Kṛtayuga is four tenths of a Mahāyuga; the sandhis are 15 of them */
    sandhiMahayugas: 15 * 0.4,
    years: 1000 * 4320000
  };
  /* The four yugas of a Mahāyuga, in the 4:3:2:1 proportion the text gives. */
  var YUGAS = [
    { name: "Kṛta", part: 4 / 10 }, { name: "Tretā", part: 3 / 10 },
    { name: "Dvāpara", part: 2 / 10 }, { name: "Kali", part: 1 / 10 }
  ];

  /* The meridian of the tradition, and the epoch on it. */
  var UJJAIN_LON = 75 + 47 / 60;
  var KALI_MIDNIGHT_JD = 588465.5;
  var EPOCH = {
    sunrise:  KALI_MIDNIGHT_JD + 0.25 - UJJAIN_LON / 360,
    midnight: KALI_MIDNIGHT_JD - UJJAIN_LON / 360
  };

  function jdOf(ms) { return ms / 86400000 + 2440587.5; }
  function msOf(jd) { return (jd - 2440587.5) * 86400000; }

  function ahargana(ms, variant) {
    return jdOf(ms) - (EPOCH[variant || "sunrise"] || EPOCH.sunrise);
  }
  /* Elapsed years of the current Kali, and where we stand in the larger
     scheme. Printing these is most of what a reader wants from the kalpa
     arithmetic, and all of it is derived rather than stated. */
  /* Where this moment stands in the scheme the text sets out. The elapsed
     years of the Kalpa at the start of Kali come out of the structure rather
     than being quoted: an opening sandhi, six whole Manus each with a sandhi
     after it, twenty-seven Mahāyugas of the seventh Manu, and the first three
     yugas of the twenty-eighth. The harness checks the total against the
     traditional figure, which is a check on the structure above and not on my
     arithmetic. */
  function era(ms) {
    var K = ahargana(ms, "sunrise");
    var yearDays = YUGA.civilDays / revOf("Sūrya");
    var kaliYears = K / yearDays;
    var MY = YUGA.years;                       /* years in a Mahāyuga */
    var sandhi = 0.4 * MY;                     /* a Kṛtayuga */
    var beforeKali =
      sandhi +                                 /* the opening sandhi */
      6 * (KALPA.mahayugasPerManu * MY + sandhi) +   /* six whole Manus */
      27 * MY +                                /* of the seventh Manu */
      0.9 * MY;                                /* Kṛta, Tretā, Dvāpara */
    return {
      ahargana: K,
      kaliYears: kaliYears,
      kaliElapsed: Math.floor(kaliYears),
      yugaName: "Kali",
      manu: 7,
      mahayugaInManu: 28,
      kalpaYearsAtKaliStart: beforeKali,
      kalpaYears: beforeKali + kaliYears,
      kalpaFraction: (beforeKali + kaliYears) / KALPA.years
    };
  }

  /* THE DAY OF THE WEEK, which is the strongest single check on the epoch
     that exists. The week has run unbroken since long before the epoch, so if
     the ahargaṇa is right then ahargaṇa modulo seven names today correctly,
     and if it is off by a day then it names yesterday — a failure no amount
     of agreement in longitude would reveal. The Kali epoch fell on a Friday,
     and that is the only fact this needs. */
  var VARA = ["Ravi", "Soma", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var VARA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday"];
  function vara(ms, place) {
    /* the civil day begins at sunrise, so the weekday belongs to the sunrise
       that precedes the instant, not to midnight */
    var a = ahargana(ms, "sunrise");
    if (place) a += (place.lon - UJJAIN_LON) / 360;
    var n = Math.floor(a);
    var i = ((n + 5) % 7 + 7) % 7;       /* 5 = Friday, counting Sunday as 0 */
    return { i: i, name: VARA[i], english: VARA_EN[i], lord: VARA[i] };
  }

  /* =======================================================================
     3 — MEAN PLACES, AND THE FOUR CORRECTIONS TO THE TIME
     ======================================================================= */

  /* A revolution count, with a bīja applied if one has been supplied. The
     mechanism is here because later astronomers corrected these numbers and
     a reader may want to try one; no bīja is shipped, because the ones in
     circulation differ and I will not pick between them silently. */
  function revOf(key) {
    var r = YUGA.rev[key];
    if (r == null) return null;
    if (OPT.bija && OPT.bija[key] != null) r += OPT.bija[key];
    return r;
  }
  /* WHERE EACH GRAHA STOOD AT THE EPOCH. The point of the Kali epoch in this
     system is that the grahas were together at the start of Meṣa, so almost
     every one of them starts from zero and needs no entry here. The node does
     not: it stood at the opposite point.

     This was missing, and the way it was caught is worth recording, because
     no comparison of longitudes would ever have shown it. Rāhu's longitude
     was never checked against anything — it has no manda, no śīghra and
     nothing to disagree with. What gave it away was a CONSEQUENCE: the Moon's
     latitude, computed from this node, came out anti-correlated with the real
     Moon's latitude at −0.987. Not wrong by a degree. Upside down. A graha
     north of the ecliptic when it was south, every time, for sixty days.

     With the node put where it belongs the SS node sits within two or three
     degrees of the true one after two hundred and seventy-five circuits,
     which is what a draconitic month right to two seconds should give. */
  var EPOCH_LON = { "Rāhu": 180 };
  function meanOf(key, ahar) {
    var r = revOf(key);
    if (r == null) return null;
    return norm((EPOCH_LON[key] || 0) + r * 360 * ahar / YUGA.civilDays);
  }
  function dailyMotion(key) {
    var r = revOf(key);
    return r == null ? null : r * 360 / YUGA.civilDays;
  }

  /* DEŚĀNTARA — the correction for being east or west of the meridian of the
     tradition. A place an hour east sees every mean place an hour further on,
     and ignoring it is an error of half a degree in the Moon, which is more
     than enough to change a tithi at its boundary. */
  function desantara(place) {
    if (!place || place.lon == null) return 0;
    return (place.lon - UJJAIN_LON) / 360;      /* in days */
  }

  /* THE EQUATION OF TIME, which the text reaches in two named pieces rather
     than as one quantity.

       BHUJĀNTARA  the Sun's own equation of centre, expressed as time: the
                   Sun does not move uniformly along the ecliptic, so true
                   noon is not mean noon.
       UDAYĀNTARA  the obliquity's share: even a Sun moving uniformly along
                   the ecliptic does not move uniformly in right ascension,
                   which is what a clock follows.

     Their sum is the equation of time, and the sum is what sunrise needs.
     Keeping the two apart is not pedantry — they have different periods, one
     annual and one semi-annual, and a reader who has seen them separately
     understands the shape of the combined curve rather than memorising it. */
  function bhujantaraDays(ahar) {
    var sunMean = meanOf("Sūrya", ahar);
    var q = trueLongitude("Sūrya", ahar);
    return sdiff(sunMean, q.lon) / 360;
  }
  function udayantaraDays(trueSun) {
    return sdiff(trueSun, raOfLongitude(trueSun)) / 360;
  }
  function equationOfTime(ahar) {
    var q = trueLongitude("Sūrya", ahar);
    return bhujantaraDays(ahar) + udayantaraDays(q.lon);
  }

  /* =======================================================================
     4 — THE EQUATIONS
     ======================================================================= */

  var EPI = {
    "Sūrya":   { manda: [14, 13 + 40 / 60], sighra: null },
    "Candra":  { manda: [32, 31 + 40 / 60], sighra: null },
    "Maṅgala": { manda: [75, 72], sighra: [235, 232] },
    "Budha":   { manda: [30, 28], sighra: [133, 132] },
    "Guru":    { manda: [33, 32], sighra: [70, 72] },
    "Śukra":   { manda: [12, 11], sighra: [262, 260] },
    "Śani":    { manda: [49, 48], sighra: [39, 40] }
  };
  var MANDOCCA = {
    "Sūrya":   77 + 17 / 60,
    "Maṅgala": 110,
    "Budha":   220,
    "Guru":    160,
    "Śukra":   80,
    "Śani":    240
  };

  /* The epicycle at a given anomaly: interpolated between the odd-quadrant
     and even-quadrant circumferences by the jyā of the anomaly. That
     interpolation is part of the method, not a smoothing of it. */
  function epicycleAt(pair, anomaly) {
    var a = pair[0], b = pair[1];
    return a + (b - a) * Math.abs(jya(anomaly)) / RAD;
  }
  function mandaEquation(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.manda) return 0;
    var c = epicycleAt(E.manda, anomaly);
    var bahu = (c / 360) * jya(anomaly);
    return arcJya(bahu);
  }
  /* The śīghra equation and, with it, the hypotenuse — which is needed again
     later for the latitude and for the apparent diameters, so it is returned
     rather than thrown away. */
  function sighraFull(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.sighra) return { eq: 0, karna: RAD };
    var c = epicycleAt(E.sighra, anomaly);
    var r = c / 360;
    var bahu = r * jya(anomaly);
    var koti = r * kojya(anomaly);
    var karna = Math.sqrt((RAD + koti) * (RAD + koti) + bahu * bahu);
    return { eq: arcJya(bahu * RAD / karna), karna: karna };
  }
  function sighraEquation(sa, anomaly) { return sighraFull(sa, anomaly).eq; }

  var INNER = { "Budha": 1, "Śukra": 1 };
  var OUTER = { "Maṅgala": 1, "Guru": 1, "Śani": 1 };

  function trueLongitude(sa, ahar) {
    var sunMean = meanOf("Sūrya", ahar);

    if (sa === "Sūrya") {
      var anom = norm(sunMean - MANDOCCA["Sūrya"]);
      var eq = mandaEquation("Sūrya", anom);
      return { lon: norm(sunMean - eq), mean: sunMean, manda: -eq, sighra: 0,
               karna: RAD, anomaly: anom };
    }
    if (sa === "Candra") {
      var ucca = meanOf("candraUcca", ahar);
      var m = meanOf("Candra", ahar);
      var an = norm(m - ucca);
      var eqm = mandaEquation("Candra", an);
      return { lon: norm(m - eqm), mean: m, manda: -eqm, sighra: 0,
               ucca: ucca, karna: RAD, anomaly: an };
    }
    if (sa === "Rāhu") {
      var rl = meanOf("Rāhu", ahar);
      return { lon: rl, mean: rl, manda: 0, sighra: 0, karna: RAD };
    }
    if (sa === "Ketu") {
      var kl = norm(meanOf("Rāhu", ahar) + 180);
      return { lon: kl, mean: kl, manda: 0, sighra: 0, karna: RAD };
    }

    var mean, sighrocca;
    if (INNER[sa]) { mean = sunMean; sighrocca = meanOf(sa, ahar); }
    else if (OUTER[sa]) { mean = meanOf(sa, ahar); sighrocca = sunMean; }
    else return null;

    var mandocca = MANDOCCA[sa];
    var s1 = sighraEquation(sa, norm(sighrocca - mean));
    var p1 = norm(mean + s1 / 2);
    var m1 = mandaEquation(sa, norm(p1 - mandocca));
    var p2 = norm(p1 - m1 / 2);
    var m2 = mandaEquation(sa, norm(p2 - mandocca));
    var p3 = norm(mean - m2);
    var S = sighraFull(sa, norm(sighrocca - p3));
    return { lon: norm(p3 + S.eq), mean: mean, manda: -m2, sighra: S.eq,
             sighrocca: sighrocca, mandocca: mandocca, karna: S.karna,
             anomaly: norm(sighrocca - p3) };
  }

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];

  /* =======================================================================
     5 — LATITUDE
     ======================================================================= */

  /* Each star-planet has a node held at a fixed longitude and an inclination
     given in minutes of arc. The Moon's node moves and comes from its own
     revolution count; its inclination is 270′, which is four and a half
     degrees against the five and an eighth that is actually the case.

     The scaling by the śīghra hypotenuse is what turns a small orbital
     inclination into the large latitude a planet is seen at: near opposition
     the planet is close and the same tilt subtends far more. Mars's orbit is
     inclined a degree and a half and Mars is seen seven degrees from the
     ecliptic, and this is how a geocentric scheme gets that right. */
  var NODE = { "Maṅgala": 40, "Budha": 20, "Guru": 80, "Śukra": 60, "Śani": 100 };
  var INCL = { "Candra": 270, "Maṅgala": 90, "Budha": 120, "Guru": 60,
               "Śukra": 120, "Śani": 120 };     /* minutes of arc */

  function latitudeOf(sa, ahar) {
    if (sa === "Sūrya") return 0;
    if (sa === "Candra") {
      var node = norm(meanOf("Rāhu", ahar));
      var m = trueLongitude("Candra", ahar);
      return (INCL["Candra"] / 60) * (jya(norm(m.lon - node)) / RAD);
    }
    if (sa === "Rāhu" || sa === "Ketu") return 0;
    if (NODE[sa] == null) return null;
    var q = trueLongitude(sa, ahar);
    if (!q) return null;
    /* The argument of latitude is measured from the node to where the planet
       sits ON ITS OWN ORBIT — which for an outer graha is the manda-corrected
       place, before the śīghra correction swings it to where we see it, and
       for an inner one is its śīghrocca, because in this scheme that is the
       quantity carrying the planet's own motion. An earlier version used the
       bare mean place for the outer ones, which cost Maṅgala about a third of
       its latitude at the extremes. */
    var arg = INNER[sa] ? norm(q.sighrocca - NODE[sa])
                        : norm(q.mean + q.manda - NODE[sa]);
    var base = (INCL[sa] / 60) * (jya(arg) / RAD);
    return base * (RAD / q.karna);
  }

  /* =======================================================================
     6 — THE OBLIQUITY, DECLINATION, AND PRECESSION
     ======================================================================= */

  /* The text's obliquity is a round twenty-four degrees. The modern value is
     a third of a degree less and shrinking; the difference shows in every
     declination and therefore in every sunrise this engine computes. */
  var OBLIQUITY = 24;

  /* Declination. On the ecliptic it is the text's own one-liner, through the
     sine table. With a latitude — which the planets have and which an eclipse
     turns on — the latitude's contribution is added as a correction, so the
     table still governs the main term and the correction is exact. */
  function declinationOf(lon, lat) {
    var d0 = arcJya(jya(OBLIQUITY) * jya(lon) / RAD);
    if (!lat) return d0;
    var e = OBLIQUITY * D2R, l = lon * D2R, b = lat * D2R;
    var withLat = Math.asin(clamp(
      Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l),
      -1, 1)) * R2D;
    var withoutLat = Math.asin(clamp(Math.sin(e) * Math.sin(l), -1, 1)) * R2D;
    return d0 + (withLat - withoutLat);
  }

  /* Right ascension at the text's obliquity, used for the rising times of the
     signs and for the udayāntara. */
  function raOfLongitude(lon) {
    var l = norm(lon);
    var a = Math.atan2(Math.sin(l * D2R) * Math.cos(OBLIQUITY * D2R),
                       Math.cos(l * D2R)) * R2D;
    return norm(a);
  }

  /* AYANĀṂŚA. The text describes the circle of asterisms as librating rather
     than precessing steadily, and the amplitude and period in circulation
     differ between manuscripts and between commentators. Two readings are
     offered and neither is called the right one:

       "libration"  an oscillation of ±27°, completing in 7200 years, zero in
                    the year 499 — which is the reading that gives the often
                    quoted 54″ a year at the moment of crossing
       "linear"     a steady 54″ a year from the same zero, which is what the
                    rate alone implies if the libration is ignored

     They agree near the zero point and diverge badly far from it, and the
     divergence is a real feature of the question rather than a defect of the
     code. The harness asserts they agree near 499 and disagree far from it,
     which is the only honest thing to assert about a disputed quantity. */
  var AYANA_ZERO_YEAR = 499;
  var AYANA_AMPLITUDE = 27;
  var AYANA_PERIOD = 7200;
  function yearOf(ms) { return new Date(ms).getUTCFullYear() +
    (new Date(ms).getUTCMonth() + 0.5) / 12; }
  function ayanamsa(ms) {
    if (OPT.ayana === "none") return 0;
    var t = yearOf(ms) - AYANA_ZERO_YEAR;
    if (OPT.ayana === "linear") return t * 54 / 3600;
    return AYANA_AMPLITUDE * Math.sin(2 * Math.PI * t / AYANA_PERIOD);
  }
  /* A tropical longitude from the sidereal one this engine computes. */
  function tropical(lon, ms) { return norm(lon + ayanamsa(ms)); }

  /* =======================================================================
     7 — THE DAY WHERE YOU ARE STANDING
     ======================================================================= */

  /* CARA — the ascensional difference. The quantity that makes a summer day
     long: the Sun's declination, worked against the latitude of the place,
     gives the angle by which sunrise runs early and sunset late. The text
     reaches it through the "earth-sine", which is the same thing expressed as
     a length rather than an angle. */
  function cara(decl, lat) {
    var t = Math.tan(lat * D2R) * Math.tan(decl * D2R);
    if (t >= 1) return 90;                /* the Sun does not set */
    if (t <= -1) return -90;              /* the Sun does not rise */
    return arcJya(RAD * t);
  }
  /* The rising times of the signs at the equator, in asus — a sixth of a
     minute of time, 21600 to the day. They are DERIVED from the obliquity
     rather than tabulated, because the canonical integers are a consequence
     of it and a table would let the two drift apart. The harness checks the
     derived values against the canonical 1670, 1795 and 1935. */
  function risingTimesAtEquator() {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var a0 = raOfLongitude(i * 30), a1 = raOfLongitude((i + 1) * 30);
      var d = norm(a1 - a0);
      out.push(d / 360 * 21600);
    }
    return out;
  }
  /* and at a latitude, the equatorial times less or plus the cara of the end
     points — the text's own way of getting oblique ascension */
  /* The signs here are the SĀYANA signs — the thirty-degree arcs measured
     from the equinox — because that is what a rising time is about. The
     sidereal signs rise in the same times, shifted; the lagna routine does
     the shifting. */
  function risingTimes(lat) {
    var eq = risingTimesAtEquator();
    var ch = [];
    for (var i = 0; i < 12; i++) {
      var d0 = declinationOf((i) * 30), d1 = declinationOf((i + 1) * 30);
      var c0 = cara(d0, lat) / 360 * 21600, c1 = cara(d1, lat) / 360 * 21600;
      ch.push(eq[i] - (c1 - c0));
    }
    return ch;
  }

  /* Sunrise and sunset, as the text gets them: half the day is six hours plus
     or minus the cara. The result is mean local apparent time at the place's
     own meridian, converted here to a time value so it can be compared with
     anything else. */
  function sunriseSunset(ms, place) {
    if (!place || place.lat == null) return null;
    var a = ahargana(ms, "sunrise") + desantara(place);
    var q = trueLongitude("Sūrya", a);
    /* THE FRAME THE DECLINATION IS MEASURED IN.

       Everything this engine computes is sidereal — measured from a fixed
       point among the stars, which is what the whole tradition means by a
       longitude. Declination is not: it is measured from the EQUINOX, and
       the equinox moves. So the declination has to be taken of the sāyana
       longitude, the sidereal one plus the ayanāṃśa.

       An earlier version took it of the sidereal longitude directly. The
       result was a seasonal error with a very recognisable shape: almost
       nothing at the solstices, where declination is flat, and half an hour
       at the equinoxes, where it changes fastest — the signature of a whole
       seasonal curve shifted bodily by twenty-four days. */
    var dec = declinationOf(tropical(q.lon, ms));
    var c = cara(dec, place.lat);
    var halfDay = 6 + c / 15;                       /* hours either side of noon */
    var tzh = place.tz == null ? 0 : place.tz;

    /* THE FRAMES, kept apart on purpose. `E` is the equation of time in
       hours. Local apparent noon happens at local mean time 12:00 − E, and
       local mean time runs ahead of UTC by the place's longitude in hours. So
       the UTC instant of apparent noon on a given LOCAL date is that date's
       UTC midnight plus (12 − E − longitude/15) hours. An earlier version
       mixed a local-midnight instant with a UTC clock time and was out by the
       time zone, which on a phone in Abu Dhabi is four hours. */
    var E = equationOfTime(a) * 24;
    var localDay = Math.floor((ms + tzh * 3600000) / DAY);
    var utcMidnightOfLocalDate = localDay * DAY;
    var noon = utcMidnightOfLocalDate + (12 - E - place.lon / 15) * 3600000;
    return {
      sunrise: noon - halfDay * 3600000,
      sunset:  noon + halfDay * 3600000,
      noon: noon,
      dayHours: halfDay * 2,
      declination: dec,
      cara: c,
      equationOfTimeMinutes: E * 60,
      bhujantaraMinutes: bhujantaraDays(a) * 24 * 60,
      udayantaraMinutes: udayantaraDays(q.lon) * 24 * 60,
      circumpolar: Math.abs(c) >= 90
    };
  }

  /* The lagna — the point of the ecliptic rising. Found by walking the
     oblique ascensions from sunrise, which is how the text does it: so much
     of the first sign remains, then whole signs, then part of the last. */
  function lagna(ms, place) {
    var S = sunriseSunset(ms, place);
    if (!S) return null;
    var a = ahargana(ms, "sunrise") + desantara(place);
    /* the rising times are reckoned from the equinox, so the Sun that walks
       them must be the sāyana one; the lagna is handed back sidereal, which
       is the frame every other longitude on this site is in */
    var sun = tropical(trueLongitude("Sūrya", a).lon, ms);
    var elapsedAsus = (ms - S.sunrise) / DAY * 21600;
    while (elapsedAsus < 0) elapsedAsus += 21600;
    var rt = risingTimes(place.lat);
    /* the part of the Sun's own sign still to rise at sunrise */
    var sIdx = Math.floor(norm(sun) / 30);
    var frac = 1 - (norm(sun) - sIdx * 30) / 30;
    var acc = rt[sIdx] * frac;
    var lon;
    if (elapsedAsus < acc) {
      lon = norm(sun + (elapsedAsus / Math.max(1e-9, rt[sIdx])) * 30);
    } else {
      var rem = elapsedAsus - acc;
      var i = (sIdx + 1) % 12;
      for (var guard = 0; guard < 40; guard++) {
        if (rem < rt[i]) break;
        rem -= rt[i];
        i = (i + 1) % 12;
      }
      lon = norm(i * 30 + (rem / Math.max(1e-9, rt[i])) * 30);
    }
    var sidereal = norm(lon - ayanamsa(ms));
    return { lon: sidereal, tropical: norm(lon),
             sign: Math.floor(sidereal / 30), sunrise: S.sunrise,
             elapsedAsus: elapsedAsus };
  }

  /* =======================================================================
     8 — THE PAÑCĀṄGA, COMPUTED THE OLD WAY
     ======================================================================= */

  var TITHI = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī",
    "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
    "Trayodaśī", "Caturdaśī", "Pūrṇimā"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrva Phalgunī", "Uttara Phalgunī",
    "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
    "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  var YOGA = ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana",
    "Atigaṇḍa", "Sukarman", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva",
    "Vyāghāta", "Harṣaṇa", "Vajra", "Siddhi", "Vyatīpāta", "Varīyān",
    "Parigha", "Śiva", "Siddha", "Sādhya", "Śubha", "Śukla", "Brahman",
    "Indra", "Vaidhṛti"];
  var KARANA_MOV = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija",
    "Viṣṭi"];
  var KARANA_FIX = ["Śakuni", "Catuṣpada", "Nāga", "Kiṃstughna"];

  function panchanga(ms, place) {
    var a = ahargana(ms, "sunrise") + desantara(place);
    var sun = trueLongitude("Sūrya", a).lon;
    var moon = trueLongitude("Candra", a).lon;
    var elong = norm(moon - sun);
    var tIdx = Math.floor(elong / 12);                 /* 0..29 */
    var paksha = tIdx < 15 ? "śukla" : "kṛṣṇa";
    var tName = tIdx === 14 ? "Pūrṇimā"
              : (tIdx === 29 ? "Amāvāsyā" : TITHI[tIdx % 15]);
    var nIdx = Math.floor(norm(moon) / (360 / 27));
    var pada = Math.floor((norm(moon) % (360 / 27)) / (360 / 108)) + 1;
    var yIdx = Math.floor(norm(sun + moon) / (360 / 27));
    /* karaṇa: half-tithis, with four fixed ones at the ends of the month */
    var half = Math.floor(elong / 6);                  /* 0..59 */
    var kName;
    if (half === 0) kName = KARANA_FIX[3];
    else if (half >= 57) kName = KARANA_FIX[half - 57];
    else kName = KARANA_MOV[(half - 1) % 7];
    var V = vara(ms, place);
    return {
      ahargana: a,
      sun: sun, moon: moon, elongation: elong,
      tithi: { n: tIdx + 1, name: tName, paksha: paksha,
               fraction: (elong % 12) / 12 },
      nakshatra: { n: nIdx + 1, name: NAK[nIdx], pada: pada,
                   fraction: (norm(moon) % (360 / 27)) / (360 / 27) },
      yoga: { n: yIdx + 1, name: YOGA[yIdx] },
      karana: { n: half + 1, name: kName },
      vara: V
    };
  }

  /* =======================================================================
     9 — HOW BIG, AND HOW FAR
     ======================================================================= */

  /* Diameters and mean distances in yojanas, the text's own unit. The
     apparent diameter follows the true daily motion: a graha moving fast is
     near and looks big, which is the relation the text uses in place of a
     distance it has no way to measure. */
  var SIZE = {
    earthDiameter: 1600,
    "Sūrya": { diameter: 6500, meanDist: 689377 },
    "Candra": { diameter: 480, meanDist: 51566 }
  };
  function meanDailyMotion(sa) {
    if (sa === "Sūrya") return dailyMotion("Sūrya");
    if (sa === "Candra") return dailyMotion("Candra");
    return null;
  }
  /* The apparent diameter follows the TRUE DAILY MOTION: a graha moving fast
     is near and looks big. It is the relation the text uses in place of a
     distance it has no way to measure, and it is worth knowing that it
     overstates the variation by about a factor of two. The reason is
     structural rather than careless: a single epicycle fitted to reproduce
     the equation of centre has to be about twice the eccentricity, so the
     distance it implies swings twice as far as the real one. The mean is
     close; the extremes are not. */
  function apparentDiameter(sa, ahar) {
    var S = SIZE[sa];
    if (!S) return null;
    var meanAng = S.diameter / S.meanDist * R2D * 60;   /* minutes of arc */
    var mm = meanDailyMotion(sa);
    var tm = trueDailyMotion(sa, ahar);
    if (mm == null || tm == null) return meanAng;
    return meanAng * (tm / mm);
  }
  function trueDailyMotion(sa, ahar) {
    var a = trueLongitude(sa, ahar - 0.5), b = trueLongitude(sa, ahar + 0.5);
    if (!a || !b) return null;
    return sdiff(b.lon, a.lon);
  }
  /* The Earth's shadow where the Moon crosses it — the quantity a lunar
     eclipse is measured against. The text computes it from the Sun's and the
     Earth's diameters and the Moon's distance. */
  function shadowDiameter(ahar) {
    var sunMean = dailyMotion("Sūrya"), moonMean = dailyMotion("Candra");
    var sunTrue = trueDailyMotion("Sūrya", ahar);
    var moonTrue = trueDailyMotion("Candra", ahar);
    var sunDist = SIZE["Sūrya"].meanDist * (sunMean / sunTrue);
    var moonDist = SIZE["Candra"].meanDist * (moonMean / moonTrue);
    /* the shadow narrows from the Earth's diameter at the rate the Sun's
       excess over the Earth sets */
    var d = SIZE.earthDiameter -
      (SIZE["Sūrya"].diameter - SIZE.earthDiameter) * moonDist /
      Math.max(1, sunDist - moonDist);
    return { yojanas: d, minutes: d / moonDist * R2D * 60,
             moonDist: moonDist, sunDist: sunDist };
  }

  /* =======================================================================
     10 — ECLIPSES
     ======================================================================= */

  function syzygy(ahar0, want, dir) {
    /* the instant the elongation reaches `want`, found from `ahar0` */
    function f(a) {
      var s = trueLongitude("Sūrya", a).lon, m = trueLongitude("Candra", a).lon;
      return sdiff(norm(m - s), want);
    }
    var step = 0.25 * (dir || 1), a = ahar0, fa = f(a);
    for (var i = 0; i < 300; i++) {
      var b = a + step, fb = f(b);
      if ((fa < 0) !== (fb < 0) && Math.abs(fa) < 90 && Math.abs(fb) < 90) {
        for (var k = 0; k < 60; k++) {
          var m2 = (a + b) / 2, fm = f(m2);
          if ((fa < 0) === (fm < 0)) { a = m2; fa = fm; } else { b = m2; }
          if (Math.abs(b - a) < 1e-7) break;
        }
        return (a + b) / 2;
      }
      a = b; fa = fb;
    }
    return null;
  }

  /* A lunar eclipse, judged at the opposition: the Moon's latitude against
     the sum of the two half-diameters. */
  function lunarEclipseAt(ahar) {
    var t = syzygy(ahar, 180, 1);
    if (t == null) return null;
    var lat = latitudeOf("Candra", t) * 60;              /* minutes */
    var sh = shadowDiameter(t);
    var moonD = apparentDiameter("Candra", t);
    var sum = (sh.minutes + moonD) / 2;
    var obscured = sum - Math.abs(lat);
    if (obscured <= 0) return { at: msOf(t + (EPOCH.sunrise)), ahar: t,
                                eclipse: false, latitude: lat / 60,
                                shadow: sh.minutes, moon: moonD };
    /* the relative motion sets how long it lasts */
    var rel = trueDailyMotion("Candra", t) - trueDailyMotion("Sūrya", t);
    var halfDur = Math.sqrt(Math.max(0, sum * sum - lat * lat)) /
                  Math.max(1e-6, rel * 60) * 24;          /* hours */
    var diff = (sh.minutes - moonD) / 2;
    var totalHalf = diff > Math.abs(lat)
      ? Math.sqrt(Math.max(0, diff * diff - lat * lat)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    return {
      ahar: t, at: msOf(t + EPOCH.sunrise),
      eclipse: true,
      total: totalHalf > 0,
      magnitude: obscured / moonD,
      latitude: lat / 60,
      shadowMinutes: sh.minutes,
      moonMinutes: moonD,
      halfDurationHours: halfDur,
      totalHalfHours: totalHalf,
      begins: msOf(t + EPOCH.sunrise) - halfDur * 3600000,
      ends: msOf(t + EPOCH.sunrise) + halfDur * 3600000
    };
  }

  /* A solar eclipse is a question about where you are standing, because it is
     parallax that decides it. The text computes a lambana in longitude and a
     nati in latitude; both are given here in the simplified form the method
     uses rather than a rigorous parallax. */
  function solarEclipseAt(ahar, place) {
    var t = syzygy(ahar, 0, 1);
    if (t == null) return null;
    var lat = latitudeOf("Candra", t) * 60;
    var sunD = apparentDiameter("Sūrya", t);
    var moonD = apparentDiameter("Candra", t);
    var sum = (sunD + moonD) / 2;
    /* lambana: the difference of parallax between Sun and Moon, which at its
       largest is about four nāḍīs of time and vanishes at local noon */
    var lam = 0, nati = 0;
    if (place && place.lat != null) {
      var L = lagna(msOf(t + EPOCH.sunrise), place);
      var mid = L ? norm(L.lon - trueLongitude("Sūrya", t).lon) : 0;
      lam = 4 * jya(mid) / RAD;                          /* nāḍīs */
      nati = 0.7 * jya(place.lat) / RAD;                 /* degrees, crudely */
    }
    var tAdj = t + lam * 24 / 60 / 24;
    var effLat = lat / 60 + nati;
    var obscured = sum / 60 - Math.abs(effLat);
    /* how long it lasts, from the same geometry as the lunar case: the
       relative motion carrying the Moon across the chord its latitude cuts
       through the Sun's disc */
    var rel = trueDailyMotion("Candra", t) - trueDailyMotion("Sūrya", t);
    var latMin = effLat * 60;
    var halfDur = obscured > 0
      ? Math.sqrt(Math.max(0, sum * sum - latMin * latMin)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    var diff = Math.abs(moonD - sunD) / 2;
    var totalHalf = (obscured > 0 && diff > Math.abs(latMin))
      ? Math.sqrt(Math.max(0, diff * diff - latMin * latMin)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    return {
      ahar: tAdj, at: msOf(tAdj + EPOCH.sunrise),
      eclipse: obscured > 0,
      magnitude: obscured > 0 ? obscured * 60 / sunD : 0,
      /* the Moon smaller than the Sun is an annular eclipse, larger a total
         one — a distinction this method is able to make, because both
         diameters follow their own true motion */
      annular: obscured > 0 && totalHalf > 0 && moonD < sunD,
      total: obscured > 0 && totalHalf > 0 && moonD >= sunD,
      latitude: lat / 60, effectiveLatitude: effLat,
      lambanaNadis: lam, nati: nati,
      sunMinutes: sunD, moonMinutes: moonD,
      halfDurationHours: halfDur,
      totalHalfHours: totalHalf,
      begins: msOf(tAdj + EPOCH.sunrise) - halfDur * 3600000,
      ends: msOf(tAdj + EPOCH.sunrise) + halfDur * 3600000
    };
  }

  /* EVERY SYZYGY IN A SPAN, enumerated rather than hunted for.

     The first version of this walked forward from each eclipse it found,
     which meant a span with no eclipse in it advanced by a guess — and a
     walker that guesses can step over a syzygy. Since the whole value of
     this routine is the claim "these are the eclipses and there are no
     others", a walker that might skip is not good enough.

     So the new and full Moons are enumerated independently and exhaustively.
     Their spacing is the one interval this engine knows exactly — it is the
     synodic month, and the synodic month is what the revolution counts are
     best at, agreeing with the modern value to a tenth of a second. Each
     syzygy is then tested on its own. Any eclipse missing from the result is
     missing because the theory does not find it, which is the honest thing
     for this to report and a quantity worth knowing. */
  function syzygies(a0, a1, want) {
    var syn = YUGA.civilDays / (revOf("Candra") - revOf("Sūrya"));
    var out = [];
    /* start half a month early so the first one in the span is not lost */
    var t = a0 - syn;
    for (var i = 0; i < 2000 && t < a1 + syn; i++) {
      var r = syzygy(t, want, 1);
      if (r == null) break;
      if (r > a0 && r <= a1) out.push(r);
      t = r + syn * 0.6;
    }
    return out;
  }
  function eclipsesIn(fromMs, toMs, place) {
    var out = [];
    var a0 = ahargana(fromMs), a1 = ahargana(toMs);
    syzygies(a0, a1, 180).forEach(function (t) {
      var L = lunarEclipseAt(t - 0.4);
      if (L && L.eclipse) out.push({ kind: "lunar", e: L });
    });
    syzygies(a0, a1, 0).forEach(function (t) {
      var S = solarEclipseAt(t - 0.4, place);
      if (S && S.eclipse) out.push({ kind: "solar", e: S });
    });
    out.sort(function (x, y) { return x.e.ahar - y.e.ahar; });
    return out;
  }

  /* HOW FAR THE NODE HAS WANDERED. The revolution count for Rāhu gives a
     draconitic month right to about two seconds, which is the rate; but a
     rate two seconds out, carried across the two hundred and seventy-five
     circuits the node has made since the epoch, is a position tens of degrees
     from the truth. That is the single quantity behind most of what this
     engine gets wrong about eclipses — it finds the great ones and misses the
     slight ones, because an eclipse season sits where the node says it does. */
  function nodeDrift(ms) {
    var a = ahargana(ms);
    var ss = norm(meanOf("Rāhu", a));
    var modern = null;
    try {
      /* recovered from the modern Moon's own latitude and longitude, so this
         needs no second table: the node is where the latitude passes through
         zero going north */
      var lon = window.__kSidAt("Moon", new Date(ms));
      var e = window.__kEclip("Moon", ms);
      if (e && e.lat != null) {
        var s2 = clamp(Math.sin(e.lat * D2R) / Math.sin(5.145 * D2R), -1, 1);
        var arg = Math.asin(s2) * R2D;
        /* resolve the quadrant with the latitude's own rate */
        var e2 = window.__kEclip("Moon", ms + 3600000);
        if (e2 && e2.lat != null && e2.lat < e.lat) arg = 180 - arg;
        modern = norm(lon - arg);
      }
    } catch (x) {}
    return { ss: ss, modern: modern,
             diff: modern == null ? null : sdiff(ss, modern),
             circuits: a / (YUGA.civilDays / Math.abs(revOf("Rāhu"))) };
  }

  /* =======================================================================
     11 — VISIBILITY AND STATIONS
     ======================================================================= */

  /* The kālāṃśas: how far from the Sun, measured in degrees of the equator,
     a graha must be to be seen at all. Śukra is the brightest and needs the
     least; Śani is faint and needs the most. */
  var KALAMSA = { "Candra": 12, "Maṅgala": 17, "Budha": 13, "Guru": 11,
                  "Śukra": 9, "Śani": 15 };
  function heliacal(sa, ahar) {
    if (KALAMSA[sa] == null) return null;
    var s = trueLongitude("Sūrya", ahar), q = trueLongitude(sa, ahar);
    if (!q) return null;
    /* compared in right ascension, which is what "degrees of time" means */
    var d = sdiff(raOfLongitude(q.lon), raOfLongitude(s.lon));
    return { arc: d, needs: KALAMSA[sa], visible: Math.abs(d) >= KALAMSA[sa],
             side: d > 0 ? "east — sets after the Sun" : "west — rises before it" };
  }
  function isRetrograde(sa, ahar) {
    var m = trueDailyMotion(sa, ahar);
    return m == null ? null : m < 0;
  }

  /* =======================================================================
     12 — THE PUBLIC FACE
     ======================================================================= */

  function positions(ms, variant, place) {
    var ahar = ahargana(ms, variant) + (place ? desantara(place) : 0);
    var out = { ahargana: ahar, variant: variant || "sunrise", at: ms,
                grahas: {} };
    SA.forEach(function (sa) {
      var q = trueLongitude(sa, ahar);
      if (!q) return;
      q.latitude = latitudeOf(sa, ahar);
      q.declination = declinationOf(tropical(q.lon, ms), q.latitude || 0);
      q.speed = trueDailyMotion(sa, ahar);
      q.retrograde = q.speed != null && q.speed < 0;
      var h = heliacal(sa, ahar);
      if (h) q.visibility = h;
      var d = apparentDiameter(sa, ahar);
      if (d != null) q.apparentDiameter = d;
      out.grahas[sa] = q;
    });
    return out;
  }
  function motion(sa, ms, variant) {
    return trueDailyMotion(sa, ahargana(ms, variant));
  }

  function constants() {
    var yearDays = YUGA.civilDays / revOf("Sūrya");
    var monthDays = YUGA.civilDays / (revOf("Candra") - revOf("Sūrya"));
    var sidMonth = YUGA.civilDays / revOf("Candra");
    var anomMonth = YUGA.civilDays / (revOf("Candra") - revOf("candraUcca"));
    var nodeMonth = YUGA.civilDays / (revOf("Candra") - revOf("Rāhu"));
    return {
      sidYearDays: yearDays,
      synodicMonthDays: monthDays,
      sidMonthDays: sidMonth,
      anomalisticMonthDays: anomMonth,
      draconiticMonthDays: nodeMonth,
      civilDays: YUGA.civilDays,
      yugaYears: YUGA.years,
      radius: RAD,
      obliquity: OBLIQUITY,
      modernSidYearDays: 365.256363,
      modernSynodicMonth: 29.5305889,
      modernSidMonth: 27.321661547,
      modernAnomalisticMonth: 27.554549878,
      modernDraconiticMonth: 27.212220817,
      yearExcessSeconds: (yearDays - 365.256363) * 86400,
      /* the number of lunar months in a solar year, from which the
         intercalary month follows */
      monthsPerYear: yearDays / monthDays,
      adhikaMasaYears: 1 / (yearDays / monthDays - 12)
    };
  }

  function chart(ms, variant, place) {
    var P = positions(ms, variant, place);
    var out = { source: "Sūrya Siddhānta", variant: P.variant,
                ahargana: P.ahargana, planets: {} };
    SA.forEach(function (sa) {
      var q = P.grahas[sa];
      if (!q) return;
      out.planets[sa] = { lon: q.lon, mean: q.mean, speed: q.speed,
                          lat: q.latitude, manda: q.manda, sighra: q.sighra };
    });
    if (place) {
      var L = lagna(ms, place);
      if (L) out.lagna = L.lon;
      out.day = sunriseSunset(ms, place);
      out.panchanga = panchanga(ms, place);
    }
    return out;
  }

  /* What is not here, and why — printed on the page rather than discovered. */
  var ABSENT = [
    { what: "The yogatārā positions of the nakṣatras",
      why: "the polar longitudes and latitudes of the junction stars are a " +
           "table, and a table I could not verify is worse than no table; the " +
           "machinery for a graha's conjunction with a star is here and takes " +
           "a star's coordinates as an argument" },
    { what: "A bīja correction",
      why: "later astronomers corrected these revolution counts and the " +
           "corrections in circulation differ; the mechanism is implemented " +
           "and takes a bīja as an option, but none is shipped, because " +
           "choosing between them silently would be the wrong kind of help" },
    { what: "Rigorous parallax for solar eclipses",
      why: "the lambana and nati here follow the text's own simplified form " +
           "rather than a true parallax, so a solar eclipse is placed to " +
           "within a fraction of an hour and not to the minute — which is " +
           "the method's own accuracy, not an abbreviation of it" },
    { what: "The gnomon and shadow problems",
      why: "the chapter on direction, place and time by shadow is a set of " +
           "constructions rather than a computation, and the quantities it " +
           "reaches — latitude, the equinoctial shadow, the cara — are all " +
           "computed here by other means" },
    { what: "The Moon's second and third inequalities",
      why: "evection and variation are not in this theory at all; their " +
           "absence is most of why the Moon here differs from a modern one by " +
           "degrees rather than minutes, and supplying them would make this a " +
           "different astronomy wearing the same parameters" }
  ];

  window.SSEngine = {
    /* configuration */
    OPT: OPT,
    options: function (o) {
      if (o) { for (var k in o) if (OPT.hasOwnProperty(k)) OPT[k] = o[k]; }
      return { sines: OPT.sines, ayana: OPT.ayana, bija: OPT.bija };
    },
    /* data, published so it can be read and argued with */
    YUGA: YUGA, KALPA: KALPA, YUGAS: YUGAS, EPI: EPI, MANDOCCA: MANDOCCA,
    EPOCH: EPOCH, EPOCH_LON: EPOCH_LON, SA: SA, UJJAIN_LON: UJJAIN_LON, JYA: JYA, RAD: RAD,
    OBLIQUITY: OBLIQUITY, NODE: NODE, INCL: INCL, SIZE: SIZE,
    KALAMSA: KALAMSA, VARA: VARA, VARA_EN: VARA_EN,
    TITHI: TITHI, NAK: NAK, YOGA: YOGA, ABSENT: ABSENT,
    AYANA: { zero: AYANA_ZERO_YEAR, amplitude: AYANA_AMPLITUDE,
             period: AYANA_PERIOD },
    /* trigonometry */
    jya: jya, kojya: kojya, arcJya: arcJya, jyaTable: jyaTable,
    arcJyaTable: arcJyaTable,
    /* time */
    jdOf: jdOf, msOf: msOf, ahargana: ahargana, era: era, vara: vara,
    desantara: desantara, bhujantara: bhujantaraDays,
    udayantara: udayantaraDays, equationOfTime: equationOfTime,
    /* places */
    meanOf: meanOf, dailyMotion: dailyMotion,
    mandaEquation: mandaEquation, sighraEquation: sighraEquation,
    sighraFull: sighraFull, trueLongitude: trueLongitude,
    trueDailyMotion: trueDailyMotion,
    latitudeOf: latitudeOf, declination: declinationOf,
    raOfLongitude: raOfLongitude, ayanamsa: ayanamsa, tropical: tropical,
    /* the day */
    cara: cara, risingTimes: risingTimes,
    risingTimesAtEquator: risingTimesAtEquator,
    sunriseSunset: sunriseSunset, lagna: lagna, panchanga: panchanga,
    /* sizes and eclipses */
    apparentDiameter: apparentDiameter, shadowDiameter: shadowDiameter,
    syzygy: syzygy, syzygies: syzygies, nodeDrift: nodeDrift,
    lunarEclipseAt: lunarEclipseAt,
    solarEclipseAt: solarEclipseAt, eclipsesIn: eclipsesIn,
    /* visibility */
    heliacal: heliacal, isRetrograde: isRetrograde,
    /* the whole */
    positions: positions, motion: motion, constants: constants, chart: chart,
    norm: norm
  };
})();

/* ===== Studio Pro — the node registry ====================================

   WHAT THIS FILE IS. Every quantity this site can compute, exposed as a node
   with a stable id, a domain, and — the part that matters — a declared SHAPE.
   Nothing here draws. The shape is what lets a drawing engine that has never
   heard of "Bhṛgu Bindu" put it on a ring correctly, because what it is told
   is "this is a longitude", not "this is Bhṛgu Bindu".

   WHY SHAPES RATHER THAN SCENES. A studio built as a list of scenes can only
   show what somebody wrote a scene for: six hundred data points and thirteen
   scenes is six hundred and thirteen things. Six hundred points that each
   declare which of ten shapes they can take, matched against composers that
   accept shapes, is every combination of them that makes geometric sense —
   which is the difference between a gallery and a studio.

   The shapes:

     lon      one longitude on the 360° ecliptic (optionally with an arc)
     lonset   several of them, named
     scalar   one magnitude, with units and a comparable maximum
     sset     several magnitudes that belong on one axis
     lanes    a division of the circle, or of one sign, into equal arcs
     edges    pairs with a stated relation between them
     span     an interval of time
     spanset  several, sequential or nested
     series   a quantity as a function of the instant
     grid     a table of numbers with named rows and columns

   WHERE THE DATA COMES FROM. The engine's own chart object, exactly as
   buildLocalChart returns it — not the report page's derived object. derive()
   lives inside the report bundle's scope and is not reachable from another
   page, and loading a megabyte of report code to read a few fields would be a
   poor trade for a page that has to work on a phone over local wifi. So every
   reader here goes to the raw chart, and the few derived quantities this page
   needs (house numbers, dispositors, the Viṃśottarī sequence) are computed
   below from it.

   THE ONE DUPLICATION, AND HOW IT IS HELD. The Viṃśottarī daśā is computed
   here as well as in the report bundle. Two implementations of the same thing
   will drift, so there is a test — sp-verify.mjs — that builds the same chart
   both ways and asserts the two sequences agree to the day. That is the deal:
   a second copy is allowed only with a test pinning it to the first.

   HONESTY RULE. A node whose value cannot be computed returns null, and the
   command wall shows it greyed. It is never filled with a plausible number.
   Several things asked for are absent for exactly that reason, and SP_ABSENT
   at the foot lists them with why, so the page can show the list rather than
   quietly omitting them.

   CONTEXT. Every get() takes one object:
     C.J      the engine chart, or null when no birth data is stored
     C.when   the instant the page is pointed at, in ms
     C.place  {name, lat, lon, tz}
     C.day    the pañcāṅga day object for C.when, or null
   so a node is a pure function of that: the same node answers for a birth
   chart, for now, and for any instant the scrubber is dragged to. */

(function () {
  "use strict";

  /* The engine keys every graha by its IAST name and so does this file. The
     ephemeris wants English, so one map, in one direction, used only at the
     boundary. */
  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn", "Rāhu": "Rahu", "Ketu": "Ketu" };
  var RASHI = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
               "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
             "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī",
             "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
             "P.Āṣāḍhā", "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
             "P.Bhādrapada", "U.Bhādrapada", "Revatī"];
  var LORD = ["Maṅgala", "Śukra", "Budha", "Candra", "Sūrya", "Budha", "Śukra",
              "Maṅgala", "Guru", "Śani", "Śani", "Guru"];
  var BHAVA_OF = ["body and self", "wealth, family, speech", "courage, siblings",
    "home, mother, land", "learning, children", "illness, debt, enemies",
    "spouse and partnership", "longevity, the hidden", "fortune and dharma",
    "work and standing", "gains", "loss, expense, release"];
  /* The Viṃśottarī table. Nine lords in a fixed order with fixed year counts,
     and the nakṣatra sequence that repeats every nine. BPHS gives the 120-year
     scheme; these are its numbers. */
  var VSEQ = ["Ketu", "Śukra", "Sūrya", "Candra", "Maṅgala", "Rāhu", "Guru",
              "Śani", "Budha"];
  var VY = { "Ketu": 7, "Śukra": 20, "Sūrya": 6, "Candra": 10, "Maṅgala": 7,
             "Rāhu": 18, "Guru": 16, "Śani": 19, "Budha": 17 };
  /* The year the 120 are counted in.
     sp-verify caught this: the report bundle uses 365.2564, the sidereal year,
     and an earlier draft of this file used 365.2425 — a difference of 1.66
     days by the end of the sequence, which is two pages of this site giving
     two different daśā dates for one chart. Which year length Viṃśottarī
     intends is a real question and not one this file should answer on its own;
     what is NOT negotiable is that the site answers it once. So this matches
     the engine's existing choice, and the test holds them together. */
  var DPY = 365.2564;

  function norm(x) { return ((x % 360) + 360) % 360; }
  function num(x) { return (typeof x === "number" && isFinite(x)) ? x : null; }
  function jdToMs(jd) { return (jd - 2440587.5) * 86400000; }

  /* ---- shape constructors, so a typo in a kind string cannot ship -------- */
  function lon(deg, label, tone, arc) {
    var d = num(deg); if (d == null) return null;
    var v = { kind: "lon", deg: norm(d), label: label, tone: tone || "gold" };
    if (arc) v.arc = arc;
    return v;
  }
  function lonset(items, label) {
    var it = (items || []).filter(function (x) { return x && num(x.deg) != null; });
    return it.length ? { kind: "lonset", items: it, label: label } : null;
  }
  function scalar(v, unit, label, max, work) {
    var n = num(v); return n == null ? null
      : { kind: "scalar", v: n, unit: unit, label: label, max: num(max), work: work };
  }
  function sset(items, unit, label, max) {
    var it = (items || []).filter(function (x) { return x && num(x.v) != null; });
    return it.length ? { kind: "sset", items: it, unit: unit, label: label,
                         max: num(max) } : null;
  }
  function lanes(n, names, label, of, signIdx) {
    if (!n || n < 2) return null;
    return { kind: "lanes", n: n, size: (of === "sign" ? 30 : 360) / n,
             names: names || null, label: label, of: of || "circle",
             signIdx: signIdx == null ? null : signIdx };
  }
  function edges(items, label) {
    var it = (items || []).filter(function (e) {
      return e && num(e.a) != null && num(e.b) != null; });
    return it.length ? { kind: "edges", items: it, label: label } : null;
  }
  function span(from, to, label) {
    return (num(from) == null || num(to) == null || to <= from) ? null
      : { kind: "span", from: from, to: to, label: label };
  }
  function spanset(items, label, nested) {
    var it = (items || []).filter(function (s) {
      return s && num(s.from) != null && num(s.to) != null && s.to > s.from; });
    return it.length ? { kind: "spanset", items: it, label: label,
                         nested: !!nested } : null;
  }
  function series(at, unit, label, range) {
    return typeof at !== "function" ? null
      : { kind: "series", at: at, unit: unit, label: label, range: range || null };
  }
  /* A chart: twelve cells, each a sign, a house number and what stands in it.

     This is the one shape that is not geometry on a circle. A kundli is the
     form every Jyotiṣa reader recognises before they read a word of it, and a
     studio for this subject that could not draw one would be a strange studio.
     The cells carry the SIGN and the HOUSE separately, because the North
     Indian diagram fixes the houses and rotates the signs through them while
     the South Indian fixes the signs and moves the house numbers — the same
     data, two conventions, and a shape that kept only one of them could not
     draw both. */
  function houses(lagnaSign, cells, label, from) {
    var ok = (cells || []).filter(function (c) { return c && c.sign != null; });
    return ok.length === 12
      ? { kind: "houses", lagna: lagnaSign, cells: ok, label: label,
          from: from || "Lagna" }
      : null;
  }
  function grid(rows, cols, label, max) {
    var r = (rows || []).filter(function (x) { return x && x.vals; });
    return r.length ? { kind: "grid", rows: r, cols: cols, label: label,
                        max: num(max) } : null;
  }

  /* ---- readers over the raw chart, each tolerant of its absence --------- */
  function G(C, sa) {
    if (!C.J || !C.J.grahas) return null;
    for (var i = 0; i < C.J.grahas.length; i++)
      if (C.J.grahas[i].key === sa) return C.J.grahas[i];
    return null;
  }
  function natalLon(C, sa) { var g = G(C, sa); return g ? g.sidereal_deg : null; }
  function liveLon(C, sa) {
    try { return window.__kSidAt(EN[sa], new Date(C.when)); } catch (e) { return null; }
  }
  /* natal when there is a chart, live when there is not — so a node answers in
     both modes and the page never shows an empty wall for a visitor with no
     birth data stored */
  function anyLon(C, sa) {
    var n = natalLon(C, sa); return n == null ? liveLon(C, sa) : n;
  }
  function lagnaSign(C) {
    return (C.J && C.J.lagna && C.J.lagna.rashi) ? C.J.lagna.rashi.idx : null;
  }
  function houseOf(C, signIdx) {
    var L = lagnaSign(C);
    return (L == null || signIdx == null) ? null : ((signIdx - L) % 12 + 12) % 12 + 1;
  }
  /* The ṣaḍbala table names grahas in English while every other part of the
     engine uses IAST, so a comparison chart built from it came out reading
     "Saturn, Moon, Jupiter" beside a ring labelled "Śani, Candra, Guru". One
     map, applied where the table is read. */
  var SA_OF_EN = {};
  SA.forEach(function (s2) { SA_OF_EN[EN[s2]] = s2; });
  function saName(x) { return SA_OF_EN[x] || x; }
  function sbOf(C, sa) {
    var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
    if (!sb) return null;
    for (var i = 0; i < sb.length; i++) {
      /* shadbala rows name the graha in English on some builds and IAST on
         others; match either rather than returning nothing on a rename */
      if (sb[i].graha === sa || sb[i].graha === EN[sa]) return sb[i];
    }
    return null;
  }

  /* The Viṃśottarī sequence from the Moon. See the note at the head of the
     file: this duplicates the report bundle's version and sp-verify.mjs
     asserts the two agree to the day. */
  function vimshottari(C) {
    var mn = natalLon(C, "Candra");
    if (mn == null || !C.J || C.J.jd_utc == null) return null;
    var seg = 40 / 3, m = norm(mn), ni = Math.floor(m / seg);
    var lord = VSEQ[ni % 9], frac = (m - ni * seg) / seg;
    var out = [], jd = C.J.jd_utc, i0 = VSEQ.indexOf(lord);
    for (var i = 0; i < 9; i++) {
      var lo = VSEQ[(i0 + i) % 9];
      var yr = (i === 0) ? VY[lord] * (1 - frac) : VY[lo];
      out.push({ lord: lo, start: jd, end: jd + yr * DPY, years: yr });
      jd += yr * DPY;
    }
    return { nak: NAK[ni], lord: lord, frac: frac, list: out };
  }
  function antars(md) {
    var out = [], s = md.start, j0 = VSEQ.indexOf(md.lord);
    for (var i = 0; i < 9; i++) {
      var l = VSEQ[(j0 + i) % 9], ay = VY[md.lord] * VY[l] / 120;
      out.push({ lord: l, start: s, end: s + ay * DPY, years: ay });
      s += ay * DPY;
    }
    return out;
  }
  function currentMd(C) {
    var V = vimshottari(C); if (!V) return null;
    var nowJd = C.when / 86400000 + 2440587.5, cur = null;
    V.list.forEach(function (m) { if (nowJd >= m.start && nowJd < m.end) cur = m; });
    return cur;
  }

  var N = [];
  function add(id, dom, label, hint, roles, get) {
    N.push({ id: id, dom: dom, label: label, hint: hint, roles: roles, get: get });
  }

  /* =======================================================================
     SKY — the nine grahas, each in several facets
     ======================================================================= */
  SA.forEach(function (sa) {
    add("sky.lon." + sa, "sky", sa, "sidereal longitude", ["lon"], function (C) {
      return lon(anyLon(C, sa), sa, sa === "Sūrya" ? "gold" : "glow");
    });
    add("sky.now." + sa, "sky", sa + " now",
        "where it stands at this instant, chart or no chart", ["lon"],
        function (C) { return lon(liveLon(C, sa), sa + " now", "glow"); });
    if (sa !== "Rāhu" && sa !== "Ketu") {
      add("sky.lat." + sa, "sky", sa + " śara",
          "ecliptic latitude — what settles a planetary war", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.ecliptic_latitude_deg != null)
          return scalar(g.ecliptic_latitude_deg, "°", sa + " śara", 8,
                        "geocentric ecliptic latitude");
        var e = null;
        try { e = window.__kEclip(EN[sa], C.when); } catch (x) {}
        return e ? scalar(e.lat, "°", sa + " śara", 8, "geocentric") : null;
      });
      add("sky.decl." + sa, "sky", sa + " krānti",
          "declination — north or south of the celestial equator",
          ["scalar", "series"], function (C) {
        var q = null;
        try { q = window.__kEquator(EN[sa], C.when, C.place.lat, C.place.lon); }
        catch (x) {}
        return q ? scalar(q.dec, "°", sa + " krānti", 25, "declination") : null;
      });
      add("sky.speed." + sa, "sky", sa + " speed",
          "degrees a day — negative is retrograde", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.speed_deg_per_day != null)
          return scalar(g.speed_deg_per_day, "°/day", sa + " speed", 16,
                        g.retrograde ? "retrograde" : "direct");
        var a = liveLon(C, sa), b = null;
        try { b = window.__kSidAt(EN[sa], new Date(C.when + 86400000)); } catch (x) {}
        if (a == null || b == null) return null;
        var d = norm(b - a); if (d > 180) d -= 360;
        return scalar(d, "°/day", sa + " speed", 16, "a day of longitude");
      });
      add("sky.dist." + sa, "sky", sa + " distance", "geocentric distance",
          ["scalar", "series"], function (C) {
        var k = null;
        try { k = window.__kDist(EN[sa], C.when); } catch (x) {}
        return k == null ? null : scalar(k, "km", sa + " distance", null,
                                         "geocentric");
      });
    }
    if (sa !== "Sūrya" && sa !== "Rāhu" && sa !== "Ketu") {
      add("sky.asta." + sa, "sky", sa + " from Sūrya",
          "the elongation combustion is judged by", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.sun_separation_deg != null)
          return scalar(g.sun_separation_deg, "°", sa + " from Sūrya", 180,
                        g.combust ? "combust" : "not combust");
        var a = anyLon(C, sa), s = anyLon(C, "Sūrya");
        if (a == null || s == null) return null;
        var d = norm(a - s); if (d > 180) d = 360 - d;
        return scalar(d, "°", sa + " from Sūrya", 180, "separation");
      });
    }
  });

  add("sky.all", "sky", "All nine grahas", "every graha at once", ["lonset"],
      function (C) {
    return lonset(SA.map(function (sa) {
      var d = anyLon(C, sa);
      return d == null ? null
        : { deg: d, label: sa, tone: sa === "Sūrya" ? "gold" : "glow" };
    }).filter(Boolean), "the nine");
  });
  add("sky.elong", "sky", "Sūrya to Candra",
      "the angle every tithi and karaṇa is cut from", ["scalar", "series"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m - s), "°", "elongation", 360,
                  "Candra " + norm(m).toFixed(2) + "° − Sūrya " +
                  norm(s).toFixed(2) + "°");
  });
  add("sky.yuddha", "sky", "Graha Yuddha",
      "tārā grahas within a degree of each other", ["edges"], function (C) {
    var out = [];
    for (var i = 2; i < 7; i++) for (var j = i + 1; j < 7; j++) {
      var a = anyLon(C, SA[i]), b = anyLon(C, SA[j]);
      if (a == null || b == null) continue;
      var d = norm(a - b); if (d > 180) d = 360 - d;
      if (d < 1) out.push({ a: a, b: b, aLabel: SA[i], bLabel: SA[j],
                            why: d.toFixed(3) + "° apart — a war" });
    }
    return edges(out, "graha yuddha");
  });
  add("sky.retro", "sky", "Retrograde now",
      "whichever grahas are moving backwards", ["lonset"], function (C) {
    var out = [];
    SA.slice(2, 7).forEach(function (sa) {
      var g = G(C, sa), retro = g ? g.retrograde : null;
      if (retro == null) {
        var a = liveLon(C, sa), b = null;
        try { b = window.__kSidAt(EN[sa], new Date(C.when + 86400000)); } catch (x) {}
        if (a != null && b != null) {
          var d = norm(b - a); if (d > 180) d -= 360;
          retro = d < 0;
        }
      }
      if (retro) {
        var deg = anyLon(C, sa);
        if (deg != null) out.push({ deg: deg, label: sa + " ℞", tone: "gold" });
      }
    });
    return lonset(out, "retrograde");
  });

  /* =======================================================================
     RĀŚI, BHĀVA, and the geometry of the circle
     ======================================================================= */
  add("geo.rashis", "rashi", "The twelve rāśis", "30° each", ["lanes"],
      function () { return lanes(12, RASHI, "rāśi", "circle"); });
  add("geo.naks", "nakshatra", "The twenty-seven nakṣatras", "13°20′ each",
      ["lanes"], function () { return lanes(27, NAK, "nakṣatra", "circle"); });
  add("geo.padas", "nakshatra", "The hundred and eight pādas", "3°20′ each",
      ["lanes"], function () { return lanes(108, null, "pāda", "circle"); });
  add("geo.kakshya", "ashtakavarga", "Kakṣyā lanes",
      "eight 3°45′ lanes inside one sign", ["lanes"], function () {
    return lanes(8, ["Śani", "Guru", "Maṅgala", "Sūrya", "Śukra", "Budha",
                     "Candra", "Lagna"], "kakṣyā", "sign");
  });
  add("geo.navamsa", "varga", "Navāṃśa division", "nine to a sign, 3°20′",
      ["lanes"], function () { return lanes(9, null, "navāṃśa", "sign"); });
  add("geo.d60", "varga", "Ṣaṣṭyāṃśa division", "sixty to a sign, 30′",
      ["lanes"], function () { return lanes(60, null, "ṣaṣṭyāṃśa", "sign"); });
  add("geo.drekkana", "varga", "Drekkāṇa division", "three to a sign, 10°",
      ["lanes"], function () { return lanes(3, null, "drekkāṇa", "sign"); });

  RASHI.forEach(function (r, i) {
    add("rashi." + i, "rashi", r, "the 30° arc and what stands in it",
        ["lon"], function (C) {
      var occ = SA.filter(function (sa) {
        var d = anyLon(C, sa);
        return d != null && Math.floor(norm(d) / 30) === i;
      });
      var h = houseOf(C, i);
      return lon(i * 30 + 15,
                 r + (h ? " · bhāva " + h : "") +
                 (occ.length ? " · " + occ.join(", ") : ""),
                 "dim", { from: i * 30, to: i * 30 + 30 });
    });
  });
  NAK.forEach(function (nm, i) {
    add("nak." + i, "nakshatra", nm, "the 13°20′ arc", ["lon"], function () {
      return lon(i * (40 / 3) + (20 / 3), nm, "dim",
                 { from: i * (40 / 3), to: (i + 1) * (40 / 3) });
    });
  });

  for (var hh = 1; hh <= 12; hh++) (function (hn) {
    add("bhava." + hn, "bhava", "Bhāva " + hn, BHAVA_OF[hn - 1], ["lon"],
        function (C) {
      if (!C.J || !C.J.bhavas) return null;
      var b = C.J.bhavas[hn - 1]; if (!b || !b.rashi) return null;
      var s = b.rashi.idx;
      return lon(s * 30 + 15,
                 "Bhāva " + hn + " · " + RASHI[s] +
                 (b.occupants && b.occupants.length ? " · " + b.occupants.join(", ") : ""),
                 "dim", { from: s * 30, to: s * 30 + 30 });
    });
    add("bhava.lord." + hn, "bhava", "Lord of bhāva " + hn,
        "where that house's ruler actually stands", ["lon"], function (C) {
      if (!C.J || !C.J.bhavas) return null;
      var b = C.J.bhavas[hn - 1]; if (!b || !b.ruler) return null;
      var d = natalLon(C, b.ruler);
      return lon(d, b.ruler + " — lord of " + hn, "gold");
    });
  })(hh);

  add("bhava.rising", "rashi", "Oblique ascension",
      "how long each rāśi takes to rise at this latitude", ["sset"],
      function (C) {
    var rt = C.J && C.J.rashi_rising_times && C.J.rashi_rising_times.rashis;
    if (!rt || !rt.length) return null;
    return sset(rt.map(function (r) {
      return { k: r.rashi, v: r.rising_minutes,
               work: r.share_of_day_percent != null
                 ? r.share_of_day_percent.toFixed(2) + "% of the day" : null };
    }), "min", "rising times");
  });
  add("bhava.bhayat", "bhava", "Bhayāt and Bhabhoga",
      "how far through its nakṣatra the Moon stood at birth", ["sset"],
      function (C) {
    var b = C.J && C.J.bhayat; if (!b) return null;
    return sset([{ k: "Bhayāt", v: b.bhayat_ghatis },
                 { k: "Bhabhoga", v: b.bhabhoga_ghatis }], "ghaṭī",
                "bhayāt / bhabhoga");
  });

  /* =======================================================================
     VARGAS — every division, and every graha inside each
     ======================================================================= */
  function vargaOf(C, code) {
    if (!C.J || !C.J.vargas) return null;
    for (var i = 0; i < C.J.vargas.length; i++)
      if (C.J.vargas[i].varga === code) return C.J.vargas[i];
    return null;
  }
  var VCODES = ["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20",
                "D24", "D27", "D30", "D40", "D45", "D60"];
  VCODES.forEach(function (code) {
    add("varga.chart." + code, "varga", code,
        "the whole division as a wheel", ["lonset"], function (C) {
      var v = vargaOf(C, code); if (!v || !v.positions) return null;
      return lonset(SA.map(function (sa) {
        var s = v.positions[sa];
        return s == null ? null
          : { deg: s * 30 + 15, label: sa, tone: "glow" }; }).filter(Boolean),
        code + (v.en ? " · " + v.en : ""));
    });
    add("varga.kundli." + code, "chart", code + " as a kundli",
        "that division drawn as a chart", ["houses"], function (C) {
      var v = vargaOf(C, code);
      if (!v || !v.positions || v.lagna == null) return null;
      return chartFrom(C, v.lagna % 12, code + " chart", code + " lagna",
                       v.positions);
    });
    add("varga.lagna." + code, "varga", code + " lagna",
        "the rising sign of that division", ["lon"], function (C) {
      var v = vargaOf(C, code);
      return (!v || v.lagna == null) ? null
        : lon(v.lagna * 30 + 15, code + " lagna · " + RASHI[v.lagna % 12], "gold");
    });
  });
  add("varga.grid", "varga", "Every varga at once",
      "which sign each graha takes, division by division", ["grid"],
      function (C) {
    if (!C.J || !C.J.vargas || !C.J.vargas.length) return null;
    return grid(C.J.vargas.map(function (v) {
      return { k: v.varga, label: v.varga,
               vals: SA.map(function (sa) {
                 return v.positions ? v.positions[sa] : null; }) };
    }), SA, "vargas", 11);
  });
  add("varga.vargottama", "varga", "Vargottama",
      "the grahas holding the same sign in D1 and D9", ["lonset"], function (C) {
    var d1 = vargaOf(C, "D1"), d9 = vargaOf(C, "D9");
    if (!d1 || !d9) return null;
    return lonset(SA.map(function (sa) {
      if (d1.positions[sa] == null || d1.positions[sa] !== d9.positions[sa])
        return null;
      var d = natalLon(C, sa);
      return d == null ? null : { deg: d, label: sa + " vargottama", tone: "gold" };
    }).filter(Boolean), "vargottama");
  });

  /* =======================================================================
     THE CHART ITSELF — read from Lagna, from Candra, from Sūrya, and in
     every varga. The three reference points are the Sudarśana Cakra: the
     same twelve grahas judged from three different first houses, which is a
     definition rather than a table and so is safe to derive here.
     ======================================================================= */
  function chartFrom(C, firstSign, label, from, positions) {
    if (firstSign == null) return null;
    var cells = [];
    for (var i = 0; i < 12; i++) {
      var sign = (firstSign + i) % 12;
      cells.push({ sign: sign, house: i + 1, items: [] });
    }
    SA.forEach(function (sa) {
      var sg = null;
      if (positions) sg = positions[sa];
      else { var d = natalLon(C, sa); sg = d == null ? null : Math.floor(norm(d) / 30); }
      if (sg == null) return;
      var h = ((sg - firstSign) % 12 + 12) % 12;
      var g = positions ? null : G(C, sa);
      cells[h].items.push({ label: sa, retro: !!(g && g.retrograde),
                            tone: sa === "Sūrya" ? "gold" : "glow" });
    });
    return houses(firstSign, cells, label, from);
  }
  add("chart.d1", "chart", "The chart from Lagna",
      "twelve houses counted from the rising sign", ["houses"], function (C) {
    var L = lagnaSign(C);
    return chartFrom(C, L, "Rāśi chart", "Lagna");
  });
  add("chart.moon", "chart", "The chart from Candra",
      "the same grahas judged from the Moon's sign", ["houses"], function (C) {
    var m = natalLon(C, "Candra");
    return m == null ? null
      : chartFrom(C, Math.floor(norm(m) / 30), "Candra lagna", "Candra");
  });
  add("chart.sun", "chart", "The chart from Sūrya",
      "the same grahas judged from the Sun's sign", ["houses"], function (C) {
    var d = natalLon(C, "Sūrya");
    return d == null ? null
      : chartFrom(C, Math.floor(norm(d) / 30), "Sūrya lagna", "Sūrya");
  });
  add("chart.sudarshana", "chart", "Sudarśana — all three",
      "Lagna, Candra and Sūrya as three rings of the same chart",
      ["houseset"], function (C) {
    var L = lagnaSign(C), m = natalLon(C, "Candra"), s = natalLon(C, "Sūrya");
    if (L == null || m == null || s == null) return null;
    var three = [chartFrom(C, L, "from Lagna", "Lagna"),
                 chartFrom(C, Math.floor(norm(m) / 30), "from Candra", "Candra"),
                 chartFrom(C, Math.floor(norm(s) / 30), "from Sūrya", "Sūrya")];
    if (three.some(function (x) { return !x; })) return null;
    return { kind: "houseset", items: three, label: "Sudarśana Cakra" };
  });
  add("chart.transit", "chart", "The sky now, as a chart",
      "transiting grahas in houses from the natal Lagna", ["houses"],
      function (C) {
    var L = lagnaSign(C); if (L == null) return null;
    var pos = {};
    SA.forEach(function (sa) {
      var d = liveLon(C, sa);
      if (d != null) pos[sa] = Math.floor(norm(d) / 30); });
    return chartFrom(C, L, "Gocara — transits now", "Lagna", pos);
  });

  /* =======================================================================
     STRENGTH — the ṣaḍbala components, each a real column of the engine
     ======================================================================= */
  var SBCOL = [
    ["sthana", "Sthāna Bala", "positional strength"],
    ["dig", "Dig Bala", "directional strength"],
    ["kala", "Kāla Bala", "temporal strength"],
    ["cheshta", "Ceṣṭā Bala", "motional strength"],
    ["naisargika", "Naisargika Bala", "natural strength"],
    ["drik", "Dṛk Bala", "aspectual strength"],
    ["uchcha", "Uccha Bala", "distance from debilitation"],
    ["saptavargaja", "Saptavargaja Bala", "dignity across seven vargas"],
    ["ojha", "Ojhayugma Bala", "odd and even signs"],
    ["kendradi", "Kendrādi Bala", "kendra, paṇaphara, āpoklima"],
    ["drekkana", "Drekkāṇa Bala", "by third of a sign"],
    ["nathonnatha", "Nathonnatha Bala", "day and night"],
    ["paksha", "Pakṣa Bala", "waxing and waning"],
    ["tribhaga", "Tribhāga Bala", "by third of day or night"],
    ["ayana", "Ayana Bala", "by declination"],
    ["total_rupa", "Ṣaḍbala total", "the six added, in rūpas"],
    ["required_rupa", "Required", "the classical minimum for that graha"],
    ["ratio", "Strength ratio", "total against the minimum"]
  ];
  SBCOL.forEach(function (col) {
    add("bala." + col[0], "bala", col[1], col[2], ["sset"], function (C) {
      var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
      if (!sb || !sb.length) return null;
      var unit = (col[0] === "ratio") ? "×"
               : (col[0].indexOf("rupa") >= 0 ? "rūpa" : "virūpa");
      return sset(sb.map(function (r) {
        return { k: saName(r.graha), v: r[col[0]] }; }), unit, col[1]);
    });
  });
  add("bala.vsRequired", "bala", "Ṣaḍbala against its minimum",
      "each graha's total beside what it is required to reach", ["grid"],
      function (C) {
    var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
    if (!sb || !sb.length) return null;
    return grid(sb.map(function (r) {
      return { k: saName(r.graha), label: saName(r.graha),
               vals: [r.total_rupa, r.required_rupa] }; }),
      ["total", "required"], "ṣaḍbala vs minimum", 12);
  });
  add("bala.dignity", "bala", "Dignity",
      "exalted, own, friendly, debilitated — as the engine ranks it", ["sset"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    var RANK = { "exalted": 5, "moolatrikona": 4, "mūlatrikoṇa": 4, "own": 4,
                 "own sign": 4, "great friend": 3, "friend": 3, "neutral": 2,
                 "enemy": 1, "great enemy": 1, "debilitated": 0 };
    return sset(C.J.grahas.map(function (g) {
      var d = (g.dignity || "").toLowerCase(), v = null;
      Object.keys(RANK).forEach(function (k) { if (d.indexOf(k) >= 0) v = RANK[k]; });
      return { k: g.key, v: v, work: g.dignity }; }), "rank", "dignity", 5);
  });
  add("bala.avastha", "bala", "Avasthās",
      "the engine's avasthā and its strength percentage", ["sset"],
      function (C) {
    var av = C.J && C.J.avasthas; if (!av || !av.length) return null;
    return sset(av.map(function (a) {
      return { k: saName(a.graha), v: a.strength_percent, work: a.avastha_iast }; }),
      "%", "avasthā", 100);
  });

  /* ---- relations between grahas, each from a stated rule ---------------- */
  add("rel.dispositor", "bala", "Dispositor chain",
      "each graha to the lord of the sign it stands in", ["edges"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    return edges(C.J.grahas.map(function (g) {
      if (!g.rashi) return null;
      var dl = LORD[g.rashi.idx];
      if (dl === g.key) return null;
      var d = natalLon(C, dl); if (d == null) return null;
      return { a: g.sidereal_deg, b: d, aLabel: g.key, bLabel: dl,
               why: "in " + RASHI[g.rashi.idx] + ", which " + dl + " rules" };
    }).filter(Boolean), "dispositors");
  });
  /* Parivartana is a definition, not a table — two grahas each in the other's
     sign — so deriving it recalls nothing. */
  add("rel.parivartana", "bala", "Parivartana",
      "two grahas standing in each other's sign", ["edges"], function (C) {
    if (!C.J || !C.J.grahas) return null;
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key >= b.key) return;
        if (LORD[a.rashi.idx] === b.key && LORD[b.rashi.idx] === a.key)
          out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                     aLabel: a.key, bLabel: b.key,
                     why: "an exchange of signs" });
      });
    });
    return edges(out, "parivartana");
  });
  add("rel.drishti", "bala", "Graha Dṛṣṭi",
      "who aspects whom — the seventh for all, plus the BPHS specials",
      ["edges"], function (C) {
    if (!C.J || !C.J.grahas) return null;
    var SPECIAL = { "Maṅgala": [4, 8], "Guru": [5, 9], "Śani": [3, 10] };
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key === b.key) return;
        var h = ((b.rashi.idx - a.rashi.idx) % 12 + 12) % 12 + 1;
        if ([7].concat(SPECIAL[a.key] || []).indexOf(h) >= 0)
          out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                     aLabel: a.key, bLabel: b.key,
                     why: a.key + " aspects the " + h + "th" });
      });
    });
    return edges(out, "graha dṛṣṭi");
  });
  add("rel.rashiDrishti", "rashi", "Rāśi Dṛṣṭi",
      "movable to fixed, fixed to movable, dual to dual", ["edges"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key >= b.key) return;
        var x = a.rashi.idx, y = b.rashi.idx, mx = x % 3, my = y % 3;
        var ok = (mx === 0 && my === 1 && ((y - x + 12) % 12) !== 1) ||
                 (mx === 1 && my === 0 && ((x - y + 12) % 12) !== 1) ||
                 (mx === 2 && my === 2 && x !== y);
        if (ok) out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                           aLabel: a.key, bLabel: b.key,
                           why: RASHI[x] + " sees " + RASHI[y] });
      });
    });
    return edges(out, "rāśi dṛṣṭi");
  });

  /* =======================================================================
     AṢṬAKAVARGA
     ======================================================================= */
  add("av.sav", "ashtakavarga", "Sarvāṣṭakavarga",
      "the twelve totals", ["sset"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    if (!av || !av.sarva) return null;
    return sset(av.sarva.map(function (v, i) {
      var h = houseOf(C, i);
      return { k: RASHI[i], v: v, work: h ? "bhāva " + h : null }; }),
      "bindus", "sarvāṣṭakavarga", 56);
  });
  add("av.grid", "ashtakavarga", "Bhinnāṣṭakavarga, all seven",
      "each graha's own bindu row", ["grid"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    if (!av || !av.bhinna) return null;
    return grid(av.bhinna.map(function (b) {
      return { k: saName(b.graha), label: b.graha_sa || saName(b.graha),
               vals: b.bindus }; }),
      RASHI, "bhinnāṣṭakavarga", 8);
  });
  add("av.sarvaTotal", "ashtakavarga", "Sarvāṣṭakavarga grand total",
      "the 337 the twelve should add to", ["scalar"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    return (!av || av.sarva_total == null) ? null
      : scalar(av.sarva_total, "bindus", "sarva total", 400,
               "the twelve house totals added");
  });
  SA.slice(0, 7).forEach(function (sa) {
    add("av.bav." + sa, "ashtakavarga", sa + "'s bindus",
        "that graha's own aṣṭakavarga row", ["sset"], function (C) {
      var av = C.J && C.J.ashtakavarga;
      if (!av || !av.bhinna) return null;
      var row = null;
      av.bhinna.forEach(function (b) {
        if (b.graha === sa || b.graha_sa === sa) row = b; });
      if (!row || !row.bindus) return null;
      return sset(row.bindus.map(function (v, i) {
        return { k: RASHI[i], v: v }; }), "bindus", sa + " BAV", 8);
    });
  });

  /* =======================================================================
     TIME — daśās, and the cosmic cycles
     ======================================================================= */
  add("dasha.maha", "dasha", "Viṃśottarī mahādaśās",
      "the nine, opened by the Moon's birth nakṣatra", ["spanset"],
      function (C) {
    var V = vimshottari(C); if (!V) return null;
    return spanset(V.list.map(function (m) {
      return { from: jdToMs(m.start), to: jdToMs(m.end), label: m.lord }; }),
      "mahādaśā");
  });
  add("dasha.antar", "dasha", "Antardaśās of the running mahādaśā",
      "the nine inside the one in force", ["spanset"], function (C) {
    var cur = currentMd(C); if (!cur) return null;
    return spanset(antars(cur).map(function (a) {
      return { from: jdToMs(a.start), to: jdToMs(a.end), label: a.lord }; }),
      "antardaśā of " + cur.lord);
  });
  add("dasha.gears", "dasha", "Daśā gears",
      "mahādaśā and antardaśā as nested wheels", ["spanset"], function (C) {
    var V = vimshottari(C), cur = currentMd(C);
    if (!V || !cur) return null;
    var outer = V.list.map(function (m) {
      return { from: jdToMs(m.start), to: jdToMs(m.end), label: m.lord, ring: 0 }; });
    var inner = antars(cur).map(function (a) {
      return { from: jdToMs(a.start), to: jdToMs(a.end), label: a.lord, ring: 1 }; });
    return spanset(outer.concat(inner), "daśā gears", true);
  });
  add("dasha.lord", "dasha", "Mahādaśā lord",
      "where the lord of the running period stands", ["lon"], function (C) {
    var cur = currentMd(C); if (!cur) return null;
    var d = natalLon(C, cur.lord);
    return lon(d, cur.lord + " — mahādaśā lord", "gold");
  });
  add("dasha.birthNak", "dasha", "Janma nakṣatra",
      "the Moon's nakṣatra, which opens the sequence", ["lon"], function (C) {
    var V = vimshottari(C); if (!V) return null;
    var m = natalLon(C, "Candra");
    return lon(m, V.nak + " · opens " + V.lord, "gold");
  });
  add("time.cosmic", "cosmic", "Vedic time",
      "where this moment sits in the Kali Yuga", ["sset"], function () {
    var V = null;
    try { V = (window.NP && window.NP.vedicTime) ? window.NP.vedicTime() : null; }
    catch (e) {}
    if (!V) return null;
    var rows = [];
    ["kaliElapsed", "kaliCurrent", "kaliRemaining"].forEach(function (k) {
      if (V[k] != null) rows.push({ k: k, v: V[k] }); });
    return sset(rows, "years", "vedic time");
  });

  /* =======================================================================
     JAIMINI and the special points
     ======================================================================= */
  add("jai.lagna", "jaimini", "Lagna", "the rising degree", ["lon"],
      function (C) {
    return (C.J && C.J.lagna)
      ? lon(C.J.lagna.sidereal_deg, "Lagna", "gold") : null;
  });
  add("jai.karakas", "jaimini", "Cara Kārakas",
      "the seven, ranked by degree within sign", ["lonset"], function (C) {
    var ck = C.J && C.J.chara_karakas;
    if (!ck || !ck.length) return null;
    return lonset(ck.map(function (k) {
      var d = natalLon(C, k.graha);
      return d == null ? null
        : { deg: d, label: k.label_short + " · " + k.graha, tone: "gold" };
    }).filter(Boolean), "cara kārakas");
  });
  add("jai.ak", "jaimini", "Ātmakāraka",
      "the graha at the highest degree in its sign", ["lon"], function (C) {
    var ck = C.J && C.J.chara_karakas;
    if (!ck || !ck.length) return null;
    var ak = null;
    ck.forEach(function (k) { if (k.rank === 1) ak = k; });
    if (!ak) return null;
    var d = natalLon(C, ak.graha);
    return lon(d, "AK · " + ak.graha, "gold");
  });
  add("jai.arudhas", "jaimini", "Arūḍha padas",
      "all twelve, AL through A12", ["lonset"], function (C) {
    var ar = C.J && C.J.arudhas;
    if (!ar || !ar.length) return null;
    return lonset(ar.map(function (a) {
      return a.arudha_rashi_idx == null ? null
        : { deg: a.arudha_rashi_idx * 30 + 15,
            label: a.arudha_label + " · " + a.arudha_rashi_sa, tone: "dim" };
    }).filter(Boolean), "arūḍha padas");
  });
  add("jai.al", "jaimini", "Arūḍha Lagna",
      "the image the first house throws", ["lon"], function (C) {
    var ar = C.J && C.J.arudhas;
    if (!ar || !ar.length) return null;
    var al = null;
    ar.forEach(function (a) { if (a.arudha_label === "AL") al = a; });
    return (al && al.arudha_rashi_idx != null)
      ? lon(al.arudha_rashi_idx * 30 + 15, "AL · " + al.arudha_rashi_sa, "gold")
      : null;
  });

  /* =======================================================================
     YOGAS — the engine tests eighty-two and reports which hold
     ======================================================================= */
  add("yoga.present", "yoga", "Yogas present",
      "the ones this chart actually satisfies", ["sset"], function (C) {
    var yg = C.J && C.J.yogas; if (!yg) return null;
    var on = yg.filter(function (y) { return y.present; });
    if (!on.length) return null;
    return sset(on.map(function (y) {
      return { k: y.iast || y.en || y.key, v: 1, work: y.detail || y.category };
    }), "", "yogas present", 1);
  });
  add("yoga.byCategory", "yoga", "Yogas by category",
      "how many of each kind hold", ["sset"], function (C) {
    var yg = C.J && C.J.yogas; if (!yg) return null;
    var cnt = {};
    yg.forEach(function (y) {
      if (!y.present) return;
      cnt[y.category || "other"] = (cnt[y.category || "other"] || 0) + 1; });
    var ks = Object.keys(cnt);
    if (!ks.length) return null;
    return sset(ks.map(function (k) { return { k: k, v: cnt[k] }; }),
                "yogas", "by category");
  });

  /* =======================================================================
     PAÑCĀṄGA — the day, at sunrise and at the instant
     ======================================================================= */
  add("pan.tithi", "panchanga", "Tithi", "elongation ÷ 12°", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    var el = norm(m - s);
    return scalar(el / 12, "tithis", "tithi", 30, el.toFixed(2) + "° ÷ 12°");
  });
  add("pan.nak", "panchanga", "Nakṣatra", "Moon ÷ 13°20′", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"); if (m == null) return null;
    return scalar(norm(m) / (40 / 3), "nakṣatras", "nakṣatra", 27,
                  norm(m).toFixed(2) + "° ÷ 13°20′");
  });
  add("pan.yoga", "panchanga", "Nitya Yoga", "(Sun + Moon) ÷ 13°20′",
      ["scalar"], function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m + s) / (40 / 3), "yogas", "nitya yoga", 27,
                  "(" + norm(s).toFixed(2) + "° + " + norm(m).toFixed(2) + "°) ÷ 13°20′");
  });
  add("pan.karana", "panchanga", "Karaṇa", "elongation ÷ 6°", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m - s) / 6, "karaṇas", "karaṇa", 60,
                  norm(m - s).toFixed(2) + "° ÷ 6°");
  });
  add("pan.fiveLimbs", "panchanga", "The five limbs, with the working",
      "four of the five from the same two numbers", ["sset"], function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    var el = norm(m - s), sum = norm(m + s);
    return sset([
      { k: "Tithi", v: el / 12, work: el.toFixed(2) + "° ÷ 12°" },
      { k: "Karaṇa", v: el / 6, work: el.toFixed(2) + "° ÷ 6°" },
      { k: "Nakṣatra", v: norm(m) / (40 / 3), work: norm(m).toFixed(2) + "° ÷ 13°20′" },
      { k: "Nitya yoga", v: sum / (40 / 3), work: sum.toFixed(2) + "° ÷ 13°20′" }
    ], "index", "the five limbs", 60);
  });

  function dayWindow(id, label, hint, pick) {
    add(id, "panchanga", label, hint, ["span"], function (C) {
      if (!C.day) return null;
      var w = null;
      try { w = pick(C.day); } catch (e) {}
      return (w && w.from != null) ? span(w.from, w.to, label) : null;
    });
  }
  dayWindow("pan.rahu", "Rāhu Kāla", "the eighth part the tradition avoids",
            function (D) { return window.NP.rahuKala(D); });
  dayWindow("pan.brahma", "Brahma Muhūrta", "two muhūrtas before sunrise",
            function (D) { return window.NP.brahmaMuhurta(D); });
  add("pan.daylight", "panchanga", "Sunrise to sunset", "the daylight span",
      ["span"], function (C) {
    return (C.day && C.day.sunrise != null && C.day.sunset != null)
      ? span(C.day.sunrise, C.day.sunset, "daylight") : null;
  });
  /* Horā and choghaḍiyā answer "which one is running" by reading D.ms, which
     is right for a clock and wrong for a list. Asking the real functions once
     per slot with a copied day gets every slot from the implementation the
     rest of the site uses, rather than a second copy of the order tables. */
  function dayCopy(D, ms) {
    var o = {}; for (var k in D) if (D.hasOwnProperty(k)) o[k] = D[k];
    o.ms = ms; return o;
  }
  add("pan.horas", "panchanga", "The day's horās", "twenty-four from sunrise",
      ["spanset"], function (C) {
    var D = C.day;
    if (!D || D.sunrise == null || D.nextSunrise == null) return null;
    var sp = (D.nextSunrise - D.sunrise) / 24, out = [];
    for (var i = 0; i < 24; i++) {
      var h = null;
      try { h = window.NP.hora(dayCopy(D, D.sunrise + sp * (i + 0.5))); } catch (e) {}
      if (h) out.push({ from: h.from, to: h.to, label: h.lord });
    }
    return spanset(out, "horās");
  });
  add("pan.choghadiya", "panchanga", "Choghaḍiyā",
      "eight parts of the daylight", ["spanset"], function (C) {
    var D = C.day;
    if (!D || D.sunrise == null || D.sunset == null) return null;
    var part = (D.sunset - D.sunrise) / 8, out = [];
    for (var i = 0; i < 8; i++) {
      var c = null;
      try { c = window.NP.choghadiya(dayCopy(D, D.sunrise + part * (i + 0.5))); }
      catch (e) {}
      if (c && !c.night) out.push({ from: c.from, to: c.to, label: c.name });
    }
    return spanset(out, "choghaḍiyā");
  });
  add("pan.tara", "panchanga", "Tāra Bala",
      "the nine tāras across all twenty-seven birth stars", ["sset"],
      function (C) {
    if (!C.day) return null;
    var G2 = null;
    try { G2 = window.NP.taraGrid(C.day); } catch (e) {}
    if (!G2 || !G2.rows) return null;
    var RANK = { "Janma": 1, "Sampat": 3, "Vipat": 0, "Kshema": 3,
                 "Pratyari": 0, "Sadhaka": 3, "Vadha": 0, "Mitra": 3,
                 "Ati-Mitra": 3 };
    return sset(G2.rows.map(function (r) {
      return { k: r.name,
               v: r.tara ? (RANK[r.tara.name] != null ? RANK[r.tara.name] : 2) : null,
               work: r.tara ? r.tara.name : null }; }), "rank", "tāra bala", 3);
  });

  /* =======================================================================
     THE ALMANAC LEAF — the whole day packaged for the ornate card.

     One node rather than nine, because the card is a composition: it wants
     the five limbs AND the month AND the saṃvat AND the sunrise together or
     not at all, and a reader who had to select nine chips to get one card
     would reasonably give up.
     ======================================================================= */
  var MONTH_EN = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  function hm(ms, tz) {
    if (ms == null) return null;
    var d = new Date(ms + (tz || 0) * 3600000);
    return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2);
  }
  add("day.almanac", "panchanga", "The almanac leaf",
      "the whole day as one ornate card — the five limbs, the month, the " +
      "saṃvat, the sunrise and the Moon", ["almanac"], function (C) {
    var D = C.day;
    if (!D || !D.at) return null;
    var tz = C.place.tz || 0;
    /* the four end times need the bisected day; ask for it once */
    var E = D;
    if (D.at.tithi.ends == null) {
      try { E = window.NP.day(C.when, C.place, { ends: true }) || D; } catch (e) {}
    }
    var g = D.gregorian || {};
    var mr = null, msd = null;
    try {
      mr = window.__kRiseSet("Moon", C.place.lat, C.place.lon, D.sunrise - 6 * 3600000, 2, +1);
      msd = window.__kRiseSet("Moon", C.place.lat, C.place.lon, D.sunrise - 6 * 3600000, 2, -1);
    } catch (e) {}
    var pk = E.at.tithi.paksha || "";
    var sv = D.samvat || {};
    function ends(t) { return t == null ? null : "ends " + hm(t, tz); }
    return {
      kind: "almanac",
      label: "almanac leaf",
      elongation: D.elongation,
      dateLine: (g.d || "") + " " + (MONTH_EN[(g.m || 1) - 1] || "") + " " + (g.y || ""),
      subLine: [D.vara, (D.masa && D.masa.amantaIAST) + " " + pk,
                (sv.vikrama ? sv.vikrama + " Vikrama" : null),
                C.place.name].filter(Boolean).join("  \u00b7  ")
               .replace(/ {2}\u00b7 {2}([^\u00b7]*)$/, "  |  $1"),
      rows: [
        { cols: [
          { icon: "lotus", label: "TITHI",
            value: pk + " " + E.at.tithi.name,
            detail: [ends(E.at.tithi.ends), E.at.tithi.n + " of 15"]
                      .filter(Boolean).join("  \u00b7  ") },
          { icon: "star", label: "NAK\u1e62ATRA", value: E.at.nak.name,
            detail: ["p\u0101da " + E.at.nak.pada, ends(E.at.nak.ends)]
                      .filter(Boolean).join("  \u00b7  ") } ] },
        { cols: [
          { icon: "om", label: "YOGA", value: E.at.yoga.name,
            detail: ends(E.at.yoga.ends) },
          { icon: "orbit", label: "KARA\u1e46A", value: E.at.karana.name,
            detail: ends(E.at.karana.ends) } ] },
        { cols: [
          { icon: "saturn", label: "M\u0100SA",
            value: (D.masa && D.masa.amantaIAST) || "",
            detail: "p\u016br\u1e47im\u0101nta " +
                    ((D.masa && D.masa.purnimantaIAST) || "") +
                    "  \u00b7  am\u0101nta " + ((D.masa && D.masa.amantaIAST) || "") },
          { icon: "planet", label: "\u1e5aTU & AYANA",
            value: (D.masa && D.masa.ritu) || "",
            detail: (D.masa && D.masa.ayana) || "" } ] },
        { cols: [
          { icon: "seal", label: "SA\u1e42VAT",
            value: (sv.vikrama ? sv.vikrama + " Vikrama" : ""),
            detail: sv.note ? sv.note.slice(0, 62) : null,
            detail2: sv.note && sv.note.length > 62 ? sv.note.slice(62) : null } ] },
        { cols: [
          { icon: "sunrise", label: "SUNRISE", value: hm(D.sunrise, tz) || "",
            detail: "sunset " + (hm(D.sunset, tz) || "") + "  \u00b7  " +
                    (D.riseConvLabel || "upper limb") },
          { icon: "moon", label: "MOON",
            value: mr != null ? "rise " + hm(mr, tz) : "no rise today",
            detail: msd != null ? "set " + hm(msd, tz) : null } ] }
      ]
    };
  });

  /* =======================================================================
     TRANSIT — the live sky, and the live sky against the natal one
     ======================================================================= */
  add("tr.all", "transit", "Transiting grahas", "the sky at this instant",
      ["lonset"], function (C) {
    return lonset(SA.map(function (sa) {
      var d = liveLon(C, sa);
      return d == null ? null : { deg: d, label: sa, tone: "glow" };
    }).filter(Boolean), "transits");
  });
  add("tr.vsNatal", "transit", "Transit against natal",
      "every graha paired with its own natal place", ["edges"], function (C) {
    if (!C.J) return null;
    return edges(SA.map(function (sa) {
      var t = liveLon(C, sa), n = natalLon(C, sa);
      if (t == null || n == null) return null;
      return { a: n, b: t, aLabel: sa + " natal", bLabel: sa + " now",
               why: norm(t - n).toFixed(1) + "° travelled since birth" };
    }).filter(Boolean), "transit against natal");
  });
  add("tr.relations", "transit", "Transit aspects to natal",
      "the engine's own list, with orbs", ["edges"], function (C) {
    var rel = C.J && C.J.current_phase && C.J.current_phase.transitRelations;
    if (!rel || !rel.length) return null;
    return edges(rel.map(function (r) {
      var t = liveLon(C, r.transit_graha), n = natalLon(C, r.natal_graha);
      if (t == null || n == null) return null;
      return { a: n, b: t, aLabel: r.natal_graha + " natal",
               bLabel: r.transit_graha + " now",
               why: r.aspect + ", orb " + (r.orb_deg != null
                    ? r.orb_deg.toFixed(2) + "°" : "—") +
                    (r.significance ? " · " + r.significance : "") };
    }).filter(Boolean), "transit aspects");
  });
  SA.forEach(function (sa) {
    add("tr.track." + sa, "transit", sa + " over time",
        "its longitude as a function of the instant", ["series"], function () {
      return series(function (ms) {
        try { return window.__kSidAt(EN[sa], new Date(ms)); }
        catch (e) { return null; }
      }, "°", sa + " longitude", [0, 360]);
    });
  });
  add("tr.elongSeries", "transit", "Elongation over time",
      "Sun to Moon, as the days run", ["series"], function () {
    return series(function (ms) {
      try {
        var m = window.__kSidAt("Moon", new Date(ms));
        var s = window.__kSidAt("Sun", new Date(ms));
        return (m == null || s == null) ? null : norm(m - s);
      } catch (e) { return null; }
    }, "°", "elongation", [0, 360]);
  });

  /* =======================================================================
     What is deliberately NOT here, and why. The page prints this.
     ======================================================================= */
  var ABSENT = [
    { what: "Puṣkara navāṃśa and Puṣkara bhāga",
      why: "needs a classical degree table no source in this build can supply" },
    { what: "Sarvatobhadra Cakra vedha points",
      why: "needs the traditional 9×9 layout; nothing here to read it from" },
    { what: "Jaimini Cara Daśā",
      why: "not implemented in the engine — a real gap, not a missing table" },
    { what: "Varṇada and Śrī Lagna",
      why: "not implemented in the engine" },
    { what: "Ṣaṣṭyāṃśa deity names",
      why: "the D60 division is computed; the sixty deity names are a table this build does not have" },
    { what: "The eight classical gatis by name",
      why: "speed is computed, and retrograde and direct are read straight off it — but the thresholds separating the eight are a table, so the names are not used" },
    { what: "Abhijit as a 28th nakṣatra",
      why: "its boundaries are a particular convention, not an equal division of the circle" },
    { what: "Real constellation figures",
      why: "needs IAU boundary and figure data the repository does not carry" },
    { what: "Śrīpati cusps, upagrahas and the derived points",
      why: "computed on the chart page, not carried in the portable chart object this page reads; re-deriving them here would be a second implementation free to disagree with the first" }
  ];

  var RC = { key: null, map: {} };

  window.SPNodes = {
    all: function () { return N.slice(); },
    byId: function (id) {
      for (var i = 0; i < N.length; i++) if (N[i].id === id) return N[i];
      return null;
    },
    /* RESOLVED VALUES ARE CACHED PER CONTEXT, not per frame.

       A node's value depends only on the context — the chart, the moment, the
       place, the span — and never on the playhead, so re-deriving it sixty
       times a second computes the same number sixty times. Auto mode already
       paid that; Director multiplies it by the number of layers, and some
       nodes are not cheap (a transit track over a century is thousands of
       ephemeris evaluations). The key is every field of the context a node is
       allowed to read, so changing the place or the moment invalidates
       everything, and nothing else does. */
    resolve: function (node, C) {
      if (!node) return null;
      var k = C ? (C.when + "|" + (C.place && C.place.n) + "|" +
                   (C.place && C.place.lat) + "," + (C.place && C.place.lon) + "|" +
                   C.spanDays + "|" + (C.J ? 1 : 0)) : "none";
      if (RC.key !== k) { RC.key = k; RC.map = {}; }
      if (RC.map.hasOwnProperty(node.id)) return RC.map[node.id];
      var v;
      try { v = node.get(C); } catch (e) { v = null; }
      RC.map[node.id] = v;
      return v;
    },
    cacheClear: function () { RC.key = null; RC.map = {}; },
    /* Another file may publish nodes into this registry. sp-cycles.js does,
       because the long-run event cycles it computes are a different kind of
       work from everything here — a root-find over centuries rather than a
       reading of one instant — and keeping them apart means the file that
       holds two hundred one-line nodes stays readable. A duplicate id is
       refused rather than silently shadowing, since two nodes answering to
       one name is a bug nobody would ever find from the symptom. */
    register: function (node) {
      if (!node || !node.id || typeof node.get !== "function") return false;
      for (var i = 0; i < N.length; i++) if (N[i].id === node.id) return false;
      N.push(node);
      RC.key = null;
      return true;
    },
    domains: function () {
      var seen = [];
      N.forEach(function (n) { if (seen.indexOf(n.dom) < 0) seen.push(n.dom); });
      return seen;
    },
    absent: ABSENT,
    vimshottari: vimshottari, antars: antars, currentMd: currentMd,
    SA: SA, EN: EN, RASHI: RASHI, NAK: NAK, LORD: LORD, norm: norm,
    houseOf: houseOf
  };
})();

/* ===== The almanac card — an ornate pañcāṅga leaf =========================

   Everything else this studio draws is a diagram: a ring, a bar, a spiral.
   This one is a PAGE — the printed almanac leaf, with a foliated arch over
   it, scroll-work in the corners, a sun medallion on the crown and the day's
   five limbs set in two columns. It is the only thing here whose job is to be
   beautiful first and legible second, because it is the card somebody keeps.

   DRAWN, NOT PLACED. There is no image file behind any of this. The arch is a
   half-ellipse with cusped foils computed along it; the corner flourishes are
   logarithmic spirals with leaves hung off them; the rosettes, the dividers
   and the nine row icons are all paths. That matters for a reason beyond
   tidiness: the card has to compose itself for any date, any place and any
   shape of frame, and a decorated PNG cannot stretch from 4:5 to 9:16 without
   tearing.

   THE ANIMATION, and what each part of it is for:

     the sun on the crown breathes and its corona turns, which gives the card
       a heartbeat without moving anything a reader is trying to read;

     a band of light sweeps down the leaf once per cycle and lifts each row
       into gold as it crosses it. This is the only part that is really doing
       work: it walks the eye down the five limbs in order, which is the order
       a pañcāṅga is read in, and it means a ten-second reel teaches the
       sequence rather than showing a static poster for ten seconds;

     sparks catch and fade on the gold work, seeded so they do not shimmer at
       random between frames;

     and the whole leaf drifts a fraction of a percent, because a perfectly
       still frame reads as a photograph of a card rather than a card. */

(function () {
  "use strict";

  var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var DEVA = '"Noto Sans Devanagari","Nirmala UI","Mangal",system-ui,sans-serif';
  var R2 = Math.PI / 180;

  /* The leaf has its own palette. The studio's four are for diagrams on a
     dark field; this is a printed page, and the two things it needs — aged
     paper and leaf gold — are not in those. A light studio palette flips the
     leaf to a true paper version rather than forcing navy onto parchment. */
  function inks(P) {
    var light = (P.bg.charCodeAt(1) > 55);   /* a pale background */
    return light ? {
      paper: "#ece0c4", edge: "#c9b98e", panel: "#f7f1e2", panel2: "#efe6d2",
      rule: "#a8842f", gold: "#8a6a1e", goldHi: "#a86f0c", ink: "#4a4232",
      dim: "#857a5e", star: "#8a7d5c", glow: "#b08a2c", dark: false
    } : {
      paper: "#e9ddbf", edge: "#cbb98e", panel: "#0d1430", panel2: "#161f45",
      /* ink and goldHi were #f6f0dd and #fff0c2 — a warm white and a slightly
         warmer white. The sweep lifted each row from one to the other and
         nothing visibly happened. A row at rest is now quiet parchment and a
         row in the light is unmistakably gold. */
      rule: "#c9a24b", gold: "#dcb871", goldHi: "#ffd27a", ink: "#ded5bd",
      dim: "#9d9276", star: "#ffe9b0", glow: "#ffcf72", dark: true
    };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* A foliated arch: a half-ellipse with n cusps riding on it. Sampled rather
     than built from arcs, because the cusps have to sit ON the ellipse and
     the join between an arc and its neighbour is where a hand-built arch goes
     visibly wrong. */
  function archPath(c, cx, baseY, halfW, hgt, foils, bite) {
    var N = 420;
    c.beginPath();
    for (var i = 0; i <= N; i++) {
      var t = i / N;                       /* 0 = left spring, 1 = right */
      var a = Math.PI * (1 - t);           /* π → 0 across the top */
      var scallop = Math.abs(Math.sin(foils * Math.PI * t));
      var rad = 1 - bite * scallop;
      var x = cx + Math.cos(a) * halfW * rad;
      var y = baseY - Math.sin(a) * hgt * rad;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }

  /* A corner scroll: a spiral with leaves. Four of these, mirrored, is what
     reads as "illuminated" without a single imported glyph. */
  function flourish(c, x, y, s, flipX, flipY, I, alpha) {
    c.save();
    c.translate(x, y);
    c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, s * 0.022);
    c.lineCap = "round";
    /* The corner itself: two strokes running along the panel edges that turn
       inward and meet. Without them the scroll floated in the corner like a
       sticker; with them it is a corner piece. */
    c.beginPath();
    c.moveTo(s * 1.55, 0);
    c.lineTo(s * 0.34, 0);
    c.bezierCurveTo(s * 0.12, 0, 0, s * 0.12, 0, s * 0.34);
    c.lineTo(0, s * 1.55);
    c.stroke();
    /* the vine inside it */
    c.beginPath();
    c.moveTo(s * 1.20, s * 0.14);
    c.bezierCurveTo(s * 0.62, s * 0.16, s * 0.30, s * 0.34, s * 0.26, s * 0.76);
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.14, s * 1.20);
    c.bezierCurveTo(s * 0.16, s * 0.62, s * 0.34, s * 0.30, s * 0.76, s * 0.26);
    c.stroke();
    /* the scroll at the elbow */
    c.beginPath();
    for (var i = 0; i <= 90; i++) {
      var t = i / 90, th = t * Math.PI * 2.6;
      var r = s * 0.26 * Math.exp(-0.40 * th);
      var sx = s * 0.52 + Math.cos(th + 2.3) * r;
      var sy = s * 0.52 + Math.sin(th + 2.3) * r;
      if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
    }
    c.stroke();
    /* two small leaves on the vine, not three floating ones */
    [[0.74, 0.22, 0.5], [0.22, 0.74, 1.07]].forEach(function (L) {
      c.beginPath();
      c.ellipse(s * L[0], s * L[1], s * 0.105, s * 0.042, L[2], 0, Math.PI * 2);
      c.stroke();
    });
    c.restore();
  }

  function rosette(c, cx, cy, r, n, I, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, r * 0.09);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      c.beginPath();
      c.ellipse(cx + Math.cos(a) * r * 0.46, cy + Math.sin(a) * r * 0.46,
                r * 0.46, r * 0.20, a, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r * 0.17, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* the sun on the crown: a disc, a corona that turns, and a pulse */
  function sunMedallion(c, cx, cy, r, t, I) {
    c.save();
    /* the rim */
    c.fillStyle = I.dark ? "#121a3c" : "#e8dcbd";
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.5, r * 0.055);
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.stroke();
    /* the corona, turning */
    var puls = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * Math.PI * 0.6);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * Math.PI * 2;
      var len = r * (1.02 + 0.22 * (i % 2 ? 1 : 0.55) * (0.6 + 0.4 * puls));
      c.strokeStyle = I.glow;
      c.globalAlpha = 0.30 + 0.28 * puls;
      c.lineWidth = Math.max(1, r * 0.055);
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
      c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      c.stroke();
    }
    c.restore();
    /* the disc */
    var g = c.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    g.addColorStop(0, "#fff3cf");
    g.addColorStop(0.45, "#f2a73a");
    g.addColorStop(1, "#b5451a");
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r * (0.82 + 0.03 * puls), 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* the Moon at the day's real elongation */
  function moonDisc(c, cx, cy, r, elong, I) {
    c.save();
    c.fillStyle = I.dark ? "#1a2347" : "#ddd2b4";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    var ph = (((elong % 360) + 360) % 360) / 360;
    var k = Math.cos(ph * Math.PI * 2);        /* +1 new, −1 full */
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = "#f3e7c4";
    c.beginPath();
    /* lit limb: a half disc plus an ellipse whose width is the terminator */
    var waxing = ph < 0.5;
    c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
    c.ellipse(cx, cy, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2,
              waxing === (k > 0));
    c.fill();
    c.restore();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.2, r * 0.07);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* --- the nine row icons, all paths ------------------------------------- */
  function icon(c, kind, x, y, s, col) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = col; c.fillStyle = col;
    c.lineWidth = Math.max(1, s * 0.07);
    c.lineJoin = "round"; c.lineCap = "round";
    var i, a;
    if (kind === "lotus") {
      for (i = -2; i <= 2; i++) {
        c.save(); c.rotate(i * 0.42);
        c.beginPath();
        c.ellipse(0, -s * 0.34, s * 0.16, s * 0.40, 0, 0, Math.PI * 2);
        c.stroke(); c.restore();
      }
      c.beginPath(); c.moveTo(-s * 0.55, s * 0.12);
      c.quadraticCurveTo(0, s * 0.42, s * 0.55, s * 0.12); c.stroke();
    } else if (kind === "star") {
      c.beginPath();
      for (i = 0; i < 16; i++) {
        a = i / 16 * Math.PI * 2;
        var r = (i % 2 ? s * 0.22 : s * 0.62);
        var px = Math.cos(a - Math.PI / 2) * r, py = Math.sin(a - Math.PI / 2) * r;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.stroke();
    } else if (kind === "om") {
      c.font = "600 " + Math.round(s * 1.18) + "px " + DEVA;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("ॐ", 0, 0);
    } else if (kind === "orbit") {
      c.beginPath(); c.arc(0, 0, s * 0.30, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.30, -0.4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(s * 0.50, -s * 0.20, s * 0.09, 0, Math.PI * 2); c.fill();
    } else if (kind === "saturn") {
      c.beginPath(); c.arc(0, 0, s * 0.34, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.64, s * 0.20, -0.42, 0, Math.PI * 2); c.stroke();
    } else if (kind === "planet") {
      c.beginPath(); c.arc(0, 0, s * 0.45, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.45, s * 0.17, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.17, s * 0.45, 0, 0, Math.PI * 2); c.stroke();
    } else if (kind === "seal") {
      c.save(); c.rotate(Math.PI / 4);
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84); c.restore();
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
      for (i = 0; i < 8; i++) {
        a = i / 8 * Math.PI * 2;
        c.beginPath();
        c.ellipse(Math.cos(a) * s * 0.17, Math.sin(a) * s * 0.17,
                  s * 0.17, s * 0.08, a, 0, Math.PI * 2);
        c.stroke();
      }
    } else if (kind === "sunrise") {
      c.beginPath(); c.arc(0, s * 0.10, s * 0.32, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.62, s * 0.12); c.lineTo(s * 0.62, s * 0.12); c.stroke();
      for (i = -2; i <= 2; i++) {
        a = -Math.PI / 2 + i * 0.55;
        c.beginPath();
        c.moveTo(Math.cos(a) * s * 0.44, s * 0.10 + Math.sin(a) * s * 0.44);
        c.lineTo(Math.cos(a) * s * 0.62, s * 0.10 + Math.sin(a) * s * 0.62);
        c.stroke();
      }
    } else if (kind === "moon") {
      c.beginPath(); c.arc(0, 0, s * 0.46, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      c.arc(0, 0, s * 0.46, Math.PI / 2, -Math.PI / 2);
      c.ellipse(0, 0, s * 0.18, s * 0.46, 0, -Math.PI / 2, Math.PI / 2, true);
      c.fill();
    }
    c.restore();
  }

  /* deterministic sparks, so they do not jitter between frames */
  function sparks(c, W, H, t, I, n) {
    var seed = 991;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.save();
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var x = rnd() * W, y = rnd() * H, ph = rnd(), sz = 0.4 + rnd() * 0.8;
      var k = Math.sin((t + ph) * Math.PI * 2);
      if (k <= 0) continue;
      var a = k * k * 0.85, s = sz * W * 0.006 * (0.6 + 0.6 * k);
      c.globalAlpha = a; c.strokeStyle = I.star;
      c.lineWidth = Math.max(0.8, W * 0.0013);
      c.beginPath();
      c.moveTo(x - s, y); c.lineTo(x + s, y);
      c.moveTo(x, y - s); c.lineTo(x, y + s);
      c.stroke();
    }
    c.restore();
  }

  var FITCACHE = {}, FITN = 0;

  /* The leaf's still layers, drawn once and kept.

     The paper, the panel, the star field, the constellation arcs, the gold
     rules, the arch and the four corner pieces do not change from frame to
     frame — between them they are several hundred paths and about a thousand
     sampled points, and redrawing them sixty times a second to put a moving
     band of light on top was most of what made this card cost six times what
     any other composer costs. They are rendered once into an offscreen canvas
     keyed by size and palette, and blitted.

     The drift is applied when blitting rather than when drawing, so the whole
     leaf still moves. */
  var BACK = null;

  /* Everything that never changes between frames, drawn once into `BACK`. */
  function buildBack(W, H, P, I) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    var m = W * 0.052, pr = W * 0.030;
    var px = m, py = m * (H / W) * 0.62, pw = W - m * 2, ph = H - py * 2;
    /* 1 — the paper */
    c.fillStyle = I.paper; c.fillRect(-W, -H, W * 3, H * 3);
    var vg = c.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, I.dark ? "rgba(40,28,8,0.30)" : "rgba(90,70,30,0.18)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);

    /* 2 — the panel */
    c.save();
    rr(c, px, py, pw, ph, pr);
    var pg = c.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, I.panel); pg.addColorStop(1, I.panel2);
    c.fillStyle = pg; c.fill();
    c.restore();

    /* 3 — the faint sky inside it */
    c.save();
    rr(c, px, py, pw, ph, pr); c.clip();
    var seed = 7717;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.globalAlpha = I.dark ? 0.55 : 0.25;
    for (var i = 0; i < 170; i++) {
      c.fillStyle = I.star;
      c.globalAlpha = (I.dark ? 0.18 : 0.10) + rnd() * 0.35;
      var sx = px + rnd() * pw, sy = py + rnd() * ph, sr = rnd() * W * 0.0022 + W * 0.0006;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
    }
    /* constellation arcs — the printed star-chart under the text */
    c.globalAlpha = I.dark ? 0.085 : 0.06;
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1, W * 0.0012);
    for (var k = 0; k < 7; k++) {
      var ccx = px + rnd() * pw, ccy = py + rnd() * ph, crr = pw * (0.12 + rnd() * 0.38);
      c.beginPath(); c.arc(ccx, ccy, crr, rnd() * 6, rnd() * 6 + 2); c.stroke();
    }
    c.restore();

    /* 4 — the gold double rule */
    c.save();
    c.strokeStyle = I.rule;
    c.globalAlpha = 0.95; c.lineWidth = Math.max(2, W * 0.0040);
    rr(c, px, py, pw, ph, pr); c.stroke();
    c.globalAlpha = 0.55; c.lineWidth = Math.max(1, W * 0.0018);
    rr(c, px + W * 0.012, py + W * 0.012, pw - W * 0.024, ph - W * 0.024, pr * 0.8);
    c.stroke();
    c.restore();

    /* 5 — the arch and the corner scrolls.

       The first cut drew the arch at a tenth of the panel height in a thin
       half-transparent line and it simply could not be seen: the card read as
       a plain box with text in it. An arch is the whole reason the head looks
       like a leaf from an almanac rather than a slide, so it is drawn heavy,
       it springs from the panel's own sides, and the head sits INSIDE it. */
    /* Taller and narrower than the first cut, which spanned the whole panel
       at a sixth of its height and read as a shallow dish. And the crown is
       placed from the PANEL TOP rather than from the apex, because an apex
       computed from a height is free to walk off the top of the frame — which
       is exactly what it did, clipping the sun's corona at every ratio. */
    /* The arch has to ENCLOSE the head, not cross it. Deriving the base from
       the apex put the springing line below the date, so the curve ran
       straight through "19 October 2026". Both ends are fixed instead: the
       apex sits where the crown sits, the springing line sits just above the
       divider, and the height is whatever that leaves. The crown straddles
       the panel's top edge, which is where it belongs on a printed leaf. */
    var archBase = py + ph * 0.212;
    var sunCy = py + ph * 0.045, sunR = W * 0.048;
    var archTop = archBase - sunCy;
    c.save();
    /* a wash under the arch, so the head reads as a recessed niche */
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.lineTo(px + pw * 0.030, py + W * 0.012);
    c.lineTo(px + pw * 0.970, py + W * 0.012);
    c.closePath();
    c.fillStyle = I.dark ? "rgba(255,221,150,0.045)" : "rgba(120,92,28,0.055)";
    c.fill();
    c.strokeStyle = I.rule; c.globalAlpha = 1;
    c.lineWidth = Math.max(2.4, W * 0.0046);
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.stroke();
    c.globalAlpha = 0.62; c.lineWidth = Math.max(1.2, W * 0.0022);
    archPath(c, W / 2, archBase - W * 0.017, pw * 0.396, archTop * 0.900, 9, 0.105);
    c.stroke();
    c.restore();
    var fs = pw * 0.105, fo = W * 0.030;
    flourish(c, px + fo, py + fo, fs, false, false, I, 0.60);
    flourish(c, px + pw - fo, py + fo, fs, true, false, I, 0.60);
    flourish(c, px + fo, py + ph - fo, fs, false, true, I, 0.60);
    flourish(c, px + pw - fo, py + ph - fo, fs, true, true, I, 0.60);

    return { cv: cv, px: px, py: py, pw: pw, ph: ph,
             archBase: archBase, sunCy: sunCy, sunR: sunR, archTop: archTop };
  }

  /* ---- the card ---------------------------------------------------------- */
  /* A is the packaged day; see the almanac node in sp-nodes.js. */
  function draw(c, W, H, A, p, P, opts) {
    opts = opts || {};
    var I = inks(P);
    var U = W;

    /* the drift: a fraction of a percent, which is the difference between a
       card and a photograph of a card */
    var dz = 1 + 0.010 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
    var dy = H * 0.004 * Math.sin(p * Math.PI * 2);
    c.save();
    c.translate(W / 2, H / 2); c.scale(dz, dz); c.translate(-W / 2, -H / 2 + dy);

    /* the still layers, built once and kept */
    var key = W + "x" + H + "|" + P.key;
    if (!BACK || BACK.key !== key) {
      BACK = buildBack(W, H, P, I);
      BACK.key = key;
    }
    c.drawImage(BACK.cv, 0, 0);
    var px = BACK.px, py = BACK.py, pw = BACK.pw, ph = BACK.ph;
    var archBase = BACK.archBase, sunCy = BACK.sunCy, sunR = BACK.sunR;

    /* 6 — the crown, sitting on the apex rather than off the top edge */
    sunMedallion(c, W / 2, sunCy, sunR, p, I);

    /* ---- type ----------------------------------------------------------- */
    function txt(s, x, y, size, col, align, weight, font) {
      if (s == null || s === "") return;
      c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
      c.font = (weight || 600) + " " + Math.round(size) + "px " + (font || SANS);
      c.fillText(String(s), x, y);
    }
    /* memoised for the reason given in sp-compose.js: the leaf makes about
       twenty of these calls a frame and each one can cost twenty-two text
       measurements, which no card's content changes between frames to
       justify */
    function fit(s, size, maxW, weight, font) {
      var key = (font === SERIF ? "s" : "n") + (weight || 600) + "|" +
                Math.round(size) + "|" + Math.round(maxW) + "|" + s;
      var hit = FITCACHE[key];
      if (hit !== undefined) return hit;
      var f = size;
      for (var z = 0; z < 22; z++) {
        c.font = (weight || 600) + " " + Math.round(f) + "px " + (font || SANS);
        if (c.measureText(String(s)).width <= maxW) break;
        f *= 0.95;
      }
      if (++FITN > 900) { FITCACHE = {}; FITN = 0; }
      FITCACHE[key] = f;
      return f;
    }
    function txtFit(s, x, y, size, col, align, weight, maxW, font) {
      txt(s, x, y, fit(s, size, maxW, weight, font), col, align, weight, font);
    }

    txt("Nirayana — निरयन", W / 2, py + ph * 0.072,
        U * 0.027, I.gold, "center", 500, SERIF);

    /* the moon disc and the date share a line */
    var dateY = py + ph * 0.118;
    moonDisc(c, px + pw * 0.175, dateY, W * 0.052, A.elongation, I);
    txtFit(A.dateLine, W / 2 + pw * 0.055, dateY, U * 0.078, I.goldHi, "center",
           600, pw * 0.66, SERIF);
    txtFit(A.subLine, W / 2 + pw * 0.055, dateY + ph * 0.040, U * 0.0245,
           I.gold, "center", 500, pw * 0.70, SERIF);

    /* the divider under the head */
    function divider(y, big) {
      c.save();
      c.strokeStyle = I.rule; c.globalAlpha = big ? 0.85 : 0.55;
      c.lineWidth = Math.max(1, W * (big ? 0.0022 : 0.0014));
      var x0 = px + pw * 0.055, x1 = px + pw * 0.945, gap = pw * (big ? 0.085 : 0.030);
      c.beginPath();
      c.moveTo(x0, y); c.lineTo(W / 2 - gap, y);
      c.moveTo(W / 2 + gap, y); c.lineTo(x1, y);
      c.stroke();
      if (big) {
        c.beginPath();
        c.moveTo(W / 2 - gap * 0.55, y); c.lineTo(W / 2 - gap * 0.18, y);
        c.moveTo(W / 2 + gap * 0.18, y); c.lineTo(W / 2 + gap * 0.55, y);
        c.stroke();
      }
      /* the star at the centre */
      c.globalAlpha = 0.95; c.fillStyle = I.rule;
      var s4 = W * (big ? 0.013 : 0.009);
      c.beginPath();
      c.moveTo(W / 2, y - s4); c.lineTo(W / 2 + s4 * 0.34, y);
      c.lineTo(W / 2, y + s4); c.lineTo(W / 2 - s4 * 0.34, y);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(W / 2 - s4, y); c.lineTo(W / 2, y - s4 * 0.34);
      c.lineTo(W / 2 + s4, y); c.lineTo(W / 2, y + s4 * 0.34);
      c.closePath(); c.fill();
      c.restore();
    }
    divider(py + ph * 0.234, true);

    /* ---- the rows -------------------------------------------------------
       The sweep lifts a row into gold as it crosses. Its position is the
       playhead, held at each row a moment longer than the gaps between them
       so the eye has time — a linear sweep across five rows reads as a wipe
       rather than as reading. */
    var top = py + ph * 0.256, bottom = py + ph * 0.952;
    var rows = A.rows;
    var band = (bottom - top) / rows.length;
    var sweepY = top + (bottom - top) * ((p * 1.18) % 1);

    rows.forEach(function (row, ri) {
      var y = top + band * ri;
      if (ri > 0) divider(y, false);
      var cy = y + band * 0.50;
      /* The window was six tenths of a row and squared, which left the
         brightest row at a third of full and nothing ever looked lit. It is a
         whole row wide now and eased rather than squared, so exactly one row
         is unmistakably in the light at any moment and the next is coming up. */
      var hot = Math.max(0, 1 - Math.abs(cy - sweepY) / (band * 1.00));
      hot = hot * hot * (3 - 2 * hot);
      var cols = row.cols;
      cols.forEach(function (col, ci) {
        var full = cols.length === 1;
        var cx = full ? px + pw * 0.14 : px + pw * (ci === 0 ? 0.135 : 0.555);
        var wid = full ? pw * 0.80 : pw * 0.335;
        var ix = cx - pw * 0.065;
        icon(c, col.icon, ix, cy - band * 0.02, U * 0.030,
             hot > 0.3 ? I.goldHi : I.rule);
        txt(col.label, cx, cy - band * 0.235, U * 0.0235,
            hot > 0.3 ? I.goldHi : I.dim, "left", 600, SERIF);
        c.save();
        if (hot > 0.3 && I.dark) {
          c.shadowColor = "rgba(255,200,110," + (0.75 * hot).toFixed(2) + ")";
          c.shadowBlur = U * 0.022 * hot;
        }
        txtFit(col.value, cx, cy - band * 0.055, U * 0.049,
               hot > 0.3 ? I.goldHi : I.ink, "left", 600, wid, SERIF);
        c.restore();
        if (col.detail)
          txtFit(col.detail, cx, cy + band * (col.detail2 ? 0.130 : 0.175),
                 U * 0.0230, hot > 0.4 ? I.gold : I.dim, "left", 500,
                 full ? pw * 0.80 : wid * 1.08, SERIF);
        if (col.detail2)
          txtFit(col.detail2, cx, cy + band * 0.265, U * 0.0230,
                 hot > 0.4 ? I.gold : I.dim, "left", 500, pw * 0.80, SERIF);
      });
      /* the light itself, over the row it is on */
      if (hot > 0.02) {
        c.save();
        c.globalCompositeOperation = "lighter";
        var lg = c.createLinearGradient(px, 0, px + pw, 0);
        lg.addColorStop(0, "rgba(255,210,120,0)");
        lg.addColorStop(0.5, "rgba(255,221,150," + (0.60 * hot).toFixed(3) + ")");
        lg.addColorStop(1, "rgba(255,210,120,0)");
        c.fillStyle = lg;
        c.fillRect(px, cy - band * 0.46, pw, band * 0.085);
        c.restore();
      }
    });

    /* 7 — the sparks, last so they sit on top of the gold */
    sparks(c, W, H, p, I, 46);

    if (opts.foot)
      txt(opts.foot, W / 2, py + ph * 0.985, U * 0.020, I.dim, "center", 500, SERIF);
    c.restore();
  }

  window.SPAlmanac = { draw: draw, inks: inks };
})();

/* ===== Studio Pro — the stage, and the composers =========================

   HOW A SELECTION BECOMES A PICTURE. The registry hands this file values with
   declared shapes and no idea what they mean. Each composer here declares
   which shapes it can consume and scores itself against a selection; the best
   score draws. That is the whole mechanism, and it is what makes the page
   combinatorial rather than a gallery: a composer that draws "two longitudes
   and the angle between them" draws the Sun and the Moon, Lagna and the
   Arūḍha, a daśā lord and its dispositor, or a transiting graha and its own
   natal place, without knowing that any of those things exist.

   SCORING, AND WHY IT IS HONEST ABOUT WHAT IT DROPS. A composer scores by how
   much of the selection it consumes. The winner is the one that consumes most,
   and the stage PRINTS WHATEVER IT COULD NOT USE. A studio that quietly
   ignored half a selection would teach its user nothing about why the picture
   looks wrong; one that says "these three are drawn, this one has no place in
   this view, try Layers" is a studio.

   THE LAYERS COMPOSER is what guarantees every combination renders. When the
   selection is too heterogeneous for any single view, Layers splits the stage
   into panels and runs the best sub-composer in each. It always scores above
   zero, so there is no such thing as a selection that draws nothing.

   THE RECORDER. A second implementation of frame-accurate capture, the first
   being the motion pane's on the chart page. The two cannot share code — one
   is inside the report bundle and this page does not load it — so they are
   held together the same way the Viṃśottarī is: a test asserts a recording
   made here lasts the length it advertises, exactly as reel-duration.mjs
   asserts it there. */

(function () {
  "use strict";

  var PALS = {
    midnight: { key: "midnight", label: "Midnight", bg: "#0b1020", bg2: "#161d3a",
      ink: "#f2efe4", dim: "#8f96bb", line: "#2b3358", gold: "#d9b668",
      ben: "#5fbf8f", mal: "#e07a60", star: "#dfe6ff", glow: "#6f7cc0" },
    eclipse: { key: "eclipse", label: "Eclipse", bg: "#000000", bg2: "#0a0a0f",
      ink: "#ffffff", dim: "#9a9a9a", line: "#2a2a33", gold: "#ffc83d",
      ben: "#4dffa6", mal: "#ff6b4a", star: "#ffffff", glow: "#ffb02e" },
    parchment: { key: "parchment", label: "Parchment", bg: "#f7f3e8", bg2: "#eee7d6",
      ink: "#1d2340", dim: "#6c7089", line: "#d8d0ba", gold: "#a17c2a",
      ben: "#2f7d55", mal: "#b5533c", star: "#4a5078", glow: "#c9a24b" },
    ink: { key: "ink", label: "Ink", bg: "#101014", bg2: "#1a1a20", ink: "#ece9e2",
      dim: "#8b8b96", line: "#2e2e38", gold: "#c9a227", ben: "#6fb08a",
      mal: "#c96f55", star: "#d8d8e4", glow: "#7f8aa8" }
  };
  var RATIOS = {
    "9:16": { w: 1080, h: 1920, label: "Story / Reel" },
    "4:5":  { w: 1080, h: 1350, label: "Feed post" },
    "1:1":  { w: 1080, h: 1080, label: "Square" }
  };
  /* Instagram covers these strips with its own chrome. Measured as fractions
     of the frame so they hold at every ratio. */
  var SAFE = { top: 0.14, bottom: 0.20, right: 0.14 };
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var R2 = Math.PI / 180;

  var S = {
    pal: "midnight", ratio: "9:16", safe: true, speed: 1, p: 0, tile: false,
    /* The render size as a fraction of the export size. The stage preview is
       about three hundred CSS pixels wide; rendering it at 1080 was six times
       the pixels anyone could see, and at twenty milliseconds a frame it was
       most of the reason playback ran at four frames a second on a phone.
       Export always goes back to 1 — see withFullSize. */
    quality: 1,
    ctx: null, cv: null, W: 1080, H: 1920, U: 1080,
    headline: "", sub: "", handle: "@Nirayana.Soft"
  };

  function pal() { return PALS[S.pal] || PALS.midnight; }
  function norm(x) { return ((x % 360) + 360) % 360; }

  /* ---- text -------------------------------------------------------------- */
  function txt(s, x, y, size, col, align, weight) {
    if (s == null || s === "") return;
    var c = S.ctx;
    c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
    c.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    c.fillText(String(s), x, y);
  }
  /* The size at which a line finally fits a width — a centred line that does
     not fit loses the same number of words at each end, which is the one
     failure that reads as deliberate.

     MEMOISED, because it is the single most expensive thing on the page. Each
     call can run twenty measureText probes, a frame can carry twenty such
     calls, and the answer depends only on the string, the starting size, the
     width and the weight — none of which change between frames of the same
     card. Four hundred text measurements per frame was most of the reason the
     almanac cost six times what any other composer costs. */
  var FITS = {}, FITN = 0;
  function fit(s, size, maxW, weight) {
    var key = (weight || 600) + "|" + Math.round(size) + "|" + Math.round(maxW) + "|" + s;
    var hit = FITS[key];
    if (hit !== undefined) return hit;
    var c = S.ctx, f = size;
    for (var i = 0; i < 20; i++) {
      c.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (c.measureText(String(s)).width <= maxW) break;
      f *= 0.94;
    }
    /* an unbounded cache on a page that can scrub through a year of dates
       would grow without end; this is a cache, not a ledger */
    if (++FITN > 1200) { FITS = {}; FITN = 0; }
    FITS[key] = f;
    return f;
  }
  function txtFit(s, x, y, size, col, align, weight, maxW) {
    txt(s, x, y, fit(s, size, maxW, weight), col, align, weight);
  }
  /* wrap into at most `lines` rows, returning how many it used */
  function wrap(s, x, y, size, col, maxW, lines, lh) {
    var c = S.ctx, words = String(s).split(/\s+/), row = "", out = [];
    c.font = "500 " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    out.forEach(function (r, i) { txt(r, x, y + i * (lh || size * 1.35), size, col, "center", 500); });
    return out.length;
  }

  /* Breaking a string into rows WITHOUT drawing it, so a caller that needs to
     know how tall a block will be before it places it does not have to draw
     the block off-screen to find out. wrap() above draws as it goes and is
     centred at weight 500 by choice — that is the diagram caption, and the
     two are kept separate rather than one being bent into the other. */
  function wrapLines(s, size, maxW, lines, weight) {
    var c = S.ctx, words = String(s == null ? "" : s).split(/\s+/);
    var row = "", out = [];
    c.font = (weight || 500) + " " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    return out;
  }

  /* ---- the frame --------------------------------------------------------- */
  function stage() {
    var topPad = S.safe ? S.H * SAFE.top : S.H * 0.045;
    var botPad = S.safe ? S.H * SAFE.bottom : S.H * 0.045;
    var side = S.safe ? S.W * SAFE.right * 0.55 : S.W * 0.055;
    /* the caption band sits inside the bottom pad when the strips are off */
    var band = S.H * 0.115;
    return { x: side, y: topPad, w: S.W - side * 2, h: S.H - topPad - botPad - band,
             cx: S.W / 2, cy: topPad + (S.H - topPad - botPad - band) / 2,
             bandY: S.H - botPad - band, bandH: band, side: side };
  }
  function background() {
    var c = S.ctx, P = pal();
    var g = c.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, S.W, S.H);
  }
  /* a fixed star field, seeded so it does not shimmer between frames */
  var STARS = null;
  function stars() {
    var c = S.ctx, P = pal();
    if (!STARS || STARS.w !== S.W || STARS.h !== S.H) {
      var seed = 20260101, pts = [];
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var i = 0; i < 150; i++)
        pts.push({ x: rnd() * S.W, y: rnd() * S.H, r: rnd() * 1.6 + 0.4, a: rnd() * 0.5 + 0.12 });
      STARS = { w: S.W, h: S.H, pts: pts };
    }
    c.save();
    STARS.pts.forEach(function (s) {
      c.globalAlpha = s.a; c.fillStyle = P.star;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  function captionBand(title, sub) {
    var c = S.ctx, P = pal(), st = stage();
    if (S.tile) {
      /* one line, no rule, no handle: a thumbnail wants to say what it is
         and nothing else */
      txtFit(title || "", S.W / 2, st.bandY + st.bandH * 0.42,
             S.W * 0.054, P.ink, "center", 700, S.W * 0.90);
      return;
    }
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.6;
    c.lineWidth = Math.max(1.5, S.W * 0.0018);
    c.beginPath(); c.moveTo(0, st.bandY); c.lineTo(S.W, st.bandY); c.stroke();
    c.restore();
    var y = st.bandY + st.bandH * 0.30;
    txtFit(title || "", S.W / 2, y, S.W * 0.042, P.ink, "center", 700, S.W * 0.86);
    if (sub) wrap(sub, S.W / 2, y + st.bandH * 0.30, S.W * 0.021, P.dim, S.W * 0.84, 2);
    txt(S.handle, S.W - st.side, st.bandY + st.bandH * 0.86, S.W * 0.021, P.dim, "right", 500);
  }
  function safeGuides() {
    if (!S.safe || S.tile) return;
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.14;
    c.setLineDash([10, 10]); c.lineWidth = 2;
    c.strokeRect(S.W * SAFE.right * 0.25, S.H * SAFE.top,
                 S.W - S.W * SAFE.right * 1.1, S.H * (1 - SAFE.top - SAFE.bottom));
    c.restore();
  }

  /* ---- drawing primitives the composers share ---------------------------- */
  function ringTicks(cx, cy, r, n, alpha, len) {
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.dim; c.globalAlpha = alpha == null ? 0.4 : alpha;
    c.lineWidth = Math.max(1, S.U * 0.0013);
    for (var i = 0; i < n; i++) {
      var a = (i * 360 / n - 90) * R2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * (1 + (len || 0.07)), cy + Math.sin(a) * r * (1 + (len || 0.07)));
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function marker(cx, cy, r, deg, label, tone, size) {
    var c = S.ctx, P = pal();
    var col = tone === "gold" ? P.gold : (tone === "dim" ? P.dim : P.glow);
    var a = (deg - 90) * R2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    c.save();
    c.strokeStyle = col; c.globalAlpha = 0.5;
    c.lineWidth = Math.max(1, S.U * 0.0016);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    c.globalAlpha = 1; c.fillStyle = col;
    c.beginPath(); c.arc(x, y, Math.max(3, S.U * (size || 0.0055)), 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (label) {
      var lx = cx + Math.cos(a) * r * 1.17, ly = cy + Math.sin(a) * r * 1.17;
      txt(label, lx, ly, S.U * 0.020, col, "center", 700);
    }
    return { x: x, y: y, a: a };
  }
  function arcBand(cx, cy, r, from, to, col, alpha, width) {
    var c = S.ctx;
    c.save();
    c.strokeStyle = col; c.globalAlpha = alpha == null ? 0.35 : alpha;
    c.lineWidth = width || Math.max(6, S.U * 0.016);
    c.beginPath();
    c.arc(cx, cy, r, (from - 90) * R2, (to - 90) * R2);
    c.stroke();
    c.restore();
  }
  /* a readout line: what a longitude is, in every division that names it */
  function placeWords(deg) {
    var NK = window.SPNodes.NAK, RS = window.SPNodes.RASHI;
    var d = norm(deg);
    var ni = Math.floor(d / (40 / 3));
    var pada = Math.floor((d % (40 / 3)) / (10 / 3)) + 1;
    return RS[Math.floor(d / 30)] + " " + (d % 30).toFixed(2) + "°   ·   " +
           NK[ni] + " pāda " + pada;
  }

  /* =======================================================================
     THE COMPOSERS
     Each declares `score(bag)` — how many selected items it can consume, or
     -1 for "cannot draw this at all" — and `draw(bag, p, st)`.
     ======================================================================= */
  /* How much of item i, of n, is drawn at playhead p.

     Every composer used to animate by revealing one more item per step, which
     does exactly nothing when the selection holds one item: a single bar, a
     single chord, one ring. Five of the sampled selections rendered four
     identical frames for that reason — a still presented as an animation.

     This gives each item its own 0→1 growth, staggered across the set, so a
     set of twenty reveals in sequence AND a set of one still grows. The last
     item finishes before the playhead does, so the final frame is the whole
     picture rather than something caught mid-build. */
  function grow(p, i, n) {
    var stagger = n > 1 ? 0.55 : 0;
    var start = n > 1 ? (i / n) * stagger : 0;
    var len = 1 - stagger;
    var f = (Math.min(1, p / 0.92) - start) / len;
    return f <= 0 ? 0 : (f >= 1 ? 1 : f * f * (3 - 2 * f));
  }

  var COMPOSERS = [];
  function composer(key, label, blurb, score, draw) {
    COMPOSERS.push({ key: key, label: label, blurb: blurb, score: score, draw: draw });
  }
  function count(bag, kind) { return (bag[kind] || []).length; }
  function all(bag) {
    var n = 0;
    for (var k in bag) if (bag.hasOwnProperty(k)) n += bag[k].length;
    return n;
  }

  /* --- 1. one longitude, placed ----------------------------------------- */
  composer("mark", "Pointer on the ring",
    "one longitude, with every division that names it",
    function (bag) {
      return (count(bag, "lon") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), v = bag.lon[0].v;
      var r = Math.min(st.w * 0.40, st.h * 0.34);
      var cy = st.y + st.h * 0.40;
      ringTicks(st.cx, cy, r, 27, 0.35);
      ringTicks(st.cx, cy, r * 0.90, 12, 0.5, 0.045);
      /* the pointer sweeps up to its place, so the frame has motion even for
         a single static value */
      var ease = p < 0.6 ? (p / 0.6) : 1;
      marker(st.cx, cy, r, v.deg * ease, v.label, v.tone, 0.007);
      txt(v.label, st.cx, cy, S.U * 0.030, P.ink, "center", 700);
      txt(norm(v.deg).toFixed(3) + "°", st.cx, cy + S.U * 0.038,
          S.U * 0.024, P.gold, "center", 600);
      txtFit(placeWords(v.deg), st.cx, cy + r * 1.42, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      if (v.arc)
        arcBand(st.cx, cy, r * 0.96, v.arc.from, v.arc.to, P.gold, 0.25);
    });

  /* --- 2. two longitudes and the angle between them ---------------------- */
  composer("angle", "The angle between",
    "two longitudes, the arc, and the subtraction that gives it",
    function (bag) {
      return (count(bag, "lon") === 2 && all(bag) === 2) ? 2 : -1;
    },
    function (bag, p, st) {
      var P = pal(), a = bag.lon[0].v, b = bag.lon[1].v;
      var r = Math.min(st.w * 0.38, st.h * 0.32);
      var cy = st.y + st.h * 0.37;
      ringTicks(st.cx, cy, r, 12, 0.4);
      var d = norm(b.deg - a.deg);
      var shown = d * (p < 0.7 ? p / 0.7 : 1);
      arcBand(st.cx, cy, r * 0.82, a.deg, a.deg + shown, P.gold, 0.40);
      marker(st.cx, cy, r, a.deg, a.label, a.tone);
      marker(st.cx, cy, r, b.deg, b.label, b.tone);
      txt(d.toFixed(3) + "°", st.cx, cy, S.U * 0.040, P.gold, "center", 700);
      var short = d > 180 ? 360 - d : d;
      txt(short.toFixed(2) + "° the short way", st.cx, cy + S.U * 0.038,
          S.U * 0.019, P.dim, "center", 500);
      var y = cy + r * 1.36;
      txtFit(b.label + " " + norm(b.deg).toFixed(2) + "°  −  " +
             a.label + " " + norm(a.deg).toFixed(2) + "°  =  " + d.toFixed(2) + "°",
             st.cx, y, S.U * 0.021, P.ink, "center", 600, st.w * 0.95);
      /* any classical relation the separation satisfies, named */
      var rel = [];
      if (short < 1) rel.push("within a degree — a graha yuddha");
      if (Math.abs(d - 180) < 6) rel.push("opposition — the seventh");
      if (Math.abs(short - 120) < 6) rel.push("trine — the fifth and ninth");
      if (Math.abs(short - 90) < 6) rel.push("square — the fourth and tenth");
      if (Math.abs(short - 60) < 6) rel.push("sextile — the third and eleventh");
      if (short < 12) rel.push("same tithi-width of each other");
      txtFit(rel.length ? rel.join("   ·   ") : "no classical aspect at this separation",
             st.cx, y + S.U * 0.038, S.U * 0.019,
             rel.length ? P.gold : P.dim, "center", 500, st.w * 0.95);
    });

  /* --- 3. several longitudes, and what relates them ---------------------- */
  composer("web", "The ring, with everything on it",
    "every selected point placed, and the relations between them drawn",
    function (bag) {
      var n = count(bag, "lon") + count(bag, "lonset");
      if (n === 0) return -1;
      if (all(bag) !== n) return -1;
      /* A set is always welcome here however few points it holds. Demanding
         three left a one-member set — "the vargottama grahas", of which a
         chart may have exactly one — with no composer anywhere, so it fell to
         Layers and Layers drew nothing. Loose longitudes still need three,
         because one is `mark` and two are `angle`, both of which say more. */
      if (count(bag, "lonset") === 0) {
        var pts = count(bag, "lon");
        if (pts < 3) return -1;
      }
      return n;
    },
    function (bag, p, st) {
      var P = pal();
      var pts = [];
      (bag.lon || []).forEach(function (x) {
        pts.push({ deg: x.v.deg, label: x.v.label, tone: x.v.tone }); });
      (bag.lonset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          pts.push({ deg: it.deg, label: it.label, tone: it.tone }); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.36;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      ringTicks(st.cx, cy, r * 1.08, 27, 0.22, 0.03);
      /* chords between any pair within six degrees of a classical angle */
      var ANG = [[180, "opposition"], [120, "trine"], [90, "square"], [60, "sextile"]];
      var shown = Math.max(1, Math.round(pts.length * Math.min(1, p * 1.4)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < shown; i++) for (var j = i + 1; j < shown; j++) {
        var d = norm(pts[j].deg - pts[i].deg); if (d > 180) d = 360 - d;
        var hit = null;
        ANG.forEach(function (A) { if (Math.abs(d - A[0]) < 6) hit = A; });
        if (!hit) continue;
        var a1 = (pts[i].deg - 90) * R2, a2 = (pts[j].deg - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.30;
        c.lineWidth = Math.max(1, S.U * 0.0018);
        c.beginPath();
        c.moveTo(st.cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
        c.lineTo(st.cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        c.stroke();
      }
      c.restore();
      for (var k = 0; k < shown; k++)
        marker(st.cx, cy, r, pts[k].deg, pts[k].label, pts[k].tone, 0.0048);
      txt(shown + " of " + pts.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      /* count the relations rather than asserting them */
      var rels = 0;
      for (var a = 0; a < pts.length; a++) for (var b2 = a + 1; b2 < pts.length; b2++) {
        var dd = norm(pts[b2].deg - pts[a].deg); if (dd > 180) dd = 360 - dd;
        ANG.forEach(function (A) { if (Math.abs(dd - A[0]) < 6) rels++; });
      }
      txtFit(rels ? rels + " pairs sit within 6° of a classical angle"
                  : "no pair here sits within 6° of a classical angle",
             st.cx, cy + r * 1.40, S.U * 0.021, rels ? P.gold : P.dim,
             "center", 600, st.w * 0.95);
    });

  /* --- 4. a point inside a division -------------------------------------
     A REAL magnification, not a highlight.

     The first version drew the full circle and shaded the arc the point fell
     in. It was correct and it was not a zoom: the picture stayed at one scale
     throughout, so "13°20′ wide" was a caption rather than something seen.

     Here the ring is drawn through a magnifying map — screen angle is the true
     angle measured from the centre of the target arc and multiplied by a
     magnification that climbs from 1 to 360/span. At the end the chosen arc
     fills the whole circle, its own subdivisions are legible across it, and
     the rest of the zodiac has been pushed off the edge. Three stages run in
     sequence: the whole ecliptic, the rāśi, then the division asked for. */
  composer("zoom", "Deep zoom",
    "a longitude magnified down through a division until it fills the ring",
    function (bag) {
      return (count(bag, "lon") >= 1 && count(bag, "lanes") === 1 &&
              all(bag) === count(bag, "lon") + 1)
        ? count(bag, "lon") + 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), L = bag.lanes[0].v, v = bag.lon[0].v;
      var d = norm(v.deg);
      var cy = st.y + st.h * 0.36;
      var r = Math.min(st.w * 0.38, st.h * 0.30);
      var signIdx = Math.floor(d / 30);

      /* the three windows, outermost first */
      var levels = [{ from: 0, to: 360, cap: "the whole ecliptic",
                      sub: "360°", n: 12, names: window.SPNodes.RASHI }];
      levels.push({ from: signIdx * 30, to: signIdx * 30 + 30,
                    cap: window.SPNodes.RASHI[signIdx], sub: "30°",
                    n: L.of === "sign" ? L.n : 9, names: null });
      var aFrom, aTo, cap3, n3, nm3;
      if (L.of === "sign") {
        var within = d - signIdx * 30, li = Math.floor(within / L.size);
        aFrom = signIdx * 30 + li * L.size; aTo = aFrom + L.size;
        cap3 = L.label + " " + (li + 1) + " of " + L.n;
        n3 = 4; nm3 = null;
      } else {
        var gi = Math.floor(d / L.size);
        aFrom = gi * L.size; aTo = aFrom + L.size;
        cap3 = (L.names && L.names[gi]) ? L.names[gi] : (L.label + " " + (gi + 1));
        n3 = 4; nm3 = null;   /* quarters: a pāda is a quarter of a nakṣatra */
      }
      levels.push({ from: aFrom, to: aTo, cap: cap3,
                    sub: (aTo - aFrom).toFixed(3) + "°", n: n3, names: nm3 });

      /* where the playhead sits between the three windows */
      var t = Math.min(2.999, p * 3), li2 = Math.floor(t), f = t - li2;
      var A = levels[li2], B = levels[Math.min(2, li2 + 1)];
      /* interpolate the WINDOW, in log of its width, so the magnification
         climbs smoothly rather than lurching at each step */
      var wA = A.to - A.from, wB = B.to - B.from;
      var w = Math.exp(Math.log(wA) + (Math.log(wB) - Math.log(wA)) * f);
      var cA = A.from + wA / 2, cB = B.from + wB / 2;
      var cen = cA + (cB - cA) * f;
      var mag = 360 / w;

      /* map a true longitude to its place on the magnified ring; null when it
         has been pushed outside the window */
      function M(deg) {
        var off = norm(deg - cen); if (off > 180) off -= 360;
        var a = off * mag;
        return (a < -180 || a > 180) ? null : a;
      }
      var c = S.ctx;
      /* the division ticks that are visible at this magnification: draw the
         finest division whose ticks are still further apart than a degree
         on screen */
      var DIVS = [[12, "rāśi"], [27, "nakṣatra"], [108, "pāda"],
                  [L.of === "sign" ? L.n * 12 : L.n, L.label]];
      c.save();
      DIVS.forEach(function (D, di) {
        var step = 360 / D[0];
        if (step * mag < 2.2) return;            /* too fine to resolve */
        if (step * mag > 400) return;            /* only one tick in view */
        c.strokeStyle = di === 3 ? P.gold : P.dim;
        c.globalAlpha = di === 3 ? 0.75 : 0.30;
        c.lineWidth = Math.max(1, S.U * (di === 3 ? 0.0020 : 0.0012));
        var k0 = Math.floor((cen - w) / step) - 1, k1 = Math.ceil((cen + w) / step) + 1;
        for (var k = k0; k <= k1; k++) {
          var a = M(k * step); if (a == null) continue;
          var rad = (a - 90) * R2;
          var inner = di === 3 ? 0.88 : 0.94;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(rad) * r * inner, cy + Math.sin(rad) * r * inner);
          c.lineTo(st.cx + Math.cos(rad) * r * 1.07, cy + Math.sin(rad) * r * 1.07);
          c.stroke();
        }
      });
      c.globalAlpha = 0.35; c.strokeStyle = P.dim;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
      c.restore();

      /* the target arc, which fills the ring by the end */
      var t0 = M(levels[2].from), t1 = M(levels[2].to);
      if (t0 != null && t1 != null && t1 > t0)
        arcBand(st.cx, cy, r * 0.93, t0, t1, P.gold, 0.30,
                Math.max(8, S.U * 0.020));

      /* the point itself */
      var pa = M(d);
      if (pa != null) marker(st.cx, cy, r, pa, v.label, "gold", 0.0065);

      txt(li2 === 0 ? levels[0].cap : (li2 === 1 ? levels[1].cap : levels[2].cap),
          st.cx, cy - S.U * 0.020, S.U * 0.030, P.ink, "center", 700);
      txt("window " + w.toFixed(w < 1 ? 3 : 2) + "°   ·   ×" + mag.toFixed(1),
          st.cx, cy + S.U * 0.020, S.U * 0.021, P.gold, "center", 600);
      txtFit(placeWords(d), st.cx, cy + r * 1.30, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      txtFit(L.label + " — " + (L.of === "sign" ? L.n * 12 : L.n) +
             " on the circle, " +
             (360 / (L.of === "sign" ? L.n * 12 : L.n)).toFixed(4) + "° each",
             st.cx, cy + r * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.92);
      var through = (d - levels[2].from) / (levels[2].to - levels[2].from);
      txt((through * 100).toFixed(1) + "% through " + levels[2].cap,
          st.cx, cy + r * 1.30 + S.U * 0.068, S.U * 0.020, P.gold, "center", 600);
    });

  /* --- 5. concentric divisions ------------------------------------------ */
  composer("rings", "Divisions of the circle",
    "one division, or several nested inside each other, with a hand reading them",
    function (bag) {
      /* ONE is enough. Requiring two left a single division — "the navāṃśa
         division", say — with no composer at all: it fell to Layers, whose
         sub-pick also refused it, and the panel drew nothing. A lone division
         is a perfectly good picture; it just needs the sweeping hand to be
         an animation rather than a diagram. */
      return (count(bag, "lanes") >= 1 &&
              all(bag) === count(bag, "lanes") + count(bag, "lon"))
        ? count(bag, "lanes") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var Ls = bag.lanes.map(function (x) { return x.v; });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var step = rOut * 0.62 / Math.max(1, Ls.length - 1 || 1);
      var shown = Math.max(1, Math.round(Ls.length * Math.min(1, p * 1.3)));
      Ls.forEach(function (L, i) {
        if (i >= shown) return;
        var r = rOut - i * step;
        var n = L.of === "sign" ? L.n * 12 : L.n;
        ringTicks(st.cx, cy, r, Math.min(n, 120), 0.45 - i * 0.06, 0.035);
        txt(L.label + " · " + n, st.cx, cy - r - S.U * 0.020,
            S.U * 0.019, i === 0 ? P.gold : P.dim, "center", 700);
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, rOut, x.v.deg, x.v.label, x.v.tone, 0.006); });
      /* A set of divisions has nothing of its own that moves, so a hand sweeps
         the circle and names the arc it is crossing in each ring. Without it
         this view is a still photograph presented as an animation. */
      var sweep = p * 360;
      var ca = S.ctx;
      ca.save();
      ca.strokeStyle = P.gold; ca.globalAlpha = 0.85;
      ca.lineWidth = Math.max(2, S.U * 0.0030);
      ca.beginPath(); ca.moveTo(st.cx, cy);
      ca.lineTo(st.cx + Math.cos((sweep - 90) * R2) * rOut * 1.06,
                cy + Math.sin((sweep - 90) * R2) * rOut * 1.06);
      ca.stroke(); ca.restore();
      var readout = Ls.map(function (L) {
        var n2 = L.of === "sign" ? L.n * 12 : L.n;
        var idx = Math.floor(norm(sweep) / (360 / n2));
        var nm = (L.names && L.names[idx % L.names.length]) || (idx + 1);
        return L.label + " " + nm;
      }).join("   ·   ");
      txtFit(norm(sweep).toFixed(1) + "°", st.cx, cy - S.U * 0.016,
             S.U * 0.028, P.gold, "center", 700, st.w * 0.5);
      txtFit(readout, st.cx, cy + S.U * 0.022, S.U * 0.018, P.ink,
             "center", 500, rOut * 1.5);
      var totals = Ls.map(function (L) {
        return (L.of === "sign" ? L.n * 12 : L.n); });
      txtFit(totals.join(" · ") + "  arcs on one circle",
             st.cx, cy + rOut * 1.30, S.U * 0.021, P.ink, "center", 600, st.w * 0.9);
      txtFit("the finest here is " +
             (360 / Math.max.apply(null, totals)).toFixed(4) + "° wide",
             st.cx, cy + rOut * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.9);
    });

  /* --- 6. magnitudes side by side --------------------------------------- */
  composer("bars", "Comparison",
    "magnitudes on one axis, with the working under each",
    function (bag) {
      var n = count(bag, "sset") + count(bag, "scalar");
      if (!n) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var rows = [];
      (bag.sset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          rows.push({ k: it.k, v: it.v, work: it.work, unit: x.v.unit,
                      max: x.v.max, grp: x.v.label }); }); });
      (bag.scalar || []).forEach(function (x) {
        rows.push({ k: x.v.label, v: x.v.v, work: x.v.work, unit: x.v.unit,
                    max: x.v.max, grp: null }); });
      if (!rows.length) return;
      /* a shared axis only when the units agree; otherwise each bar is scaled
         to its own maximum and the frame says so, because bars on different
         axes that look comparable are a lie */
      var units = [];
      rows.forEach(function (r) { if (units.indexOf(r.unit) < 0) units.push(r.unit); });
      var shared = units.length === 1;
      var gmax = 0;
      rows.forEach(function (r) {
        gmax = Math.max(gmax, Math.abs(r.v), r.max || 0); });
      var n = Math.min(rows.length, 14);
      var top = st.y + st.h * 0.08;
      var hgt = Math.min(st.h * 0.072, (st.h * 0.74) / n);
      var x0 = st.x + st.w * 0.26, bw = st.w * 0.62;
      for (var i = 0; i < n; i++) {
        var r = rows[i], y = top + i * hgt;
        var mx = shared ? gmax : Math.max(Math.abs(r.v), r.max || Math.abs(r.v) || 1);
        var frac = (mx ? Math.abs(r.v) / mx : 0) * grow(p, i, n);
        txt(r.k, st.x + st.w * 0.24, y + hgt * 0.45, S.U * 0.019, P.ink, "right", 600);
        var c = S.ctx;
        c.save();
        /* The TRACK draws in too, not just the bar. A scalar that is exactly
           zero — Sūrya's ecliptic latitude is zero by definition — gives a
           bar of no length, and with a static track the whole frame then sat
           still through the entire reel. The sampler found it. */
        var sweep = grow(p, i, n);
        c.fillStyle = P.line; c.globalAlpha = 0.5;
        c.fillRect(x0, y + hgt * 0.22, bw * sweep, hgt * 0.46);
        c.fillStyle = r.v < 0 ? P.mal : P.gold; c.globalAlpha = 0.9;
        c.fillRect(x0, y + hgt * 0.22, bw * frac, hgt * 0.46);
        c.restore();
        /* the number counts up with its bar, so a single-row comparison is
           still something happening rather than a photograph of a bar */
        var showv = r.v * grow(p, i, n);
        var lab = (Math.abs(r.v) >= 1000 ? Math.round(showv).toLocaleString()
                                         : showv.toFixed(2)) + (r.unit ? " " + r.unit : "");
        txt(lab, x0 + bw * frac + S.U * 0.010, y + hgt * 0.45,
            S.U * 0.017, P.dim, "left", 600);
        if (r.work)
          txt(r.work, st.x + st.w * 0.24, y + hgt * 0.78, S.U * 0.014,
              P.dim, "right", 500);
      }
      var foot = top + n * hgt + S.U * 0.030;
      txtFit(rows[0].grp || "comparison", st.cx, foot, S.U * 0.023, P.ink,
             "center", 700, st.w * 0.9);
      txtFit(shared ? "one axis — every bar is to the same scale, max " +
                      gmax.toFixed(2) + " " + (units[0] || "")
                    : "different units: each bar is scaled to its own maximum, " +
                      "so their lengths are NOT comparable",
             st.cx, foot + S.U * 0.032, S.U * 0.018,
             shared ? P.dim : P.mal, "center", 500, st.w * 0.92);
      if (rows.length > n)
        txt("+" + (rows.length - n) + " more not shown", st.cx, foot + S.U * 0.062,
            S.U * 0.017, P.dim, "center", 500);
    });

  /* --- 7. a network ----------------------------------------------------- */
  composer("graph", "Relation network",
    "pairs drawn as chords on the ring, each labelled with its reason",
    function (bag) {
      return (count(bag, "edges") >= 1 &&
              all(bag) === count(bag, "edges") + count(bag, "lon"))
        ? count(bag, "edges") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = [];
      bag.edges.forEach(function (x) {
        x.v.items.forEach(function (e) { items.push(e); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.35;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      var shown = Math.max(1, Math.round(items.length * Math.min(1, p * 1.3)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < items.length; i++) {
        var g = grow(p, i, items.length);
        if (g <= 0) continue;
        var e = items[i];
        var a1 = (e.a - 90) * R2, a2 = (e.b - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.34 * g;
        c.lineWidth = Math.max(1, S.U * 0.0020) * (0.5 + 0.5 * g);
        c.beginPath();
        /* drawn from a toward b as it grows, bowed through the centre so
           parallel chords stay distinguishable */
        var x1 = st.cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        var x2 = st.cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        var ex = x1 + (x2 - x1) * g, ey = y1 + (y2 - y1) * g;
        c.moveTo(x1, y1);
        c.quadraticCurveTo(st.cx + (x1 - st.cx) * (1 - g) * 0.4,
                           cy + (y1 - cy) * (1 - g) * 0.4, ex, ey);
        c.stroke();
      }
      c.restore();
      var seen = {};
      items.slice(0, shown).forEach(function (e) {
        if (!seen[e.aLabel]) { marker(st.cx, cy, r, e.a, e.aLabel, "glow", 0.0045);
                               seen[e.aLabel] = 1; }
        if (!seen[e.bLabel]) { marker(st.cx, cy, r, e.b, e.bLabel, "gold", 0.0045);
                               seen[e.bLabel] = 1; }
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, r, x.v.deg, x.v.label, "gold", 0.006); });
      txt(shown + " of " + items.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      var y = cy + r * 1.34;
      txtFit(bag.edges[0].v.label, st.cx, y, S.U * 0.024, P.ink, "center", 700, st.w * 0.9);
      /* the reason of whichever edge the playhead is on, so the frame teaches
         rather than decorating */
      var cur = items[Math.min(items.length - 1, shown - 1)];
      if (cur)
        txtFit(cur.aLabel + " → " + cur.bLabel + "   ·   " + cur.why,
               st.cx, y + S.U * 0.036, S.U * 0.020, P.gold, "center", 500, st.w * 0.95);
    });

  /* --- 8. nested time --------------------------------------------------- */
  composer("gears", "Daśā gears",
    "periods as wheels, the inner one turning inside the outer",
    function (bag) {
      var ss = (bag.spanset || []).filter(function (x) { return x.v.nested; });
      return (ss.length === 1 && all(bag) === count(bag, "spanset")) ? all(bag) : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = bag.spanset[0].v.items;
      var rings = [[], []];
      items.forEach(function (s) { rings[s.ring === 1 ? 1 : 0].push(s); });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var t0 = Math.min.apply(null, rings[0].map(function (s) { return s.from; }));
      var t1 = Math.max.apply(null, rings[0].map(function (s) { return s.to; }));
      var now = t0 + (t1 - t0) * p;
      [0, 1].forEach(function (ri) {
        var list = rings[ri]; if (!list.length) return;
        var r = rOut * (ri === 0 ? 1 : 0.58);
        var a0 = Math.min.apply(null, list.map(function (s) { return s.from; }));
        var a1 = Math.max.apply(null, list.map(function (s) { return s.to; }));
        list.forEach(function (s) {
          var f = (s.from - a0) / (a1 - a0) * 360, t = (s.to - a0) / (a1 - a0) * 360;
          var live = now >= s.from && now < s.to;
          arcBand(st.cx, cy, r, f, t, live ? P.gold : P.dim,
                  live ? 0.85 : 0.28, Math.max(10, S.U * (ri === 0 ? 0.030 : 0.026)));
          var mid = (f + t) / 2 * R2 - Math.PI / 2;
          if (t - f > 11)
            txt(s.label, st.cx + Math.cos(mid) * r, cy + Math.sin(mid) * r,
                S.U * 0.016, live ? P.bg : P.ink, "center", 700);
        });
      });
      /* which pair is running, named */
      var md = null, ad = null;
      rings[0].forEach(function (s) { if (now >= s.from && now < s.to) md = s; });
      rings[1].forEach(function (s) { if (now >= s.from && now < s.to) ad = s; });
      txt(md ? md.label : "—", st.cx, cy - S.U * 0.016, S.U * 0.030, P.ink, "center", 700);
      txt(ad ? "antara " + ad.label : "", st.cx, cy + S.U * 0.020,
          S.U * 0.021, P.gold, "center", 600);
      var d = new Date(now);
      txt(d.toISOString().slice(0, 10), st.cx, cy + rOut * 1.28,
          S.U * 0.022, P.dim, "center", 500);
      txtFit(bag.spanset[0].v.label, st.cx, cy + rOut * 1.28 + S.U * 0.036,
             S.U * 0.020, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 9. a flat timeline ----------------------------------------------- */
  composer("timeline", "Timeline",
    "intervals laid along the day or the span, with the playhead on them",
    function (bag) {
      var n = count(bag, "span") + count(bag, "spanset");
      if (!n) return -1;
      var nested = (bag.spanset || []).some(function (x) { return x.v.nested; });
      if (nested) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var lanes2 = [];
      (bag.spanset || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: x.v.items }); });
      (bag.span || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: [{ from: x.v.from, to: x.v.to,
                                                  label: x.v.label }] }); });
      var t0 = Infinity, t1 = -Infinity;
      lanes2.forEach(function (L) { L.items.forEach(function (s) {
        t0 = Math.min(t0, s.from); t1 = Math.max(t1, s.to); }); });
      if (!isFinite(t0) || t1 <= t0) return;
      var top = st.y + st.h * 0.16;
      var lh = Math.min(st.h * 0.16, (st.h * 0.62) / lanes2.length);
      var x0 = st.x + st.w * 0.05, bw = st.w * 0.90;
      var now = t0 + (t1 - t0) * p;
      lanes2.forEach(function (L, li) {
        var y = top + li * lh;
        txt(L.label, x0, y - S.U * 0.012, S.U * 0.019, P.dim, "left", 600);
        L.items.forEach(function (s, si) {
          var a = x0 + bw * (s.from - t0) / (t1 - t0);
          var w = bw * (s.to - s.from) / (t1 - t0);
          var live = now >= s.from && now < s.to;
          var c = S.ctx;
          c.save();
          c.fillStyle = live ? P.gold : (si % 2 ? P.line : P.glow);
          c.globalAlpha = live ? 0.92 : 0.40;
          c.fillRect(a, y, Math.max(1, w - 1), lh * 0.46);
          c.restore();
          if (w > st.w * 0.07)
            txt(s.label, a + w / 2, y + lh * 0.23, S.U * 0.015,
                live ? P.bg : P.ink, "center", 700);
        });
      });
      /* the playhead */
      var px = x0 + bw * p;
      var c2 = S.ctx;
      c2.save();
      c2.strokeStyle = P.gold; c2.lineWidth = Math.max(2, S.U * 0.0028);
      c2.beginPath(); c2.moveTo(px, top - S.U * 0.016);
      c2.lineTo(px, top + lanes2.length * lh); c2.stroke();
      c2.restore();
      var d = new Date(now);
      var hh = ("0" + d.getUTCHours()).slice(-2);
      var mm = ("0" + d.getUTCMinutes()).slice(-2);
      var days = (t1 - t0) / 86400000;
      txt(days > 3 ? d.toISOString().slice(0, 10) : hh + ":" + mm + " UTC",
          st.cx, top + lanes2.length * lh + S.U * 0.040,
          S.U * 0.024, P.gold, "center", 700);
      txtFit("span " + (days > 3 ? days.toFixed(1) + " days"
                                 : (days * 24).toFixed(2) + " hours"),
             st.cx, top + lanes2.length * lh + S.U * 0.075,
             S.U * 0.019, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 10. a quantity over time ----------------------------------------- */
  composer("trace", "Over time",
    "a quantity plotted as the days run, with the playhead reading it off",
    function (bag) {
      return (count(bag, "series") >= 1 && all(bag) === count(bag, "series"))
        ? count(bag, "series") : -1;
    },
    function (bag, p, st, ctxData) {
      var P = pal();
      var sers = bag.series.map(function (x) { return x.v; });
      var when = (ctxData && ctxData.when) || Date.now();
      var days = (ctxData && ctxData.spanDays) || 365;
      var t0 = when, t1 = when + days * 86400000;
      var top = st.y + st.h * 0.14, hgt = st.h * 0.58;
      var x0 = st.x + st.w * 0.08, bw = st.w * 0.86;
      var N = 180;
      /* sample once, find the range, then draw — a plot auto-scaled per frame
         would jitter as the playhead moved */
      var cols = sers.map(function (s) {
        var vals = [];
        for (var i = 0; i <= N; i++) {
          var v = s.at(t0 + (t1 - t0) * i / N);
          vals.push(typeof v === "number" && isFinite(v) ? v : null);
        }
        return vals;
      });
      var lo = Infinity, hi = -Infinity;
      cols.forEach(function (v) { v.forEach(function (x) {
        if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); } }); });
      if (!isFinite(lo) || hi <= lo) { lo = 0; hi = 1; }
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      function Y(v) { return top + hgt * (1 - (v - lo) / (hi - lo)); }
      var c = S.ctx;
      /* axis */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.6; c.lineWidth = 1.5;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var y = top + hgt * f;
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + bw, y); c.stroke();
        txt((hi - (hi - lo) * f).toFixed(1), x0 - S.U * 0.010, y,
            S.U * 0.015, P.dim, "right", 500);
      });
      c.restore();
      var upto = Math.round(N * p);
      cols.forEach(function (vals, si) {
        c.save();
        c.strokeStyle = si === 0 ? P.gold : P.glow;
        c.lineWidth = Math.max(2, S.U * 0.0026);
        c.globalAlpha = 0.95;
        c.beginPath();
        var started = false;
        for (var i = 0; i <= upto; i++) {
          if (vals[i] == null) { started = false; continue; }
          var x = x0 + bw * i / N, y = Y(vals[i]);
          /* a longitude wraps at 360 and a line drawn across the wrap is a
             stripe through the middle of the plot that means nothing */
          if (i > 0 && vals[i - 1] != null &&
              sers[si].range && Math.abs(vals[i] - vals[i - 1]) > (hi - lo) * 0.6)
            started = false;
          if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
        }
        c.stroke();
        c.restore();
        var cv = vals[Math.min(N, upto)];
        if (cv != null) {
          c.save(); c.fillStyle = si === 0 ? P.gold : P.glow;
          c.beginPath();
          c.arc(x0 + bw * upto / N, Y(cv), Math.max(3, S.U * 0.005), 0, Math.PI * 2);
          c.fill(); c.restore();
          txt(sers[si].label + "  " + cv.toFixed(2) + (sers[si].unit || ""),
              st.cx, top + hgt + S.U * (0.040 + si * 0.030),
              S.U * 0.021, si === 0 ? P.gold : P.glow, "center", 600);
        }
      });
      var d = new Date(t0 + (t1 - t0) * p);
      txt(d.toISOString().slice(0, 10), st.cx,
          top + hgt + S.U * (0.040 + sers.length * 0.030),
          S.U * 0.022, P.ink, "center", 700);
      txtFit(days.toFixed(0) + " days from today", st.cx,
             top + hgt + S.U * (0.072 + sers.length * 0.030),
             S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 11. a matrix ----------------------------------------------------- */
  composer("heat", "Table",
    "a grid of numbers, shaded by value",
    function (bag) {
      return (count(bag, "grid") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), G = bag.grid[0].v;
      var rows = G.rows, cols = G.cols || [];
      var nR = Math.min(rows.length, 18), nC = Math.min(cols.length || 1, 14);
      var top = st.y + st.h * 0.14;
      var left = st.x + st.w * 0.22;
      var cw = (st.w * 0.74) / nC;
      var ch = Math.min(st.h * 0.062, (st.h * 0.66) / nR);
      var mx = G.max || 0;
      if (!mx) rows.forEach(function (r) { (r.vals || []).forEach(function (v) {
        if (typeof v === "number") mx = Math.max(mx, v); }); });
      if (!mx) mx = 1;
      for (var ci = 0; ci < nC; ci++)
        txt(String(cols[ci] || ci + 1).slice(0, 7), left + cw * (ci + 0.5),
            top - S.U * 0.016, S.U * 0.014, P.dim, "center", 600);
      for (var ri = 0; ri < nR; ri++) {
        var r = rows[ri], y = top + ri * ch;
        var g = grow(p, ri, nR);
        txt(r.label || r.k, left - S.U * 0.012, y + ch * 0.5,
            S.U * 0.017, P.ink, "right", 600);
        if (g <= 0) continue;
        for (var ci2 = 0; ci2 < nC; ci2++) {
          var v = (r.vals || [])[ci2];
          var c = S.ctx;
          c.save();
          if (typeof v === "number") {
            c.fillStyle = P.gold;
            c.globalAlpha = (0.14 + 0.72 * Math.min(1, v / mx)) * g;
          } else { c.fillStyle = P.line; c.globalAlpha = 0.25 * g; }
          c.fillRect(left + cw * ci2 + 1, y + 1, cw - 2, ch - 2);
          c.restore();
          if (typeof v === "number" && g > 0.6)
            txt(String(v), left + cw * (ci2 + 0.5), y + ch * 0.5,
                S.U * 0.015, v / mx > 0.55 ? P.bg : P.ink, "center", 700);
        }
      }
      var foot = top + nR * ch + S.U * 0.030;
      txtFit(G.label, st.cx, foot, S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit("shaded against " + mx + (G.max ? " — the classical maximum" : " — the largest here"),
             st.cx, foot + S.U * 0.032, S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the kundli, in both conventions ----------------------------------

     The two diagrams carry the same twelve cells and disagree about what is
     nailed down. The NORTH fixes the houses — the first is always the top
     diamond — and rotates the signs through them, so a reader sees the shape
     of the life. The SOUTH fixes the signs in the frame and moves the house
     numbers, so a reader sees the shape of the zodiac. Offering one and
     calling it "the chart" would be taking a side; both are here and the
     perspective switcher moves between them. */

  /* centroids of the North Indian diamond, as fractions of its box. House 1
     is the top centre, and the count runs anticlockwise, which is the
     convention every printed North Indian chart uses. */
  var NORTH = [
    [0.50, 0.25], [0.26, 0.11], [0.11, 0.26], [0.25, 0.50], [0.11, 0.74],
    [0.26, 0.89], [0.50, 0.75], [0.74, 0.89], [0.89, 0.74], [0.75, 0.50],
    [0.89, 0.26], [0.74, 0.11]
  ];
  /* the South Indian frame: sign index at each cell of the 4×4 ring, Meṣa at
     the second cell of the top row and running clockwise */
  var SOUTH = [
    [11, 0], [0, 1], [1, 2], [2, 3],
    [10, 0], null, null, [3, 3],
    [9, 0], null, null, [4, 3],
    [8, 0], [7, 1], [6, 2], [5, 3]
  ];

  function kundliFrame(st) {
    var side = Math.min(st.w * 0.92, st.h * 0.74);
    return { x: st.cx - side / 2, y: st.y + st.h * 0.10, s: side };
  }
  function drawCell(F, cx, cy, cell, P, hot, showHouse, showSign) {
    var u = F.s;
    var lines = cell.items.map(function (it) {
      return it.label + (it.retro ? " ℞" : ""); });
    var head = [];
    if (showSign) head.push(window.SPNodes.RASHI[cell.sign].slice(0, 4));
    if (showHouse) head.push(String(cell.house));
    txt(head.join(" · "), cx, cy - u * 0.045, u * 0.026,
        hot ? P.gold : P.dim, "center", 700);
    lines.slice(0, 5).forEach(function (L, i) {
      txt(L, cx, cy - u * 0.012 + i * u * 0.030, u * 0.028,
          L.indexOf("Sūrya") === 0 ? P.gold : P.ink, "center", 600);
    });
  }
  composer("kundliN", "North Indian kundli",
    "the diamond — houses fixed, signs rotating through them",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.4 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s;
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      /* the two diagonals and the inner diamond make all twelve cells */
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + u, y + u);
      c.moveTo(x + u, y); c.lineTo(x, y + u);
      c.moveTo(x + u / 2, y); c.lineTo(x + u, y + u / 2);
      c.lineTo(x + u / 2, y + u); c.lineTo(x, y + u / 2); c.closePath();
      c.stroke();
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      H.cells.forEach(function (cell, i) {
        if (i >= lit) return;
        var pos = NORTH[i];
        drawCell(F, x + pos[0] * u, y + pos[1] * u, cell, P,
                 cell.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("North Indian: the first house is always the top diamond; the " +
             "signs turn through it", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  composer("kundliS", "South Indian kundli",
    "the square — signs fixed in the frame, the house numbers moving",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.3 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s, q = u / 4;
      var bySign = {};
      H.cells.forEach(function (cl) { bySign[cl.sign] = cl; });
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      for (var k = 1; k < 4; k++) {
        /* only the outer ring is divided: the middle four cells are one box */
        c.beginPath(); c.moveTo(x + q * k, y); c.lineTo(x + q * k, y + q); c.stroke();
        c.beginPath(); c.moveTo(x + q * k, y + u - q); c.lineTo(x + q * k, y + u); c.stroke();
        c.beginPath(); c.moveTo(x, y + q * k); c.lineTo(x + q, y + q * k); c.stroke();
        c.beginPath(); c.moveTo(x + u - q, y + q * k); c.lineTo(x + u, y + q * k); c.stroke();
      }
      c.strokeRect(x + q, y + q, u - 2 * q, u - 2 * q);
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      var shown = 0;
      SOUTH.forEach(function (cellSpec, idx) {
        if (!cellSpec) return;
        var sign = cellSpec[0], cl = bySign[sign];
        if (!cl) return;
        if (shown++ >= lit) return;
        var col = idx % 4, row = Math.floor(idx / 4);
        var ccx = x + q * (col + 0.5), ccy = y + q * (row + 0.5);
        if (cl.house === 1) {
          c.save();
          c.fillStyle = P.gold; c.globalAlpha = 0.13;
          c.fillRect(x + q * col, y + q * row, q, q);
          c.restore();
        }
        drawCell({ s: q * 2.6 }, ccx, ccy, cl, P, cl.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("South Indian: the signs are nailed to the frame; the lit cell " +
             "is the first house", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  /* --- Sudarśana: the same chart from three first houses ----------------- */
  composer("sudarshana", "Sudarśana Cakra",
    "one chart read from Lagna, from Candra and from Sūrya, as three rings",
    function (bag) {
      return (count(bag, "houseset") === 1 && all(bag) === 1) ? 1.5 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houseset[0].v, c = S.ctx;
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.46, st.h * 0.37);
      /* Three rings have to share one radius, and the first version gave the
         innermost a quarter of it — too little to hold a house number and two
         graha names, so the middle of the frame became a knot. Equal-WIDTH
         annuli rather than equal ratios: each ring gets the same room, and the
         hub is just large enough to be a hub. */
      var RING = [rOut, rOut * 0.785, rOut * 0.570];
      var HUB = rOut * 0.355;
      var sweep = p * 360;
      H.items.forEach(function (ch, ri) {
        var r = RING[ri], rin = ri < 2 ? RING[ri + 1] : HUB;
        c.save();
        c.strokeStyle = P.dim; c.globalAlpha = 0.45;
        c.lineWidth = Math.max(1, S.U * 0.0014);
        c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
        for (var i = 0; i < 12; i++) {
          var a = (i * 30 - 90) * R2;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
          c.lineTo(st.cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          c.stroke();
        }
        c.restore();
        ch.cells.forEach(function (cell, hi) {
          var mid = ((hi * 30) + 15 - 90) * R2;
          var rr = (r + rin) / 2;
          var live = Math.floor(norm(sweep) / 30) === hi;
          if (live) {
            c.save(); c.fillStyle = P.gold; c.globalAlpha = 0.14;
            c.beginPath();
            c.arc(st.cx, cy, r, (hi * 30 - 90) * R2, ((hi + 1) * 30 - 90) * R2);
            c.arc(st.cx, cy, rin, ((hi + 1) * 30 - 90) * R2, (hi * 30 - 90) * R2, true);
            c.closePath(); c.fill(); c.restore();
          }
          var names = cell.items.map(function (it) {
            return it.label.slice(0, 2); }).join("·");
          var tx = st.cx + Math.cos(mid) * rr, ty = cy + Math.sin(mid) * rr;
          var band = (r - rin);
          txt(String(cell.house), tx, ty - band * 0.17,
              S.U * 0.0155, live ? P.gold : P.dim, "center", 700);
          if (names)
            txtFit(names, tx, ty + band * 0.20, S.U * 0.0135, P.ink,
                   "center", 600, band * 1.5);
        });
        /* the ring's name on the left margin, where no cell text goes */
        txt(ch.from, st.cx - (r + rin) / 2, cy - (r - rin) * 0.42,
            S.U * 0.0155, ri === 0 ? P.gold : P.dim, "center", 700);
      });
      /* the hub, so the three rings read as rings rather than a pie */
      c.save();
      c.fillStyle = P.bg; c.globalAlpha = 1;
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.dim; c.globalAlpha = 0.45;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.stroke();
      c.restore();
      var hi2 = Math.floor(norm(sweep) / 30);
      txt(String(hi2 + 1), st.cx, cy - S.U * 0.012, S.U * 0.040, P.gold,
          "center", 700);
      txt("bhāva", st.cx, cy + S.U * 0.018, S.U * 0.016, P.dim, "center", 500);
      var who = H.items.map(function (ch) {
        var names = ch.cells[hi2].items.map(function (it) { return it.label; });
        return ch.from + " " + (hi2 + 1) + ": " + (names.length ? names.join(", ") : "—");
      }).join("    ·    ");
      txtFit("house " + (hi2 + 1) + " from each", st.cx, cy + rOut * 1.22,
             S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit(who, st.cx, cy + rOut * 1.22 + S.U * 0.034, S.U * 0.018,
             P.gold, "center", 500, st.w * 0.95);
      txtFit("a house is strong when it is strong from all three",
             st.cx, cy + rOut * 1.22 + S.U * 0.066, S.U * 0.018,
             P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the almanac leaf ------------------------------------------------- *
     Its own composer because it is its own thing: a printed page rather than
     a diagram, drawn edge to edge rather than inside the stage box, and so
     it ignores the stage's margins and takes the whole frame. */
  composer("almanac", "The almanac leaf",
    "the day as an ornate pañcāṅga card, with the light walking down the limbs",
    function (bag) {
      return (count(bag, "almanac") === 1 && all(bag) === 1) ? 2 : -1;
    },
    function (bag, p) {
      window.SPAlmanac.draw(S.ctx, S.W, S.H, bag.almanac[0].v, p, pal(),
                            { foot: S.handle });
    });

  /* --- the orbit pattern ------------------------------------------------- *

     A set of events, each with a time and a place in the circle, drawn so
     that ANGLE CARRIES WHERE and RADIUS CARRIES WHEN. The first event sits on
     the outer ring and each later one a little further in, so the figure
     spirals inward; chords join consecutive events.

     The inward spiral is not decoration, it is the whole reason the picture
     works. Drawn at a fixed radius, consecutive events twenty-nine degrees
     apart simply retrace the same circle and the figure is a circle — which
     is what an earlier version of this drew, and it told the reader nothing.
     Shrinking the radius separates the turns, and the shape the chords make
     IS the cycle: five arms for Śukra's conjunctions, a near-closed ring at
     two hundred and thirty-five for the new Moon.

     Both numbers are printed, because they are different questions. The arms
     are what the eye counts. The closure is after how many events the
     longitude comes back to where it began, which is what a calendar is built
     from. For Śukra those are five and ten, and reporting either alone would
     mislead whichever reader wanted the other. */
  composer("rose", "The orbit pattern",
    "a long run of one event, each plotted where in the circle it falls, " +
    "spiralling inward so the figure is the cycle",
    function (bag) {
      return (count(bag, "cycleset") === 1 && all(bag) === 1) ? 3 : -1;
    },
    function (bag, p, st) {
      var P = pal(), V = bag.cycleset[0].v;
      var ev = V.events, n = ev.length;
      var r = Math.min(st.w * 0.44, st.h * 0.40);
      var cy = st.y + st.h * 0.42;
      var c = S.ctx;

      ringTicks(st.cx, cy, r, 27, 0.30);
      ringTicks(st.cx, cy, r * 0.965, 12, 0.45, 0.04);

      function rad(i) { return r * (1 - 0.72 * (n > 1 ? i / (n - 1) : 0)); }
      function pt(i) {
        var a = (norm(ev[i].lon) - 90) * R2, q = rad(i);
        return { x: st.cx + Math.cos(a) * q, y: cy + Math.sin(a) * q };
      }
      /* How much is drawn by now. The reveal IS the animation, because the
         pattern only becomes a pattern as the events accumulate.

         CONTINUOUS, not a whole number of events. Rounding meant a set of two
         or three never changed at all — max(2, round(n·p)) is 2 at every
         playhead when n is 2 — so the composer drew four identical frames and
         called it an animation. The sampler caught it on a pair whose second
         node had not resolved. The chord to the next event is now drawn
         partially, with a bright head travelling along it, which moves for
         any n at all. */
      var prog = Math.min(1, p / 0.88) * (n - 1);
      var full = Math.min(n - 1, Math.floor(prog));
      var frac = Math.min(1, prog - full);
      var shown = full + 1;

      c.save();
      c.lineWidth = Math.max(1, S.U * 0.0016);
      c.strokeStyle = P.gold;
      c.globalAlpha = 0.55;
      c.beginPath();
      for (var i = 0; i < shown; i++) {
        var q = pt(i);
        if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y);
      }
      if (full < n - 1 && frac > 0) {
        var qa = pt(full), qb = pt(full + 1);
        c.lineTo(qa.x + (qb.x - qa.x) * frac, qa.y + (qb.y - qa.y) * frac);
      }
      c.stroke();
      c.restore();

      /* the spokes: a faint line from the centre to each event, which is what
         makes the arms readable as directions rather than as a tangle */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.30;
      c.lineWidth = Math.max(1, S.U * 0.0009);
      for (var k = 0; k < shown; k++) {
        var a2 = (norm(ev[k].lon) - 90) * R2;
        c.beginPath();
        c.moveTo(st.cx, cy);
        c.lineTo(st.cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        c.stroke();
      }
      c.restore();

      for (var j = 0; j < shown; j++) {
        var q2 = pt(j);
        var fresh = j > shown - 3;
        c.fillStyle = fresh ? P.ink : P.gold;
        c.globalAlpha = fresh ? 1 : 0.85;
        c.beginPath();
        c.arc(q2.x, q2.y, S.U * (fresh ? 0.0065 : 0.0040), 0, Math.PI * 2);
        c.fill();
      }
      /* the travelling head, which is what moves when there are only a
         handful of events to reveal */
      if (full < n - 1) {
        var ha = pt(full), hb = pt(full + 1);
        c.fillStyle = P.ink;
        c.beginPath();
        c.arc(ha.x + (hb.x - ha.x) * frac, ha.y + (hb.y - ha.y) * frac,
              S.U * 0.0075, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;

      /* The label goes ABOVE the ring, not in the middle of it. The spiral
         converges on the centre, so that is precisely where the last and most
         interesting events are — and an earlier version printed the title
         across them. A figure's own name must not be drawn over the figure. */
      txtFit(V.label, st.cx, cy - r * 1.14, S.U * 0.028, P.ink, "center", 700,
             st.w * 0.9);
      txt(Math.min(n, shown) + " of " + n, st.cx, cy - r * 1.14 + S.U * 0.034,
          S.U * 0.019, P.gold, "center", 600);

      var y = cy + r * 1.22;
      txtFit(n + " " + V.what + " over " + V.spanYears.toFixed(1) + " years   ·   " +
             "one every " + V.meanDays.toFixed(2) + " days",
             st.cx, y, S.U * 0.021, P.dim, "center", 500, st.w * 0.95);
      txtFit(V.arms ? ("the eye counts " + V.arms + " arm" + (V.arms === 1 ? "" : "s"))
                    : "these do not cluster — they fall right round the circle",
             st.cx, y + S.U * 0.036, S.U * 0.022,
             V.arms ? P.ink : P.dim, "center", 600, st.w * 0.95);
      if (V.closure)
        txtFit("closest return after " + V.closure.n + " — " +
               V.closure.years.toFixed(2) + " years, within " +
               V.closure.err.toFixed(3) + "°",
               st.cx, y + S.U * 0.070, S.U * 0.021, P.gold, "center", 600, st.w * 0.95);
      else
        txtFit("no return inside this span", st.cx, y + S.U * 0.070,
               S.U * 0.021, P.dim, "center", 500, st.w * 0.95);
    });

  /* --- 12. the catch-all: panels ---------------------------------------- *
     Always scores, so there is no selection that draws nothing. It splits the
     stage and runs the best single-group composer in each panel. */
  composer("layers", "Layers",
    "the stage split into panels, each drawn by whatever fits it",
    function (bag) { return all(bag) ? 0.5 : -1; },
    function (bag, p, st, ctxData) {
      var P = pal();
      /* one group per kind present, in a stable order */
      /* cycleset belongs here too. Leaving it out did not just lose the
         picture — it lost it SILENTLY, which is the one thing this page
         promises never to do: a selection pairing a chart with a long run of
         events drew the chart and dropped the events with nothing on the
         frame to say so. The sampler found it as four identical frames,
         because what remained had no animation of its own. */
      var ORDER = ["cycleset", "lon", "lonset", "lanes", "edges", "sset",
                   "scalar", "spanset", "span", "series", "grid"];
      var groups = [];
      ORDER.forEach(function (k) {
        if ((bag[k] || []).length) {
          var g = {}; g[k] = bag[k];
          /* a lone longitude riding with a lanes group belongs with it */
          groups.push(g);
        }
      });
      /* merge lon into lanes, and lon into edges, so the panels are the
         meaningful pairs rather than one panel per kind */
      var merged = [];
      groups.forEach(function (g) {
        var k = Object.keys(g)[0];
        if (k === "lon" && groups.some(function (o) { return o.lanes; })) return;
        if (k === "lon" && groups.some(function (o) { return o.edges; })) return;
        if (k === "lanes" && bag.lon) g.lon = bag.lon;
        if (k === "edges" && bag.lon) g.lon = bag.lon;
        merged.push(g);
      });
      if (!merged.length) merged = groups;
      var n = Math.min(merged.length, 3);
      var ph = st.h / n;
      for (var i = 0; i < n; i++) {
        var sub = { x: st.x, y: st.y + ph * i, w: st.w, h: ph * 0.94,
                    cx: st.cx, cy: st.y + ph * i + ph * 0.47,
                    bandY: st.bandY, bandH: st.bandH, side: st.side };
        var best = pick(merged[i], true);
        if (best) {
          S.ctx.save();
          S.ctx.beginPath();
          S.ctx.rect(0, sub.y - ph * 0.02, S.W, ph * 0.98);
          S.ctx.clip();
          best.draw(merged[i], p, sub, ctxData);
          S.ctx.restore();
        }
        if (i < n - 1) {
          var c = S.ctx;
          c.save();
          c.strokeStyle = P.line; c.globalAlpha = 0.5; c.lineWidth = 1;
          c.beginPath();
          c.moveTo(st.x, sub.y + ph * 0.96); c.lineTo(st.x + st.w, sub.y + ph * 0.96);
          c.stroke(); c.restore();
        }
      }
      if (merged.length > 3)
        txt((merged.length - 3) + " more group(s) not shown — remove a node",
            st.cx, st.y + st.h - S.U * 0.012, S.U * 0.017, P.mal, "center", 500);
    });

  /* ---- the matcher ------------------------------------------------------ */
  /* the rest of this codebase is ES5 by habit, and a studio page that failed
     to parse on an older browser would fail silently and completely */
  function withScore(K, s) {
    return { key: K.key, label: K.label, blurb: K.blurb, draw: K.draw, s: s };
  }
  function pick(bag, noLayers) {
    var best = null;
    COMPOSERS.forEach(function (K) {
      if (noLayers && K.key === "layers") return;
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0 && (!best || s > best.s)) best = withScore(K, s);
    });
    return best;
  }
  /* every composer that can draw this selection at all, best first — this is
     the perspective switcher */
  function options(bag) {
    var out = [];
    COMPOSERS.forEach(function (K) {
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0) out.push({ key: K.key, label: K.label, blurb: K.blurb, s: s });
    });
    return out.sort(function (a, b) { return b.s - a.s; });
  }

  /* ---- bagging a selection ---------------------------------------------- */
  function bagOf(sel, C) {
    var bag = {}, missing = [];
    sel.forEach(function (id) {
      var node = window.SPNodes.byId(id);
      if (!node) { missing.push({ id: id, why: "no such node" }); return; }
      var v = window.SPNodes.resolve(node, C);
      if (!v) { missing.push({ id: id, label: node.label,
                               why: "not available for this chart or moment" }); return; }
      (bag[v.kind] = bag[v.kind] || []).push({ node: node, v: v });
    });
    return { bag: bag, missing: missing };
  }

  /* ---- the public draw -------------------------------------------------- */
  /* `quiet` skips the work only the side panels need. render() is called
     sixty times a second during playback and scoring every composer to build
     a list of alternatives that nothing reads is pure waste. */
  function render(sel, C, p, forceKey, quiet) {
    var B = bagOf(sel, C);
    background();
    if (pal().key !== "parchment") stars();
    var st = stage();
    var P = pal();
    var chosen = null;
    if (forceKey) {
      COMPOSERS.forEach(function (K) {
        if (K.key !== forceKey) return;
        var s = -1;
        try { s = K.score(B.bag); } catch (e) {}
        if (s > 0) chosen = withScore(K, s);
      });
    }
    if (!chosen) chosen = pick(B.bag);
    if (!chosen) {
      /* Two different nothings, and they deserve different words. An empty
         selection is an invitation; a selection whose every node came back
         empty is a finding, and the reason belongs on the frame rather than
         in a console nobody opens. */
      if (!sel.length) {
        txt("Pick something from the wall", st.cx, st.cy, S.U * 0.030,
            P.dim, "center", 500);
      } else {
        txtFit("nothing to draw for this selection", st.cx,
               st.cy - S.U * 0.030, S.U * 0.028, P.ink, "center", 600, st.w * 0.9);
        B.missing.slice(0, 4).forEach(function (m, i) {
          txtFit((m.label || m.id) + " — " + m.why, st.cx,
                 st.cy + S.U * (0.010 + i * 0.034), S.U * 0.019, P.dim,
                 "center", 500, st.w * 0.92);
        });
      }
      captionBand(S.headline || "Studio Pro", S.sub);
      safeGuides();
      return { composer: null, missing: B.missing, options: quiet ? null : [] };
    }
    /* The leaf is a whole page: it paints its own paper to the frame's edge
       and carries its own foot, so the stage's background, stars and caption
       band would all be drawing over or under a finished card. */
    var ownsFrame = chosen.key === "almanac";
    if (ownsFrame) { background(); }
    try { chosen.draw(B.bag, p, st, C); }
    catch (e) {
      txt("this combination could not be drawn", st.cx, st.cy, S.U * 0.026,
          P.mal, "center", 500);
      txtFit(String(e && e.message || e), st.cx, st.cy + S.U * 0.040,
             S.U * 0.017, P.dim, "center", 500, st.w * 0.9);
    }
    /* What the chosen view could not take is returned to the page, not
       swallowed: a studio that silently drops half a selection teaches its
       user nothing about why the picture looks wrong. */
    if (!ownsFrame) captionBand(S.headline || chosen.label, S.sub || chosen.blurb);
    else if (S.headline) {
      /* a headline the user typed still belongs on the leaf, set in its own
         gold rather than in the diagram band's */
      txt(S.headline, S.W / 2, S.H * 0.045, S.U * 0.034,
          pal().gold, "center", 700);
    }
    safeGuides();
    return { composer: chosen.key, label: chosen.label, missing: B.missing,
             options: quiet ? null : options(B.bag) };
  }

  /* ---- the storyboard ----------------------------------------------------

     A reel that makes one point is a card with motion. A reel that makes three
     in sequence — here is the claim, here is the geometry, here is the number
     — is the thing people watch twice. A shot is a selection, a pinned view
     and a length; the storyboard plays them end to end and the recorder
     captures the whole run rather than one shot.

     The dip between shots is not decoration. A hard cut between two dark
     canvases of similar composition reads as a glitch rather than an edit,
     and the eye needs the beat to accept that the subject changed. */
  function storyTotal(shots) {
    var t = 0;
    (shots || []).forEach(function (sh) { t += Math.max(1, sh.seconds || 5); });
    return t || 1;
  }
  function shotAt(shots, p) {
    var total = storyTotal(shots), acc = 0, want = p * total;
    for (var i = 0; i < shots.length; i++) {
      var len = Math.max(1, shots[i].seconds || 5);
      if (want < acc + len || i === shots.length - 1)
        return { i: i, shot: shots[i], local: Math.min(1, (want - acc) / len),
                 len: len, total: total, at: want };
      acc += len;
    }
    return null;
  }
  function renderStory(shots, C, p) {
    if (!shots || !shots.length) return render([], C, p, null);
    var cur = shotAt(shots, p);
    if (!cur) return render([], C, p, null);
    /* a shot is either an Auto selection or a whole Director document; the
       storyboard does not care which, which is what makes a reel able to cut
       from a hand-built scene to a one-click one */
    var out;
    if (cur.shot.doc && window.SPDirector)
      out = window.SPDirector.withDoc(cur.shot.doc, function () {
        return window.SPDirector.render(C, cur.local, true);
      });
    else
      out = render(cur.shot.sel || [], C, cur.local, cur.shot.force || null, true);
    /* the dip: a quarter-second at each join, strongest at the boundary */
    var dipFor = 0.22;
    var into = cur.local * cur.len, left = cur.len - into;
    var a = 0;
    if (cur.i > 0 && into < dipFor) a = 1 - into / dipFor;
    if (cur.i < shots.length - 1 && left < dipFor) a = Math.max(a, 1 - left / dipFor);
    if (a > 0) {
      var c = S.ctx;
      c.save(); c.fillStyle = pal().bg; c.globalAlpha = a * 0.92;
      c.fillRect(0, 0, S.W, S.H); c.restore();
    }
    /* which shot, and how many — a viewer scrubbing needs to know where they
       are, and a three-part reel benefits from the viewer knowing it is three */
    if (shots.length > 1) {
      var st = stage(), P = pal(), c2 = S.ctx;
      var bw = st.w * 0.30, bx = st.cx - bw / 2, by = st.y - S.H * 0.016;
      for (var k = 0; k < shots.length; k++) {
        var seg = bw / shots.length, x = bx + seg * k;
        c2.save();
        c2.fillStyle = k === cur.i ? P.gold : P.line;
        c2.globalAlpha = k === cur.i ? 0.9 : 0.45;
        c2.fillRect(x + 1, by, seg - 2, Math.max(2, S.H * 0.0022));
        c2.restore();
      }
    }
    out.shot = cur.i;
    out.shots = shots.length;
    return out;
  }

  /* ---- the recorder ------------------------------------------------------
     Frame-accurate: the canvas is driven at a fixed step and the stream is
     fed one frame per step, so the file lasts exactly as long as it says
     rather than as long as the machine happened to take. */
  /* The recording in flight, so it can be stopped.

     It used to be unstoppable: once started, its own loop drove the playhead
     for the whole length and nothing could interrupt it. The Pause button sat
     there enabled, writing PLAY = false, which the recorder never read — so
     pressing Pause during a recording did exactly nothing, and pressing Play
     put a SECOND writer on the playhead and would have corrupted the capture.
     A transport control that is enabled and inert is worse than one that is
     greyed out, because the only thing the reader learns is that the page
     does not work. */
  var JOB = null;
  function isRecording() { return !!JOB; }
  function cancelRecording() { if (JOB) JOB.cancel = true; return !!JOB; }

  /* `sel` is either a selection (one shot) or an array of shots, in which
     case `seconds` is ignored and the storyboard's own total is used. */
  /* ---- one definition of "the frame at p" --------------------------------

     There are now three things a frame can be — an Auto composition, a
     storyboard of them, or a Director document — and four callers that need
     one: the preview, the playback loop, the recorder and the still export.
     If each caller chose for itself, the first divergence would be a reel
     that records the picture the preview was not showing, which is the worst
     class of bug this page could have: invisible until someone posts it.

     So the choice is made once, here, and every caller asks this.

     The precedence: a storyboard being played wins, because it sequences
     shots and a shot may itself be a Director document; otherwise Director
     mode wins if it is on; otherwise Auto. */
  function frameAt(sel, C, p, forceKey, shots, quiet) {
    if (shots && shots.length) return renderStory(shots, C, p);
    if (window.SPDirector && window.SPDirector.on())
      return window.SPDirector.render(C, p, quiet);
    return render(sel, C, p, forceKey, quiet);
  }

  function record(sel, C, seconds, fps, forceKey, onFrame) {
    var shots = (sel && sel.length && typeof sel[0] === "object" && sel[0].sel)
      ? sel : null;
    if (shots) seconds = storyTotal(shots);
    return new Promise(function (resolve, reject) {
      var stream = null;
      try { stream = S.cv.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var track = stream.getVideoTracks()[0];
      if (!track || !track.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9",
                   "video/webm;codecs=vp8", "video/webm"];
      var mime = "";
      types.forEach(function (t) {
        if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(t)) mime = t;
      });
      if (!mime) { reject(new Error("no supported recording format")); return; }
      var chunks = [], rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 }); }
      catch (e) { reject(e); return; }
      var job = { cancel: false };
      JOB = job;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        JOB = null;
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, cancelled: job.cancel,
                  madeSeconds: Math.min(i, total) / fps });
      };
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      rec.start();
      function step() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        S.p = i / total;
        frameAt(shots ? [] : sel, C, S.p, forceKey, shots, true);
        try { track.requestFrame(); } catch (e) {}
        if (onFrame) onFrame(i / total);
        i++;
        /* a timeout rather than rAF: rAF is throttled in a background tab and
           a reel recorded while the user looked at another tab would be short */
        setTimeout(step, Math.max(4, 1000 / fps / 4));
      }
      step();
    });
  }

  /* Render a composition into SOMEBODY ELSE'S canvas at an arbitrary size.

     The stage is a singleton — one canvas, one size — because the director
     stage is one thing. The sample strip needs a dozen small pictures a
     second from the same composers, and standing up a second stage would be
     a second set of composers to keep in step. So the singleton is lent out:
     its canvas, size and chrome flags are swapped, the composition is drawn,
     and everything is put back. Every composer sizes from S.U, so a tile is
     the same picture at a smaller scale rather than a cropped one.

     The flags matter: a thumbnail has no business reserving Instagram's
     strips or drawing guide rectangles, and its caption band would be two
     unreadable lines, so all three stand down for the duration. */
  function renderTo(cv, w, h, sel, C, p, force) {
    var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U,
                 safe: S.safe, head: S.headline, sub: S.sub, tile: S.tile };
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    S.cv = cv; S.ctx = cv.getContext("2d");
    S.W = w; S.H = h; S.U = w; S.safe = false; S.tile = true;
    S.headline = ""; S.sub = "";
    var out = null;
    try { out = render(sel, C, p, force, true); } catch (e) { out = null; }
    S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U;
    S.safe = keep.safe; S.headline = keep.head; S.sub = keep.sub; S.tile = keep.tile;
    return out;
  }

  /* ---- what Director mode borrows ---------------------------------------

     Director draws the same fifteen composers into rectangles the user places
     rather than into the one stage rect, and that is possible only because a
     composer has never been told where it sits: it is handed a rect and a
     playhead and sizes everything from them. So Director needs no composers
     of its own, and a composer written for Auto mode arrives in Director able
     to be placed, timed and animated without being touched.

     The alternative — a second drawing layer for free composition — would
     have been a second set of pictures free to disagree with the first, which
     is the same trap the recorder and the Viṃśottarī are held out of. */
  function drawInto(bag, p, st, C, forceKey) {
    var K = null;
    if (forceKey) {
      COMPOSERS.forEach(function (Q) {
        if (Q.key !== forceKey) return;
        var s = -1;
        try { s = Q.score(bag); } catch (e) {}
        if (s > 0) K = withScore(Q, s);
      });
    }
    if (!K) K = pick(bag);
    if (!K) return null;
    try { K.draw(bag, p, st, C); }
    catch (e) { return { key: K.key, label: K.label, error: String(e && e.message || e) }; }
    return { key: K.key, label: K.label, blurb: K.blurb };
  }

  window.SPStage = {
    S: S, PALS: PALS, RATIOS: RATIOS, SAFE: SAFE, renderTo: renderTo,
    /* the private helpers Director composes with — one implementation of
       text fitting, one star field, one caption band, one set of guides */
    kit: {
      pal: pal, txt: txt, txtFit: txtFit, wrap: wrap, wrapLines: wrapLines,
      fit: fit, norm: norm,
      background: background, stars: stars, captionBand: captionBand,
      safeGuides: safeGuides, stage: stage, drawInto: drawInto,
      ringTicks: ringTicks, marker: marker, arcBand: arcBand,
      placeWords: placeWords, SANS: SANS, grow: grow
    },
    attach: function (canvas) {
      S.cv = canvas; S.ctx = canvas.getContext("2d");
      this.resize();
    },
    resize: function () {
      var r = RATIOS[S.ratio] || RATIOS["9:16"];
      var q = Math.max(0.25, Math.min(1, S.quality || 1));
      S.W = Math.round(r.w * q); S.H = Math.round(r.h * q); S.U = S.W;
      if (S.cv) { S.cv.width = S.W; S.cv.height = S.H; }
      STARS = null;
    },
    /* Run something at true export size, then put the preview size back.
       Every composer sizes from S.U, so the picture is identical either way —
       only the number of pixels differs. */
    withFullSize: function (fn) {
      var q = S.quality;
      S.quality = 1; this.resize();
      try { return fn(); } finally { S.quality = q; this.resize(); }
    },
    render: render, renderStory: renderStory, record: record, frameAt: frameAt,
    isRecording: isRecording, cancelRecording: cancelRecording,
    storyTotal: storyTotal, shotAt: shotAt, options: options, bagOf: bagOf,
    composers: function () { return COMPOSERS.map(function (K) {
      return { key: K.key, label: K.label, blurb: K.blurb }; }); }
  };
})();

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

/* ===== Studio Pro / Director Pro — saying what you want ===================

   WHY THIS IS A PARSER AND NOT A LANGUAGE MODEL.

   The ask was "something like a local LLM": type a sentence, get the
   animation. A language model running in the browser is the wrong tool for
   it, and not because it would be hard. The smallest model that could turn a
   sentence into a correct specification is hundreds of megabytes, needs
   WebGPU, and breaks this site's two standing promises — that it works
   offline from a local copy and fetches nothing from anybody. And it would
   still be worse at the job, because the job is not open-ended: a request
   here names things from a list of about three hundred, an event from a list
   of six, a span, and a figure. A model would sometimes invent a node that
   does not exist and present it with confidence. A grammar cannot.

   So this is a grammar over the site's own vocabulary, and the design rule
   throughout is: NEVER GUESS SILENTLY. Every parse reports what it
   understood, phrase by phrase, and what it could not place. A sentence that
   is half understood produces half an animation and says which half — which
   is the behaviour that lets somebody learn the vocabulary by using it,
   rather than by reading a manual.

   WHAT IT UNDERSTANDS.

     subjects   every graha by IAST, by English, and by the spellings people
                actually type — Shukra, Sukra, Venus, Shukr
     events     conjunction, opposition, full and new Moon, combustion,
                stations, inferior and superior conjunction
     spans      "next 200 years", "over a century", "for 50 years", "the
                next 30 days", bare years
     figures    orbit pattern, rose, web, wheel, bars, chart, timeline, gears
     manner     slowly, quickly, zoomed in, full bleed, on dark, as a square

   WHAT IT REFUSES TO DO. It does not round a request down to something it can
   draw and stay quiet about it. If you ask for a span of two hundred years
   and the events cap out, the figure says so. If you name a graha it knows
   and an event it does not, it says which word it could not place.

   THE RECIPES ARE GENERATED, NOT WRITTEN. A hand-written list of a dozen
   examples teaches the vocabulary badly, because the gaps between the
   examples are where the user's own sentence lives. These are produced
   combinatorially from templates and the registry, so every pair, every
   graha and every span is represented, and each one is a real sentence this
   parser really understands — they are produced by the same grammar that
   reads them, so a recipe cannot drift out of date with the parser. */

(function () {
  "use strict";

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  /* The spellings people actually type. Diacritics are stripped before
     matching, so "Sūrya" and "Surya" are the same key here; what this list
     has to carry is the genuinely different names — English, the alternative
     Sanskrit names, and the common misspellings. */
  var ALIAS = {
    "Sūrya":   ["surya", "sun", "ravi", "aditya", "sooryan", "soorya", "suryan", "sura"],
    "Candra":  ["candra", "chandra", "moon", "soma", "chandrama", "chander", "chand"],
    "Maṅgala": ["mangala", "mangal", "mars", "kuja", "angaraka", "bhauma", "sevvai"],
    "Budha":   ["budha", "budh", "mercury", "buddha", "budhan"],
    "Guru":    ["guru", "jupiter", "brihaspati", "bṛhaspati", "brhaspati", "devaguru", "jiva"],
    "Śukra":   ["sukra", "shukra", "venus", "shukr", "bhargava", "sukran"],
    "Śani":    ["sani", "shani", "saturn", "sanaischara", "shanaishchara", "shanidev"],
    "Rāhu":    ["rahu", "north node", "dragon head", "caput"],
    "Ketu":    ["ketu", "south node", "dragon tail", "cauda"]
  };

  /* Events, longest phrase first so "inferior conjunction" wins over
     "conjunction" and "full moon" over "moon". */
  var EVENTS = [
    { k: "inferior", words: ["inferior conjunction", "inferior conjunctions",
        "inferior"], needs: 1, inner: true,
      say: "inferior conjunctions" },
    { k: "superior", words: ["superior conjunction", "superior conjunctions",
        "superior"], needs: 1, inner: true,
      say: "superior conjunctions" },
    { k: "purnima", words: ["purnima", "purnimas", "full moon", "full moons",
        "pournami", "pournamis", "poornima", "poornimas", "paurnami"],
      needs: 0, say: "full Moons" },
    { k: "amavasya", words: ["amavasya", "amavasyas", "new moon", "new moons",
        "amavasai", "amavas", "darsha"], needs: 0, say: "new Moons" },
    { k: "combust", words: ["combustion", "combust", "combustible", "asta",
        "astangata", "burnt", "under the sun's beams", "combusted"], needs: 1,
      say: "combustions" },
    { k: "station", words: ["station", "stations", "retrograde", "retrogression",
        "vakri", "vakra", "direct motion", "turning"], needs: 1,
      say: "stations" },
    { k: "conj", words: ["conjunction", "conjunctions", "conjunct", "yuti",
        "yoga with", "together with", "meets", "meeting", "meet", "graha yuddha",
        "planetary war", "same degree"], needs: 2, say: "conjunctions" },
    { k: "opp", words: ["opposition", "oppositions", "opposite", "pratiyuti",
        "facing"], needs: 2, say: "oppositions" }
  ];

  /* Figures map onto composers. A figure named but impossible for what was
     selected is reported rather than quietly dropped. */
  var FIGURES = [
    { k: "rose", words: ["orbit pattern", "orbital pattern", "orbit patterns",
        "rose", "spiral", "pattern", "patterns", "figure", "petal", "flower",
        "pentagram", "star pattern", "over the years", "over time pattern"],
      say: "the orbit pattern" },
    { k: "angle", words: ["angle", "angle between", "mutual position",
        "mutual positions", "separation", "distance between", "relative position",
        "relationship between"], say: "the angle between" },
    { k: "web", words: ["web", "aspects", "aspect web", "drishti", "dṛṣṭi",
        "lines between"], say: "the aspect web" },
    { k: "rings", words: ["rings", "ring", "wheel", "circle", "divisions",
        "zodiac wheel"], say: "the rings" },
    { k: "bars", words: ["bars", "bar chart", "strengths", "comparison",
        "compare", "ranking"], say: "bars" },
    { k: "kundliN", words: ["north indian chart", "north chart", "kundli",
        "kundali", "diamond chart", "birth chart"], say: "a North Indian chart" },
    { k: "kundliS", words: ["south indian chart", "south chart", "square chart"],
      say: "a South Indian chart" },
    { k: "timeline", words: ["timeline", "periods", "dasha bar", "time bar"],
      say: "a timeline" },
    { k: "gears", words: ["gears", "nested", "wheels within wheels"],
      say: "the daśā gears" },
    { k: "trace", words: ["trace", "track", "path", "over time", "across time",
        "through time", "motion"], say: "the path over time" },
    { k: "heat", words: ["heat", "heatmap", "grid of", "ashtakavarga grid"],
      say: "a heat grid" },
    { k: "almanac", words: ["almanac", "panchanga", "pañcāṅga", "leaf",
        "calendar card", "day card"], say: "the almanac leaf" },
    { k: "sudarshana", words: ["sudarshana", "sudarśana", "three charts",
        "three lagnas"], say: "the Sudarśana" },
    { k: "zoom", words: ["zoom", "deep zoom", "magnify", "close up", "closeup"],
      say: "a deep zoom" },
    /* These name a thing to draw rather than a way of drawing it, so they
       pick a selection and leave the composer to the matcher. Keeping them in
       the same list means one place to look for "what words does it know",
       which matters more than the tidiness of two lists. */
    { k: "fiveLimbs", words: ["five limbs", "the five limbs", "panchanga limbs",
        "limbs of the day"], say: "the five limbs" },
    { k: "horas", words: ["horas", "hora", "planetary hours", "hour lords"],
      say: "the horās" },
    { k: "choghadiya", words: ["choghadiya", "chogadiya", "choghadiyas"],
      say: "the choghaḍiyā" },
    { k: "tara", words: ["tara bala", "tarabala", "the nine taras"],
      say: "Tāra Bala" }
  ];

  var MANNER = [
    { k: "slow", words: ["slowly", "slow", "gently", "calm", "unhurried"] },
    { k: "fast", words: ["quickly", "fast", "snappy", "rapid", "punchy"] },
    { k: "bleed", words: ["full bleed", "fullbleed", "edge to edge", "full frame",
        "no margins"] },
    { k: "square", words: ["square", "1:1", "feed post", "instagram post"] },
    { k: "wide", words: ["landscape", "16:9", "widescreen", "youtube"] },
    { k: "reel", words: ["reel", "story", "9:16", "vertical", "shorts", "tiktok"] },
    { k: "dark", words: ["dark", "midnight", "night", "black", "eclipse"] },
    { k: "light", words: ["light", "parchment", "paper", "white", "cream"] },
    { k: "title", words: ["with a title", "add a title", "titled", "with titles",
        "with a caption", "with text"] },
    { k: "notitle", words: ["no title", "without a title", "no text",
        "without text", "plain"] }
  ];

  /* ---- normalising -------------------------------------------------------
     Diacritics are stripped, so the user is never required to type ṣ or ā to
     be understood. The site shows the diacritics; it does not demand them. */
  function fold(s) {
    return String(s == null ? "" : s)
      .normalize ? String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
          .toLowerCase().replace(/[^a-z0-9\s:+\-]/g, " ").replace(/\s+/g, " ").trim()
      : String(s).toLowerCase();
  }

  /* ---- time --------------------------------------------------------------- */
  var WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100,
    "two hundred": 200, "three hundred": 300, thousand: 1000 };
  var UNITDAYS = { day: 1, days: 1, week: 7, weeks: 7, month: 30.44,
    months: 30.44, year: 365.2564, years: 365.2564, yr: 365.2564,
    yrs: 365.2564, decade: 3652.564, decades: 3652.564, century: 36525.64,
    centuries: 36525.64, millennium: 365256.4 };

  function parseSpan(f) {
    /* "200 years", "two hundred years", "a century", "the next 30 days" */
    var m = f.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years|yr|yrs|decade|decades|century|centuries|millennium)\b/);
    if (m) return { days: Math.round(parseFloat(m[1]) * UNITDAYS[m[2]]),
                    say: m[0] };
    /* "two hundred years" is two words of number. An earlier version matched
       a single number word followed by a unit, so it read "two hundred years"
       as "hundred years" and quietly halved the span — the span being the one
       thing in the sentence the reader is most specific about. */
    var w = f.match(/\b((?:two|three|four|five|six|seven|eight|nine)\s+(?:hundred|thousand)|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty|fifty|sixty|hundred|thousand)\s+(day|days|week|weeks|month|months|year|years|decade|decades|century|centuries|millennium)\b/);
    if (w) {
      var mult = WORDNUM[w[1]];
      if (mult == null) {
        var parts = w[1].split(/\s+/);
        mult = (WORDNUM[parts[0]] || 1) * (WORDNUM[parts[1]] || 1);
      }
      return { days: Math.round(mult * UNITDAYS[w[2]]), say: w[0] };
    }
    var c = f.match(/\b(a|one|half a|two|three)\s+(century|centuries|millennium|decade)\b/);
    if (c) return { days: Math.round((WORDNUM[c[1]] || 1) * UNITDAYS[c[2]]),
                    say: c[0] };
    return null;
  }
  /* "the next 50 Purnimas" — a count of events rather than a span of time.
     Turned into a span using the event's own rough period, and the figure
     then reports how many it actually found, so the count is a request and
     the number on the frame is the answer. */
  var ROUGH = { purnima: 29.53, amavasya: 29.53, conj: 400, opp: 400,
                combust: 120, station: 200, inferior: 584, superior: 584 };
  function parseCount(f) {
    var m = f.match(/(\d+)\s+(purnimas?|amavasyas?|full moons?|new moons?|conjunctions?|oppositions?|combustions?|stations?|events?|times)\b/);
    return m ? { n: parseInt(m[1], 10), say: m[0] } : null;
  }

  /* ---- matching helpers --------------------------------------------------- */
  function findPhrase(f, words) {
    var best = null;
    words.forEach(function (w) {
      var i = f.indexOf(w);
      if (i < 0) return;
      /* word boundaries, so "sun" does not match inside "sunday" */
      var before = i === 0 ? " " : f[i - 1];
      var after = (i + w.length >= f.length) ? " " : f[i + w.length];
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after))
        if (!best || w.length > best.w.length) best = { w: w, at: i };
    });
    return best;
  }

  /* ---- the parse ---------------------------------------------------------- */
  function parse(text) {
    var f = fold(text);
    var used = [], understood = [], notes = [];
    function consume(phrase) {
      var i = f.indexOf(phrase);
      if (i >= 0) f = f.slice(0, i) + " ".repeat(phrase.length) + f.slice(i + phrase.length);
      used.push(phrase);
    }

    /* THE EVENT IS MATCHED BEFORE THE SUBJECTS, and the reason is one word.

       "Moon" is how people write Candra, and "full moon" is how they write
       Pūrṇimā. Matching subjects first consumed the "moon" out of "full
       moon", leaving a fragment no event could match — so "show every full
       Moon over 19 years" was read as "Candra, over 19 years" and drew where
       Candra is standing. The sentence was understood as something it plainly
       does not say, which is the one failure mode this parser exists to
       avoid.

       The general rule behind it: the longer, more specific phrase wins, and
       event names are longer and more specific than the body names inside
       them. So events go first, and what they take is no longer available to
       be read as a subject. */
    var event = null;
    for (var i = 0; i < EVENTS.length && !event; i++) {
      var hit = findPhrase(f, EVENTS[i].words);
      if (hit) { event = EVENTS[i]; consume(hit.w); understood.push(EVENTS[i].say); }
    }

    /* subjects, in the order they are mentioned — the order matters, because
       "Maṅgala with Guru" and "Guru with Maṅgala" are the same event but the
       reader named one first and the label should agree with them */
    var subs = [];
    SA.forEach(function (sa) {
      var h0 = findPhrase(f, ALIAS[sa]);
      if (h0) subs.push({ sa: sa, at: h0.at, w: h0.w });
    });
    subs.sort(function (a, b) { return a.at - b.at; });
    subs.forEach(function (q) { consume(q.w); });
    if (subs.length)
      understood.push(subs.map(function (q) { return q.sa; }).join(" and "));

    /* the figure */
    var figure = null;
    for (var j = 0; j < FIGURES.length && !figure; j++) {
      var h2 = findPhrase(f, FIGURES[j].words);
      if (h2) { figure = FIGURES[j]; consume(h2.w); understood.push(FIGURES[j].say); }
    }

    /* manner */
    var manner = {};
    MANNER.forEach(function (m) {
      var h3 = findPhrase(f, m.words);
      if (h3) { manner[m.k] = true; consume(h3.w); understood.push(h3.w); }
    });

    /* time */
    var span = parseSpan(f);
    if (span) { consume(span.say); understood.push(span.say); }
    var count = parseCount(f);
    if (count) { consume(count.say); understood.push(count.say); }
    if (!span && count && event) span = { days: Math.round(count.n * (ROUGH[event.k] || 100)),
                                          say: count.say };

    /* whatever is left that is not a filler word */
    var FILLER = ("show me make create animate draw plot a an the of for over " +
      "and with to in on next last past coming during across between from " +
      "please can you i want would like video reel clip animation picture " +
      "see view it this that their its how where when what is are was were " +
      "be do does let us lets going we my our me").split(" ");
    var left = f.split(/\s+/).filter(function (w) {
      return w && FILLER.indexOf(w) < 0 && !/^\d+$/.test(w); });

    return { text: text, subjects: subs.map(function (s) { return s.sa; }),
             event: event ? event.k : null,
             eventSay: event ? event.say : null,
             eventNeeds: event ? event.needs : 0,
             figure: figure ? figure.k : null,
             figureSay: figure ? figure.say : null,
             manner: manner, spanDays: span ? span.days : null,
             count: count ? count.n : null,
             understood: understood, ignored: left };
  }

  /* ---- turning a parse into a selection ----------------------------------
     This is where a request becomes node ids. Every branch either produces a
     selection or records why it could not, and the "why" is written for the
     person rather than for a log. */
  function toSelection(P) {
    var sel = [], force = null, why = [], note = null;
    var s = P.subjects;
    var pairId = function (a, b, kind) {
      /* the registry keys a pair in the fixed order of the grahas, so a
         request naming them the other way round still finds the node */
      var order = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia < 0 || ib < 0) return null;
      return "cyc." + kind + "." + (ia < ib ? a + "-" + b : b + "-" + a);
    };

    if (P.event === "purnima") sel = ["cyc.purnima"];
    else if (P.event === "amavasya") sel = ["cyc.amavasya"];
    else if (P.event === "combust") {
      if (!s.length) why.push("combustion needs a graha — which one?");
      else if (s[0] === "Sūrya")
        why.push("Sūrya cannot be combust by itself; name the graha that is.");
      else if (["Rāhu", "Ketu"].indexOf(s[0]) >= 0)
        why.push("the nodes have no combustion in this build — they are not bodies with an elongation from Sūrya in the sense this uses.");
      else sel = ["cyc.combust." + s[0]];
    }
    else if (P.event === "station") {
      if (!s.length) why.push("stations need a graha — which one?");
      else if (["Sūrya", "Candra"].indexOf(s[0]) >= 0)
        why.push("Sūrya and Candra never turn retrograde, so they have no stations.");
      else if (["Rāhu", "Ketu"].indexOf(s[0]) >= 0)
        why.push("the nodes are always retrograde in the mean reckoning this uses, so they have no stations.");
      else sel = ["cyc.station." + s[0]];
    }
    else if (P.event === "inferior" || P.event === "superior") {
      var inner = s.filter(function (q) { return q === "Budha" || q === "Śukra"; });
      if (!inner.length)
        why.push("only Budha and Śukra have inferior and superior conjunctions — they are the ones that pass between us and Sūrya.");
      else sel = ["cyc." + P.event + "." + inner[0]];
    }
    else if (P.event === "conj" || P.event === "opp") {
      if (s.length < 2) why.push("a " + (P.event === "conj" ? "conjunction" : "opposition") +
        " needs two grahas — only " + (s.length ? "one was" : "none were") + " named.");
      else if (["Rāhu", "Ketu"].indexOf(s[0]) >= 0 || ["Rāhu", "Ketu"].indexOf(s[1]) >= 0)
        why.push("the node pairs are not published as cycles in this build.");
      else {
        var id = pairId(s[0], s[1], P.event === "conj" ? "conj" : "opp");
        if (id) sel = [id];
        else why.push("that pair is not published as a cycle.");
      }
    }
    /* NO EVENT NAMED, BUT A PATTERN ASKED FOR.

       "the mutual position of Sūrya and Śukra over 200 years as an orbit
       pattern" names two grahas, a long span and a figure, and no event at
       all — and it is perfectly clear what it means. The recurring
       configuration two bodies make is their conjunction, and that is what a
       pattern over centuries is a pattern OF. So it is read that way.

       It is read that way OUT LOUD. An inference the reader did not state is
       exactly the kind of thing that should not happen silently, so the note
       says what was assumed and the readback shows it. Without the long span
       or the figure, two grahas still mean what they plainly mean: where they
       are now, and the angle between them. */
    if (!sel.length && !why.length && s.length >= 2 && !P.event &&
        (P.figure === "rose" || (P.spanDays && P.spanDays > 365 * 2))) {
      var cid = pairId(s[0], s[1], "conj");
      if (cid) {
        sel = [cid];
        note = "no event was named, so this is read as the conjunctions of " +
               s[0] + " and " + s[1] + " — the configuration a pattern over " +
               "that long is a pattern of.";
      }
    }
    /* no event named: the figure, or the subjects alone, decide */
    if (!sel.length && !why.length) {
      if (P.figure === "angle" && s.length >= 2)
        sel = ["sky.lon." + s[0], "sky.lon." + s[1]];
      else if (P.figure === "trace" && s.length)
        sel = s.map(function (q) { return "tr.track." + q; }).slice(0, 2);
      else if (P.figure === "almanac") sel = ["day.almanac"];
      else if (P.figure === "web") sel = ["rel.drishti"];
      else if (P.figure === "gears") sel = ["dasha.gears"];
      else if (P.figure === "timeline") sel = ["dasha.maha"];
      else if (P.figure === "heat") sel = ["av.grid"];
      else if (P.figure === "bars") sel = ["bala.total_rupa"];
      else if (P.figure === "kundliN" || P.figure === "kundliS") sel = ["chart.d1"];
      else if (P.figure === "sudarshana") sel = ["chart.sudarshana"];
      else if (P.figure === "rings") sel = ["geo.rashis", "geo.naks"];
      else if (P.figure === "fiveLimbs") sel = ["pan.fiveLimbs"];
      else if (P.figure === "horas") sel = ["pan.horas"];
      else if (P.figure === "choghadiya") sel = ["pan.choghadiya"];
      else if (P.figure === "tara") sel = ["pan.tara"];
      else if (P.figure === "zoom" && s.length) sel = ["sky.lon." + s[0], "geo.d60"];
      else if (s.length === 1) sel = ["sky.now." + s[0]];
      else if (s.length >= 2) sel = s.slice(0, 4).map(function (q) { return "sky.now." + q; });
    }
    /* a figure named explicitly becomes a pinned composer, when it can draw
       what was selected — and when it cannot, that is said */
    if (P.figure && ["rose", "angle", "web", "rings", "bars", "kundliN",
                     "kundliS", "timeline", "gears", "trace", "heat",
                     "sudarshana", "zoom", "almanac"].indexOf(P.figure) >= 0)
      force = P.figure;
    /* a cycle set only ever draws as the orbit pattern, whatever else was
       asked for — saying so is better than pinning a composer that will not
       score and silently falling back */
    if (sel.length && sel[0].indexOf("cyc.") === 0) {
      if (force && force !== "rose") {
        var clash = "a long run of events draws as the orbit pattern; " +
                    P.figureSay + " cannot take one.";
        note = note ? (note + "  " + clash) : clash;
      }
      force = "rose";
    }
    return { sel: sel, force: force, why: why, note: note };
  }

  /* ---- the whole thing ---------------------------------------------------- */
  function understand(text) {
    var P = parse(text);
    var S = toSelection(P);
    var seconds = P.manner.slow ? 20 : (P.manner.fast ? 8 : 14);
    var format = P.manner.square ? "square" : (P.manner.wide ? "wide" : "reel");
    var pal = P.manner.light ? "parchment" : (P.manner.dark ? "eclipse" : "midnight");
    /* a span was asked for, or the event implies one worth seeing */
    var span = P.spanDays;
    if (!span && S.sel.length && S.sel[0].indexOf("cyc.") === 0)
      span = Math.round(365.2564 * 40);
    return {
      parse: P, sel: S.sel, force: S.force, why: S.why, note: S.note,
      spanDays: span, seconds: seconds, format: format, pal: pal,
      titles: P.manner.notitle ? false : true,
      bleed: !!P.manner.bleed,
      ok: S.sel.length > 0,
      headline: headlineFor(P, S),
      subline: sublineFor(P)
    };
  }
  function headlineFor(P, S) {
    var s = P.subjects;
    if (P.event === "purnima") return "Every full Moon";
    if (P.event === "amavasya") return "Every new Moon";
    if (P.event === "combust" && s.length) return s[0] + " under the beams";
    if (P.event === "station" && s.length) return s[0] + " turning";
    if ((P.event === "inferior" || P.event === "superior") && s.length)
      return s[0] + " " + (P.event === "inferior" ? "between us and Sūrya"
                                                  : "behind Sūrya");
    if (P.event === "conj" && s.length >= 2) return s[0] + " meets " + s[1];
    if (P.event === "opp" && s.length >= 2) return s[0] + " faces " + s[1];
    if (s.length === 1) return s[0];
    if (s.length >= 2) return s.slice(0, 3).join("  ·  ");
    return P.figureSay ? P.figureSay.charAt(0).toUpperCase() + P.figureSay.slice(1)
                       : "The sky";
  }
  function sublineFor(P) {
    var bits = [];
    if (P.spanDays) {
      var y = P.spanDays / 365.2564;
      bits.push(y >= 1.5 ? (Math.round(y) + " years") : (Math.round(P.spanDays) + " days"));
    }
    bits.push("{date}  ·  {place}");
    return bits.join("  ·  ");
  }

  /* ---- building a reel from it --------------------------------------------
     A title scene and a figure scene. Two is the shortest sequence that reads
     as a made thing rather than as a chart someone exported, and everything
     in it is an ordinary layer the user can then take apart. */
  function toReel(U) {
    var M = window.DPModel;
    if (!M) return null;
    var d = M.doc({ name: U.headline, format: U.format, pal: U.pal,
                    grade: { bright: 1.02, contrast: 1.05, sat: 1.04, hue: 0,
                             vignette: 0.30, grain: 0.08 },
                    scenes: [] });
    d.scenes = [];
    var titleLen = Math.max(2.5, U.seconds * 0.26);
    var mainLen = Math.max(4, U.seconds - titleLen);

    if (U.titles) {
      var s1 = M.scene({ name: "Title", seconds: titleLen,
        bg: { style: "radial", stars: true },
        trans: { k: "zoomBlur", seconds: 0.6 } });
      var glow = M.layer({ kind: "wash", shape: "disc", col: "custom",
        hex: "#2a3570", t0: 0, t1: titleLen,
        base: { x: 10, y: 24, w: 80, h: 44, opacity: 0.5, blur: 40 } });
      M.applyIdle(glow, s1, "pulse", 1.4, 1);
      s1.layers.push(glow);
      var h = M.layer({ kind: "text", text: U.headline, size: 0.072, lines: 2,
        col: "gold", weight: 800, tracking: 0.04, animator: "charRise",
        animSeconds: 1.3, t0: 0.15, t1: titleLen,
        base: { x: 8, y: 36, w: 84, h: 16 } });
      s1.layers.push(h);
      var rule = M.layer({ kind: "rule", shape: "line", col: "gold",
        t0: 0.6, t1: titleLen, base: { x: 40, y: 56, w: 20, h: 0.3 } });
      M.applyEntry(rule, s1, "unroll", 0.8);
      s1.layers.push(rule);
      var sub = M.layer({ kind: "text", text: U.subline, size: 0.028, lines: 2,
        col: "dim", weight: 500, animator: "wordFade", animSeconds: 1.2,
        t0: 0.9, t1: titleLen, base: { x: 10, y: 60, w: 80, h: 10 } });
      s1.layers.push(sub);
      M.setKey(s1.camera.tracks.zoom, 0, 1.1, "inOut");
      M.setKey(s1.camera.tracks.zoom, titleLen, 1, "inOut");
      d.scenes.push(s1);
    }

    var s2 = M.scene({ name: "The figure", seconds: mainLen,
      bg: { style: "gradient", stars: true } });
    var box = U.bleed ? { x: 0, y: 0, w: 100, h: 100 }
                      : { x: 4, y: 12, w: 92, h: 58 };
    var v = M.layer({ kind: "view", sel: U.sel.slice(), force: U.force,
      t0: 0, t1: mainLen,
      base: { x: box.x, y: box.y, w: box.w, h: box.h } });
    /* the figure draws itself: the composer's own playhead is stretched over
       most of the scene, which for a cycle set means the pattern accumulates
       in front of the viewer rather than appearing complete */
    M.applyEntry(v, s2, "draw", mainLen * 0.82);
    s2.layers.push(v);
    if (U.titles && !U.bleed) {
      var band = M.layer({ kind: "band", text: U.headline, sub: U.subline,
        col: "gold", animator: "wordFade", animSeconds: 1,
        t0: 0.6, t1: mainLen, base: { x: 8, y: 74, w: 84, h: 11 } });
      M.applyEntry(band, s2, "rise", 0.8);
      s2.layers.push(band);
    }
    s2.layers.push(M.layer({ kind: "stamp", text: "{date}  ·  {place}",
      size: 0.018, col: "dim", t0: 0.3, t1: mainLen,
      base: { x: 8, y: 93, w: 84, h: 4 } }));
    d.scenes.push(s2);
    if (!d.scenes.length) d.scenes.push(M.scene({ name: "Scene 1" }));
    return d;
  }

  /* ---- the recipes ---------------------------------------------------------
     Generated from the same vocabulary the parser reads, so a recipe is
     always a sentence that parses. Each is produced with its own span, and
     the groups are ordered so that the first screenful is the interesting
     part rather than the alphabetical part. */
  function recipes() {
    var out = [];
    function add(group, text) { out.push({ group: group, text: text }); }
    var inner = ["Budha", "Śukra"];
    var seven = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];

    /* the patterns people come for */
    add("Patterns", "animate the inferior conjunctions of Śukra over 40 years as an orbit pattern");
    add("Patterns", "show every full Moon over the next 19 years as an orbit pattern");
    add("Patterns", "every new Moon for 19 years as a spiral");
    add("Patterns", "the inferior conjunctions of Budha over 25 years as an orbit pattern");
    add("Patterns", "Guru and Śani conjunctions over 200 years as an orbit pattern");
    add("Patterns", "Maṅgala stations over 80 years as an orbit pattern");

    /* Every pair, both events, several spans, several figures. This is where
       the bulk is, and none of it is filler: each one resolves to a different
       node or a different span, so each is a different computation rather
       than the same picture with a different caption. */
    var SPANS = [["50 years", 50], ["100 years", 100], ["200 years", 200]];
    for (var i = 0; i < seven.length; i++)
      for (var j = i + 1; j < seven.length; j++) {
        var a = seven[i], b = seven[j];
        SPANS.forEach(function (sp) {
          add("Conjunctions", "animate the conjunctions of " + a + " and " + b +
              " over " + sp[0] + " as an orbit pattern");
        });
        add("Oppositions", "show " + a + " opposite " + b +
            " over 100 years as an orbit pattern");
        add("Oppositions", "every opposition of " + a + " and " + b +
            " for 200 years as a spiral");
        add("Mutual position", "animate the mutual position of " + a + " and " + b);
        add("Mutual position", "the angle between " + a + " and " + b + " now");
        add("Mutual position", "animate the mutual position of " + a + " and " + b +
            " over 200 years as an orbit pattern");
      }
    /* combustion and stations for every body that has them, at several spans */
    ["Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
      [["20 years", 0], ["50 years", 1], ["100 years", 2]].forEach(function (sp) {
        add("Combustion", "every time " + sa + " is combust over " + sp[0] +
            " as an orbit pattern");
      });
      add("Combustion", "when is " + sa + " combust over the next 10 years");
      add("Combustion", "show " + sa + " under the sun's beams for 30 years");
    });
    ["Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach(function (sa) {
      [["20 years", 0], ["60 years", 1], ["150 years", 2]].forEach(function (sp) {
        add("Stations", sa + " stations over " + sp[0] + " as an orbit pattern");
      });
      add("Stations", "show " + sa + " retrograde turning points over 20 years");
      add("Stations", "when does " + sa + " turn vakri over the next 10 years");
    });
    inner.forEach(function (sa) {
      [["20 years", 0], ["40 years", 1], ["120 years", 2]].forEach(function (sp) {
        add("Inferior and superior", "the inferior conjunctions of " + sa +
            " over " + sp[0] + " as an orbit pattern");
        add("Inferior and superior", "the superior conjunctions of " + sa +
            " over " + sp[0] + " as an orbit pattern");
      });
    });
    /* the syzygies at several spans */
    [["19 years", 0], ["50 years", 1], ["100 years", 2]].forEach(function (sp) {
      add("Full and new Moon", "show every full Moon over " + sp[0] +
          " as an orbit pattern");
      add("Full and new Moon", "every new Moon for " + sp[0] + " as a spiral");
    });
    add("Full and new Moon", "the next 60 Purnimas as an orbit pattern");
    add("Full and new Moon", "the next 100 new moons as a spiral");
    /* single bodies over time, several spans */
    seven.concat(["Rāhu", "Ketu"]).forEach(function (sa) {
      [["2 years", 0], ["10 years", 1], ["30 years", 2]].forEach(function (sp) {
        add("Paths", "trace " + sa + " over the next " + sp[0]);
      });
      add("Now", "where is " + sa + " now");
      add("Deep zoom", "zoom into " + sa + " down to the ṣaṣṭyāṃśa");
    });
    /* the day and the chart */
    add("The day", "draw the almanac leaf for today");
    add("The day", "show today's pañcāṅga as a calendar card");
    add("The day", "show the five limbs of today");
    add("The chart", "draw my chart as a North Indian kundli");
    add("The chart", "draw my chart as a South Indian chart");
    add("The chart", "show the Sudarśana three charts");
    add("The chart", "compare the ṣaḍbala strengths as bars");
    add("The chart", "show the aspect web");
    add("The chart", "show the daśā gears");
    add("The chart", "show the daśā periods as a timeline");
    add("The chart", "show the aṣṭakavarga as a heat grid");
    add("The rings", "show the rāśi and nakṣatra rings");
    add("The rings", "show the zodiac wheel");
    /* manner, demonstrated */
    add("Manner", "animate the conjunctions of Guru and Śani over 200 years slowly, full bleed, on dark");
    add("Manner", "show every full Moon for 19 years as a square, no title");
    add("Manner", "trace Maṅgala over 5 years quickly as a landscape");
    add("Manner", "the inferior conjunctions of Śukra over 40 years on parchment");
    add("Manner", "every new Moon for 19 years as a reel, slowly, with a title");
    return out;
  }

  window.SPIntent = {
    parse: parse, toSelection: toSelection, understand: understand,
    toReel: toReel, recipes: recipes, fold: fold,
    ALIAS: ALIAS, EVENTS: EVENTS, FIGURES: FIGURES, MANNER: MANNER
  };
})();

/* ===== Saying what you want — the panel ===================================

   One module, two hosts. On Director Pro a sentence becomes a whole reel; on
   Studio Pro it becomes a selection and a pinned view. The difference is two
   lines at the end, because the parse is the same question either way.

   WHAT THE PANEL IS FOR, BEYOND CONVENIENCE. It is the fastest way to learn
   the vocabulary. A reader types something, sees phrase by phrase what was
   understood and what was not, and adjusts — which teaches the grammar in the
   place it is used rather than in a list somebody has to go and read. That is
   why the readback is not a status line but the main thing on the panel, and
   why an unrecognised word is shown as the word rather than as "parse error".

   The suggestions are the same grammar run backwards: every one of them is a
   sentence this parser really reads, generated from the registry, so they
   cannot drift out of step with what is understood. Typing filters them, so
   the list doubles as a search over everything the page can be asked for. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var HOST = null, MODE = null, LAST = null;

  function readback(U) {
    var box = $("si-read");
    if (!box) return;
    box.innerHTML = "";
    if (!U) return;
    var P = U.parse;

    if (P.understood.length) {
      var u = el("p", "siread");
      u.appendChild(el("b", null, "Understood: "));
      P.understood.forEach(function (q, i) {
        if (i) u.appendChild(document.createTextNode("  ·  "));
        u.appendChild(el("span", "sigood", q));
      });
      box.appendChild(u);
    } else {
      box.appendChild(el("p", "siread",
        "Nothing in that was recognised. Try one of the suggestions below — " +
        "they are all sentences this understands."));
    }
    if (P.ignored.length) {
      var g = el("p", "siread");
      g.appendChild(el("b", null, "Not placed: "));
      P.ignored.slice(0, 8).forEach(function (q, i) {
        if (i) g.appendChild(document.createTextNode(", "));
        g.appendChild(el("span", "sibad", q));
      });
      g.appendChild(document.createTextNode(
        " — these were skipped, not guessed at."));
      box.appendChild(g);
    }
    U.why.forEach(function (w) {
      box.appendChild(el("p", "siwhy", w));
    });
    if (U.note) box.appendChild(el("p", "siwhy", U.note));
    if (U.ok) {
      var s = el("p", "siread");
      s.appendChild(el("b", null, "Will draw: "));
      s.appendChild(document.createTextNode(
        U.sel.map(function (id) {
          var n = window.SPNodes.byId(id);
          return n ? n.label : id;
        }).join(" + ") +
        (U.force ? "  as " + U.force : "") +
        (U.spanDays ? "  over " + (U.spanDays >= 500
          ? (U.spanDays / 365.2564).toFixed(0) + " years"
          : Math.round(U.spanDays) + " days") : "")));
      box.appendChild(s);
    }
  }

  function apply(U) {
    if (!U || !U.ok) return false;
    if (U.spanDays) {
      var sp = $(MODE === "dp" ? "dp-span" : "sp-span");
      if (sp) {
        var want = String(Math.round(U.spanDays));
        var has = false;
        [].forEach.call(sp.options, function (o) { if (o.value === want) has = true; });
        if (!has) {
          var o2 = el("option", null, U.spanDays >= 500
            ? (U.spanDays / 365.2564).toFixed(0) + " years"
            : Math.round(U.spanDays) + " days");
          o2.value = want;
          sp.appendChild(o2);
        }
        sp.value = want;
        sp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    if (MODE === "dp") {
      var d = window.SPIntent.toReel(U);
      if (!d) return false;
      window.__dp.mark();
      window.__dp.setDoc(d);
      return true;
    }
    /* Studio Pro: the selection and the pinned view */
    if (window.__spUI) {
      window.__spUI.select(U.sel);
      if (U.force) {
        var btns = document.querySelectorAll("#sp-views .spview");
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].getAttribute("data-key") === U.force) { btns[i].click(); break; }
        }
      }
      return true;
    }
    return false;
  }

  function run() {
    var inp = $("si-text");
    if (!inp) return;
    var U = window.SPIntent.understand(inp.value || "");
    LAST = U;
    readback(U);
    if (!U.ok) { flash("Nothing to draw from that yet — see the readback."); return; }
    if (apply(U)) flash(MODE === "dp"
      ? "Built a reel. Everything in it is an ordinary layer you can now edit."
      : "Selected. The stage is drawing it.");
  }
  function flash(msg) {
    var f = $(MODE === "dp" ? "dp-flash" : "sp-flash");
    if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }

  function suggestions(filter) {
    var host = $("si-list");
    if (!host) return;
    host.innerHTML = "";
    var all = window.SPIntent.recipes();
    var f = window.SPIntent.fold(filter || "");
    var terms = f ? f.split(/\s+/).filter(Boolean) : [];
    var hits = all.filter(function (r) {
      if (!terms.length) return true;
      var hay = window.SPIntent.fold(r.text + " " + r.group);
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    var stat = $("si-stat");
    if (stat) stat.textContent = hits.length + " of " + all.length +
      " things you can ask for";
    var groups = {};
    hits.slice(0, 160).forEach(function (r) {
      (groups[r.group] = groups[r.group] || []).push(r);
    });
    Object.keys(groups).forEach(function (g) {
      var sec = el("div", "sigroup");
      sec.appendChild(el("h5", null, g));
      groups[g].forEach(function (r) {
        var b = el("button", "sirecipe", r.text);
        b.type = "button";
        b.addEventListener("click", function () {
          var inp = $("si-text");
          if (inp) inp.value = r.text;
          run();
        });
        sec.appendChild(b);
      });
      host.appendChild(sec);
    });
    if (!hits.length)
      host.appendChild(el("p", "siread",
        "Nothing matches that. The vocabulary is the nine grahas, the events " +
        "(conjunction, opposition, full and new Moon, combustion, stations), " +
        "a span of time, and a figure to draw it as."));
  }

  function mount(mode) {
    MODE = mode;
    var inp = $("si-text");
    if (!inp) return;
    inp.addEventListener("input", function () {
      /* the readback updates as you type — the point is to see the grammar
         working, not to find out after pressing a button */
      var U = window.SPIntent.understand(inp.value || "");
      LAST = U;
      readback(U);
      suggestions(inp.value);
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); run(); }
    });
    var go = $("si-go");
    if (go) go.addEventListener("click", run);
    var ex = $("si-shuffle");
    if (ex) ex.addEventListener("click", function () {
      var all = window.SPIntent.recipes();
      var r = all[Math.floor(Math.random() * all.length)];
      inp.value = r.text;
      run();
      suggestions("");
    });
    suggestions("");
    readback(null);
  }

  window.SPIntentUI = { mount: mount, run: run, last: function () { return LAST; },
                        apply: apply, suggestions: suggestions };

  function boot() {
    if (!$("si-text")) return;
    if (window.__dp) mount("dp");
    else if (window.__spUI) mount("sp");
    else setTimeout(boot, 120);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 60); });
  else setTimeout(boot, 60);
})();

/* ===== Studio Pro — Director mode =========================================

   WHAT THIS IS, AND WHY IT IS A SECOND MODE RATHER THAN A REPLACEMENT.

   Auto mode answers "what is the best picture of this selection?" and it
   answers it well, which is exactly why it cannot also be the pro tool. Its
   whole method is to decide: it scores the composers, picks the winner, lays
   it in the one stage rect, and times it against the one playhead. Every one
   of those decisions is the right default and none of them is negotiable, so
   a user who wants the Moon's track small in the corner, the ṣaḍbala bars
   full-bleed behind it, a line of their own text entering at four seconds and
   the whole thing drifting — cannot get there by arguing with the scorer.

   Director mode takes the same composition apart into LAYERS and hands every
   one of those decisions over. A layer is:

     what   — a group of selected nodes and which composer draws them, or a
              piece of text, a rule, a wash, the caption band, the stamp
     where  — a rectangle in fractions of the frame, with an optional second
              rectangle it travels to, so a move, a zoom or a pan is just
              two rects and an easing
     when   — a window [t0,t1] of the reel, so layers sequence against each
              other rather than all starting at zero
     how    — an entry, an exit, a continuous idle motion, an easing, an
              opacity, a rotation, and which clock the composer inside sees

   Nothing here draws astronomy. Every picture is still one of the fifteen
   composers, because a composer has never known where it sits: it is handed a
   rect and a playhead and sizes everything from them. That is the whole
   reason this mode is a few hundred lines and not a rewrite, and it is why a
   composer added for Auto mode arrives in Director already placeable,
   already timeable, already animatable.

   THE DOCUMENT IS DATA. A composition is a plain object that serialises to
   JSON, which is what makes it saveable, re-openable, shareable as text and
   testable. The test suite builds documents, renders them and asserts the
   frames differ — a thing that was impossible to assert about Auto mode,
   where the arrangement was implicit in the code.

   WHAT IT COSTS PER FRAME. Director renders N layers where Auto rendered one,
   so the cost is the honest sum of the layers rather than a fixed price. Two
   things keep that from undoing the performance work: node values are cached
   per context in the registry, so a node read by three layers is derived
   once; and nothing in this file touches the DOM. The handles are drawn by a
   separate overlay pass that the UI calls after rendering and the recorder
   never calls, which is also why they cannot end up in an export. */

(function () {
  "use strict";

  function K() { return window.SPStage.kit; }
  function S() { return window.SPStage.S; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }

  /* ---- easing ------------------------------------------------------------
     Five, not fifty. Each one is a different intention — arrive evenly,
     arrive softly, leave softly, settle, overshoot — and a list of twenty
     named curves is a list in which nobody can tell two of them apart. */
  var EASE = {
    linear: { label: "Linear", f: function (f) { return f; } },
    smooth: { label: "Smooth", f: function (f) { return f * f * (3 - 2 * f); } },
    "in":   { label: "Ease in", f: function (f) { return f * f; } },
    out:    { label: "Ease out", f: function (f) { return 1 - (1 - f) * (1 - f); } },
    back:   { label: "Overshoot", f: function (f) {
      var c = 1.70158; var g = f - 1;
      return 1 + (c + 1) * g * g * g + c * g * g; } }
  };
  function ease(f, key) { return (EASE[key] || EASE.smooth).f(clamp(f, 0, 1)); }

  /* ---- motion ------------------------------------------------------------
     An entry, an exit and an idle each return a contribution to one
     transform, and the three are composed. Keeping them as contributions
     rather than as three separate draws is what lets a layer rise in, drift
     through and fade out without the three fighting over the canvas state. */
  function T0() {
    return { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, a: 1, clip: null, cp: null };
  }
  var ENTER = {
    none:   { label: "Appear", f: function () {} },
    fade:   { label: "Fade in", f: function (T, f) { T.a *= f; } },
    rise:   { label: "Rise", f: function (T, f) { T.a *= f; T.dy += (1 - f) * 0.10; } },
    drop:   { label: "Drop", f: function (T, f) { T.a *= f; T.dy -= (1 - f) * 0.10; } },
    slideL: { label: "In from left", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx -= (1 - f) * 0.35; } },
    slideR: { label: "In from right", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx += (1 - f) * 0.35; } },
    pop:    { label: "Pop", f: function (T, f) { T.a *= f; T.sx *= 0.80 + 0.20 * f; T.sy *= 0.80 + 0.20 * f; } },
    zoom:   { label: "Zoom in", f: function (T, f) { T.a *= Math.min(1, f * 1.6); T.sx *= 1.35 - 0.35 * f; T.sy *= 1.35 - 0.35 * f; } },
    wipeUp: { label: "Wipe up", f: function (T, f) { T.clip = { x: 0, y: 1 - f, w: 1, h: f }; } },
    wipeL:  { label: "Wipe across", f: function (T, f) { T.clip = { x: 0, y: 0, w: f, h: 1 }; } },
    iris:   { label: "Iris", f: function (T, f) { T.cp = f; } },
    turn:   { label: "Turn in", f: function (T, f) { T.a *= f; T.rot += (1 - f) * -14; } },
    /* the composer's own build-up IS the entry — nothing is transformed, and
       the clock handling below feeds it a rising p */
    draw:   { label: "Draw itself", f: function () {} }
  };
  var EXIT = {
    none:    { label: "Stay", f: function () {} },
    fade:    { label: "Fade out", f: function (T, f) { T.a *= 1 - f; } },
    sink:    { label: "Sink", f: function (T, f) { T.a *= 1 - f; T.dy += f * 0.10; } },
    lift:    { label: "Lift", f: function (T, f) { T.a *= 1 - f; T.dy -= f * 0.10; } },
    slideL:  { label: "Out to left", f: function (T, f) { T.a *= 1 - f * f; T.dx -= f * 0.35; } },
    slideR:  { label: "Out to right", f: function (T, f) { T.a *= 1 - f * f; T.dx += f * 0.35; } },
    shrink:  { label: "Shrink", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 - 0.22 * f; T.sy *= 1 - 0.22 * f; } },
    pullBack:{ label: "Pull back", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 + 0.30 * f; T.sy *= 1 + 0.30 * f; } },
    wipeDown:{ label: "Wipe away", f: function (T, f) { T.clip = { x: 0, y: 0, w: 1, h: 1 - f }; } }
  };
  /* Idle motions run on the reel clock, not the layer's, so two layers with
     different windows still drift in step — the thing that makes a frame feel
     like one scene rather than several animations sharing a canvas. */
  var IDLE = {
    none:  { label: "Still", f: function () {} },
    drift: { label: "Drift", f: function (T, a, p) {
      T.dx += Math.sin(p * Math.PI * 2) * 0.012 * a;
      T.dy += Math.cos(p * Math.PI * 2 * 0.7) * 0.010 * a; } },
    bob:   { label: "Bob", f: function (T, a, p) {
      T.dy += Math.sin(p * Math.PI * 4) * 0.011 * a; } },
    sway:  { label: "Sway", f: function (T, a, p) {
      T.rot += Math.sin(p * Math.PI * 2) * 2.2 * a; } },
    spin:  { label: "Spin", f: function (T, a, p) { T.rot += p * 360 * a; } },
    pulse: { label: "Breathe", f: function (T, a, p) {
      var s = 1 + Math.sin(p * Math.PI * 4) * 0.035 * a;
      T.sx *= s; T.sy *= s; } },
    creep: { label: "Slow zoom", f: function (T, a, p) {
      var s = 1 + p * 0.10 * a; T.sx *= s; T.sy *= s; } },
    flicker: { label: "Shimmer", f: function (T, a, p) {
      T.a *= 1 - Math.abs(Math.sin(p * Math.PI * 9)) * 0.14 * a; } }
  };

  /* ---- what a layer can be ---------------------------------------------- */
  var KINDS = {
    view:  "A composition — selected nodes drawn by a composer",
    text:  "A line or paragraph of your own words",
    rule:  "A hairline or a bar",
    wash:  "A tint, a vignette or a panel behind other layers",
    band:  "The caption band — headline over sub-line",
    stamp: "The handle, the date and the place"
  };
  var COLS = ["ink", "gold", "dim", "ben", "mal", "line", "bg", "custom"];

  function uid() {
    uid.n = (uid.n || 0) + 1;
    return "L" + uid.n + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function layer(o) {
    o = o || {};
    var L = {
      id: o.id || uid(),
      kind: o.kind || "view",
      name: o.name || "",
      hidden: !!o.hidden,
      locked: !!o.locked,
      /* view */
      sel: (o.sel || []).slice(),
      force: o.force || null,
      /* text / rule / wash / band / stamp */
      text: o.text || "",
      size: o.size == null ? 0.030 : o.size,
      align: o.align || "center",
      valign: o.valign || "middle",
      weight: o.weight == null ? 700 : o.weight,
      col: o.col || "ink",
      hex: o.hex || "#ffffff",
      lines: o.lines == null ? 3 : o.lines,
      sub: o.sub || "",
      shape: o.shape || "flat",
      /* where */
      rect: o.rect ? { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h }
                   : { x: 0.10, y: 0.20, w: 0.80, h: 0.40 },
      to: o.to ? { x: o.to.x, y: o.to.y, w: o.to.w, h: o.to.h } : null,
      rot: o.rot || 0,
      opacity: o.opacity == null ? 1 : o.opacity,
      /* A composer sizes its diagram from the rect but writes its labels
         wherever its own layout puts them, which in a small rect can be
         outside it. That is right in Auto mode, where the rect is the whole
         stage, and wrong the moment a user places two layers side by side and
         one writes over the other. Off by default, because clipping a layer
         that was not overflowing only costs a clip; on, it makes the
         rectangle mean exactly what it looks like it means. */
      clip: !!o.clip,
      /* when — fractions of the reel */
      t0: o.t0 == null ? 0 : o.t0,
      t1: o.t1 == null ? 1 : o.t1,
      /* how */
      enter: { k: (o.enter && o.enter.k) || "fade",
               len: (o.enter && o.enter.len) == null ? 0.25 : o.enter.len },
      exit:  { k: (o.exit && o.exit.k) || "none",
               len: (o.exit && o.exit.len) == null ? 0.20 : o.exit.len },
      idle:  { k: (o.idle && o.idle.k) || "none",
               amt: (o.idle && o.idle.amt) == null ? 1 : o.idle.amt },
      ease: o.ease || "smooth",
      /* which playhead the composer inside sees */
      clock: o.clock || "layer",
      at: o.at == null ? 1 : o.at,
      cycles: o.cycles == null ? 1 : o.cycles
    };
    return L;
  }

  function doc(o) {
    o = o || {};
    return {
      on: !!o.on,
      name: o.name || "Untitled composition",
      bg: { style: (o.bg && o.bg.style) || "gradient",
            stars: o.bg ? !!o.bg.stars : true },
      layers: (o.layers || []).map(layer)
    };
  }

  var DOC = doc({ on: false });
  var PICK = null;          /* the id of the layer being edited */

  /* ---- grouping a selection into layers ----------------------------------

     Taking control has to start from something that already looks like what
     Auto drew, or the mode is a blank canvas pretending to be a studio. So
     "split" groups the selection the way the Layers composer does — by the
     shape each node declares, with a longitude riding along with the lanes or
     edges it annotates — and gives each group its own layer. The user then
     moves, retimes and restyles groups that were already drawn sensibly,
     which is editing; starting from nothing is authoring from scratch, and
     anyone who wants that can clear the stack in one click. */
  var ORDER = ["almanac", "houses", "houseset", "grid", "lanes", "edges",
               "spanset", "span", "series", "sset", "scalar", "lonset", "lon"];

  function groupsOf(sel, C) {
    var B = window.SPStage.bagOf(sel, C);
    var bag = B.bag, groups = [];
    var hasLanes = !!(bag.lanes && bag.lanes.length);
    var hasEdges = !!(bag.edges && bag.edges.length);
    ORDER.forEach(function (k) {
      var items = bag[k];
      if (!items || !items.length) return;
      if (k === "lon" && (hasLanes || hasEdges)) return;
      var ids = items.map(function (it) { return it.node.id; });
      if ((k === "lanes" || k === "edges") && bag.lon)
        ids = ids.concat(bag.lon.map(function (it) { return it.node.id; }));
      groups.push({ kind: k, ids: ids,
                    label: items.length === 1 ? items[0].node.label
                                              : items.length + " × " + k });
    });
    return { groups: groups, missing: B.missing };
  }

  /* ---- the frame rectangles ---------------------------------------------- */
  /* The stage rect as fractions, so a layer built here lands exactly where
     Auto would have drawn it and the switch into Director does not move the
     picture. */
  function stageRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var top = safe ? SA.top : 0.045;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    var band = 0.115;
    return { x: side, y: top, w: 1 - side * 2, h: 1 - top - bot - band };
  }
  function bandRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    return { x: side, y: 1 - bot - 0.115, w: 1 - side * 2, h: 0.105 };
  }

  /* ---- building a document ----------------------------------------------- */
  /* `how`:
       "single" — the whole selection as one layer, drawn as Auto drew it
       "split"  — one layer per shape group
       "solo"   — one layer per selected node, each drawn on its own
     All three add the caption band and the stamp as layers, because the point
     of the mode is that the chrome is editable too: a user who wants the
     headline centred over the diagram rather than under it must be able to
     pick it up and move it. */
  function build(sel, C, force, how, headline, sub) {
    var R = stageRect(), out = [], g;
    sel = (sel || []).slice();

    if (how === "solo") {
      sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        if (!n || !window.SPNodes.resolve(n, C)) return;
        out.push({ sel: [id], label: n.label });
      });
    } else if (how === "split") {
      g = groupsOf(sel, C);
      g.groups.forEach(function (q) { out.push({ sel: q.ids, label: q.label }); });
    } else {
      if (sel.length) out.push({ sel: sel, force: force || null, label: "The composition" });
    }
    if (!out.length && sel.length)
      out.push({ sel: sel, force: force || null, label: "The composition" });

    var n = out.length, layers = [];
    /* a wash behind everything, off by default in style but present so it is
       one click from being a panel rather than a thing to go and find */
    layers.push(layer({ kind: "wash", name: "Backdrop panel", hidden: true,
                        shape: "panel", col: "line", opacity: 0.30,
                        rect: { x: 0.05, y: 0.11, w: 0.90, h: 0.70 },
                        enter: { k: "fade", len: 0.18 } }));

    out.forEach(function (q, i) {
      var r;
      if (n === 1) r = R;
      else if (n === 2)
        r = { x: R.x, y: R.y + (R.h / 2) * i, w: R.w, h: R.h / 2 * 0.94 };
      else {
        var rows = Math.ceil(n / 2), col = i % 2, row = Math.floor(i / 2);
        r = { x: R.x + (R.w / 2) * col, y: R.y + (R.h / rows) * row,
              w: R.w / 2 * 0.95, h: R.h / rows * 0.94 };
      }
      layers.push(layer({
        kind: "view", name: q.label, sel: q.sel, force: q.force || null, rect: r,
        /* staggered, so a split composition reads as one thing assembling
           rather than four things starting at once */
        t0: n > 1 ? clamp(i * 0.12, 0, 0.5) : 0, t1: 1,
        enter: { k: i % 2 ? "slideR" : "rise", len: n > 1 ? 0.22 : 0.30 },
        exit: { k: "none", len: 0.2 },
        idle: { k: "none", amt: 1 }, clock: "layer"
      }));
    });

    var BR = bandRect();
    layers.push(layer({
      kind: "band", name: "Caption band",
      text: headline || "", sub: sub || "",
      rect: BR, t0: n > 1 ? 0.10 : 0.04, t1: 1,
      enter: { k: "rise", len: 0.22 }, col: "gold"
    }));
    layers.push(layer({
      kind: "stamp", name: "Stamp — handle and date",
      rect: { x: 0.08, y: 1 - (S().safe ? window.SPStage.SAFE.bottom : 0.045) - 0.012,
              w: 0.84, h: 0.040 },
      size: 0.019, col: "dim", t0: 0.02, t1: 1,
      enter: { k: "fade", len: 0.25 }
    }));

    DOC = doc({ on: true, name: "From " + (sel.length || 0) + " node(s)",
                bg: { style: "gradient", stars: true }, layers: layers });
    PICK = layers.length > 1 ? layers[1].id : layers[0].id;
    return DOC;
  }

  /* ---- arrangement presets -----------------------------------------------
     Not templates for the picture — templates for the GEOMETRY. They re-lay
     the view layers that already exist and leave the text, the band and the
     stamp where they are, so trying an arrangement costs one click and
     nothing is lost by trying it. */
  var ARRANGE = {
    stack: { label: "Stack", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h / n) * i, w: R.w, h: R.h / n * 0.94 };
      });
    } },
    grid: { label: "Grid", f: function (views, R) {
      var n = views.length, cols = n <= 1 ? 1 : 2, rows = Math.ceil(n / cols);
      views.forEach(function (L, i) {
        var c = i % cols, r = Math.floor(i / cols);
        L.rect = { x: R.x + (R.w / cols) * c, y: R.y + (R.h / rows) * r,
                   w: R.w / cols * 0.95, h: R.h / rows * 0.94 };
      });
    } },
    hero: { label: "Hero and strip", f: function (views, R) {
      if (!views.length) return;
      var rest = views.length - 1;
      views[0].rect = { x: R.x, y: R.y, w: R.w, h: R.h * (rest ? 0.64 : 1) };
      for (var i = 1; i < views.length; i++)
        views[i].rect = { x: R.x + (R.w / rest) * (i - 1), y: R.y + R.h * 0.68,
                          w: R.w / rest * 0.94, h: R.h * 0.32 };
    } },
    bleed: { label: "Full bleed", f: function (views) {
      views.forEach(function (L) { L.rect = { x: 0, y: 0, w: 1, h: 1 }; });
    } },
    thirds: { label: "Upper third", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h * 0.62 / n) * i,
                   w: R.w, h: R.h * 0.62 / n * 0.94 };
      });
    } },
    corners: { label: "Scatter", f: function (views, R) {
      var SP = [[0.00, 0.00], [0.50, 0.00], [0.00, 0.50], [0.50, 0.50]];
      views.forEach(function (L, i) {
        var s = SP[i % 4];
        L.rect = { x: R.x + R.w * s[0], y: R.y + R.h * s[1],
                   w: R.w * 0.48, h: R.h * 0.47 };
      });
    } },
    centre: { label: "Centre all", f: function (views, R) {
      views.forEach(function (L) {
        L.rect = { x: R.x + R.w * 0.08, y: R.y + R.h * 0.10,
                   w: R.w * 0.84, h: R.h * 0.78 };
      });
    } }
  };
  function arrange(key) {
    var f = ARRANGE[key]; if (!f) return;
    var views = DOC.layers.filter(function (L) { return L.kind === "view"; });
    f.f(views, stageRect());
  }

  /* Sequencing presets — the time axis gets the same treatment as the space
     one, because "they all start at zero" is the single most common reason a
     multi-layer reel reads as a mess. */
  var SEQUENCE = {
    together: { label: "All at once", f: function (Ls) {
      Ls.forEach(function (L) { L.t0 = 0; L.t1 = 1; }); } },
    cascade: { label: "Cascade", f: function (Ls) {
      Ls.forEach(function (L, i) {
        L.t0 = clamp(i * (0.6 / Math.max(1, Ls.length)), 0, 0.7); L.t1 = 1; }); } },
    relay: { label: "One at a time", f: function (Ls) {
      var n = Ls.length || 1;
      Ls.forEach(function (L, i) {
        L.t0 = i / n; L.t1 = (i + 1) / n;
        L.enter = { k: L.enter.k === "none" ? "fade" : L.enter.k, len: 0.30 };
        L.exit = { k: "fade", len: 0.25 }; }); } },
    overlap: { label: "Overlapping", f: function (Ls) {
      var n = Ls.length || 1, w = Math.min(1, 1.8 / n);
      Ls.forEach(function (L, i) {
        L.t0 = clamp((i / n) * (1 - w * 0.4), 0, 0.9);
        L.t1 = clamp(L.t0 + w, 0.1, 1);
        L.exit = { k: "fade", len: 0.3 }; }); } }
  };
  function sequence(key) {
    var f = SEQUENCE[key]; if (!f) return;
    f.f(DOC.layers.filter(function (L) { return !L.hidden; }));
  }

  /* ---- text with the day in it -------------------------------------------
     A studio whose text layers are only literal strings makes a card that is
     out of date tomorrow. These resolve at render time from the same context
     every node reads, so a saved composition reopened next week says next
     week's tithi — and a token that cannot be resolved prints as itself
     rather than as "undefined", so a typo in a token is visible on the frame
     rather than silently blank. */
  var TOKENS = {
    "{date}": function (C) {
      var g = C.day && C.day.gregorian;
      if (!g) return new Date(C.when).toDateString();
      var M = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"];
      return g.d + " " + (M[(g.m || 1) - 1] || "") + " " + g.y;
    },
    "{place}": function (C) { return (C.place && C.place.n) || ""; },
    "{vara}": function (C) { return (C.day && C.day.vara) || ""; },
    "{tithi}": function (C) {
      var a = C.day && C.day.at && C.day.at.tithi;
      return a ? ((a.paksha ? a.paksha + " " : "") + a.name) : ""; },
    "{naks}": function (C) {
      var a = C.day && C.day.at && C.day.at.nak;
      return a ? a.name + " pāda " + a.pada : ""; },
    "{yoga}": function (C) {
      var a = C.day && C.day.at && C.day.at.yoga; return a ? a.name : ""; },
    "{karana}": function (C) {
      var a = C.day && C.day.at && C.day.at.karana; return a ? a.name : ""; },
    "{masa}": function (C) {
      var m = C.day && C.day.masa; return m ? (m.amantaIAST || "") : ""; },
    "{samvat}": function (C) {
      var s = C.day && C.day.samvat;
      return s && s.vikrama ? s.vikrama + " Vikrama" : ""; },
    "{dasha}": function (C) {
      try { var cm = window.SPNodes.currentMd(C); return cm ? cm.lord : ""; }
      catch (e) { return ""; } },
    "{handle}": function () { return S().handle || "@Nirayana.Soft"; }
  };
  function expand(s, C) {
    if (!s) return "";
    return String(s).replace(/\{[a-z]+\}/g, function (m) {
      var f = TOKENS[m];
      if (!f) return m;
      var v = "";
      try { v = f(C) || ""; } catch (e) { v = ""; }
      return v || m;
    });
  }
  function tokenList() {
    var out = [];
    for (var k in TOKENS) if (TOKENS.hasOwnProperty(k)) out.push(k);
    return out;
  }

  /* ---- colour ------------------------------------------------------------ */
  function colOf(L) {
    var P = K().pal();
    if (L.col === "custom") return L.hex || P.ink;
    return P[L.col] || P.ink;
  }

  /* ---- the frame-owning composers ---------------------------------------
     The almanac leaf paints a whole page to the frame's edge: it is a card,
     not a diagram, and it has no notion of sitting inside a rectangle. In
     Director it may be placed anywhere, so it is drawn once into a scratch
     canvas at the layer rect's own aspect and blitted. The scratch canvas is
     kept and reused, because allocating a 1080-wide canvas per frame is a
     garbage-collection pause every second or so. */
  var SCRATCH = null;
  function leafInto(v, p, px, C) {
    var w = Math.max(32, Math.round(px.w)), h = Math.max(32, Math.round(px.h));
    if (!SCRATCH) SCRATCH = document.createElement("canvas");
    if (SCRATCH.width !== w || SCRATCH.height !== h) {
      SCRATCH.width = w; SCRATCH.height = h;
    }
    var c2 = SCRATCH.getContext("2d");
    c2.clearRect(0, 0, w, h);
    try { window.SPAlmanac.draw(c2, w, h, v, p, K().pal(), { foot: S().handle }); }
    catch (e) { return; }
    S().ctx.drawImage(SCRATCH, px.x, px.y, px.w, px.h);
  }

  /* ---- a layer's time and transform -------------------------------------- */
  function windowU(L, p) {
    var a = Math.min(L.t0, L.t1), b = Math.max(L.t0, L.t1);
    if (b - a < 1e-4) return p >= a ? 1 : -1;
    if (p < a - 1e-6 || p > b + 1e-6) return -1;
    return clamp((p - a) / (b - a), 0, 1);
  }
  function transformOf(L, u, p) {
    var T = T0();
    var el = clamp(L.enter.len, 0, 1), xl = clamp(L.exit.len, 0, 1);
    var ep = el > 0.001 ? clamp(u / el, 0, 1) : 1;
    var xp = xl > 0.001 ? clamp((u - (1 - xl)) / xl, 0, 1) : 0;
    var E = ENTER[L.enter.k] || ENTER.fade;
    var X = EXIT[L.exit.k] || EXIT.none;
    var I = IDLE[L.idle.k] || IDLE.none;
    E.f(T, ease(ep, L.ease));
    if (xp > 0) X.f(T, ease(xp, L.ease));
    I.f(T, L.idle.amt == null ? 1 : L.idle.amt, p);
    T.a *= clamp(L.opacity, 0, 1);
    T.rot += L.rot || 0;
    return T;
  }
  function rectAt(L, u) {
    if (!L.to) return L.rect;
    var f = ease(u, L.ease);
    return { x: lerp(L.rect.x, L.to.x, f), y: lerp(L.rect.y, L.to.y, f),
             w: lerp(L.rect.w, L.to.w, f), h: lerp(L.rect.h, L.to.h, f) };
  }
  /* which playhead the composer inside the layer is handed */
  function innerP(L, u, p) {
    if (L.clock === "reel") return p;
    if (L.clock === "frozen") return clamp(L.at, 0, 1);
    if (L.clock === "loop") {
      var n = Math.max(1, L.cycles || 1);
      return (u * n) % 1;
    }
    if (L.enter.k === "draw") {
      /* the composer's own build-up is the entry, so it is stretched over the
         entry length and then held */
      var el = clamp(L.enter.len, 0.02, 1);
      return clamp(u / el, 0, 1);
    }
    return u;
  }

  function pxOf(R) {
    var s = S();
    return { x: R.x * s.W, y: R.y * s.H, w: R.w * s.W, h: R.h * s.H };
  }

  /* ---- drawing one layer -------------------------------------------------- */
  function drawLayer(L, C, p, report) {
    if (L.hidden) return;
    var u = windowU(L, p);
    if (u < 0) return;
    var s = S(), c = s.ctx;
    var R = rectAt(L, u), T = transformOf(L, u, p);
    if (T.a <= 0.002) return;
    var px = pxOf(R);
    var cx = px.x + px.w / 2, cy = px.y + px.h / 2;

    c.save();
    c.globalAlpha = T.a;
    if (L.clip) {
      /* the layer's own box, before any motion clip — applied first so a wipe
         still wipes within it rather than against it */
      c.beginPath();
      c.rect(px.x, px.y, px.w, px.h);
      c.clip();
    }
    if (T.clip) {
      c.beginPath();
      c.rect(px.x + T.clip.x * px.w, px.y + T.clip.y * px.h,
             px.w * T.clip.w, px.h * T.clip.h);
      c.clip();
    }
    if (T.cp != null) {
      c.beginPath();
      c.arc(cx, cy, Math.max(px.w, px.h) * 0.75 * T.cp, 0, Math.PI * 2);
      c.clip();
    }
    c.translate(cx + T.dx * s.W, cy + T.dy * s.H);
    if (T.rot) c.rotate(T.rot * Math.PI / 180);
    if (T.sx !== 1 || T.sy !== 1) c.scale(T.sx, T.sy);
    c.translate(-cx, -cy);

    try { paint(L, C, innerP(L, u, p), px, report); }
    catch (e) {
      if (report) report.errors.push({ id: L.id, name: nameOf(L), why: String(e && e.message || e) });
    }
    c.restore();
  }

  function paint(L, C, ip, px, report) {
    var s = S(), c = s.ctx, kit = K(), P = kit.pal();

    if (L.kind === "view") {
      var B = window.SPStage.bagOf(L.sel, C);
      if (report && B.missing.length)
        B.missing.forEach(function (m) {
          report.missing.push({ layer: nameOf(L), label: m.label || m.id, why: m.why });
        });
      /* the leaf is its own page and is blitted; everything else is handed
         the rect and draws into it */
      if (B.bag.almanac && B.bag.almanac.length) {
        leafInto(B.bag.almanac[0].v, ip, px, C);
        if (report) report.used.push({ id: L.id, composer: "almanac" });
        return;
      }
      var st = {
        x: px.x, y: px.y, w: px.w, h: px.h,
        cx: px.x + px.w / 2, cy: px.y + px.h / 2,
        bandY: px.y + px.h * 0.88, bandH: px.h * 0.12, side: px.w * 0.05
      };
      var got = window.SPStage.kit.drawInto(B.bag, ip, st, C, L.force);
      if (!got) {
        if (report) report.empty.push({ id: L.id, name: nameOf(L),
          why: L.sel.length ? "nothing in this layer resolves right now"
                            : "this layer has no nodes in it" });
        return;
      }
      if (got.error && report)
        report.errors.push({ id: L.id, name: nameOf(L), why: got.error });
      if (report) report.used.push({ id: L.id, composer: got.key, label: got.label });
      return;
    }

    if (L.kind === "text") {
      var str = expand(L.text, C);
      if (!str) return;
      var size = L.size * s.U;
      var x = L.align === "left" ? px.x : (L.align === "right" ? px.x + px.w : px.x + px.w / 2);
      var n = Math.max(1, L.lines || 1);
      if (n === 1) {
        kit.txtFit(str, x, px.y + px.h / 2, size, colOf(L), L.align, L.weight, px.w);
      } else {
        /* A block the user placed in a box must sit in that box, so the rows
           are measured before any of them is drawn and the first one is
           lifted by half of what the block will occupy. Measuring by drawing
           it off-screen first would be two text passes a frame for a thing
           arithmetic answers. */
        var lh = size * 1.26;
        var rows = kit.wrapLines(str, size, px.w, n, L.weight);
        var used = Math.max(1, rows.length);
        var top = L.valign === "top" ? px.y + size * 0.7
                : (L.valign === "bottom" ? px.y + px.h - lh * (used - 0.7)
                : px.y + px.h / 2 - lh * (used - 1) / 2);
        for (var ri = 0; ri < rows.length; ri++)
          kit.txt(rows[ri], x, top + ri * lh, size, colOf(L), L.align, L.weight);
      }
      return;
    }

    if (L.kind === "rule") {
      c.save();
      c.globalAlpha = c.globalAlpha * 0.95;
      var col = colOf(L);
      if (L.shape === "bar") {
        c.fillStyle = col;
        c.fillRect(px.x, px.y, px.w, Math.max(1, px.h));
      } else if (L.shape === "double") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0016);
        c.beginPath();
        c.moveTo(px.x, px.y); c.lineTo(px.x + px.w, px.y);
        c.moveTo(px.x, px.y + px.h); c.lineTo(px.x + px.w, px.y + px.h);
        c.stroke();
      } else if (L.shape === "frame") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0020);
        c.strokeRect(px.x, px.y, px.w, px.h);
      } else {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0018);
        c.beginPath();
        c.moveTo(px.x, px.y + px.h / 2); c.lineTo(px.x + px.w, px.y + px.h / 2);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (L.kind === "wash") {
      var cl = colOf(L);
      c.save();
      if (L.shape === "vignette") {
        var g = c.createRadialGradient(px.x + px.w / 2, px.y + px.h / 2,
                 Math.min(px.w, px.h) * 0.20, px.x + px.w / 2, px.y + px.h / 2,
                 Math.max(px.w, px.h) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, cl);
        c.fillStyle = g; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "panel") {
        c.fillStyle = cl;
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.fill();
        c.globalAlpha = c.globalAlpha * 0.8;
        c.strokeStyle = P.gold; c.lineWidth = Math.max(1, s.U * 0.0014);
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.stroke();
      } else if (L.shape === "sweep") {
        var g2 = c.createLinearGradient(px.x, px.y, px.x + px.w, px.y + px.h);
        g2.addColorStop(0, cl); g2.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g2; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "disc") {
        c.fillStyle = cl;
        c.beginPath();
        c.arc(px.x + px.w / 2, px.y + px.h / 2, Math.min(px.w, px.h) / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = cl; c.fillRect(px.x, px.y, px.w, px.h);
      }
      c.restore();
      return;
    }

    if (L.kind === "band") {
      var head = expand(L.text, C) || s.headline || "";
      var sb = expand(L.sub, C) || s.sub || "";
      if (!head && !sb) return;
      c.save();
      c.strokeStyle = P.gold; c.globalAlpha = c.globalAlpha * 0.55;
      c.lineWidth = Math.max(1, s.U * 0.0016);
      c.beginPath();
      c.moveTo(px.x + px.w * 0.26, px.y); c.lineTo(px.x + px.w * 0.74, px.y);
      c.stroke(); c.restore();
      if (head)
        kit.txtFit(head, px.x + px.w / 2, px.y + px.h * 0.36, s.U * 0.040,
                   colOf(L), "center", 700, px.w * 0.96);
      if (sb)
        kit.txtFit(sb, px.x + px.w / 2, px.y + px.h * 0.76, s.U * 0.022,
                   P.dim, "center", 500, px.w * 0.96);
      return;
    }

    if (L.kind === "stamp") {
      var left = expand(L.text || "{date}  ·  {place}", C);
      kit.txtFit(left, px.x, px.y + px.h / 2, L.size * s.U, colOf(L),
                 "left", 500, px.w * 0.62);
      kit.txt(s.handle || "@Nirayana.Soft", px.x + px.w, px.y + px.h / 2,
              L.size * s.U, P.gold, "right", 600);
      return;
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function nameOf(L) {
    if (L.name) return L.name;
    if (L.kind === "view") {
      if (!L.sel.length) return "Empty view";
      var n = window.SPNodes.byId(L.sel[0]);
      return (n ? n.label : L.sel[0]) + (L.sel.length > 1 ? " +" + (L.sel.length - 1) : "");
    }
    return KINDS[L.kind] ? L.kind.charAt(0).toUpperCase() + L.kind.slice(1) : L.kind;
  }

  /* ---- the public render -------------------------------------------------- */
  /* `quiet` has the same meaning as in Auto mode: skip the bookkeeping only
     the side panels read. During playback the report is pure waste. */
  function render(C, p, quiet) {
    var s = S(), c = s.ctx, kit = K();
    if (!c) return null;
    var report = quiet ? null
      : { used: [], missing: [], empty: [], errors: [], layers: DOC.layers.length };

    /* the backdrop is the document's, not the stage's */
    if (DOC.bg.style === "none") {
      c.clearRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "flat") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "vignette") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
      var g = c.createRadialGradient(s.W / 2, s.H * 0.42, s.W * 0.10,
                                     s.W / 2, s.H * 0.42, s.W * 0.95);
      g.addColorStop(0, kit.pal().bg2); g.addColorStop(1, kit.pal().bg);
      c.fillStyle = g; c.fillRect(0, 0, s.W, s.H);
    } else {
      kit.background();
    }
    if (DOC.bg.stars && kit.pal().key !== "parchment") kit.stars();

    for (var i = 0; i < DOC.layers.length; i++)
      drawLayer(DOC.layers[i], C, p, report);

    kit.safeGuides();
    return report;
  }

  /* ---- the editing overlay ------------------------------------------------
     Drawn by the page after rendering and never by the recorder, which is why
     handles cannot appear in an export: the export path does not call this.
     On canvas rather than as DOM boxes over the preview, because a DOM
     overlay would have to be repositioned on every frame — exactly the forced
     layout per frame that made the panel stop responding when the animation
     ran. */
  function overlay(p) {
    var L = current(); if (!L) return;
    var s = S(), c = s.ctx;
    var u = windowU(L, p);
    var R = rectAt(L, u < 0 ? 0 : u), px = pxOf(R);
    var P = K().pal();
    c.save();
    c.setLineDash([Math.max(2, s.U * 0.008), Math.max(2, s.U * 0.006)]);
    c.strokeStyle = u < 0 ? P.mal : P.gold;
    c.lineWidth = Math.max(1, s.U * 0.0022);
    c.globalAlpha = 0.95;
    c.strokeRect(px.x, px.y, px.w, px.h);
    c.setLineDash([]);
    var hs = Math.max(6, s.U * 0.018);
    HANDLES.forEach(function (h) {
      var hx = px.x + px.w * h.fx, hy = px.y + px.h * h.fy;
      c.fillStyle = P.gold;
      c.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    });
    if (L.to) {
      var tp = pxOf(L.to);
      c.setLineDash([Math.max(2, s.U * 0.004), Math.max(2, s.U * 0.008)]);
      c.strokeStyle = P.ben; c.globalAlpha = 0.8;
      c.strokeRect(tp.x, tp.y, tp.w, tp.h);
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(px.x + px.w / 2, px.y + px.h / 2);
      c.lineTo(tp.x + tp.w / 2, tp.y + tp.h / 2);
      c.stroke();
    }
    if (u < 0) {
      c.globalAlpha = 1;
      K().txt("not on screen at this moment", px.x + px.w / 2,
              px.y + px.h / 2, s.U * 0.020, P.mal, "center", 600);
    }
    c.restore();
  }

  /* fx/fy are the handle's position in the rect; dx/dy which edges it moves */
  var HANDLES = [
    { k: "nw", fx: 0, fy: 0, l: 1, t: 1 }, { k: "n", fx: 0.5, fy: 0, t: 1 },
    { k: "ne", fx: 1, fy: 0, r: 1, t: 1 }, { k: "e", fx: 1, fy: 0.5, r: 1 },
    { k: "se", fx: 1, fy: 1, r: 1, b: 1 }, { k: "s", fx: 0.5, fy: 1, b: 1 },
    { k: "sw", fx: 0, fy: 1, l: 1, b: 1 }, { k: "w", fx: 0, fy: 0.5, l: 1 }
  ];

  /* ---- hit testing, in frame fractions ----------------------------------- */
  function hit(fx, fy, p, which) {
    var L = current();
    var tol = 0.032;
    if (L && !L.locked) {
      var u = windowU(L, p);
      var R = which === "to" && L.to ? L.to : rectAt(L, u < 0 ? 0 : u);
      for (var i = 0; i < HANDLES.length; i++) {
        var h = HANDLES[i];
        var hx = R.x + R.w * h.fx, hy = R.y + R.h * h.fy;
        if (Math.abs(fx - hx) < tol && Math.abs(fy - hy) < tol)
          return { id: L.id, mode: h.k, which: which || "rect" };
      }
      if (fx > R.x && fx < R.x + R.w && fy > R.y && fy < R.y + R.h)
        return { id: L.id, mode: "move", which: which || "rect" };
    }
    /* topmost visible layer under the point, so clicking a picture selects it */
    for (var j = DOC.layers.length - 1; j >= 0; j--) {
      var Q = DOC.layers[j];
      if (Q.hidden || Q.locked) continue;
      if (windowU(Q, p) < 0) continue;
      var r2 = rectAt(Q, windowU(Q, p));
      if (fx > r2.x && fx < r2.x + r2.w && fy > r2.y && fy < r2.y + r2.h)
        return { id: Q.id, mode: "pick", which: "rect" };
    }
    return null;
  }
  /* applies a drag; dx/dy are in frame fractions */
  function dragTo(grab, startRect, dx, dy, snap) {
    var L = byId(grab.id); if (!L || L.locked) return;
    var h = null;
    HANDLES.forEach(function (q) { if (q.k === grab.mode) h = q; });
    var R = { x: startRect.x, y: startRect.y, w: startRect.w, h: startRect.h };
    if (grab.mode === "move" || grab.mode === "pick") { R.x += dx; R.y += dy; }
    else if (h) {
      if (h.l) { R.x += dx; R.w -= dx; }
      if (h.r) { R.w += dx; }
      if (h.t) { R.y += dy; R.h -= dy; }
      if (h.b) { R.h += dy; }
    }
    if (R.w < 0.04) R.w = 0.04;
    if (R.h < 0.02) R.h = 0.02;
    if (snap) {
      var g = 1 / 24;
      R.x = Math.round(R.x / g) * g; R.y = Math.round(R.y / g) * g;
      R.w = Math.round(R.w / g) * g; R.h = Math.round(R.h / g) * g;
    }
    if (grab.which === "to") { L.to = R; } else { L.rect = R; }
  }

  /* ---- stack operations --------------------------------------------------- */
  function byId(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return DOC.layers[i];
    return null;
  }
  function indexOf(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return i;
    return -1;
  }
  function current() { return byId(PICK); }
  function add(o, where) {
    var L = layer(o);
    if (where === "bottom") DOC.layers.unshift(L);
    else DOC.layers.push(L);
    PICK = L.id;
    return L;
  }
  function remove(id) {
    var i = indexOf(id); if (i < 0) return;
    DOC.layers.splice(i, 1);
    if (PICK === id) PICK = DOC.layers.length ? DOC.layers[Math.min(i, DOC.layers.length - 1)].id : null;
  }
  function duplicate(id) {
    var L = byId(id); if (!L) return null;
    var copy = layer(JSON.parse(JSON.stringify(L)));
    copy.id = uid();
    copy.name = (L.name || nameOf(L)) + " copy";
    /* offset, so the copy is visibly a second object rather than appearing to
       have done nothing */
    copy.rect = { x: clamp(L.rect.x + 0.03, 0, 0.96), y: clamp(L.rect.y + 0.03, 0, 0.96),
                  w: L.rect.w, h: L.rect.h };
    DOC.layers.splice(indexOf(id) + 1, 0, copy);
    PICK = copy.id;
    return copy;
  }
  function move(id, delta) {
    var i = indexOf(id); if (i < 0) return;
    var j = clamp(i + delta, 0, DOC.layers.length - 1);
    if (j === i) return;
    var L = DOC.layers.splice(i, 1)[0];
    DOC.layers.splice(j, 0, L);
  }

  /* ---- saving ------------------------------------------------------------
     A composition is JSON, so it saves as text. Compositions live under their
     own key; nothing here touches the chart handoff key or the saved-chart
     format marker, which are load-bearing elsewhere. */
  var STORE = "nirayana.studio.compositions";
  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function save(name) {
    var list = readAll();
    var d = JSON.parse(JSON.stringify(DOC));
    d.name = name || DOC.name || "Untitled";
    d.savedAt = Date.now();
    var at = -1;
    list.forEach(function (q, i) { if (q.name === d.name) at = i; });
    if (at >= 0) list[at] = d; else list.push(d);
    DOC.name = d.name;
    return writeAll(list) ? d.name : null;
  }
  function load(name) {
    var list = readAll(), found = null;
    list.forEach(function (q) { if (q.name === name) found = q; });
    if (!found) return false;
    DOC = doc(found);
    DOC.on = true;
    DOC.name = found.name;
    PICK = DOC.layers.length ? DOC.layers[DOC.layers.length - 1].id : null;
    return true;
  }
  function drop(name) {
    writeAll(readAll().filter(function (q) { return q.name !== name; }));
  }

  /* ---- the reel's own length, for sequencing ----------------------------- */
  /* The last moment anything is on screen. A user who times a layer to end at
     0.6 and nothing after it has left a third of the reel empty, and the page
     should be able to say so. */
  function lastUsed() {
    var t = 0;
    DOC.layers.forEach(function (L) {
      if (L.hidden) return;
      t = Math.max(t, Math.max(L.t0, L.t1));
    });
    return t;
  }

  window.SPDirector = {
    EASE: EASE, ENTER: ENTER, EXIT: EXIT, IDLE: IDLE, KINDS: KINDS, COLS: COLS,
    ARRANGE: ARRANGE, SEQUENCE: SEQUENCE,
    doc: function () { return DOC; },
    on: function () { return !!DOC.on; },
    setOn: function (v) { DOC.on = !!v; },
    layer: layer, newDoc: function (o) { DOC = doc(o || { on: true }); PICK = null; return DOC; },
    build: build, groupsOf: groupsOf, arrange: arrange, sequence: sequence,
    stageRect: stageRect, bandRect: bandRect,
    render: render, overlay: overlay,
    /* Render somebody else's document without disturbing the one being
       edited — how a storyboard shot can be a Director scene. The swap is
       synchronous and restored in a finally, so a composer that throws
       mid-shot cannot leave the editor pointing at a saved document. */
    withDoc: function (d, fn) {
      var keep = DOC, keepPick = PICK;
      DOC = doc(d); DOC.on = true;
      try { return fn(); } finally { DOC = keep; PICK = keepPick; }
    },
    snapshot: function () { return JSON.parse(JSON.stringify(DOC)); },
    hit: hit, dragTo: dragTo, HANDLES: HANDLES,
    byId: byId, current: current, pick: function (id) { PICK = id; },
    picked: function () { return PICK; },
    add: add, remove: remove, duplicate: duplicate, move: move,
    nameOf: nameOf, windowU: windowU, rectAt: rectAt, expand: expand,
    tokens: tokenList, lastUsed: lastUsed,
    save: save, load: load, drop: drop, saved: readAll
  };
})();

/* ===== Studio Pro — the Director panel ====================================

   The controls for the layer model: the stack, the inspector, the timeline,
   the arrangement and sequencing presets, dragging on the canvas, and saving
   a composition. Nothing here computes anything about the sky; it edits a
   plain object and asks the page to redraw.

   WHY THE PANEL IS REBUILT ON CHANGE AND NEVER ON A FRAME. This is the same
   rule the whole page now lives under, and it is the reason it is worth
   restating here rather than trusting it to be remembered: an innerHTML
   rebuild invalidates style for the document, and a rebuild per frame on a
   panel this size is what made pressing Play stop the buttons responding.
   So: a handler changes the document and calls change(), which redraws the
   canvas once and re-renders whatever part of the panel is now wrong. During
   playback the panel is not touched at all — the inspector shows the
   document, which playback does not alter.

   WHY DRAGGING IS ON THE CANVAS AND NOT IN DOM BOXES. Handles as absolutely
   positioned divs over the preview would have to be repositioned every frame
   to track an animating layer, which is a write-then-read on layout sixty
   times a second — the exact fault that was just fixed. They are drawn by the
   Director's overlay pass instead, which the export and the recorder never
   call, so they also cannot end up in a saved frame. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var D = null;              /* window.SPDirector, once it exists */
  var HOST = null;           /* hooks handed over by the page */
  var DRAG = null;

  function doc() { return D.doc(); }
  function cur() { return D.current(); }

  /* a change to the document: redraw, and re-sync the parts of the panel that
     describe what changed */
  function change(deep) {
    HOST.draw();
    if (deep) stack();
    inspector();
    timeline();
    status();
    if (HOST.save) HOST.save();
  }

  /* ---- small field builders ---------------------------------------------- */
  function row(host, label) {
    var r = el("div", "spdrow");
    if (label) r.appendChild(el("span", "spdlab", label));
    host.appendChild(r);
    return r;
  }
  function sel(host, label, opts, value, onSet) {
    var r = row(host, label), s = el("select");
    opts.forEach(function (o) {
      var op = el("option", null, o.label);
      op.value = o.v;
      if (String(o.v) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onSet(s.value); });
    r.appendChild(s);
    return s;
  }
  function num(host, label, value, min, max, step, onSet, suffix) {
    var r = row(host, label), i = el("input");
    i.type = "number"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.addEventListener("change", function () {
      var v = parseFloat(i.value);
      if (isNaN(v)) return;
      onSet(Math.max(min, Math.min(max, v)));
    });
    r.appendChild(i);
    if (suffix) r.appendChild(el("span", "spdsuf", suffix));
    return i;
  }
  function range(host, label, value, min, max, step, onSet) {
    var r = row(host, label), i = el("input");
    i.type = "range"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.className = "spdrange";
    var out = el("span", "spdsuf", String(value));
    i.addEventListener("input", function () {
      out.textContent = i.value;
      onSet(parseFloat(i.value));
    });
    r.appendChild(i); r.appendChild(out);
    return i;
  }
  function text(host, label, value, onSet, place) {
    var r = row(host, label), i = el("input");
    i.type = "text"; i.value = value || "";
    if (place) i.placeholder = place;
    i.addEventListener("input", function () { onSet(i.value); });
    r.appendChild(i);
    return i;
  }
  function btn(host, label, onClick, cls) {
    var b = el("button", "spbtn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    host.appendChild(b);
    return b;
  }
  function opts(map, order) {
    var out = [];
    (order || Object.keys(map)).forEach(function (k) {
      if (!map.hasOwnProperty(k)) return;
      out.push({ v: k, label: map[k].label || map[k] });
    });
    return out;
  }

  /* ---- the mode switch ---------------------------------------------------- */
  function modeBar() {
    var host = $("sp-modebar");
    if (!host) return;
    host.innerHTML = "";
    var on = D.on();
    var a = el("button", "spv" + (on ? "" : " on"), "Auto");
    a.type = "button";
    a.title = "The page decides the view, the arrangement and the timing.";
    a.addEventListener("click", function () {
      if (!D.on()) return;
      D.setOn(false); sync(); change(true);
      HOST.flash("Auto mode. The page is choosing again.");
    });
    var b = el("button", "spv" + (on ? " on" : ""), "Director");
    b.type = "button";
    b.title = "You decide: layers, placement, timing, motion.";
    b.addEventListener("click", function () {
      if (D.on()) return;
      if (!doc().layers.length) takeControl("single");
      else { D.setOn(true); sync(); change(true); }
    });
    host.appendChild(a); host.appendChild(b);
    var note = el("span", "spdmode",
      on ? "Director — the document below is what records."
         : "Auto — the best fit for the selection is drawn.");
    host.appendChild(note);
  }

  function takeControl(how) {
    var C = HOST.ctx();
    var s = HOST.sel();
    if (!s.length && how !== "blank") {
      HOST.flash("Pick something from the wall first — Director starts from a composition.");
      return;
    }
    if (how === "blank") {
      D.newDoc({ on: true, name: "Blank" });
      D.setOn(true);
    } else {
      D.build(s, C, HOST.force(), how, HOST.headline(), HOST.subline());
    }
    sync();
    change(true);
    HOST.flash(how === "blank"
      ? "Empty document. Add layers below."
      : "Taken apart into " + doc().layers.length + " layers. Everything below is yours to move.");
  }

  /* ---- the layer stack ---------------------------------------------------- */
  /* Painted top-of-stack first, because that is the order the eye reads a
     layer list in every tool that has one, and the array is bottom-first. */
  function stack() {
    var host = $("sp-stack");
    if (!host) return;
    host.innerHTML = "";
    var Ls = doc().layers;
    if (!Ls.length) {
      host.appendChild(el("p", "spdempty",
        "No layers. Take a selection apart, or add one below."));
      return;
    }
    var picked = D.picked();
    for (var i = Ls.length - 1; i >= 0; i--) {
      (function (L, idx) {
        var r = el("div", "spdlayer" + (L.id === picked ? " on" : "") +
                            (L.hidden ? " off" : ""));
        var eye = el("button", "spdeye", L.hidden ? "◻" : "◼");
        eye.type = "button";
        eye.title = L.hidden ? "Hidden — click to show" : "Visible — click to hide";
        eye.setAttribute("aria-label", eye.title);
        eye.addEventListener("click", function (ev) {
          ev.stopPropagation();
          L.hidden = !L.hidden; change(true);
        });
        var nm = el("button", "spdname");
        nm.type = "button";
        nm.appendChild(el("span", "spdkind", L.kind));
        nm.appendChild(el("span", "spdtitle", D.nameOf(L)));
        var win = (L.t0 > 0.001 || L.t1 < 0.999)
          ? Math.round(L.t0 * 100) + "–" + Math.round(L.t1 * 100) + "%" : "";
        if (win) nm.appendChild(el("span", "spdwin", win));
        nm.addEventListener("click", function () { D.pick(L.id); change(true); });
        var up = el("button", "spdmv", "↑"); up.type = "button";
        up.title = "Bring forward";
        up.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.move(L.id, 1); change(true); });
        var dn = el("button", "spdmv", "↓"); dn.type = "button";
        dn.title = "Send back";
        dn.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.move(L.id, -1); change(true); });
        var cp = el("button", "spdmv", "⧉"); cp.type = "button";
        cp.title = "Duplicate";
        cp.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.duplicate(L.id); change(true); });
        var x = el("button", "spdmv spdx", "×"); x.type = "button";
        x.title = "Delete this layer";
        x.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.remove(L.id); change(true); });
        r.appendChild(eye); r.appendChild(nm);
        r.appendChild(up); r.appendChild(dn); r.appendChild(cp); r.appendChild(x);
        host.appendChild(r);
      })(Ls[i], i);
    }
  }

  /* ---- adding layers ------------------------------------------------------ */
  function addBar() {
    var host = $("sp-addbar");
    if (!host) return;
    host.innerHTML = "";
    var R = D.stageRect();
    btn(host, "+ View", function () {
      var s = HOST.sel();
      if (!s.length) { HOST.flash("Select nodes on the wall, then add them as a view layer."); return; }
      D.add({ kind: "view", sel: s.slice(), force: HOST.force(),
              rect: { x: R.x + R.w * 0.12, y: R.y + R.h * 0.12,
                      w: R.w * 0.76, h: R.h * 0.76 },
              enter: { k: "rise", len: 0.25 } });
      change(true);
      HOST.flash("Added the current selection as a view layer.");
    });
    btn(host, "+ Text", function () {
      D.add({ kind: "text", text: "Your line here", size: 0.034, lines: 2,
              col: "ink", rect: { x: 0.10, y: 0.18, w: 0.80, h: 0.10 },
              enter: { k: "rise", len: 0.25 } });
      change(true);
    });
    btn(host, "+ Rule", function () {
      D.add({ kind: "rule", shape: "line", col: "gold",
              rect: { x: 0.25, y: 0.30, w: 0.50, h: 0.004 },
              enter: { k: "wipeL", len: 0.30 } });
      change(true);
    });
    btn(host, "+ Wash", function () {
      D.add({ kind: "wash", shape: "panel", col: "line", opacity: 0.35,
              rect: { x: 0.08, y: 0.16, w: 0.84, h: 0.56 },
              enter: { k: "fade", len: 0.2 } }, "bottom");
      change(true);
    });
    btn(host, "+ Band", function () {
      D.add({ kind: "band", col: "gold", rect: D.bandRect(),
              enter: { k: "rise", len: 0.22 } });
      change(true);
    });
    btn(host, "+ Stamp", function () {
      D.add({ kind: "stamp", size: 0.019, col: "dim",
              text: "{date}  ·  {place}",
              rect: { x: 0.08, y: 0.93, w: 0.84, h: 0.04 } });
      change(true);
    });
  }

  /* ---- the inspector ------------------------------------------------------ */
  function inspector() {
    var host = $("sp-insp");
    if (!host) return;
    host.innerHTML = "";
    var L = cur();
    if (!L) {
      host.appendChild(el("p", "spdempty",
        "Pick a layer above, or click one on the frame."));
      return;
    }
    var h = el("div", "spdhead");
    h.appendChild(el("b", null, D.nameOf(L)));
    h.appendChild(el("span", "spdkind", L.kind));
    host.appendChild(h);

    text(host, "Name", L.name, function (v) { L.name = v; change(true); },
         D.nameOf(L));

    /* --- what --- */
    host.appendChild(el("h4", "spdsec", "What"));
    if (L.kind === "view") {
      var tray = el("div", "spdsel");
      if (!L.sel.length) tray.appendChild(el("span", "spdempty", "no nodes"));
      L.sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        var c = el("button", "spchip sm", n ? n.label : id);
        c.type = "button";
        c.title = "Remove from this layer";
        c.addEventListener("click", function () {
          L.sel = L.sel.filter(function (q) { return q !== id; });
          change(true);
        });
        tray.appendChild(c);
      });
      host.appendChild(tray);
      var acts = el("div", "spdrow");
      btn(acts, "Set to wall selection", function () {
        var s = HOST.sel();
        if (!s.length) { HOST.flash("Nothing is selected on the wall."); return; }
        L.sel = s.slice(); L.force = HOST.force(); change(true);
      });
      btn(acts, "Add wall selection", function () {
        var s = HOST.sel();
        s.forEach(function (id) { if (L.sel.indexOf(id) < 0) L.sel.push(id); });
        change(true);
      });
      host.appendChild(acts);
      /* which composer draws this layer — the whole list, so the user can
         insist, with what the matcher would have chosen marked */
      var C = HOST.ctx();
      var B = window.SPStage.bagOf(L.sel, C);
      var fit = window.SPStage.options(B.bag);
      var list = [{ v: "", label: "Best fit" + (fit.length ? " — " + fit[0].label : "") }];
      window.SPStage.composers().forEach(function (K) {
        var ok = false;
        fit.forEach(function (f) { if (f.key === K.key) ok = true; });
        list.push({ v: K.key, label: K.label + (ok ? "" : "  (cannot draw this)") });
      });
      sel(host, "Drawn as", list, L.force || "", function (v) {
        L.force = v || null; change(true);
      });
    } else if (L.kind === "text" || L.kind === "band" || L.kind === "stamp") {
      text(host, L.kind === "band" ? "Headline" : "Text", L.text,
           function (v) { L.text = v; change(true); },
           L.kind === "stamp" ? "{date}  ·  {place}" : "");
      if (L.kind === "band")
        text(host, "Sub-line", L.sub, function (v) { L.sub = v; change(true); });
      var tk = el("p", "spdtok");
      tk.appendChild(document.createTextNode("Tokens resolve when the frame is drawn: "));
      D.tokens().forEach(function (t) {
        var a = el("button", "spdtokb", t);
        a.type = "button";
        a.title = "Insert " + t;
        a.addEventListener("click", function () {
          L.text = (L.text || "") + t; change(true);
        });
        tk.appendChild(a);
      });
      host.appendChild(tk);
      if (L.kind === "text") {
        num(host, "Size", (L.size * 1000).toFixed(0), 8, 140, 1,
            function (v) { L.size = v / 1000; change(); }, "‰ of width");
        num(host, "Max lines", L.lines, 1, 8, 1, function (v) { L.lines = v; change(); });
        sel(host, "Align", [{ v: "left", label: "Left" }, { v: "center", label: "Centre" },
                            { v: "right", label: "Right" }], L.align,
            function (v) { L.align = v; change(); });
        sel(host, "Vertical", [{ v: "top", label: "Top" }, { v: "middle", label: "Middle" },
                               { v: "bottom", label: "Bottom" }], L.valign,
            function (v) { L.valign = v; change(); });
        sel(host, "Weight", [{ v: 400, label: "Regular" }, { v: 500, label: "Medium" },
                             { v: 600, label: "Semibold" }, { v: 700, label: "Bold" },
                             { v: 800, label: "Heavy" }], L.weight,
            function (v) { L.weight = +v; change(); });
      }
      if (L.kind === "stamp")
        num(host, "Size", (L.size * 1000).toFixed(0), 8, 60, 1,
            function (v) { L.size = v / 1000; change(); }, "‰ of width");
    } else if (L.kind === "rule") {
      sel(host, "Shape", [{ v: "line", label: "Hairline" }, { v: "bar", label: "Solid bar" },
                          { v: "double", label: "Two rules" }, { v: "frame", label: "Box" }],
          L.shape, function (v) { L.shape = v; change(true); });
    } else if (L.kind === "wash") {
      sel(host, "Shape", [{ v: "flat", label: "Flat fill" }, { v: "panel", label: "Panel" },
                          { v: "vignette", label: "Vignette" }, { v: "sweep", label: "Gradient sweep" },
                          { v: "disc", label: "Disc" }],
          L.shape, function (v) { L.shape = v; change(true); });
    }
    if (L.kind !== "view") {
      var cols = [];
      D.COLS.forEach(function (k) {
        cols.push({ v: k, label: k === "custom" ? "Custom…" : k });
      });
      sel(host, "Colour", cols, L.col, function (v) { L.col = v; change(true); });
      if (L.col === "custom") {
        var r = row(host, "Hex"), i = el("input");
        i.type = "color"; i.value = L.hex;
        i.addEventListener("input", function () { L.hex = i.value; change(); });
        r.appendChild(i);
      }
    }

    /* --- where --- */
    host.appendChild(el("h4", "spdsec", "Where"));
    var g = el("div", "spdgrid");
    ["x", "y", "w", "h"].forEach(function (k) {
      var lab = el("label", "spdcell");
      lab.appendChild(el("span", null, k));
      var i = el("input");
      i.type = "number"; i.step = "0.5"; i.min = "-50"; i.max = "200";
      i.value = (L.rect[k] * 100).toFixed(1);
      i.addEventListener("change", function () {
        var v = parseFloat(i.value);
        if (!isNaN(v)) { L.rect[k] = v / 100; change(); }
      });
      lab.appendChild(i);
      g.appendChild(lab);
    });
    host.appendChild(g);
    host.appendChild(el("p", "spdhint",
      "Per cent of the frame. Drag the layer on the frame itself — hold Shift to snap."));
    var al = el("div", "spdrow");
    al.appendChild(el("span", "spdlab", "Align"));
    btn(al, "Centre ↔", function () {
      L.rect.x = (1 - L.rect.w) / 2; change(); });
    btn(al, "Centre ↕", function () {
      L.rect.y = (1 - L.rect.h) / 2; change(); });
    btn(al, "Fill the stage", function () {
      var R = D.stageRect();
      L.rect = { x: R.x, y: R.y, w: R.w, h: R.h }; change(); });
    btn(al, "Fill the frame", function () {
      L.rect = { x: 0, y: 0, w: 1, h: 1 }; change(); });
    host.appendChild(al);
    var cl = el("label", "spcheck"), cb = el("input");
    cb.type = "checkbox"; cb.checked = !!L.clip;
    cb.addEventListener("change", function () { L.clip = cb.checked; change(); });
    cl.appendChild(cb);
    cl.appendChild(document.createTextNode(
      " clip to the box — nothing of this layer is drawn outside it"));
    host.appendChild(cl);
    range(host, "Rotation", L.rot, -180, 180, 1, function (v) { L.rot = v; change(); });
    range(host, "Opacity", L.opacity, 0, 1, 0.01, function (v) { L.opacity = v; change(); });

    var mv = el("div", "spdrow");
    if (!L.to) {
      btn(mv, "Add a move", function () {
        L.to = { x: L.rect.x, y: L.rect.y - 0.08, w: L.rect.w, h: L.rect.h };
        change(true);
        HOST.flash("A second rectangle. The layer travels from the gold box to the green one.");
      });
    } else {
      btn(mv, "Remove the move", function () { L.to = null; change(true); });
      btn(mv, "Swap ends", function () {
        var t = L.rect; L.rect = L.to; L.to = t; change();
      });
    }
    host.appendChild(mv);
    if (L.to) {
      var g2 = el("div", "spdgrid");
      ["x", "y", "w", "h"].forEach(function (k) {
        var lab = el("label", "spdcell to");
        lab.appendChild(el("span", null, "→" + k));
        var i2 = el("input");
        i2.type = "number"; i2.step = "0.5"; i2.min = "-50"; i2.max = "200";
        i2.value = (L.to[k] * 100).toFixed(1);
        i2.addEventListener("change", function () {
          var v = parseFloat(i2.value);
          if (!isNaN(v)) { L.to[k] = v / 100; change(); }
        });
        lab.appendChild(i2);
        g2.appendChild(lab);
      });
      host.appendChild(g2);
      host.appendChild(el("p", "spdhint",
        "Hold Alt and drag on the frame to move the destination."));
    }

    /* --- when --- */
    host.appendChild(el("h4", "spdsec", "When"));
    var dur = HOST.duration();
    range(host, "Starts", L.t0, 0, 1, 0.01, function (v) {
      L.t0 = v; if (L.t1 < v) L.t1 = Math.min(1, v + 0.05); change(true); });
    range(host, "Ends", L.t1, 0, 1, 0.01, function (v) {
      L.t1 = v; if (L.t0 > v) L.t0 = Math.max(0, v - 0.05); change(true); });
    host.appendChild(el("p", "spdhint",
      "On screen from " + (L.t0 * dur).toFixed(1) + " s to " + (L.t1 * dur).toFixed(1) +
      " s of " + dur.toFixed(0) + " s."));

    /* --- how --- */
    host.appendChild(el("h4", "spdsec", "How it moves"));
    sel(host, "Entry", opts(D.ENTER), L.enter.k, function (v) {
      L.enter.k = v; change(true); });
    range(host, "Entry length", L.enter.len, 0, 1, 0.01,
          function (v) { L.enter.len = v; change(); });
    sel(host, "Exit", opts(D.EXIT), L.exit.k, function (v) { L.exit.k = v; change(true); });
    range(host, "Exit length", L.exit.len, 0, 1, 0.01,
          function (v) { L.exit.len = v; change(); });
    sel(host, "All the while", opts(D.IDLE), L.idle.k, function (v) {
      L.idle.k = v; change(true); });
    range(host, "How much", L.idle.amt, 0, 3, 0.05,
          function (v) { L.idle.amt = v; change(); });
    sel(host, "Easing", opts(D.EASE), L.ease, function (v) { L.ease = v; change(); });

    if (L.kind === "view") {
      sel(host, "The drawing's own clock",
          [{ v: "layer", label: "Runs over the layer's window" },
           { v: "reel", label: "Runs over the whole reel" },
           { v: "loop", label: "Loops inside the window" },
           { v: "frozen", label: "Held at one instant" }],
          L.clock, function (v) { L.clock = v; change(true); });
      if (L.clock === "loop")
        num(host, "Loops", L.cycles, 1, 20, 1, function (v) { L.cycles = v; change(); });
      if (L.clock === "frozen")
        range(host, "Held at", L.at, 0, 1, 0.01, function (v) { L.at = v; change(); });
      host.appendChild(el("p", "spdhint",
        "Every composer animates itself. This decides what it thinks the " +
        "playhead is — so a diagram can finish building early and then sit " +
        "still while the rest of the frame arrives."));
    }

    var lk = el("label", "spcheck"), ci = el("input");
    ci.type = "checkbox"; ci.checked = !!L.locked;
    ci.addEventListener("change", function () { L.locked = ci.checked; change(true); });
    lk.appendChild(ci);
    lk.appendChild(document.createTextNode(" locked — not picked up by dragging"));
    host.appendChild(lk);
  }

  /* ---- the timeline ------------------------------------------------------- */
  /* One bar per layer against the reel. It is the only place the whole
     sequence is visible at once, which is what a user needs to see why two
     layers collide. Clicking a bar picks the layer; dragging its body or its
     ends retimes it. */
  function timeline() {
    var host = $("sp-timeline");
    if (!host) return;
    host.innerHTML = "";
    var Ls = doc().layers;
    if (!Ls.length) return;
    var dur = HOST.duration();
    var picked = D.picked();
    for (var i = Ls.length - 1; i >= 0; i--) {
      (function (L) {
        var r = el("div", "spdtrow" + (L.id === picked ? " on" : ""));
        var nm = el("span", "spdtname", D.nameOf(L));
        var lane = el("div", "spdtlane");
        var bar = el("div", "spdtbar" + (L.hidden ? " off" : ""));
        var a = Math.min(L.t0, L.t1), b = Math.max(L.t0, L.t1);
        bar.style.left = (a * 100) + "%";
        bar.style.width = Math.max(1.5, (b - a) * 100) + "%";
        bar.title = D.nameOf(L) + " — " + (a * dur).toFixed(1) + "s to " +
                    (b * dur).toFixed(1) + "s";
        /* the entry and exit, shaded inside the bar, so a reel that is all
           entrance and no picture is visible as such */
        if (L.enter.len > 0.01) {
          var ei = el("i", "spdte");
          ei.style.width = Math.min(100, L.enter.len * 100) + "%";
          bar.appendChild(ei);
        }
        if (L.exit.len > 0.01) {
          var xi = el("i", "spdtx");
          xi.style.width = Math.min(100, L.exit.len * 100) + "%";
          bar.appendChild(xi);
        }
        lane.appendChild(bar);
        bar.addEventListener("pointerdown", function (ev) {
          ev.preventDefault();
          D.pick(L.id);
          var rect = lane.getBoundingClientRect();
          var at = (ev.clientX - rect.left) / Math.max(1, rect.width);
          var edge = (at - a) / Math.max(0.001, b - a);
          var mode = edge < 0.18 ? "a" : (edge > 0.82 ? "b" : "move");
          var start = { a: a, b: b, at: at };
          function mv(e2) {
            var dx = (e2.clientX - rect.left) / Math.max(1, rect.width) - start.at;
            if (mode === "move") {
              var len = start.b - start.a;
              L.t0 = Math.max(0, Math.min(1 - len, start.a + dx));
              L.t1 = L.t0 + len;
            } else if (mode === "a") {
              L.t0 = Math.max(0, Math.min(start.b - 0.02, start.a + dx));
            } else {
              L.t1 = Math.min(1, Math.max(start.a + 0.02, start.b + dx));
            }
            HOST.draw();
          }
          function up() {
            window.removeEventListener("pointermove", mv);
            window.removeEventListener("pointerup", up);
            change(true);
          }
          window.addEventListener("pointermove", mv);
          window.addEventListener("pointerup", up);
          change(true);
        });
        r.appendChild(nm); r.appendChild(lane);
        host.appendChild(r);
      })(Ls[i]);
    }
    var pl = el("div", "spdtrow spdtruler");
    pl.appendChild(el("span", "spdtname", dur.toFixed(0) + " s"));
    var lane2 = el("div", "spdtlane");
    for (var t = 0; t <= 4; t++) {
      var tick = el("i", "spdtick");
      tick.style.left = (t * 25) + "%";
      lane2.appendChild(tick);
    }
    pl.appendChild(lane2);
    host.appendChild(pl);
  }

  /* ---- presets and document-level controls -------------------------------- */
  function presets() {
    var host = $("sp-presets");
    if (!host) return;
    host.innerHTML = "";
    var r1 = el("div", "spdrow");
    r1.appendChild(el("span", "spdlab", "Arrange"));
    Object.keys(D.ARRANGE).forEach(function (k) {
      btn(r1, D.ARRANGE[k].label, function () {
        D.arrange(k); change(true);
      });
    });
    host.appendChild(r1);
    var r2 = el("div", "spdrow");
    r2.appendChild(el("span", "spdlab", "Sequence"));
    Object.keys(D.SEQUENCE).forEach(function (k) {
      btn(r2, D.SEQUENCE[k].label, function () {
        D.sequence(k); change(true);
      });
    });
    host.appendChild(r2);
    var r3 = el("div", "spdrow");
    r3.appendChild(el("span", "spdlab", "Backdrop"));
    [["gradient", "Gradient"], ["flat", "Flat"], ["vignette", "Vignette"],
     ["none", "None"]].forEach(function (q) {
      var b = el("button", "spv" + (doc().bg.style === q[0] ? " on" : ""), q[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        doc().bg.style = q[0]; change(true);
      });
      r3.appendChild(b);
    });
    var st = el("label", "spcheck"), si = el("input");
    si.type = "checkbox"; si.checked = !!doc().bg.stars;
    si.addEventListener("change", function () { doc().bg.stars = si.checked; change(); });
    st.appendChild(si);
    st.appendChild(document.createTextNode(" stars"));
    r3.appendChild(st);
    host.appendChild(r3);
  }

  function library() {
    var host = $("sp-library");
    if (!host) return;
    host.innerHTML = "";
    var r = el("div", "spdrow");
    var nmi = el("input");
    nmi.type = "text"; nmi.value = doc().name || "";
    nmi.placeholder = "name this composition";
    nmi.className = "spdname-in";
    r.appendChild(nmi);
    btn(r, "Save", function () {
      var n = (nmi.value || "").trim();
      if (!n) { HOST.flash("Give the composition a name first."); return; }
      var ok = D.save(n);
      HOST.flash(ok ? "Saved “" + ok + "” in this browser." :
                 "Could not save — this browser is refusing to store anything.");
      library();
    });
    host.appendChild(r);
    var list = D.saved();
    if (!list.length) {
      host.appendChild(el("p", "spdhint",
        "Saved compositions stay in this browser. Nothing is uploaded."));
      return;
    }
    var ul = el("div", "spdsaved");
    list.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    list.forEach(function (q) {
      var r2 = el("div", "spdsrow");
      var o = el("button", "spchip sm", q.name + "  ·  " +
                 (q.layers || []).length + " layers");
      o.type = "button";
      o.addEventListener("click", function () {
        if (D.load(q.name)) { sync(); change(true); HOST.flash("Opened “" + q.name + "”."); }
      });
      var x = el("button", "spdmv spdx", "×");
      x.type = "button"; x.title = "Forget this composition";
      x.addEventListener("click", function () { D.drop(q.name); library(); });
      r2.appendChild(o); r2.appendChild(x);
      ul.appendChild(r2);
    });
    host.appendChild(ul);
  }

  function status() {
    var host = $("sp-dstat");
    if (!host) return;
    var rep = HOST.lastReport();
    var bits = [];
    var Ls = doc().layers;
    var vis = Ls.filter(function (L) { return !L.hidden; }).length;
    bits.push(Ls.length + " layer(s), " + vis + " visible");
    var last = D.lastUsed();
    if (last < 0.97)
      bits.push("nothing on screen after " + Math.round(last * 100) + "% of the reel");
    if (rep) {
      if (rep.empty && rep.empty.length)
        bits.push(rep.empty.length + " layer(s) drawing nothing");
      if (rep.missing && rep.missing.length)
        bits.push(rep.missing.length + " node(s) that do not resolve");
      if (rep.errors && rep.errors.length)
        bits.push(rep.errors.length + " layer(s) that threw");
    }
    host.textContent = bits.join("  ·  ");

    var warn = $("sp-dwarn");
    if (!warn) return;
    warn.innerHTML = "";
    if (!rep) return;
    (rep.empty || []).forEach(function (q) {
      warn.appendChild(el("li", null, q.name + " — " + q.why));
    });
    (rep.missing || []).forEach(function (q) {
      warn.appendChild(el("li", null, q.layer + ": " + q.label + " — " + q.why));
    });
    (rep.errors || []).forEach(function (q) {
      warn.appendChild(el("li", "bad", q.name + " — " + q.why));
    });
  }

  /* ---- dragging on the frame ---------------------------------------------- */
  /* Pointer coordinates come in CSS pixels of the displayed canvas, which is
     a different size from the canvas's own pixels and a different size again
     from the export. Everything in the document is a fraction of the frame,
     so the conversion is done once here and nothing downstream has to know
     what size anything is being previewed at. */
  function frac(cv, ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / Math.max(1, r.width),
             y: (ev.clientY - r.top) / Math.max(1, r.height) };
  }
  function bindCanvas(cv) {
    cv.addEventListener("pointerdown", function (ev) {
      if (!D.on()) return;
      var f = frac(cv, ev);
      var which = ev.altKey ? "to" : "rect";
      var g = D.hit(f.x, f.y, window.SPStage.S.p, which);
      if (!g) { return; }
      ev.preventDefault();
      if (g.id !== D.picked()) { D.pick(g.id); change(true); }
      var L = D.byId(g.id);
      if (!L) return;
      var src = (g.which === "to" && L.to) ? L.to : L.rect;
      DRAG = { grab: g, start: { x: src.x, y: src.y, w: src.w, h: src.h },
               from: f, snap: ev.shiftKey };
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!DRAG) {
        if (!D.on()) return;
        /* the cursor tells the user what a press would do, which is the only
           affordance a canvas can offer */
        var f2 = frac(cv, ev);
        var g2 = D.hit(f2.x, f2.y, window.SPStage.S.p, ev.altKey ? "to" : "rect");
        cv.style.cursor = !g2 ? "default"
          : (g2.mode === "move" ? "move"
          : (g2.mode === "pick" ? "pointer"
          : (g2.mode === "n" || g2.mode === "s" ? "ns-resize"
          : (g2.mode === "e" || g2.mode === "w" ? "ew-resize"
          : (g2.mode === "ne" || g2.mode === "sw" ? "nesw-resize" : "nwse-resize")))));
        return;
      }
      ev.preventDefault();
      var f = frac(cv, ev);
      D.dragTo(DRAG.grab, DRAG.start, f.x - DRAG.from.x, f.y - DRAG.from.y,
               ev.shiftKey || DRAG.snap);
      /* the canvas only — the panel is synced on release, because retiming
         the inspector's thirty fields at pointer rate is the forced layout
         this page has already been bitten by once */
      HOST.draw();
    });
    function end() {
      if (!DRAG) return;
      DRAG = null;
      change(true);
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    /* nudging with the keyboard, which is how anything is ever aligned
       properly; the canvas is focusable for exactly this */
    cv.setAttribute("tabindex", "0");
    cv.addEventListener("keydown", function (ev) {
      if (!D.on()) return;
      var L = cur(); if (!L || L.locked) return;
      var step = ev.shiftKey ? 0.05 : 0.005;
      var k = ev.key, R = L.rect;
      if (k === "ArrowLeft") R.x -= step;
      else if (k === "ArrowRight") R.x += step;
      else if (k === "ArrowUp") R.y -= step;
      else if (k === "ArrowDown") R.y += step;
      else if (k === "[") { R.w *= 0.96; R.h *= 0.96; }
      else if (k === "]") { R.w /= 0.96; R.h /= 0.96; }
      else if (k === "Delete" || k === "Backspace") { D.remove(L.id); change(true); ev.preventDefault(); return; }
      else return;
      ev.preventDefault();
      change();
    });
  }

  /* ---- showing and hiding the whole panel --------------------------------- */
  function sync() {
    var on = D.on();
    var p = $("sp-dirpanel");
    if (p) p.hidden = !on;
    var t = $("sp-timewrap");
    if (t) t.hidden = !on;
    var a = $("sp-autoonly");
    if (a) a.hidden = on;
    /* a finger on the frame drags a layer in Director and scrolls the page in
       Auto, which is what a finger on a phone is mostly for */
    var cv = $("sp-canvas");
    if (cv) cv.className = on ? "spdragging" : "";
    modeBar();
    presets();
    addBar();
    library();
  }

  window.SPDirUI = {
    mount: function (hooks) {
      D = window.SPDirector;
      if (!D) return;
      HOST = hooks;
      var tc = $("sp-takeone");
      if (tc) tc.addEventListener("click", function () { takeControl("single"); });
      var ts = $("sp-takesplit");
      if (ts) ts.addEventListener("click", function () { takeControl("split"); });
      var to = $("sp-takesolo");
      if (to) to.addEventListener("click", function () { takeControl("solo"); });
      var tb = $("sp-takeblank");
      if (tb) tb.addEventListener("click", function () { takeControl("blank"); });
      var cv = $("sp-canvas");
      if (cv) bindCanvas(cv);
      sync();
      stack(); inspector(); timeline(); status();
    },
    /* the page calls this after anything that changes what the panel should
       say — a new place, a new moment, a new selection */
    refresh: function (deep) {
      if (!D || !HOST) return;
      if (deep) sync();
      stack(); inspector(); timeline(); status();
    },
    on: function () { return D && D.on(); },
    overlay: function (p) { if (D && D.on()) D.overlay(p); }
  };
})();

/* ===== Studio Pro — the page ==============================================

   Three panes. The command wall on the left lists every node the registry
   offers, grouped by domain and filtered by a search box; the stage in the
   middle draws whatever is selected; the tray on the right says what was
   selected, which composer took it, which other views could take it instead,
   and what is being left out.

   THE PART THAT IS NOT ORNAMENT. Selecting a node highlights the other nodes
   that have a real relation to it, and says what the relation is. The rules
   below are the only ones used, and each produces a sentence — there is no
   "related because they are both about Jupiter-ish things". If no rule fires,
   nothing lights up, which is the honest answer. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s); }

  var C = null;            /* the live context */
  var SEL = [];            /* selected node ids, in click order */
  var FORCE = null;        /* a composer the user pinned */
  var PLAY = false, RAF = null, T0 = 0, DUR = 15;
  var LAST = null;         /* the last render result */
  var SHOTS = [];          /* the storyboard: [{sel, force, seconds, label}] */
  var PLACE = null;        /* the place the reader picked, if they picked one */
  var STORY = false;       /* true while the storyboard is what plays */

  var DOM_LABEL = {
    sky: "Sky & grahas", rashi: "Rāśis", bhava: "Bhāvas", nakshatra: "Nakṣatras",
    varga: "Vargas", bala: "Strength & dignity", ashtakavarga: "Aṣṭakavarga",
    dasha: "Daśās", jaimini: "Jaimini & special points", yoga: "Yogas",
    panchanga: "Pañcāṅga & muhūrta", transit: "Transits", cosmic: "Cosmic time"
  };

  /* ---- context ---------------------------------------------------------- */
  function readBirth() {
    try {
      var raw = localStorage.getItem("nirayana.birth");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  /* The site writes a place as {n, lat, lon, tz} everywhere — the picker, the
     calendar, the pañcāṅga. This page had grown its own {name, ...} and then
     read a control that was never added to the markup, so the place was
     whatever the birth record said or New Delhi, with no way to change it.
     One shape now, carrying both spellings so neither side has to know about
     the other. */
  function asPlace(o, fallbackName) {
    if (!o || o.lat == null) return null;
    var nm = o.n || o.name || fallbackName || "";
    return { n: nm, name: nm, lat: +o.lat, lon: +o.lon,
             tz: +(o.tz != null ? o.tz : o.tzHours) || 0 };
  }
  function defaultPlace(b) {
    /* in order: what the reader picked, what they last picked here, the place
       this browser's chart was cast for, the one the rest of the site saves,
       and only then a default */
    if (PLACE) return PLACE;
    var sv = null;
    try { sv = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null; }
    catch (e) {}
    return asPlace(b && b.lat != null
                     ? { n: b.place || b.name || "your chart's place",
                         lat: b.lat, lon: b.lon, tz: b.tzHours } : null)
        || asPlace(sv)
        || { n: "New Delhi", name: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  }
  /* Everything that has to happen when the place changes, in one function so
     the picker and the test drive the same code rather than two that agree
     until one of them is edited. */
  function applyPlace(pp) {
    var np = asPlace(pp);
    if (!np) return null;
    PLACE = np;
    /* The day object, the sunrise and every window hanging off it are cached
       per place. A stale cache here is the worst kind of wrong: one city's
       pañcāṅga under another city's name, with nothing on the page to show
       it. */
    try { if (window.NP && window.NP.cacheClear) window.NP.cacheClear(); }
    catch (e) {}
    C = buildContext(C ? C.when : Date.now());
    refreshWall(); refreshTray(); draw();
    buildStrip();
    saveState();
    flash("Now computing for " + C.place.n + ".");
    return C.place;
  }

  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = defaultPlace(b);
    var when = whenMs || Date.now();
    var day = null;
    try { if (window.NP && window.NP.day) day = window.NP.day(when, place); }
    catch (e) {}
    var spanEl = $("sp-span");
    return { J: J, when: when, place: place, day: day,
             spanDays: spanEl ? +spanEl.value : 365, birth: b };
  }

  /* ---- relationship discovery -------------------------------------------
     Each rule returns a sentence or null. A node pair with no sentence is not
     related, and is not highlighted. */
  function grahaIn(id) {
    var SA = window.SPNodes.SA;
    for (var i = 0; i < SA.length; i++)
      if (id.indexOf("." + SA[i]) >= 0 || id.indexOf(SA[i]) >= 0) return SA[i];
    return null;
  }
  function tailOf(id) { var p = id.split("."); return p[p.length - 1]; }
  function related(id) {
    var node = window.SPNodes.byId(id);
    if (!node) return [];
    var v = window.SPNodes.resolve(node, C);
    var g = grahaIn(id), out = [];
    var mdLord = null;
    try { var cm = window.SPNodes.currentMd(C); mdLord = cm && cm.lord; } catch (e) {}
    /* which graha rules the sign a longitude falls in */
    var dispOf = null;
    if (v && v.kind === "lon")
      dispOf = window.SPNodes.LORD[Math.floor(window.SPNodes.norm(v.deg) / 30)];

    window.SPNodes.all().forEach(function (o) {
      if (o.id === id) return;
      var why = null;
      var og = grahaIn(o.id);

      if (g && og === g && o.dom !== node.dom)
        why = "the same graha, read in another domain";
      else if (g && og === g)
        why = "another facet of " + g;
      else if (dispOf && og === dispOf && o.id.indexOf("sky.lon.") === 0)
        why = dispOf + " rules the sign this falls in";
      else if (mdLord && og === mdLord && o.id.indexOf("sky.lon.") === 0 &&
               node.dom === "dasha")
        why = "where the running daśā lord stands";
      else if (v && v.kind === "lon" && o.roles.indexOf("lanes") >= 0)
        why = "a division this longitude can be taken down through";
      else if (v && v.kind === "lanes" && o.roles.indexOf("lon") >= 0 &&
               o.dom === "sky")
        why = "a point that can be zoomed inside this division";
      else if (v && v.kind === "lon" && o.roles.indexOf("lon") >= 0 &&
               o.dom === node.dom && o.dom !== "nakshatra" && o.dom !== "rashi")
        why = "another longitude — the angle between them can be drawn";
      else if (v && (v.kind === "sset" || v.kind === "scalar") &&
               o.roles.indexOf("sset") >= 0 && o.dom === node.dom)
        why = "a magnitude on the same kind of axis";
      else if (v && v.kind === "spanset" && o.roles.indexOf("series") >= 0)
        why = "something that can be traced across this period";
      else if (node.dom === "varga" && o.dom === "varga" &&
               tailOf(o.id) === tailOf(id) && o.id !== id)
        why = "the same division, seen the other way";

      if (why) out.push({ id: o.id, why: why });
    });
    return out;
  }
  function relatedSet() {
    var map = {};
    SEL.forEach(function (id) {
      related(id).forEach(function (r) {
        if (SEL.indexOf(r.id) >= 0) return;
        if (!map[r.id]) map[r.id] = r.why;
      });
    });
    return map;
  }

  /* ---- the command wall -------------------------------------------------- */
  var WALL = null;
  function buildWall() {
    var host = $("sp-wall"); if (!host) return;
    host.innerHTML = "";
    var byDom = {};
    window.SPNodes.all().forEach(function (n) {
      (byDom[n.dom] = byDom[n.dom] || []).push(n); });
    WALL = {};
    Object.keys(byDom).forEach(function (d) {
      var sec = el("section", "spgrp");
      sec.setAttribute("data-dom", d);
      var h = el("h3", null, (DOM_LABEL[d] || d) + " ");
      var cnt = el("span", "spcount", String(byDom[d].length));
      h.appendChild(cnt);
      sec.appendChild(h);
      var box = el("div", "spchips");
      byDom[d].forEach(function (n) {
        var b = el("button", "spchip", n.label);
        b.type = "button";
        b.title = n.hint || n.label;
        b.setAttribute("data-id", n.id);
        b.addEventListener("click", function () { toggle(n.id); });
        box.appendChild(b);
        WALL[n.id] = b;
      });
      sec.appendChild(box);
      host.appendChild(sec);
    });
    refreshWall();
  }
  function refreshWall() {
    if (!WALL) return;
    var rel = relatedSet();
    var q = (($("sp-search") && $("sp-search").value) || "").toLowerCase().trim();
    var onlyLive = $("sp-onlylive") && $("sp-onlylive").checked;
    var shown = 0, live = 0;
    window.SPNodes.all().forEach(function (n) {
      var b = WALL[n.id]; if (!b) return;
      var v = window.SPNodes.resolve(n, C);
      var has = !!v;
      if (has) live++;
      var match = !q || n.label.toLowerCase().indexOf(q) >= 0 ||
                  n.id.toLowerCase().indexOf(q) >= 0 ||
                  (n.hint || "").toLowerCase().indexOf(q) >= 0 ||
                  (DOM_LABEL[n.dom] || n.dom).toLowerCase().indexOf(q) >= 0;
      if (onlyLive && !has) match = false;
      b.hidden = !match;
      if (match) shown++;
      b.className = "spchip" +
        (SEL.indexOf(n.id) >= 0 ? " on" : "") +
        (!has ? " off" : "") +
        (rel[n.id] ? " rel" : "");
      b.title = has ? (rel[n.id] ? rel[n.id] : (n.hint || n.label))
                    : (n.label + " — not available for this chart or moment");
      if (v) b.setAttribute("data-kind", v.kind); else b.removeAttribute("data-kind");
    });
    /* hide a group whose chips are all filtered away */
    [].forEach.call(document.querySelectorAll(".spgrp"), function (sec) {
      var any = false;
      [].forEach.call(sec.querySelectorAll(".spchip"), function (b) {
        if (!b.hidden) any = true; });
      sec.hidden = !any;
    });
    var st = $("sp-wallstat");
    if (st) st.textContent = shown + " shown · " + live + " of " +
      window.SPNodes.all().length + " available here";
  }

  /* ---- the tray ---------------------------------------------------------- */
  function refreshTray() {
    var host = $("sp-tray"); if (!host) return;
    host.innerHTML = "";
    if (!SEL.length) {
      host.appendChild(el("p", "spmuted",
        "Nothing selected. Click anything on the wall — one chip, or six. " +
        "Whatever you pick, the stage will find a way to draw it."));
      return;
    }
    SEL.forEach(function (id, i) {
      var n = window.SPNodes.byId(id); if (!n) return;
      var v = window.SPNodes.resolve(n, C);
      var row = el("div", "sprow" + (v ? "" : " dead"));
      var a = el("button", "sprowx", "×");
      a.type = "button";
      a.setAttribute("aria-label", "remove " + n.label);
      a.addEventListener("click", function () { toggle(id); });
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, n.label));
      t.appendChild(el("span", "spkind", v ? v.kind : "unavailable"));
      t.appendChild(el("small", null, DOM_LABEL[n.dom] || n.dom));
      row.appendChild(t); row.appendChild(a);
      host.appendChild(row);
    });
    /* why these go together */
    if (SEL.length > 1) {
      var links = [];
      SEL.forEach(function (a2) {
        related(a2).forEach(function (r) {
          if (SEL.indexOf(r.id) > SEL.indexOf(a2)) {
            var nb = window.SPNodes.byId(r.id);
            var na = window.SPNodes.byId(a2);
            if (na && nb) links.push(na.label + " → " + nb.label + ": " + r.why);
          }
        });
      });
      var box = el("div", "splinks");
      box.appendChild(el("b", null, links.length
        ? "How these connect" : "No stated relation between these"));
      if (links.length)
        links.slice(0, 6).forEach(function (L) { box.appendChild(el("p", null, L)); });
      else
        box.appendChild(el("p", null,
          "They can still be drawn together — the stage will put them in " +
          "separate panels — but nothing in the engine links them."));
      host.appendChild(box);
    }
  }
  function refreshViews() {
    var host = $("sp-views"); if (!host) return;
    host.innerHTML = "";
    var opts = (LAST && LAST.options) || [];
    if (!opts.length) { host.appendChild(el("span", "spmuted", "—")); return; }
    opts.forEach(function (o) {
      var b = el("button", "spview" +
        ((FORCE ? FORCE === o.key : (LAST && LAST.composer === o.key)) ? " on" : ""),
        o.label);
      b.type = "button"; b.title = o.blurb;
      /* the key, so something other than a human finger can pin a view — the
         sentence parser pins one when a figure was named */
      b.setAttribute("data-key", o.key);
      b.addEventListener("click", function () {
        FORCE = (FORCE === o.key) ? null : o.key; draw(); });
      host.appendChild(b);
    });
  }
  function refreshNotes() {
    var host = $("sp-notes"); if (!host) return;
    host.innerHTML = "";
    if (!LAST) return;
    if (LAST.composer) {
      var p = el("p", null, "Drawn as ");
      p.appendChild(el("b", null, LAST.label));
      p.appendChild(document.createTextNode(
        FORCE ? " — you pinned this view." : " — the best fit for what is selected."));
      host.appendChild(p);
    }
    (LAST.missing || []).forEach(function (m) {
      host.appendChild(el("p", "spwarn",
        (m.label || m.id) + " — " + m.why + ", so it is not on the frame."));
    });
  }

  /* ---- the stage --------------------------------------------------------- */
  /* THE FRAME PATH. Nothing here may touch the DOM.

     draw() used to rebuild the view switcher and the notes panel, and call
     fitPreview, on every single frame. At sixty frames a second that is an
     innerHTML churn and a forced layout sixty times a second on a page
     carrying two hundred and fifty chips — which, measured on a throttled
     phone, took the frame budget from twenty milliseconds to two hundred and
     thirty-four. The main thread was blocked in quarter-second blocks, so
     taps never landed: pressing Play made the whole panel stop responding,
     including Pause.

     So the frame path draws the canvas and does nothing else, and the panels
     are synced only when the composition actually changes. */
  function shotsNow() { return (STORY && SHOTS.length) ? SHOTS : null; }
  function drawFrame() {
    if (!window.SPStage || !C) return;
    LAST = window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                 shotsNow(), true);
    /* The editing handles. Drawn after the frame and only here — the recorder
       and the still export call frameAt themselves and never this, which is
       why a gold dashed rectangle cannot end up in anything saved. */
    if (window.SPDirUI) window.SPDirUI.overlay(window.SPStage.S.p);
  }
  function draw() {
    if (!window.SPStage || !C) return;
    LAST = window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                 shotsNow(), false);
    if (window.SPDirUI) window.SPDirUI.overlay(window.SPStage.S.p);
    fitPreview();
    /* In Director mode the composer switcher and the fit notes describe a
       choice the user has taken over, so they stand down rather than
       contradict the layer they are no longer about. */
    if (!(window.SPDirector && window.SPDirector.on())) {
      refreshViews(); refreshNotes();
    }
  }

  /* ===== the sample strip ================================================
     A row of live compositions across the top, scrolling, each one actually
     being drawn right now from the same composers and the same day's data as
     the stage below — not a gallery of recorded gifs.

     WHY A CURATED POOL rather than random selections. The sampler in the test
     suite proves that ANY combination draws; it also shows that most random
     combinations land on Layers, which at thumbnail size is three small
     panels and reads as noise. A strip is an advertisement for what the page
     can do, so it draws from combinations chosen to look like something at
     120 pixels wide, and re-rolls them so the strip is never the same twice.

     WHY TILES ARE DRAWN IN A ROUND ROBIN. Twenty canvases at sixty frames a
     second is a page that heats a phone. Two tiles per frame gives each one
     about six frames a second, which for a thumbnail is motion; the loop
     stops entirely when the strip scrolls out of view or the tab is hidden,
     because a strip nobody is looking at should cost nothing. */

  var STRIP = {
    tiles: [], live: 0, raf: null, cursor: 0, scroll: 0,
    paused: false, lastRoll: 0, seen: 0
  };
  /* Each entry is a selection that is worth looking at small. `need` lists the
     nodes that must resolve for it to be offered at all, so a visitor with no
     birth chart is shown the dozen that work from the sky and the day alone
     rather than a row of empty frames. */
  var POOL = [
    { sel: ["day.almanac"], label: "Today's leaf" },
    { sel: ["sky.all"], label: "The nine" },
    { sel: ["sky.lon.Sūrya", "sky.lon.Candra"], label: "Sun to Moon" },
    { sel: ["sky.lon.Candra", "geo.naks"], label: "Into the nakṣatra" },
    { sel: ["sky.lon.Candra", "geo.d60"], label: "Down to the ṣaṣṭyāṃśa" },
    { sel: ["geo.rashis", "geo.naks", "geo.padas"], label: "Three divisions" },
    { sel: ["pan.horas"], label: "The day's horās" },
    { sel: ["pan.choghadiya"], label: "Choghaḍiyā" },
    { sel: ["pan.fiveLimbs"], label: "The five limbs" },
    { sel: ["pan.tara"], label: "Tāra Bala" },
    { sel: ["tr.all"], label: "The sky now" },
    { sel: ["tr.track.Maṅgala"], label: "Maṅgala over a year" },
    { sel: ["tr.elongSeries"], label: "Elongation over time" },
    { sel: ["sky.lon.Sūrya", "geo.rashis"], label: "Sūrya in its rāśi" },
    { sel: ["geo.kakshya"], label: "The kakṣyā lanes" },
    /* these need a stored chart */
    { sel: ["chart.d1"], force: "kundliN", label: "North Indian" },
    { sel: ["chart.d1"], force: "kundliS", label: "South Indian" },
    { sel: ["chart.sudarshana"], label: "Sudarśana" },
    { sel: ["varga.kundli.D9"], force: "kundliN", label: "Navāṃśa" },
    { sel: ["varga.kundli.D10"], force: "kundliS", label: "Daśāṃśa" },
    { sel: ["bala.total_rupa"], label: "Ṣaḍbala" },
    { sel: ["bala.vsRequired"], label: "Against the minimum" },
    { sel: ["av.grid"], label: "Aṣṭakavarga" },
    { sel: ["av.sav"], label: "Sarvāṣṭakavarga" },
    { sel: ["dasha.gears"], label: "Daśā gears" },
    { sel: ["dasha.maha"], label: "The nine periods" },
    { sel: ["rel.drishti"], label: "Graha dṛṣṭi" },
    { sel: ["rel.dispositor"], label: "Dispositors" },
    { sel: ["tr.relations"], label: "Transits to natal" },
    { sel: ["jai.arudhas"], label: "Arūḍha padas" },
    { sel: ["varga.vargottama"], label: "Vargottama" },
    { sel: ["bala.avastha"], label: "Avasthās" }
  ];
  function poolAvailable() {
    return POOL.filter(function (e) {
      return e.sel.every(function (id) {
        var n = window.SPNodes.byId(id);
        return n && !!window.SPNodes.resolve(n, C);
      });
    });
  }
  function pickSpec(avail, avoid) {
    for (var t = 0; t < 24; t++) {
      var e = avail[Math.floor(Math.random() * avail.length)];
      if (!e) return null;
      if (avoid.indexOf(e.label) < 0) return e;
    }
    return avail[0] || null;
  }
  var TILE_W = 252, TILE_H = 448;      /* the bitmap; CSS halves it */

  function buildStrip() {
    var host = $("sp-strip"); if (!host) return;
    var avail = poolAvailable();
    host.innerHTML = "";
    STRIP.tiles = [];
    if (avail.length < 3) {
      host.appendChild(el("p", "spmuted", "Nothing to sample yet."));
      return;
    }
    STRIP.live = Math.min(10, avail.length);
    var used = [];
    for (var i = 0; i < STRIP.live; i++) {
      var spec = pickSpec(avail, used);
      used.push(spec.label);
      STRIP.tiles.push(mkTile(host, spec, i));
    }
    /* A second run of the same tiles makes the scroll loop seamlessly. They
       are not rendered twice: each copy is blitted from its original, which
       costs one drawImage and keeps the loop exactly identical rather than
       merely similar. */
    for (var j = 0; j < STRIP.live; j++)
      STRIP.tiles.push(mkTile(host, STRIP.tiles[j].spec, j, STRIP.tiles[j]));
    STRIP.lastRoll = Date.now();
    startStrip();
  }
  function mkTile(host, spec, idx, mirrorOf) {
    var fig = el("figure", "sptile");
    var cv = document.createElement("canvas");
    cv.width = TILE_W; cv.height = TILE_H;
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", spec.label);
    var cap = el("figcaption", null, spec.label);
    fig.appendChild(cv); fig.appendChild(cap);
    fig.title = "Open this on the stage";
    fig.tabIndex = 0;
    function open() {
      SEL = spec.sel.slice(); FORCE = spec.force || null; STORY = false;
      var tb = $("sp-storytoggle"); if (tb) tb.checked = false;
      refreshWall(); refreshTray(); draw();
      var box = $("sp-stagebox");
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
      flash("Loaded “" + spec.label + "” onto the stage.");
    }
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    host.appendChild(fig);
    return { fig: fig, cv: cv, cap: cap, spec: spec, idx: idx,
             mirrorOf: mirrorOf || null, p: Math.random() };
  }

  function startStrip() {
    if (STRIP.raf) return;
    var last = 0;
    function frame(ts) {
      STRIP.raf = requestAnimationFrame(frame);
      STRIP.ticks = (STRIP.ticks || 0) + 1;
      if (document.hidden || STRIP.paused || !STRIP.tiles.length) return;
      var host = $("sp-strip"); if (!host) return;
      /* Only work while the strip is on screen. This is the whole reason the
         loop is cheap, and it is also why the strip looked dead the first
         time it was measured: on a short viewport the masthead, the nav and a
         three-line banner had pushed it past the fold, so it was correctly
         doing nothing. The counters stay because a render loop that decides
         to skip needs to be able to say so. */
      var r = host.getBoundingClientRect();
      STRIP.rect = Math.round(r.top) + ".." + Math.round(r.bottom) +
                   " in " + window.innerHeight;
      if (r.bottom < -40 || r.top > window.innerHeight + 40) {
        STRIP.offscreen = (STRIP.offscreen || 0) + 1; return;
      }
      if (ts - last < 28) return;            /* cap the whole loop near 35fps */
      last = ts;

      /* two originals per frame, round robin */
      for (var k = 0; k < 2 && STRIP.live; k++) {
        var t = STRIP.tiles[STRIP.cursor % STRIP.live];
        STRIP.cursor++;
        if (!t || t.broken) continue;
        STRIP.renders = (STRIP.renders || 0) + 1;
        t.p = (t.p + 0.013) % 1;
        /* A swallowed exception in a render loop is the worst kind: the strip
           simply stays dark and nothing anywhere says why. It is recorded, and
           a tile that has thrown is dropped from the rotation rather than
           retried sixty times a second. */
        try {
          window.SPStage.renderTo(t.cv, TILE_W, TILE_H, t.spec.sel, C,
                                  t.p, t.spec.force || null);
        } catch (e) {
          STRIP.lastError = t.spec.label + ": " + (e && e.message || e);
          t.broken = true;
        }
        var mirror = STRIP.tiles[t.idx + STRIP.live];
        if (mirror) {
          try {
            var mc = mirror.cv.getContext("2d");
            mc.clearRect(0, 0, TILE_W, TILE_H);
            mc.drawImage(t.cv, 0, 0);
          } catch (e) {}
        }
      }

      /* the scroll, and its seamless wrap at the halfway point */
      if (!STRIP.dragging) {
        host.scrollLeft += 0.55;
        var half = host.scrollWidth / 2;
        if (half > 10 && host.scrollLeft >= half) host.scrollLeft -= half;
      }

      /* re-roll a tile that nobody can see, so the strip is never twice the
         same without anything ever changing in front of a reader */
      if (Date.now() - STRIP.lastRoll > 6500) {
        STRIP.lastRoll = Date.now();
        rollOne(host);
      }
    }
    STRIP.raf = requestAnimationFrame(frame);
  }
  function rollOne(host) {
    var avail = poolAvailable();
    if (avail.length < 4 || !STRIP.live) return;
    var hostR = host.getBoundingClientRect();
    var used = STRIP.tiles.slice(0, STRIP.live).map(function (t) { return t.spec.label; });
    /* find an original that is off screen */
    for (var i = 0; i < STRIP.live; i++) {
      var t = STRIP.tiles[(STRIP.seen + i) % STRIP.live];
      var r = t.fig.getBoundingClientRect();
      if (r.right > hostR.left - 20 && r.left < hostR.right + 20) continue;
      var spec = pickSpec(avail, used);
      if (!spec) return;
      t.spec = spec;
      t.cap.textContent = spec.label;
      t.cv.setAttribute("aria-label", spec.label);
      t.p = 0;
      var m = STRIP.tiles[t.idx + STRIP.live];
      if (m) { m.spec = spec; m.cap.textContent = spec.label;
               m.cv.setAttribute("aria-label", spec.label); }
      STRIP.seen = (STRIP.seen + i + 1) % STRIP.live;
      return;
    }
  }

  /* ---- the storyboard ---------------------------------------------------- */
  function shotLabel(sh) {
    if (sh.label) return sh.label;
    if (sh.doc) return (sh.name || "Scene") + " — " +
      (sh.doc.layers || []).length + " layers";
    var names = (sh.sel || []).map(function (id) {
      var n = window.SPNodes.byId(id); return n ? n.label : id; });
    return names.slice(0, 3).join(" + ") + (names.length > 3 ? " +" + (names.length - 3) : "");
  }
  function addShot() {
    /* In Director mode the shot is the whole document, not the selection:
       what the user has composed is what they mean by "this shot", and a
       storyboard that quietly recorded the Auto reading of the same nodes
       instead would be the worst kind of surprise. */
    if (window.SPDirector && window.SPDirector.on()) {
      var d = window.SPDirector.snapshot();
      if (!d.layers.length) { flash("This document has no layers yet."); return; }
      SHOTS.push({ doc: d, sel: [], seconds: 5,
                   name: d.name || ("Scene " + (SHOTS.length + 1)) });
      refreshShots(); draw(); saveState();
      flash("Added the composition as shot " + SHOTS.length + ".");
      return;
    }
    if (!SEL.length) { flash("Select something first, then add it as a shot."); return; }
    SHOTS.push({ sel: SEL.slice(), force: FORCE, seconds: 5 });
    STORY = true;
    refreshShots(); saveState(); draw();
  }
  function refreshShots() {
    var host = $("sp-shots"); if (!host) return;
    host.innerHTML = "";
    var tot = $("sp-shottotal");
    if (!SHOTS.length) {
      host.appendChild(el("p", "spmuted",
        "No shots yet. Build a selection, then press “Add as a shot”. " +
        "Two or three shots make a reel that holds attention; one makes a card."));
      if (tot) tot.textContent = "";
      var tb = $("sp-storytoggle"); if (tb) tb.hidden = true;
      return;
    }
    SHOTS.forEach(function (sh, i) {
      var row = el("div", "sprow" + (LAST && STORY && LAST.shot === i ? " live" : ""));
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, (i + 1) + ". " + shotLabel(sh)));
      t.appendChild(el("small", null,
        (sh.force ? "pinned: " + sh.force + " · " : "") + sh.sel.length + " node(s)"));
      row.appendChild(t);
      var sec = document.createElement("input");
      sec.type = "number"; sec.min = "1"; sec.max = "30"; sec.value = String(sh.seconds);
      sec.className = "spsec";
      sec.setAttribute("aria-label", "seconds for shot " + (i + 1));
      sec.addEventListener("change", function () {
        sh.seconds = Math.max(1, Math.min(30, +sec.value || 5));
        refreshShots(); saveState(); });
      row.appendChild(sec);
      [["↑", -1], ["↓", 1]].forEach(function (mv) {
        var b = el("button", "sprowx", mv[0]);
        b.type = "button";
        b.setAttribute("aria-label", (mv[1] < 0 ? "move up" : "move down"));
        b.addEventListener("click", function () {
          var j = i + mv[1];
          if (j < 0 || j >= SHOTS.length) return;
          var tmp = SHOTS[i]; SHOTS[i] = SHOTS[j]; SHOTS[j] = tmp;
          refreshShots(); saveState(); draw(); });
        row.appendChild(b);
      });
      var x = el("button", "sprowx", "×");
      x.type = "button"; x.setAttribute("aria-label", "remove shot " + (i + 1));
      x.addEventListener("click", function () {
        SHOTS.splice(i, 1);
        if (!SHOTS.length) STORY = false;
        refreshShots(); saveState(); draw(); });
      row.appendChild(x);
      /* clicking the row loads that shot back into the wall for editing */
      t.style.cursor = "pointer";
      t.addEventListener("click", function () {
        STORY = false;
        var tb2 = $("sp-storytoggle"); if (tb2) tb2.checked = false;
        /* a Director shot opens back into Director with its own layers, an
           Auto shot back onto the wall — editing a shot means getting the
           thing you made, in the mode you made it in */
        if (sh.doc && window.SPDirector) {
          window.SPDirector.newDoc(sh.doc);
          window.SPDirector.setOn(true);
          if (window.SPDirUI) window.SPDirUI.refresh(true);
        } else {
          SEL = (sh.sel || []).slice(); FORCE = sh.force || null;
          if (window.SPDirector && window.SPDirector.on()) {
            window.SPDirector.setOn(false);
            if (window.SPDirUI) window.SPDirUI.refresh(true);
          }
        }
        refreshWall(); refreshTray(); refreshShots(); draw(); });
      host.appendChild(row);
    });
    if (tot) tot.textContent = "Reel length " +
      window.SPStage.storyTotal(SHOTS) + " s across " + SHOTS.length + " shot(s).";
    var tb3 = $("sp-storytoggle");
    if (tb3) { tb3.hidden = false; tb3.checked = STORY; }
  }
  function fitPreview() {
    var cv = $("sp-canvas"), box = $("sp-stagebox");
    if (!cv || !box) return;
    var r = window.SPStage.RATIOS[window.SPStage.S.ratio];
    var maxH = Math.max(320, Math.min(window.innerHeight * 0.62, 760));
    var h = maxH, w = h * r.w / r.h;
    if (w > box.clientWidth - 8) { w = box.clientWidth - 8; h = w * r.h / r.w; }
    cv.style.width = Math.round(w) + "px";
    cv.style.height = Math.round(h) + "px";
    /* and render at about the resolution it is actually displayed at, rather
       than at export size. Two device pixels per CSS pixel is the point past
       which nobody can tell; beyond that it is only heat. */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var want = Math.max(0.25, Math.min(1, (w * dpr) / r.w));
    if (Math.abs(want - window.SPStage.S.quality) > 0.04) {
      window.SPStage.S.quality = want;
      window.SPStage.resize();
    }
  }
  function toggle(id) {
    var i = SEL.indexOf(id);
    if (i >= 0) SEL.splice(i, 1);
    else {
      if (SEL.length >= 8) { flash("Eight is the most the stage will take at once."); return; }
      SEL.push(id);
    }
    FORCE = null;
    refreshWall(); refreshTray(); draw();
    /* the Director inspector offers "set this layer to the wall selection",
       so it is stale the moment the wall changes */
    if (window.SPDirUI) window.SPDirUI.refresh();
    saveState();
  }
  function flash(msg) {
    var f = $("sp-flash"); if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3200);
  }

  /* ---- playback ---------------------------------------------------------- */
  /* The preview is throttled and adapts. A reel is recorded at thirty frames
     a second by the recorder, which drives its own clock; the PREVIEW only has
     to look like motion, and a phone that cannot hold thirty is better off
     drawing twenty good frames than queueing sixty it will never finish. */
  var FPS_TARGET = 30, lastFrame = 0, slowRun = 0;
  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var now = performance.now();
    if (now - lastFrame < 1000 / FPS_TARGET - 1) return;
    lastFrame = now;
    var el2 = (Date.now() - T0) / 1000;
    window.SPStage.S.p = (el2 % DUR) / DUR;
    var t0 = performance.now();
    drawFrame();
    var cost = performance.now() - t0;
    /* back off when the device cannot keep up, and creep back when it can */
    if (cost > 1000 / FPS_TARGET) { if (++slowRun > 3 && FPS_TARGET > 12) {
      FPS_TARGET -= 4; slowRun = 0; } }
    else if (--slowRun < -40 && FPS_TARGET < 30) { FPS_TARGET += 2; slowRun = 0; }
    /* the two cheap DOM writes, which are single attributes rather than a
       rebuild, and only a few times a second */
    if (!tick.ui || now - tick.ui > 120) {
      tick.ui = now;
      var sc = $("sp-scrub");
      if (sc) sc.value = String(Math.round(window.SPStage.S.p * 1000));
      showTime();
    }
  }
  /* where the playhead is, in seconds — the slider alone does not say, and
     on a phone the thumb is often under a finger */
  function showTime() {
    var t = $("sp-time"); if (!t) return;
    t.textContent = (window.SPStage.S.p * DUR).toFixed(1) + " / " + DUR + " s";
  }
  function play(on) {
    /* belt as well as braces: the buttons are disabled during a recording,
       but the keyboard and any future caller are not */
    if (on && window.SPStage.isRecording()) return;
    PLAY = on;
    /* a storyboard plays for its own total, not the single-shot length */
    if (STORY && SHOTS.length) DUR = window.SPStage.storyTotal(SHOTS);
    else { var d = $("sp-dur"); if (d) DUR = +d.value; }
    var b = $("sp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    /* One animation loop at a time. The sample strip and the stage both
       drawing on a phone is the difference between motion and a slideshow. */
    STRIP.paused = on || STRIP.hover;
    if (on) {
      FPS_TARGET = 30; slowRun = 0; lastFrame = 0;
      T0 = Date.now() - window.SPStage.S.p * DUR * 1000;
      tick();
    } else {
      if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
      var sc2 = $("sp-scrub");
      if (sc2) sc2.value = String(Math.round(window.SPStage.S.p * 1000));
      showTime();
      draw();                      /* one full pass, to resync the panels */
    }
  }

  /* ---- persistence: the selection survives a reload ---------------------- */
  function saveState() {
    try {
      localStorage.setItem("nirayana.studiopro", JSON.stringify({
        sel: SEL, ratio: window.SPStage.S.ratio, pal: window.SPStage.S.pal,
        safe: window.SPStage.S.safe, head: window.SPStage.S.headline,
        sub: window.SPStage.S.sub, shots: SHOTS, story: STORY,
        place: PLACE,
        /* the working document, so an afternoon of layer work is not lost to
           a reload; the named library is separate and explicit */
        dir: (window.SPDirector && window.SPDirector.on())
               ? window.SPDirector.snapshot() : null }));
    } catch (e) {}
  }
  function loadState() {
    try {
      var o = JSON.parse(localStorage.getItem("nirayana.studiopro") || "null");
      if (!o) return;
      if (o.sel && o.sel.length) SEL = o.sel.filter(function (id) {
        return !!window.SPNodes.byId(id); });
      if (o.ratio) window.SPStage.S.ratio = o.ratio;
      if (o.pal) window.SPStage.S.pal = o.pal;
      if (o.safe != null) window.SPStage.S.safe = o.safe;
      if (o.head) window.SPStage.S.headline = o.head;
      if (o.sub) window.SPStage.S.sub = o.sub;
      if (o.place && o.place.lat != null) PLACE = asPlace(o.place);
      if (o.shots && o.shots.length) {
        SHOTS = o.shots.filter(function (sh) {
          return sh && ((sh.sel && sh.sel.length) || sh.doc); });
        STORY = !!o.story && SHOTS.length > 0;
      }
      if (o.dir && o.dir.layers && o.dir.layers.length && window.SPDirector) {
        window.SPDirector.newDoc(o.dir);
        window.SPDirector.setOn(true);
      }
    } catch (e) {}
  }

  /* ---- export ------------------------------------------------------------ */
  function savePng() {
    var cv = $("sp-canvas");
    /* the preview is deliberately low-resolution; a saved frame is not — and
       it goes through frameAt, so what is saved is whatever mode is showing
       rather than always the Auto composition */
    window.SPStage.withFullSize(function () {
      window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE, shotsNow(), true);
    });
    cv.toBlob(function (b) {
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      draw();                      /* back to the preview size */
    }, "image/png");
  }
  /* The transport, while a recording owns the playhead.

     Everything that writes S.p is turned off for the duration and visibly so.
     The Record button becomes the way out, because "Stop" is what somebody
     wants when they decide thirty seconds was too long. */
  function setTransport(recording) {
    [["sp-play", true], ["sp-scrub", true], ["sp-dur", true],
     ["sp-png", true], ["sp-addshot", true], ["sp-clear", true]]
      .forEach(function (pair) {
        var e = $(pair[0]); if (e) e.disabled = recording; });
    var b = $("sp-rec");
    if (b) b.className = "spbtn primary" + (recording ? " rec" : "");
  }
  function saveVideo() {
    var btn = $("sp-rec"); if (!btn) return;
    /* a second press is "stop", not a second recording */
    if (window.SPStage.isRecording()) {
      window.SPStage.cancelRecording();
      btn.textContent = "Stopping…";
      return;
    }
    var was = "Record the reel";
    var keepP = window.SPStage.S.p;
    play(false);
    setTransport(true);
    btn.textContent = "Stop (0%)";
    var what = (STORY && SHOTS.length) ? SHOTS : SEL;
    /* a recording is the artefact, so it is captured at export size */
    var qKeep = window.SPStage.S.quality;
    window.SPStage.S.quality = 1; window.SPStage.resize();
    window.SPStage.record(what, C, DUR, 30, FORCE, function (f) {
      btn.textContent = "Stop (" + Math.round(f * 100) + "%)";
    }).then(function (res) {
      setTransport(false); btn.textContent = was;
      window.SPStage.S.quality = qKeep; window.SPStage.resize();
      /* put the playhead back where the reader left it, rather than at the
         end of the recording */
      window.SPStage.S.p = keepP;
      var sc = $("sp-scrub"); if (sc) sc.value = String(Math.round(keepP * 1000));
      draw();
      if (res.cancelled && res.madeSeconds < 1) {
        flash("Recording stopped — nothing long enough to save.");
        return;
      }
      var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      var u = URL.createObjectURL(res.blob), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
      flash(res.cancelled
        ? "Stopped at " + res.madeSeconds.toFixed(1) + " s — saved what was made."
        : "Recorded " + res.seconds + " s, " +
          Math.round(res.blob.size / 1024) + " KB.");
    }).catch(function (e) {
      setTransport(false); btn.textContent = was;
      window.SPStage.S.quality = qKeep; window.SPStage.resize();
      window.SPStage.S.p = keepP; draw();
      flash("Could not record: " + (e && e.message || e) +
            " — the still export always works.");
    });
  }

  /* ---- wiring ------------------------------------------------------------ */
  function bind() {
    var cv = $("sp-canvas");
    if (!cv) return;
    window.SPStage.attach(cv);
    loadState();
    window.SPStage.resize();

    C = buildContext();
    buildWall();
    refreshTray();
    refreshShots();

    /* mode banner: a chart, or live only */
    var mode = $("sp-mode");
    if (mode) {
      if (C.J) mode.textContent = "Reading the chart stored in this browser" +
        (C.birth && C.birth.name ? " — " + C.birth.name : "") +
        ". Everything on the wall is available.";
      else {
        mode.textContent = "No chart stored here — the sky, the day and the " +
          "divisions all work; chart-only chips are greyed. Build one on the " +
          "Kundli page to unlock them.";
        mode.className = "spnote warn";
      }
    }

    $("sp-search") && $("sp-search").addEventListener("input", refreshWall);
    $("sp-onlylive") && $("sp-onlylive").addEventListener("change", refreshWall);
    $("sp-clear") && $("sp-clear").addEventListener("click", function () {
      SEL = []; FORCE = null; refreshWall(); refreshTray(); draw(); saveState(); });

    [].forEach.call(document.querySelectorAll("[data-spratio]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.ratio = b.getAttribute("data-spratio");
        [].forEach.call(document.querySelectorAll("[data-spratio]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        window.SPStage.resize(); draw(); saveState();
      });
      if (b.getAttribute("data-spratio") === window.SPStage.S.ratio)
        b.className = "spv on";
    });
    [].forEach.call(document.querySelectorAll("[data-sppal]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.pal = b.getAttribute("data-sppal");
        [].forEach.call(document.querySelectorAll("[data-sppal]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        draw(); saveState();
      });
      if (b.getAttribute("data-sppal") === window.SPStage.S.pal)
        b.className = "spv on";
    });
    var safe = $("sp-safe");
    if (safe) {
      safe.checked = window.SPStage.S.safe;
      safe.addEventListener("change", function () {
        window.SPStage.S.safe = safe.checked; draw(); saveState(); });
    }
    var scrub = $("sp-scrub");
    if (scrub) scrub.addEventListener("input", function () {
      play(false);
      window.SPStage.S.p = (+scrub.value) / 1000; showTime(); drawFrame(); });
    $("sp-play") && $("sp-play").addEventListener("click", function () { play(!PLAY); });
    var dur = $("sp-dur");
    if (dur) dur.addEventListener("change", function () { DUR = +dur.value; showTime(); });
    var head = $("sp-head");
    if (head) {
      head.value = window.SPStage.S.headline;
      head.addEventListener("input", function () {
        window.SPStage.S.headline = head.value; draw(); saveState(); });
    }
    var sub = $("sp-sub");
    if (sub) {
      sub.value = window.SPStage.S.sub;
      sub.addEventListener("input", function () {
        window.SPStage.S.sub = sub.value; draw(); saveState(); });
    }
    /* the place picker: the site's own, not a second one */
    var ph = $("sp-place");
    if (ph && window.NPlaces) {
      var sv2 = null;
      try { sv2 = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null; }
      catch (e) {}
      var quick = (sv2 ? [sv2] : []);
      if (C.birth && C.birth.lat != null)
        quick = quick.concat([{ n: (C.birth.place || C.birth.name ||
                                    "your chart's place"),
                                lat: C.birth.lat, lon: C.birth.lon,
                                tz: C.birth.tzHours }]);
      quick = quick.concat((window.NP && window.NP.PLACES) || []);
      window.NPlaces.picker({
        host: ph, value: C.place, quick: quick, label: "Place",
        refMs: function () { return C ? C.when : Date.now(); },
        onPick: applyPlace
      });
    } else if (ph) {
      ph.appendChild(el("p", "spmuted",
        "The city list did not load, so the place cannot be changed here."));
    }

    var when = $("sp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        refreshWall(); refreshTray(); draw();
        if (window.SPDirUI) window.SPDirUI.refresh();
      });
    }
    var span = $("sp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); draw(); });
    /* the strip: pause on hover so a tile can be read, and on drag so it can
       be scrubbed by hand */
    var strip = $("sp-strip");
    if (strip) {
      strip.addEventListener("mouseenter", function () {
        STRIP.hover = true; STRIP.paused = true; });
      strip.addEventListener("mouseleave", function () {
        STRIP.hover = false; STRIP.paused = PLAY; });
      strip.addEventListener("pointerdown", function () { STRIP.dragging = true; });
      window.addEventListener("pointerup", function () { STRIP.dragging = false; });
      strip.addEventListener("touchstart", function () {
        STRIP.hover = true; STRIP.paused = true; }, { passive: true });
    }
    var sh = $("sp-shuffle");
    if (sh) sh.addEventListener("click", function () { buildStrip(); });

    $("sp-addshot") && $("sp-addshot").addEventListener("click", addShot);
    var tog = $("sp-storytoggle");
    if (tog) tog.addEventListener("change", function () {
      STORY = tog.checked; window.SPStage.S.p = 0; refreshShots(); draw(); saveState(); });
    $("sp-clearshots") && $("sp-clearshots").addEventListener("click", function () {
      SHOTS = []; STORY = false; refreshShots(); draw(); saveState(); });
    $("sp-png") && $("sp-png").addEventListener("click", savePng);
    $("sp-rec") && $("sp-rec").addEventListener("click", saveVideo);

    /* DIRECTOR MODE. The panel is handed the few things it cannot work out
       for itself — what is selected on the wall, which context to resolve
       against, how long the reel is, and how to ask for a redraw. It is given
       functions rather than values because every one of them changes while
       the panel is open, and a panel holding a stale copy of the context
       would resolve nodes against last week. */
    if (window.SPDirUI) {
      window.SPDirUI.mount({
        draw: draw,
        drawFrame: drawFrame,
        ctx: function () { return C; },
        sel: function () { return SEL.slice(); },
        force: function () { return FORCE; },
        headline: function () { return window.SPStage.S.headline; },
        subline: function () { return window.SPStage.S.sub; },
        duration: function () { return DUR; },
        lastReport: function () { return LAST; },
        save: saveState,
        flash: flash
      });
    }

    /* the list of what is deliberately missing */
    var ab = $("sp-absent");
    if (ab) window.SPNodes.absent.forEach(function (a) {
      var li = el("li");
      li.appendChild(el("b", null, a.what));
      li.appendChild(document.createTextNode(" — " + a.why));
      ab.appendChild(li);
    });

    window.addEventListener("resize", function () { fitPreview(); });
    showTime();
    draw();
    buildStrip();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();

  /* a hook for the page test: drive the whole UI without a mouse */
  try {
    window.__spUI = {
      select: function (ids) { SEL = ids.slice(); FORCE = null;
        refreshWall(); refreshTray(); draw(); return LAST; },
      last: function () { return LAST; },
      ctx: function () { return C; },
      related: related,
      shots: function () { return SHOTS.slice(); },
      addShot: function () { addShot(); return SHOTS.length; },
      setStory: function (on) { STORY = on; refreshShots(); draw(); return STORY; },
      nodeCount: function () { return window.SPNodes.all().length; },
      strip: function () { return { live: STRIP.live, tiles: STRIP.tiles.length,
        raf: !!STRIP.raf, paused: STRIP.paused, hidden: document.hidden,
        lastError: STRIP.lastError || null,
        ticks: STRIP.ticks || 0, renders: STRIP.renders || 0,
        offscreen: STRIP.offscreen || 0, rect: STRIP.rect || null,
        broken: STRIP.tiles.filter(function (t) { return t.broken; })
                  .map(function (t) { return t.spec.label; }) }; },
      stripSpecs: function () {
        return STRIP.tiles.slice(0, STRIP.live).map(function (t) {
          return t.spec.label; }); },
      rollStrip: function () { rollOne($("sp-strip")); return this.stripSpecs(); },
      poolSize: function () { return poolAvailable().length; },
      place: function () { return C && C.place; },
      pickPlace: function (p) { return applyPlace(p); },
      placeInputs: function () {
        var h = $("sp-place");
        return h ? h.querySelectorAll("input").length : 0; },
      /* Director: drive the mode and the document without a mouse, and read
         back what the frame path actually did */
      dir: function () { return window.SPDirector; },
      dirOn: function () { return !!(window.SPDirector && window.SPDirector.on()); },
      take: function (how) {
        var b = $(how === "split" ? "sp-takesplit"
               : how === "solo" ? "sp-takesolo"
               : how === "blank" ? "sp-takeblank" : "sp-takeone");
        if (b) b.click();
        return window.SPDirector ? window.SPDirector.doc() : null;
      },
      setAuto: function () {
        var bs = document.querySelectorAll("#sp-modebar .spv");
        if (bs.length) bs[0].click();
        return !!(window.SPDirector && window.SPDirector.on());
      },
      /* the frame as the EXPORT path makes it — frameAt with no overlay, which
         is what savePng and the recorder call */
      exportFrame: function (p) {
        window.SPStage.S.p = p == null ? window.SPStage.S.p : p;
        return window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                      shotsNow(), true);
      },
      /* the frame as the SCREEN makes it — the same, plus the handles */
      screenFrame: function (p) {
        if (p != null) window.SPStage.S.p = p;
        drawFrame();
        return LAST;
      },
      refreshDir: function (deep) {
        if (window.SPDirUI) window.SPDirUI.refresh(deep); },
      duration: function () { return DUR; },
      playing: function () { return PLAY; }
    };
  } catch (e) {}
})();
