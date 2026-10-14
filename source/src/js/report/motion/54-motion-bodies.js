/* ============================================================================
   Procedural bodies — Sūrya, Candra and the five tārā grahas, drawn from code.

   Nothing here is a photograph. Every surface is generated: the maria are placed
   at their real selenographic coordinates, the craters are a power-law population
   with rims and shadows, the Sun's granules are a noise field at the right scale,
   Jupiter's belts are at their real latitudes. The reason for building them rather
   than fetching images is not only licensing — a photograph is lit the way it was
   lit on the day it was taken, and the whole point of these scenes is to light the
   body the way the sky lights it at the moment on the playhead.

   How it renders fast enough. A per-pixel sphere raycast is too slow to do every
   frame, so it is split in two. Everything that depends only on where a pixel sits
   on the disc — the surface normal, the latitude row, the base longitude column —
   is computed once per radius and kept. Everything that changes with time — the
   light direction and the rotation — is a per-pixel multiply and an array lookup.
   The axis is held vertical in view space, which is what makes the split work:
   rotation then shifts the longitude column and leaves the latitude row alone.
   ============================================================================ */

/* ----------------------------------------------------------- noise and rng --- */
/* A seeded generator, so a body looks the same every time the scene is drawn.
   Nothing here is cryptographic; it only has to be repeatable and cheap. */
function moRng(seed){
  var s=seed>>>0 || 1;
  return function(){ s^=s<<13; s>>>=0; s^=s>>17; s^=s<<5; s>>>=0; return s/4294967296; };
}
/* Value noise on a lattice, smoothed with a quintic fade. Good enough for cloud
   decks and granulation, and far cheaper than gradient noise. */
function moNoiseField(n,rnd){
  var g=new Float32Array(n*n);
  for(var i=0;i<n*n;i++) g[i]=rnd();
  return {n:n,g:g};
}
/* `perx` makes the field repeat after that many lattice cells in x. A map wraps
   round the body, so a field that does not repeat over exactly the width of the
   map leaves a seam down the texture — and on a smooth-banded world like Guru
   that seam rotates into view as a row of vertical steps. Passing the x-frequency
   as the period closes it. Each octave doubles the frequency, so it doubles the
   period with it; the lattice has to be at least as large as the largest period
   any octave asks for. */
function moNoise2(f,x,y,perx){
  var n=f.n, g=f.g;
  var xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  var u=xf*xf*xf*(xf*(xf*6-15)+10), v=yf*yf*yf*(yf*(yf*6-15)+10);
  var P=(perx&&perx<=n)?perx:n;
  var x0=((xi%P)+P)%P, x1=(x0+1)%P, y0=((yi%n)+n)%n, y1=(y0+1)%n;
  var a=g[y0*n+x0], b=g[y0*n+x1], c=g[y1*n+x0], d=g[y1*n+x1];
  return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v;
}
function moFbm(f,x,y,oct,gain,perx){
  var s=0, amp=1, norm=0, fr=1;
  for(var i=0;i<oct;i++){
    s+=amp*moNoise2(f,x*fr,y*fr,perx?perx*fr:0);
    norm+=amp; amp*=(gain||0.5); fr*=2;
  }
  return s/norm;
}

/* ------------------------------------------------------------- the texture --- */
/* An equirectangular map: TW columns of longitude by TH rows of latitude, holding
   albedo as three bytes and a height in a separate float array. Height is only
   used to perturb the normal, so its units are arbitrary — what matters is that
   a crater rim catches the light a moment before its floor does. */
var MO_TEX={}, MO_GEO={}, MO_BUF={}, MO_SPR={};
/* A radial gradient filled across a 1080x1920 canvas rasterises nearly two million
   pixels, and a glow that spans twice a body's radius does exactly that — which on
   its own was costing the Candra scene two thirds of its frame rate. Baked once
   into a small sprite and scaled up, the same glow costs a single drawImage, and
   at these radii the scaling is invisible because a glow has no detail to lose. */
function moGlowSprite(key,stops){
  var e=MO_SPR[key]; if(e) return e;
  var N=256, cv=document.createElement("canvas"); cv.width=N; cv.height=N;
  var x=cv.getContext("2d");
  var g=x.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
  for(var i=0;i<stops.length;i++) g.addColorStop(stops[i][0],stops[i][1]);
  x.fillStyle=g; x.fillRect(0,0,N,N);
  MO_SPR[key]=cv; return cv;
}
var MO_TW=1024, MO_TH=512;
function moTexBlank(){
  return {w:MO_TW, h:MO_TH,
          r:new Uint8Array(MO_TW*MO_TH), g:new Uint8Array(MO_TW*MO_TH),
          b:new Uint8Array(MO_TW*MO_TH), e:new Float32Array(MO_TW*MO_TH),
          gx:null, gy:null};
}
function moTexXY(lonDeg,latDeg){
  var x=Math.round(((lonDeg+180)/360)*MO_TW), y=Math.round(((90-latDeg)/180)*MO_TH);
  return [((x%MO_TW)+MO_TW)%MO_TW, Math.max(0,Math.min(MO_TH-1,y))];
}
/* The surface slope, computed once when the texture is finished. It depends on
   nothing that changes with time — not the light, not the rotation — so computing
   it inside the per-frame loop was doing a quarter of a million redundant pairs of
   texture reads a frame. Hoisting it here is most of the difference between this
   running at forty frames a second and at sixty. */
