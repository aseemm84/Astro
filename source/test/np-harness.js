/* Load the built engine and panchanga.js outside a browser, so the day object can
 * be checked from the command line.
 *
 *   const {NP, win} = require("./np-harness.js");
 *
 * The built engine.js is the vendored Astronomy library concatenated with the
 * engine, and the engine's code refers to a bare `Astronomy`. In a browser that
 * resolves through the global scope; here it has to be put there explicitly, and
 * it has to be put there AFTER engine.js has run, because the copy of the library
 * inside engine.js replaces the one a separate load installed. Getting that order
 * wrong returns a day object of null for every date with nothing to say why,
 * which is a confusing half-hour the first time and a one-line require after this.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const store = {};
const win = {
  localStorage: {
    getItem: (k) => (store.hasOwnProperty(k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
global.window = win;
global.localStorage = win.localStorage;

/* engine.js carries the library with it, so one load is enough.
 *
 * `exports` and `module` are shadowed as undefined parameters on purpose. The
 * vendored library is a UMD bundle whose first test is `typeof exports ===
 * "object" && typeof module !== "undefined"`, and `node -e` leaks both of those
 * onto the GLOBAL object — so the bundle took its CommonJS branch and assigned
 * itself to whatever module was loading the harness, leaving window.Astronomy
 * undefined and every day object null with nothing to say why. Run from a file
 * the same code worked, because there module and exports are wrapper locals that
 * a `new Function` body cannot see. Shadowing them makes the invocation style
 * irrelevant, which is the only version of this worth keeping. */
const load = (file) =>
  new Function("window", "localStorage", "exports", "module", read(file))(
    win, win.localStorage, undefined, undefined);

load("engine.js");
global.Astronomy = win.Astronomy;
if (!global.Astronomy || !global.Astronomy.Ecliptic)
  throw new Error("the Astronomy library did not land on window.Astronomy");

load("panchanga.js");
if (!win.NP) throw new Error("panchanga.js did not export window.NP");

module.exports = { NP: win.NP, win, read, ROOT };
