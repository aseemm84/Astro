/* ===== the master settings panel =========================================

   One overlay, reachable from every page, holding the settings that used to
   live on whichever page happened to need them. Before this, the ayanāṃśa and
   the bhāva frame were controls on the Kundli form, the sunrise convention was
   a control on the pañcāṅga views, and the theme was a picker in the nav —
   four places, three storage schemes, and no single answer to "what is this
   site set to".

   WHY IT IS CONCATENATED INTO site.js RATHER THAN SHIPPED AS ITS OWN FILE.
   site.js is referenced by the shell, so it is already on all 65 pages, in the
   desktop app's file table, and in the service worker's precache list. A new
   shared file would have had to be added to each of those three by hand, and
   the one that gets forgotten is the service worker — which then serves a
   previous build's pages against a new build's script. One source file for
   editing, one shipped file for reliability.

   THE STORE. A single JSON object under nirayana.settings, with one
   exception: the theme stays in its own key and is read and written only
   through window.NTheme. Two writers for one setting is how they drift, and
   theme.js has to run before first paint, which this file does not.

   The sunrise convention is ALSO written to nirayana.riseconv, the key
   panchanga.js and now.js already read on their own. That is deliberate
   duplication with one writer: this file writes both, those files keep
   reading the key they always read, and nothing downstream had to change.

   EVERY TOUCH OF localStorage IS WRAPPED. This site runs from a folder of
   files as happily as from a server; in a private window or with site data
   blocked, reading throws. A store that cannot be read means defaults, not a
   broken page — the same rule theme.js states. */

