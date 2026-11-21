/* ===== Reel Agent — core ==================================================

   The namespace and the few things every other ra-* file needs: a hash, a
   small IndexedDB store, the desktop bridge, the label table in English and
   Hindi, and the one rule that matters most here — whether the network may
   be used at all.

   THE PRIVACY GATE LIVES HERE AND NOWHERE ELSE. RA.net.allowed() is false
   unless the reader has switched Connected mode on, and every function that
   could make a request asks it first. Offline mode does not "avoid" the
   network; it cannot reach the code that would use it. The privacy test
   runs a whole reel with request interception on and asserts zero requests.

   Names are prefixed RA / __ra because the report modules share one scope
   and a short global is how two of them have collided before. */
(function () {
  "use strict";
  if (window.RA && window.RA.core) return;
  var RA = window.RA = window.RA || {};

  /* ---- labels: every string the panel shows, in both languages ---------- */
  var L = {
    make:      ["Make reel", "रील बनाएँ"],
    brief:     ["Brief (optional)", "विवरण (वैकल्पिक)"],
    language:  ["Language", "भाषा"],
    voice:     ["Voice", "आवाज़"],
    female:    ["Female", "स्त्री"],
    male:      ["Male", "पुरुष"],
    length:    ["Length", "अवधि"],
    music:     ["Music", "संगीत"],
    none:      ["None", "कोई नहीं"],
    bundled:   ["Bundled", "साथ आया"],
    myfile:    ["My file", "मेरी फ़ाइल"],
    captions:  ["Captions", "कैप्शन"],
    generate:  ["Generate", "बनाएँ"],
    cancel:    ["Cancel", "रोकें"],
    close:     ["Close", "बंद करें"],
    download:  ["Download", "डाउनलोड"],
    share:     ["Share", "साझा करें"],
    reveal:    ["Show in folder", "फ़ोल्डर में दिखाएँ"],
    copycap:   ["Copy post caption", "पोस्ट कैप्शन कॉपी करें"],
    regen:     ["Regenerate", "फिर से बनाएँ"],
    revoice:   ["Re-voice", "फिर से बोलें"],
    thumb:     ["Thumbnail", "थंबनेल"],
    library:   ["Reels library", "रील संग्रह"],
    s_layout:  ["choosing layout", "लेआउट चुन रहे हैं"],
    s_facts:   ["reading facts", "तथ्य पढ़ रहे हैं"],
    s_script:  ["writing script", "स्क्रिप्ट लिख रहे हैं"],
    s_check:   ["checking facts", "तथ्य जाँच रहे हैं"],
    s_voice:   ["voicing", "आवाज़ दे रहे हैं"],
    s_render:  ["rendering", "रेंडर कर रहे हैं"],
    s_done:    ["done", "तैयार"],
    silent:    ["Silent (captions only)", "मौन (केवल कैप्शन)"],
    upload:    ["Voice file", "आवाज़ की फ़ाइल"],
    system:    ["System voice (this computer)", "सिस्टम की आवाज़ (यह कंप्यूटर)"],
    notposted: ["Nothing is posted. The reel stays on this device.",
                "कुछ भी पोस्ट नहीं होता। रील इसी डिवाइस पर रहती है।"],
    study:     ["A classical framework for study, not a prediction.",
                "शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं।"]
  };
  function t(key) { var x = L[key]; return x ? x[0] + " / " + x[1] : key; }
  function hi(key) { var x = L[key]; return x ? x[1] : key; }
  function en(key) { var x = L[key]; return x ? x[0] : key; }

  /* ---- hashing: cache keys for voice clips ------------------------------ */
  function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
        .then(function (b) {
          return Array.prototype.map.call(new Uint8Array(b), function (x) {
            return ("0" + x.toString(16)).slice(-2); }).join("");
        });
    }
    /* file:// in some browsers has no SubtleCrypto; a 53-bit string hash is
       enough for a cache key, never for anything that must resist collision */
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return Promise.resolve((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16));
  }

  /* ---- a tiny IndexedDB store -------------------------------------------
     Two object stores: "clips" (voice cache) and "reels" (the library).
     Every call resolves to null rather than throwing when storage is
     unavailable (private windows, file:// in some browsers), because a
     missing cache must never stop a reel being made. */
  var DBP = null;
  function db() {
    if (DBP) return DBP;
    DBP = new Promise(function (res) {
      try {
        if (!window.indexedDB) return res(null);
        var rq = indexedDB.open("nirayana-reel-agent", 1);
        rq.onupgradeneeded = function () {
          var d = rq.result;
          if (!d.objectStoreNames.contains("clips")) d.createObjectStore("clips");
          if (!d.objectStoreNames.contains("reels")) d.createObjectStore("reels", { keyPath: "id" });
        };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return DBP;
  }
  function idb(store, mode, fn) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try {
          var tx = d.transaction(store, mode), s = tx.objectStore(store), rq = fn(s);
          tx.oncomplete = function () { res(rq && "result" in rq ? rq.result : true); };
          tx.onerror = tx.onabort = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  var store = {
    get: function (st, k) { return idb(st, "readonly", function (s) { return s.get(k); }); },
    put: function (st, v, k) { return idb(st, "readwrite", function (s) { return k == null ? s.put(v) : s.put(v, k); }); },
    del: function (st, k) { return idb(st, "readwrite", function (s) { return s.delete(k); }); },
    all: function (st) { return idb(st, "readonly", function (s) { return s.getAll(); }); }
  };

  /* ---- the desktop app ---------------------------------------------------
     Tauri 2 always defines __TAURI_INTERNALS__.invoke inside its webview,
     whatever withGlobalTauri says, so that is the test for "in the app". */
  function inApp() {
    return !!(window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function");
  }
  function invoke(cmd, args) {
    if (!inApp()) return Promise.reject(new Error("not in the desktop app"));
    return window.__TAURI_INTERNALS__.invoke(cmd, args || {});
  }

  /* ---- settings, kept per device ---------------------------------------- */
  var SKEY = "nirayana.reelAgent";
  var DEFAULTS = { mode: "offline", lang: "hi", voice: "female", seconds: 45,
                   music: "none", captions: true, provider: "anthropic",
                   model: "", ttsProvider: "", ttsModel: "", elevenVoice: "", handle: "@Nirayana.Soft",
                   daily: false };
  function settings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch (e) {}
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = k in s ? s[k] : DEFAULTS[k]; });
    return o;
  }
  function save(patch) {
    var s = settings();
    Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  /* ---- THE GATE --------------------------------------------------------- */
  /* HOLD: a surface that draws the reader's own chart (the kundli, the
     ceremony at their birth moment, a Motion scene that needs the chart)
     holds the gate shut for as long as its panel is open. Connected mode
     stays switched on in Settings, but nothing can pass: not the agent,
     not a cloud voice, not a model list. One flag, read by the one check
     everything already goes through. */
  var HOLD = null;
  var net = {
    allowed: function () { return !HOLD && settings().mode === "connected"; },
    hold: function (why) { HOLD = why || "personal"; },
    release: function () { HOLD = null; },
    held: function () { return HOLD; },
    assert: function (what) {
      if (!net.allowed())
        throw new Error("Connected mode is off — " + (what || "a network request") +
                        " was refused before it was made.");
    }
  };

  /* ---- small DOM helper ------------------------------------------------- */
  function el(tag, cls, text, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  RA.core = { L: L, t: t, hi: hi, en: en, sha256: sha256, store: store,
              inApp: inApp, invoke: invoke, settings: settings, save: save,
              DEFAULTS: DEFAULTS, el: el, wait: wait };
  RA.net = net;
})();
;

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
;

/* ===== Reel Agent — Hindi for reels the engine narrates only in English ===

   SPScript writes Hindi for the teaching sets (nakṣatras, rāśis, bhāvas, the
   framework). The festival reels fall back to the English beat sentences, so
   a "pure Hindi" Dīvālī reel came out half English. This file writes those
   reels in Hindi FROM THE SAME EVENTS the picture is drawn from — the dates,
   the count, the spread and the return after nineteen years are read off the
   built reel, never typed here — so the Hindi cannot disagree with the frame.

   The festival names and rules below are translations of the rule strings in
   sp-festivals.js, not new claims; where that file marks a rule contested,
   the Hindi says so too. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  var MON = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त",
             "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

  var FEST = {
    diwali:         { name: "दीवाली", rule: "आश्विन अमावस्या (अमांत), प्रदोष काल में — जिसे पूर्णिमांत गणना कार्तिक अमावस्या कहती है" },
    dussehra:       { name: "विजयादशमी", rule: "आश्विन शुक्ल दशमी, अपराह्न काल में — सूर्योदय पर नहीं" },
    holi:           { name: "होली", rule: "होलिका दहन का अगला दिन" },
    ramanavami:     { name: "राम नवमी", rule: "चैत्र शुक्ल नवमी, सूर्योदय के समय" },
    navaratri:      { name: "शारदीय नवरात्रि", rule: "आश्विन शुक्ल प्रतिपदा, सूर्योदय के समय — यहीं से नौ रातें" },
    ugadi:          { name: "उगादि / गुड़ी पड़वा", rule: "चैत्र शुक्ल प्रतिपदा — चैत्रादि गणना में चांद्र वर्ष का पहला दिन" },
    makara:         { name: "मकर संक्रांति", rule: "सूर्य का निरयण मकर राशि में प्रवेश — यह सौर घटना है, तिथि नहीं", solar: true },
    janmashtami:    { name: "कृष्ण जन्माष्टमी", rule: "अमांत श्रावण कृष्ण अष्टमी — जिसे पूर्णिमांत गणना भाद्रपद कृष्ण अष्टमी कहती है" },
    mahashivaratri: { name: "महाशिवरात्रि", rule: "अमांत माघ कृष्ण चतुर्दशी, निशीथ काल में — जिसे पूर्णिमांत गणना फाल्गुन कहती है" }
  };

  function dateHi(t) {
    var d = new Date(t);
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function festKey(reel) {
    var m = /^fest\.(when|moon)\.(\w+)$/.exec(reel && reel.key || "");
    return m ? { kind: m[1], f: m[2] } : null;
  }

  function firstNum(text, re) {
    var m = re.exec(text || "");
    return m ? m[1] : null;
  }

  /* Hindi lines for a festival "why the date moves" reel, one per beat of
     the reel as built. Returns null for anything it does not cover. */
  function festLines(reel, beats) {
    var fk = festKey(reel);
    if (!fk || fk.kind !== "when" || !FEST[fk.f] || !beats || !beats.length) return null;
    var F = FEST[fk.f], ev = (reel.events || []).filter(function (e) { return e.t; });
    if (!ev.length) return null;
    var n = ev.length;
    var years = firstNum(reel.subtitle, /across\s+(\d+)\s+years/) || String(reel.years || n);
    var spread = firstNum(reel.closing && reel.closing.big, /^(\d+)\s+days/);
    var back = firstNum(reel.closing && reel.closing.lines && reel.closing.lines[2], /within\s+([\d.]+)\s+days/);
    var e0 = ev[0], e1 = ev[1] || ev[0], eL = ev[n - 1];
    var contested = ev.some(function (e) { return e.contested; });

    var L1 = F.name + " हर साल अलग तारीख़ पर क्यों आती है? यहाँ " + years +
             " वर्षों की " + n + " तारीख़ें हैं, हर एक अपने वर्ष में।";
    var L2 = "नियम कभी नहीं बदलता — " + F.rule + "। " +
             (F.solar
               ? "इसलिए यह लगभग एक ही तारीख़ पर टिकी रहती है: " + dateHi(e0.t) + ", फिर " + dateHi(e1.t) + "।"
               : "बदलती है केवल अंग्रेज़ी तारीख़: " + dateHi(e0.t) + ", फिर " + dateHi(e1.t) + ", और " + dateHi(eL.t) + " तक।");
    var L3 = F.solar
      ? "राशि तारों से बँधी है और अंग्रेज़ी वर्ष विषुव से — दोनों का अंतर ही अयनांश है।"
      : "चांद्र मास 29.53 दिन का है, और सौर वर्ष उसका पूरा गुणज नहीं" +
        (spread ? " — इसलिए तारीख़ " + spread + " दिन के दायरे में घूमती है" : "") + "। " +
        "19 वर्ष बाद यह लगभग उसी तारीख़ पर लौट आती है" + (back ? ", " + back + " दिन के भीतर" : "") +
        " — यही मेटोनिक चक्र है।" + (contested ? " इस नियम पर पंचांगों में मतभेद है।" : "");
    var L4 = contested ? "पंचांगों में मतभेद है; यहाँ इस पृष्ठ के अपने नियम की गणना है।"
                       : "नियम एक, तारीख़ें अनेक।";
    /* The reel's beats are not equal: a short opening, a long middle where
       the dates play, a short close. The long explanation goes where the
       picture has time for it, and the last beat gets a sentence it can
       carry — the verifier refuses a line stretched past 4×, and the first
       version of this file was refused for exactly that. */
    var n = beats.length, out = new Array(n), i;
    for (i = 0; i < n; i++) out[i] = "";
    if (n === 1) { out[0] = L1 + " " + L2 + " " + L3; return out; }
    if (n === 2) { out[0] = L1; out[1] = L2 + " " + L3; return out; }
    out[0] = L1; out[n - 1] = L4;
    var mid = [];
    for (i = 1; i < n - 1; i++) mid.push(i);
    /* the longest middle beat takes the rule and the dates; the next the cycle */
    mid.sort(function (a, b) { return (beats[b].to - beats[b].from) - (beats[a].to - beats[a].from); });
    if (mid.length === 1) out[mid[0]] = L2 + " " + L3;
    else { mid.slice(0, 2).sort(function (a, b) { return a - b; }).forEach(function (k, j) { out[k] = j ? L3 : L2; }); }
    return out;
  }

  /* a Hindi title for the title band */
  function title(reel) {
    var F = reel && reel.facts, fk = festKey(reel);
    if (F && F.kind === "nakshatra" && F.nakDev) return F.num + " · " + F.nakDev;
    if (F && F.nameDev) return (F.num ? F.num + " · " : "") + F.nameDev;
    if (fk && FEST[fk.f]) return fk.kind === "when" ? FEST[fk.f].name + " — तारीख़ क्यों बदलती है?" : FEST[fk.f].name;
    return null;
  }

  function devanagariShare(s) {
    var d = 0, l = 0;
    String(s || "").replace(/[ऀ-ॿ]/g, function () { d++; return ""; })
                   .replace(/[A-Za-z]/g, function () { l++; return ""; });
    return d + l ? d / (d + l) : 0;
  }

  /* ---- the other reel sets, sentence by sentence ----------------------
     The eclipse, thread, asta, vakrī, Siddhānta, simulation, cycle and
     festival-month reels narrate in sentences the engine writes from a small
     number of shapes: "Śukra hides in MITHUNA — within 10° of Sūrya". Each
     shape is translated here as a pattern, with its numbers, grahas and
     rāśis carried across from the engine's own sentence. Nothing is
     paraphrased from memory: a sentence no pattern covers stays in English
     and is marked so, and line() refuses any translation whose numbers are
     not exactly the original's — a pattern can lose a word, never a value. */
  var GH = { "Sūrya": "सूर्य", "Candra": "चन्द्र", "Maṅgala": "मंगल", "Budha": "बुध", "Guru": "गुरु",
             "Śukra": "शुक्र", "Śani": "शनि", "Rāhu": "राहु", "Ketu": "केतु", "Earth": "पृथ्वी" };
  var RK = { mesa: "मेष", vrsabha: "वृषभ", mithuna: "मिथुन", karka: "कर्क", karkata: "कर्क", simha: "सिंह",
             kanya: "कन्या", tula: "तुला", vrscika: "वृश्चिक", dhanu: "धनु", dhanus: "धनु", makara: "मकर",
             kumbha: "कुम्भ", mina: "मीन" };
  var MONU = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  var FN = { "Dīvālī / Lakṣmī Pūjā": "दीवाली / लक्ष्मी पूजा", "Vijayadaśamī / Dussehra": "विजयादशमी / दशहरा",
             "Holī / Dhuleṭī": "होली / धुलेंडी", "Śāradīya Navarātri begins": "शारदीय नवरात्रि आरंभ",
             "Ugādi / Gudi Padwa": "उगादि / गुड़ी पड़वा", "Rāma Navamī": "राम नवमी", "Makara Saṅkrānti": "मकर संक्रांति",
             "Kṛṣṇa Janmāṣṭamī": "कृष्ण जन्माष्टमी", "Mahāśivarātri": "महाशिवरात्रि", "Dīvālī": "दीवाली",
             "Vijayadaśamī": "विजयादशमी", "Holī": "होली", "Śāradīya Navrātri": "शारदीय नवरात्रि",
             "Caitra Navrātri": "चैत्र नवरात्रि" };
  var KALA = { "pradoṣa": "प्रदोष", "aparāhna": "अपराह्न", "niśīta": "निशीथ" };
  var MOONS = { "Amāvāsyā": "अमावस्या", "Amāvasyā": "अमावस्या", "Pūrṇimā": "पूर्णिमा" };
  function plain(x) { return String(x).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function rk(x) { return RK[plain(x)] || null; }
  function gh(x) { return GH[x] || null; }
  var G = "(Sūrya|Candra|Maṅgala|Budha|Guru|Śukra|Śani|Rāhu|Ketu|Earth)";
  var R = "([A-ZĀĪŪṚṢŚṆṬḌṂ]{3,}[A-ZĀĪŪṚṢŚṆṬḌṂ]*)";
  var N = "([\\d][\\d,]*(?:\\.\\d+)?)";
  var F = "(" + Object.keys(FN).sort(function (a, b) { return b.length - a.length; })
              .map(function (k) { return k.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"); }).join("|") + ")";
  /* each rule: [regex source, function(m) → Hindi]; applied in order, each
     to every match, so a beat made of title + subtitle + event translates
     piece by piece */
  var RULES = [
    ["Why isn’t there an eclipse every (Amāvāsyā|Pūrṇimā)\\?", function (m) { return "हर " + MOONS[m[1]] + " पर ग्रहण क्यों नहीं होता?"; }],
    ["Every (new|full) Moon for " + N + " years, and how far each stood from the node\\.", function (m) {
      return m[2] + " साल की हर " + (m[1] === "new" ? "अमावस्या" : "पूर्णिमा") + ", और हर बार चन्द्र पात से कितनी दूर था।"; }],
    [G + " & " + G + "(?= —)", function (m) { return gh(m[1]) + " और " + gh(m[2]); }],
    ["A line between them every " + N + " days\\. What will they draw in " + N + " years\\?", function (m) {
      return "हर " + m[1] + " दिन उनके बीच रेखा। " + m[2] + " साल में वे क्या बनाएँगे?"; }],
    [G + " Asta(?= —)", function (m) { return gh(m[1]) + " अस्त"; }],
    ["Every time " + G + " hides in the Sun’s glare\\. Where does it hide\\?", function (m) {
      return "हर बार जब " + gh(m[1]) + " सूर्य की चमक में छिपता है। वह कहाँ छिपता है?"; }],
    [G + " Vakrī(?= —)", function (m) { return gh(m[1]) + " वक्री"; }],
    ["Why does a planet go backwards\\? Watch its real path, longitude against distance\\.", function () {
      return "ग्रह पीछे क्यों चलता है? उसका असली पथ देखिए — भोगांश और दूरी।"; }],
    ["The Sūrya Siddhānta beside the modern sky — " + G + ", computed twice — once by the Siddhānta's own method and once by a modern ephemeris\\. The gap is drawn\\.", function (m) {
      return "सूर्य सिद्धांत और आधुनिक आकाश — " + gh(m[1]) + " की दोहरी गणना: सिद्धांत की अपनी विधि से, और आधुनिक सारणी से। अंतर दिखाया गया है।"; }],
    ["The Siddhānta's eclipses beside the modern list — Every eclipse the fifth-century method computes, beside every one in a modern list\\.", function () {
      return "सिद्धांत के ग्रहण और आधुनिक सूची — पाँचवीं सदी की विधि का हर ग्रहण, आधुनिक सूची के हर एक ग्रहण के साथ।"; }],
    ["A solar eclipse in the modern list that the Siddhānta does not compute", function () {
      return "आधुनिक सूची का सूर्य ग्रहण, जिसकी गणना सिद्धांत नहीं करता"; }],
    ["The Siddhānta computes a (lunar|solar) eclipse, and the modern list has one within " + N + " hours", function (m) {
      return "सिद्धांत " + (m[1] === "lunar" ? "चन्द्र" : "सूर्य") + " ग्रहण की गणना करता है, और आधुनिक सूची में भी " + m[2] + " घंटे के भीतर एक ग्रहण है"; }],
    ["The Moon stops revolving — What happens if the Moon stops revolving\\?", function () { return "चन्द्र परिक्रमा रोक दे — अगर चन्द्र घूमना बंद कर दे तो क्या होगा?"; }],
    ["The Moon at half its distance — And half as far\\?", function () { return "आधी दूरी पर चन्द्र — और अगर आधा ही दूर हो?"; }],
    ["The Moon a tenth further out — Ten per cent further out\\.", function () { return "चन्द्र दसवाँ भाग और दूर — दस प्रतिशत और दूर।"; }],
    ["The Moon at the Roche limit — As close as a body held together by its own gravity can come before it is pulled apart\\.", function () {
      return "रोश सीमा पर चन्द्र — अपने ही गुरुत्व से बँधा पिंड टूटने से पहले जितना पास आ सकता है।"; }],
    ["The Moon going the other way — What if the Moon orbited backwards\\?", function () { return "उलटी दिशा में चन्द्र — अगर चन्द्र उलटी दिशा में परिक्रमा करे?"; }],
    ["The Moon past escape speed — What if the Moon were moving just fast enough to leave\\?", function () {
      return "पलायन वेग से आगे चन्द्र — अगर चन्द्र इतनी तेज़ चले कि छूटकर निकल जाए?"; }],
    ["The Moon is " + N + " km away, moving at " + N + " km/s", function (m) {
      return "चन्द्र " + m[1] + " किलोमीटर दूर है, " + m[2] + " किलोमीटर प्रति सेकंड की गति से"; }],
    ["The Great Conjunction(?= —)", function () { return "महान युति"; }],
    [G + " meets " + G + "(?= —)", function (m) { return gh(m[1]) + " और " + gh(m[2]) + " का मिलन"; }],
    [G + " at opposition(?= —)", function (m) { return gh(m[1]) + " की प्रतियुति"; }],
    ["Every (Pūrṇimā|Amāvāsyā)(?= —)", function (m) { return "हर " + MOONS[m[1]]; }],
    ["Every station of " + G + "(?= —)", function (m) { return gh(m[1]) + " का हर स्तंभन"; }],
    [N + " of them in " + N + " years\\. Where do they fall\\?", function (m) { return m[2] + " साल में " + m[1] + " बार। ये कहाँ पड़ते हैं?"; }],
    [F + " — Thirty-one tithis with " + F + " at the centre — fifteen before it and fifteen after, each Moon at its real phase\\.", function (m) {
      return FN[m[1]] + " — इकतीस तिथियाँ, बीच में " + FN[m[2]] + " — पंद्रह पहले और पंद्रह बाद, हर चन्द्र अपनी असली कला में।"; }],
    ["(Amāvāsyā|Amāvasyā|Pūrṇimā) in " + R + " · " + N + "° from the ecliptic", function (m) {
      return rk(m[2]) && MOONS[m[1]] + " " + rk(m[2]) + " में · क्रांतिवृत्त से " + m[3] + " अंश"; }],
    ["(Amāvāsyā|Amāvasyā|Pūrṇimā) in " + R, function (m) { return rk(m[2]) && MOONS[m[1]] + " " + rk(m[2]) + " में"; }],
    ["Meeting " + N + " — in a line with the Sun, " + G + " in " + R, function (m) {
      return rk(m[3]) && "भेंट " + m[1] + " — सूर्य की सीध में, " + gh(m[2]) + " " + rk(m[3]) + " में"; }],
    [G + " hides in " + R + " — within " + N + "° of Sūrya", function (m) {
      return rk(m[2]) && gh(m[1]) + " " + rk(m[2]) + " में छिपता है — सूर्य से " + m[3] + " अंश के भीतर"; }],
    [G + " turns (vakrī \\(retrograde\\)|mārgī \\(direct\\)) in " + R, function (m) {
      return rk(m[3]) && gh(m[1]) + " " + rk(m[3]) + " में " + (/^vakr/.test(m[2]) ? "वक्री" : "मार्गी") + " होता है"; }],
    ["The Siddhānta puts " + G + " " + N + "° (ahead of|behind) the modern place, in " + R, function (m) {
      return rk(m[4]) && "सिद्धांत " + gh(m[1]) + " को आधुनिक स्थिति से " + m[2] + " अंश " + (m[3] === "behind" ? "पीछे" : "आगे") + " रखता है, " + rk(m[4]) + " में"; }],
    [G + " (☌|☍) " + G + " in " + R, function (m) {
      return rk(m[4]) && gh(m[1]) + " और " + gh(m[3]) + " की " + (m[2] === "☌" ? "युति" : "प्रतियुति") + ", " + rk(m[4]) + " में"; }],
    [G + " stations in " + R, function (m) { return rk(m[2]) && gh(m[1]) + " " + rk(m[2]) + " में स्तंभित होता है"; }],
    ["it holds at sunrise on " + N + " ([A-Z]{3}) " + N + ", but the rule asks about (pradoṣa|aparāhna|niśīta)", function (m) {
      return MONU[m[2]] != null && m[1] + " " + MON[MONU[m[2]]] + " " + m[3] + " को सूर्योदय पर रहती है, पर नियम " + KALA[m[4]] + " काल पूछता है"; }],
    ["a kṣaya tithi: it begins and ends between two sunrises, so no day carries it", function () {
      return "क्षय तिथि: दो सूर्योदयों के बीच ही शुरू होकर समाप्त, इसलिए किसी दिन के हिस्से नहीं आती"; }],
    ["a vṛddhi tithi: it is running at two sunrises, so two days carry it, and another tithi gets none", function () {
      return "वृद्धि तिथि: दो सूर्योदयों पर चलती है, इसलिए दो दिन इसके हैं, और किसी अन्य तिथि को कोई दिन नहीं मिलता"; }],
    ["Tithi (śukla|kṛṣṇa) " + N, function (m) { return "तिथि " + (m[1] === "śukla" ? "शुक्ल" : "कृष्ण") + " " + m[2]; }],
    [F, function (m) { return FN[m[1]]; }]
  ].map(function (r) { return [new RegExp(r[0], "g"), r[1]]; });

  function sameNumbers(a, b) {
    if (!RA.facts || !RA.facts.numbersIn) return true;
    var x = RA.facts.numbersIn(a).map(function (n) { return n.v; }).sort(function (p, q) { return p - q; });
    var y = RA.facts.numbersIn(b).map(function (n) { return n.v; }).sort(function (p, q) { return p - q; });
    if (x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) if (Math.abs(x[i] - y[i]) > 1e-6) return false;
    return true;
  }
  /* one English engine sentence → Hindi, or null when it cannot be done
     honestly (a shape no rule knows, or the numbers would not survive) */
  function line(s) {
    if (!s || devanagariShare(s) >= 0.5) return null;
    var out = String(s), bad = false;
    RULES.forEach(function (r) {
      out = out.replace(r[0], function () {
        var m = arguments, v = r[1](m);
        if (!v) { bad = true; return m[0]; }
        return v;
      });
    });
    if (bad || devanagariShare(out) < 0.5) return null;
    return sameNumbers(s, out) ? out : null;
  }

  RA.hi = { MON: MON, FEST: FEST, dateHi: dateHi, festLines: festLines, title: title,
            devanagariShare: devanagariShare, line: line, sameNumbers: sameNumbers };
})();
;

/* ===== Reel Agent — the adapter contract =================================

   One contract on every animating surface, so the agent, the verifier and
   the renderer never need to know which page they are on:

     describe()      → { surface, layouts:[{id,label,group,defaultSeconds}],
                         size:{W,H}, safeZones:{title,caption,footer} }
     configure(spec) → Promise; applies { layout, seconds, date, place,
                         palette, span, lang, … }
     ready()         → boolean
     duration()      → seconds (the surface's own clock)
     beats(lang)     → [{ i, from, to, say }] in the surface's seconds
     facts()         → [{ id, label, value, unit, kind, source }]
     frame(p, ctx)   → draws progress p (0..1) at W×H. Deterministic.

   The Reel Studio surface is first because it already had nearly all of it:
   SPStories.build makes a finished reel object, SPReel.frameAt draws any
   frame of it, SPScript narrates it. The adapter builds its OWN reel rather
   than reading the page's, so it works headless — on reel-agent.html and in
   the daily reel — and never disturbs what the reader has on screen.

   Every surface registers here; window.__bridge is the one for this page. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var REG = {};

  function register(id, factory) { REG[id] = factory; }
  function make(id) { return REG[id] ? REG[id]() : null; }
  function list() { return Object.keys(REG); }

  var W = 1080, H = 1920;

  /* ---- Reel Studio ------------------------------------------------------ */
  function reelStudio() {
    var REEL = null, SPEC = {}, BUSY = false;

    function have() { return !!(window.SPStories && window.SPReel && window.SPScript); }

    function describe() {
      var B = window.SPReel ? window.SPReel.bands(W, H, REEL || {}) : null;
      return {
        surface: "reel-studio",
        label: "Reel Studio",
        layouts: have() ? window.SPStories.TEMPLATES.map(function (t) {
          return { id: t.key, label: t.label, group: t.group, defaultSeconds: t.seconds };
        }) : [],
        size: { W: W, H: H },
        safeZones: B ? {
          title:   { x: W * 0.05, y: B.title.y, w: W * 0.90, h: B.title.h },
          caption: { x: W * 0.06, y: B.cap.y, w: W * 0.88, h: B.cap.h },
          footer:  { x: W * 0.05, y: B.foot.y - H * 0.02, w: W * 0.90, h: H - B.foot.y }
        } : null
      };
    }

    /* spec.seconds is the length the reader asked for; the reel is built at
       least as long as its own narration needs, so no line has to be
       stretched past the 4× the renderer allows */
    function configure(spec) {
      spec = spec || {};
      if (!have()) return Promise.reject(new Error("Reel Studio engines are not on this page"));
      var T = window.SPStories.byKey(spec.layout);
      if (!T) return Promise.reject(new Error("unknown layout " + spec.layout));
      BUSY = true;
      return new Promise(function (res, rej) {
        setTimeout(function () {
          try {
            var opt = { t0: spec.date ? +new Date(spec.date) : Date.now(),
                        years: spec.span || T.years, palette: spec.palette || "gold",
                        place: spec.place || null };
            opt.seconds = spec.seconds || T.seconds;
            var R = window.SPStories.build(spec.layout, opt);
            if (R && spec.lang) {
              var want = window.SPScript.suggestSeconds(R, spec.lang);
              if (want && want > opt.seconds * 1.05) {
                opt.seconds = Math.min(180, Math.ceil(want));
                R = window.SPStories.build(spec.layout, opt) || R;
              }
            }
            if (!R) throw new Error("that span produced too few events to make a reel");
            REEL = R; SPEC = spec; BUSY = false;
            res(describe());
          } catch (e) { BUSY = false; rej(e); }
        }, 0);
      });
    }

    function ready() { return !!REEL && !BUSY; }
    function duration() { return REEL ? REEL.seconds : 0; }

    /* beats in the surface's seconds. Hindi falls back to the festival
       writer where the engine has no Hindi of its own; `english` marks a
       beat whose text is still not in the language asked for. */
    function beats(lang) {
      if (!REEL) return [];
      lang = lang || "hi";
      var r = window.SPScript.render(REEL, lang);
      var B = r.beats.map(function (b, i) {
        return { i: i, from: b.from, to: b.to, secs: b.secs, say: b.say, need: b.need };
      });
      if (lang === "hi") {
        var hiL = RA.hi && RA.hi.festLines(REEL, B);
        if (hiL) B.forEach(function (b, i) { b.say = hiL[i]; b.need = window.SPScript.readSecs(b.say, "hi"); });
        /* the other English-only sets, sentence by sentence (ra-hi.js line) */
        else B.forEach(function (b) {
          var h = RA.hi.line && RA.hi.line(b.say);
          if (h) { b.say = h; b.need = window.SPScript.readSecs(h, "hi"); }
        });
        B.forEach(function (b) { b.english = !!b.say && RA.hi.devanagariShare(b.say) < 0.5; });
      }
      return B;
    }

    function facts() {
      if (!REEL) return [];
      var F = RA.facts, out = F.FRAMEWORK.slice();
      var R = REEL, k;
      out.push({ id: "layout", label: "layout", value: R.key, unit: "", kind: "name", source: "engine" });
      out.push({ id: "title", label: "title", value: R.title, unit: "", kind: "name", source: "engine" });
      if (R.method) {
        out.push({ id: "method", label: "method", value: R.method, unit: "", kind: "name", source: "engine" });
        out = out.concat(F.harvest("method", "method", R.method));
      }
      var ay = window.__ayanName ? window.__ayanName() : null;
      if (ay) out.push({ id: "ayanamsa", label: "ayanāṃśa", value: ay, unit: "", kind: "name", source: "settings" });
      if (R.placeName) out.push({ id: "place", label: "place (sky computed for)", value: R.placeName, unit: "", kind: "name", source: "engine" });
      /* the reel's own measured bag: every field, numbers kept as numbers */
      if (R.facts) for (k in R.facts) {
        var v = R.facts[k];
        if (v == null || typeof v === "object" && !Array.isArray(v)) continue;
        if (Array.isArray(v)) v = v.join(" · ");
        var kind = typeof v === "number" ? "number" : /Txt$/.test(k) ? "degree" : "name";
        out.push({ id: "f." + k, label: k, value: v, unit: /lo$|hi$|Lon$|Lat$|Lim$/.test(k) ? "°" : "",
                   kind: kind, source: "engine (reel facts)" });
        if (typeof v === "string") out = out.concat(F.harvest("f." + k, k, v));
      }
      /* events: dates and the numbers each one prints */
      (R.events || []).forEach(function (e, i) {
        if (e.t && e.t > 0) out = out.concat(F.dateFacts("ev" + i, e.t, e.name || "event " + (i + 1)));
        ["big", "small", "note", "rule"].forEach(function (f) {
          if (e[f]) out = out.concat(F.harvest("ev" + i + "." + f, "event " + (i + 1) + " " + f, e[f]));
        });
      });
      /* the engine's own text: title, subtitle, closing, and its narration in
         every language — all computed from the same bag */
      out = out.concat(F.harvest("subtitle", "subtitle", R.subtitle || ""));
      if (R.closing) {
        out = out.concat(F.harvest("closing.big", "closing", R.closing.big || ""));
        (R.closing.lines || []).forEach(function (l, i) { out = out.concat(F.harvest("closing." + i, "closing", l || "")); });
      }
      ["hi", "hinglish", "en"].forEach(function (lang) {
        var r = window.SPScript.render(R, lang);
        r.beats.forEach(function (b, i) { out = out.concat(F.harvest("script." + lang + "." + i, "engine script", b.say)); });
      });
      out.push({ id: "reel.seconds", label: "reel length (s)", value: R.seconds, unit: "s", kind: "number", source: "engine" });
      out.push({ id: "reel.years", label: "span (years)", value: R.years, unit: "years", kind: "number", source: "engine" });
      return out;
    }

    function frame(p, ctx, opts) {
      if (!REEL) return null;
      return window.SPReel.frameAt(ctx, W, H, REEL, p, { text: !!(opts && opts.text) });
    }

    function postCaption(lang) {
      if (!REEL) return "";
      var r = window.SPScript.render(REEL, lang === "hi" ? "hi" : lang);
      return r.caption + "\n\n" + r.tags;
    }

    return { describe: describe, configure: configure, ready: ready, duration: duration,
             beats: beats, facts: facts, frame: frame, postCaption: postCaption,
             title: function () { return REEL ? (RA.hi.title(REEL) || REEL.title) : ""; },
             reel: function () { return REEL; }, spec: function () { return SPEC; } };
  }
  register("reel-studio", reelStudio);

  RA.adapter = { register: register, make: make, list: list, W: W, H: H };
  /* the page's own surface: on any page carrying the Reel Studio engines */
  if (window.SPStories && !window.__bridge) window.__bridge = reelStudio();
})();
;

