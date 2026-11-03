/* svg-film.js — turn an SVG that can be redrawn into a video file.
 *
 * WHERE THIS CAME FROM. It was written inside ceremony-record.js to film the
 * casting ceremony, and then the ayanāṃśa page needed exactly the same thing
 * for a quite different drawing. The parts that are not about the ceremony
 * are here, and both callers use them rather than carrying a copy each.
 *
 * WHAT IT IS, AND WHAT IT IS NOT. It is not a screen recorder. Nothing is
 * sampled from a clock and no permission is asked for, so the viewer's
 * desktop, cursor and browser cannot appear in the file. The caller hands
 * over a function that puts the drawing into a given state, and this steps
 * that function, photographs the result, and encodes one frame per photograph
 * before asking for the next.
 *
 * WHY IT PHOTOGRAPHS RATHER THAN REDRAWS. The drawings these pages make are
 * SVG, so there is no canvas to captureStream() from. The alternative to
 * photographing the real one was re-implementing each drawing in canvas 2D,
 * which puts a second copy of it in the repository to drift from the first.
 * This serialises the live SVG every frame. The cost is real — a frame is
 * tens of milliseconds — and is why the timeline is paced as it is below.
 *
 * THE CSS HAS TO COME WITH IT. An <img> pointed at serialised SVG is an
 * isolated document and cannot see the page's stylesheet, so every
 * class-driven fill, stroke and font would fall back to a browser default.
 * The computed value of each property that actually draws is written onto the
 * element as an attribute first.
 *
 * HOW THE TIMELINE IS PACED, and why not by frame number. captureStream(0)
 * with requestFrame() stamps each frame with the moment it is pushed, so a
 * file's duration is the wall time the render took, not frames ÷ fps.
 * Stepping content by 1/fps therefore produced a correct-looking take that
 * played at half speed, because rasterising a frame costs more than a frame's
 * worth of time and the encoder believed every one of them. The caller's
 * timeline is driven by ELAPSED time instead, so speed and length come out
 * right; what varies with the machine is how many frames land inside that
 * duration — smoothness — rather than the speed of the motion.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  /* Only the properties that actually draw. Copying a whole computed style
     makes a document several megabytes a frame, which is slower to serialise
     than the drawing is to make. */
  var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
               "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
               "font-family", "font-size", "font-weight", "font-style",
               "text-anchor", "letter-spacing", "paint-order", "display",
               "dominant-baseline"];

  function inlineStyles(src, dst) {
    var a = src.querySelectorAll("*"), b = dst.querySelectorAll("*"), i;
    bake(src, dst);
    for (i = 0; i < a.length && i < b.length; i++) bake(a[i], b[i]);
    function bake(from, to) {
      var cs = window.getComputedStyle(from);
      if (!cs) return;
      for (var j = 0; j < PROPS.length; j++) {
        var v = cs.getPropertyValue(PROPS[j]);
        if (v) to.setAttribute(PROPS[j], v);
      }
      to.removeAttribute("class");
    }
  }

  /* One <img> holding the SVG exactly as it stands right now.
     Cropped to what is DRAWN rather than to the viewBox: a viewBox is sized
     for the page it sits on, and fitting it to a feed frame can spend a third
     of the width on margin. getBBox follows the drawing instead. */
  function snapshot(svg, opt) {
    opt = opt || {};
    return new Promise(function (res, rej) {
      var copy = svg.cloneNode(true);
      inlineStyles(svg, copy);
      var vb = svg.getAttribute("viewBox") || "0 0 100 100";
      var box = vb.split(/\s+/).map(Number);
      if (opt.crop !== false) {
        try {
          var bb = svg.getBBox();
          if (bb && bb.width > 1 && bb.height > 1) {
            var m = Math.max(bb.width, bb.height) * (opt.margin == null ? 0.03 : opt.margin);
            box = [bb.x - m, bb.y - m, bb.width + m * 2, bb.height + m * 2];
          }
        } catch (e) {}
      }
      copy.setAttribute("xmlns", NS);
      copy.setAttribute("viewBox", box.join(" "));
      copy.setAttribute("width", box[2]);
      copy.setAttribute("height", box[3]);
      var txt = new XMLSerializer().serializeToString(copy);
      /* a data: URI rather than a blob: URL — a blob URL is same-origin and
         fine over http, but under file:// the origin is "null" and some
         engines refuse it, and this site has to work opened from Finder */
      var im = new Image();
      im.onload = function () { res({ img: im, w: +box[2], h: +box[3] }); };
      im.onerror = function () { rej(new Error("the drawing could not be rasterised")); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
    });
  }

  /* The container the browser can actually encode, asked rather than assumed.
     Safari gives H.264 in MP4, which is what a phone wants; everything else
     gives WebM, which every editor reads and which uploads fine. */
  function pickMime() {
    var want = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264",
                "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    if (typeof MediaRecorder === "undefined") return null;
    for (var i = 0; i < want.length; i++) {
      try { if (MediaRecorder.isTypeSupported(want[i])) return want[i]; } catch (e) {}
    }
    return null;
  }

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  /* Record a drawing into a file.
       o.svg()        the live <svg> to photograph, called each frame
       o.at(ms)       put the drawing into the state it should hold at ms
       o.compose(c,W,H,shot,ms)   paint one frame onto the canvas
       o.runMs        how long the finished film should last
       o.width/height the frame size
     Resolves {blob, ext, frames, seconds}. */
  function record(o) {
    var W = o.width || 1080, H = o.height || 1920;
    var mime = pickMime();
    if (!mime) return Promise.reject(new Error("this browser cannot encode video"));
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    if (!cv.captureStream) return Promise.reject(new Error("this browser cannot capture a canvas"));
    var c = cv.getContext("2d");
    var stream = cv.captureStream(0);
    var track = stream.getVideoTracks()[0];
    var rec = new MediaRecorder(stream, { mimeType: mime,
                                          videoBitsPerSecond: o.bitrate || 10000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

    var runMs = Math.max(200, o.runMs || 6000);
    var i = 0, t0, done, fail;
    var out = new Promise(function (a, b) { done = a; fail = b; });
    rec.onstop = function () {
      done({ blob: new Blob(chunks, { type: mime }),
             ext: mime.indexOf("mp4") >= 0 ? "mp4" : "webm",
             frames: i, seconds: runMs / 1000 });
    };
    rec.start();
    t0 = now();

    function next() {
      var elapsed = now() - t0;
      if (elapsed >= runMs) { try { rec.stop(); } catch (e) { fail(e); } return; }
      var ms = elapsed;
      try { o.at(ms); } catch (e) { try { rec.stop(); } catch (e2) {} return fail(e); }
      var svg = o.svg();
      if (!svg) { try { rec.stop(); } catch (e3) {} return fail(new Error("nothing to photograph")); }
      snapshot(svg, o).then(function (shot) {
        o.compose(c, W, H, shot, ms);
        try { track.requestFrame(); } catch (e) {}
        i++;
        if (o.onProgress) o.onProgress(Math.min(1, (now() - t0) / runMs));
        /* yield, so the page can paint its progress and a long render does
           not read as a hang */
        setTimeout(next, 0);
      }).catch(function (e) {
        try { rec.stop(); } catch (e2) {}
        fail(e);
      });
    }
    next();
    return out;
  }

  /* Hand a finished blob to the reader. */
  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.parentNode && a.parentNode.removeChild(a);
    }, 2000);
  }

  window.SvgFilm = { snapshot: snapshot, pickMime: pickMime, record: record,
                     save: save, inlineStyles: inlineStyles, PROPS: PROPS };
})();
