/* ================= Ayanāṃśa — the other axis of uncertainty =================

   The birth-time pane asks how much of this chart depends on the recorded
   minute. This one asks the same question of the other open choice, and the
   two are genuinely different questions: birth time moves the lagna about
   21.8 times faster than it moves the Moon, while the ayanāṃśa moves every
   sidereal longitude by exactly the same amount. That difference is why the
   two panes look alike and read differently — a birth-time error shears the
   chart, an ayanāṃśa change slides it.

   Everything here is computed by rigid shift rather than by sixteen full
   recasts. That is not an approximation: the ayanāṃśa enters the engine at
   exactly one place, as a constant subtracted from every tropical longitude,
   so sid(a) = sid(a₀) + (a₀ − a) is the engine's own arithmetic rearranged.
   ayanCheck() in the self-test asserts that identity against real recasts of
   all sixteen modes, so if the engine ever stops working that way the suite
   fails rather than this pane quietly lying.

   One consequence worth stating because it is counter-intuitive: a LARGER
   ayanāṃśa gives a SMALLER sidereal longitude. Every "earlier/later" below is
   written in terms of the ayanāṃśa value, not of the zodiac. */

/* The modes, ordered by value rather than by name, so the tables and the ruler
   below read left-to-right in the same direction. */
function ayanList(jd){
  var M=window.__ayanModes||{}, F=window.__ayanFor;
  if(!F) return [];
  return Object.keys(M).map(function(k){
    return {key:k,name:(M[k]&&M[k].name)||k,deg:F(k,jd)};
  }).sort(function(a,b){ return a.deg-b.deg; });
}
function ayanNameOf(J){
  var k=(J&&J.input&&J.input.ayanamsa)||"lahiri";
  var M=(window.__ayanModes||{})[k];
  return (J&&J.ayanamsa_name)||(M&&M.name)||k;
}
/* The picker that sits inside the vitals card. It is a plain <select> rather
   than sixteen buttons because sixteen buttons beside a number is a wall; the
   pane below carries the comparison that makes the choice meaningful. */
function ayanQuickPick(J){
  var L=ayanList(J&&J.jd_utc);
  if(!L.length) return "";
  var cur=(J&&J.input&&J.input.ayanamsa)||"lahiri";
  return '<select class="kayanpick" id="k-ayan-live" aria-label="Recast with a different ayanāṃśa">'+
    L.map(function(m){ return '<option value="'+esc(m.key)+'"'+(m.key===cur?' selected':'')+'>'+
      esc(m.name)+' · '+m.deg.toFixed(3)+'°</option>'; }).join("")+'</select>';
}

/* ---- the shifted chart ----
   Returns everything the tables below need for one ayanāṃśa value. */
function ayanSnap(D,a){
  var s=D.ayan-a, seg=40/3;
  var lag=(((D.lagna.sidereal_deg||0)+s)%360+360)%360;
  var LS=Math.floor(lag/30)%12;
  var P={};
  D.planets.forEach(function(p){
    var sid=((p.sid+s)%360+360)%360, sg=Math.floor(sid/30)%12;
    P[p.en]={sid:sid,sign:sg,deg:sid-sg*30,house:((sg-LS)%12+12)%12+1};
  });
  var out={a:a,lagSid:lag,LS:LS,lagDeg:lag-LS*30,P:P,
           d9:vargaLagna("D9",lag),d10:vargaLagna("D10",lag),d12:vargaLagna("D12",lag)};
  if(P.Moon){
    var mn=P.Moon.sid, ni=Math.floor(mn/seg);
    out.nakIdx=ni; out.nak=NAKS[ni]; out.nakLord=NL9[ni%9];
    out.balance=VY[out.nakLord]*(1-(mn-ni*seg)/seg);
  }
  return out;
}
/* Mahā/antar in force at a given jd, from a shifted snapshot. */
function ayanDashaAt(D,snap,jd){
  if(!snap.nakLord) return null;
  var i0=VSEQ.indexOf(snap.nakLord), t=D.jd, i=0, first=true;
  for(var g=0; g<40; g++){
    var lord=VSEQ[(i0+i)%9], yr=first?snap.balance:VY[lord], end=t+yr*DPY;
    if(jd<end){
      var s=t, j0=VSEQ.indexOf(lord);
      for(var k=0;k<9;k++){
        var al=VSEQ[(j0+k)%9], ay=yr*VY[al]/120;
        if(jd<s+ay*DPY) return {md:lord,ad:al,mdEnd:end};
        s+=ay*DPY;
      }
      return {md:lord,ad:VSEQ[(j0+8)%9],mdEnd:end};
    }
    t=end; first=false; i++;
  }
  return null;
}
/* How far the ayanāṃśa may move before this longitude leaves its sign (or
   nakṣatra). Raising the ayanāṃśa lowers the longitude, so the room above is
   the degrees already travelled into the division. */
