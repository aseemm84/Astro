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

     WHAT IS THE TEXT'S, AND WHAT IS BORROWED. The body of that PDF is page
     images; only pages 408–419 carry a text layer, so every figure below was
     OCR'd at 300–400 dpi and checked, and the ones the extraction never
     reached are NOT invented — they are taken from the Later Sūrya Siddhānta
     constants above and NAMED, individually, in panchaSauraInfo().borrowed.
     Any page showing this tier must print that list. A tier that is four
     twentieths someone else's numbers while wearing Varāhamihira's name would
     be a worse object than no tier at all.

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
      "Śani":    146564         /* days × 1000 ÷ 10,766,066 */
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
      "Śani":    { manda: 60,  sighra: 40 }
    },
    /* Named individually, because an undisclosed borrow is the whole risk
       here. Each entry says what was wanted and why it is not the text's. */
    borrowed: [
      ["YUGA.rev.candraUcca", "the Moon's apogee revolutions",
       "PS I.14 gives the Moon but neither the apogee nor the node. Ch. XVI " +
       "was not reached by the OCR for them. Only their EPOCH LONGITUDES are " +
       "text-verified (apogee 90°, node 180°), and those are already what " +
       "this engine ships."],
      /* "as above" was the first draft of this, and the harness refused it:
         each entry is rendered on its own in a list, where a back-reference
         explains nothing. */
      ["YUGA.rev.Rāhu", "the node's revolutions",
       "PS I.14 gives the lunar revolutions but not the node's. Ch. XVI was " +
       "not reached by the OCR for it. Its EPOCH LONGITUDE of 180° is " +
       "text-verified — Sastry's notes to Ch. XVI put the node there at Kali " +
       "in the Āryabhaṭīya, the Ardharātrika-pakṣa, Varāhamihira's Saura, " +
       "Bhaṭṭotpala's Pauliśa and the Later Sūrya Siddhānta alike — and that " +
       "is already what this engine ships."],
      ["EPI.Candra", "the Moon's epicycle",
       "the extraction recorded the five star-planets and the Sun's value " +
       "(via Śukra's), not the Moon's. The later recension's pair is kept " +
       "rather than guessing a single value from the one-value pattern."],
      ["MANDOCCA.Sūrya", "the Sun's apogee",
       "the five star-planets' mandocca are text-verified and agree exactly; " +
       "the Sun's was not among them."]
    ]
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
       panchaSauraInfo().borrowed is NOT optional reading for a page that
       displays this tier: four quantities in it are the Later Sūrya
       Siddhānta's because the OCR never reached them, and each is named. */
    panchaSaura: applyPanchaSaura,
    isPanchaSaura: function(){ return PS_ON; },
    panchaSauraInfo: function(){
      return {
        source: "Pañcasiddhāntikā of Varāhamihira, Ch. XVI–XVII; Kuppanna " +
                "Sastry tr., K. V. Sarma ed., PPST Foundation, Madras, 1993",
        civilDays: PS_CONST.civilDays,
        laterSSCivilDays: BASE_CONST.civilDays,
        civilDayGap: BASE_CONST.civilDays - PS_CONST.civilDays,
        impliedYear: PS_CONST.civilDays / YUGA.years,
        rev: JSON.parse(JSON.stringify(PS_CONST.rev)),
        epi: JSON.parse(JSON.stringify(PS_CONST.epi)),
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
     ["Ahargaṇa now", Math.floor(S.ahargana(WHEN)).toLocaleString("en") + " days"],
     ["Radius of the sine table", S.RAD + " — the minutes of arc in a radian, " +
        "which is why that number and not another"],
     ["Obliquity", S.OBLIQUITY + "°, against a modern 23.44° and shrinking"],
     ["Ayanāṃśa now", S.ayanamsa(WHEN).toFixed(3) + "° by the " +
        S.OPT.ayana + " reading"],
     ["Anomalistic month", S.constants().anomalisticMonthDays.toFixed(6) +
        " days — out by " +
        Math.abs((S.constants().anomalisticMonthDays - 27.554549878) * 86400)
          .toFixed(2) + " s"],
     ["Draconitic month", S.constants().draconiticMonthDays.toFixed(6) +
        " days — out by " +
        Math.abs((S.constants().draconiticMonthDays - 27.212220817) * 86400)
          .toFixed(2) + " s"],
     ["An intercalary month", "every " +
        S.constants().adhikaMasaYears.toFixed(3) + " years, which follows from " +
        "the year holding " + S.constants().monthsPerYear.toFixed(6) +
        " lunar months"],
     ["Elapsed Kali", S.era(WHEN).kaliElapsed.toLocaleString("en") + " years"]
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
      "The modern column is this site's own ephemeris, sidereal, in the " +
      (window.__ayanName ? window.__ayanName() : "Lahiri") + " ayanāṃśa — this page's " +
      "default is Lahiri, and the picker above changes it for this page alone. The difference is not an " +
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


  /* ---- the day --------------------------------------------------------- */
  var PLACE = { n: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 };
  function hm(ms) {
    var d = new Date(ms + PLACE.tz * 3600000);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function dayPanel() {
    var S = window.SSEngine, host = $("ss-day");
    if (!host) return;
    host.innerHTML = "";
    var D = S.sunriseSunset(WHEN, PLACE);
    if (!D) return;
    var mo = null;
    try { mo = window.NP ? window.NP.day(WHEN, PLACE) : null; } catch (e) {}
    var rows = [
      ["Sunrise", hm(D.sunrise), mo ? "a modern ephemeris: " + hm(mo.sunrise) +
        "  ·  " + ((D.sunrise - mo.sunrise) / 60000).toFixed(1) + " min apart" : ""],
      ["Sunset", hm(D.sunset), mo ? "a modern ephemeris: " + hm(mo.sunset) : ""],
      ["Length of the day", D.dayHours.toFixed(4) + " h",
        "twelve hours plus twice the cara"],
      ["Declination of the Sun", D.declination.toFixed(4) + "°",
        "of the sāyana longitude, at an obliquity of " + S.OBLIQUITY + "°"],
      ["Cara", D.cara.toFixed(4) + "°",
        "the ascensional difference — what makes a summer day long"],
      ["Bhujāntara", D.bhujantaraMinutes.toFixed(2) + " min",
        "the Sun's own equation of centre, as time"],
      ["Udayāntara", D.udayantaraMinutes.toFixed(2) + " min",
        "the obliquity's share of the equation of time"],
      ["Equation of time", D.equationOfTimeMinutes.toFixed(2) + " min",
        "the two together"]
    ];
    var L = S.lagna(WHEN, PLACE);
    if (L) rows.push(["Lagna rising", dms(L.lon),
      "walked out of the oblique ascensions; sāyana " + dms(L.tropical)]);
    host.appendChild(table3(rows));
    host.appendChild(el("p", "ssnote",
      "Computed for " + PLACE.n + ". The place matters: the deśāntara shifts " +
      "every mean place by the longitude's share of a day, and the cara is a " +
      "function of the latitude."));
  }
  function table3(rows) {
    var t = el("table", "tbl"), tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "num", r[1]));
      tr.appendChild(el("td", "muted", r[2] || ""));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  /* ---- the pañcāṅga ---------------------------------------------------- */
  function panchangaPanel() {
    var S = window.SSEngine, host = $("ss-panchanga");
    if (!host) return;
    host.innerHTML = "";
    var p = S.panchanga(WHEN, PLACE);
    var m = null;
    try { m = window.NP ? window.NP.day(WHEN, PLACE) : null; } catch (e) {}
    var modT = m ? m.at.tithi.n + (m.at.tithi.paksha === "kṛṣṇa" ? 15 : 0) : null;
    host.appendChild(table3([
      ["Vāra", p.vara.name + " — " + p.vara.english,
        "from the ahargaṇa alone: " + Math.floor(p.ahargana).toLocaleString("en") +
        " days since the epoch, modulo seven"],
      ["Tithi", p.tithi.paksha + " " + p.tithi.name + "  (" + p.tithi.n + " of 30)",
        modT ? "a modern pañcāṅga: " + modT +
          (modT === p.tithi.n ? " — the same" : " — one apart") : ""],
      ["Nakṣatra", p.nakshatra.name + ", pāda " + p.nakshatra.pada,
        m ? "a modern pañcāṅga: " + m.at.nak.name : ""],
      ["Yoga", p.yoga.name + "  (" + p.yoga.n + ")",
        m && m.at.yoga ? "a modern pañcāṅga: " + m.at.yoga.name : ""],
      ["Karaṇa", p.karana.name, "the half-tithi"],
      ["Sun", dms(p.sun), "Sūrya Siddhānta"],
      ["Moon", dms(p.moon), "Sūrya Siddhānta"]
    ]));
  }

  /* ---- eclipses --------------------------------------------------------- */
  function eclipsePanel() {
    var S = window.SSEngine, host = $("ss-eclipses");
    if (!host) return;
    host.innerHTML = "";
    var from = +($("ss-efrom") || { value: 2024 }).value;
    var to = +($("ss-eto") || { value: 2032 }).value;
    if (!(to > from)) return;
    if (to - from > 60) to = from + 60;
    var list;
    try { list = S.eclipsesIn(Date.UTC(from, 0, 1), Date.UTC(to, 0, 1), PLACE); }
    catch (e) { return; }
    if (!list.length) {
      host.appendChild(el("p", "ssnote", "None found in that span."));
      return;
    }
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Kind", "When", "Magnitude", "Moon's latitude", "Half-duration"]
      .forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    list.forEach(function (q) {
      var e = q.e, tr = el("tr");
      tr.appendChild(el("td", null, q.kind === "lunar" ? "Lunar" : "Solar"));
      tr.appendChild(el("td", "num",
        new Date(e.at + PLACE.tz * 3600000).toISOString().slice(0, 16).replace("T", "  ")));
      tr.appendChild(el("td", "num", e.magnitude.toFixed(2) +
        (e.total ? "  total" : (e.annular ? "  annular" : ""))));
      tr.appendChild(el("td", "num", e.latitude.toFixed(3) + "°"));
      tr.appendChild(el("td", "num", e.halfDurationHours != null
        ? (e.halfDurationHours * 60).toFixed(0) + " min" : "—"));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
    host.appendChild(el("p", "ssnote",
      list.length + " in " + (to - from) + " years, by the Sūrya Siddhānta's " +
      "own reckoning. Set beside a modern eclipse list, the two agree on the " +
      "deep eclipses and differ on some slight ones, and the reason is the " +
      "node: the text's draconitic month differs from the modern one by about " +
      "two seconds, and two seconds carried across the circuits the node has " +
      "made since the epoch places it a few degrees from the modern node — " +
      "and an eclipse season sits where the node says it does. Solar eclipses are judged for " + PLACE.n +
      ", because parallax makes a solar eclipse a question about where you " +
      "are standing."));
  }

  /* ---- the trigonometry -------------------------------------------------- */
  function trigPanel() {
    var S = window.SSEngine, host = $("ss-trig");
    if (!host) return;
    host.innerHTML = "";
    var keep = S.OPT.sines;
    S.options({ sines: "exact" });
    var ex = S.positions(WHEN).grahas;
    S.options({ sines: "table" });
    var tb = S.positions(WHEN).grahas;
    S.options({ sines: keep });
    var rows = [];
    S.SA.forEach(function (sa) {
      if (!ex[sa] || !tb[sa]) return;
      var d = S.norm(tb[sa].lon - ex[sa].lon);
      if (d > 180) d -= 360;
      rows.push([sa, (d * 60).toFixed(2) + "′",
                 "table " + tb[sa].lon.toFixed(4) + "°, exact " +
                 ex[sa].lon.toFixed(4) + "°"]);
    });
    host.appendChild(el("p", "ssnote",
      "What the table costs, at this moment, in minutes of arc:"));
    host.appendChild(table3(rows));
    /* the table itself */
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Arc", "Jyā", "The sine function", "Out by"].forEach(function (h) {
      hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tbody = el("tbody");
    S.JYA.forEach(function (v, i) {
      var arc = i * 3.75;
      var exact = S.RAD * Math.sin(arc * Math.PI / 180);
      var tr = el("tr");
      tr.appendChild(el("td", "num", arc.toFixed(2) + "°"));
      tr.appendChild(el("td", "num", String(v)));
      tr.appendChild(el("td", "num", exact.toFixed(2)));
      tr.appendChild(el("td", "num", (v - exact).toFixed(2)));
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    host.appendChild(t);
  }

  /* ---- what is absent ---------------------------------------------------- */
  function absentPanel() {
    var S = window.SSEngine, host = $("ss-absent");
    if (!host) return;
    host.innerHTML = "";
    S.ABSENT.forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q.what + " — "));
      li.appendChild(document.createTextNode(q.why));
      host.appendChild(li);
    });
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

    /* THE PALETTE COMES FROM THE THEME, not from this file.
       A canvas is an image as far as the contrast harness is concerned, so
       the hardcoded greys this chart began with passed every check and were
       still unreadable on the three dark palettes: grey-on-near-black axis
       labels under a curve the reader could not see. Read the tokens the
       stylesheet has already resolved, and fall back to the original values
       when a token is missing so an older stylesheet still draws. */
    function tok(name, dflt) {
      try {
        var v = getComputedStyle(cv).getPropertyValue(name).trim();
        return v || dflt;
      } catch (e) { return dflt; }
    }
    var CLR = {
      grid: tok("--border-2", "#c9c9d8"),
      faint: tok("--border", "#eceaf2"),
      ink: tok("--muted-2", "#6c7089"),
      line: "#c9a24b",
      now: tok("--sem-bad", "#b5533c")
    };

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
    c.strokeStyle = CLR.grid; c.lineWidth = 1;
    c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
    c.fillStyle = CLR.ink;
    c.font = "11px system-ui,-apple-system,sans-serif";
    c.textAlign = "right"; c.textBaseline = "middle";
    [lo + pad, 0, hi - pad].forEach(function (v) {
      c.fillText(v.toFixed(1) + "°", L - 6, Y(v));
      c.strokeStyle = CLR.faint;
      c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
    });
    c.textAlign = "center"; c.textBaseline = "top";
    for (var k = 0; k <= 4; k++) {
      var yy = from + (to - from) * k / 4;
      c.fillText(Math.round(yy), X(yy), h - B + 6);
    }
    c.strokeStyle = CLR.line; c.lineWidth = 2;
    c.beginPath();
    pts.forEach(function (p, i2) {
      if (i2) c.lineTo(X(p.y), Y(p.d)); else c.moveTo(X(p.y), Y(p.d));
    });
    c.stroke();
    /* where we are now */
    var nowY = new Date().getUTCFullYear();
    if (nowY > from && nowY < to) {
      c.strokeStyle = CLR.now; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(X(nowY), Tp); c.lineTo(X(nowY), h - B); c.stroke();
      c.setLineDash([]);
      c.fillStyle = CLR.now; c.textAlign = "left";
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
            " seconds longer than the modern sidereal year accumulates over that time"
          : "");
    }
  }

  function redraw() {
    params(); now(); working(); trigPanel(); dayPanel(); panchangaPanel();
    eclipsePanel(); absentPanel(); drift();
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
        redraw();
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
    var si = $("ss-sines");
    if (si) si.addEventListener("change", function () {
      window.SSEngine.options({ sines: si.value }); redraw(); });
    var ay = $("ss-ayana");
    if (ay) ay.addEventListener("change", function () {
      window.SSEngine.options({ ayana: ay.value }); redraw(); });
    ["ss-efrom", "ss-eto"].forEach(function (id) {
      var e = $(id);
      if (e) e.addEventListener("change", eclipsePanel);
    });
    redraw();
    window.addEventListener("resize", function () { drift(); });
    try {
      window.__ss = { when: function () { return WHEN; }, redraw: redraw,
                      setWhen: function (t) { WHEN = t; redraw(); },
                      place: function () { return PLACE; } };
    } catch (e) {}
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
;

/* ===== The Sūrya Siddhānta page, part two: the sandbox and the geometry =====

   ss-page.js tabulates what the engine is doing. This adds the four things a
   table cannot carry:

     the jyā table drawn against a true sine, with its residual magnified;
     the manda and śīghra constructions drawn as the geometry they are;
     a sandbox over the engine's own correctable constants, scored live;
     the three skies — text, fitted tier, modern — on one ring.

   SEPARATE FILE ON PURPOSE. ss-page.js is working, verified code that owns
   every existing panel on this page. Nothing here touches it: this module
   reads window.SSEngine and window.__ss (the handle ss-page.js already
   publishes) and writes only into hosts that did not exist before.

   THE ONE THING TO GET RIGHT IS THE FRAME. The fitted tier was fitted in the
   site's own Lahiri sidereal frame, not in the text's libration ayanāṃśa — the
   provenance in the data file says so in as many words — so a score taken in
   any other frame would be measuring the frame and not the constants. Every
   comparison here subtracts the same Lahiri polynomial the fit used, carried in
   the data file beside the constants for exactly this reason, from a modern
   TROPICAL longitude. That is the identical recipe
   siddhanta-measured-verify.mjs uses, so a number printed here and a number
   printed by the harness mean the same thing. */
(function () {
  "use strict";

  var SA7 = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  /* the five that carry a śīghra epicycle; the Sun and Moon take manda alone */
  var STAR = { "Maṅgala": 1, "Budha": 1, "Guru": 1, "Śukra": 1, "Śani": 1 };

  function $(id) { return document.getElementById(id); }
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
  function mins(x) {       /* a signed quantity in degrees, shown in arcminutes */
    return (x >= 0 ? "+" : "−") + (Math.abs(x) * 60).toFixed(2) + "′";
  }
  var DEG = Math.PI / 180;

  var S = null, FIT = null, LAH = null;
  var WHEN = Date.now();
  var ANOM = 90, SPIN = null, EBODY = "Śani", SBODY = "Sūrya";
  var MODE = "bare";                 /* bare | fitted | custom */
  var CUSTOM = null;                 /* params in force when MODE === "custom" */

  /* ---- the frame, and the score ------------------------------------------- */
  function lahiriAt(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return LAH[2] + LAH[1] * T + LAH[0] * T * T;
  }
  /* The modern sky in the frame the fit used. __kEclip gives the TROPICAL
     longitude as well as the sidereal one; the tropical is what this wants,
     because the site's own ayanāṃśa setting must not enter a score of the
     siddhānta's constants. */
  function refLon(sa, ms) {
    try {
      var e = window.__kEclip(EN[sa], ms);
      if (!e) return null;
      return norm(e.trop - lahiriAt(ms / 86400000 + 2440587.5));
    } catch (err) { return null; }
  }

  /* The sample. Fixed before the reader touches anything, spread across the
     band the modern engine is certified over, and deterministic — a score that
     moved when you re-rolled the sample would be worthless for comparing one
     set of constants with another. */
  var SAMPLE = [], REF = {};
  function buildSample() {
    SAMPLE = [];
    /* SIXTY-FOUR, AND THE PHASES IRRATIONALLY SPACED.
       The first version took twenty-four samples at years evenly spaced across
       the band, with the day-of-year stepped by a small integer. Six of the
       seven grahas scored within a tenth of the project's own published
       figure; Maṅgala came out at 33′ against a published 58′, which looked
       like an improvement and was aliasing. Even year spacing over 1800–2200
       is a step of 17.4 years, and Maṅgala's synodic period is 2.14 — eight
       steps to the cycle, so the sample kept landing at the same phase of the
       term the fit cannot model, and missed its peaks. Spacing the phase by
       the golden ratio is incommensurate with every period in the problem, and
       sixty-four samples then reproduce all seven published figures. */
    var N = 64, PHI = 0.6180339887498949;
    for (var i = 0; i < N; i++) {
      var y = 1800 + (2200 - 1800) * i / (N - 1);
      var days = ((i * PHI) % 1) * 365.2425;
      SAMPLE.push(Date.UTC(Math.floor(y), 0, 1, 6, 0, 0) +
                  Math.round((y - Math.floor(y)) * 365.2425 * 86400000) +
                  Math.round(days * 86400000));
    }
    REF = {};
    SA7.forEach(function (sa) {
      REF[sa] = SAMPLE.map(function (ms) { return refLon(sa, ms); });
    });
    var n = $("ss-nsamp");
    if (n) n.textContent = SAMPLE.length;
  }
  /* rms of (siddhānta − modern) in arcminutes, for one graha, as the engine
     currently stands */
  function score(sa) {
    var s = 0, k = 0;
    for (var i = 0; i < SAMPLE.length; i++) {
      if (REF[sa][i] == null) continue;
      var q = S.trueLongitude(sa, S.ahargana(SAMPLE[i]));
      if (!q) continue;
      var d = sdiff(q.lon, REF[sa][i]) * 60;
      s += d * d; k++;
    }
    return k ? Math.sqrt(s / k) : null;
  }

  /* ---- applying a parameter set ------------------------------------------- */
  /* Driven through the engine's own documented door — setMeasured() then
     measured() — rather than by reaching into its constants. The engine keeps
     an untouched copy of every original value and bare() restores it exactly;
     that guarantee is asserted elsewhere and this module must not be the thing
     that breaks it. */
  function neutral() {
    var P = {};
    SA7.forEach(function (sa) {
      P["bija." + sa] = 0; P["epoch." + sa] = 0; P["mandocca." + sa] = 0;
      P["mandaOdd." + sa] = 1; P["mandaEven." + sa] = 1;
      if (STAR[sa]) { P["sighraOdd." + sa] = 1; P["sighraEven." + sa] = 1; }
    });
    P["bija.candraUcca"] = 0; P["epoch.candraUcca"] = 0;
    return P;
  }
  /* THE BORROWED-QUANTITY DISCLOSURE, rendered from the engine.
   *
   * The Pañcasiddhāntikā tier carries four quantities that are the Later
   * Sūrya Siddhānta's, because the edition in the project is page images and
   * the OCR never reached the chapter that would give them. The page used to
   * name those four in hardcoded prose, which is a claim about the engine
   * written somewhere the engine cannot correct — close one of them and the
   * prose would go on asserting four. Rendered from
   * panchaSauraInfo().borrowed instead, so the disclosure is whatever the
   * tier actually does. */
  function psBorrowList() {
    var host = document.getElementById("ss-psborrow");
    if (!host || !S.panchaSauraInfo) return;
    var b = (S.panchaSauraInfo().borrowed || []);
    if (!b.length) {
      host.innerHTML = "<li>None — every constant in this tier is the text's own.</li>";
      return;
    }
    host.innerHTML = b.map(function (x) {
      return '<li><b>' + esc(x.what) + '</b> <code>' + esc(x.path) + '</code><br>' +
             esc(x.why) + '</li>';
    }).join("");
  }

  function apply() {
    if (MODE === "bare") { S.bare(); S.setMeasured(FIT); return; }
    /* The Pañcasiddhāntikā tier is a CONSTANTS tier, not a fitted one: it
       carries an older recension's own numbers and takes no bīja, so it goes
       through bare() first and never touches setMeasured(). Four of its
       quantities are the Later SS's because the OCR never reached them, and
       the page prints that list from panchaSauraInfo().borrowed — a tier that
       is partly someone else's numbers under Varāhamihira's name would be a
       worse object than no tier at all. */
    if (MODE === "ps") { S.bare(); S.panchaSaura(); S.setMeasured(FIT); return; }
    /* (psBorrowList() below renders the disclosure from the engine's own
       list, so the page cannot claim a different set of borrows than the
       tier actually has.) */
    /* bare() FIRST, always. Before the Pañcasiddhāntikā tier existed, every
       mode here was a set of offsets over one fixed set of constants, so
       nothing had to be cleared. Now a mode can REPLACE the constants, and
       dragging a slider from that tier would have layered a bīja on top of
       Varāhamihira's revolutions and called the result "your own constants".
       One line, and the modes cannot compound. */
    S.bare();
    var P = MODE === "fitted" ? FIT.params : CUSTOM;
    S.setMeasured({ params: P });
    S.measured();
    S.setMeasured(FIT);     /* leave the real fitted doc in place for next time */
  }
  function keysFor(sa) {
    /* the parameters the optimiser used FOR THIS BODY, read from the data file
       rather than listed here, so the sandbox offers exactly the knobs the
       fitted tier was allowed and no others */
    var r = FIT.residuals[sa];
    return r && r.params ? Object.keys(r.params) : [];
  }
  var RANGE = {
    bija: [-600, 600, 0.5, "revolutions added per Mahāyuga"],
    epoch: [-180, 180, 0.05, "degrees added at the Kali epoch"],
    mandocca: [-180, 180, 0.1, "degrees added to the apsis"],
    mandaOdd: [0.4, 1.6, 0.002, "× the stated manda paridhi, odd quadrants"],
    mandaEven: [0.4, 1.6, 0.002, "× the stated manda paridhi, even quadrants"],
    sighraOdd: [0.4, 1.6, 0.002, "× the stated śīghra paridhi, odd quadrants"],
    sighraEven: [0.4, 1.6, 0.002, "× the stated śīghra paridhi, even quadrants"]
  };
  function kindOf(k) { return k.split(".")[0]; }
  function neutralFor(k) {
    var kind = kindOf(k);
    return (kind === "mandaOdd" || kind === "mandaEven" ||
            kind === "sighraOdd" || kind === "sighraEven") ? 1 : 0;
  }
  function labelFor(k) {
    var p = k.split("."), kind = p[0], who = p[1];
    var what = { bija: "bīja on the revolutions", epoch: "longitude at epoch",
                 mandocca: "mandocca", mandaOdd: "manda paridhi, odd",
                 mandaEven: "manda paridhi, even",
                 sighraOdd: "śīghra paridhi, odd",
                 sighraEven: "śīghra paridhi, even" }[kind] || kind;
    return what + (who === "candraUcca" ? " (the Moon's apogee)" : "");
  }

  /* ---- the sandbox -------------------------------------------------------- */
  function sliders() {
    var host = $("ss-sliders");
    if (!host) return;
    var ks = keysFor(SBODY);
    /* "ps" takes neutral() with "bare", not CUSTOM. The sliders carry
       OFFSETS — a bīja on revolutions, degrees on an apsis, a scale on a
       paridhi — and the Pañcasiddhāntikā tier applies none of them: it
       replaces the constants outright. Falling through to CUSTOM here left it
       null and threw on the first slider read. */
    var cur = (MODE === "bare" || MODE === "ps") ? neutral()
            : (MODE === "fitted" ? FIT.params : CUSTOM);
    host.innerHTML = ks.map(function (k) {
      var R = RANGE[kindOf(k)] || [-1, 1, 0.01, ""];
      var v = cur[k] != null ? cur[k] : neutralFor(k);
      return '<label class="sslab"><span class="sslabk">' + esc(labelFor(k)) +
        '</span><input type="range" class="sslide" data-sskey="' + esc(k) +
        '" min="' + R[0] + '" max="' + R[1] + '" step="' + R[2] +
        '" value="' + v + '"><output class="sslabv" data-ssout="' + esc(k) +
        '">' + fmtVal(k, v) + '</output><span class="sslabu">' + esc(R[3]) +
        "</span></label>";
    }).join("") || '<p class="ssnote">This graha has no fitted parameters.</p>';
  }
  function fmtVal(k, v) {
    var kind = kindOf(k);
    if (kind === "bija") return (v >= 0 ? "+" : "") + (+v).toFixed(2);
    if (kind === "epoch" || kind === "mandocca")
      return (v >= 0 ? "+" : "") + (+v).toFixed(3) + "°";
    return (+v).toFixed(3) + "×";
  }
  function scoreTable() {
    var host = $("ss-score");
    if (!host) return;
    var rows = SA7.map(function (sa) {
      var now = score(sa), r = FIT.residuals[sa];
      return { sa: sa, now: now,
               bare: r ? r.bare.rms : null,
               fit: r ? r.holdout.rms : null };
    });
    /* the bar is scaled to the worst BARE figure, so the scale does not move
       under the reader as they improve one graha */
    var top = Math.max.apply(null, rows.map(function (r) {
      return Math.max(r.bare || 0, r.now || 0); }));
    host.innerHTML = '<div class="aytabwrap"><table class="aytab ssscore"><thead><tr>' +
      '<th>Graha</th><th>as it stands now</th><th></th>' +
      '<th>the text as written</th><th>the fitted tier, out of sample</th>' +
      '</tr></thead><tbody>' + rows.map(function (r) {
        var w = r.now == null ? 0 : Math.min(100, r.now / top * 100);
        var good = r.bare != null && r.now != null && r.now < r.bare;
        return "<tr" + (r.sa === SBODY ? ' class="on"' : "") + "><td>" + esc(r.sa) +
          '</td><td class="num"><b>' + (r.now == null ? "—" : r.now.toFixed(2) + "′") +
          '</b></td><td class="ssbarcell"><span class="ssbar' +
          (good ? " good" : "") + '"><i style="width:' + w.toFixed(1) +
          '%"></i></span></td><td class="num">' +
          (r.bare == null ? "—" : r.bare.toFixed(1) + "′") +
          '</td><td class="num">' +
          (r.fit == null ? "—" : r.fit.toFixed(2) + "′") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    var note = $("ss-scorenote");
    if (note) {
      var tot = rows.reduce(function (a, r) { return a + (r.now || 0); }, 0);
      var bareTot = rows.reduce(function (a, r) { return a + (r.bare || 0); }, 0);
      note.innerHTML = "Showing <b>" +
        (MODE === "bare" ? "the text as written"
          : MODE === "fitted" ? "the fitted tier — the text's method carrying " +
            "measured numbers, not the text's answer"
          : MODE === "ps" ? "Varāhamihira's Saura — the same equations carrying " +
            "an older recension's own constants, four of which are the Later " +
            "Sūrya Siddhānta's because the text could not be read for them"
          : "your own constants — the text's method carrying your numbers") +
        "</b>. Summed across the seven: <b>" + tot.toFixed(1) +
        "′</b> against the bare text's " + bareTot.toFixed(1) +
        "′. The last column is the project's own published figure, measured on " +
        "instants its optimiser never saw; this page's own score, in the second " +
        "column, is taken on " + SAMPLE.length + " instants that are fixed but " +
        "not held out, so it is the easier of the two tests.";
    }
  }

  /* A small coordinate descent, so a reader can see what the fit was doing
     rather than only its result. Deliberately crude and deliberately bounded:
     it is a demonstration of the method, not the optimiser that produced the
     committed constants — that one is source/test/fit-siddhanta.mjs, runs for
     1500 iterations and fits against ERFA rather than against this page. */
  function autoFit(sa) {
    var ks = keysFor(sa);
    if (!ks.length) return;
    if (MODE !== "custom") {
      CUSTOM = {};
      var base = MODE === "fitted" ? FIT.params : neutral();
      for (var k in base) CUSTOM[k] = base[k];
      MODE = "custom";
    }
    var best = (apply(), score(sa));
    for (var pass = 0; pass < 14; pass++) {
      var moved = false;
      for (var i = 0; i < ks.length; i++) {
        var key = ks[i], R = RANGE[kindOf(key)] || [-1, 1, 0.01];
        var stepBase = (R[1] - R[0]) / 40 / (1 + pass);
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var was = CUSTOM[key] != null ? CUSTOM[key] : neutralFor(key);
          var tryV = Math.max(R[0], Math.min(R[1], was + sgn * stepBase));
          CUSTOM[key] = tryV;
          apply();
          var got = score(sa);
          if (got != null && got < best - 1e-6) { best = got; moved = true; }
          else CUSTOM[key] = was;
        }
      }
      if (!moved) break;
    }
    apply();
  }

  /* ---- the jyā table, drawn ----------------------------------------------- */
  function jyaPanel() {
    var host = $("ss-jya");
    if (!host) return;
    var W = 760, H = 300, L = 56, R = 14, T = 16, B = 86;
    var mid = T + (H - T - B) * 0;
    var sx = function (a) { return L + (W - L - R) * a / 90; };
    var sy = function (v) { return T + (H - T - B) * (1 - v / S.RAD); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sslsvg" role="img" ' +
      'aria-label="The text\'s twenty-four tabulated sines against a true sine, ' +
      'with the difference magnified fifty times"><title>The jyā table</title>';
    /* the frame */
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      o += '<line x1="' + L + '" y1="' + sy(f * S.RAD).toFixed(1) + '" x2="' +
           (W - R) + '" y2="' + sy(f * S.RAD).toFixed(1) + '" class="ssl-grid"/>' +
           '<text x="' + (L - 7) + '" y="' + (sy(f * S.RAD) + 4).toFixed(1) +
           '" class="ssl-ax">' + Math.round(f * S.RAD) + "</text>";
    });
    /* the true sine on the radius-3438 scale */
    var p = "";
    for (var a = 0; a <= 90; a += 0.5) {
      p += (a ? "L" : "M") + sx(a).toFixed(1) + " " +
           sy(S.RAD * Math.sin(a * DEG)).toFixed(1) + " ";
    }
    o += '<path d="' + p + '" class="ssl-true"/>';
    /* the twenty-four entries, as the text gives them */
    var worst = 0, worstAt = 0, lin = 0, linAt = 0;
    /* JYA holds twenty-five values, JYA[0] = 0 and JYA[24] = 3438, so the
       entry for an arc of i × 3°45′ is JYA[i] and not JYA[i−1]. Indexing it
       the other way put every point one interval out and reported the worst
       entry as 6.5% of the radius instead of 0.02%, which is how the mistake
       surfaced: the figure disagreed with the project's own measurement. */
    for (var i = 1; i <= 24; i++) {
      var arc = i * 3.75, v = S.JYA[i];
      var err = v - S.RAD * Math.sin(arc * DEG);
      if (Math.abs(err) > Math.abs(worst)) { worst = err; worstAt = arc; }
      o += '<circle cx="' + sx(arc).toFixed(1) + '" cy="' + sy(v).toFixed(1) +
           '" r="3.4" class="ssl-entry"><title>' + arc.toFixed(2) + "° → " + v +
           " (true " + (S.RAD * Math.sin(arc * DEG)).toFixed(2) + ")</title></circle>";
    }
    /* the residual of the WHOLE interpolated function, magnified */
    var MAG = 50, base = H - B + 46, half = 30;
    o += '<line x1="' + L + '" y1="' + base + '" x2="' + (W - R) +
         '" y2="' + base + '" class="ssl-grid"/>';
    var q = "";
    for (var b = 0; b <= 90; b += 0.25) {
      var e2 = S.jya(b) - S.RAD * Math.sin(b * DEG);
      if (Math.abs(e2) > Math.abs(lin)) { lin = e2; linAt = b; }
      q += (b ? "L" : "M") + sx(b).toFixed(1) + " " +
           (base - Math.max(-half, Math.min(half, e2 * MAG))).toFixed(1) + " ";
    }
    o += '<path d="' + q + '" class="ssl-res"/>';
    o += '<text x="' + L + '" y="' + (base - 36) + '" class="ssl-cap">' +
         "the interpolated table minus a true sine, ×" + MAG + "</text>";
    o += '<text x="' + L + '" y="' + (H - 6) + '" class="ssl-cap">' +
         "arc, 0° to 90° — one tabulated entry every 3°45′</text>";
    o += "</svg>";
    host.innerHTML = o;

    /* and the number that matters: what the table costs as an angle */
    var note = $("ss-jyanote");
    if (note) {
      /* recovering an arc from a sine is the other direction through the same
         table, and it is the worse of the two — so it is measured, not assumed */
      var arcErr = 0, arcAt = 0;
      for (var c = 0.5; c < 90; c += 0.25) {
        var back = S.arcJyaTable(S.RAD * Math.sin(c * DEG));
        if (Math.abs(back - c) > Math.abs(arcErr)) { arcErr = back - c; arcAt = c; }
      }
      note.innerHTML = "Worst tabulated entry: <b>" + Math.abs(worst).toFixed(2) +
        "</b> of 3438, at " + worstAt.toFixed(2) + "° — about " +
        (Math.abs(worst) / S.RAD * 100).toFixed(3) + "% of the radius. Worst " +
        "<b>interpolated</b> value: <b>" + Math.abs(lin).toFixed(2) + "</b> at " +
        linAt.toFixed(2) + "°, which is where the straight line between two " +
        "entries is furthest from the curve. Read backwards, recovering an arc " +
        "from a sine, the table is out by at most <b>" +
        Math.abs(arcErr).toFixed(3) + "°</b> near " + arcAt.toFixed(1) +
        "°. Every equation on this page is an arc recovered that way, which is " +
        "why that last figure is the one that reaches a longitude.";
    }
  }

  /* ---- the epicycle construction ------------------------------------------ */
  function epiPanel() {
    var host = $("ss-epi");
    if (!host) return;
    var E = S.EPI[EBODY] || {};
    var kinds = [];
    if (E.manda) kinds.push("manda");
    if (E.sighra) kinds.push("sighra");
    var W = 760, H = 380, o = '<svg viewBox="0 0 ' + W + ' ' + H +
      '" class="sslsvg" role="img" aria-label="The manda and śīghra epicycle ' +
      'constructions at the chosen anomaly"><title>The two constructions</title>';
    var pan = W / kinds.length;
    kinds.forEach(function (kind, idx) {
      o += panel(kind, idx * pan, pan, H, E);
    });
    o += "</svg>";
    host.innerHTML = o;
    epiNote(E);

    function panel(kind, x0, w, h, E) {
      var pair = kind === "manda" ? E.manda : E.sighra;
      var cx = x0 + w / 2, cy = h / 2 - 6, Rd = Math.min(w, h) * 0.30;
      var kap = ANOM * DEG;
      var c = pair[0] + (pair[1] - pair[0]) * Math.abs(S.jya(ANOM)) / S.RAD;
      var rr = Rd * c / 360;
      var r0 = Rd * pair[0] / 360, r1 = Rd * pair[1] / 360;
      var g = "";
      /* the deferent, and the direction the anomaly is counted from */
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rd.toFixed(1) +
           '" class="ssl-def"/>';
      var M, G, lab;
      if (kind === "manda") {
        /* the apsis to the right; the mean graha at the anomaly from it; the
           graha displaced toward the perigee by the epicycle radius */
        M = { x: cx + Rd * Math.cos(kap), y: cy - Rd * Math.sin(kap) };
        G = { x: M.x - rr, y: M.y };
        lab = "mandocca";
      } else {
        /* the mean graha to the right; the śīghrocca at the anomaly from it */
        M = { x: cx + Rd, y: cy };
        G = { x: M.x + rr * Math.cos(kap), y: M.y - rr * Math.sin(kap) };
        lab = "mean graha";
      }
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rd + 22) +
           '" y2="' + cy + '" class="ssl-apsis"/>' +
           '<text x="' + (cx + Rd + 26) + '" y="' + (cy + 4) +
           '" class="ssl-tag">' + esc(lab) + "</text>";
      /* the two stated circumferences, dashed, and the one in use, solid */
      g += '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + r0.toFixed(1) + '" class="ssl-epid"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + r1.toFixed(1) + '" class="ssl-epid"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + rr.toFixed(1) + '" class="ssl-epi"/>';
      /* O→M, O→G, M→G, and the bahu dropped from G onto OM */
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + M.x.toFixed(1) +
           '" y2="' + M.y.toFixed(1) + '" class="ssl-arm"/>';
      g += '<line x1="' + M.x.toFixed(1) + '" y1="' + M.y.toFixed(1) + '" x2="' +
           G.x.toFixed(1) + '" y2="' + G.y.toFixed(1) + '" class="ssl-arm2"/>';
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + G.x.toFixed(1) +
           '" y2="' + G.y.toFixed(1) + '" class="ssl-karna"/>';
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" class="ssl-o"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="3.5" class="ssl-m"/>' +
           '<circle cx="' + G.x.toFixed(1) + '" cy="' + G.y.toFixed(1) +
           '" r="5" class="ssl-g"/>';
      /* the equation as a wedge at the centre, between OM and OG */
      var a1 = Math.atan2(cy - M.y, M.x - cx), a2 = Math.atan2(cy - G.y, G.x - cx);
      var wr = Rd * 0.42;
      g += '<path d="M' + (cx + wr * Math.cos(a1)).toFixed(1) + " " +
           (cy - wr * Math.sin(a1)).toFixed(1) + "A" + wr.toFixed(1) + " " +
           wr.toFixed(1) + " 0 0 " + (a2 > a1 ? 0 : 1) + " " +
           (cx + wr * Math.cos(a2)).toFixed(1) + " " +
           (cy - wr * Math.sin(a2)).toFixed(1) + '" class="ssl-eqarc"/>';
      var eq = kind === "manda" ? S.mandaEquation(EBODY, ANOM)
                                : S.sighraEquation(EBODY, ANOM);
      g += '<text x="' + cx + '" y="' + (cy - Rd - 18) + '" class="ssl-head">' +
           (kind === "manda" ? "manda — the apsidal correction"
                             : "śīghra — the solar correction") + "</text>";
      g += '<text x="' + cx + '" y="' + (h - 40) + '" class="ssl-cap mid">' +
           "paridhi in use " + c.toFixed(2) + "° of " + pair[0] + "°/" + pair[1] +
           "°  ·  equation " + (eq >= 0 ? "" : "−") +
           Math.abs(eq).toFixed(3) + "°</text>";
      g += '<text x="' + cx + '" y="' + (h - 24) + '" class="ssl-cap mid">' +
           (kind === "manda"
             ? "the text divides the bahu by the RADIUS here"
             : "and by the karṇa here — the long line from the centre") +
           "</text>";
      return g;
    }
  }

  function epiNote(E) {
    var note = $("ss-epinote");
    if (!note) return;
    var out = [];
    if (E.manda) {
      /* The observation worth printing: the manda equation takes the hypotenuse
         to BE the radius, where the geometry drawn beside it has a hypotenuse
         that is not. The difference is computed, not asserted. */
      var pair = E.manda;
      var c = pair[0] + (pair[1] - pair[0]) * Math.abs(S.jya(ANOM)) / S.RAD;
      var r = c / 360 * S.RAD;
      var bahu = r * Math.sin(ANOM * DEG), koti = r * Math.cos(ANOM * DEG);
      var karna = Math.sqrt((S.RAD - koti) * (S.RAD - koti) + bahu * bahu);
      var text = S.mandaEquation(EBODY, ANOM);
      var exact = Math.asin(Math.max(-1, Math.min(1, bahu / karna))) / DEG;
      out.push("At this anomaly the manda epicycle puts the graha <b>" +
        Math.abs(bahu).toFixed(1) + "</b> of 3438 off the line from the centre, " +
        "on a hypotenuse of <b>" + karna.toFixed(1) + "</b>. The text divides " +
        "that offset by 3438 and gets <b>" + text.toFixed(4) + "°</b>; dividing " +
        "by the hypotenuse instead gives <b>" + exact.toFixed(4) + "°</b>, a " +
        "difference of <b>" + mins(text - exact) + "</b>. The śīghra step " +
        "<i>does</i> divide by its hypotenuse, so this is a choice the method " +
        "makes in one place and not the other, and not an oversight you can " +
        "patch without changing what the text says.");
    }
    if (E.sighra) {
      var q = S.sighraFull(EBODY, ANOM);
      out.push("The śīghra karṇa here is <b>" + q.karna.toFixed(1) +
        "</b> against a radius of 3438 — " +
        (q.karna > S.RAD ? "longer" : "shorter") + ", which is the graha being " +
        (q.karna > S.RAD ? "further from" : "nearer") + " the centre than the " +
        "deferent alone would place it. That same hypotenuse is what the engine " +
        "reuses for the apparent diameters and the latitude, which is why it is " +
        "returned rather than discarded.");
    }
    var read = $("ss-anomread");
    if (read) read.textContent = ANOM.toFixed(1) + "° anomaly";
    note.innerHTML = out.join(" ");
  }

  /* the two equations across the whole anomaly */
  function curvePanel() {
    var host = $("ss-curve");
    if (!host) return;
    var E = S.EPI[EBODY] || {};
    var W = 760, H = 230, L = 52, R = 120, T = 18, B = 34;
    var series = [];
    if (E.manda) series.push({ cls: "manda", name: "manda",
      f: function (a) { return S.mandaEquation(EBODY, a); } });
    if (E.sighra) series.push({ cls: "sighra", name: "śīghra",
      f: function (a) { return S.sighraEquation(EBODY, a); } });
    if (!series.length) { host.innerHTML = ""; return; }
    var all = [];
    series.forEach(function (s2) {
      s2.pts = [];
      for (var a = 0; a <= 360; a += 1) { var v = s2.f(a); s2.pts.push([a, v]); all.push(v); }
    });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var pad = Math.max(0.2, (hi - lo) * 0.12); lo -= pad; hi += pad;
    var sx = function (a) { return L + (W - L - R) * a / 360; };
    var sy = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sslsvg" role="img" ' +
      'aria-label="The manda and śīghra equations across the whole anomaly">' +
      "<title>The equations as curves</title>";
    o += '<line x1="' + L + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - R) +
         '" y2="' + sy(0).toFixed(1) + '" class="ssl-grid"/>';
    [lo + pad, 0, hi - pad].forEach(function (v) {
      o += '<text x="' + (L - 7) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="ssl-ax">' + v.toFixed(1) + "°</text>";
    });
    /* the quadrant ends — where the interpolated paridhi turns round */
    [90, 180, 270].forEach(function (a) {
      o += '<line x1="' + sx(a).toFixed(1) + '" y1="' + T + '" x2="' +
           sx(a).toFixed(1) + '" y2="' + (H - B) + '" class="ssl-quad"/>';
    });
    [0, 90, 180, 270, 360].forEach(function (a) {
      o += '<text x="' + sx(a).toFixed(1) + '" y="' + (H - B + 16) +
           '" class="ssl-cap mid">' + a + "°</text>";
    });
    series.forEach(function (s2, i) {
      o += '<path d="' + s2.pts.map(function (p, j) {
        return (j ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1);
      }).join(" ") + '" class="ssl-cv ' + s2.cls + '"/>';
      o += '<text x="' + (W - R + 10) + '" y="' + (T + 14 + i * 18) +
           '" class="ssl-leg ' + s2.cls + '">' + esc(s2.name) + " — peak " +
           Math.max.apply(null, s2.pts.map(function (p) { return Math.abs(p[1]); }))
             .toFixed(2) + "°</text>";
    });
    o += '<line x1="' + sx(ANOM).toFixed(1) + '" y1="' + T + '" x2="' +
         sx(ANOM).toFixed(1) + '" y2="' + (H - B) + '" class="ssl-ptr"/>';
    o += "</svg>";
    host.innerHTML = o;
  }

  /* ---- the three skies on one ring ---------------------------------------- */
  function ringPanel() {
    var host = $("ss-ring");
    if (!host) return;
    /* each tier read with the engine actually in that state, then put back —
       the whole point is that these are three computations and not one */
    var saved = MODE, savedC = CUSTOM;
    var tiers = {};
    MODE = "bare"; apply();
    tiers.bare = SA7.map(function (sa) {
      var q = S.trueLongitude(sa, S.ahargana(WHEN)); return q ? q.lon : null; });
    MODE = "fitted"; apply();
    tiers.fit = SA7.map(function (sa) {
      var q = S.trueLongitude(sa, S.ahargana(WHEN)); return q ? q.lon : null; });
    MODE = saved; CUSTOM = savedC; apply();
    tiers.mod = SA7.map(function (sa) { return refLon(sa, WHEN); });

    var W = 720, cx = 360, cy = 360, o = '<svg viewBox="0 0 ' + W + ' ' + W +
      '" class="sslsvg" role="img" aria-label="The seven grahas placed by the ' +
      'bare text, by the fitted tier and by the modern engine, on one ring">' +
      "<title>Three skies</title>";
    var RO = 318, RI = 232;
    for (var s = 0; s < 12; s++) {
      var a0 = -s * 30 - 90;
      o += wedge(cx, cy, RI, RO, a0, a0 - 30, "ssl-sign" + (s % 2 ? " alt" : ""));
      var am = (a0 - 15) * DEG;
      o += '<text x="' + (cx + (RO + RI) / 2 * Math.cos(am)).toFixed(1) + '" y="' +
           (cy - (RO + RI) / 2 * Math.sin(am) + 4).toFixed(1) +
           '" class="ssl-signlab">' + esc(RS[s].slice(0, 4)) + "</text>";
    }
    var rings = [["mod", 206, "modern"], ["fit", 172, "fitted"], ["bare", 138, "text"]];
    rings.forEach(function (R) {
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R[1] +
           '" class="ssl-orb"/>';
      SA7.forEach(function (sa, i) {
        var L = tiers[R[0]][i];
        if (L == null) return;
        var a = (-L - 90) * DEG;
        o += '<circle cx="' + (cx + R[1] * Math.cos(a)).toFixed(1) + '" cy="' +
             (cy - R[1] * Math.sin(a)).toFixed(1) + '" r="6" class="ssl-mark ' +
             R[0] + '"><title>' + esc(sa) + " · " + esc(R[2]) + " · " +
             esc(dm(L)) + "</title></circle>";
      });
      o += '<text x="' + cx + '" y="' + (cy - R[1] + 4) + '" class="ssl-orblab ' +
           R[0] + '">' + esc(R[2]) + "</text>";
    });
    /* the spokes, so a reader can see which three marks belong together */
    SA7.forEach(function (sa, i) {
      var a = (-(tiers.mod[i] == null ? 0 : tiers.mod[i]) - 90) * DEG;
      if (tiers.mod[i] == null) return;
      o += '<text x="' + (cx + (RI - 14) * Math.cos(a)).toFixed(1) + '" y="' +
           (cy - (RI - 14) * Math.sin(a) + 4).toFixed(1) +
           '" class="ssl-ptname">' + esc(sa) + "</text>";
    });
    o += '<text x="' + cx + '" y="' + (cy + 4) + '" class="ssl-hub">' +
         new Date(WHEN).toISOString().slice(0, 10) + "</text>";
    o += "</svg>";
    host.innerHTML = o;

    var tab = $("ss-ringtab");
    if (tab) {
      tab.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        "<th>Graha</th><th>the text as written</th><th>the fitted tier</th>" +
        "<th>modern</th><th>text − modern</th><th>fitted − modern</th>" +
        "</tr></thead><tbody>" + SA7.map(function (sa, i) {
          var b = tiers.bare[i], f = tiers.fit[i], m = tiers.mod[i];
          if (m == null) return "";
          return "<tr><td>" + esc(sa) + "</td><td>" + esc(dm(b)) + "</td><td>" +
            esc(dm(f)) + "</td><td>" + esc(dm(m)) + '</td><td class="num">' +
            sdiff(b, m).toFixed(2) + '°</td><td class="num">' +
            sdiff(f, m).toFixed(2) + "°</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
  }
  function wedge(cx, cy, ri, ro, a0, a1, cls) {
    var r0 = a0 * DEG, r1 = a1 * DEG;
    var x0 = cx + ro * Math.cos(r0), y0 = cy - ro * Math.sin(r0);
    var x1 = cx + ro * Math.cos(r1), y1 = cy - ro * Math.sin(r1);
    var x2 = cx + ri * Math.cos(r1), y2 = cy - ri * Math.sin(r1);
    var x3 = cx + ri * Math.cos(r0), y3 = cy - ri * Math.sin(r0);
    return '<path d="M' + x0.toFixed(1) + " " + y0.toFixed(1) + "A" + ro + " " +
      ro + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1) + "L" + x2.toFixed(1) +
      " " + y2.toFixed(1) + "A" + ri + " " + ri + " 0 0 0 " + x3.toFixed(1) +
      " " + y3.toFixed(1) + 'Z" class="' + cls + '"/>';
  }

  /* ---- wiring ------------------------------------------------------------- */
  function redrawLab() {
    sliders(); scoreTable(); ringPanel(); psBorrowList();
  }
  function redrawGeom() { epiPanel(); curvePanel(); }

  function bind() {
    S = window.SSEngine;
    if (!S || !$("ss-sliders")) return;
    var raw = $("data-siddhanta-measured");
    try { FIT = JSON.parse(raw.textContent); } catch (e) { FIT = null; }
    if (!FIT || !FIT.params || !FIT.lahiri) {
      var h = $("ss-score");
      if (h) h.innerHTML = '<p class="ssnote">The fitted constants did not ' +
        "load, so the sandbox and the three-ring comparison are unavailable " +
        "on this page. Everything above is unaffected.</p>";
      return;
    }
    LAH = FIT.lahiri;
    S.setMeasured(FIT);
    if (window.__ss && window.__ss.when) WHEN = window.__ss.when();

    [["ss-sbody", function (v) { SBODY = v; redrawLab(); }],
     ["ss-epibody", function (v) { EBODY = v; redrawGeom(); }]
    ].forEach(function (pair) {
      var sel = $(pair[0]);
      if (!sel) return;
      SA7.forEach(function (sa) {
        var op = document.createElement("option");
        op.value = sa; op.textContent = sa;
        if ((pair[0] === "ss-epibody" && sa === EBODY) ||
            (pair[0] === "ss-sbody" && sa === SBODY)) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () { pair[1](sel.value); });
    });

    var an = $("ss-anom");
    if (an) an.addEventListener("input", function () {
      ANOM = +an.value; stopSpin(); redrawGeom(); });

    document.addEventListener("input", function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-sskey");
      if (!k) return;
      if (MODE !== "custom") {
        CUSTOM = {};
        var base = MODE === "fitted" ? FIT.params : neutral();
        for (var kk in base) CUSTOM[kk] = base[kk];
        MODE = "custom";
      }
      CUSTOM[k] = +e.target.value;
      var out = document.querySelector('[data-ssout="' + k + '"]');
      if (out) out.textContent = fmtVal(k, CUSTOM[k]);
      apply();
      scoreTable(); ringPanel();
    });

    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ss]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ss");
      if (k === "bare") { MODE = "bare"; CUSTOM = null; apply(); redrawLab(); }
      else if (k === "fitted") { MODE = "fitted"; apply(); redrawLab(); }
      else if (k === "ps") { MODE = "ps"; CUSTOM = null; apply(); redrawLab(); }
      else if (k === "auto") {
        b.disabled = true;
        var was = b.textContent;
        b.textContent = "fitting…";
        setTimeout(function () {
          autoFit(SBODY);
          b.disabled = false; b.textContent = was;
          redrawLab();
        }, 20);
      } else if (k === "anomnow") {
        var q = S.trueLongitude(EBODY, S.ahargana(WHEN));
        if (q && q.anomaly != null) ANOM = q.anomaly;
        else if (q && q.mandocca != null) ANOM = norm(q.mean - q.mandocca);
        var sl = $("ss-anom");
        if (sl) sl.value = ANOM;
        stopSpin(); redrawGeom();
      } else if (k === "anomspin") { SPIN ? stopSpin() : startSpin(b); }
    });

    var when = $("ss-when");
    if (when) when.addEventListener("change", function () {
      var t = Date.parse(when.value);
      WHEN = isFinite(t) ? t : Date.now();
      ringPanel(); redrawGeom();
    });
    /* the sine and ayanāṃśa switches belong to ss-page.js; the score has to
       follow them, because the frame a score is taken in is part of the score */
    ["ss-sines", "ss-ayana"].forEach(function (id) {
      var e2 = $(id);
      if (e2) e2.addEventListener("change", function () {
        buildSample(); redrawLab(); redrawGeom(); });
    });

    buildSample();
    MODE = "bare"; apply();
    redrawLab(); redrawGeom(); jyaPanel();

    try {
      window.__sslab = {
        score: score, mode: function () { return MODE; },
        setMode: function (m) { MODE = m; apply(); redrawLab(); },
        apply: apply, samples: function () { return SAMPLE.slice(); },
        ref: refLon, autoFit: autoFit, fit: function () { return FIT; },
        setAnom: function (a) { ANOM = a; redrawGeom(); },
        setWhen: function (t) { WHEN = t; ringPanel(); redrawGeom(); }
      };
    } catch (e) {}
  }
  function startSpin(btn) {
    if (btn) btn.textContent = "Stop";
    var t0 = performance.now(), a0 = ANOM;
    SPIN = requestAnimationFrame(function step(t) {
      ANOM = norm(a0 + (t - t0) / 24);
      var sl = $("ss-anom");
      if (sl) sl.value = ANOM;
      redrawGeom();
      SPIN = requestAnimationFrame(step);
    });
  }
  function stopSpin() {
    if (SPIN) cancelAnimationFrame(SPIN);
    SPIN = null;
    var b = document.querySelector('[data-ss="anomspin"]');
    if (b) b.textContent = "Sweep";
  }

  /* ss-page.js binds on DOMContentLoaded and publishes window.__ss at the end
     of its own bind(); this has to come after that, so it waits a tick rather
     than racing it. */
  function go() { setTimeout(bind, 0); }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", go);
  else go();
})();
;
