/* ===== now.html — the Hindu day, as it stands =============================

   WHAT THIS IS. A live view of the current Hindu time for one place: the five
   limbs with their end-times, the māsa in both reckonings, the ṛtu and the ayana,
   sunrise and sunset, and the later-tradition divisions of the day — horā,
   choghaḍiyā, rāhu kāla. It needs no birth chart, which is the point: a visitor
   with no birth data gets something useful, and something worth returning to.

   WHY A PAGE AND NOT A MOTION SCENE. The Motion tab's whole grammar — a loop, a
   span, a scrubber, play and pause, export this frame — means nothing for a clock
   showing now. This is continuous and it is about the present moment.

   THE DAY OBJECT IS THE POINT. Everything below is a view of nowDay(), which given
   an instant and a place returns the whole pañcāṅga for the day that instant falls
   in. The calendar will want exactly this, so it is written as a function of
   (ms, place) rather than as a page that happens to know the time. Writing it
   twice would guarantee the two disagree eventually.

   SOURCE DISCIPLINE. The five limbs, the māsa, the ṛtu and the ayana are classical.
   Horā, choghaḍiyā and rāhu kāla are LATER TRADITION, not BPHS, and the page says
   so where it shows them — the same separation the rest of this site keeps between
   verse, commentary and modern practice. */

