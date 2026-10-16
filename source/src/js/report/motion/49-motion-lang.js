/* ===== Motion — the two languages =========================================
   One table, two columns. Everything the canvas draws goes through moT(); nothing
   anywhere else carries a translated string, so adding a term is one line here and
   not a hunt through twenty-four scenes.

   SCOPE, as agreed. The control governs what is DRAWN — scene titles and subtitles,
   every label and readout on the canvas, the caption band, the context bar, the
   animation's own control labels, and the headers of what those export. It does NOT
   govern the reference pages, the site nav and footer, or the "How to read this"
   panel beneath the animation. Those stay in English on purpose: they are long
   technical prose, and a machine rendering of them would read badly and would blur
   the line this site keeps between BPHS verse, translator commentary and our own
   explanation. A finite vocabulary can be got right; an essay cannot be got right
   cheaply.

   WHAT THE TWO COLUMNS ARE. English mode sets Sanskrit terms in IAST — Vṛṣabha,
   Kṛttikā — because that is how the rest of the site writes them and because a
   transliteration is still the Sanskrit word. Hindi mode sets the same terms in
   Devanāgarī and the surrounding words in Hindi. Neither column translates a term
   into something it is not: "Vṛṣabha" does not become "Bull".

   ON MEASURING. Devanāgarī sets wider and taller than Latin at the same size, and
   this canvas fits text by measuring it. Every clearance check has to be run in both
   languages or Hindi overflows exactly where English fitted. See the harness notes
   in the commit that added this file. */

var MO_LANG="en";                       /* "en" | "hi" — the live setting */
function moLangHi(){ return MO_LANG==="hi"; }

/* --- the table ----------------------------------------------------------
   Keys are stable identifiers, never display text, so a wording change in one
   language cannot silently orphan the other. */
