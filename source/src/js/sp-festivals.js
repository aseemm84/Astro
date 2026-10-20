/* ===== Festival reels =====================================================

   THE ONLY FESTIVAL CONTENT WORTH MAKING, given what is underneath.

   Anyone can post a Dīvālī graphic with a date on it. What almost nobody can
   post is the ANSWER to the question the date raises — why it was the 31st of
   October in 2024, the 20th in 2025 and the 8th of November in 2026 — because
   answering it needs a pañcāṅga engine, and these reels have one.

   So each festival gets two, and both are arguments rather than decorations:

     WHEN IT FALLS. Every occurrence for twenty years, plotted on a ring that
       is the Gregorian year. The dates wander across five weeks and then
       come back, because nineteen solar years and two hundred and thirty-five
       lunar months are the same length to within a couple of hours. The reel
       does not assert that; it measures the return from the dates it found
       and prints how close it came.

     THE LUNATION. The month the festival sits in, drawn as the thirty Moons
       it is, with the festival's own tithi ringed. A reader who has never
       been told what "kṛṣṇa caturdaśī" means can see it.

   WHERE THE DATES COME FROM. Not from a table. `festivals.js` holds the RULE
   — amānta month, tithi, and the qualifying window where there is one — and
   these reels search for the day that satisfies it, using the same
   `NP.festivalsOn` the calendar page uses. If that engine and these reels
   ever disagree, the harness fails.

   WHAT IS NOT CLAIMED. These rules are pañcāṅga tradition, not BPHS: Parāśara
   does not legislate the festival calendar, and this site does not attach a
   verse to something that has none. Several of the rules are genuinely
   contested — the engine marks those, and the reel repeats the warning rather
   than quietly choosing a side. Dates are computed for one place, because a
   tithi at sunrise is a local fact, and the reel says which place. */

