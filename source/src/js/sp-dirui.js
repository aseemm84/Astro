/* ===== Studio Pro — the Director panel ====================================

   The controls for the layer model: the stack, the inspector, the timeline,
   the arrangement and sequencing presets, dragging on the canvas, and saving
   a composition. Nothing here computes anything about the sky; it edits a
   plain object and asks the page to redraw.

   WHY THE PANEL IS REBUILT ON CHANGE AND NEVER ON A FRAME. This is the same
   rule the whole page now lives under, and it is the reason it is worth
   restating here rather than trusting it to be remembered: an innerHTML
   rebuild invalidates style for the document, and a rebuild per frame on a
   panel this size is what made pressing Play stop the buttons responding.
   So: a handler changes the document and calls change(), which redraws the
   canvas once and re-renders whatever part of the panel is now wrong. During
   playback the panel is not touched at all — the inspector shows the
   document, which playback does not alter.

   WHY DRAGGING IS ON THE CANVAS AND NOT IN DOM BOXES. Handles as absolutely
   positioned divs over the preview would have to be repositioned every frame
   to track an animating layer, which is a write-then-read on layout sixty
   times a second — the exact fault that was just fixed. They are drawn by the
   Director's overlay pass instead, which the export and the recorder never
   call, so they also cannot end up in a saved frame. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var D = null;              /* window.SPDirector, once it exists */
  var HOST = null;           /* hooks handed over by the page */
  var DRAG = null;

  function doc() { return D.doc(); }
  function cur() { return D.current(); }

  /* a change to the document: redraw, and re-sync the parts of the panel that
     describe what changed */
  function change(deep) {
    HOST.draw();
    if (deep) stack();
    inspector();
    timeline();
    status();
    if (HOST.save) HOST.save();
  }

  /* ---- small field builders ---------------------------------------------- */
  function row(host, label) {
    var r = el("div", "spdrow");
    if (label) r.appendChild(el("span", "spdlab", label));
    host.appendChild(r);
    return r;
  }
  function sel(host, label, opts, value, onSet) {
    var r = row(host, label), s = el("select");
    opts.forEach(function (o) {
      var op = el("option", null, o.label);
      op.value = o.v;
      if (String(o.v) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onSet(s.value); });
    r.appendChild(s);
    return s;
  }
  function num(host, label, value, min, max, step, onSet, suffix) {
    var r = row(host, label), i = el("input");
    i.type = "number"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.addEventListener("change", function () {
      var v = parseFloat(i.value);
      if (isNaN(v)) return;
      onSet(Math.max(min, Math.min(max, v)));
    });
    r.appendChild(i);
    if (suffix) r.appendChild(el("span", "spdsuf", suffix));
    return i;
  }
  function range(host, label, value, min, max, step, onSet) {
    var r = row(host, label), i = el("input");
    i.type = "range"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.className = "spdrange";
    var out = el("span", "spdsuf", String(value));
    i.addEventListener("input", function () {
      out.textContent = i.value;
      onSet(parseFloat(i.value));
    });
    r.appendChild(i); r.appendChild(out);
    return i;
  }
  function text(host, label, value, onSet, place) {
    var r = row(host, label), i = el("input");
    i.type = "text"; i.value = value || "";
    if (place) i.placeholder = place;
    i.addEventListener("input", function () { onSet(i.value); });
    r.appendChild(i);
    return i;
  }
  function btn(host, label, onClick, cls) {
    var b = el("button", "spbtn" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    host.appendChild(b);
    return b;
  }
  function opts(map, order) {
    var out = [];
    (order || Object.keys(map)).forEach(function (k) {
      if (!map.hasOwnProperty(k)) return;
      out.push({ v: k, label: map[k].label || map[k] });
    });
    return out;
  }

  /* ---- the mode switch ---------------------------------------------------- */
  function modeBar() {
    var host = $("sp-modebar");
    if (!host) return;
    host.innerHTML = "";
    var on = D.on();
    var a = el("button", "spv" + (on ? "" : " on"), "Auto");
    a.type = "button";
    a.title = "The page decides the view, the arrangement and the timing.";
    a.addEventListener("click", function () {
      if (!D.on()) return;
      D.setOn(false); sync(); change(true);
      HOST.flash("Auto mode. The page is choosing again.");
    });
    var b = el("button", "spv" + (on ? " on" : ""), "Director");
    b.type = "button";
    b.title = "You decide: layers, placement, timing, motion.";
    b.addEventListener("click", function () {
      if (D.on()) return;
      if (!doc().layers.length) takeControl("single");
      else { D.setOn(true); sync(); change(true); }
    });
    host.appendChild(a); host.appendChild(b);
    var note = el("span", "spdmode",
      on ? "Director — the document below is what records."
         : "Auto — the best fit for the selection is drawn.");
    host.appendChild(note);
  }

  function takeControl(how) {
    var C = HOST.ctx();
    var s = HOST.sel();
    if (!s.length && how !== "blank") {
      HOST.flash("Pick something from the wall first — Director starts from a composition.");
      return;
    }
    if (how === "blank") {
      D.newDoc({ on: true, name: "Blank" });
      D.setOn(true);
    } else {
      D.build(s, C, HOST.force(), how, HOST.headline(), HOST.subline());
    }
    sync();
    change(true);
    HOST.flash(how === "blank"
      ? "Empty document. Add layers below."
      : "Taken apart into " + doc().layers.length + " layers. Everything below is yours to move.");
  }

  /* ---- the layer stack ---------------------------------------------------- */
  /* Painted top-of-stack first, because that is the order the eye reads a
     layer list in every tool that has one, and the array is bottom-first. */
  function stack() {
    var host = $("sp-stack");
    if (!host) return;
    host.innerHTML = "";
    var Ls = doc().layers;
    if (!Ls.length) {
      host.appendChild(el("p", "spdempty",
        "No layers. Take a selection apart, or add one below."));
      return;
    }
    var picked = D.picked();
    for (var i = Ls.length - 1; i >= 0; i--) {
      (function (L, idx) {
        var r = el("div", "spdlayer" + (L.id === picked ? " on" : "") +
                            (L.hidden ? " off" : ""));
        var eye = el("button", "spdeye", L.hidden ? "◻" : "◼");
        eye.type = "button";
        eye.title = L.hidden ? "Hidden — click to show" : "Visible — click to hide";
        eye.setAttribute("aria-label", eye.title);
        eye.addEventListener("click", function (ev) {
          ev.stopPropagation();
          L.hidden = !L.hidden; change(true);
        });
        var nm = el("button", "spdname");
        nm.type = "button";
        nm.appendChild(el("span", "spdkind", L.kind));
        nm.appendChild(el("span", "spdtitle", D.nameOf(L)));
        var win = (L.t0 > 0.001 || L.t1 < 0.999)
          ? Math.round(L.t0 * 100) + "–" + Math.round(L.t1 * 100) + "%" : "";
        if (win) nm.appendChild(el("span", "spdwin", win));
        nm.addEventListener("click", function () { D.pick(L.id); change(true); });
        var up = el("button", "spdmv", "↑"); up.type = "button";
        up.title = "Bring forward";
        up.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.move(L.id, 1); change(true); });
        var dn = el("button", "spdmv", "↓"); dn.type = "button";
        dn.title = "Send back";
        dn.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.move(L.id, -1); change(true); });
        var cp = el("button", "spdmv", "⧉"); cp.type = "button";
        cp.title = "Duplicate";
        cp.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.duplicate(L.id); change(true); });
        var x = el("button", "spdmv spdx", "×"); x.type = "button";
        x.title = "Delete this layer";
        x.addEventListener("click", function (ev) {
          ev.stopPropagation(); D.remove(L.id); change(true); });
        r.appendChild(eye); r.appendChild(nm);
        r.appendChild(up); r.appendChild(dn); r.appendChild(cp); r.appendChild(x);
        host.appendChild(r);
      })(Ls[i], i);
    }
  }

  /* ---- adding layers ------------------------------------------------------ */
  function addBar() {
    var host = $("sp-addbar");
    if (!host) return;
    host.innerHTML = "";
    var R = D.stageRect();
    btn(host, "+ View", function () {
      var s = HOST.sel();
      if (!s.length) { HOST.flash("Select nodes on the wall, then add them as a view layer."); return; }
      D.add({ kind: "view", sel: s.slice(), force: HOST.force(),
              rect: { x: R.x + R.w * 0.12, y: R.y + R.h * 0.12,
                      w: R.w * 0.76, h: R.h * 0.76 },
              enter: { k: "rise", len: 0.25 } });
      change(true);
      HOST.flash("Added the current selection as a view layer.");
    });
    btn(host, "+ Text", function () {
      D.add({ kind: "text", text: "Your line here", size: 0.034, lines: 2,
              col: "ink", rect: { x: 0.10, y: 0.18, w: 0.80, h: 0.10 },
              enter: { k: "rise", len: 0.25 } });
      change(true);
    });
    btn(host, "+ Rule", function () {
      D.add({ kind: "rule", shape: "line", col: "gold",
              rect: { x: 0.25, y: 0.30, w: 0.50, h: 0.004 },
              enter: { k: "wipeL", len: 0.30 } });
      change(true);
    });
    btn(host, "+ Wash", function () {
      D.add({ kind: "wash", shape: "panel", col: "line", opacity: 0.35,
              rect: { x: 0.08, y: 0.16, w: 0.84, h: 0.56 },
              enter: { k: "fade", len: 0.2 } }, "bottom");
      change(true);
    });
    btn(host, "+ Band", function () {
      D.add({ kind: "band", col: "gold", rect: D.bandRect(),
              enter: { k: "rise", len: 0.22 } });
      change(true);
    });
    btn(host, "+ Stamp", function () {
      D.add({ kind: "stamp", size: 0.019, col: "dim",
              text: "{date}  ·  {place}",
              rect: { x: 0.08, y: 0.93, w: 0.84, h: 0.04 } });
      change(true);
    });
  }

  /* ---- the inspector ------------------------------------------------------ */
  function inspector() {
    var host = $("sp-insp");
    if (!host) return;
    host.innerHTML = "";
    var L = cur();
    if (!L) {
      host.appendChild(el("p", "spdempty",
        "Pick a layer above, or click one on the frame."));
      return;
    }
    var h = el("div", "spdhead");
    h.appendChild(el("b", null, D.nameOf(L)));
    h.appendChild(el("span", "spdkind", L.kind));
    host.appendChild(h);

    text(host, "Name", L.name, function (v) { L.name = v; change(true); },
         D.nameOf(L));

    /* --- what --- */
    host.appendChild(el("h4", "spdsec", "What"));
    if (L.kind === "view") {
      var tray = el("div", "spdsel");
      if (!L.sel.length) tray.appendChild(el("span", "spdempty", "no nodes"));
      L.sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        var c = el("button", "spchip sm", n ? n.label : id);
        c.type = "button";
        c.title = "Remove from this layer";
        c.addEventListener("click", function () {
          L.sel = L.sel.filter(function (q) { return q !== id; });
          change(true);
        });
        tray.appendChild(c);
      });
      host.appendChild(tray);
      var acts = el("div", "spdrow");
      btn(acts, "Set to wall selection", function () {
        var s = HOST.sel();
        if (!s.length) { HOST.flash("Nothing is selected on the wall."); return; }
        L.sel = s.slice(); L.force = HOST.force(); change(true);
      });
      btn(acts, "Add wall selection", function () {
        var s = HOST.sel();
        s.forEach(function (id) { if (L.sel.indexOf(id) < 0) L.sel.push(id); });
        change(true);
      });
      host.appendChild(acts);
      /* which composer draws this layer — the whole list, so the user can
         insist, with what the matcher would have chosen marked */
      var C = HOST.ctx();
      var B = window.SPStage.bagOf(L.sel, C);
      var fit = window.SPStage.options(B.bag);
      var list = [{ v: "", label: "Best fit" + (fit.length ? " — " + fit[0].label : "") }];
      window.SPStage.composers().forEach(function (K) {
        var ok = false;
        fit.forEach(function (f) { if (f.key === K.key) ok = true; });
        list.push({ v: K.key, label: K.label + (ok ? "" : "  (cannot draw this)") });
      });
      sel(host, "Drawn as", list, L.force || "", function (v) {
        L.force = v || null; change(true);
      });
    } else if (L.kind === "text" || L.kind === "band" || L.kind === "stamp") {
      text(host, L.kind === "band" ? "Headline" : "Text", L.text,
           function (v) { L.text = v; change(true); },
           L.kind === "stamp" ? "{date}  ·  {place}" : "");
      if (L.kind === "band")
        text(host, "Sub-line", L.sub, function (v) { L.sub = v; change(true); });
      var tk = el("p", "spdtok");
      tk.appendChild(document.createTextNode("Tokens resolve when the frame is drawn: "));
      D.tokens().forEach(function (t) {
        var a = el("button", "spdtokb", t);
        a.type = "button";
        a.title = "Insert " + t;
        a.addEventListener("click", function () {
          L.text = (L.text || "") + t; change(true);
        });
        tk.appendChild(a);
      });
      host.appendChild(tk);
      if (L.kind === "text") {
        num(host, "Size", (L.size * 1000).toFixed(0), 8, 140, 1,
            function (v) { L.size = v / 1000; change(); }, "‰ of width");
        num(host, "Max lines", L.lines, 1, 8, 1, function (v) { L.lines = v; change(); });
        sel(host, "Align", [{ v: "left", label: "Left" }, { v: "center", label: "Centre" },
                            { v: "right", label: "Right" }], L.align,
            function (v) { L.align = v; change(); });
        sel(host, "Vertical", [{ v: "top", label: "Top" }, { v: "middle", label: "Middle" },
                               { v: "bottom", label: "Bottom" }], L.valign,
            function (v) { L.valign = v; change(); });
        sel(host, "Weight", [{ v: 400, label: "Regular" }, { v: 500, label: "Medium" },
                             { v: 600, label: "Semibold" }, { v: 700, label: "Bold" },
                             { v: 800, label: "Heavy" }], L.weight,
            function (v) { L.weight = +v; change(); });
      }
      if (L.kind === "stamp")
        num(host, "Size", (L.size * 1000).toFixed(0), 8, 60, 1,
            function (v) { L.size = v / 1000; change(); }, "‰ of width");
    } else if (L.kind === "rule") {
      sel(host, "Shape", [{ v: "line", label: "Hairline" }, { v: "bar", label: "Solid bar" },
                          { v: "double", label: "Two rules" }, { v: "frame", label: "Box" }],
          L.shape, function (v) { L.shape = v; change(true); });
    } else if (L.kind === "wash") {
      sel(host, "Shape", [{ v: "flat", label: "Flat fill" }, { v: "panel", label: "Panel" },
                          { v: "vignette", label: "Vignette" }, { v: "sweep", label: "Gradient sweep" },
                          { v: "disc", label: "Disc" }],
          L.shape, function (v) { L.shape = v; change(true); });
    }
    if (L.kind !== "view") {
      var cols = [];
      D.COLS.forEach(function (k) {
        cols.push({ v: k, label: k === "custom" ? "Custom…" : k });
      });
      sel(host, "Colour", cols, L.col, function (v) { L.col = v; change(true); });
      if (L.col === "custom") {
        var r = row(host, "Hex"), i = el("input");
        i.type = "color"; i.value = L.hex;
        i.addEventListener("input", function () { L.hex = i.value; change(); });
        r.appendChild(i);
      }
    }

    /* --- where --- */
    host.appendChild(el("h4", "spdsec", "Where"));
    var g = el("div", "spdgrid");
    ["x", "y", "w", "h"].forEach(function (k) {
      var lab = el("label", "spdcell");
      lab.appendChild(el("span", null, k));
      var i = el("input");
      i.type = "number"; i.step = "0.5"; i.min = "-50"; i.max = "200";
      i.value = (L.rect[k] * 100).toFixed(1);
      i.addEventListener("change", function () {
        var v = parseFloat(i.value);
        if (!isNaN(v)) { L.rect[k] = v / 100; change(); }
      });
      lab.appendChild(i);
      g.appendChild(lab);
    });
    host.appendChild(g);
    host.appendChild(el("p", "spdhint",
      "Per cent of the frame. Drag the layer on the frame itself — hold Shift to snap."));
    var al = el("div", "spdrow");
    al.appendChild(el("span", "spdlab", "Align"));
    btn(al, "Centre ↔", function () {
      L.rect.x = (1 - L.rect.w) / 2; change(); });
    btn(al, "Centre ↕", function () {
      L.rect.y = (1 - L.rect.h) / 2; change(); });
    btn(al, "Fill the stage", function () {
      var R = D.stageRect();
      L.rect = { x: R.x, y: R.y, w: R.w, h: R.h }; change(); });
    btn(al, "Fill the frame", function () {
      L.rect = { x: 0, y: 0, w: 1, h: 1 }; change(); });
    host.appendChild(al);
    var cl = el("label", "spcheck"), cb = el("input");
    cb.type = "checkbox"; cb.checked = !!L.clip;
    cb.addEventListener("change", function () { L.clip = cb.checked; change(); });
    cl.appendChild(cb);
    cl.appendChild(document.createTextNode(
      " clip to the box — nothing of this layer is drawn outside it"));
    host.appendChild(cl);
    range(host, "Rotation", L.rot, -180, 180, 1, function (v) { L.rot = v; change(); });
    range(host, "Opacity", L.opacity, 0, 1, 0.01, function (v) { L.opacity = v; change(); });

    var mv = el("div", "spdrow");
    if (!L.to) {
      btn(mv, "Add a move", function () {
        L.to = { x: L.rect.x, y: L.rect.y - 0.08, w: L.rect.w, h: L.rect.h };
        change(true);
        HOST.flash("A second rectangle. The layer travels from the gold box to the green one.");
      });
    } else {
      btn(mv, "Remove the move", function () { L.to = null; change(true); });
      btn(mv, "Swap ends", function () {
        var t = L.rect; L.rect = L.to; L.to = t; change();
      });
    }
    host.appendChild(mv);
    if (L.to) {
      var g2 = el("div", "spdgrid");
      ["x", "y", "w", "h"].forEach(function (k) {
        var lab = el("label", "spdcell to");
        lab.appendChild(el("span", null, "→" + k));
        var i2 = el("input");
        i2.type = "number"; i2.step = "0.5"; i2.min = "-50"; i2.max = "200";
        i2.value = (L.to[k] * 100).toFixed(1);
        i2.addEventListener("change", function () {
          var v = parseFloat(i2.value);
          if (!isNaN(v)) { L.to[k] = v / 100; change(); }
        });
        lab.appendChild(i2);
        g2.appendChild(lab);
      });
      host.appendChild(g2);
      host.appendChild(el("p", "spdhint",
        "Hold Alt and drag on the frame to move the destination."));
    }

    /* --- when --- */
    host.appendChild(el("h4", "spdsec", "When"));
    var dur = HOST.duration();
    range(host, "Starts", L.t0, 0, 1, 0.01, function (v) {
      L.t0 = v; if (L.t1 < v) L.t1 = Math.min(1, v + 0.05); change(true); });
    range(host, "Ends", L.t1, 0, 1, 0.01, function (v) {
      L.t1 = v; if (L.t0 > v) L.t0 = Math.max(0, v - 0.05); change(true); });
    host.appendChild(el("p", "spdhint",
      "On screen from " + (L.t0 * dur).toFixed(1) + " s to " + (L.t1 * dur).toFixed(1) +
      " s of " + dur.toFixed(0) + " s."));

    /* --- how --- */
    host.appendChild(el("h4", "spdsec", "How it moves"));
    sel(host, "Entry", opts(D.ENTER), L.enter.k, function (v) {
      L.enter.k = v; change(true); });
    range(host, "Entry length", L.enter.len, 0, 1, 0.01,
          function (v) { L.enter.len = v; change(); });
    sel(host, "Exit", opts(D.EXIT), L.exit.k, function (v) { L.exit.k = v; change(true); });
    range(host, "Exit length", L.exit.len, 0, 1, 0.01,
          function (v) { L.exit.len = v; change(); });
    sel(host, "All the while", opts(D.IDLE), L.idle.k, function (v) {
      L.idle.k = v; change(true); });
    range(host, "How much", L.idle.amt, 0, 3, 0.05,
          function (v) { L.idle.amt = v; change(); });
    sel(host, "Easing", opts(D.EASE), L.ease, function (v) { L.ease = v; change(); });

    if (L.kind === "view") {
      sel(host, "The drawing's own clock",
          [{ v: "layer", label: "Runs over the layer's window" },
           { v: "reel", label: "Runs over the whole reel" },
           { v: "loop", label: "Loops inside the window" },
           { v: "frozen", label: "Held at one instant" }],
          L.clock, function (v) { L.clock = v; change(true); });
      if (L.clock === "loop")
        num(host, "Loops", L.cycles, 1, 20, 1, function (v) { L.cycles = v; change(); });
      if (L.clock === "frozen")
        range(host, "Held at", L.at, 0, 1, 0.01, function (v) { L.at = v; change(); });
      host.appendChild(el("p", "spdhint",
        "Every composer animates itself. This decides what it thinks the " +
        "playhead is — so a diagram can finish building early and then sit " +
        "still while the rest of the frame arrives."));
    }

    var lk = el("label", "spcheck"), ci = el("input");
    ci.type = "checkbox"; ci.checked = !!L.locked;
    ci.addEventListener("change", function () { L.locked = ci.checked; change(true); });
    lk.appendChild(ci);
    lk.appendChild(document.createTextNode(" locked — not picked up by dragging"));
    host.appendChild(lk);
  }

  /* ---- the timeline ------------------------------------------------------- */
  /* One bar per layer against the reel. It is the only place the whole
     sequence is visible at once, which is what a user needs to see why two
     layers collide. Clicking a bar picks the layer; dragging its body or its
     ends retimes it. */
  function timeline() {
    var host = $("sp-timeline");
    if (!host) return;
    host.innerHTML = "";
    var Ls = doc().layers;
    if (!Ls.length) return;
    var dur = HOST.duration();
    var picked = D.picked();
    for (var i = Ls.length - 1; i >= 0; i--) {
      (function (L) {
        var r = el("div", "spdtrow" + (L.id === picked ? " on" : ""));
        var nm = el("span", "spdtname", D.nameOf(L));
        var lane = el("div", "spdtlane");
        var bar = el("div", "spdtbar" + (L.hidden ? " off" : ""));
        var a = Math.min(L.t0, L.t1), b = Math.max(L.t0, L.t1);
        bar.style.left = (a * 100) + "%";
        bar.style.width = Math.max(1.5, (b - a) * 100) + "%";
        bar.title = D.nameOf(L) + " — " + (a * dur).toFixed(1) + "s to " +
                    (b * dur).toFixed(1) + "s";
        /* the entry and exit, shaded inside the bar, so a reel that is all
           entrance and no picture is visible as such */
        if (L.enter.len > 0.01) {
          var ei = el("i", "spdte");
          ei.style.width = Math.min(100, L.enter.len * 100) + "%";
          bar.appendChild(ei);
        }
        if (L.exit.len > 0.01) {
          var xi = el("i", "spdtx");
          xi.style.width = Math.min(100, L.exit.len * 100) + "%";
          bar.appendChild(xi);
        }
        lane.appendChild(bar);
        bar.addEventListener("pointerdown", function (ev) {
          ev.preventDefault();
          D.pick(L.id);
          var rect = lane.getBoundingClientRect();
          var at = (ev.clientX - rect.left) / Math.max(1, rect.width);
          var edge = (at - a) / Math.max(0.001, b - a);
          var mode = edge < 0.18 ? "a" : (edge > 0.82 ? "b" : "move");
          var start = { a: a, b: b, at: at };
          function mv(e2) {
            var dx = (e2.clientX - rect.left) / Math.max(1, rect.width) - start.at;
            if (mode === "move") {
              var len = start.b - start.a;
              L.t0 = Math.max(0, Math.min(1 - len, start.a + dx));
              L.t1 = L.t0 + len;
            } else if (mode === "a") {
              L.t0 = Math.max(0, Math.min(start.b - 0.02, start.a + dx));
            } else {
              L.t1 = Math.min(1, Math.max(start.a + 0.02, start.b + dx));
            }
            HOST.draw();
          }
          function up() {
            window.removeEventListener("pointermove", mv);
            window.removeEventListener("pointerup", up);
            change(true);
          }
          window.addEventListener("pointermove", mv);
          window.addEventListener("pointerup", up);
          change(true);
        });
        r.appendChild(nm); r.appendChild(lane);
        host.appendChild(r);
      })(Ls[i]);
    }
    var pl = el("div", "spdtrow spdtruler");
    pl.appendChild(el("span", "spdtname", dur.toFixed(0) + " s"));
    var lane2 = el("div", "spdtlane");
    for (var t = 0; t <= 4; t++) {
      var tick = el("i", "spdtick");
      tick.style.left = (t * 25) + "%";
      lane2.appendChild(tick);
    }
    pl.appendChild(lane2);
    host.appendChild(pl);
  }

  /* ---- presets and document-level controls -------------------------------- */
  function presets() {
    var host = $("sp-presets");
    if (!host) return;
    host.innerHTML = "";
    var r1 = el("div", "spdrow");
    r1.appendChild(el("span", "spdlab", "Arrange"));
    Object.keys(D.ARRANGE).forEach(function (k) {
      btn(r1, D.ARRANGE[k].label, function () {
        D.arrange(k); change(true);
      });
    });
    host.appendChild(r1);
    var r2 = el("div", "spdrow");
    r2.appendChild(el("span", "spdlab", "Sequence"));
    Object.keys(D.SEQUENCE).forEach(function (k) {
      btn(r2, D.SEQUENCE[k].label, function () {
        D.sequence(k); change(true);
      });
    });
    host.appendChild(r2);
    var r3 = el("div", "spdrow");
    r3.appendChild(el("span", "spdlab", "Backdrop"));
    [["gradient", "Gradient"], ["flat", "Flat"], ["vignette", "Vignette"],
     ["none", "None"]].forEach(function (q) {
      var b = el("button", "spv" + (doc().bg.style === q[0] ? " on" : ""), q[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        doc().bg.style = q[0]; change(true);
      });
      r3.appendChild(b);
    });
    var st = el("label", "spcheck"), si = el("input");
    si.type = "checkbox"; si.checked = !!doc().bg.stars;
    si.addEventListener("change", function () { doc().bg.stars = si.checked; change(); });
    st.appendChild(si);
    st.appendChild(document.createTextNode(" stars"));
    r3.appendChild(st);
    host.appendChild(r3);
  }

  function library() {
    var host = $("sp-library");
    if (!host) return;
    host.innerHTML = "";
    var r = el("div", "spdrow");
    var nmi = el("input");
    nmi.type = "text"; nmi.value = doc().name || "";
    nmi.placeholder = "name this composition";
    nmi.className = "spdname-in";
    r.appendChild(nmi);
    btn(r, "Save", function () {
      var n = (nmi.value || "").trim();
      if (!n) { HOST.flash("Give the composition a name first."); return; }
      var ok = D.save(n);
      HOST.flash(ok ? "Saved “" + ok + "” in this browser." :
                 "Could not save — this browser is refusing to store anything.");
      library();
    });
    host.appendChild(r);
    var list = D.saved();
    if (!list.length) {
      host.appendChild(el("p", "spdhint",
        "Saved compositions stay in this browser. Nothing is uploaded."));
      return;
    }
    var ul = el("div", "spdsaved");
    list.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    list.forEach(function (q) {
      var r2 = el("div", "spdsrow");
      var o = el("button", "spchip sm", q.name + "  ·  " +
                 (q.layers || []).length + " layers");
      o.type = "button";
      o.addEventListener("click", function () {
        if (D.load(q.name)) { sync(); change(true); HOST.flash("Opened “" + q.name + "”."); }
      });
      var x = el("button", "spdmv spdx", "×");
      x.type = "button"; x.title = "Forget this composition";
      x.addEventListener("click", function () { D.drop(q.name); library(); });
      r2.appendChild(o); r2.appendChild(x);
      ul.appendChild(r2);
    });
    host.appendChild(ul);
  }

  function status() {
    var host = $("sp-dstat");
    if (!host) return;
    var rep = HOST.lastReport();
    var bits = [];
    var Ls = doc().layers;
    var vis = Ls.filter(function (L) { return !L.hidden; }).length;
    bits.push(Ls.length + " layer(s), " + vis + " visible");
    var last = D.lastUsed();
    if (last < 0.97)
      bits.push("nothing on screen after " + Math.round(last * 100) + "% of the reel");
    if (rep) {
      if (rep.empty && rep.empty.length)
        bits.push(rep.empty.length + " layer(s) drawing nothing");
      if (rep.missing && rep.missing.length)
        bits.push(rep.missing.length + " node(s) that do not resolve");
      if (rep.errors && rep.errors.length)
        bits.push(rep.errors.length + " layer(s) that threw");
    }
    host.textContent = bits.join("  ·  ");

    var warn = $("sp-dwarn");
    if (!warn) return;
    warn.innerHTML = "";
    if (!rep) return;
    (rep.empty || []).forEach(function (q) {
      warn.appendChild(el("li", null, q.name + " — " + q.why));
    });
    (rep.missing || []).forEach(function (q) {
      warn.appendChild(el("li", null, q.layer + ": " + q.label + " — " + q.why));
    });
    (rep.errors || []).forEach(function (q) {
      warn.appendChild(el("li", "bad", q.name + " — " + q.why));
    });
  }

  /* ---- dragging on the frame ---------------------------------------------- */
  /* Pointer coordinates come in CSS pixels of the displayed canvas, which is
     a different size from the canvas's own pixels and a different size again
     from the export. Everything in the document is a fraction of the frame,
     so the conversion is done once here and nothing downstream has to know
     what size anything is being previewed at. */
  function frac(cv, ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / Math.max(1, r.width),
             y: (ev.clientY - r.top) / Math.max(1, r.height) };
  }
  function bindCanvas(cv) {
    cv.addEventListener("pointerdown", function (ev) {
      if (!D.on()) return;
      var f = frac(cv, ev);
      var which = ev.altKey ? "to" : "rect";
      var g = D.hit(f.x, f.y, window.SPStage.S.p, which);
      if (!g) { return; }
      ev.preventDefault();
      if (g.id !== D.picked()) { D.pick(g.id); change(true); }
      var L = D.byId(g.id);
      if (!L) return;
      var src = (g.which === "to" && L.to) ? L.to : L.rect;
      DRAG = { grab: g, start: { x: src.x, y: src.y, w: src.w, h: src.h },
               from: f, snap: ev.shiftKey };
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!DRAG) {
        if (!D.on()) return;
        /* the cursor tells the user what a press would do, which is the only
           affordance a canvas can offer */
        var f2 = frac(cv, ev);
        var g2 = D.hit(f2.x, f2.y, window.SPStage.S.p, ev.altKey ? "to" : "rect");
        cv.style.cursor = !g2 ? "default"
          : (g2.mode === "move" ? "move"
          : (g2.mode === "pick" ? "pointer"
          : (g2.mode === "n" || g2.mode === "s" ? "ns-resize"
          : (g2.mode === "e" || g2.mode === "w" ? "ew-resize"
          : (g2.mode === "ne" || g2.mode === "sw" ? "nesw-resize" : "nwse-resize")))));
        return;
      }
      ev.preventDefault();
      var f = frac(cv, ev);
      D.dragTo(DRAG.grab, DRAG.start, f.x - DRAG.from.x, f.y - DRAG.from.y,
               ev.shiftKey || DRAG.snap);
      /* the canvas only — the panel is synced on release, because retiming
         the inspector's thirty fields at pointer rate is the forced layout
         this page has already been bitten by once */
      HOST.draw();
    });
    function end() {
      if (!DRAG) return;
      DRAG = null;
      change(true);
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    /* nudging with the keyboard, which is how anything is ever aligned
       properly; the canvas is focusable for exactly this */
    cv.setAttribute("tabindex", "0");
    cv.addEventListener("keydown", function (ev) {
      if (!D.on()) return;
      var L = cur(); if (!L || L.locked) return;
      var step = ev.shiftKey ? 0.05 : 0.005;
      var k = ev.key, R = L.rect;
      if (k === "ArrowLeft") R.x -= step;
      else if (k === "ArrowRight") R.x += step;
      else if (k === "ArrowUp") R.y -= step;
      else if (k === "ArrowDown") R.y += step;
      else if (k === "[") { R.w *= 0.96; R.h *= 0.96; }
      else if (k === "]") { R.w /= 0.96; R.h /= 0.96; }
      else if (k === "Delete" || k === "Backspace") { D.remove(L.id); change(true); ev.preventDefault(); return; }
      else return;
      ev.preventDefault();
      change();
    });
  }

  /* ---- showing and hiding the whole panel --------------------------------- */
  function sync() {
    var on = D.on();
    var p = $("sp-dirpanel");
    if (p) p.hidden = !on;
    var t = $("sp-timewrap");
    if (t) t.hidden = !on;
    var a = $("sp-autoonly");
    if (a) a.hidden = on;
    /* a finger on the frame drags a layer in Director and scrolls the page in
       Auto, which is what a finger on a phone is mostly for */
    var cv = $("sp-canvas");
    if (cv) cv.className = on ? "spdragging" : "";
    modeBar();
    presets();
    addBar();
    library();
  }

  window.SPDirUI = {
    mount: function (hooks) {
      D = window.SPDirector;
      if (!D) return;
      HOST = hooks;
      var tc = $("sp-takeone");
      if (tc) tc.addEventListener("click", function () { takeControl("single"); });
      var ts = $("sp-takesplit");
      if (ts) ts.addEventListener("click", function () { takeControl("split"); });
      var to = $("sp-takesolo");
      if (to) to.addEventListener("click", function () { takeControl("solo"); });
      var tb = $("sp-takeblank");
      if (tb) tb.addEventListener("click", function () { takeControl("blank"); });
      var cv = $("sp-canvas");
      if (cv) bindCanvas(cv);
      sync();
      stack(); inspector(); timeline(); status();
    },
    /* the page calls this after anything that changes what the panel should
       say — a new place, a new moment, a new selection */
    refresh: function (deep) {
      if (!D || !HOST) return;
      if (deep) sync();
      stack(); inspector(); timeline(); status();
    },
    on: function () { return D && D.on(); },
    overlay: function (p) { if (D && D.on()) D.overlay(p); }
  };
})();
