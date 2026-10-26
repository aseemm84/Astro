/* ===== Analyst-skill payload =====
   A second shape of the same facts.

   The full export (42-json-export.js) is organised for a human reading the file:
   birth data at the top, everything the page derives under `derived`, the sky at
   export time quarantined under `as_of`. An external analysis skill wants the same
   figures keyed for lookup instead — grahas by name rather than in a list, vargas by
   code, a `meta` block, strength fields suffixed with their unit.

   This builds that shape from the export. It computes nothing new: every number here
   is lifted or renamed, except the nakshatra name and lord, which are read off the
   longitude that is already in the file. Nothing is removed from the original export;
   this is a sibling, not a replacement.

   Where the two disagree on vocabulary the payload follows the target schema and
   keeps the engine's own word alongside it, so no reading of the file has to guess
   which convention a value is in. */

var SKP_DIGNITY={exalted:"exalted", moolatrikona:"moolatrikona", own:"own_sign",
  friend:"friend", neutral:"neutral", enemy:"enemy", debilitated:"debilitated"};

/* The target enum has no value for a node. Parāśara assigns Rāhu and Ketu no
   exaltation, own sign or friendship — the dignity ladder is for the seven. Rather
   than invent a rung, the schema-facing field takes the neutral value and the engine's
   own answer travels beside it under dignity_bphs. */
function skpDignity(d){
  if(SKP_DIGNITY[d]) return SKP_DIGNITY[d];
  return "neutral";
}
function skpYogaCategory(s){
  var t=(s||"").toLowerCase();
  if(t.indexOf("rāja")>=0||t.indexOf("raja")>=0) return "Raja";
  if(t.indexOf("dhana")>=0) return "Dhana";
  if(t.indexOf("nābhasa")>=0||t.indexOf("nabhasa")>=0||t.indexOf("saṅkhya")>=0||
     t.indexOf("ākṛti")>=0||t.indexOf("akrti")>=0||t.indexOf("dala")>=0||
     t.indexOf("āśraya")>=0) return "Nabhasa";
  if(t.indexOf("lunar")>=0||t.indexOf("candra")>=0||t.indexOf("chandra")>=0) return "Chandra";
  if(t.indexOf("solar")>=0||t.indexOf("sūrya")>=0||t.indexOf("surya")>=0) return "Surya";
  if(t.indexOf("doṣa")>=0||t.indexOf("dosha")>=0||t.indexOf("ariṣṭa")>=0||
     t.indexOf("arishta")>=0) return "Arishta";
  return "Other";
}
function skpJdToIso(jd){
  if(jd==null) return null;
  var ms=(jd-2440587.5)*86400000;
  if(!isFinite(ms)) return null;
  return new Date(Math.round(ms)).toISOString();
}
function skpBool(v){ return v==null?null:!!v; }

/* ---- grahas, keyed by English name, with the nakshatra spelled out ---- */
/* The lagna is not a graha and has no proper motion, but it does have a rate: the
   eastern horizon carries it through the rising sign in the time the engine has
   already computed as that sign's oblique ascension. Thirty degrees over that span is
   the instantaneous rate, and it is a real figure at this latitude rather than the
   360.99 deg/day a spherical average would give. */
