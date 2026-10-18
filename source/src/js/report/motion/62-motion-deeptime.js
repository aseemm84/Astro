/* ===== Two scenes about time at scales a chart does not reach ==============

   WHAT MAKES THESE DIFFERENT FROM THE REST. Everything else here draws the sky
   over hours, months or a few decades. These two go to five thousand years and
   to four and a third billion, and at those scales the honest handling of
   uncertainty matters more than the drawing does.

   `solstice` — the archaeo-astronomy scene. The equinox slides backward through
   the nakṣatras at about a degree every seventy-two years, so the question
   "which nakṣatra did the winter solstice stand in when the Vedāṅga Jyotiṣa was
   composed" has an arithmetic answer. The scene COMPUTES it and prints what the
   computation gives. It does not print the figure that is usually quoted,
   because that figure comes from a different ayanāṃśa zero and the two differ by
   about forty years — and a site whose whole claim is source discipline cannot
   quietly adopt somebody else's constant and present the result as its own.

   THE UNCERTAINTY IS ON THE FRAME. This project's ayanāṃśa is a quadratic
   fitted to the modern era. Run back to 3500 BCE it parts company with a flat
   50.29″/yr by 0.93°, which is sixty-seven years of precession, and the true
   long-term rate is not exactly either. So the scene states a century of
   uncertainty at the far end rather than printing a year to the unit and hoping
   nobody checks. The claim it can defend is "the solstice stood at the start of
   Dhaniṣṭhā around the fifteenth century BCE, by this engine's ayanāṃśa"; the
   claim it cannot defend is a specific year, and it does not make one.

   `wheels` — the nested cycles, kalpa down to ghaṭī. Every figure in it is
   DEFINITIONAL rather than measured, and the definitions close on each other:
   fourteen manvantaras plus fifteen sandhis come to exactly one kalpa, which is
   also exactly a thousand mahāyugas. The test suite asserts that identity, so a
   mistyped constant fails the build rather than being drawn beautifully. */

var MO_DEEP = [];

/* The same constants panchanga.js holds, repeated here because the motion
   bundle does not load panchanga.js. The test asserts the two copies agree —
   which is the only thing that makes a second copy acceptable. */
var MD_YUGA = { krita: 1728000, treta: 1296000, dvapara: 864000, kali: 432000 };
var MD_MAHAYUGA = 4320000, MD_MANVANTARA = 306720000, MD_KALPA = 4320000000;
var MD_KALI_JD0 = 588465.5, MD_SID_YEAR = 365.258756;
try { window.__mdScale = { yuga: MD_YUGA, mahayuga: MD_MAHAYUGA,
  manvantara: MD_MANVANTARA, kalpa: MD_KALPA, kaliJD0: MD_KALI_JD0 }; } catch (e) {}

var MD_NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
  "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī", "Hasta",
  "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla", "P.Āṣāḍhā",
  "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "P.Bhādra", "U.Bhādra", "Revatī"];

/* The ayanāṃśa this project uses, read through the engine so the scene cannot
   drift from the charts. Expressed as a function of calendar year for the
   scrub. */
function mdAyanAt(year) {
  var jd = 2451545.0 + (year - 2000) * 365.2425;
  try { if (window.__ayanFor) return window.__ayanFor("lahiri", jd); } catch (e) {}
  var T = (jd - 2451545.0) / 36525.0;
  return 0.000307083556492 * T * T + 1.39688796382 * T + 23.857092356;
}
/* The year a given sidereal longitude held a given tropical point, by bisection
   on the ayanāṃśa rather than by inverting the polynomial — so it keeps working
   if the ayanāṃśa model is ever replaced with a better one. */
