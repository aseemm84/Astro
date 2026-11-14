#!/usr/bin/env python3
"""Evaluate JPL DE422 (the PyPI `de422` package's raw Chebyshev arrays).

DE422 (Folkner 2009) covers JD 625648.5 – 2816816.5, about 3000 BCE – 3000 CE,
in TDB, ICRF (J2000 equator), kilometres. The package ships one array per body,
shape (granules, 3, coefficients), the granules dividing the span evenly.
Every body is relative to the Solar System barycentre except the Moon, which is
geocentric; the Earth is the Earth–Moon barycentre less Moon / (1 + EMRAT).

USE
    python3 -I de422.py DIR  in.json  out.json
in.json: {"jd": [TDB Julian days]}. out.json: {"constants": {...},
"states": [{"jd", "r": {body: [x,y,z] AU}, "v": {body: [...] AU/day}}]} with
bodies Sun, Mercury, Venus, EMB, Earth, Moon (geocentric), Mars, Jupiter,
Saturn, Uranus, Neptune, Pluto.

Kālasetu's reference (source/tools/kalasetu-reference.mjs) calls it; DE422 is
~530 MB and is not kept in the repository (pip download de422).
"""
import json, sys
import numpy as np

FILES = {"Sun": "sun", "Mercury": "mercury", "Venus": "venus", "EMB": "earthmoon", "Moon": "moon",
         "Mars": "mars", "Jupiter": "jupiter", "Saturn": "saturn", "Uranus": "uranus",
         "Neptune": "neptune", "Pluto": "pluto"}

def main():
    d, fin, fout = sys.argv[1], sys.argv[2], sys.argv[3]
    c = np.load(d + "/constants.npy", allow_pickle=True)
    K = {r["name"].decode().strip(): float(r["value"]) for r in c}
    a0, a1, AU, EMRAT = K["jalpha"], K["jomega"], K["AU"], K["EMRAT"]
    arr = {b: np.load(d + "/jpl-%s.npy" % f, mmap_mode="r") for b, f in FILES.items()}
    jds = json.load(open(fin))["jd"]
    out = []
    for jd in jds:
        if not (a0 <= jd <= a1):
            out.append(None); continue
        R, V = {}, {}
        for b, A in arr.items():
            n = A.shape[0]; L = (a1 - a0) / n
            i = min(n - 1, int((jd - a0) // L)); g0 = a0 + i * L
            t = 2.0 * (jd - g0) / L - 1.0
            co = np.asarray(A[i])                   # (3, nc)
            nc = co.shape[1]
            T = np.zeros(nc); D = np.zeros(nc)
            T[0] = 1.0
            if nc > 1: T[1] = t; D[1] = 1.0
            for k in range(2, nc):
                T[k] = 2 * t * T[k - 1] - T[k - 2]
                D[k] = 2 * T[k - 1] + 2 * t * D[k - 1] - D[k - 2]
            R[b] = list(co @ T / AU)
            V[b] = list(co @ D * (2.0 / L) / AU)
        R["Earth"] = [R["EMB"][k] - R["Moon"][k] / (1 + EMRAT) for k in range(3)]
        V["Earth"] = [V["EMB"][k] - V["Moon"][k] / (1 + EMRAT) for k in range(3)]
        out.append({"jd": jd, "r": R, "v": V})
    json.dump({"constants": {k: K[k] for k in ("jalpha", "jomega", "AU", "EMRAT", "GMS", "GM1", "GM2", "GMB",
                                                 "GM4", "GM5", "GM6", "GM7", "GM8", "GM9", "CLIGHT", "J2E", "AE")},
               "states": out}, open(fout, "w"))

if __name__ == "__main__":
    main()
