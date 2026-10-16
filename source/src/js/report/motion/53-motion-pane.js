/* ===== The Motion tab: markup, controls, handlers ===== */

/* One banded group inside the control panel. The key becomes a data attribute so a
   band can be tinted or hidden without reaching for :nth-child, which would silently
   re-target the moment a band is added. */
function moBand(key,title,hint,rows){
  return '<section class="moband" data-moband="'+key+'">'+
    '<h4 class="mobandh"><span class="mobandt">'+esc(title)+'</span>'+
    (hint?('<span class="mobandn">'+esc(hint)+'</span>'):"")+'</h4>'+
    '<div class="mobandb">'+rows+'</div></section>';
}
function moChipRow(label,items,cur,attr,extra){
  return '<div class="morow"><span class="molab">'+esc(label)+'</span>'+
    items.map(function(it){
      return '<button type="button" class="skyv'+(it.k===cur?" on":"")+'" '+attr+'="'+it.k+'"'+
        (it.title?(' title="'+esc(it.title)+'"'):"")+'>'+esc(it.label)+'</button>';
    }).join("")+(extra||"")+'</div>';
}
var MO_TOGGLES=[
  {k:"trail",  label:"Trails"},
  {k:"glow",   label:"Glow"},
  {k:"stars",  label:"Starfield"},
  {k:"grid",   label:"Guides"},
  {k:"labels", label:"Labels"},
  {k:"loopFade",label:"Loop fade"},
  {k:"symbols", label:"Symbols"}
];
var MO_CAPS=[
  {k:"logo",  label:"Logo"},
  {k:"date",  label:"Date"},
  {k:"handle",label:"Handle"},
  {k:"ctx",   label:"When & where"}
];
function motionPane(D,J){
  /* No chart is a valid state now, not a reason to render nothing: fifteen of the
     scenes are about the sky rather than about a person. The nine that are not stay
     gated, and say why. */
  MO.D=D||null; MO.J=(J&&J.input)?J:null; MO.p=0; MO.playing=false; MO.scene="retro"; MO.ratio="9:16";
  MO.pal="midnight"; MO.studio=false;
  MO.opt.subject="Mars"; MO.opt.exag=40; MO.opt.symbols=false;
  MO.opt.spanN=12; MO.opt.spanU="y"; MO.speed=1;
  MO.opt.houses="both"; MO.opt.eclN=10;
  MO.opt.varga=0; MO.opt.rpin=-1; MO.opt.npin=-1;
  MO.cap.title=""; MO.cap.sub="";
  MO_CACHE={};
  for(var g in MO.show) MO.show[g]=true;
  return moPaneHTML();
}

/* The panel's markup, with no state reset in it.
   Switching language has to rebuild the whole panel rather than repaint a few
   buttons — scene names, option lists and band headings all carry language, and
   patching only the obvious ones leaves a Hindi frame under English controls. So
   the markup is separated from the initialisation that motionPane() does once. */
