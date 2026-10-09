/* --- friendship chakras --- */
var NODEFR={Rahu:{f:["Jupiter","Venus","Saturn"],e:["Sun","Moon","Mars"]},
            Ketu:{f:["Mars","Venus"],e:["Sun","Moon"]}};
function natFriend(a,b){
  if(a===b)return "—";
  if(NODEFR[a]){return NODEFR[a].f.indexOf(b)>=0?"Friend":(NODEFR[a].e.indexOf(b)>=0?"Enemy":"Neutral");}
  if(NODEFR[b]&&!FR[a])return "Neutral";
  if(!FR[a])return "Neutral";
  if(FR[a].indexOf(b)>=0)return "Friend";
  if(EM[a].indexOf(b)>=0)return "Enemy";
  return "Neutral";
}
function friendshipSection(D){
  var P=ORD.filter(function(k){return D.P[k];});
  function grid(fn,title,note2){
    var h='<th></th>'+P.map(function(k){return "<th>"+GL[k]+"</th>";}).join("");
    var rows=P.map(function(a){
      return '<tr><td><b>'+GL[a]+'</b> '+esc(a)+'</td>'+P.map(function(b){
        var v=fn(a,b),col=v==="Friend"?"#1c6b46":(v==="Enemy"?"#a1493a":(v==="—"?"#c9c3b2":"#7a6f52"));
        var bg=v==="Friend"?"#e4f1e9":(v==="Enemy"?"#f8e7e2":"transparent");
        return '<td style="text-align:center;color:'+col+';background:'+bg+';font-weight:600">'+
          (v==="—"?"—":v.slice(0,1))+'</td>';}).join("")+'</tr>';});
    return '<h4 class="ksub">'+title+'</h4><p class="knote">'+note2+'</p>'+
      '<div class="ktwrap"><table class="ktbl"><thead><tr>'+h+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
  }
  // temporal: 2,3,4,10,11,12 from a planet's house = friend
  function temp(a,b){ if(a===b)return "—";
    var d=(((D.P[b].house-D.P[a].house)%12)+12)%12+1;
    return [2,3,4,10,11,12].indexOf(d)>=0?"Friend":"Enemy"; }
  function comp(a,b){ if(a===b)return "—";
    var n=natFriend(a,b),t=temp(a,b);
    if(n==="Friend"&&t==="Friend")return "Friend";      // adhimitra
    if(n==="Enemy"&&t==="Enemy")return "Enemy";          // adhishatru
    if(n==="Neutral"&&t==="Friend")return "Friend";
    if(n==="Neutral"&&t==="Enemy")return "Enemy";
    return "Neutral"; }
  return grid(natFriend,"Naisargika maitrī — natural","Fixed for every chart, from each planet's Moolatrikona (BPHS Ch. 3).")+
    grid(temp,"Tātkālika maitrī — temporal","Chart-specific: planets in the 2nd, 3rd, 4th, 10th, 11th or 12th from a planet are its temporary friends.")+
    grid(comp,"Pañchadhā maitrī — compound","Natural combined with temporal — the relationship actually used when weighing dignity.")+
    '<p class="klegend">F friend · N neutral · E enemy. Node friendships follow the common traditional table; BPHS '+
    'itself is not emphatic on the nodes.</p>';
}

