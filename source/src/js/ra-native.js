/* ===== Reel Agent — the desktop app's native pieces ======================

   Thin wrappers over the Tauri commands in src-tauri/src/reel_agent.rs, with
   the web's own behaviour as the fallback when the page is not in the app.

   A finished reel is tens of megabytes, so it crosses into Rust as the raw
   request body (an ArrayBuffer), never as a JSON array of numbers, and its
   suggested name rides in a header.

   SHARE. The macOS share sheet and the Windows share UI need platform code
   that this build does not carry yet; until it does, "Share" in the app saves
   the file and shows it in Finder / Explorer, from where it can be shared.
   The panel's label says "Show in folder" there, so the button does what it
   says. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var LAST = null;

  function saveFile(blob, name) {
    return blob.arrayBuffer().then(function (buf) {
      return window.__TAURI_INTERNALS__.invoke("save_file", new Uint8Array(buf),
        { headers: { "x-name": encodeURIComponent(name) } });
    }).then(function (path) { if (path) LAST = path; return path; });
  }
  function reveal(path) {
    return RA.core.invoke("reveal_in_folder", { path: path || LAST });
  }
  /* save, then show it — the closest honest thing to a share sheet for now */
  function share(blob, name) {
    return saveFile(blob, name).then(function (p) { return p ? reveal(p) : null; });
  }

  RA.native = { saveFile: saveFile, reveal: reveal, share: share, last: function () { return LAST; } };
})();