/* ===== Reel Agent — the script checker ===================================

   Runs in every mode, offline included: an engine template can be wrong too,
   and a check that only ever runs on a model's output is a check that has
   never been tested against a known-good input.

   A script is [{ beats:[a,b], narration, caption }]. It is rejected for:

     number   a number, degree or date not among the facts — read in digits,
              Devanagari digits and spoken Hindi or English number words
     cover    beat ranges that do not cover every beat exactly once, in order
     caption  a caption longer than four words
     fit      a line that cannot fit its beats even stretched 4×

   Each violation names the line, so the editor can mark it. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var MAX_STRETCH = 4, GAP = 0.35;

  function words(s) { return String(s || "").trim().split(/\s+/).filter(Boolean); }

  function readSecs(text, lang) {
    if (window.SPScript && window.SPScript.readSecs) return window.SPScript.readSecs(text, lang);
    return Math.max(1, words(text).length / 2.4);
  }

  /* opts.clips: measured clip seconds per line, when the voice exists */
  function verify(lines, beats, facts, opts) {
    opts = opts || {};
    var V = [], lang = opts.lang || "hi";
    var fv = RA.facts.values(facts);
    var n = beats.length, next = 0;

    (lines || []).forEach(function (L, i) {
      var b = L.beats || [];
      var a = b[0], z = b.length > 1 ? b[1] : b[0];
      /* cover */
      if (!(a === next && z >= a && z < n)) {
        V.push({ line: i, kind: "cover",
                 en: "Line " + (i + 1) + " covers beats " + a + "–" + z + "; expected to start at " + next + ".",
                 hi: "पंक्ति " + (i + 1) + " बीट " + a + "–" + z + " लेती है; " + next + " से शुरू होनी चाहिए।" });
      }
      next = Math.max(next, (isFinite(z) ? z : next) + 1);
      /* numbers */
      RA.facts.numbersIn(L.narration).forEach(function (num) {
        var ok = fv.some(function (f) { return RA.facts.matches(num, f); });
        if (!ok) V.push({ line: i, kind: "number", value: num.v, raw: num.raw,
                          en: "Line " + (i + 1) + ": “" + num.raw + "” is not in the facts.",
                          hi: "पंक्ति " + (i + 1) + ": “" + num.raw + "” तथ्यों में नहीं है।" });
      });
      /* caption */
      if (words(L.caption).length > 4)
        V.push({ line: i, kind: "caption",
                 en: "Line " + (i + 1) + ": caption has " + words(L.caption).length + " words; at most 4.",
                 hi: "पंक्ति " + (i + 1) + ": कैप्शन में " + words(L.caption).length + " शब्द हैं; अधिकतम 4।" });
      /* fit */
      if (a != null && z != null && beats[a] && beats[z]) {
        var span = Math.max(0.05, beats[z].to - beats[a].from);
        var need = (opts.clips && opts.clips[i] != null ? opts.clips[i] : readSecs(L.narration, lang)) + GAP;
        if (need / span > MAX_STRETCH)
          V.push({ line: i, kind: "fit", stretch: need / span,
                   en: "Line " + (i + 1) + " needs " + need.toFixed(1) + " s over " + span.toFixed(1) +
                       " s of picture (" + (need / span).toFixed(1) + "×, limit " + MAX_STRETCH + "×). Shorten it or give it more beats.",
                   hi: "पंक्ति " + (i + 1) + " को " + need.toFixed(1) + " सेकंड चाहिए, दृश्य " + span.toFixed(1) +
                       " सेकंड का है (" + (need / span).toFixed(1) + "×, सीमा " + MAX_STRETCH + "×)। छोटा करें या अधिक बीट दें।" });
      }
    });
    if (next !== n)
      V.push({ line: (lines || []).length - 1, kind: "cover",
               en: "The script covers " + next + " of " + n + " beats.",
               hi: "स्क्रिप्ट " + n + " में से " + next + " बीट ही लेती है।" });
    return { ok: V.length === 0, violations: V };
  }

  /* ---- offline: the engine's own beats as lines -------------------------
     One line per beat; a beat with no text, or too short to carry its line,
     is merged into its neighbour so the 4× limit holds. Captions are the
     first words of the line, at most four, ending on a number if one is
     near the start. */
  /* function words a caption must not end on: "दो सुनहरी रेखाओं के" reads as
     a phrase cut off, which is what the first version produced */
  var TRAIL = /^(के|की|का|में|से|पर|को|ने|है|हैं|था|थे|और|या|एक|यह|वह|जो|भी|तक|of|the|a|an|in|on|to|and|is|are|its|ka|ki|ke|me|se|hai)$/i;
  function captionOf(text) {
    var clean = String(text || "").replace(/[“”"()]/g, "");
    /* clauses, split where a voice would pause */
    /* "4. रोहिणी" is one heading, not a clause "4" and another "रोहिणी":
       a full stop after a bare number is a list mark, not a pause */
    clean = clean.replace(/(^|\s)(\d+)\.\s+/g, "$1$2 ");
    var clauses = clean.split(/\s*[—–;:।?!]\s*|,\s+|\.\s+/).map(function (c) { return words(c); })
                       .filter(function (c) { return c.length > 1 || /[^\d.]/.test(c[0] || ""); });
    if (!clauses.length) return "";
    /* prefer the first clause that carries a number, else the first clause */
    var pick = clauses[0];
    for (var k = 0; k < clauses.length; k++)
      if (clauses[k].some(function (x) { return /[0-9०-९]/.test(x); })) { pick = clauses[k]; break; }
    var take = pick;
    if (take.length > 4) {
      var at = -1;
      for (var i = 0; i < take.length; i++) if (/[0-9०-९]/.test(take[i])) { at = i; break; }
      take = at >= 0 ? take.slice(Math.max(0, Math.min(at - 1, take.length - 4)), Math.max(0, Math.min(at - 1, take.length - 4)) + 4)
                     : take.slice(0, 4);
    }
    while (take.length > 1 && TRAIL.test(take[take.length - 1].replace(/[,.।]+$/, ""))) take = take.slice(0, -1);
    while (take.length > 1 && TRAIL.test(take[0])) take = take.slice(1);
    return take.join(" ").replace(/[,।.;:]+$/, "");
  }
  function linesFromBeats(beats, lang) {
    var L = [];
    beats.forEach(function (b, i) {
      var say = (b.say || "").trim();
      var last = L[L.length - 1];
      if (!say && last) { last.beats[1] = i; return; }
      L.push({ beats: [i, i], narration: say, caption: captionOf(say) });
    });
    /* merge forward until every line fits */
    var guard = 0, changed = true;
    while (changed && guard++ < 50) {
      changed = false;
      for (var k = 0; k < L.length; k++) {
        var x = L[k], span = beats[x.beats[1]].to - beats[x.beats[0]].from;
        var need = readSecs(x.narration, lang) + GAP;
        if (need / Math.max(0.05, span) > MAX_STRETCH && x.beats[1] < beats.length - 1) {
          var nx = L[k + 1];
          if (nx && !nx.narration) { x.beats[1] = nx.beats[1]; L.splice(k + 1, 1); changed = true; break; }
          if (nx) { x.beats[1] = nx.beats[0]; nx.beats[0]++; if (nx.beats[0] > nx.beats[1]) { x.narration += " " + nx.narration; x.beats[1] = nx.beats[1]; L.splice(k + 1, 1); } changed = true; break; }
        }
      }
    }
    if (L.length && L[0].beats[0] !== 0) L[0].beats[0] = 0;
    return L;
  }

  RA.verify = { verify: verify, linesFromBeats: linesFromBeats, captionOf: captionOf,
                MAX_STRETCH: MAX_STRETCH, GAP: GAP, readSecs: readSecs };
})();
;

/* ===== Reel Agent — voice ================================================

   One interface, several providers:  synth(text, {lang, voice}) → AudioBuffer

     system   desktop app only: the operating system's own offline voice,
              through the Rust command tts_system (macOS `say`, Windows
              SpeechSynthesis). Nothing leaves the machine.
     upload   the reader's own recording of the whole reel (sp-voice.js
              decodes it); split into one clip per line at the longest pauses
     silent   no voice: each line gets the time it would take to read, so the
              captions still pace like speech
     mock     a tone of a known length — the test harness only
     gemini-tts / elevenlabs   Connected mode (ra-providers.js)

   One clip per line, cached in IndexedDB by hash(provider+model+voice+text),
   so editing one line and pressing Re-voice re-synthesises one line.

   The pronunciation lexicon is applied to the text sent to a synthesiser
   and never to what is shown on screen. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var RATE = 48000;
  var CTX = null;
  function ctx() {
    if (CTX) return CTX;
    var C = window.AudioContext || window.webkitAudioContext;
    CTX = C ? new C({ sampleRate: RATE }) : null;
    return CTX;
  }
  function blank(seconds) {
    var n = Math.max(1, Math.round(seconds * RATE));
    if (typeof AudioBuffer !== "undefined") {
      try { return new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: RATE }); } catch (e) {}
    }
    var c = ctx(); return c ? c.createBuffer(1, n, RATE) : null;
  }
  function decode(bytes) {
    var c = ctx();
    if (!c) return Promise.reject(new Error("no Web Audio in this browser"));
    var buf = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer;
    return new Promise(function (res, rej) { c.decodeAudioData(buf.slice(0), res, rej); });
  }
  function fromPCM(f32, rate) {
    var b = blank(f32.length / (rate || RATE));
    var d = b.getChannelData(0);
    if ((rate || RATE) === RATE) d.set(f32.subarray(0, d.length));
    else for (var i = 0; i < d.length; i++) d[i] = f32[Math.min(f32.length - 1, Math.floor(i * rate / RATE))] || 0;
    return b;
  }

  /* ---- what is actually spoken ------------------------------------------ */
  var LEX = {};
  function setLexicon(map) { LEX = map || {}; }
  function spoken(text, lang) {
    var s = text || "";
    if (window.SPScript && window.SPScript.speakable) s = window.SPScript.speakable(s, lang === "hinglish" ? "hinglish" : lang);
    Object.keys(LEX).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      s = s.split(k).join(LEX[k]);
    });
    return s;
  }

  /* ---- providers -------------------------------------------------------- */
  var P = {};

  P.silent = {
    id: "silent", offline: true,
    synth: function (text, o) {
      var secs = Math.max(1.2, RA.verify.readSecs(text, o.lang));
      return Promise.resolve(blank(secs));
    }
  };

  /* deterministic: length grows with the text, so the test can predict it */
  P.mock = {
    id: "mock", offline: true,
    synth: function (text, o) {
      var secs = Math.round((0.8 + String(text).length * 0.045) * 100) / 100;
      var b = blank(secs), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = 0.25 * Math.sin(2 * Math.PI * 330 * i / RATE);
      return Promise.resolve(b);
    }
  };

  P.system = {
    id: "system", offline: true,
    available: function () { return RA.core.inApp(); },
    voices: function () { return RA.core.invoke("tts_list_voices", {}); },
    synth: function (text, o) {
      return RA.core.invoke("tts_system", { text: text, voice: o.systemVoice || "" })
        .then(function (bytes) { return decode(bytes); });
    }
  };

  /* the upload provider holds the whole decoded file and is asked for all
     lines at once (splitFor), because the reader recorded one take */
  var UPLOAD = null;
  P.upload = {
    id: "upload", offline: true, whole: true,
    set: function (buf) { UPLOAD = buf; },
    has: function () { return !!UPLOAD || !!(window.SPVoice && window.SPVoice.buffer && window.SPVoice.buffer()); },
    buffer: function () { return UPLOAD || (window.SPVoice && window.SPVoice.buffer ? window.SPVoice.buffer() : null); },
    load: function (file) {
      return file.arrayBuffer().then(decode).then(function (b) { UPLOAD = b; return b; });
    }
  };

  /* ---- split one take into N clips at the N-1 longest pauses ------------ */
  function splitFor(buf, n, weights) {
    var d = buf.getChannelData(0), rate = buf.sampleRate, win = Math.round(rate * 0.02);
    var env = [], i, k;
    for (i = 0; i < d.length; i += win) {
      var s = 0, m = Math.min(d.length, i + win);
      for (k = i; k < m; k++) s += d[k] * d[k];
      env.push(Math.sqrt(s / Math.max(1, m - i)));
    }
    var peak = Math.max.apply(null, env.concat([1e-6])), thr = peak * 0.04;
    /* runs of quiet windows, each with its centre and length */
    var runs = [], st = -1;
    for (i = 0; i <= env.length; i++) {
      var q = i < env.length && env[i] < thr;
      if (q && st < 0) st = i;
      if (!q && st >= 0) { if (i - st >= 8) runs.push({ c: (st + i) / 2, len: i - st }); st = -1; }
    }
    /* expected boundary positions from the text lengths; take the longest
       pause near each, so a long breath inside a sentence is not chosen over
       a shorter one between two */
    var tot = weights.reduce(function (a, b) { return a + b; }, 0) || 1, acc = 0, cuts = [];
    for (k = 0; k < n - 1; k++) {
      acc += weights[k];
      var want = acc / tot * env.length, best = null, bs = -1;
      runs.forEach(function (r) {
        if (cuts.length && r.c <= cuts[cuts.length - 1]) return;
        var sc = r.len / (1 + Math.abs(r.c - want) / (env.length * 0.08));
        if (sc > bs) { bs = sc; best = r; }
      });
      cuts.push(best ? best.c : want);
    }
    var edges = [0].concat(cuts.map(function (c) { return Math.round(c * win); }), [d.length]);
    var out = [];
    for (k = 0; k < n; k++) {
      var a = edges[k], z = Math.max(a + 1, edges[k + 1]), c = blank((z - a) / rate);
      if (rate !== RATE) { out.push(fromPCM(d.subarray(a, z), rate)); continue; }
      c.getChannelData(0).set(d.subarray(a, z));
      out.push(c);
    }
    return out;
  }

  /* ---- cache ------------------------------------------------------------ */
  function key(provider, o, text) {
    return RA.core.sha256([provider, o.model || "", o.voice || "", o.systemVoice || "", o.lang || "", text].join("|"));
  }
  function cached(k) {
    return RA.core.store.get("clips", k).then(function (v) {
      return v && v.pcm ? fromPCM(new Float32Array(v.pcm), v.rate) : null;
    });
  }
  function keep(k, buf) {
    var pcm = buf.getChannelData(0).slice(0);
    return RA.core.store.put("clips", { pcm: pcm.buffer, rate: buf.sampleRate, at: Date.now() }, k);
  }

  /* Re-voice: the next synthesis of exactly this text skips the cache */
  var BUST = {};
  function bust(text, lang) { BUST[spoken(text || "", lang)] = 1; }

  /* synthesise every line; returns [{ buffer, seconds }] in order.
     onLine(i, n) reports progress. */
  function voiceLines(lines, o, onLine) {
    o = o || {};
    var prov = P[o.provider || "silent"];
    if (!prov) return Promise.reject(new Error("unknown voice provider " + o.provider));
    if (prov.network) RA.net.assert(prov.id + " voice");
    if (prov.whole) {
      var b = prov.buffer();
      if (!b) return Promise.reject(new Error("no voice file loaded"));
      var parts = splitFor(b, lines.length, lines.map(function (l) { return Math.max(1, (l.narration || "").length); }));
      return Promise.resolve(parts.map(function (x) { return { buffer: x, seconds: x.duration }; }));
    }
    var out = [], i = 0;
    function next() {
      if (i >= lines.length) return Promise.resolve(out);
      var L = lines[i], text = spoken(L.narration || "", o.lang);
      if (onLine) onLine(i, lines.length);
      if (!text.trim()) { out.push({ buffer: blank(0.6), seconds: 0.6 }); i++; return next(); }
      var useCache = prov.id !== "mock" && prov.id !== "silent" && !BUST[text];
      delete BUST[text];
      return key(prov.id, o, text).then(function (k) {
        return (useCache ? cached(k) : Promise.resolve(null)).then(function (hit) {
          if (hit) return hit;
          return prov.synth(text, o).then(function (buf) {
            if (useCache) keep(k, buf);
            return buf;
          });
        });
      }).then(function (buf) {
        out.push({ buffer: buf, seconds: buf.duration }); i++; return next();
      });
    }
    return next();
  }

  function providers() {
    var o = [{ id: "silent", label: RA.core.t("silent") }];
    if (P.system.available()) o.unshift({ id: "system", label: RA.core.t("system") });
    o.push({ id: "upload", label: RA.core.t("upload") });
    Object.keys(P).forEach(function (k) {
      if (P[k].network && RA.net.allowed()) o.push({ id: k, label: P[k].label || k });
    });
    return o;
  }

  RA.voice = { P: P, voiceLines: voiceLines, providers: providers, splitFor: splitFor,
               decode: decode, blank: blank, fromPCM: fromPCM, spoken: spoken,
               setLexicon: setLexicon, bust: bust, RATE: RATE };
})();
;

