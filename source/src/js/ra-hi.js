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

  RA.hi = { MON: MON, FEST: FEST, dateHi: dateHi, festLines: festLines, title: title,
            devanagariShare: devanagariShare };
})();