function moTexGrad(t){
  var W=MO_TW, H=MO_TH, e=t.e;
  var gx=new Float32Array(W*H), gy=new Float32Array(W*H);
  for(var y=0;y<H;y++){
    var yU=y?y-1:0, yD=(y+1===H)?H-1:y+1;
    for(var x=0;x<W;x++){
      var xL=x?x-1:W-1, xR=(x+1===W)?0:x+1;
      gx[y*W+x]=(e[y*W+xR]-e[y*W+xL])*0.17;
      gy[y*W+x]=(e[yD*W+x]-e[yU*W+x])*0.17;
    }
  }
  t.gx=gx; t.gy=gy;
  /* The height field has done its work. Nothing in the render path reads it
     again — the loop uses the slope, not the height — so two megabytes a body
     are released here rather than held for the life of the page. */
  t.e=null;
  return t;
}

/* Angular distance on the sphere, in degrees — craters and maria are circles on
   the sphere, not on the map, or everything near the poles would be a smear. */
function moAngDist(lo1,la1,lo2,la2){
  var p1=la1*Math.PI/180, p2=la2*Math.PI/180, dl=(lo2-lo1)*Math.PI/180;
  var c=Math.sin(p1)*Math.sin(p2)+Math.cos(p1)*Math.cos(p2)*Math.cos(dl);
  return Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;
}
/* Walk every map cell within `rad` degrees of a centre. The longitude span widens
   towards the poles by 1/cos(lat), which is the whole reason for doing it this way. */
function moDisc(tex,lon,lat,rad,fn){
  var y0=Math.max(0,Math.floor(((90-(lat+rad))/180)*MO_TH));
  var y1=Math.min(MO_TH-1,Math.ceil(((90-(lat-rad))/180)*MO_TH));
  for(var y=y0;y<=y1;y++){
    var la=90-(y+0.5)/MO_TH*180;
    var cl=Math.cos(la*Math.PI/180);
    var span=(cl<0.02)?180:Math.min(180,rad/cl+1.5);
    var xc=((lon+180)/360)*MO_TW, half=Math.ceil(span/360*MO_TW);
    for(var k=-half;k<=half;k++){
      var x=Math.round(xc+k); x=((x%MO_TW)+MO_TW)%MO_TW;
      var lo=(x+0.5)/MO_TW*360-180;
      var d=moAngDist(lon,lat,lo,la);
      if(d<=rad) fn(y*MO_TW+x, d/rad, lo, la);
    }
  }
}

/* --------------------------------------------------------------- the Moon --- */
/* The maria at their real selenographic positions. Getting these right is what
   makes the disc read as the Moon rather than as a grey ball: the eye knows this
   face, and a mare in the wrong place is noticed long before a missing crater. */
var MO_MARIA=[
  [-57, 18, 31, 0.93],   /* Oceanus Procellarum — the great western plain */
  [-16, 33, 19, 1.00],   /* Imbrium */
  [ 17, 28, 12, 1.00],   /* Serenitatis */
  [ 31,  8, 13, 1.02],   /* Tranquillitatis */
  [ 59, 17,  8, 0.95],   /* Crisium — the detached oval near the eastern limb */
  [ 52, -8, 11, 0.98],   /* Fecunditatis */
  [ 34,-15,  8, 0.96],   /* Nectaris */
  [-39,-24,  8, 0.98],   /* Humorum */
  [-17,-21, 11, 1.00],   /* Nubium */
  [  4,  13, 6, 0.95],   /* Vaporum */
  [ -5,  2,  5, 0.92],   /* Sinus Medii, near the apparent centre */
  [-22, 44,  7, 0.95],   /* Sinus Iridum, off Imbrium */
  [-60, 56, 10, 0.90],   /* Frigoris, western arc */
  [  0, 58, 11, 0.90],   /* Frigoris, central arc */
  [ 35, 56,  9, 0.90],   /* Frigoris, eastern arc */
  [ 87,  2,  7, 0.92],   /* Smythii, right on the limb */
  [ 148,26,  6, 0.90]    /* Moscoviense — the far side's one real mare */
];
/* The bright ray craters. Rays are albedo only: they are powdered ejecta, not
   relief, which is why they vanish near the terminator and dominate at full. */
var MO_RAYC=[[-11,-43,42,1.00],[-20,10,32,0.75],[-38,8,16,0.55],[-47,24,12,0.9]];

