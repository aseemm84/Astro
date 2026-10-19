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

/* ===== Counterfactuals, and what follows from them ========================

   A SCENARIO IS A PERTURBATION, NOT A STORY. Each one here is a function that
   reaches into the world and changes something — a position, a velocity, a
   mass — and then hands it back to the integrator. What happens next is not
   written down anywhere in this file. That is the point: if "the Moon stops
   revolving" ended with the Moon falling because somebody wrote that it
   falls, the simulation would be a cartoon. It falls because the integrator
   puts it there, in four and a half days, and the harness checks that figure
   against the free-fall time you can work out with a pencil.

   THE SIMULATOR KNOWS ITS OWN RESOLUTION, which matters more here than in
   most places. Asked what happens if the Moon moves an inch away, the honest
   answer is that the change is far below anything this or any simulation
   could show — the sidereal month lengthens by about a fifth of a
   millisecond, and the integrator's own error on the unperturbed run is eight
   minutes. A tool that drew a confident little animation of that would be
   lying. So every scenario carries an analytic prediction as well, the
   measured result is compared against the noise floor, and when the change is
   below it the page says so and gives the arithmetic instead. Being told
   "this is too small for me to show you, and here is how small" is a better
   answer than a picture.

   WHAT MAKES THIS BELONG ON THIS SITE. The physical consequences — tides,
   month lengths, whether total eclipses remain possible — are the same ones
   any orrery would report. The ones that matter here are what each change
   does to the system the rest of the site teaches: the tithi is a thirtieth
   of a synodic month, the nakṣatra transit is a twenty-seventh of a sidereal
   month, Rāhu and Ketu ARE the nodes of the lunar orbit, and Viṃśottarī is
   started from the Moon's nakṣatra. Change the orbit and those change with
   it, in ways that can be computed rather than guessed. Stop the Moon
   altogether and most of them cease to exist, which is a thing worth seeing
   stated plainly. */