/* ===== Reel Agent — loudness =============================================

   Integrated loudness by ITU-R BS.1770-4, written here rather than imported:
   K-weighting (a high shelf and a high-pass, the standard's own 48 kHz
   coefficients), mean square over 400 ms blocks every 100 ms, an absolute
   gate at −70 LUFS and a relative gate 10 LU below the ungated mean.

   Reels are normalised to about −14 LUFS, where the platforms that would
   play them normalise anyway — a quieter file is turned up with its noise,
   a louder one is turned down after its peaks have already been clipped.
   The ceiling is a sample peak of −1 dBFS: a true-peak meter would
   oversample, and the difference here is a fraction of a decibel. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  function biquad(x, b, a) {
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  var S1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
  var S2 = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

  /* data: Float32Array mono at 48 kHz → LUFS (−Infinity for silence) */
  function lufs(data, rate) {
    rate = rate || 48000;
    var k = biquad(biquad(data, S1.b, S1.a), S2.b, S2.a);
    var blk = Math.round(0.4 * rate), hop = Math.round(0.1 * rate), z = [];
    for (var s = 0; s + blk <= k.length; s += hop) {
      var m = 0;
      for (var i = s; i < s + blk; i++) m += k[i] * k[i];
      z.push(m / blk);
    }
    if (!z.length) return -Infinity;
    function L(v) { return -0.691 + 10 * Math.log10(v); }
    var abs = z.filter(function (v) { return v > 0 && L(v) > -70; });
    if (!abs.length) return -Infinity;
    var mean = abs.reduce(function (a, b) { return a + b; }, 0) / abs.length;
    var rel = L(mean) - 10;
    var g = abs.filter(function (v) { return L(v) > rel; });
    var m2 = g.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, g.length);
    return L(m2);
  }

  /* normalise in place; returns { before, after, gainDb, peakDb } */
  function normalise(data, rate, target, ceilingDb) {
    target = target == null ? -14 : target;
    ceilingDb = ceilingDb == null ? -1 : ceilingDb;
    var before = lufs(data, rate);
    if (!isFinite(before)) return { before: before, after: before, gainDb: 0, peakDb: -Infinity };
    var gainDb = target - before, peak = 0, i;
    for (i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    var peakAfter = 20 * Math.log10(peak || 1e-9) + gainDb;
    if (peakAfter > ceilingDb) gainDb -= (peakAfter - ceilingDb);
    var g = Math.pow(10, gainDb / 20);
    for (i = 0; i < data.length; i++) data[i] *= g;
    return { before: before, after: lufs(data, rate), gainDb: gainDb,
             peakDb: 20 * Math.log10(peak * g || 1e-9) };
  }

  RA.loudness = { lufs: lufs, normalise: normalise };
})();
;

/* ===== Reel Agent — sync, compose and encode =============================

   THE TIME MAP. A surface plays on its own clock; a narrated reel has to play
   on the voice's. Each line covers surface time [beat a.from, beat b.to], and
   that span is stretched linearly to exactly clip + 0.35 s of output, so the
   picture arrives where the sentence does and the next sentence starts on
   its own beat. A 1.5 s hold on the last frame ends the reel. The output is
   therefore Σclips + 0.35·lines + 1.5 seconds long, which the test asserts
   against the finished file to within one frame.

   THE FRAME. The surface draws its picture without its own type; this file
   lays over it, inside the surface's safe zones: the Hindi title, a caption
   pill with its key word picked out, an optional hook card for the first
   1.2 s, and an end card with the handle. Nothing here is random, so a frame
   at a given time is the same frame every time it is drawn.

   THE SOUND. Clips are placed on the same timeline in plain sample arrays —
   deterministic, and no AudioContext needed — music is laid under them and
   ducked about 12 dB while anyone speaks, and the mix is normalised to about
   −14 LUFS (ra-loudness.js).

   THE FILE. sp-encode.js writes it: WebCodecs, frames stamped n/fps, H.264 +
   AAC in MP4 where the browser has them, VP9 + Opus in WebM where it does
   not — and the panel says which. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var GAP = 0.35, TAIL = 1.5, HOOK = 1.2, FPS = 30, RATE = 48000;
  var DEVA = "'Noto Sans Devanagari','Kohinoor Devanagari','Nirmala UI','Mangal','Devanagari Sangam MN',sans-serif";

  /* ---- the time map ----------------------------------------------------- */
  function plan(lines, beats, clips) {
    var segs = [], U = 0;
    lines.forEach(function (L, i) {
      var a = L.beats[0], z = L.beats[1];
      var len = clips[i] + GAP;
      segs.push({ i: i, from: beats[a].from, to: beats[z].to, U: U, L: len, clip: clips[i] });
      U += len;
    });
    return { segs: segs, body: U, T: U + TAIL, gap: GAP, tail: TAIL };
  }
  function surfaceTime(P, u) {
    var S = P.segs;
    if (!S.length) return 0;
    if (u >= P.body) return S[S.length - 1].to;
    for (var k = S.length - 1; k >= 0; k--) if (u >= S[k].U) {
      var s = S[k], f = (u - s.U) / s.L;
      return s.from + f * (s.to - s.from);
    }
    return S[0].from;
  }
  function segAt(P, u) {
    for (var k = P.segs.length - 1; k >= 0; k--) if (u >= P.segs[k].U) return P.segs[k];
    return P.segs[0];
  }

  /* ---- drawing helpers -------------------------------------------------- */
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function wrap(c, text, maxW) {
    var words = String(text || "").split(/\s+/), out = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }
  function keyWord(words) {
    for (var i = 0; i < words.length; i++) if (/[0-9०-९°]/.test(words[i])) return i;
    var best = 0;
    words.forEach(function (w, i) { if (w.length > words[best].length) best = i; });
    return best;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ---- one output frame at time u --------------------------------------- */
  /* A surface may draw synchronously (canvas pages) or hand back a promise
     (SVG pages, which must be rasterised through an <img>). compose returns
     the caption boxes in the first case and a promise of them in the
     second, and every caller goes through when() so neither has to care. */
  function when(x, f) { return x && typeof x.then === "function" ? x.then(f) : f(x); }
  function compose(c, u, st) {
    var A = st.adapter, P = st.plan;
    var D = A.duration() || 1;
    var r = A.frame(Math.max(0, Math.min(1, surfaceTime(P, u) / D)), c, { text: false });
    return when(r, function () { return overlay(c, u, st); });
  }
  function overlay(c, u, st) {
    var Z = st.zones, W = st.W, H = st.H, P = st.plan;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    var boxes = [];

    /* title */
    if (st.title && Z.title) {
      c.save();
      c.globalAlpha = ease(u / 0.6);
      c.fillStyle = "#e9c46a"; c.textAlign = "center"; c.textBaseline = "middle";
      var fs = Math.round(Z.title.h * 0.46);
      c.font = "700 " + fs + "px " + DEVA;
      while (c.measureText(st.title).width > Z.title.w && fs > 28) { fs -= 4; c.font = "700 " + fs + "px " + DEVA; }
      c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 18;
      c.fillText(st.title, W / 2, Z.title.y + Z.title.h * 0.5);
      c.restore();
    }

    /* caption pill for the line being spoken */
    var s = segAt(P, u);
    if (st.captions && s && u < P.body && Z.caption) {
      var L = st.lines[s.i], cap = (L.caption || "").trim();
      if (cap) {
        var inT = ease((u - s.U) / 0.18), outT = ease((s.U + s.L - u) / 0.18);
        var words = cap.split(/\s+/), kw = keyWord(words);
        c.save();
        var fz = 76; c.font = "700 " + fz + "px " + DEVA;
        var sp = c.measureText(" ").width, widths = words.map(function (w) { return c.measureText(w).width; });
        var tw = widths.reduce(function (a, b) { return a + b; }, 0) + sp * (words.length - 1);
        while (tw > Z.caption.w - 80 && fz > 40) {
          fz -= 4; c.font = "700 " + fz + "px " + DEVA; sp = c.measureText(" ").width;
          widths = words.map(function (w) { return c.measureText(w).width; });
          tw = widths.reduce(function (a, b) { return a + b; }, 0) + sp * (words.length - 1);
        }
        var ph = fz * 1.7, pw = tw + 80;
        var px = Math.round(Z.caption.x + (Z.caption.w - pw) / 2);
        var py = Math.round(Z.caption.y + Z.caption.h * 0.32 - ph / 2 + (1 - inT) * 24);
        c.globalAlpha = Math.min(inT, outT);
        c.fillStyle = "rgba(8,10,20,.78)"; rr(c, px, py, pw, ph, ph / 2); c.fill();
        c.strokeStyle = "rgba(233,196,106,.55)"; c.lineWidth = 3; c.stroke();
        c.textBaseline = "middle"; c.textAlign = "left";
        var x = px + 40;
        words.forEach(function (w, i) {
          c.fillStyle = i === kw ? "#f4c95d" : "#f5f1e8";
          c.fillText(w, x, py + ph / 2 + fz * 0.04);
          x += widths[i] + sp;
        });
        c.restore();
        boxes.push({ x: px, y: py, w: pw, h: ph, line: s.i });
      }
    }

    /* hook card */
    if (st.hook && u < HOOK) {
      var a = 1 - ease((u - (HOOK - 0.35)) / 0.35);
      c.save(); c.globalAlpha = a;
      c.fillStyle = "rgba(4,6,14,.82)"; c.fillRect(0, 0, W, H);
      c.fillStyle = "#e9c46a"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "700 92px " + DEVA;
      var hl = wrap(c, st.hook, W * 0.8);
      hl.forEach(function (ln, i) { c.fillText(ln, W / 2, H * 0.45 + (i - (hl.length - 1) / 2) * 120); });
      c.font = "600 30px " + DEVA; c.fillStyle = "rgba(245,241,232,.7)";
      c.fillText("N I R A Y A N A", W / 2, H * 0.45 - hl.length * 60 - 70);
      c.restore();
    }

    /* end card */
    if (u > P.body) {
      var e = ease((u - P.body) / 0.5);
      c.save(); c.globalAlpha = e * 0.9;
      c.fillStyle = "rgba(4,6,14,.86)"; c.fillRect(0, 0, W, H);
      c.globalAlpha = e;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#e9c46a"; c.font = "700 84px " + DEVA;
      c.fillText(st.handle || "@Nirayana.Soft", W / 2, H * 0.47);
      c.fillStyle = "rgba(245,241,232,.82)"; c.font = "500 40px " + DEVA;
      c.fillText(RA.core.hi("study"), W / 2, H * 0.47 + 96);
      c.restore();
    }
    return boxes;
  }

  /* ---- the sound -------------------------------------------------------- */
  function mix(clips, P, music) {
    var n = Math.ceil(P.T * RATE), out = new Float32Array(n), i, k;
    var voiced = new Uint8Array(Math.ceil(n / 480) + 1);
    P.segs.forEach(function (s, j) {
      var b = clips[j].buffer, d = b.getChannelData(0), at = Math.round(s.U * RATE);
      for (k = 0; k < d.length && at + k < n; k++) out[at + k] += d[k];
      for (k = Math.floor(at / 480); k <= Math.floor((at + d.length) / 480) && k < voiced.length; k++) voiced[k] = 1;
    });
    var stats = null;
    if (music) {
      var md = music.getChannelData(0), base = Math.pow(10, -16 / 20), duck = Math.pow(10, -12 / 20);
      var g = 1, step = 1 / (0.12 * RATE);
      for (i = 0; i < n; i++) {
        var want = voiced[Math.floor(i / 480)] ? duck : 1;
        g += Math.max(-step, Math.min(step, want - g));
        var fade = Math.min(1, i / (0.5 * RATE), (n - i) / (1.2 * RATE));
        out[i] += md[i % md.length] * base * g * fade;
      }
    }
    stats = RA.loudness.normalise(out, RATE, -14, -1);
    /* The audio ends 0.12 s before the picture. An AAC encoder pads its last
       frame (and primes its first), so an audio track exactly as long as the
       video comes out ~0.08 s longer, and an MP4's duration is its longest
       track — measured on the macOS CI job: 35.477 s for a 35.40 s reel. The
       trimmed part is the silent end hold, so nothing audible is lost and the
       file is as long as the picture in both containers. */
    var keep = Math.max(1, n - Math.round(0.12 * RATE));
    var buf = RA.voice.blank(keep / RATE);
    buf.getChannelData(0).set(out.subarray(0, keep));
    return { buffer: buf, loudness: stats };
  }

  /* ---- side files ------------------------------------------------------- */
  function ts(s) {
    var ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60,
        x = Math.floor(ms / 1000) % 60, r = ms % 1000;
    function p(v, w) { return ("000" + v).slice(-w); }
    return p(h, 2) + ":" + p(m, 2) + ":" + p(x, 2) + "," + p(r, 3);
  }
  function srt(lines, P) {
    return P.segs.map(function (s, j) {
      return (j + 1) + "\n" + ts(s.U) + " --> " + ts(s.U + s.clip) + "\n" + (lines[s.i].narration || "") + "\n";
    }).join("\n");
  }
  function thumbnail(st) {
    var W = st.W, H = st.H, small = document.createElement("canvas");
    small.width = 108; small.height = 192;
    var big = document.createElement("canvas"); big.width = W; big.height = H;
    var bc = big.getContext("2d"), best = null, bestScore = -1;
    var segs = st.plan.segs.slice();
    function score(u) {
      return when(compose(bc, u, { adapter: st.adapter, zones: st.zones, W: W, H: H, plan: st.plan, lines: st.lines, captions: false }), function () {
        var sc = small.getContext("2d"); sc.drawImage(big, 0, 0, 108, 192);
        var d = sc.getImageData(0, 0, 108, 192).data, n = 0;
        for (var i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 180) n++;
        if (n > bestScore) { bestScore = n; best = u; }
      });
    }
    function each(k) {
      if (k >= segs.length) return null;
      return when(score(segs[k].U + segs[k].L * 0.6), function () { return each(k + 1); });
    }
    return Promise.resolve(each(0)).then(function () {
      return compose(bc, best || 0, { adapter: st.adapter, zones: st.zones, W: W, H: H, plan: st.plan, lines: st.lines,
                                      captions: false, title: st.title });
    }).then(function () { return finishThumb(bc, big, st, W, H); });
  }
  function finishThumb(bc, big, st, W, H) {
    var hook = st.hook || st.title || "";
    if (hook) {
      bc.save();
      var g = bc.createLinearGradient(0, H * 0.55, 0, H);
      g.addColorStop(0, "rgba(4,6,14,0)"); g.addColorStop(1, "rgba(4,6,14,.92)");
      bc.fillStyle = g; bc.fillRect(0, H * 0.55, W, H * 0.45);
      bc.fillStyle = "#f4c95d"; bc.textAlign = "center"; bc.textBaseline = "middle";
      bc.font = "800 104px " + DEVA;
      var hl = wrap(bc, hook, W * 0.86);
      hl.forEach(function (ln, i) { bc.fillText(ln, W / 2, H * 0.80 + (i - (hl.length - 1) / 2) * 128); });
      bc.restore();
    }
    return new Promise(function (res) { big.toBlob(function (b) { res(b); }, "image/jpeg", 0.88); });
  }

  /* read the finished file's duration back — the number the reel is held to */
  function readDuration(blob) {
    return new Promise(function (res) {
      var v = document.createElement("video"), url = URL.createObjectURL(blob), done = false;
      function fin(d) { if (done) return; done = true; URL.revokeObjectURL(url); res(d); }
      v.preload = "metadata"; v.muted = true;
      v.onloadedmetadata = function () {
        if (isFinite(v.duration)) return fin(v.duration);
        v.currentTime = 1e7;
        v.ontimeupdate = function () { fin(v.duration); };
      };
      v.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 8000);
      v.src = url;
    });
  }

  /* ---- the whole run ----------------------------------------------------
     spec: { adapter, layout, lang, seconds, voice:{provider, voice,
             systemVoice}, captions, hook, music (AudioBuffer|null),
             lines (optional — an edited script), date, place, palette }
     hooks: { step(key), progress(0..1), line(i,n) } */
  function run(spec, hooks) {
    hooks = hooks || {};
    var step = hooks.step || function () {}, prog = hooks.progress || function () {};
    var A = spec.adapter, lang = spec.lang || "hi", out = { lang: lang };
    step("s_layout");
    return A.configure({ layout: spec.layout, seconds: spec.seconds, lang: lang, date: spec.date,
                         place: spec.place, palette: spec.palette, span: spec.span })
    .then(function (desc) {
      out.layout = spec.layout; out.desc = desc;
      step("s_facts");
      out.facts = A.facts();
      out.beats = A.beats(lang);
      step("s_script");
      out.lines = spec.lines ? spec.lines.map(function (l) { return { beats: l.beats.slice(), narration: l.narration, caption: l.caption }; })
                             : RA.verify.linesFromBeats(out.beats, lang);
      out.english = out.beats.some(function (b) { return b.english; });
      step("s_check");
      var v = RA.verify.verify(out.lines, out.beats, out.facts, { lang: lang });
      out.violations = v.violations;
      if (!v.ok && !spec.force) {
        var e = new Error("The script did not pass the fact check.");
        e.violations = v.violations; e.result = out; throw e;
      }
      step("s_voice");
      return RA.voice.voiceLines(out.lines, { provider: spec.voice && spec.voice.provider || "silent",
                                              voice: spec.voice && spec.voice.voice, lang: lang,
                                              systemVoice: spec.voice && spec.voice.systemVoice,
                                              model: spec.voice && spec.voice.model }, hooks.line);
    })
    .then(function (clips) {
      out.clips = clips.map(function (c) { return c.seconds; });
      /* the measured clips can still break the 4× rule a reading-time
         estimate passed: check again with what was actually spoken */
      var v2 = RA.verify.verify(out.lines, out.beats, out.facts, { lang: lang, clips: out.clips });
      out.violations = v2.violations;
      if (!v2.ok && !spec.force) { var e = new Error("A voiced line does not fit its picture."); e.violations = v2.violations; e.result = out; throw e; }
      out.plan = plan(out.lines, out.beats, out.clips);
      out.expected = out.plan.T;
      var m = mix(clips, out.plan, spec.music || null);
      out.loudness = m.loudness;
      step("s_render");
      var W = A.describe().size.W, H = A.describe().size.H;
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var c = cv.getContext("2d");
      var st = { adapter: A, zones: A.describe().safeZones, W: W, H: H, plan: out.plan, lines: out.lines,
                 captions: spec.captions !== false, hook: spec.hook === false ? null : (spec.hookText || (A.title ? A.title() : null) || (out.lines[0] && out.lines[0].caption) || null),
                 title: A.title ? A.title() : null, handle: spec.handle || RA.core.settings().handle };
      out.boxes = [];
      out.zones = st.zones;
      var every = Math.max(1, Math.round(FPS / 2)), fi = 0;
      return window.SPEncode.encode(cv, {
        seconds: out.plan.T, fps: FPS, audio: m.buffer, onProgress: prog,
        drawAt: function (p) {
          return when(compose(c, p * out.plan.T, st), function (b) {
            if (fi++ % every === 0 && b && b.length) out.boxes.push(b[0]);
          });
        }
      }).then(function (r) {
        if (!r || r.cancelled) { var e = new Error("cancelled"); e.cancelled = true; throw e; }
        out.file = r; out.blob = r.blob; out.mime = r.mime;
        out.ext = r.container === "mp4" ? "mp4" : "webm";
        return Promise.all([readDuration(r.blob), thumbnail(st)]);
      }).then(function (x) {
        out.duration = x[0]; out.thumb = x[1];
        out.srt = srt(out.lines, out.plan);
        out.caption = (A.postCaption ? A.postCaption(lang) : "") + "\n\n" + RA.core.hi("study") + "\n" + RA.core.en("study");
        out.title = st.title;
        step("s_done");
        return out;
      });
    }).then(function (o) { release(A); return o; }, function (e) { release(A); throw e; });
  }
  /* a surface that borrowed the page (the ceremony, the ayanāṃśa rings)
     puts it back, whether the reel was made or not */
  function release(A) { if (A && A.release) try { A.release(); } catch (e) {} }

  function cancel() { if (window.SPEncode) window.SPEncode.cancel(); }

  RA.render = { plan: plan, surfaceTime: surfaceTime, compose: compose, when: when, mix: mix, srt: srt,
                thumbnail: thumbnail, readDuration: readDuration, run: run, cancel: cancel,
                GAP: GAP, TAIL: TAIL, FPS: FPS, DEVA: DEVA };
})();
;

/* ===== Reel Agent — the desktop app's native pieces ======================

   Thin wrappers over the Tauri commands in src-tauri/src/reel_agent.rs, with
   the web's own behaviour as the fallback when the page is not in the app.

   A finished reel is tens of megabytes, so it crosses into Rust as the raw
   request body (an ArrayBuffer), never as a JSON array of numbers, and its
   suggested name rides in a header.

   SHARE. The macOS share sheet and the Windows share UI need platform code
   that this build does not carry yet; until it does, "Share" in the app saves
   the file and shows it in Finder / Explorer, from where it can be shared.
   The panel's label says "Show in folder" there, so the button does what it
   says. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var LAST = null;

  function saveFile(blob, name) {
    return blob.arrayBuffer().then(function (buf) {
      return window.__TAURI_INTERNALS__.invoke("save_file", new Uint8Array(buf),
        { headers: { "x-name": encodeURIComponent(name) } });
    }).then(function (path) { if (path) LAST = path; return path; });
  }
  function reveal(path) {
    return RA.core.invoke("reveal_in_folder", { path: path || LAST });
  }
  /* save, then show it — the closest honest thing to a share sheet for now */
  function share(blob, name) {
    return saveFile(blob, name).then(function (p) { return p ? reveal(p) : null; });
  }

  RA.native = { saveFile: saveFile, reveal: reveal, share: share, last: function () { return LAST; } };
})();
;

/* ===== Reel Agent — the reader's own API keys ============================

   Nirayana has no key of its own. Connected mode works only with a key the
   reader brings, for the provider they choose.

   DESKTOP. The key goes to the operating system's keychain through Rust
   (keychain_set) the moment it is typed, and the page can never read it back:
   keychain_get answers only whether one is stored and its last four
   characters. Every request is made by Rust (ai_request), which reads the key
   itself, so after the first keystroke the key never re-enters the webview.

   WEBSITE. There is no keychain a page can use, so the key is kept in this
   browser's localStorage — after a warning the reader has to accept, and with
   a Forget button beside it. That is said plainly in the panel and in the
   README, because it is the weaker of the two. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var PFX = "nirayana.reelAgent.key.";
  var PROVIDERS = {
    anthropic:  { label: "Claude (Anthropic)", host: "api.anthropic.com", console: "platform.claude.com" },
    gemini:     { label: "Gemini (Google)", host: "generativelanguage.googleapis.com", console: "aistudio.google.com" },
    elevenlabs: { label: "ElevenLabs (voice only)", host: "api.elevenlabs.io", console: "elevenlabs.io" }
  };

  function app() { return RA.core.inApp(); }

  /* → Promise<{ stored, hint }> — never the key itself */
  function status(p) {
    if (app()) return RA.core.invoke("keychain_get", { provider: p }).then(function (r) {
      return { stored: !!(r && r.stored), hint: r && r.hint || "" };
    }).catch(function () { return { stored: false, hint: "" }; });
    var k = null;
    try { k = localStorage.getItem(PFX + p); } catch (e) {}
    return Promise.resolve({ stored: !!k, hint: k ? "…" + k.slice(-4) : "" });
  }
  function set(p, key) {
    key = String(key || "").trim();
    if (!PROVIDERS[p]) return Promise.reject(new Error("unknown provider " + p));
    if (!key) return Promise.reject(new Error("empty key"));
    if (app()) return RA.core.invoke("keychain_set", { provider: p, key: key });
    try { localStorage.setItem(PFX + p, key); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(true);
  }
  function forget(p) {
    if (app()) return RA.core.invoke("keychain_delete", { provider: p });
    try { localStorage.removeItem(PFX + p); } catch (e) {}
    return Promise.resolve(true);
  }
  /* website only: the fetch needs the key in the page */
  function webKey(p) {
    if (app()) return null;
    try { return localStorage.getItem(PFX + p); } catch (e) { return null; }
  }

  RA.keys = { PROVIDERS: PROVIDERS, status: status, set: set, forget: forget, webKey: webKey };
})();
;

