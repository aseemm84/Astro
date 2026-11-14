# -*- coding: utf-8 -*-
"""Plain-language explanations, one per built page.

Every page on the site — web and desktop — opens with a box headed "Explain in
simple language". It is written for someone with no background in astronomy or
Jyotiṣa: what the page is, how to use it, how to read what it shows, and where
to be careful. build.py injects it and refuses to build if any page lacks one,
or if an entry here names a page that does not exist.

Rules for writing an entry:
  * no unexplained Sanskrit — a term appears with its meaning beside it;
  * describe what the page shows and how to use it; do not promise outcomes
    and do not rank one tradition or method above another;
  * keep "gist" to one sentence: it is visible even when the box is closed.

Each value is a dict: gist, what, how, read, and optionally care. HTML is
allowed (b, i, a). A page in Hindi carries lang="hi".
"""

PLAIN = {

"index.html": dict(
  gist="A free course in classical Indian astrology (Jyotiṣa), plus tools that compute charts and the sky — all inside your browser.",
  what="This is the front door. The site teaches the system described in an old Sanskrit book, <i>Bṛhat Parāśara Horā Śāstra</i> (BPHS), one topic at a time, and gives you tools that do the arithmetic for you.",
  how="If you are new, follow the path on this page from top to bottom: the planets first, then the signs, then the houses, and so on. If you only want a chart, open <b>Build a Kundli</b>. If you just want to know today's date in the Hindu calendar, open <b>Hindu time, now</b>.",
  read="Each card leads to one page. Every page has a box like this one at the top, so you can always get the simple version before the detail.",
  care="Nothing you type is sent anywhere — every calculation happens on your own device. The site explains a tradition; it does not make predictions about your life."),

"grahas.html": dict(
  gist="Meet the nine 'planets' of Indian astrology — what each one stands for and how they are grouped.",
  what="Jyotiṣa uses nine <i>grahas</i> (literally 'graspers'): the Sun, the Moon, Mars, Mercury, Jupiter, Venus, Saturn, and two invisible points, Rāhu and Ketu, where the Moon's path crosses the Sun's. This page describes each one: its nature, what it is said to represent, and how the tradition groups them (for example, naturally gentle or naturally harsh).",
  how="Read the profiles in order, or jump to one planet from the list on the side. Come back here whenever another page mentions a planet you have forgotten.",
  read="Think of each planet as a character with a personality. Later pages describe where that character is standing (the sign), which room it is in (the house) and how strong it is.",
  care="A planet called 'harsh' is not 'bad' for you. The book always judges a planet by many things together, never by its label alone."),

"dignity.html": dict(
  gist="How comfortable each planet is in each sign — 'at home', 'honoured', 'weak' — and which planets get on with which.",
  what="Every planet has signs where the tradition says it works best (its own sign, or its sign of 'exaltation') and a sign where it works worst ('debilitation'). Planets also have friends and enemies among themselves. This page lays all of that out, and adds what happens when a planet is too close to the Sun ('combust'), appears to move backwards ('retrograde'), or meets another planet head-on ('planetary war').",
  how="Use the tables as a reference. When a chart says a planet is 'exalted' or 'in an enemy's sign', look it up here.",
  read="Dignity is like a person's working conditions: the same person does better in a supportive office than a hostile one. It describes conditions, not destiny.",
  care="A weak placement can be offset by other factors, and the page explains the rules for that ('cancellation'). Never judge a chart from one planet's dignity alone."),

"rashis.html": dict(
  gist="The twelve zodiac signs, what each is like, and the simple groupings the rest of the system relies on.",
  what="The sky is divided into twelve equal parts called <i>rāśis</i> (signs): Aries, Taurus and so on. This page describes each sign and the ways they are grouped — fire, earth, air and water; 'moving', 'fixed' and 'dual'; odd and even.",
  how="Read it once from start to finish, then use it as a lookup. Many later rules say things like 'if the sign is movable…' — this is where you check which signs those are.",
  read="A sign is the setting a planet finds itself in. The same planet behaves differently in a fiery sign than in a watery one.",
  care="The signs here are 'sidereal' — measured against the stars — so they sit about 24° away from the signs used in Western newspaper horoscopes. Your sign here may be the one before the sign you are used to."),

"bhavas.html": dict(
  gist="The twelve 'houses' of a chart — which part of life each one stands for, and how to judge whether it is well supported.",
  what="A chart is divided into twelve <i>bhāvas</i> (houses). Each one stands for areas of life: the 1st for yourself, the 2nd for family and money, the 7th for partnership, the 10th for work, and so on. This page lists them and explains how the tradition judges whether a house is well supported.",
  how="Find the house you are curious about, read what it covers, then read the section on judging it: you look at its owner (the 'lord'), what sits inside it, and what looks at it.",
  read="A house is like a room in a building: what it is used for, who owns it, and who is in it all matter.",
  care="House meanings overlap, and the book never reads one house in isolation. A simple reading from one house can be badly misleading."),

"lagna.html": dict(
  gist="The 'rising sign' — the sign coming up over the eastern horizon at birth — and why the whole chart is built from it.",
  what="The <i>lagna</i> is the point of the zodiac rising in the east at the moment of birth. It becomes the 1st house, and every other house is counted from it. This page describes the twelve possible rising signs and some 'special' rising points the book also computes.",
  how="Read the twelve short descriptions, then the section on special ascendants if you want to go further.",
  read="The rising sign is the chart's starting point, a bit like 'you are here' on a map.",
  care="The rising sign changes about every two hours, so it needs an accurate birth time. A few minutes' error can change it if the birth was near a change."),

"vargas.html": dict(
  gist="The sixteen 'divisional charts' — finer charts made by cutting each sign into smaller slices, each used for one area of life.",
  what="Besides the main chart, the book builds sixteen <i>vargas</i> (divisional charts) by slicing every sign into 2, 3, 4… up to 60 pieces. Each one is read for a specific subject: the 9th division (navāṃśa) for marriage and inner strength, the 10th for career, and so on.",
  how="Start with 'How to read a divisional chart', then read only the divisions that interest you.",
  read="Think of the main chart as a map of a country and a divisional chart as a zoomed-in map of one city. You always look at the country first.",
  care="The finer the division, the more the birth time matters. The 60th division can change every few minutes, so treat it with great caution unless the birth time is very exact."),

"aspects.html": dict(
  gist="Which planets 'look at' which parts of the chart, and why that matters.",
  what="In Jyotiṣa a planet influences places it 'looks at' — this is called an aspect (<i>dṛṣṭi</i>). Every planet looks at the point opposite it; Mars, Jupiter and Saturn also look at some other places. There is a second system in which whole signs look at other signs. This page explains both and when each is used.",
  how="Read the planetary aspects first; they are used most often. Read the sign aspects when another page (for example the daśā or Jaimini material) says it is using them.",
  read="An aspect is like a glance across a room: the planet is not in that place, but it affects it.",
  care="The two systems give different answers. A good reading always says which one it is using."),

"strength.html": dict(
  gist="How the book measures each planet's strength with numbers, and what 'strong' and 'weak' mean here.",
  what="The book adds up six kinds of strength for each planet — from its position, direction, time of day, motion, nature and the aspects it receives — into one score called <i>Ṣaḍbala</i> ('six-fold strength'). It also measures the strength of each house, and how much good or difficulty a planet is able to give.",
  how="You do not need to compute any of this by hand: the Kundli pages do it. Use this page to understand what each number on those pages means.",
  read="A strength score is like a battery level: a strong planet has more capacity to deliver what it stands for, good or difficult.",
  care="Strength is one input, not a verdict. A strong planet is not automatically 'good', and a weak one not automatically 'bad'."),

"special-points.html": dict(
  gist="Extra calculated points the book uses — 'image' points, 'interventions' and the planet that represents the soul.",
  what="Beyond the planets, the book computes some points from them: <i>Ārūḍha</i> points (how a part of life appears to others), <i>Argala</i> ('interventions' that help or block a house), and <i>Kārakas</i> (planets ranked by how far they are through their sign, the first of which is said to represent the self).",
  how="Read one section at a time. These ideas build on the houses and the signs, so read those pages first.",
  read="The image points are about appearance and reputation; the houses themselves are about substance. The two can differ, and that difference is part of the reading.",
  care="Several of these techniques are associated with a second school (Jaimini). The page says which school each one comes from."),

"yogas.html": dict(
  gist="The named planetary combinations ('yogas') of the book — what forms each one and what it is traditionally said to indicate.",
  what="A <i>yoga</i> is a particular arrangement of planets that the book gives a name and a meaning — for example a combination said to support status, or one said to support wealth. This page catalogues them with the exact conditions for each.",
  how="Look up a yoga by name, or read a whole group. The Kundli page lists which ones it finds in a chart; this page tells you what each means.",
  read="Read a yoga as a theme the chart contains, not a promise. The book itself says its result depends on the strength of the planets involved and on whether the right time period is running.",
  care="Many yogas are found in many charts. A named yoga on its own guarantees nothing — read the 'judging checklist' at the end of the page."),

"avasthas-longevity.html": dict(
  gist="The 'states' a planet can be in, and how the book discusses length of life — presented as history, with care.",
  what="An <i>avasthā</i> is a state a planet is said to be in, such as 'childhood', 'youth' or 'old age' depending on its position. The page also explains what the book says about longevity and about 'maraka' (literally 'killer') planets.",
  how="Read the avasthā section freely; it is about the condition of planets. Read the longevity sections as an account of what an old text says.",
  read="The states describe how fully a planet can act, like a person who is asleep, awake or tired.",
  care="This site never calculates a lifespan or a time of death for anyone. Those rules are explained as doctrine only. Please do not use astrology for health or life-and-death decisions — speak to a qualified professional."),

"dashas.html": dict(
  gist="The 'periods' of life the book describes — which planet rules which years — and how they are worked out.",
  what="A <i>daśā</i> is a period of years ruled by one planet. The most used system, Viṃśottarī, gives a 120-year cycle that starts from where the Moon was at birth. The book describes many other period systems too; this page explains them and shows how to calculate them.",
  how="Read the Viṃśottarī section and its worked example first. The Kundli page calculates your periods automatically; this page shows how it does it.",
  read="A period is like a chapter of life with a leading character. What that chapter is like depends on how that planet stands in the chart, not on the planet's name alone.",
  care="No period is 'always good' or 'always bad'. The book reads every period through the planet's strength, position and the houses it owns."),

"ashtakavarga.html": dict(
  gist="A point-scoring method that shows how much support each sign gets from the planets.",
  what="<i>Aṣṭakavarga</i> ('eight-fold division') gives each sign a score: each planet, and the rising sign, either gives a point to a sign or does not. The totals show which signs are well supported in a chart. It is often used to judge how a planet's movement through the sky (a transit) will feel for that chart.",
  how="Read how the points are given, then the 'reading thresholds' — the numbers the tradition treats as high or low. The Kundli page computes the grids for you.",
  read="Higher numbers mean more support. A planet passing through a sign with many points is traditionally read as easier than one passing through a sign with few.",
  care="These are traditional tallies, not measurements of your life. Use them as one input among many."),

"now.html": dict(
  gist="Today's date in the Hindu calendar — the lunar day, the star, and other parts of the day — for any place you choose.",
  what="The traditional Hindu calendar (<i>pañcāṅga</i>, 'five limbs') describes each day with five things: the lunar day (tithi), the weekday (vāra), the Moon's star (nakṣatra), and two more combinations of the Sun and Moon (yoga and karaṇa). This page shows them as they stand right now.",
  how="Choose your place — it matters, because the day starts at your local sunrise. The page then shows the five limbs, when each one ends, and the lunar days on either side of today. <b>Strip spans</b> sets how many days the time strip covers, and <b>Sunrise is</b> chooses how sunrise is defined (top edge of the Sun or its centre). <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for this page; it changes the names of the star, yoga and solar month, not the lunar day.",
  read="Each limb has a name and an end time. If something ends at 14:20, the next one begins then. The strip shows how the lunar days line up with ordinary dates.",
  care="Two people in different cities can have different lunar dates on the same calendar day. That is expected, not an error."),

"calendar.html": dict(
  gist="A month-by-month Hindu calendar for any place and any year from 1800 to 2200, with festivals and the rule behind each one.",
  what="Each square is one day, showing its lunar day, star and other details, plus any festival that falls on it. Unlike a printed almanac, every festival comes with the rule that places it, so you can see why it falls on that date.",
  how="Pick your place, month and year, and step with <b>Previous month</b>, <b>Next month</b> or <b>Today</b>. Click any day to open it. <b>Detail</b> shows more or less in each square, and the ticks (lunar day, star, Moon phase, festivals, end times, sunrise and so on) choose exactly what appears. Below that you can choose how months are counted (ending at full moon or at new moon — both are used in India), the era used for year numbers, how end times are shown, and how sunrise is defined. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another one just for this calendar; it changes star and solar-month names, not lunar days. You can <b>Print this month</b> or <b>Download the year as .ics</b> into your phone's calendar.",
  read="If a festival looks a day off from what you expected, check the place — festival dates depend on the lunar day at local sunrise, which differs from city to city.",
  care="Different communities follow different conventions, and the page shows both month systems so you can match the one you follow."),

"studio.html": dict(
  gist="Ideas for social-media posts about today's sky — with a ready caption, the facts behind it, and an image.",
  what="This page looks at the sky for today and your place, picks out what is genuinely happening (a full moon, a planet changing sign, a festival), and gives you a caption, the numbers behind it, and an image or short video to post.",
  how="Choose a date, a place and a language. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for the studio. Pick an item from 'What is worth posting', then <b>Copy caption</b> or <b>Make the image</b> (the <b>Image</b> menu chooses its shape). <b>Build today's pack</b> makes the whole day's set as one .zip. <b>Open it in the composer</b> lets you build your own slides — add, move or remove slides and pieces, edit the text, then download one slide or all of them. 'Look ahead' and <b>Plan the next 30 days</b> show what is coming.",
  read="Each item states the fact it is based on and when it happens, so you can check it before you post.",
  care="Captions describe the sky; they do not make predictions about anyone. Nothing is uploaded — images are made on your own device."),

"studio-pro.html": dict(
  gist="Pick any calculations from the site and it turns them into an animation you can record.",
  what="Every number the site computes — a planet's position, a lunar day, the gap between two planets — appears here as a tile on a 'wall'. Choose one or more tiles and the stage draws them as an animation, choosing a picture that suits what you picked.",
  how="Type what you want into 'Say what you want', or click tiles on the wall. Press <b>Play</b> to watch, choose a shape (tall for reels, square for posts), then <b>Record the reel</b>. 'Take control' lets you adjust each layer yourself. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for Studio Pro; it changes signs, nakṣatras and festival dates, not the Moon's phase or tithis.",
  read="If a picture cannot use something you selected, the page tells you rather than silently leaving it out.",
  care="Recording happens on your own device and takes about as long as the video. Nothing is uploaded."),

"reel.html": dict(
  gist="Short videos that answer one question about the sky — for example 'when does Jupiter change sign?' — drawn from real calculations.",
  what="Each 'story' is a question. The page computes the answer over the time span you choose and turns it into a short video with captions. If the span contains four events, the video shows four; if it contains none, the page says so.",
  how="Pick a story, set the starting date, the number of years and the length of the video, then press <b>Play</b> to preview and <b>Record</b> to save it. You can add your own voice recording and copy a ready caption. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for Reel Studio; it changes signs, nakṣatras and festival dates in the reels.",
  read="'What was found' lists every event the video shows, with dates, so you can check them.",
  care="Some stories (festivals, sunrise-based ones) depend on the place; the video prints the place it was made for."),

"director-pro.html": dict(
  gist="A full animation editor: build a video scene by scene, and control how every element moves over time.",
  what="This is the advanced version of Studio Pro. You build scenes out of layers (a planet, a ring, a caption), and each property of each layer — position, size, colour — can be set to change over time using 'keyframes'.",
  how="Start by typing what you want and pressing <b>Make it</b> (or <b>Surprise me</b>, or click one of the ready examples), or add items from the library to a scene. Select a layer and use the inspector to set its keyframes. Press <b>Play</b> to preview and use Export to save the video. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for Director Pro.",
  read="Everything that moves on screen moves only because of the keyframes you can see — there are no hidden animations.",
  care="This page is for people who want precise control. If you just want a quick video, Studio Pro or Reel Studio is easier."),

"siddhanta.html": dict(
  gist="The sky computed the way an ancient Indian astronomy text (the Sūrya Siddhānta) does it, set side by side with a modern computation.",
  what="Long before telescopes, Indian astronomers computed planetary positions from a book of numbers and rules — the <i>Sūrya Siddhānta</i>. This page runs those rules exactly, shows every step, and puts the result next to a modern computation so you can see both.",
  how="Choose a moment under 'The two skies' to see both sets of positions. Pick a planet under 'The working' to see the steps; the <b>Anomaly</b> slider and <b>Sweep</b> show how the correction changes around the orbit. Two menus let you choose the text's own table of 24 sines or a modern sine, and whether to apply the text's back-and-forth motion of the ayanāṃśa. For the calendar and eclipses, set a <b>From</b> and <b>To</b> range. Three buttons switch the engine between <b>The text as written</b>, <b>The fitted tier</b> and <b>Varāhamihira's Saura</b>; in the sandbox the sliders adjust the text's constants, and <b>Fit this graha for me</b> finds values that bring it closest to the modern sky. <b>Ayanāṃśa for this page</b> sets the frame of the modern column: it starts on Lahiri, the frame these comparisons are usually drawn in, and you can pick any other. The Siddhānta's own column never changes. 'In plain words' near the top explains the three versions and the technical terms. Settings → Engine can make the Sūrya Siddhānta the engine for every page.",
  read="The two columns are two different methods. Where they agree, they agree; where they differ, the page shows by how much. Neither column is presented as the right one.",
  care="All other pages of the site use the modern computation; this page is here to show the classical one in its own terms."),

"engine-lab.html": dict(
  gist="Ask the same question — 'where is the Moon?', 'what lunar day is it?' — of three different calculating methods and compare their answers.",
  what="The site has a modern astronomical engine, a classical one (the Sūrya Siddhānta), a version of the classical one with adjusted constants, and Kālasetu, which keeps the classical count of time with a modern geometry and holds across 5000 BCE – 3600 CE. This page asks all four the same question and shows their answers side by side, and how often they agree over a span of years.",
  how="Choose a question, a moment and a place (or press <b>This moment</b>) and the three engines answer side by side. To see agreement over time, set a <b>From</b> and <b>To</b> year and a number of <b>Samples</b>, then press <b>Measure the agreement</b>. The <b>Error in longitude</b> slider shows what an error of that size would change in a chart, and the <b>Year</b> slider shows how confident the modern engine is in that century. <b>Ayanāṃśa for this page</b> sets the modern engine's frame: Lahiri by default, because the fitted engine was fitted in it; choose another and the page says how much of each difference comes from the change of frame. Start with 'The three engines, in plain words' for what modern, fitted and as written mean. <b>Engine</b> in Settings makes any of the three the engine for the whole site.",
  read="Agreement is shown as a percentage or a difference in degrees. A small difference in degrees can still change a lunar day or a star near a boundary.",
  care="The differences between methods are differences of method, shown as they are; the page does not rank them."),

"kalasetu.html": dict(
  gist="The site's fourth way of calculating where the planets are — one that stays accurate for any date from 5000 BCE to 3600 CE.",
  what="Kālasetu keeps the old Indian text's way of counting days and carries a modern understanding of the planets' orbits on it. It was tuned against the modern computation across seven thousand two hundred years, and this page shows it working: where it puts each planet on any day, every step of one calculation, and how close it comes, century by century.",
  how="Set an <b>Era</b>, <b>Year</b>, <b>Month</b>, <b>Day</b> and <b>Time</b> (or press one of the preset dates) and the nine planets are placed, beside the modern answer. Choose a <b>Graha</b> under 'How one longitude is made' to follow its calculation. Under 'How close', pick a planet for its error century by century, or set <b>From</b>, <b>To</b> and <b>Moments</b> and press <b>Measure</b> to test it yourself against the older fitted engine. Untick a group of the Moon's terms to see how much worse the Moon gets without it. Settings → Engine, or the Engine menu on Kundli, makes Kālasetu the engine for your charts.",
  read="Differences are in arcminutes (′), sixtieths of a degree. For scale, a nakṣatra quarter (pāda) is 200′; anything under a few arcminutes changes nothing a chart is read in.",
  care="It is compared with the modern computation, which is itself checked against the real sky only from 1000 to 3000 CE. For the distant past both are calculations, not observations."),

"simulation.html": dict(
  gist="'What if?' experiments with the Sun, Earth and Moon — change one thing and watch what physics does next.",
  what="Take the real Earth, Moon and Sun at a moment you choose, change one thing (stop the Moon, halve its distance…), and the page calculates what gravity would do from there.",
  how="Choose a counterfactual from the list, choose the starting moment and how long the playback should last, and press <b>Play</b>. <b>Pause</b> stops it, and the scrub slider moves through the run by hand.",
  read="Every path drawn is calculated step by step from gravity, not scripted — so the result can genuinely surprise you.",
  care="This is a physics toy for curiosity and teaching. It is not about astrology and it does not describe anything that is going to happen."),

"404.html": dict(
  gist="The page you asked for does not exist on this site — the links below go to the pages people usually want.",
  what="This appears when an address is mistyped or a link is out of date.",
  how="Use one of the links below, or the menu at the top, to get back to the site.",
  read="If you are offline, pages you have opened before may still work.",
  care=None),

"accuracy.html": dict(
  gist="How accurate the site's calculations are, measured against an independent professional standard.",
  what="This page reports how close the site's planetary positions are to a professional reference calculation, how much that tiny difference could ever change a chart, and how much bigger the differences between astrological conventions are.",
  how="Read 'The short answer' first. The charts below it show the measurements in detail for anyone who wants them.",
  read="The key point: the calculation itself is accurate to a tiny fraction of a degree. The choices astrologers make — such as which starting point for the zodiac to use — change results far more than any calculation error does.",
  care="Accuracy here means the positions in the sky. It says nothing about whether any astrological interpretation is true."),

"ecliptic.html": dict(
  gist="A live wheel of the zodiac showing where every planet is, for any moment — and you can play time forwards or backwards.",
  what="The circle is the Sun's yearly path through the stars, divided into twelve signs and twenty-seven stars (nakṣatras). The nine planets are drawn at their real positions for the date, time and place you choose.",
  how="Set a date, time and place (or press <b>This moment</b>). Choose a span and a speed and press <b>Play</b> to watch the planets move; <b>To the start</b>, <b>To the target</b>, <b>−1 step</b>, <b>+1 step</b> and the position slider let you move by hand. The ticks choose what is drawn — stars and quarters, degrees, retrograde marks, speed arrows, each planet — and the menus add a divisional chart, aspects, a tilt and trails. <b>Ayanāṁśa</b> and <b>Palette</b> change the zodiac's starting point and the colours for this wheel.",
  read="Planets move anticlockwise around the wheel. When a planet seems to go backwards, that is retrograde motion — an effect of watching from a moving Earth.",
  care="No birth details are needed and nothing is stored; this shows the sky itself."),

"divisions.html": dict(
  gist="How the zodiac circle is cut into 12 signs, 27 stars and 108 quarter-stars — all on one wheel.",
  what="The same 360° circle is divided three ways: twelve signs of 30°, twenty-seven nakṣatras (lunar mansions) of 13°20′, and 108 <i>pādas</i> (quarters) of 3°20′. The page shows how these line up, and why a quarter-star is the same slice as the 9th divisional chart (navāṃśa).",
  how="Drag the <b>Longitude</b> slider, or press <b>Where the Moon is now</b>, and watch which sign, star and quarter that point falls in. Use <b>Colour by</b> to see the groupings. Further down, set a <b>Moment</b> and <b>Place</b> (or press <b>This moment</b>) to see where every planet stands in all three divisions.",
  read="Every point on the circle belongs to one sign, one star and one quarter at once.",
  care=None),

"graha-lab.html": dict(
  gist="One picture of every planet's strong and weak places across the whole zodiac, plus how fast each one really moves.",
  what="For each of the seven visible planets, a band shows where in the zodiac the tradition calls it exalted, at home, friendly, or weak. Below, each planet is described and its real speed measured.",
  how="Move the <b>Longitude</b> slider to see each planet's condition at that point, or press <b>Put the grahas where they are now</b>. Set a <b>Moment</b> and <b>Place</b> (or press <b>This moment</b>) to change 'now' to any date.",
  read="Colours along each band show the planet's condition from sign to sign; the marker shows where it actually is.",
  care="Rāhu and Ketu are not part of this scheme in the book, so they are described separately."),

"bhava-systems.html": dict(
  gist="Three ways of dividing a chart into houses, drawn on one circle, and exactly which planets they disagree about.",
  what="There is more than one way to draw the twelve houses. 'Whole sign' makes each sign one house; 'equal' starts at the exact rising degree and steps 30° at a time; 'Śrīpati' uses the horizon and the highest point of the sky, so its houses come out unequal. This page draws all three for any moment and place.",
  how="Choose a moment and place, or press <b>This moment</b>. Tick or untick <b>whole sign</b>, <b>equal</b> and <b>Śrīpati</b> to show or hide each ring of houses on the wheel, and <b>Grahas</b> to show the planets. The table lists any planet that lands in a different house under different systems. The <b>Latitude</b> slider shows how distance from the equator makes Śrīpati houses unequal.",
  read="If a planet is in the 10th house in one system and the 11th in another, both statements are correct within their own system — the page shows which system is which.",
  care="The Kundli page lets you choose the house system; this page helps you understand the choice."),

"ayanamsa.html": dict(
  gist="Why Indian and Western astrology put the zodiac in slightly different places, and the different conventions for that gap.",
  what="Western astrology starts the zodiac at the spring equinox (a season point); Indian astrology starts it from the stars. Because the equinox slowly drifts against the stars, the gap between the two — the <i>ayanāṃśa</i> — grows by about 1° every 72 years. Astrologers use different values for it, and this page shows nineteen of them.",
  how="Start at 'Start here' and read down. Drag the <b>Year</b> slider to watch the gap grow, and pick a <b>Definition</b> to follow one convention. Set a <b>Moment</b> and <b>Place</b> (or press <b>This moment</b>) to see a chart move as you change the ayanāṃśa. The sliders in 'The equation' change each part of the formula. In 'Pinned to a star' you can choose a star and a degree and press <b>Use this pin</b>. 'Make your own' lets you set your own values and <b>Register it with the engine</b>, so the whole site uses it until you leave (<b>Remove it</b> undoes this). At the end you can choose a shape and a card, then <b>Download the card</b> or <b>Render the film</b>.",
  read="Today the gap is about 24°. Choosing a different convention can shift every planet by up to a few degrees, which sometimes changes a sign or a star.",
  care="These are conventions, not errors — there is no single correct value, and the page does not choose one for you."),

"starwheel.html": dict(
  gist="The whole sky for any day and place drawn as a disc, with that day's Hindu calendar underneath.",
  what="The wheel shows the zodiac, the stars and the planets as they stand for the day and time you pick, and below it the day's five calendar limbs, sunrise and sunset, and the lunar day in detail.",
  how="Pick a day, a time (sunrise, noon, sunset, midnight or your own) and a place, and use <b>−1 day</b>, <b>+1 day</b> and <b>Today</b> to step through. The ticks show or hide the planets, the stars that name each nakṣatra (and lines joining them), and planet surfaces. <b>Ayanāṁśa</b> follows the site setting unless you pick another one just for this page, and <b>Palette</b> changes the colours. At the bottom, choose a shape, colours, a headline and what the card includes, then <b>Download the card</b> or <b>Copy the caption</b>.",
  read="The disc is tilted to look like the sky seen from your place; the strip beneath gives the same day in calendar terms.",
  care=None),

"credits.html": dict(
  gist="The software, data and books this site is built with, and the licences they come under.",
  what="This page lists every outside component the site uses (for example the astronomy library and the city list), what each does, and its licence, along with the texts the site works from.",
  how="Read it if you want to know where something comes from, or to reuse part of the site.",
  read="Each entry names the author, what the component does here, and its terms.",
  care="The site gives no guarantee about astrological interpretations — see the last section."),

"kundli.html": dict(
  gist="Make your birth chart (kundli): enter your date, time and place of birth, and the page calculates everything.",
  what="A <i>kundli</i> (janma kuṇḍalī) is a map of the sky at the moment you were born. This page calculates it — planets, signs, houses, strengths, periods and much more — entirely on your device.",
  how="Type your date of birth, your time of birth in 24-hour form (for example 13:31 for 1:31 pm), and search for your birth city (or pick from the short list, or type latitude, longitude and UTC offset yourself). Press <b>Cast the chart</b>. The location and clock buttons fill in your current place or time, <b>Clear</b> empties the form, and <b>Open saved chart</b> loads a chart file you saved before. The three menus under the form set the house system, the ayanāṃśa and the type of lunar node. The tabs that appear (Kuṇḍalī, Daśā, Bala and so on) each show one part of the chart; you can print, save or copy a link to it. Without any birth details, <b>Watch the sky</b> shows the current sky, the Gochara tab computes a year of planetary movements (<b>Compute the year</b>; tick the box to include the Moon), and the Rāśiphala tab reads that year for any Moon sign you choose. The <b>Engine</b> menu chooses whether the planets are placed by the modern ephemeris or by the Sūrya Siddhānta (as written, or fitted to the modern sky).",
  read="Begin with the chart picture and the planet table, then the Daśā tab for life periods. Every tab has its own explanation. Settings change the conventions used: the defaults are the Samanvaya–Ecliptic ayanāṃśa (where the zodiac starts) and Śrīpati houses (houses drawn from the horizon); Lahiri and whole-sign houses are one click away.",
  care="An accurate birth time matters: some results change within minutes. Nothing you type leaves your device. The chart describes a tradition; please do not base medical, legal, financial or safety decisions on it."),

"kinetic-workstation.html": dict(
  gist="Everything about one birth chart on a single screen — the chart, a year of planetary movements, divisional charts, strengths and periods.",
  what="This is the 'all in one place' view of the Kundli page. You enter the same birth details, and instead of separate pages everything sits on one working surface with tabs along the top.",
  how="Enter date, time and place and press <b>Cast the chart</b>, or press <b>Watch the sky</b> to see the current sky without any birth details. The three menus set the house system, ayanāṃśa and node type; <b>Edit</b> reopens the form and <b>New chart</b> starts again. Use the tabs (Kuṇḍalī, Gochara, Rāśiphala, Gaṇita, Chalita, Ayanāṃśa, Varga, Daśā, Bala, Pūrṇa, Aṣṭaka) to move between views. <b>Print</b> prints the report and <b>Super-JSON</b> downloads all of the chart's data as one file.",
  read="'Gochara' means the planets' movement over a year compared with your chart; 'Varga' is the divisional charts; 'Daśā' is the life periods; 'Bala' is strength.",
  care="Results that depend on exact birth time (house boundaries, fine divisional charts) should be read with care if the time is uncertain."),

"motion.html": dict(
  gist="Animated scenes about the sky itself — a year of planetary movements, a lunar month, an eclipse season — no birth chart needed.",
  what="These are short animations, each about one thing that happens in the sky, drawn from the same calculations as the chart pages. Some extra scenes need a birth chart; the page marks those.",
  how="Wait for the scenes to load, pick one, and press <b>Play</b>. Each scene uses your current place and the current moment unless you change them. Scenes marked 'needs your chart' use the chart you last cast on the Kundli page; cast one there first to unlock them. <b>Ayanāṃśa for this page</b> follows the site setting unless you pick another just for Motion; scenes drawn from your chart keep the chart's own setting.",
  read="Each scene states what it shows and over what time span.",
  care=None),

"ceremony.html": dict(
  gist="A short animation that winds the nine planets back to a chosen moment — such as a birth — and settles them where they stood.",
  what="The planets spin back through time and come to rest on the ring of 27 stars at the positions they held at the moment you choose. You can turn and tilt the view.",
  how="Enter a date and time (or press <b>Now</b>, or <b>My chart's moment</b> to use your saved chart) and press <b>Run the ceremony</b>. To keep it, tick <b>Record it while it runs</b>, choose a shape, run it, then press <b>Save the recording</b>.",
  read="Each planet's final resting place is its real position at that moment.",
  care="It is a visual for enjoyment and sharing; the full details of a chart are on the Kundli page."),

"dashboard.html": dict(
  gist="A visual dashboard of the birth chart you saved on the Kundli page — charts, tables and graphs on one screen.",
  what="This page draws the chart you last saved on the Kundli page as a set of cards: the chart diagrams, planet table, strengths, periods and other graphs.",
  how="First cast and save a chart on the Kundli page. Then open this page and it loads that chart. The settings panel can re-calculate it with a different ayanāṃśa or house system.",
  read="Each card covers one part of the chart. Hover over or tap the graphs for exact values.",
  care="The chart is stored only in this browser on this device."),

"kundli-technical-report.html": dict(
  gist="A complete, printable technical report of one sample birth chart, showing every layer the engine computes.",
  what="This is an example of the full technical report: planet positions, houses, divisional charts, point tallies, yogas, kārakas, periods and the sky at the time the report was made — every layer in one long document.",
  how="Read it top to bottom, or jump to a section from the headings. To get the same report for your own chart, cast it on the Kundli page and use print or download.",
  read="Each section starts with a short line saying what it shows. The last section explains which figures are computed and which are traditional rules.",
  care="This report is a sample for a particular chart; it is not about you."),

"108-nakshatra-padas.html": dict(
  gist="All 108 quarter-stars (pādas) of the zodiac, what each one is associated with, and how each planet is said to behave there.",
  what="The zodiac has 27 stars (nakṣatras), each split into four quarters — 108 in all. For each quarter this page lists its divisional sign, ruling planet, presiding deity, symbol, temperament (gana) and naming syllable, and then how each of the nine planets is traditionally described when it sits in that quarter.",
  how="Use the search box or the filters (ruling planet, temperament, navāṃśa sign, house) to find a quarter; tick <b>Vargottama only</b> to see the quarters whose navāṃśa sign matches their own sign, and press <b>Reset</b> to clear the filters. The planet buttons (<b>All 9</b>, Sun, Moon…) mark where those planets of your saved chart sit; <b>Hide</b> removes the marks. Cast your chart on the Kundli page first for these marks to appear.",
  read="Read each description as a traditional association, a theme to consider alongside the rest of the chart.",
  care="These descriptions are tendencies from tradition, not predictions."),

"108-nakshatra-padas-hindi.html": dict(
  lang="hi",
  gist="राशिचक्र के सभी 108 नक्षत्र पाद, प्रत्येक की विशेषताएँ, और उसमें स्थित होने पर प्रत्येक ग्रह की पारंपरिक प्रवृत्ति।",
  what="राशिचक्र में 27 नक्षत्र हैं और प्रत्येक के चार पाद — कुल 108। प्रत्येक पाद के लिए यह पृष्ठ उसका नवांश, स्वामी ग्रह, देवता, प्रतीक, गण और नामाक्षर बताता है, और फिर यह कि नौ ग्रहों में से प्रत्येक उस पाद में होने पर परंपरा के अनुसार कैसा माना जाता है।",
  how="खोज-पेटी या फ़िल्टर (विंशोत्तरी स्वामी, गण, नवांश राशि, भाव) से कोई पाद ढूँढें। <b>केवल वर्गोत्तम</b> पर टिक करने से वे पाद दिखते हैं जिनकी नवांश राशि उनकी अपनी राशि ही है; <b>रीसेट</b> सारे फ़िल्टर हटा देता है। ग्रहों के बटन (<b>सभी 9</b>, सूर्य, चंद्र…) आपकी सहेजी कुण्डली के ग्रहों के पाद चिह्नित करते हैं, और <b>छिपाएँ</b> चिह्न हटा देता है। इसके लिए पहले कुण्डली पृष्ठ पर अपनी कुण्डली बनाएँ।",
  read="प्रत्येक विवरण को पारंपरिक संकेत के रूप में पढ़ें — पूरी कुण्डली के साथ विचार करने योग्य एक विषय।",
  care="ये विवरण परंपरा की प्रवृत्तियाँ हैं, भविष्यवाणियाँ नहीं।"),

}
