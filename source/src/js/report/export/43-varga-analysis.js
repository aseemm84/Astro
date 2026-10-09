/* ===== Divisional analysis applied uniformly to all sixteen vargas =====
   A varga is normally read only as a set of positions. These five treat each
   division as a chart in its own right, using exactly the rules already proven
   on the rāśi chart.

   One stated limit throughout: a varga gives a sign, not a degree. Anything that
   needs a degree — the exact Sphuṭa Dṛṣṭi formula, Uchcha Bala — cannot be had
   here, so aspects below are whole-sign and are labelled as such. */
var VA_CODES=["D1","D2","D3","D4","D7","D9","D10","D12","D16","D20","D24","D27",
              "D30","D40","D45","D60"];
var VA_NAMES={D1:"Rāśi",D2:"Horā",D3:"Drekkāṇa",D4:"Caturthāṃśa",D7:"Saptāṃśa",D9:"Navāṃśa",
 D10:"Daśāṃśa",D12:"Dvādaśāṃśa",D16:"Ṣoḍaśāṃśa",D20:"Viṃśāṃśa",D24:"Caturviṃśāṃśa",
 D27:"Saptaviṃśāṃśa",D30:"Triṃśāṃśa",D40:"Khavedāṃśa",D45:"Akṣavedāṃśa",D60:"Ṣaṣṭyāṃśa"};
var VA_SIG={D1:"the body and the life as a whole",D2:"wealth and sustenance",
 D3:"siblings and courage",D4:"property and fixed assets",D7:"children and progeny",
 D9:"dharma, marriage and the maturing of every graha",D10:"profession and action in the world",
 D12:"parents and ancestry",D16:"vehicles, comforts and happiness",D20:"spiritual practice",
 D24:"learning and education",D27:"strength and weakness of body and mind",
 D30:"misfortune and the sources of trouble",D40:"maternal inheritance",
 D45:"paternal inheritance",D60:"the sum of past karma"};
var VA_BEN=["Jupiter","Venus","Mercury","Moon"];