function skpLagnaRate(J){
  var t=J.rashi_rising_times;
  if(!t||t.lagna_rashi_rising_minutes==null||!(t.lagna_rashi_rising_minutes>0)) return null;
  return 30/(t.lagna_rashi_rising_minutes/1440);
}
function skpGrahas(J){
  var out={};
  (J.grahas||[]).forEach(function(g){
    var name=EN[g.key]||g.key, lon=g.sidereal_deg, r=g.rashi||{};
    var ni=(lon==null)?null:nakOf(lon);
    var rec={
      longitude_nirayana:lon,
      rashi_index:r.idx,
      rashi_name:r.enName||r.iast||r.saName||null,
      rashi_name_iast:r.iast||r.saName||null,
      degree_in_rashi:r.degInSign,
      nakshatra_name:ni?ni.name:null,
      nakshatra_pada:(g.nakshatra_pada!=null)?g.nakshatra_pada:(ni?ni.pada:null),
      nakshatra_lord:ni?ni.lord:null,
      speed_deg_per_day:g.speed_deg_per_day,
      is_retrograde:skpBool(g.retrograde),
      dignity:skpDignity(g.dignity),
      dignity_bphs:g.dignity,
      ecliptic_latitude_deg:g.ecliptic_latitude_deg,
      combust:skpBool(g.combust),
      sun_separation_deg:g.sun_separation_deg
    };
    out[name]=rec;
  });
  if(J.lagna){
    var L=J.lagna, lr=L.rashi||{}, ln=(L.sidereal_deg==null)?null:nakOf(L.sidereal_deg);
    out.Lagna={
      longitude_nirayana:L.sidereal_deg,
      rashi_index:lr.idx,
      rashi_name:lr.enName||lr.iast||null,
      rashi_name_iast:lr.iast||lr.saName||null,
      degree_in_rashi:lr.degInSign,
      nakshatra_name:ln?ln.name:null,
      nakshatra_pada:(L.nakshatra_pada!=null)?L.nakshatra_pada:(ln?ln.pada:null),
      nakshatra_lord:ln?ln.lord:null,
      speed_deg_per_day:skpLagnaRate(J),
      is_retrograde:false,
      dignity:"neutral",
      dignity_bphs:null,
      note:"The lagna is a point on the ecliptic, not a graha. Its speed is the rate of "+
           "ascension through the rising r\u0101\u015bi at this latitude, not proper motion, "+
           "and dignity does not apply to it at all \u2014 the field is present only because "+
           "the record shape is shared."
    };
  }
  return out;
}

/* ---- vargas, keyed by code ---- */
function skpVargas(J){
  var out={};
  (J.vargas||[]).forEach(function(v){
    var gr={};
    Object.keys(v.positions||{}).forEach(function(k){ gr[EN[k]||k]=v.positions[k]; });
    out[v.varga]={ascendant_rashi:v.lagna, graha_rashis:gr,
                  name_sa:v.sa||null, karya:v.en||null};
  });
  return out;
}

/* ---- shadbala, with every field carrying its unit ---- */
function skpShadbala(J){
  var sb=(J.shadbala&&J.shadbala.planets)||[], out={};
  sb.forEach(function(p){
    out[p.graha]={
      sthana_bala_virupas:p.sthana,
      dig_bala_virupas:p.dig,
      kala_bala_virupas:p.kala,
      cheshta_bala_virupas:p.cheshta,
      naisargika_bala_virupas:p.naisargika,
      drik_bala_virupas:p.drik,
      total_virupas:p.total_virupa,
      total_rupas:p.total_rupa,
      required_rupas:p.required_rupa,
      strength_ratio:p.ratio,
      components:{
        uchcha_virupas:p.uchcha, saptavargaja_virupas:p.saptavargaja,
        ojha_yugma_virupas:p.ojha, kendradi_virupas:p.kendradi,
        drekkana_virupas:p.drekkana, nathonnatha_virupas:p.nathonnatha,
        paksha_virupas:p.paksha, tribhaga_virupas:p.tribhaga,
        varsha_masa_dina_hora_virupas:p.lord_bala, ayana_virupas:p.ayana
      }
    };
  });
  return {planets:out, context:(J.shadbala&&J.shadbala.context)||null,
    note:"Sthāna Bala is the sum of its five components; Kāla Bala of its six. Both "+
         "sums and parts are given. 60 virūpas = 1 rūpa. strength_ratio is "+
         "total_rupas ÷ required_rupas, so 1.0 is the BPHS minimum."};
}

