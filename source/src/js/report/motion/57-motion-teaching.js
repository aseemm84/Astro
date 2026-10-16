/* ===== Motion — the three reference walks ==================================
   Bhāvas, rāśis and nakṣatras, each taken one at a time and shown against the
   reader's own chart. These differ from the other scenes in what they are for:
   the rest show something moving, these show something *meant*, with the chart
   supplying the instance.

   Two disciplines are kept throughout.

   Source. Significations are from BPHS Ch. 11 for the bhāvas and Ch. 4 for the
   rāśis; the nakṣatra lords are the Viṃśottarī sequence BPHS gives in Vol. 2.
   Where a statement is later tradition rather than a verse — the deities, the
   gaṇas — the frame says so rather than letting it pass as Parāśara.

   Varga pairing. The twelve bhāvas are tied to the vargas by TOPIC, which is
   how BPHS Ch. 6 assigns them — Horā to wealth, Drekkāṇa to siblings, Saptāṃśa
   to children. The popular shortcut of matching the Nth house to the Dth chart
   is not in the text and is not used here; D7 refines the 5th, not the 7th.
   ========================================================================= */

/* --- bhāva significations, BPHS Ch. 11 ---------------------------------- */
var MT_BH=[
 {sa:"Tanu",    en:"Body and self",       sig:"physique, appearance, intellect, complexion, strength, happiness and grief, innate nature"},
 {sa:"Dhana",   en:"Wealth and speech",   sig:"wealth, food and grain, family, speech, metals and precious stones"},
 {sa:"Sahaja",  en:"Courage and siblings",sig:"courage, brothers and sisters, attendants, initiatory instruction, short journeys"},
 {sa:"Bandhu",  en:"Home and mother",     sig:"conveyances, relatives, mother, happiness, treasure, land and houses"},
 {sa:"Putra",   en:"Mind and children",   sig:"mantra, learning, knowledge, children, authority, and loss of position"},
 {sa:"Ripu",    en:"Adversity",           sig:"maternal uncle, enemies, disease, ulcers, debt and obstruction"},
 {sa:"Yuvati",  en:"Spouse and union",    sig:"spouse, travel, trade, sight, partnership — and a māraka place"},
 {sa:"Randhra", en:"Longevity and depth", sig:"longevity, conflict, hidden matters, inheritance, what is past and to come"},
 {sa:"Dharma",  en:"Fortune and dharma",  sig:"fortune, religion, pilgrimage, the teacher, the father in some readings"},
 {sa:"Karma",   en:"Action and standing", sig:"authority, profession, livelihood, honour, father, foreign residence, debts"},
 {sa:"Labha",   en:"Gain",                sig:"gains, income, prosperity, elder siblings, what is asked for and received"},
 {sa:"Vyaya",   en:"Expenditure and loss",sig:"expense, enemies, seclusion, loss, and the themes of release"}
];
/* which varga BPHS puts the topic in — by topic, never by number */
var MT_BHV={1:null,2:"D2",3:"D3",4:"D4",5:"D7",6:null,7:"D9",8:null,9:"D9",10:"D10",11:null,12:"D12"};
var MT_VN={D2:"Horā — wealth",D3:"Drekkāṇa — siblings",D4:"Caturthāṃśa — property",
  D7:"Saptāṃśa — children",D9:"Navāṃśa — spouse and dharma",D10:"Daśāṃśa — profession",
  D12:"Dvādaśāṃśa — parents"};

/* --- the reading lens each division supplies ----------------------------------
   What a bhāva *means* does not change between divisions. The 4th is home and
   mother in the rāśi chart and in the Daśāṃśa alike; that is BPHS Ch. 11 and it
   is an invariant, not an oversight.

   What changes is the QUESTION being put to it. Ch. 6 assigns each division a
   matter, so the twelve significations are read inside that matter: the 4th in
   D10 is the standing a profession rests on, the 4th in D7 the home children are
   born into. That composition — division's topic × house's signification — is
   standard reading practice, not a verse of Parāśara, and the frame says so.

   `k` is the house the division exists to refine, by the topic Ch. 6 gives it
   rather than by matching the number: D7 refines the 5th, not the 7th. Empty
   where the division is read whole (D1, D27, D60) rather than through one house. */