/* ===== Reel Agent — AI providers (Connected mode only) ===================

   Two tool-use dialects behind one shape, so ra-agent.js never knows which it
   is talking to:

     neutral message  { role: "user"|"assistant", text?, calls?, results?, raw? }
     neutral reply    { text, calls:[{ id, name, input }], usage:{ in, out }, stop }

   Anthropic Messages API (tool use) and the Gemini API (function calling).
   An assistant turn keeps its provider's own content as `raw` and is sent
   back verbatim, because Gemini requires its thought signatures returned
   unchanged and Anthropic its tool_use blocks.

   EVERY REQUEST PASSES THREE GATES before it exists:
     1. RA.net.assert — Connected mode must be on;
     2. privacy() — the body may not carry a chart or birth field, nor any
        value from the chart stored in this browser (its name, date, place);
     3. the host is one of three, fixed here and, in the desktop app, fixed
        again in Rust.

   In the desktop app the request is made by Rust (ai_request), which reads
   the key from the keychain itself; on the website it is a direct fetch. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var HOSTS = { anthropic: "https://api.anthropic.com", gemini: "https://generativelanguage.googleapis.com",
                elevenlabs: "https://api.elevenlabs.io" };

  /* ---- privacy ---------------------------------------------------------- */
  var FIELD = /"(dob|tob|birth\w*|janma\w*|latitude|longitude|lat|lon|lng|tz|timezone|natal\w*|kundli\w*|kundali\w*|chart_?(name|id|input)|person\w*)"\s*:/i;
  function chartValues() {
    var v = [];
    try {
      var c = JSON.parse(localStorage.getItem("learnhoro.chart") || "null");
      var walk = function (o, d) {
        if (!o || d > 3) return;
        Object.keys(o).forEach(function (k) {
          var x = o[k];
          if (typeof x === "string" && x.length >= 4 && /name|place|city|date|time|dob|tob|birth/i.test(k)) v.push(x);
          else if (typeof x === "object") walk(x, d + 1);
        });
      };
      walk(c, 0);
    } catch (e) {}
    return v;
  }
  function privacy(body) {
    var s = typeof body === "string" ? body : JSON.stringify(body);
    var m = FIELD.exec(s);
    if (m) throw new Error("Refused: the request would carry a chart or birth field (“" + m[1] + "”). Nothing was sent.");
    chartValues().forEach(function (x) {
      if (s.indexOf(x) >= 0) throw new Error("Refused: the request would carry a detail of the chart stored in this browser. Nothing was sent.");
    });
    return s;
  }

  /* ---- transport -------------------------------------------------------- */
  function send(provider, path, body, opts) {
    RA.net.assert(provider + " request");
    var json = privacy(body);
    opts = opts || {};
    if (RA.core.inApp()) {
      return RA.core.invoke("ai_request", { provider: provider, path: path, body: json, method: opts.method || "POST" })
        .then(function (r) { return typeof r === "string" ? JSON.parse(r) : r; });
    }
    var key = RA.keys.webKey(provider);
    if (!key) return Promise.reject(new Error("No " + provider + " key stored in this browser."));
    var h = { "content-type": "application/json" };
    if (provider === "anthropic") {
      h["x-api-key"] = key; h["anthropic-version"] = "2023-06-01";
      h["anthropic-dangerous-direct-browser-access"] = "true";
    } else if (provider === "gemini") h["x-goog-api-key"] = key;
    else if (provider === "elevenlabs") h["xi-api-key"] = key;
    var init = { method: opts.method || "POST", headers: h };
    if ((opts.method || "POST") !== "GET") init.body = json;
    return fetch(HOSTS[provider] + path, init).then(function (r) {
      if (opts.binary && r.ok) return r.arrayBuffer();
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (!r.ok) throw new Error(provider + " " + r.status + ": " + (j && (j.error && (j.error.message || j.error.type)) || t.slice(0, 200)));
        return j;
      });
    });
  }

  /* ---- Anthropic -------------------------------------------------------- */
  var anthropic = {
    id: "anthropic", defaultModel: "claude-haiku-5-5",
    request: function (o) {
      var msgs = o.messages.map(function (m) {
        if (m.raw) return { role: m.role, content: m.raw };
        if (m.results) return { role: "user", content: m.results.map(function (r) {
          return { type: "tool_result", tool_use_id: r.id, content: JSON.stringify(r.content), is_error: !!r.error }; }) };
        return { role: m.role, content: m.text };
      });
      return { model: o.model || anthropic.defaultModel, max_tokens: o.maxTokens || 4000, system: o.system,
               tools: o.tools.map(function (t) { return { name: t.name, description: t.description, input_schema: t.parameters }; }),
               messages: msgs };
    },
    parse: function (j) {
      var calls = [], text = "";
      (j.content || []).forEach(function (b) {
        if (b.type === "text") text += b.text;
        if (b.type === "tool_use") calls.push({ id: b.id, name: b.name, input: b.input || {} });
      });
      return { text: text, calls: calls, raw: j.content, stop: j.stop_reason,
               usage: { in: j.usage ? j.usage.input_tokens : 0, out: j.usage ? j.usage.output_tokens : 0 } };
    },
    call: function (o) { return send("anthropic", "/v1/messages", anthropic.request(o)).then(anthropic.parse); },
    models: function () {
      return send("anthropic", "/v1/models?limit=100", null, { method: "GET" }).then(function (j) {
        return (j.data || []).map(function (m) { return { id: m.id, label: m.display_name || m.id }; });
      });
    }
  };

  /* ---- Gemini ----------------------------------------------------------- */
  var gemini = {
    id: "gemini", defaultModel: "gemini-3.5-flash-lite",
    request: function (o) {
      var contents = o.messages.map(function (m) {
        if (m.raw) return m.raw;
        if (m.results) return { role: "user", parts: m.results.map(function (r) {
          return { functionResponse: { name: r.name, id: r.id, response: { result: r.content } } }; }) };
        return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] };
      });
      return { systemInstruction: { parts: [{ text: o.system }] }, contents: contents,
               tools: [{ functionDeclarations: o.tools.map(function (t) {
                 return { name: t.name, description: t.description, parameters: t.parameters }; }) }] };
    },
    parse: function (j) {
      var c = j.candidates && j.candidates[0], calls = [], text = "";
      ((c && c.content && c.content.parts) || []).forEach(function (p, i) {
        if (p.text) text += p.text;
        if (p.functionCall) calls.push({ id: p.functionCall.id || ("call" + i), name: p.functionCall.name, input: p.functionCall.args || {} });
      });
      var u = j.usageMetadata || {};
      return { text: text, calls: calls, raw: c && c.content, stop: c && c.finishReason,
               usage: { in: u.promptTokenCount || 0, out: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) } };
    },
    call: function (o) {
      var m = o.model || gemini.defaultModel;
      return send("gemini", "/v1beta/models/" + encodeURIComponent(m) + ":generateContent", gemini.request(o)).then(gemini.parse);
    },
    models: function () {
      return send("gemini", "/v1beta/models?pageSize=200", null, { method: "GET" }).then(function (j) {
        return (j.models || []).filter(function (m) {
          return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0;
        }).map(function (m) { return { id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }; });
      });
    }
  };

  /* ---- a scripted provider for the test harness ------------------------- */
  function mock(script) {
    var i = 0;
    return { id: "mock", defaultModel: "mock", calls: [],
             call: function (o) { this.calls.push(o); var step = script[Math.min(i++, script.length - 1)];
                                  return Promise.resolve(typeof step === "function" ? step(o) : step); },
             models: function () { return Promise.resolve([{ id: "mock", label: "mock" }]); } };
  }

  /* ---- price, for the running estimate ----------------------------------
     USD per million tokens. Claude from Anthropic's model pages at the time of
     writing; an unknown model shows tokens only. An estimate, labelled so. */
  var PRICE = [[/haiku-5/, 0.10, 0.50], [/sonnet-5/, 2, 10], [/opus-5/, 4, 20], [/fable-5/, 10, 50]];
  function cost(model, usage) {
    for (var k = 0; k < PRICE.length; k++) if (PRICE[k][0].test(model || ""))
      return (usage.in * PRICE[k][1] + usage.out * PRICE[k][2]) / 1e6;
    return null;
  }

  /* ---- neural voices ---------------------------------------------------- */
  function b64ToBytes(b64) {
    var s = atob(b64), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  function pcm16ToBuffer(u8, rate) {
    var n = Math.floor(u8.length / 2), f = new Float32Array(n), dv = new DataView(u8.buffer, u8.byteOffset, u8.length);
    for (var i = 0; i < n; i++) f[i] = dv.getInt16(i * 2, true) / 32768;
    return RA.voice.fromPCM(f, rate || 24000);
  }
  var GEMINI_VOICE = { female: "Kore", male: "Charon" };
  RA.voice.P["gemini-tts"] = {
    id: "gemini-tts", network: true, label: "Gemini neural voice / Gemini न्यूरल आवाज़",
    model: "gemini-3.8-flash-tts",
    synth: function (text, o) {
      var model = o.model && /tts/.test(o.model) ? o.model : RA.voice.P["gemini-tts"].model;
      var voice = GEMINI_VOICE[o.voice] || "Kore";
      var styled = (o.lang === "en" ? "" : "Read this in clear, warm, natural Hindi, at a calm storytelling pace: ") + text;
      var path = "/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
      /* the voice field has two shapes across model generations; try the
         newer one, fall back to the older */
      var body = function (shape) {
        return { contents: [{ role: "user", parts: [{ text: styled }] }],
                 generationConfig: { responseModalities: ["AUDIO"],
                   speechConfig: shape === "new" ? { voiceConfig: { voice: voice } }
                                                 : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
      };
      return send("gemini", path, body("new")).catch(function (e) {
        if (!/400/.test(e.message)) throw e;
        return send("gemini", path, body("old"));
      }).then(function (j) {
        var part = j.candidates && j.candidates[0] && j.candidates[0].content.parts.filter(function (p) { return p.inlineData; })[0];
        if (!part) throw new Error("Gemini returned no audio");
        var mime = part.inlineData.mimeType || "", bytes = b64ToBytes(part.inlineData.data);
        if (/wav|mpeg|mp3|ogg/.test(mime) || (bytes[0] === 0x52 && bytes[1] === 0x49)) return RA.voice.decode(bytes);
        var rate = +((/rate=(\d+)/.exec(mime) || [])[1] || 24000);
        return pcm16ToBuffer(bytes, rate);
      });
    }
  };
  var EL_VOICE = { female: "", male: "" };
  RA.voice.P.elevenlabs = {
    id: "elevenlabs", network: true, label: "ElevenLabs",
    synth: function (text, o) {
      var vid = o.elevenVoice || EL_VOICE[o.voice];
      if (!vid) return Promise.reject(new Error("Choose an ElevenLabs voice ID in settings first."));
      return send("elevenlabs", "/v1/text-to-speech/" + encodeURIComponent(vid) + "?output_format=pcm_24000",
                  { text: text, model_id: "eleven_multilingual_v2" }, { binary: true })
        .then(function (buf) {
          if (buf instanceof ArrayBuffer) return pcm16ToBuffer(new Uint8Array(buf), 24000);
          if (buf && buf.b64) return pcm16ToBuffer(b64ToBytes(buf.b64), 24000);
          throw new Error("ElevenLabs returned no audio");
        });
    }
  };

  RA.providers = { anthropic: anthropic, gemini: gemini, mock: mock, send: send, privacy: privacy,
                   cost: cost, HOSTS: HOSTS, get: function (id) { return id === "gemini" ? gemini : anthropic; } };
})();
;

/* ===== Reel Agent — the agent loop (Connected mode) ======================

   A provider-neutral tool-use loop. The model chooses a layout, reads its
   facts, writes a script and must pass the fact check before it may finish.
   It never synthesises a voice and never draws a frame: when it calls
   finish, the same pipeline as offline mode takes over.

   The tools are JavaScript calling the page's own adapters. None of them
   touches the network; the only request in a run is the one to the model.

     list_layouts(filter)      every layout on every surface on this page
     get_facts(layout,seconds) configure + facts() + beats("hi")
     get_today(date)           the Studio's ideas, each with a layout
     write_script(lines)       [{ beats:[a,b], narration, caption }]
     verify_script()           violations — must be empty before finish
     kahani_scenes(scenes)     kahani mode only
     finish(caption_text, hashtags)

   A step limit stops a model that loops; a running token count and cost
   estimate are reported after every step. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var MAX_STEPS = 12;

  var TOOLS = [
    { name: "list_layouts", description: "List the reel layouts available on this page. Optional filter: words matched against the layout's id, label and group (e.g. 'rohini', 'nakshatra', 'diwali', 'vakri').",
      parameters: { type: "object", properties: { filter: { type: "string" } } } },
    { name: "get_facts", description: "Build a layout and return its computed facts (every number the narration may use) and its beats (the picture's segments, with the engine's own Hindi line for each). Call before writing any script.",
      parameters: { type: "object", properties: { layout: { type: "string" }, seconds: { type: "number" } }, required: ["layout"] } },
    { name: "get_today", description: "Today's reel ideas from the Studio, each with a suggested layout and the reason it fits today.",
      parameters: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" } } } },
    { name: "write_script", description: "Submit the script: one entry per beat range, covering every beat exactly once in order. beats is [first, last] inclusive. narration is the spoken line; caption is at most 4 words.",
      parameters: { type: "object", properties: { lines: { type: "array", items: { type: "object", properties: {
        beats: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
        narration: { type: "string" }, caption: { type: "string" } }, required: ["beats", "narration", "caption"] } } }, required: ["lines"] } },
    { name: "verify_script", description: "Check the submitted script against the facts and the beats. Returns violations; fix them and resubmit until it returns ok.",
      parameters: { type: "object", properties: {} } },
    { name: "kahani_scenes", description: "Kahani mode only: submit the story's scenes (SVG fragments plus motion).",
      parameters: { type: "object", properties: { scenes: { type: "array", items: { type: "object" } } }, required: ["scenes"] } },
    { name: "finish", description: "End the run once verify_script returns ok. caption_text is the post caption; hashtags a list.",
      parameters: { type: "object", properties: { caption_text: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } }, required: ["caption_text"] } }
  ];

  function skillText(name) {
    var S = RA.skills || {}, s = S[name];
    if (!s) return "";
    var inc = (s.meta && s.meta.includes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    return inc.map(function (n) { return S[n] ? S[n].body : ""; }).concat([s.body]).join("\n\n---\n\n");
  }
  function custom(name) {
    try { var c = JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}"); return c[name] || null; } catch (e) { return null; }
  }

  var RULES =
    "\n\n---\n\nNON-NEGOTIABLE (enforced in code as well):\n" +
    "- Every number, date, degree and name in a narration must come from get_facts. The script is checked and refused otherwise.\n" +
    "- Mythology is story, said as story. No predictions about any person, no remedies. Where needed: \"शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं\".\n" +
    "- You have no access to anyone's birth data or chart, and must not ask for it.\n" +
    "- Finish only after verify_script returns ok.";

  function system(o) {
    var body = custom(o.skill) || skillText(o.skill || "astro-reel");
    return body + RULES + "\n\nOutput language for narration: " +
      ({ hi: "pure Hindi in Devanagari", hinglish: "Hinglish in Roman script", en: "English" }[o.lang] || "pure Hindi") +
      ". Target length: about " + (o.seconds || 45) + " seconds of speech.";
  }
  function firstMessage(o) {
    var m = "Request: " + (o.brief || "(none — make the best reel for the layout given)");
    if (o.layout) m += "\nLayout chosen on the page: " + o.layout;
    return m;
  }

  /* everything that will leave the device on the first call */
  function preview(o) {
    var P = RA.providers.get(o.provider);
    return { host: RA.providers.HOSTS[P.id] || RA.providers.HOSTS.anthropic, model: o.model || P.defaultModel,
             system: system(o), message: firstMessage(o), tools: TOOLS.map(function (t) { return t.name; }),
             later: "Each later step sends the tool results: the layout's computed facts (numbers, names, dates of the sky event) and the engine's beats. Never your birth data or chart." };
  }

  /* facts as the model sees them: no place, compact */
  function factsForModel(F) {
    return F.filter(function (f) { return f.id !== "place" && !/^script\./.test(f.id); }).slice(0, 260)
      .map(function (f) { return { id: f.id, label: f.label, value: f.value, unit: f.unit || undefined }; });
  }

  function run(o, on) {
    on = on || function () {};
    var P = o.providerImpl || RA.providers.get(o.provider);
    var model = o.model || P.defaultModel;
    var A = o.adapter, lang = o.lang || "hi";
    var state = { layout: o.layout || null, beats: null, facts: null, lines: null, verified: false,
                  scenes: null, finish: null, usage: { in: 0, out: 0 }, steps: 0 };
    var msgs = [{ role: "user", text: firstMessage(o) }];
    var sys = system(o);

    var impl = {
      list_layouts: function (a) {
        var q = String(a.filter || "").toLowerCase().split(/\s+/).filter(Boolean);
        var all = A.describe().layouts.filter(function (L) {
          var hay = (L.id + " " + L.label + " " + L.group).toLowerCase();
          return !q.length || q.some(function (w) { return hay.indexOf(w) >= 0; });
        });
        return { count: all.length, layouts: all.slice(0, 40) };
      },
      get_facts: function (a) {
        return A.configure({ layout: a.layout, seconds: a.seconds || o.seconds, lang: lang }).then(function () {
          state.layout = a.layout; state.facts = A.facts(); state.beats = A.beats(lang);
          state.lines = null; state.verified = false;
          return { layout: a.layout, title: A.title ? A.title() : "", seconds: A.duration(),
                   beats: state.beats.map(function (b) { return { i: b.i, from: +b.from.toFixed(2), to: +b.to.toFixed(2), say: b.say }; }),
                   facts: factsForModel(state.facts) };
        });
      },
      get_today: function (a) {
        if (RA.today) return RA.today(a.date);
        return { error: "today's ideas are not available on this page" };
      },
      write_script: function (a) {
        if (!state.beats) return { error: "call get_facts first" };
        state.lines = (a.lines || []).map(function (l) {
          return { beats: [l.beats[0] | 0, (l.beats[1] == null ? l.beats[0] : l.beats[1]) | 0],
                   narration: String(l.narration || ""), caption: String(l.caption || "") };
        });
        state.verified = false;
        return { ok: true, lines: state.lines.length, beats: state.beats.length };
      },
      verify_script: function () {
        if (!state.lines) return { error: "write_script first" };
        var v = RA.verify.verify(state.lines, state.beats, state.facts, { lang: lang });
        state.verified = v.ok;
        state.violations = v.violations;
        return { ok: v.ok, violations: v.violations.map(function (x) { return { line: x.line + 1, kind: x.kind, message: x.en }; }) };
      },
      kahani_scenes: function (a) {
        if (!RA.kahani) return { error: "kahani mode is not available on this page" };
        var r = RA.kahani.accept(a.scenes || []);
        state.scenes = r.scenes; state.kahani = true; state.layout = "kahani";
        state.beats = RA.kahani.surface().beats();
        state.facts = (state.facts || []).concat(RA.facts.FRAMEWORK);
        state.lines = null; state.verified = false;
        return { ok: true, scenes: r.scenes.length, removed_by_sanitiser: r.removed,
                 beats: state.beats.map(function (b) { return { i: b.i, from: b.from, to: b.to }; }),
                 next: "write_script with one line per scene (beats [i, i]), then verify_script" };
      },
      finish: function (a) {
        if (!state.verified) return { error: "verify_script must return ok before finish" };
        state.finish = { caption: String(a.caption_text || ""), hashtags: a.hashtags || [] };
        return { ok: true };
      }
    };

    function step() {
      if (state.finish) return Promise.resolve(state);
      if (state.steps >= MAX_STEPS) {
        var e = new Error("The agent did not finish within " + MAX_STEPS + " steps."); e.state = state; return Promise.reject(e);
      }
      state.steps++;
      on({ type: "step", n: state.steps });
      return P.call({ system: sys, messages: msgs, tools: TOOLS, model: model, maxTokens: 4000 }).then(function (r) {
        state.usage.in += r.usage.in || 0; state.usage.out += r.usage.out || 0;
        on({ type: "usage", usage: state.usage, cost: RA.providers.cost(model, state.usage), text: r.text });
        msgs.push({ role: "assistant", text: r.text, raw: r.raw || null, calls: r.calls });
        if (!r.calls.length) {
          msgs.push({ role: "user", text: "Continue with the tools. Finish only after verify_script returns ok." });
          return step();
        }
        var results = [];
        return r.calls.reduce(function (p, c) {
          return p.then(function () {
            on({ type: "tool", name: c.name });
            var f = impl[c.name];
            return Promise.resolve(f ? f(c.input || {}) : { error: "unknown tool " + c.name })
              .catch(function (e) { return { error: e.message }; })
              .then(function (res) { results.push({ id: c.id, name: c.name, content: res, error: !!(res && res.error) }); });
          });
        }, Promise.resolve()).then(function () {
          msgs.push({ role: "user", results: results });
          return step();
        });
      });
    }
    return step();
  }

  RA.agent = { run: run, TOOLS: TOOLS, preview: preview, system: system, skillText: skillText, MAX_STEPS: MAX_STEPS };
})();
;

/* ===== Reel Agent — the SVG sanitiser ====================================

   Kahani scenes arrive from a model as SVG fragments. They are untrusted, so
   nothing of them reaches the page as live markup: each fragment is parsed
   into an inert XML document, walked against an allow-list, re-serialised,
   and then drawn only as an <img> from a blob — a context in which an SVG can
   run no script and fetch nothing even if something slipped through.

   ALLOWED: shapes, paths, text, groups, gradients, clip paths and masks, and
   the presentation attributes that draw them. REMOVED: script, foreignObject,
   image, use, a, animate* and anything else not listed; every on* attribute;
   style attributes and <style> (CSS can fetch: url(), @import); href and
   xlink:href; any url() that is not a same-document #reference; and any value
   carrying javascript:, data:, http:, // or expression(). The caller is told
   how much was removed. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var NS = "http://www.w3.org/2000/svg";

  var EL = {}; ("g path rect circle ellipse line polyline polygon text tspan defs linearGradient " +
    "radialGradient stop clipPath mask").split(" ").forEach(function (t) { EL[t] = 1; });
  var AT = {}; ("id d x y x1 y1 x2 y2 cx cy r rx ry fx fy width height points fill stroke stroke-width " +
    "stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-miterlimit opacity " +
    "fill-opacity stroke-opacity fill-rule clip-rule transform offset stop-color stop-opacity " +
    "gradientUnits gradientTransform spreadMethod font-size font-weight font-style text-anchor " +
    "dominant-baseline letter-spacing clip-path mask maskUnits clipPathUnits dx dy rotate textLength " +
    "visibility display").split(" ").forEach(function (a) { AT[a] = 1; });
  var BAD = /javascript:|data:|https?:|\/\/|expression\s*\(|@import|\\/i;

  function cleanValue(name, v) {
    if (BAD.test(v)) return null;
    var urls = v.match(/url\s*\(([^)]*)\)/gi);
    if (urls && !urls.every(function (u) { return /^url\s*\(\s*['"]?#[\w-]+['"]?\s*\)$/i.test(u); })) return null;
    if (name === "id" && !/^[\w-]{1,64}$/.test(v)) return null;
    return v;
  }

  /* fragment: SVG markup without the outer <svg>. → { svg, removed, ok } */
  function sanitize(fragment) {
    var removed = 0;
    var src = '<svg xmlns="' + NS + '">' + String(fragment || "") + "</svg>";
    var doc = new DOMParser().parseFromString(src, "image/svg+xml");
    if (doc.getElementsByTagName("parsererror").length) return { svg: "", removed: 1, ok: false, error: "not well-formed SVG" };
    var root = doc.documentElement;
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (k) {
        if (k.nodeType === 3) return;                       /* text */
        if (k.nodeType !== 1) { node.removeChild(k); removed++; return; }
        var tag = k.localName;
        if (!EL[tag] || k.namespaceURI !== NS) { node.removeChild(k); removed++; return; }
        Array.prototype.slice.call(k.attributes).forEach(function (a) {
          var n = a.name, keep = AT[n] && !a.prefix ? cleanValue(n, a.value) : null;
          if (keep === null) { k.removeAttributeNode(a); removed++; }
        });
        walk(k);
      });
    }
    walk(root);
    var out = new XMLSerializer().serializeToString(root);
    out = out.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    return { svg: out, removed: removed, ok: true };
  }

  RA.sanitize = { svg: sanitize };
})();
;

