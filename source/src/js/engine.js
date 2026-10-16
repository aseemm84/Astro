
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
/* Lahiri ayanamsa — quadratic fitted to Swiss Ephemeris (residual < 0.001") */
/* Ayanamsa. Each set of coefficients was fitted to Swiss Ephemeris over 1800-2200
   (quarterly samples) and the residual measured. Lahiri, Raman and Krishnamurti
   reproduce Swiss Ephemeris to 0.000"; true Chitrapaksha is a moving definition tied
   to Spica's actual position and carries about +/-20" of non-polynomial wobble, which
   is well under an arcminute and far below a nakshatra pada (3000"), but is not exact. */
var AYAN_MODES={
  lahiri:     {name:"Lahiri (Chitrapakṣa)", note:"the Indian civil standard; matches Swiss Ephemeris to 0.000″",
               c:[0.000307083556492,1.39688796382,23.857092356]},
  raman:      {name:"Raman", note:"B. V. Raman's value; matches Swiss Ephemeris to 0.000″",
               c:[0.00030705015156,1.39688808364,22.4107910426]},
  kp:         {name:"Krishnamurti (KP)", note:"used in the KP system; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050151567,1.39688808364,23.7602400426]},
  truechitra: {name:"True Chitrapakṣa", note:"Spica fixed at 180° exactly; a moving definition, within ≈20″ of Swiss Ephemeris",
               c:[0.00030778556054,1.39569673536,23.8413914361]}
};
var AYAN_MODE="lahiri";
function setAyanamsaMode(m){ if(AYAN_MODES[m]) AYAN_MODE=m; return AYAN_MODE; }
function ayanamsaFor(mode,jd){
  var M=AYAN_MODES[mode]||AYAN_MODES.lahiri, T=Tof(jd), v=0;
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
function ascendant(jd,date,lat,lon,ay){
  var gast=Astronomy.SiderealTime(date);
  var lst=((gast+lon/15)%24+24)%24, ramc=lst*15*D2R;
  var T=Tof(jd), eps=(23.439291111-0.0130041667*T-1.638e-7*T*T)*D2R, phi=lat*D2R;
  var a=Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)))*R2D;
  return norm(norm(a)-ay);
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
function arudhaOf(house,lagnaSign,posBySign){
  var hs=(lagnaSign+house-1)%12, lord=LORD[hs], lp=posBySign[lord];
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
function masaOf(sunSid,moonSid,ayan){
  var elapsed=norm(moonSid-sunSid)/12;
  var sunAtNM=norm(sunSid-elapsed*0.9856*(29.53/30));
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
function ashtakavarga(signOf,lagnaSign){
  var bhinna=[],sarva=new Array(12).fill(0);
  AVORDER.forEach(function(pl){
    var b=new Array(12).fill(0);
    Object.keys(AVT[pl]).forEach(function(c){
      var from=(c==="Lagna")?lagnaSign:signOf[c];
      AVT[pl][c].forEach(function(h){ b[(from+h-1)%12]++; });
    });
    var tot=b.reduce(function(a,x){return a+x;},0);
    bhinna.push({graha:pl,graha_sa:pl,total:tot,bindus:b});
    for(var i=0;i<12;i++) sarva[i]+=b[i];
  });
  return {bhinna:bhinna,sarva:sarva,sarva_total:sarva.reduce(function(a,x){return a+x;},0),
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
var SB_VAL={exalted:45,moolatrikona:45,own:30,greatfriend:20,friend:15,neutral:10,enemy:4,greatenemy:2};
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
/* Sphuta Drishti — BPHS Ch.26, vv. 1-12. The aspectual angle is measured from the
   aspecting planet to the aspected point; the six rules below give the value in Virupas,
   with the extra allowances the sage specifies for Mars, Jupiter and Saturn. */
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
  return Math.max(0,Math.min(60,v));
}
function shadbala(ctx){
  var P=ctx.planets, LS=ctx.LS, lagSid=ctx.lagSid, jd=ctx.jd, date=ctx.date,
      sunrise=ctx.sunrise, sunset=ctx.sunset, birthH=ctx.birthH, decl=ctx.decl,
      cheshtaK=ctx.cheshtaK, vargaSign=ctx.vargaSign, digOf=ctx.digOf, LORD=ctx.LORD,
      natFriend=ctx.natFriend, weekday=ctx.weekday, varshaLord=ctx.varshaLord, masaLord=ctx.masaLord;
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var houseOf={}, signOf={};
  names.concat(["Rahu","Ketu"]).forEach(function(n){ if(!P[n])return;
    signOf[n]=Math.floor(P[n].sid/30)%12; houseOf[n]=((signOf[n]-LS)%12+12)%12+1; });
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
      if(d==="exalted"||d==="moolatrikona"||d==="own") sapta+=SB_VAL[d==="own"?"own":"exalted"];
      else { var lord=LORD[vs];
        sapta += (lord===p)?SB_VAL.own:SB_VAL[sbCompound(p,lord,h,houseOf[lord]||h,natFriend)]; }
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
    var strongCusp=(SB_DIG[p]-1)*30+lagSid, weak=(strongCusp+180)%360;
    var dd=Math.abs(((sid-weak)%360+360)%360); if(dd>180)dd=360-dd;
    var dig=dd/3;
    // --- Kala ---
    var x=Math.abs(birthH-12); var frac=1-x/12;                    // 1 at noon, 0 at midnight
    var nath=(p==="Mercury")?60:((SB_DAY.indexOf(p)>=0)?60*frac:60*(1-frac));
    var paksha=(SB_BEN.indexOf(p)>=0)?pakshaArc/3:60-pakshaArc/3;
    if(p==="Moon") paksha*=2;
    var tribhaga=(p===tribhagaLord||p==="Jupiter")?60:0;
    var lordBala=0;
    if(p===varshaLord)lordBala+=15; if(p===masaLord)lordBala+=30;
    if(p===DAYLORD[weekday])lordBala+=45; if(p===horaLord)lordBala+=60;
    var dsign=(p==="Moon"||p==="Saturn")?-1:1;
    var ayana=60*(24+dsign*(decl[p]||0))/48; if(p==="Sun")ayana*=2;
    ayana=Math.max(0,Math.min(p==="Sun"?120:60,ayana));
    var kala=nath+paksha+tribhaga+lordBala+ayana;
    // --- Cheshta ---
    var cheshta;
    if(p==="Sun") cheshta=Math.min(60,ayana); else if(p==="Moon") cheshta=Math.min(60,paksha);
    else cheshta=Math.max(0,Math.min(60,(cheshtaK[p]||0)/3));
    // --- Naisargika & Drik ---
    var nais=SB_NAIS[p];
    var drik=0;
    names.concat(["Rahu","Ketu"]).forEach(function(q){ if(q===p||!P[q])return;
      var v=sphutaDrishti(q,P[q].sid,P[p].sid);
      if(!v)return;
      drik += (SB_BEN.indexOf(q)>=0? v : -v)/4;
    });
    var total=sthana+dig+kala+cheshta+nais+drik;
    out.push({graha:p,sthana:sthana,uchcha:uchcha,saptavargaja:sapta,ojha:ojha,kendradi:kendradi,
      drekkana:drekBala,dig:dig,kala:kala,nathonnatha:nath,paksha:paksha,tribhaga:tribhaga,
      lord_bala:lordBala,ayana:ayana,cheshta:cheshta,naisargika:nais,drik:drik,
      total_virupa:total,total_rupa:total/60,required_rupa:SB_REQ[p],ratio:(total/60)/SB_REQ[p]});
  });
  out.sort(function(a,b){return b.ratio-a.ratio;});
  return {planets:out,context:{day_birth:isDay,hora_lord:horaLord,tribhaga_lord:tribhagaLord,
    weekday_lord:DAYLORD[weekday],varsha_lord:varshaLord,masa_lord:masaLord,
    sunrise:sunrise,sunset:sunset,paksha_arc:pakshaArc}};
}


/* astronomical inputs for Shadbala */
function declOf(name,date){
  var eq=Astronomy.Equator(Astronomy.Body[BODY[name]],date,new Astronomy.Observer(0,0,0),true,true);
  return eq.dec;
}
function sunriseSunset(date,lat,lon){
  var obs=new Astronomy.Observer(lat,lon,0);
  var d0=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),0,0,0));
  var r=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,+1,d0,2);
  var s=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,-1,d0,2);
  return {rise:r?r.date:null, set:s?s.date:null};
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
     window.__ayanFor=ayanamsaFor; }catch(e){}
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
window.__kMasa=function(sunSid,moonSid,ayan){ return masaOf(sunSid,moonSid,ayan); };
window.__kNak=function(deg){ return nak(deg); };
window.__kJD=function(ms){ return ms/86400000+2440587.5; };
window.__kAsc=function(inp,offMin){
  var ut=inp.hour+inp.minute/60+(offMin||0)/60-inp.tzHours;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var date=new Date(Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000);
  return ascendant(jd,date,inp.lat,inp.lon,ayanamsa(jd));
};
/* sidereal longitude of a graha at any instant — used by the timeline, events and Now panel */
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
  var ramc=lst*15*Math.PI/180;
  var mc=Math.atan2(Math.tan(ramc),Math.cos(epsd*Math.PI/180))*180/Math.PI;
  if(Math.cos(ramc)<0) mc+=180;
  return {jd:jd,date:date,ayanamsa:ay,lagna:lag,mc:norm(mc-ay),planets:out,
          obliquity:epsd,lst:lst,lat:inp.lat,lon:inp.lon};
};
window.buildLocalChart=function(inp){
  setAyanamsaMode(inp.ayanamsa||"lahiri");
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
  var sunSid=pos.Sun.sid;
  order.forEach(function(n){
    var p=pos[n], nk=nak(p.sid);
    var cmb=combustionOf(n,p.sid,sunSid);
    grahas.push({key:SK[n],sa:SK[n],iast:SK[n],rashi:rashiObj(p.sid),
      nakshatra_pada:nk.pada,dignity:null,retrograde:p.speed<0,
      sidereal_deg:p.sid, speed_deg_per_day:p.speed,
      ecliptic_latitude_deg:p.lat,
      combust:cmb?cmb.combust:false,
      sun_separation_deg:(n==="Sun")?0:(function(){
        var sp=Math.abs(norm(p.sid-sunSid)); return sp>180?360-sp:sp; })(),
      combustion_orb_deg:cmb?cmb.orb_deg:null});
  });
  var posBySign={}; order.forEach(function(n){posBySign[n]=Math.floor(pos[n].sid/30)%12;});
  var bhavas=[];
  for(var h=0;h<12;h++){var sg=(LS+h)%12, occ=[];
    order.forEach(function(n){if(posBySign[n]===sg)occ.push(SK[n]);});
    bhavas.push({idx:h,sa:BH[h],iast:BH[h],rashi:rashiObj(sg*30+0.001),ruler:SK[LORD[sg]],occupants:occ});}
  var vargas=VCODES.map(function(v){var p={};
    order.forEach(function(n){p[SK[n]]=vargaSign(v[0],pos[n].sid);});
    /* a varga has its own ascendant; without it the division cannot be read as a
       chart, only as a list of signs */
    return {varga:v[0],sa:v[1],en:v[2],lagna:vargaSign(v[0],lagSid),positions:p};});
  var ck=names.map(function(n){return {n:n,d:pos[n].sid%30};})
    .sort(function(a,b){return b.d-a.d;})
    .map(function(x,i){return {rank:i+1,label_short:["AK","AmK","BK","MK","PK","GK","DK"][i],
      label_en:["Soul-significator","Minister-significator","Brother-significator","Mother-significator",
                "Children-significator","Cousin-significator","Spouse-significator"][i],
      graha:SK[x.n],deg_in_sign:x.d};});
  var av=names.map(function(n){var b=baladi(pos[n].sid);
    return {graha:SK[n],avastha_iast:b[0],strength_percent:b[1]};});
  var ar=[];
  for(var b2=1;b2<=12;b2++){var sg=arudhaOf(b2,LS,posBySign);
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
  order.forEach(function(n){ HOUSE[n]=((posBySign[n]-LS)%12+12)%12+1;
    DIGN[n]=digOf(n,posBySign[n],pos[n].sid%30); });
  var ownsMap={}; for(var hh=1;hh<=12;hh++){var lo=LORD[(LS+hh-1)%12];(ownsMap[lo]=ownsMap[lo]||[]).push(hh);}
  var avOut=ashtakavarga(posBySign,LS);
  avOut.bhinna.forEach(function(x){x.graha_sa=SK[x.graha]||x.graha;});
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
    sbOut=shadbala({planets:pos,LS:LS,lagSid:lagSid,jd:jd,date:date,sunrise:srH,sunset:ssH,
      birthH:inp.hour+inp.minute/60,decl:SBD,cheshtaK:ckend,vargaSign:vargaSign,digOf:digOf,LORD:LORD,
      natFriend:function(a,b){ if(FRD[a]&&FRD[a].indexOf(b)>=0)return "friend";
        if(ENM[a]&&ENM[a].indexOf(b)>=0)return "enemy"; return "neutral"; },
      weekday:(Math.floor(jdFromUTC(inp.year,inp.month,inp.day,0)+1.5)%7+7)%7,
      varshaLord:DAYL[varshaW], masaLord:DAYL[masaW]});
  }catch(err){ sbOut={error:String(err&&err.message||err)}; }
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
    lagna:{sidereal_deg:lagSid,rashi:rashiObj(lagSid),nakshatra_pada:nak(lagSid).pada},
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
