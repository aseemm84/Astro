/* ===== Director Pro — the workstation =====================================

   THE RULE THIS FILE IS WRITTEN UNDER, restated because it is the one that
   was learned the hard way: NOTHING ON THE FRAME PATH TOUCHES THE DOM. A
   panel rebuild is an innerHTML churn and a forced layout; doing it sixty
   times a second on a page this size blocks the main thread in quarter-second
   chunks, and the symptom is not "it feels slow", it is that buttons stop
   responding entirely because the taps never become clicks. So:

     tick()      → sets the playhead, draws the canvas, and writes at most two
                   single attributes a few times a second
     change()    → the document changed: redraw once, rebuild the parts of the
                   panel that are now wrong
     refreshAll()→ everything, on load and on a document swap

   UNDO IS SNAPSHOTS, NOT COMMANDS. A command stack is better in every way
   except the one that matters here: every one of forty operations would have
   to implement its own inverse correctly, and the first one that did not
   would corrupt a document silently. A document is a few tens of kilobytes of
   JSON; fifty snapshots is a megabyte and nobody notices. Correctness beats
   elegance when the failure mode is losing somebody's work.

   THE TIMELINE IS THE DOCUMENT. Scenes along the top, one row per layer, and
   under an opened layer one row per animated property with a diamond at each
   key. That is the whole model made visible — if a thing moves, there is a
   diamond that says why, and dragging it is how you change it. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  var M = null, R = null;

  /* ---- state ------------------------------------------------------------- */
  var DOC = null;
  var C = null;                 /* the astronomical context */
  var PLACE = null;
  var PICK = null;              /* picked layer id */
  var SCENE = 0;                /* the scene being edited */
  var T = 0;                    /* playhead, seconds into the reel */
  var PLAY = false, RAF = null, T0 = 0;
  var OPEN = {};                /* which layers show their property rows */
  var UNDO = [], REDO = [];
  var DRAG = null;
  var LAST = null;
  var SNAP = true;

  /* ================= context ============================================== */
  function readBirth() {
    try {
      var b = JSON.parse(localStorage.getItem("nirayana.birth") || "null");
      return (b && b.lat != null) ? b : null;
    } catch (e) { return null; }
  }
  function defaultPlace(b) {
    if (PLACE) return PLACE;
    try {
      if (window.NP && window.NP.savedPlace) {
        var s = window.NP.savedPlace();
        if (s && s.lat != null) return { n: s.n || s.name || "saved place",
          lat: s.lat, lon: s.lon, tz: s.tz };
      }
    } catch (e) {}
    if (b && b.lat != null)
      return { n: b.place || b.name || "your chart's place", lat: b.lat,
               lon: b.lon, tz: b.tzHours };
    return { n: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 };
  }
  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = defaultPlace(b);
    var when = whenMs || (C ? C.when : Date.now());
    var day = null;
    try { if (window.NP && window.NP.day) day = window.NP.day(when, place); }
    catch (e) {}
    var sp = $("dp-span");
    return { J: J, when: when, place: place, day: day,
             spanDays: sp ? +sp.value : 365, birth: b };
  }

  /* ================= undo ================================================== */
  function snapshot() { return JSON.stringify(DOC); }
  function mark() {
    UNDO.push(snapshot());
    if (UNDO.length > 60) UNDO.shift();
    REDO.length = 0;
    syncUndo();
  }
  function undo() {
    if (!UNDO.length) return;
    REDO.push(snapshot());
    DOC = M.doc(JSON.parse(UNDO.pop()));
    rebindMedia();
    refreshAll();
  }
  function redo() {
    if (!REDO.length) return;
    UNDO.push(snapshot());
    DOC = M.doc(JSON.parse(REDO.pop()));
    rebindMedia();
    refreshAll();
  }
  function syncUndo() {
    var u = $("dp-undo"), r = $("dp-redo");
    if (u) u.disabled = !UNDO.length;
    if (r) r.disabled = !REDO.length;
  }
  /* An audio element and an Image are live objects; JSON.stringify drops
     them, which is right — they are not the document. After a snapshot round
     trip the references have to be put back from the object URLs the page
     still holds, or an undo would silently detach the soundtrack. */
  var MEDIA = { audioEl: null, audioName: null, images: {} };
  function rebindMedia() {
    if (DOC.audio && MEDIA.audioEl) DOC.audio.__el = MEDIA.audioEl;
    DOC.scenes.forEach(function (s) {
      s.layers.forEach(function (L) {
        if (L.kind === "image" && L.src && L.src.id && MEDIA.images[L.src.id])
          L.src.__img = MEDIA.images[L.src.id];
      });
    });
  }

  /* ================= drawing =============================================== */
  /* the frame path — canvas only */
  function drawFrame() {
    if (!R || !DOC || !C) return;
    LAST = R.render(DOC, C, T, true);
    R.overlay(DOC, T, PICK);
  }
  function draw() {
    if (!R || !DOC || !C) return;
    LAST = R.render(DOC, C, T, false);
    R.overlay(DOC, T, PICK);
  }
  function change(deep) {
    draw();
    if (deep) { stack(); scenes(); }
    timeline(); inspector(); status();
    persist();
  }
  function refreshAll() {
    fitStage();
    draw();
    topbar(); scenes(); stack(); timeline(); inspector(); status(); syncUndo();
  }

  /* ================= the stage ============================================= */
  function fitStage() {
    var box = $("dp-stagebox"), cv = $("dp-canvas");
    if (!box || !cv || !R) return;
    var F = M.FORMATS[DOC.format] || M.FORMATS.reel;
    var bw = box.clientWidth || 360;
    var bh = box.clientHeight || 640;
    var scale = Math.min(bw / F.w, bh / F.h);
    var w = Math.max(80, Math.floor(F.w * scale));
    var h = Math.max(80, Math.floor(F.h * scale));
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    /* render at about the size it is shown at, never at export size — the
       preview of a 4K reel at 4K is sixteen times the pixels anyone can see */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var want = clamp((w * dpr) / F.w, 0.2, 1);
    if (Math.abs(want - R.S.quality) > 0.04) {
      R.S.quality = want;
      R.resize(DOC);
    }
  }

  /* ================= the top bar =========================================== */
  function topbar() {
    var host = $("dp-top");
    if (!host) return;
    host.innerHTML = "";
    var nm = el("input", "dptitle");
    nm.type = "text"; nm.value = DOC.name;
    nm.setAttribute("aria-label", "The name of this reel");
    nm.addEventListener("change", function () { DOC.name = nm.value; persist(); });
    host.appendChild(nm);

    function pick(label, opts, value, onSet, cls) {
      var w = el("label", "dpfield" + (cls ? " " + cls : ""));
      w.appendChild(el("span", null, label));
      var s = el("select");
      opts.forEach(function (o) {
        var op = el("option", null, o.label);
        op.value = o.v;
        if (String(o.v) === String(value)) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener("change", function () { onSet(s.value); });
      w.appendChild(s);
      host.appendChild(w);
      return s;
    }
    pick("Format", Object.keys(M.FORMATS).map(function (k) {
      return { v: k, label: M.FORMATS[k].label }; }), DOC.format, function (v) {
      mark(); DOC.format = v; R.resize(DOC); refreshAll(); });
    pick("Frames", [{ v: 24, label: "24 fps" }, { v: 25, label: "25 fps" },
                    { v: 30, label: "30 fps" }, { v: 50, label: "50 fps" },
                    { v: 60, label: "60 fps" }], DOC.fps, function (v) {
      DOC.fps = +v; persist(); status(); });
    pick("Guides", Object.keys(M.SAFE).map(function (k) {
      return { v: k, label: M.SAFE[k].label }; }), DOC.safe, function (v) {
      DOC.safe = v; change(); });
    pick("Palette", Object.keys(window.SPStage.PALS).map(function (k) {
      return { v: k, label: window.SPStage.PALS[k].label }; }), DOC.pal,
      function (v) { mark(); DOC.pal = v; change(true); });

    var g = el("label", "dpcheck"), gi = el("input");
    gi.type = "checkbox"; gi.checked = R.S.showGrid;
    gi.addEventListener("change", function () { R.S.showGrid = gi.checked; draw(); });
    g.appendChild(gi); g.appendChild(document.createTextNode(" grid"));
    host.appendChild(g);

    var sn = el("label", "dpcheck"), si = el("input");
    si.type = "checkbox"; si.checked = SNAP;
    si.addEventListener("change", function () { SNAP = si.checked; });
    sn.appendChild(si); sn.appendChild(document.createTextNode(" snap"));
    host.appendChild(sn);

    var sp = el("span", "dpspacer");
    host.appendChild(sp);

    var u = el("button", "dpbtn", "↶"); u.type = "button"; u.id = "dp-undo";
    u.title = "Undo"; u.addEventListener("click", undo);
    var r = el("button", "dpbtn", "↷"); r.type = "button"; r.id = "dp-redo";
    r.title = "Redo"; r.addEventListener("click", redo);
    host.appendChild(u); host.appendChild(r);
    syncUndo();
  }

  /* ================= the scene strip ======================================= */
  function scenes() {
    var host = $("dp-scenes");
    if (!host) return;
    host.innerHTML = "";
    DOC.scenes.forEach(function (s, i) {
      var b = el("div", "dpscene" + (i === SCENE ? " on" : ""));
      var cv = el("canvas", "dpthumb");
      cv.width = 72; cv.height = Math.round(72 * (M.FORMATS[DOC.format].h /
                                                  M.FORMATS[DOC.format].w));
      b.appendChild(cv);
      try { R.renderTo(cv, cv.width, cv.height, DOC, C, M.sceneStart(DOC, i) + s.seconds * 0.6); }
      catch (e) {}
      var meta = el("div", "dpscenemeta");
      meta.appendChild(el("b", null, s.name));
      meta.appendChild(el("span", null, s.seconds.toFixed(1) + " s · " +
                          s.layers.length + " layers"));
      meta.appendChild(el("span", "dptrans",
        (M.TRANSITIONS[s.trans.k] || { label: "Cut" }).label +
        (i === DOC.scenes.length - 1 ? " (last)" : "")));
      b.appendChild(meta);
      b.addEventListener("click", function () {
        SCENE = i;
        T = M.sceneStart(DOC, i) + 0.001;
        PICK = null;
        refreshAll();
      });
      host.appendChild(b);
    });
    var add = el("button", "dpaddscene", "+ scene");
    add.type = "button";
    add.addEventListener("click", function () {
      mark();
      DOC.scenes.push(M.scene({ name: "Scene " + (DOC.scenes.length + 1) }));
      SCENE = DOC.scenes.length - 1;
      T = M.sceneStart(DOC, SCENE) + 0.001;
      refreshAll();
    });
    host.appendChild(add);
  }

  /* ================= the layer stack ======================================= */
  function cur() { return DOC.scenes[SCENE]; }
  function curLayer() {
    if (!PICK) return null;
    var f = M.findLayer(DOC, PICK);
    return f ? f.layer : null;
  }

  function stack() {
    var host = $("dp-stack");
    if (!host) return;
    host.innerHTML = "";
    var s = cur();
    if (!s) return;
    if (!s.layers.length) {
      host.appendChild(el("p", "dpempty", "No layers in this scene yet."));
      return;
    }
    for (var i = s.layers.length - 1; i >= 0; i--) {
      (function (L) {
        var row = el("div", "dplayer" + (L.id === PICK ? " on" : "") +
                              (L.hidden ? " off" : ""));
        function mini(txt, title, on, fn) {
          var b = el("button", "dpmini" + (on ? " on" : ""), txt);
          b.type = "button"; b.title = title;
          b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
          row.appendChild(b);
          return b;
        }
        mini(L.hidden ? "◻" : "◼", L.hidden ? "Hidden" : "Visible", false,
             function () { mark(); L.hidden = !L.hidden; change(true); });
        mini("S", "Solo — show only the soloed layers", L.solo,
             function () { mark(); L.solo = !L.solo; change(true); });
        mini(L.locked ? "🔒" : "🔓", L.locked ? "Locked" : "Unlocked", L.locked,
             function () { mark(); L.locked = !L.locked; change(true); });
        var nm = el("button", "dpname");
        nm.type = "button";
        nm.appendChild(el("span", "dpkind", L.kind));
        nm.appendChild(el("span", "dpnametxt", R.nameOf(L)));
        nm.addEventListener("click", function () { PICK = L.id; change(true); });
        row.appendChild(nm);
        mini("↑", "Bring forward", false, function () { moveLayer(L.id, 1); });
        mini("↓", "Send back", false, function () { moveLayer(L.id, -1); });
        mini("⧉", "Duplicate", false, function () { dupLayer(L.id); });
        mini("×", "Delete", false, function () { delLayer(L.id); });
        host.appendChild(row);
      })(s.layers[i]);
    }
  }
  function moveLayer(id, d) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    var j = clamp(f.li + d, 0, f.scene.layers.length - 1);
    if (j === f.li) { UNDO.pop(); return; }
    var L = f.scene.layers.splice(f.li, 1)[0];
    f.scene.layers.splice(j, 0, L);
    change(true);
  }
  function dupLayer(id) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    var copy = M.layer(JSON.parse(JSON.stringify(f.layer)));
    copy.id = M.uid("L");
    copy.name = (f.layer.name || R.nameOf(f.layer)) + " copy";
    copy.base.x += 3; copy.base.y += 3;
    f.scene.layers.splice(f.li + 1, 0, copy);
    PICK = copy.id;
    change(true);
  }
  function delLayer(id) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    f.scene.layers.splice(f.li, 1);
    if (PICK === id) PICK = null;
    change(true);
  }
  function addLayer(o, quiet) {
    mark();
    var s = cur();
    var L = M.layer(o);
    if (L.t1 === 0) L.t1 = s.seconds;
    s.layers.push(L);
    PICK = L.id;
    if (!quiet) change(true);
    return L;
  }

  /* ================= adding things ========================================= */
  function addBar() {
    var host = $("dp-add");
    if (!host) return;
    host.innerHTML = "";
    function b(label, fn, title) {
      var x = el("button", "dpbtn", label);
      x.type = "button";
      if (title) x.title = title;
      x.addEventListener("click", fn);
      host.appendChild(x);
    }
    b("+ View", function () {
      var sel = pickedNodes();
      if (!sel.length) { flash("Choose something in the library first."); return; }
      addLayer({ kind: "view", sel: sel, base: { x: 8, y: 16, w: 84, h: 46 } });
      var L = curLayer();
      M.applyEntry(L, cur(), "rise", 0.6);
      change(true);
    }, "The chosen nodes, drawn by the best composer for them");
    b("+ Text", function () {
      addLayer({ kind: "text", text: "Your line here", size: 0.044, lines: 2,
                 col: "ink", animator: "charRise", animSeconds: 1.0,
                 base: { x: 8, y: 68, w: 84, h: 12 } });
      change(true);
    });
    b("+ Band", function () {
      addLayer({ kind: "band", text: "{tithi}", sub: "{naks}  ·  {place}",
                 col: "gold", animator: "wordFade", animSeconds: 0.9,
                 base: { x: 8, y: 76, w: 84, h: 11 } });
      change(true);
    });
    b("+ Stamp", function () {
      addLayer({ kind: "stamp", text: "{date}  ·  {place}", size: 0.019,
                 col: "dim", base: { x: 8, y: 92, w: 84, h: 4 } });
      change(true);
    });
    b("+ Shape", function () {
      addLayer({ kind: "shape", shape: "ring", col: "gold",
                 base: { x: 20, y: 28, w: 60, h: 34 } });
      change(true);
    });
    b("+ Rule", function () {
      addLayer({ kind: "rule", shape: "line", col: "gold",
                 base: { x: 30, y: 30, w: 40, h: 0.4 } });
      change(true);
    });
    b("+ Wash", function () {
      addLayer({ kind: "wash", shape: "panel", col: "line",
                 base: { x: 6, y: 12, w: 88, h: 60, opacity: 0.35 } });
      change(true);
    });
  }

  /* ================= the node library ====================================== */
  var LIBSEL = [];
  function pickedNodes() { return LIBSEL.slice(); }
  function library() {
    var host = $("dp-lib");
    if (!host) return;
    var q = ($("dp-libsearch") || {}).value || "";
    var only = ($("dp-liblive") || {}).checked;
    q = q.toLowerCase().trim();
    host.innerHTML = "";
    var doms = {}, shown = 0;
    window.SPNodes.all().forEach(function (n) {
      var hay = (n.label + " " + n.dom + " " + n.id + " " + (n.blurb || "")).toLowerCase();
      if (q && hay.indexOf(q) < 0) return;
      var v = window.SPNodes.resolve(n, C);
      if (only && !v) return;
      (doms[n.dom] = doms[n.dom] || []).push({ n: n, live: !!v });
      shown++;
    });
    Object.keys(doms).forEach(function (d) {
      var g = el("div", "dplibgroup");
      g.appendChild(el("h5", null, d));
      var wrap = el("div", "dplibchips");
      doms[d].forEach(function (q2) {
        var c = el("button", "dpchip" + (LIBSEL.indexOf(q2.n.id) >= 0 ? " on" : "") +
                               (q2.live ? "" : " off"), q2.n.label);
        c.type = "button";
        c.title = q2.n.blurb || q2.n.label;
        c.addEventListener("click", function () {
          var i = LIBSEL.indexOf(q2.n.id);
          if (i >= 0) LIBSEL.splice(i, 1); else LIBSEL.push(q2.n.id);
          library();
          var L = curLayer();
          if (L && L.kind === "view" && $("dp-liblink").checked) {
            mark(); L.sel = LIBSEL.slice(); change(true);
          }
          libStat();
        });
        wrap.appendChild(c);
      });
      g.appendChild(wrap);
      host.appendChild(g);
    });
    libStat(shown);
  }
  function libStat(shown) {
    var s = $("dp-libstat");
    if (!s) return;
    s.textContent = LIBSEL.length + " chosen" +
      (shown != null ? "  ·  " + shown + " shown" : "");
  }

  /* ================= the inspector ========================================= */
  function field(host, label, node) {
    var r = el("div", "dprow");
    r.appendChild(el("span", "dplab", label));
    r.appendChild(node);
    host.appendChild(r);
    return r;
  }
  function selectEl(opts, value, onSet) {
    var s = el("select");
    opts.forEach(function (o) {
      var op = el("option", null, o.label);
      op.value = o.v;
      if (String(o.v) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onSet(s.value); });
    return s;
  }
  function numEl(value, min, max, step, onSet) {
    var i = el("input");
    i.type = "number"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.addEventListener("change", function () {
      var v = parseFloat(i.value);
      if (!isNaN(v)) onSet(clamp(v, min, max));
    });
    return i;
  }
  function textEl(value, onSet, place) {
    var i = el("input");
    i.type = "text"; i.value = value || "";
    if (place) i.placeholder = place;
    i.addEventListener("input", function () { onSet(i.value); });
    return i;
  }

  /* A property row: the stopwatch, the slider, the number, and the key
     navigation. The stopwatch is the whole idea of a keyframe tool in one
     control — off, the value is constant; on, the value at this instant
     becomes a key and every later change writes another. */
  function propRow(host, L, k) {
    var P = M.PROPS[k];
    var s = cur(), lt = localT();
    var tr = L.tracks[k];
    var animated = tr.length > 0;
    var v = M.valueOf(L, k, lt);
    var row = el("div", "dpprop" + (animated ? " anim" : ""));

    var sw = el("button", "dpstop" + (animated ? " on" : ""), animated ? "◆" : "◇");
    sw.type = "button";
    sw.title = animated ? "Animated — click to remove every key on this property"
                        : "Click to animate this property from here";
    sw.addEventListener("click", function () {
      mark();
      if (animated) { L.tracks[k] = []; L.base[k] = v; }
      else { M.setKey(L.tracks[k], lt, v, "smooth"); }
      change(true);
    });
    row.appendChild(sw);
    row.appendChild(el("span", "dpproplab", P.label));

    var sl = el("input", "dpslider");
    sl.type = "range"; sl.min = P.min; sl.max = P.max; sl.step = P.step;
    sl.value = v;
    var nm = numEl(round(v, 2), P.min, P.max, P.step, function (x) { set(x); });
    nm.className = "dppropnum";
    function set(x) {
      if (!L.tracks[k].length) L.base[k] = x;
      else M.setKey(L.tracks[k], lt, x, "smooth");
      sl.value = x; nm.value = round(x, 2);
      draw();
      scheduleTimeline();
    }
    sl.addEventListener("input", function () { set(parseFloat(sl.value)); });
    sl.addEventListener("pointerdown", function () { mark(); });
    row.appendChild(sl);
    row.appendChild(nm);
    if (P.unit) row.appendChild(el("span", "dpunit", P.unit));

    if (animated) {
      var kb = el("button", "dpmini", "+");
      kb.type = "button"; kb.title = "Key this value at the playhead";
      kb.addEventListener("click", function () {
        mark(); M.setKey(L.tracks[k], lt, v, "smooth"); change(true); });
      row.appendChild(kb);
    }
    host.appendChild(row);
  }
  function round(v, n) {
    var p = Math.pow(10, n);
    return Math.round(v * p) / p;
  }
  /* the playhead within the current scene */
  function localT() {
    var at = M.sceneAt(DOC, T);
    if (!at) return 0;
    if (at.i !== SCENE) return clamp(T - M.sceneStart(DOC, SCENE), 0, cur().seconds);
    return at.local;
  }

  function inspector() {
    var host = $("dp-insp");
    if (!host) return;
    host.innerHTML = "";
    var s = cur();
    var L = curLayer();

    /* --- the scene, always --- */
    var sh = el("div", "dpsec");
    sh.appendChild(el("h4", null, "Scene " + (SCENE + 1)));
    host.appendChild(sh);
    field(host, "Name", textEl(s.name, function (v) { s.name = v; scenes(); persist(); }));
    field(host, "Length", numEl(s.seconds, 0.3, 300, 0.1, function (v) {
      mark(); s.seconds = v; change(true); }));
    field(host, "Backdrop", selectEl(
      [["gradient", "Gradient"], ["radial", "Radial"], ["flat", "Flat"],
       ["vignette", "Vignette"], ["none", "Transparent"]].map(function (q) {
         return { v: q[0], label: q[1] }; }), s.bg.style,
      function (v) { mark(); s.bg.style = v; change(true); }));
    var stc = el("label", "dpcheck"), sti = el("input");
    sti.type = "checkbox"; sti.checked = s.bg.stars;
    sti.addEventListener("change", function () { s.bg.stars = sti.checked; change(); });
    stc.appendChild(sti); stc.appendChild(document.createTextNode(" star field"));
    host.appendChild(stc);
    if (SCENE < DOC.scenes.length - 1) {
      field(host, "Into the next", selectEl(Object.keys(M.TRANSITIONS).map(function (k) {
        return { v: k, label: M.TRANSITIONS[k].label }; }), s.trans.k,
        function (v) { mark(); s.trans.k = v;
          s.trans.seconds = M.TRANSITIONS[v].seconds; change(true); }));
      if (s.trans.k !== "cut")
        field(host, "Over", numEl(s.trans.seconds, 0.05, 4, 0.05, function (v) {
          mark(); s.trans.seconds = v; change(true); }));
    }
    /* the camera, which is a scene property and not a layer one */
    var ch = el("div", "dpsec");
    ch.appendChild(el("h4", null, "Camera"));
    host.appendChild(ch);
    ["zoom", "panX", "panY", "rot"].forEach(function (k) {
      var lim = k === "zoom" ? [0.2, 4, 0.01] : (k === "rot" ? [-180, 180, 0.5] : [-60, 60, 0.5]);
      var lt = localT();
      var val = M.sample(s.camera.tracks[k], lt, s.camera.base[k]);
      var row = el("div", "dpprop" + (s.camera.tracks[k].length ? " anim" : ""));
      var sw = el("button", "dpstop" + (s.camera.tracks[k].length ? " on" : ""),
                  s.camera.tracks[k].length ? "◆" : "◇");
      sw.type = "button";
      sw.title = "Animate the camera";
      sw.addEventListener("click", function () {
        mark();
        if (s.camera.tracks[k].length) { s.camera.tracks[k] = []; s.camera.base[k] = val; }
        else M.setKey(s.camera.tracks[k], lt, val, "inOut");
        change(true);
      });
      row.appendChild(sw);
      row.appendChild(el("span", "dpproplab",
        k === "zoom" ? "Zoom" : k === "rot" ? "Roll" :
        (k === "panX" ? "Pan X" : "Pan Y")));
      var sl = el("input", "dpslider");
      sl.type = "range"; sl.min = lim[0]; sl.max = lim[1]; sl.step = lim[2];
      sl.value = val;
      sl.addEventListener("pointerdown", function () { mark(); });
      sl.addEventListener("input", function () {
        var x = parseFloat(sl.value);
        if (!s.camera.tracks[k].length) s.camera.base[k] = x;
        else M.setKey(s.camera.tracks[k], lt, x, "inOut");
        draw(); scheduleTimeline();
      });
      row.appendChild(sl);
      host.appendChild(row);
    });

    if (!L) {
      host.appendChild(el("p", "dpempty",
        "Pick a layer on the stage or in the stack to edit it."));
      return;
    }

    /* --- the layer --- */
    var lh = el("div", "dpsec");
    lh.appendChild(el("h4", null, R.nameOf(L)));
    lh.appendChild(el("span", "dpkind", L.kind));
    host.appendChild(lh);
    field(host, "Name", textEl(L.name, function (v) { L.name = v; stack(); persist(); },
                               R.nameOf(L)));

    /* content, by kind */
    if (L.kind === "view") {
      var tray = el("div", "dpchips");
      L.sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        var c = el("button", "dpchip on", n ? n.label : id);
        c.type = "button"; c.title = "Remove from this layer";
        c.addEventListener("click", function () {
          mark();
          L.sel = L.sel.filter(function (q) { return q !== id; });
          change(true);
        });
        tray.appendChild(c);
      });
      if (!L.sel.length) tray.appendChild(el("span", "dpempty", "no nodes"));
      host.appendChild(tray);
      var ar = el("div", "dprow");
      var b1 = el("button", "dpbtn", "Use the library choice");
      b1.type = "button";
      b1.addEventListener("click", function () {
        if (!LIBSEL.length) { flash("Nothing chosen in the library."); return; }
        mark(); L.sel = LIBSEL.slice(); change(true);
      });
      ar.appendChild(b1);
      host.appendChild(ar);
      var B = window.SPStage.bagOf(L.sel, C);
      var fits = window.SPStage.options(B.bag);
      var list = [{ v: "", label: "Best fit" + (fits.length ? " — " + fits[0].label : "") }];
      window.SPStage.composers().forEach(function (K) {
        var ok = fits.some(function (f) { return f.key === K.key; });
        list.push({ v: K.key, label: K.label + (ok ? "" : "  (cannot draw this)") });
      });
      field(host, "Drawn as", selectEl(list, L.force || "", function (v) {
        mark(); L.force = v || null; change(true); }));
      field(host, "Its own playhead", selectEl(
        [{ v: "layer", label: "Runs over the layer" },
         { v: "reel", label: "Runs over the scene" },
         { v: "loop", label: "Loops" },
         { v: "frozen", label: "Held" }], L.clock,
        function (v) { mark(); L.clock = v; change(true); }));
    }
    if (L.kind === "text" || L.kind === "band" || L.kind === "stamp") {
      field(host, L.kind === "band" ? "Headline" : "Text",
            textEl(L.text, function (v) { L.text = v; change(); }));
      if (L.kind === "band")
        field(host, "Sub-line", textEl(L.sub, function (v) { L.sub = v; change(); }));
      var tk = el("p", "dptok");
      (window.SPDirector ? window.SPDirector.tokens() : []).forEach(function (t) {
        var a = el("button", "dptokb", t);
        a.type = "button"; a.title = "Insert " + t + " — resolved when the frame is drawn";
        a.addEventListener("click", function () { L.text = (L.text || "") + t; change(true); });
        tk.appendChild(a);
      });
      host.appendChild(tk);
      field(host, "Arrives", selectEl(Object.keys(R.ANIMATORS).map(function (k) {
        return { v: k, label: R.ANIMATORS[k].label }; }), L.animator,
        function (v) { mark(); L.animator = v; change(true); }));
      field(host, "Over", numEl(L.animSeconds, 0, 8, 0.05, function (v) {
        L.animSeconds = v; change(); }));
      if (L.kind !== "band") {
        field(host, "Size", numEl(round(L.size * 1000, 0), 4, 220, 1, function (v) {
          L.size = v / 1000; change(); }));
        field(host, "Tracking", numEl(round(L.tracking * 100, 0), -20, 120, 1,
          function (v) { L.tracking = v / 100; change(); }));
      }
      if (L.kind === "text") {
        field(host, "Lines", numEl(L.lines, 1, 10, 1, function (v) { L.lines = v; change(); }));
        field(host, "Line height", numEl(round(L.lineHeight, 2), 0.8, 2.4, 0.02,
          function (v) { L.lineHeight = v; change(); }));
        field(host, "Align", selectEl([{ v: "left", label: "Left" },
          { v: "center", label: "Centre" }, { v: "right", label: "Right" }],
          L.align, function (v) { L.align = v; change(); }));
        field(host, "Vertical", selectEl([{ v: "top", label: "Top" },
          { v: "middle", label: "Middle" }, { v: "bottom", label: "Bottom" }],
          L.valign, function (v) { L.valign = v; change(); }));
        field(host, "Weight", selectEl([400, 500, 600, 700, 800, 900].map(function (w) {
          return { v: w, label: String(w) }; }), L.weight,
          function (v) { L.weight = +v; change(); }));
      }
    }
    if (L.kind === "shape" || L.kind === "rule" || L.kind === "wash") {
      var shapes = L.kind === "shape"
        ? [["ring", "Ring"], ["disc", "Disc"], ["poly", "Polygon"], ["star", "Star"]]
        : L.kind === "rule"
        ? [["line", "Hairline"], ["bar", "Bar"], ["double", "Two rules"],
           ["frame", "Box"], ["round", "Rounded box"]]
        : [["flat", "Flat"], ["panel", "Panel"], ["vignette", "Vignette"],
           ["sweep", "Gradient across"], ["sweepV", "Gradient down"], ["disc", "Disc"]];
      field(host, "Shape", selectEl(shapes.map(function (q) {
        return { v: q[0], label: q[1] }; }), L.shape,
        function (v) { mark(); L.shape = v; change(true); }));
      if (L.kind === "shape" && (L.shape === "poly" || L.shape === "star"))
        field(host, "Points", numEl(L.sides, 3, 24, 1, function (v) {
          L.sides = v; change(); }));
    }
    if (L.kind !== "view") {
      field(host, "Colour", selectEl(
        ["ink", "gold", "dim", "ben", "mal", "line", "bg", "star", "custom"]
          .map(function (k) { return { v: k, label: k === "custom" ? "Custom…" : k }; }),
        L.col, function (v) { mark(); L.col = v; change(true); }));
      if (L.col === "custom") {
        var ci = el("input");
        ci.type = "color"; ci.value = L.hex;
        ci.addEventListener("input", function () { L.hex = ci.value; change(); });
        field(host, "Hex", ci);
      }
    }

    /* timing */
    var th = el("div", "dpsec");
    th.appendChild(el("h4", null, "Timing"));
    host.appendChild(th);
    var w = M.windowOf(L, s);
    field(host, "In", numEl(round(w.a, 2), 0, s.seconds, 0.05, function (v) {
      mark(); L.t0 = v; if (L.t1 && L.t1 < v) L.t1 = Math.min(s.seconds, v + 0.3);
      change(true); }));
    field(host, "Out", numEl(round(w.b, 2), 0, s.seconds, 0.05, function (v) {
      mark(); L.t1 = v; if (v < L.t0) L.t0 = Math.max(0, v - 0.3); change(true); }));

    /* presets, which bake */
    var ph = el("div", "dpsec");
    ph.appendChild(el("h4", null, "Motion presets"));
    ph.appendChild(el("span", "dphint", "each one writes keyframes you can then edit"));
    host.appendChild(ph);
    var entSel = selectEl(Object.keys(M.ENTRIES).map(function (k) {
      return { v: k, label: M.ENTRIES[k].label }; }), L.entryName || "none",
      function () {});
    var entLen = numEl(L.entrySeconds || 0.6, 0.05, 8, 0.05, function () {});
    var er = el("div", "dprow");
    er.appendChild(el("span", "dplab", "Entry"));
    er.appendChild(entSel); er.appendChild(entLen);
    var eb = el("button", "dpbtn", "Apply");
    eb.type = "button";
    eb.addEventListener("click", function () {
      mark();
      M.applyEntry(L, s, entSel.value, parseFloat(entLen.value) || 0.6);
      change(true);
    });
    er.appendChild(eb);
    host.appendChild(er);

    var exSel = selectEl(Object.keys(M.EXITS).map(function (k) {
      return { v: k, label: M.EXITS[k].label }; }), L.exitName || "none", function () {});
    var exLen = numEl(L.exitSeconds || 0.5, 0.05, 8, 0.05, function () {});
    var xr = el("div", "dprow");
    xr.appendChild(el("span", "dplab", "Exit"));
    xr.appendChild(exSel); xr.appendChild(exLen);
    var xb = el("button", "dpbtn", "Apply");
    xb.type = "button";
    xb.addEventListener("click", function () {
      mark();
      M.applyExit(L, s, exSel.value, parseFloat(exLen.value) || 0.5);
      change(true);
    });
    xr.appendChild(xb);
    host.appendChild(xr);

    var idSel = selectEl(Object.keys(M.IDLES).map(function (k) {
      return { v: k, label: M.IDLES[k].label }; }), L.idleName || "none", function () {});
    var idAmt = numEl(1, 0, 4, 0.1, function () {});
    var ir = el("div", "dprow");
    ir.appendChild(el("span", "dplab", "Throughout"));
    ir.appendChild(idSel); ir.appendChild(idAmt);
    var ib = el("button", "dpbtn", "Apply");
    ib.type = "button";
    ib.addEventListener("click", function () {
      mark();
      M.applyIdle(L, s, idSel.value, parseFloat(idAmt.value) || 1, 1);
      change(true);
    });
    ir.appendChild(ib);
    host.appendChild(ir);

    /* every animatable property */
    var pr = el("div", "dpsec");
    pr.appendChild(el("h4", null, "Properties"));
    pr.appendChild(el("span", "dphint", "◇ turns a property into an animated one"));
    host.appendChild(pr);
    var groups = [["Transform", ["x", "y", "w", "h", "scale", "rot", "skewX", "skewY"]],
                  ["Appearance", ["opacity", "reveal", "blur", "glow", "chroma"]],
                  ["Colour", ["bright", "contrast", "sat", "hue", "grain"]]];
    if (L.kind === "view") groups.push(["The drawing", ["inner"]]);
    groups.forEach(function (g) {
      host.appendChild(el("h5", "dpsub", g[0]));
      g[1].forEach(function (k) { propRow(host, L, k); });
    });

    /* blend, clip, mask */
    var bh = el("div", "dpsec");
    bh.appendChild(el("h4", null, "Compositing"));
    host.appendChild(bh);
    field(host, "Blend", selectEl(M.BLENDS.map(function (b) {
      return { v: b, label: M.BLEND_LABEL[b] }; }), L.blend,
      function (v) { mark(); L.blend = v; change(true); }));
    var cc = el("label", "dpcheck"), cci = el("input");
    cci.type = "checkbox"; cci.checked = L.clip;
    cci.addEventListener("change", function () { mark(); L.clip = cci.checked; change(); });
    cc.appendChild(cci);
    cc.appendChild(document.createTextNode(" clip to the box"));
    host.appendChild(cc);

    var mr = el("div", "dprow");
    mr.appendChild(el("span", "dplab", "Mask"));
    if (!L.mask) {
      var mb = el("button", "dpbtn", "Add a mask");
      mb.type = "button";
      mb.addEventListener("click", function () {
        mark();
        L.mask = { shape: "ellipse", x: 0.15, y: 0.2, w: 0.7, h: 0.5,
                   feather: 0.2, invert: false, rot: 0 };
        change(true);
      });
      mr.appendChild(mb);
      host.appendChild(mr);
    } else {
      var rb = el("button", "dpbtn", "Remove");
      rb.type = "button";
      rb.addEventListener("click", function () { mark(); L.mask = null; change(true); });
      mr.appendChild(rb);
      host.appendChild(mr);
      field(host, "Shape", selectEl([{ v: "rect", label: "Rectangle" },
        { v: "round", label: "Rounded" }, { v: "ellipse", label: "Ellipse" }],
        L.mask.shape, function (v) { L.mask.shape = v; change(); }));
      ["x", "y", "w", "h"].forEach(function (k) {
        field(host, k, numEl(round(L.mask[k] * 100, 1), -50, 200, 0.5, function (v) {
          L.mask[k] = v / 100; change(); }));
      });
      field(host, "Feather", numEl(round(L.mask.feather, 2), 0, 1, 0.01, function (v) {
        L.mask.feather = v; change(); }));
      var iv = el("label", "dpcheck"), ivi = el("input");
      ivi.type = "checkbox"; ivi.checked = L.mask.invert;
      ivi.addEventListener("change", function () { L.mask.invert = ivi.checked; change(); });
      iv.appendChild(ivi); iv.appendChild(document.createTextNode(" invert"));
      host.appendChild(iv);
    }
  }

  /* ================= the timeline ========================================== */
  var TLTIMER = null;
  function scheduleTimeline() {
    if (TLTIMER) return;
    TLTIMER = setTimeout(function () { TLTIMER = null; timeline(); }, 140);
  }

  function timeline() {
    var host = $("dp-timeline");
    if (!host) return;
    host.innerHTML = "";
    var total = M.total(DOC);
    var s = cur();
    var start = M.sceneStart(DOC, SCENE);

    /* the ruler, across the whole reel, with the scene joins marked */
    var rr = el("div", "dptrow dpruler");
    rr.appendChild(el("span", "dptname", total.toFixed(1) + " s"));
    var rl = el("div", "dptlane");
    DOC.scenes.forEach(function (sc, i) {
      var a = M.sceneStart(DOC, i);
      var seg = el("i", "dptscene" + (i === SCENE ? " on" : ""));
      seg.style.left = (a / total * 100) + "%";
      seg.style.width = (sc.seconds / total * 100) + "%";
      seg.title = sc.name + " — " + sc.seconds.toFixed(1) + " s";
      seg.addEventListener("click", function () {
        SCENE = i; PICK = null; refreshAll(); });
      rl.appendChild(seg);
    });
    for (var m2 = 1; m2 < 10; m2++) {
      var tk = el("i", "dptick");
      tk.style.left = (m2 * 10) + "%";
      rl.appendChild(tk);
    }
    var head = el("i", "dpplayhead");
    head.id = "dp-playhead";
    head.style.left = (T / total * 100) + "%";
    rl.appendChild(head);
    rl.addEventListener("pointerdown", function (ev) { scrubFrom(rl, ev, total, 0, total); });
    rr.appendChild(rl);
    host.appendChild(rr);

    /* one row per layer of the CURRENT scene, in stack order, topmost first */
    for (var i = s.layers.length - 1; i >= 0; i--) {
      (function (L) {
        var row = el("div", "dptrow" + (L.id === PICK ? " on" : ""));
        var nm = el("button", "dptname");
        nm.type = "button";
        var tw = el("span", "dptwist", OPEN[L.id] ? "▾" : "▸");
        nm.appendChild(tw);
        nm.appendChild(el("span", null, R.nameOf(L)));
        nm.addEventListener("click", function () {
          if (PICK === L.id) OPEN[L.id] = !OPEN[L.id];
          PICK = L.id;
          change(true);
        });
        row.appendChild(nm);
        var lane = el("div", "dptlane");
        var w = M.windowOf(L, s);
        var bar = el("div", "dptbar" + (L.hidden ? " off" : ""));
        bar.style.left = ((start + w.a) / total * 100) + "%";
        bar.style.width = Math.max(0.6, (w.len / total) * 100) + "%";
        bar.title = R.nameOf(L) + " — " + w.a.toFixed(2) + "s to " + w.b.toFixed(2) + "s";
        bar.addEventListener("pointerdown", function (ev) {
          dragBar(ev, lane, L, s, total, w);
        });
        lane.appendChild(bar);
        row.appendChild(lane);
        host.appendChild(row);

        if (OPEN[L.id]) {
          M.PROP_ORDER.forEach(function (k) {
            var tr = L.tracks[k];
            if (!tr.length) return;
            var prow = el("div", "dptrow dptprop");
            prow.appendChild(el("span", "dptname dptpname", M.PROPS[k].label));
            var plane = el("div", "dptlane");
            tr.forEach(function (key, ki) {
              var d = el("i", "dptkey");
              d.style.left = ((start + key.t) / total * 100) + "%";
              d.title = M.PROPS[k].label + " = " + round(key.v, 2) +
                        M.PROPS[k].unit + " at " + key.t.toFixed(2) + "s  (" +
                        (M.EASE[key.e] || { label: key.e }).label + ")";
              d.addEventListener("pointerdown", function (ev) {
                dragKey(ev, plane, L, k, key, s, total, start);
              });
              d.addEventListener("dblclick", function (ev) {
                ev.preventDefault();
                mark();
                tr.splice(tr.indexOf(key), 1);
                change(true);
              });
              plane.appendChild(d);
            });
            prow.appendChild(plane);
            host.appendChild(prow);
          });
          /* the camera's keys belong to the scene, but they are shown under
             the first opened layer's block so there is one place to look */
        }
      })(s.layers[i]);
    }
  }

  function scrubFrom(lane, ev, total, lo, hi) {
    ev.preventDefault();
    play(false);
    var r = lane.getBoundingClientRect();
    function at(e2) {
      var f = clamp((e2.clientX - r.left) / Math.max(1, r.width), 0, 1);
      T = clamp(f * total, lo, hi);
      var sc = M.sceneAt(DOC, T);
      if (sc && sc.i !== SCENE) { SCENE = sc.i; scenes(); stack(); }
      var ph = $("dp-playhead");
      if (ph) ph.style.left = (T / total * 100) + "%";
      showTime();
      drawFrame();
    }
    at(ev);
    function up() {
      window.removeEventListener("pointermove", at);
      window.removeEventListener("pointerup", up);
      change(false);
    }
    window.addEventListener("pointermove", at);
    window.addEventListener("pointerup", up);
  }

  function dragBar(ev, lane, L, s, total, w) {
    ev.preventDefault();
    ev.stopPropagation();
    PICK = L.id;
    var r = lane.getBoundingClientRect();
    var x0 = (ev.clientX - r.left) / Math.max(1, r.width) * total;
    var rel = (x0 - M.sceneStart(DOC, SCENE) - w.a) / Math.max(0.001, w.len);
    var mode = rel < 0.2 ? "a" : (rel > 0.8 ? "b" : "move");
    var a0 = w.a, b0 = w.b;
    mark();
    function mv(e2) {
      var x = (e2.clientX - r.left) / Math.max(1, r.width) * total;
      var d = x - x0;
      if (SNAP) d = Math.round(d * 10) / 10;
      if (mode === "move") {
        var len = b0 - a0;
        L.t0 = clamp(a0 + d, 0, s.seconds - len);
        L.t1 = L.t0 + len;
      } else if (mode === "a") {
        L.t0 = clamp(a0 + d, 0, b0 - 0.1);
        L.t1 = b0;
      } else {
        L.t1 = clamp(b0 + d, a0 + 0.1, s.seconds);
      }
      draw();
      var bar = lane.querySelector(".dptbar");
      if (bar) {
        var ww = M.windowOf(L, s);
        bar.style.left = ((M.sceneStart(DOC, SCENE) + ww.a) / total * 100) + "%";
        bar.style.width = Math.max(0.6, ww.len / total * 100) + "%";
      }
    }
    function up() {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      change(true);
    }
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  function dragKey(ev, lane, L, k, key, s, total, start) {
    ev.preventDefault();
    ev.stopPropagation();
    PICK = L.id;
    var r = lane.getBoundingClientRect();
    var t0k = key.t;
    var x0 = (ev.clientX - r.left) / Math.max(1, r.width) * total;
    mark();
    var dot = ev.target;
    function mv(e2) {
      var x = (e2.clientX - r.left) / Math.max(1, r.width) * total;
      var d = x - x0;
      if (SNAP) d = Math.round(d * 20) / 20;
      key.t = clamp(t0k + d, 0, s.seconds);
      M.sortTrack(L.tracks[k]);
      if (dot) dot.style.left = ((start + key.t) / total * 100) + "%";
      draw();
    }
    function up() {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      change(true);
    }
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  /* ================= the stage's own pointer =============================== */
  function bindStage() {
    var cv = $("dp-canvas");
    if (!cv) return;
    function frac(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / Math.max(1, r.width),
               y: (ev.clientY - r.top) / Math.max(1, r.height) };
    }
    cv.addEventListener("pointerdown", function (ev) {
      var f = frac(ev);
      var g = R.hitTest(DOC, T, f.x, f.y, PICK);
      if (!g) { return; }
      ev.preventDefault();
      if (g.id !== PICK) { PICK = g.id; change(true); }
      var L = curLayer();
      if (!L || L.locked) return;
      var lt = localT();
      var v = R.valuesOf(L, lt);
      mark();
      DRAG = { mode: g.mode, from: f,
               start: { x: v.x, y: v.y, w: v.w, h: v.h } };
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!DRAG) {
        var f2 = frac(ev);
        var g2 = R.hitTest(DOC, T, f2.x, f2.y, PICK);
        cv.style.cursor = !g2 ? "default"
          : (g2.mode === "move" ? "move" : (g2.mode === "pick" ? "pointer"
          : (g2.mode === "n" || g2.mode === "s" ? "ns-resize"
          : (g2.mode === "e" || g2.mode === "w" ? "ew-resize"
          : (g2.mode === "ne" || g2.mode === "sw" ? "nesw-resize" : "nwse-resize")))));
        return;
      }
      ev.preventDefault();
      var L = curLayer();
      if (!L) return;
      var f = frac(ev);
      var dx = (f.x - DRAG.from.x) * 100, dy = (f.y - DRAG.from.y) * 100;
      var st = DRAG.start;
      var nx = st.x, ny = st.y, nw = st.w, nh = st.h;
      var H = null;
      R.HANDLES.forEach(function (q) { if (q.k === DRAG.mode) H = q; });
      if (DRAG.mode === "move" || DRAG.mode === "pick") { nx += dx; ny += dy; }
      else if (H) {
        if (H.l) { nx += dx; nw -= dx; }
        if (H.r) nw += dx;
        if (H.t) { ny += dy; nh -= dy; }
        if (H.b) nh += dy;
      }
      if (nw < 2) nw = 2;
      if (nh < 1) nh = 1;
      if (ev.shiftKey || SNAP) {
        var g3 = 100 / 24;
        nx = Math.round(nx / g3) * g3; ny = Math.round(ny / g3) * g3;
        nw = Math.round(nw / g3) * g3; nh = Math.round(nh / g3) * g3;
      }
      var lt = localT();
      setProp(L, "x", nx, lt); setProp(L, "y", ny, lt);
      setProp(L, "w", nw, lt); setProp(L, "h", nh, lt);
      drawFrame();
    });
    function end() {
      if (!DRAG) return;
      DRAG = null;
      change(true);
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.setAttribute("tabindex", "0");
    cv.addEventListener("keydown", function (ev) {
      var L = curLayer();
      if (!L || L.locked) return;
      var step = ev.shiftKey ? 5 : 0.5, lt = localT();
      var v = R.valuesOf(L, lt);
      if (ev.key === "ArrowLeft") setProp(L, "x", v.x - step, lt);
      else if (ev.key === "ArrowRight") setProp(L, "x", v.x + step, lt);
      else if (ev.key === "ArrowUp") setProp(L, "y", v.y - step, lt);
      else if (ev.key === "ArrowDown") setProp(L, "y", v.y + step, lt);
      else if (ev.key === "Delete" || ev.key === "Backspace") { delLayer(L.id); }
      else return;
      ev.preventDefault();
      change();
    });
  }
  /* writing a value: to the base if the property is not animated, to a key if
     it is — which is the rule that makes a keyframed property impossible to
     edit by accident and an un-keyframed one impossible to over-complicate */
  function setProp(L, k, v, t) {
    if (!L.tracks[k].length) L.base[k] = v;
    else M.setKey(L.tracks[k], t, v, "smooth");
  }

  /* ================= transport ============================================= */
  var FPSCAP = 30, lastFrame = 0, slow = 0;
  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var now = performance.now();
    if (now - lastFrame < 1000 / FPSCAP - 1) return;
    lastFrame = now;
    var total = M.total(DOC);
    T = ((Date.now() - T0) / 1000) % total;
    var t0 = performance.now();
    drawFrame();
    var cost = performance.now() - t0;
    if (cost > 1000 / FPSCAP) { if (++slow > 3 && FPSCAP > 10) { FPSCAP -= 4; slow = 0; } }
    else if (--slow < -40 && FPSCAP < 30) { FPSCAP += 2; slow = 0; }
    if (!tick.ui || now - tick.ui > 110) {
      tick.ui = now;
      var ph = $("dp-playhead");
      if (ph) ph.style.left = (T / total * 100) + "%";
      showTime();
    }
  }
  function showTime() {
    var e = $("dp-time");
    if (!e) return;
    var total = M.total(DOC);
    var fr = Math.floor(T * DOC.fps) % DOC.fps;
    e.textContent = T.toFixed(2) + " / " + total.toFixed(2) + " s   ·   frame " +
      Math.floor(T * DOC.fps) + "  (" + String(fr).padStart(2, "0") + ")";
  }
  function play(on) {
    if (on && window.DPExport.isBusy()) return;
    PLAY = on;
    var b = $("dp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) {
      FPSCAP = 30; slow = 0; lastFrame = 0;
      T0 = Date.now() - T * 1000;
      if (DOC.audio && DOC.audio.__el) {
        try { DOC.audio.__el.currentTime = (DOC.audio.start || 0) + T;
              DOC.audio.__el.play(); } catch (e) {}
      }
      tick();
    } else {
      if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
      if (DOC.audio && DOC.audio.__el) { try { DOC.audio.__el.pause(); } catch (e) {} }
      change(false);
    }
  }

  /* ================= status, flash, persistence ============================ */
  function status() {
    var e = $("dp-stat");
    if (!e) return;
    var bits = [];
    var nl = 0, nk = 0;
    DOC.scenes.forEach(function (s) {
      nl += s.layers.length;
      s.layers.forEach(function (L) {
        M.PROP_ORDER.forEach(function (k) { nk += L.tracks[k].length; });
      });
    });
    var F = M.FORMATS[DOC.format];
    bits.push(DOC.scenes.length + " scene(s), " + nl + " layers, " + nk + " keys");
    bits.push(F.w + "×" + F.h + " at " + DOC.fps + " fps");
    bits.push(M.total(DOC).toFixed(1) + " s");
    if (DOC.audio) bits.push("audio: " + DOC.audio.name);
    e.textContent = bits.join("  ·  ");

    var w = $("dp-warn");
    if (!w) return;
    w.innerHTML = "";
    if (!LAST) return;
    (LAST.empty || []).forEach(function (q) {
      w.appendChild(el("li", null, q.name + " — " + q.why)); });
    (LAST.missing || []).forEach(function (q) {
      w.appendChild(el("li", null, q.layer + ": " + q.label + " — " + q.why)); });
    (LAST.errors || []).forEach(function (q) {
      w.appendChild(el("li", "bad", q.name + " — " + q.why)); });
  }
  function flash(msg) {
    var f = $("dp-flash");
    if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }
  var PTIMER = null;
  function persist() {
    if (PTIMER) return;
    PTIMER = setTimeout(function () {
      PTIMER = null;
      try {
        localStorage.setItem("nirayana.directorpro",
          JSON.stringify({ doc: DOC, scene: SCENE, place: PLACE }));
      } catch (e) {}
    }, 500);
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem("nirayana.directorpro") || "null");
      if (o && o.doc && o.doc.scenes) {
        DOC = M.doc(o.doc);
        SCENE = clamp(o.scene || 0, 0, DOC.scenes.length - 1);
        if (o.place && o.place.lat != null) PLACE = o.place;
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ================= the library of saved reels ============================ */
  var STORE = "nirayana.directorpro.reels";
  function reels() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeReels(l) {
    try { localStorage.setItem(STORE, JSON.stringify(l)); return true; }
    catch (e) { return false; }
  }
  function libraryPanel() {
    var host = $("dp-reels");
    if (!host) return;
    host.innerHTML = "";
    var r = el("div", "dprow");
    var sv = el("button", "dpbtn primary", "Save this reel");
    sv.type = "button";
    sv.addEventListener("click", function () {
      var list = reels();
      var d = JSON.parse(JSON.stringify(DOC));
      d.savedAt = Date.now();
      var at = -1;
      list.forEach(function (q, i) { if (q.name === d.name) at = i; });
      if (at >= 0) list[at] = d; else list.push(d);
      flash(writeReels(list) ? "Saved “" + d.name + "” in this browser."
                             : "This browser refused to store it.");
      libraryPanel();
    });
    r.appendChild(sv);
    var nw = el("button", "dpbtn", "New reel");
    nw.type = "button";
    nw.addEventListener("click", function () {
      mark();
      DOC = M.doc({ name: "Untitled reel" });
      SCENE = 0; T = 0; PICK = null;
      refreshAll();
    });
    r.appendChild(nw);
    /* a composition is JSON, so it is a file — which is how a reel moves
       between two of this person's machines with no server in the middle */
    var ex = el("button", "dpbtn", "Export the file");
    ex.type = "button";
    ex.addEventListener("click", function () {
      window.DPExport.save(new Blob([JSON.stringify(DOC, null, 1)],
        { type: "application/json" }),
        (DOC.name || "reel").replace(/[^\w-]+/g, "-") + ".nirayana.json");
    });
    r.appendChild(ex);
    var im = el("label", "dpbtn");
    im.textContent = "Open a file";
    var imi = el("input");
    imi.type = "file"; imi.accept = ".json,application/json"; imi.hidden = true;
    imi.addEventListener("change", function () {
      var f = imi.files && imi.files[0];
      if (!f) return;
      var fr2 = new FileReader();
      fr2.onload = function () {
        try {
          var o = JSON.parse(fr2.result);
          mark();
          DOC = o.v === 2 ? M.doc(o) : M.fromDirector(o, 15);
          SCENE = 0; T = 0; PICK = null;
          refreshAll();
          flash("Opened “" + DOC.name + "”.");
        } catch (e) { flash("That file is not a reel this page can read."); }
      };
      fr2.readAsText(f);
    });
    im.appendChild(imi);
    r.appendChild(im);
    host.appendChild(r);

    var list = reels();
    if (!list.length) {
      host.appendChild(el("p", "dphint",
        "Saved reels stay in this browser. Nothing is uploaded."));
      return;
    }
    list.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    var ul = el("div", "dpsaved");
    list.forEach(function (q) {
      var row = el("div", "dpsrow");
      var o = el("button", "dpchip", q.name + "  ·  " + (q.scenes || []).length +
                 " scenes");
      o.type = "button";
      o.addEventListener("click", function () {
        mark();
        DOC = M.doc(q); SCENE = 0; T = 0; PICK = null;
        refreshAll();
      });
      var x = el("button", "dpmini", "×");
      x.type = "button"; x.title = "Forget this reel";
      x.addEventListener("click", function () {
        writeReels(reels().filter(function (z) { return z.name !== q.name; }));
        libraryPanel();
      });
      row.appendChild(o); row.appendChild(x);
      ul.appendChild(row);
    });
    host.appendChild(ul);
  }

  /* ================= export panel ========================================== */
  function exportPanel() {
    var host = $("dp-export");
    if (!host) return;
    host.innerHTML = "";
    var can = window.DPExport.can();
    var r1 = el("div", "dprow");
    var rec = el("button", "dpbtn primary", "Record the reel");
    rec.type = "button"; rec.id = "dp-rec";
    rec.disabled = !(can.capture && can.recorder);
    rec.addEventListener("click", doRecord);
    r1.appendChild(rec);
    var png = el("button", "dpbtn", "Save this frame");
    png.type = "button";
    png.addEventListener("click", function () {
      window.DPExport.still(DOC, C, T).then(function (b) {
        window.DPExport.save(b, (DOC.name || "frame").replace(/[^\w-]+/g, "-") + ".png");
        draw();
      });
    });
    r1.appendChild(png);
    var seq = el("button", "dpbtn", "Frames as PNGs");
    seq.type = "button";
    seq.title = "One file per frame, for taking into another editor";
    seq.addEventListener("click", function () {
      seq.disabled = true;
      window.DPExport.atFull = true;
      window.DPRender.atFullSize(DOC, function () {
        return window.DPExport.frames(DOC, C, { fps: 6 }, function (f) {
          seq.textContent = "Frames… " + Math.round(f * 100) + "%";
        }).then(function (list) {
          list.forEach(function (q, i) {
            setTimeout(function () { window.DPExport.save(q.blob, q.name); }, i * 120);
          });
          seq.textContent = "Frames as PNGs"; seq.disabled = false;
          flash(list.length + " frames — your browser will ask about multiple downloads.");
          draw();
        });
      });
    });
    r1.appendChild(seq);
    host.appendChild(r1);

    var r2 = el("div", "dprow");
    r2.appendChild(el("span", "dplab", "Quality"));
    r2.appendChild(numEl(DOC.quality, 2, 80, 1, function (v) { DOC.quality = v; persist(); }));
    r2.appendChild(el("span", "dpunit", "Mbit/s"));
    host.appendChild(r2);

    var r3 = el("div", "dprow");
    r3.appendChild(el("span", "dplab", "Audio"));
    var al = el("label", "dpbtn");
    al.textContent = DOC.audio ? "Change the track" : "Choose a track";
    var ai = el("input");
    ai.type = "file"; ai.accept = "audio/*"; ai.hidden = true;
    ai.addEventListener("change", function () {
      var f = ai.files && ai.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      var a = new Audio();
      a.src = url; a.loop = false; a.preload = "auto";
      MEDIA.audioEl = a; MEDIA.audioName = f.name;
      DOC.audio = { name: f.name, start: 0, gain: 1, fadeIn: 0.4, fadeOut: 0.8,
                    __el: a };
      exportPanel(); status(); persist();
      flash("“" + f.name + "” is on the timeline. It never leaves this machine.");
    });
    al.appendChild(ai);
    r3.appendChild(al);
    if (DOC.audio) {
      var ax = el("button", "dpmini", "×");
      ax.type = "button"; ax.title = "Remove the track";
      ax.addEventListener("click", function () {
        DOC.audio = null; MEDIA.audioEl = null; exportPanel(); status(); persist(); });
      r3.appendChild(ax);
    }
    host.appendChild(r3);
    if (DOC.audio) {
      [["start", "Starts at", 0, 600, 0.1, "s"],
       ["gain", "Volume", 0, 2, 0.05, "×"],
       ["fadeIn", "Fade in", 0, 10, 0.1, "s"],
       ["fadeOut", "Fade out", 0, 10, 0.1, "s"]].forEach(function (q) {
        var rr = el("div", "dprow");
        rr.appendChild(el("span", "dplab", q[1]));
        rr.appendChild(numEl(DOC.audio[q[0]], q[2], q[3], q[4], function (v) {
          DOC.audio[q[0]] = v; persist(); }));
        rr.appendChild(el("span", "dpunit", q[5]));
        host.appendChild(rr);
      });
    }
    var note = el("p", "dphint");
    note.textContent = "This browser writes " +
      (can.mp4 ? "MP4 (H.264), which posts straight to Instagram."
               : "WebM — your browser does not offer MP4, so the file may need converting before it is posted.") +
      (can.audio ? "" : " It cannot record audio.");
    host.appendChild(note);
  }

  function doRecord() {
    var b = $("dp-rec");
    if (window.DPExport.isBusy()) {
      window.DPExport.cancel();
      b.textContent = "Stopping…";
      return;
    }
    play(false);
    var keepT = T;
    b.textContent = "Stop (0%)";
    b.className = "dpbtn primary rec";
    [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
      var e = $(q[0]); if (e) e.disabled = true; });
    var q0 = R.S.quality;
    R.S.quality = 1; R.resize(DOC);
    window.DPExport.record(DOC, C, { fps: DOC.fps, mbps: DOC.quality },
      function (f) { b.textContent = "Stop (" + Math.round(f * 100) + "%)"; })
      .then(function (res) {
        R.S.quality = q0; R.resize(DOC);
        b.textContent = "Record the reel"; b.className = "dpbtn primary";
        [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
          var e = $(q[0]); if (e) e.disabled = false; });
        syncUndo();
        T = keepT; refreshAll();
        if (res.cancelled && res.madeSeconds < 0.6) {
          flash("Stopped — nothing long enough to keep."); return;
        }
        var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
        window.DPExport.save(res.blob,
          (DOC.name || "reel").replace(/[^\w-]+/g, "-") + "." + ext);
        flash((res.cancelled ? "Stopped at " + res.madeSeconds.toFixed(1) + " s — "
                             : "Recorded " + res.seconds.toFixed(1) + " s — ") +
              res.width + "×" + res.height + ", " +
              Math.round(res.blob.size / 1024) + " KB" +
              (res.hadAudio ? ", with audio." : "."));
      })
      .catch(function (e) {
        R.S.quality = q0; R.resize(DOC);
        b.textContent = "Record the reel"; b.className = "dpbtn primary";
        [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
          var el2 = $(q[0]); if (el2) el2.disabled = false; });
        syncUndo();
        flash("Could not record: " + (e && e.message || e) +
              " — saving the frame always works.");
      });
  }

  /* ================= boot ================================================== */
  function bind() {
    M = window.DPModel; R = window.DPRender;
    if (!M || !R || !window.SPNodes || !window.SPStage) return;
    var cv = $("dp-canvas");
    if (!cv) return;
    R.attach(cv);

    if (!restore()) {
      DOC = M.doc({ name: "Untitled reel" });
      /* A document that opens empty is a document nobody starts. One scene
         with a caption band and a stamp is the shape of every reel this page
         makes, and both are one click from being deleted. */
      var s = DOC.scenes[0];
      /* A view layer that needs no stored chart, so the page opens on
         something drawn rather than on an empty frame that looks broken. */
      var v0 = M.layer({ kind: "view", sel: ["sky.all"], t0: 0, t1: 0,
        base: { x: 6, y: 14, w: 88, h: 52 } });
      M.applyEntry(v0, s, "rise", 0.8);
      s.layers.push(v0);
      s.layers.push(M.layer({ kind: "band", text: "{tithi}",
        sub: "{naks}  ·  {place}", col: "gold", animator: "wordFade",
        animSeconds: 0.9, t0: 0.3, t1: 0,
        base: { x: 8, y: 76, w: 84, h: 11 } }));
      s.layers.push(M.layer({ kind: "stamp", text: "{date}  ·  {place}",
        size: 0.019, col: "dim", t0: 0.1, t1: 0,
        base: { x: 8, y: 92, w: 84, h: 4 } }));
    }
    rebindMedia();
    C = buildContext();
    R.resize(DOC);
    /* Open part-way in rather than on frame zero. Every entry animation is at
       its beginning at t=0, so a document that opens there opens on a frame
       where nothing has arrived yet — which reads as a page that failed to
       load rather than as the first frame of a reel. */
    if (T <= 0) T = M.total(DOC) * 0.55;

    var mode = $("dp-mode");
    if (mode) {
      mode.textContent = C.J
        ? "Reading the chart stored in this browser" +
          (C.birth && C.birth.name ? " — " + C.birth.name : "") +
          ". Everything in the library is available."
        : "No chart stored here — the sky, the day and the divisions all work; " +
          "chart-only items are greyed. Build one on the Kundli page to unlock them.";
      if (!C.J) mode.className = "dpnote warn";
    }

    $("dp-play") && $("dp-play").addEventListener("click", function () { play(!PLAY); });
    $("dp-libsearch") && $("dp-libsearch").addEventListener("input", library);
    $("dp-liblive") && $("dp-liblive").addEventListener("change", library);
    var span = $("dp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); window.SPNodes.cacheClear(); library(); change(true); });
    var when = $("dp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        window.SPNodes.cacheClear();
        library(); change(true);
      });
    }
    var ph = $("dp-place");
    if (ph && window.NPlaces) {
      var quick = [];
      try {
        var sv = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null;
        if (sv) quick.push(sv);
      } catch (e) {}
      if (C.birth && C.birth.lat != null)
        quick.push({ n: C.birth.place || C.birth.name || "your chart's place",
                     lat: C.birth.lat, lon: C.birth.lon, tz: C.birth.tzHours });
      quick = quick.concat((window.NP && window.NP.PLACES) || []);
      window.NPlaces.picker({
        host: ph, value: C.place, quick: quick, label: "Place",
        refMs: function () { return C ? C.when : Date.now(); },
        onPick: function (p) {
          PLACE = { n: p.n || p.name, lat: p.lat, lon: p.lon, tz: p.tz };
          C = buildContext(C.when);
          window.SPNodes.cacheClear();
          library(); change(true); persist();
        }
      });
    }

    bindStage();
    addBar();
    library();
    libraryPanel();
    exportPanel();
    refreshAll();

    window.addEventListener("resize", function () { fitStage(); draw(); });
    /* the shortcuts a video tool is expected to have */
    document.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" ||
                t.tagName === "TEXTAREA")) return;
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo(); else undo();
        return;
      }
      if (ev.key === " ") { ev.preventDefault(); play(!PLAY); return; }
      if (ev.key === "ArrowLeft" && ev.altKey) {
        ev.preventDefault(); T = Math.max(0, T - 1 / DOC.fps); change(false); return; }
      if (ev.key === "ArrowRight" && ev.altKey) {
        ev.preventDefault(); T = Math.min(M.total(DOC), T + 1 / DOC.fps);
        change(false); return; }
    });

    try {
      window.__dp = {
        doc: function () { return DOC; },
        setDoc: function (d) { DOC = M.doc(d); SCENE = 0; T = 0; refreshAll(); },
        ctx: function () { return C; },
        at: function (t) { T = t; drawFrame(); return LAST; },
        exportFrame: function (t) { T = t == null ? T : t;
          return R.render(DOC, C, T, true); },
        screenFrame: function (t) { T = t == null ? T : t; drawFrame(); return LAST; },
        pick: function (id) { PICK = id; change(true); },
        picked: function () { return PICK; },
        scene: function (i) { if (i != null) { SCENE = i; refreshAll(); } return SCENE; },
        add: function (o) { return addLayer(o); },
        undo: undo, redo: redo, mark: mark,
        playing: function () { return PLAY; },
        last: function () { return LAST; },
        total: function () { return M.total(DOC); },
        libSelect: function (ids) { LIBSEL = ids.slice(); library(); return LIBSEL; },
        refresh: refreshAll
      };
    } catch (e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