function moMoonTex(){
  if(MO_TEX.moon) return MO_TEX.moon;
  var t=moTexBlank(), rnd=moRng(20261014), i;
  var fine=moNoiseField(512,rnd), coarse=moNoiseField(64,rnd);
  /* highlands: a bright, slightly mottled base */
  for(var y=0;y<MO_TH;y++){
    for(var x=0;x<MO_TW;x++){
      i=y*MO_TW+x;
      var n=moFbm(fine,x/MO_TW*34,y/MO_TH*17,4,0.55,34);
      var v=204+ (n-0.5)*54;
      t.r[i]=v; t.g[i]=v*0.985; t.b[i]=v*0.95;
      t.e[i]=(moFbm(coarse,x/MO_TW*18,y/MO_TH*9,3,0.5)-0.5)*0.5;
    }
  }
  /* maria: dark basalt, with an edge wandered by noise so none is a clean circle */
  MO_MARIA.forEach(function(m,mi){
    var lon=m[0], lat=m[1], rad=m[2], dk=m[3];
    /* The outline is a function of the BEARING from the basin's own centre, not
       of absolute longitude and latitude. Noise in lon/lat gives every basin the
       same ripple at the same scale, so they all come out as circles or all as
       the same scalloped cloud; a few harmonics around the rim give each one its
       own lobed, concave shape, which is what these basins actually look like. */
    var h=[ [2,0.17,rnd()*6.28],[3,0.13,rnd()*6.28],
            [5,0.085,rnd()*6.28],[7,0.055,rnd()*6.28],[11,0.03,rnd()*6.28] ];
    var la1=lat*Math.PI/180, sla1=Math.sin(la1), cla1=Math.cos(la1);
    moDisc(t,lon,lat,rad*1.75,function(idx,q,lo,la){
      var la2=la*Math.PI/180, dlo=(lo-lon)*Math.PI/180;
      var th=Math.atan2(Math.sin(dlo)*Math.cos(la2),
                        cla1*Math.sin(la2)-sla1*Math.cos(la2)*Math.cos(dlo));
      var wob=1; for(var hi=0;hi<h.length;hi++) wob+=h[hi][1]*Math.sin(h[hi][0]*th+h[hi][2]);
      var edge=q*1.75/wob;
      if(edge>1) return;
      var k=1-Math.pow(edge,7);        /* basalt meets highland sharply */
      var mot=moFbm(fine,(lo+180)/5+mi*3,(la+90)/5,4,0.5);
      var base=(78+mot*26)*dk;
      t.r[idx]=t.r[idx]*(1-k)+base*k;
      t.g[idx]=t.g[idx]*(1-k)+base*0.99*k;
      t.b[idx]=t.b[idx]*(1-k)+base*1.04*k;                  /* the maria run blue */
      /* the floor sits low, with wrinkle ridges across it — low, sinuous and
         invisible at full, but they catch the light near the terminator */
      var ridge=Math.sin((lo*2.4+la*3.1+mi*40)*Math.PI/180)*
                moFbm(coarse,(lo+180)/9+mi,(la+90)/9,2,0.5);
      t.e[idx]=t.e[idx]*(1-k)+(-0.9+ridge*0.22)*k;
    });
  });
  /* craters: a power-law population, bowl floor and raised rim, more of them in
     the highlands than on the young lava of the maria */
  var N=1900;
  for(var c=0;c<N;c++){
    var lo=rnd()*360-180;
    var la=Math.asin(rnd()*2-1)*180/Math.PI;               /* uniform on the sphere */
    var u=rnd();
    var rad2=0.35+9.5*Math.pow(u,3.1);                     /* small ones dominate */
    var ix=moTexXY(lo,la);
    var onMare=t.e[ix[1]*MO_TW+ix[0]]<-0.4;
    if(onMare && rnd()>0.22) continue;                     /* maria are young */
    var deep=0.55+rnd()*0.7, bright=0.90+rnd()*0.30;
    /* A real crater is a paraboloid bowl inside a raised rim, not a flat floor
       with a step. The difference matters: a step has a gradient only at its
       edge, so it lights as a thin ring, while a bowl has a gradient everywhere
       and so lights one interior wall and shadows the other, which is what the
       eye recognises as a crater. */
    moDisc(t,lo,la,rad2*1.45,function(idx,q){
      var r=q*1.45;
      var h=(r<1?-deep*(1-r*r):0)+deep*0.42*Math.exp(-Math.pow((r-0.95)/0.17,2));
      var al=(r<0.95?bright*0.97:bright*1.06);
      t.e[idx]+=h;
      t.r[idx]=Math.min(255,t.r[idx]*(0.90+al*0.10));
      t.g[idx]=Math.min(255,t.g[idx]*(0.90+al*0.10));
      t.b[idx]=Math.min(255,t.b[idx]*(0.90+al*0.10));
    });
  }
  /* ray systems — Tycho's reach right across the disc is the signature of a full
     Moon, and nothing else explains why the full Moon looks streaked and flat */
  MO_RAYC.forEach(function(rc,ri){
    var lon=rc[0], lat=rc[1], reach=rc[2], str=rc[3];
    var nray=26+Math.floor(rnd()*14);
    for(var k=0;k<nray;k++){
      var bearing=rnd()*360, len=reach*(0.35+rnd()*0.85), wid=0.6+rnd()*1.5;
      for(var s=2;s<len;s+=0.55){
        /* step along a great circle from the crater at this bearing */
        var la1=lat*Math.PI/180, br=bearing*Math.PI/180, dd=s*Math.PI/180;
        var la2=Math.asin(Math.sin(la1)*Math.cos(dd)+Math.cos(la1)*Math.sin(dd)*Math.cos(br));
        var lo2=lon+Math.atan2(Math.sin(br)*Math.sin(dd)*Math.cos(la1),
                               Math.cos(dd)-Math.sin(la1)*Math.sin(la2))*180/Math.PI;
        var clump=0.45+0.95*moFbm(coarse,lo2/3.5+ri*9,la2*57.29578/3.5,3,0.55);
        var fade=str*(1-s/len)*0.30*clump;
        moDisc(t,lo2,la2*180/Math.PI,wid*(0.6+s/len),function(idx,q){
          var k2=fade*(1-q)*(1-q);
          t.r[idx]=Math.min(255,t.r[idx]+70*k2);
          t.g[idx]=Math.min(255,t.g[idx]+70*k2);
          t.b[idx]=Math.min(255,t.b[idx]+68*k2);
        });
      }
    }
    /* the crater itself, bright and sharp */
    moDisc(t,lon,lat,reach*0.10+1.2,function(idx,q){
      t.r[idx]=Math.min(255,t.r[idx]*(1+0.35*(1-q)));
      t.g[idx]=Math.min(255,t.g[idx]*(1+0.35*(1-q)));
      t.b[idx]=Math.min(255,t.b[idx]*(1+0.34*(1-q)));
      t.e[idx]+= (q<0.75?-1.4:1.1);
    });
  });
  moTexGrad(t); MO_TEX.moon=t; return t;
}