/* ---- ashtakavarga under the names the schema uses ---- */
function skpAshtakavarga(J){
  var A=J.ashtakavarga||{}, bav={};
  (A.bhinna||[]).forEach(function(b){ bav[b.graha]={bindus:b.bindus, total:b.total}; });
  return {sarvashtakavarga:A.sarva||null, sarvashtakavarga_total:A.sarva_total,
          bav_by_planet:bav, natal_rashi_idx:A.natal_rashi_idx,
          note:"Both grids are indexed 0–11 from Meṣa, not from the lagna."};
}

/* ---- yogas: schema name/category, engine wording kept ---- */
function skpYogas(J){
  return (J.yogas||[]).map(function(y){
    return {name:y.iast||y.en||y.key, name_en:y.en||null, key:y.key||null,
            present:!!y.present, category:skpYogaCategory(y.category),
            category_detail:y.category||null,
            source:y.source||"not stated in this file",
            detail:y.detail||""};
  });
}

/* ---- arudhas keyed by label ---- */
function skpArudhas(J){
  var out={};
  (J.arudhas||[]).forEach(function(a){
    if(a.arudha_label) out[a.arudha_label]=a.arudha_rashi_idx;
  });
  /* The Upapada is the ar\u016b\u1e0dha of the twelfth. The engine labels it A12; the
     schema asks for it by its usual name. Same sign, two keys. */
  if(out.UL==null && out.A12!=null) out.UL=out.A12;
  return out;
}

/* ---- running dasha as one object per level ---- */
function skpRunningDasha(D){
  var r=(D&&D.running_dasha)||null; if(!r) return null;
  /* The levels arrive named in Sanskrit, in order, so fall back on the position in
     the list when a name is not one of the five known ones. */
  var LVL={"Mah\u0101da\u015b\u0101":"mahadasha","Antarda\u015b\u0101":"antardasha",
           "Pratyantar":"pratyantardasha","Pratyantarda\u015b\u0101":"pratyantardasha",
           "S\u016bk\u1e63ma":"sookshma","Pr\u0101\u1e47a":"prana",
           1:"mahadasha",2:"antardasha",3:"pratyantardasha",4:"sookshma",5:"prana"};
  var SEQ=["mahadasha","antardasha","pratyantardasha","sookshma","prana"];
  var out={};
  (Array.isArray(r)?r:[r]).forEach(function(x,ix){
    var k=LVL[x.level]||SEQ[ix]||("level_"+ix);
    out[k]={lord:x.lord, level_sa:x.level||null, start_jd:x.start_jd, end_jd:x.end_jd,
            start_utc:skpJdToIso(x.start_jd), end_utc:skpJdToIso(x.end_jd)};
  });
  return out;
}

/* ---- dasha tree with UTC dates alongside the Julian Days ---- */
function skpDashaTree(D){
  var t=(D&&D.vimshottari_tree)||null; if(!t) return null;
  function stamp(n){
    var o={}; for(var k in n) if(k!=="antardashas"&&k!=="pratyantardashas"&&k!=="sookshmas") o[k]=n[k];
    o.start_utc=skpJdToIso(n.start_jd); o.end_utc=skpJdToIso(n.end_jd);
    return o;
  }
  return t.map(function(md){
    var m=stamp(md);
    m.antardashas=(md.antardashas||[]).map(function(ad){
      var a=stamp(ad);
      a.pratyantardashas=(ad.pratyantardashas||[]).map(function(pd){
        var p=stamp(pd);
        if(pd.sookshmas) p.sookshmas=pd.sookshmas.map(stamp);
        return p;
      });
      return a;
    });
    return m;
  });
}

