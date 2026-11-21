/* ===== Reel Agent — "Make today's reel" on the Studio's idea cards ========

   The Studio already decides what is worth posting today. This adds one
   button to each idea card that opens Reel Agent on the matching layout. It
   does not load the reel engines into the Studio page — the button is a link
   to reel-agent.html#make=<layout>, so the Studio stays as light as it was.

   The idea → layout mapping is a copy of RA.layoutForIdea in ra-page.js,
   kept tiny on purpose; studio-reel test asserts the two agree. */
(function () {
  "use strict";
  var FEST = ["diwali", "dussehra", "holi", "ramanavami", "navaratri", "ugadi", "makara", "janmashtami", "mahashivaratri"];
  function layoutForIdea(key) {
    key = String(key || ""); var m;
    if ((m = /^fest-(.+)$/.exec(key))) {
      var k = FEST.filter(function (x) { return m[1].indexOf(x) >= 0; })[0];
      return k ? "fest.when." + k : "fest.when.diwali";
    }
    if ((m = /^nak-(\d+)$/.exec(key))) return "learn.nakshatra." + (+m[1] + 1);
    if ((m = /^sank-(\d+)$/.exec(key))) return "learn.rashi." + (+m[1] + 1);
    if (/^ing-/.test(key)) return "learn.concept.rashis";
    if (/^stat|vakri|retro/.test(key)) return "vakri.mars";
    return "learn.concept.grahas";
  }
  function decorate() {
    var ideas = window.__stIdeas || [];
    Array.prototype.forEach.call(document.querySelectorAll("article.stcard[data-sti]"), function (card) {
      if (card.querySelector(".ra-today")) return;
      var idea = ideas[+card.getAttribute("data-sti")];
      if (!idea) return;
      var a = document.createElement("a");
      a.className = "ra-today stbtn";
      a.href = "reel-agent.html#make=" + layoutForIdea(idea.key);
      a.textContent = "Make today's reel / आज की रील बनाएँ";
      a.setAttribute("style", "display:inline-block;margin-top:.5rem;padding:.35rem .8rem;border-radius:8px;" +
        "border:1px solid var(--accent,#c9a24b);background:var(--accent,#c9a24b);color:var(--accent-ink,#231c07);" +
        "font-weight:600;text-decoration:none");
      card.appendChild(a);
    });
  }
  window.__raLayoutForIdea = layoutForIdea;
  function boot() {
    decorate();
    try { new MutationObserver(decorate).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
