/* The whole gate, run the way it has to be run.
 *
 * WHY THIS EXISTS. There was no single command for the gate, so it was run by
 * hand — and run wrong: four suites at a time, including the two that assert
 * WALL-CLOCK budgets (a reel template must build in under nine seconds; the
 * ceremony must be brief). Under that load both failed while the code was
 * fine, and the honest response to a gate that fails for the wrong reason is
 * not to loosen a budget a user actually feels — it is to stop measuring
 * time on a machine that is busy measuring other things. So:
 *
 *   - every suite whose checks are about CORRECTNESS runs in parallel;
 *   - every suite with a TIMING assertion runs afterwards, ALONE.
 *
 * A suite added to source/test/ is picked up automatically. A suite that adds
 * a wall-clock assertion belongs in TIMED below, with its reason.
 *
 * Run from the repository root:
 *   node source/test/run-all.mjs            # build first: python3 source/build.py
 *   node source/test/run-all.mjs --jobs 2   # fewer parallel workers
 *   node source/test/run-all.mjs --keep     # keep the per-suite logs
 */
import { readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DIR = "source/test";
const TIMED = {
  "cosmos-verify":     "the ceremony must be brief — seconds of wall clock",
  "reelstudio-verify": "every template must build in under 9 s",
};
const EXTRA = ["run-self-test", "page-smoke", "report-contrast", "calendar-nav"];
const ji = process.argv.indexOf("--jobs");
const JOBS = ji > 0 ? Math.max(1, +process.argv[ji + 1] || 4) : 4;
const KEEP = process.argv.includes("--keep");
const PER_SUITE_MS = 8 * 60 * 1000;

const all = readdirSync(DIR).filter((f) => /-verify\.mjs$/.test(f)).map((f) => f.slice(0, -4))
  .concat(EXTRA.filter((n) => readdirSync(DIR).includes(n + ".mjs"))).sort();
const timed = all.filter((n) => n in TIMED);
const par = all.filter((n) => !(n in TIMED));
const logs = mkdtempSync(join(tmpdir(), "gate-"));

function run(n) {
  return new Promise((res) => {
    const t0 = Date.now(), out = [];
    const p = spawn(process.execPath, [join(DIR, n + ".mjs")], { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => out.push(d)); p.stderr.on("data", (d) => out.push(d));
    const kill = setTimeout(() => p.kill("SIGKILL"), PER_SUITE_MS);
    p.on("close", (code) => {
      clearTimeout(kill);
      const text = Buffer.concat(out).toString();
      writeFileSync(join(logs, n + ".log"), text);
      const last = text.trim().split("\n").reverse()
        .find((l) => /passed|failed|^PASS|^FAIL|checks passed/.test(l)) || "";
      res({ n, code: code == null ? 124 : code, s: (Date.now() - t0) / 1000, last: last.trim() });
    });
  });
}

async function pool(names, jobs) {
  const q = names.slice(), done = [];
  async function worker() { while (q.length) done.push(await run(q.shift())); }
  await Promise.all(Array.from({ length: Math.min(jobs, names.length) }, worker));
  return done;
}

const T0 = Date.now();
console.log(`gate: ${par.length} suites in parallel (${JOBS} at a time), then ${timed.length} timed suites alone`);
const R = (await pool(par, JOBS)).concat(await pool(timed, 1));
R.sort((a, b) => (a.code === 0) - (b.code === 0) || a.n.localeCompare(b.n));
for (const r of R)
  console.log(`  ${r.code === 0 ? "ok  " : "FAIL"} ${r.n.padEnd(26)} ${r.s.toFixed(0).padStart(4)} s  ` +
              `${r.n in TIMED ? "[alone] " : ""}${r.last.slice(0, 70)}`);
const bad = R.filter((r) => r.code !== 0);
console.log(`\n${R.length - bad.length}/${R.length} suites pass in ${((Date.now() - T0) / 60000).toFixed(1)} min` +
            (bad.length || KEEP ? `  — logs in ${logs}` : ""));
if (!bad.length && !KEEP) rmSync(logs, { recursive: true, force: true });
process.exit(bad.length ? 1 : 0);
