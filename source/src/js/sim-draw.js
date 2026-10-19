/* ===== Drawing a counterfactual ===========================================

   THE HARD PART IS THE SCALE, and it is worth saying why before the code.

   These scenarios span four orders of magnitude. At the Roche limit the Moon
   is nine thousand kilometres from the Earth's centre, about a tenth of an
   Earth diameter above the ground. When it is sped up past escape it ends two
   million kilometres away. One fixed scale cannot show both: at the escape
   scale the Roche orbit is a dot, and at the Roche scale the escaping Moon
   leaves the frame in the first second and never comes back.

   So the view frames ITSELF from the run it is given — it finds the farthest
   the Moon actually gets and fits that — and then it says what scale it
   arrived at, in kilometres and in Earth diameters, because a picture that
   silently rescales between runs is a picture that makes everything look the
   same. The Earth and the Moon are drawn at their true sizes against that
   scale wherever there is room to see them, and when there is not, they are
   drawn at a floor and the frame says so. Two bodies the right size relative
   to their orbit is one of the few things a drawing can teach here that a
   number cannot: at the real distance, the Earth is a very small dot.

   THE SUN'S DIRECTION IS ALWAYS SHOWN, because almost every interesting
   quantity on this page is about the angle between the Moon and the Sun — the
   synodic month, the tithi, the pakṣa, whether an eclipse is possible. With
   the frame held in a fixed orientation and the Sun's arrow sweeping round
   it, the difference between the sidereal month and the synodic one stops
   being a definition and becomes something you watch happen. */

