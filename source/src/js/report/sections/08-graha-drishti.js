/* ---------- natal graha drishti ---------- */
function aspectSection(D){
  var BEN=["Jupiter","Venus","Mercury","Moon"];
  var full={Mars:[3,7],Jupiter:[4,8],Saturn:[2,9]};  // offsets giving special FULL aspects
  var rows=D.planets.map(function(p){
    var offs=ASPOFF[p.en]||[6];
    var hs=offs.map(function(o){return ((p.house-1+o)%12)+1;});
    var tg=[];
    D.planets.forEach(function(q){ if(q.en!==p.en && hs.indexOf(q.house)>=0) tg.push(q.en); });
    var sp=(full[p.en]?" <span class=\"kmut\">(special: "+(p.en==="Mars"?"4th &amp; 8th":p.en==="Jupiter"?"5th &amp; 9th":"3rd &amp; 10th")+")</span>":"");
    return '<tr><td><b>'+esc(p.iast)+'</b> <span class="kmut">'+esc(p.en)+'</span></td><td>'+p.house+'</td>'+
      '<td>'+hs.sort(function(a,b){return a-b;}).map(function(h){return ord(h);}).join(", ")+sp+'</td>'+
      '<td>'+(tg.length?tg.join(", "):"—")+'</td>'+
      '<td class="kmut">'+(BEN.indexOf(p.en)>=0?"benefic":"malefic")+'</td></tr>';
  });
  // matrix: house x aspecting planets
  var byH={};
  D.planets.forEach(function(p){
    (ASPOFF[p.en]||[6]).forEach(function(o){var h=((p.house-1+o)%12)+1;(byH[h]=byH[h]||[]).push(p.en);});
  });
  var mrows=[];
  for(var h=1;h<=12;h++){
    var occ=D.planets.filter(function(p){return p.house===h;}).map(function(p){return GL[p.en];});
    var a=(byH[h]||[]);
    var ben=a.filter(function(x){return BEN.indexOf(x)>=0;}), mal=a.filter(function(x){return BEN.indexOf(x)<0;});
    var net=ben.length-mal.length;
    var col=net>0?"#1c6b46":(net<0?"#a1493a":"#7a6f52");
    mrows.push('<tr><td><b>'+h+'</b> <span class="kmut">'+SA[(D.LS+h-1)%12]+'</span></td>'+
      '<td>'+(occ.length?occ.join(" "):"—")+'</td>'+
      '<td style="color:#1c6b46">'+(ben.length?ben.join(", "):"—")+'</td>'+
      '<td style="color:#a1493a">'+(mal.length?mal.join(", "):"—")+'</td>'+
      '<td class="knum" style="color:'+col+';font-weight:700">'+(net>0?"+":"")+net+'</td></tr>');
  }
  var body='<p class="knote">Graha dṛṣṭi as BPHS gives it: every planet aspects the <b>7th</b> from itself; '+
    'Mars adds the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th. The engine supplies transit '+
    'aspects only, so these natal glances are computed here.</p>'+
    tbl(["Graha","Sits in","Aspects houses","Aspects planets","Nature"],rows)+
    '<h4 class="ksub">What each house receives</h4>'+
    tbl(["House","Occupants","Benefic glances","Malefic glances","Net"],mrows)+
    '<p class="klegend">Net is simply benefic minus malefic count — a rough tally, not Drik Bala, which weights each '+
    'glance in Virupas by exact angle.</p>';
  return body;
}


