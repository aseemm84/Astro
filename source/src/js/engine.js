
/* ===== LearnHoro built-in chart engine (client-side) =====
   Positions: astronomy-engine (MIT). Ayanamsa: Lahiri quadratic fitted to Swiss Ephemeris.
   Produces the same JSON shape the report renderer consumes. */
(function(){
var SIGN=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
var LORD=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
var SK={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",Jupiter:"Guru",Venus:"Śukra",Saturn:"Śani",Rahu:"Rāhu",Ketu:"Ketu"};
var BH=["Tanu","Dhana","Sahaja","Bandhu","Putra","Ripu","Kalatra","Āyu","Bhāgya / Dharma","Karma","Lābha","Vyaya / Mokṣa"];
var VCODES=[["D1","राशि","Body"],["D2","होरा","Wealth"],["D3","द्रेक्काण","Siblings"],["D4","चतुर्थांश","Fortunes / Home"],
["D7","सप्तांश","Progeny"],["D9","नवांश","Spouse / Dharma"],["D10","दशांश","Profession"],["D12","द्वादशांश","Parents"],
["D16","षोडशांश","Vehicles / Comforts"],["D20","विंशांश","Spiritual practice"],["D24","चतुर्विंशांश","Learning"],
["D27","सप्तविंशांश","Strength"],["D30","त्रिंशांश","Evil / Misfortune"],["D40","खवेदांश","Maternal heritage"],
["D45","अक्षवेदांश","Paternal heritage"],["D60","षष्ट्यंश","Past karma"]];
var NAKL=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
var NAKN=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
var norm=function(x){return ((x%360)+360)%360;};
var D2R=Math.PI/180, R2D=180/Math.PI;

function jdFromUTC(y,m,d,ut){if(m<=2){y--;m+=12;}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+ut/24;}
function Tof(jd){return (jd-2451545.0)/36525.0;}

/* ===== THE CERTIFIED WINDOW ===============================================

   1800–2200 is where this engine is CHECKED, not where it stops working. The
   ayanāṃśa polynomials below were fitted over it; source/test/reference-verify
   .mjs holds the positions to an independent ERFA sky across it on 400
   stratified instants. Outside it the engine still answers — and must, because
   the Sūrya Siddhānta page exists precisely to look at 500 CE — but until this
   block existed it answered with exactly the same confidence and said nothing,
   which is the one thing the project's own standard forbids.

   WHAT ACTUALLY DEGRADES, measured rather than assumed. Two surprises:

   The ayanāṃśa is NOT the problem. Its linear and quadratic coefficients turn
   out to match IAU 2006's accumulated precession p_A to five figures
   (5028.7967 vs 5028.7962 ″/cy; 1.105501 vs 1.105435 ″/cy²), so what the
   polynomial omits is only p_A's cubic and higher — worth 0.31″ at 1000 CE,
   0.16″ at 3000 CE, and not 37″ until 1500 BCE. A fitted quadratic had no
   right to extrapolate twenty centuries that well; it does, and saying
   otherwise in a caution would have been a false alarm.

   THE MOON is the limit. Against the independent reference, worst-case
   longitude disagreement by band (source/test/fixtures/reference-ecliptic-
   wide.json, 300 samples 1000–3000, measured by span-verify.mjs):

       band         Moon   tithi end   nakṣatra end
       1000–1399    205″       452 s          416 s
       1400–1799     73″       162 s          148 s
       1800–2200     15″        34 s           31 s   ← the certified window
       2201–2599     56″       123 s          113 s
       2600–3000    164″       359 s          333 s

   The two time columns are what the longitude column is actually worth to a
   reader of this site, and they are MEASURED, not divided out of the Moon
   figure. A tithi, yoga or karaṇa boundary is a condition on the Moon's
   ELONGATION from the Sun, which closes at about 0.45″/s at its slowest, so
   the two errors combine through the elongation rather than through the Moon's
   own motion — estimating it from the Moon alone understated 1000–1399 by a
   fifth. A nakṣatra boundary is the Moon alone at about 0.49″/s.

   Each figure is the measured worst case rounded UP, because a band quoting
   less than it measured would be a false reassurance. span-verify.mjs
   remeasures every one of them and fails on either side: a figure below its
   measurement, or one more than twice it. That check has now caught three real
   slips — two bands quoted a tenth of an arcsecond low, and the certified
   window quoted 10″ because it had been remeasured from the 60 samples the
   WIDE fixture happens to place inside it, when the dense 400-sample fixture
   that actually certifies the window measures 14.8″. Each band is paired with
   the fixture that samples it best now, and the harness asserts the pairing.

   Either side may be responsible — ERFA's own lunar series degrades away from
   1900–2100 too — so this is a DISAGREEMENT and therefore an uncertainty, not
   an engine error. It is quoted as such. Beyond 1000–3000 nothing is quoted at
   all, because ERFA's planetary series is itself only documented over that
   range and a number invented past it would be worse than silence. */
var SPAN=[1800,2200];
var SPAN_BANDS=[
  {from:1000,to:1399,moon:205,instant:452,nak:416,ref:"wide"},
  {from:1400,to:1799,moon:73, instant:162,nak:148,ref:"wide"},
  {from:1800,to:2200,moon:15, instant:34, nak:31, ref:"dense"},
  {from:2201,to:2599,moon:56, instant:123,nak:113,ref:"wide"},
  {from:2600,to:3000,moon:164,instant:359,nak:333,ref:"wide"}
];
function yearOfJd(jd){ return 2000+(jd-2451545.0)/365.25; }
/* The chart's standing relative to the window: the year, whether it is inside,
   and for its band the measured Moon disagreement, the measured worst-case
   error on a tithi/yoga/karaṇa end-instant, the same for a nakṣatra boundary,
   and the Moon figure as a fraction of a D60 aṃśa (1800″). All null outside
   1000–3000, where nothing has been measured. */
function spanStatus(jd){
  var y=yearOfJd(jd), inside=(y>=SPAN[0]&&y<=SPAN[1]), band=null;
  for(var i=0;i<SPAN_BANDS.length;i++)
    if(y>=SPAN_BANDS[i].from&&y<=SPAN_BANDS[i].to){ band=SPAN_BANDS[i]; break; }
  var moon=band?band.moon:null;
  /* FLOOR, not round. A chart dated 21 July 500 CE is decimal year 500.55, and
     rounding it labelled the band "501 CE" — a date the reader never typed.
     Floor also gives the right astronomical-to-BCE conversion: year 0 is 1 BCE,
     so y < 1 maps to (1 − floor y) BCE. */
  var yi=Math.floor(y);
  return {year:y, yearLabel:(yi<1?(1-yi)+" BCE":yi+" CE"),
          inside:inside, span:SPAN.slice(), measured:!!band,
          moonArcsec:moon,
          /* measured, not divided out of the Moon figure — see the note above */
          tithiSeconds:band?band.instant:null,
          nakSeconds:band?band.nak:null,
          d60Fraction:moon==null?null:moon/1800};
}
/* Lahiri ayanamsa — quadratic fitted to Swiss Ephemeris (residual < 0.001") */
/* Ayanamsa. Each set of coefficients was fitted to Swiss Ephemeris over 1800-2200
   (quarterly samples) and the residual measured. Lahiri, Raman and Krishnamurti
   reproduce Swiss Ephemeris to 0.000"; true Chitrapaksha is a moving definition tied
   to Spica's actual position and carries about +/-20" of non-polynomial wobble, which
   is well under an arcminute and far below a nakshatra pada (3000"), but is not exact. */
/* A short tag per mode, for places with no room for the full name.
   The ruler on the Ayanāṃśa pane was taking the first word of the name, which
   is useless here: five of the sixteen begin "Sūrya" or "True", so the strip
   read Tru, Sūr, Ran, Tru, Sūr, Kris, Lah, Fag, Sūr — nine labels naming
   nothing. These are chosen to be distinct from one another at a glance, and
   they live beside the names so the two cannot drift apart. */
var AYAN_MODES={
  lahiri:     {name:"Lahiri (Chitrapakṣa)", s:"Lahiri", note:"the Indian civil standard; matches Swiss Ephemeris to 0.000″",
               c:[0.000307083556492,1.39688796382,23.857092356]},
  raman:      {name:"Raman", s:"Raman", note:"B. V. Raman's value; matches Swiss Ephemeris to 0.000″",
               c:[0.00030705015156,1.39688808364,22.4107910426]},
  kp:         {name:"Krishnamurti (KP)", s:"KP", note:"used in the KP system; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050151567,1.39688808364,23.7602400426]},
  truechitra: {name:"True Chitrapakṣa", s:"T. Citrā", note:"Spica fixed at 180° exactly; a moving definition, within ≈20″ of Swiss Ephemeris",
               c:[0.00030778556054,1.39569673536,23.8413914361]},
  yukteshwar: {name:"Yukteshwar", s:"Yukteśvar", note:"Śrī Yukteswar's value; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050196155334,1.39688808367904,22.4788030300512]},
  bhasin:     {name:"J. N. Bhasin", s:"Bhasin", note:"J. N. Bhasin's value; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050196162532,1.39688808367904,22.7621370300512]},
  fagan:      {name:"Fagan–Bradley", s:"Fagan", note:"the Western sidereal standard, not a Jyotiṣa one; offered for comparison. " +
                    "Matches Swiss Ephemeris to 0.000″",
               c:[0.000307079912515056,1.39688797821407,24.7402999966933]},

  /* ---- two more moving-star definitions ------------------------------------
     Like True Chitrapakṣa these follow a real star rather than a fixed epoch,
     so they carry the same ≈20″ of non-polynomial wobble. A cubic and a quintic
     were both tried and neither helps: the residual is the star's own apparent
     motion, not a shortcoming of the polynomial. */
  truerevati: {name:"True Revatī", s:"T. Revatī", note:"ζ Piscium held at its stated longitude; a moving definition, within ≈20″ of Swiss Ephemeris",
               c:[0.000306512057764597,1.40008230121424,20.0441879052671]},
  truepushya: {name:"True Puṣya", s:"T. Puṣya", note:"δ Cancri held at its stated longitude; a moving definition, within ≈19″ of Swiss Ephemeris",
               c:[0.00030665680272264,1.39808717915315,22.7220173465237]},

  /* ---- the three Sūrya Siddhānta readings ----------------------------------
     "Sūrya Siddhānta ayanāṃśa" is not one number. The text does not describe
     precession at all: it describes the circle of asterisms LIBRATING — an
     oscillation of ±27° completing in 7200 years — so taken at its word the
     ayanāṃśa does not grow without limit, it swings back, and right now it
     sits near the top of its swing and is nearly stationary. Read instead as
     a rate, or anchored to a zero epoch and advanced by modern precession,
     it gives quite different answers. The three differ by about 5° today,
     which is roughly 1.5 nakṣatra pādas — a different chart, not a refinement.

     All three are offered and none is called the right one, which is the same
     stance ss-engine.js already takes on the Sūrya Siddhānta page. The first
     two use that page's own model, so a figure shown here and the same figure
     there come from one definition rather than two; the harness asserts it. */
  ss_text:    {name:"Sūrya Siddhānta — libration", s:"SS libration", unit:"text",
               note:"the text's own model: ±27° oscillating over 7200 years, zero at 499 CE. " +
                    "Near its maximum now and almost stationary — it advances ≈0.35° this century " +
                    "where every modern ayanāṃśa advances ≈1.03°. Not a Swiss Ephemeris quantity.",
               f:function(y){ return 27*Math.sin(2*Math.PI*(y-499)/7200); }},
  ss_rate:    {name:"Sūrya Siddhānta — steady 54″", s:"SS 54″", unit:"text",
               note:"the text's rate with the libration ignored: a constant 54″ a year from 499 CE. " +
                    "This is what is usually meant casually by “the Sūrya Siddhānta ayanāṃśa”, and it " +
                    "agrees with the libration reading only near the zero point. Not a Swiss Ephemeris quantity.",
               f:function(y){ return (y-499)*54/3600; }},
  ss_swiss:   {name:"Sūrya Siddhānta (Swiss Ephemeris)", s:"SS Swiss", note:"Swiss Ephemeris SE_SIDM_SURYASIDDHANTA: " +
                    "zero at 499 CE then advanced by modern precession, not by the text's libration. " +
                    "Quadratic fitted over 1800–2200; matches Swiss Ephemeris to 0.000″",
               c:[0.00030619214892391,1.39688356264496,20.8950588659651]},
  ss_revati:  {name:"Sūrya Siddhānta — Revatī (Swiss)", s:"SS Revatī", note:"Swiss Ephemeris SE_SIDM_SS_REVATI: Revatī at 359°50′, " +
                    "taken at a fixed epoch and then advanced by modern precession. Matches Swiss Ephemeris to 0.000″",
               c:[0.000306192149237889,1.39688356264479,20.1033884059649]},
  ss_citra:   {name:"Sūrya Siddhānta — Citrā (Swiss)", s:"SS Citrā", note:"Swiss Ephemeris SE_SIDM_SS_CITRA: the same scheme with " +
                    "Citrā at 180° instead. Matches Swiss Ephemeris to 0.000″",
               c:[0.000306192149240291,1.39688356264479,23.0057633059649]},
  aryabhata:  {name:"Āryabhaṭa", s:"Āryabhaṭa", note:"Swiss Ephemeris SE_SIDM_ARYABHATA. Measured against its Sūrya Siddhānta mode " +
                    "over 1700–2300 the two never differ by more than 0.003″ — for every practical purpose this is " +
                    "the same series under another name, and it is offered because it is published, not because it " +
                    "is a separate choice",
               c:[0.000306192149196146,1.39688356264424,20.8950597525217]},

  /* ---- this site's own ------------------------------------------------------
     Sidereal zero ten arcminutes east of Revatī (ζ Piscium), which is the
     dhruvaka the Sūrya Siddhānta itself gives for that star: 359°50′. The star
     is propagated to the date by its full space motion (HYG v4.1 — Hipparcos
     astrometry, which for stars this bright is better than Gaia's) and measured
     by POLAR longitude, the convention the siddhāntas record star positions in,
     in the ecliptic and mean equinox of date with no nutation.

     Derived independently here, and then found to agree with Swiss Ephemeris's
     own SS_REVATI to 1.7 arcminutes at 2026 — which is the corroboration, not
     the source. The two differ because that one freezes the star at an epoch
     where this one lets it move; over the 1527 years since 499 CE Revatī has
     drifted 3.8′, less than half the 10′ step the text rounds its own figure
     to, so the text's statement still holds at the precision the text states it.

     Quadratic fitted over 1700–2300, max residual 0.12″ against the derivation.

     NOT a BPHS quantity. BPHS prescribes no ayanāṃśa; it uses one without
     defining it. Lahiri remains the default and the value everything on this
     site is validated against. */
  /* ---- and the same method on the other anchor ----------------------------
     Citrā (Spica, α Virginis) at polar longitude 180°00′ — the anchor the
     Chitrapakṣa family is named for — derived by exactly the pipeline the
     Revatī reading above uses: HYG v4.1 astrometry, the star propagated to the
     date by its full space motion, measured by POLAR longitude in the ecliptic
     and mean equinox of date with no nutation.

     WHY BOTH. The two classical anchors are not consistent with each other.
     Citrā at 180° and Revatī at 359°50′ cannot both be true of the sky: as
     measured here they disagree by about 3.8°, which is a different chart
     rather than a refinement of one. Offering both, derived identically, is
     the only honest way to present that — the difference between these two
     entries is the textual disagreement itself, with the method held constant
     so that nothing else can be blamed for it.

     Derived independently and then found to agree with Swiss Ephemeris's own
     SS_CITRA to 0.9 arcminutes at 2026, which is the corroboration and not the
     source — the same relationship the Revatī reading has to SS_REVATI at 1.7′.

     It sits 49.2′ from True Chitrapakṣa, and that gap is not an error in
     either: True Chitrapakṣa anchors Citrā's ECLIPTIC longitude where this
     anchors its POLAR longitude, and for a star 2° off the ecliptic those two
     differ by exactly that much. The two definitions are answering different
     questions about the same star.

     Quadratic fitted over 1700–2300, max residual 0.023″ against the
     derivation. NOT a BPHS quantity. */
  nirayana_citra: {name:"Nirayana–Chitrapakṣa (this site)", s:"Nir. Citrā",
               note:"this site's own: sidereal zero at Citrā (Spica), the 180° anchor the Chitrapakṣa " +
                    "family is named for, with the star moved by its real space motion and measured by " +
                    "polar longitude. Independent of, and within 0.9′ of, Swiss Ephemeris's SS_CITRA; " +
                    "49.2′ from True Chitrapakṣa, which anchors the same star's ecliptic longitude instead",
               c:[0.00056693400497,1.40165348481417,23.019916795380]},
  nirayana_revati: {name:"Nirayana–Revatī (this site)", s:"Nir. Revatī",
               note:"this site's own: sidereal zero 10′ east of Revatī, from the Sūrya Siddhānta's own dhruvaka " +
                    "of 359°50′, with the star moved by its real space motion and measured by polar longitude. " +
                    "Independent of, and within 1.7′ of, Swiss Ephemeris's Sūrya Siddhānta–Revatī",
               c:[0.00027145885336,1.39822212898,20.132107536527]},
  /* ---- the two Samanvaya readings ------------------------------------------
     Supplied by this site's author from his own multi-constraint synthesis: an
     inverse-variance weighted least-squares centroid over the Sūrya Siddhānta's
     polar dhruvakās and the Pauliśa solar apogee, with the stars propagated by
     Gaia DR3 / Hipparcos space motion and IAU 2006 (P03) precession. That
     derivation is not reproduced on this site, so these two are carried as the
     author's own definitions and the figures describing them are attributed
     rather than asserted — which is why neither note quotes the thesis's RMS
     residual as though this project had measured it. (The thesis gives that
     residual twice and inconsistently: 0.887° over six stars, 0.64° over a set
     that drops Maghā, its single worst residual at −99′.)

     Three things were checked before these were added, and all three are
     asserted in ayanamsa-verify:

     1. BOTH POLYNOMIALS VANISH AT THEIR STATED EPOCH. At the given Julian Days
        they come out at +1.8″ (polar, JD 1868970.25) and +1.4″ (ecliptic, JD
        1903396.75) — zero to well inside the precision either can claim.

     2. THE PROSE AROUND THE POLAR EPOCH CONTRADICTS ITS OWN JULIAN DAY, so the
        note states the epoch the arithmetic actually uses. JD 1868970.25 is 17
        December 404 CE in the Julian calendar, i.e. decimal year 404.96 —
        which agrees with the stated "405.0 CE" and not with the stated
        "March 20" or "vernal equinox". 20 March 405 is JD 1869062.75, ninety-
        two days later, where this polynomial gives +14.4″ rather than zero. The
        decimal year, the JD and the coefficients agree with each other; only
        the month does not, so the month is left out. (The ecliptic epoch's
        words and JD do agree — JD 1903396.75 is 21 March 499 CE. The slip there
        is its separately quoted T₀ of −15.0061122519: the JD gives
        −15.0074811773, fifty days apart. Nothing reads T₀, so it is not
        carried here at all.)

     3. SAMANVAYA–ECLIPTIC IS THE ARYABHATA MODE ALREADY PRESENT. Measured
        against every other mode across 1000–3000 CE, its worst disagreement
        with `aryabhata` is 0.28 ARCSECONDS. That is not a loose near-agreement
        to wave at; it is the same convention reached from different premises,
        and at fifty times finer than this engine's own measured Moon it is not
        a distinguishable alternative. The note says so, because presenting it
        as an independent nineteenth answer without that sentence would make the
        ayanāṃśa page's own argument — that these are genuinely different
        readings — quietly false.

        Samanvaya–Polar is a real addition: nearest neighbour `raman`, 12.5′
        away, and the gap holds across the whole span.

     Neither widens the family's spread — both fall inside the existing
     endpoints (True Revatī 20.41°, SS libration 26.24°) — so the 5.83° figure
     quoted across the site is unaffected. NOT BPHS quantities: BPHS prescribes
     no ayanāṃśa. Lahiri remains the default and the value everything here is
     validated against. */
  /* The short labels are "Sam. Polar" and "Sam. Ecliptic" rather than the
     specification's "Samanvaya (Polar)" and "Samanvaya (Ecliptic)". The ruler
     caps a tag at fourteen characters and self-test asserts it; the requested
     labels are seventeen and twenty, and the suite caught both. The form used
     here follows the house style already set by "Nir. Citrā" and
     "Nir. Revatī" — the full names below are untouched and are what the
     picker, the legend and the comparison table show. */
  samanvaya_polar: {name:"Samanvaya–Polar (ध्रुवक-समन्वय)", s:"Sam. Polar",
               /* RELABELLED, deliberately, and the mode is kept rather than
                  retired so that a reader who has this stored still gets the
                  figures they chose. What changed is the claim: this was
                  presented as a synthesis and it is a five-dhruvakā SUBSET
                  minimum. See claude/samanvaya-ayanamsa-research.md §5–6. */
               note:"this site's own: the armillary-sphere polar reading, sidereal zero at 405.0 CE " +
                    "(JD 1868970.25). An inverse-variance least-squares centroid over FIVE of the Sūrya " +
                    "Siddhānta's polar dhruvakās — Aśvinī 8°, Rohiṇī 49°30′, Puṣya 106°, Citrā 180°, " +
                    "Uttarāṣāḍhā 260° — with the 76° Pauliśa solar apogee, propagated by Gaia DR3 space " +
                    "motion and IAU 2006 precession. 1°39′ west of Lahiri at 2026; nearest neighbour in " +
                    "this family is Raman, 12.5′ away. " +
                    "READ IT AS THAT SUBSET'S MINIMUM, NOT AS A SYNTHESIS. Combining the full 27-star " +
                    "dhruvakā ensemble with the solar apogee of three texts puts the measured sidereal " +
                    "zero at 493.6 ± 23 CE, which excludes this mode's 405.0 CE at 3.9σ — the very " +
                    "constraint set it was said to synthesise. The two textual epochs withheld from that " +
                    "fit, the Sūrya Siddhānta's 499.2 CE and Varāhamihira's 505.0 CE, land at 0.2σ and " +
                    "0.5σ of it. So this reading is a defensible convention over the stars it uses and " +
                    "is not the best-supported one on the available evidence; Samanvaya–Ecliptic is",
               c:[0.00030701309467,1.39688795339,22.202788470]},
  samanvaya_ecliptic: {name:"Samanvaya–Ecliptic (क्रान्तिवृत्त-समन्वय)", s:"Sam. Ecliptic",
               note:"this site's own: the orthogonal ecliptic reading, sidereal zero at Āryabhaṭa's Kaliyuga " +
                    "3600 elapsed — 21 March 499 CE, JD 1903396.75 — advanced by IAU 2006 precession. " +
                    "Reached from the equinoctial conjunction, the gnomon solstice records and the 78° solar " +
                    "apogee rather than from a star. It agrees with this site's Āryabhaṭa mode to 0.28″ " +
                    "across 1000–3000 CE, so read the two as one convention independently derived, not as a " +
                    "choice between them. " +
                    "IT IS ALSO THE BEST-SUPPORTED SIDEREAL ZERO ON THE MEASURABLE EVIDENCE. Combining the " +
                    "27-star dhruvakā ensemble with the solar apogee of three texts gives a measured zero " +
                    "of 493.6 ± 23 CE — a ±19.3′ band — and this mode's epoch sits 0.2σ from it. That is " +
                    "corroboration by independent derivation rather than a new epoch: the single-star " +
                    "anchors are definitions and not measurements, so they are excluded from that fit, and " +
                    "the textual epochs are withheld from it and scored afterwards",
               c:[0.00030701309468,1.39688795339,20.895012118]}
};
var AYAN_MODE="lahiri";
function setAyanamsaMode(m){ if(AYAN_MODES[m]) AYAN_MODE=m; return AYAN_MODE; }
/* The calendar year, computed exactly as ss-engine.js's yearOf does, so the two
   engines cannot drift apart on the two text-based readings. A Julian-year
   approximation from T would be close but not identical, and "close" between
   two implementations of one definition is how they end up disagreeing. */
function ayanYearOf(jd){
  var d=new Date((jd-2440587.5)*86400000);
  return d.getUTCFullYear()+(d.getUTCMonth()+0.5)/12;
}
function ayanamsaFor(mode,jd){
  var M=AYAN_MODES[mode]||AYAN_MODES.lahiri, v=0;
  if(M.f) return M.f(ayanYearOf(jd));
  var T=Tof(jd);
  for(var i=0;i<M.c.length;i++) v=v*T+M.c[i];
  return v;
}
function ayanamsa(jd){ return ayanamsaFor(AYAN_MODE,jd); }
/* True (osculating) node: the ascending node of the Moon's instantaneous orbital
   plane, taken in the ecliptic of date. Verified against Swiss Ephemeris TRUE_NODE
   to better than 0.3 arcminutes on the reference charts. */
function trueNodeAt(date){
  var dt=0.0005;
  function ec(t){ var e=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,t,false));
                  return e.vec?e.vec:e; }
  var e0=ec(new Date(date.getTime()-dt*86400000)), e1=ec(new Date(date.getTime()+dt*86400000));
  var v={x:e1.x-e0.x,y:e1.y-e0.y,z:e1.z-e0.z};
  var r={x:(e0.x+e1.x)/2,y:(e0.y+e1.y)/2,z:(e0.z+e1.z)/2};
  var h={x:r.y*v.z-r.z*v.y, y:r.z*v.x-r.x*v.z, z:r.x*v.y-r.y*v.x};
  return norm(Math.atan2(h.x,-h.y)*180/Math.PI);
}
/* mean lunar node (tropical) */
function meanNode(jd){var T=Tof(jd);
  return norm(125.0445479-1934.1362891*T+0.0020754*T*T+T*T*T/467441-T*T*T*T/60616000);}

var BODY={Sun:"Sun",Moon:"Moon",Mars:"Mars",Mercury:"Mercury",Jupiter:"Jupiter",Venus:"Venus",Saturn:"Saturn"};
function tropLon(name,date){
  var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[BODY[name]],date,true));
  return norm(ev.elon);
}
function lonAndSpeed(name,date){
  var h=0.5/24, d0=new Date(date.getTime()-h*86400000), d1=new Date(date.getTime()+h*86400000);
  var a=tropLon(name,d0), b=tropLon(name,d1), c=tropLon(name,date);
  var diff=b-a; if(diff>180)diff-=360; if(diff<-180)diff+=360;
  return {lon:c, speed:diff/(2*h)};
}
/* Is the ecliptic point lam RISING — east of the meridian — at this sidereal
   angle and latitude? Needed because the closed form in ascendant() cannot
   tell the ascendant from the descendant everywhere. The point is carried to
   equatorial coordinates and its azimuth taken from north through east, so the
   eastern half of the sky is 0° < A < 180°. */
function isRisingPoint(lam,ramc,eps,phi){
  var x=Math.cos(lam), y=Math.sin(lam)*Math.cos(eps), z=Math.sin(lam)*Math.sin(eps);
  var ra=Math.atan2(y,x), dec=Math.asin(z), H=ramc-ra;
  var az=Math.atan2(-Math.cos(dec)*Math.sin(H),
                     Math.sin(dec)*Math.cos(phi)-Math.cos(dec)*Math.sin(phi)*Math.cos(H));
  az=((az*R2D)%360+360)%360;
  return az>0 && az<180;
}
function ascendant(jd,date,lat,lon,ay){
  var gast=Astronomy.SiderealTime(date);
  var lst=((gast+lon/15)%24+24)%24, ramc=lst*15*D2R;
  var T=Tof(jd), eps=(23.439291111-0.0130041667*T-1.638e-7*T*T)*D2R, phi=lat*D2R;
  var a=Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)));
  /* The two intersections of the ecliptic with the horizon lie 180° apart, and
     the formula above picks the right one only while tan(phi) stays modest.
     Beyond the polar circles it does not: reference-verify.mjs, comparing
     against the horizon-plane intersection computed as vectors, found this
     returning the DESCENDANT for 41% of sampled instants at Tromsø (69.65°N) —
     every bhāva rotated by six, silently, for anyone born above the Arctic
     circle. The scan that bounded it found zero disagreement at or below 66°,
     4% at 67°, 21% at 70° and 38% at 80°, which is where the ecliptic can lie
     wholly above or below the horizon and the branch stops being decidable
     from the signs alone. So the branch is tested now rather than assumed.
     At or below 66° the flip never fires and the value is unchanged, which
     reference-verify.mjs asserts explicitly rather than leaving to a reading
     of this comment. */
  if(!isRisingPoint(a,ramc,eps,phi)) a+=Math.PI;
  return norm(norm(a*R2D)-ay);
}
function nak(deg){var seg=40/3,x=norm(deg),i=Math.min(Math.floor(x/seg),26);
  return {idx:i,name:NAKN[i],pada:Math.floor((x-i*seg)/(seg/4))+1,lord:NAKL[i%9]};}