/* ===== Reel Agent — Kahani (cartoon story) mode ==========================

   A surface like any other, so the renderer, the verifier and the voice
   treat a story reel exactly as an engine reel. Scenes come from the agent
   (kahani_scenes): an SVG fragment, a list of props, simple motion and a
   length each. The scene runtime is vanilla JS on a canvas:

     Background   night gradient, a fixed field of stars, a row of diyas
     Props        moon, mountains, cloud, tree, diya, stars — drawn here
     Camera       a slow push-in across each scene
     Motion       entrance (fade | rise | zoom), bob, parallax, sway
     Kicker       ≤ 3 words in the title band

   BUILT TO THE BRIEF, NOT YET PORTED. The plan was to port the kahani kit's
   Remotion components; that kit was not reachable from the session that
   wrote this, so the components above follow its description. When the kit
   is shared, its look should replace these drawings — the contract and the
   sanitiser stay as they are.

   Every fragment goes through RA.sanitize first and is drawn only as an
   <img> made from a blob, pre-rasterised at configure() so frame(p) is
   synchronous and deterministic. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var W = 1080, H = 1920;

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var STARS = (function () { var r = rng(20261121), a = []; for (var i = 0; i < 260; i++) a.push([r() * W, r() * H * 0.72, 0.6 + r() * 2.2, r()]); return a; })();

  function background(c, t) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1030"); g.addColorStop(0.6, "#1c1440"); g.addColorStop(1, "#3a1a2e");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    STARS.forEach(function (s) {
      c.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.3 + s[3] * 20);
      c.fillStyle = "#fff6dc"; c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fill();
    });
    c.globalAlpha = 1;
  }
  function diyas(c, t, y) {
    for (var i = 0; i < 7; i++) {
      var x = W * (0.12 + i * 0.127), f = 1 + 0.12 * Math.sin(t * 7 + i * 1.7);
      c.fillStyle = "#b8562a"; c.beginPath(); c.ellipse(x, y, 34, 14, 0, 0, Math.PI); c.fill();
      var g = c.createRadialGradient(x, y - 22, 2, x, y - 22, 60 * f);
      g.addColorStop(0, "rgba(255,214,120,.9)"); g.addColorStop(1, "rgba(255,160,40,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y - 22, 60 * f, 0, 7); c.fill();
      c.fillStyle = "#ffd36b"; c.beginPath(); c.ellipse(x, y - 20, 7, 16 * f, 0, 0, 7); c.fill();
    }
  }
  var PROPS = {
    moon: function (c, t, px) { var x = W * 0.74 + px * 30, y = H * 0.16;
      var g = c.createRadialGradient(x, y, 10, x, y, 220); g.addColorStop(0, "rgba(255,244,214,.35)"); g.addColorStop(1, "rgba(255,244,214,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 220, 0, 7); c.fill();
      c.fillStyle = "#fff4d6"; c.beginPath(); c.arc(x, y, 92, 0, 7); c.fill(); },
    mountains: function (c, t, px) { c.fillStyle = "#231c47";
      c.beginPath(); c.moveTo(-40 + px * 20, H * 0.80); [[0.18, 0.58], [0.36, 0.72], [0.55, 0.52], [0.78, 0.70], [1.04, 0.56]].forEach(function (p) { c.lineTo(W * p[0] + px * 20, H * p[1]); });
      c.lineTo(W + 40, H * 0.82); c.lineTo(-40, H * 0.82); c.fill(); },
    cloud: function (c, t, px) { var x = (W * 0.2 + t * 18 + px * 50) % (W + 400) - 200, y = H * 0.27;
      c.fillStyle = "rgba(230,228,255,.85)"; [[0, 0, 70], [70, -26, 86], [150, 0, 66], [80, 18, 74]].forEach(function (b) { c.beginPath(); c.arc(x + b[0], y + b[1], b[2], 0, 7); c.fill(); }); },
    tree: function (c, t, px, sway) { var x = W * 0.16 + px * 60, y = H * 0.80, r = Math.sin(t * 1.4) * 0.03 * (sway || 0.5);
      c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = "#3b2a1c"; c.fillRect(-16, -260, 32, 260);
      c.fillStyle = "#2f6b45"; [[0, -300, 120], [-80, -240, 90], [80, -240, 90], [0, -380, 90]].forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2], 0, 7); c.fill(); }); c.restore(); },
    diya: function (c, t) { diyas(c, t, H * 0.86); },
    stars: function () {}
  };

  function kahani() {
    var SC = [], IMG = [], FACTS = [], T = 0;
    function describe() {
      return { surface: "kahani", label: "Kahani", size: { W: W, H: H },
               layouts: [{ id: "kahani", label: "Kahani — story reel / कहानी रील", group: "Kahani", defaultSeconds: 45 }],
               safeZones: { title: { x: W * 0.05, y: H * 0.035, w: W * 0.9, h: H * 0.09 },
                            caption: { x: W * 0.06, y: H * 0.86 - 260, w: W * 0.88, h: 240 },
                            footer: { x: W * 0.05, y: H * 0.95, w: W * 0.9, h: H * 0.05 } } };
    }
    /* scenes are accepted (sanitised) first; configure rasterises them */
    function accept(scenes) {
      var removed = 0;
      SC = (scenes || []).slice(0, 12).map(function (s) {
        var r = RA.sanitize.svg(s.svg || "");
        removed += r.removed;
        var m = s.motion || {};
        return { svg: r.ok ? r.svg : "", seconds: Math.max(3, Math.min(12, +s.seconds || 6)),
                 props: (s.props || []).filter(function (p) { return PROPS[p]; }).slice(0, 6),
                 motion: { entrance: /^(fade|rise|zoom)$/.test(m.entrance) ? m.entrance : "fade",
                           bob: Math.max(0, Math.min(1, +m.bob || 0)), parallax: Math.max(0, Math.min(1, +m.parallax || 0)),
                           sway: Math.max(0, Math.min(1, +m.sway || 0)) },
                 kicker: String(s.kicker || "").split(/\s+/).slice(0, 3).join(" "), say: String(s.say || "") };
      });
      T = SC.reduce(function (a, s) { return a + s.seconds; }, 0);
      return { scenes: SC, removed: removed };
    }
    function raster(s) {
      return new Promise(function (res) {
        if (!s.svg) return res(null);
        var blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' + s.svg + "</svg>"], { type: "image/svg+xml" });
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res(im); };
        im.onerror = function () { URL.revokeObjectURL(u); res(null); };
        im.src = u;
      });
    }
    function configure(spec) {
      if (spec && spec.scenes) accept(spec.scenes);
      if (spec && spec.facts) FACTS = spec.facts;
      return Promise.all(SC.map(raster)).then(function (ims) { IMG = ims; return describe(); });
    }
    function beats() {
      var t = 0;
      return SC.map(function (s, i) { var b = { i: i, from: t, to: t + s.seconds, secs: s.seconds, say: s.say }; t += s.seconds; return b; });
    }
    function frame(p, c) {
      var t = p * T, acc = 0, k = 0;
      for (k = 0; k < SC.length - 1 && t >= acc + SC[k].seconds; k++) acc += SC[k].seconds;
      var s = SC[k], lt = t - acc, f = s ? lt / s.seconds : 0;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      background(c, t);
      if (!s) return;
      var zoom = 1 + 0.08 * f, px = (f - 0.5) * s.motion.parallax;
      c.save(); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2);
      s.props.forEach(function (pr) { if (pr !== "diya") PROPS[pr](c, t, px, s.motion.sway); });
      var e = Math.min(1, lt / 0.6), ease = e * e * (3 - 2 * e);
      if (IMG[k]) {
        c.save();
        c.globalAlpha = s.motion.entrance === "fade" ? ease : 1;
        var dy = (s.motion.entrance === "rise" ? (1 - ease) * 120 : 0) + Math.sin(t * 2.2) * 14 * s.motion.bob;
        var sc = s.motion.entrance === "zoom" ? 0.85 + 0.15 * ease : 1;
        c.translate(W / 2, H / 2 + dy); c.rotate(Math.sin(t * 1.1) * 0.015 * s.motion.sway); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
        c.drawImage(IMG[k], 0, 0, W, H);
        c.restore();
      }
      c.restore();
      if (s.props.indexOf("diya") >= 0 || !s.props.length) diyas(c, t, H * 0.90);
    }
    return { describe: describe, configure: configure, ready: function () { return SC.length > 0; },
             duration: function () { return T; }, beats: beats,
             facts: function () { return RA.facts.FRAMEWORK.concat(FACTS); }, frame: frame,
             title: function () { return SC[0] ? SC[0].kicker : ""; }, accept: accept,
             postCaption: function () { return ""; } };
  }
  RA.adapter.register("kahani", kahani);
  var shared = null;
  RA.kahani = { surface: function () { return shared || (shared = RA.adapter.make("kahani")); },
                accept: function (scenes) { return RA.kahani.surface().accept(scenes); } };
})();
;

/* ===== Reel Agent — the Reels library ====================================

   Every finished reel is kept on this device (IndexedDB): the video, the
   thumbnail, the subtitles, the caption, and the script and settings it was
   made from, so a reel can be re-opened, re-edited and re-exported without
   regenerating it. Nothing here leaves the device. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  function save(r) {
    var rec = {
      id: "reel-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      at: Date.now(), title: r.title || r.layout, layout: r.layout, lang: r.lang,
      duration: r.duration || r.expected, mime: r.mime, ext: r.ext,
      blob: r.blob, thumb: r.thumb || null, srt: r.srt, caption: r.caption,
      lines: r.lines, codec: r.file && r.file.codec, audio: r.file && r.file.audioCodec,
      mode: r.mode || "offline", provider: r.provider || null
    };
    return RA.core.store.put("reels", rec).then(function (ok) { return ok ? rec : null; });
  }
  function list() {
    return RA.core.store.all("reels").then(function (a) {
      return (a || []).sort(function (x, y) { return y.at - x.at; });
    });
  }
  function get(id) { return RA.core.store.get("reels", id); }
  function remove(id) { return RA.core.store.del("reels", id); }

  /* a small panel listing the library, opened from the reel panel */
  function show(host, onReedit) {
    var el = RA.core.el, t = RA.core.t;
    host.textContent = "";
    host.appendChild(el("h3", null, t("library")));
    return list().then(function (rs) {
      if (!rs.length) { host.appendChild(el("p", "ra-note", "No reels yet. / अभी कोई रील नहीं।")); return; }
      rs.forEach(function (r) {
        var row = el("div", "ra-lib");
        if (r.thumb) { var im = el("img"); im.src = URL.createObjectURL(r.thumb); row.appendChild(im); }
        var info = el("div");
        info.appendChild(el("b", null, r.title || r.layout));
        info.appendChild(el("div", "ra-note", new Date(r.at).toLocaleString() + " · " + r.layout + " · " +
          (r.duration ? r.duration.toFixed(1) + " s" : "") + " · " + (r.ext || "").toUpperCase() + " · " + r.mode));
        var b = el("div", "ra-row");
        var open = el("button", "ra-b ghost", "Open / खोलें", { type: "button" });
        open.addEventListener("click", function () {
          var v = el("video", null, null, { controls: "" }); v.src = URL.createObjectURL(r.blob);
          v.style.width = "220px"; info.appendChild(v); open.disabled = true;
        });
        var ed = el("button", "ra-b ghost", "Re-edit / फिर से संपादित करें", { type: "button" });
        ed.addEventListener("click", function () { if (onReedit) onReedit(r); });
        var ex = el("button", "ra-b ghost", t("download"), { type: "button" });
        ex.addEventListener("click", function () {
          var name = (r.layout || "reel").replace(/[^\w.-]+/g, "-") + "." + (r.ext || "mp4");
          if (RA.native && RA.core.inApp()) RA.native.saveFile(r.blob, name);
          else { var a = document.createElement("a"); a.href = URL.createObjectURL(r.blob); a.download = name; a.click(); }
        });
        var del = el("button", "ra-b ghost", "Delete / हटाएँ", { type: "button" });
        del.addEventListener("click", function () { remove(r.id).then(function () { row.remove(); }); });
        [open, ed, ex, del].forEach(function (x) { b.appendChild(x); });
        info.appendChild(b); row.appendChild(info); host.appendChild(row);
      });
    });
  }

  RA.library = { save: save, list: list, get: get, remove: remove, show: show };
})();
;

