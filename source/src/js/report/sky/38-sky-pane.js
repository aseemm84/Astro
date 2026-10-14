/* --- the pane: two views, a transport and a set of switches --- */
var SKY_BASE=null, SKY_OFFSET=0, SKY_VIEW="wheel";
function skyStateAt(minutes){
  var i={}; for(var k in SKY_BASE) i[k]=SKY_BASE[k];
  /* minutes may be fractional while playing, and may run to years either side, so the
     day rollover is done on a real Date rather than by arithmetic on the fields. */
  var t=i.hour*60+i.minute+minutes, shift=Math.floor(t/1440);
  t=t-shift*1440;
  i.hour=Math.floor(t/60);
  var rem=t-i.hour*60;
  i.minute=Math.floor(rem);
  i.second=(rem-i.minute)*60;
  if(shift){ var d=new Date(Date.UTC(i.year,i.month-1,i.day+shift));
    i.year=d.getUTCFullYear(); i.month=d.getUTCMonth()+1; i.day=d.getUTCDate(); }
  return {inp:i, sky:window.quickSky(i)};
}
function skyStamp(st){
  var i=st.inp, off=SKY_OFFSET, tail;
  if(!off) tail=" (birth moment)";
  else {
    var a=Math.abs(off), s=off>0?"+":"−";
    tail = a<120 ? " ("+s+Math.round(a)+" min)"
         : a<2880 ? " ("+s+(a/60).toFixed(1)+" h)"
         : a<43830 ? " ("+s+(a/1440).toFixed(1)+" days)"
         : a<525960 ? " ("+s+(a/43830).toFixed(1)+" months)"
         : " ("+s+(a/525960).toFixed(2)+" years)";
  }
  return String(i.day).padStart(2,"0")+" "+MON[i.month]+" "+i.year+" · "+
         String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0")+tail;
}
/* dt is the milliseconds since the previous frame while playing, and null otherwise;
   the wheel uses it to ease a graha toward a new lane instead of snapping it there. */
