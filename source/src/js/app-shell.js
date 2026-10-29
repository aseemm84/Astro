/* ===== App shell behaviour ========================================
   Loaded only by the --app build, after site.js.

   Four jobs, and deliberately no more. Everything else the app needs — the
   native menu, the window material, the platform chrome — belongs to the Tauri
   layer in a later stage, not here.

     1. Put the platform on <html> so the stylesheet can key off it.
     2. Move the brand into the sidebar, and give the sidebar its foot.
     3. Build About from the footer's own markup, so there is one copy of the
        three-layer notice and the educational disclaimer, not two.
     4. Find (Cmd/Ctrl+F), because a window has no browser find bar and the
        reference pages are long.

   Everything here is defensive: a page that is missing one of these elements
   must still work. The app is the same twenty-eight pages, and a page that
   breaks because its chrome script expected a footer would be a worse outcome
   than no chrome at all.
   ================================================================= */
(function () {
  "use strict";

  /* ---- 1. platform ------------------------------------------------ */
  /* Tauri's os plugin is the real source once the wrapper exists; until then,
     and as a fallback inside it, the user-agent answers the only question this
     stylesheet asks — Mac or Windows. */
  function platform() {
    try {
      var p = (navigator.userAgentData && navigator.userAgentData.platform) ||
              navigator.platform || navigator.userAgent || "";
      if (/mac|iphone|ipad/i.test(p)) return "mac";
      if (/win/i.test(p)) return "win";
    } catch (e) {}
    return "other";
  }
  document.documentElement.classList.add(platform());

  /* ---- the OS appearance -----------------------------------------
     An application is expected to follow the system. The site's own picker
     still wins: if the reader has chosen a palette it is in localStorage, and
     nothing here touches it. Only the "Site default" case follows the OS, and
     it does so through NTheme.apply rather than NTheme.set, because set
     persists and a persisted choice would stop following from then on. */
  function followSystem() {
    var T = window.NTheme;
    if (!T || !T.apply) return;
    var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (!mq) return;
    function paint() {
      var chosen = "";
      try { chosen = T.get() || ""; } catch (e) {}
      if (chosen) return;               /* their choice, not ours */
      T.apply(mq.matches ? "midnight" : "paper");
    }
    paint();
    if (mq.addEventListener) mq.addEventListener("change", paint);
    else if (mq.addListener) mq.addListener(paint);
    /* The picker writing a real choice must take effect at once, and must stop
       the OS from overriding it on the next system change. */
    document.addEventListener("change", function (e) {
      if (e.target && e.target.id === "theme-pick") setTimeout(paint, 0);
    });
  }
  followSystem();

  function ready(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(function () {
    var nav = document.querySelector("nav.site");
    var mast = document.querySelector("header.masthead");
    var foot = document.querySelector("footer");

    /* ---- 2. the brand moves; the title strip becomes a drag region ---- */
    if (nav) {
      var brand = document.querySelector("header.masthead .lhbrand");
      if (brand) nav.insertBefore(brand, nav.firstChild);
    }
    if (mast) {
      /* Tauri reads this attribute to know which part of the window drags it,
         and it only applies to the element it sits on — children need their
         own, which is why the h1 gets one too. */
      mast.setAttribute("data-tauri-drag-region", "");
      var h1 = mast.querySelector("h1");
      if (h1) h1.setAttribute("data-tauri-drag-region", "");
    }

    /* ---- 3. About, built from the footer rather than beside it ---- */
    var build = (window.__kBuild || "").toString();
    if (nav) {
      var box = document.createElement("div");
      box.className = "appfoot";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "About Nirayana";
      box.appendChild(btn);
      if (build) {
        var c = document.createElement("code");
        c.textContent = build;
        box.appendChild(c);
      }
      nav.appendChild(box);
      btn.addEventListener("click", openAbout);
    }

    var about = null;
    function openAbout() {
      if (!about) {
        about = document.createElement("div");
        about.id = "app-about";
        var sheet = document.createElement("div");
        sheet.className = "sheet";
        var h = document.createElement("h2");
        h.textContent = "Nirayana";
        sheet.appendChild(h);
        if (build) {
          var b = document.createElement("p");
          b.className = "bid";
          b.textContent = "Build " + build;
          sheet.appendChild(b);
        }
        /* The footer's own markup, verbatim. The three-layer notice and the
           educational disclaimer are not restated here — they are moved, so
           there is exactly one copy and it cannot drift from the website's. */
        if (foot) {
          var body = document.createElement("div");
          body.innerHTML = foot.innerHTML;
          sheet.appendChild(body);
        }
        var close = document.createElement("button");
        close.type = "button";
        close.className = "close";
        close.textContent = "Close";
        sheet.appendChild(close);
        about.appendChild(sheet);
        document.body.appendChild(about);
        close.addEventListener("click", function () { about.classList.remove("on"); });
        about.addEventListener("click", function (e) {
          if (e.target === about) about.classList.remove("on");
        });
      }
      about.classList.add("on");
    }

    /* ---- 3b. a way back from an adopted page ----
       These four carry no nav, so the shell has nothing to restructure and the
       window has no browser chrome to fall back on. Detected by the absence of
       the sidebar rather than by a list of names, so a page that loses its nav
       in future gets the same treatment without anyone remembering to add it. */
    if (!nav && document.body) {
      var back = document.createElement("a");
      back.className = "appback";
      back.href = "now.html";
      back.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
        '<path d="M14.5 5.5 8 12l6.5 6.5"></path></svg>';
      back.appendChild(document.createTextNode("Back"));
      back.addEventListener("click", function (e) {
        /* History first, so the reader returns to the report they came from
           rather than to the landing page. */
        if (window.history && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
      });
      document.body.appendChild(back);
    }

    /* ---- 4. Find ---------------------------------------------------- */
    var region = document.querySelector(".layout") || document.body;
    var bar = null, input = null, count = null;
    var hits = [], at = -1;

    function build_bar() {
      bar = document.createElement("div");
      bar.id = "app-find";
      input = document.createElement("input");
      input.type = "search";
      input.setAttribute("aria-label", "Find on this page");
      input.placeholder = "Find";
      count = document.createElement("span");
      count.className = "cnt";
      var prev = mk("↑", "Previous match", function () { step(-1); });
      var next = mk("↓", "Next match", function () { step(1); });
      var shut = mk("×", "Close find", close);
      bar.appendChild(input); bar.appendChild(count);
      bar.appendChild(prev); bar.appendChild(next); bar.appendChild(shut);
      document.body.appendChild(bar);
      input.addEventListener("input", function () { run(input.value); });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
        else if (e.key === "Escape") { e.preventDefault(); close(); }
      });
      function mk(label, aria, fn) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.setAttribute("aria-label", aria);
        b.addEventListener("click", fn);
        return b;
      }
    }

    /* Highlighting is done by wrapping text nodes, and clearing it puts every
       split node back together. Without the normalize() a few hundred finds
       would leave the document shredded into fragments. */
    function clear() {
      hits.forEach(function (m) {
        var p = m.parentNode; if (!p) return;
        p.replaceChild(document.createTextNode(m.textContent), m);
        p.normalize();
      });
      hits = []; at = -1;
    }

    function run(q) {
      clear();
      q = (q || "").trim();
      if (q.length < 2) { paint(); return; }
      var needle = q.toLowerCase();
      var walk = document.createTreeWalker(region, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || n.nodeValue.trim().length < 1) return NodeFilter.FILTER_REJECT;
          var p = n.parentNode, t = p && p.nodeName;
          if (t === "SCRIPT" || t === "STYLE" || t === "TEXTAREA")
            return NodeFilter.FILTER_REJECT;
          if (n.nodeValue.toLowerCase().indexOf(needle) < 0) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var found = [], n;
      /* Collected first, then wrapped. Mutating the tree while the walker is
         still on it makes the walker step over its own output. */
      while ((n = walk.nextNode())) found.push(n);
      found.forEach(function (node) {
        var text = node.nodeValue, low = text.toLowerCase(), i = 0, frag = document.createDocumentFragment();
        var cut = 0;
        while ((i = low.indexOf(needle, cut)) >= 0 && hits.length < 500) {
          if (i > cut) frag.appendChild(document.createTextNode(text.slice(cut, i)));
          var m = document.createElement("mark");
          m.className = "app-hit";
          m.textContent = text.slice(i, i + needle.length);
          frag.appendChild(m); hits.push(m);
          cut = i + needle.length;
        }
        if (!hits.length) return;
        if (cut < text.length) frag.appendChild(document.createTextNode(text.slice(cut)));
        if (node.parentNode) node.parentNode.replaceChild(frag, node);
      });
      if (hits.length) { at = 0; mark(); }
      paint();
    }

    function paint() {
      if (!count) return;
      var q = input ? input.value.trim() : "";
      count.textContent = !q ? "" : hits.length ? (at + 1) + " of " + hits.length : "none";
    }
    function mark() {
      hits.forEach(function (m, i) { m.classList.toggle("cur", i === at); });
      if (hits[at] && hits[at].scrollIntoView)
        hits[at].scrollIntoView({ block: "center", behavior: "smooth" });
    }
    function step(d) {
      if (!hits.length) return;
      at = (at + d + hits.length) % hits.length;
      mark(); paint();
    }
    function open() {
      if (!bar) build_bar();
      bar.classList.add("on");
      input.focus(); input.select();
    }
    function close() {
      clear(); paint();
      if (bar) bar.classList.remove("on");
      if (input) input.value = "";
    }

    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault(); open();
      } else if (e.key === "Escape" && bar && bar.classList.contains("on")) {
        close();
      }
    });

    /* The menu bar in a later stage calls these rather than synthesising keys. */
    /* The menu bar calls these rather than synthesising key events. openChart
       clicks the page's own hidden file input, so the app needs no dialog
       plugin and gains no filesystem capability it did not have. */
    window.NirayanaApp = {
      find: open, closeFind: close, about: openAbout, platform: platform(),
      openChart: function () {
        var b = document.getElementById("k-open") || document.getElementById("k-openfile");
        if (b) { b.click(); return true; }
        location.href = "kundli.html";
        return false;
      },
      print: function () { window.print(); }
    };
  });
})();
