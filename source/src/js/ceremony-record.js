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

  /* Rasterising, mime-picking and the encoder loop live in svg-film.js:
     they are not about the ceremony, and the ayanāṃśa page films a quite
     different drawing through exactly the same machinery. This file keeps
     what IS about the ceremony — the trace of what the reader did, and the
     frame it is composed into. */

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

  /* ---- the take, rendered ----------------------------------------------
     The trace is replayed through svg-film: at(ms) puts the real overlay into
     the state it held at ms, and the film photographs it. Pacing, encoding
     and the wall-clock timestamp problem are all that module's business. */
  function render(trace, opt) {
    opt = opt || {};
    var hold = opt.holdMs == null ? 1200 : opt.holdMs;   /* a beat on the settled sky */
    var f = window.SPCosmos && window.SPCosmos.frame && window.SPCosmos.frame();
    if (!f) return Promise.reject(new Error("the ceremony is not on screen"));
    if (!f.svg()) return Promise.reject(new Error("the wheel is not on screen"));
    if (!window.SvgFilm) return Promise.reject(new Error("the film layer is missing"));
    /* the live loops would fight the stepping, so they stop for the duration */
    f.pause();
    var meta = opt.meta || {};
    return window.SvgFilm.record({
      width: opt.width || 1080, height: opt.height || 1920,
      runMs: length(trace) + hold,
      svg: function () { return f.svg(); },
      at: function (ms) {
        var st = at(trace, Math.min(length(trace), ms));
        f.set({ p: st.p, spin: st.spin });
      },
      compose: function (c, W, H, shot) { compose(c, W, H, shot, meta); },
      onProgress: opt.onProgress
    });
  }

  window.CerRec = { start: start, stop: stop, sampling: sampling,
                    length: length, at: at, render: render };
})();
