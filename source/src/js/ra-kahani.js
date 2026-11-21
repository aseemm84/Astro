/* ===== Reel Agent — Kahani (cartoon story) mode ==========================

   A surface like any other, so the renderer, the verifier and the voice
   treat a story reel exactly as an engine reel. Scenes come from the agent
   (kahani_scenes): an SVG fragment, a list of props, simple motion and a
   length each. The scene runtime is vanilla JS on a canvas:

     Background   night gradient, a fixed field of stars, a row of diyas
     Props        moon, mountains, cloud, tree, diya, stars — drawn here
     Camera       a slow push-in across each scene
     Motion       entrance (fade | rise | zoom), bob, parallax, sway
     Kicker       ≤ 3 words in the title band

   BUILT TO THE BRIEF, NOT YET PORTED. The plan was to port the kahani kit's
   Remotion components; that kit was not reachable from the session that
   wrote this, so the components above follow its description. When the kit
   is shared, its look should replace these drawings — the contract and the
   sanitiser stay as they are.

   Every fragment goes through RA.sanitize first and is drawn only as an
   <img> made from a blob, pre-rasterised at configure() so frame(p) is
   synchronous and deterministic. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var W = 1080, H = 1920;

  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  var STARS = (function () { var r = rng(20261121), a = []; for (var i = 0; i < 260; i++) a.push([r() * W, r() * H * 0.72, 0.6 + r() * 2.2, r()]); return a; })();

  function background(c, t) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1030"); g.addColorStop(0.6, "#1c1440"); g.addColorStop(1, "#3a1a2e");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    STARS.forEach(function (s) {
      c.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.3 + s[3] * 20);
      c.fillStyle = "#fff6dc"; c.beginPath(); c.arc(s[0], s[1], s[2], 0, 7); c.fill();
    });
    c.globalAlpha = 1;
  }
  function diyas(c, t, y) {
    for (var i = 0; i < 7; i++) {
      var x = W * (0.12 + i * 0.127), f = 1 + 0.12 * Math.sin(t * 7 + i * 1.7);
      c.fillStyle = "#b8562a"; c.beginPath(); c.ellipse(x, y, 34, 14, 0, 0, Math.PI); c.fill();
      var g = c.createRadialGradient(x, y - 22, 2, x, y - 22, 60 * f);
      g.addColorStop(0, "rgba(255,214,120,.9)"); g.addColorStop(1, "rgba(255,160,40,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y - 22, 60 * f, 0, 7); c.fill();
      c.fillStyle = "#ffd36b"; c.beginPath(); c.ellipse(x, y - 20, 7, 16 * f, 0, 0, 7); c.fill();
    }
  }
  var PROPS = {
    moon: function (c, t, px) { var x = W * 0.74 + px * 30, y = H * 0.16;
      var g = c.createRadialGradient(x, y, 10, x, y, 220); g.addColorStop(0, "rgba(255,244,214,.35)"); g.addColorStop(1, "rgba(255,244,214,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 220, 0, 7); c.fill();
      c.fillStyle = "#fff4d6"; c.beginPath(); c.arc(x, y, 92, 0, 7); c.fill(); },
    mountains: function (c, t, px) { c.fillStyle = "#231c47";
      c.beginPath(); c.moveTo(-40 + px * 20, H * 0.80); [[0.18, 0.58], [0.36, 0.72], [0.55, 0.52], [0.78, 0.70], [1.04, 0.56]].forEach(function (p) { c.lineTo(W * p[0] + px * 20, H * p[1]); });
      c.lineTo(W + 40, H * 0.82); c.lineTo(-40, H * 0.82); c.fill(); },
    cloud: function (c, t, px) { var x = (W * 0.2 + t * 18 + px * 50) % (W + 400) - 200, y = H * 0.27;
      c.fillStyle = "rgba(230,228,255,.85)"; [[0, 0, 70], [70, -26, 86], [150, 0, 66], [80, 18, 74]].forEach(function (b) { c.beginPath(); c.arc(x + b[0], y + b[1], b[2], 0, 7); c.fill(); }); },
    tree: function (c, t, px, sway) { var x = W * 0.16 + px * 60, y = H * 0.80, r = Math.sin(t * 1.4) * 0.03 * (sway || 0.5);
      c.save(); c.translate(x, y); c.rotate(r); c.fillStyle = "#3b2a1c"; c.fillRect(-16, -260, 32, 260);
      c.fillStyle = "#2f6b45"; [[0, -300, 120], [-80, -240, 90], [80, -240, 90], [0, -380, 90]].forEach(function (b) { c.beginPath(); c.arc(b[0], b[1], b[2], 0, 7); c.fill(); }); c.restore(); },
    diya: function (c, t) { diyas(c, t, H * 0.86); },
    stars: function () {}
  };

  function kahani() {
    var SC = [], IMG = [], FACTS = [], T = 0;
    function describe() {
      return { surface: "kahani", label: "Kahani", size: { W: W, H: H },
               layouts: [{ id: "kahani", label: "Kahani — story reel / कहानी रील", group: "Kahani", defaultSeconds: 45 }],
               safeZones: { title: { x: W * 0.05, y: H * 0.035, w: W * 0.9, h: H * 0.09 },
                            caption: { x: W * 0.06, y: H * 0.86 - 260, w: W * 0.88, h: 240 },
                            footer: { x: W * 0.05, y: H * 0.95, w: W * 0.9, h: H * 0.05 } } };
    }
    /* scenes are accepted (sanitised) first; configure rasterises them */
    function accept(scenes) {
      var removed = 0;
      SC = (scenes || []).slice(0, 12).map(function (s) {
        var r = RA.sanitize.svg(s.svg || "");
        removed += r.removed;
        var m = s.motion || {};
        return { svg: r.ok ? r.svg : "", seconds: Math.max(3, Math.min(12, +s.seconds || 6)),
                 props: (s.props || []).filter(function (p) { return PROPS[p]; }).slice(0, 6),
                 motion: { entrance: /^(fade|rise|zoom)$/.test(m.entrance) ? m.entrance : "fade",
                           bob: Math.max(0, Math.min(1, +m.bob || 0)), parallax: Math.max(0, Math.min(1, +m.parallax || 0)),
                           sway: Math.max(0, Math.min(1, +m.sway || 0)) },
                 kicker: String(s.kicker || "").split(/\s+/).slice(0, 3).join(" "), say: String(s.say || "") };
      });
      T = SC.reduce(function (a, s) { return a + s.seconds; }, 0);
      return { scenes: SC, removed: removed };
    }
    function raster(s) {
      return new Promise(function (res) {
        if (!s.svg) return res(null);
        var blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' + s.svg + "</svg>"], { type: "image/svg+xml" });
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res(im); };
        im.onerror = function () { URL.revokeObjectURL(u); res(null); };
        im.src = u;
      });
    }
    function configure(spec) {
      if (spec && spec.scenes) accept(spec.scenes);
      if (spec && spec.facts) FACTS = spec.facts;
      return Promise.all(SC.map(raster)).then(function (ims) { IMG = ims; return describe(); });
    }
    function beats() {
      var t = 0;
      return SC.map(function (s, i) { var b = { i: i, from: t, to: t + s.seconds, secs: s.seconds, say: s.say }; t += s.seconds; return b; });
    }
    function frame(p, c) {
      var t = p * T, acc = 0, k = 0;
      for (k = 0; k < SC.length - 1 && t >= acc + SC[k].seconds; k++) acc += SC[k].seconds;
      var s = SC[k], lt = t - acc, f = s ? lt / s.seconds : 0;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
      background(c, t);
      if (!s) return;
      var zoom = 1 + 0.08 * f, px = (f - 0.5) * s.motion.parallax;
      c.save(); c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-W / 2, -H / 2);
      s.props.forEach(function (pr) { if (pr !== "diya") PROPS[pr](c, t, px, s.motion.sway); });
      var e = Math.min(1, lt / 0.6), ease = e * e * (3 - 2 * e);
      if (IMG[k]) {
        c.save();
        c.globalAlpha = s.motion.entrance === "fade" ? ease : 1;
        var dy = (s.motion.entrance === "rise" ? (1 - ease) * 120 : 0) + Math.sin(t * 2.2) * 14 * s.motion.bob;
        var sc = s.motion.entrance === "zoom" ? 0.85 + 0.15 * ease : 1;
        c.translate(W / 2, H / 2 + dy); c.rotate(Math.sin(t * 1.1) * 0.015 * s.motion.sway); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
        c.drawImage(IMG[k], 0, 0, W, H);
        c.restore();
      }
      c.restore();
      if (s.props.indexOf("diya") >= 0 || !s.props.length) diyas(c, t, H * 0.90);
    }
    return { describe: describe, configure: configure, ready: function () { return SC.length > 0; },
             duration: function () { return T; }, beats: beats,
             facts: function () { return RA.facts.FRAMEWORK.concat(FACTS); }, frame: frame,
             title: function () { return SC[0] ? SC[0].kicker : ""; }, accept: accept,
             postCaption: function () { return ""; } };
  }
  RA.adapter.register("kahani", kahani);
  var shared = null;
  RA.kahani = { surface: function () { return shared || (shared = RA.adapter.make("kahani")); },
                accept: function (scenes) { return RA.kahani.surface().accept(scenes); } };
})();