var MT_VLENS={
  D1:  {t:"the whole life as it stands",              k:[]},
  D2:  {t:"wealth and what sustains it",              k:[2]},
  D3:  {t:"siblings, courage and initiative",k:[3]},
  D4:  {t:"home, land and fixed assets",              k:[4]},
  D7:  {t:"children and progeny",                     k:[5]},
  D9:  {t:"marriage, dharma, and how each graha ripens", k:[7,9]},
  D10: {t:"profession and action in the world",        k:[10]},
  D12: {t:"parents and what came down from them",      k:[4,9]},
  D16: {t:"vehicles, comforts and ease",      k:[4]},
  D20: {t:"worship and spiritual practice",            k:[5,9]},
  D24: {t:"learning and what is studied",              k:[4,5]},
  D27: {t:"the strength each graha brings to it", k:[]},
  D30: {t:"affliction and misfortune",                 k:[6]},
  D40: {t:"what comes down the mother's line",    k:[4]},
  D45: {t:"what comes down the father's line",    k:[9]},
  D60: {t:"the karmic residue standing behind it",       k:[]}
};

/* --- rāśi attributes, BPHS Ch. 4 ---------------------------------------- */
var MT_EL=["Fire","Earth","Air","Water","Fire","Earth","Air","Water","Fire","Earth","Air","Water"];
var MT_MO=["Movable","Fixed","Dual","Movable","Fixed","Dual","Movable","Fixed","Dual","Movable","Fixed","Dual"];
var MT_LIMB=["head","face and neck","arms and chest","chest and heart","stomach","waist and navel",
  "lower abdomen","generative organs","hips and thighs","knees","calves","feet"];
/* deep exaltation degrees — the point, not the sign */
var MT_DEEP={Sun:[0,10],Moon:[1,3],Mars:[9,28],Mercury:[5,15],Jupiter:[3,5],Venus:[11,27],Saturn:[6,20]};

/* --- nakṣatra lords, deities and gaṇas ---------------------------------- */
var MT_NKD=["Aśvinī Kumāras","Yama","Agni","Brahmā / Prajāpati","Soma","Rudra","Aditi","Bṛhaspati",
 "Sarpas","Pitṛs","Bhaga","Aryaman","Savitṛ","Tvaṣṭṛ","Vāyu","Indrāgni","Mitra","Indra","Nirṛti",
 "Āpas","Viśvedevas","Viṣṇu","Vasus","Varuṇa","Ajaikapāda","Ahirbudhnya","Pūṣan"];
var MT_NKG=["Deva","Manuṣya","Rākṣasa","Manuṣya","Deva","Manuṣya","Deva","Deva","Rākṣasa",
 "Rākṣasa","Manuṣya","Manuṣya","Deva","Rākṣasa","Deva","Rākṣasa","Deva","Rākṣasa","Rākṣasa",
 "Manuṣya","Manuṣya","Deva","Rākṣasa","Rākṣasa","Manuṣya","Manuṣya","Deva"];

/* Everything in this bundle shares one scope, so these tables are in scope by
   name. They are NOT on window — reaching for window.LORD silently yields
   undefined, which is how the first cut of this file printed a blank lord. */
/* Full names. SKY_NAKA is abbreviated for wheel labels, where "P.Phalgunī" has
   to fit between two spokes; here there is room for the name itself. */
var MT_NKN=["Aśvinī","Bharaṇī","Kṛttikā","Rohiṇī","Mṛgaśirā","Ārdrā","Punarvasu","Puṣya",
 "Āśleṣā","Maghā","Pūrva Phalgunī","Uttara Phalgunī","Hasta","Citrā","Svātī","Viśākhā",
 "Anurādhā","Jyeṣṭhā","Mūla","Pūrva Āṣāḍhā","Uttara Āṣāḍhā","Śravaṇa","Dhaniṣṭhā",
 "Śatabhiṣā","Pūrva Bhādrapadā","Uttara Bhādrapadā","Revatī"];
/* LORD is English; the chart's own rulers and the varga positions are Sanskrit.
   One naming, so a varga house does not read "lord Venus · Śukra". */
var MT_SA={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",
  Jupiter:"Guru",Venus:"Śukra",Saturn:"Śani",Rahu:"Rāhu",Ketu:"Ketu"};
