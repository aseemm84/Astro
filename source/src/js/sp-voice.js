/* ===== The voice track ====================================================

   WHAT THIS IS FOR. The Studio can write a correct silent file. A reel with
   a voice over it is a different thing to watch, and there is no way to make
   one in a browser without a voice from somewhere: speechSynthesis speaks
   out of the speakers and offers no route to an AudioBuffer or a MediaStream,
   so it cannot be captured, and every service that would return an audio file
   is a network request this site does not make. The voice therefore comes in
   as a file the user already has — from a phone's own Shortcut, read by the
   system voice off the "Copy for voiceover" text — and this file's whole job
   is to turn that file into an AudioBuffer the encoder can place on the same
   clock as the frames.

   WHY THE DURATION IS READ RATHER THAN ASSUMED. A voice is as long as it is.
   Trimming it to fit the reel cuts a sentence in half; stretching the reel by
   guesswork leaves the last beat silent or the voice running over black. So
   the file is decoded, its real length measured, and the reel is offered that
   length. The reel bends to the voice, never the other way round.

   WHY CAF IS REJECTED BY NAME. A Shortcut's "Make Spoken Audio from Text"
   saves Core Audio Format, which Chrome and Safari both refuse to decode —
   measured, not assumed: decodeAudioData throws EncodingError on it while the
   same speech as WAV decodes in full. A message that says "could not decode"
   sends someone looking for a fault in the reel; a message that names the
   format and the one extra Shortcut action that fixes it does not. */

