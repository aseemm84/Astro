/* ================= 1. At a glance ================= */
function glancePane(D,J){
  var LS=D.LS, ll=LORD[LS], lp=D.P[ll], mo=D.P.Moon, items=[];
  function item(k,v,link){ items.push('<div class="kgi"><div class="kgk">'+k+'</div><div class="kgv">'+v+'</div>'+(link?'<div class="kgl">'+link+'</div>':'')+'</div>'); }
  // frame
  item("Rising sign · the frame of the chart",
    '<b>'+SA[LS]+'</b> ('+SIGNS[LS]+') rises at '+dm(D.lagDeg)+' in '+padaLink(D.lagNak.name,D.lagNak.pada)+'. '+
    'Its lord '+lordLine(ll,D)+'. '+(lp?'The self is steered toward the '+ord(lp.house)+' — '+shortSig(lp.house)+'.':''),
    secLink("The chart"));
  // mind
  if(mo){
    var withMo=D.planets.filter(function(p){ return p.en!=="Moon"&&p.house===mo.house; }).map(function(p){return p.en;});
    item("The Moon · the mind",
      'Moon in <b>'+SA[mo.sign]+'</b>, '+padaLink(mo.nak,mo.pada)+', in the '+ord(mo.house)+', '+DIGW[mo.dig]+'; a '+
      (isWaxing(D)?'waxing (Śukla)':'waning (Kṛṣṇa)')+' Moon'+(withMo.length?', with '+list(withMo):'')+'. '+
      'Its nakṣatra lord <b>'+esc(mo.naklord)+'</b> opens the Vimśottarī sequence.',
      secLink("Chandra & Sūrya kuṇḍalī","Chart from the Moon"));
  }
  // strength
  var sb=sbOf(J);
  if(sb){
    var top=sb.slice(0,2), low=sb.slice(-2).reverse();
    item("Strongest and weakest grahas",
      'By Ṣaḍbala, strongest: '+top.map(function(p){ return '<b>'+esc(p.graha)+'</b> ('+p.ratio.toFixed(2)+'× required)'; }).join(", ")+
      '. Weakest: '+low.map(function(p){ return '<b>'+esc(p.graha)+'</b> ('+p.ratio.toFixed(2)+'×)'; }).join(", ")+
      '. A strong graha delivers what it rules; a weak one needs support.',
      secLink("Ṣaḍbala"));
  }
  // houses
  if(D.av&&D.av.sarva){
    var hs=[]; for(var h=1;h<=12;h++) hs.push({h:h,v:D.av.sarva[(LS+h-1)%12]});
    hs.sort(function(a,b){ return b.v-a.v; });
    var full=D.bhavas.filter(function(b){ return b.occ.length>=3; });
    item("Where the chart is weighted",
      'Most supported: the '+ord(hs[0].h)+' ('+hs[0].v+' bindus, '+shortSig(hs[0].h)+') and the '+ord(hs[1].h)+' ('+hs[1].v+'). '+
      'Least: the '+ord(hs[11].h)+' ('+hs[11].v+', '+shortSig(hs[11].h)+').'+
      (full.length?' Crowded: '+list(full.map(function(b){ return 'the '+ord(b.n)+' ('+list(b.occ)+')'; }))+'.':''),
      secLink("Ashtakavarga"));
  }
  // yogas
  var pres=D.yogas.filter(function(y){ return y.present; });
  item("Yogas formed",
    pres.length?list(pres.map(function(y){ return '<b>'+esc(y.iast||y.key)+'</b>'; }))+
      '. A yoga is a promise that a related daśā has to activate.':'None of the catalogued yogas forms — the chart is read from its lords and houses.',
    secLink("Yogas"));
  // running period
  var LV=levelsAt(D,D.nowJd);
  if(LV&&LV[1]){
    item("The period running now",
      '<b>'+esc(LV[0].lord)+'</b> mahādaśā (to '+fmy(LV[0].end)+'), <b>'+esc(LV[1].lord)+'</b> antardaśā (to '+fmy(LV[1].end)+'). '+
      lordLine(LV[0].lord,D)+'; '+lordLine(LV[1].lord,D)+'.',
      tabLink("now","Open the Now panel"));
  }
  // sky now
  var sat=transitOf(D,"Saturn"), jup=transitOf(D,"Jupiter");
  if(sat&&jup&&mo){
    var ss=hFrom(ridx(sat.rashi),mo.sign), jj=hFrom(ridx(jup.rashi),mo.sign);
    item("The sky over this chart",
      'Saturn is in the '+ord(ss)+' from the natal Moon'+(D.sade&&D.sade.active?' — <b>'+esc(SS_NAME[ss-1]||"Sade Sati / dhaiyā")+'</b> is running':'')+
      '; Jupiter in the '+ord(jj)+' ('+(GOOD_FROM_MOON.Jupiter.indexOf(jj)>=0?'a classically favourable':'not a classically favourable')+' house for it).',
      tabLink("timeline","See the life timeline"));
  }
  // birth-time robustness
  var bt=null; try{ bt=lagnaMargins(D); }catch(e){}
  if(bt){
    var m=Math.min(bt.before,bt.after);
    item("How sure is the lagna?",
      'The lagna stays '+SA[D.LS]+' for birth times from <b>'+bt.from+'</b> to <b>'+bt.to+'</b> — '+
      (m<5?'<span class="kbad">only '+m.toFixed(1)+' minutes of margin</span>, so the house frame depends on an exact time.':
       m<15?'<span class="kmid">'+m.toFixed(0)+' minutes of margin</span>, adequate if the recorded time is good.':
       '<span class="kgood">'+m.toFixed(0)+' minutes of margin</span>, so ordinary rounding will not change it.'),
      tabLink("btime","Run the birth-time check"));
  }
  return '<p class="knote">A plain-language summary of this chart, built from the same rules as the full report. '+
    'Each card links to the section it came from. New to this? '+tabLink("path","Take the 7-step reading path")+'</p>'+
    '<div class="kglance">'+items.join("")+'</div>';
}