function vaVargaOf(D,code){
  var v=null; D.vargas.forEach(function(x){ if(x.code===code) v=x; });
  return v;
}
/* --- 1. each varga read as a chart: its own lagna, bhāvas and house lords --- */
function vaHouseAnalysis(D){
  var out=[];
  VA_CODES.forEach(function(code){
    var v=vaVargaOf(D,code); if(!v||v.lagna==null) return;
    var L=v.lagna, houses=[], byHouse={};
    ORD.forEach(function(p){
      if(v.pos[p]==null) return;
      var h=((v.pos[p]-L)%12+12)%12+1;
      (byHouse[h]=byHouse[h]||[]).push(p);
    });
    for(var h=1;h<=12;h++){
      var sg=(L+h-1)%12, lord=LORD[sg];
      var lordHouse=(v.pos[lord]!=null)?(((v.pos[lord]-L)%12+12)%12+1):null;
      houses.push({house:h, sign:sg, lord:lord,
        lord_house:lordHouse, lord_dignity:v.dig[lord]||null,
        occupants:(byHouse[h]||[]),
        role:([1,4,7,10].indexOf(h)>=0?"kendra":[1,5,9].indexOf(h)>=0?"trikona":
              [6,8,12].indexOf(h)>=0?"dusthana":[3,6,10,11].indexOf(h)>=0?"upachaya":"other")});
    }
    out.push({code:code, name:VA_NAMES[code], signifies:VA_SIG[code], lagna:L,
              lagna_lord:LORD[L], houses:houses});
  });
  return out;
}
/* --- 2. per-graha tally of dignity across all sixteen --- */
function vaDignityTally(D){
  var d1=vaVargaOf(D,"D1");
  return ORD.slice(0,7).concat(["Rahu","Ketu"]).map(function(p){
    var t={graha:p, own:0, exalted:0, moolatrikona:0, friend:0, neutral:0,
           enemy:0, debilitated:0, vargottama:0, counted:0, vargottama_in:[]};
    VA_CODES.forEach(function(code){
      var v=vaVargaOf(D,code); if(!v||v.pos[p]==null) return;
      t.counted++;
      var dg=v.dig[p];
      if(t[dg]!=null) t[dg]++;
      if(d1&&d1.pos[p]!=null&&v.pos[p]===d1.pos[p]&&code!=="D1"){
        t.vargottama++; t.vargottama_in.push(code);
      }
    });
    t.strong=t.own+t.exalted+t.moolatrikona;
    t.weak=t.enemy+t.debilitated;
    return t;
  });
}
/* --- 3. the mirror: how well placed the grahas are within each varga --- */
function vaVargaProfile(D){
  return VA_CODES.map(function(code){
    var v=vaVargaOf(D,code); if(!v) return null;
    var r={code:code, name:VA_NAMES[code], lagna:v.lagna!=null?v.lagna:null,
           strong:0, neutral:0, weak:0, counted:0, grahas:{}};
    ORD.slice(0,7).forEach(function(p){
      if(v.pos[p]==null) return;
      var dg=v.dig[p]; r.counted++; r.grahas[p]=dg;
      if(["own","exalted","moolatrikona"].indexOf(dg)>=0) r.strong++;
      else if(["enemy","debilitated"].indexOf(dg)>=0) r.weak++;
      else r.neutral++;
    });
    r.score=r.counted?Math.round((r.strong-r.weak)/r.counted*100):0;
    return r;
  }).filter(Boolean);
}
/* --- 4. whole-sign graha dṛṣṭi inside each varga --- */
function vaDrishti(D){
  return VA_CODES.map(function(code){
    var v=vaVargaOf(D,code); if(!v||v.lagna==null) return null;
    var L=v.lagna, rows=[];
    ORD.forEach(function(p){
      if(v.pos[p]==null) return;
      var fromH=((v.pos[p]-L)%12+12)%12+1;
      var offs=ASPOFF[p]||[6];
      var hs=offs.map(function(o){ return ((fromH-1+o)%12)+1; }).sort(function(a,b){return a-b;});
      var hit=[];
      ORD.forEach(function(q){
        if(q===p||v.pos[q]==null) return;
        var qh=((v.pos[q]-L)%12+12)%12+1;
        if(hs.indexOf(qh)>=0) hit.push(q);
      });
      rows.push({graha:p, from_house:fromH, aspects_houses:hs, aspects_grahas:hit,
                 nature:(VA_BEN.indexOf(p)>=0?"benefic":"malefic")});
    });
    return {code:code, name:VA_NAMES[code], aspects:rows};
  }).filter(Boolean);
}
/* --- 5. ashtakavarga computed inside every division --- */
function vaAshtakavarga(D){
  var T=(window.__AVT||{}); if(!T.Sun) return [];
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  return VA_CODES.map(function(code){
    var v=vaVargaOf(D,code); if(!v||v.lagna==null) return null;
    var sarva=new Array(12).fill(0), per=[];
    order.forEach(function(pl){
      var b=new Array(12).fill(0);
      Object.keys(T[pl]).forEach(function(c){
        var from=(c==="Lagna")?v.lagna:v.pos[c];
        if(from==null) return;
        T[pl][c].forEach(function(h){ b[(from+h-1)%12]++; });
      });
      per.push({graha:pl, bindus:b, total:b.reduce(function(a,x){return a+x;},0)});
      for(var i=0;i<12;i++) sarva[i]+=b[i];
    });
    var tot=sarva.reduce(function(a,x){return a+x;},0);
    return {code:code, name:VA_NAMES[code], varga_lagna:v.lagna, bhinna:per,
            sarva:sarva, sarva_total:tot,
            by_house:sarva.map(function(_,i){
              return {house:((i-v.lagna)%12+12)%12+1, sign:i, bindus:sarva[i]};
            }).sort(function(a,b){return a.house-b.house;})};
  }).filter(Boolean);
}
function buildVargaAnalysis(D){
  return {
    note:"Each division read as a chart in its own right. A varga yields a sign rather "+
      "than a degree, so the aspects below are whole-sign; the exact Sphuṭa Dṛṣṭi formula "+
      "used for the rāśi chart needs degrees and cannot be applied here.",
    houses:vaHouseAnalysis(D),
    dignity_tally:vaDignityTally(D),
    varga_profile:vaVargaProfile(D),
    drishti:vaDrishti(D),
    ashtakavarga:vaAshtakavarga(D)
  };
}