var MT_RA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
function mtRa(i){ return moTrasi(i); }
function mtNk(i){ return moTnak(i); }
function mtLord(i){ return (typeof LORD!=="undefined"&&LORD[i])?moTgraha(LORD[i]):""; }
function mtNLord(i){ return (typeof NL9!=="undefined"&&NL9[i%9])||""; }
function mtGl(n){ return moTgl(n); }
/* the reader's own grahas, as {name, sid, rashi, degInSign} */
function mtGrahas(){
  var J=MO.J; if(!J||!J.grahas) return [];
  return J.grahas.map(function(g){
    var en=(typeof EN!=="undefined"&&EN[g.key])||g.key;
    return {n:mtGl(en),
            full:g.iast||g.key, sid:g.sidereal_deg,
            ri:g.rashi.idx, d:g.rashi.degInSign, retro:g.retrograde}; });
}
/* Step p across n items with a hold-move-hold ease, so each one is readable.
   When a subject is pinned the walk stops: the frame holds that one and q runs
   0 to 1 across the whole duration, which the scene uses to sweep a marker along
   the span. A scene that is pinned should still move — the movement is just the
   degrees rather than the subject. */
function mtStep(p,n,pin){
  if(pin!=null && pin>=0 && pin<n) return {i:pin,q:p,e:1,pinned:true};
  var each=1/n, i=Math.min(n-1,Math.floor(p/each)), q=(p-i*each)/each;
  var e=q<0.18?0:(q>0.58?1:(q-0.18)/0.40); e=e*e*(3-2*e);
  return {i:i,q:q,e:e,pinned:false};
}
/* the travelling degree marker a pinned scene shows */
function mtSweep(x,y0,y1,P,label,U){
  var c=MO.ctx;
  c.strokeStyle=P.gold; c.lineWidth=2.4; c.globalAlpha=.85;
  c.beginPath(); c.moveTo(x,y0); c.lineTo(x,y1); c.stroke(); c.globalAlpha=1;
  moGlowDot(x,y1,U*0.009,P.gold,P.gold);
  if(label) moText(label,x,y0-U*0.052,U*0.021,P.gold,"center",700);
}
/* a plain 30-degree strip with ticks, used by two of the three */
function mtStrip(x0,x1,y,h,P,ticks,lab){
  var c=MO.ctx, S=moSize(), st=moStage(), U=Math.min(S.w, st.h*1.18);
  c.fillStyle="rgba(127,140,200,0.07)"; c.fillRect(x0,y,x1-x0,h);
  c.strokeStyle=P.line; c.lineWidth=1.6; c.globalAlpha=.8;
  c.strokeRect(x0,y,x1-x0,h); c.globalAlpha=1;
  for(var d=0;d<=ticks;d+=(ticks>=30?5:1)){
    var x=x0+(x1-x0)*(d/ticks), big=(d%10===0);
    c.strokeStyle=P.line; c.globalAlpha=big?.75:.4; c.lineWidth=big?1.8:1.1;
    c.beginPath(); c.moveTo(x,y+h); c.lineTo(x,y+h-(big?h*0.26:h*0.15)); c.stroke();
    c.globalAlpha=1;
    if(big&&lab) moText(d+"°",x,y+h+U*0.026,U*0.019,P.dim,"center",500);
  }
}

/* A rail along the foot of the stage: one mark per item, the current one lit.
   It is anchored to the stage rather than to the text, so it takes up the slack a
   9:16 frame leaves below the type and sits close in on a 16:9 one. It also
   answers the question every stepped scene raises — how far through am I. */
function mtRail(n,i,P){
  var c=MO.ctx, S=moSize(), st=moStage(), U=Math.min(S.w,st.h*1.18);
  var y=st.y+st.h-U*0.090, w=S.w*0.80, x0=st.cx-w/2;
  var gap=w/n, mw=Math.min(gap*0.62, U*0.022);
  for(var k=0;k<n;k++){
    var x=x0+gap*(k+0.5), on=(k===i);
    c.fillStyle= on? P.gold : P.line;
    c.globalAlpha= on? 1 : 0.42;
    var h=on? U*0.016 : U*0.008;
    c.fillRect(x-mw/2, y-h/2, mw, h);
    c.globalAlpha=1;
  }
  moText(moP("ofN",i+1,n), st.cx, y+U*0.040, U*0.020, P.dim, "center", 500);
}

