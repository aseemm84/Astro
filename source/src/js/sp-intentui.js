/* ===== Saying what you want — the panel ===================================

   One module, two hosts. On Director Pro a sentence becomes a whole reel; on
   Studio Pro it becomes a selection and a pinned view. The difference is two
   lines at the end, because the parse is the same question either way.

   WHAT THE PANEL IS FOR, BEYOND CONVENIENCE. It is the fastest way to learn
   the vocabulary. A reader types something, sees phrase by phrase what was
   understood and what was not, and adjusts — which teaches the grammar in the
   place it is used rather than in a list somebody has to go and read. That is
   why the readback is not a status line but the main thing on the panel, and
   why an unrecognised word is shown as the word rather than as "parse error".

   The suggestions are the same grammar run backwards: every one of them is a
   sentence this parser really reads, generated from the registry, so they
   cannot drift out of step with what is understood. Typing filters them, so
   the list doubles as a search over everything the page can be asked for. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var HOST = null, MODE = null, LAST = null;

  function readback(U) {
    var box = $("si-read");
    if (!box) return;
    box.innerHTML = "";
    if (!U) return;
    var P = U.parse;

    if (P.understood.length) {
      var u = el("p", "siread");
      u.appendChild(el("b", null, "Understood: "));
      P.understood.forEach(function (q, i) {
        if (i) u.appendChild(document.createTextNode("  ·  "));
        u.appendChild(el("span", "sigood", q));
      });
      box.appendChild(u);
    } else {
      box.appendChild(el("p", "siread",
        "Nothing in that was recognised. Try one of the suggestions below — " +
        "they are all sentences this understands."));
    }
    if (P.ignored.length) {
      var g = el("p", "siread");
      g.appendChild(el("b", null, "Not placed: "));
      P.ignored.slice(0, 8).forEach(function (q, i) {
        if (i) g.appendChild(document.createTextNode(", "));
        g.appendChild(el("span", "sibad", q));
      });
      g.appendChild(document.createTextNode(
        " — these were skipped, not guessed at."));
      box.appendChild(g);
    }
    U.why.forEach(function (w) {
      box.appendChild(el("p", "siwhy", w));
    });
    if (U.note) box.appendChild(el("p", "siwhy", U.note));
    if (U.ok) {
      var s = el("p", "siread");
      s.appendChild(el("b", null, "Will draw: "));
      s.appendChild(document.createTextNode(
        U.sel.map(function (id) {
          var n = window.SPNodes.byId(id);
          return n ? n.label : id;
        }).join(" + ") +
        (U.force ? "  as " + U.force : "") +
        (U.spanDays ? "  over " + (U.spanDays >= 500
          ? (U.spanDays / 365.2564).toFixed(0) + " years"
          : Math.round(U.spanDays) + " days") : "")));
      box.appendChild(s);
    }
  }

  function apply(U) {
    if (!U || !U.ok) return false;
    if (U.spanDays) {
      var sp = $(MODE === "dp" ? "dp-span" : "sp-span");
      if (sp) {
        var want = String(Math.round(U.spanDays));
        var has = false;
        [].forEach.call(sp.options, function (o) { if (o.value === want) has = true; });
        if (!has) {
          var o2 = el("option", null, U.spanDays >= 500
            ? (U.spanDays / 365.2564).toFixed(0) + " years"
            : Math.round(U.spanDays) + " days");
          o2.value = want;
          sp.appendChild(o2);
        }
        sp.value = want;
        sp.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    if (MODE === "dp") {
      var d = window.SPIntent.toReel(U);
      if (!d) return false;
      window.__dp.mark();
      window.__dp.setDoc(d);
      return true;
    }
    /* Studio Pro: the selection and the pinned view */
    if (window.__spUI) {
      window.__spUI.select(U.sel);
      if (U.force) {
        var btns = document.querySelectorAll("#sp-views .spview");
        for (var i = 0; i < btns.length; i++) {
          if (btns[i].getAttribute("data-key") === U.force) { btns[i].click(); break; }
        }
      }
      return true;
    }
    return false;
  }

  function run() {
    var inp = $("si-text");
    if (!inp) return;
    var U = window.SPIntent.understand(inp.value || "");
    LAST = U;
    readback(U);
    if (!U.ok) { flash("Nothing to draw from that yet — see the readback."); return; }
    if (apply(U)) flash(MODE === "dp"
      ? "Built a reel. Everything in it is an ordinary layer you can now edit."
      : "Selected. The stage is drawing it.");
  }
  function flash(msg) {
    var f = $(MODE === "dp" ? "dp-flash" : "sp-flash");
    if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }

  function suggestions(filter) {
    var host = $("si-list");
    if (!host) return;
    host.innerHTML = "";
    var all = window.SPIntent.recipes();
    var f = window.SPIntent.fold(filter || "");
    var terms = f ? f.split(/\s+/).filter(Boolean) : [];
    var hits = all.filter(function (r) {
      if (!terms.length) return true;
      var hay = window.SPIntent.fold(r.text + " " + r.group);
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    var stat = $("si-stat");
    if (stat) stat.textContent = hits.length + " of " + all.length +
      " things you can ask for";
    var groups = {};
    hits.slice(0, 160).forEach(function (r) {
      (groups[r.group] = groups[r.group] || []).push(r);
    });
    Object.keys(groups).forEach(function (g) {
      var sec = el("div", "sigroup");
      sec.appendChild(el("h5", null, g));
      groups[g].forEach(function (r) {
        var b = el("button", "sirecipe", r.text);
        b.type = "button";
        b.addEventListener("click", function () {
          var inp = $("si-text");
          if (inp) inp.value = r.text;
          run();
        });
        sec.appendChild(b);
      });
      host.appendChild(sec);
    });
    if (!hits.length)
      host.appendChild(el("p", "siread",
        "Nothing matches that. The vocabulary is the nine grahas, the events " +
        "(conjunction, opposition, full and new Moon, combustion, stations), " +
        "a span of time, and a figure to draw it as."));
  }

  function mount(mode) {
    MODE = mode;
    var inp = $("si-text");
    if (!inp) return;
    inp.addEventListener("input", function () {
      /* the readback updates as you type — the point is to see the grammar
         working, not to find out after pressing a button */
      var U = window.SPIntent.understand(inp.value || "");
      LAST = U;
      readback(U);
      suggestions(inp.value);
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); run(); }
    });
    var go = $("si-go");
    if (go) go.addEventListener("click", run);
    var ex = $("si-shuffle");
    if (ex) ex.addEventListener("click", function () {
      var all = window.SPIntent.recipes();
      var r = all[Math.floor(Math.random() * all.length)];
      inp.value = r.text;
      run();
      suggestions("");
    });
    suggestions("");
    readback(null);
  }

  window.SPIntentUI = { mount: mount, run: run, last: function () { return LAST; },
                        apply: apply, suggestions: suggestions };

  function boot() {
    if (!$("si-text")) return;
    if (window.__dp) mount("dp");
    else if (window.__spUI) mount("sp");
    else setTimeout(boot, 120);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 60); });
  else setTimeout(boot, 60);
})();
