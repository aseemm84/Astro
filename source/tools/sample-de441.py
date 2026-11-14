#!/usr/bin/env python3
"""Sample JPL DE441 into a small reference file for Kālasetu's long-span fit.

WHY THIS EXISTS. Kālasetu is fitted to the site's modern engine, which is not
built for dates before about 5000 BCE. To take the engine towards 12,500 BCE it
needs a long numerical ephemeris; JPL's DE441 runs from about 13,200 BCE (see
claude/kalasetu-12500bce-research.md in the project). The kernel is several
gigabytes and is not reachable from the site's build environment, so this
script is meant to be run on any machine with internet access. It writes a CSV
of a few megabytes that can be attached and given to fit-kalasetu.mjs.

WHAT IT WRITES. One row per instant, in DYNAMICAL time (TT), so no ΔT enters:
the geocentric apparent ecliptic longitude and latitude of the Sun, Moon and
five planets, and the Moon's osculating node, in the FIXED ecliptic of J2000.
Precession is deliberately left out — the fitter applies a long-span model
(Vondrák, Capitaine & Wallace 2011) itself, because the IAU 2006 precession a
library would use for "ecliptic of date" is valid only for a few centuries.

STATUS. Not yet run: DE441 is not available where this was written. It uses
only Skyfield's documented API.

USAGE
    pip install skyfield numpy
    python sample-de441.py --from -13000 --to 1969 --n 6000 --out de441-sample.csv
  (de441_part-1.bsp covers −13,200 to 1969; use de441_part-2.bsp for later
   years, or de441.bsp for both. Skyfield downloads the file on first use.)
"""
import argparse, csv, math, random

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="y0", type=float, default=-13000)
    ap.add_argument("--to", dest="y1", type=float, default=1969)
    ap.add_argument("--n", type=int, default=6000)
    ap.add_argument("--seed", type=int, default=20261114)
    ap.add_argument("--kernel", default="de441_part-1.bsp")
    ap.add_argument("--out", default="de441-sample.csv")
    a = ap.parse_args()

    from skyfield.api import load
    from skyfield.framelib import ecliptic_J2000_frame
    ts = load.timescale()
    eph = load(a.kernel)
    earth = eph["earth"]
    bodies = [("Sun", "sun"), ("Moon", "moon"), ("Mercury", "mercury barycenter"),
              ("Venus", "venus barycenter"), ("Mars", "mars barycenter"),
              ("Jupiter", "jupiter barycenter"), ("Saturn", "saturn barycenter")]

    rnd = random.Random(a.seed)
    jd0 = 2451545.0 + (a.y0 - 2000.0) * 365.2425
    jd1 = 2451545.0 + (a.y1 - 2000.0) * 365.2425
    with open(a.out, "w", newline="") as f:
        w = csv.writer(f)
        head = ["jd_tt"]
        for name, _ in bodies: head += [name + "_lon", name + "_lat"]
        head += ["node_osculating_lon"]
        w.writerow(head)
        for i in range(a.n):
            jd = jd0 + (jd1 - jd0) * (i + rnd.random()) / a.n     # one per slot, jittered
            t = ts.tt_jd(jd)
            row = [f"{jd:.6f}"]
            for _, key in bodies:
                app = earth.at(t).observe(eph[key]).apparent()
                lat, lon, _ = app.frame_latlon(ecliptic_J2000_frame)
                row += [f"{lon.degrees:.7f}", f"{lat.degrees:.7f}"]
            # the Moon's osculating node: h = r x v of the geocentric Moon, in the
            # J2000 ecliptic — the same construction engine.js trueNodeAt() uses
            dt = 0.0005
            p0 = (eph["moon"] - earth).at(ts.tt_jd(jd - dt)).frame_xyz(ecliptic_J2000_frame).au
            p1 = (eph["moon"] - earth).at(ts.tt_jd(jd + dt)).frame_xyz(ecliptic_J2000_frame).au
            r = [(p0[k] + p1[k]) / 2 for k in range(3)]
            v = [p1[k] - p0[k] for k in range(3)]
            h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]
            row.append(f"{math.degrees(math.atan2(h[0], -h[1])) % 360:.7f}")
            w.writerow(row)
            if (i + 1) % 500 == 0: print(f"{i + 1}/{a.n}")
    print("wrote", a.out)

if __name__ == "__main__":
    main()
