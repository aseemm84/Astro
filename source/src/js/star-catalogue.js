/* ===== Star catalogue =====
   All 27 yogatārās — the junction stars the nakṣatras are named for — plus bright
   stars near the ecliptic for context.

   Source: the HYG database (Hipparcos/Yale/Gliese compilation), stars identified by
   Bayer or Flamsteed designation and constellation, carrying HR numbers. Verified
   three ways before shipping:
     · Spica agrees with Swiss Ephemeris to 18.8 arcseconds
     · HYG agrees with the star list bundled in PyEphem to 0.6 arcseconds across the
       sixteen stars both carry
     · a positional cross-match into the Yale Bright Star Catalogue reproduced all
       sixteen with sub-arcsecond separation and matching magnitudes
   HYG's entry id 0 is the Sun, carried with placeholder coordinates; it and any
   zero-distance row are excluded.

   sid = sidereal longitude under Lahiri at J2000. lat = ecliptic latitude, which
   Jyotisha ignores but the sky does not. `inside` records whether the star actually
   falls within the equal 13°20' division named after it — seven do not. */
var STAR_AY_J2000=23.85631;
var YOGATARAS=[
  {id:0,nak:"Aśvinī",bayer:"β Ari",star:"Sheratan",hr:"553",sid:10.114,lat:8.487,mag:2.64,inside:true},
  {id:1,nak:"Bharaṇī",bayer:"41 Ari",star:"Bharani",hr:"838",sid:24.347,lat:10.450,mag:3.61,inside:true},
  {id:2,nak:"Kṛttikā",bayer:"η Tau",star:"Alcyone",hr:"1165",sid:36.136,lat:4.051,mag:2.85,inside:true},
  {id:3,nak:"Rohiṇī",bayer:"α Tau",star:"Aldebaran",hr:"1457",sid:45.933,lat:-5.467,mag:0.87,inside:true},
  {id:4,nak:"Mṛgaśīrṣā",bayer:"λ Ori",star:"Meissa",hr:"1879",sid:59.851,lat:-13.369,mag:3.39,inside:true},
  {id:5,nak:"Ārdrā",bayer:"α Ori",star:"Betelgeuse",hr:"2061",sid:64.898,lat:-16.027,mag:0.45,inside:false},
  {id:6,nak:"Punarvasu",bayer:"β Gem",star:"Pollux",hr:"2990",sid:89.360,lat:6.684,mag:1.16,inside:true},
  {id:7,nak:"Puṣya",bayer:"δ Cnc",star:"Asellus Australis",hr:"3461",sid:104.866,lat:0.077,mag:3.94,inside:true},
  {id:8,nak:"Āśleṣā",bayer:"ε Hya",star:"Ashlesha",hr:"3482",sid:108.488,lat:-11.104,mag:3.38,inside:true},
  {id:9,nak:"Maghā",bayer:"α Leo",star:"Regulus",hr:"3982",sid:125.973,lat:0.465,mag:1.36,inside:true},
  {id:10,nak:"Pūrva Phalgunī",bayer:"δ Leo",star:"Zosma",hr:"4357",sid:137.460,lat:14.334,mag:2.56,inside:true},
  {id:11,nak:"Uttara Phalgunī",bayer:"β Leo",star:"Denebola",hr:"4534",sid:147.761,lat:12.267,mag:2.14,inside:true},
  {id:12,nak:"Hasta",bayer:"δ Crv",star:"Algorab",hr:"4757",sid:169.595,lat:-12.196,mag:2.94,inside:true},
  {id:13,nak:"Citrā",bayer:"α Vir",star:"Spica",hr:"5056",sid:179.985,lat:-2.054,mag:0.98,inside:true},
  {id:14,nak:"Svātī",bayer:"α Boo",star:"Arcturus",hr:"5340",sid:180.377,lat:30.736,mag:-0.05,inside:false},
  {id:15,nak:"Viśākhā",bayer:"α Lib",star:"Zubenelgenubi",hr:"5531",sid:201.226,lat:0.333,mag:2.75,inside:true},
  {id:16,nak:"Anurādhā",bayer:"δ Sco",star:"Dschubba",hr:"5953",sid:218.715,lat:-1.986,mag:2.29,inside:true},
  {id:17,nak:"Jyeṣṭhā",bayer:"α Sco",star:"Antares",hr:"6134",sid:225.906,lat:-4.570,mag:1.06,inside:false},
  {id:18,nak:"Mūla",bayer:"λ Sco",star:"Shaula",hr:"6527",sid:240.729,lat:-13.788,mag:1.62,inside:true},
  {id:19,nak:"Pūrvāṣāḍhā",bayer:"ε Sgr",star:"Kaus Australis",hr:"6879",sid:251.222,lat:-11.052,mag:1.79,inside:false},
  {id:20,nak:"Uttarāṣāḍhā",bayer:"σ Sgr",star:"Nunki",hr:"7121",sid:258.529,lat:-3.450,mag:2.05,inside:false},
  {id:21,nak:"Śravaṇa",bayer:"α Aql",star:"Altair",hr:"7557",sid:277.920,lat:29.303,mag:0.76,inside:false},
  {id:22,nak:"Dhaniṣṭhā",bayer:"β Del",star:"Rotanev",hr:"7882",sid:292.485,lat:31.918,mag:3.64,inside:false},
  {id:23,nak:"Śatabhiṣā",bayer:"γ Aqr",star:"Sadachbia",hr:"8518",sid:312.858,lat:8.235,mag:3.86,inside:true},
  {id:24,nak:"Pūrva Bhādrapadā",bayer:"α Peg",star:"Markab",hr:"8781",sid:329.629,lat:19.406,mag:2.49,inside:true},
  {id:25,nak:"Uttara Bhādrapadā",bayer:"γ Peg",star:"Algenib",hr:"39",sid:345.300,lat:12.600,mag:2.83,inside:true},
  {id:26,nak:"Revatī",bayer:"ζ Psc",star:"Revati",hr:"361",sid:356.021,lat:-0.213,mag:5.21,inside:true},
];
/* bright stars within 30° of the ecliptic, magnitude 2.3 or brighter */
var BRIGHT_STARS=[
  {star:"Mirach",sid:6.549,lat:25.943,mag:2.07},
  {star:"Hamal",sid:13.806,lat:9.965,mag:2.01},
  {star:"Almach",sid:20.369,lat:27.806,mag:2.10},
  {star:"Algol",sid:32.311,lat:22.429,mag:2.09},
  {star:"Bellatrix",sid:57.090,lat:-16.816,mag:1.64},
  {star:"Capella",sid:58.002,lat:22.864,mag:0.08},
  {star:"Mintaka",sid:58.506,lat:-23.553,mag:2.25},
  {star:"Elnath",sid:58.719,lat:5.385,mag:1.65},
  {star:"Alnilam",sid:59.607,lat:-24.506,mag:1.69},
  {star:"Alnitak",sid:60.825,lat:-25.293,mag:1.74},
  {star:"Menkalinan",sid:66.054,lat:21.508,mag:1.90},
  {star:"Alhena",sid:75.248,lat:-6.743,mag:1.93},
  {star:"Castor",sid:86.384,lat:10.096,mag:1.58},
  {star:"Procyon",sid:91.929,lat:-16.020,mag:0.40},
  {star:"Alphard",sid:123.423,lat:-22.382,mag:1.99},
  {star:"Algieba",sid:125.759,lat:8.815,mag:2.01},
  {star:"Menkent",sid:198.452,lat:-22.080,mag:2.06},
  {star:"Larawag",sid:231.479,lat:-11.738,mag:2.29},
  {star:"Sargas",sid:241.743,lat:-19.645,mag:1.86},
  {star:"Fomalhaut",sid:310.004,lat:-21.136,mag:1.17},
  {star:"Diphda",sid:338.727,lat:-20.784,mag:2.04},
  {star:"Alpheratz",sid:350.452,lat:25.680,mag:2.07},
];
var YOGATARAS_MISSING=[];   /* none — the catalogue is complete */
