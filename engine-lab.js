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
     which is what a draconitic month right to two seconds should give.

     THE MOON'S APOGEE WAS THE SAME OMISSION, AND IT COST MORE.
     The paragraph above says "almost every one of them starts from zero" and
     then names only the node. That was wrong by one. The Moon's apsidal line
     stood at 90° at the Kali epoch, not at 0°, and leaving it out put the
     Moon's whole manda equation — amplitude about 5° — a quarter turn out of
     phase for every date this engine computes.

     Source: T. S. Kuppanna Sastry, tr., Pañcasiddhāntikā of Varāhamihira,
     ed. K. V. Sarma (PPST Foundation, Madras, 1993), notes to Ch. XVI: in the
     Āryabhaṭīya, the Ardharātrika-pakṣa, Varāhamihira's Saura, Bhaṭṭotpala's
     Pauliśa AND the Later Sūrya Siddhānta alike, the mean planets stand at
     zero at the beginning of Kali, the Moon's apogee at 90° and its node at
     180°. The node was already here; the apogee is this. NOT a Parāśara
     statement and not from the uploaded BPHS volumes — siddhāntic
     literature, cited as such.

     And it is confirmed without reference to the text. Scoring the bare
     engine's Moon against a modern sky and searching the whole circle for the
     epoch value that fits best lands on 86°, four degrees from the text's
     90°, while 0° — what this shipped — is close to the worst of the range:

         0° (as shipped) 420′      60°  240′      120° 244′
         30°             318′      90°  217′      180° 376′

     So this was halving the accuracy of the bare tier. And because the fitted
     tier carries epoch.candraUcca among its own parameters, the optimiser had
     quietly absorbed the error — it chose 125.6°, trading epoch against bīja
     across the fitted window — which is how a fault in the thing being
     compared against can hide inside the thing doing the comparing.
     ss-verify asserts the value now, both against the text and against that
     independent fit. */
  var EPOCH_LON = { "Rāhu": 180, "candraUcca": 90 };
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
  /* THE UDAYĀNTARA TAKES THE SĀYANA SUN, and took the sidereal one.

     A right ascension is measured from the equinox, so λ − α is a quantity in
     the equinoctial frame and nothing else. Handing it a sidereal longitude
     shifts the argument of a semi-annual term by the whole ayanāṃśa, which is
     26° on the text's own libration reading — the curve keeps its amplitude
     (10.34 against 10.36 minutes, measured) and moves its phase, which is why
     nothing looked obviously broken.

     It is the blind spot this engine's own structure creates. Sidereal is
     primary here and the frame is converted only where it is needed; but the
     text cannot say where it is needed, because at its epoch of 499 CE the
     ayanāṃśa is zero by construction and the two readings coincide. Every
     omission of the conversion is therefore invisible in the text's own
     century and grows at about 50″ a year. The declination two functions down
     already had the conversion and carried a comment explaining it; this did
     not, which is an inconsistency rather than fidelity.

     Measured against the site's modern almanac, Ujjain, 122 samples over a
     year — sunrise, in minutes:

                       mean   |mean|    rms   worst
         as it was      3.68    5.86    6.90   11.88
         in frame       3.70    3.70    3.84    5.78

     The mean is untouched at 3.7 minutes, and that is the point: 3.7 is the
     sunrise CONVENTION — centre of the disc without refraction against an
     almanac's upper limb with it. Before the fix there was a bias of 3.7 with
     scatter on top; after it the scatter is essentially gone and the bias is
     all that is left. A chunk of what the accuracy figures filed under
     "convention" was this. */
  function udayantaraDays(sayanaSun) {
    return sdiff(sayanaSun, raOfLongitude(sayanaSun)) / 360;
  }
  function equationOfTime(ahar) {
    var q = trueLongitude("Sūrya", ahar);
    /* the ayanāṃśa is a function of the moment, and an ahargaṇa is a moment:
       jd = ahar + the epoch it was reckoned from */
    var ms = msOf(ahar + EPOCH.sunrise);
    return bhujantaraDays(ahar) + udayantaraDays(tropical(q.lon, ms));
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
      /* the sāyana Sun, matching what equationOfTime actually used — this
         reported the sidereal reading while E was computed from it too, so
         the panel agreed with the bug rather than exposing it */
      udayantaraMinutes: udayantaraDays(tropical(q.lon, ms)) * 24 * 60,
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
      var lon = window.__kSidAtModern("Moon", new Date(ms));
      var e = window.__kEclipModern("Moon", ms);
      if (e && e.lat != null) {
        var s2 = clamp(Math.sin(e.lat * D2R) / Math.sin(5.145 * D2R), -1, 1);
        var arg = Math.asin(s2) * R2D;
        /* resolve the quadrant with the latitude's own rate */
        var e2 = window.__kEclipModern("Moon", ms + 3600000);
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
           "what the method itself gives, not an abbreviation of it" },
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

  /* ===== THE MEASURED TIER ==================================================

     The engine above computes with the text's own constants and lands degrees
     from the modern ephemeris — Śani 6.4° apart in 2026, the Moon 6.3°. That
     is what the method itself gives, and it is reported as a difference, not
     ranked.

     measured() keeps every EQUATION exactly as it is — madhyama, manda,
     śīghra, the epicycle interpolation, the twenty-four-entry sine table —
     and swaps in constants fitted to a modern sky by
     source/test/fit-siddhanta.mjs: a bīja on each body's revolutions, an
     epoch longitude, a scale on each paridhi of the pair the text states, and
     an offset on each mandocca. Every one of those is a quantity the tradition
     itself treats as correctable; no term is added and no formula changes.

     IT IS NOT THE SŪRYA SIDDHĀNTA'S ANSWER. It is the text's method carrying
     measured numbers, and any page showing it must say so. bare() puts every
     constant back, and siddhanta-measured-verify.mjs asserts the restored
     engine is bit-identical to one that never heard of this.

     WHAT IT REACHES, out of sample on 213 instants never seen by the fit:

         Sūrya 1.0′    Guru 6.0′    Śani 7.3′    Śukra 8.4′
         Maṅgala 58′   Candra 62′   Budha 107′
         Rāhu (and so Ketu) 0.13′, against the modern mean node

     The node was added after the tier first shipped. Until then Rāhu and Ketu
     kept the text's own constants inside an otherwise fitted chart, which put
     them 236′ (rms) from the modern mean node — 3.9° on a 1984 chart. It
     takes an epoch and a bīja, the same two kinds of number every other body
     has, and is fitted to the MEAN node because the text has no other: the
     true node's wobble is a term the theory lacks, like the Moon's evection.

     The split is not a surprise and it is not a shortcoming of the fit. The
     Moon's residual, regressed on the arguments of the two terms this theory
     lacks, yields an evection of 75.9′ against the textbook 76.4′ and a
     variation of 39.7′ against 39.5′, and removing just those two drops its
     rms from 62′ to 14′. The Moon's limit here is the ABSENCE OF TERMS, not
     the value of numbers, and no bīja or paridhi can supply them. Budha's and
     Maṅgala's eccentricities are likewise past what one epicycle can carry.
     Adding the missing terms would make this a different astronomy wearing the
     same parameters, which is the line this tier does not cross. */
  var MEASURED = null;      /* set by setMeasured(), from the fitted data file */
  var BASE_CONST = {
    rev: JSON.parse(JSON.stringify(YUGA.rev)),
    civilDays: YUGA.civilDays,
    epi: JSON.parse(JSON.stringify(EPI)),
    mandocca: JSON.parse(JSON.stringify(MANDOCCA)),
    epoch: JSON.parse(JSON.stringify(EPOCH_LON))
  };
  function restoreConstants(){
    OPT.bija = null;
    PS_ON = false;
    /* YUGA.rev and civilDays go back too. The measured tier never needed that
       — it corrects revolutions through OPT.bija, a multiplicative factor
       applied at use, and leaves YUGA.rev alone — so this function restored
       everything EXCEPT the revolutions it had been snapshotting all along.
       The Pañcasiddhāntikā tier below is a CONSTANTS tier and must mutate
       them, so bare() has to put them back, or the next caller silently gets
       Varāhamihira's numbers under the Later Sūrya Siddhānta's name. */
    for (var r in BASE_CONST.rev) YUGA.rev[r] = BASE_CONST.rev[r];
    YUGA.civilDays = BASE_CONST.civilDays;
    for (var b in BASE_CONST.epi) {
      EPI[b].manda = BASE_CONST.epi[b].manda.slice();
      EPI[b].sighra = BASE_CONST.epi[b].sighra ? BASE_CONST.epi[b].sighra.slice() : null;
    }
    for (var m in BASE_CONST.mandocca) MANDOCCA[m] = BASE_CONST.mandocca[m];
    for (var e in EPOCH_LON) delete EPOCH_LON[e];
    for (var e2 in BASE_CONST.epoch) EPOCH_LON[e2] = BASE_CONST.epoch[e2];
  }
  /* ===== THE PAÑCASIDDHĀNTIKĀ SAURA TIER ====================================

     Varāhamihira's Saura, as condensed in the Pañcasiddhāntikā (Kuppanna
     Sastry tr., Sarma ed., PPST Madras 1993), Ch. XVI–XVII. Of the five
     siddhāntas he abridges, THE SAURA ALONE USES EPICYCLES (Sastry's note to
     Ch. XVI), so it is the only one with a counterpart in this engine — the
     Pauliśa, Romaka, Vāsiṣṭha and Paitāmaha have none, and a Romaka tier in
     particular could compute the Sun, the Moon, the pañcāṅga and eclipses and
     nothing else, because that chapter supplies no star-planets at all.

     Like measured(), this tier keeps EVERY EQUATION as it is and swaps only
     constants. Unlike measured(), the constants are not fitted to anything:
     they are an older recension's own numbers, and the tier exists to show
     what the method gives with them.

     WHAT IS THE TEXT'S, AND WHAT WAS BORROWED. The body of that PDF is page
     images; only pages 408–419 carry a text layer, so every figure below was
     OCR'd at 300–400 dpi and checked. Until 14 November 2026 four quantities
     the extraction had not reached were the Later Sūrya Siddhānta's, each
     named in panchaSauraInfo().borrowed. All four are in Ch. IX — not Ch.
     XVI, where the earlier note looked — and they are now the text's own:

       the Moon's apogee   IX.3–4: days × 900 + 22,60,356, ÷ 29,08,789, then
                           + 10″/297 per revolution. Sastry (notes to IX.4)
                           shows the rule encodes 4,88,219 revolutions per
                           Mahāyuga; the Later SS has 4,88,203.
       the node            IX.5–6: days × 2700 + 63,13,219, ÷ 1,83,45,827,
                           deducted from 12 rāśis. 2,32,226.002 per Mahāyuga
                           (Sastry: 2,32,226, the rule's 46″ excess "neglected
                           by the author"); the Later SS has 2,32,238.
       the Moon's epicycle IX.7–8: "multiply the sine of the anomaly … of the
                           Moon by 31" and divide by 360 — ONE circumference,
                           31°, against the later pair 32° / 31°40′.
       the Sun's apogee    IX.7: "the mean longitude of the Sun minus 80° is
                           called the Sun's anomaly" — 80°, against 77°17′.

     The two revolution counts are taken from the rules exactly as written
     (Mahāyuga days × multiplier ÷ divisor, with the apogee's second step),
     not from Sastry's rounded integers, so the tier computes what the verse
     computes. Their EPOCH longitudes (apogee 90°, node 180° at Kali) were
     already text-verified and are unchanged; Sastry's derivation of both
     kṣepas starts from them. The list stays, now empty, so a page that prints
     it says "none" rather than nothing.

     Known differences from the Later SS, all text-verified:

       yuga civil days   1,577,917,800 against 1,577,917,828 — the 28-day
                         Ardharātrika gap (Āryabhaṭa's Audayika is
                         1,577,917,500; +300 the Ardharātrika, +328 the Later
                         SS). Implied year 365.258750 d against 365.258756 d,
                         which is half a second.
       revolutions       Guru identical; Śani −4, Maṅgala −8, Budha −60,
                         Śukra +12 on figures in the millions.
       epicycles         THE OLDER TEXT HAS ONE VALUE, NOT TWO. Six of its ten
                         star-planet figures are exactly this engine's
                         even-quadrant member, which reads as the later
                         recension having added a second circumference beside
                         an inherited one. So the "breathing" epicycle is a
                         later-recension feature, and on this tier it does not
                         breathe: both quadrant entries are set equal.
       mandocca          agrees EXACTLY on all five star-planets, so nothing
                         changes there and the agreement is itself a result.

     NOT IMPLEMENTED, and the tier says so rather than pretending: the PS
     computes on R = 120, not 3438, with its own jyā table. That is a
     different trigonometric base, and this tier runs the engine's sine table.
     It is therefore the PS's PARAMETERS under this engine's trigonometry, not
     a reimplementation of the PS's arithmetic. */
  var PS_ON = false;
  var PS_CONST = {
    /* PS I.14, the Saura minor yuga of 180,000 years, ×24 to the Mahāyuga.
       The ×24 civil-day figure reproduces the Ch. XVI value exactly, which is
       an independent confirmation that the scaling is right. */
    civilDays: 1577917800,
    rev: {
      "Sūrya":   4320000,       /* PS I.14 */
      "Candra":  57753336,      /* PS I.14: 2,406,389 lunar revolutions × 24 */
      "Maṅgala": 2296824,       /* Ch. XVI.2–9, days ÷ 687 */
      "Budha":   17937000,      /* śīghrocca; days × 100 ÷ 8797 */
      "Guru":    364220,        /* days × 100 ÷ 433,232 */
      "Śukra":   7022388,       /* śīghrocca; days × 10 ÷ 2247 */
      "Śani":    146564,        /* days × 1000 ÷ 10,766,066 */
      /* IX.3–4, the rule as written: Mahāyuga days × 900 ÷ 29,08,789, then the
         second step, + 10″ per 297 revolutions (a revolution is 1,296,000″) */
      "candraUcca": (1577917800 * 900 / 2908789) * (1 + 10 / (297 * 1296000)),
      /* IX.5–6, as written: × 2700 ÷ 1,83,45,827, and deducted from 12 rāśis,
         so the node goes backwards — negative, as this engine counts it */
      "Rāhu":    -(1577917800 * 2700 / 18345827)
    },
    /* One circumference per body, not a pair. Where the text gives one value
       both quadrant entries take it, so the interpolation that makes the
       later recension's epicycle "breathe" collapses to a constant. */
    epi: {
      "Sūrya":   { manda: 14,  sighra: null },   /* the text notes Śukra's
                                                    manda 14° IS the Sun's */
      "Maṅgala": { manda: 70,  sighra: 234 },
      "Budha":   { manda: 28,  sighra: 132 },
      "Guru":    { manda: 32,  sighra: 72 },
      "Śukra":   { manda: 14,  sighra: 260 },
      "Śani":    { manda: 60,  sighra: 40 },
      /* IX.7–8: sine of the Moon's anomaly × 31 ÷ 360 — one value, 31° */
      "Candra":  { manda: 31,  sighra: null }
    },
    /* IX.7: the Sun's apogee at 80°. The five star-planets' mandocca were
       already the text's and agree with the Later SS exactly. */
    mandocca: { "Sūrya": 80 },
    /* where each of the four once-borrowed quantities is read, for any page
       that wants to cite it */
    sources: {
      "YUGA.rev.candraUcca": "PS IX.3–4 (Sastry tr. p. 199; notes p. 200–201)",
      "YUGA.rev.Rāhu":       "PS IX.5–6 (Sastry tr. p. 201; notes p. 202–203)",
      "EPI.Candra":          "PS IX.7–8 (Sastry tr. p. 203–204)",
      "MANDOCCA.Sūrya":      "PS IX.7 (Sastry tr. p. 203)"
    },
    /* Named individually, because an undisclosed borrow is the whole risk
       here. Each entry says what was wanted and why it is not the text's. */
    /* Empty since 14 November 2026: the four entries it held are closed
       from Ch. IX (see the note above). Kept, so the disclosure is still
       rendered from the engine and still says "none" rather than nothing. */
    borrowed: []
  };
  function applyPanchaSaura(){
    for (var r in PS_CONST.rev) YUGA.rev[r] = PS_CONST.rev[r];
    YUGA.civilDays = PS_CONST.civilDays;
    for (var b in PS_CONST.epi) {
      var v = PS_CONST.epi[b];
      /* both entries equal: one circumference, so no interpolation */
      EPI[b].manda = [v.manda, v.manda];
      EPI[b].sighra = (v.sighra == null) ? null : [v.sighra, v.sighra];
    }
    for (var m in PS_CONST.mandocca) MANDOCCA[m] = PS_CONST.mandocca[m];
    OPT.bija = null;          /* a constants tier, never a fitted one */
    PS_ON = true;
    return true;
  }
  /* Hand it the parsed source/data/siddhanta-measured.json. Kept as an
     argument rather than fetched or inlined: this file must stay loadable with
     no network and no build step, and a page that wants the measured tier can
     decide for itself whether to ship 6 KB of fitted constants. */
  function setMeasured(doc){ MEASURED = (doc && doc.params) ? doc : null; return !!MEASURED; }
  function applyMeasured(){
    if (!MEASURED) return false;
    var P = MEASURED.params, bija = {}, k;
    for (k in BASE_CONST.rev) if (P["bija." + k] != null) bija[k] = P["bija." + k];
    OPT.bija = bija;
    for (var b in BASE_CONST.epi) {
      var mo = P["mandaOdd." + b], me = P["mandaEven." + b];
      var so = P["sighraOdd." + b], se = P["sighraEven." + b];
      EPI[b].manda = [BASE_CONST.epi[b].manda[0] * (mo == null ? 1 : mo),
                      BASE_CONST.epi[b].manda[1] * (me == null ? 1 : me)];
      EPI[b].sighra = BASE_CONST.epi[b].sighra
        ? [BASE_CONST.epi[b].sighra[0] * (so == null ? 1 : so),
           BASE_CONST.epi[b].sighra[1] * (se == null ? 1 : se)] : null;
    }
    for (var m in BASE_CONST.mandocca)
      MANDOCCA[m] = BASE_CONST.mandocca[m] + (P["mandocca." + m] || 0);
    for (var e in EPOCH_LON) delete EPOCH_LON[e];
    for (var e2 in BASE_CONST.epoch) EPOCH_LON[e2] = BASE_CONST.epoch[e2];
    for (k in BASE_CONST.rev)
      if (P["epoch." + k] != null)
        EPOCH_LON[k] = (BASE_CONST.epoch[k] || 0) + P["epoch." + k];
    return true;
  }

  window.SSEngine = {
    /* configuration */
    OPT: OPT,
    /* the measured tier — see the note above it */
    setMeasured: setMeasured,
    measured: applyMeasured,
    bare: restoreConstants,
    isMeasured: function(){ return !!(MEASURED && OPT.bija); },
    /* the Pañcasiddhāntikā Saura tier — see the long note above it.
       panchaSauraInfo().borrowed is still what a page displaying this tier
       must print. Since the Ch. IX reading it is empty — every constant is
       the text's own — and the page says "none". */
    panchaSaura: applyPanchaSaura,
    isPanchaSaura: function(){ return PS_ON; },
    panchaSauraInfo: function(){
      return {
        source: "Pañcasiddhāntikā of Varāhamihira, Ch. I.14, IX and XVI–XVII; Kuppanna " +
                "Sastry tr., K. V. Sarma ed., PPST Foundation, Madras, 1993",
        civilDays: PS_CONST.civilDays,
        laterSSCivilDays: BASE_CONST.civilDays,
        civilDayGap: BASE_CONST.civilDays - PS_CONST.civilDays,
        impliedYear: PS_CONST.civilDays / YUGA.years,
        rev: JSON.parse(JSON.stringify(PS_CONST.rev)),
        epi: JSON.parse(JSON.stringify(PS_CONST.epi)),
        mandocca: JSON.parse(JSON.stringify(PS_CONST.mandocca)),
        sources: JSON.parse(JSON.stringify(PS_CONST.sources)),
        oneEpicycleNotTwo: true,
        borrowed: PS_CONST.borrowed.map(function (b) {
          return { path: b[0], what: b[1], why: b[2] };
        }),
        notImplemented: "The PS computes on R = 120 with its own jyā table, " +
          "not on 3438. This tier runs the engine's trigonometry, so it is " +
          "the PS's PARAMETERS under this engine's arithmetic, not a " +
          "reimplementation of the PS's own."
      };
    },
    measuredInfo: function(){
      return MEASURED ? { residuals: MEASURED.residuals,
                          lunarDiagnostic: MEASURED.lunarDiagnostic,
                          provenance: MEASURED._provenance } : null;
    },
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
;

/* ===== engine-lab.html — the three engines, put to the same questions ======

   WHAT THIS PAGE IS FOR. Every other page that touches accuracy quotes
   arcseconds. Arcseconds are the wrong unit for judging an engine, because a
   chart is read in rāśis, nakṣatras, pādas, aṃśas and daśā periods, and the
   conversion between the two is steep in one place and flat everywhere else.
   So this page asks the QUESTION rather than the body, and converts.

   NOTHING IS TYPED IN. Every measured figure comes from the two data files the
   harnesses write — accuracy.json and siddhanta-measured.json — inlined by the
   build, never fetched, because every page here has to work from a file:// URL.
   Every live comparison is computed in the browser from the engines themselves.

   THE FRAME, which is the one thing a comparison like this can get silently
   wrong. Three different conventions are in play and they are not
   interchangeable:

     · a TITHI is the difference of two longitudes, so a sidereal zero cancels
       out of it exactly and the comparison is frame-free;
     · a NAKṢATRA is measured FROM that zero, so comparing the bare text's
       nakṣatra with a modern one includes the difference between their two
       sidereal zeros. That is left in rather than corrected away — it is a real
       disagreement a reader would meet in an almanac — and the page says so;
     · the FITTED tier was fitted in the site's own Lahiri frame, so its
       longitudes are already there and need no conversion. Scoring it in any
       other frame would measure the frame.

   This is the same recipe ss-verify.mjs and siddhanta-measured-verify.mjs use,
   so a number printed here means what a number printed by the harness means. */
(function () {
  "use strict";

  if (!document.getElementById("el-answer")) return;
  var $ = function (id) { return document.getElementById(id); };

  var SA7 = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
              "Friday", "Saturday"];
  /* the three engines, in the order they are always shown */
  var TIERS = [
    { k: "mod", label: "modern ephemeris",
      note: "astronomy-engine, measured against ERFA" },
    { k: "fit", label: "siddhānta, fitted tier",
      note: "the text's equations, measured constants" },
    { k: "bare", label: "Sūrya Siddhānta as written",
      note: "the text's own numbers" }
  ];

  var AC = null, FIT = null, LAH = null;
  var S = null;                      /* window.SSEngine */
  var ST = { when: Date.now(), place: null, q: "nak", arc: 14.79, year: 2026 };

  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dm(L) {
    var x = norm(L), s = Math.floor(x / 30), r = x - s * 30;
    var d = Math.floor(r), m = Math.round((r - d) * 60);
    if (m === 60) { m = 0; d++; }
    return d + "°" + (m < 10 ? "0" : "") + m + "′ " + RS[s];
  }
  /* an angle in arcseconds, written in whichever unit keeps it legible */
  function ang(as) {
    var a = Math.abs(as);
    if (a < 60) return a.toFixed(a < 10 ? 2 : 1) + "″";
    if (a < 3600) return (a / 60).toFixed(a < 600 ? 2 : 1) + "′";
    return (a / 3600).toFixed(2) + "°";
  }
  /* a division's own width, written the way the tradition writes it: 13°20′,
     not 13.33°. The decimal was how it first came out and it reads as an
     approximation of something exact, which it is not. */
  function degMin(deg) {
    var d = Math.floor(deg + 1e-9), m = (deg - d) * 60;
    if (d === 0) return (m === Math.round(m) ? m.toFixed(0) : m.toFixed(1)) + "′";
    if (m < 1e-6) return d + "°";
    return d + "°" + (Math.abs(m - Math.round(m)) < 1e-6
      ? String(Math.round(m)).padStart(2, "0") : m.toFixed(1)) + "′";
  }
  function plural(n, one, many) {
    return n.toFixed(n < 10 ? 2 : (n < 100 ? 1 : 0)) + " " + (n === 1 ? one : many);
  }

  function need(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done();
      var sp = list[i++];
      if (sp.have()) return next();
      var s = document.createElement("script");
      s.src = sp.src; s.defer = true;
      s.onload = next;
      s.onerror = function () {
        $("el-answer").innerHTML = '<p class="swfail">Could not load <code>' +
          sp.src + "</code>.</p>";
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- the three engines, as three functions of a moment ------------------ */
  function lahiriAt(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return LAH[2] + LAH[1] * T + LAH[0] * T * T;
  }
  /* The frame the modern column is read in: Lahiri by default (the frame the
     fitted tier was fitted in, so a comparison is engines and not zeros), or
     whatever the reader picks for this page. */
  function pageMode() { try { return (window.__pageAyan && window.__pageAyan()) || "lahiri"; } catch (e) { return "lahiri"; } }
  function frameAt(jd) {
    var m = pageMode();
    if (m === "lahiri" || !window.__ayanFor) return lahiriAt(jd);
    return window.__ayanFor(m, jd);
  }
  function frameNote() {
    var m = pageMode();
    if (m === "lahiri") return "The modern column is in the Lahiri frame the fitted tier was fitted in; the text as written counts from its own zero. ";
    return "The modern column is in the " + (window.__ayanName ? window.__ayanName(m) : m) +
      " frame chosen for this page; the fitted tier was fitted in Lahiri, so part of every difference here is the gap between the two zeros rather than between the engines. ";
  }
  /* The engine's state is global, so a tier is entered, read and left. Reading
     all three at one moment is three passes, not one — which is the point. */
  function withTier(k, fn) {
    if (k === "bare") { S.bare(); S.setMeasured(FIT); return fn(); }
    S.setMeasured(FIT);
    S.measured();
    var out = fn();
    S.bare(); S.setMeasured(FIT);
    return out;
  }
  function ssAt(k, ms) {
    return withTier(k, function () {
      var a = S.ahargana(ms) + (ST.place ? S.desantara(ST.place) : 0);
      var out = { lon: {}, panch: null };
      SA7.forEach(function (sa) {
        var q = S.trueLongitude(sa, a);
        out.lon[sa] = q ? q.lon : null;
      });
      try { out.panch = S.panchanga(ms, ST.place); } catch (e) {}
      return out;
    });
  }
  function modAt(ms) {
    var out = { lon: {}, panch: null, lahiri: {} };
    SA7.forEach(function (sa) {
      try {
        var e = window.__kEclipModern(EN[sa], ms);
        out.lon[sa] = e ? e.lon : null;        /* the site's own ayanāṃśa */
        out.lahiri[sa] = e ? norm(e.trop - frameAt(ms / 86400000 + 2440587.5))
                           : null;             /* the frame the fit used */
      } catch (err) { out.lon[sa] = null; }
    });
    try { out.panch = window.NP.day(ms, ST.place); } catch (e) {}
    return out;
  }

  /* ---- helpers for the questions that need time searched, not read ------- */
  var HOUR = 3600000, DAYMS = 86400000;
  function tzOf() { return ST.place && ST.place.tz != null ? ST.place.tz : 0; }
  function clock(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var d = new Date(ms + tzOf() * HOUR);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function stamp(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var d = new Date(ms + tzOf() * HOUR);
    var M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getUTCDate() + " " + M[d.getUTCMonth()] + " " + d.getUTCFullYear() + ", " + clock(ms);
  }
  function minutesApart(a, b) {
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return "—";
    var m = (a - b) / 60000, sg = m < 0 ? "−" : "+", x = Math.abs(m);
    if (x >= 2 * 1440) return sg + (x / 1440).toFixed(1) + " d";
    if (x >= 120) return sg + (x / 60).toFixed(1) + " h";
    return sg + x.toFixed(0) + " min";
  }
  /* the next instant after t0 at which f(t) (a sign number, an index…) changes,
     stepping `step` ms and then bisecting to a minute */
  function nextChange(f, t0, step, limit) {
    var fa = f(t0);
    for (var t = t0 + step; t <= t0 + limit; t += step) {
      var ft = f(t);
      if (ft !== fa) {
        var lo = t - step, hi = t;
        while (hi - lo > 60000) { var m = (lo + hi) / 2; if (f(m) === fa) lo = m; else hi = m; }
        return { at: hi, from: fa, to: f(hi) };
      }
    }
    return null;
  }
  /* the next instant the Moon−Sun elongation reaches `want` degrees */
  function nextElong(elong, t0, want) {
    var g = function (t) { return sdiff(elong(t), want); };
    var step = 6 * HOUR, ga = g(t0);
    for (var t = t0 + step; t < t0 + 40 * DAYMS; t += step) {
      var gt = g(t);
      if (ga < 0 && gt >= 0 && Math.abs(gt - ga) < 90) {
        var lo = t - step, hi = t;
        while (hi - lo > 60000) { var m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; }
        return hi;
      }
      ga = gt;
    }
    return null;
  }
  function ssAhar(ms) { return S.ahargana(ms) + (ST.place ? S.desantara(ST.place) : 0); }
  function ssLon(sa) { return function (t) { var q = S.trueLongitude(sa, ssAhar(t)); return q ? q.lon : null; }; }
  function modLon(sa) { return function (t) { var e = window.__kEclipModern(EN[sa], t); return e ? e.lon : null; }; }
  /* the modern engine in the Lahiri frame — the frame the fitted tier was fitted
     in and the one the almanac names its limbs in — so a sign compared across
     engines is not also a comparison of two sidereal zeros */
  function modLonL(sa) { return function (t) { var e = window.__kEclipModern(EN[sa], t);
    return e ? norm(e.trop - frameAt(t / 86400000 + 2440587.5)) : null; }; }

  /* ---- the question, answered three ways --------------------------------- */
  var NAKW = 360 / 27;
  function nakOf(L) {
    var i = Math.floor(norm(L) / NAKW);
    return { i: i, pada: Math.floor((norm(L) % NAKW) / (NAKW / 4)) + 1 };
  }
  function modTithi(p) {
    if (!p || !p.at || !p.at.tithi) return null;
    return p.at.tithi.n + (p.at.tithi.paksha === "kṛṣṇa" ? 15 : 0);
  }

  function answer() {
    var host = $("el-answer");
    if (!host) return;
    var ms = ST.when;
    var A = { mod: modAt(ms), fit: ssAt("fit", ms), bare: ssAt("bare", ms) };
    var rows = [], verdict = "", nakNames = null;
    try { nakNames = S.NAK; } catch (e) {}

    if (ST.q === "lon") {
      rows = SA7.map(function (sa) {
        return { k: sa,
          cells: [dm(A.mod.lon[sa]), dm(A.fit.lon[sa]), dm(A.bare.lon[sa])],
          /* the fitted tier's own frame is Lahiri, so it is compared against
             the modern engine in that frame and not in the page's */
          gap: [ang(Math.abs(sdiff(A.fit.lon[sa], A.mod.lahiri[sa])) * 3600),
                ang(Math.abs(sdiff(A.bare.lon[sa], A.mod.lahiri[sa])) * 3600)] };
      });
      verdict = "Longitude is the question on which the three always differ, " +
        "and by the smallest amount that matters least. The two gap columns " +
        "are each siddhāntic tier against the modern engine in the same " +
        "sidereal frame the fit was made in.";
      return render(["Graha", "modern", "fitted", "as written",
                     "fitted − modern", "written − modern"], rows, true);
    }

    if (ST.q === "nak") {
      var mn = A.mod.panch && A.mod.panch.at && A.mod.panch.at.nak
        ? A.mod.panch.at.nak.name : null;
      var mp = A.mod.panch && A.mod.panch.at && A.mod.panch.at.nak
        ? A.mod.panch.at.nak.pada : null;
      var f = A.fit.panch ? A.fit.panch.nakshatra : null;
      var b = A.bare.panch ? A.bare.panch.nakshatra : null;
      rows = [{ k: "Moon's nakṣatra",
                cells: [mn ? mn + (mp ? " pāda " + mp : "") : "—",
                        f ? f.name + " pāda " + f.pada : "—",
                        b ? b.name + " pāda " + b.pada : "—"] }];
      var same = f && b && mn && f.name === mn && b.name === mn;
      verdict = same
        ? "<b>All three name the same nakṣatra.</b> This is the usual case: " +
          "a difference of a few degrees in longitude still lands inside a " +
          "division 13°20′ wide most of the time."
        : "<b>They do not all agree.</b> Note what is being compared: a " +
          "nakṣatra is counted from a sidereal zero, and the bare text's zero " +
          "is its own. That frame difference is part of this disagreement and " +
          "is deliberately not corrected away, because it is the disagreement " +
          "a reader actually meets when two almanacs are put side by side.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "tithi") {
      var mt = modTithi(A.mod.panch);
      var ft = A.fit.panch ? A.fit.panch.tithi : null;
      var bt = A.bare.panch ? A.bare.panch.tithi : null;
      rows = [{ k: "Tithi",
        cells: [mt == null ? "—" : "no. " + mt,
                ft ? "no. " + ft.n + " · " + ft.name + " " + ft.paksha : "—",
                bt ? "no. " + bt.n + " · " + bt.name + " " + bt.paksha : "—"] }];
      verdict = "A tithi is the <b>difference</b> of the Moon's and the " +
        "Sun's longitudes, so whatever sidereal zero each engine uses cancels " +
        "out of it exactly — the tithi, karaṇa, new moon and full moon are " +
        "free of the ayanāṃśa. What is left is the two position differences, and " +
        "because the Moon crosses a tithi in under a day, those are enough to " +
        "move it by one more often than they move the nakṣatra.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "dasha") {
      var V = window.__kVims;
      rows = ["mod", "fit", "bare"].map(function (k) {
        var L = k === "mod" ? A.mod.lahiri["Candra"] : A[k].lon["Candra"];
        if (L == null) return null;
        var v = V.atMoon(L);
        return { k: TIERS.filter(function (t) { return t.k === k; })[0].label,
          cells: [dm(L), v.lord,
                  v.balance.toFixed(3) + " years of " + v.full] };
      }).filter(Boolean);
      var lords = rows.map(function (r) { return r.cells[1]; });
      var allSame = lords.every(function (l) { return l === lords[0]; });
      /* what the disagreement is worth, in the unit the question is asked in */
      var mb = V.atMoon(A.mod.lahiri["Candra"]).balance;
      var fb = V.atMoon(A.fit.lon["Candra"]).balance;
      verdict = (allSame
        ? "All three would open on <b>" + esc(lords[0]) + "</b>. "
        : "They do not agree on the opening lord. ") +
        "The balances differ by <b>" +
        Math.abs((mb - fb) * 365.2425).toFixed(0) + " days</b> between the " +
        "modern engine and the fitted tier — which is the exchange rate in " +
        "the next section doing its work: a Moon out by an arcminute is a " +
        "daśā boundary out by weeks.";
      return render(["Engine", "the Moon", "opening lord", "balance at birth"],
                    rows, false);
    }

    if (ST.q === "rashi" || ST.q === "d9") {
      var d9 = ST.q === "d9";
      var signOf = function (L) {
        if (L == null) return null;
        return d9 ? Math.floor(norm(L) / (10 / 3)) % 12 : Math.floor(norm(L) / 30);
      };
      var agreeAll = 0;
      rows = SA7.map(function (sa) {
        var m = signOf(A.mod.lahiri[sa]), f = signOf(A.fit.lon[sa]), b = signOf(A.bare.lon[sa]);
        if (m != null && m === f && m === b) agreeAll++;
        return { k: sa, cells: [m == null ? "—" : RS[m], f == null ? "—" : RS[f], b == null ? "—" : RS[b],
          m === f && m === b ? "all three" : (m === f ? "modern = fitted" : (m === b ? "modern = written" : (f === b ? "fitted = written" : "each different")))] };
      });
      verdict = "<b>" + agreeAll + " of 7</b> grahas are placed in the same " +
        (d9 ? "navāṃśa (the ninth division of a sign, 3°20′ wide)" : "rāśi (30° wide)") + " by all three engines. " + frameNote() +
        (d9 ? "A navāṃśa is a ninth of a sign, so a difference of a degree or two in longitude changes it far more often " +
              "than it changes the sign — the same three longitudes, read through a finer division."
            : "A sign is wide, so the three usually agree; where they differ, the graha is near a sign boundary in at least " +
              "one of them, and each engine counts from its own sidereal zero.");
      return render(["Graha", "modern", "fitted", "as written", "agreement"], rows, false);
    }

    if (ST.q === "retro") {
      var dmod = function (sa) {
        var f = modLon(sa), a = f(ms - 12 * HOUR), c = f(ms + 12 * HOUR);
        return (a == null || c == null) ? null : sdiff(c, a);
      };
      var dss = function (k, sa) { return withTier(k, function () { return S.trueDailyMotion(sa, ssAhar(ms)); }); };
      var nSame = 0;
      rows = SA7.filter(function (sa) { return sa !== "Sūrya" && sa !== "Candra"; }).map(function (sa) {
        var m = dmod(sa), f = dss("fit", sa), b = dss("bare", sa);
        var w = function (v) { return v == null ? "—" : (v < 0 ? "vakrī (retrograde)" : "direct") + " · " + v.toFixed(3) + "°/day"; };
        if (m != null && f != null && b != null && (m < 0) === (f < 0) && (m < 0) === (b < 0)) nSame++;
        return { k: sa, cells: [w(m), w(f), w(b)] };
      });
      verdict = "The Sun and the Moon never turn back, so the question is asked of the five star-planets. <b>" + nSame +
        " of 5</b> are given the same direction by all three. The modern figure is the change of longitude across the day; " +
        "the siddhāntic figures are each engine's own true daily motion. Near a station — where the motion passes through " +
        "zero — the engines can name different directions.";
      return render(["Graha", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "yoga" || ST.q === "karana") {
      var isY = ST.q === "yoga";
      var mp2 = A.mod.panch && A.mod.panch.at ? (isY ? A.mod.panch.at.yoga : A.mod.panch.at.karana) : null;
      var fp = A.fit.panch ? (isY ? A.fit.panch.yoga : A.fit.panch.karana) : null;
      var bp = A.bare.panch ? (isY ? A.bare.panch.yoga : A.bare.panch.karana) : null;
      rows = [{ k: isY ? "Yoga" : "Karaṇa", cells: [mp2 ? mp2.name : "—", fp ? fp.name : "—", bp ? bp.name : "—"] }];
      verdict = (isY
        ? "A yoga is named from the <b>sum</b> of the Sun's and the Moon's longitudes, in 27 parts of 13°20′. Unlike the " +
          "tithi it does not cancel the sidereal zero — it counts it twice — so each engine's own ayanāṃśa matters here twice over."
        : "A karaṇa is half a tithi — 6° of the Moon's elongation from the Sun — so, like the tithi, it is free of the " +
          "sidereal zero; being twice as fine, a small difference in either luminary changes it twice as often.") +
        " The modern almanac names the limb running at local sunrise, as a pañcāṅga does; the siddhāntic engines name it at their own sunrise.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "sunrise") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: sunrise depends on where you are.</p>'; return; }
      var md2 = null; try { md2 = window.NP.day(ms, ST.place); } catch (e) {}
      var sr = function (k) { return withTier(k, function () { return S.sunriseSunset(ms, ST.place); }); };
      var fs = sr("fit"), bs = sr("bare");
      rows = [{ k: "Sunrise", cells: [clock(md2 && md2.sunrise), clock(fs && fs.sunrise), clock(bs && bs.sunrise),
                                       minutesApart(fs && fs.sunrise, md2 && md2.sunrise), minutesApart(bs && bs.sunrise, md2 && md2.sunrise)] },
              { k: "Sunset", cells: [clock(md2 && md2.sunset), clock(fs && fs.sunset), clock(bs && bs.sunset),
                                      minutesApart(fs && fs.sunset, md2 && md2.sunset), minutesApart(bs && bs.sunset, md2 && md2.sunset)] }];
      verdict = "Times are local to " + esc(ST.place.n || "the chosen place") + ". The modern almanac takes the upper limb of " +
        "the Sun with refraction, as printed almanacs do; the Sūrya Siddhānta finds sunrise from the Sun's declination and the " +
        "day-length its latitude gives, through its own equation of time, without refraction — so a few minutes between them " +
        "comes from the two definitions as much as from the two Suns.";
      return render(["Question", "modern", "fitted", "as written", "fitted − modern", "written − modern"], rows, false);
    }

    if (ST.q === "lagna") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: the lagna depends on where you are.</p>'; return; }
      var d0 = new Date(ms + tzOf() * HOUR), ml = null;
      try { ml = window.__kAsc({ year: d0.getUTCFullYear(), month: d0.getUTCMonth() + 1, day: d0.getUTCDate(),
                                 hour: d0.getUTCHours(), minute: d0.getUTCMinutes() + d0.getUTCSeconds() / 60,
                                 tzHours: tzOf(), lat: ST.place.lat, lon: ST.place.lon }); } catch (e) {}
      var sl = function (k) { return withTier(k, function () { var L = S.lagna(ms, ST.place); return L ? L.lon : null; }); };
      var fl = sl("fit"), bl = sl("bare");
      rows = [{ k: "Lagna", cells: [ml == null ? "—" : dm(ml), fl == null ? "—" : dm(fl), bl == null ? "—" : dm(bl)] }];
      var sameSign = ml != null && fl != null && bl != null &&
        Math.floor(ml / 30) === Math.floor(fl / 30) && Math.floor(ml / 30) === Math.floor(bl / 30);
      verdict = (sameSign ? "<b>All three put the same sign rising.</b> " : "<b>The rising sign differs between them.</b> ") +
        "The modern lagna is where the horizon cuts the ecliptic, from sidereal time; the Sūrya Siddhānta walks forward from " +
        "sunrise through its table of the signs' rising times. The lagna moves about a degree every four minutes, so a few " +
        "minutes' difference in sunrise is about a degree here. Each is shown in its own sidereal frame.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "sankranti") {
      var sgn = function (lonF) { return function (t) { var L = lonF(t); return L == null ? null : Math.floor(norm(L) / 30); }; };
      var mS = nextChange(sgn(modLonL("Sūrya")), ms, DAYMS, 40 * DAYMS);
      var sS = function (k) { return withTier(k, function () { return nextChange(sgn(ssLon("Sūrya")), ms, DAYMS, 40 * DAYMS); }); };
      var fS = sS("fit"), bS = sS("bare");
      var cell = function (x) { return x ? RS[x.from] + " → " + RS[x.to] + ", " + stamp(x.at) : "—"; };
      rows = [{ k: "Next saṃkrānti", cells: [cell(mS), cell(fS), cell(bS)] },
              { k: "Difference from modern", cells: ["", minutesApart(fS && fS.at, mS && mS.at), minutesApart(bS && bS.at, mS && mS.at)] }];
      verdict = "A saṃkrānti is the moment the Sun enters the next sidereal sign — the start of a solar month. The Sun moves " +
        "about a degree a day, so each degree of difference in its longitude, or in the sidereal zero, moves the saṃkrānti by " +
        "about a day. " + frameNote() + "Times are local.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "syzygy") {
      var mod0 = null, mod180 = null;
      try { mod0 = window.Astronomy.SearchMoonPhase(0, new Date(ms), 40).date.getTime(); } catch (e) {}
      try { mod180 = window.Astronomy.SearchMoonPhase(180, new Date(ms), 40).date.getTime(); } catch (e) {}
      var sy = function (k, want) { return withTier(k, function () {
        var sun = ssLon("Sūrya"), moon = ssLon("Candra");
        return nextElong(function (t) { return norm(moon(t) - sun(t)); }, ms, want); }); };
      var f0 = sy("fit", 0), b0 = sy("bare", 0), f180 = sy("fit", 180), b180 = sy("bare", 180);
      rows = [{ k: "Next amāvāsyā (new moon)", cells: [stamp(mod0), stamp(f0), stamp(b0), minutesApart(f0, mod0), minutesApart(b0, mod0)] },
              { k: "Next pūrṇimā (full moon)", cells: [stamp(mod180), stamp(f180), stamp(b180), minutesApart(f180, mod180), minutesApart(b180, mod180)] }];
      verdict = "New and full moon are the instants the Moon's elongation from the Sun reaches 0° and 180°. Like the tithi " +
        "they are free of the sidereal zero. The Moon gains on the Sun about 12° a day, so each degree of difference between " +
        "two engines' elongations is about two hours on the clock. Times are local.";
      return render(["Question", "modern", "fitted", "as written", "fitted − modern", "written − modern"], rows, false);
    }

    if (ST.q === "eclipse") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: a solar eclipse is judged for where you are.</p>'; return; }
      var mL = null, mSo = null;
      try { var le = window.Astronomy.SearchLunarEclipse(new Date(ms)); mL = { at: le.peak.date.getTime(), kind: le.kind }; } catch (e) {}
      try {
        var ob = new window.Astronomy.Observer(ST.place.lat, ST.place.lon, 0);
        var se = window.Astronomy.SearchLocalSolarEclipse(new Date(ms), ob);
        mSo = { at: se.peak.time.date.getTime(), kind: se.kind };
      } catch (e) {}
      var ec = function (k) { return withTier(k, function () {
        var L = null, So = null, list = [];
        try { list = S.eclipsesIn(ms, ms + 4 * 365.25 * DAYMS, ST.place) || []; } catch (e) {}
        list.forEach(function (q) { if (q.kind === "lunar" && !L) L = q.e; if (q.kind === "solar" && !So) So = q.e; });
        return { L: L, So: So }; }); };
      var fE = ec("fit"), bE = ec("bare");
      var w2 = function (e) {
        return e ? stamp(e.at) + (e.kind ? " · " + e.kind : (e.magnitude != null ? " · magnitude " + e.magnitude.toFixed(2) : ""))
                 : "none in the next 4 years";
      };
      rows = [{ k: "Next lunar eclipse", cells: [w2(mL), w2(fE.L), w2(bE.L)] },
              { k: "Next solar eclipse seen here", cells: [w2(mSo), w2(fE.So), w2(bE.So)] }];
      verdict = "Each engine searches forward from the chosen moment. An eclipse needs the Moon near its node at a new or full " +
        "moon, so the result depends on where each engine places the node as well as on the two luminaries; the siddhāntic " +
        "search uses the text's own eclipse rules, including its simplified parallax for a solar eclipse at your place. Where " +
        "one engine finds an eclipse another does not, both answers are shown as found. The siddhāntic search looks four years ahead.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    /* vāra */
    var fv = A.fit.panch ? A.fit.panch.vara : null;
    var utc = new Date(ms).getUTCDay();
    rows = [{ k: "Vāra", cells: [DAYS[utc], fv ? fv.english : "—",
                                 fv ? fv.english : "—"] }];
    verdict = "The weekday is the one limb that carries <b>no position at " +
      "all</b>: it is the ahargaṇa — the count of days since the epoch — " +
      "modulo seven. So the siddhānta and a modern calendar agree on it " +
      "always, and will go on agreeing however far the longitudes drift. " +
      "Both siddhāntic columns are identical here for the same reason: " +
      "correcting the constants cannot change a day count.";
    return render(["Question", "modern", "fitted", "as written"], rows, false);

    function render(heads, rows, gaps) {
      host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        heads.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
        "</tr></thead><tbody>" + rows.map(function (r) {
          return "<tr><td>" + esc(r.k) + "</td>" +
            r.cells.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") +
            (gaps && r.gap
              ? r.gap.map(function (g) {
                  return '<td class="num">' + esc(g) + "</td>"; }).join("")
              : "") + "</tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="elwho">' + TIERS.map(function (t) {
          return "<span><b>" + esc(t.label) + "</b> — " + esc(t.note) + "</span>";
        }).join("") + "</p>";
      var v = $("el-verdict");
      if (v) v.innerHTML = verdict;
    }
  }

  /* ---- the agreement rate over a span ------------------------------------ */
  function rates() {
    var host = $("el-rates");
    if (!host) return;
    var from = +$("el-from").value, to = +$("el-to").value, N = +$("el-n").value;
    if (!(to > from)) return;
    var hit = { nak: 0, nakFit: 0, tithi: 0, tithiNear: 0, vara: 0, yoga: 0, karana: 0, sunSign: 0, n: 0 };
    var gap = { fit: [], bare: [] };
    for (var i = 0; i < N; i++) {
      /* spread across the span AND across the year, so neither the drift nor
         the annual term is aliased away */
      var frac = i / Math.max(1, N - 1);
      var ms = Date.UTC(Math.round(from + (to - from) * frac), 0, 1) +
               ((i * 137) % 365) * 86400000 + 6 * 3600000;
      var m = modAt(ms), f = ssAt("fit", ms), b = ssAt("bare", ms);
      if (!m.panch || !f.panch || !b.panch) continue;
      hit.n++;
      var mn = m.panch.at && m.panch.at.nak ? m.panch.at.nak.name : null;
      if (mn && b.panch.nakshatra.name === mn) hit.nak++;
      if (mn && f.panch.nakshatra.name === mn) hit.nakFit++;
      var mt = modTithi(m.panch);
      if (mt != null) {
        var d = Math.abs(b.panch.tithi.n - mt);
        if (d === 0) hit.tithi++;
        if (d <= 1 || d >= 29) hit.tithiNear++;
      }
      if (b.panch.vara.i === new Date(ms).getUTCDay()) hit.vara++;
      if (m.panch.at && m.panch.at.yoga && b.panch.yoga && m.panch.at.yoga.name === b.panch.yoga.name) hit.yoga++;
      if (m.panch.at && m.panch.at.karana && b.panch.karana && m.panch.at.karana.name === b.panch.karana.name) hit.karana++;
      if (m.lon["Sūrya"] != null && b.lon["Sūrya"] != null &&
          Math.floor(norm(m.lon["Sūrya"]) / 30) === Math.floor(norm(b.lon["Sūrya"]) / 30)) hit.sunSign++;
      if (m.lahiri["Candra"] != null) {
        gap.fit.push(Math.abs(sdiff(f.lon["Candra"], m.lahiri["Candra"])) * 60);
        gap.bare.push(Math.abs(sdiff(b.lon["Candra"], m.lahiri["Candra"])) * 60);
      }
    }
    if (!hit.n) { host.innerHTML = ""; return; }
    var pc = function (k) { return (hit[k] / hit.n * 100).toFixed(0) + "%"; };
    var rms = function (a) {
      return a.length
        ? Math.sqrt(a.reduce(function (s, x) { return s + x * x; }, 0) / a.length)
        : null;
    };
    var ROWS = [
      ["the vāra", pc("vara"), "the ahargaṇa modulo seven — no position in it at all"],
      ["the nakṣatra, bare text", pc("nak"),
       "counted from a sidereal zero, so this includes the frame difference"],
      ["the nakṣatra, fitted tier", pc("nakFit"),
       "the fit put its longitudes in the site's own frame, so this is cleaner"],
      ["the tithi, exactly", pc("tithi"),
       "frame-free, and the hardest of the five to get right"],
      ["the tithi, within one", pc("tithiNear"),
       "a difference of one tithi either way"],
      ["the karaṇa, bare text", pc("karana"),
       "half a tithi — frame-free like the tithi, and twice as fine"],
      ["the yoga, bare text", pc("yoga"),
       "the SUM of the two longitudes, so each engine's sidereal zero counts twice"],
      ["the Sun's rāśi, bare text", pc("sunSign"),
       "a 30° division of the Sun alone — the solar month"]
    ];
    host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      "<th>Agrees with the modern engine on…</th><th>rate</th><th></th>" +
      "<th>why</th></tr></thead><tbody>" + ROWS.map(function (r) {
        var v = parseFloat(r[1]);
        return "<tr><td>" + esc(r[0]) + '</td><td class="num"><b>' + esc(r[1]) +
          '</b></td><td class="ssbarcell"><span class="ssbar' +
          (v >= 95 ? " good" : "") + '"><i style="width:' + v.toFixed(0) +
          '%"></i></span></td><td class="elwhy">' + esc(r[2]) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var note = $("el-ratenote");
    if (note) {
      note.innerHTML = hit.n + " moments sampled between " + from + " and " + to +
        ". Over the same sample the Moon's own longitude is out by <b>" +
        rms(gap.bare).toFixed(0) + "′</b> in the bare text and <b>" +
        rms(gap.fit).toFixed(0) + "′</b> in the fitted tier. Adjusting constants brings the Sun about " +
        "forty times closer to the modern figure but barely moves the Moon, " +
        "because the two lunar terms the modern theory contains are absent " +
        "from this one — which is why the tithi rate hardly moves either.";
    }
  }

  /* ---- what each engine's REAL error is, and what it changes ---------------
     Every figure from the two measured files: modern from accuracy.json
     (against ERFA, 1800–2200, in arcseconds), fitted and as-written from
     siddhanta-measured.json's residuals (arcminutes; the fitted ones are the
     HOLDOUT, moments the optimiser never saw). Each error is then turned into
     time with the body's mean geocentric motion — how much earlier or later a
     sign or nakṣatra change, a tithi's end or a daśā start would be dated. */
  var MEANMOT = { "Sūrya": 0.98565, "Candra": 13.17640, "Maṅgala": 0.52403,
                  "Budha": 0.98565, "Guru": 0.08309, "Śukra": 0.98565, "Śani": 0.03346,
                  /* the mean node, moving backwards; the rate is what matters here */
                  "Rāhu": 0.05295 };
  function span(days) {
    var d = Math.abs(days);
    if (d * 1440 < 1) return "under a minute";
    if (d < 1 / 24) return Math.round(d * 1440) + " min";
    if (d < 1.5) return (d * 24).toFixed(d * 24 < 10 ? 1 : 0) + " h";
    if (d < 60) return d.toFixed(d < 10 ? 1 : 0) + " days";
    if (d < 730) return (d / 30.44).toFixed(1) + " months";
    return (d / 365.25).toFixed(1) + " years";
  }
  function errors() {
    var host = $("el-errtab"); if (!host || !AC || !FIT) return;
    var M = {};
    (AC.modern.perBody || []).forEach(function (b) { M[b.sa] = b; });
    var R = FIT.residuals || {};
    function rowErr(sa) {
      var m = M[sa], r = R[sa] || {};
      return {
        mod: m ? { t: m.lonRms, w: m.lonWorst } : null,                         /* arcsec */
        fit: r.holdout ? { t: r.holdout.rms * 60, w: r.holdout.worst * 60 } : null,
        bare: r.bare ? { t: r.bare.rms * 60, w: r.bare.worst * 60 } : null
      };
    }
    function cell(e) { return e ? ang(e.t) + ' <span class="elw">(worst ' + ang(e.w) + ")</span>" : "—"; }
    var h = '<div class="eltblwrap"><table class="tbl elerr"><thead><tr><th>Graha</th>' +
      "<th>modern<br><small>typical (worst)</small></th><th>fitted<br><small>typical (worst)</small></th>" +
      "<th>as written<br><small>typical (worst)</small></th></tr></thead><tbody>";
    SA7.forEach(function (sa) {
      var e = rowErr(sa);
      h += "<tr><td><b>" + sa + "</b> <small>" + EN[sa] + "</small></td><td>" + cell(e.mod) +
        "</td><td>" + cell(e.fit) + "</td><td>" + cell(e.bare) + "</td></tr>";
    });
    /* THE NODE. Rāhu and Ketu are fitted too (Ketu is Rāhu + 180°, so one row
       serves both). The modern column has no error to show: the modern MEAN
       node is the published polynomial the other two are measured against, so
       it is the reference itself rather than a measurement of the sky. */
    if (R["Rāhu"]) {
      var en = rowErr("Rāhu");
      h += "<tr><td><b>Rāhu · Ketu</b> <small>mean node</small></td>" +
        '<td><span class="elw">the reference</span></td><td>' + cell(en.fit) + "</td><td>" + cell(en.bare) + "</td></tr>";
    }
    h += "</tbody></table></div>";

    h += '<h4 class="elh4">What the typical error changes</h4>' +
      '<div class="eltblwrap"><table class="tbl elerr"><thead><tr><th>Graha</th>' +
      "<th>modern</th><th>fitted</th><th>as written</th></tr></thead><tbody>" +
      '<tr><td colspan="4" class="elsub">The date a graha changes sign, nakṣatra or pāda moves by about…</td></tr>';
    SA7.forEach(function (sa) {
      var e = rowErr(sa), mm = MEANMOT[sa];
      function t(x) { return x ? span(x.t / 3600 / mm) : "—"; }
      h += "<tr><td><b>" + sa + "</b></td><td>" + t(e.mod) + "</td><td>" + t(e.fit) + "</td><td>" + t(e.bare) + "</td></tr>";
    });
    if (R["Rāhu"]) {
      var en2 = rowErr("Rāhu"), mn = MEANMOT["Rāhu"];
      function tn(x) { return x ? span(x.t / 3600 / mn) : "—"; }
      h += "<tr><td><b>Rāhu · Ketu</b></td><td>—</td><td>" + tn(en2.fit) + "</td><td>" + tn(en2.bare) + "</td></tr>";
    }
    /* the Moon carries the pañcāṅga and the daśā clock */
    var em = rowErr("Candra"), es = rowErr("Sūrya");
    var rate = (AC.cost && AC.cost.dashaDaysPerArcsec) || 0.101;
    function tith(k) {
      var a = em[k], b = es[k]; if (!a || !b) return "—";
      var as = Math.sqrt(a.t * a.t + b.t * b.t);        /* the two errors, independent */
      return span(as / 3600 / 12.19);
    }
    function dasha(k) { var a = em[k]; return a ? span(a.t * rate) : "—"; }
    function pada(k) { var a = em[k]; if (!a) return "—"; var v = 100 * a.t / 12000;
      return (v < 1 ? "under 1%" : Math.round(v) + "%") + " of a pāda"; }
    h += '<tr><td colspan="4" class="elsub">Through the Moon:</td></tr>' +
      "<tr><td>A tithi’s end</td><td>" + tith("mod") + "</td><td>" + tith("fit") + "</td><td>" + tith("bare") + "</td></tr>" +
      "<tr><td>The Moon’s place, as a share of one pāda (3°20′)</td><td>" + pada("mod") + "</td><td>" + pada("fit") + "</td><td>" + pada("bare") + "</td></tr>" +
      "<tr><td>Every Viṃśottarī daśā date</td><td>" + dasha("mod") + "</td><td>" + dasha("fit") + "</td><td>" + dasha("bare") + "</td></tr>" +
      "</tbody></table></div>";
    host.innerHTML = h;
    var n = $("el-errnote");
    if (n) n.innerHTML = "How to read it: an engine whose typical error moves a date by minutes agrees with the sky " +
      "for every practical purpose; one that moves a daśā date by months or years gives a <b>different chart timeline</b>, " +
      "even though the method is the same. The daśā row uses the average rate of " + rate.toFixed(3) +
      " days of daśā per arcsecond of the Moon (it varies by lord). A minute of birth-time uncertainty already moves the " +
      "Moon about " + ang((AC.cost && AC.cost.birthMinuteArcsec) || 33) + " — more than the modern engine’s whole error. " +
      "For comparison, two ayanāṃśa conventions can differ by degrees; that is a choice, not an engine error, and it moves " +
      "signs and nakṣatras but never a tithi.";
  }

  /* ---- the cost converter ------------------------------------------------- */
  function cost() {
    var host = $("el-cost");
    if (!host) return;
    var as = ST.arc;                                /* arcseconds */
    var C = AC.cost, D = AC.divisions;
    var read = $("el-arcread");
    if (read) read.textContent = ang(as) + " of longitude";

    var cells = [];
    /* as a fraction of each division it could move */
    D.forEach(function (d) {
      var frac = d.arcsec / as;
      cells.push(["1 ⁄ " + (frac >= 10 ? Math.round(frac).toLocaleString("en")
                                       : frac.toFixed(1)),
                  "of a " + d.name + " (" + degMin(d.deg) + ")"]);
    });
    /* as time, through the rates the harness measured */
    var nakSec = as / 14.79 * C.nakshatraBoundarySeconds;
    var tithiSec = as / 14.79 * C.tithiEndSeconds;
    cells.push([plural(nakSec, "second", "seconds"),
                "on a nakṣatra or pāda boundary, at the Moon's rate"]);
    cells.push([plural(tithiSec, "second", "seconds"),
                "on a tithi, yoga or karaṇa ending"]);
    /* And as daśā, which is the steep one. THE RATE IS LORD-SPECIFIC:
       C.dashaDaysPerArcsec is the CYCLE AVERAGE and must be labelled as such,
       because traversing one nakṣatra traverses that nakṣatra lord's own
       mahādaśā — the Sun's six years up to Venus's twenty — not all 120. */
    var fmtD = function (d) {
      return d >= 730 ? (d / 365.2425).toFixed(1) + " years"
                      : plural(d, "day", "days");
    };
    cells.push([fmtD(as * C.dashaDaysPerArcsecMin) + " – " +
                fmtD(as * C.dashaDaysPerArcsecMax),
                "of Viṃśottarī mahādaśā, at " + C.dashaDaysPerArcsecMin + "–" +
                C.dashaDaysPerArcsecMax + " days per arcsecond depending on the " +
                "nakṣatra lord (" + C.dashaDaysPerArcsec + " on the cycle average)"]);
    cells.push([plural(as / C.birthMinuteArcsec * 60, "second", "seconds"),
                "of birth time — the error this is equivalent to"]);

    host.innerHTML = '<div class="axgrid elcost">' + cells.map(function (c) {
      return '<div class="axcell"><b>' + esc(c[0]) + "</b><span>" + esc(c[1]) +
        "</span></div>";
    }).join("") + "</div>";
  }

  /* where each engine and each body actually sits on that slider */
  function marks() {
    var host = $("el-marks");
    if (!host) return;
    var pts = [];
    AC.modern.perBody.forEach(function (b) {
      pts.push({ at: b.lonWorst, lab: b.sa, cls: "mod" });
    });
    AC.siddhanta.measured.forEach(function (m) {
      pts.push({ at: m.measuredRms * 60, lab: m.sa, cls: "fit" });
    });
    var W = 760, H = 112, L = 14, R = 14, T = 30;
    var lo = -1, hi = 4.3;                       /* log10 arcseconds */
    var sx = function (as) {
      var l = Math.log10(Math.max(0.1, as));
      return L + (W - L - R) * (l - lo) / (hi - lo);
    };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="Where each engine\'s measured error falls on the slider ' +
      'above"><title>The measured residuals</title>';
    o += '<line x1="' + L + '" y1="' + T + '" x2="' + (W - R) + '" y2="' + T +
         '" class="el-axis"/>';
    [0.1, 1, 10, 60, 600, 3600, 18000].forEach(function (v) {
      o += '<line x1="' + sx(v).toFixed(1) + '" y1="' + (T - 5) + '" x2="' +
           sx(v).toFixed(1) + '" y2="' + (T + 5) + '" class="el-tick"/>' +
           '<text x="' + sx(v).toFixed(1) + '" y="' + (T - 10) +
           '" class="el-ticklab">' + ang(v) + "</text>";
    });
    /* lanes, so overlapping labels do not pile up */
    ["mod", "fit"].forEach(function (cls, lane) {
      var y = T + 24 + lane * 34;
      var mine = pts.filter(function (p) { return p.cls === cls; })
                    .sort(function (a, b) { return a.at - b.at; });
      var lastX = -99, sub = 0;
      mine.forEach(function (p) {
        var x = sx(p.at);
        sub = (x - lastX < 34) ? (sub + 1) % 2 : 0;
        lastX = x;
        o += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4.5" class="el-pt ' +
             cls + '"><title>' + esc(p.lab) + " · " + ang(p.at) + "</title></circle>";
        o += '<text x="' + x.toFixed(1) + '" y="' + (y + 15 + sub * 11) +
             '" class="el-ptlab">' + esc(p.lab) + "</text>";
      });
      o += '<text x="' + L + '" y="' + (y + 4) + '" class="el-lane ' + cls + '">' +
           (cls === "mod" ? "modern" : "fitted") + "</text>";
    });
    o += '<line x1="' + sx(ST.arc).toFixed(1) + '" y1="' + (T - 6) + '" x2="' +
         sx(ST.arc).toFixed(1) + '" y2="' + (H - 2) + '" class="el-cursor"/>';
    o += "</svg>";
    host.innerHTML = o;
  }

  /* ---- the ruler: engines against conventions ----------------------------- */
  function ruler() {
    var host = $("el-ruler");
    if (!host) return;
    var ENG = [], CONV = [], DIVS = [];
    AC.modern.perBody.forEach(function (b) {
      ENG.push({ at: b.lonWorst, lab: b.sa + ", modern", k: "mod" });
    });
    ENG.push({ at: AC.modern.gastWorst, lab: "sidereal time", k: "mod" });
    var worstLagna = AC.modern.lagna.reduce(function (a, l) {
      return l.endToEndWorst > a.endToEndWorst ? l : a; }, AC.modern.lagna[0]);
    ENG.push({ at: worstLagna.endToEndWorst,
               lab: "lagna at " + worstLagna.place, k: "mod" });
    AC.siddhanta.measured.forEach(function (m) {
      ENG.push({ at: m.measuredRms * 60, lab: m.sa + ", fitted", k: "fit" });
      ENG.push({ at: m.bareRms * 60, lab: m.sa + ", as written", k: "bare" });
    });
    CONV.push({ at: AC.ayanamsa.spreadDeg * 3600,
                lab: "the spread across all " + AC.ayanamsa.modes.length +
                     " ayanāṃśas", k: "conv" });
    CONV.push({ at: AC.ayanamsa.anchorGapDeg * 3600,
                lab: "Citrā at 180° against Revatī at 359°50′", k: "conv" });
    CONV.push({ at: 49.2 * 60, lab: "polar vs ecliptic longitude, Spica",
                k: "conv" });
    AC.divisions.forEach(function (d) {
      DIVS.push({ at: d.arcsec, lab: d.name });
    });

    var W = 760, lo = 0, hi = 4.5, L = 150, R = 20, T = 34;
    var lanes = [{ k: "divs", y: T, label: "the divisions a chart is read in" },
                 { k: "mod", y: T + 58, label: "the modern engine" },
                 { k: "fit", y: T + 102, label: "siddhānta, fitted" },
                 { k: "bare", y: T + 146, label: "siddhānta, as written" },
                 { k: "conv", y: T + 200, label: "conventions — not errors" }];
    var H = T + 250;
    var sx = function (as) {
      return L + (W - L - R) * (Math.log10(Math.max(1, as)) - lo) / (hi - lo);
    };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="Every measured engine error and every convention on one ' +
      'logarithmic scale from an arcsecond to ten degrees"><title>One ruler' +
      "</title>";
    /* the decade grid, drawn behind everything so the lanes can be compared */
    [1, 10, 60, 600, 3600, 18000, 36000].forEach(function (v) {
      o += '<line x1="' + sx(v).toFixed(1) + '" y1="' + (T - 14) + '" x2="' +
           sx(v).toFixed(1) + '" y2="' + (H - 16) + '" class="el-vgrid"/>' +
           '<text x="' + sx(v).toFixed(1) + '" y="' + (H - 4) +
           '" class="el-ticklab">' + ang(v) + "</text>";
    });
    lanes.forEach(function (ln) {
      o += '<text x="' + (L - 10) + '" y="' + (ln.y + 4) + '" class="el-lanelab ' +
           ln.k + '">' + esc(ln.label) + "</text>";
      var set = ln.k === "divs" ? DIVS
        : (ln.k === "conv" ? CONV : ENG.filter(function (e) { return e.k === ln.k; }));
      var last = -99, sub = 0;
      set.sort(function (a, b) { return a.at - b.at; }).forEach(function (p) {
        var x = sx(p.at);
        sub = (x - last < 70) ? (sub + 1) % 2 : 0;
        last = x;
        if (ln.k === "divs") {
          o += '<line x1="' + x.toFixed(1) + '" y1="' + (ln.y - 9) + '" x2="' +
               x.toFixed(1) + '" y2="' + (ln.y + 9) + '" class="el-div"/>';
        } else {
          o += '<circle cx="' + x.toFixed(1) + '" cy="' + ln.y + '" r="5" ' +
               'class="el-pt ' + ln.k + '"><title>' + esc(p.lab) + " · " +
               ang(p.at) + "</title></circle>";
        }
        o += '<text x="' + x.toFixed(1) + '" y="' +
             (ln.y + (ln.k === "divs" ? -13 : 17) + sub * 11) +
             '" class="el-ptlab ' + ln.k + '">' + esc(p.lab) + "</text>";
      });
    });
    o += "</svg>";
    host.innerHTML = o;

    var note = $("el-rulernote");
    if (note) {
      /* THE COMPARISON HAS TO BE THE RIGHT ONE. The first version of this note
         took the worst mark on any lane but the bare text's, which put Budha's
         fitted 107′ at the top and reported the conventions as "3 times
         larger" — a weak claim, and resting on a tier the page itself says is
         not for casting. The engine everything here is actually computed with
         is the modern one, so that is what a convention has to be set against. */
      var modWorst = ENG.filter(function (e) { return e.k === "mod"; })
        .reduce(function (a, e) { return e.at > a.at ? e : a; });
      var modMax = modWorst.at;
      var convMax = Math.max.apply(null, CONV.map(function (c) { return c.at; }));
      var fitMax = Math.max.apply(null, ENG.filter(function (e) {
        return e.k === "fit"; }).map(function (e) { return e.at; }));
      var d60 = AC.divisions[AC.divisions.length - 1];
      note.innerHTML = "The engine every chart on this site is cast with sits " +
        "entirely to the left: its worst mark of all is " + ang(modMax) +
        " — the " + esc(modWorst.lab) + ", where a shallow angle between the " +
        "ecliptic and the horizon amplifies everything behind it — against a " +
        "narrowest division of " + degMin(d60.deg) + ". So even there, " +
        "nothing it computes is within <b>" +
        Math.round(d60.arcsec / modMax) + " times</b> of changing a reading. " +
        "The widest gap between two defensible <b>conventions</b> is " +
        ang(convMax) + ", which is <b>" + Math.round(convMax / modMax) +
        " times larger</b> than that worst mark and is not an error in " +
        "anything. The two siddhāntic lanes are a different matter and are " +
        "not offered for casting: the fitted tier still reaches " +
        ang(fitMax) + " on its worst body, which is past several of the " +
        "divisions on the top lane.";
    }
  }

  /* ---- the certified band ------------------------------------------------- */
  function band() {
    var host = $("el-band");
    if (!host) return;
    var B = AC.bands, curve = AC.moonCurve;
    var W = 760, H = 230, L = 52, R = 16, T = 18, Bm = 34;
    var y0 = 1000, y1 = 3000;
    var hiV = Math.max.apply(null, curve.map(function (p) { return p.d; })) * 1.1;
    var sx = function (y) { return L + (W - L - R) * (y - y0) / (y1 - y0); };
    var sy = function (v) { return T + (H - T - Bm) * (1 - v / hiV); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="The modern engine\'s disagreement with an independent sky, ' +
      'by year, with the certified band marked"><title>The bands</title>';
    B.forEach(function (b) {
      o += '<rect x="' + sx(b.from).toFixed(1) + '" y="' + T + '" width="' +
           (sx(b.to) - sx(b.from)).toFixed(1) + '" height="' + (H - T - Bm) +
           '" class="el-band' + (b.certified ? " cert" : "") + '"><title>' +
           b.from + "–" + b.to + " · Moon " + b.moon + "″</title></rect>";
      o += '<text x="' + ((sx(b.from) + sx(b.to)) / 2).toFixed(1) + '" y="' +
           (T + 14) + '" class="el-bandlab' + (b.certified ? " cert" : "") +
           '">' + b.moon + "″</text>";
    });
    o += '<path d="' + curve.map(function (p, i) {
      return (i ? "L" : "M") + sx(p.y).toFixed(1) + " " + sy(p.d).toFixed(1);
    }).join(" ") + '" class="el-curve"/>';
    [0, hiV / 2, hiV].forEach(function (v) {
      o += '<text x="' + (L - 7) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="el-ax">' + v.toFixed(0) + "″</text>";
    });
    [1000, 1500, 2000, 2500, 3000].forEach(function (y) {
      o += '<text x="' + sx(y).toFixed(1) + '" y="' + (H - Bm + 16) +
           '" class="el-ticklab">' + y + "</text>";
    });
    o += '<line x1="' + sx(ST.year).toFixed(1) + '" y1="' + T + '" x2="' +
         sx(ST.year).toFixed(1) + '" y2="' + (H - Bm) + '" class="el-cursor"/>';
    o += "</svg>";
    host.innerHTML = o;

    var here = B.filter(function (b) {
      return ST.year >= b.from && ST.year <= b.to; })[0];
    var read = $("el-yearread");
    if (read) read.textContent = ST.year;
    var note = $("el-bandnote");
    if (note && here) {
      var qname = { lon: "the grahas' longitudes", nak: "the Moon's nakṣatra",
                    tithi: "the tithi", dasha: "the opening daśā",
                    vara: "the vāra", rashi: "each graha's rāśi", d9: "each graha's navāṃśa",
                    retro: "which grahas are retrograde", yoga: "the yoga", karana: "the karaṇa",
                    sunrise: "sunrise and sunset", lagna: "the lagna", sankranti: "the next saṃkrānti",
                    syzygy: "the next new and full moon", eclipse: "the next eclipses" }[ST.q] || "this question";
      /* Cycle average; the per-lord span is given alongside, since one
         nakṣatra is one lord's mahādaśā and not the whole 120 years. */
      var dd = here.moon * AC.cost.dashaDaysPerArcsec;
      var ddLo = here.moon * AC.cost.dashaDaysPerArcsecMin;
      var ddHi = here.moon * AC.cost.dashaDaysPerArcsecMax;
      note.innerHTML = "<b>" + here.from + "–" + here.to + "</b> — " +
        (here.certified
          ? "the certified window. The Moon is within <b>" + here.moon +
            "″</b> of an independent computation here, a tithi ending within <b>" +
            here.tithi + " seconds</b>."
          : "outside the certified window. The Moon <i>disagrees</i> with the " +
            "reference by <b>" + here.moon + "″</b> — and disagreement is the " +
            "right word, because the reference's own lunar series degrades away " +
            "from the present too, so this figure bounds the error without " +
            "attributing it.") +
        " For the question you chose above — " + qname + " — that is worth " +
        (ST.q === "vara" ? "<b>nothing at all</b>: a weekday is a day count."
         : ST.q === "dasha"
           ? "about <b>" + (dd >= 365 ? (dd / 365.2425).toFixed(1) + " years"
                                      : dd.toFixed(1) + " days") +
             "</b> on a mahādaśā boundary on the cycle average, or <b>" +
             ddLo.toFixed(1) + "–" + ddHi.toFixed(1) + " days</b> depending on " +
             "which lord owns the Moon's nakṣatra."
         : (ST.q === "tithi" || ST.q === "karana" || ST.q === "yoga" || ST.q === "syzygy")
           ? "about <b>" + here.tithi + " seconds</b> on a tithi ending" + (ST.q === "tithi" ? "." : ", and the same order on this one.")
         : ST.q === "nak"
           ? "about <b>" + here.nak + " seconds</b> on a nakṣatra boundary, or " +
             "1 ⁄ " + Math.round(48000 / here.moon) + " of the nakṣatra itself."
           : "1 ⁄ " + Math.round(108000 / here.moon) + " of a rāśi.") +
        (ST.year < 1000 || ST.year > 3000
          ? " Outside 1000–3000 nothing is quoted at all, because no reference " +
            "exists in this project's build environment to quote against."
          : "");
    }
  }

  /* ---- the switchboard ---------------------------------------------------- */
  function which() {
    var host = $("el-which");
    if (!host) return;
    var mod = AC.modern.perBody;
    var moon = mod.filter(function (b) { return b.en === "Moon"; })[0];
    var sun = mod.filter(function (b) { return b.en === "Sun"; })[0];
    var sat = mod.filter(function (b) { return b.en === "Saturn"; })[0];
    var ssM = AC.siddhanta.measured;
    var byName = function (sa) {
      return ssM.filter(function (m) { return m.sa === sa; })[0]; };
    var ROWS = [
      ["Every ordinary page, and every chart cast here",
       "the modern ephemeris",
       "measured: Sun " + ang(sun.lonWorst) + ", Moon " + ang(moon.lonWorst) +
       ", Saturn bounded at " + ang(sat.lonWorst),
       "reference-verify, span-verify"],
      ["The lagna and the house cusps", "the modern ephemeris",
       "exact by construction; " +
       ang(AC.modern.lagna[0].endToEndWorst) + " end to end at ordinary " +
       "latitudes, more near the poles",
       "self-test, reference-verify"],
      ["Vargas, Aṣṭakavarga, Ṣaḍbala, the ārūḍhas",
       "exact arithmetic over a longitude",
       "adds no error of its own; inherits the longitude's",
       "self-test, engines-verify"],
      ["A classical reading's own numbers", "Sūrya Siddhānta as written",
       "degrees: Sun " + byName("Sūrya").bareRms.toFixed(0) + "′, Moon " +
       byName("Candra").bareRms.toFixed(0) + "′",
       "ss-verify"],
      ["The same method on measured constants", "the fitted tier",
       "Sun " + byName("Sūrya").measuredRms.toFixed(2) + "′, Moon " +
       byName("Candra").measuredRms.toFixed(0) + "′ — study only, not for casting",
       "siddhanta-measured-verify"],
      ["Which sidereal zero to measure from", "a convention, not an engine",
       "the " + AC.ayanamsa.modes.length + " modes span " +
       AC.ayanamsa.spreadDeg + "°, which no accuracy figure can narrow",
       "cosmos-verify"],
      ["When the Sun rises", "a convention, named on every card",
       "the definitions differ by minutes; not an error in either",
       "ss-verify"]
    ];
    host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      "<th>The question</th><th>what answers it</th><th>how well, and how known" +
      "</th><th>harness</th></tr></thead><tbody>" + ROWS.map(function (r) {
        return "<tr><td>" + esc(r[0]) + "</td><td><b>" + esc(r[1]) +
          "</b></td><td>" + esc(r[2]) + '</td><td class="elharness"><code>' +
          esc(r[3]) + "</code></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---- wiring ------------------------------------------------------------- */
  function syncWhen() {
    var e = $("el-when");
    if (!e) return;
    var d = new Date(ST.when + (ST.place ? ST.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  function bind() {
    try { AC = JSON.parse($("data-accuracy").textContent); } catch (e) { AC = null; }
    try { FIT = JSON.parse($("data-siddhanta-measured").textContent); }
    catch (e) { FIT = null; }
    S = window.SSEngine;
    if (!AC || !FIT || !FIT.lahiri || !S) {
      $("el-answer").innerHTML = '<p class="swfail">The measured data or the ' +
        "siddhāntic engine did not load, so this page has nothing to compare.</p>";
      return;
    }
    LAH = FIT.lahiri;
    S.setMeasured(FIT);
    ST.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
               { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    /* the slider opens where the Moon actually is, because that is the figure
       the rest of the project's sensitivity work is quoted from */
    var moon = AC.modern.perBody.filter(function (b) { return b.en === "Moon"; })[0];
    ST.arc = moon ? moon.lonWorst : 14.79;
    var sl = $("el-arc");
    if (sl) sl.value = Math.log10(ST.arc).toFixed(3);

    var ph = $("el-place");
    if (ph && window.NPlaces && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: ST.place,
        quick: [ST.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return ST.when; },
        onPick: function (p) { ST.place = p; syncWhen(); answer(); }
      });
    }
    syncWhen();

    /* the engine reads in this page's frame: Lahiri unless the reader picks
       another in "Ayanāṃśa for this page" */
    try { window.__setAyan(pageMode()); } catch (e) {}
    $("el-q").addEventListener("change", function () {
      ST.q = this.value; answer(); band(); });
    $("el-when").addEventListener("change", function () {
      var t = Date.parse(this.value);
      if (!isNaN(t)) { ST.when = t - (ST.place ? ST.place.tz : 0) * 3600000; answer(); }
    });
    $("el-arc").addEventListener("input", function () {
      ST.arc = Math.pow(10, +this.value); cost(); marks(); });
    $("el-year").addEventListener("input", function () {
      ST.year = +this.value; band(); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-el]") : null;
      if (!b) return;
      var k = b.getAttribute("data-el");
      if (k === "now") { ST.when = Date.now(); syncWhen(); answer(); }
      else if (k === "roll") {
        b.disabled = true;
        var was = b.textContent;
        b.textContent = "measuring…";
        setTimeout(function () {
          rates(); b.disabled = false; b.textContent = was;
        }, 20);
      }
    });

    answer(); cost(); marks(); errors(); ruler(); band(); which(); rates();

    try {
      window.__elab = {
        answerAt: function (ms, q) { ST.when = ms; ST.q = q; answer(); },
        ss: ssAt, mod: modAt, ac: function () { return AC; },
        setArc: function (a) { ST.arc = a; cost(); marks(); },
        setYear: function (y) { ST.year = y; band(); },
        state: function () { return { q: ST.q, arc: ST.arc, year: ST.year }; },
        place: function () { return ST.place; }
      };
    } catch (e) {}
  }

  need([
    { src: "engine.js", have: function () {
        return !!(window.__kEclipModern && window.__kVims); } },
    { src: "panchanga.js", have: function () {
        return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } }
  ], function () { setTimeout(bind, 0); });
})();
;

/* Engine Lab — the long-span engine's section. Reads only window.__KALASETU_DATA
   (the fitted numbers and their held-back residuals, written by
   fit-kalasetu.mjs) and window.KalasetuEngine; the modern side comes from
   the site engine's __kEclipModern and __kNodesModern, so the comparison is
   always against the modern ephemeris whatever engine Settings has chosen. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function am(x) { return x == null ? "—" : (Math.abs(x) < 1 ? x.toFixed(2) : x.toFixed(1)) + "′"; }
  function dm(L) { var d = Math.floor(L), m = (L - d) * 60; return d + "°" + m.toFixed(1).padStart(4, "0") + "′"; }
  function yearLabel(y) { return y <= 0 ? (1 - y) + " BCE" : y + " CE"; }

  var ROWS = [["Sūrya", "Sun"], ["Candra", "Moon"], ["Budha", "Mercury"], ["Śukra", "Venus"],
              ["Maṅgala", "Mars"], ["Guru", "Jupiter"], ["Śani", "Saturn"], ["Rāhu", "mean node"],
              ["Rāhu (true)", "true node"]];

  function table(D) {
    var host = $("el-sltab"); if (!host) return;
    var bands = (D.residuals["Sūrya"].bands || []).map(function (b) { return b.from; });
    var h = '<div class="eltblwrap"><table class="aytab elerr"><thead><tr><th>graha</th><th>held back, rms</th><th>worst</th>' +
      bands.map(function (y) { return "<th>" + esc(yearLabel(y + 1)) + "</th>"; }).join("") +
      "</tr></thead><tbody>";
    ROWS.forEach(function (r) {
      var R = D.residuals[r[0]]; if (!R) return;
      h += "<tr><td><b>" + esc(r[0]) + "</b> <span class=\"elw\">" + esc(r[1]) + "</span></td><td>" +
        am(R.holdout.rms) + "</td><td>" + am(R.holdout.worst) + "</td>" +
        bands.map(function (_, i) { var B = R.bands && R.bands[i]; return "<td>" + (B ? am(B.rms) : "—") + "</td>"; }).join("") + "</tr>";
    });
    h += "</tbody></table></div>";
    host.innerHTML = h;
    var n = $("el-slnote");
    if (n) n.textContent = "Arcminutes of sidereal longitude, against the modern engine, on " + D.samples.holdout +
      " instants the fit never saw (" + D.samples.total + " in all, spread over " + D.span.label +
      "). The band columns are 600-year bands, each labelled by its first year. Written by fit-kalasetu; " +
      "checked by kalasetu-verify. For scale, a nakṣatra pāda is 200′ and a D60 aṃśa 30′.";
  }

  function live(SL) {
    var host = $("el-sllive"), sl = $("el-slyear"); if (!host || !sl) return;
    var y = +sl.value, ms = Date.UTC(2000, 5, 21, 6, 0, 0);
    var d = new Date(ms); d.setUTCFullYear(y); ms = d.getTime();
    var jd = ms / 86400000 + 2440587.5, ay = window.__ayanFor("samanvaya_ecliptic", jd);
    var r = $("el-slyearread"); if (r) r.textContent = "21 June " + yearLabel(y) + ", 06:00 UT";
    var EN = { "Sūrya": "Sun", "Candra": "Moon", "Budha": "Mercury", "Śukra": "Venus",
               "Maṅgala": "Mars", "Guru": "Jupiter", "Śani": "Saturn" };
    var N = window.__kNodesModern ? window.__kNodesModern(ms) : null;
    var rows = Object.keys(EN).map(function (sa) {
      var e = window.__kEclipModern(EN[sa], ms), m = norm(e.trop - ay), s = SL.longitude(sa, ms);
      return [sa, s, m];
    });
    if (N) {
      rows.push(["Rāhu (mean)", SL.longitude("Rāhu", ms), norm(N.mean - ay)]);
      rows.push(["Rāhu (true)", SL.trueNode(ms), norm(N.true - ay)]);
    }
    host.innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu engine</th>' +
      "<th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.map(function (q) {
        return "<tr><td><b>" + esc(q[0]) + "</b></td><td>" + dm(q[1]) + "</td><td>" + dm(q[2]) +
          "</td><td>" + am(sdiff(q[1], q[2]) * 60) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function bind() {
    var D = window.__KALASETU_DATA, SL = window.KalasetuEngine;
    if (!$("el-sltab")) return;
    if (!D || !SL || !SL.isFitted() || !window.__kEclipModern || !window.__ayanFor) {
      $("el-sltab").innerHTML = '<p class="swfail">The long-span engine or its fitted numbers did not load.</p>';
      return;
    }
    table(D); live(SL);
    $("el-slyear").addEventListener("input", function () { live(SL); });
    window.__slLab = { live: function () { live(SL); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
;
