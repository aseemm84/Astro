/* ============================================================================
   "How to read this" — a short note beside each scene, on the page.

   It lives in the DOM and never on the canvas, which matters: the canvas is what
   a screen recording captures, what the PNG button exports and what studio mode
   blows up to fill the display. A caption burnt into the frame would follow the
   clip to Instagram, where it is clutter. This note is for the person at the
   keyboard working out what they are looking at, so it stays on the page and
   disappears the moment studio mode starts.

   Three or four lines each. The first says what is on screen, the rest say what
   to watch and which control changes it.
   ============================================================================ */
var MO_READ={

retro:[
 "Set a window with <b>From</b> and <b>Span</b>, and every retrograde of the chosen graha inside it is found. The bar along the foot is that window with each one marked; the playhead takes them in turn, one loop per slot.",
 "Within a loop: the faint line is the whole path, the bright head is where the graha stands, and the two gold dots are the stations where it turns back and resumes.",
 "Nothing actually reverses. The loop appears because Earth overtakes the graha on the inside, so its direction <em>against the stars</em> turns around for a few weeks. The latitude on the vertical axis is why it is a loop and not a straight retrace.",
 "If the window holds none, the frame says so and gives the date of the next one — Guru and Śani turn about once a year, Maṅgala only about every 26 months."
],
gochara:[
 "The outer ring is where the slow grahas stand at the playhead. The inner ring is your natal chart, fixed.",
 "Watch the moment a transiting graha crosses into a new natal house — that crossing is what gochara timing is built on.",
 "<b>R</b> marks a graha running retrograde. <b>Span</b> sets how far forward the run goes."
],
orrery:[
 "The ring is the ecliptic seen from an angle. Each graha is lifted off it by its true ecliptic latitude.",
 "Only Sūrya sits exactly on the plane — the ecliptic is its path by definition. Everything else passes above or below, which is why two grahas at the same longitude are rarely in the same place in the sky.",
 "<b>Latitude ×</b> exaggerates the lift. At ×1 it is true to scale and almost invisible, which is the honest answer."
],
birthsky:[
 "The sky over your birthplace at your birth moment, with the ecliptic arcing across it.",
 "The dome darkens as the Sun goes down, so you can see which grahas were genuinely above the horizon and visible, and which were under your feet.",
 "<b>lagna rising</b> marks the east point. <b>Span</b> is centred on the birth moment, so you can run backwards and forwards from it."
],
nakshatra:[
 "A strip of the ecliptic that pulls in from the whole circle down to a single nakṣatra.",
 "The named divisions are the 27 nakṣatras; the dots are the real stars near the ecliptic, sized by magnitude.",
 "It shows the star group each nakṣatra is named after — and that the division and the stars do not always sit on top of one another."
],
frames:[
 "The rāśi ring never moves. It is fixed to the stars, and this is the point of the scene: what turns is the lagna, and the bhāvas with it.",
 "Across one sidereal day the lagna makes exactly one circuit. Whole-sign bhāvas step a whole rāśi at a time; cusps measured from the lagna slide continuously.",
 "<b>Houses</b> switches between the two conventions, or shows both together."
],
ayanamsa:[
 "Two zero points for the same zodiac: the sidereal one fixed to the stars, the tropical one tied to the equinox.",
 "The equinox drifts about 50″ a year, so the gap between them opens steadily. That gap <em>is</em> the ayanāṃśa.",
 "The run covers 500 BCE to 3500 CE. The two zero points coincided in the early centuries CE, which is why the value is near zero there."
],
drishti:[
 "The chosen graha's dṛṣṭi, swept out to the rāśis it looks at.",
 "Every graha aspects the 7th from itself. Maṅgala adds the 4th and 8th, Guru the 5th and 9th, Śani the 3rd and 10th.",
 "<b>Graha</b> chooses whose glance is drawn; <b>Span</b> is how far it travels while you watch."
],
tithi:[
 "A tithi is not a day. It is 12° of Candra's gain on Sūrya, and this is that angle drawn as a dial.",
 "The disc beside the dial is Candra lit by the very same angle, so you can see the phase and the tithi are one fact, not two.",
 "One synodic month runs new Moon to new Moon: thirty tithis, of noticeably unequal length."
],
dasha:[
 "The whole 120-year Viṃśottarī cycle from your birth, each mahādaśā a band in its lord's colour.",
 "The inner band is the antardaśā running inside the current mahādaśā.",
 "The chart turns underneath, so you can see which bhāva each daśā lord occupies as its period comes round."
],
panchanga:[
 "Five rings, outside in: nakṣatra 27, yoga 27, tithi 30, karaṇa 60, vāra 7. Above them, the lunar month, season and half-year.",
 "In each ring the lit wedge is the division the moment falls in, and the brighter sliver inside it is how far through that division you are. The centre reads it off as “TITHI 16 of 30”.",
 "Only the nakṣatra ring is a ring of longitude — the other four are dials of their own count. Sūrya and Candra ride the rim because every limb but the vāra comes from those two longitudes.",
 "The vāra follows the civil date here, as the Overview tab does, not sunrise to sunrise."
],
tilt:[
 "The flat ring is the ecliptic. The tilted one is Candra's orbit, inclined 5.1° to it; they cross at Rāhu and Ketu.",
 "<b>The zodiac band</b> outside them carries the twelve rāśi spokes and, at the fuller setting, the twenty-seven nakṣatra ticks. The arc each of <b>Sūrya, Candra, Rāhu and Ketu</b> stands in is lit in that body's colour — the wide faint arc is its rāśi, the narrow bright one its nakṣatra — with a stub joining it to the ring so it cannot be mistaken for a neighbour's. Rāśi names are printed on the near half only; on the far half the ellipse squeezes the spokes together and they would overprint.",
 "The readout under the verdict gives the same four in words, with the degree in the rāśi and the pāda in the nakṣatra. It is there because at a new moon Sūrya and Candra sit within a degree of each other, and two labels on the band would land on top of one another.",
 "The coloured dropline is how far Candra stands above or below the plane. The dashed rails are the shadow corridor — inside it an eclipse can happen, outside it the shadow misses.",
 "The wave along the foot is that height across the whole span, with every new and full moon marked on it. The gold marks are the eclipses, and they are exactly the ones near zero.",
 "<b>Latitude ×</b> exaggerates the tilt. At ×1 it is true to scale and nearly invisible, which is why most months pass without an eclipse."
],
eclipseseason:[
 "The nodal axis is the slow hand of this clock. The bands around each node are the windows where an eclipse is geometrically possible.",
 "An eclipse happens when Sūrya walks into one of those bands — which it does twice a year. That is an eclipse season.",
 "The dashed line is where the axis stood at the start, so you can watch it retreat about 19.3° a year. The strip at the foot marks every eclipse in the span: solar above the line, lunar below.",
 "For <em>why</em> a new moon away from the nodes does nothing, see <b>Tilt &amp; nodes</b>."
],
eclipse:[
 "Each eclipse ahead in turn, with the discs drawn at the type and depth the engine computes — total, annular, partial, penumbral.",
 "The figure beside each is its distance from the node. It is never more than about 18°, and that single constraint is why eclipses are rare.",
 "<b>How many</b> sets the count of each kind, so 10 gives twenty events in all."
],
astanga:[
 "Each graha's distance from Sūrya, with its own combustion orb drawn as a dashed line — 17° for Maṅgala, 10° for Śukra, and so on for the rest.",
 "A graha inside its orb is astaṅgata: lost in the glare, and classically treated as weakened however well placed it otherwise is.",
 "Watch them enter and leave as the span runs. <b>Span</b> sets how much time passes."
],
dignity:[
 "One graha walked through all twelve rāśis, with its dignity named at each stop — exalted, moolatrikona, own sign, friendly, neutral, inimical, debilitated.",
 "Nothing about the graha changes. The only thing that changes is the sign it is standing in, which is the whole idea of dignity.",
 "<b>Graha</b> chooses which one is walked."
],
sadesati:[
 "Śani's path measured against your natal Candra, across ninety years from birth.",
 "Sade Sati is the stretch where Śani occupies the 12th, 1st or 2nd from Candra — about seven and a half years, returning roughly every twenty-nine.",
 "Ages are marked along the way, so you can see which parts of a life each pass covers."
],
lagna:[
 "The eastern horizon at your chart's own place. The arc is the ecliptic; the beam marks the point of it standing on the horizon, and that point is the lagna.",
 "The degree ticks over continuously while the rāśi changes in jumps. The grahas are drawn where they actually stood — faint when they were below the horizon.",
 "The bars along the foot are how long each rāśi takes to rise at this latitude. At Delhi that runs from about 1 h 25 m to 2 h 20 m, and that inequality is what BPHS means by the rāśi durations of the place.",
 "<b>Span</b> of one day walks all twelve lagnas past the east point."
],
moon:[
 "The phase, the libration, the distance and the apparent size are the real ones for the moment on the playhead — not a stock picture.",
 "Lit on the right while waxing, on the left while waning. The faint ashen glow on the dark side is earthshine, and it is strongest at a thin crescent, exactly as it is in the sky.",
 "Craters stand out near the terminator and flatten away at full. That is the lighting doing its work, not a drawing decision — at full there are no shadows to see.",
 "The disc swells and shrinks by about a seventh over a month. That is perigee and apogee, shown rather than normalised away."
],
sun:[
 "The fine mottling is granulation — the tops of convection cells, about a thousand kilometres across.",
 "The edge is darker and redder because a slanted line of sight reaches only a shallower, cooler layer of the gas. That is limb darkening, and it is why Sūrya reads as a disc with an edge rather than a glowing ball.",
 "Spot groups sit within 30° of the solar equator and march across as the Sun turns, once in about 25 days.",
 "Sūrya's ecliptic latitude is zero by definition, and it is the one graha that never shows a phase."
],
worlds:[
 "Each graha at its true phase, distance, apparent size and magnitude for the moment shown.",
 "<b>Graha</b> holds one for the whole span — useful for watching Śukra's phase close, or Śani's rings open over the years. Leave it on <em>all five in turn</em> and the span walks through them.",
 "The row along the foot is the honest comparison: all five at one magnification, Guru a disc and Maṅgala a dot.",
 "<b>Sizing</b> switches the main disc between that same magnification and filling the frame. The frame always says which is in force."
],
bhava:[
 "One bhāva at a time, with the wheel showing where it falls in your own chart. Houses run anticlockwise from the lagna, which is how a rāśi chart is read — the lagna is always house 1.",
 "The significations are from <b>BPHS Ch. 11</b>. They overlap on purpose: the 7th is spouse and travel and trade, and the text does not rank them.",
 "<b>Those twelve meanings do not change with the division</b>, and the frame is not stuck when they stay put: the 4th is home and mother in the rāśi chart and in the Daśāṃśa alike. What the <b>Division</b> picker changes is the question put to them — the gold line gives the matter that division is for (Ch. 6), so the 4th read in D10 is the standing a profession rests on, and in D7 the home children are born into. That composition of topic with house is ordinary reading practice, not a verse.",
 "A star marks the house a division exists to refine — the 5th in D7, the 7th and 9th in D9. Three divisions carry no star, because D1, D27 and D60 are read whole rather than through one house.",
 "The line beneath gives this house in <i>your</i> chart — its rāśi, its lord, and whatever stands in it, all recomputed for the division on show. Dots inside the wheel are your grahas, in their places in that division.",
 "<b>Where BPHS looks closer.</b> The vargas are tied to topics in Ch. 6, so the 5th (children) is refined by <b>D7</b>, not D5. The popular habit of matching house N to chart D-N is not in the text and is not used here.",
 "Four houses have no varga of their own. The frame says so rather than inventing one."
],
rashi:[
 "One rāśi at a time as its own 30° strip, with every degree that matters marked on it.",
 "The green line is a <b>deep exaltation</b> point — the degree, not just the sign. The dashed red is the matching fall, always the same degree in the opposite rāśi.",
 "Gold dots are your own grahas, placed at their true degree within the sign rather than lumped in the middle.",
 "Movable, fixed and dual, with the element and the lord, are <b>BPHS Ch. 4</b>. The limb of the Kālapuruṣa is the same chapter's scheme of the zodiac as a body.",
 "<b>The rising time</b> is computed for your latitude by oblique ascension, which is what BPHS 1.8–9 asks for. Signs do not take equal time to rise, and the further from the equator the less equal they get."
],
nakfull:[
 "One nakṣatra at a time, the full 13°20′, divided into its four pādas.",
 "Each pāda is one <b>navāṃśa</b>, so each carries a rāśi of its own — that is what the four names along the strip are, and it is why the pāda matters as much as the nakṣatra.",
 "The lord is the <b>Viṃśottarī</b> lord, in the sequence BPHS gives: Ketu, Venus, Sun, Moon, Mars, Rāhu, Guru, Śani, Budha, repeating every nine.",
 "Gold dots are your own grahas. When Candra is the one standing here, the frame says so — the Moon's nakṣatra is what opens your daśā sequence, and its lord is your first mahādaśā.",
 "<b>Deity and gaṇa are later tradition</b>, not verses from Parāśara, and the frame labels them as such rather than letting them pass as BPHS."
]
};

/* Rendered into its own block under the controls. It is inside the panel that
   studio mode hides, and it is DOM rather than canvas, so it cannot reach a
   recording, an exported frame or a thumbnail. */
function moSceneGuide(){
  var host=document.getElementById("moread"); if(!host) return;
  var lines=MO_READ[MO.scene];
  if(!lines||!lines.length){ host.innerHTML=""; host.style.display="none"; return; }
  host.style.display="";
  var sc=moSceneOf(MO.scene);
  host.innerHTML='<div class="moreadh">How to read this &middot; <span>'+
      esc(sc?sc.label:MO.scene)+'</span></div>'+
    '<ul>'+lines.map(function(l){ return '<li>'+l+'</li>'; }).join("")+'</ul>'+
    '<p class="moreadf">This note stays on the page — it is not drawn on the frame, '+
    'so it will not appear in a screen recording, an exported image or studio mode.</p>';
}
