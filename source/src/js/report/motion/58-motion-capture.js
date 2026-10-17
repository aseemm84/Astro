/* ===== Deterministic video capture, and the Reels safe zones ==============

   WHAT WAS MISSING. The Motion tab could save a single frame and a workbook,
   and nothing else — so the only way to get one of these twenty-four scenes
   into a Reel was to screen-record it. A screen recording captures whatever the
   machine managed to draw at the moment it looked: frames are dropped under
   load, the rate wanders, and the result stutters when a platform re-encodes it.

   WHY THIS IS NOT A SCREEN RECORDER. The animation is not recorded while it
   plays. The playhead is STEPPED by an exact increment per frame, drawn, and
   handed to the encoder — one encoded frame per drawn frame, with

       canvas.captureStream(0)  +  track.requestFrame()

   The zero means "this stream produces no frames on its own"; every frame is
   pushed deliberately after its draw completes. So the output is constant frame
   rate by construction, whatever the machine was doing at the time: a slow
   laptop produces the same file as a fast one, only later. A dropped frame is
   not possible, because nothing is sampling a clock.

   This also makes the slow speeds usable for the first time. A 1/50 loop runs
   twenty-two minutes on screen; captured, the same motion is a 27-second file,
   because the simulation's time and the viewer's time are no longer the same
   quantity.

   NO DEPENDENCIES, which is the whole point of this project: MediaRecorder is
   in the browser, and the format is whichever the browser encodes natively —
   MP4/H.264 in Safari, WebM elsewhere. There is no server, no FFmpeg, no
   toolchain, and nothing leaves the machine.

   THE PNG SEQUENCE is offered as well for the archival case, and is deliberately
   capped: a 1080x1920 frame is roughly a megabyte, so a 27-second loop at 30 fps
   is something like 650 MB. That is a real number and the panel says it rather
   than letting a reader discover it when the tab dies. */

var MO_CAP = { fps: 30, running: false, cancel: false };

/* The container the browser can actually encode. Safari gives H.264 in MP4,
   which is what a phone wants; everything else gives WebM, which every editor
   reads and which uploads fine after a convert. Asked rather than assumed —
   isTypeSupported is the only honest way to know. */