(function () {
  "use strict";

  var DAY = 86400000;
  function NP() { return window.NP; }
  function ready() {
    return !!(window.NP && window.NP.day && window.NP.festivalsOn &&
              window.NP.tithiIdx && window.NP.FESTIVALS);
  }

  /* ---- finding the dates --------------------------------------------------
     A full-year scan with a day object per day is five milliseconds times
     three hundred and sixty-five times twenty years, which is a frozen tab.
     But the tithi at a given instant is cheap — no sunrise, no place — and a
     festival can only fall on a day whose tithi is within one of its own. So
     the expensive call is made about three times a year instead of
     three hundred and sixty-five. Measured: seven years in half a second. */
  function tithiOf(f) {
    if (f.t == null) return null;
    return (f.t instanceof Array) ? f.t[0] : f.t;
  }
  function near(a, b, span) {
    var d = Math.abs(a - b);
    return Math.min(d, span - d);
  }

  var CACHE = {};

  /* THE TITHI PREFILTER IS NOT ENOUGH ON ITS OWN, because a tithi comes
     round every month. Filtering a whole year by "within one of amāvāsyā"
     leaves thirty-six candidate days, not three, and each one costs a full
     day object — which is why the first version took four seconds for
     twenty-four years and sixteen for the solar one.

     So the search is seeded: once one year's date is known, the next is
     twelve lunations later, or thirteen in an intercalary year. Both windows
     are tried, and only if both miss does it fall back to scanning the
     whole year. That turns thirty-odd day objects a year into about four. */
  var LUNATION = 29.530589, YEAR12 = LUNATION * 12, YEAR13 = LUNATION * 13;

  function testDay(key, ms, P) {
    var D = null;
    /* { month: true } is not optional. Without it the day object carries no
       saṅkrānti, and a solar rule asks the day whether the Sun entered its
       rāśi between sunrise and sunset. With a plain day object that test
       fell through to "was the ingress after yesterday's sunset", which is
       true about half the time — so Makara Saṅkrānti, which happens every
       single year, was found in twelve years out of twenty-four, in a tidy
       two-on two-off pattern that looked exactly like a real cycle. */
    try { D = NP().day(ms, P, { month: true }); } catch (e) { return null; }
    var hit = null;
    try {
      (NP().festivalsOn(D, { minor: true }) || []).forEach(function (q) {
        if (q.key === key) hit = q;
      });
    } catch (e2) { return null; }
    return hit ? { D: D, f: hit, ms: ms } : null;
  }

  function scan(key, want, from, days, P) {
    for (var d = 0; d < days; d++) {
      var ms = from + d * DAY;
      if (want != null) {
        /* two tithis of slack, not one: a rule judged at niśīta or pradoṣa
           reads a different tithi at noon than at the moment it applies, and
           a tolerance of one dropped three of Mahāśivarātri's twenty-four */
        if (near(NP().tithiIdx(ms), want, 30) > 2) continue;
      }
      var hit = testDay(key, ms, P);
      if (hit) return hit;
    }
    return null;
  }

  /* A solar festival has no tithi to filter on. Its day is fixed by the
     Sun's entry into a rāśi, which is cheap to find directly — so the scan
     is two days wide instead of a year. */
  function solarDay(rashi, year) {
    if (!window.__kSidAt) return null;
    function lon(ms) { return window.__kSidAt("Sun", new Date(ms)); }
    var target = rashi * 30;
    var t = Date.UTC(year, 0, 1, 12);
    var prev = lon(t);
    for (var i = 1; i <= 370; i++) {
      var tn = t + i * DAY, cur = lon(tn);
      var crossedWrap = cur < prev;
      var p2 = prev, c2 = cur;
      if (crossedWrap) c2 += 360;
      if (p2 <= target && c2 >= target) {
        var lo = tn - DAY, hi = tn;
        for (var k = 0; k < 40 && hi - lo > 60000; k++) {
          var mid = (lo + hi) / 2, v = lon(mid);
          if (crossedWrap && v < 180) v += 360;
          if (v <= target) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      }
      prev = cur;
    }
    return null;
  }

  function datesFor(key, y0, years, place) {
    if (!ready()) return null;
    var P = place || NP().savedPlace() || NP().PLACES[0];
    var ck = key + "|" + y0 + "|" + years + "|" + (P.n || "");
    if (CACHE[ck]) return CACHE[ck];
    var rule = null;
    NP().FESTIVALS.forEach(function (f) { if (f.key === key) rule = f; });
    if (!rule) return null;
    var want = tithiOf(rule);
    var out = [], gaps = [], prevMs = null;
    for (var y = y0; y < y0 + years; y++) {
      if (NP().inRange && !NP().inRange(y)) continue;
      var found = null;
      if (rule.solar != null) {
        var ing = solarDay(rule.solar, y);
        if (ing != null) {
          for (var o = -1; o <= 2 && !found; o++)
            found = testDay(key, ing + o * DAY, P);
        }
      } else {
        if (prevMs != null) {
          found = scan(key, want, prevMs + (YEAR12 - 25) * DAY, 50, P) ||
                  scan(key, want, prevMs + (YEAR13 - 25) * DAY, 50, P);
        }
        if (!found)
          found = scan(key, want, Date.UTC(y, 0, 1, 12), 366, P);
      }
      if (!found) {
        /* A YEAR WITH NO DAY IS A FINDING, NOT A HOLE.

           Mahāśivarātri is kṛṣṇa caturdaśī prevailing at niśīta; Dussehra is
           śukla daśamī prevailing at aparāhna. A tithi runs from twenty to
           twenty-seven hours, so in a few years per century the right tithi
           exists but never covers the window the rule names — and the engine
           correctly reports no day. Those are precisely the years published
           almanacs disagree about, so the reel counts them and says so
           rather than quietly skipping a bead. */
        gaps.push({ year: y, why: whyMissing(rule, want, y, P) });
        continue;
      }
      if (new Date(found.ms).getUTCFullYear() !== y) continue;
      prevMs = found.ms;
      var dt = new Date(found.ms);
      out.push({
        t: found.ms,
        year: y,
        doy: Math.floor((found.ms - Date.UTC(y, 0, 1, 12)) / DAY),
        iso: dt.toISOString().slice(0, 10),
        /* the elongation of the Moon from the Sun at sunrise IS the phase,
           and it is what the body renderer wants */
        phase: found.D.elongation == null ? 180 : found.D.elongation,
        /* D.at.tithi is an OBJECT, {i, name}. Storing it as `tithi` and then
           comparing it to a loop index meant the lunation reel's ring never
           marked anything, and the caption's tithi name was undefined, so
           every festival caption read as its month alone. */
        tithi: (found.D.at && found.D.at.tithi) ? found.D.at.tithi.i : null,
        tithiName: (found.D.at && found.D.at.tithi)
          ? found.D.at.tithi.name : null,
        paksha: (found.D.at && found.D.at.tithi)
          ? (found.D.at.tithi.i < 15 ? "śukla" : "kṛṣṇa") : null,
        masa: found.D.masaFestival || found.D.masa,
        rule: found.f.rule, source: found.f.source,
        contested: !!found.f.contested, note: found.f.note || null,
        when: found.f.when, close: found.f.close, closeWhy: found.f.closeWhy,
        name: found.f.name
      });
    }
    out.gaps = gaps;
    CACHE[ck] = out;
    return out;
  }

  /* Did the tithi and month exist at sunrise that year even though the
     window test found nothing? If so the rule's window is the reason, and
     the reel can say which window. */
  function whyMissing(rule, want, y, P) {
    if (rule.solar != null || want == null) return "no day matched the rule";
    for (var d = 0; d < 366; d++) {
      var ms = Date.UTC(y, 0, 1, 12) + d * DAY;
      if (near(NP().tithiIdx(ms), want, 30) > 1) continue;
      var D = null;
      try { D = NP().day(ms, P, { month: true }); } catch (e) { continue; }
      if (!D.at || !D.at.tithi) continue;
      if (D.at.tithi.i !== want) continue;
      if (NP().masaIdx(D.masaFestival) !== rule.m) continue;
      return rule.when
        ? "the tithi fell on " + new Date(ms).toISOString().slice(0, 10) +
          " but never covered " + rule.when
        : "the tithi fell on " + new Date(ms).toISOString().slice(0, 10);
    }
    return "the tithi did not fall in that month at all";
  }

  /* ---- the nineteen-year return -------------------------------------------
     Nineteen solar years are 6939.60 days; two hundred and thirty-five lunar
     months are 6939.69. The festival therefore returns to within a day or
     two of its old date after nineteen years — the Metonic cycle, which is
     the reason the wandering is a loop rather than a drift.

     MEASURED, not asserted: the best shift is found from the dates this run
     actually produced, and if nothing lines up the reel says so. */
  function metonic(ev) {
    if (ev.length < 12) return null;
    /* BY YEAR, NOT BY ARRAY INDEX. A year where the rule admits no day leaves
       a hole in the list, and comparing ev[i] with ev[i + 19] then compares
       dates eighteen years apart — which is how a reel with one gap in it
       announced that Dīvālī returns after eighteen years. */
    var byYear = {};
    ev.forEach(function (q) { byYear[q.year] = q.doy; });
    var best = null;
    for (var lag = 8; lag <= 25; lag++) {
      var n = 0, sum = 0;
      for (var i = 0; i < ev.length; i++) {
        var a = ev[i].doy, b = byYear[ev[i].year + lag];
        if (b == null) continue;
        var d = Math.abs(b - a);
        d = Math.min(d, 365 - d);
        sum += d; n++;
      }
      if (n < 3) continue;
      var mean = sum / n;
      if (!best || mean < best.mean) best = { lag: lag, mean: mean, n: n };
    }
    return (best && best.mean < 4) ? best : null;
  }

  /* ---- story 1: where in the year it falls ------------------------------- */
  function whenStory(spec) {
    /* the span comes from the spec's two instants, not from a `years` field:
       the builder sets t0 and t1 and does not pass the year count through, so
       reading spec.years gave NaN and every one of these reels silently
       built nothing */
    var years = Math.max(3, Math.round(
      (spec.t1 - spec.t0) / DAY / 365.2564));
    var ev0 = datesFor(spec.fest, new Date(spec.t0).getUTCFullYear(),
                       years, spec.place);
    if (!ev0 || ev0.length < 3) return null;
    var lo = 999, hi = -999;
    ev0.forEach(function (q) { lo = Math.min(lo, q.doy); hi = Math.max(hi, q.doy); });
    var ev = ev0.map(function (q, i) {
      return {
        t: q.t, lon: 0, doy: q.doy, phase: q.phase,
        marked: true, hold: i < 2,
        tally: "years",
        big: capsDate(q.t),
        small: q.masa + " " + (q.paksha ? q.paksha + " " : "") +
               (q.tithiName || ""),
        note: i === 0 ? "THE RULE: " + shortRule(q) : null,
        rule: q.rule, source: q.source, contested: q.contested,
        name: q.name
      };
    });
    var solar = ev0.length && ev0[0].rule &&
                /SOLAR|sidereal entry/i.test(ev0[0].rule);
    var span = Math.round(
      (ev0[ev0.length - 1].t - ev0[0].t) / DAY / 365.2564) + 1;
    var m = solar ? null : metonic(ev0);
    /* A SOLAR FESTIVAL DOES NOT WANDER AND DOES NOT RETURN — it creeps.
       Makara Saṅkrānti alternates between two Gregorian dates on a four-year
       beat, which is the leap year and nothing else, and underneath that it
       moves forward about a day a century because the sidereal rāśi is
       fixed to the stars while the Gregorian year is tied to the equinox.
       Reporting a "return after 8 years" for that would be reporting the
       leap cycle as if it were a lunar one. */
    var creep = null;
    if (solar) {
      /* AVERAGED OVER A LEAP CYCLE AT EACH END. The date alternates by a
         day on a four-year beat, so two single samples two centuries apart
         measure the leap year as often as they measure the drift: the first
         attempt returned half a day a century, against a true rate near one
         and a half. Eight years at each end averages the beat away. */
      var a = datesFor(spec.fest, 1810, 8, spec.place);
      var b = datesFor(spec.fest, 2186, 8, spec.place);
      function meanDoy(list) {
        var s2 = 0;
        list.forEach(function (q) { s2 += q.doy; });
        return list.length ? s2 / list.length : null;
      }
      if (a && a.length >= 4 && b && b.length >= 4) {
        var da = meanDoy(a), db = meanDoy(b);
        creep = { from: a[0].year, to: b[0].year,
                  days: (db - da) / ((b[0].year - a[0].year) / 100) };
      }
    }
    var first = ev0[0], last = ev0[ev0.length - 1];
    var spread = hi - lo;
    return {
      kicker: "Nirayana",
      title: "Why does " + spec.label + " move?",
      /* The count and the span are different numbers when the rule admits
         no day in some year, and saying "for 21 years" of a run that covers
         23 is the kind of small slippage this project keeps refusing. */
      subtitle: (solar
        ? "Every " + spec.label + " across " + span + " years. It is a solar " +
          "event, so watch how little it moves."
        : ev0.length + " of them across " + span + " years, each placed in " +
          "the Gregorian year it fell in."),
      stage: "year",
      cover: { t0: ev0[0].t, t1: ev0[ev0.length - 1].t },
      events: ev,
      tallyKeys: ["years"],
      clockMode: "year",
      closing: {
        big: solar
          ? "Two dates, and a day a century"
          : spread + " days of wandering" +
            (m ? ", and a return after " + m.lag : ""),
        lines: [
          "The rule never changes: " + first.rule,
          (solar
            ? "What changes is only which side of a leap day it lands on: " +
              first.iso.slice(5) + " or " + last.iso.slice(5) + ", a spread " +
              "of " + spread + " days across " + ev0.length + " years."
            : "What changes is the Gregorian date, because a lunar month is " +
              "29.53 days and a solar year is not a whole number of them. " +
              "From " + first.iso.slice(5) + " to " + last.iso.slice(5) +
              ", a spread of " + spread + " days."),
          solar
            ? (creep
                ? "It barely moves: the two-date alternation is the leap " +
                  "year, not the sky. Underneath it the date creeps forward " +
                  "about " + Math.abs(creep.days).toFixed(1) + " days a " +
                  "century — averaged over a leap cycle at " + creep.from +
                  " and again at " + creep.to +
                  " — because the rāśi is fixed to the stars and the " +
                  "Gregorian year is tied to the equinox. That gap is the " +
                  "ayanāṃśa."
                : "It barely moves, because it is not a lunar festival at all.")
            : (m
                ? "After " + m.lag + " years it comes back to within " +
                  m.mean.toFixed(1) + " days of where it was. That is the " +
                  "Metonic cycle: 19 solar years and 235 lunar months differ " +
                  "by about two hours."
                : "Over this span no simple number of years brings it back, " +
                  "so no cycle is claimed here."),
          (ev0.gaps && ev0.gaps.length
            ? "In " + ev0.gaps.length + " of these years the rule admits no " +
              "day at all: " + ev0.gaps[0].why + ". Those are the years " +
              "almanacs disagree about. "
            : "") +
          (first.contested
            ? "This rule is contested — published pañcāṅgas differ. " +
              (first.note || "")
            : "Source: " + first.source)
        ]
      },
      placeName: (spec.place || NP().savedPlace() || NP().PLACES[0]).n
    };
  }
  function shortRule(q) {
    return ((q.masa || "") + " " + (q.paksha || "") + " " +
            (q.tithiName || "")).trim().toUpperCase();
  }
  var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
             "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function capsDate(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  /* ---- story 2: the lunation --------------------------------------------- */
  function lunationStory(spec) {
    var ev0 = datesFor(spec.fest, new Date(spec.t0).getUTCFullYear(), 3,
                       spec.place);
    if (!ev0 || !ev0.length) return null;
    var hit = ev0[0];
    /* the lunation that CONTAINS the festival: from the new Moon before to
       the new Moon after, found from the elongation rather than assumed to
       be 29.53 days long, because it is not */
    var t0 = prevNew(hit.t), t1 = nextNew(hit.t);
    if (t0 == null || t1 == null) return null;
    var n = 30;
    /* MARK THE TITHI THE RULE NAMES, not the one at sunrise.

       Dīvālī is Kārtika amāvāsyā — tithi thirty — but the rule asks about
       pradoṣa, the hour after sunset, and at sunrise that day it is still
       caturdaśī. Marking the sunrise tithi therefore ringed the twenty-ninth
       Moon on a reel whose subject is the thirtieth. The gap between the two
       is not an inconvenience to be smoothed over: it is exactly why the
       rule names a window, and the caption now says so. */
    var rule = null;
    NP().FESTIVALS.forEach(function (f) { if (f.key === spec.fest) rule = f; });
    var ruleT = rule ? tithiOf(rule) : null;
    var ti = ruleT == null ? (hit.tithi == null ? 0 : hit.tithi) : ruleT;
    var sunriseT = hit.tithi;
    var ev = [];
    for (var i = 0; i < n; i++) {
      var tt = t0 + (t1 - t0) * (i / n);
      var mark = (i === ti);
      ev.push({
        t: tt, lon: 0, marked: mark, hold: mark || i === 0,
        tally: mark ? "the day" : "tithis",
        big: capsDate(tt),
        small: "Tithi " + (i < 15 ? "śukla " + (i + 1) : "kṛṣṇa " + (i - 14)) +
               (mark ? " — " + hit.name : ""),
        note: mark ? hit.name.toUpperCase()
                   : (i === 0 ? "ONE MONTH, THIRTY TITHIS" : null)
      });
    }
    return {
      kicker: "Nirayana",
      title: spec.label,
      subtitle: "One lunar month, drawn as the thirty Moons it is. The ring " +
                "marks the tithi the rule names.",
      stage: "lunation",
      cover: { t0: t0, t1: t1 },
      lunation: { t0: t0, t1: t1, n: n, mark: ti, phaseAt: phaseAt },
      events: ev,
      tallyKeys: ["tithis", "the day"],
      clockMode: "days",
      closing: {
        big: hit.name + " — " + hit.iso,
        lines: [
          hit.rule,
          "A tithi is not a day. It is the time the Moon takes to gain 12° on " +
          "the Sun, which runs from about 20 to 27 hours — so a tithi can " +
          "skip a sunrise or span two, and that is why the rule names a " +
          "window and not a clock time." +
          (sunriseT != null && ruleT != null && sunriseT !== ruleT
            ? " On " + hit.iso + " the sunrise tithi is still the one before: " +
              "the rule is satisfied " +
              (rule && rule.when ? "at " + rule.when : "later in the day") + "."
            : ""),
          hit.contested
            ? "This rule is contested: " + (hit.note || "published pañcāṅgas differ.")
            : "Source: " + hit.source
        ]
      },
      placeName: (spec.place || NP().savedPlace() || NP().PLACES[0]).n
    };
  }
  function phaseAt(ms) {
    if (!window.__kSidAt) return 180;
    var s = window.__kSidAt("Sun", new Date(ms));
    var m = window.__kSidAt("Moon", new Date(ms));
    if (s == null || m == null) return 180;
    var d = (m - s) % 360;
    return d < 0 ? d + 360 : d;
  }
  function prevNew(ms) { return findNew(ms, -1); }
  function nextNew(ms) { return findNew(ms, 1); }
  function findNew(ms, dir) {
    /* walk a day at a time until the elongation crosses zero, then bisect */
    var prev = phaseAt(ms), t = ms;
    for (var i = 0; i < 40; i++) {
      var tn = t + dir * DAY;
      var cur = phaseAt(tn);
      var crossed = dir > 0 ? (cur < prev) : (cur > prev);
      if (crossed) {
        var lo = Math.min(t, tn), hi = Math.max(t, tn);
        for (var k = 0; k < 40 && hi - lo > 60000; k++) {
          var mid = (lo + hi) / 2;
          if (phaseAt(mid) > 180) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      }
      t = tn; prev = cur;
    }
    return null;
  }

  /* ---- the catalogue ------------------------------------------------------
     The eight asked for, each twice, plus the two Navrātris as spans. Caitra
     Navrātri has no rule of its own in the engine and is not given one here:
     it begins on Ugādi's tithi, which is a fact about the two rules and not a
     new claim. */
  var LIST = [
    { fest: "diwali", label: "Dīvālī", years: 24,
      why: "Kārtika amāvāsyā — the darkest night of the year's darkest " +
           "fortnight, which is the point." },
    { fest: "dussehra", label: "Vijayadaśamī", years: 24,
      why: "The tenth day of the bright fortnight of Āśvina, and the day " +
           "Navrātri ends." },
    { fest: "holi", label: "Holī", years: 24,
      why: "The day after the Phālguna full Moon." },
    { fest: "ramanavami", label: "Rāma Navamī", years: 24,
      why: "The ninth day of the bright fortnight of Caitra." },
    { fest: "navaratri", label: "Śāradīya Navrātri", years: 24,
      why: "Nine nights from the first day of bright Āśvina." },
    { fest: "ugadi", label: "Caitra Navrātri", years: 24,
      why: "The lunar new year — nine nights from the first day of bright " +
           "Caitra, ending at Rāma Navamī." },
    { fest: "makara", label: "Makara Saṅkrānti", years: 24,
      why: "The one that is not lunar at all: the Sun entering Makara." },
    { fest: "janmashtami", label: "Kṛṣṇa Janmāṣṭamī", years: 24,
      why: "The eighth of the dark fortnight of Śrāvaṇa — amānta Śrāvaṇa, " +
           "which is pūrṇimānta Bhādrapada, and the popular name uses the " +
           "other convention." },
    { fest: "mahashivaratri", label: "Mahāśivarātri", years: 24,
      why: "The fourteenth of the dark fortnight of Māgha, judged at " +
           "niśīta — midnight — not at sunrise." }
  ];

  function publish() {
    if (!window.SPStories || !window.SPStories.add) return;
    var add = window.SPStories.add;
    LIST.forEach(function (q) {
      add({ key: "fest.when." + q.fest, group: "Festivals — why the date moves",
            label: q.label + " — why does it move?",
            blurb: q.why + " Every occurrence for " + q.years +
                   " years, placed in the Gregorian year.",
            years: q.years, seconds: 34,
            build: function (s) {
              s.fest = q.fest; s.label = q.label; return whenStory(s); } });
      add({ key: "fest.moon." + q.fest, group: "Festivals — the month it sits in",
            label: q.label + " — the lunation",
            blurb: "One lunar month drawn as its thirty Moons, with the " +
                   "tithi the rule names ringed.",
            years: 1, seconds: 28,
            build: function (s) {
              s.fest = q.fest; s.label = q.label; return lunationStory(s); } });
    });
  }

  window.SPFest = { publish: publish, datesFor: datesFor, metonic: metonic,
                    LIST: LIST, ready: ready, phaseAt: phaseAt,
                    prevNew: prevNew, nextNew: nextNew };
  /* the pañcāṅga engine is loaded alongside, so publish as soon as both the
     story registry and it exist */
  if (ready() && window.SPStories) publish();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { publish(); });
  else setTimeout(publish, 0);
})();
