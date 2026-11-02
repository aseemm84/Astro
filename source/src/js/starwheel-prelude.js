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
function dm(x){var d=Math.floor(x),m=Math.floor((x-d)*60);return d+"°"+(m<10?"0":"")+m+"′";}
