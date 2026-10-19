/* ===== Studio Pro — Director mode =========================================

   WHAT THIS IS, AND WHY IT IS A SECOND MODE RATHER THAN A REPLACEMENT.

   Auto mode answers "what is the best picture of this selection?" and it
   answers it well, which is exactly why it cannot also be the pro tool. Its
   whole method is to decide: it scores the composers, picks the winner, lays
   it in the one stage rect, and times it against the one playhead. Every one
   of those decisions is the right default and none of them is negotiable, so
   a user who wants the Moon's track small in the corner, the ṣaḍbala bars
   full-bleed behind it, a line of their own text entering at four seconds and
   the whole thing drifting — cannot get there by arguing with the scorer.

   Director mode takes the same composition apart into LAYERS and hands every
   one of those decisions over. A layer is:

     what   — a group of selected nodes and which composer draws them, or a
              piece of text, a rule, a wash, the caption band, the stamp
     where  — a rectangle in fractions of the frame, with an optional second
              rectangle it travels to, so a move, a zoom or a pan is just
              two rects and an easing
     when   — a window [t0,t1] of the reel, so layers sequence against each
              other rather than all starting at zero
     how    — an entry, an exit, a continuous idle motion, an easing, an
              opacity, a rotation, and which clock the composer inside sees

   Nothing here draws astronomy. Every picture is still one of the fifteen
   composers, because a composer has never known where it sits: it is handed a
   rect and a playhead and sizes everything from them. That is the whole
   reason this mode is a few hundred lines and not a rewrite, and it is why a
   composer added for Auto mode arrives in Director already placeable,
   already timeable, already animatable.

   THE DOCUMENT IS DATA. A composition is a plain object that serialises to
   JSON, which is what makes it saveable, re-openable, shareable as text and
   testable. The test suite builds documents, renders them and asserts the
   frames differ — a thing that was impossible to assert about Auto mode,
   where the arrangement was implicit in the code.

   WHAT IT COSTS PER FRAME. Director renders N layers where Auto rendered one,
   so the cost is the honest sum of the layers rather than a fixed price. Two
   things keep that from undoing the performance work: node values are cached
   per context in the registry, so a node read by three layers is derived
   once; and nothing in this file touches the DOM. The handles are drawn by a
   separate overlay pass that the UI calls after rendering and the recorder
   never calls, which is also why they cannot end up in an export. */

