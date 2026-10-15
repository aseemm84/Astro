/* ---------- main ---------- */
window.__deriveForExport=deriveForExport;
window.__derive=derive;
window.buildKundliReport=function(J){
  __secN=0; __secList=[];
  try{ SENS=sensCompute(J); }catch(e){ SENS=null; } __secUsed={};
  var D=derive(J),LS=D.LS,H=[];
  H.push('<div class="kreport" id="kreport">');
  H.push('<div class="katoggle"><button type="button" id="k-depth" class="k-btn sec" aria-pressed="false">Show detailed analysis</button>'+
    '<span class="kmut"> Notes below each section are composed from this site\'s rules — a transparent synthesis, not BPHS quotations.</span></div>');
  // vitals
  var lg=D.P, cm=D.curMd;
  H.push('<div class="kcards">');
  H.push('<div class="kcard"><div class="k">Lagna</div><div class="v">'+SA[LS]+'</div><div class="s">'+dm(D.lagDeg)+' · '+padaLink(D.lagNak.name,D.lagNak.pada)+'</div></div>');
  if(D.P.Moon)H.push('<div class="kcard"><div class="k">Moon</div><div class="v">'+SA[D.P.Moon.sign]+'</div><div class="s">'+padaLink(D.P.Moon.nak,D.P.Moon.pada)+'</div></div>');
  if(D.ayan!=null)H.push('<div class="kcard"><div class="k">Ayanāṃśa</div><div class="v">'+D.ayan.toFixed(3)+'°</div><div class="s">sidereal (≈ Lahiri)</div></div>');
  if(cm)H.push('<div class="kcard"><div class="k">Current mahādaśā</div><div class="v">'+esc(cm.lord)+'</div><div class="s">to '+fmy(cm.end)+(D.nextMd?' · then '+esc(D.nextMd.lord):'')+'</div></div>');
  if(D.av&&D.av.sarva_total!=null)H.push('<div class="kcard"><div class="k">Ashtakavarga total</div><div class="v">'+D.av.sarva_total+'</div><div class="s">expected 337</div></div>');
  H.push('</div>');
  var HEAD=H.splice(0,H.length);   // report head (toggle + vitals) sits above the tabs; H now collects the full report
  H.push('<!--KINDEX-->');
  H.push(sec("Birth particulars","computed from the chart's own longitudes",basicsSection(D,J)));
  H.push(sec("How much rests on the birth minute","sensitivity",sensSummarySection(D,J)));
  H.push(sec("Conventions in use","what changes if you choose differently",sensForksSection(D,J)));
  H.push(sec("Special ascendants","computed lagnas",specialLagnaSection(D,J)));
  H.push(sec("Upagrahas","the shadowy points",upagrahaSection(D)));
  H.push(sec("Dhūmādi upagrahas","the five Sun-derived points",dhumadiSection(D)));

  // charts
  var d1s=function(h){return (LS+h-1)%12;},
      d1o=function(h){var a=[];D.planets.forEach(function(p){if(p.house===h)a.push(GL[p.en]+(p.retro?"℞":""));});if(h===1)a.unshift("Lg");return a;};
  var smap={};D.planets.forEach(function(p){(smap[p.sign]=smap[p.sign]||[]).push(GL[p.en]+(p.retro?"℞":""));});
  var chartsHtml='<div class="kcharts">'+northChart(d1s,d1o,"Rāśi (D1) — North Indian","houses fixed")+
     southChart(smap,LS,"Rāśi (D1) — South Indian","signs fixed");
  if(D.d9){var nlag=Math.floor(((D.lagna.sidereal_deg%360)+360)%360/(30/9))%12;
    chartsHtml+=northChart(function(h){return (nlag+h-1)%12;},
      function(h){var sg=(nlag+h-1)%12,a=[];Object.keys(D.d9).forEach(function(k){if(D.d9[k]===sg)a.push(GL[k]);});if(h===1)a.unshift("Lg");return a;},
      "Navāṃśa (D9)","lagna "+SA[nlag]);}
  chartsHtml+='</div><p class="klegend">Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rāhu · Ke Ketu · Lg Lagna · ℞ retrograde</p>';
  H.push(sec("The chart","rāśi and navāṃśa",chartsHtml+aChart(D)));
  H.push(sec("Chandra & Sūrya kuṇḍalī","the same chart from the Moon and the Sun",moonSunChartSection(D)));
  H.push(sec("Special ascendant charts","Bāhva, Horā and Ghaṭika as charts",specialLagnaCharts(D)));

  // grahas
  var rows=D.planets.map(function(p){
    var f=[];if(p.retro)f.push("retrograde");if(p.combust)f.push("combust ("+p.sep.toFixed(1)+"° from Sun)");
    if(p.digbala===p.house)f.push("dig bala");
    return '<tr><td><b>'+esc(p.iast)+'</b> <span class="kmut">'+esc(p.en)+'</span></td><td>'+SA[p.sign]+' '+dm(p.deg)+'</td>'+
     '<td class="knum">'+p.sid.toFixed(4)+'°</td><td>'+p.house+'</td><td>'+((D.owns[p.en]||[]).join(", ")||"—")+'</td>'+
     '<td class="knum">'+(p.speed!=null?(p.speed>=0?"+":"")+p.speed.toFixed(3):"—")+'</td>'+'<td>'+gbButton("dignity",p.en,chip(p.dig),"How this dignity was decided")+' <span class="kmut">'+esc(p.status||"")+'</span></td><td>'+padaLink(p.nak,p.pada)+'<br><span class="kmut">lord '+esc(p.naklord)+'</span></td>'+
     '<td>'+(p.avastha?esc(p.avastha)+(p.avpct!=null?' <span class="kmut">'+p.avpct+'%</span>':''):"—")+'</td>'+
     '<td class="kmut">'+(f.join("; ")||"—")+'</td></tr>';});
  H.push(sec("Grahas","position, dignity, state",
    tbl(["Graha","Rāśi &amp; degree","Sidereal","House","Owns","Speed/day","Dignity &amp; status","Nakṣatra · pāda","Avasthā","State"],rows)+yuddhaSection(D)+aGrahas(D)));
  H.push(sec("Avasthās","the parallel state schemes",avasthaSection(D)));
  H.push(sec("Bhāva Chalit","cusp-based houses",chalitSection(D)));
  H.push(sec("Bhāva (Sripati)","Porphyry cusps and bhāva spaṣṭa",sripatiSection(D)));

  // bhavas
  if(D.bhavas.length){
    rows=D.bhavas.map(function(b){
      var lp=D.P[b.lord],ld=lp?esc(b.lord)+" — H"+lp.house+" "+chip(lp.dig):esc(b.lord);
      var sc=b.sav==null?"":(b.sav>=30?"#1c6b46":(b.sav>=25?"#b08a2e":"#a1493a"));
      return '<tr><td><b>'+b.n+'</b> '+esc(b.sa)+'</td><td>'+SA[b.sign]+'</td><td>'+ld+'</td>'+
       '<td>'+(b.occ.join(", ")||"—")+'</td><td class="kmut">'+(b.cls.join(" · ")||"—")+'</td>'+
       '<td class="knum" style="color:'+sc+';font-weight:700">'+(b.sav==null?"—":b.sav)+'</td></tr>';});
    H.push(sec("Bhāvas","lord, occupants, support",
      tbl(["Bhāva","Rāśi","Lord &amp; placement","Occupants","Class","SAV"],rows)+aBhavas(D)));}
  H.push(sec("Graha dṛṣṭi","natal aspects",aspectSection(D)+aAspects(D)));
  H.push(sec("Rāśi dṛṣṭi","sign aspects",rashiDrishtiSection(D)));
  H.push(sec("Argala","intervention and obstruction",argalaSection(D)));

  // ashtakavarga
  if(D.av&&D.av.bhinna){
    var body='<p class="knote">Sarvāṣṭakavarga per house. Above 30 is well-supported, 25–29 average, below 25 under-supported.</p>'+savChart(D);
    var hd='<th>Graha</th>';for(var h=1;h<=12;h++)hd+='<th>'+SA[(LS+h-1)%12].slice(0,4)+'<br><span class="kthin">H'+h+'</span></th>';
    hd+='<th>Total</th>';
    var brows=D.av.bhinna.map(function(b){
      var c='';for(var h=1;h<=12;h++){var sg=(LS+h-1)%12,v=b.bindus[sg],a=(v-1)/6;
        var bg=v>=4?"rgba(28,107,70,"+(0.06+a*0.42).toFixed(2)+")":"rgba(161,73,58,"+(0.06+(4-v)/3*0.3).toFixed(2)+")";
        c+='<td class="kb" style="background:'+bg+'">'+v+'</td>';}
      return '<tr><td><b>'+esc(b.graha)+'</b></td>'+c+'<td class="knum"><b>'+b.total+'</b></td></tr>';});
    var sc='';for(var h2=1;h2<=12;h2++)sc+='<td class="kb kbsav">'+D.av.sarva[(LS+h2-1)%12]+'</td>';
    brows.push('<tr><td><b>SAV</b></td>'+sc+'<td class="knum"><b>'+D.av.sarva_total+'</b></td></tr>');
    body+='<h4 class="ksub">Bhinnāṣṭakavarga</h4><div class="ktwrap"><table class="ktbl khm"><thead><tr>'+hd+'</tr></thead><tbody>'+brows.join("")+'</tbody></table></div>';
    H.push(sec("Ashtakavarga","benefic points",body+avCharts(D)+shodhanaSection(D)+aAv(D)));
    H.push(sec("Divisional ashtakavarga","benefic points inside D9 and D10",vargaAvSection(D)));}

  // vargas
  if(D.vargas.length){
    var hd2='<th>Division</th>'+ORD.map(function(k){return "<th>"+GL[k]+"</th>";}).join("");
    var vrows=D.vargas.map(function(v){
      var c=ORD.map(function(k){var sg=v.pos[k];if(sg==null)return "<td>—</td>";var dg=v.dig[k];
        return '<td style="background:'+DIGBG[dg]+';color:'+DIGC[dg]+';font-weight:600;text-align:center">'+SA[sg].slice(0,4)+'</td>';}).join("");
      return '<tr><td><b>'+esc(v.code)+'</b> '+esc(v.sa||"")+'<br><span class="kmut">'+esc(v.en||"")+'</span></td>'+c+'</tr>';});
    var vbody='<p class="knote">Each cell is the sign a planet occupies in that division, shaded by its dignity there.</p>'+
      '<div class="ktwrap"><table class="ktbl"><thead><tr>'+hd2+'</tr></thead><tbody>'+vrows.join("")+'</tbody></table></div>'+
      '<p class="klegend">Vargottama (same sign in D1 and D9): '+(D.vargottama.length?D.vargottama.join(", "):"none in this chart")+'.</p>';
    H.push(sec("Ṣoḍaśa varga","sixteen divisions",vbody+aVarga(D)));
    H.push(sec("Divisional charts","each varga as its own chart",vargaCharts(D)+aDivisional(D)));
    H.push(sec("Ṣoḍaśavarga strength","a transparent Vimśopaka-style index",vimsopaka(D)));}
  if(J&&J.shadbala&&!J.shadbala.error)
    H.push(sec("Ṣaḍbala","sixfold strength",shadbalaSection(D,J)));
  if(J&&J.shadbala&&!J.shadbala.error){
    H.push(sec("Bhāva Bala","strength of the houses",bhavaBalaSection(D,J)));
    H.push(sec("Iṣṭa & Kaṣṭa phala","benefic and difficult potency",ishtaKashtaSection(D,J)));}
  H.push(sec("Kārakāṃśa","the soul's navāṃśa lagna",karakamsaSection(D)));
  H.push(sec("Ārūḍha & Kārakāṃśa charts","two further reference charts",alKarakamsaSection(D)));
  H.push(sec("Sudarśana Chakra","Lagna, Candra and Sūrya together",sudarshana(D)));
  H.push(sec("Planetary friendship","naisargika · tātkālika · pañchadhā",friendshipSection(D)));

  // yogas
  if(D.yogas.length){
    var pres=D.yogas.filter(function(y){return y.present;}),abs=D.yogas.filter(function(y){return !y.present;});
    function srcCell(y){
      var s=y.source||"BPHS";
      var later=s.indexOf("later tradition")===0;
      return '<td class="'+(later?"kmut ylater":"kmut")+'">'+esc(later?"later tradition":s)+'</td>';
    }
    var nLater=D.yogas.filter(function(y){return (y.source||"").indexOf("later tradition")===0;}).length;
    var yb='<p class="knote">'+D.yogas.length+' combinations are tested, '+(D.yogas.length-nLater)+
      ' of them defined in the uploaded BPHS text and '+nLater+' drawn from later tradition. The source '+
      'column says which, and a yoga taken from later tradition is never presented as Parāśara&rsquo;s own.</p>';
    if(pres.length)yb+='<h4 class="ksub">Present</h4>'+tbl(["Yoga","Category","Why it forms","Strength","Source"],
      pres.map(function(y){var col=y.category.indexOf("Subtractive")===0||y.category.indexOf("Doṣa")===0?"#a1493a":"#1c6b46";
        return '<tr><td><b style="color:'+col+'">'+esc(y.iast||y.key)+'</b></td><td>'+esc(y.category)+
          '</td><td>'+esc(y.detail)+'</td><td>'+esc(y.strength||"—")+'</td>'+srcCell(y)+'</tr>';}));
    if(abs.length)yb+='<h4 class="ksub">Tested, not formed</h4>'+tbl(["Yoga","Category","Reason","Source"],
      abs.map(function(y){return '<tr><td>'+esc(y.iast||y.key)+'</td><td>'+esc(y.category)+
        '</td><td class="kmut">'+esc(y.detail)+'</td>'+srcCell(y)+'</tr>';}));
    var notes=D.yogas.filter(function(y){return (y.source||"").indexOf("later tradition")===0 && y.source.length>60;});
    if(notes.length){
      yb+='<h4 class="ksub">Where the definition is disputed</h4><div class="kbox">'+
        notes.map(function(y){ return '<b>'+esc(y.iast||y.key)+'</b> — '+esc(y.source); }).join('<br><br>')+
        '</div>';
    }
    yb+='<div class="kbox">A yoga is a promise, not a delivery — it must be activated by a daśā and is '+
      'tempered by the strength and dignity of the planets forming it. These verdicts are the engine&rsquo;s '+
      'computations against the stated rule, not quotations from BPHS. <b>Maṅgala Doṣa and Kāla Sarpa in '+
      'particular are used to make real decisions about marriage;</b> both are shown here with the convention '+
      'applied and any mitigations found, and neither should be read as a verdict.</div>';
    H.push(sec("Yogas","detected combinations",yb+aYogas(D)));}

  // karakas & arudhas
  var kb='';
  if(D.ckar.length)kb+='<h4 class="ksub">Chara kārakas</h4>'+tbl(["Rank","Kāraka","Graha","Degree","Signifies"],
    D.ckar.map(function(c){return '<tr><td>'+c.rank+'</td><td><b>'+esc(c.label_short)+'</b></td><td>'+esc(EN[c.graha]||c.graha)+'</td><td class="knum">'+(c.deg_in_sign!=null?c.deg_in_sign.toFixed(4)+"°":"")+'</td><td class="kmut">'+esc(c.label_en||"")+'</td></tr>';}));
  if(D.arudhas.length)kb+='<h4 class="ksub">Bhāva ārūḍhas</h4>'+tbl(["Pada","Rāśi","House from lagna"],
    D.arudhas.map(function(a){var sg=a.arudha_rashi_idx;
      return '<tr'+((a.arudha_label==="AL"||a.arudha_label==="A12")?' class="khl"':'')+'><td><b>'+esc(a.arudha_label)+'</b></td><td>'+SA[sg]+'</td><td>'+(((sg-LS)%12+12)%12+1)+'</td></tr>';}));
  if(kb)H.push(sec("Kārakas & ārūḍhas","significators and image-points",kb));

  // dasha
  if(D.mds){
    var db='<p class="knote">Birth Moon in <b>'+esc(D.birthNak.nak)+'</b> (lord '+esc(D.birthNak.lord)+'), '+
      (D.birthNak.frac*100).toFixed(1)+'% traversed — a balance of '+gbButton('balance','','<b>'+D.birthNak.balance.toFixed(3)+' years</b>','Show how the balance was computed')+' at birth.</p>'+timeline(D);
    db+='<h4 class="ksub">Mahādaśā sequence</h4>'+tbl(["Lord","Years","From","To",""],
      D.mds.map(function(m){var cur=(D.nowJd>=m.start&&D.nowJd<m.end);
        return '<tr'+(cur?' class="khl"':'')+'><td><b>'+esc(m.lord)+'</b>'+(cur?' ← current':'')+'</td><td class="knum">'+m.years.toFixed(2)+
        '</td><td>'+fdate(m.start)+'</td><td>'+fdate(m.end)+'</td><td class="kmut">'+(m.partial?"balance at birth":"")+'</td></tr>';}));
    var LV=levelsAt(D,D.nowJd);
    if(LV){db+='<h4 class="ksub">Running period, all five levels</h4>';
      LV.forEach(function(x){ var pct=Math.max(0,Math.min(100,(D.nowJd-x.start)/(x.end-x.start)*100));
        db+=prog(x.lvl,x.lord,pct,x.start,x.end); });
      var eng=D.vim&&D.vim.antara?(EN[D.vim.antara.lord]||D.vim.antara.lord):null;
      if(eng&&LV[1]&&eng!==LV[1].lord)
        db+='<div class="kbox"><b>Differs from the engine here</b>The chart engine reports the antardaśā as '+esc(eng)+
          ', because it compresses the first mahādaśā\'s sub-periods to fit the balance remaining at birth. The '+
          'standard method, used here, keeps every sub-period at its natural length and drops the part elapsed '+
          'before birth — the method that reproduces professional software.</div>';}
    if(D.nextMd){
      db+='<h4 class="ksub">Next mahādaśā — '+esc(D.nextMd.lord)+', antardaśā schedule</h4>';
      db+=tbl(["Period","Years","From","To","Sub-lord in natal chart"],
        D.antars(D.nextMd).map(function(a){var pl=D.P[a.lord];
          return '<tr><td>'+esc(D.nextMd.lord)+' → <b>'+esc(a.lord)+'</b></td><td class="knum">'+a.years.toFixed(2)+
          '</td><td>'+fmy(a.start)+'</td><td>'+fmy(a.end)+'</td><td class="kmut">'+(pl?esc(pl.dig)+", H"+pl.house:"—")+'</td></tr>';}));}
    H.push(sec("Vimśottarī daśā","120-year cycle",db+aDasha(D)));
    H.push(sec("Antardaśā & pratyantardaśā","complete 120-year tree",dashaTreeSection(D)));}
  H.push(sec("Aṣṭottarī daśā","the conditional 108-year cycle",ashtottariSection(D)));
  H.push(sec("Yoginī daśā","the 36-year cycle",yoginiSection(D)));

  // transits
  if(D.transits.length){
    var tb=tbl(["Graha","Rāśi","House","Nakṣatra · pāda","Motion"],
      D.transits.map(function(t){var sg=ridx(t.rashi),d=(t.rashi&&t.rashi.degInSign!=null)?dm(t.rashi.degInSign):"";
        return '<tr><td><b>'+esc(t.iast||t.en)+'</b></td><td>'+SA[sg]+' '+d+'</td><td>'+(((sg-LS)%12+12)%12+1)+'</td>'+
        '<td>'+padaLink((t.nakshatra&&t.nakshatra.en)||"",t.nakshatra_pada)+'</td>'+
        '<td class="kmut">'+(t.retrograde?"retrograde":"direct")+'</td></tr>';}));
    var tight=D.trel.filter(function(r){return r.significance==="exact"||r.significance==="applying";})
      .sort(function(a,b){return a.orb_deg-b.orb_deg;});
    if(tight.length)tb+='<h4 class="ksub">Tight contacts <span class="kmut">('+tight.length+' of '+D.trel.length+')</span></h4>'+
      tbl(["Transiting","Aspect","Natal","Orb","Phase"],tight.map(function(r){
        var col=r.significance==="exact"?"#a1493a":"#b08a2e";
        return '<tr><td>'+esc(r.transit_graha)+'</td><td>'+esc(r.aspect)+'</td><td>'+esc(r.natal_graha)+'</td>'+
        '<td class="knum">'+r.orb_deg.toFixed(2)+'°</td><td style="color:'+col+';font-weight:600">'+esc(r.significance)+'</td></tr>';}));
    var cds='';
    if(D.sade)cds+='<div class="kcard"><div class="k">Sade Sati</div><div class="v">'+(D.sade.active?"Active":"Inactive")+
      '</div><div class="s">'+esc(D.sade.phase||"")+(D.sade.days_remaining_in_phase?' · ~'+Math.round(D.sade.days_remaining_in_phase)+' days left':'')+'</div></div>';
    if(D.panch){cds+='<div class="kcard"><div class="k">Tithi</div><div class="v">'+esc(D.panch.tithi_sa)+'</div><div class="s">'+esc(D.panch.paksha_sa)+' pakṣa</div></div>';
      cds+='<div class="kcard"><div class="k">Vāra</div><div class="v">'+esc(D.panch.vara_sa)+'</div><div class="s">Nakṣatra '+esc(D.panch.nakshatra_sa)+'</div></div>';
      cds+='<div class="kcard"><div class="k">Yoga / Karaṇa</div><div class="v">'+esc(D.panch.yoga_sa)+'</div><div class="s">Karaṇa '+esc(D.panch.karana_sa)+'</div></div>';}
    if(cds)tb+='<div class="kcards">'+cds+'</div>';
    H.push(sec("Current sky",D.asof?"as of "+esc(D.asof.slice(0,10)):"",tb));
    H.push(sec("Gochara","transits read from the natal Moon",gocharaSection(D)));
    H.push(sec("Kakṣā transit","the finest ashtakavarga layer",kakshaSection(D)));}
  H.push(sec("Sade Sati timeline","Saturn over the Moon, past and future",sadeSatiSection(D)));
  H.push(sec("Ingress & retrograde","the next two years",ingressSection(D)));
  H.push(sec("Eclipses","upcoming, placed in this chart",eclipseSection(D)));
  H.push(sec("Day tools","muhūrta divisions of the birth day",dayToolsSection(D)));

  if(J.__crosscheck)
    H.push('<div class="kbox"><b>Cross-checked against the built-in engine</b>Positions came from the remote '+
      'engine; the built-in engine recomputed the same chart independently. Largest difference: <b>'+
      J.__crosscheck.max_arcsec.toFixed(0)+'&Prime;</b> ('+esc(J.__crosscheck.graha)+'), lagna '+
      J.__crosscheck.lagna_arcsec.toFixed(0)+'&Prime;. Ṣaḍbala and Bhayāta are not returned by the remote engine, '+
      'so they were computed locally from the same birth data.</div>');
  /* Paired with the stamp engine.js writes — an identifier, not branding. */
  if((J.substrate_stamp||"").indexOf("LearnHoro built-in")>=0)
    H.push('<div class="kbox"><b>Computed in your browser</b>Every figure here — positions, ashtakavarga, yogas, Bhay\u0101ta/Bhabhoga and the da\u015b\u0101 tree — was computed locally by the built-in engine (astronomy-engine, MIT) with the Lahiri ayan\u0101\u1e43\u015ba fitted to Swiss Ephemeris; no network call was made. \u0100r\u016b\u1e0dha exception cases follow the rule this site documents (the 4th from the house when the pada falls in the 7th), which differs from the remote engine\'s convention.</div>');
  H.push('<div class="kbox kwarn"><b>What this is</b>A technical presentation of a traditional system, for study and reflection — not a prediction, diagnosis, or basis for medical, financial, legal or personal decisions. Positions and engine-computed values come from the chart engine; houses, nakṣatra-pādas, combustion, Moolatrikona by degree and the daśā sequence are recomputed here. Charts with planets at sign edges are sensitive to the exact birth time.</div>');
  var full=H.join("").replace('<!--KINDEX-->', sectionIndex());
  // runtime hooks for the interactive panes (events, compatibility, today's tools)
  window.__kApi={
    events:function(list){ try{ return eventsAnalyze(D,list||[]); }catch(e){ return paneErr("Life events",e); } },
    match:function(J2,opt){ return matchHtml(D,J2,opt||{}); },
    dayBlock:function(lat,lon,tz,label){ return dayBlock(D,lat,lon,tz,label); }
  };
  function pane(fn,name){ try{ return fn(); }catch(e){ return paneErr(name,e); } }
  var PANES=[
    ["overview","Overview",function(){ return glancePane(D,J)+'<h4 class="ksub">Explore the chart</h4>'+interactiveChart(D,J); }],
    ["now","Now",function(){ return nowPane(D,J); }],
    ["timeline","Life timeline",function(){ return timelinePane(D); }],
    ["path","Reading path",function(){ return pathPane(D,J); }],
    ["events","Life events",function(){ return eventsPane(); }],
    ["sky","Sky",function(){ return skyPane(D,J); }],
    ["starwheel","Star wheel",function(){ return starWheelPane(D,J); }],
    ["motion","Motion",function(){ return motionPane(D,J); }],
    ["btime","Birth-time check",function(){ return birthTimePane(D); }],
    ["match","Compatibility",function(){ return matchPane(); }],
    ["full","Full report",function(){ return '<div class="krprint">'+
      '<button type="button" class="k-btn" data-krprint>Print full report ('+
      (PANES.length-1)+' tabs)</button>'+
      '<span class="krphint">Builds one PDF of every tab — the daśā tree fully expanded, all sixteen '+
      'divisional wheels, and the star wheel with every group shown. The input form, the tab bar and '+
      'every control are left out, and the sky views are cast at the birth moment.</span></div>'+
      '<div class="krprint krdash">'+
      '<a class="k-btn" href="dashboard.html" target="_blank" rel="noopener" data-kdash>Open the visual dashboard &#8599;</a>'+
      '<span class="krphint">A separate page of interactive charts, including the divisional analysis '+
      'that is not in these tabs: every varga read as a chart of its own, dignity across all sixteen, '+
      'whole-sign dṛṣṭi within a division, and ashtakavarga for each. '+
      'The chart you are looking at is handed over automatically. It has its own Save-as-PDF button.</span>'+
      '</div>'+full; }]
  ];
  var tabs='<div class="ktabs" role="tablist" aria-label="Report views">'+PANES.map(function(p,i){
    return '<button type="button" role="tab" id="kt-'+p[0]+'" data-ktab="'+p[0]+'" aria-controls="kp-'+p[0]+'" aria-selected="'+(i?"false":"true")+'"'+
      (i?' tabindex="-1"':' class="on"')+'>'+esc(p[1])+(p[0]==="full"?' <span class="kmut">('+__secList.length+' sections)</span>':'')+'</button>'; }).join("")+'</div>';
  var body=PANES.map(function(p,i){
    return '<div class="kpane" role="tabpanel" id="kp-'+p[0]+'" data-kpane="'+p[0]+'" aria-labelledby="kt-'+p[0]+'"'+(i?' hidden':'')+'>'+
      '<h3 class="kpaneh">'+esc(p[1])+'</h3>'+pane(p[2],p[1])+'</div>'; }).join("");
  /* Three navigations, one list of buttons. Wide: a rail down the left, so all eleven
     names are legible at once and none is hidden off the edge. Medium: the strip.
     Narrow: a sheet behind this trigger, because a horizontal scroller on a phone hides
     most of the tabs behind a gesture there is nothing to suggest. */
  var sel='<button type="button" class="ktabsel" aria-expanded="false" aria-haspopup="true" '+
    'aria-label="Choose a report view">'+
    '<span class="ktabsell">View</span><span class="ktabselt">'+esc(PANES[0][1])+'</span>'+
    '<span class="ktabselc" aria-hidden="true">▾</span></button>';
  return HEAD.join("")+'<div class="ktabwrap">'+sel+tabs+
    '<div class="kpanes">'+body+'</div></div></div>';
};
})();

