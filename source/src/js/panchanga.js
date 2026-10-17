/* ===== panchanga.js — the Hindu day, as a computation ======================

   WHAT THIS IS. Given an instant and a place, everything about the Hindu day
   that instant falls in. No DOM, no page, no drawing: just the day. now.html is
   one view of it and calendar.html is another, and the reason this file exists is
   that writing it twice would guarantee the two eventually disagree about what
   day it is — which, for a calendar, is the only thing that matters.

   THE DAY IS NAMED BY ITS SUNRISE. This is the single idea the whole file turns
   on. A Hindu day runs sunrise to sunrise, and the tithi RUNNING AT SUNRISE names
   the day. So an instant at 02:00 belongs to yesterday's day, and the tithi you
   print in a calendar cell is not the tithi at noon or at midnight but the one
   that was running when the Sun came up. Every date in this file is derived that
   way, and the `at` block holds those sunrise values. The `now` block holds the
   values at the instant asked about, which is what a live clock wants and what a
   calendar does not.

   WHAT IS CLASSICAL AND WHAT IS NOT. The five limbs, the māsa, the ṛtu, the
   ayana, the saṃvat and the saṃkrānti are classical. Horā, choghaḍiyā and rāhu
   kāla are LATER TRADITION — not BPHS — and are kept in their own section so a
   view can label them as such rather than mixing them into the pañcāṅga proper.

   RANGE. 1800–2200, and refused outside, not approximated. The ayanāṃśa
   polynomials in engine.js were fitted over exactly that window; past its edges
   the drift is undefined, and a calendar that answers anyway is worse than one
   that says it cannot.

   COST. Sunrise is an iterative search and each end-time is a bisection, so a
   full day with end-times is not free. A month grid of 31 of them, or a year view
   of 365, is why `opts.ends` exists: the base layer of the grid needs the tithi
   at sunrise and not the minute it ends, and asking for what you are not going to
   draw is how a page comes to take four seconds to open. */

