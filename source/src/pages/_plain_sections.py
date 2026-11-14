# -*- coding: utf-8 -*-
"""Plain-language explanations, one per SECTION.

Every section heading on the site carries a small "In simple words" button that
opens an overlay with the entry below. Written for a reader with no background
in astronomy or Jyotiṣa. Same rules as _plain.py: explain unexplained terms,
describe rather than promise, rank no tradition above another.

  SECTIONS[page][h2-id]      the static pages, keyed by the heading's id
  REPORT[title]              the Kundli report's sections (kundli, workstation)
  DASH[section-id]           the visual dashboard's sections
  TECH[heading text]         the sample technical report's sections

build.py refuses to build if a heading has no entry or an entry names a heading
that does not exist.
"""

SECTIONS = {

"404.html": {
  "where": "Links to the pages people most often look for. Pick one, or use the menu at the top.",
  "offline": "Pages you have opened before keep working without an internet connection. A page you have never opened needs a connection once.",
},

"index.html": {
  "path": "The suggested order to learn in: start with the basics (planets, signs, houses), then how placements are judged, then timing and advanced topics.",
  "topics": "One card per subject. Each opens a page that explains that subject from the book, with tables and examples.",
  "tools": "Pages that calculate for you: a full birth chart, and a searchable table of the 108 quarter-stars in English and Hindi.",
},

"grahas.html": {
  "profiles": "A table of the nine planets: what each one stands for, its temperament, the kinds of work linked with it, and how the tradition classifies it.",
  "benefic": "Which planets the tradition calls naturally gentle and which naturally harsh. This label never changes, but it is only one part of judging a planet.",
  "classify": "Other ways the tradition groups the planets — by temperament (guṇa), element, and so on — used for finer detail.",
  "aspects-x": "Which houses each planet 'looks at' from where it sits. Every planet looks at the house opposite; Mars, Jupiter and Saturn also look at two more.",
},

"dignity.html": {
  "exalt": "Where each planet is strongest (exalted), weakest (debilitated), and 'at home' (own sign and mūlatrikoṇa, a favoured stretch of degrees).",
  "nodes": "Rāhu and Ketu, the two invisible points of the Moon's path. The book does not fix their strong and weak signs; the table shows the common tradition, labelled as such.",
  "friend": "Which planets are friends, neutrals or enemies of each other — permanently, temporarily (by where they sit in a chart), and the two combined.",
  "states": "Three conditions that weaken or change a planet: too close to the Sun (combust), very close to another planet (planetary war), and appearing to move backwards (retrograde).",
  "neecha": "Rules by which a weak placement can be offset, and a reminder that dignity is a starting point, not a verdict.",
},

"rashis.html": {
  "profiles": "One row per zodiac sign: its ruling planet, element, whether it is 'moving', 'fixed' or 'dual', and other traits the tradition gives it.",
  "classes": "The ways signs are grouped. Later rules use these groups — for example, sign aspects depend only on whether a sign is moving, fixed or dual.",
  "lords": "Which planet rules each sign. The Sun and Moon rule one sign each; the other five rule two.",
},

"bhavas.html": {
  "sig": "The twelve houses: what each covers in life, which body part it is linked with, and its natural significator planet.",
  "class": "Groups of houses with a shared character — the strong 'angles', the fortunate 'trines', the difficult houses, and the houses that improve with time.",
  "lords": "What it means when the owner of one house sits in another: the two areas of life become linked.",
  "bhavabala": "How strong a house itself is, judged from its owner and the planets in and aspecting it.",
  "prosper": "A side-by-side list of what tends to support a house and what tends to harm it, according to the book.",
},

"lagna.html": {
  "asc": "A short description of each of the twelve rising signs — the general temperament the tradition links with each.",
  "special": "Other 'rising points' the book computes from the time after sunrise, each used for a particular purpose such as wealth or status.",
},

"vargas.html": {
  "list": "All sixteen divisional charts in one table: how finely each slices a sign, and which part of life each is read for.",
  "howto": "How to use a divisional chart: always check the main chart first, then look at the houses of the division that matter for its subject.",
  "d1": "The main birth chart. Every other division refines it.",
  "d2": "Each sign split in two halves (horā), used for wealth and sustenance. It is read by halves rather than as twelve houses.",
  "d3": "Each sign split in three, used for siblings, courage and physical vitality. The table says what each house means in this chart.",
  "d4": "Each sign split in four, used for property, home and settled fortune.",
  "d7": "Each sign split in seven, used for children — read only after the main chart's 5th house shows the theme.",
  "d9": "Each sign split in nine (navāṃśa) — the most used division, read for marriage, life purpose, and the true strength of every planet.",
  "d10": "Each sign split in ten, used for career and public role.",
  "d12": "Each sign split in twelve, used for parents and ancestry.",
  "d16": "Each sign split in sixteen, used for vehicles, comforts and everyday happiness.",
  "d20": "Each sign split in twenty, used for spiritual practice and devotion.",
  "d24": "Each sign split in twenty-four, used for education and learning.",
  "d27": "Each sign split in twenty-seven, used for underlying strengths and stamina.",
  "d30": "Each sign split unequally among five planets, used for difficulties, health troubles and character weaknesses.",
  "d40": "Each sign split in forty, used for general good and ill effects, linked with the mother's line.",
  "d45": "Each sign split in forty-five, used for conduct and character, linked with the father's line.",
  "d60": "Each sign split in sixty — the finest division, said to show deep karmic themes. It changes every couple of minutes of birth time, so it needs an exact time.",
},

"aspects.html": {
  "graha": "Planetary aspects: which places each planet 'looks at' and how strongly. All look at the opposite point; Mars, Jupiter and Saturn have extra full aspects.",
  "rashi": "Sign aspects: whole signs look at other signs, decided only by whether a sign is moving, fixed or dual. A planet takes on the aspects of its sign.",
  "argala": "A related idea: planets in certain houses from a point 'intervene' in its affairs, and planets in the opposite houses can block that.",
},

"strength.html": {
  "shad": "The six kinds of strength the book adds up for each planet (position, direction, time, motion, nature, aspects), each with its sub-parts, and the minimum each planet needs.",
  "bhavabala": "How the strength of a house is scored, from its owner, its direction and the aspects on it.",
  "ishta": "Two opposite measures for each planet: its capacity for agreeable results (iṣṭa) and for difficult ones (kaṣṭa).",
  "vim": "Strength across the divisional charts on a 20-point scale (Vimśopaka): how often a planet is well placed when the sign is sliced finer.",
},

"special-points.html": {
  "arudha": "Ārūḍha points — how each area of life appears to the world, as opposed to how it actually is. The section shows how they are counted.",
  "argala": "Argala — 'interventions': planets in certain houses from a point help or stress it, and planets opposite them can block that.",
  "karaka": "Chara kārakas — planets ranked by how far through their sign they are; each rank stands for a person or theme, the first for the self.",
  "karakamsa": "Kārakāṃśa — the sign in the navāṃśa chart where the self-planet sits, used as an extra starting point for reading deeper life themes.",
},

"yogas.html": {
  "yk": "A yogakāraka is one planet that owns both a strong 'angle' house and a fortunate 'trine' house — usually the most helpful planet for that rising sign.",
  "mahapurusha": "Five 'great person' combinations: Mars, Mercury, Jupiter, Venus or Saturn strong in its own or exalted sign in an angle house.",
  "lunar": "Combinations judged from the Moon — planets in the houses either side of it, or none at all.",
  "solar": "Combinations judged from the Sun — planets in the houses either side of it.",
  "nabhasa": "Thirty-two combinations based on the overall pattern the planets make in the chart.",
  "raja": "Combinations traditionally linked with status and authority, mainly links between angle and trine house owners.",
  "dhana": "Combinations traditionally linked with wealth, from links between the owners of the money houses.",
  "other": "Other well-known named combinations and what the tradition says each gives.",
  "parivartana": "When two planets sit in each other's signs they 'exchange' — the effect depends on which houses are involved.",
  "arishta": "Combinations the book lists for hardship. They are explained as doctrine only, with their many cancellations, and are never predictions.",
  "checklist": "Five questions to ask of any combination before giving it weight: is it really formed, are its planets strong, does it hold in the divisions, is it cancelled, and is its time period running?",
},

"avasthas-longevity.html": {
  "avastha": "The five ways the book describes a planet's 'state' — like age, alertness or mood — which change how fully it can act.",
  "ayus": "What the book says about length of life, explained as doctrine only. The site never calculates a lifespan for anyone.",
  "maraka": "The houses and planets the book links with the end of a life span, explained as doctrine only and never applied to a person.",
},

"dashas.html": {
  "vim": "The main period system: a 120-year cycle in which nine planets each rule a fixed number of years, starting from where the Moon was at birth.",
  "cond": "Other planet-period systems the book gives for charts that meet particular conditions, with how each one starts.",
  "rasi": "Period systems that move through signs instead of planets, and others based on the time of day or the Moon's quarter-star — with the verses for each.",
},

"ashtakavarga.html": {
  "bindu": "The basic idea: each planet gives a 'point' to a sign or does not, according to fixed rules in the book.",
  "bav": "Each planet's own score-sheet across the twelve signs, and the grand total that shows the chart's overall support sign by sign.",
  "kaksha": "A finer grid: each sign is cut into eight parts, each ruled by one contributor, used to time the effect of a moving planet.",
  "shodhana": "Three 'reductions' the book applies to the scores before they are used for finer timing.",
  "practice": "How the scores are used in practice — mainly to judge how a planet moving through a sign is likely to feel for that chart.",
},

"now.html": {
  "pancanga": "Right now, for your place: the lunar day, weekday, Moon's star, the two other limbs, the lunar month in both reckonings, the season, and sunrise and sunset.",
  "strip": "The lunar days on either side of now, as bands along a time line, so you can see when each one begins and ends.",
  "later": "Divisions of the day used in later practice — planetary hours, choghaḍiyā and rāhu kāla. They are not from BPHS and are shown separately for that reason.",
  "why": "Why the Hindu day starts at sunrise rather than midnight, and what that means for someone born before dawn.",
},

"calendar.html": {
  "reading": "Three things that look like mistakes but are not: a lunar day that covers two dates, a lunar day that is skipped, and an extra lunar month.",
  "reckoning": "The two ways months are counted in India — ending at full moon (north) or at new moon (west and south) — and why the same day can have two month names.",
  "rules": "Festivals are rules, not fixed dates. The day view shows the rule behind each festival and marks where almanacs apply it differently.",
  "place": "Why the city you choose matters: the day depends on local sunrise, so two cities can honestly keep a festival on different days.",
  "limits": "What the calendar does not do, and its date range (1800–2200).",
},

"studio.html": {
  "today": "What is happening in the sky today that is worth a post, each with a caption, the numbers behind it, and an image.",
  "reels": "Five short videos about today's sky. Each opens the animation and records it as a video file on your device.",
  "pack": "One button that makes a whole day's set of images with captions and hands it to you as a single .zip file.",
  "compose": "Build your own card or carousel: choose the pieces (headline, chart, numbers…), arrange them, and edit the text.",
  "ahead": "Coming events — planets turning, changing sign, new and full moons — over the days you chose, so you can plan posts in advance.",
  "how": "How the captions are made (calculated fresh, never from a stored table) and what the page refuses to write, such as predictions.",
  "animate": "How a card becomes a video: the matching animation opens and is recorded frame by frame into a file.",
  "place": "Why the place matters here too: lunar days and event times depend on where you are.",
},

"studio-pro.html": {
  "say": "Type what you want in plain words; the page tells you what it understood and draws it.",
  "samples": "Live examples drawn from this minute's sky. Click one to open it.",
  "wall": "Every quantity the site computes, as clickable chips. Pick one or several and the stage draws them. The timeline below places each layer in time.",
  "tray": "Different pictures that fit your selection — pick another if you prefer — and the option to take full control of the layers yourself.",
  "how": "How the page decides what to draw: each quantity has a shape, and each drawing style knows which shapes it can show.",
  "honest": "What is deliberately not on this page, and why.",
},

"director-pro.html": {
  "say": "Type what you want, or add items from the library to the current scene. Layers, export and the inspector are in this area.",
  "how": "How animation works here: every moving property follows 'keyframes' — set values at set times — and nothing moves for any other reason.",
},

"siddhanta.html": {
  "plain": "The three versions of the Sūrya Siddhānta this page can run — the text as written, the fitted tier and Varāhamihira's older Saura — and a glossary of the technical words the page uses (mahāyuga, manda, śīghra, epicycle, bīja and the rest).",
  "what": "What this page does: it computes the sky the way the old Sūrya Siddhānta text does, and shows it next to a modern computation.",
  "params": "The text's own numbers that the computation uses — revolutions in a great age, epicycle sizes, and so on.",
  "now": "For the moment you choose, every planet's position by both methods, side by side.",
  "working": "The step-by-step arithmetic for one planet, exactly as the text prescribes it.",
  "trig": "The text's own table of sines and how using it, rather than a modern sine, changes the answer.",
  "day": "Sunrise and the length of day at your place, computed the text's way.",
  "panchanga": "The five limbs of the day computed from the text's Sun and Moon, next to a modern almanac.",
  "eclipses": "Eclipses as the text's method finds them, over the years you choose, next to a modern list.",
  "drift": "How far the text's positions and the modern ones move apart over the centuries, drawn as a graph.",
  "sandbox": "Adjust the text's constants yourself, as later astronomers did with 'bīja' corrections, and watch the difference from the modern sky change.",
  "three": "The same moment computed three ways — the text as written, an adjusted version, and modern — on one ring.",
  "absent": "What this page does not include, and the reason for each.",
  "use": "How to use these positions in the studio pages to draw the older sky.",
},

"engine-lab.html": {
  "three": "What the three engines are — modern (today's astronomy), fitted (the Sūrya Siddhānta's method with re-measured constants) and as written (the text's own numbers) — how close each is to the real sky, and a glossary of the words used on the page.",
  "bench": "Pick a question (where is each planet, what lunar day, when is the next new moon…) and see the answer from all three calculating methods side by side.",
  "longspan": "The fourth engine, Kālasetu: the Sūrya Siddhānta's own time-count with a modern geometry, fitted across 3600 BCE – 3600 CE. The table shows how far it is from the modern engine on dates the fit never saw, in 600-year bands; the slider compares the two on any year in the span.",
  "cost": "Converts an error in degrees into what it changes in a chart. Below the slider, a table gives each engine's real, measured error for every planet, and what that error does to sign-change dates, tithi end times and daśā dates.",
  "scale": "One ruler showing that differences between conventions (such as ayanāṃśa) are far bigger than differences between the engines.",
  "bands": "How confident the modern engine is in different centuries, and what that means for the question you chose.",
  "which": "Which engine the site uses for which job.",
},

"simulation.html": {
  "what": "What this page does: takes the real Sun, Earth and Moon, changes one thing, and lets gravity work out what follows.",
  "pick": "Choose the change to try, the starting moment and the playback length, then press Play.",
  "eclipse": "Whether a total solar eclipse could still happen after the change — it depends on whether the Moon still looks bigger than the Sun.",
  "notmodelled": "What the simulation leaves out, and why.",
},

"accuracy.html": {
  "can": "How much of the tradition the site actually computes, counted from the built site.",
  "headline": "The short answer: how close the site's planet positions are to a professional reference.",
  "scale": "Each planet's worst error drawn next to the divisions it could affect — it is far smaller than any of them.",
  "convention": "The differences between the nineteen ayanāṃśa choices, on the same scale — about a thousand times bigger than the calculation error.",
  "cost": "What a small error means in practice — seconds on a lunar day ending, days or less on a period date.",
  "window": "The years over which the engine is checked (1800–2200), and what happens outside them.",
  "siddhanta": "How the older Sūrya Siddhānta engines compare with the modern one.",
  "precision": "How finely the arithmetic settles on its answer — a different question from whether the answer is right.",
  "unmeasured": "What has not been measured yet, listed openly.",
},

"ecliptic.html": {
  "wheel": "The live wheel with its controls: date, time, place, ayanāṃśa, how far to play, speed, divisional charts, aspects and trails.",
  "reading": "How to read the wheel: each planet at its exact degree, 'R' for retrograde, and what the colours and rings mean.",
},

"divisions.html": {
  "wheel": "The same circle cut three ways — signs, stars and quarter-stars. Drag the pointer to see which of each a point falls in.",
  "nested": "Why one quarter-star is exactly one navāṃśa slice: 108 quarters divided among 12 signs is 9 per sign.",
  "lords": "The 27 stars carry the nine period-planets in a repeating order — the link between the Moon's star and life periods.",
  "classes": "The ways the twelve signs are grouped, as a table — the same data the wheel is coloured by.",
  "now": "Where each planet stands right now in all three divisions.",
},

"graha-lab.html": {
  "ribbon": "One picture of every planet's condition across the whole zodiac — strong, at home, friendly or weak.",
  "why": "Why one thin stripe appears inside a sign: the mūlatrikoṇa, a favoured stretch of degrees.",
  "cards": "Each planet described, with where it is now, its condition there, and how fast it is moving.",
  "speed": "How fast each planet really moves, on one scale — from the Moon (a star a day) to Saturn (a sign in two and a half years).",
  "nodes": "Why Rāhu and Ketu have no place in this dignity picture.",
},

"bhava-systems.html": {
  "three": "Three ways to divide a chart into houses: whole sign, equal from the rising degree, and Śrīpati (from the horizon and the top of the sky).",
  "wheel": "All three sets of houses drawn as rings on one wheel, so you can see where they differ.",
  "shift": "The planets that land in a different house depending on the system.",
  "latitude": "Why Śrīpati houses come out unequal, and how that changes with distance from the equator. Drag the latitude to see.",
  "cusp": "Inside a Śrīpati house: the middle gives the fullest effect, the junction between houses gives none, and the effect fades between them.",
  "meanings": "What each of the twelve houses stands for.",
},

"ayanamsa.html": {
  "start": "Two ways to start the zodiac: at the spring equinox (Western) or from the stars (Indian). The gap between them is the ayanāṃśa.",
  "drift": "Drag the year and watch the gap between the two zodiacs grow, about one degree every 72 years.",
  "why": "Why the equinox moves: the Earth's axis slowly wobbles like a spinning top.",
  "derive": "How an ayanāṃśa value is obtained, in five drawn steps, with the arithmetic for the year you choose.",
  "equation": "Most ayanāṃśas are one short formula; this shows each part of it.",
  "stars": "Ayanāṃśas defined by fixing a particular star at a particular degree.",
  "impact": "What changing the ayanāṃśa changes (signs, stars, period dates) and what it cannot change (lunar day, karaṇa).",
  "chart": "A chart redrawn as you change the ayanāṃśa, so you can watch planets cross into other signs.",
  "spread": "The nineteen ayanāṃśas the site offers, and how far apart they are.",
  "band": "Which of the nineteen fit the historical evidence for where the zodiac started.",
  "sandbox": "Make your own ayanāṃśa; the whole site uses it until you leave the page.",
  "share": "Make a card or a short film about the ayanāṃśa to share.",
},

"starwheel.html": {
  "wheel": "The sky as a tilted disc for the day, time and place you choose, with the zodiac, stars and planets.",
  "day": "The whole day from sunrise to the next sunrise, showing when each of the five limbs changes.",
  "tithi": "The lunar day in detail, including when one spans two sunrises or is skipped.",
  "card": "A card of the day to download and share, with the parts you choose.",
  "reading": "How to read the tilted wheel — why it is tilted and what the horizon line means.",
},

"credits.html": {
  "code": "The site's own code and its licence (MIT).",
  "components": "Other people's software and data built into the site, each with its own licence.",
  "texts": "The books the site cites and quotes from briefly.",
  "nothing-sent": "No trackers, analytics or outside services are used, and nothing you type is sent anywhere.",
  "warranty": "The site teaches a tradition; it gives no predictions or advice and no guarantee about astrological interpretation.",
},

"reel.html": {
  "stories": "Pick a story (a question about the sky), the dates, the look and the voice, then preview and record the video.",
  "script": "The caption and voice-over script for the reel, written from the same numbers as the pictures, ready to copy.",
  "closing": "Every reel ends on what was actually found — counts and averages from the calculation.",
  "honest": "The patterns in the reels are astronomy, not meanings — for example, Venus draws five petals because of how its cycle fits ours.",
},

"kundli.html": {
  "cast": "Enter a name (optional), date, time and place of birth, and press Cast the chart. Settings let you change the ayanāṃśa, house system and node type.",
  "gochara": "A year of planetary movements — every sign change and every turn backwards or forwards — with no birth chart needed.",
  "rashiphal": "The year read for each Moon sign in turn, showing which house each planet passes through and which traditional conditions apply.",
  "what": "What a birth chart (kuṇḍalī) is, in a few lines.",
  "need": "What you need to enter, and why the exact birth time matters so much.",
  "how": "The steps the page takes to calculate a chart.",
  "read": "Where to start reading the result, and which reference page explains each part.",
  "limits": "Where the positions come from, how accurate they are, and the limits of the method.",
},

"kinetic-workstation.html": {
  "cast": "Enter the birth details and press Cast the chart; every panel on this page reads from the one chart.",
  "gochara": "A year of planetary movements — every sign change and turn — with no birth chart needed.",
  "rashiphal": "The year read for each Moon sign in turn.",
},

"ceremony.html": {
  "what": "What the animation shows: the planets winding back through time to where they were at the moment you chose, on a ring of the 27 stars.",
  "how": "How to turn the ring and how to close the animation.",
  "record": "How to record the animation as a video file on your device.",
  "limits": "What the picture does and does not show — it is a teaching diagram, not a prediction.",
},

"motion.html": {
  "about": "Which scenes run with no birth details (most of them) and which need a chart, and why.",
},

}

