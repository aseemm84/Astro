/* A numerical integration of the Solar System, for Kālasetu's long-span
 * reference beyond JPL DE422's own range (3000 BCE – 3000 CE).
 *
 * WHY. The site's modern engine takes its planets from a truncated VSOP87
 * series. Those series carry terms in powers of time that are only valid within
 * a few millennia of today: by 9000 BCE they move Mars by degrees, and a fit to
 * them fits the artefact. A numerical integration from JPL's own state vectors
 * has no such terms. It is what JPL's ephemerides are, without the asteroids.
 *
 * WHAT. The Sun, Mercury, Venus, the Earth, the Moon, Mars, Jupiter, Saturn,
 * Uranus, Neptune and Pluto as point masses, with DE422's own masses, and the
 * Sun's first post-Newtonian (Schwarzschild) term on every body. The Earth and
 * the Moon are separate bodies: treated as one point at their barycentre, the
 * Sun's differential pull on the pair is lost, and that alone moved the Earth
 * by 1000″ in 6000 years. Barycentric, J2000 equator (ICRF), astronomical units
 * and TDB days. Yoshida's sixth-order symplectic composition of the leapfrog
 * (1990), fixed step, with compensated sums. Starting states come from DE422
 * itself (source/tools/de422.py), so at the seam the two agree exactly.
 *
 * NOT MODELLED. Asteroids, the Earth's and the Sun's figures, tides. The tides
 * matter for the Moon (they move its longitude by tens of degrees over these
 * spans), so this integration's Moon is used only to place the Earth, never as
 * the Moon's reference. Accuracy is measured, not assumed: integrate across
 * DE422's own span and compare (kalasetu-reference.mjs prints it).
 *
 * USE (library): integrate(init, jds, h) → states at the requested TDB Julian
 * days, each { jd, r: {name: [x,y,z]}, v: {name: [vx,vy,vz]} }.
 */