function moPaneHTML(){
  return '<p class="knote">'+MO_SCENES.length+' animations built from this chart and the same ephemeris the rest of '+
    'the site uses. Everything here is drawn on a canvas rather than as a chart, because these are '+
    'made to be <b>watched and posted</b> rather than measured — choose a vertical frame, press play, '+
    'and screen-record. <b>Studio mode</b> hides the whole site so the recording is clean. The '+
    '<b>export</b> button hands you the numbers behind whichever scene is running, as a spreadsheet.</p>'+

    (moHasChart()?"":'<p class="monochart">'+esc(moT("noChartYet"))+'</p>')+
    '<div class="moscenes">'+MO_SCENES.map(function(s){
      var ok=moSceneAvailable(s.key);
      return '<button type="button" class="moscene'+(s.key===MO.scene?" on":"")+
        (ok?"":" locked")+'" data-moscene="'+s.key+'"'+(ok?"":' disabled')+
        '><b>'+esc(moSceneWords(s).label)+'</b><span>'+
        esc(ok?moSceneWords(s).sub:moWhyChart(s.key))+'</span></button>'; }).join("")+'</div>'+

    '<div class="mowrap" id="mowrap">'+
      '<div class="mostage" id="mostage"><canvas id="mocanvas" width="1080" height="1920" role="img" aria-label="Animated diagram. The written explanation is below it."></canvas></div>'+
      '<button type="button" class="moexit" id="moexit">Esc — leave studio</button>'+
      '<div class="mopanel">'+

        /* Five bands. Thirteen flat rows all looked alike, so finding the speed
           control meant reading every label. The grouping is by what you are
           doing — running it, choosing what is in it, how it looks, what it says,
           getting it out — and each band is a card of its own so the boundaries
           are visible rather than implied by spacing. */
        moBand("play","Playback","run the scene and move through it",
        '<div class="morow">'+
          '<button type="button" class="k-btn" id="moplay" aria-pressed="false">Play</button>'+
          '<button type="button" class="k-btn sec" id="morestart">Restart</button>'+
          /* No Length control: the duration is derived from the span and the
             speed and shown read-only, because three knobs for two degrees of
             freedom is what made "1/8 speed for 12 months" ambiguous. */
          '<span class="molab">Speed</span>'+
          '<select id="mospeed" class="skysel">'+
            /* Down to a tenth. The slow end is for study rather than for export:
               a 60 s loop at 1/10 runs ten minutes, which on a twelve-step walk is
               about fifty seconds on each bhava - long enough to read the words and
               look back at the wheel before it moves on. The fast end is unchanged. */
            [[0.1,"\u2152\u00d7"],[0.2,"\u2155\u00d7"],[0.25,"\u00bc\u00d7"],[0.5,"\u00bd\u00d7"],
             [1,"1\u00d7"],[2,"2\u00d7"],[4,"4\u00d7"]]
            .map(function(s){ return '<option value="'+s[0]+'"'+(s[0]===MO.speed?" selected":"")+'>'+s[1]+'</option>'; }).join("")+
          '</select>'+
          '<span class="moval modurv" id="modurv">'+esc(moPaceLabel())+'</span>'+
          '<button type="button" class="skyv'+(MO_PACE.hold?" on":"")+
            '" data-mohold="1" title="Slow down at every new moon, full moon and '+
            'eclipse so the words can be read">'+esc(moT("holdEvents"))+'</button>'+
        '</div>'+
        /* Frame stepping sits with the scrub rather than with Play: both move the
           playhead, and loose in the row above the two arrows wrapped apart from
           each other and from the frame counter, reading as unrelated controls. */
        '<div class="morow"><span class="molab">Scrub</span>'+
          '<input type="range" id="moscrub" min="0" max="1000" step="1" value="0">'+
          '<span class="mogrp">'+
            '<button type="button" class="skyv" id="mostepb" title="Back one frame">\u2039</button>'+
            '<button type="button" class="skyv" id="mostepf" title="Forward one frame">\u203a</button>'+
            '<span class="mofps" id="mofps">—</span>'+
          '</span>'+
        '</div>')+

        moBand("scene","This scene","what the frame contains",
        /* The class matters: the row breaks its own lines with a full-width spacer, and the
           rule that gives it that width is written against .moscopts. With the id alone
           it never matched, so every scene's options ran together on one line. */
        '<div class="morow moscopts" id="moscopts"></div>'+
        '<div class="morow"><span class="molab">Grahas</span>'+
          [["Sun","Su"],["Moon","Mo"],["Mars","Ma"],["Mercury","Me"],["Jupiter","Ju"],
           ["Venus","Ve"],["Saturn","Sa"],["Rahu","Ra"],["Ketu","Ke"]].map(function(g){
            return '<button type="button" class="skyv on" data-mograha="'+g[0]+'">'+g[1]+'</button>';
          }).join("")+
          '<span class="mopre"><button type="button" class="skyv" data-mopre="all">all</button>'+
          '<button type="button" class="skyv" data-mopre="slow">slow</button></span>'+
        '</div>')+

        (moHasChart()?"":
        moBand("where","Where","the place these are drawn for",
        '<div class="morow"><span class="molab">'+esc(moT("pickPlace"))+'</span>'+
          '<select id="moplacesel" class="skysel">'+moPlaceOptions()+'</select>'+
          '<span class="mohint">sunrise, the lagna and the Hindu date all depend on '+
          'where you are standing; with no chart cast there is nothing to take the '+
          'place from, so choose one</span>'+
        '</div>'))+
        moBand("look","Look","shape, colour and the drawing itself",
        /* Language sits in Look because that is what it changes: the frame's own
           words. It governs the canvas, this panel's labels and what the exports
           carry — not the reference pages and not the reading note below, which
           stay in English on purpose. */
        '<div class="morow"><span class="molab">'+esc(moT("language"))+'</span>'+
          [["en","English"],["hi","\u0939\u093f\u0928\u094d\u0926\u0940"]].map(function(l){
            return '<button type="button" class="skyv'+((MO_LANG===l[0])?" on":"")+
              '" data-molang="'+l[0]+'">'+esc(l[1])+'</button>'; }).join("")+
          '<button type="button" class="skyv'+(MO_DEVNUM?" on":"")+
            '" data-modevnum="1" title="Devan\u0101gar\u012b numerals">\u0968\u0969</button>'+
          '<span class="mohint">the frame, this panel and the exports follow it; the '+
          'reading note below and the reference pages stay in English</span>'+
        '</div>'+
        moChipRow("Frame",Object.keys(MO_RATIOS).map(function(k){
          return {k:k,label:MO_RATIOS[k].label,title:MO_RATIOS[k].note}; }),"9:16","data-moratio")+
        moChipRow("Palette",Object.keys(MO_PALS).map(function(k){
          return {k:k,label:MO_PALS[k].label}; }),"midnight","data-mopal")+
        '<div class="morow"><span class="molab">Show</span>'+
          MO_TOGGLES.map(function(t){
            return '<button type="button" class="skyv'+(MO.opt[t.k]?" on":"")+'" data-moopt="'+t.k+
              '">'+esc(t.label)+'</button>'; }).join("")+
        '</div>'+
        /* Each slider keeps its label and its read-out in one group, so a narrow panel
           wraps the pair as a unit instead of orphaning "Stars" at the end of the
           trail slider's line. */
        '<div class="morow">'+
          '<span class="mosld"><span class="molab">Trail</span>'+
            '<input type="range" id="motrail" min="5" max="90" step="1" value="35">'+
            '<span class="moval" id="motrailv">35%</span></span>'+
          '<span class="mosld"><span class="molab">Stars</span>'+
            '<input type="range" id="modens" min="0" max="400" step="10" value="160">'+
            '<span class="moval" id="modensv">160</span></span>'+
        '</div>')+

        moBand("cap","Caption","the words burned into the frame",
        '<div class="morow mocaprow"><span class="molab">Caption</span>'+
          '<input type="text" id="motitle" class="motext" placeholder="title — leave blank for the scene&rsquo;s own" maxlength="64">'+
          '<input type="text" id="mosub" class="motext" placeholder="subtitle" maxlength="80"></div>'+
        '<div class="morow"><span class="molab">Stamp</span>'+
          MO_CAPS.map(function(t){
            return '<button type="button" class="skyv'+(MO.cap[t.k]?" on":"")+'" data-mocap="'+t.k+
              '">'+esc(t.label)+'</button>'; }).join("")+
          '<input type="text" id="mohandle" class="motext mohandle" value="@Nirayana.Soft" maxlength="30">'+
        '</div>')+

        moBand("out","Take it away","record it, or take the numbers",
        '<div class="morow">'+
          '<button type="button" class="k-btn" id="mostudio" aria-pressed="false">Studio mode</button>'+
          '<button type="button" class="k-btn sec" id="moxls">Export data (.xlsx)</button>'+
          '<button type="button" class="k-btn sec" id="mopng">Save this frame (.png)</button>'+
          '<span class="moxlsmsg" id="moxlsmsg"></span>'+
        '</div>')+
        /* The reading note sits below every control, so the controls stay within reach of
           the frame and the note reads as a footnote to the scene rather than a preamble
           you scroll past to get to Play. */
        '<div class="moread" id="moread"></div>'+
      '</div>'+
    '</div>'+

    '<div class="kbox"><b>Making a reel.</b> Pick the vertical frame, set the length to 15 seconds, '+
    'press <b>Studio mode</b>, then record your screen — QuickTime on a Mac, or the built-in recorder '+
    'on an iPhone. That gives you an MP4 straight away. A browser cannot write an MP4 by itself, which '+
    'is why there is no video button here: anything it could produce would be a WebM you would have to '+
    'convert anyway. Add music in Instagram rather than in the file — a licensed track baked into a '+
    'video gets the post muted.</div>'+
    '<div class="kbox"><b>The export.</b> Each scene can hand you its own numbers as a spreadsheet: '+
    'the daily path and the station dates for a retrograde, every sign ingress across the span for '+
    'gochara, altitude and azimuth through the night for the birth sky, the yogatārā table with real '+
    'star positions, the daśā tree with its dates. Every workbook opens with a sheet recording the '+
    'birth data, the ayanāṃśa and the house system, so a file still makes sense a year later.</div>'+
    '<div class="kbox"><b>What these are and are not.</b> The positions are real and computed the same '+
    'way as everywhere else on this site. The <i>drawing</i> takes liberties on purpose: latitude is '+
    'exaggerated in the orrery, trails are longer than any real afterglow, and glow is decoration. '+
    'They are made to be legible at the size of a phone held at arm&rsquo;s length, not to be measured '+
    'off the screen. For measurement, use the Sky tab.</div>';
}
/* per-scene extra controls */
/* A line break inside the flex row. A literal <br> will not do it: Chromium gives it the
   right computed flex but still lays it out at zero width, so the break never happens.
   An empty span is an ordinary flex item and breaks the line as intended. */
