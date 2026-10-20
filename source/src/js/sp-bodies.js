/* ===== Real grahas on the reel ============================================

   This site already builds the bodies. `54-motion-bodies.js` generates every
   surface from code — the Moon's maria at their real selenographic
   coordinates, a power-law crater population with rims and shadows, Guru's
   belts at their real latitudes, Sūrya's granulation at the right scale —
   and lights them from the direction the Sun actually is at the moment on
   the playhead. The reels were drawing generic glowing dots instead, which
   is both worse and a waste of the best thing in the repository.

   WHY THIS WRAPPER EXISTS RATHER THAN A DIRECT CALL. Generating a lit disc
   is a per-pixel raycast: fine once, far too slow sixty times a second. So
   everything here is a cache keyed on what the picture actually depends on —
   the body, the radius, the phase, the rotation — each rounded to a step
   below what the eye can see at reel sizes. A Moon that waxes smoothly
   through a reel mints about thirty discs over its whole run instead of one
   per frame, and every frame after the first is a drawImage.

   The rounding is chosen per quantity rather than globally: phase matters
   most (a crescent is the whole picture), rotation least (Guru's belts look
   the same a degree later). */

(function () {
  "use strict";

  var R2 = Math.PI / 180;

  /* the texture builders, by the names this site uses */
  function texOf(name) {
    switch (name) {
      case "Moon": case "Candra": return typeof moMoonTex === "function" ? moMoonTex() : null;
      case "Mercury": case "Budha": return typeof moMercuryTex === "function" ? moMercuryTex() : null;
      case "Venus": case "Śukra": return typeof moVenusTex === "function" ? moVenusTex() : null;
      case "Mars": case "Maṅgala": return typeof moMarsTex === "function" ? moMarsTex() : null;
      case "Jupiter": case "Guru": return typeof moJupiterTex === "function" ? moJupiterTex() : null;
      case "Saturn": case "Śani": return typeof moSaturnTex === "function" ? moSaturnTex() : null;
      default: return null;
    }
  }
  /* axial tilt as the renderer wants it, and how much surface relief to
     apply: a gas giant has none to speak of, a cratered world is mostly
     relief */
  var AX = { Moon: 1.5, Mercury: 0.03, Venus: 2.6, Mars: 25.2,
             Jupiter: 3.1, Saturn: 26.7 };
  var RELIEF = { Moon: 1, Mercury: 1, Venus: 0.35, Mars: 0.8,
                 Jupiter: 0, Saturn: 0 };
  /* how fast each turns, in degrees per day, only so that a long reel does
     not show a frozen face — these are the real sidereal rotation rates */
  var SPIN = { Moon: 13.18, Mercury: 6.14, Venus: -1.48, Mars: 350.89,
               Jupiter: 870.54, Saturn: 810.79, Sun: 14.18 };

  var CACHE = {}, KEYS = [], MAX = 90;

  /* THE RENDERER HANDS BACK A CANVAS IT STILL OWNS.

     moCanvas pools its pixel buffer by size — sensibly, since allocating an
     ImageData per frame is megabytes a second for the collector. But that
     means moBody returns a SHARED canvas: generate a new Moon and then a
     full Moon at the same radius and the first result quietly becomes the
     second, because they are the same object.

     Caching those references therefore caches an alias. Every disc in the
     cache would show whatever was drawn last, which on a reel means the
     Moon's phase silently stops tracking the event under it — and it is
     invisible to any test that measures a disc right after making it, which
     is exactly what a probe does. The harness caught it by making two and
     measuring both afterwards.

     So each disc is copied into a canvas of its own on the way into the
     cache. It is one drawImage of a few thousand pixels, once per cache
     miss. */
  function own(src) {
    var cv = document.createElement("canvas");
    cv.width = src.width; cv.height = src.height;
    cv.getContext("2d").drawImage(src, 0, 0);
    return cv;
  }
  function put(key, cv) {
    if (KEYS.length >= MAX) delete CACHE[KEYS.shift()];
    var mine = own(cv);
    CACHE[key] = mine; KEYS.push(key);
    return mine;
  }

  function ready() { return typeof moBody === "function"; }

  /* A lit disc of `name`, radius R in device pixels.
       opt.phase   0..360, the elongation from the Sun as seen from Earth;
                   180 is full. Omit for an always-full body.
       opt.spinDeg how far round it has turned.
     Returns a canvas of side 2R, or null if the renderer is not present —
     callers fall back to a plain dot rather than failing. */
  function disc(name, R, opt) {
    if (!ready()) return null;
    opt = opt || {};
    R = Math.max(3, R);
    var rb = R < 14 ? Math.round(R) : Math.round(R / 3) * 3;
    if (name === "Sun" || name === "Sūrya") {
      var sk = "sun|" + rb + "|" + Math.round((opt.spinDeg || 0) / 30);
      if (CACHE[sk]) return CACHE[sk];
      if (typeof moSunDisc !== "function") return null;
      return put(sk, moSunDisc(rb, opt.spinDeg || 0));
    }
    var tex = texOf(name);
    if (!tex) return null;
    var ph = opt.phase == null ? 180 : ((opt.phase % 360) + 360) % 360;
    var pb = Math.round(ph / 6) * 6;                /* 6° of phase */
    var sb = Math.round(((opt.spinDeg || 0) % 360) / 24) * 24;   /* 24° of spin */
    var key = name + "|" + rb + "|" + pb + "|" + sb;
    if (CACHE[key]) return CACHE[key];
    /* the light direction from the phase: at opposition the Sun is behind
       the viewer and the disc is full; at conjunction it is behind the body */
    var pa = (180 - pb) * R2;
    var lx = (pb < 180 ? 1 : -1) * Math.sin(Math.abs(pa));
    var lz = Math.cos(pa);
    var key2 = name;
    /* HOW DARK THE NIGHT SIDE IS. Two or three counts out of 255 is right
       for a body hanging in a photograph; on a reel it makes a new Moon a
       hole punched in the frame. A thin crescent needs its dark limb to be
       visible as a limb, so the night side is lifted to a slate when the
       phase is narrow — which is also what earthshine does in the sky, and
       for the same reason: the dark side is not actually black. */
    var narrow = Math.min(pb, 360 - pb) < 70;
    var night = narrow ? [16, 19, 27] : [2, 2, 3];
    var cv = moBody(rb, {
      tex: tex, lx: lx, ly: 0.03, lz: lz, rot: sb,
      axis: AX[key2] == null ? 0 : AX[key2],
      relief: (tex.gx ? (RELIEF[key2] == null ? 1 : RELIEF[key2]) : 0),
      b: (RELIEF[key2] ? 0.82 : 0.25), exposure: 1.15, night: night
    });
    return put(key, cv);
  }

  /* Draw it centred, with a whisper of halo so it sits in the frame rather
     than on top of it. The halo is deliberately small: these have surfaces
     now, and a surface you cannot see through a glow is a dot again. */
  function draw(c, name, x, y, R, opt) {
    opt = opt || {};
    var cv = disc(name, R, opt);
    if (!cv) {
      if (window.SPGlow) window.SPGlow.glow(c, x, y, R, opt.fallback || "#f0c870",
        { reach: 2.4, core: 0.5 });
      return false;
    }
    if (opt.halo && window.SPGlow) {
      window.SPGlow.glow(c, x, y, R * 0.92, opt.haloCol || "#ffd79a",
        { reach: opt.haloReach || 2.3, core: 0, alpha: opt.halo });
    }
    c.save();
    c.globalCompositeOperation = "source-over";
    c.drawImage(cv, x - R, y - R, R * 2, R * 2);
    if (opt.earthshine) {
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.75;
      c.strokeStyle = opt.earthshineCol || "rgba(186,200,226,0.95)";
      c.lineWidth = Math.max(1, R * 0.16);
      c.beginPath();
      c.arc(x, y, R * 0.94, 0, 6.283185307179586);
      c.stroke();
    }
    c.restore();
    return true;
  }

  /* HOW FAR ROUND TO TURN IT, and why this is not the real rotation rate.

     The first version used the true sidereal rates against the date on the
     playhead. Guru turns 870° a day; a thread reel advances several days a
     frame, so the rotation bucket changed on every single frame, every frame
     was a cache miss, and every miss is a per-pixel raycast plus a canvas
     allocation. The discs were being regenerated sixty times a second — the
     stutter the reels had.

     A reel is not a planetarium: nobody can read Guru's longitude off its
     belts. What the rotation is FOR is that the body should not look frozen.
     So it turns a fixed couple of times across the run, keyed on the
     playhead, which gives about thirty distinct discs for the whole reel
     instead of one per frame. Below ten pixels it does not turn at all,
     because the surface detail is smaller than a pixel and the only thing
     rotation would buy is cache misses. */
  function spinFor(name, progress, R) {
    if (!(R >= 10)) return 0;
    var turns = (name === "Jupiter" || name === "Saturn") ? 2 : 1;
    return ((progress || 0) * turns * 360) % 360;
  }
  function spinAt(name, ms, epochMs) {
    var d = (ms - (epochMs || 0)) / 86400000;
    return (SPIN[name] || 0) * d;
  }

  window.SPBody = { disc: disc, draw: draw, ready: ready, spinAt: spinAt,
                    spinFor: spinFor,
                    SPIN: SPIN,
                    _cached: function () { return KEYS.length; } };
})();