(function () {
  "use strict";

  var BUF = null;      /* the decoded voice, or null */
  var NAME = "";
  var CTX = null;

  function ctx() {
    if (CTX) return CTX;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    CTX = new C();
    return CTX;
  }

  /* ---- what will and will not decode -------------------------------------
     The browser is the authority on this, so the extension is used only to
     explain a failure, never to refuse a file that might have worked. */
  var HOPELESS = { caf: "Core Audio (.caf)", aiff: "AIFF", aif: "AIFF",
                   amr: "AMR", wma: "Windows Media Audio" };
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function why(name) {
    var e = ext(name), h = HOPELESS[e];
    if (h)
      return h + " cannot be decoded by any browser. If this came from the " +
             "iPhone Shortcut, add an “Encode Media” action after " +
             "“Make Spoken Audio from Text”, set to Audio Only, " +
             "M4A — then save that. M4A, WAV and MP3 all work here.";
    return "this file could not be decoded as audio. M4A, WAV and MP3 work " +
           "here; .caf, which the iPhone Shortcut saves by default, does not.";
  }

  /* ---- taking the file ---------------------------------------------------- */
  function load(file) {
    var C = ctx();
    if (!C) return Promise.reject(new Error("this browser has no audio engine"));
    if (!file) return Promise.reject(new Error("no file"));
    return file.arrayBuffer().then(function (ab) {
      return new Promise(function (resolve, reject) {
        /* the callback form, because Safari's promise form is younger than
           its callback form and this has to work on an old Mac */
        var ok = function (buf) { resolve(buf); };
        var no = function () { reject(new Error(why(file.name))); };
        try {
          var r = C.decodeAudioData(ab, ok, no);
          if (r && r.then) r.then(ok, no);
        } catch (e) { no(); }
      });
    }).then(function (buf) {
      BUF = buf; NAME = file.name || "voice";
      return info();
    });
  }

  function info() {
    if (!BUF) return null;
    return { name: NAME, seconds: BUF.duration,
             rate: BUF.sampleRate, channels: BUF.numberOfChannels };
  }
  function buffer() { return BUF; }
  function clear() { BUF = null; NAME = ""; }

  /* the length to set the reel to: the voice, plus a breath at the end so
     the last word is not cut off by the final frame */
  function fitSeconds() {
    if (!BUF) return null;
    return Math.ceil(BUF.duration + 0.4);
  }

  /* ===== Mode B — the broadcast chain ====================================

     WHAT IT IS FOR. A system voice reading Devanāgarī off a phone is
     intelligible and thin: it sits in the middle of the band, with no
     chest under it and no air on the consonants, and against a reel's
     music it disappears. Three stages fix most of that, and they are the
     three any broadcast chain starts with — a low shelf for body, a
     presence peak for articulation, and a compressor so the level stops
     wandering.

     WHY THESE NUMBERS. The shelf sits at 180 Hz, under the fundamental of
     a male voice rather than on it, so it adds weight without boom. The
     presence peak is at 3 kHz, which is where the difference between "śa"
     and "sa" lives — the reason it matters more here than in an English
     voiceover is that Sanskrit has three sibilants and a thin voice
     collapses them into one. The compressor is set gently: a 3:1 ratio
     and a slow release level the delivery without the pumping that gives
     a track away as processed.

     It runs offline — OfflineAudioContext renders faster than real time
     and touches no hardware — so it is deterministic and testable, which
     a live graph would not be. */
  var DSP = {
    rate: 48000,
    shelfHz: 180, shelfDb: 4.5,
    peakHz: 3000, peakDb: 3.5, peakQ: 1.1,
    threshold: -20, knee: 6, ratio: 3, attack: 0.004, release: 0.25,
    makeup: 1.25
  };

  function master(buf, opts) {
    opts = Object.assign({}, DSP, opts || {});
    if (typeof OfflineAudioContext === "undefined")
      return Promise.resolve(buf);
    var ch = Math.min(2, buf.numberOfChannels || 1);
    var len = Math.ceil(buf.duration * opts.rate);
    var off = new OfflineAudioContext(ch, len, opts.rate);
    var src = off.createBufferSource();
    src.buffer = buf;

    var shelf = off.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = opts.shelfHz;
    shelf.gain.value = opts.shelfDb;

    var peak = off.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = opts.peakHz;
    peak.gain.value = opts.peakDb;
    peak.Q.value = opts.peakQ;

    /* a high-pass under everything: a phone recording carries handling
       rumble that the low shelf would otherwise amplify */
    var hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;

    var comp = off.createDynamicsCompressor();
    comp.threshold.value = opts.threshold;
    comp.knee.value = opts.knee;
    comp.ratio.value = opts.ratio;
    comp.attack.value = opts.attack;
    comp.release.value = opts.release;

    var gain = off.createGain();
    gain.gain.value = opts.makeup;

    src.connect(hp); hp.connect(shelf); shelf.connect(peak);
    peak.connect(comp); comp.connect(gain); gain.connect(off.destination);
    src.start();
    return off.startRendering().then(function (out) {
      /* a peak over 1.0 clips on the way into the encoder, so the whole
         render is scaled back if it needs it — measured, not assumed */
      var peakAbs = 0;
      for (var c = 0; c < out.numberOfChannels; c++) {
        var d = out.getChannelData(c);
        for (var i = 0; i < d.length; i += 7)
          if (Math.abs(d[i]) > peakAbs) peakAbs = Math.abs(d[i]);
      }
      if (peakAbs > 0.985) {
        var k = 0.985 / peakAbs;
        for (var c2 = 0; c2 < out.numberOfChannels; c2++) {
          var e = out.getChannelData(c2);
          for (var j = 0; j < e.length; j++) e[j] *= k;
        }
      }
      out.__peak = peakAbs;
      return out;
    });
  }

  /* ===== Mode C — fitting the reel to the voice ==========================
     A reel's beats are even by default; a spoken line is not. Given the
     measured length of each beat's speech, the visual beats are rescaled
     so a scene changes exactly when its sentence ends. The total is held
     to the audio's own length rather than to the sum of the parts, so
     rounding cannot make the picture outrun the voice. */
  function fitBeats(durations, total) {
    var d = (durations || []).map(function (x) {
      return (isFinite(x) && x > 0) ? x : 0;
    });
    var sum = d.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) return null;
    var T = (total && total > 0) ? total : sum;
    var out = d.map(function (x) { return x / sum * T; });
    /* the cumulative edges are what a timeline actually needs */
    var at = 0, edges = [0];
    out.forEach(function (x) { at += x; edges.push(at); });
    /* the last edge is the total exactly, whatever the rounding did */
    edges[edges.length - 1] = T;
    return { seconds: out, edges: edges, total: T };
  }

  /* ===== Mode A — the model store ========================================
     WHAT THIS DOES AND DOES NOT DO, stated plainly because the difference
     matters. It STORES a neural voice model the user supplies from their
     own disk, in IndexedDB, so it survives a reload and is chosen once
     rather than every time. It does NOT download one: this site makes no
     network requests, and a 60 MB model is not something to commit to a
     repository either.

     Running such a model needs an inference runtime (onnxruntime-web and
     its WASM) present on the page. The store exposes `ready()` so a caller
     can ask, and `synthesize()` refuses clearly rather than pretending
     when no runtime is there. That refusal is the honest state of this
     feature today, and it is better than a button that silently does
     nothing. */
  var DB_NAME = "nirayana-voice-store", DB_STORE = "models";
  function idb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined")
        return reject(new Error("this browser has no IndexedDB"));
      var rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(DB_STORE))
          db.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
  }
  function putModel(id, name, blob, meta) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put({ id: id, name: name, blob: blob,
                                       meta: meta || null,
                                       bytes: blob && blob.size,
                                       saved: Date.now() });
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function listModels() {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var tx = db.transaction(DB_STORE, "readonly");
        var rq = tx.objectStore(DB_STORE).openCursor();
        rq.onsuccess = function () {
          var c = rq.result;
          if (!c) return resolve(out);
          out.push({ id: c.value.id, name: c.value.name,
                     bytes: c.value.bytes, saved: c.value.saved });
          c.continue();
        };
        rq.onerror = function () { reject(rq.error); };
      });
    }).catch(function () { return []; });
  }
  function getModel(id) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readonly");
        var rq = tx.objectStore(DB_STORE).get(id);
        rq.onsuccess = function () { resolve(rq.result || null); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function deleteModel(id) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function runtimeReady() {
    return typeof window.ort !== "undefined" &&
           !!(window.ort && window.ort.InferenceSession);
  }
  function synthesize() {
    return Promise.reject(new Error(
      "No neural speech runtime is loaded on this page. The model store " +
      "works and will keep a voice you add from your own disk, but running " +
      "it needs onnxruntime-web present as well. Until then, use the " +
      "iPhone Shortcut route: copy the voiceover text, make spoken audio " +
      "from it, encode to M4A and import the file here."));
  }

  /* ===== iOS ============================================================
     Two things Safari on a phone needs. An AudioContext may only be
     started from inside a real tap, so one is armed on the first touch and
     never before; and a finished file is handed to the share sheet rather
     than to a download, because a download on iOS lands somewhere the
     Photos app and Instagram cannot see. */
  function armOnTap() {
    if (CTX && CTX.state !== "suspended") return;
    var fire = function () {
      try {
        var C = ctx();
        if (C && C.state === "suspended") C.resume();
      } catch (e) {}
      document.removeEventListener("touchend", fire, true);
      document.removeEventListener("click", fire, true);
    };
    document.addEventListener("touchend", fire, true);
    document.addEventListener("click", fire, true);
  }
  function canShareFile(file) {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) { return false; }
  }
  function shareFile(blob, name) {
    try {
      var f = new File([blob], name, { type: blob.type });
      if (!canShareFile(f)) return Promise.resolve(false);
      return navigator.share({ files: [f], title: name })
        .then(function () { return true; }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  try { armOnTap(); } catch (e) {}

  window.SPVoice = { load: load, info: info, buffer: buffer, clear: clear,
                     fitSeconds: fitSeconds, why: why,
                     master: master, DSP: DSP, fitBeats: fitBeats,
                     putModel: putModel, listModels: listModels,
                     getModel: getModel, deleteModel: deleteModel,
                     runtimeReady: runtimeReady, synthesize: synthesize,
                     canShare: canShareFile, share: shareFile,
                     armOnTap: armOnTap };
  /* the name the build spec asks for, over the same module */
  window.NirayanaVoice = window.SPVoice;
})();