/* ---- pancanga at birth, under derived where the schema expects it ---- */
function skpPanchanga(J,D){
  if(D&&D.panchanga_at_birth){
    var q=D.panchanga_at_birth, c={};
    for(var k in q) c[k]=q[k];
    if(c.vaara==null) c.vaara=c.vara||null;   /* the schema's spelling */
    return c;
  }
  var b=J.birth_panchanga; if(!b) return null;
  return {tithi:b.tithi_sa, paksha:b.paksha_sa, tithi_of_30:b.tithi_of_30,
    vaara:b.vara_civil_sa, vaara_from_sunrise:b.vara_from_sunrise_sa,
    born_before_sunrise:skpBool(b.born_before_sunrise),
    nakshatra:b.nakshatra_sa, nakshatra_pada:b.nakshatra_pada,
    yoga:b.yoga_sa, karana:b.karana_sa,
    masa_amanta:b.masa_amanta, masa_purnimanta:b.masa_purnimanta,
    ritu:b.ritu, ayana:b.ayana,
    sun_moon_elongation_deg:b.sun_moon_elongation_deg,
    moon_illuminated_fraction:b.moon_illuminated_fraction,
    sunrise_local_hours:b.sunrise_local_hours, sunset_local_hours:b.sunset_local_hours};
}

/* ---- sensitivity flags as plain booleans, detail kept ---- */
function skpSensitivity(D){
  var s=(D&&D.sensitivity)||null; if(!s) return null;
  var m1=s.plus_minus_1_minute||{}, m4=s.plus_minus_4_minutes||{};
  function vshift(m,code){
    var v=m.varga_lagnas_changing;
    if(!v) return null;
    if(Array.isArray(v)) return v.indexOf(code)>=0;
    return !!v[code];
  }
  return {
    lagna_shift_1min:!!m1.lagna_changes_sign,
    lagna_shift_4min:!!m4.lagna_changes_sign,
    d9_lagna_shift_1min:vshift(m1,"D9"),
    d10_lagna_shift_1min:vshift(m1,"D10"),
    d9_lagna_shift_4min:vshift(m4,"D9"),
    d10_lagna_shift_4min:vshift(m4,"D10"),
    plus_minus_1_minute:m1, plus_minus_4_minutes:m4,
    note:s.note||null
  };
}

/* ---- conventions in the schema's vocabulary ---- */
function skpConventions(J,D){
  var c=(D&&D.conventions)||{};
  return {ayanamsa:J.ayanamsa_name||c.ayanamsa_in_use||null,
    ayanamsa_mode:J.ayanamsa_mode||null,
    ayanamsa_deg:J.ayanamsha_deg,
    node_reckoning:(J.node_mode==="true"||J.node_mode==="mean")?J.node_mode:(J.node_mode||"mean"),
    house_system:"Whole Sign (primary); Śrīpati cusps also given under derived.sripati",
    alternatives:c.alternatives||null,
    note:c.note||null};
}