/* ---------------------------------------------------- the other surfaces --- */
function moMercuryTex(){
  if(MO_TEX.mercury) return MO_TEX.mercury;
  var t=moTexBlank(), rnd=moRng(4401), i;
  var fine=moNoiseField(512,rnd);
  for(var y=0;y<MO_TH;y++) for(var x=0;x<MO_TW;x++){
    i=y*MO_TW+x;
    var n=moFbm(fine,x/MO_TW*30,y/MO_TH*15,4,0.55,30);
    var v=132+(n-0.5)*40;                                   /* darker than the Moon */
    t.r[i]=v*1.03; t.g[i]=v; t.b[i]=v*0.94; t.e[i]=(n-0.5)*0.6;
  }
  /* Mercury is the most heavily cratered surface in the solar system, and it has
     Caloris, which is nearly a third the size of the planet */
  for(var c=0;c<2400;c++){
    var lo=rnd()*360-180, la=Math.asin(rnd()*2-1)*180/Math.PI;
    var rad=0.35+8*Math.pow(rnd(),3.0), deep=0.5+rnd()*0.7, br=0.92+rnd()*0.22;
    moDisc(t,lo,la,rad*1.45,function(idx,q){
      var r=q*1.45;
      var h=(r<1?-deep*(1-r*r):0)+deep*0.42*Math.exp(-Math.pow((r-0.95)/0.17,2));
      t.e[idx]+=h;
      var a=(r<0.95?br:1.0);
      t.r[idx]=Math.min(255,t.r[idx]*(0.92+a*0.08));
      t.g[idx]=Math.min(255,t.g[idx]*(0.92+a*0.08));
      t.b[idx]=Math.min(255,t.b[idx]*(0.92+a*0.08));
    });
  }
  moDisc(t,-160,30,22,function(idx,q){                       /* Caloris */
    var k=1-Math.pow(q,5);
    t.r[idx]=t.r[idx]*(1-k*0.25)+150*k*0.25;
    t.g[idx]=t.g[idx]*(1-k*0.25)+146*k*0.25;
    t.b[idx]=t.b[idx]*(1-k*0.25)+138*k*0.25;
    t.e[idx]-=0.8*k;
  });
  moTexGrad(t); MO_TEX.mercury=t; return t;
}
function moVenusTex(){
  if(MO_TEX.venus) return MO_TEX.venus;
  /* No surface: Venus shows an unbroken sulphuric cloud deck. The only structure
     is faint ultraviolet banding, which in visible light is almost nothing — so
     the honest rendering is a nearly featureless cream disc. */
  var t=moTexBlank(), rnd=moRng(777), f=moNoiseField(512,rnd);
  for(var y=0;y<MO_TH;y++) for(var x=0;x<MO_TW;x++){
    var i=y*MO_TW+x, la=90-(y/MO_TH)*180;
    var band=moFbm(f,x/MO_TW*5+la/40,y/MO_TH*9,4,0.55,5);
    var v=238+(band-0.5)*14-Math.abs(la)/90*8;
    t.r[i]=Math.min(255,v); t.g[i]=Math.min(255,v*0.955); t.b[i]=Math.min(255,v*0.80);
    t.e[i]=0;                                                /* cloud tops: no relief */
  }
  t.e=null; MO_TEX.venus=t; return t;
}
function moMarsTex(){
  if(MO_TEX.mars) return MO_TEX.mars;
  var t=moTexBlank(), rnd=moRng(1877), f=moNoiseField(512,rnd), g=moNoiseField(64,rnd);
  for(var y=0;y<MO_TH;y++) for(var x=0;x<MO_TW;x++){
    var i=y*MO_TW+x;
    var n=moFbm(f,x/MO_TW*26,y/MO_TH*13,5,0.55,26);
    var v=196+(n-0.5)*46;
    t.r[i]=Math.min(255,v); t.g[i]=v*0.60; t.b[i]=v*0.41;    /* iron oxide */
    t.e[i]=(n-0.5)*0.7;
  }
  /* the classical dark albedo features — the ones Schiaparelli named and every
     small telescope still shows */
  [[70,-5,22,0.62],[25,-25,30,0.70],[-30,-20,26,0.72],[-110,15,18,0.74],
   [140,20,16,0.76],[-60,40,14,0.78],[100,-40,20,0.72]].forEach(function(a,ai){
    moDisc(t,a[0],a[1],a[2],function(idx,q,lo,la){
      var wob=0.72+0.4*moFbm(g,(lo+180)/14+ai*5,(la+90)/14,3,0.6);
      if(q>wob) return;
      var k=(1-Math.pow(q/wob,3))*0.8;
      t.r[idx]*= (1-k)+a[3]*k; t.g[idx]*=(1-k)+a[3]*0.95*k; t.b[idx]*=(1-k)+a[3]*1.05*k;
    });
  });
  /* polar caps, and Olympus Mons as a bright shield with a caldera */
  [[90,1],[-90,1]].forEach(function(pc){
    moDisc(t,0,pc[0],13,function(idx,q){
      var k=Math.pow(1-q,0.6);
      t.r[idx]=t.r[idx]*(1-k)+252*k; t.g[idx]=t.g[idx]*(1-k)+252*k; t.b[idx]=t.b[idx]*(1-k)+255*k;
    });
  });
  moDisc(t,-134,18,5,function(idx,q){
    t.e[idx]+= (q<0.25?0.4:1.6*(1-q));
    t.r[idx]=Math.min(255,t.r[idx]*1.10); t.g[idx]=Math.min(255,t.g[idx]*1.08);
  });
  moTexGrad(t); MO_TEX.mars=t; return t;
}
function moJupiterTex(){
  if(MO_TEX.jupiter) return MO_TEX.jupiter;
  /* Belts and zones at their real latitudes, with the flow sheared east-west so
     the turbulence stretches into ribbons the way the real atmosphere does. */
  var t=moTexBlank(), rnd=moRng(1610), f=moNoiseField(512,rnd);
  var BANDS=[[0,0.0,[232,214,186]],[8,5,[196,150,112]],[-8,5,[196,150,112]],
             [18,6,[238,226,202]],[-18,6,[238,226,202]],[27,6,[180,136,104]],
             [-27,6,[186,142,108]],[38,7,[222,208,190]],[-38,7,[222,208,190]],
             [50,9,[172,154,142]],[-50,9,[176,158,146]],[68,14,[150,140,138]],
             [-68,14,[150,140,138]]];
  for(var y=0;y<MO_TH;y++){
    var la=90-(y+0.5)/MO_TH*180;
    var cr=0,cg=0,cb=0,wt=0;
    BANDS.forEach(function(b){
      var w=Math.exp(-Math.pow((la-b[0])/b[1],2));
      cr+=b[2][0]*w; cg+=b[2][1]*w; cb+=b[2][2]*w; wt+=w;
    });
    cr/=wt; cg/=wt; cb/=wt;
    for(var x=0;x<MO_TW;x++){
      var i=y*MO_TW+x;
      /* stretched 14:1 in longitude — zonal flow, not isotropic cloud */
      var n=moFbm(f,x/MO_TW*11,y/MO_TH*62,5,0.52,11)-0.5;
      t.r[i]=Math.max(0,Math.min(255,cr+n*48));
      t.g[i]=Math.max(0,Math.min(255,cg+n*44));
      t.b[i]=Math.max(0,Math.min(255,cb+n*38));
      t.e[i]=0;
    }
  }
  /* the Great Red Spot: an oval at 22° south, about 14° of longitude across */
  for(var y2=0;y2<MO_TH;y2++) for(var x2=0;x2<MO_TW;x2++){
    var la2=90-(y2+0.5)/MO_TH*180, lo2=(x2+0.5)/MO_TW*360-180;
    var dx=(lo2-40)/11, dy=(la2+22)/4.6;
    var d=dx*dx+dy*dy; if(d>1.6) continue;
    var i2=y2*MO_TW+x2, k=Math.max(0,1-Math.pow(d/1.6,2))*0.92;
    var sw=moFbm(f,lo2/9+30,la2/4,4,0.5);
    t.r[i2]=t.r[i2]*(1-k)+(206+sw*30)*k;
    t.g[i2]=t.g[i2]*(1-k)+(118+sw*26)*k;
    t.b[i2]=t.b[i2]*(1-k)+( 92+sw*22)*k;
  }
  t.e=null; MO_TEX.jupiter=t; return t;
}
function moSaturnTex(){
  if(MO_TEX.saturn) return MO_TEX.saturn;
  var t=moTexBlank(), rnd=moRng(1655), f=moNoiseField(512,rnd);
  for(var y=0;y<MO_TH;y++){
    var la=90-(y+0.5)/MO_TH*180;
    /* Saturn's banding is the same physics as Jupiter's seen through a deeper
       haze, so the contrast is a fraction of it */
    var base=224-Math.abs(la)/90*34, warm=1-Math.abs(la)/120;
    var bandy=Math.sin(la*Math.PI/180*7)*6;
    for(var x=0;x<MO_TW;x++){
      var i=y*MO_TW+x;
      var n=moFbm(f,x/MO_TW*8,y/MO_TH*46,4,0.5,8)-0.5;
      var v=base+bandy+n*15;
      t.r[i]=Math.min(255,v*1.00); t.g[i]=Math.min(255,v*(0.90+warm*0.05));
      t.b[i]=Math.min(255,v*(0.70+warm*0.06));
      t.e[i]=0;
    }
  }
  t.e=null; MO_TEX.saturn=t; return t;
}
var MO_TEXFN={moon:moMoonTex, mercury:moMercuryTex, venus:moVenusTex,
              mars:moMarsTex, jupiter:moJupiterTex, saturn:moSaturnTex};

