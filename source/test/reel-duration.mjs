/* Do the reels record for the length the Studio says they do?
 *
 *   node source/test/reel-duration.mjs              check all five
 *   node source/test/reel-duration.mjs --record     also record one, end to end
 *
 * WHY THIS EXISTS. The strip advertises a length per reel, and that length is
 * derived — (12 + 6·log10 span-in-days) / speed — from settings the link
 * carries. So the advertised figure and the recorded one can disagree, and
 * when they did, nothing said so: applySky set the span by finding #mospann
 * and dispatching an event, that control is only rendered for scenes with a
 * span row, the reel scenes have none, and setting a control that is not there
 * is a no-op rather than an error. A reel billed at twelve seconds recorded for
 * sixty-eight, in a ten-megabyte file, and the only way to find out was to
 * record one and read the length off the panel afterwards.
 *
 * --record does exactly that, once, for the shortest reel: follows the link a
 * reader would click, waits for the file, and reports its size and the wall
 * time. It is slow by nature — the recorder draws and encodes every frame
 * deliberately, which is what makes the output constant frame rate — so it is
 * behind a flag rather than in the default run.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"};
const srv=createServer(async(q,r)=>{try{const b=await readFile(join(ROOT,normalize(decodeURIComponent((q.url||"/").split("?")[0])).replace(/^(\.\.[/\\])+/,"")));r.writeHead(200,{"content-type":T[extname(q.url)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>srv.listen(0,"127.0.0.1",()=>r(srv.address().port)));
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }
const b=await chromium.launch(); const pg=await b.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e&&e.message||e)));
await pg.goto(`http://127.0.0.1:${port}/studio.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>document.querySelectorAll("#streels .strcard").length>0,null,{timeout:45000});
const links=await pg.evaluate(()=>[...document.querySelectorAll("#streels [data-strrec]")].map(a=>({
  href:a.getAttribute("href"),
  title:a.closest(".strcard").querySelector("h3").textContent,
  says:+a.closest(".strcard").querySelector(".strsec").textContent.replace(/\D/g,"")
})));
console.log("\nthe advertised length against the derived one\n");
let bad=0;
for(const L of links){
  // open without recording
  const url="http://127.0.0.1:"+port+"/"+L.href.replace("&rec=1","");
  const p2=await (await b.newContext()).newPage();
  await p2.goto(url,{waitUntil:"load"});
  await p2.waitForFunction(()=>window.__moDurSecs&&window.__moState&&window.__moState().scene,null,{timeout:30000});
  await p2.waitForTimeout(700);
  /* __moState returns MO itself, so the span and the safe flag are read from
   where they live on it rather than from a flattened copy — a second export
   under that name to flatten them would be silently shadowed by this one. */
const st=await p2.evaluate(()=>{const M=window.__moState();return{
  d:window.__moDurSecs(), scene:M.scene, ratio:M.ratio, speed:M.speed,
  spanN:M.opt.spanN, spanU:M.opt.spanU, safe:M.safeLayout};});
  const ok = st.d>=10 && st.d<=30 && Math.abs(st.d-L.says)<=2;
  if(!ok) bad++;
  console.log(`  ${ok?"ok  ":"FAIL"} ${L.title.padEnd(32)} says ${String(L.says).padStart(2)}s  derived ${st.d.toFixed(1)}s` +
              `  scene=${st.scene} span=${st.spanN}${st.spanU} speed=${st.speed} ratio=${st.ratio} safe=${st.safe}`);
  await p2.close();
}
const b2 = b, port2 = port;

/* --record: follow the link a reader clicks, and wait for the file. */
if (process.argv.includes("--record")) {
  const shortest = links.reduce((a, b) => (a.says <= b.says ? a : b));
  console.log(`\nrecording "${shortest.title}" end to end\n`);
  const ctx = await b2.newContext({ acceptDownloads: true });
  const pg2 = await ctx.newPage();
  const t0 = Date.now();
  const want = pg2.waitForEvent("download", { timeout: 180000 });
  await pg2.goto("http://127.0.0.1:" + port2 + "/" + shortest.href, { waitUntil: "load" });
  const d = await want;
  const path = await d.path();
  const size = path ? (await stat(path)).size : 0;
  const msg = await pg2.evaluate(() => document.getElementById("movidmsg")?.textContent || "");
  const secs = (Date.now() - t0) / 1000;
  const length = +(msg.match(/([\d.]+) s,/) || [, 0])[1];
  const ok = Math.abs(length - shortest.says) <= 2 && size > 200000;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${d.suggestedFilename()}  ${(size / 1048576).toFixed(2)} MB` +
              `  ${length} s of video  (${secs.toFixed(1)} s of wall time)`);
  if (!ok) bad++;
  await ctx.close();
}

if(errs.length) console.log("page errors:",errs.slice(0,3));
console.log(`\n${bad?bad+" reel(s) do not record for the length advertised":"every reel records for the length the strip advertises, and all are 10–30 s"}`);
await b.close(); srv.close();
process.exit(bad?1:0);