/* ---- the payload ---- */
function buildJyotishaPayload(J){
  if(!J||!J.input) throw new Error("buildJyotishaPayload needs a cast chart with an input block");
  var D=J.derived||{}, i=J.input;

  var meta={
    name:i.name||null,
    datetime_utc:skpJdToIso(J.jd_utc),
    datetime_local:[i.year,("0"+i.month).slice(-2),("0"+i.day).slice(-2)].join("-")+
      "T"+("0"+i.hour).slice(-2)+":"+("0"+i.minute).slice(-2)+":00",
    julian_day:J.jd_utc,
    place:i.place||null,
    latitude:i.lat,
    longitude:i.lon,
    timezone_offset:i.tzHours,
    schema:"LearnHoroJyotishaChartPayload",
    schema_version:"1.1",
    engine:J.substrate_stamp||null,
    generated_utc:(D.as_of&&D.as_of.generated_iso)||new Date().toISOString()
  };

  var derived={};
  /* carry the whole derived layer through unchanged, then overlay the renamed views */
  for(var k in D) derived[k]=D[k];
  derived.panchanga_at_birth=skpPanchanga(J,D);
  derived.running_dasha=skpRunningDasha(D)||D.running_dasha||null;
  derived.vimshottari_tree=skpDashaTree(D)||D.vimshottari_tree||null;
  derived.sensitivity=skpSensitivity(D)||D.sensitivity||null;
  derived.conventions=skpConventions(J,D);
  derived.friendship=D.friendship||null;
  derived.bhavas=J.bhavas||null;
  derived.chara_karakas=J.chara_karakas||null;
  derived.avasthas=J.avasthas||null;
  derived.graha_yuddha=J.graha_yuddha||null;
  derived.bhayat_bhabhog=J.bhayat||null;
  derived.rashi_rising_times=J.rashi_rising_times||null;
  if(!derived.houses) derived.houses=skpHouses(J);
  if(!derived.chalit && D.sripati) derived.chalit={
    source:"derived.sripati.houses",
    note:"Bhāva chalita placements are the Śrīpati house assignments; compare "+
         "them with the whole-sign houses to see which grahas shift.",
    houses:D.sripati.houses||null};
  if(!derived.combust) derived.combust=skpCombust(J);
  if(!derived.status) derived.status=skpStatus(J);

  derived.payload_note=
    "This file is the analyst-skill view of the same cast. Field names follow the "+
    "LearnHoroJyotishaChartPayload schema; where the engine's own vocabulary differs it "+
    "travels alongside in a *_bphs or *_detail field rather than being dropped. No figure "+
    "here is computed differently from the standard export — nakṣatra names and "+
    "lords are read off longitudes already in the file, UTC timestamps off Julian Days "+
    "already in the file, and nothing else is new.";

  return {meta:meta, grahas:skpGrahas(J), vargas:skpVargas(J),
          shadbala:skpShadbala(J), ashtakavarga:skpAshtakavarga(J),
          yogas:skpYogas(J), arudhas:skpArudhas(J), derived:derived,
          input:i};
}
function skpHouses(J){
  var ls=J.lagna&&J.lagna.rashi?J.lagna.rashi.idx:null; if(ls==null) return null;
  var out={};
  for(var h=1;h<=12;h++){
    var sg=(ls+h-1)%12;
    out[h]={sign:sg, lord:LORD[sg], occupants:[]};
  }
  (J.grahas||[]).forEach(function(g){
    if(!g.rashi||g.rashi.idx==null) return;
    var h=((g.rashi.idx-ls)%12+12)%12+1;
    out[h].occupants.push(EN[g.key]||g.key);
  });
  return out;
}
function skpCombust(J){
  var out={};
  (J.grahas||[]).forEach(function(g){
    var n=EN[g.key]||g.key;
    out[n]={combust:skpBool(g.combust), separation_from_sun_deg:g.sun_separation_deg,
            combustion_orb_deg:g.combustion_orb_deg};
  });
  return out;
}
function skpStatus(J){
  var ls=J.lagna&&J.lagna.rashi?J.lagna.rashi.idx:null; if(ls==null) return null;
  var NAT={Sun:"malefic",Moon:"benefic",Mars:"malefic",Mercury:"benefic",
           Jupiter:"benefic",Venus:"benefic",Saturn:"malefic",Rahu:"malefic",Ketu:"malefic"};
  var out={};
  (J.grahas||[]).forEach(function(g){
    var n=EN[g.key]||g.key, owns=[];
    for(var h=1;h<=12;h++){ if(LORD[(ls+h-1)%12]===n) owns.push(h); }
    out[n]={natural:NAT[n]||null, owns_houses:owns,
            kendra_lord:owns.some(function(h){return [1,4,7,10].indexOf(h)>=0;}),
            trikona_lord:owns.some(function(h){return [1,5,9].indexOf(h)>=0;}),
            dusthana_lord:owns.some(function(h){return [6,8,12].indexOf(h)>=0;})};
  });
  out.note="Natural status is Parāśara's classification. Functional status is left as "+
    "house ownership rather than a benefic/malefic verdict, because BPHS judges a lord by "+
    "what it owns together with its strength and placement, not by lordship alone.";
  return out;
}
if(typeof window!=="undefined") window.buildJyotishaPayload=buildJyotishaPayload;