function rashiObj(sid){var i=Math.floor(norm(sid)/30)%12;
  return {idx:i,saName:SA[i],saDev:SA[i],iast:SA[i],sa:SA[i],enName:SIGN[i],degInSign:norm(sid)-i*30};}
/* varga sign for a longitude — formulas verified against the reference engine (9/9 on all 16) */
function vargaSign(code,sid){
  var s=Math.floor(norm(sid)/30)%12,d=norm(sid)-s*30,odd=(s%2===0),M=s%3,p;
  switch(code){
    case "D1": return s;
    case "D2": var h=(d<15)?0:1; return odd?(h===0?4:3):(h===0?3:4);
    case "D3": return (s+[0,4,8][Math.floor(d/10)])%12;
    case "D4": return (s+[0,3,6,9][Math.floor(d/7.5)])%12;
    case "D7": p=Math.floor(d/(30/7)); return odd?(s+p)%12:(s+6+p)%12;
    case "D9": return Math.floor(norm(sid)/(30/9))%12;
    case "D10": p=Math.floor(d/3); return odd?(s+p)%12:(s+8+p)%12;
    case "D12": return (s+Math.floor(d/2.5))%12;
    case "D16": return ([0,4,8][M]+Math.floor(d/1.875))%12;
    case "D20": return ([0,8,4][M]+Math.floor(d/1.5))%12;
    case "D24": return ((odd?4:3)+Math.floor(d/1.25))%12;
    case "D27": return ([0,3,6,9][s%4]+Math.floor(d/(30/27)))%12;
    case "D30": if(odd){if(d<5)return 0;if(d<10)return 10;if(d<18)return 8;if(d<25)return 2;return 6;}
                if(d<5)return 1;if(d<12)return 5;if(d<20)return 11;if(d<25)return 9;return 7;
    case "D40": return ((odd?0:6)+Math.floor(d/0.75))%12;
    case "D45": return ([0,4,8][M]+Math.floor(d/(30/45)))%12;
    case "D60": return (s+Math.floor(d*2))%12;
  } return 0;
}
function baladi(sid){var s=Math.floor(norm(sid)/30)%12,d=norm(sid)-s*30,odd=(s%2===0);
  var k=Math.floor(d/6); if(!odd)k=4-k;
  return [["Bāla",50],["Kumāra",100],["Yuvā",100],["Vṛddha",50],["Mṛta",0]][Math.max(0,Math.min(4,k))];}
/* The ārūḍha is counted in RĀŚIS — that is intrinsic to the method and does
   not change. What the house system decides is only which rāśi the bhāva is,
   which is the starting point of the count. Under whole-sign that is
   (lagnaSign + house − 1) mod 12, the original expression, so passing nothing
   reproduces the old behaviour exactly. Under Śrīpati it is the rāśi holding
   the bhāva's madhya. Counting ārūḍhas from a quadrant bhāva is an EXTENSION,
   not classical Jaimini, and the report says so where it is shown. */
