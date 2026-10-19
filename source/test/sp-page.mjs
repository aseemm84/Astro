/* Does the Studio Pro page actually work in a browser?
 *
 *   node source/test/sp-page.mjs
 *
 * The other two tests drive the registry and the composers directly. This one
 * drives the PAGE: it loads it the way a visitor does, with and without a
 * stored birth chart, clicks real chips, and checks the three things that
 * would make the page useless while still looking fine —
 *
 *   the wall is populated and its chips are clickable;
 *   clicking one changes the canvas (a selection that does not alter a single
 *     pixel is the failure that is impossible to see in a screenshot of a
 *     dark canvas);
 *   and the page tells the truth about what it cannot do — greyed chips when
 *     there is no chart, and a stated reason for anything dropped.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { const { createRequire } = await import("node:module");
  ({ chromium } = createRequire(import.meta.url)("playwright")); }
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",
         ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
         ".webmanifest":"application/manifest+json"};
const server=createServer(async(q,r)=>{const u=decodeURIComponent((q.url||"/").split("?")[0]);
 try{const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
  r.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const base=`http://127.0.0.1:${port}`;
const br=await chromium.launch();

async function run(withChart) {
  const pg = await br.newPage();
  const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
  if (withChart) {
    await pg.addInitScript(() => {
      localStorage.setItem("nirayana.birth", JSON.stringify({
        year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
        tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
      localStorage.removeItem("nirayana.studiopro");
    });
  } else {
    await pg.addInitScript(() => { localStorage.clear(); });
  }
  await pg.goto(`${base}/studio-pro.html`,{waitUntil:"load"});
  await pg.waitForFunction(()=>window.__spUI && window.__spUI.nodeCount()>0,
                           {timeout:30000});
  const r = await pg.evaluate(() => {
    const out={};
    out.nodes=window.__spUI.nodeCount();
    out.chips=document.querySelectorAll(".spchip").length;
    out.groups=document.querySelectorAll(".spgrp").length;
    out.off=document.querySelectorAll(".spchip.off").length;
    out.absent=document.querySelectorAll("#sp-absent li").length;
    out.mode=(document.getElementById("sp-mode")||{}).textContent||"";
    out.hasChart=!!window.__spUI.ctx().J;

    const cv=document.getElementById("sp-canvas");
    const cx=cv.getContext("2d");
    const snap=()=>{ const d=cx.getImageData(0,0,cv.width,cv.height).data;
      let h=0,lit=0;
      for(let i=0;i<d.length;i+=4*97){ const v=d[i]+d[i+1]+d[i+2];
        h=(h*31+v)|0; if(v>170) lit++; }
      return {h,lit}; };

    /* click real chips on the wall, as a visitor would */
    const live=[].slice.call(document.querySelectorAll(".spchip:not(.off)"));
    out.liveChips=live.length;
    const before=snap();
    if (live.length) live[0].click();
    const after1=snap();
    if (live.length>3) live[3].click();
    const after2=snap();
    out.changedOnFirstClick = before.h!==after1.h;
    out.changedOnSecondClick = after1.h!==after2.h;
    out.litAfter = after2.lit;
    out.selected = document.querySelectorAll(".spchip.on").length;
    out.trayRows = document.querySelectorAll(".sprow").length;
    out.views = document.querySelectorAll(".spview").length;
    /* relation highlighting must actually fire for a graha longitude */
    window.__spUI.select(["sky.lon.Candra"]);
    out.relHighlighted = document.querySelectorAll(".spchip.rel").length;
    const rel = window.__spUI.related("sky.lon.Candra");
    out.relReasons = rel.length;
    out.relSample = rel.slice(0,2).map(r=>r.id+" — "+r.why);
    /* every related pair must carry a sentence */
    out.relBlank = rel.filter(r=>!r.why||!r.why.trim()).length;

    /* a deliberately awkward mixture must still draw, and must report */
    const res = window.__spUI.select(["sky.all","bala.total_rupa","pan.horas",
                                      "av.grid","geo.naks"]);
    out.mixComposer = res && res.composer;
    out.mixMissing = res ? res.missing.length : -1;
    out.mixOptions = res ? res.options.length : -1;
    const mixSnap = snap();
    out.mixLit = mixSnap.lit;

    /* the storyboard: three shots, each a different kind of picture, then
       checked that the stage actually moves between them */
    window.__spUI.select(["chart.d1"]);              window.__spUI.addShot();
    window.__spUI.select(["sky.lon.Sūrya","sky.lon.Candra"]); window.__spUI.addShot();
    window.__spUI.select(["av.grid"]);               window.__spUI.addShot();
    out.shotCount = window.__spUI.shots().length;
    out.shotRows = document.querySelectorAll("#sp-shots .sprow").length;
    out.storyOn = window.__spUI.setStory(true);
    out.total = window.SPStage.storyTotal(window.__spUI.shots());
    /* render at the middle of each shot; each must be a different picture,
       and the reported shot index must advance */
    const ctxd = window.__spUI.ctx();
    const seen = [], idx = [];
    [0.10, 0.45, 0.85].forEach(pp => {
      const r = window.SPStage.renderStory(window.__spUI.shots(), ctxd, pp);
      idx.push(r.shot);
      seen.push(snap().h);
    });
    out.storyIdx = idx;
    out.storyDistinct = new Set(seen).size;
    /* and the dip between shots must actually darken the frame */
    const at = window.SPStage.shotAt(window.__spUI.shots(), 0.333);
    window.SPStage.renderStory(window.__spUI.shots(), ctxd, 0.333);
    const boundary = snap().lit;
    window.SPStage.renderStory(window.__spUI.shots(), ctxd, 0.22);
    const middle = snap().lit;
    out.dipWorks = boundary < middle;
    out.dipAt = [boundary, middle];
    return out;
  });
  const html = await pg.content();
  r.navHasLink = html.indexOf('studio-pro.html') >= 0;
  r.errs = errs.slice(0,5);
  await pg.close();
  return r;
}

