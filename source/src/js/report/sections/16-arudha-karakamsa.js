/* --- Arudha Lagna chart + Karakamsa in the birth chart --- */
function alKarakamsaSection(D){
  var out='<div class="kcharts">';
  var al=(D.arudhas||[]).filter(function(a){return a.arudha_label==="AL";})[0];
  if(al) out+=chartFromSign(D,al.arudha_rashi_idx,"Ārūḍha Lagna chart","houses from the AL","AL");
  if(D.ckar&&D.ckar.length&&D.d9){
    var akEn=EN[D.ckar[0].graha]||D.ckar[0].graha, ks=D.d9[akEn];
    if(ks!=null) out+=chartFromSign(D,ks,"Kārakāṃśa in the birth chart","rāśi planets, Kārakāṃśa as lagna","AK");
  }
  out+='</div>';
  return '<p class="knote">Two further reference charts. The <b>Ārūḍha Lagna chart</b> re-reads the rāśi '+
    'positions from the AL, showing how the life looks from the outside rather than how it is. '+
    '<b>Kārakāṃśa in the birth chart</b> places the Ātmakāraka\'s navāṃśa sign as the lagna but keeps the rāśi '+
    'planets — the companion to the navāṃśa-based Kārakāṃśa shown earlier.</p>'+out;
}
