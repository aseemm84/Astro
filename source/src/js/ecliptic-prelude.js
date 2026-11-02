/* What report/sky/37-ecliptic-wheel.js expects from the report's scope.

   The renderer is concatenated after this, unmodified, so this page and the
   report's Sky tab animate through one implementation of the wheel rather
   than two copies of a projection that would drift apart. 02-varga-lagna.js
   follows too, because the renderer calls vargaLagna for every varga other
   than D1 and that module is self-contained — importing it is cheaper and
   safer than restating its arithmetic here.

   GL, SA, LORD, esc and dm are copied rather than imported, because the
   alternative is dragging in the whole helpers slice for five lines.
   ecliptic-verify.mjs asserts each is character-identical to the report's,
   so a copy cannot rot without a test going red.

   Deliberately NOT supplied: MON, nakOf, SKY_PRINT_R and the rest of the
   report's helpers. MON and nakOf are reached only from skyStamp and
   skyRedraw — the report pane's own controller, which this page replaces and
   never calls — and SKY_PRINT_R only from skyWheel, the static print wheel,
   which this page does not draw. A stub would let a stray call render
   something subtly wrong; leaving them undefined makes it throw where a test
   can see it. */
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
/* the lord of each rāśi, in sign order; skyFurniture prints its glyph inside
   each wedge, so this is drawn content and not a stub */
var LORD=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function dm(x){var d=Math.floor(x),m=Math.floor((x-d)*60);return d+"°"+(m<10?"0":"")+m+"′";}
