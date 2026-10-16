/* ===== festivals.js — rules, not dates ====================================

   Extends window.NP. Shipped as one file with panchanga.js so a page cannot
   load half of the pair.

   THE CENTRAL POINT. A festival is a RULE, not a date. Dīvālī is not "the 12th
   of November"; it is the amāvāsyā of Kārtika, qualified by pradoṣa-kāla — which
   is why published pañcāṅgas disagree with each other when the amāvāsyā straddles
   two evenings. A date table would hide that; a rule table can state it.

   So each entry carries its condition, its scope, and its source, and the page
   SHOWS the rule beside the date. Where the rule is contested, the entry says so
   — the same way the BPHS pages mark textual variants rather than silently
   picking one reading.

   THE RECKONING. Every rule here is evaluated on the AMĀNTA month, whatever
   reckoning the reader has chosen to display. This is not a simplification: most
   festivals are computed on amānta even in pūrṇimānta regions, so evaluating
   them against a pūrṇimānta display month would give wrong dates to exactly the
   North Indian reader the pūrṇimānta default is for. That is why the day object
   carries `masaFestival` as a field separate from `masa`.

   WHAT IS DELIBERATELY NOT HERE.
     * No festival whose rule I cannot state and attribute. A plausible date with
       no rule behind it is worse than an absent one, because it cannot be
       checked.
     * No muhūrta-qualified refinements beyond the pradoṣa/aruṇodaya notes below.
       Those need a definition of the window per tradition, and half of one is
       not useful.
     * No regional festival sets. A later layer, honestly labelled, not a guess
       bolted onto a national list.

   SCOPE AND SOURCE. These are pan-Indian observances whose tithi rules are
   stable across published almanacs. BPHS does not legislate the festival
   calendar — it is a sibling discipline, same astronomy, different subject — so
   the source field names the tradition, never a Parāśara verse. Claiming a verse
   for a festival rule would be a fabricated citation, which this project does
   not do. */

