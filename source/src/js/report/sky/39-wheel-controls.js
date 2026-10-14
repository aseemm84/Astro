/* ===== Transport, event rail and display switches for the ecliptic wheel =====
   The wheel knows how to draw a moment. This decides which moment, how fast the
   moments follow one another, and which layers are on. */

/* How far the scrubber reaches either side of the birth moment, in minutes. A wheel
   that can only move twelve hours cannot show a gochara; one that always spans fifty
   years cannot show the lagna turning. So the span is a choice. */
var SKY_RANGES=[
  {k:"12h",  m:720,       label:"±12 hours",  step:1},
  {k:"7d",   m:10080,     label:"±7 days",    step:1},
  {k:"1y",   m:525960,    label:"±1 year",    step:10},
  {k:"10y",  m:5259600,   label:"±10 years",  step:60},
  {k:"50y",  m:26298000,  label:"±50 years",  step:600}
];
/* Play rate, in chart-time per real second. */
var SKY_SPEEDS=[
  {k:"min",  m:60,      label:"1 min/s"},
  {k:"hour", m:1440,    label:"1 hour/s"},
  {k:"day",  m:10080,   label:"1 day/s"},
  {k:"week", m:43830,   label:"1 week/s"},
  {k:"month",m:131490,  label:"1 month/s"},
  {k:"year", m:525960,  label:"1 year/s"}
];
var SKY_STEPS=[
  {k:"-1y",m:-525960,label:"−1y"},{k:"-1mo",m:-43830,label:"−1mo"},{k:"-1d",m:-1440,label:"−1d"},
  {k:"-1h",m:-60,label:"−1h"},{k:"+1h",m:60,label:"+1h"},{k:"+1d",m:1440,label:"+1d"},
  {k:"+1mo",m:43830,label:"+1mo"},{k:"+1y",m:525960,label:"+1y"}
];
var SKY_RANGE="12h", SKY_SPEED="hour", SKY_PLAYING=false, SKY_RAF=null, SKY_LAST=null;

function skyRangeM(){ for(var i=0;i<SKY_RANGES.length;i++) if(SKY_RANGES[i].k===SKY_RANGE) return SKY_RANGES[i]; return SKY_RANGES[0]; }
function skySpeedM(){ for(var i=0;i<SKY_SPEEDS.length;i++) if(SKY_SPEEDS[i].k===SKY_SPEED) return SKY_SPEEDS[i].m; return 1440; }

/* ---------------------------------------------------------------------------
   Events on the rail: a sign ingress, or a station where a graha turns. Both are
   found by walking the window at a stride and watching for a change — the same
   method nextIngress() uses, without the bisection, because a tick two days wide
   on a twenty-year rail is already finer than the pixel it is drawn in.
   --------------------------------------------------------------------------- */
