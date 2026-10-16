/* ===== Which scenes need a birth chart ====================================
   Measured by inspecting every scene for MO.D and MO.J references, not guessed.
   Fifteen of the twenty-four touch neither: they are about the sky, not about a
   person, and they were gated behind a cast chart only because the Motion tab
   happens to live inside the chart report.

   The other nine stay gated, and the gate is this list rather than "does it throw".
   Several of them draw perfectly well with no chart — and draw something stale or
   empty while doing it, which is worse than refusing, and is exactly the class of
   fault that survives a release unnoticed.

   Three are irreducibly natal: the sky at a birth moment, Vimsottari running from
   the natal Moon, and Sani measured against that Moon. The other six could be
   adapted by substituting here-and-now for birth, which is a later pass and needs
   the frame to say it is a transit chart and not the reader's own. */
var MO_NEEDS_CHART={
  birthsky:1,   /* its subject is one person's birth moment */
  dasha:1,      /* Vimsottari runs from the natal Moon; there is no daśā without one */
  sadesati:1,   /* Śani's passage is measured against the natal Moon */
  gochara:1,    /* draws the natal chart inside the transiting sky */
  frames:1,     /* anchored to the birth moment and place */
  lagna:1,      /* adaptable to here-and-now later */
  bhava:1,      /* needs the chart's houses and vargas */
  rashi:1,      /* places the reader's grahas on the strip */
  nakfull:1     /* the same */
};
function moHasChart(){ return !!(MO.J && MO.J.input); }
function moSceneAvailable(k){ return moHasChart() || !MO_NEEDS_CHART[k]; }
/* Why a scene is unavailable, said rather than implied — a refusal that explains
   itself is a different thing from a disabled button. */
function moWhyChart(k){
  if(k==="dasha")    return moP("needDasha");
  if(k==="sadesati") return moP("needSadesati");
  if(k==="birthsky") return moP("needBirthsky");
  return moP("needChart");
}

/* ===== Motion — how long a loop takes, and where it spends the time ========

   TWO KNOBS, NOT THREE. The panel used to carry Span, Length and Speed. Span says
   how much sky-time is covered; Length said how many real seconds the loop took;
   Speed multiplied that. Speed and Length were two controls doing one job, which is
   why "1/8 speed for 12 months" had no single obvious meaning. Now the reader sets
   the span and the speed, and the duration is DERIVED and shown read-only.

   WHY base() IS NOT LINEAR. A one-day span and a twelve-year span should not both
   take fifteen seconds at 1x — there is far more to see in the twelve years. But
   nor should the twelve years take four thousand times longer, which is what a
   linear rate gives. A log curve sits between the two: each tenfold increase in
   span adds a fixed amount of screen time rather than multiplying it.

   WHERE THE TIME GOES. An eclipse window is about one day in three hundred and
   sixty. Slowing the whole loop down — which is all a speed multiplier can do —
   leaves the eclipse at 0.3% of the running time however slow it gets, which is
   exactly the complaint: the text flashes past even at a tenth. So events get a
   guaranteed DWELL measured in real seconds, and the quiet stretches take whatever
   real time is left. The playhead consults a schedule rather than having its rate
   clamped: a floor on dp/dt is the silent-clamp pattern that hid a whole option in
   the speed menu, and this has to be inspectable instead. */

var MO_PACE={
  hold:true,          /* hold on events while watching */
  dwell:2.5,          /* real seconds an ordinary syzygy gets, when there are few */
  dwellEcl:4.0,       /* an eclipse gets longer — it is the point of the scene */
  dwellMin:1.2,       /* below this nothing is readable, so the loop lengthens instead */
  busy:8              /* events past which the ordinary dwell starts shrinking */
};
/* How long one event holds the frame. Twelve months carries about twenty-nine new
   and full moons; giving each the full dwell would turn a 27-second loop into a
   92-second one, which is a surprise rather than a setting. So the ordinary dwell
   shrinks as the count rises, down to the shortest hold that can still be read —
   and eclipses keep their full dwell whatever else is going on, because they are
   what the scene is about. */
function moDwellFor(kind,n){
  var d;
  if(kind==="eclipse") d=MO_PACE.dwellEcl;
  else if(n<=MO_PACE.busy) d=MO_PACE.dwell;
  else d=Math.max(MO_PACE.dwellMin, MO_PACE.dwell*MO_PACE.busy/n);
  /* The hold scales with the speed like everything else. Without this a tenth-speed
     loop would stretch the quiet months tenfold and leave the eclipse the same two
     seconds it always had — the events would become relatively FASTER the slower
     the reader asked the animation to run, which is the opposite of the request. */
  return d/Math.max(MO_SPEED_MIN,MO.speed);
}
/* Only the scenes whose subject is an event. The others have nothing to hold on. */
var MO_PACE_SCENES={tilt:1, eclipseseason:1, eclipse:1};

/* --- the derived duration ------------------------------------------------ */
function moBaseSeconds(){
  var days=moSpanMs()/86400000;
  /* 12 s at a day, about 18 s at a month, 24 s at a year, 30 s at a decade: each
     tenfold span adds roughly six seconds rather than multiplying the lot. */
  return 12 + 6*Math.log10(Math.max(1,days));
}
function moDuration(){
  var d=moBaseSeconds()/Math.max(MO_SPEED_MIN,MO.speed);
  return Math.max(2, d);
}
/* "2 min 10 s", or "14 s" — written the way a person would say it. */
function moDurLabel(sec){
  sec=Math.round(sec);
  if(sec<60) return sec+" s";
  var m=Math.floor(sec/60), s=sec%60;
  return m+" min"+(s?(" "+s+" s"):"");
}