function aAspects(D){
  var BEN=["Jupiter","Venus","Mercury","Moon"];
  var byH={};D.planets.forEach(function(p){(ASPOFF[p.en]||[6]).forEach(function(o){var h=((p.house-1+o)%12)+1;(byH[h]=byH[h]||[]).push(p.en);});});
  var prot=[],str=[];
  [1,4,5,7,9,10].forEach(function(h){
    var a=byH[h]||[],b=a.filter(function(x){return BEN.indexOf(x)>=0;}),m=a.filter(function(x){return BEN.indexOf(x)<0;});
    if(b.length>m.length)prot.push("the "+ord(h)+" (by "+list(b)+")");
    if(m.length>b.length&&m.length)str.push("the "+ord(h)+" (by "+list(m)+")");
  });
  var b="";
  if(prot.length)b+="Benefic glances favour "+list(prot)+". ";
  if(str.length)b+="Malefic pressure falls on "+list(str)+". ";
  if(!b)b="Benefic and malefic glances are fairly evenly distributed across the key houses. ";
  var d="An aspect modifies, it does not decide: a benefic glance tends to protect a house's matters and a malefic "+
    "one to stress them, but the house lord's condition and the daśā in force still govern the result. This tally "+
    "uses whole-sign graha dṛṣṭi; the weighted form (Drik Bala) scores each glance in Virupas by exact angle.";
  return note("Study note — aspects",b,d,["aspect","strength"]);
}


