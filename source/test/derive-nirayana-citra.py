# The derivation behind AYAN_MODES.nirayana_citra, kept so the coefficients in
# engine.js can be re-derived rather than trusted.  It is a BUILD-MACHINE tool
# and no part of the site: it needs astropy, pyerfa and a local clone of the HYG
# database, none of which the site has or wants.
#
#   pip install astropy pyerfa
#   git clone https://github.com/astronexus/HYG-Database   (path below)
#   python3 derive-nirayana-citra.py
#
# It prints the quadratic the engine carries, its residual against the
# derivation, and the corroboration against Swiss Ephemeris SS_CITRA.  The same
# pipeline produced nirayana_revati; only the star and the anchor differ.
"""Nirayana-Chitrapaksa: Citra (Spica) held at polar longitude 180 degrees.

Same pipeline as Nirayana-Revati: HYG v4.1 astrometry (Hipparcos), the star
propagated by its full space motion, measured by POLAR longitude (dhruvaka) in
the ecliptic and MEAN equinox of date with no nutation.  Calculation only.
"""
import csv, math, numpy as np, erfa
from astropy.coordinates import SkyCoord, GeocentricMeanEcliptic
from astropy.time import Time
import astropy.units as u

HYG="/home/claude/astronexus/hyg-database/hyg/CURRENT/hygdata_v41.csv"
def star(hr):
    with open(HYG,newline="",encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            if rec["hr"].strip()==hr:
                d=float(rec["dist"] or 0) or 1e6
                return SkyCoord(ra=float(rec["ra"])*15*u.deg, dec=float(rec["dec"])*u.deg,
                    distance=d*u.pc, pm_ra_cosdec=float(rec["pmra"] or 0)*u.mas/u.yr,
                    pm_dec=float(rec["pmdec"] or 0)*u.mas/u.yr,
                    radial_velocity=float(rec["rv"] or 0)*u.km/u.s,
                    obstime=Time("J2000.0"), frame="icrs"), rec
    raise SystemExit("hr "+hr+" not found")

SPICA, rec = star("5056")      # alpha Vir = Citra
REVATI, rrec = star("361")     # zeta Psc  = Revati
print("Spica  HYG: ra=%s dec=%s dist=%s pmra=%s pmdec=%s rv=%s mag=%s"
      % (rec["ra"],rec["dec"],rec["dist"],rec["pmra"],rec["pmdec"],rec["rv"],rec["mag"]))

def norm(x): return x % 360.0
def polar_and_ecl(sc, t):
    eps=math.degrees(erfa.obl06(t.jd1,t.jd2))
    e=sc.apply_space_motion(new_obstime=t).transform_to(GeocentricMeanEcliptic(equinox=t))
    lam,bet=e.lon.deg,e.lat.deg
    L,B,E=map(math.radians,(lam,bet,eps))
    ra=math.atan2(math.cos(B)*math.cos(E)*math.sin(L)-math.sin(B)*math.sin(E),
                  math.cos(B)*math.cos(L))
    pol=math.degrees(math.atan2(math.sin(ra)/math.cos(E), math.cos(ra)))
    return norm(pol), norm(lam), bet, eps

def tt(year):
    return Time(2451545.0+(year-2000.0)*365.25, format="jd", scale="tt")

# --- the anchor: Citra at polar 180 ---
ANCHOR=180.0
def ayan_citra(year):
    pol,lam,bet,eps = polar_and_ecl(SPICA, tt(year))
    return norm(pol-ANCHOR), pol, lam, bet, eps

print("\nyear      polar lam_p    ecliptic lam   beta      ayanamsa(polar)")
for y in (1700,1900,2000,2026,2100,2300):
    a,pol,lam,bet,eps = ayan_citra(y)
    print("%6d  %12.6f  %13.6f  %8.4f  %12.6f" % (y,pol,lam,bet,a))

# --- quadratic fit over 1700-2300, same window as Nirayana-Revati ---
ys=np.arange(1700,2300.01,2.0)
T=(ys-2000.0)/100.0
A=np.array([ayan_citra(float(y))[0] for y in ys])
co=np.polyfit(T,A,2)                 # [T^2, T^1, T^0]
res=(np.polyval(co,T)-A)*3600.0
print("\nquadratic fit over 1700-2300")
print("  c = [%.14f, %.14f, %.12f]" % (co[0],co[1],co[2]))
print("  max residual %.3f arcsec, rms %.3f" % (np.max(np.abs(res)), np.sqrt(np.mean(res**2))))
print("  value at J2000: %.6f    at 2026: %.6f" % (np.polyval(co,0.0), np.polyval(co,0.26)))

# --- corroboration against the two published Citra series ---
print("\ncorroboration at 2026 (deg):")
a2026=ayan_citra(2026.0)[0]
print("  this derivation (polar)      %.5f" % a2026)
print("  SS Citra  (Swiss, polar)     %.5f   -> differ %.2f arcmin"
      % (23.0057633059649+1.39688356264479*0.26+0.000306192149240291*0.26**2,
         (a2026-(23.0057633059649+1.39688356264479*0.26+0.000306192149240291*0.26**2))*60))
tc=23.84139+1.3956*0.26
print("  True Citra (ecliptic)        %.5f   -> differ %.2f arcmin" % (tc,(a2026-tc)*60))

# --- and the same star measured the other way, for the note ---
pol,lam,bet,eps=polar_and_ecl(SPICA,tt(2026.0))
print("\nSpica at 2026: polar %.5f, ecliptic %.5f, difference %.2f arcmin (beta %.4f)"
      % (pol,lam,(pol-lam)*60,bet))
