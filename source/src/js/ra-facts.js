/* ===== Reel Agent — facts and numbers =====================================

   A reel may say only what the engine measured. This file is the two halves
   of that rule:

   1. FACTS. Every surface's facts() returns a flat list of citable items —
      { id, label, value, unit, kind, source } — built from the numbers the
      surface actually computed. The verifier and the agent see the same list,
      and nothing about a person's chart is ever in it.

   2. NUMBERS IN TEXT. A narration written in Hindi says a number in at least
      four ways: "40", "४०", "चालीस", "40°00′". numbersIn() reads all of them
      back to values, so "an invented number" can be caught however it is
      spelled. It errs towards reading a number where there is one: a false
      alarm costs a rewrite, a missed invention costs the reel its honesty. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  /* ---- Hindi number words ----------------------------------------------- */
  var H100 = ("एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह " +
    "सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस " +
    "तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस " +
    "बयालीस तैंतालीस चौवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन " +
    "तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ " +
    "सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर " +
    "अठहत्तर उन्यासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी " +
    "नब्बे इक्यानवे बानवे तिरानवे चौरानवे पचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे").split(" ");
  var WORD = { "शून्य": 0 };
  H100.forEach(function (w, i) { WORD[w] = i + 1; });
  /* spellings in common use beside the standard ones */
  [["पांच", 5], ["छः", 6], ["छै", 6], ["छे", 6], ["सत्ताइस", 27], ["अठाईस", 28],
   ["उनत्तीस", 29], ["इकत्तीस", 31], ["चवालीस", 44], ["पन्द्रह", 15], ["सत्रा", 17],
   ["अट्ठारह", 18], ["चौसठ", 64], ["इकसठ", 61]].forEach(function (p) { WORD[p[0]] = p[1]; });
  /* ordinals — only the unambiguous forms: पहले and दूसरे also mean
     "before" and "other", and reading them as numbers would flag ordinary
     sentences */
  [["पहला", 1], ["पहली", 1], ["दूसरा", 2], ["दूसरी", 2], ["तीसरा", 3], ["तीसरी", 3],
   ["तीसरे", 3], ["चौथा", 4], ["चौथी", 4], ["चौथे", 4], ["पाँचवाँ", 5], ["पाँचवीं", 5],
   ["पाँचवें", 5], ["छठा", 6], ["छठी", 6], ["छठे", 6], ["सातवाँ", 7], ["सातवीं", 7],
   ["सातवें", 7], ["आठवाँ", 8], ["आठवीं", 8], ["आठवें", 8], ["नौवाँ", 9], ["नौवीं", 9],
   ["नौवें", 9], ["दसवाँ", 10], ["दसवीं", 10], ["दसवें", 10]].forEach(function (p) { WORD[p[0]] = p[1]; });
  var MULT = { "सौ": 100, "हज़ार": 1000, "हजार": 1000, "लाख": 1e5, "करोड़": 1e7, "करोड": 1e7 };
  var FRAC = { "साढ़े": 0.5, "साढे": 0.5, "सवा": 0.25, "पौने": -0.25 };
  var WHOLE = { "डेढ़": 1.5, "डेढ": 1.5, "ढाई": 2.5 };
  /* English, for the hinglish and en scripts */
  var EN = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
    eighth: 8, ninth: 9, tenth: 10, twelfth: 12, twentieth: 20 };
  var ENM = { hundred: 100, thousand: 1000 };

  function devToAscii(s) {
    return String(s).replace(/[०-९]/g, function (d) {
      return String(d.charCodeAt(0) - 0x0966); });
  }

  /* ---- read every number out of a line ----------------------------------
     Returns [{ v, dp, raw }], dp = decimal places as written (degrees and
     minutes count as the precision of a minute). */
  function numbersIn(text) {
    var out = [], s = devToAscii(text || "");
    /* 1. degrees with minutes: 40°00′, 13°20', 3° 20′ */
    s = s.replace(/(\d+)\s*°\s*(\d{1,2})\s*['′’]/g, function (m, d, mi) {
      out.push({ v: +d + (+mi) / 60, dp: 2, raw: m, deg: true }); return " ";
    });
    /* 2. plain numerals, with an optional decimal part; a thousands
       separator inside a number is joined first */
    s = s.replace(/(\d),(\d{3})(?!\d)/g, "$1$2");
    s = s.replace(/[-−]?\d+(?:\.\d+)?/g, function (m) {
      var dp = (m.split(".")[1] || "").length;
      out.push({ v: Math.abs(parseFloat(m.replace("−", "-"))), dp: dp, raw: m }); return " ";
    });
    /* 3. number words, Hindi and English, read as runs */
    var toks = s.split(/[\s,.;:!?()"'—–·।\-]+/);
    var cur = null, total = 0, frac = 0, rawRun = [];
    function flush() {
      if (cur !== null || total) {
        var v = total + (cur || 0);
        if (frac) v = v + frac;
        out.push({ v: v, dp: frac ? 2 : 0, raw: rawRun.join(" ") });
      }
      cur = null; total = 0; frac = 0; rawRun = [];
    }
    for (var i = 0; i < toks.length; i++) {
      var w = toks[i], lw = w.toLowerCase();
      if (!w) continue;
      if (w in FRAC && i + 1 < toks.length && (toks[i + 1] in WORD)) {
        flush(); frac = FRAC[w]; rawRun.push(w); continue;
      }
      if (w in WHOLE) { flush(); out.push({ v: WHOLE[w], dp: 1, raw: w }); continue; }
      var val = (w in WORD) ? WORD[w] : (lw in EN ? EN[lw] : null);
      var mul = (w in MULT) ? MULT[w] : (lw in ENM ? ENM[lw] : null);
      if (val !== null) { cur = (cur || 0) + val; rawRun.push(w); continue; }
      if (mul !== null && (cur !== null || rawRun.length)) {
        if (mul >= 1000) { total += (cur || 1) * mul; cur = null; }
        else cur = (cur || 1) * mul;
        rawRun.push(w); continue;
      }
      if (mul !== null) { cur = mul; rawRun.push(w); continue; }
      flush();
    }
    flush();
    return out;
  }

  /* ---- does a number in the text agree with some fact? ------------------
     A narration rounds: "48.9°" for 48.895, "49" for the same. A number is
     accepted when it equals a fact at the precision it was written to, or is
     the fact's whole-number part (13°20′ said as "thirteen degrees"). */
  function matches(n, fv) {
    var tol = n.dp ? 0.5 * Math.pow(10, -n.dp) + 1e-9 : 0.5 + 1e-9;
    if (Math.abs(n.v - fv) <= tol) return true;
    if (!n.dp && Math.floor(fv + 1e-9) === n.v) return true;
    return false;
  }

  /* ---- the framework itself: always citable -----------------------------
     Numbers that belong to the system rather than to any one reel. They are
     listed, not assumed, so the set a narration may draw on is visible. */
  var FRAMEWORK = [
    ["nak.count", "nakṣatras in the ring", 27], ["rashi.count", "rāśis", 12],
    ["graha.count", "grahas", 9], ["bhava.count", "bhāvas", 12],
    ["nak.span", "span of one nakṣatra (°)", 40 / 3], ["rashi.span", "span of one rāśi (°)", 30],
    ["circle", "degrees in a circle", 360], ["pada.count", "pādas in a nakṣatra", 4],
    ["pada.span", "span of one pāda (°)", 10 / 3], ["pada.total", "pādas in the ring", 108],
    ["vim.years", "Vimśottarī cycle (years)", 120], ["navamsa.count", "navāṃśas in a rāśi", 9],
    ["varga.count", "vargas of the ṣoḍaśavarga", 16], ["tithi.count", "tithis in a month", 30],
    ["paksha.tithi", "tithis in a pakṣa", 15], ["month.count", "months in a year", 12],
    ["synodic", "synodic month (days)", 29.53], ["kendra.1", "kendra houses", 1],
    ["kendra.4", "kendra", 4], ["kendra.7", "kendra", 7], ["kendra.10", "kendra", 10]
  ].map(function (r) { return { id: "fw." + r[0], label: r[1], value: r[2], unit: "", kind: "number", source: "framework" }; });

  /* harvest every number the engine itself wrote into its own text */
  function harvest(id, label, text, source) {
    var o = [];
    numbersIn(text).forEach(function (n, i) {
      o.push({ id: id + "." + i, label: label, value: n.v, unit: "", kind: n.deg ? "degree" : "number",
               source: source || "engine text", text: String(text).slice(0, 160) });
    });
    return o;
  }

  function dateFacts(id, t, label) {
    var d = new Date(t);
    return [
      { id: id + ".date", label: label || "date", value: d.toISOString().slice(0, 10), unit: "", kind: "date", source: "engine" },
      { id: id + ".y", label: (label || "date") + " — year", value: d.getUTCFullYear(), unit: "", kind: "number", source: "engine" },
      { id: id + ".d", label: (label || "date") + " — day", value: d.getUTCDate(), unit: "", kind: "number", source: "engine" }
    ];
  }

  /* numeric values of a fact list, for the verifier */
  function values(facts) {
    var v = [];
    (facts || []).forEach(function (f) {
      if (typeof f.value === "number" && isFinite(f.value)) v.push(f.value);
      else if (typeof f.value === "string") numbersIn(f.value).forEach(function (n) { v.push(n.v); });
    });
    return v;
  }

  /* fields that could identify a person or their chart. A fact or a request
     body that carries one of these is refused outright — see ra-agent. */
  var PERSONAL = /\b(dob|tob|birth|birthdate|birthtime|janma(?:_|\s)?(?:date|time)|latitude|longitude|lat|lon|lng|tz|timezone|natal|kundli|kundali|chart(?:_|\s)?(?:id|name)|person|native|name_of)\b/i;

  RA.facts = { numbersIn: numbersIn, matches: matches, FRAMEWORK: FRAMEWORK,
               harvest: harvest, dateFacts: dateFacts, values: values,
               devToAscii: devToAscii, PERSONAL: PERSONAL, WORD: WORD };
})();