(function () {
  "use strict";

  var E = null;
  function eng() { return E || (E = window.SimEngine); }
  var AU_KM = 149597870.7;

  function moonAndEarth(w) {
    var S = eng();
    return { m: S.find(w, "Moon"), e: S.find(w, "Earth"), S: S };
  }
  /* scale the Moon's distance from the Earth, keeping the orbit circularised
     or not as asked — the velocity is scaled so the orbit stays an orbit
     rather than becoming a fall or a launch */
  function scaleDistance(w, factor, keepCircular) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var r = S.sub(q.m.p, q.e.p), v = S.sub(q.m.v, q.e.v);
    var R = S.len(r);
    var newR = R * factor;
    q.m.p = S.add(q.e.p, S.mul(r, factor));
    var mu = S.GM_SUN * (q.m.m + q.e.m);
    if (keepCircular) {
      /* a circular orbit in the same plane: the velocity perpendicular to the
         radius, in the direction it was already going */
      var h = S.cross(r, v);
      var dir = S.cross(h, S.mul(r, factor));
      var d = S.len(dir);
      q.m.v = S.add(q.e.v, S.mul(dir, Math.sqrt(mu / newR) / (d || 1)));
    } else {
      /* keep the same shape of orbit, scaled: speeds go as 1/√a */
      q.m.v = S.add(q.e.v, S.mul(v, 1 / Math.sqrt(factor)));
    }
  }
  function addDistanceKm(w, km) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var r = S.sub(q.m.p, q.e.p);
    var R = S.len(r);
    scaleDistance(w, (R + km / AU_KM) / R, false);
  }
  function scaleSpeed(w, factor) {
    var q = moonAndEarth(w), S = q.S;
    if (!q.m || !q.e) return;
    var v = S.sub(q.m.v, q.e.v);
    q.m.v = S.add(q.e.v, S.mul(v, factor));
  }

  /* ---- the library -------------------------------------------------------- */
  var SCENARIOS = [
    { id: "none", group: "Reference", label: "Leave everything alone",
      question: "The world as it is — the reference every other run is " +
                "measured against.",
      days: 400, apply: function () {} },

    /* --- the small ones, which are the interesting ones --- */
    { id: "inch", group: "Move the Moon", label: "An inch further away",
      question: "What happens if the Moon moves an inch away?",
      days: 400, subNoise: true,
      apply: function (w) { addDistanceKm(w, 0.0000254); },
      analytic: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        var dr = 0.0000254 / (el.a * AU_KM);
        return {
          lead: "Nothing you could ever measure, and that is the answer.",
          rows: [
            ["The Moon moves", "2.54 cm, out of " +
              Math.round(el.a * AU_KM).toLocaleString("en") + " km"],
            ["A fractional change of", dr.toExponential(2)],
            ["The sidereal month lengthens by",
              (1.5 * dr * S.REAL.siderealMonth * 86400 * 1000).toFixed(3) +
              " milliseconds"],
            ["Tides weaken by", (3 * dr * 100).toExponential(2) + " per cent"],
            ["The Moon's apparent width shrinks by",
              (dr * 31 * 60 * 1000).toExponential(2) + " milliarcseconds"],
            ["The Moon does this to itself every",
              (2.54 / S.REAL.moonRecessionCmPerYear * 12).toFixed(1) + " months, " +
              "receding at " + S.REAL.moonRecessionCmPerYear + " cm a year"]
          ],
          moral: "The question is a good one and the answer is a number. An " +
                 "inch is about eight months of the recession that is " +
                 "happening anyway — so whatever an inch does, it has already " +
                 "happened many times since you were born, and nothing in any " +
                 "almanac noticed."
        };
      } },

    { id: "metre", group: "Move the Moon", label: "A metre further away",
      question: "And a metre?", days: 400, subNoise: true,
      apply: function (w) { addDistanceKm(w, 0.001); },
      analytic: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        var dr = 0.001 / (el.a * AU_KM);
        return { lead: "Still below anything observable.",
          rows: [
            ["The sidereal month lengthens by",
              (1.5 * dr * S.REAL.siderealMonth * 86400 * 1000).toFixed(2) +
              " milliseconds"],
            ["Which the recession covers in",
              (100 / S.REAL.moonRecessionCmPerYear).toFixed(0) + " years"]
          ],
          moral: "A metre is twenty-six years of natural recession. The month " +
                 "is a hundredth of a second longer." };
      } },

    { id: "km1000", group: "Move the Moon", label: "A thousand km further",
      question: "A thousand kilometres — a quarter of a per cent.",
      days: 400,
      apply: function (w) { addDistanceKm(w, 1000); } },

    { id: "pct10", group: "Move the Moon", label: "Ten per cent further",
      question: "Ten per cent further out.", days: 500,
      apply: function (w) { scaleDistance(w, 1.10, false); } },

    { id: "double", group: "Move the Moon", label: "Twice as far",
      question: "What if the Moon were twice as far away?", days: 900,
      apply: function (w) { scaleDistance(w, 2, true); } },

    { id: "half", group: "Move the Moon", label: "Half as far",
      question: "And half as far?", days: 300,
      apply: function (w) { scaleDistance(w, 0.5, true); } },

    { id: "roche", group: "Move the Moon", label: "At the Roche limit",
      question: "As close as a body held together by its own gravity can " +
                "come before it is pulled apart.",
      days: 60,
      apply: function (w) {
        var S = eng(), el = S.elements(w, "Moon", "Earth");
        /* the fluid Roche limit: the Earth's radius times the cube root of
           twice the density ratio */
        var rhoE = 5.514, rhoM = 3.344;
        var d = 6371 * Math.pow(2 * rhoE / rhoM, 1 / 3);
        scaleDistance(w, d / (el.a * AU_KM), true);
      },
      note: "The simulator treats both bodies as points, so the Moon does not " +
            "come apart here — it orbits serenely at a distance where a real " +
            "Moon would be torn into a ring. That is a limit of the model and " +
            "is stated rather than hidden." },

    /* --- the velocity ones --- */
    { id: "stop", group: "Stop or speed the Moon",
      label: "The Moon stops revolving",
      question: "What happens if the Moon stops revolving?",
      days: 8,
      apply: function (w) { scaleSpeed(w, 0); } },

    { id: "slow", group: "Stop or speed the Moon", label: "Slowed to seven tenths",
      question: "Slowed, but not stopped.", days: 60,
      apply: function (w) { scaleSpeed(w, 0.7); } },

    { id: "fast", group: "Stop or speed the Moon", label: "A fifth faster",
      question: "Sped up by a fifth.", days: 400,
      apply: function (w) { scaleSpeed(w, 1.2); } },

    { id: "escape", group: "Stop or speed the Moon", label: "Past escape speed",
      question: "What if the Moon were moving just fast enough to leave?",
      days: 1200,
      apply: function (w) { scaleSpeed(w, 1.45); } },

    { id: "retrograde", group: "Stop or speed the Moon",
      label: "The Moon goes the other way",
      question: "What if the Moon orbited backwards?", days: 400,
      apply: function (w) { scaleSpeed(w, -1); } },

    /* --- remove and change --- */
    { id: "remove", group: "Change what is there", label: "No Moon at all",
      question: "What if there were no Moon?", days: 500,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.alive = false;
      } },

    { id: "massx2", group: "Change what is there", label: "A Moon twice as heavy",
      question: "Twice the mass, same orbit.", days: 400,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.m *= 2;
      } },

    { id: "massx10", group: "Change what is there", label: "A Moon ten times as heavy",
      question: "Ten times the mass — a third of a per cent of the Earth.",
      days: 400,
      apply: function (w) {
        var S = eng(), m = S.find(w, "Moon");
        if (m) m.m *= 10;
      } },

    { id: "incline", group: "Change what is there",
      label: "The lunar orbit tilted to 30°",
      question: "What if the Moon's orbit were tilted much further from the " +
                "ecliptic?", days: 500,
      apply: function (w) {
        var S = eng(), q = moonAndEarth(w);
        if (!q.m || !q.e) return;
        /* rotate the relative position and velocity about the line of nodes */
        var r = S.sub(q.m.p, q.e.p), v = S.sub(q.m.v, q.e.v);
        var extra = (30 - 5.14) * Math.PI / 180;
        var c = Math.cos(extra), s = Math.sin(extra);
        function rot(a) { return S.vec(a.x, a.y * c - a.z * s, a.y * s + a.z * c); }
        q.m.p = S.add(q.e.p, rot(r));
        q.m.v = S.add(q.e.v, rot(v));
      } },

    { id: "circular", group: "Change what is there",
      label: "A perfectly circular lunar orbit",
      question: "What if the Moon's orbit had no eccentricity at all?",
      days: 400,
      apply: function (w) { scaleDistance(w, 1, true); } },

    /* --- the Earth itself --- */
    { id: "earthstop", group: "The Earth", label: "The Earth stops turning",
      question: "What if the Earth stopped spinning?", days: 400,
      gravitational: false,
      apply: function (w) { w.spinHours = Infinity; } },

    { id: "earthfast", group: "The Earth", label: "A six-hour day",
      question: "What if the Earth turned four times as fast?", days: 400,
      gravitational: false,
      apply: function (w) { w.spinHours = 6; } },

    { id: "tilt0", group: "The Earth", label: "No axial tilt",
      question: "What if the Earth's axis were upright?", days: 400,
      gravitational: false,
      apply: function (w) { w.tilt = 0; } },

    { id: "tilt45", group: "The Earth", label: "A tilt of 45°",
      question: "What if the Earth leaned much further?", days: 400,
      gravitational: false,
      apply: function (w) { w.tilt = 45; } },

    { id: "tilt90", group: "The Earth", label: "Lying on its side",
      question: "What if the Earth rolled along its orbit like Uranus?",
      days: 400, gravitational: false,
      apply: function (w) { w.tilt = 90; } },

    /* --- the Sun and the rest --- */
    { id: "sunheavy", group: "The rest of the system",
      label: "A Sun a tenth heavier",
      question: "What if the Sun had ten per cent more mass?", days: 500,
      apply: function (w) {
        var S = eng(), s = S.find(w, "Sun");
        if (s) s.m *= 1.1;
      } },
    { id: "sunlight", group: "The rest of the system",
      label: "A Sun a tenth lighter",
      question: "And ten per cent less?", days: 500,
      apply: function (w) {
        var S = eng(), s = S.find(w, "Sun");
        if (s) s.m *= 0.9;
      } },
    { id: "nojupiter", group: "The rest of the system", label: "No Jupiter",
      question: "What if Jupiter were not there?", days: 800,
      needs: ["Sun", "Earth", "Moon", "Jupiter", "Venus", "Mars", "Saturn"],
      apply: function (w) {
        var S = eng(), j = S.find(w, "Jupiter");
        if (j) j.alive = false;
      } },
    { id: "jupiterclose", group: "The rest of the system",
      label: "Jupiter at half its distance",
      question: "What if Jupiter were twice as close?", days: 800,
      needs: ["Sun", "Earth", "Moon", "Jupiter", "Venus", "Mars", "Saturn"],
      apply: function (w) {
        var S = eng(), j = S.find(w, "Jupiter"), s = S.find(w, "Sun");
        if (!j || !s) return;
        var r = S.sub(j.p, s.p), v = S.sub(j.v, s.v);
        j.p = S.add(s.p, S.mul(r, 0.5));
        j.v = S.add(s.v, S.mul(v, Math.sqrt(2)));
      } }
  ];

  function byId(id) {
    for (var i = 0; i < SCENARIOS.length; i++)
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    return null;
  }

  /* ---- what follows ------------------------------------------------------- */

  /* The tide a body raises goes as its mass over the cube of its distance.
     Reported as a ratio to the tide now, because nobody has an intuition for
     the absolute figure and everybody has one for "half". */
  function tideRatio(aNew, mNew, aOld, mOld) {
    if (!aNew || !aOld) return null;
    return (mNew / mOld) * Math.pow(aOld / aNew, 3);
  }
  /* Angular width in minutes of arc, from a diameter in km and a distance. */
  function angularMin(diamKm, distKm) {
    return 2 * Math.atan2(diamKm / 2, distKm) * 180 / Math.PI * 60;
  }

  function consequences(res, w0, scenario, baseline, mres, wPerturbed) {
    var S = eng();
    var src = mres || res;
    var out = { id: scenario.id, label: scenario.label,
                question: scenario.question, rows: [], jyotisha: [],
                flags: {}, events: res.events.slice() };

    /* TWO SETS OF ELEMENTS, FOR TWO DIFFERENT QUESTIONS.

       "How far away is the Moon now" is about the orbit you set up, and must
       be read at the same moment as the one it is compared against — the
       osculating semi-major axis swings about two per cent across a month
       under the Sun's pull, so reading the end of one run against the start
       of another reports a two per cent change when nothing was changed at
       all. "Did it stay" is about the end of the run, and must be read there.
       Using one for both is how the untouched scenario came to claim the
       tides had weakened by two per cent. */
    var elStart = wPerturbed ? S.elements(wPerturbed, "Moon", "Earth") : null;
    var elEnd = S.elements(res.world, "Moon", "Earth");
    var el = elStart || elEnd;
    var moonGone = !S.find(res.world, "Moon") || !S.find(res.world, "Moon").alive;
    var elNow = elEnd;
    /* A MONTH IS A RETURN, so a Moon that is leaving has no month. Counting
       its angle swept and dividing gave numbers like "a sidereal month of
       373 days", which is not a long month — it is a body on its way out,
       measured as though it were coming back. */
    var unbound = elNow && !elNow.bound;
    var sid = (moonGone || unbound) ? null : S.measurePeriod(src, "Moon", "Earth");
    var syn = (moonGone || unbound) ? null : S.measureSynodic(src);
    if (sid && sid.aliased) sid = null;
    var baseSid = baseline && baseline.sidereal ? baseline.sidereal : S.REAL.siderealMonth;
    var baseSyn = baseline && baseline.synodic ? baseline.synodic : S.REAL.synodicMonth;
    /* The baseline distance is taken from the world BEFORE anything was
       touched, not from the end of the baseline run. Otherwise the untouched
       scenario compares one moment of a wobbling orbit against another and
       reports that nothing changed by half a per cent. */
    var el0 = S.elements(w0, "Moon", "Earth");
    var baseA = el0 ? el0.a : (S.REAL.moonDistanceKm / AU_KM);

    out.sidereal = sid ? sid.periodDays : null;
    out.synodic = syn;
    out.elements = el;
    out.moonGone = moonGone;

    /* did anything end? */
    var collision = null, escape = false;
    res.events.forEach(function (e) {
      if (e.kind === "collision") collision = e;
    });
    if (elEnd && !elEnd.bound) escape = true;
    out.flags.collision = !!collision;
    out.flags.escape = escape;
    out.flags.moonGone = moonGone;

    if (collision) {
      out.headline = collision.say + " after " + collision.t.toFixed(2) +
                     " days — " + (collision.t * 24).toFixed(1) + " hours.";
      out.rows.push(["How long it takes", collision.t.toFixed(3) + " days"]);
    } else if (escape) {
      out.headline = "The Moon is no longer bound to the Earth. It leaves.";
      out.rows.push(["Orbit", "unbound — eccentricity " +
        (el ? el.e.toFixed(3) : "—") + ", energy positive"]);
      /* the interesting case: it was bound on the two-body test and the Sun
         took it anyway, which looks like a bug until the Hill radius is on
         the page */
      var h2 = S.hillRadius(res.world);
      var el0 = S.elements(w0, "Moon", "Earth");
      if (h2 && el0) out.rows.push(["Why",
        "a two-body calculation would call this bound. It is the Sun that " +
        "takes it: the orbit's far point reaches past the Hill radius, " +
        Math.round(h2 * AU_KM).toLocaleString("en") + " km, where the Sun's " +
        "pull on the Moon exceeds the Earth's."]);
    } else if (moonGone) {
      out.headline = "There is no Moon.";
    } else if (el) {
      var dKm = el.a * AU_KM;
      out.headline = "A stable orbit, " + Math.round(dKm).toLocaleString("en") +
        " km across its long axis, going round in " +
        (sid ? sid.periodDays.toFixed(2) : el.periodDays.toFixed(2)) + " days.";
      out.rows.push(["Distance", Math.round(dKm).toLocaleString("en") + " km  (" +
        (dKm / S.REAL.moonDistanceKm).toFixed(4) + "× now)"]);
      out.rows.push(["Eccentricity", el.e.toFixed(4) +
        (el.e > 0.3 ? "  — a markedly elliptical orbit" : "")]);
      out.rows.push(["Inclination to the ecliptic", el.inc.toFixed(2) + "°"]);
      if (sid) out.rows.push(["Sidereal month", sid.periodDays.toFixed(4) +
        " days  (" + (sid.periodDays / baseSid).toFixed(4) + "× now)"]);
      if (syn) out.rows.push(["Synodic month", syn.toFixed(4) + " days  (" +
        (syn / baseSyn).toFixed(4) + "× now)"]);
      var tr = tideRatio(el.a, S.find(res.world, "Moon").m, baseA,
                         S.MASS.Moon);
      if (tr != null) {
        out.tide = tr;
        out.rows.push(["Lunar tides", tr < 1
          ? (1 / tr).toFixed(2) + " times weaker"
          : tr.toFixed(2) + " times stronger"]);
      }
      /* can there still be a total solar eclipse? */
      var peri = el.periapsis * AU_KM, apo = el.apoapsis * AU_KM;
      var biggest = angularMin(2 * S.RADIUS_KM.Moon, peri);
      var smallest = angularMin(2 * S.RADIUS_KM.Moon, apo);
      out.moonAngular = { min: smallest, max: biggest };
      var total = biggest >= S.REAL.sunAngularMax;
      var annularOnly = biggest < S.REAL.sunAngularMin;
      out.flags.totalEclipse = total;
      out.rows.push(["The Moon's apparent width",
        smallest.toFixed(2) + "′ to " + biggest.toFixed(2) + "′, against the " +
        "Sun's " + S.REAL.sunAngularMin + "′ to " + S.REAL.sunAngularMax + "′"]);
      /* where this orbit sits against the limit of the Earth's reach */
      var hill = S.hillRadius(res.world);
      el = elStart || elEnd;
      if (hill) {
        var frac = el.apoapsis / hill;
        out.hillFraction = frac;
        out.rows.push(["Against the Earth's reach",
          "the farthest point of this orbit is " + (frac * 100).toFixed(1) +
          "% of the Hill radius — the distance at which the Sun's pull " +
          "overtakes the Earth's" +
          (frac > 0.5 ? ". Beyond about half, an orbit is not reliably stable."
           : (frac > 0.33 ? ". Past a third, an orbit becomes sensitive." : ""))]);
      }
      out.rows.push(["Total solar eclipses", total
        ? "still possible"
        : (annularOnly ? "impossible — every solar eclipse is annular"
                       : "only barely, and rarely")]);
    }

    /* the Earth's own rotation, which gravity here does not touch */
    if (res.world.spinHours !== S.REAL.dayHours) {
      out.flags.spinChanged = true;
      out.rows.push(["The day", isFinite(res.world.spinHours)
        ? res.world.spinHours + " hours" : "never ends — the Earth keeps one " +
          "face to the Sun through its year, so a day becomes a year"]);
    }
    if (res.world.tilt !== S.REAL.tiltDegrees) {
      out.flags.tiltChanged = true;
      out.rows.push(["Axial tilt", res.world.tilt + "°, against " +
        S.REAL.tiltDegrees + "° now"]);
      out.rows.push(["Seasons", res.world.tilt === 0
        ? "none — every day the same length everywhere, all year"
        : (res.world.tilt >= 60
           ? "violent: the poles face the Sun directly for part of the year " +
             "and are in darkness for the rest"
           : "stronger than now, and the tropics move to " +
             res.world.tilt + "° of latitude")]);
    }

    /* the year, if the Earth itself was disturbed */
    var ey = S.measurePeriod(res, "Earth", "Sun");
    if (ey && Math.abs(ey.periodDays - S.REAL.siderealYear) > 1) {
      out.year = ey.periodDays;
      out.rows.push(["The year", ey.periodDays.toFixed(2) + " days  (" +
        (ey.periodDays / S.REAL.siderealYear).toFixed(4) + "× now)"]);
    }

    out.jyotisha = jyotisha(out, S);
    out.energyDrift = res.energyDrift;
    return out;
  }

  /* WHAT IT DOES TO THE SYSTEM THIS SITE TEACHES.

     Not a list of opinions. Every line is arithmetic on the numbers above: a
     tithi is a thirtieth of a synodic month by definition, a nakṣatra transit
     a twenty-seventh of a sidereal month, and Rāhu and Ketu are the two points
     where the lunar orbit crosses the ecliptic — so a Moon with no orbit has
     no nodes, and a scheme that begins from the Moon's nakṣatra has nothing
     to begin from. */
  function jyotisha(out, S) {
    var rows = [];
    if (out.flags.collision || out.flags.escape || out.moonGone) {
      rows.push(["Tithi", "ceases. A tithi is a twelfth of the Moon's " +
        "distance from the Sun, and there is no Moon to be at a distance."]);
      rows.push(["Pakṣa and māsa", "cease. Both are counted from new Moon to " +
        "full and back."]);
      rows.push(["Nakṣatra transit", "ceases. The Moon no longer moves " +
        "through them."]);
      rows.push(["Rāhu and Ketu", "cease to exist as points. They ARE the two " +
        "places the Moon's orbit crosses the ecliptic; with no orbit there " +
        "are no crossings."]);
      rows.push(["Eclipses", "none, ever again."]);
      rows.push(["Viṃśottarī", "has no starting point. The daśā at birth is " +
        "set by the Moon's nakṣatra and how far through it the Moon has got, " +
        "and neither quantity exists."]);
      rows.push(["What survives", "the Sun, the five star-planets, the " +
        "rāśis, the bhāvas and the lagna — everything that is solar or " +
        "diurnal. Roughly half of the apparatus, and not the half most " +
        "readings lean on."]);
      return rows;
    }
    if (!out.synodic || !out.sidereal) return rows;
    var tithi = out.synodic / 30, nak = out.sidereal / 27;
    var tNow = S.REAL.synodicMonth / 30, nNow = S.REAL.siderealMonth / 27;
    rows.push(["A tithi", (tithi * 24).toFixed(2) + " hours, against " +
      (tNow * 24).toFixed(2) + " now  (" + (tithi / tNow).toFixed(3) + "×)"]);
    rows.push(["A pakṣa", (out.synodic / 2).toFixed(2) + " days, against " +
      (S.REAL.synodicMonth / 2).toFixed(2) + " now"]);
    rows.push(["A lunar month", out.synodic.toFixed(2) + " days, against " +
      S.REAL.synodicMonth.toFixed(2) + " now"]);
    rows.push(["A nakṣatra transit", (nak * 24).toFixed(2) + " hours, against " +
      (nNow * 24).toFixed(2) + " now"]);
    rows.push(["Months in a year",
      (S.REAL.siderealYear / out.synodic).toFixed(3) + ", against " +
      (S.REAL.siderealYear / S.REAL.synodicMonth).toFixed(3) + " now"]);
    var adhika = S.REAL.siderealYear / out.synodic - 12;
    rows.push(["An intercalary month", adhika > 0.001
      ? "every " + (1 / adhika).toFixed(2) + " years, against every " +
        (1 / (S.REAL.siderealYear / S.REAL.synodicMonth - 12)).toFixed(2) + " now"
      : (adhika < -0.001
         ? "never — the year would be SHORT of twelve lunar months, so the " +
           "calendar would need months removed rather than added"
         : "almost exactly twelve months to the year")]);
    if (out.elements) {
      rows.push(["Rāhu and Ketu", "still exist — the orbit still crosses the " +
        "ecliptic, now at " + out.elements.inc.toFixed(2) +
        "° instead of 5.14°" + (out.elements.inc > 15
          ? ". Eclipse seasons would be much shorter and rarer, because the " +
            "Moon spends less time near the ecliptic."
          : ".")]);
    }
    if (out.flags.totalEclipse === false)
      rows.push(["Eclipses", "partial and annular only. The Moon is never " +
        "wide enough to cover the Sun, so there is no totality — and the " +
        "most dramatic thing Rāhu is said to do, it could no longer do."]);
    rows.push(["Viṃśottarī", "survives unchanged in structure — the hundred " +
      "and twenty years are a convention and not an astronomical period — but " +
      "the balance at birth shifts, because the Moon takes " +
      (nak / nNow).toFixed(3) + " times as long to cross a nakṣatra."]);
    return rows;
  }

  /* ---- running one -------------------------------------------------------- */
  function worldFor(scenario, ms) {
    var S = eng();
    return S.worldAt(ms, scenario.needs || ["Sun", "Earth", "Moon"]);
  }
  /* MEASURING AND SHOWING ARE TWO DIFFERENT RUNS, and conflating them is
     what produced a period eight times too long at the Roche limit.

     A measurement needs many samples per orbit and only a few orbits. A
     picture needs enough orbits to show the shape and few enough frames to
     draw. For the Moon as it is those are nearly the same run; for an orbit
     of two hours they are not remotely the same run. So the period is taken
     from a short dense run sized to the orbit, and the animation from a
     separate one sized to the eye. */
  function measureRun(S, w, opts) {
    var el = S.elements(w, "Moon", "Earth");
    var P = el && el.periodDays ? el.periodDays : S.REAL.siderealMonth;
    if (!(P > 0) || !isFinite(P)) P = S.REAL.siderealMonth;
    /* A MARGINALLY BOUND ORBIT HAS AN ENORMOUS PERIOD, AND IT IS A LIE.

       At 1.45× speed the Moon's two-body energy is still just negative, so
       elements() dutifully reports a semi-major axis of 0.56 AU and a period
       of two hundred and forty years. Eighteen turns of that is one and a
       half million days, which at an hour and a half a step is twenty-two
       million steps — eleven seconds of a frozen tab to measure a month that
       does not exist, because long before the Moon came back the Sun would
       have taken it.

       So the period is capped by the Hill radius: an orbit whose far point
       reaches past it is not going to complete, and measuring it is measuring
       nothing. Beyond that the run is capped outright, and the aliasing guard
       in measurePeriod reports honestly that no period was found. */
    var hill = S.hillRadius ? S.hillRadius(w) : null;
    if (el && hill && el.apoapsis != null && el.apoapsis > hill) P = 0;
    var turns = 18;
    var days = Math.max(Math.min(P * turns, 4000), 2);
    /* forty samples a turn, which leaves a wide margin over the six the
       aliasing guard insists on */
    var samples = Math.min(20000, Math.max(900, Math.round(turns * 40)));
    return S.run(S.clone(w), days, { samples: samples });
  }
  /* how long to SHOW: the scenario's own figure, unless that would be
     hundreds of orbits, in which case enough to read the shape */
  function showDays(S, w, scenario) {
    var el = S.elements(w, "Moon", "Earth");
    var want = scenario.days || 400;
    if (!el || !el.periodDays || !isFinite(el.periodDays)) return want;
    var max = el.periodDays * 24;
    return Math.min(want, Math.max(el.periodDays * 3, max));
  }

  function simulate(scenario, ms, opts) {
    opts = opts || {};
    var S = eng();
    var w = worldFor(scenario, ms);
    if (!w) return null;
    var base = null;
    if (!opts.skipBaseline) {
      var br = measureRun(S, w, opts);
      var bs = S.measurePeriod(br, "Moon", "Earth");
      if (bs && bs.aliased) bs = null;
      base = { sidereal: bs ? bs.periodDays : null,
               synodic: S.measureSynodic(br),
               a: (S.elements(br.world, "Moon", "Earth") || {}).a,
               energyDrift: br.energyDrift,
               /* THE NOISE FLOOR: how far the untouched run's own measured
                  month sits from the real one. Any change smaller than this
                  is below what this simulation can see, and saying so is the
                  difference between a tool and a toy. */
               siderealError: bs
                 ? Math.abs(bs.periodDays - S.REAL.siderealMonth) : null };
    }
    var w2 = S.clone(w);
    scenario.apply(w2);
    /* the dense run, for the numbers */
    var mres = measureRun(S, w2, opts);
    /* and the one the animation is made of */
    var days = showDays(S, w2, scenario);
    var res = S.run(S.clone(w2), days, { samples: opts.samples || 900 });
    res.measured = mres;
    var cons = consequences(res, w, scenario, base, mres, w2);
    cons.baseline = base;
    cons.days = days;
    cons.note = scenario.note || null;
    cons.gravitational = scenario.gravitational !== false;
    /* is the change bigger than the noise? */
    if (base && base.siderealError != null && cons.sidereal != null) {
      var change = Math.abs(cons.sidereal - base.sidereal);
      cons.changeDays = change;
      cons.noiseDays = base.siderealError;
      cons.resolvable = change > base.siderealError * 2;
    }
    if (scenario.subNoise) cons.resolvable = false;
    if (scenario.analytic) {
      try { cons.analytic = scenario.analytic(w); } catch (e) {}
    }
    cons.result = res;
    return cons;
  }

  var ABSENT = [
    { what: "Tides raised on the bodies themselves",
      why: "every body here is a point mass, so there is no tidal bulge and " +
           "therefore no tidal braking — which is why this simulator will " +
           "report the Moon's orbit as stable for ten thousand years while " +
           "the real Moon recedes four centimetres a year. The mechanism that " +
           "does that is not in here" },
    { what: "The Roche limit as a physical event",
      why: "a point mass cannot be pulled apart. The Roche scenario puts the " +
           "Moon where a real one would disintegrate and then shows it " +
           "orbiting peacefully, which is the model's limit and not a result" },
    { what: "Spin-orbit coupling, and the Moon's stabilising of the tilt",
      why: "the Earth's rotation is carried as a number here, not as an " +
           "angular momentum the integrator acts on. The often-repeated claim " +
           "that losing the Moon would let the Earth's axis wander is about " +
           "exactly that coupling, so this simulator can report what a given " +
           "tilt would mean but cannot tell you whether the tilt would change" },
    { what: "Relativity",
      why: "Newtonian gravity throughout. For Mercury over a century this is " +
           "wrong by an arcminute or so; for the Earth and Moon over the spans " +
           "here it is far below everything else" },
    { what: "Anything about climate, life or weather",
      why: "a tilt of forty-five degrees would change the seasons, and what " +
           "that would do to a planet is a question for a different science " +
           "than this one. The page reports the geometry and stops" }
  ];

  window.SimScenarios = {
    SCENARIOS: SCENARIOS, byId: byId, simulate: simulate, worldFor: worldFor,
    consequences: consequences, jyotisha: jyotisha, ABSENT: ABSENT,
    tideRatio: tideRatio, angularMin: angularMin,
    groups: function () {
      var g = [];
      SCENARIOS.forEach(function (s) { if (g.indexOf(s.group) < 0) g.push(s.group); });
      return g;
    }
  };
})();