/* ------------------------------------------------- the per-radius geometry --- */
/* THE CACHE MUST BE BOUNDED. This was a crash, not a slow path. The key is the
   radius and the axis tilt, and for Candra both move every single frame — the
   drawn size follows the real apparent diameter, and the tilt follows the real
   libration in latitude. Every frame therefore minted a fresh set of multi-
   megabyte arrays and a fresh canvas, and nothing was ever evicted: measured at
   thirteen megabytes a frame, four gigabytes over three hundred frames. Desktop
   browsers swallow that for a while. Safari on a phone reaches its limit for the
   tab in a few seconds and reloads the page, which is exactly what it looked
   like from the outside.

   Two defences, because either alone is brittle. The inputs are quantised, so
   consecutive frames land on the same key and the cache is actually used; and
   the cache is capped and evicts its oldest entry, so no sequence of inputs can
   make it grow without limit. */
var MO_GEO_ORDER=[], MO_GEO_MAX=8;
function moGeomPut(key,G){
  MO_GEO[key]=G; MO_GEO_ORDER.push(key);
  while(MO_GEO_ORDER.length>MO_GEO_MAX){
    var old=MO_GEO_ORDER.shift();
    if(old!==key) delete MO_GEO[old];
  }
  return G;
}
/* Stored per pixel: the texture column and row, which need the tilt, and the
   z of the normal. The x and y of the normal are NOT stored — they follow from
   the pixel's position, and walking each row left to right gives x by addition.
   That is three fewer arrays, and it turns a scattered indexed write into a
   sequential one. Columns and rows are sixteen-bit: the map is 1024 by 512. */
