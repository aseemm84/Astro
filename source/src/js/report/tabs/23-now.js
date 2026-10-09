/* ================= 2. Now ================= */
var TARA=["Janma","Sampat","Vipat","Kṣema","Pratyak","Sādhana","Naidhana","Mitra","Parama-mitra"];
var TARA_OK=[null,true,false,true,false,true,false,true,true];
function hm2(x){ x=((x%24)+24)%24; var m=Math.round(x*60)%1440; return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"); }
function dayBlock(D,lat,lon,tz,label){
  var nowMs=Date.now(), loc=new Date(nowMs+tz*3600000);
  var y=loc.getUTCFullYear(), m=loc.getUTCMonth()+1, d=loc.getUTCDate(), nowH=loc.getUTCHours()+loc.getUTCMinutes()/60;
  var ev=sunEventsPrecise(y,m,d,lat,lon,tz)||sunEvents(y,m,d,lat,lon,tz);
  var wd=(Math.floor(jdFrom(y,m,d,0)+1.5)%7+7)%7;
  var jdNow=nowMs/86400000+2440587.5, mo=sidAt("Moon",jdNow), su=sidAt("Sun",jdNow);
  var pc=panchanga(su,mo), nk=nakOf(mo), bn=nakOf(D.P.Moon.sid).idx;
  var cnt=((nk.idx-bn+27)%27), ti=cnt%9, mh=hFrom(Math.floor(mo/30),D.P.Moon.sign);
  var cf=GOOD_FROM_MOON.Moon.indexOf(mh)>=0;
  var c='<div class="kcards">'+
    '<div class="kcard"><div class="k">Today</div><div class="v">'+VARAE[wd]+'</div><div class="s">'+d+' '+MON[m]+' '+y+' · '+esc(label)+'</div></div>'+
    '<div class="kcard"><div class="k">Tithi</div><div class="v">'+esc(pc.tithi)+'</div><div class="s">'+pc.paksha+' pakṣa · yoga '+esc(pc.yoga)+'</div></div>'+
    '<div class="kcard"><div class="k">Moon today</div><div class="v">'+esc(nk.name)+'</div><div class="s">'+SA[Math.floor(mo/30)]+' · the '+ord(mh)+' from your Moon'+(cf?' (favourable)':'')+'</div></div>'+
    '<div class="kcard"><div class="k">Tārābala</div><div class="v">'+TARA[ti]+'</div><div class="s">'+(TARA_OK[ti]==null?'the birth star returns':TARA_OK[ti]?'a supportive tārā':'a tārā tradition avoids for beginnings')+'</div></div></div>';
  var t='';
  if(ev){
    var sr=ev.rise, ss=ev.set, part=(((ss-sr)+24)%24)/8;
    var RAHU=[8,2,7,5,6,4,3], YAMA=[5,4,3,2,1,7,6], GULI=[7,6,5,4,3,2,1];
    var CH={0:["Udvega","Chara","Labha","Amrita","Kala","Shubha","Roga","Udvega"],1:["Amrita","Kala","Shubha","Roga","Udvega","Chara","Labha","Amrita"],
      2:["Roga","Udvega","Chara","Labha","Amrita","Kala","Shubha","Roga"],3:["Labha","Amrita","Kala","Shubha","Roga","Udvega","Chara","Labha"],
      4:["Shubha","Roga","Udvega","Chara","Labha","Amrita","Kala","Shubha"],5:["Chara","Labha","Amrita","Kala","Shubha","Roga","Udvega","Chara"],
      6:["Kala","Shubha","Roga","Udvega","Chara","Labha","Amrita","Kala"]};
    var GOODCH=["Amrita","Shubha","Labha","Chara"];
    function row(nm,k,note){ var s=sr+(k-1)*part, on=nowH>=s&&nowH<s+part;
      return '<tr'+(on?' class="khl"':'')+'><td><b>'+nm+'</b>'+(on?' ← now':'')+'</td><td class="knum">'+hm2(s)+' – '+hm2(s+part)+'</td><td class="kmut">'+note+'</td></tr>'; }
    var ci=Math.floor((nowH-sr)/part), cur=(ci>=0&&ci<8)?CH[wd][ci]:null;
    t='<div class="ktwrap"><table class="ktbl"><thead><tr><th>Period</th><th>Time</th><th>Note</th></tr></thead><tbody>'+
      '<tr><td><b>Sunrise / sunset</b></td><td class="knum">'+hm2(sr)+' / '+hm2(ss)+'</td><td class="kmut">disc centre, unrefracted</td></tr>'+
      row("Rāhu kālam",RAHU[wd],"avoided for beginnings")+row("Yamaganda",YAMA[wd],"avoided for beginnings")+row("Gulika kālam",GULI[wd],"avoided for beginnings")+
      '<tr><td><b>Choghaḍiyā now</b></td><td class="knum">'+(cur?hm2(sr+ci*part)+' – '+hm2(sr+(ci+1)*part):'—')+'</td><td style="font-weight:600;color:'+
        (cur?(GOODCH.indexOf(cur)>=0?"#1c6b46":"#a1493a"):"inherit")+'">'+(cur||'night — not tabulated')+'</td></tr></tbody></table></div>';
  }
  return c+t+'<p class="klegend">Times are local to '+esc(label)+' (UTC'+(tz>=0?"+":"")+tz+'). Tārābala counts from your birth nakṣatra ('+
    esc(D.P.Moon.nak)+') to today\'s; regional tables for these muhūrta tools vary.</p>';
}
function nowPane(D,J){
  var now=D.nowJd, h='', LV=levelsAt(D,now), mo=D.P.Moon;
  h+='<p class="knote">What is running for this chart today, '+fdate(now)+'. Read these as seasons and themes to reflect on, '+
     'not forecasts — every reading here is conditional on the whole chart.</p>';
  if(LV){
    h+='<h4 class="ksub">Daśā in force</h4>';
    LV.forEach(function(x){ h+=prog(x.lvl,x.lord,Math.max(0,Math.min(100,(now-x.start)/(x.end-x.start)*100)),x.start,x.end); });
    var md=LV[0].lord, ad=LV[1]?LV[1].lord:null, rel="";
    if(ad&&ad===md) rel=' This is the lord\'s own sub-period, when its themes run undiluted.';
    else if(ad&&D.P[md]&&D.P[ad]){
      var dd=hFrom(D.P[ad].sign,D.P[md].sign);
      rel=' The antardaśā lord sits in the '+ord(dd)+' from the mahādaśā lord — '+
        ([6,8,12].indexOf(dd)>=0?'a 6/8/12 relation, which tradition reads as friction between the two themes':
         [1,4,7,10,5,9].indexOf(dd)>=0?'a kendra/trikoṇa relation, which tradition reads as the two working together':
         'a neutral relation')+'; naturally the two are '+natFriend(ad,md).toLowerCase()+'s.';
    }
    var nx=LV[1]?levelsAt(D,LV[1].end+0.01):null;
    h+=note("Study note — the running period",
      lordLine(md,D)+' sets the chapter; '+(ad?lordLine(ad,D)+' colours the current sub-period.':''),
      rel+(nx&&nx[1]?' Next change: <b>'+esc(nx[0].lord)+' → '+esc(nx[1].lord)+'</b> from '+fdate(LV[1].end)+'.':'')+
      ' A lord gives results for the houses it rules and occupies, weighted by its dignity and strength.',["dasha","bhava"]);
  }
  // slow movers
  var rows=[];
  ["Saturn","Jupiter","Rahu","Ketu"].forEach(function(en){
    var t=transitOf(D,en); if(!t||!mo) return;
    var sg=ridx(t.rashi), hl=hFrom(sg,D.LS), hm=hFrom(sg,mo.sign), fav=GOOD_FROM_MOON[en].indexOf(hm)>=0;
    var bav=null; if(D.av&&D.av.bhinna) D.av.bhinna.forEach(function(b){ if(b.graha===en) bav=b.bindus[sg]; });
    var nx=nextIngress(en,now);
    rows.push('<tr><td><b>'+en+'</b>'+(t.retrograde&&en!=="Rahu"&&en!=="Ketu"?' ℞':'')+'</td><td>'+SA[sg]+'</td><td class="knum">'+hl+'</td>'+
      '<td class="knum">'+hm+'</td><td style="color:'+(fav?"#1c6b46":"#a1493a")+';font-weight:600">'+(fav?"favourable":"not favourable")+'</td>'+
      '<td class="knum">'+(D.av&&D.av.sarva?D.av.sarva[sg]:"—")+(bav!=null?' <span class="kmut">/ '+bav+' own</span>':'')+'</td>'+
      '<td>'+(nx?fdate(nx.jd)+' → '+SA[nx.sign]:'—')+'</td></tr>');
  });
  if(rows.length){
    h+='<h4 class="ksub">The slow planets over this chart</h4>'+
      tbl(["Graha","In","From lagna","From Moon","Gochara","SAV of sign","Next sign"],rows)+
      '<p class="klegend">Gochara is read from the natal Moon. A transit through a sign with 28+ sarvāṣṭakavarga bindus is '+
      'classically better supported; the planet\'s own bindus (of 8) refine it.</p>';
  }
  // sade sati
  try{
    var cyc=lifeCycles(D), cur=null, nxt=null;
    cyc.sade.forEach(function(r){ if(now>=r.s&&now<r.e) cur=r; else if(!nxt&&r.s>now) nxt=r; });
    h+='<h4 class="ksub">Sade Sati</h4><p class="knote">'+
      (cur?'<b>'+esc(SS_NAME[cur.k])+'</b> runs until about '+fmy(cur.e)+'. ':'No Sade Sati or dhaiyā phase is running. ')+
      (nxt?'Next: '+esc(SS_NAME[nxt.k])+' from about '+fmy(nxt.s)+'.':'')+' '+tabLink("timeline","All phases on the life timeline")+'</p>';
  }catch(e){}
  h+='<h4 class="ksub">Today</h4><div class="kday-bar"><button type="button" class="k-btn sec" data-kday-geo="1">Use my current location</button>'+
     '<span class="kmut" id="kday-msg"></span></div><div id="kday">'+dayBlock(D,D.input.lat,D.input.lon,D.input.tzHours,window.__kplace||"the birth place")+'</div>';
  return h;
}

