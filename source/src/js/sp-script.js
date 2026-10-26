/* ===== The script and caption generator ==================================

   A reel is only half of a post. The other half is what gets said over it
   and what gets pasted under it, and writing those by hand for a hundred
   and twenty-six reels is how a series dies after four episodes.

   So this generates both, in three languages, from the numbers the reel
   actually computed.

   THE RULE THAT KEEPS IT HONEST: the script renders the reel's own FACTS,
   not a second set of sentences about the same subject. A reel publishes a
   small bag of what it measured — the boundary degrees, the star and its
   longitude, how many fell inside, the pāda signs, the daśā lord — and each
   language is a template over that bag. There is no copy of the numbers
   anywhere in here, so a script cannot drift from the picture it is read
   over. English goes further and uses the reel's own beat sentences
   verbatim, because those are already written and already checked.

   WHY THE TIMINGS ARE MEASURED. A script that says "read this in four
   seconds" is useless if the beat lasts two. Each beat's duration is taken
   from the timeline by bisection — the playhead window over which that beat
   is the current one — so the teleprompter is timed to the reel as built,
   including the deceleration into holds. A line too long for its beat is
   flagged rather than quietly left for the recording to expose.

   ON THE THIRTY-SIX POINTS. Yoni, gaṇa and nāḍī are later tradition, not
   BPHS, and the caption says so. What is claimed is arithmetic and nothing
   else: of the thirty-six, twenty-one are fixed by the birth star alone.
   No compatibility verdict about any person is produced here. */

