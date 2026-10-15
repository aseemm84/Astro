/* --- Yogini dasha (36-year cycle) --- */
var YOGINI=[["Maṅgalā","Moon",1],["Piṅgalā","Sun",2],["Dhānyā","Jupiter",3],["Bhrāmarī","Mars",4],
            ["Bhadrikā","Mercury",5],["Ulkā","Saturn",6],["Siddhā","Venus",7],["Saṅkaṭā","Rahu",8]];
function yoginiSection(D){
  if(!D.P.Moon||!D.mds) return "";
  var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, ni=Math.floor(mn/seg);
  var within=(mn-ni*seg)/seg, idx=((ni+1+3)%8+8)%8, start=(idx===0)?7:idx-1;
  var bal=YOGINI[start][2]*(1-within), jd=D.mds[0].start, rows=[], elapsed=0, k=0, cyc=0;
  /* Thirty-six years means the cycle repeats within a life, so one pass would stop
     the table in the native's thirties. Run it to the same 120-year frame as
     Vimśottarī and mark each return. */
  while(elapsed<120 && k<64){
    var y=YOGINI[(start+k)%8], yrs=(k===0)?bal:y[2], end=jd+yrs*365.2564;
    var c=Math.floor((start+k)/8)+1, cur=(D.nowJd>=jd&&D.nowJd<end);
    if(c!==cyc){ cyc=c;
      rows.push('<tr class="kcycrow"><td colspan="6">Cycle '+c+
        (c===1?' <span class="kmut">— begins at birth</span>':
         ' <span class="kmut">— the eight return, from age '+Math.round(elapsed)+'</span>')+'</td></tr>');
    }
    rows.push('<tr'+(cur?' class="khl"':'')+'><td><b>'+esc(y[0])+'</b> <span class="kmut">'+
      esc(y[1])+'</span>'+(cur?' ← current':'')+'</td><td class="knum">'+c+'</td>'+
      '<td class="knum">'+yrs.toFixed(2)+'</td><td>'+fdate(jd)+'</td><td>'+fdate(end)+'</td>'+
      '<td class="kmut">'+(k===0?"balance at birth":"age "+Math.round(elapsed)+"–"+Math.round(elapsed+yrs))+'</td></tr>');
    jd=end; elapsed+=yrs; k++;
  }
  return '<p class="knote"><b>Yoginī daśā</b> runs eight yoginīs of one to eight years — '+
    'thirty-six years in all. Unlike Vimśottarī, whose 120 years no one outlives, this cycle '+
    '<b>repeats</b>: the same yoginī returns roughly every thirty-six years, so it reads as a '+
    'recurring rhythm rather than a once-only sequence. That is what makes it useful alongside '+
    'Vimśottarī and poor on its own — Bhadrikā at 22 and Bhadrikā at 58 look identical to it.</p>'+
    tbl(["Yoginī (lord)","Cycle","Years","From","To","Age"],rows)+
    '<p class="klegend">Birth Moon in '+NAKS[ni]+' (number '+(ni+1)+'); adding three and dividing '+
    'by eight opens on '+esc(YOGINI[start][0])+', with a balance of '+bal.toFixed(2)+' years. '+
    'Shown to 120 years — '+(k)+' periods, about three and a third cycles. '+
    '<b>Source: BPHS Ch.&nbsp;46, vv.&nbsp;195–199.</b></p>';
}

