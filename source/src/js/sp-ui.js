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
  var SHOTS = [];          /* the storyboard: [{sel, force, seconds, label}] */
  var PLACE = null;        /* the place the reader picked, if they picked one */
  var STORY = false;       /* true while the storyboard is what plays */

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
  /* The site writes a place as {n, lat, lon, tz} everywhere — the picker, the
     calendar, the pañcāṅga. This page had grown its own {name, ...} and then
     read a control that was never added to the markup, so the place was
     whatever the birth record said or New Delhi, with no way to change it.
     One shape now, carrying both spellings so neither side has to know about
     the other. */
  function asPlace(o, fallbackName) {
    if (!o || o.lat == null) return null;
    var nm = o.n || o.name || fallbackName || "";
    return { n: nm, name: nm, lat: +o.lat, lon: +o.lon,
             tz: +(o.tz != null ? o.tz : o.tzHours) || 0 };
  }
  function defaultPlace(b) {
    /* in order: what the reader picked, what they last picked here, the place
       this browser's chart was cast for, the one the rest of the site saves,
       and only then a default */
    if (PLACE) return PLACE;
    var sv = null;
    try { sv = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null; }
    catch (e) {}
    return asPlace(b && b.lat != null
                     ? { n: b.place || b.name || "your chart's place",
                         lat: b.lat, lon: b.lon, tz: b.tzHours } : null)
        || asPlace(sv)
        || { n: "New Delhi", name: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  }
  /* Everything that has to happen when the place changes, in one function so
     the picker and the test drive the same code rather than two that agree
     until one of them is edited. */
  function applyPlace(pp) {
    var np = asPlace(pp);
    if (!np) return null;
    PLACE = np;
    /* The day object, the sunrise and every window hanging off it are cached
       per place. A stale cache here is the worst kind of wrong: one city's
       pañcāṅga under another city's name, with nothing on the page to show
       it. */
    try { if (window.NP && window.NP.cacheClear) window.NP.cacheClear(); }
    catch (e) {}
    C = buildContext(C ? C.when : Date.now());
    refreshWall(); refreshTray(); draw();
    buildStrip();
    saveState();
    flash("Now computing for " + C.place.n + ".");
    return C.place;
  }

  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = defaultPlace(b);
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
  /* THE FRAME PATH. Nothing here may touch the DOM.

     draw() used to rebuild the view switcher and the notes panel, and call
     fitPreview, on every single frame. At sixty frames a second that is an
     innerHTML churn and a forced layout sixty times a second on a page
     carrying two hundred and fifty chips — which, measured on a throttled
     phone, took the frame budget from twenty milliseconds to two hundred and
     thirty-four. The main thread was blocked in quarter-second blocks, so
     taps never landed: pressing Play made the whole panel stop responding,
     including Pause.

     So the frame path draws the canvas and does nothing else, and the panels
     are synced only when the composition actually changes. */
  function shotsNow() { return (STORY && SHOTS.length) ? SHOTS : null; }
  function drawFrame() {
    if (!window.SPStage || !C) return;
    LAST = window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                 shotsNow(), true);
    /* The editing handles. Drawn after the frame and only here — the recorder
       and the still export call frameAt themselves and never this, which is
       why a gold dashed rectangle cannot end up in anything saved. */
    if (window.SPDirUI) window.SPDirUI.overlay(window.SPStage.S.p);
  }
  function draw() {
    if (!window.SPStage || !C) return;
    LAST = window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                 shotsNow(), false);
    if (window.SPDirUI) window.SPDirUI.overlay(window.SPStage.S.p);
    fitPreview();
    /* In Director mode the composer switcher and the fit notes describe a
       choice the user has taken over, so they stand down rather than
       contradict the layer they are no longer about. */
    if (!(window.SPDirector && window.SPDirector.on())) {
      refreshViews(); refreshNotes();
    }
  }

  /* ===== the sample strip ================================================
     A row of live compositions across the top, scrolling, each one actually
     being drawn right now from the same composers and the same day's data as
     the stage below — not a gallery of recorded gifs.

     WHY A CURATED POOL rather than random selections. The sampler in the test
     suite proves that ANY combination draws; it also shows that most random
     combinations land on Layers, which at thumbnail size is three small
     panels and reads as noise. A strip is an advertisement for what the page
     can do, so it draws from combinations chosen to look like something at
     120 pixels wide, and re-rolls them so the strip is never the same twice.

     WHY TILES ARE DRAWN IN A ROUND ROBIN. Twenty canvases at sixty frames a
     second is a page that heats a phone. Two tiles per frame gives each one
     about six frames a second, which for a thumbnail is motion; the loop
     stops entirely when the strip scrolls out of view or the tab is hidden,
     because a strip nobody is looking at should cost nothing. */

  var STRIP = {
    tiles: [], live: 0, raf: null, cursor: 0, scroll: 0,
    paused: false, lastRoll: 0, seen: 0
  };
  /* Each entry is a selection that is worth looking at small. `need` lists the
     nodes that must resolve for it to be offered at all, so a visitor with no
     birth chart is shown the dozen that work from the sky and the day alone
     rather than a row of empty frames. */
  var POOL = [
    { sel: ["day.almanac"], label: "Today's leaf" },
    { sel: ["sky.all"], label: "The nine" },
    { sel: ["sky.lon.Sūrya", "sky.lon.Candra"], label: "Sun to Moon" },
    { sel: ["sky.lon.Candra", "geo.naks"], label: "Into the nakṣatra" },
    { sel: ["sky.lon.Candra", "geo.d60"], label: "Down to the ṣaṣṭyāṃśa" },
    { sel: ["geo.rashis", "geo.naks", "geo.padas"], label: "Three divisions" },
    { sel: ["pan.horas"], label: "The day's horās" },
    { sel: ["pan.choghadiya"], label: "Choghaḍiyā" },
    { sel: ["pan.fiveLimbs"], label: "The five limbs" },
    { sel: ["pan.tara"], label: "Tāra Bala" },
    { sel: ["tr.all"], label: "The sky now" },
    { sel: ["tr.track.Maṅgala"], label: "Maṅgala over a year" },
    { sel: ["tr.elongSeries"], label: "Elongation over time" },
    { sel: ["sky.lon.Sūrya", "geo.rashis"], label: "Sūrya in its rāśi" },
    { sel: ["geo.kakshya"], label: "The kakṣyā lanes" },
    /* these need a stored chart */
    { sel: ["chart.d1"], force: "kundliN", label: "North Indian" },
    { sel: ["chart.d1"], force: "kundliS", label: "South Indian" },
    { sel: ["chart.sudarshana"], label: "Sudarśana" },
    { sel: ["varga.kundli.D9"], force: "kundliN", label: "Navāṃśa" },
    { sel: ["varga.kundli.D10"], force: "kundliS", label: "Daśāṃśa" },
    { sel: ["bala.total_rupa"], label: "Ṣaḍbala" },
    { sel: ["bala.vsRequired"], label: "Against the minimum" },
    { sel: ["av.grid"], label: "Aṣṭakavarga" },
    { sel: ["av.sav"], label: "Sarvāṣṭakavarga" },
    { sel: ["dasha.gears"], label: "Daśā gears" },
    { sel: ["dasha.maha"], label: "The nine periods" },
    { sel: ["rel.drishti"], label: "Graha dṛṣṭi" },
    { sel: ["rel.dispositor"], label: "Dispositors" },
    { sel: ["tr.relations"], label: "Transits to natal" },
    { sel: ["jai.arudhas"], label: "Arūḍha padas" },
    { sel: ["varga.vargottama"], label: "Vargottama" },
    { sel: ["bala.avastha"], label: "Avasthās" }
  ];
  function poolAvailable() {
    return POOL.filter(function (e) {
      return e.sel.every(function (id) {
        var n = window.SPNodes.byId(id);
        return n && !!window.SPNodes.resolve(n, C);
      });
    });
  }
  function pickSpec(avail, avoid) {
    for (var t = 0; t < 24; t++) {
      var e = avail[Math.floor(Math.random() * avail.length)];
      if (!e) return null;
      if (avoid.indexOf(e.label) < 0) return e;
    }
    return avail[0] || null;
  }
  var TILE_W = 252, TILE_H = 448;      /* the bitmap; CSS halves it */

  function buildStrip() {
    var host = $("sp-strip"); if (!host) return;
    var avail = poolAvailable();
    host.innerHTML = "";
    STRIP.tiles = [];
    if (avail.length < 3) {
      host.appendChild(el("p", "spmuted", "Nothing to sample yet."));
      return;
    }
    STRIP.live = Math.min(10, avail.length);
    var used = [];
    for (var i = 0; i < STRIP.live; i++) {
      var spec = pickSpec(avail, used);
      used.push(spec.label);
      STRIP.tiles.push(mkTile(host, spec, i));
    }
    /* A second run of the same tiles makes the scroll loop seamlessly. They
       are not rendered twice: each copy is blitted from its original, which
       costs one drawImage and keeps the loop exactly identical rather than
       merely similar. */
    for (var j = 0; j < STRIP.live; j++)
      STRIP.tiles.push(mkTile(host, STRIP.tiles[j].spec, j, STRIP.tiles[j]));
    STRIP.lastRoll = Date.now();
    startStrip();
  }
  function mkTile(host, spec, idx, mirrorOf) {
    var fig = el("figure", "sptile");
    var cv = document.createElement("canvas");
    cv.width = TILE_W; cv.height = TILE_H;
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", spec.label);
    var cap = el("figcaption", null, spec.label);
    fig.appendChild(cv); fig.appendChild(cap);
    fig.title = "Open this on the stage";
    fig.tabIndex = 0;
    function open() {
      SEL = spec.sel.slice(); FORCE = spec.force || null; STORY = false;
      var tb = $("sp-storytoggle"); if (tb) tb.checked = false;
      refreshWall(); refreshTray(); draw();
      var box = $("sp-stagebox");
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "center" });
      flash("Loaded “" + spec.label + "” onto the stage.");
    }
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    host.appendChild(fig);
    return { fig: fig, cv: cv, cap: cap, spec: spec, idx: idx,
             mirrorOf: mirrorOf || null, p: Math.random() };
  }

  function startStrip() {
    if (STRIP.raf) return;
    var last = 0;
    function frame(ts) {
      STRIP.raf = requestAnimationFrame(frame);
      STRIP.ticks = (STRIP.ticks || 0) + 1;
      if (document.hidden || STRIP.paused || !STRIP.tiles.length) return;
      var host = $("sp-strip"); if (!host) return;
      /* Only work while the strip is on screen. This is the whole reason the
         loop is cheap, and it is also why the strip looked dead the first
         time it was measured: on a short viewport the masthead, the nav and a
         three-line banner had pushed it past the fold, so it was correctly
         doing nothing. The counters stay because a render loop that decides
         to skip needs to be able to say so. */
      var r = host.getBoundingClientRect();
      STRIP.rect = Math.round(r.top) + ".." + Math.round(r.bottom) +
                   " in " + window.innerHeight;
      if (r.bottom < -40 || r.top > window.innerHeight + 40) {
        STRIP.offscreen = (STRIP.offscreen || 0) + 1; return;
      }
      if (ts - last < 28) return;            /* cap the whole loop near 35fps */
      last = ts;

      /* two originals per frame, round robin */
      for (var k = 0; k < 2 && STRIP.live; k++) {
        var t = STRIP.tiles[STRIP.cursor % STRIP.live];
        STRIP.cursor++;
        if (!t || t.broken) continue;
        STRIP.renders = (STRIP.renders || 0) + 1;
        t.p = (t.p + 0.013) % 1;
        /* A swallowed exception in a render loop is the worst kind: the strip
           simply stays dark and nothing anywhere says why. It is recorded, and
           a tile that has thrown is dropped from the rotation rather than
           retried sixty times a second. */
        try {
          window.SPStage.renderTo(t.cv, TILE_W, TILE_H, t.spec.sel, C,
                                  t.p, t.spec.force || null);
        } catch (e) {
          STRIP.lastError = t.spec.label + ": " + (e && e.message || e);
          t.broken = true;
        }
        var mirror = STRIP.tiles[t.idx + STRIP.live];
        if (mirror) {
          try {
            var mc = mirror.cv.getContext("2d");
            mc.clearRect(0, 0, TILE_W, TILE_H);
            mc.drawImage(t.cv, 0, 0);
          } catch (e) {}
        }
      }

      /* the scroll, and its seamless wrap at the halfway point */
      if (!STRIP.dragging) {
        host.scrollLeft += 0.55;
        var half = host.scrollWidth / 2;
        if (half > 10 && host.scrollLeft >= half) host.scrollLeft -= half;
      }

      /* re-roll a tile that nobody can see, so the strip is never twice the
         same without anything ever changing in front of a reader */
      if (Date.now() - STRIP.lastRoll > 6500) {
        STRIP.lastRoll = Date.now();
        rollOne(host);
      }
    }
    STRIP.raf = requestAnimationFrame(frame);
  }
  function rollOne(host) {
    var avail = poolAvailable();
    if (avail.length < 4 || !STRIP.live) return;
    var hostR = host.getBoundingClientRect();
    var used = STRIP.tiles.slice(0, STRIP.live).map(function (t) { return t.spec.label; });
    /* find an original that is off screen */
    for (var i = 0; i < STRIP.live; i++) {
      var t = STRIP.tiles[(STRIP.seen + i) % STRIP.live];
      var r = t.fig.getBoundingClientRect();
      if (r.right > hostR.left - 20 && r.left < hostR.right + 20) continue;
      var spec = pickSpec(avail, used);
      if (!spec) return;
      t.spec = spec;
      t.cap.textContent = spec.label;
      t.cv.setAttribute("aria-label", spec.label);
      t.p = 0;
      var m = STRIP.tiles[t.idx + STRIP.live];
      if (m) { m.spec = spec; m.cap.textContent = spec.label;
               m.cv.setAttribute("aria-label", spec.label); }
      STRIP.seen = (STRIP.seen + i + 1) % STRIP.live;
      return;
    }
  }

  /* ---- the storyboard ---------------------------------------------------- */
  function shotLabel(sh) {
    if (sh.label) return sh.label;
    if (sh.doc) return (sh.name || "Scene") + " — " +
      (sh.doc.layers || []).length + " layers";
    var names = (sh.sel || []).map(function (id) {
      var n = window.SPNodes.byId(id); return n ? n.label : id; });
    return names.slice(0, 3).join(" + ") + (names.length > 3 ? " +" + (names.length - 3) : "");
  }
  function addShot() {
    /* In Director mode the shot is the whole document, not the selection:
       what the user has composed is what they mean by "this shot", and a
       storyboard that quietly recorded the Auto reading of the same nodes
       instead would be the worst kind of surprise. */
    if (window.SPDirector && window.SPDirector.on()) {
      var d = window.SPDirector.snapshot();
      if (!d.layers.length) { flash("This document has no layers yet."); return; }
      SHOTS.push({ doc: d, sel: [], seconds: 5,
                   name: d.name || ("Scene " + (SHOTS.length + 1)) });
      refreshShots(); draw(); saveState();
      flash("Added the composition as shot " + SHOTS.length + ".");
      return;
    }
    if (!SEL.length) { flash("Select something first, then add it as a shot."); return; }
    SHOTS.push({ sel: SEL.slice(), force: FORCE, seconds: 5 });
    STORY = true;
    refreshShots(); saveState(); draw();
  }
  function refreshShots() {
    var host = $("sp-shots"); if (!host) return;
    host.innerHTML = "";
    var tot = $("sp-shottotal");
    if (!SHOTS.length) {
      host.appendChild(el("p", "spmuted",
        "No shots yet. Build a selection, then press “Add as a shot”. " +
        "Two or three shots make a reel that holds attention; one makes a card."));
      if (tot) tot.textContent = "";
      var tb = $("sp-storytoggle"); if (tb) tb.hidden = true;
      return;
    }
    SHOTS.forEach(function (sh, i) {
      var row = el("div", "sprow" + (LAST && STORY && LAST.shot === i ? " live" : ""));
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, (i + 1) + ". " + shotLabel(sh)));
      t.appendChild(el("small", null,
        (sh.force ? "pinned: " + sh.force + " · " : "") + sh.sel.length + " node(s)"));
      row.appendChild(t);
      var sec = document.createElement("input");
      sec.type = "number"; sec.min = "1"; sec.max = "30"; sec.value = String(sh.seconds);
      sec.className = "spsec";
      sec.setAttribute("aria-label", "seconds for shot " + (i + 1));
      sec.addEventListener("change", function () {
        sh.seconds = Math.max(1, Math.min(30, +sec.value || 5));
        refreshShots(); saveState(); });
      row.appendChild(sec);
      [["↑", -1], ["↓", 1]].forEach(function (mv) {
        var b = el("button", "sprowx", mv[0]);
        b.type = "button";
        b.setAttribute("aria-label", (mv[1] < 0 ? "move up" : "move down"));
        b.addEventListener("click", function () {
          var j = i + mv[1];
          if (j < 0 || j >= SHOTS.length) return;
          var tmp = SHOTS[i]; SHOTS[i] = SHOTS[j]; SHOTS[j] = tmp;
          refreshShots(); saveState(); draw(); });
        row.appendChild(b);
      });
      var x = el("button", "sprowx", "×");
      x.type = "button"; x.setAttribute("aria-label", "remove shot " + (i + 1));
      x.addEventListener("click", function () {
        SHOTS.splice(i, 1);
        if (!SHOTS.length) STORY = false;
        refreshShots(); saveState(); draw(); });
      row.appendChild(x);
      /* clicking the row loads that shot back into the wall for editing */
      t.style.cursor = "pointer";
      t.addEventListener("click", function () {
        STORY = false;
        var tb2 = $("sp-storytoggle"); if (tb2) tb2.checked = false;
        /* a Director shot opens back into Director with its own layers, an
           Auto shot back onto the wall — editing a shot means getting the
           thing you made, in the mode you made it in */
        if (sh.doc && window.SPDirector) {
          window.SPDirector.newDoc(sh.doc);
          window.SPDirector.setOn(true);
          if (window.SPDirUI) window.SPDirUI.refresh(true);
        } else {
          SEL = (sh.sel || []).slice(); FORCE = sh.force || null;
          if (window.SPDirector && window.SPDirector.on()) {
            window.SPDirector.setOn(false);
            if (window.SPDirUI) window.SPDirUI.refresh(true);
          }
        }
        refreshWall(); refreshTray(); refreshShots(); draw(); });
      host.appendChild(row);
    });
    if (tot) tot.textContent = "Reel length " +
      window.SPStage.storyTotal(SHOTS) + " s across " + SHOTS.length + " shot(s).";
    var tb3 = $("sp-storytoggle");
    if (tb3) { tb3.hidden = false; tb3.checked = STORY; }
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
    /* and render at about the resolution it is actually displayed at, rather
       than at export size. Two device pixels per CSS pixel is the point past
       which nobody can tell; beyond that it is only heat. */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var want = Math.max(0.25, Math.min(1, (w * dpr) / r.w));
    if (Math.abs(want - window.SPStage.S.quality) > 0.04) {
      window.SPStage.S.quality = want;
      window.SPStage.resize();
    }
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
    /* the Director inspector offers "set this layer to the wall selection",
       so it is stale the moment the wall changes */
    if (window.SPDirUI) window.SPDirUI.refresh();
    saveState();
  }
  function flash(msg) {
    var f = $("sp-flash"); if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3200);
  }

  /* ---- playback ---------------------------------------------------------- */
  /* The preview is throttled and adapts. A reel is recorded at thirty frames
     a second by the recorder, which drives its own clock; the PREVIEW only has
     to look like motion, and a phone that cannot hold thirty is better off
     drawing twenty good frames than queueing sixty it will never finish. */
  var FPS_TARGET = 30, lastFrame = 0, slowRun = 0;
  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var now = performance.now();
    if (now - lastFrame < 1000 / FPS_TARGET - 1) return;
    lastFrame = now;
    var el2 = (Date.now() - T0) / 1000;
    window.SPStage.S.p = (el2 % DUR) / DUR;
    var t0 = performance.now();
    drawFrame();
    var cost = performance.now() - t0;
    /* back off when the device cannot keep up, and creep back when it can */
    if (cost > 1000 / FPS_TARGET) { if (++slowRun > 3 && FPS_TARGET > 12) {
      FPS_TARGET -= 4; slowRun = 0; } }
    else if (--slowRun < -40 && FPS_TARGET < 30) { FPS_TARGET += 2; slowRun = 0; }
    /* the two cheap DOM writes, which are single attributes rather than a
       rebuild, and only a few times a second */
    if (!tick.ui || now - tick.ui > 120) {
      tick.ui = now;
      var sc = $("sp-scrub");
      if (sc) sc.value = String(Math.round(window.SPStage.S.p * 1000));
      showTime();
    }
  }
  /* where the playhead is, in seconds — the slider alone does not say, and
     on a phone the thumb is often under a finger */
  function showTime() {
    var t = $("sp-time"); if (!t) return;
    t.textContent = (window.SPStage.S.p * DUR).toFixed(1) + " / " + DUR + " s";
  }
  function play(on) {
    /* belt as well as braces: the buttons are disabled during a recording,
       but the keyboard and any future caller are not */
    if (on && window.SPStage.isRecording()) return;
    PLAY = on;
    /* a storyboard plays for its own total, not the single-shot length */
    if (STORY && SHOTS.length) DUR = window.SPStage.storyTotal(SHOTS);
    else { var d = $("sp-dur"); if (d) DUR = +d.value; }
    var b = $("sp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    /* One animation loop at a time. The sample strip and the stage both
       drawing on a phone is the difference between motion and a slideshow. */
    STRIP.paused = on || STRIP.hover;
    if (on) {
      FPS_TARGET = 30; slowRun = 0; lastFrame = 0;
      T0 = Date.now() - window.SPStage.S.p * DUR * 1000;
      tick();
    } else {
      if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
      var sc2 = $("sp-scrub");
      if (sc2) sc2.value = String(Math.round(window.SPStage.S.p * 1000));
      showTime();
      draw();                      /* one full pass, to resync the panels */
    }
  }

  /* ---- persistence: the selection survives a reload ---------------------- */
  function saveState() {
    try {
      localStorage.setItem("nirayana.studiopro", JSON.stringify({
        sel: SEL, ratio: window.SPStage.S.ratio, pal: window.SPStage.S.pal,
        safe: window.SPStage.S.safe, head: window.SPStage.S.headline,
        sub: window.SPStage.S.sub, shots: SHOTS, story: STORY,
        place: PLACE,
        /* the working document, so an afternoon of layer work is not lost to
           a reload; the named library is separate and explicit */
        dir: (window.SPDirector && window.SPDirector.on())
               ? window.SPDirector.snapshot() : null }));
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
      if (o.place && o.place.lat != null) PLACE = asPlace(o.place);
      if (o.shots && o.shots.length) {
        SHOTS = o.shots.filter(function (sh) {
          return sh && ((sh.sel && sh.sel.length) || sh.doc); });
        STORY = !!o.story && SHOTS.length > 0;
      }
      if (o.dir && o.dir.layers && o.dir.layers.length && window.SPDirector) {
        window.SPDirector.newDoc(o.dir);
        window.SPDirector.setOn(true);
      }
    } catch (e) {}
  }

  /* ---- export ------------------------------------------------------------ */
  function savePng() {
    var cv = $("sp-canvas");
    /* the preview is deliberately low-resolution; a saved frame is not — and
       it goes through frameAt, so what is saved is whatever mode is showing
       rather than always the Auto composition */
    window.SPStage.withFullSize(function () {
      window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE, shotsNow(), true);
    });
    cv.toBlob(function (b) {
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      draw();                      /* back to the preview size */
    }, "image/png");
  }
  /* The transport, while a recording owns the playhead.

     Everything that writes S.p is turned off for the duration and visibly so.
     The Record button becomes the way out, because "Stop" is what somebody
     wants when they decide thirty seconds was too long. */
  function setTransport(recording) {
    [["sp-play", true], ["sp-scrub", true], ["sp-dur", true],
     ["sp-png", true], ["sp-addshot", true], ["sp-clear", true]]
      .forEach(function (pair) {
        var e = $(pair[0]); if (e) e.disabled = recording; });
    var b = $("sp-rec");
    if (b) b.className = "spbtn primary" + (recording ? " rec" : "");
  }
  function saveVideo() {
    var btn = $("sp-rec"); if (!btn) return;
    /* a second press is "stop", not a second recording */
    if (window.SPStage.isRecording()) {
      window.SPStage.cancelRecording();
      btn.textContent = "Stopping…";
      return;
    }
    var was = "Record the reel";
    var keepP = window.SPStage.S.p;
    play(false);
    setTransport(true);
    btn.textContent = "Stop (0%)";
    var what = (STORY && SHOTS.length) ? SHOTS : SEL;
    /* a recording is the artefact, so it is captured at export size */
    var qKeep = window.SPStage.S.quality;
    window.SPStage.S.quality = 1; window.SPStage.resize();
    window.SPStage.record(what, C, DUR, 30, FORCE, function (f) {
      btn.textContent = "Stop (" + Math.round(f * 100) + "%)";
    }).then(function (res) {
      setTransport(false); btn.textContent = was;
      window.SPStage.S.quality = qKeep; window.SPStage.resize();
      /* put the playhead back where the reader left it, rather than at the
         end of the recording */
      window.SPStage.S.p = keepP;
      var sc = $("sp-scrub"); if (sc) sc.value = String(Math.round(keepP * 1000));
      draw();
      if (res.cancelled && res.madeSeconds < 1) {
        flash("Recording stopped — nothing long enough to save.");
        return;
      }
      var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      var u = URL.createObjectURL(res.blob), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
      flash(res.cancelled
        ? "Stopped at " + res.madeSeconds.toFixed(1) + " s — saved what was made."
        : "Recorded " + res.seconds + " s, " +
          Math.round(res.blob.size / 1024) + " KB.");
    }).catch(function (e) {
      setTransport(false); btn.textContent = was;
      window.SPStage.S.quality = qKeep; window.SPStage.resize();
      window.SPStage.S.p = keepP; draw();
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
    refreshShots();

    /* mode banner: a chart, or live only */
    var mode = $("sp-mode");
    if (mode) {
      if (C.J) mode.textContent = "Reading the chart stored in this browser" +
        (C.birth && C.birth.name ? " — " + C.birth.name : "") +
        ". Everything on the wall is available.";
      else {
        mode.textContent = "No chart stored here — the sky, the day and the " +
          "divisions all work; chart-only chips are greyed. Build one on the " +
          "Kundli page to unlock them.";
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
      window.SPStage.S.p = (+scrub.value) / 1000; showTime(); drawFrame(); });
    $("sp-play") && $("sp-play").addEventListener("click", function () { play(!PLAY); });
    var dur = $("sp-dur");
    if (dur) dur.addEventListener("change", function () { DUR = +dur.value; showTime(); });
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
    /* the place picker: the site's own, not a second one */
    var ph = $("sp-place");
    if (ph && window.NPlaces) {
      var sv2 = null;
      try { sv2 = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null; }
      catch (e) {}
      var quick = (sv2 ? [sv2] : []);
      if (C.birth && C.birth.lat != null)
        quick = quick.concat([{ n: (C.birth.place || C.birth.name ||
                                    "your chart's place"),
                                lat: C.birth.lat, lon: C.birth.lon,
                                tz: C.birth.tzHours }]);
      quick = quick.concat((window.NP && window.NP.PLACES) || []);
      window.NPlaces.picker({
        host: ph, value: C.place, quick: quick, label: "Place",
        refMs: function () { return C ? C.when : Date.now(); },
        onPick: applyPlace
      });
    } else if (ph) {
      ph.appendChild(el("p", "spmuted",
        "The city list did not load, so the place cannot be changed here."));
    }

    var when = $("sp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        refreshWall(); refreshTray(); draw();
        if (window.SPDirUI) window.SPDirUI.refresh();
      });
    }
    var span = $("sp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); draw(); });
    /* the strip: pause on hover so a tile can be read, and on drag so it can
       be scrubbed by hand */
    var strip = $("sp-strip");
    if (strip) {
      strip.addEventListener("mouseenter", function () {
        STRIP.hover = true; STRIP.paused = true; });
      strip.addEventListener("mouseleave", function () {
        STRIP.hover = false; STRIP.paused = PLAY; });
      strip.addEventListener("pointerdown", function () { STRIP.dragging = true; });
      window.addEventListener("pointerup", function () { STRIP.dragging = false; });
      strip.addEventListener("touchstart", function () {
        STRIP.hover = true; STRIP.paused = true; }, { passive: true });
    }
    var sh = $("sp-shuffle");
    if (sh) sh.addEventListener("click", function () { buildStrip(); });

    $("sp-addshot") && $("sp-addshot").addEventListener("click", addShot);
    var tog = $("sp-storytoggle");
    if (tog) tog.addEventListener("change", function () {
      STORY = tog.checked; window.SPStage.S.p = 0; refreshShots(); draw(); saveState(); });
    $("sp-clearshots") && $("sp-clearshots").addEventListener("click", function () {
      SHOTS = []; STORY = false; refreshShots(); draw(); saveState(); });
    $("sp-png") && $("sp-png").addEventListener("click", savePng);
    $("sp-rec") && $("sp-rec").addEventListener("click", saveVideo);

    /* DIRECTOR MODE. The panel is handed the few things it cannot work out
       for itself — what is selected on the wall, which context to resolve
       against, how long the reel is, and how to ask for a redraw. It is given
       functions rather than values because every one of them changes while
       the panel is open, and a panel holding a stale copy of the context
       would resolve nodes against last week. */
    if (window.SPDirUI) {
      window.SPDirUI.mount({
        draw: draw,
        drawFrame: drawFrame,
        ctx: function () { return C; },
        sel: function () { return SEL.slice(); },
        force: function () { return FORCE; },
        headline: function () { return window.SPStage.S.headline; },
        subline: function () { return window.SPStage.S.sub; },
        duration: function () { return DUR; },
        lastReport: function () { return LAST; },
        save: saveState,
        flash: flash
      });
    }

    /* the list of what is deliberately missing */
    var ab = $("sp-absent");
    if (ab) window.SPNodes.absent.forEach(function (a) {
      var li = el("li");
      li.appendChild(el("b", null, a.what));
      li.appendChild(document.createTextNode(" — " + a.why));
      ab.appendChild(li);
    });

    window.addEventListener("resize", function () { fitPreview(); });
    showTime();
    draw();
    buildStrip();
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
      shots: function () { return SHOTS.slice(); },
      addShot: function () { addShot(); return SHOTS.length; },
      setStory: function (on) { STORY = on; refreshShots(); draw(); return STORY; },
      nodeCount: function () { return window.SPNodes.all().length; },
      strip: function () { return { live: STRIP.live, tiles: STRIP.tiles.length,
        raf: !!STRIP.raf, paused: STRIP.paused, hidden: document.hidden,
        lastError: STRIP.lastError || null,
        ticks: STRIP.ticks || 0, renders: STRIP.renders || 0,
        offscreen: STRIP.offscreen || 0, rect: STRIP.rect || null,
        broken: STRIP.tiles.filter(function (t) { return t.broken; })
                  .map(function (t) { return t.spec.label; }) }; },
      stripSpecs: function () {
        return STRIP.tiles.slice(0, STRIP.live).map(function (t) {
          return t.spec.label; }); },
      rollStrip: function () { rollOne($("sp-strip")); return this.stripSpecs(); },
      poolSize: function () { return poolAvailable().length; },
      place: function () { return C && C.place; },
      pickPlace: function (p) { return applyPlace(p); },
      placeInputs: function () {
        var h = $("sp-place");
        return h ? h.querySelectorAll("input").length : 0; },
      /* Director: drive the mode and the document without a mouse, and read
         back what the frame path actually did */
      dir: function () { return window.SPDirector; },
      dirOn: function () { return !!(window.SPDirector && window.SPDirector.on()); },
      take: function (how) {
        var b = $(how === "split" ? "sp-takesplit"
               : how === "solo" ? "sp-takesolo"
               : how === "blank" ? "sp-takeblank" : "sp-takeone");
        if (b) b.click();
        return window.SPDirector ? window.SPDirector.doc() : null;
      },
      setAuto: function () {
        var bs = document.querySelectorAll("#sp-modebar .spv");
        if (bs.length) bs[0].click();
        return !!(window.SPDirector && window.SPDirector.on());
      },
      /* the frame as the EXPORT path makes it — frameAt with no overlay, which
         is what savePng and the recorder call */
      exportFrame: function (p) {
        window.SPStage.S.p = p == null ? window.SPStage.S.p : p;
        return window.SPStage.frameAt(SEL, C, window.SPStage.S.p, FORCE,
                                      shotsNow(), true);
      },
      /* the frame as the SCREEN makes it — the same, plus the handles */
      screenFrame: function (p) {
        if (p != null) window.SPStage.S.p = p;
        drawFrame();
        return LAST;
      },
      refreshDir: function (deep) {
        if (window.SPDirUI) window.SPDirUI.refresh(deep); },
      duration: function () { return DUR; },
      playing: function () { return PLAY; }
    };
  } catch (e) {}
})();
