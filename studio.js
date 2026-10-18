/* ===== studio.js — what is worth posting, and the picture to post with it ===

   WHY THIS PAGE EXISTS. Everything else here answers a question the reader
   brings. This one asks the question: given today and a place, what is actually
   happening in the sky that is worth saying something about — and then hands
   over the caption and the image.

   The hard part of posting regularly is not making a picture. It is deciding
   what to make a picture OF, every day, without repeating yourself and without
   making anything up. That decision can be computed, because the sky is doing
   specific things on specific days and this project already knows what they are:
   the same ephemeris the chart report uses, the same festival rules the calendar
   shows, the same pañcāṅga the now page prints.

   WHAT IT WILL NOT DO. It writes no predictions. Not "Mercury retrograde will
   disrupt your communication" — the site does not make deterministic claims, and
   a caption is not exempt from that because it is short. What it writes is what
   is happening and what the tradition says the thing IS: the rule, the span, the
   number, the distinction people get wrong. That is also, as it happens, better
   content than a horoscope, because it is checkable and nobody else is doing it.

   Every figure in every caption is computed at the moment it is written. Nothing
   is from a table, so nothing can go stale, and the caption and the image cannot
   disagree with each other because they are built from one object. */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var NP = null;

  var S = {
    date: null,            /* {y,m,d} */
    place: null,
    lang: "en",
    ratio: "4:5",
    horizon: 10            /* days of lookahead for "coming up" */
  };

  var RATIOS = {
    "4:5":  { w: 1080, h: 1350, label: "Feed post 4:5" },
    "1:1":  { w: 1080, h: 1080, label: "Square 1:1" },
    "9:16": { w: 1080, h: 1920, label: "Story / Reel 9:16" }
  };

  var RASHI = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
    "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var RASHI_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला",
    "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"];
  var GRAHA_HI = { Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध",
    Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  /* The nakṣatra's lord and presiding deity, which is the most reliably
     interesting thing to say about an ordinary day — it changes every day, it is
     classical, and almost nobody posts it. Deity names are the standard ones. */
  var NAK_LORD = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter",
    "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu",
    "Jupiter", "Saturn", "Mercury", "Ketu", "Venus", "Sun", "Moon", "Mars",
    "Rahu", "Jupiter", "Saturn", "Mercury"];
  var NAK_DEITY = ["Aśvinī Kumāras", "Yama", "Agni", "Brahmā/Prajāpati", "Soma",
    "Rudra", "Aditi", "Bṛhaspati", "Sarpas", "Pitṛs", "Bhaga", "Aryaman",
    "Savitṛ", "Tvaṣṭṛ", "Vāyu", "Indrāgnī", "Mitra", "Indra", "Nirṛti",
    "Āpas", "Viśvedevāḥ", "Viṣṇu", "Vasus", "Varuṇa", "Aja Ekapāda",
    "Ahir Budhnya", "Pūṣan"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function hi() { return S.lang === "hi"; }
  function rashi(i) { return hi() ? RASHI_HI[i] : RASHI[i]; }
  function graha(n) { return hi() ? (GRAHA_HI[n] || n) : NP.grahaSa(n); }
  function eraOf(D) {
    return D.samvat.vikrama + (hi() ? " विक्रम संवत्" : " Vikrama Saṃvat");
  }
  function dayMs() {
    return Date.UTC(S.date.y, S.date.m - 1, S.date.d, 12, 0, 0) -
           (S.place.tz || 0) * 3600000;
  }
  function clockAt(ms) {
    var d = new Date(ms + (S.place.tz || 0) * 3600000);
    return (d.getUTCHours() < 10 ? "0" : "") + d.getUTCHours() + ":" +
           (d.getUTCMinutes() < 10 ? "0" : "") + d.getUTCMinutes();
  }
  function dateAt(ms) {
    var d = new Date(ms + (S.place.tz || 0) * 3600000);
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
  }
  /* Calendar days apart at the chosen place, not 24-hour chunks rounded.
     The Sun entering Tulā at 19:48 on the day you are looking at is "today",
     but it is 0.56 of a day after that morning's sunrise, and rounding gave
     "tomorrow" — so the same ingress was announced as today by one card and
     tomorrow by another. Whether something is today is a question about the
     date, so it is answered with dates. */
  function localDay(ms) {
    var d = new Date(ms + (S.place.tz || 0) * 3600000);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  function daysBetween(a, b) { return Math.round((localDay(b) - localDay(a)) / 86400000); }
  function whenWord(n) {
    if (hi()) return n === 0 ? "आज" : n === 1 ? "कल" : n + " दिन में";
    return n === 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days";
  }

  /* ===== which animation, and set to what =================================
     A scene name alone is not a recommendation. The same scene is unreadable at
     one span and obvious at another: a retrograde loop needs months on screen
     before the loop exists at all, while a tithi wheel over a year is a blur.
     So each idea carries the settings that make its scene say the thing it was
     chosen to say, the reason is shown next to the button, and the link APPLIES
     them — because telling someone to set five controls themselves turns one
     click into five, and most people will not bother.

     Only chart-free scenes appear here. The Studio is used without a birth
     chart, and a scene it cannot open is a scene it cannot recommend. */
  var REC = {
    station: { scene: "retro", span: "9m", speed: "1/6", ratio: "9:16", safe: 1,
      why: { en: "The retrograde loop only exists across months — nine of them " +
                 "put the whole arc on screen, and a sixth speed is slow enough " +
                 "to follow the turn without losing the viewer.",
             hi: "वक्री चाप महीनों में ही बनता है — नौ मास पूरा चाप दिखाते हैं, " +
                 "और 1/6 गति मोड़ को पढ़ने भर की धीमी है।" } },
    ingress: { scene: "orrery", span: "12m", speed: "1/4", ratio: "9:16", safe: 1,
      why: { en: "A year of the orrery shows the graha crossing the sign " +
                 "boundary in the context of everything else moving, which is " +
                 "what makes an ingress look like an event rather than a date.",
             hi: "एक वर्ष का ओरेरी राशि-संक्रमण को शेष गतियों के सन्दर्भ में " +
                 "दिखाता है — तभी प्रवेश घटना लगता है, केवल तिथि नहीं।" } },
    syzygy: { scene: "tithi", span: "1m", speed: "1/8", ratio: "9:16", safe: 1,
      why: { en: "One lunar month is exactly one full cycle of the wheel, so the " +
                 "loop closes where it began — and an eighth speed holds each " +
                 "tithi on screen long enough to read its name.",
             hi: "एक चान्द्र मास चक्र का पूरा एक फेरा है, इसलिए लूप वहीं बन्द " +
                 "होता है जहाँ खुला था; 1/8 गति हर तिथि का नाम पढ़ने देती है।" } },
    sankranti: { scene: "sun", span: "12m", speed: "1/6", ratio: "9:16", safe: 1,
      why: { en: "The Sun scene over a year shows the sidereal sign changing " +
                 "under a body that never goes retrograde and never has a " +
                 "phase — the cleanest way to show a purely solar event.",
             hi: "वर्ष भर का सूर्य दृश्य निरयन राशि बदलते दिखाता है — वह ग्रह " +
                 "जो न वक्री होता है न जिसकी कला होती है।" } },
    festival: { scene: "panchanga", span: "1m", speed: "1/10", ratio: "9:16", safe: 1,
      why: { en: "The pañcāṅga scene names all five limbs as they turn, so the " +
                 "rule behind the festival is visible rather than asserted. A " +
                 "tenth speed is slow enough to read every one.",
             hi: "पंचांग दृश्य पाँचों अंग नाम सहित दिखाता है, जिससे पर्व का " +
                 "नियम दिखता है, केवल कहा नहीं जाता। 1/10 गति सब पढ़ने देती है।" } },
    nakshatra: { scene: "nakwalk", span: "1m", speed: "1/8", ratio: "9:16", safe: 1,
      why: { en: "The nakṣatra walk steps the Moon through all twenty-seven in " +
                 "one month, with the four pādas drawn inside the lit one — " +
                 "which is the whole structure Viṃśottarī rests on.",
             hi: "नक्षत्र-भ्रमण एक मास में चन्द्र को सत्ताईसों में घुमाता है, " +
                 "और चार पाद भी दिखाता है — विंशोत्तरी इसी पर टिकी है।" } },
    tithi: { scene: "tithi", span: "1m", speed: "1/10", ratio: "9:16", safe: 1,
      why: { en: "One month of the tithi wheel shows the uneven lengths that " +
                 "cause a doubled tithi in the first place.",
             hi: "एक मास का तिथि-चक्र उन असमान अवधियों को दिखाता है जिनसे " +
                 "उपरि तिथि बनती है।" } },
    panchanga: { scene: "panchanga", span: "1m", speed: "1/10", ratio: "9:16", safe: 1,
      why: { en: "A month of the pañcāṅga scene is the standard daily post: all " +
                 "five limbs turning, named, at a speed that can be read.",
             hi: "एक मास का पंचांग दृश्य नित्य पोस्ट के लिए है — पाँचों अंग, " +
                 "नाम सहित, पढ़ने योग्य गति पर।" } },
    speeds: { scene: "speeds", span: "12y", speed: "1/4", ratio: "9:16", safe: 1,
      why: { en: "Twelve years is long enough for Śani to show barely a third of " +
                 "a lap while the Moon runs a hundred and fifty — which is the " +
                 "argument the scene exists to make.",
             hi: "बारह वर्ष में शनि एक तिहाई चक्कर भी नहीं करता जबकि चन्द्र " +
                 "डेढ़ सौ — यही इस दृश्य का कथन है।" } },
    sunarc: { scene: "sunarc", span: "12m", speed: "1/4", ratio: "9:16", safe: 1,
      why: { en: "A year of sunrises for this exact place. It looks almost flat " +
                 "near the equator and dramatic far from it, which is why a " +
                 "pañcāṅga is only valid where it was made.",
             hi: "इसी स्थान के वर्ष भर के सूर्योदय। भूमध्य के पास लगभग सपाट, " +
                 "दूर नाटकीय — इसीलिए पंचांग स्थान-सापेक्ष है।" } }
  };
  var SCENE_NAME = { retro: "Retrograde loop", orrery: "Orrery",
    tithi: "Tithi wheel", sun: "Sūrya", panchanga: "Pañcāṅga",
    nakwalk: "Nakṣatra walk", speeds: "Graha speeds",
    sunarc: "Sunrise through the year", nakshatra: "Nakṣatra ring" };
  function sceneName(k) { return SCENE_NAME[k] || k; }
  function moLang(o) { return (hi() && o.hi) ? o.hi : o.en; }
  function recLink(r) {
    return "kundli.html#sky=" + encodeURIComponent(r.scene) +
           "&span=" + r.span + "&speed=" + encodeURIComponent(r.speed) +
           "&ratio=" + encodeURIComponent(r.ratio) + (r.safe ? "&safe=1" : "");
  }
  function recLabel(r) {
    return (hi() ? "सेटिंग: " : "Set to ") + r.span.replace("m", " months")
             .replace("y", " years").replace("d", " days").replace("w", " weeks") +
           " · " + r.speed + "× · " + r.ratio +
           (r.safe ? (hi() ? " · सेफ़ लेआउट" : " · safe layout") : "");
  }

  /* ===== the ideas =========================================================
     Each is {key, rank, hook, body, facts[], tags[]}. `rank` orders them: how
     rare the thing is, and how close. A station is worth more than an ordinary
     Tuesday; a festival outranks both. */
  function ideasFor(D, events) {
    var out = [], base = D.sunrise;

    /* --- festivals, with the rule they rest on --- */
    NP.festivalsOn(D, { minor: false }).forEach(function (f) {
      if (f.informational) return;
      out.push({
        key: "fest-" + f.key, rank: 100,
        hook: hi() ? (f.name + " — आज") : (f.name + " is today"),
        body: hi()
          ? ("यह तिथि से तय होता है, तारीख़ से नहीं। नियम: " + f.rule +
             (f.contested ? " भिन्न पंचांग इस नियम को अलग ढंग से लगाते हैं।" : ""))
          : ("It is fixed by the tithi, not by the date — which is why it moves " +
             "through the Gregorian year. The rule: " + f.rule +
             (f.contested ? " Published almanacs apply this one differently, so " +
                            "other calendars may place it a day either side." : "")),
        facts: [
          lbl("Tithi") + ": " + D.at.tithi.paksha + " " + D.at.tithi.name,
          lbl("Māsa") + ": " + masaBoth(D) + " (amānta)",
          lbl("Rule") + ": " + f.rule
        ],
        tags: ["festival", f.key],
        rec: REC.festival,
        headline: f.name,
        sub: D.at.tithi.paksha + " " + D.at.tithi.name
      });
    });

    /* --- a graha turning, which is the single most postable kind of event --- */
    events.forEach(function (e) {
      var n = daysBetween(base, e.ms);
      if (n < -1 || n > S.horizon) return;
      if (e.kind === "retrograde" || e.kind === "direct") {
        var turning = e.kind === "retrograde";
        out.push({
          key: e.kind + "-" + e.graha + "-" + e.ms, rank: 90 - Math.abs(n),
          hook: hi()
            ? (graha(e.graha) + " " + (turning ? "वक्री" : "मार्गी") + " — " + whenWord(n))
            : (graha(e.graha) + " turns " + (turning ? "retrograde" : "direct") +
               " " + whenWord(n)),
          body: hi()
            ? ((turning ? "वक्री" : "मार्गी") + " का अर्थ ग्रह का पीछे जाना नहीं है। " +
               "यह हमारी दृष्टि का प्रभाव है — पृथ्वी और ग्रह की गति के अन्तर से " +
               "आकाश में ग्रह कुछ समय पीछे खिसकता दिखता है। " +
               graha(e.graha) + " " + dateAt(e.ms) + " को " + clockAt(e.ms) +
               " बजे " + rashi(e.sign) + " में स्थिर होता है।")
            : ("Retrograde is not the planet moving backwards. It is a line-of-" +
               "sight effect: we are on a moving platform, and when Earth and " +
               "the planet pass each other the planet appears to slide back " +
               "against the stars for a while. " + graha(e.graha) + " stations " +
               "in " + rashi(e.sign) + " on " + dateAt(e.ms) + " at " +
               clockAt(e.ms) + ", " + (S.place.n) + " time."),
          facts: [
            lbl("Station") + ": " + dateAt(e.ms) + " " + clockAt(e.ms),
            lbl("Sign") + ": " + rashi(e.sign),
            lbl("Computed for") + ": " + S.place.n
          ],
          tags: ["retrograde", e.graha.toLowerCase()],
          rec: REC.station,
          headline: graha(e.graha) + (hi() ? (turning ? " वक्री" : " मार्गी")
                                           : (turning ? " turns retrograde" : " turns direct")),
          sub: dateAt(e.ms) + " · " + clockAt(e.ms) + " · " + rashi(e.sign)
        });
      }
      /* The Sun's ingress and the saṅkrānti are one event under two names, and
         the saṅkrānti card says it better — with the solar/lunar distinction
         that makes it worth posting. Only one of them may speak. */
      if (e.kind === "ingress" && e.graha === "Sun" && D.sankranti &&
          Math.abs(D.sankranti.ms - e.ms) < 3600000) return;
      if (e.kind === "ingress" && e.graha !== "Moon") {
        out.push({
          key: "ing-" + e.graha + "-" + e.ms, rank: 70 - Math.abs(n),
          hook: hi()
            ? (graha(e.graha) + " " + rashi(e.sign) + " में — " + whenWord(n))
            : (graha(e.graha) + " enters " + rashi(e.sign) + " " + whenWord(n)),
          body: hi()
            ? ("यह निरयन (सायन नहीं) राशि-प्रवेश है, लाहिड़ी अयनांश के अनुसार — " +
               "इसीलिए तिथि उस तारीख़ से भिन्न होती है जो सायन पद्धति देती है। " +
               dateAt(e.ms) + ", " + clockAt(e.ms) + "।")
            : ("This is the SIDEREAL ingress — measured against the stars, with " +
               "the Lahiri ayanāṃśa — not the tropical one. The two differ by " +
               "about 24 degrees, which is why this date is not the date a " +
               "Western ephemeris gives. " + dateAt(e.ms) + ", " + clockAt(e.ms) + "."),
          facts: [
            lbl("Enters") + ": " + rashi(e.sign) +
              (e.from != null ? " (" + (hi() ? "से " : "from ") + rashi(e.from) + ")" : ""),
            lbl("When") + ": " + dateAt(e.ms) + " " + clockAt(e.ms),
            lbl("Zodiac") + ": sidereal, Lahiri ayanāṃśa"
          ],
          tags: ["ingress", e.graha.toLowerCase()],
          rec: REC.ingress,
          headline: graha(e.graha) + " → " + rashi(e.sign),
          sub: dateAt(e.ms) + " · " + clockAt(e.ms)
        });
      }
      if (e.kind === "newmoon" || e.kind === "fullmoon") {
        var full = e.kind === "fullmoon";
        out.push({
          key: e.kind + "-" + e.ms, rank: 60 - Math.abs(n),
          hook: hi() ? ((full ? "पूर्णिमा" : "अमावस्या") + " — " + whenWord(n))
                     : ((full ? "Pūrṇimā" : "Amāvāsyā") + " " + whenWord(n)),
          body: hi()
            ? ("तिथि चन्द्र और सूर्य के अन्तर का 12° खण्ड है — दिन का नहीं। " +
               "इसीलिए तिथि कभी दो सूर्योदय तक चलती है और कभी एक भी नहीं छूती। " +
               "यह क्षण " + dateAt(e.ms) + ", " + clockAt(e.ms) + " का है।")
            : ("A tithi is a 12° step of the Moon's elongation from the Sun — " +
               "not a day. The exact moment is " + dateAt(e.ms) + " at " +
               clockAt(e.ms) + ". Because a tithi runs about 23½ hours but can " +
               "stretch to 26, it sometimes covers two sunrises and names two " +
               "days, and sometimes covers none at all."),
          facts: [
            lbl("Exact") + ": " + dateAt(e.ms) + " " + clockAt(e.ms),
            lbl("Māsa") + ": " + masaBoth(D) + " (amānta)",
            lbl("Elongation") + ": " + (full ? "180°" : "0°"),
            lbl("Computed for") + ": " + S.place.n
          ],
          tags: [full ? "purnima" : "amavasya", "tithi"],
          rec: REC.syzygy,
          headline: full ? (hi() ? "पूर्णिमा" : "Pūrṇimā") : (hi() ? "अमावस्या" : "Amāvāsyā"),
          sub: dateAt(e.ms) + " · " + clockAt(e.ms)
        });
      }
    });

    /* --- the saṃkrānti, if the Sun changed sign in this very day --- */
    if (D.sankranti) {
      out.push({
        key: "sank-" + D.sankranti.sign, rank: 85,
        hook: hi() ? (rashi(D.sankranti.sign) + " संक्रान्ति — आज")
                   : (rashi(D.sankranti.sign) + " Saṅkrānti is today"),
        body: hi()
          ? ("संक्रान्ति सौर घटना है, चान्द्र नहीं — इसीलिए यह ग्रेगोरियन तिथि के " +
             "आसपास लगभग स्थिर रहती है, जबकि चान्द्र पर्व वर्ष भर खिसकते हैं। " +
             "सूर्य " + clockAt(D.sankranti.ms) + " बजे प्रवेश करता है।")
          : ("A saṅkrānti is a SOLAR event, not a lunar one — which is why it " +
             "sits near a fixed Gregorian date every year while the lunar " +
             "festivals move across the calendar. The Sun enters at " +
             clockAt(D.sankranti.ms) + "."),
        facts: [
          lbl("Sun enters") + ": " + rashi(D.sankranti.sign),
          lbl("Exact") + ": " + clockAt(D.sankranti.ms),
          lbl("Zodiac") + ": sidereal, Lahiri ayanāṃśa"
        ],
        tags: ["sankranti"],
        rec: REC.sankranti,
        headline: rashi(D.sankranti.sign) + (hi() ? " संक्रान्ति" : " Saṅkrānti"),
        sub: clockAt(D.sankranti.ms)
      });
    }

    /* --- the day's own oddities, which make the best "did you know" posts --- */
    if (D.at.tithi.upari) {
      out.push({
        key: "upari", rank: 80,
        hook: hi() ? "आज दो तिथियाँ हैं" : "Today carries two tithis",
        body: hi()
          ? ("एक तिथि लगभग 23½ घण्टे की होती है, पर चन्द्र की गति महीने भर में " +
             "लगभग 15% बदलती है। जब दो छोटी तिथियाँ एक ही सूर्योदय-दिन में पूरी " +
             "हो जाती हैं, मुद्रित पंचांग दूसरी को उपरि कहते हैं — आज " +
             D.at.tithi.upari.name + " उपरि है।")
          : ("A tithi averages about 23½ hours, but the Moon's speed varies by " +
             "some 15% over a month. When two short ones complete inside a " +
             "single sunrise-to-sunrise day, printed almanacs mark the second " +
             "<i>upari</i>. Today that is " + D.at.tithi.upari.name + ", ending " +
             clockAt(D.at.tithi.upari.ends) + "."),
        facts: [
          lbl("First") + ": " + D.at.tithi.name + " → " + clockAt(D.at.tithi.ends),
          lbl("Then") + ": " + D.at.tithi.upari.name + " (upari) → " +
            clockAt(D.at.tithi.upari.ends),
          lbl("Why") + ": the Moon's speed varies ~15% over a month",
          lbl("Māsa") + ": " + masaBoth(D) + " (amānta)"
        ],
        tags: ["tithi", "panchang"],
        rec: REC.tithi,
        headline: hi() ? "दो तिथियाँ, एक दिन" : "Two tithis, one day",
        sub: D.at.tithi.name + " + " + D.at.tithi.upari.name + " upari",
        rec: REC.tithi
      });
    }

    /* --- the nakṣatra, which changes daily and is the reliable everyday post --- */
    var ni = D.at.nak.i;
    out.push({
      key: "nak-" + ni, rank: 40,
      hook: hi() ? ("आज का नक्षत्र — " + D.at.nak.name)
                 : ("Today's nakṣatra is " + D.at.nak.name),
      body: hi()
        ? ("स्वामी " + graha(NAK_LORD[ni]) + ", देवता " + NAK_DEITY[ni] + "। " +
           "चन्द्र अभी पाद " + D.at.nak.pada + " में है; नक्षत्र " +
           clockAt(D.at.nak.ends) + " तक रहता है। " +
           "विंशोत्तरी दशा का क्रम इसी नक्षत्र-स्वामी से आरम्भ होता है।")
        : ("Its lord is " + NP.grahaSa(NAK_LORD[ni]) + " and its deity " +
           NAK_DEITY[ni] + ". The Moon is in pāda " + D.at.nak.pada +
           " and the nakṣatra runs until " + clockAt(D.at.nak.ends) + ". " +
           "The nakṣatra the Moon occupies at birth is what starts the " +
           "Viṃśottarī daśā sequence — which is why these 27 divisions carry " +
           "so much weight in the system."),
      facts: [
        lbl("Nakṣatra") + ": " + D.at.nak.name + " · pāda " + D.at.nak.pada,
        lbl("Lord") + ": " + NP.grahaSa(NAK_LORD[ni]),
        lbl("Deity") + ": " + NAK_DEITY[ni],
        lbl("Ends") + ": " + clockAt(D.at.nak.ends),
        lbl("Māsa") + ": " + masaBoth(D) + " (amānta)"
      ],
      tags: ["nakshatra", "panchang"],
      rec: REC.nakshatra,
      headline: D.at.nak.name,
      sub: (hi() ? "पाद " : "pāda ") + D.at.nak.pada + " · " +
           NP.grahaSa(NAK_LORD[ni]),
      rec: REC.nakshatra
    });

    /* --- and the pañcāṅga itself, which is always true and always postable --- */
    out.push({
      key: "panchanga", rank: 30,
      hook: hi() ? ("आज का पंचांग — " + dateAt(D.sunrise))
                 : ("Today's pañcāṅga — " + dateAt(D.sunrise)),
      body: hi()
        ? ("पाँच अंग: तिथि, नक्षत्र, योग, करण और वार। दिन सूर्योदय से आरम्भ होता " +
           "है, मध्यरात्रि से नहीं — " + clockAt(D.sunrise) + " बजे " +
           S.place.n + " में। यही कारण है कि पंचांग उसी स्थान के लिए मान्य है " +
           "जिसके लिए वह बना है।")
        : ("The five limbs: tithi, nakṣatra, yoga, karaṇa and vāra. The day " +
           "begins at sunrise, not midnight — " + clockAt(D.sunrise) + " here — " +
           "and the tithi running AT sunrise is what names the day. That is why " +
           "a pañcāṅga is only valid for the place it was computed for: two " +
           "cities can genuinely disagree about which day an ekādaśī falls on."),
      facts: [
        lbl("Tithi") + ": " + tithiBoth(D),
        lbl("Māsa") + ": " + masaBoth(D) + " · " + eraOf(D),
        lbl("Nakṣatra") + ": " + D.at.nak.name + " pāda " + D.at.nak.pada,
        lbl("Yoga") + ": " + D.at.yoga.name,
        lbl("Karaṇa") + ": " + D.at.karana.name,
        lbl("Vāra") + ": " + D.vara,
        lbl("Sunrise") + ": " + clockAt(D.sunrise) + " · " + S.place.n
      ],
      tags: ["panchang", "vedicastrology"],
      rec: REC.panchanga,
      headline: D.at.tithi.paksha + " " + D.at.tithi.name,
      sub: D.at.nak.name + " · " + D.vara,
      rec: REC.panchanga
    });

    /* Two evergreens, ranked below everything that is actually happening.
       They exist so a quiet week still has something worth making — and both
       teach a thing that is true on any date, which is what evergreen means. */
    out.push({
      key: "speeds", rank: 20,
      hook: hi() ? "शनि को तीस वर्ष क्यों लगते हैं"
                 : "Why Śani takes thirty years",
      body: hi()
        ? ("नवों ग्रह एक ही पथ पर, अपनी-अपनी वास्तविक गति से। बारह वर्ष में " +
           "चन्द्र लगभग डेढ़ सौ चक्कर लगाता है और शनि एक तिहाई भी नहीं। " +
           "तालिका यह तथ्य बताती है; दौड़ यह दिखाती है।")
        : ("Nine grahas on one track, each at its own true rate. Over twelve " +
           "years the Moon runs about a hundred and fifty laps while Saturn " +
           "has not finished a third of one. Everyone has read the periods; " +
           "almost nobody has watched them happen at the same time."),
      facts: [
        lbl("Sidereal periods") + ": Moon 27.3 d · Sun 365.3 d · Jupiter 11.9 y · Saturn 29.5 y",
        lbl("Māsa") + ": " + masaBoth(D) + " (amānta)",
        lbl("Zodiac") + ": sidereal, Lahiri ayanāṃśa"
      ],
      tags: ["grahas", "jyotish"],
      headline: hi() ? "शनि को तीस वर्ष क्यों" : "Why Śani takes thirty years",
      sub: hi() ? "नौ ग्रह, एक पथ" : "nine grahas, one track",
      rec: REC.speeds
    });
    out.push({
      key: "sunarc", rank: 18,
      hook: hi() ? ("वर्ष भर सूर्योदय कैसे बदलता है — " + S.place.n)
                 : ("What sunrise does over a year in " + S.place.n),
      body: hi()
        ? ("पंचांग का प्रत्येक अंक सूर्योदय से निकलता है, और सूर्योदय स्थान पर " +
           "निर्भर है। भूमध्य के पास वक्र लगभग सपाट रहता है, दूर नाटकीय — " +
           "इसीलिए पंचांग उसी स्थान के लिए मान्य है जिसके लिए बना है।")
        : ("Every figure in a pañcāṅga descends from sunrise, and sunrise " +
           "depends on where you stand. The curve is nearly flat near the " +
           "equator and dramatic far from it — which is the whole reason a " +
           "pañcāṅga is only valid for the place it was computed for."),
      facts: [
        lbl("Sunrise") + ": " + clockAt(D.sunrise) + " · " + S.place.n,
        lbl("Sunset") + ": " + clockAt(D.sunset),
        lbl("Convention") + ": " + D.riseConvLabel
      ],
      tags: ["sunrise", "panchang"],
      headline: hi() ? "सूर्योदय, वर्ष भर" : "Sunrise, across a year",
      sub: S.place.n,
      rec: REC.sunarc
    });

    out.sort(function (a, b) { return b.rank - a.rank; });
    return out;
  }
  /* The lunar month, named both ways. On a card for an Indian audience the
     Devanāgarī is what reads at a glance; the transliteration is what a
     Latin-reading student needs. Showing one without the other serves half the
     readers, so both go on, and in Hindi the Devanāgarī leads. */
  function masaBoth(D) {
    var iast = D.masa.amantaIAST, dev = NP.masaHi(D.masa.amanta);
    if (!dev) return iast;
    return hi() ? (dev + " (" + iast + ")") : (iast + " · " + dev);
  }
  function tithiBoth(D) {
    var en = D.at.tithi.paksha + " " + D.at.tithi.name;
    var dev = NP.pakshaHi(D.at.tithi.paksha) + " " + NP.tithiHi(D.at.tithi.i);
    return hi() ? (dev + " (" + en + ")") : (en + " · " + dev);
  }

  function lbl(en) {
    var H = { Tithi: "तिथि", "Māsa": "मास", Rule: "नियम", Station: "स्थिर",
      Sign: "राशि", "Computed for": "गणना", Enters: "प्रवेश", When: "समय",
      Zodiac: "राशिचक्र", Exact: "ठीक समय", Elongation: "अन्तर",
      "Sun enters": "सूर्य प्रवेश", First: "पहली", Then: "फिर", Why: "कारण",
      "Nakṣatra": "नक्षत्र", Lord: "स्वामी", Deity: "देवता", Ends: "समाप्ति",
      Yoga: "योग", "Karaṇa": "करण", "Vāra": "वार", Sunrise: "सूर्योदय" };
    return hi() ? (H[en] || en) : en;
  }

  /* ===== the caption =======================================================
     Hook, body, the numbers, then tags. Written as one block to copy whole,
     because that is how it is used. The handle and the "computed, not looked
     up" line are the point of difference and go in every one. */
  function captionOf(idea, D) {
    var L = [];
    L.push(idea.hook);
    L.push("");
    L.push(idea.body.replace(/<[^>]+>/g, ""));
    L.push("");
    idea.facts.forEach(function (f) { L.push("• " + f); });
    L.push("");
    L.push(hi()
      ? ("गणना ब्राउज़र में ही — निरयन राशिचक्र, लाहिड़ी अयनांश, " +
         "सूर्योदय: उच्च बिम्ब + 34′ वक्रीभवन। स्थान: " + S.place.n + "。")
      : ("Computed, not looked up: sidereal zodiac, Lahiri ayanāṃśa, sunrise " +
         "taken as the upper limb with 34′ refraction. Place: " + S.place.n + "."));
    L.push("");
    L.push(tagLine(idea));
    return L.join("\n");
  }
  function tagLine(idea) {
    var base = ["jyotish", "vedicastrology", "panchang", "sidereal",
                "bphs", "nirayana"];
    var all = idea.tags.concat(base).filter(function (t, i, a) {
      return t && a.indexOf(t) === i;
    });
    return all.slice(0, 12).map(function (t) {
      return "#" + String(t).replace(/[^A-Za-z0-9]/g, "");
    }).join(" ");
  }

  /* ===== the image =========================================================
     One card, drawn on a canvas at full export resolution, in the brand's own
     colours. Deliberately plain: a headline, the numbers under it, the date and
     place, the handle. The content is the differentiator, so the design stays
     out of its way — and everything on it came from the day object, so the
     picture cannot contradict the caption beside it. */
  var MARKIMG = null;
  function markImage(cb) {
    if (MARKIMG) return cb(MARKIMG);
    var im = new Image();
    im.onload = function () { MARKIMG = im; cb(im); };
    im.onerror = function () { cb(null); };
    im.src = "assets/brand/mark.svg";
    return null;
  }
  function wrap(c, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function drawCard(cv, idea, D) {
    var R = RATIOS[S.ratio], W = R.w, H = R.h;
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    var navy = "#141a33", navy2 = "#232a4d", gold = "#c9a24b",
        pale = "#e7d19a", ink = "#f4f2ea", dim = "#9aa0c0";
    var SANS = '"Inter","Helvetica Neue",system-ui,-apple-system,sans-serif';
    var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
    var pad = W * 0.085;

    var g = c.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, navy2); g.addColorStop(1, navy);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(255,255,255,0.5)";
    for (var i = 0; i < 46; i++) {
      c.globalAlpha = 0.25 + (i % 5) * 0.12;
      c.beginPath();
      c.arc((i * 97.13 % W), (i * 211.7 % H), (i % 3) * 0.6 + 0.7, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = gold; c.fillRect(0, H - 10, W, 10);

    /* --- measure everything first, then place it ------------------------
       The first version stacked downward from the top and left a third of the
       card empty below the facts, with the handle printed over the method
       line. Laying out means knowing the height before choosing the origin, so
       the block is measured, then centred in the space between the kicker and
       the foot. */
    var hSize = W * 0.098, hLines;
    for (var k = 0; k < 24; k++) {
      c.font = "600 " + Math.round(hSize) + "px " + SERIF;
      hLines = wrap(c, idea.headline, W - pad * 2);
      if (hLines.length <= 3) break;
      hSize *= 0.93;
    }
    /* A subtitle that only repeats a fact is noise on a card this size. */
    var subText = idea.sub || "";
    if (subText && idea.facts.some(function (f) {
      return String(f).split(/:\s(.+)/)[1] === subText; })) subText = "";
    var subLines = [];
    if (subText) {
      c.font = "500 " + Math.round(W * 0.040) + "px " + SANS;
      subLines = wrap(c, subText, W - pad * 2).slice(0, 2);
    }
    var maxFacts = S.ratio === "1:1" ? 5 : 7;
    /* A fact whose value is already the headline is a line spent saying the
       same thing twice, which on a card this size is a line that could have
       carried something else. */
    var facts = idea.facts.filter(function (f) {
      return String(f).split(/:\s(.+)/)[1] !== idea.headline;
    }).slice(0, maxFacts);
    var fs = Math.round(W * 0.034);

    var blockH = hLines.length * hSize * 1.06 +
                 (subLines.length ? W * 0.045 + subLines.length * W * 0.052 : 0) +
                 W * 0.045 + 2 + W * 0.055 +
                 facts.length * fs * 1.95;
    var topY = H * 0.145 + W * 0.055;
    var footTop = H - W * 0.20;
    var y = topY + Math.max(0, (footTop - topY - blockH) / 2);

    c.textAlign = "left";
    c.font = "600 " + Math.round(W * 0.030) + "px " + SANS;
    c.fillStyle = pale;
    c.fillText((hi() ? "निरयन" : "NIRAYANA") + "  ·  " +
               dateAt(D.sunrise).toUpperCase(), pad, H * 0.145);

    c.fillStyle = ink;
    c.font = "600 " + Math.round(hSize) + "px " + SERIF;
    hLines.forEach(function (ln) { y += hSize * 1.06; c.fillText(ln, pad, y); });

    if (subLines.length) {
      y += W * 0.045;
      c.font = "500 " + Math.round(W * 0.040) + "px " + SANS;
      c.fillStyle = gold;
      subLines.forEach(function (ln) { c.fillText(ln, pad, y); y += W * 0.052; });
    }

    y += W * 0.045;
    c.fillStyle = "rgba(201,162,75,0.5)";
    c.fillRect(pad, y, W - pad * 2, 2);
    y += W * 0.055;
    facts.forEach(function (f) {
      var parts = String(f).split(/:\s(.+)/);
      c.font = "600 " + fs + "px " + SANS; c.fillStyle = dim;
      c.fillText(parts[0], pad, y);
      var lw = c.measureText(parts[0] + "   ").width;
      c.font = "500 " + fs + "px " + SANS; c.fillStyle = ink;
      wrap(c, parts[1] || "", W - pad * 2 - lw).slice(0, 2).forEach(function (ln, j) {
        c.fillText(ln, pad + lw, y + j * fs * 1.25);
      });
      y += fs * 1.95;
    });

    /* --- the foot: mark, place and method on the left, handle on the right,
       on rows that cannot collide however long the place name is ---------- */
    var mk = W * 0.082, fx = pad, fy = H - W * 0.155;
    if (MARKIMG) { try { c.drawImage(MARKIMG, fx, fy, mk, mk); } catch (e) {} }
    var tx = fx + mk + W * 0.022;
    c.textAlign = "left";
    c.font = "600 " + Math.round(W * 0.030) + "px " + SANS;
    c.fillStyle = ink;
    c.fillText(S.place.n, tx, fy + mk * 0.42);
    c.font = "500 " + Math.round(W * 0.024) + "px " + SANS;
    c.fillStyle = dim;
    c.fillText(hi() ? "ब्राउज़र में गणना — कुछ भी भेजा नहीं जाता"
                    : "computed in the browser · nothing is sent anywhere",
               tx, fy + mk * 0.86);
    c.textAlign = "right";
    c.fillStyle = pale;
    c.font = "600 " + Math.round(W * 0.030) + "px " + SANS;
    c.fillText("@Nirayana.Soft", W - pad, fy + mk * 0.42);
    return cv;
  }

  /* ===== the page ========================================================== */
  function render() {
    var host = $("stcards"); if (!host || !NP) return;
    if (!NP.inRange(S.date.y)) {
      host.innerHTML = '<p class="stnote">' + esc(NP.rangeWhy) + "</p>";
      return;
    }
    host.innerHTML = '<p class="stnote">Reading the sky&hellip;</p>';
    /* Yielded so the "reading" line paints before a second of ephemeris. */
    setTimeout(function () {
      var D = NP.dayOfDate(S.date.y, S.date.m, S.date.d, S.place,
                           { ends: true, month: true });
      if (!D || !D.at) { host.innerHTML = '<p class="stnote">That day could not ' +
        'be computed for this place.</p>'; return; }
      var t0 = D.sunrise - 2 * 86400000, t1 = D.sunrise + S.horizon * 86400000;
      var events = NP.scanEvents(t0, t1, {});
      var ideas = ideasFor(D, events);
      window.__stIdeas = ideas; window.__stDay = D;

      host.innerHTML = ideas.map(function (idea, i) {
        return '<article class="stcard" data-sti="' + i + '">' +
          '<header><span class="strank">' + (i === 0 ? "best today" : "#" + (i + 1)) +
            "</span><h3>" + esc(idea.hook) + "</h3></header>" +
          "<p class=\"stbody\">" + idea.body + "</p>" +
          '<ul class="stfacts">' + idea.facts.map(function (f) {
            return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
          '<p class="sttags">' + esc(tagLine(idea)) + "</p>" +
          '<div class="stact">' +
            '<button type="button" class="stbtn" data-stcopy="' + i + '">Copy caption</button>' +
            '<button type="button" class="stbtn sec" data-stimg="' + i + '">Make the image</button>' +
            (idea.rec ? '<a class="stbtn sec" href="' + recLink(idea.rec) +
              '">Animate &amp; record this</a>' : "") +
            '<span class="stmsg" id="stmsg' + i + '"></span>' +
          "</div>" +
          (idea.rec ? '<p class="strec"><b>' + esc(sceneName(idea.rec.scene)) +
            "</b> &mdash; " + esc(moLang(idea.rec.why)) +
            '<span class="strecset">' + esc(recLabel(idea.rec)) +
            " &mdash; " + (hi() ? "लिंक यही लगा देता है" :
              "the link applies all of it") + "</span></p>" : "") +
          "</article>";
      }).join("");

      host.querySelectorAll("[data-stcopy]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +b.getAttribute("data-stcopy");
          var txt = captionOf(ideas[i], D);
          copy(txt, $("stmsg" + i));
        });
      });
      host.querySelectorAll("[data-stimg]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +b.getAttribute("data-stimg");
          makeImage(ideas[i], D, $("stmsg" + i));
        });
      });
      drawAhead(events, D);
      /* The reel strip and the composer read this page's state, so they are
         rebuilt whenever it changes — otherwise a reader who changes the place
         gets new cards above and reel links still pointing at the old city,
         which is the kind of inconsistency nothing on screen would reveal. */
      try { if (window.__ncRefresh) window.__ncRefresh(); } catch (e) {}
    }, 30);
  }
  function copy(txt, msg) {
    function ok() { if (msg) { msg.textContent = "caption copied";
      setTimeout(function () { msg.textContent = ""; }, 2500); } }
    try {
      navigator.clipboard.writeText(txt).then(ok, fallback);
    } catch (e) { fallback(); }
    function fallback() {
      /* clipboard access is refused on file:// in some browsers, and this page
         is meant to work from Finder, so there is a path that never needs it */
      var ta = document.createElement("textarea");
      ta.value = txt; ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e2) {}
      ta.remove();
      if (done) ok();
      else if (msg) {
        msg.textContent = "";
        var pre = document.createElement("textarea");
        pre.className = "stcopybox"; pre.value = txt; pre.readOnly = true;
        msg.parentNode.appendChild(pre); pre.select();
      }
    }
  }
  function makeImage(idea, D, msg) {
    var cv = document.createElement("canvas");
    markImage(function () {
      drawCard(cv, idea, D);
      cv.toBlob(function (blob) {
        if (!blob) { if (msg) msg.textContent = "the image could not be made"; return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "nirayana-" + idea.key.replace(/[^\w-]/g, "") + "-" +
                     S.ratio.replace(":", "x") + ".png";
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        if (msg) {
          msg.textContent = RATIOS[S.ratio].label + " · " +
                            Math.round(blob.size / 1024) + " KB";
          setTimeout(function () { msg.textContent = ""; }, 4000);
        }
        /* and show it, because a picture you cannot see before posting is a
           picture you will post wrong once */
        var prev = $("stpreview");
        if (prev) {
          prev.innerHTML = "";
          var im = new Image();
          im.src = cv.toDataURL("image/png");
          im.alt = idea.headline;
          prev.appendChild(im);
          prev.hidden = false;
        }
      }, "image/png");
    });
  }
  function drawAhead(events, D) {
    var host = $("stahead"); if (!host) return;
    var rows = events.filter(function (e) {
      return e.ms >= D.sunrise - 86400000;
    }).slice(0, 18);
    if (!rows.length) { host.innerHTML = '<p class="stnote">Nothing notable in ' +
      'the next ' + S.horizon + ' days beyond the daily pañcāṅga.</p>'; return; }
    host.innerHTML = '<table class="stahead"><tbody>' + rows.map(function (e) {
      var n = daysBetween(D.sunrise, e.ms);
      var what = e.kind === "ingress"
          ? graha(e.graha) + " → " + rashi(e.sign)
          : (e.kind === "retrograde" || e.kind === "direct")
            ? graha(e.graha) + " " + (hi() ? (e.kind === "direct" ? "मार्गी" : "वक्री")
                                           : e.kind)
            : (e.kind === "fullmoon" ? (hi() ? "पूर्णिमा" : "Pūrṇimā")
                                     : (hi() ? "अमावस्या" : "Amāvāsyā"));
      return "<tr><td>" + esc(dateAt(e.ms)) + "</td><td>" + esc(clockAt(e.ms)) +
        "</td><td>" + esc(what) + "</td><td>" + esc(whenWord(Math.max(0, n))) +
        "</td></tr>";
    }).join("") + "</tbody></table>";
  }

  /* ===== controls ========================================================== */
  function buildControls() {
    var d = $("stdate");
    if (d) {
      var now = new Date(Date.now() + (S.place.tz || 0) * 3600000);
      d.value = now.getUTCFullYear() + "-" +
        String(now.getUTCMonth() + 1).padStart(2, "0") + "-" +
        String(now.getUTCDate()).padStart(2, "0");
      S.date = { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
      d.addEventListener("change", function () {
        var p = (d.value || "").split("-").map(Number);
        if (p.length === 3 && p.every(isFinite)) {
          S.date = { y: p[0], m: p[1], d: p[2] };
          render();
        }
      });
    }
    var pl = $("stplace");
    if (pl && window.NPlaces) {
      var sv = NP.savedPlace();
      window.NPlaces.picker({
        host: pl, value: S.place, quick: (sv ? [sv] : []).concat(NP.PLACES),
        label: "Place", refMs: function () { return dayMs(); },
        onPick: function (p) { S.place = p; NP.cacheClear(); render(); }
      });
    }
    var lg = $("stlang");
    if (lg) lg.addEventListener("change", function () { S.lang = lg.value; render(); });
    var rt = $("stratio");
    if (rt) {
      rt.innerHTML = Object.keys(RATIOS).map(function (k) {
        return '<option value="' + k + '"' + (k === S.ratio ? " selected" : "") +
               ">" + RATIOS[k].label + "</option>"; }).join("");
      rt.addEventListener("change", function () { S.ratio = rt.value; });
    }
    var hz = $("sthorizon");
    if (hz) hz.addEventListener("change", function () {
      S.horizon = +hz.value || 10; render(); });
  }

  function start() {
    if (!$("stcards")) return;
    var need = [];
    if (!window.__kSidAt) need.push("engine.js");
    if (!window.NP) need.push("panchanga.js");
    if (!window.NPlaces) need.push("places.js");
    var left = need.length;
    if (!left) return go();
    need.forEach(function (src) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { if (--left === 0) go(); };
      s.onerror = function () {
        $("stcards").innerHTML = '<p class="stnote">The engine could not be ' +
          "loaded, so nothing here can be computed.</p>";
      };
      document.head.appendChild(s);
    });
  }
  function go() {
    if (!window.NP) return;
    NP = window.NP;
    S.place = NP.savedPlace() || NP.PLACES[2];
    buildControls();
    render();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();

  window.__stState = function () { return S; };
  window.__stRender = render;
  window.__stCaption = function (i) {
    return captionOf(window.__stIdeas[i], window.__stDay);
  };
})();