/* ===== Drawing a counterfactual ===========================================

   THE HARD PART IS THE SCALE, and it is worth saying why before the code.

   These scenarios span four orders of magnitude. At the Roche limit the Moon
   is nine thousand kilometres from the Earth's centre, about a tenth of an
   Earth diameter above the ground. When it is sped up past escape it ends two
   million kilometres away. One fixed scale cannot show both: at the escape
   scale the Roche orbit is a dot, and at the Roche scale the escaping Moon
   leaves the frame in the first second and never comes back.

   So the view frames ITSELF from the run it is given — it finds the farthest
   the Moon actually gets and fits that — and then it says what scale it
   arrived at, in kilometres and in Earth diameters, because a picture that
   silently rescales between runs is a picture that makes everything look the
   same. The Earth and the Moon are drawn at their true sizes against that
   scale wherever there is room to see them, and when there is not, they are
   drawn at a floor and the frame says so. Two bodies the right size relative
   to their orbit is one of the few things a drawing can teach here that a
   number cannot: at the real distance, the Earth is a very small dot.

   THE SUN'S DIRECTION IS ALWAYS SHOWN, because almost every interesting
   quantity on this page is about the angle between the Moon and the Sun — the
   synodic month, the tithi, the pakṣa, whether an eclipse is possible. With
   the frame held in a fixed orientation and the Sun's arrow sweeping round
   it, the difference between the sidereal month and the synodic one stops
   being a definition and becomes something you watch happen. */

