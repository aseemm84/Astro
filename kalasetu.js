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

/* kalasetu.html — the fourth engine's own page.
 *
 * Everything drawn here is computed live from window.KalasetuEngine and its
 * fitted numbers (window.__KALASETU_DATA, inlined with engine.js), against the
 * modern engine through the site engine's __kEclipModern and __kNodesModern —
 * which are modern whatever engine Settings has chosen. The fitted Sūrya
 * Siddhānta tier used in "Measure it yourself" is this page's OWN copy of
 * ss-engine.js (concatenated ahead of this file by build.py), so switching its
 * tier cannot move the site engine.
 */
(function () {
  "use strict";
  if (!document.getElementById("ks-skytab")) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function am(x) { if (x == null || !isFinite(x)) return "—"; var a = Math.abs(x);
    return (a < 1 ? x.toFixed(2) : a < 10 ? x.toFixed(1) : x.toFixed(0)) + "′"; }
  function dms(L) { L = norm(L); var d = Math.floor(L), m = (L - d) * 60, mi = Math.floor(m), s = Math.round((m - mi) * 60);
    if (s === 60) { s = 0; mi++; } if (mi === 60) { mi = 0; d++; }
    return d + "°" + String(mi).padStart(2, "0") + "′" + String(s).padStart(2, "0") + "″"; }
  function inSign(L) { L = norm(L); var s = Math.floor(L / 30), x = L - 30 * s, d = Math.floor(x), m = Math.round((x - d) * 60);
    if (m === 60) { m = 0; d++; } return RS[s] + " " + d + "°" + String(m).padStart(2, "0") + "′"; }
  function yearLabel(y) { return y <= 0 ? (1 - y) + " BCE" : y + " CE"; }
  function msFor(y, mo, d, h, mi) { var t = new Date(Date.UTC(2000, mo - 1, d, h, mi)); t.setUTCFullYear(y); return t.getTime(); }
  function jdOf(ms) { return ms / 86400000 + 2440587.5; }
  var DAY = 86400000;

  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā",
    "Pūrva Phalgunī", "Uttara Phalgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  /* the site's nakṣatra system (nak-system.js, in engine.js): equal unless the
     reader chose unequal in Settings. The page's own "nearest star" and
     "Abhijit-28" conventions sit on top of it. */
  function NKS(L) { if (window.NNak) return window.NNak.at(L);
    var w = 40 / 3, x = norm(L), i = Math.floor(x / w), f = (x - i * w) / w;
    return { i: i, d: i, start: i * w, end: (i + 1) * w, frac: f, pada: Math.floor(f * 4) + 1 }; }
  function NKE() { if (window.NNak) return window.NNak.edges();
    var o = []; for (var k = 0; k < 27; k++) o.push({ i: k, start: k * 40 / 3, end: (k + 1) * 40 / 3 }); return o; }
  function nakNm(i) { return i === 27 ? "Abhijit" : NAK[i]; }
  function nakOf(L) { var k = NKS(L); return nakNm(k.i) + " " + k.pada; }
  var G = [["Sūrya", "Sun", "Su"], ["Candra", "Moon", "Mo"], ["Maṅgala", "Mars", "Ma"], ["Budha", "Mercury", "Me"],
           ["Guru", "Jupiter", "Ju"], ["Śukra", "Venus", "Ve"], ["Śani", "Saturn", "Sa"], ["Rāhu", "Rahu", "Ra"], ["Ketu", "Ketu", "Ke"]];
  var COL = { "Sūrya": "#d08a1e", "Candra": "#8a93a8", "Maṅgala": "#c0392b", "Budha": "#2e8b57", "Guru": "#c9a24b",
              "Śukra": "#c47ab0", "Śani": "#3f6fa6", "Rāhu": "#5a5e78", "Ketu": "#8a6a1f" };
  var MEANMOT = { "Sūrya": 0.98565, "Candra": 13.17640, "Maṅgala": 0.52403, "Budha": 0.98565, "Guru": 0.08309,
                  "Śukra": 0.98565, "Śani": 0.03346, "Rāhu": 0.05295, "Rāhu (true)": 0.05295 };

  var K = null, D = null, S = null,
      ST = { ms: Date.now(), place: { n: "Ujjain, Madhya Pradesh, India", lat: 23.1765, lon: 75.7885, zone: "Asia/Kolkata" } };

  /* ---- the place ---------------------------------------------------------------
     The grahas are geocentric, so a place changes only the lagna and the clock.
     The clock: local mean time is the place's own longitude ÷ 15 hours from UT,
     which is what any place kept before standard zones; "the place's clock" asks
     the browser's time-zone database, which before a zone existed returns the
     local mean time of the zone's own reference city, not of this place. */
  var QUICK = [
    { n: "Ujjain, Madhya Pradesh, India", lat: 23.1765, lon: 75.7885, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Kurukshetra, Haryana, India", lat: 29.9695, lon: 76.8783, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Varanasi, Uttar Pradesh, India", lat: 25.3176, lon: 82.9739, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Ayodhya, Uttar Pradesh, India", lat: 26.7922, lon: 82.1998, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Pataliputra (Patna), Bihar, India", lat: 25.5941, lon: 85.1376, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Delhi, India", lat: 28.6139, lon: 77.2090, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Abu Dhabi, United Arab Emirates", lat: 24.4539, lon: 54.3773, tz: 4, zone: "Asia/Dubai" },
    { n: "Greenwich, London, United Kingdom", lat: 51.4769, lon: -0.0005, tz: 0, zone: "Europe/London" }
  ];
  function lonNow() { var v = +$("ks-lon").value; return isFinite(v) ? Math.max(-180, Math.min(180, v)) : 0; }
  function latNow() { var v = +$("ks-lat").value; return isFinite(v) ? Math.max(-89.9, Math.min(89.9, v)) : 0; }
  /* hours to ADD to UT to get the clock time chosen in "Time is" */
  function offsetAt(msUT) {
    var m = $("ks-tmode").value;
    ST.zoneFell = false;
    if (m === "ut") return 0;
    if (m === "zone" && ST.place && ST.place.zone && window.NPlaces) {
      var o = window.NPlaces.offsetAt(ST.place.zone, msUT);
      if (o != null) return o;
      ST.zoneFell = true;
    }
    return lonNow() / 15;
  }
  function hm(ms) { var d = new Date(ms); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); }

  /* ---- the conventions --------------------------------------------------------
     Every reading a text is matched against depends on choices no ephemeris
     makes for you. They are explicit here, kept per viewer, and every readout
     follows them. */
  var CONV = { cal: "greg", frame: "samanvaya_ecliptic", node: "mean", nak: "equal", msys: "amanta", mname: "fullmoon", rtu: "lunar" };
  var CONV_KEY = "learnhoro.kalasetu.conventions";
  try { var sv = JSON.parse(localStorage.getItem(CONV_KEY) || "null"); if (sv) for (var ck in CONV) if (sv[ck]) CONV[ck] = sv[ck]; } catch (e) {}
  function saveConv() { try { localStorage.setItem(CONV_KEY, JSON.stringify(CONV)); } catch (e) {} }
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  /* a civil date in the chosen calendar to an instant (the local clock's), and back */
  function toMs(Y, M, D, h, mi) {
    if (CONV.cal !== "jul") return msFor(Y, M, D, h, mi);
    var a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3;
    var jdn = D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return (jdn - 0.5 - 2440587.5) * 86400000 + (h * 60 + mi) * 60000;
  }
  function civil(ms, cal) {
    cal = cal || CONV.cal;
    if (cal !== "jul") { var d = new Date(ms); return { Y: d.getUTCFullYear(), M: d.getUTCMonth() + 1, D: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; }
    var jd = ms / 86400000 + 2440587.5, Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z, B = Z + 1524, C = Math.floor((B - 122.1) / 365.25),
        Dd = Math.floor(365.25 * C), E = Math.floor((B - Dd) / 30.6001), mins = Math.round(F * 1440);
    var M = E < 14 ? E - 1 : E - 13;
    return { Y: M > 2 ? C - 4716 : C - 4715, M: M, D: B - Dd - Math.floor(30.6001 * E), h: Math.floor(mins / 60) % 24, mi: mins % 60 };
  }
  function civilText(ms, cal) { var c = civil(ms, cal); return c.D + " " + MON[c.M - 1] + " " + yearLabel(c.Y); }
  /* degrees to ADD to a Samanvaya–Ecliptic longitude to read it in the chosen
     frame. "Citrā by the star" holds Spica at 180° on the date itself, with its
     real motion, rather than by a formula fitted to the present. */
  function shiftOf(ms) {
    var jd = jdOf(ms), sam = window.__ayanFor("samanvaya_ecliptic", jd);
    if (CONV.frame === "lahiri") return sam - window.__ayanFor("lahiri", jd);
    if (CONV.frame === "citra_star") { var y = yogataras(ms), c = y && y.filter(function (q) { return q.nak === "Citrā"; })[0];
      return c ? 180 - c.lon : 0; }
    return 0;
  }
  function ayanNow(ms) { return window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) - shiftOf(ms); }
  var FRAME_NAME = { samanvaya_ecliptic: "Samanvaya–Ecliptic", lahiri: "Lahiri", citra_star: "Citrā-by-the-star" };
  /* the nakṣatra a longitude is "in", under the chosen meaning */
  function nakName(L, ms) {
    L = norm(L);
    if (CONV.nak === "abhijit" && L >= 276 + 40 / 60 && L < 280 + 53 / 60 + 20 / 3600) return "Abhijit";
    if (CONV.nak === "star") {
      var ys = yogataras(ms), S = shiftOf(ms), best = null;
      (ys || []).forEach(function (y) { if (y.nak === "Abhijit") return; var d = Math.abs(sdiff(y.lon + S, L)); if (!best || d < best.d) best = { d: d, y: y }; });
      if (best) return best.y.nak + ' <span class="elw">by ' + esc(best.y.star) + ", " + best.d.toFixed(1) + "° away</span>";
    }
    return nakOf(L);
  }

  /* ---- the moment ----------------------------------------------------------- */
  function readWhen() {
    var era = $("ks-era").value, y = Math.max(1, Math.min(era === "BCE" ? 13000 : 3600, +$("ks-year").value || 1));
    var t = ($("ks-time").value || "06:00").split(":");
    var Y = era === "BCE" ? 1 - y : y;
    var local = toMs(Y, +$("ks-month").value || 1, +$("ks-day").value || 1, +t[0] || 0, +t[1] || 0);
    var ut = local - offsetAt(local) * 3600000;
    ST.ms = local - offsetAt(ut) * 3600000;      /* once more, for a zone whose offset changes that day */
  }
  function writeWhen(ms) {
    var d = civil(ms + offsetAt(ms) * 3600000), Y = d.Y;
    $("ks-era").value = Y <= 0 ? "BCE" : "CE"; $("ks-year").value = Y <= 0 ? 1 - Y : Y;
    $("ks-month").value = d.M; $("ks-day").value = d.D;
    $("ks-time").value = String(d.h).padStart(2, "0") + ":" + String(d.mi).padStart(2, "0");
    ST.ms = ms;
  }
  var PRESETS = [
    ["The span opens · 1 Jan 13000 BCE", function () { return msFor(-12999, 1, 1, 6, 0); }],
    /* EVERY MEṢA GATHERING in 13000 BCE – 3600 CE: the six grahas other than the
       Moon (Sun, Mercury, Venus, Mars, Jupiter, Saturn) all in Meṣa at once —
       seven times in sixteen millennia (searched with this engine, every 3 hours,
       15 Nov 2026). Each preset is the middle of the hours when the Moon joins
       them, if it does, else the middle of the gathering; "+ Rāhu" when Rāhu is
       in Meṣa too (Ketu then in Tulā). On 3 Jan 7016 BCE all seven grahas and
       Rāhu are in Meṣa together for about 42 hours. */
    ["Meṣa gathering · 28 Sep 12556 BCE", function () { return msFor(-12555, 9, 28, 12, 0); }],
    ["Meṣa gathering + Moon · 9 Oct 11465 BCE", function () { return msFor(-11464, 10, 9, 15, 0); }],
    ["Meṣa gathering + Moon + Rāhu · 6 Dec 8785 BCE", function () { return msFor(-8784, 12, 6, 20, 0); }],
    ["Meṣa gathering + Moon + Rāhu · 3 Jan 7016 BCE", function () { return msFor(-7015, 1, 3, 10, 0); }],
    ["Meṣa gathering + Rāhu · 11 Jan 6162 BCE", function () { return msFor(-6161, 1, 11, 0, 0); }],
    ["Meṣa gathering · 29 Mar 232 CE", function () { return msFor(232, 3, 29, 19, 0); }],
    ["Meṣa gathering · 31 May 3589 CE", function () { return msFor(3589, 5, 31, 18, 0); }],
    /* the nearest the sky came, in all sixteen millennia, to every graha but
       Rāhu in Meṣa: Mercury and Mars 1.6° over into Vṛṣabha, the seven non-lunar
       grahas inside 29.9° (searched with this engine, 15 Nov 2026) */
    ["Nearest with Ketu in Meṣa · 15 Oct 12142 BCE", function () { return msFor(-12141, 10, 15, 20, 0); }],
    ["Deep gives way to Early · 8500 BCE", function () { return msFor(-8499, 6, 21, 6, 0); }],
    ["Early gives way to Core · 4000 BCE", function () { return msFor(-3999, 6, 21, 6, 0); }],
    ["The Kali epoch · Ujjain midnight, JD 588465.5", function () { return (588465.5 - 2440587.5) * 86400000; }],
    ["Āryabhaṭa's zero · 21 Mar 499 CE", function () { return (1903396.75 - 2440587.5) * 86400000; }],
    ["1 CE", function () { return msFor(1, 1, 1, 6, 0); }],
    ["This moment", function () { return Date.now(); }],
    ["The span closes · 31 Dec 3600 CE", function () { return msFor(3600, 12, 31, 18, 0); }]
  ];

  /* the modern engine, sidereal in Kālasetu's frame */
  function modSid(sa, ms) {
    var jd = jdOf(ms), ay = window.__ayanFor("samanvaya_ecliptic", jd);
    if (sa === "Rāhu" || sa === "Ketu") {
      var N = window.__kNodesModern(ms);
      return norm(N.mean - ay + (sa === "Ketu" ? 180 : 0));
    }
    var e = window.__kEclipModern(G.filter(function (g) { return g[0] === sa; })[0][1], ms);
    return norm(e.trop - ay);
  }

  /* ---- the sky ----------------------------------------------------------------- */
  /* the error bar for a graha at a moment: its set's held-back figures for the
     600-year band holding the date */
  function errCell(key, ms) {
    var a = K.accuracyAt ? K.accuracyAt(key, ms) : null;
    if (!a) return '<td class="num">—</td>';
    var ex = extrapolated(key, ms);
    return '<td class="num ' + grade(a.rms) + '" title="' + esc((ex ? "no independent reference here: the spread between two extrapolations. " : "") +
      "typical " + am(a.rms) + ", bias " + am(a.bias) + ", worst " + am(a.worst) + ", from " + a.n + " held-back moments") + '">±' + am(a.rms) +
      ' <span class="elw">bias ' + am(a.bias) + " · worst " + am(a.worst) + (ex ? " · extrapolated" : "") + "</span></td>";
  }
  /* since 17 Nov 2026 the Moon and true node are measured against JPL DE431
     over the whole span; nothing is extrapolated unless a set says so */
  function extrapolated(key, ms) {
    if (key !== "Candra" && key !== "Rāhu (true)") return false;
    var f = K.setAt ? K.setAt(ms) : null, d = f && docOf ? docOf(f.set) : null;
    return !!(d && d.moon && d.moon.fitted === false);
  }
  function grade(x) { return x == null ? "" : x < 1 ? "ks-g1" : x < 5 ? "ks-g2" : x < 30 ? "ks-g3" : "ks-g4"; }
  function sky() {
    var ms = ST.ms, rows = [], pos = {}, S = shiftOf(ms);
    ST.shift = S;
    var N = window.__kNodesModern(ms), ay0 = window.__ayanFor("samanvaya_ecliptic", jdOf(ms));
    var nodeK = { mean: norm(K.longitude("Rāhu", ms)), true: norm(K.trueNode(ms)) }, nodeM = { mean: norm(N.mean - ay0), true: norm(N.true - ay0) };
    var other = CONV.node === "true" ? "mean" : "true";
    G.forEach(function (g) {
      var isNode = g[0] === "Rāhu" || g[0] === "Ketu", flip = g[0] === "Ketu" ? 180 : 0;
      var k = norm((isNode ? nodeK[CONV.node] + flip : K.longitude(g[0], ms)) + S), m = norm((isNode ? nodeM[CONV.node] + flip : modSid(g[0], ms)) + S);
      pos[g[0]] = { k: k, m: m };
      rows.push("<tr><td><b>" + esc(g[0]) + "</b> <span class=\"elw\">" + esc(g[1]) + (isNode ? ", " + CONV.node + " node" : "") + "</span></td><td>" + inSign(k) +
        "</td><td>" + nakName(k, ms) + "</td>" + errCell(isNode ? (CONV.node === "true" ? "Rāhu (true)" : "Rāhu") : g[0], ms) + "<td>" + inSign(m) + "</td><td class=\"num\">" + am(sdiff(k, m) * 60) + "</td></tr>");
    });
    var tn = norm(nodeK[other] + S), tm = norm(nodeM[other] + S);
    rows.push("<tr><td><b>Rāhu</b> <span class=\"elw\">" + other + " node, for comparison</span></td><td>" + inSign(tn) + "</td><td>" + nakName(tn, ms) +
      "</td>" + errCell(other === "true" ? "Rāhu (true)" : "Rāhu", ms) + "<td>" + inSign(tm) + "</td><td class=\"num\">" + am(sdiff(tn, tm) * 60) + "</td></tr>");
    var lat = latNow(), lon = lonNow(), asc = null;
    try { asc = norm(window.__kAscTrop(ms, lat, lon) - ay0 + S); } catch (e) {}
    if (asc != null) {
      pos.Lagna = asc;
      rows.push('<tr class="ks-lagrow"><td><b>Lagna</b> <span class="elw">ascendant at the place</span></td><td>' + inSign(asc) +
        "</td><td>" + nakName(asc, ms) + '</td><td class="num">see the note below</td><td>' + inSign(asc) + '</td><td class="num">same method</td></tr>');
    }
    $("ks-skytab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th>' +
      "<th>nakṣatra · pāda</th><th>error here, measured</th><th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    fitRead();
    wheel(pos);
    /* the date and time as the reader gave them, on the clock "Time is" names;
       UT beside it when that is not UT */
    var mode = $("ks-tmode").value, dl = ms + offsetAt(ms) * 3600000, d = new Date(dl), Y = civil(dl).Y, dt = null;
    try { var t = window.Astronomy.MakeTime(new Date(ms)); dt = (t.tt - t.ut) * 86400; } catch (e) {}
    $("ks-skynote").innerHTML = "<b>" + civilText(dl) + ", " +
      hm(d.getTime()) + (mode === "ut" ? " UT" : mode === "lmt" ? " local mean time" : (ST.zoneFell ? " local mean time" : " clock time")) +
      "</b> <span class=\"elw\">(" + (CONV.cal === "jul" ? "Julian; proleptic Gregorian " + civilText(dl, "greg") : "proleptic Gregorian; Julian " + civilText(dl, "jul")) + ")</span>" +
      "</b> at " + esc(ST.place && ST.place.n ? ST.place.n : "the place") + " (" + lat.toFixed(2) + "°, " + lon.toFixed(2) + "°)" +
      (mode === "ut" ? "" : " = " + hm(ms) + " UT" + (new Date(ms).getUTCDate() !== d.getUTCDate() ? " (" + new Date(ms).getUTCDate() + " " +
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][new Date(ms).getUTCMonth()] + ")" : "")) +
      " · " + FRAME_NAME[CONV.frame] + " ayanāṃśa " + dms(ayanNow(ms)) +
      (ST.zoneFell ? " · <b>no time zone existed here then, so local mean time is used</b>" : "") +
      (dt != null ? " · ΔT " + (Math.abs(dt) < 600 ? dt.toFixed(0) + " s" : (dt / 3600).toFixed(1) + " hours") : "") +
      " · Kali day " + Math.floor(K.ahargana(ms)).toLocaleString("en") +
      (K.inSpan(ms) ? "" : " · <b>outside the fitted span — no accuracy is claimed here</b>") +
      (function () { var y = new Date(ms).getUTCFullYear(); return y < -2999 ? " · the Moon here is fitted on JPL DE431's integrated lunar orbit; ΔT, not the Moon, sets the error in the time of day" : ""; })() +
      (function () {
        /* the lagna turns a full circle a day, so ΔT's own uncertainty (see the
           Earth's clock, below) moves it 15° an hour for a clock-time moment */
        var s1 = sigmaMS(Y), s2 = sigmaHuber(Y);
        if (Y >= 1000 || asc == null) return "";
        var hi = Math.max(s1, s2 || 0) / 240, lo = Math.min(s1, s2 == null ? s1 : s2) / 240;
        return ". <b>The lagna for a clock time this far back is uncertain by about ±" + Math.round(lo) + "°" +
          (hi - lo > 2 ? " to ±" + Math.round(hi) + "°" : "") + "</b>, from the Earth's clock alone (ΔT; see below)";
      })();
    panc(ms);
  }
  /* ---- the pañcāṅga under the chosen conventions -------------------------------
     tithi, the lunar month and its name, the ṛtu, and the season the Sun is
     actually in — so a text's "Kārttika full moon" or "in Vasanta" can be read
     both ways and the gap between them seen */
  var LMON = ["Caitra", "Vaiśākha", "Jyaiṣṭha", "Āṣāḍha", "Śrāvaṇa", "Bhādrapada", "Āśvina", "Kārttika", "Mārgaśīrṣa", "Pauṣa", "Māgha", "Phālguna"];
  /* the full moon's nakṣatra names the month: Citrā, Svātī → Caitra; … the usual grouping */
  var NAK2MON = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6];
  var RTU = ["Vasanta", "Grīṣma", "Varṣā", "Śarad", "Hemanta", "Śiśira"];
  var TNAME = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī"];
  function elong(ms) { return norm(K.longitude("Candra", ms) - K.longitude("Sūrya", ms)); }
  /* the instant the elongation reaches tgt (0 new, 180 full), searched back or forward from ms */
  function syzygy(ms, tgt, dir) {
    var step = dir * DAY, t = ms, f = function (x) { return sdiff(elong(x), tgt); }, a = f(t);
    for (var n = 0; n < 40; n++) { var t2 = t + step, b = f(t2);
      if ((dir > 0 ? a < 0 && b >= 0 : a >= 0 && b < 0) && Math.abs(a - b) < 90) {
        var lo = dir > 0 ? t : t2, hi = dir > 0 ? t2 : t;
        for (var k = 0; k < 30; k++) { var mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
        return (lo + hi) / 2; }
      t = t2; a = b; }
    return null;
  }
  function panc(ms) {
    var el = $("ks-panc"); if (!el) return;
    var S = shiftOf(ms), e = elong(ms), ti = Math.floor(e / 12), sukla = ti < 15;
    var tName = (sukla ? "Śukla " : "Kṛṣṇa ") + (ti % 15 === 14 ? (sukla ? "Pūrṇimā" : "Amāvāsyā") : TNAME[ti % 15]);
    var nm0 = syzygy(ms, 0, -1), nm1 = syzygy(ms + DAY, 0, +1);
    var sunSign = function (t) { return Math.floor(norm(K.longitude("Sūrya", t) + shiftOf(t)) / 30); };
    var monthOf = function (a, b) {          /* the amānta month from new moon a to new moon b */
      if (CONV.mname === "solar") {
        var s0 = sunSign(a), s1 = sunSign(b);
        if (s0 === s1) return { i: (s0 + 1) % 12, adhika: true };     /* no saṅkrānti: adhika of the month to come */
        return { i: s1, adhika: false, ksaya: (s1 - s0 + 12) % 12 > 1 };
      }
      var fm = syzygy(a + DAY, 180, +1);
      var nq = fm ? NKS(norm(K.longitude("Candra", fm) + shiftOf(fm))).d : 0;
      return { i: NAK2MON[nq], adhika: false, fm: fm, nak: NAK[nq] };
    };
    var amM = nm0 && nm1 ? monthOf(nm0, nm1) : null, mon = amM;
    /* pūrṇimānta: the dark fortnight already carries the coming month's name */
    if (amM && CONV.msys === "purnimanta" && !sukla) { var nm2 = syzygy(nm1 + DAY, 0, +1); mon = nm2 ? monthOf(nm1, nm2) : amM; }
    var mText = mon ? (mon.adhika ? "Adhika " : "") + LMON[mon.i] + (mon.ksaya ? " (a kṣaya month falls here)" : "") : "—";
    var trop = norm(K.longitude("Sūrya", ms) + window.__ayanFor("samanvaya_ecliptic", jdOf(ms))), sid = norm(K.longitude("Sūrya", ms) + S);
    var rtuBy = {
      lunar: amM ? RTU[Math.floor(((mon || amM).i) / 2)] : "—",
      sayana330: RTU[Math.floor(norm(trop - 330) / 60)],
      sayana0: RTU[Math.floor(trop / 60)],
      nirayana: RTU[Math.floor(sid / 60)] };
    var season = ["spring (northern)", "summer", "autumn", "winter"][Math.floor(trop / 90)];
    var y = new Date(ms).getUTCFullYear(), soft = y < 1000;
    el.innerHTML = "<b>Pañcāṅga</b> under these conventions: <b>" + tName + "</b> (tithi " + (ti + 1) + ", elongation " + e.toFixed(1) + "°)" +
      " · month <b>" + esc(mText) + "</b> (" + (CONV.msys === "amanta" ? "amānta" : "pūrṇimānta") + ", named by " +
      (CONV.mname === "solar" ? "saṅkrānti" : "the full moon's nakṣatra" + (amM && amM.nak ? ", " + esc(amM.nak) : "")) + ")" +
      " · ṛtu <b>" + rtuBy[CONV.rtu] + "</b>" +
      " <span class=\"elw\">(by lunar month " + rtuBy.lunar + "; sāyana " + rtuBy.sayana330 + "; nirayana " + rtuBy.nirayana + ")</span>" +
      " · the Sun is " + trop.toFixed(1) + "° past the vernal equinox: astronomical " + season +
      (nm0 && nm1 ? " · this lunar month runs " + civilText(nm0) + " – " + civilText(nm1) + " (new moons, UT)" : "") +
      (soft ? ". <b>Before 1000 CE the tithi and the day of a new or full moon carry ΔT's uncertainty"  +
        "; read them as ±1 tithi or more far back.</b>" : "");
  }

  /* ---- the wheel: grahas, rāśis, nakṣatras and their junction stars ---------- */
  /* The 27 yogatāras (junction stars) and Vega for Abhijit, as HYG v3.8 gives
     them: [nakṣatra, star, designation, magnitude, x, y, z (parsecs, J2000
     equatorial), vx, vy, vz (parsecs a year)]. Carried by their full space
     motion — proper motion AND radial velocity — so Arcturus, which moves
     about 8° in thirteen thousand years, is where it was on the date, not
     where it is now. The same stars as the site's star-catalogue.js. */
  var YOGA = [
    ["Aśvinī", "Sheratan", "β Ari", 2.64, 14.752622, 8.063457, 6.389157, -4.43e-06, 7.15e-06, -1.032e-05],
    ["Bharaṇī", "Bharani", "41 Ari", 3.61, 33.287607, 30.498162, 23.26243, 1.49e-06, 2.322e-05, -2.364e-05],
    ["Kṛttikā", "Alcyone", "η Tau", 2.85, 61.664507, 94.489136, 50.483636, 1.16e-06, 2.299e-05, -1.94e-05],
    ["Rohiṇī", "Aldebaran", "α Tau", 0.87, 7.02722, 18.287604, 5.806661, 1.528e-05, 5.709e-05, -2.14e-06],
    ["Mṛgaśīrṣā", "Meissa", "λ Ori", 3.39, 35.907504, 329.702779, 58.086365, 5.44e-06, 3.439e-05, 3.01e-06],
    ["Ārdrā", "Betelgeuse", "α Ori", 0.45, 3.189296, 151.364387, 19.682142, -1.98e-05, 2.068e-05, 1.074e-05],
    ["Punarvasu", "Pollux", "β Gem", 1.16, -4.055465, 8.19518, 4.867171, 2.624e-05, 1.782e-05, -3.1e-07],
    ["Puṣya", "Asellus Australis", "δ Cnc", 3.94, -25.041776, 28.63397, 12.473108, -1.747e-05, 2.502e-05, -3.671e-05],
    ["Āśleṣā", "Ashlesha", "ε Hya", 3.38, -26.198413, 29.410867, 4.431082, 8.24e-06, 5.749e-05, -3.55e-06],
    ["Maghā", "Regulus", "α Leo", 1.36, -21.018857, 11.132218, 5.041397, 8.56e-06, 2.873e-05, 1.84e-06],
    ["Pūrva Phalgunī", "Zosma", "δ Leo", 2.56, -16.442201, 3.337108, 6.280742, 1.259e-05, -1.526e-05, -1.785e-05],
    ["Uttara Phalgunī", "Denebola", "β Leo", 2.14, -10.633926, 0.508011, 2.767546, -6e-08, 2.664e-05, -5.92e-06],
    ["Hasta", "Algorab", "δ Crv", 2.94, -25.316094, -3.317674, -7.57057, -7.2e-06, 2.639e-05, -1.986e-05],
    ["Citrā", "Spica", "α Vir", 0.98, -69.990853, -27.285826, -14.82176, -4.54e-06, 1.516e-05, -1.175e-05],
    ["Svātī", "Arcturus", "α Boo", -0.05, -8.823448, -5.932531, 3.698938, -5.905e-05, 3.22e-05, -0.00010473],
    ["Viśākhā", "Zubenelgenubi", "α² Lib", 2.75, -16.408581, -15.151818, -6.421874, 2.722e-05, 4.135e-05, 5.73e-06],
    ["Anurādhā", "Dschubba", "δ Sco", 2.29, -69.332609, -120.492107, -57.928452, 2.98e-06, 1.787e-05, -2.211e-05],
    ["Jyeṣṭhā", "Antares", "α Sco", 1.06, -58.542602, -140.307591, -75.574766, -3.38e-06, 1.36e-05, -1.574e-05],
    ["Mūla", "Shaula", "λ Sco", 1.62, -16.048583, -138.749793, -105.649898, -5.46e-06, 1.854e-05, -1.843e-05],
    ["Pūrvāṣāḍhā", "Kaus Australis", "ε Sgr", 1.79, 3.817188, -36.057831, -24.812975, -1.129e-05, 2.654e-05, -1.314e-05],
    ["Uttarāṣāḍhā", "Nunki", "σ Sgr", 2.05, 14.950858, -60.794062, -30.937099, 2.7e-07, 1.858e-05, -1.1e-05],
    ["Śravaṇa", "Altair", "α Aql", 0.76, 2.355468, -4.4873, 0.790749, -1.12e-06, 3.087e-05, 5.36e-06],
    ["Dhaniṣṭhā", "Rotanev", "β δ", 3.64, 18.994041, -23.134214, 7.794139, 4.1e-07, 2.746e-05, -1.284e-05],
    ["Śatabhiṣā", "Sadachbia", "γ Aqr", 3.86, 45.635919, -20.880207, -1.215412, -1.067e-05, 3.947e-05, 2.8e-06],
    ["Pūrva Bhādrapadā", "Markab", "α Peg", 2.49, 38.311434, -9.417123, 10.722722, 1.21e-06, 1.217e-05, -9.21e-06],
    ["Uttara Bhādrapadā", "Algenib", "γ Peg", 2.83, 115.664183, 6.687324, 31.442127, 5.04e-06, 3.03e-06, -3.56e-06],
    ["Revatī", "Revati", "ζ Psc", 5.21, 50.128801, 16.707567, 7.027196, -1.12e-06, 3.821e-05, -1.303e-05],
    ["Abhijit", "Vega", "α Lyr", 0.03, 0.960565, -5.908009, 4.809731, 4.76e-06, 1.734e-05, 5.9e-07]
  ];
  var NAKS = ["Aśv", "Bha", "Kṛt", "Roh", "Mṛg", "Ārd", "Pun", "Puṣ", "Āśl", "Mag", "PPh", "UPh", "Has", "Cit", "Svā",
              "Viś", "Anu", "Jye", "Mūl", "PĀṣ", "UĀṣ", "Śra", "Dha", "Śat", "PBh", "UBh", "Rev"];
  var YTCACHE = { key: null, v: null };
  /* each junction star's sidereal longitude on the date, in the page's frame:
     moved along its space motion from J2000, then precessed, nutated and
     aberrated by the modern engine exactly as a graha is, less the ayanāṃśa */
  function yogataras(ms) {
    var key = Math.round(ms / (10 * DAY));
    if (YTCACHE.key === key) return YTCACHE.v;
    var A = window.Astronomy, out = [];
    if (!A || !A.DefineStar) return null;
    var yrs = (ms - Date.UTC(2000, 0, 1, 12)) / DAY / 365.25, ay = window.__ayanFor("samanvaya_ecliptic", jdOf(ms));
    YOGA.forEach(function (s, i) {
      var x = s[4] + s[7] * yrs, y = s[5] + s[8] * yrs, z = s[6] + s[9] * yrs, r = Math.sqrt(x * x + y * y + z * z);
      var ra = ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24, de = Math.asin(z / r) * 180 / Math.PI;
      try {
        var body = A.Body["Star" + (1 + i % 8)];
        A.DefineStar(body, ra, de, r * 3.26156);
        var e = A.Ecliptic(A.GeoVector(body, new Date(ms), true));
        out.push({ nak: s[0], star: s[1], bayer: s[2], mag: s[3], lon: norm(e.elon - ay), lat: e.elat, i: i });
      } catch (err) { /* a star the engine cannot place is left off, not guessed */ }
    });
    YTCACHE = { key: key, v: out };
    return out;
  }
  var STARNAMES = true;   /* the junction stars' names around the wheel */
  var ABHIJIT = false, MODALL = false, MODLIM = 1;   /* the modern engine's ring: drawn only past 1° unless asked for */
  /* the grahas' relative sizes, the convention the site's other wheels use
     (37-ecliptic-wheel.js): legible, not to scale */
  var ART_R = { Sun: 1.45, Moon: 1.15, Jupiter: 1.25, Saturn: 1.2, Venus: 1.0, Mars: 0.88, Mercury: 0.8, Rahu: 0.8, Ketu: 0.8 };
  function wheel(pos) {
    var W = 360, c = W / 2, R0 = 100, R1 = 122, R2 = 146, h = [];
    var P = function (L, r) { var a = (180 + L) * Math.PI / 180; return [c + r * Math.cos(a), c - r * Math.sin(a)]; };
    var f1 = function (v) { return v.toFixed(1); };
    /* a margin round the wheel for the stars' names */
    var M = STARNAMES ? 74 : 0;
    h.push('<svg viewBox="' + (-M) + " " + (-M) + " " + (W + 2 * M) + " " + (W + 2 * M) + '" role="img" aria-label="The grahas, the rāśis, the 27 nakṣatras and their junction stars on one wheel">');
    [R0, R1, R2].forEach(function (r) { h.push('<circle class="ks-ring" cx="' + c + '" cy="' + c + '" r="' + r + '"/>'); });
    /* Abhijit, between Uttara Āṣāḍhā's last quarter and Śravaṇa's first fifteenth */
    if (ABHIJIT) {
      var a0 = 276 + 40 / 60, a1 = 280 + 53 / 60 + 20 / 3600, A0 = P(a0, R1), A1 = P(a1, R1), B0 = P(a0, R2), B1 = P(a1, R2);
      h.push('<path class="ks-abhijit" d="M' + f1(A0[0]) + "," + f1(A0[1]) + " A" + R1 + "," + R1 + " 0 0 0 " + f1(A1[0]) + "," + f1(A1[1]) +
        " L" + f1(B1[0]) + "," + f1(B1[1]) + " A" + R2 + "," + R2 + " 0 0 1 " + f1(B0[0]) + "," + f1(B0[1]) + ' Z"><title>Abhijit: 276°40′ – 280°53′20″</title></path>');
    }
    for (var s = 0; s < 12; s++) {
      var a = P(s * 30, R0), b = P(s * 30, R1), t = P(s * 30 + 15, (R0 + R1) / 2);
      h.push('<line class="ks-ring" x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '"/>');
      h.push('<text class="ks-sign" x="' + f1(t[0]) + '" y="' + f1(t[1]) + '">' + esc(RS[s].slice(0, 3)) + "</text>");
    }
    /* the divisions as the site's nakṣatra system draws them (equal or unequal) */
    NKE().forEach(function (e) {
      var n = e.i, L0 = e.start, u = P(L0, R1), v = P(L0, R2), tn = P((e.start + e.end) / 2, (R1 + R2) / 2);
      h.push('<line class="ks-nakline" x1="' + f1(u[0]) + '" y1="' + f1(u[1]) + '" x2="' + f1(v[0]) + '" y2="' + f1(v[1]) + '"/>');
      h.push('<text class="ks-nak" x="' + f1(tn[0]) + '" y="' + f1(tn[1]) + '"><title>' + esc(nakNm(n)) + ": " + e.start.toFixed(2) + "° – " +
        e.end.toFixed(2) + "°</title>" + esc(n === 27 ? "Abh" : NAKS[n]) + "</text>");
    });
    /* the junction stars, where they stood on this date; one outside its own
       13°20′ division is marked, since that is where "nakṣatra" as a star and
       "nakṣatra" as a division part company */
    var ys = (yogataras(ST.ms) || []).map(function (y) { var o = {}; for (var q in y) o[q] = y[q]; o.lon = norm(y.lon + (ST.shift || 0)); return o; });
    /* the name runs outward along the star's radius, turned on the left half so it never reads upside down */
    /* "Sanskrit / English": the nakṣatra the star marks, then its Western name;
       where that name is only the Sanskrit one again (Bharani, Ashlesha, Revati),
       the catalogue designation instead */
    var starLabel = function (y) {
      var sanskritAgain = { Bharani: 1, Ashlesha: 1, Revati: 1 };
      return y.nak + " / " + (sanskritAgain[y.star] ? y.bayer : y.star);
    };
    /* names closer than GAP degrees are pushed apart (the star stays where it is) */
    var GAP = 3.6, shown = ys.filter(function (y) { return y.nak !== "Abhijit" || ABHIJIT; }).sort(function (a, b) { return a.lon - b.lon; });
    shown.forEach(function (y) { y.tl = y.lon; });
    for (var it = 0; it < 30; it++) {
      var moved = false;
      for (var j = 0; j < shown.length; j++) {
        var a = shown[j], b = shown[(j + 1) % shown.length], d = sdiff(b.tl, a.tl);
        if (d >= 0 && d < GAP) { var push = (GAP - d) / 2; a.tl -= push; b.tl += push; moved = true; }
      }
      if (!moved) break;
    }
    var nameAt = function (y) {
      if (!STARNAMES) return "";
      var L = y.tl != null ? y.tl : y.lon, q = P(L, R2 + 17), ang = ((-(180 + L)) % 360 + 360) % 360, end = ang > 90 && ang < 270;
      if (end) ang -= 180;
      return '<text class="ks-ytn" x="' + f1(q[0]) + '" y="' + f1(q[1]) + '" text-anchor="' + (end ? "end" : "start") +
        '" transform="rotate(' + f1(ang) + " " + f1(q[0]) + " " + f1(q[1]) + ')">' + esc(starLabel(y)) + "</text>";
    };
    ys.forEach(function (y) {
      if (y.nak === "Abhijit" && !ABHIJIT) return;
      var own = y.nak === "Abhijit" ? true : NKS(y.lon).i === y.i, k0 = P(y.lon, R2), k1 = P(y.lon, R2 + 6), sp = P(y.lon, R2 + 11);
      var where = nakNm(NKS(y.lon).i);
      h.push('<g class="ks-yt' + (own ? "" : " out") + '"><title>' + esc(y.nak + " · " + y.star + " (" + y.bayer + ", mag " + y.mag.toFixed(1) + ") · " +
        y.lon.toFixed(2) + "°, latitude " + y.lat.toFixed(1) + "° · " + (y.nak === "Abhijit" ? "Abhijit's star" : own ? "inside its own division" :
        "outside its own division: it stands in " + where)) + "</title>" +
        '<line x1="' + f1(k0[0]) + '" y1="' + f1(k0[1]) + '" x2="' + f1(k1[0]) + '" y2="' + f1(k1[1]) + '"/>' + star(sp[0], sp[1], y.mag < 1.5 ? 4.4 : 3.4) + nameAt(y) + "</g>");
    });
    if (pos.Lagna != null) {
      var la = P(pos.Lagna, 26), lb = P(pos.Lagna, R0), lt = P(pos.Lagna, R0 - 9);
      h.push('<line class="ks-asc" x1="' + f1(la[0]) + '" y1="' + f1(la[1]) + '" x2="' + f1(lb[0]) + '" y2="' + f1(lb[1]) + '"/>');
      h.push('<text class="ks-glyph ks-asct" x="' + f1(lt[0]) + '" y="' + f1(lt[1]) + '">As</text>');
    }
    /* the grahas: the site's lit surfaces (bodies.js, the same sprites Kundli
       and the workstation draw), the Moon in its real phase, Rāhu and Ketu as
       shadow discs; a lettered disc if the sprites cannot load. Crowding is
       resolved by stacking inward, never by sliding a graha along the ring,
       so each one's bearing from the centre stays its longitude. */
    var art = !!(window.NSprite && window.NSprite.ready()), LANES = [88, 72, 57, 43, 30, 18];
    var phase = norm(pos["Candra"].k - pos["Sūrya"].k);
    var order = G.slice().sort(function (p, q) { return pos[p[0]].k - pos[q[0]].k; });
    /* pack at full size; if a crowd (a gathering of seven in one rāśi) cannot
       be placed without overlap, shrink every surface a step and pack again */
    function pack(sc) {
      var out = [], clash = false;
      order.forEach(function (g) {
        var L = pos[g[0]].k, rr = 9 * sc * (ART_R[g[1]] || 1), lane = 0, ok = false;
        for (; lane < LANES.length; lane++) {
          /* clear of every graha already placed, in any lane: surface to
             surface, with room for the label that sits above each */
          var k = P(L, LANES[lane]);
          if (out.every(function (o) { var q = P(o.L, o.r), dx = q[0] - k[0], dy = q[1] - k[1];
                return Math.sqrt(dx * dx + dy * dy) > rr + o.rr + 10; })) { ok = true; break; }
        }
        if (!ok) { clash = true; lane = LANES.length - 1; }
        out.push({ g: g, L: L, rr: rr, r: LANES[lane] });
      });
      return { out: out, clash: clash };
    }
    var packed = null, modN = 0;
    [1, 0.82, 0.68, 0.56].some(function (sc) { packed = pack(sc); return !packed.clash; });
    packed.out.forEach(function (q) {
      var g = q.g, L = q.L, rr = q.rr, r = q.r, k = P(L, r), m = P(pos[g[0]].m, r);
      var src = art ? window.NSprite.href(g[1], Math.max(6, rr), g[1] === "Moon" ? phase : null) : null;
      var tip = esc(g[0] + " (" + g[1] + ") · " + inSign(L).replace(/<[^>]+>/g, "") + " · " + nakOf(L));
      h.push('<g class="ks-graha"><title>' + tip + "</title>");
      /* the modern engine's place for the same graha, drawn only where it says
         something: past MODLIM, or always if the reader asks to compare */
      var d = isFinite(pos[g[0]].m) ? ((pos[g[0]].m - L + 540) % 360) - 180 : NaN;
      if (isFinite(d) && (MODALL || Math.abs(d) > MODLIM)) {
        modN += Math.abs(d) > MODLIM ? 1 : 0;
        var dx = m[0] - k[0], dy = m[1] - k[1], dd = Math.sqrt(dx * dx + dy * dy);
        if (dd > 2 * rr + 2.5) {
          var ux = dx / dd, uy = dy / dd;
          h.push('<line class="ks-modln" x1="' + f1(k[0] + ux * rr) + '" y1="' + f1(k[1] + uy * rr) + '" x2="' + f1(m[0] - ux * (rr + 2.5)) +
            '" y2="' + f1(m[1] - uy * (rr + 2.5)) + '"/>');
        }
        h.push('<circle class="ks-mod" cx="' + f1(m[0]) + '" cy="' + f1(m[1]) + '" r="' + f1(rr + 2.5) + '"/>');
        /* the label sits beyond the ring, on the side away from Kālasetu's image */
        var lx = dd > 0.01 ? dx / dd : 1, ly = dd > 0.01 ? dy / dd : 0;
        if (Math.abs(d) > MODLIM) h.push('<text class="ks-modk" text-anchor="' + (lx >= 0 ? "start" : "end") + '" x="' + f1(m[0] + lx * (rr + 4.5)) +
          '" y="' + f1(m[1] + ly * (rr + 4.5) + 2) + '">' +
          (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "°</text>");
      }
      if (src) h.push('<image class="ks-dot ks-art" href="' + src + '" x="' + f1(k[0] - rr) + '" y="' + f1(k[1] - rr) + '" width="' + f1(2 * rr) +
        '" height="' + f1(2 * rr) + '"/>');
      else h.push('<circle class="ks-dot" cx="' + f1(k[0]) + '" cy="' + f1(k[1]) + '" r="' + f1(Math.min(7.5, rr)) + '" style="fill:' + COL[g[0]] + '"/>');
      h.push('<text class="ks-glyph" x="' + f1(k[0]) + '" y="' + f1(k[1] - rr - 5) + '">' + g[2] + "</text></g>");
    });
    h.push("</svg>");
    var outN = ys.filter(function (y) { return y.nak !== "Abhijit" && NKS(y.lon).i !== y.i; }).length;
    $("ks-wheel").innerHTML = h.join("") + '<p class="ks-legend"><span>image: Kālasetu</span><span>' + (modN ? "dotted ring: the modern engine, drawn where it differs by more than 1°, with the difference (" + modN + ")" :
      "the modern engine agrees within 1° for every graha") + "</span>" +
      "<span>As: the lagna</span><span>Meṣa at the left, counter-clockwise</span>" +
      '<span><b class="ks-ytk">✦</b> the 27 junction stars on this date' + (outN ? " — <b class=\"ks-ytk out\">✦</b> " + outN + " stand outside their own division" : "") + "</span>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-abhijit"' + (ABHIJIT ? " checked" : "") + "> show Abhijit</label>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-starnames"' + (STARNAMES ? " checked" : "") + "> star names</label>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-modall"' + (MODALL ? " checked" : "") + "> compare every graha with the modern engine</label></p>";
    var cb = $("ks-abhijit"); if (cb) cb.onchange = function () { ABHIJIT = cb.checked; wheel(pos); };
    var cm = $("ks-modall"); if (cm) cm.onchange = function () { MODALL = cm.checked; wheel(pos); };
    var cn = $("ks-starnames"); if (cn) cn.onchange = function () { STARNAMES = cn.checked; wheel(pos); };
  }
  /* a four-pointed star, so a junction star reads as a star and not a graha */
  function star(x, y, r) {
    var q = r * 0.36, pts = [[x, y - r], [x + q, y - q], [x + r, y], [x + q, y + q], [x, y + r], [x - q, y + q], [x - r, y], [x - q, y - q]];
    return '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
  }

  /* ---- the steps --------------------------------------------------------------- */
  var LSRC = function (i) { return i === 0 ? "the manda equation" : (i <= 3 ? "Candraśekhara" : "modern series"); };
  var LNAME = ["manda equation", "evection", "variation", "annual equation", "second harmonic of the manda", "reduction to the ecliptic"];
  function argText(a) {
    var p = [], n = ["D", "M", "M☉", "F"];
    a.slice(0, 4).forEach(function (c, i) { if (!c) return; p.push((c < 0 ? "− " : (p.length ? "+ " : "")) + (Math.abs(c) === 1 ? "" : Math.abs(c)) + n[i]); });
    return p.join(" ");
  }
  function step(title, val, why) {
    return "<li>" + title + (val != null ? " <span class=\"ks-val\">" + val + "</span>" : "") + (why ? "<span class=\"ks-why\">" + why + "</span>" : "") + "</li>";
  }
  function steps() {
    var sa = $("ks-graha").value, ms = ST.ms, t = K.trace(sa, ms), h = [];
    if (!t) { $("ks-steps").innerHTML = ""; return; }
    h.push(step("Days since the Kali epoch at Laṅkā sunrise (the ahargaṇa), counted in uniform time:",
      t.ahar.toLocaleString("en", { maximumFractionDigits: 3 }),
      "ΔT, the Earth's clock, adds " + (Math.abs(t.dt) < 600 ? t.dt.toFixed(1) + " seconds" : (t.dt / 3600).toFixed(2) + " hours") + " to the civil count here."));
    if (t.rev != null) {
      h.push(step("The text's mean place: " + Math.abs(t.rev).toLocaleString("en") + " revolutions in 1,577,917,828 days" +
        (t.rev < 0 ? ", backwards" : "") + ", times the ahargaṇa:", dms(t.textMean),
        "This is the Later Sūrya Siddhānta's own number, unchanged."));
      h.push(step("The correction on it (bīja and epoch saṃskāra, drifting slowly over the millennia):",
        (t.correction >= 0 ? "+" : "−") + dms(Math.abs(t.correction)), "Mean place now " + dms(t.mean) + "."));
    }
    if (sa === "Rāhu" || sa === "Ketu") {
      h.push(step("The mean " + (sa === "Ketu" ? "Ketu (Rāhu + 180°)" : "node") + ":", inSign(t.lon)));
      h.push(step("For the true node: the mean node's own secular drift against the ecliptic of date,", am(t.trueSecular * 60),
        "the true node is a plane measured against the moving ecliptic; the mean node is a published polynomial"));
      h.push(step("plus the periodic wobble (56 sine and cosine terms on the Moon's and Sun's places):", am(t.truePeriodic * 60)));
      h.push(step("The true node:", inSign(t.trueLon), "Modern engine: " + inSign(norm(window.__kNodesModern(ms).true -
        window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) + (sa === "Ketu" ? 180 : 0))) + "."));
      $("ks-steps").innerHTML = h.join(""); return;
    }
    if (sa === "Candra") {
      h.push(step("The Moon's apogee (mandocca): the text's " + dms(t.apogeeText) + ", corrected to", dms(t.apogee)));
      h.push(step("The four arguments every lunar term is read on:", "D " + t.args.D.toFixed(2) + "° · M " + t.args.M.toFixed(2) +
        "° · M☉ " + t.args.Ms.toFixed(2) + "° · F " + t.args.F.toFixed(2) + "°",
        "D the Moon's elongation from the Sun, M its anomaly counted from the apogee as the texts count it, M☉ the Sun's anomaly, F its distance from the node"));
      var top = t.terms.slice().sort(function (a, b) { return Math.abs(b.deg) - Math.abs(a.deg); }).slice(0, 8);
      h.push(step("The terms, largest first here:", null, top.map(function (x) {
        return esc((LNAME[x.i] || "sin(" + argText(x.arg) + ")") + " — " + LSRC(x.i)) + ": " + am(x.deg * 60);
      }).join(" · ") + " · and " + (t.terms.length - top.length) + " smaller."));
      var sum = t.terms.reduce(function (a, x) { return a + x.deg; }, 0);
      h.push(step("All " + t.terms.length + " terms together:", (sum >= 0 ? "+" : "−") + dms(Math.abs(sum))));
      h.push(step("The Moon:", inSign(t.lon), "Latitude " + t.lat.toFixed(3) + "°. Modern engine: " + inSign(modSid("Candra", ms)) + "."));
      $("ks-steps").innerHTML = h.join(""); return;
    }
    var o = t.orbit;
    var who = sa === "Sūrya" ? "the Sun's own path about the Earth" : "the planet's own orbit about the Sun";
    h.push(step("Manda: " + who + ". Mandocca " + dms(o.w) + ", eccentricity " + o.e.toFixed(5) + ", anomaly " + o.M.toFixed(3) + "°; the equation of the centre:",
      (o.eqc >= 0 ? "+" : "−") + dms(Math.abs(o.eqc)), "solved exactly (Kepler's equation) rather than with the text's epicycle and sine table"));
    if (o.terms && o.terms.length) {
      var tops = o.terms.slice().sort(function (a, b) { return Math.abs(b.deg) - Math.abs(a.deg); }).slice(0, 3);
      h.push(step("Perturbations by the other planets (" + o.terms.length + " terms):", am(o.pert * 60),
        "largest: " + tops.map(function (x) { return am(x.deg * 60); }).join(", ") +
        (sa === "Guru" || sa === "Śani" ? " — the great inequality leads; see below" : "")));
    }
    if (sa !== "Sūrya") {
      h.push(step("The planet's true place about the Sun, and its distance (the manda karṇa):", dms(o.lam), o.r.toFixed(4) + " AU"));
      h.push(step("Śīghra: added, as a vector, to the Sun's true place " + dms(t.sun.lam) + " at its own distance " + t.sun.r.toFixed(4) + " AU",
        null, "true distances on both sides — the combination Nīlakaṇṭha's Tantrasaṅgraha reached for the inner planets"));
      h.push(step("Light-time: the planet is seen where it was", (t.lightDays * 1440).toFixed(1) + " minutes ago", "at " + t.dist.toFixed(4) + " AU"));
    }
    h.push(step("The answer, in Samanvaya–Ecliptic:", inSign(t.lon) + " · " + nakOf(t.lon),
      "Modern engine: " + inSign(modSid(sa, ms)) + " — a difference of " + am(sdiff(t.lon, modSid(sa, ms)) * 60) + "."));
    $("ks-steps").innerHTML = h.join("");
  }

  /* ---- accuracy ------------------------------------------------------------------ */
  var ROWS = ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu", "Rāhu (true)"];
  var SETN = ["core", "early", "deep"];
  /* the 600-year eras across the whole span, 13000 BCE onwards; the last runs to 3600 CE */
  var ERAS = []; for (var ey = -13000; ey + 600 <= 3800; ey += 600) ERAS.push(ey);
  function eraMid(y0) { var y = y0 + 1 + (y0 + 600 > 3400 ? 400 : 300); return msFor(Math.floor(y), 7, 1, 0, 0); }
  function docOf(n) { return K.sets ? (K.sets()[n] || {}).doc : (n === "core" ? D : null); }
  function fitRead() {
    var el = $("ks-fitread"); if (!el || !K.setAt) return;
    var f = K.setAt(ST.ms);
    el.innerHTML = (K.mode() === "auto" ? "Auto reads this date from the <b>" + esc(f.name) + "</b> fit (" + esc(f.label) + ")" +
        (f.blendWith ? ", blended " + Math.round(100 * f.weight) + " : " + Math.round(100 * (1 - f.weight)) + " with the " + esc(f.blendName) + " fit" : "")
      : "Forced to the <b>" + esc(f.name) + "</b> fit (" + esc(f.label) + ")" + (f.inSetSpan ? "" : " — <b>this date is outside that fit's own span</b>, so its error bars do not apply")) + ".";
  }
  function tiles() {
    var R = D.residuals;
    $("ks-tiles").innerHTML = ROWS.map(function (b) {
      return R[b] ? '<div class="ks-tile"><b>' + am((R[b].de || R[b].holdout).rms) + "</b><span>" + esc(b === "Rāhu" ? "Rāhu · Ketu (mean)" :
        b === "Rāhu (true)" ? "Rāhu · Ketu (true)" : b) + (b === "Rāhu" ? ", against the published polynomial" : b === "Candra" || b === "Rāhu (true)" ? ", against JPL DE431" : ", against DE422") + "</span></div>" : "";
    }).join("") + '<div class="ks-tile"><b>16,600</b><span>years fitted, 13000 BCE – 3600 CE, in three fits</span></div>';
  }
  function bands() {
    var b = $("ks-accbody").value;
    var cells = ERAS.map(function (y0) { var ms = eraMid(y0), a = K.accuracyAt ? K.accuracyAt(b, ms) : null;
      return { y0: y0, a: a, set: K.setAt ? K.setAt(ms).set : "core", ex: extrapolated(b, ms) }; }).filter(function (c) { return c.a; });
    if (!cells.length) return;
    var W = 640, H = 210, L = 46, B = 34, n = cells.length, bw = (W - L - 10) / n;
    var top = Math.max.apply(null, cells.map(function (c) { return c.a.rms; })) * 1.15 || 1;
    var h = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Held-back error by 600-year band, 13000 BCE to 3600 CE">'];
    for (var g = 0; g <= 4; g++) { var v = top * g / 4, y = H - B - (H - B - 10) * g / 4;
      h.push('<line class="ks-ax" x1="' + L + '" y1="' + y + '" x2="' + (W - 6) + '" y2="' + y + '"/><text class="ks-axt" x="' + (L - 4) +
        '" y="' + (y + 3) + '" text-anchor="end">' + (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : v.toFixed(0)) + "′</text>"); }
    cells.forEach(function (c, i) {
      var hh = (H - B - 10) * c.a.rms / top, X = L + i * bw + 1.5;
      h.push('<rect class="ks-bar ' + c.set + (c.ex ? " ex" : "") + '" x="' + X.toFixed(1) + '" y="' + (H - B - hh).toFixed(1) + '" width="' + (bw - 3).toFixed(1) +
        '" height="' + hh.toFixed(1) + '"><title>' + esc(yearLabel(c.y0 + 1)) + ", " + c.set + " fit: " + am(c.a.rms) + " typical, bias " + am(c.a.bias) +
        ", worst " + am(c.a.worst) + (c.ex ? " — extrapolated, no independent reference" : "") + "</title></rect>");
      if (i % 4 === 0) h.push('<text class="ks-axt" x="' + (X + bw / 2).toFixed(1) + '" y="' + (H - B + 13) + '" text-anchor="middle">' + esc(yearLabel(c.y0 + 1)) + "</text>");
    });
    h.push("</svg>");
    $("ks-bands").innerHTML = h.join("") + '<p class="ks-legend"><span><i style="background:var(--accent,#c9a24b)"></i>Core fit</span>' +
      '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Early fit</span><span><i style="background:var(--sem-bad,#a1493a)"></i>Deep fit</span>' +
      "<span>pale: no independent reference (the spread between two extrapolations)</span></p>";
  }
  function accTable() {
    var heads = SETN.map(function (n) { var d = docOf(n); return d ? "<th>" + esc(n.charAt(0).toUpperCase() + n.slice(1)) + "<br><small>" +
      esc(d.span.label) + "</small></th>" : ""; }).join("");
    $("ks-acctab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th>' + heads +
      "<th>latitude, Core</th></tr></thead><tbody>" + ROWS.map(function (b) {
        if (!D.residuals[b]) return "";
        return "<tr><td><b>" + esc(b) + "</b></td>" + SETN.map(function (n) { var d = docOf(n); if (!d) return "";
          var x = d.residuals[b]; if (!x) return "<td>—</td>";
          var lunar = b === "Candra" || b === "Rāhu (true)", spread = lunar && d.moon && d.moon.fitted === false;
          /* the Moon is measured against DE431 in every set */
          var q = lunar && x.de ? x.de : x.holdout;
          return '<td class="' + grade(q.rms) + '">' + am(q.rms) + ' <span class="elw">worst ' + am(q.worst) +
            (spread ? " · spread, not measured" : lunar && x.de ? " · vs DE431" : "") + "</span></td>"; }).join("") +
          "<td>" + (D.residuals[b].latitude ? am(D.residuals[b].latitude.rms) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  /* the era table: every 600 years, the selected graha's error bar, its
     basis, the modern engine's own error against the same reference, and
     how well the Earth's clock is known */
  var MKEY = { "Rāhu (true)": "Rāhu-true" };
  function eras() {
    var b = $("ks-erabody").value, MR = D.reference && D.reference.modern_vs_reference && D.reference.modern_vs_reference.bands;
    var mrows = MR ? MR[MKEY[b] || b] : null;
    $("ks-eras").innerHTML = '<div class="eltblwrap"><table class="aytab ks-era"><thead><tr><th>era</th><th>fit</th><th>typical</th><th>bias</th>' +
      "<th>worst</th><th>measured against</th><th>modern engine, typical</th><th>ΔT known to</th></tr></thead><tbody>" +
      ERAS.map(function (y0, i) {
        var ms = eraMid(y0), a = K.accuracyAt(b, ms), f = K.setAt(ms), ex = extrapolated(b, ms), y = new Date(ms).getUTCFullYear();
        var basis = ex ? "nothing independent: the spread between two extrapolations" : (b === "Candra" || b === "Rāhu (true)" ? "JPL DE431" : y >= -2999 && y <= 2999 ? "JPL DE422" :
          (b === "Rāhu" ? "the published mean-node polynomial" : "the integration from DE422"));
        var m = mrows && mrows[i] && mrows[i].rms != null ? mrows[i].rms : null;
        var sH = sigmaHuber(y), sM = sigmaMS(y), dt = y >= 1600 ? "seconds" : y >= 1000 ? "minutes" :
          "±" + fmtH(Math.min(sM, sH == null ? sM : sH)) + (sH != null && Math.abs(sH - sM) > 600 ? " – " + fmtH(Math.max(sM, sH)) : "");
        if (!a) return "";
        return "<tr><td>" + esc(yearLabel(y0 + 1)) + "–" + esc(yearLabel(Math.min(3600, y0 + 600))) + "</td><td>" + esc(f.name) +
          (f.blendWith ? " ⇄ " + esc(f.blendName) : "") + '</td><td class="num ' + grade(a.rms) + '">' + am(a.rms) + '</td><td class="num">' + am(a.bias) +
          '</td><td class="num">' + am(a.worst) + "</td><td>" + esc(basis) + '</td><td class="num ' + grade(m) + '">' + (m == null ? "—" : m > 120 ? (m / 60).toFixed(1) + "°" : am(m)) +
          '</td><td class="num">' + dt + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var IC = D.reference && D.reference.integrator_check && D.reference.integrator_check.bodies;
    $("ks-erasnote").innerHTML = "Typical is the rms of the held-back moments in that era; bias their mean; worst the largest. Arcminutes of sidereal longitude. " +
      (IC ? "The integration that stands in for DE422 outside 3000 BCE – 3000 CE was checked by running it across DE422's own six thousand years: it stayed within " +
        Object.keys(IC).map(function (k) { return k + " " + IC[k].worst.toFixed(1) + "″"; }).join(", ") + " of DE422. " : "") +
      "“Modern engine” is the site's main engine against the same reference — before about 1000 BCE it is the larger error. " +
      "ΔT is known to seconds after 1600, minutes from 1000; before that the two published estimates of its error are shown. " +
      "An error in ΔT moves the Moon about 0.55° and the lagna 15° per hour, for a moment given on a clock.";
  }
  /* ---- checked against recorded history ----------------------------------------
     Records whose dates historians fix without any ephemeris. An eclipse is
     reproduced when a syzygy falls on the recorded day with the Moon near the
     ecliptic (|β| under about 1° for a central solar eclipse at the right place,
     under 0.5° for a total lunar one) and the body is above the horizon there. */
  var HIST = [
    { name: "Bur-Sagale solar eclipse", src: "Assyrian eponym list, year of Bur-Sagale", kind: "solar", d: [-762, 6, 15], lat: 35.46, lon: 43.26, at: "Assur", rec: "total" },
    { name: "Earliest eclipse in Ptolemy's Almagest", src: "Almagest IV.6, Mardokempad year 1, from Babylonian records", kind: "lunar", d: [-720, 3, 19], lat: 32.55, lon: 44.42, at: "Babylon", rec: "total" },
    { name: "Thales' eclipse", src: "Herodotus I.74, the battle of the Halys", kind: "solar", d: [-584, 5, 28], lat: 39.8, lon: 34.6, at: "central Anatolia", rec: "total, day turned to night" },
    { name: "The eclipse before Gaugamela", src: "Arrian III.7, Plutarch, Alexander 31", kind: "lunar", d: [-330, 9, 20], lat: 36.36, lon: 43.25, at: "near Arbela", rec: "total" },
    { name: "Babylonian total solar eclipse", src: "Babylonian astronomical diary, BM 34034", kind: "solar", d: [-135, 4, 15], lat: 32.55, lon: 44.42, at: "Babylon", rec: "total" }
  ];
  function julMs(Y, M, D) { var a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3;
    return (D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083 - 0.5 - 2440587.5) * 86400000; }
  function history() {
    var host = $("ks-history"); if (!host) return;
    var A = window.Astronomy, rows = [];
    HIST.forEach(function (h) {
      var t = syzygy(julMs(h.d[0], h.d[1], h.d[2]) - 2 * DAY, h.kind === "solar" ? 0 : 180, +1);
      if (t == null) return;
      var beta = K.latitude("Candra", t), alt = null, dT = null;
      try { var ob = new A.Observer(h.lat, h.lon, 0), at = A.MakeTime(new Date(t)), eq = A.Equator(h.kind === "solar" ? A.Body.Sun : A.Body.Moon, at, ob, true, true);
        alt = A.Horizon(at, ob, eq.ra, eq.dec).altitude; dT = (at.tt - at.ut) * 24; } catch (e) {}
      var y = new Date(t).getUTCFullYear(), sg = Math.min(sigmaMS(y), sigmaHuber(y) == null ? 1e9 : sigmaHuber(y)) / 3600;
      var sameDay = civil(t, "jul").D === h.d[2] || Math.abs(t - julMs(h.d[0], h.d[1], h.d[2]) - DAY / 2) < 1.5 * DAY;
      var ok = sameDay && Math.abs(beta) < (h.kind === "solar" ? 1.0 : 0.5) && (alt == null || alt > -1);
      var lmt = ((new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60 + h.lon / 15) % 24 + 24) % 24;
      rows.push("<tr><td><b>" + esc(h.name) + "</b><br><span class=\"elw\">" + esc(h.src) + "</span></td><td>" + esc(civilText(julMs(h.d[0], h.d[1], h.d[2]), "jul")) +
        "<br><span class=\"elw\">" + esc(h.rec) + ", " + esc(h.at) + "</span></td><td>" + (h.kind === "solar" ? "new moon " : "full moon ") + esc(civilText(t, "jul")) +
        ", about " + Math.floor(lmt) + ":" + String(Math.round((lmt % 1) * 60)).padStart(2, "0") + " local time" + "</td><td class=\"num\">" + beta.toFixed(2) + "°</td><td class=\"num\">" +
        (alt == null ? "—" : alt.toFixed(0) + "°") + '</td><td class="num">' + (dT == null ? "—" : dT.toFixed(1) + " h ± " + sg.toFixed(1) + " h") +
        '</td><td class="' + (ok ? "ks-g1" : "ks-g4") + '">' + (ok ? "reproduced" : "not reproduced") + "</td></tr>");
    });
    /* Jupiter and Saturn in 7 BCE: three conjunctions in one year, in Mīna */
    var conj = [], prev = null;
    for (var t = julMs(-6, 1, 1); t < julMs(-5, 3, 1); t += DAY) {
      var dd = sdiff(K.longitude("Guru", t), K.longitude("Śani", t));
      if (prev != null && (prev < 0) !== (dd < 0) && Math.abs(dd) < 5) conj.push(t);
      prev = dd; }
    var S = shiftOf(julMs(-6, 6, 1));
    rows.push("<tr><td><b>The triple conjunction of 7 BCE</b><br><span class=\"elw\">Jupiter and Saturn three times in one year; the modern reconstruction (Kepler onward) " +
      "dates them about 29 May, 1 October and 5 December</span></td><td>7 BCE<br><span class=\"elw\">three conjunctions in Pisces</span></td><td>" +
      conj.map(function (c) { return esc(civilText(c, "jul")); }).join(", ") + '</td><td class="num" colspan="3">in ' +
      (conj.length ? inSign(norm(K.longitude("Guru", conj[0]) + S)).replace(/<[^>]+>/g, "") : "—") + "</td><td class=\"" + (conj.length === 3 ? "ks-g1" : "ks-g4") + "\">" +
      (conj.length === 3 ? "reproduced" : "not reproduced") + "</td></tr>");
    /* the tradition's own premise at the Kali epoch: every mean graha at Meṣa 0° */
    var tk = (588465.5 - 2440587.5) * 86400000, Sk = shiftOf(tk), Lk = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].map(function (b) { return norm(K.longitude(b, tk) + Sk); });
    var srt = Lk.slice().sort(function (a, b) { return a - b; }), span = 360, from = 0, to = 0;
    for (var i = 0; i < srt.length; i++) { var nx = i === srt.length - 1 ? srt[0] + 360 : srt[i + 1], gap = nx - srt[i];
      if (360 - gap < span) { span = 360 - gap; from = norm(nx); to = srt[i]; } }
    rows.push("<tr><td><b>The Kali epoch</b><br><span class=\"elw\">The Sūrya Siddhānta's premise: every mean graha together at Meṣa 0° at midnight, Laṅkā, " +
      "18 Feb 3102 BCE</span></td><td>18 February 3102 BCE<br><span class=\"elw\">a computed epoch, not an observation</span></td><td>the seven true grahas lie within " +
      span.toFixed(0) + "°, from " + inSign(from).replace(/<[^>]+>/g, "") + " to " + inSign(to).replace(/<[^>]+>/g, "") +
      '</td><td class="num" colspan="3">—</td><td class="ks-g2">a loose gathering about Meṣa 0°, not a conjunction at it</td></tr>');
    host.innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>event</th><th>the record</th><th>Kālasetu</th><th>Moon from the ecliptic</th>' +
      "<th>altitude there</th><th>ΔT then</th><th>verdict</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    $("ks-historynote").innerHTML = "These records lie in 763 – 7 BCE, inside DE422's span; the Moon everywhere is measured against JPL DE431. " +
      "A caveat: ΔT for these centuries was itself worked out from eclipse records like these, so the time of day is not an independent test; " +
      "the day, and the Moon's distance from the ecliptic that makes it an eclipse at all, are. " +
      "Before 3000 BCE no written record survives that dates itself independently, so the deep fits are checked against the integration " +
      "and DE422 (the tables above), not against observations. The Kali-epoch row tests the tradition, not the engine: the Siddhānta's " +
      "grand conjunction at Meṣa 0° is a construction of its mean motions; the sky Kālasetu reconstructs for that night has the seven grahas " +
      "gathered loosely about Meṣa 0°, within " + span.toFixed(0) + "°, with Saturn furthest back.";
  }
  function fmtH(sec) { var h = sec / 3600; return h < 1 ? Math.round(sec / 60) + " min" : h < 48 ? h.toFixed(h < 10 ? 1 : 0) + " h" : (h / 24).toFixed(1) + " days"; }
  function measure() {
    var from = +$("ks-from").value, to = +$("ks-to").value, N = +$("ks-n").value;
    if (!(to > from)) { $("ks-measure").innerHTML = '<p class="swfail">“To” must be after “From”.</p>'; return; }
    var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani", "Rāhu"], ks = {}, ss = {};
    SA.forEach(function (b) { ks[b] = []; ss[b] = []; });
    for (var i = 0; i < N; i++) {
      var f = (i + 0.37) / N, y = from + (to - from) * f, Y = Math.floor(y), frac = y - Y;
      var ms = msFor(Y, 1, 1, 0, 0) + frac * 365.2425 * 86400000 + ((i * 7919) % 1440) * 60000;
      var jd = jdOf(ms), lah = window.__ayanFor("lahiri", jd), sam = window.__ayanFor("samanvaya_ecliptic", jd);
      SA.forEach(function (b) {
        var trop = b === "Rāhu" ? window.__kNodesModern(ms).mean
          : window.__kEclipModern(G.filter(function (g) { return g[0] === b; })[0][1], ms).trop;
        ks[b].push(sdiff(K.longitude(b, ms), norm(trop - sam)) * 60);
        if (S) { var q = S.trueLongitude(b, S.ahargana(ms)); if (q) ss[b].push(sdiff(q.lon, norm(trop - lah)) * 60); }
      });
    }
    var rms = function (a) { return a.length ? Math.sqrt(a.reduce(function (s, x) { return s + x * x; }, 0) / a.length) : null; };
    $("ks-measure").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th><th>fitted Sūrya Siddhānta</th>' +
      "<th>ratio</th></tr></thead><tbody>" + SA.map(function (b) {
        var a = rms(ks[b]), c = rms(ss[b]);
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(a) + "</td><td>" + (c == null ? "—" : (c > 120 ? (c / 60).toFixed(1) + "°" : am(c))) +
          "</td><td>" + (a && c ? "×" + (c / a).toFixed(c / a < 10 ? 1 : 0) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    $("ks-measurenote").innerHTML = N + " moments between " + yearLabel(from) + " and " + yearLabel(to) +
      ", typical (rms) difference from the modern engine. The fitted Sūrya Siddhānta tier was fitted on 1800–2200; " +
      "try a span far from it to see why a fourth engine was needed" + (from < 1000 ? ". Before 1000 CE part of every figure here is the modern engine's own error (see the era table)" : "") +
      ". Years are astronomical: 0 is 1 BCE, −12999 is 13000 BCE.";
  }

  /* ---- the Moon's terms ------------------------------------------------------------ */
  /* Meeus, Astronomical Algorithms, Table 47.A, in degrees — the size of each
     term, compared by magnitude because this engine counts the Moon's anomaly
     from the apogee (as the texts do), which flips the sign of every term odd
     in it. null where the term is below that table's printed precision. */
  var MEEUS = [6.288774, 1.274027, 0.658314, 0.185116, 0.213618, 0.114332, 0.058793, 0.057066, 0.053322, 0.045758,
    0.040923, 0.034720, 0.030383, 0.015327, 0.010980, 0.012528, 0.010675, 0.010034, 0.008548, 0.004036, 0.006766,
    0.004987, 0.005163, 0.007888, 0.002689, 0.003665, 0.003994, 0.002069, 0.002390, null, 0.003861, 0.001215, null,
    0.002120, 0.002348, null];
  var GROUPS = [["manda", "the manda equation (the text's own correction)", function (i) { return i === 0; }],
                ["cs", "Candraśekhara's three: evection, variation, annual equation", function (i) { return i >= 1 && i <= 3; }],
                ["modern", "the further terms of the modern series", function (i) { return i >= 4; }]];
  var MOONSET = null;
  function moonSamples() {
    if (MOONSET) return MOONSET;
    MOONSET = [];
    for (var i = 0; i < 200; i++) {
      var y = 1000 + 2000 * (i + 0.5) / 200, Y = Math.floor(y), ms = msFor(Y, 1, 1, 0, 0) + (y - Y) * 365.2425 * 86400000 + ((i * 6007) % 1440) * 60000;
      MOONSET.push({ ms: ms, t: K.trace("Candra", ms), ref: modSid("Candra", ms) });
    }
    return MOONSET;
  }
  function moonTerms() {
    var off = {};
    GROUPS.forEach(function (g) { var c = document.querySelector('[data-ks-group="' + g[0] + '"]'); off[g[0]] = c && !c.checked; });
    var drop = function (i) { return GROUPS.some(function (g) { return off[g[0]] && g[2](i); }); };
    var S2 = moonSamples(), err = [];
    S2.forEach(function (s) {
      var L = s.t.lon;
      s.t.terms.forEach(function (x) { if (drop(x.i)) L -= x.deg; });
      err.push(sdiff(L, s.ref) * 60);
    });
    var r = Math.sqrt(err.reduce(function (a, x) { return a + x * x; }, 0) / err.length);
    var anyOff = Object.keys(off).some(function (k) { return off[k]; });
    $("ks-moonerr").innerHTML = '<p class="ks-moonbig">With ' + (anyOff ? "the chosen terms switched off" : "every term") +
      ", the Moon is typically <b>" + (r > 120 ? (r / 60).toFixed(2) + "°" : am(r)) + "</b> from the modern engine over 1000–3000 CE" +
      " (200 moments). That is " + (r * 60 * 0.101 < 60 ? (r * 60 * 0.101).toFixed(0) + " days" : (r * 60 * 0.101 / 365.25).toFixed(1) + " years") +
      " of Viṃśottarī on the cycle average, and " + (100 * r / 200).toFixed(r < 20 ? 1 : 0) + "% of a pāda.</p>";
    var amp = (D.params && D.params["Candra"]) || {};
    var t = S2[0].t;
    $("ks-moontab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>#</th><th>argument</th><th>what it is</th>' +
      "<th>Kālasetu’s amplitude</th><th>textbook</th><th>from</th></tr></thead><tbody>" + t.terms.map(function (x) {
        var a = amp["L" + x.i];
        return "<tr" + (drop(x.i) ? ' style="opacity:.45"' : "") + "><td>" + (x.i + 1) + "</td><td>sin(" + esc(argText(x.arg)) + ")</td><td>" +
          esc(LNAME[x.i] || "") + "</td><td class=\"num\">" + (a == null ? "—" : Math.abs(a).toFixed(4) + "°") + "</td><td class=\"num\">" +
          (MEEUS[x.i] == null ? "—" : MEEUS[x.i].toFixed(4) + "°") + "</td><td>" + esc(LSRC(x.i)) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="k-note">The amplitudes were measured by the fit, not copied in, so a column agreeing with the textbook is a check on the fit. ' +
      "The annual equation comes out a little larger (0.19° against 0.185°) because the Earth's orbit was more eccentric over most of the span " +
      "than it is today. Textbook values: Meeus, Table 47.A. Latitude carries 19 further terms.</p>";
  }

  /* ---- charts across the span ------------------------------------------------------- */
  function lineChart(host, series, opt) {
    var W = 640, H = opt.H || 210, L = 52, B = 30, T = 12, xs = series[0].pts.map(function (p) { return p[0]; });
    var x0 = opt.x0 != null ? opt.x0 : Math.min.apply(null, xs), x1 = opt.x1 != null ? opt.x1 : Math.max.apply(null, xs);
    var all = []; series.forEach(function (s) { s.pts.forEach(function (p) { all.push(p[1]); }); });
    var y0 = opt.y0 != null ? opt.y0 : Math.min.apply(null, all), y1 = opt.y1 != null ? opt.y1 : Math.max.apply(null, all);
    if (y1 === y0) y1 = y0 + 1;
    var X = function (x) { return L + (W - L - 8) * (x - x0) / (x1 - x0); }, Y = function (y) { return H - B - (H - B - T) * (y - y0) / (y1 - y0); };
    var h = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opt.label) + '">'];
    for (var g = 0; g <= 4; g++) { var v = y0 + (y1 - y0) * g / 4;
      h.push('<line class="ks-ax" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - 8) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ks-axt" x="' + (L - 4) +
        '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + opt.fy(v) + "</text>"); }
    (opt.xt || []).forEach(function (x) { h.push('<text class="ks-axt" x="' + X(x).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(opt.fx(x)) + "</text>"); });
    series.forEach(function (s) {
      h.push('<path class="' + s.cls + '" d="' + s.pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join("") + '"/>');
    });
    if (opt.mark != null) h.push('<line class="ks-mark" x1="' + X(opt.mark).toFixed(1) + '" y1="' + T + '" x2="' + X(opt.mark).toFixed(1) + '" y2="' + (H - B) + '"/>');
    h.push("</svg>");
    host.innerHTML = h.join("") + (opt.legend ? '<p class="ks-legend">' + opt.legend + "</p>" : "");
  }
  var YT = [-12999, -9999, -6999, -3999, -999, 2000];
  var GI_CACHE = null;
  function gi() {
    if (!GI_CACHE) {
      GI_CACHE = { sa: [], ju: [] };
      for (var i = 0; i <= 260; i++) {
        var y = 1000 + 2600 * i / 260, Y = Math.floor(y), ms = msFor(Y, 7, 1, 0, 0);
        GI_CACHE.sa.push([y, sdiff(K.longitude("Śani", ms), modSid("Śani", ms)) * 60]);
        GI_CACHE.ju.push([y, sdiff(K.longitude("Guru", ms), modSid("Guru", ms)) * 60]);
      }
    }
    var Y0 = new Date(ST.ms).getUTCFullYear(), all = GI_CACHE.sa.concat(GI_CACHE.ju).map(function (p) { return Math.abs(p[1]); });
    var top = Math.max(5, Math.ceil(Math.max.apply(null, all)));
    lineChart($("ks-gi"), [{ cls: "ks-l1", pts: GI_CACHE.sa }, { cls: "ks-l2", pts: GI_CACHE.ju }],
      { label: "Jupiter and Saturn: Kālasetu minus the modern engine, 1000–3600 CE", fy: function (v) { return (Math.abs(v) < 0.05 ? 0 : v).toFixed(1) + "′"; },
        fx: yearLabel, xt: [1000, 1500, 2000, 2500, 3000, 3500], y0: -top, y1: top, mark: Y0 >= 1000 && Y0 <= 3600 ? Y0 : null,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Śani</span><span><i style="background:var(--sem-bad,#a1493a)"></i>Guru (dashed)</span><span>arcminutes; gold line: the moment chosen above</span>' });
    var w = function (a) { return Math.max.apply(null, a.map(function (p) { return Math.abs(p[1]); })); };
    $("ks-ginote").innerHTML = "Over these 261 moments Saturn never strays more than " + am(w(GI_CACHE.sa)) + " from the modern engine and Jupiter " +
      am(w(GI_CACHE.ju)) + ". The great inequality and its companions are carried as about 170 measured terms for each planet. Their sum is what the fit " +
      "measures; individually some of them trade against the orbit itself, so no single term is offered here as a physical size.";
  }
  /* How well ΔT is KNOWN, not just what it is. Two published estimates of its
     standard error, which disagree, and the disagreement is the point:
       – Morrison & Stephenson (2004): σ ≈ 0.8 t² s, t in centuries from 1820 —
         stated by its authors for 1000 BCE to 1200 CE only;
       – Huber (2000), a random walk in the length of day calibrated on
         −500 to +2000: σ = 365.25 N √((N Q / 3)(1 + N / M)) / 1000 s, with
         N years before −500, M = 2500, Q = 0.058 ms²/yr.
     Both as given on NASA's eclipse pages (Espenak). Before 720 BCE there are
     no timed eclipses at all, so every figure there is extrapolation. */
  function sigmaMS(y) { var t = (y - 1820) / 100; return 0.8 * t * t; }
  function sigmaHuber(y) { var N = -500 - y; if (N <= 0) return null;
    return 365.25 * N * Math.sqrt((N * 0.058 / 3) * (1 + N / 2500)) / 1000; }
  var DT_CACHE = null;
  function deltaT() {
    if (!DT_CACHE) { DT_CACHE = { dt: [], hu: [], ms: [] };
      for (var i = 0; i <= 240; i++) { var y = -12999 + 16599 * i / 240, ms = msFor(Math.floor(y), 7, 1, 0, 0), h = 0;
        try { var t = window.Astronomy.MakeTime(new Date(ms)); h = (t.tt - t.ut) * 24; } catch (e) {}
        DT_CACHE.dt.push([y, h]);
        var su = sigmaHuber(y); DT_CACHE.hu.push([y, su == null ? 0 : su / 3600]);
        DT_CACHE.ms.push([y, sigmaMS(y) / 3600]); } }
    var Y0 = new Date(ST.ms).getUTCFullYear(), here = null;
    try { var t0 = window.Astronomy.MakeTime(new Date(ST.ms)); here = (t0.tt - t0.ut) * 24; } catch (e) {}
    lineChart($("ks-dt"), [{ cls: "ks-l1", pts: DT_CACHE.dt }, { cls: "ks-l2", pts: DT_CACHE.hu }, { cls: "ks-l3", pts: DT_CACHE.ms }],
      { label: "ΔT across the span and how well it is known, in hours", fy: function (v) { return v.toFixed(0) + " h"; }, fx: yearLabel, xt: YT, y0: 0,
        mark: Y0 >= -12999 && Y0 <= 3600 ? Y0 : null,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>ΔT, as the modern engine models it</span>' +
          '<span><i style="background:var(--sem-bad,#a1493a)"></i>its uncertainty, Huber (dashed)</span>' +
          '<span><i style="background:var(--accent,#c9a24b)"></i>its uncertainty, Morrison &amp; Stephenson (dotted)</span>' });
    var sH = sigmaHuber(Y0), sM = sigmaMS(Y0);
    var moon = function (sec) { return (sec * 0.549 / 3600); }, earth = function (sec) { return sec / 240; };
    $("ks-dtnote").innerHTML = (here == null ? "" : "At the moment chosen above, ΔT is <b>" + (Math.abs(here) < 0.2 ? (here * 3600).toFixed(0) + " seconds" :
      here.toFixed(2) + " hours") + "</b>, which Kālasetu applies exactly as the modern engine does. ") +
      "<b>How well that figure is known</b> is another matter. " +
      (Y0 < 1200 ? "Here the two published estimates of its error are " + (sH == null ? "" : "<b>±" + (sH / 3600).toFixed(1) + " h</b> (Huber) and ") +
        "<b>±" + (sM / 3600).toFixed(sM < 3600 ? 2 : 1) + " h</b> (Morrison &amp; Stephenson" + (Y0 < -1000 ? ", stated only from 1000 BCE, so extrapolated here" : "") + "). " +
        "An error of " + ((sH || sM) / 3600).toFixed(1) + " h moves the Moon by about <b>" + moon(sH || sM).toFixed(1) + "°</b> and the Earth's turn — the lagna — by about <b>" +
        earth(sH || sM).toFixed(0) + "°</b>. " : "In this era it is known to seconds or minutes, from telescopic and modern timing. ") +
      "Before 720 BCE there is no timed eclipse to measure it from, so every value there is extrapolation; and the Earth, still rebounding " +
      "from the weight of the Ice Age ice sheets, was changing its own rotation as it did. This is a limit on what anyone can know about a clock-time moment, not on Kālasetu: the engine places " +
      "the grahas for a given moment of uniform time to arcminutes.";
  }
  function nodes() {
    var ms0 = ST.ms, pk = [], pm = [], DAY = 86400000;
    for (var i = 0; i <= 146; i++) {
      var ms = ms0 + (i - 73) * 2.5 * DAY, jd = jdOf(ms), N = window.__kNodesModern(ms), ay = window.__ayanFor("samanvaya_ecliptic", jd);
      pk.push([(i - 73) * 2.5, sdiff(K.trueNode(ms), K.longitude("Rāhu", ms))]);
      pm.push([(i - 73) * 2.5, sdiff(norm(N.true - ay), norm(N.mean - ay))]);
    }
    lineChart($("ks-node"), [{ cls: "ks-l2", pts: pm }, { cls: "ks-l1", pts: pk }],
      { label: "True minus mean node over a year", fy: function (v) { return (Math.abs(v) < 0.05 ? 0 : v).toFixed(1) + "°"; }, fx: function (x) { return (x > 0 ? "+" : "") + x + " d"; },
        xt: [-180, -90, 0, 90, 180], mark: 0,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Kālasetu</span><span><i style="background:var(--sem-bad,#a1493a)"></i>modern engine (dashed)</span><span>true node minus mean node, degrees, over ±180 days</span>' });
    var dif = pk.map(function (p, i) { return Math.abs(p[1] - pm[i][1]) * 60; });
    var yN = new Date(ms0).getUTCFullYear();
    $("ks-nodenote").innerHTML = (yN >= 1000 ? "The two curves lie on top of each other: over this year they differ by at most " + am(Math.max.apply(null, dif)) + ". "
      : "Over this year the two differ by up to " + am(Math.max.apply(null, dif)) + ": this far back the modern engine's Moon, and so its node, has drifted (see the era table). ") +
      "The largest swing is the 2D − 2F term, about 1.5°, half a synodic-draconitic cycle of 173 days.";
  }

  /* ---- what it costs -------------------------------------------------------------------- */
  function span(days) { var d = Math.abs(days);
    if (d * 1440 < 1) return "under a minute"; if (d < 1 / 24) return Math.round(d * 1440) + " min";
    if (d < 1.5) return (d * 24).toFixed(1) + " h"; return d.toFixed(1) + " days"; }
  function cost() {
    var R = D.residuals;
    $("ks-cost").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>typical error</th><th>share of a pāda</th>' +
      "<th>share of a D60 aṃśa</th><th>moves a sign or nakṣatra change by</th></tr></thead><tbody>" + ROWS.map(function (b) {
        var x = R[b]; if (!x) return ""; var e = (x.de || x.holdout).rms;
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(e) + "</td><td>1 ⁄ " + Math.round(200 / e) + "</td><td>1 ⁄ " + (30 / e).toFixed(30 / e < 10 ? 1 : 0) +
          "</td><td>" + span(e / 60 / MEANMOT[b]) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var m = (R["Candra"].de || R["Candra"].holdout).rms;
    $("ks-costnote").innerHTML = "These are the Core fit's figures inside DE422 (3000 BCE – 3000 CE); for any other era read the table above. Through the Moon, every Viṃśottarī date moves by about <b>" + (m * 60 * 0.101).toFixed(1) +
      " days</b> on the cycle average (0.101 days of daśā per arcsecond of Moon), and a tithi's end by about " + span(m / 60 / 12.19) +
      ". For comparison, one minute of uncertainty in a birth time moves the Moon about 33″ — so Kālasetu's own error is worth about " +
      (m * 60 / 33).toFixed(0) + " minutes of birth time. Inside 1000–3000 CE the modern engine's Moon is also good to about an arcminute; Kālasetu is " +
      "for the span where nothing else on the site holds.";
  }

  /* ---- how it was built --------------------------------------------------------------------- */
  function built() {
    var n = 0, sets = SETN.map(docOf).filter(Boolean);
    sets.forEach(function (d) { Object.keys(d.params).forEach(function (b) { n += Object.keys(d.params[b]).length; }); });
    var T = D.terms || {};
    $("ks-built").innerHTML = '<ul class="ks-limits">' +
      "<li><b>" + n.toLocaleString("en") + " fitted numbers</b> in three files (<code>kalasetu.json</code>, <code>kalasetu-early.json</code>, <code>kalasetu-deep.json</code>), " +
      "each: corrections on the text's mean motions, each orbit's apogee, eccentricity, node and inclination and their drift, " + T.lunar + " lunar longitude terms and " + T.lunarLat + " latitude terms, " + T.trueNode + " true-node terms, " +
      T.gs + " Jupiter–Saturn terms and " + T.mars + " for Mars; and the IAU 1980 nutation on every graha.</li>" +
      "<li><b>The reference:</b> JPL DE422 from about 3000 BCE to 3000 CE, read from its own Chebyshev coefficients; outside that, a numerical integration of the Sun, Moon and nine planets " +
      "started from DE422's states, with DE422's masses, the Sun's relativistic term, the Earth's oblateness and the Moon's tidal slowing. " +
      sets.map(function (d) { return d.samples.total.toLocaleString("en") + " moments across " + esc(d.span.label); }).join("; ") +
      ", each split by a hash of the instant into halves to fit and to hold back; every accuracy on this page is a held-back half. " +
      "The Moon and true node in every set are fitted on JPL DE431 (Folkner et al. 2014, an integrated lunar orbit with the tidal dissipation, 13201 BCE – 17191 CE), read from the Swiss Ephemeris files; it differs from DE422's Moon by about 4′ at 3000 BCE. The Moon and node take the Sun's frame tilt, the correction for an ecliptic of date that is itself extrapolated before 3000 BCE.</li>" +
      "<li><b>The optimiser:</b> Levenberg–Marquardt, staged per graha — epoch and bīja first, then the orbit, then everything. The linear amplitudes take " +
      "their derivatives in closed form from the engine itself, which is what makes fitting 172 Jupiter–Saturn terms a matter of seconds.</li>" +
      "<li><b>The check:</b> <code>kalasetu-verify</code> holds every graha under a ceiling on a fresh 1,800 moments across all sixteen millennia, drawn with a " +
      "different seed from every fit's, refuses any 600-year band that runs away from the rest, confirms the frame is engine.js's own to the digit, and that switching the Sūrya " +
      "Siddhānta between its tiers leaves Kālasetu bit-identical.</li>" +
      "<li><b>Generated</b> " + esc(D.generated) + ". The engine is <code>kalasetu-engine.js</code>, standalone, loaded on every page.</li></ul>";
  }

  /* ---- wiring ------------------------------------------------------------------------------------- */
  /* The table, the wheel and the steps follow the moment at once; the three
     span-wide charts (which only move their marker, or sample a year of nodes)
     wait until the moment settles, so scrolling and playing stay smooth. */
  function redrawMoment() {
    sky(); steps();
    clearTimeout(ST.heavy);
    ST.heavy = setTimeout(function () { deltaT(); nodes(); gi(); }, 250);
    if (!ST.scrubbing) resetScrub();
  }

  /* ---- scrolling through time ----------------------------------------------------
     A step moves the CLOCK reading by a calendar unit (a month is a month, not
     30 days), at the place, so the date fields stay on whole days and months;
     the instant follows from the clock as everywhere else on the page. The
     slider reaches N units either side of where it was picked up. */
  var SPAN0 = Date.UTC(-12999, 0, 1), SPAN1 = Date.UTC(3600, 11, 31, 23, 59);
  var REACH = { hour: 72, day: 366, month: 120, year: 200, decade: 120, century: 166 };
  var UNIT_NAME = { hour: ["hour", "hours"], day: ["day", "days"], month: ["month", "months"], year: ["year", "years"],
                    decade: ["decade", "decades"], century: ["century", "centuries"] };
  function shifted(ms, unit, k) {
    var off = offsetAt(ms) * 3600000, t = new Date(ms + off);
    if (unit === "hour") t = new Date(t.getTime() + k * 3600000);
    else if (unit === "day") t.setUTCDate(t.getUTCDate() + k);
    else {
      /* by calendar months, keeping the day where the month has it: 31 January
         plus a month is the last day of February, not 2 March */
      var months = unit === "month" ? k : 12 * k * (unit === "year" ? 1 : unit === "decade" ? 10 : 100);
      var y = t.getUTCFullYear(), m = t.getUTCMonth() + months, day = t.getUTCDate();
      y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
      var last = new Date(Date.UTC(2000, m + 1, 0)); last.setUTCFullYear(y, m + 1, 0);
      var u = new Date(t.getTime()); u.setUTCFullYear(y, m, Math.min(day, last.getUTCDate()));
      t = u;
    }
    var local = t.getTime(), ut = local - offsetAt(local) * 3600000;
    ut = local - offsetAt(ut) * 3600000;
    return Math.max(SPAN0, Math.min(SPAN1, ut));
  }
  function unitNow() { return $("ks-unit").value; }
  function resetScrub() {
    var r = $("ks-scrub"); if (!r) return;
    var n = REACH[unitNow()];
    r.min = -n; r.max = n; r.value = 0; ST.anchor = ST.ms;
    scrubLabel(0);
  }
  function scrubLabel(k) {
    var u = UNIT_NAME[unitNow()], el = $("ks-scrubread"); if (!el) return;
    el.textContent = k === 0 ? "drag to move up to " + REACH[unitNow()] + " " + u[1] + " either way"
      : (k > 0 ? "+" : "−") + Math.abs(k) + " " + (Math.abs(k) === 1 ? u[0] : u[1]) + " from where you started";
  }
  function stepBy(k) {
    var ms = shifted(ST.ms, unitNow(), k);
    if (ms === ST.ms) { stopPlay(); return false; }
    writeWhen(ms); redrawMoment(); return true;
  }
  function stopPlay() {
    if (ST.play) { clearInterval(ST.play); ST.play = null; }
    document.querySelectorAll("[data-ks-play]").forEach(function (b) { b.textContent = "Play"; b.setAttribute("aria-pressed", "false"); });
  }
  function togglePlay() {
    if (ST.play) { stopPlay(); return; }
    document.querySelectorAll("[data-ks-play]").forEach(function (b) { b.textContent = "Pause"; b.setAttribute("aria-pressed", "true"); });
    ST.play = setInterval(function () { if (!stepBy(1)) stopPlay(); }, 400);
  }
  /* ---- the claim search ----------------------------------------------------------
     A claim from the catalogue (the "Kālasetu Claim Catalogue" sheet), or one the
     reader builds, is a list of exact conditions. Each reading of a catalogue
     claim is searched on its own and never merged with another. The search walks
     the range one condition at a time, slowest graha first, and keeps only the
     stretches where that condition holds; every later, faster condition is
     looked for only inside them. A condition that is false says how far its
     graha is from making it true, so the walk skips ahead by that distance over
     the graha's fastest motion and never steps over a match. Everything runs in
     this browser; a reader's own claim is kept only if they tick the box, and
     then only in their own browser. */
  var CL_RS = RS, CL_NAKX = NAK.concat(["Abhijit"]);
  var VMAX = { "Sūrya": 1.03, "Candra": 15.6, "Maṅgala": 0.8, "Budha": 2.25, "Guru": 0.25, "Śukra": 1.3, "Śani": 0.14, "Rāhu": 0.25, "Ketu": 0.25 };
  var STEP = { "Sūrya": 1, "Candra": 0.1, "Maṅgala": 1, "Budha": 0.5, "Guru": 4, "Śukra": 1, "Śani": 4, "Rāhu": 4, "Ketu": 4 };
  /* the usual exaltation and own signs of the seven; the nodes have none here, as sources disagree on them */
  var EXALT = { "Sūrya": 0, "Candra": 1, "Maṅgala": 9, "Budha": 5, "Guru": 3, "Śukra": 11, "Śani": 6 };
  var OWN = { "Sūrya": [4], "Candra": [3], "Maṅgala": [0, 7], "Budha": [2, 5], "Guru": [8, 11], "Śukra": [1, 6], "Śani": [9, 10] };
  var GN = G.map(function (g) { return g[0]; });
  /* the catalogue's searchable readings; the ids, references and wording follow
     the sheet. Claims no search can test stay in the sheet and are not offered here. */
  var CLAIMS = [
    { id: "C24", event: "Kṛṣṇa sets out on the peace embassy to Hastināpura", ref: "MBh 5.83.7 (Ganguli §83; numbered 5.81 in the critical edition)", sky: "the Kaumuda month, Moon in Revatī, at the end of autumn",
      note: "Kaumuda is read as Kārttika by most, as Āśvina (the Kaumudī full moon) by some; both are offered. A and B recur every year; C and D add the season the verse names (śaradante himāgame, the end of autumn as winter comes), which ties the month to the Sun's tropical place and so to an era.", readings: [
      { id: "A", label: "Kārttika, with Candra in Revatī", conds: [{ g: "", rel: "month", v: 7 }, { g: "Candra", rel: "nak", v: 26 }] },
      { id: "B", label: "Āśvina, with Candra in Revatī", conds: [{ g: "", rel: "month", v: 6 }, { g: "Candra", rel: "nak", v: 26 }] },
      { id: "C", label: "Kārttika, Candra in Revatī, at the end of śarad: the Sun within 15° of the śarad–hemanta boundary (tropical 195°–225°)", cap: 20000,
        conds: [{ g: "", rel: "month", v: 7 }, { g: "Candra", rel: "nak", v: 26 }, { g: "Sūrya", rel: "_trop", v: [195, 30] }] },
      { id: "D", label: "Āśvina, Candra in Revatī, at the end of śarad (the Sun at tropical 195°–225°)", cap: 20000,
        conds: [{ g: "", rel: "month", v: 6 }, { g: "Candra", rel: "nak", v: 26 }, { g: "Sūrya", rel: "_trop", v: [195, 30] }] }] },
    { id: "C28", event: "Indra and Skanda: Abhijit has fallen from the sky, Dhaniṣṭhā is made the start of time", ref: "MBh 3.219.8–11 (critical edition; Ganguli §230)", sky: "Abhijit fell; time was made to begin with Dhaniṣṭhā; Rohiṇī was first before; the Kṛttikās went to heaven",
      note: "A myth whose sky meaning is an interpretation: the start of the year, or of the nakṣatra list, moving with the solstices and equinoxes (precession). Each reading is one interpretation, chosen before searching; each gives an era of centuries, not a day.", readings: [
      { id: "A", label: "time begins with Dhaniṣṭhā: the winter solstice in Dhaniṣṭhā (the Vedāṅga Jyotiṣa's year-start)", cap: 20000, conds: [{ g: "winter solstice", rel: "pt", v: 22 }] },
      { id: "B", label: "Rohiṇī was first before: the vernal equinox in Rohiṇī", cap: 20000, conds: [{ g: "vernal equinox", rel: "pt", v: 3 }] },
      { id: "C", label: "the Kṛttikās head the list: the vernal equinox in Kṛttikā", cap: 20000, conds: [{ g: "vernal equinox", rel: "pt", v: 2 }] },
      { id: "D", label: "A and C together: the winter solstice in Dhaniṣṭhā and the vernal equinox in Kṛttikā", cap: 20000, conds: [{ g: "winter solstice", rel: "pt", v: 22 }, { g: "vernal equinox", rel: "pt", v: 2 }] }] },
    { id: "C29", event: "The Anugītā: Brahmā on what comes first — day before night, the bright fortnight first, the nakṣatras from Śraviṣṭhā, the seasons from śiśira", ref: "MBh 14.44.2 (critical edition; the vulgate reads śravaṇādīni)", sky: "the nakṣatras begin with Śraviṣṭhā (Dhaniṣṭhā), the seasons with śiśira",
      note: "Śiśira begins at the winter solstice, so a year that starts with śiśira and with Śraviṣṭhā puts the solstice there, as the Vedāṅga Jyotiṣa does ('at the beginning of Śraviṣṭhā'). The critical edition reads Śraviṣṭhā; the vulgate Śravaṇa, a later position. Eras, not days; they move by about a century with the frame and the nakṣatra boundaries.", readings: [
      { id: "A", label: "the critical edition: the winter solstice in Dhaniṣṭhā (Śraviṣṭhā)", cap: 20000, conds: [{ g: "winter solstice", rel: "pt", v: 22 }] },
      { id: "B", label: "\"beginning with\" read strictly: the winter solstice in the first quarter of Dhaniṣṭhā", cap: 20000, conds: [{ g: "winter solstice", rel: "pt", v: 22, part: [0, 0.25] }] },
      { id: "C", label: "the vulgate: the winter solstice in Śravaṇa", cap: 20000, conds: [{ g: "winter solstice", rel: "pt", v: 21 }] }] },
    { id: "C01", def: "J", event: "Before the war: Karṇa tells Kṛṣṇa the omens, after the peace embassy fails", ref: "MBh 5.141.7–10", sky: "four omens in one speech: Saturn afflicts Rohiṇī; Mars retrograde at Jyeṣṭhā toward Anurādhā; a graha afflicts Citrā; Rāhu will approach the Sun",
      note: "One meeting, one continuous speech: until 19 Nov 2026 these four verses were four claims (C01–C04). Each verse keeps its own readings; G and H ask for some of them together; J asks for everything the meeting states (opened by default), K the same with Maṅgala read without retrograde. Not testable, so left out: the Moon's spot turned, meteors, a black ring round the Sun, red horizons. I is Kṛṣṇa's line just before Karṇa's reply, in the same conversation. It cannot hold with C or D a week apart: Maṅgala retrograde stands opposite the Sun, so with Maṅgala in Jyeṣṭhā the Sun is near Rohiṇī, and a new moon in Jyeṣṭhā needs the Sun there.", readings: [
      { id: "A", label: "5.141.7 · Śani inside Rohiṇī's division", conds: [{ g: "Śani", rel: "nak", v: 3 }] },
      { id: "B", label: "5.141.7 · Śani within 5° of Aldebaran, Rohiṇī's junction star", conds: [{ g: "Śani", rel: "nearstar", v: 3, tol: 5 }] },
      { id: "C", label: "5.141.8 · Maṅgala turns retrograde in Jyeṣṭhā", conds: [{ g: "Maṅgala", rel: "station", v: 17 }] },
      { id: "D", label: "5.141.8 · Maṅgala retrograde in Jyeṣṭhā, then retrograde in Anurādhā within 120 days", mode: "within", days: 120,
        conds: [{ g: "Maṅgala", rel: "retro", v: 17 }, { g: "Maṅgala", rel: "retro", v: 16 }] },
      { id: "E", label: "5.141.9 · any graha in Citrā (the results say which)", conds: [{ g: "any", rel: "nak", v: 13 }] },
      { id: "F", label: "5.141.10 · a solar eclipse (somewhere on Earth)", conds: [{ g: "", rel: "eclipse", v: "solar" }] },
      { id: "G", label: "together, at one moment: Śani in Rohiṇī's division and Maṅgala retrograde in Jyeṣṭhā (Citrā is left out: the Moon passes it every month)",
        conds: [{ g: "Śani", rel: "nak", v: 3 }, { g: "Maṅgala", rel: "retro", v: 17 }] },
      { id: "H", label: "together, within 180 days: Śani in Rohiṇī's division, Maṅgala retrograde in Jyeṣṭhā, and a solar eclipse (Rāhu \"will approach\" the Sun)", mode: "within", days: 180,
        conds: [{ g: "Śani", rel: "nak", v: 3 }, { g: "Maṅgala", rel: "retro", v: 17 }, { g: "", rel: "eclipse", v: "solar" }] },
      { id: "I", label: "Kṛṣṇa's line in the same meeting (5.140.18 in the critical edition; Ganguli §142): the new moon seven days on, in Śakra's nakṣatra — Amāvāsyā with Candra in Jyeṣṭhā",
        conds: [{ g: "", rel: "tithi", v: 30 }, { g: "Candra", rel: "nak", v: 17 }] },
      { id: "J", label: "the whole meeting, together (literal): within 10 days, Śani in Rohiṇī, Maṅgala retrograde in Jyeṣṭhā, a graha in Citrā, and the new moon in Jyeṣṭhā (Amāvāsyā with Candra in Jyeṣṭhā at one moment)", mode: "within", days: 10,
        conds: [{ g: "Śani", rel: "nak", v: 3 }, { g: "Maṅgala", rel: "retro", v: 17 }, { g: "any", rel: "nak", v: 13 },
                { g: "", rel: "_and", conds: [{ g: "", rel: "tithi", v: 30 }, { g: "Candra", rel: "nak", v: 17 }] }] },
      { id: "K", label: "the whole meeting, together, Maṅgala read as near Jyeṣṭhā and Anurādhā without retrograde: within 10 days, Śani in Rohiṇī, Maṅgala in Jyeṣṭhā or Anurādhā, a graha in Citrā, the new moon in Jyeṣṭhā", mode: "within", days: 10,
        conds: [{ g: "Śani", rel: "nak", v: 3 }, { g: "Maṅgala", rel: "nak", v: [16, 17] }, { g: "any", rel: "nak", v: 13 },
                { g: "", rel: "_and", conds: [{ g: "", rel: "tithi", v: 30 }, { g: "Candra", rel: "nak", v: 17 }] }] }] },
    { id: "C05", def: "N", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.2.23 – 6.3.29", sky: "the omens of one speech: a fire-coloured Kārttika full moon; Saturn on Rohiṇī, on Pūrva Phalgunī, near Viśākhā; Mars retrograde in Maghā and in Śravaṇa; Jupiter in Śravaṇa; two eclipses in one month",
      note: "One conversation, one speech: until 19 Nov 2026 these verses were eight claims (C05, C06, C07, C09, C10, C11, C12, C14). Each verse keeps its own readings; the eclipse readings are also checked as seen from the place set above (Kurukṣetra is 29.97°, 76.85°). They cannot all hold at once — the speech puts Saturn in three nakṣatras (Rohiṇī, Pūrva Phalgunī, Viśākhā), Mars in two (Maghā, Śravaṇa) and Jupiter in two (Śravaṇa, near Viśākhā) — so N, everything together, is refused before searching (it is what the claim opens on, so the reason is shown), and M, the two eclipse verses, is the part that can hold together.", readings: [
      { id: "A", label: "6.2.23 · a lunar eclipse in Kārttika", conds: [{ g: "", rel: "month", v: 7 }, { g: "", rel: "eclipse", v: "lunar" }] },
      { id: "B", label: "6.2.32 · Śani inside Rohiṇī's division", conds: [{ g: "Śani", rel: "nak", v: 3 }] },
      { id: "C", label: "6.2.32 · Śani within 5° of Aldebaran", conds: [{ g: "Śani", rel: "nearstar", v: 3, tol: 5 }] },
      { id: "D", label: "6.3.11 · a solar eclipse, and Śukra in Svātī, within 30 days", mode: "within", days: 30,
        conds: [{ g: "", rel: "eclipse", v: "solar" }, { g: "Śukra", rel: "nak", v: 14 }] },
      { id: "E", label: "6.3.11 · a solar eclipse, and Ketu in Svātī, within 30 days", mode: "within", days: 30,
        conds: [{ g: "", rel: "eclipse", v: "solar" }, { g: "Ketu", rel: "nak", v: 14 }] },
      { id: "F", label: "6.3.13 · Maṅgala retrograde in Maghā while Guru is in Śravaṇa", conds: [{ g: "Maṅgala", rel: "retro", v: 9 }, { g: "Guru", rel: "nak", v: 21 }] },
      { id: "G", label: "6.3.14 · Śani in Pūrva Phalgunī while Śukra is in Pūrva Bhādrapadā", conds: [{ g: "Śani", rel: "nak", v: 10 }, { g: "Śukra", rel: "nak", v: 24 }] },
      { id: "H", label: "6.3.14 · Śani in Pūrva Phalgunī while Śukra is in Uttara Bhādrapadā", conds: [{ g: "Śani", rel: "nak", v: 10 }, { g: "Śukra", rel: "nak", v: 25 }] },
      { id: "I", label: "6.3.17 · Maṅgala retrograde in Śravaṇa", conds: [{ g: "Maṅgala", rel: "retro", v: 21 }] },
      { id: "J", label: "6.3.25 · Guru and Śani both within 6° of Zubenelgenubi, Viśākhā's junction star",
        conds: [{ g: "Śani", rel: "nearstar", v: 15, tol: 6 }, { g: "Guru", rel: "nearstar", v: 15, tol: 6 }] },
      { id: "K", label: "6.3.25 · Guru within 6° of Śani, both in Viśākhā's division",
        conds: [{ g: "Śani", rel: "nak", v: 15 }, { g: "Guru", rel: "nak", v: 15 }, { g: "Guru", rel: "neargraha", v: "Śani", tol: 6 }] },
      { id: "L", label: "6.3.28–29 · a lunar and a solar eclipse within 15 days", mode: "within", days: 15,
        conds: [{ g: "", rel: "eclipse", v: "lunar" }, { g: "", rel: "eclipse", v: "solar" }] },
      { id: "M", label: "together (6.2.23 with 6.3.28–29): a lunar eclipse in Kārttika and a solar eclipse within 15 days", mode: "within", days: 15,
        conds: [{ g: "", rel: "_and", conds: [{ g: "", rel: "month", v: 7 }, { g: "", rel: "eclipse", v: "lunar" }] }, { g: "", rel: "eclipse", v: "solar" }] },
      { id: "N", label: "the whole speech, together (literal), within 30 days: every position above at once — the page refuses it, because the speech puts Śani and Guru in nakṣatras far apart", mode: "within", days: 30,
        conds: [{ g: "", rel: "_and", conds: [{ g: "", rel: "month", v: 7 }, { g: "", rel: "eclipse", v: "lunar" }] }, { g: "Śani", rel: "nak", v: 3 },
                { g: "", rel: "eclipse", v: "solar" }, { g: "Śukra", rel: "nak", v: 14 }, { g: "", rel: "_and", conds: [{ g: "Maṅgala", rel: "retro", v: 9 }, { g: "Guru", rel: "nak", v: 21 }] },
                { g: "Śani", rel: "nak", v: 10 }, { g: "Śukra", rel: "nak", v: 24 }, { g: "Maṅgala", rel: "retro", v: 21 },
                { g: "Śani", rel: "nak", v: 15 }, { g: "Guru", rel: "nak", v: 15 }] }] },
    { id: "C25", event: "The war's first day: the armies stand ready", ref: "MBh 6.17.2 (Ganguli §17)", sky: "the Moon had gone to the region of Maghā",
      note: "Alone it recurs every month: its use is in a chain, after the new moon of C01 I (which it contradicts: from a new moon in Jyeṣṭhā the Moon needs about 19 days to reach Maghā).", readings: [
      { id: "A", label: "Candra in Maghā", conds: [{ g: "Candra", rel: "nak", v: 9 }] }] },
    { id: "C26", event: "The war's last day: Balarāma returns from his pilgrimage to watch Bhīma and Duryodhana fight", ref: "MBh 9.34.6 (Ganguli §34)", sky: "forty-two days gone; he left on Puṣya and returned on Śravaṇa",
      note: "Alone each recurs every month: test it in the chain (Puṣya, then Śravaṇa 41–43 days later; or the war's new moon, then Śravaṇa on the eighteenth day).", readings: [
      { id: "A", label: "the return: Candra in Śravaṇa", conds: [{ g: "Candra", rel: "nak", v: 21 }] },
      { id: "B", label: "the departure, 42 days before: Candra in Puṣya", conds: [{ g: "Candra", rel: "nak", v: 7 }] }] },
    { id: "C27", event: "After the war: Bhīṣma gives up his life on the bed of arrows", ref: "MBh 13.167.26–28 (Ganguli §167; 13.153 in the critical edition)", sky: "the Sun has turned north; Māgha has come; the bright fortnight with a part remaining; fifty-eight nights on the arrows",
      note: "'Tribhāgaśeṣa' is read either as a quarter of the bright fortnight gone (Nīlakaṇṭha) or as a third of it left. 'The Sun has turned north' is read loosely (uttarāyaṇa) or as just past the winter solstice (within 30°). The fifty-eight nights belong in the chain: Bhīṣma fell on the tenth day of the war.", readings: [
      { id: "A", label: "Māgha, Śukla 3–5 (a quarter gone), in uttarāyaṇa", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: [3, 4, 5] }, { g: "", rel: "ayana", v: "uttara" }] },
      { id: "B", label: "Māgha, Śukla 9–11 (a third left), in uttarāyaṇa", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: [9, 10, 11] }, { g: "", rel: "ayana", v: "uttara" }] },
      { id: "C", label: "Māgha, Śukla 3–5, the Sun within 30° past the winter solstice", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: [3, 4, 5] }, { g: "Sūrya", rel: "_trop", v: [270, 30] }] },
      { id: "D", label: "Māgha, Śukla 9–11, the Sun within 30° past the winter solstice", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: [9, 10, 11] }, { g: "Sūrya", rel: "_trop", v: [270, 30] }] }] },
    { id: "C15", event: "After the war: Vyāsa fixes Yudhiṣṭhira's consecration for the Aśvamedha", ref: "MBh 14.71.4", sky: "Caitra full moon", readings: [
      { id: "A", label: "Pūrṇimā in Caitra (recurs every year: useful once a year is fixed)", conds: [{ g: "", rel: "month", v: 0 }, { g: "", rel: "tithi", v: 15 }] }] },
    { id: "C16", event: "After the war: the Aśvamedha horse turns home; Yudhiṣṭhira fixes the day and readies the sacrifice", ref: "MBh 14.86.4, 14.86.8", sky: "Māgha dvādaśī; Māgha full moon", readings: [
      { id: "A", label: "Śukla Dvādaśī in Māgha (yearly)", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: 12 }] },
      { id: "B", label: "Pūrṇimā in Māgha (yearly)", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: 15 }] }] },
    { id: "C18", event: "Śuka's prophecy to Parīkṣit: the sign that the Kṛta age returns", ref: "Bhāgavata 12.2.24", sky: "Moon, Sun, Tiṣya and Jupiter in one rāśi", readings: [
      { id: "A", label: "new moon with Sūrya, Candra and Guru in Karka (the rāśi holding Puṣya)",
        conds: [{ g: "Guru", rel: "rasi", v: 3 }, { g: "Sūrya", rel: "rasi", v: 3 }, { g: "", rel: "tithi", v: 30 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "B", label: "Sūrya, Candra and Guru all in Puṣya",
        conds: [{ g: "Guru", rel: "nak", v: 7 }, { g: "Sūrya", rel: "nak", v: 7 }, { g: "Candra", rel: "nak", v: 7 }] }] },
    /* the Vālmīki Rāmāyaṇa: the Baroda Critical Edition (GRETIL, Tokunaga/Smith),
       except R01, which that edition leaves out and the vulgate gives */
    { id: "R01", event: "Rāma's birth", ref: "Rāmāyaṇa 1.18.8–10 (vulgate; not in the critical edition)", sky: "Caitra navamī, Punarvasu, five grahas exalted, Guru with the Moon", readings: [
      { id: "A", label: "the five exalted (Sūrya, Maṅgala, Guru, Śukra, Śani), Candra in Punarvasu in Karka, Śukla Navamī of Caitra (the Karka lagna needs a clock time, so it is not searched)",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" },
                { g: "", rel: "month", v: 0 }, { g: "", rel: "tithi", v: 9 }, { g: "Candra", rel: "nak", v: 6 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "B", label: "the five exalted, Candra in Punarvasu in Karka (no tithi or month)",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" },
                { g: "Candra", rel: "nak", v: 6 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "C", label: "the five exalted only",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" }] }] },
    { id: "R02", event: "Daśaratha fixes Rāma's coronation as heir for the next day, Puṣya", ref: "Rāmāyaṇa 2.3.4; 2.4.2, 2.4.21", sky: "Caitra; the Moon in Punarvasu, Puṣya tomorrow", readings: [
      { id: "A", label: "Candra in Punarvasu in Caitra (yearly: useful once a year is fixed)", conds: [{ g: "", rel: "month", v: 0 }, { g: "Candra", rel: "nak", v: 6 }] }] },
    { id: "R03", event: "Daśaratha tells Rāma the omens that make him hurry the coronation", ref: "Rāmāyaṇa 2.4.18", sky: "Daśaratha's nakṣatra oppressed by the Sun, Mars and Rāhu", readings: [
      { id: "A", label: "Sūrya, Maṅgala and Rāhu together (within 13°20′, one nakṣatra's width); the text does not name Daśaratha's nakṣatra",
        conds: [{ g: "Rāhu", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "Maṅgala", rel: "neargraha", v: "Sūrya", tol: 13.3 }] },
      { id: "B", label: "reading A, at the same moment as R02 (Caitra, Candra in Punarvasu)",
        conds: [{ g: "Rāhu", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "Maṅgala", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "", rel: "month", v: 0 }, { g: "Candra", rel: "nak", v: 6 }] }] },
    { id: "R10", event: "Rāma waits out the rains at Kiṣkindhā, with Sugrīva", ref: "Rāmāyaṇa 4.26.14", sky: "this is Śrāvaṇa, the first month of the rains; the four rainy months have begun",
      note: "A month named with its season ties the lunar calendar to the Sun's tropical place, which drifts against the months by about a month in 2,000 years: so it gives an era. The four rainy months are the cāturmāsya; the ṛtu varṣā is two of them.", readings: [
      { id: "A", label: "Śrāvaṇa falls in the ṛtu varṣā (the Sun at tropical 90°–150°)", cap: 20000, conds: [{ g: "", rel: "month", v: 4 }, { g: "", rel: "rtu", v: 2 }] },
      { id: "B", label: "Śrāvaṇa opens the rains: the Sun at tropical 90°–120°, the first half of varṣā", cap: 20000, conds: [{ g: "", rel: "month", v: 4 }, { g: "Sūrya", rel: "_trop", v: [90, 30] }] }] },
    { id: "R06", event: "Rāma's army sets out from Kiṣkindhā for Laṅkā", ref: "Rāmāyaṇa 6.4.3–4", sky: "Uttara Phalgunī today, Hasta tomorrow", readings: [
      { id: "A", label: "Candra in Uttara Phalgunī (monthly: useful once a year and month are fixed)", conds: [{ g: "Candra", rel: "nak", v: 11 }] }] },
    { id: "R07", event: "Rāma's army sets out for Laṅkā: omens on the march", ref: "Rāmāyaṇa 6.4.46", sky: "Mūla, the rākṣasas' nakṣatra, touched by a dhūmaketu", readings: [
      { id: "A", label: "Ketu in Mūla (reading dhūmaketu as the node; a comet cannot be computed)", conds: [{ g: "Ketu", rel: "nak", v: 18 }] }] },
    { id: "R08", event: "Rāma's last battle with Rāvaṇa: omens during the duel", ref: "Rāmāyaṇa 6.90.27", sky: "Budha stands assailing Rohiṇī", readings: [
      { id: "A", label: "Budha in Rohiṇī", conds: [{ g: "Budha", rel: "nak", v: 3 }] }] }
  ];
  CLAIMS.forEach(function (c) { c.src = /^Rāmāyaṇa/.test(c.ref) ? "Rāmāyaṇa" : /^Bhāgavata/.test(c.ref) ? "Bhāgavata" : "Mahābhārata"; });
  /* what each relation means, how the builder offers it, and how it reads aloud */
  var REL = {
    nak: { label: "is in nakṣatra", target: "nak", graha: true },
    rasi: { label: "is in rāśi", target: "rasi", graha: true },
    nearstar: { label: "is within … of a junction star", target: "star", tol: 5, graha: true },
    neargraha: { label: "is within … of another graha", target: "graha", tol: 6, graha: true },
    nearnode: { label: "is within … of Rāhu or Ketu", target: "", tol: 18, graha: true },
    nearlon: { label: "is within … of a longitude", target: "lon", tol: 5, graha: true },
    opp: { label: "is opposite another graha", target: "graha", tol: 6, graha: true },
    exalt: { label: "is exalted", target: "", graha: true },
    debil: { label: "is debilitated", target: "", graha: true },
    own: { label: "is in its own sign", target: "", graha: true },
    retro: { label: "is retrograde, in nakṣatra", target: "nakany", graha: true },
    station: { label: "turns retrograde, in nakṣatra", target: "nakany", graha: true },
    tithi: { label: "the tithi is", target: "tithi", graha: false },
    month: { label: "the lunar month is", target: "month", graha: false },
    eclipse: { label: "an eclipse", target: "eclipse", graha: false },
    ayana: { label: "the Sun's ayana is", target: "ayana", graha: false },
    rtu: { label: "the season (ṛtu, by the Sun's tropical longitude) is", target: "rtu", graha: false },
    pt: { label: "lies in nakṣatra (equinox or solstice point)", target: "nak", graha: false, points: true }
  };
  /* the six ṛtus as 60° arcs of the Sun's tropical longitude (vasanta about the vernal equinox) */
  var RTU = ["vasanta (spring)", "grīṣma (summer)", "varṣā (rains)", "śarad (autumn)", "hemanta (early winter)", "śiśira (late winter)"], RTU0 = [330, 30, 90, 150, 210, 270];
  /* the four cardinal points and their tropical longitudes */
  var PTS = ["vernal equinox", "summer solstice", "autumn equinox", "winter solstice"], PT0 = [0, 90, 180, 270];
  var TITHI30 = []; for (var ti0 = 0; ti0 < 30; ti0++) TITHI30.push((ti0 < 15 ? "Śukla " : "Kṛṣṇa ") + (ti0 % 15 === 14 ? (ti0 < 15 ? "Pūrṇimā" : "Amāvāsyā") : TNAME[ti0 % 15]));
  function condText(c) {
    var g = c.g === "any" ? "any graha" : c.g, tv = c.tol != null ? c.tol + "°" : "";
    switch (c.rel) {
      case "nak": return g + " in " + (Array.isArray(c.v) ? c.v.map(function (q) { return CL_NAKX[q]; }).join(" or ") : CL_NAKX[c.v]);
      case "rasi": return g + " in " + (Array.isArray(c.v) ? c.v.map(function (q) { return CL_RS[q]; }).join(" or ") : CL_RS[c.v]);
      case "_arcs": return g + " in " + c.v.map(function (q) { return norm(q[0]).toFixed(1) + "°–" + norm(q[0] + q[1]).toFixed(1) + "°"; }).join(" or ");
      case "nearstar": return g + " within " + tv + " of " + YOGA[c.v][1] + " (" + YOGA[c.v][0] + ")";
      case "neargraha": return g + " within " + tv + " of " + c.v;
      case "nearnode": return g + " within " + tv + " of Rāhu or Ketu";
      case "nearlon": return g + " within " + tv + " of " + (+c.v).toFixed(1) + "°";
      case "opp": return g + " opposite " + c.v + " (±" + tv + ")";
      case "exalt": return g + " exalted";
      case "debil": return g + " debilitated";
      case "own": return g + " in its own sign";
      case "retro": return g + " retrograde" + (c.v >= 0 ? " in " + CL_NAKX[c.v] : "");
      case "station": return g + " turns retrograde" + (c.v >= 0 ? " in " + CL_NAKX[c.v] : "");
      case "tithi": return "tithi " + (Array.isArray(c.v) ? c.v.map(function (q) { return TITHI30[q - 1]; }).join(" or ") : TITHI30[c.v - 1]);
      case "rtu": return "the season is " + RTU[c.v];
      case "pt": return "the " + (c.g || PTS[0]) + " in " + (c.part ? "the first " + (c.part[1] === 0.25 ? "quarter" : Math.round(c.part[1] * 100) + "%") + " of " : "") + CL_NAKX[c.v];
      case "_and": return "at one moment: " + c.conds.map(condText).join(" and ");
      case "_trop": return "Sūrya " + c.v[0] + "°–" + norm(c.v[0] + c.v[1]) + "° tropical";
      case "month": return "lunar month " + LMON[c.v];
      case "eclipse": return (c.v === "solar" ? "a solar" : "a lunar") + " eclipse";
      case "ayana": return c.v === "uttara" ? "uttarāyaṇa" : "dakṣiṇāyana";
    }
    return "?";
  }

  /* ---- evaluating one condition at one instant --------------------------------
     returns { ok, m, skip, who }: m is the margin in degrees (how far inside),
     skip how many days the walk may jump when it is false, who the graha that
     met it for "any graha" */
  function lonOf(g, ms, S) {
    var L;
    if (g === "Rāhu" || g === "Ketu") L = (CONV.node === "true" ? K.trueNode(ms) : K.longitude("Rāhu", ms)) + (g === "Ketu" ? 180 : 0);
    else L = K.longitude(g, ms);
    return norm(L + S);
  }
  /* the nakṣatra index (27 = Abhijit) and the margin to its edge, under the chosen meaning */
  function nakAt(L, ms) {
    if (CONV.nak === "abhijit" && L >= 276 + 40 / 60 && L < 280 + 53 / 60 + 20 / 3600)
      return { i: 27, m: Math.min(L - 276 - 40 / 60, 280 + 53 / 60 + 20 / 3600 - L) };
    if (CONV.nak === "star") {
      var ys = yogataras(ms), S2 = shiftOf(ms), d = [];
      (ys || []).forEach(function (y) { if (y.nak !== "Abhijit") d.push({ i: y.i, d: Math.abs(sdiff(y.lon + S2, L)) }); });
      d.sort(function (a, b) { return a.d - b.d; });
      if (d.length > 1) return { i: d[0].i, m: (d[1].d - d[0].d) / 2 };
    }
    var k = NKS(L);
    return { i: k.i, m: Math.min(L - k.start, k.end - L) };
  }
  /* the shortest arc from L into the arc [a, a + w) */
  function arcTo(L, a, w) { var x = norm(L - a); return x < w ? 0 : Math.min(x - w, 360 - x); }
  function nakDist(L, i, ms) {
    /* by the nearest star the divisions are uneven, so the skip is kept small */
    if (CONV.nak === "star") { var n = nakAt(L, ms); return n.i === i ? 0 : Math.max(0.01, Math.abs(sdiff(L, (i + 0.5) * 40 / 3)) - 30); }
    if (i === 27 && CONV.nak === "abhijit") return arcTo(L, 276 + 40 / 60, 4 + 13 / 60 + 20 / 3600);
    var e = NKE().filter(function (q) { return q.i === i; })[0];
    return e ? arcTo(L, e.start, e.end - e.start) : 360;
  }
  var MONTH_CACHE = { a: 0, b: -1, i: -1 }, ECL_CACHE = {};
  /* the next (dir +1) or previous (dir −1) instant the elongation reaches tgt:
     a start from the mean rate, then Newton steps on the true elongation */
  function syz(ms, tgt, dir) {
    var e = elong(ms), gap = dir > 0 ? norm(tgt - e) : -norm(e - tgt), t = ms + gap / 12.19 * DAY;
    for (var k = 0; k < 8; k++) { var d = sdiff(elong(t), tgt), dt = -d / 12.19 * DAY; t += dt; if (Math.abs(dt) < 20000) break; }
    return t;
  }
  function lunarMonthAt(ms) {
    if (ms >= MONTH_CACHE.a && ms < MONTH_CACHE.b) return MONTH_CACHE;
    var nm0 = syz(ms + 1, 0, -1), nm1 = nm0 != null ? syz(nm0 + DAY, 0, +1) : null;
    if (nm0 == null || nm1 == null) return { a: ms, b: ms + DAY, i: -1 };
    var e = elong(ms), sukla = e < 180, a = nm0, b = nm1;
    var nameOf = function (x, y) {
      if (CONV.mname === "solar") {
        var s0 = Math.floor(norm(K.longitude("Sūrya", x) + shiftOf(x)) / 30), s1 = Math.floor(norm(K.longitude("Sūrya", y) + shiftOf(y)) / 30);
        return s0 === s1 ? -1 : s1;                     /* an adhika month matches no name */
      }
      var fm = syz(x + DAY, 180, +1);
      return fm ? NAK2MON[NKS(norm(K.longitude("Candra", fm) + shiftOf(fm))).d] : -1;
    };
    var i = nameOf(nm0, nm1);
    if (CONV.msys === "purnimanta") {
      /* the dark fortnight carries the next month's name: split at the full moon */
      var fmx = syz(nm0 + DAY, 180, +1);
      if (fmx != null && ms >= fmx) { var nm2 = syz(nm1 + DAY, 0, +1); i = nm2 ? nameOf(nm1, nm2) : i; a = fmx; b = nm1; }
      else if (fmx != null) b = fmx;
    }
    MONTH_CACHE = { a: a, b: b, i: i, sukla: sukla };
    return MONTH_CACHE;
  }
  /* an eclipse at the syzygy nearest ms: the Moon's distance from the ecliptic
     there against the usual limits (solar: seen somewhere on Earth; lunar: the
     umbra) */
  var SYN = 29.530588853 * DAY, NM2000 = Date.UTC(2000, 0, 6, 18, 14);
  function eclipseNear(ms, kind) {
    var tgt = kind === "solar" ? 0 : 180, e = sdiff(elong(ms), tgt);
    if (Math.abs(e) > 14) return { ok: false, skip: (Math.abs(e) - 13) / 13.2 };
    /* one check per lunation: the exact syzygy and the Moon's latitude there */
    var key = kind + Math.round((ms - NM2000) / SYN - tgt / 360);
    if (!(key in ECL_CACHE)) {
      var t = syz(ms - 1.5 * DAY, tgt, +1);
      ECL_CACHE[key] = t == null ? null : { t: t, b: Math.abs(K.latitude("Candra", t)) };
    }
    var q = ECL_CACHE[key];
    if (!q || Math.abs(q.t - ms) > 1.6 * DAY) return { ok: false, skip: q && q.t > ms ? Math.max(0.25, (q.t - ms) / DAY - 1.5) : 0.5 };
    /* 0.95°: checked on 2016–2023 eclipses, every penumbral-only one lies beyond 0.98°, the smallest partial at 0.93° */
    var lim = kind === "solar" ? 1.55 : 0.95;
    return q.b < lim ? { ok: true, m: lim - q.b, at: q.t, lat: q.b } : { ok: false, skip: 20 };
  }
  /* one junction star's longitude on the date (Samanvaya), kept for 50 days at a
     time: it moves under a minute of arc in that while */
  var STARC = {};
  function starLon(i, ms) {
    var key = i + ":" + Math.round(ms / (50 * DAY));
    if (key in STARC) return STARC[key];
    var A = window.Astronomy, s = YOGA[i]; if (!A || !A.DefineStar || !s) return null;
    var yrs = (ms - Date.UTC(2000, 0, 1, 12)) / DAY / 365.25, x = s[4] + s[7] * yrs, y = s[5] + s[8] * yrs, z = s[6] + s[9] * yrs, r = Math.sqrt(x * x + y * y + z * z);
    try {
      A.DefineStar(A.Body.Star8, ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24, Math.asin(z / r) * 180 / Math.PI, r * 3.26156);
      var e = A.Ecliptic(A.GeoVector(A.Body.Star8, new Date(ms), true));
      STARC[key] = norm(e.elon - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)));
    } catch (err) { STARC[key] = null; }
    return STARC[key];
  }
  function speed(g, ms) { return sdiff(lonOf(g, ms + DAY / 2, 0), lonOf(g, ms - DAY / 2, 0)); }
  function evalOne(c, ms, S) {
    if (c.g === "any") {
      var best = null, minSkip = Infinity;
      GN.forEach(function (g) { var r = evalOne(Object.assign({}, c, { g: g }), ms, S);
        if (r.ok && (!best || r.m > best.m)) best = Object.assign(r, { who: g });
        if (!r.ok) minSkip = Math.min(minSkip, r.skip || 0); });
      return best || { ok: false, skip: minSkip };
    }
    var v = VMAX[c.g] || 1, L, d, s;
    /* internal forms used by the chain and chance add-ons; the builder never makes them */
    if (c.rel === "rasi" && Array.isArray(c.v)) return evalOne({ g: c.g, rel: "_arcs", v: c.v.map(function (q) { return [q * 30, 30]; }) }, ms, S);
    if (Array.isArray(c.v) && (c.rel === "tithi" || c.rel === "nak" || c.rel === "month")) {
      var rs = c.v.map(function (q) { return evalOne(Object.assign({}, c, { v: q }), ms, S); }), hit = rs.filter(function (r) { return r.ok; });
      return hit.length ? hit[0] : { ok: false, skip: Math.min.apply(null, rs.map(function (r) { return r.skip; })) };
    }
    if (c.rel === "_and") {
      var ra = c.conds.map(function (q) { return evalOne(q, ms, S); }), bad = ra.filter(function (r) { return !r.ok; });
      if (bad.length) return { ok: false, skip: Math.max.apply(null, bad.map(function (r) { return r.skip || 0; })) };
      return { ok: true, m: Math.min.apply(null, ra.map(function (r) { return r.m; })), who: ra.map(function (r) { return r.who; }).filter(Boolean)[0] };
    }
    if (c.rel === "rtu") return evalOne({ g: "Sūrya", rel: "_trop", v: [RTU0[c.v], 60] }, ms, S);
    if (c.rel === "pt") {
      /* the point's place among the nakṣatras: its tropical longitude less the ayanāṃśa, in this frame; it moves 1° in about 72 years */
      var P = norm(PT0[Math.max(0, PTS.indexOf(c.g))] - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) + S), E = NKE().filter(function (q) { return q.i === c.v; })[0];
      var st0 = E ? E.start : c.v * 40 / 3, wd = E ? E.end - E.start : 40 / 3;
      if (c.part) { st0 += wd * c.part[0]; wd *= c.part[1] - c.part[0]; }      /* a part of the nakṣatra, e.g. its first quarter */
      d = arcTo(P, st0, wd);
      return d === 0 ? { ok: true, m: Math.min(norm(P - st0), wd - norm(P - st0)) } : { ok: false, skip: d * 26150 * 0.9 };
    }
    if (c.rel === "_trop") {
      L = norm(K.longitude("Sūrya", ms) + window.__ayanFor("samanvaya_ecliptic", jdOf(ms))); d = arcTo(L, c.v[0], c.v[1]);
      return d === 0 ? { ok: true, m: Math.min(norm(L - c.v[0]), c.v[1] - norm(L - c.v[0])) } : { ok: false, skip: d / 1.03 };
    }
    if (c.rel === "_arcs") {
      L = lonOf(c.g, ms, S); d = Math.min.apply(null, c.v.map(function (q) { return arcTo(L, q[0], q[1]); }));
      if (d > 0) return { ok: false, skip: d / v };
      var inn = c.v.filter(function (q) { return arcTo(L, q[0], q[1]) === 0; })[0], x0 = norm(L - inn[0]);
      return { ok: true, m: Math.min(x0, inn[1] - x0) };
    }
    switch (c.rel) {
      case "nak": L = lonOf(c.g, ms, S); d = nakDist(L, c.v, ms);
        return d === 0 ? { ok: true, m: nakAt(L, ms).m } : { ok: false, skip: d / v };
      case "rasi": L = lonOf(c.g, ms, S); d = arcTo(L, c.v * 30, 30);
        return d === 0 ? { ok: true, m: Math.min(L - c.v * 30, (c.v + 1) * 30 - L) } : { ok: false, skip: d / v };
      case "nearstar": L = lonOf(c.g, ms, S);
        var yl = starLon(c.v, ms); if (yl == null) return { ok: false, skip: 10 };
        d = Math.abs(sdiff(L, yl + S));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / v };
      case "neargraha": case "opp": L = lonOf(c.g, ms, S);
        var L2 = lonOf(c.v, ms, S); d = Math.abs(sdiff(L, L2)); if (c.rel === "opp") d = 180 - d;
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / (v + (VMAX[c.v] || 1)) };
      case "nearnode": L = lonOf(c.g, ms, S);
        var R = lonOf("Rāhu", ms, S); d = Math.min(Math.abs(sdiff(L, R)), Math.abs(sdiff(L, R + 180)));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / (v + 0.25) };
      case "nearlon": L = lonOf(c.g, ms, S); d = Math.abs(sdiff(L, +c.v));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / v };
      case "exalt": case "debil": case "own":
        if (!(c.g in EXALT)) return { ok: false, skip: 1e9 };
        var signs = c.rel === "exalt" ? [EXALT[c.g]] : c.rel === "debil" ? [(EXALT[c.g] + 6) % 12] : OWN[c.g];
        L = lonOf(c.g, ms, S); d = Math.min.apply(null, signs.map(function (q) { return arcTo(L, q * 30, 30); }));
        return d === 0 ? { ok: true, m: Math.min(L % 30, 30 - L % 30) } : { ok: false, skip: d / v };
      case "retro": case "station":
        L = lonOf(c.g, ms, S);
        if (c.v >= 0) { d = nakDist(L, c.v, ms); if (d > 0) return { ok: false, skip: d / v }; }
        if (c.rel === "retro") { s = speed(c.g, ms); return s < 0 ? { ok: true, m: c.v >= 0 ? nakAt(L, ms).m : -s } : { ok: false, skip: 0 }; }
        var a = speed(c.g, ms - 2 * DAY), b = speed(c.g, ms + 2 * DAY);
        return a > 0 && b <= 0 ? { ok: true, m: c.v >= 0 ? nakAt(L, ms).m : 1 } : { ok: false, skip: 0 };
      case "tithi":
        var e = elong(ms), lo = (c.v - 1) * 12; d = arcTo(e, lo, 12);
        return d === 0 ? { ok: true, m: Math.min(e - lo, lo + 12 - e) } : { ok: false, skip: d / 15.4 };
      case "month":
        var mo = lunarMonthAt(ms);
        return mo.i === c.v ? { ok: true, m: 1 } : { ok: false, skip: Math.max(0, (mo.b - ms) / DAY - 0.05) };
      case "eclipse":
        return eclipseNear(ms, c.v);
      case "ayana":
        var tr = norm(K.longitude("Sūrya", ms) + window.__ayanFor("samanvaya_ecliptic", jdOf(ms))), uttara = tr >= 270 || tr < 90;
        d = c.v === "uttara" ? arcTo(tr, 270, 180) : arcTo(tr, 90, 180);
        return d === 0 ? { ok: true, m: 1 } : { ok: false, skip: d / 1.03 };
    }
    return { ok: false, skip: 1 };
  }
  function stepOf(c) {
    if (c.rel === "_and") return Math.min.apply(null, c.conds.map(stepOf));
    if (c.rel === "pt") return 730;
    if (c.rel === "rtu") return STEP["Sūrya"] || 1;
    if (c.rel === "tithi" || c.rel === "eclipse") return 0.25;
    if (c.rel === "month") return 1;
    if (c.rel === "ayana") return 2;
    if (c.g === "any") return 0.1;
    return STEP[c.g] || 1;
  }
  /* is a claim self-contradictory before any search? */
  function contradictions(cl) {
    if (cl.mode === "within") {
      /* Śani and Guru cannot visit two nakṣatras that are not neighbours within a few months */
      var w = [], at = {};
      if ((+cl.days || 0) <= 120) cl.conds.forEach(function (c) {
        if (c.rel === "nak" && (c.g === "Śani" || c.g === "Guru") && typeof c.v === "number") {
          (at[c.g] = at[c.g] || []).forEach(function (v) { var d = Math.abs(v - c.v) % 27; if (Math.min(d, 27 - d) > 1) w.push(c.g + " cannot be in " + CL_NAKX[v] + " and in " + CL_NAKX[c.v] + " within " + cl.days + " days"); });
          at[c.g].push(c.v);
        }
      });
      return w;
    }
    var out = [], seen = {};
    cl.conds.forEach(function (c) {
      if ((c.rel === "nak" || c.rel === "rasi") && c.g && c.g !== "any" && typeof c.v === "number") {
        var k = c.g + c.rel; if (k in seen && seen[k] !== c.v) out.push(c.g + " cannot be in " + (c.rel === "nak" ? CL_NAKX[seen[k]] + " and " + CL_NAKX[c.v] : CL_RS[seen[k]] + " and " + CL_RS[c.v]) + " at once");
        seen[k] = c.v;
      }
      if (c.rel === "tithi") { if ("tithi" in seen && seen.tithi !== c.v) out.push("two different tithis cannot hold at once"); seen.tithi = c.v; }
      if (c.rel === "month") { if ("month" in seen && seen.month !== c.v) out.push("two different months cannot hold at once"); seen.month = c.v; }
      if (["exalt", "debil", "own"].indexOf(c.rel) >= 0 && !(c.g in EXALT)) out.push("this page gives the nodes no exaltation or own sign");
    });
    return out;
  }

  /* ---- the walk ------------------------------------------------------------------ */
  var CS = { run: 0, stop: false };
  /* walk windows for one condition, in slices that give the page back to the
     reader; resolves to the runs where it holds, as [start, end, bestMs, bestR] */
  function walk(c, wins, onProgress, limit) {
    var st = stepOf(c) * DAY, runs = [], wi = 0, t = wins.length ? wins[0][0] : 0, cur = null, total = 0, done = 0, my = CS.run;
    wins.forEach(function (w) { total += w[1] - w[0]; });
    return new Promise(function (res, rej) {
      (function slice() {
        if (CS.stop || my !== CS.run) return rej("stopped");
        var t0 = Date.now();
        while (wi < wins.length) {
          var w = wins[wi];
          if (t > w[1]) { if (cur) { runs.push(cur); cur = null; } wi++; if (wi < wins.length) t = wins[wi][0]; continue; }
          var S = shiftOf(t), r = evalOne(c, t, S);
          if (r.ok) {
            if (!cur) cur = [t, t, t, r]; cur[1] = t; if (r.m > cur[3].m) { cur[2] = t; cur[3] = r; }
            t += r.who ? Math.max(st, STEP[r.who] * DAY) : st;      /* "any graha": at the pace of the one that holds it */
          } else {
            if (cur) { runs.push(cur); cur = null; if (limit && runs.length > limit) return res(runs); }
            t += Math.max(st, 0.92 * (r.skip || 0) * DAY);
          }
          if (Date.now() - t0 > 30) {
            var dn = 0; for (var k = 0; k < wi; k++) dn += wins[k][1] - wins[k][0];
            dn += Math.max(0, Math.min(t, w[1]) - w[0]);
            onProgress(total ? dn / total : 1);
            return setTimeout(slice, 0);
          }
        }
        if (cur) runs.push(cur);
        res(runs);
      })();
    });
  }
  /* merge, pad and clip a list of runs into windows */
  function toWins(runs, pad, outer) {
    var w = runs.map(function (r) { return [Math.max(outer[0], r[0] - pad), Math.min(outer[1], r[1] + pad)]; }).sort(function (a, b) { return a[0] - b[0]; }), out = [];
    w.forEach(function (x) { if (out.length && x[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], x[1]); else out.push(x); });
    return out;
  }
  var CAP = 200;
  /* search one claim reading over [a, b]: resolves to { episodes, capped } */
  function searchClaim(cl, a, b, onProgress) {
    var conds = cl.conds.map(function (c, i) { return Object.assign({ i: i }, c); }).sort(function (p, q) { return stepOf(q) - stepOf(p); });
    var within = cl.mode === "within", N = (within ? (+cl.days || 0) : 0) * DAY, wins = [[a, b]], runsBy = {}, k = 0;
    MONTH_CACHE = { a: 0, b: -1, i: -1 }; ECL_CACHE = {};
    function next() {
      if (k >= conds.length) return Promise.resolve();
      var c = conds[k], frac0 = k / conds.length;
      /* the last condition of a same-moment search may stop once the reading is plainly too common */
      var lim = !within && k === conds.length - 1 ? 3 * (cl.cap || CAP) : 0;
      return walk(c, wins, function (f) { onProgress(frac0 + f / conds.length); }, lim).then(function (runs) {
        runsBy[c.i] = runs;
        wins = toWins(runs, stepOf(c) * DAY + N, [a, b]);
        k++;
        if (!wins.length) return;
        return next();
      });
    }
    return next().then(function () {
      if (conds.some(function (c) { return !runsBy[c.i] || !runsBy[c.i].length; })) return { episodes: [], capped: false };
      var eps = [];
      if (!within) {
        /* the final pass: every condition at the finest step, inside what is left */
        /* the final pass steps at a twelfth of the finest condition's step (at least 5 minutes): coarser,
           it could jump over a coincidence shorter than an hour (found 19 Nov 2026: a 30-minute overlap of
           the Moon entering Karka with the end of a navamī). Skips from false conditions still speed it up. */
        var all = { rel: "_all" }, fine = Math.max(300000, Math.min.apply(null, conds.map(stepOf)) * DAY / 12);
        return new Promise(function (res, rej) {
          var wi = 0, t = wins[0][0], cur = null, my = CS.run;
          (function slice() {
            if (CS.stop || my !== CS.run) return rej("stopped");
            var t0 = Date.now();
            while (wi < wins.length) {
              var w = wins[wi];
              if (t > w[1]) { if (cur) { eps.push(cur); cur = null; } wi++; if (wi < wins.length) t = wins[wi][0]; continue; }
              var S = shiftOf(t), rs = cl.conds.map(function (c) { return evalOne(c, t, S); }), ok = rs.every(function (r) { return r.ok; });
              if (ok) {
                var mm = Math.min.apply(null, rs.map(function (r) { return r.m; }));
                if (!cur) cur = { from: t, to: t, best: t, mm: mm, rs: rs }; cur.to = t;
                if (mm > cur.mm) { cur.best = t; cur.mm = mm; cur.rs = rs; }
                t += Math.max(fine, Math.min.apply(null, rs.map(function (r, j) { return Math.min(r.m != null ? r.m / (VMAX[r.who || cl.conds[j].g] || 13.2) * DAY : Infinity, r.who ? STEP[r.who] * DAY : stepOf(cl.conds[j]) * DAY); })));
              } else {
                if (cur) { eps.push(cur); cur = null; if (eps.length > (cl.cap || CAP)) break; }
                t += Math.max(fine, 0.92 * Math.max.apply(null, rs.filter(function (r) { return !r.ok; }).map(function (r) { return r.skip || 0; })) * DAY);
              }
              if (Date.now() - t0 > 30) { onProgress(0.99); return setTimeout(slice, 0); }
            }
            if (cur) eps.push(cur);
            /* an eclipse's best moment is the eclipse itself */
            eps.forEach(function (e) { var q = e.rs.filter(function (r) { return r.at; })[0]; if (q) e.best = q.at; });
            res({ episodes: eps.slice(0, (cl.cap || CAP)), capped: eps.length > (cl.cap || CAP) });
          })();
        });
      }
      /* within N days: each run of the slowest condition, with a run of every
         other condition no more than N days from it */
      var anchor = conds[0];
      runsBy[anchor.i].forEach(function (R) {
        var rs = [], from = R[0], to = R[1], ok = true;
        cl.conds.forEach(function (c, i) {
          if (i === anchor.i) { rs[i] = Object.assign({ at: R[2] }, R[3]); return; }
          var hit = null;
          (runsBy[i] || []).forEach(function (q) { if (q[1] >= R[0] - N && q[0] <= R[1] + N && (!hit || q[3].m > hit[3].m)) hit = q; });
          if (!hit) { ok = false; return; }
          rs[i] = Object.assign({ at: hit[2] }, hit[3]); from = Math.min(from, hit[0]); to = Math.max(to, hit[1]);
        });
        if (ok) eps.push({ from: from, to: to, best: rs[anchor.i].at || R[2], rs: rs, mm: Math.min.apply(null, rs.map(function (r) { return r.m; })) });
      });
      return { episodes: eps.slice(0, (cl.cap || CAP)), capped: eps.length > (cl.cap || CAP) };
    });
  }

  /* ---- the panel ------------------------------------------------------------------ */
  var MY_KEY = "learnhoro.kalasetu.myclaim";
  var MY = { n: "", ref: "", note: "", mode: "same", days: 30, conds: [{ g: "Śani", rel: "nak", v: 3 }] };
  var MYKEEP = false;
  try { var mk = JSON.parse(localStorage.getItem(MY_KEY) || "null"); if (mk && mk.conds) { MY = mk; MYKEEP = true; } } catch (e) {}
  function opt(v, t, sel) { return '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(t) + "</option>"; }
  function targetCtl(c, i) {
    var r = REL[c.rel], t = r.target, h = "";
    if (t === "nak" || t === "nakany") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + (t === "nakany" ? opt(-1, "anywhere", c.v < 0) : "") +
      CL_NAKX.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "rasi") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + CL_RS.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "star") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + YOGA.map(function (y, k) { return opt(k, y[1] + " (" + y[0] + ")", +c.v === k); }).join("") + "</select>";
    else if (t === "graha") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + GN.map(function (g) { return opt(g, g, c.v === g); }).join("") + "</select>";
    else if (t === "lon") h = '<input class="swin" type="number" min="0" max="359.9" step="0.1" data-cb="v" data-i="' + i + '" value="' + esc(c.v == null ? 0 : c.v) + '"> °';
    else if (t === "tithi") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + TITHI30.map(function (n, k) { return opt(k + 1, n, +c.v === k + 1); }).join("") + "</select>";
    else if (t === "month") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + LMON.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "eclipse") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + opt("solar", "solar (somewhere on Earth)", c.v === "solar") + opt("lunar", "lunar (umbral)", c.v === "lunar") + "</select>";
    else if (t === "rtu") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + RTU.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "ayana") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + opt("uttara", "uttarāyaṇa", c.v === "uttara") + opt("dakshina", "dakṣiṇāyana", c.v === "dakshina") + "</select>";
    if (r.tol != null) h += ' <label class="ks-cbtol">within <input class="swin" type="number" min="0.1" max="90" step="0.1" data-cb="tol" data-i="' + i + '" value="' + esc(c.tol == null ? r.tol : c.tol) + '">°</label>';
    return h;
  }
  function defaultV(rel) {
    var t = REL[rel].target;
    return { nak: 3, nakany: -1, rasi: 0, star: 3, graha: "Śani", lon: 0, tithi: 15, month: 0, eclipse: "solar", ayana: "uttara", rtu: 0 }[t];
  }
  function drawBuilder() {
    var host = $("ks-cbrows"); if (!host) return;
    host.innerHTML = MY.conds.map(function (c, i) {
      var r = REL[c.rel];
      return '<div class="ks-cbrow"><select class="swin" data-cb="g" data-i="' + i + '"' + (r.graha || r.points ? "" : " disabled") + ">" +
        (r.points ? PTS.map(function (q) { return opt(q, "the " + q, c.g === q); }).join("") : r.graha ? GN.map(function (g) { return opt(g, g, c.g === g); }).join("") + opt("any", "any graha", c.g === "any") : opt("", "—", true)) + "</select>" +
        '<select class="swin" data-cb="rel" data-i="' + i + '">' + Object.keys(REL).map(function (k) { return opt(k, REL[k].label, c.rel === k); }).join("") + "</select>" +
        targetCtl(c, i) +
        ' <button type="button" class="swbtn" data-cbdel="' + i + '" aria-label="Remove this condition"' + (MY.conds.length < 2 ? " disabled" : "") + ">Remove</button></div>";
    }).join("");
    $("ks-cbmode").value = MY.mode; $("ks-cbdays").value = MY.days; $("ks-cbdays").disabled = MY.mode !== "within";
    $("ks-cbname").value = MY.n || ""; $("ks-cbref").value = MY.ref || ""; $("ks-cbnote").value = MY.note || "";
    $("ks-cbkeep").checked = MYKEEP;
    var bad = contradictions(MY);
    $("ks-cbwarn").innerHTML = bad.length ? "<b>This claim can never hold:</b> " + esc(bad.join("; ")) + "." : "";
    keepMy();
  }
  function keepMy() { try { if (MYKEEP) localStorage.setItem(MY_KEY, JSON.stringify(MY)); } catch (e) {} }
  function claimOf(sel) {
    if (sel === "mine") return null;
    return CLAIMS.filter(function (c) { return c.id === sel; })[0];
  }
  function drawPicker() {
    /* grouped by text; only claims a search can test are offered (the sheet
       keeps the rest: comets, similes, seasons, rites, counting conventions) */
    var grp = function (label, list) { return list.length ? '<optgroup label="' + esc(label) + '">' + list.map(function (c) {
      /* the event in the epic first, then what the verse says of the sky */
      return '<option value="' + c.id + '"' + (c.none ? " disabled" : "") + ">" + esc(c.id + " · " + (c.event ? c.event + " — " : "") + c.sky + (c.none ? " — " + c.none : "")) + "</option>"; }).join("") + "</optgroup>" : ""; };
    var can = CLAIMS.filter(function (c) { return !c.none; });
    $("ks-claim").innerHTML = opt("mine", "Your own claim (build it below)", false) +
      ["Mahābhārata", "Bhāgavata", "Rāmāyaṇa"].map(function (t) { return grp(t, can.filter(function (c) { return c.src === t; })); }).join("");
    $("ks-claim").value = "C01";
    pickerChanged();
  }
  function pickerChanged() {
    var cl = claimOf($("ks-claim").value);
    $("ks-cbox").open = !cl;
    $("ks-reading").innerHTML = cl ? opt("all", "all readings, each on its own", true) + cl.readings.map(function (r) { return opt(r.id, r.id + ": " + r.label, false); }).join("") : opt("mine", "your conditions", true);
    if (cl && cl.def) $("ks-reading").value = cl.def;
    $("ks-reading").disabled = !cl; $("ks-cledit").disabled = !cl;
    var inf = $("ks-clinfo");
    if (inf) inf.innerHTML = cl ? "<b>" + esc(cl.event || "") + "</b> · " + esc(cl.ref) + " · " + esc(cl.sky) + (cl.note ? "<br>" + esc(cl.note) : "") : "";
    adviseRange();
  }
  function readingsNow() {
    var cl = claimOf($("ks-claim").value);
    if (!cl) return [{ id: "", label: MY.n || "your claim", conds: MY.conds, mode: MY.mode, days: MY.days, mine: true }];
    var r = $("ks-reading").value;
    return cl.readings.filter(function (x) { return r === "all" || x.id === r; }).map(function (x) { return Object.assign({ claim: cl }, x); });
  }
  /* advice on the range, from the fastest thing the claim leans on */
  function adviseRange() {
    var rs = readingsNow(), moon = rs.some(function (r) { return r.conds.some(function (c) { return c.g === "Candra" || c.g === "any" || ["tithi", "month", "eclipse"].indexOf(c.rel) >= 0; }); });
    $("ks-cladvice").innerHTML = moon ? "This claim leans on the Moon (or a tithi, month or eclipse): search <b>1000–2000 years</b> at a time, as the Moon makes the search slower. The Moon is measured against JPL DE431 over the whole span; the day and the lagna still carry ΔT's uncertainty."
      : "This claim uses only the slower grahas: the <b>whole span</b>, 13000 BCE – 3600 CE, is quick to search and trusted to under a minute of arc.";
  }
  function yearMs(eraId, yId, end) {
    var era = $(eraId).value, y = Math.max(1, Math.min(era === "BCE" ? 13000 : 3600, Math.round(+$(yId).value || 1))), Y = era === "BCE" ? 1 - y : y;
    var t = new Date(end ? Date.UTC(2000, 11, 31, 23, 59) : Date.UTC(2000, 0, 1)); t.setUTCFullYear(Y); return t.getTime();
  }
  function fmtSep(r) {
    if (r.sep != null) return r.sep.toFixed(1) + "° apart";
    if (r.lat != null) return "Moon " + r.lat.toFixed(2) + "° from the ecliptic";
    if (r.m != null && isFinite(r.m)) return r.m.toFixed(1) + "° inside";
    return "";
  }
  function flagsFor(rd, ms) {
    var y = new Date(ms).getUTCFullYear(), f = [], moon = rd.conds.some(function (c) { return c.g === "Candra" || ["tithi", "month", "eclipse"].indexOf(c.rel) >= 0; });
    if (moon && y < 1000) f.push("day ±ΔT");
    if (!K.inSpan(ms)) f.push("outside the span");
    return f.join(" · ");
  }
  function runSearch() {
    var a = yearMs("ks-clera0", "ks-cly0"), b = yearMs("ks-clera1", "ks-cly1", true);
    if (b <= a) { $("ks-clsum").innerHTML = "<b>The end of the range must come after its start.</b>"; return; }
    var rds = readingsNow(), bad = [];
    rds.forEach(function (r) { var x = contradictions(r); if (x.length) bad.push((r.id ? r.id + ": " : "") + x.join("; ")); });
    if (bad.length) { $("ks-clsum").innerHTML = "<b>Not searched: this can never hold.</b> " + esc(bad.join(" · ")); $("ks-clres").innerHTML = ""; return; }
    CS.run++; CS.stop = false;
    var my = CS.run, out = [], yrs = (b - a) / DAY / 365.2425, t0 = Date.now();
    $("ks-clgo").disabled = true; $("ks-clstop").disabled = false; $("ks-clres").innerHTML = "";
    var bar = $("ks-clbar"); bar.hidden = false; bar.value = 0;
    var i = 0;
    (function nextReading() {
      if (i >= rds.length) return finish();
      var rd = rds[i];
      $("ks-clsum").textContent = "Searching" + (rds.length > 1 ? " reading " + rd.id + " (" + (i + 1) + " of " + rds.length + ")" : "") + "…";
      SESSION.readings++;
      searchClaim(rd, a, b, function (f) { if (my === CS.run) bar.value = (i + Math.min(1, f)) / rds.length; }).then(function (res) {
        out.push({ rd: rd, res: res }); i++; nextReading();
      }, function () { finish(true); });
    })();
    function finish(stopped) {
      if (my !== CS.run) return;
      $("ks-clgo").disabled = false; $("ks-clstop").disabled = true; bar.hidden = true;
      var secs = ((Date.now() - t0) / 1000).toFixed(1);
      if (stopped) { $("ks-clsum").innerHTML = "<b>Stopped.</b> Nothing below is complete."; }
      else $("ks-clsum").innerHTML = "Searched " + esc(yearLabel(new Date(a).getUTCFullYear())) + " – " + esc(yearLabel(new Date(b).getUTCFullYear())) +
        " (" + Math.round(yrs).toLocaleString("en") + " years) in " + secs + " s, under " + FRAME_NAME[CONV.frame] + ", " +
        { equal: (window.NNak ? window.NNak.label() : "equal nakṣatras"), star: "nakṣatra by the nearest junction star", abhijit: "28 nakṣatras with Abhijit" }[CONV.nak] + ", the " + CONV.node + " node, " +
        (CONV.msys === "amanta" ? "amānta" : "pūrṇimānta") + " months named by " + (CONV.mname === "solar" ? "saṅkrānti" : "the full moon's nakṣatra") + ".";
      $("ks-clres").innerHTML = out.map(function (o) {
        var rd = o.rd, eps = o.res.episodes, per = eps.length / yrs * 1000;
        var head = "<h3 class=\"ks-clh\">" + esc(rd.mine ? "Your claim" + (MY.n ? ": " + MY.n : "") : rd.claim.id + " reading " + rd.id + (rd.claim.event ? " · " + rd.claim.event : "")) + " <span class=\"elw\">" + esc(rd.conds.map(condText).join(rd.mode === "within" ? "; within " + rd.days + " days, " : " · ")) + "</span></h3>";
        var cap = rd.cap || CAP;
        var verdict = o.res.capped ? "<p class=\"k-note\"><b>More than " + cap + " matches: this reading is too common to date anything by itself.</b> The first " + Math.min(cap, 200) + " are listed.</p>"
          : "<p class=\"k-note\"><b>" + eps.length + (eps.length === 1 ? " match" : " matches") + "</b>, about " + (per < 10 ? per.toFixed(1) : Math.round(per)) + " per 1000 years" +
            (eps.length && per > 20 ? ": common, so it narrows a date only together with other claims." : eps.length ? "." : ": nothing in this range meets it.") + (rd.mine ? " <i>Your claim, not from the catalogue.</i>" : "") + "</p>";
        if (!eps.length) return head + verdict;
        /* where in time the matches fall: runs split by gaps of more than 100 years */
        var yl = eps.map(function (e) { return new Date(e.best).getUTCFullYear(); }).sort(function (p, q) { return p - q; }), rn = [];
        yl.forEach(function (y) { var R = rn[rn.length - 1]; if (R && y - R[1] <= 100) { R[1] = y; R[2]++; } else rn.push([y, y, 1]); });
        if (eps.length > 30) verdict += '<p class="k-note"><b>Where the matches fall:</b> ' + rn.map(function (R) {
          return (R[0] === R[1] ? esc(yearLabel(R[0])) : esc(yearLabel(R[0])) + " – " + esc(yearLabel(R[1]))) + " (" + R[2] + ")"; }).join(" · ") + ".</p>";
        if (JSON.stringify(rd.conds).match(/"eclipse"/)) verdict += '<p class="k-note">Each eclipse is also checked from the place set above (' + latNow().toFixed(2) + "°, " + lonNow().toFixed(2) +
          "°), for the first 60 matches: whether it was seen there, as the shift in ΔT that would make it so. Before 700 BCE ΔT is uncertain by hours, so visibility at a place is never used as a filter.</p>";
        return head + verdict + '<div class="eltblwrap"><table class="aytab ks-cltab"><thead><tr><th>#</th><th>from</th><th>to</th><th>best moment (UT)</th><th>how each condition is met</th><th>caution</th><th></th></tr></thead><tbody>' +
          eps.slice(0, 200).map(function (e, k) {
            return "<tr><td class=\"num\">" + (k + 1) + "</td><td>" + civilText(e.from) + "</td><td>" + civilText(e.to) + "</td><td>" + civilText(e.best) + " " + hm(e.best) + "</td><td>" +
              rd.conds.map(function (c, j) { var r = e.rs[j] || {}; return esc(condText(c).replace(/^any graha/, r.who || "any graha")) + ' <span class="elw">' + esc(fmtSep(r)) + "</span>"; }).join("<br>") + (k < 60 ? eclLines(rd, e) : "") +
              "</td><td class=\"elw\">" + esc(flagsFor(rd, e.best)) + '</td><td><button type="button" class="swbtn" data-clshow="' + e.best + '">Show</button></td></tr>';
          }).join("") + "</tbody></table></div>";
      }).join("");
    }
  }
  function claimText() { return "kalasetu-claim:1 " + JSON.stringify({ n: MY.n, ref: MY.ref, note: MY.note, mode: MY.mode, days: MY.days, conds: MY.conds }); }
  function loadText(s) {
    var m = String(s || "").trim().match(/^kalasetu-claim:1\s+(\{[\s\S]*\})$/);
    if (!m) return "That text is not a Kālasetu claim. It should start with kalasetu-claim:1.";
    try {
      var o = JSON.parse(m[1]);
      if (!o.conds || !o.conds.length || o.conds.some(function (c) { return !REL[c.rel]; })) return "That claim has a condition this page does not know.";
      MY = { n: String(o.n || ""), ref: String(o.ref || ""), note: String(o.note || ""), mode: o.mode === "within" ? "within" : "same", days: Math.max(1, Math.min(3650, +o.days || 30)),
             conds: o.conds.map(function (c) { return { g: GN.indexOf(c.g) >= 0 || PTS.indexOf(c.g) >= 0 || c.g === "any" ? c.g : "", rel: c.rel, v: c.v, tol: c.tol == null ? undefined : +c.tol }; }) };
      return null;
    } catch (e) { return "That claim text is damaged and could not be read."; }
  }
  function claimsInit() {
    if (!$("ks-claim")) return;
    drawPicker(); drawBuilder();
    $("ks-claim").addEventListener("change", pickerChanged);
    $("ks-reading").addEventListener("change", adviseRange);
    $("ks-clgo").addEventListener("click", runSearch);
    $("ks-clstop").addEventListener("click", function () { CS.stop = true; });
    $("ks-cledit").addEventListener("click", function () {
      var cl = claimOf($("ks-claim").value); if (!cl) return;
      var r = $("ks-reading").value, rd = cl.readings.filter(function (x) { return r === "all" ? true : x.id === r; })[0];
      MY = { n: cl.id + " " + rd.id + " (edited)", ref: cl.ref, note: rd.label, mode: rd.mode || "same", days: rd.days || 30, conds: JSON.parse(JSON.stringify(rd.conds)) };
      $("ks-claim").value = "mine"; pickerChanged(); drawBuilder();
    });
    $("ks-cbrows").addEventListener("change", function (ev) {
      var el = ev.target, i = +el.getAttribute("data-i"), k = el.getAttribute("data-cb"); if (!k || !MY.conds[i]) return;
      var c = MY.conds[i];
      if (k === "rel") { c.rel = el.value; c.v = defaultV(c.rel); c.tol = REL[c.rel].tol; if (REL[c.rel].points) c.g = PTS.indexOf(c.g) >= 0 ? c.g : PTS[0]; else if (!REL[c.rel].graha) c.g = ""; else if (!c.g || PTS.indexOf(c.g) >= 0) c.g = "Śani"; }
      else if (k === "g") c.g = el.value;
      else if (k === "tol") c.tol = Math.max(0.1, Math.min(90, +el.value || 1));
      else c.v = /^(nak|nakany|rasi|star|tithi|month|rtu)$/.test(REL[c.rel].target) ? +el.value : REL[c.rel].target === "lon" ? norm(+el.value || 0) : el.value;
      drawBuilder(); adviseRange();
    });
    $("ks-cbrows").addEventListener("click", function (ev) {
      var d = ev.target.getAttribute && ev.target.getAttribute("data-cbdel"); if (d == null) return;
      MY.conds.splice(+d, 1); drawBuilder(); adviseRange();
    });
    $("ks-cbadd").addEventListener("click", function () { if (MY.conds.length >= 8) return; MY.conds.push({ g: "Guru", rel: "nak", v: 15 }); drawBuilder(); });
    $("ks-cbmode").addEventListener("change", function () { MY.mode = $("ks-cbmode").value; drawBuilder(); });
    $("ks-cbdays").addEventListener("change", function () { MY.days = Math.max(1, Math.min(3650, Math.round(+$("ks-cbdays").value || 30))); drawBuilder(); });
    ["n", "ref", "note"].forEach(function (k) { var el = $({ n: "ks-cbname", ref: "ks-cbref", note: "ks-cbnote" }[k]); el.addEventListener("input", function () { MY[k] = el.value; keepMy(); }); });
    $("ks-cbkeep").addEventListener("change", function () { MYKEEP = $("ks-cbkeep").checked; if (MYKEEP) keepMy(); else { try { localStorage.removeItem(MY_KEY); } catch (e) {} } });
    $("ks-cbforget").addEventListener("click", function () {
      try { localStorage.removeItem(MY_KEY); } catch (e) {}
      MYKEEP = false; MY = { n: "", ref: "", note: "", mode: "same", days: 30, conds: [{ g: "Śani", rel: "nak", v: 3 }] }; drawBuilder();
      $("ks-cbmsg").textContent = "Forgotten: nothing of your claim is kept in this browser.";
    });
    $("ks-cbcopy").addEventListener("click", function () {
      var tx = claimText(), ta = $("ks-cbtext"); ta.value = tx;
      var done = function () { $("ks-cbmsg").textContent = "Copied. Paste it here later, on another device, or into a chat to have it added to the catalogue."; };
      var fallback = function () { ta.focus(); ta.select(); $("ks-cbmsg").textContent = "Selected in the box below: copy it from there."; };
      try { navigator.clipboard.writeText(tx).then(done, fallback); } catch (e) { fallback(); }
    });
    $("ks-cbload").addEventListener("click", function () {
      var err = loadText($("ks-cbtext").value);
      $("ks-cbmsg").textContent = err || "Loaded.";
      if (!err) { $("ks-claim").value = "mine"; pickerChanged(); drawBuilder(); }
    });
    $("ks-clres").addEventListener("click", function (ev) {
      var v = ev.target.getAttribute && ev.target.getAttribute("data-clshow"); if (v == null) return;
      writeWhen(+v); redrawMoment();
      var w = $("ks-wheel"); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ==== add-ons, 18 Nov 2026: date an event from the whole story ================
     Three tools beside the claim search, which they leave as it was:
     1. the chain: several claims, each a set interval after the one before, so
        only dates where the whole story holds survive;
     2. the chance test: the same claim with its targets moved at random, to see
        how often a sky this tight turns up by itself;
     3. ΔT needed: the lagna is never a filter (its clock is ΔT's), it is reported
        as how far ΔT would have to be from the model for the lagna to fit. */
  var RAMA_PRESET = {
    range: [-12999, -2999],
    links: [
      { src: "preset", label: "Your seven conditions: Śukla Navamī with Sūrya in Mīna or Meṣa; Candra in Punarvasu and Karka; Guru in Puṣya and Karka; Maṅgala, Śani and Śukra each exalted or in an own sign",
        ref: "Rāmāyaṇa 1.18.8–10 (vulgate), as read in this project", lagna: 3,
        conds: [{ g: "Guru", rel: "nak", v: 7 }, { g: "Guru", rel: "rasi", v: 3 }, { g: "Śani", rel: "rasi", v: [6, 9, 10] }, { g: "Maṅgala", rel: "rasi", v: [9, 0, 7] },
                { g: "Śukra", rel: "rasi", v: [11, 1, 6] }, { g: "Sūrya", rel: "rasi", v: [11, 0] }, { g: "", rel: "tithi", v: 9 }, { g: "Candra", rel: "nak", v: 6 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { src: "cat", id: "R03", rd: "B", min: 24, max: 27, unit: "y", lagna: -1 }]
  };
  var MBH_PRESETS = {
    bal: { range: [-5999, 999], note: "Preset loaded: the war's new moon in Jyeṣṭhā (C01 I, Kṛṣṇa's line), then Balarāma's return with the Moon in Śravaṇa (C26 A) 16–18 days later, the war's eighteenth day.",
      links: [{ src: "cat", id: "C01", rd: "I", lagna: -1 }, { src: "cat", id: "C26", rd: "A", min: 16, max: 18, unit: "d", lagna: -1 }] },
    bhi: { range: [-5999, 999], note: "Preset loaded: the war's new moon in Jyeṣṭhā (C01 I), then Bhīṣma's death (C27 C: Māgha, Śukla 3–5, the Sun within 30° past the winter solstice) 64–70 days later — he fell on the tenth day and lay fifty-eight nights.",
      links: [{ src: "cat", id: "C01", rd: "I", lagna: -1 }, { src: "cat", id: "C27", rd: "C", min: 64, max: 70, unit: "d", lagna: -1 }] }
  };
  var CH = { links: [], last: null }, SESSION = { readings: 0 };
  var YEAR = 365.2425 * DAY;
  function newLink(first) { return first ? { src: "cat", id: "R01", rd: "A", lagna: -1 } : { src: "cat", id: "R03", rd: "B", min: 24, max: 27, unit: "y", lagna: -1 }; }
  function linkReading(L) {
    if (L.src === "preset") return { id: "", label: L.label, conds: L.conds, mode: L.mode || "same", days: L.days || 30, preset: true, ref: L.ref };
    if (L.src === "mine") return { id: "", label: MY.n || "your own claim", conds: MY.conds, mode: MY.mode, days: MY.days, mine: true };
    var cl = claimOf(L.id), rd = cl && (cl.readings.filter(function (x) { return x.id === L.rd; })[0] || cl.readings[0]);
    return rd ? Object.assign({ claim: cl }, rd) : null;
  }
  function linkName(L) {
    var r = linkReading(L); if (!r) return "?";
    return r.preset ? r.label : r.mine ? "Your claim" + (MY.n ? ": " + MY.n : "") : r.claim.id + " " + r.id + " · " + (r.claim.event || r.claim.sky);
  }
  /* does every condition of a same-moment reading hold at t? */
  function holds(rd, t) { var S = shiftOf(t); return rd.conds.every(function (c) { return evalOne(c, t, S).ok; }); }
  /* the search steps at up to a quarter of a day; the edges of a match are found to the minute */
  function refine(rd, e) {
    if (rd.mode === "within") return { from: e.from, to: e.to, exact: false };
    var st = Math.min.apply(null, rd.conds.map(stepOf)) * DAY;
    function edge(tin, tout) { for (var i = 0; i < 40 && Math.abs(tin - tout) > 30000; i++) { var m = (tin + tout) / 2; if (holds(rd, m)) tin = m; else tout = m; } return tin; }
    return { from: edge(e.from, e.from - st), to: edge(e.to, e.to + st), exact: true };
  }
  function lagnaSign(ms, lat, lon) {
    return Math.floor(norm(window.__kAscTrop(ms, lat, lon) - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) + shiftOf(ms)) / 30);
  }
  /* how far ΔT must be from the model for the lagna to be in sign `sg` while
     the match holds. The match is fixed in uniform time; a ΔT larger by δ puts
     the same moment δ earlier on Earth's clock. So with the lagna in the sign
     over [k0, k1] (clock time, model ΔT), δ must lie in [from − k1, to − k0]. */
  function dtNeeded(from, to, sg, lat, lon) {
    var y = new Date((from + to) / 2).getUTCFullYear(), sM = sigmaMS(y), sH = sigmaHuber(y);
    var out = { sign: sg, sigmaMS: sM, sigmaHuber: sH, longMatch: to - from >= DAY };
    if (out.longMatch) { out.lo = out.hi = 0; out.holds = true; return out; }
    var M = 120000, a = from - 1.6 * DAY, b = to + 1.6 * DAY, runs = [], cur = null, prev = null;
    function bis(t0, t1, in0) { for (var i = 0; i < 20 && t1 - t0 > 15000; i++) { var m = (t0 + t1) / 2; if ((lagnaSign(m, lat, lon) === sg) === in0) t0 = m; else t1 = m; } return in0 ? t0 : t1; }
    for (var t = a; t <= b; t += M) {
      var k = lagnaSign(t, lat, lon) === sg;
      if (k && !cur) cur = [prev == null ? t : bis(t - M, t, false), t];
      if (k) cur[1] = t;
      if (!k && cur) { cur[1] = bis(cur[1], t, true); runs.push(cur); cur = null; }
      prev = t;
    }
    if (cur) runs.push(cur);
    var cand = runs.map(function (r) { return { lo: from - r[1], hi: to - r[0], k0: r[0], k1: r[1] }; });
    cand.forEach(function (c) { c.d = c.lo <= 0 && c.hi >= 0 ? 0 : Math.min(Math.abs(c.lo), Math.abs(c.hi)); });
    cand.sort(function (p, q) { return p.d - q.d; });
    out.options = cand.slice(0, 3);
    var best = cand[0];
    if (best) { out.lo = best.lo; out.hi = best.hi; out.holds = best.d === 0; out.need = best.d; out.k0 = best.k0; out.k1 = best.k1; }
    return out;
  }
  function hrs(ms) {
    var s = ms < 0 ? "−" : "+", m = Math.round(Math.abs(ms) / 60000);
    return s + (m >= 60 ? Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") + " m" : m + " min");
  }
  function dtVerdict(x) {
    if (!x || x.lo == null) return "no rising of that sign found near the match";
    if (x.longMatch) return "the match lasts more than a day, so that lagna rises within it at any ΔT";
    if (x.holds) return "fits at the model's ΔT (any shift from " + hrs(x.lo) + " to " + hrs(x.hi) + " keeps it)";
    var z = x.need / 1000 / x.sigmaMS, zh = x.sigmaHuber ? x.need / 1000 / x.sigmaHuber : null;
    var w = function (q) { return q < 1 ? "well within" : q < 2 ? "within 2σ of" : q < 3 ? "a stretch for" : "far outside"; }, f = function (q) { return q.toFixed(q < 0.1 ? 2 : 1); };
    return "needs ΔT " + hrs(x.lo) + " to " + hrs(x.hi) + " from the model · " + w(z) + " Morrison–Stephenson (±" + (x.sigmaMS / 3600).toFixed(1) + " h, " + f(z) + "σ)" +
      (zh != null ? "; " + w(zh) + " Huber (±" + (x.sigmaHuber / 3600).toFixed(1) + " h, " + f(zh) + "σ)" : "");
  }


  /* ---- eclipses seen from a place (19 Nov 2026) ------------------------------------
     Whether an eclipse the engine finds was visible at the place set above. The
     eclipse is fixed in uniform time; a ΔT larger by δ turns the Earth as if the
     place stood 15.04°·δ (hours) further west. So visibility is reported, like the
     lagna, as the range of ΔT shifts under which the place saw it. Sun and Moon
     come from Kālasetu; the Moon's distance (for parallax) from astronomy-engine. */
  var RE = 6378.14, RM = 1737.4, SUNR = 0.2666, D2R = Math.PI / 180;
  function eqVec(lamTrop, beta, t) {
    var A = window.Astronomy, tm = A.MakeTime(new Date(t)), cb = Math.cos(beta * D2R);
    var v = A.RotateVector(A.Rotation_ECT_EQD(tm), new A.Vector(cb * Math.cos(lamTrop * D2R), cb * Math.sin(lamTrop * D2R), Math.sin(beta * D2R), tm));
    return [v.x, v.y, v.z];
  }
  function eclipseInstants(rd, e) {
    var kinds = [], walkC = function (cs) { cs.forEach(function (c) { if (c.rel === "eclipse") kinds.push(c.v); if (c.rel === "_and") walkC(c.conds); }); };
    walkC(rd.conds);
    var pad = (rd.mode === "within" ? (+rd.days || 0) : 0) * DAY + 1.6 * DAY, out = [];
    kinds.forEach(function (kind) {
      var tgt = kind === "solar" ? 0 : 180, t = syzygy(e.from - pad - DAY, tgt, +1), n = 0;
      while (t != null && t <= e.to + pad && n++ < 20) {
        if (Math.abs(K.latitude("Candra", t)) < (kind === "solar" ? 1.55 : 0.95)) out.push({ kind: kind, t: t });
        t = syzygy(t + 2 * DAY, tgt, +1);
      }
    });
    return out;
  }
  function eclSeen(kind, tz, lat, lon) {
    var A = window.Astronomy; if (!A) return null;
    var phi = lat * D2R, cphi = Math.cos(phi), sphi = Math.sin(phi), G = [];
    for (var j = -60; j <= 60; j++) {
      var t = tz + j * 4 * 60000, ay = window.__ayanFor("samanvaya_ecliptic", jdOf(t));
      var sv = eqVec(norm(K.longitude("Sūrya", t) + ay), 0, t), mv = eqVec(norm(K.longitude("Candra", t) + ay), K.latitude("Candra", t), t);
      var dkm = 384400; try { var gm = A.GeoMoon(new Date(t)); dkm = Math.sqrt(gm.x * gm.x + gm.y * gm.y + gm.z * gm.z) * 149597870.7; } catch (er) {}
      G.push({ s: sv, m: mv, d: dkm, th: A.SiderealTime(new Date(t)) * 15 + lon });
    }
    var dot = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
    function seen(dh) {
      for (var j = 0; j < G.length; j++) {
        var g = G[j], th = (g.th - 15.04107 * dh) * D2R, O = [cphi * Math.cos(th), cphi * Math.sin(th), sphi];
        if (kind === "solar") {
          if (dot(g.s, O) < -0.0145) continue;                          /* the Sun below the horizon */
          var M = [g.m[0] * g.d - O[0] * RE, g.m[1] * g.d - O[1] * RE, g.m[2] * g.d - O[2] * RE], L = Math.sqrt(dot(M, M));
          var sep = Math.acos(Math.max(-1, Math.min(1, dot(M, g.s) / L))) / D2R;
          if (sep < SUNR + Math.asin(RM / L) / D2R) return true;
        } else {
          var pm = Math.asin(RE / g.d) / D2R, um = 1.02 * (pm + 0.00244 - SUNR) + Math.asin(RM / g.d) / D2R;
          var dist = Math.acos(Math.max(-1, Math.min(1, -dot(g.m, g.s)))) / D2R;
          if (dist < um && Math.asin(dot(g.m, O)) / D2R - pm * 0.98 > 0) return true;
        }
      }
      return false;
    }
    var runs = [], cur = null, H = 48, st = 0.05;
    for (var dh = -H; dh <= H + 1e-9; dh += st) {
      var k = seen(dh);
      if (k && !cur) cur = [dh, dh]; if (k) cur[1] = dh;
      if (!k && cur) { runs.push(cur); cur = null; }
    }
    if (cur) runs.push(cur);
    var y = new Date(tz).getUTCFullYear(), out = { kind: kind, t: tz, sigmaMS: sigmaMS(y), sigmaHuber: sigmaHuber(y), runs: runs };
    var c = runs.map(function (r) { return { lo: r[0] * 3600000, hi: r[1] * 3600000, d: r[0] <= 0 && r[1] >= 0 ? 0 : Math.min(Math.abs(r[0]), Math.abs(r[1])) * 3600000 }; })
      .sort(function (p, q) { return p.d - q.d; })[0];
    if (c) { out.lo = c.lo; out.hi = c.hi; out.holds = c.d === 0; out.need = c.d; }
    return out;
  }
  function eclSeenText(x, lat, lon) {
    var where = "seen from " + lat.toFixed(2) + "°, " + lon.toFixed(2) + "°";
    if (!x) return "";
    if (x.lo == null) return "the " + x.kind + " eclipse of " + civilText(x.t) + ": not " + where + " under any ΔT within ±48 h";
    return "the " + x.kind + " eclipse of " + civilText(x.t) + ", " + where + ": " + dtVerdict(x).replace("fits at the model's ΔT", "seen at the model's ΔT");
  }
  function eclLines(rd, e) {
    if (!JSON.stringify(rd.conds).match(/"eclipse"/)) return "";
    var lat = latNow(), lon = lonNow();
    return eclipseInstants(rd, e).map(function (q) { return '<br><span class="ks-dtn">' + esc(eclSeenText(eclSeen(q.kind, q.t, lat, lon), lat, lon)) + "</span>"; }).join("");
  }

  /* ---- 1. the chain ---------------------------------------------------------------- */
  var CHAIN_CAP = 20000, CHAIN_SHOW = 300, LINK_CAP = 20000;
  function chainSearch(links, a, b, onProgress) {
    var rds = links.map(function (L) { var r = linkReading(L); return r ? Object.assign({}, r, { cap: LINK_CAP }) : r; }), chains = [], perLink = [], capped = false;
    if (rds.some(function (r) { return !r; })) return Promise.reject("a link has no reading");
    var lo = K.SPAN.from, hi = K.SPAN.to;
    function stepK(k) {
      if (k >= links.length) return Promise.resolve();
      var rd = rds[k], L = links[k], unit = L.unit === "d" ? DAY : YEAR;
      SESSION.readings++;
      if (k === 0) {
        return searchClaim(rd, a, b, function (f) { onProgress(f / links.length); }).then(function (res) {
          capped = capped || res.capped; perLink.push(res.episodes.length);
          chains = res.episodes.map(function (e) { return [e]; });
          return chains.length ? stepK(1) : null;
        });
      }
      /* the windows where link k may fall, one per surviving chain, merged */
      var w = chains.map(function (ch) { var p = ch[ch.length - 1].best; return [Math.max(lo, p + L.min * unit), Math.min(hi, p + L.max * unit)]; })
        .filter(function (x) { return x[1] > x[0]; }).sort(function (p, q) { return p[0] - q[0]; }), mw = [];
      w.forEach(function (x) { if (mw.length && x[0] <= mw[mw.length - 1][1]) mw[mw.length - 1][1] = Math.max(mw[mw.length - 1][1], x[1]); else mw.push(x.slice()); });
      var found = [], j = 0;
      function nextWin() {
        if (j >= mw.length) return Promise.resolve();
        var W = mw[j];
        return searchClaim(rd, W[0], W[1], function (f) { onProgress((k + (j + f) / mw.length) / links.length); }).then(function (res) {
          found = found.concat(res.episodes); capped = capped || res.capped; j++; return nextWin();
        });
      }
      return nextWin().then(function () {
        perLink.push(found.length);
        var next = [];
        chains.forEach(function (ch) {
          var p = ch[ch.length - 1].best, w0 = p + L.min * unit, w1 = p + L.max * unit;
          found.forEach(function (e) { if (e.to >= w0 && e.from <= w1 && next.length < CHAIN_CAP) next.push(ch.concat([e])); });
        });
        if (next.length >= CHAIN_CAP) capped = true;
        chains = next;
        return chains.length ? stepK(k + 1) : null;
      });
    }
    return stepK(0).then(function () {
      var lat = latNow(), lon = lonNow();
      chains.slice(0, CHAIN_SHOW).forEach(function (ch) {
        ch.forEach(function (e, k) {
          var r = refine(rds[k], e); e.exact = r;
          if (links[k].lagna >= 0) e.dt = dtNeeded(r.from, r.to, links[k].lagna, lat, lon);
        });
      });
      return { chains: chains, perLink: perLink, capped: capped, place: { lat: lat, lon: lon } };
    });
  }
  function chainRow(L, k) {
    var cats = CLAIMS.filter(function (c) { return !c.none; });
    var src = L.src === "preset" ? "preset" : L.src === "mine" ? "mine" : L.id;
    var h = '<div class="ks-chlink" data-k="' + k + '"><span class="ks-chn">' + (k + 1) + "</span>";
    if (k > 0) h += '<label>from <input class="swin" type="number" step="0.5" min="0" max="5000" data-ch="min" value="' + esc(L.min) + '"></label>' +
      '<label>to <input class="swin" type="number" step="0.5" min="0" max="5000" data-ch="max" value="' + esc(L.max) + '"></label>' +
      '<select class="swin" data-ch="unit">' + opt("y", "years", L.unit !== "d") + opt("d", "days", L.unit === "d") + "</select><span>after link " + k + ":</span>";
    h += '<select class="swin" data-ch="src">' + (L.src === "preset" ? opt("preset", "Preset: " + L.label, true) : "") + opt("mine", "Your own claim (the builder above)", src === "mine") +
      ["Mahābhārata", "Bhāgavata", "Rāmāyaṇa"].map(function (t) { return '<optgroup label="' + t + '">' + cats.filter(function (c) { return c.src === t; }).map(function (c) {
        return opt(c.id, c.id + " · " + (c.event ? c.event + " — " : "") + c.sky, src === c.id); }).join("") + "</optgroup>"; }).join("") + "</select>";
    var cl = L.src === "cat" ? claimOf(L.id) : null;
    if (cl) h += '<select class="swin" data-ch="rd">' + cl.readings.map(function (r) { return opt(r.id, r.id + ": " + r.label, L.rd === r.id); }).join("") + "</select>";
    h += '<label>lagna <select class="swin" data-ch="lagna">' + opt(-1, "not asked", L.lagna < 0) + CL_RS.map(function (n, i) { return opt(i, n + " (reported as ΔT needed)", +L.lagna === i); }).join("") + "</select></label>";
    h += ' <button type="button" class="swbtn" data-chdel="' + k + '"' + (CH.links.length < 2 ? " disabled" : "") + ">Remove</button></div>";
    return h;
  }
  function drawChain() {
    var host = $("ks-chlinks"); if (!host) return;
    host.innerHTML = CH.links.map(chainRow).join("");
    $("ks-chadd").disabled = CH.links.length >= 5;
    $("ks-chsession").textContent = SESSION.readings;
  }
  function chainYears(id0, e0, end) { return yearMs(e0, id0, end); }
  function runChain() {
    var a = chainYears("ks-chy0", "ks-chera0"), b = chainYears("ks-chy1", "ks-chera1", true);
    if (b <= a) { $("ks-chsum").innerHTML = "<b>The end of the range must come after its start.</b>"; return; }
    var bad = CH.links.map(function (L, k) { var r = linkReading(L); return r ? contradictions(r).map(function (x) { return "link " + (k + 1) + ": " + x; }) : ["link " + (k + 1) + " has no reading"]; })
      .reduce(function (p, q) { return p.concat(q); }, []).concat(CH.links.slice(1).filter(function (L) { return !(L.max > L.min); }).map(function () { return "an interval must end after it starts"; }));
    if (bad.length) { $("ks-chsum").innerHTML = "<b>Not searched:</b> " + esc(bad.join(" · ")); $("ks-chres").innerHTML = ""; return; }
    CS.run++; CS.stop = false;
    var my = CS.run, t0 = Date.now(), bar = $("ks-chbar");
    $("ks-chgo").disabled = true; $("ks-chstop").disabled = false; bar.hidden = false; bar.value = 0; $("ks-chres").innerHTML = "";
    $("ks-chsum").textContent = "Searching the chain…";
    var links = JSON.parse(JSON.stringify(CH.links));
    chainSearch(links, a, b, function (f) { if (my === CS.run) bar.value = Math.min(1, f); }).then(function (res) {
      if (my !== CS.run) return; CH.last = { res: res, links: links, a: a, b: b }; done();
      drawChainResult(CH.last, ((Date.now() - t0) / 1000).toFixed(1));
    }, function () { done(); $("ks-chsum").innerHTML = "<b>Stopped.</b> Nothing below is complete."; });
    function done() { $("ks-chgo").disabled = false; $("ks-chstop").disabled = true; bar.hidden = true; $("ks-chsession").textContent = SESSION.readings; }
  }
  function drawChainResult(o, secs) {
    var r = o.res, L = o.links;
    $("ks-chsum").innerHTML = "Searched " + esc(yearLabel(new Date(o.a).getUTCFullYear())) + " – " + esc(yearLabel(new Date(o.b).getUTCFullYear())) + " for link 1" +
      (secs ? " in " + secs + " s" : "") + ", under " + FRAME_NAME[CONV.frame] + ", " + { equal: (window.NNak ? window.NNak.label() : "equal nakṣatras"), star: "nakṣatra by the nearest junction star", abhijit: "28 nakṣatras with Abhijit" }[CONV.nak] +
      ", the " + CONV.node + " node. Link by link, matches found: " + r.perLink.map(function (n, k) { return "link " + (k + 1) + " " + n; }).join(", ") +
      ". <b>" + r.chains.length + (r.chains.length === 1 ? " date survives" : " dates survive") + " the whole chain.</b>" + (r.capped ? " <b>A list reached its limit (" + LINK_CAP + "): search a shorter range.</b>" : "") +
      (L.some(function (x) { return x.lagna >= 0; }) ? " Lagna at " + latNow().toFixed(2) + "°, " + lonNow().toFixed(2) + "° (the place set above)." : "");
    if (!r.chains.length) { $("ks-chres").innerHTML = '<p class="k-note">No date in this range satisfies every link. That is a result: under these readings and intervals, the story\'s sky did not happen here.</p>'; return; }
    /* where in time the surviving dates fall: runs split by gaps of more than 100 years */
    var ys = r.chains.map(function (ch) { return new Date(ch[0].best).getUTCFullYear(); }).sort(function (p, q) { return p - q; }), runs = [];
    ys.forEach(function (y) { var R = runs[runs.length - 1]; if (R && y - R[1] <= 100) { R[1] = y; R[2]++; } else runs.push([y, y, 1]); });
    var spread = runs.length > 1 || r.chains.length > 20 ? '<p class="k-note"><b>Where the surviving dates fall:</b> ' + runs.map(function (R) {
      return (R[0] === R[1] ? esc(yearLabel(R[0])) : esc(yearLabel(R[0])) + " – " + esc(yearLabel(R[1]))) + " (" + R[2] + ")"; }).join(" · ") +
      (r.chains.length > CHAIN_SHOW ? ". The table lists the first " + CHAIN_SHOW + "." : ".") + "</p>" : "";
    $("ks-chres").innerHTML = spread + '<div class="eltblwrap"><table class="aytab ks-cltab"><thead><tr><th>#</th>' + L.map(function (x, k) { return "<th>link " + (k + 1) + ": " + esc(linkName(x)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      r.chains.slice(0, CHAIN_SHOW).map(function (ch, i) {
        return "<tr><td class=\"num\">" + (i + 1) + "</td>" + ch.map(function (e, k) {
          var ex = e.exact || {}, gap = k ? (e.best - ch[k - 1].best) / YEAR : null;
          return "<td>" + civilText(e.best) + " " + hm(e.best) + " UT" +
            (ex.exact ? '<br><span class="elw">holds ' + civilText(ex.from) + " " + hm(ex.from) + " – " + (civilText(ex.to) === civilText(ex.from) ? "" : civilText(ex.to) + " ") + hm(ex.to) + " UT</span>" : "") +
            (gap != null ? '<br><span class="elw">' + gap.toFixed(2) + " years after link " + k + "</span>" : "") +
            (e.dt ? '<br><span class="ks-dtn">Lagna ' + esc(CL_RS[e.dt.sign]) + ": " + esc(dtVerdict(e.dt)) + "</span>" : "") + (i < 60 ? eclLines(linkReading(L[k]), e) : "") +
            ' <button type="button" class="swbtn" data-clshow="' + e.best + '">Show</button></td>';
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---- 2. the chance test ------------------------------------------------------------ */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* the same reading with every graha's targets moved by one random angle per
     graha: the structure (how many conditions, how wide, which go together) is
     kept, the places are not. Tithi and month follow the Moon and Sun moved. */
  function randomized(rd, R, mid, th0) {
    var th = th0 || {}; if (!th0) { GN.concat(["any"]).forEach(function (g) { th[g] = R() * 360; }); th["Ketu"] = th["Rāhu"]; }
    var arcsOfNak = function (i) { var e = NKE().filter(function (q) { return q.i === i; })[0]; return e ? [e.start, e.end - e.start] : [i * 40 / 3, 40 / 3]; };
    var conds = rd.conds.map(function (c) {
      var t = th[c.g] || 0, x = Object.assign({}, c);
      if (c.rel === "_and") return { g: "", rel: "_and", conds: randomized({ conds: c.conds }, R, mid, th).conds };
      switch (c.rel) {
        case "nak": if (c.g === "any") return x; return { g: c.g, rel: "_arcs", v: (Array.isArray(c.v) ? c.v : [c.v]).map(function (q) { var A = arcsOfNak(q); return [norm(A[0] + t), A[1]]; }) };
        case "rasi": return { g: c.g, rel: "_arcs", v: (Array.isArray(c.v) ? c.v : [c.v]).map(function (q) { return [norm(q * 30 + t), 30]; }) };
        case "exalt": case "own": case "debil":
          if (!(c.g in EXALT)) return x;
          var sg = c.rel === "exalt" ? [EXALT[c.g]] : c.rel === "debil" ? [(EXALT[c.g] + 6) % 12] : OWN[c.g];
          return { g: c.g, rel: "_arcs", v: sg.map(function (q) { return [norm(q * 30 + t), 30]; }) };
        case "nearstar": var yl = starLon(c.v, mid); return yl == null ? x : { g: c.g, rel: "nearlon", v: norm(yl + t), tol: c.tol };
        case "nearlon": x.v = norm(+c.v + t); return x;
        case "tithi": var sh = function (q) { return ((q - 1 + Math.round((th["Candra"] - th["Sūrya"]) / 12)) % 30 + 30) % 30 + 1; }; x.v = Array.isArray(c.v) ? c.v.map(sh) : sh(c.v); return x;
        case "month": var sm = function (q) { return ((q + Math.round(th["Sūrya"] / 30)) % 12 + 12) % 12; }; x.v = Array.isArray(c.v) ? c.v.map(sm) : sm(c.v); return x;
        case "_trop": x.v = [norm(c.v[0] + th["Sūrya"]), c.v[1]]; return x;
        case "rtu": return { g: "Sūrya", rel: "_trop", v: [norm(RTU0[c.v] + th["Sūrya"]), 60] };
        case "retro": case "station": if (c.v >= 0) x.v = ((c.v + Math.round(t / (40 / 3))) % 27 + 27) % 27; return x;
      }
      return x;                                   /* conjunctions, eclipses, ayana: kept as they are */
    });
    return { id: "", label: "randomised", conds: conds, mode: rd.mode, days: rd.days };
  }
  function chanceTest(rd, a, b, n, onProgress) {
    var mid = (a + b) / 2, out = { real: null, versions: [] }, i = -1, R = rng(20261118);
    function one() {
      if (i >= n) return Promise.resolve(out);
      var r = i < 0 ? rd : randomized(rd, R, mid), k = i + 1;
      return searchClaim(r, a, b, function (f) { onProgress((k + f) / (n + 1)); }).then(function (res) {
        var x = { n: res.episodes.length, capped: res.capped, conds: r.conds };
        if (i < 0) out.real = x; else out.versions.push(x);
        i++; return one();
      });
    }
    return one().then(function () {
      var v = out.versions, hits = v.filter(function (x) { return x.n > 0; }).length;
      out.mean = v.reduce(function (p, x) { return p + x.n; }, 0) / Math.max(1, v.length);
      out.pAny = hits / Math.max(1, v.length);
      out.years = (b - a) / YEAR;
      return out;
    });
  }
  function chanceTarget() {
    if ($("ks-chwhat").value === "chain") return { rd: linkReading(CH.links[0]), name: "link 1 of the chain" };
    var rds = readingsNow(); return { rd: rds[0], name: rds[0].mine ? "your own claim" : rds[0].claim.id + " reading " + rds[0].id };
  }
  function runChance() {
    var a = chainYears("ks-chy0", "ks-chera0"), b = chainYears("ks-chy1", "ks-chera1", true);
    if (b <= a) { $("ks-chancesum").innerHTML = "<b>The end of the range must come after its start.</b>"; return; }
    var T = chanceTarget(), n = +$("ks-chn").value || 10;
    if (!T.rd || contradictions(T.rd).length) { $("ks-chancesum").innerHTML = "<b>That reading can never hold, so there is nothing to test.</b>"; return; }
    CS.run++; CS.stop = false;
    var my = CS.run, bar = $("ks-chancebar"), t0 = Date.now();
    $("ks-chancego").disabled = true; $("ks-chancestop").disabled = false; bar.hidden = false; bar.value = 0; $("ks-chanceres").innerHTML = "";
    $("ks-chancesum").textContent = "Searching the reading, then " + n + " randomised versions of it…";
    chanceTest(T.rd, a, b, n, function (f) { if (my === CS.run) bar.value = Math.min(1, f); }).then(function (o) {
      if (my !== CS.run) return; fin();
      var N = Math.max(1, SESSION.readings), pAll = 1 - Math.pow(1 - o.pAny, N), per = function (k) { return (k / o.years * 10000).toFixed(k / o.years * 10000 < 10 ? 1 : 0); };
      $("ks-chancesum").innerHTML = "<b>" + esc(T.name) + "</b> over " + Math.round(o.years).toLocaleString("en") + " years (" + ((Date.now() - t0) / 1000).toFixed(0) + " s): the reading itself matches <b>" + o.real.n + "</b> time" + (o.real.n === 1 ? "" : "s") +
        " (" + per(o.real.n) + " per 10,000 years). With its targets moved at random, a sky of the same make-up matched <b>" + o.mean.toFixed(1) + "</b> times on average, and <b>" +
        Math.round(o.pAny * 100) + "%</b> of the " + n + " versions matched at least once.";
      $("ks-chanceres").innerHTML = '<p class="k-note"><b>What this means.</b> ' +
        (o.pAny >= 0.5 ? "A sky this specific turns up somewhere in this range more often than not, whatever its targets: finding a match proves little by itself. "
          : o.pAny > 0 ? "A sky this specific is uncommon in this range, but not rare enough that a match must be meaningful. "
          : "None of the randomised versions matched: in this range a sky this specific is rare, so a match carries weight — if the reading was fixed before searching. ") +
        "You have searched <b>" + SESSION.readings + "</b> reading" + (SESSION.readings === 1 ? "" : "s") + " this visit; if every one were a sky of this make-up, the chance that at least one matched by coincidence is about <b>" +
        Math.round(pAll * 100) + "%</b>. Every reading tried counts, which is why the reading should be fixed before the search, not chosen after it.</p>" +
        '<div class="eltblwrap"><table class="aytab ks-cltab"><thead><tr><th>version</th><th>matches</th><th>targets</th></tr></thead><tbody>' +
        [["the reading", o.real]].concat(o.versions.map(function (x, k) { return ["random " + (k + 1), x]; })).map(function (q) {
          return "<tr><td>" + q[0] + "</td><td class=\"num\">" + q[1].n + (q[1].capped ? "+" : "") + '</td><td class="elw">' + esc(q[1].conds.map(condText).join(" · ")) + "</td></tr>"; }).join("") +
        "</tbody></table></div>";
    }, function () { fin(); $("ks-chancesum").innerHTML = "<b>Stopped.</b>"; });
    function fin() { $("ks-chancego").disabled = false; $("ks-chancestop").disabled = true; bar.hidden = true; }
  }

  function chainInit() {
    if (!$("ks-chlinks")) return;
    CH.links = [newLink(true), newLink(false)];
    drawChain();
    $("ks-chlinks").addEventListener("change", function (ev) {
      var el = ev.target, row = el.closest && el.closest(".ks-chlink"), k2 = el.getAttribute("data-ch"); if (!row || !k2) return;
      var L = CH.links[+row.getAttribute("data-k")];
      if (k2 === "src") { var v = el.value; if (v === "preset") return; if (v === "mine") { L.src = "mine"; } else { L.src = "cat"; L.id = v; L.rd = claimOf(v).readings[0].id; } delete L.conds; }
      else if (k2 === "rd") L.rd = el.value;
      else if (k2 === "lagna") L.lagna = +el.value;
      else if (k2 === "unit") L.unit = el.value;
      else L[k2] = Math.max(0, Math.min(5000, +el.value || 0));
      drawChain();
    });
    $("ks-chlinks").addEventListener("click", function (ev) {
      var d = ev.target.getAttribute && ev.target.getAttribute("data-chdel"); if (d == null) return;
      CH.links.splice(+d, 1); if (CH.links[0]) { delete CH.links[0].min; delete CH.links[0].max; } drawChain();
    });
    $("ks-chadd").addEventListener("click", function () { if (CH.links.length < 5) { CH.links.push(newLink(false)); drawChain(); } });
    $("ks-chrama").addEventListener("click", function () {
      CH.links = JSON.parse(JSON.stringify(RAMA_PRESET.links));
      $("ks-chy0").value = 13000; $("ks-chera0").value = "BCE"; $("ks-chy1").value = 3000; $("ks-chera1").value = "BCE";
      drawChain();
      $("ks-chsum").innerHTML = "Preset loaded: link 1 is your seven conditions, with the Karka lagna reported as ΔT needed at the place set above (set it to Ayodhya); link 2 is Daśaratha's omens on the coronation day (R03 B), 24–27 years later. Search when ready.";
    });
    ["bal", "bhi"].forEach(function (k) {
      var bt = $("ks-ch" + k); if (!bt) return;
      bt.addEventListener("click", function () {
        var P = MBH_PRESETS[k]; CH.links = JSON.parse(JSON.stringify(P.links));
        $("ks-chy0").value = 6000; $("ks-chera0").value = "BCE"; $("ks-chy1").value = 1000; $("ks-chera1").value = "CE";
        drawChain(); $("ks-chsum").innerHTML = esc(P.note) + " Search when ready.";
      });
    });
    $("ks-chgo").addEventListener("click", runChain);
    $("ks-chstop").addEventListener("click", function () { CS.stop = true; });
    $("ks-chancego").addEventListener("click", runChance);
    $("ks-chancestop").addEventListener("click", function () { CS.stop = true; });
    $("ks-chres").addEventListener("click", function (ev) {
      var v = ev.target.getAttribute && ev.target.getAttribute("data-clshow"); if (v == null) return;
      writeWhen(+v); redrawMoment();
      var w = $("ks-wheel"); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }


  function bind() {
    K = window.KalasetuEngine; D = window.__KALASETU_DATA;
    if (!K || !D || !K.isFitted() || !window.__kEclipModern || !window.__ayanFor || !window.__kNodesModern) {
      $("ks-skytab").innerHTML = '<p class="swfail">The Kālasetu engine or its fitted numbers did not load, so this page has nothing to show.</p>';
      return;
    }
    S = window.SSEngine || null;
    try { if (S && window.__SS_FIT_DATA) { S.setMeasured(window.__SS_FIT_DATA); S.measured(); } } catch (e) { S = null; }
    $("ks-presets").innerHTML = PRESETS.map(function (p, i) { return '<button type="button" class="swbtn" data-ks-preset="' + i + '">' + esc(p[0]) + "</button>"; }).join("");
    $("ks-graha").innerHTML = G.map(function (g) { return '<option value="' + g[0] + '">' + esc(g[0] + " · " + g[1]) + "</option>"; }).join("");
    $("ks-accbody").innerHTML = ROWS.map(function (b) { return '<option value="' + esc(b) + '"' + (b === "Candra" ? " selected" : "") + ">" + esc(b) + "</option>"; }).join("");
    $("ks-erabody").innerHTML = ROWS.map(function (b) { return '<option value="' + esc(b) + '"' + (b === "Śani" ? " selected" : "") + ">" + esc(b) + "</option>"; }).join("");
    /* the fit: Auto everywhere on the site; forcing one here is this page's alone */
    $("ks-fit").addEventListener("change", function () { if (K.use) K.use($("ks-fit").value); redrawMoment(); });
    $("ks-erabody").addEventListener("change", eras);
    $("ks-era").addEventListener("change", function () { $("ks-year").max = $("ks-era").value === "BCE" ? 13000 : 3600; });
    /* the conventions: set from the saved choice, and every change redraws */
    [["ks-cal", "cal"], ["ks-frame", "frame"], ["ks-nodeconv", "node"], ["ks-nakconv", "nak"], ["ks-msys", "msys"], ["ks-mname", "mname"], ["ks-rtu", "rtu"]].forEach(function (c) {
      var el = $(c[0]); if (!el) return; el.value = CONV[c[1]];
      el.addEventListener("change", function () { CONV[c[1]] = el.value; saveConv();
        if (c[1] === "cal") writeWhen(ST.ms);          /* the same instant, written in the other calendar */
        redrawMoment(); });
    });
    $("ks-groups").innerHTML = GROUPS.map(function (g) { return '<label><input type="checkbox" checked data-ks-group="' + g[0] + '"> ' + esc(g[1]) + "</label>"; }).join("");
    writeWhen(Date.now());
    ["ks-era", "ks-year", "ks-month", "ks-day", "ks-time"].forEach(function (id) {
      $(id).addEventListener("change", function () { readWhen(); redrawMoment(); }); });
    /* changing what the clock means keeps the instant and rewrites the clock */
    $("ks-tmode").addEventListener("change", function () { writeWhen(ST.ms); redrawMoment(); });
    /* changing the place keeps the clock time and moves the instant — a birth
       time is given on the place's own clock */
    function placeChanged() { readWhen(); redrawMoment(); }
    ["ks-lat", "ks-lon"].forEach(function (id) { $(id).addEventListener("change", function () {
      ST.place = { n: "Custom coordinates", lat: latNow(), lon: lonNow(), zone: null };
      if (ST.picker) ST.picker.set(ST.place); placeChanged(); }); });
    if (window.NPlaces && window.NPlaces.picker) {
      ST.picker = window.NPlaces.picker({ host: $("ks-place"), value: ST.place, quick: QUICK, label: "Place",
        refMs: function () { return Date.now(); },
        onPick: function (p) {
          ST.place = { n: p.n, lat: p.lat, lon: p.lon, zone: p.zone || null };
          $("ks-lat").value = (+p.lat).toFixed(4); $("ks-lon").value = (+p.lon).toFixed(4);
          placeChanged();
        } });
    }
    document.addEventListener("click", function (e) {
      var sb = e.target.closest && e.target.closest("[data-ks-step],[data-ks-play]");
      if (sb) { if (sb.hasAttribute("data-ks-play")) togglePlay(); else { stopPlay(); stepBy(+sb.getAttribute("data-ks-step")); } return; }
      var t = e.target.closest && e.target.closest("[data-ks-preset],[data-ks]"); if (!t) return;
      if (t.hasAttribute("data-ks-preset")) { stopPlay(); writeWhen(PRESETS[+t.getAttribute("data-ks-preset")][1]()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "now") { writeWhen(Date.now()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "measure") measure();
    });
    $("ks-graha").addEventListener("change", steps);
    $("ks-unit").addEventListener("change", function () { stopPlay(); resetScrub(); });
    var scrub = $("ks-scrub");
    scrub.addEventListener("input", function () {
      stopPlay();
      if (!ST.scrubbing) { ST.scrubbing = true; if (ST.anchor == null) ST.anchor = ST.ms; }
      var k = +scrub.value;
      writeWhen(shifted(ST.anchor, unitNow(), k)); redrawMoment(); scrubLabel(k);
    });
    scrub.addEventListener("change", function () { ST.scrubbing = false; resetScrub(); });
    $("ks-accbody").addEventListener("change", bands);
    $("ks-groups").addEventListener("change", moonTerms);
    tiles(); accTable(); bands(); eras(); history(); claimsInit(); chainInit(); cost(); built();
    redrawMoment(); clearTimeout(ST.heavy); deltaT(); nodes(); gi(); moonTerms(); measure();
    window.__ksPage = { setMoment: function (ms) { writeWhen(ms); redrawMoment(); }, measure: measure, moonTerms: moonTerms,
      step: stepBy, eras: eras, conv: function (k, v) { if (v === undefined) return CONV[k]; CONV[k] = v;
        var id = { cal: "ks-cal", frame: "ks-frame", node: "ks-nodeconv", nak: "ks-nakconv", msys: "ks-msys", mname: "ks-mname", rtu: "ks-rtu" }[k];
        if ($(id)) $(id).value = v; if (k === "cal") writeWhen(ST.ms); redrawMoment(); }, useFit: function (m) { $("ks-fit").value = m; if (K.use) K.use(m); redrawMoment(); },
      state: function () { return { ms: ST.ms, place: ST.place, mode: $("ks-tmode").value }; },
      claims: function () { return CLAIMS; }, search: function (rd, a, b) { CS.run++; CS.stop = false; return searchClaim(rd, a, b, function () {}); },
      chain: function (links, a, b) { CS.run++; CS.stop = false; return chainSearch(links, a, b, function () {}); },
      chance: function (rd, a, b, n) { CS.run++; CS.stop = false; return chanceTest(rd, a, b, n, function () {}); },
      dtNeeded: dtNeeded, rama: RAMA_PRESET, mbh: MBH_PRESETS, eclSeen: eclSeen };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
;
