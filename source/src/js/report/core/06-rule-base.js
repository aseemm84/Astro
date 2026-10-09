/* --- rule base --- */
var HSIG={1:"body, vitality, temperament and the shape of life",2:"wealth, family, speech and sustenance",
3:"courage, effort, younger siblings and communication",4:"mother, home, land, vehicles and inner contentment",
5:"children, intelligence, creativity and past merit",6:"debts, disease, competition and service",
7:"spouse, partnership and dealings with others",8:"upheaval, hidden matters, inheritance and research",
9:"fortune, dharma, father, guru and higher learning",10:"profession, status, authority and action",
11:"gains, income, networks and fulfilment",12:"expenditure, loss, seclusion, foreign lands and liberation"};
var HKAR={1:"Sun",2:"Jupiter",3:"Mars",4:"Moon",5:"Jupiter",6:"Mars",7:"Venus",8:"Saturn",9:"Jupiter",10:"Saturn",11:"Jupiter",12:"Saturn"};
var PKAR={Sun:"soul, vitality, authority and father",Moon:"the mind, emotions and mother",
Mars:"courage, energy, land and younger siblings",Mercury:"intellect, speech, commerce and learning",
Jupiter:"wisdom, dharma, counsel, children and expansion",Venus:"relationship, refinement, comfort and art",
Saturn:"discipline, labour, endurance, delay and time",Rahu:"amplification, the unconventional and the foreign",
Ketu:"detachment, sharp insight and the inward turn"};
var DIGM={exalted:"its strongest positional footing",moolatrikona:"a root-trine placement, close to exaltation in strength",
own:"a comfortable, capable footing",friend:"supportive ground",neutral:"neutral ground that leaves the result to other factors",
enemy:"uneasy ground, so its results come with friction",debilitated:"its weakest footing unless the debilitation is cancelled",
node:"no fixed sign dignity, so it is judged through its dispositor and company"};
var CLSM={Kendra:"an angle — a load-bearing house where planets act visibly",
Trikona:"a trine — among the most auspicious houses",
Dusthana:"a house of difficulty, where matters are worked out the hard way",
Upachaya:"a growth house, whose matters improve with time and effort",
Maraka:"classed among the life-supporting houses used in longevity theory"};
var VSUBJ={D1:"the life as a whole",D2:"wealth and sustenance",D3:"siblings, courage and the body",
D4:"home, land and fixed property",D7:"children",D9:"marriage, dharma and the ripening of every planet",
D10:"profession and action",D12:"parents and ancestry",D16:"vehicles and comforts",D20:"spiritual practice",
D24:"education and learning",D27:"underlying strength and stamina",D30:"adversity and vulnerabilities",
D40:"maternal legacy",D45:"conduct and paternal legacy",D60:"the deepest karmic layer"};
var SRCP={bhava:"bhavas.html",dignity:"dignity.html",graha:"grahas.html",varga:"vargas.html",
av:"ashtakavarga.html",yoga:"yogas.html",dasha:"dashas.html",aspect:"aspects.html",sp:"special-points.html",
strength:"strength.html",lagna:"lagna.html"};
var SRCN={bhava:"Bhavas",dignity:"Dignity",graha:"Grahas",varga:"Vargas",av:"Ashtakavarga",yoga:"Yogas",
dasha:"Dashas",aspect:"Aspects",sp:"Special Points",strength:"Strength",lagna:"Lagna"};

function srcs(keys){return '<span class="kasrc">'+keys.map(function(k){
  return '<a href="'+SRCP[k]+'">'+SRCN[k]+'</a>';}).join(" · ")+'</span>';}
function note(title,brief,detail,keys){
  return '<div class="kanote"><b>'+esc(title)+'</b>'+brief+
    (detail?'<span class="kmore"> '+detail+'</span>':'')+(keys?srcs(keys):'')+'</div>';
}
function ord(n){return n+(["th","st","nd","rd"][(n%100-20)%10]||["th","st","nd","rd"][n%100]||"th");}
function list(a){a=a.filter(Boolean);if(!a.length)return "";if(a.length===1)return a[0];
  return a.slice(0,-1).join(", ")+" and "+a[a.length-1];}