/* A stack of caption lines laid out to fit the room there is.

   The lines were at hand-written offsets, which was fine while every subject
   contributed the same number of them. It stopped being fine as soon as a
   division could add one — seven lines on a 16:9 frame walked straight into the
   rail. So the block is a list now, and this lays it out: natural height first,
   and if that overruns the floor, the whole stack is scaled down together until
   it fits, to a floor of 0.72 so it never shrinks past legibility.

   Each line is {t, s, c, w, gap, serif}: text, size as a fraction of U, colour,
   weight, extra space above it, and whether to set it in the serif face. */
function mtFit(t,s,L,wmax){
  /* The size a line can actually be set at without running to the frame edge.
     Measured rather than estimated, because the glyph widths here are not the
     ones a rule of thumb assumes: Sanskrit with its diacritics, middots as
     separators, and a serif face for the heading. 0.66 is the floor — a line that
     needs more than that is too long to be written, not too long to be set. */
  var c=MO.ctx, k=moTypeK();
  c.font = L.serif
    ? '600 '+(s*k)+'px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif'
    : (L.w||500)+" "+(s*k)+'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var w=c.measureText(t).width;
  return w>wmax ? s*Math.max(0.66, wmax/w) : s;
}
function mtLines(lines,cx,yTop,yMax,U,P,wmax){
  /* moText and moSerif scale what they are given by moTypeK(), which is 1 on a
     vertical or square frame and 0.5625 on a wide one. The line step has to carry
     the same factor or a 16:9 frame spaces half-size glyphs as though they were
     full size — which is exactly how seven lines came to walk off the stage.

     Two fits happen here, and in this order: each line is narrowed on its own if
     it would reach the frame edge, then the whole stack is scaled together if it
     would reach the floor. Doing it the other way round would narrow lines that
     the stack scaling was about to shrink anyway. */
  var k=moTypeK(), i, nat=0, L, step=1.62;
  for(i=0;i<lines.length;i++){
    L=lines[i]; if(!L||!L.t) continue;
    L._s = wmax ? mtFit(L.t, L.s*U, L, wmax)/U : L.s;
    nat += (L.gap||0)*U + L._s*k*step*U;
  }
  var room=yMax-yTop, f=1;
  if(nat>room && nat>0) f=Math.max(0.72, room/nat);
  var y=yTop;
  for(i=0;i<lines.length;i++){
    L=lines[i]; if(!L||!L.t) continue;
    var h=L._s*k*step*U*f;
    y += (L.gap||0)*U*f + h*0.70;        /* 0.70 of the step sits above the baseline */
    if(L.serif) moSerif(L.t,cx,y,L._s*U*f,L.c);
    else moText(L.t,cx,y,L._s*U*f,L.c,"center",L.w||500);
    y += h*0.30;
  }
  return y;
}

/* One view of the chart, whichever division is chosen. A varga carries its own
   lagna and its own placements, and whole-sign houses are counted from that lagna
   exactly as they are in the rāśi chart — so the same twelve significations can be
   read in D9 or D10 without changing anything but the ground they stand on.

   D1 comes from J.bhavas, which already carries rulers and occupants. The other
   fifteen carry only {lagna, positions}, so houses, lords and occupants are derived
   here from the same rule. */
function mtView(){
  var J=MO.J, vi=Math.max(0,Math.min(15,MO.opt.varga|0));
  var v=J.vargas&&J.vargas[vi];
  if(vi===0 || !v){
    var L0=J.lagna.rashi.idx;
    return {vi:0, name:"D1", en:"Rāśi — the birth chart itself", lagna:L0, isD1:true,
      sign:function(k){ return J.bhavas[k].rashi.idx; },
      /* the engine stores these in its own Sanskrit; EN maps back to the English
         key the language table is built on, so Hindi mode reaches the same term */
      lord:function(k){ return moTsk(J.bhavas[k].ruler); },
      occ:function(k){ return (J.bhavas[k].occupants||[]).map(moTsk); },
      house:function(g){ return ((g.ri-L0)%12+12)%12; }};
  }
  var pos=v.positions||{};
  return {vi:vi, name:v.varga, en:v.en, lagna:v.lagna, isD1:false,
    sign:function(k){ return (v.lagna+k)%12; },
    lord:function(k){ var en=(typeof LORD!=="undefined"&&LORD[(v.lagna+k)%12])||"";
      return moTgraha(en); },
    occ:function(k){ var sg=(v.lagna+k)%12, out=[];
      Object.keys(pos).forEach(function(n){ if(pos[n]===sg) out.push(moTsk(n)); }); return out; },
    house:function(g){ var sg=pos[g.key]; if(sg==null) return -1;
      return ((sg-v.lagna)%12+12)%12; }};
}

