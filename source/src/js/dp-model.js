/* ===== Director Pro — the document ========================================

   WHAT CHANGED FROM DIRECTOR, AND WHY IT HAD TO.

   Director gave a layer an entry, an exit, a continuous motion and an
   optional second rectangle to travel to. That is four named behaviours, and
   between them they can express a great many reels — but they cannot express
   "rise, hold for two seconds, drift left, then fall away", because that is
   five changes of direction on one property and the model holds two. Every
   tool that has ever had this problem has reached the same answer, and it is
   not a fifth named behaviour: it is KEYFRAMES.

   So here every animatable property is a track — a list of {t, v, e} sorted
   in time — and its value at an instant is an eased interpolation between the
   two keys either side. A property with one key is a constant. A property
   with none falls back to the layer's base value. Nothing else in the model
   animates anything, which is the point: there is exactly one answer to "why
   is this moving", and it is always "because of these keys".

   THE PRESETS STILL EXIST, AND THEY BAKE. "Rise in over half a second" is
   still one click, and that click WRITES KEYFRAMES rather than setting a mode
   the renderer interprets. A user who then wants the rise to overshoot drags
   a key, instead of discovering that the preset owns the property and the
   keys are ignored. A second hidden animation system that silently wins over
   the visible one is the single most confusing thing a tool like this can do,
   and refusing to have one is worth the extra code in bake().

   SCENES. A reel is a sequence of scenes, each with its own layers, its own
   backdrop, its own camera and a transition into the next. Director had one
   scene and a storyboard bolted alongside it; here the storyboard IS the
   document, times are in seconds rather than fractions of a mystery total,
   and a transition is a property of the join rather than a dip someone
   hard-coded.

   TIME IS IN SECONDS, EVERYWHERE. Director used fractions of the reel, which
   meant changing the reel length silently retimed every layer in it, and two
   layers could not be said to be "half a second apart" at all. Seconds are
   what a person editing a video thinks in and what a keyframe readout has to
   show, so seconds are what the model stores.

   NOTHING HERE DRAWS. This file is the document, the sampling, the presets
   and the migration from Director. The renderer is dp-render.js and the page
   is dp-ui.js; keeping the document free of canvas means it serialises, and
   that it can be built and asserted about in a test without a stage. */