var MO_BRK='<span class="mobrk"></span>';
/* Names for the two subject pickers. The scenes themselves carry the same
   tables; these are here because the control panel is built before any scene
   draws. */
var MO_RA12=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
var MO_NK27=["Aśvinī","Bharaṇī","Kṛttikā","Rohiṇī","Mṛgaśirā","Ārdrā","Punarvasu","Puṣya","Āśleṣā","Maghā","Pūrva Phalgunī","Uttara Phalgunī","Hasta","Citrā","Svātī","Viśākhā","Anurādhā","Jyeṣṭhā","Mūla","Pūrva Āṣāḍhā","Uttara Āṣāḍhā","Śravaṇa","Dhaniṣṭhā","Śatabhiṣā","Pūrva Bhādrapadā","Uttara Bhādrapadā","Revatī"];
var MO_UORD=["h","d","m","y"];
function moSpanRow(units,hint){
  /* A scene may not offer every unit — years are meaningless for the pañcāṅga, hours for
     the daśā. If the unit carried over from the last scene is not on offer, snap the state
     to the coarsest one that is no coarser than it, so the select and moSpanMs() agree.
     Without this the browser shows the first option while the span stays whatever it was. */
  if(units.indexOf(MO.opt.spanU)<0){
    var cur=MO_UORD.indexOf(MO.opt.spanU), pick=units[0];
    units.forEach(function(u){ if(MO_UORD.indexOf(u)<=cur) pick=u; });
    MO.opt.spanU=pick; MO_CACHE={};
  }
  return '<span class="molab">Span</span>'+
    '<input type="number" id="mospann" class="monum" min="1" max="999" step="1" value="'+
      MO.opt.spanN+'">'+
    '<select id="mospanu" class="skysel">'+units.map(function(u){
      return '<option value="'+u+'"'+(u===MO.opt.spanU?" selected":"")+'>'+MO_UNITS[u].label+'</option>';
    }).join("")+'</select>'+
    (hint?('<span class="mohint">'+esc(hint)+'</span>'):"");
}
function moSceneOpts(){
  try{ moSceneGuide(); }catch(e){}
  /* A canvas is opaque to a screen reader. The written note below carries the
     meaning, so the label points at it and names the scene rather than leaving
     an unlabelled graphic. */
  try{
    var cv=document.getElementById("mocanvas"), sc=moSceneOf(MO.scene);
    if(cv&&sc) cv.setAttribute("aria-label",
      moSceneWords(sc).title+" \u2014 "+moSceneWords(sc).sub+
      ". Animated diagram; the written explanation is below it.");
  }catch(e){}
  var host=document.getElementById("moscopts"); if(!host) return;
  var k=MO.scene, h="";
  if(k==="retro"||k==="drishti"){
    h='<span class="molab">Graha</span>'+
      (k==="drishti"?MO_NAMES:["Mercury","Venus","Mars","Jupiter","Saturn"]).map(function(en){
        return '<button type="button" class="skyv'+(MO.opt.subject===en?" on":"")+
          '" data-mosubj="'+en+'">'+esc(MO_FULL[en])+'</button>'; }).join("")+
      (k==="drishti"?(MO_BRK+moSpanRow(["d","m","y"],"how far forward the graha travels"))
       :(MO_BRK+'<span class="molab">From</span>'+
         [["today","today"],["birth","the birth moment"]].map(function(f){
           return '<button type="button" class="skyv'+
             (((MO.opt.from||"today")===f[0])?" on":"")+
             '" data-mofrom="'+f[0]+'">'+esc(f[1])+'</button>'; }).join("")+
         MO_BRK+moSpanRow(["m","y"],"the window to search")+
         '<span class="mohint">every retrograde inside the window is found and shown in '+
         'turn; if there is none, the frame says so and gives the date of the next one</span>'));
  } else if(k==="gochara"){
    h=moSpanRow(["d","m","y"],"from today forward");
  } else if(k==="orrery"){
    h=moSpanRow(["d","m","y"],"from the birth moment")+
      '<span class="mosld"><span class="molab">Latitude ×</span>'+
      '<input type="range" id="moexag" min="8" max="90" step="2" value="'+
      MO.opt.exag+'"><span class="moval" id="moexagv">'+MO.opt.exag+'</span></span>';
  } else if(k==="birthsky"){
    h=moSpanRow(["h","d"],"centred on the birth moment");
  } else if(k==="nakshatra"){
    h='<span class="mohint">all twenty-seven in turn — a longer length lingers on each</span>';
  } else if(k==="dasha"){
    h='<span class="mohint">the whole Viṃśottarī cycle from birth</span>';
  } else if(k==="eclipse"){
    h='<span class="molab">How many</span>'+[6,10,16,24].map(function(n){
        return '<button type="button" class="skyv'+(MO.opt.eclN===n?" on":"")+
          '" data-moecln="'+n+'">'+n+'</button>'; }).join("")+
      '<span class="mohint">of each kind, so 10 gives twenty in all — every type, from today</span>';
  } else if(k==="panchanga"){
    h=moSpanRow(["h","d","m"],"from now — a month shows all five limbs cycle; a day lets you "+
      "watch the karaṇa ring turn")+
      '<span class="mohint">the vāra follows the civil date, as the Overview tab does, not '+
      'sunrise to sunrise</span>';
  } else if(k==="lagna"){
    h=moSpanRow(["h","d"],"from the birth moment — a day walks all twelve lagnas past "+
      "the east point")+
      '<span class="mohint">drawn for the chart&rsquo;s own latitude, which is what sets '+
      'the rising times along the foot</span>';
  } else if(k==="moon"){
    h=moSpanRow(["d","m"],"from today — one month takes Candra through every phase");
  } else if(k==="sun"){
    h=moSpanRow(["d","m","y"],"from today — a year carries Sūrya through all twelve rāśis");
  } else if(k==="bhava"){
    /* The same twelve significations can be read in any division — the houses are
       counted whole-sign from that division's own lagna. */
    h='<span class="molab">Division</span>'+
      '<select id="movarga" class="skysel">'+
      ((MO.J&&MO.J.vargas)||[]).map(function(v,i){
        return '<option value="'+i+'"'+(((MO.opt.varga|0)===i)?" selected":"")+'>'+
               esc(v.varga+" — "+v.en)+'</option>'; }).join("")+'</select>'+
      '<span class="mohint">the walk through the twelve houses stays the same; what '+
      'changes is the chart they are counted in</span>';

  } else if(k==="rashi"){
    h='<span class="molab">Rāśi</span>'+
      '<select id="morpin" class="skysel">'+
      ['<option value="-1"'+(((MO.opt.rpin|0)<0)?" selected":"")+'>all twelve in turn</option>']
      .concat(MO_RA12.map(function(n,i){
        return '<option value="'+i+'"'+(((MO.opt.rpin|0)===i)?" selected":"")+'>'+
               esc((i+1)+". "+moTrasi(i))+'</option>'; })).join("")+'</select>'+
      '<span class="mohint">hold one and the whole length is spent on it, with a marker '+
      'walking its thirty degrees</span>';

  } else if(k==="nakfull"){
    h='<span class="molab">Nakṣatra</span>'+
      '<select id="monpin" class="skysel">'+
      ['<option value="-1"'+(((MO.opt.npin|0)<0)?" selected":"")+'>all twenty-seven in turn</option>']
      .concat(MO_NK27.map(function(n,i){
        return '<option value="'+i+'"'+(((MO.opt.npin|0)===i)?" selected":"")+'>'+
               esc((i+1)+". "+moTnak(i))+'</option>'; })).join("")+'</select>'+
      '<span class="mohint">hold one and the marker walks its 13°20′, lighting each pāda '+
      'as it enters it</span>';

  } else if(k==="worlds"){
    h='<span class="molab">Graha</span>'+
      [["","all five in turn"],["Mercury","Budha"],["Venus","Śukra"],["Mars","Maṅgala"],
       ["Jupiter","Guru"],["Saturn","Śani"]].map(function(w){
        return '<button type="button" class="skyv'+
          (((MO.opt.world||"")===w[0])?" on":"")+
          '" data-moworld="'+w[0]+'">'+esc(w[1])+'</button>'; }).join("")+
      MO_BRK+moSpanRow(["m","y"],"from today — with one graha held, the span is the "+
        "stretch of time it moves through")+
      '<span class="molab">Sizing</span>'+
      [["same","one magnification"],["fill","fill the frame"]].map(function(m){
        return '<button type="button" class="skyv'+
          (((MO.opt.wsame===true)?"same":"fill")===m[0]?" on":"")+
          '" data-mowsize="'+m[0]+'">'+esc(m[1])+'</button>'; }).join("")+
      '<span class="mohint">one magnification keeps the five comparable — Guru a disc and '+
      'Maṅgala a dot, which is the truth of it; filling the frame makes each legible but '+
      'tells you nothing about size</span>';
  } else if(k==="tilt"){
    h=moSpanRow(["d","m"],"from today — six to twelve months reads best, and covers a whole "+
      "eclipse season coming round")+
      '<span class="molab">Latitude ×</span><input type="range" id="molatx" min="1" max="14" step="1" value="'+
      (MO.opt.latx||6)+'"><span class="moval" id="molatxv">'+(MO.opt.latx||6)+'</span>'+
      MO_BRK+
      '<span class="molab">Zodiac band</span>'+
      [["nak","rāśi + nakṣatra"],["rasi","rāśi only"],["off","off"]].map(function(m){
        return '<button type="button" class="skyv'+
          ((((MO.opt.tring==null)?"nak":MO.opt.tring)===m[0])?" on":"")+
          '" data-motring="'+m[0]+'">'+esc(m[1])+'</button>'; }).join("")+
      '<span class="mohint">the band rides outside the ecliptic ring in the same tilt, '+
      'and lights the arc each of Sūrya, Candra, Rāhu and Ketu stands in — the readout '+
      'below the verdict names them, since at a new moon two of the four sit on top of '+
      'each other</span>'+
      '<span class="mohint">at ×1 the tilt is true to scale and almost invisible, which is '+
      'the point — the whole question turns on a degree or two</span>';
  } else if(k==="eclipseseason"){
    h=moSpanRow(["m","y"],"from today — turn Candra off above for long spans, it laps the ring "+
      "every 27 days and becomes a blur")+
      '<span class="mohint">for why a new moon away from the nodes does nothing, see '+
      'Tilt &amp; nodes</span>';
  } else if(k==="astanga"){
    h=moSpanRow(["d","m","y"],"from today forward");
  } else if(k==="dignity"){
    h='<span class="molab">Graha</span>'+
      ["Sun","Mars","Mercury","Jupiter","Venus","Saturn"].map(function(en){
        return '<button type="button" class="skyv'+(MO.opt.subject===en?" on":"")+
          '" data-mosubj="'+en+'">'+esc(MO_FULL[en])+'</button>'; }).join("")+
      MO_BRK+moSpanRow(["d","m","y"],"how far the graha travels");
  } else if(k==="sadesati"){
    h='<span class="mohint">ninety years from birth — Śani returns to the Moon about every '+
      'twenty-nine</span>';
  } else if(k==="frames"){
    h='<span class="molab">Houses</span>'+
      [["both","both"],["whole","whole sign"],["equal","equal from lagna"]].map(function(m){
        return '<button type="button" class="skyv'+((MO.opt.houses||"both")===m[0]?" on":"")+
          '" data-mohouse="'+m[0]+'">'+esc(m[1])+'</button>'; }).join("")+
      '<span class="mohint">one sidereal day — the gold spokes slide continuously, the '+
      'whole-sign ring steps once per rāśi</span>';
  } else if(k==="ayanamsa"){
    h='<span class="mohint">500 BCE to 3500 CE — the Lahiri value, the same one the charts use</span>';
  } else if(k==="tithi"){
    h='<span class="mohint">one synodic month from today, new Moon to new Moon</span>';
  }
  host.innerHTML=h;
  host.style.display=h?"":"none";
}
function moMount(){
  var cv=document.getElementById("mocanvas"); if(!cv) return false;
  MO.cv=cv; moResize(); moLogo(); moSceneOpts();
  if(MO__LOGO && !MO__LOGO.complete) MO__LOGO.onload=function(){ moDraw(); };
  moDraw(); return true;
}
/* Rebuild the panel in place, preserving what the viewer had set. The canvas is a
   fresh element afterwards, so it must be re-mounted; the playhead, scene, frame
   and span all live on MO and survive untouched. */