var MO_TEACH=[

/* ------------------------------------------------------------- 1. the bhāvas */
{key:"bhava", label:"What each bhāva carries", title:"The twelve houses",
 sub:"what each one is for, and where BPHS refines it",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  /* Offsets and type scale with the short side, not the width. Keyed to the
     width they ran off the foot of a 16:9 frame, where the width is more than
     twice the usable height. The 1.18 is headroom measured against the tallest
     of the three layouts: it keeps 9:16 identical and stops 16:9 being needlessly
     small, with about 90px of the stage still to spare. */
  var U=Math.min(S.w, st.h*1.18);
  var J=MO.J; if(!J||!J.bhavas) throw new Error("no chart");
  var V=mtView();
  var s=mtStep(p,12), i=s.i, B=MT_BH[i];
  moStars();

  /* the wheel: twelve sectors, the current one lit. Houses run anticlockwise
     from the lagna, which is how a rāśi chart is read. */
  /* How much height the wheel may take depends on the frame. Only the vertical
     frame has room to spare below it; the square is tighter and the wide one
     tightest, so there the wheel gives height back rather than squeezing seven
     lines of caption into the slack. The three sets of numbers were measured, not
     guessed: every house in every division clears the rail on all three frames. */
  var aspect=S.w/st.h, FR;
  if(aspect>1.6)       FR={R:0.225, cy:0.29, gap:0.045};   /* 16:9 */
  else if(aspect>1.15) FR={R:0.200, cy:0.26, gap:0.045};   /* 1:1  */
  else                 FR={R:0.260, cy:0.33, gap:0.070};   /* 9:16 */
  var R=Math.min(S.w*0.30, st.h*FR.R), cx=st.cx, cy=st.y+st.h*FR.cy;
  for(var k=0;k<12;k++){
    var a0=-Math.PI/2 - (k+1)*Math.PI/6, a1=-Math.PI/2 - k*Math.PI/6;
    var on=(k===i);
    c.beginPath(); c.moveTo(cx,cy); c.arc(cx,cy,R,a0,a1); c.closePath();
    c.fillStyle= on? "rgba(217,182,104,0.26)" : "rgba(127,140,200,0.055)";
    c.fill();
    c.strokeStyle=P.line; c.globalAlpha=on?.9:.45; c.lineWidth=on?2.2:1.2;
    c.stroke(); c.globalAlpha=1;
    var am=(a0+a1)/2, lx=cx+Math.cos(am)*R*0.72, ly=cy+Math.sin(am)*R*0.72;
    moText(String(k+1),lx,ly+U*0.010,U*(on?0.034:0.024),
      on?P.gold:P.dim,"center",on?700:500);
    /* the rāśi each house falls in, outside the rim */
    if(MO.opt.labels){
      var rx=cx+Math.cos(am)*(R+U*0.045), ry=cy+Math.sin(am)*(R+U*0.045);
      moText(mtRa(V.sign(k)),rx,ry,U*0.019,on?P.ink:P.dim,"center",on?700:400);
    }
  }
  /* the reader's grahas, placed in their houses in THIS division */
  mtGrahas().forEach(function(g){
    var h=V.house(g); if(h<0) return;
    var am=-Math.PI/2-(h+0.5)*Math.PI/6;
    var gx=cx+Math.cos(am)*R*0.40, gy=cy+Math.sin(am)*R*0.40;
    moGlowDot(gx,gy,U*0.009,h===i?P.gold:P.dim,h===i?P.gold:P.dim);
    if(h===i) moText(g.n,gx,gy-U*0.022,U*0.020,P.gold,"center",700);
  });

  /* The words. Three registers, kept apart on purpose:
       - the significations      BPHS Ch. 11, the same in every division
       - the reading lens        the division's topic, Ch. 6, composed with the
                                 house by ordinary reading practice, not a verse
       - the reader's own house  sign, lord and occupants, in THIS division
     Changing the division above changes the second and third and leaves the
     first alone, which is the doctrine rather than a stuck screen. */
  var LN=MT_VLENS[V.name]||MT_VLENS.D1, key=(LN.k.indexOf(i+1)>=0);
  var occ=V.occ(i).join(", ");
  var lines=[
    {t:moNum(i+1)+".  "+moTbhSa(i,B.sa), s:0.066, c:P.gold, serif:true},
    {t:moTbhEn(i,B.en),  s:0.030,  c:P.ink, w:600, gap:0.008},
    {t:moTbhSig(i,B.sig), s:0.0225, c:P.dim, w:400, gap:0.008}
  ];

  /* the lens - the one line that answers "so what changes when I switch?" */
  if(V.isD1){
    lines.push({t:moP("readPlain"),
      s:0.0225, c:P.dim, w:500, gap:0.014});
  } else {
    lines.push({t:moP("lensIn",V.name,moTvlens(V.name,LN.t)),
      s:0.0235, c:P.gold, w:600, gap:0.014});
    if(key) lines.push({t:moP("keyHouse",V.name),
      s:0.021, c:P.gold, w:700, gap:0.004});
  }

  /* the reader's own house, in the division being shown */
  lines.push({t:mtRa(V.sign(i))+"  ·  "+moP("lordIs",V.lord(i))+
    (occ?("  ·  "+occ):("  ·  "+moP("emptyHouse"))),
    s:0.026, c:P.ink, w:600, gap:0.016});

  /* and, on the rasi chart, where BPHS says to look closer at this topic */
  if(V.isD1){
    var v=MT_BHV[i+1], vg=null;
    if(v && J.vargas) J.vargas.forEach(function(x){ if(x.varga===v) vg=x; });
    if(vg){
      lines.push({t:moP("bphsRefines",moTvn(v,MT_VN[v])),
        s:0.0225, c:P.gold, w:600, gap:0.014});
      lines.push({t:moP("yourVarga",v,mtRa(vg.lagna)),
        s:0.022, c:P.ink, w:500});
    } else {
      lines.push({t:moP("noDivision"),
        s:0.0215, c:P.dim, w:400, gap:0.014});
    }
  } else {
    lines.push({t:moP("countedFrom",V.name,V.en,mtRa(V.lagna)),
      s:0.021, c:P.dim, w:400, gap:0.012});
  }

  var ty=cy+R+st.h*FR.gap;
  mtLines(lines,cx,ty,st.y+st.h-U*0.112,U,P,S.w*0.88);
  mtRail(12,i,P);
  return {ms:null, sub:V.name+" \u00b7 "+moP("bhavaOfN",i+1,12)};
 }},