const A = await run(true);
const B = await run(false);

function show(tag, r) {
  console.log(`\n  ${tag}`);
  console.log(`    nodes ${r.nodes}   chips ${r.chips} in ${r.groups} groups   ` +
              `greyed ${r.off}   available ${r.liveChips}`);
  console.log(`    chart loaded: ${r.hasChart}`);
  console.log(`    clicking a chip changed the canvas: first ${r.changedOnFirstClick}, second ${r.changedOnSecondClick}`);
  console.log(`    tray rows ${r.trayRows}   views offered ${r.views}   selected ${r.selected}`);
  console.log(`    related to Candra: ${r.relReasons} nodes, ${r.relHighlighted} highlighted, ${r.relBlank} with no reason`);
  if (r.relSample && r.relSample.length) r.relSample.forEach(s=>console.log(`      ${s}`));
  console.log(`    awkward 5-node mixture → composer "${r.mixComposer}", ` +
              `${r.mixMissing} reported as unusable, ${r.mixOptions} views offered, lit ${r.mixLit}`);
  console.log(`    "what is not here" list: ${r.absent} entries`);
  console.log(`    storyboard: ${r.shotCount} shots, ${r.shotRows} rows, total ${r.total}s, ` +
              `indices at 10/45/85% = [${r.storyIdx}], ${r.storyDistinct}/3 distinct pictures, ` +
              `dip darkens: ${r.dipWorks} (${r.dipAt && r.dipAt.join(" vs ")})`);
  if (r.errs.length) { console.log("    page errors:"); r.errs.forEach(e=>console.log("      "+e)); }
}
show("with a birth chart stored", A);
show("with NO birth chart", B);

const checks=[
  ["the wall is populated", A.chips>150 && A.groups>=8],
  ["with a chart, almost everything is available", A.off < A.chips*0.15],
  ["with NO chart, the chart-only chips are greyed", B.off > 50],
  ["with NO chart, plenty still works", B.liveChips >= 40],
  ["clicking a chip changes the picture", A.changedOnFirstClick && A.changedOnSecondClick],
  ["the tray fills and offers views", A.trayRows>0 && A.views>0],
  ["relations fire and every one carries a reason",
   A.relReasons>0 && A.relHighlighted>0 && A.relBlank===0],
  ["an awkward five-node mixture still draws", !!A.mixComposer && A.mixLit>50],
  ["the page lists what it cannot do", A.absent>=6],
  ["the page is in the navigation", A.navHasLink],
  ["no page errors in either mode", A.errs.length===0 && B.errs.length===0],
  ["the storyboard takes shots and lists them", A.shotCount===3 && A.shotRows===3],
  ["the storyboard advances through its shots",
   A.storyIdx && A.storyIdx[0]===0 && A.storyIdx[2]===2 && A.storyDistinct===3],
  ["the cut between shots dips to black", A.dipWorks===true]
];
console.log("");
let bad=0;
for(const [n,ok] of checks){ if(!ok) bad++; console.log(`  ${ok?"ok  ":"FAIL"} ${n}`); }
console.log(bad?"\nFAIL":"\nthe page works, with a chart and without one");
await br.close(); server.close();
process.exit(bad?1:0);