function moPaneRefresh(){
  var host=document.querySelector('.kpane[data-kpane="motion"]');
  if(!host) return;
  var wasPlaying=MO.playing;
  if(wasPlaying) moPlay(false);
  host.innerHTML=moPaneHTML();
  moMount();
  /* restore the lit state of every chip the markup defaults to its first option */
  [].forEach.call(host.querySelectorAll("[data-moscene]"),function(b){
    b.className="moscene"+(b.getAttribute("data-moscene")===MO.scene?" on":""); });
  [].forEach.call(host.querySelectorAll("[data-moratio]"),function(b){
    b.className="skyv"+(b.getAttribute("data-moratio")===MO.ratio?" on":""); });
  [].forEach.call(host.querySelectorAll("[data-mopal]"),function(b){
    b.className="skyv"+(b.getAttribute("data-mopal")===MO.pal?" on":""); });
  var sl=document.getElementById("moscrub"); if(sl) sl.value=Math.round(MO.p*1000);
  moSceneGuide(); moDurRead(); moDraw();
  if(wasPlaying) moPlay(true);
}

/* The place options, from the form's own city list. */
function moPlaceOptions(){
  var L=window.__kcities||[], cur=-1;
  try{ L.forEach(function(c,i){ if(c.n===window.__kplace) cur=i; }); }catch(e){}
  if(cur<0 && L.length){
    cur=0;
    window.__kplace=L[0].n; window.__kwhereLat=L[0].lat;
    window.__kwhereLon=L[0].lon; window.__kwhereTz=L[0].tz;
  }
  return L.map(function(c,i){
    return '<option value="'+i+'"'+(i===cur?" selected":"")+'>'+esc(c.n)+'</option>';
  }).join("");
}
window.__moDraw=function(){ if(MO.cv) moDraw(); };
window.__moPaceLabel=function(){ MO_CACHE={}; return moPaceLabel(); };
window.__moPaceReport=function(){ return moPaceReport(); };
window.__moPaceStep=function(p,dt){ return moPaceStep(p,dt); };
window.__moEvents=function(){ return moEvents(); };
window.__moCtxRows=function(){ var r=null; try{ r=moDraw(); }catch(e){} return moContextRows(MO._lastMs||Date.now()); };
window.__moMount=moMount;
/* ui.js is a separate script from this bundle, so the no-chart entry point on the
   page cannot see a closure function. This is the one export it needs. */
