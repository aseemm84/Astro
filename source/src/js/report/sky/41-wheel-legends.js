/* ===== Legends: what every abbreviation on the wheels stands for ===== */
var WL_GRAHA=[["Su","Sun"],["Mo","Moon"],["Ma","Mars"],["Me","Mercury"],["Ju","Jupiter"],
              ["Ve","Venus"],["Sa","Saturn"],["Ra","Rāhu"],["Ke","Ketu"]];
var WL_POINT=[["Lg","natal lagna"],["MC","midheaven"],["BL","Bhāva lagna"],["HL","Horā lagna"],
              ["GL","Ghaṭika lagna"],["AL","Ārūḍha lagna"],["KK","Kārakāṃśa"]];
var WL_UPA=[["Dh","Dhūma"],["Vy","Vyatīpāta"],["Pa","Parivesha"],["In","Indracāpa"],["Up","Upaketu"]];
function wlRow(label,items,cls){
  return '<div class="wlrow"><span class="wlk">'+esc(label)+'</span><span class="wlv">'+
    items.map(function(x){
      return '<span class="wlitem"><b class="'+(cls||"")+'">'+esc(x[0])+'</b> '+esc(x[1])+'</span>';
    }).join("")+'</span></div>';
}
function wlSwatch(colour,label,extra){
  return '<span class="wlitem"><i class="wlsw" style="background:'+colour+
    (extra||"")+'"></i>'+esc(label)+'</span>';
}
function wheelLegend(kind){
  var o='<div class="wlegend">';
  o+=wlRow("Grahas",WL_GRAHA,"wl-g");
  o+='<div class="wlrow"><span class="wlk">Marks</span><span class="wlv">'+
     '<span class="wlitem"><b>℞</b> retrograde</span>'+
     '<span class="wlitem">degree shown beside each graha is its position within its sign</span>'+
     '</span></div>';
  if(kind==="ecliptic"){
    o+='<div class="wlrow"><span class="wlk">Rings</span><span class="wlv">'+
       '<span class="wlitem"><b>outer, bold</b> gochara — where the grahas stand at the moment shown</span>'+
       '<span class="wlitem"><b style="color:#767c96">inner, grey</b> natal — where they stood at birth</span>'+
       '<span class="wlitem">a crowded graha steps inward along its own bearing, never sideways</span>'+
       '</span></div>';
    o+='<div class="wlrow"><span class="wlk">Axes</span><span class="wlv">'+
       '<span class="wlitem"><b style="color:#a1493a">Lagna</b> the rising degree</span>'+
       '<span class="wlitem"><b style="color:#3f6fa6">MC</b> the meridian, rāśi chart only</span>'+
       '<span class="wlitem">outer band rāśis, inner band nakṣatras, fine ticks pādas</span>'+
       '</span></div>';
    o+='<div class="wlrow"><span class="wlk">Dṛṣṭi</span><span class="wlv">'+
       '<span class="wlitem"><i class="wlln" style="background:#2f7d55"></i>benefic glance</span>'+
       '<span class="wlitem"><i class="wlln" style="background:#b5533c"></i>malefic glance</span>'+
       '<span class="wlitem">solid is the 7th, dashed a special aspect</span>'+
       '<span class="wlitem">the dot marks the degree the glance falls on</span>'+
       '<span class="wlitem">shown one graha at a time, by choice</span>'+
       '</span></div>';
  }
  if(kind==="star"){
    o+=wlRow("Points",WL_POINT,"wl-s");
    o+=wlRow("Upagrahas",WL_UPA,"wl-u");
    o+='<div class="wlrow"><span class="wlk">Stars</span><span class="wlv">'+
       wlSwatch("#ffe9a8","yogatāra — the star a nakṣatra is named for")+
       wlSwatch("#cfd9ff","bright star near the ecliptic")+
       '<span class="wlitem"><i class="wlln" style="background:#4a6a8a"></i>star lies inside its own division</span>'+
       '<span class="wlitem"><i class="wlln" style="background:#c4643f"></i>star lies outside it</span>'+
       '<span class="wlitem">disc size follows magnitude; dimmed below the horizon</span>'+
       '</span></div>';
    o+='<div class="wlrow"><span class="wlk">Marker</span><span class="wlv">'+
       wlSwatch("#ffd67a","graha")+wlSwatch("#ff9d6e","natal lagna")+
       wlSwatch("#9fc0ea","special lagna")+wlSwatch("#9ad1b0","upagraha")+
       wlSwatch("#e0a9d6","ārūḍha or kārakāṃśa")+
       '<span class="wlitem">numbers on the outer band are house compartments</span>'+
       '</span></div>';
  }
  if(kind==="dome"){
    o+='<div class="wlrow"><span class="wlk">Sky</span><span class="wlv">'+
       '<span class="wlitem"><b>N E S W</b> compass points on the horizon</span>'+
       '<span class="wlitem">centre is the zenith, rim is the horizon</span>'+
       '<span class="wlitem">dashed rings mark 30° and 60° altitude</span>'+
       '<span class="wlitem">the dotted arc is the ecliptic</span>'+
       '<span class="wlitem">figure beneath each graha is its altitude</span>'+
       '<span class="wlitem">bodies below the horizon are named, not drawn</span>'+
       '</span></div>';
  }
  o+='</div>';
  return o;
}
