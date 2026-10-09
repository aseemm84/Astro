/* ================= 11. Compatibility (Aṣṭakūṭa) ================= */
var VAR_RANK={Brahmin:4,Kshatriya:3,Vaishya:2,Shudra:1};
var VASH_I={Chatushpada:0,Nara:1,Jalachara:2,Vanachara:3,Keeta:4};
var VASH_T=[[2,1,1,0.5,1],[1,2,0.5,0,1],[1,0.5,2,1,1],[0,0,0,2,0],[1,1,1,0,2]];   // rows: boy, cols: girl
var YONI=["Horse","Elephant","Sheep","Serpent","Dog","Cat","Rat","Cow","Buffalo","Tiger","Deer","Monkey","Mongoose","Lion"];
var YONI_T=[[4,2,2,3,2,2,2,1,0,1,3,3,2,1],[2,4,3,3,2,2,2,2,3,1,2,3,2,0],[2,3,4,2,1,2,1,3,3,1,2,0,3,1],[3,3,2,4,2,1,1,1,1,2,2,2,0,2],
  [2,2,1,2,4,2,1,2,2,1,0,2,1,1],[2,2,2,1,2,4,0,2,2,1,3,3,2,1],[2,2,1,1,1,0,4,2,2,2,2,2,1,2],[1,2,3,1,2,2,2,4,3,0,3,2,2,1],
  [0,3,3,1,2,2,2,3,4,1,2,2,2,1],[1,1,1,2,1,1,2,0,1,4,1,1,2,1],[3,2,2,2,0,3,2,3,2,1,4,2,2,1],[3,3,0,2,2,3,2,2,2,1,2,4,3,2],
  [2,2,3,0,1,2,1,2,2,2,2,3,4,2],[1,0,1,2,1,1,2,1,1,1,1,2,2,4]];
var GANA_I={Deva:0,Manushya:1,Rakshasa:2}, GANA_T=[[6,6,0],[5,6,0],[1,0,6]];      // rows: boy, cols: girl
function vashyaOf(sign,deg){ var v=VASHYA[sign]; if(v.indexOf("/")<0) return v; var p=v.split("/"); return deg<15?p[0]:p[1]; }
function maitriRel(a,b){ if(a===b) return "same"; return FR[a].indexOf(b)>=0?"friend":(EM[a].indexOf(b)>=0?"enemy":"neutral"); }
function maitriPts(a,b){ var x=maitriRel(a,b), y=maitriRel(b,a);
  if(x==="same") return 5; var k=[x,y].sort().join("-");
  return {"friend-friend":5,"friend-neutral":4,"neutral-neutral":3,"enemy-friend":1,"enemy-neutral":0.5,"enemy-enemy":0}[k]; }