/* ===== Reel Agent — the panel ============================================

   "Make reel / रील बनाएँ" on any page that hosts a surface opens this. It is
   the same panel everywhere: options, live progress through the seven steps,
   then a preview with the script, the files and the caption.

   It never posts anything. The last line of the panel says so, because a
   button that makes a finished video invites the question. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var C = function () { return RA.core; };
  var STEPS = ["s_layout", "s_facts", "s_script", "s_check", "s_voice", "s_render", "s_done"];

  var CSS =
    ".ra-ov{position:fixed;inset:0;z-index:9000;background:rgba(10,12,24,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 16px}" +
    ".ra-pn{background:var(--surface,#fbfbfd);color:var(--text,#20233a);border:1px solid var(--border-2,#d8d8e6);border-radius:14px;max-width:980px;width:100%;box-shadow:0 18px 60px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}" +
    ".ra-hd{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,#e7e7f0)}" +
    ".ra-hd h2{margin:0;font-size:1.15rem;flex:1}.ra-hd .kdeva{color:var(--accent,#c9a24b);margin-left:.4em;font-weight:600}" +
    ".ra-x{background:none;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:4px 10px;cursor:pointer;color:inherit}" +
    ".ra-bd{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:18px;padding:16px 18px}" +
    "@media (max-width:760px){.ra-bd{grid-template-columns:1fr}}" +
    ".ra-f label{display:block;margin:0 0 10px;font-size:.92rem;color:var(--text-soft,#4a4e68)}" +
    ".ra-f select,.ra-f textarea,.ra-f input[type=file]{display:block;width:100%;margin-top:4px;font:inherit;color:var(--text,#20233a);background:var(--surface-3,#fff);border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:6px 8px;box-sizing:border-box}" +
    ".ra-f textarea{min-height:64px}.ra-row{display:flex;gap:8px;flex-wrap:wrap}" +
    ".ra-b{font:inherit;border-radius:9px;padding:8px 14px;cursor:pointer;border:1px solid var(--accent,#c9a24b);background:var(--accent,#c9a24b);color:var(--accent-ink,#231c07);font-weight:600}" +
    ".ra-b.ghost{background:transparent;color:var(--text,#20233a);border-color:var(--border-2,#d8d8e6)}.ra-b:disabled{opacity:.5;cursor:default}" +
    ".ra-steps{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}" +
    ".ra-steps li{font-size:.82rem;padding:3px 9px;border-radius:99px;border:1px solid var(--border-2,#d8d8e6);color:var(--muted-2,#5a5e78)}" +
    ".ra-steps li.on{border-color:var(--accent,#c9a24b);color:var(--text-strong,#1b1e33);background:var(--ex-bg,#fbf6e8)}" +
    ".ra-steps li.ok{border-color:var(--sem-good,#1c6b46);color:var(--sem-good,#1c6b46)}" +
    ".ra-note{font-size:.88rem;color:var(--text-soft,#4a4e68);margin:6px 0}.ra-warn{color:var(--sem-bad,#a1493a)}" +
    ".ra-prev{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}" +
    ".ra-prev video{width:270px;max-width:100%;aspect-ratio:9/16;background:#05060b;border-radius:10px}" +
    ".ra-prev img{width:120px;border-radius:8px;border:1px solid var(--border,#e7e7f0)}" +
    ".ra-ed{margin-top:12px}.ra-ln{display:grid;grid-template-columns:42px 1fr;gap:6px 10px;padding:8px 0;border-top:1px solid var(--border,#e7e7f0)}" +
    ".ra-ln b{font-size:.8rem;color:var(--muted-2,#5a5e78)}.ra-ln textarea{width:100%;min-height:52px;font:inherit;box-sizing:border-box;border:1px solid var(--border-2,#d8d8e6);border-radius:7px;padding:5px 7px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-ln input{width:100%;font:inherit;box-sizing:border-box;border:1px solid var(--border-2,#d8d8e6);border-radius:7px;padding:4px 7px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-ln.bad textarea,.ra-ln.bad input{border-color:var(--sem-bad,#a1493a)}.ra-vio{font-size:.82rem;color:var(--sem-bad,#a1493a);grid-column:2}" +
    ".ra-ft{padding:10px 18px 14px;border-top:1px solid var(--border,#e7e7f0);font-size:.85rem;color:var(--text-soft,#4a4e68)}" +
    "progress.ra-pr{width:100%;height:8px}" +
    ".ra-pn [hidden]{display:none!important}" +
    ".ra-lib{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--border,#e7e7f0)}.ra-lib img{width:72px;border-radius:6px}" +
    ".ra-set h3{margin:14px 0 6px;font-size:1rem}.ra-set input[type=text],.ra-set input[type=password]{width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-set textarea{width:100%;min-height:180px;box-sizing:border-box;font:13px/1.45 ui-monospace,Menlo,monospace;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:8px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-sheet{border:1px solid var(--caution-line,#ecc1c1);background:var(--caution-bg,#fbeeee);border-radius:10px;padding:10px 12px;margin:8px 0}" +
    ".ra-sheet pre{white-space:pre-wrap;max-height:220px;overflow:auto;font:12px/1.4 ui-monospace,Menlo,monospace;background:var(--surface-3,#fff);border:1px solid var(--border,#e7e7f0);border-radius:6px;padding:8px}" +
    ".ra-meter{font-size:.82rem;color:var(--muted-2,#5a5e78)}" +
    ".ra-ask{border:1px solid var(--border-2,#d8d8e6);border-radius:12px;padding:12px 14px;background:var(--surface-2,#f4f4fb);margin:0 0 1.2rem}" +
    ".ra-ask label{display:block;font-weight:600;margin-bottom:6px}.ra-ask textarea{width:100%;box-sizing:border-box;font:inherit;font-size:1.05rem;padding:8px 10px;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;background:var(--surface-3,#fff);color:var(--text,#20233a)}" +
    ".ra-askrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px}" +
    "#ra-lib .ra-lib{max-width:720px}";

  function css() {
    if (document.getElementById("ra-css")) return;
    var s = document.createElement("style"); s.id = "ra-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function opt(sel, v, label, selected) {
    var o = document.createElement("option"); o.value = v; o.textContent = label;
    if (selected) o.selected = true; sel.appendChild(o); return o;
  }
  function labelled(text, child) {
    var l = C().el("label", null, text); l.appendChild(child); return l;
  }

  var OPEN = null;

  /* opts: { adapter, layout, onClose } */
  function open(opts) {
    css();
    if (OPEN) close();
    var el = C().el, S = C().settings(), t = C().t;
    var A = opts.adapter;
    /* a surface showing the reader's own chart keeps everything on this
       device, whatever Settings say — see RA.net.hold */
    var PERSONAL = !!(A.describe && A.describe().personal);
    if (PERSONAL) RA.net.hold(A.describe().surface);
    var ov = el("div", "ra-ov"), pn = el("div", "ra-pn", null, { role: "dialog", "aria-modal": "true", "aria-label": "Make reel" });
    ov.appendChild(pn);
    var hd = el("div", "ra-hd"), h2 = el("h2", null, "Make reel"); h2.appendChild(el("span", "kdeva", "रील बनाएँ"));
    var x = el("button", "ra-x", "✕", { type: "button", "aria-label": "Close" });
    var bSet = el("button", "ra-x", "⚙ Settings / सेटिंग्स", { type: "button" });
    var bLib = el("button", "ra-x", "▤ " + t("library"), { type: "button" });
    hd.appendChild(h2); hd.appendChild(bLib); hd.appendChild(bSet); hd.appendChild(x); pn.appendChild(hd);
    var bd = el("div", "ra-bd"); pn.appendChild(bd);
    var f = el("div", "ra-f"), out = el("div", "ra-out");
    bd.appendChild(f); bd.appendChild(out);

    /* layout (the page's current one; the agent page offers all) */
    var D = A.describe(), lay = el("select");
    var cur = opts.layout || (D.layouts[0] && D.layouts[0].id), groups = {};
    D.layouts.forEach(function (L) {
      var g = groups[L.group];
      if (!g) { g = groups[L.group] = document.createElement("optgroup"); g.label = L.group; lay.appendChild(g); }
      var o = document.createElement("option"); o.value = L.id; o.textContent = L.label;
      if (L.id === cur) o.selected = true; g.appendChild(o);
    });
    f.appendChild(labelled("Layout / लेआउट", lay));

    var brief = el("textarea", null, null, { placeholder: "e.g. रोहिणी नक्षत्र पर 45 सेकंड की रील" });
    var briefL = labelled(t("brief"), brief); f.appendChild(briefL);
    var briefN = el("p", "ra-note", RA.net.allowed()
      ? "The brief goes to the agent in Connected mode. / विवरण Connected mode में एजेंट को जाता है।"
      : "Offline mode uses the engine's own script; the brief is used only in Connected mode. / ऑफ़लाइन मोड इंजन की अपनी स्क्रिप्ट लेता है; विवरण केवल Connected mode में काम आता है।");
    f.appendChild(briefN);
    brief.disabled = !RA.net.allowed();
    var mode = el("p", "ra-note", RA.net.allowed()
      ? "Mode: Connected — " + (RA.keys.PROVIDERS[S.provider] || {}).label + " / मोड: Connected"
      : "Mode: Offline — nothing leaves this device / मोड: ऑफ़लाइन — कुछ भी बाहर नहीं जाता");
    f.appendChild(mode);
    if (PERSONAL) f.appendChild(el("p", "ra-note ra-warn",
      "This reel shows your own chart, so it is made on this device only — no agent, no cloud voice, even in Connected mode. / यह रील आपकी अपनी कुण्डली दिखाती है, इसलिए यह केवल इसी डिवाइस पर बनती है — Connected mode में भी कोई एजेंट या क्लाउड आवाज़ नहीं।"));
    var skill = el("select");
    Object.keys(RA.skills || {}).filter(function (k) { return k !== "hindi-voice-style"; }).forEach(function (k) {
      opt(skill, k, RA.skills[k].title, k === "astro-reel"); });
    try { Object.keys(JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}")).forEach(function (k) { opt(skill, k, k + " (custom / अपनी)"); }); } catch (e) {}
    var skillL = labelled("Skill / स्किल", skill); skillL.hidden = !RA.net.allowed(); f.appendChild(skillL);

    var lang = el("select");
    opt(lang, "hi", "शुद्ध हिंदी / Pure Hindi", S.lang === "hi");
    opt(lang, "hinglish", "Hinglish", S.lang === "hinglish");
    opt(lang, "en", "English", S.lang === "en");
    f.appendChild(labelled(t("language"), lang));

    var vrow = el("div", "ra-row"), gender = el("select");
    opt(gender, "female", t("female"), S.voice !== "male"); opt(gender, "male", t("male"), S.voice === "male");
    var prov = el("select");
    RA.voice.providers().forEach(function (p, i) { opt(prov, p.id, p.label, i === 0); });
    vrow.appendChild(labelled(t("voice"), gender)); vrow.appendChild(labelled("Source / स्रोत", prov));
    f.appendChild(vrow);
    var vfile = el("input", null, null, { type: "file", accept: "audio/*,.m4a,.wav,.mp3,.aac" });
    var vfileL = labelled(t("upload") + " — one take of the whole script / पूरी स्क्रिप्ट की एक रिकॉर्डिंग", vfile);
    f.appendChild(vfileL);
    var sysVoice = el("select"); var sysL = labelled("System voice / सिस्टम आवाज़", sysVoice);
    f.appendChild(sysL);
    function syncVoice() {
      vfileL.hidden = prov.value !== "upload";
      sysL.hidden = prov.value !== "system";
    }
    prov.addEventListener("change", syncVoice);
    if (RA.voice.P.system.available()) {
      RA.voice.P.system.voices().then(function (vs) {
        (vs || []).forEach(function (v) { opt(sysVoice, v.id, v.name + (v.lang ? " (" + v.lang + ")" : ""), v.preferred); });
        if (!vs || !vs.length) opt(sysVoice, "", "No Hindi voice installed — see note / कोई हिंदी आवाज़ नहीं", true);
      }).catch(function () { opt(sysVoice, "", "(unavailable)", true); });
    }
    syncVoice();

    var len = el("select");
    [30, 45, 60, 90].forEach(function (s) { opt(len, String(s), s + " s", +S.seconds === s); });
    f.appendChild(labelled(t("length"), len));

    var mus = el("select");
    opt(mus, "none", t("none"), true);
    opt(mus, "bundled", t("bundled") + " — none bundled yet / अभी कोई नहीं").disabled = true;
    opt(mus, "file", t("myfile"));
    var mfile = el("input", null, null, { type: "file", accept: "audio/*" });
    var mfileL = labelled(t("myfile"), mfile); mfileL.hidden = true;
    mus.addEventListener("change", function () { mfileL.hidden = mus.value !== "file"; });
    f.appendChild(labelled(t("music"), mus)); f.appendChild(mfileL);

    var capL = el("label"), cap = el("input", null, null, { type: "checkbox" });
    cap.checked = S.captions !== false; capL.appendChild(cap); capL.appendChild(document.createTextNode(" " + t("captions")));
    f.appendChild(capL);

    var go = el("button", "ra-b", t("generate"), { type: "button" });
    var stop = el("button", "ra-b ghost", t("cancel"), { type: "button" }); stop.hidden = true;
    var brow = el("div", "ra-row"); brow.appendChild(go); brow.appendChild(stop); f.appendChild(brow);

    /* honest notes about this device */
    if (!(window.SPEncode && window.SPEncode.has())) {
      f.appendChild(el("p", "ra-note ra-warn",
        "This browser cannot encode video (no WebCodecs). Use Chrome or Edge, or the Nirayana desktop app. / यह ब्राउज़र वीडियो नहीं बना सकता (WebCodecs नहीं)। Chrome या Edge, या Nirayana डेस्कटॉप ऐप का उपयोग करें।"));
      go.disabled = true;
    } else if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      f.appendChild(el("p", "ra-note",
        "On a phone this works but renders more slowly — a 45 s reel can take a few minutes. / फ़ोन पर यह चलता है पर धीरे — 45 सेकंड की रील में कुछ मिनट लग सकते हैं।"));
    }

    /* right side: progress, then the result */
    var steps = el("ul", "ra-steps");
    STEPS.forEach(function (k) { var li = el("li", null, C().t(k)); li.dataset.k = k; steps.appendChild(li); });
    var pr = el("progress", "ra-pr", null, { max: "1", value: "0" });
    var msg = el("div", "ra-note");
    var res = el("div");
    var meter = el("div", "ra-meter");
    out.appendChild(steps); out.appendChild(pr); out.appendChild(meter); out.appendChild(msg); out.appendChild(res);

    var ft = el("div", "ra-ft", C().t("notposted"));
    pn.appendChild(ft);

    function setStep(k) {
      var seen = true;
      Array.prototype.forEach.call(steps.children, function (li) {
        if (li.dataset.k === k) { li.className = k === "s_done" ? "ok" : "on"; seen = false; }
        else li.className = seen ? "ok" : "";
      });
    }

    var EDIT = null;   /* the script as last generated or edited */

    function generate(lines) {
      go.disabled = true; stop.hidden = false; res.textContent = ""; msg.textContent = ""; pr.value = 0;
      var spec = { adapter: A, layout: lay.value, lang: lang.value, seconds: +len.value,
                   voice: { provider: prov.value, voice: gender.value, systemVoice: sysVoice.value },
                   captions: cap.checked, lines: lines || null };
      C().save({ lang: lang.value, voice: gender.value, seconds: +len.value, captions: cap.checked });
      var pre = Promise.resolve();
      if (prov.value === "upload") {
        if (!vfile.files[0] && !RA.voice.P.upload.has()) {
          msg.className = "ra-note ra-warn";
          msg.textContent = "Choose a voice file first. / पहले आवाज़ की फ़ाइल चुनें।";
          go.disabled = false; stop.hidden = true; return;
        }
        if (vfile.files[0]) pre = RA.voice.P.upload.load(vfile.files[0]);
      }
      if (mus.value === "file" && mfile.files[0])
        pre = pre.then(function () { return mfile.files[0].arrayBuffer().then(RA.voice.decode).then(function (b) { spec.music = b; }); });
      if (RA.net.allowed()) {
        spec.voice.provider = prov.value;
        spec.voice.model = S.ttsModel || "";
        spec.voice.elevenVoice = S.elevenVoice || "";
      }
      var agentRun = RA.net.allowed() && !lines && RA.agent;
      pre.then(function () {
        if (!agentRun) return null;
        var ao = { brief: brief.value.trim(), layout: lay.value, lang: lang.value, seconds: +len.value,
                   skill: skill.value, provider: S.provider, model: S.model, adapter: A };
        return confirmSend(ao).then(function () {
          setStep("s_layout");
          return RA.agent.run(ao, function (ev) {
            if (ev.type === "tool") {
              setStep({ list_layouts: "s_layout", get_today: "s_layout", get_facts: "s_facts", write_script: "s_script",
                        verify_script: "s_check", kahani_scenes: "s_script", finish: "s_check" }[ev.name] || "s_script");
              msg.className = "ra-note"; msg.textContent = "→ " + ev.name;
            }
            if (ev.type === "usage") meter.textContent = "tokens " + ev.usage.in + " in / " + ev.usage.out + " out" +
              (ev.cost != null ? " · ≈ $" + ev.cost.toFixed(4) + " (estimate)" : " · see your provider for pricing");
          });
        }).then(function (st) {
          spec.layout = st.layout; spec.lines = st.lines;
          if (st.kahani) {
            spec.adapter = RA.kahani.surface();
            return spec.adapter.configure({ facts: st.facts }).then(function () {
              spec.agentCaption = st.finish; spec.mode = "connected"; return null;
            });
          }
          lay.value = st.layout;
          spec.agentCaption = st.finish;
          spec.mode = "connected";
          return null;
        });
      }).then(function () {
        return RA.render.run(spec, { step: setStep, progress: function (p) { pr.value = p; },
                                     line: function (i, n) { msg.className = "ra-note"; msg.textContent = C().t("s_voice") + " " + (i + 1) + "/" + n; } });
      }).then(function (r) {
        r.mode = spec.mode || "offline"; r.provider = spec.mode ? S.provider : null;
        if (spec.agentCaption) r.caption = spec.agentCaption.caption + "\n\n" + (spec.agentCaption.hashtags || []).join(" ") +
          "\n\n" + C().hi("study") + "\n" + C().en("study");
        go.disabled = false; stop.hidden = true; pr.value = 1; msg.textContent = "";
        EDIT = r.lines; show(r);
      }).catch(function (e) {
        go.disabled = false; stop.hidden = true;
        msg.className = "ra-note ra-warn";
        msg.textContent = e.cancelled ? "Cancelled. / रोका गया।" : (e.message || String(e));
        if (e.violations && e.result) { EDIT = e.result.lines; editor(e.result, e.violations); }
      });
    }

    function download(blob, name) {
      var a = document.createElement("a"), u = URL.createObjectURL(blob);
      a.href = u; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
    }
    function saveOrDownload(blob, name) {
      if (RA.native && RA.native.saveFile && C().inApp()) return RA.native.saveFile(blob, name).catch(function () { download(blob, name); });
      download(blob, name);
    }

    function editor(r, violations) {
      var ed = el("div", "ra-ed");
      ed.appendChild(el("h3", null, "Script / स्क्रिप्ट"));
      var bad = {};
      (violations || []).forEach(function (v) { (bad[v.line] = bad[v.line] || []).push(v); });
      r.lines.forEach(function (L, i) {
        var row = el("div", "ra-ln" + (bad[i] ? " bad" : ""));
        row.appendChild(el("b", null, (i + 1) + " · " + L.beats[0] + (L.beats[1] !== L.beats[0] ? "–" + L.beats[1] : "")));
        var box = el("div");
        var ta = el("textarea"); ta.value = L.narration;
        var ci = el("input", null, null, { type: "text", placeholder: "caption ≤ 4 words / कैप्शन ≤ 4 शब्द" }); ci.value = L.caption || "";
        ta.addEventListener("input", function () { EDIT[i].narration = ta.value; });
        ci.addEventListener("input", function () { EDIT[i].caption = ci.value; });
        var rv = el("button", "ra-b ghost", "↻ " + t("revoice"), { type: "button" });
        rv.addEventListener("click", function () { RA.voice.bust(EDIT[i].narration, lang.value); generate(EDIT); });
        box.appendChild(ta); box.appendChild(ci); box.appendChild(rv); row.appendChild(box);
        (bad[i] || []).forEach(function (v) { row.appendChild(el("div", "ra-vio", v.en + " / " + v.hi)); });
        ed.appendChild(row);
      });
      var rg = el("button", "ra-b", t("regen"), { type: "button" });
      rg.addEventListener("click", function () { generate(EDIT); });
      ed.appendChild(rg);
      res.appendChild(ed);
    }

    function show(r) {
      res.textContent = "";
      var url = URL.createObjectURL(r.blob);
      var pv = el("div", "ra-prev"), v = el("video", null, null, { controls: "", playsinline: "" });
      v.src = url; pv.appendChild(v);
      var side = el("div");
      if (r.thumb) { var im = el("img", null, null, { alt: C().t("thumb") }); im.src = URL.createObjectURL(r.thumb); side.appendChild(im); }
      var info = el("p", "ra-note",
        (r.title || "") + " — " + (r.duration ? r.duration.toFixed(2) : "?") + " s (planned " + r.expected.toFixed(2) + " s) · " +
        r.file.codec + (r.file.audioCodec ? " + " + r.file.audioCodec : " (no audio track)") + " · " + r.ext.toUpperCase() +
        (r.loudness && isFinite(r.loudness.after) ? " · " + r.loudness.after.toFixed(1) + " LUFS" : ""));
      side.appendChild(info);
      if (r.file.reason) side.appendChild(el("p", "ra-note", r.file.reason));
      if (r.english) side.appendChild(el("p", "ra-note ra-warn",
        "This layout has no Hindi text of its own yet; some lines are in English. / इस लेआउट का अपना हिंदी पाठ अभी नहीं है; कुछ पंक्तियाँ अंग्रेज़ी में हैं।"));
      var row = el("div", "ra-row");
      var base = (r.layout || "reel").replace(/[^\w.-]+/g, "-");
      var b1 = el("button", "ra-b", t("download") + " " + r.ext.toUpperCase(), { type: "button" });
      b1.addEventListener("click", function () { saveOrDownload(r.blob, base + "." + r.ext); });
      var b2 = el("button", "ra-b ghost", ".srt", { type: "button" });
      b2.addEventListener("click", function () { saveOrDownload(new Blob([r.srt], { type: "text/plain" }), base + ".srt"); });
      var b3 = el("button", "ra-b ghost", "thumb.jpg", { type: "button" });
      b3.addEventListener("click", function () { if (r.thumb) saveOrDownload(r.thumb, base + "-thumb.jpg"); });
      var b4 = el("button", "ra-b ghost", t("copycap"), { type: "button" });
      b4.addEventListener("click", function () {
        var done = function () { b4.textContent = "✓ " + t("copycap"); };
        if (navigator.clipboard) navigator.clipboard.writeText(r.caption).then(done, function () { download(new Blob([r.caption], { type: "text/plain" }), base + "-caption.txt"); });
        else download(new Blob([r.caption], { type: "text/plain" }), base + "-caption.txt");
      });
      [b1, b2, b3, b4].forEach(function (b) { row.appendChild(b); });
      if (window.SPVoice && window.SPVoice.canShare && !C().inApp()) {
        var file = new File([r.blob], base + "." + r.ext, { type: r.mime });
        if (window.SPVoice.canShare(file)) {
          var b5 = el("button", "ra-b ghost", t("share"), { type: "button" });
          b5.addEventListener("click", function () { window.SPVoice.share(r.blob, base + "." + r.ext); });
          row.appendChild(b5);
        }
      }
      if (RA.native && RA.native.share && C().inApp()) {
        var b6 = el("button", "ra-b ghost", t("reveal"), { type: "button" });
        b6.addEventListener("click", function () { RA.native.share(r.blob, base + "." + r.ext); });
        row.appendChild(b6);
      }
      side.appendChild(row);
      pv.appendChild(side);
      res.appendChild(pv);
      if (RA.library && RA.library.save) RA.library.save(r).catch(function () {});
      editor(r, r.violations);
      OPEN.last = r;
    }

    /* WHAT WILL BE SENT — shown once per provider per session, before the
       first request; nothing is sent until the reader says so */
    function confirmSend(ao) {
      var k = "nirayana.reelAgent.previewed." + ao.provider;
      try { if (sessionStorage.getItem(k)) return Promise.resolve(); } catch (e) {}
      return new Promise(function (resolve, reject) {
        var pv = RA.agent.preview(ao), sh = el("div", "ra-sheet");
        sh.appendChild(el("b", null, "What will be sent / क्या भेजा जाएगा"));
        sh.appendChild(el("p", "ra-note", "To " + pv.host + " · model " + pv.model + ". Your birth data and kundli are never sent. / आपका जन्म विवरण और कुंडली कभी नहीं भेजी जाती।"));
        var pre1 = el("pre", null, "SYSTEM (skill):\n" + pv.system + "\n\nFIRST MESSAGE:\n" + pv.message + "\n\nTOOLS: " + pv.tools.join(", ") + "\n\nLATER: " + pv.later);
        sh.appendChild(pre1);
        var yes = el("button", "ra-b", "Send / भेजें", { type: "button" }), no = el("button", "ra-b ghost", t("cancel"), { type: "button" });
        var r = el("div", "ra-row"); r.appendChild(yes); r.appendChild(no); sh.appendChild(r);
        res.textContent = ""; res.appendChild(sh);
        yes.addEventListener("click", function () { try { sessionStorage.setItem(k, "1"); } catch (e) {} sh.remove(); resolve(); });
        no.addEventListener("click", function () { sh.remove(); var e = new Error("Not sent. / नहीं भेजा गया।"); reject(e); });
      });
    }

    bSet.addEventListener("click", function () { settingsView(res, function () { close(); open(opts); }); });
    bLib.addEventListener("click", function () {
      RA.library.show(res, function (rec) { EDIT = rec.lines; lay.value = rec.layout; lang.value = rec.lang || "hi"; editor({ lines: rec.lines }, []); });
    });

    go.addEventListener("click", function () { generate(null); });
    stop.addEventListener("click", function () { RA.render.cancel(); });
    x.addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(ov);
    OPEN = { ov: ov, opts: opts, generate: generate, last: null,
             set: function (k, v) { ({ lang: lang, layout: lay, provider: prov, length: len, gender: gender })[k].value = v; syncVoice(); } };
    return OPEN;
  }
  /* ---- settings: mode, keys, model, voice, skills ---------------------- */
  function settingsView(host, reopen) {
    var el = C().el, S = C().settings();
    host.textContent = "";
    var w = el("div", "ra-set");
    w.appendChild(el("h3", null, "Mode / मोड"));
    var off = el("label"), on = el("label");
    var rOff = el("input", null, null, { type: "radio", name: "ra-mode" }), rOn = el("input", null, null, { type: "radio", name: "ra-mode" });
    rOff.checked = S.mode !== "connected"; rOn.checked = S.mode === "connected";
    off.appendChild(rOff); off.appendChild(document.createTextNode(" Offline (default) — nothing leaves this device / ऑफ़लाइन — कुछ भी बाहर नहीं जाता"));
    on.appendChild(rOn); on.appendChild(document.createTextNode(" Connected — your own Claude or Gemini key / अपनी Claude या Gemini key"));
    w.appendChild(off); w.appendChild(on);
    var warn = el("div", "ra-sheet");
    warn.appendChild(el("p", null, "Connected mode sends the brief, the animation's facts and the narration text to the AI service you choose, using your own key and billed to you. Your birth data and kundli are never sent." +
      (C().inApp() ? " In the desktop app your key is kept in the system keychain and the request is made by the app, not the page."
                   : " On the website your key is stored in this browser's local storage, where anyone with access to this browser profile could read it. Use a key with a spending limit.")));
    warn.appendChild(el("p", null, "Connected mode में विवरण, एनिमेशन के तथ्य और वाचन का पाठ आपकी चुनी AI सेवा को, आपकी अपनी key से, भेजे जाते हैं। आपका जन्म विवरण और कुंडली कभी नहीं भेजी जाती।"));
    var ack = el("label"), ackI = el("input", null, null, { type: "checkbox" });
    ack.appendChild(ackI); ack.appendChild(document.createTextNode(" I understand / मैं समझता/समझती हूँ"));
    warn.appendChild(ack); w.appendChild(warn);
    warn.hidden = !rOn.checked; ackI.checked = S.mode === "connected";
    rOn.addEventListener("change", function () { warn.hidden = false; });
    rOff.addEventListener("change", function () { warn.hidden = true; C().save({ mode: "offline" }); });
    ackI.addEventListener("change", function () { C().save({ mode: ackI.checked && rOn.checked ? "connected" : "offline" }); });

    w.appendChild(el("h3", null, "Provider and key / प्रदाता और key"));
    var pv = el("select");
    ["anthropic", "gemini"].forEach(function (k) { opt(pv, k, RA.keys.PROVIDERS[k].label, S.provider === k); });
    w.appendChild(pv);
    var kin = el("input", null, null, { type: "password", placeholder: "paste key / key चिपकाएँ", autocomplete: "off" });
    var ks = el("span", "ra-note");
    var kSave = el("button", "ra-b", "Save key / सहेजें", { type: "button" }), kDel = el("button", "ra-b ghost", "Forget / भूलें", { type: "button" });
    function stat() { RA.keys.status(pv.value).then(function (st) { ks.textContent = st.stored ? " stored " + st.hint : " no key stored / कोई key नहीं"; }); }
    pv.addEventListener("change", function () { C().save({ provider: pv.value, model: "" }); stat(); models.textContent = ""; });
    kSave.addEventListener("click", function () { RA.keys.set(pv.value, kin.value).then(function () { kin.value = ""; stat(); }, function (e) { ks.textContent = " " + e.message; }); });
    kDel.addEventListener("click", function () { RA.keys.forget(pv.value).then(stat); });
    w.appendChild(kin); var kr = el("div", "ra-row"); kr.appendChild(kSave); kr.appendChild(kDel); kr.appendChild(ks); w.appendChild(kr); stat();

    w.appendChild(el("h3", null, "Model / मॉडल"));
    var mIn = el("input", null, null, { type: "text", placeholder: RA.providers.get(S.provider).defaultModel });
    mIn.value = S.model || "";
    mIn.addEventListener("change", function () { C().save({ model: mIn.value.trim() }); });
    var models = el("select");
    var mLoad = el("button", "ra-b ghost", "List my models / मेरे मॉडल", { type: "button" });
    mLoad.addEventListener("click", function () {
      RA.providers.get(pv.value).models().then(function (ms) {
        models.textContent = ""; ms.forEach(function (m) { opt(models, m.id, m.label + " — " + m.id, m.id === S.model); });
      }, function (e) { mIn.placeholder = e.message; });
    });
    models.addEventListener("change", function () { mIn.value = models.value; C().save({ model: models.value }); });
    w.appendChild(mIn); var mr = el("div", "ra-row"); mr.appendChild(mLoad); mr.appendChild(models); w.appendChild(mr);
    w.appendChild(el("p", "ra-note", "Default: the provider's fastest, least expensive model. / डिफ़ॉल्ट: सबसे तेज़, सबसे सस्ता मॉडल।"));

    w.appendChild(el("h3", null, "Neural voice (Connected) / न्यूरल आवाज़"));
    var tm = el("input", null, null, { type: "text", placeholder: "Gemini TTS model, e.g. " + RA.voice.P["gemini-tts"].model });
    tm.value = S.ttsModel || ""; tm.addEventListener("change", function () { C().save({ ttsModel: tm.value.trim() }); });
    w.appendChild(tm);
    var ev = el("input", null, null, { type: "text", placeholder: "ElevenLabs voice ID (optional)" });
    ev.value = S.elevenVoice || ""; ev.addEventListener("change", function () { C().save({ elevenVoice: ev.value.trim() }); });
    w.appendChild(ev);
    var ekin = el("input", null, null, { type: "password", placeholder: "ElevenLabs key (optional)", autocomplete: "off" });
    var ekb = el("button", "ra-b ghost", "Save ElevenLabs key", { type: "button" });
    ekb.addEventListener("click", function () { RA.keys.set("elevenlabs", ekin.value).then(function () { ekin.value = ""; ekb.textContent = "✓ saved"; }); });
    w.appendChild(ekin); w.appendChild(ekb);

    if (C().inApp()) {
      w.appendChild(el("h3", null, "Daily reel / रोज़ की रील"));
      var dl0 = el("label"), dI = el("input", null, null, { type: "checkbox" });
      dI.checked = !!S.daily; dl0.appendChild(dI);
      dl0.appendChild(document.createTextNode(" Prepare today's reel at 06:30 while the app is open / ऐप खुला हो तो 06:30 पर आज की रील तैयार करें"));
      dI.addEventListener("change", function () { C().save({ daily: dI.checked }); });
      w.appendChild(dl0);
      var al = el("label"), aI = el("input", null, null, { type: "checkbox" });
      al.appendChild(aI); al.appendChild(document.createTextNode(" Open Nirayana at login, so the 06:30 reel is ready / लॉगिन पर Nirayana खोलें"));
      C().invoke("plugin:autostart|is_enabled", {}).then(function (v) { aI.checked = !!v; }).catch(function () { al.hidden = true; });
      aI.addEventListener("change", function () { C().invoke(aI.checked ? "plugin:autostart|enable" : "plugin:autostart|disable", {}).catch(function () {}); });
      w.appendChild(al);
      w.appendChild(el("p", "ra-note", "It uses the offline engine script and this computer's voice unless Connected mode is on, saves the reel to your library and shows a notification. Nothing is posted. / कुछ भी पोस्ट नहीं होता।"));
    }

    w.appendChild(el("h3", null, "Handle / हैंडल"));
    var hIn = el("input", null, null, { type: "text" }); hIn.value = S.handle;
    hIn.addEventListener("change", function () { C().save({ handle: hIn.value.trim() || "@Nirayana.Soft" }); });
    w.appendChild(hIn);

    w.appendChild(el("h3", null, "Skills / स्किल"));
    w.appendChild(el("p", "ra-note", "The bundled skills are read-only; duplicate one to make your own. The fact check, the no-prediction rule and the no-birth-data rule are enforced in code and apply to every skill. / बंडल स्किल केवल पढ़ने के लिए हैं; अपनी बनाने के लिए कॉपी करें।"));
    var sk = el("select"), ta = el("textarea");
    var CUS = {}; try { CUS = JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}"); } catch (e) {}
    function fill() {
      sk.textContent = "";
      Object.keys(RA.skills || {}).forEach(function (k) { opt(sk, "b:" + k, RA.skills[k].title + " (bundled)"); });
      Object.keys(CUS).forEach(function (k) { opt(sk, "c:" + k, k + " (custom)"); });
    }
    function showSkill() {
      var v = sk.value, b = v.slice(0, 2) === "b:";
      ta.value = b ? RA.skills[v.slice(2)].body : CUS[v.slice(2)] || ""; ta.readOnly = b;
    }
    fill(); showSkill(); sk.addEventListener("change", showSkill);
    var dup = el("button", "ra-b ghost", "Duplicate / कॉपी करें", { type: "button" }), sv = el("button", "ra-b ghost", "Save / सहेजें", { type: "button" }),
        dl = el("button", "ra-b ghost", "Delete / हटाएँ", { type: "button" });
    function persist() { try { localStorage.setItem("nirayana.reelAgent.skills", JSON.stringify(CUS)); } catch (e) {} }
    dup.addEventListener("click", function () {
      var base = sk.value.slice(2), name = "my-" + base, n = 2; while (CUS[name]) name = "my-" + base + "-" + n++;
      CUS[name] = ta.value; persist(); fill(); sk.value = "c:" + name; showSkill();
    });
    sv.addEventListener("click", function () { if (sk.value.slice(0, 2) === "c:") { CUS[sk.value.slice(2)] = ta.value; persist(); sv.textContent = "✓"; } });
    dl.addEventListener("click", function () { if (sk.value.slice(0, 2) === "c:") { delete CUS[sk.value.slice(2)]; persist(); fill(); showSkill(); } });
    w.appendChild(sk); w.appendChild(ta); var sr = el("div", "ra-row"); [dup, sv, dl].forEach(function (b) { sr.appendChild(b); }); w.appendChild(sr);

    var done = el("button", "ra-b", "Done / हो गया", { type: "button" });
    done.addEventListener("click", function () { if (reopen) reopen(); });
    w.appendChild(el("p")); w.appendChild(done);
    host.appendChild(w);
  }

  function esc(e) { if (e.key === "Escape") close(); }
  function close() {
    if (!OPEN) return;
    try { RA.render.cancel(); } catch (e) {}
    OPEN.ov.remove(); document.removeEventListener("keydown", esc);
    RA.net.release();
    if (OPEN.opts.onClose) OPEN.opts.onClose();
    OPEN = null;
  }

  /* the "Make reel" button, placed after an existing control */
  function mount(afterSel, getLayout, cls, makeAdapter) {
    var at = document.querySelector(afterSel);
    if (!at || document.getElementById("ra-make")) return null;
    var b = C().el("button", cls || "reelbtn", C().t("make"), { type: "button", id: "ra-make" });
    b.addEventListener("click", function () {
      var A = makeAdapter ? makeAdapter() : (window.__bridge || RA.adapter.make("reel-studio"));
      if (!A) return;
      open({ adapter: A, layout: getLayout ? getLayout() : null });
    });
    at.parentNode.insertBefore(b, at.nextSibling);
    return b;
  }

  RA.panel = { open: open, close: close, mount: mount, settings: settingsView, current: function () { return OPEN; } };

  /* Reel Studio: the button sits beside "This frame as PNG" */
  function boot() {
    if (document.getElementById("ra-go") || document.getElementById("ra-lib")) css();
    if (document.getElementById("reel-still") && window.__bridge)
      mount("#reel-still", function () { var r = window.__reel && window.__reel.reel && window.__reel.reel(); return r ? r.key : null; }, "reelbtn");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 120); });
  else setTimeout(boot, 120);
})();
;