window.motionPane=motionPane;

/* ---------------------------------------------------------------- handlers --- */
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t||!t.getAttribute) return;
  var sc=t.closest?t.closest("[data-moscene]"):null;
  if(sc){
    MO.scene=sc.getAttribute("data-moscene"); MO.p=0; moPlay(false);
    [].forEach.call(document.querySelectorAll("[data-moscene]"),function(b){
      b.className="moscene"+(b.getAttribute("data-moscene")===MO.scene?" on":""); });
    var s1=document.getElementById("moscrub"); if(s1) s1.value=0;
    /* the derived duration depends on the scene, because only some scenes have
               events to hold on; without this the read-out lags one scene behind */
    moSceneOpts(); moDurRead(); moDraw(); return;
  }
  if(t.id==="moplay"){ moPlay(!MO.playing); return; }
  if(t.id==="morestart"){ MO.p=0; var s2=document.getElementById("moscrub");
    if(s2) s2.value=0; moDraw(); return; }
  if(t.id==="mostepb"||t.id==="mostepf"){
    moPlay(false);
    /* one frame of the current pacing, so stepping matches what playing does */
    var dp=moPaceStep(MO.p,1000/60)-MO.p;
    MO.p+=(t.id==="mostepf"?dp:-dp);
    if(MO.p>=1) MO.p-=1; if(MO.p<0) MO.p+=1;
    var s3=document.getElementById("moscrub"); if(s3) s3.value=Math.round(MO.p*1000);
    moDraw(); return;
  }
  if(t.getAttribute("data-mohold")){
    MO_PACE.hold=!MO_PACE.hold;
    t.className="skyv"+(MO_PACE.hold?" on":"");
    MO_CACHE={}; moDurRead(); return;
  }
  var lg=t.getAttribute("data-molang");
  if(lg){
    MO_LANG=lg; MO_CACHE={};
    /* The whole panel is rebuilt rather than patched: option lists, band headings
       and scene labels all carry language, and repainting only the buttons would
       leave a Hindi frame under English controls. */
    moPaneRefresh(); return;
  }
  if(t.getAttribute("data-modevnum")){
    MO_DEVNUM=!MO_DEVNUM; MO_CACHE={}; moPaneRefresh(); return;
  }
  var tr=t.getAttribute("data-motring");
  if(tr){ MO.opt.tring=tr; MO_CACHE={};
    [].forEach.call(document.querySelectorAll("[data-motring]"),function(b){
      b.className="skyv"+(b.getAttribute("data-motring")===tr?" on":""); });
    moDraw(); return; }
  var ws=t.getAttribute("data-mowsize");
  if(ws){ MO.opt.wsame=(ws==="same"); MO_CACHE={};
    [].forEach.call(document.querySelectorAll("[data-mowsize]"),function(b){
      b.className="skyv"+((b.getAttribute("data-mowsize")==="same")===(MO.opt.wsame===true)?" on":""); });
    moDraw(); return; }
  if(t.hasAttribute&&t.hasAttribute("data-moworld")){
    MO.opt.world=t.getAttribute("data-moworld")||null; MO.p=0;
    var sw=document.getElementById("moscrub"); if(sw) sw.value=0;
    [].forEach.call(document.querySelectorAll("[data-moworld]"),function(bn){
      bn.className="skyv"+((bn.getAttribute("data-moworld")||"")===(MO.opt.world||"")?" on":""); });
    moDraw(); return; }
  var fr=t.getAttribute&&t.getAttribute("data-mofrom");
  if(fr){ MO.opt.from=fr; MO.p=0; MO_CACHE={};
    var sf=document.getElementById("moscrub"); if(sf) sf.value=0;
    [].forEach.call(document.querySelectorAll("[data-mofrom]"),function(bn){
      bn.className="skyv"+((bn.getAttribute("data-mofrom")===(MO.opt.from||"today"))?" on":""); });
    moDraw(); return; }
  if(t.id==="mostudio"){ moStudio(!MO.studio); return; }
  if(t.id==="moexit"){ moStudio(false); return; }
  if(t.id==="moxls"){ moExport(); return; }
  if(t.id==="mopng"){
    try{
      var nm=(MO.J&&MO.J.input&&MO.J.input.name)||"chart";
      MO.cv.toBlob(function(b){
        var u=URL.createObjectURL(b), a=document.createElement("a");
        a.href=u; a.download="{{BRAND_SLUG}}-"+MO.scene+"-"+String(nm).replace(/\s+/g,"-")+".png";
        document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(u); a.parentNode.removeChild(a); },400);
      },"image/png");
    }catch(e){
      var m=document.getElementById("moxlsmsg"); if(m) m.textContent="could not save the frame";
    }
    return;
  }
  var r=t.getAttribute("data-moratio");
  if(r){ MO.ratio=r;
    [].forEach.call(document.querySelectorAll("[data-moratio]"),function(b){
      b.className="skyv"+(b.getAttribute("data-moratio")===r?" on":""); });
    moResize(); moDraw(); return; }
  var pa=t.getAttribute("data-mopal");
  if(pa){ MO.pal=pa;
    [].forEach.call(document.querySelectorAll("[data-mopal]"),function(b){
      b.className="skyv"+(b.getAttribute("data-mopal")===pa?" on":""); });
    moDraw(); return; }
  var op=t.getAttribute("data-moopt");
  if(op){ MO.opt[op]=!MO.opt[op]; t.className="skyv"+(MO.opt[op]?" on":""); moDraw(); return; }
  var cp=t.getAttribute("data-mocap");
  if(cp){ MO.cap[cp]=!MO.cap[cp]; t.className="skyv"+(MO.cap[cp]?" on":""); moDraw(); return; }
  var gh=t.getAttribute("data-mograha");
  if(gh){ MO.show[gh]=!MO.show[gh]; t.className="skyv"+(MO.show[gh]?" on":""); moDraw(); return; }
  var pr=t.getAttribute("data-mopre");
  if(pr){
    var on=pr==="slow"?["Jupiter","Saturn","Rahu","Ketu"]:MO_NAMES;
    MO_NAMES.forEach(function(n){ MO.show[n]=on.indexOf(n)>=0; });
    [].forEach.call(document.querySelectorAll("[data-mograha]"),function(b){
      b.className="skyv"+(MO.show[b.getAttribute("data-mograha")]?" on":""); });
    moDraw(); return; }
  var sj=t.getAttribute("data-mosubj");
  if(sj){ MO.opt.subject=sj; MO.p=0;
    [].forEach.call(document.querySelectorAll("[data-mosubj]"),function(b){
      b.className="skyv"+(b.getAttribute("data-mosubj")===sj?" on":""); });
    moDraw(); return; }
  var yr=t.getAttribute("data-moyears");
  if(yr){ MO.opt.years=+yr; MO.p=0; MO_CACHE={};
    [].forEach.call(document.querySelectorAll("[data-moyears]"),function(b){
      b.className="skyv"+(+b.getAttribute("data-moyears")===MO.opt.years?" on":""); });
    moDraw(); return; }
  var hs=t.getAttribute("data-mohouse");
  if(hs){ MO.opt.houses=hs;
    [].forEach.call(document.querySelectorAll("[data-mohouse]"),function(b){
      b.className="skyv"+(b.getAttribute("data-mohouse")===hs?" on":""); });
    moDraw(); return; }
  var ec=t.getAttribute("data-moecln");
  if(ec){ MO.opt.eclN=+ec; MO.p=0; MO_CACHE={};
    [].forEach.call(document.querySelectorAll("[data-moecln]"),function(b){
      b.className="skyv"+(+b.getAttribute("data-moecln")===MO.opt.eclN?" on":""); });
    moDraw(); return; }
  var hr2=t.getAttribute("data-mohours");
  if(hr2){ MO.opt.hours=+hr2; MO.p=0;
    [].forEach.call(document.querySelectorAll("[data-mohours]"),function(b){
      b.className="skyv"+(+b.getAttribute("data-mohours")===MO.opt.hours?" on":""); });
    moDraw(); return; }
});
document.addEventListener("input",function(ev){
  var t=ev.target; if(!t||!t.id) return;
  if(t.id==="moscrub"){ moPlay(false); MO.p=(+t.value)/1000; moDraw(); return; }
  if(t.id==="motrail"){ MO.opt.trailLen=(+t.value)/100;
    var a=document.getElementById("motrailv"); if(a) a.textContent=t.value+"%"; moDraw(); return; }
  if(t.id==="modens"){ MO.opt.starDensity=+t.value;
    var b=document.getElementById("modensv"); if(b) b.textContent=t.value; moDraw(); return; }
  if(t.id==="moexag"){ MO.opt.exag=+t.value;
    var c=document.getElementById("moexagv"); if(c) c.textContent=t.value; moDraw(); return; }
  if(t.id==="molatx"){ MO.opt.latx=+t.value;
    var c9=document.getElementById("molatxv"); if(c9) c9.textContent=t.value; moDraw(); return; }
  if(t.id==="mospann"){ var v=Math.max(1,Math.min(999,+t.value||1));
    MO.opt.spanN=v; MO.p=0; MO_CACHE={}; moDurRead(); moDraw(); return; }
  if(t.id==="motitle"){ MO.cap.title=t.value; moDraw(); return; }
  if(t.id==="mosub"){ MO.cap.sub=t.value; moDraw(); return; }
  if(t.id==="mohandle"){ MO.cap.handle=t.value; moDraw(); return; }
});
document.addEventListener("change",function(ev){
  var t2=ev.target; if(!t2) return;
  if(t2.id==="moplacesel"){
    var c=(window.__kcities||[])[+t2.value];
    if(c){ window.__kplace=c.n; window.__kwhereLat=c.lat;
           window.__kwhereLon=c.lon; window.__kwhereTz=c.tz; }
    MO_CACHE={}; moDraw(); return;
  }
  if(t2.id==="mospeed"){ MO.speed=+t2.value; moDurRead(); return; }
  if(t2.id==="mospanu"){ MO.opt.spanU=t2.value; MO.p=0; MO_CACHE={}; moDurRead(); moDraw(); return; }
  if(t2.id==="movarga"){ MO.opt.varga=+t2.value||0; MO.p=0; MO_CACHE={};
    moSceneOpts(); moDraw(); return; }
  if(t2.id==="morpin"){ MO.opt.rpin=+t2.value; MO.p=0; MO_CACHE={}; moDraw(); return; }
  if(t2.id==="monpin"){ MO.opt.npin=+t2.value; MO.p=0; MO_CACHE={}; moDraw(); return; }
});
document.addEventListener("keydown",function(ev){
  if(ev.key==="Escape" && MO.studio){ moStudio(false); return; }
  if(ev.code==="Space" && document.getElementById("mocanvas") &&
     !/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target&&ev.target.tagName)||"") &&
     document.querySelector('.kpane[data-kpane="motion"]:not([hidden])')){
    ev.preventDefault(); moPlay(!MO.playing);
  }
});

