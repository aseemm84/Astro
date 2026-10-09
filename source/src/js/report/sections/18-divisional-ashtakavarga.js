/* --- ashtakavarga of a divisional chart --- */
function vargaAvSection(D){
  var AVTAB=(window.__AVT||{});
  if(!AVTAB.Sun) return "";
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  function avFor(code){
    var v=null; D.vargas.forEach(function(x){ if(x.code===code) v=x; });
    if(!v||v.lagna==null) return null;
    var sarva=new Array(12).fill(0), per=[];
    order.forEach(function(pl){
      var b=new Array(12).fill(0);
      Object.keys(AVTAB[pl]).forEach(function(c){
        var from=(c==="Lagna")?v.lagna:v.pos[c];
        if(from==null) return;
        AVTAB[pl][c].forEach(function(h){ b[(from+h-1)%12]++; });
      });
      per.push({graha:pl,bindus:b,total:b.reduce(function(a,x){return a+x;},0)});
      for(var i=0;i<12;i++) sarva[i]+=b[i];
    });
    return {v:v,per:per,sarva:sarva,total:sarva.reduce(function(a,x){return a+x;},0)};
  }
  var blocks="";
  [["D9","navāṃśa"],["D10","daśāṃśa"]].forEach(function(cd){
    var r=avFor(cd[0]); if(!r) return;
    var hdr='<th>Graha</th>';
    for(var h=1;h<=12;h++) hdr+='<th>'+SA[(r.v.lagna+h-1)%12].slice(0,4)+'<br><span class="kthin">H'+h+'</span></th>';
    hdr+='<th>Total</th>';
    var rows=r.per.map(function(b){
      var c='';
      for(var h=1;h<=12;h++){ var sg=(r.v.lagna+h-1)%12, x=b.bindus[sg];
        var a=(x-1)/6;
        c+='<td class="kb" style="background:'+(x>=4?"rgba(28,107,70,"+(0.06+a*0.42).toFixed(2)+")":
            "rgba(161,73,58,"+(0.06+(4-x)/3*0.3).toFixed(2)+")")+'">'+x+'</td>'; }
      return '<tr><td><b>'+esc(b.graha)+'</b></td>'+c+'<td class="knum"><b>'+b.total+'</b></td></tr>';
    });
    var sc=''; for(var h3=1;h3<=12;h3++) sc+='<td class="kb kbsav">'+r.sarva[(r.v.lagna+h3-1)%12]+'</td>';
    rows.push('<tr><td><b>SAV</b></td>'+sc+'<td class="knum"><b>'+r.total+'</b></td></tr>');
    blocks+='<h4 class="ksub">'+cd[0]+' — '+cd[1]+' <span class="kmut">(lagna '+SA[r.v.lagna]+')</span></h4>'+
      '<div class="ktwrap"><table class="ktbl khm"><thead><tr>'+hdr+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
  });
  return '<p class="knote">The same benefic-point rules applied inside a divisional chart, counting from that '+
    'varga\'s own lagna and the varga positions of the planets. Used to test whether a division\'s houses are '+
    'supported, not just occupied. The grand total is 337 in every chart, as it must be.</p>'+blocks;
}