(function(){
  "use strict";
  var $=function(id){ return document.getElementById(id); };

  /* --- places -------------------------------------------------------------
     A short list, plus whatever chart the reader last cast. The full 34,000-city
     file is 2.9 MB and this page must stay light; a reader who wants their exact
     town can cast a chart on the kundli page and this picks the place up. */
  var PLACES=[
    {n:"Abu Dhabi, AE",lat:24.4539,lon:54.3773,tz:4},
    {n:"Dubai, AE",lat:25.2048,lon:55.2708,tz:4},
    {n:"Delhi, IN",lat:28.6139,lon:77.2090,tz:5.5},
    {n:"Mumbai, IN",lat:19.0760,lon:72.8777,tz:5.5},
    {n:"Kolkata, IN",lat:22.5726,lon:88.3639,tz:5.5},
    {n:"Chennai, IN",lat:13.0827,lon:80.2707,tz:5.5},
    {n:"Bengaluru, IN",lat:12.9716,lon:77.5946,tz:5.5},
    {n:"Hyderabad, IN",lat:17.3850,lon:78.4867,tz:5.5},
    {n:"Pune, IN",lat:18.5204,lon:73.8567,tz:5.5},
    {n:"Ahmedabad, IN",lat:23.0225,lon:72.5714,tz:5.5},
    {n:"Jaipur, IN",lat:26.9124,lon:75.7873,tz:5.5},
    {n:"Lucknow, IN",lat:26.8467,lon:80.9462,tz:5.5},
    {n:"Varanasi, IN",lat:25.3176,lon:82.9739,tz:5.5},
    {n:"Kathmandu, NP",lat:27.7172,lon:85.3240,tz:5.75},
    {n:"London, GB",lat:51.5074,lon:-0.1278,tz:0},
    {n:"New York, US",lat:40.7128,lon:-74.0060,tz:-5},
    {n:"Singapore, SG",lat:1.3521,lon:103.8198,tz:8},
    {n:"Sydney, AU",lat:-33.8688,lon:151.2093,tz:10}
  ];
  var PLACE=PLACES[2];                       /* Delhi, until told otherwise */

  /* A chart cast on the kundli page leaves its birth data behind; its PLACE is
     what this page can use, not its moment. */
  function savedPlace(){
    try{
      var raw=localStorage.getItem("nirayana.birth");
      if(!raw) return null;
      var b=JSON.parse(raw);
      if(b && b.lat!=null && b.lon!=null)
        return {n:(b.place||"your saved chart's place"), lat:+b.lat, lon:+b.lon,
                tz:+(b.tz||0), saved:true};
    }catch(e){}
    return null;
  }

  /* --- the engine, loaded only when this page is actually used ------------- */
  var engineReady=false, engineWanted=false;
  function withEngine(fn){
    if(engineReady) return fn();
    if(!engineWanted){
      engineWanted=true;
      var s=document.createElement("script");
      s.src="engine.js";
      s.onload=function(){ engineReady=true; fn(); };
      s.onerror=function(){
        var h=$("nowgrid");
        if(h) h.innerHTML='<p class="nownote">The engine could not be loaded, so '+
          'nothing here can be computed. Everything on this page is worked out in '+
          'this browser, so there is no server to fall back to.</p>';
      };
      document.head.appendChild(s);
    }
  }

  /* --- the day object ------------------------------------------------------
     Given an instant and a place, everything about the Hindu day that instant
     falls in. This is the function the calendar will be built on. */
  function sidAt(name,ms){
    try{ return window.__kSidAt(name,new Date(ms)); }catch(e){ return null; }
  }
  function riseSet(ms,P,dir){
    try{
      var obs=new Astronomy.Observer(P.lat,P.lon,0);
      var r=Astronomy.SearchRiseSet(Astronomy.Body.Sun,obs,dir,new Date(ms),2);
      return r?r.date.getTime():null;
    }catch(e){ return null; }
  }
  /* The sunrise that opened the day this instant belongs to. A Hindu day runs
     sunrise to sunrise, so an instant at 02:00 belongs to YESTERDAY's day. */
  function dayStart(ms,P){
    var sr=riseSet(ms-26*3600000,P,+1);
    if(sr==null) return null;
    while(sr<=ms-26*3600000) sr=riseSet(sr+3600000,P,+1);
    var next=riseSet(sr+3600000,P,+1);
    if(next!=null && next<=ms) sr=next;
    return sr;
  }
  /* When the running tithi / nakṣatra / yoga / karaṇa ends. Each is a longitude
     condition, so the end is found by bisecting rather than by assuming a mean
     length — the Moon's speed varies by about 15% over a month and a mean figure
     would be minutes out, which is exactly the error that moves a festival. */
  function endOf(ms,P,stepDeg,valueAt){
    var v0=valueAt(ms);
    if(v0==null) return null;
    var lo=ms, hi=ms+Math.max(2,stepDeg)*3600000*2.2;
    for(var g=0;g<40;g++){
      if(valueAt(hi)!==v0) break;
      lo=hi; hi+=6*3600000;
      if(hi-ms>3*86400000) return null;
    }
    for(var b=0;b<42 && hi-lo>20000;b++){
      var mid=(lo+hi)/2;
      if(valueAt(mid)===v0) lo=mid; else hi=mid;
    }
    return (lo+hi)/2;
  }
  function tithiIdx(ms){ var s=sidAt("Sun",ms), m=sidAt("Moon",ms);
    return (s==null||m==null)?null:Math.floor((((m-s)%360)+360)%360/12); }
  function nakIdx(ms){ var m=sidAt("Moon",ms);
    return m==null?null:Math.floor((((m%360)+360)%360)/(40/3)); }
  function yogaIdx(ms){ var s=sidAt("Sun",ms), m=sidAt("Moon",ms);
    return (s==null||m==null)?null:Math.floor((((m+s)%360)+360)%360/(800/60)); }
  function karanaIdx(ms){ var s=sidAt("Sun",ms), m=sidAt("Moon",ms);
    return (s==null||m==null)?null:Math.floor((((m-s)%360)+360)%360/6); }

  function nowDay(ms,P){
    var su=sidAt("Sun",ms), mo=sidAt("Moon",ms);
    if(su==null||mo==null) return null;
    var jd=window.__kJD(ms);
    var pc=window.__kPanchang(su,mo,jd);
    var ayn=0; try{ ayn=window.__ayanFor?window.__ayanFor("lahiri",jd):0; }catch(e){}
    var ms2=window.__kMasa(su,mo,ayn);
    var sr=dayStart(ms,P);
    var ss=(sr==null)?null:riseSet(sr,P,-1);
    var srNext=(sr==null)?null:riseSet(sr+3600000,P,+1);
    /* The vāra turns at sunrise, not at midnight — a reading uses the vāra of the
       day that is running, and before sunrise that is still yesterday's. */
    var vJd=(sr==null)?jd:window.__kJD(sr);
    return {
      ms:ms, place:P,
      sunrise:sr, sunset:ss, nextSunrise:srNext,
      tithi:{name:pc.tithi_sa, paksha:pc.paksha_sa, n:(tithiIdx(ms)+1),
             ends:endOf(ms,P,12,tithiIdx)},
      nakshatra:{name:pc.nakshatra_sa, pada:window.__kNak(mo).pada,
                 ends:endOf(ms,P,13,nakIdx)},
      yoga:{name:pc.yoga_sa, ends:endOf(ms,P,13,yogaIdx)},
      karana:{name:pc.karana_sa, ends:endOf(ms,P,6,karanaIdx)},
      vara:VARA_EN[(Math.floor(vJd+1.5)%7+7)%7],
      varaSa:VARA_SA[(Math.floor(vJd+1.5)%7+7)%7],
      masa:ms2, sunDeg:su, moonDeg:mo,
      elongation:(((mo-su)%360)+360)%360
    };
  }
  /* --- one romanisation ----------------------------------------------------
     The engine writes its names plainly — "Shashthi", "Shobhana", "Ashwina" — and
     the rest of this site writes IAST. Two spellings of the same word on one page
     reads as carelessness, so the engine's names are mapped on the way out.

     This is a display map and nothing is computed from it: an unmapped name falls
     through unchanged, so a name added to the engine shows up as itself rather
     than vanishing. That is the trade for keeping the map here instead of in the
     engine, which should not have to know how a page likes to spell things. */
  var IAST={
    /* tithi */
    Pratipada:"Pratipadā",Dvitiya:"Dvitīyā",Tritiya:"Tṛtīyā",Chaturthi:"Caturthī",
    Panchami:"Pañcamī",Shashthi:"Ṣaṣṭhī",Saptami:"Saptamī",Ashtami:"Aṣṭamī",
    Navami:"Navamī",Dashami:"Daśamī",Ekadashi:"Ekādaśī",Dvadashi:"Dvādaśī",
    Trayodashi:"Trayodaśī",Chaturdashi:"Caturdaśī",Purnima:"Pūrṇimā",
    Amavasya:"Amāvāsyā",Shukla:"Śukla",Krishna:"Kṛṣṇa",
    /* nakṣatra */
    Ashwini:"Aśvinī",Bharani:"Bharaṇī",Krittika:"Kṛttikā",Rohini:"Rohiṇī",
    Mrigashira:"Mṛgaśirā",Ardra:"Ārdrā",Punarvasu:"Punarvasu",Pushya:"Puṣya",
    Ashlesha:"Āśleṣā",Magha:"Maghā","Purva Phalguni":"Pūrva Phalgunī",
    "Uttara Phalguni":"Uttara Phalgunī",Hasta:"Hasta",Chitra:"Citrā",Swati:"Svātī",
    Vishakha:"Viśākhā",Anuradha:"Anurādhā",Jyeshtha:"Jyeṣṭhā",Mula:"Mūla",
    "Purva Ashadha":"Pūrva Āṣāḍhā","Uttara Ashadha":"Uttara Āṣāḍhā",
    Shravana:"Śravaṇa",Dhanishta:"Dhaniṣṭhā",Shatabhisha:"Śatabhiṣā",
    "Purva Bhadrapada":"Pūrva Bhādrapadā","Uttara Bhadrapada":"Uttara Bhādrapadā",
    Revati:"Revatī",
    /* yoga */
    Vishkambha:"Viṣkambha",Preeti:"Prīti",Ayushman:"Āyuṣmān",Saubhagya:"Saubhāgya",
    Shobhana:"Śobhana",Atiganda:"Atigaṇḍa",Sukarma:"Sukarmā",Dhriti:"Dhṛti",
    Shula:"Śūla",Ganda:"Gaṇḍa",Vriddhi:"Vṛddhi",Dhruva:"Dhruva",Vyaghata:"Vyāghāta",
    Harshana:"Harṣaṇa",Vajra:"Vajra",Siddhi:"Siddhi",Vyatipata:"Vyatīpāta",
    Variyan:"Varīyān",Parigha:"Parigha",Shiva:"Śiva",Siddha:"Siddha",Sadhya:"Sādhya",
    Shubha:"Śubha",Brahma:"Brahmā",Indra:"Indra",Vaidhriti:"Vaidhṛti",
    /* karaṇa */
    Bava:"Bava",Balava:"Bālava",Kaulava:"Kaulava",Taitila:"Taitila",Gara:"Gara",
    Vanija:"Vaṇija",Vishti:"Viṣṭi",Shakuni:"Śakuni",Chatushpada:"Catuṣpada",
    Naga:"Nāga",Kimstughna:"Kiṃstughna",
    /* māsa, ṛtu, ayana */
    Chaitra:"Caitra",Vaishakha:"Vaiśākha",Ashadha:"Āṣāḍha",Bhadrapada:"Bhādrapada",
    Ashwina:"Āśvina",Kartika:"Kārtika",Margashirsha:"Mārgaśīrṣa",Pausha:"Pauṣa",
    Phalguna:"Phālguna",Vasanta:"Vasanta",Grishma:"Grīṣma",Varsha:"Varṣā",
    Sharad:"Śarad",Hemanta:"Hemanta",Shishira:"Śiśira",
    Uttarayana:"Uttarāyaṇa",Dakshinayana:"Dakṣiṇāyana"
  };
  function sa(n){ return (n!=null && IAST[n]) || n; }

  var VARA_SA=["Ravivāra","Somavāra","Maṅgalavāra","Budhavāra","Guruvāra","Śukravāra","Śanivāra"];
  var VARA_EN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  /* exposed for the cross-check harness: the page itself never calls this */
  window.__nowDay=nowDay;

  /* --- the divisions of the daylight -- later tradition, not BPHS ----------
     Horā, choghaḍiyā and rāhu kāla all cut the day between sunrise and sunset into
     equal parts and assign each to a graha. They are widely used and they are not
     in Parāśara; the page labels them so rather than letting them pass as classical. */
  var HORA_ORDER=["Sun","Venus","Mercury","Moon","Saturn","Jupiter","Mars"];
  var LORD_OF_DAY=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  function horaNow(D){
    if(D.sunrise==null||D.nextSunrise==null) return null;
    /* twelve unequal hours of day and twelve of night is one convention; the
       simpler and commoner one is 24 equal hours from sunrise, used here */
    var span=(D.nextSunrise-D.sunrise)/24;
    var i=Math.floor((D.ms-D.sunrise)/span);
    if(i<0||i>23) return null;
    var wd=(Math.floor(window.__kJD(D.sunrise)+1.5)%7+7)%7;
    var start=HORA_ORDER.indexOf(LORD_OF_DAY[wd]);
    return {lord:HORA_ORDER[(start+i)%7], i:i,
            from:D.sunrise+i*span, to:D.sunrise+(i+1)*span};
  }
  /* Rāhu kāla: the day from sunrise to sunset in eight parts, one of which is
     given to Rāhu, by weekday. */
  var RAHU_PART={0:7,1:1,2:6,3:4,4:5,5:3,6:2};   /* Sun..Sat → part index 0-based */
  function rahuKala(D){
    if(D.sunrise==null||D.sunset==null) return null;
    var wd=(Math.floor(window.__kJD(D.sunrise)+1.5)%7+7)%7;
    var part=(D.sunset-D.sunrise)/8, i=RAHU_PART[wd];
    return {from:D.sunrise+i*part, to:D.sunrise+(i+1)*part};
  }
  var CHOG_DAY={
    0:["Udvega","Cara","Labha","Amrita","Kala","Shubha","Roga","Udvega"],
    1:["Amrita","Kala","Shubha","Roga","Udvega","Cara","Labha","Amrita"],
    2:["Roga","Udvega","Cara","Labha","Amrita","Kala","Shubha","Roga"],
    3:["Labha","Amrita","Kala","Shubha","Roga","Udvega","Cara","Labha"],
    4:["Shubha","Roga","Udvega","Cara","Labha","Amrita","Kala","Shubha"],
    5:["Cara","Labha","Amrita","Kala","Shubha","Roga","Udvega","Cara"],
    6:["Kala","Shubha","Roga","Udvega","Cara","Labha","Amrita","Kala"]
  };
  function choghadiya(D){
    if(D.sunrise==null||D.sunset==null) return null;
    if(D.ms<D.sunrise||D.ms>D.sunset) return {night:true};
    var wd=(Math.floor(window.__kJD(D.sunrise)+1.5)%7+7)%7;
    var part=(D.sunset-D.sunrise)/8, i=Math.floor((D.ms-D.sunrise)/part);
    i=Math.max(0,Math.min(7,i));
    return {name:(CHOG_DAY[wd]||CHOG_DAY[0])[i], i:i,
            from:D.sunrise+i*part, to:D.sunrise+(i+1)*part};
  }

  /* --- formatting ---------------------------------------------------------- */
  function clock(ms,tz){
    if(ms==null) return "—";
    var d=new Date(ms+tz*3600000);
    return String(d.getUTCHours()).padStart(2,"0")+":"+
           String(d.getUTCMinutes()).padStart(2,"0");
  }
  function clockS(ms,tz){
    if(ms==null) return "—";
    var d=new Date(ms+tz*3600000);
    return clock(ms,tz)+":"+String(d.getUTCSeconds()).padStart(2,"0");
  }
  var MONS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function dayLabel(ms,tz){
    if(ms==null) return "—";
    var d=new Date(ms+tz*3600000);
    return d.getUTCDate()+" "+MONS[d.getUTCMonth()]+" "+d.getUTCFullYear();
  }
  /* "ends 14:32 — in 3 h 12 m". The countdown is what a reader actually wants: an
     end-time alone makes you do the subtraction yourself. */
  function endsIn(end,now,tz){
    if(end==null) return "—";
    var mins=Math.round((end-now)/60000);
    if(mins<0) return clock(end,tz);
    var h=Math.floor(mins/60), m=mins%60;
    return clock(end,tz)+" · in "+(h?(h+" h "):"")+m+" m";
  }
  function ghatika(ms,sr){
    if(sr==null) return "—";
    var g=(ms-sr)/86400000*60;
    if(g<0||g>62) return "—";
    var gh=Math.floor(g), vg=Math.floor((g-gh)*60);
    return gh+"."+String(vg).padStart(2,"0")+" gh";
  }

  /* --- the page ------------------------------------------------------------ */
  var tickTimer=null;

  function render(){
    var host=$("nowgrid"); if(!host) return;
    var D=nowDay(Date.now(),PLACE);
    if(!D){ host.innerHTML='<p class="nownote">Positions could not be computed.</p>'; return; }
    var tz=PLACE.tz, now=D.ms;
    var hora=horaNow(D), rk=rahuKala(D), ch=choghadiya(D);

    function card(title,big,sub,cls){
      return '<div class="nowcard'+(cls?(" "+cls):"")+'"><b>'+title+'</b>'+
             '<span class="nowbig">'+big+'</span>'+
             (sub?('<span class="nowsub">'+sub+'</span>'):"")+'</div>';
    }
    host.innerHTML=
      card("Tithi", sa(D.tithi.paksha)+" "+sa(D.tithi.name),
           "ends "+endsIn(D.tithi.ends,now,tz)+" &middot; "+D.tithi.n+" of 30")+
      card("Nakṣatra", sa(D.nakshatra.name),
           "pāda "+D.nakshatra.pada+" &middot; ends "+endsIn(D.nakshatra.ends,now,tz))+
      card("Yoga", sa(D.yoga.name), "ends "+endsIn(D.yoga.ends,now,tz))+
      card("Karaṇa", sa(D.karana.name), "ends "+endsIn(D.karana.ends,now,tz))+
      card("Vāra", D.varaSa, D.vara+" &middot; turns at sunrise, not midnight")+
      card("Māsa", sa(D.masa.amanta),
           "amānta &middot; pūrṇimānta "+sa(D.masa.purnimanta))+
      card("Ṛtu &amp; ayana", sa(D.masa.ritu), sa(D.masa.ayana))+
      card("Sunrise", clock(D.sunrise,tz),
           "sunset "+clock(D.sunset,tz)+" &middot; "+ghatika(now,D.sunrise)+" so far");

    var later=$("nowlater");
    if(later) later.innerHTML=
      card("Horā", hora?SA_GRAHA[hora.lord]:"—",
           hora?(clock(hora.from,tz)+" – "+clock(hora.to,tz)):"", "nowlt")+
      card("Choghaḍiyā", ch?(ch.night?"night":ch.name):"—",
           (ch&&!ch.night)?(clock(ch.from,tz)+" – "+clock(ch.to,tz)):
             "the day divisions run sunrise to sunset", "nowlt")+
      card("Rāhu kāla", rk?(clock(rk.from,tz)+" – "+clock(rk.to,tz)):"—",
           rk?((now>=rk.from&&now<=rk.to)?"running now":"not now"):"", "nowlt");

    var head=$("nowhead");
    if(head) head.innerHTML=
      '<span class="nowclock">'+clockS(now,tz)+'</span>'+
      '<span class="nowplace">'+esc(PLACE.n)+
        (PLACE.saved?' <i>(from your saved chart)</i>':"")+
        ' &middot; UTC'+(tz<0?"-":"+")+String(Math.floor(Math.abs(tz))).padStart(2,"0")+":"+
        String(Math.round((Math.abs(tz)%1)*60)).padStart(2,"0")+'</span>'+
      '<span class="nowdate">'+dayLabel(now,tz)+'</span>';
    drawStrip(D);
  }
  var SA_GRAHA={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",
    Jupiter:"Guru",Venus:"Śukra",Saturn:"Śani"};
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){
    return ({"&":"&amp;","<":"&lt;",">":"&gt;"})[c]; }); }

  /* --- the strip -----------------------------------------------------------
     The tithi running across a selectable span either side of now, so the present
     moment has a before and an after rather than standing alone. Each tithi is a
     band; the current one is lit and marked. */
  var SPAN_DAYS=3;
  function drawStrip(D){
    var cv=$("nowstrip"); if(!cv||!cv.getContext) return;
    var w=cv.clientWidth||700, h=120;
    var dpr=window.devicePixelRatio||1;
    cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
    cv.style.height=h+"px";
    var c=cv.getContext("2d"); c.setTransform(dpr,0,0,dpr,0,0);
    c.clearRect(0,0,w,h);
    var now=D.ms, t0=now-SPAN_DAYS*86400000, t1=now+SPAN_DAYS*86400000;
    var dark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
    var ink=dark?"#e8eaf6":"#1d2340", dim=dark?"#8a90b5":"#6a7090";
    var gold="#c9a24b", line=dark?"rgba(200,205,235,.18)":"rgba(29,35,64,.14)";
    var x=function(ms){ return (ms-t0)/(t1-t0)*w; };

    /* tithi boundaries across the span, from the elongation crossing each 12° */
    var N=Math.round((t1-t0)/3600000), prev=null, bands=[];
    for(var i=0;i<=N;i++){
      var m=t0+(t1-t0)*i/N, v=tithiIdx(m);
      if(v==null) continue;
      if(prev!=null && v!==prev.v) bands.push({at:m, from:prev.v, to:v});
      prev={m:m,v:v};
    }
    /* the bands */
    var edges=[t0].concat(bands.map(function(b){ return b.at; })).concat([t1]);
    for(var k=0;k<edges.length-1;k++){
      var a=edges[k], b2=edges[k+1], mid=(a+b2)/2, vi=tithiIdx(mid);
      var isNow=(now>=a&&now<b2);
      c.fillStyle=isNow?"rgba(201,162,75,0.22)":(k%2?"rgba(127,140,200,0.07)":"rgba(127,140,200,0.03)");
      c.fillRect(x(a),22,x(b2)-x(a),52);
      c.strokeStyle=line; c.lineWidth=1;
      c.beginPath(); c.moveTo(x(a),22); c.lineTo(x(a),74); c.stroke();
      if(x(b2)-x(a)>26 && vi!=null){
        c.fillStyle=isNow?gold:dim;
        c.font=(isNow?"700 ":"500 ")+"11px system-ui,-apple-system,sans-serif";
        c.textAlign="center"; c.textBaseline="middle";
        c.fillText(String((vi%15)+1),(x(a)+x(b2))/2,48);
      }
    }
    /* day marks */
    var d0=new Date(t0+PLACE.tz*3600000);
    var mid0=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth(),d0.getUTCDate())-PLACE.tz*3600000;
    for(var dms=mid0; dms<=t1; dms+=86400000){
      if(dms<t0) continue;
      c.strokeStyle=line; c.lineWidth=1;
      c.beginPath(); c.moveTo(x(dms),16); c.lineTo(x(dms),80); c.stroke();
      c.fillStyle=dim; c.font="500 10px system-ui,-apple-system,sans-serif";
      c.textAlign="center"; c.textBaseline="top";
      c.fillText(dayLabel(dms,PLACE.tz).replace(/ \d{4}$/,""),x(dms),84);
    }
    /* now */
    c.strokeStyle=gold; c.lineWidth=2.5;
    c.beginPath(); c.moveTo(x(now),14); c.lineTo(x(now),82); c.stroke();
    c.fillStyle=gold; c.font="700 11px system-ui,-apple-system,sans-serif";
    c.textAlign="center"; c.textBaseline="bottom";
    c.fillText("now",x(now),12);
    c.fillStyle=ink;
  }

  /* --- wiring --------------------------------------------------------------- */
  function buildControls(){
    var sel=$("nowplace");
    if(sel){
      var sv=savedPlace();
      var list=sv?[sv].concat(PLACES):PLACES;
      sel.innerHTML=list.map(function(p,i){
        return '<option value="'+i+'">'+esc(p.n)+'</option>'; }).join("");
      PLACE=list[0]; sel.value="0";
      sel.addEventListener("change",function(){ PLACE=list[+sel.value]||PLACE; render(); });
    }
    var sp=$("nowspan");
    if(sp) sp.addEventListener("change",function(){
      SPAN_DAYS=+sp.value||3; render(); });
  }

  function start(){
    if(!$("nowgrid")) return;
    buildControls();
    withEngine(function(){
      render();
      if(tickTimer) clearInterval(tickTimer);
      /* A second is the right cadence: the clock moves every second and everything
         else is recomputed cheaply enough that there is no reason to stagger it. */
      tickTimer=setInterval(render,1000);
    });
    window.addEventListener("resize",function(){
      if(engineReady) render();
    });
  }
  if(document.readyState==="loading")
    document.addEventListener("DOMContentLoaded",start);
  else start();
})();
