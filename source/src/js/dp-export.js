/* ===== Director Pro — getting it out ======================================

   FRAME-ACCURATE, NOT REAL-TIME. The obvious way to record a canvas is to
   play it and capture; the result is a reel whose length depends on how busy
   the machine was, which is a reel you cannot cut to music and cannot trust.
   So the stream's frame rate is zero and every frame is requested by hand:
   the playhead is set to i/fps, the frame is drawn, requestFrame() is called,
   and only then does i advance. A slow machine makes the export take longer.
   It does not make it shorter, and it does not drop a frame.

   This is the second implementation of that idea in the repository — Studio
   Pro's recorder is the first — and they cannot share code, because one is in
   the report bundle's world and this one is not. They are held together the
   same way everything else duplicated here is: a test asserts that a reel
   recorded at a stated length actually lasts it.

   AUDIO IS THE USER'S OWN FILE AND NEVER LEAVES THE MACHINE. It is read with
   a file input, decoded by the browser, routed through a gain node into a
   MediaStreamDestination, and that stream's audio track is added to the
   canvas stream. No upload, no fetch, no library. The one thing it cannot be
   is frame-accurate in the same sense as the video — an audio graph runs in
   real time — so the audio is played in real time while the video is driven
   by hand, and the recording lasts whichever is longer. In practice that
   means the audio path records at playback speed; the test asserts the
   duration either way.

   WHY MP4 IS TRIED FIRST. Safari and recent Chromium can write H.264 in an
   MP4 container, which posts straight to Instagram. WebM does not, and a
   person who records a reel and then discovers they must convert it has been
   let down by the tool. So the preference order is mp4, then vp9, then vp8,
   and what was actually used is reported rather than assumed. */

(function () {
  "use strict";

  var JOB = null;

  function pickMime(prefer) {
    var types = prefer === "webm"
      ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm",
         "video/mp4;codecs=avc1"]
      : ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9",
         "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < types.length; i++)
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(types[i]))
        return types[i];
    return "";
  }

  /* ---- the audio graph ------------------------------------------------------
     Built once per recording and torn down after, because an AudioContext
     left open holds the device awake and a second recording would otherwise
     stack a second source on the same element. */
  function audioTrack(doc, seconds) {
    if (!doc.audio || !doc.audio.__el) return null;
    var el = doc.audio.__el;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var ac = new AC();
      var src = ac.createMediaElementSource(el);
      var gain = ac.createGain();
      var dest = ac.createMediaStreamDestination();
      var g = doc.audio.gain == null ? 1 : doc.audio.gain;
      gain.gain.value = g;
      src.connect(gain);
      gain.connect(dest);
      /* fades, scheduled rather than stepped, so they are sample-accurate */
      var now = ac.currentTime;
      if (doc.audio.fadeIn > 0.01) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(g, now + doc.audio.fadeIn);
      }
      if (doc.audio.fadeOut > 0.01) {
        gain.gain.setValueAtTime(g, now + Math.max(0, seconds - doc.audio.fadeOut));
        gain.gain.linearRampToValueAtTime(0.0001, now + seconds);
      }
      el.currentTime = doc.audio.start || 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
      return { track: dest.stream.getAudioTracks()[0], ac: ac, el: el };
    } catch (e) { return null; }
  }

  /* ---- the recording --------------------------------------------------------- */
  function record(doc, C, opts, onFrame) {
    opts = opts || {};
    var fps = Math.max(1, opts.fps || doc.fps || 30);
    var seconds = window.DPModel.total(doc);
    var R = window.DPRender;
    return new Promise(function (resolve, reject) {
      var stream;
      try { stream = R.S.cv.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var vt = stream.getVideoTracks()[0];
      if (!vt || !vt.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var mime = pickMime(opts.container);
      if (!mime) { reject(new Error("no supported recording format")); return; }

      var A = opts.withAudio === false ? null : audioTrack(doc, seconds);
      if (A && A.track) { try { stream.addTrack(A.track); } catch (e) {} }

      var rec, chunks = [];
      try {
        rec = new MediaRecorder(stream, { mimeType: mime,
          videoBitsPerSecond: Math.round((opts.mbps || doc.quality || 12) * 1000000),
          audioBitsPerSecond: 192000 });
      } catch (e) { reject(e); return; }

      var job = { cancel: false };
      JOB = job;
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      function teardown() {
        if (A) {
          try { A.el.pause(); } catch (e) {}
          try { A.ac.close(); } catch (e) {}
        }
      }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        JOB = null; teardown();
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, fps: fps,
                  cancelled: job.cancel, hadAudio: !!(A && A.track),
                  madeSeconds: Math.min(i, total) / fps,
                  width: R.S.W, height: R.S.H });
      };
      rec.start();
      function step() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        var t = (i / total) * seconds;
        try { R.render(doc, C, t, true); } catch (e) {}
        try { vt.requestFrame(); } catch (e) {}
        if (onFrame) onFrame(i / total, i, total);
        i++;
        /* a timeout rather than rAF: rAF is throttled in a background tab, and
           a reel recorded while its author looked at another tab would be a
           reel that stops in the middle */
        setTimeout(step, Math.max(2, 1000 / fps / 6));
      }
      step();
    });
  }

  /* ---- a sequence of stills --------------------------------------------------
     For anyone who wants to take the frames into a real editor. Zipping needs
     a library, and a library needs a network, so the frames are handed over
     one at a time with a stated name — slower to save, but it works with
     nothing installed and nothing fetched. */
  function frames(doc, C, opts, onFrame) {
    opts = opts || {};
    var fps = Math.max(1, opts.fps || 6);
    var seconds = window.DPModel.total(doc);
    var total = Math.max(1, Math.round(seconds * fps));
    var R = window.DPRender;
    var out = [];
    var job = { cancel: false };
    JOB = job;
    return new Promise(function (resolve) {
      var i = 0;
      function step() {
        if (job.cancel || i >= total) { JOB = null; resolve(out); return; }
        R.render(doc, C, (i / total) * seconds, true);
        R.S.cv.toBlob(function (b) {
          out.push({ name: "frame-" + String(i).padStart(4, "0") + ".png", blob: b });
          if (onFrame) onFrame((i + 1) / total, i + 1, total);
          i++;
          setTimeout(step, 0);
        }, "image/png");
      }
      step();
    });
  }

  function still(doc, C, t) {
    var R = window.DPRender;
    return new Promise(function (resolve) {
      R.atFullSize(doc, function () { R.render(doc, C, t, true); });
      R.S.cv.toBlob(function (b) { resolve(b); }, "image/png");
    });
  }

  function save(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
  }

  window.DPExport = {
    record: record, frames: frames, still: still, save: save,
    isBusy: function () { return !!JOB; },
    cancel: function () { if (JOB) JOB.cancel = true; },
    pickMime: pickMime,
    /* what this browser can actually do, so the page can say so rather than
       offering a button that fails */
    can: function () {
      var cv = document.createElement("canvas");
      return { capture: typeof cv.captureStream === "function",
               recorder: !!window.MediaRecorder,
               mp4: !!(window.MediaRecorder &&
                       MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")),
               audio: !!(window.AudioContext || window.webkitAudioContext) };
    }
  };
})();