function moPickMime() {
  var want = [
    ["video/mp4;codecs=avc1.42E01E", "mp4"],
    ["video/mp4;codecs=h264", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9", "webm"],
    ["video/webm;codecs=vp8", "webm"],
    ["video/webm", "webm"]
  ];
  if (typeof MediaRecorder === "undefined") return null;
  for (var i = 0; i < want.length; i++) {
    try {
      if (MediaRecorder.isTypeSupported(want[i][0]))
        return { mime: want[i][0], ext: want[i][1] };
    } catch (e) {}
  }
  return null;
}

function moCapName(ext) {
  var nm = (MO.J && MO.J.input && MO.J.input.name)
         ? String(MO.J.input.name).replace(/[^\w -]/g, "").trim() : "";
  return "{{BRAND_SLUG}}-" + MO.scene + (nm ? "-" + nm.replace(/\s+/g, "-") : "") +
         "-" + MO.ratio.replace(":", "x") + "." + ext;
}
function moCapMsg(t) {
  var el = document.getElementById("movidmsg");
  if (el) el.innerHTML = t;
}
function moCapBusy(on, label) {
  MO_CAP.running = on;
  var b = document.getElementById("movid");
  if (b) { b.disabled = on; b.textContent = on ? (label || "Recording…") : "Record this loop"; }
  var c = document.getElementById("movidstop");
  if (c) c.hidden = !on;
}

/* One loop, stepped and encoded. Returns a promise so the caller can chain, but
   the panel only ever fires and forgets. */
function moRecordLoop() {
  if (MO_CAP.running) return Promise.resolve();
  var cv = MO.cv;
  if (!cv || !cv.captureStream) {
    moCapMsg("This browser cannot capture a canvas, so video export is not " +
             "available here. The single-frame PNG above still works.");
    return Promise.resolve();
  }
  var pick = moPickMime();
  if (!pick) {
    moCapMsg("This browser has no video encoder available, so video export is " +
             "not possible here. The single-frame PNG above still works.");
    return Promise.resolve();
  }

  var fps = MO_CAP.fps;
  var rep = moPaceReport();
  /* The captured duration is the loop's own derived duration — the number the
     panel has been promising all along — so what is recorded is what the
     read-out said, not a second interpretation of it. */
  var frames = Math.max(2, Math.round(rep.dur * fps));
  /* A cap, said out loud. Twenty minutes of frames is not an export, it is an
     accident, and at 1/50 speed it is one click away. */
  var CAPF = 60 * fps * 3;
  var capped = false;
  if (frames > CAPF) { frames = CAPF; capped = true; }

  var wasPlaying = MO.playing, wasP = MO.p, wasGuides = MO.guides;
  if (wasPlaying) moPlay(false);
  MO.guides = false;                 /* guides are for the eye, never recorded */

  var stream, track, rec, chunks = [];
  try {
    stream = cv.captureStream(0);
    track = stream.getVideoTracks()[0];
    rec = new MediaRecorder(stream, { mimeType: pick.mime, videoBitsPerSecond: 12000000 });
  } catch (e) {
    moCapMsg("The recorder could not be started (" + (e && e.message) + ").");
    MO.guides = wasGuides;
    return Promise.resolve();
  }
  rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
  /* What the recorder NEGOTIATED, which is not always what was asked for. A
     browser can accept "video/mp4" and then put VP9 inside it — a genuine MP4
     carrying a codec Instagram will not reliably ingest. Container and payload
     are separate questions and only the recorder knows the answer, so it is
     read back rather than assumed from the request. */
  var got = "";
  try { got = rec.mimeType || pick.mime; } catch (e) { got = pick.mime; }

  MO_CAP.cancel = false;
  moCapBusy(true, "Recording 0%");
  rec.start();
  MO.p = 0;

  return new Promise(function (done) {
    var i = 0;
    function step() {
      if (MO_CAP.cancel) { finish(true); return; }
      /* The playhead advances by an EXACT frame's worth of simulation time, not
         by however long the last frame happened to take. This is the whole
         difference between this and a screen recording. */
      MO.p = moPaceStep(MO.p, 1000 / fps);
      if (MO.p >= 1) MO.p -= 1;
      try { moDraw(); } catch (e) {}
      try { track.requestFrame(); } catch (e) {}
      i++;
      if (i % 10 === 0) moCapBusy(true, "Recording " + Math.round(100 * i / frames) + "%");
      if (i >= frames) { finish(false); return; }
      /* Yield so the encoder can drain. Without this the whole loop runs in one
         task and the recorder is handed every frame at once. */
      setTimeout(step, 0);
    }
    function finish(cancelled) {
      try { rec.onstop = function () {
        var blob = new Blob(chunks, { type: pick.mime.split(";")[0] });
        MO.p = wasP; MO.guides = wasGuides;
        try { moDraw(); } catch (e) {}
        moCapBusy(false);
        if (cancelled) { moCapMsg("Recording stopped; nothing saved."); done(); return; }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = moCapName(pick.ext);
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        moCapMsg("<b>" + moCapName(pick.ext) + "</b> &mdash; " +
          frames + " frames at " + fps + " fps, " +
          (frames / fps).toFixed(1) + " s, " + Math.round(blob.size / 1048576 * 10) / 10 +
          " MB. Constant frame rate: every frame was drawn and encoded " +
          "deliberately, so nothing was dropped." +
          (capped ? " <b>Capped at three minutes</b> &mdash; the loop's full " +
                    "length at this speed would have been " + moDurLabel(rep.dur) +
                    "." : "") +
          moCapCodecNote(got, pick.ext));
        if (wasPlaying) moPlay(true);
        done();
      }; rec.stop(); } catch (e) { moCapBusy(false); done(); }
    }
    setTimeout(step, 0);
  });
}

/* H.264 in MP4 is what a phone and the platforms ingest without re-encoding.
   Anything else works, and works everywhere an editor is involved, but should
   be said rather than discovered at the upload. */
function moCapCodecNote(mime, ext) {
  var m = String(mime || "").toLowerCase();
  var h264 = /avc1|h264|h\.264/.test(m);
  var codec = (m.match(/codecs=([^;"]+)/) || [, ""])[1] || "unstated";
  if (h264 && ext === "mp4")
    return " Encoded as H.264 in MP4 &mdash; ready to post as it is.";
  return " The browser encoded <b>" + esc(codec) + "</b> in " + ext.toUpperCase() +
         ", not H.264/MP4. It plays everywhere and every editor reads it, but " +
         "the platforms prefer H.264: Safari records that directly, or convert " +
         "once with <code>ffmpeg -i in." + ext + " -c:v libx264 -pix_fmt yuv420p out.mp4</code>.";
}

/* ===== the Reels safe zones ==============================================
   Instagram draws its own interface over a Reel: the caption and the account
   handle along the bottom, the like/comment/share column down the right, and a
   little furniture at the top. Anything placed under those is unreadable in the
   feed however good it looks here.

   Drawn as a guide, never recorded, and the insets are SETTINGS rather than
   constants. Published figures for these vary by device and change when the app
   changes, so a hard-coded 320 px pretending to be exact would be worse than a
   stated default that can be corrected against the phone in your hand. */
var MO_SAFE = { bottom: 0.18, right: 0.13, top: 0.07 };
function moDrawGuides() {
  if (!MO.guides || !MO.ctx) return;
  var S = moSize(), c = MO.ctx;
  var b = S.h * MO_SAFE.bottom, r = S.w * MO_SAFE.right, t = S.h * MO_SAFE.top;
  c.save();
  c.fillStyle = "rgba(220,60,60,0.16)";
  c.fillRect(0, S.h - b, S.w, b);
  c.fillRect(S.w - r, 0, r, S.h - b);
  c.fillRect(0, 0, S.w - r, t);
  c.strokeStyle = "rgba(255,90,90,0.75)";
  c.lineWidth = Math.max(2, S.w / 400);
  c.setLineDash([S.w / 60, S.w / 90]);
  c.beginPath();
  c.moveTo(0, S.h - b); c.lineTo(S.w, S.h - b);
  c.moveTo(S.w - r, 0); c.lineTo(S.w - r, S.h - b);
  c.moveTo(0, t); c.lineTo(S.w - r, t);
  c.stroke();
  c.setLineDash([]);
  var f = Math.round(S.w / 34);
  c.fillStyle = "rgba(255,170,170,0.95)";
  c.font = "600 " + f + "px " + 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  c.textAlign = "left";
  c.fillText("caption & handle", S.w * 0.04, S.h - b + f * 1.3);
  c.save();
  c.translate(S.w - r + f * 1.25, S.h * 0.30);
  c.rotate(Math.PI / 2);
  c.fillText("buttons", 0, 0);
  c.restore();
  c.textAlign = "right";
  c.fillText(MO.safeLayout ? "guides only — safe layout on"
                           : "guides only — not recorded", S.w - r - f * 0.5, t - f * 0.45);
  c.restore();
}
