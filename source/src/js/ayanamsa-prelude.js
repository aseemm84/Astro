/* What report/core/04-chart-svg.js expects from the report's scope.

   The rāśi chart on this page is northChart() — the report's own builder,
   concatenated after this — so the chart a reader sees here is the chart the
   report draws rather than a lookalike that would drift from it. It was
   written inside a bundle that already had these three, so they are supplied
   here, and ayanamsa-verify asserts each is character-identical to the
   report's copy; a drift would then fail a test rather than quietly produce
   a chart that disagreed with the real one.

   They are declared at the top level on purpose: northChart is a top-level
   function and cannot see anything inside the page controller's closure. */
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
