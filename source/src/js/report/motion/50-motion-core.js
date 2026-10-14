/* ===== Motion studio: the animations tab =====
   A separate renderer from the ecliptic wheel, and deliberately so. The wheel is SVG
   because it is a precise, printable chart. These are canvas because they want glow,
   long fading trails, a few hundred stars and sixty frames a second at 1080×1920 —
   all of which canvas does cheaply and SVG does not. The two share the engine, not
   the drawing code, so nothing here can disturb the chart. */

var MO_RATIOS={
  "9:16":{w:1080,h:1920,label:"Vertical 9:16",note:"Reels, Stories, TikTok"},
  "1:1" :{w:1080,h:1080,label:"Square 1:1",  note:"Feed post"},
  "16:9":{w:1920,h:1080,label:"Wide 16:9",   note:"YouTube, a screen"}
};
/* Palettes. Midnight is the LearnHoro brand — gold on deep navy, the logo's own
   colours. Eclipse is for maximum contrast on a phone in daylight. Parchment is for
   a still you want to print or post as a light image. */
var MO_PALS={
  midnight:{key:"midnight",label:"Midnight",
    bg:"#0b1020", bg2:"#161d3a", ink:"#f2efe4", dim:"#8f96bb", line:"#2b3358",
    gold:"#d9b668", benefic:"#5fbf8f", malefic:"#e07a60", star:"#dfe6ff", glow:"#6f7cc0"},
  eclipse:{key:"eclipse",label:"Eclipse",
    bg:"#000000", bg2:"#0a0a0f", ink:"#ffffff", dim:"#9a9a9a", line:"#2a2a33",
    gold:"#ffc83d", benefic:"#4dffa6", malefic:"#ff6b4a", star:"#ffffff", glow:"#ffb02e"},
  parchment:{key:"parchment",label:"Parchment",
    bg:"#f7f3e8", bg2:"#eee7d6", ink:"#1d2340", dim:"#6c7089", line:"#d8d0ba",
    gold:"#a17c2a", benefic:"#2f7d55", malefic:"#b5533c", star:"#4a5078", glow:"#c9a24b"}
};
var MO_DUR=[{s:8,label:"8 s"},{s:15,label:"15 s"},{s:30,label:"30 s"},{s:60,label:"60 s"}];
var MO_NAMES=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
var MO_FULL={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",Jupiter:"Guru",
             Venus:"Śukra",Saturn:"Śani",Rahu:"Rāhu",Ketu:"Ketu"};
var MO_BEN={Jupiter:1,Venus:1,Mercury:1,Moon:1};

var MO={
  cv:null, ctx:null, D:null, J:null,
  ratio:"9:16", scene:"retro", pal:"midnight", dur:15,
  p:0, playing:false, raf:null, last:null, studio:false,
  show:{Sun:true,Moon:true,Mars:true,Mercury:true,Jupiter:true,Venus:true,Saturn:true,Rahu:true,Ketu:true},
  opt:{trail:true, trailLen:0.35, glow:true, stars:true, starDensity:160, grid:true,
       labels:true, loopFade:true, subject:"Mars"},
  cap:{title:"", sub:"", logo:true, handle:"@learnhoro", date:true},
  fps:0, _fpsT:0, _fpsN:0
};
function moPal(){ return MO_PALS[MO.pal]||MO_PALS.midnight; }
function moSize(){ return MO_RATIOS[MO.ratio]||MO_RATIOS["9:16"]; }

/* ---------------------------------------------------------------------------
   Canvas helpers
   --------------------------------------------------------------------------- */
function moClear(){
  var P=moPal(), S=moSize(), c=MO.ctx;
  var g=c.createLinearGradient(0,0,0,S.h);
  g.addColorStop(0,P.bg2); g.addColorStop(1,P.bg);
  c.fillStyle=g; c.fillRect(0,0,S.w,S.h);
}
/* A fixed starfield: the same every frame and every run, because a field that
   reshuffles each frame reads as noise. Seeded by index, not by Math.random. */
