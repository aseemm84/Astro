/* ===== Choosing a theme ===================================================

   Two halves that must not be merged. The first runs before anything is
   painted and does one thing: put the remembered theme on <html>. It is
   inlined into the document head by the build, ahead of the stylesheet,
   because a theme applied after first paint is a white flash followed by a
   dark page — on a dark palette that flash is the brightest thing the
   reader sees, and it happens on every single navigation. The second half
   builds the control and can run whenever the page is ready, because by
   then the colours are already right.

   WHY LOCALSTORAGE AND NOT A COOKIE OR A QUERY STRING. This site runs from
   a folder of files on someone's own machine as happily as from a server.
   There is no server to set a cookie and no router to carry a query string,
   so the reader's choice lives in the one store a file:// page can write.
   It can throw — a private window, blocked site data — so every touch of
   it is wrapped, and a store that cannot be read simply means the default
   palette rather than a broken page.

   THE DEFAULT IS NO ATTRIBUTE AT ALL, not "paper". Every themed rule in
   theme.css hangs off html[data-theme], so a reader who has never chosen
   gets the stylesheet exactly as it was written, with none of the theme
   layer in play. That is what makes the feature safe: it cannot change the
   site for anyone who has not asked it to. */

(function () {
  "use strict";

  var KEY = "nirayana.theme";
  var THEMES = [
    ["", "Site default"],
    ["midnight", "Vedic Midnight"],
    ["peetambari", "Krishna Peetāmbarī"],
    ["paper", "Rishi Paper"],
    ["emerald", "Emerald Forest"]
  ];
  /* the colour the browser paints its own chrome with, so the phone's
     status bar is not a white stripe above a black page */
  var BAR = { midnight: "#02040c", peetambari: "#07060a",
              paper: "#292524", emerald: "#01201a", "": "#1d2340" };

  function known(t) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i][0] === t) return true;
    return false;
  }
  function read() {
    try {
      var v = window.localStorage.getItem(KEY);
      return known(v) ? v : "";
    } catch (e) { return ""; }
  }
  function write(t) {
    try {
      if (t) window.localStorage.setItem(KEY, t);
      else window.localStorage.removeItem(KEY);
    } catch (e) {}
  }

  /* ---- the half that must run before paint ------------------------------ */
  function apply(t) {
    var h = document.documentElement;
    if (t) h.setAttribute("data-theme", t);
    else h.removeAttribute("data-theme");
    /* a dark palette has to tell the browser so, or form controls and
       scrollbars are drawn light on top of it */
    h.style.colorScheme = (t && t !== "paper") ? "dark" : "light";
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", BAR[t] || BAR[""]);
    try {
      window.dispatchEvent(new CustomEvent("nirayana:theme", { detail: t }));
    } catch (e) {}
  }

  apply(read());

  /* ---- the control ------------------------------------------------------ */
  function mount() {
    var nav = document.querySelector("nav.site");
    if (!nav || nav.querySelector(".themepick")) return;
    var cur = read();
    var wrap = document.createElement("div");
    wrap.className = "themepick";
    var id = "theme-pick";
    var lab = document.createElement("label");
    lab.setAttribute("for", id);
    lab.textContent = "Theme";
    lab.className = "themepickl";
    var sel = document.createElement("select");
    sel.id = id;
    THEMES.forEach(function (t) {
      var o = document.createElement("option");
      o.value = t[0]; o.textContent = t[1];
      if (t[0] === cur) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      write(sel.value); apply(sel.value);
    });
    wrap.appendChild(lab); wrap.appendChild(sel);
    nav.appendChild(wrap);
  }

  /* another tab of the same site changing the theme should change this one:
     the reader thinks of it as one setting, not one per tab */
  try {
    window.addEventListener("storage", function (e) {
      if (e && e.key === KEY) {
        var t = read();
        apply(t);
        var s = document.getElementById("theme-pick");
        if (s) s.value = t;
      }
    });
  } catch (e) {}

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /* `apply` is exported for the desktop app, which follows the OS appearance.
     `set` persists, and a persisted choice stops following; the app needs to
     change the palette without recording a preference the user never made. */
  window.NTheme = { get: read, apply: apply, set: function (t) {
    if (!known(t)) return false; write(t); apply(t);
    var s = document.getElementById("theme-pick"); if (s) s.value = t;
    return true;
  }, list: THEMES };
})();
