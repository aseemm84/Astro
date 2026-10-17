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

  window.NPlaces = NPL;
})();
