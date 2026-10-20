/* ===== Writing the file ===================================================

   THE BUG THIS EXISTS TO FIX. The Studio recorded by handing canvas frames
   to a MediaRecorder, which timestamps every frame by the wall clock at the
   moment it arrives. Rendering a 1080×1920 frame and encoding it takes
   longer than a thirtieth of a second, so the file came out as long as the
   ENCODING took rather than as long as the reel was built for. Measured: a
   reel asked for four seconds arrived as 11.7; asked for eight, 24.9; at
   full size, four seconds became 16.7. Every export was three to four times
   too long and played at seven to ten frames a second. The frame-rate
   control did nothing at all.

   Nothing caught it because nothing had ever opened one of the files and
   read its duration back.

   WHAT REPLACES IT. WebCodecs lets a frame carry an explicit timestamp, so
   frame n is stamped at n/fps seconds whether it took one millisecond to
   draw or four hundred. The duration of the file is then a property of the
   reel rather than of the machine, which is the only way it can be correct
   on a fast Mac and a slow one alike. A muxer writes the chunks into a
   container; both are vendored, because this site fetches nothing.

   AND WHY IT IS BUILT FOR AUDIO FROM THE START. A voice track is the next
   thing that goes in here, and audio has to be sample-accurate against the
   picture. Under the old recorder that was impossible in principle: audio
   records in real time and the video did not. Under explicit timestamps
   both tracks are placed on the same clock and sync is a property of the
   arithmetic rather than a race. The audio path is wired now, so adding a
   voice later is wiring rather than surgery.

   THE FALLBACK IS KEPT. A browser without WebCodecs still records the old
   way and still gets a file; it just gets the old behaviour with it, and
   the Studio says so rather than pretending. */