(function () {
  "use strict";

  var NP = {};

  /* ===== range ============================================================= */
  NP.RANGE = { min: 1800, max: 2200 };
  NP.inRange = function (y) { return y >= NP.RANGE.min && y <= NP.RANGE.max; };
  /* Why, in the words the page shows. An honest boundary is worth stating. */
  NP.rangeWhy = "The ayanāṃśa polynomials in this engine were fitted to Swiss " +
    "Ephemeris over 1800–2200 and verified against it across that window. " +
    "Outside it the drift is undefined, so dates there are refused rather than " +
    "answered approximately.";

  /* ===== places ============================================================
     The same short list now.html carried, kept here so the calendar does not
     grow a second one that drifts. Every figure in a Hindu calendar depends on
     sunrise and therefore on the place: a printed almanac is computed for ONE
     city, which is why Kalnirnay is a Mumbai calendar whoever reads it. Here the
     place is a control, which is the honest version. */
  NP.PLACES = [
    { n: "Abu Dhabi, AE", lat: 24.4539, lon: 54.3773, tz: 4 },
    { n: "Dubai, AE", lat: 25.2048, lon: 55.2708, tz: 4 },
    { n: "Delhi, IN", lat: 28.6139, lon: 77.2090, tz: 5.5 },
    { n: "Mumbai, IN", lat: 19.0760, lon: 72.8777, tz: 5.5 },
    { n: "Kolkata, IN", lat: 22.5726, lon: 88.3639, tz: 5.5 },
    { n: "Chennai, IN", lat: 13.0827, lon: 80.2707, tz: 5.5 },
    { n: "Bengaluru, IN", lat: 12.9716, lon: 77.5946, tz: 5.5 },
    { n: "Hyderabad, IN", lat: 17.3850, lon: 78.4867, tz: 5.5 },
    { n: "Pune, IN", lat: 18.5204, lon: 73.8567, tz: 5.5 },
    { n: "Ahmedabad, IN", lat: 23.0225, lon: 72.5714, tz: 5.5 },
    { n: "Jaipur, IN", lat: 26.9124, lon: 75.7873, tz: 5.5 },
    { n: "Lucknow, IN", lat: 26.8467, lon: 80.9462, tz: 5.5 },
    { n: "Varanasi, IN", lat: 25.3176, lon: 82.9739, tz: 5.5 },
    { n: "Moradabad, IN", lat: 28.8386, lon: 78.7733, tz: 5.5 },
    { n: "Kathmandu, NP", lat: 27.7172, lon: 85.3240, tz: 5.75 },
    { n: "London, GB", lat: 51.5074, lon: -0.1278, tz: 0 },
    { n: "New York, US", lat: 40.7128, lon: -74.0060, tz: -5 },
    { n: "Singapore, SG", lat: 1.3521, lon: 103.8198, tz: 8 },
    { n: "Sydney, AU", lat: -33.8688, lon: 151.2093, tz: 10 }
  ];
  /* A chart cast on the kundli page leaves its birth data behind; its PLACE is
     what these pages can use, not its moment. */
  NP.savedPlace = function () {
    try {
      var raw = localStorage.getItem("nirayana.birth");
      if (!raw) return null;
      var b = JSON.parse(raw);
      if (b && b.lat != null && b.lon != null)
        return { n: (b.place || "your saved chart's place"), lat: +b.lat,
                 lon: +b.lon, tz: +(b.tz || 0), saved: true };
    } catch (e) {}
    return null;
  };

  /* ===== the sunrise convention ===========================================
     Held here, shared by every view, and passed into every search. Changing it
     re-dates everything downstream — the vāra, the ghaṭī count, which tithi is
     today's, and therefore which day a festival lands on. A stated setting, not
     a buried constant. */
  var CONV = "limb";
  try {
    var rc = localStorage.getItem("nirayana.riseconv");
    if (rc === "limb" || rc === "centre" || rc === "geom") CONV = rc;
  } catch (e) {}
  NP.conv = function () { return CONV; };
  NP.setConv = function (k) {
    CONV = k;
    try { localStorage.setItem("nirayana.riseconv", k); } catch (e) {}
    cacheClear();
  };
  NP.convList = function () {
    try { return window.__kRiseConv().list; } catch (e) { return []; }
  };
  NP.convLabel = function () {
    var L = NP.convList();
    for (var i = 0; i < L.length; i++) if (L[i].key === CONV) return L[i].label;
    return CONV;
  };

  /* ===== primitives ======================================================== */
  function sidAt(name, ms) {
    try { return window.__kSidAt(name, new Date(ms)); } catch (e) { return null; }
  }
  NP.sidAt = sidAt;

  /* A small memo on sunrise, keyed by place and convention. The month grid asks
     for the same sunrise several times over — once to date the day, once for the
     ghaṭikā, once for the day length — and the search is iterative. Cleared when
     the convention or the place changes, because a cache that outlives the
     assumption it was built under is a bug waiting for a slow afternoon. */
  var RCACHE = {}, RCOUNT = 0;
  function cacheClear() { RCACHE = {}; RCOUNT = 0; }
  NP.cacheClear = cacheClear;
  function riseSet(ms, P, dir) {
    var k = dir + "|" + CONV + "|" + P.lat.toFixed(4) + "," + P.lon.toFixed(4) +
            "|" + Math.round(ms / 60000);
    if (RCACHE.hasOwnProperty(k)) return RCACHE[k];
    var v = null;
    try { v = window.__kRiseSet("Sun", P.lat, P.lon, ms, 2, dir, CONV); } catch (e) {}
    /* Unbounded growth would matter on the year view, which asks ~1100 times. */
    if (RCOUNT > 6000) cacheClear();
    RCACHE[k] = v; RCOUNT++;
    return v;
  }
  NP.riseSet = riseSet;

  function moonRiseSet(ms, P, dir) {
    try { return window.__kRiseSet("Moon", P.lat, P.lon, ms, 2, dir, CONV); }
    catch (e) { return null; }
  }

  /* The sunrise that opened the day this instant belongs to.

     Walks forward from well before rather than searching from a round number of
     hours. At longitudes where sunrise falls near 00:00 UTC — the whole of India
     in summer — a search anchored on UTC midnight straddles two candidate
     answers for the same morning and can return sunrises 24 hours apart. */
  function dayStart(ms, P) {
    var sr = riseSet(ms - 26 * 3600000, P, +1);
    if (sr == null) return null;
    var guard = 0;
    while (sr <= ms - 26 * 3600000 && guard++ < 4) sr = riseSet(sr + 3600000, P, +1);
    var next = riseSet(sr + 3600000, P, +1);
    if (next != null && next <= ms) sr = next;
    return sr;
  }
  NP.dayStart = dayStart;

  /* The five limbs as indices. Each is a longitude condition and nothing else,
     which is why they can be bisected for an exact end-time. */
  function tithiIdx(ms) {
    var s = sidAt("Sun", ms), m = sidAt("Moon", ms);
    return (s == null || m == null) ? null : Math.floor((((m - s) % 360) + 360) % 360 / 12);
  }
  function nakIdx(ms) {
    var m = sidAt("Moon", ms);
    return m == null ? null : Math.floor((((m % 360) + 360) % 360) / (40 / 3));
  }
  function yogaIdx(ms) {
    var s = sidAt("Sun", ms), m = sidAt("Moon", ms);
    return (s == null || m == null) ? null : Math.floor((((m + s) % 360) + 360) % 360 / (800 / 60));
  }
  function karanaIdx(ms) {
    var s = sidAt("Sun", ms), m = sidAt("Moon", ms);
    return (s == null || m == null) ? null : Math.floor((((m - s) % 360) + 360) % 360 / 6);
  }
  NP.tithiIdx = tithiIdx; NP.nakIdx = nakIdx;
  NP.yogaIdx = yogaIdx; NP.karanaIdx = karanaIdx;

  /* When the limb running at `ms` ends. Bisected rather than assumed from a mean
     length: the Moon's speed varies by about 15% over a month, so a mean figure is
     minutes out, and minutes are what move a festival across a sunrise. */
  function endOf(ms, stepDeg, valueAt) {
    var v0 = valueAt(ms);
    if (v0 == null) return null;
    var lo = ms, hi = ms + Math.max(2, stepDeg) * 3600000 * 2.2;
    for (var g = 0; g < 40; g++) {
      if (valueAt(hi) !== v0) break;
      lo = hi; hi += 6 * 3600000;
      if (hi - ms > 3 * 86400000) return null;
    }
    for (var b = 0; b < 42 && hi - lo > 20000; b++) {
      var mid = (lo + hi) / 2;
      if (valueAt(mid) === v0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  /* And when it began — needed for the skipped tithi and the doubled one, which a
     calendar has to show rather than hide. */
  function startOf(ms, stepDeg, valueAt) {
    var v0 = valueAt(ms);
    if (v0 == null) return null;
    var hi = ms, lo = ms - Math.max(2, stepDeg) * 3600000 * 2.2;
    for (var g = 0; g < 40; g++) {
      if (valueAt(lo) !== v0) break;
      hi = lo; lo -= 6 * 3600000;
      if (ms - lo > 3 * 86400000) return null;
    }
    for (var b = 0; b < 42 && hi - lo > 20000; b++) {
      var mid = (lo + hi) / 2;
      if (valueAt(mid) === v0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  NP.endOf = endOf; NP.startOf = startOf;

  /* ===== names =============================================================
     Romanised here in IAST, which is what the rest of the site uses. The engine
     returns its own spellings ("Dashami", "Shishira"); views that show both must
     map, and the calendar uses these. */
  var TITHI = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
    "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī",
    "Caturdaśī", "Pūrṇimā"];
  var TITHI_K = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
    "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī",
    "Caturdaśī", "Amāvāsyā"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrva Phalgunī", "Uttara Phalgunī",
    "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
    "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  var YOGA = ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa",
    "Sukarman", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta", "Harṣaṇa",
    "Vajra", "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva", "Siddha", "Sādhya",
    "Śubha", "Śukla", "Brahma", "Indra", "Vaidhṛti"];
  /* Karaṇa: seven movable repeating eight times, then four fixed. The index runs
     0..59 over the lunar month, so the name is a function of position, not a
     straight table lookup. */
  var KAR_MOV = ["Bava", "Bālava", "Kaulava", "Taitila", "Garaja", "Vaṇija", "Viṣṭi"];
  function karanaName(i) {
    if (i === 0) return "Kiṃstughna";
    if (i === 57) return "Śakuni";
    if (i === 58) return "Catuṣpada";
    if (i === 59) return "Nāga";
    return KAR_MOV[(i - 1) % 7];
  }
  var VARA = ["Ravivāra", "Somavāra", "Maṅgalavāra", "Budhavāra", "Guruvāra",
    "Śukravāra", "Śanivāra"];
  var VARA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "Saturday"];
  var MASA = ["Caitra", "Vaiśākha", "Jyeṣṭha", "Āṣāḍha", "Śrāvaṇa", "Bhādrapada",
    "Āśvina", "Kārtika", "Mārgaśīrṣa", "Pauṣa", "Māgha", "Phālguna"];
  var RITU = ["Vasanta", "Grīṣma", "Varṣā", "Śarad", "Hemanta", "Śiśira"];
  /* The lunar months in Devanāgarī, by the same index. The transliteration is
     what a Latin-reading student needs; the Devanāgarī is what the month is
     actually called, and on a card meant for an Indian audience it is the form
     that reads at a glance. */
  var MASA_HI = ["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद",
    "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"];
  var TITHI_HI = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पंचमी", "षष्ठी",
    "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी",
    "चतुर्दशी", "पूर्णिमा"];
  var TITHI_K_HI = TITHI_HI.slice(0, 14).concat(["अमावस्या"]);
  var PAKSHA_HI = { "śukla": "शुक्ल", "kṛṣṇa": "कृष्ण" };
  NP.masaHi = function (engineName) {
    var i = NP.masaIdx(engineName);
    return i < 0 ? "" : MASA_HI[i];
  };
  NP.tithiHi = function (i) {
    return i < 15 ? TITHI_HI[i] : TITHI_K_HI[i - 15];
  };
  NP.pakshaHi = function (p) { return PAKSHA_HI[p] || p; };
  NP.NAMES = { tithi: TITHI, tithiK: TITHI_K, nak: NAK, yoga: YOGA,
               karana: karanaName, vara: VARA, varaEn: VARA_EN, masa: MASA,
               ritu: RITU };

  /* ===== solar months and saṃkrānti =======================================
     The Sun's entry into a sidereal sign. The solar month is what decides
     whether a lunar month is intercalary, so this is not decoration — it is the
     input to the adhika rule below. */
  function sunSid(ms) { return sidAt("Sun", ms); }
  function solarSign(ms) {
    var s = sunSid(ms);
    return s == null ? null : Math.floor((((s % 360) + 360) % 360) / 30);
  }
  /* The instant the Sun enters the sign it is in at `ms`. Bisected, like the
     limbs; the Sun moves ~1°/day so a sign takes about a month. */
  function sankrantiOf(ms) {
    return startOf(ms, 30 * 24, solarSign);
  }
  NP.solarSign = solarSign;
  NP.sankrantiOf = sankrantiOf;
  /* Every saṃkrānti in a window, with the sign entered. */
  NP.sankrantisIn = function (fromMs, toMs) {
    var out = [], prev = solarSign(fromMs), step = 6 * 3600000;
    for (var t = fromMs; t <= toMs; t += step) {
      var s = solarSign(t);
      if (s == null) continue;
      if (prev != null && s !== prev) {
        var at = startOf(t, 30 * 24, solarSign);
        if (at != null && at >= fromMs && at <= toMs) out.push({ ms: at, sign: s });
      }
      prev = s;
    }
    return out;
  };

  /* ===== the lunar month ===================================================
     A lunar month runs new moon to new moon (amānta) or full moon to full moon
     (pūrṇimānta). THESE ARE TWO SEPARATE FIELDS ON THE DAY, not one setting with
     two values, and the reason is the single most important thing the research
     turned up: most festivals are computed on the AMĀNTA calendar even in
     pūrṇimānta regions. Collapsing display and festival reckoning into one
     control gives wrong festival dates to exactly the North Indian reader the
     pūrṇimānta default is for.

     The engine already names both, so this leans on it rather than re-deriving.

     ADHIKA MĀSA. A lunar month containing no saṃkrānti is intercalary: it takes
     the name of the following month, the first of the pair is adhika and the
     second śuddha, and FESTIVALS FALL IN THE ŚUDDHA MONTH. That last clause is a
     rule the festival layer has to know, not a note.

     KṢAYA MĀSA. A lunar month containing two saṃkrāntis, possible only with
     adhika months on both sides — roughly once in 141 years. Its handling differs
     by region: eastern calendars name it for the first transit and make the next
     month śuddha; north-western ones shift the adhika assignment; southern ones
     call it yugma and count it for both. So it is flagged, named conservatively,
     and the regional divergence is said on screen rather than silently resolved. */
  /* Memoised, because the year view asks 365 times and each answer is a scan.
     A lunation is ~29.5 days, so every instant inside one has the same pair of
     bounding new moons; keying on the day the search starts from would miss that,
     so the cache is keyed on the answer once found and probed by interval first.
     This took the year view from eight seconds to well under one. */
  var NMCACHE = [];
  function newMoonCached(ms, dir) {
    for (var i = 0; i < NMCACHE.length; i++) {
      var c = NMCACHE[i];
      /* a cached pair brackets this instant, so it is the answer for both
         directions without searching again */
      if (ms > c.a && ms <= c.b) return dir < 0 ? c.a : c.b;
    }
    var a = newMoonRaw(ms, -1), b = newMoonRaw(ms, +1);
    if (a != null && b != null) {
      if (NMCACHE.length > 600) NMCACHE.length = 0;
      NMCACHE.push({ a: a, b: b });
    }
    return dir < 0 ? a : b;
  }
  function newMoonNear(ms, dir) { return newMoonCached(ms, dir); }
  function newMoonRaw(ms, dir) {
    /* elongation crossing 0; dir −1 searches back, +1 forward */
    function el(t) {
      var s = sidAt("Sun", t), m = sidAt("Moon", t);
      return (s == null || m == null) ? null : (((m - s) % 360) + 360) % 360;
    }
    var step = dir * 6 * 3600000, prev = el(ms), t = ms;
    for (var i = 0; i < 160; i++) {
      var t2 = t + step, e = el(t2);
      if (e == null) return null;
      var crossed = dir > 0 ? (prev > e) : (e > prev);
      if (crossed) {
        var lo = dir > 0 ? t : t2, hi = dir > 0 ? t2 : t;
        for (var b = 0; b < 42 && hi - lo > 20000; b++) {
          var mid = (lo + hi) / 2, em = el(mid);
          if (em == null) break;
          if (em > 180) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      }
      prev = e; t = t2;
    }
    return null;
  }
  NP.newMoonNear = newMoonNear;

  /* Is the amānta month containing `ms` adhika, śuddha-after-adhika, or kṣaya?
     Cached on the lunation rather than the day: the answer is a property of the
     month, so computing it per day was doing the same scan twenty-nine times. */
  var MKCACHE = {};
  function monthKind(ms) {
    var a0 = newMoonNear(ms, -1);
    if (a0 != null) {
      var k = Math.round(a0 / 3600000);
      if (MKCACHE.hasOwnProperty(k)) return MKCACHE[k];
    }
    var r = monthKindRaw(ms);
    if (a0 != null) {
      if (Object.keys(MKCACHE).length > 800) MKCACHE = {};
      MKCACHE[Math.round(a0 / 3600000)] = r;
    }
    return r;
  }
  function monthKindRaw(ms) {
    var a = newMoonNear(ms, -1), b = newMoonNear(ms, +1);
    if (a == null || b == null) return { kind: "normal", n: null };
    /* saṃkrāntis strictly inside this lunation */
    var n = 0, prev = solarSign(a + 60000);
    for (var t = a + 60000; t < b; t += 6 * 3600000) {
      var s = solarSign(t);
      if (s != null && prev != null && s !== prev) n++;
      if (s != null) prev = s;
    }
    if (n === 0) return { kind: "adhika", n: 0 };
    if (n >= 2) return { kind: "kshaya", n: n };
    return { kind: "normal", n: n };
  }
  NP.monthKind = monthKind;

  /* ===== eras ==============================================================
     Vikrama Saṃvat and Śaka Saṃvat. Both are counted from the lunar new year, so
     the number turns part-way through a Gregorian year, and which month starts
     the year is itself regional. This uses the Caitra-start (Vikrama northern
     Caitrādi) convention, says so, and offers Śaka alongside. */
  /* The engine romanises its month names its own way ("Ashwina", "Jyeshtha").
     This file uses IAST. Mapping between them explicitly, because the first
     version of this indexed the IAST table with the engine's string, got −1, and
     passed it to the saṃvat — which then ignored it, so every date came out with
     the right answer for nine months of the year and a silently wrong one for
     the other three. Nothing threw. */
  var MASA_FROM_ENGINE = {
    Chaitra: 0, Vaishakha: 1, Jyeshtha: 2, Ashadha: 3, Shravana: 4,
    Bhadrapada: 5, Ashwina: 6, Kartika: 7, Margashirsha: 8, Pausha: 9,
    Magha: 10, Phalguna: 11
  };
  NP.masaIdx = function (engineName) {
    var i = MASA_FROM_ENGINE[engineName];
    return i == null ? -1 : i;
  };
  NP.masaIAST = function (engineName) {
    var i = NP.masaIdx(engineName);
    return i < 0 ? engineName : MASA[i];
  };

  /* Vikrama and Śaka, both Caitrādi: the year turns at Caitra śukla pratipadā,
     in March or April, so the number changes part-way through a Gregorian year.

     The saṃvat is the Gregorian year of the Caitra that OPENED this lunar year,
     plus the epoch offset. Pauṣa, Māgha and Phālguna are the tail of a lunar
     year, so when they fall in the first half of a Gregorian year they belong to
     the Caitra of the year before — a January date is in the saṃvat that began
     the previous March, not the one that has not started yet. */
  function samvat(masaIdx, gregYear, gregMonth) {
    var caitraYear = (masaIdx >= 9 && gregMonth <= 6) ? gregYear - 1 : gregYear;
    return { vikrama: caitraYear + 57, saka: caitraYear - 78,
             caitraYear: caitraYear,
             note: "Caitrādi (northern) reckoning: the year turns at Caitra " +
                   "śukla pratipadā" };
  }

  /* ===== the day =========================================================== */
  /* opts: {ends:true} also bisects the four end-times and the previous/next
     boundaries, which the almanac row and the day detail want and the month
     grid's base layer does not. */
  NP.day = function (ms, P, opts) {
    opts = opts || {};
    var sr = dayStart(ms, P);
    if (sr == null) return null;
    /* The day is named by its sunrise, so every value below is read AT SUNRISE
       unless it is explicitly a `now` value. */
    var su = sidAt("Sun", sr), mo = sidAt("Moon", sr);
    if (su == null || mo == null) return null;

    var jd = window.__kJD(sr);
    var pc = window.__kPanchang(su, mo, jd);
    var ayn = 0;
    try { ayn = window.__ayanFor ? window.__ayanFor("lahiri", jd) : 0; } catch (e) {}
    var MS = window.__kMasa(su, mo, ayn);

    var ss = riseSet(sr, P, -1);
    var srNext = riseSet(sr + 3600000, P, +1);
    var wd = (Math.floor(jd + 1.5) % 7 + 7) % 7;

    var ti = tithiIdx(sr), nk = nakIdx(sr), yg = yogaIdx(sr), kr = karanaIdx(sr);
    var paksha = ti < 15 ? "śukla" : "kṛṣṇa";
    var tiName = ti < 15 ? TITHI[ti] : TITHI_K[ti - 15];

    var D = {
      ms: ms, place: P, riseConv: CONV, riseConvLabel: NP.convLabel(),
      sunrise: sr, sunset: ss, nextSunrise: srNext,
      jd: jd, sunDeg: su, moonDeg: mo,
      elongation: (((mo - su) % 360) + 360) % 360,
      /* --- at sunrise: this is what names the day --- */
      at: {
        tithi: { i: ti, n: (ti % 15) + 1, name: tiName, paksha: paksha },
        nak: { i: nk, name: NAK[nk], pada: Math.floor(((((mo % 360) + 360) % 360) %
                (40 / 3)) / (10 / 3)) + 1 },
        yoga: { i: yg, name: YOGA[yg] },
        karana: { i: kr, name: karanaName(kr) }
      },
      vara: VARA[wd], varaEn: VARA_EN[wd], varaIdx: wd,
      /* Two fields, deliberately. `masa` is for display; `masaFestival` is the
         amānta month the festival rules are evaluated against, whatever the
         reader has chosen to see. */
      masa: { amanta: MS.amanta, purnimanta: MS.purnimanta,
              ritu: MS.ritu, ayana: MS.ayana },
      masaFestival: MS.amanta,
      /* the phase, for the glyph spine: 0 = new, 0.5 = full */
      phase: ((((mo - su) % 360) + 360) % 360) / 360
    };
    var ld = new Date(sr + (P.tz || 0) * 3600000);
    D.gregorian = { y: ld.getUTCFullYear(), m: ld.getUTCMonth() + 1,
                    d: ld.getUTCDate() };
    D.masaIdx = NP.masaIdx(MS.amanta);
    /* Both spellings carried: the engine's, so a view can agree with the chart
       report, and IAST, so the calendar agrees with the rest of the site. */
    D.masa.amantaIAST = NP.masaIAST(MS.amanta);
    D.masa.purnimantaIAST = NP.masaIAST(MS.purnimanta);
    D.samvat = samvat(D.masaIdx, D.gregorian.y, D.gregorian.m);

    if (opts.ends) {
      D.at.tithi.ends = endOf(sr, 12, tithiIdx);
      D.at.tithi.began = startOf(sr, 12, tithiIdx);
      D.at.nak.ends = endOf(sr, 13, nakIdx);
      D.at.yoga.ends = endOf(sr, 13, yogaIdx);
      D.at.karana.ends = endOf(sr, 6, karanaIdx);
      /* THE DOUBLE AND THE SKIP, which a grid must show rather than hide.
         `doubled` — a second tithi completes inside this same Hindu day, so the
         day carries two. The printed almanacs mark the second *upari*, and that
         is the notation used rather than a new one invented here.
         `skipped` — the tithi after this one ends before the next sunrise and so
         never names a day at all (tithi kṣaya). A trained reader looks for the
         gap, so the gap is drawn. */
      if (D.at.tithi.ends != null && srNext != null && D.at.tithi.ends < srNext) {
        var t2 = tithiIdx(D.at.tithi.ends + 60000);
        var e2 = endOf(D.at.tithi.ends + 60000, 12, tithiIdx);
        if (e2 != null && e2 < srNext) {
          D.at.tithi.upari = {
            i: t2, n: (t2 % 15) + 1,
            name: t2 < 15 ? TITHI[t2] : TITHI_K[t2 - 15],
            paksha: t2 < 15 ? "śukla" : "kṛṣṇa", ends: e2
          };
          D.at.tithi.doubled = true;
        }
      }
    }
    if (opts.moon) {
      D.moonrise = moonRiseSet(sr - 2 * 3600000, P, +1);
      D.moonset = moonRiseSet(sr - 2 * 3600000, P, -1);
    }
    if (opts.month) {
      var mk = monthKind(sr);
      D.monthKind = mk.kind;
      D.monthTransits = mk.n;
      /* Did the Sun change sidereal sign during this Hindu day? A saṃkrānti is a
         solar event, so it belongs to the day that contains it rather than to a
         tithi — and it is what Makara Saṅkrānti is fixed to, and what decides
         whether a lunar month is intercalary. */
      D.sankranti = null;
      if (srNext != null) {
        var s0 = solarSign(sr), s1 = solarSign(srNext);
        if (s0 != null && s1 != null && s0 !== s1) {
          var at = startOf(srNext - 60000, 30 * 24, solarSign);
          D.sankranti = { sign: s1, ms: at };
        }
      }
    }
    return D;
  };

  /* The accessor a calendar must use.

     A grid cell is a Gregorian date, and the day object is anchored to an
     INSTANT. Pick the instant badly and the whole calendar shifts: 06:00 local
     on 16 October in Delhi is before sunrise, so it belongs to the 15th's Hindu
     day, and a grid built on it would print the 15th's pañcāṅga in the 16th's
     cell — for every place whose sunrise is later than the anchor, which is most
     of them for much of the year. The error is uniform, so it looks like a
     working calendar.

     Local noon is the anchor: comfortably after sunrise and before the next one
     everywhere people live. And then the result is CHECKED — the sunrise that
     opened the returned day must itself fall on the date asked for — so a place
     and date where that does not hold (the polar cases, where there may be no
     sunrise at all) is reported rather than quietly answered with a neighbouring
     day. `dateMatch` false means the cell should say so. */
  NP.dayOfDate = function (y, m, d, P, opts) {
    if (!NP.inRange(y)) return { outOfRange: true, year: y };
    var tz = (P.tz || 0) * 3600000;
    var noon = Date.UTC(y, m - 1, d, 12, 0, 0) - tz;
    var D = NP.day(noon, P, opts);
    if (!D) return { noSunrise: true, year: y, month: m, date: d };
    var sl = new Date(D.sunrise + tz);
    D.dateMatch = (sl.getUTCFullYear() === y && sl.getUTCMonth() + 1 === m &&
                   sl.getUTCDate() === d);
    D.cell = { y: y, m: m, d: d };
    return D;
  };

  /* ===== the parts of the day ==============================================
     Several festival rules are not fixed to sunrise at all. Mahāśivarātri is the
     caturdaśī prevailing at NIŚĪTA, the middle of the night; Dīvālī the amāvāsyā
     prevailing at PRADOṢA, the evening twilight; Vijayadaśamī the daśamī at
     APARĀHNA. Evaluating those at sunrise puts them on the wrong day — measurably:
     Mahāśivarātri comes out a day late in each of 2024, 2025 and 2026, because in
     all three years the caturdaśī begins after sunrise and covers that night.

     The classical divisions, which is where these windows come from:
       daytime, sunrise to sunset, in five equal parts —
         prātaḥ · saṅgava · MADHYĀHNA · APARĀHNA · sāyāhna
       night, sunset to sunrise, in fifteen parts, the eighth being NIŚĪTA
       PRADOṢA, the three muhūrtas (about 2h 24m) following sunset */
  NP.windows = function (D) {
    if (D.sunrise == null || D.sunset == null) return null;
    var day = D.sunset - D.sunrise, p = day / 5;
    var night = (D.nextSunrise != null ? D.nextSunrise : D.sunset + 43200000) - D.sunset;
    var nq = night / 15;
    return {
      sunrise:   { from: D.sunrise, to: D.sunrise },
      pratah:    { from: D.sunrise, to: D.sunrise + p },
      madhyahna: { from: D.sunrise + 2 * p, to: D.sunrise + 3 * p },
      aparahna:  { from: D.sunrise + 3 * p, to: D.sunrise + 4 * p },
      sayahna:   { from: D.sunrise + 4 * p, to: D.sunset },
      pradosha:  { from: D.sunset, to: D.sunset + Math.min(night, 3 * (night / 15) * 5 / 3) },
      nishita:   { from: D.sunset + 7 * nq, to: D.sunset + 8 * nq },
      /* Moonrise, for the observances that genuinely turn on it. Karvā Cauth is
         the clear case: the fast runs from sunrise and breaks at moonrise, so the
         day is the one whose MOONRISE carries the caturthī — which in 2024 is a
         different day from the one either sunrise or pradoṣa would name, and the
         moonrise answer is the published one. Computed here rather than requiring
         opts.moon, so a rule can ask for it without the caller knowing it will. */
      moonrise: (function () {
        var mr = moonRiseSet(D.sunrise - 2 * 3600000, D.place, +1);
        if (mr == null || D.nextSunrise == null) return null;
        if (mr < D.sunrise || mr > D.nextSunrise) {
          mr = moonRiseSet(D.sunrise, D.place, +1);
          if (mr == null || mr > D.nextSunrise) return null;
        }
        return { from: mr, to: mr };
      })()
    };
  };
  /* Sunrise to moonrise, as a SPAN rather than a moment — and the reason it has
     to be a span is Karvā Cauth.

     No single moment names that observance in three consecutive years. The
     caturthī covers moonrise but not sunrise in 2024, sunrise but not moonrise in
     2025, and both in 2026; the published dates are 20 October, 10 October and
     29 October. What is true of all three is that the caturthī is running at some
     point between that day's sunrise and its moonrise — which is also what the
     observance is: a fast begun at sunrise and broken at moonrise. The rule and
     the practice turn out to be the same statement, which is usually the sign of
     having found the rule rather than fitted one. */
  NP.spanCovers = function (D, target) {
    var W = NP.windows(D);
    if (!W || !W.moonrise) return false;
    var a = D.sunrise, b = W.moonrise.from;
    if (b <= a) return false;
    /* The tithi advances at most twice across a span under 24 hours, so a few
       samples settle it; no bisection needed. */
    for (var i = 0; i <= 8; i++) {
      if (tithiIdx(a + (b - a) * i / 8) === target) return true;
    }
    return false;
  };
  /* The tithi prevailing in a window, taken at its midpoint — and whether the
     tithi CHANGES inside the window, because that is where two almanacs
     legitimately part company and the page should say so rather than print one
     answer with the confidence of an unambiguous one. */
  NP.tithiAt = function (D, which) {
    var W = NP.windows(D);
    if (!W) return null;
    /* A window can legitimately be absent — the Moon does not rise on every
       calendar day at every latitude — and a missing window must not silently
       fall back to sunrise, because that would answer a different question from
       the one the rule asked. */
    if (which && W.hasOwnProperty(which) && !W[which]) return null;
    var w = W[which] || W.sunrise;
    var mid = (w.from + w.to) / 2;
    var i = tithiIdx(mid);
    var a = tithiIdx(w.from), b = tithiIdx(w.to);
    return { i: i, mid: mid, changes: (a !== b),
             from: a, to: b, window: which, w: w };
  };

  /* ===== what is happening in the sky =======================================
     Stations, ingresses and syzygies in a window. This is the input to the
     studio page: the question "what is worth saying about today" has an answer
     only if something can enumerate what the sky is actually doing, and
     everything here is read off the same ephemeris the chart report uses rather
     than from a table someone typed.

     Deliberately NOT a list of what any of it means. These are events; the
     interpretation is a separate and much more careful business. */
  var GRAHA = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
               "Rahu", "Ketu"];
  NP.GRAHA = GRAHA;
  var GRAHA_SA = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala",
    Mercury: "Budha", Jupiter: "Guru", Venus: "Śukra", Saturn: "Śani",
    Rahu: "Rāhu", Ketu: "Ketu" };
  NP.grahaSa = function (n) { return GRAHA_SA[n] || n; };

  /* Apparent motion, by finite difference. A graha is retrograde when its
     sidereal longitude is decreasing; the nodes always are. An hour is a long
     enough baseline to be free of rounding and short enough that a station is
     located to within a few minutes by bisection. */
  function speedOf(name, ms) {
    var a = sidAt(name, ms - 1800000), b = sidAt(name, ms + 1800000);
    if (a == null || b == null) return null;
    var d = b - a;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;                       /* degrees per hour, signed */
  }
  NP.isRetro = function (name, ms) {
    var v = speedOf(name, ms);
    return v == null ? null : v < 0;
  };

  /* Every station, ingress and syzygy between two instants.
     `step` is the sampling interval; a station is then bisected to the minute.
     Rahu and Ketu are skipped for stations, being always retrograde, and the
     Moon for ingresses, which it makes thirteen of a month and which would
     drown everything else. */
  NP.scanEvents = function (fromMs, toMs, opts) {
    opts = opts || {};
    var out = [];
    var step = opts.step || 6 * 3600000;
    var want = opts.bodies || GRAHA;

    want.forEach(function (g) {
      var prevSign = null, prevRetro = null;
      for (var t = fromMs; t <= toMs; t += step) {
        var lon = sidAt(g, t);
        if (lon == null) continue;
        var sign = Math.floor((((lon % 360) + 360) % 360) / 30);

        if (prevSign != null && sign !== prevSign && !(g === "Moon" && !opts.moonIngress)) {
          var at = bisect(fromMs, t - step, t, function (m) {
            var L = sidAt(g, m);
            return L == null ? null : Math.floor((((L % 360) + 360) % 360) / 30);
          });
          if (at != null)
            out.push({ kind: "ingress", graha: g, sign: sign, ms: at,
                       from: prevSign });
        }
        prevSign = sign;

        if (g !== "Rahu" && g !== "Ketu" && g !== "Sun" && g !== "Moon") {
          var retro = NP.isRetro(g, t);
          if (prevRetro != null && retro != null && retro !== prevRetro) {
            var st = bisect(fromMs, t - step, t, function (m) {
              return NP.isRetro(g, m);
            });
            if (st != null)
              out.push({ kind: retro ? "retrograde" : "direct", graha: g, ms: st,
                         sign: Math.floor((((sidAt(g, st) % 360) + 360) % 360) / 30) });
          }
          prevRetro = retro;
        }
      }
    });

    /* new and full moons, from the same elongation the proof strip uses */
    if (opts.syzygy !== false) {
      var prevE = null;
      for (var u = fromMs; u <= toMs; u += Math.min(step, 6 * 3600000)) {
        var s = sidAt("Sun", u), m2 = sidAt("Moon", u);
        if (s == null || m2 == null) { prevE = null; continue; }
        var e = (((m2 - s) % 360) + 360) % 360;
        if (prevE != null) {
          var tgt = null;
          if (prevE > e) tgt = 0; else if (prevE < 180 && e >= 180) tgt = 180;
          if (tgt != null) {
            var at2 = bisectAngle(u - Math.min(step, 6 * 3600000), u, tgt);
            if (at2 != null)
              out.push({ kind: tgt === 0 ? "newmoon" : "fullmoon", ms: at2 });
          }
        }
        prevE = e;
      }
    }
    out.sort(function (a, b) { return a.ms - b.ms; });
    return out;
  };
  function bisect(floorMs, lo, hi, f) {
    var v0 = f(lo);
    if (v0 == null) return null;
    for (var i = 0; i < 44 && hi - lo > 30000; i++) {
      var mid = (lo + hi) / 2, v = f(mid);
      if (v == null) return null;
      if (v === v0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function bisectAngle(lo, hi, tgt) {
    function el(m) {
      var s = sidAt("Sun", m), x = sidAt("Moon", m);
      return (s == null || x == null) ? null : (((x - s) % 360) + 360) % 360;
    }
    for (var i = 0; i < 44 && hi - lo > 30000; i++) {
      var mid = (lo + hi) / 2, e = el(mid);
      if (e == null) return null;
      var d = ((e - tgt) % 360 + 360) % 360;
      if (d > 180) d -= 360;
      if (d < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ===== later tradition ===================================================
     Horā, choghaḍiyā, rāhu kāla and the ghaṭī clock. NOT BPHS — these are later
     practice, and they are kept in their own section so a view can label them
     that way instead of printing them alongside the five limbs as if the text
     taught them. */
  var HORA_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"];
  var WD_LORD = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  NP.hora = function (D) {
    if (D.sunrise == null || D.nextSunrise == null) return null;
    var span = (D.nextSunrise - D.sunrise) / 24;
    var i = Math.floor((D.ms - D.sunrise) / span);
    if (i < 0 || i > 23) return null;
    var wd = (Math.floor(window.__kJD(D.sunrise) + 1.5) % 7 + 7) % 7;
    var start = HORA_ORDER.indexOf(WD_LORD[wd]);
    return { i: i + 1, lord: HORA_ORDER[(start + i) % 7],
             from: D.sunrise + i * span, to: D.sunrise + (i + 1) * span };
  };
  var RAHU_PART = [7, 1, 6, 4, 5, 3, 2];
  NP.rahuKala = function (D) {
    if (D.sunrise == null || D.sunset == null) return null;
    var wd = (Math.floor(window.__kJD(D.sunrise) + 1.5) % 7 + 7) % 7;
    var part = (D.sunset - D.sunrise) / 8, i = RAHU_PART[wd];
    return { from: D.sunrise + i * part, to: D.sunrise + (i + 1) * part };
  };
  var CHOG_DAY = [
    ["Udvega", "Cala", "Lābha", "Amṛta", "Kāla", "Śubha", "Roga", "Udvega"],
    ["Amṛta", "Kāla", "Śubha", "Roga", "Udvega", "Cala", "Lābha", "Amṛta"],
    ["Roga", "Udvega", "Cala", "Lābha", "Amṛta", "Kāla", "Śubha", "Roga"],
    ["Lābha", "Amṛta", "Kāla", "Śubha", "Roga", "Udvega", "Cala", "Lābha"],
    ["Śubha", "Roga", "Udvega", "Cala", "Lābha", "Amṛta", "Kāla", "Śubha"],
    ["Cala", "Lābha", "Amṛta", "Kāla", "Śubha", "Roga", "Udvega", "Cala"],
    ["Kāla", "Śubha", "Roga", "Udvega", "Cala", "Lābha", "Amṛta", "Kāla"]
  ];
  NP.choghadiya = function (D) {
    if (D.sunrise == null || D.sunset == null) return null;
    if (D.ms < D.sunrise || D.ms > D.sunset) return { night: true };
    var wd = (Math.floor(window.__kJD(D.sunrise) + 1.5) % 7 + 7) % 7;
    var part = (D.sunset - D.sunrise) / 8, i = Math.floor((D.ms - D.sunrise) / part);
    return { name: CHOG_DAY[wd][Math.min(7, i)], i: i + 1,
             from: D.sunrise + i * part, to: D.sunrise + (i + 1) * part };
  };
  var MUHURTA = ["Rudra", "Āhi", "Mitra", "Pitṛ", "Vasu", "Vārāha", "Viśvedevā",
    "Vidhi", "Satamukhī", "Puruhūta", "Vāhinī", "Naktanakarā", "Varuṇa", "Aryaman",
    "Bhaga", "Girīśa", "Ajapāda", "Ahir Budhnya", "Puṣya", "Aśvinī", "Yama",
    "Agni", "Vidhātṛ", "Kaṇḍa", "Aditi", "Jīva", "Viṣṇu", "Yumigadyuti",
    "Brahma", "Samudrama"];
  /* Sixty ghaṭīs from sunrise, each of sixty palas — the reckoning a printed
     pañcāṅga uses, where "17.1" is 17 ghaṭīs and 1 pala after sunrise. Measured
     against THIS day's sunrise-to-sunrise length, not a mean 24 hours. */
  NP.hinduClock = function (D) {
    if (D.sunrise == null) return null;
    var len = (D.nextSunrise != null && D.nextSunrise > D.sunrise)
            ? (D.nextSunrise - D.sunrise) : 86400000;
    var f = (D.ms - D.sunrise) / len;
    if (f < 0 || f > 1.02) return null;
    /* The division is sixty all the way down — 60 ghaṭī to the day, 60 pala to
       the ghaṭī, 60 vipala to the pala — so ghaṭī:pala:vipala maps exactly onto
       hours:minutes:seconds and can be read the same way. The units are simply
       bigger: a ghaṭī is 24 minutes, a pala 24 seconds, and a vipala 0.4 of a
       second, which is why this ticks about two and a half times a second
       rather than once.

       And it is measured against THIS day's sunrise-to-sunrise length, not a
       mean 24 hours, so a vipala is very slightly longer on some days than
       others — which is correct, and is the whole difference between a Hindu
       clock and a clock with Sanskrit labels on it. */
    var g = f * 60, gh = Math.floor(g);
    var pTot = (g - gh) * 60, pl = Math.floor(pTot);
    var vp = Math.floor((pTot - pl) * 60);
    var mi = Math.min(29, Math.floor(f * 30));
    return { gh: gh, pala: pl, vipala: vp, f: f,
             vipalaMs: len / 216000,          /* 60*60*60 */
             muhurta: MUHURTA[mi], mi: mi + 1,
             mFrom: D.sunrise + len * mi / 30, mTo: D.sunrise + len * (mi + 1) / 30 };
  };
  /* "31:07:44" — padded like a clock, because that is how it is meant to be
     read at a glance. */
  NP.hinduClockText = function (hc) {
    if (!hc) return "—";
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    return p2(hc.gh) + ":" + p2(hc.pala) + ":" + p2(hc.vipala);
  };
  /* The ghaṭī.pala of an arbitrary instant within a day — what the almanac row
     prints for an end-time when the reader has asked for ghaṭikās rather than
     the clock. */
  NP.ghatika = function (D, at) {
    if (D.sunrise == null || at == null) return null;
    var len = (D.nextSunrise != null && D.nextSunrise > D.sunrise)
            ? (D.nextSunrise - D.sunrise) : 86400000;
    var g = (at - D.sunrise) / len * 60;
    if (g < 0 || g > 62) return null;
    var gh = Math.floor(g), vg = Math.round((g - gh) * 60);
    if (vg === 60) { gh++; vg = 0; }
    return gh + "." + (vg < 10 ? "0" + vg : vg);
  };

  window.NP = NP;
})();
