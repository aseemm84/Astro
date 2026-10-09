/* --- the pane: two views plus a time scrubber --- */
var SKY_BASE=null, SKY_OFFSET=0, SKY_VIEW="wheel";
function skyStateAt(minutes){
  var i={}; for(var k in SKY_BASE) i[k]=SKY_BASE[k];
  var t=i.hour*60+i.minute+minutes, shift=Math.floor(t/1440);
  t=((t%1440)+1440)%1440; i.hour=Math.floor(t/60); i.minute=t%60;
  if(shift){ var d=new Date(Date.UTC(i.year,i.month-1,i.day+shift));
    i.year=d.getUTCFullYear(); i.month=d.getUTCMonth()+1; i.day=d.getUTCDate(); }
  return {inp:i, sky:window.quickSky(i)};
}
function skyStamp(st){
  var i=st.inp;
  return String(i.day).padStart(2,"0")+" "+MON[i.month]+" "+i.year+" · "+
         String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0")+
         (SKY_OFFSET?(" ("+(SKY_OFFSET>0?"+":"")+SKY_OFFSET+" min)"):" (birth moment)");
}
function skyRedraw(){
  var st=skyStateAt(SKY_OFFSET);
  var host=document.getElementById("skycanvas"); if(!host) return;
  host.innerHTML=(SKY_VIEW==="wheel")?skyWheel(st.sky):skyDome(st.sky);
  var lab=document.getElementById("skystamp"); if(lab) lab.textContent=skyStamp(st);
  var det=document.getElementById("skyfacts");
  if(det){
    var s=st.sky, nk=nakOf(s.lagna);
    det.innerHTML='Lagna '+SA[Math.floor(s.lagna/30)%12]+' '+dm(s.lagna%30)+' · '+esc(nk.name)+' pāda '+nk.pada+
      ' &nbsp;·&nbsp; MC '+SA[Math.floor(s.mc/30)%12]+' '+dm(s.mc%30);
  }
}
function skyPane(D,J){
  if(!J||!J.input) return "";
  SKY_BASE=J.input; SKY_OFFSET=0; SKY_VIEW="wheel"; SKY_VARGA="D1"; SKY_ASPECT="none";
  return '<p class="knote">The same moment drawn twice. The <b>wheel</b> is the ecliptic itself — twelve rāśis, '+
    'twenty-seven nakṣatras, a hundred and eight pādas, and each graha at its true degree, so a planet sitting '+
    'on a boundary looks like what it is. The <b>dome</b> is the sky over the birthplace: zenith at the centre, '+
    'horizon at the rim, and the lagna literally rising in the east.</p>'+
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
    '<div class="skyscrub"><label for="skyslider">Move the clock</label>'+
      '<input type="range" id="skyslider" min="-720" max="720" step="1" value="0">'+
      '<span id="skystamp" class="skystamp"></span></div>'+
    '<p id="skyfacts" class="skyfacts"></p>'+
    '<div id="skycanvas" class="skycanvas"></div>'+
    '<div id="skylegend">'+wheelLegend("ecliptic")+'</div>'+
    '<div class="kbox"><b>The divisional buttons.</b> The wheel can be redrawn for any of the sixteen vargas. '+
    'A varga maps a longitude to a sign; to place a planet on a circle we also need a position within that sign, '+
    'so each planet is drawn according to how far it has travelled through its own division, stretched across '+
    'the 30°. That is a reasonable way to show a varga on a wheel, not a classical quantity — the sign is what '+
    'the tradition asserts, and the sign here always matches the Ṣoḍaśa varga table. <b>Triṃśāṃśa (D30)</b> is '+
    'the exception: its five parts are unequal (5°, 5°, 8°, 7°, 5°), so no single fraction is meaningful and each '+
    'planet is placed at the centre of its varga sign. The nakṣatra and pāda rings appear for the rāśi chart '+
    'only, since those divide the real ecliptic rather than a derived circle.</div>'+
    '<div class="kbox">Drag the clock and watch the lagna sweep — about one degree every four minutes, which is '+
    'what makes a recorded birth time matter so much. Two honest notes: the dome places each body by its real '+
    'altitude and azimuth, including ecliptic latitude, whereas Jyotiṣa works in longitude alone and treats every '+
    'graha as if it sat exactly on the ecliptic; and the nakṣatra ring shows the equal 13°20′ divisions, not the '+
    'uneven real stars they are named after.</div>';
}
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t||!t.getAttribute) return;
  var v=t.getAttribute("data-sky");
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
  if(v){ SKY_VIEW=v;
    var lg=document.getElementById("skylegend");
    if(lg) lg.innerHTML=wheelLegend(v==="wheel"?"ecliptic":"dome");
    var vr=document.getElementById("skyvargas"); if(vr) vr.style.display=(v==="wheel")?"":"none";
    var ar=document.getElementById("skyaspects"); if(ar) ar.style.display=(v==="wheel")?"":"none";
    [].forEach.call(document.querySelectorAll("[data-sky]"),function(b){
      b.className=(b.getAttribute("data-sky")===v)?"on":""; });
    skyRedraw(); return; }
  var j=t.getAttribute("data-skyjump");
  if(j!=null){
    if(j==="now"){
      var n=new Date(), i=SKY_BASE;
      var bm=Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute)-i.tzHours*3600000;
      SKY_OFFSET=Math.round((n.getTime()-bm)/60000);
      var sl0=document.getElementById("skyslider");
      if(sl0){ sl0.min=Math.min(-720,SKY_OFFSET); sl0.max=Math.max(720,SKY_OFFSET); sl0.value=SKY_OFFSET; }
    } else { SKY_OFFSET=0; var sl=document.getElementById("skyslider"); if(sl) sl.value=0; }
    skyRedraw();
  }
});
window.__skyRedraw=skyRedraw;
window.__skyVargaLon=function(code,sid){ return skyVargaLon(code,sid); };
window.__skySetVarga=function(v){ SKY_VARGA=v; skyRedraw(); return SKY_VARGA; };
window.__skyGetVarga=function(){ return SKY_VARGA; };
document.addEventListener("input",function(ev){
  if(ev.target && ev.target.id==="skyslider"){ SKY_OFFSET=+ev.target.value; skyRedraw(); }
});