(function () {
  "use strict";

  var AU_KM = 149597870.7;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var PAL = {
    bg: "#0b1020", bg2: "#161d3a", ink: "#f2efe4", dim: "#8f96bb",
    line: "#2b3358", gold: "#d9b668", warm: "#e07a60", cool: "#5fbf8f",
    star: "#dfe6ff", earth: "#4d7fd0", moon: "#cfd4e4", sun: "#ffc83d"
  };

  /* ---- framing ------------------------------------------------------------ */
  /* The farthest the Moon gets from the Earth across the whole run, which is
     what the view has to fit. Computed once per run, not per frame, so the
     scale does not breathe while the animation plays — a scale that moves
     turns every orbit into a circle. */
  function extent(res) {
    var max = 0;
    res.frames.forEach(function (f) {
      var e = null, m = null;
      f.b.forEach(function (q) {
        if (q.name === "Earth") e = q;
        if (q.name === "Moon" && q.alive) m = q;
      });
      if (!e || !m) return;
      var d = Math.hypot(m.x - e.x, m.y - e.y, m.z - e.z);
      if (d > max) max = d;
    });
    return max || 0.003;
  }

  function bodiesOf(frame) {
    var o = {};
    frame.b.forEach(function (q) { o[q.name] = q; });
    return o;
  }

  /* ---- the plan view ------------------------------------------------------ */
  /* Earth-centred, looking down on the ecliptic, in a FIXED orientation — the
     frame does not turn with the Moon. That is what makes the Sun's arrow
     sweep once a year while the Moon goes round thirteen times, which is the
     whole of the difference between the two kinds of month. */
  function plan(c, W, H, res, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    var n = res.frames.length;
    var i = clamp(Math.floor(p * (n - 1)), 0, n - 1);
    var f = res.frames[i];
    var B = bodiesOf(f);
    if (!B.Earth) return null;

    var cx = W / 2, cy = H * 0.46;
    var R = Math.min(W, H) * 0.38;
    var ext = opts.extent != null ? opts.extent : extent(res);
    var scale = R / (ext * 1.08);               /* pixels per AU */

    /* the trail — every frame up to now, so the shape of the orbit is the
       thing on the screen rather than a point moving */
    c.save();
    c.lineWidth = Math.max(1, W * 0.0022);
    c.strokeStyle = P.gold;
    c.globalAlpha = 0.5;
    c.beginPath();
    var started = false;
    for (var k = 0; k <= i; k++) {
      var g = bodiesOf(res.frames[k]);
      if (!g.Moon || !g.Moon.alive || !g.Earth) continue;
      var x = cx + (g.Moon.x - g.Earth.x) * scale;
      var y = cy - (g.Moon.y - g.Earth.y) * scale;
      if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
    }
    if (started) c.stroke();
    c.restore();

    /* the Earth, at its true size against this scale where that is visible */
    var eR = Math.max(1.5, B.Earth.r * scale);
    c.fillStyle = P.earth;
    c.beginPath(); c.arc(cx, cy, eR, 0, Math.PI * 2); c.fill();
    /* and the Moon */
    if (B.Moon && B.Moon.alive) {
      var mx = cx + (B.Moon.x - B.Earth.x) * scale;
      var my = cy - (B.Moon.y - B.Earth.y) * scale;
      var mR = Math.max(1.2, B.Moon.r * scale);
      c.fillStyle = P.moon;
      c.beginPath(); c.arc(mx, my, mR, 0, Math.PI * 2); c.fill();
      /* the line joining them, which is what every elongation is measured
         against */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1, W * 0.0012);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(mx, my); c.stroke();
      c.restore();
    }

    /* the Sun's direction */
    if (B.Sun) {
      var dx = B.Sun.x - B.Earth.x, dy = B.Sun.y - B.Earth.y;
      var L = Math.hypot(dx, dy) || 1;
      var ax = cx + dx / L * R * 1.12, ay = cy - dy / L * R * 1.12;
      c.save();
      c.strokeStyle = P.sun; c.globalAlpha = 0.85;
      c.lineWidth = Math.max(1, W * 0.0025);
      c.setLineDash([W * 0.012, W * 0.01]);
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(ax, ay); c.stroke();
      c.setLineDash([]);
      c.fillStyle = P.sun;
      c.beginPath(); c.arc(ax, ay, Math.max(3, W * 0.012), 0, Math.PI * 2); c.fill();
      c.fillStyle = P.dim;
      c.font = "600 " + Math.round(W * 0.022) + "px system-ui,sans-serif";
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("Sūrya", ax, ay + W * 0.030);
      c.restore();
      /* the elongation, which is the tithi */
      if (B.Moon && B.Moon.alive) {
        var am = Math.atan2(B.Moon.y - B.Earth.y, B.Moon.x - B.Earth.x);
        var as = Math.atan2(dy, dx);
        var el = ((am - as) * 180 / Math.PI % 360 + 360) % 360;
        c.save();
        c.strokeStyle = P.cool; c.globalAlpha = 0.5;
        c.lineWidth = Math.max(1, W * 0.004);
        c.beginPath();
        c.arc(cx, cy, R * 0.30, -as, -am, true);
        c.stroke();
        c.restore();
        opts.elongation = el;
      }
    }
    return { scale: scale, extent: ext, frame: i, t: f.t, bodies: B,
             cx: cx, cy: cy, R: R };
  }

  /* ---- the edge-on view --------------------------------------------------- */
  /* Looking along the ecliptic, so the inclination is the subject. Worth its
     own panel because the nodes — Rāhu and Ketu — are precisely the two
     places this view crosses the centre line, and in the plan view they
     cannot be seen at all. */
  function side(c, W, H, res, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    var n = res.frames.length;
    var i = clamp(Math.floor(p * (n - 1)), 0, n - 1);
    var ext = opts.extent != null ? opts.extent : extent(res);
    var cx = W / 2, cy = H / 2;
    var scale = (Math.min(W, H) * 0.40) / (ext * 1.08);
    /* the vertical is exaggerated, and the frame says by how much: the real
       figure is five degrees, which at an honest scale is a line */
    var vex = opts.vex || 6;

    c.save();
    c.strokeStyle = P.line; c.globalAlpha = 0.8;
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.stroke();
    c.restore();

    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.55;
    c.lineWidth = Math.max(1, W * 0.002);
    c.beginPath();
    var started = false;
    for (var k = 0; k <= i; k++) {
      var g = bodiesOf(res.frames[k]);
      if (!g.Moon || !g.Moon.alive || !g.Earth) continue;
      var x = cx + (g.Moon.x - g.Earth.x) * scale;
      var y = cy - (g.Moon.z - g.Earth.z) * scale * vex;
      if (started) c.lineTo(x, y); else { c.moveTo(x, y); started = true; }
    }
    if (started) c.stroke();
    c.restore();

    var B = bodiesOf(res.frames[i]);
    if (!B.Earth) { c.restore ; return null; }
    c.fillStyle = P.earth;
    c.beginPath();
    c.arc(cx, cy, Math.max(1.5, B.Earth.r * scale), 0, Math.PI * 2);
    c.fill();
    if (B.Moon && B.Moon.alive) {
      c.fillStyle = P.moon;
      c.beginPath();
      c.arc(cx + (B.Moon.x - B.Earth.x) * scale,
            cy - (B.Moon.z - B.Earth.z) * scale * vex,
            Math.max(1.2, B.Moon.r * scale), 0, Math.PI * 2);
      c.fill();
    }
    return { vex: vex, scale: scale };
  }

  /* ---- the comparison of apparent sizes ----------------------------------
     Two discs the size the Sun and the Moon appear from the ground. Whether
     the Moon's is the larger is the whole question of whether a total solar
     eclipse is possible at all, and it is a question a drawing answers better
     than a table of arcminutes. */
  function discs(c, W, H, cons, opts) {
    var P = (opts && opts.pal) || PAL;
    var sunMin = 31.6, sunMax = 32.7;
    var mn = cons.moonAngular ? cons.moonAngular.min : null;
    var mx = cons.moonAngular ? cons.moonAngular.max : null;
    var top = Math.max(sunMax, mx || 0) * 1.25;
    var R = Math.min(W, H) * 0.34;
    function rad(min) { return R * (min / top); }
    var cy = H * 0.46;
    var x1 = W * 0.30, x2 = W * 0.70;

    c.save();
    c.fillStyle = P.sun; c.globalAlpha = 0.9;
    c.beginPath(); c.arc(x1, cy, rad(sunMax), 0, Math.PI * 2); c.fill();
    c.restore();
    c.save();
    c.strokeStyle = P.sun; c.globalAlpha = 0.5;
    c.lineWidth = 1;
    c.beginPath(); c.arc(x1, cy, rad(sunMin), 0, Math.PI * 2); c.stroke();
    c.restore();
    if (mx != null) {
      c.save();
      c.fillStyle = P.moon; c.globalAlpha = 0.9;
      c.beginPath(); c.arc(x2, cy, rad(mx), 0, Math.PI * 2); c.fill();
      c.restore();
      c.save();
      c.strokeStyle = P.moon; c.globalAlpha = 0.5;
      c.lineWidth = 1;
      c.beginPath(); c.arc(x2, cy, rad(mn), 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    c.fillStyle = P.dim;
    c.font = "600 " + Math.round(W * 0.030) + "px system-ui,sans-serif";
    c.textAlign = "center"; c.textBaseline = "top";
    c.fillText("Sūrya  " + sunMin + "′–" + sunMax + "′", x1, cy + R * 1.08);
    if (mx != null)
      c.fillText("Candra  " + mn.toFixed(1) + "′–" + mx.toFixed(1) + "′",
                 x2, cy + R * 1.08);
    else c.fillText("no Moon", x2, cy + R * 1.08);
    c.font = "700 " + Math.round(W * 0.034) + "px system-ui,sans-serif";
    c.fillStyle = cons.flags && cons.flags.totalEclipse ? P.cool : P.warm;
    c.fillText(mx == null ? "no eclipses of any kind"
      : (cons.flags.totalEclipse
         ? "the Moon can still cover the Sun — totality is possible"
         : "the Moon can never cover the Sun — no totality"),
      W / 2, H * 0.90);
    c.restore && c.restore;
  }

  /* ---- chrome ------------------------------------------------------------- */
  function background(c, W, H, P) {
    P = P || PAL;
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  /* The scale bar. Not decoration: without it every one of these runs looks
     the same size, and the difference between nine thousand kilometres and
     two million is the entire content of several of them. */
  function scaleBar(c, W, H, pxPerAU, P) {
    P = P || PAL;
    var want = W * 0.22 / pxPerAU * AU_KM;            /* km for a bar */
    var pow = Math.pow(10, Math.floor(Math.log10(want)));
    var nice = [1, 2, 5, 10].map(function (q) { return q * pow; })
      .reduce(function (a, b) {
        return Math.abs(b - want) < Math.abs(a - want) ? b : a; });
    var px = nice / AU_KM * pxPerAU;
    var x0 = W * 0.06, y0 = H * 0.93;
    c.save();
    c.strokeStyle = P.dim; c.lineWidth = Math.max(1, W * 0.002);
    c.beginPath();
    c.moveTo(x0, y0); c.lineTo(x0 + px, y0);
    c.moveTo(x0, y0 - H * 0.008); c.lineTo(x0, y0 + H * 0.008);
    c.moveTo(x0 + px, y0 - H * 0.008); c.lineTo(x0 + px, y0 + H * 0.008);
    c.stroke();
    c.fillStyle = P.dim;
    c.font = "600 " + Math.round(W * 0.020) + "px system-ui,sans-serif";
    c.textAlign = "left"; c.textBaseline = "bottom";
    c.fillText(nice >= 1e6 ? (nice / 1e6).toFixed(nice % 1e6 ? 1 : 0) + " million km"
      : Math.round(nice).toLocaleString("en") + " km", x0, y0 - H * 0.014);
    c.fillText("the Earth is " + (12742 / AU_KM * pxPerAU).toFixed(1) +
      " px across here", x0, y0 + H * 0.040);
    c.restore();
  }
  function caption(c, W, H, lines, P) {
    P = P || PAL;
    c.save();
    c.textAlign = "center"; c.textBaseline = "top";
    var y = H * 0.035;
    lines.forEach(function (L, i) {
      c.fillStyle = i === 0 ? P.gold : P.dim;
      c.font = (i === 0 ? "700 " : "500 ") +
        Math.round(W * (i === 0 ? 0.034 : 0.024)) + "px system-ui,sans-serif";
      c.fillText(L, W / 2, y);
      y += W * (i === 0 ? 0.046 : 0.034);
    });
    c.restore();
  }
  /* the elapsed time, which for a four-day collision and a nine-hundred-day
     orbit cannot be the same unit */
  function clock(c, W, H, days, P) {
    P = P || PAL;
    var s;
    if (days < 2) s = (days * 24).toFixed(1) + " hours";
    else if (days < 400) s = days.toFixed(1) + " days";
    else s = (days / 365.2564).toFixed(2) + " years";
    c.save();
    c.fillStyle = P.ink;
    c.font = "600 " + Math.round(W * 0.026) + "px system-ui,sans-serif";
    c.textAlign = "right"; c.textBaseline = "top";
    c.fillText(s, W * 0.94, H * 0.035);
    c.restore();
  }

  /* ---- the whole scene ---------------------------------------------------- */
  /* One canvas, the plan view large with the edge-on view inset, because the
     inclination is a small part of the story and a full second panel would
     say otherwise. */
  function scene(c, W, H, res, cons, p, opts) {
    opts = opts || {};
    var P = opts.pal || PAL;
    background(c, W, H, P);
    var ext = extent(res);
    var info = plan(c, W, H, res, p, { pal: P, extent: ext });
    if (!info) return null;

    /* the edge-on inset */
    var iw = W * 0.34, ih = H * 0.16;
    var ix = W - iw - W * 0.05, iy = H - ih - H * 0.10;
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = "rgba(0,0,0,0.30)";
    c.fillRect(ix, iy, iw, ih);
    c.strokeStyle = P.line; c.lineWidth = 1;
    c.strokeRect(ix, iy, iw, ih);
    c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
    c.translate(ix, iy);
    side(c, iw, ih, res, p, { pal: P, extent: ext, vex: opts.vex || 6 });
    c.restore();
    c.save();
    c.fillStyle = P.dim;
    c.font = "500 " + Math.round(W * 0.017) + "px system-ui,sans-serif";
    c.textAlign = "right"; c.textBaseline = "bottom";
    c.fillText("edge-on, height × " + (opts.vex || 6), ix + iw, iy - 3);
    c.restore();

    scaleBar(c, W, H, info.scale, P);
    clock(c, W, H, info.t, P);
    var lines = [cons.label];
    if (cons.headline) lines.push(cons.headline);
    caption(c, W, H, lines, P);
    return info;
  }

  window.SimDraw = {
    PAL: PAL, extent: extent, plan: plan, side: side, discs: discs,
    scene: scene, background: background, scaleBar: scaleBar,
    caption: caption, clock: clock, bodiesOf: bodiesOf
  };
})();

/* ===== The simulation page ================================================

   Picks a scenario, runs it, plays it, and prints what followed. The one
   thing worth saying about the wiring: the run happens once, when the
   scenario is chosen, and playback is a walk through frames that already
   exist. Integrating inside the animation loop would put the physics on the
   frame path, and the frame path is where this codebase has already learnt
   not to put anything expensive. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var CUR = null;          /* the current consequences object */
  var P = 0, PLAY = false, RAF = null, T0 = 0, DUR = 16;
  var WHEN = Date.now();

  function stage() { return $("sim-canvas"); }

  function fit() {
    var cv = stage(), box = $("sim-stagebox");
    if (!cv || !box) return;
    var w = Math.max(240, box.clientWidth - 2);
    var h = Math.round(w * 0.62);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
  }

  function drawFrame() {
    var cv = stage();
    if (!cv || !CUR) return;
    var c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    window.SimDraw.scene(c, cv.width, cv.height, CUR.result, CUR, P, {});
  }

  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var el2 = (Date.now() - T0) / 1000;
    P = (el2 % DUR) / DUR;
    drawFrame();
    var sc = $("sim-scrub");
    if (sc && !tick.n) { sc.value = String(Math.round(P * 1000)); }
    tick.n = (tick.n || 0) + 1;
    if (tick.n > 6) tick.n = 0;
  }
  function play(on) {
    PLAY = on;
    var b = $("sim-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) { T0 = Date.now() - P * DUR * 1000; tick(); }
    else if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
  }

  /* ---- the picker --------------------------------------------------------- */
  function picker() {
    var host = $("sim-picker");
    if (!host) return;
    host.innerHTML = "";
    var Z = window.SimScenarios;
    Z.groups().forEach(function (g) {
      var sec = el("div", "simgroup");
      sec.appendChild(el("h4", null, g));
      var wrap = el("div", "simchips");
      Z.SCENARIOS.filter(function (s) { return s.group === g; })
        .forEach(function (s) {
          var b = el("button", "simchip" +
            (CUR && CUR.id === s.id ? " on" : ""), s.label);
          b.type = "button";
          b.title = s.question;
          b.addEventListener("click", function () { choose(s.id); });
          wrap.appendChild(b);
        });
      sec.appendChild(wrap);
      host.appendChild(sec);
    });
  }

  function choose(id) {
    var Z = window.SimScenarios;
    var s = Z.byId(id);
    if (!s) return;
    var note = $("sim-running");
    if (note) { note.hidden = false; note.textContent = "Integrating…"; }
    /* let the browser paint the note before the run blocks it */
    setTimeout(function () {
      var t0 = performance.now();
      var cons = null;
      try { cons = Z.simulate(s, WHEN, { samples: 900 }); }
      catch (e) { cons = null; }
      if (note) note.hidden = true;
      if (!cons) { flash("That run could not be set up."); return; }
      cons.ms = performance.now() - t0;
      CUR = cons;
      P = 0;
      fit();
      drawFrame();
      picker();
      report();
      play(true);
    }, 16);
  }

  /* ---- the report --------------------------------------------------------- */
  function table(rows, cls) {
    var t = el("table", "tbl " + (cls || ""));
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "simval", r[1]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function report() {
    var host = $("sim-report");
    if (!host || !CUR) return;
    host.innerHTML = "";

    host.appendChild(el("p", "simq", CUR.question));
    if (CUR.headline) {
      var h = el("p", "simhead", CUR.headline);
      host.appendChild(h);
    }

    /* THE NOISE FLOOR. When the change asked about is smaller than the
       simulator's own error, the simulator says so and does the arithmetic
       instead. This is the panel that distinguishes a tool from a toy. */
    if (CUR.resolvable === false && CUR.analytic) {
      var box = el("div", "simnoise");
      box.appendChild(el("h4", null, "Too small to simulate — so here is the arithmetic"));
      box.appendChild(el("p", null, CUR.analytic.lead));
      box.appendChild(table(CUR.analytic.rows));
      if (CUR.analytic.moral) box.appendChild(el("p", "simmoral", CUR.analytic.moral));
      if (CUR.noiseDays != null)
        box.appendChild(el("p", "simnote",
          "For comparison: this simulation's own month, run with nothing " +
          "changed, sits " + (CUR.noiseDays * 24 * 60).toFixed(1) +
          " minutes from the real one. Anything smaller than that is below " +
          "what it can see, and drawing it would be a picture of rounding error."));
      host.appendChild(box);
    } else if (CUR.resolvable === false && CUR.id !== "none" && CUR.gravitational) {
      host.appendChild(el("p", "simnote",
        "The change is below what this simulation can resolve — its own " +
        "month, with nothing altered, is " +
        ((CUR.noiseDays || 0) * 24 * 60).toFixed(1) + " minutes from the real " +
        "one, and this scenario moves it less than that."));
    }

    if (CUR.rows.length) {
      host.appendChild(el("h3", "simsec", "What happens"));
      host.appendChild(table(CUR.rows));
    }
    if (CUR.jyotisha.length) {
      host.appendChild(el("h3", "simsec",
        "What it does to the system this site teaches"));
      host.appendChild(table(CUR.jyotisha, "simjy"));
    }
    if (CUR.note) {
      var n = el("p", "simnote");
      n.appendChild(el("b", null, "A limit of the model: "));
      n.appendChild(document.createTextNode(CUR.note));
      host.appendChild(n);
    }
    discs();
    var stat = $("sim-stat");
    if (stat) stat.textContent =
      "Integrated " + CUR.days.toFixed(1) + " days in " +
      (CUR.result ? CUR.result.steps.toLocaleString("en") : "?") + " steps, " +
      (CUR.ms || 0).toFixed(0) + " ms. Energy conserved to " +
      (CUR.energyDrift != null ? CUR.energyDrift.toExponential(1) : "—") +
      " of itself.";
  }

  function flash(m) {
    var f = $("sim-flash");
    if (!f) return;
    f.textContent = m; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }

  /* ---- the comparison of discs, its own small canvas ---------------------- */
  function discs() {
    var cv = $("sim-discs");
    if (!cv || !CUR) return;
    var box = cv.parentNode;
    var w = Math.max(220, box.clientWidth - 2), h = Math.round(w * 0.52);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext("2d");
    window.SimDraw.background(c, cv.width, cv.height);
    window.SimDraw.discs(c, cv.width, cv.height, CUR, {});
  }

  function absent() {
    var host = $("sim-absent");
    if (!host) return;
    host.innerHTML = "";
    window.SimScenarios.ABSENT.forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q.what + " — "));
      li.appendChild(document.createTextNode(q.why));
      host.appendChild(li);
    });
  }

  /* ---- boot --------------------------------------------------------------- */
  function bind() {
    if (!window.SimEngine || !window.SimScenarios || !window.SimDraw) return;
    if (!stage()) return;
    if (!window.__kState) { setTimeout(bind, 150); return; }

    var w = $("sim-when");
    if (w) {
      var d = new Date(WHEN - new Date().getTimezoneOffset() * 60000);
      w.value = d.toISOString().slice(0, 16);
      w.addEventListener("change", function () {
        var t = Date.parse(w.value);
        WHEN = isFinite(t) ? t : Date.now();
        if (CUR) choose(CUR.id);
      });
    }
    $("sim-play") && $("sim-play").addEventListener("click", function () {
      play(!PLAY); });
    var sc = $("sim-scrub");
    if (sc) sc.addEventListener("input", function () {
      play(false); P = (+sc.value) / 1000; drawFrame(); });
    var sp = $("sim-speed");
    if (sp) sp.addEventListener("change", function () {
      DUR = +sp.value; if (PLAY) { T0 = Date.now() - P * DUR * 1000; } });

    picker();
    absent();
    window.addEventListener("resize", function () { fit(); drawFrame(); discs(); });
    choose("none");
    setTimeout(discs, 400);

    try {
      window.__sim = {
        choose: function (id) { choose(id); return true; },
        current: function () { return CUR; },
        at: function (p) { P = p; drawFrame(); return P; },
        playing: function () { return PLAY; },
        setWhen: function (t) { WHEN = t; if (CUR) choose(CUR.id); },
        ids: function () {
          return window.SimScenarios.SCENARIOS.map(function (s) { return s.id; }); }
      };
    } catch (e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(bind, 60); });
  else setTimeout(bind, 60);
})();