function moGeom(R,axTiltDeg){
  var ax=axTiltDeg||0;
  var key=R+"|"+ax;
  if(MO_GEO[key]) return MO_GEO[key];
  var D=R*2, py, px;
  var x0a=new Int16Array(D), x1a=new Int16Array(D), st0=new Int32Array(D);
  var cnt=0;
  for(py=0;py<D;py++){
    var y=(py+0.5-R)/R;
    if(y*y>=1){ x0a[py]=0; x1a[py]=-1; st0[py]=cnt; continue; }
    var hx=Math.sqrt(1-y*y)*R;
    var lo=Math.ceil(R-hx-0.5), hi=Math.floor(R+hx-0.5);
    while(lo<=hi){ var xx=(lo+0.5-R)/R; if(xx*xx+y*y<1) break; lo++; }
    while(hi>=lo){ var xh=(hi+0.5-R)/R; if(xh*xh+y*y<1) break; hi--; }
    if(lo<0) lo=0; if(hi>D-1) hi=D-1;
    x0a[py]=lo; x1a[py]=hi; st0[py]=cnt;
    if(hi>=lo) cnt+=hi-lo+1;
  }
  var nz=new Float32Array(cnt), col=new Uint16Array(cnt), row=new Uint16Array(cnt);
  var ct=Math.cos(ax*Math.PI/180), stt=Math.sin(ax*Math.PI/180);
  var k=0;
  for(py=0;py<D;py++){
    var y2=(py+0.5-R)/R, lo2=x0a[py], hi2=x1a[py];
    for(px=lo2;px<=hi2;px++){
      var x2=(px+0.5-R)/R, r2=x2*x2+y2*y2;
      var z=r2<1?Math.sqrt(1-r2):0;
      nz[k]=z;
      /* tilt the pole towards or away from the viewer, then read off lat/lon */
      var wy=(-y2)*ct-z*stt, wz=(-y2)*stt+z*ct;
      var lat=Math.asin(wy>1?1:(wy<-1?-1:wy));
      var lon=Math.atan2(x2,wz);
      var rr=Math.floor((0.5-lat/Math.PI)*MO_TH);
      row[k]=rr<0?0:(rr>MO_TH-1?MO_TH-1:rr);
      var cc=Math.floor(((lon/(2*Math.PI))+0.5)*MO_TW);
      col[k]=((cc%MO_TW)+MO_TW)%MO_TW;
      k++;
    }
  }
  return moGeomPut(key,{R:R,D:D,n:cnt,nz:nz,col:col,row:row,x0:x0a,x1:x1a,st:st0});
}
/* The radius and the tilt are rounded here rather than at each call site, so no
   scene can reintroduce the unbounded key by forgetting to. Ten pixels of radius
   and two degrees of tilt are both well under what anyone can see. */
function moQR(R){ return Math.max(24,Math.round(R/10)*10); }
function moQA(a){ return Math.round((a||0)/2)*2; }

/* ------------------------------------------------------------- photometry --- */
/* Lunar-Lambert. Pure Lambert makes an airless body look like a billiard ball,
   shaded dark towards the limb; the real Moon at full is almost flat across the
   disc, because regolith backscatters. The Lommel-Seeliger term is what does
   that, and mixing the two with b≈0.85 matches the look at every phase. */
function moShade(mu0,mu,b){
  if(mu0<=0) return 0;
  var ls=2*mu0/(mu0+mu+1e-6);
  return mu0*((1-b)+b*ls);
}

/* ---------------------------------------------------------------- the draw --- */
/* Renders a lit sphere into an offscreen canvas of side 2R and returns it. The
   caller scales it onto the stage, so R is fixed per body and the heavy geometry
   is computed once no matter how the frame is sized.

   opt: {tex, lx,ly,lz (light direction, view space, unit), rot (degrees),
         tint:[r,g,b] multiplier, relief, b (backscatter), gamma,
         night:[r,g,b] added on the unlit side, amb} */