function moStars(){
  if(!MO.opt.stars) return;
  var P=moPal(), S=moSize(), c=MO.ctx, n=MO.opt.starDensity;
  for(var i=0;i<n;i++){
    var a=Math.sin(i*12.9898)*43758.5453, b=Math.sin(i*78.233)*12345.6789;
    var x=(a-Math.floor(a))*S.w, y=(b-Math.floor(b))*S.h;
    var m=(Math.sin(i*3.17)*0.5+0.5), r=0.7+m*1.9;
    c.globalAlpha=0.20+m*0.55;
    c.fillStyle=P.star;
    c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill();
  }
  c.globalAlpha=1;
}
function moGlowDot(x,y,r,fill,glow){
  var c=MO.ctx;
  if(MO.opt.glow){
    c.save(); c.shadowColor=glow||fill; c.shadowBlur=r*2.4;
    c.fillStyle=fill; c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill(); c.restore();
  } else {
    c.fillStyle=fill; c.beginPath(); c.arc(x,y,r,0,6.2832); c.fill();
  }
}
function moText(s,x,y,size,col,align,weight){
  var c=MO.ctx;
  c.fillStyle=col; c.textAlign=align||"center"; c.textBaseline="middle";
  c.font=(weight||600)+" "+size+"px "+'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  c.fillText(s,x,y);
}
function moSerif(s,x,y,size,col,align){
  var c=MO.ctx;
  c.fillStyle=col; c.textAlign=align||"center"; c.textBaseline="middle";
  c.font='600 '+size+'px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  c.fillText(s,x,y);
}
/* the stage is everything above the caption band */
function moStage(){
  var S=moSize();
  var capH = MO.ratio==="16:9" ? S.h*0.17 : S.h*0.19;
  var H=S.h-capH;
  return {x:0, y:0, w:S.w, h:H, cx:S.w/2, cy:H/2, capY:S.h-capH, capH:capH,
          R:Math.min(S.w*0.455, H*0.455)};
}

/* Shared crowding fix, the same rule the ecliptic wheel uses: a glyph never slides
   along the ring, it steps inward along its own bearing. The separation that clears
   two discs is computed per lane, since the same gap in degrees is a smaller gap in
   pixels further in. */
function moSpread(items,R,gR){
  var lanes=[R,R-gR*2.5,R-gR*5.0,R-gR*7.5], last=[];
  items.sort(function(a,b){ return a.lon-b.lon; });
  items.forEach(function(q){
    var L=0;
    while(L<lanes.length){
      var sep=(2*gR+8)/Math.max(1,lanes[L])*180/Math.PI;
      if(last[L]==null || (q.lon-last[L])>=sep) break;
      L++;
    }
    if(L>=lanes.length) L=lanes.length-1;
    last[L]=q.lon; q.r=lanes[L]; q.lane=L;
  });
  return items;
}
/* the dome works in altitude and azimuth, so crowding is pushed outward from the
   zenith instead — the same thing the printed dome does */
function moNudge(pt,placed,gap,cx,cy){
  for(var i=0;i<10;i++){
    var clash=false;
    for(var j=0;j<placed.length;j++){
      if(Math.hypot(placed[j][0]-pt[0],placed[j][1]-pt[1])<gap){ clash=true; break; }
    }
    if(!clash) break;
    var a=Math.atan2(pt[1]-cy,pt[0]-cx);
    if(!isFinite(a)) a=i*1.1;
    pt=[pt[0]+Math.cos(a)*gap*0.66, pt[1]+Math.sin(a)*gap*0.66];
  }
  return pt;
}
function moFmtDate(ms){
  var d=new Date(ms);
  return String(d.getUTCDate()).padStart(2,"0")+" "+MON[d.getUTCMonth()+1]+" "+d.getUTCFullYear();
}
/* ---------------------------------------------------------------------------
   Caption band — title, subtitle, running date, logo and handle. This is the part
   that makes a frame look like it came from somewhere rather than from a browser.
   --------------------------------------------------------------------------- */