function arudhaOf(house,lagnaSign,posBySign,bhavaSign){
  var hs=(bhavaSign==null)?(lagnaSign+house-1)%12:bhavaSign, lord=LORD[hs], lp=posBySign[lord];
  if(lp==null)return hs;
  var dist=((lp-hs)%12+12)%12+1, a=(lp+dist-1)%12;
  if(a===hs) a=(hs+9)%12; else if(((a-hs)%12+12)%12===6) a=(hs+3)%12;
  return a;
}
var PAN_T=["Pratipada","Dvitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dvadashi","Trayodashi","Chaturdashi","Purnima"];
var PAN_Y=["Vishkambha","Preeti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
var KMOV=["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"],KFIX=["Shakuni","Chatushpada","Naga","Kimstughna"];
var VARA=["Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"];
function panchang(sunSid,moonSid,jd){
  var diff=norm(moonSid-sunSid),ti=Math.floor(diff/12),n=Math.floor(diff/6);
  return {tithi_sa:(ti===29?"Amavasya":(ti===14?"Purnima":PAN_T[ti%15])),
    paksha_sa:(ti<15?"Shukla":"Krishna"),
    vara_sa:VARA[(Math.floor(jd+1.5)%7+7)%7],
    nakshatra_sa:nak(moonSid).name,
    yoga_sa:PAN_Y[Math.floor(norm(moonSid+sunSid)/(800/60))],
    karana_sa:(n===0?"Kimstughna":(n<=56?KMOV[(n-1)%7]:KFIX[n-57]))};
}
/* ===== Quantities the JSON was missing =====
   Each of these is classical chart material that the report already showed on
   screen but never wrote into the downloaded file, so a reader of the JSON alone
   could not reproduce the reading. They live here, in the engine, because the
   engine is what the JSON is built from — and they are exposed on window so the
   report draws them from one implementation rather than keeping a second copy
   that is free to drift. */

/* The lunar month, season and half-year. The month is named for the rāśi the Sun
   held at the new moon that opened it; we step the Sun back by the tithis already
   elapsed at its mean rate rather than searching for that new moon, which is good
   to well under a degree except within hours of a saṅkrānti. Pūrṇimānta names the
   same day for the month ENDING at the coming full moon, so through the dark
   fortnight it runs one ahead. */
var LMONTH=["Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwina","Kartika",
  "Margashirsha","Pausha","Magha","Phalguna","Chaitra"];
var RITU={Chaitra:"Vasanta",Vaishakha:"Vasanta",Jyeshtha:"Grishma",Ashadha:"Grishma",
  Shravana:"Varsha",Bhadrapada:"Varsha",Ashwina:"Sharad",Kartika:"Sharad",
  Margashirsha:"Hemanta",Pausha:"Hemanta",Magha:"Shishira",Phalguna:"Shishira"};
/* THE MONTH IS NAMED FROM WHERE THE SUN WAS AT THE NEW MOON, and the fourth
   argument is how to say that exactly.

   Without it this back-projects: take the tithis elapsed since the new moon,
   multiply by the Sun's MEAN motion and a MEAN tithi length, and subtract.
   Both means are wrong by a little, and the error grows across the month — so
   when the Sun stood within about half a degree of a rasi boundary at the new
   moon, floor(sunAtNM/30) came out one way on some days of that month and the
   other way on others. The month then changed its NAME in the middle of
   itself: April 2029 ran Chaitra, Vaishakha, Chaitra, Vaishakha on successive
   stretches of one lunation, and the festivals whose rule names a month fell
   through the gap. Rama Navami went missing in 2029 and 2048.

   Callers that know the real conjunction pass the Sun's true sidereal
   longitude there, which is constant for every day of the month by
   construction. The approximation stays for callers that have only the two
   longitudes. */
function masaOf(sunSid,moonSid,ayan,sunAtNewMoon){
  var elapsed=norm(moonSid-sunSid)/12;
  var sunAtNM=(sunAtNewMoon!=null&&isFinite(sunAtNewMoon))
    ? norm(sunAtNewMoon)
    : norm(sunSid-elapsed*0.9856*(29.53/30));
  var amanta=LMONTH[Math.floor(sunAtNM/30)%12];
  var krishna=(norm(moonSid-sunSid)/12)>=15;
  var trop=norm(sunSid+(ayan||0));
  return {amanta:amanta,
    purnimanta:(krishna?LMONTH[(Math.floor(sunAtNM/30)+1)%12]:amanta),
    ritu:RITU[amanta]||"",
    ayana:(trop>=90&&trop<270)?"Dakshinayana":"Uttarayana"};
}

/* Combustion. A graha within its own orb of the Sun is astaṅgata — lost in the
   glare — and classically treated as weakened however well it is otherwise
   placed. The orbs are the common Parāśarī set; Rāhu and Ketu, having no disc to
   be swallowed, are not reckoned combust at all. */
var COMB={Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:16};
function combustionOf(name,sid,sunSid){
  var orb=COMB[name]; if(orb==null) return null;
  var sep=Math.abs(norm(sid-sunSid)); if(sep>180) sep=360-sep;
  return {separation_deg:sep, orb_deg:orb, combust:sep<=orb};
}

/* Graha yuddha — planetary war. Two of the five tārā grahas within a degree of
   each other are at war. BPHS does not settle who wins in the verses this engine
   can point to, and the later authorities differ — some give it to the northerly
   graha, some to the brighter — so the fact and the figures needed to judge it
   are reported, and the verdict is left to the reader. */
function yuddhaOf(pos){
  var tara=["Mars","Mercury","Jupiter","Venus","Saturn"], out=[];
  for(var i=0;i<tara.length;i++) for(var j=i+1;j<tara.length;j++){
    var a=pos[tara[i]], b=pos[tara[j]]; if(!a||!b) continue;
    var sep=Math.abs(norm(a.sid-b.sid)); if(sep>180) sep=360-sep;
    if(sep>1) continue;
    out.push({grahas:[SK[tara[i]],SK[tara[j]]], separation_deg:sep,
      latitude_deg:[a.lat==null?null:a.lat, b.lat==null?null:b.lat],
      northerly:(a.lat!=null&&b.lat!=null)?SK[(a.lat>b.lat)?tara[i]:tara[j]]:null,
      note:"within one degree, so in yuddha; authorities differ on which graha prevails"});
  }
  return out;
}

/* How long each rāśi takes to rise at a given latitude — the oblique ascension.
   BPHS asks for exactly this in its first chapter: the ascendant is to be found
   "with the help of Rāśi durations applicable to the respective places". A sign
   spans a certain arc of right ascension, and its declination buys or costs it
   the ascensional difference; what is left is the time it occupies the eastern
   horizon. At the latitudes most charts are cast for the spread is wide — about
   an hour and a half for the quickest rāśi against nearly two and a half for the
   slowest — which is why a chart's lagna is far more sensitive to birth time in
   some signs than in others. */
function risingTimes(latDeg,ayan){
  var eps=23.4392911*D2R, se=Math.sin(eps), ce=Math.cos(eps), phi=latDeg*D2R;
  function oa(lonSid){
    var lt=(lonSid+(ayan||0))*D2R;
    var ra=Math.atan2(ce*Math.sin(lt),Math.cos(lt))*R2D; if(ra<0) ra+=360;
    var dec=Math.asin(se*Math.sin(lt));
    var x=Math.tan(phi)*Math.tan(dec);
    if(x>=1||x<=-1) return null;                  /* the rāśi never rises here */
    return ra-Math.asin(x)*R2D;
  }
  var out=[];
  for(var s=0;s<12;s++){
    var a=oa(s*30), b=oa(s*30+30);
    var nm=rashiObj(s*30+0.001).saName;
    if(a==null||b==null){
      out.push({rashi_idx:s, rashi:nm, oblique_ascension_deg:null, rising_minutes:null,
                note:"never rises at this latitude"});
      continue; }
    var d=b-a; while(d<0) d+=360; while(d>=360) d-=360;
    out.push({rashi_idx:s, rashi:nm, oblique_ascension_deg:d,
      rising_minutes:d*1440/360.9856, share_of_day_percent:d/360*100});
  }
  return out;
}
try{ window.__masaOf=masaOf; window.__COMB=COMB; window.__risingTimes=risingTimes; }catch(e){}

var ASPECTS=[[0,"conjunction"],[60,"sextile"],[90,"square"],[120,"trine"],[180,"opposition"]];
function relations(tr,natal){
  var out=[];
  Object.keys(tr).forEach(function(t){
    Object.keys(natal).forEach(function(n){
      var sep=Math.abs(((tr[t].sid-natal[n].sid+180)%360+360)%360-180);
      ASPECTS.forEach(function(a){
        var orb=Math.abs(sep-a[0]);
        if(orb<=9){
          var sig=orb<1?"exact":(orb<5?"applying":"loose");
          out.push({transit_graha:SK[t],natal_graha:SK[n],aspect:a[1],orb_deg:orb,significance:sig});
        }});});});
  return out.sort(function(a,b){return a.orb_deg-b.orb_deg;});
}


var AVT={
 Sun:{Sun:[1,2,4,7,8,9,10,11],Moon:[3,6,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[3,5,6,9,10,11,12],
      Jupiter:[5,6,9,11],Venus:[6,7,12],Saturn:[1,2,4,7,8,9,10,11],Lagna:[3,4,6,10,11,12]},
 Moon:{Sun:[3,6,7,8,10,11],Moon:[1,3,6,7,10,11],Mars:[2,3,5,6,9,10,11],Mercury:[1,3,4,5,7,8,10,11],
      Jupiter:[1,4,7,8,10,11,12],Venus:[3,4,5,7,9,10,11],Saturn:[3,5,6,11],Lagna:[3,6,10,11]},
 Mars:{Sun:[3,5,6,10,11],Moon:[3,6,11],Mars:[1,2,4,7,8,10,11],Mercury:[3,5,6,11],
      Jupiter:[6,10,11,12],Venus:[6,8,11,12],Saturn:[1,4,7,8,9,10,11],Lagna:[1,3,6,10,11]},
 Mercury:{Sun:[5,6,9,11,12],Moon:[2,4,6,8,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[1,3,5,6,9,10,11,12],
      Jupiter:[6,8,11,12],Venus:[1,2,3,4,5,8,9,11],Saturn:[1,2,4,7,8,9,10,11],Lagna:[1,2,4,6,8,10,11]},
 Jupiter:{Sun:[1,2,3,4,7,8,9,10,11],Moon:[2,5,7,9,11],Mars:[1,2,4,7,8,10,11],Mercury:[1,2,4,5,6,9,10,11],
      Jupiter:[1,2,3,4,7,8,10,11],Venus:[2,5,6,9,10,11],Saturn:[3,5,6,12],Lagna:[1,2,4,5,6,7,9,10,11]},
 Venus:{Sun:[8,11,12],Moon:[1,2,3,4,5,8,9,11,12],Mars:[3,5,6,9,11,12],Mercury:[3,5,6,9,11],
      Jupiter:[5,8,9,10,11],Venus:[1,2,3,4,5,8,9,10,11],Saturn:[3,4,5,8,9,10,11],Lagna:[1,2,3,4,5,8,9,11]},
 Saturn:{Sun:[1,2,4,7,8,10,11],Moon:[3,6,11],Mars:[3,5,6,10,11,12],Mercury:[6,8,9,10,11,12],
      Jupiter:[5,6,11,12],Venus:[6,11,12],Saturn:[3,5,6,11],Lagna:[1,3,4,6,10,11]}
};
var AVORDER=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
/* The eight contributors, in the order the kakṣyā division uses — Saturn
   first and the Lagna last. The bhinnāṣṭakavarga sums their rows; the
   prastāra is the same computation with the sum not yet taken, and the
   kakṣyā scanner needs the rows rather than the sum, which is why they are
   kept rather than discarded. */
var AVCONTRIB=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon","Lagna"];
function ashtakavarga(signOf,lagnaSign){
  var bhinna=[],sarva=new Array(12).fill(0),prastara={};
  AVORDER.forEach(function(pl){
    var b=new Array(12).fill(0), rows={};
    AVCONTRIB.forEach(function(c){
      var list=AVT[pl][c]; if(!list) return;
      var from=(c==="Lagna")?lagnaSign:signOf[c];
      var r=new Array(12).fill(0);
      list.forEach(function(h){ r[(from+h-1)%12]=1; });
      rows[c]=r;
      for(var i=0;i<12;i++) b[i]+=r[i];
    });
    prastara[pl]=rows;
    var tot=b.reduce(function(a,x){return a+x;},0);
    bhinna.push({graha:pl,graha_sa:pl,total:tot,bindus:b});
    for(var i=0;i<12;i++) sarva[i]+=b[i];
  });
  return {bhinna:bhinna,sarva:sarva,prastara:prastara,kakshya_order:AVCONTRIB.slice(),
          sarva_total:sarva.reduce(function(a,x){return a+x;},0),
          natal_rashi_idx:(function(){var o={};AVORDER.forEach(function(p){o[p]=signOf[p];});o.Lagna=lagnaSign;return o;})()};
}

/* ---- yogas ---- */
function yogaList(ctx){
  var H=ctx.house, S=ctx.signOf, dig=ctx.dig, LS=ctx.LS, LORD=ctx.LORD, owns=ctx.owns, SKn=ctx.SK;
  var Y=[], kendra=[1,4,7,10], trikona=[1,5,9];
  function add(k,iast,en,cat,present,detail,strength,source){
    Y.push({key:k,iast:iast,en:en,category:cat,present:present,detail:detail,strength:strength,
            source:source||"BPHS"});}
  // Pancha Mahapurusha
  [["Rucaka","Mars"],["Bhadra","Mercury"],["Haṁsa","Jupiter"],["Mālavya","Venus"],["Śaśa","Saturn"]]
  .forEach(function(x){
    var nm=x[0],p=x[1],h=H[p],d=dig[p],ok=(d==="exalted"||d==="own"||d==="moolatrikona")&&kendra.indexOf(h)>=0;
    add(nm,nm,nm+" Yoga — "+p+" in own sign or exaltation in a kendra","Pañca-Mahāpuruṣa",ok,
      p+" at house "+h+(d==="exalted"||d==="own"||d==="moolatrikona"?" ("+d+")":" (neither own nor exalt)")+
      (kendra.indexOf(h)>=0?"":" — not in kendra"), ok?"medium":undefined);
  });
  // aspects (graha drishti) for conjunction/aspect tests
  var ASP={Sun:[6],Moon:[6],Mercury:[6],Venus:[6],Mars:[3,6,7],Jupiter:[4,6,8],Saturn:[2,6,9],Rahu:[6],Ketu:[6]};
  function related(a,b){ if(H[a]===H[b])return true;
    var off=ASP[a]||[6]; for(var i=0;i<off.length;i++) if(((H[a]-1+off[i])%12)+1===H[b]) return true;
    off=ASP[b]||[6]; for(var j=0;j<off.length;j++) if(((H[b]-1+off[j])%12)+1===H[a]) return true;
    return false; }
  function lordOf(h){ return LORD[(LS+h-1)%12]; }
  // Raja: kendra lord related to trikona lord
  var rj=[];
  kendra.forEach(function(k){ trikona.forEach(function(t){
    var a=lordOf(k),b=lordOf(t); if(a!==b&&related(a,b)){var s=a+" ↔ "+b; if(rj.indexOf(s)<0&&rj.indexOf(b+" ↔ "+a)<0)rj.push(s);} });});
  add("Raja","Rāja-yoga","Rāja-yoga — kendra-lord conjunct or aspecting trikona-lord","Rāja",rj.length>0,
      rj.length?"Active combinations: "+rj.join(", "):"No kendra-lord related to a trikona-lord", rj.length>1?"strong":"medium");
  // Dhana: lords of 2/5/9/11 related
  var dh=[],DH=[2,5,9,11];
  for(var i=0;i<DH.length;i++)for(var j=i+1;j<DH.length;j++){
    var a=lordOf(DH[i]),b=lordOf(DH[j]); if(a!==b&&related(a,b)) dh.push(a+"("+DH[i]+") ↔ "+b+"("+DH[j]+")"); }
  add("Dhana","Dhana-yoga","Dhana-yoga — lord of 2/5/9/11 conjunct or aspecting another","Dhana",dh.length>0,
      dh.length?"Active combinations: "+dh.join(", "):"No relation among the wealth-house lords", dh.length>1?"strong":"medium");
  // Gajakesari
  var gk=((H.Jupiter-H.Moon+12)%12+1); var gkk=[1,4,7,10].indexOf(gk)>=0;
  add("Gajakesari","Gaja-kesarī","Gaja-kesarī Yoga — Jupiter in mutual kendra with Moon","Special",gkk,
      "Jupiter is "+gk+" from Moon"+(gkk?" (kendra)":" (not kendra)"), gkk?"strong":undefined);
  // Vipareeta raja: lord of 6/8/12 in another 6/8/12
  var vp=[]; [6,8,12].forEach(function(d){ var l=lordOf(d); if([6,8,12].indexOf(H[l])>=0&&H[l]!==d) vp.push(l+" (lord "+d+") in "+H[l]); });
  add("ViparitaRaja","Viparīta-rāja","Viparīta-rāja Yoga — lord of 6/8/12 placed in another 6/8/12","Special",
      vp.length>0, vp.length?"Active: "+vp.join(", "):"No 6/8/12 lord placed in another 6/8/12", vp.length?"medium":undefined);
  // Nichabhanga: debilitated graha whose dispositor is in kendra/trikona
  var nb=[]; Object.keys(dig).forEach(function(p){ if(dig[p]==="debilitated"){
    var disp=LORD[S[p]]; if(kendra.concat(trikona).indexOf(H[disp])>=0) nb.push(p+" (debil) — dispositor "+disp+" at house "+H[disp]); }});
  var anyDeb=Object.keys(dig).some(function(p){return dig[p]==="debilitated";});
  add("NichabhangaRaja","Nīca-bhaṅga-rāja","Nīca-bhaṅga-rāja Yoga — debilitation cancelled by dispositor in kendra/trikona","Special",
      nb.length>0, nb.length?"Cancelled: "+nb.join(", "):(anyDeb?"A debilitated graha is present but its dispositor is not in a kendra or trikona":"No graha is debilitated in this chart"),
      nb.length?"medium":undefined);
  // Parijata: lagna lord in 9th or 10th
  var ll=lordOf(1), pj=(H[ll]===9||H[ll]===10);
  add("Parijata","Pārijāta-yoga","Pārijāta Yoga — lord of lagna in the 9th or 10th","Special",pj,
      "Lagneśa "+ll+" at house "+H[ll]+(pj?"":" (not 9 or 10)"), pj?"medium":undefined);
  // Lakshmi: Venus in 1st, or Venus + 9th lord together in a kendra
  var n9=lordOf(9), lk=(H.Venus===1)||(H.Venus===H[n9]&&kendra.indexOf(H.Venus)>=0);
  add("Lakshmi","Lakṣmī-yoga","Lakṣmī Yoga — Venus in the 1st, or Venus with the 9th lord in a kendra","Special",lk,
      lk?(H.Venus===1?"Venus placed in 1st house":"Venus + 9th-lord ("+n9+") conjunct in kendra (house "+H.Venus+")")
        :("Venus at house "+H.Venus+"; 9th-lord "+n9+" not co-located in a kendra"), lk?"strong":undefined);
  // Sarasvati: Mercury, Jupiter, Venus all in 1/4/5/7/10
  var good=[1,4,5,7,10], sv=[H.Mercury,H.Jupiter,H.Venus].every(function(h){return good.indexOf(h)>=0;});
  add("Sarasvati","Sarasvatī-yoga","Sarasvatī Yoga — Mercury, Jupiter and Venus all in 1/4/5/7/10","Special",sv,
      "Mercury at "+H.Mercury+", Jupiter at "+H.Jupiter+", Venus at "+H.Venus+(sv?"":" (not all in 1/4/5/7/10)"), sv?"strong":undefined);
  // Harihara-brahma (rare composite)
  var hb=(H.Saturn===6&&H.Mars===7&&H.Jupiter===8);
  add("HariharaBrahma","Harihara-brahma","Harihara-brahma Yoga — Saturn in 6, Mars in 7, Jupiter in 8","Special",hb,
      "Saturn at "+H.Saturn+", Mars at "+H.Mars+", Jupiter at "+H.Jupiter+(hb?"":" (not the 6-7-8 configuration)"), hb?"medium":undefined);
  /* ---- lunar yogas, BPHS Ch. 37 ---- */
  var OTHERS=["Mars","Mercury","Jupiter","Venus","Saturn"];   // "a planet other than the Sun"
  var BEN=["Jupiter","Venus","Mercury","Moon"];
  function fromMoon(p){ return ((H[p]-H.Moon+12)%12)+1; }
  var in2=OTHERS.filter(function(p){return fromMoon(p)===2;});
  var in12=OTHERS.filter(function(p){return fromMoon(p)===12;});
  var withMoon=OTHERS.filter(function(p){return fromMoon(p)===1;});
  var inKendraFromLagna=OTHERS.filter(function(p){return kendra.indexOf(H[p])>=0;});

  add("Sunapha","Sunaphā","Sunaphā Yoga — a graha other than the Sun in the 2nd from the Moon",
      "Lunar", in2.length>0,
      in2.length?in2.join(", ")+" in the 2nd from the Moon":"nothing in the 2nd from the Moon",
      in2.length?"medium":undefined,"BPHS Ch. 37, vv. 7–10");
  add("Anapha","Anaphā","Anaphā Yoga — a graha other than the Sun in the 12th from the Moon",
      "Lunar", in12.length>0,
      in12.length?in12.join(", ")+" in the 12th from the Moon":"nothing in the 12th from the Moon",
      in12.length?"medium":undefined,"BPHS Ch. 37, vv. 7–10");
  add("Durdhara","Durādharā","Durādharā Yoga — grahas other than the Sun in both the 2nd and the 12th from the Moon",
      "Lunar", in2.length>0&&in12.length>0,
      (in2.length&&in12.length)?in2.join(", ")+" in the 2nd and "+in12.join(", ")+" in the 12th"
        :"both sides are not occupied", (in2.length&&in12.length)?"strong":undefined,"BPHS Ch. 37, vv. 7–10");

  /* Kemadruma, in full: excluding the Sun, no graha with the Moon, none in the 2nd or
     12th from it, AND none in a kendra from the ascendant (Ch. 37, vv. 11–13). */
  var kem=(in2.length===0&&in12.length===0&&withMoon.length===0&&inKendraFromLagna.length===0);
  var kemWhy=[];
  if(withMoon.length) kemWhy.push(withMoon.join(", ")+" stands with the Moon");
  if(in2.length) kemWhy.push(in2.join(", ")+" in the 2nd from it");
  if(in12.length) kemWhy.push(in12.join(", ")+" in the 12th from it");
  if(inKendraFromLagna.length) kemWhy.push(inKendraFromLagna.join(", ")+" in a kendra from the lagna");
  add("Kemadruma","Kemadruma",
      "Kemadruma Yoga — the Moon wholly unattended: nothing with it, nothing in the 2nd or 12th from it, and nothing in a kendra from the lagna",
      "Subtractive", kem,
      kem?"Active — the Moon stands entirely alone":"Cancelled — "+kemWhy.join("; "),
      kem?"medium":undefined,"BPHS Ch. 37, vv. 11–13");

  var adhi=[6,7,8].map(function(r){
    return BEN.filter(function(b){ return b!=="Moon" && ((H[b]-H.Moon+12)%12)+1===r; }); });
  var adhiAll=adhi[0].length&&adhi[1].length&&adhi[2].length;
  add("Adhi","Adhi","Adhi Yoga — benefics occupying the 6th, 7th and 8th from the Moon","Lunar",!!adhiAll,
      adhiAll?"6th: "+adhi[0].join(",")+" · 7th: "+adhi[1].join(",")+" · 8th: "+adhi[2].join(",")
        :"benefics do not fill all three of the 6th, 7th and 8th from the Moon",
      adhiAll?"strong":undefined,"BPHS Ch. 37, v. 5");

  /* ---- solar yogas, BPHS Ch. 38 ---- */
  var SOL=["Mars","Mercury","Jupiter","Venus","Saturn"];      // "barring the Moon"
  function fromSun(p){ return ((H[p]-H.Sun+12)%12)+1; }
  var s2=SOL.filter(function(p){return fromSun(p)===2;});
  var s12=SOL.filter(function(p){return fromSun(p)===12;});
  add("Veshi","Veśi","Veśi Yoga — a graha other than the Moon in the 2nd from the Sun","Solar",s2.length>0,
      s2.length?s2.join(", ")+" in the 2nd from the Sun":"nothing in the 2nd from the Sun",
      s2.length?"medium":undefined,"BPHS Ch. 38, v. 1");
  add("Vasi","Vāsi","Vāsi Yoga — a graha other than the Moon in the 12th from the Sun","Solar",s12.length>0,
      s12.length?s12.join(", ")+" in the 12th from the Sun":"nothing in the 12th from the Sun",
      s12.length?"medium":undefined,"BPHS Ch. 38, v. 1");
  add("Obhayachari","Ubhayacārī","Ubhayacārī Yoga — grahas other than the Moon on both sides of the Sun",
      "Solar", s2.length>0&&s12.length>0,
      (s2.length&&s12.length)?s2.join(", ")+" in the 2nd and "+s12.join(", ")+" in the 12th"
        :"the Sun is not flanked on both sides", (s2.length&&s12.length)?"strong":undefined,"BPHS Ch. 38, v. 1");

  /* ---- further yogas of BPHS Ch. 36 ---- */
  var MAL=["Sun","Mars","Saturn","Rahu","Ketu"];
  function occupantsOfHouse(h){ return Object.keys(H).filter(function(p){return H[p]===h;}); }
  var tenthL=occupantsOfHouse(10), tenthM=Object.keys(H).filter(function(p){
    return ((H[p]-H.Moon+12)%12)+1===10; });
  function amalaSide(list){ return list.length>0 && list.every(function(p){return BEN.indexOf(p)>=0;}); }
  var amala=amalaSide(tenthL)||amalaSide(tenthM);
  add("Amala","Amala","Amala Yoga — only a benefic in the 10th from the lagna or from the Moon","Special",amala,
      amala?("10th from "+(amalaSide(tenthL)?"lagna: "+tenthL.join(", "):"Moon: "+tenthM.join(", ")))
        :"the 10th from lagna ("+(tenthL.join(", ")||"empty")+") and from the Moon ("+(tenthM.join(", ")||"empty")+") is not purely benefic",
      amala?"medium":undefined,"BPHS Ch. 36, vv. 5–6");

  var benKendra=BEN.filter(function(b){return kendra.indexOf(H[b])>=0;});
  var occ7=occupantsOfHouse(7), occ8=occupantsOfHouse(8);
  var clean78=occ7.concat(occ8).every(function(p){return BEN.indexOf(p)>=0;});
  var parvata=benKendra.length>0&&clean78;
  add("Parvata","Parvata","Parvata Yoga — benefics in kendras while the 7th and 8th are empty or hold only benefics",
      "Special",parvata,
      parvata?"benefics in kendras: "+benKendra.join(", ")+"; 7th/8th clear"
        :(benKendra.length?"7th/8th hold "+occ7.concat(occ8).join(", "):"no benefic occupies a kendra"),
      parvata?"medium":undefined,"BPHS Ch. 36, vv. 7–8");

  var l4=LORD[(LS+3)%12], l10=LORD[(LS+9)%12], lagL=LORD[LS];
  var kahalaA=(Math.abs(((H[l4]-H.Jupiter+12)%12))%3===0)&&kendra.indexOf(((H[l4]-H.Jupiter+12)%12)+1)>=0;
  var mutualK=(function(){ var r=((H[l4]-H.Jupiter+12)%12)+1; return r===1||r===4||r===7||r===10; })();
  var lagStrong=["exalted","own","moolatrikona"].indexOf(dig[lagL])>=0;
  var kahalaB=(["own","exalted","moolatrikona"].indexOf(dig[l4])>=0)&&(H[l4]===H[l10]);
  var kahala=(mutualK&&lagStrong)||kahalaB;
  add("Kahala","Kahala",
      "Kahala Yoga — the 4th lord and Jupiter in mutual kendras with a strong lagna lord, or the 4th lord in own/exaltation conjunct the 10th lord",
      "Special",kahala,
      kahala?(kahalaB?"4th lord "+l4+" ("+dig[l4]+") conjunct the 10th lord "+l10
        :"4th lord "+l4+" and Jupiter in mutual kendras, lagna lord "+lagL+" "+dig[lagL])
        :"4th lord "+l4+" and Jupiter not in mutual kendras; lagna lord "+lagL+" is "+dig[lagL],
      kahala?"medium":undefined,"BPHS Ch. 36, vv. 9–10");

  /* ---- combinations in common use that the uploaded BPHS text does not define
     under these names. Implemented with the most widely cited rule, and labelled
     so nobody mistakes them for Parāśara's own. ---- */
  /* ================= Nābhasa yogas, BPHS Ch. 35 =================
     The sage counts 32: 3 Āśraya, 2 Dala, 20 Ākṛti and 7 Saṅkhya. All are patterns
     in how the seven grahas distribute — the nodes are excluded, the text saying
     "all the 7 planets". The Saṅkhya seven are counted by how many signs are
     occupied, and v. 17 states none of them operates if another Nābhasa yoga is
     already derivable, which is applied below. */
  var NB=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var nbSigns=NB.map(function(p){return S[p];});
  var nbHouses=NB.map(function(p){return H[p];});
  function nbAllIn(list){ return nbHouses.every(function(h){return list.indexOf(h)>=0;}); }
  function nbAnyIn(list){ return nbHouses.some(function(h){return list.indexOf(h)>=0;}); }
  function nbOccupiedHouses(){ var o=[]; nbHouses.forEach(function(h){if(o.indexOf(h)<0)o.push(h);});
    return o.sort(function(a,b){return a-b;}); }
  function nbOccupiedSigns(){ var o=[]; nbSigns.forEach(function(s){if(o.indexOf(s)<0)o.push(s);});
    return o; }
  function nbRun(start,len){ var l=[]; for(var i=0;i<len;i++) l.push(((start-1+i)%12)+1); return l; }
  function nbModality(m){ return nbSigns.every(function(s){return s%3===m;}); }
  var nbFound=[];
  function nbAdd(key,iast,en,present,detail,cite){
    if(present) nbFound.push(iast);
    add(key,iast,en,"Nābhasa",present,detail,present?"medium":undefined,cite||"BPHS Ch. 35");
  }
  var MODN=["movable","fixed","dual"];
  nbAdd("Rajju","Rajju","Rajju Yoga — every graha in movable signs",nbModality(0),
     nbModality(0)?"all seven in movable signs":"the grahas are not all in movable signs","BPHS Ch. 35, v. 7");
  nbAdd("Musala","Musala","Musala Yoga — every graha in fixed signs",nbModality(1),
     nbModality(1)?"all seven in fixed signs":"the grahas are not all in fixed signs","BPHS Ch. 35, v. 7");
  nbAdd("Nala","Nala","Nala Yoga — every graha in dual signs",nbModality(2),
     nbModality(2)?"all seven in dual signs":"the grahas are not all in dual signs","BPHS Ch. 35, v. 7");

  var BEN2=["Jupiter","Venus","Mercury","Moon"];
  var kendraList=[1,4,7,10];
  var kOcc=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h;}); });
  var kBen=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)>=0;})
    && !NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)<0;}); });
  var kMal=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)<0;})
    && !NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)>=0;}); });
  nbAdd("Maala","Māla","Māla Yoga — three kendras occupied by benefics",kBen.length>=3,
     kBen.length+" kendras hold benefics only","BPHS Ch. 35, v. 8");
  nbAdd("SarpaNabhasa","Sarpa","Sarpa (Bhujaṅga) Yoga — three kendras occupied by malefics",kMal.length>=3,
     kMal.length+" kendras hold malefics only","BPHS Ch. 35, v. 8");

  var gada=[[1,4],[4,7],[7,10],[10,1]].some(function(pr){ return nbAllIn(pr); });
  nbAdd("Gada","Gadā","Gadā Yoga — every graha in two successive kendras",gada,
     gada?"the grahas fill two adjacent kendras":"not confined to two successive kendras","BPHS Ch. 35, vv. 9–11");
  nbAdd("SakataNabhasa","Śakaṭa","Śakaṭa Yoga (Nābhasa) — every graha in the 1st and 7th",nbAllIn([1,7]),
     nbAllIn([1,7])?"all seven across the 1st and 7th":"not confined to the 1st and 7th","BPHS Ch. 35, vv. 9–11");
  nbAdd("Vihaga","Vihaga","Vihaga Yoga — every graha in the 4th and 10th",nbAllIn([4,10]),
     nbAllIn([4,10])?"all seven across the 4th and 10th":"not confined to the 4th and 10th","BPHS Ch. 35, vv. 9–11");
  nbAdd("Sringataka","Śṛṅgāṭaka","Śṛṅgāṭaka Yoga — every graha in the 1st, 5th and 9th",nbAllIn([1,5,9]),
     nbAllIn([1,5,9])?"all seven in the trines":"not confined to the trines","BPHS Ch. 35, vv. 9–11");
  var hala=[[2,6,10],[3,7,11],[4,8,12]].some(function(g){return nbAllIn(g);});
  nbAdd("Hala","Hala","Hala Yoga — every graha in one trinal set: 2/6/10, 3/7/11 or 4/8/12",hala,
     hala?"the grahas fill one trinal set":"not confined to a single trinal set","BPHS Ch. 35, vv. 9–11");
  function allBenIn(list){ return BEN2.every(function(b){return list.indexOf(H[b])>=0;}); }
  function allMalIn(list){ var M=["Sun","Mars","Saturn"];
    return M.every(function(m){return list.indexOf(H[m])>=0;}); }
  var vajra=allBenIn([1,7])||allMalIn([4,10]);
  nbAdd("Vajra","Vajra","Vajra Yoga — benefics in the 1st and 7th, or malefics in the 4th and 10th",vajra,
     vajra?(allBenIn([1,7])?"benefics in the 1st and 7th":"malefics in the 4th and 10th")
       :"neither arrangement holds","BPHS Ch. 35, vv. 9–11");
  var yava=allBenIn([4,10])||allMalIn([1,7]);
  nbAdd("Yava","Yava","Yava Yoga — benefics in the 4th and 10th, or malefics in the 1st and 7th",yava,
     yava?(allBenIn([4,10])?"benefics in the 4th and 10th":"malefics in the 1st and 7th")
       :"neither arrangement holds","BPHS Ch. 35, vv. 9–11");
  nbAdd("Kamala","Kamala","Kamala Yoga — every graha in the four kendras",nbAllIn([1,4,7,10]),
     nbAllIn([1,4,7,10])?"all seven in kendras":"not confined to the kendras","BPHS Ch. 35, v. 12");
  var vapi=nbAllIn([3,6,9,12])||nbAllIn([2,5,8,11]);
  nbAdd("Vapi","Vāpī","Vāpī Yoga — every graha in the cadent houses or in the succedent houses",vapi,
     vapi?(nbAllIn([3,6,9,12])?"all seven in cadent houses":"all seven in succedent houses")
       :"spread across kendras as well","BPHS Ch. 35, v. 12");
  [["Yupa","Yūpa",1],["Sara","Śara",4],["Sakthi","Śakti",7],["Danda","Daṇḍa",10]].forEach(function(x){
    var run=nbRun(x[2],4), ok=nbAllIn(run);
    nbAdd(x[0],x[1],x[1]+" Yoga — every graha within the four houses from the "+x[2]+
       (x[2]===1?"st":x[2]===4?"th":"th"),ok,
       ok?"all seven within houses "+run.join(", "):"not confined to houses "+run.join(", "),
       "BPHS Ch. 35, v. 13");
  });
  [["Nauka","Naukā",1],["Koota","Kūṭa",4],["Chatra","Chatra",7],["Chapa","Chāpa",10]].forEach(function(x){
    var run=nbRun(x[2],7), ok=nbAllIn(run);
    nbAdd(x[0],x[1],x[1]+" Yoga — every graha within the seven houses from the "+x[2]+"th",ok,
       ok?"all seven within houses "+run.join(", "):"not confined to houses "+run.join(", "),
       "BPHS Ch. 35, v. 14");
  });
  nbAdd("Chakra","Chakra","Chakra Yoga — every graha in alternate houses from the lagna",nbAllIn([1,3,5,7,9,11]),
     nbAllIn([1,3,5,7,9,11])?"all seven in the odd houses":"not confined to the odd houses","BPHS Ch. 35, v. 15");
  nbAdd("Samudra","Samudra","Samudra Yoga — every graha in alternate houses from the 2nd",nbAllIn([2,4,6,8,10,12]),
     nbAllIn([2,4,6,8,10,12])?"all seven in the even houses":"not confined to the even houses","BPHS Ch. 35, v. 15");
  /* Ardhachandra is named among the twenty but the uploaded text gives no formation
     verse for it; the widely used rule is seven grahas in seven consecutive houses
     that do not begin at a kendra. Flagged rather than presented as Parāśara's. */
  var ardha=(function(){
    for(var s=1;s<=12;s++){ if([1,4,7,10].indexOf(s)>=0) continue;
      if(nbAllIn(nbRun(s,7))) return s; }
    return 0;
  })();
  nbAdd("Ardhachandra","Ardhacandra",
     "Ardhacandra Yoga — every graha in seven consecutive houses beginning away from a kendra",ardha>0,
     ardha>0?"a run of seven beginning at house "+ardha:"no such run",
     "BPHS Ch. 35 names this among the twenty Ākṛti yogas, but the uploaded text gives "+
     "no formation verse for it; the commonly used rule is applied here");

  var occSigns=nbOccupiedSigns().length;
  var SANKHYA=[[1,"Gola","Gola"],[2,"Yuga","Yuga"],[3,"Soola","Śūla"],[4,"Kedara","Kedāra"],
               [5,"Pasa","Pāśa"],[6,"Dama","Dāma"],[7,"Veena","Vīṇā"]];
  var priorNabhasa=nbFound.length>0;
  SANKHYA.forEach(function(x){
    var forms=(occSigns===x[0])&&!priorNabhasa;
    add(x[1],x[2],x[2]+" Yoga — the seven grahas confined to exactly "+x[0]+" sign"+(x[0]>1?"s":""),
        "Nābhasa (Saṅkhya)",forms,
        (occSigns===x[0])?(priorNabhasa?"the count matches, but "+nbFound.join(", ")+
          " already applies, and v. 17 sets the Saṅkhya yogas aside when another Nābhasa yoga is derivable"
          :"the grahas occupy exactly "+x[0]+" sign"+(x[0]>1?"s":""))
          :"the grahas occupy "+occSigns+" signs",
        forms?"medium":undefined,"BPHS Ch. 35, vv. 16–17");
  });

  /* ============ the remaining yogas of BPHS Ch. 36 ============ */
  function lordOf(h){ return LORD[(LS+h-1)%12]; }
  function houseOfP(p){ return H[p]; }
  function strongP(p){ return ["exalted","own","moolatrikona"].indexOf(dig[p])>=0; }
  function occOf(h){ return Object.keys(H).filter(function(p){return H[p]===h;}); }
  function benOnly(h){ var o=occOf(h); return o.length>0&&o.every(function(p){return BEN2.indexOf(p)>=0;}); }
  function malOnly(h){ var o=occOf(h); return o.length>0&&o.every(function(p){return BEN2.indexOf(p)<0;}); }
  function relFrom(p,n){ return ((H[p]-1+n-1)%12)+1; }
  function benIn(h){ return occOf(h).some(function(p){return BEN2.indexOf(p)>=0;}); }
  function c36(k,iast,en,ok,detail,cite){
    add(k,iast,en,"Ch. 36 Rāja-yoga",ok,detail,ok?"medium":undefined,cite);
  }
  var lagLord=lordOf(1), l2=lordOf(2), l5=lordOf(5), l6=lordOf(6), l7=lordOf(7),
      l9=lordOf(9), l10x=lordOf(10);

  var cham=(dig[lagLord]==="exalted"&&kendra.indexOf(H[lagLord])>=0&&
            ((H.Jupiter-1+6)%12)+1===H[lagLord]) ||
           [1,7,9,10].some(function(h){ return occOf(h).filter(function(p){
             return BEN2.indexOf(p)>=0;}).length>=2; });
  c36("Chamara","Chāmara","Chāmara Yoga — the lagna lord exalted in a kendra and aspected by Jupiter, or two benefics in the 1st, 7th, 9th or 10th",
      cham, cham?"the condition is met":"lagna lord "+lagLord+" is "+dig[lagLord]+
      " at house "+H[lagLord]+", and no two benefics share the 1st, 7th, 9th or 10th","BPHS Ch. 36, vv. 11–12");

  var sankhaA=strongP(lagLord)&&([1,4,7,10].indexOf(((H[l5]-H[l6]+12)%12)+1)>=0);
  var sankhaB=(S[lagLord]%3===0)&&(H[lagLord]===H[l10x])&&strongP(l9);
  c36("Sankha","Śaṅkha","Śaṅkha Yoga — a strong lagna lord with the 5th and 6th lords in mutual kendras, or the lagna and 10th lords together in a movable sign with a strong 9th lord",
      sankhaA||sankhaB, (sankhaA||sankhaB)?"the condition is met"
        :"lagna lord "+lagLord+" ("+dig[lagLord]+"); 5th lord "+l5+" and 6th lord "+l6+" are "+
         (((H[l5]-H[l6]+12)%12)+1)+" apart","BPHS Ch. 36, vv. 13–14");

  var bheriA=[12,1,2,7].every(function(h){return occOf(h).length>0;})&&strongP(l9);
  var bheriB=[H.Venus,H.Jupiter,H[lagLord]].every(function(h){return kendra.indexOf(h)>=0;})&&strongP(l9);
  c36("Bheri","Bherī","Bherī Yoga — the 12th, 1st, 2nd and 7th all occupied with a strong 9th lord, or Venus, Jupiter and the lagna lord in kendras with a strong 9th lord",
      bheriA||bheriB,(bheriA||bheriB)?"the condition is met"
        :"9th lord "+l9+" is "+dig[l9],"BPHS Ch. 36, vv. 15–16");

  var mrid=strongP(lagLord)&&NB.filter(function(p){return p!==lagLord;}).every(function(p){
    return kendra.indexOf(H[p])>=0||trikona.indexOf(H[p])>=0||strongP(p); });
  c36("Mridanga","Mṛdaṅga","Mṛdaṅga Yoga — a strong lagna lord while the other grahas hold kendras, trikoṇas, own signs or exaltation",
      mrid, mrid?"lagna lord "+lagLord+" is "+dig[lagLord]+" and the rest are well placed"
        :"lagna lord "+lagLord+" is "+dig[lagLord]+", or some graha is otherwise placed","BPHS Ch. 36, v. 17");

  var srin=(H[l7]===10)&&(dig[l10x]==="exalted")&&(H[l10x]===H[l9]);
  c36("Srinatha","Śrīnātha","Śrīnātha Yoga — the 7th lord in the 10th while the 10th lord is exalted and joined to the 9th lord",
      srin, srin?"the condition is met":"7th lord "+l7+" at house "+H[l7]+
      ", 10th lord "+l10x+" is "+dig[l10x],"BPHS Ch. 36, v. 18");

  var saradaA=(H[l10x]===5)&&kendra.indexOf(H.Mercury)>=0&&(S.Sun===4)&&strongP("Sun");
  var saradaB=[1,5,9].indexOf(((H.Jupiter-H.Moon+12)%12)+1)>=0||
              [1,5,9].indexOf(((H.Mercury-H.Moon+12)%12)+1)>=0;
  var sarada=saradaA||(saradaB&&H.Mars===11);
  c36("Sarada","Śāradā","Śāradā Yoga — the 10th lord in the 5th with Mercury in a kendra and a strong Sun in Siṃha, or Jupiter/Mercury trinal to the Moon with Mars in the 11th",
      sarada, sarada?"the condition is met":"Mars is at house "+H.Mars+
      "; 10th lord "+l10x+" at "+H[l10x],"BPHS Ch. 36, vv. 19–20");

  var matsya=benIn(9)&&benIn(1)&&occOf(5).length>0&&malOnly(4)&&malOnly(8);
  c36("Matsya","Matsya","Matsya Yoga — benefics in the 1st and 9th, mixed grahas in the 5th, malefics in the 4th and 8th",
      matsya, matsya?"the condition is met":"the 4th holds "+(occOf(4).join(", ")||"nothing")+
      " and the 8th "+(occOf(8).join(", ")||"nothing"),"BPHS Ch. 36, vv. 21–22");

  function wellPlaced(p){ return ["exalted","own","moolatrikona","friend"].indexOf(dig[p])>=0; }
  var koorma=[5,6,7].every(function(h){ var o=occOf(h);
      return o.length>0&&o.every(function(p){return BEN2.indexOf(p)>=0&&wellPlaced(p);}); })&&
    [3,11].every(function(h){ return malOnly(h); })&&strongP(lagLord)&&H[lagLord]===1;
  c36("Koorma","Kūrma","Kūrma Yoga — well-dignified benefics in the 5th, 6th and 7th, malefics in the 3rd and 11th, and the lagna lord strong in the lagna",
      koorma, koorma?"the condition is met":"the 5th, 6th and 7th are not all held by dignified benefics","BPHS Ch. 36, vv. 23–24");

  var khadga=(S[l2]===((LS+8)%12))&&(S[l9]===((LS+1)%12))&&
             (kendra.indexOf(H[lagLord])>=0||trikona.indexOf(H[lagLord])>=0);
  c36("Khadga","Khaḍga","Khaḍga Yoga — an exchange of signs between the 2nd and 9th lords while the lagna lord holds a kendra or trikoṇa",
      khadga, khadga?"2nd lord "+l2+" and 9th lord "+l9+" have exchanged signs"
        :"no exchange between the 2nd lord "+l2+" and the 9th lord "+l9,"BPHS Ch. 36, vv. 25–26");

  var kusuma=(LS%3===1)&&kendra.indexOf(H.Venus)>=0&&
             trikona.indexOf(H.Moon)>=0&&occOf(H.Moon).some(function(p){
               return p!=="Moon"&&BEN2.indexOf(p)>=0; })&&H.Saturn===10;
  c36("Kusuma","Kusuma","Kusuma Yoga — a fixed lagna, Venus in a kendra, the Moon trinal with a benefic, and Saturn in the 10th",
      kusuma, kusuma?"the condition is met":"the lagna is "+MODN[LS%3]+
      "; Venus at "+H.Venus+", Moon at "+H.Moon+", Saturn at "+H.Saturn,"BPHS Ch. 36, vv. 29–30");

  var kalan=[2,5].indexOf(H.Jupiter)>=0&&
    (((H.Mercury-1+6)%12)+1===H.Jupiter||H.Mercury===H.Jupiter)&&
    (((H.Venus-1+6)%12)+1===H.Jupiter||H.Venus===H.Jupiter);
  c36("Kalanidhi","Kalānidhi","Kalānidhi Yoga — Jupiter in the 2nd or 5th, aspected or joined by both Mercury and Venus",
      kalan, kalan?"Jupiter at house "+H.Jupiter+", met by Mercury and Venus"
        :"Jupiter is at house "+H.Jupiter,"BPHS Ch. 36, vv. 31–32");

  var kd=(function(){
    var a=lagLord, b=LORD[S[a]], c=LORD[S[b]], dsp=null;
    try{ dsp=LORD[Math.floor(((ctx.navamsa&&ctx.navamsa[c])!=null?ctx.navamsa[c]:S[c]))]; }catch(e){ dsp=LORD[S[c]]; }
    var chain=[a,b,c,dsp].filter(Boolean);
    return {chain:chain, ok:chain.every(function(x){
      return kendra.indexOf(H[x])>=0||trikona.indexOf(H[x])>=0||dig[x]==="exalted"; })};
  })();
  c36("Kalpadruma","Kalpadruma","Kalpadruma (Pārijāta) Yoga — the lagna lord, its dispositor, that dispositor's dispositor and the last one's navāṃśa dispositor all in kendras, trikoṇas or exaltation",
      kd.ok, "chain: "+kd.chain.join(" → ")+(kd.ok?" — all well placed":" — not all in kendras, trikoṇas or exaltation"),
      "BPHS Ch. 36, vv. 33–34");

  function trioFrom(p,offs){ return offs.every(function(n){
    var h=relFrom(p,n); return occOf(h).some(function(q){return BEN2.indexOf(q)>=0;}); }); }
  var hari=trioFrom(l2,[2,12,8]), hara=trioFrom(l7,[4,9,8]), brahma=trioFrom(lagLord,[4,10,11]);
  c36("Hari","Hari","Hari Yoga — benefics in the 2nd, 12th and 8th from the sign held by the 2nd lord",hari,
      "from "+l2+" at house "+H[l2],"BPHS Ch. 36, vv. 35–36");
  c36("Hara","Hara","Hara Yoga — benefics in the 4th, 9th and 8th from the sign held by the 7th lord",hara,
      "from "+l7+" at house "+H[l7],"BPHS Ch. 36, vv. 35–36");
  c36("Brahma","Brahmā","Brahmā Yoga — benefics in the 4th, 10th and 11th from the sign held by the lagna lord",brahma,
      "from "+lagLord+" at house "+H[lagLord],"BPHS Ch. 36, vv. 35–36");

  var lagnadhiOcc=occOf(7).concat(occOf(8));
  var lagnadhi=lagnadhiOcc.length>0&&lagnadhiOcc.every(function(p){return BEN2.indexOf(p)>=0;});
  c36("Lagnadhi","Lagnādhi","Lagnādhi Yoga — benefics in the 7th and 8th from the lagna, free of malefic company",
      lagnadhi, lagnadhi?"7th and 8th hold only benefics: "+lagnadhiOcc.join(", ")
        :"the 7th and 8th hold "+(lagnadhiOcc.join(", ")||"nothing"),
      "BPHS Ch. 36, v. 37. The sage names only the 7th and 8th; some editions add the 6th.");

  var LATER="later tradition — not found under this name in BPHS";

  var mangalaHouses=[1,2,4,7,8,12];
  var mFromLagna=mangalaHouses.indexOf(H.Mars)>=0;
  var mFromMoon=mangalaHouses.indexOf(((H.Mars-H.Moon+12)%12)+1)>=0;
  var mFromVenus=mangalaHouses.indexOf(((H.Mars-H.Venus+12)%12)+1)>=0;
  var mdCancels=[];
  if(["own","exalted","moolatrikona"].indexOf(dig.Mars)>=0)
    mdCancels.push("Mars is "+dig.Mars);
  if(H.Mars===H.Jupiter||H.Mars===H.Moon)
    mdCancels.push("Mars is with "+(H.Mars===H.Jupiter?"Jupiter":"the Moon"));
  if(((H.Jupiter-1+6)%12)+1===H.Mars) mdCancels.push("Jupiter aspects Mars");
  var md=mFromLagna||mFromMoon||mFromVenus;
  add("MangalaDosha","Maṅgala Doṣa",
      "Maṅgala Doṣa — Mars in the 1st, 2nd, 4th, 7th, 8th or 12th, counted from the lagna, the Moon or Venus",
      "Doṣa (later tradition)", md,
      (md?("Mars falls there from "+[mFromLagna?"the lagna":null,mFromMoon?"the Moon":null,
           mFromVenus?"Venus":null].filter(Boolean).join(", ")):"Mars avoids those houses from all three")+
      (mdCancels.length?" — mitigations present: "+mdCancels.join("; "):""),
      md?(mdCancels.length?"weak":"medium"):undefined,
      LATER+". House sets and cancellations differ widely by region; the 2nd house and the "+
      "reckoning from Venus are included here but are not universal. Treat as a prompt for "+
      "discussion, never as a verdict on a marriage.");

  var nodeSpan=(function(){
    var r=H.Rahu, k=H.Ketu, between=0, tot=0;
    ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].forEach(function(p){
      tot++; var d=((H[p]-r+12)%12); if(d>=0&&d<((k-r+12)%12)) between++; });
    return {between:between, total:tot};
  })();
  var ks=(nodeSpan.between===7||nodeSpan.between===0);
  add("KalaSarpa","Kāla Sarpa",
      "Kāla Sarpa — all seven grahas confined to the semicircle between Rāhu and Ketu",
      "Doṣa (later tradition)", ks,
      ks?"all seven lie on one side of the nodal axis":nodeSpan.between+" of 7 grahas lie between Rāhu and Ketu, so the axis is broken",
      ks?"medium":undefined,
      LATER+". A modern formulation; sources differ on whether the nodes must hem the "+
      "grahas exactly and on what counts as partial.");

  var cm=related("Moon","Mars");
  add("ChandraMangala","Candra-Maṅgala","Candra-Maṅgala Yoga — the Moon and Mars conjunct or in mutual aspect",
      "Special (later tradition)", cm,
      cm?"Moon at "+H.Moon+" and Mars at "+H.Mars+" are "+(H.Moon===H.Mars?"conjunct":"in mutual aspect")
        :"Moon at "+H.Moon+", Mars at "+H.Mars+" — unrelated", cm?"medium":undefined, LATER);

  var shk=[6,8,12].indexOf(((H.Moon-H.Jupiter+12)%12)+1)>=0;
  add("Shakata","Śakaṭa","Śakaṭa Yoga — the Moon in the 6th, 8th or 12th from Jupiter",
      "Subtractive (later tradition)", shk,
      "the Moon is "+(((H.Moon-H.Jupiter+12)%12)+1)+" from Jupiter",
      shk?"medium":undefined,
      LATER+". BPHS Ch. 35 has a Śakaṭa among the Nābhasa yogas, which is a different "+
      "combination altogether; this Moon-and-Jupiter rule comes from later works.");

  var kendraOcc=kendra.filter(function(h){ return occupantsOfHouse(h).length>0; });
  add("Chatussagara","Catuḥsāgara","Catuḥsāgara Yoga — all four kendras occupied",
      "Special (later tradition)", kendraOcc.length===4,
      kendraOcc.length+" of the four kendras are occupied", kendraOcc.length===4?"strong":undefined, LATER);

  var upa=[3,6,10,11];
  var vasu=BEN.filter(function(b){ return upa.indexOf(H[b])>=0; });
  add("Vasumati","Vasumatī","Vasumatī Yoga — benefics in the upachaya houses 3, 6, 10 and 11",
      "Dhana (later tradition)", vasu.length>0,
      vasu.length?vasu.join(", ")+" in upachayas":"no benefic occupies an upachaya",
      vasu.length>=3?"strong":(vasu.length?"medium":undefined), LATER);

  var rl=(BEN.indexOf("Jupiter")>=0&&kendra.indexOf(H.Jupiter)>=0)&&
         (dig.Moon!=="debilitated")&&(kendra.indexOf(H.Venus)>=0||trikona.indexOf(H.Venus)>=0);
  add("Rajalakshana","Rājalakṣaṇa","Rājalakṣaṇa Yoga — Jupiter in a kendra, Venus in a kendra or trikoṇa, the Moon unafflicted by debilitation",
      "Special (later tradition)", rl,
      "Jupiter at "+H.Jupiter+", Venus at "+H.Venus+", Moon "+dig.Moon, rl?"medium":undefined, LATER);

  var dus=[6,8,12];
  var vcb=(dus.indexOf(H[lagL])>=0)&&Object.keys(H).some(function(p){
    return MAL.indexOf(p)>=0&&H[p]===H[lagL]; });
  add("VanchanaChoraBheeti","Vañcana-cora-bhīti",
      "Vañcana-cora-bhīti Yoga — the lagna lord in a dusthāna together with a malefic",
      "Subtractive (later tradition)", vcb,
      "lagna lord "+lagL+" at house "+H[lagL]+(vcb?", with a malefic":""), vcb?"medium":undefined,
      LATER+". Definitions vary considerably; read it as a caution about misplaced trust, "+
      "not as a statement about anyone's honesty.");

  var occHouses=[];
  Object.keys(H).forEach(function(p){ if(occHouses.indexOf(H[p])<0) occHouses.push(H[p]); });
  occHouses.sort(function(a,b){return a-b;});
  var consecutive=(function(){
    if(!occHouses.length) return false;
    for(var i=1;i<occHouses.length;i++) if(occHouses[i]!==occHouses[i-1]+1) return false;
    return true;
  })();
  add("LagnaMallika","Lagna Mallikā","Lagna Mallikā Yoga — every graha in an unbroken run of houses from the lagna",
      "Special (later tradition)", consecutive&&occHouses[0]===1,
      "grahas occupy houses "+occHouses.join(", "),
      (consecutive&&occHouses[0]===1)?"medium":undefined,
      LATER+". Closely related to the Nābhasa Mālā and Sṛṅgāṭaka family in BPHS Ch. 35; "+
      "the name and the exact run differ between authors.");
  return Y;
}

