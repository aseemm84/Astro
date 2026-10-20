/* ===== places.js — the city list, shared =================================

   Loading and searching the 44,426-city list, and resolving a place's UTC offset
   for a given date. Extracted from ui.js so the calendar can use the same code
   rather than growing a second copy — two implementations of "which city is
   this and what is its offset" would drift, and the offset is load-bearing: the
   whole calendar descends from sunrise, and sunrise depends on it.

   WHY THE CALENDAR NEEDS THIS AT ALL. The page's own central claim is that a
   Hindu calendar is valid only for the place it was computed for. Offering
   nineteen cities while saying so was the weakest part of it: whether a given
   sunrise falls inside the ekādaśī tithi genuinely differs between Indian
   cities, and a reader whose town is not on a short list cannot check their own
   almanac against this one.

   LAZY, ALWAYS. The list is about three megabytes. It is fetched the first time
   somebody actually searches, and never on a page load — so a reader who uses
   the short list pays nothing for the long one. That bargain is the only reason
   a three-megabyte file is acceptable at all.

   TWO WAYS IN, and the second is the one that matters for a local copy. fetch()
   is blocked on file:// — the page's origin is "null" and the browser refuses
   the read — so a copy opened straight from Finder could never load the city
   list however correctly it sat beside the page. A <script> tag is not subject
   to that rule, and cities.js assigns the same rows to window.__CITIES. */