(function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function uid(p) {
    uid.n = (uid.n || 0) + 1;
    return (p || "x") + uid.n + Math.floor(Math.random() * 46656).toString(36);
  }

  /* ---- easing -------------------------------------------------------------
     A keyframe carries the easing of the segment that LEAVES it, which is the
     convention every timeline tool uses: you set how a key departs, and the
     next key's own easing governs its own departure. The alternative — easing
     on arrival — reads backwards the moment you drag a key past another. */
  var EASE = {
    hold:    { label: "Hold", f: function () { return 0; } },
    linear:  { label: "Linear", f: function (f) { return f; } },
    smooth:  { label: "Smooth", f: function (f) { return f * f * (3 - 2 * f); } },
    "in":    { label: "Ease in", f: function (f) { return f * f * f; } },
    out:     { label: "Ease out", f: function (f) { var g = 1 - f; return 1 - g * g * g; } },
    inOut:   { label: "Ease in and out", f: function (f) {
      return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; } },
    back:    { label: "Overshoot", f: function (f) {
      var c = 1.70158, g = f - 1;
      return 1 + (c + 1) * g * g * g + c * g * g; } },
    anticipate: { label: "Anticipate", f: function (f) {
      var c = 1.70158; return f * f * ((c + 1) * f - c); } },
    elastic: { label: "Elastic", f: function (f) {
      if (f <= 0) return 0; if (f >= 1) return 1;
      var p = 0.34;
      return Math.pow(2, -10 * f) * Math.sin((f - p / 4) * (2 * Math.PI) / p) + 1; } },
    bounce:  { label: "Bounce", f: function (f) {
      var n = 7.5625, d = 2.75;
      if (f < 1 / d) return n * f * f;
      if (f < 2 / d) { f -= 1.5 / d; return n * f * f + 0.75; }
      if (f < 2.5 / d) { f -= 2.25 / d; return n * f * f + 0.9375; }
      f -= 2.625 / d; return n * f * f + 0.984375; } },
    step:    { label: "Step", f: function (f) { return f < 1 ? 0 : 1; } }
  };
  function ease(f, k) { return (EASE[k] || EASE.smooth).f(clamp(f, 0, 1)); }

  /* ---- tracks -------------------------------------------------------------
     A track is an array of keys sorted by time. Sampling is a binary search
     in principle and a linear scan in practice, because a track with more
     than a few dozen keys on one property is a track somebody should have
     drawn with a different property. */
  function key(t, v, e) { return { t: +t || 0, v: +v || 0, e: e || "smooth" }; }
  function sortTrack(tr) {
    tr.sort(function (a, b) { return a.t - b.t; });
    return tr;
  }
  /* The value of a property at a time.
     - no track, or an empty one → the layer's own base value
     - before the first key → that key's value (a property does not spring
       into existence; it was always what it first becomes)
     - after the last → the last key's value */
  function sample(track, t, base) {
    if (!track || !track.length) return base;
    if (track.length === 1) return track[0].v;
    if (t <= track[0].t) return track[0].v;
    var last = track[track.length - 1];
    if (t >= last.t) return last.v;
    for (var i = 0; i < track.length - 1; i++) {
      var a = track[i], b = track[i + 1];
      if (t >= a.t && t <= b.t) {
        var span = b.t - a.t;
        if (span <= 1e-9) return b.v;
        return lerp(a.v, b.v, ease((t - a.t) / span, a.e));
      }
    }
    return last.v;
  }
  /* add or replace a key at a time, which is what clicking "key this" does */
  function setKey(track, t, v, e) {
    for (var i = 0; i < track.length; i++) {
      if (Math.abs(track[i].t - t) < 1e-4) {
        track[i].v = v;
        if (e) track[i].e = e;
        return track[i];
      }
    }
    var k = key(t, v, e);
    track.push(k);
    sortTrack(track);
    return k;
  }

  /* ---- what a layer can animate ------------------------------------------
     The unit column matters more than it looks: a panel that shows rotation
     and opacity on the same slider range is a panel that cannot be used, and
     a keyframe readout has to print "32.0%" and "-14°" rather than two bare
     numbers. */
  var PROPS = {
    x:       { label: "X", unit: "%", min: -100, max: 200, step: 0.1, base: 10, scale: 100 },
    y:       { label: "Y", unit: "%", min: -100, max: 200, step: 0.1, base: 20, scale: 100 },
    w:       { label: "Width", unit: "%", min: 1, max: 300, step: 0.1, base: 80, scale: 100 },
    h:       { label: "Height", unit: "%", min: 1, max: 300, step: 0.1, base: 40, scale: 100 },
    scale:   { label: "Scale", unit: "×", min: 0, max: 6, step: 0.01, base: 1, scale: 1 },
    rot:     { label: "Rotation", unit: "°", min: -1440, max: 1440, step: 1, base: 0, scale: 1 },
    opacity: { label: "Opacity", unit: "", min: 0, max: 1, step: 0.01, base: 1, scale: 1 },
    skewX:   { label: "Skew X", unit: "°", min: -60, max: 60, step: 0.5, base: 0, scale: 1 },
    skewY:   { label: "Skew Y", unit: "°", min: -60, max: 60, step: 0.5, base: 0, scale: 1 },
    blur:    { label: "Blur", unit: "px", min: 0, max: 60, step: 0.5, base: 0, scale: 1 },
    glow:    { label: "Glow", unit: "px", min: 0, max: 90, step: 1, base: 0, scale: 1 },
    bright:  { label: "Brightness", unit: "×", min: 0, max: 3, step: 0.01, base: 1, scale: 1 },
    contrast:{ label: "Contrast", unit: "×", min: 0, max: 3, step: 0.01, base: 1, scale: 1 },
    sat:     { label: "Saturation", unit: "×", min: 0, max: 4, step: 0.01, base: 1, scale: 1 },
    hue:     { label: "Hue shift", unit: "°", min: -180, max: 180, step: 1, base: 0, scale: 1 },
    grain:   { label: "Grain", unit: "", min: 0, max: 1, step: 0.01, base: 0, scale: 1 },
    chroma:  { label: "Chromatic", unit: "px", min: 0, max: 24, step: 0.5, base: 0, scale: 1 },
    reveal:  { label: "Reveal", unit: "", min: 0, max: 1, step: 0.01, base: 1, scale: 1 },
    inner:   { label: "The drawing's own playhead", unit: "", min: 0, max: 1,
               step: 0.01, base: 1, scale: 1 }
  };
  var PROP_ORDER = ["x", "y", "w", "h", "scale", "rot", "skewX", "skewY",
                    "opacity", "reveal", "blur", "glow", "bright", "contrast",
                    "sat", "hue", "grain", "chroma", "inner"];

  var BLENDS = ["source-over", "multiply", "screen", "overlay", "darken",
                "lighten", "color-dodge", "color-burn", "hard-light",
                "soft-light", "difference", "exclusion", "hue", "saturation",
                "color", "luminosity"];
  var BLEND_LABEL = {
    "source-over": "Normal", multiply: "Multiply", screen: "Screen",
    overlay: "Overlay", darken: "Darken", lighten: "Lighten",
    "color-dodge": "Dodge", "color-burn": "Burn", "hard-light": "Hard light",
    "soft-light": "Soft light", difference: "Difference", exclusion: "Exclusion",
    hue: "Hue", saturation: "Saturation", color: "Colour", luminosity: "Luminosity"
  };

  var KINDS = {
    view:  "A composition — selected nodes drawn by a composer",
    text:  "Your own words, with a per-character animator",
    rule:  "A hairline, a bar, a box",
    wash:  "A tint, a vignette, a panel, a gradient",
    band:  "The caption band — headline over sub-line",
    stamp: "The date, the place and the handle",
    shape: "A circle, a ring, a polygon, a star",
    image: "A frame grabbed from another layer, or a file you chose"
  };

  var TRANSITIONS = {
    cut:      { label: "Cut", seconds: 0 },
    dissolve: { label: "Cross dissolve", seconds: 0.5 },
    dip:      { label: "Dip to colour", seconds: 0.6 },
    flash:    { label: "Flash", seconds: 0.3 },
    pushL:    { label: "Push left", seconds: 0.6 },
    pushR:    { label: "Push right", seconds: 0.6 },
    pushU:    { label: "Push up", seconds: 0.6 },
    wipeL:    { label: "Wipe left", seconds: 0.5 },
    wipeU:    { label: "Wipe up", seconds: 0.5 },
    iris:     { label: "Iris", seconds: 0.6 },
    zoomBlur: { label: "Zoom blur", seconds: 0.5 },
    glitch:   { label: "Glitch", seconds: 0.35 }
  };

  /* ---- the objects -------------------------------------------------------- */
  function track(o) { return sortTrack((o || []).map(function (k) {
    return key(k.t, k.v, k.e); })); }

  function layer(o) {
    o = o || {};
    var L = {
      id: o.id || uid("L"),
      kind: o.kind || "view",
      name: o.name || "",
      hidden: !!o.hidden, locked: !!o.locked, solo: !!o.solo,
      clip: !!o.clip,
      blend: o.blend || "source-over",
      /* content */
      sel: (o.sel || []).slice(),
      force: o.force || null,
      text: o.text || "",
      sub: o.sub || "",
      size: o.size == null ? 0.034 : o.size,
      align: o.align || "center",
      valign: o.valign || "middle",
      weight: o.weight == null ? 700 : o.weight,
      tracking: o.tracking == null ? 0 : o.tracking,
      lineHeight: o.lineHeight == null ? 1.26 : o.lineHeight,
      lines: o.lines == null ? 3 : o.lines,
      col: o.col || "ink",
      hex: o.hex || "#ffffff",
      hex2: o.hex2 || "#000000",
      shape: o.shape || "flat",
      sides: o.sides == null ? 6 : o.sides,
      src: o.src || null,
      /* how text arrives — the animator, which is a text-only affair and so
         does not belong in the general property list */
      animator: o.animator || "none",
      animSeconds: o.animSeconds == null ? 0.8 : o.animSeconds,
      /* time, in seconds within the scene */
      t0: o.t0 == null ? 0 : +o.t0,
      t1: o.t1 == null ? 0 : +o.t1,       /* 0 means "to the end of the scene" */
      /* base values, used wherever a property has no track */
      base: {},
      tracks: {},
      effects: (o.effects || []).map(function (e) {
        return { k: e.k, on: e.on !== false, p: JSON.parse(JSON.stringify(e.p || {})) }; }),
      mask: o.mask ? { shape: o.mask.shape || "rect", x: o.mask.x, y: o.mask.y,
                       w: o.mask.w, h: o.mask.h, feather: o.mask.feather || 0,
                       invert: !!o.mask.invert, rot: o.mask.rot || 0 } : null,
      clock: o.clock || "layer",
      cycles: o.cycles == null ? 1 : o.cycles,
      motionBlur: !!o.motionBlur
    };
    PROP_ORDER.forEach(function (k) {
      var P = PROPS[k];
      L.base[k] = (o.base && o.base[k] != null) ? +o.base[k]
                : (o[k] != null ? +o[k] : P.base);
      L.tracks[k] = track(o.tracks && o.tracks[k]);
    });
    return L;
  }

  function scene(o) {
    o = o || {};
    return {
      id: o.id || uid("S"),
      name: o.name || "Scene",
      seconds: o.seconds == null ? 6 : Math.max(0.2, +o.seconds),
      bg: { style: (o.bg && o.bg.style) || "gradient",
            stars: o.bg ? o.bg.stars !== false : true,
            hex: (o.bg && o.bg.hex) || null },
      trans: { k: (o.trans && o.trans.k) || "dissolve",
               seconds: (o.trans && o.trans.seconds) == null ? 0.5 : +o.trans.seconds,
               hex: (o.trans && o.trans.hex) || null },
      camera: {
        base: { zoom: (o.camera && o.camera.base && o.camera.base.zoom) || 1,
                panX: (o.camera && o.camera.base && o.camera.base.panX) || 0,
                panY: (o.camera && o.camera.base && o.camera.base.panY) || 0,
                rot:  (o.camera && o.camera.base && o.camera.base.rot) || 0 },
        tracks: { zoom: track(o.camera && o.camera.tracks && o.camera.tracks.zoom),
                  panX: track(o.camera && o.camera.tracks && o.camera.tracks.panX),
                  panY: track(o.camera && o.camera.tracks && o.camera.tracks.panY),
                  rot:  track(o.camera && o.camera.tracks && o.camera.tracks.rot) }
      },
      layers: (o.layers || []).map(layer)
    };
  }

  var FORMATS = {
    reel:      { label: "Reel / Story  9:16", w: 1080, h: 1920 },
    reel4k:    { label: "Reel 4K  9:16", w: 2160, h: 3840 },
    feed:      { label: "Feed post  4:5", w: 1080, h: 1350 },
    square:    { label: "Square  1:1", w: 1080, h: 1080 },
    squareHi:  { label: "Square HQ  1:1", w: 2048, h: 2048 },
    wide:      { label: "Landscape  16:9", w: 1920, h: 1080 },
    wide4k:    { label: "Landscape 4K  16:9", w: 3840, h: 2160 },
    cinema:    { label: "Cinemascope  2.39:1", w: 2048, h: 858 }
  };
  /* Where each platform puts its own chrome, as fractions of the frame. A
     guide is only useful if it is the real number, so these are kept apart
     rather than averaged into one "safe area" that is wrong everywhere. */
  var SAFE = {
    instagram: { label: "Instagram reel", top: 0.14, bottom: 0.20, right: 0.14, left: 0.03 },
    tiktok:    { label: "TikTok", top: 0.09, bottom: 0.22, right: 0.16, left: 0.03 },
    shorts:    { label: "YouTube Shorts", top: 0.10, bottom: 0.19, right: 0.14, left: 0.03 },
    feedpost:  { label: "Feed post", top: 0.05, bottom: 0.05, right: 0.05, left: 0.05 },
    none:      { label: "No guides", top: 0, bottom: 0, right: 0, left: 0 }
  };

  function doc(o) {
    o = o || {};
    var d = {
      v: 2,
      name: o.name || "Untitled reel",
      format: o.format || "reel",
      fps: o.fps || 30,
      quality: o.quality == null ? 12 : o.quality,     /* Mbit/s */
      safe: o.safe || "instagram",
      pal: o.pal || "midnight",
      handle: o.handle || "@Nirayana.Soft",
      grade: { bright: (o.grade && o.grade.bright) || 1,
               contrast: (o.grade && o.grade.contrast) || 1,
               sat: (o.grade && o.grade.sat) || 1,
               hue: (o.grade && o.grade.hue) || 0,
               vignette: (o.grade && o.grade.vignette) || 0,
               grain: (o.grade && o.grade.grain) || 0 },
      audio: o.audio ? { name: o.audio.name, start: o.audio.start || 0,
                         gain: o.audio.gain == null ? 1 : o.audio.gain,
                         fadeIn: o.audio.fadeIn || 0, fadeOut: o.audio.fadeOut || 0 }
                     : null,
      scenes: (o.scenes || []).map(scene)
    };
    if (!d.scenes.length) d.scenes = [scene({ name: "Scene 1" })];
    return d;
  }

  /* ---- time ---------------------------------------------------------------
     Scenes butt against each other and a transition is drawn over the join
     rather than adding to the length, which is what makes the reel exactly as
     long as the sum of its scenes. A transition that extended the timeline
     would mean adding a dissolve changed when every later scene started. */
  function total(d) {
    var t = 0;
    d.scenes.forEach(function (s) { t += s.seconds; });
    return Math.max(0.2, t);
  }
  function sceneAt(d, t) {
    var acc = 0;
    for (var i = 0; i < d.scenes.length; i++) {
      var s = d.scenes[i];
      if (t < acc + s.seconds || i === d.scenes.length - 1)
        return { i: i, scene: s, local: clamp(t - acc, 0, s.seconds), start: acc };
      acc += s.seconds;
    }
    return null;
  }
  function sceneStart(d, i) {
    var acc = 0;
    for (var j = 0; j < i && j < d.scenes.length; j++) acc += d.scenes[j].seconds;
    return acc;
  }
  /* a layer's window in the scene, resolving t1 = 0 to "the end" */
  function windowOf(L, s) {
    var a = clamp(L.t0, 0, s.seconds);
    var b = L.t1 > 0 ? clamp(L.t1, 0, s.seconds) : s.seconds;
    if (b < a) { var t = a; a = b; b = t; }
    return { a: a, b: b, len: Math.max(0.0001, b - a) };
  }
  /* the value of one property of one layer at a scene-local time */
  function valueOf(L, k, t) {
    return sample(L.tracks[k], t, L.base[k] == null ? PROPS[k].base : L.base[k]);
  }
  function cameraAt(s, t) {
    var c = s.camera;
    return { zoom: sample(c.tracks.zoom, t, c.base.zoom),
             panX: sample(c.tracks.panX, t, c.base.panX),
             panY: sample(c.tracks.panY, t, c.base.panY),
             rot:  sample(c.tracks.rot,  t, c.base.rot) };
  }

  /* ---- presets, which BAKE ------------------------------------------------
     Each writes keys into the layer's tracks over a stated stretch of its
     window and then has nothing more to do with it. That is the whole
     contract, and it is why a preset can be applied twice, applied to a
     property that already has keys, or half undone by dragging one key,
     without anything having to know a preset was ever involved. */
  function clearIn(tr, a, b) {
    for (var i = tr.length - 1; i >= 0; i--)
      if (tr[i].t >= a - 1e-6 && tr[i].t <= b + 1e-6) tr.splice(i, 1);
  }
  function put(L, k, t, v, e) { setKey(L.tracks[k], t, v, e); }

  var ENTRIES = {
    none:   { label: "Appear", f: function () {} },
    fade:   { label: "Fade in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity, "smooth"); } },
    rise:   { label: "Rise", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "y", a, L.base.y + 10, "out"); put(L, "y", b, L.base.y); } },
    drop:   { label: "Drop in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "y", a, L.base.y - 10, "bounce"); put(L, "y", b, L.base.y); } },
    slideL: { label: "In from the left", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.4, L.base.opacity);
      put(L, "x", a, L.base.x - 40, "out"); put(L, "x", b, L.base.x); } },
    slideR: { label: "In from the right", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.4, L.base.opacity);
      put(L, "x", a, L.base.x + 40, "out"); put(L, "x", b, L.base.x); } },
    pop:    { label: "Pop", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.5, L.base.opacity);
      put(L, "scale", a, L.base.scale * 0.6, "back"); put(L, "scale", b, L.base.scale); } },
    zoomIn: { label: "Zoom in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.5, L.base.opacity);
      put(L, "scale", a, L.base.scale * 1.6, "out"); put(L, "scale", b, L.base.scale); } },
    blurIn: { label: "Focus in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "blur", a, 26, "out"); put(L, "blur", b, L.base.blur); } },
    turn:   { label: "Turn in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "rot", a, L.base.rot - 16, "back"); put(L, "rot", b, L.base.rot); } },
    unroll: { label: "Unroll", f: function (L, a, b) {
      put(L, "reveal", a, 0, "inOut"); put(L, "reveal", b, 1); } },
    /* "Draw itself" means the thing builds up rather than arrives. For a view
       layer that is the composer's own playhead — every composer animates
       itself, so handing it a rising p IS the entry. For every other kind
       there is no inner animation to drive, so the same intent is a wipe.
       The harness caught this: on a shape layer the preset wrote three keys
       and produced one distinct frame, which is a control that looks like it
       works and does nothing. */
    draw:   { label: "Draw itself", f: function (L, a, b) {
      put(L, "inner", a, 0, "inOut"); put(L, "inner", b, 1);
      if (L.kind !== "view") { put(L, "reveal", a, 0, "inOut"); put(L, "reveal", b, 1); }
      put(L, "opacity", a, L.base.opacity); } },
    grow:   { label: "Grow from nothing", f: function (L, a, b) {
      put(L, "scale", a, 0.02, "back"); put(L, "scale", b, L.base.scale);
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.3, L.base.opacity); } }
  };
  var EXITS = {
    none:    { label: "Stay", f: function () {} },
    fade:    { label: "Fade out", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0); } },
    sink:    { label: "Sink", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "y", a, L.base.y, "in"); put(L, "y", b, L.base.y + 10); } },
    lift:    { label: "Lift away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "y", a, L.base.y, "in"); put(L, "y", b, L.base.y - 10); } },
    slideL:  { label: "Out to the left", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "x", a, L.base.x, "in"); put(L, "x", b, L.base.x - 40); } },
    slideR:  { label: "Out to the right", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "x", a, L.base.x, "in"); put(L, "x", b, L.base.x + 40); } },
    shrink:  { label: "Shrink away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "scale", a, L.base.scale, "in"); put(L, "scale", b, L.base.scale * 0.55); } },
    pullBack:{ label: "Pull back", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "scale", a, L.base.scale, "in"); put(L, "scale", b, L.base.scale * 1.5); } },
    blurOut: { label: "Blur away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "blur", a, L.base.blur, "in"); put(L, "blur", b, 30); } },
    roll:    { label: "Roll away", f: function (L, a, b) {
      put(L, "reveal", a, 1, "inOut"); put(L, "reveal", b, 0); } }
  };
  /* A continuous motion is a repeating pair of keys across the whole window,
     which is why there is no separate "loop" concept: the keys ARE the loop,
     and a user who wants the third cycle to be bigger drags the third pair. */
  var IDLES = {
    none:  { label: "Still", f: function () {} },
    drift: { label: "Drift", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "x", t, L.base.x + Math.sin(i / n * Math.PI * 2) * 1.6 * amt, "smooth");
        put(L, "y", t, L.base.y + Math.cos(i / n * Math.PI * 1.4) * 1.3 * amt, "smooth");
      } } },
    bob:   { label: "Bob", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "y", t, L.base.y + Math.sin(i / n * Math.PI * 4) * 1.4 * amt, "smooth");
      } } },
    sway:  { label: "Sway", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "rot", t, L.base.rot + Math.sin(i / n * Math.PI * 2) * 2.4 * amt, "smooth");
      } } },
    spin:  { label: "Spin", f: function (L, a, b, amt) {
      put(L, "rot", a, L.base.rot, "linear");
      put(L, "rot", b, L.base.rot + 360 * amt, "linear"); } },
    pulse: { label: "Breathe", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "scale", t, L.base.scale * (1 + Math.sin(i / n * Math.PI * 4) * 0.035 * amt), "smooth");
      } } },
    creep: { label: "Slow zoom", f: function (L, a, b, amt) {
      put(L, "scale", a, L.base.scale, "linear");
      put(L, "scale", b, L.base.scale * (1 + 0.12 * amt), "linear"); } },
    kenBurns: { label: "Ken Burns", f: function (L, a, b, amt) {
      put(L, "scale", a, L.base.scale, "inOut");
      put(L, "scale", b, L.base.scale * (1 + 0.18 * amt), "inOut");
      put(L, "x", a, L.base.x, "inOut");
      put(L, "x", b, L.base.x - 4 * amt, "inOut");
      put(L, "y", a, L.base.y, "inOut");
      put(L, "y", b, L.base.y - 3 * amt, "inOut"); } },
    shimmer: { label: "Shimmer", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n * 2; i++) {
        var t = a + (b - a) * (i / (n * 2));
        put(L, "opacity", t, L.base.opacity *
          (1 - Math.abs(Math.sin(i / (n * 2) * Math.PI * 9)) * 0.14 * amt), "smooth");
      } } }
  };

  /* Applying a preset clears the stretch it owns first, so applying "rise"
     after "slide in" replaces it instead of averaging two fights over x. */
  function applyEntry(L, s, k, seconds) {
    var w = windowOf(L, s), a = w.a, b = Math.min(w.b, a + Math.max(0.05, seconds));
    ["opacity", "x", "y", "scale", "rot", "blur", "reveal", "inner"].forEach(
      function (p) { clearIn(L.tracks[p], a, b); });
    (ENTRIES[k] || ENTRIES.none).f(L, a, b);
    L.entryName = k; L.entrySeconds = seconds;
  }
  function applyExit(L, s, k, seconds) {
    var w = windowOf(L, s), b = w.b, a = Math.max(w.a, b - Math.max(0.05, seconds));
    ["opacity", "x", "y", "scale", "rot", "blur", "reveal"].forEach(
      function (p) { clearIn(L.tracks[p], a, b); });
    (EXITS[k] || EXITS.none).f(L, a, b);
    L.exitName = k; L.exitSeconds = seconds;
  }
  function applyIdle(L, s, k, amt, cycles) {
    var w = windowOf(L, s);
    var n = Math.max(2, Math.round((cycles || 1) * 12));
    /* the idle owns the middle, leaving whatever the entry and exit wrote */
    var a = w.a + (L.entrySeconds || 0), b = w.b - (L.exitSeconds || 0);
    if (b - a < 0.2) { a = w.a; b = w.b; }
    ["x", "y", "scale", "rot", "opacity"].forEach(function (p) { clearIn(L.tracks[p], a, b); });
    (IDLES[k] || IDLES.none).f(L, a, b, amt == null ? 1 : amt, n);
    L.idleName = k;
  }

  /* ---- migrating a Director document --------------------------------------
     Director's four named behaviours are exactly expressible as keys, so a
     document made there opens here with its animation intact rather than
     flattened — and once open, every one of those behaviours is a handful of
     keys the user can drag, which is the upgrade. */
  function fromDirector(old, seconds) {
    seconds = seconds || 15;
    var s = scene({ name: old.name || "Scene 1", seconds: seconds,
                    bg: { style: (old.bg && old.bg.style) || "gradient",
                          stars: old.bg ? old.bg.stars !== false : true } });
    (old.layers || []).forEach(function (o) {
      var L = layer({
        kind: o.kind, name: o.name, hidden: o.hidden, locked: o.locked,
        clip: o.clip, sel: o.sel, force: o.force, text: o.text, sub: o.sub,
        size: o.size, align: o.align, valign: o.valign, weight: o.weight,
        lines: o.lines, col: o.col, hex: o.hex, shape: o.shape,
        clock: o.clock, cycles: o.cycles,
        t0: (o.t0 || 0) * seconds,
        t1: (o.t1 == null ? 1 : o.t1) * seconds,
        base: { x: (o.rect ? o.rect.x : 0.1) * 100, y: (o.rect ? o.rect.y : 0.2) * 100,
                w: (o.rect ? o.rect.w : 0.8) * 100, h: (o.rect ? o.rect.h : 0.4) * 100,
                rot: o.rot || 0, opacity: o.opacity == null ? 1 : o.opacity }
      });
      var w = windowOf(L, s);
      if (o.to) {
        put(L, "x", w.a, o.rect.x * 100, o.ease || "smooth");
        put(L, "x", w.b, o.to.x * 100);
        put(L, "y", w.a, o.rect.y * 100, o.ease || "smooth");
        put(L, "y", w.b, o.to.y * 100);
        put(L, "w", w.a, o.rect.w * 100, o.ease || "smooth");
        put(L, "w", w.b, o.to.w * 100);
        put(L, "h", w.a, o.rect.h * 100, o.ease || "smooth");
        put(L, "h", w.b, o.to.h * 100);
      }
      if (o.idle && o.idle.k && o.idle.k !== "none")
        applyIdle(L, s, o.idle.k === "flicker" ? "shimmer" : o.idle.k, o.idle.amt, 1);
      if (o.enter && o.enter.k && o.enter.k !== "none")
        applyEntry(L, s, ENTRIES[o.enter.k] ? o.enter.k : "fade",
                   (o.enter.len || 0.25) * seconds);
      if (o.exit && o.exit.k && o.exit.k !== "none")
        applyExit(L, s, EXITS[o.exit.k] ? o.exit.k : "fade",
                  (o.exit.len || 0.2) * seconds);
      s.layers.push(L);
    });
    return doc({ name: old.name || "From Director", scenes: [s] });
  }

  /* ---- stack and scene operations ----------------------------------------- */
  function findLayer(d, id) {
    for (var i = 0; i < d.scenes.length; i++)
      for (var j = 0; j < d.scenes[i].layers.length; j++)
        if (d.scenes[i].layers[j].id === id)
          return { scene: d.scenes[i], si: i, layer: d.scenes[i].layers[j], li: j };
    return null;
  }
  function soloed(s) {
    return s.layers.some(function (L) { return L.solo; });
  }
  function visible(s, L) {
    if (L.hidden) return false;
    if (soloed(s) && !L.solo) return false;
    return true;
  }

  window.DPModel = {
    EASE: EASE, PROPS: PROPS, PROP_ORDER: PROP_ORDER, KINDS: KINDS,
    BLENDS: BLENDS, BLEND_LABEL: BLEND_LABEL, TRANSITIONS: TRANSITIONS,
    FORMATS: FORMATS, SAFE: SAFE,
    ENTRIES: ENTRIES, EXITS: EXITS, IDLES: IDLES,
    doc: doc, scene: scene, layer: layer, key: key, track: track,
    uid: uid, ease: ease, sample: sample, setKey: setKey, sortTrack: sortTrack,
    clearIn: clearIn,
    total: total, sceneAt: sceneAt, sceneStart: sceneStart,
    windowOf: windowOf, valueOf: valueOf, cameraAt: cameraAt,
    applyEntry: applyEntry, applyExit: applyExit, applyIdle: applyIdle,
    fromDirector: fromDirector, findLayer: findLayer,
    visible: visible, soloed: soloed,
    clamp: clamp, lerp: lerp
  };
})();