function kutaPerson(sid,lagSid,marsSid,name){
  var sg=Math.floor(sid/30)%12, n=nakOf(sid);
  return {name:name,sid:sid,sign:sg,deg:sid%30,nak:n,varna:VARNA[sg],vashya:vashyaOf(sg,sid%30),yoni:NAKY[n.idx],gana:NAKG[n.idx],nadi:NAKN[n.idx],lord:LORD[sg],
    lag:lagSid!=null?Math.floor(lagSid/30)%12:null,mars:marsSid!=null?Math.floor(marsSid/30)%12:null};
}
function matchHtml(D,J2,opt){
  var gk=function(k){ var g=(J2.grahas||[]).filter(function(x){ return EN[x.key]===k; })[0]; return g?g.sidereal_deg:null; };
  var A=kutaPerson(D.P.Moon.sid,D.lagna.sidereal_deg,D.P.Mars?D.P.Mars.sid:null,opt.nameA||"This chart");
  var B=kutaPerson(gk("Moon"),J2.lagna?J2.lagna.sidereal_deg:null,gk("Mars"),opt.nameB||"Partner");
  var boy=opt.aIsBoy?A:B, girl=opt.aIsBoy?B:A;
  var K=[];
  var vp=VAR_RANK[boy.varna]>=VAR_RANK[girl.varna]?1:0;
  K.push(["Varṇa",1,vp,boy.varna,girl.varna,"Temperament and vocation class of the Moon sign. Full point when the boy's class is equal or higher."]);
  K.push(["Vaśya",2,VASH_T[VASH_I[boy.vashya]][VASH_I[girl.vashya]],boy.vashya,girl.vashya,"Mutual pull or influence, from the Moon sign's animal group."]);
  var cg=((boy.nak.idx-girl.nak.idx+27)%27)+1, cb=((girl.nak.idx-boy.nak.idx+27)%27)+1, bad=[3,5,7];
  var tp=(bad.indexOf(cg%9)<0?1.5:0)+(bad.indexOf(cb%9)<0?1.5:0);
  K.push(["Tārā",3,tp,boy.nak.name,girl.nak.name,"Counted each way between the birth stars; a count falling on the 3rd, 5th or 7th tārā loses 1½."]);
  K.push(["Yoni",4,YONI_T[YONI.indexOf(boy.yoni)][YONI.indexOf(girl.yoni)],boy.yoni,girl.yoni,"Instinctive and physical compatibility, from the nakṣatra animals."]);
  var mp=maitriPts(boy.lord,girl.lord);
  K.push(["Graha maitrī",5,mp,boy.lord,girl.lord,"Natural friendship between the Moon-sign lords — the mental rapport."]);
  K.push(["Gaṇa",6,GANA_T[GANA_I[boy.gana]][GANA_I[girl.gana]],boy.gana,girl.gana,"Deva, Manuṣya or Rākṣasa nature of the birth star."]);
  var dd=hFrom(boy.sign,girl.sign), bk=[2,12,5,9,6,8].indexOf(dd)>=0?0:7;
  K.push(["Bhakūṭa",7,bk,SA[boy.sign],SA[girl.sign],"Distance between the Moon signs; 2/12, 5/9 and 6/8 score nothing."]);
  var np=boy.nadi===girl.nadi?0:8;
  K.push(["Nāḍī",8,np,boy.nadi,girl.nadi,"Constitution (Ādi, Madhya, Antya); the same nāḍī scores nothing."]);
  var tot=K.reduce(function(s,k){ return s+k[2]; },0);
  var rows=K.map(function(k){ var pc=k[2]/k[1];
    return '<tr><td><b>'+k[0]+'</b></td><td>'+esc(k[3])+'</td><td>'+esc(k[4])+'</td>'+
      '<td class="knum" style="font-weight:700;color:'+(pc>=0.75?"#1c6b46":pc>=0.4?"#b08a2e":"#a1493a")+'">'+k[2]+' / '+k[1]+'</td><td class="kmut">'+k[5]+'</td></tr>'; });
  var sameLordOrFriends=boy.lord===girl.lord||(maitriRel(boy.lord,girl.lord)==="friend"&&maitriRel(girl.lord,boy.lord)==="friend");
  var exc=[];
  if(np===0) exc.push('<b>Nāḍī</b> scores 0. Commonly cited exceptions — same Moon sign with different nakṣatras: '+
    (boy.sign===girl.sign&&boy.nak.idx!==girl.nak.idx?'<span class="kgood">holds</span>':'does not hold')+'; same nakṣatra in different pādas: '+
    (boy.nak.idx===girl.nak.idx&&boy.nak.pada!==girl.nak.pada?'<span class="kgood">holds</span>':'does not hold')+'; same Moon-sign lord: '+
    (boy.lord===girl.lord?'<span class="kgood">holds</span>':'does not hold')+'.');
  if(bk===0) exc.push('<b>Bhakūṭa</b> scores 0. Commonly cited exception — Moon-sign lords the same or mutual friends: '+
    (sameLordOrFriends?'<span class="kgood">holds</span>':'does not hold')+'.');
  if(GANA_T[GANA_I[boy.gana]][GANA_I[girl.gana]]<=1) exc.push('<b>Gaṇa</b> scores '+GANA_T[GANA_I[boy.gana]][GANA_I[girl.gana]]+
    '. Commonly cited exception — Moon-sign lords the same or mutual friends: '+(sameLordOrFriends?'<span class="kgood">holds</span>':'does not hold')+'.');
  function kuja(P){ if(P.mars==null) return "—"; var fl=P.lag!=null?hFrom(P.mars,P.lag):null, fm=hFrom(P.mars,P.sign), set=[1,2,4,7,8,12];
    return 'Mars in the '+(fl?ord(fl)+' from lagna':'?')+', '+ord(fm)+' from Moon — '+
      ((fl&&set.indexOf(fl)>=0)||set.indexOf(fm)>=0?'<b>placement tested positive</b>':'not in the tested houses'); }
  var band=(tot>=18?"at or above":"below")+" the traditional threshold of 18";
  return '<div class="kcards"><div class="kcard"><div class="k">Guṇa total</div><div class="v">'+tot+' / 36</div><div class="s">'+band+'</div></div>'+
    '<div class="kcard"><div class="k">'+esc(A.name)+'</div><div class="v">'+SA[A.sign]+'</div><div class="s">'+esc(A.nak.name)+' pāda '+A.nak.pada+(opt.aIsBoy?' · boy\'s column':' · girl\'s column')+'</div></div>'+
    '<div class="kcard"><div class="k">'+esc(B.name)+'</div><div class="v">'+SA[B.sign]+'</div><div class="s">'+esc(B.nak.name)+' pāda '+B.nak.pada+(opt.aIsBoy?' · girl\'s column':' · boy\'s column')+'</div></div></div>'+
    '<div class="kmbar"><span style="width:'+(tot/36*100).toFixed(1)+'%"></span><i style="left:50%"></i></div>'+
    tbl(["Kūṭa","Boy","Girl","Points","What it compares"],rows)+
    (exc.length?'<h4 class="ksub">Doṣas and their tested exceptions</h4><ul class="kmlist">'+exc.map(function(x){ return '<li>'+x+'</li>'; }).join("")+'</ul>':'')+
    '<h4 class="ksub">Mars placement (Kuja)</h4><ul class="kmlist"><li>'+esc(A.name)+': '+kuja(A)+'</li><li>'+esc(B.name)+': '+kuja(B)+'</li></ul>'+
    '<p class="klegend">Mars in the 1st, 2nd, 4th, 7th, 8th or 12th is the placement tradition tests; texts list many cancellations, and a '+
    'placement in both charts is traditionally held to balance.</p>'+
    '<div class="kbox kwarn"><b>How to read this</b>Aṣṭakūṭa compares only the two Moons — one factor among the whole of two charts. '+
    'It is a traditional screening method, taught here for study. It is not a verdict on any relationship, and no decision about a '+
    'real person should rest on it. Tables differ between editions (especially Vaśya and Gaṇa); the ones used here are the commonly printed set.</div>';
}
function matchPane(){
  return '<p class="knote">The traditional eight-fold (Aṣṭakūṭa) comparison of two birth Moons, scored out of 36. Enter the second '+
    'person\'s birth details; nothing is sent anywhere. The classical tables are written for a boy and a girl, and some kūṭas are not '+
    'symmetric, so choose which column each person takes.</p>'+
    '<div class="k-form kmatch-form">'+
    '<div class="k-full"><label for="km-name">Second person\'s name (optional)</label><input type="text" id="km-name" autocomplete="off"></div>'+
    '<div><label for="km-dob">Date of birth</label><input type="date" id="km-dob"></div>'+
    '<div><label for="km-tob">Time of birth</label><input type="time" id="km-tob" step="60"></div>'+
    '<div class="k-full"><label for="km-search">Place of birth</label><div class="k-searchrow"><input type="text" id="km-search" placeholder="Type a city name" autocomplete="off">'+
    '<button type="button" class="k-btn sec" id="km-searchbtn">Search</button></div><div id="km-results" class="k-results"></div><p class="klegend" id="km-note"></p></div>'+
    '<div><label for="km-lat">Latitude</label><input type="number" id="km-lat" step="0.0001"></div>'+
    '<div><label for="km-lon">Longitude</label><input type="number" id="km-lon" step="0.0001"></div>'+
    '<div><label for="km-tz">UTC offset</label><input type="number" id="km-tz" step="0.25"></div>'+
    '<div class="k-full"><label for="km-role">This chart takes the</label><select id="km-role"><option value="boy">boy\'s column</option><option value="girl">girl\'s column</option></select></div>'+
    '<div class="k-full"><button type="button" class="k-btn" id="km-go">Compare the two Moons</button></div></div><div id="km-out"></div>';
}