(function () {
  "use strict";

  var KEY = "nirayana.settings";
  var RISEKEY = "nirayana.riseconv";

  /* The defaults: the Samanvaya–Ecliptic ayanāṃśa and Śrīpati bhāva-chalita
     (chosen as the site's defaults in November 2026; before that they were
     Lahiri and whole-sign), mean nodes, upper-limb sunrise, degrees-and-minutes,
     and cautions shown. A reader's own stored choice always wins: only a reader
     who has never chosen gets these. Whole-sign and Lahiri stay one click away. */
  var DEF = { ayan: "samanvaya_ecliptic", house: "sripati", node: "mean",
              riseconv: "limb", degfmt: "dm", caution: "on",
              /* the engine that places the grahas, and the frame a Siddhānta
                 engine's positions are read in (engine.js, "THE ENGINE") */
              engine: "modern", ssframe: "own" };

  var OPTS = {
    house: [["whole", "Whole-sign — rāśi is bhāva, from the lagna (BPHS)"],
            ["sripati", "Śrīpati bhāva-chalita — trisected quadrants (later tradition)"]],
    node:  [["mean", "Mean node — the averaged lunar node (BPHS's reckoning)"],
            ["true", "True node — the osculating node"]],
    riseconv: [["limb", "Upper limb with refraction — the almanac convention"],
               ["centre", "Centre of the disc with refraction"],
               ["geom", "Geometric horizon, no refraction"]],
    degfmt: [["dm", "Degrees and minutes — 12°34′"],
             ["dms", "Degrees, minutes, seconds — 12°34′56″"],
             ["dec", "Decimal degrees — 12.5822°"]],
    engine: [["modern", "Modern ephemeris — astronomy-engine, checked against professional references"],
             ["ss", "Sūrya Siddhānta — as written, with the text's own numbers"],
             ["ssfit", "Sūrya Siddhānta — fitted: the text's equations, constants fitted to the modern sky"]],
    ssframe: [["own", "The engine's own zero — the text's for 'as written', Lahiri for 'fitted'"],
              ["ayan", "The ayanāṃśa chosen above"]],
    caution: [["on", "Show rectification cautions"],
              ["off", "Hide them — I know the birth time is approximate"]]
  };

  function clamp(k, v) {
    if (k === "ayan") return (typeof v === "string" && v) ? v : DEF.ayan;
    var L = OPTS[k]; if (!L) return DEF[k];
    for (var i = 0; i < L.length; i++) if (L[i][0] === v) return v;
    return DEF[k];
  }

  var cache = null;
  function get() {
    if (cache) return cache;
    var o = {};
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) o = JSON.parse(raw) || {};
    } catch (e) { o = {}; }
    var out = {};
    Object.keys(DEF).forEach(function (k) { out[k] = clamp(k, o[k]); });
    /* a riseconv written by the pañcāṅga pages before this panel existed is
       the reader's real choice and must not be overwritten by the default */
    if (o.riseconv == null) {
      try {
        var rc = window.localStorage.getItem(RISEKEY);
        if (rc) out.riseconv = clamp("riseconv", rc);
      } catch (e) {}
    }
    cache = out;
    return out;
  }

  function set(patch, opts) {
    var cur = get(), next = {}, changed = [];
    Object.keys(DEF).forEach(function (k) { next[k] = cur[k]; });
    Object.keys(patch || {}).forEach(function (k) {
      if (!(k in DEF)) return;
      var v = clamp(k, patch[k]);
      if (v !== next[k]) { next[k] = v; changed.push(k); }
    });
    if (!changed.length) return { changed: [], settings: next };
    cache = next;
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    if (changed.indexOf("riseconv") >= 0) {
      /* write the legacy key AND tell panchanga.js, which caches its own copy
         and clears a derived cache when it is told — setting the key alone
         would leave this tab computing yesterday's sunrise */
      try { window.localStorage.setItem(RISEKEY, next.riseconv); } catch (e) {}
      try { if (window.NP && window.NP.setConv) window.NP.setConv(next.riseconv); } catch (e) {}
    }
    if (!(opts && opts.silent)) broadcast(changed, next);
    return { changed: changed, settings: next };
  }

  /* The caution setting is expressed as an attribute on <html> so that CSS
     does the hiding and no section has to ask. A note opts in by carrying
     .krect — there is no single caution marker in the report today, so this
     reaches the notes that have been marked and nothing else, which is what
     the panel claims and no more. */
  function applyAttrs(s) {
    try {
      var h = document.documentElement;
      if (s.caution === "off") h.setAttribute("data-caution", "off");
      else h.removeAttribute("data-caution");
      h.setAttribute("data-degfmt", s.degfmt);
    } catch (e) {}
  }

  function broadcast(changed, s) {
    applyAttrs(s);
    try {
      window.dispatchEvent(new CustomEvent("nirayana:settings",
        { detail: { changed: changed, settings: s } }));
    } catch (e) {}
  }

  /* ---- the overlay ------------------------------------------------------
     Built in JS and appended to <body> on every page, rather than written
     into the shell: the shell is one line shared by 65 pages and a markup
     block there is 65 copies of the same thing to keep in step. */
  var EL = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function row(k, label, note, list) {
    var s = get(), o = "";
    (list || OPTS[k]).forEach(function (p) {
      o += '<option value="' + esc(p[0]) + '"' + (p[0] === s[k] ? " selected" : "") +
           ">" + esc(p[1]) + "</option>";
    });
    return '<div class="nsrow"><label for="nset-' + k + '">' + esc(label) + '</label>' +
      '<select id="nset-' + k + '" data-nset="' + k + '">' + o + '</select>' +
      (note ? '<p class="nsnote">' + note + "</p>" : "") + "</div>";
  }

  /* Does this page hold the engine that would act on a casting setting?
     __ayanModes is published by engine.js, so its absence means the page can
     store a value but cannot recast anything with it. */
  function hasEngine() { return !!window.__ayanModes; }

  /* CAN THIS PAGE ACT ON THIS PARTICULAR SETTING?
   *
     Having the engine is not the same as honouring every setting, and the
     Sunrise row is the case that proves it: buildLocalChart() does not read
     riseconv AT ALL — the convention re-dates the pañcāṅga, not a natal
     chart. So the dashboard, which now carries the engine and recasts on
     ayanāṃśa, bhāva frame and node, still cannot act on Sunrise, and a live
     picker for it there would be the dead control this file refuses
     everywhere else.
   *
     A page may therefore declare window.__nsHonours, the keys it can really
     act on; anything outside that list renders frozen. Pages that declare
     nothing keep exactly the previous behaviour — engine present means the
     casting rows are live — so this adds a way to be more honest without
     changing any page that has not opted in. */
  function canHonour(key) {
    var L = window.__nsHonours;
    if (L && L.indexOf) return L.indexOf(key) >= 0;
    return hasEngine();
  }

  /* A setting shown but not offered, for pages that cannot act on it.
   *
     WHY NOT JUST SHOW THE PICKER. A <select> that stores a value this page
     will never apply is "a switch that visibly does nothing", which the note
     by the degfmt row below already refuses on this project's behalf. The
     dashboard is the case that forced this: it renders a chart cast
     elsewhere and recomputes nothing, so a bhāva-frame picker there would
     change a stored key and not one pixel of the chart in front of you.
   *
     Where the page knows what the chart it is SHOWING was actually cast with,
     it publishes window.__nsCastWith and that is named too — on a renderer
     the useful fact is the convention in force for this chart, which need not
     be the one in the store. */
  function frozenRow(label, value, key) {
    var cast = window.__nsCastWith || null;
    var shown = cast && cast[key] != null ? String(cast[key]) : null;
    return '<div class="nsrow"><label>' + esc(label) + '</label>' +
      '<p class="nsnote">' +
      (shown
        ? 'The chart on this page was cast with <b>' + esc(shown) + '</b>. '
        : '') +
      'Your stored setting is <b>' + esc(value) + '</b>. This page renders a ' +
      'chart it did not compute, so changing this here would alter the setting ' +
      'and not the chart — open this panel from the Kundli builder, the ' +
      'Workstation or the Ayanāṃśa page to change it and recast.' +
      '</p></div>';
  }

  function ayanRow() {
    var M = window.__ayanModes, s = get();
    if (!M || !canHonour("ayan")) {
      /* the engine is not on this page, so the list cannot be built from it.
         Offering a hand-written list here would be a second list to keep in
         step with AYAN_MODES — the exact bug the Kundli picker's comment
         records. The stored value is shown and left alone instead. */
      return frozenRow("Ayanāṃśa", s.ayan, "ayan");
    }
    var fams = window.__ayanFamilies, done = {}, o = "";
    function opt(k) {
      done[k] = 1; var m = M[k]; if (!m) return "";
      return '<option value="' + esc(k) + '"' + (k === s.ayan ? " selected" : "") +
             ">" + esc(m.name) + "</option>";
    }
    if (fams && fams.length) fams.forEach(function (f) {
      var inner = f[2].filter(function (k) { return M[k]; }).map(opt).join("");
      if (inner) o += '<optgroup label="' + esc(f[0]) + '">' + inner + "</optgroup>";
    });
    var rest = Object.keys(M).filter(function (k) { return !done[k]; }).map(opt).join("");
    if (rest) o += '<optgroup label="Other">' + rest + "</optgroup>";
    return '<div class="nsrow"><label for="nset-ayan">Ayanāṃśa</label>' +
      '<select id="nset-ayan" data-nset="ayan">' + o + "</select>" +
      '<p class="nsnote">Where sidereal zero sits. A <b>convention, not a measurement</b>: ' +
      'the nineteen offered span about 5° today, so they give different charts rather than ' +
      'refinements of one. Lahiri is the Indian civil standard and everything on this site ' +
      'is validated against it.</p></div>';
  }

  function build() {
    if (EL || !document.body) return;
    EL = document.createElement("div");
    EL.className = "nsover";
    EL.setAttribute("hidden", "");
    EL.innerHTML =
      '<div class="nsback" data-nset-close="1"></div>' +
      '<div class="nspanel" role="dialog" aria-modal="true" aria-labelledby="nset-h">' +
        '<div class="nshead"><h2 id="nset-h">Settings</h2>' +
          '<button type="button" class="nsx" data-nset-close="1" aria-label="Close settings">×</button></div>' +
        '<div class="nsbody">' +
          '<p class="nsnote nslede">These apply to <b>the whole site</b> — every page and ' +
          'every new chart, in the browser and in the desktop app. They are kept in this ' +
          'browser only and nothing is sent anywhere.</p>' +

          '<h3>Reckoning</h3>' +
          ayanRow() +
          (canHonour("house") ? row("house", "Bhāva frame (house system)",
            'Decides how every bhāva is reckoned — which bhāva each graha occupies, which ' +
            'rāśi gives each bhāva its lord, and the strengths that follow. Whole-sign is ' +
            'what BPHS uses. Under Śrīpati a bhāva can span two rāśis and its lord is taken ' +
            'from the rāśi holding the <i>madhya</i>. Divisional charts have no cusps of ' +
            'their own, so they keep whole-sign houses and carry the rāśi chart’s bhāva ' +
            'alongside, labelled.')
            : frozenRow("Bhāva frame (house system)", get().house, "house")) +
          (canHonour("node") ? row("node", "Lunar nodes",
            'BPHS reckons Rāhu and Ketu as the mean node. The true node can sit up to about ' +
            '1½° away.')
            : frozenRow("Lunar nodes", get().node, "node")) +
          (canHonour("engine") ? row("engine", "Engine",
            'Which calculation places the nine grahas, for every page and every new chart. ' +
            '<b>Modern</b> is today’s astronomy. <b>Sūrya Siddhānta as written</b> computes ' +
            'the way the classical text does, with its own numbers, and today lands up to several ' +
            'degrees from the modern sky. <b>Fitted</b> keeps the text’s equations but uses ' +
            'constants fitted to the modern sky, the way later astronomers applied bīja corrections. ' +
            'Signs, nakṣatras, daśās, strengths and the pañcāṅga follow the engine. Sunrise, the ' +
            'clock behind the lagna, eclipse searches and drawings of the physical solar system ' +
            'stay modern, because the Siddhānta engine does not model them in a form that can be ' +
            'substituted. Any page can choose its own engine. ' +
            '<a href="engine-lab.html">Engine Lab</a> compares the three.')
            : frozenRow("Engine", get().engine, "engine")) +
          (canHonour("engine") ? row("ssframe", "Siddhānta frame",
            'Only used when a Sūrya Siddhānta engine is chosen. <b>Own zero</b> keeps the ' +
            'text’s positions as it gives them; the lagna is converted with the text’s own ' +
            'ayanāṃśa so the chart stays in one frame. <b>The ayanāṃśa chosen above</b> carries ' +
            'the text’s positions into that convention instead.')
            : "") +
          (canHonour("riseconv") ? row("riseconv", "Sunrise",
            'Re-dates everything downstream: the vāra, the ghaṭī count, which tithi is ' +
            'today’s, and therefore which day a festival lands on.')
            : frozenRow("Sunrise", get().riseconv, "riseconv")) +

          '<h3>Presentation</h3>' +
          /* no <label> here: theme.js brings its own (.themepickl), and two
             would read as two settings.
           *
             On a page without theme.js the slot would stay empty and the row
             would be a heading and a note with no control. That happens on the
             four adopted pages, which carry their own styling and load neither
             theme.js nor theme.css. Inlining theme.js there was tried and
             rejected: the picker set the attribute but nothing moved, because
             the token overrides are in theme.css — and dashboard.html has its
             own light/dark system on the same data-theme attribute, which a
             stored site palette would have fought. So the row says what
             governs the palette there instead of offering a dead picker. */
          (window.NTheme
            ? '<div class="nsrow" id="nset-theme-slot">' +
                '<p class="nsnote">Palette for the whole site. The desktop app follows ' +
                'the system appearance until a choice is made here.</p></div>'
            : '<div class="nsrow"><label>Palette</label>' +
                '<p class="nsnote">This page carries its own styling rather than the ' +
                'site stylesheet, so the site palette does not reach it and is not ' +
                'offered here. Any theme control on the page itself governs how it ' +
                'looks. Choose a site palette from any other page and it applies ' +
                'everywhere that does use the site stylesheet.</p></div>') +
          row("degfmt", "Degrees",
            'Applies to the chart report and to the visual dashboard, which redraws ' +
            'itself when you change it. The standalone visualisation pages (Ayanāṃśa, ' +
            'the labs, Divisions) each format their own figures to suit their own scale ' +
            'and are <b>not</b> changed by this — thirteen different formatters exist ' +
            'across the site and they round differently on purpose. Where a page does ' +
            'follow it, its own rounding is kept, so the default setting prints exactly ' +
            'the figures that page has always printed.') +
          /* NO "rectification cautions" ROW, deliberately, though the store and
             the data-caution attribute below support one. The site's birth-time
             caveats are not standalone notes: they are clauses inside
             informative paragraphs ("...all are as reliable as the recorded
             birth time", "...a birth time a few minutes out would move it
             back"). Hiding them would mutilate the sentence and take real
             content with it. Separating caveat from content across those
             sections is editorial work, not a toggle. The plumbing is in place
             so a note can opt in with class="krect" and the row can be added
             the moment there is something for it to act on — shipping the
             control before then would be a switch that visibly does nothing,
             which is the thing this project refuses to do elsewhere. */

          '<div class="nsfoot">' +
            '<button type="button" class="nsbtn" data-nset-reset="1">Reset to defaults</button>' +
            '<span class="nsnote nsfootnote">Changes apply at once. A chart already on screen ' +
            'is offered a re-cast rather than silently recomputed.</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(EL);

    EL.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-nset-close")) { close(); return; }
      if (t && t.getAttribute && t.getAttribute("data-nset-reset")) {
        set(DEF); refresh(); return;
      }
    });
    EL.addEventListener("change", function (e) {
      var t = e.target, k = t && t.getAttribute && t.getAttribute("data-nset");
      if (!k) return;
      set.call(null, (function () { var p = {}; p[k] = t.value; return p; })());
    });
    /* Escape closes, and focus goes back to the button that opened it —
       otherwise a keyboard reader is left at the top of the document */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && EL && !EL.hasAttribute("hidden")) close();
    });
    /* theme.js mounts its own control into this slot when the panel exists,
       so there is still exactly one theme picker on the page */
    try { if (window.NTheme && window.NTheme.mountInto) window.NTheme.mountInto("nset-theme-slot"); }
    catch (e) {}
  }

  function refresh() {
    if (!EL) return;
    Object.keys(DEF).forEach(function (k) {
      var el = document.getElementById("nset-" + k);
      if (el) el.value = get()[k];
    });
  }

  var opener = null;
  function open() {
    build(); if (!EL) return;
    opener = document.activeElement;
    refresh();
    EL.removeAttribute("hidden");
    var f = EL.querySelector("select, button");
    if (f) try { f.focus(); } catch (e) {}
  }
  function close() {
    if (!EL) return;
    EL.setAttribute("hidden", "");
    if (opener && opener.focus) try { opener.focus(); } catch (e) {}
  }

  /* ---- the trigger, in the nav beside the theme picker's old home ------- */
  function mount() {
    if (document.querySelector(".nsopen")) return;
    /* Not every page has nav.site. The dashboard has its own chrome
       (nav.adchrome) and the panel has to be reachable there too, so the host
       is the first of several candidates and, failing all of them, a floating
       button — a settings panel that exists on sixty-four pages out of
       sixty-five is a settings panel the reader cannot trust. The dashboard
       had no theme picker at all before this, because theme.js looks only for
       nav.site; mounting the panel there gives it one. */
    var nav = document.querySelector("nav.site")
           || document.querySelector("nav.adchrome .adchrome-links")
           || document.querySelector("nav.adchrome")
           || document.querySelector("nav");
    var floating = false;
    if (!nav) { nav = document.body; floating = true; }
    if (!nav) return;
    var b = document.createElement("button");
    if (floating) b.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:9998";
    b.type = "button";
    b.className = "nsopen";
    b.setAttribute("aria-label", "Site settings");
    b.innerHTML = "⚙ Settings";
    b.addEventListener("click", open);
    nav.appendChild(b);
    build();
  }

  /* another tab changing the settings should change this one: the reader
     thinks of it as one site, not one site per tab */
  try {
    window.addEventListener("storage", function (e) {
      if (!e || (e.key !== KEY && e.key !== RISEKEY)) return;
      cache = null; refresh(); broadcast(Object.keys(DEF), get());
    });
  } catch (e) {}

  applyAttrs(get());
  if (document.readyState === "loading")
    /* wrapped for the same reason theme.js is: mount takes no argument today,
       but a listener passed directly receives the Event, and that is how
       theme.js's nav became an event object. Cheap insurance. */
    document.addEventListener("DOMContentLoaded", function () { mount(); });
  else mount();

  /* ---- the almanac pages' own ayanāṃśa ------------------------------------
     Now, Calendar, Star wheel and Studio name nakṣatras, yogas and solar
     months. They follow the ayanāṃśa above by default, and each carries its
     own override so a reader can keep one page on another convention — Lahiri,
     to match a printed almanac, say — without changing the site. Stored per
     page under nirayana.pageAyan. */
  var PAGEKEY = "nirayana.pageAyan";
  function pageName() {
    try { return (location.pathname.split("/").pop() || "index.html").toLowerCase(); }
    catch (e) { return "index.html"; }
  }
  function modes() { return window.__ayanModes || null; }
  function pageOverride() {
    try {
      var m = JSON.parse(window.localStorage.getItem(PAGEKEY) || "{}") || {};
      var v = m[pageName()], M = modes();
      return (v && (!M || M[v])) ? v : null;
    } catch (e) { return null; }
  }
  /* Which pages carry their own picker, and what each starts on, is decided in
     ONE place — engine.js's PAGE_AYAN table, which has to resolve the frame
     before the first position is computed. The almanac pages, Studio Pro, Reel
     Studio, Director Pro and Motion follow the site setting; the Sūrya
     Siddhānta and Engine Lab pages start on Lahiri, the frame their
     comparisons are drawn in. Any of them can be set to another convention for
     that page alone. A page outside the table answers "lahiri", as before. */
  function pageRule() { return window.__pageAyanRule ? window.__pageAyanRule() : null; }
  function almanacAyan() {
    if (window.__pageAyan) { var a = window.__pageAyan(); return a || "lahiri"; }
    var M = modes(), v = pageOverride() || get().ayan;
    return (!M || M[v]) ? v : "samanvaya_ecliptic";
  }
  function setPageAyan(key) {
    try {
      var m = JSON.parse(window.localStorage.getItem(PAGEKEY) || "{}") || {};
      if (key) m[pageName()] = key; else delete m[pageName()];
      window.localStorage.setItem(PAGEKEY, JSON.stringify(m));
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("nirayana:almanac-ayan", { detail: almanacAyan() })); } catch (e) {}
  }
  function ayanName(k) { var M = modes(); return M && M[k] ? M[k].name : k; }
  /* The picker, mounted into #np-ayan. Changing it reloads the page: every
     almanac page derives a great deal from the convention, and a reload is the
     one way to be sure nothing computed under the old one survives. */
  function mountPageAyan(host) {
    host = host || document.getElementById("np-ayan");
    if (!host || host.querySelector("select")) return false;
    var M = modes(); if (!M) return false;
    var lab = document.createElement("label"); lab.className = "npayan";
    var sp = document.createElement("span"); sp.textContent = "Ayanāṃśa for this page";
    var sel = document.createElement("select"); sel.className = "swin"; sel.id = "np-ayan-sel";
    var rule = pageRule();
    var o0 = document.createElement("option"); o0.value = "";
    o0.textContent = rule && rule !== "site"
      ? "Page default — " + ayanName(rule) + ", the frame this comparison is drawn in"
      : "Follow the site setting — " + ayanName(get().ayan);
    sel.appendChild(o0);
    Object.keys(M).forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = ayanName(k) +
        (k === "lahiri" ? " — the Indian civil standard printed almanacs use" : "");
      sel.appendChild(o);
    });
    sel.value = pageOverride() || "";
    sel.addEventListener("change", function () { setPageAyan(sel.value || null); location.reload(); });
    lab.appendChild(sp); lab.appendChild(sel); host.appendChild(lab);
    var note = document.createElement("span"); note.className = "npayan-note";
    var what = host.getAttribute("data-what") ||
      "Nakṣatras, yogas and solar months here are named in";
    note.textContent = what + " " + ayanName(almanacAyan()) +
      (pageOverride() ? " — chosen for this page only."
        : (rule && rule !== "site" ? ", this page's default; choosing another here changes this page only."
                                   : ", the site setting; choosing another here changes this page only.")) +
      (host.getAttribute("data-after") || " Tithi and karaṇa do not depend on it.");
    host.appendChild(note);
    return true;
  }
  /* THE PER-PAGE ENGINE PICKER, mounted into #np-engine. Same shape as the
     ayanāṃśa picker: follow the site setting, or pick an engine for this page
     alone (stored under nirayana.pageEngine). Pages whose subject is the
     comparison of engines are locked to modern and say so. */
  var ENGKEY = "nirayana.pageEngine";
  function pageEngineOverride() {
    try {
      var m = JSON.parse(window.localStorage.getItem(ENGKEY) || "{}") || {};
      var v = m[pageName()], E = window.__engineModes;
      return (v && (!E || E[v])) ? v : null;
    } catch (e) { return null; }
  }
  function setPageEngine(key) {
    try {
      var m = JSON.parse(window.localStorage.getItem(ENGKEY) || "{}") || {};
      if (key) m[pageName()] = key; else delete m[pageName()];
      window.localStorage.setItem(ENGKEY, JSON.stringify(m));
    } catch (e) {}
  }
  function mountPageEngine(host) {
    host = host || document.getElementById("np-engine");
    if (!host || host.querySelector("select,.npeng-lock")) return false;
    var E = window.__engineModes; if (!E) return false;
    if (window.__engineLocked && window.__engineLocked()) {
      var lk = document.createElement("p"); lk.className = "npayan-note npeng-lock";
      lk.textContent = "This page compares the engines, so its modern column is always the modern " +
        "ephemeris, whatever engine the site is set to.";
      host.appendChild(lk); return true;
    }
    var lab = document.createElement("label"); lab.className = "npayan";
    var sp = document.createElement("span"); sp.textContent = "Engine for this page";
    var sel = document.createElement("select"); sel.className = "swin"; sel.id = "np-engine-sel";
    var o0 = document.createElement("option"); o0.value = "";
    o0.textContent = "Follow the site setting — " + (E[get().engine] || E.modern);
    sel.appendChild(o0);
    Object.keys(E).forEach(function (k) {
      var o = document.createElement("option"); o.value = k; o.textContent = E[k]; sel.appendChild(o);
    });
    sel.value = pageEngineOverride() || "";
    sel.addEventListener("change", function () { setPageEngine(sel.value || null); location.reload(); });
    lab.appendChild(sp); lab.appendChild(sel); host.appendChild(lab);
    var cur = window.__engine ? window.__engine() : null;
    var note = document.createElement("span"); note.className = "npayan-note";
    note.textContent = "Grahas on this page are placed by the " + (cur ? cur.name : "modern ephemeris") +
      (pageEngineOverride() ? " — chosen for this page only." : ", the site setting; choosing another here changes this page only.") +
      (cur && cur.mode !== "modern" ? " Sunrise and the lagna's clock stay modern." : "");
    host.appendChild(note);
    return true;
  }
  (function tryMountEngine(n) {
    if (typeof document === "undefined") return;
    if (document.getElementById("np-engine") && !mountPageEngine() && n < 100)
      setTimeout(function () { tryMountEngine(n + 1); }, 150);
    else if (!document.getElementById("np-engine") && n < 3)
      setTimeout(function () { tryMountEngine(n + 1); }, 300);
  })(0);

  /* mount as soon as the engine has published its modes */
  (function tryMount(n) {
    if (typeof document === "undefined") return;
    if (document.getElementById("np-ayan") && !mountPageAyan() && n < 100)
      setTimeout(function () { tryMount(n + 1); }, 150);
    else if (!document.getElementById("np-ayan") && n < 3)
      setTimeout(function () { tryMount(n + 1); }, 300);
  })(0);
  /* a page following the site setting follows a change to it at once */
  try {
    window.addEventListener("nirayana:settings", function (e) {
      var ch = e && e.detail && e.detail.changed;
      if (ch && ch.indexOf("ayan") >= 0 && document.getElementById("np-ayan") && !pageOverride() && pageRule() !== "lahiri") location.reload();
      /* a page following the site's engine follows a change to it; the
         Kundli builder and the Workstation recast instead (ui.js) */
      if (ch && (ch.indexOf("engine") >= 0 || ch.indexOf("ssframe") >= 0) &&
          document.getElementById("np-engine") && !pageEngineOverride() &&
          !(window.__engineLocked && window.__engineLocked())) location.reload();
    });
  } catch (e) {}

  window.NSettings = { get: get, set: set, almanacAyan: almanacAyan, pageAyan: pageOverride,
    setPageAyan: setPageAyan, mountPageAyan: mountPageAyan,
    pageEngine: pageEngineOverride, setPageEngine: setPageEngine, mountPageEngine: mountPageEngine, defaults: function () {
    var d = {}; Object.keys(DEF).forEach(function (k) { d[k] = DEF[k]; }); return d;
  }, open: open, close: close, options: OPTS };
})();
