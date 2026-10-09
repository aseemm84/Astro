/* --- natal graha drishti (BPHS Ch.26): all aspect the 7th; Mars 4/8, Jupiter 5/9, Saturn 3/10 --- */
var ASPOFF={Sun:[6],Moon:[6],Mercury:[6],Venus:[6],Mars:[3,6,7],Jupiter:[4,6,8],Saturn:[2,6,9],Rahu:[6],Ketu:[6]};
function aspectsFrom(pl,house){return (ASPOFF[pl]||[6]).map(function(o){return ((house-1+o)%12)+1;});}

