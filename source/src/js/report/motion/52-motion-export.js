/* ===== Workbook export =====
   An .xlsx is a ZIP of XML, so a real multi-sheet workbook needs no library — only a
   store-only ZIP writer and a little SpreadsheetML. That keeps the page self-contained
   and offline, which a 400 KB spreadsheet library would not.

   What comes out is the data behind whichever scene is on screen: the positions, the
   ingress dates, the stations, the rise and set times. The table a content calendar
   is actually built from, generated rather than kept by hand. */

/* ---------- store-only ZIP ---------- */
var MO_CRCT=null;
function moCrcTable(){
  if(MO_CRCT) return MO_CRCT;
  var t=new Int32Array(256);
  for(var n=0;n<256;n++){ var c=n;
    for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    t[n]=c; }
  MO_CRCT=t; return t;
}
function moCrc32(buf){
  var t=moCrcTable(), c=0^(-1);
  for(var i=0;i<buf.length;i++) c=(c>>>8)^t[(c^buf[i])&0xFF];
  return (c^(-1))>>>0;
}
function moU8(str){ return new TextEncoder().encode(str); }
function moZip(files){
  /* files: [{name, data:Uint8Array}] — stored, not deflated */
  var parts=[], central=[], offset=0;
  var dt=new Date(), dosT=((dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()/2))&0xFFFF;
  var dosD=(((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate())&0xFFFF;
  function w16(a,v){ a.push(v&0xFF,(v>>>8)&0xFF); }
  function w32(a,v){ a.push(v&0xFF,(v>>>8)&0xFF,(v>>>16)&0xFF,(v>>>24)&0xFF); }
  files.forEach(function(f){
    var name=moU8(f.name), crc=moCrc32(f.data), n=f.data.length;
    var h=[]; w32(h,0x04034b50); w16(h,20); w16(h,0x0800); w16(h,0); w16(h,dosT); w16(h,dosD);
    w32(h,crc); w32(h,n); w32(h,n); w16(h,name.length); w16(h,0);
    parts.push(new Uint8Array(h), name, f.data);
    var c=[]; w32(c,0x02014b50); w16(c,20); w16(c,20); w16(c,0x0800); w16(c,0);
    w16(c,dosT); w16(c,dosD); w32(c,crc); w32(c,n); w32(c,n);
    w16(c,name.length); w16(c,0); w16(c,0); w16(c,0); w16(c,0); w32(c,0); w32(c,offset);
    central.push(new Uint8Array(c), name);
    offset+=h.length+name.length+n;
  });
  var cstart=offset, csize=0;
  central.forEach(function(x){ csize+=x.length; });
  var e=[]; w32(e,0x06054b50); w16(e,0); w16(e,0); w16(e,files.length); w16(e,files.length);
  w32(e,csize); w32(e,cstart); w16(e,0);
  var all=parts.concat(central,[new Uint8Array(e)]);
  var total=0; all.forEach(function(x){ total+=x.length; });
  var out=new Uint8Array(total), q=0;
  all.forEach(function(x){ out.set(x,q); q+=x.length; });
  return out;
}
/* ---------- SpreadsheetML ---------- */
function moXmlEsc(s){
  return String(s).replace(/[&<>"]/g,function(ch){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]; })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"");
}
function moColName(i){
  var s=""; i++;
  while(i>0){ var m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); }
  return s;
}
function moSheetXml(sheet){
  var rows=[], widths=[];
  (sheet.cols||[]).forEach(function(h,i){ widths.push(Math.min(42,Math.max(10,String(h).length+4))); });
  var body="";
  function cell(r,ci,v,styleHeader){
    var ref=moColName(ci)+r;
    if(v==null||v==="") return '<c r="'+ref+'"'+(styleHeader?' s="1"':'')+'/>';
    if(typeof v==="number" && isFinite(v))
      return '<c r="'+ref+'"'+(styleHeader?' s="1"':'')+'><v>'+v+'</v></c>';
    return '<c r="'+ref+'"'+(styleHeader?' s="1"':'')+' t="inlineStr"><is><t xml:space="preserve">'+
      moXmlEsc(v)+'</t></is></c>';
  }
  var r=1, cells="";
  if(sheet.cols&&sheet.cols.length){
    cells=sheet.cols.map(function(h,i){ return cell(1,i,h,true); }).join("");
    body+='<row r="1">'+cells+'</row>'; r=2;
  }
  (sheet.rows||[]).forEach(function(row){
    body+='<row r="'+r+'">'+row.map(function(v,i){ return cell(r,i,v,false); }).join("")+'</row>';
    r++;
  });
  var colsXml=widths.length?('<cols>'+widths.map(function(w,i){
    return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>'; }).join("")+'</cols>'):"";
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<sheetViews><sheetView workbookViewId="0">'+
    (sheet.cols&&sheet.cols.length?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+
    '</sheetView></sheetViews>'+colsXml+'<sheetData>'+body+'</sheetData></worksheet>';
}
function moWorkbook(sheets,filename){
  var types='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
    sheets.map(function(s,i){ return '<Override PartName="/xl/worksheets/sheet'+(i+1)+
      '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("")+
    '</Types>';
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
    '</Relationships>';
  var wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '+
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
    sheets.map(function(s,i){ return '<sheet name="'+moXmlEsc(s.name.slice(0,31))+'" sheetId="'+(i+1)+
      '" r:id="rId'+(i+1)+'"/>'; }).join("")+'</sheets></workbook>';
  var wbRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map(function(s,i){ return '<Relationship Id="rId'+(i+1)+
      '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+
      (i+1)+'.xml"/>'; }).join("")+
    '<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
    '</Relationships>';
  var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'+
    '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'+
    '<fills count="2"><fill><patternFill patternType="none"/></fill>'+
    '<fill><patternFill patternType="gray125"/></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'+
    '</styleSheet>';
  var files=[
    {name:"[Content_Types].xml",data:moU8(types)},
    {name:"_rels/.rels",data:moU8(rels)},
    {name:"xl/workbook.xml",data:moU8(wb)},
    {name:"xl/_rels/workbook.xml.rels",data:moU8(wbRels)},
    {name:"xl/styles.xml",data:moU8(styles)}
  ];
  sheets.forEach(function(s,i){
    files.push({name:"xl/worksheets/sheet"+(i+1)+".xml",data:moU8(moSheetXml(s))});
  });
  var zip=moZip(files);
  var blob=new Blob([zip],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  var url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.parentNode.removeChild(a); },400);
  return zip.length;
}
/* ---------- the data behind each scene ---------- */
function moISO(ms){ return new Date(ms).toISOString().slice(0,19).replace("T"," "); }
function moDay(ms){ return new Date(ms).toISOString().slice(0,10); }
function moSignOf(L){ return SA[Math.floor(L/30)%12]; }
function moDegIn(L){ return +(L%30).toFixed(4); }
function moChartSheet(){
  var i=MO.J&&MO.J.input||{}, rows=[];
  rows.push(["Name",i.name||""]);
  rows.push(["Date of birth",[String(i.day).padStart(2,"0"),MON[i.month],i.year].join(" ")]);
  rows.push(["Time of birth",String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0")]);
  rows.push(["UTC offset (hours)",i.tzHours]);
  rows.push(["Latitude",i.lat]); rows.push(["Longitude",i.lon]);
  rows.push(["Zodiac","sidereal (nirayana)"]);
  rows.push(["Ayanāṃśa",(MO.J&&MO.J.ayanamsha_name)||i.ayanamsa||"Lahiri (Chitrapakṣa)"]);
  rows.push(["Ayanāṃśa value (°)",MO.J&&MO.J.ayanamsha_deg!=null?+MO.J.ayanamsha_deg.toFixed(6):""]);
  rows.push(["House system","whole sign"]);
  rows.push(["Node reckoning",i.node==="true"?"true node":"mean node"]);
  rows.push(["Positions from","astronomy-engine (VSOP87/ELP), computed in the browser"]);
  rows.push(["Exported",moISO(Date.now())+" UTC"]);
  rows.push(["Scene",moSceneOf(MO.scene).label]);
  return {name:"Chart", cols:["Field","Value"], rows:rows};
}
function moSceneSheets(){
  var k=MO.scene, out=[moChartSheet()];
  if(k==="retro"){
    var en=MO.opt.subject, w=moRetroWindow(en), rows=[], N=Math.round((w.t1-w.t0)/86400000);
    for(var i=0;i<=N;i++){
      var ms=w.t0+i*86400000, L=moSidAt(en,ms); if(L==null) continue;
      var lat=0;
      try{ lat=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(ms),true)).elat; }catch(e){}
      var sp=moSpeed(en,ms);
      rows.push([moDay(ms),+L.toFixed(5),moSignOf(L),moDegIn(L),+lat.toFixed(5),
                 +sp.toFixed(5),sp<0?"retrograde":"direct"]);
    }
    out.push({name:"Daily path",
      cols:["Date (UTC)","Sidereal longitude °","Rāśi","Degrees in rāśi","Ecliptic latitude °",
            "Motion °/day","Direction"], rows:rows});
    out.push({name:"Stations", cols:["Event","Date (UTC)"], rows:[
      ["Turns retrograde",w.s?moDay(w.s):"not in range"],
      ["Resumes direct",  w.e?moDay(w.e):"not in range"]]});
  } else if(k==="gochara"){
    var t0=Date.now(), t1=t0+moSpanMs(), yrs=(t1-t0)/31556952000;
    var ing=[], sta=[];
    ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"].forEach(function(en){
      if(en==="Moon") return;                       // a Moon ingress every 2.3 days drowns the sheet
      var N=Math.min(4000,Math.round(yrs*(en==="Mercury"||en==="Venus"||en==="Sun"?90:26)));
      var ps=null, pd=null, pl=null;
      for(var i=0;i<=N;i++){
        var ms=t0+(t1-t0)*i/N, L=moSidAt(en,ms); if(L==null) break;
        var sg=Math.floor(L/30)%12;
        if(ps!=null&&sg!==ps) ing.push([moDay(ms),MO_FULL[en],SA[sg],sg+1]);
        if(pl!=null){ var d=L-pl; if(d>180)d-=360; if(d<-180)d+=360;
          var dir=d<0?-1:1;
          if(pd!=null&&dir!==pd&&en!=="Rahu"&&en!=="Ketu")
            sta.push([moDay(ms),MO_FULL[en],dir<0?"turns retrograde":"resumes direct",
                      +L.toFixed(4),SA[sg]]);
          pd=dir; }
        ps=sg; pl=L;
      }
    });
    ing.sort(function(a,b){ return a[0]<b[0]?-1:1; });
    sta.sort(function(a,b){ return a[0]<b[0]?-1:1; });
    out.push({name:"Sign ingresses",
      cols:["Date (UTC)","Graha","Enters rāśi","Rāśi number"], rows:ing});
    out.push({name:"Stations",
      cols:["Date (UTC)","Graha","Event","Longitude °","Rāśi"], rows:sta});
    var pos=[], M=Math.min(900,Math.round(yrs*12));
    for(var m=0;m<=M;m++){
      var ms2=t0+(t1-t0)*m/M, row=[moDay(ms2)];
      ["Jupiter","Saturn","Rahu","Ketu","Mars"].forEach(function(en){
        var L=moSidAt(en,ms2); row.push(L==null?"":+L.toFixed(4)); row.push(L==null?"":moSignOf(L));
      });
      pos.push(row);
    }
    out.push({name:"Monthly positions",
      cols:["Date (UTC)","Guru °","Guru rāśi","Śani °","Śani rāśi","Rāhu °","Rāhu rāśi",
            "Ketu °","Ketu rāśi","Maṅgala °","Maṅgala rāśi"], rows:pos});
  } else if(k==="orrery"){
    var t0b=moBirthMs(), spanMs=moSpanMs(), rows2=[];
    var N2=Math.min(900,Math.max(40,Math.round(spanMs/86400000/5)));
    for(var q=0;q<=N2;q++){
      var ms3=t0b+spanMs*q/N2;
      MO_NAMES.forEach(function(en){
        var L=moSidAt(en,ms3); if(L==null) return;
        var lat2=0;
        if(en!=="Rahu"&&en!=="Ketu"){
          try{ lat2=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(ms3),true)).elat; }catch(e){}
        }
        rows2.push([moDay(ms3),MO_FULL[en],+L.toFixed(5),moSignOf(L),+lat2.toFixed(5)]);
      });
    }
    out.push({name:"Longitude and latitude",
      cols:["Date (UTC)","Graha","Sidereal longitude °","Rāśi","Ecliptic latitude °"], rows:rows2});
  } else if(k==="birthsky"){
    var i3=MO.J&&MO.J.input||{}, b=moBirthMs(), half=moSpanMs()/2, rows3=[];
    var N3=96;
    for(var s3=0;s3<=N3;s3++){
      var ms4=b-half+(half*2)*s3/N3, d4=new Date(ms4);
      var ut=d4.getUTCHours()+d4.getUTCMinutes()/60+d4.getUTCSeconds()/3600, sk=null;
      try{ sk=window.quickSky({year:d4.getUTCFullYear(),month:d4.getUTCMonth()+1,day:d4.getUTCDate(),
        hour:ut,minute:0,second:0,tzHours:0,lat:i3.lat,lon:i3.lon,ayanamsa:i3.ayanamsa||"lahiri"}); }catch(e){}
      if(!sk) continue;
      sk.planets.forEach(function(pp){
        if(!pp.hz) return;
        rows3.push([moISO(ms4),MO_FULL[pp.en],+pp.hz.alt.toFixed(3),+pp.hz.az.toFixed(3),
                    +pp.sid.toFixed(4),moSignOf(pp.sid),pp.hz.alt>0?"above":"below"]);
      });
    }
    out.push({name:"Altitude and azimuth",
      cols:["Time (UTC)","Graha","Altitude °","Azimuth °","Sidereal longitude °","Rāśi","Horizon"],
      rows:rows3});
  } else if(k==="nakshatra"){
    var rows4=(window.YOGATARAS||[]).map(function(y){
      return [y.id+1,y.nak,y.star,y.bayer,y.hr,+y.sid.toFixed(4),moSignOf(y.sid),
              +y.lat.toFixed(4),+y.mag.toFixed(2),y.inside?"inside":"outside"];
    });
    out.push({name:"Yogatārās",
      cols:["#","Nakṣatra","Star","Bayer","HR","Sidereal longitude °","Rāśi","Ecliptic latitude °",
            "Magnitude","Falls within its own division"], rows:rows4});
    out.push({name:"Equal divisions",
      cols:["#","Nakṣatra","Starts °","Ends °","Rāśi at start"],
      rows:(function(){ var seg=40/3, r=[];
        for(var n=0;n<27;n++) r.push([n+1,SKY_NAKA[n],+(n*seg).toFixed(4),+((n+1)*seg).toFixed(4),
          moSignOf(n*seg)]);
        return r; })()});
  } else if(k==="frames"){
    var i5=MO.J&&MO.J.input||{}, b5=moBirthMs(), rows5=[], N5=144;
    for(var f=0;f<=N5;f++){
      var ms5=b5+86164091*f/N5, d5=new Date(ms5);
      var ut5=d5.getUTCHours()+d5.getUTCMinutes()/60+d5.getUTCSeconds()/3600, sk5=null;
      try{ sk5=window.quickSky({year:d5.getUTCFullYear(),month:d5.getUTCMonth()+1,day:d5.getUTCDate(),
        hour:ut5,minute:0,second:0,tzHours:0,lat:i5.lat,lon:i5.lon,ayanamsa:i5.ayanamsa||"lahiri"}); }catch(e){}
      if(!sk5) continue;
      var h1=Math.floor(sk5.lagna/30)%12;
      rows5.push([moISO(ms5),+sk5.lagna.toFixed(4),SA[h1],+(sk5.lagna%30).toFixed(4),
                  SA[h1],SA[(h1+3)%12],SA[(h1+6)%12],SA[(h1+9)%12]]);
    }
    out.push({name:"Lagna through one day",
      cols:["Time (UTC)","Lagna °","Rāśi rising","Degrees in rāśi","1st bhāva","4th","7th","10th"],
      rows:rows5});
  } else if(k==="ayanamsa"){
    var rows6=[];
    for(var yy=-500;yy<=3500;yy+=25){
      var jd6=2451545.0+(yy-2000)*365.2425, a6=null;
      try{ a6=window.__ayanFor?window.__ayanFor("lahiri",jd6):null; }catch(e){}
      if(a6==null) continue;
      var others={};
      ["raman","kp","truechitra"].forEach(function(mdx){
        try{ others[mdx]=window.__ayanFor(mdx,jd6); }catch(e){ others[mdx]=null; }
      });
      rows6.push([yy<0?(Math.abs(yy)+" BCE"):(yy+" CE"), yy, +a6.toFixed(5),
                  others.raman!=null?+others.raman.toFixed(5):"",
                  others.kp!=null?+others.kp.toFixed(5):"",
                  others.truechitra!=null?+others.truechitra.toFixed(5):""]);
    }
    out.push({name:"Ayanāṃśa by year",
      cols:["Year","Year (signed)","Lahiri °","Raman °","Krishnamurti °","True Chitrapakṣa °"],
      rows:rows6});
  } else if(k==="drishti"){
    var en7=MO.opt.subject, t7=Date.now(), e7=t7+moSpanMs(), rows7=[];
    var N7=Math.min(600,Math.max(40,Math.round((e7-t7)/86400000)));
    var SP={Sun:[180],Moon:[180],Mercury:[180],Venus:[180],Mars:[90,180,210],
            Jupiter:[120,180,240],Saturn:[60,180,270],Rahu:[180],Ketu:[180]};
    for(var s7=0;s7<=N7;s7++){
      var m7=t7+(e7-t7)*s7/N7, L7=moSidAt(en7,m7); if(L7==null) continue;
      var row7=[moDay(m7),+L7.toFixed(4),moSignOf(L7)];
      (SP[en7]||[180]).forEach(function(off){
        var g=((L7+off)%360+360)%360;
        row7.push(Math.round(off/30)+1, moSignOf(g), +g.toFixed(4));
      });
      rows7.push(row7);
    }
    var cols7=["Date (UTC)","Longitude °","Rāśi"];
    (SP[en7]||[180]).forEach(function(){ cols7.push("House glanced","Rāśi glanced","Degree glanced °"); });
    out.push({name:"Dṛṣṭi",cols:cols7,rows:rows7});
  } else if(k==="tithi"){
    var t8=Date.now(), rows8=[], N8=360;
    for(var s8=0;s8<=N8;s8++){
      var m8=t8+29.530589*86400000*s8/N8;
      var su8=moSidAt("Sun",m8), mo8=moSidAt("Moon",m8);
      if(su8==null||mo8==null) continue;
      var el8=((mo8-su8)%360+360)%360, ti8=Math.floor(el8/12)+1;
      rows8.push([moISO(m8),+su8.toFixed(4),+mo8.toFixed(4),+el8.toFixed(4),
                  el8<180?"Śukla":"Kṛṣṇa", ti8>15?ti8-15:ti8, ti8]);
    }
    out.push({name:"Tithi through a month",
      cols:["Time (UTC)","Sūrya °","Candra °","Elongation °","Pakṣa","Tithi in pakṣa","Tithi of 30"],
      rows:rows8});
  } else if(k==="eclipse"){
    var E=moEclipses(), rowsE=E.map(function(x){
      var nk=null; try{ if(x.lon!=null) nk=nakOf(x.lon); }catch(e){}
      return [moISO(x.ms), x.kind==="solar"?"Solar":"Lunar",
              (x.type||"").charAt(0).toUpperCase()+(x.type||"").slice(1),
              x.lon!=null?+x.lon.toFixed(4):"", x.lon!=null?moSignOf(x.lon):"",
              nk?nk.name:"", nk?nk.pada:"",
              x.node!=null?+x.node.toFixed(2):"", x.which||"",
              x.obsc!=null?+x.obsc.toFixed(3):"",
              x.kind==="solar"&&x.lat!=null?+x.lat.toFixed(2):"",
              x.kind==="solar"&&x.lon!=null&&x.lonG!=null?x.lonG:""];
    });
    out.push({name:"Eclipses ahead",
      cols:["Peak (UTC)","Kind","Type","Sidereal longitude °","Rāśi","Nakṣatra","Pāda",
            "Degrees from the node","Node","Obscuration","Greatest eclipse latitude °",""],
      rows:rowsE});
  } else if(k==="panchanga"){
    /* One row per sample, computed with the site's own panchanga() so the sheet and the
       Overview tab can never disagree. The sample step follows the span: a day of hours,
       anything longer by day. Past 1500 days the cap spreads the samples evenly instead,
       so a long span thins out rather than running to tens of thousands of rows. */
    var tP=Date.now(), eP=tP+moSpanMs(), spP=eP-tP;
    var stepP=(spP<=2*86400000)?3600000:86400000;
    var NP=Math.min(1500,Math.max(2,Math.round(spP/stepP))), rowsP=[];
    for(var iP=0;iP<=NP;iP++){
      var mP=tP+spP*iP/NP;
      var suP=moSidAt("Sun",mP), moP=moSidAt("Moon",mP);
      if(suP==null||moP==null) continue;
      var pcP=panchanga(suP,moP), nkP=nakOf(moP);
      var jdP=mP/86400000+2440587.5, viP=(Math.floor(jdP+1.5)%7+7)%7;
      var elP=((moP-suP)%360+360)%360, ygP=((moP+suP)%360+360)%360;
      rowsP.push([moISO(mP), pcP.tithi, pcP.paksha, pcP.tithiIdx+1,
                  VARAS[viP], VARAE[viP],
                  nkP.name, nkP.pada, nkP.lord,
                  pcP.yoga, Math.floor(ygP/(800/60))+1,
                  pcP.karana, Math.floor(elP/6)+1,
                  +suP.toFixed(4), moSignOf(suP), +moP.toFixed(4), moSignOf(moP),
                  +elP.toFixed(4)]);
    }
    out.push({name:"Pañcāṅga",
      cols:["Time (UTC)","Tithi","Pakṣa","Tithi of 30","Vāra","Weekday",
            "Nakṣatra","Pāda","Nakṣatra lord","Yoga","Yoga of 27","Karaṇa","Karaṇa of 60",
            "Sūrya °","Sūrya rāśi","Candra °","Candra rāśi","Elongation °"],
      rows:rowsP});
    out.push({name:"Limb lengths", cols:["Limb","Divisions","Defined by","Mean length"], rows:[
      ["Tithi",30,"Candra − Sūrya, each 12°","about 23 h 37 m"],
      ["Vāra",7,"the civil weekday","24 h"],
      ["Nakṣatra",27,"Candra's longitude, each 13°20′","about 24 h 17 m"],
      ["Yoga",27,"Candra + Sūrya, each 13°20′","about 22 h 36 m"],
      ["Karaṇa",60,"Candra − Sūrya, each 6°","about 11 h 48 m"]]});
  } else if(k==="eclipseseason"){
    var tE=Date.now(), eE=tE+moSpanMs();
    var EE=moEclipsesIn(tE,eE);
    out.push({name:"Eclipses in the span",
      cols:["Peak (UTC)","Kind","Type","Sidereal longitude °","Rāśi","Degrees from the node","Node"],
      rows:EE.map(function(x){
        return [moISO(x.ms), x.kind==="solar"?"Solar":"Lunar",
                (x.type||"").charAt(0).toUpperCase()+(x.type||"").slice(1),
                x.lon!=null?+x.lon.toFixed(4):"", x.lon!=null?moSignOf(x.lon):"",
                x.node!=null?+x.node.toFixed(2):"", x.which||""];
      })});
    /* the slow hand: where the nodal axis sits month by month */
    var rowsN=[], NN=Math.min(800,Math.max(24,Math.round((eE-tE)/2629746000)));
    for(var q=0;q<=NN;q++){
      var mN=tE+(eE-tE)*q/NN, raN=moSidAt("Rahu",mN), suN=moSidAt("Sun",mN);
      if(raN==null||suN==null) continue;
      var keN=(raN+180)%360;
      var d1=Math.abs(((suN-raN)%360+360)%360); if(d1>180)d1=360-d1;
      var d2=Math.abs(((suN-keN)%360+360)%360); if(d2>180)d2=360-d2;
      var near=Math.min(d1,d2);
      rowsN.push([moDay(mN),+raN.toFixed(4),moSignOf(raN),+keN.toFixed(4),moSignOf(keN),
                  +suN.toFixed(4),+near.toFixed(2),near<=18.5?"eclipse season":""]);
    }
    out.push({name:"Nodes and Sun",
      cols:["Date (UTC)","Rāhu °","Rāhu rāśi","Ketu °","Ketu rāśi","Sūrya °",
            "Sūrya from nearest node °","Season"],rows:rowsN});
  } else if(k==="astanga"){
    var t9=Date.now(), e9=t9+moSpanMs(), rows9=[];
    var N9=Math.min(420,Math.max(40,Math.round((e9-t9)/86400000)));
    var ORB={Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:16};
    for(var s9=0;s9<=N9;s9++){
      var m9=t9+(e9-t9)*s9/N9, su9=moSidAt("Sun",m9); if(su9==null) continue;
      Object.keys(ORB).forEach(function(en){
        var L9=moSidAt(en,m9); if(L9==null) return;
        var rel=((L9-su9)%360+360)%360; if(rel>180) rel-=360;
        rows9.push([moDay(m9),MO_FULL[en],+L9.toFixed(4),moSignOf(L9),+rel.toFixed(3),
                    ORB[en],Math.abs(rel)<=ORB[en]?"combust":""]);
      });
    }
    out.push({name:"Combustion",
      cols:["Date (UTC)","Graha","Longitude °","Rāśi","Degrees from Sūrya","Orb","Astaṅgata"],
      rows:rows9});
  } else if(k==="dignity"){
    var enD=MO.opt.subject==="Moon"?"Mars":MO.opt.subject;
    var tD=Date.now(), eD=tD+moSpanMs(), rowsD=[];
    var ND=Math.min(900,Math.max(40,Math.round((eD-tD)/86400000)));
    for(var sD=0;sD<=ND;sD++){
      var mD=tD+(eD-tD)*sD/ND, LD=moSidAt(enD,mD); if(LD==null) continue;
      var sgD=Math.floor(LD/30)%12, dg="";
      try{ dg=dignity(enD,sgD,LD%30); }catch(e){}
      rowsD.push([moDay(mD),MO_FULL[enD],+LD.toFixed(4),SA[sgD],+(LD%30).toFixed(4),dg]);
    }
    out.push({name:"Dignity",
      cols:["Date (UTC)","Graha","Longitude °","Rāśi","Degrees in rāśi","Dignity"],rows:rowsD});
    var tbl=[];
    for(var sg2=0;sg2<12;sg2++){
      var d2=""; try{ d2=dignity(enD,sg2,15); }catch(e){}
      tbl.push([sg2+1,SA[sg2],d2]);
    }
    out.push({name:"Dignity by rāśi",cols:["#","Rāśi","Dignity"],rows:tbl});
  } else if(k==="sadesati"){
    if(MO.D&&MO.D.P&&MO.D.P.Moon){
      var mS=Math.floor(MO.D.P.Moon.sid/30)%12, bS=moBirthMs(), rowsS=[];
      var prevPh=null;
      for(var y=0;y<=90*12;y++){
        var mS2=bS+y*2629746000, sa2=moSidAt("Saturn",mS2); if(sa2==null) continue;
        var ph=((Math.floor(sa2/30)%12)-mS+12)%12;
        var name=(ph===11)?"Sade Sati — rising":(ph===0)?"Sade Sati — peak":
                 (ph===1)?"Sade Sati — setting":(ph===3)?"Dhaiyā (4th)":
                 (ph===7)?"Dhaiyā (8th)":"";
        if(name && name!==prevPh)
          rowsS.push([moDay(mS2),+((mS2-bS)/31556952000).toFixed(1),SA[Math.floor(sa2/30)%12],name]);
        if(name!==prevPh) prevPh=name;
      }
      out.push({name:"Śani over the Moon",
        cols:["Begins (UTC)","Age","Śani in rāśi","Phase"],rows:rowsS});
    }
  } else if(k==="dasha"){
    var tr=null; try{ tr=buildTree(MO.D); }catch(e){}
    var md=[], ad=[];
    (tr||[]).forEach(function(m){
      var s=m.dispStart!=null?m.dispStart:m.start;
      md.push([MO_FULL[m.lord],moDay((s-2440587.5)*86400000),moDay((m.end-2440587.5)*86400000),
               +((m.end-s)/365.2564).toFixed(4),m.partial?"balance at birth":""]);
      (m.ads||[]).forEach(function(a){
        ad.push([MO_FULL[m.lord],MO_FULL[a.lord],
                 moDay((a.start-2440587.5)*86400000),moDay((a.end-2440587.5)*86400000),
                 +((a.end-a.start)/365.2564).toFixed(4)]);
      });
    });
    out.push({name:"Mahādaśā",
      cols:["Lord","Begins","Ends","Years","Note"], rows:md});
    out.push({name:"Antardaśā",
      cols:["Mahādaśā lord","Antardaśā lord","Begins","Ends","Years"], rows:ad});
  }
  return out;
}
function moExport(){
  var btn=document.getElementById("moxls");
  if(btn){ btn.disabled=true; btn.textContent="Building…"; }
  setTimeout(function(){
    var n=0, err=null;
    try{
      var sheets=moSceneSheets();
      var nm=(MO.J&&MO.J.input&&MO.J.input.name)?MO.J.input.name.replace(/[^\w -]/g,"").trim():"chart";
      n=moWorkbook(sheets,"learnhoro-"+MO.scene+"-"+(nm||"chart").replace(/\s+/g,"-")+".xlsx");
    }catch(e){ err=e; }
    if(btn){ btn.disabled=false; btn.textContent="Export data (.xlsx)"; }
    var s=document.getElementById("moxlsmsg");
    if(s) s.textContent = err ? ("could not build the workbook: "+err.message)
                              : ("workbook downloaded · "+Math.round(n/1024)+" KB");
  },30);
}