var MO_BUF_ORDER=[], MO_BUF_MAX=3;
function moCanvas(key,D){
  /* The pixel buffer and its ImageData are kept per size — allocating a fresh
     ImageData every frame is megabytes a frame for the collector to sweep. The
     key is the SIZE only: the buffer holds pixels and does not care how the
     sphere was tilted, and keying it by the tilt as well was half of the leak. */
  key="d"+D;
  var e=MO_BUF[key];
  if(!e || e.cv.width!==D){
    var cv=document.createElement("canvas"); cv.width=D; cv.height=D;
    var cx2=cv.getContext("2d");
    e={cv:cv, cx:cx2, img:cx2.createImageData(D,D)};
    MO_BUF[key]=e; MO_BUF_ORDER.push(key);
    while(MO_BUF_ORDER.length>MO_BUF_MAX){
      var old=MO_BUF_ORDER.shift();
      if(old!==key) delete MO_BUF[old];
    }
  }
  return e;
}
function moBody(R,opt){
  R=moQR(R);
  var G=moGeom(R,moQA(opt.axis)), D=G.D, t=opt.tex;
  var E=moCanvas(null,D), p=E.img.data;
  p.fill(0);
  var lx=opt.lx, ly=opt.ly, lz=opt.lz;
  var rotCol=Math.round(((opt.rot||0)/360)*MO_TW)%MO_TW; if(rotCol<0) rotCol+=MO_TW;
  var relief=(opt.relief==null?1:opt.relief), b=(opt.b==null?0.85:opt.b), b1=1-b;
  var tr=opt.tint?opt.tint[0]:1, tg=opt.tint?opt.tint[1]:1, tb=opt.tint?opt.tint[2]:1;
  var nr=opt.night?opt.night[0]:0, ng=opt.night?opt.night[1]:0, nb=opt.night?opt.night[2]:0;
  var amb=opt.amb||0, gam=opt.gamma||1, exp=(opt.exposure==null?1:opt.exposure);
  var TW=MO_TW, tR=t.r, tG=t.g, tB=t.b, tgx=t.gx, tgy=t.gy;
  var Gc=G.col, Gr=G.row, Gz=G.nz, X0=G.x0, X1=G.x1, ST=G.st;
  var dnx=1/R;
  for(var py=0;py<D;py++){
    var lo=X0[py], hi=X1[py]; if(hi<lo) continue;
    var ey=-((py+0.5-R)/R);
    var nx=(lo+0.5-R)/R;
    var i=ST[py], q=(py*D+lo)*4;
    for(var px=lo;px<=hi;px++,i++,q+=4,nx+=dnx){
      var ez=Gz[i];
      var c=Gc[i]+rotCol; if(c>=TW) c-=TW;
      var idx=Gr[i]*TW+c;
      var ex=nx, ey2=ey;
      var mu0=ex*lx+ey2*ly+ez*lz, sh;
      /* Deep on the night side no slope can reach the light: the relief tilts the
         normal by at most the largest gradient in the map, so past that margin the
         answer is settled and the expensive half of the loop can be skipped. On a
         crescent that is most of the disc, which is where this scene spends its
         frames. */
      if(mu0<-0.42){
        p[q]=nr>255?255:nr; p[q+1]=ng>255?255:ng; p[q+2]=nb>255?255:nb;
        p[q+3]=(ez<0.10)?Math.round(2550*ez):255;
        continue;
      }
      if(relief){
        /* tilt the normal by the surface slope — this is what makes a crater rim
           catch the light a moment before its floor does, and why the relief
           disappears at full phase exactly as it does in the sky */
        ex-=tgx[idx]*relief; ey2-=tgy[idx]*relief;
        /* one Newton step for the inverse square root: the perturbed normal is
           still close to unit length, so this is good to second order and costs
           neither a square root nor a division */
        var l2=ex*ex+ey2*ey2+ez*ez, ln=1.5-0.5*l2;
        ex*=ln; ey2*=ln; ez*=ln;
        mu0=ex*lx+ey2*ly+ez*lz;
      }
      if(mu0<=0) sh=0; else sh=mu0*(b1+b*(2*mu0/(mu0+ez+1e-6)));
      sh=sh*exp+amb;
      var rr=tR[idx]*sh*tr+nr, gg=tG[idx]*sh*tg+ng, bb=tB[idx]*sh*tb+nb;
      if(gam!==1){
        rr=255*Math.pow(rr>0?rr/255:0,gam);
        gg=255*Math.pow(gg>0?gg/255:0,gam);
        bb=255*Math.pow(bb>0?bb/255:0,gam);
      }
      p[q]=rr>255?255:(rr<0?0:rr);
      p[q+1]=gg>255?255:(gg<0?0:gg);
      p[q+2]=bb>255?255:(bb<0?0:bb);
      /* a sub-pixel feather at the very limb, so the disc has no staircase edge */
      p[q+3]=(Gz[i]<0.10)?Math.round(2550*Gz[i]):255;
    }
  }
  E.cx.putImageData(E.img,0,0);
  return E.cv;
}

