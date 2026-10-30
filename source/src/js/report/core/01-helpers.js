/* ===== Kundli report engine (client-side) ===== */
(function(){
var SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
var LORD=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
var NAKS=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
var NL9=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
var EN={"Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars","Budha":"Mercury","Guru":"Jupiter","Śukra":"Venus","Śani":"Saturn","Rāhu":"Rahu","Ketu":"Ketu",
 "Sun":"Sun","Moon":"Moon","Mars":"Mars","Mercury":"Mercury","Jupiter":"Jupiter","Venus":"Venus","Saturn":"Saturn","Rahu":"Rahu"};
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var ORD=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
var EXALT={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
var DEBIL={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
var OWN={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
var MT={Sun:[4,0,20],Moon:[1,3,30],Mars:[0,0,12],Mercury:[5,15,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]};
var FR={Sun:["Moon","Mars","Jupiter"],Moon:["Sun","Mercury"],Mars:["Sun","Moon","Jupiter"],Mercury:["Sun","Venus"],Jupiter:["Sun","Moon","Mars"],Venus:["Mercury","Saturn"],Saturn:["Mercury","Venus"]};
var EM={Sun:["Venus","Saturn"],Moon:[],Mars:["Mercury"],Mercury:["Moon"],Jupiter:["Mercury","Venus"],Venus:["Sun","Moon"],Saturn:["Sun","Moon","Mars"]};
/* The combustion orbs come from the engine, which is also what writes them into
   the downloaded JSON. One table, so the figure on screen and the figure in the
   file cannot differ. */
var COMB=window.__COMB;
var DIGB={Sun:10,Mars:10,Moon:4,Venus:4,Mercury:1,Jupiter:1,Saturn:7};
var VY={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
var VSEQ=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
var DPY=365.2564;
/* Each of these is painted on its matching DIGBG below, so the pair travels
   together and needs no theming — but the pair has to clear the line on its
   own, and four of the eight did not: friend measured 4.38:1, own 4.41:1,
   neutral 4.12:1 and enemy 4.33:1 on their own grounds. Darkened until every
   one clears 4.5:1, measured rather than judged by eye. */
var DIGC={exalted:"#1c6b46",moolatrikona:"#1c6b46",own:"#1f6259",friend:"#2f5c8c",neutral:"#645a42",enemy:"#8a4f2d",debilitated:"#9e3d3d",node:"#5a4b75"};
var DIGBG={exalted:"#dff0e6",moolatrikona:"#dff0e6",own:"#dcefec",friend:"#e2ecf8",neutral:"#f0ece0",enemy:"#f7e6da",debilitated:"#f8e0e0",node:"#ece7f4"};
var MON=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ---- Choghaḍiyā, one derivation for the whole report --------------------
   There were three copies of this in the codebase: panchanga.js, the muhūrta
   section and the Now tab. The two in the report were daytime-only and spelled
   the names in ASCII — "Chara" where the rest of the site writes "Cala" — and
   the Now tab answered "night — not tabulated" for every hour between sunset
   and sunrise, which is half of every day.

   One cycle now, shared by both report sites, and identical by construction to
   the one in panchanga.js: the seven names in hora order, each weekday's day
   run starting at its own lord and advancing one place, its night run starting
   five places on and advancing five. chogh-verify asserts the two copies agree
   across all 7 × 2 × 8 slots, which is the only thing that keeps them honest.

   TIER. Choghaḍiyā is later muhūrta practice. The uploaded Santhanam edition
   does not give it, and every page that shows it says so. It names the parts
   of a day; it does not predict anything. */
var CHOG_CYCLE=["Udvega","Cala","Lābha","Amṛta","Kāla","Śubha","Roga"];
var CHOG_START=[0,3,6,2,5,1,4];            /* Sunday first */
var CHOG_GOOD={"Amṛta":1,"Śubha":1,"Lābha":1,"Cala":1};
function chogRun(wd,night){
  var a=[], st=CHOG_START[((wd%7)+7)%7]+(night?5:0), step=night?5:1;
  for(var i=0;i<8;i++) a.push(CHOG_CYCLE[(st+i*step)%7]);
  return a;
}
try{ window.__chogRun=chogRun; window.__chogGood=CHOG_GOOD; }catch(e){}

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function dm(x){var d=Math.floor(x),m=Math.floor((x-d)*60);return d+"°"+(m<10?"0":"")+m+"′";}
function nakOf(deg){var seg=40/3,x=((deg%360)+360)%360,i=Math.min(Math.floor(x/seg),26);
  return {name:NAKS[i],pada:Math.floor((x-i*seg)/(seg/4))+1,lord:NL9[i%9],idx:i};}
function dignity(pl,sign,deg){
  if(pl==="Rahu"||pl==="Ketu")return "node";
  if(sign===EXALT[pl])return "exalted";
  if(sign===DEBIL[pl])return "debilitated";
  var m=MT[pl];
  if(m&&sign===m[0]&&deg!=null&&deg>=m[1]&&deg<m[2])return "moolatrikona";
  if(OWN[pl].indexOf(sign)>=0)return "own";
  var l=LORD[sign];
  if(l===pl)return "own";
  if(FR[pl].indexOf(l)>=0)return "friend";
  if(EM[pl].indexOf(l)>=0)return "enemy";
  return "neutral";
}
var DRANK={exalted:3,moolatrikona:3,own:2,friend:1,neutral:0,enemy:-1,debilitated:-2,node:0};
function jd2d(jd){jd+=0.5;var Z=Math.floor(jd),F=jd-Z,A;
  if(Z<2299161)A=Z;else{var al=Math.floor((Z-1867216.25)/36524.25);A=Z+1+al-Math.floor(al/4);}
  var B=A+1524,C=Math.floor((B-122.1)/365.25),D=Math.floor(365.25*C),E=Math.floor((B-D)/30.6001);
  var day=B-D-Math.floor(30.6001*E)+F,m=E<14?E-1:E-13,y=m>2?C-4716:C-4715;
  return {y:y,m:m,d:Math.floor(day)};}
var TZOFF=0;   // hours; set from the chart input so dates render in local time
function fdate(jd){var o=jd2d(jd+TZOFF/24);return (o.d<10?"0":"")+o.d+" "+MON[o.m]+" "+o.y;}
function fmy(jd){var o=jd2d(jd+TZOFF/24);return MON[o.m]+" "+o.y;}
function chip(d){return '<span class="kchip" style="color:'+DIGC[d]+';background:'+DIGBG[d]+'">'+(d==="moolatrikona"?"MOOL":d.slice(0,4).toUpperCase())+'</span>';}
function rname(r){if(r==null)return "?";if(typeof r==="string")return r;return r.enName||r.saName||r.iast||"?";}
function ridx(r){if(r&&typeof r==="object"&&r.idx!=null)return r.idx;var n=rname(r);var i=SIGNS.indexOf(n);return i<0?0:i;}