/* ---- Bhayāt / Bhabhoga (needs the Moon's daily speed) ---- */
function bhayat(moonSid,moonSpeed,jd,date,ay){
  if(!moonSpeed||moonSpeed<=0) return null;
  var seg=40/3, x=((moonSid%360)+360)%360, i=Math.floor(x/seg);
  var start=i*seg, end=(i+1)*seg;
  // solve for the instants the Moon actually crosses the nakshatra boundaries
  function moonAt(ms){ var d=new Date(ms);
    var jd2=jd+(ms-date.getTime())/86400000;
    return ((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,d,true)).elon-ayanamsa(jd2))%360+360)%360; }
  function cross(target,guessDays){
    var t=date.getTime()+guessDays*86400000;
    for(var k=0;k<40;k++){
      var v=moonAt(t), diff=((v-target+180)%360+360)%360-180;
      if(Math.abs(diff)<1e-7) break;
      t-=diff/moonSpeed*86400000;
    }
    return t; }
  var tIn=cross(start,-(x-start)/moonSpeed), tOut=cross(end,(end-x)/moonSpeed);
  var bhDays=(date.getTime()-tIn)/86400000, bbDays=(tOut-tIn)/86400000;
  return {bhayat_ghatis:bhDays*60, bhabhoga_ghatis:bbDays*60,
          entry_jd:jd-bhDays, exit_jd:jd+(tOut-date.getTime())/86400000};
}



var EXALT={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6},
    DEBIL={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0},
    OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]},
    MTR={Sun:[4,0,20],Moon:[1,3,30],Mars:[0,0,12],Mercury:[5,15,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]},
    FRD={Sun:["Moon","Mars","Jupiter"],Moon:["Sun","Mercury"],Mars:["Sun","Moon","Jupiter"],Mercury:["Sun","Venus"],
         Jupiter:["Sun","Moon","Mars"],Venus:["Mercury","Saturn"],Saturn:["Mercury","Venus"]},
    ENM={Sun:["Venus","Saturn"],Moon:[],Mars:["Mercury"],Mercury:["Moon"],Jupiter:["Mercury","Venus"],
         Venus:["Sun","Moon"],Saturn:["Sun","Moon","Mars"]};
function digOf(p,s,d){ if(p==="Rahu"||p==="Ketu")return "node";
  if(s===EXALT[p])return "exalted"; if(s===DEBIL[p])return "debilitated";
  var m=MTR[p]; if(m&&s===m[0]&&d!=null&&d>=m[1]&&d<m[2])return "moolatrikona";
  if(OWNS[p].indexOf(s)>=0)return "own"; var l=LORD[s];
  if(l===p)return "own"; if(FRD[p].indexOf(l)>=0)return "friend"; if(ENM[p].indexOf(l)>=0)return "enemy"; return "neutral";}


var SB_NAIS={Sun:60,Moon:51.43,Venus:42.86,Jupiter:34.29,Mercury:25.71,Mars:17.14,Saturn:8.57};
var SB_REQ={Sun:6.5,Moon:6.0,Mars:5.0,Mercury:7.0,Jupiter:6.5,Venus:5.5,Saturn:5.0};
var SB_DIG={Sun:10,Mars:10,Moon:4,Venus:4,Mercury:1,Jupiter:1,Saturn:7};   // house of maximum dig bala
var SB_SEVEN=["D1","D2","D3","D7","D9","D12","D30"];
/* Saptavargaja ladders. THE TWO TRADITIONS GENUINELY DIFFER HERE and the
 * difference is not a rounding of one into the other.
 *   BPHS  Ch. 26, vv. 2–4 : 45 / 30 / 20 / 15 / 10 / 4 / 2   (quoted verbatim)
 *   Śrīpati Adh. 3, śl. 2–3: ¾ ½ ⅜ ¼ ⅛ 1/16 1/32 of a rūpa
 *                       = 45 / 30 / 22.5 / 15 / 7.5 / 3.75 / 1.875
 * They agree only at moolatrikona, svakṣetra and mitra. Subrahmanya Sastri
 * quotes the Parāśara ladder at p.28 and says plainly it is NOT the one he
 * adopts, so this is a deliberate divergence in the sources, not an error in
 * either. Neither is "corrected" into the other. */
var SB_VAL={exalted:45,moolatrikona:45,own:30,greatfriend:20,friend:15,neutral:10,enemy:4,greatenemy:2};
var SB_VAL_SP={exalted:45,moolatrikona:45,own:30,greatfriend:22.5,friend:15,neutral:7.5,enemy:3.75,greatenemy:1.875};
var SB_MALE=["Sun","Mars","Jupiter"], SB_FEM=["Moon","Venus"], SB_NEU=["Mercury","Saturn"];
var SB_NIGHT=["Moon","Mars","Saturn"], SB_DAY=["Sun","Jupiter","Venus"];
var SB_BEN=["Jupiter","Venus","Mercury","Moon"];
var DAYLORD=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
var HORA_SEQ=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];   // Chaldean order