(function () {
  "use strict";

  function has() {
    return typeof VideoEncoder !== "undefined" &&
           typeof VideoFrame !== "undefined" &&
           (typeof window.Mp4Muxer !== "undefined" ||
            typeof window.WebMMuxer !== "undefined");
  }

  /* ---- what this machine can actually write ------------------------------
     Asked rather than assumed: Chrome on macOS encodes H.264 and AAC, the
     headless Linux build used by the harness has neither and does VP9 and
     Opus instead. The same code has to produce a correct file on both, so
     the format is chosen by interrogation. H.264 in MP4 is preferred
     because it is what a phone, a television and Instagram all accept;
     WebM is a correct file that some of those will refuse. */
  function probeCodec(list, kind, width, height) {
    var chain = Promise.resolve(null);
    list.forEach(function (c) {
      chain = chain.then(function (found) {
        if (found) return found;
        var cfg = kind === "video"
          ? { codec: c.codec, width: width, height: height,
              bitrate: c.bitrate, framerate: 30 }
          : { codec: c.codec, sampleRate: 48000, numberOfChannels: 1,
              bitrate: 128000 };
        var E = kind === "video" ? VideoEncoder : AudioEncoder;
        if (typeof E === "undefined") return null;
        return E.isConfigSupported(cfg).then(function (s) {
          return s && s.supported ? c : null;
        }, function () { return null; });
      });
    });
    return chain;
  }

  function plan(width, height, quality) {
    var bits = Math.round((quality || 1) * 12000000);
    var V = [
      { codec: "avc1.640028", container: "mp4", bitrate: bits, name: "H.264 High" },
      { codec: "avc1.4d4028", container: "mp4", bitrate: bits, name: "H.264 Main" },
      { codec: "avc1.42e01e", container: "mp4", bitrate: bits, name: "H.264 Baseline" },
      { codec: "vp09.00.10.08", container: "webm", bitrate: bits, name: "VP9" },
      { codec: "vp8", container: "webm", bitrate: bits, name: "VP8" }
    ];
    return probeCodec(V, "video", width, height).then(function (v) {
      if (!v) return null;
      var A = v.container === "mp4"
        ? [{ codec: "mp4a.40.2", name: "AAC" }, { codec: "opus", name: "Opus" }]
        : [{ codec: "opus", name: "Opus" }];
      /* a container has to agree with its audio codec: Opus in MP4 is legal
         but widely unplayed, so an MP4 without AAC ships silent rather than
         unplayable, and the caller is told which it got */
      return probeCodec(A, "audio").then(function (a) {
        if (v.container === "mp4" && a && a.codec !== "mp4a.40.2") a = null;
        return { video: v, audio: a,
                 container: v.container,
                 mime: v.container === "mp4" ? "video/mp4" : "video/webm" };
      });
    });
  }

  function muxerFor(p, fps) {
    var common = { video: { codec: null, width: 0, height: 0 } };
    void common;
    if (p.container === "mp4") {
      if (typeof window.Mp4Muxer === "undefined") return null;
      return { kind: "mp4", lib: window.Mp4Muxer, fps: fps };
    }
    if (typeof window.WebMMuxer === "undefined") return null;
    return { kind: "webm", lib: window.WebMMuxer, fps: fps };
  }

  /* ---- the run -----------------------------------------------------------
     drawAt(p) paints the canvas at playhead p; everything else is this
     file's business. `audio` is an optional AudioBuffer laid on the same
     clock, starting at zero. */
  function encode(canvas, opts) {
    var seconds = Math.max(0.2, opts.seconds || 10);
    var fps = Math.max(5, Math.min(60, Math.round(opts.fps || 30)));
    var drawAt = opts.drawAt, onProgress = opts.onProgress;
    var W = canvas.width, H = canvas.height;
    var total = Math.max(2, Math.round(seconds * fps));
    var job = { cancel: false };
    JOB = job;

    return plan(W, H, opts.quality).then(function (p) {
      if (!p) throw new Error("this browser cannot encode video");
      var M = muxerFor(p, fps);
      if (!M) throw new Error("no muxer for " + p.container);

      var target = new M.lib.ArrayBufferTarget();
      var cfg = {
        target: target,
        video: { codec: p.container === "mp4" ? "avc" : "V_VP9",
                 width: W, height: H, frameRate: fps },
        fastStart: p.container === "mp4" ? "in-memory" : undefined
      };
      if (p.container === "webm") cfg.video.codec = p.video.codec === "vp8" ? "V_VP8" : "V_VP9";
      if (p.audio && opts.audio)
        cfg.audio = { codec: p.container === "mp4" ? "aac" : "A_OPUS",
                      sampleRate: 48000,
                      numberOfChannels: opts.audio.numberOfChannels || 1 };
      var muxer = new M.lib.Muxer(cfg);

      var err = null;
      var venc = new VideoEncoder({
        output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); },
        error: function (e) { err = e; }
      });
      venc.configure({ codec: p.video.codec, width: W, height: H,
                       bitrate: p.video.bitrate, framerate: fps,
                       latencyMode: "quality" });

      /* ---- the picture ---------------------------------------------------
         One frame per tick, stamped at n/fps in microseconds. The encoder's
         queue is drained periodically rather than never, because a few
         hundred un-flushed frames at full size is hundreds of megabytes of
         live VideoFrames and the tab dies without saying why. */
      var i = 0;
      function step() {
        return new Promise(function (resolve, reject) {
          function tick() {
            if (err) { reject(err); return; }
            if (job.cancel || i >= total) { resolve(); return; }
            try {
              drawAt(i / total);
              var frame = new VideoFrame(canvas, {
                timestamp: Math.round(i * 1e6 / fps),
                duration: Math.round(1e6 / fps)
              });
              /* a keyframe every two seconds: a reel is scrubbed and
                 thumbnailed, and a file whose only keyframe is the first
                 frame seeks like treacle */
              venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
              frame.close();
            } catch (e) { reject(e); return; }
            i++;
            if (onProgress) onProgress(i / total * 0.92);
            if (venc.encodeQueueSize > 12) {
              /* let the encoder catch up rather than queueing the world */
              setTimeout(tick, 8);
            } else setTimeout(tick, 0);
          }
          tick();
        });
      }

      return step().then(function () {
        if (job.cancel) { try { venc.close(); } catch (e) {} return null; }
        return venc.flush().then(function () { venc.close(); });
      }).then(function (stopped) {
        if (stopped === null) return null;
        if (!(p.audio && opts.audio)) return null;
        return addAudio(muxer, opts.audio, p, seconds);
      }).then(function (stopped) {
        if (job.cancel) { JOB = null; return { cancelled: true }; }
        void stopped;
        muxer.finalize();
        JOB = null;
        if (onProgress) onProgress(1);
        return {
          blob: new Blob([target.buffer], { type: p.mime }),
          mime: p.mime,
          container: p.container,
          codec: p.video.name,
          audioCodec: (p.audio && opts.audio) ? p.audio.name : null,
          seconds: seconds, fps: fps, frames: total,
          exact: true, cancelled: false
        };
      });
    });
  }

  /* ---- the voice ---------------------------------------------------------
     An AudioBuffer encoded against the same clock the frames are on, in
     chunks of a fifth of a second. Nothing here knows or cares where the
     buffer came from — a file, a recording, a model running locally — which
     is the point of putting it behind one argument. */
  function addAudio(muxer, buffer, p, seconds) {
    if (typeof AudioEncoder === "undefined") return Promise.resolve(null);
    var ch = Math.min(2, buffer.numberOfChannels || 1);
    var rate = 48000;
    var err = null;
    var aenc = new AudioEncoder({
      output: function (chunk, meta) { muxer.addAudioChunk(chunk, meta); },
      error: function (e) { err = e; }
    });
    aenc.configure({ codec: p.audio.codec, sampleRate: rate,
                     numberOfChannels: ch, bitrate: 128000 });
    /* resampled if it has to be, and never longer than the picture: a voice
       that outruns the reel leaves a file that is audio-only at the end */
    return resample(buffer, rate, ch, seconds).then(function (data) {
      var frames = data.length / ch;
      var CH = Math.round(rate / 5), at = 0;
      while (at < frames) {
        var n = Math.min(CH, frames - at);
        var slice = data.subarray(at * ch, (at + n) * ch);
        aenc.encode(new AudioData({
          format: "f32", sampleRate: rate, numberOfFrames: n,
          numberOfChannels: ch,
          timestamp: Math.round(at * 1e6 / rate),
          data: slice
        }));
        at += n;
      }
      return aenc.flush().then(function () { aenc.close(); });
    });
  }

  function resample(buffer, rate, ch, seconds) {
    var want = Math.round(Math.min(seconds, buffer.duration) * rate);
    if (typeof OfflineAudioContext === "undefined")
      return Promise.resolve(interleave(buffer, ch, Math.min(want, buffer.length)));
    if (buffer.sampleRate === rate)
      return Promise.resolve(interleave(buffer, ch, Math.min(want, buffer.length)));
    var off = new OfflineAudioContext(ch, want, rate);
    var src = off.createBufferSource();
    src.buffer = buffer;
    src.connect(off.destination);
    src.start();
    return off.startRendering().then(function (out) {
      return interleave(out, ch, out.length);
    });
  }
  function interleave(buffer, ch, n) {
    var out = new Float32Array(n * ch), c, k;
    for (c = 0; c < ch; c++) {
      var src = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      for (k = 0; k < n; k++) out[k * ch + c] = src[k] || 0;
    }
    return out;
  }

  var JOB = null;
  function cancel() { if (JOB) JOB.cancel = true; }
  function busy() { return !!JOB; }

  window.SPEncode = { has: has, plan: plan, encode: encode,
                      cancel: cancel, busy: busy };
})();