(function () {
  "use strict";

  var AU_KM = 149597870.7;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var PAL = {
    bg: "#0b1020", bg2: "#161d3a", ink: "#f2efe4", dim: "#8f96bb",
    line: "#2b3358", gold: "#d9b668", warm: "#e07a60", cool: "#5fbf8f",
    star: "#dfe6ff", earth: "#4d7fd0", moon: "#cfd4e4", sun: "#ffc83d"
  };

  /* ---- framing ------------------------------------------------------------ */
  /* The farthest the Moon gets from the Earth across the whole run, which is
     what the view has to fit. Computed once per run, not per frame, so the
     scale does not breathe while the animation plays — a scale that moves
     turns every orbit into a circle. */
  function extent(res) {
    var max = 0;
    res.frames.forEach(function (f) {
      var e = null, m = null;
      f.b.forEach(function (q) {
        if (q.name === "Earth") e = q;
        if (q.name === "Moon" && q.alive) m = q;
      });
      if (!e || !m) return;
      var d = Math.hypot(m.x - e.x, m.y - e.y, m.z - e.z);
      if (d > max) max = d;
    });
    return max || 0.003;
  }

  function bodiesOf(frame) {
    var o = {};
    frame.b.forEach(function (q) { o[q.name] = q; });
    return o;
  }

  /* ---- the plan view ------------------------------------------------------ */
  /* Earth-centred, looking down on the ecliptic, in a FIXED orientation — the
     frame does not turn with the Moon. That is what makes the Sun's arrow
     sweep once a year while the Moon goes round thirteen times, which is the
     whole of the difference between the two kinds of month. */
  function plan(c, W, H, res, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    var n = res.frames.length;
    var i = clamp(Math.floor(p * (n - 1)), 0, n - 1);
    var f = res.frames[i];
    var B = bodiesOf(f);
    if (!B.Earth) return null;

    var cx = W / 2, cy = H * 0.46;
    var R = Math.min(W, H) * 0.38;
    var ext = opts.extent != null ? opts.extent : extent(res);
    var scale = R / (ext * 1.08);               /* pixels per AU */

    /* the trail — every frame up to now, so the shape of the orbit is the
       thing on the screen rather than a point moving */
    c.save();
    c.lineWidth = Math.max(1, W * 0.0022);
    c.strokeStyle = P.gold;
    c.globalAlpha = 0.5;
    c.beginPath();
    var started = false;
    for (var k = 0; k <= i; k++) {
      var g = bodiesOf(res.frames[k]);
      if (!g.Moon || !g.Moon.alive || !g.Earth) continue;
      var x = cx + (g.Moon.x - g.Earth.x) * scale;
      var y = cy - (g.Moon.y - g.Earth.y) * scale;
      if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
    }
    if (started) c.stroke();
    c.restore();

    /* the Earth, at its true size against this scale where that is visible */
    var eR = Math.max(1.5, B.Earth.r * scale);
    c.fillStyle = P.earth;
    c.beginPath(); c.arc(cx, cy, eR, 0, Math.PI * 2); c.fill();
    /* and the Moon */
    if (B.Moon && B.Moon.alive) {
      var mx = cx + (B.Moon.x - B.Earth.x) * scale;
      var my = cy - (B.Moon.y - B.Earth.y) * scale;
      var mR = Math.max(1.2, B.Moon.r * scale);
      c.fillStyle = P.moon;
      c.beginPath(); c.arc(mx, my, mR, 0, Math.PI * 2); c.fill();
      /* the line joining them, which is what every elongation is measured
         against */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1, W * 0.0012);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
      c.restore();
    }

    /* the Sun's direction */
    if (B.Sun) {
      var dx = B.Sun.x - B.Earth.x, dy = B.Sun.y - B.Earth.y;
      var L = Math.hypot(dx, dy) || 1;
      var ax = cx + dx / L * R * 1.12, ay = cy - dy / L * R * 1.12;
      c.save();
      c.strokeStyle = P.sun; c.globalAlpha = 0.85;
      c.lineWidth = Math.max(1, W * 0.0025);
      c.setLineDash([W * 0.012, W * 0.01]);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(ax, ay); c.stroke();
      c.setLineDash([]);
      c.fillStyle = P.sun;
      c.beginPath(); c.arc(ax, ay, Math.max(3, W * 0.012), 0, Math.PI * 2); c.fill();
      c.fillStyle = P.dim;
      c.font = "600 " + Math.round(W * 0.022) + "px system-ui,sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("Sūrya", ax, ay + W * 0.030);
      c.restore();
      /* the elongation, which is the tithi */
      if (B.Moon && B.Moon.alive) {
        var am = Math.atan2(B.Moon.y - B.Earth.y, B.Moon.x - B.Earth.x);
        var as = Math.atan2(dy, dx);
        var el = ((am - as) * 180 / Math.PI % 360 + 360) % 360;
        c.save();
        c.strokeStyle = P.cool; c.globalAlpha = 0.5;
        c.lineWidth = Math.max(1, W * 0.004);
        c.beginPath();
        c.arc(cx, cy, R * 0.30, -as, -am, true);
        c.stroke();
        c.restore();
        opts.elongation = el;
      }
    }
    return { scale: scale, extent: ext, frame: i, t: f.t, bodies: B,
             cx: cx, cy: cy, R: R };
  }

  /* ---- the edge-on view --------------------------------------------------- */
  /* Looking along the ecliptic, so the inclination is the subject. Worth its
     own panel because the nodes — Rāhu and Ketu — are precisely the two
     places this view crosses the centre line, and in the plan view they
     cannot be seen at all. */
  function side(c, W, H, res, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    var n = res.frames.length;
    var i = clamp(Math.floor(p * (n - 1)), 0, n - 1);
    var ext = opts.extent != null ? opts.extent : extent(res);
    var cx = W / 2, cy = H / 2;
    var scale = (Math.min(W, H) * 0.40) / (ext * 1.08);
    /* the vertical is exaggerated, and the frame says by how much: the real
       figure is five degrees, which at an honest scale is a line */
    var vex = opts.vex || 6;

    c.save();
    c.strokeStyle = P.line; c.globalAlpha = 0.8;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.stroke();
    c.restore();

    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.55;
    c.lineWidth = Math.max(1, W * 0.002);
    c.beginPath();
    var started = false;
    for (var k = 0; k <= i; k++) {
      var g = bodiesOf(res.frames[k]);
      if (!g.Moon || !g.Moon.alive || !g.Earth) continue;
      var x = cx + (g.Moon.x - g.Earth.x) * scale;
      var y = cy - (g.Moon.z - g.Earth.z) * scale * vex;
      if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
    }
    if (started) c.stroke();
    c.restore();

    var B = bodiesOf(res.frames[i]);
    if (!B.Earth) { c.restore ; return null; }
    c.fillStyle = P.earth;
    c.beginPath();
    c.arc(cx, cy, Math.max(1.5, B.Earth.r * scale), 0, Math.PI * 2);
    c.fill();
    if (B.Moon && B.Moon.alive) {
      c.fillStyle = P.moon;
      c.beginPath();
      c.arc(cx + (B.Moon.x - B.Earth.x) * scale,
            cy - (B.Moon.z - B.Earth.z) * scale * vex,
            Math.max(1.2, B.Moon.r * scale), 0, Math.PI * 2);
      c.fill();
    }
    return { vex: vex, scale: scale };
  }

  /* ---- the comparison of apparent sizes ----------------------------------
     Two discs the size the Sun and the Moon appear from the ground. Whether
     the Moon's is the larger is the whole question of whether a total solar
     eclipse is possible at all, and it is a question a drawing answers better
     than a table of arcminutes. */
  function discs(c, W, H, cons, opts) {
    var P = (opts && opts.pal) || PAL;
    var sunMin = 31.6, sunMax = 32.7;
    var mn = cons.moonAngular ? cons.moonAngular.min : null;
    var mx = cons.moonAngular ? cons.moonAngular.max : null;
    var top = Math.max(sunMax, mx || 0) * 1.25;
    var R = Math.min(W, H) * 0.34;
    function rad(min) { return R * (min / top); }
    var cy = H * 0.46;
    var x1 = W * 0.30, x2 = W * 0.70;

    c.save();
    c.fillStyle = P.sun; c.globalAlpha = 0.9;
    c.beginPath(); c.arc(x1, cy, rad(sunMax), 0, Math.PI * 2); c.fill();
    c.restore();
    c.save();
    c.strokeStyle = P.sun; c.globalAlpha = 0.5;
    c.lineWidth = 1;
    c.beginPath(); c.arc(x1, cy, rad(sunMin), 0, Math.PI * 2); c.stroke();
    c.restore();
    if (mx != null) {
      c.save();
      c.fillStyle = P.moon; c.globalAlpha = 0.9;
      c.beginPath(); c.arc(x2, cy, rad(mx), 0, Math.PI * 2); c.fill();
      c.restore();
      c.save();
      c.strokeStyle = P.moon; c.globalAlpha = 0.5;
      c.lineWidth = 1;
      c.beginPath(); c.arc(x2, cy, rad(mn), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.fillStyle = P.dim;
    c.font = "600 " + Math.round(W * 0.030) + "px system-ui,sans-serif";
    c.textAlign = "center"; c.textBaseline = "top";
    c.fillText("Sūrya  " + sunMin + "′–" + sunMax + "′", x1, cy + R * 1.08);
    if (mx != null)
      c.fillText("Candra  " + mn.toFixed(1) + "′–" + mx.toFixed(1) + "′",
                 x2, cy + R * 1.08);
    else c.fillText("no Moon", x2, cy + R * 1.08);
    c.font = "700 " + Math.round(W * 0.034) + "px system-ui,sans-serif";
    c.fillStyle = cons.flags && cons.flags.totalEclipse ? P.cool : P.warm;
    c.fillText(mx == null ? "no eclipses of any kind"
      : (cons.flags.totalEclipse
         ? "the Moon can still cover the Sun — totality is possible"
         : "the Moon can never cover the Sun — no totality"),
      W / 2, H * 0.90);
    c.restore && c.restore;
  }

  /* ---- chrome ------------------------------------------------------------- */
  function background(c, W, H, P) {
    P = P || PAL;
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  /* The scale bar. Not decoration: without it every one of these runs looks
     the same size, and the difference between nine thousand kilometres and
     two million is the entire content of several of them. */
  function scaleBar(c, W, H, pxPerAU, P) {
    P = P || PAL;
    var want = W * 0.22 / pxPerAU * AU_KM;            /* km for a bar */
    var pow = Math.pow(10, Math.floor(Math.log10(want)));
    var nice = [1, 2, 5, 10].map(function (q) { return q * pow; })
      .reduce(function (a, b) {
        return Math.abs(b - want) < Math.abs(a - want) ? b : a; });
    var px = nice / AU_KM * pxPerAU;
    var x0 = W * 0.06, y0 = H * 0.93;
    c.save();
    c.strokeStyle = P.dim; c.lineWidth = Math.max(1, W * 0.002);
    c.beginPath();
    c.moveTo(x0, y0); c.lineTo(x0 + px, y0);
    c.moveTo(x0, y0 - H * 0.008); c.lineTo(x0, y0 + H * 0.008);
    c.moveTo(x0 + px, y0 - H * 0.008); c.lineTo(x0 + px, y0 + H * 0.008);
    c.stroke();
    c.fillStyle = P.dim;
    c.font = "600 " + Math.round(W * 0.020) + "px system-ui,sans-serif";
    c.textAlign = "left"; c.textBaseline = "bottom";
    c.fillText(nice >= 1e6 ? (nice / 1e6).toFixed(nice % 1e6 ? 1 : 0) + " million km"
      : Math.round(nice).toLocaleString("en") + " km", x0, y0 - H * 0.014);
    c.fillText("the Earth is " + (12742 / AU_KM * pxPerAU).toFixed(1) +
      " px across here", x0, y0 + H * 0.040);
    c.restore();
  }
  function caption(c, W, H, lines, P) {
    P = P || PAL;
    c.save();
    c.textAlign = "center"; c.textBaseline = "top";
    var y = H * 0.035;
    lines.forEach(function (L, i) {
      c.fillStyle = i === 0 ? P.gold : P.dim;
      c.font = (i === 0 ? "700 " : "500 ") +
        Math.round(W * (i === 0 ? 0.034 : 0.024)) + "px system-ui,sans-serif";
      c.fillText(L, W / 2, y);
      y += W * (i === 0 ? 0.046 : 0.034);
    });
    c.restore();
  }
  /* the elapsed time, which for a four-day collision and a nine-hundred-day
     orbit cannot be the same unit */
  function clock(c, W, H, days, P) {
    P = P || PAL;
    var s;
    if (days < 2) s = (days * 24).toFixed(1) + " hours";
    else if (days < 400) s = days.toFixed(1) + " days";
    else s = (days / 365.2564).toFixed(2) + " years";
    c.save();
    c.fillStyle = P.ink;
    c.font = "600 " + Math.round(W * 0.026) + "px system-ui,sans-serif";
    c.textAlign = "right"; c.textBaseline = "top";
    c.fillText(s, W * 0.94, H * 0.035);
    c.restore();
  }

  /* ---- the whole scene ---------------------------------------------------- */
  /* One canvas, the plan view large with the edge-on view inset, because the
     inclination is a small part of the story and a full second panel would
     say otherwise. */
  function scene(c, W, H, res, cons, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    background(c, W, H, P);
    var ext = extent(res);
    var info = plan(c, W, H, res, p, { pal: P, extent: ext });
    if (!info) return null;

    /* the edge-on inset */
    var iw = W * 0.34, ih = H * 0.16;
    var ix = W - iw - W * 0.05, iy = H - ih - H * 0.10;
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = "rgba(0,0,0,0.30)";
    c.fillRect(ix, iy, iw, ih);
    c.strokeStyle = P.line; c.lineWidth = 1;
    c.strokeRect(ix, iy, iw, ih);
    c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
    c.translate(ix, iy);
    side(c, iw, ih, res, p, { pal: P, extent: ext, vex: opts.vex || 6 });
    c.restore();
    c.save();
    c.fillStyle = P.dim;
    c.font = "500 " + Math.round(W * 0.017) + "px system-ui,sans-serif";
    c.textAlign = "right"; c.textBaseline = "bottom";
    c.fillText("edge-on, height × " + (opts.vex || 6), ix + iw, iy - 3);
    c.restore();

    scaleBar(c, W, H, info.scale, P);
    clock(c, W, H, info.t, P);
    var lines = [cons.label];
    if (cons.headline) lines.push(cons.headline);
    caption(c, W, H, lines, P);
    return info;
  }

  window.SimDraw = {
    PAL: PAL, extent: extent, plan: plan, side: side, discs: discs,
    scene: scene, background: background, scaleBar: scaleBar,
    caption: caption, clock: clock, bodiesOf: bodiesOf
  };
})();
