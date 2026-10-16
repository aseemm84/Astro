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
/* The rāśi a longitude falls in. Routed through the language table so a sheet
   exported in Hindi carries Devanāgarī names, matching the frame it came from. */
function moSignOf(L){ return moTrasi(Math.floor(((L%360)+360)%360/30)); }
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
    /* Every retrograde in the chosen window, one row each, plus the day-by-day
       path of whichever loop the playhead is on. The first sheet is the one worth
       keeping: it is the station dates, which is what anyone actually wants. */
    var en=MO.opt.subject;
    var w0=(MO.opt.from==="birth")?moBirthMs():Date.now(), w1=w0+moSpanMs();
    var loops=moRetroLoops(en,w0,w1);
    out.push({name:"Retrogrades in the window",
      cols:["#","Turns retrograde (UTC)","Resumes direct (UTC)","Days","Longitude at station °",
            "Rāśi at station","Longitude at resuming °","Rāśi at resuming","Arc covered °",
            "Runs past the window"],
      rows:loops.map(function(L,i){
        var arc=(L.lonS!=null&&L.lonE!=null)?(function(){
          var d=L.lonS-L.lonE; while(d<-180)d+=360; while(d>180)d-=360; return Math.abs(d); })():"";
        return [i+1,moISO(L.s),moISO(L.e),+L.days.toFixed(2),
                L.lonS!=null?+L.lonS.toFixed(4):"", L.lonS!=null?moSignOf(L.lonS):"",
                L.lonE!=null?+L.lonE.toFixed(4):"", L.lonE!=null?moSignOf(L.lonE):"",
                arc===""?"":+arc.toFixed(3), (L.cs||L.ce)?"yes":"no"];
      })});
    out.push({name:"Window", cols:["Quantity","Value"], rows:[
      ["Graha",moTgraha(en)],
      ["From",(MO.opt.from==="birth")?"the birth moment":"today"],
      ["Window opens",moISO(w0)],["Window closes",moISO(w1)],
      ["Retrogrades found",loops.length],
      ["Mean interval between them",(MO_SYNODIC[en]?(MO_SYNODIC[en]+" days (synodic period)"):"")],
      ["Note","a period already running when the window opens, or still running when it "+
              "closes, is included and flagged"]]});
    if(loops.length){
      var shown=Math.min(loops.length,8);
      var ei=Math.min(shown-1,Math.floor(MO.p/(1/shown)));
      var L2=loops[ei], pad2=(L2.e-L2.s)*0.55;
      var a2=L2.s-pad2, b2=L2.e+pad2, rows=[];
      var N2=Math.min(900,Math.max(40,Math.round((b2-a2)/86400000)));
      for(var i2=0;i2<=N2;i2++){
        var ms2=a2+(b2-a2)*i2/N2, Lo=moSidAt(en,ms2); if(Lo==null) continue;
        var lat2=0;
        try{ lat2=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(ms2),true)).elat; }catch(e){}
        var sp2=moSpeed(en,ms2);
        rows.push([moDay(ms2),+Lo.toFixed(5),moSignOf(Lo),moDegIn(Lo),+lat2.toFixed(5),
                   +sp2.toFixed(5),sp2<0?"retrograde":"direct"]);
      }
      out.push({name:"Path of loop "+(ei+1),
        cols:["Date (UTC)","Sidereal longitude °","Rāśi","Degrees in rāśi","Ecliptic latitude °",
              "Motion °/day","Direction"], rows:rows});
    }
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
        if(ps!=null&&sg!==ps) ing.push([moDay(ms),moTgraha(en),moTrasi(sg),sg+1]);
        if(pl!=null){ var d=L-pl; if(d>180)d-=360; if(d<-180)d+=360;
          var dir=d<0?-1:1;
          if(pd!=null&&dir!==pd&&en!=="Rahu"&&en!=="Ketu")
            sta.push([moDay(ms),moTgraha(en),dir<0?"turns retrograde":"resumes direct",
                      +L.toFixed(4),moTrasi(sg)]);
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
        rows2.push([moDay(ms3),moTgraha(en),+L.toFixed(5),moSignOf(L),+lat2.toFixed(5)]);
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
        rows3.push([moISO(ms4),moTgraha(pp.en),+pp.hz.alt.toFixed(3),+pp.hz.az.toFixed(3),
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
        for(var n=0;n<27;n++) r.push([n+1,moTnak(n),+(n*seg).toFixed(4),+((n+1)*seg).toFixed(4),
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
      rows5.push([moISO(ms5),+sk5.lagna.toFixed(4),moTrasi(h1),+(sk5.lagna%30).toFixed(4),
                  moTrasi(h1),moTrasi((h1+3)%12),moTrasi((h1+6)%12),moTrasi((h1+9)%12)]);
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
  } else if(k==="lagna"){
    /* Two sheets: what the lagna does across the span, and the rising times that
       govern it. The second is the one worth keeping — it is the table BPHS asks
       for when it says the ascendant follows the rāśi durations of the place. */
    var W=moWhere(), tL=moBirthMs(), eL=tL+moSpanMs();
    var ayL=0; try{ ayL=window.__ayanFor?window.__ayanFor("lahiri",tL/86400000+2440587.5):23.9; }catch(e){}
    var RT=moRisingTimes(W.lat,ayL);
    out.push({name:"Rāśi rising times",
      cols:["Rāśi","Oblique ascension °","Rising time (minutes)","Rising time (h:mm)",
            "Share of the day %"],
      rows:SA.map(function(nm,i){
        var dg=RT.deg[i], mi=RT.min[i];
        if(dg==null) return [nm,"","","never rises at this latitude",""];
        var hh=Math.floor(mi/60), mm=Math.round(mi-hh*60);
        return [nm,+dg.toFixed(3),+mi.toFixed(1),hh+":"+(mm<10?"0":"")+mm,
                +(dg/360*100).toFixed(2)];
      })});
    var NL=Math.min(1200,Math.max(60,Math.round((eL-tL)/600000))), rowsL=[], prevS=null;
    for(var iL=0;iL<=NL;iL++){
      var mL=tL+(eL-tL)*iL/NL, dL=new Date(mL);
      var lagv=null;
      try{
        var utL=dL.getUTCHours()+dL.getUTCMinutes()/60+dL.getUTCSeconds()/3600;
        lagv=window.quickSky({year:dL.getUTCFullYear(),month:dL.getUTCMonth()+1,
          day:dL.getUTCDate(),hour:utL,minute:0,second:0,tzHours:0,
          lat:W.lat,lon:W.lon,ayanamsa:"lahiri"}).lagna;
      }catch(e){}
      if(lagv==null) continue;
      var sg=Math.floor(lagv/30)%12;
      rowsL.push([moISO(mL),+lagv.toFixed(4),moTrasi(sg),+(lagv%30).toFixed(4),
                  nakOf(lagv).name,nakOf(lagv).pada,LORD[sg],
                  (prevS!=null&&sg!==prevS)?"rāśi changes here":""]);
      prevS=sg;
    }
    out.push({name:"Lagna across the span",
      cols:["Time (UTC)","Lagna °","Rāśi","Degrees in rāśi","Nakṣatra","Pāda",
            "Rāśi lord","Note"], rows:rowsL});
    out.push({name:"Place", cols:["Quantity","Value"], rows:[
      ["Latitude",W.lat],["Longitude (east +)",W.lon],
      ["Ayanāṃśa at the start",+ayL.toFixed(4)],
      ["Obliquity used",23.4393],
      ["Note","rising times are the oblique ascension: the right ascension a rāśi "+
              "spans, less its ascensional difference at this latitude"]]});
  } else if(k==="moon"||k==="sun"){
    var tM=Date.now(), eM=tM+moSpanMs(), spM=eM-tM;
    var stepM=(spM<=3*86400000)?3600000:86400000;
    var NM=Math.min(1500,Math.max(24,Math.round(spM/stepM))), rowsM=[];
    for(var iM=0;iM<=NM;iM++){
      var mM=tM+spM*iM/NM, dM=new Date(mM);
      var suM=moSidAt("Sun",mM), moM=moSidAt("Moon",mM);
      if(suM==null||moM==null) continue;
      if(k==="moon"){
        var ilM=null, lbM=null;
        try{ ilM=Astronomy.Illumination(Astronomy.Body.Moon,dM);
             lbM=Astronomy.Libration(dM); }catch(e){}
        if(!ilM||!lbM) continue;
        var pcM=panchanga(suM,moM), nkM=nakOf(moM), elM=((moM-suM)%360+360)%360;
        rowsM.push([moISO(mM),pcM.tithi,pcM.paksha,elM<180?"waxing":"waning",
                    +(ilM.phase_fraction*100).toFixed(2),+ilM.phase_angle.toFixed(3),
                    +elM.toFixed(3),+moM.toFixed(4),moSignOf(moM),nkM.name,nkM.pada,
                    Math.round(lbM.dist_km),+(lbM.diam_deg*60).toFixed(3),
                    +lbM.elon.toFixed(3),+lbM.elat.toFixed(3),+ilM.mag.toFixed(2)]);
      } else {
        var ilS=null; try{ ilS=Astronomy.Illumination(Astronomy.Body.Sun,dM); }catch(e){}
        var dsS=(ilS&&ilS.geo_dist)?ilS.geo_dist:1;
        var ayS=0; try{ ayS=window.__ayanFor?window.__ayanFor("lahiri",mM/86400000+2440587.5):23.9; }catch(e){}
        var trS=((suM+ayS)%360+360)%360, nkS=nakOf(suM);
        rowsM.push([moISO(mM),+suM.toFixed(4),moSignOf(suM),+(suM%30).toFixed(4),
                    nkS.name,nkS.pada,+dsS.toFixed(6),+((0.5331/dsS)*60).toFixed(3),
                    +trS.toFixed(4),(trS>=90&&trS<270)?"Dakṣiṇāyana":"Uttarāyaṇa",
                    +ayS.toFixed(4)]);
      }
    }
    if(k==="moon")
      out.push({name:"Candra",
        cols:["Time (UTC)","Tithi","Pakṣa","Direction","Illuminated %","Phase angle °",
              "Elongation °","Longitude °","Rāśi","Nakṣatra","Pāda","Distance km",
              "Apparent diameter ′","Libration in longitude °","Libration in latitude °",
              "Magnitude"], rows:rowsM});
    else
      out.push({name:"Sūrya",
        cols:["Time (UTC)","Sidereal longitude °","Rāśi","Degrees in rāśi","Nakṣatra",
              "Pāda","Distance AU","Apparent diameter ′","Tropical longitude °","Ayana",
              "Ayanāṃśa °"], rows:rowsM});
  } else if(k==="worlds"){
    var tW=Date.now(), eW=tW+moSpanMs();
    var NW=Math.min(900,Math.max(24,Math.round((eW-tW)/86400000/3))), rowsW=[];
    var KM={Mercury:4879,Venus:12104,Mars:6779,Jupiter:139820,Saturn:116460};
    for(var iW=0;iW<=NW;iW++){
      var mW=tW+(eW-tW)*iW/NW, dW=new Date(mW);
      ["Mercury","Venus","Mars","Jupiter","Saturn"].forEach(function(en){
        var il=null; try{ il=Astronomy.Illumination(Astronomy.Body[en],dW); }catch(e){}
        if(!il) return;
        var L=moSidAt(en,mW), sp=moSpeed(en,mW);
        var aa=(KM[en]/(il.geo_dist*149597870.7))*206264.8;
        rowsW.push([moDay(mW),moTgraha(en),L==null?"":+L.toFixed(4),
                    L==null?"":moSignOf(L),+il.geo_dist.toFixed(5),
                    +il.helio_dist.toFixed(5),+aa.toFixed(2),
                    +(il.phase_fraction*100).toFixed(2),+il.phase_angle.toFixed(2),
                    +il.mag.toFixed(2),
                    (en==="Saturn"&&il.ring_tilt!=null)?+il.ring_tilt.toFixed(2):"",
                    sp<0?"retrograde":"direct"]);
      });
    }
    out.push({name:"The five worlds",
      cols:["Date (UTC)","Graha","Sidereal longitude °","Rāśi","Distance from Earth AU",
            "Distance from Sūrya AU","Apparent diameter ″","Illuminated %","Phase angle °",
            "Magnitude","Ring tilt °","Motion"], rows:rowsW});
  } else if(k==="tilt"){
    /* The sheet behind the proof strip: every new and full moon in the span with Candra's
       ecliptic latitude at that moment and its distance from the node, so the pattern can
       be checked rather than taken on trust. The syzygies are found by sampling the
       elongation and bisecting each crossing of 0° and 180°. */
    var tT=Date.now(), eT=tT+moSpanMs();
    function elAt(m){ var a=moSidAt("Moon",m), b=moSidAt("Sun",m);
      return (a==null||b==null)?null:((a-b)%360+360)%360; }
    function latAt(m){ try{ return Astronomy.Ecliptic(
      Astronomy.GeoVector(Astronomy.Body.Moon,new Date(m),true)).elat; }catch(e){ return null; } }
    var NT=Math.min(4000,Math.max(60,Math.round((eT-tT)/21600000))), rowsT=[], prev=null;
    for(var iT=0;iT<=NT;iT++){
      var mT=tT+(eT-tT)*iT/NT, elT=elAt(mT);
      if(elT==null){ prev=null; continue; }
      if(prev){
        var kind=null;
        if(prev.el>elT) kind="new";                       /* wrapped through 360 → 0 */
        else if(prev.el<180&&elT>=180) kind="full";
        if(kind){
          /* bisect to the minute, so the latitude is the one at syzygy and not a sample
             up to six hours off it — at 0.05°/hour that error would swamp the limit */
          var lo=prev.m, hi=mT, tgt=(kind==="new")?0:180;
          for(var bi=0;bi<40&&hi-lo>60000;bi++){
            var mid=(lo+hi)/2, em=elAt(mid); if(em==null) break;
            var d=((em-tgt)%360+360)%360; if(d>180) d-=360;
            if(d<0) lo=mid; else hi=mid;
          }
          var mS=(lo+hi)/2, bS=latAt(mS), rS=moSidAt("Rahu",mS), lS=moSidAt("Moon",mS);
          var nd=null, which="";
          if(rS!=null&&lS!=null){
            var d1=Math.abs(((lS-rS)%360+360)%360); if(d1>180) d1=360-d1;
            var d2=Math.abs(((lS-rS-180)%360+360)%360); if(d2>180) d2=360-d2;
            nd=Math.min(d1,d2); which=(d1<=d2)?"Rāhu":"Ketu";
          }
          /* A full moon has two limits: the umbra out to 1.03°, the penumbra out to 1.57°.
             A flat yes/no would call the penumbral eclipses of 2027 "no", which is true
             of the umbra and wrong of the sky. */
          var ab=(bS==null)?null:Math.abs(bS), verdict;
          if(ab==null) verdict="";
          else if(kind==="new") verdict=(ab<=1.58)?"solar eclipse":"none";
          else verdict=(ab<=1.03)?"lunar, umbral":((ab<=1.57)?"lunar, penumbral only":"none");
          /* Longitude as well as latitude. The band on screen shows where along the
             ring each of the four stands; without these columns the sheet could say
             only how far off the plane Candra was, never where it happened. */
          var sS=moSidAt("Sun",mS), kS=(rS==null)?null:((rS+180)%360+360)%360;
          function rn(x){ return x==null?"":moRasiOf(x).name; }
          function nn2(x){ if(x==null) return ""; var q=moNak(x); return q.name+" "+q.pada; }
          rowsT.push([moISO(mS), kind==="new"?"New moon":"Full moon",
                      bS==null?"":+bS.toFixed(4), ab==null?"":+ab.toFixed(4),
                      (kind==="new")?1.58:1.03, (kind==="new")?"":1.57, verdict,
                      nd==null?"":+nd.toFixed(2), which,
                      lS==null?"":+lS.toFixed(4), lS==null?"":moSignOf(lS), nn2(lS),
                      sS==null?"":+sS.toFixed(4), rn(sS), nn2(sS),
                      rS==null?"":+rS.toFixed(4), rn(rS), nn2(rS),
                      rn(kS), nn2(kS)]);
        }
      }
      prev={m:mT,el:elT};
    }
    out.push({name:"Syzygies and latitude",
      cols:["Moment (UTC)","Phase","Candra latitude °","Absolute latitude °",
            "Limit °","Penumbral limit °","Eclipse by latitude",
            "Degrees from the node","Node",
            "Candra longitude °","Candra rāśi","Candra nakṣatra + pāda",
            "Sūrya longitude °","Sūrya rāśi","Sūrya nakṣatra + pāda",
            "Rāhu longitude °","Rāhu rāśi","Rāhu nakṣatra + pāda",
            "Ketu rāśi","Ketu nakṣatra + pāda"], rows:rowsT});
    out.push({name:"The geometry", cols:["Quantity","Value","Why it matters"], rows:[
      ["Inclination of Candra's orbit","5.145°","the tilt that makes most syzygies miss"],
      ["Sūrya's ecliptic latitude","0° always","the ecliptic is defined as its path"],
      ["Latitude limit, solar eclipse","1.58°","past this at a new moon, the cone misses Earth"],
      ["Latitude limit, lunar umbral","1.03°","past this at a full moon, Candra misses the umbra"],
      ["Latitude limit, lunar penumbral","1.57°","between the two, a faint penumbral eclipse"],
      ["Ecliptic limit from the node, solar","18.5°","the same condition read along the ecliptic"],
      ["Ecliptic limit from the node, lunar","12.2°","likewise, and narrower — hence fewer"],
      ["Regression of the nodes","about 19.3° a year","why the seasons drift earlier each year"],
      ["Eclipse year","about 346.6 days","two eclipse seasons, shorter than a solar year"]]});
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
      var ayP=0; try{ ayP=window.__ayanFor?window.__ayanFor("lahiri",jdP):0; }catch(e){}
      var msP=masaOf(suP,moP,ayP);
      var elP=((moP-suP)%360+360)%360, ygP=((moP+suP)%360+360)%360;
      rowsP.push([moISO(mP), msP.amanta, msP.purnimanta, msP.ritu, msP.ayana,
                  pcP.tithi, pcP.paksha, pcP.tithiIdx+1,
                  VARAS[viP], VARAE[viP],
                  nkP.name, nkP.pada, nkP.lord,
                  pcP.yoga, Math.floor(ygP/(800/60))+1,
                  pcP.karana, Math.floor(elP/6)+1,
                  +suP.toFixed(4), moSignOf(suP), +moP.toFixed(4), moSignOf(moP),
                  +elP.toFixed(4)]);
    }
    out.push({name:"Pañcāṅga",
      cols:["Time (UTC)","Māsa (amānta)","Māsa (pūrṇimānta)","Ṛtu","Ayana",
            "Tithi","Pakṣa","Tithi of 30","Vāra","Weekday",
            "Nakṣatra","Pāda","Nakṣatra lord","Yoga","Yoga of 27","Karaṇa","Karaṇa of 60",
            "Sūrya °","Sūrya rāśi","Candra °","Candra rāśi","Elongation °"],
      rows:rowsP});
    out.push({name:"Limb lengths", cols:["Limb","Divisions","Defined by","Mean length"], rows:[
      ["Tithi",30,"Candra − Sūrya, each 12°","about 23 h 37 m"],
      ["Vāra",7,"the civil weekday","24 h"],
      ["Nakṣatra",27,"Candra's longitude, each 13°20′","about 24 h 17 m"],
      ["Yoga",27,"Candra + Sūrya, each 13°20′","about 22 h 36 m"],
      ["Karaṇa",60,"Candra − Sūrya, each 6°","about 11 h 48 m"],
      ["— the five limbs end here —","","",""],
      ["Māsa (amānta)",12,"the rāśi Sūrya held at the opening new moon","about 29 d 13 h"],
      ["Māsa (pūrṇimānta)",12,"the same month named for the full moon that ends it",
       "runs one ahead through Kṛṣṇa pakṣa"],
      ["Ṛtu",6,"a pair of māsas","about 2 months"],
      ["Ayana",2,"tropical Sūrya north or south of the equator","about 6 months"]]});
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
        rows9.push([moDay(m9),moTgraha(en),+L9.toFixed(4),moSignOf(L9),+rel.toFixed(3),
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
      rowsD.push([moDay(mD),moTgraha(enD),+LD.toFixed(4),moTrasi(sgD),+(LD%30).toFixed(4),dg]);
    }
    out.push({name:"Dignity",
      cols:["Date (UTC)","Graha","Longitude °","Rāśi","Degrees in rāśi","Dignity"],rows:rowsD});
    var tbl=[];
    for(var sg2=0;sg2<12;sg2++){
      var d2=""; try{ d2=dignity(enD,sg2,15); }catch(e){}
      tbl.push([sg2+1,moTrasi(sg2),d2]);
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
          rowsS.push([moDay(mS2),+((mS2-bS)/31556952000).toFixed(1),moTrasi(Math.floor(sa2/30)%12),name]);
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
      md.push([moTgraha(m.lord),moDay((s-2440587.5)*86400000),moDay((m.end-2440587.5)*86400000),
               +((m.end-s)/365.2564).toFixed(4),m.partial?"balance at birth":""]);
      (m.ads||[]).forEach(function(a){
        ad.push([moTgraha(m.lord),moTgraha(a.lord),
                 moDay((a.start-2440587.5)*86400000),moDay((a.end-2440587.5)*86400000),
                 +((a.end-a.start)/365.2564).toFixed(4)]);
      });
    });
    out.push({name:"Mahādaśā",
      cols:["Lord","Begins","Ends","Years","Note"], rows:md});
    out.push({name:"Antardaśā",
      cols:["Mahādaśā lord","Antardaśā lord","Begins","Ends","Years"], rows:ad});

  } else if(k==="bhava"){
    /* The twelve houses as the chosen division reads them, and then the same twelve
       across all sixteen, which is the sheet worth keeping. */
    var J=MO.J, V=mtView();
    /* "What it carries" is Ch. 11 and is identical in every division; "Read in
       <varga> for" is the division's own matter from Ch. 6. Two columns, because
       they are two different claims and only the second one moves. */
    var LN0=MT_VLENS[V.name]||MT_VLENS.D1;
    out.push({name:"Bhāvas in "+V.name,
      cols:["#","Sanskrit","What it carries (BPHS Ch. 11 — same in every division)",
            "Read in "+V.name+" for","Division exists to refine it","Rāśi","Lord","Occupants",
            "Varga BPHS assigns to this topic","Lagna of that varga"],
      rows:MT_BH.map(function(B,i){
        var v=MT_BHV[i+1], vg=null;
        if(v&&J.vargas) J.vargas.forEach(function(x){ if(x.varga===v) vg=x; });
        return [i+1,B.sa,B.sig,LN0.t,(LN0.k.indexOf(i+1)>=0)?"yes":"",
                mtRa(V.sign(i)),V.lord(i),V.occ(i).join(", ")||"—",
                v?(v+" · "+MT_VN[v]):"— none assigned —",
                vg?mtRa(vg.lagna):"—"]; })});
    out.push({name:"What each division is read for",
      cols:["Varga","The matter it refines (BPHS Ch. 6)","House(s) it exists to refine"],
      rows:(J.vargas||[]).map(function(v){
        var L=MT_VLENS[v.varga]||{t:"",k:[]};
        return [v.varga, L.t, L.k.length?L.k.join(", "):"— read whole —"]; })});
    var hdr=["#","Sanskrit"], keep=MO.opt.varga;
    (J.vargas||[]).forEach(function(v){ hdr.push(v.varga+" rāśi"); hdr.push(v.varga+" lord"); });
    var grid=MT_BH.map(function(B,i){ return [i+1,B.sa]; });
    (J.vargas||[]).forEach(function(v,vi){
      MO.opt.varga=vi; var W=mtView();
      for(var i=0;i<12;i++){ grid[i].push(mtRa(W.sign(i))); grid[i].push(W.lord(i)); }
    });
    MO.opt.varga=keep;
    out.push({name:"Every bhāva in every varga", cols:hdr, rows:grid});

  } else if(k==="rashi"){
    var J2=MO.J, L2=J2.lagna.rashi.idx;
    var rr=J2.rashi_rising_times&&J2.rashi_rising_times.rashis;
    out.push({name:"The twelve rāśis",
      cols:["#","Rāśi","Mode","Element","Lord","Limb of the Kālapuruṣa","House from your lagna",
            "Your grahas here","Rising minutes at your latitude","Share of the day %"],
      rows:MT_RA.map(function(nm,i){
        var mine=mtGrahas().filter(function(g){ return g.ri===i; })
                 .map(function(g){ return g.full+" "+g.d.toFixed(2)+"°"; });
        return [i+1,mtRa(i),MT_MO[i],MT_EL[i],mtLord(i),MT_LIMB[i],
                ((i-L2)%12+12)%12+1, mine.join(", ")||"—",
                rr&&rr[i]?Number(rr[i].rising_minutes.toFixed(1)):"",
                rr&&rr[i]?Number(rr[i].share_of_day_percent.toFixed(2)):""]; })});

  } else if(k==="nakfull"){
    var seg=40/3, gs=mtGrahas();
    out.push({name:"The twenty-seven",
      cols:["#","Nakṣatra","From °","To °","Viṃśottarī lord","Deity","Gaṇa",
            "Pāda 1","Pāda 2","Pāda 3","Pāda 4","Your grahas here"],
      rows:MT_NKN.map(function(nm,i){
        var b0=i*seg, b1=b0+seg, nav0=Math.floor(b0/(30/9));
        var mine=gs.filter(function(g){ var d=((g.sid%360)+360)%360; return d>=b0&&d<b1; })
                   .map(function(g){ return g.full+" "+(((g.sid%360)+360)%360).toFixed(2)+"°"; });
        return [i+1,nm,Number(b0.toFixed(4)),Number(b1.toFixed(4)),mtNLord(i),
                MT_NKD[i],MT_NKG[i],
                mtRa((nav0)%12),mtRa((nav0+1)%12),mtRa((nav0+2)%12),mtRa((nav0+3)%12),
                mine.join(", ")||"—"]; })});
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
      n=moWorkbook(sheets,"{{BRAND_SLUG}}-"+MO.scene+"-"+(nm||"chart").replace(/\s+/g,"-")+".xlsx");
    }catch(e){ err=e; }
    if(btn){ btn.disabled=false; btn.textContent="Export data (.xlsx)"; }
    var s=document.getElementById("moxlsmsg");
    if(s) s.textContent = err ? ("could not build the workbook: "+err.message)
                              : ("workbook downloaded · "+Math.round(n/1024)+" KB");
  },30);
}
