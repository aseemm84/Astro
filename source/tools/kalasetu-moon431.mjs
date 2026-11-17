/* Kālasetu's Moon beyond DE422, from JPL DE431.
 *
 * Until 17 Nov 2026 the reference had no independent Moon outside DE422
 * (3000 BCE – 3000 CE): there it held astronomy-engine's Moon brought onto
 * DE422's tides, and the Early and Deep sets carried the Core Moon backwards.
 * DE431 (Folkner et al. 2014) integrates the lunar orbit, with the tidal
 * dissipation, from 13201 BCE to 17191 CE; its Moon is read from the Swiss
 * Ephemeris files (source/tools/de431-moon.py).
 *
 * This replaces the Moon and true-node columns of EVERY reference instant with
 * DE431's — inside DE422's span too, so the Moon has one source from 13000 BCE
 * to 3600 CE and no seam at 3000 BCE (DE431 and DE422 differ there by about
 * 4′, by 3000 CE by 0.05′) — through the same frame code as DE422's Moon
 * (geometric geocentric ICRF vector at TT; astronomy-engine's rotation to the
 * true ecliptic of date; less the Samanvaya–Ecliptic ayanāṃśa; the osculating
 * node of the geocentric state). Rows outside DE422 get source code 2
 * (planets from the integration); rows inside keep 0 (planets from DE422). The
 * Sun and planets are untouched.
 *
 * It also measures DE431 against DE422 where both exist, so the seam between
 * them is on record.
 *
 * RUN from the repo root (needs the Swiss files semom*.se1, semo_24/_30.se1):
 *   node source/tools/kalasetu-moon431.mjs /path/to/ephe /path/to/de422
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { loadAstro, ayanAt, norm, sdiff } from "../test/fit-kalasetu.mjs";

const ROOT = process.cwd();
const [EPHE, DE422] = process.argv.slice(2);
if (!EPHE || !DE422) throw new Error("usage: node source/tools/kalasetu-moon431.mjs EPHE_DIR DE422_DIR");
const FILE = ROOT + "/source/data/kalasetu-reference.json";
const A = loadAstro();
const LON = ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu", "Rāhu-true"];
const LAT = ["Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];
const iLon = b => 2 + LON.indexOf(b), iLat = b => 2 + LON.length + LAT.indexOf(b);

function py(script, dir, jds) {
  const tmp = mkdtempSync(tmpdir() + "/moon431-");
  writeFileSync(tmp + "/q.json", JSON.stringify({ jd: jds }));
  execFileSync("python3", ["-I", ROOT + "/source/tools/" + script, dir, tmp + "/q.json", tmp + "/a.json"], { maxBuffer: 1 << 30 });
  return JSON.parse(readFileSync(tmp + "/a.json", "utf8")).states;
}
const tt = ms => A.MakeTime(new Date(ms)).tt + 2451545;          /* as kalasetu-reference.mjs */
function moonOf(r, v, ms) {
  const t = A.MakeTime(new Date(ms)), ay = ayanAt(ms / 86400000 + 2440587.5);
  const e = A.Ecliptic(new A.Vector(r[0], r[1], r[2], t));
  const R = A.Rotation_EQJ_ECT(t), rr = A.RotateVector(R, new A.Vector(r[0], r[1], r[2], t)), vv = A.RotateVector(R, new A.Vector(v[0], v[1], v[2], t));
  const h = { x: rr.y * vv.z - rr.z * vv.y, y: rr.z * vv.x - rr.x * vv.z };
  return { lon: norm(e.elon - ay), lat: e.elat, node: norm(norm(Math.atan2(h.x, -h.y) * 180 / Math.PI) - ay) };
}

const J = JSON.parse(readFileSync(FILE, "utf8"));
const before = {};
let n = 0;
for (const k in J.sets) {
  const rows = J.sets[k].rows;
  if (!rows.length) continue;
  const S = py("de431-moon.py", EPHE, rows.map(r => tt(r[0])));
  rows.forEach((r, i) => {
    const m = moonOf(S[i].r, S[i].v, r[0]);
    (before[k] = before[k] || []).push(sdiff(m.lon, r[iLon("Candra")]) * 60);
    if (r[1] === 1) r[1] = 2;
    r[iLon("Candra")] = +m.lon.toFixed(6); r[iLat("Candra")] = +m.lat.toFixed(6); r[iLon("Rāhu-true")] = +m.node.toFixed(6);
    n++;
  });
}
const rms = a => Math.sqrt(a.reduce((p, x) => p + x * x, 0) / a.length);
for (const k in before) console.log(`${k}: ${before[k].length} rows; DE431 Moon − the old (corrected modern) Moon: rms ${rms(before[k]).toFixed(1)}′, worst ${Math.max(...before[k].map(Math.abs)).toFixed(1)}′`);

/* DE431 against DE422 where both exist: 3000 – 1800 BCE and 2400 – 3000 CE */
const seam = [];
for (const [y0, y1] of [[-2998, -1800], [2400, 2998]]) for (let k = 0; k < 60; k++) {
  const d = new Date(Date.UTC(2000, 0, 1)); d.setUTCFullYear(y0 + (y1 - y0) * k / 59); seam.push(d.getTime() + k * 3.7e6);
}
const a = py("de431-moon.py", EPHE, seam.map(tt)), b = py("de422.py", DE422, seam.map(tt));
const dd = seam.map((ms, i) => ({ y: new Date(ms).getUTCFullYear(), d: sdiff(moonOf(a[i].r, a[i].v, ms).lon, moonOf(b[i].r.Moon, b[i].v.Moon, ms).lon) * 60 }));
const band = (lo, hi) => { const x = dd.filter(q => q.y >= lo && q.y <= hi).map(q => q.d); return { mean: +(x.reduce((p, v) => p + v, 0) / x.length).toFixed(2), rms: +rms(x).toFixed(2), n: x.length }; };
const seamDoc = { note: "DE431 Moon − DE422 Moon, longitude in the site's frame, arcminutes", "3000-2400 BCE": band(-2999, -2400), "2400-1800 BCE": band(-2399, -1800), "2400-3000 CE": band(2400, 2999) };
console.log("DE431 − DE422 Moon: " + JSON.stringify(seamDoc));

J._provenance.moon_and_true_node = "JPL DE431 (Folkner et al. 2014), read from the Swiss Ephemeris files (semom*.se1, github.com/aloistr/swisseph), through the same frame code — an integrated lunar orbit with the tidal dissipation, independent of the site's engines, over the whole span (DE431 is JPL's newer lunar solution; it differs from DE422's Moon by about 4′ at 3000 BCE and 0.05′ at 3000 CE). Until 17 Nov 2026 it was DE422 within 3000 BCE – 3000 CE and, outside it, astronomy-engine's Moon corrected onto DE422's tides (moon_correction, kept for the record).";
J._provenance.columns[1] = "source of the Sun and planets (0 DE422, 2 the integration); the Moon and true node are DE431 on every row";
J.moon_de431 = { added: "2026-11-17", everywhere: true, rows_replaced: n, seam_with_de422: seamDoc,
  frame: "geometric geocentric ICRF at TT, as DE422's Moon; Swiss flags SWIEPH|J2000|EQUATORIAL|XYZ|TRUEPOS|NOABERR|NOGDEFL|ICRS|SPEED" };
writeFileSync(FILE, JSON.stringify(J) + "\n");
console.log(`wrote ${FILE}: ${n} Moon rows from DE431`);
