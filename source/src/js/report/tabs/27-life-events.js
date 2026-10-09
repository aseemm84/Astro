/* ================= 6. Life events ================= */
var EVK={career:["Career or work",[10,6,2,11]],study:["Education",[4,5,9]],relationship:["Relationship or marriage",[7,2,11]],
  children:["Children",[5,9]],home:["Home or property",[4]],move:["Move, travel or abroad",[3,9,12]],money:["Money or gains",[2,11]],
  health:["Health",[1,6,8]],loss:["Loss or bereavement",[8,12]],spiritual:["Spiritual turn",[9,12,5]],other:["Other",[]]};
function lordTouches(D,lord,houses){
  var hit=[], p=D.P[lord];
  (D.owns[lord]||[]).forEach(function(h){ if(houses.indexOf(h)>=0) hit.push("owns "+ord(h)); });
  if(p&&houses.indexOf(p.house)>=0) hit.push("sits in "+ord(p.house));
  if((lord==="Rahu"||lord==="Ketu")&&p){ var disp=LORD[p.sign]; (D.owns[disp]||[]).forEach(function(h){ if(houses.indexOf(h)>=0) hit.push("dispositor owns "+ord(h)); }); }
  return hit;
}
function eventsAnalyze(D,list0){
  if(!list0.length) return '<p class="kmut">No events yet. Add a few dated turning points — a first job, a move, a marriage, a loss — and the '+
    'page will show what was running at each.</p>';
  var tree=buildTree(D), tz=D.input.tzHours, rows=[], linked=0, chance=0, n=0;
  // share of the life (first 80 years) in which the MD or AD lord touches a set of houses — the chance baseline
  function baseline(houses){ var tot=0, hit=0, lim=D.jd+80*365.25;
    tree.forEach(function(md){ (md.ads||[]).forEach(function(a){ var s=Math.max(a.start,D.jd), e=Math.min(a.end,lim); if(e<=s) return;
      tot+=e-s; if(lordTouches(D,md.lord,houses).length||lordTouches(D,a.lord,houses).length) hit+=e-s; }); });
    return tot?hit/tot:0; }
  var list=list0.map(function(e,i){ return {e:e,i:i}; }).sort(function(a,b){ return a.e.d<b.e.d?-1:1; });
  list.forEach(function(it){
    var e=it.e, p=e.d.split("-"), jd=jdFrom(+p[0],+p[1],+p[2],12-tz), cat=EVK[e.k]||EVK.other, hs=cat[1];
    var LV=levelsAt(D,jd), sat=signAt("Saturn",jd), jup=signAt("Jupiter",jd);
    var links=[];
    if(LV){ LV.slice(0,3).forEach(function(l,k){ var t=lordTouches(D,l.lord,hs); if(t.length) links.push(["MD","AD","PD"][k]+" "+l.lord+" "+t.join(", ")); }); }
    [["Saturn",sat],["Jupiter",jup]].forEach(function(t){ if(t[1]==null) return; var hl=hFrom(t[1],D.LS);
      if(hs.indexOf(hl)>=0) links.push(t[0]+" transits the "+ord(hl)); });
    var main=LV&&(lordTouches(D,LV[0].lord,hs).length||(LV[1]&&lordTouches(D,LV[1].lord,hs).length));
    if(hs.length&&LV&&jd>=D.jd){ n++; if(main) linked++; chance+=baseline(hs); }
    rows.push('<tr><td>'+esc(e.d)+'</td><td><b>'+esc(e.t||"(untitled)")+'</b><br><span class="kmut">'+esc(cat[0])+(hs.length?' · houses '+hs.join(", "):'')+'</span></td>'+
      '<td>'+(jd<D.jd?'<span class="kmut">before birth</span>':LV?LV.slice(0,3).map(function(l){ return esc(l.lord); }).join(" → "):"—")+'</td>'+
      '<td class="kmut">'+(sat!=null?'Sa '+ord(hFrom(sat,D.P.Moon.sign))+' · Ju '+ord(hFrom(jup,D.P.Moon.sign)):"—")+'</td>'+
      '<td>'+(links.length?'<span class="kgood">'+esc(links.join("; "))+'</span>':(hs.length?'<span class="kmut">no link</span>':'—'))+'</td>'+
      '<td><button type="button" class="kev-del" data-kev-del="'+it.i+'" aria-label="Remove event">✕</button></td></tr>');
  });
  var sum='';
  if(n){ var exp=chance/n;
    sum=note("Study note — what the events show",
      '<b>'+linked+' of '+n+'</b> categorised events fell in a mahādaśā or antardaśā whose lord owns or occupies one of the event\'s houses. '+
      'By chance alone you would expect about <b>'+(exp*n).toFixed(1)+'</b> ('+Math.round(exp*100)+'% of this life\'s periods touch such houses).',
      'Each lord touches two or three houses, so links often appear by chance — that is why the baseline is shown. A pattern across '+
      'many events means more than any single hit. If the fit is poor, check the birth time on the Birth-time check tab: the daśā '+
      'dates shift with it. This is a way to test the method against a life, not proof of it.',["dasha","bhava"]); }
  return tbl(["Date","Event","MD → AD → PD","Saturn · Jupiter from Moon","Links to the event's houses",""],rows)+sum;
}
function eventsPane(){
  var opts=Object.keys(EVK).map(function(k){ return '<option value="'+k+'">'+esc(EVK[k][0])+'</option>'; }).join("");
  return '<p class="knote">Test the method against a real life. Add dated events; for each, the page shows the daśā running then, where '+
    'Saturn and Jupiter were, and whether the period lords are tied to the houses that kind of event belongs to. Events are kept only in '+
    'this browser, for this chart.</p>'+
    '<div class="kev-form"><label>Date<input type="date" id="kev-date"></label>'+
    '<label class="kev-wide">What happened<input type="text" id="kev-label" maxlength="80" placeholder="e.g. First job, moved to Pune"></label>'+
    '<label>Kind<select id="kev-kind">'+opts+'</select></label>'+
    '<button type="button" class="k-btn" id="kev-add">Add event</button></div><div id="kev-out"></div>';
}

