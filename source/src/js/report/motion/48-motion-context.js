/* ===== Motion — the context bar ===========================================
   When and where the frame is. Five separate requests came in for this — put the
   time on the pañcāṅga scene, put the place on all of them, put the Hindu tithi
   and month on the eclipse scenes, put the time on every scene that moves the
   Moon, put Hindu time wherever it fits — and they are all the same request: the
   frame should say what moment it is showing and whose sky it is.

   Doing it five times across twenty-four scenes would be five passes over the same
   files and they would drift apart within a week. So it is one bar, with rows each
   scene opts into, and the scene says which rows it wants rather than drawing them.

   WHERE IT SITS. In the caption band, which already lays its rows out by measuring
   and scales them down together when they do not fit. Adding rows there inherits
   that fitting for free; drawing them on the stage would mean re-measuring every
   scene's clearance, which is the kind of change that looks fine at 9:16 and
   collides at 16:9.

   WHICH CLOCK. The chart's own place and offset, always — never the viewer's
   device — and the bar names the place every time, because a 1984 Moradabad chart
   animating next year's sky has two defensible clocks and a reader cannot tell
   which they are looking at unless it is written down. A scene that needs no chart
   anchors to the viewer's place instead and says "(your location)" in those words.
   The ambiguity is the thing being designed out. */

/* --- which rows a scene wants -------------------------------------------
   Keyed by scene. `t` clock time, `p` place, `h` the Hindu date, `g` ghaṭikās from
   sunrise. A scene absent from this table gets the place alone, which is true of
   every scene and never misleading. */
var MO_CTX={
  /* the Moon moves in these, so the time is the point */
  tithi:     "tph",  moon:      "tph",
  /* the pañcāṅga scene prints the Hindu date as its own subtitle, so the bar adds
     only what the subtitle does not already say */
  panchanga: "tpg",
  tilt:      "tph",  eclipseseason:"tph", eclipse:  "tph",
  sadesati:  "tp",   gochara:   "tp",   retro:     "tp",
  orrery:    "tp",   astanga:   "tp",   dignity:   "tp",
  /* anchored to a moment of their own */
  birthsky:  "tph",  lagna:     "tphg", frames:    "tp",
  sun:       "tp",   worlds:    "tp",   nakshatra: "p",
  ayanamsa:  "tp",   drishti:   "p",    dasha:     "p",
  /* the teaching walks: the chart's place matters, the running clock does not */
  bhava:     "p",    rashi:     "p",    nakfull:   "p"
};

/* --- where the frame is -------------------------------------------------
   Returns {lat, lon, tz, name, own} — `own` true when this is the chart's place
   rather than the viewer's. Falls back through the chart, then the place the
   viewer last searched for, then nothing at all; it never invents coordinates. */
/* Named moPlace rather than moWhere: the sky scenes already define a moWhere() of
   their own, with a different shape, and in one concatenated scope the later
   declaration silently wins. That shadowing is exactly the class of fault this
   project keeps hitting — it throws nothing and simply draws the wrong thing. */
function moPlace(){
  var J=MO.J;
  if(J && J.input && J.input.lat!=null){
    var nm=null;
    try{ nm=window.__kplace||null; }catch(e){}
    return {lat:J.input.lat, lon:J.input.lon, tz:J.input.tzHours||0,
            name:nm, own:true};
  }
  try{
    if(window.__kplace && window.__kwhereLat!=null)
      return {lat:window.__kwhereLat, lon:window.__kwhereLon,
              tz:window.__kwhereTz||0, name:window.__kplace, own:false};
  }catch(e2){}
  return null;
}

/* The offset as a reader writes it: +05:30, not 5.5. */
function moTzLabel(tz){
  var s=tz<0?"-":"+", a=Math.abs(tz), h=Math.floor(a), m=Math.round((a-h)*60);
  return "UTC"+s+(h<10?"0":"")+h+":"+(m<10?"0":"")+m;
}
/* Clock time at a place, from an absolute instant. The offset is the chart's, so
   this is deliberately not the viewer's local time. */
