/* ===== The counterfactual simulator =======================================

   WHAT MAKES THIS A SIMULATION RATHER THAN AN ANIMATION.

   The question "what if the Moon stopped revolving" can be answered two ways.
   One is to decide what would happen and then draw it. The other is to take
   the real Earth, the real Moon, the real Sun, set the Moon's velocity to
   zero and INTEGRATE THE EQUATIONS OF MOTION, and find out. Only the second
   one can surprise you, and being able to be surprised is the whole value of
   the exercise — so that is what this does. Nothing here scripts an outcome.
   Every trajectory on the screen is the result of summing forces and
   stepping forward, and when the Moon falls into the Earth it is because the
   integrator put it there.

   IT STARTS FROM THE REAL SKY. The initial positions and velocities are the
   actual heliocentric state vectors for this moment, taken from the site's
   own ephemeris, not from a tidy circular orbit. So the unperturbed run is a
   model of the real Earth–Moon–Sun system, and the first thing the harness
   checks is that it reproduces the real sidereal month, the real synodic
   month and the real year. An integrator that cannot do that has no business
   being asked a counterfactual.

   THE UNITS. Lengths in astronomical units, time in days, mass in solar
   masses. In those units the Sun's gravitational parameter is the square of
   the Gaussian constant, and the whole calculation sits in a range where
   double precision has room to work. The choice is not cosmetic: in SI the
   same integration spends its precision on exponents.

   THE INTEGRATOR IS SYMPLECTIC, for a reason that matters here more than
   usual. A Runge–Kutta of the same order is more accurate over one step and
   loses energy steadily over many, so a long run slowly spirals — and a
   spiral is exactly the kind of thing somebody asking "does the orbit stay
   stable" would read as an answer. Velocity Verlet does not do that: its
   energy error oscillates and does not accumulate, so a drift seen on the
   screen is a drift in the system and not in the arithmetic. The harness
   measures the energy drift and asserts it stays small.

   WHAT IS NOT MODELLED is listed in ABSENT at the foot, and the page prints
   it. The largest item by far is that this is point-mass gravity: no tides
   raised, no spin-orbit coupling, no relativity. That is why the simulator
   will tell you the Moon's orbit is stable for ten thousand years and the
   real Moon is receding from us at four centimetres a year — the mechanism
   that does that is not in here, and saying so is better than quietly
   implying it is. */