/* ===== Glass box: every instrumented figure can show its own derivation =====
   Each explainer recomputes the value from first principles and states the rule
   and its citation. Because it recomputes rather than reading the rendered text,
   a disagreement between the two is itself a bug — so each panel checks. */
/* deep debilitation = 7th sign from exaltation, at the same degree (Ch. 3, vv. 49-50) */
var GB_DEEP_DEB={Sun:190,Moon:213,Mars:118,Mercury:345,Jupiter:275,Venus:177,Saturn:20};
var GB_EXALT_DEG={Sun:10,Moon:3,Mars:28,Mercury:15,Jupiter:5,Venus:27,Saturn:20};
var GB_SAPTA_VAL={moolatrikona:45,own:30,greatfriend:20,friend:15,neutral:10,enemy:4,greatenemy:2};
var GB_SEVEN=["D1","D2","D3","D7","D9","D12","D30"];
var GB_VARGA_VISWA={own:20,greatfriend:18,friend:15,neutral:10,enemy:7,greatenemy:5};

function gbRow(label,value,note){
  return '<tr><td>'+label+'</td><td class="knum">'+value+'</td><td class="kmut">'+(note||"")+'</td></tr>';
}
function gbWrap(title,cite,rows,foot,verdict){
  return '<div class="gbpanel"><div class="gbhead"><b>'+esc(title)+'</b>'+
    (cite?'<span class="gbcite">'+esc(cite)+'</span>':'')+
    '<button type="button" class="gbclose" aria-label="Close">×</button></div>'+
    '<div class="ktwrap"><table class="ktbl gbtab"><tbody>'+rows+'</tbody></table></div>'+
    (foot?'<p class="gbfoot">'+foot+'</p>':'')+
    (verdict?'<p class="gbcheck '+(verdict.ok?"ok":"bad")+'">'+
      (verdict.ok?"✓ recomputed and matches the figure shown above."
                 :"✗ recomputation disagrees with the displayed figure — "+esc(verdict.detail))+'</p>':'')+
    '</div>';
}
function gbFmt(x,n){ return (Math.round(x*Math.pow(10,n||2))/Math.pow(10,n||2)).toFixed(n||2); }