function skyRedraw(dt){
  var st=skyStateAt(SKY_OFFSET);
  var host=document.getElementById("skycanvas"); if(!host) return;
  /* first draw after the report is mounted: the rail and the scrubber have no state yet */
  var rail=document.getElementById("skyrail");
  if(rail && !rail.firstChild){ skySyncSlider(); skyRail(); }
  if(SKY_VIEW==="wheel"){
    skyLiveDraw(host,st.sky,st.sky.date,dt==null?null:dt);
  } else {
    SKL=null;                                  // the dome replaced the wheel's nodes
    host.innerHTML=skyDome(st.sky);
  }
  var lab=document.getElementById("skystamp"); if(lab) lab.textContent=skyStamp(st);
  var cur=document.getElementById("skyrailcur");
  if(cur&&SKY_BASE){
    var R=skyRangeM(), x=8+(984)*(SKY_OFFSET+R.m)/(2*R.m);
    cur.setAttribute("x",(x-1).toFixed(1));
  }
  var det=document.getElementById("skyfacts");
  if(det){
    var s=st.sky, nk=nakOf(s.lagna);
    var retro=s.planets.filter(function(p){return p.retro&&p.en!=="Rahu"&&p.en!=="Ketu";})
                       .map(function(p){return GL[p.en];});
    det.innerHTML='Lagna '+SA[Math.floor(s.lagna/30)%12]+' '+dm(s.lagna%30)+' · '+esc(nk.name)+' pāda '+nk.pada+
      ' &nbsp;·&nbsp; MC '+SA[Math.floor(s.mc/30)%12]+' '+dm(s.mc%30)+
      (retro.length?(' &nbsp;·&nbsp; retrograde: '+retro.join(" ")):' &nbsp;·&nbsp; nothing retrograde');
  }
}
function skyNatalPoints(D){
  var out=[], N=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  N.forEach(function(en){ var p=D&&D.P&&D.P[en]; if(p&&p.sid!=null) out.push({en:en,sid:p.sid}); });
  return out.length?out:null;
}
function skyPane(D,J){
  if(!J||!J.input) return "";
  SKY_BASE=J.input; SKY_OFFSET=0; SKY_VIEW="wheel"; SKY_VARGA="D1"; SKY_ASPECT="none";
  SKY_NATAL=skyNatalPoints(D); SKL=null;
  SKY_RANGE="12h"; SKY_SPEED="hour"; SKY_PLAYING=false;
  SKY_OPT.tilt=0; SKY_OPT.trail=false; SKY_OPT.speed=false;
  for(var g in SKY_OPT.show) SKY_OPT.show[g]=true;
  return '<p class="knote">The same moment drawn twice. The <b>wheel</b> is the ecliptic itself — twelve rāśis, '+
    'twenty-seven nakṣatras, a hundred and eight pādas, and each graha at its true degree, so a planet sitting '+
    'on a boundary looks like what it is. The <b>dome</b> is the sky over the birthplace: zenith at the centre, '+
    'horizon at the rim, and the lagna literally rising in the east. Press play and the wheel runs: the inner '+
    'ring stays at birth, the outer ring is the gochara of the moment shown.</p>'+
    '<div class="skybar">'+
      '<div class="skytoggle" role="group" aria-label="View">'+
        '<button type="button" data-sky="wheel" class="on">Ecliptic wheel</button>'+
        '<button type="button" data-sky="dome">Local sky</button>'+
      '</div>'+
      '<button type="button" class="k-btn sec" data-skyjump="0">Birth moment</button>'+
      '<button type="button" class="k-btn sec" data-skyjump="now">Right now</button>'+
    '</div>'+
    '<div class="skyvargas" id="skyvargas" aria-label="Divisional chart">'+
      '<span class="skyvlabel">Chart</span>'+
      [["D1","Rāśi"],["D2","Horā"],["D3","Drekkāṇa"],["D4","Caturthāṃśa"],["D7","Saptāṃśa"],
       ["D9","Navāṃśa"],["D10","Daśāṃśa"],["D12","Dvādaśāṃśa"],["D16","Ṣoḍaśāṃśa"],["D20","Viṃśāṃśa"],
       ["D24","Caturviṃśāṃśa"],["D27","Saptaviṃśāṃśa"],["D30","Triṃśāṃśa"],["D40","Khavedāṃśa"],
       ["D45","Akṣavedāṃśa"],["D60","Ṣaṣṭyāṃśa"]].map(function(v){
        return '<button type="button" class="skyv'+(v[0]==="D1"?" on":"")+'" data-skyv="'+v[0]+
          '" title="'+esc(v[1])+'">'+v[0]+'</button>'; }).join("")+
    '</div>'+
    '<div class="skyaspects" id="skyaspects"><span class="skyvlabel">Dṛṣṭi</span>'+
      '<button type="button" class="skyv on" data-skyasp="none">off</button>'+
      [["Sun","Su"],["Moon","Mo"],["Mars","Ma"],["Mercury","Me"],["Jupiter","Ju"],
       ["Venus","Ve"],["Saturn","Sa"],["Rahu","Ra"],["Ketu","Ke"]].map(function(g){
        return '<button type="button" class="skyv" data-skyasp="'+g[0]+'" title="'+g[0]+'">'+g[1]+'</button>';
      }).join("")+
      '<span class="wlitem" style="margin-left:6px">one graha at a time — all nine together is unreadable</span></div>'+
    '<div id="skyctlwrap">'+skyControls()+'</div>'+
    '<p id="skyfacts" class="skyfacts"></p>'+
    '<div id="skycanvas" class="skycanvas"></div>'+
    '<div id="skylegend">'+wheelLegend("ecliptic")+'</div>'+
    '<div class="kbox"><b>The transport.</b> <i>Span</i> sets how far the scrubber reaches either side of '+
    'the birth moment, from twelve hours out to fifty years; <i>Rate</i> sets how much chart time passes '+
    'per second of play. Short spans are for watching the lagna turn — about one degree every four minutes, '+
    'which is what makes a recorded birth time matter so much. Long spans are for gochara: the slow grahas '+
    'crossing signs, and the rail beneath the scrubber marking each crossing and each station, so the moments '+
    'worth looking at can be found without hunting for them.</div>'+
    '<div class="kbox"><b>Crowding and honesty.</b> When grahas bunch together the glyphs step inward, one '+
    'lane at a time, and ease back out as the crowd breaks up. What never happens is a glyph sliding along '+
    'the ring: the bearing from the centre is always the graha&rsquo;s true longitude, so a wheel that has run '+
    'out of room moves a planet closer in rather than somewhere it is not. A graha with another directly '+
    'inside it drops its degree label rather than printing over its neighbour.</div>'+
    '<div class="kbox"><b>The divisional buttons.</b> The wheel can be redrawn for any of the sixteen vargas. '+
    'A varga maps a longitude to a sign; to place a planet on a circle we also need a position within that sign, '+
    'so each planet is drawn according to how far it has travelled through its own division, stretched across '+
    'the 30°. That is a reasonable way to show a varga on a wheel, not a classical quantity — the sign is what '+
    'the tradition asserts, and the sign here always matches the Ṣoḍaśa varga table. <b>Triṃśāṃśa (D30)</b> is '+
    'the exception: its five parts are unequal (5°, 5°, 8°, 7°, 5°), so no single fraction is meaningful and each '+
    'planet is placed at the centre of its varga sign. The nakṣatra and pāda rings appear for the rāśi chart '+
    'only, since those divide the real ecliptic rather than a derived circle.</div>'+
    '<div class="kbox"><b>Tilt and latitude.</b> Jyotiṣa works in longitude alone and treats every graha as if '+
    'it sat exactly on the ecliptic, which is why every chart is flat. The tilt slider lifts the wheel out of '+
    'that plane and raises each graha by its real ecliptic latitude, so the Moon can be seen crossing the plane '+
    'at the node rather than merely being said to. The latitude multiplier exaggerates the lift, as an orrery '+
    'does — the true values run to about 5° for the Moon and 7° for Mercury, invisible at this scale. It is a '+
    'way of seeing what the numbers mean, not a classical quantity. Two further honest notes: the dome places '+
    'each body by its real altitude and azimuth, including that latitude; and the nakṣatra ring shows the equal '+
    '13°20′ divisions, not the uneven real stars they are named after.</div>';
}
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t||!t.getAttribute) return;
  var ap=t.getAttribute("data-skyasp");
  if(ap){ SKY_ASPECT=ap;
    [].forEach.call(document.querySelectorAll("[data-skyasp]"),function(b){
      b.className="skyv"+(b.getAttribute("data-skyasp")===ap?" on":""); });
    skyRedraw(); return; }
  var vg=t.getAttribute("data-skyv");
  if(vg){ SKY_VARGA=vg;
    [].forEach.call(document.querySelectorAll("[data-skyv]"),function(b){
      b.className="skyv"+(b.getAttribute("data-skyv")===vg?" on":""); });
    skyRedraw(); return; }
  var v=t.getAttribute("data-sky");
  if(v){ SKY_VIEW=v;
    if(v!=="wheel") skyPlay(false);
    var lg=document.getElementById("skylegend");
    if(lg) lg.innerHTML=wheelLegend(v==="wheel"?"ecliptic":"dome");
    var vr=document.getElementById("skyvargas"); if(vr) vr.style.display=(v==="wheel")?"":"none";
    var ar=document.getElementById("skyaspects"); if(ar) ar.style.display=(v==="wheel")?"":"none";
    var cw=document.getElementById("skyctlwrap");
    if(cw){ var tg=cw.querySelector(".skytoggles"), sl=cw.querySelector(".skyslides");
      if(tg) tg.style.display=(v==="wheel")?"":"none";
      if(sl) sl.style.display=(v==="wheel")?"":"none"; }
    [].forEach.call(document.querySelectorAll("[data-sky]"),function(b){
      b.className=(b.getAttribute("data-sky")===v)?"on":""; });
    skyRedraw(); return; }
  var j=t.getAttribute("data-skyjump");
  if(j!=null){
    skyPlay(false);
    if(j==="now"){
      SKY_OFFSET=Math.round((Date.now()-skyBirthMs())/60000);
      // widen the span if the present lies outside it, so "right now" always lands somewhere visible
      var need=Math.abs(SKY_OFFSET);
      for(var i=0;i<SKY_RANGES.length;i++){ if(SKY_RANGES[i].m>=need){ SKY_RANGE=SKY_RANGES[i].k; break; } }
      var rs=document.getElementById("skyrange"); if(rs) rs.value=SKY_RANGE;
      skyClampOffset(); skyRail();
    } else SKY_OFFSET=0;
    skySyncSlider();
    skyRedraw();
  }
});
window.__skyRedraw=skyRedraw;
window.__skyVargaLon=function(code,sid){ return skyVargaLon(code,sid); };
window.__skySetVarga=function(v){ SKY_VARGA=v; skyRedraw(); return SKY_VARGA; };
window.__skyGetVarga=function(){ return SKY_VARGA; };
window.__skySetOffset=function(m){ SKY_OFFSET=m; skySyncSlider(); skyRedraw(); return SKY_OFFSET; };
window.__skyGetOffset=function(){ return SKY_OFFSET; };
document.addEventListener("input",function(ev){
  if(ev.target && ev.target.id==="skyslider"){ skyPlay(false); SKY_OFFSET=+ev.target.value; skyRedraw(); }
});