function deriveForExport(J){
  var D=derive(J), out={};
  out.houses={}; out.combust={}; out.chalit={}; out.speed={}; out.status={};
  var start=((D.lagna.sidereal_deg-15)%360+360)%360;
  D.planets.forEach(function(p){
    out.houses[p.en]=p.house; out.combust[p.en]=!!p.combust;
    out.chalit[p.en]=Math.floor((((p.sid-start)%360)+360)%360/30)+1;
    if(p.speed!=null) out.speed[p.en]=p.speed;
    if(p.status) out.status[p.en]=p.status;
  });
  out.lagna_sign=D.LS; out.mc_sidereal=D.mcSid;
  out.sunrise_local=D.sunriseH; out.sunset_local=D.sunsetH; out.weekday=D.weekday;
  if(D.specialLagnas) out.special_lagnas=D.specialLagnas;
  if(D.birthNak) out.birth_nakshatra=D.birthNak;
  if(D.mds) out.vimshottari_mahadashas=D.mds.map(function(m){
    return {lord:m.lord,years:m.years,start_jd:m.start,end_jd:m.end,partial:!!m.partial};});
  try{ var L=levelsAt(D,D.nowJd);
    if(L) out.running_dasha=L.map(function(x){return {level:x.lvl,lord:x.lord,start_jd:x.start,end_jd:x.end};});
  }catch(e){}
  try{ var so={}; D.planets.forEach(function(p){so[p.en]=p.sign;});
    out.ashtakavarga_shodhana=shodhanaAll(D.av,so).map(function(r){
      return {graha:r.graha,trikona:r.trikona,ekadhipatya:r.ekadhipatya,pinda:r.pinda};});
  }catch(e){}
  var full=buildFullExport(D,J);
  for(var k in full) out[k]=full[k];
  out.as_of=jxAsOf(D,J);
  out.guide=jxGuide();
  out.note="Derived layer added by the {{BRAND}} page at render time. Everything here is computed from the engine output in this same file and is reproducible from it.";
  return out;
}
/* ======================================================================
   Report panes — Overview (at a glance + interactive chart), Now, Life
   timeline, Reading path, Life events, Birth-time check, Compatibility.
   All derived from D / J and fresh positions from the built-in engine;
   nothing leaves the browser.
   ====================================================================== */
function jdToDate(jd){ return new Date((jd-2440587.5)*86400000); }
function sidAt(name,jd){ try{ return window.__kSidAt(name,jdToDate(jd)); }catch(e){ return null; } }
function signAt(name,jd){ var s=sidAt(name,jd); return s==null?null:Math.floor(s/30)%12; }
function hFrom(sign,base){ return ((sign-base)%12+12)%12+1; }
function secLink(title,label){ return '<a class="kgo" href="#ks-'+slug(title)+'">'+esc(label||title)+' →</a>'; }
function tabLink(tab,label){ return '<a class="kgo" href="#" data-ktab-go="'+tab+'">'+esc(label)+' →</a>'; }
function pageLink(key){ return '<a class="kgo" href="'+SRCP[key]+'">'+SRCN[key]+' page →</a>'; }
function shortSig(h){ return HSIG[h].split(",")[0]; }
var DIGW={exalted:"exalted",moolatrikona:"in its mūlatrikoṇa",own:"in its own sign",friend:"in a friendly sign",
  neutral:"in a neutral sign",enemy:"in an unfriendly sign",debilitated:"debilitated",node:"a node, read through its dispositor"};
function lordLine(pl,D){
  var p=D.P[pl], own=D.owns[pl]||[];
  return '<b>'+esc(pl)+'</b>'+(own.length?" (lord of the "+list(own.map(ord))+")":"")+
    (p?", in the "+ord(p.house)+" ("+SA[p.sign]+"), "+DIGW[p.dig]:"");
}
function sbOf(J){ return (J&&J.shadbala&&!J.shadbala.error&&J.shadbala.planets)?J.shadbala.planets:null; }
function aspectedBy(D,h){ var a=[]; D.planets.forEach(function(p){ if(aspectsFrom(p.en,p.house).indexOf(h)>=0) a.push(p.en); }); return a; }
function transitOf(D,en){ var t=null; D.transits.forEach(function(x){ if((x.en==="Rāhu"?"Rahu":x.en)===en) t=x; }); return t; }
function isWaxing(D){ return D.P.Sun&&D.P.Moon&&(((D.P.Moon.sid-D.P.Sun.sid)%360+360)%360)<180; }
function paneErr(name,e){ return '<div class="kbox kwarn"><b>'+esc(name)+' could not be computed</b>'+esc(e&&e.message||e)+'</div>'; }