/* ---------------------------------------------------------------- the Sun --- */
/* The Sun is not a lit sphere — it is its own light source, so none of the
   shading above applies. What it needs instead is limb darkening, which is a
   consequence of looking obliquely into a hot gas and so seeing a shallower,
   cooler layer, and granulation, which is the top of the convection zone. */
function moSunTex(){
  if(MO_TEX.sun) return MO_TEX.sun;
  var t=moTexBlank(), rnd=moRng(1543), gr=moNoiseField(512,rnd), sp=moNoiseField(64,rnd);
  for(var y=0;y<MO_TH;y++) for(var x=0;x<MO_TW;x++){
    var i=y*MO_TW+x;
    /* granules are about a thousand kilometres across, which on a disc of this
       size is a cell every few pixels — hence the high frequency */
    var g1=moFbm(gr,x/MO_TW*150,y/MO_TH*75,2,0.45,150);
    var g2=moFbm(gr,x/MO_TW*48+11,y/MO_TH*24+7,3,0.5,48);
    /* Granules are bright cells with dark lanes between them, not a smooth
       mottle, so the fine octave is pushed towards its bright end and the lanes
       fall out as what is left. */
    var cell=Math.pow(g1,1.7)*0.72+g2*0.28;
    var gn=(cell-0.42)*2;
    /* Warm white rather than acid yellow: a white-light image of the photosphere
       is nearly white at the centre and ambers towards the edge, and the edge is
       handled by the limb-darkening law, not by the colour here. */
    t.r[i]=255;
    t.g[i]=Math.max(0,Math.min(255,228+gn*18));
    t.b[i]=Math.max(0,Math.min(255,152+gn*40));
    t.e[i]=cell;
  }
  /* sunspot groups: paired, within about 30° of the equator, never at the poles */
  var ng=7+Math.floor(rnd()*6);
  for(var k=0;k<ng;k++){
    var la=(rnd()<0.5?1:-1)*(5+rnd()*25);
    var lo=rnd()*360-180, sz=1.1+rnd()*2.8;
    for(var pair=0;pair<2;pair++){
      var plo=lo+(pair?1:-1)*sz*(1.1+rnd()*1.0), pla=la+(rnd()-0.5)*sz;
      var r1=sz*(pair?0.72:1.0);
      moDisc(t,plo,pla,r1*1.9,function(idx,q){
        var r=q*1.9, k2;
        if(r<0.74){ k2=0.93; }                       /* umbra */
        else if(r<1.25){ k2=0.52*(1.25-r)/0.51+0.26; } /* penumbra, filamentary */
        else { k2=0.22*Math.max(0,(1.9-r)/0.65); }
        if(k2<=0) return;
        t.r[idx]=t.r[idx]*(1-k2)+70*k2;
        t.g[idx]=t.g[idx]*(1-k2)+26*k2;
        t.b[idx]=t.b[idx]*(1-k2)+6*k2;
      });
    }
    /* faculae: bright magnetic network around the group, which is why the Sun is very
       slightly brighter at spot maximum than at minimum */
    moDisc(t,lo,la,sz*4.5,function(idx,q){
      if(q<0.45) return;
      var k3=0.16*(1-Math.abs(q-0.7)/0.3);
      if(k3<=0) return;
      t.g[idx]=Math.min(255,t.g[idx]+36*k3); t.b[idx]=Math.min(255,t.b[idx]+30*k3);
    });
  }
  moTexGrad(t); MO_TEX.sun=t; return t;
}
/* Eddington's limb-darkening law to second order. At the very edge the disc
   falls to about a third of its central brightness, which is why the Sun looks
   like a disc with an edge rather than a glowing ball. */
function moLimbDark(mu){ return 0.34+0.93*mu-0.27*mu*mu; }
function moSunDisc(R,rot){
  R=moQR(R);
  var G=moGeom(R,0), D=G.D, t=moSunTex();
  var E=moCanvas(null,D), p=E.img.data;
  p.fill(0);
  var rotCol=Math.round((rot/360)*MO_TW)%MO_TW; if(rotCol<0) rotCol+=MO_TW;
  var TW=MO_TW, Gc=G.col, Gr=G.row, Gz=G.nz, X0=G.x0, X1=G.x1, ST=G.st;
  var norm=1/moLimbDark(1);
  for(var py=0;py<D;py++){
    var lo=X0[py], hi=X1[py]; if(hi<lo) continue;
    var i=ST[py], q=(py*D+lo)*4;
    for(var px=lo;px<=hi;px++,i++,q+=4){
      var mu=Gz[i];
      var c=Gc[i]+rotCol; if(c>=TW) c-=TW;
      var idx=Gr[i]*TW+c;
      var ld=(0.34+0.93*mu-0.27*mu*mu)*norm;
      /* the edge runs red as well as dark: the oblique line of sight reaches only a
         shallower, cooler layer, and a cooler gas radiates redder as well as fainter */
      var warm=1-mu;
      var rr=t.r[idx]*ld, gg=t.g[idx]*ld*(1-warm*0.22), bb=t.b[idx]*ld*(1-warm*0.45);
      p[q]=rr>255?255:rr; p[q+1]=gg>255?255:gg; p[q+2]=bb>255?255:bb;
      p[q+3]=(mu<0.07)?Math.round(3643*mu):255;
    }
  }
  E.cx.putImageData(E.img,0,0);
  return E.cv;
}