/* -------------------------------------------------------------- 2. the rāśis */
{key:"rashi", label:"The twelve rāśis", title:"Thirty degrees each",
 sub:"element, mode, lord, and what of yours sits there",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  /* Offsets and type scale with the short side, not the width. Keyed to the
     width they ran off the foot of a 16:9 frame, where the width is more than
     twice the usable height. The 1.18 is headroom measured against the tallest
     of the three layouts: it keeps 9:16 identical and stops 16:9 being needlessly
     small, with about 90px of the stage still to spare. */
  var U=Math.min(S.w, st.h*1.18);
  var J=MO.J; if(!J) throw new Error("no chart");
  var s=mtStep(p,12,MO.opt.rpin), i=s.i;
  moStars();
  var lord=mtLord(i);
  var cx=st.cx;

  /* the 30° strip, with every degree that matters marked on it */
  var x0=S.w*0.08, x1=S.w*0.92, y=st.y+st.h*0.28, h=st.h*0.13;
  mtStrip(x0,x1,y,h,P,30,true);
  function X(d){ return x0+(x1-x0)*(d/30); }

  /* exaltation and debilitation points falling in this sign */
  Object.keys(MT_DEEP).forEach(function(g){
    var e=MT_DEEP[g];
    if(e[0]===i){
      var x=X(e[1]);
      c.strokeStyle=P.benefic; c.lineWidth=2.6; c.globalAlpha=.9;
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+h); c.stroke(); c.globalAlpha=1;
      moText(moP("exalts",mtGl(g)),x,y-U*0.016,U*0.019,P.benefic,"center",700);
    }
    var dd=(e[0]+6)%12;
    if(dd===i){
      var x2=X(e[1]);
      c.strokeStyle=P.malefic; c.lineWidth=2.2; c.globalAlpha=.75;
      c.setLineDash([4,5]);
      c.beginPath(); c.moveTo(x2,y); c.lineTo(x2,y+h); c.stroke();
      c.setLineDash([]); c.globalAlpha=1;
      moText(moP("falls",mtGl(g)),x2,y+h+U*0.050,U*0.019,P.malefic,"center",600);
    }
  });
  /* when this sign is pinned, a marker walks its thirty degrees */
  if(s.pinned){
    var sd=s.q*30;
    mtSweep(X(sd),y-U*0.010,y+h+U*0.006,P,dmDeg(sd),U);
  }
  /* the reader's own grahas in this sign, at their true degree */
  var mine=mtGrahas().filter(function(g){ return g.ri===i; });
  mine.forEach(function(g,k){
    var x=X(g.d), gy=y+h*0.5;
    moGlowDot(x,gy,U*0.011,P.gold,P.gold);
    moText(g.n+(g.retro?"℞":""),x,gy-U*0.028-k*U*0.030,U*0.024,P.gold,"center",700);
  });

  /* the words */
  var ty=y+h+st.h*0.16;
  moSerif(String(i+1)+".  "+mtRa(i),cx,ty,U*0.070,P.gold);
  moText(moP("rasiAttrs",moTmode(i%3),moTelem(i%4),moTgraha(lord)),
    cx,ty+U*0.056,U*0.030,P.ink,"center",600);
  moText(moP("kalapurusha",moTlimb(i)),cx,ty+U*0.094,U*0.024,P.dim,"center",400);

  /* which house it is, for this chart */
  var L=J.lagna.rashi.idx, hn=((i-L)%12+12)%12+1;
  moText(moP("houseFromLagna",hn,moTbhEn(hn-1,MT_BH[hn-1].en).toLowerCase()),
    cx,ty+U*0.136,U*0.026,P.gold,"center",600);
  moText(mine.length? moP("holding",mine.map(function(g){ return moTgraha((typeof EN!=="undefined"&&EN[g.full])||g.full); }).join(", "))
                    : moP("nothingHere"),
    cx,ty+U*0.172,U*0.024,mine.length?P.ink:P.dim,"center",500);

  /* rising time at this latitude, which the engine already computes */
  var rr=J.rashi_rising_times&&J.rashi_rising_times.rashis;
  if(rr&&rr[i]&&rr[i].rising_minutes!=null)
    moText(moP("risingMin",Math.round(rr[i].rising_minutes),
             rr[i].share_of_day_percent.toFixed(1)),
      cx,ty+U*0.208,U*0.0225,P.dim,"center",400);
  if(!s.pinned) mtRail(12,i,P);
  return {ms:null, sub:mtRa(i)+" \u2014 "+moP("ofN",i+1,12)};
 }},

