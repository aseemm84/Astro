/* ===== The script panel on the reel page =================================

   Three language tabs, a beat-by-beat teleprompter timed against the reel's
   own clock, the caption, and two copy buttons. It rebuilds whenever the
   Studio builds a reel, so what is on screen is always the script for the
   reel on screen.

   THE OVERRUN IS SHOWN RATHER THAN HIDDEN. A line that cannot be read in
   the time its beat is up is marked, and the panel offers to set the reel
   to the length the narration actually needs. That figure is usually two to
   three times the built length, which is the honest answer: a reel built to
   be watched and a reel built to be read over are different lengths. */

(function () {
  "use strict";

  var LANG = "hinglish";
  var LAST = null;

  function $(id) { return document.getElementById(id); }

  function secs(x) { return x.toFixed(1).replace(/\.0$/, "") + "s"; }

  function mountTabs() {
    var host = $("sc-langs");
    if (!host || !window.SPScript) return;
    host.innerHTML = "";
    window.SPScript.LANGS.forEach(function (L) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sctab";
      b.textContent = L.label;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", L.key === LANG ? "true" : "false");
      b.addEventListener("click", function () {
        LANG = L.key;
        mountTabs();
        draw();
      });
      host.appendChild(b);
    });
  }

  function draw() {
    var reel = window.__reel && window.__reel.reel && window.__reel.reel();
    var beats = $("sc-beats"), cap = $("sc-cap"), fit = $("sc-fit");
    if (!beats || !cap) return;
    if (!reel || !window.SPScript) {
      beats.innerHTML = "";
      cap.textContent = "";
      if (fit) fit.textContent = "";
      LAST = null;
      return;
    }
    var r = window.SPScript.render(reel, LANG);
    LAST = r;
    beats.innerHTML = "";
    r.beats.forEach(function (b) {
      var li = document.createElement("li");
      if (b.tight) li.className = "over";
      var t = document.createElement("span");
      t.className = "sct";
      t.textContent = secs(b.secs);
      var s = document.createElement("span");
      s.className = "scs";
      s.textContent = b.say;
      li.appendChild(t);
      li.appendChild(s);
      beats.appendChild(li);
    });
    cap.textContent = r.caption + "\n\n" + r.tags;
    var want = window.SPScript.suggestSeconds(reel, LANG);
    if (fit) {
      if (r.overrun) {
        fit.className = "scnote tight";
        fit.textContent = r.overrun + " of " + r.beats.length +
          " lines are longer than the beat they sit on. Read aloud this " +
          "script needs about " + Math.round(want) + "s; the reel is built " +
          "for " + Math.round(r.seconds) + "s.";
      } else {
        fit.className = "scnote";
        fit.textContent = "Every line fits its beat. Read aloud this script " +
          "runs about " + Math.round(want) + "s.";
      }
    }
    var ap = $("sc-apply");
    if (ap) {
      ap.hidden = !(want && Math.abs(want - r.seconds) > 1);
      ap.dataset.secs = String(want || "");
      ap.textContent = "Set the reel to " + Math.round(want || 0) + "s";
    }
  }

  function copy(text, btn) {
    function done() {
      var n = $("sc-copied");
      if (!n) return;
      n.hidden = false;
      clearTimeout(copy._t);
      copy._t = setTimeout(function () { n.hidden = true; }, 1600);
    }
    /* THE CLIPBOARD API IS NOT AVAILABLE ON file://, which is the one
       configuration this site is built for. The textarea fallback is not a
       legacy courtesy here, it is the main path. */
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallback(text, done);
      });
    } else fallback(text, done);
    void btn;
  }
  function fallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function scriptText() {
    if (!LAST) return "";
    var L = [LAST.title + " — " + LAST.lang];
    L.push("");
    LAST.beats.forEach(function (b) {
      L.push(b.n + ". [" + secs(b.secs) + "] " + b.say);
    });
    return L.join("\n");
  }

  function boot() {
    if (!$("reel-script")) return;
    mountTabs();
    var cc = $("sc-copycap"), cs = $("sc-copyscript"), ap = $("sc-apply");
    if (cc) cc.addEventListener("click", function () {
      copy(LAST ? LAST.caption + "\n\n" + LAST.tags : "", cc);
    });
    if (cs) cs.addEventListener("click", function () {
      copy(scriptText(), cs);
    });
    /* ---- the voiceover text ----------------------------------------------
       The same beats with everything a voice would read out as noise taken
       off them: a synthesiser handed "3. [12.4s] Mūla, 240°–253°20′" says the
       numbers and the brackets, and then says "Moola" wrong. SPScript.speech
       is the only text in this panel built to be read rather than looked at,
       so it gets its own button rather than sharing one with the script. */
    var sy = $("sc-copysay");
    if (sy) sy.addEventListener("click", function () {
      var R = window.__reel && window.__reel.reel && window.__reel.reel();
      copy(R ? window.SPScript.speech(R, LANG) : "", sy);
    });
    if (ap) ap.addEventListener("click", function () {
      var want = parseFloat(ap.dataset.secs || "0");
      var sl = $("reel-seconds");
      if (!want || !sl) return;
      /* the slider's own ceiling is the limit the recorder is tested to */
      var v = Math.min(parseFloat(sl.max), Math.max(parseFloat(sl.min),
                                                    Math.round(want)));
      sl.value = String(v);
      sl.dispatchEvent(new Event("input", { bubbles: true }));
      sl.dispatchEvent(new Event("change", { bubbles: true }));
    });
    /* the Studio tells us when a reel is ready; failing that, poll the key
       so the panel is never stale */
    var seen = null;
    setInterval(function () {
      var R = window.__reel && window.__reel.reel && window.__reel.reel();
      var k = R ? R.key + "|" + R.seconds + "|" + (R.placeName || "") : null;
      if (k !== seen) { seen = k; draw(); }
    }, 400);
    draw();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);

  window.SPScriptUI = { draw: draw, lang: function () { return LANG; },
                        setLang: function (l) { LANG = l; mountTabs(); draw(); },
                        last: function () { return LAST; } };
})();
