/* "In simple words" — one small button beside every section heading, opening
   an overlay that explains just that section. The explanations come from
   source/src/pages/_plain_sections.py, inlined per page by build.py as
   <script type="application/json" id="secx-data">. Headings rendered later by
   script (the Kundli report, the dashboard) are picked up as they appear. */
(function () {
  "use strict";
  var el = document.getElementById("secx-data");
  if (!el) return;
  var D; try { D = JSON.parse(el.textContent); } catch (e) { return; }
  var HI = D.lang === "hi";
  var LBL = HI ? "सरल शब्दों में" : "In simple words";
  var CLOSE = HI ? "बंद करें" : "Close";

  function titleOf(h) {           // heading text without its <span> subtitle / our button
    var t = "";
    for (var n = h.firstChild; n; n = n.nextSibling)
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeType === 1 && n.tagName !== "SPAN" && n.tagName !== "BUTTON" && !n.classList.contains("sensb")) t += n.textContent;
    return t.replace(/\s+/g, " ").trim();
  }
  function lookup(h) {
    if (D.byId) {
      var id = h.id || (D.parentId && h.closest("section[id]") ? h.closest("section[id]").id : "");
      if (id && D.byId[id]) return D.byId[id];
    }
    if (D.byTitle) { var t = titleOf(h); if (D.byTitle[t]) return D.byTitle[t]; }
    return null;
  }

  var ov, card, ttl, txt, lastFocus;
  function build() {
    ov = document.createElement("div");
    ov.className = "secx-ov"; ov.hidden = true;
    ov.innerHTML = '<div class="secx-card" role="dialog" aria-modal="true" aria-labelledby="secx-t" tabindex="-1">' +
      '<button type="button" class="secx-x" aria-label="' + CLOSE + '">×</button>' +
      '<p class="secx-k">' + LBL + '</p><h3 id="secx-t"></h3><p class="secx-p"></p></div>';
    document.body.appendChild(ov);
    card = ov.firstChild; ttl = card.querySelector("h3"); txt = card.querySelector(".secx-p");
    ov.addEventListener("click", function (e) { if (e.target === ov) hide(); });
    card.querySelector(".secx-x").addEventListener("click", hide);
    document.addEventListener("keydown", function (e) {
      if (ov.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); hide(); }
      else if (e.key === "Tab") { e.preventDefault(); card.querySelector(".secx-x").focus(); }
    });
  }
  function show(title, body, from) {
    if (!ov) build();
    lastFocus = from; ttl.textContent = title; txt.textContent = body;
    ov.hidden = false; card.querySelector(".secx-x").focus();
  }
  function hide() { ov.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  function decorate(h) {
    if (h.__secx) return; h.__secx = 1;
    var body = lookup(h); if (!body) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "secx-b";
    b.setAttribute("aria-haspopup", "dialog");
    b.title = LBL + ": " + titleOf(h);
    b.innerHTML = '<b class="secx-q" aria-hidden="true">?</b><i>' + LBL + "</i>";
    b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); show(titleOf(h), body, b); });
    var side = h.querySelector(":scope > span");
    if (side) h.insertBefore(b, side); else h.appendChild(b);
  }
  var SEL = D.sel || "h2[id]";
  function scan(root) {
    if (!root.querySelectorAll) return;
    if (root.matches && root.matches(SEL)) decorate(root);
    var l = root.querySelectorAll(SEL);
    for (var i = 0; i < l.length; i++) decorate(l[i]);
  }
  function start() {
    scan(document);
    if (D.watch && window.MutationObserver)
      new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++)
          for (var j = 0; j < ms[i].addedNodes.length; j++) scan(ms[i].addedNodes[j]);
      }).observe(document.body, { childList: true, subtree: true });
  }
  window.__secx = { lookup: lookup, titleOf: titleOf, data: D };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