(function () {
  "use strict";
  var NP = window.NP;
  if (!NP) return;

  /* t: tithi index 0..29, where 0..14 is śukla pratipadā..pūrṇimā and 15..29 is
     kṛṣṇa pratipadā..amāvāsyā. m: amānta month index, Caitra = 0. */
  function T(paksha, n) { return paksha === "s" ? (n - 1) : (15 + n - 1); }

  /* Every entry below was DERIVED, not recalled: the amānta month index and the
     tithi were read off the engine for published dates in 2024, 2025 and 2026,
     and a rule was only accepted when all three years agreed. That method caught
     two classes of error at once.

     It corrected my own assumptions. Janmāṣṭamī is amānta ŚRĀVAṆA kṛṣṇa aṣṭamī,
     not Bhādrapada: the familiar "Bhādrapada kṛṣṇa aṣṭamī" is the pūrṇimānta
     name, and for a kṛṣṇa-pakṣa festival pūrṇimānta runs one month ahead. The
     popular names mix the two conventions freely — Holī is usually given its
     amānta month and Dīvālī its pūrṇimānta one — so reasoning from names is not
     a method. Measuring is.

     And it identified the festivals whose rule is not fixed to sunrise at all.
     Where all three years disagreed by exactly one tithi at sunrise, the cause
     was a qualifying window: `when` names it, and the day is the one whose
     window carries the tithi. Mahāśivarātri reads trayodaśī at sunrise in all
     three years and caturdaśī at niśīta, which is the rule.

     `when` defaults to sunrise. `after` makes an entry relative to another, for
     the cases where that is genuinely what the rule says. */
  var FEST = [
    { key: "ugadi", name: "Ugādi / Gudi Padwa", m: 0, t: T("s", 1),
      rule: "Caitra śukla pratipadā — the first day of the lunar year in the " +
            "Caitrādi reckoning, and the day the saṃvat turns.",
      note: "Computed on the amānta month even in pūrṇimānta regions.",
      source: "Pan-Indian lunisolar new year." },

    { key: "ramanavami", name: "Rāma Navamī", m: 0, t: T("s", 9),
      rule: "Caitra śukla navamī at sunrise.",
      source: "Pan-Indian observance." },

    { key: "akshaya", name: "Akṣaya Tṛtīyā", m: 1, t: T("s", 3),
      rule: "Vaiśākha śukla tṛtīyā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "gurupurnima", name: "Guru Pūrṇimā", m: 3, t: T("s", 15),
      rule: "Āṣāḍha pūrṇimā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "nagapanchami", name: "Nāga Pañcamī", m: 4, t: T("s", 5),
      rule: "Śrāvaṇa śukla pañcamī at sunrise.",
      note: "Observed in the kṛṣṇa pakṣa of the same month in some southern " +
            "reckonings — the month agrees, the pakṣa differs by tradition.",
      contested: true,
      source: "Pan-Indian observance; pakṣa varies regionally." },

    { key: "rakshabandhan", name: "Rakṣā Bandhan", m: 4, t: T("s", 15),
      rule: "Śrāvaṇa pūrṇimā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "janmashtami", name: "Kṛṣṇa Janmāṣṭamī", m: 4, t: T("k", 8),
      rule: "Śrāvaṇa kṛṣṇa aṣṭamī in the AMĀNTA reckoning — the same day that " +
            "pūrṇimānta counting calls Bhādrapada kṛṣṇa aṣṭamī.",
      note: "The clearest case of why display and festival reckoning are two " +
            "separate fields: one day, one rule, two month names. Classically " +
            "qualified by niśīta (midnight); across 2024–2026 that falls on the " +
            "same day the sunrise aṣṭamī names, so the simpler test is used and " +
            "this note records the qualification.",
      source: "Pan-Indian observance." },

    { key: "ganesha", name: "Gaṇeśa Caturthī", m: 5, t: T("s", 4),
      rule: "Bhādrapada śukla caturthī at sunrise.",
      note: "Observed at madhyāhna in practice; across 2024–2026 that is the " +
            "same day the sunrise caturthī names.",
      source: "Pan-Indian observance." },

    { key: "navaratri", name: "Śāradīya Navarātri begins", m: 6, t: T("s", 1),
      rule: "Āśvina śukla pratipadā at sunrise; the nine nights run from here.",
      source: "Pan-Indian observance." },

    { key: "dussehra", name: "Vijayadaśamī / Dussehra", m: 6, t: T("s", 10),
      when: "aparahna",
      rule: "Āśvina śukla daśamī prevailing at APARĀHNA — the fourth of the five " +
            "parts of the daytime, not at sunrise.",
      note: "In 2024 and 2026 the daśamī begins after sunrise, so a sunrise test " +
            "puts the observance a day late. The aparāhna rule gives the " +
            "published date in all three years checked.",
      source: "Pan-Indian observance; aparāhna qualification is standard." },

    { key: "karva", name: "Karvā Cauth", m: 6, t: T("k", 4), span: true,
      rule: "Āśvina kṛṣṇa caturthī (amānta) running at any point between " +
            "SUNRISE and MOONRISE — the month pūrṇimānta counting calls Kārtika.",
      note: "Stated as a span because no single moment names this observance in " +
            "three consecutive years: the caturthī covers moonrise but not " +
            "sunrise in 2024, sunrise but not moonrise in 2025, and both in 2026. " +
            "What holds in all three is that it runs somewhere between the two — " +
            "which is also what the observance is, a fast begun at sunrise and " +
            "broken at moonrise. Because moonrise varies between cities by more " +
            "than sunrise does, this is the observance most likely to fall on " +
            "different days in different places.",
      contested: true,
      source: "North Indian observance; the moonrise qualification is standard." },

    { key: "dhanteras", name: "Dhanteras", m: 6, t: T("k", 13), when: "pradosha",
      rule: "Āśvina kṛṣṇa trayodaśī (amānta) prevailing at PRADOṢA — the month " +
            "that pūrṇimānta counting calls Kārtika.",
      note: "Almanacs differ when the trayodaśī does not cover the evening.",
      contested: true,
      source: "Pan-Indian observance." },

    { key: "diwali", name: "Dīvālī / Lakṣmī Pūjā", m: 6, t: T("k", 15),
      when: "pradosha",
      rule: "Āśvina amāvāsyā (amānta) prevailing at PRADOṢA — the amāvāsyā that " +
            "pūrṇimānta counting calls Kārtika amāvāsyā.",
      note: "The observance is fixed to the evening twilight, not to sunrise: in " +
            "2025 and 2026 the amāvāsyā begins during the day, so a sunrise test " +
            "names the day before. When the amāvāsyā straddles two evenings, " +
            "published pañcāṅgas legitimately disagree; this page marks the day " +
            "its own rule gives and says when the case is close. It does not " +
            "adjudicate.",
      contested: true,
      source: "Pan-Indian observance; pradoṣa-kāla qualification is standard." },

    { key: "govardhan", name: "Govardhan Pūjā / Annakūṭa", m: 7, t: T("s", 1),
      rule: "Kārtika śukla pratipadā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "bhaiduj", name: "Bhāī Dūj", m: 7, t: T("s", 2),
      rule: "Kārtika śukla dvitīyā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "kartikpurnima", name: "Kārtika Pūrṇimā", m: 7, t: T("s", 15),
      rule: "Kārtika pūrṇimā at sunrise.",
      source: "Pan-Indian observance." },

    { key: "makara", name: "Makara Saṅkrānti", solar: 9,
      rule: "The Sun's sidereal entry into Makara — a SOLAR event, not a tithi, " +
            "which is why it sits near a fixed Gregorian date while the lunar " +
            "festivals move across it.",
      note: "The only festival here fixed by the Sun rather than the Moon.",
      source: "Pan-Indian solar observance." },

    { key: "mahashivaratri", name: "Mahāśivarātri", m: 10, t: T("k", 14),
      when: "nishita",
      rule: "Māgha kṛṣṇa caturdaśī (amānta) prevailing at NIŚĪTA, the middle of " +
            "the night — the month pūrṇimānta counting calls Phālguna.",
      note: "In each of 2024, 2025 and 2026 the day reads trayodaśī at sunrise " +
            "and caturdaśī at niśīta, so a sunrise test is a day late in all " +
            "three. This is the clearest demonstration that the qualifying " +
            "window is part of the rule and not a refinement to it.",
      source: "Pan-Indian observance; niśīta qualification is standard." },

    { key: "holika", name: "Holikā Dahana", m: 11, t: T("s", 15),
      when: "pradosha",
      rule: "Phālguna pūrṇimā prevailing at PRADOṢA, the evening.",
      note: "Subject to the bhadrā (viṣṭi-karaṇa) exclusion in practice, which " +
            "this page does not apply — so where bhadrā covers the evening the " +
            "published observance may be timed differently within the day.",
      contested: true,
      source: "Pan-Indian observance." },

    { key: "holi", name: "Holī / Dhuleṭī", after: "holika",
      rule: "The day following Holikā Dahana.",
      note: "Stated as a relative rule because it is one: the sunrise tithi of " +
            "Holī is pūrṇimā in some years and kṛṣṇa pratipadā in others, so no " +
            "single tithi test names it. Deriving it from Holikā Dahana is both " +
            "simpler and what the tradition actually says.",
      source: "Pan-Indian observance." },

    { key: "ekadashi", name: "Ekādaśī", anyMonth: true, t: [T("s", 11), T("k", 11)],
      rule: "The eleventh tithi of either pakṣa, in every month — twenty-four a " +
            "year, and twenty-six in a year carrying an adhika month.",
      note: "Observance days genuinely differ between cities, because the " +
            "question is which SUNRISE the tithi covers. This is the plainest " +
            "demonstration that a Hindu calendar is valid only for the place it " +
            "was computed for. An ekādaśī that covers TWO sunrises names two " +
            "consecutive days, which is the origin of smārta and vaiṣṇava " +
            "observance falling a day apart — 2024 had 25 ekādaśī tithis and 27 " +
            "days naming one, the difference being exactly the two that spanned " +
            "a second sunrise.",
      source: "Pan-Indian observance." },

    { key: "purnima", name: "Pūrṇimā", anyMonth: true, t: [T("s", 15)],
      rule: "The full moon of any month.", minor: true,
      source: "Classical pañcāṅga marker." },

    { key: "amavasya", name: "Amāvāsyā", anyMonth: true, t: [T("k", 15)],
      rule: "The new moon of any month.", minor: true,
      source: "Classical pañcāṅga marker." },

    { key: "sankashti", name: "Saṅkaṣṭī Caturthī", anyMonth: true, t: [T("k", 4)],
      rule: "Kṛṣṇa caturthī of any month.", minor: true,
      note: "Tied to moonrise in practice, which varies by place more than " +
            "sunrise does.",
      source: "Pan-Indian observance." }
  ];

  NP.FESTIVALS = FEST;

  /* What falls on this day.

     `D` is a day object. The month tested is always `masaFestival` — the amānta
     month — whatever reckoning the reader is displaying. The TITHI tested is the
     one prevailing in the entry's own window: sunrise unless `when` says
     otherwise, because for a third of these the window is the rule rather than a
     refinement to it.

     `close` marks a day a reader should not take on trust: the tithi changes
     inside the qualifying window, so a different sunrise convention or a
     neighbouring city could name a different day. For the pradoṣa-qualified
     festivals that is exactly where published almanacs part company, and saying
     "close" is more honest than printing one answer with the confidence of an
     unambiguous one.

     An entry with `after` is relative to another entry, so it is resolved by
     asking the previous day whether that one fell then. One day of lookback,
     deliberately: anything deeper would be a dependency graph, and nothing here
     needs one. */
  /* Did the Sun's entry into the named sign land on this day's observance?

     A saṃkrānti is an instant, and the observance is not simply "the day
     containing it". The puṇya-kāla is daylight, so an ingress that happens
     during the day belongs to that day, and one that happens after sunset is
     observed at the next sunrise. Measured across 2024–2027, where the ingress
     falls at 02:45, 08:54, 15:04 and 21:05 respectively, that rule gives 15, 14,
     14 and 15 January — the four published dates. Attributing the instant to
     whichever Hindu day contains it gets 2024 and 2027 wrong, because a 02:45
     ingress belongs to the Hindu day that began the previous morning. */
  function solarHit(D, sign) {
    if (D.sankranti && D.sankranti.sign === sign)
      return D.sankranti.ms >= D.sunrise && D.sankranti.ms <= D.sunset;
    /* or the ingress was in the night just ended, after yesterday's sunset */
    var prev = NP.day(D.sunrise - 12 * 3600000, D.place, { month: true });
    if (prev && prev.sankranti && prev.sankranti.sign === sign &&
        prev.sunset != null && prev.sankranti.ms > prev.sunset) return true;
    return false;
  }

  /* Was the tithi this rule names SKIPPED — never covering a sunrise at all?

     Caitra śukla pratipadā does not cover a sunrise anywhere in 2026: the
     amāvāsyā names 19 March and dvitīyā names the 20th, and pratipadā begins and
     ends in between. A tithi test alone therefore finds no Ugādi in 2026 at all,
     which is worse than finding the wrong day. The standard treatment is that
     the observance falls on the day whose sunrise carries the FOLLOWING tithi,
     which is the 20th.

     Detected rather than assumed: this day's sunrise tithi is one past the
     target, and the previous day's was one before it, so the target fell wholly
     between two sunrises. */
  function skippedInto(D, target) {
    if (D.at.tithi.i !== (target + 1) % 30) return false;
    var prev = NP.day(D.sunrise - 12 * 3600000, D.place, {});
    if (!prev || !prev.at) return false;
    return prev.at.tithi.i === (target + 29) % 30;
  }

  function matches(D, f) {
    if (f.after) return false;                 /* resolved separately, below */
    var mi = NP.masaIdx(D.masaFestival);
    if (f.solar != null) return solarHit(D, f.solar);
    if (f.span) return NP.spanCovers(D, f.t) && mi === f.m;
    var q = f.when ? NP.tithiAt(D, f.when) : null;
    if (f.when && !q) return false;            /* the window does not exist today */
    var ti = q ? q.i : D.at.tithi.i;
    if (f.anyMonth) return f.t.indexOf(ti) >= 0;
    if (mi !== f.m) return false;
    if (ti === f.t) return true;
    /* the kṣaya case, for sunrise-named observances only: a window-qualified
       rule asks about a specific moment and cannot be satisfied by a tithi that
       never existed at it */
    return !f.when && skippedInto(D, f.t);
  }
  function closeness(D, f) {
    if (f.when) {
      var q = NP.tithiAt(D, f.when);
      if (q && q.changes)
        return { close: true, why: "the tithi changes during " + f.when };
      /* THE STRADDLE. The case that actually divides published almanacs is not
         this day being marginal but the NEXT one also being a candidate: when
         the named tithi still covers part of tomorrow's window, two dṛk-gaṇita
         almanacs can pick different days and both be defensible.

         Dīvālī 2024 is the example. The amāvāsyā covers the whole of 31 October's
         pradoṣa and ends part-way through 1 November's, so this rule names the
         31st — which is the day most of India observed — while Drik Panchang
         named the 1st. That is a divergence between conventions, not an error in
         either, and the only honest thing a page can do is say so. */
      if (q) {
        var nxt = NP.day(D.sunrise + 30 * 3600000, D.place, { ends: true });
        if (nxt) {
          var q2 = NP.tithiAt(nxt, f.when);
          if (q2 && (q2.from === f.t || q2.to === f.t || q2.i === f.t))
            return { close: true,
                     why: "the tithi straddles two " + f.when +
                          " windows, so published almanacs may name either day" };
        }
      }
      return { close: false, why: null };
    }
    if (D.at.tithi.ends != null) {
      var gap = D.at.tithi.ends - D.sunrise;
      if (gap < 2 * 3600000)
        return { close: true, why: "the tithi ends within two hours of sunrise" };
    }
    if (skippedInto(D, f.t))
      return { close: true,
               why: "the named tithi covered no sunrise (kṣaya), so the " +
                    "observance moves to the following tithi's day" };
    return { close: false, why: null };
  }
  var BY_KEY = {};
  FEST.forEach(function (f) { BY_KEY[f.key] = f; });

  NP.festivalsOn = function (D, opts) {
    opts = opts || {};
    if (!D || !D.at) return [];
    var out = [];

    FEST.forEach(function (f) {
      if (f.after) return;
      if (!matches(D, f)) return;
      if (f.minor && !opts.minor) return;
      var c = closeness(D, f);
      out.push({
        key: f.key, name: f.name, rule: f.rule, note: f.note || null,
        source: f.source, contested: !!f.contested, minor: !!f.minor,
        when: f.when || "sunrise", close: c.close, closeWhy: c.why
      });
    });

    /* the relative entries: did the one they follow fall yesterday? */
    FEST.forEach(function (f) {
      if (!f.after || !BY_KEY[f.after]) return;
      if (f.minor && !opts.minor) return;
      var prev = NP.day(D.sunrise - 12 * 3600000, D.place,
                        { ends: true, month: true });
      if (!prev || !matches(prev, BY_KEY[f.after])) return;
      var c = closeness(prev, BY_KEY[f.after]);
      out.push({
        key: f.key, name: f.name, rule: f.rule, note: f.note || null,
        source: f.source, contested: !!f.contested, minor: !!f.minor,
        when: "relative", close: c.close, closeWhy: c.why
      });
    });
    /* An adhika month carries no festivals: the rule is that they fall in the
       śuddha month, the second of the pair. Stated rather than silently dropped,
       so a reader looking for Dīvālī in an adhika Kārtika is told why. */
    if (D.monthKind === "adhika") {
      /* Only the MONTH-SPECIFIC observances move to the śuddha month. The
         recurring tithi markers — ekādaśī, pūrṇimā, amāvāsyā, saṅkaṣṭī — happen
         in an adhika month like any other, and an adhika month carries an extra
         pair of ekādaśīs precisely because it exists. The first version of this
         filter dropped everything non-minor and so deleted three ekādaśīs from
         2026, which showed up as a count of 20 where the tithi tally said 23. */
      out = out.filter(function (f) { return f.minor || BY_KEY[f.key].anyMonth; });
      out.push({ key: "adhika", name: "Adhika māsa — no festivals",
                 rule: "A lunar month with no solar ingress is intercalary. It " +
                       "takes the name of the following month; the first of the " +
                       "pair is adhika and the second śuddha, and the festivals " +
                       "fall in the śuddha month.",
                 source: "Standard lunisolar intercalation rule.",
                 contested: false, minor: false, informational: true });
    }
    return out;
  };
})();