function moClockAt(ms,tz){
  var d=new Date(ms+(tz||0)*3600000);
  return (d.getUTCHours()<10?"0":"")+d.getUTCHours()+":"+
         (d.getUTCMinutes()<10?"0":"")+d.getUTCMinutes();
}
/* Sunrise before the given instant, as an absolute ms, for the ghaṭikā count. Null
   where it cannot be found — inside a polar day or night there is no sunrise to
   count from, and saying nothing is better than counting from a fiction. */
function moSunriseBefore(ms,W){
  if(!W) return null;
  try{
    var obs=new Astronomy.Observer(W.lat,W.lon,0);
    var r=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,+1,
          new Date(ms-26*3600000),2);
    if(!r) return null;
    var t=r.date.getTime();
    if(t>ms){
      r=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,+1,
          new Date(ms-50*3600000),2);
      if(!r) return null;
      t=r.date.getTime();
    }
    return t<=ms?t:null;
  }catch(e){ return null; }
}
/* 60 ghaṭikās to a day, 60 vighaṭikās to a ghaṭikā, counted from sunrise — the
   notation a printed pañcāṅga uses, where "17.1" is 17 ghaṭikās and 1 vighaṭikā. */
function moGhatika(ms,W){
  var sr=moSunriseBefore(ms,W); if(sr==null) return null;
  var g=(ms-sr)/86400000*60;
  if(g<0||g>62) return null;
  var gh=Math.floor(g), vg=Math.round((g-gh)*60);
  if(vg===60){ gh++; vg=0; }
  return moNum(gh)+"."+moNum(vg<10?("0"+vg):vg)+" "+moT("ghatika");
}

/* --- the Hindu date at an instant --------------------------------------- */
function moHinduDate(ms){
  var su=moSidAt("Sun",ms), mo=moSidAt("Moon",ms);
  if(su==null||mo==null) return null;
  var jd=ms/86400000+2440587.5;
  var pc=panchanga(su,mo);
  var ayn=0; try{ ayn=window.__ayanFor?window.__ayanFor("lahiri",jd):0; }catch(e){}
  var MS=masaOf(su,mo,ayn);
  var vi=(Math.floor(jd+1.5)%7+7)%7;
  return moTmasa(MS.amanta)+" "+moTpaksha(pc.paksha)+" · "+
         moTtithiName(pc.tithi)+" · "+moTvara(vi)+" · "+moNakName(mo);
}

/* --- the rows ------------------------------------------------------------
   Built here and handed to the caption band, which stacks and fits them with the
   title and subtitle it already draws. */
function moContextRows(dateMs){
  if(!MO.cap.ctx) return [];
  var want=MO_CTX[MO.scene]||"p", W=moPlace(), out=[];

  if(want.indexOf("t")>=0 && dateMs!=null && W)
    out.push(moClockAt(dateMs,W.tz)+" "+moTzLabel(W.tz));

  if(want.indexOf("p")>=0){
    if(!W) out.push(moT("noPlace"));
    else {
      var nm=W.name||(Math.abs(W.lat).toFixed(2)+"°"+(W.lat>=0?"N":"S")+" "+
                      Math.abs(W.lon).toFixed(2)+"°"+(W.lon>=0?"E":"W"));
      /* The source of the place is said, not implied. "cast for Moradabad" and
         "Abu Dhabi (your location)" are different claims and a reader is entitled
         to know which one the frame is making. */
      out.push(W.own ? (moT("chartPlace")+" "+nm)
                     : (nm+" ("+moT("yourLocation")+")"));
    }
  }

  if(want.indexOf("h")>=0 && dateMs!=null){
    var hd=moHinduDate(dateMs); if(hd) out.push(hd);
  }
  if(want.indexOf("g")>=0 && dateMs!=null && W){
    var gh=moGhatika(dateMs,W);
    if(gh) out.push(gh+" "+moT("fromSunrise"));
  }
  /* Two short rows read better than one long one on a phone, but four rows eat the
     band. Time and place pair naturally; so do the Hindu date and the ghaṭikā. */
  var rows=[];
  if(out.length>2){
    rows.push(out.slice(0,2).join("  ·  "));
    rows.push(out.slice(2).join("  ·  "));
  } else if(out.length) rows.push(out.join("  ·  "));
  return rows;
}
