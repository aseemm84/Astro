#!/usr/bin/env python3
"""Generate source/test/fixtures/reference-ecliptic.json — an INDEPENDENT sky.

   WHY THIS FILE EXISTS.

   Everything else in source/test/ checks the site against itself: that two
   copies of the varga formulas agree, that the prastāra adds up to the bhinna
   totals, that the Chara lengths match hand-counted cases. All of that is
   worth having and none of it would notice if the POSITIONS went wrong. The
   engine's planetary longitudes come from astronomy-engine, the ayanāṃśa from
   polynomials fitted here, and the lagna from a closed form — and until this
   file existed, nothing in the suite compared any of them to a sky computed
   some other way. A vendored-library bump, a mistyped ayanāṃśa coefficient or
   a frame slip would have passed all 352 self-test checks and reached a user.

   So this writes down a sky computed by a different lineage of code, and
   reference-verify.mjs holds the engine to it.

   WHAT THE REFERENCE IS.

   ERFA — the IAU SOFA algorithms, through astropy. Specifically:

     the Sun and the Earth   erfa.epv00   (sub-milliarcsecond 1900–2100)
     the Moon                erfa.moon98  (a few arcseconds)
     the five tārā-grahas    erfa.plan94  (its own documented longitude error
                                           over 1000–3000 CE: Mercury 4″,
                                           Venus 5″, Mars 17″, Jupiter 71″,
                                           Saturn 81″)
     Earth orientation       erfa.gst06a, erfa.obl06 (IAU 2006/2000A)

   That accuracy table is the whole reason the per-body bars in
   reference-verify.mjs are not all equal, and the reason the outer-planet bars
   are loose. A loose bar is not a precision measurement; it is a bar wide
   enough that only a REAL fault trips it. The Sun and the Moon — which decide
   the ayanāṃśa frame, the nakṣatra, the tithi and every daśā boundary — are
   where the reference is strongest and the bars are tightest, and that is the
   right way round.

   A JPL DE kernel would be a better reference than plan94 for Jupiter and
   Saturn. naif.jpl.nasa.gov is not reachable from this environment (the
   request is refused before it leaves), so DE440s is not an option here and
   no attempt is made to work around that. If the kernel is ever available,
   switch solar_system_ephemeris to 'de440s' and the bars tighten by an order
   of magnitude without any other change.

   WHAT IS INDEPENDENT AND WHAT IS NOT.

   Independent of the site: the planetary and lunar positions, GAST, the
   obliquity, and the ascendant — which is computed below by intersecting the
   ecliptic with the horizon plane as vectors, NOT by the closed form the
   engine uses, so the two can disagree.

   NOT independent: the mean lunar node, which is the same standard polynomial
   in both. Pinning it still catches a typo or a sign flip; it cannot catch a
   wrong polynomial. That limit is recorded in the fixture itself rather than
   left for a reader to discover.

   FRAME. Apparent geocentric longitude and latitude in the TRUE ecliptic and
   equinox of date — established empirically, not assumed: at 1850-01-01T12Z
   astronomy-engine's Ecliptic(GeoVector(Sun, t, true)) gives 280.797428° and
   this pipeline gives 280.797581°, 0.55″ apart, while the J2000 ecliptic would
   give 282.890789°, two degrees away. The frames match; the fixture is
   therefore comparable to window.__kEclip(...).trop directly, with no
   ayanāṃśa involved on either side.

   Run:  python3 source/test/make-reference-fixture.py
"""

import json
import math
import os
import sys
import warnings

import numpy as np

warnings.filterwarnings("ignore")  # ERFA's "dubious year" notes outside 1900–2100

import astropy
import erfa
from astropy.coordinates import GeocentricTrueEcliptic, get_body, solar_system_ephemeris
from astropy.time import Time

EPHEMERIS = "builtin"
BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]

# ERFA's own documented longitude accuracy, arcseconds, 1000–3000 CE. Carried
# into the fixture so the bars in the harness can be justified from it rather
# than chosen to make the tests pass.
REFERENCE_ARCSEC = {
    "Sun": 0.1, "Moon": 5.0, "Mercury": 4.0, "Venus": 5.0,
    "Mars": 17.0, "Jupiter": 71.0, "Saturn": 81.0,
}

