/* ===== Reel Agent — core ==================================================

   The namespace and the few things every other ra-* file needs: a hash, a
   small IndexedDB store, the desktop bridge, the label table in English and
   Hindi, and the one rule that matters most here — whether the network may
   be used at all.

   THE PRIVACY GATE LIVES HERE AND NOWHERE ELSE. RA.net.allowed() is false
   unless the reader has switched Connected mode on, and every function that
   could make a request asks it first. Offline mode does not "avoid" the
   network; it cannot reach the code that would use it. The privacy test
   runs a whole reel with request interception on and asserts zero requests.

   Names are prefixed RA / __ra because the report modules share one scope
   and a short global is how two of them have collided before. */
(function () {
  "use strict";
  if (window.RA && window.RA.core) return;
  var RA = window.RA = window.RA || {};

  /* ---- labels: every string the panel shows, in both languages ---------- */
  var L = {
    make:      ["Make reel", "रील बनाएँ"],
    brief:     ["Brief (optional)", "विवरण (वैकल्पिक)"],
    language:  ["Language", "भाषा"],
    voice:     ["Voice", "आवाज़"],
    female:    ["Female", "स्त्री"],
    male:      ["Male", "पुरुष"],
    length:    ["Length", "अवधि"],
    music:     ["Music", "संगीत"],
    none:      ["None", "कोई नहीं"],
    bundled:   ["Bundled", "साथ आया"],
    myfile:    ["My file", "मेरी फ़ाइल"],
    captions:  ["Captions", "कैप्शन"],
    generate:  ["Generate", "बनाएँ"],
    cancel:    ["Cancel", "रोकें"],
    close:     ["Close", "बंद करें"],
    download:  ["Download", "डाउनलोड"],
    share:     ["Share", "साझा करें"],
    reveal:    ["Show in folder", "फ़ोल्डर में दिखाएँ"],
    copycap:   ["Copy post caption", "पोस्ट कैप्शन कॉपी करें"],
    regen:     ["Regenerate", "फिर से बनाएँ"],
    revoice:   ["Re-voice", "फिर से बोलें"],
    thumb:     ["Thumbnail", "थंबनेल"],
    library:   ["Reels library", "रील संग्रह"],
    s_layout:  ["choosing layout", "लेआउट चुन रहे हैं"],
    s_facts:   ["reading facts", "तथ्य पढ़ रहे हैं"],
    s_script:  ["writing script", "स्क्रिप्ट लिख रहे हैं"],
    s_check:   ["checking facts", "तथ्य जाँच रहे हैं"],
    s_voice:   ["voicing", "आवाज़ दे रहे हैं"],
    s_render:  ["rendering", "रेंडर कर रहे हैं"],
    s_done:    ["done", "तैयार"],
    silent:    ["Silent (captions only)", "मौन (केवल कैप्शन)"],
    upload:    ["Voice file", "आवाज़ की फ़ाइल"],
    system:    ["System voice (this computer)", "सिस्टम की आवाज़ (यह कंप्यूटर)"],
    notposted: ["Nothing is posted. The reel stays on this device.",
                "कुछ भी पोस्ट नहीं होता। रील इसी डिवाइस पर रहती है।"],
    study:     ["A classical framework for study, not a prediction.",
                "शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं।"]
  };
  function t(key) { var x = L[key]; return x ? x[0] + " / " + x[1] : key; }
  function hi(key) { var x = L[key]; return x ? x[1] : key; }
  function en(key) { var x = L[key]; return x ? x[0] : key; }

  /* ---- hashing: cache keys for voice clips ------------------------------ */
  function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
        .then(function (b) {
          return Array.prototype.map.call(new Uint8Array(b), function (x) {
            return ("0" + x.toString(16)).slice(-2); }).join("");
        });
    }
    /* file:// in some browsers has no SubtleCrypto; a 53-bit string hash is
       enough for a cache key, never for anything that must resist collision */
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return Promise.resolve((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16));
  }

  /* ---- a tiny IndexedDB store -------------------------------------------
     Two object stores: "clips" (voice cache) and "reels" (the library).
     Every call resolves to null rather than throwing when storage is
     unavailable (private windows, file:// in some browsers), because a
     missing cache must never stop a reel being made. */
  var DBP = null;
  function db() {
    if (DBP) return DBP;
    DBP = new Promise(function (res) {
      try {
        if (!window.indexedDB) return res(null);
        var rq = indexedDB.open("nirayana-reel-agent", 1);
        rq.onupgradeneeded = function () {
          var d = rq.result;
          if (!d.objectStoreNames.contains("clips")) d.createObjectStore("clips");
          if (!d.objectStoreNames.contains("reels")) d.createObjectStore("reels", { keyPath: "id" });
        };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
    return DBP;
  }
  function idb(store, mode, fn) {
    return db().then(function (d) {
      if (!d) return null;
      return new Promise(function (res) {
        try {
          var tx = d.transaction(store, mode), s = tx.objectStore(store), rq = fn(s);
          tx.oncomplete = function () { res(rq && "result" in rq ? rq.result : true); };
          tx.onerror = tx.onabort = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  var store = {
    get: function (st, k) { return idb(st, "readonly", function (s) { return s.get(k); }); },
    put: function (st, v, k) { return idb(st, "readwrite", function (s) { return k == null ? s.put(v) : s.put(v, k); }); },
    del: function (st, k) { return idb(st, "readwrite", function (s) { return s.delete(k); }); },
    all: function (st) { return idb(st, "readonly", function (s) { return s.getAll(); }); }
  };

  /* ---- the desktop app ---------------------------------------------------
     Tauri 2 always defines __TAURI_INTERNALS__.invoke inside its webview,
     whatever withGlobalTauri says, so that is the test for "in the app". */
  function inApp() {
    return !!(window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === "function");
  }
  function invoke(cmd, args) {
    if (!inApp()) return Promise.reject(new Error("not in the desktop app"));
    return window.__TAURI_INTERNALS__.invoke(cmd, args || {});
  }

  /* ---- settings, kept per device ---------------------------------------- */
  var SKEY = "nirayana.reelAgent";
  var DEFAULTS = { mode: "offline", lang: "hi", voice: "female", seconds: 45,
                   music: "none", captions: true, provider: "anthropic",
                   model: "", ttsProvider: "", ttsModel: "", elevenVoice: "", handle: "@Nirayana.Soft",
                   daily: false };
  function settings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY) || "{}") || {}; } catch (e) {}
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = k in s ? s[k] : DEFAULTS[k]; });
    return o;
  }
  function save(patch) {
    var s = settings();
    Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  /* ---- THE GATE --------------------------------------------------------- */
  /* HOLD: a surface that draws the reader's own chart (the kundli, the
     ceremony at their birth moment, a Motion scene that needs the chart)
     holds the gate shut for as long as its panel is open. Connected mode
     stays switched on in Settings, but nothing can pass: not the agent,
     not a cloud voice, not a model list. One flag, read by the one check
     everything already goes through. */
  var HOLD = null;
  var net = {
    allowed: function () { return !HOLD && settings().mode === "connected"; },
    hold: function (why) { HOLD = why || "personal"; },
    release: function () { HOLD = null; },
    held: function () { return HOLD; },
    assert: function (what) {
      if (!net.allowed())
        throw new Error("Connected mode is off — " + (what || "a network request") +
                        " was refused before it was made.");
    }
  };

  /* ---- small DOM helper ------------------------------------------------- */
  function el(tag, cls, text, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  RA.core = { L: L, t: t, hi: hi, en: en, sha256: sha256, store: store,
              inApp: inApp, invoke: invoke, settings: settings, save: save,
              DEFAULTS: DEFAULTS, el: el, wait: wait };
  RA.net = net;
})();