/* ===== Reel Agent — the other animating surfaces ===========================

   Reel Studio was first because it already had a pure frameAt(p). Every
   other surface had a frame function too — it was just private, or bound to
   the page's own canvas, or (for the SVG pages) one image load away from a
   pixel. Each page now publishes a small READ-ONLY handle (window.__spUI.
   reelSpec, window.__dp, window.__moRA, SPWorkstation.reel, window.__ayFilm,
   SPCosmos.frame) and this file turns each into the one adapter contract
   ra-adapter.js describes. Nothing here draws a second copy of anything: a
   frame is always the page's own renderer, pointed at the agent's canvas.

   What a reel SAYS comes from what the page computed — node values, scene
   dates, the ayanāṃśa at a year, which grahas change house — formatted
   here, never invented here. The facts are harvested from the same strings,
   so the verifier sees exactly what the narration says.

   PERSONAL. Three surfaces can draw the reader's own chart: the Kinetic
   Workstation's kuṇḍalī, the ceremony when it is wound to their stored birth
   moment, and a Motion scene that needs the chart. A Studio or Director
   selection that reads the chart counts too. Those adapters say personal:
   true, and the panel holds the network gate shut while they are open
   (RA.net.hold) — the narration of a kuṇḍalī is the kuṇḍalī. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var W = 1080, H = 1920;

  /* ---- words ------------------------------------------------------------ */
  var RASI_EN = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
                 "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var RASI_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक",
                 "धनु", "मकर", "कुम्भ", "मीन"];
  var GRAHA_HI = { Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु",
                   Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" };
  var GRAHA_SA = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha", Jupiter: "Guru",
                   Venus: "Śukra", Saturn: "Śani", Rahu: "Rāhu", Ketu: "Ketu" };
  /* the Sanskrit names as the pages print them, to Devanāgarī */
  var SA_HI = { "Sūrya": "सूर्य", "Candra": "चन्द्र", "Maṅgala": "मंगल", "Budha": "बुध", "Guru": "गुरु",
                "Śukra": "शुक्र", "Śani": "शनि", "Rāhu": "राहु", "Ketu": "केतु", "Lagna": "लग्न",
                "Graha": "ग्रह", "grahas": "ग्रह", "Yuddha": "युद्ध", "nakṣatra": "नक्षत्र",
                "Nakṣatra": "नक्षत्र", "rāśi": "राशि", "Rāśi": "राशि", "bhāva": "भाव", "Bhāva": "भाव",
                "daśā": "दशा", "Daśā": "दशा", "tithi": "तिथि", "Tithi": "तिथि", "yoga": "योग",
                "Yoga": "योग", "karaṇa": "करण", "vāra": "वार", "ayanāṃśa": "अयनांश",
                "All": "सभी", "nine": "नौ", "to": "से", "and": "और", "years": "साल", "year": "साल",
                "months": "महीने", "month": "महीना", "days": "दिन", "day": "दिन", "hours": "घंटे", "hour": "घंटा" };
  RASI_EN.forEach(function (n, i) { SA_HI[n] = RASI_HI[i]; });
  Object.keys(GRAHA_HI).forEach(function (k) { SA_HI[k] = GRAHA_HI[k]; });
  function hiWords(s) {
    return String(s || "").replace(/[A-Za-zĀ-ſḀ-ỿ]+/g, function (w) { return SA_HI[w] || w; });
  }
  function grahaName(en, lang) { return lang === "hi" ? (GRAHA_HI[en] || hiWords(en)) : (GRAHA_SA[en] || en); }
  function num(x) {
    var a = Math.abs(x);
    return a >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
  }
  function lonText(deg, lang) {
    var d = ((deg % 360) + 360) % 360, r = Math.floor(d / 30), k = Math.floor(d - r * 30);
    return lang === "hi" ? RASI_HI[r] + " " + k + " अंश" : RASI_EN[r] + " " + k + "°";
  }
  var MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
  function dateText(ms, lang) {
    var d = new Date(ms);
    return lang === "hi" ? d.getDate() + " " + RA.hi.MON[d.getMonth()] + " " + d.getFullYear()
                         : d.getDate() + " " + MON_EN[d.getMonth()] + " " + d.getFullYear();
  }
  function yearText(y, lang) {
    if (y <= 0) return (1 - y) + (lang === "hi" ? " ईसा पूर्व" : " BCE");
    return y + (lang === "hi" ? " ईस्वी" : " CE");
  }
  function L(lang) { return lang === "hi" ? "hi" : "en"; }

  /* ---- drawing helpers -------------------------------------------------- */
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function ground(c) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#131a33"); g.addColorStop(0.55, "#0a0e1d"); g.addColorStop(1, "#05070e");
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  /* a source of another shape, fitted to the frame's width and centred —
     returns the rectangle it landed in so the caption can use the bars */
  function letterbox(c, src, sw, sh) {
    var k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k;
    var x = (W - w) / 2, y = (H - h) / 2;
    c.drawImage(src, x, y, w, h);
    return { x: x, y: y, w: w, h: h };
  }
  function fitBox(sw, sh) {
    var k = Math.min(W / sw, H / sh), h = sh * k;
    return { y: (H - h) / 2, h: h };
  }
  function zonesFor(srcW, srcH, capY) {
    var b = fitBox(srcW, srcH), bot = H - (b.y + b.h);
    var cap = bot >= H * 0.15 ? { x: W * 0.06, y: b.y + b.h + bot * 0.12, w: W * 0.88, h: Math.min(bot * 0.7, H * 0.16) }
                              : { x: W * 0.06, y: capY || H * 0.70, w: W * 0.88, h: H * 0.13 };
    return { title: null, caption: cap, footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
  }
  function readSecs(s, lang) {
    if (window.SPScript && window.SPScript.readSecs) return window.SPScript.readSecs(s, lang);
    return 0.6 + String(s || "").length * (lang === "hi" ? 0.075 : 0.065);
  }

  /* ---- node values (Studio Pro and Director Pro) ------------------------ */
  function valText(v, lang) {
    if (!v) return "";
    switch (v.kind) {
      case "lon": return lonText(v.deg, lang);
      case "scalar":
        if (v.unit === "°") return num(v.v) + (lang === "hi" ? " अंश" : "°");
        return num(v.v) + (v.unit ? " " + (lang === "hi" ? hiWords(v.unit) : v.unit) : "");
      case "lonset":
        return (v.items || []).slice(0, 3).map(function (it) {
          var nm = it.en || it.label || "";
          return (nm ? grahaName(nm, lang) + " " : "") + lonText(it.deg, lang);
        }).join(", ");
      default: return "";
    }
  }
  function nodeLine(node, v, lang) {
    var lab = lang === "hi" ? hiWords(node.label) : node.label, val = valText(v, lang);
    return val ? lab + " — " + val : lab;
  }
  /* A node is personal when it answers with a chart and is silent without
     one. Any failure counts as personal: when unsure, stay on the device. */
  function nodePersonal(node, C) {
    if (!C || !C.J) return false;
    try {
      var C0 = {}; for (var k in C) C0[k] = C[k]; C0.J = null;
      return node.get(C) != null && node.get(C0) == null;
    } catch (e) { return true; }
  }

  /* ---- the common shell ------------------------------------------------- */
  function make(cfg) {
    var ST = null, BUSY = false;
    var A = {
      describe: function () {
        return {
          surface: cfg.id, label: cfg.label,
          personal: !!(ST ? ST.personal : (cfg.personalNow && cfg.personalNow())),
          layouts: [{ id: "current", label: cfg.layoutLabel || "What is on screen / जो स्क्रीन पर है",
                      group: cfg.label, defaultSeconds: ST ? Math.round(ST.seconds) : 15 }],
          size: { W: W, H: H },
          safeZones: ST && cfg.zones ? cfg.zones(ST) : zonesFor(W, H)
        };
      },
      configure: function (spec) {
        spec = spec || {};
        if (!cfg.have()) return Promise.reject(new Error(cfg.label + " is not on this page"));
        BUSY = true;
        if (ST && cfg.release) try { cfg.release(ST); } catch (e) {}
        return Promise.resolve().then(function () { return cfg.configure(spec); })
          .then(function (st) { st.lang = spec.lang || "hi"; ST = st; BUSY = false; return A.describe(); },
                function (e) { BUSY = false; throw e; });
      },
      ready: function () { return !!ST && !BUSY; },
      duration: function () { return ST ? ST.seconds : 0; },
      beats: function (lang) {
        if (!ST) return [];
        lang = lang || "hi";
        return cfg.beats(ST, L(lang)).map(function (b, i) {
          return { i: i, from: b.from, to: b.to, secs: b.to - b.from, say: b.say, need: readSecs(b.say, lang),
                   english: lang === "hi" && RA.hi.devanagariShare(b.say) < 0.5 };
        });
      },
      facts: function () {
        if (!ST) return [];
        var F = RA.facts, out = F.FRAMEWORK.slice();
        out.push({ id: "surface", label: "surface", value: cfg.label, unit: "", kind: "name", source: "page" });
        (cfg.facts ? cfg.facts(ST) : []).forEach(function (f) { out.push(f); });
        ["hi", "en"].forEach(function (lg) {
          cfg.beats(ST, lg).forEach(function (b, i) { out = out.concat(F.harvest(cfg.id + "." + lg + "." + i, cfg.label, b.say, "page")); });
        });
        return out;
      },
      frame: function (p, c) { return ST ? cfg.frame(ST, Math.max(0, Math.min(1, p)), c) : null; },
      title: function () { return ST && cfg.title ? cfg.title(ST) : null; },
      postCaption: function (lang) {
        if (!ST) return "";
        var b = cfg.beats(ST, L(lang || "hi"));
        return b.map(function (x) { return x.say; }).join("\n");
      },
      release: function () { if (ST && cfg.release) try { cfg.release(ST); } catch (e) {} }
    };
    return A;
  }

  /* even beats over [0, T] from a list of sentences */
  function spread(lines, T) {
    var n = lines.length || 1;
    return lines.map(function (s, i) { return { from: T * i / n, to: T * (i + 1) / n, say: s }; });
  }

  /* ======================================================================
     Studio Pro — the selection (or the storyboard) the recorder would record
     ====================================================================== */
  function studioPro() {
    return make({
      id: "studio-pro", label: "Studio Pro",
      have: function () { return !!(window.SPStage && window.__spUI && window.__spUI.reelSpec && window.SPNodes); },
      personalNow: function () {
        var R = window.__spUI && window.__spUI.reelSpec && window.__spUI.reelSpec();
        if (!R) return false;
        var ids = R.shots ? [].concat.apply([], R.shots.map(function (s) { return s.sel || []; })) : R.sel;
        return ids.some(function (id) { var n = window.SPNodes.byId(id); return n && nodePersonal(n, R.ctx); });
      },
      configure: function () {
        var R = window.__spUI.reelSpec(), S = window.SPStage.S;
        if (!R.sel.length && !R.shots) throw new Error("Pick something from the wall first. / पहले दीवार से कुछ चुनें।");
        var seconds = R.shots ? window.SPStage.storyTotal(R.shots) : R.dur;
        var groups = R.shots ? R.shots.map(function (s) { return { sel: s.sel || [], len: Math.max(1, s.seconds || 5) }; })
                             : [{ sel: R.sel, len: seconds }];
        var personal = false, items = [], acc = 0;
        groups.forEach(function (g) {
          var nodes = g.sel.map(function (id) { return window.SPNodes.byId(id); }).filter(Boolean).slice(0, 4);
          nodes.forEach(function (n, k) {
            if (nodePersonal(n, R.ctx)) personal = true;
            var v = window.SPNodes.resolve(n, R.ctx);
            items.push({ node: n, v: v, from: acc + g.len * k / nodes.length, to: acc + g.len * (k + 1) / nodes.length });
          });
          acc += g.len;
        });
        var r = window.SPStage.RATIOS[S.ratio] || window.SPStage.RATIOS["9:16"];
        var last = window.__spUI.last && window.__spUI.last();
        return { R: R, seconds: seconds, items: items, personal: personal,
                 off: canvas(r.w, r.h), sw: r.w, sh: r.h, label: last && last.label };
      },
      zones: function (st) { return zonesFor(st.sw, st.sh, H * 0.70); },
      beats: function (st, lang) {
        return st.items.map(function (it) { return { from: it.from, to: it.to, say: nodeLine(it.node, it.v, lang) }; });
      },
      frame: function (st, p, c) {
        var S = window.SPStage.S, R = st.R, off = st.off;
        var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U, safe: S.safe };
        S.cv = off; S.ctx = off.getContext("2d"); S.W = off.width; S.H = off.height; S.U = off.width; S.safe = false;
        try { window.SPStage.frameAt(R.shots || R.sel, R.ctx, p, R.force, R.shots, true); }
        catch (e) { /* the frame says what failed; the reel carries on */ }
        finally { S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U; S.safe = keep.safe; }
        ground(c); letterbox(c, off, st.sw, st.sh);
      }
    });
  }

  /* ======================================================================
     Director Pro — the document on the timeline, through DPRender.renderTo
     ====================================================================== */
  function directorPro() {
    function texts(sc, C) {
      var out = [];
      (sc.layers || []).forEach(function (Ly) {
        if (Ly.hidden) return;
        [Ly.text, Ly.sub].forEach(function (s) {
          if (!s) return;
          var t = window.SPDirector && window.SPDirector.expand ? window.SPDirector.expand(s, C) : s;
          t = String(t || "").replace(/\s+/g, " ").trim();
          if (t) out.push(t);
        });
      });
      return out;
    }
    return make({
      id: "director-pro", label: "Director Pro",
      have: function () { return !!(window.__dp && window.DPRender && window.DPModel); },
      configure: function () {
        var d = window.__dp.doc(), C = window.__dp.ctx(), M = window.DPModel;
        if (!d || !d.scenes || !d.scenes.length) throw new Error("The document has no scenes. / दस्तावेज़ में कोई दृश्य नहीं।");
        var F = M.FORMATS[d.format] || M.FORMATS.reel, k = Math.min(1, W / F.w, H / F.h);
        var sw = Math.round(F.w * k), sh = Math.round(F.h * k);
        var personal = false, scenes = [];
        d.scenes.forEach(function (sc, i) {
          var from = M.sceneStart(d, i), to = from + sc.seconds;
          var tx = texts(sc, C), views = [];
          (sc.layers || []).forEach(function (Ly) {
            if (Ly.kind !== "view" || !Ly.sel) return;
            Ly.sel.forEach(function (id) {
              var n = window.SPNodes && window.SPNodes.byId(id);
              if (!n) return;
              if (nodePersonal(n, C)) personal = true;
              views.push({ node: n, v: window.SPNodes.resolve(n, C) });
            });
          });
          (sc.layers || []).forEach(function (Ly) {
            if (C && C.J && /\{[^}]+\}/.test((Ly.text || "") + (Ly.sub || ""))) personal = true;
          });
          scenes.push({ from: from, to: to, name: sc.name || ("Scene " + (i + 1)), texts: tx, views: views.slice(0, 3) });
        });
        return { d: d, C: C, seconds: M.total(d), scenes: scenes, personal: personal,
                 off: canvas(sw, sh), sw: sw, sh: sh };
      },
      zones: function (st) { return zonesFor(st.sw, st.sh, H * 0.70); },
      beats: function (st, lang) {
        return st.scenes.map(function (s) {
          var say = s.texts.length ? s.texts.join(" — ")
                  : s.views.length ? s.views.map(function (x) { return nodeLine(x.node, x.v, lang); }).join("; ")
                  : (lang === "hi" ? hiWords(s.name) : s.name);
          return { from: s.from, to: s.to, say: say };
        });
      },
      frame: function (st, p, c) {
        window.DPRender.renderTo(st.off, st.sw, st.sh, st.d, st.C, p * st.seconds);
        ground(c); letterbox(c, st.off, st.sw, st.sh);
      }
    });
  }

  /* ======================================================================
     Motion — a scene, stepped on the recorder's own pacing schedule
     ====================================================================== */
  function motion() {
    var FPS = 30, CAP = 90;
    return make({
      id: "motion", label: "Motion",
      have: function () { return !!window.__moRA; },
      personalNow: function () { return window.__moRA.personal(); },
      configure: function (spec) {
        var M = window.__moRA, lang = L(spec.lang || "hi");
        if (!M.available()) throw new Error("This scene needs a chart. Cast one first. / इस दृश्य के लिए कुण्डली चाहिए।");
        var sch = M.schedule(FPS, CAP), off = canvas(W, H), n = sch.table.length;
        var K = Math.max(3, Math.min(6, Math.round(sch.seconds / 6)));
        var marks = [];
        for (var k = 1; k < K; k++) {
          var at = (k + 0.5) / K, p = sch.table[Math.min(n - 1, Math.round(at * (n - 1)))];
          marks.push({ at: at, p: p, hi: M.info(off, p, "hi"), en: M.info(off, p, "en") });
        }
        return { seconds: sch.seconds, table: sch.table, capped: sch.capped, full: sch.full, off: off,
                 K: K, marks: marks, personal: M.personal(), stage: M.stage(), scene: M.scene(),
                 words: { hi: M.words("hi"), en: M.words("en") }, spanW: { hi: M.span("hi"), en: M.span("en") }, lang0: lang };
      },
      zones: function (st) {
        var s = st.stage;
        return { title: null, caption: { x: W * 0.06, y: s.capY - H * 0.12, w: W * 0.88, h: H * 0.105 },
                 footer: { x: W * 0.05, y: s.capY + s.capH, w: W * 0.90, h: H - s.capY - s.capH } };
      },
      beats: function (st, lang) {
        var T = st.seconds, w = st.words[lang], out = [];
        var sp = lang === "hi" ? hiWords(st.spanW.en) : st.spanW.en;
        var head = w.title + (sp ? " — " + sp : "");
        out.push({ from: 0, to: T / st.K, say: head });
        st.marks.forEach(function (m, i) {
          var inf = m[lang], bits = [];
          if (inf && inf.ms != null && isFinite(inf.ms)) bits.push(dateText(inf.ms, lang));
          /* the frame's "·" is a separator for the eye; a voice wants a comma */
          if (inf && inf.sub) bits.push(String(inf.sub).replace(/\s*·\s*/g, ", "));
          if (!bits.length && i === 0 && w.sub) bits.push(w.sub);
          if (!bits.length) return;
          out.push({ from: T * (i + 1) / st.K, to: T * (i + 2) / st.K, say: bits.join(" — ") });
        });
        return out;
      },
      facts: function (st) {
        var F = RA.facts, o = [];
        st.marks.forEach(function (m, i) {
          if (m.en && m.en.ms != null && isFinite(m.en.ms)) o = o.concat(F.dateFacts("mo" + i, m.en.ms, "scene date"));
        });
        return o;
      },
      frame: function (st, p, c) {
        var n = st.table.length, q = st.table[Math.min(n - 1, Math.round(p * (n - 1)))];
        window.__moRA.draw(st.off, q, st.lang);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        c.drawImage(st.off, 0, 0, W, H);
      },
      title: function () { return null; }
    });
  }

  /* ======================================================================
     Kinetic Workstation — the two kuṇḍalīs, whole-sign then chalita
     ====================================================================== */
  function kinetic() {
    function snap(svg) { return window.SvgFilm.snapshot(svg, { margin: 0.02 }); }
    return make({
      id: "kinetic", label: "Kinetic Workstation",
      have: function () { return !!(window.SPWorkstation && window.SPWorkstation.reel && window.SvgFilm); },
      personalNow: function () { return true; },
      configure: function (spec) {
        var R = window.SPWorkstation.reel();
        if (!R) throw new Error("Cast a chart first. / पहले कुण्डली बनाएँ।");
        /* the view's own markup, built off-screen with the draw-in
           animations stripped, so the snapshot is the finished chart */
        var box = document.createElement("div");
        box.setAttribute("aria-hidden", "true");
        box.style.cssText = "position:fixed;left:-12000px;top:0;width:820px;pointer-events:none";
        box.innerHTML = R.html.replace(/\bws(draw|pop|flow)\b/g, "").replace(/id="ws-/g, 'id="ra-ws-');
        document.body.appendChild(box);
        var svgs = box.querySelectorAll("svg.wssvg");
        var jobs = Array.prototype.map.call(svgs, snap);
        return Promise.all(jobs).then(function (shots) {
          box.remove();
          var T = Math.max(spec.seconds || 20, R.chalita ? 16 : 9);
          return { R: R, shots: shots, seconds: T, personal: true };
        }, function (e) { box.remove(); throw e; });
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.06, w: W * 0.90, h: H * 0.07 },
                 caption: { x: W * 0.06, y: H * 0.72, w: W * 0.88, h: H * 0.13 },
                 footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
      },
      beats: function (st, lang) {
        var R = st.R, T = st.seconds, hi = lang === "hi";
        var lines = [hi ? "आपकी कुण्डली — लग्न " + RASI_HI[R.lagna] : "Your chart — lagna in " + RASI_EN[R.lagna],
                     hi ? "राशि चार्ट में हर राशि एक भाव है" : "In the rāśi chart, each sign is one house"];
        if (R.chalita) {
          lines.push(hi ? "श्रीपति भाव-चलित — भाव कोणों के बीच बँटते हैं" : "Śrīpati bhāva-chalita: houses trisected between the angles");
          var n = R.moved.length, names = R.moved.map(function (m) { return grahaName(m.en, lang); }).join(", ");
          lines.push(n ? (hi ? n + (n === 1 ? " ग्रह भाव बदलता है: " : " ग्रह भाव बदलते हैं: ") + names : n + (n === 1 ? " graha changes house: " : " grahas change house: ") + names)
                       : (hi ? "कोई ग्रह भाव नहीं बदलता" : "No graha changes house"));
        }
        return spread(lines, T);
      },
      frame: function (st, p, c) {
        ground(c);
        var two = st.shots.length > 1, half = two ? 0.5 : 1.01;
        var box = { x: W * 0.06, y: H * 0.22, s: W * 0.88 };
        function put(shot, a, z) {
          if (!shot || a <= 0) return;
          var k = Math.min(box.s / shot.w, box.s / shot.h) * z, w = shot.w * k, h = shot.h * k;
          c.save(); c.globalAlpha = a;
          c.drawImage(shot.img, W / 2 - w / 2, box.y + box.s / 2 - h / 2, w, h);
          c.restore();
        }
        var e1 = Math.min(1, p / 0.08), z1 = 0.92 + 0.08 * (1 - Math.pow(1 - e1, 3));
        var x = two ? Math.max(0, Math.min(1, (p - half) / 0.08)) : 0;
        /* a dip through the ground rather than a cross-fade: two diamonds
           superimposed read as one smudged chart */
        put(st.shots[0], e1 * Math.max(0, 1 - 2 * x), z1);
        if (two) put(st.shots[1], Math.max(0, 2 * x - 1), 0.96 + 0.04 * x);
      },
      title: function (st) { return st.lang === "hi" ? "कुण्डली · भाव-चलित" : "Kuṇḍalī · bhāva-chalita"; }
    });
  }

  /* ======================================================================
     The casting ceremony — wound to the moment in the page's own fields
     ====================================================================== */
  function ceremony() {
    function moment() {
      var d = document.getElementById("cer-date"), t = document.getElementById("cer-time");
      if (!d || !d.value) return null;
      var ms = Date.parse(d.value + "T" + ((t && t.value) || "12:00") + ":00");
      return isNaN(ms) ? null : new Date(ms);
    }
    /* the same record the page reads for "My chart's moment" */
    function isBirth(m) {
      var i = null;
      try { i = JSON.parse(localStorage.getItem("nirayana.birth") || "null"); } catch (e) { return false; }
      if (!i || i.year == null || !m) return false;
      var ms = Date.UTC(i.year, (i.month || 1) - 1, i.day || 1, i.hour || 0, i.minute || 0) - (i.tzHours || 0) * 3600000;
      return Math.abs(ms - m.getTime()) < 120000;
    }
    return make({
      id: "ceremony", label: "The casting ceremony",
      have: function () { return !!(window.SPCosmos && window.SPCosmos.ceremony && window.SvgFilm); },
      personalNow: function () { return isBirth(moment()); },
      configure: function (spec) {
        var m = moment();
        if (!m) throw new Error("Pick a date first. / पहले तारीख़ चुनें।");
        window.SPCosmos.ceremony(m, { hold: true, line: "चुने हुए क्षण की ओर लौट रहा है आकाश…",
                                     sub: "Winding the sky back to the chosen moment", cta: "End the ceremony" });
        /* the overlay can take a moment — longer if a previous one is still
           closing — so wait for it rather than for a fixed time */
        function live() { var f = window.SPCosmos.frame && window.SPCosmos.frame(); return f && f.svg() ? f : null; }
        function until(ms) {
          return live() || ms <= 0 ? Promise.resolve(live()) : RA.core.wait(100).then(function () { return until(ms - 100); });
        }
        return RA.core.wait(450).then(function () {
          try { window.SPCosmos.end(); } catch (e) {}
          return until(4000);
        }).then(function (f) {
          if (!f) {
            /* raised while the last one was still closing: raise it again */
            window.SPCosmos.ceremony(m, { hold: true, line: "चुने हुए क्षण की ओर लौट रहा है आकाश…",
                                         sub: "Winding the sky back to the chosen moment", cta: "End the ceremony" });
            return RA.core.wait(450).then(function () { try { window.SPCosmos.end(); } catch (e) {} return until(4000); });
          }
          return f;
        }).then(function (f) {
          if (!f) throw new Error("The ceremony did not open. / समारोह नहीं खुला।");
          f.pause();
          var r = f.read();
          return { m: m, f: f, spin0: r.spin || 0, seconds: Math.max(spec.seconds || 14, 12), personal: isBirth(m) };
        });
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.06, w: W * 0.90, h: H * 0.07 },
                 caption: { x: W * 0.06, y: H * 0.74, w: W * 0.88, h: H * 0.13 },
                 footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
      },
      beats: function (st, lang) {
        var hi = lang === "hi", m = st.m, hh = ("0" + m.getHours()).slice(-2), mm = ("0" + m.getMinutes()).slice(-2);
        return [
          { from: 0, to: st.seconds * 0.4, say: hi ? "आकाश " + dateText(m, "hi") + " की ओर लौट रहा है" : "The sky winds back to " + dateText(m, "en") },
          { from: st.seconds * 0.4, to: st.seconds * 0.72, say: hi ? "सत्ताईस नक्षत्र, बारह राशियाँ" : "Twenty-seven nakṣatras, twelve rāśis" },
          { from: st.seconds * 0.72, to: st.seconds, say: hi ? hh + " बजकर " + mm + " मिनट का आकाश" : "The sky at " + hh + " " + mm + " hours" }
        ];
      },
      facts: function (st) { return RA.facts.dateFacts("cer", st.m.getTime(), "ceremony moment"); },
      frame: function (st, p, c) {
        var f = st.f;
        f.set({ p: Math.min(1, p / 0.7), spin: st.spin0 + p * st.seconds * 4 });
        var svg = f.svg();
        if (!svg) { ground(c); return null; }
        return window.SvgFilm.snapshot(svg).then(function (shot) {
          ground(c);
          var top = H * 0.17, avail = H * 0.52, k = Math.min((W * 1.12) / shot.w, avail / shot.h);
          c.drawImage(shot.img, (W - shot.w * k) / 2, top + (avail - shot.h * k) / 2, shot.w * k, shot.h * k);
        });
      },
      title: function (st) { return st.lang === "hi" ? "नक्षत्र चक्र" : "The nakṣatra ring"; },
      release: function () { try { window.SPCosmos.abort(); } catch (e) {} }
    });
  }

  /* ======================================================================
     The ayanāṃśa film — the rings across four thousand years, with holds
     where the narration names a year
     ====================================================================== */
  function ayanamsa() {
    /* playhead → year: hold, sweep, hold, sweep, hold */
    var P = [0, 0.2, 0.45, 0.6, 0.8, 1], Y = [-500, -500, 2000, 2000, 3500, 3500];
    function yearAt(p) {
      for (var i = 1; i < P.length; i++) if (p <= P[i]) {
        var u = (p - P[i - 1]) / (P[i] - P[i - 1]); u = u * u * (3 - 2 * u);
        return Y[i - 1] + (Y[i] - Y[i - 1]) * u;
      }
      return Y[Y.length - 1];
    }
    function deg(v) { return (v < 0 ? "−" : "") + (Math.round(Math.abs(v) * 10) / 10); }
    function dm(v) {
      var a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60);
      if (m === 60) { d++; m = 0; }
      return (v < 0 ? "−" : "") + d + "°" + ("0" + m).slice(-2) + "′";
    }
    return make({
      id: "ayanamsa-film", label: "Ayanāṃśa film",
      have: function () { return !!(window.__ayFilm && window.SvgFilm && window.__ayFilm.svg()); },
      configure: function (spec) {
        var F = window.__ayFilm;
        var a0 = F.value(-500), a1 = F.value(2000), a2 = F.value(3500);
        if (a0 == null || a1 == null || a2 == null) throw new Error("This ayanāṃśa has no value across that span. / इस अयनांश का मान इस अवधि में नहीं है।");
        var per = Math.round(2500 / Math.abs(a1 - a0));
        return { F: F, keep: F.year(), name: F.name(), a: [a0, a1, a2], per: per,
                 seconds: Math.max(spec.seconds || 16, 14), personal: false };
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.015, w: W * 0.90, h: H * 0.055 },
                 caption: { x: W * 0.06, y: H * 0.805, w: W * 0.88, h: H * 0.10 },
                 footer: { x: W * 0.05, y: H * 0.92, w: W * 0.90, h: H * 0.08 } };
      },
      beats: function (st, lang) {
        var T = st.seconds, hi = lang === "hi", a = st.a;
        function at(y, v) { return hi ? yearText(y, "hi") + " में: " + deg(v) + " अंश" : "In " + yearText(y, "en") + ": " + deg(v) + "°"; }
        return [
          { from: 0, to: P[1] * T, say: (hi ? st.name + " अयनांश — " : st.name + " ayanāṃśa — ") + at(-500, a[0]) },
          { from: P[1] * T, to: P[2] * T, say: hi ? "हर " + st.per + " साल में लगभग एक अंश" : "About one degree every " + st.per + " years" },
          { from: P[2] * T, to: P[3] * T, say: at(2000, a[1]) },
          { from: P[3] * T, to: P[4] * T, say: hi ? "तारे वहीं रहते हैं, ऋतुएँ खिसकती हैं" : "The stars stay. The seasons slip." },
          { from: P[4] * T, to: T, say: at(3500, a[2]) }
        ];
      },
      facts: function (st) {
        return [{ id: "ay.-500", label: "ayanāṃśa at 501 BCE (°)", value: st.a[0], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.2000", label: "ayanāṃśa at 2000 CE (°)", value: st.a[1], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.3500", label: "ayanāṃśa at 3500 CE (°)", value: st.a[2], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.per", label: "years per degree, 501 BCE–2000 CE", value: st.per, unit: "", kind: "number", source: "engine" }];
      },
      frame: function (st, p, c) {
        var F = st.F, y = Math.round(yearAt(p));
        F.at(y);
        var svg = F.svg();
        return window.SvgFilm.snapshot(svg).then(function (shot) {
          var v = F.value(y);
          F.paint(c, W, H, { head: "", big: v == null ? "" : dm(v), foot: "",
                             sub: yearText(y, st.lang === "hi" ? "hi" : "en") + " · " + st.name }, shot);
        });
      },
      title: function (st) { return st.lang === "hi" ? "अयनांश — दो राशिचक्रों का अंतर" : "The ayanāṃśa — the gap between two zodiacs"; },
      release: function (st) { st.F.done(st.keep); }
    });
  }

  var MAKERS = { "studio-pro": studioPro, "director-pro": directorPro, motion: motion,
                 kinetic: kinetic, ceremony: ceremony, "ayanamsa-film": ayanamsa };
  Object.keys(MAKERS).forEach(function (k) { if (RA.adapter) RA.adapter.register(k, MAKERS[k]); });

  /* ---- the buttons ------------------------------------------------------
     Each sits beside the page's own record button. Motion and Director
     build their controls after load (and Motion rebuilds its pane), so the
     check repeats; it is one querySelector a second and stops looking for a
     surface that is not on the page. */
  var PLACES = [
    { id: "studio-pro", sel: "#sp-rec", cls: "spbtn" },
    { id: "director-pro", find: function () {
        var b = document.querySelectorAll("button.dpbtn.primary");
        for (var i = 0; i < b.length; i++) if (/Record the reel/.test(b[i].textContent)) return b[i];
        return null; }, cls: "dpbtn", need: function () { return !!window.__dp; } },
    /* the Workstation carries the report bundle, Motion pane and all, so it
       is asked first and Motion is the Motion page only */
    { id: "kinetic", sel: "#wsb-print", cls: "wsact", need: function () { return !!window.SPWorkstation; } },
    { id: "motion", sel: "#movid", cls: "k-btn sec", need: function () { return !!window.__moRA && !window.SPWorkstation; } },
    { id: "ceremony", sel: "#cer-save", cls: "k-btn sec" },
    { id: "ayanamsa-film", sel: "[data-ay=\"film\"]", cls: "swbtn" }
  ];
  function place() {
    if (!RA.panel || document.getElementById("ra-make")) return;
    for (var i = 0; i < PLACES.length; i++) {
      var P0 = PLACES[i], at = P0.find ? P0.find() : document.querySelector(P0.sel);
      if (!at) continue;
      if (P0.need && !P0.need()) continue;
      at.setAttribute("data-ra-anchor", P0.id);
      RA.panel.mount("[data-ra-anchor=\"" + P0.id + "\"]", function () { return "current"; }, P0.cls,
                     MAKERS[P0.id]);
      return;
    }
  }
  var TICKS = 0;
  function loop() {
    place();
    if (++TICKS < 600) setTimeout(loop, 1000);
  }
  /* Reel Studio has its own button (ra-panel.js); these pages never load
     reel.js, so the two cannot meet */
  function boot() { if (!document.getElementById("reel-still")) loop(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 300); });
  else setTimeout(boot, 300);

  RA.surfaces = { make: function (id) { return MAKERS[id] ? MAKERS[id]() : null; }, list: function () { return Object.keys(MAKERS); },
                  hiWords: hiWords, yearText: yearText, dateText: dateText, lonText: lonText };
})();
;