# ---- the Kundli report's sections (kundli.html, kinetic-workstation.html) --
REPORT = {
  "Birth particulars": "The birth details the chart was cast from, the calendar facts of that moment, and the settings used.",
  "How much rests on the birth minute": "Which results would change if the birth time were a few minutes off — useful if the time is uncertain.",
  "Conventions in use": "The choices this chart was cast with: ayanāṃśa (where the zodiac starts), house system and node type.",
  "Special ascendants": "Other 'rising points' the book computes from the time after sunrise, each used for a particular purpose.",
  "Upagrahas": "Extra calculated 'shadow' points (sub-planets such as Gulika and Māndi) the book uses alongside the planets. They are not bodies in the sky.",
  "Dhūmādi upagrahas": "Five sub-planets calculated from the Sun's position.",
  "The chart": "The birth chart drawn as a diagram, in North and South Indian styles.",
  "Chandra & Sūrya kuṇḍalī": "The same chart redrawn with the Moon's sign, and then the Sun's sign, as the first house.",
  "Special ascendant charts": "Charts redrawn from each special rising point.",
  "Grahas": "One row per planet: sign, degree, star and quarter, dignity, house, and other states.",
  "Avasthās": "Each planet's 'state' — such as age or alertness — in the book's five schemes.",
  "Bhāva Chalit": "The chart redrawn with houses measured from the exact rising degree, showing planets that change house.",
  "Bhāva (Sripati)": "The Śrīpati houses — drawn from the horizon and the top of the sky — and which planets fall in each.",
  "Bhāvas": "One row per house: its sign, owner, occupants and other details.",
  "Graha dṛṣṭi": "Which planets look at which planets and houses, and how strongly.",
  "Rāśi dṛṣṭi": "Sign aspects: which signs look at which, and the planets carried with them.",
  "Argala": "Planets that 'intervene' in each house's affairs, and those that block the intervention.",
  "Ashtakavarga": "The point-scores each planet gives to each sign, and the totals.",
  "Prastārāṣṭakavarga and kakṣyā": "The full breakdown of who gave which point, and the eight finer slices of each sign.",
  "Divisional ashtakavarga": "The point-scores computed in the divisional charts.",
  "Ṣoḍaśa varga": "Every planet's sign in all sixteen divisional charts.",
  "Divisional charts": "The divisional charts drawn as diagrams.",
  "Ṣoḍaśavarga strength": "How well placed each planet is across the divisional charts, as a 20-point score.",
  "Ṣaḍbala": "Each planet's six-fold strength from the book, with every part, the total, and the minimum it needs.",
  "Bhāva Bala": "The strength of each house, with its parts.",
  "Iṣṭa & Kaṣṭa phala": "Each planet's capacity for agreeable results (iṣṭa) and for difficult ones (kaṣṭa).",
  "Kārakāṃśa": "The sign in the navāṃśa where the self-planet sits, used as an extra starting point for reading.",
  "Ārūḍha & Kārakāṃśa charts": "Charts redrawn from the image-point of the self and from the kārakāṃśa.",
  "Sudarśana Chakra": "Three charts in one wheel — from the rising sign, the Moon and the Sun — read together.",
  "Planetary friendship": "Which planets are friends or enemies, permanently, in this chart, and both combined.",
  "Yogas": "The named combinations found in this chart, and those checked and not found. Each is a theme, not a promise.",
  "Kārakas & ārūḍhas": "The planets ranked as significators, and the image-points of each house.",
  "Vimśottarī daśā": "The main 120-year period system: which planet rules which years of life, starting from birth.",
  "Antardaśā & pratyantardaśā": "The sub-periods inside each main period, and sub-sub-periods.",
  "Aṣṭottarī daśā": "A 108-year period system the book gives for some charts.",
  "Yoginī daśā": "A 36-year cycle of eight periods, each named after a yoginī.",
  "Chara daśā": "A sign-based period system in the Jaimini form; the BPHS form is in the next section.",
  "The other daśās of BPHS": "All the other period systems in the book's chapter on periods, each with its rule, whether this chart meets its condition, and the period running now.",
  "Varṣaphala": "The chart of the current birthday year (solar return) by the Tājika method — the year's ruler, strengths, sensitive points and the year's periods.",
  "Current sky": "Where the planets are on today's date (or the date shown), for comparison with the birth chart.",
  "Gochara": "Today's planets counted from the birth Moon — which house from the Moon each is passing through, and whether the tradition counts that as easy or hard.",
  "Kakṣā transit": "Which of the eight finer slices each moving planet is in, and whether it holds a point.",
  "Derived points": "A few more points worked out from positions already in the chart — such as the Bhṛgu Bindu and the Yogi point — each labelled with whether it comes from the classical texts or from later tradition.",
  "Sade Sati timeline": "The roughly seven-and-a-half-year periods when Saturn passes around the birth Moon, with dates.",
  "Ingress & retrograde": "The next two years of dates when planets change sign or turn backwards or forwards.",
  "Eclipses": "Coming eclipses, with dates, and where each falls in this chart.",
  "Day tools": "Divisions of the birth day used in later practice for choosing times (muhūrta), such as rāhu kāla. They are not from BPHS and are labelled so.",
}

