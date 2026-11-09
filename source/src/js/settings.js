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

  /* The defaults ARE the site as it was before this panel existed. Whole-sign
     bhāvas, Lahiri, mean nodes, upper-limb sunrise, degrees-and-minutes, and
     cautions shown. A reader who never opens the panel must get exactly the
     site they got yesterday — the same property theme.js secures by applying
     no attribute at all until asked. */
  var DEF = { ayan: "lahiri", house: "whole", node: "mean",
              riseconv: "limb", degfmt: "dm", caution: "on" };

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

  function ayanRow() {
    var M = window.__ayanModes, s = get();
    if (!M) {
      /* the engine is not on this page, so the list cannot be built from it.
         Offering a hand-written list here would be a second list to keep in
         step with AYAN_MODES — the exact bug the Kundli picker's comment
         records. The stored value is shown and left alone instead. */
      return '<div class="nsrow"><label>Ayanāṃśa</label>' +
        '<p class="nsnote">Currently <b>' + esc(s.ayan) + '</b>. The picker needs the ' +
        'engine, which this page does not load — open this panel from the Kundli ' +
        'builder, the Workstation or the Ayanāṃśa page to change it.</p></div>';
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
          row("house", "Bhāva frame (house system)",
            'Decides how every bhāva is reckoned — which bhāva each graha occupies, which ' +
            'rāśi gives each bhāva its lord, and the strengths that follow. Whole-sign is ' +
            'what BPHS uses. Under Śrīpati a bhāva can span two rāśis and its lord is taken ' +
            'from the rāśi holding the <i>madhya</i>. Divisional charts have no cusps of ' +
            'their own, so they keep whole-sign houses and carry the rāśi chart’s bhāva ' +
            'alongside, labelled.') +
          row("node", "Lunar nodes",
            'BPHS reckons Rāhu and Ketu as the mean node. The true node can sit up to about ' +
            '1½° away.') +
          row("riseconv", "Sunrise",
            'Re-dates everything downstream: the vāra, the ghaṭī count, which tithi is ' +
            'today’s, and therefore which day a festival lands on.') +

          '<h3>Presentation</h3>' +
          /* no <label> here: theme.js brings its own (.themepickl), and two
             would read as two settings */
          '<div class="nsrow" id="nset-theme-slot">' +
            '<p class="nsnote">Palette for the whole site. The desktop app follows ' +
            'the system appearance until a choice is made here.</p></div>' +
          row("degfmt", "Degrees",
            'Applies to the chart report. The standalone visualisation pages (Ayanāṃśa, ' +
            'the labs, Divisions) each format their own figures to suit their own scale ' +
            'and are <b>not</b> changed by this — thirteen different formatters exist ' +
            'across the site and they round differently on purpose.') +
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

  window.NSettings = { get: get, set: set, defaults: function () {
    var d = {}; Object.keys(DEF).forEach(function (k) { d[k] = DEF[k]; }); return d;
  }, open: open, close: close, options: OPTS };
})();