function sbDeepDebil(p){ var E={Sun:10,Moon:3,Mars:28,Mercury:15,Jupiter:5,Venus:27,Saturn:20},
  D={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
  return D[p]*30+E[p]; }
function sbUchcha(p,sid){ var d=Math.abs(((sid-sbDeepDebil(p))%360+360)%360);
  if(d>180)d=360-d; return d/3; }                                   // 0 at debilitation, 60 at exaltation
function sbCompound(p,other,houseP,houseO,natFriend){
  var d=((houseO-houseP)%12+12)%12+1;
  var temp=([2,3,4,10,11,12].indexOf(d)>=0)?"friend":"enemy";
  var nat=natFriend(p,other);
  if(nat==="friend"&&temp==="friend")return "greatfriend";
  if(nat==="enemy"&&temp==="enemy")return "greatenemy";
  if(nat==="neutral"&&temp==="friend")return "friend";
  if(nat==="neutral"&&temp==="enemy")return "enemy";
  if(nat==="friend"&&temp==="enemy")return "neutral";
  if(nat==="enemy"&&temp==="friend")return "neutral";
  return "neutral";
}
/* Sphuta Drishti — BPHS Ch. 26, vv. 1–12. The aspectual angle is measured from the
   aspecting planet to the aspected point; the six rules below give the value in Virupas,
   with the extra allowances the sage specifies for Mars, Jupiter and Saturn. */
/* ===== ŚRĪPATI'S DṚṢṬI — Adh. 2, śl. 5–6 and the table at p.18 ============
 *
 * A different function from the BPHS speculum below, not a variant of it.
 * Śrīpati tabulates the aspect in QUARTERS of a rūpa against the excess of
 * the aspected point over the aspecting graha, measured in whole rāśis, and
 * interpolates linearly across the degrees within a rāśi:
 *
 *   excess   1  2  3  4  5  6  7  8  9 10 11 12
 *   quarters 0  1  3  2  0  4  3  2  1  0  0  0
 *
 * Zero at an excess of 1 and 11 is his "planets do not see the 2nd and 12th
 * houses" (p.20); four at an excess of 6 is the full opposition at one rūpa.
 *
 * THE PER-GRAHA SUBSTITUTIONS ARE THE SUPER-ADD, not something beside it.
 * Śloka 5 says to superadd ¾, ½ and ¼ of a rūpa to Saturn, Jupiter and Mars
 * on their special aspects; śloka 6 and the table say to substitute 4 for
 * Saturn at an excess of 2 and 9, for Jupiter at 4 and 8, and for Mars at 3
 * and 7. In quarters those are +3, +2 and +1 on base values of 1, 2 and 3 —
 * the same rule written twice. Recognising that is what makes it safe to
 * implement the table alone and not add the superadd again on top, which
 * would double it.
 *
 * This is the super-add the engine DECLINED under BPHS Ch. 27 v. 19, after
 * deliberation recorded at sphutaDrishti below: there the translator's
 * shortcut would have pushed the value past the one rūpa its own verse
 * ceilings. Here it does not — the table tops out at 4 quarters by
 * construction — and Śrīpati states it in his own text rather than in a
 * note. So the same idea is right in one paddhati and wrong in the other,
 * which is exactly why they are separate functions.
 *
 * VERIFIED: all 21 populated cells of his Grahadrigbala table (p.20) are
 * reproduced to three decimals from his own longitudes. */
var SP_DRG_BASE=[0,1,3,2,0,4,3,2,1,0,0,0];
var SP_DRG_SPECIAL={Jupiter:{4:4,8:4},Saturn:{2:4,9:4},Mars:{3:4,7:4}};
function sripatiDrishti(aspector,lonFrom,lonTo){
  var ex=(((lonTo-lonFrom)%360+360)%360)/30;        /* excess in rāśis, 0..12 */
  var t=SP_DRG_BASE.slice(), sp=SP_DRG_SPECIAL[aspector];
  if(sp) for(var k in sp) if(Object.prototype.hasOwnProperty.call(sp,k)) t[(+k)-1]=sp[k];
  var n=Math.floor(ex), frac=ex-n;
  /* value at integer excess n, and at n+1; an excess of 0 is the 12th entry */
  var a=t[(n===0?12:n)-1], b=t[(n+1>12?1:n+1)-1];
  var q=a+(b-a)*frac;                                /* quarters of a rūpa */
  return Math.max(0,Math.min(60,q*15));              /* → virūpas */
}
function sphutaDrishti(aspector,lonFrom,lonTo){
  var d=((lonTo-lonFrom)%360+360)%360, v=0;
  if(d>30&&d<=60)        v=(d-30)/2;
  else if(d>60&&d<=90)   v=(d-60)+15;
  else if(d>90&&d<=120)  v=(120-d)/2+30;
  else if(d>120&&d<=150) v=150-d;
  else if(d>150&&d<=180) v=(d-150)*2;
  else if(d>180&&d<300)  v=(300-d)/2;
  if(aspector==="Mars"    && ((d>=90&&d<=120)||(d>=210&&d<=240))) v+=15;
  if(aspector==="Jupiter" && ((d>=120&&d<=150)||(d>=240&&d<=270))) v+=30;
  if(aspector==="Saturn"  && ((d>=60&&d<=90)  ||(d>=270&&d<=300))) v+=45;
  /* The 60-virupa ceiling is deliberate and the text supports it. Ch. 26's
     Speculum of Aspectual Values peaks at 45.00 at a 90-degree aspect and
     reaches 60 only at the full opposition, and Saturn's own verses (Ch. 26,
     vv. 9-10) compute the 60-90 range as "the degrees etc. (in excess of 2
     signs) be halved and deducted from 60" — descending from 60 to 45, never
     above one rupa. The three special allowances above come from the
     TRANSLATOR'S NOTE, which offers "add 45 virupas to the speculum value"
     for Saturn as a shortcut; in that range the shortcut would yield up to
     90, contradicting the verse it summarises. Where the two disagree we
     follow the verse, so the clamp is what keeps the shortcut inside the
     one-rupa ceiling rather than an arbitrary guard. */
  return Math.max(0,Math.min(60,v));
}
/* ===== THE BHĀVA FRAME ====================================================

   Until now every bhāva on this site was whole-sign: a graha's house was its
   rāśi counted from the lagna's rāśi, written out as
   ((signOf - LS) % 12) + 1 in the two places that needed it. Śrīpati existed
   only as a page of its own. This makes the frame a CHOICE, computed in one
   place, so that a page cannot hold its own opinion about which bhāva a graha
   is in.

   THE DEFAULT IS WHOLE-SIGN AND MUST STAY BIT-IDENTICAL. Whole-sign is the
   right default for a Parāśarī reading, it is what every figure this project
   has ever published was computed with, and house-verify asserts that the
   frame in "whole" mode returns exactly what the old inline arithmetic did,
   for every graha and every house, on the reference charts. If that assertion
   ever fails, the switch is broken, not the expectation.

   WHAT ŚRĪPATI CHANGES, and the one convention it forces. The twelve madhyas
   are unequal, so a bhāva can span two rāśis and "the lord of the 7th" stops
   being unambiguous. The lord is taken from the rāśi containing the bhāva
   MADHYA — the house's own midpoint, which is also the point the Benares
   edition's 15° strength rule measures from, so the two readings agree about
   what the centre of a house is. The alternative, the rāśi on the opening
   sandhi, is a Western cusp reading and is not used here.

   IT CAN DECLINE, AND SAYS SO. build() returns null without an ascendant or a
   meridian, and SPSripati lives in the report bundle, so a page that loads
   engine.js alone cannot compute cusps at all. Note what this is NOT: the MC
   comes out of an atan2 and is defined at every latitude, so unlike Placidus
   there is no latitude at which this construction fails — high latitude makes
   the quadrants very unequal, not undefined. The realistic fallback is the
   missing module. In either case the frame returns whole-sign and sets fellBack,
   which the UI must surface. A house system that quietly invents a meridian
   is worse than one that refuses, and a toggle that silently does nothing is
   worse than one that reports it could not. */
var HOUSE_MODE = "whole";
function setHouseMode(m){ HOUSE_MODE = (m === "sripati") ? "sripati" : "whole"; return HOUSE_MODE; }
window.__setHouseMode = setHouseMode;
window.__houseMode = function(){ return HOUSE_MODE; };
/* One frame per chart. Every consumer asks this and nothing computes its own.
   lagSid and mcSid are sidereal; mcSid may be null. */
function bhavaFrame(lagSid, mcSid){
  var LS = Math.floor(norm(lagSid) / 30) % 12;
  function wholeFrame(fellBack, why){
    return {
      mode: "whole", fellBack: !!fellBack, why: why || null, sripati: null,
      LS: LS,
      houseOfLon: function(sid){
        return ((Math.floor(norm(sid) / 30) % 12 - LS) % 12 + 12) % 12 + 1;
      },
      lordOfHouse: function(h){ return LORD[(LS + h - 1) % 12]; },
      signOfHouse: function(h){ return (LS + h - 1) % 12; },
      /* the bhāva's midpoint in longitude. Under whole-sign a house "begins"
         at its rāśi, so the point Dig Bala measures from is the lagna carried
         round in 30° steps — which is what the Dig Bala code computed inline
         before the frame existed. */
      madhyaOf: function(h){ return norm(lagSid + (h - 1) * 30); },
      /* the rāśi a house's madhya falls in — the same thing as signOfHouse
         under whole-sign, which is why lordOfHouse agrees with the old
         arithmetic exactly */
      madhyaSignOfHouse: function(h){ return (LS + h - 1) % 12; }
    };
  }
  if (HOUSE_MODE !== "sripati") return wholeFrame(false);
  if (!(window.SPSripati && window.SPSripati.build))
    return wholeFrame(true, "the Śrīpati module is not loaded on this page");
  var S = window.SPSripati.build(norm(lagSid), (mcSid == null ? null : norm(mcSid)));
  if (!S || !S.madhya || !S.sandhi)
    return wholeFrame(true, "the meridian for this moment could not be computed");
  return {
    mode: "sripati", fellBack: false, why: null, sripati: S, LS: LS,
    houseOfLon: function(sid){ return S.houseOf(norm(sid)); },
    madhyaSignOfHouse: function(h){ return Math.floor(norm(S.madhya[h]) / 30) % 12; },
    lordOfHouse: function(h){ return LORD[Math.floor(norm(S.madhya[h]) / 30) % 12]; },
    madhyaOf: function(h){ return norm(S.madhya[h]); },
    /* the rāśi a house is "in" for display: the madhya's, for the same
       reason lordship uses it */
    signOfHouse: function(h){ return Math.floor(norm(S.madhya[h]) / 30) % 12; }
  };
}
window.__bhavaFrame = bhavaFrame;
/* The sidereal meridian. Factored out because quickSky computed it inline and
   buildLocalChart did not compute it at all — and the Śrīpati frame needs it
   from both, so two copies of this arithmetic would be two chances to differ
   about where the 10th house starts. */
function mcSidereal(date, lonDeg, epsDeg, ay){
  var gast = Astronomy.SiderealTime(date);
  var lst = ((gast + lonDeg / 15) % 24 + 24) % 24;
  var ramc = lst * 15 * Math.PI / 180;
  var mc = Math.atan2(Math.tan(ramc), Math.cos(epsDeg * Math.PI / 180)) * 180 / Math.PI;
  if (Math.cos(ramc) < 0) mc += 180;
  return norm(mc - ay);
}
window.__kMC = mcSidereal;
function shadbala(ctx){
  var P=ctx.planets, LS=ctx.LS, lagSid=ctx.lagSid, jd=ctx.jd, date=ctx.date,
      sunrise=ctx.sunrise, sunset=ctx.sunset, birthH=ctx.birthH, decl=ctx.decl,
      cheshtaK=ctx.cheshtaK, vargaSign=ctx.vargaSign, digOf=ctx.digOf, LORD=ctx.LORD,
      natFriend=ctx.natFriend, weekday=ctx.weekday, varshaLord=ctx.varshaLord, masaLord=ctx.masaLord;
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var houseOf={}, signOf={};
  /* the frame comes in from the chart builder; a graha's RĀŚI is still its
     rāśi — dignity, which reads signOf, is a rāśi property and must not
     follow the house system. Only the bhāva index does. */
  var FR=ctx.frame||bhavaFrame(lagSid,null);
  names.concat(["Rahu","Ketu"]).forEach(function(n){ if(!P[n])return;
    signOf[n]=Math.floor(P[n].sid/30)%12; houseOf[n]=FR.houseOfLon(P[n].sid); });
  // day/night
  var isDay=(birthH>=sunrise&&birthH<sunset);
  var dayLen=sunset-sunrise, nightLen=24-dayLen;
  // hora lord: 24 planetary hours from sunrise, Chaldean order starting with the weekday lord
  var horaLord=(function(){
    var since=(birthH-sunrise+24)%24;
    var idx=Math.floor(since/ (isDay? dayLen/12 : nightLen/12));
    var hoursFromSunrise=Math.floor(((birthH-sunrise+24)%24)/1);
    var start=HORA_SEQ.indexOf(DAYLORD[weekday]);
    if(start<0)start=0;
    return HORA_SEQ[(start+hoursFromSunrise)%7];
  })();
  // tribhaga lord
  var tribhagaLord=(function(){
    if(isDay){ var k=Math.floor((birthH-sunrise)/(dayLen/3)); return ["Mercury","Sun","Saturn"][Math.min(k,2)]; }
    var t=(birthH<sunrise? birthH+24: birthH)-sunset; var k2=Math.floor(t/(nightLen/3));
    return ["Moon","Venus","Mars"][Math.min(k2,2)];
  })();
  var sunSid=P.Sun.sid, moonSid=P.Moon.sid;
  var pakshaArc=((moonSid-sunSid)%360+360)%360; if(pakshaArc>180)pakshaArc=360-pakshaArc;
  var out=[];
  names.forEach(function(p){
    var sid=P[p].sid, deg=sid%30, sg=signOf[p], h=houseOf[p];
    // --- Sthana ---
    var uchcha=sbUchcha(p,sid);
    var sapta=0;
    SB_SEVEN.forEach(function(v){
      var vs=vargaSign(v,sid), d=digOf(p,vs,null);
      /* the ladder follows the PADDHATI, not the house frame — see SB_VAL.
         Hoisted out of the else branch so the exalted/own values come from
         the same ladder as the relationship values; they happen to agree at
         45 and 30 in both texts, but reading them from different tables
         would be waiting for the day they do not. */
      var LAD=(FR.mode==="sripati")?SB_VAL_SP:SB_VAL;
      if(d==="exalted"||d==="moolatrikona"||d==="own") sapta+=LAD[d==="own"?"own":"exalted"];
      else { var lord=LORD[vs];
        /* The tātkālika half of the pañcadhā relation is reckoned by RĀŚI
           distance, not by bhāva — a graha in the 2nd, 3rd, 4th, 10th, 11th
           or 12th rāśi from another is its temporary friend. This passed the
           HOUSE indices, which was the same number while house was the rāśi
           offset and became wrong the moment the frame could be Śrīpati: it
           moved Saptavargaja Bala, and so Sthāna and the Ṣaḍbala total, for
           grahas whose rāśi had not changed at all. sbCompound only uses the
           difference, so rāśi indices give exactly the classical reckoning. */
        /* ...THAT IS BPHS'S RECKONING, AND ŚRĪPATI'S IS NOT THE SAME.
           Sastri (pp. 24–26) takes the temporal relation from which of the
           twelve BHĀVAS each graha occupies in the lagna-bhāva-kuṇḍalī, and
           records that Śrīpati does not favour the alternative of casting a
           fresh bhāva chakra from each graha in turn. Balabhadra agrees; it
           is Parāśara and Keśava who count rāśis. Under unequal bhāvas the
           two give different answers for a graha that has ingressed across a
           sandhi, which is precisely when it matters.
           So the comment above still describes the BPHS path exactly, and the
           Śrīpati path deliberately passes bhāva indices instead. This feeds
           Saptavargaja → Sthāna → the Ṣaḍbala total, so it is the widest
           reaching of the paddhati differences. */
        var ip=(FR.mode==="sripati")?h:sg,
            io=(FR.mode==="sripati")
              ?(houseOf[lord]==null?h:houseOf[lord])
              :(signOf[lord]==null?sg:signOf[lord]);
        sapta += (lord===p)?LAD.own
          :LAD[sbCompound(p,lord,ip,io,natFriend)]; }
    });
    var oddSign=(sg%2===0), navSign=vargaSign("D9",sid), oddNav=(navSign%2===0);
    var wantOdd=(SB_FEM.indexOf(p)<0);
    var ojha=(wantOdd===oddSign?15:0)+(wantOdd===oddNav?15:0);
    var kendradi=([1,4,7,10].indexOf(h)>=0)?60:(([2,5,8,11].indexOf(h)>=0)?30:15);
    var drek=Math.floor(deg/10);
    var drekBala=((drek===0&&SB_MALE.indexOf(p)>=0)||(drek===1&&SB_FEM.indexOf(p)>=0)||
                  (drek===2&&SB_NEU.indexOf(p)>=0))?15:0;
    var sthana=uchcha+sapta+ojha+kendradi+drekBala;
    // --- Dig ---
    /* Dig Bala is measured from the cusp of the bhāva a graha is strongest
       in — the 1st, 4th, 7th or 10th. That was written inline as
       lagna + (n−1)×30, which IS the bhāva midpoint under whole-sign and is
       not under Śrīpati, where the quadrants are unequal and the 10th sits at
       the meridian rather than 270° from the lagna. Asking the frame keeps
       the default identical and makes the Śrīpati reading honest. */
    var strongCusp=FR.madhyaOf(SB_DIG[p]), weak=(strongCusp+180)%360;
    var dd=Math.abs(((sid-weak)%360+360)%360); if(dd>180)dd=360-dd;
    var dig=dd/3;
    // --- Kala ---
    var x=Math.abs(birthH-12); var frac=1-x/12;                    // 1 at noon, 0 at midnight
    var nath=(p==="Mercury")?60:((SB_DAY.indexOf(p)>=0)?60*frac:60*(1-frac));
    /* PAKṢA BALA — and two places Śrīpati's commentator parts from BPHS.
       BPHS Ch.27 vv.10–11: Mercury is a malefic when conjunct a malefic, the
       Moon is a malefic in the dark half, and the Moon's pakṣa is "always
       doubled just as the Sun's Ayana bala".
       Sastri's Śrīpatipaddhati treats Mercury as ALWAYS benefic and the Moon
       as benefic whether waxing or waning (p.38), and his worked table does
       NOT double the Moon — ·518 there is the undoubled value, and his Kāla
       Bala total of 2·050 for the Moon is built from it. His text does say to
       double; his arithmetic does not. As with the ±1 rūpa in bhāva bala, the
       table is followed over the prose where the table is internally
       consistent and reproducible, and the divergence is recorded rather than
       reconciled. */
    var pakBen=(FR.mode==="sripati")
      ? (["Jupiter","Venus","Mercury","Moon"].indexOf(p)>=0)
      : (SB_BEN.indexOf(p)>=0);
    var paksha=pakBen?pakshaArc/3:60-pakshaArc/3;
    if(p==="Moon" && FR.mode!=="sripati") paksha*=2;
    var tribhaga=(p===tribhagaLord||p==="Jupiter")?60:0;
    var lordBala=0;
    if(p===varshaLord)lordBala+=15; if(p===masaLord)lordBala+=30;
    if(p===DAYLORD[weekday])lordBala+=45; if(p===horaLord)lordBala+=60;
    var dsign=(p==="Moon"||p==="Saturn")?-1:1;
    /* Ayana Bala — BPHS Vol. 1, Ch. 27, vv. 15–17. The sage's Khanda method
       (45/33/12) is summarised in the translator's note as the closed form
       (23°27' ± Kranti) × 1.2793, where 1.2793 = 60 / (2 × 23°27'): the half
       range is the obliquity, so the value is 30 virupas at zero declination,
       a full rupa at maximum favourable declination and nil at maximum
       adverse declination. This used to read 60*(24+decl)/48, whose half
       range of 24° is not the obliquity — it returned 59.3 instead of a full
       rupa at one extreme and 0.7 instead of nil at the other. We use the
       obliquity OF DATE rather than the note's fixed 23°27' because ctx.decl
       is itself computed with the true obliquity, so the two now agree
       exactly at the extremes. Max |difference| from the old constant is
       0.70 virupa (1.40 for the Sun, whose Ayana Bala is doubled). */
    /* ŚRĪPATI USES A DIFFERENT HALF RANGE, AND IT IS NOT A ROUNDING OF THIS.
       Śrīpatipaddhati Adh. 3, śl. 15–15½ (Subrahmanya Sastri 1937, p.44) divides
       by "the maximum declination, i.e. 24°" and fixes the scale with "the
       Ayanabala of a planet at the Equator is ½ a Rupa", which reduces to
       (24 + signed declination)/48 rūpa. His worked example gives the Sun
       ·8099 from a declination of 14°52.6'N and his table prints ·810.
       24° is the classical parama-krānti, a stated constant of that system,
       not an approximation to the true obliquity — so under his paddhati the
       value deliberately does NOT reach exactly 60 or exactly 0 at the real
       extremes, and forcing it to would be modernising his text.
       This is the constant the engine carried before the BPHS correction
       above: it was Śrīpati's number sitting in a BPHS computation. It now
       sits where it belongs. */
    var Tay=Tof(jd), OBL=23.439291111-0.0130041667*Tay-1.638e-7*Tay*Tay;
    var ayHalf=(FR.mode==="sripati")?24:OBL;
    var ayana=60*(ayHalf+dsign*(decl[p]||0))/(2*ayHalf); if(p==="Sun")ayana*=2;
    ayana=Math.max(0,Math.min(p==="Sun"?120:60,ayana));
    var kala=nath+paksha+tribhaga+lordBala+ayana;
    // --- Cheshta ---
    var cheshta;
    if(p==="Sun") cheshta=Math.min(60,ayana); else if(p==="Moon") cheshta=Math.min(60,paksha);
    else cheshta=Math.max(0,Math.min(60,(cheshtaK[p]||0)/3));
    // --- Naisargika & Drik ---
    var nais=SB_NAIS[p];
    /* Drik Bala — BPHS Vol. 1, Ch. 27, v. 19: "Reduce one fourth of the
       Drishti Pinda if a planet has malefic aspects on it and add a fourth if
       it is aspected by a benefic. Super add the entire aspect of Mercury and
       Jupiter to get the net strength of a planet."
     *
     * THE QUARTER RULE IS APPLIED. THE SUPER-ADD CLAUSE IS DELIBERATELY NOT,
     * and this is a decision on record, not an oversight — please do not
     * "fix" it without reading claude/bala-and-virupa-audit.md first.
     *
     * Both readings were implemented and measured on the reference charts:
     * adding Mercury's and Jupiter's entire Drishti Pinda ON TOP of the
     * quarter, and adding it IN PLACE of the quarter. Under either, Drik Bala
     * came out positive for every graha in every chart tested (Sun -11.9 ->
     * +36.6, Moon -13.2 -> +79.0 on the 1990 reference), which empties the
     * verse's own first clause of any effect, and nearly every graha then
     * cleared its required minimum, which would leave the thresholds of
     * vv. 32-33 with nothing to measure. Those thresholds are themselves
     * source data, so a reading that voids them is in tension with the text.
     * The clause is terse and its scope is genuinely unclear, so rather than
     * pick a reading silently we keep the unambiguous part and DISCLOSE the
     * omission in the report's Shadbala section. */
    var drik=0;
    /* Śrīpati's dṛṣṭi under his paddhati — a different function, not a
       variant; see sripatiDrishti. He also does not extend dṛṣṭi to the
       nodes, so under his reckoning the list is the seven. */
    var DRGF=(FR.mode==="sripati")?sripatiDrishti:sphutaDrishti;
    var seers=(FR.mode==="sripati")?names:names.concat(["Rahu","Ketu"]);
    seers.forEach(function(q){ if(q===p||!P[q])return;
      var v=DRGF(q,P[q].sid,P[p].sid);
      if(!v)return;
      drik += (SB_BEN.indexOf(q)>=0? v : -v)/4;
    });
    var total=sthana+dig+kala+cheshta+nais+drik;
    out.push({graha:p,sthana:sthana,uchcha:uchcha,saptavargaja:sapta,ojha:ojha,kendradi:kendradi,
      drekkana:drekBala,dig:dig,kala:kala,nathonnatha:nath,paksha:paksha,tribhaga:tribhaga,
      lord_bala:lordBala,ayana:ayana,cheshta:cheshta,naisargika:nais,drik:drik,
      total_virupa:total,total_rupa:total/60,required_rupa:SB_REQ[p],ratio:(total/60)/SB_REQ[p]});
  });
  /* IṢṬA AND KAṢṬA PHALA — and the misattribution this replaces.
   *
   * The report computed these itself as √(uchcha × cheṣṭa) and
   * √((60−uchcha) × (60−cheṣṭa)), and told the reader "BPHS derives two
   * opposed potencies … each is the geometric mean of the two rays."
   * The geometric mean is NOT BPHS. It is Śrīpati's, reaching us through
   * Keśava Daivajña's compression of Adh. 4, śl. 6 (Sastri 1937, p.60):
   *     iṣṭa = √(uchchabala × cheṣṭabala),  kaṣṭa = √((1−u) × (1−c)).
   *
   * BPHS Ch. 28, v. 6 states something else entirely, in plain words:
   *     "Reduce 1 from each of Cheshta Rasmi and Uchcha Rasmi. Then multiply
   *      the products by 10 and add together. Half of the sum will represent
   *      the Ishta phala. Reduce Ishta Phala from 60 to obtain the Kashta."
   * With raśmi = 6 × bala_rūpa + 1 (v.2 and vv.3–4), that collapses to the
   * ARITHMETIC mean in virūpas: iṣṭa = (uchcha + cheṣṭa)/2, kaṣṭa = 60 − iṣṭa.
   * Arithmetic, not geometric, and the complement is taken once on the total
   * rather than on each factor — so the two give genuinely different
   * orderings, not a rescaling of one another.
   *
   * Presenting later tradition as an explicit BPHS verse is the one thing
   * this project's source rules forbid outright, so each paddhati now gets
   * its own formula and its own citation, and the report prints what it was
   * given instead of deriving a third thing.
   *
   * One subtlety worth recording: the shortcut raśmi = 6 × bala + 1 does NOT
   * hold for the Sun. Its cheṣṭabala is DEFINED as its ayanabala (Ch. 27, v. 18),
   * while its cheṣṭa RAŚMI comes from a real cheṣṭākendra of sāyana Sun + 3
   * rāśis (Ch.28 vv.3–4). Śrīpati's own worked example shows the gap: ·810
   * would imply a raśmi of 5·86, and his table prints 5·317. Both formulas
   * below are therefore expressed in BALA, which is what this engine has and
   * what both texts' closed forms consume. */
  var sripatiMode=(FR.mode==="sripati");
  out.forEach(function(r){
    var u=Math.max(0,Math.min(60,r.uchcha)), c=Math.max(0,Math.min(60,r.cheshta));
    if(sripatiMode){
      r.ishta=Math.sqrt(u*c);
      r.kashta=Math.sqrt((60-u)*(60-c));
      r.ishta_kashta_rule="geometric";
      r.ishta_kashta_source="Śrīpatipaddhati, Adh. 4, śl. 6 (Keśava Daivajña's form)";
    }else{
      r.ishta=(u+c)/2;
      r.kashta=60-r.ishta;
      r.ishta_kashta_rule="arithmetic";
      r.ishta_kashta_source="BPHS, Vol. 1, Ch. 28, v. 6";
    }
    /* Ch. 28, v. 7 / Adh. 4, śl. 7: both texts then weight the Ṣaḍbala by these. */
    r.ishta_shadbala=r.total_virupa*(r.ishta/60);
    r.kashta_shadbala=r.total_virupa*(r.kashta/60);
  });
  /* MINIMUM STRENGTH UNDER EACH HEAD, not only in the total.
   * BPHS Ch.27 vv.34–36 and Śrīpati p.56 both group the grahas three ways and
   * give five figures each — Sthāna, Dig, Kāla, Cheṣṭa, Ayana. The total
   * requirement (vv.32–33 / p.56) was already here; these were not, so a
   * graha could clear its Ṣaḍbala piṇḍa on one swollen component while
   * failing every other head, and nothing said so.
   * The two texts agree on fourteen of the fifteen figures. They differ on
   * ONE: the Dig Bala required of Mars and Saturn, 30 in BPHS and 20 in
   * Śrīpati. A single digit in two OCR'd editions is exactly the kind of
   * difference not to adjudicate, so each paddhati carries its own and the
   * divergence is named rather than averaged away. */
  var SB_GROUP={Jupiter:"A",Mercury:"A",Sun:"A",Moon:"B",Venus:"B",Mars:"C",Saturn:"C"};
  var SB_COMP_MIN={
    bphs:   {A:{sthana:165,dig:35,kala:50,cheshta:112,ayana:30},
             B:{sthana:133,dig:50,kala:30,cheshta:100,ayana:40},
             C:{sthana:96, dig:30,kala:40,cheshta:67, ayana:20}},
    sripati:{A:{sthana:165,dig:35,kala:50,cheshta:112,ayana:30},
             B:{sthana:133,dig:50,kala:30,cheshta:100,ayana:40},
             C:{sthana:96, dig:20,kala:40,cheshta:67, ayana:20}}};
  out.forEach(function(r){
    var req=SB_COMP_MIN[sripatiMode?"sripati":"bphs"][SB_GROUP[r.graha]];
    r.required_components=req;
    r.components_met={sthana:r.sthana>=req.sthana, dig:r.dig>=req.dig,
      kala:r.kala>=req.kala, cheshta:r.cheshta>=req.cheshta, ayana:r.ayana>=req.ayana};
    r.components_met_count=["sthana","dig","kala","cheshta","ayana"]
      .filter(function(k){return r.components_met[k];}).length;
  });
  out.sort(function(a,b){return b.ratio-a.ratio;});
  return {planets:out,
    /* WHICH SIX, AND WHERE AYANA SITS. BPHS folds Ayana into Kāla and makes
       Dṛk the sixth head (Ch.27, the list before v.1). Śrīpati counts Ayana
       as its own head and treats dṛṣṭi as a ±¼ modifier on the rest rather
       than as a member (Adh.3 śl.20, and his table p.52).
       The TOTAL is the same number either way — this engine's kala already
       contains ayana and its drik is already quartered — so this is a
       presentational difference and is reported as one. Saying so is the
       point: a reader comparing these columns against either book should not
       have to work out why the headings differ. */
    composition:sripatiMode
      ? {heads:["sthana","kala","dig","ayana","cheshta","naisargika"],
         drishti:"a quarter of the benefic aspect added and a quarter of the "+
                 "malefic subtracted, as a modifier rather than a sixth head",
         source:"Śrīpatipaddhati, Adh. 3, śl. 20"}
      : {heads:["sthana","dig","kala","cheshta","naisargika","drik"],
         drishti:"Dṛk Bala is the sixth head; Ayana Bala is included within "+
                 "Kāla Bala and is also reported separately",
         source:"BPHS, Vol. 1, Ch. 27"},
    required_components_note:sripatiMode
      ? "Per-head minima from Śrīpatipaddhati p.56. These differ from BPHS "+
        "Ch. 27 vv. 34–36 in one figure only: the Dig Bala required of Mars "+
        "and Saturn is 20 here and 30 there."
      : "Per-head minima from BPHS, Vol. 1, Ch. 27, vv. 34–36. Śrīpati p.56 "+
        "gives the same fifteen figures but requires 20 rather than 30 Dig "+
        "Bala of Mars and Saturn.",
    ishta_kashta_note:sripatiMode
      ? "Iṣṭa is the geometric mean of the exaltation and motional strengths and "+
        "Kaṣṭa the geometric mean of their complements — Śrīpati's rule "+
        "(Adh. 4, śl. 6), not BPHS's. BPHS Ch. 28 v. 6 gives an arithmetic rule "+
        "instead, and the two rank the grahas differently."
      : "Iṣṭa is half the sum of the exaltation and motional rays less one, "+
        "times ten, and Kaṣṭa is its complement from 60 — BPHS Ch. 28 v. 6, "+
        "which in bala terms is the arithmetic mean. Śrīpati (Adh. 4, śl. 6) "+
        "uses a geometric mean instead; that is later tradition, not this verse.",
    context:{day_birth:isDay,hora_lord:horaLord,tribhaga_lord:tribhagaLord,
    weekday_lord:DAYLORD[weekday],varsha_lord:varshaLord,masa_lord:masaLord,
    sunrise:sunrise,sunset:sunset,paksha_arc:pakshaArc}};
}


/* astronomical inputs for Shadbala */
function declOf(name,date){
  var eq=Astronomy.Equator(Astronomy.Body[BODY[name]],date,new Astronomy.Observer(0,0,0),true,true);
  return eq.dec;
}
/* ===== the sunrise convention =============================================
   Everything dated in this project hangs off sunrise. The tithi running AT
   sunrise names the day, so the convention chosen here decides festival dates,
   the vāra, the ghaṭikā count and the daśā boundaries that follow from them.
   It was previously implicit — whatever Astronomy.SearchRiseSet happens to do —
   which is a poor state for a number that moves a day label.

   MEASURED, NOT ASSUMED. SearchRiseSet places the Sun's geometric centre at
   −0.8339° at the moment it calls sunrise, which is the classical almanac
   convention: the upper limb touching the horizon, with 34′ of standard
   refraction, using the true semidiameter of the day rather than a mean. That
   is the same convention a printed pañcāṅga and the dṛk-gaṇita almanacs use for
   sūryodaya, so it stays the default — but it is now named on screen and can be
   changed, because the alternatives are defensible and the differences are not
   negligible:

     upper limb + refraction  −(34′ + semidiameter)   the default, ≈ −0.834°
     centre + refraction      −34′                    74 s later at 28.8°N
     geometric centre          0°                     232 s later

   Four minutes is small, and it is not nothing: a tithi boundary falling inside
   that window labels the day differently. Measured over 730 days at 28.8°N, the
   geometric convention moves the tithi-at-sunrise on 2 of them and the centre
   convention on none — about one day a year, which is precisely the sort of
   discrepancy a reader comparing this against their own pañcāṅga would otherwise
   have no way to account for. Sunset moves by the same amount the other way.

   ONE TRAP, for anything that iterates days. Do not search forward from UTC
   midnight. At longitudes where sunrise falls near 00:00 UTC — the whole of India
   in summer — midnight sits between two conventions' answers for the same
   morning, and the search returns sunrises 24 hours apart for a 4-minute
   difference in definition. Anchor on local noon, or walk forward from well
   before, as dayStart() on the now page does. This was found by a measurement
   disagreeing with its own arithmetic by thirteen-fold; nothing threw.

   Refraction is a real atmosphere and 34′ is a convention about it, not a
   measurement of it; temperature and pressure move the true value by minutes.
   The default is the one the almanacs agree on, not the one that is "correct". */
var K_RISE_CONV={
  limb:   {alt:null,    label:"upper limb, 34′ refraction"},
  centre: {alt:-0.5667, label:"centre of disc, 34′ refraction"},
  geom:   {alt:0,       label:"geometric centre, no refraction"}
};
var K_RISE_DEFAULT="limb";
/* One search, one convention, used by the chart report, the now page and the
   calendar alike. `dir` is +1 for rise and −1 for set. Null where there is none
   to find — a polar day has no sunrise and a fiction is worse than a gap. */
function kRiseSet(body,lat,lon,fromDate,days,dir,conv){
  var obs=new Astronomy.Observer(lat,lon,0), r;
  var C=K_RISE_CONV[conv||K_RISE_DEFAULT]||K_RISE_CONV[K_RISE_DEFAULT];
  try{
    if(C.alt==null) r=Astronomy.SearchRiseSet(Astronomy.Body[body],obs,dir,fromDate,days);
    else r=Astronomy.SearchAltitude(Astronomy.Body[body],obs,dir,fromDate,days,C.alt);
  }catch(e){ return null; }
  return r?r.date:null;
}
function sunriseSunset(date,lat,lon,conv){
  var d0=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),0,0,0));
  return {rise:kRiseSet("Sun",lat,lon,d0,2,+1,conv),
          set: kRiseSet("Sun",lat,lon,d0,2,-1,conv)};
}
/* cheshta kendra: arc from the planet's seeghrocca (Sun's mean longitude for outer planets,
   the planet's own heliocentric longitude for Mercury and Venus) */
