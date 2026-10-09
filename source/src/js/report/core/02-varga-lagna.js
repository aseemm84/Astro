/* ---------- divisional chart lagnas (formulas verified against engine positions) ---------- */
function vargaLagna(code,sid){
  var s=Math.floor(sid/30)%12,d=sid-s*30,odd=(s%2===0),M=s%3,p;
  switch(code){
    case "D1": return s;
    case "D2": var h=(d<15)?0:1; return odd?(h===0?4:3):(h===0?3:4);
    case "D3": return (s+[0,4,8][Math.floor(d/10)])%12;
    case "D4": return (s+[0,3,6,9][Math.floor(d/7.5)])%12;
    case "D7": p=Math.floor(d/(30/7)); return odd?(s+p)%12:(s+6+p)%12;
    case "D9": return Math.floor(sid/(30/9))%12;
    case "D10": p=Math.floor(d/3); return odd?(s+p)%12:(s+8+p)%12;
    case "D12": return (s+Math.floor(d/2.5))%12;
    case "D16": return ([0,4,8][M]+Math.floor(d/1.875))%12;
    case "D20": return ([0,8,4][M]+Math.floor(d/1.5))%12;
    case "D24": return ((odd?4:3)+Math.floor(d/1.25))%12;
    case "D27": return ([0,3,6,9][s%4]+Math.floor(d/(30/27)))%12;
    case "D30":
      if(odd){ if(d<5)return 0; if(d<10)return 10; if(d<18)return 8; if(d<25)return 2; return 6; }
      if(d<5)return 1; if(d<12)return 5; if(d<20)return 11; if(d<25)return 9; return 7;
    case "D40": return ((odd?0:6)+Math.floor(d/0.75))%12;
    case "D45": return ([0,4,8][M]+Math.floor(d/(30/45)))%12;
    case "D60": return (s+Math.floor(d*2))%12;
  }
  return null;
}
var CRUX={D1:[1,"the life as a whole"],D2:[2,"wealth & sustenance"],D3:[3,"siblings & courage"],
 D4:[4,"home, land & property"],D7:[5,"children"],D9:[7,"spouse & dharma"],D10:[10,"profession"],
 D12:[4,"parents"],D16:[4,"vehicles & comforts"],D20:[5,"spiritual practice"],D24:[5,"learning"],
 D27:[1,"vitality & strength"],D30:[6,"adversity & health"],D40:[4,"maternal legacy"],
 D45:[9,"paternal legacy & conduct"],D60:[1,"the karmic totality"]};