function ayanWindow(sid,width){
  var x=((sid%360)+360)%360, into=x-Math.floor(x/width)*width;
  return {up:into,down:width-into};
}
/* A sign is 30° wide, so one edge of a placement's window is routinely twenty
   or thirty degrees away — further than the whole span of published ayanāṃśas,
   and sometimes negative. Printing "−3.966° – 26.034°" was arithmetically
   correct and read as a fault. An edge no standard could reach is reported as
   unreachable rather than as a number nobody can use. */
function ayanRange(lo,hi,X0,X1){
  var loR=lo>X0-2, hiR=hi<X1+2;
  if(loR&&hiR) return lo.toFixed(3)+'° – '+hi.toFixed(3)+'°';
  if(loR)      return 'above '+lo.toFixed(3)+'°';
  if(hiR)      return 'below '+hi.toFixed(3)+'°';
  return '<span class="kmut">any published value</span>';
}

function ayanPane(D,J){
  if(!window.__ayanModes||!window.__ayanFor)
    return '<p class="kmut">Needs the built-in engine.</p>';
  var L=ayanList(D.jd);
  if(!L.length) return '<p class="kmut">No ayanāṃśa table available.</p>';
  var CUR=(J.input&&J.input.ayanamsa)||"lahiri";
  var base=ayanSnap(D,D.ayan);
  var lo=L[0].deg, hi=L[L.length-1].deg, pad=(hi-lo)*0.06+0.2;
  var X0=lo-pad, X1=hi+pad;

  /* ---------- 1. every standard against this chart ---------- */
  var rows=L.map(function(m){
    var S=ayanSnap(D,m.deg), dd=ayanDashaAt(D,S,D.nowJd);
    var moved=ORD.filter(function(g){ return S.P[g]&&base.P[g]&&S.P[g].sign!==base.P[g].sign; });
    var hmoved=ORD.filter(function(g){ return S.P[g]&&base.P[g]&&S.P[g].house!==base.P[g].house; });
    return '<tr'+(m.key===CUR?' class="khl"':'')+'>'+
      '<td><b>'+esc(m.name)+'</b>'+(m.key===CUR?' <span class="kmut">← in use</span>':
        ' <button type="button" class="k-btn sec kayango" data-kayan="'+esc(m.key)+'">use</button>')+'</td>'+
      '<td class="knum">'+m.deg.toFixed(4)+'°</td>'+
      '<td>'+SA[S.LS]+' '+dm(S.lagDeg)+'</td>'+
      '<td>'+(S.nak?esc(S.nak):'—')+'</td>'+
      '<td>'+(S.nakLord?esc(S.nakLord)+' · '+S.balance.toFixed(2)+' y':'—')+'</td>'+
      '<td>'+(dd?esc(dd.md)+'–'+esc(dd.ad):'—')+'</td>'+
      '<td>'+SA[S.d9]+'</td>'+
      '<td>'+(m.key===CUR?'<span class="kmut">— baseline</span>':
        (moved.length?'<b>'+moved.map(function(g){return GL[g];}).join(" ")+'</b> sign':'')+
        (hmoved.length?(moved.length?' · ':'')+hmoved.map(function(g){return GL[g];}).join(" ")+' house':'')+
        (!moved.length&&!hmoved.length?'<span class="kgood">identical</span>':''))+'</td></tr>';
  }).join("");

  /* ---------- 2. what holds, and what does not ---------- */
  var inv=[], varies=[];
  ORD.concat(["__lag"]).forEach(function(g){
    var seen={};
    L.forEach(function(m){ var S=ayanSnap(D,m.deg);
      seen[g==="__lag"?S.LS:(S.P[g]?S.P[g].sign:-1)]=1; });
    var ks=Object.keys(seen);
    (ks.length===1?inv:varies).push({g:g,n:ks.length});
  });
  var nakSet={}; L.forEach(function(m){ var S=ayanSnap(D,m.deg); if(S.nak) nakSet[S.nak]=1; });

  /* margins for the chart as cast */
  var mrows=[["Lagna",D.lagna.sidereal_deg,30]].concat(
      ORD.map(function(g){ return [g,D.P[g]?D.P[g].sid:null,30]; }))
    .concat(D.P.Moon?[["Moon — nakṣatra",D.P.Moon.sid,40/3]]:[])
    .filter(function(r){ return r[1]!=null; })
    .map(function(r){
      var w=ayanWindow(r[1],r[2]);
      var tight=Math.min(w.up,w.down);
      var v=tight<0.5?'<span class="kbad">on the edge</span>':tight<1.5?'<span class="kmid">close</span>':'<span class="kgood">clear</span>';
      var flipUp=D.ayan+w.up, flipDn=D.ayan-w.down;
      var reach=L.filter(function(m){ return m.deg>=flipUp||m.deg<=flipDn; }).length;
      return '<tr><td><b>'+esc(r[0])+'</b></td>'+
        '<td class="knum">'+w.down.toFixed(2)+'°</td><td class="knum">'+w.up.toFixed(2)+'°</td>'+
        '<td class="knum">'+ayanRange(flipDn,flipUp,X0,X1)+'</td>'+
        '<td class="knum">'+reach+' of '+L.length+'</td><td>'+v+'</td></tr>';
    }).join("");

  /* ---------- 3. the ruler ---------- */
  var RW=940, LX=132, RX=14, STEP=(X1-X0)/460;
  var xr=function(a){ return LX+(a-X0)/(X1-X0)*(RW-LX-RX); };
  var LANES=[["Lagna",function(S){return SA[S.LS];},function(S){return S.LS;}],
             ["Moon nakṣatra",function(S){return S.nak||"—";},function(S){return S.nakIdx;}],
             ["First daśā",function(S){return S.nakLord||"—";},function(S){return S.nakIdx==null?-1:S.nakIdx%9;}]]
    .concat(ORD.map(function(g){ return [g,function(S){return SA[S.P[g].sign];},function(S){return S.P[g].sign;}]; }))
    .concat([["D9 lagna",function(S){return SA[S.d9];},function(S){return S.d9;}],
             ["D10 lagna",function(S){return SA[S.d10];},function(S){return S.d10;}]]);
  /* One pass of snapshots, shared by every lane. Snapping inside each lane's
     own loop recomputed the same fourteen charts fourteen times over. */
  var SAMP=[];
  for(var sa=X0; sa<=X1+1e-9; sa+=STEP) SAMP.push({a:sa,S:ayanSnap(D,sa)});
  if(SAMP[SAMP.length-1].a<X1) SAMP.push({a:X1,S:ayanSnap(D,X1)});
  var bands='', y0=26, RH=22;
  LANES.forEach(function(ln,li){
    var y=y0+li*RH, prev=null, segS=X0, prevLab='';
    bands+='<text x="'+(LX-8)+'" y="'+(y+14)+'" class="lab">'+esc(ln[0])+'</text>';
    for(var si=0; si<SAMP.length; si++){
      var a=SAMP[si].a, S=SAMP[si].S, k=ln[2](S), lb=ln[1](S);
      if(prev!==null&&(k!==prev||si===SAMP.length-1)){
        var x1=xr(segS), x2=xr(a), w=x2-x1;
        var isCur=(D.ayan>=segS&&D.ayan<a);
        bands+='<g><title>'+esc(ln[0])+' '+esc(prevLab)+' · ayanāṃśa '+segS.toFixed(3)+'° – '+a.toFixed(3)+'°</title>'+
          '<rect x="'+x1.toFixed(1)+'" y="'+y+'" width="'+Math.max(w,0.6).toFixed(1)+'" height="'+(RH-4)+
          '" fill="'+(isCur?"#e9dcb5":(li%2?"#dfe6ef":"#eef1f5"))+'" stroke="#fff" stroke-width="0.8"/>';
        if(w>30) bands+='<text x="'+(x1+w/2).toFixed(1)+'" y="'+(y+13)+'" class="bl" style="fill:#1d2340">'+
          esc(String(prevLab).slice(0,4))+'</text>';
        bands+='</g>'; segS=a;
      }
      prev=k; prevLab=lb;
    }
  });
  /* The sixteen standards are not spread evenly — several sit within a tenth
     of a degree of each other, and Āryabhaṭa and the Swiss Sūrya Siddhānta are
     the same series to four decimals. Writing a label at every mark put four
     or five names on top of one another at the left of the ruler, which is
     what made the strip unreadable.

     Each mark still gets its line and its hover title, because those are what
     the ruler is for. A NAME is written only where there is room for one: the
     labels are laid out left to right and one is skipped unless it clears the
     last one drawn. Marks that lose their label are not lost — they are the
     ones you read by hovering, and the table above names every one of them in
     order anyway. */
  var HH=y0+LANES.length*RH+34, marks='', lastLab=-1e9, LABGAP=13;
  L.forEach(function(m){
    var xx=xr(m.deg), cur=(m.key===CUR);
    marks+='<g><title>'+esc(m.name)+' — '+m.deg.toFixed(4)+'°</title>'+
      '<line x1="'+xx.toFixed(1)+'" y1="18" x2="'+xx.toFixed(1)+'" y2="'+(HH-26)+
      '" stroke="'+(cur?"#a1493a":"#b9ad90")+'" stroke-width="'+(cur?2:0.7)+
      '"'+(cur?'':' stroke-dasharray="2 3"')+'/>';
    /* the mode in use always gets its name, whatever it would collide with */
    if(cur || xx-lastLab>=LABGAP){
      lastLab=Math.max(lastLab,xx);
      marks+='<text x="'+xx.toFixed(1)+'" y="14" class="ty'+(cur?' tycur':'')+
        '" transform="rotate(-90 '+xx.toFixed(1)+' 14)" style="text-anchor:start">'+
        esc(m.name.replace(/—.*$/,"").split("(")[0].trim().split(" ")[0].slice(0,10))+'</text>';
    }
    marks+='</g>';
  });
  for(var t=Math.ceil(X0);t<=X1;t++){ var xt=xr(t);
    marks+='<text x="'+xt.toFixed(1)+'" y="'+(HH-8)+'" class="ty">'+t+'°</text>'; }
  var svg='<svg viewBox="0 0 '+RW+' '+HH+'" class="kwsvg kruler kayanruler" role="img" '+
    'aria-label="How each part of the chart changes across the whole range of published ayanāṃśas">'+
    bands+marks+'</svg>';

  /* ---------- 4. the daśā clock ----------
     The lagna's rate is measured on this chart rather than quoted as the
     textbook degree-per-four-minutes: it varies by well over a factor of two
     with latitude and with the rising sign, and this pane is read at a
     particular latitude. */
  var lagSpeed=null;
  try{ if(window.__kAsc&&D.input.hour!=null){
    var a1=window.__kAsc(D.input,-2), a2=window.__kAsc(D.input,2);
    lagSpeed=Math.abs(((a2-a1+540)%360)-180)/4;
  } }catch(e){ lagSpeed=null; }
  var dtxt='';
  if(D.P.Moon){
    var w=ayanWindow(D.P.Moon.sid,40/3);
    var reach=L.filter(function(m){ return m.deg>=D.ayan+w.up||m.deg<=D.ayan-w.down; });
    var spd=(D.P.Moon.speed!=null?D.P.Moon.speed:13.2);
    var perDeg=VY[D.birthNak.lord]/(40/3)*DPY;   // days a daśā boundary moves per degree
    /* Both edges of the window are real, but one of them is routinely dozens of
       degrees away — a nakṣatra is 13°20′ wide, so a Moon late in one has an
       upper bound no ayanāṃśa could ever reach. Printing "between 22.833° and
       36.166°" was arithmetically right and read like a fault. Each edge is now
       shown only when a published standard could actually cross it. */
    var loB=D.ayan-w.down, hiB=D.ayan+w.up;
    var loReal=loB>X0-2, hiReal=hiB<X1+2;
    var span=(loReal&&hiReal)?('between <b>'+loB.toFixed(3)+'°</b> and <b>'+hiB.toFixed(3)+'°</b>')
      :loReal?('above <b>'+loB.toFixed(3)+'°</b> — the upper edge, at '+hiB.toFixed(1)+
               '°, is beyond any value anyone proposes')
      :hiReal?('below <b>'+hiB.toFixed(3)+'°</b> — the lower edge, at '+loB.toFixed(1)+
               '°, is below any value anyone proposes')
      :'across the entire range of published values and well beyond it';
    dtxt='<h4 class="ksub">The daśā clock</h4><p class="knote">The Moon sits <b>'+
      w.up.toFixed(2)+'°</b> into <b>'+esc(D.birthNak.nak)+
      '</b> and <b>'+w.down.toFixed(2)+'°</b> short of the next nakṣatra. So the whole Viṃśottarī '+
      '<i>sequence</i> holds for any ayanāṃśa '+span+
      (reach.length?' — which '+(reach.length===1?'one':reach.length)+' of the sixteen standards '+
        (reach.length===1?'falls':'fall')+' outside, so '+(reach.length===1?'it gives':'they give')+
        ' a different opening mahādaśā and a different timeline entirely'
       :' — a range no published standard leaves, so the sequence is settled whichever you pick')+
      '.</p><p class="knote">Within that range the sequence is fixed but the <i>dates</i> are not: every '+
      '0.1° of ayanāṃśa moves each period boundary about <b>'+(perDeg*0.1).toFixed(0)+' days</b>. '+
      'For comparison, 0.1° of ayanāṃśa is '+(0.1/(spd/1440)).toFixed(0)+' minutes of birth time at the '+
      'Moon'+(lagSpeed? ', but only '+(0.1/lagSpeed*60).toFixed(0)+' seconds of it at the lagna, which rises '+
      (lagSpeed/(spd/1440)).toFixed(1)+' times faster than the Moon moves':'')+
      ' — which is the whole reason the two uncertainties have to be judged apart.</p>';
  }

  /* ---------- assembly ---------- */
  var invNames=inv.map(function(x){ return x.g==="__lag"?"Lagna":x.g; });
  var varNames=varies.map(function(x){ return (x.g==="__lag"?"Lagna":x.g)+" ("+x.n+")"; });
  var verdict=(varies.length===0)
    ? 'Nothing in this chart changes sign across the entire published range. The choice of ayanāṃśa is, for this chart, a matter of label rather than of substance.'
    : 'Across the full range, '+invNames.length+' of '+(ORD.length+1)+' hold their sign and '+
      varies.length+' do not. The ones that move are where any reading should name the ayanāṃśa it is using out loud.';

  /* The switcher travels with the pane, not with the vitals card.
     It was put in the card, which is part of the report HEAD — and the
     Workstation renders the report's SECTIONS, not its head, so the app's
     Workstation had the comparison but no way to act on it. Putting a picker
     at the top of the pane itself means every page that shows the comparison
     can switch, because the two arrive together. The card keeps its own copy
     for the builder, where it sits beside the number it changes. */
  var pick='<div class="kayanbar"><label for="k-ayan-live2">Cast this chart on</label>'+
    '<select id="k-ayan-live2" class="kayanpick" aria-label="Recast with a different ayanāṃśa">'+
    L.map(function(m){ return '<option value="'+esc(m.key)+'"'+(m.key===CUR?' selected':'')+'>'+
      esc(m.name)+' · '+m.deg.toFixed(3)+'°</option>'; }).join("")+'</select>'+
    '<span class="kmut">Everything below follows the choice.</span></div>';

  return pick+
    '<p class="knote">The ayanāṃśa is the one number in this chart that no observation can settle. Its '+
      '<i>rate</i> is astronomy and every standard agrees about it; its <i>zero point</i> is a convention, and '+
      'that is what the sixteen disagree about. This pane holds the birth data fixed and varies only that '+
      'convention, so you can see exactly which parts of the reading depend on it.</p>'+
    note("Study note — what a comparison like this can and cannot settle",
      "It shows which conclusions survive the disagreement. It cannot show which ayanāṃśa is correct, because correctness is not defined for a chosen origin.",
      "A tempting next step is to pick the ayanāṃśa whose chart best matches one's own life. That step does not work: with nine daśā lords and significator rules that name four to six grahas per event, a high match rate arises by construction, and tests against randomly dated events score as well as real ones. Treat the spread below as a margin of error to be declared, not a puzzle with a hidden answer.",
      ["lagna","dasha","varga"])+
    '<h4 class="ksub">Every standard, against this chart</h4>'+
    tbl(["Standard","Value","Lagna","Moon nakṣ.","Opening daśā","Daśā now","D9","Differs"],[rows])+
    '<p class="klegend">Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rāhu · Ke Ketu. '+
    '“use” recasts this chart on that standard and keeps you on this tab.</p>'+
    '<h4 class="ksub">How much room each placement has</h4>'+
    '<p class="knote">Raising the ayanāṃśa lowers every sidereal longitude, so the two columns are the room '+
    'in either direction before this placement leaves its sign — measured in degrees of ayanāṃśa, '+
    'from the '+D.ayan.toFixed(3)+'° this chart was cast on.</p>'+
    tbl(["Placement","Room below","Room above","Holds for ayanāṃśa","Standards outside","Margin"],[mrows])+
    '<h4 class="ksub">The whole range at once</h4><div class="kayanwrap">'+svg+'</div>'+
    '<p class="klegend">Each band is one sign (or nakṣatra) held across that stretch of ayanāṃśa. Gold marks the '+
    'value this chart uses; the red line is where it sits, the dotted lines are the other fifteen standards.</p>'+
    dtxt+
    '<div class="kbox"><b>What holds</b>'+esc(verdict)+
    (invNames.length?' Unchanged throughout: '+esc(invNames.join(", "))+'.':'')+
    (varNames.length?' Changes sign: '+esc(varNames.join(", "))+'.':'')+
    (Object.keys(nakSet).length>1?' The Moon’s nakṣatra is not settled either ('+
      esc(Object.keys(nakSet).join(" / "))+'), which means the daśā sequence itself is at stake.':'')+
    '</div>'+
    '<div class="kbox kwarn"><b>How to use this</b>Pick a standard for a stated reason — provenance, or the '+
    'civil convention your other sources use — and then apply it everywhere: D1, every varga, every daśā, every '+
    'transit. Mixing frames between sections is the one error here that is unambiguous. Where a placement above '+
    'is marked <i>on the edge</i> or <i>close</i>, say which ayanāṃśa the reading assumes rather than stating it '+
    'flat. See '+tabLink("btime","Birth-time check")+' for the other axis.</div>';
}