var MO_STR={

/* ---- the twelve rāśis, by index ---- */
rasi:{en:["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"],
      hi:["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"]},

/* ---- the twenty-seven nakṣatras ---- */
nak:{en:["Aśvinī","Bharaṇī","Kṛttikā","Rohiṇī","Mṛgaśirā","Ārdrā","Punarvasu","Puṣya","Āśleṣā",
         "Maghā","Pūrva Phalgunī","Uttara Phalgunī","Hasta","Citrā","Svātī","Viśākhā","Anurādhā",
         "Jyeṣṭhā","Mūla","Pūrva Āṣāḍhā","Uttara Āṣāḍhā","Śravaṇa","Dhaniṣṭhā","Śatabhiṣā",
         "Pūrva Bhādrapadā","Uttara Bhādrapadā","Revatī"],
     hi:["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा",
         "मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा",
         "ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा",
         "पूर्व भाद्रपद","उत्तर भाद्रपद","रेवती"]},

/* ---- the nine grahas, keyed by the engine's English name ---- */
graha:{en:{Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",Jupiter:"Guru",
           Venus:"Śukra",Saturn:"Śani",Rahu:"Rāhu",Ketu:"Ketu"},
       hi:{Sun:"सूर्य",Moon:"चन्द्र",Mars:"मंगल",Mercury:"बुध",Jupiter:"गुरु",
           Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"}},

/* ---- two-letter glyphs for the wheel. Devanāgarī has no settled two-letter
       abbreviation, so Hindi uses the first syllable, which is what a Hindi
       pañcāṅga does. ---- */
gl:{en:{Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"},
    hi:{Sun:"सू",Moon:"चं",Mars:"मं",Mercury:"बु",Jupiter:"गु",Venus:"शु",Saturn:"श",Rahu:"रा",Ketu:"के"}},

/* ---- the fifteen tithis of a pakṣa, plus the two that end them ---- */
tithi:{en:["Pratipadā","Dvitīyā","Tṛtīyā","Caturthī","Pañcamī","Ṣaṣṭhī","Saptamī","Aṣṭamī",
           "Navamī","Daśamī","Ekādaśī","Dvādaśī","Trayodaśī","Caturdaśī","Pūrṇimā"],
       hi:["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी",
           "नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा"]},
amavasya:{en:"Amāvāsyā", hi:"अमावस्या"},

/* ---- pakṣa ---- */
shukla:{en:"Śukla", hi:"शुक्ल"},
krishna:{en:"Kṛṣṇa", hi:"कृष्ण"},

/* ---- the twelve lunar months, keyed by the engine's LMONTH spelling ---- */
masa:{en:{Chaitra:"Caitra",Vaishakha:"Vaiśākha",Jyeshtha:"Jyeṣṭha",Ashadha:"Āṣāḍha",
          Shravana:"Śrāvaṇa",Bhadrapada:"Bhādrapada",Ashwina:"Āśvina",Kartika:"Kārtika",
          Margashirsha:"Mārgaśīrṣa",Pausha:"Pauṣa",Magha:"Māgha",Phalguna:"Phālguna"},
      hi:{Chaitra:"चैत्र",Vaishakha:"वैशाख",Jyeshtha:"ज्येष्ठ",Ashadha:"आषाढ",
          Shravana:"श्रावण",Bhadrapada:"भाद्रपद",Ashwina:"आश्विन",Kartika:"कार्तिक",
          Margashirsha:"मार्गशीर्ष",Pausha:"पौष",Magha:"माघ",Phalguna:"फाल्गुन"}},

/* ---- the seven vāras, Sunday first ---- */
vara:{en:["Ravivāra","Somavāra","Maṅgalavāra","Budhavāra","Guruvāra","Śukravāra","Śanivāra"],
      hi:["रविवार","सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार"]},

/* ---- the words the context bar and the scenes put around those terms ---- */
ui:{
  /* context bar */
  yourLocation:{en:"your location", hi:"आपका स्थान"},
  chartPlace:  {en:"chart cast for", hi:"कुण्डली का स्थान"},
  noPlace:     {en:"no location set", hi:"स्थान नहीं चुना गया"},
  ghatika:     {en:"gh", hi:"घ"},
  fromSunrise: {en:"from sunrise", hi:"सूर्योदय से"},
  sunrise:     {en:"sunrise", hi:"सूर्योदय"},
  sunset:      {en:"sunset", hi:"सूर्यास्त"},
  pada:        {en:"pāda", hi:"पाद"},
  /* the panel */
  language:    {en:"Language", hi:"भाषा"},
  speed:       {en:"Speed", hi:"गति"},
  span:        {en:"Span", hi:"अवधि"},
  thisLoop:    {en:"this loop", hi:"यह चक्र"},
  held:        {en:"held", hi:"ठहराव"},
  events:      {en:"events", hi:"घटनाएँ"},
  holdEvents:  {en:"Hold events", hi:"घटनाओं पर ठहरें"},
  on:          {en:"on", hi:"चालू"},
  off:         {en:"off", hi:"बंद"},
  /* scene words that recur */
  newMoon:     {en:"new moon", hi:"अमावस्या"},
  fullMoon:    {en:"full moon", hi:"पूर्णिमा"},
  eclipse:     {en:"eclipse", hi:"ग्रहण"},
  solar:       {en:"solar", hi:"सूर्य"},
  lunar:       {en:"lunar", hi:"चन्द्र"},
  laterTradition:{en:"later tradition, not BPHS", hi:"परवर्ती परम्परा, बीपीएचएस नहीं"}
}
};

/* --- accessors ----------------------------------------------------------
   Each falls back to the English column rather than to an empty string, so a term
   that has not been given a Hindi form yet shows the IAST and is visibly missing
   instead of silently blank. A blank label is the kind of fault that survives a
   whole release unnoticed. */
function moTcol(e){ return (moLangHi() && e && e.hi) ? e.hi : (e && e.en); }
function moT(key){ var e=MO_STR.ui[key]; return moTcol(e)||key; }
function moTrasi(i){ var t=MO_STR.rasi; return (moLangHi()?t.hi:t.en)[((i%12)+12)%12]; }
function moTnak(i){ var t=MO_STR.nak;  return (moLangHi()?t.hi:t.en)[((i%27)+27)%27]; }
function moTgraha(en){ var t=MO_STR.graha; return (moLangHi()?t.hi:t.en)[en]||en; }
/* The engine writes graha names in its own IAST ("Śukra"). EN maps those back to
   the English key everything here is built on; without the round trip a Hindi frame
   shows Devanāgarī rāśis beside IAST rulers. */
function moTsk(sa){
  var en=(typeof EN!=="undefined"&&EN[sa])||null;
  return en?moTgraha(en):sa;
}
function moTgl(en){ var t=MO_STR.gl; return (moLangHi()?t.hi:t.en)[en]||en; }
function moTmasa(nm){ var t=MO_STR.masa; return (moLangHi()?t.hi:t.en)[nm]||nm; }
function moTvara(i){ var t=MO_STR.vara; return (moLangHi()?t.hi:t.en)[((i%7)+7)%7]; }
/* n is 1..30 as a pañcāṅga counts it: 1-15 śukla, 16-30 kṛṣṇa, 30 being amāvāsyā */
function moTtithi(n){
  var t=MO_STR.tithi, arr=(moLangHi()?t.hi:t.en);
  n=((Math.round(n)-1)%30+30)%30+1;
  if(n===30) return moTcol(MO_STR.amavasya);
  if(n<=15)  return moTcol(MO_STR.shukla)+" "+arr[n-1];
  return moTcol(MO_STR.krishna)+" "+arr[(n-16)];
}

/* Devanāgarī digits, offered as a sub-toggle because a reader may want the terms in
   Hindi and the numbers in the form their watch uses. Off by default: a degree
   figure is read as a number far more often than as a word. */
var MO_DEVNUM=false;
var MO_DIG=["०","१","२","३","४","५","६","७","८","९"];
function moNum(s){
  if(!moLangHi() || !MO_DEVNUM) return String(s);
  return String(s).replace(/[0-9]/g,function(d){ return MO_DIG[+d]; });
}

/* --- the scenes, in Hindi ------------------------------------------------
   Keyed by the scene's own key, so a scene whose English wording changes cannot
   silently orphan its Hindi, and a scene added without a Hindi entry falls back to
   English visibly rather than drawing a blank. The build checks that this table and
   the scene list agree.

   These are translations, not transliterations: the Sanskrit terms stay Sanskrit
   (in Devanāgarī), and the English around them becomes Hindi. "Retrograde loop"
   becomes वक्री गति का फंदा, not a Devanāgarī spelling of "retrograde loop". */
var MO_SCENE_HI={
retro:   {label:"वक्री फंदा", title:"वक्री का अर्थ पीछे जाना नहीं",
          sub:"चुनी हुई अवधि का हर फंदा · आड़े देशान्तर, खड़े शर"},
gochara: {label:"गोचर", title:"मन्द ग्रह कहाँ जाते हैं",
          sub:"भीतर जन्मकुण्डली, बाहर गोचर का आकाश"},
orrery:  {label:"झुका हुआ मण्डल", title:"कोई ग्रह क्रान्तिवृत्त पर नहीं बैठता",
          sub:"हर ग्रह अपने वास्तविक शर जितना ऊपर उठा हुआ"},
birthsky:{label:"जन्म का आकाश", title:"जिस आकाश के नीचे आपका जन्म हुआ",
          sub:"केन्द्र में खमध्य, किनारे पर क्षितिज"},
nakshatra:{label:"नक्षत्र दर्शन", title:"नाम के पीछे का तारा",
          sub:"जिस योगतारा के नाम पर नक्षत्र है"},
frames:  {label:"घूमता क्या है", title:"राशियाँ कभी नहीं घूमतीं",
          sub:"लग्न सरकता है, भाव साथ चलते हैं, राशिचक्र स्थिर रहता है"},
ayanamsa:{label:"अयनांश", title:"दो राशिचक्र, धीरे-धीरे अलग होते हुए",
          sub:"विषुव लगभग बहत्तर वर्ष में एक अंश खिसकता है"},
drishti: {label:"दृष्टि", title:"ग्रह कहाँ देखता है",
          sub:"हर ग्रह सातवें को देखता है; कुछ उससे आगे भी"},
tithi:   {label:"तिथि और पक्ष", title:"तिथि एक कोण है",
          sub:"चन्द्र का सूर्य से बारह अंश दूर हटना"},
dasha:   {label:"दशा पट्टी", title:"नौ कालखण्डों में एक जीवन",
          sub:"विंशोत्तरी महादशा और अन्तर्दशा"},
panchanga:{label:"पञ्चाङ्ग", title:"दिन के पाँच अंग",
          sub:"तिथि · वार · नक्षत्र · योग · करण"},
tilt:    {label:"झुकाव और राहु-केतु", title:"अधिकांश महीनों में ग्रहण क्यों नहीं होता",
          sub:"चन्द्र का पथ ५° झुका है, इसलिए प्रायः अमावस्या पर छाया ऊपर या नीचे से निकल जाती है"},
eclipseseason:{label:"ग्रहण ऋतु", title:"ग्रहण मौसम की तरह क्यों आते हैं",
          sub:"राहु-केतु पीछे हटते हैं, सूर्य उन्हें वर्ष में दो बार पकड़ लेता है"},
eclipse: {label:"आगामी ग्रहण", title:"ग्रहण केवल राहु-केतु पर होते हैं",
          sub:"हर एक राहु या केतु से कुछ ही अंश के भीतर"},
astanga: {label:"अस्त", title:"सूर्य में समाया हुआ",
          sub:"अस्तंगत — सूर्य के इतने पास कि दिखाई न दे"},
dignity: {label:"बल और अवस्था", title:"वही ग्रह, कहीं श्रेष्ठ कहीं निर्बल",
          sub:"उच्च, स्वक्षेत्र, मित्र, शत्रु, नीच"},
sadesati:{label:"साढ़ेसाती", title:"चन्द्र पर शनि",
          sub:"चन्द्र से बारहवाँ, पहला और दूसरा"},
lagna:   {label:"लग्न", title:"पूर्व से ऊपर आती राशि",
          sub:"लग्न क्रान्तिवृत्त पर एक बिन्दु है, और पृथ्वी का घूमना उसे ऊपर लाता है"},
moon:    {label:"चन्द्र", title:"चन्द्र, जैसा आकाश उसे प्रकाशित करता है",
          sub:"कला, दोलन और दूरी — दिखाए गए क्षण के वास्तविक मान"},
sun:     {label:"सूर्य", title:"सूर्य, एकमात्र ग्रह जिसकी कोई कला नहीं",
          sub:"कणिकाएँ, किनारे का मन्द पड़ना और धब्बे — और शर सदा शून्य"},
worlds:  {label:"पाँच लोक", title:"तारा ग्रह, लोकों के रूप में",
          sub:"हर एक अपनी वास्तविक कला, नाप और दूरी के साथ"},
bhava:   {label:"भाव क्या दर्शाते हैं", title:"बारह भाव",
          sub:"हर भाव किसके लिए है, और बीपीएचएस उसे कहाँ सूक्ष्म करता है"},
rashi:   {label:"बारह राशियाँ", title:"तीस-तीस अंश",
          sub:"तत्त्व, स्वभाव, स्वामी, और आपका क्या वहाँ बैठा है"},
nakfull: {label:"सत्ताईस, पूरे", title:"तेरह अंश बीस कला",
          sub:"स्वामी, देवता, चार पाद, और आपका क्या भीतर पड़ता है"}
};
/* A scene's words in the current language. Falls back to the scene's own English
   fields, so a new scene is readable the moment it exists. */
function moSceneWords(s){
  if(!moLangHi()) return {label:s.label,title:s.title,sub:s.sub};
  var h=MO_SCENE_HI[s.key]||{};
  return {label:h.label||s.label, title:h.title||s.title, sub:h.sub||s.sub};
}

/* --- the sentences the scenes draw --------------------------------------
   Parameterised, because almost every line on a frame is part words and part
   number: "latitude shown ×6" has to put the 6 where each language wants it, and
   a language that puts it elsewhere must be able to say so. {0}, {1} … are the
   arguments in order.

   This is the long tail of the language work — the terms are the vocabulary, these
   are the sentences around them. Keeping them here rather than inline in the scenes
   means a translator can read the whole surface in one file, which is also the only
   way to keep the register consistent across twenty-four scenes. */
var MO_PHR={
/* retro */
noRetro:    {en:"{0} does not turn retrograde", hi:"{0} वक्री नहीं होता"},
inWindow:   {en:"anywhere in this window",      hi:"इस अवधि में कहीं भी"},
eclPlane:   {en:"ecliptic plane",               hi:"क्रान्तिवृत्त तल"},
retroCount: {en:"{0} retrograde{1} in this window", hi:"इस अवधि में {0} वक्री गति"},
/* gochara */
gochara:    {en:"gochara",       hi:"गोचर"},
natalInside:{en:"natal inside",  hi:"भीतर जन्मकुण्डली"},
/* birthsky / frames / lagna */
lagnaRising:{en:"lagna rising",  hi:"उदित लग्न"},
lagna:      {en:"lagna",         hi:"लग्न"},
rasisFixed: {en:"rāśis fixed",   hi:"राशियाँ स्थिर"},
LAGNA:      {en:"LAGNA",         hi:"लग्न"},
housesEqual:{en:"equal houses — the cusps slide", hi:"सम भाव — सन्धियाँ सरकती हैं"},
housesWhole:{en:"whole-sign bhāvas — the ring steps", hi:"पूर्ण राशि भाव — वलय चरणों में चलता है"},
riseTable:  {en:"how long each rāśi takes to rise at {0}° {1} — BPHS asks for oblique ascension",
             hi:"{0}° {1} पर प्रत्येक राशि के उदय का समय — बीपीएचएस तिर्यक् उदय मानता है"},
/* nakshatra */
ecliptic:   {en:"ecliptic", hi:"क्रान्तिवृत्त"},
starMag:    {en:"magnitude {0}   ·   {1}° sidereal   ·   {2}° latitude",
             hi:"कान्तिमान {0}   ·   निरयन {1}°   ·   शर {2}°"},
starInside: {en:"falls inside the division named after it",
             hi:"उसी नक्षत्र के भीतर पड़ता है जिसका नाम उस पर है"},
starOutside:{en:"falls outside the division named after it",
             hi:"उस नक्षत्र से बाहर पड़ता है जिसका नाम उस पर है"},
/* ayanamsa */
ayanMet:    {en:"they met around 285 CE — the zero point of the sidereal zodiac",
             hi:"ये लगभग २८५ ईस्वी में मिले थे — निरयन राशिचक्र का शून्य बिन्दु"},
/* tithi */
pakshaOf:   {en:"{0} pakṣa", hi:"{0} पक्ष"},
tithiN:     {en:"Tithi {0}",  hi:"तिथि {0}"},
degBetween: {en:"{0}° between them", hi:"दोनों के बीच {0}°"},
/* dasha */
mahadasha:  {en:"{0} mahādaśā", hi:"{0} महादशा"},
antarWithin:{en:"antardaśā within {0}", hi:"{0} के भीतर अन्तर्दशा"},
age:        {en:"age {0}", hi:"आयु {0}"},
/* panchanga */
masaAmanta: {en:"MĀSA · amānta", hi:"मास · अमान्त"},
limbOf:     {en:"{0}  {1} of {2}", hi:"{0}  {2} में से {1}"},
/* tilt */
shadowCorr: {en:"shadow corridor ±{0}°", hi:"छाया पथ ±{0}°"},
latTimes:   {en:"latitude shown ×{0} — at true scale the gap is too fine to see",
             hi:"शर {0} गुना बढ़ाकर दिखाया — वास्तविक माप में अन्तर दिखाई ही न दे"},
latAcross:  {en:"Candra's latitude across the span — the gold marks are the eclipses",
             hi:"पूरी अवधि में चन्द्र का शर — सुनहरे चिह्न ग्रहण हैं"},
/* eclipse seasons */
eclSeason:  {en:"eclipse season", hi:"ग्रहण ऋतु"},
noEclPoss:  {en:"no eclipse possible", hi:"ग्रहण सम्भव नहीं"},
degFromNode:{en:"{0}° from the node", hi:"राहु-केतु से {0}°"},
aboveBelow: {en:"☉ above the line · ☾ below", hi:"☉ रेखा के ऊपर · ☾ नीचे"},
/* eclipses ahead */
umbra:      {en:"umbra", hi:"प्रच्छाया"},
penumbra:   {en:"penumbra", hi:"उपच्छाया"},
eclTitle:   {en:"{0} {1} eclipse", hi:"{0} {1} ग्रहण"},
degFromWhich:{en:"{0}° from {1}", hi:"{1} से {0}°"},
/* astanga */
astangata:  {en:"astaṅgata", hi:"अस्तंगत"},
orbNote:    {en:"the dashed lines are each graha's own orb — 17° for Maṅgala, 12° for Guru, and so on",
             hi:"बिन्दुदार रेखाएँ प्रत्येक ग्रह की अपनी सीमा हैं — मंगल के लिए १७°, गुरु के लिए १२°, इत्यादि"},
/* dignity */
moolatrikona:{en:"mūlatrikoṇa", hi:"मूलत्रिकोण"},
/* sadesati */
natalCandra:{en:"natal Candra", hi:"जन्म का चन्द्र"},
sadeSati:   {en:"Sade Sati", hi:"साढ़ेसाती"},
dhaiya:     {en:"Dhaiyā", hi:"ढैया"},
clear:      {en:"clear", hi:"मुक्त"},
/* moon / sun / worlds */
waxing:     {en:"waxing", hi:"शुक्ल"},
waning:     {en:"waning", hi:"कृष्ण"},
moonState:  {en:"{0}  ·  {1}% lit  ·  {2}° from Sūrya",
             hi:"{0}  ·  {1}% प्रकाशित  ·  सूर्य से {2}°"},
moonWhere:  {en:"{0} pāda {1}  ·  {2}  ·  {3} km away",
             hi:"{0} पाद {1}  ·  {2}  ·  {3} किमी दूर"},
moonSurface:{en:"surface generated from code — maria at their true selenographic places",
             hi:"सतह संगणना से बनी — समुद्र अपने वास्तविक चन्द्र-स्थानों पर"},
sunWhere:   {en:"{0} pāda {1}  ·  {2}", hi:"{0} पाद {1}  ·  {2}"},
uttarayana: {en:"Uttarāyaṇa", hi:"उत्तरायण"},
dakshinayana:{en:"Dakṣiṇāyana", hi:"दक्षिणायन"},
sunFacts:   {en:"{0} AU  ·  {1}′ across  ·  ecliptic latitude 0°, always",
             hi:"{0} खगोलीय इकाई  ·  {1}′ चौड़ा  ·  शर सदैव 0°"},
sunSurface: {en:"the disc is generated: granulation, limb darkening, and spots at the latitudes they favour",
             hi:"बिम्ब संगणना से बना है: कणिकाएँ, किनारे का मन्द पड़ना, और धब्बे उन्हीं अक्षांशों पर जहाँ वे होते हैं"},
worldFacts: {en:"{0}% lit  ·  {1}″ across  ·  magnitude {2}",
             hi:"{0}% प्रकाशित  ·  {1}″ चौड़ा  ·  कान्तिमान {2}"},
worldsTrue: {en:"their true sizes beside one another, at this moment's distances",
             hi:"इस क्षण की दूरियों पर, एक-दूसरे के सामने उनके वास्तविक आकार"},
ringsOpen:  {en:"rings open {0}°", hi:"वलय {0}° खुले"},
/* rashi */
exalts:     {en:"{0} exalts", hi:"{0} उच्च"},
falls:      {en:"{0} falls",  hi:"{0} नीच"},
rasiAttrs:  {en:"{0}  ·  {1}  ·  lord {2}", hi:"{0}  ·  {1}  ·  स्वामी {2}"},
kalapurusha:{en:"of the Kālapuruṣa, the {0}", hi:"कालपुरुष का {0}"},
houseFromLagna:{en:"From your lagna this is house {0} — {1}",
             hi:"आपके लग्न से यह {0} भाव है — {1}"},
risingMin:  {en:"takes {0} minutes to rise at your latitude — {1}% of the day",
             hi:"आपके अक्षांश पर उदय में {0} मिनट लेती है — दिन का {1}%"},
movable:    {en:"Movable", hi:"चर"},
fixed:      {en:"Fixed",   hi:"स्थिर"},
dual:       {en:"Dual",    hi:"द्विस्वभाव"},
fire:{en:"Fire",hi:"अग्नि"}, earth:{en:"Earth",hi:"पृथ्वी"},
air:{en:"Air",hi:"वायु"},   water:{en:"Water",hi:"जल"},
/* nakfull */
padaN:      {en:"pāda {0}", hi:"पाद {0}"},
nakLord:    {en:"lord {0}  ·  {1} to {2}", hi:"स्वामी {0}  ·  {1} से {2}"},
nakDeity:   {en:"deity {0}  ·  {1} gaṇa", hi:"देवता {0}  ·  {1} गण"},
nakLater:   {en:"— deity and gaṇa are later tradition, not verses of Parāśara —",
             hi:"— देवता और गण परवर्ती परम्परा हैं, पराशर के श्लोक नहीं —"},
nakCandra:  {en:"your Candra stands here — this is what opens the Viṃśottarī sequence",
             hi:"आपका चन्द्र यहाँ है — विंशोत्तरी क्रम यहीं से आरम्भ होता है"},
/* bhava */
readPlain:  {en:"read as the chart itself gives them, with nothing narrowed",
             hi:"जैसा कुण्डली स्वयं देती है, बिना किसी संकुचन के"},
lensIn:     {en:"in {0}, read these same meanings for {1}",
             hi:"{0} में, यही अर्थ {1} के लिए पढ़े जाते हैं"},
keyHouse:   {en:"★  this is the house {0} exists to refine",
             hi:"★  यही वह भाव है जिसे सूक्ष्म करने के लिए {0} है"},
emptyHouse: {en:"empty", hi:"रिक्त"},
bphsRefines:{en:"BPHS refines this topic in {0}", hi:"बीपीएचएस इस विषय को {0} में सूक्ष्म करता है"},
lordIs:     {en:"lord {0}", hi:"स्वामी {0}"},
/* shared */
drawFailed: {en:"This scene could not be drawn: {0}",
             hi:"यह दृश्य नहीं बन सका: {0}"},
ofN:        {en:"{0} / {1}", hi:"{0} / {1}"},
bhavaOfN:   {en:"bhāva {0} of {1}", hi:"{1} में से {0} भाव"}
};
/* Fill a phrase. Arguments are substituted positionally and run through moNum(), so
   a Devanāgarī-numeral reader gets Devanāgarī numerals inside sentences too. */
function moP(key){
  var e=MO_PHR[key], t=moTcol(e);
  if(t==null) return key;
  var args=Array.prototype.slice.call(arguments,1);
  return t.replace(/\{(\d)\}/g,function(_,i){
    var v=args[+i]; return v==null?"":moNum(v); });
}

/* --- the teaching vocabulary --------------------------------------------
   The rāśi attributes, the limbs of the Kālapuruṣa, the bhāva significations and
   the deities. Longer than the rest because these scenes exist to be read rather
   than watched: the words are the content, not a caption on it. */
var MO_MODE={en:["Movable","Fixed","Dual"], hi:["चर","स्थिर","द्विस्वभाव"]};
var MO_ELEM={en:["Fire","Earth","Air","Water"], hi:["अग्नि","पृथ्वी","वायु","जल"]};
var MO_LIMB={en:["head","face and neck","arms and chest","chest and heart","stomach",
  "waist and navel","lower abdomen","generative organs","hips and thighs","knees",
  "calves","feet"],
  hi:["सिर","मुख और कण्ठ","भुजाएँ और वक्ष","वक्ष और हृदय","उदर","कटि और नाभि",
  "अधोउदर","जननांग","नितम्ब और जंघा","घुटने","पिण्डलियाँ","पैर"]};
var MO_GANA={en:{"Deva":"Deva","Manuṣya":"Manuṣya","Rākṣasa":"Rākṣasa"},
             hi:{"Deva":"देव","Manuṣya":"मनुष्य","Rākṣasa":"राक्षस"}};
/* nakṣatra deities, in the order of the nakṣatras */
var MO_DEITY={hi:["अश्विनी कुमार","यम","अग्नि","ब्रह्मा / प्रजापति","सोम","रुद्र","अदिति","बृहस्पति",
 "सर्प","पितर","भग","अर्यमा","सवितृ","त्वष्टा","वायु","इन्द्राग्नि","मित्र","इन्द्र","निऋति",
 "आप","विश्वेदेव","विष्णु","वसु","वरुण","अजैकपाद","अहिर्बुध्न्य","पूषा"]};
/* the twelve bhāvas: the Sanskrit name, the short sense, and Ch. 11's significations */
var MO_BHAVA={
 sa:{hi:["तनु","धन","सहज","बन्धु","पुत्र","रिपु","युवति","रन्ध्र","धर्म","कर्म","लाभ","व्यय"]},
 en:{hi:["शरीर और स्वयं","धन और वाणी","पराक्रम और भाई-बहन","घर और माता","मन और सन्तान",
  "विपत्ति","जीवनसाथी और सम्बन्ध","आयु और गोपनीय","भाग्य और धर्म","कर्म और प्रतिष्ठा",
  "लाभ","व्यय और हानि"]},
 sig:{hi:["शरीर, रूप, बुद्धि, वर्ण, बल, सुख-दुःख, स्वभाव",
  "धन, अन्न, कुटुम्ब, वाणी, धातु और रत्न",
  "पराक्रम, भाई-बहन, सेवक, उपदेश, लघु यात्राएँ",
  "वाहन, सम्बन्धी, माता, सुख, कोष, भूमि और भवन",
  "मन्त्र, विद्या, ज्ञान, सन्तान, अधिकार, पदच्युति",
  "मातुल, शत्रु, रोग, व्रण, ऋण और बाधा",
  "जीवनसाथी, यात्रा, व्यापार, दृष्टि, साझेदारी — और एक मारक स्थान",
  "आयु, संघर्ष, गुप्त बातें, उत्तराधिकार, भूत और भविष्य",
  "भाग्य, धर्म, तीर्थ, गुरु, कुछ मतों में पिता",
  "अधिकार, व्यवसाय, जीविका, सम्मान, पिता, विदेशवास, ऋण",
  "लाभ, आय, समृद्धि, बड़े भाई-बहन, जो माँगा और मिला",
  "व्यय, शत्रु, एकान्त, हानि, और मोक्ष के विषय"]}
};
/* the matter each division is read for */
var MO_VLENS_HI={
 D1:"सम्पूर्ण जीवन जैसा है", D2:"धन और जो उसे बनाए रखता है",
 D3:"भाई-बहन, पराक्रम और स्वयं की पहल", D4:"घर, भूमि और स्थिर सम्पत्ति",
 D7:"सन्तान", D9:"विवाह, धर्म, और प्रत्येक ग्रह की परिपक्वता",
 D10:"व्यवसाय और संसार में कर्म", D12:"माता-पिता और उनसे जो मिला",
 D16:"वाहन, सुख और सुविधा", D20:"उपासना और साधना",
 D24:"विद्या और अध्ययन", D27:"प्रत्येक ग्रह का बल अथवा निर्बलता",
 D30:"कष्ट और दुर्भाग्य", D40:"माता के कुल से जो चला आया",
 D45:"पिता के कुल से जो चला आया", D60:"पूर्व कर्म का सूक्ष्म शेष"
};
var MO_VN_HI={D2:"होरा — धन",D3:"द्रेक्काण — भाई-बहन",D4:"चतुर्थांश — सम्पत्ति",
  D7:"सप्तांश — सन्तान",D9:"नवांश — जीवनसाथी और धर्म",D10:"दशांश — व्यवसाय",
  D12:"द्वादशांश — माता-पिता"};

function moTmode(i){ return moLangHi()?MO_MODE.hi[i]:MO_MODE.en[i]; }
function moTelem(i){ return moLangHi()?MO_ELEM.hi[i]:MO_ELEM.en[i]; }
function moTlimb(i){ return moLangHi()?MO_LIMB.hi[i]:MO_LIMB.en[i]; }
function moTgana(g){ return moLangHi()?(MO_GANA.hi[g]||g):g; }
function moTdeity(i,en){ return moLangHi()?(MO_DEITY.hi[i]||en):en; }
function moTbhSa(i,en){ return moLangHi()?(MO_BHAVA.sa.hi[i]||en):en; }
function moTbhEn(i,en){ return moLangHi()?(MO_BHAVA.en.hi[i]||en):en; }
function moTbhSig(i,en){ return moLangHi()?(MO_BHAVA.sig.hi[i]||en):en; }
function moTvlens(v,en){ return moLangHi()?(MO_VLENS_HI[v]||en):en; }
function moTvn(v,en){ return moLangHi()?(MO_VN_HI[v]||en):en; }

/* --- the last of the prose ----------------------------------------------
   Everything above is vocabulary; these are the sentences that were still being
   built inline in the scenes. Gathered here so the whole drawn surface lives in
   one file and a reader can check the register is consistent across it. */
var MO_PHR2={
turnsBack:  {en:"turns back", hi:"पीछे मुड़ता है"},
resumes:    {en:"resumes", hi:"पुनः सीधा"},
atTheNode:  {en:"at the node", hi:"राहु-केतु पर"},
loopOf:     {en:"loop {0} of {1}", hi:"{1} में से {0} फंदा"},
daysSpan:   {en:"{0}  →  {1}   ·   {2} days", hi:"{0}  →  {1}   ·   {2} दिन"},
entersSign: {en:"{0} enters {1}", hi:"{0} का {1} में प्रवेश"},
natalOutside:{en:"the natal chart inside, the transiting sky outside",
             hi:"भीतर जन्मकुण्डली, बाहर गोचर का आकाश"},
fromPlane:  {en:"{0} {1}° from the plane", hi:"{0}, तल से {1}°"},
dayNight:   {en:"{0} · lagna {1} · below the horizon: {2}",
             hi:"{0} · लग्न {1} · क्षितिज के नीचे: {2}"},
daylight:   {en:"daylight", hi:"दिन"},
night:      {en:"night", hi:"रात"},
spokesSlide:{en:"gold spokes slide · the shaded ring steps",
             hi:"सुनहरी रेखाएँ सरकती हैं · छायांकित वलय चरणों में चलता है"},
lagnaAfter: {en:"lagna {0} {1} · {2} h after birth", hi:"लग्न {0} {1} · जन्म से {2} घंटे बाद"},
lagnaEnters:{en:"lagna enters {0} — the bhāvas step round",
             hi:"लग्न का {0} में प्रवेश — भाव आगे बढ़ते हैं"},
siderealZero:{en:"sidereal 0°", hi:"निरयन 0°"},
tropicalZero:{en:"tropical 0°", hi:"सायन 0°"},
ayanSep:    {en:"they met around 285 CE, and have separated ever since",
             hi:"ये लगभग २८५ ईस्वी में मिले थे, और तब से अलग होते गए"},
adds48:     {en:"{0} adds the 4th and the 8th", hi:"{0} चौथे और आठवें को भी देखता है"},
adds59:     {en:"{0} adds the 5th and the 9th", hi:"{0} पाँचवें और नवें को भी देखता है"},
adds310:    {en:"{0} adds the 3rd and the 10th", hi:"{0} तीसरे और दसवें को भी देखता है"},
tithiOf:    {en:"{0} · tithi {1} of 15 · elongation {2}°",
             hi:"{0} · १५ में से {1} तिथि · अन्तर {2}°"},
noSyzygy:   {en:"no new or full moon now", hi:"इस समय न अमावस्या है न पूर्णिमा"},
nodesRetreat:{en:"the nodes retreat {0}° a year — this axis has moved {1}° so far",
             hi:"राहु-केतु वर्ष में {0}° पीछे हटते हैं — यह अक्ष अब तक {1}° चला है"},
eclCount:   {en:"{0} of {1} eclipses · Sūrya {2}° from Rāhu",
             hi:"{1} में से {0} ग्रहण · राहु से सूर्य {2}°"},
eclAhead:   {en:"{0} of {1} ahead · the geometry is schematic, the timing is computed",
             hi:"आगे {1} में से {0} · आकृति प्रतीकात्मक है, समय संगणित"},
eclAtNodes: {en:"every one of them within a few degrees of Rāhu or Ketu",
             hi:"हर एक राहु या केतु से कुछ ही अंश के भीतर"},
nothingCombust:{en:"nothing combust at this moment", hi:"इस समय कोई ग्रह अस्त नहीं"},
combustList:{en:"combust: {0}", hi:"अस्त: {0}"},
exalted:    {en:"exalted", hi:"उच्च"},
debilitated:{en:"debilitated", hi:"नीच"},
ownSign:    {en:"own sign", hi:"स्वक्षेत्र"},
friend:     {en:"friend", hi:"मित्र"},
enemy:      {en:"enemy", hi:"शत्रु"},
neutral:    {en:"neutral", hi:"सम"},
rising:     {en:"rising", hi:"आरोह"},
peak:       {en:"peak", hi:"शिखर"},
setting:    {en:"setting", hi:"अवरोह"},
lagnaRise:  {en:"lagna {0} {1}  ·  {2} h for this rāśi to rise",
             hi:"लग्न {0} {1}  ·  इस राशि के उदय में {2} घंटे"},
holding:    {en:"holding {0}", hi:"यहाँ {0}"},
nothingHere:{en:"no graha of yours stands here", hi:"आपका कोई ग्रह यहाँ नहीं"},
nothingIn:  {en:"nothing of yours falls in this division", hi:"इस भाग में आपका कुछ नहीं पड़ता"},
noDivision: {en:"No division is assigned to this topic — it is read from the rāśi chart",
             hi:"इस विषय के लिए कोई वर्ग नहीं है — इसे राशि कुण्डली से ही देखा जाता है"},
countedFrom:{en:"{0} — {1}, counted whole-sign from its own lagna in {2}",
             hi:"{0} — {1}, अपने ही लग्न {2} से पूर्ण राशि गिनकर"},
yourVarga:  {en:"in your {0} the lagna falls in {1} — switch the division above to read the houses there",
             hi:"आपके {0} में लग्न {1} में है — ऊपर वर्ग बदलकर वहाँ के भाव देखें"},
worldFilled:{en:"this disc is filled to the frame; for their real sizes see the comparison",
             hi:"यह बिम्ब फ्रेम भर कर दिखाया है; वास्तविक आकार तुलना में देखें"},
mercuryNote:{en:"airless and cratered, and never more than 28° from Sūrya",
             hi:"वायुहीन और गड्ढों से भरा, और सूर्य से कभी २८° से अधिक दूर नहीं"},
starName:   {en:"{0}  ·  {1}", hi:"{0}  ·  {1}"}
};
/* merged so moP() sees one table; kept as two literals only because the first was
   written before the scenes had been swept for everything they draw */
for(var _k in MO_PHR2) MO_PHR[_k]=MO_PHR2[_k];

/* the tail of the tail — states, phases and the two or three remaining sentences */
var MO_PHR3={
retrograde: {en:"retrograde", hi:"वक्री"},
direct:     {en:"direct", hi:"मार्गी"},
latIs:      {en:"lat {0}°", hi:"शर {0}°"},
ayanIs:     {en:"ayanāṃśa {0}° · {1}", hi:"अयनांश {0}° · {1}"},
shukla:     {en:"Śukla", hi:"शुक्ल"},
krishnaP:   {en:"Kṛṣṇa", hi:"कृष्ण"},
limbTithi:  {en:"tithi", hi:"तिथि"},
limbVara:   {en:"vāra", hi:"वार"},
limbNak:    {en:"nakṣatra", hi:"नक्षत्र"},
limbYoga:   {en:"yoga", hi:"योग"},
limbKarana: {en:"karaṇa", hi:"करण"},
orbNote2:   {en:"the dashed lines are each graha's own orb — 17° for Maṅgala, 10° for Śukra",
             hi:"बिन्दुदार रेखाएँ प्रत्येक ग्रह की अपनी सीमा हैं — मंगल के लिए १७°, शुक्र के लिए १०°"},
phasePost:  {en:"{0} phase", hi:"{0} चरण"},
hAfterBirth:{en:"{0} h after birth", hi:"जन्म से {0} घंटे बाद"},
hToRise:    {en:"{0} h for this rāśi to rise", hi:"इस राशि के उदय में {0} घंटे"},
sunSpots:   {en:"the disc is generated: granulation, limb darkening, spot groups within {0}° of the equator",
             hi:"बिम्ब संगणना से बना है: कणिकाएँ, किनारे का मन्द पड़ना, और विषुवत् से {0}° के भीतर धब्बों के समूह"},
oneMag:     {en:"their true sizes beside one another, at one magnification",
             hi:"एक ही आवर्धन पर, एक-दूसरे के सामने उनके वास्तविक आकार"},
everyDiscMag:{en:"every disc at one magnification — {0} px per arcsecond, {1}",
             hi:"हर बिम्ब एक ही आवर्धन पर — {0} पिक्सेल प्रति विकला, {1}"},
eclTotal:   {en:"Total", hi:"पूर्ण"},
eclPartial: {en:"Partial", hi:"आंशिक"},
eclAnnular: {en:"Annular", hi:"वलयाकार"},
eclPenumbral:{en:"Penumbral", hi:"उपच्छाया"},
circumpolar:{en:"circumpolar", hi:"ध्रुवीय"},
needChart:  {en:"needs your chart", hi:"आपकी कुण्डली चाहिए"},
needDasha:  {en:"daśā runs from the Moon at birth, so this one needs your chart",
             hi:"दशा जन्म के चन्द्र से चलती है, इसलिए इसके लिए कुण्डली चाहिए"},
needSadesati:{en:"Śani is measured against the Moon at birth, so this one needs your chart",
             hi:"शनि को जन्म के चन्द्र से नापा जाता है, इसलिए इसके लिए कुण्डली चाहिए"},
needBirthsky:{en:"this is the sky at one birth moment, so it needs your chart",
             hi:"यह एक जन्म-क्षण का आकाश है, इसलिए इसके लिए कुण्डली चाहिए"},
watchSky:   {en:"Watch the sky", hi:"आकाश देखें"},
noChartYet: {en:"No chart cast. Fifteen of these need none — they are about the sky, not about you.",
             hi:"अभी कोई कुण्डली नहीं। इनमें से पन्द्रह को कुण्डली चाहिए ही नहीं — ये आकाश के विषय में हैं, आपके नहीं।"},
pickPlace:  {en:"Place", hi:"स्थान"},
starAt:     {en:"magnitude {0}   ·   {1}° sidereal   ·   {2}° latitude",
             hi:"कान्तिमान {0}   ·   निरयन {1}°   ·   शर {2}°"}
};
for(var _k3 in MO_PHR3) MO_PHR[_k3]=MO_PHR3[_k3];

/* Eclipse kind words arrive from the ephemeris in English; map them rather than
   translating at each call site, since three scenes print the same four words. */
function moTeclKind(w){
  var m={Total:"eclTotal",Partial:"eclPartial",Annular:"eclAnnular",Penumbral:"eclPenumbral"};
  var k=m[String(w).charAt(0).toUpperCase()+String(w).slice(1).toLowerCase()];
  return k?moP(k):w;
}
/* The dignity words the sweep scene paints a sign with. */
/* The engine names the tithi and the pakṣa in its own romanisation ("Saptami",
   "Shukla"). Map by position rather than by spelling where we can, and fall back to
   what arrived so a name we have not met still shows. */
function moTtithiName(n){
  var i=MO_TITHI_ROMAN.indexOf(String(n));
  /* English mode is not a pass-through: the engine writes "Dashami" and the rest of
     this site writes "Daśamī". Mapping both columns keeps one romanisation on screen
     instead of two. */
  if(i>=0) return (moLangHi()?MO_STR.tithi.hi:MO_STR.tithi.en)[i];
  if(String(n)==="Amavasya") return moTcol(MO_STR.amavasya);
  return n;
}
var MO_TITHI_ROMAN=["Pratipada","Dvitiya","Tritiya","Chaturthi","Panchami","Shashthi",
  "Saptami","Ashtami","Navami","Dashami","Ekadashi","Dvadashi","Trayodashi",
  "Chaturdashi","Purnima"];
function moTpaksha(p){
  return /kri|kṛ/i.test(p) ? moTcol(MO_STR.krishna) : moTcol(MO_STR.shukla);
}
function moTdignity(d){
  var m={exalted:"exalted",debilitated:"debilitated",own:"ownSign",friend:"friend",
         enemy:"enemy",neutral:"neutral",moolatrikona:"moolatrikona"};
  return m[d]?moP(m[d]):d;
}

var MO_PHR4={
pctLit:     {en:"{0}  ·  {1}% lit  ·  {2}° from {3}", hi:"{0}  ·  {1}% प्रकाशित  ·  {3} से {2}°"},
worldLit:   {en:"{0}% lit  ·  {1}″ across  ·  magnitude {2}",
             hi:"{0}% प्रकाशित  ·  {1}″ चौड़ा  ·  कान्तिमान {2}"},
moonMaria:  {en:"surface generated from code — maria at their true selenographic places, {0}",
             hi:"सतह संगणना से बनी — समुद्र अपने वास्तविक चन्द्र-स्थानों पर, {0}"},
fromLining: {en:"Candra is {0}° from lining up — nothing can happen between them",
             hi:"चन्द्र युति-वियुति से {0}° दूर है — दोनों के बीच कुछ नहीं हो सकता"},
insideCorr: {en:"Candra is only {0}° off the ecliptic — inside the corridor",
             hi:"चन्द्र क्रान्तिवृत्त से केवल {0}° दूर है — छाया पथ के भीतर"},
saniIn:     {en:"Śani in {0} · {1}", hi:"शनि {0} में · {1}"},
notOverMoon:{en:"not over the Moon", hi:"चन्द्र पर नहीं"},
dhaiyaFrom: {en:"Dhaiyā — the {0}th from Candra", hi:"ढैया — चन्द्र से {0}वाँ"},
varaBoth:   {en:"{0} · {1}", hi:"{0}"}
};
for(var _k4 in MO_PHR4) MO_PHR[_k4]=MO_PHR4[_k4];
/* yoga and karaṇa names, in the engine's romanisation order */
var MO_YOGA_HI=["विष्कम्भ","प्रीति","आयुष्मान्","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल",
 "गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान्","परिघ","शिव",
 "सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","इन्द्र","वैधृति"];
var MO_KAR_HI={Bava:"बव",Balava:"बालव",Kaulava:"कौलव",Taitila:"तैतिल",Gara:"गर",
 Vanija:"वणिज",Vishti:"विष्टि",Shakuni:"शकुनि",Chatushpada:"चतुष्पद",Naga:"नाग",
 Kimstughna:"किंस्तुघ्न"};
var MO_YOGA_EN=["Viṣkambha","Prīti","Āyuṣmān","Saubhāgya","Śobhana","Atigaṇḍa",
 "Sukarmā","Dhṛti","Śūla","Gaṇḍa","Vṛddhi","Dhruva","Vyāghāta","Harṣaṇa","Vajra",
 "Siddhi","Vyatīpāta","Varīyān","Parigha","Śiva","Siddha","Sādhya","Śubha","Śukla",
 "Brahmā","Indra","Vaidhṛti"];
function moTyoga(n){
  var i=(typeof YOGAN!=="undefined")?YOGAN.indexOf(String(n)):-1;
  return i>=0?(moLangHi()?MO_YOGA_HI[i]:MO_YOGA_EN[i]):n;
}
var MO_KAR_EN={Bava:"Bava",Balava:"Bālava",Kaulava:"Kaulava",Taitila:"Taitila",
 Gara:"Gara",Vanija:"Vaṇija",Vishti:"Viṣṭi",Shakuni:"Śakuni",
 Chatushpada:"Catuṣpada",Naga:"Nāga",Kimstughna:"Kiṃstughna"};
function moTkarana(n){ var t=moLangHi()?MO_KAR_HI:MO_KAR_EN; return t[String(n)]||n; }

var MO_PHR5={
nakOfN:     {en:"nakṣatra {0} of {1}", hi:"{1} में से {0} नक्षत्र"},
siderealLbl:{en:"sidereal", hi:"निरयन"},
tropicalLbl:{en:"tropical", hi:"सायन"},
rituAyana:  {en:"ṛtu {0}  ·  {1}", hi:"ऋतु {0}  ·  {1}"},
candraIn:   {en:"{0} in {1} {2}", hi:"{0} {1} {2} में"},
fromNewMoon:{en:"{0}° from new moon", hi:"अमावस्या से {0}°"},
fromFullMoon:{en:"{0}° from full moon", hi:"पूर्णिमा से {0}°"},
fromNode:   {en:"{0}° from {1}", hi:"{1} से {0}°"},
latOff:     {en:"{0} {1}°", hi:"{0} {1}°"},
marsNote:   {en:"the dark markings and the polar caps that a small telescope shows",
             hi:"गहरे चिह्न और ध्रुवीय टोपियाँ, जो छोटी दूरबीन में दिखती हैं"}
};
for(var _k5 in MO_PHR5) MO_PHR[_k5]=MO_PHR5[_k5];
/* ṛtu and ayana, keyed by the engine's romanisation */
var MO_RITU={en:{Vasanta:"Vasanta",Grishma:"Grīṣma",Varsha:"Varṣā",Sharad:"Śarad",
  Hemanta:"Hemanta",Shishira:"Śiśira"},
  hi:{Vasanta:"वसन्त",Grishma:"ग्रीष्म",Varsha:"वर्षा",Sharad:"शरद",
  Hemanta:"हेमन्त",Shishira:"शिशिर"}};
/* Both columns are mapped, English included: the engine writes "Shishira" and the
   rest of the site writes "Śiśira". One romanisation on screen, not two. */
function moTritu(n){ var t=moLangHi()?MO_RITU.hi:MO_RITU.en; return t[n]||n; }
function moTayana(n){
  if(/dak/i.test(n)) return moLangHi()?"दक्षिणायन":"Dakṣiṇāyana";
  if(/utt/i.test(n)) return moLangHi()?"उत्तरायण":"Uttarāyaṇa";
  return n;
}

var MO_PHR6={
venusNote:  {en:"a cloud deck with nothing beneath it to see — and the clearest phases of any graha",
             hi:"बादलों की चादर, जिसके नीचे कुछ दिखाई नहीं देता — और सब ग्रहों में सबसे स्पष्ट कलाएँ"},
jupiterNote:{en:"belts and zones at their true latitudes, and the red spot at 22° south",
             hi:"पट्टियाँ और क्षेत्र अपने वास्तविक अक्षांशों पर, और लाल धब्बा २२° दक्षिण में"},
saturnNote: {en:"the rings open and close over fifteen years as the tilt turns towards us",
             hi:"वलय पन्द्रह वर्षों में खुलते और बन्द होते हैं, जैसे-जैसे झुकाव हमारी ओर मुड़ता है"}
};
for(var _k6 in MO_PHR6) MO_PHR[_k6]=MO_PHR6[_k6];