# ---- the visual dashboard (dashboard.html) ---------------------------------
DASH = {
  "birth": "The moment of birth described in the old calendar — the lunar day, weekday, Moon's star and so on — plus the extra rising points and calculated 'shadow' points the book uses.",
  "chart": "The birth chart drawn as a diagram, with a switch to show any divisional chart in the same frame. In the North Indian style the houses stay put and the signs move; in the South Indian style it is the other way round.",
  "planets": "Every planet at birth: its sign and degree, how strong or weak it is placed, whether it is moving backwards, which house it falls in under each house system, and its 'state'.",
  "houses": "The twelve houses: the sign on each, its owner and the planets in it, plus its image-point (ārūḍha), which signs look at it, and which planets intervene in its affairs.",
  "aspects": "Which planets look at which (and how strongly), and whether each pair are friends, neutrals or enemies in this chart.",
  "strength": "Each planet's six-fold strength from the book with all its parts, its capacity for agreeable and difficult results, its score across the divisional charts, and each house's strength.",
  "ashtakavarga": "The point-scores: each planet gives a point to a sign or not, by fixed rules. Higher totals mean a sign gives more support to whatever passes through it.",
  "vargas": "Where each planet falls in every divisional chart — the finer slicings of each sign, each read for one part of life.",
  "vargadiagrams": "The divisional charts drawn as diagrams, so you can see each one at a glance rather than as a table.",
  "vargaanalysis": "How consistently each planet is well or badly placed across all the divisional charts — a planet strong in many divisions counts for more.",
  "yogas": "The named combinations of planets found in this chart, with the rule for each. A combination is a theme the tradition names, not a promise.",
  "dashas": "The planet-period systems (Viṃśottarī, Aṣṭottarī and Yoginī): which planet rules which years of life, from birth to the end of each cycle, with the period running now marked.",
  "dashatree": "The main 120-year period system as a tree: open a main period to see its sub-periods, and open those for finer ones.",
  "transits": "Where the planets are on the chosen date, and which house of the birth chart each one is passing through.",
  "readings": "Short notes put together from the chart's data, each naming the rule it comes from. They describe the tradition's themes; they are not predictions.",
  "reliability": "How much the chart depends on the exact birth minute, how it would change under other ayanāṃśas or house systems, and how it was calculated.",
  "additional": "Any extra information the chart file holds beyond the usual layout, shown as it is.",
  "data": "Every value in the chart file, as a tree you can open branch by branch or search by name or value.",
}

# ---- the sample technical report (kundli-technical-report.html) -----------
TECH = {
  "The chart": "The sample chart drawn twice — the main chart and the navāṃśa — in both North and South Indian styles.",
  "Grahas": "Each planet's position, dignity and state.",
  "Bhāvas": "Each house's owner, occupants, class and point-score support.",
  "Ashtakavarga": "The point-scores each sign receives, overall and from each planet.",
  "Ṣoḍaśa varga": "Every planet's sign in all sixteen divisional charts, and how consistent they are.",
  "Yogas": "The named combinations found, and those checked and not found.",
  "Kārakas & ārūḍhas": "The significator planets and the image-points of the houses.",
  "Vimśottarī daśā": "The 120-year period sequence, the period running at the time of the report, and the sub-periods of one main period.",
  "Current sky": "Where the planets were on the date the report was made, and their close contacts with the chart.",
  "Method & provenance": "What was computed, by which method, and what is a traditional rule rather than a calculation.",
}
