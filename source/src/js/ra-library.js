/* ===== Reel Agent — the Reels library ====================================

   Every finished reel is kept on this device (IndexedDB): the video, the
   thumbnail, the subtitles, the caption, and the script and settings it was
   made from, so a reel can be re-opened, re-edited and re-exported without
   regenerating it. Nothing here leaves the device. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  function save(r) {
    var rec = {
      id: "reel-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      at: Date.now(), title: r.title || r.layout, layout: r.layout, lang: r.lang,
      duration: r.duration || r.expected, mime: r.mime, ext: r.ext,
      blob: r.blob, thumb: r.thumb || null, srt: r.srt, caption: r.caption,
      lines: r.lines, codec: r.file && r.file.codec, audio: r.file && r.file.audioCodec,
      mode: r.mode || "offline", provider: r.provider || null
    };
    return RA.core.store.put("reels", rec).then(function (ok) { return ok ? rec : null; });
  }
  function list() {
    return RA.core.store.all("reels").then(function (a) {
      return (a || []).sort(function (x, y) { return y.at - x.at; });
    });
  }
  function get(id) { return RA.core.store.get("reels", id); }
  function remove(id) { return RA.core.store.del("reels", id); }

  /* a small panel listing the library, opened from the reel panel */
  function show(host, onReedit) {
    var el = RA.core.el, t = RA.core.t;
    host.textContent = "";
    host.appendChild(el("h3", null, t("library")));
    return list().then(function (rs) {
      if (!rs.length) { host.appendChild(el("p", "ra-note", "No reels yet. / अभी कोई रील नहीं।")); return; }
      rs.forEach(function (r) {
        var row = el("div", "ra-lib");
        if (r.thumb) { var im = el("img"); im.src = URL.createObjectURL(r.thumb); row.appendChild(im); }
        var info = el("div");
        info.appendChild(el("b", null, r.title || r.layout));
        info.appendChild(el("div", "ra-note", new Date(r.at).toLocaleString() + " · " + r.layout + " · " +
          (r.duration ? r.duration.toFixed(1) + " s" : "") + " · " + (r.ext || "").toUpperCase() + " · " + r.mode));
        var b = el("div", "ra-row");
        var open = el("button", "ra-b ghost", "Open / खोलें", { type: "button" });
        open.addEventListener("click", function () {
          var v = el("video", null, null, { controls: "" }); v.src = URL.createObjectURL(r.blob);
          v.style.width = "220px"; info.appendChild(v); open.disabled = true;
        });
        var ed = el("button", "ra-b ghost", "Re-edit / फिर से संपादित करें", { type: "button" });
        ed.addEventListener("click", function () { if (onReedit) onReedit(r); });
        var ex = el("button", "ra-b ghost", t("download"), { type: "button" });
        ex.addEventListener("click", function () {
          var name = (r.layout || "reel").replace(/[^\w.-]+/g, "-") + "." + (r.ext || "mp4");
          if (RA.native && RA.core.inApp()) RA.native.saveFile(r.blob, name);
          else { var a = document.createElement("a"); a.href = URL.createObjectURL(r.blob); a.download = name; a.click(); }
        });
        var del = el("button", "ra-b ghost", "Delete / हटाएँ", { type: "button" });
        del.addEventListener("click", function () { remove(r.id).then(function () { row.remove(); }); });
        [open, ed, ex, del].forEach(function (x) { b.appendChild(x); });
        info.appendChild(b); row.appendChild(info); host.appendChild(row);
      });
    });
  }

  RA.library = { save: save, list: list, get: get, remove: remove, show: show };
})();