export const BODIES = ["Sun", "Mercury", "Venus", "Earth", "Moon", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

/* Yoshida (1990) sixth order, solution A */
const W1 = -1.17767998417887, W2 = 0.235573213359357, W3 = 0.784513610477560, W0 = 1 - 2 * (W1 + W2 + W3);
const STAGES = [W3, W2, W1, W0, W1, W2, W3];

function accel(x, v, a, GM, c2, tau, EX, t) {
  const n = GM.length;
  a.fill(0);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2];
    const r2 = dx * dx + dy * dy + dz * dz, r3 = r2 * Math.sqrt(r2);
    const fi = GM[j] / r3, fj = GM[i] / r3;
    a[3 * i] += fi * dx; a[3 * i + 1] += fi * dy; a[3 * i + 2] += fi * dz;
    a[3 * j] -= fj * dx; a[3 * j + 1] -= fj * dy; a[3 * j + 2] -= fj * dz;
  }
  /* THE EARTH–MOON PAIR, which a point-mass integration gets badly wrong: with
     only point masses the Moon drifted 55′ from DE422 in a century. Two
     effects are added, both on the Moon relative to the Earth, with the
     reaction on the Earth:
       – the Earth's oblateness, J2, about a pole that precesses uniformly
         round the ecliptic pole of J2000 at 50.29″ a year (checked against
         astronomy-engine's precession to 0.1° over 3000 years; J2's effect
         is a small one, and this is enough for it);
       – the tides: an along-track push that makes the Moon's mean motion
         slow at ṅ (″/cy²), calibrated against DE422 (kalasetu-reference.mjs) */
  if (EX) {
    const iE = 3, iM = 4;
    const rx = x[3 * iM] - x[3 * iE], ry = x[3 * iM + 1] - x[3 * iE + 1], rz = x[3 * iM + 2] - x[3 * iE + 2];
    const r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2);
    const psi = -EX.prec * (t - 2451545), ce = EX.ce, se = EX.se, c = Math.cos(psi), s = Math.sin(psi);
    /* (0,0,1) rotated by psi about the ecliptic pole (0, −sin ε, cos ε) */
    const kx = -se * s, ky = -se * ce * (1 - c), kz = c + ce * ce * (1 - c);
    const z = rx * kx + ry * ky + rz * kz;
    const f = -1.5 * EX.J2 * GM[iE] * EX.Re * EX.Re / (r2 * r2 * r), q = 1 - 5 * z * z / r2;
    let ax = f * (q * rx + 2 * z * kx), ay = f * (q * ry + 2 * z * ky), az = f * (q * rz + 2 * z * kz);
    /* tides: a_t = −ṅ a / 3 along the Moon's velocity about the Earth */
    const vx = v[3 * iM] - v[3 * iE], vy = v[3 * iM + 1] - v[3 * iE + 1], vz = v[3 * iM + 2] - v[3 * iE + 2];
    const vv = Math.sqrt(vx * vx + vy * vy + vz * vz), at = -EX.ndot * r / 3 / vv;
    ax += at * vx; ay += at * vy; az += at * vz;
    /* the J2 term is the Moon's acceleration per the Earth's field; the pull
       is mutual, so the Earth takes −(m_M/m_E) of it */
    const mr = GM[iM] / GM[iE];
    a[3 * iM] += ax; a[3 * iM + 1] += ay; a[3 * iM + 2] += az;
    a[3 * iE] -= mr * ax; a[3 * iE + 1] -= mr * ay; a[3 * iE + 2] -= mr * az;
  }
  /* the Sun's Schwarzschild term (PPN β = γ = 1) on each body. It depends on
     velocity, and a leapfrog kick taken with the velocity at its start is only
     first-order accurate (it cost Mercury 50″ a decade); so it is read at the
     kick's mid-velocity, estimated with the Newtonian part just computed */
  const mu = GM[0], hk = 0.5 * (tau || 0);
  for (let i = 1; i < n; i++) {
    const rx = x[3 * i] - x[0], ry = x[3 * i + 1] - x[1], rz = x[3 * i + 2] - x[2];
    const vx = v[3 * i] - v[0] + hk * (a[3 * i] - a[0]), vy = v[3 * i + 1] - v[1] + hk * (a[3 * i + 1] - a[1]),
          vz = v[3 * i + 2] - v[2] + hk * (a[3 * i + 2] - a[2]);
    const r = Math.sqrt(rx * rx + ry * ry + rz * rz), v2 = vx * vx + vy * vy + vz * vz, rv = rx * vx + ry * vy + rz * vz;
    const f = mu / (c2 * r * r * r), A = 4 * mu / r - v2;
    a[3 * i] += f * (A * rx + 4 * rv * vx); a[3 * i + 1] += f * (A * ry + 4 * rv * vy); a[3 * i + 2] += f * (A * rz + 4 * rv * vz);
  }
}

/* init: { jd, r: {name:[x,y,z]}, v: {name:[...]}, gm: {name: AU³/day²}, c: AU/day }.
   jds: TDB Julian days wanted, either side of init.jd. h: step in days. */