function moCaption(dateMs,sub){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var y0=st.capY;
  var g=c.createLinearGradient(0,y0-40,0,y0+20);
  g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,P.bg);
  c.fillStyle=g; c.fillRect(0,y0-40,S.w,60);
  c.fillStyle=P.bg; c.fillRect(0,y0+19,S.w,st.capH);
  c.fillStyle=P.gold; c.fillRect(0,y0-1,S.w,2.5);

  var pad=S.w*0.07, big=S.w*0.054, small=S.w*0.027;
  var title=MO.cap.title||moSceneOf(MO.scene).title;
  moSerif(title,S.w/2,y0+st.capH*0.30,big,P.ink);
  var s2=MO.cap.sub||sub||moSceneOf(MO.scene).sub;
  if(s2) moText(s2,S.w/2,y0+st.capH*0.52,small,P.dim,"center",500);
  if(MO.cap.date && dateMs!=null)
    moText(moFmtDate(dateMs),S.w/2,y0+st.capH*0.70,small*1.05,P.gold,"center",700);

  /* logo: the masthead already holds it as a data URI, so it is reused rather than
     duplicated into this file */
  var lh=st.capH*0.30;
  if(MO.cap.logo && MO__LOGO && MO__LOGO.complete && MO__LOGO.naturalWidth){
    var lw=lh*(MO__LOGO.naturalWidth/MO__LOGO.naturalHeight);
    try{ c.drawImage(MO__LOGO,pad,y0+st.capH*0.82-lh/2,lw,lh); }catch(e){}
  }
  if(MO.cap.handle)
    moText(MO.cap.handle,S.w-pad,y0+st.capH*0.82,small,P.dim,"right",600);
}
var MO__LOGO=null;
function moLogo(){
  if(MO__LOGO) return;
  var el=document.querySelector("img.lhlogo");
  if(el && el.src){ var im=new Image(); im.src=el.src; MO__LOGO=im; }
}
/* ---------------------------------------------------------------------------
   Transport. Time is normalised: every scene runs from 0 to 1 across the chosen
   duration, so "the whole retrograde in fifteen seconds" is one setting rather than
   a rate the viewer has to work out.
   --------------------------------------------------------------------------- */
function moDraw(){
  if(!MO.ctx) return;
  var sc=moSceneOf(MO.scene);
  moClear();
  var fade=1;
  if(MO.opt.loopFade){                        // dip at the seam so a loop reads as a loop
    if(MO.p>0.965) fade=(1-MO.p)/0.035;
    else if(MO.p<0.035) fade=MO.p/0.035;
    fade=0.25+0.75*Math.max(0,Math.min(1,fade));
  }
  MO.ctx.save(); MO.ctx.globalAlpha=fade;
  var info=null;
  try{ info=sc.draw(MO.p); }catch(e){ moErr(e); }
  MO.ctx.restore();
  moCaption(info&&info.ms, info&&info.sub);
}
function moErr(e){
  var S=moSize();
  moText("This scene could not be drawn: "+(e&&e.message?e.message:e),S.w/2,S.h*0.5,
    S.w*0.025,"#e07a60","center",500);
}
function moTick(ts){
  if(!MO.playing){ MO.raf=null; return; }
  if(MO.last==null) MO.last=ts;
  var dt=Math.min(120,ts-MO.last); MO.last=ts;
  MO.p+=(dt/1000)/MO.dur;
  if(MO.p>=1) MO.p-=1;
  MO._fpsN++; MO._fpsT+=dt;
  if(MO._fpsT>500){ MO.fps=Math.round(1000*MO._fpsN/MO._fpsT); MO._fpsN=0; MO._fpsT=0;
    var f=document.getElementById("mofps"); if(f) f.textContent=MO.fps+" fps"; }
  moDraw();
  var sl=document.getElementById("moscrub"); if(sl) sl.value=Math.round(MO.p*1000);
  MO.raf=requestAnimationFrame(moTick);
}
function moPlay(on){
  MO.playing=on; MO.last=null;
  var b=document.getElementById("moplay");
  if(b){ b.textContent=on?"Pause":"Play"; b.setAttribute("aria-pressed",on?"true":"false"); }
  if(on && !MO.raf) MO.raf=requestAnimationFrame(moTick);
  if(!on && MO.raf){ cancelAnimationFrame(MO.raf); MO.raf=null; }
}
function moResize(){
  var S=moSize(), cv=MO.cv; if(!cv) return;
  cv.width=S.w; cv.height=S.h;
  cv.style.aspectRatio=S.w+" / "+S.h;
  MO.ctx=cv.getContext("2d");
}
function moStudio(on){
  MO.studio=on;
  document.body.classList.toggle("mostudio",on);
  var b=document.getElementById("mostudio");
  if(b){ b.textContent=on?"Leave studio":"Studio mode"; b.setAttribute("aria-pressed",on?"true":"false"); }
  moDraw();
}