/* ===== Reel Agent — reel-agent.html, today's ideas, the offline matcher ==

   THE OFFLINE MATCHER. With no key, a plain-language request still has to
   become a layout. It is matched on this device: every nakṣatra and rāśi by
   its Hindi or English name, the festivals, eclipses, retrogrades, the
   hidings and the framework, plus a length if one is said ("45 सेकंड",
   "60 sec"). It is a lookup, not understanding, and the page says which
   layout it chose and why, so a wrong guess is visible and can be changed.

   TODAY. RA.today(date) builds the day's ideas from the pañcāṅga already on
   the page (NP): a festival today first, then today's nakṣatra, then the
   saṅkrānti if one falls today. Each idea names a Reel Studio layout. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  var NAK_HI = ("अश्विनी भरणी कृत्तिका रोहिणी मृगशिरा आर्द्रा पुनर्वसु पुष्य आश्लेषा मघा पूर्वाफाल्गुनी " +
    "उत्तराफाल्गुनी हस्त चित्रा स्वाती विशाखा अनुराधा ज्येष्ठा मूल पूर्वाषाढ़ा उत्तराषाढ़ा श्रवण धनिष्ठा " +
    "शतभिषा पूर्वभाद्रपद उत्तरभाद्रपद रेवती").split(" ");
  var NAK_EN = ("ashwini bharani krittika rohini mrigashira ardra punarvasu pushya ashlesha magha " +
    "purvaphalguni uttaraphalguni hasta chitra swati vishakha anuradha jyeshtha mula purvashadha " +
    "uttarashadha shravana dhanishta shatabhisha purvabhadrapada uttarabhadrapada revati").split(" ");
  var NAK_ALT = { "स्वाति": 15, "अश्लेषा": 9, "मूला": 19, "मृगशीर्ष": 5, "श्रविष्ठा": 23, "शतभिषक": 24,
                  "mrigashirsha": 5, "aswini": 1, "shatabhishak": 24, "moola": 19, "jyestha": 18, "dhanishtha": 23 };
  var RASHI_HI = "मेष वृषभ मिथुन कर्क सिंह कन्या तुला वृश्चिक धनु मकर कुंभ मीन".split(" ");
  var RASHI_EN = "mesha vrishabha mithuna karka simha kanya tula vrishchika dhanu makara kumbha meena".split(" ");
  var RASHI_WEST = "aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" ");
  var FEST = { diwali: ["दीवाली", "दिवाली", "deepavali", "diwali", "divali"], dussehra: ["दशहरा", "विजयादशमी", "dussehra", "dasara", "vijayadashami"],
               holi: ["होली", "holi"], ramanavami: ["राम नवमी", "रामनवमी", "ramanavami", "ram navami"],
               navaratri: ["नवरात्रि", "नवरात्र", "navratri", "navaratri"], ugadi: ["उगादि", "गुड़ी पड़वा", "ugadi", "gudi padwa"],
               makara: ["मकर संक्रांति", "संक्रांति", "makar sankranti", "sankranti", "makara"],
               janmashtami: ["जन्माष्टमी", "janmashtami"], mahashivaratri: ["महाशिवरात्रि", "शिवरात्रि", "shivratri", "mahashivaratri"] };
  var GRAHA = { mars: ["मंगल", "mangal", "mars", "कुज"], jupiter: ["बृहस्पति", "गुरु", "guru", "jupiter", "brihaspati"],
                saturn: ["शनि", "shani", "saturn"], mercury: ["बुध", "budh", "budha", "mercury"], venus: ["शुक्र", "shukra", "venus"] };

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ṁṃ]/g, "m");
  }
  function has(q, words) { return words.some(function (w) { return q.indexOf(norm(w)) >= 0; }); }

  /* → { layout, seconds, why } or null */
  function match(text, layouts) {
    var q = norm(text), ids = {};
    (layouts || []).forEach(function (L) { ids[L.id] = L; });
    var secs = null, m = /(\d{2,3})\s*(?:सेकंड|सेकेंड|second|sec|s\b)/i.exec(RA.facts ? RA.facts.devToAscii(text) : text);
    if (m) secs = Math.max(15, Math.min(90, +m[1]));
    var month = has(q, ["मास", "महीना", "month", "maas"]);
    function pick(id, why) { return ids[id] ? { layout: id, seconds: secs, why: why } : null; }
    var k, r;
    for (k in FEST) if (has(q, FEST[k])) { r = pick((month ? "fest.moon." : "fest.when.") + k, "festival: " + k); if (r) return r; }
    var vakri = has(q, ["वक्री", "vakri", "retrograde", "backward"]), asta = has(q, ["अस्त", "asta", "combust", "hiding", "hidden"]);
    for (k in GRAHA) if (has(q, GRAHA[k])) {
      if (vakri) { r = pick("vakri." + k, k + " retrograde"); if (r) return r; }
      if (asta) { r = pick("asta." + k, k + " hidden in the Sun"); if (r) return r; }
    }
    if (has(q, ["ग्रहण", "grahan", "eclipse"])) return pick(has(q, ["चंद्र", "chandra", "lunar", "full"]) ? "eclipse.full" : "eclipse.new", "eclipse");
    for (var i = 0; i < 27; i++) {
      if (q.indexOf(norm(NAK_HI[i])) >= 0 || new RegExp("\\b" + NAK_EN[i]).test(q.replace(/\s+/g, "")) || new RegExp("\\b" + NAK_EN[i] + "\\b").test(q))
        return pick("learn.nakshatra." + (i + 1), "nakṣatra " + NAK_EN[i]);
    }
    for (k in NAK_ALT) if (q.indexOf(norm(k)) >= 0) return pick("learn.nakshatra." + NAK_ALT[k], "nakṣatra " + k);
    for (i = 0; i < 12; i++) {
      if (q.indexOf(norm(RASHI_HI[i])) >= 0 || new RegExp("\\b(" + RASHI_EN[i] + "|" + RASHI_WEST[i] + ")\\b").test(q))
        return pick("learn.rashi." + (i + 1), "rāśi " + RASHI_EN[i]);
    }
    var bh = /(?:भाव|bhava|house)\D{0,4}(\d{1,2})|(\d{1,2})\D{0,6}(?:भाव|bhava|house)/i.exec(RA.facts ? RA.facts.devToAscii(text) : text);
    if (bh) { var n = +(bh[1] || bh[2]); if (n >= 1 && n <= 12) return pick("learn.bhava." + n, "bhāva " + n); }
    if (has(q, ["वक्री", "vakri", "retrograde"])) return pick("vakri.mars", "retrograde");
    if (has(q, ["नक्षत्र", "nakshatra"])) return pick("learn.concept.nakshatras", "the nakṣatras") || pick("learn.nakshatra.1", "nakṣatras");
    if (has(q, ["राशि", "rashi", "zodiac", "sign"])) return pick("learn.concept.rashis", "the rāśis");
    if (has(q, ["ग्रह", "graha", "planet"])) return pick("learn.concept.grahas", "the grahas");
    /* last: the layout whose label shares most words with the request */
    var best = null, bs = 0;
    (layouts || []).forEach(function (L) {
      var w = norm(L.label + " " + L.id).split(/[^a-z0-9ऀ-ॿ]+/).filter(function (x) { return x.length > 3; });
      var s = w.filter(function (x) { return q.indexOf(x) >= 0; }).length;
      if (s > bs) { bs = s; best = L; }
    });
    return best ? { layout: best.id, seconds: secs, why: "closest label: " + best.label } : null;
  }

  /* ---- today's ideas, each with a layout -------------------------------- */
  function today(dateStr) {
    var NP = window.NP;
    if (!NP || !NP.dayOfDate) return { error: "the pañcāṅga is not on this page" };
    var d = dateStr ? new Date(dateStr + "T12:00:00Z") : new Date();
    var P = (NP.savedPlace && NP.savedPlace()) || (NP.PLACES && NP.PLACES[0]);
    var D;
    try { D = NP.dayOfDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), P, { month: true }); } catch (e) { D = null; }
    if (!D) return { error: "could not compute today's pañcāṅga" };
    var ideas = [];
    try {
      NP.festivalsOn(D, { minor: false }).forEach(function (f) {
        var k = Object.keys(FEST).filter(function (x) { return (f.key || "").indexOf(x) >= 0 || has(norm(f.name), FEST[x]); })[0];
        if (k) ideas.push({ key: "fest-" + k, layout: "fest.when." + k, reason: f.name + " is today / आज " + f.name, rank: 100 });
      });
    } catch (e) {}
    if (D.sankranti && D.sankranti.sign != null)
      ideas.push({ key: "sank", layout: "learn.rashi." + (D.sankranti.sign + 1), reason: "the Sun enters a new rāśi today / आज संक्रांति", rank: 85 });
    if (D.at && D.at.nak)
      ideas.push({ key: "nak", layout: "learn.nakshatra." + (D.at.nak.i + 1),
                   reason: "today's nakṣatra is " + D.at.nak.name + " / आज का नक्षत्र " + NAK_HI[D.at.nak.i], rank: 40 });
    ideas.sort(function (a, b) { return b.rank - a.rank; });
    return { date: d.toISOString().slice(0, 10), place: P && P.n, ideas: ideas };
  }
  RA.today = today;
  RA.matcher = { match: match, NAK_HI: NAK_HI };

  /* ---- the Studio's idea keys → a Reel Studio layout -------------------- */
  function layoutForIdea(key) {
    key = String(key || "");
    var m;
    if ((m = /^fest-(.+)$/.exec(key))) {
      var k = Object.keys(FEST).filter(function (x) { return m[1].indexOf(x) >= 0; })[0];
      return k ? "fest.when." + k : "fest.when.diwali";
    }
    if ((m = /^nak-(\d+)$/.exec(key))) return "learn.nakshatra." + (+m[1] + 1);
    if ((m = /^sank-(\d+)$/.exec(key))) return "learn.rashi." + (+m[1] + 1);
    if (/^ing-/.test(key)) return "learn.concept.rashis";
    if (/^stat|vakri|retro/.test(key)) return "vakri.mars";
    if (/tithi|upari|panchanga/.test(key)) return "learn.concept.grahas";
    return "learn.concept.grahas";
  }
  RA.layoutForIdea = layoutForIdea;

  /* ---- reel-agent.html -------------------------------------------------- */
  function bootPage() {
    var go = document.getElementById("ra-go");
    if (!go || !window.RA.panel) return;
    var req = document.getElementById("ra-req"), info = document.getElementById("ra-match"),
        modeLine = document.getElementById("ra-modeline");
    var A = RA.adapter.make("reel-studio");
    window.__bridge = window.__bridge || A;
    modeLine.textContent = RA.net.allowed()
      ? "Connected mode is on — the agent will read your request. / Connected mode चालू है — एजेंट आपका अनुरोध पढ़ेगा।"
      : "Offline mode — the request is matched on this device. / ऑफ़लाइन मोड — अनुरोध इसी डिवाइस पर मिलाया जाता है।";
    function openFor(text, layout, auto) {
      var D = A.describe(), m = layout ? { layout: layout, why: "chosen" } : match(text, D.layouts);
      if (!m && !RA.net.allowed()) {
        info.textContent = "No layout matched — try a nakṣatra, rāśi, festival or graha name. / कोई लेआउट नहीं मिला।";
        return;
      }
      if (m) info.textContent = "→ " + m.layout + " (" + m.why + ")";
      var P = RA.panel.open({ adapter: A, layout: m ? m.layout : null });
      if (m && m.seconds) { var s = [30, 45, 60, 90].reduce(function (a, b) { return Math.abs(b - m.seconds) < Math.abs(a - m.seconds) ? b : a; }); P.set("length", String(s)); }
      var br = P.ov.querySelector("textarea"); if (br && text) br.value = text;
      if (auto) P.generate(null);
      return P;
    }
    go.addEventListener("click", function () { openFor(req.value.trim(), null, false); });
    req.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) go.click(); });
    var lib = document.getElementById("ra-lib");
    function refreshLib() { if (lib) RA.library.show(lib, function (rec) {
      var P = openFor("", rec.layout, false); if (P) P.ov.querySelector(".ra-out") && RA.panel.current(); }); }
    refreshLib();
    /* #make=<layout> from the Studio's "Make today's reel"; #daily for the
       desktop app's morning reel (generate, save, report back) */
    var h = location.hash || "", mk = /^#make=([\w.-]+)/.exec(h);
    if (mk) openFor("", mk[1], false);
    if (/^#daily/.test(h)) daily().then(function (r) {
      if (window.parent && window.parent !== window) window.parent.postMessage({ raDaily: r ? "ok" : "none", title: r && r.title }, "*");
      refreshLib();
    }, function (e) {
      if (window.parent && window.parent !== window) window.parent.postMessage({ raDaily: "error", error: e.message }, "*");
    });
  }

  /* the morning reel: today's best idea, offline unless Connected mode is on,
     saved to the library. Nothing is posted. */
  function daily() {
    var T = today();
    if (T.error || !T.ideas.length) return Promise.resolve(null);
    var S = RA.core.settings(), A = RA.adapter.make("reel-studio");
    var provider = RA.voice.P.system.available() ? "system" : "silent";
    return RA.render.run({ adapter: A, layout: T.ideas[0].layout, lang: S.lang || "hi", seconds: S.seconds || 45,
                           voice: { provider: provider, voice: S.voice }, captions: true }, {})
      .then(function (r) { r.mode = "daily"; return RA.library.save(r).then(function () { return r; }); });
  }
  RA.daily = daily;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(bootPage, 150); });
  else setTimeout(bootPage, 150);
})();
;

(function(){var RA=window.RA=window.RA||{};RA.skills={"astro-reel": {"name": "astro-reel", "title": "Engine reel as a short Hindi story / इंजन रील — छोटी हिंदी कथा", "meta": {"name": "astro-reel", "title": "Engine reel as a short Hindi story / इंजन रील — छोटी हिंदी कथा", "tools": "list_layouts, get_facts, write_script, verify_script, finish", "includes": "hindi-voice-style"}, "body": "# Astro reel\n\nTurn one engine layout into a 35–60 second reel narrated as a short Hindi story,\nwhere every number is the engine's.\n\n## Steps\n1. If the request names no layout, call `list_layouts` with a filter drawn from the\n   request (a nakṣatra, a rāśi, a graha, a festival, \"vakri\", \"eclipse\") and choose the\n   single best match. Prefer the \"Learn\" layouts for a teaching request and the\n   festival layouts for a date question.\n2. Call `get_facts` with that layout and the requested length. Read **all** the facts\n   and the engine's own Hindi beats before writing anything.\n3. Write the script with `write_script`: one entry per beat range, covering **every\n   beat exactly once, in order** (`beats: [a, b]`, inclusive). Several short beats may\n   share one line. Each entry has `narration` (Hindi) and `caption` (≤ 4 words).\n4. Call `verify_script`. If it returns violations, fix exactly those lines and call\n   `write_script` and `verify_script` again. Do not call `finish` until it passes.\n5. Call `finish` with a post caption (3–6 short lines: the claim, the method, the\n   check-it-yourself line) and 6–10 hashtags.\n\n## Story, not a list\nOpen with a question or the most surprising true fact; build to the reason; end with\nan invitation to check. One idea per line. Use the engine's beat order — the picture\nshows what the line says.\n\n## Facts\n- Every number, date, degree and name in the narration must be in `get_facts`.\n- The method (ayanāṃśa, ephemeris, rule) may be mentioned only as the facts state it.\n- If the facts mark a rule as contested, say so in one short clause.\n\n## Never\nNo prediction, no remedy, no effect on any person. \"शास्त्रीय अध्ययन का ढाँचा,\nभविष्यवाणी नहीं\" when a chart or an influence is implied."}, "daily-reel": {"name": "daily-reel", "title": "Today's reel / आज की रील", "meta": {"name": "daily-reel", "title": "Today's reel / आज की रील", "tools": "get_today, list_layouts, get_facts, write_script, verify_script, finish", "includes": "hindi-voice-style, astro-reel"}, "body": "# Daily reel\n\nMake one reel for today from the Studio's ideas.\n\n## Steps\n1. Call `get_today` with today's date and the place. It returns the Studio's ideas,\n   each with a suggested layout and a reason.\n2. Choose **one** idea. Prefer, in order: something that happens **today** (an\n   ingress, a station, a tithi that names a festival, an eclipse) → something this\n   week → a teaching layout that matches today's nakṣatra or tithi.\n3. Continue exactly as in **astro-reel** from `get_facts` onwards.\n4. The hook says why today (\"आज चंद्रमा रोहिणी में है —\"), but only if the facts say\n   so; otherwise open with the layout's own question.\n\n## Never\nNothing is posted. The reel is saved on this device for the reader to review."}, "hindi-voice-style": {"name": "hindi-voice-style", "title": "Hindi voice style / हिंदी वाचन शैली", "meta": {"name": "hindi-voice-style", "title": "Hindi voice style / हिंदी वाचन शैली", "applies": "every narration skill"}, "body": "# Hindi voice style\n\nHow every Reel Agent narration sounds. The other skills include this one.\n\n## Language\n- Default language is **pure Hindi in Devanagari** (शुद्ध हिंदी). Use तत्सम words a\n  Jyotiṣa listener expects (नक्षत्र, राशि, ग्रह, अंश, भाव, तिथि), but keep sentences\n  conversational, the way a good teacher speaks — not a textbook.\n- English only for proper names the facts give in English (a star such as Aldebaran,\n  a catalogue such as HYG). Never translate a star's catalogue name.\n- Hinglish, when chosen: Roman script, Hindi grammar, Sanskrit terms in their usual\n  spoken form (nakshatra, rashi, graha).\n\n## Numbers\n- Write numbers in **digits** in the narration (40°, 13°20′, 2026). The voice layer\n  turns them into spoken Hindi; digits are what the fact check reads most reliably.\n- Every number must come from `get_facts`. If a number would help and is not in the\n  facts, leave it out — do not round, estimate or recall one.\n\n## Shape of a reel\n- **5 to 9 lines**, one per beat range, together **35–60 seconds** of speech.\n- Line 1 is the **hook**: a question or a surprising true fact from the facts, in under\n  ten words.\n- The last line is the **call to action**: an invitation to check it or to comment\n  (\"Stellarium में स्वयं जाँच लीजिए।\", \"आपका जन्म नक्षत्र कौन सा है? नीचे लिखिए।\").\n  Never \"follow for predictions\".\n- A line should be speakable in one breath: 8–20 words.\n\n## Captions\n- At most **4 words**, Devanagari, carrying the line's key fact (\"49 तारे\",\n  \"8 नवंबर 2026\", \"40°00′ से 53°20′\").\n\n## Never\n- No predictions about any person, no remedies, no fear. Where the topic touches a\n  chart or a planet's \"effect\", say \"शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं।\"\n- Mythology is **story**, said as story (\"कथा है कि…\"), never as fact.\n- No claims about health, money, marriage, children or death."}, "kahani-reel": {"name": "kahani-reel", "title": "Animated story reel / कहानी रील", "meta": {"name": "kahani-reel", "title": "Animated story reel / कहानी रील", "tools": "get_facts, kahani_scenes, write_script, verify_script, finish", "includes": "hindi-voice-style"}, "body": "# Kahani reel\n\nA short animated cartoon story — a nakṣatra legend, a festival story, a myth about a\ngraha — told in Hindi over simple SVG scenes.\n\n## Steps\n1. If the topic is a Jyotiṣa object (a nakṣatra, rāśi, graha, festival), call\n   `get_facts` **first** with the matching layout, so the story's astronomy — the\n   nakṣatra's degrees, its star, the festival's rule — comes from the engine.\n2. Plan 4–7 scenes. Call `kahani_scenes` with one entry per scene:\n   - `svg`: one SVG **fragment** (no `<svg>` wrapper) drawn in a 1080×1920 space, using\n     only shapes, paths, gradients and text. Bold, flat, warm colours; large shapes.\n     No scripts, no links, no images, no `foreignObject`, no external references.\n   - `props`: any of `moon`, `mountains`, `cloud`, `tree`, `diya`, `stars`.\n   - `motion`: `{ entrance: \"fade\"|\"rise\"|\"zoom\", bob: 0–1, parallax: 0–1, sway: 0–1 }`.\n   - `seconds`: 4–10.\n   - `kicker`: ≤ 3 words for the top band.\n3. `write_script` with one line per scene (`beats: [i, i]`), then `verify_script`, then\n   `finish`.\n\n## Story rules\n- Mythology is **story**: \"कथा है कि…\", \"पुराणों में कहा गया है…\". Never present it as\n  history or as astronomy.\n- When the story touches the sky, the sky part comes from the facts and is said\n  plainly as observation (\"रोहिणी का तारा Aldebaran, 48.90° पर\").\n- Gentle, family-friendly, no fear, no curse, no prediction."}};RA.lexicon={"_about": "Applied to the text sent to a speech synthesiser only, never to what is shown on screen. Keys are written forms; values are how a Hindi voice should be asked to say them. Longest keys are applied first.", "Aldebaran": "ऐल्डेबरन", "Stellarium": "स्टेलेरियम", "Spica": "स्पाइका", "Regulus": "रेगुलस", "Antares": "ऐंटारीज़", "Pollux": "पोलक्स", "Castor": "कैस्टर", "HYG": "एच वाई जी", "BPHS": "बी पी एच एस", "Nirayana": "निरयण", "α Tau": "अल्फ़ा टॉरी", "α Vir": "अल्फ़ा वर्जिनिस", "°": " अंश ", "′": " कला ", "Lahiri": "लाहिड़ी", "Samanvaya": "समन्वय"};if(RA.voice&&RA.voice.setLexicon)RA.voice.setLexicon(RA.lexicon);})();