var SKY_EVCACHE={key:null,ev:[]};
function skyEvents(t0,t1){
  var key=Math.round(t0/60000)+"|"+Math.round(t1/60000);
  if(SKY_EVCACHE.key===key) return SKY_EVCACHE.ev;
  var days=(t1-t0)/86400000, ev=[];
  var bodies = days>2000 ? ["Jupiter","Saturn","Rahu"]
             : days>200  ? ["Mars","Jupiter","Saturn","Rahu"]
             : days>20   ? ["Sun","Mercury","Venus","Mars","Jupiter","Saturn","Rahu"]
             :             ["Moon","Sun","Mercury","Venus","Mars"];
  var N=Math.min(1400,Math.max(60,Math.round(days*2)));
  var stride=(t1-t0)/N;
  bodies.forEach(function(en){
    var prevSign=null, prevLon=null, prevDir=null;
    for(var i=0;i<=N;i++){
      var ms=t0+i*stride, L=null;
      try{ L=window.__kSidAt(en,new Date(ms)); }catch(e){}
      if(L==null) break;
      var sg=Math.floor(L/30)%12;
      if(prevSign!=null && sg!==prevSign) ev.push({ms:ms,kind:"ingress",body:en,sign:sg});
      if(prevLon!=null){
        var d=L-prevLon; if(d>180)d-=360; if(d<-180)d+=360;
        var dir=d<0?-1:1;
        if(prevDir!=null && dir!==prevDir && en!=="Moon" && en!=="Sun")
          ev.push({ms:ms,kind:dir<0?"retro":"direct",body:en});
        prevDir=dir;
      }
      prevSign=sg; prevLon=L;
    }
  });
  ev.sort(function(a,b){return a.ms-b.ms;});
  SKY_EVCACHE={key:key,ev:ev};
  return ev;
}
var SKY_SLOW={Jupiter:1,Saturn:1,Rahu:1,Mars:1};
function skyRail(){
  var host=document.getElementById("skyrail"); if(!host||!SKY_BASE) return;
  var R=skyRangeM(), base=skyBirthMs();
  var t0=base-R.m*60000, t1=base+R.m*60000;
  var ev=skyEvents(t0,t1), W=1000, L=8, Rt=W-8;
  function x(ms){ return L+(Rt-L)*(ms-t0)/(t1-t0); }
  var o='<svg viewBox="0 0 1000 40" class="skyrailsvg" role="img" aria-label="Timeline marking sign '+
        'ingresses and retrograde stations across the shown span">';
  o+='<line x1="'+L+'" y1="26" x2="'+Rt+'" y2="26" stroke="#c9ccda" stroke-width="1"/>';
  ev.forEach(function(e){
    var col=e.kind==="ingress"?"#c9a24b":(e.kind==="retro"?"#b5533c":"#2f7d55");
    var slow=SKY_SLOW[e.body], h=slow?12:6;
    o+='<line x1="'+x(e.ms).toFixed(1)+'" y1="'+(26-h)+'" x2="'+x(e.ms).toFixed(1)+'" y2="26" stroke="'+
       col+'" stroke-width="'+(slow?1.6:1)+'" opacity="'+(slow?0.95:0.45)+'"/>';
  });
  // birth moment and now
  o+='<line x1="'+x(base).toFixed(1)+'" y1="18" x2="'+x(base).toFixed(1)+'" y2="34" stroke="#1d2340" stroke-width="1.4"/>';
  o+='<text x="'+(x(base)+4).toFixed(1)+'" y="38" class="skyrt">birth</text>';
  var nowMs=Date.now();
  if(nowMs>t0&&nowMs<t1){
    o+='<line x1="'+x(nowMs).toFixed(1)+'" y1="18" x2="'+x(nowMs).toFixed(1)+'" y2="34" stroke="#3f6fa6" stroke-width="1.4"/>';
    o+='<text x="'+(x(nowMs)+4).toFixed(1)+'" y="38" class="skyrt" fill="#3f6fa6">now</text>';
  }
  var cm=base+SKY_OFFSET*60000;
  o+='<rect id="skyrailcur" x="'+(x(cm)-1).toFixed(1)+'" y="12" width="2" height="22" fill="#a1493a"/>';
  o+='<text x="'+L+'" y="10" class="skyrt">'+(ev.length?('ingress — gold · station — red turns back, green resumes'):'no sign changes in this span')+'</text>';
  o+='</svg>';
  host.innerHTML=o;
}
function skyBirthMs(){
  var i=SKY_BASE;
  return Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute)-i.tzHours*3600000;
}

/* ---------------------------------------------------------------------------
   Transport
   --------------------------------------------------------------------------- */
function skyClampOffset(){
  var m=skyRangeM().m;
  if(SKY_OFFSET>m) SKY_OFFSET=-m;              // play wraps rather than stopping dead
  if(SKY_OFFSET<-m) SKY_OFFSET=m;
}
function skySyncSlider(){
  var sl=document.getElementById("skyslider"); if(!sl) return;
  var R=skyRangeM();
  sl.min=-R.m; sl.max=R.m; sl.step=R.step; sl.value=SKY_OFFSET;
}
function skyPlayTick(ts){
  if(!SKY_PLAYING){ SKY_RAF=null; return; }
  if(SKY_LAST==null) SKY_LAST=ts;
  var dt=Math.min(120,ts-SKY_LAST); SKY_LAST=ts;
  SKY_OFFSET+=skySpeedM()*dt/1000;
  skyClampOffset();
  var sl=document.getElementById("skyslider"); if(sl) sl.value=SKY_OFFSET;
  skyRedraw(dt);
  SKY_RAF=requestAnimationFrame(skyPlayTick);
}
function skyPlay(on){
  SKY_PLAYING=on; SKY_LAST=null;
  var b=document.getElementById("skyplay");
  if(b){ b.textContent=on?"Pause":"Play"; b.setAttribute("aria-pressed",on?"true":"false"); }
  if(on && !SKY_RAF) SKY_RAF=requestAnimationFrame(skyPlayTick);
  if(!on && SKY_RAF){ cancelAnimationFrame(SKY_RAF); SKY_RAF=null; }
}