function cheshtaKendra(date,ay,pos){
  var T=Tof(jdFromUTC(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),
        date.getUTCHours()+date.getUTCMinutes()/60));
  var sunMean=norm(280.46646+36000.76983*T);            // tropical mean longitude of the Sun
  var out={};
  ["Mars","Jupiter","Saturn"].forEach(function(p){
    var a=Math.abs(norm(norm(sunMean-ay)-pos[p].sid)); if(a>180)a=360-a; out[p]=a; });
  ["Mercury","Venus"].forEach(function(p){
    var hv=Astronomy.Ecliptic(Astronomy.HelioVector(Astronomy.Body[BODY[p]],date)).elon;
    var a=Math.abs(norm(norm(hv-ay)-pos[p].sid)); if(a>180)a=360-a; out[p]=a; });
  return out;
}
/* weekday lord of the day the Sun entered the current sidereal sign / the sidereal year */
function sankrantiWeekday(jd,date,targetLon){
  var t=date.getTime();
  for(var k=0;k<60;k++){
    var d=new Date(t), j2=jd+(t-date.getTime())/86400000;
    var lon=norm(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun,d,true)).elon-ayanamsa(j2));
    var diff=((lon-targetLon+180)%360+360)%360-180;
    if(Math.abs(diff)<1e-5)break;
    t-=diff/0.9856*86400000;
  }
  var jdx=jd+(t-date.getTime())/86400000;
  return (Math.floor(jdx+1.5)%7+7)%7;
}

try{ window.__AVT=AVT; window.__ayan=ayanamsa;
     window.__ayanModes=AYAN_MODES; window.__setAyan=setAyanamsaMode;
     window.__ayanFor=ayanamsaFor;
     /* The divisional formulas exist twice: here, where a graha's varga sign is
        computed, and in the report's vargaLagna, which does the same arithmetic
        for the lagna. Two copies of sixteen formulas is two chances to diverge,
        and a divergence would be invisible — both would return a plausible
        sign. Exposing this one lets the suite assert that the two agree across
        the whole zodiac, rather than leaving it to a reading of the source. */
     window.__vargaSign=vargaSign;
     /* The certified window, so the report and the ayanāṃśa pane can say what
        a date outside it costs instead of leaving a reader to assume there is
        no cost. SPAN_BANDS travels with it so the band's figures can be
        asserted against the committed measurement rather than retyped. */
     window.__kSpan=spanStatus; window.__kSpanBands=SPAN_BANDS;
     window.__kSpanWindow=SPAN; }catch(e){}
/* sidereal lagna for the birth input shifted by offMin minutes — used by the birth-time check */
/* The pañcāṅga primitives, exposed for pages outside the report bundle. now.html
   and the calendar both need the tithi, the māsa and the ṛtu at an arbitrary
   instant, and they must be the engine's own: a second implementation is free to
   drift, and a calendar that disagreed with the chart report about which tithi it
   is would be worse than no calendar.

   These sit HERE, beside the other window.__k exports, because this file is wrapped
   in an IIFE — appended at the end of the file they are outside it and cannot see
   a single one of the functions they call. */
window.__kPanchang=function(sunSid,moonSid,jd){ return panchang(sunSid,moonSid,jd); };
window.__kMasa=function(sunSid,moonSid,ayan,sunAtNewMoon){
  return masaOf(sunSid,moonSid,ayan,sunAtNewMoon); };
window.__kNak=function(deg){ return nak(deg); };
window.__kJD=function(ms){ return ms/86400000+2440587.5; };
/* Geocentric distance in kilometres, and equatorial coordinates of date.

   Both come straight out of the vendored ephemeris and neither was exposed,
   so anything wanting the Moon's distance (perigee, apogee, the apparent size
   that makes a "supermoon") or a body's right ascension and declination (the
   tilt of the crescent, solar declination, the shadow of a gnomon) had to
   either reach inside this file or re-derive what is already computed here. */
window.__kDist=function(name,ms){
  try{
    var v=Astronomy.GeoVector(Astronomy.Body[BODY[name]],new Date(ms),true);
    return Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z)*149597870.7;
  }catch(e){ return null; }
};
/* Heliocentric ecliptic longitude and radius, which is what a Sun-centred
   drawing needs and what every other export here cannot give: everything else
   in this file is geocentric, because a chart is cast from the Earth. The
   orbit figures — the Venus rose and its relatives — are the one place the
   real heliocentric geometry is the subject rather than a step on the way. */
window.__kHelio=function(name,ms){
  try{
    /* BODY maps the GRAHAS, and Earth is not one — a chart is cast from it,
       never of it. A Sun-centred drawing needs it like any other planet, so the
       name falls through when the map has no entry. Without this the rose drew
       nothing at all and the scene reported a thrown error, which looks on a
       canvas exactly like a scene that is still loading. */
    var key=BODY[name]||name;
    var v=Astronomy.HelioVector(Astronomy.Body[key],new Date(ms));
    var e=Astronomy.Ecliptic(v);
    return {lon:norm(e.elon), lat:e.elat,
            r:Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z)};
  }catch(e){ return null; }
};
/* FULL STATE VECTORS, heliocentric, in AU and AU per day.

   Everything else exported here is an angle, because a chart is made of
   angles. A simulation is not: to integrate the equations of motion you need
   where a body is in three dimensions and how fast it is going, and no
   combination of longitudes will give you that.

   The velocity is a central difference rather than an analytic derivative,
   because the library gives positions and the derivative of a position is
   what a velocity is. The step is a hundredth of a day — small enough that
   the second-order error is below the position accuracy, large enough that
   the subtraction of two nearly equal numbers does not lose precision.

   The Moon is handled apart: its heliocentric place is the Earth's plus its
   own geocentric one, which is both exact and the only form the library is
   certain to supply. */
window.__kState=function(name,ms){
  try{
    var h=0.01;                                  /* days */
    function at(t){
      var d=new Date(t);
      if(name==="Moon"||name==="Candra"){
        var e=Astronomy.HelioVector(Astronomy.Body.Earth,d);
        var m=Astronomy.GeoVector(Astronomy.Body.Moon,d,false);
        return {x:e.x+m.x, y:e.y+m.y, z:e.z+m.z};
      }
      if(name==="Sun"||name==="Sūrya") return {x:0,y:0,z:0};
      var key=BODY[name]||name;
      return Astronomy.HelioVector(Astronomy.Body[key],d);
    }
    /* ROTATED INTO THE ECLIPTIC FRAME. The library returns equatorial J2000
       vectors, in which the Earth's orbit is inclined by the obliquity and
       the Moon's by the obliquity plus its own five degrees — both true and
       both useless for this purpose. The plane this subject lives in is the
       ecliptic: a plan view should be the plane of the solar system, and an
       inclination should be the five degrees everyone means by the Moon's
       inclination. One rotation about x by the obliquity of J2000. */
    var EPS=23.439291111*Math.PI/180, CE=Math.cos(EPS), SE=Math.sin(EPS);
    function ecl(v){ return {x:v.x, y:v.y*CE+v.z*SE, z:-v.y*SE+v.z*CE}; }
    var dt=h*86400000;
    var a=ecl(at(ms-dt)), b=ecl(at(ms+dt)), c=ecl(at(ms));
    return { x:c.x, y:c.y, z:c.z,
             vx:(b.x-a.x)/(2*h), vy:(b.y-a.y)/(2*h), vz:(b.z-a.z)/(2*h) };
  }catch(e){ return null; }
};
window.__kEquator=function(name,ms,lat,lon){
  try{
    var obs=new Astronomy.Observer(lat||0,lon||0,0);
    var eq=Astronomy.Equator(Astronomy.Body[BODY[name]],new Date(ms),obs,true,true);
    return {ra:eq.ra, dec:eq.dec, dist:eq.dist*149597870.7};
  }catch(e){ return null; }
};
/* The sunrise convention, shared rather than reimplemented. The now page and the
   calendar date their days with the same function the chart report does, so the
   two can never drift into disagreeing about which day it is. */
window.__kRiseSet=function(body,lat,lon,fromMs,days,dir,conv){
  var d=kRiseSet(body,lat,lon,new Date(fromMs),days,dir,conv);
  return d?d.getTime():null;
};
window.__kRiseConv=function(){
  var out={def:K_RISE_DEFAULT, list:[]};
  for(var k in K_RISE_CONV) if(K_RISE_CONV.hasOwnProperty(k))
    out.list.push({key:k, label:K_RISE_CONV[k].label, alt:K_RISE_CONV[k].alt});
  return out;
};
window.__kAsc=function(inp,offMin){
  var ut=inp.hour+inp.minute/60+(offMin||0)/60-inp.tzHours;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var date=new Date(Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000);
  return ascendant(jd,date,inp.lat,inp.lon,ayanamsa(jd));
};
/* sidereal longitude of a graha at any instant — used by the timeline, events and Now panel */
/* Sidereal longitude AND geocentric ecliptic latitude together.
   tropLon() has the latitude in hand at line 67 and throws it away, because
   every chart calculation on this site needs only the longitude. The graha
   yuddha scene needs the other one: BPHS Vol. 2, Ch. 79 decides the victor by
   which planet stands to the north, and north of the ECLIPTIC — the śara or
   vikṣepa — is a latitude, not a declination. Returning both from one call
   also guarantees the pair are read at the same instant. */
window.__kEclip=function(name,ms){
  var key=BODY[name]||name;
  if(!Astronomy.Body[key]) return null;
  var date=new Date(ms), jd=ms/86400000+2440587.5;
  var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[key],date,true));
  return {lon:norm(ev.elon-ayanamsa(jd)), trop:norm(ev.elon), lat:ev.elat};
};
/* The Śrīpati construction, exposed from the engine under the name the
   build spec asks for. The arithmetic lives in the report module that owns
   it; this is the door, so a caller that has the engine and nothing else
   can still build the houses. */
/* The report bundle needs the aspect formula itself, not only the Drik Bala it feeds,
   to publish a quantitative graha-drishti matrix. Exported rather than copied, so the
   matrix and Drik Bala can never disagree. */
window.sphutaDrishti=sphutaDrishti;
/* exported so the analyst payload can cast its dṛṣṭi matrix with the SAME
   function the Ṣaḍbala used. Without this it built the matrix from the BPHS
   speculum whatever the paddhati, so a Śrīpati export carried a dṛṣṭi table
   that disagreed with its own Drik Bala — under a note claiming the two came
   from one formula. */
window.sripatiDrishti=sripatiDrishti;
/* Dignity, published so a page can ask the engine rather than restate the
   tables. digOf is what every dignity on this site is decided by; exporting
   it means the graha page and the chart report cannot disagree about whether
   a graha is in its own sign. Additive — nothing here changes behaviour. */
window.__kDign={of:digOf,EXALT:EXALT,DEBIL:DEBIL,OWNS:OWNS,MTR:MTR,FRD:FRD,ENM:ENM,LORD:LORD};
/* Viṃśottarī, as a table and as the one function that turns a Moon's sidereal
   longitude into the daśā running at birth. Published for the same reason as
   the dignity tables above: the report has this, and so did two pages, each
   from its own copy. A page that asks here cannot drift from the report, and
   engine-verify asserts the balance this computes equals the one the chart
   report arrives at independently. Additive; nothing in the engine changes. */
var VIMS_ORDER=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"],
    VIMS_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
window.__kVims={
  order:VIMS_ORDER, years:VIMS_YEARS, total:120,
  /* nakṣatra index 0-26 → its lord: the nine in order, three times round */
  lordOfNak:function(i){ return VIMS_ORDER[((i%27)+27)%27%9]; },
  /* the mahādaśā running at birth and its unspent remainder, in years */
  atMoon:function(sid){
    var seg=40/3, mn=((sid%360)+360)%360, ni=Math.floor(mn/seg);
    var lord=VIMS_ORDER[ni%9], full=VIMS_YEARS[lord];
    var frac=(mn-ni*seg)/seg;
    return {nak:ni, lord:lord, full:full, elapsed:frac,
            balance:full*(1-frac)};
  }
};
/* The sixteen divisional signs, as the one function that computes them plus the
   table that names them. Published for the same reason as the dignity and
   Viṃśottarī tables above: the report has this and so do several pages, each
   from its own copy. A page that asks here cannot drift from the report.
   Additive; nothing in the engine changes. Note D30 is NOT a uniform 30/n
   division — its five spans are unequal, as vargaSign shows — so a page that
   wants the width of a division must measure it rather than divide 30 by n. */
window.__kVarga={ sign:vargaSign, codes:VCODES };
window.calculateSripatiHouses=function(ascSid,mcSid){
  if(window.SPSripati&&window.SPSripati.build) return window.SPSripati.build(ascSid,mcSid);
  return null;
};
window.__kSidAt=function(name,date){
  var jd=date.getTime()/86400000+2440587.5, ay=ayanamsa(jd);
  if(name==="Rahu") return norm(meanNode(jd)-ay);
  if(name==="Ketu") return norm(meanNode(jd)-ay+180);
  return norm(tropLon(name,date)-ay);
};
/* A stripped snapshot for the sky view's time scrubber: sidereal longitudes, the
   lagna, and horizon coordinates. No vargas, ashtakavarga, shadbala or dasha, so it
   is cheap enough to recompute on every frame. */