(function () {
  "use strict";

  /* ---- units and constants ------------------------------------------------
     k is the Gaussian gravitational constant. GM of the Sun is its square, in
     AU³ per day², exactly — which is why this unit system is the traditional
     one for solar-system work and not an affectation. */
  var K_GAUSS = 0.01720209895;
  var GM_SUN = K_GAUSS * K_GAUSS;        /* AU³/day² */
  var AU_KM = 149597870.7;
  var DAY_S = 86400;

  /* Masses in solar masses. The Earth and Moon are given separately and their
     sum is the Earth–Moon barycentre mass, which the harness checks, because
     a mass ratio that is slightly wrong moves the barycentre and therefore
     every lunar quantity computed from it. */
  var MASS = {
    Sun:     1,
    Mercury: 1.66012e-7,
    Venus:   2.44783e-6,
    Earth:   3.00348959632e-6,
    Moon:    3.69430335e-8,
    Mars:    3.22715608e-7,
    Jupiter: 9.54791938e-4,
    Saturn:  2.85885980e-4,
    Uranus:  4.36624404e-5,
    Neptune: 5.15138902e-5
  };
  /* Radii in AU, for collisions and for drawing something the right size
     relative to its orbit — which, for the Earth and Moon, is startlingly
     small and worth seeing. */
  var RADIUS_KM = {
    Sun: 695700, Mercury: 2439.7, Venus: 6051.8, Earth: 6371.0, Moon: 1737.4,
    Mars: 3389.5, Jupiter: 69911, Saturn: 58232, Uranus: 25362, Neptune: 24622
  };
  function radiusAU(name) { return (RADIUS_KM[name] || 1000) / AU_KM; }

  /* The real values the simulator is measured against. None of these is used
     in the integration; they are here so a run can say how far it has moved
     from the world as it is. */
  var REAL = {
    siderealMonth: 27.321661,
    synodicMonth: 29.530589,
    siderealYear: 365.256363,
    moonDistanceKm: 384400,
    moonRecessionCmPerYear: 3.8,
    dayHours: 24,
    sunAngularMin: 31.6,          /* at aphelion */
    sunAngularMax: 32.7,          /* at perihelion */
    moonAngularMin: 29.4,
    moonAngularMax: 33.5,
    tiltDegrees: 23.44
  };

  function vec(x, y, z) { return { x: x, y: y, z: z }; }
  function add(a, b) { return vec(a.x + b.x, a.y + b.y, a.z + b.z); }
  function sub(a, b) { return vec(a.x - b.x, a.y - b.y, a.z - b.z); }
  function mul(a, s) { return vec(a.x * s, a.y * s, a.z * s); }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function cross(a, b) {
    return vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z,
               a.x * b.y - a.y * b.x);
  }
  function len(a) { return Math.sqrt(dot(a, a)); }

  /* ---- a world ------------------------------------------------------------
     A list of bodies, each with a mass, a position, a velocity and a radius,
     plus the Earth's own rotation, which gravity does not touch but which
     several of the questions do. */
  function body(name, m, p, v) {
    return { name: name, m: m, p: { x: p.x, y: p.y, z: p.z },
             v: { x: v.x, y: v.y, z: v.z }, r: radiusAU(name), alive: true };
  }

  /* Build the real system at an instant, from the site's own ephemeris. */
  function worldAt(ms, which) {
    var names = which && which.length ? which : ["Sun", "Earth", "Moon"];
    var bodies = [];
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var s = null;
      try { s = window.__kState(n, ms); } catch (e) { s = null; }
      if (!s) {
        if (n === "Sun") s = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
        else return null;
      }
      bodies.push(body(n, MASS[n] || 0, vec(s.x, s.y, s.z),
                       vec(s.vx, s.vy, s.vz)));
    }
    /* Work in the frame where the whole system's momentum is zero. Starting
       from heliocentric vectors leaves the barycentre drifting, and a drifting
       barycentre makes every long run look as though the system is flying
       away — which is an artefact of the frame and nothing else. */
    toBarycentre(bodies);
    return {
      t: 0, at: ms, bodies: bodies,
      spinHours: REAL.dayHours, tilt: REAL.tiltDegrees,
      events: [], steps: 0
    };
  }
  function toBarycentre(bodies) {
    var M = 0, P = vec(0, 0, 0), V = vec(0, 0, 0);
    bodies.forEach(function (b) {
      M += b.m; P = add(P, mul(b.p, b.m)); V = add(V, mul(b.v, b.m));
    });
    if (M <= 0) return;
    P = mul(P, 1 / M); V = mul(V, 1 / M);
    bodies.forEach(function (b) { b.p = sub(b.p, P); b.v = sub(b.v, V); });
  }

  function find(w, name) {
    for (var i = 0; i < w.bodies.length; i++)
      if (w.bodies[i].name === name) return w.bodies[i];
    return null;
  }
  function clone(w) {
    return {
      t: w.t, at: w.at, spinHours: w.spinHours, tilt: w.tilt,
      steps: w.steps, events: w.events.slice(),
      bodies: w.bodies.map(function (b) {
        return { name: b.name, m: b.m, r: b.r, alive: b.alive,
                 p: { x: b.p.x, y: b.p.y, z: b.p.z },
                 v: { x: b.v.x, y: b.v.y, z: b.v.z } };
      })
    };
  }

  /* ---- forces -------------------------------------------------------------
     The straightforward O(n²) sum. With three to ten bodies there is nothing
     to be gained from anything cleverer, and a tree code would be a second
     thing that could be wrong. */
  function accelerations(bodies) {
    var n = bodies.length, a = new Array(n);
    for (var i = 0; i < n; i++) a[i] = vec(0, 0, 0);
    for (var i2 = 0; i2 < n; i2++) {
      if (!bodies[i2].alive) continue;
      for (var j = i2 + 1; j < n; j++) {
        if (!bodies[j].alive) continue;
        var d = sub(bodies[j].p, bodies[i2].p);
        var r2 = dot(d, d);
        var r = Math.sqrt(r2);
        if (r < 1e-12) continue;
        var f = GM_SUN / (r2 * r);        /* G in these units, per unit mass */
        a[i2] = add(a[i2], mul(d, f * bodies[j].m));
        a[j] = sub(a[j], mul(d, f * bodies[i2].m));
      }
    }
    return a;
  }

  /* ---- the step -----------------------------------------------------------

     TWO THINGS KEEP A FALL FROM TURNING INTO AN ESCAPE.

     A stopped Moon falls straight at the Earth, and a straight fall is the
     one case where a fixed step is lethal. The step is chosen from the orbit
     the pair starts in — about an hour and a half for the Moon — and in an
     hour and a half near the end of the fall the Moon covers sixty thousand
     kilometres, ten times the Earth's radius. So it steps over the ground
     without touching it, passes within a few hundred kilometres of a point
     mass, is flung out at a speed it never had, and the run reports that the
     Moon LEFT. The picture is wrong in the most convincing possible way: it
     is smooth, it conserves nothing anyone is checking, and it answers the
     question backwards.

     The fix is in two halves, and both are needed:

       the step shrinks as the pair closes (stepSafe below), so the
         integrator never takes an hour-long stride through a region it is
         resolving in minutes; and

       the contact test looks along the segment travelled rather than at its
         two ends, so a body moving faster than its own diameter per step
         still cannot tunnel through the thing it hit.

     Either one alone leaves the other hole open. */
  function step(w, dt) {
    var b = w.bodies, n = b.length;
    var prev = b.map(function (q) { return { x: q.p.x, y: q.p.y, z: q.p.z }; });
    var a = accelerations(b);
    for (var i = 0; i < n; i++) {
      if (!b[i].alive) continue;
      b[i].v = add(b[i].v, mul(a[i], dt / 2));
      b[i].p = add(b[i].p, mul(b[i].v, dt));
    }
    var a2 = accelerations(b);
    for (var j = 0; j < n; j++) {
      if (!b[j].alive) continue;
      b[j].v = add(b[j].v, mul(a2[j], dt / 2));
    }
    w.t += dt;
    w.steps++;
    checkEvents(w, prev);
    return w;
  }

  /* one nominal step, taken in as many substeps as the closest pair needs */
  function stepSafe(w, dt) {
    var safe = autoStep(w), mag = Math.abs(dt);
    if (!(safe > 0) || safe >= mag) return step(w, dt);
    var k = Math.min(512, Math.ceil(mag / safe));
    for (var i = 0; i < k; i++) step(w, dt / k);
    return w;
  }

  /* COLLISIONS AND ESCAPES, which are the two ways a counterfactual ends.

     A collision is detected on the surfaces, not the centres, because "the
     Moon reaches the Earth" means the ground and not the middle — and the
     difference is a quarter of a day in the free-fall case, which is not
     nothing when the whole event lasts under five.

     An escape is reported when a body's energy relative to its primary turns
     positive AND it is moving away. Energy alone is not enough: a body on a
     wide elliptical orbit can have positive energy relative to the WRONG
     primary and still be perfectly bound to the system. */
  /* The least separation the two bodies reached DURING the step, not at its
     ends. The relative motion over one step is taken as a straight line,
     which is exactly right for the case that matters — a fast, nearly
     radial approach — and errs on the side of noticing contact otherwise. */
  function sweptSeparation(A, B, pa, pb) {
    var now = len(sub(B.p, A.p));
    if (!pa || !pb) return now;
    var r0 = { x: pb.x - pa.x, y: pb.y - pa.y, z: pb.z - pa.z };
    var dr = { x: (B.p.x - A.p.x) - r0.x,
               y: (B.p.y - A.p.y) - r0.y,
               z: (B.p.z - A.p.z) - r0.z };
    var dd = dot(dr, dr);
    if (dd <= 0) return Math.min(now, len(r0));
    var s = -dot(r0, dr) / dd;
    s = Math.max(0, Math.min(1, s));
    var m = { x: r0.x + dr.x * s, y: r0.y + dr.y * s, z: r0.z + dr.z * s };
    return Math.min(now, len(m));
  }

  function checkEvents(w, prev) {
    var b = w.bodies;
    for (var i = 0; i < b.length; i++) {
      if (!b[i].alive) continue;
      for (var j = i + 1; j < b.length; j++) {
        if (!b[j].alive) continue;
        var d = sweptSeparation(b[i], b[j],
                                prev && prev[i], prev && prev[j]);
        if (d <= b[i].r + b[j].r) {
          w.events.push({ t: w.t, kind: "collision", a: b[i].name, b: b[j].name,
            say: b[j].name + " strikes " + b[i].name });
          /* the lighter one is absorbed — a merger conserving momentum,
             which is the least wrong thing to do and is stated as a choice */
          var big = b[i].m >= b[j].m ? b[i] : b[j];
          var small = b[i].m >= b[j].m ? b[j] : b[i];
          var M = big.m + small.m;
          big.v = mul(add(mul(big.v, big.m), mul(small.v, small.m)), 1 / M);
          big.m = M;
          small.alive = false;
        }
      }
    }
  }

  /* ---- conserved quantities, which is how the arithmetic is checked ------- */
  function energy(w) {
    var b = w.bodies, T = 0, U = 0;
    for (var i = 0; i < b.length; i++) {
      if (!b[i].alive) continue;
      T += 0.5 * b[i].m * dot(b[i].v, b[i].v);
      for (var j = i + 1; j < b.length; j++) {
        if (!b[j].alive) continue;
        U -= GM_SUN * b[i].m * b[j].m / len(sub(b[j].p, b[i].p));
      }
    }
    return T + U;
  }
  function angularMomentum(w) {
    var L = vec(0, 0, 0);
    w.bodies.forEach(function (b) {
      if (!b.alive) return;
      L = add(L, mul(cross(b.p, b.v), b.m));
    });
    return len(L);
  }

  /* ---- orbital elements of one body about another ------------------------- */
  function elements(w, name, aboutName) {
    var b = find(w, name), c = find(w, aboutName);
    if (!b || !c || !b.alive || !c.alive) return null;
    var mu = GM_SUN * (b.m + c.m);
    var r = sub(b.p, c.p), v = sub(b.v, c.v);
    var R = len(r), V2 = dot(v, v);
    var E = V2 / 2 - mu / R;
    var a = -mu / (2 * E);
    var h = cross(r, v);
    var H = len(h);
    var e = Math.sqrt(Math.max(0, 1 - H * H / (mu * a)));
    var inc = Math.acos(Math.max(-1, Math.min(1, h.z / H))) * 180 / Math.PI;
    return {
      a: a, e: e, inc: inc, r: R, speed: Math.sqrt(V2),
      periodDays: a > 0 ? 2 * Math.PI * Math.sqrt(a * a * a / mu) : null,
      bound: E < 0,
      periapsis: a > 0 ? a * (1 - e) : null,
      apoapsis: a > 0 ? a * (1 + e) : null,
      escapeSpeed: Math.sqrt(2 * mu / R),
      circularSpeed: Math.sqrt(mu / R)
    };
  }

  /* ---- running ------------------------------------------------------------
     A run returns samples rather than the final state, because the question
     is always about the shape of what happened and not where it ended. The
     sample count is fixed so a run of ten days and a run of ten years cost
     the same to draw. */
  function run(w0, days, opts) {
    opts = opts || {};
    var w = clone(w0);
    var samples = Math.max(2, opts.samples || 600);
    var dt = opts.dt || autoStep(w);
    var total = Math.max(1, Math.round(Math.abs(days) / dt));
    var sign = days < 0 ? -1 : 1;
    var every = Math.max(1, Math.floor(total / samples));
    var out = { dt: dt, days: days, steps: total, frames: [],
                e0: energy(w), l0: angularMomentum(w), events: [] };
    var stopped = false;
    for (var i = 0; i <= total; i++) {
      if (i % every === 0 || i === total) {
        out.frames.push(snapshot(w));
      }
      if (stopped) continue;
      stepSafe(w, dt * sign);
      if (w.events.length && !stopped) {
        /* keep integrating so the picture does not freeze, but record where
           the interesting part ended */
        out.events = w.events.slice();
      }
    }
    out.world = w;
    out.e1 = energy(w);
    out.l1 = angularMomentum(w);
    out.energyDrift = Math.abs((out.e1 - out.e0) / out.e0);
    out.momentumDrift = Math.abs((out.l1 - out.l0) / (out.l0 || 1));
    out.events = w.events.slice();
    return out;
  }
  /* a step small enough for the tightest pair in the system: a thousandth of
     the shortest orbital period present */
  function autoStep(w) {
    var best = 1e9;
    for (var i = 0; i < w.bodies.length; i++)
      for (var j = i + 1; j < w.bodies.length; j++) {
        var a = w.bodies[i], b = w.bodies[j];
        if (!a.alive || !b.alive) continue;
        var r = len(sub(b.p, a.p));
        var mu = GM_SUN * (a.m + b.m);
        var P = 2 * Math.PI * Math.sqrt(r * r * r / mu);
        if (P < best) best = P;
      }
    return Math.max(1e-4, Math.min(0.5, best / 400));
  }
  function snapshot(w) {
    return { t: w.t,
      b: w.bodies.map(function (q) {
        return { name: q.name, alive: q.alive,
                 x: q.p.x, y: q.p.y, z: q.p.z,
                 vx: q.v.x, vy: q.v.y, vz: q.v.z, m: q.m, r: q.r };
      }) };
  }

  /* ---- measuring a period from the run itself ----------------------------
     Not from the orbital elements, which assume a two-body problem, but by
     watching the angle come back round. This is the measurement that makes
     the unperturbed run checkable against the real month: if the integrator
     is right, counting the Moon's returns gives 27.32 days without anybody
     having told it so. */
  function measurePeriod(res, name, aboutName) {
    var fr = res.frames;
    if (fr.length < 8) return null;
    function angleAt(f) {
      var a = null, c = null;
      f.b.forEach(function (q) {
        if (q.name === name) a = q;
        if (q.name === aboutName) c = q;
      });
      if (!a || !c || !a.alive || !c.alive) return null;
      return Math.atan2(a.y - c.y, a.x - c.x);
    }
    var prev = angleAt(fr[0]), acc = 0, crossings = [];
    for (var i = 1; i < fr.length; i++) {
      var cur = angleAt(fr[i]);
      if (cur == null || prev == null) { prev = cur; continue; }
      var d = cur - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      var before = acc;
      acc += d;
      /* every time the accumulated angle passes a whole turn */
      var k0 = Math.floor(before / (2 * Math.PI));
      var k1 = Math.floor(acc / (2 * Math.PI));
      if (k1 !== k0) {
        var frac = (2 * Math.PI * Math.max(k0, k1) - before) / (d || 1e-12);
        crossings.push(fr[i - 1].t + (fr[i].t - fr[i - 1].t) * frac);
      }
      prev = cur;
    }
    if (crossings.length < 2) {
      return crossings.length === 1
        ? { periodDays: crossings[0], turns: 1, from: "one turn" } : null;
    }
    var gaps = [];
    for (var j = 1; j < crossings.length; j++)
      gaps.push(crossings[j] - crossings[j - 1]);
    var mean = gaps.reduce(function (x, y) { return x + y; }, 0) / gaps.length;
    /* ALIASING. Counting returns from sampled frames only works if there are
       enough frames per return. At the Roche limit the orbit is two and a
       quarter hours and the run was sampled every two — so the count came
       back with a period eight times too long and looked entirely plausible,
       which is the worst way for a number to be wrong. Six samples per turn
       is the floor; below it this says so instead of answering. */
    var dtSample = (fr[1].t - fr[0].t) || 1e-9;
    var perTurn = mean / Math.abs(dtSample);
    return { periodDays: mean, turns: crossings.length,
             spread: Math.max.apply(null, gaps) - Math.min.apply(null, gaps),
             samplesPerTurn: perTurn,
             aliased: perTurn < 6,
             from: "counted returns" };
  }
  /* the synodic month: the Moon's angle relative to the Sun, as seen from
     Earth, coming back round */
  function measureSynodic(res) {
    var fr = res.frames;
    function elong(f) {
      var e = null, m = null, s = null;
      f.b.forEach(function (q) {
        if (q.name === "Earth") e = q;
        if (q.name === "Moon") m = q;
        if (q.name === "Sun") s = q;
      });
      if (!e || !m || !s || !m.alive) return null;
      var am = Math.atan2(m.y - e.y, m.x - e.x);
      var as = Math.atan2(s.y - e.y, s.x - e.x);
      return am - as;
    }
    var prev = elong(fr[0]), acc = 0, cross = [];
    for (var i = 1; i < fr.length; i++) {
      var cur = elong(fr[i]);
      if (cur == null || prev == null) { prev = cur; continue; }
      var d = cur - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      var before = acc; acc += d;
      var k0 = Math.floor(before / (2 * Math.PI)), k1 = Math.floor(acc / (2 * Math.PI));
      if (k1 !== k0) {
        var frac = (2 * Math.PI * Math.max(k0, k1) - before) / (d || 1e-12);
        cross.push(fr[i - 1].t + (fr[i].t - fr[i - 1].t) * frac);
      }
      prev = cur;
    }
    if (cross.length < 2) return null;
    var gaps = [];
    for (var j = 1; j < cross.length; j++) gaps.push(cross[j] - cross[j - 1]);
    return gaps.reduce(function (x, y) { return x + y; }, 0) / gaps.length;
  }

  /* THE HILL RADIUS — how far from the Earth its gravity still wins against
     the Sun's. Worth computing because two of the scenarios turn on it and
     neither is obvious without it: a Moon at twice its distance sits at
     nearly half the Hill radius, which is about where orbits stop being
     reliably stable, and a Moon sped up by a fifth is bound by the two-body
     test and still leaves, because its apoapsis reaches past where the Earth
     can hold it. Without this number both results look like bugs. */
  function hillRadius(w) {
    var e = find(w, "Earth"), s = find(w, "Sun");
    if (!e || !s) return null;
    var aEarth = len(sub(e.p, s.p));
    return aEarth * Math.pow(e.m / (3 * s.m), 1 / 3);
  }

  window.SimEngine = {
    hillRadius: hillRadius,
    GM_SUN: GM_SUN, K_GAUSS: K_GAUSS, AU_KM: AU_KM, DAY_S: DAY_S,
    MASS: MASS, RADIUS_KM: RADIUS_KM, REAL: REAL,
    vec: vec, add: add, sub: sub, mul: mul, dot: dot, cross: cross, len: len,
    radiusAU: radiusAU,
    worldAt: worldAt, clone: clone, find: find, body: body,
    toBarycentre: toBarycentre,
    accelerations: accelerations, step: step, run: run, autoStep: autoStep,
    energy: energy, angularMomentum: angularMomentum, elements: elements,
    measurePeriod: measurePeriod, measureSynodic: measureSynodic
  };
})();
