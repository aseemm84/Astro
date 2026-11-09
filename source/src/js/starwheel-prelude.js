/* The four things report/sky/40-star-wheel.js expects from the report's scope.
   It is concatenated after this so that this page and the report's Star wheel
   tab share one renderer rather than two copies of a projection — but it was
   written inside a bundle that already had these, so they are supplied here.

   Copied rather than imported because the alternative is dragging in the whole
   helpers slice, and starwheel-verify.mjs asserts each is character-identical
   to the report's, so a copy cannot rot without a test going red.

   Deliberately NOT supplied: MON, nakOf, wheelLegend and EN. Those are reached
   only from swhDraw, swhFacts and swhChips — the report page's own controller,
   which this page replaces and never calls. A stub would let a stray call
   render something subtly wrong; leaving them undefined makes it throw. */
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
/* dm and its dmFmt are lifted VERBATIM from report/core/01-helpers.js.
   ecliptic-verify and starwheel-verify assert this copy is
   character-identical to the report's, so the two cannot drift; editing
   one without the other fails those suites by design. */
function dmFmt(){
  try{ var S=window.NSettings&&window.NSettings.get(); return (S&&S.degfmt)||"dm"; }
  catch(e){ return "dm"; }
}
function dm(x){
  var f=dmFmt();
  if(f==="dec") return (Math.round(x*1e4)/1e4).toFixed(4)+"°";
  /* The default branch is the ORIGINAL expression, character for character,
     including its treatment of negatives: Math.floor(-5.5) is -6, so a
     latitude of -5.5 prints -6°30′. An earlier version of this "improved"
     that by taking the absolute value and prefixing a sign, which prints
     -5°30′ instead — a different number. ecliptic-verify and starwheel-verify
     both caught it, because ecliptic latitudes are negative. Whatever this
     convention is, it is the one every published figure was computed with,
     and a formatting setting is not licence to change it. */
  var d=Math.floor(x),m=Math.floor((x-d)*60);
  if(f==="dms"){
    var sec=Math.round(((x-d)*60-m)*60);
    if(sec===60){sec=0;m++;}
    if(m===60){m=0;d++;}
    return d+"°"+(m<10?"0":"")+m+"′"+(sec<10?"0":"")+sec+"″";
  }
  return d+"°"+(m<10?"0":"")+m+"′";
}