/* Test hooks, in the same spirit as the sky pane's __sky* set. The bundle is one
   closure, so MO and moDraw are not reachable from outside it; without these a
   harness can only click controls and look at pixels, which cannot tell a caption
   that overflows the stage from one that merely looks tight. Nothing in the site
   calls them, and they expose state the controls already expose. */
window.__moState=function(){ return MO; };
window.__moSet=function(k,v){
  if(k==="ratio") MO.ratio=v; else if(k==="scene") MO.scene=v;
  else if(k==="p") MO.p=v; else MO.opt[k]=v;
  MO_CACHE={}; return MO[k]!==undefined?MO[k]:MO.opt[k];
};
window.__moDraw=function(){ moDraw(); };
window.__moSpan=function(){ return moSpanMs(); };
window.__moSidAt=function(n,ms){ return moSidAt(n,ms); };
window.__moMetrics=function(){
  var S=moSize(), st=moStage();
  return {w:S.w, h:S.h, stageY:st.y, stageH:st.h, cx:st.cx,
          U:Math.min(S.w, st.h*1.18)};
};
/* Capture every piece of type a draw lays down, with its baseline and size, so a
   harness can assert that nothing runs past the stage floor. */
window.__moCapture=function(){
  var ot=moText, os=moSerif, out=[];
  /* measure after the call, when the context still carries the font it just used */
  moText=function(t,x,y,s){ var r=ot.apply(null,arguments);
    out.push({t:String(t),x:x,y:y,s:s,w:MO.ctx.measureText(String(t)).width}); return r; };
  moSerif=function(t,x,y,s){ var r=os.apply(null,arguments);
    out.push({t:String(t),x:x,y:y,s:s,w:MO.ctx.measureText(String(t)).width}); return r; };
  var err=null;
  try{ moDraw(); }catch(e){ err=e&&e.message||String(e); }
  moText=ot; moSerif=os;
  return {err:err, type:out};
};
