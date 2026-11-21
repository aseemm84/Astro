/* ===== Reel Agent — voice ================================================

   One interface, several providers:  synth(text, {lang, voice}) → AudioBuffer

     system   desktop app only: the operating system's own offline voice,
              through the Rust command tts_system (macOS `say`, Windows
              SpeechSynthesis). Nothing leaves the machine.
     upload   the reader's own recording of the whole reel (sp-voice.js
              decodes it); split into one clip per line at the longest pauses
     silent   no voice: each line gets the time it would take to read, so the
              captions still pace like speech
     mock     a tone of a known length — the test harness only
     gemini-tts / elevenlabs   Connected mode (ra-providers.js)

   One clip per line, cached in IndexedDB by hash(provider+model+voice+text),
   so editing one line and pressing Re-voice re-synthesises one line.

   The pronunciation lexicon is applied to the text sent to a synthesiser
   and never to what is shown on screen. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var RATE = 48000;
  var CTX = null;
  function ctx() {
    if (CTX) return CTX;
    var C = window.AudioContext || window.webkitAudioContext;
    CTX = C ? new C({ sampleRate: RATE }) : null;
    return CTX;
  }
  function blank(seconds) {
    var n = Math.max(1, Math.round(seconds * RATE));
    if (typeof AudioBuffer !== "undefined") {
      try { return new AudioBuffer({ length: n, numberOfChannels: 1, sampleRate: RATE }); } catch (e) {}
    }
    var c = ctx(); return c ? c.createBuffer(1, n, RATE) : null;
  }
  function decode(bytes) {
    var c = ctx();
    if (!c) return Promise.reject(new Error("no Web Audio in this browser"));
    var buf = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer;
    return new Promise(function (res, rej) { c.decodeAudioData(buf.slice(0), res, rej); });
  }
  function fromPCM(f32, rate) {
    var b = blank(f32.length / (rate || RATE));
    var d = b.getChannelData(0);
    if ((rate || RATE) === RATE) d.set(f32.subarray(0, d.length));
    else for (var i = 0; i < d.length; i++) d[i] = f32[Math.min(f32.length - 1, Math.floor(i * rate / RATE))] || 0;
    return b;
  }

  /* ---- what is actually spoken ------------------------------------------ */
  var LEX = {};
  function setLexicon(map) { LEX = map || {}; }
  function spoken(text, lang) {
    var s = text || "";
    if (window.SPScript && window.SPScript.speakable) s = window.SPScript.speakable(s, lang === "hinglish" ? "hinglish" : lang);
    Object.keys(LEX).sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
      if (k.charAt(0) === "_") return;
      s = s.split(k).join(LEX[k]);
    });
    return s;
  }

  /* ---- providers -------------------------------------------------------- */
  var P = {};

  P.silent = {
    id: "silent", offline: true,
    synth: function (text, o) {
      var secs = Math.max(1.2, RA.verify.readSecs(text, o.lang));
      return Promise.resolve(blank(secs));
    }
  };

  /* deterministic: length grows with the text, so the test can predict it */
  P.mock = {
    id: "mock", offline: true,
    synth: function (text, o) {
      var secs = Math.round((0.8 + String(text).length * 0.045) * 100) / 100;
      var b = blank(secs), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = 0.25 * Math.sin(2 * Math.PI * 330 * i / RATE);
      return Promise.resolve(b);
    }
  };

  P.system = {
    id: "system", offline: true,
    available: function () { return RA.core.inApp(); },
    voices: function () { return RA.core.invoke("tts_list_voices", {}); },
    synth: function (text, o) {
      return RA.core.invoke("tts_system", { text: text, voice: o.systemVoice || "" })
        .then(function (bytes) { return decode(bytes); });
    }
  };

  /* the upload provider holds the whole decoded file and is asked for all
     lines at once (splitFor), because the reader recorded one take */
  var UPLOAD = null;
  P.upload = {
    id: "upload", offline: true, whole: true,
    set: function (buf) { UPLOAD = buf; },
    has: function () { return !!UPLOAD || !!(window.SPVoice && window.SPVoice.buffer && window.SPVoice.buffer()); },
    buffer: function () { return UPLOAD || (window.SPVoice && window.SPVoice.buffer ? window.SPVoice.buffer() : null); },
    load: function (file) {
      return file.arrayBuffer().then(decode).then(function (b) { UPLOAD = b; return b; });
    }
  };

  /* ---- split one take into N clips at the N-1 longest pauses ------------ */
  function splitFor(buf, n, weights) {
    var d = buf.getChannelData(0), rate = buf.sampleRate, win = Math.round(rate * 0.02);
    var env = [], i, k;
    for (i = 0; i < d.length; i += win) {
      var s = 0, m = Math.min(d.length, i + win);
      for (k = i; k < m; k++) s += d[k] * d[k];
      env.push(Math.sqrt(s / Math.max(1, m - i)));
    }
    var peak = Math.max.apply(null, env.concat([1e-6])), thr = peak * 0.04;
    /* runs of quiet windows, each with its centre and length */
    var runs = [], st = -1;
    for (i = 0; i <= env.length; i++) {
      var q = i < env.length && env[i] < thr;
      if (q && st < 0) st = i;
      if (!q && st >= 0) { if (i - st >= 8) runs.push({ c: (st + i) / 2, len: i - st }); st = -1; }
    }
    /* expected boundary positions from the text lengths; take the longest
       pause near each, so a long breath inside a sentence is not chosen over
       a shorter one between two */
    var tot = weights.reduce(function (a, b) { return a + b; }, 0) || 1, acc = 0, cuts = [];
    for (k = 0; k < n - 1; k++) {
      acc += weights[k];
      var want = acc / tot * env.length, best = null, bs = -1;
      runs.forEach(function (r) {
        if (cuts.length && r.c <= cuts[cuts.length - 1]) return;
        var sc = r.len / (1 + Math.abs(r.c - want) / (env.length * 0.08));
        if (sc > bs) { bs = sc; best = r; }
      });
      cuts.push(best ? best.c : want);
    }
    var edges = [0].concat(cuts.map(function (c) { return Math.round(c * win); }), [d.length]);
    var out = [];
    for (k = 0; k < n; k++) {
      var a = edges[k], z = Math.max(a + 1, edges[k + 1]), c = blank((z - a) / rate);
      if (rate !== RATE) { out.push(fromPCM(d.subarray(a, z), rate)); continue; }
      c.getChannelData(0).set(d.subarray(a, z));
      out.push(c);
    }
    return out;
  }

  /* ---- cache ------------------------------------------------------------ */
  function key(provider, o, text) {
    return RA.core.sha256([provider, o.model || "", o.voice || "", o.systemVoice || "", o.lang || "", text].join("|"));
  }
  function cached(k) {
    return RA.core.store.get("clips", k).then(function (v) {
      return v && v.pcm ? fromPCM(new Float32Array(v.pcm), v.rate) : null;
    });
  }
  function keep(k, buf) {
    var pcm = buf.getChannelData(0).slice(0);
    return RA.core.store.put("clips", { pcm: pcm.buffer, rate: buf.sampleRate, at: Date.now() }, k);
  }

  /* Re-voice: the next synthesis of exactly this text skips the cache */
  var BUST = {};
  function bust(text, lang) { BUST[spoken(text || "", lang)] = 1; }

  /* synthesise every line; returns [{ buffer, seconds }] in order.
     onLine(i, n) reports progress. */
  function voiceLines(lines, o, onLine) {
    o = o || {};
    var prov = P[o.provider || "silent"];
    if (!prov) return Promise.reject(new Error("unknown voice provider " + o.provider));
    if (prov.network) RA.net.assert(prov.id + " voice");
    if (prov.whole) {
      var b = prov.buffer();
      if (!b) return Promise.reject(new Error("no voice file loaded"));
      var parts = splitFor(b, lines.length, lines.map(function (l) { return Math.max(1, (l.narration || "").length); }));
      return Promise.resolve(parts.map(function (x) { return { buffer: x, seconds: x.duration }; }));
    }
    var out = [], i = 0;
    function next() {
      if (i >= lines.length) return Promise.resolve(out);
      var L = lines[i], text = spoken(L.narration || "", o.lang);
      if (onLine) onLine(i, lines.length);
      if (!text.trim()) { out.push({ buffer: blank(0.6), seconds: 0.6 }); i++; return next(); }
      var useCache = prov.id !== "mock" && prov.id !== "silent" && !BUST[text];
      delete BUST[text];
      return key(prov.id, o, text).then(function (k) {
        return (useCache ? cached(k) : Promise.resolve(null)).then(function (hit) {
          if (hit) return hit;
          return prov.synth(text, o).then(function (buf) {
            if (useCache) keep(k, buf);
            return buf;
          });
        });
      }).then(function (buf) {
        out.push({ buffer: buf, seconds: buf.duration }); i++; return next();
      });
    }
    return next();
  }

  function providers() {
    var o = [{ id: "silent", label: RA.core.t("silent") }];
    if (P.system.available()) o.unshift({ id: "system", label: RA.core.t("system") });
    o.push({ id: "upload", label: RA.core.t("upload") });
    Object.keys(P).forEach(function (k) {
      if (P[k].network && RA.net.allowed()) o.push({ id: k, label: P[k].label || k });
    });
    return o;
  }

  RA.voice = { P: P, voiceLines: voiceLines, providers: providers, splitFor: splitFor,
               decode: decode, blank: blank, fromPCM: fromPCM, spoken: spoken,
               setLexicon: setLexicon, bust: bust, RATE: RATE };
})();
