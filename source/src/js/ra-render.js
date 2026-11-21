/* ===== Reel Agent — sync, compose and encode =============================

   THE TIME MAP. A surface plays on its own clock; a narrated reel has to play
   on the voice's. Each line covers surface time [beat a.from, beat b.to], and
   that span is stretched linearly to exactly clip + 0.35 s of output, so the
   picture arrives where the sentence does and the next sentence starts on
   its own beat. A 1.5 s hold on the last frame ends the reel. The output is
   therefore Σclips + 0.35·lines + 1.5 seconds long, which the test asserts
   against the finished file to within one frame.

   THE FRAME. The surface draws its picture without its own type; this file
   lays over it, inside the surface's safe zones: the Hindi title, a caption
   pill with its key word picked out, an optional hook card for the first
   1.2 s, and an end card with the handle. Nothing here is random, so a frame
   at a given time is the same frame every time it is drawn.

   THE SOUND. Clips are placed on the same timeline in plain sample arrays —
   deterministic, and no AudioContext needed — music is laid under them and
   ducked about 12 dB while anyone speaks, and the mix is normalised to about
   −14 LUFS (ra-loudness.js).

   THE FILE. sp-encode.js writes it: WebCodecs, frames stamped n/fps, H.264 +
   AAC in MP4 where the browser has them, VP9 + Opus in WebM where it does
   not — and the panel says which. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var GAP = 0.35, TAIL = 1.5, HOOK = 1.2, FPS = 30, RATE = 48000;
  var DEVA = "'Noto Sans Devanagari','Kohinoor Devanagari','Nirmala UI','Mangal','Devanagari Sangam MN',sans-serif";

  /* ---- the time map ----------------------------------------------------- */
  function plan(lines, beats, clips) {
    var segs = [], U = 0;
    lines.forEach(function (L, i) {
      var a = L.beats[0], z = L.beats[1];
      var len = clips[i] + GAP;
      segs.push({ i: i, from: beats[a].from, to: beats[z].to, U: U, L: len, clip: clips[i] });
      U += len;
    });
    return { segs: segs, body: U, T: U + TAIL, gap: GAP, tail: TAIL };
  }
  function surfaceTime(P, u) {
    var S = P.segs;
    if (!S.length) return 0;
    if (u >= P.body) return S[S.length - 1].to;
    for (var k = S.length - 1; k >= 0; k--) if (u >= S[k].U) {
      var s = S[k], f = (u - s.U) / s.L;
      return s.from + f * (s.to - s.from);
    }
    return S[0].from;
  }
  function segAt(P, u) {
    for (var k = P.segs.length - 1; k >= 0; k--) if (u >= P.segs[k].U) return P.segs[k];
    return P.segs[0];
  }

  /* ---- drawing helpers -------------------------------------------------- */
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function wrap(c, text, maxW) {
    var words = String(text || "").split(/\s+/), out = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    return out;
  }
  function keyWord(words) {
    for (var i = 0; i < words.length; i++) if (/[0-9०-९°]/.test(words[i])) return i;
    var best = 0;
    words.forEach(function (w, i) { if (w.length > words[best].length) best = i; });
    return best;
  }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ---- one output frame at time u --------------------------------------- */
  /* A surface may draw synchronously (canvas pages) or hand back a promise
     (SVG pages, which must be rasterised through an <img>). compose returns
     the caption boxes in the first case and a promise of them in the
     second, and every caller goes through when() so neither has to care. */
  function when(x, f) { return x && typeof x.then === "function" ? x.then(f) : f(x); }
  function compose(c, u, st) {
    var A = st.adapter, P = st.plan;
    var D = A.duration() || 1;
    var r = A.frame(Math.max(0, Math.min(1, surfaceTime(P, u) / D)), c, { text: false });
    return when(r, function () { return overlay(c, u, st); });
  }
  function overlay(c, u, st) {
    var Z = st.zones, W = st.W, H = st.H, P = st.plan;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    var boxes = [];

    /* title */
    if (st.title && Z.title) {
      c.save();
      c.globalAlpha = ease(u / 0.6);
      c.fillStyle = "#e9c46a"; c.textAlign = "center"; c.textBaseline = "middle";
      var fs = Math.round(Z.title.h * 0.46);
      c.font = "700 " + fs + "px " + DEVA;
      while (c.measureText(st.title).width > Z.title.w && fs > 28) { fs -= 4; c.font = "700 " + fs + "px " + DEVA; }
      c.shadowColor = "rgba(0,0,0,.6)"; c.shadowBlur = 18;
      c.fillText(st.title, W / 2, Z.title.y + Z.title.h * 0.5);
      c.restore();
    }

    /* caption pill for the line being spoken */
    var s = segAt(P, u);
    if (st.captions && s && u < P.body && Z.caption) {
      var L = st.lines[s.i], cap = (L.caption || "").trim();
      if (cap) {
        var inT = ease((u - s.U) / 0.18), outT = ease((s.U + s.L - u) / 0.18);
        var words = cap.split(/\s+/), kw = keyWord(words);
        c.save();
        var fz = 76; c.font = "700 " + fz + "px " + DEVA;
        var sp = c.measureText(" ").width, widths = words.map(function (w) { return c.measureText(w).width; });
        var tw = widths.reduce(function (a, b) { return a + b; }, 0) + sp * (words.length - 1);
        while (tw > Z.caption.w - 80 && fz > 40) {
          fz -= 4; c.font = "700 " + fz + "px " + DEVA; sp = c.measureText(" ").width;
          widths = words.map(function (w) { return c.measureText(w).width; });
          tw = widths.reduce(function (a, b) { return a + b; }, 0) + sp * (words.length - 1);
        }
        var ph = fz * 1.7, pw = tw + 80;
        var px = Math.round(Z.caption.x + (Z.caption.w - pw) / 2);
        var py = Math.round(Z.caption.y + Z.caption.h * 0.32 - ph / 2 + (1 - inT) * 24);
        c.globalAlpha = Math.min(inT, outT);
        c.fillStyle = "rgba(8,10,20,.78)"; rr(c, px, py, pw, ph, ph / 2); c.fill();
        c.strokeStyle = "rgba(233,196,106,.55)"; c.lineWidth = 3; c.stroke();
        c.textBaseline = "middle"; c.textAlign = "left";
        var x = px + 40;
        words.forEach(function (w, i) {
          c.fillStyle = i === kw ? "#f4c95d" : "#f5f1e8";
          c.fillText(w, x, py + ph / 2 + fz * 0.04);
          x += widths[i] + sp;
        });
        c.restore();
        boxes.push({ x: px, y: py, w: pw, h: ph, line: s.i });
      }
    }

    /* hook card */
    if (st.hook && u < HOOK) {
      var a = 1 - ease((u - (HOOK - 0.35)) / 0.35);
      c.save(); c.globalAlpha = a;
      c.fillStyle = "rgba(4,6,14,.82)"; c.fillRect(0, 0, W, H);
      c.fillStyle = "#e9c46a"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "700 92px " + DEVA;
      var hl = wrap(c, st.hook, W * 0.8);
      hl.forEach(function (ln, i) { c.fillText(ln, W / 2, H * 0.45 + (i - (hl.length - 1) / 2) * 120); });
      c.font = "600 30px " + DEVA; c.fillStyle = "rgba(245,241,232,.7)";
      c.fillText("N I R A Y A N A", W / 2, H * 0.45 - hl.length * 60 - 70);
      c.restore();
    }

    /* end card */
    if (u > P.body) {
      var e = ease((u - P.body) / 0.5);
      c.save(); c.globalAlpha = e * 0.9;
      c.fillStyle = "rgba(4,6,14,.86)"; c.fillRect(0, 0, W, H);
      c.globalAlpha = e;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#e9c46a"; c.font = "700 84px " + DEVA;
      c.fillText(st.handle || "@Nirayana.Soft", W / 2, H * 0.47);
      c.fillStyle = "rgba(245,241,232,.82)"; c.font = "500 40px " + DEVA;
      c.fillText(RA.core.hi("study"), W / 2, H * 0.47 + 96);
      c.restore();
    }
    return boxes;
  }

  /* ---- the sound -------------------------------------------------------- */
  function mix(clips, P, music) {
    var n = Math.ceil(P.T * RATE), out = new Float32Array(n), i, k;
    var voiced = new Uint8Array(Math.ceil(n / 480) + 1);
    P.segs.forEach(function (s, j) {
      var b = clips[j].buffer, d = b.getChannelData(0), at = Math.round(s.U * RATE);
      for (k = 0; k < d.length && at + k < n; k++) out[at + k] += d[k];
      for (k = Math.floor(at / 480); k <= Math.floor((at + d.length) / 480) && k < voiced.length; k++) voiced[k] = 1;
    });
    var stats = null;
    if (music) {
      var md = music.getChannelData(0), base = Math.pow(10, -16 / 20), duck = Math.pow(10, -12 / 20);
      var g = 1, step = 1 / (0.12 * RATE);
      for (i = 0; i < n; i++) {
        var want = voiced[Math.floor(i / 480)] ? duck : 1;
        g += Math.max(-step, Math.min(step, want - g));
        var fade = Math.min(1, i / (0.5 * RATE), (n - i) / (1.2 * RATE));
        out[i] += md[i % md.length] * base * g * fade;
      }
    }
    stats = RA.loudness.normalise(out, RATE, -14, -1);
    /* The audio ends 0.12 s before the picture. An AAC encoder pads its last
       frame (and primes its first), so an audio track exactly as long as the
       video comes out ~0.08 s longer, and an MP4's duration is its longest
       track — measured on the macOS CI job: 35.477 s for a 35.40 s reel. The
       trimmed part is the silent end hold, so nothing audible is lost and the
       file is as long as the picture in both containers. */
    var keep = Math.max(1, n - Math.round(0.12 * RATE));
    var buf = RA.voice.blank(keep / RATE);
    buf.getChannelData(0).set(out.subarray(0, keep));
    return { buffer: buf, loudness: stats };
  }

  /* ---- side files ------------------------------------------------------- */
  function ts(s) {
    var ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60,
        x = Math.floor(ms / 1000) % 60, r = ms % 1000;
    function p(v, w) { return ("000" + v).slice(-w); }
    return p(h, 2) + ":" + p(m, 2) + ":" + p(x, 2) + "," + p(r, 3);
  }
  function srt(lines, P) {
    return P.segs.map(function (s, j) {
      return (j + 1) + "\n" + ts(s.U) + " --> " + ts(s.U + s.clip) + "\n" + (lines[s.i].narration || "") + "\n";
    }).join("\n");
  }
  function thumbnail(st) {
    var W = st.W, H = st.H, small = document.createElement("canvas");
    small.width = 108; small.height = 192;
    var big = document.createElement("canvas"); big.width = W; big.height = H;
    var bc = big.getContext("2d"), best = null, bestScore = -1;
    var segs = st.plan.segs.slice();
    function score(u) {
      return when(compose(bc, u, { adapter: st.adapter, zones: st.zones, W: W, H: H, plan: st.plan, lines: st.lines, captions: false }), function () {
        var sc = small.getContext("2d"); sc.drawImage(big, 0, 0, 108, 192);
        var d = sc.getImageData(0, 0, 108, 192).data, n = 0;
        for (var i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 180) n++;
        if (n > bestScore) { bestScore = n; best = u; }
      });
    }
    function each(k) {
      if (k >= segs.length) return null;
      return when(score(segs[k].U + segs[k].L * 0.6), function () { return each(k + 1); });
    }
    return Promise.resolve(each(0)).then(function () {
      return compose(bc, best || 0, { adapter: st.adapter, zones: st.zones, W: W, H: H, plan: st.plan, lines: st.lines,
                                      captions: false, title: st.title });
    }).then(function () { return finishThumb(bc, big, st, W, H); });
  }
  function finishThumb(bc, big, st, W, H) {
    var hook = st.hook || st.title || "";
    if (hook) {
      bc.save();
      var g = bc.createLinearGradient(0, H * 0.55, 0, H);
      g.addColorStop(0, "rgba(4,6,14,0)"); g.addColorStop(1, "rgba(4,6,14,.92)");
      bc.fillStyle = g; bc.fillRect(0, H * 0.55, W, H * 0.45);
      bc.fillStyle = "#f4c95d"; bc.textAlign = "center"; bc.textBaseline = "middle";
      bc.font = "800 104px " + DEVA;
      var hl = wrap(bc, hook, W * 0.86);
      hl.forEach(function (ln, i) { bc.fillText(ln, W / 2, H * 0.80 + (i - (hl.length - 1) / 2) * 128); });
      bc.restore();
    }
    return new Promise(function (res) { big.toBlob(function (b) { res(b); }, "image/jpeg", 0.88); });
  }

  /* read the finished file's duration back — the number the reel is held to */
  function readDuration(blob) {
    return new Promise(function (res) {
      var v = document.createElement("video"), url = URL.createObjectURL(blob), done = false;
      function fin(d) { if (done) return; done = true; URL.revokeObjectURL(url); res(d); }
      v.preload = "metadata"; v.muted = true;
      v.onloadedmetadata = function () {
        if (isFinite(v.duration)) return fin(v.duration);
        v.currentTime = 1e7;
        v.ontimeupdate = function () { fin(v.duration); };
      };
      v.onerror = function () { fin(null); };
      setTimeout(function () { fin(null); }, 8000);
      v.src = url;
    });
  }

  /* ---- the whole run ----------------------------------------------------
     spec: { adapter, layout, lang, seconds, voice:{provider, voice,
             systemVoice}, captions, hook, music (AudioBuffer|null),
             lines (optional — an edited script), date, place, palette }
     hooks: { step(key), progress(0..1), line(i,n) } */
  function run(spec, hooks) {
    hooks = hooks || {};
    var step = hooks.step || function () {}, prog = hooks.progress || function () {};
    var A = spec.adapter, lang = spec.lang || "hi", out = { lang: lang };
    step("s_layout");
    return A.configure({ layout: spec.layout, seconds: spec.seconds, lang: lang, date: spec.date,
                         place: spec.place, palette: spec.palette, span: spec.span })
    .then(function (desc) {
      out.layout = spec.layout; out.desc = desc;
      step("s_facts");
      out.facts = A.facts();
      out.beats = A.beats(lang);
      step("s_script");
      out.lines = spec.lines ? spec.lines.map(function (l) { return { beats: l.beats.slice(), narration: l.narration, caption: l.caption }; })
                             : RA.verify.linesFromBeats(out.beats, lang);
      out.english = out.beats.some(function (b) { return b.english; });
      step("s_check");
      var v = RA.verify.verify(out.lines, out.beats, out.facts, { lang: lang });
      out.violations = v.violations;
      if (!v.ok && !spec.force) {
        var e = new Error("The script did not pass the fact check.");
        e.violations = v.violations; e.result = out; throw e;
      }
      step("s_voice");
      return RA.voice.voiceLines(out.lines, { provider: spec.voice && spec.voice.provider || "silent",
                                              voice: spec.voice && spec.voice.voice, lang: lang,
                                              systemVoice: spec.voice && spec.voice.systemVoice,
                                              model: spec.voice && spec.voice.model }, hooks.line);
    })
    .then(function (clips) {
      out.clips = clips.map(function (c) { return c.seconds; });
      /* the measured clips can still break the 4× rule a reading-time
         estimate passed: check again with what was actually spoken */
      var v2 = RA.verify.verify(out.lines, out.beats, out.facts, { lang: lang, clips: out.clips });
      out.violations = v2.violations;
      if (!v2.ok && !spec.force) { var e = new Error("A voiced line does not fit its picture."); e.violations = v2.violations; e.result = out; throw e; }
      out.plan = plan(out.lines, out.beats, out.clips);
      out.expected = out.plan.T;
      var m = mix(clips, out.plan, spec.music || null);
      out.loudness = m.loudness;
      step("s_render");
      var W = A.describe().size.W, H = A.describe().size.H;
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var c = cv.getContext("2d");
      var st = { adapter: A, zones: A.describe().safeZones, W: W, H: H, plan: out.plan, lines: out.lines,
                 captions: spec.captions !== false, hook: spec.hook === false ? null : (spec.hookText || (A.title ? A.title() : null) || (out.lines[0] && out.lines[0].caption) || null),
                 title: A.title ? A.title() : null, handle: spec.handle || RA.core.settings().handle };
      out.boxes = [];
      out.zones = st.zones;
      var every = Math.max(1, Math.round(FPS / 2)), fi = 0;
      return window.SPEncode.encode(cv, {
        seconds: out.plan.T, fps: FPS, audio: m.buffer, onProgress: prog,
        drawAt: function (p) {
          return when(compose(c, p * out.plan.T, st), function (b) {
            if (fi++ % every === 0 && b && b.length) out.boxes.push(b[0]);
          });
        }
      }).then(function (r) {
        if (!r || r.cancelled) { var e = new Error("cancelled"); e.cancelled = true; throw e; }
        out.file = r; out.blob = r.blob; out.mime = r.mime;
        out.ext = r.container === "mp4" ? "mp4" : "webm";
        return Promise.all([readDuration(r.blob), thumbnail(st)]);
      }).then(function (x) {
        out.duration = x[0]; out.thumb = x[1];
        out.srt = srt(out.lines, out.plan);
        out.caption = (A.postCaption ? A.postCaption(lang) : "") + "\n\n" + RA.core.hi("study") + "\n" + RA.core.en("study");
        out.title = st.title;
        step("s_done");
        return out;
      });
    }).then(function (o) { release(A); return o; }, function (e) { release(A); throw e; });
  }
  /* a surface that borrowed the page (the ceremony, the ayanāṃśa rings)
     puts it back, whether the reel was made or not */
  function release(A) { if (A && A.release) try { A.release(); } catch (e) {} }

  function cancel() { if (window.SPEncode) window.SPEncode.cancel(); }

  RA.render = { plan: plan, surfaceTime: surfaceTime, compose: compose, when: when, mix: mix, srt: srt,
                thumbnail: thumbnail, readDuration: readDuration, run: run, cancel: cancel,
                GAP: GAP, TAIL: TAIL, FPS: FPS, DEVA: DEVA };
})();
