#!/usr/bin/env python3
"""The Moon of JPL DE431, read from the Swiss Ephemeris files (semo*.se1).

DE431 (Folkner et al. 2014) carries an integrated lunar orbit, with the Earth's
and the Moon's figures and the tidal dissipation, from 13201 BCE to 17191 CE.
The Swiss Ephemeris distributes its Moon as compressed files of 600 years each
(github.com/aloistr/swisseph, ephe/semom*.se1), good to about a milliarcsecond
of DE431 itself. Kālasetu uses them only as a reference for fitting, before
3000 BCE, where DE422 ends; the files are not kept in the repository.

The Moon comes out as DE422's does in de422.py: geometric (no light-time, no
aberration, no deflection), geocentric, ICRF, astronomical units, at TT.

USE
    python3 -I de431-moon.py EPHE_DIR in.json out.json
in.json: {"jd": [TT Julian days]}. out.json: {"states": [{"jd", "r": [x,y,z], "v": [...]}]}
"""
import json, sys
import swisseph as swe

def main():
    d, fin, fout = sys.argv[1], sys.argv[2], sys.argv[3]
    swe.set_ephe_path(d)
    fl = (swe.FLG_SWIEPH | swe.FLG_J2000 | swe.FLG_EQUATORIAL | swe.FLG_XYZ | swe.FLG_TRUEPOS |
          swe.FLG_NOABERR | swe.FLG_NOGDEFL | swe.FLG_ICRS | swe.FLG_SPEED)
    out = []
    for jd in json.load(open(fin))["jd"]:
        x, rf = swe.calc(jd, swe.MOON, fl)
        if not (rf & swe.FLG_SWIEPH):            # the file was missing: Swiss fell back to Moshier
            raise SystemExit("no DE431 Moon file for JD %.1f in %s" % (jd, d))
        out.append({"jd": jd, "r": list(x[:3]), "v": list(x[3:6])})
    json.dump({"states": out}, open(fout, "w"))

if __name__ == "__main__":
    main()