# Four places, so the ascendant is exercised at a tropical latitude, a
# mid-northern one, a southern one and one near the Arctic circle where the
# ecliptic-horizon intersection is most ill-conditioned.
PLACES = [
    {"name": "Moradabad", "lat": 28.8389, "lon": 78.7768},
    {"name": "Abu Dhabi", "lat": 24.4539, "lon": 54.3773},
    {"name": "Wellington", "lat": -41.2866, "lon": 174.7756},
    {"name": "Tromso", "lat": 69.6492, "lon": 18.9553},
]


def norm360(x):
    return x % 360.0


def stratified_instants(y0, y1, n):
    """A grid that cannot accidentally sample one phase of anything.

       A naive even grid over four centuries lands on nearly the same time of
       day and nearly the same part of the year every time, which is exactly
       how a seasonal or diurnal error hides. So: walk the whole span, and at
       each step advance the month and the hour by amounts coprime with their
       cycles, so every month-of-year and every hour-of-day is visited.
    """
    out = []
    span_days = (y1 - y0) * 365.2425
    for i in range(n):
        frac = i / (n - 1)
        year = y0 + frac * (y1 - y0)
        yi = int(year)
        month = (i * 7) % 12 + 1          # 7 and 12 coprime → all 12 months
        day = (i * 11) % 27 + 1           # 11 and 27 coprime → spread in month
        hour = (i * 5) % 24               # 5 and 24 coprime → all 24 hours
        minute = (i * 17) % 60
        out.append((yi, month, day, hour, minute))
    return out


def ascendant_by_geometry(gast_hours, lon_deg, lat_deg, obliquity_deg):
    """The ascendant as the ecliptic's rising intersection with the horizon.

       Deliberately NOT the engine's closed form. The ecliptic is the locus
       p(λ) = (cos λ, sin λ cos ε, sin λ sin ε) in the equatorial frame of
       date; the local zenith is z = (cos φ cos θ, cos φ sin θ, sin φ) with θ
       the local apparent sidereal angle. The horizon is p · z = 0, which is
       linear in (cos λ, sin λ) and so has two roots 180° apart. The rising
       one is the root east of the meridian, i.e. with sin(θ − α) < 0.
    """
    theta = math.radians(norm360(gast_hours * 15.0 + lon_deg))
    phi = math.radians(lat_deg)
    eps = math.radians(obliquity_deg)

    # cos λ (cos φ cos θ) + sin λ (cos ε cos φ sin θ + sin ε sin φ) = 0
    a = math.cos(phi) * math.cos(theta)
    b = math.cos(eps) * math.cos(phi) * math.sin(theta) + math.sin(eps) * math.sin(phi)
    lam = math.atan2(-a, b)

    for candidate in (lam, lam + math.pi):
        x = math.cos(candidate)
        y = math.sin(candidate) * math.cos(eps)
        z = math.sin(candidate) * math.sin(eps)
        alpha = math.atan2(y, x)
        if math.sin(theta - alpha) < 0:
            return norm360(math.degrees(candidate))
    return norm360(math.degrees(lam))


