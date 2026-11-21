/* ===== Motion — the Reel Agent's handle on a scene =========================
   The Reel Agent narrates and encodes; it needs three things from a scene and
   nothing more: the frame at a playhead, the playhead schedule the recorder
   would use, and the words and dates the frame itself prints. All three are
   read through the functions moRecordLoop and moDraw already use, so a reel
   made by the agent shows exactly what "Record this loop" would have shown.

   Drawing happens on the agent's own canvas. MO.cv, MO.ctx, the ratio, the
   guides, the language and the playhead are swapped for one frame and put
   back before the call returns, synchronously, so the page's own loop can
   never paint into the middle of it and the reader's view is never touched.
   ========================================================================= */
function moRAWith(cv, lang, p, fn){
  var keep={cv:MO.cv, ctx:MO.ctx, ratio:MO.ratio, guides:MO.guides, safe:MO.safeLayout,
            p:MO.p, lang:MO_LANG};
  MO.cv=cv; MO.ctx=cv.getContext("2d"); MO.ratio="9:16"; MO.guides=false;
  MO.safeLayout=true; MO.p=p; MO_LANG=(lang==="hi"?"hi":"en");
  try{ return fn(); }
  finally{
    MO.cv=keep.cv; MO.ctx=keep.ctx; MO.ratio=keep.ratio; MO.guides=keep.guides;
    MO.safeLayout=keep.safe; MO.p=keep.p; MO_LANG=keep.lang;
  }
}
/* The loop's playhead, one entry per frame at fps, stepped exactly as the
   recorder steps it — so the pacing holds on an eclipse here as it does in
   a recorded loop. Capped, and the cap is reported. */
function moRASchedule(fps, capS){
  var rep=moPaceReport(), dur=rep.dur, capped=false;
  if(dur>capS){ dur=capS; capped=true; }
  var n=Math.max(2,Math.round(dur*fps)), out=new Array(n), p=0;
  for(var i=0;i<n;i++){ out[i]=p; p=moPaceStep(p,1000/fps); if(p>=1) p-=1; }
  return {seconds:n/fps, table:out, capped:capped, full:rep.dur};
}
window.__moRA = {
  scene: function(){ return MO.scene; },
  personal: function(){ return !!MO_NEEDS_CHART[MO.scene]; },
  available: function(){ return moSceneAvailable(MO.scene); },
  words: function(lang){
    var keep=MO_LANG; MO_LANG=(lang==="hi"?"hi":"en");
    try{ return moSceneWords(moSceneOf(MO.scene)); } finally{ MO_LANG=keep; }
  },
  span: function(lang){
    var keep=MO_LANG; MO_LANG=(lang==="hi"?"hi":"en");
    try{ return moSpanLabel(); } finally{ MO_LANG=keep; }
  },
  schedule: moRASchedule,
  stage: function(){ var keep=MO.ratio, ks=MO.safeLayout; MO.ratio="9:16"; MO.safeLayout=true;
    try{ return moStage(); } finally{ MO.ratio=keep; MO.safeLayout=ks; } },
  /* draw p (the scene's own playhead) into cv at 1080×1920 — one moDraw,
     exactly what the recorder hands its encoder */
  draw: function(cv, p, lang){
    return moRAWith(cv, lang, p, function(){ moDraw(); return true; });
  },
  /* read only the scene's report at p, without keeping any of the paint */
  info: function(cv, p, lang){
    return moRAWith(cv, lang, p, function(){
      var sc=moSceneOf(MO.scene), info=null;
      moClear();
      try{ info=sc.draw(p); }catch(e){ info=null; }
      return info?{ms:info.ms, sub:info.sub}:null;
    });
  }
};
