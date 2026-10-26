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

  window.SPVoice = { load: load, info: info, buffer: buffer, clear: clear,
                     fitSeconds: fitSeconds, why: why };
})();
