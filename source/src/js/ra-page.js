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