(function () {
  "use strict";
  var NPL = {};
  var DB = null, LOADING = null;

  function fold(s) {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  NPL.fold = fold;

  function byScript() {
    return new Promise(function (res, rej) {
      if (window.__CITIES) return res(window.__CITIES);
      var s = document.createElement("script");
      s.src = "cities.js";
      s.onload = function () {
        window.__CITIES ? res(window.__CITIES)
                        : rej(new Error("cities.js loaded but held no data"));
      };
      s.onerror = function () {
        rej(new Error("neither cities.json nor cities.js could be read"));
      };
      document.head.appendChild(s);
    });
  }
  NPL.load = function () {
    if (DB) return Promise.resolve(DB);
    if (LOADING) return LOADING;
    LOADING = fetch("cities.json").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).catch(byScript).then(function (d) {
      /* The folded name is cached on the row once rather than recomputed per
         keystroke; normalize() on 44,426 strings per search would be felt. */
      d.c.forEach(function (row) { row[8] = fold(row[0]); });
      DB = d; return d;
    });
    return LOADING;
  };
  NPL.loaded = function () { return !!DB; };

  /* Ranked: exact name, then prefix, then alias, then substring. The rows are
     population-ordered, so an early exit once enough strong matches are in hand
     is safe and keeps a two-letter query from walking all 44,426. */
  NPL.search = function (db, q, limit) {
    var f = fold(q);
    if (f.length < 2) return [];
    limit = limit || 8;
    var exact = [], prefix = [], sub = [], alias = [];
    for (var i = 0; i < db.c.length; i++) {
      var r = db.c[i], n = r[8];
      if (n === f) exact.push(i);
      else if (n.indexOf(f) === 0) prefix.push(i);
      else if (n.indexOf(f) > 0) sub.push(i);
      else {
        var al = r[7];
        for (var j = 0; j < al.length; j++) {
          if (al[j] === f || al[j].indexOf(f) === 0) { alias.push(i); break; }
        }
      }
      if (exact.length + prefix.length > limit * 3 && i > 4000) break;
    }
    return exact.concat(prefix, alias, sub).slice(0, limit);
  };

  NPL.label = function (db, r) {
    var parts = [r[0]], a = db.adm[r[5]];
    if (a) parts.push(a);
    parts.push(db.ccn[r[4]] || db.cc[r[4]]);
    return parts.join(", ");
  };

  /* A row as the rest of the site wants a place: name, coordinates, IANA zone. */
  NPL.place = function (db, ix) {
    var r = db.c[ix];
    return { n: NPL.label(db, r), lat: r[1], lon: r[2], zone: db.tz[r[3]] };
  };

  /* The UTC offset of an IANA zone AT A GIVEN INSTANT, in hours.

     Resolved per date rather than stored, which is the whole reason the city
     file holds zone NAMES and not offsets: Europe/London is +2 in 1941, 0 in
     1970 and +1 in July, and a stored number is wrong for two of those. The
     browser's own TZDB does the work.

     Returns null rather than a guess when the zone cannot be resolved — a
     silently wrong offset moves sunrise, and sunrise names the day. */
  NPL.offsetAt = function (zone, ms) {
    if (!zone) return null;
    try {
      var d = new Date(ms == null ? Date.now() : ms);
      var dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: zone, hour12: false, year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
      var p = {};
      dtf.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day,
                           +p.hour % 24, +p.minute, +p.second);
      return Math.round((asUTC - d.getTime()) / 60000) / 60;
    } catch (e) { return null; }
  };

  /* ===== the picker ========================================================
     One place-picking control, used by the chart page's sky panel, the now
     page and the calendar. There were three different ones, all of them a
     dropdown over a short list — which is the wrong shape once a 44,426-town
     database is sitting right there: a reader whose town is not among the
     nineteen had no way to say so.

     Search-first, but not search-only. The short list stays as what the field
     offers before you type, because it is instant, it needs no three-megabyte
     download, and the likely answers are on it. Typing two letters reaches the
     whole database. A reader who never types pays nothing for the file.

     opts: {host, value, quick, refMs, onPick, label}
       host   — the element to render into
       value  — the place currently in use, shown as the field's resting state
       quick  — the short list offered before anything is typed
       refMs  — () => instant the UTC offset should be resolved for
       onPick — place => {}, called with {n, lat, lon, tz, zone, found}
  */
  NPL.picker = function (opts) {
    var host = opts.host;
    if (!host) return null;
    var refMs = opts.refMs || function () { return Date.now(); };
    var seq = 0, timer = null;

    host.innerHTML =
      '<input class="npfind" type="search" autocomplete="off" ' +
      'aria-label="' + (opts.label || "Place") + '" spellcheck="false">' +
      '<div class="npres" role="listbox" hidden></div>';
    var inp = host.querySelector(".npfind"), res = host.querySelector(".npres");

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
      });
    }
    function setValue(p) {
      inp.value = "";
      inp.placeholder = p ? p.n : "Search for a place…";
      inp.title = p ? ("Computed for " + p.n + " — type to change") : "";
    }
    function close() { res.hidden = true; res.innerHTML = ""; }
    function msg(t) { res.hidden = false; res.innerHTML = '<p class="npmsg">' + t + "</p>"; }

    function offer(items, how) {
      if (!items.length) { close(); return; }
      res.hidden = false;
      res.innerHTML =
        (how ? '<p class="npmsg">' + how + "</p>" : "") +
        items.map(function (p, i) {
          var off = p.tz != null ? p.tz
                  : NPL.offsetAt(p.zone, refMs());
          return '<button type="button" role="option" data-npi="' + i + '">' +
            "<b>" + esc(p.n) + "</b><span>" +
            (p.lat != null ? p.lat.toFixed(2) + "°, " + p.lon.toFixed(2) + "° " : "") +
            (p.zone ? "· " + esc(p.zone) + " " : "") +
            (off == null ? "" : "· UTC" + (off >= 0 ? "+" : "") + off) +
            "</span></button>";
        }).join("");
      res.querySelectorAll("[data-npi]").forEach(function (b) {
        b.addEventListener("click", function () {
          var p = items[+b.getAttribute("data-npi")];
          var off = p.tz != null ? p.tz : NPL.offsetAt(p.zone, refMs());
          if (off == null) {
            /* A place whose zone this browser cannot resolve is refused rather
               than given a guessed offset: a wrong offset moves sunrise, and
               sunrise is what names the day. */
            msg("The time zone for " + esc(p.n) + " could not be resolved in " +
                "this browser, so its sunrise cannot be computed. Try a " +
                "nearby town.");
            return;
          }
          var out = { n: p.n, lat: p.lat, lon: p.lon, tz: off,
                      zone: p.zone || null, found: !!p.found };
          setValue(out); close();
          if (opts.onPick) opts.onPick(out);
        });
      });
    }
    function showQuick() {
      var q = (opts.quick || []).slice(0, 12);
      offer(q, q.length ? "Nearby and common places — or type to search " +
                          "44,426 towns" : "");
    }
    function run() {
      var q = (inp.value || "").trim(), mine = ++seq;
      if (q.length === 0) { showQuick(); return; }
      if (q.length < 2) { msg("Type at least two letters."); return; }
      if (!NPL.loaded()) msg("Loading the town list once…");
      NPL.load().then(function (db) {
        if (mine !== seq) return;              /* a later keystroke has won */
        var hits = NPL.search(db, q, 9).map(function (ix) {
          var p = NPL.place(db, ix); p.found = true; p.tz = null; return p;
        });
        if (!hits.length) {
          msg("No match for &ldquo;" + esc(q) + "&rdquo;. Try another spelling, " +
              "or a larger town nearby.");
          return;
        }
        offer(hits, "");
      }).catch(function (e) {
        if (mine !== seq) return;
        msg("The town list could not be loaded (" + esc(e.message) + "). " +
            "Make sure <code>cities.json</code> and <code>cities.js</code> " +
            "sit beside this page.");
      });
    }
    inp.addEventListener("input", function () {
      clearTimeout(timer); timer = setTimeout(run, 180);
    });
    inp.addEventListener("focus", function () { if (!inp.value) showQuick(); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { inp.value = ""; close(); inp.blur(); }
      if (e.key === "Enter") { e.preventDefault(); clearTimeout(timer); run(); }
    });
    /* Dismiss on a press outside, bound to MOUSEDOWN rather than click.

       It has to be mousedown because opening the list changes the layout. The
       sequence on a real mouse click is: mousedown → focus → the list renders →
       the row grows → the input moves out from under the pointer → the eventual
       click event is dispatched at the original coordinates, which are now over
       the container rather than the input. A click-bound handler therefore sees
       a target outside the host and closes the list it had just opened, so the
       control did nothing at all for mouse users while working perfectly from
       the keyboard. At mousedown the layout has not moved yet.

       The listener removes itself once its host leaves the document, so a pane
       that rebuilds itself does not leave a trail of handlers behind holding
       detached elements. */
    function onDown(e) {
      if (!document.contains(host)) {
        document.removeEventListener("mousedown", onDown, true);
        return;
      }
      if (!host.contains(e.target)) close();
    }
    document.addEventListener("mousedown", onDown, true);
    setValue(opts.value || null);
    return { set: setValue, close: close, input: inp };
  };

  window.NPlaces = NPL;
})();
;
