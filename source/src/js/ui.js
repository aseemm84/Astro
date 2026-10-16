
(function(){
  var API="https://kundliproxy.aseemmehrotralove.workers.dev";  // default: your Cloudflare Worker proxy (adds CORS, forwards to the engine)
  var CITIES=[
    {n:"\u2014 select a city \u2014"},
    {n:"Custom / enter coordinates manually"},
    {n:"Abu Dhabi, AE",lat:24.4539,lon:54.3773,tz:4},
    {n:"Dubai, AE",lat:25.2048,lon:55.2708,tz:4},
    {n:"Delhi, IN",lat:28.6139,lon:77.2090,tz:5.5},
    {n:"Mumbai, IN",lat:19.0760,lon:72.8777,tz:5.5},
    {n:"Kolkata, IN",lat:22.5726,lon:88.3639,tz:5.5},
    {n:"Chennai, IN",lat:13.0827,lon:80.2707,tz:5.5},
    {n:"Bengaluru, IN",lat:12.9716,lon:77.5946,tz:5.5},
    {n:"Hyderabad, IN",lat:17.3850,lon:78.4867,tz:5.5},
    {n:"Ahmedabad, IN",lat:23.0225,lon:72.5714,tz:5.5},
    {n:"Pune, IN",lat:18.5204,lon:73.8567,tz:5.5},
    {n:"Jaipur, IN",lat:26.9124,lon:75.7873,tz:5.5},
    {n:"Lucknow, IN",lat:26.8467,lon:80.9462,tz:5.5},
    {n:"Varanasi, IN",lat:25.3176,lon:82.9739,tz:5.5},
    {n:"Kathmandu, NP",lat:27.7172,lon:85.3240,tz:5.75},
    {n:"Colombo, LK",lat:6.9271,lon:79.8612,tz:5.5},
    {n:"Karachi, PK",lat:24.8607,lon:67.0011,tz:5},
    {n:"Dhaka, BD",lat:23.8103,lon:90.4125,tz:6},
    {n:"Singapore, SG",lat:1.3521,lon:103.8198,tz:8},
    {n:"Kuala Lumpur, MY",lat:3.1390,lon:101.6869,tz:8},
    {n:"Hong Kong, HK",lat:22.3193,lon:114.1694,tz:8},
    {n:"Tokyo, JP",lat:35.6762,lon:139.6503,tz:9},
    {n:"London, GB",lat:51.5074,lon:-0.1278,tz:0},
    {n:"New York, US",lat:40.7128,lon:-74.0060,tz:-5},
    {n:"Chicago, US",lat:41.8781,lon:-87.6298,tz:-6},
    {n:"Los Angeles, US",lat:34.0522,lon:-118.2437,tz:-8},
    {n:"Toronto, CA",lat:43.6532,lon:-79.3832,tz:-5},
    {n:"Sydney, AU",lat:-33.8688,lon:151.2093,tz:10}
  ];
  function $(id){return document.getElementById(id);}
  var proxyEl=$("k-proxy");
  try{var _sv=localStorage.getItem("kundli_proxy"); if(_sv&&proxyEl) proxyEl.value=_sv;}catch(e){}
  if(proxyEl) proxyEl.addEventListener("change",function(){try{localStorage.setItem("kundli_proxy",(proxyEl.value||"").trim());}catch(e){}});
  function endpoint(){return (proxyEl&&proxyEl.value&&proxyEl.value.trim())||API;}
  /* The short city list, published for the motion pane. With no chart cast there
     is nothing to take a place from, and sunrise, the lagna and the Hindu date all
     need one; this is the same list the form offers, not a second one that could
     drift from it. */
  window.__kcities=CITIES.filter(function(c){ return c.lat!=null; });

  /* "Watch the sky" — the motion pane with no chart behind it. The same pane and
     the same scenes; it simply renders in the state where MO.J is null, which the
     pane now treats as valid rather than as a reason to draw nothing. */
  var SKY_OPEN="Watch the sky \u2014 no birth data needed";
  (function(){
    var btn=$("k-skygo"), host=$("k-skyout");
    if(!btn||!host) return;
    btn.addEventListener("click",function(){
      if(host.innerHTML){ host.innerHTML=""; btn.textContent=SKY_OPEN; return; }
      try{
        host.innerHTML='<div class="kreport"><div class="kpane" data-kpane="motion">'+
                       window.motionPane(null,null)+'</div></div>';
        if(window.__moMount) window.__moMount();
        btn.textContent="Hide the sky";
        host.scrollIntoView({behavior:"smooth",block:"start"});
      }catch(e){
        host.innerHTML='<p class="k-note">The animations could not start: '+
                       String(e&&e.message||e)+'</p>';
      }
    });
  })();

  var citySel=$("k-city");
  CITIES.forEach(function(c,i){var o=document.createElement("option");o.value=i;o.textContent=c.n;citySel.appendChild(o);});
  citySel.addEventListener("change",function(){var c=CITIES[+citySel.value]; if(c&&c.lat!=null){$("k-lat").value=c.lat;$("k-lon").value=c.lon;$("k-tz").value=c.tz;window.__kplace=c.n;}});
  var sb=$("k-searchbtn"); if(sb) sb.addEventListener("click",citySearch);
  var si=$("k-search");
  if(si){ si.addEventListener("keydown",function(e){ if(e.key==="Enter"){ e.preventDefault(); citySearch(); } }); }
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;"})[c];});}
  // --- offline city search (local cities.json; no third-party service) ---
  function tzOffsetHours(tz, when){
    try{
      var dtf=new Intl.DateTimeFormat("en-US",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",
        day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
      var p={}; dtf.formatToParts(when).forEach(function(x){p[x.type]=x.value;});
      var asUTC=Date.UTC(+p.year,+p.month-1,+p.day,(+p.hour)%24,+p.minute,+p.second);
      return Math.round((asUTC-when.getTime())/36000)/100;
    }catch(e){ return null; }
  }
  function offsetForBirth(tz,dob,tob){
    dob=dob||$("k-dob").value; tob=tob||$("k-tob").value||"12:00";
    if(!dob||!tz) return null;
    var d=dob.split("-"), t=tob.split(":");
    // approximate the instant as UTC, then refine once with the resulting offset
    var guess=new Date(Date.UTC(+d[0],+d[1]-1,+d[2],+t[0],+t[1]));
    var o1=tzOffsetHours(tz,guess); if(o1==null) return null;
    var refined=new Date(guess.getTime()-o1*3600000);
    var o2=tzOffsetHours(tz,refined);
    return (o2==null?o1:o2);
  }
  function showResults(html){ $("k-results").innerHTML=html; }
  // --- offline city search: loads ./cities.json once, then searches locally ---
  var CITYDB=null, CITYLOADING=null;
  function foldStr(s){ return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(); }
  function loadCities(){
    if(CITYDB) return Promise.resolve(CITYDB);
    if(CITYLOADING) return CITYLOADING;
    /* Two ways in, and the second is the one that matters for a local copy.
       fetch() is blocked on file:// — the page's origin is "null" and the browser
       refuses the read — so a copy opened straight from Finder could never load
       the city list, however correctly it sat beside the page. A <script> tag is
       not subject to that rule. So: try fetch first, because over http it is the
       cheaper path and needs no global; fall back to loading cities.js, which
       assigns the same data to window.__CITIES. Both files hold the same rows. */
    CITYLOADING=fetch("cities.json").then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status);
      return r.json();
    }).catch(function(){ return loadCitiesByScript(); }).then(function(d){
      d.c.forEach(function(row){ row[8]=foldStr(row[0]); });
      CITYDB=d; return d;
    });
    return CITYLOADING;
  }
  function loadCitiesByScript(){
    return new Promise(function(res,rej){
      if(window.__CITIES) return res(window.__CITIES);
      var s=document.createElement("script");
      s.src="cities.js";
      s.onload=function(){ window.__CITIES?res(window.__CITIES)
                                           :rej(new Error("cities.js loaded but held no data")); };
      s.onerror=function(){ rej(new Error("neither cities.json nor cities.js could be read")); };
      document.head.appendChild(s);
    });
  }
  function searchCities(db,q,limit){
    var f=foldStr(q); if(f.length<2) return [];
    var exact=[],prefix=[],sub=[],alias=[];
    for(var i=0;i<db.c.length;i++){
      var r=db.c[i], n=r[8];
      if(n===f){ exact.push(i); }
      else if(n.indexOf(f)===0){ prefix.push(i); }
      else if(n.indexOf(f)>0){ sub.push(i); }
      else {
        var al=r[7];
        for(var j=0;j<al.length;j++){ if(al[j]===f||al[j].indexOf(f)===0){ alias.push(i); break; } }
      }
      if(exact.length+prefix.length>limit*3 && i>4000) break;   // rows are population-ordered
    }
    return exact.concat(prefix,alias,sub).slice(0,limit);
  }
  function cityLabel(db,r){
    var parts=[r[0]]; var a=db.adm[r[5]]; if(a) parts.push(a);
    parts.push(db.ccn[r[4]]||db.cc[r[4]]);
    return parts.join(", ");
  }
  async function citySearch(){
    var q=($("k-search").value||"").trim();
    if(q.length<2){ showResults('<div class="k-rmsg">Type at least two letters.</div>'); return; }
    showResults('<div class="k-rmsg">Searching…</div>');
    try{
      var db=await loadCities();
      var hits=searchCities(db,q,8);
      if(!hits.length){
        showResults('<div class="k-rmsg">No match for “'+esc(q)+'”. Try a different spelling, a nearby larger town, '+
          'or enter coordinates manually below.</div>'); return;
      }
      var h="";
      hits.forEach(function(ix,pos){
        var r=db.c[ix];
        h+='<button type="button" data-i="'+pos+'"><b>'+esc(cityLabel(db,r))+'</b><span>'+
           r[1].toFixed(4)+'°, '+r[2].toFixed(4)+'° · '+esc(db.tz[r[3]])+'</span></button>';
      });
      showResults(h);
      window.__kgeo=hits.map(function(ix){ var r=db.c[ix];
        return {name:r[0],admin1:db.adm[r[5]],country:db.ccn[r[4]],latitude:r[1],longitude:r[2],timezone:db.tz[r[3]],
                label:cityLabel(db,r)}; });
    }catch(e){
      showResults('<div class="k-rmsg">The city list could not be loaded ('+esc(e.message)+
        '). Make sure <code class="k-inline">cities.json</code> and <code class="k-inline">cities.js</code> sit beside this page, or enter the coordinates by hand below.</div>');
    }
  }
  document.addEventListener("click",function(ev){
    var b=ev.target.closest?ev.target.closest("#k-results button"):null;
    if(!b||!window.__kgeo)return;
    var x=window.__kgeo[+b.getAttribute("data-i")]; if(!x)return;
    $("k-lat").value=x.latitude.toFixed(6); $("k-lon").value=x.longitude.toFixed(6);
    window.__ktz=x.timezone||null;
    var off=x.timezone?offsetForBirth(x.timezone):null;
    var msg="";
    if(off!=null){ $("k-tz").value=off; msg="Set to "+[x.name,x.country].filter(Boolean).join(", ")+
        " — UTC"+(off>=0?"+":"")+off+" for that date."; }
    else if(x.timezone){ msg="Coordinates set for "+esc(x.name)+". The UTC offset depends on the "+
        "birth date — enter the date and it will be filled in."; }
    else { msg="Coordinates set for "+esc(x.name)+". Please check the UTC offset yourself."; }
    window.__kplace=x.label||[x.name,x.admin1,x.country].filter(Boolean).join(", ");
    if($("k-searchnote")) $("k-searchnote").textContent=msg;
    var sel=document.getElementById("k-city"); if(sel) sel.value="1";
    showResults("");
  });
  function card(lab,val,sub){return '<div class="k-card"><div class="lab">'+esc(lab)+'</div><div class="val">'+val+'</div>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div>';}
  function nakLink(name,pada){ if(!name) return "&mdash;"; return '<a href="108-nakshatra-padas.html#q='+encodeURIComponent(name)+'">'+esc(name)+" &middot; "+(pada||"?")+"</a>"; }
  var NAKS=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  function rashiName(r){ if(r==null) return "?"; if(typeof r==="string") return r; return r.enName||r.saName||r.iast||r.sa||"?"; }
  function nakInfo(deg,padaFallback){ if(deg==null) return {name:null,pada:padaFallback}; var seg=40/3, x=(((deg%360)+360)%360), i=Math.floor(x/seg); if(i>26)i=26; var pada=Math.floor((x-i*seg)/(seg/4))+1; return {name:NAKS[i], pada:padaFallback||pada}; }
  function scalars(o){var out=[]; if(o&&typeof o==="object"){for(var k in o){var v=o[k]; if(v==null||typeof v==="object")continue; out.push("<b>"+esc(k)+":</b> "+esc(v));}} return out.join(" &middot; ");}
  function render(d){
    var html="";
    try{ html=window.buildKundliReport(d); }
    catch(err){ html='<div class="k-err">The chart came back, but the report could not be rendered: '+esc(err.message)+'. The full data is in the raw response below.</div>'; }
    $("k-out").innerHTML='<h3 id="k-result">Computed chart</h3>'+html;
    try{
      var _D=null;
      // rebuild the derived layer and attach it so the saved JSON is self-contained
      d.derived=(function(){
        var out={};
        try{
          var Dx=(window.__deriveForExport? window.__deriveForExport(d) : null);
          if(Dx) out=Dx;
        }catch(e){}
        return out;
      })();
    }catch(e){}
    $("k-raw").textContent=JSON.stringify(d,null,2); $("k-rawwrap").style.display="";
    window.__kdata=d;
    /* A fresh report opens on the first tab; initReport's showTab overrides this when a
       link or the back button asked for a particular one. Set it before, not after —
       initReport consumes pendingTab. */
    currentTab="overview";
    initReport();
    ["k-print","k-dl","k-save","k-link"].forEach(function(id){
      var b=$(id); if(b) b.style.display=""; });
    /* Leave the birth particulars where the reference pages can find them — about
       250 bytes, no chart data, recomputed there in milliseconds. This browser
       only; the "Forget this chart" button on those pages clears it. */
    try{ localStorage.setItem("nirayana.birth",JSON.stringify({
      year:+($("k-dob").value||"").slice(0,4),
      month:+($("k-dob").value||"").slice(5,7), day:+($("k-dob").value||"").slice(8,10),
      hour:+($("k-tob").value||"").slice(0,2), minute:+($("k-tob").value||"").slice(3,5),
      lat:+$("k-lat").value, lon:+$("k-lon").value, tzHours:+$("k-tz").value,
      ayanamsa:($("k-ayan")&&$("k-ayan").value)||"lahiri",
      node:($("k-node")&&$("k-node").value)||"mean",
      name:($("k-name")&&$("k-name").value||"").trim()||null })); }catch(e){}
    try{ chipFill(); }catch(e){}
    try{ writeHash(true); hashReady=true; }catch(e){}
    var r=$("k-chip")&&!$("k-chip").hidden ? $("k-chip") : $("k-result");
    if(r&&r.scrollIntoView) r.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function fail(msg){ $("k-out").innerHTML='<div class="k-err">'+msg+"</div>"; }
  async function cast(){
    var dob=$("k-dob").value, tob=$("k-tob").value;
    var lat=parseFloat($("k-lat").value), lon=parseFloat($("k-lon").value), tz=parseFloat($("k-tz").value);
    if(!dob||!tob){ fail("Please enter both a date and a time of birth."); return; }
    if(isNaN(lat)||isNaN(lon)||isNaN(tz)){ fail("Please pick a city, or enter latitude, longitude and UTC offset."); return; }
    var dp=dob.split("-"), tp=tob.split(":");
    var nm=($("k-name")&&$("k-name").value||"").trim();
    window.__kname=nm;
    var ayan=($("k-ayan")&&$("k-ayan").value)||"lahiri";
    var body={year:+dp[0],month:+dp[1],day:+dp[2],hour:+tp[0],minute:+tp[1],lat:lat,lon:lon,tzHours:tz,
              ayanamsa:ayan, node:(($("k-node")&&$("k-node").value)||"mean")};
    if(nm) body.name=nm;
    var src=($("k-src")&&$("k-src").value)||"local";
    if(src==="local"){
      $("k-go").disabled=true; $("k-status").textContent="Computing\u2026"; $("k-out").innerHTML="";
      try{ var local=window.buildLocalChart(body); $("k-status").textContent=""; render(local); }
      catch(err){ $("k-status").textContent=""; fail("<b>The built-in engine failed.</b> "+esc(err.message)); }
      $("k-go").disabled=false; return;
    }
    $("k-go").disabled=true; $("k-status").textContent="Contacting the engine\u2026"; $("k-out").innerHTML="";
    try{
      var res=await fetch(endpoint(),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok){ var t=await res.text(); var er=new Error("HTTP "+res.status+" "+t.slice(0,200));
        er.httpStatus=res.status; er.body=t; throw er; }
      var data=await res.json();
      // the remote engine supplies neither Shadbala nor Bhayāta — compute them locally from the same birth data,
      // and record how far the two sources differ on positions
      try{
        var loc=window.buildLocalChart(body);
        if(!data.shadbala) data.shadbala=loc.shadbala;
        if(!data.bhayat)   data.bhayat=loc.bhayat;
        var worst=0,worstName="";
        (data.grahas||[]).forEach(function(g){
          var m=(loc.grahas||[]).filter(function(x){return x.key===g.key;})[0];
          if(!m)return; var d=Math.abs(((m.sidereal_deg-g.sidereal_deg+180)%360+360)%360-180)*3600;
          if(d>worst){worst=d;worstName=g.key;}
        });
        data.__crosscheck={max_arcsec:worst,graha:worstName,
          lagna_arcsec:Math.abs(((loc.lagna.sidereal_deg-data.lagna.sidereal_deg+180)%360+360)%360-180)*3600};
      }catch(e){}
      $("k-status").textContent=""; render(data);
    }catch(e){
      $("k-status").textContent="";
      var st=e.httpStatus||0, body=(e.body||"");
      var msg;
      if(st===429){
        var reset=(body.match(/"reset"\s*:\s*"([^"]+)"/)||[])[1];
        msg="<b>Rate limited by the engine (HTTP 429).</b> Too many requests from this proxy in the current window."+
            (reset?" It resets at "+esc(reset)+".":" Wait for the window to reset, then try again.");
      } else if(st===402||st===403){
        msg="<b>The chart engine is currently unavailable (HTTP "+st+").</b> This is on the engine's side, not your "+
            "setup — your proxy reached it and relayed its reply. A 402 with <code class=\"k-inline\">DEPLOYMENT_DISABLED</code> "+
            "usually means that service's own hosting is switched off. Switch the chart source back to the built-in engine, "+
            "which computes everything locally and needs no network. "+
            "";
      } else if(st>=500){
        msg="<b>The chart engine returned a server error (HTTP "+st+").</b> That is on the engine's side — your proxy "+
            "reached it. Try again shortly; no change is needed here.";
      } else if(st>0){
        msg="<b>The engine rejected the request (HTTP "+st+").</b> Check the birth details, especially the date, "+
            "time and the UTC offset.";
      } else {
        msg="<b>Could not reach the engine.</b> The request never completed, so either your proxy is unreachable or "+
            "the network blocked it. Switch the chart source back to the built-in engine, which needs no network.";
      }
      fail(msg+'<div class="k-errdet">Technical detail: '+esc(e.message)+"</div>");
    }
    $("k-go").disabled=false;
  }
  $("k-go").addEventListener("click",cast);

  /* ------------------------------------------------------------------ here & now ---
     Geolocation hands back a latitude and a longitude and nothing else: no timezone,
     no place name. Both are found without any external service — the offset from the
     device's own clock, which is exactly right for a chart cast where the device is,
     and the town from the city list this page already carries. */
  function nowParts(){
    var d=new Date();
    var pad=function(n){ return String(n).padStart(2,"0"); };
    return {
      date: d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()),
      time: pad(d.getHours())+":"+pad(d.getMinutes()),
      tz: -d.getTimezoneOffset()/60,
      zone: (function(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||""; }
                         catch(e){ return ""; } })()
    };
  }
  function setNow(){
    var n=nowParts();
    $("k-dob").value=n.date; $("k-tob").value=n.time;
    return n;
  }
  /* nearest city by great-circle distance — 44,000 rows is a few milliseconds */
  function nearestCity(db,lat,lon){
    var best=null, bd=Infinity, R=6371, D=Math.PI/180;
    var la1=lat*D, cla1=Math.cos(la1), sla1=Math.sin(la1);
    for(var i=0;i<db.c.length;i++){
      var r=db.c[i], dla=(r[1]-lat), dlo=(r[2]-lon);
      if(dla>8||dla<-8) continue;                       // cheap reject before the trigonometry
      if(dlo>12||dlo<-12){ if(Math.abs(Math.abs(dlo)-360)>12) continue; }
      var la2=r[1]*D;
      var c=sla1*Math.sin(la2)+cla1*Math.cos(la2)*Math.cos((r[2]-lon)*D);
      var d=Math.acos(Math.max(-1,Math.min(1,c)))*R;
      if(d<bd){ bd=d; best=r; }
    }
    return best?{row:best,km:bd}:null;
  }
  function hereNote(msg,bad){
    var el=$("k-herenote"); if(!el) return;
    el.innerHTML=msg;
    el.style.color=bad?"#a1493a":"";
    el.style.fontWeight=bad?"600":"";
  }
  var GEO_DONE=true, GEO_WATCH=null;
  function geoSettle(){
    if(GEO_DONE) return false;
    GEO_DONE=true;
    if(GEO_WATCH){ clearTimeout(GEO_WATCH); GEO_WATCH=null; }
    return true;
  }
  function geoFail(e){
    if(!geoSettle()) return;
    var msg;
    if(e&&e.code===1) msg="<b>Permission refused.</b> The browser was not allowed to share this "+
      "device&rsquo;s position. Allow location for this site in your browser settings, or use the city "+
      "search above.";
    else if(e&&e.code===2) msg="<b>No position available.</b> The device could not work out where it "+
      "is — this is common indoors on a desktop with no Wi-Fi positioning. Use the city search above.";
    else if(e&&e.code===3) msg="<b>Timed out.</b> The device took too long to find a position. Try "+
      "again, or use the city search above.";
    else msg="<b>Could not get a position.</b> "+esc((e&&e.message)||"Unknown error")+
      " Use the city search above.";
    hereNote(msg,true);
    $("k-here").disabled=false; $("k-here").textContent="Here & now";
  }
  async function hereAndNow(){
    var btn=$("k-here");
    if(!navigator.geolocation){
      hereNote("<b>This browser has no location service.</b> Use the city search above.",true); return; }
    if(!window.isSecureContext){
      hereNote("<b>This page is not running over https,</b> so the browser will not share a position. "+
        "Open the site at its https address — from a file on disk this cannot work. The city search "+
        "above does the same job by hand.",true); return; }
    btn.disabled=true; btn.textContent="Locating…";
    hereNote("Asking the browser where this device is… if nothing happens, look for a permission "+
      "prompt at the top of the window.");
    GEO_DONE=false;
    /* The timeout in the options below only begins once permission has been granted, so a prompt
       that is dismissed rather than answered — a swipe-away on a phone — leaves both callbacks
       unfired and the button stuck on "Locating". This watchdog is the only thing that catches it. */
    if(GEO_WATCH) clearTimeout(GEO_WATCH);
    GEO_WATCH=setTimeout(function(){
      if(!geoSettle()) return;
      hereNote("<b>No answer from the browser.</b> The permission prompt may have been dismissed "+
        "without choosing. Try again and answer the prompt, allow location for this site in your "+
        "browser settings, or use the city search above.",true);
      btn.disabled=false; btn.textContent="Here & now";
    },20000);
    navigator.geolocation.getCurrentPosition(async function(pos){
      if(!geoSettle()) return;
      try{
        var lat=pos.coords.latitude, lon=pos.coords.longitude, acc=pos.coords.accuracy;
        var n=setNow();
        $("k-lat").value=lat.toFixed(4); $("k-lon").value=lon.toFixed(4); $("k-tz").value=n.tz;
        var place=null, db=null;
        try{ db=await loadCities(); place=nearestCity(db,lat,lon); }catch(e){}
        var label = place ? cityLabel(db,place.row) : (lat.toFixed(3)+"°, "+lon.toFixed(3)+"°");
        window.__kplace = label + (place && place.km>25 ? " (nearest town)" : "");
        /* The offset should belong to the PLACE, not to the device. A phone carried across a
           border keeps its old timezone, and using that would move the lagna by a sign or more.
           So the zone of the nearest town decides, and any disagreement is said out loud. */
        var zoneName=(place&&db)?db.tz[place.row[3]]:null, placeOff=null;
        if(zoneName){ try{ placeOff=tzOffsetHours(zoneName,new Date()); }catch(e){} }
        var used = (placeOff!=null) ? placeOff : n.tz;
        $("k-tz").value=used;
        var warn="";
        if(placeOff!=null && Math.abs(placeOff-n.tz)>0.01){
          warn=" <b>This device&rsquo;s clock is set to UTC"+(n.tz>=0?"+":"")+n.tz+
            ", but "+esc(zoneName)+" is on UTC"+(used>=0?"+":"")+used+" right now, so the chart uses "+
            "the latter &mdash; the offset of the place you are in. If the device is right and the "+
            "position is wrong, change the offset above.</b>";
          /* the wall-clock reading must follow the offset actually used */
          var nowMs=Date.now()+used*3600000, dd=new Date(nowMs);
          var pad=function(x){ return String(x).padStart(2,"0"); };
          $("k-dob").value=dd.getUTCFullYear()+"-"+pad(dd.getUTCMonth()+1)+"-"+pad(dd.getUTCDate());
          $("k-tob").value=pad(dd.getUTCHours())+":"+pad(dd.getUTCMinutes());
        }
        hereNote("Cast for <b>"+esc(label)+"</b>"+
          (place?(place.km<2?"":" — about "+Math.round(place.km)+" km away"):"")+
          ", at "+$("k-tob").value+" on "+$("k-dob").value+", UTC"+(used>=0?"+":"")+used+
          (zoneName?(" ("+esc(zoneName)+")"):"")+
          ". Position accurate to about "+Math.round(acc||0)+" m, far finer than a chart needs."+
          warn, false);
        btn.disabled=false; btn.textContent="Here & now";
        var sel=document.getElementById("k-city"); if(sel) sel.value="1";
        cast();
      }catch(err){ geoFail(err); }
    }, geoFail, {enableHighAccuracy:false, timeout:12000, maximumAge:60000});
  }
  $("k-here").addEventListener("click",hereAndNow);
  $("k-now").addEventListener("click",function(){
    var n=setNow();
    hereNote("Date and time set to now — "+n.time+" on "+n.date+", UTC"+(n.tz>=0?"+":"")+n.tz+
      (n.zone?(" ("+esc(n.zone)+")"):"")+". The place is unchanged; set it above if you have not yet.");
  });

  $("k-clear").addEventListener("click",function(){
    ["k-dob","k-tob","k-lat","k-lon","k-tz"].forEach(function(id){$(id).value="";});
    citySel.value="0";$("k-out").innerHTML="";$("k-status").textContent="";$("k-rawwrap").style.display="none";
    /* Clearing removes the chart, so the chip must go with it — otherwise it keeps
       naming a chart that is no longer on the page — and the fragment with it, or a
       refresh would bring the cleared chart straight back. */
    window.__kdata=null; window.__kplace=null;
    var chip=$("k-chip"); if(chip) chip.hidden=true;
    var n=$("k-chipnote"); if(n) n.hidden=true;
    document.body.classList.remove("kcast","kedit");
    ["k-print","k-dl","k-save","k-link"].forEach(function(id){
      var b=$(id); if(b) b.style.display="none"; });
    lastHash="";
    if(location.hash){ try{ history.replaceState(null,"",location.pathname+location.search); }
                       catch(e){ try{ location.hash=""; }catch(e2){} } }
  });
  document.addEventListener("click",function(ev){
    var t=ev.target; if(!t||t.id!=="k-depth")return;
    var rep=document.getElementById("kreport"); if(!rep)return;
    var on=rep.classList.toggle("kdetail");
    t.textContent = on ? "Show brief analysis" : "Show detailed analysis";
    t.setAttribute("aria-pressed", on?"true":"false");
  });
  var pbtn=$("k-print");
  if(pbtn) pbtn.addEventListener("click",function(){
    var rep=document.getElementById("kreport"); if(rep) rep.classList.add("kdetail");
    window.print();
  });
  var dbtn=$("k-dl");
  if(dbtn) dbtn.addEventListener("click",function(){
    if(!window.__kdata) return;
    try{
      var nm=(window.__kname||"kundli").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase();
      var blob=new Blob([JSON.stringify(window.__kdata,null,2)],{type:"application/json"});
      var u=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=u; a.download=nm+"-chart.json"; document.body.appendChild(a); a.click();
      document.body.removeChild(a); setTimeout(function(){URL.revokeObjectURL(u);},1000);
    }catch(e){ alert("Could not download: "+e.message); }
  });
  document.addEventListener("click",function(ev){
    var b=ev.target&&ev.target.closest?ev.target.closest("[data-kdt]"):null; if(!b)return;
    var act=b.getAttribute("data-kdt"), all=document.querySelectorAll(".kreport details.kdt-md, .kreport details.kdt-ad");
    if(act==="open") all.forEach(function(d){d.open=true;});
    else if(act==="close") all.forEach(function(d){d.open=false;});
    else { all.forEach(function(d){d.open=d.classList.contains("kdt-cur");});
      var c=document.querySelector(".kreport details.kdt-ad.kdt-cur")||document.querySelector(".kreport details.kdt-md.kdt-cur");
      if(c&&c.scrollIntoView) c.scrollIntoView({behavior:"smooth",block:"center"}); }
  });
  var copyBtn=$("k-copy"), copyMsg=$("k-copymsg");
  if(copyBtn) copyBtn.addEventListener("click",async function(){
    var txt=($("k-raw").textContent)||""; if(!txt){ if(copyMsg)copyMsg.textContent="Nothing to copy yet."; return; }
    var done=false;
    try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(txt); done=true; } }catch(e){}
    if(!done){ try{ var ta=document.createElement("textarea"); ta.value=txt; ta.style.position="fixed"; ta.style.top="0"; ta.style.opacity="0"; document.body.appendChild(ta); ta.focus(); ta.select(); done=document.execCommand("copy"); document.body.removeChild(ta); }catch(e2){} }
    if(copyMsg){ copyMsg.textContent = done ? "Copied to clipboard." : "Couldn\u2019t copy \u2014 select the text and press Ctrl/Cmd+C."; setTimeout(function(){ copyMsg.textContent=""; }, 3000); }
  });

  /* ---------- report tabs and interactive panes ---------- */
  var pendingTab=null, currentTab="overview";
  function rep(){ return document.getElementById("kreport"); }
  function showTab(name,scroll){
    var r=rep(); if(!r) return;
    /* Resolve the name before touching anything. A link or a bookmark can name a tab
       that no longer exists, and clearing the selection first would leave the report
       with no tab lit and whichever pane happened to be open. Fall back to the first. */
    var all=[].slice.call(r.querySelectorAll("[data-ktab]"));
    if(!all.length) return;
    if(!all.some(function(b){ return b.getAttribute("data-ktab")===name; }))
      name=all[0].getAttribute("data-ktab");
    all.forEach(function(b){ var on=b.getAttribute("data-ktab")===name;
      b.classList.toggle("on",on); b.setAttribute("aria-selected",on?"true":"false"); b.tabIndex=on?0:-1; });
    r.querySelectorAll(".kpane").forEach(function(p){ p.hidden=p.getAttribute("data-kpane")!==name; });
    currentTab=name;
    /* On a phone the tab list is a sheet rather than a strip: close it on a choice and
       keep the trigger showing where you are. */
    var lst=r.querySelector(".ktabs"); if(lst) lst.classList.remove("open");
    var sel=r.querySelector(".ktabsel");
    if(sel){ var b=r.querySelector('[data-ktab="'+name+'"]');
      sel.setAttribute("aria-expanded","false");
      if(b) sel.querySelector(".ktabselt").textContent=b.textContent.trim(); }
    if(hashReady) writeHash(false);
    if(scroll){ var w=r.querySelector(".ktabwrap")||lst;
      if(w&&w.scrollIntoView) w.scrollIntoView({behavior:"smooth",block:"start"}); }
  }
  /* ---- save and reopen a chart ----
     The chart is a pure function of the birth data and the two conventions, so a
     saved file needs nothing else: the engine reproduces the rest in milliseconds.
     About 250 bytes against 160 KB for a full export. A version field lets a future
     format be rejected rather than misread, and `place` is only there so the files
     are tellable apart by eye. */
  function saveMini(){
    var d=($("k-dob").value||"").split("-"), tp=($("k-tob").value||"").split(":");
    if(d.length!==3||tp.length<2){ alert("Enter a date and time first."); return; }
    /* `learnhoro` is the file-format marker, not branding. It stays spelled this
       way through any rename: change it and every chart already saved to disk
       stops opening. applyChart() below reads the same key. */
    var mini={learnhoro:1, name:($("k-name").value||"").trim()||null,
      year:+d[0], month:+d[1], day:+d[2], hour:+tp[0], minute:+tp[1],
      lat:+$("k-lat").value, lon:+$("k-lon").value, tzHours:+$("k-tz").value,
      place:(function(){   /* the searched city if there was one, else the dropdown choice */
        if(window.__kplace) return String(window.__kplace).trim();
        var s=$("k-city");
        if(s&&s.selectedIndex>1&&s.options[s.selectedIndex]) return s.options[s.selectedIndex].text.trim();
        var q=$("k-search"); return (q&&q.value||"").trim()||null;
      })(),
      ayanamsa:($("k-ayan")&&$("k-ayan").value)||"lahiri",
      node:($("k-node")&&$("k-node").value)||"mean"};
    var blob=new Blob([JSON.stringify(mini,null,1)],{type:"application/json"});
    var u=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=u; a.download=((mini.name||"chart").replace(/[^\w\- ]+/g,"").replace(/\s+/g,"-")
      .toLowerCase()||"chart")+".{{BRAND_SLUG}}.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(u);},1000);
  }
  /* Accepts either a saved mini file or a full export — the big one carries the same
     fields in `input`, so every JSON already downloaded remains openable. */
  function applyChart(o){
    var i=(o&&o.learnhoro)?o:(o&&o.input);
    if(!i||i.year==null||i.lat==null){ alert("That does not look like a {{BRAND}} chart file."); return false; }
    $("k-name").value=i.name||"";
    $("k-dob").value=i.year+"-"+String(i.month).padStart(2,"0")+"-"+String(i.day).padStart(2,"0");
    $("k-tob").value=String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0");
    $("k-lat").value=i.lat; $("k-lon").value=i.lon; $("k-tz").value=i.tzHours;
    if($("k-ayan")&&i.ayanamsa) $("k-ayan").value=i.ayanamsa;
    if($("k-node")&&i.node) $("k-node").value=i.node;
    if($("k-city")&&(i.place||o.place)) $("k-city").textContent=i.place||o.place;
    return true;
  }
  function openSaved(ev){
    var f=ev.target.files&&ev.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(){
      var o=null;
      try{ o=JSON.parse(r.result); }catch(e){ alert("That file is not valid JSON."); return; }
      if(o&&o.learnhoro&&o.learnhoro>1){
        alert("That file was saved by a newer version of {{BRAND}}."); return; }
      if(applyChart(o)) $("k-go").click();
    };
    r.onerror=function(){ alert("The file could not be read."); };
    r.readAsText(f);
    ev.target.value="";
  }
  /* The UTC offset depends on the date, because of historical daylight saving. A
     city picked before the date was entered leaves it blank; fill it in as soon as
     the date arrives rather than failing with "please pick a city". */
  ["k-dob","k-tob"].forEach(function(id){
    var el=$(id); if(!el) return;
    el.addEventListener("change",function(){
      if(!window.__ktz || $("k-tz").value!=="") return;
      var off=offsetForBirth(window.__ktz);
      if(off!=null){ $("k-tz").value=off;
        if($("k-searchnote")) $("k-searchnote").textContent=
          "UTC"+(off>=0?"+":"")+off+" applied for that date."; }
    });
  });
  if($("k-save")) $("k-save").addEventListener("click",saveMini);
  if($("k-open")) $("k-open").addEventListener("click",function(){ $("k-openfile").click(); });
  if($("k-openfile")) $("k-openfile").addEventListener("change",openSaved);

  /* ---------- the chart chip ----------
     The form is only interesting until the chart exists. Once it does, it folds into
     one line and the report starts at the top of the screen rather than below a form
     you have finished with. Edit brings it back; casting again folds it away. */
  /* __kplace is set by both routes that name a place — the city search and the short
     list. The select itself is not a source: it carries a placeholder at index 0, and
     the search path parks its value on an unrelated row without firing change, so its
     visible text does not describe the coordinates in the form. Coordinates are the
     honest fallback. */
  function placeLabel(){
    if(window.__kplace) return String(window.__kplace).trim();
    var la=$("k-lat").value, lo=$("k-lon").value;
    if(la!==""&&lo!==""&&!isNaN(+la)&&!isNaN(+lo))
      return (+la).toFixed(3)+"°, "+(+lo).toFixed(3)+"°";
    return "";
  }
  var MONS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  function prettyWhen(){
    var d=($("k-dob").value||"").split("-"), t=$("k-tob").value||"";
    if(d.length!==3) return "";
    return (+d[2])+" "+MONS[(+d[1])-1]+" "+d[0]+", "+t;
  }
  function chipFill(){
    var chip=$("k-chip"); if(!chip) return;
    var nm=($("k-name")&&$("k-name").value||"").trim();
    var pl=placeLabel(), tz=$("k-tz").value;
    $("k-chipwho").innerHTML = nm ? esc(nm) : '<span class="kmut">Chart</span>';
    $("k-chipwhen").innerHTML = esc(prettyWhen())+
      (pl?(' <span class="kdot">·</span> '+esc(pl)):"")+
      (tz!==""?(' <span class="kmut">UTC'+(+tz>=0?"+":"")+(+tz)+'</span>'):"");
    /* The output buttons belong with the chart, not with the form that produced it. */
    var acts=$("k-chipacts");
    ["k-print","k-dl","k-save","k-link"].forEach(function(id){
      var b=$(id); if(b&&b.parentNode!==acts) acts.appendChild(b); });
    chip.hidden=false;
    document.body.classList.add("kcast");
    document.body.classList.remove("kedit");
    /* Close the no-chart sky panel. It was built in the state where MO.J is null,
       so it would keep nine scenes locked against a chart that now exists — and,
       worse, a second #mocanvas would sit on the page, which breaks every lookup
       by id for both panes. The chart report has its own Motion tab with nothing
       locked, so there is nothing to keep open. */
    var sky=$("k-skyout"), skyb=$("k-skygo");
    if(sky && sky.innerHTML){ sky.innerHTML=""; if(skyb) skyb.textContent=SKY_OPEN; }
  }
  function chipEdit(){
    document.body.classList.add("kedit");
    var f=$("k-inputs"); if(f&&f.scrollIntoView) f.scrollIntoView({behavior:"smooth",block:"start"});
    var n=$("k-dob"); if(n&&n.focus) try{ n.focus({preventScroll:true}); }catch(e){ }
  }
  if($("k-edit")) $("k-edit").addEventListener("click",chipEdit);

  /* ---------- the chart in the URL ----------
     A fragment is never sent in an HTTP request, so a link that carries a chart still
     reaches no server — the page rebuilds it from the engine already in the browser.
     That keeps back, forward, refresh and bookmarking working without weakening the
     claim that nothing leaves this machine. What a link does do is carry the birth
     data to whoever you send it to, which is why the Copy link button says so. */
  var lastHash="", hashReady=false;
  function chartKey(){
    return [$("k-dob").value,$("k-tob").value,$("k-lat").value,$("k-lon").value,$("k-tz").value,
      ($("k-ayan")&&$("k-ayan").value)||"",($("k-node")&&$("k-node").value)||""].join("|");
  }
  function buildHash(tab){
    var d=($("k-dob").value||"").split("-"), t=($("k-tob").value||"").split(":");
    if(d.length!==3||t.length<2) return "";
    var p=["d="+d[0]+d[1]+d[2], "t="+t[0]+t[1],
           "p="+[$("k-lat").value,$("k-lon").value,$("k-tz").value].join(",")];
    var a=($("k-ayan")&&$("k-ayan").value)||"lahiri"; if(a!=="lahiri") p.push("a="+a);
    var nd=($("k-node")&&$("k-node").value)||"mean";  if(nd!=="mean")  p.push("nd="+nd);
    var nm=($("k-name")&&$("k-name").value||"").trim();
    if(nm) p.push("n="+encodeURIComponent(nm.slice(0,48)));
    /* Only a named place is worth carrying; the coordinate fallback is already in p=. */
    var pl=(window.__kplace||"").trim();
    if(pl) p.push("pl="+encodeURIComponent(pl.slice(0,64)));
    if(tab&&tab!=="overview") p.push("v="+tab);
    return "#"+p.join("&");
  }
  function parseHash(){
    var h=(location.hash||"").replace(/^#/,""); if(!h) return null;
    var o={};
    h.split("&").forEach(function(kv){ var i=kv.indexOf("="); if(i<0) return;
      o[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1).replace(/\+/g," ")); });
    if(!/^\d{8}$/.test(o.d||"")||!/^\d{4}$/.test(o.t||"")||!o.p) return null;
    var p=String(o.p).split(",");
    if(p.length<3||p.some(function(x){ return isNaN(parseFloat(x)); })) return null;
    return {dob:o.d.slice(0,4)+"-"+o.d.slice(4,6)+"-"+o.d.slice(6,8),
            tob:o.t.slice(0,2)+":"+o.t.slice(2,4),
            lat:p[0], lon:p[1], tz:p[2], ayan:o.a||"lahiri", node:o.nd||"mean",
            name:o.n||"", place:o.pl||"", tab:o.v||"overview"};
  }
  /* A cast is a new place in history; changing tab is not — otherwise Back would walk
     backwards through eleven tabs before it left the chart. */
  function writeHash(push){
    var s=buildHash(currentTab); if(!s||s===location.hash) { lastHash=location.hash; return; }
    lastHash=s;
    if(push){ try{ location.hash=s; }catch(e){} return; }
    try{ history.replaceState(null,"",s); }
    catch(e){ try{ location.hash=s; }catch(e2){} }
  }
  function applyHash(o){
    $("k-name").value=o.name||"";
    $("k-dob").value=o.dob; $("k-tob").value=o.tob;
    $("k-lat").value=o.lat; $("k-lon").value=o.lon; $("k-tz").value=o.tz;
    if($("k-ayan")) $("k-ayan").value=o.ayan;
    if($("k-node")) $("k-node").value=o.node;
    if(o.place) window.__kplace=o.place;
  }
  function castFromHash(){
    var o=parseHash(); if(!o) return false;
    applyHash(o); pendingTab=o.tab; lastHash=location.hash;
    var g=$("k-go"); if(g) g.click();
    return true;
  }
  window.addEventListener("hashchange",function(){
    if(location.hash===lastHash) return;          // our own write
    var o=parseHash();
    if(!o){ lastHash=location.hash; return; }
    lastHash=location.hash;
    var before=chartKey();
    applyHash(o);
    if(chartKey()!==before || !window.__kdata){ pendingTab=o.tab; var g=$("k-go"); if(g) g.click(); }
    else showTab(o.tab);
  });
  if($("k-link")) $("k-link").addEventListener("click",async function(){
    var s=buildHash(currentTab); if(!s) return;
    var url=location.href.split("#")[0]+s, done=false;
    try{ if(navigator.clipboard&&navigator.clipboard.writeText){ await navigator.clipboard.writeText(url); done=true; } }catch(e){}
    if(!done){ try{ var ta=document.createElement("textarea"); ta.value=url; ta.style.position="fixed";
      ta.style.opacity="0"; document.body.appendChild(ta); ta.select();
      done=document.execCommand("copy"); document.body.removeChild(ta); }catch(e2){} }
    var n=$("k-chipnote"); if(!n) return;
    n.hidden=false;
    n.innerHTML = done
      ? "Link copied. It rebuilds the chart in whoever opens it — nothing is sent to a server, "+
        "but the birth details are in the link itself, so share it as you would the details."
      : "Couldn’t reach the clipboard. The address bar already holds this chart — copy it from there.";
    clearTimeout(n.__t); n.__t=setTimeout(function(){ n.hidden=true; },9000);
  });

  function initReport(){
    // the sky pane draws itself once the report is in the document
    try{ if(document.getElementById("skycanvas") && window.__skyRedraw) window.__skyRedraw(); }catch(e){}
    try{ if(document.getElementById("swhcanvas") && window.__swhDraw) window.__swhDraw(); }catch(e){}
    try{ if(document.getElementById("mocanvas") && window.__moMount) window.__moMount(); }catch(e){}
    evRender();
    if(pendingTab){ showTab(pendingTab,true); pendingTab=null; }
  }
  /* A link, a bookmark or a refresh arrives as a fragment; rebuild the chart from it.
     Nothing was fetched to do this — the engine is already here.
     Deferred by a tick on purpose: casting touches state declared further down this
     file, and `var` hoisting means those names exist but hold undefined until the
     script finishes. Running inline here failed inside the events layer. */
  setTimeout(function(){
    try{ if(!castFromHash()) hashReady=true; }catch(e){ hashReady=true; }
  },0);

  /* On a narrow screen the eleven tabs are a sheet behind one trigger rather than a
     strip you have to swipe. Close it on Escape or on a click outside. */
  document.addEventListener("click",function(ev){
    var r=rep(); if(!r) return;
    var sel=ev.target.closest&&ev.target.closest(".ktabsel");
    var lst=r.querySelector(".ktabs");
    if(sel&&lst){ var open=!lst.classList.contains("open");
      lst.classList.toggle("open",open); sel.setAttribute("aria-expanded",open?"true":"false");
      if(open){ var on=lst.querySelector("[data-ktab].on"); if(on&&on.focus) on.focus(); }
      ev.preventDefault(); return; }
    if(lst&&lst.classList.contains("open")&&!ev.target.closest(".ktabs")){
      lst.classList.remove("open");
      var s=r.querySelector(".ktabsel"); if(s) s.setAttribute("aria-expanded","false"); }
  },true);
  document.addEventListener("keydown",function(ev){
    if(ev.key!=="Escape") return;
    var r=rep(); if(!r) return;
    var lst=r.querySelector(".ktabs.open"); if(!lst) return;
    lst.classList.remove("open");
    var s=r.querySelector(".ktabsel");
    if(s){ s.setAttribute("aria-expanded","false"); if(s.focus) s.focus(); }
  });

  document.addEventListener("click",function(ev){
    var t=ev.target; if(!t||!t.closest||!rep()||!rep().contains(t)) return;
    var b=t.closest("[data-ktab]"); if(b){ showTab(b.getAttribute("data-ktab")); return; }
    var g=t.closest("[data-ktab-go]"); if(g){ ev.preventDefault(); showTab(g.getAttribute("data-ktab-go"),true); return; }
    var a=t.closest('a[href^="#ks-"]');
    if(a){ var el=document.getElementById(a.getAttribute("href").slice(1)); if(el){ ev.preventDefault(); showTab("full");
      el.scrollIntoView({behavior:"smooth",block:"start"}); } return; }
    var lf=t.closest("[data-klife]");
    if(lf){ var w=lf.getAttribute("data-klife");
      rep().querySelectorAll("[data-klife]").forEach(function(x){ x.classList.toggle("on",x===lf); });
      rep().querySelectorAll("[data-klifev]").forEach(function(v){ v.hidden=v.getAttribute("data-klifev")!==w; }); return; }
    var st=t.closest("[data-kstep-go]"); if(st){ stepGo(st.getAttribute("data-kstep-go")); return; }
    var ip=t.closest("[data-kip]"); if(ip){ pick(ip.getAttribute("data-kip")); return; }
    var sh=t.closest("[data-kshift]"); if(sh){ shiftTime(+sh.getAttribute("data-kshift")); return; }
    var geo=t.closest("[data-kday-geo]"); if(geo){ dayHere(); return; }
    if(t.id==="kev-add"){ evAdd(); return; }
    var dl=t.closest("[data-kev-del]"); if(dl){ var L=evLoad(); L.splice(+dl.getAttribute("data-kev-del"),1); evSave(L); evRender(); return; }
    if(t.id==="km-searchbtn"){ kmSearch(); return; }
    var kr=t.closest("#km-results button"); if(kr){ kmPick(+kr.getAttribute("data-i")); return; }
    if(t.id==="km-go"){ kmGo(); return; }
  });
  document.addEventListener("keydown",function(ev){
    var t=ev.target; if(!t||!t.closest||!rep()||!rep().contains(t)) return;
    if(t.matches("[data-ktab]")&&(ev.key==="ArrowRight"||ev.key==="ArrowLeft")){
      var tabs=[].slice.call(rep().querySelectorAll("[data-ktab]")), i=tabs.indexOf(t);
      var n=tabs[(i+(ev.key==="ArrowRight"?1:tabs.length-1))%tabs.length]; showTab(n.getAttribute("data-ktab")); n.focus(); ev.preventDefault(); return; }
    if(t.matches("[data-kip]")&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); pick(t.getAttribute("data-kip")); return; }
    if(t.id==="km-search"&&ev.key==="Enter"){ ev.preventDefault(); kmSearch(); return; }
    if((t.id==="kev-label"||t.id==="kev-date")&&ev.key==="Enter"){ ev.preventDefault(); evAdd(); }
  });
  // interactive chart: show the panel and shade the houses it names
  function pick(key){
    var r=rep(); if(!r) return;
    var pn=null; r.querySelectorAll(".kipanel").forEach(function(p){ var on=p.getAttribute("data-panel")===key; p.hidden=!on; if(on) pn=p; });
    var nums=function(s){ return (s||"").split(",").filter(Boolean).map(Number); };
    var at=pn?nums(pn.getAttribute("data-at")):[], asp=pn?nums(pn.getAttribute("data-asp")):[], own=pn?nums(pn.getAttribute("data-own")):[];
    r.querySelectorAll(".kih").forEach(function(h){ var n=+h.getAttribute("data-h");
      h.classList.toggle("is-at",at.indexOf(n)>=0); h.classList.toggle("is-asp",asp.indexOf(n)>=0&&at.indexOf(n)<0);
      h.classList.toggle("is-own",own.indexOf(n)>=0&&at.indexOf(n)<0&&asp.indexOf(n)<0); });
    r.querySelectorAll(".kip").forEach(function(p){ p.classList.toggle("on",p.getAttribute("data-kip")===key); });
  }
  // reading path stepper
  function stepGo(go){
    var r=rep(); if(!r) return; var steps=r.querySelectorAll(".kstep"), cur=1;
    steps.forEach(function(s){ if(!s.hidden) cur=+s.getAttribute("data-kstep"); });
    var n=go==="next"?cur+1:go==="prev"?cur-1:+go; n=Math.max(1,Math.min(steps.length,n));
    steps.forEach(function(s){ s.hidden=+s.getAttribute("data-kstep")!==n; });
    r.querySelectorAll(".kpath-nav [data-kstep-go]").forEach(function(b){ b.classList.toggle("on",+b.getAttribute("data-kstep-go")===n); });
    var nx=r.querySelector('.kpath-foot [data-kstep-go="next"]'); if(nx) nx.disabled=(n===steps.length);
    var pv=r.querySelector('.kpath-foot [data-kstep-go="prev"]'); if(pv) pv.disabled=(n===1);
  }
  // birth-time check: recast at a nearby time
  function shiftTime(min){
    var tob=$("k-tob").value, dob=$("k-dob").value; if(!tob||!dob) return;
    var d=dob.split("-"), t=tob.split(":");
    var dt=new Date(Date.UTC(+d[0],+d[1]-1,+d[2],+t[0],+t[1])+min*60000);
    $("k-dob").value=dt.toISOString().slice(0,10); $("k-tob").value=dt.toISOString().slice(11,16);
    pendingTab="btime"; cast();
  }
  // today's tools at the viewer's own location
  function dayHere(){
    var msg=$("kday-msg");
    if(!navigator.geolocation){ if(msg) msg.textContent="Location is not available in this browser."; return; }
    if(msg) msg.textContent="Asking the browser for your location\u2026";
    navigator.geolocation.getCurrentPosition(function(p){
      var tz=-new Date().getTimezoneOffset()/60;
      $("kday").innerHTML=window.__kApi.dayBlock(p.coords.latitude,p.coords.longitude,tz,"your current location");
      if(msg) msg.textContent="Using your location \u2014 it stays in this browser.";
    },function(){ if(msg) msg.textContent="Location was not shared; showing the birth place."; },{timeout:10000,maximumAge:600000});
  }
  // life events, kept per chart in this browser
  var EVMEM={};
  function evKey(){ var i=window.__kdata&&window.__kdata.input; if(!i) return null;
    return "kundli_events:"+[i.year,i.month,i.day,i.hour,i.minute,(+i.lat).toFixed(2),(+i.lon).toFixed(2)].join("|"); }
  function evLoad(){ var k=evKey(); if(!k) return [];
    try{ var v=localStorage.getItem(k); if(v!=null) return JSON.parse(v)||[]; }catch(e){}
    return (EVMEM[k]||[]).slice(); }
  function evSave(L){ var k=evKey(); if(!k) return; EVMEM[k]=L.slice(); try{ localStorage.setItem(k,JSON.stringify(L)); }catch(e){} }
  function evRender(){ var o=$("kev-out"); if(o&&window.__kApi) o.innerHTML=window.__kApi.events(evLoad()); }
  function evAdd(){
    var d=$("kev-date").value, l=($("kev-label").value||"").trim(), k=$("kev-kind").value;
    if(!d){ $("kev-date").focus(); return; }
    var L=evLoad(); L.push({d:d,t:l,k:k}); evSave(L);
    $("kev-label").value=""; evRender();
  }
  // compatibility: second person's place and chart
  var KMHITS=null;
  async function kmSearch(){
    var q=($("km-search").value||"").trim(), box=$("km-results");
    if(q.length<2){ box.innerHTML='<div class="k-rmsg">Type at least two letters.</div>'; return; }
    box.innerHTML='<div class="k-rmsg">Searching\u2026</div>';
    try{ var db=await loadCities(), hits=searchCities(db,q,8);
      if(!hits.length){ box.innerHTML='<div class="k-rmsg">No match. Try another spelling, or enter coordinates below.</div>'; return; }
      KMHITS=hits.map(function(ix){ var r=db.c[ix]; return {lat:r[1],lon:r[2],tz:db.tz[r[3]],label:cityLabel(db,r)}; });
      box.innerHTML=KMHITS.map(function(h,i){ return '<button type="button" data-i="'+i+'"><b>'+esc(h.label)+'</b><span>'+h.lat.toFixed(4)+'\u00b0, '+h.lon.toFixed(4)+'\u00b0 \u00b7 '+esc(h.tz)+'</span></button>'; }).join("");
    }catch(e){ box.innerHTML='<div class="k-rmsg">The city list could not be loaded ('+esc(e.message)+'). Enter coordinates below.</div>'; }
  }
  function kmPick(i){
    var h=KMHITS&&KMHITS[i]; if(!h) return;
    $("km-lat").value=h.lat.toFixed(6); $("km-lon").value=h.lon.toFixed(6);
    var off=offsetForBirth(h.tz,$("km-dob").value,$("km-tob").value);
    if(off!=null) $("km-tz").value=off;
    $("km-note").textContent=h.label+(off!=null?" \u2014 UTC"+(off>=0?"+":"")+off+" for that date.":" \u2014 enter the date first, or set the UTC offset yourself.");
    $("km-results").innerHTML="";
  }
  function kmGo(){
    var out=$("km-out"), dob=$("km-dob").value, tob=$("km-tob").value;
    var lat=parseFloat($("km-lat").value), lon=parseFloat($("km-lon").value), tz=parseFloat($("km-tz").value);
    if(!dob||!tob||isNaN(lat)||isNaN(lon)||isNaN(tz)){ out.innerHTML='<div class="k-err">Enter the second person\'s date, time and place (or coordinates and UTC offset).</div>'; return; }
    var d=dob.split("-"), t=tob.split(":");
    try{
      var J2=window.buildLocalChart({year:+d[0],month:+d[1],day:+d[2],hour:+t[0],minute:+t[1],lat:lat,lon:lon,tzHours:tz});
      out.innerHTML=window.__kApi.match(J2,{aIsBoy:$("km-role").value==="boy",nameA:window.__kname||"This chart",nameB:($("km-name").value||"").trim()||"Second person"});
    }catch(e){ out.innerHTML='<div class="k-err">Could not compute the second chart: '+esc(e.message)+'</div>'; }
  }
})();