(function () {
  "use strict";

  function K() { return window.SPStage.kit; }
  function S() { return window.SPStage.S; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }

  /* ---- easing ------------------------------------------------------------
     Five, not fifty. Each one is a different intention — arrive evenly,
     arrive softly, leave softly, settle, overshoot — and a list of twenty
     named curves is a list in which nobody can tell two of them apart. */
  var EASE = {
    linear: { label: "Linear", f: function (f) { return f; } },
    smooth: { label: "Smooth", f: function (f) { return f * f * (3 - 2 * f); } },
    "in":   { label: "Ease in", f: function (f) { return f * f; } },
    out:    { label: "Ease out", f: function (f) { return 1 - (1 - f) * (1 - f); } },
    back:   { label: "Overshoot", f: function (f) {
      var c = 1.70158; var g = f - 1;
      return 1 + (c + 1) * g * g * g + c * g * g; } }
  };
  function ease(f, key) { return (EASE[key] || EASE.smooth).f(clamp(f, 0, 1)); }

  /* ---- motion ------------------------------------------------------------
     An entry, an exit and an idle each return a contribution to one
     transform, and the three are composed. Keeping them as contributions
     rather than as three separate draws is what lets a layer rise in, drift
     through and fade out without the three fighting over the canvas state. */
  function T0() {
    return { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, a: 1, clip: null, cp: null };
  }
  var ENTER = {
    none:   { label: "Appear", f: function () {} },
    fade:   { label: "Fade in", f: function (T, f) { T.a *= f; } },
    rise:   { label: "Rise", f: function (T, f) { T.a *= f; T.dy += (1 - f) * 0.10; } },
    drop:   { label: "Drop", f: function (T, f) { T.a *= f; T.dy -= (1 - f) * 0.10; } },
    slideL: { label: "In from left", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx -= (1 - f) * 0.35; } },
    slideR: { label: "In from right", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx += (1 - f) * 0.35; } },
    pop:    { label: "Pop", f: function (T, f) { T.a *= f; T.sx *= 0.80 + 0.20 * f; T.sy *= 0.80 + 0.20 * f; } },
    zoom:   { label: "Zoom in", f: function (T, f) { T.a *= Math.min(1, f * 1.6); T.sx *= 1.35 - 0.35 * f; T.sy *= 1.35 - 0.35 * f; } },
    wipeUp: { label: "Wipe up", f: function (T, f) { T.clip = { x: 0, y: 1 - f, w: 1, h: f }; } },
    wipeL:  { label: "Wipe across", f: function (T, f) { T.clip = { x: 0, y: 0, w: f, h: 1 }; } },
    iris:   { label: "Iris", f: function (T, f) { T.cp = f; } },
    turn:   { label: "Turn in", f: function (T, f) { T.a *= f; T.rot += (1 - f) * -14; } },
    /* the composer's own build-up IS the entry — nothing is transformed, and
       the clock handling below feeds it a rising p */
    draw:   { label: "Draw itself", f: function () {} }
  };
  var EXIT = {
    none:    { label: "Stay", f: function () {} },
    fade:    { label: "Fade out", f: function (T, f) { T.a *= 1 - f; } },
    sink:    { label: "Sink", f: function (T, f) { T.a *= 1 - f; T.dy += f * 0.10; } },
    lift:    { label: "Lift", f: function (T, f) { T.a *= 1 - f; T.dy -= f * 0.10; } },
    slideL:  { label: "Out to left", f: function (T, f) { T.a *= 1 - f * f; T.dx -= f * 0.35; } },
    slideR:  { label: "Out to right", f: function (T, f) { T.a *= 1 - f * f; T.dx += f * 0.35; } },
    shrink:  { label: "Shrink", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 - 0.22 * f; T.sy *= 1 - 0.22 * f; } },
    pullBack:{ label: "Pull back", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 + 0.30 * f; T.sy *= 1 + 0.30 * f; } },
    wipeDown:{ label: "Wipe away", f: function (T, f) { T.clip = { x: 0, y: 0, w: 1, h: 1 - f }; } }
  };
  /* Idle motions run on the reel clock, not the layer's, so two layers with
     different windows still drift in step — the thing that makes a frame feel
     like one scene rather than several animations sharing a canvas. */
  var IDLE = {
    none:  { label: "Still", f: function () {} },
    drift: { label: "Drift", f: function (T, a, p) {
      T.dx += Math.sin(p * Math.PI * 2) * 0.012 * a;
      T.dy += Math.cos(p * Math.PI * 2 * 0.7) * 0.010 * a; } },
    bob:   { label: "Bob", f: function (T, a, p) {
      T.dy += Math.sin(p * Math.PI * 4) * 0.011 * a; } },
    sway:  { label: "Sway", f: function (T, a, p) {
      T.rot += Math.sin(p * Math.PI * 2) * 2.2 * a; } },
    spin:  { label: "Spin", f: function (T, a, p) { T.rot += p * 360 * a; } },
    pulse: { label: "Breathe", f: function (T, a, p) {
      var s = 1 + Math.sin(p * Math.PI * 4) * 0.035 * a;
      T.sx *= s; T.sy *= s; } },
    creep: { label: "Slow zoom", f: function (T, a, p) {
      var s = 1 + p * 0.10 * a; T.sx *= s; T.sy *= s; } },
    flicker: { label: "Shimmer", f: function (T, a, p) {
      T.a *= 1 - Math.abs(Math.sin(p * Math.PI * 9)) * 0.14 * a; } }
  };

  /* ---- what a layer can be ---------------------------------------------- */
  var KINDS = {
    view:  "A composition — selected nodes drawn by a composer",
    text:  "A line or paragraph of your own words",
    rule:  "A hairline or a bar",
    wash:  "A tint, a vignette or a panel behind other layers",
    band:  "The caption band — headline over sub-line",
    stamp: "The handle, the date and the place"
  };
  var COLS = ["ink", "gold", "dim", "ben", "mal", "line", "bg", "custom"];

  function uid() {
    uid.n = (uid.n || 0) + 1;
    return "L" + uid.n + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function layer(o) {
    o = o || {};
    var L = {
      id: o.id || uid(),
      kind: o.kind || "view",
      name: o.name || "",
      hidden: !!o.hidden,
      locked: !!o.locked,
      /* view */
      sel: (o.sel || []).slice(),
      force: o.force || null,
      /* text / rule / wash / band / stamp */
      text: o.text || "",
      size: o.size == null ? 0.030 : o.size,
      align: o.align || "center",
      valign: o.valign || "middle",
      weight: o.weight == null ? 700 : o.weight,
      col: o.col || "ink",
      hex: o.hex || "#ffffff",
      lines: o.lines == null ? 3 : o.lines,
      sub: o.sub || "",
      shape: o.shape || "flat",
      /* where */
      rect: o.rect ? { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h }
                   : { x: 0.10, y: 0.20, w: 0.80, h: 0.40 },
      to: o.to ? { x: o.to.x, y: o.to.y, w: o.to.w, h: o.to.h } : null,
      rot: o.rot || 0,
      opacity: o.opacity == null ? 1 : o.opacity,
      /* A composer sizes its diagram from the rect but writes its labels
         wherever its own layout puts them, which in a small rect can be
         outside it. That is right in Auto mode, where the rect is the whole
         stage, and wrong the moment a user places two layers side by side and
         one writes over the other. Off by default, because clipping a layer
         that was not overflowing only costs a clip; on, it makes the
         rectangle mean exactly what it looks like it means. */
      clip: !!o.clip,
      /* when — fractions of the reel */
      t0: o.t0 == null ? 0 : o.t0,
      t1: o.t1 == null ? 1 : o.t1,
      /* how */
      enter: { k: (o.enter && o.enter.k) || "fade",
               len: (o.enter && o.enter.len) == null ? 0.25 : o.enter.len },
      exit:  { k: (o.exit && o.exit.k) || "none",
               len: (o.exit && o.exit.len) == null ? 0.20 : o.exit.len },
      idle:  { k: (o.idle && o.idle.k) || "none",
               amt: (o.idle && o.idle.amt) == null ? 1 : o.idle.amt },
      ease: o.ease || "smooth",
      /* which playhead the composer inside sees */
      clock: o.clock || "layer",
      at: o.at == null ? 1 : o.at,
      cycles: o.cycles == null ? 1 : o.cycles
    };
    return L;
  }

  function doc(o) {
    o = o || {};
    return {
      on: !!o.on,
      name: o.name || "Untitled composition",
      bg: { style: (o.bg && o.bg.style) || "gradient",
            stars: o.bg ? !!o.bg.stars : true },
      layers: (o.layers || []).map(layer)
    };
  }

  var DOC = doc({ on: false });
  var PICK = null;          /* the id of the layer being edited */

  /* ---- grouping a selection into layers ----------------------------------

     Taking control has to start from something that already looks like what
     Auto drew, or the mode is a blank canvas pretending to be a studio. So
     "split" groups the selection the way the Layers composer does — by the
     shape each node declares, with a longitude riding along with the lanes or
     edges it annotates — and gives each group its own layer. The user then
     moves, retimes and restyles groups that were already drawn sensibly,
     which is editing; starting from nothing is authoring from scratch, and
     anyone who wants that can clear the stack in one click. */
  var ORDER = ["almanac", "houses", "houseset", "grid", "lanes", "edges",
               "spanset", "span", "series", "sset", "scalar", "lonset", "lon"];

  function groupsOf(sel, C) {
    var B = window.SPStage.bagOf(sel, C);
    var bag = B.bag, groups = [];
    var hasLanes = !!(bag.lanes && bag.lanes.length);
    var hasEdges = !!(bag.edges && bag.edges.length);
    ORDER.forEach(function (k) {
      var items = bag[k];
      if (!items || !items.length) return;
      if (k === "lon" && (hasLanes || hasEdges)) return;
      var ids = items.map(function (it) { return it.node.id; });
      if ((k === "lanes" || k === "edges") && bag.lon)
        ids = ids.concat(bag.lon.map(function (it) { return it.node.id; }));
      groups.push({ kind: k, ids: ids,
                    label: items.length === 1 ? items[0].node.label
                                              : items.length + " × " + k });
    });
    return { groups: groups, missing: B.missing };
  }

  /* ---- the frame rectangles ---------------------------------------------- */
  /* The stage rect as fractions, so a layer built here lands exactly where
     Auto would have drawn it and the switch into Director does not move the
     picture. */
  function stageRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var top = safe ? SA.top : 0.045;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    var band = 0.115;
    return { x: side, y: top, w: 1 - side * 2, h: 1 - top - bot - band };
  }
  function bandRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    return { x: side, y: 1 - bot - 0.115, w: 1 - side * 2, h: 0.105 };
  }

  /* ---- building a document ----------------------------------------------- */
  /* `how`:
       "single" — the whole selection as one layer, drawn as Auto drew it
       "split"  — one layer per shape group
       "solo"   — one layer per selected node, each drawn on its own
     All three add the caption band and the stamp as layers, because the point
     of the mode is that the chrome is editable too: a user who wants the
     headline centred over the diagram rather than under it must be able to
     pick it up and move it. */
  function build(sel, C, force, how, headline, sub) {
    var R = stageRect(), out = [], g;
    sel = (sel || []).slice();

    if (how === "solo") {
      sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        if (!n || !window.SPNodes.resolve(n, C)) return;
        out.push({ sel: [id], label: n.label });
      });
    } else if (how === "split") {
      g = groupsOf(sel, C);
      g.groups.forEach(function (q) { out.push({ sel: q.ids, label: q.label }); });
    } else {
      if (sel.length) out.push({ sel: sel, force: force || null, label: "The composition" });
    }
    if (!out.length && sel.length)
      out.push({ sel: sel, force: force || null, label: "The composition" });

    var n = out.length, layers = [];
    /* a wash behind everything, off by default in style but present so it is
       one click from being a panel rather than a thing to go and find */
    layers.push(layer({ kind: "wash", name: "Backdrop panel", hidden: true,
                        shape: "panel", col: "line", opacity: 0.30,
                        rect: { x: 0.05, y: 0.11, w: 0.90, h: 0.70 },
                        enter: { k: "fade", len: 0.18 } }));

    out.forEach(function (q, i) {
      var r;
      if (n === 1) r = R;
      else if (n === 2)
        r = { x: R.x, y: R.y + (R.h / 2) * i, w: R.w, h: R.h / 2 * 0.94 };
      else {
        var rows = Math.ceil(n / 2), col = i % 2, row = Math.floor(i / 2);
        r = { x: R.x + (R.w / 2) * col, y: R.y + (R.h / rows) * row,
              w: R.w / 2 * 0.95, h: R.h / rows * 0.94 };
      }
      layers.push(layer({
        kind: "view", name: q.label, sel: q.sel, force: q.force || null, rect: r,
        /* staggered, so a split composition reads as one thing assembling
           rather than four things starting at once */
        t0: n > 1 ? clamp(i * 0.12, 0, 0.5) : 0, t1: 1,
        enter: { k: i % 2 ? "slideR" : "rise", len: n > 1 ? 0.22 : 0.30 },
        exit: { k: "none", len: 0.2 },
        idle: { k: "none", amt: 1 }, clock: "layer"
      }));
    });

    var BR = bandRect();
    layers.push(layer({
      kind: "band", name: "Caption band",
      text: headline || "", sub: sub || "",
      rect: BR, t0: n > 1 ? 0.10 : 0.04, t1: 1,
      enter: { k: "rise", len: 0.22 }, col: "gold"
    }));
    layers.push(layer({
      kind: "stamp", name: "Stamp — handle and date",
      rect: { x: 0.08, y: 1 - (S().safe ? window.SPStage.SAFE.bottom : 0.045) - 0.012,
              w: 0.84, h: 0.040 },
      size: 0.019, col: "dim", t0: 0.02, t1: 1,
      enter: { k: "fade", len: 0.25 }
    }));

    DOC = doc({ on: true, name: "From " + (sel.length || 0) + " node(s)",
                bg: { style: "gradient", stars: true }, layers: layers });
    PICK = layers.length > 1 ? layers[1].id : layers[0].id;
    return DOC;
  }

  /* ---- arrangement presets -----------------------------------------------
     Not templates for the picture — templates for the GEOMETRY. They re-lay
     the view layers that already exist and leave the text, the band and the
     stamp where they are, so trying an arrangement costs one click and
     nothing is lost by trying it. */
  var ARRANGE = {
    stack: { label: "Stack", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h / n) * i, w: R.w, h: R.h / n * 0.94 };
      });
    } },
    grid: { label: "Grid", f: function (views, R) {
      var n = views.length, cols = n <= 1 ? 1 : 2, rows = Math.ceil(n / cols);
      views.forEach(function (L, i) {
        var c = i % cols, r = Math.floor(i / cols);
        L.rect = { x: R.x + (R.w / cols) * c, y: R.y + (R.h / rows) * r,
                   w: R.w / cols * 0.95, h: R.h / rows * 0.94 };
      });
    } },
    hero: { label: "Hero and strip", f: function (views, R) {
      if (!views.length) return;
      var rest = views.length - 1;
      views[0].rect = { x: R.x, y: R.y, w: R.w, h: R.h * (rest ? 0.64 : 1) };
      for (var i = 1; i < views.length; i++)
        views[i].rect = { x: R.x + (R.w / rest) * (i - 1), y: R.y + R.h * 0.68,
                          w: R.w / rest * 0.94, h: R.h * 0.32 };
    } },
    bleed: { label: "Full bleed", f: function (views) {
      views.forEach(function (L) { L.rect = { x: 0, y: 0, w: 1, h: 1 }; });
    } },
    thirds: { label: "Upper third", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h * 0.62 / n) * i,
                   w: R.w, h: R.h * 0.62 / n * 0.94 };
      });
    } },
    corners: { label: "Scatter", f: function (views, R) {
      var SP = [[0.00, 0.00], [0.50, 0.00], [0.00, 0.50], [0.50, 0.50]];
      views.forEach(function (L, i) {
        var s = SP[i % 4];
        L.rect = { x: R.x + R.w * s[0], y: R.y + R.h * s[1],
                   w: R.w * 0.48, h: R.h * 0.47 };
      });
    } },
    centre: { label: "Centre all", f: function (views, R) {
      views.forEach(function (L) {
        L.rect = { x: R.x + R.w * 0.08, y: R.y + R.h * 0.10,
                   w: R.w * 0.84, h: R.h * 0.78 };
      });
    } }
  };
  function arrange(key) {
    var f = ARRANGE[key]; if (!f) return;
    var views = DOC.layers.filter(function (L) { return L.kind === "view"; });
    f.f(views, stageRect());
  }

  /* Sequencing presets — the time axis gets the same treatment as the space
     one, because "they all start at zero" is the single most common reason a
     multi-layer reel reads as a mess. */
  var SEQUENCE = {
    together: { label: "All at once", f: function (Ls) {
      Ls.forEach(function (L) { L.t0 = 0; L.t1 = 1; }); } },
    cascade: { label: "Cascade", f: function (Ls) {
      Ls.forEach(function (L, i) {
        L.t0 = clamp(i * (0.6 / Math.max(1, Ls.length)), 0, 0.7); L.t1 = 1; }); } },
    relay: { label: "One at a time", f: function (Ls) {
      var n = Ls.length || 1;
      Ls.forEach(function (L, i) {
        L.t0 = i / n; L.t1 = (i + 1) / n;
        L.enter = { k: L.enter.k === "none" ? "fade" : L.enter.k, len: 0.30 };
        L.exit = { k: "fade", len: 0.25 }; }); } },
    overlap: { label: "Overlapping", f: function (Ls) {
      var n = Ls.length || 1, w = Math.min(1, 1.8 / n);
      Ls.forEach(function (L, i) {
        L.t0 = clamp((i / n) * (1 - w * 0.4), 0, 0.9);
        L.t1 = clamp(L.t0 + w, 0.1, 1);
        L.exit = { k: "fade", len: 0.3 }; }); } }
  };
  function sequence(key) {
    var f = SEQUENCE[key]; if (!f) return;
    f.f(DOC.layers.filter(function (L) { return !L.hidden; }));
  }

  /* ---- text with the day in it -------------------------------------------
     A studio whose text layers are only literal strings makes a card that is
     out of date tomorrow. These resolve at render time from the same context
     every node reads, so a saved composition reopened next week says next
     week's tithi — and a token that cannot be resolved prints as itself
     rather than as "undefined", so a typo in a token is visible on the frame
     rather than silently blank. */
  var TOKENS = {
    "{date}": function (C) {
      var g = C.day && C.day.gregorian;
      if (!g) return new Date(C.when).toDateString();
      var M = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"];
      return g.d + " " + (M[(g.m || 1) - 1] || "") + " " + g.y;
    },
    "{place}": function (C) { return (C.place && C.place.n) || ""; },
    "{vara}": function (C) { return (C.day && C.day.vara) || ""; },
    "{tithi}": function (C) {
      var a = C.day && C.day.at && C.day.at.tithi;
      return a ? ((a.paksha ? a.paksha + " " : "") + a.name) : ""; },
    "{naks}": function (C) {
      var a = C.day && C.day.at && C.day.at.nak;
      return a ? a.name + " pāda " + a.pada : ""; },
    "{yoga}": function (C) {
      var a = C.day && C.day.at && C.day.at.yoga; return a ? a.name : ""; },
    "{karana}": function (C) {
      var a = C.day && C.day.at && C.day.at.karana; return a ? a.name : ""; },
    "{masa}": function (C) {
      var m = C.day && C.day.masa; return m ? (m.amantaIAST || "") : ""; },
    "{samvat}": function (C) {
      var s = C.day && C.day.samvat;
      return s && s.vikrama ? s.vikrama + " Vikrama" : ""; },
    "{dasha}": function (C) {
      try { var cm = window.SPNodes.currentMd(C); return cm ? cm.lord : ""; }
      catch (e) { return ""; } },
    "{handle}": function () { return S().handle || "@Nirayana.Soft"; }
  };
  function expand(s, C) {
    if (!s) return "";
    return String(s).replace(/\{[a-z]+\}/g, function (m) {
      var f = TOKENS[m];
      if (!f) return m;
      var v = "";
      try { v = f(C) || ""; } catch (e) { v = ""; }
      return v || m;
    });
  }
  function tokenList() {
    var out = [];
    for (var k in TOKENS) if (TOKENS.hasOwnProperty(k)) out.push(k);
    return out;
  }

  /* ---- colour ------------------------------------------------------------ */
  function colOf(L) {
    var P = K().pal();
    if (L.col === "custom") return L.hex || P.ink;
    return P[L.col] || P.ink;
  }

  /* ---- the frame-owning composers ---------------------------------------
     The almanac leaf paints a whole page to the frame's edge: it is a card,
     not a diagram, and it has no notion of sitting inside a rectangle. In
     Director it may be placed anywhere, so it is drawn once into a scratch
     canvas at the layer rect's own aspect and blitted. The scratch canvas is
     kept and reused, because allocating a 1080-wide canvas per frame is a
     garbage-collection pause every second or so. */
  var SCRATCH = null;
  function leafInto(v, p, px, C) {
    var w = Math.max(32, Math.round(px.w)), h = Math.max(32, Math.round(px.h));
    if (!SCRATCH) SCRATCH = document.createElement("canvas");
    if (SCRATCH.width !== w || SCRATCH.height !== h) {
      SCRATCH.width = w; SCRATCH.height = h;
    }
    var c2 = SCRATCH.getContext("2d");
    c2.clearRect(0, 0, w, h);
    try { window.SPAlmanac.draw(c2, w, h, v, p, K().pal(), { foot: S().handle }); }
    catch (e) { return; }
    S().ctx.drawImage(SCRATCH, px.x, px.y, px.w, px.h);
  }

  /* ---- a layer's time and transform -------------------------------------- */
  function windowU(L, p) {
    var a = Math.min(L.t0, L.t1), b = Math.max(L.t0, L.t1);
    if (b - a < 1e-4) return p >= a ? 1 : -1;
    if (p < a - 1e-6 || p > b + 1e-6) return -1;
    return clamp((p - a) / (b - a), 0, 1);
  }
  function transformOf(L, u, p) {
    var T = T0();
    var el = clamp(L.enter.len, 0, 1), xl = clamp(L.exit.len, 0, 1);
    var ep = el > 0.001 ? clamp(u / el, 0, 1) : 1;
    var xp = xl > 0.001 ? clamp((u - (1 - xl)) / xl, 0, 1) : 0;
    var E = ENTER[L.enter.k] || ENTER.fade;
    var X = EXIT[L.exit.k] || EXIT.none;
    var I = IDLE[L.idle.k] || IDLE.none;
    E.f(T, ease(ep, L.ease));
    if (xp > 0) X.f(T, ease(xp, L.ease));
    I.f(T, L.idle.amt == null ? 1 : L.idle.amt, p);
    T.a *= clamp(L.opacity, 0, 1);
    T.rot += L.rot || 0;
    return T;
  }
  function rectAt(L, u) {
    if (!L.to) return L.rect;
    var f = ease(u, L.ease);
    return { x: lerp(L.rect.x, L.to.x, f), y: lerp(L.rect.y, L.to.y, f),
             w: lerp(L.rect.w, L.to.w, f), h: lerp(L.rect.h, L.to.h, f) };
  }
  /* which playhead the composer inside the layer is handed */
  function innerP(L, u, p) {
    if (L.clock === "reel") return p;
    if (L.clock === "frozen") return clamp(L.at, 0, 1);
    if (L.clock === "loop") {
      var n = Math.max(1, L.cycles || 1);
      return (u * n) % 1;
    }
    if (L.enter.k === "draw") {
      /* the composer's own build-up is the entry, so it is stretched over the
         entry length and then held */
      var el = clamp(L.enter.len, 0.02, 1);
      return clamp(u / el, 0, 1);
    }
    return u;
  }

  function pxOf(R) {
    var s = S();
    return { x: R.x * s.W, y: R.y * s.H, w: R.w * s.W, h: R.h * s.H };
  }

  /* ---- drawing one layer -------------------------------------------------- */
  function drawLayer(L, C, p, report) {
    if (L.hidden) return;
    var u = windowU(L, p);
    if (u < 0) return;
    var s = S(), c = s.ctx;
    var R = rectAt(L, u), T = transformOf(L, u, p);
    if (T.a <= 0.002) return;
    var px = pxOf(R);
    var cx = px.x + px.w / 2, cy = px.y + px.h / 2;

    c.save();
    c.globalAlpha = T.a;
    if (L.clip) {
      /* the layer's own box, before any motion clip — applied first so a wipe
         still wipes within it rather than against it */
      c.beginPath();
      c.rect(px.x, px.y, px.w, px.h);
      c.clip();
    }
    if (T.clip) {
      c.beginPath();
      c.rect(px.x + T.clip.x * px.w, px.y + T.clip.y * px.h,
             px.w * T.clip.w, px.h * T.clip.h);
      c.clip();
    }
    if (T.cp != null) {
      c.beginPath();
      c.arc(cx, cy, Math.max(px.w, px.h) * 0.75 * T.cp, 0, Math.PI * 2);
      c.clip();
    }
    c.translate(cx + T.dx * s.W, cy + T.dy * s.H);
    if (T.rot) c.rotate(T.rot * Math.PI / 180);
    if (T.sx !== 1 || T.sy !== 1) c.scale(T.sx, T.sy);
    c.translate(-cx, -cy);

    try { paint(L, C, innerP(L, u, p), px, report); }
    catch (e) {
      if (report) report.errors.push({ id: L.id, name: nameOf(L), why: String(e && e.message || e) });
    }
    c.restore();
  }

  function paint(L, C, ip, px, report) {
    var s = S(), c = s.ctx, kit = K(), P = kit.pal();

    if (L.kind === "view") {
      var B = window.SPStage.bagOf(L.sel, C);
      if (report && B.missing.length)
        B.missing.forEach(function (m) {
          report.missing.push({ layer: nameOf(L), label: m.label || m.id, why: m.why });
        });
      /* the leaf is its own page and is blitted; everything else is handed
         the rect and draws into it */
      if (B.bag.almanac && B.bag.almanac.length) {
        leafInto(B.bag.almanac[0].v, ip, px, C);
        if (report) report.used.push({ id: L.id, composer: "almanac" });
        return;
      }
      var st = {
        x: px.x, y: px.y, w: px.w, h: px.h,
        cx: px.x + px.w / 2, cy: px.y + px.h / 2,
        bandY: px.y + px.h * 0.88, bandH: px.h * 0.12, side: px.w * 0.05
      };
      var got = window.SPStage.kit.drawInto(B.bag, ip, st, C, L.force);
      if (!got) {
        if (report) report.empty.push({ id: L.id, name: nameOf(L),
          why: L.sel.length ? "nothing in this layer resolves right now"
                            : "this layer has no nodes in it" });
        return;
      }
      if (got.error && report)
        report.errors.push({ id: L.id, name: nameOf(L), why: got.error });
      if (report) report.used.push({ id: L.id, composer: got.key, label: got.label });
      return;
    }

    if (L.kind === "text") {
      var str = expand(L.text, C);
      if (!str) return;
      var size = L.size * s.U;
      var x = L.align === "left" ? px.x : (L.align === "right" ? px.x + px.w : px.x + px.w / 2);
      var n = Math.max(1, L.lines || 1);
      if (n === 1) {
        kit.txtFit(str, x, px.y + px.h / 2, size, colOf(L), L.align, L.weight, px.w);
      } else {
        /* A block the user placed in a box must sit in that box, so the rows
           are measured before any of them is drawn and the first one is
           lifted by half of what the block will occupy. Measuring by drawing
           it off-screen first would be two text passes a frame for a thing
           arithmetic answers. */
        var lh = size * 1.26;
        var rows = kit.wrapLines(str, size, px.w, n, L.weight);
        var used = Math.max(1, rows.length);
        var top = L.valign === "top" ? px.y + size * 0.7
                : (L.valign === "bottom" ? px.y + px.h - lh * (used - 0.7)
                : px.y + px.h / 2 - lh * (used - 1) / 2);
        for (var ri = 0; ri < rows.length; ri++)
          kit.txt(rows[ri], x, top + ri * lh, size, colOf(L), L.align, L.weight);
      }
      return;
    }

    if (L.kind === "rule") {
      c.save();
      c.globalAlpha = c.globalAlpha * 0.95;
      var col = colOf(L);
      if (L.shape === "bar") {
        c.fillStyle = col;
        c.fillRect(px.x, px.y, px.w, Math.max(1, px.h));
      } else if (L.shape === "double") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0016);
        c.beginPath();
        c.moveTo(px.x, px.y); c.lineTo(px.x + px.w, px.y);
        c.moveTo(px.x, px.y + px.h); c.lineTo(px.x + px.w, px.y + px.h);
        c.stroke();
      } else if (L.shape === "frame") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0020);
        c.strokeRect(px.x, px.y, px.w, px.h);
      } else {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0018);
        c.beginPath();
        c.moveTo(px.x, px.y + px.h / 2); c.lineTo(px.x + px.w, px.y + px.h / 2);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (L.kind === "wash") {
      var cl = colOf(L);
      c.save();
      if (L.shape === "vignette") {
        var g = c.createRadialGradient(px.x + px.w / 2, px.y + px.h / 2,
                 Math.min(px.w, px.h) * 0.20, px.x + px.w / 2, px.y + px.h / 2,
                 Math.max(px.w, px.h) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, cl);
        c.fillStyle = g; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "panel") {
        c.fillStyle = cl;
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.fill();
        c.globalAlpha = c.globalAlpha * 0.8;
        c.strokeStyle = P.gold; c.lineWidth = Math.max(1, s.U * 0.0014);
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.stroke();
      } else if (L.shape === "sweep") {
        var g2 = c.createLinearGradient(px.x, px.y, px.x + px.w, px.y + px.h);
        g2.addColorStop(0, cl); g2.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g2; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "disc") {
        c.fillStyle = cl;
        c.beginPath();
        c.arc(px.x + px.w / 2, px.y + px.h / 2, Math.min(px.w, px.h) / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = cl; c.fillRect(px.x, px.y, px.w, px.h);
      }
      c.restore();
      return;
    }

    if (L.kind === "band") {
      var head = expand(L.text, C) || s.headline || "";
      var sb = expand(L.sub, C) || s.sub || "";
      if (!head && !sb) return;
      c.save();
      c.strokeStyle = P.gold; c.globalAlpha = c.globalAlpha * 0.55;
      c.lineWidth = Math.max(1, s.U * 0.0016);
      c.beginPath();
      c.moveTo(px.x + px.w * 0.26, px.y); c.lineTo(px.x + px.w * 0.74, px.y);
      c.stroke(); c.restore();
      if (head)
        kit.txtFit(head, px.x + px.w / 2, px.y + px.h * 0.36, s.U * 0.040,
                   colOf(L), "center", 700, px.w * 0.96);
      if (sb)
        kit.txtFit(sb, px.x + px.w / 2, px.y + px.h * 0.76, s.U * 0.022,
                   P.dim, "center", 500, px.w * 0.96);
      return;
    }

    if (L.kind === "stamp") {
      var left = expand(L.text || "{date}  ·  {place}", C);
      kit.txtFit(left, px.x, px.y + px.h / 2, L.size * s.U, colOf(L),
                 "left", 500, px.w * 0.62);
      kit.txt(s.handle || "@Nirayana.Soft", px.x + px.w, px.y + px.h / 2,
              L.size * s.U, P.gold, "right", 600);
      return;
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function nameOf(L) {
    if (L.name) return L.name;
    if (L.kind === "view") {
      if (!L.sel.length) return "Empty view";
      var n = window.SPNodes.byId(L.sel[0]);
      return (n ? n.label : L.sel[0]) + (L.sel.length > 1 ? " +" + (L.sel.length - 1) : "");
    }
    return KINDS[L.kind] ? L.kind.charAt(0).toUpperCase() + L.kind.slice(1) : L.kind;
  }

  /* ---- the public render -------------------------------------------------- */
  /* `quiet` has the same meaning as in Auto mode: skip the bookkeeping only
     the side panels read. During playback the report is pure waste. */
  function render(C, p, quiet) {
    var s = S(), c = s.ctx, kit = K();
    if (!c) return null;
    var report = quiet ? null
      : { used: [], missing: [], empty: [], errors: [], layers: DOC.layers.length };

    /* the backdrop is the document's, not the stage's */
    if (DOC.bg.style === "none") {
      c.clearRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "flat") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "vignette") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
      var g = c.createRadialGradient(s.W / 2, s.H * 0.42, s.W * 0.10,
                                     s.W / 2, s.H * 0.42, s.W * 0.95);
      g.addColorStop(0, kit.pal().bg2); g.addColorStop(1, kit.pal().bg);
      c.fillStyle = g; c.fillRect(0, 0, s.W, s.H);
    } else {
      kit.background();
    }
    if (DOC.bg.stars && kit.pal().key !== "parchment") kit.stars();

    for (var i = 0; i < DOC.layers.length; i++)
      drawLayer(DOC.layers[i], C, p, report);

    kit.safeGuides();
    return report;
  }

  /* ---- the editing overlay ------------------------------------------------
     Drawn by the page after rendering and never by the recorder, which is why
     handles cannot appear in an export: the export path does not call this.
     On canvas rather than as DOM boxes over the preview, because a DOM
     overlay would have to be repositioned on every frame — exactly the forced
     layout per frame that made the panel stop responding when the animation
     ran. */
  function overlay(p) {
    var L = current(); if (!L) return;
    var s = S(), c = s.ctx;
    var u = windowU(L, p);
    var R = rectAt(L, u < 0 ? 0 : u), px = pxOf(R);
    var P = K().pal();
    c.save();
    c.setLineDash([Math.max(2, s.U * 0.008), Math.max(2, s.U * 0.006)]);
    c.strokeStyle = u < 0 ? P.mal : P.gold;
    c.lineWidth = Math.max(1, s.U * 0.0022);
    c.globalAlpha = 0.95;
    c.strokeRect(px.x, px.y, px.w, px.h);
    c.setLineDash([]);
    var hs = Math.max(6, s.U * 0.018);
    HANDLES.forEach(function (h) {
      var hx = px.x + px.w * h.fx, hy = px.y + px.h * h.fy;
      c.fillStyle = P.gold;
      c.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    });
    if (L.to) {
      var tp = pxOf(L.to);
      c.setLineDash([Math.max(2, s.U * 0.004), Math.max(2, s.U * 0.008)]);
      c.strokeStyle = P.ben; c.globalAlpha = 0.8;
      c.strokeRect(tp.x, tp.y, tp.w, tp.h);
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(px.x + px.w / 2, px.y + px.h / 2);
      c.lineTo(tp.x + tp.w / 2, tp.y + tp.h / 2);
      c.stroke();
    }
    if (u < 0) {
      c.globalAlpha = 1;
      K().txt("not on screen at this moment", px.x + px.w / 2,
              px.y + px.h / 2, s.U * 0.020, P.mal, "center", 600);
    }
    c.restore();
  }

  /* fx/fy are the handle's position in the rect; dx/dy which edges it moves */
  var HANDLES = [
    { k: "nw", fx: 0, fy: 0, l: 1, t: 1 }, { k: "n", fx: 0.5, fy: 0, t: 1 },
    { k: "ne", fx: 1, fy: 0, r: 1, t: 1 }, { k: "e", fx: 1, fy: 0.5, r: 1 },
    { k: "se", fx: 1, fy: 1, r: 1, b: 1 }, { k: "s", fx: 0.5, fy: 1, b: 1 },
    { k: "sw", fx: 0, fy: 1, l: 1, b: 1 }, { k: "w", fx: 0, fy: 0.5, l: 1 }
  ];

  /* ---- hit testing, in frame fractions ----------------------------------- */
  function hit(fx, fy, p, which) {
    var L = current();
    var tol = 0.032;
    if (L && !L.locked) {
      var u = windowU(L, p);
      var R = which === "to" && L.to ? L.to : rectAt(L, u < 0 ? 0 : u);
      for (var i = 0; i < HANDLES.length; i++) {
        var h = HANDLES[i];
        var hx = R.x + R.w * h.fx, hy = R.y + R.h * h.fy;
        if (Math.abs(fx - hx) < tol && Math.abs(fy - hy) < tol)
          return { id: L.id, mode: h.k, which: which || "rect" };
      }
      if (fx > R.x && fx < R.x + R.w && fy > R.y && fy < R.y + R.h)
        return { id: L.id, mode: "move", which: which || "rect" };
    }
    /* topmost visible layer under the point, so clicking a picture selects it */
    for (var j = DOC.layers.length - 1; j >= 0; j--) {
      var Q = DOC.layers[j];
      if (Q.hidden || Q.locked) continue;
      if (windowU(Q, p) < 0) continue;
      var r2 = rectAt(Q, windowU(Q, p));
      if (fx > r2.x && fx < r2.x + r2.w && fy > r2.y && fy < r2.y + r2.h)
        return { id: Q.id, mode: "pick", which: "rect" };
    }
    return null;
  }
  /* applies a drag; dx/dy are in frame fractions */
  function dragTo(grab, startRect, dx, dy, snap) {
    var L = byId(grab.id); if (!L || L.locked) return;
    var h = null;
    HANDLES.forEach(function (q) { if (q.k === grab.mode) h = q; });
    var R = { x: startRect.x, y: startRect.y, w: startRect.w, h: startRect.h };
    if (grab.mode === "move" || grab.mode === "pick") { R.x += dx; R.y += dy; }
    else if (h) {
      if (h.l) { R.x += dx; R.w -= dx; }
      if (h.r) { R.w += dx; }
      if (h.t) { R.y += dy; R.h -= dy; }
      if (h.b) { R.h += dy; }
    }
    if (R.w < 0.04) R.w = 0.04;
    if (R.h < 0.02) R.h = 0.02;
    if (snap) {
      var g = 1 / 24;
      R.x = Math.round(R.x / g) * g; R.y = Math.round(R.y / g) * g;
      R.w = Math.round(R.w / g) * g; R.h = Math.round(R.h / g) * g;
    }
    if (grab.which === "to") { L.to = R; } else { L.rect = R; }
  }

  /* ---- stack operations --------------------------------------------------- */
  function byId(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return DOC.layers[i];
    return null;
  }
  function indexOf(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return i;
    return -1;
  }
  function current() { return byId(PICK); }
  function add(o, where) {
    var L = layer(o);
    if (where === "bottom") DOC.layers.unshift(L);
    else DOC.layers.push(L);
    PICK = L.id;
    return L;
  }
  function remove(id) {
    var i = indexOf(id); if (i < 0) return;
    DOC.layers.splice(i, 1);
    if (PICK === id) PICK = DOC.layers.length ? DOC.layers[Math.min(i, DOC.layers.length - 1)].id : null;
  }
  function duplicate(id) {
    var L = byId(id); if (!L) return null;
    var copy = layer(JSON.parse(JSON.stringify(L)));
    copy.id = uid();
    copy.name = (L.name || nameOf(L)) + " copy";
    /* offset, so the copy is visibly a second object rather than appearing to
       have done nothing */
    copy.rect = { x: clamp(L.rect.x + 0.03, 0, 0.96), y: clamp(L.rect.y + 0.03, 0, 0.96),
                  w: L.rect.w, h: L.rect.h };
    DOC.layers.splice(indexOf(id) + 1, 0, copy);
    PICK = copy.id;
    return copy;
  }
  function move(id, delta) {
    var i = indexOf(id); if (i < 0) return;
    var j = clamp(i + delta, 0, DOC.layers.length - 1);
    if (j === i) return;
    var L = DOC.layers.splice(i, 1)[0];
    DOC.layers.splice(j, 0, L);
  }

  /* ---- saving ------------------------------------------------------------
     A composition is JSON, so it saves as text. Compositions live under their
     own key; nothing here touches the chart handoff key or the saved-chart
     format marker, which are load-bearing elsewhere. */
  var STORE = "nirayana.studio.compositions";
  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function save(name) {
    var list = readAll();
    var d = JSON.parse(JSON.stringify(DOC));
    d.name = name || DOC.name || "Untitled";
    d.savedAt = Date.now();
    var at = -1;
    list.forEach(function (q, i) { if (q.name === d.name) at = i; });
    if (at >= 0) list[at] = d; else list.push(d);
    DOC.name = d.name;
    return writeAll(list) ? d.name : null;
  }
  function load(name) {
    var list = readAll(), found = null;
    list.forEach(function (q) { if (q.name === name) found = q; });
    if (!found) return false;
    DOC = doc(found);
    DOC.on = true;
    DOC.name = found.name;
    PICK = DOC.layers.length ? DOC.layers[DOC.layers.length - 1].id : null;
    return true;
  }
  function drop(name) {
    writeAll(readAll().filter(function (q) { return q.name !== name; }));
  }

  /* ---- the reel's own length, for sequencing ----------------------------- */
  /* The last moment anything is on screen. A user who times a layer to end at
     0.6 and nothing after it has left a third of the reel empty, and the page
     should be able to say so. */
  function lastUsed() {
    var t = 0;
    DOC.layers.forEach(function (L) {
      if (L.hidden) return;
      t = Math.max(t, Math.max(L.t0, L.t1));
    });
    return t;
  }

  window.SPDirector = {
    EASE: EASE, ENTER: ENTER, EXIT: EXIT, IDLE: IDLE, KINDS: KINDS, COLS: COLS,
    ARRANGE: ARRANGE, SEQUENCE: SEQUENCE,
    doc: function () { return DOC; },
    on: function () { return !!DOC.on; },
    setOn: function (v) { DOC.on = !!v; },
    layer: layer, newDoc: function (o) { DOC = doc(o || { on: true }); PICK = null; return DOC; },
    build: build, groupsOf: groupsOf, arrange: arrange, sequence: sequence,
    stageRect: stageRect, bandRect: bandRect,
    render: render, overlay: overlay,
    /* Render somebody else's document without disturbing the one being
       edited — how a storyboard shot can be a Director scene. The swap is
       synchronous and restored in a finally, so a composer that throws
       mid-shot cannot leave the editor pointing at a saved document. */
    withDoc: function (d, fn) {
      var keep = DOC, keepPick = PICK;
      DOC = doc(d); DOC.on = true;
      try { return fn(); } finally { DOC = keep; PICK = keepPick; }
    },
    snapshot: function () { return JSON.parse(JSON.stringify(DOC)); },
    hit: hit, dragTo: dragTo, HANDLES: HANDLES,
    byId: byId, current: current, pick: function (id) { PICK = id; },
    picked: function () { return PICK; },
    add: add, remove: remove, duplicate: duplicate, move: move,
    nameOf: nameOf, windowU: windowU, rectAt: rectAt, expand: expand,
    tokens: tokenList, lastUsed: lastUsed,
    save: save, load: load, drop: drop, saved: readAll
  };
})();