def mean_node_deg(jd_tt):
    """The standard mean-node polynomial. NOT independent of the engine — the
       same expression is in engine.js. Pinned to catch a typo, not a theory."""
    t = (jd_tt - 2451545.0) / 36525.0
    return norm360(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t
                   + t ** 3 / 467441.0 - t ** 4 / 60616000.0)


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "reference-ecliptic.json")

    n = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    grid = stratified_instants(1800, 2200, n)

    samples = []
    with solar_system_ephemeris.set(EPHEMERIS):
        for idx, (y, mo, d, h, mi) in enumerate(grid):
            iso = "%04d-%02d-%02dT%02d:%02d:00" % (y, mo, d, h, mi)
            t = Time(iso, scale="utc")
            frame = GeocentricTrueEcliptic(equinox=t)

            bodies = {}
            for name in BODIES:
                c = get_body(name.lower(), t).transform_to(frame)
                bodies[name] = {
                    "lon": round(float(norm360(c.lon.deg)), 7),
                    "lat": round(float(c.lat.deg), 7),
                }

            jd_tt = float(t.tt.jd)
            jd1, jd2 = float(t.tt.jd1), float(t.tt.jd2)
            gast = float(erfa.gst06a(float(t.ut1.jd1), float(t.ut1.jd2), jd1, jd2))
            gast_hours = norm360(math.degrees(gast)) / 15.0
            obl = math.degrees(float(erfa.obl06(jd1, jd2)))
            # true obliquity = mean + nutation in obliquity
            dpsi, deps = erfa.nut06a(jd1, jd2)
            obl_true = obl + math.degrees(float(deps))

            lagnas = {}
            for p in PLACES:
                lagnas[p["name"]] = round(
                    ascendant_by_geometry(gast_hours, p["lon"], p["lat"], obl_true), 6)

            samples.append({
                "iso": iso + "Z",
                "jdUTC": round(float(t.jd), 9),
                # The comparison index. Positions are a function of TT, and
                # astronomy-engine treats its Date argument as UT, so comparing
                # at a common UTC compares two DIFFERENT ΔT predictions as well
                # as two skies. At 2150 those predictions diverge by about 400
                # seconds, which moved the Moon 219″ and looked exactly like an
                # engine fault until it was bucketed by epoch. Matching on TT
                # removes the timescale from the comparison; the harness solves
                # for the UT that puts astronomy-engine at this TT.
                "jdTT": round(float(t.tt.jd), 9),
                "ttMinusUtcSeconds": round((float(t.tt.jd) - float(t.jd)) * 86400.0, 6),
                "bodies": bodies,
                "meanNode": round(mean_node_deg(jd_tt), 7),
                "gastHours": round(gast_hours, 9),
                "trueObliquity": round(obl_true, 9),
                "lagna": lagnas,
            })
            if (idx + 1) % 50 == 0:
                print("  %d / %d" % (idx + 1, n), file=sys.stderr)

    doc = {
        "_provenance": {
            "what": "Apparent geocentric ecliptic longitude and latitude of the "
                    "grahas, the mean lunar node, Greenwich apparent sidereal "
                    "time, the true obliquity and the sidereal-free (tropical) "
                    "ascendant at four places, on a stratified grid.",
            "why": "The site's positions came from one library and were compared "
                   "to nothing. This is a sky from a different lineage of code, "
                   "so reference-verify.mjs can fail when the engine drifts.",
            "frame": "True ecliptic and equinox of date, apparent place. "
                     "Comparable to window.__kEclip(name, ms).trop with no "
                     "ayanamsa on either side.",
            "timescale":
                "Compare on jdTT, never on iso/jdUTC. A position is a function "
                "of TT; astronomy-engine takes its Date as UT and applies its "
                "own Delta-T, while jdTT here is TAI-derived and predicts "
                "nothing. Comparing at a common UTC therefore compares two "
                "Delta-T models as well as two skies -- at 2150 they differ by "
                "roughly 400 s, which displaces the Moon by about 219 arcsec "
                "and is indistinguishable from an engine fault until the "
                "residual is bucketed by epoch. The harness solves for the UT "
                "that puts the engine at each sample's TT, and reports the "
                "Delta-T disagreement separately as the stated uncertainty it "
                "is rather than failing on it.",
            "generator": "source/test/make-reference-fixture.py",
            "reference": "ERFA (IAU SOFA) via astropy: epv00 for the Sun, "
                         "moon98 for the Moon, plan94 for the five tara-grahas, "
                         "gst06a and obl06/nut06a for Earth orientation.",
            "referenceAccuracyArcsec": REFERENCE_ARCSEC,
            "referenceAccuracyNote":
                "plan94's own documented longitude error over 1000-3000 CE. The "
                "per-body bars in the harness are derived from these, which is "
                "why Jupiter's and Saturn's are loose. A loose bar is not a "
                "precision claim; it is wide enough that only a real fault "
                "trips it.",
            "notIndependent":
                "The mean lunar node is the same polynomial in the generator and "
                "in engine.js, so pinning it catches a typo or a sign flip and "
                "cannot catch a wrong polynomial. The true node is not pinned at "
                "all: it is an osculating element with no closed form here.",
            "notAvailable":
                "A JPL DE kernel would beat plan94 for Jupiter and Saturn. "
                "naif.jpl.nasa.gov is not reachable from the build environment, "
                "so de440s was not used. Switching EPHEMERIS to 'de440s' is the "
                "only change needed if it becomes available.",
            "ascendantMethod":
                "Computed by intersecting the ecliptic with the horizon plane as "
                "vectors and selecting the rising root, not by the closed form "
                "engine.js uses, so the two are genuinely comparable.",
            "span": "1800-2200",
            "samples": len(samples),
            "places": PLACES,
            "astropy": astropy.__version__,
            "pyerfa": erfa.__version__,
            "ephemeris": EPHEMERIS,
            "python": sys.version.split()[0],
        },
        "samples": samples,
    }

    with open(out_path, "w") as f:
        json.dump(doc, f, indent=1)
        f.write("\n")
    print("wrote %s — %d samples, %d bodies" % (out_path, len(samples), len(BODIES)))


if __name__ == "__main__":
    main()
