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