window.quickSky=function(inp){
  setAyanamsaMode(inp.ayanamsa||"lahiri");
  var tz=inp.tzHours, ut=inp.hour+inp.minute/60+(inp.second||0)/3600-tz;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var ms=Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000;
  var date=new Date(ms), ay=ayanamsa(jd);
  var obs=new Astronomy.Observer(inp.lat,inp.lon,0);
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], out=[];
  names.forEach(function(n){
    var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[BODY[n]],date,true));
    var sid=norm(ev.elon-ay), hz=null;
    try{
      var eq=Astronomy.Equator(Astronomy.Body[BODY[n]],date,obs,true,true);
      var h=Astronomy.Horizon(date,obs,eq.ra,eq.dec,"normal");
      hz={alt:h.altitude,az:h.azimuth};
    }catch(e){}
    /* Apparent speed in degrees per day, measured across an hour centred on the instant.
       The sign of it is retrogression — the wheel marks it, and the Sun and Moon never
       retrograde, so they cost nothing to include. */
    var sp=lonAndSpeed(n,date).speed;
    out.push({en:n,sid:sid,lat:ev.elat,hz:hz,speed:sp,retro:sp<0});
  });
  var nodeTrop=(inp.node==="true")?trueNodeAt(date):meanNode(jd);
  [["Rahu",norm(nodeTrop-ay)],["Ketu",norm(nodeTrop-ay+180)]].forEach(function(x){
    var hz=null;
    try{
      var trop=norm(x[1]+ay), R=Math.PI/180;
      var T=Tof(jd), eps=(23.439291111-0.0130041667*T)*R;
      var ra=Math.atan2(Math.sin(trop*R)*Math.cos(eps),Math.cos(trop*R))/R/15;
      var dec=Math.asin(Math.sin(trop*R)*Math.sin(eps))/R;
      var h=Astronomy.Horizon(date,obs,((ra%24)+24)%24,dec,"normal");
      hz={alt:h.altitude,az:h.azimuth};
    }catch(e){}
    /* The nodes are always retrograde in the mean reckoning; the true node can creep
       forward briefly, but both are drawn with the retrograde mark by convention. */
    out.push({en:x[0],sid:x[1],lat:0,hz:hz,speed:-0.053,retro:true});
  });
  var lag=ascendant(jd,date,inp.lat,inp.lon,ay);
  var gast=Astronomy.SiderealTime(date);
  var lst=((gast+inp.lon/15)%24+24)%24;
  var Tc=Tof(jd), epsd=(23.439291111-0.0130041667*Tc);
  return {jd:jd,date:date,ayanamsa:ay,lagna:lag,mc:mcSidereal(date,inp.lon,epsd,ay),planets:out,
          obliquity:epsd,lst:lst,lat:inp.lat,lon:inp.lon};
};
window.buildLocalChart=function(inp){
  setAyanamsaMode(inp.ayanamsa||"lahiri");
  /* The bhāva frame is part of the chart's INPUT, exactly as the ayanāṃśa is,
     rather than a global someone sets beforehand. That way it is saved with
     the chart, round-trips through the stored input, appears in D.input, and
     any page that builds a chart gets the frame the chart was defined with
     instead of whatever the last caller happened to leave set. */
  setHouseMode(inp.houseSystem||"whole");
  var tz=inp.tzHours, ut=inp.hour+inp.minute/60-tz;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var ms=Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000;
  var date=new Date(ms), ay=ayanamsa(jd);
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], pos={},grahas=[];
  names.forEach(function(n){var r=lonAndSpeed(n,date);
    /* Ecliptic latitude as well as longitude. Two grahas at the same longitude may
       be a degree apart in the sky, and latitude is what tells them apart — it is
       also what the later authorities use to settle a planetary war. */
    var lat=null;
    try{ lat=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[BODY[n]],date,true)).elat; }catch(e){}
    pos[n]={sid:norm(r.lon-ay),speed:r.speed,lat:lat};});
  var nodeMode=(inp.node==="true")?"true":"mean";
  var nodeTrop=(nodeMode==="true")?trueNodeAt(date):meanNode(jd);
  var ra=norm(nodeTrop-ay);
  /* the nodes sit on the ecliptic by definition — they are where Candra crosses it */
  pos.Rahu={sid:ra,speed:-0.0529,lat:0}; pos.Ketu={sid:norm(ra+180),speed:-0.0529,lat:0};
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  var lagSid=ascendant(jd,date,inp.lat,inp.lon,ay), LS=Math.floor(lagSid/30)%12;
  /* the bhāva frame for this chart: whole-sign by default, Śrīpati when the
     mode is set and a meridian exists. Everything downstream asks FRAME and
     nothing recomputes a house from LS.
     The meridian is computed only when Śrīpati is actually selected, and in a
     try: this builder never touched Astronomy.SiderealTime before, and a frame
     that throws would take the whole chart down to supply a house system
     nobody asked for. On failure mcSid stays null and the frame falls back,
     declaring it rather than inventing a meridian. */
  var mcSid=null;
  if(HOUSE_MODE==="sripati"){
    try{ mcSid=mcSidereal(date,inp.lon,(23.439291111-0.0130041667*Tof(jd)),ay); }
    catch(e){ mcSid=null; }
  }
  var FRAME=bhavaFrame(lagSid,mcSid);
  var sunSid=pos.Sun.sid;
  order.forEach(function(n){
    var p=pos[n], nk=nak(p.sid);
    var cmb=combustionOf(n,p.sid,sunSid);
    grahas.push({key:SK[n],sa:SK[n],iast:SK[n],rashi:rashiObj(p.sid),
      /* the bhāva, on the graha itself. Until now a consumer of this JSON had
         to join grahas[] against bhavas[].occupants to learn which house a
         graha was in, which is a join on a Sanskrit display name and the one
         thing an analyst needs most. It follows the frame, so it is the house
         under whichever system is selected. */
      bhava:FRAME.houseOfLon(p.sid),
      /* how much of that bhāva's effect it actually carries — null outside
         Śrīpati, where unequal bhāvas are what make the question meaningful
         (bhavaPhala is a hoisted declaration defined below) */
      bhava_phala:bhavaPhala(p.sid),
      nakshatra_pada:nk.pada,dignity:null,retrograde:p.speed<0,
      sidereal_deg:p.sid, speed_deg_per_day:p.speed,
      ecliptic_latitude_deg:p.lat,
      combust:cmb?cmb.combust:false,
      sun_separation_deg:(n==="Sun")?0:(function(){
        var sp=Math.abs(norm(p.sid-sunSid)); return sp>180?360-sp:sp; })(),
      combustion_orb_deg:cmb?cmb.orb_deg:null});
  });
  /* BHĀVA-PHALA — Śrīpati, Adh. 1, ślokas 8–10.
   *
   * Occupancy alone says a graha is "in the 8th" and stops there. Śrīpati does
   * not stop there: the effect of a bhāva BEGINS at its ārambha-sandhi, reaches
   * FULL at the madhya (the bhāvāṃśa, the half-bhāva point), and falls away to
   * nil at the virāma-sandhi — śl. 10. Between those, śl. 9 says the amount is
   * found "by a rule-of-three process": the graha's distance from its nearest
   * sandhi, over the distance from that same sandhi to the madhya.
   *
   *   before the madhya → ĀROHA   (rising),  measured from the ārambha-sandhi
   *   after  the madhya → AVAROHA (falling), measured from the virāma-sandhi
   *
   * The denominator is HALF OF THIS BHĀVA'S OWN WIDTH ON THAT SIDE, and the two
   * sides differ: a quadrant bhāva is not symmetric about its madhya, because
   * each sandhi is the midpoint to a neighbour of a different width. Using one
   * fixed half-width — or the often-quoted flat 15° — is the whole-sign
   * degenerate case, not the general rule.
   *
   * Śloka 8 adds the boundary case: a graha standing IN a sandhi "produces no
   * effect"; short of the sandhi it gives the preceding bhāva's effect, past it
   * the coming bhāva's. Occupancy already resolves which side of the sandhi the
   * graha is on, so what remains is to report that it is there at all — hence
   * in_sandhi, flagged on the small orb below rather than silently rounded to
   * a near-zero weight.
   *
   * VERIFIED against Śrīpati's own worked horoscope (Subrahmanya Sastri 1937,
   * table p. 14): Sun ·7694, Moon ·5791, Mars ·0313, Mercury ·2579, Jupiter
   * ·3823, Saturn ·0334 — all six reproduced to four decimals, with the correct
   * Āroha/Avaroha on each. Venus is the one disagreement: this rule gives
   * ·9702 where the book prints ·9653. The discrepancy is in the BOOK's
   * arithmetic, not the rule — reproducing ·9653 from its own tabulated bhāva
   * sphuṭas and its own Venus longitude would require the 12|1 sandhi to sit
   * near 0°06′ instead of the 358°23′30″ its own table gives. Six exact matches
   * are not bent to fit one outlier. See the harness, which asserts all seven
   * including Venus's known divergence. */
  function bhavaPhala(lon){
    if(FRAME.mode!=="sripati"||!FRAME.sripati) return null;
    var hn=FRAME.houseOfLon(lon); if(!hn) return null;
    var ar=norm(FRAME.sripati.sandhi[hn===1?12:hn-1]),
        vi=norm(FRAME.sripati.sandhi[hn]),
        md=norm(FRAME.sripati.madhya[hn]);
    var fwd=function(a,b){return ((b-a)%360+360)%360;};
    var toMadhya=fwd(ar,md), ofGraha=fwd(ar,lon);
    var rising=ofGraha<toMadhya, num, den;
    if(rising){ num=ofGraha; den=toMadhya; }
    else      { num=fwd(lon,vi); den=fwd(md,vi); }
    var w=den>0?num/den:0;
    if(w>1) w=1; if(w<0) w=0;
    /* śl. 8: standing in a sandhi, the graha gives no result. An exact hit is
       measure-zero, so this reports the practical neighbourhood of one and
       leaves the judgement to the reader rather than pretending to a knife
       edge the birth time cannot support. */
    var nearest=Math.min(fwd(ar,lon)>180?360-fwd(ar,lon):fwd(ar,lon),
                         fwd(lon,vi)>180?360-fwd(lon,vi):fwd(lon,vi));
    return {bhava:hn, weight:+w.toFixed(6),
            direction:rising?"aroha":"avaroha",
            direction_sa:rising?"ārohā":"avarohā",
            deg_from_sandhi:+num.toFixed(6), bhavamsa_deg:+den.toFixed(6),
            in_sandhi:nearest<0.25,
            note:"Śrīpati, Adh. 1, śl. 8–10: effect begins at the ārambha-sandhi, "+
                 "is full at the madhya and ceases at the virāma-sandhi; the amount "+
                 "between is a rule-of-three on the half-bhāva for that side. "+
                 "Śrīpati's own rule, not BPHS — the bhāva itself is judged by BPHS."};
  }
  var posBySign={}; order.forEach(function(n){posBySign[n]=Math.floor(pos[n].sid/30)%12;});
  var bhavas=[];
  for(var h=0;h<12;h++){
    var hn=h+1, occ=[];
    order.forEach(function(n){ if(FRAME.houseOfLon(pos[n].sid)===hn) occ.push(SK[n]); });
    var sg=FRAME.madhyaSignOfHouse(hn);
    /* whole-sign keeps rashiObj(sg*30+0.001) to the digit: that 0.001 is what
       every published figure was computed with, and bit-identity in the
       default mode is the property house-verify asserts first. Śrīpati reports
       the real madhya instead, because under it a bhāva does not begin at 0°
       of its rāśi and saying it does would be a fiction. */
    var rec={idx:h,sa:BH[h],iast:BH[h],
      rashi:rashiObj(FRAME.mode==="sripati"?norm(FRAME.sripati.madhya[hn]):sg*30+0.001),
      ruler:SK[FRAME.lordOfHouse(hn)],occupants:occ};
    if(FRAME.mode==="sripati"){
      var lo=norm(FRAME.sripati.sandhi[hn===1?12:hn-1]), hi=norm(FRAME.sripati.sandhi[hn]);
      rec.madhya_deg=norm(FRAME.sripati.madhya[hn]);
      rec.sandhi_start_deg=lo; rec.sandhi_end_deg=hi;
      rec.width_deg=((hi-lo)%360+360)%360;
    }
    bhavas.push(rec);}
  var vargas=VCODES.map(function(v){var p={},pb={};
    order.forEach(function(n){p[SK[n]]=vargaSign(v[0],pos[n].sid);
      /* A varga has no cusps: vargaSign returns a rāśi integer, and the
         meridian is an observational quantity of the birth moment that does
         not map through a division. So the varga's own houses stay whole-sign
         from the varga lagna, and the D1 bhāva is carried alongside, labelled
         as what it is. Under the default mode the two agree for D1 and the
         carried value is simply the whole-sign house. */
      pb[SK[n]]=FRAME.houseOfLon(pos[n].sid);});
    /* a varga has its own ascendant; without it the division cannot be read as a
       chart, only as a list of signs */
    return {varga:v[0],sa:v[1],en:v[2],lagna:vargaSign(v[0],lagSid),positions:p,
            d1_bhava:pb, d1_bhava_note:"bhāva carried from the rāśi chart under the "+
              "selected house system; a varga has no cusps of its own"};});
  var ck=names.map(function(n){return {n:n,d:pos[n].sid%30};})
    .sort(function(a,b){return b.d-a.d;})
    .map(function(x,i){return {rank:i+1,label_short:["AK","AmK","BK","MK","PK","GK","DK"][i],
      label_en:["Soul-significator","Minister-significator","Brother-significator","Mother-significator",
                "Children-significator","Cousin-significator","Spouse-significator"][i],
      graha:SK[x.n],deg_in_sign:x.d};});
  var av=names.map(function(n){var b=baladi(pos[n].sid);
    return {graha:SK[n],avastha_iast:b[0],strength_percent:b[1]};});
  var ar=[];
  for(var b2=1;b2<=12;b2++){var sg=arudhaOf(b2,LS,posBySign,FRAME.madhyaSignOfHouse(b2));
    ar.push({bhava_idx:b2-1,bhava_sa:BH[b2-1],arudha_label:(b2===1?"AL":"A"+b2),
      arudha_rashi_idx:sg,arudha_rashi_sa:SA[sg]});}
  // current sky
  var nowD=new Date(), nowJd=jdFromUTC(nowD.getUTCFullYear(),nowD.getUTCMonth()+1,nowD.getUTCDate(),
      nowD.getUTCHours()+nowD.getUTCMinutes()/60+nowD.getUTCSeconds()/3600);
  var nay=ayanamsa(nowJd), tpos={},transits=[];
  names.forEach(function(n){var r=lonAndSpeed(n,nowD); tpos[n]={sid:norm(r.lon-nay),speed:r.speed};});
  var tra=norm(meanNode(nowJd)-nay);
  tpos.Rahu={sid:tra,speed:-0.0529}; tpos.Ketu={sid:norm(tra+180),speed:-0.0529};
  order.forEach(function(n){var nk=nak(tpos[n].sid);
    transits.push({key:n.toLowerCase(),sa:SK[n],iast:SK[n],en:n,sidereal_deg:tpos[n].sid,
      rashi:rashiObj(tpos[n].sid),nakshatra:{en:nk.name,lord:SK[nk.lord]},
      nakshatra_pada:nk.pada,retrograde:tpos[n].speed<0});});
  var natalForRel={}; order.forEach(function(n){natalForRel[n]={sid:pos[n].sid};});
  var trForRel={}; order.forEach(function(n){trForRel[n]={sid:tpos[n].sid};});
  // sade sati: Saturn transiting 12th, 1st or 2nd from natal Moon (dhaiya for 4th/8th)
  var mSign=Math.floor(pos.Moon.sid/30)%12, satSign=Math.floor(tpos.Saturn.sid/30)%12;
  var rel=((satSign-mSign)%12+12)%12;
  var sade={active:(rel===11||rel===0||rel===1),
    phase:(rel===11?"rising":rel===0?"peak":rel===1?"setting":(rel===3?"dhaiya-4th":rel===7?"dhaiya-8th":"inactive")),
    saturn_current_rashi_sa:SA[satSign],natal_moon_rashi_sa:SA[mSign]};
  if(rel===3||rel===7) sade.active=true;
  var HOUSE={},DIGN={};
  order.forEach(function(n){ HOUSE[n]=FRAME.houseOfLon(pos[n].sid);
    DIGN[n]=digOf(n,posBySign[n],pos[n].sid%30); });
  var ownsMap={}; for(var hh=1;hh<=12;hh++){var lo=FRAME.lordOfHouse(hh);(ownsMap[lo]=ownsMap[lo]||[]).push(hh);}
  var avOut=ashtakavarga(posBySign,LS);
  avOut.bhinna.forEach(function(x){x.graha_sa=SK[x.graha]||x.graha;});
  /* A by-house reading of the sarva totals. The BINDUS THEMSELVES ARE RĀŚI
     QUANTITIES and are not touched by the house system — Ashtakavarga counts
     into rāśis, full stop. What follows the frame is only which bhāva each
     rāśi is called, which is what a reader wants when asking "how many bindus
     in my 10th". Under Śrīpati a bhāva can span two rāśis, so the mapping is
     by the bhāva's madhya and one rāśi may carry no bhāva label at all while
     another carries two; the note says so rather than hiding it. */
  avOut.by_house=(function(){
    var rows=[],seen={};
    for(var hh=1;hh<=12;hh++){
      var rs=FRAME.madhyaSignOfHouse(hh); seen[rs]=(seen[rs]||0)+1;
      rows.push({house:hh,rashi_idx:rs,rashi_sa:SA[rs],
                 bindus:avOut.sarva[rs]});
    }
    var doubled=Object.keys(seen).filter(function(k){return seen[k]>1;}).length;
    return {rows:rows,
      note:"bindus are rāśi quantities and do not change with the house "+
           "system; only the bhāva label does. Mapped by each bhāva's madhya."+
           (doubled?" "+doubled+" rāśi(s) carry more than one bhāva's madhya "+
            "under this frame, so their bindus appear twice.":"")};
  })();
  var yg=yogaList({house:HOUSE,signOf:posBySign,dig:DIGN,LS:LS,LORD:LORD,owns:ownsMap,SK:SK});
  var bb=bhayat(pos.Moon.sid,pos.Moon.speed,jd,date,ay);
  grahas.forEach(function(g){var n=null;order.forEach(function(o){if(SK[o]===g.key)n=o;});
    if(n) g.dignity=DIGN[n];});
  // ---- Shadbala ----
  var SBD={}; names.forEach(function(n){ try{SBD[n]=declOf(n,date);}catch(e){SBD[n]=0;} });
  var ev=sunriseSunset(date,inp.lat,inp.lon);
  var srH=ev.rise?((ev.rise.getTime()-Date.UTC(inp.year,inp.month-1,inp.day,0,0,0))/3600000+tz)%24:6;
  var ssH=ev.set?((ev.set.getTime()-Date.UTC(inp.year,inp.month-1,inp.day,0,0,0))/3600000+tz)%24:18;
  var DAYL=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var sbOut=null;
  try{
    var ckend=cheshtaKendra(date,ay,pos);
    var sunSign=Math.floor(pos.Sun.sid/30)%12;
    var masaW=sankrantiWeekday(jd,date,sunSign*30);
    var varshaW=sankrantiWeekday(jd,date,0);
    sbOut=shadbala({planets:pos,LS:LS,lagSid:lagSid,frame:FRAME,jd:jd,date:date,sunrise:srH,sunset:ssH,
      birthH:inp.hour+inp.minute/60,decl:SBD,cheshtaK:ckend,vargaSign:vargaSign,digOf:digOf,LORD:LORD,
      natFriend:function(a,b){ if(FRD[a]&&FRD[a].indexOf(b)>=0)return "friend";
        if(ENM[a]&&ENM[a].indexOf(b)>=0)return "enemy"; return "neutral"; },
      weekday:(Math.floor(jdFromUTC(inp.year,inp.month,inp.day,0)+1.5)%7+7)%7,
      varshaLord:DAYL[varshaW], masaLord:DAYL[masaW]});
  }catch(err){ sbOut={error:String(err&&err.message||err)}; }

  /* ===== BHĀVA BALA, ŚRĪPATI'S EXACT FORM — Adh. 3, śl. 20–23 =============
   *
   * The report has carried a bhāva bala for a long time, and its own note
   * conceded what it was: "the simplified forms; the exact treatment weighs
   * each glance in Virupas by angle." Śrīpati IS that exact treatment, worked
   * through on a real chart with every intermediate printed, so there is no
   * longer a reason to approximate under his paddhati.
   *
   * Four components (Adh. 3, śl. 20–23 and the prose at p.55):
   *
   *   svami   Σ over the rāśis the bhāva spans of (arc in that rāśi ÷ 30°)
   *           × the ṣaḍbala of that rāśi's lord.
   *           DIVIDED BY 30°, NOT BY THE BHĀVA'S OWN WIDTH. His first worked
   *           bhāva happens to be exactly 30° wide so it cannot settle the
   *           question, but his second cannot be read any other way: ÷30
   *           gives 6·9078 against his printed 6·908, while ÷width gives
   *           7·476. So a bhāva narrower than a rāśi carries less than a full
   *           lord, and a wider one carries more. All twelve reproduce exactly.
   *   drg     ¼ × (benefic dṛṣṭi on the bhāva − malefic dṛṣṭi on it), the
   *           same quarter rule the graha dṛk bala uses.
   *   gurubudha  the ENTIRE dṛṣṭi of Jupiter and Mercury on the bhāva, added
   *           again on top of their quarter — his rule, not BPHS's.
   *   dig     by the class of the rāśi holding the MADHYA: biped signs are
   *           strong in the 1st bhāva, quadruped in the 10th, watery in the
   *           4th, keeta in the 7th, and strengthless in the bhāva opposite
   *           that (śl. 22). Distance from the WEAK bhāva, folded at 180°,
   *           ÷3 virūpas. Tulā in the 7th is the instructive case: biped, so
   *           its weak point is the 7th bhāva, which is itself — digbala
   *           exactly nil, and his total confirms it.
   *
   * Dṛṣṭi on a bhāva is measured TO ITS MADHYA (Summary, p.162), which is
   * what makes the quantity meaningful under unequal bhāvas at all.
   *
   * NOT APPLIED, deliberately: the prose at p.55 also adds one rūpa when
   * Jupiter or Mercury occupy the bhāva and subtracts one when Saturn, Mars
   * or the Sun do. His own worked table does not apply it — the Sun and
   * Saturn sit in his first bhāva and no rūpa is deducted — so the edition is
   * internally inconsistent here. Following the prose would break the twelve
   * totals that currently reconcile, so the rule is recorded and left off,
   * and the payload says so rather than silently choosing.
   *
   * Śrīpati-only. Under BPHS the report's existing section is unchanged. */
  var bhavaBalaOut=null;
  if(FRAME.mode==="sripati" && sbOut && sbOut.planets && !sbOut.error){
    try{
      var SBBY={}; sbOut.planets.forEach(function(r){ SBBY[r.graha]=r.total_rupa; });
      var BEN_SP=["Jupiter","Venus","Mercury","Moon"];
      /* sign classes as Sastri adopts them (p.54), following Garga: Vṛścika
         alone is keeta, Kaṭaka is watery, and the whole of Kumbha is biped
         against the view that splits it. Dhanus and Makara ARE split. */
      var signClass=function(sg,degIn){
        if(sg===2||sg===6||sg===5||sg===10) return "biped";     /* Mithuna Kanyā Tulā Kumbha */
        if(sg===8) return degIn<15?"biped":"quadruped";          /* Dhanus */
        if(sg===9) return degIn<15?"quadruped":"watery";         /* Makara */
        if(sg===0||sg===1||sg===4) return "quadruped";           /* Meṣa Vṛṣabha Siṃha */
        if(sg===7) return "keeta";                               /* Vṛścika */
        return "watery";                                         /* Kaṭaka Mīna */
      };
      var WEAKB={biped:7,quadruped:4,watery:10,keeta:1};
      bhavaBalaOut=[];
      for(var bh=1;bh<=12;bh++){
        var lo=norm(FRAME.sripati.sandhi[bh===1?12:bh-1]),
            hi=norm(FRAME.sripati.sandhi[bh]),
            md=norm(FRAME.sripati.madhya[bh]),
            wid=((hi-lo)%360+360)%360;
        /* walk the arc rāśi by rāśi */
        var svami=0, parts=[], cur=lo, done=0;
        while(done<wid-1e-9){
          var sgw=Math.floor(cur/30)%12;
          var toEdge=((sgw+1)*30-cur); if(toEdge<=1e-12)toEdge=30;
          var step=Math.min(toEdge,wid-done);
          var lw=LORD[sgw], sbw=SBBY[lw];
          if(sbw!=null){ svami+=(step/30)*sbw; }
          parts.push({rashi_idx:sgw,arc_deg:+step.toFixed(6),lord:SK[lw]});
          cur=norm(cur+step); done+=step;
        }
        /* dṛṣṭi cast on the madhya */
        var sub=0,pap=0,gb=0;
        /* dṛṣṭi on a bhāva is cast at its MADHYA (Summary p.162), by his own
           dṛṣṭi function — the one his Bhāva Drigbala table p.21 is built on */
        ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].forEach(function(q){
          if(!pos[q])return;
          var v=sripatiDrishti(q,pos[q].sid,md); if(!v)return;
          if(BEN_SP.indexOf(q)>=0) sub+=v; else pap+=v;
          if(q==="Jupiter"||q==="Mercury") gb+=v;
        });
        var drg=(sub-pap)/4;
        var cl=signClass(Math.floor(md/30)%12, md%30);
        var weakMd=norm(FRAME.sripati.madhya[WEAKB[cl]]);
        var ddg=Math.abs(((md-weakMd)%360+360)%360); if(ddg>180)ddg=360-ddg;
        var digb=ddg/3;
        bhavaBalaOut.push({bhava:bh,
          svami_rupa:+(svami).toFixed(6), spans:parts,
          drg_virupa:+drg.toFixed(6), guru_budha_virupa:+gb.toFixed(6),
          dig_virupa:+digb.toFixed(6), dig_class:cl,
          total_rupa:+(svami+(drg+gb+digb)/60).toFixed(6)});
      }
    }catch(e){ bhavaBalaOut={error:String(e&&e.message||e)}; }
  }
  /* The pañcāṅga OF THE BIRTH, which the report has always shown and the JSON has
     never carried — only the pañcāṅga of the moment the file was made, under
     current_phase. The two are different facts and a reader of the file alone
     could not recover the first from the second. */
  var natalPan=panchang(pos.Sun.sid,pos.Moon.sid,jd);
  var natalMasa=masaOf(pos.Sun.sid,pos.Moon.sid,ay);
  var civilWd=(Math.floor(jdFromUTC(inp.year,inp.month,inp.day,0)+1.5)%7+7)%7;
  var beforeSunrise=(inp.hour+inp.minute/60)<srH;
  var elong=norm(pos.Moon.sid-pos.Sun.sid);
  var risingT=null;
  try{ risingT=risingTimes(inp.lat,ay); }catch(e){}
  var lagRashi=Math.floor(lagSid/30)%12;
  return {input:inp, jd_utc:jd, ayanamsha_deg:ay,
    /* WHICH TRADITION PRODUCED THESE NUMBERS.
     *
     * The house toggle is not only a house toggle: selecting Śrīpati selects
     * his paddhati, and several quantities below are computed from his text
     * rather than from BPHS. Without this block a reader cannot tell which,
     * and a chart that does not say which system produced its figures cannot
     * be checked by whoever receives it — the same argument that put
     * house_system in this payload.
     *
     * It also records the opposite case honestly: Śrīpati is simply silent on
     * much of what this engine computes, and where he is silent BPHS is used
     * and said to be used, rather than letting the toggle imply an authority
     * his text does not claim. */
    paddhati:(function(){
      var sp=(FRAME.mode==="sripati");
      return {
        mode: sp?"sripati":"bphs",
        name: sp?"Śrīpatipaddhati":"Bṛhat Parāśara Horā Śāstra",
        edition: sp
          ? "Śrīpatipaddhati, tr. V. Subrahmanya Sastri, 1937"
          : "BPHS, tr. R. Santhanam (Ranjan), Vols. 1–2",
        follows_this_paddhati: sp
          ? ["bhāva division and sandhis (Adh. 1, śl. 6–8)",
             "bhāva-phala, the graded effect within a bhāva (Adh. 1, śl. 9–10)",
             "Ayana Bala, on a 24° parama-krānti half range (Adh. 3, śl. 15)",
             "Saptavargaja Bala, on the halving ladder (Adh. 3, śl. 2–3)",
             "tātkālika maitrī read from the bhāva chakra, not rāśi distance "+
               "(pp. 24–26) — this feeds Saptavargaja, Sthāna and the "+
               "Ṣaḍbala total, so it is the widest reaching difference",
             "dṛṣṭi on his quarters table, which carries the ¾/½/¼ rūpa "+
               "super-add for Saturn, Jupiter and Mars within it "+
               "(Adh. 2, śl. 5–6) and does not extend dṛṣṭi to the nodes",
             "pakṣa bala with Mercury always benefic, the Moon benefic in "+
               "either half, and the Moon's pakṣa NOT doubled (p. 38)",
             "per-head minimum strengths (p. 56)",
             "bhāva bala in its exact form, with the lord pro-rated across "+
               "the rāśis the bhāva spans (Adh. 3, śl. 20–23)",
             "Iṣṭa and Kaṣṭa phala, geometric (Adh. 4, śl. 6)"]
          : ["bhāva division (whole sign)",
             "Ayana Bala, on the obliquity of date (Ch. 27, vv. 15–17)",
             "Saptavargaja Bala, 45/30/20/15/10/4/2 (Ch. 26, vv. 2–4)",
             "Iṣṭa and Kaṣṭa phala, arithmetic (Ch. 28, v. 6)"],
        bphs_by_default: sp
          ? ["Ashtakavarga and its bindus — Śrīpati does not treat it",
             "the ṣoḍaśa vargas beyond his seven (rāśi, horā, drekkāṇa, "+
               "saptāṃśa, navāṃśa, dvādaśāṃśa, triṃśāṃśa)",
             "pañcāṅga, nakṣatras and all daśā computation",
             "yogas, ārūḍhas, kārakas and avasthās"]
          : [],
        excluded: sp
          ? [{what:"Śrīpati's own daśā system (Adh. 7)",
              why:"its period lengths are each graha's contribution to the "+
                  "āyurdāya, so computing them means computing a lifespan. "+
                  "This project presents longevity as doctrine to study and "+
                  "never as a figure about a person, so the system is "+
                  "described and deliberately not calculated. Viṃśottarī is "+
                  "used for timing and is BPHS's, not his."}]
          : [],
        note: sp
          ? "Śrīpati is an independent 11th-century author, not a commentator "+
            "on BPHS. Where the two differ, neither is corrected into the "+
            "other; this chart follows Śrīpati for the quantities listed and "+
            "BPHS for the rest, and says which is which."
          : "Figures follow BPHS throughout. Selecting Śrīpati houses switches "+
            "several of them to Śrīpati's own rules, which differ from BPHS "+
            "by more than the house division."
      };
    })(),
    birth_panchanga:{
      tithi_sa:natalPan.tithi_sa, paksha_sa:natalPan.paksha_sa,
      tithi_of_30:Math.floor(elong/12)+1,
      /* the vāra turns at sunrise, not at midnight: a birth before sunrise still
         belongs to the previous day's vāra, and that is the one a reading uses */
      vara_civil_sa:VARA[civilWd],
      vara_from_sunrise_sa:VARA[beforeSunrise?((civilWd+6)%7):civilWd],
      born_before_sunrise:beforeSunrise,
      nakshatra_sa:natalPan.nakshatra_sa, nakshatra_pada:nak(pos.Moon.sid).pada,
      yoga_sa:natalPan.yoga_sa, karana_sa:natalPan.karana_sa,
      masa_amanta:natalMasa.amanta, masa_purnimanta:natalMasa.purnimanta,
      ritu:natalMasa.ritu, ayana:natalMasa.ayana,
      sun_moon_elongation_deg:elong,
      moon_illuminated_fraction:(1-Math.cos(elong*D2R))/2,
      sunrise_local_hours:srH, sunset_local_hours:ssH},
    graha_yuddha:yuddhaOf(pos),
    rashi_rising_times:{latitude_deg:inp.lat, obliquity_deg:23.4392911,
      note:"oblique ascension — the time each rāśi takes to cross the eastern horizon "+
           "at this latitude, which BPHS 1.8-9 calls for when finding the ascendant",
      lagna_rashi_idx:lagRashi,
      lagna_rashi_rising_minutes:(risingT&&risingT[lagRashi])?risingT[lagRashi].rising_minutes:null,
      rashis:risingT},
    ayanamsa_mode:AYAN_MODE, ayanamsa_name:AYAN_MODES[AYAN_MODE].name, node_mode:nodeMode,
    ayanamsa_note:AYAN_MODES[AYAN_MODE].note, ashtakavarga:avOut, yogas:yg, bhayat:bb, shadbala:sbOut,
    /* Śrīpati's exact bhāva bala; null under BPHS, where the report's own
       simplified section stands. The ±1 rūpa occupancy rule is recorded but
       not applied — his worked table does not apply it either. */
    bhava_bala:bhavaBalaOut,
    bhava_bala_note:bhavaBalaOut&&!bhavaBalaOut.error
      ? "Śrīpati, Adh. 3, śl. 20–23. Bhāva bala = the ṣaḍbala of its lord, "+
        "pro-rated across the rāśis the bhāva spans at a thirtieth of a rūpa "+
        "per degree, plus a quarter of the net dṛṣṭi on its madhya, plus the "+
        "whole dṛṣṭi of Jupiter and Mercury, plus its dig bala by the class "+
        "of the rāśi holding the madhya. The one rūpa added for Jupiter or "+
        "Mercury occupying the bhāva, and deducted for Saturn, Mars or the "+
        "Sun, is stated in the same passage but is NOT applied in the "+
        "edition's own worked table, so it is not applied here either."
      : null,
    lagna:{sidereal_deg:lagSid,rashi:rashiObj(lagSid),nakshatra_pada:nak(lagSid).pada},
    /* The frame this chart was computed in, declared on its face. A chart
       JSON that does not say which house system produced its bhāvas cannot be
       checked by whoever receives it, and once the system is selectable that
       omission turns every bhāva in the file into a guess. mc_sidereal_deg is
       null under whole-sign because the meridian is not computed there — it is
       not a missing value but an unused one. */
    house_system:{mode:FRAME.mode,
      name:FRAME.mode==="sripati"?"Śrīpati bhāva-chalita (quadrant, trisected)"
                                 :"whole-sign (rāśi = bhāva, counted from the lagna)",
      requested:HOUSE_MODE,
      fell_back:FRAME.fellBack, fell_back_reason:FRAME.why,
      lord_rule:FRAME.mode==="sripati"
        ?"the lord of the rāśi containing the bhāva madhya"
        :"the lord of the rāśi, counted from the lagna's rāśi",
      mc_sidereal_deg:FRAME.mode==="sripati"?mcSid:null,
      note:"Śrīpati is later tradition, not BPHS. BPHS judges bhāvas by rāśi "+
           "from the lagna; the quadrant construction and its 15° strength rule "+
           "come from the Benares edition and later authorities. Graha dṛṣṭi, "+
           "Ashtakavarga bindus and the ārūḍhas are counted in rāśis in the "+
           "classical method — where they follow this toggle it is an extension, "+
           "and each says so where it is reported."},
    grahas:grahas, bhavas:bhavas, vargas:vargas,
    chara_karakas:ck, avasthas:av, arudhas:ar,
    current_phase:{asOf_jd_utc:nowJd, asOf_iso:nowD.toISOString(),
      transits:transits, transitRelations:relations(trForRel,natalForRel),
      panchang:panchang(tpos.Sun.sid,tpos.Moon.sid,nowJd), sadeSati:sade},
    /* Identifier, not branding: 99-main.js tests this string by substring to tell
       a locally computed chart from a remote one. The two must agree, so it keeps
       its original spelling through any rename. */
    substrate_stamp:"LearnHoro built-in engine · astronomy-engine (MIT) · Lahiri ayanāṃśa fitted to Swiss Ephemeris"};
};
})();


