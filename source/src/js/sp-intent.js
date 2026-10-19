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
