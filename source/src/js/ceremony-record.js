/* ceremony-record.js — the casting ceremony, recorded as a shareable file.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT. It is not a screen recorder. Nothing is
 * sampled from a clock while it plays, so nothing can be dropped by a busy
 * machine: the reader's spin is TRACED while they play, and then the ceremony
 * is RE-RUN frame by frame, each frame drawn, rasterised and handed to the
 * encoder before the next one is asked for. The output is constant frame rate
 * by construction and identical on a slow laptop and a fast one, only later.
 * That is the same bargain 58-motion-capture.js makes for the Motion scenes,
 * and the reasoning there is worth reading; this file differs only in that
 * the thing being stepped is an SVG rather than a canvas.
 *
 * WHY IT HAS TO RASTERISE. The ceremony is drawn in SVG — twenty-seven
 * nakṣatra sectors, the spokes, the sign names and nine lit graha sprites,
 * all under a perspective divide. There is no canvas to captureStream() from.
 * The honest options were to re-implement the whole projection in canvas 2D,
 * which puts a second copy of it in the repository to drift from the first,
 * or to photograph the real one each frame. This photographs the real one:
 * serialise the live SVG, draw it into a canvas, push the frame. One
 * renderer, and the video cannot disagree with what was on screen.
 *
 * THE CSS HAS TO COME WITH IT. An <img> pointed at serialised SVG is an
 * isolated document: it cannot see cosmos.css, so every class-driven fill,
 * stroke and font would fall back to black-on-nothing. Each element's
 * computed values for the properties that matter are written onto it as
 * presentation attributes before serialising. This is why the first frame
 * costs more than the rest.
 *
 * NOTHING LEAVES THE MACHINE. MediaRecorder is in the browser, the graha
 * sprites are data URIs and the serialised SVG has no external reference, so
 * the canvas is never tainted and no permission is asked for. There is no
 * getDisplayMedia here: the reader is never shown a "share your screen"
 * dialog, and the file contains the ceremony rather than their desktop.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  /* ---- the trace -------------------------------------------------------
     What the reader did, as data: the wind-back progress and the ring's
     rotation, sampled while they watch. Two numbers per sample is enough to
     reproduce the whole ceremony, because place(p) is a pure function of
     them. */
  var TRACE = null, RAF = null;

  function sampling() { return !!TRACE; }

  function start() {
    var f = window.SPCosmos && window.SPCosmos.frame && window.SPCosmos.frame();
    if (!f) return false;
    TRACE = { t0: now(), rows: [] };
    tick();
    return true;
  }
  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }
  function tick() {
    if (!TRACE) return;
    var f = window.SPCosmos && window.SPCosmos.frame && window.SPCosmos.frame();
    if (!f) {
      /* The overlay has gone. STOP SAMPLING, but do not discard: stop() is
         what hands the take to its owner, and calling it from in here raced
         the caller watching for the same event — whichever ran first took
         the rows and the other got null. The sampler ends the take; only
         stop() clears it. */
      if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
      TRACE.closed = true;
      return;
    }
    var st = f.read();
    TRACE.rows.push({ t: now() - TRACE.t0, p: st.p, spin: st.spin });
    RAF = requestAnimationFrame(tick);
  }
  function stop() {
    if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
    var t = TRACE; TRACE = null;
    return t && t.rows.length > 1 ? t : null;
  }
  function length(t) {
    return t && t.rows.length ? t.rows[t.rows.length - 1].t : 0;
  }

  /* The state at an arbitrary instant. The rows are in order, so this walks
     rather than searches; spin is interpolated because the ring drifts
     continuously and a step would show as a stutter the reader never made. */
  function at(trace, ms) {
    var r = trace.rows, i;
    if (ms <= r[0].t) return r[0];
    if (ms >= r[r.length - 1].t) return r[r.length - 1];
    for (i = 1; i < r.length; i++) {
      if (r[i].t >= ms) {
        var a = r[i - 1], b = r[i], span = b.t - a.t;
        var k = span > 0 ? (ms - a.t) / span : 0;
        return { t: ms, p: a.p + (b.p - a.p) * k, spin: a.spin + (b.spin - a.spin) * k };
      }
    }
    return r[r.length - 1];
  }

  /* ---- rasterising the live SVG ---------------------------------------- */

  /* Only the properties that actually draw. Copying the whole computed style
     makes a document several megabytes per frame, which is slower to
     serialise than the drawing is to make. */
  var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
               "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
               "font-family", "font-size", "font-weight", "font-style",
               "text-anchor", "letter-spacing", "paint-order", "display",
               "dominant-baseline"];

  function inlineStyles(src, dst) {
    var a = src.querySelectorAll("*"), b = dst.querySelectorAll("*"), i, j;
    /* the root carries its own styling too */
    bake(src, dst);
    for (i = 0; i < a.length && i < b.length; i++) bake(a[i], b[i]);
    function bake(from, to) {
      var cs = window.getComputedStyle(from);
      if (!cs) return;
      for (j = 0; j < PROPS.length; j++) {
        var v = cs.getPropertyValue(PROPS[j]);
        if (v) to.setAttribute(PROPS[j], v);
      }
      to.removeAttribute("class");
    }
  }

  /* A promise for one <img> holding the SVG as it stands right now. */
  function snapshot(svg) {
    return new Promise(function (res, rej) {
      var copy = svg.cloneNode(true);
      inlineStyles(svg, copy);
      /* CROPPED TO THE DRAWING, not to the viewBox. The overlay's viewBox
         (-205 -165 410 330) is sized for a page where the wheel sits in the
         middle of a dialog with room around it; fitting that box to a feed
         frame spent a third of the width on empty margin and left the ring
         looking like a postage stamp in the first export. getBBox gives the
         union of what is actually drawn, so the crop follows the ring and
         its labels however the perspective has swung them. */
      var vb = svg.getAttribute("viewBox") || "0 0 410 330";
      var box = vb.split(/\s+/).map(Number);
      try {
        var bb = svg.getBBox();
        if (bb && bb.width > 1 && bb.height > 1) {
          var m = Math.max(bb.width, bb.height) * 0.03;    /* a hair of air */
          box = [bb.x - m, bb.y - m, bb.width + m * 2, bb.height + m * 2];
        }
      } catch (e) {}
      copy.setAttribute("xmlns", NS);
      copy.setAttribute("viewBox", box.join(" "));
      copy.setAttribute("width", box[2]);
      copy.setAttribute("height", box[3]);
      var txt = new XMLSerializer().serializeToString(copy);
      /* a data: URI rather than a blob: URL — a blob URL is same-origin and
         fine in a browser, but under file:// the origin is "null" and some
         engines refuse it, and this site has to work opened from Finder */
      var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
      var im = new Image();
      im.onload = function () { res({ img: im, w: +box[2], h: +box[3] }); };
      im.onerror = function () { rej(new Error("the wheel could not be rasterised")); };
      im.src = url;
    });
  }

  /* ---- the frame --------------------------------------------------------
     Composed for a feed rather than cropped from a page: a tall canvas, the
     wheel across the middle, and the words the overlay itself carries. The
     reader's browser chrome, cursor and desktop are not in it, because this
     never photographed their screen. */
  function compose(c, W, H, shot, meta) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#131a33");
    g.addColorStop(0.55, "#0a0e1d");
    g.addColorStop(1, "#05070e");
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    /* The wheel fills the band between the words above and the footer below,
       centred in it. The band is computed rather than guessed so that a 1:1
       frame and a 9:16 frame both place it sensibly instead of one of them
       having a field of empty sky. */
    var top = Math.round(H * (meta.date ? 0.265 : 0.225));
    var bot = Math.round(H * 0.80);
    var availW = W - Math.round(W * 0.03) * 2, availH = bot - top;
    var k = Math.min(availW / shot.w, availH / shot.h);
    var dw = shot.w * k, dh = shot.h * k;
    c.drawImage(shot.img, (W - dw) / 2, top + (availH - dh) / 2, dw, dh);

    c.textAlign = "center";
    c.fillStyle = "#f3e9cf";
    c.font = "600 " + Math.round(W * 0.052) + "px Georgia, serif";
    c.fillText(meta.line || "", W / 2, Math.round(H * 0.135));
    c.fillStyle = "#9fa8c6";
    c.font = Math.round(W * 0.030) + "px Georgia, serif";
    c.fillText(meta.sub || "", W / 2, Math.round(H * 0.175));
    if (meta.date) {
      c.fillStyle = "#e8c874";
      c.font = "600 " + Math.round(W * 0.040) + "px Georgia, serif";
      c.fillText(meta.date, W / 2, Math.round(H * 0.225));
    }
    c.fillStyle = "#8d96b4";
    c.font = Math.round(W * 0.024) + "px Georgia, serif";
    c.fillText(meta.foot || "", W / 2, Math.round(H * 0.845));
    if (meta.handle) {
      c.fillStyle = "#e8c874";
      c.font = "600 " + Math.round(W * 0.030) + "px Georgia, serif";
      c.fillText(meta.handle, W / 2, Math.round(H * 0.895));
    }
  }

  /* ---- the encoder ------------------------------------------------------
     captureStream(0) means "this stream produces no frames on its own"; every
     frame is pushed deliberately with requestFrame() once its draw has
     finished. That is what makes the rate constant rather than a measurement
     of how busy the machine was. */
  function pickMime() {
    var want = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264",
                "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    if (typeof MediaRecorder === "undefined") return null;
    for (var i = 0; i < want.length; i++) {
      try { if (MediaRecorder.isTypeSupported(want[i])) return want[i]; } catch (e) {}
    }
    return null;
  }

  /* Record `trace` into a file. Returns a promise for {blob, ext, frames}. */
  function render(trace, opt) {
    opt = opt || {};
    var fps = opt.fps || 30;
    var W = opt.width || 1080, H = opt.height || 1920;
    var hold = opt.holdMs == null ? 1200 : opt.holdMs;   /* a beat on the settled sky */
    var f = window.SPCosmos && window.SPCosmos.frame && window.SPCosmos.frame();
    if (!f) return Promise.reject(new Error("the ceremony is not on screen"));
    var svg = f.svg();
    if (!svg) return Promise.reject(new Error("the wheel is not on screen"));
    var mime = pickMime();
    if (!mime) return Promise.reject(new Error("this browser cannot encode video"));

    /* the live loops would fight the stepping, so they stop for the duration */
    f.pause();

    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    if (!cv.captureStream) return Promise.reject(new Error("this browser cannot capture a canvas"));
    var stream = cv.captureStream(0);
    var track = stream.getVideoTracks()[0];
    var rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

    /* HOW THE TIMELINE IS PACED, and why not by frame number.
       captureStream(0) + requestFrame() stamps each frame with the moment it
       was pushed, so the file's duration is the wall time the render took,
       not frames ÷ fps. Stepping the content by 1/fps therefore produced a
       correct-looking 203-frame take that played for 15.5s instead of 6.8s —
       the whole ceremony at half speed, because rasterising a frame costs
       about 76ms and the encoder believed every one of them.

       So the content is paced by ELAPSED TIME instead. Frame i shows the
       ceremony as it stood at the wall-clock moment i is being pushed, which
       makes the file's speed and length match what the reader actually did.
       What varies with the machine is the number of frames inside that
       duration — smoothness — rather than the speed of the motion. That is
       the right thing to trade: a choppier video of the right ceremony beats
       a smooth video of a slower one.

       `total` is now only an estimate, used to report progress. */
    var runMs = length(trace) + hold;
    var total = Math.max(1, Math.round(runMs / 1000 * fps));
    var meta = opt.meta || {};
    var done, fail;
    var out = new Promise(function (a, b) { done = a; fail = b; });

    rec.onstop = function () {
      var ext = mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      done({ blob: new Blob(chunks, { type: mime }), ext: ext, frames: i,
             seconds: runMs / 1000 });
    };
    rec.start();

    var i = 0, t0 = now();
    function next() {
      var elapsed = now() - t0;
      if (elapsed >= runMs) {
        try { rec.stop(); } catch (e) { fail(e); }
        return;
      }
      var st = at(trace, Math.min(length(trace), elapsed));
      f.set({ p: st.p, spin: st.spin });
      snapshot(svg).then(function (shot) {
        compose(c, W, H, shot, meta);
        try { track.requestFrame(); } catch (e) {}
        i++;
        if (opt.onProgress) opt.onProgress(Math.min(1, (now() - t0) / runMs));
        /* yield to the event loop so the page can paint its progress and a
           long export does not read as a hang */
        setTimeout(next, 0);
      }).catch(function (e) {
        try { rec.stop(); } catch (e2) {}
        fail(e);
      });
    }
    next();
    return out;
  }

  window.CerRec = { start: start, stop: stop, sampling: sampling,
                    length: length, at: at, render: render,
                    snapshot: snapshot, pickMime: pickMime };
})();