function mdYearWhen(tropical, sidereal) {
  var want = tropical - sidereal, lo = -4000, hi = 2500;
  if ((mdAyanAt(lo) - want) * (mdAyanAt(hi) - want) > 0) return null;
  for (var i = 0; i < 60; i++) {
    var mid = (lo + hi) / 2;
    if ((mdAyanAt(lo) - want) * (mdAyanAt(mid) - want) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
function mdYearLabel(y) {
  var n = Math.round(y);
  return n < 0 ? (-n + 1) + " BCE" : (n === 0 ? "1 BCE" : n + " CE");
}
try { window.__mdYearWhen = mdYearWhen; window.__mdAyanAt = mdAyanAt; } catch (e) {}

/* ------------------------------------------------------------- solstice ---- */
MO_DEEP.push({
  key: "solstice", label: "Where the solstice stood",
  title: "The solstice has not always been here",
  sub: "five thousand years of precession, computed rather than quoted",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var Y0 = -3500, Y1 = 2100;
    var year = Y0 + (Y1 - Y0) * p;
    var ayan = mdAyanAt(year);
    /* the sidereal longitude of the two tropical points that define the year */
    var wsol = ((270 - ayan) % 360 + 360) % 360;
    var veq  = ((0 - ayan) % 360 + 360) % 360;

    var M = moCached("solstice|eras", function () {
      var seg = 40 / 3, out = {};
      /* when the winter solstice stood at the START of Dhaniṣṭhā — the Vedāṅga
         Jyotiṣa's own statement, turned into a year by this engine */
      out.dhanishthaStart = mdYearWhen(270, 22 * seg);
      out.dhanishthaEnd   = mdYearWhen(270, 23 * seg);
      out.krittikaFrom    = mdYearWhen(0, 3 * seg);
      out.krittikaTo      = mdYearWhen(0, 2 * seg);
      /* how far the quadratic ayanāṃśa has strayed from a flat rate at the far
         end — the honest size of the uncertainty, in years of precession */
      var T = (Y0 - 2000) / 100;
      var lin = 23.857092356 + 1.39688796382 * T;
      out.strayDeg = Math.abs(mdAyanAt(Y0) - lin);
      out.strayYears = out.strayDeg * 3600 / 50.29;
      return out;
    });

    moStars();

    /* the 27, as a vertical ladder: the frame is tall and the nakṣatras are
       what the eye must read, so they get the long axis */
    var x0 = S.w * 0.30, x1 = S.w * 0.93;
    var y0 = st.y + st.h * 0.175, y1 = st.y + st.h * 0.86;
    var seg = 40 / 3;
    function Y(lon) { return y0 + (y1 - y0) * (1 - (((lon % 360) + 360) % 360) / 360); }

    for (var n = 0; n < 27; n++) {
      var ya = Y((n + 1) * seg), yb = Y(n * seg);
      c.fillStyle = (n % 2) ? P.line : P.bg2;
      c.globalAlpha = 0.55; c.fillRect(x0, ya, x1 - x0, yb - ya); c.globalAlpha = 1;
      if (yb - ya > U * 0.016)
        moText(MD_NAK[n], x0 - U * 0.012, (ya + yb) / 2, U * 0.0155,
               P.dim, "right", 500);
    }
    /* Dhaniṣṭhā picked out, because it is the one the text names */
    var dA = Y(23 * seg), dB = Y(22 * seg);
    c.strokeStyle = P.gold; c.lineWidth = Math.max(2, U * 0.004);
    c.strokeRect(x0, dA, x1 - x0, dB - dA);

    /* the two markers */
    function mark(lon, col, label) {
      var y = Y(lon);
      c.strokeStyle = col; c.lineWidth = Math.max(2, U * 0.0045);
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      moGlowDot(x1, y, U * 0.010, col, col);
      moText(label, x1 - U * 0.016, y - U * 0.016, U * 0.017, col, "right", 600);
    }
    mark(veq, P.benefic, moLangHi() ? "वसन्त सम्पात" : "vernal equinox");
    mark(wsol, P.glow, moLangHi() ? "शिशिर अयन" : "winter solstice");

    /* the readings */
    moText(mdYearLabel(year), st.cx, st.y + st.h * 0.072, U * 0.044, P.ink, "center", 700);
    moText((moLangHi() ? "अयनांश " : "ayanāṃśa ") +
           (ayan < 0 ? "−" : "+") + Math.abs(ayan).toFixed(2) + "°",
           st.cx, st.y + st.h * 0.126, U * 0.021, P.dim, "center", 500);

    var nakOfSol = Math.floor(wsol / seg);
    moText((moLangHi() ? "शिशिर अयन: " : "solstice in ") + MD_NAK[nakOfSol],
           st.cx, st.y + st.h * 0.905, U * 0.026, P.glow, "center", 600);
    if (M.dhanishthaStart != null)
      moText((moLangHi() ? "धनिष्ठा का आरम्भ: लगभग " : "at the start of Dhaniṣṭhā around ") +
             mdYearLabel(M.dhanishthaStart), st.cx, st.y + st.h * 0.945,
             U * 0.0195, P.gold, "center", 600);
    /* The uncertainty, on the frame, every frame. */
    moText(moP("precNote", Math.round(M.strayYears)), st.cx, st.y + st.h * 0.983,
           U * 0.0155, P.dim, "center", 500);
    return {};
  }
});

/* --------------------------------------------------------------- wheels ---- */
MO_DEEP.push({
  key: "wheels", label: "Wheels of time",
  title: "Where this moment sits",
  sub: "from the kalpa down to the ghaṭī, each ring a cycle inside the one outside it",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    var now = Date.now();
    var jd = now / 86400000 + 2440587.5;
    var ahargana = jd - MD_KALI_JD0;
    var intoKali = ahargana / MD_SID_YEAR;

    /* WHERE WE STAND INSIDE THE KALPA. This one number is not computed from
       the sky — it is purāṇic chronology: the seventh (Vaivasvata) manvantara,
       the twenty-eighth mahāyuga of it, the Kali of that mahāyuga. The scene
       labels it as tradition rather than letting it sit among the astronomical
       figures as though it had been derived.

       Written out rather than reduced to a constant, so the arithmetic can be
       read and the test can check it: an opening sandhi, six completed
       manvantaras each with its own sandhi, twenty-seven completed mahāyugas,
       then the three yugas before this one. */
    var intoKalpa = MD_YUGA.krita                       /* the opening sandhi */
                  + 6 * (MD_MANVANTARA + MD_YUGA.krita) /* six manvantaras and their sandhis */
                  + 27 * MD_MAHAYUGA                    /* 27 mahāyugas of the seventh */
                  + MD_YUGA.krita + MD_YUGA.treta + MD_YUGA.dvapara
                  + intoKali;

    var d = new Date(now);
    var yearFrac = ((d - Date.UTC(d.getUTCFullYear(), 0, 1)) /
                    (Date.UTC(d.getUTCFullYear() + 1, 0, 1) - Date.UTC(d.getUTCFullYear(), 0, 1)));
    var dayFrac = ((now % 86400000) / 86400000);
    var rings = [
      { n: "Kalpa",      sub: "a day of Brahmā \u00b7 4.32 billion years",
        f: intoKalpa / MD_KALPA, tag: "purāṇic" },
      { n: "Manvantara", sub: "71 mahāyugas \u00b7 306.72 million years",
        f: (27 * MD_MAHAYUGA + MD_YUGA.krita + MD_YUGA.treta + MD_YUGA.dvapara + intoKali)
           / MD_MANVANTARA, tag: "purāṇic" },
      { n: "Mahāyuga",   sub: "4.32 million years",
        f: (MD_YUGA.krita + MD_YUGA.treta + MD_YUGA.dvapara + intoKali) / MD_MAHAYUGA },
      { n: "Kali yuga",  sub: "432,000 years", f: intoKali / MD_YUGA.kali },
      { n: "Saṃvatsara", sub: "the sixty-year cycle", f: (intoKali % 60) / 60 },
      { n: "Year",       sub: "one revolution of the Sun", f: yearFrac },
      { n: "Day",        sub: "60 ghaṭīs \u00b7 30 muhūrtas", f: dayFrac }
    ];
    try { window.__mdKalpaFrac = intoKalpa; } catch (e) {}

    moStars();
    var cx = st.cx, cy = st.y + st.h * 0.585;
    var R0 = Math.min(S.w * 0.40, st.h * 0.305);

    /* THE ZOOM. Each ring inward is K times smaller, so moving the focus by one
       ring is one multiplication — a Powers-of-Ten dive rather than a slideshow.
       The first version drew all seven at once and ignored the playhead
       entirely, which is a correct picture and a useless video: four frames of
       it came back pixel-identical, which is how the probe caught it. */
    var K = 3.1, nR = rings.length;
    var F = p * (nR - 1);
    var zoom = Math.pow(K, F);

    var focus = Math.round(F);
    rings.forEach(function (r, i) {
      var rad = R0 * Math.pow(K, -i) * zoom;
      if (rad < R0 * 0.045 || rad > R0 * 1.55) return;
      var w = rad * 0.26;
      var f = Math.max(0, Math.min(1, r.f));
      /* fading at both ends, so a ring arrives and leaves rather than popping */
      var fade = Math.min(1, Math.min((rad - R0 * 0.045) / (R0 * 0.12),
                                      (R0 * 1.55 - rad) / (R0 * 0.35)));
      c.globalAlpha = fade * 0.55;
      c.beginPath(); c.arc(cx, cy, rad, 0, 6.2832);
      c.lineWidth = w; c.strokeStyle = "rgba(255,255,255,0.05)"; c.stroke();
      c.globalAlpha = fade;
      c.beginPath();
      c.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + f * 6.2832);
      c.lineWidth = w * 0.80;
      c.strokeStyle = (i === focus) ? P.glow : P.gold;
      c.stroke();
      var a = -Math.PI / 2 + f * 6.2832;
      if (rad > R0 * 0.09)
        moGlowDot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad,
                  Math.max(2, w * 0.26), P.ink, P.glow);
      c.globalAlpha = 1;
    });

    /* The focused ring is named in a FIXED block, not above its own band. Hung
       off the ring it collides with it: the band is a quarter of the radius
       thick and the name sat inside that, so the ring being described was drawn
       through its own label. A fixed block also stops the text jumping as the
       zoom runs, which is what makes it readable in motion. */
    var fr = rings[Math.max(0, Math.min(nR - 1, focus))];
    var ty = st.y + st.h * 0.185;
    moText(fr.n, st.cx, ty, U * 0.034, P.ink, "center", 700);
    moText(fr.sub, st.cx, ty + U * 0.030, U * 0.018, P.dim, "center", 500);
    moText((fr.f * 100).toFixed(fr.f < 0.01 ? 4 : 1) + "% " +
           (moLangHi() ? "पूर्ण" : "through"),
           st.cx, ty + U * 0.062, U * 0.026, P.glow, "center", 700);
    if (fr.tag)
      moText(moLangHi() ? "पौराणिक गणना" : "position from purāṇic chronology, not computed",
             st.cx, ty + U * 0.090, U * 0.0155, P.dim, "center", 500);

    moText(moP("kaliYearIs", Math.floor(intoKali), Math.floor(intoKali) + 1),
           st.cx, st.y + st.h * 0.075, U * 0.024, P.ink, "center", 600);
    moText(moP("aharganaIs", Math.round(ahargana)), st.cx, st.y + st.h * 0.123,
           U * 0.019, P.dim, "center", 500);
    moText(moP("kalpaCloses"), st.cx, st.y + st.h * 0.915, U * 0.0185,
           P.gold, "center", 500);
    moText(moP("definitional"), st.cx, st.y + st.h * 0.960, U * 0.0165,
           P.dim, "center", 500);
    return {};
  }
});

MO_SCENES = MO_SCENES.concat(MO_DEEP);
try { window.__moDeepKeys = MO_DEEP.map(function (s) { return s.key; }); } catch (e) {}