/* --- the event schedule --------------------------------------------------
   A list of {at, dwell} in loop position 0..1, built once per span and cached the
   way the latitude wave already is. Positions, not timestamps: the scrubber stays
   linear in span, which is what "where in the twelve months am I" means. */
function moEvents(){
  if(!MO_PACE.hold || !MO_PACE_SCENES[MO.scene]) return [];
  var t0=Date.now(), t1=t0+moSpanMs();
  return moCached("pace|"+MO.scene+"|"+MO.opt.spanN+MO.opt.spanU+"|"+MO.speed,function(){
    var out=[];
    /* the eclipses themselves, from the same finder the scenes draw from */
    var E=[]; try{ E=moEclipsesIn(t0,t1)||[]; }catch(e){}
    E.forEach(function(x){
      out.push({at:(x.ms-t0)/(t1-t0), dwell:MO_PACE.dwellEcl, kind:"eclipse"});
    });
    /* and every new and full moon, found by sampling the elongation and bisecting
       each crossing — the same method the proof strip uses, so the marks on the
       strip and the holds in the playback are the same events */
    function el(m){ var a=moSidAt("Moon",m), b=moSidAt("Sun",m);
      return (a==null||b==null)?null:((a-b)%360+360)%360; }
    var N=Math.min(3000,Math.max(120,Math.round((t1-t0)/21600000))), prev=null;
    for(var i=0;i<=N;i++){
      var m=t0+(t1-t0)*i/N, e=el(m);
      if(e==null){ prev=null; continue; }
      if(prev){
        var tgt=null;
        if(prev.e>e) tgt=0; else if(prev.e<180&&e>=180) tgt=180;
        if(tgt!=null){
          var lo=prev.m, hi=m;
          for(var b2=0;b2<30&&hi-lo>60000;b2++){
            var mid=(lo+hi)/2, em=el(mid); if(em==null) break;
            var d=((em-tgt)%360+360)%360; if(d>180) d-=360;
            if(d<0) lo=mid; else hi=mid;
          }
          var at=((lo+hi)/2-t0)/(t1-t0);
          /* an eclipse is a syzygy too; do not hold twice on the same instant */
          var dup=out.some(function(o){ return Math.abs(o.at-at)<0.004; });
          if(!dup) out.push({at:at, dwell:MO_PACE.dwell, kind:"syzygy"});
        }
      }
      prev={m:m,e:e};
    }
    out=out.filter(function(o){ return o.at>0.001 && o.at<0.999; })
           .sort(function(a,b){ return a.at-b.at; });
    var n=out.length;
    out.forEach(function(o){ o.dwell=moDwellFor(o.kind,n); });
    return out;
  });
}

/* --- the playhead --------------------------------------------------------
   Given the loop position and a real-time step, return the new position. Around an
   event the position advances slowly; between them it advances fast enough that the
   whole loop still finishes in the duration the panel promised. If the dwells alone
   exceed that duration the loop takes longer, and moPaceReport says so rather than
   compressing the holds back to uselessness. */
function moPaceWindow(){
  /* the span-fraction an event holds the frame over; small enough that the reader
     is held at the event rather than near it */
  return 0.004;
}
function moPaceReport(){
  var ev=moEvents(), base=moDuration();
  if(!ev.length) return {dur:base, base:base, held:0, extra:0};
  var w=moPaceWindow(), held=0;
  ev.forEach(function(o){ held+=o.dwell; });
  var quietFrac=Math.max(0.05, 1-ev.length*w*2);
  var quietTime=base*quietFrac;
  var total=quietTime+held;
  return {dur:Math.max(base,total), base:base, held:ev.length, extra:Math.max(0,total-base)};
}
/* Position after dt milliseconds of real time. */
function moPaceStep(p,dtMs){
  var ev=moEvents(), rep=moPaceReport(), dur=rep.dur;
  if(!ev.length) return p + (dtMs/1000)/Math.max(0.5,dur);
  var w=moPaceWindow();
  /* real seconds per unit of loop position, at this position */
  var inEvent=null;
  for(var i=0;i<ev.length;i++){
    if(Math.abs(p-ev[i].at)<=w){ inEvent=ev[i]; break; }
  }
  var rate;                                     /* loop position per second */
  if(inEvent) rate=(2*w)/inEvent.dwell;
  else {
    var quietSpan=Math.max(0.02, 1-ev.length*2*w);
    var quietTime=Math.max(0.5, dur - ev.reduce(function(a,o){ return a+o.dwell; },0));
    rate=quietSpan/quietTime;
  }
  return p + rate*(dtMs/1000);
}

/* The read-out under the Speed control. States the derived duration, and when the
   holds push it past the base duration it says so and how many held it — "the
   system decides" is only honest if the system also says what it decided. */
function moPaceLabel(){
  var r=moPaceReport();
  var t=moT("thisLoop")+" "+moDurLabel(r.dur);
  /* When the holds stretched the loop, say both numbers. "The system decides" is
     only honest if the system also shows what it decided and why. */
  if(r.held && r.extra>0.5)
    t=moT("thisLoop")+" "+moDurLabel(r.base)+" \u2192 "+moDurLabel(r.dur)+
      "  ("+moNum(r.held)+" "+moT("held")+")";
  return t;
}
function moDurRead(){
  var el=document.getElementById("modurv");
  if(el) el.textContent=moPaceLabel();
}