(function () {
  "use strict";

  var LANGS = [
    { key: "hinglish", label: "Hinglish", rtl: false },
    { key: "hi", label: "हिंदी", rtl: false },
    { key: "en", label: "English", rtl: false }
  ];

  /* ---- how long each beat is actually on screen --------------------------
     Bisection against the timeline rather than seconds ÷ beats: holds cost
     time, the lead and tail cost time, and a warped clock spends them
     unevenly on purpose. */
  function beatTimes(reel) {
    var R = window.SPReel, tl = reel && reel.tl;
    if (!R || !tl || !reel.events || !reel.events.length) return [];
    var n = reel.events.length, S = tl.seconds;
    function idxAt(p) {
      var t = R.clockAt(tl, p).t, k = -1;
      for (var i = 0; i < n; i++) if (reel.events[i].t <= t) k = i; else break;
      return k;
    }
    /* the first playhead at which each beat is current */
    var starts = new Array(n), i;
    for (i = 0; i < n; i++) {
      var lo = 0, hi = 1;
      if (idxAt(1) < i) { starts[i] = null; continue; }
      for (var b = 0; b < 42; b++) {
        var m = (lo + hi) / 2;
        if (idxAt(m) < i) lo = m; else hi = m;
      }
      starts[i] = hi;
    }
    /* WHICH BEATS A NARRATOR ACTUALLY READS.

       An explainer has seven events and all seven are beats. An eclipse
       reel has two hundred and forty-seven, one per syzygy, and asking for
       a line over each of them produced a fifteen-minute script for a
       thirty-four-second reel. Nobody narrates a reel that way: they read
       the moments it stops at and the two cards at either end, and let the
       rest run under them.

       So a reel with more events than a viewer could register is narrated
       on its HELD events — the ones the clock already decelerates into —
       plus the first and the last. A short reel is narrated on all of
       them, which is what it always was. */
    var keep = [];
    if (n <= 12) {
      for (i = 0; i < n; i++) keep.push(i);
    } else {
      keep.push(0);
      for (i = 0; i < n; i++)
        if (reel.events[i].hold && keep.indexOf(i) < 0) keep.push(i);
      if (keep.indexOf(n - 1) < 0) keep.push(n - 1);
      keep.sort(function (a, b) { return a - b; });
    }
    /* THE FIRST LINE STARTS AT ZERO. The clock has not begun during the
       lead — the title card is up and no event is current yet — but the
       narrator has: that is exactly when the first sentence is spoken. So
       the first window runs from the top of the reel rather than from the
       moment the first event arrives, which is also what makes the windows
       tile the whole length instead of leaving the lead unaccounted. */
    var out = [], first = true;
    for (var q = 0; q < keep.length; q++) {
      i = keep[q];
      if (starts[i] == null) continue;
      if (first) { starts[i] = 0; first = false; }
      var nextI = null;
      for (var j = q + 1; j < keep.length; j++)
        if (starts[keep[j]] != null) { nextI = keep[j]; break; }
      var end = nextI == null ? 1 : starts[nextI];
      out.push({ i: i, from: starts[i] * S, to: end * S,
                 secs: Math.max(0, (end - starts[i]) * S) });
    }
    return out;
  }

  /* ---- the same names in Devanāgarī --------------------------------------

     A Hindi script with "Meṣa" and "Mūla" in Latin letters in the middle of
     it defeats the one reason to narrate from Devanāgarī at all: a Hindi
     voice reading Devanāgarī gets every Sanskrit term right by
     construction, and the same voice reading IAST mangles all of them.

     COPIED FROM 49-motion-lang.js rather than retyped, so the reels, the
     animations and the pages cannot drift from one another. */
  var DEV = {
    rasi: ["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"],
    nak: ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्व भाद्रपद","उत्तर भाद्रपद","रेवती"],
    graha: {Sun:"सूर्य",Moon:"चन्द्र",Mars:"मंगल",Mercury:"बुध",Jupiter:"गुरु",Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"}
  };
  /* IAST to Devanāgarī for the handful of names the templates substitute */
  var DEV_OF = {};
  (function () {
    var EN_RASI = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā",
                   "Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
    var EN_GRAHA = {"Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars",
                    "Budha":"Mercury","Guru":"Jupiter","Śukra":"Venus",
                    "Śani":"Saturn","Rāhu":"Rahu","Ketu":"Ketu"};
    EN_RASI.forEach(function (n, i) { DEV_OF[n] = DEV.rasi[i]; });
    Object.keys(EN_GRAHA).forEach(function (n) {
      DEV_OF[n] = DEV.graha[EN_GRAHA[n]];
    });
  })();
  /* the bhāva names themselves: Sanskrit either way, so this is spelling
     rather than translation, and a Hindi voice needs the Devanāgarī to say
     "Āyus" and "Kalatra" as Sanskrit rather than as English */
  ["Tanu","Dhana","Sahaja","Sukha","Putra","Ripu","Kalatra","Āyus",
   "Bhāgya","Karma","Lābha","Vyaya"].forEach(function (n, i) {
    DEV_OF[n] = ["तनु","धन","सहज","सुख","पुत्र","रिपु","कलत्र","आयु",
                 "भाग्य","कर्म","लाभ","व्यय"][i];
  });

  function dev(name) { return DEV_OF[name] || name; }
  /* elements, modalities and spans in Hindi. The reel's own figures are
     English strings built for the caption band; a Hindi line carrying
     "fire, dual" and "20.2 months" is half-translated, which reads worse
     than either language on its own. These render from the numbers in the
     facts rather than from those strings. */
  /* The twelve bhāvas in Hindi. The significations are the same ones the
     English template carries, translated — not a different reading of the
     houses. A Hindi line that says "Karma — action. Ye sambhalta hai:
     profession, status, authority" is not a Hindi line, and the whole point
     of narrating from this tab is that a Hindi voice says the Sanskrit
     correctly. */
  var HI_CLASS = {
    "Kendra": "केन्द्र", "Trikoṇa": "त्रिकोण", "Panaphara": "पणफर",
    "Āpoklima": "आपोक्लिम", "Upacaya": "उपचय", "Dusthāna": "दुःस्थान",
    "Māraka": "मारक"
  };
  var HI_BHAVA = {
    1:  { lit: "शरीर", kw: "शरीर, रूप, ओज, स्वभाव, बुद्धि, यश — सम्पूर्ण जीवन",
          ka: "लग्नेश, तथा सूर्य" },
    2:  { lit: "धन", kw: "संचित धन, कुटुम्ब, भोजन, वाणी, मुख — और एक मारक भाव",
          ka: "गुरु" },
    3:  { lit: "साथ जन्मा", kw: "पराक्रम, छोटे भाई-बहन, हाथ, संवाद, लघु यात्रा, प्रयास",
          ka: "मंगल" },
    4:  { lit: "सुख", kw: "माता, गृह, भूमि, वाहन, शिक्षा, आंतरिक शान्ति, विषयों का अन्त",
          ka: "चन्द्र, तथा शिक्षा के लिए बुध" },
    5:  { lit: "संतान", kw: "संतान, बुद्धि, मन्त्र और मनोबल, प्रेम, सट्टा, पूर्व पुण्य",
          ka: "गुरु" },
    6:  { lit: "शत्रु", kw: "शत्रु, रोग, ऋण, वाद-विवाद, सेवा, प्रतिस्पर्धा",
          ka: "मंगल और शनि" },
    7:  { lit: "जीवनसाथी", kw: "जीवनसाथी, विवाह, साझेदारी, व्यापार, विदेश-निवास",
          ka: "शुक्र" },
    8:  { lit: "आयु", kw: "आयु, उलट-फेर, जीर्ण रोग, उत्तराधिकार और दूसरों का धन, गुप्त विषय",
          ka: "शनि" },
    9:  { lit: "भाग्य", kw: "भाग्य, धर्म, पिता, गुरु, उच्च विद्या, तीर्थ, दीर्घ यात्रा",
          ka: "गुरु, तथा पिता के लिए सूर्य" },
    10: { lit: "कार्य", kw: "आजीविका, प्रतिष्ठा, अधिकार, कर्म, कीर्ति, शासन",
          ka: "सूर्य, बुध, गुरु और शनि — चारों मिलकर" },
    11: { lit: "लाभ", kw: "लाभ, आय, बड़े भाई-बहन, सम्पर्क, पूर्ण हुई आशाएँ",
          ka: "गुरु" },
    12: { lit: "व्यय", kw: "व्यय, हानि, विदेश, एकान्त, चरण, मोक्ष",
          ka: "शनि, तथा शयन-सुख के लिए शुक्र" }
  };

  var HI_ELEM = { fire: "अग्नि", earth: "पृथ्वी", air: "वायु", water: "जल" };
  var HI_MODE = { movable: "चर", fixed: "स्थिर", dual: "द्विस्वभाव" };
  function hiB(F, k) {
    var r = HI_BHAVA[F.num];
    if (r && r[k]) return r[k];
    return k === "lit" ? F.lit : (k === "kw" ? F.keywords : F.karaka);
  }

  function hiSpan(d) {
    if (d == null) return "—";
    if (d < 3) {
      var h = Math.round(d * 24), dd = Math.floor(h / 24);
      return dd ? dd + " दिन " + (h % 24) + " घंटे" : h + " घंटे";
    }
    if (d < 70) return Math.round(d) + " दिन";
    var mo = d / 30.44;
    if (mo < 22) return mo.toFixed(1) + " माह";
    return (d / 365.2564).toFixed(1) + " वर्ष";
  }
  function hiMins(m) {
    if (m == null) return "—";
    var h = Math.floor(m / 60), r = Math.round(m % 60);
    return h ? h + " घंटे " + r + " मिनट" : r + " मिनट";
  }

  /* the nakṣatra names are published for the story builders, which know the
     index but not this table */
  try { window.MO_DEV_NAK = DEV.nak; } catch (e) {}
  function devList(a) { return a.map(dev); }

  /* ---- the words ---------------------------------------------------------
     One function per language per subject, each a template over the facts.
     A missing template falls through to the generic frame rather than to an
     empty string, so every reel in the Studio produces something readable. */

  function padaList(F, sep) {
    return F.padas.join(sep || " · ");
  }

  var T = {
    nakshatra: {
      hinglish: function (F) {
        return [
          F.num + ". " + F.name + " — seema " + F.loTxt + " se " + F.hiTxt +
            ", nirayan bhog. Ye rahi woh patti aasman ki, seedhi kholkar.",
          "Do sunehri lakeeron ke beech poora 13°20' ka khaana — pehle " +
            F.prev + ", baad me " + F.next + ".",
          "Ab asli taare. Is patti mein " + F.inWin + " taare hain, magnitude " +
            "5.4 tak, kranti-vritt se " + F.latLim.toFixed(0) + "° ke andar.",
          F.inside
            ? "Jis taare ke naam par ye khaana hai — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — wo apne hi khaane " +
              "ke andar hai. " + F.inArc + " taare " + F.inWin + " me se andar."
            : "Lekin jis taare ke naam par ye khaana hai — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — wo apne khaane se " +
              F.offTxt + " bahar hai. 27 me se 7 ke saath yehi hota hai.",
          "Chaar pada, har ek 3°20' — jo bilkul ek navamsha hai. Inke " +
            "navamsha: " + padaList(F) + ".",
          "Rashi se ye " + F.rashi + " me baithta hai" +
            (F.rashi2 ? " aur " + F.rashi2 + " tak jaata hai." : "."),
          "Dasha ka swami " + F.lord + " — " + F.lordYears + " saal ki " +
            "mahadasha, jitni bachi ho utni. Stellarium kholkar khud jaanch " +
            "lijiye."
        ];
      },
      hi: function (F) {
        return [
          F.num + ". " + (F.nakDev || F.name) + " — सीमा " + F.loTxt + " से " + F.hiTxt +
            ", निरयण भोग। यह रही आकाश की वह पट्टी, सीधी खोलकर।",
          "दो सुनहरी रेखाओं के बीच पूरा 13°20' का खाना — पहले " +
            (F.prevDev || F.prev) + ", बाद में " + (F.nextDev || F.next) + "।",
          "अब असली तारे। इस पट्टी में " + F.inWin + " तारे हैं, कांति " +
            "5.4 तक, क्रांतिवृत्त से " + F.latLim.toFixed(0) + "° के भीतर।",
          F.inside
            ? "जिस तारे के नाम पर यह खाना है — " + F.star + ", " + F.bayer +
              ", " + F.starLon.toFixed(2) + "° — वह अपने ही खाने के भीतर है। " +
              F.inWin + " में से " + F.inArc + " भीतर।"
            : "परन्तु जिस तारे के नाम पर यह खाना है — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — वह अपने खाने से " +
              F.offTxt + " बाहर है। सत्ताईस में से सात के साथ यही है।",
          "चार पाद, प्रत्येक 3°20' — जो ठीक एक नवांश है। इनके नवांश: " +
            devList(F.padas).join(" · ") + "।",
          "राशि से यह " + dev(F.rashi) + " में पड़ता है" +
            (F.rashi2 ? " और " + dev(F.rashi2) + " तक जाता है।" : "।"),
          "दशा का स्वामी " + dev(F.lord) + " — " + F.lordYears + " वर्ष की महादशा, " +
            "जितनी शेष हो उतनी। Stellarium में स्वयं जाँच लीजिए।"
        ];
      }
    },

    rashi: {
      hinglish: function (F) {
        var c = F.cross;
        return [
          F.num + ". " + F.name + " — " + F.lo + "° se " + F.hi +
            "°, tees degree. Yahi patti hai, seedhi kholkar.",
          "Is window me " + F.inWin + " taare hain; " + F.inArc + " " +
            F.name + " ke andar.",
          "Tees degree matlab sawa do nakshatra — isliye dono system kabhi " +
            "nahi milte. " + F.naksWhole + " poore andar, " + F.naksCut +
            " kinaare se kate hue.",
          F.name + " ka swami " + F.lord + ", tatva " + F.elem + ", " +
            F.mode + " rashi.",
          "Har graha ise paar karne me kitna leta hai — naapa hua, pehle " +
            "pravesh se aakhri nikas tak: " +
            c.map(function (q) { return q.name + " " + q.txt; }).join(", ") + ".",
          F.riseTxt
            ? F.name + " ko udit hone me " + F.riseTxt + " lagte hain " +
              (F.place ? F.place + " par" : "") + " — do ghante nahi. " +
              "Akshansh badalte hi ye badal jaata hai."
            : "Udit hone ka samay jagah par nirbhar karta hai."
        ];
      },
      hi: function (F) {
        var c = F.cross;
        return [
          F.num + ". " + dev(F.name) + " — " + F.lo + "° से " + F.hi +
            "°, तीस अंश। यही पट्टी है, सीधी खोलकर।",
          "इस खिड़की में " + F.inWin + " तारे हैं; " + F.inArc + " " +
            dev(F.name) + " के भीतर।",
          "तीस अंश अर्थात् सवा दो नक्षत्र — इसीलिए दोनों व्यवस्थाएँ कभी नहीं मिलतीं। " +
            F.naksWhole + " पूरे भीतर, " + F.naksCut + " किनारों से कटे।",
          dev(F.name) + " का स्वामी " + dev(F.lord) + ", तत्व " +
            (HI_ELEM[F.elem] || F.elem) + ", " +
            (HI_MODE[F.mode] || F.mode) + " राशि।",
          "प्रत्येक ग्रह इसे पार करने में कितना लेता है — मापा हुआ, प्रथम प्रवेश से " +
            "अंतिम निकास तक: " +
            c.map(function (q) { return dev(q.name) + " " + hiSpan(q.days); })
             .join(", ") + "।",
          F.riseTxt
            ? dev(F.name) + " को उदित होने में " + hiMins(F.riseMin) + " लगते हैं" +
              (F.place ? " (" + F.place + ")" : "") + " — दो घंटे नहीं।"
            : "उदय काल स्थान पर निर्भर है।"
        ];
      }
    },

    bhava: {
      hinglish: function (F) {
        return [
          "Bhava matlab zindagi ka ek maidan, Lagna se gina hua. Baarah " +
            "bhava poora anubhav dhak lete hain.",
          F.num + ". " + F.name + " — " + F.lit + ". Lagna se " + F.from +
            "° par shuru, " + F.to + "° tak.",
          "Ye sambhalta hai: " + F.keywords + ".",
          "Varg se ye " + F.classes.join(" aur ") + " hai.",
          "Iska karaka — swabhavik suchak — " + F.karaka + ".",
          "Iska swami jahan bhi jaaye, ye maamle saath le jaata hai.",
          "Koi bhava akela nahi padha jaata. Swami ki haalat, baithe hue " +
            "grah, drishti aur dasha — sab milkar tay karte hain."
        ];
      },
      hi: function (F) {
        return [
          "भाव अर्थात् जीवन का एक क्षेत्र, लग्न से गिना हुआ। बारह भाव सम्पूर्ण अनुभव को ढक लेते हैं।",
          F.num + ". " + dev(F.name) + " — " + hiB(F, "lit") + "। लग्न से " +
            F.from + "° पर आरम्भ, " + F.to + "° तक।",
          "यह सँभालता है: " + hiB(F, "kw") + "।",
          "वर्ग से यह " +
            F.classes.map(function (c) { return HI_CLASS[c] || c; })
             .join(" और ") + " है।",
          "इसका कारक — स्वाभाविक सूचक — " + hiB(F, "ka") + "।",
          "इसका स्वामी जहाँ भी जाए, ये विषय साथ ले जाता है।",
          "कोई भाव अकेले नहीं पढ़ा जाता। स्वामी की स्थिति, बैठे ग्रह, दृष्टि और दशा — " +
            "सब मिलकर तय करते हैं।"
        ];
      }
    }
  };

  /* the generic frame: used for every reel that has no bespoke template,
     which is most of them. It says what the reel is and what the beat is
     about, in the right register, rather than nothing. */
  function generic(reel, lang) {
    return reel.events.map(function (e, i) {
      var lab = String(e.big || "").toLowerCase();
      if (lang === "hi")
        return (i === 0 ? reel.title + " — " + reel.subtitle + " " : "") +
               (e.small || lab);
      if (lang === "hinglish")
        return (i === 0 ? reel.title + " — dekhiye. " : "") + (e.small || lab);
      return e.small || lab;
    });
  }

  function lines(reel, lang) {
    if (lang === "en")
      return reel.events.map(function (e) { return e.small || e.big || ""; });
    var F = reel.facts;
    var fam = F && T[F.kind] && T[F.kind][lang];
    if (!fam) return generic(reel, lang);
    var out;
    try { out = fam(F); } catch (e2) { out = null; }
    if (!out || !out.length) return generic(reel, lang);
    /* a template may be written for more or fewer beats than the reel has;
       the reel is the authority on how many there are */
    var n = reel.events.length, res = [];
    for (var i = 0; i < n; i++) res.push(out[i] != null ? out[i] : out[out.length - 1]);
    return res;
  }

  /* ---- how fast a line can be read --------------------------------------
     Measured in syllables rather than characters, because Devanāgarī sets
     far fewer characters for the same utterance and a character count would
     call every Hindi line short. A comfortable read-aloud pace is about
     four syllables a second; the vowel count is a decent proxy. */
  function syllables(s, lang) {
    if (lang === "hi") {
      /* A Devanāgarī syllable is a consonant with its vowel: a bare
         consonant carries the inherent 'a' and counts, one followed by a
         virāma is half of a conjunct and does not, and an independent vowel
         counts on its own. A mātrā rides on a consonant that has already
         been counted, so counting those as well doubles every syllable that
         has one — which is what made the Hindi lines read half again as
         long as they are. A Hindi script also carries Latin fragments: star
         names, Bayer letters, Stellarium. Those are counted the Latin way
         in the same pass, because they are spoken too. */
      var cons = (s.match(/[क-हक़-य़](?![्])/g) || []).length;
      var ind = (s.match(/[अ-औ]/g) || []).length;
      var lat = (s.match(/[aeiouāīūṛēō]+/gi) || []).length;
      return cons + ind + lat;
    }
    return (s.match(/[aeiouāīūṛēō]+/gi) || []).length;
  }
  function readSecs(s, lang) { return syllables(s, lang) / 4.0; }

  /* ---- text a speech engine can actually read ---------------------------

     The teleprompter is for a human eye: it carries the beat number and the
     seconds that beat is on screen, because that is what tells you how fast
     to read. Paste that into a text-to-speech engine and it dutifully says
     "one, four point seven seconds" before every line.

     It is not only the timings. A reel's own notation is written for a
     reader and is hostile to a voice:

       13°20′      read as "thirteen twenty", or silently dropped
       λ Sco       the Greek letter skipped entirely
       Jyeṣṭhā     the diacritics mangled or spelt out
       —  ·        no pause where the sentence wants one

     So this is a second rendering of the same lines with nothing in it that
     is not meant to be said. The degrees are spoken, the Greek letters are
     named, and the Sanskrit is respelt phonetically — for the Latin scripts
     only. The Devanāgarī one is left alone, because a Hindi voice reading
     Devanāgarī gets every one of those terms right by construction, which
     is the whole reason that script is the one to narrate from. */

  var GREEK_SAY = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
    "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa",
    "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "ο": "omicron",
    "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "υ": "upsilon",
    "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "omega",
    "¹": " one", "²": " two", "³": " three", "⁴": " four", "⁵": " five"
  };

  /* IAST to something an Indian-English voice says correctly. The rules are
     character-level and safe, because every one of these characters is
     non-ASCII and so appears only in a Sanskrit term — "catalogue" cannot
     be caught by them. The one rule that is NOT safe is c → ch, which is
     right for Sanskrit (Candra is "Chandra") and wrong for English, so it
     is applied only to words that carry a diacritic, plus a short list of
     Sanskrit words that happen not to. */
  var IAST_SAY = [
    [/ṝ/g, "ree"], [/ṛ/g, "ri"], [/ḹ/g, "lree"], [/ḷ/g, "lri"],
    [/ā/g, "aa"], [/ī/g, "ee"], [/ū/g, "oo"], [/ē/g, "e"], [/ō/g, "o"],
    [/ṅ/g, "ng"], [/ñ/g, "ny"], [/ṇ/g, "n"], [/ṃ/g, "n"], [/ṁ/g, "n"],
    [/ś/g, "sh"], [/ṣ/g, "sh"], [/ṭ/g, "t"], [/ḍ/g, "d"], [/ḥ/g, "h"],
    [/Ṝ/g, "Ree"], [/Ṛ/g, "Ri"], [/Ā/g, "Aa"], [/Ī/g, "Ee"], [/Ū/g, "Oo"],
    [/Ṅ/g, "Ng"], [/Ñ/g, "Ny"], [/Ṇ/g, "N"], [/Ṃ/g, "N"],
    [/Ś/g, "Sh"], [/Ṣ/g, "Sh"], [/Ṭ/g, "T"], [/Ḍ/g, "D"]
  ];
  var DIACRITIC = /[āīūṛṝḷḹṅñṇṃṁśṣṭḍḥĀĪŪṚṜṄÑṆṂŚṢṬḌ]/;
  /* Sanskrit words with no diacritic to mark them, where c is still "ch" */
  var SAY_C = /^(Candra|Caitra|Caturtha|Citra|Cara)/;

  function sayWord(w) {
    var had = DIACRITIC.test(w) || SAY_C.test(w);
    var out = w;
    IAST_SAY.forEach(function (r) { out = out.replace(r[0], r[1]); });
    if (had) {
      out = out.replace(/jñ/g, "gy").replace(/Jñ/g, "Gy");
      out = out.replace(/c/g, "ch").replace(/C/g, "Ch");
      out = out.replace(/chh/g, "ch").replace(/Chh/g, "Ch");
    }
    /* "Jyeshthaa" and "mahaadashaa" are right but clumsy; a word-final
       double a is the one place the doubling buys nothing, because a voice
       lengthens a final a anyway */
    out = out.replace(/aa\b/g, "a");
    return out;
  }

  function sayDegrees(t, lang) {
    var deg = lang === "hi" ? " अंश" : " degrees";
    var min = lang === "hi" ? " कला" : " minutes";
    /* 253°20′ → 253 degrees 20 minutes; 240°00′ → 240 degrees, because
       "zero minutes" is noise nobody says out loud */
    t = t.replace(/(\d+)°\s*0{1,2}['′]/g, "$1" + deg);
    t = t.replace(/(\d+)°\s*(\d+)['′]/g, "$1" + deg + " $2" + min);
    t = t.replace(/(\d+(?:\.\d+)?)°/g, "$1" + deg);
    return t;
  }

  /* "2 d 11 h" is a caption band's abbreviation: it fits where "2 days 11
     hours" would not, and a voice reads it out as the letters dee and aitch.
     The number before each one decides the plural, and a unit that is
     already a word is left alone. */
  /* A Bayer designation is written "β Ari" and read "beta Arietis": the
     letter belongs to the constellation, so the constellation is spoken in
     the genitive. Left as the three-letter abbreviation a voice says "airy"
     for Ari and "sko" for Sco, which is not a star name in any language.
     Only the constellations the star list actually reaches are here; an
     abbreviation this table does not know is left alone rather than
     guessed at. */
  var CONSTEL_SAY = {
    Ari: "Arietis", Tau: "Tauri", Ori: "Orionis", Gem: "Geminorum",
    Hya: "Hydrae", Leo: "Leonis", Crv: "Corvi", Vir: "Virginis",
    Boo: "Bo\u00f6tis", Lib: "Librae", Sco: "Scorpii", Sgr: "Sagittarii",
    Aql: "Aquilae", Del: "Delphini", Aqr: "Aquarii", Peg: "Pegasi",
    Psc: "Piscium", Cnc: "Cancri", Cap: "Capricorni", Oph: "Ophiuchi",
    Sct: "Scuti", Cet: "Ceti", Eri: "Eridani", CMa: "Canis Majoris",
    CMi: "Canis Minoris", Lup: "Lupi", Crt: "Crateris", Sex: "Sextantis"
  };
  function sayStars(t) {
    return t.replace(/\b([A-Z][A-Za-z]{2})\b/g, function (all, a) {
      return CONSTEL_SAY[a] || all;
    });
  }

  var UNIT_SAY = {
    en: { d: ["day", "days"], h: ["hour", "hours"], m: ["minute", "minutes"],
          s: ["second", "seconds"], y: ["year", "years"] },
    hi: { d: ["दिन", "दिन"], h: ["घंटा", "घंटे"], m: ["मिनट", "मिनट"],
          s: ["सेकंड", "सेकंड"], y: ["वर्ष", "वर्ष"] }
  };
  function sayUnits(t, lang) {
    var tab = UNIT_SAY[lang === "hi" ? "hi" : "en"];
    return t.replace(/(\d+(?:\.\d+)?)\s*([dhmsy])\b(?!['’])/g,
      function (all, n, u) {
        var w = tab[u];
        if (!w) return all;
        return n + " " + (parseFloat(n) === 1 ? w[0] : w[1]);
      });
  }

  function speakable(line, lang) {
    var t = line;
    t = sayDegrees(t, lang);
    t = sayUnits(t, lang);
    t = sayStars(t);
    Object.keys(GREEK_SAY).forEach(function (g) {
      t = t.split(g).join(GREEK_SAY[g]);
    });
    if (lang !== "hi")
      t = t.replace(/[^\s,.;:!?()"'—·]+/g, sayWord);
    /* punctuation that is a pause when read and a mark when seen */
    /* a minus sign is a word when spoken; the hyphen that joins two words
       is not, so only one in front of a number is touched */
    t = t.replace(/[\u2212-]\s*(?=\d)/g, lang === "hi" ? "\u090b\u0923 " : "minus ");
    t = t.replace(/\s*[—–]\s*/g, ", ");
    t = t.replace(/\s*·\s*/g, ", ");
    t = t.replace(/\s*:\s*/g, ": ");
    t = t.replace(/\s{2,}/g, " ").trim();
    /* a line always ends in something that makes the voice stop */
    if (!/[.!?।]$/.test(t)) t += ".";
    return t;
  }

  /* the whole reel as one block of speech: one paragraph per beat, nothing
     else, ready to paste into a phone's dictation shortcut */
  function speech(reel, lang) {
    var r = render(reel, lang);
    if (!r) return "";
    return r.beats.map(function (b) { return speakable(b.say, lang); })
            .join("\n\n");
  }

  /* ---- the caption -------------------------------------------------------
     Everything a viewer would need to check the claim, and the question
     that gets a comment. */
  function caption(reel, lang) {
    var F = reel.facts, L = [];
    var hing = lang === "hinglish", hi = lang === "hi";
    if (F && F.kind === "nakshatra") {
      L.push(F.num + ". " + F.name + " — " + F.loTxt + " to " + F.hiTxt +
             " sidereal, in " + F.rashi + ".");
      L.push("");
      L.push((hi ? "योगतारा: " : hing ? "Yogataara: " : "Junction star: ") +
             F.star + " (" + F.bayer + ") at " + F.starLon.toFixed(2) +
             "°, ecliptic latitude " + F.starLat.toFixed(1) + "° — " +
             (F.inside
               ? (hi ? "अपने ही खाने के भीतर।" : hing ? "apne hi khaane ke andar." : "inside its own division.")
               : (hi ? "अपने खाने से " + F.offTxt + " बाहर।"
                     : hing ? "apne khaane se " + F.offTxt + " bahar."
                            : "outside its own division by " + F.offTxt + ".")));
      L.push((hi ? "इस पट्टी के " : hing ? "Is patti ke " : "Of the ") +
             F.inWin + (hi ? " तारों में से " : hing ? " taaron me se " : " catalogued stars in this stretch, ") +
             F.inArc + (hi ? " भीतर।" : hing ? " andar." : " fall inside."));
      L.push("");
      L.push((hi ? "पाद → नवांश: " : hing ? "Pada → navamsha: " : "Pāda → navāṃśa: ") +
             padaList(F, " · "));
      L.push((hi ? "दशा स्वामी: " : hing ? "Dasha swami: " : "Daśā lord: ") +
             F.lord + " (" + F.lordYears + (hi ? " वर्ष)" : hing ? " saal)" : " years)"));
      L.push((hi ? "योनि: " : "Yoni: ") + F.yoni + " · " +
             (hi ? "गण: " : "Gaṇa: ") + F.gana + " · " +
             (hi ? "नाड़ी: " : "Nāḍī: ") + F.nadi);
      L.push("");
      L.push((hi ? "छत्तीस गुणों में से इक्कीस केवल जन्म नक्षत्र से तय होते हैं — "
                 : hing ? "36 gunon me se 21 sirf janma nakshatra se tay hote hain — "
                        : "Twenty-one of the thirty-six guṇas are fixed by the birth star alone — ") +
             "tārā 3 + yoni 4 + gaṇa 6 + nāḍī 8 = 21/36. " +
             (hi ? "(परवर्ती परम्परा, BPHS नहीं।)"
                 : hing ? "(Baad ki parampara, BPHS nahi.)"
                        : "(Later tradition, not BPHS.)"));
      L.push("");
      L.push((hi ? "तारों की स्थिति HYG सूची से (Hipparcos/Yale/Gliese), J2000, लाहिड़ी अयनांश। "
                 : hing ? "Taaron ki position HYG catalogue se (Hipparcos/Yale/Gliese), J2000, Lahiri ayanamsa. "
                        : "Star positions from the HYG catalogue (Hipparcos/Yale/Gliese), J2000, Lahiri ayanāṃśa. ") +
             (hi ? "Stellarium में स्वयं जाँच लीजिए।"
                 : hing ? "Stellarium kholkar khud jaanch lijiye."
                        : "Check it yourself in Stellarium."));
      L.push("");
      L.push(hi ? "क्या यह आपका जन्म नक्षत्र है? नीचे लिखिए।"
                : hing ? "Kya ye aapka janma nakshatra hai? Neeche likhiye."
                       : "Is this your birth star? Say so below.");
    } else if (F && F.kind === "rashi") {
      L.push(F.num + ". " + F.name + " — " + F.lo + "° to " + F.hi +
             "° sidereal. " + F.elem + ", " + F.mode + ", " +
             (hi ? "स्वामी " : hing ? "swami " : "owned by ") + F.lord + ".");
      L.push("");
      L.push(F.naksWhole + (hi ? " नक्षत्र पूरे भीतर, " : hing ? " nakshatra poore andar, " : " nakṣatras sit whole inside it, ") +
             F.naksCut + (hi ? " किनारों से कटे — तीस अंश सवा दो नक्षत्र हैं।"
                             : hing ? " kinaare se kate — tees degree sawa do nakshatra hain."
                                    : " are cut by its edges — thirty degrees is two and a quarter nakṣatras."));
      L.push("");
      L.push((hi ? "पार करने का समय (मापा हुआ): " : hing ? "Paar karne ka samay (naapa hua): " : "Measured crossings: ") +
             F.cross.map(function (q) { return q.name + " " + q.txt; }).join(", ") + ".");
      if (F.riseTxt)
        L.push((hi ? "उदय काल: " : hing ? "Udit hone ka samay: " : "Rises in ") +
               F.riseTxt + (F.place ? " (" + F.place + ")" : "") + ".");
      L.push("");
      L.push((hi ? "सब कुछ ब्राउज़र में गणना — आधुनिक एफ़ेमेरिस, लाहिड़ी अयनांश।"
                 : hing ? "Sab kuch browser me compute hua — modern ephemeris, Lahiri ayanamsa."
                        : "All computed against a modern ephemeris under Lahiri ayanāṃśa."));
      L.push(hi ? "आपकी चंद्र राशि कौन सी है?" : hing ? "Aapki chandra rashi kaunsi hai?"
                                                  : "Which is your Moon sign?");
    } else {
      L.push(reel.title + (reel.subtitle ? " — " + reel.subtitle : ""));
      L.push("");
      if (reel.closing && reel.closing.lines)
        reel.closing.lines.forEach(function (x) { if (x) L.push(x); });
    }
    L.push("");
    L.push("@Nirayana.Soft");
    return L.join("\n");
  }

  var TAGS = {
    nakshatra: ["#nakshatra", "#vedicastrology", "#jyotish", "#sidereal",
                "#astronomy", "#stellarium", "#ज्योतिष", "#नक्षत्र"],
    rashi: ["#rashi", "#vedicastrology", "#jyotish", "#sidereal", "#zodiac",
            "#astronomy", "#ज्योतिष", "#राशि"],
    bhava: ["#bhava", "#vedicastrology", "#jyotish", "#bphs", "#kundli",
            "#ज्योतिष"],
    "": ["#vedicastrology", "#jyotish", "#bphs", "#astronomy", "#ज्योतिष"]
  };

  function render(reel, lang) {
    if (!reel) return null;
    lang = lang || "hinglish";
    var times = beatTimes(reel), say = lines(reel, lang);
    var beats = times.map(function (t) {
      var s = say[t.i] || "";
      var need = readSecs(s, lang);
      return { n: t.i + 1, from: t.from, to: t.to, secs: t.secs,
               say: s, need: need, tight: need > t.secs * 1.08 };
    });
    var F = reel.facts;
    return {
      lang: lang,
      title: reel.title,
      seconds: reel.tl ? reel.tl.seconds : null,
      beats: beats,
      overrun: beats.filter(function (b) { return b.tight; }).length,
      caption: caption(reel, lang),
      tags: (TAGS[(F && F.kind) || ""] || TAGS[""]).join(" ")
    };
  }

  /* ---- how long the reel would have to be to be narrated ----------------

     THE FIRST THING THIS GENERATOR FOUND was that the reels are too fast to
     read over. An explainer runs twenty seconds for seven beats, which is
     about two seconds a beat once the lead and tail are taken out — and the
     shortest honest sentence about a junction star's longitude takes six.
     Every beat came back flagged, in all three languages.

     That is not a fault in the script and not a fault in the reel: a reel
     built to be WATCHED and a reel built to be READ OVER are different
     lengths, and nothing had ever been asked to reconcile them. So the
     generator reports the length the narration needs, the Studio offers it
     as a duration, and the same reel can be recorded either way.

     The figure is what each line needs plus the lead and tail the format
     already spends, with a little air between beats — not the bare reading
     time, which would have the narrator starting the next sentence on the
     frame the last one ends. */
  function suggestSeconds(reel, lang) {
    var r = render(reel, lang);
    if (!r || !r.beats.length) return null;
    var tl = reel.tl, fixed = tl ? (tl.lead + tl.tail) : 3;
    var body = 0;
    r.beats.forEach(function (b) { body += Math.max(b.need, 1.2) + 0.45; });
    return Math.round((fixed + body) * 2) / 2;
  }

  window.SPScript = { LANGS: LANGS, render: render, beatTimes: beatTimes,
                      readSecs: readSecs, syllables: syllables,
                      suggestSeconds: suggestSeconds,
                      speech: speech, speakable: speakable };
})();