export function integrate(init, jds, h = 0.125, onProgress) {
  const n = BODIES.length, N = 3 * n;
  const GM = BODIES.map(b => init.gm[b]), c2 = init.c * init.c;
  /* the Earth–Moon terms (see accel): J2, radius in AU, ṅ in ″/cy² */
  const EX = init.earth ? { J2: init.earth.J2, Re: init.earth.Re, ce: Math.cos(23.4392911 * Math.PI / 180),
    se: Math.sin(23.4392911 * Math.PI / 180), prec: 50.29 / 3600 * Math.PI / 180 / 365.25,
    ndot: init.earth.ndot / 206264.806 / (36525 * 36525) } : null;
  const out = new Map();
  const run = (want, sign) => {
    if (!want.length) return;
    const x = new Float64Array(N), v = new Float64Array(N), cx = new Float64Array(N), cv = new Float64Array(N);
    BODIES.forEach((b, i) => { for (let k = 0; k < 3; k++) { x[3 * i + k] = init.r[b][k]; v[3 * i + k] = init.v[b][k]; } });
    const a = new Float64Array(N), x0 = new Float64Array(N), v0 = new Float64Array(N);
    const add = (arr, comp, i, d) => { const y = d - comp[i], s = arr[i] + y; comp[i] = (s - arr[i]) - y; arr[i] = s; };
    const dt = sign * h;
    let t = init.jd, wi = 0, steps = 0;
    const total = Math.abs(want[want.length - 1] - init.jd) / h;
    while (wi < want.length) {
      x0.set(x); v0.set(v);
      for (const w of STAGES) {               /* drift ½, kick, drift ½ */
        const tau = w * dt;
        for (let i = 0; i < N; i++) add(x, cx, i, 0.5 * tau * v[i]);
        accel(x, v, a, GM, c2, tau, EX, t);
        for (let i = 0; i < N; i++) add(v, cv, i, tau * a[i]);
        for (let i = 0; i < N; i++) add(x, cx, i, 0.5 * tau * v[i]);
      }
      const t1 = t + dt;
      while (wi < want.length && (sign > 0 ? want[wi] <= t1 : want[wi] >= t1)) {
        /* cubic Hermite on the two end states */
        const s = (want[wi] - t) / dt, s2 = s * s, s3 = s2 * s;
        const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
        const d00 = (6 * s2 - 6 * s) / dt, d10 = 3 * s2 - 4 * s + 1, d01 = (-6 * s2 + 6 * s) / dt, d11 = 3 * s2 - 2 * s;
        const R = {}, V = {};
        BODIES.forEach((b, j) => { R[b] = []; V[b] = []; for (let k = 0; k < 3; k++) { const q = 3 * j + k;
          R[b].push(h00 * x0[q] + h10 * dt * v0[q] + h01 * x[q] + h11 * dt * v[q]);
          V[b].push(d00 * x0[q] + d10 * v0[q] + d01 * x[q] + d11 * v[q]); } });
        out.set(want[wi], { jd: want[wi], r: R, v: V });
        wi++;
      }
      t = t1; steps++;
      if (onProgress && steps % 1000000 === 0) onProgress(steps / total);
    }
  };
  const back = jds.filter(j => j < init.jd).sort((p, q) => q - p), fwd = jds.filter(j => j >= init.jd).sort((p, q) => p - q);
  run(back, -1); run(fwd, +1);
  return jds.map(j => out.get(j));
}

/* the starting state from a DE422 state (de422.py): Earth and Moon split */
export function initFromDE(st, K) {
  const r = {}, v = {};
  for (const b of BODIES) {
    if (b === "Moon") { r.Moon = st.r.Earth.map((x, k) => x + st.r.Moon[k]); v.Moon = st.v.Earth.map((x, k) => x + st.v.Moon[k]); }
    else { r[b] = st.r[b]; v[b] = st.v[b]; }
  }
  const gmE = K.GMB * K.EMRAT / (1 + K.EMRAT), gmM = K.GMB / (1 + K.EMRAT);
  return { jd: st.jd, r, v, c: K.CLIGHT * 86400 / K.AU,
           /* DE422's J2 and radius (constants J2E, AE) and the tidal ṅ the
              site's ΔT tables assume; ndot is recalibrated by the caller */
           earth: { J2: K.J2E || 0.00108262545, Re: (K.AE || 6378.137) / K.AU, ndot: -25.858 },
           gm: { Sun: K.GMS, Mercury: K.GM1, Venus: K.GM2, Earth: gmE, Moon: gmM, Mars: K.GM4, Jupiter: K.GM5,
                 Saturn: K.GM6, Uranus: K.GM7, Neptune: K.GM8, Pluto: K.GM9 } };
}
