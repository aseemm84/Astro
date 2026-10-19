/* ===== Studio Pro — the page ==============================================

   Three panes. The command wall on the left lists every node the registry
   offers, grouped by domain and filtered by a search box; the stage in the
   middle draws whatever is selected; the tray on the right says what was
   selected, which composer took it, which other views could take it instead,
   and what is being left out.

   THE PART THAT IS NOT ORNAMENT. Selecting a node highlights the other nodes
   that have a real relation to it, and says what the relation is. The rules
   below are the only ones used, and each produces a sentence — there is no
   "related because they are both about Jupiter-ish things". If no rule fires,
   nothing lights up, which is the honest answer. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s); }

  var C = null;            /* the live context */
  var SEL = [];            /* selected node ids, in click order */
  var FORCE = null;        /* a composer the user pinned */
  var PLAY = false, RAF = null, T0 = 0, DUR = 15;
  var LAST = null;         /* the last render result */

  var DOM_LABEL = {
    sky: "Sky & grahas", rashi: "Rāśis", bhava: "Bhāvas", nakshatra: "Nakṣatras",
    varga: "Vargas", bala: "Strength & dignity", ashtakavarga: "Aṣṭakavarga",
    dasha: "Daśās", jaimini: "Jaimini & special points", yoga: "Yogas",
    panchanga: "Pañcāṅga & muhūrta", transit: "Transits", cosmic: "Cosmic time"
  };

  /* ---- context ---------------------------------------------------------- */
  function readBirth() {
    try {
      var raw = localStorage.getItem("nirayana.birth");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = (b && b.lat != null)
      ? { name: b.name || "your birth place", lat: b.lat, lon: b.lon, tz: b.tzHours }
      : { name: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
    var sp = $("sp-place");
    if (sp && sp.dataset && sp.dataset.lat)
      place = { name: sp.value || place.name, lat: +sp.dataset.lat,
                lon: +sp.dataset.lon, tz: +sp.dataset.tz };
    var when = whenMs || Date.now();
    var day = null;
    try { if (window.NP && window.NP.day) day = window.NP.day(when, place); }
    catch (e) {}
    var spanEl = $("sp-span");
    return { J: J, when: when, place: place, day: day,
             spanDays: spanEl ? +spanEl.value : 365, birth: b };
  }

  /* ---- relationship discovery -------------------------------------------
     Each rule returns a sentence or null. A node pair with no sentence is not
     related, and is not highlighted. */
  function grahaIn(id) {
    var SA = window.SPNodes.SA;
    for (var i = 0; i < SA.length; i++)
      if (id.indexOf("." + SA[i]) >= 0 || id.indexOf(SA[i]) >= 0) return SA[i];
    return null;
  }
  function tailOf(id) { var p = id.split("."); return p[p.length - 1]; }
  function related(id) {
    var node = window.SPNodes.byId(id);
    if (!node) return [];
    var v = window.SPNodes.resolve(node, C);
    var g = grahaIn(id), out = [];
    var mdLord = null;
    try { var cm = window.SPNodes.currentMd(C); mdLord = cm && cm.lord; } catch (e) {}
    /* which graha rules the sign a longitude falls in */
    var dispOf = null;
    if (v && v.kind === "lon")
      dispOf = window.SPNodes.LORD[Math.floor(window.SPNodes.norm(v.deg) / 30)];

    window.SPNodes.all().forEach(function (o) {
      if (o.id === id) return;
      var why = null;
      var og = grahaIn(o.id);

      if (g && og === g && o.dom !== node.dom)
        why = "the same graha, read in another domain";
      else if (g && og === g)
        why = "another facet of " + g;
      else if (dispOf && og === dispOf && o.id.indexOf("sky.lon.") === 0)
        why = dispOf + " rules the sign this falls in";
      else if (mdLord && og === mdLord && o.id.indexOf("sky.lon.") === 0 &&
               node.dom === "dasha")
        why = "where the running daśā lord stands";
      else if (v && v.kind === "lon" && o.roles.indexOf("lanes") >= 0)
        why = "a division this longitude can be taken down through";
      else if (v && v.kind === "lanes" && o.roles.indexOf("lon") >= 0 &&
               o.dom === "sky")
        why = "a point that can be zoomed inside this division";
      else if (v && v.kind === "lon" && o.roles.indexOf("lon") >= 0 &&
               o.dom === node.dom && o.dom !== "nakshatra" && o.dom !== "rashi")
        why = "another longitude — the angle between them can be drawn";
      else if (v && (v.kind === "sset" || v.kind === "scalar") &&
               o.roles.indexOf("sset") >= 0 && o.dom === node.dom)
        why = "a magnitude on the same kind of axis";
      else if (v && v.kind === "spanset" && o.roles.indexOf("series") >= 0)
        why = "something that can be traced across this period";
      else if (node.dom === "varga" && o.dom === "varga" &&
               tailOf(o.id) === tailOf(id) && o.id !== id)
        why = "the same division, seen the other way";

      if (why) out.push({ id: o.id, why: why });
    });
    return out;
  }
  function relatedSet() {
    var map = {};
    SEL.forEach(function (id) {
      related(id).forEach(function (r) {
        if (SEL.indexOf(r.id) >= 0) return;
        if (!map[r.id]) map[r.id] = r.why;
      });
    });
    return map;
  }

  /* ---- the command wall -------------------------------------------------- */
  var WALL = null;
  function buildWall() {
    var host = $("sp-wall"); if (!host) return;
    host.innerHTML = "";
    var byDom = {};
    window.SPNodes.all().forEach(function (n) {
      (byDom[n.dom] = byDom[n.dom] || []).push(n); });
    WALL = {};
    Object.keys(byDom).forEach(function (d) {
      var sec = el("section", "spgrp");
      sec.setAttribute("data-dom", d);
      var h = el("h3", null, (DOM_LABEL[d] || d) + " ");
      var cnt = el("span", "spcount", String(byDom[d].length));
      h.appendChild(cnt);
      sec.appendChild(h);
      var box = el("div", "spchips");
      byDom[d].forEach(function (n) {
        var b = el("button", "spchip", n.label);
        b.type = "button";
        b.title = n.hint || n.label;
        b.setAttribute("data-id", n.id);
        b.addEventListener("click", function () { toggle(n.id); });
        box.appendChild(b);
        WALL[n.id] = b;
      });
      sec.appendChild(box);
      host.appendChild(sec);
    });
    refreshWall();
  }
  function refreshWall() {
    if (!WALL) return;
    var rel = relatedSet();
    var q = (($("sp-search") && $("sp-search").value) || "").toLowerCase().trim();
    var onlyLive = $("sp-onlylive") && $("sp-onlylive").checked;
    var shown = 0, live = 0;
    window.SPNodes.all().forEach(function (n) {
      var b = WALL[n.id]; if (!b) return;
      var v = window.SPNodes.resolve(n, C);
      var has = !!v;
      if (has) live++;
      var match = !q || n.label.toLowerCase().indexOf(q) >= 0 ||
                  n.id.toLowerCase().indexOf(q) >= 0 ||
                  (n.hint || "").toLowerCase().indexOf(q) >= 0 ||
                  (DOM_LABEL[n.dom] || n.dom).toLowerCase().indexOf(q) >= 0;
      if (onlyLive && !has) match = false;
      b.hidden = !match;
      if (match) shown++;
      b.className = "spchip" +
        (SEL.indexOf(n.id) >= 0 ? " on" : "") +
        (!has ? " off" : "") +
        (rel[n.id] ? " rel" : "");
      b.title = has ? (rel[n.id] ? rel[n.id] : (n.hint || n.label))
                    : (n.label + " — not available for this chart or moment");
      if (v) b.setAttribute("data-kind", v.kind); else b.removeAttribute("data-kind");
    });
    /* hide a group whose chips are all filtered away */
    [].forEach.call(document.querySelectorAll(".spgrp"), function (sec) {
      var any = false;
      [].forEach.call(sec.querySelectorAll(".spchip"), function (b) {
        if (!b.hidden) any = true; });
      sec.hidden = !any;
    });
    var st = $("sp-wallstat");
    if (st) st.textContent = shown + " shown · " + live + " of " +
      window.SPNodes.all().length + " available here";
  }

  /* ---- the tray ---------------------------------------------------------- */
  function refreshTray() {
    var host = $("sp-tray"); if (!host) return;
    host.innerHTML = "";
    if (!SEL.length) {
      host.appendChild(el("p", "spmuted",
        "Nothing selected. Click anything on the wall — one chip, or six. " +
        "Whatever you pick, the stage will find a way to draw it."));
      return;
    }
    SEL.forEach(function (id, i) {
      var n = window.SPNodes.byId(id); if (!n) return;
      var v = window.SPNodes.resolve(n, C);
      var row = el("div", "sprow" + (v ? "" : " dead"));
      var a = el("button", "sprowx", "×");
      a.type = "button";
      a.setAttribute("aria-label", "remove " + n.label);
      a.addEventListener("click", function () { toggle(id); });
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, n.label));
      t.appendChild(el("span", "spkind", v ? v.kind : "unavailable"));
      t.appendChild(el("small", null, DOM_LABEL[n.dom] || n.dom));
      row.appendChild(t); row.appendChild(a);
      host.appendChild(row);
    });
    /* why these go together */
    if (SEL.length > 1) {
      var links = [];
      SEL.forEach(function (a2) {
        related(a2).forEach(function (r) {
          if (SEL.indexOf(r.id) > SEL.indexOf(a2)) {
            var nb = window.SPNodes.byId(r.id);
            var na = window.SPNodes.byId(a2);
            if (na && nb) links.push(na.label + " → " + nb.label + ": " + r.why);
          }
        });
      });
      var box = el("div", "splinks");
      box.appendChild(el("b", null, links.length
        ? "How these connect" : "No stated relation between these"));
      if (links.length)
        links.slice(0, 6).forEach(function (L) { box.appendChild(el("p", null, L)); });
      else
        box.appendChild(el("p", null,
          "They can still be drawn together — the stage will put them in " +
          "separate panels — but nothing in the engine links them."));
      host.appendChild(box);
    }
  }
  function refreshViews() {
    var host = $("sp-views"); if (!host) return;
    host.innerHTML = "";
    var opts = (LAST && LAST.options) || [];
    if (!opts.length) { host.appendChild(el("span", "spmuted", "—")); return; }
    opts.forEach(function (o) {
      var b = el("button", "spview" +
        ((FORCE ? FORCE === o.key : (LAST && LAST.composer === o.key)) ? " on" : ""),
        o.label);
      b.type = "button"; b.title = o.blurb;
      b.addEventListener("click", function () {
        FORCE = (FORCE === o.key) ? null : o.key; draw(); });
      host.appendChild(b);
    });
  }
  function refreshNotes() {
    var host = $("sp-notes"); if (!host) return;
    host.innerHTML = "";
    if (!LAST) return;
    if (LAST.composer) {
      var p = el("p", null, "Drawn as ");
      p.appendChild(el("b", null, LAST.label));
      p.appendChild(document.createTextNode(
        FORCE ? " — you pinned this view." : " — the best fit for what is selected."));
      host.appendChild(p);
    }
    (LAST.missing || []).forEach(function (m) {
      host.appendChild(el("p", "spwarn",
        (m.label || m.id) + " — " + m.why + ", so it is not on the frame."));
    });
  }

  /* ---- the stage --------------------------------------------------------- */
  function draw() {
    if (!window.SPStage || !C) return;
    LAST = window.SPStage.render(SEL, C, window.SPStage.S.p, FORCE);
    fitPreview();
    refreshViews(); refreshNotes();
  }
  function fitPreview() {
    var cv = $("sp-canvas"), box = $("sp-stagebox");
    if (!cv || !box) return;
    var r = window.SPStage.RATIOS[window.SPStage.S.ratio];
    var maxH = Math.max(320, Math.min(window.innerHeight * 0.62, 760));
    var h = maxH, w = h * r.w / r.h;
    if (w > box.clientWidth - 8) { w = box.clientWidth - 8; h = w * r.h / r.w; }
    cv.style.width = Math.round(w) + "px";
    cv.style.height = Math.round(h) + "px";
  }
  function toggle(id) {
    var i = SEL.indexOf(id);
    if (i >= 0) SEL.splice(i, 1);
    else {
      if (SEL.length >= 8) { flash("Eight is the most the stage will take at once."); return; }
      SEL.push(id);
    }
    FORCE = null;
    refreshWall(); refreshTray(); draw();
    saveState();
  }
  function flash(msg) {
    var f = $("sp-flash"); if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3200);
  }

  /* ---- playback ---------------------------------------------------------- */
  function tick() {
    if (!PLAY) return;
    var el2 = (Date.now() - T0) / 1000;
    window.SPStage.S.p = (el2 % DUR) / DUR;
    var sc = $("sp-scrub"); if (sc) sc.value = String(Math.round(window.SPStage.S.p * 1000));
    draw();
    RAF = requestAnimationFrame(tick);
  }
  function play(on) {
    PLAY = on;
    var b = $("sp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) { T0 = Date.now() - window.SPStage.S.p * DUR * 1000; tick(); }
    else if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
  }

  /* ---- persistence: the selection survives a reload ---------------------- */
  function saveState() {
    try {
      localStorage.setItem("nirayana.studiopro", JSON.stringify({
        sel: SEL, ratio: window.SPStage.S.ratio, pal: window.SPStage.S.pal,
        safe: window.SPStage.S.safe, head: window.SPStage.S.headline,
        sub: window.SPStage.S.sub }));
    } catch (e) {}
  }
  function loadState() {
    try {
      var o = JSON.parse(localStorage.getItem("nirayana.studiopro") || "null");
      if (!o) return;
      if (o.sel && o.sel.length) SEL = o.sel.filter(function (id) {
        return !!window.SPNodes.byId(id); });
      if (o.ratio) window.SPStage.S.ratio = o.ratio;
      if (o.pal) window.SPStage.S.pal = o.pal;
      if (o.safe != null) window.SPStage.S.safe = o.safe;
      if (o.head) window.SPStage.S.headline = o.head;
      if (o.sub) window.SPStage.S.sub = o.sub;
    } catch (e) {}
  }

  /* ---- export ------------------------------------------------------------ */
  function savePng() {
    var cv = $("sp-canvas");
    cv.toBlob(function (b) {
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }, "image/png");
  }
  function saveVideo() {
    var btn = $("sp-rec"); if (!btn) return;
    var was = btn.textContent;
    btn.disabled = true;
    play(false);
    window.SPStage.record(SEL, C, DUR, 30, FORCE, function (f) {
      btn.textContent = "Recording " + Math.round(f * 100) + "%";
    }).then(function (res) {
      btn.disabled = false; btn.textContent = was;
      var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      var u = URL.createObjectURL(res.blob), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
      flash("Recorded " + res.seconds + " s, " +
            Math.round(res.blob.size / 1024) + " KB.");
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = was;
      flash("Could not record: " + (e && e.message || e) +
            " — the still export always works.");
    });
  }

  /* ---- wiring ------------------------------------------------------------ */
  function bind() {
    var cv = $("sp-canvas");
    if (!cv) return;
    window.SPStage.attach(cv);
    loadState();
    window.SPStage.resize();

    C = buildContext();
    buildWall();
    refreshTray();

    /* mode banner: a chart, or live only */
    var mode = $("sp-mode");
    if (mode) {
      if (C.J) mode.textContent = "Reading the chart stored in this browser" +
        (C.birth && C.birth.name ? " — " + C.birth.name : "") +
        ". Everything on the wall is available.";
      else {
        mode.textContent = "No birth chart stored in this browser, so the " +
          "chart-only nodes are greyed. Everything about the sky, the day and " +
          "the divisions still works. Build a chart on the Kundli page to " +
          "unlock the rest.";
        mode.className = "spnote warn";
      }
    }

    $("sp-search") && $("sp-search").addEventListener("input", refreshWall);
    $("sp-onlylive") && $("sp-onlylive").addEventListener("change", refreshWall);
    $("sp-clear") && $("sp-clear").addEventListener("click", function () {
      SEL = []; FORCE = null; refreshWall(); refreshTray(); draw(); saveState(); });

    [].forEach.call(document.querySelectorAll("[data-spratio]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.ratio = b.getAttribute("data-spratio");
        [].forEach.call(document.querySelectorAll("[data-spratio]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        window.SPStage.resize(); draw(); saveState();
      });
      if (b.getAttribute("data-spratio") === window.SPStage.S.ratio)
        b.className = "spv on";
    });
    [].forEach.call(document.querySelectorAll("[data-sppal]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.pal = b.getAttribute("data-sppal");
        [].forEach.call(document.querySelectorAll("[data-sppal]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        draw(); saveState();
      });
      if (b.getAttribute("data-sppal") === window.SPStage.S.pal)
        b.className = "spv on";
    });
    var safe = $("sp-safe");
    if (safe) {
      safe.checked = window.SPStage.S.safe;
      safe.addEventListener("change", function () {
        window.SPStage.S.safe = safe.checked; draw(); saveState(); });
    }
    var scrub = $("sp-scrub");
    if (scrub) scrub.addEventListener("input", function () {
      play(false);
      window.SPStage.S.p = (+scrub.value) / 1000; draw(); });
    $("sp-play") && $("sp-play").addEventListener("click", function () { play(!PLAY); });
    var dur = $("sp-dur");
    if (dur) dur.addEventListener("change", function () { DUR = +dur.value; });
    var head = $("sp-head");
    if (head) {
      head.value = window.SPStage.S.headline;
      head.addEventListener("input", function () {
        window.SPStage.S.headline = head.value; draw(); saveState(); });
    }
    var sub = $("sp-sub");
    if (sub) {
      sub.value = window.SPStage.S.sub;
      sub.addEventListener("input", function () {
        window.SPStage.S.sub = sub.value; draw(); saveState(); });
    }
    var when = $("sp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        refreshWall(); refreshTray(); draw();
      });
    }
    var span = $("sp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); draw(); });
    $("sp-png") && $("sp-png").addEventListener("click", savePng);
    $("sp-rec") && $("sp-rec").addEventListener("click", saveVideo);

    /* the list of what is deliberately missing */
    var ab = $("sp-absent");
    if (ab) window.SPNodes.absent.forEach(function (a) {
      var li = el("li");
      li.appendChild(el("b", null, a.what));
      li.appendChild(document.createTextNode(" — " + a.why));
      ab.appendChild(li);
    });

    window.addEventListener("resize", function () { fitPreview(); });
    draw();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();

  /* a hook for the page test: drive the whole UI without a mouse */
  try {
    window.__spUI = {
      select: function (ids) { SEL = ids.slice(); FORCE = null;
        refreshWall(); refreshTray(); draw(); return LAST; },
      last: function () { return LAST; },
      ctx: function () { return C; },
      related: related,
      nodeCount: function () { return window.SPNodes.all().length; }
    };
  } catch (e) {}
})();