/* ---------------------------------------------------------------------------
   Markup
   --------------------------------------------------------------------------- */
function skyChips(name,items,cur,attr){
  return items.map(function(it){
    return '<button type="button" class="skyv'+(it.k===cur?" on":"")+'" '+attr+'="'+it.k+'">'+
      esc(it.label)+'</button>';
  }).join("");
}
var SKY_TOGGLES=[
  {k:"natal",    label:"Natal ring",  hint:"where the grahas stood at birth"},
  {k:"transit",  label:"Gochara",     hint:"where they stand at the shown moment"},
  {k:"nakshatra",label:"Nakṣatras",   hint:"the 27 divisions and their pādas — rāśi chart only"},
  {k:"degrees",  label:"Degrees",     hint:"position to the arc-minute"},
  {k:"retro",    label:"Retrograde",  hint:"mark a graha that is moving backwards"},
  {k:"speed",    label:"Motion",      hint:"an arrow for direction and pace"},
  {k:"trail",    label:"Trails",      hint:"where each graha has been"},
  {k:"lanes",    label:"Stacking",    hint:"crowded grahas step inward rather than collide"}
];
function skyControls(){
  return '<div class="skyctl">'+
    '<div class="skyrow">'+
      '<button type="button" class="k-btn" id="skyplay" aria-pressed="false">Play</button>'+
      '<span class="skyvlabel">Rate</span>'+
      '<select id="skyspeed" class="skysel">'+SKY_SPEEDS.map(function(s){
        return '<option value="'+s.k+'"'+(s.k===SKY_SPEED?" selected":"")+'>'+s.label+'</option>';
      }).join("")+'</select>'+
      '<span class="skyvlabel">Span</span>'+
      '<select id="skyrange" class="skysel">'+SKY_RANGES.map(function(r){
        return '<option value="'+r.k+'"'+(r.k===SKY_RANGE?" selected":"")+'>'+r.label+'</option>';
      }).join("")+'</select>'+
      '<span class="skysteps">'+SKY_STEPS.map(function(s){
        return '<button type="button" class="skyv" data-skystep="'+s.m+'">'+s.label+'</button>';
      }).join("")+'</span>'+
    '</div>'+
    '<div class="skyscrub"><label for="skyslider">Move the clock</label>'+
      '<input type="range" id="skyslider" min="-720" max="720" step="1" value="0">'+
      '<span id="skystamp" class="skystamp"></span></div>'+
    '<div id="skyrail" class="skyrailwrap"></div>'+
    '<div class="skyrow skytoggles"><span class="skyvlabel">Show</span>'+
      SKY_TOGGLES.map(function(t){
        return '<button type="button" class="skyv'+(SKY_OPT[t.k]?" on":"")+'" data-skyopt="'+t.k+
          '" title="'+esc(t.hint)+'">'+esc(t.label)+'</button>';
      }).join("")+
    '</div>'+
    '<div class="skyrow skygrahas"><span class="skyvlabel">Grahas</span>'+
      [["Sun","Su"],["Moon","Mo"],["Mars","Ma"],["Mercury","Me"],["Jupiter","Ju"],
       ["Venus","Ve"],["Saturn","Sa"],["Rahu","Ra"],["Ketu","Ke"]].map(function(g){
        return '<button type="button" class="skyv'+(SKY_OPT.show[g[0]]?" on":"")+
          '" data-skygraha="'+g[0]+'" title="'+g[0]+'">'+g[1]+'</button>';
      }).join("")+
      '<span class="skypre">'+
      '<button type="button" class="skyv" data-skypre="all">all</button>'+
      '<button type="button" class="skyv" data-skypre="slow">slow only</button>'+
      '<button type="button" class="skyv" data-skypre="nodes">nodes</button></span>'+
      '<span class="wlitem">at a gochara rate the Moon crosses the wheel thirteen times a second — '+
      'turn the fast grahas off to watch the slow ones</span>'+
    '</div>'+
    '<div class="skyrow skyslides">'+
      '<label class="skysl">Trail <input type="range" id="skytrail" min="7" max="365" step="1" value="'+
        SKY_OPT.trailDays+'"><span id="skytrailv">'+SKY_OPT.trailDays+' d</span></label>'+
      '<label class="skysl">Tilt <input type="range" id="skytilt" min="0" max="70" step="1" value="'+
        SKY_OPT.tilt+'"><span id="skytiltv">'+SKY_OPT.tilt+'°</span></label>'+
      '<label class="skysl">Latitude × <input type="range" id="skyexag" min="1" max="16" step="1" value="'+
        SKY_OPT.latExag+'"><span id="skyexagv">'+SKY_OPT.latExag+'×</span></label>'+
    '</div>'+
  '</div>';
}

