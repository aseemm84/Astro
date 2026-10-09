/* --- dignity --- */
function gbDignity(D,J,p){
  var g=D.P[p]; if(!g) return "";
  var sg=g.sign, deg=g.deg, lord=LORD[sg], rows="";
  rows+=gbRow("Sidereal longitude", gbFmt(g.sid,4)+"°", SA[sg]+" "+gbFmt(deg,4)+"°");
  rows+=gbRow("Sign lord (dispositor)", esc(lord), "lord of "+SA[sg]);
  var reason="";
  if(p==="Rahu"||p==="Ketu"){ reason="The nodes own no sign, so sign-dignity does not apply to them."; }
  else {
    var ex=EXALT[p], de=DEBIL[p], mt=MT[p];
    rows+=gbRow("Exaltation sign", SA[ex]+" · deepest at "+GB_EXALT_DEG[p]+"°", "BPHS Ch. 3, vv. 49–50");
    rows+=gbRow("Debilitation sign", SA[de]+" · deepest at "+GB_EXALT_DEG[p]+"°", "the 7th from exaltation");
    if(mt) rows+=gbRow("Moolatrikona", SA[mt[0]]+" "+mt[1]+"°–"+mt[2]+"°", "BPHS Ch. 3, vv. 51–54");
    if(sg===ex) reason="It stands in its exaltation sign.";
    else if(sg===de) reason="It stands in its debilitation sign.";
    else if(mt&&sg===mt[0]&&deg>=mt[1]&&deg<mt[2]) reason="It falls inside the Moolatrikona arc of the sign.";
    else if(OWN[p].indexOf(sg)>=0||lord===p) reason="The sign is one it owns.";
    else {
      var nat=(FR[p]&&FR[p].indexOf(lord)>=0)?"friend":((EM[p]&&EM[p].indexOf(lord)>=0)?"enemy":"neutral");
      rows+=gbRow("Natural relation to "+esc(lord), esc(nat),
        "friends are the lords of the 2nd, 4th, 5th, 8th, 9th and 12th from its Moolatrikona, plus the lord of its exaltation sign — BPHS Ch. 3, v. 55");
      reason="Its dispositor "+lord+" is a natural "+nat+", so the sign counts as "+nat+" ground.";
    }
  }
  var shown=g.dig;
  rows+=gbRow("<b>Dignity</b>","<b>"+esc(shown)+"</b>",reason);
  return gbWrap("How "+p+"’s dignity was decided","BPHS Ch. 3, vv. 49–58",rows,
    "Dignity describes the <i>ground</i> a planet stands on. How awake it is on that ground is avasthā, and how "+
    "strong it is overall is Ṣaḍbala — three separate questions.");
}
