/* ===== Reel Agent — the SVG sanitiser ====================================

   Kahani scenes arrive from a model as SVG fragments. They are untrusted, so
   nothing of them reaches the page as live markup: each fragment is parsed
   into an inert XML document, walked against an allow-list, re-serialised,
   and then drawn only as an <img> from a blob — a context in which an SVG can
   run no script and fetch nothing even if something slipped through.

   ALLOWED: shapes, paths, text, groups, gradients, clip paths and masks, and
   the presentation attributes that draw them. REMOVED: script, foreignObject,
   image, use, a, animate* and anything else not listed; every on* attribute;
   style attributes and <style> (CSS can fetch: url(), @import); href and
   xlink:href; any url() that is not a same-document #reference; and any value
   carrying javascript:, data:, http:, // or expression(). The caller is told
   how much was removed. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var NS = "http://www.w3.org/2000/svg";

  var EL = {}; ("g path rect circle ellipse line polyline polygon text tspan defs linearGradient " +
    "radialGradient stop clipPath mask").split(" ").forEach(function (t) { EL[t] = 1; });
  var AT = {}; ("id d x y x1 y1 x2 y2 cx cy r rx ry fx fy width height points fill stroke stroke-width " +
    "stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-miterlimit opacity " +
    "fill-opacity stroke-opacity fill-rule clip-rule transform offset stop-color stop-opacity " +
    "gradientUnits gradientTransform spreadMethod font-size font-weight font-style text-anchor " +
    "dominant-baseline letter-spacing clip-path mask maskUnits clipPathUnits dx dy rotate textLength " +
    "visibility display").split(" ").forEach(function (a) { AT[a] = 1; });
  var BAD = /javascript:|data:|https?:|\/\/|expression\s*\(|@import|\\/i;

  function cleanValue(name, v) {
    if (BAD.test(v)) return null;
    var urls = v.match(/url\s*\(([^)]*)\)/gi);
    if (urls && !urls.every(function (u) { return /^url\s*\(\s*['"]?#[\w-]+['"]?\s*\)$/i.test(u); })) return null;
    if (name === "id" && !/^[\w-]{1,64}$/.test(v)) return null;
    return v;
  }

  /* fragment: SVG markup without the outer <svg>. → { svg, removed, ok } */
  function sanitize(fragment) {
    var removed = 0;
    var src = '<svg xmlns="' + NS + '">' + String(fragment || "") + "</svg>";
    var doc = new DOMParser().parseFromString(src, "image/svg+xml");
    if (doc.getElementsByTagName("parsererror").length) return { svg: "", removed: 1, ok: false, error: "not well-formed SVG" };
    var root = doc.documentElement;
    function walk(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function (k) {
        if (k.nodeType === 3) return;                       /* text */
        if (k.nodeType !== 1) { node.removeChild(k); removed++; return; }
        var tag = k.localName;
        if (!EL[tag] || k.namespaceURI !== NS) { node.removeChild(k); removed++; return; }
        Array.prototype.slice.call(k.attributes).forEach(function (a) {
          var n = a.name, keep = AT[n] && !a.prefix ? cleanValue(n, a.value) : null;
          if (keep === null) { k.removeAttributeNode(a); removed++; }
        });
        walk(k);
      });
    }
    walk(root);
    var out = new XMLSerializer().serializeToString(root);
    out = out.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
    return { svg: out, removed: removed, ok: true };
  }

  RA.sanitize = { svg: sanitize };
})();