/* ---------------------------------------------------------------------------
   Handlers
   --------------------------------------------------------------------------- */
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t||!t.getAttribute) return;
  if(t.id==="skyplay"){ skyPlay(!SKY_PLAYING); return; }
  var st=t.getAttribute("data-skystep");
  if(st!=null){ skyPlay(false); SKY_OFFSET+=(+st); skyClampOffset(); skySyncSlider(); skyRedraw(); return; }
  var op=t.getAttribute("data-skyopt");
  if(op!=null){
    SKY_OPT[op]=!SKY_OPT[op];
    t.className="skyv"+(SKY_OPT[op]?" on":"");
    skyRedraw(); return;
  }
  var gh=t.getAttribute("data-skygraha");
  if(gh!=null){
    SKY_OPT.show[gh]=!SKY_OPT.show[gh];
    t.className="skyv"+(SKY_OPT.show[gh]?" on":"");
    skyRedraw(); return;
  }
  var pre=t.getAttribute("data-skypre");
  if(pre!=null){
    var sets={ all:["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"],
               slow:["Jupiter","Saturn","Rahu","Ketu"],
               nodes:["Rahu","Ketu"] };
    var on=sets[pre]||sets.all;
    for(var k in SKY_OPT.show) SKY_OPT.show[k]=(on.indexOf(k)>=0);
    [].forEach.call(document.querySelectorAll("[data-skygraha]"),function(b){
      b.className="skyv"+(SKY_OPT.show[b.getAttribute("data-skygraha")]?" on":""); });
    skyRedraw(); return;
  }
});
document.addEventListener("change",function(ev){
  var t=ev.target; if(!t) return;
  if(t.id==="skyspeed"){ SKY_SPEED=t.value; return; }
  if(t.id==="skyrange"){
    SKY_RANGE=t.value; skyClampOffset(); skySyncSlider(); skyRail(); skyRedraw(); return;
  }
});
document.addEventListener("input",function(ev){
  var t=ev.target; if(!t) return;
  if(t.id==="skytrail"){ SKY_OPT.trailDays=+t.value;
    var v=document.getElementById("skytrailv"); if(v) v.textContent=t.value+" d"; skyRedraw(); return; }
  if(t.id==="skytilt"){ SKY_OPT.tilt=+t.value;
    var v2=document.getElementById("skytiltv"); if(v2) v2.textContent=t.value+"°"; skyRedraw(); return; }
  if(t.id==="skyexag"){ SKY_OPT.latExag=+t.value;
    var v3=document.getElementById("skyexagv"); if(v3) v3.textContent=t.value+"×"; skyRedraw(); return; }
});
window.__skyPlay=skyPlay;
window.__skyOpt=SKY_OPT;