/* --------------------------------------------------------- 3. the nakṣatras */
{key:"nakfull", label:"The 27, in full", title:"Thirteen degrees twenty",
 sub:"lord, deity, the four pādas, and what of yours falls inside",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  /* Offsets and type scale with the short side, not the width. Keyed to the
     width they ran off the foot of a 16:9 frame, where the width is more than
     twice the usable height. The 1.18 is headroom measured against the tallest
     of the three layouts: it keeps 9:16 identical and stops 16:9 being needlessly
     small, with about 90px of the stage still to spare. */
  var U=Math.min(S.w, st.h*1.18);
  var J=MO.J; if(!J) throw new Error("no chart");
  var s=mtStep(p,27,MO.opt.npin), i=s.i;
  moStars();
  var seg=40/3, b0=i*seg, b1=b0+seg;
  var lord=mtNLord(i);
  var cx=st.cx;

  /* the whole 13°20′, divided into its four pādas. Each pāda is a navāṃśa, so
     each carries a sign of its own — which is the thing worth seeing. */
  var x0=S.w*0.07, x1=S.w*0.93, y=st.y+st.h*0.26, h=st.h*0.15;
  mtStrip(x0,x1,y,h,P,4,false);
  function X(d){ return x0+(x1-x0)*((d-b0)/seg); }
  var nav0=Math.floor(b0/(30/9));
  for(var k=0;k<4;k++){
    var px0=x0+(x1-x0)*(k/4), px1=x0+(x1-x0)*((k+1)/4);
    if(k>0){ c.strokeStyle=P.gold; c.globalAlpha=.5; c.lineWidth=1.6;
      c.setLineDash([4,6]); c.beginPath(); c.moveTo(px0,y); c.lineTo(px0,y+h);
      c.stroke(); c.setLineDash([]); c.globalAlpha=1; }
    var ns=(nav0+k)%12;
    moText(moP("padaN",k+1),(px0+px1)/2,y+h*0.34,U*0.020,P.dim,"center",500);
    moText(mtRa(ns),(px0+px1)/2,y+h*0.74,U*0.026,P.ink,"center",700);
  }
  moText(dmDeg(b0),x0,y+h+U*0.028,U*0.019,P.dim,"left",500);
  moText(dmDeg(b1),x1,y+h+U*0.028,U*0.019,P.dim,"right",500);

  /* when this nakṣatra is pinned, a marker walks its 13°20′, and the pāda it is
     in at that moment is the one lit — which is the point of the division */
  if(s.pinned){
    var nd=b0+s.q*seg, pk=Math.min(3,Math.floor(s.q*4));
    var px0=x0+(x1-x0)*(pk/4), px1=x0+(x1-x0)*((pk+1)/4);
    MO.ctx.fillStyle="rgba(217,182,104,0.10)";
    MO.ctx.fillRect(px0,y,px1-px0,h);
    mtSweep(X(nd),y-U*0.010,y+h+U*0.006,P,dmDeg(nd),U);
  }
  /* anything of the reader's that falls in this nakṣatra */
  var mine=mtGrahas().filter(function(g){
    var d=((g.sid%360)+360)%360; return d>=b0 && d<b1; });
  mine.forEach(function(g,k){
    var x=X(((g.sid%360)+360)%360);
    moGlowDot(x,y+h*0.5,U*0.011,P.gold,P.gold);
    moText(g.n,x,y-U*0.014-k*U*0.030,U*0.024,P.gold,"center",700);
  });

  var ty=y+h+st.h*0.15;
  moSerif(String(i+1)+".  "+mtNk(i),cx,ty,U*0.066,P.gold);
  moText(moP("nakLord",moTgraha(lord),dmDeg(b0),dmDeg(b1)),
    cx,ty+U*0.052,U*0.028,P.ink,"center",600);
  moText(moP("nakDeity",moTdeity(i,MT_NKD[i]),moTgana(MT_NKG[i])),
    cx,ty+U*0.090,U*0.024,P.dim,"center",400);
  moText(moP("nakLater"),
    cx,ty+U*0.122,U*0.019,P.dim,"center",400);

  /* the one that matters most: the Moon's, which starts the daśā */
  var moon=(J.grahas||[]).filter(function(g){ return /Candra/.test(g.key||""); })[0];
  if(moon){
    var md=((moon.sidereal_deg%360)+360)%360, mi=Math.floor(md/seg);
    if(mi===i) moText(moP("nakCandra")+" \u2014 "+lord,
      cx,ty+U*0.162,U*0.026,P.gold,"center",700);
    else moText(mine.length? moP("holding",mine.map(function(g){ return moTgraha((typeof EN!=="undefined"&&EN[g.full])||g.full); }).join(", "))
                           : moP("nothingIn"),
      cx,ty+U*0.162,U*0.024,mine.length?P.ink:P.dim,"center",500);
  }
  if(!s.pinned) mtRail(27,i,P);
  return {ms:null, sub:mtNk(i)+" — "+(i+1)+" of 27"};
 }}

];
/* degrees as d°m′, for the nakṣatra bounds which are never whole numbers */
function dmDeg(x){ var d=Math.floor(x), m=Math.round((x-d)*60);
  if(m===60){ d++; m=0; } return d+"°"+(m<10?"0":"")+m+"′"; }

MO_SCENES=MO_SCENES.concat(MO_TEACH);