/* ===== Star wheel geometry =====
   A disc of the ecliptic, tilted away from the viewer, with the HORIZON FIXED and
   the ZODIAC ROTATING behind it.

   The rotation happens in the plane of the ecliptic *before* the tilt is applied.
   Rotating the already-projected ellipse instead would spin the ellipse itself —
   the tilt axis would turn with it and the plane would tumble like a flipped coin.

   Plane coordinates, right-handed, origin at the observer:
     phi = lagna - longitude          how far a point has risen, in degrees
     u   = -R*cos(phi)                east at phi=0 (screen left), west at phi=180
     v   =  R*sin(phi)                zero on the horizon, maximum at the meridian
     w   =  R*sin(beta)               ecliptic latitude, out of the plane

   Tilting about the u axis by T, then projecting to the screen:
     up    = v*cos(T) + w*sin(T)      screen height above the horizon line
     depth = v*sin(T) - w*cos(T)      distance away from the viewer

   At phi = 0 the point lands exactly at (cx - R, cy): the eastern horizon. That is
   the invariant the whole view rests on — whatever the engine reports as the lagna
   is, by construction, the longitude sitting on the east point. */
var SW_TILT_DEG=58;

function swProject(lonDeg, lagnaDeg, betaDeg, R, cx, cy, tiltDeg){
  var T=(tiltDeg==null?SW_TILT_DEG:tiltDeg)*Math.PI/180;
  var phi=((lagnaDeg-lonDeg)%360+360)%360*Math.PI/180;
  var beta=(betaDeg||0)*Math.PI/180;
  var u=-R*Math.cos(phi), v=R*Math.sin(phi), w=R*Math.sin(beta);
  var up=v*Math.cos(T)+w*Math.sin(T);
  var depth=v*Math.sin(T)-w*Math.cos(T);
  return {x:cx+u, y:cy-up, depth:depth,
          scale:1/(1+Math.max(-0.9,depth/(R*2.6))),
          above:up>=0};
}
/* the ellipse the ecliptic traces on screen, for drawing rings */
function swRingPath(R, cx, cy, tiltDeg, lagnaDeg, steps){
  var n=steps||180, d=[];
  for(var i=0;i<=n;i++){
    var lon=lagnaDeg-(i/n)*360;
    var p=swProject(lon, lagnaDeg, 0, R, cx, cy, tiltDeg);
    d.push((i?"L":"M")+p.x.toFixed(2)+","+p.y.toFixed(2));
  }
  return d.join(" ")+" Z";
}
/* an arc of the ecliptic between two longitudes, for sign and nakshatra bands */
function swBandPath(lon0, lon1, rIn, rOut, lagnaDeg, cx, cy, tiltDeg, steps){
  var n=steps||12, out=[], back=[];
  for(var i=0;i<=n;i++){
    var lon=lon0+(lon1-lon0)*(i/n);
    var a=swProject(lon, lagnaDeg, 0, rOut, cx, cy, tiltDeg);
    var b=swProject(lon, lagnaDeg, 0, rIn, cx, cy, tiltDeg);
    out.push((i?"L":"M")+a.x.toFixed(2)+","+a.y.toFixed(2));
    back.unshift("L"+b.x.toFixed(2)+","+b.y.toFixed(2));
  }
  return out.concat(back).join(" ")+" Z";
}


/* ===== Star catalogue =====
   All 27 yogatārās — the junction stars the nakṣatras are named for — plus bright
   stars near the ecliptic for context.

   Source: the HYG database (Hipparcos/Yale/Gliese compilation), stars identified by
   Bayer or Flamsteed designation and constellation, carrying HR numbers. Verified
   three ways before shipping:
     · Spica agrees with Swiss Ephemeris to 18.8 arcseconds
     · HYG agrees with the star list bundled in PyEphem to 0.6 arcseconds across the
       sixteen stars both carry
     · a positional cross-match into the Yale Bright Star Catalogue reproduced all
       sixteen with sub-arcsecond separation and matching magnitudes
   HYG's entry id 0 is the Sun, carried with placeholder coordinates; it and any
   zero-distance row are excluded.

   sid = sidereal longitude under Lahiri at J2000. lat = ecliptic latitude, which
   Jyotisha ignores but the sky does not. `inside` records whether the star actually
   falls within the equal 13°20' division named after it — seven do not. */
var STAR_AY_J2000=23.85631;
var YOGATARAS=[
  {id:0,nak:"Aśvinī",bayer:"β Ari",star:"Sheratan",hr:"553",sid:10.114,lat:8.487,mag:2.64,inside:true},
  {id:1,nak:"Bharaṇī",bayer:"41 Ari",star:"Bharani",hr:"838",sid:24.347,lat:10.450,mag:3.61,inside:true},
  {id:2,nak:"Kṛttikā",bayer:"η Tau",star:"Alcyone",hr:"1165",sid:36.136,lat:4.051,mag:2.85,inside:true},
  {id:3,nak:"Rohiṇī",bayer:"α Tau",star:"Aldebaran",hr:"1457",sid:45.933,lat:-5.467,mag:0.87,inside:true},
  {id:4,nak:"Mṛgaśīrṣā",bayer:"λ Ori",star:"Meissa",hr:"1879",sid:59.851,lat:-13.369,mag:3.39,inside:true},
  {id:5,nak:"Ārdrā",bayer:"α Ori",star:"Betelgeuse",hr:"2061",sid:64.898,lat:-16.027,mag:0.45,inside:false},
  {id:6,nak:"Punarvasu",bayer:"β Gem",star:"Pollux",hr:"2990",sid:89.360,lat:6.684,mag:1.16,inside:true},
  {id:7,nak:"Puṣya",bayer:"δ Cnc",star:"Asellus Australis",hr:"3461",sid:104.866,lat:0.077,mag:3.94,inside:true},
  {id:8,nak:"Āśleṣā",bayer:"ε Hya",star:"Ashlesha",hr:"3482",sid:108.488,lat:-11.104,mag:3.38,inside:true},
  {id:9,nak:"Maghā",bayer:"α Leo",star:"Regulus",hr:"3982",sid:125.973,lat:0.465,mag:1.36,inside:true},
  {id:10,nak:"Pūrva Phalgunī",bayer:"δ Leo",star:"Zosma",hr:"4357",sid:137.460,lat:14.334,mag:2.56,inside:true},
  {id:11,nak:"Uttara Phalgunī",bayer:"β Leo",star:"Denebola",hr:"4534",sid:147.761,lat:12.267,mag:2.14,inside:true},
  {id:12,nak:"Hasta",bayer:"δ Crv",star:"Algorab",hr:"4757",sid:169.595,lat:-12.196,mag:2.94,inside:true},
  {id:13,nak:"Citrā",bayer:"α Vir",star:"Spica",hr:"5056",sid:179.985,lat:-2.054,mag:0.98,inside:true},
  {id:14,nak:"Svātī",bayer:"α Boo",star:"Arcturus",hr:"5340",sid:180.377,lat:30.736,mag:-0.05,inside:false},
  {id:15,nak:"Viśākhā",bayer:"α Lib",star:"Zubenelgenubi",hr:"5531",sid:201.226,lat:0.333,mag:2.75,inside:true},
  {id:16,nak:"Anurādhā",bayer:"δ Sco",star:"Dschubba",hr:"5953",sid:218.715,lat:-1.986,mag:2.29,inside:true},
  {id:17,nak:"Jyeṣṭhā",bayer:"α Sco",star:"Antares",hr:"6134",sid:225.906,lat:-4.570,mag:1.06,inside:false},
  {id:18,nak:"Mūla",bayer:"λ Sco",star:"Shaula",hr:"6527",sid:240.729,lat:-13.788,mag:1.62,inside:true},
  {id:19,nak:"Pūrvāṣāḍhā",bayer:"ε Sgr",star:"Kaus Australis",hr:"6879",sid:251.222,lat:-11.052,mag:1.79,inside:false},
  {id:20,nak:"Uttarāṣāḍhā",bayer:"σ Sgr",star:"Nunki",hr:"7121",sid:258.529,lat:-3.450,mag:2.05,inside:false},
  {id:21,nak:"Śravaṇa",bayer:"α Aql",star:"Altair",hr:"7557",sid:277.920,lat:29.303,mag:0.76,inside:false},
  {id:22,nak:"Dhaniṣṭhā",bayer:"β Del",star:"Rotanev",hr:"7882",sid:292.485,lat:31.918,mag:3.64,inside:false},
  {id:23,nak:"Śatabhiṣā",bayer:"γ Aqr",star:"Sadachbia",hr:"8518",sid:312.858,lat:8.235,mag:3.86,inside:true},
  {id:24,nak:"Pūrva Bhādrapadā",bayer:"α Peg",star:"Markab",hr:"8781",sid:329.629,lat:19.406,mag:2.49,inside:true},
  {id:25,nak:"Uttara Bhādrapadā",bayer:"γ Peg",star:"Algenib",hr:"39",sid:345.300,lat:12.600,mag:2.83,inside:true},
  {id:26,nak:"Revatī",bayer:"ζ Psc",star:"Revati",hr:"361",sid:356.021,lat:-0.213,mag:5.21,inside:true},
];
/* bright stars within 30° of the ecliptic, magnitude 2.3 or brighter */
var BRIGHT_STARS=[
  {star:"Mirach",sid:6.549,lat:25.943,mag:2.07},
  {star:"Hamal",sid:13.806,lat:9.965,mag:2.01},
  {star:"Almach",sid:20.369,lat:27.806,mag:2.10},
  {star:"Algol",sid:32.311,lat:22.429,mag:2.09},
  {star:"Bellatrix",sid:57.090,lat:-16.816,mag:1.64},
  {star:"Capella",sid:58.002,lat:22.864,mag:0.08},
  {star:"Mintaka",sid:58.506,lat:-23.553,mag:2.25},
  {star:"Elnath",sid:58.719,lat:5.385,mag:1.65},
  {star:"Alnilam",sid:59.607,lat:-24.506,mag:1.69},
  {star:"Alnitak",sid:60.825,lat:-25.293,mag:1.74},
  {star:"Menkalinan",sid:66.054,lat:21.508,mag:1.90},
  {star:"Alhena",sid:75.248,lat:-6.743,mag:1.93},
  {star:"Castor",sid:86.384,lat:10.096,mag:1.58},
  {star:"Procyon",sid:91.929,lat:-16.020,mag:0.40},
  {star:"Alphard",sid:123.423,lat:-22.382,mag:1.99},
  {star:"Algieba",sid:125.759,lat:8.815,mag:2.01},
  {star:"Menkent",sid:198.452,lat:-22.080,mag:2.06},
  {star:"Larawag",sid:231.479,lat:-11.738,mag:2.29},
  {star:"Sargas",sid:241.743,lat:-19.645,mag:1.86},
  {star:"Fomalhaut",sid:310.004,lat:-21.136,mag:1.17},
  {star:"Diphda",sid:338.727,lat:-20.784,mag:2.04},
  {star:"Alpheratz",sid:350.452,lat:25.680,mag:2.07},
];
var YOGATARAS_MISSING=[];   /* none — the catalogue is complete */

/* the wheel's geometry and catalogue are used by the report bundle */
try{ window.swProject=swProject; window.swRingPath=swRingPath; window.swBandPath=swBandPath;
     window.SW_TILT_DEG=SW_TILT_DEG; window.YOGATARAS=YOGATARAS; window.BRIGHT_STARS=BRIGHT_STARS; }catch(e){}