var NAKG=["Deva","Manushya","Rakshasa","Manushya","Deva","Manushya","Deva","Deva","Rakshasa","Rakshasa",
"Manushya","Manushya","Deva","Rakshasa","Deva","Rakshasa","Deva","Rakshasa","Rakshasa","Manushya",
"Manushya","Deva","Rakshasa","Rakshasa","Manushya","Manushya","Deva"];
var NAKY=["Horse","Elephant","Sheep","Serpent","Serpent","Dog","Cat","Sheep","Cat","Rat",
"Rat","Cow","Buffalo","Tiger","Buffalo","Tiger","Deer","Deer","Dog","Monkey",
"Mongoose","Monkey","Lion","Horse","Lion","Cow","Elephant"];
var NAKN=["Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya","Antya",
"Madhya","Adi","Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya",
"Antya","Antya","Madhya","Adi","Adi","Madhya","Antya"];
var SYL=["Chu","Che","Cho","La","Li","Lu","Le","Lo","A","I","U","E","O","Va","Vi","Vu","Ve","Vo","Ka","Ki","Ku","Gha","Ing","Chha","Ke","Ko","Ha","Hi","Hu","He","Ho","Da","Di","Du","De","Do","Ma","Mi","Mu","Me","Mo","Ta","Tee","Too","Te","To","Pa","Pi","Pu","Sha","Na","Tha","Pe","Po","Ra","Ri","Ru","Re","Ro","Taa","Ti","Tu","Tay","Toe","Na","Ni","Nu","Ne","No","Ya","Yi","Yu","Ye","Yo","Bha","Bhi","Bhu","Dha","Pha","Dhaa","Bhe","Bho","Ja","Ji","Ju","Je","Jo","Gha","Ga","Gi","Gu","Ge","Go","Sa","Si","Su","Se","So","Da","Di","Du","Tha","Jha","Nya","De","Do","Cha","Chi"];
var VARNA={0:"Kshatriya",1:"Vaishya",2:"Shudra",3:"Brahmin",4:"Kshatriya",5:"Vaishya",6:"Shudra",7:"Brahmin",
8:"Kshatriya",9:"Vaishya",10:"Shudra",11:"Brahmin"};
var VASHYA=["Chatushpada","Chatushpada","Nara","Jalachara","Vanachara","Nara","Nara","Keeta","Nara/Chatushpada",
"Chatushpada/Jalachara","Nara","Jalachara"];
var TATWA=["Agni","Prithvi","Vayu","Jala","Agni","Prithvi","Vayu","Jala","Agni","Prithvi","Vayu","Jala"];
var TITHIN=["Pratipada","Dvitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami",
"Dashami","Ekadashi","Dvadashi","Trayodashi","Chaturdashi","Purnima"];
var YOGAN=["Vishkambha","Preeti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula",
"Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva",
"Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
var KARMOV=["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"];
var KARFIX=["Shakuni","Chatushpada","Naga","Kimstughna"];
var VARAS=["Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"];
var VARAE=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function dmsStr(v,pos,neg){var s=v<0?neg:pos,a=Math.abs(v),d=Math.floor(a),m=Math.floor((a-d)*60),
  sec=Math.floor((((a-d)*60)-m)*60);
  return d+"°"+(m<10?"0":"")+m+"′"+(sec<10?"0":"")+sec+"″ "+s;}
function hms(x){x=((x%24)+24)%24;var s=Math.round(x*3600);
  return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor(s%3600/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");}
function jdFrom(y,m,d,ut){if(m<=2){y--;m+=12;}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+ut/24;}
function sunEventsPrecise(y,m,d,lat,lon,tz){
  try{
    var obs=new Astronomy.Observer(lat,lon,0);
    var localMidnightUTC=Date.UTC(y,m-1,d,0,0,0)-tz*3600000;
    var t0=new Date(localMidnightUTC);
    // Jyotisha convention: the Sun's disc centre at the geometric horizon, unrefracted
    // (altitude 0). This reproduces classical panchanga sunrise; the usual civil definition
    // (upper limb plus refraction, −0.833°) puts sunrise about four minutes earlier.
    var r=Astronomy.SearchAltitude(Astronomy.Body.Sun,obs,+1,t0,2,0);
    var s=Astronomy.SearchAltitude(Astronomy.Body.Sun,obs,-1,t0,2,0);
    if(!r) r=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,+1,t0,2);
    if(!s) s=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,-1,t0,2);
    if(!r||!s) return null;
    var toH=function(dt){ return ((dt.date.getTime()-localMidnightUTC)/3600000)%24; };
    return {rise:toH(r), set:toH(s), riseDate:r.date, setDate:s.date};
  }catch(e){ return null; }
}
function sunEvents(y,m,d,lat,lon,tz){
  var jd0=jdFrom(y,m,d,0),n=Math.round(jd0-2451545.0+0.0008),Js=n-lon/360,
      Ms=((357.5291+0.98560028*Js)%360+360)%360,R=Math.PI/180,
      C=1.9148*Math.sin(Ms*R)+0.02*Math.sin(2*Ms*R)+0.0003*Math.sin(3*Ms*R),
      lam=((Ms+C+180+102.9372)%360+360)%360,
      Jt=2451545.0+Js+0.0053*Math.sin(Ms*R)-0.0069*Math.sin(2*lam*R),
      dec=Math.asin(Math.sin(lam*R)*Math.sin(23.44*R))/R,
      cw=(Math.sin(-0.833*R)-Math.sin(lat*R)*Math.sin(dec*R))/(Math.cos(lat*R)*Math.cos(dec*R));
  if(cw<-1||cw>1)return null;
  var w=Math.acos(cw)/R,loc=function(J){return (((J-jd0)*24+tz)%24+24)%24;};
  return {rise:loc(Jt-w/360),set:loc(Jt+w/360)};
}
function panchanga(sun,moon){
  var diff=((moon-sun)%360+360)%360, ti=Math.floor(diff/12);
  var n=Math.floor(diff/6);
  return {tithiIdx:ti, paksha:ti<15?"Shukla":"Krishna",
    tithi:(ti===29?"Amavasya":(ti===14?"Purnima":TITHIN[ti%15])),
    yoga:YOGAN[Math.floor((((moon+sun)%360+360)%360)/(800/60))],
    karana:(n===0?"Kimstughna":(n<=56?KARMOV[(n-1)%7]:KARFIX[n-57]))};
}
/* The lunar month, season and half-year. Not limbs of the pañcāṅga proper — those
   are the five in panchanga() above — but every printed pañcāṅga carries them in
   its heading, so the Overview and the Motion tab both show them.

   The computation itself lives in the engine, because the engine is what builds
   the downloaded JSON and that file now carries these too. Keeping a second copy
   here would be two implementations of one quantity, free to disagree the moment
   either is touched. */
function masaOf(sun,moon,ayan){ return window.__masaOf(sun,moon,ayan); }

function basicsSection(D,J){
  var i=D.input||{},lat=i.lat,lon=i.lon,tz=i.tzHours;
  var sun=D.P.Sun,moon=D.P.Moon; if(!sun||!moon)return "";
  var birthH=i.hour+i.minute/60;
  var jd=jdFrom(i.year,i.month,i.day,birthH-tz);
  var jdLocal0=jdFrom(i.year,i.month,i.day,0);
  var wd=(Math.floor(jdLocal0+1.5)%7+7)%7;          // civil weekday, local date
  var pc=panchanga(sun.sid,moon.sid);
  var ev=(D.sunriseH!=null?{rise:D.sunriseH,set:D.sunsetH}
          :sunEvents(i.year,i.month,i.day,lat,lon,tz));
  var lmtc=(lon-tz*15)*4, lmt=birthH+lmtc/60, gmt=birthH-tz;
  var T=(jd-2451545.0)/36525.0,
      gmst=280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T,
      lst=(((gmst+lon)%360)+360)%360/15;
  var trop=((sun.sid+D.ayan)%360+360)%360;
  var ms=masaOf(sun.sid,moon.sid,D.ayan);        // month, season, ayana — see masaOf above
  var ayana=ms.ayana, amanta=ms.amanta, purnimanta=ms.purnimanta;
  var ni=nakOf(moon.sid);
  var beforeSunrise=ev?(birthH<ev.rise):false;
  var ghatis=ev?((beforeSunrise?(birthH+24-ev.rise):(birthH-ev.rise))*2.5):null;
  var hinduWd=beforeSunrise?((wd+6)%7):wd;          // vara changes at sunrise, not midnight
  var syl=SYL[(ni.idx*4+(ni.pada-1))%SYL.length];

  var name=(J&&J.input&&J.input.name)||window.__kname||"";
  var rows1=[
    ["Date of birth", i.day+" "+["","January","February","March","April","May","June","July","August",
      "September","October","November","December"][i.month]+" "+i.year],
    ["Day of birth", VARAE[wd]],
    ["Vāra (from sunrise)", VARAS[hinduWd]+" · "+VARAE[hinduWd]+
      (beforeSunrise?" (born before sunrise, so the previous day's vāra still runs)":"")],
    ["Time of birth", String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0")+" hrs"],
    ["Place", (window.__kplace||(lat.toFixed(4)+"°, "+lon.toFixed(4)+"°"))],
    ["Latitude", dmsStr(lat,"N","S")],
    ["Longitude", dmsStr(lon,"E","W")],
    ["Time zone", (tz>=0?"+":"−")+String(Math.floor(Math.abs(tz))).padStart(2,"0")+":"+
        String(Math.round((Math.abs(tz)%1)*60)).padStart(2,"0")+" hrs"],
    ["GMT at birth", hms(gmt)],
    ["LMT correction", (lmtc<0?"−":"+")+hms(Math.abs(lmtc)/60)],
    ["Local Mean Time", hms(lmt)],
    ["Sidereal Time", hms(lst)],
    ["Sunrise / Sunset", ev?(hms(ev.rise)+" / "+hms(ev.set)):"—"],
    ["Iṣṭakāla", ghatis!=null?(Math.floor(ghatis)+" gh "+Math.floor((ghatis%1)*60)+" pala"+
        (beforeSunrise?" (from the previous sunrise)":"")):"—"],
    ["Sun sign (tropical)", SIGNS[Math.floor(trop/30)%12]],
    ["Lagna", SA[D.LS]+" "+dm(D.lagDeg)],
    ["Ayanāṃśa", D.ayan.toFixed(4)+"° — "+esc((J&&J.ayanamsa_name)||"Lahiri (Chitrapakṣa)")]
  ];
  var rows2=[
    ["Vikram Samvat", (i.year+57)+" (approx.)"],
    ["Saka Samvat", (i.year-78)+" (approx.)"],
    ["Lunar month (Amānta)", amanta],
    ["Lunar month (Pūrṇimānta)", purnimanta],
    ["Ṛtu (season)", ms.ritu||"—"],
    ["Ayana / Gola", ayana+" / "+(ayana==="Dakshinayana"?"Dakshina":"Uttara")],
    ["Pakṣa", pc.paksha],
    ["Tithi at birth", pc.paksha+" "+pc.tithi],
    ["Nakṣatra at birth", padaLink(ni.name,ni.pada)],
    ["Yoga at birth", pc.yoga],
    ["Karaṇa at birth", pc.karana],
    (J&&J.bhayat?["Bhayāta", (function(x){var g=Math.floor(x),pa=Math.floor((x-g)*60);
        return g+" gh "+pa+" pala";})(J.bhayat.bhayat_ghatis)]:null),
    (J&&J.bhayat?["Bhabhoga", (function(x){var g=Math.floor(x),pa=Math.floor((x-g)*60);
        return g+" gh "+pa+" pala";})(J.bhayat.bhabhoga_ghatis)]:null),
    ["Daśā at birth", (function(){var L=levelsAt(D,D.mds?D.mds[0].start+1e-6:0);
        return L?L.slice(0,3).map(function(x){return x.lord;}).join("–"):(D.birthNak?D.birthNak.lord:"—");})()],
    ["Balance of daśā", D.birthNak?(function(){var b=D.birthNak.balance,yy=Math.floor(b),
       mo=Math.floor((b-yy)*12),dd=Math.round((((b-yy)*12)-mo)*30);
       return D.birthNak.lord+" "+yy+"y "+mo+"m "+dd+"d";})():"—"]
  ];
  var rows3=[
    ["Varṇa", VARNA[moon.sign]],
    ["Vashya", (function(){var v=VASHYA[moon.sign];
        if(v.indexOf("/")<0)return v; var p=v.split("/");
        return (moon.deg<15?p[0]:p[1]);})()],
    ["Nakṣatra · pāda", ni.name+" - "+ni.pada],
    ["Yoni", NAKY[ni.idx]],
    ["Rāśi", SA[moon.sign]+" ("+SIGNS[moon.sign]+")"],
    ["Rāśīśa (sign lord)", LORD[moon.sign]],
    ["Gaṇa", NAKG[ni.idx]],
    ["Nāḍī", NAKN[ni.idx]],
    ["Tatva (Hansak)", TATWA[moon.sign]],
    ["Nāmākṣara (syllable)", syl]
  ];
  function kv(rows){return '<div class="ktwrap"><table class="ktbl kkv"><tbody>'+rows.filter(Boolean).map(function(r){
    return '<tr><td class="kk">'+esc(r[0])+'</td><td><b>'+esc(r[1])+'</b></td></tr>';}).join("")+'</tbody></table></div>';}
  var hdr=name?'<div class="kname">'+esc(name)+'</div>':'';
  return hdr+'<div class="kbasics"><div><h4 class="ksub">Birth particulars</h4>'+kv(rows1)+'</div>'+
    '<div><h4 class="ksub">Hindu calendar</h4>'+kv(rows2)+'</div>'+
    '<div><h4 class="ksub">Avakhaḍa chakra</h4>'+kv(rows3)+'</div></div>'+
    '<p class="klegend">Pañcāṅga, time reductions and Avakhaḍa are computed here from the chart\'s own longitudes '+
    '(the engine returns only the <i>current</i> pañcāṅga, not the birth one). Sunrise/sunset use the Jyotiṣa convention — the '+
    'Sun&rsquo;s disc centre at the geometric horizon, unrefracted — which is what classical pañcāṅga uses; the '+
    'civil definition would put sunrise about four minutes earlier. Iṣṭakāla, the upagraha timings and the '+
    'special lagnas all follow from it. Saṃvat years are the common '+
    'approximation and shift at their own new-year points. Bhayāt/Bhabhoga and nakṣatra entry/exit times need the '+
    'Moon\'s daily speed, which the engine does not supply, so they are omitted rather than estimated.</p>';
}

