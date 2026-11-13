/*! astronomy-engine v2 — MIT License — https://github.com/cosinekitty/astronomy */
/*
 MIT


    Astronomy library for JavaScript (browser and Node.js).
    https://github.com/cosinekitty/astronomy

    MIT License

    Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
var $jscomp=$jscomp||{};$jscomp.scope={};$jscomp.createTemplateTagFirstArg=function(r){return r.raw=r};$jscomp.createTemplateTagFirstArgWithRaw=function(r,u){r.raw=u;return r};$jscomp.arrayIteratorImpl=function(r){var u=0;return function(){return u<r.length?{done:!1,value:r[u++]}:{done:!0}}};$jscomp.arrayIterator=function(r){return{next:$jscomp.arrayIteratorImpl(r)}};$jscomp.makeIterator=function(r){var u="undefined"!=typeof Symbol&&Symbol.iterator&&r[Symbol.iterator];return u?u.call(r):$jscomp.arrayIterator(r)};
$jscomp.getGlobal=function(r){r=["object"==typeof globalThis&&globalThis,r,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global];for(var u=0;u<r.length;++u){var e=r[u];if(e&&e.Math==Math)return e}throw Error("Cannot find global object");};$jscomp.global=$jscomp.getGlobal(this);$jscomp.ASSUME_ES5=!1;$jscomp.ASSUME_NO_NATIVE_MAP=!1;$jscomp.ASSUME_NO_NATIVE_SET=!1;$jscomp.SIMPLE_FROUND_POLYFILL=!1;$jscomp.ISOLATE_POLYFILLS=!1;$jscomp.FORCE_POLYFILL_PROMISE=!1;
$jscomp.FORCE_POLYFILL_PROMISE_WHEN_NO_UNHANDLED_REJECTION=!1;$jscomp.defineProperty=$jscomp.ASSUME_ES5||"function"==typeof Object.defineProperties?Object.defineProperty:function(r,u,e){if(r==Array.prototype||r==Object.prototype)return r;r[u]=e.value;return r};$jscomp.IS_SYMBOL_NATIVE="function"===typeof Symbol&&"symbol"===typeof Symbol("x");$jscomp.TRUST_ES6_POLYFILLS=!$jscomp.ISOLATE_POLYFILLS||$jscomp.IS_SYMBOL_NATIVE;$jscomp.polyfills={};$jscomp.propertyToPolyfillSymbol={};
$jscomp.POLYFILL_PREFIX="$jscp$";var $jscomp$lookupPolyfilledValue=function(r,u){var e=$jscomp.propertyToPolyfillSymbol[u];if(null==e)return r[u];e=r[e];return void 0!==e?e:r[u]};$jscomp.polyfill=function(r,u,e,C){u&&($jscomp.ISOLATE_POLYFILLS?$jscomp.polyfillIsolated(r,u,e,C):$jscomp.polyfillUnisolated(r,u,e,C))};
$jscomp.polyfillUnisolated=function(r,u,e,C){e=$jscomp.global;r=r.split(".");for(C=0;C<r.length-1;C++){var A=r[C];if(!(A in e))return;e=e[A]}r=r[r.length-1];C=e[r];u=u(C);u!=C&&null!=u&&$jscomp.defineProperty(e,r,{configurable:!0,writable:!0,value:u})};
$jscomp.polyfillIsolated=function(r,u,e,C){var A=r.split(".");r=1===A.length;C=A[0];C=!r&&C in $jscomp.polyfills?$jscomp.polyfills:$jscomp.global;for(var w=0;w<A.length-1;w++){var Q=A[w];if(!(Q in C))return;C=C[Q]}A=A[A.length-1];e=$jscomp.IS_SYMBOL_NATIVE&&"es6"===e?C[A]:null;u=u(e);null!=u&&(r?$jscomp.defineProperty($jscomp.polyfills,A,{configurable:!0,writable:!0,value:u}):u!==e&&(void 0===$jscomp.propertyToPolyfillSymbol[A]&&($jscomp.propertyToPolyfillSymbol[A]=$jscomp.IS_SYMBOL_NATIVE?$jscomp.global.Symbol(A):
$jscomp.POLYFILL_PREFIX+A),$jscomp.defineProperty(C,$jscomp.propertyToPolyfillSymbol[A],{configurable:!0,writable:!0,value:u})))};$jscomp.polyfill("Math.log10",function(r){return r?r:function(u){return Math.log(u)/Math.LN10}},"es6","es3");$jscomp.polyfill("Number.isFinite",function(r){return r?r:function(u){return"number"!==typeof u?!1:!isNaN(u)&&Infinity!==u&&-Infinity!==u}},"es6","es3");
$jscomp.polyfill("Math.hypot",function(r){return r?r:function(u){if(2>arguments.length)return arguments.length?Math.abs(arguments[0]):0;var e,C,A;for(e=A=0;e<arguments.length;e++)A=Math.max(A,Math.abs(arguments[e]));if(1E100<A||1E-100>A){if(!A)return A;for(e=C=0;e<arguments.length;e++){var w=Number(arguments[e])/A;C+=w*w}return Math.sqrt(C)*A}for(e=C=0;e<arguments.length;e++)w=Number(arguments[e]),C+=w*w;return Math.sqrt(C)}},"es6","es3");
$jscomp.polyfill("Number.MAX_SAFE_INTEGER",function(){return 9007199254740991},"es6","es3");$jscomp.polyfill("Number.isInteger",function(r){return r?r:function(u){return Number.isFinite(u)?u===Math.floor(u):!1}},"es6","es3");$jscomp.polyfill("Number.isSafeInteger",function(r){return r?r:function(u){return Number.isInteger(u)&&Math.abs(u)<=Number.MAX_SAFE_INTEGER}},"es6","es3");
$jscomp.polyfill("Math.cbrt",function(r){return r?r:function(u){if(0===u)return u;u=Number(u);var e=Math.pow(Math.abs(u),1/3);return 0>u?-e:e}},"es6","es3");
(function(r){"object"===typeof exports&&"undefined"!==typeof module?module.exports=r():"function"===typeof define&&define.amd?define([],r):("undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:this).Astronomy=r()})(function(){return function(){function r(u,e,C){function A(N,T){if(!e[N]){if(!u[N]){var ka="function"==typeof require&&require;if(!T&&ka)return ka(N,!0);if(w)return w(N,!0);T=Error("Cannot find module '"+N+"'");throw T.code="MODULE_NOT_FOUND",
T;}T=e[N]={exports:{}};u[N][0].call(T.exports,function(sa){return A(u[N][1][sa]||sa)},T,T.exports,r,u,e,C)}return e[N].exports}for(var w="function"==typeof require&&require,Q=0;Q<C.length;Q++)A(C[Q]);return A}return r}()({1:[function(r,u,e){function C(a){switch(a){case m.Sun:return 2.959122082855911E-4;case m.Mercury:return 4.912547451450812E-11;case m.Venus:return 7.243452486162703E-10;case m.Earth:return 8.887692390113509E-10;case m.Moon:return 1.093189565989891E-11;case m.EMB:return 8.997011346712498E-10;
case m.Mars:return 9.549535105779258E-11;case m.Jupiter:return 2.825345909524226E-7;case m.Saturn:return 8.459715185680659E-8;case m.Uranus:return 1.292024916781969E-8;case m.Neptune:return 1.524358900784276E-8;case m.Pluto:return 2.18869976542597E-12;default:throw"Do not know mass product for body: "+a;}}function A(a){if(!0!==a&&!1!==a)throw console.trace(),"Value is not boolean: "+a;return a}function w(a){if(!Number.isFinite(a))throw console.trace(),"Value is not a finite number: "+a;return a}function Q(a){return a-
Math.floor(a)}function N(a,b){var c=a.x*a.x+a.y*a.y+a.z*a.z;if(1E-8>Math.abs(c))throw"AngleBetween: first vector is too short.";var d=b.x*b.x+b.y*b.y+b.z*b.z;if(1E-8>Math.abs(d))throw"AngleBetween: second vector is too short.";a=(a.x*b.x+a.y*b.y+a.z*b.z)/Math.sqrt(c*d);return-1>=a?180:1<=a?0:e.RAD2DEG*Math.acos(a)}function T(a){a=ld.indexOf(a);return 0<=a?md[a]:null}function ka(a){return(a=T(a))&&0<a.dist?a:null}function sa(a){var b=2E3+(a-14)/365.24217;if(-500>b)return a=(b-1820)/100,-20+32*a*a;
if(500>b){a=b/100;b=a*a;var c=a*b;return 10583.6-1014.41*a+33.78311*b-5.952053*c-.1798452*b*b+.022174192*b*c+.0090316521*c*c}if(1600>b)return a=(b-1E3)/100,b=a*a,c=a*b,1574.2-556.01*a+71.23472*b+.319781*c-.8503463*b*b-.005050998*b*c+.0083572073*c*c;if(1700>b)return a=b-1600,b=a*a,120-.9808*a-.01532*b+a*b/7129;if(1800>b)return a=b-1700,b=a*a,8.83+.1603*a-.0059285*b+1.3336E-4*a*b-b*b/1174E3;if(1860>b){a=b-1800;b=a*a;c=a*b;var d=b*b;return 13.72-.332447*a+.0068612*b+.0041116*c-3.7436E-4*d+1.21272E-5*
b*c-1.699E-7*c*c+8.75E-10*c*d}if(1900>b)return a=b-1860,b=a*a,c=a*b,7.62+.5737*a-.251754*b+.01680668*c-4.473624E-4*b*b+b*c/233174;if(1920>b)return a=b-1900,b=a*a,-2.79+1.494119*a-.0598939*b+.0061966*a*b-1.97E-4*b*b;if(1941>b)return a=b-1920,b=a*a,21.2+.84493*a-.0761*b+.0020936*a*b;if(1961>b)return a=b-1950,b=a*a,29.07+.407*a-b/233+a*b/2547;if(1986>b)return a=b-1975,b=a*a,45.45+1.067*a-b/260-a*b/718;if(2005>b)return a=b-2E3,b=a*a,c=a*b,63.86+.3345*a-.060374*b+.0017275*c+6.51814E-4*b*b+2.373599E-5*
b*c;if(2050>b)return a=b-2E3,62.92+.32217*a+.005589*a*a;if(2150>b)return a=(b-1820)/100,-20+32*a*a-.5628*(2150-b);a=(b-1820)/100;return-20+32*a*a}function Vb(a){return a+Wb(a)/86400}function v(a){return a instanceof O?a:new O(a)}function Xb(a){a=a.tt/36525;return(((((-4.34E-8*a-5.76E-7)*a+.0020034)*a-1.831E-4)*a-46.836769)*a+84381.406)/3600}function da(a){if(!$a||1E-6<Math.abs($a.tt-a.tt)){var b=a.tt/36525;var c=(1287104.79305+1.295965810481E8*b)%1296E3*4.84813681109536E-6;var d=(335779.526232+1.7395272628478E9*
b)%1296E3*4.84813681109536E-6,f=(450160.398036-6962890.5431*b)%1296E3*4.84813681109536E-6,g=Math.sin(f),h=Math.cos(f),l=(-172064161-174666*b)*g+33386*h,k=(92052331+9086*b)*h+15377*g;h=2*(d-(1072260.70369+1.602961601209E9*b)%1296E3*4.84813681109536E-6+f);g=Math.sin(h);h=Math.cos(h);l+=(-13170906-1675*b)*g-13696*h;k+=(5730336-3015*b)*h-4587*g;h=2*(d+f);g=Math.sin(h);h=Math.cos(h);l+=(-2276413-234*b)*g+2796*h;k+=(978459-485*b)*h+1374*g;h=2*f;g=Math.sin(h);h=Math.cos(h);l+=(2074554+207*b)*g-698*h;k+=
(-897492+470*b)*h-291*g;g=Math.sin(c);h=Math.cos(c);c=-1.35E-4+1E-7*(l+((1475877-3633*b)*g+11817*h));b=3.88E-4+1E-7*(k+((73871-184*b)*h-1924*g));g=Xb(a);$a={tt:a.tt,dpsi:c,deps:b,ee:c*Math.cos(g*e.DEG2RAD)/15,mobl:g,tobl:g+b/3600}}return $a}function Yb(a,b){var c=a*e.DEG2RAD;a=Math.cos(c);c=Math.sin(c);return[b[0],b[1]*a-b[2]*c,b[1]*c+b[2]*a]}function ea(a){function b(D,G,P,fa){for(var L=[],ta=0;ta<=G-D;++ta){var ua=L,ub=ua.push,vb,Zb=P,nd=fa,$b=[];for(vb=0;vb<=nd-Zb;++vb)$b.push(0);ub.call(ua,{min:Zb,
array:$b})}return{min:D,array:L}}function c(D,G,P){D=D.array[G-D.min];return D.array[P-D.min]}function d(D,G,P){D=y.array[D-y.min];D.array[G-D.min]=P}function f(D,G,P){D=x.array[D-x.min];D.array[G-D.min]=P}function g(D,G,P,fa,L){L(D*P-G*fa,G*P+D*fa)}function h(D){return Math.sin(U*D)}function l(D,G,P,fa){var L={x:1,y:0};D=[0,D,G,P,fa];for(G=1;4>=G;++G)0!==D[G]&&g(L.x,L.y,c(y,D[G],G),c(x,D[G],G),function(ta,ua){return L.x=ta,L.y=ua});return L}function k(D,G,P,fa,L,ta,ua,ub){L=l(L,ta,ua,ub);q+=D*L.y;
t+=G*L.y;ab+=P*L.x;va+=fa*L.x}++e.CalcMoonCount;a=a.tt/36525;var n,p,q,t,y=b(-6,6,1,4),x=b(-6,6,1,4);var z=a*a;var ab=t=q=0;var va=3422.7;var la=h(.19833+.05611*a);var ha=h(.27869+.04508*a);var V=h(.16827-.36903*a);var ba=h(.34734-5.37261*a);var La=h(.10498-5.37899*a);var bb=h(.42681-.41855*a),od=h(.14943-5.37511*a);var cb=.84*la+.31*ha+14.27*V+7.26*ba+.28*La+.24*bb;var wb=2.94*la+.31*ha+14.27*V+9.34*ba+1.12*La+.83*bb;var db=-6.4*la-1.89*bb;ha=.21*la+.31*ha+14.27*V-88.7*ba-15.3*La+.24*bb-1.86*od;
V=cb-db;la=-3.332E-6*h(.59734-5.37261*a)-5.39E-7*h(.35498-5.37899*a)-6.4E-8*h(.39943-5.37511*a);cb=U*Q(.60643382+1336.85522467*a-3.13E-6*z)+cb/ia;wb=U*Q(.37489701+1325.55240982*a+2.565E-5*z)+wb/ia;db=U*Q(.99312619+99.99735956*a-4.4E-7*z)+db/ia;ha=U*Q(.25909118+1342.2278298*a-8.92E-6*z)+ha/ia;La=U*Q(.82736186+1236.85308708*a-3.97E-6*z)+V/ia;for(n=1;4>=n;++n){switch(n){case 1:V=wb;z=4;ba=1.000002208;break;case 2:V=db;z=3;ba=.997504612-.002495388*a;break;case 3:V=ha;z=4;ba=1.000002708+139.978*la;break;
case 4:V=La;z=6;ba=1;break;default:throw"Internal error: I = "+n;}d(0,n,1);d(1,n,Math.cos(V)*ba);f(0,n,0);f(1,n,Math.sin(V)*ba);for(p=2;p<=z;++p)g(c(y,p-1,n),c(x,p-1,n),c(y,1,n),c(x,1,n),function(D,G){return d(p,n,D),f(p,n,G)});for(p=1;p<=z;++p)d(-p,n,c(y,p,n)),f(-p,n,-c(x,p,n))}k(13.902,14.06,-.001,.2607,0,0,0,4);k(.403,-4.01,.394,.0023,0,0,0,3);k(2369.912,2373.36,.601,28.2333,0,0,0,2);k(-125.154,-112.79,-.725,-.9781,0,0,0,1);k(1.979,6.98,-.445,.0433,1,0,0,4);k(191.953,192.72,.029,3.0861,1,0,0,2);
k(-8.466,-13.51,.455,-.1093,1,0,0,1);k(22639.5,22609.07,.079,186.5398,1,0,0,0);k(18.609,3.59,-.094,.0118,1,0,0,-1);k(-4586.465,-4578.13,-.077,34.3117,1,0,0,-2);k(3.215,5.44,.192,-.0386,1,0,0,-3);k(-38.428,-38.64,.001,.6008,1,0,0,-4);k(-.393,-1.43,-.092,.0086,1,0,0,-6);k(-.289,-1.59,.123,-.0053,0,1,0,4);k(-24.42,-25.1,.04,-.3,0,1,0,2);k(18.023,17.93,.007,.1494,0,1,0,1);k(-668.146,-126.98,-1.302,-.3997,0,1,0,0);k(.56,.32,-.001,-.0037,0,1,0,-1);k(-165.145,-165.06,.054,1.9178,0,1,0,-2);k(-1.877,-6.46,
-.416,.0339,0,1,0,-4);k(.213,1.02,-.074,.0054,2,0,0,4);k(14.387,14.78,-.017,.2833,2,0,0,2);k(-.586,-1.2,.054,-.01,2,0,0,1);k(769.016,767.96,.107,10.1657,2,0,0,0);k(1.75,2.01,-.018,.0155,2,0,0,-1);k(-211.656,-152.53,5.679,-.3039,2,0,0,-2);k(1.225,.91,-.03,-.0088,2,0,0,-3);k(-30.773,-34.07,-.308,.3722,2,0,0,-4);k(-.57,-1.4,-.074,.0109,2,0,0,-6);k(-2.921,-11.75,.787,-.0484,1,1,0,2);k(1.267,1.52,-.022,.0164,1,1,0,1);k(-109.673,-115.18,.461,-.949,1,1,0,0);k(-205.962,-182.36,2.056,1.4437,1,1,0,-2);k(.233,
.36,.012,-.0025,1,1,0,-3);k(-4.391,-9.66,-.471,.0673,1,1,0,-4);k(.283,1.53,-.111,.006,1,-1,0,4);k(14.577,31.7,-1.54,.2302,1,-1,0,2);k(147.687,138.76,.679,1.1528,1,-1,0,0);k(-1.089,.55,.021,0,1,-1,0,-1);k(28.475,23.59,-.443,-.2257,1,-1,0,-2);k(-.276,-.38,-.006,-.0036,1,-1,0,-3);k(.636,2.27,.146,-.0102,1,-1,0,-4);k(-.189,-1.68,.131,-.0028,0,2,0,2);k(-7.486,-.66,-.037,-.0086,0,2,0,0);k(-8.096,-16.35,-.74,.0918,0,2,0,-2);k(-5.741,-.04,0,-9E-4,0,0,2,2);k(.255,0,0,0,0,0,2,1);k(-411.608,-.2,0,-.0124,0,0,
2,0);k(.584,.84,0,.0071,0,0,2,-1);k(-55.173,-52.14,0,-.1052,0,0,2,-2);k(.254,.25,0,-.0017,0,0,2,-3);k(.025,-1.67,0,.0031,0,0,2,-4);k(1.06,2.96,-.166,.0243,3,0,0,2);k(36.124,50.64,-1.3,.6215,3,0,0,0);k(-13.193,-16.4,.258,-.1187,3,0,0,-2);k(-1.187,-.74,.042,.0074,3,0,0,-4);k(-.293,-.31,-.002,.0046,3,0,0,-6);k(-.29,-1.45,.116,-.0051,2,1,0,2);k(-7.649,-10.56,.259,-.1038,2,1,0,0);k(-8.627,-7.59,.078,-.0192,2,1,0,-2);k(-2.74,-2.54,.022,.0324,2,1,0,-4);k(1.181,3.32,-.212,.0213,2,-1,0,2);k(9.703,11.67,-.151,
.1268,2,-1,0,0);k(-.352,-.37,.001,-.0028,2,-1,0,-1);k(-2.494,-1.17,-.003,-.0017,2,-1,0,-2);k(.36,.2,-.012,-.0043,2,-1,0,-4);k(-1.167,-1.25,.008,-.0106,1,2,0,0);k(-7.412,-6.12,.117,.0484,1,2,0,-2);k(-.311,-.65,-.032,.0044,1,2,0,-4);k(.757,1.82,-.105,.0112,1,-2,0,2);k(2.58,2.32,.027,.0196,1,-2,0,0);k(2.533,2.4,-.014,-.0212,1,-2,0,-2);k(-.344,-.57,-.025,.0036,0,3,0,-2);k(-.992,-.02,0,0,1,0,2,2);k(-45.099,-.02,0,-.001,1,0,2,0);k(-.179,-9.52,0,-.0833,1,0,2,-2);k(-.301,-.33,0,.0014,1,0,2,-4);k(-6.382,-3.37,
0,-.0481,1,0,-2,2);k(39.528,85.13,0,-.7136,1,0,-2,0);k(9.366,.71,0,-.0112,1,0,-2,-2);k(.202,.02,0,0,1,0,-2,-4);k(.415,.1,0,.0013,0,1,2,0);k(-2.152,-2.26,0,-.0066,0,1,2,-2);k(-1.44,-1.3,0,.0014,0,1,-2,2);k(.384,-.04,0,0,0,1,-2,-2);k(1.938,3.6,-.145,.0401,4,0,0,0);k(-.952,-1.58,.052,-.013,4,0,0,-2);k(-.551,-.94,.032,-.0097,3,1,0,0);k(-.482,-.57,.005,-.0045,3,1,0,-2);k(.681,.96,-.026,.0115,3,-1,0,0);k(-.297,-.27,.002,-9E-4,2,2,0,-2);k(.254,.21,-.003,0,2,-2,0,-2);k(-.25,-.22,.004,.0014,1,3,0,-2);k(-3.996,
0,0,4E-4,2,0,2,0);k(.557,-.75,0,-.009,2,0,2,-2);k(-.459,-.38,0,-.0053,2,0,-2,2);k(-1.298,.74,0,4E-4,2,0,-2,0);k(.538,1.14,0,-.0141,2,0,-2,-2);k(.263,.02,0,0,1,1,2,0);k(.426,.07,0,-6E-4,1,1,-2,-2);k(-.304,.03,0,3E-4,1,-1,2,0);k(-.372,-.19,0,-.0027,1,-1,-2,2);k(.418,0,0,0,0,0,4,0);k(-.33,-.04,0,0,3,0,2,0);z=-526.069*l(0,0,1,-2).y;z+=-3.352*l(0,0,1,-4).y;z+=44.297*l(1,0,1,-2).y;z+=-6*l(1,0,1,-4).y;z+=20.599*l(-1,0,1,0).y;z+=-30.598*l(-1,0,1,-2).y;z+=-24.649*l(-2,0,1,0).y;z+=-2*l(-2,0,1,-2).y;z+=-22.571*
l(0,1,1,-2).y;z+=10.985*l(0,-1,1,-2).y;q+=.82*h(.7736-62.5512*a)+.31*h(.0466-125.1025*a)+.35*h(.5785-25.1042*a)+.66*h(.4591+1335.8075*a)+.64*h(.313-91.568*a)+1.14*h(.148+1331.2898*a)+.21*h(.5918+1056.5859*a)+.44*h(.5784+1322.8595*a)+.24*h(.2275-5.7374*a)+.28*h(.2965+2.6929*a)+.33*h(.3132+6.3368*a);a=ha+t/ia;a=(1.000002708+139.978*la)*(18518.511+1.189+ab)*Math.sin(a)-6.24*Math.sin(3*a)+z;return{geo_eclip_lon:U*Q((cb+q/ia)/U),geo_eclip_lat:Math.PI/648E3*a,distance_au:ia*pd/(.999953253*va)}}function ac(a,
b){return[a.rot[0][0]*b[0]+a.rot[1][0]*b[1]+a.rot[2][0]*b[2],a.rot[0][1]*b[0]+a.rot[1][1]*b[1]+a.rot[2][1]*b[2],a.rot[0][2]*b[0]+a.rot[1][2]*b[1]+a.rot[2][2]*b[2]]}function wa(a,b,c){b=Ma(b,c);return ac(b,a)}function Ma(a,b){a=a.tt/36525;var c=84381.406,d=((((3.337E-7*a-4.67E-7)*a-.00772503)*a+.0512623)*a-.025754)*a+c;c*=4.84813681109536E-6;var f=((((-9.51E-8*a+1.32851E-4)*a-.00114045)*a-1.0790069)*a+5038.481507)*a*4.84813681109536E-6;d*=4.84813681109536E-6;var g=((((-5.6E-8*a+1.70663E-4)*a-.00121197)*
a-2.3814292)*a+10.556403)*a*4.84813681109536E-6;a=Math.sin(c);c=Math.cos(c);var h=Math.sin(-f);f=Math.cos(-f);var l=Math.sin(-d);d=Math.cos(-d);var k=Math.sin(g),n=Math.cos(g);g=n*f-h*k*d;var p=n*h*c+k*d*f*c-a*k*l,q=n*h*a+k*d*f*a+c*k*l,t=-k*f-h*n*d,y=-k*h*c+n*d*f*c-a*n*l;k=-k*h*a+n*d*f*a+c*n*l;h*=l;n=-l*f*c-a*d;a=-l*f*a+d*c;if(b===F.Into2000)return new J([[g,p,q],[t,y,k],[h,n,a]]);if(b===F.From2000)return new J([[g,t,h],[p,y,n],[q,k,a]]);throw"Invalid precess direction";}function ca(a){if(!eb||eb.tt!==
a.tt){var b=a.tt/36525,c=15*da(a).ee,d=(.779057273264+.00273781191135448*a.ut+a.ut%1)%1*360;0>d&&(d+=360);b=((c+.014506+((((-3.68E-8*b-2.9956E-5)*b-4.4E-7)*b+1.3915817)*b+4612.156534)*b)/3600+d)%360/15;0>b&&(b+=24);eb={tt:a.tt,st:b}}return eb.st}function bc(a){a=v(a);return ca(a)}function xb(a,b){var c=a.latitude*e.DEG2RAD,d=Math.sin(c);c=Math.cos(c);var f=1/Math.hypot(c,.996647180302104*d),g=a.height/1E3,h=6378.1366*f+g;b=(15*b+a.longitude)*e.DEG2RAD;a=Math.sin(b);b=Math.cos(b);return{pos:[h*c*b/
e.KM_PER_AU,h*c*a/e.KM_PER_AU,(6335.438815127603*f+g)*d/e.KM_PER_AU],vel:[-7.292115E-5*h*c*a*86400/e.KM_PER_AU,7.292115E-5*h*c*b*86400/e.KM_PER_AU,0]}}function xa(a,b,c){b=Na(b,c);return ac(b,a)}function Na(a,b){a=da(a);var c=a.mobl*e.DEG2RAD,d=a.tobl*e.DEG2RAD,f=4.84813681109536E-6*a.dpsi;a=Math.cos(c);c=Math.sin(c);var g=Math.cos(d),h=Math.sin(d);d=Math.cos(f);var l=Math.sin(f);f=-l*a;var k=-l*c,n=l*g,p=d*a*g+c*h,q=d*c*g-a*h;l*=h;var t=d*a*h-c*g;a=d*c*h+a*g;if(b===F.From2000)return new J([[d,n,
l],[f,p,t],[k,q,a]]);if(b===F.Into2000)return new J([[d,f,k],[n,p,q],[l,t,a]]);throw"Invalid precess direction";}function fb(a,b,c){return c===F.Into2000?wa(xa(a,b,c),b,c):xa(wa(a,b,c),b,c)}function cc(a,b){var c=ca(a);b=xb(b,c).pos;return fb(b,a,F.Into2000)}function qd(a){if(!(a instanceof Array)||3!==a.length)return!1;for(var b=0;3>b;++b){if(!(a[b]instanceof Array)||3!==a[b].length)return!1;for(var c=0;3>c;++c)if(!Number.isFinite(a[b][c]))return!1}return!0}function yb(a,b){return new E(a[0],a[1],
a[2],b)}function dc(a,b){b=yb(a,b);var c=b.x*b.x+b.y*b.y,d=Math.sqrt(c+b.z*b.z);if(0===c){if(0===b.z)throw"Indeterminate sky coordinates";return new gb(0,0>b.z?-90:90,d,b)}var f=e.RAD2HOUR*Math.atan2(b.y,b.x);0>f&&(f+=24);return new gb(f,e.RAD2DEG*Math.atan2(a[2],Math.sqrt(c)),d,b)}function ya(a,b){var c=a*e.DEG2RAD;a=Math.cos(c);c=Math.sin(c);return[a*b[0]+c*b[1],a*b[1]-c*b[0],b[2]]}function hb(a,b,c,d,f){a=v(a);za(b);w(c);w(d);var g=Math.sin(b.latitude*e.DEG2RAD),h=Math.cos(b.latitude*e.DEG2RAD),
l=Math.sin(b.longitude*e.DEG2RAD),k=Math.cos(b.longitude*e.DEG2RAD);b=Math.sin(d*e.DEG2RAD);var n=Math.cos(d*e.DEG2RAD),p=Math.sin(c*e.HOUR2RAD),q=Math.cos(c*e.HOUR2RAD),t=[h*k,h*l,g];g=[-g*k,-g*l,h];l=[l,-k,0];h=-15*ca(a);a=ya(h,t);t=ya(h,g);l=ya(h,l);b=[n*q,n*p,b];p=b[0]*a[0]+b[1]*a[1]+b[2]*a[2];n=b[0]*t[0]+b[1]*t[1]+b[2]*t[2];t=b[0]*l[0]+b[1]*l[1]+b[2]*l[2];q=Math.hypot(n,t);0<q?(n=-e.RAD2DEG*Math.atan2(t,n),0>n&&(n+=360)):n=0;p=e.RAD2DEG*Math.atan2(q,p);q=d;if(f&&(d=p,f=Oa(f,90-p),p-=f,0<f&&3E-4<
p)){c=Math.sin(p*e.DEG2RAD);q=Math.cos(p*e.DEG2RAD);t=Math.sin(d*e.DEG2RAD);d=Math.cos(d*e.DEG2RAD);f=[];for(l=0;3>l;++l)f.push((b[l]-d*a[l])/t*c+a[l]*q);q=Math.hypot(f[0],f[1]);0<q?(c=e.RAD2HOUR*Math.atan2(f[1],f[0]),0>c&&(c+=24)):c=0;q=e.RAD2DEG*Math.atan2(f[2],q)}return new ec(n,90-p,c,q)}function za(a){if(!(a instanceof zb))throw"Not an instance of the Observer class: "+a;w(a.latitude);w(a.longitude);w(a.height);if(-90>a.latitude||90<a.latitude)throw"Latitude "+a.latitude+" is out of range. Must be -90..+90.";
return a}function fc(a){a=v(a).AddDays(-1/e.C_AUDAY);var b=Aa(M.Earth,a),c=$jscomp.makeIterator(fb([-b.x,-b.y,-b.z],a,F.From2000));b=c.next().value;var d=c.next().value,f=c.next().value,g=e.DEG2RAD*da(a).tobl;c=Math.cos(g);g=Math.sin(g);a=new E(b,d,f,a);return Ab(a,c,g)}function Pa(a,b,c,d,f){za(c);A(d);A(f);b=v(b);c=cc(b,c);a=W(a,b,f);a=[a.x-c[0],a.y-c[1],a.z-c[2]];if(!d)return dc(a,b);d=fb(a,b,F.From2000);return dc(d,b)}function Ab(a,b,c){var d=a.x,f=a.y*b+a.z*c;c=-a.y*c+a.z*b;var g=Math.hypot(d,
f);b=0;0<g&&(b=e.RAD2DEG*Math.atan2(f,d),0>b&&(b+=360));g=e.RAD2DEG*Math.atan2(c,g);a=new E(d,f,c,a.t);return new gc(a,g,b)}function Qa(a){var b=da(a.t),c=wa([a.x,a.y,a.z],a.t,F.From2000),d=$jscomp.makeIterator(xa(c,a.t,F.From2000));c=d.next().value;var f=d.next().value;d=d.next().value;a=new E(c,f,d,a.t);b=b.tobl*e.DEG2RAD;return Ab(a,Math.cos(b),Math.sin(b))}function Y(a){a=v(a);var b=ea(a),c=b.distance_au*Math.cos(b.geo_eclip_lat);b=[c*Math.cos(b.geo_eclip_lon),c*Math.sin(b.geo_eclip_lon),b.distance_au*
Math.sin(b.geo_eclip_lat)];b=Yb(Xb(a),b);b=wa(b,a,F.Into2000);return new E(b[0],b[1],b[2],a)}function ib(a){var b=v(a);a=ea(b);var c=a.distance_au*Math.cos(a.geo_eclip_lat),d=[c*Math.cos(a.geo_eclip_lon),c*Math.sin(a.geo_eclip_lon),a.distance_au*Math.sin(a.geo_eclip_lat)];c=da(b);d=Yb(c.mobl,d);d=xa(d,b,F.From2000);b=yb(d,b);c=c.tobl*e.DEG2RAD;b=Ab(b,Math.cos(c),Math.sin(c));return new Ba(b.elat,b.elon,a.distance_au)}function Ra(a){a=v(a);var b=a.AddDays(-1E-5),c=a.AddDays(1E-5);b=Y(b);c=Y(c);return new I((b.x+
c.x)/2,(b.y+c.y)/2,(b.z+c.z)/2,(c.x-b.x)/2E-5,(c.y-b.y)/2E-5,(c.z-b.z)/2E-5,a)}function Bb(a){a=v(a);var b=Ra(a);return new I(b.x/82.30056,b.y/82.30056,b.z/82.30056,b.vx/82.30056,b.vy/82.30056,b.vz/82.30056,a)}function ma(a,b,c){var d=1,f=0;a=$jscomp.makeIterator(a);for(var g=a.next();!g.done;g=a.next()){var h=0;g=$jscomp.makeIterator(g.value);for(var l=g.next();!l.done;l=g.next()){var k=$jscomp.makeIterator(l.value);l=k.next().value;var n=k.next().value;k=k.next().value;h+=l*Math.cos(n+b*k)}h*=d;
c&&(h%=U);f+=h;d*=b}return f}function Cb(a,b){var c=1,d=0,f=0,g=0;a=$jscomp.makeIterator(a);for(var h=a.next();!h.done;h=a.next()){var l=0,k=0;h=$jscomp.makeIterator(h.value);for(var n=h.next();!n.done;n=h.next()){var p=$jscomp.makeIterator(n.value);n=p.next().value;var q=p.next().value;p=p.next().value;q+=b*p;l+=n*p*Math.sin(q);0<g&&(k+=n*Math.cos(q))}f+=g*d*k-c*l;d=c;c*=b;++g}return f}function Db(a){return new B(a[0]+4.4036E-7*a[1]-1.90919E-7*a[2],-4.79966E-7*a[0]+.917482137087*a[1]-.397776982902*
a[2],.397776982902*a[1]+.917482137087*a[2])}function hc(a,b,c){var d=c*Math.cos(b);return[d*Math.cos(a),d*Math.sin(a),c*Math.sin(b)]}function Aa(a,b){var c=b.tt/365250,d=ma(a[0],c,!0),f=ma(a[1],c,!1);a=ma(a[2],c,!1);d=hc(d,f,a);return Db(d).ToAstroVector(b)}function Sa(a,b){var c=b/365250,d=ma(a[0],c,!0),f=ma(a[1],c,!1),g=ma(a[2],c,!1),h=Cb(a[0],c),l=Cb(a[1],c);c=Cb(a[2],c);var k=Math.cos(d),n=Math.sin(d),p=Math.cos(f),q=Math.sin(f);a=+(c*p*k)-g*q*k*l-g*p*n*h;h=+(c*p*n)-g*q*n*l+g*p*k*h;l=+(c*q)+g*
p*l;d=hc(d,f,g);f=[a/365250,h/365250,l/365250];d=Db(d);f=Db(f);return new X(b,d,f)}function jb(a,b,c,d){d/=d+2.959122082855911E-4;b=Aa(M[c],b);a.x+=d*b.x;a.y+=d*b.y;a.z+=d*b.z}function R(a,b,c,d){d/=d+2.959122082855911E-4;b=Sa(M[c],b);a.r.incr(b.r.mul(d));a.v.incr(b.v.mul(d));return b}function Ta(a,b,c){a=c.sub(a);c=a.quadrature();return a.mul(b/(c*Math.sqrt(c)))}function Ca(a,b,c,d){return new B(b.x+a*(c.x+a*d.x/2),b.y+a*(c.y+a*d.y/2),b.z+a*(c.z+a*d.z/2))}function Eb(a,b,c){return new B(b.x+a*c.x,
b.y+a*c.y,b.z+a*c.z)}function Fb(a,b){var c=a-b.tt,d=new Da(a),f=Ca(c,b.r,b.v,b.a),g=d.Acceleration(f).mean(b.a);f=Ca(c,b.r,b.v,g);b=b.v.add(g.mul(c));c=d.Acceleration(f);a=new Ua(a,f,b,c);return new ic(d,a)}function jc(a,b){a=Math.floor(a);return 0>a?0:a>=b?b-1:a}function Gb(a){var b=$jscomp.makeIterator(a);a=b.next().value;var c=$jscomp.makeIterator(b.next().value);var d=c.next().value;var f=c.next().value;c=c.next().value;var g=$jscomp.makeIterator(b.next().value);b=g.next().value;var h=g.next().value;
g=g.next().value;d=new X(a,new B(d,f,c),new B(b,h,g));a=new Da(d.tt);f=d.r.add(a.Sun.r);c=d.v.add(a.Sun.v);b=a.Acceleration(f);d=new Ua(d.tt,f,c,b);return new ic(a,d)}function kc(a,b,c){a=Gb(a);for(var d=Math.ceil((b-a.grav.tt)/c),f=0;f<d;++f)a=Fb(f+1===d?b:a.grav.tt+c,a.grav);return a}function Hb(a,b){var c=a.tt;var d=na[0][0];if(c<d||c>na[50][0])c=null;else{c=jc((c-d)/29200,50);if(!Ib[c]){d=Ib[c]=[];d[0]=Gb(na[c]).grav;d[200]=Gb(na[c+1]).grav;var f,g=d[0].tt;for(f=1;200>f;++f)d[f]=Fb(g+=146,d[f-
1]).grav;g=d[200].tt;var h=[];h[200]=d[200];for(f=199;0<f;--f)h[f]=Fb(g-=146,h[f+1]).grav;for(f=199;0<f;--f)g=f/200,d[f].r=d[f].r.mul(1-g).add(h[f].r.mul(g)),d[f].v=d[f].v.mul(1-g).add(h[f].v.mul(g)),d[f].a=d[f].a.mul(1-g).add(h[f].a.mul(g))}c=Ib[c]}if(d=c){f=jc((a.tt-d[0].tt)/146,200);c=d[f];g=d[f+1];var l=c.a.mean(g.a);f=Ca(a.tt-c.tt,c.r,c.v,l);d=Eb(a.tt-c.tt,c.v,l);h=Ca(a.tt-g.tt,g.r,g.v,l);g=Eb(a.tt-g.tt,g.v,l);l=(a.tt-c.tt)/146;c=f.mul(1-l).add(h.mul(l));d=d.mul(1-l).add(g.mul(l))}else{var k=
a.tt<na[0][0]?kc(na[0],a.tt,-146):kc(na[50],a.tt,146);c=k.grav.r;d=k.grav.v;k=k.bary}b&&(k||(k=new Da(a.tt)),c=c.sub(k.Sun.r),d=d.sub(k.Sun.v));return new I(c.x,c.y,c.z,d.x,d.y,d.z,a)}function kb(a,b){for(var c=a.tt+18262.5,d=[0,b.al[0]+c*b.al[1],0,0,0,0],f=$jscomp.makeIterator(b.a),g=f.next();!g.done;g=f.next()){var h=$jscomp.makeIterator(g.value);g=h.next().value;var l=h.next().value;h=h.next().value;d[0]+=g*Math.cos(l+c*h)}f=$jscomp.makeIterator(b.l);for(g=f.next();!g.done;g=f.next())h=$jscomp.makeIterator(g.value),
g=h.next().value,l=h.next().value,h=h.next().value,d[1]+=g*Math.sin(l+c*h);d[1]%=U;0>d[1]&&(d[1]+=U);f=$jscomp.makeIterator(b.z);for(g=f.next();!g.done;g=f.next())h=$jscomp.makeIterator(g.value),g=h.next().value,l=h.next().value,h=h.next().value,l+=c*h,d[2]+=g*Math.cos(l),d[3]+=g*Math.sin(l);f=$jscomp.makeIterator(b.zeta);for(g=f.next();!g.done;g=f.next())h=$jscomp.makeIterator(g.value),g=h.next().value,l=h.next().value,h=h.next().value,l+=c*h,d[4]+=g*Math.cos(l),d[5]+=g*Math.sin(l);f=d[0];h=d[1];
g=d[2];l=d[3];c=d[4];d=d[5];var k=Math.sqrt(b.mu/(f*f*f));b=h+g*Math.sin(h)-l*Math.cos(h);do{var n=Math.cos(b);var p=Math.sin(b);n=(h-b+g*p-l*n)/(1-g*n-l*p);b+=n}while(1E-12<=Math.abs(n));n=Math.cos(b);p=Math.sin(b);h=l*n-g*p;var q=-g*n-l*p,t=1/(1+q),y=1/(1+Math.sqrt(1-g*g-l*l));b=f*(n-g-y*l*h);h=f*(p-l+y*g*h);l=k*t*f*(-p-y*l*q);f=k*t*f*(+n+y*g*q);g=2*Math.sqrt(1-c*c-d*d);k=1-2*d*d;n=1-2*c*c;p=2*d*c;a=new I(b*k+h*p,b*p+h*n,(c*h-b*d)*g,l*k+f*p,l*p+f*n,(c*f-l*d)*g,a);return Ea(rd,a)}function Z(a,b){b=
v(b);if(a in M)return Aa(M[a],b);if(a===m.Pluto)return a=Hb(b,!0),new E(a.x,a.y,a.z,b);if(a===m.Sun)return new E(0,0,0,b);if(a===m.Moon){a=Aa(M.Earth,b);var c=Y(b);return new E(a.x+c.x,a.y+c.y,a.z+c.z,b)}if(a===m.EMB)return a=Aa(M.Earth,b),c=Y(b),new E(a.x+c.x/82.30056,a.y+c.y/82.30056,a.z+c.z/82.30056,b);if(a===m.SSB)return a=new E(0,0,0,b),jb(a,b,m.Jupiter,2.825345909524226E-7),jb(a,b,m.Saturn,8.459715185680659E-8),jb(a,b,m.Uranus,1.292024916781969E-8),jb(a,b,m.Neptune,1.524358900784276E-8),a;if(c=
ka(a))return a=new Ba(c.dec,15*c.ra,c.dist),lb(a,b);throw'HelioVector: Unknown body "'+a+'"';}function oa(a,b){var c=ka(a);if(c)return c.dist;b=v(b);return a in M?ma(M[a][2],b.tt/365250,!1):Z(a,b).Length()}function lc(a,b){for(var c=b,d=0,f=0;10>f;++f){var g=a(c);d=g.Length()/e.C_AUDAY;if(1<d)throw"Object is too distant for light-travel solver.";var h=b.AddDays(-d);d=Math.abs(h.tt-c.tt);if(1E-9>d)return g;c=h}throw"Light-travel time solver did not converge: dt = "+d;}function mc(a,b,c,d){A(d);a=v(a);
if(ka(c)){c=Z(c,a);if(d)return b=mb(b,a),d=new E(c.x-b.x,c.y-b.y,c.z-b.z,a),c=e.C_AUDAY/d.Length(),new E(d.x+b.vx/c,d.y+b.vy/c,d.z+b.vz/c,a);b=Z(b,a);return new E(c.x-b.x,c.y-b.y,c.z-b.z,a)}var f=d?new E(0,0,0,a):Z(b,a);var g=new nc(b,c,d,f);return lc(function(h){return g.Position(h)},a)}function W(a,b,c){A(c);b=v(b);switch(a){case m.Earth:return new E(0,0,0,b);case m.Moon:return Y(b);default:return a=mc(b,m.Earth,a,c),a.t=b,a}}function pa(a,b){return new I(a.r.x,a.r.y,a.r.z,a.v.x,a.v.y,a.v.z,b)}
function mb(a,b){b=v(b);switch(a){case m.Sun:return new I(0,0,0,0,0,0,b);case m.SSB:return a=new Da(b.tt),new I(-a.Sun.r.x,-a.Sun.r.y,-a.Sun.r.z,-a.Sun.v.x,-a.Sun.v.y,-a.Sun.v.z,b);case m.Mercury:case m.Venus:case m.Earth:case m.Mars:case m.Jupiter:case m.Saturn:case m.Uranus:case m.Neptune:return a=Sa(M[a],b.tt),pa(a,b);case m.Pluto:return Hb(b,!0);case m.Moon:case m.EMB:var c=Sa(M.Earth,b.tt);a=a==m.Moon?Ra(b):Bb(b);return new I(a.x+c.r.x,a.y+c.r.y,a.z+c.r.z,a.vx+c.v.x,a.vy+c.v.y,a.vz+c.v.z,b);
default:if(ka(a))return a=Z(a,b),new I(a.x,a.y,a.z,0,0,0,b);throw'HelioState: Unsupported body "'+a+'"';}}function sd(a,b,c,d,f){var g=(f+c)/2-d;c=(f-c)/2;if(0==g){if(0==c)return null;d=-d/c;if(-1>d||1<d)return null}else{d=c*c-4*g*d;if(0>=d)return null;f=Math.sqrt(d);d=(-c+f)/(2*g);f=(-c-f)/(2*g);if(-1<=d&&1>=d){if(-1<=f&&1>=f)return null}else if(-1<=f&&1>=f)d=f;else return null}return{t:a+d*b,df_dt:(2*g*d+c)/b}}function K(a,b,c,d){var f=w(d&&d.dt_tolerance_seconds||1);f=Math.abs(f/86400);var g=d&&
d.init_f1||a(b),h=d&&d.init_f2||a(c),l=NaN,k=0;d=d&&d.iter_limit||20;for(var n=!0;;){if(++k>d)throw"Excessive iteration in Search()";var p=new O(b.ut+.5*(c.ut-b.ut)),q=p.ut-b.ut;if(Math.abs(q)<f)return p;n?l=a(p):n=!0;var t=sd(p.ut,c.ut-p.ut,g,l,h);if(t){var y=v(t.t),x=a(y);if(0!==t.df_dt){if(Math.abs(x/t.df_dt)<f)return y;t=1.2*Math.abs(x/t.df_dt);if(t<q/10&&(q=y.AddDays(-t),y=y.AddDays(+t),0>(q.ut-b.ut)*(q.ut-c.ut)&&0>(y.ut-b.ut)*(y.ut-c.ut))){t=a(q);var z=a(y);if(0>t&&0<=z){g=t;h=z;b=q;c=y;l=x;
n=!1;continue}}}}if(0>g&&0<=l)c=p,h=l;else if(0>l&&0<=h)b=p,g=l;else return null}}function Fa(a){for(;-180>=a;)a+=360;for(;180<a;)a-=360;return a}function Ga(a){for(;0>a;)a+=360;for(;360<=a;)a-=360;return a}function oc(a,b,c){w(a);w(c);b=v(b);c=b.AddDays(c);return K(function(d){d=fc(d);return Fa(d.elon-a)},b,c,{dt_tolerance_seconds:.01})}function Jb(a,b,c){if(a===m.Earth||b===m.Earth)throw"The Earth does not have a longitude as seen from itself.";c=v(c);a=W(a,c,!1);a=Qa(a);b=W(b,c,!1);b=Qa(b);return Ga(a.elon-
b.elon)}function Ha(a,b){if(a==m.Earth)throw"The Earth does not have an angle as seen from itself.";var c=v(b);b=W(m.Sun,c,!0);a=W(a,c,!0);return N(b,a)}function qa(a,b){if(a===m.Sun)throw"Cannot calculate heliocentric longitude of the Sun.";a=Z(a,b);return Qa(a).elon}function nb(a,b){if(a===m.Earth)throw"The illumination of the Earth is not defined.";var c=v(b),d=Aa(M.Earth,c);if(a===m.Sun){var f=new E(-d.x,-d.y,-d.z,c);b=new E(0,0,0,c);d=0}else a===m.Moon?(f=Y(c),b=new E(d.x+f.x,d.y+f.y,d.z+f.z,
c)):(b=Z(a,b),f=new E(b.x-d.x,b.y-d.y,b.z-d.z,c)),d=N(f,b);var g=f.Length(),h=b.Length();if(a===m.Sun)var l=td+5*Math.log10(g);else if(a===m.Moon)a=d*e.DEG2RAD,l=a*a,a=-12.717+1.49*Math.abs(a)+.0431*l*l,l=a+=5*Math.log10(g/(385000.6/e.KM_PER_AU)*h);else if(a===m.Saturn){var k=d;a=Qa(f);l=28.06*e.DEG2RAD;var n=e.DEG2RAD*a.elat;a=Math.asin(Math.sin(n)*Math.cos(l)-Math.cos(n)*Math.sin(l)*Math.sin(e.DEG2RAD*a.elon-e.DEG2RAD*(169.51+3.82E-5*c.tt)));l=Math.sin(Math.abs(a));k=-9+.044*k+l*(-2.6+1.2*l)+5*
Math.log10(h*g);a*=e.RAD2DEG;l=k;k=a}else{var p=n=l=0;switch(a){case m.Mercury:a=-.6;l=4.98;n=-4.88;p=3.02;break;case m.Venus:163.6>d?(a=-4.47,l=1.03,n=.57,p=.13):(a=.98,l=-1.02);break;case m.Mars:a=-1.52;l=1.6;break;case m.Jupiter:a=-9.4;l=.5;break;case m.Uranus:a=-7.19;l=.25;break;case m.Neptune:a=-6.87;break;case m.Pluto:a=-1;l=4;break;default:throw"VisualMagnitude: unsupported body "+a;}var q=d/100;l=a+q*(l+q*(n+q*p))+5*Math.log10(h*g)}return new pc(c,l,d,h,g,f,b,k)}function Va(a){if(a===m.Earth)throw"The Earth does not have a synodic period as seen from itself.";
if(a===m.Moon)return 29.530588;var b=aa[a];if(!b)throw"Not a valid planet name: "+a;a=aa.Earth.OrbitalPeriod;return Math.abs(a/(a/b.OrbitalPeriod-1))}function Ia(a,b,c){function d(n){var p=qa(a,n);n=qa(m.Earth,n);return Fa(g*(n-p)-b)}w(b);var f=aa[a];if(!f)throw"Cannot search relative longitude because body is not a planet: "+a;if(a===m.Earth)throw"Cannot search relative longitude for the Earth (it is always 0)";var g=f.OrbitalPeriod>aa.Earth.OrbitalPeriod?1:-1;f=Va(a);c=v(c);var h=d(c);0<h&&(h-=
360);for(var l=0;100>l;++l){var k=-h/360*f;c=c.AddDays(k);if(1>86400*Math.abs(k))return c;k=h;h=d(c);30>Math.abs(k)&&k!==h&&(k/=k-h,.5<k&&2>k&&(f*=k))}throw"Relative longitude search failed to converge for "+a+" near "+c.toString()+" (error_angle = "+h+").";}function Kb(a){return Jb(m.Moon,m.Sun,a)}function Wa(a,b,c){function d(l){l=Kb(l);return Fa(l-a)}w(a);w(c);b=v(b);var f=d(b);if(0>c){0>f&&(f+=360);var g=-(29.530588*f)/360;f=g+1.5;if(f<c)return null;var h=Math.max(c,g-1.5)}else{0<f&&(f-=360);
g=-(29.530588*f)/360;h=g-1.5;if(h>c)return null;f=Math.min(c,g+1.5)}c=b.AddDays(h);b=b.AddDays(f);return K(d,c,b,{dt_tolerance_seconds:.1})}function qc(a){var b=Kb(a);b=(Math.floor(b/90)+1)%4;a=Wa(90*b,a,10);if(!a)throw"Cannot find moon quarter";return new rc(b,a)}function sc(a){if(!Number.isFinite(a)||-500>a||1E5<a)throw"Invalid elevation: "+a;if(11E3>=a){var b=288.15-.0065*a;a=101325*Math.pow(288.15/b,-5.25577)}else 2E4>=a?(b=216.65,a=22632*Math.exp(-1.5768832E-4*(a-11E3))):(b=216.65+.001*(a-2E4),
a=5474.87*Math.pow(216.65/b,34.16319));return new tc(a,b,a/b/(101325/288.15))}function Lb(a,b,c,d,f,g,h){if(0>g&&0<=h)return new ud(d,f,g,h);if(0<=g&&0>h)return null;if(17<a)throw"Excessive recursion in rise/set ascent search.";var l=f.ut-d.ut;if(1>86400*l||Math.min(Math.abs(g),Math.abs(h))>l/2*c)return null;l=new O((d.ut+f.ut)/2);var k=b(l);return Lb(1+a,b,c,d,l,g,k)||Lb(1+a,b,c,l,f,k,h)}function vd(a,b){if(-90>b||90<b)throw"Invalid geographic latitude: "+b;switch(a){case m.Moon:a=4.5;var c=8.2;
break;case m.Sun:a=.8;c=.5;break;case m.Mercury:a=-1.6;c=1;break;case m.Venus:a=-.8;c=.6;break;case m.Mars:a=-.5;c=.4;break;case m.Jupiter:case m.Saturn:case m.Uranus:case m.Neptune:case m.Pluto:a=-.2;c=.2;break;case m.Star1:case m.Star2:case m.Star3:case m.Star4:case m.Star5:case m.Star6:case m.Star7:case m.Star8:a=-.008;c=.008;break;default:throw"Body not allowed for altitude search: "+a;}b*=e.DEG2RAD;return Math.abs((360.98564540070413-a)*Math.cos(b))+Math.abs(c*Math.sin(b))}function uc(a,b,c,
d,f,g,h){function l(x){var z=Pa(a,x,b,!0,!0);x=hb(x,b,z.ra,z.dec).altitude+e.RAD2DEG*Math.asin(g/z.dist);return c*(x-h)}za(b);w(f);w(g);w(h);if(-90>h||90<h)throw"Invalid target altitude angle: "+h;for(var k=vd(a,b.latitude),n=d=v(d),p=d,q=l(n),t=q;;){0>f?(n=p.AddDays(-.42),q=l(n)):(p=n.AddDays(.42),t=l(p));var y=Lb(0,l,k,n,p,q,t);if(y){if(k=K(l,y.tx,y.ty,{dt_tolerance_seconds:.1,init_f1:y.ax,init_f2:y.ay})){if(0>f){if(k.ut<d.ut+f)return null}else if(k.ut>d.ut+f)return null;return k}throw"Rise/set search failed after finding ascent: t1="+
n+", t2="+p+", a1="+q+", a2="+t;}if(0>f){if(n.ut<d.ut+f)return null;p=n;t=q}else{if(p.ut>d.ut+f)return null;n=p;q=t}}}function vc(a,b){b=v(b);var c=Jb(a,m.Sun,b);if(180<c){var d="morning";c=360-c}else d="evening";a=Ha(a,b);return new wc(b,d,a,c)}function xc(a){function b(l){var k=l.AddDays(-5E-4);l=l.AddDays(5E-4);k=ea(k).distance_au;return(ea(l).distance_au-k)/.001}function c(l){return-b(l)}a=v(a);for(var d=b(a),f=0;59.061176>5*f;++f){var g=a.AddDays(5),h=b(g);if(0>=d*h){if(0>d||0<h){a=K(b,a,g,{init_f1:d,
init_f2:h});if(!a)throw"SearchLunarApsis INTERNAL ERROR: perigee search failed!";d=ea(a).distance_au;return new Xa(a,0,d)}if(0<d||0>h){a=K(c,a,g,{init_f1:-d,init_f2:-h});if(!a)throw"SearchLunarApsis INTERNAL ERROR: apogee search failed!";d=ea(a).distance_au;return new Xa(a,1,d)}throw"SearchLunarApsis INTERNAL ERROR: cannot classify apsis event!";}a=g;d=h}throw"SearchLunarApsis INTERNAL ERROR: could not find apsis within 2 synodic months of start date.";}function yc(a,b,c,d){for(var f=b===Ja.Apocenter?
1:-1;;){d/=9;if(d<1/1440)return c=c.AddDays(d/2),a=oa(a,c),new Xa(c,b,a);for(var g=-1,h=0,l=0;10>l;++l){var k=c.AddDays(l*d);k=f*oa(a,k);if(0==l||k>h)g=l,h=k}c=c.AddDays((g-1)*d);d*=2}}function wd(a,b){var c=b.AddDays(-30/360*aa[a].OrbitalPeriod),d=b.AddDays(.75*aa[a].OrbitalPeriod),f=c,g=c,h=-1,l=-1;d=(d.ut-c.ut)/99;for(var k=0;100>k;++k){var n=c.AddDays(k*d),p=oa(a,n);0===k?l=h=p:(p>l&&(l=p,g=n),p<h&&(h=p,f=n))}c=yc(a,0,f.AddDays(-2*d),4*d);a=yc(a,1,g.AddDays(-2*d),4*d);if(c.time.tt>=b.tt)return a.time.tt>=
b.tt&&a.time.tt<c.time.tt?a:c;if(a.time.tt>=b.tt)return a;throw"Internal error: failed to find Neptune apsis.";}function zc(a,b){function c(p){var q=p.AddDays(-5E-4);p=p.AddDays(5E-4);q=oa(a,q);return(oa(a,p)-q)/.001}function d(p){return-c(p)}b=v(b);if(a===m.Neptune||a===m.Pluto)return wd(a,b);for(var f=aa[a].OrbitalPeriod,g=f/6,h=c(b),l=0;l*g<2*f;++l){var k=b.AddDays(g),n=c(k);if(0>=h*n){f=g=void 0;if(0>h||0<n)g=c,f=Ja.Pericenter;else if(0<h||0>n)g=d,f=Ja.Apocenter;else throw"Internal error with slopes in SearchPlanetApsis";
b=K(g,b,k);if(!b)throw"Failed to find slope transition in planetary apsis search.";h=oa(a,b);return new Xa(b,f,h)}b=k;h=n}throw"Internal error: should have found planetary apsis within 2 orbital periods.";}function Ka(a){return new J([[a.rot[0][0],a.rot[1][0],a.rot[2][0]],[a.rot[0][1],a.rot[1][1],a.rot[2][1]],[a.rot[0][2],a.rot[1][2],a.rot[2][2]]])}function ja(a,b){return new J([[b.rot[0][0]*a.rot[0][0]+b.rot[1][0]*a.rot[0][1]+b.rot[2][0]*a.rot[0][2],b.rot[0][1]*a.rot[0][0]+b.rot[1][1]*a.rot[0][1]+
b.rot[2][1]*a.rot[0][2],b.rot[0][2]*a.rot[0][0]+b.rot[1][2]*a.rot[0][1]+b.rot[2][2]*a.rot[0][2]],[b.rot[0][0]*a.rot[1][0]+b.rot[1][0]*a.rot[1][1]+b.rot[2][0]*a.rot[1][2],b.rot[0][1]*a.rot[1][0]+b.rot[1][1]*a.rot[1][1]+b.rot[2][1]*a.rot[1][2],b.rot[0][2]*a.rot[1][0]+b.rot[1][2]*a.rot[1][1]+b.rot[2][2]*a.rot[1][2]],[b.rot[0][0]*a.rot[2][0]+b.rot[1][0]*a.rot[2][1]+b.rot[2][0]*a.rot[2][2],b.rot[0][1]*a.rot[2][0]+b.rot[1][1]*a.rot[2][1]+b.rot[2][1]*a.rot[2][2],b.rot[0][2]*a.rot[2][0]+b.rot[1][2]*a.rot[2][1]+
b.rot[2][2]*a.rot[2][2]]])}function lb(a,b){b=v(b);var c=a.lat*e.DEG2RAD,d=a.lon*e.DEG2RAD,f=a.dist*Math.cos(c);return new E(f*Math.cos(d),f*Math.sin(d),a.dist*Math.sin(c),b)}function Mb(a){var b=Nb(a);return new gb(b.lon/15,b.lat,b.dist,a)}function Nb(a){var b=a.x*a.x+a.y*a.y,c=Math.sqrt(b+a.z*a.z);if(0===b){if(0===a.z)throw"Zero-length vector not allowed.";var d=0;a=0>a.z?-90:90}else d=e.RAD2DEG*Math.atan2(a.y,a.x),0>d&&(d+=360),a=e.RAD2DEG*Math.atan2(a.z,Math.sqrt(b));return new Ba(a,d,c)}function Ac(a){a=
360-a;360<=a?a-=360:0>a&&(a+=360);return a}function Oa(a,b){w(b);if(-90>b||90<b)return 0;if("normal"===a||"jplhor"===a){var c=b;-1>c&&(c=-1);c=1.02/Math.tan((c+10.3/(c+5.11))*e.DEG2RAD)/60;"normal"===a&&-1>b&&(c*=(b+90)/89)}else{if(a)throw"Invalid refraction option: "+a;c=0}return c}function Bc(a,b){if(-90>b||90<b)return 0;for(var c=b-Oa(a,b);;){var d=c+Oa(a,c)-b;if(1E-14>Math.abs(d))return c-b;c-=d}}function Ya(a,b){return new E(a.rot[0][0]*b.x+a.rot[1][0]*b.y+a.rot[2][0]*b.z,a.rot[0][1]*b.x+a.rot[1][1]*
b.y+a.rot[2][1]*b.z,a.rot[0][2]*b.x+a.rot[1][2]*b.y+a.rot[2][2]*b.z,b.t)}function Ea(a,b){return new I(a.rot[0][0]*b.x+a.rot[1][0]*b.y+a.rot[2][0]*b.z,a.rot[0][1]*b.x+a.rot[1][1]*b.y+a.rot[2][1]*b.z,a.rot[0][2]*b.x+a.rot[1][2]*b.y+a.rot[2][2]*b.z,a.rot[0][0]*b.vx+a.rot[1][0]*b.vy+a.rot[2][0]*b.vz,a.rot[0][1]*b.vx+a.rot[1][1]*b.vy+a.rot[2][1]*b.vz,a.rot[0][2]*b.vx+a.rot[1][2]*b.vy+a.rot[2][2]*b.vz,b.t)}function Cc(){return new J([[1,0,0],[0,.9174821430670688,-.3977769691083922],[0,.3977769691083922,
.9174821430670688]])}function ob(a){a=v(a);var b=Ma(a,F.From2000);a=Na(a,F.From2000);return ja(b,a)}function pb(a){a=v(a);var b=Na(a,F.Into2000);a=Ma(a,F.Into2000);return ja(b,a)}function Ob(a,b){a=v(a);var c=Math.sin(b.latitude*e.DEG2RAD),d=Math.cos(b.latitude*e.DEG2RAD),f=Math.sin(b.longitude*e.DEG2RAD),g=Math.cos(b.longitude*e.DEG2RAD);b=[d*g,d*f,c];c=[-c*g,-c*f,d];f=[f,-g,0];a=-15*ca(a);b=ya(a,b);c=ya(a,c);a=ya(a,f);return new J([[c[0],a[0],b[0]],[c[1],a[1],b[1]],[c[2],a[2],b[2]]])}function Dc(a,
b){a=Ob(a,b);return Ka(a)}function Ec(a,b){a=v(a);b=Dc(a,b);a=pb(a);return ja(b,a)}function Fc(a){a=pb(a);var b=Cc();return ja(a,b)}function Gc(a){a=Fc(a);return Ka(a)}function Hc(a,b){a=v(a);var c=Gc(a);a=Ob(a,b);return ja(c,a)}function Ic(a){var b=da(v(a)).tobl*e.DEG2RAD;a=Math.cos(b);b=Math.sin(b);return new J([[1,0,0],[0,+a,+b],[0,-b,+a]])}function Jc(a){var b=da(v(a)).tobl*e.DEG2RAD;a=Math.cos(b);b=Math.sin(b);return new J([[1,0,0],[0,+a,-b],[0,+b,+a]])}function Za(a,b,c,d){var f=(d.x*c.x+d.y*
c.y+d.z*c.z)/(d.x*d.x+d.y*d.y+d.z*d.z);return new xd(b,f,e.KM_PER_AU*Math.hypot(f*d.x-c.x,f*d.y-c.y,f*d.z-c.z),695700-(1+f)*(695700-a),-695700+(1+f)*(695700+a),c,d)}function qb(a){var b=W(m.Sun,a,!0);b=new E(-b.x,-b.y,-b.z,b.t);var c=Y(a);return Za(6459,a,c,b)}function Kc(a){var b=W(m.Sun,a,!0),c=Y(a),d=new E(-c.x,-c.y,-c.z,c.t);c.x-=b.x;c.y-=b.y;c.z-=b.z;return Za(1737.4,a,d,c)}function Pb(a,b){var c=cc(a,b);b=W(m.Sun,a,!0);var d=Y(a);c=new E(c[0]-d.x,c[1]-d.y,c[2]-d.z,a);d.x-=b.x;d.y-=b.y;d.z-=
b.z;return Za(1737.4,a,c,d)}function rb(a,b,c){a=W(a,c,!0);var d=W(m.Sun,c,!0),f=new E(a.x-d.x,a.y-d.y,a.z-d.z,c);d.x=-a.x;d.y=-a.y;d.z=-a.z;return Za(b,c,d,f)}function Qb(a,b){var c=1/86400,d=b.AddDays(-c);b=b.AddDays(+c);d=a(d);return(a(b).r-d.r)/c}function yd(a){var b=a.AddDays(-.03);a=a.AddDays(.03);b=K(function(c){return Qb(qb,c)},b,a);if(!b)throw"Failed to find peak Earth shadow time.";return qb(b)}function zd(a){var b=a.AddDays(-.03);a=a.AddDays(.03);b=K(function(c){return Qb(Kc,c)},b,a);if(!b)throw"Failed to find peak Moon shadow time.";
return Kc(b)}function Ad(a,b,c){var d=c.AddDays(-1);c=c.AddDays(1);d=K(function(f){var g=1/86400,h=rb(a,b,f.AddDays(-g));return(rb(a,b,f.AddDays(+g)).r-h.r)/g},d,c);if(!d)throw"Failed to find peak planet shadow time.";return rb(a,b,d)}function Bd(a,b){function c(g){return Pb(g,b)}var d=a.AddDays(-.2),f=a.AddDays(.2);d=K(function(g){return Qb(c,g)},d,f);if(!d)throw"PeakLocalMoonShadow: search failure for search_center_time = "+a;return Pb(d,b)}function Rb(a,b,c){var d=c/1440;c=a.AddDays(-d);d=a.AddDays(+d);
c=K(function(f){return-(qb(f).r-b)},c,a);a=K(function(f){return+(qb(f).r-b)},a,d);if(!c||!a)throw"Failed to find shadow semiduration";return 720*(a.ut-c.ut)}function Sb(a){a=ea(a);return e.RAD2DEG*a.geo_eclip_lat}function Lc(a,b,c){if(0>=a)throw"Radius of first disc must be positive.";if(0>=b)throw"Radius of second disc must be positive.";if(0>c)throw"Distance between discs is not allowed to be negative.";if(c>=a+b)return 0;if(0==c)return a<=b?1:b*b/(a*a);var d=(a*a-b*b+c*c)/(2*c),f=a*a-d*d;if(0>=
f)return a<=b?1:b*b/(a*a);f=Math.sqrt(f);return(a*a*Math.acos(d/a)-d*f+(b*b*Math.acos((c-d)/b)-(c-d)*f))/(Math.PI*a*a)}function Mc(a,b){var c=new E(a.x+b.x,a.y+b.y,a.z+b.z,a.t);a=Math.asin(Nc/c.Length());var d=Math.asin(Cd/b.Length());b=N(b,c);b=Lc(a,d,b*e.DEG2RAD);return Math.min(.9999,b)}function Oc(a){a=v(a);for(var b=0;12>b;++b){var c=Wa(180,a,40);if(!c)throw"Cannot find full moon.";a=Sb(c);if(1.8>Math.abs(a)&&(a=yd(c),a.r<a.p+1737.4)){b=S.Penumbral;var d=c=0,f=0,g=Rb(a.time,a.p+1737.4,200);a.r<
a.k+1737.4&&(b=S.Partial,f=Rb(a.time,a.k+1737.4,g),a.r+1737.4<a.k?(b=S.Total,c=1,d=Rb(a.time,a.k-1737.4,f)):c=Lc(1737.4,a.k,a.r));return new Pc(b,c,a.time,g,f,d)}a=c.AddDays(10)}throw"Failed to find lunar eclipse within 12 full moons.";}function Qc(a){a=v(a);var b;for(b=0;12>b;++b){var c=Wa(0,a,40);if(!c)throw"Cannot find new moon";a=Sb(c);if(1.8>Math.abs(a)&&(a=zd(c),a.r<a.p+6371)){var d=void 0,f=void 0,g=S.Partial;b=a.time;c=a.r;var h=ob(a.time),l=Ya(h,a.dir),k=Ya(h,a.target);l.x*=e.KM_PER_AU;l.y*=
e.KM_PER_AU;l.z*=e.KM_PER_AU/.996647180302104;k.x*=e.KM_PER_AU;k.y*=e.KM_PER_AU;k.z*=e.KM_PER_AU/.996647180302104;var n=l.x*l.x+l.y*l.y+l.z*l.z,p=-2*(l.x*k.x+l.y*k.y+l.z*k.z),q=p*p-4*n*(k.x*k.x+k.y*k.y+k.z*k.z-4.068062648825956E7);if(0<q){f=(-p-Math.sqrt(q))/(2*n);g=f*l.x-k.x;n=f*l.y-k.y;l=.996647180302104*(f*l.z-k.z);f=.9933056020041345*Math.hypot(g,n);f=0==f?0<l?90:-90:e.RAD2DEG*Math.atan(l/f);d=ca(b);d=(e.RAD2DEG*Math.atan2(n,g)-15*d)%360;-180>=d?d+=360:180<d&&(d-=360);h=Ka(h);l=new E(g/e.KM_PER_AU,
n/e.KM_PER_AU,l/e.KM_PER_AU,a.time);l=Ya(h,l);l.x+=a.target.x;l.y+=a.target.y;l.z+=a.target.z;h=Za(1736,a.time,l,a.dir);if(1E-9<h.r||0>h.r)throw"Unexpected shadow distance from geoid intersection = "+h.r;g=.014<h.k?S.Total:S.Annular;a=g===S.Total?1:Mc(a.dir,l)}else a=void 0;return new Rc(g,a,b,c,f,d)}a=c.AddDays(10)}throw"Failed to find solar eclipse within 12 full moons.";}function Sc(a){return a.p-a.r}function Tc(a){return Math.abs(a.k)-a.r}function sb(a,b,c,d,f){d=K(function(g){g=Pb(g,a);return b*
c(g)},d,f);if(!d)throw"Local eclipse transition search failed.";return Uc(a,d)}function Uc(a,b){var c=Pa(m.Sun,b,a,!0,!0);a=hb(b,a,c.ra,c.dec,"normal").altitude;return new Vc(b,a)}function Wc(a,b){a=v(a);for(za(b);;){a=Wa(0,a,40);if(!a)throw"Cannot find next new moon";var c=Sb(a);if(1.8>Math.abs(c)){var d=Bd(a,b);if(d.r<d.p){var f=c=void 0;var g=b;var h=Uc(g,d.time),l=d.time.AddDays(-.2),k=d.time.AddDays(.2),n=sb(g,1,Sc,l,d.time),p=sb(g,-1,Sc,d.time,k);d.r<Math.abs(d.k)?(l=d.time.AddDays(-.01),k=
d.time.AddDays(.01),f=sb(g,1,Tc,l,d.time),c=sb(g,-1,Tc,d.time,k),g=.014<d.k?S.Total:S.Annular):g=S.Partial;d=g===S.Total?1:Mc(d.dir,d.target);c=new Xc(g,d,n,f,h,c,p);if(0<c.partial_begin.altitude||0<c.partial_end.altitude)return c}}a=a.AddDays(10)}}function Yc(a,b,c,d,f){c=K(function(g){g=rb(a,b,g);return f*(g.r-g.p)},c,d);if(!c)throw"Planet transit boundary search failed";return c}function Zc(a,b){b=v(b);switch(a){case m.Mercury:var c=2439.7;break;case m.Venus:c=6051.8;break;default:throw"Invalid body: "+
a;}for(;;){var d=Ia(a,0,b);if(.4>Ha(a,d)&&(b=Ad(a,c,d),b.r<b.p)){d=b.time.AddDays(-1);d=Yc(a,c,d,b.time,-1);var f=b.time.AddDays(1);c=Yc(a,c,b.time,f,1);a=60*Ha(a,b.time);return new $c(d,b.time,c,a)}b=d.AddDays(10)}}function ad(a){var b=v(a),c=ib(b);for(a={};;a={$jscomp$loop$prop$kind$33:a.$jscomp$loop$prop$kind$33}){var d=b.AddDays(10),f=ib(d);if(0>=c.lat*f.lat){a.$jscomp$loop$prop$kind$33=f.lat>c.lat?ra.Ascending:ra.Descending;b=K(function(g){return function(h){return g.$jscomp$loop$prop$kind$33*
ib(h).lat}}(a),b,d);if(!b)throw"Could not find moon node.";return new bd(a.$jscomp$loop$prop$kind$33,b)}b=d;c=f}}function cd(a,b,c,d,f){if(1>a||5<a)throw"Invalid lagrange point "+a;if(!Number.isFinite(c)||0>=c)throw"Major mass must be a positive number.";if(!Number.isFinite(f)||0>=f)throw"Minor mass must be a negative number.";var g=d.x-b.x,h=d.y-b.y,l=d.z-b.z,k=g*g+h*h+l*l,n=Math.sqrt(k),p=d.vx-b.vx,q=d.vy-b.vy;d=d.vz-b.vz;if(4===a||5===a){k=h*d-l*q;c=l*p-g*d;var t=g*q-h*p,y=c*l-t*h;t=t*g-k*l;k=
k*h-c*g;c=Math.sqrt(y*y+t*t+k*k);y/=c;t/=c;k/=c;g/=n;h/=n;l/=n;a=4==a?.8660254037844386:-.8660254037844386;c=.5*g+a*y;f=.5*h+a*t;var x=.5*l+a*k,z=p*g+q*h+d*l;p=p*y+q*t+d*k;b=new I(n*c,n*f,n*x,z*c+p*(.5*y-a*g),z*f+p*(.5*t-a*h),z*x+p*(.5*k-a*l),b.t)}else{y=f/(c+f)*-n;t=c/(c+f)*+n;k=(c+f)/(k*n);if(1===a||2===a)x=c/(c+f)*Math.cbrt(f/(3*c)),c=-c,1==a?(x=1-x,a=+f):(x=1+x,a=-f);else if(3===a)x=(7/12*f-c)/(f+c),c=+c,a=+f;else throw"Invalid Langrage point "+a+". Must be an integer 1..5.";f=n*x-y;do x=f-y,
z=f-t,x=(k*f+c/(x*x)+a/(z*z))/(k-2*c/(x*x*x)-2*a/(z*z*z)),f-=x;while(1E-14<Math.abs(x/n));x=(f-y)/n;b=new I(x*g,x*h,x*l,x*p,x*q,x*d,b.t)}return b}Object.defineProperty(e,"__esModule",{value:!0});e.GeoEmbState=e.GeoMoonState=e.EclipticGeoMoon=e.GeoMoon=e.Ecliptic=e.ObserverGravity=e.VectorObserver=e.ObserverState=e.ObserverVector=e.Equator=e.SunPosition=e.Observer=e.Horizon=e.EclipticCoordinates=e.HorizontalCoordinates=e.MakeRotation=e.RotationMatrix=e.EquatorialCoordinates=e.Spherical=e.StateVector=
e.Vector=e.SiderealTime=e.Libration=e.LibrationInfo=e.CalcMoonCount=e.e_tilt=e.MakeTime=e.AstroTime=e.SetDeltaTFunction=e.DeltaT_JplHorizons=e.DeltaT_EspenakMeeus=e.PlanetOrbitalPeriod=e.DefineStar=e.Body=e.AngleBetween=e.MassProduct=e.CALLISTO_RADIUS_KM=e.GANYMEDE_RADIUS_KM=e.EUROPA_RADIUS_KM=e.IO_RADIUS_KM=e.JUPITER_MEAN_RADIUS_KM=e.JUPITER_POLAR_RADIUS_KM=e.JUPITER_EQUATORIAL_RADIUS_KM=e.RAD2HOUR=e.RAD2DEG=e.HOUR2RAD=e.DEG2RAD=e.AU_PER_LY=e.KM_PER_AU=e.C_AUDAY=void 0;e.VectorFromHorizon=e.HorizonFromVector=
e.SphereFromVector=e.EquatorFromVector=e.VectorFromSphere=e.Pivot=e.IdentityMatrix=e.CombineRotation=e.InverseRotation=e.NextPlanetApsis=e.SearchPlanetApsis=e.NextLunarApsis=e.SearchLunarApsis=e.Apsis=e.ApsisKind=e.SearchPeakMagnitude=e.SearchMaxElongation=e.Elongation=e.ElongationEvent=e.Seasons=e.SeasonInfo=e.HourAngle=e.SearchHourAngle=e.HourAngleEvent=e.SearchAltitude=e.SearchRiseSet=e.Atmosphere=e.AtmosphereInfo=e.NextMoonQuarter=e.SearchMoonQuarter=e.MoonQuarter=e.SearchMoonPhase=e.MoonPhase=
e.SearchRelativeLongitude=e.Illumination=e.IlluminationInfo=e.EclipticLongitude=e.AngleFromSun=e.PairLongitude=e.SearchSunLongitude=e.Search=e.HelioState=e.BaryState=e.GeoVector=e.BackdatePosition=e.CorrectLightTravel=e.HelioDistance=e.HelioVector=e.JupiterMoons=e.JupiterMoonsInfo=void 0;e.GravitySimulator=e.LagrangePointFast=e.LagrangePoint=e.RotationAxis=e.AxisInfo=e.NextMoonNode=e.SearchMoonNode=e.NodeEventInfo=e.NodeEventKind=e.NextTransit=e.SearchTransit=e.TransitInfo=e.NextLocalSolarEclipse=
e.SearchLocalSolarEclipse=e.LocalSolarEclipseInfo=e.EclipseEvent=e.NextGlobalSolarEclipse=e.SearchGlobalSolarEclipse=e.NextLunarEclipse=e.GlobalSolarEclipseInfo=e.SearchLunarEclipse=e.LunarEclipseInfo=e.EclipseKind=e.Constellation=e.ConstellationInfo=e.Rotation_EQD_ECT=e.Rotation_ECT_EQD=e.Rotation_GAL_EQJ=e.Rotation_EQJ_GAL=e.Rotation_HOR_ECL=e.Rotation_ECL_HOR=e.Rotation_ECL_EQD=e.Rotation_EQD_ECL=e.Rotation_EQJ_HOR=e.Rotation_HOR_EQJ=e.Rotation_HOR_EQD=e.Rotation_EQD_HOR=e.Rotation_EQD_EQJ=e.Rotation_ECT_EQJ=
e.Rotation_EQJ_ECT=e.Rotation_EQJ_EQD=e.Rotation_ECL_EQJ=e.Rotation_EQJ_ECL=e.RotateState=e.RotateVector=e.InverseRefraction=e.Refraction=void 0;e.C_AUDAY=173.1446326846693;e.KM_PER_AU=1.4959787069098932E8;e.AU_PER_LY=63241.07708807546;e.DEG2RAD=.017453292519943295;e.HOUR2RAD=.26179938779914946;e.RAD2DEG=57.29577951308232;e.RAD2HOUR=3.819718634205488;e.JUPITER_EQUATORIAL_RADIUS_KM=71492;e.JUPITER_POLAR_RADIUS_KM=66854;e.JUPITER_MEAN_RADIUS_KM=69911;e.IO_RADIUS_KM=1821.6;e.EUROPA_RADIUS_KM=1560.8;
e.GANYMEDE_RADIUS_KM=2631.2;e.CALLISTO_RADIUS_KM=2410.3;var dd=new Date("2000-01-01T12:00:00Z"),U=2*Math.PI,ia=180/Math.PI*3600,td=-.17-5*Math.log10(648E3/Math.PI),Nc=695700/e.KM_PER_AU,pd=6378.1366/e.KM_PER_AU,Dd=1738.1/e.KM_PER_AU,Cd=1736/e.KM_PER_AU,Ed=34/60;e.MassProduct=C;e.AngleBetween=N;var m;(function(a){a.Sun="Sun";a.Moon="Moon";a.Mercury="Mercury";a.Venus="Venus";a.Earth="Earth";a.Mars="Mars";a.Jupiter="Jupiter";a.Saturn="Saturn";a.Uranus="Uranus";a.Neptune="Neptune";a.Pluto="Pluto";a.SSB=
"SSB";a.EMB="EMB";a.Star1="Star1";a.Star2="Star2";a.Star3="Star3";a.Star4="Star4";a.Star5="Star5";a.Star6="Star6";a.Star7="Star7";a.Star8="Star8"})(m=e.Body||(e.Body={}));var ld=[m.Star1,m.Star2,m.Star3,m.Star4,m.Star5,m.Star6,m.Star7,m.Star8],md=[{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0},{ra:0,dec:0,dist:0}];e.DefineStar=function(a,b,c,d){var f=T(a);if(!f)throw"Invalid star body: "+a;w(b);w(c);w(d);
if(0>b||24<=b)throw"Invalid right ascension for star: "+b;if(-90>c||90<c)throw"Invalid declination for star: "+c;if(1>d)throw"Invalid star distance: "+d;f.ra=b;f.dec=c;f.dist=d*e.AU_PER_LY};var F;(function(a){a[a.From2000=0]="From2000";a[a.Into2000=1]="Into2000"})(F||(F={}));var aa={Mercury:{OrbitalPeriod:87.969},Venus:{OrbitalPeriod:224.701},Earth:{OrbitalPeriod:365.256},Mars:{OrbitalPeriod:686.98},Jupiter:{OrbitalPeriod:4332.589},Saturn:{OrbitalPeriod:10759.22},Uranus:{OrbitalPeriod:30685.4},Neptune:{OrbitalPeriod:60189},
Pluto:{OrbitalPeriod:90560}};e.PlanetOrbitalPeriod=function(a){if(a in aa)return aa[a].OrbitalPeriod;throw"Unknown orbital period for: "+a;};var M={Mercury:[[[[4.40250710144,0,0],[.40989414977,1.48302034195,26087.9031415742],[.050462942,4.47785489551,52175.8062831484],[.00855346844,1.16520322459,78263.70942472259],[.00165590362,4.11969163423,104351.61256629678],[3.4561897E-4,.77930768443,130439.51570787099],[7.583476E-5,3.71348404924,156527.41884944518]],[[26087.90313685529,0,0],[.01131199811,6.21874197797,
26087.9031415742],[.00292242298,3.04449355541,52175.8062831484],[7.5775081E-4,6.08568821653,78263.70942472259],[1.9676525E-4,2.80965111777,104351.61256629678]]],[[[.11737528961,1.98357498767,26087.9031415742],[.02388076996,5.03738959686,52175.8062831484],[.01222839532,3.14159265359,0],[.0054325181,1.79644363964,78263.70942472259],[.0012977877,4.83232503958,104351.61256629678],[3.1866927E-4,1.58088495658,130439.51570787099],[7.963301E-5,4.60972126127,156527.41884944518]],[[.00274646065,3.95008450011,
26087.9031415742],[9.9737713E-4,3.14159265359,0]]],[[[.39528271651,0,0],[.07834131818,6.19233722598,26087.9031415742],[.00795525558,2.95989690104,52175.8062831484],[.00121281764,6.01064153797,78263.70942472259],[2.1921969E-4,2.77820093972,104351.61256629678],[4.354065E-5,5.82894543774,130439.51570787099]],[[.0021734774,4.65617158665,26087.9031415742],[4.4141826E-4,1.42385544001,52175.8062831484]]]],Venus:[[[[3.17614666774,0,0],[.01353968419,5.59313319619,10213.285546211],[8.9891645E-4,5.30650047764,
20426.571092422],[5.477194E-5,4.41630661466,7860.4193924392],[3.455741E-5,2.6996444782,11790.6290886588],[2.372061E-5,2.99377542079,3930.2096962196],[1.317168E-5,5.18668228402,26.2983197998],[1.664146E-5,4.25018630147,1577.3435424478],[1.438387E-5,4.15745084182,9683.5945811164],[1.200521E-5,6.15357116043,30639.856638633]],[[10213.28554621638,0,0],[9.5617813E-4,2.4640651111,10213.285546211],[7.787201E-5,.6247848222,20426.571092422]]],[[[.05923638472,.26702775812,10213.285546211],[4.0107978E-4,1.14737178112,
20426.571092422],[3.2814918E-4,3.14159265359,0]],[[.00287821243,1.88964962838,10213.285546211]]],[[[.72334820891,0,0],[.00489824182,4.02151831717,10213.285546211],[1.658058E-5,4.90206728031,20426.571092422],[1.378043E-5,1.12846591367,11790.6290886588],[1.632096E-5,2.84548795207,7860.4193924392],[4.98395E-6,2.58682193892,9683.5945811164],[2.21985E-6,2.01346696541,19367.1891622328],[2.37454E-6,2.55136053886,15720.8387848784]],[[3.4551041E-4,.89198706276,10213.285546211]]]],Earth:[[[[1.75347045673,0,
0],[.03341656453,4.66925680415,6283.0758499914],[3.4894275E-4,4.62610242189,12566.1516999828],[3.417572E-5,2.82886579754,3.523118349],[3.497056E-5,2.74411783405,5753.3848848968],[3.135899E-5,3.62767041756,77713.7714681205],[2.676218E-5,4.41808345438,7860.4193924392],[2.342691E-5,6.13516214446,3930.2096962196],[1.273165E-5,2.03709657878,529.6909650946],[1.324294E-5,.74246341673,11506.7697697936],[9.01854E-6,2.04505446477,26.2983197998],[1.199167E-5,1.10962946234,1577.3435424478],[8.57223E-6,3.50849152283,
398.1490034082],[7.79786E-6,1.17882681962,5223.6939198022],[9.9025E-6,5.23268072088,5884.9268465832],[7.53141E-6,2.53339052847,5507.5532386674],[5.05267E-6,4.58292599973,18849.2275499742],[4.92392E-6,4.20505711826,775.522611324],[3.56672E-6,2.91954114478,.0673103028],[2.84125E-6,1.89869240932,796.2980068164],[2.42879E-6,.34481445893,5486.777843175],[3.17087E-6,5.84901948512,11790.6290886588],[2.71112E-6,.31486255375,10977.078804699],[2.06217E-6,4.80646631478,2544.3144198834],[2.05478E-6,1.86953770281,
5573.1428014331],[2.02318E-6,2.45767790232,6069.7767545534],[1.26225E-6,1.08295459501,20.7753954924],[1.55516E-6,.83306084617,213.299095438]],[[6283.0758499914,0,0],[.00206058863,2.67823455808,6283.0758499914],[4.303419E-5,2.63512233481,12566.1516999828]],[[8.721859E-5,1.07253635559,6283.0758499914]]],[[],[[.00227777722,3.4137662053,6283.0758499914],[3.805678E-5,3.37063423795,12566.1516999828]]],[[[1.00013988784,0,0],[.01670699632,3.09846350258,6283.0758499914],[1.3956024E-4,3.05524609456,12566.1516999828],
[3.08372E-5,5.19846674381,77713.7714681205],[1.628463E-5,1.17387558054,5753.3848848968],[1.575572E-5,2.84685214877,7860.4193924392],[9.24799E-6,5.45292236722,11506.7697697936],[5.42439E-6,4.56409151453,3930.2096962196],[4.7211E-6,3.66100022149,5884.9268465832],[8.5831E-7,1.27079125277,161000.6857376741],[5.7056E-7,2.01374292245,83996.84731811189],[5.5736E-7,5.2415979917,71430.69561812909],[1.74844E-6,3.01193636733,18849.2275499742],[2.43181E-6,4.2734953079,11790.6290886588]],[[.00103018607,1.10748968172,
6283.0758499914],[1.721238E-5,1.06442300386,12566.1516999828]],[[4.359385E-5,5.78455133808,6283.0758499914]]]],Mars:[[[[6.20347711581,0,0],[.18656368093,5.0503710027,3340.6124266998],[.01108216816,5.40099836344,6681.2248533996],[9.1798406E-4,5.75478744667,10021.8372800994],[2.7744987E-4,5.97049513147,3.523118349],[1.0610235E-4,2.93958560338,2281.2304965106],[1.2315897E-4,.84956094002,2810.9214616052],[8.926784E-5,4.15697846427,.0172536522],[8.715691E-5,6.11005153139,13362.4497067992],[6.797556E-5,
.36462229657,398.1490034082],[7.774872E-5,3.33968761376,5621.8429232104],[3.575078E-5,1.6618650571,2544.3144198834],[4.161108E-5,.22814971327,2942.4634232916],[3.075252E-5,.85696614132,191.4482661116],[2.628117E-5,.64806124465,3337.0893083508],[2.937546E-5,6.07893711402,.0673103028],[2.389414E-5,5.03896442664,796.2980068164],[2.579844E-5,.02996736156,3344.1355450488],[1.528141E-5,1.14979301996,6151.533888305],[1.798806E-5,.65634057445,529.6909650946],[1.264357E-5,3.62275122593,5092.1519581158],[1.286228E-5,
3.06796065034,2146.1654164752],[1.546404E-5,2.91579701718,1751.539531416],[1.024902E-5,3.69334099279,8962.4553499102],[8.91566E-6,.18293837498,16703.062133499],[8.58759E-6,2.4009381194,2914.0142358238],[8.32715E-6,2.46418619474,3340.5951730476],[8.3272E-6,4.49495782139,3340.629680352],[7.12902E-6,3.66335473479,1059.3819301892],[7.48723E-6,3.82248614017,155.4203994342],[7.23861E-6,.67497311481,3738.761430108],[6.35548E-6,2.92182225127,8432.7643848156],[6.55162E-6,.48864064125,3127.3133312618],[5.50474E-6,
3.81001042328,.9803210682],[5.5275E-6,4.47479317037,1748.016413067],[4.25966E-6,.55364317304,6283.0758499914],[4.15131E-6,.49662285038,213.299095438],[4.72167E-6,3.62547124025,1194.4470102246],[3.06551E-6,.38052848348,6684.7479717486],[3.12141E-6,.99853944405,6677.7017350506],[2.93198E-6,4.22131299634,20.7753954924],[3.02375E-6,4.48618007156,3532.0606928114],[2.74027E-6,.54222167059,3340.545116397],[2.81079E-6,5.88163521788,1349.8674096588],[2.31183E-6,1.28242156993,3870.3033917944],[2.83602E-6,5.7688543494,
3149.1641605882],[2.36117E-6,5.75503217933,3333.498879699],[2.74033E-6,.13372524985,3340.6797370026],[2.99395E-6,2.78323740866,6254.6266625236]],[[3340.61242700512,0,0],[.01457554523,3.60433733236,3340.6124266998],[.00168414711,3.92318567804,6681.2248533996],[2.0622975E-4,4.26108844583,10021.8372800994],[3.452392E-5,4.7321039319,3.523118349],[2.586332E-5,4.60670058555,13362.4497067992],[8.41535E-6,4.45864030426,2281.2304965106]],[[5.8152577E-4,2.04961712429,3340.6124266998],[1.3459579E-4,2.45738706163,
6681.2248533996]]],[[[.03197134986,3.76832042431,3340.6124266998],[.00298033234,4.10616996305,6681.2248533996],[.00289104742,0,0],[3.1365539E-4,4.4465105309,10021.8372800994],[3.4841E-5,4.7881254926,13362.4497067992]],[[.00217310991,6.04472194776,3340.6124266998],[2.0976948E-4,3.14159265359,0],[1.2834709E-4,1.60810667915,6681.2248533996]]],[[[1.53033488271,0,0],[.1418495316,3.47971283528,3340.6124266998],[.00660776362,3.81783443019,6681.2248533996],[4.6179117E-4,4.15595316782,10021.8372800994],[8.109733E-5,
5.55958416318,2810.9214616052],[7.485318E-5,1.77239078402,5621.8429232104],[5.523191E-5,1.3643630377,2281.2304965106],[3.82516E-5,4.49407183687,13362.4497067992],[2.306537E-5,.09081579001,2544.3144198834],[1.999396E-5,5.36059617709,3337.0893083508],[2.484394E-5,4.9254563992,2942.4634232916],[1.960195E-5,4.74249437639,3344.1355450488],[1.167119E-5,2.11260868341,5092.1519581158],[1.102816E-5,5.00908403998,398.1490034082],[8.99066E-6,4.40791133207,529.6909650946],[9.92252E-6,5.83861961952,6151.533888305],
[8.07354E-6,2.10217065501,1059.3819301892],[7.97915E-6,3.44839203899,796.2980068164],[7.40975E-6,1.49906336885,2146.1654164752]],[[.01107433345,2.03250524857,3340.6124266998],[.00103175887,2.37071847807,6681.2248533996],[1.28772E-4,0,0],[1.081588E-4,2.70888095665,10021.8372800994]],[[4.4242249E-4,.47930604954,3340.6124266998],[8.138042E-5,.86998389204,6681.2248533996]]]],Jupiter:[[[[.59954691494,0,0],[.09695898719,5.06191793158,529.6909650946],[.00573610142,1.44406205629,7.1135470008],[.00306389205,
5.41734730184,1059.3819301892],[9.7178296E-4,4.14264726552,632.7837393132],[7.2903078E-4,3.64042916389,522.5774180938],[6.4263975E-4,3.41145165351,103.0927742186],[3.9806064E-4,2.29376740788,419.4846438752],[3.8857767E-4,1.27231755835,316.3918696566],[2.7964629E-4,1.7845459182,536.8045120954],[1.358973E-4,5.7748104079,1589.0728952838],[8.246349E-5,3.5822792584,206.1855484372],[8.768704E-5,3.63000308199,949.1756089698],[7.368042E-5,5.0810119427,735.8765135318],[6.26315E-5,.02497628807,213.299095438],
[6.114062E-5,4.51319998626,1162.4747044078],[4.905396E-5,1.32084470588,110.2063212194],[5.305285E-5,1.30671216791,14.2270940016],[5.305441E-5,4.18625634012,1052.2683831884],[4.647248E-5,4.69958103684,3.9321532631],[3.045023E-5,4.31676431084,426.598190876],[2.609999E-5,1.56667394063,846.0828347512],[2.028191E-5,1.06376530715,3.1813937377],[1.764763E-5,2.14148655117,1066.49547719],[1.722972E-5,3.88036268267,1265.5674786264],[1.920945E-5,.97168196472,639.897286314],[1.633223E-5,3.58201833555,515.463871093],
[1.431999E-5,4.29685556046,625.6701923124],[9.73272E-6,4.09764549134,95.9792272178]],[[529.69096508814,0,0],[.00489503243,4.2208293947,529.6909650946],[.00228917222,6.02646855621,7.1135470008],[3.0099479E-4,4.54540782858,1059.3819301892],[2.072092E-4,5.45943156902,522.5774180938],[1.2103653E-4,.16994816098,536.8045120954],[6.067987E-5,4.42422292017,103.0927742186],[5.433968E-5,3.98480737746,419.4846438752],[4.237744E-5,5.89008707199,14.2270940016]],[[4.7233601E-4,4.32148536482,7.1135470008],[3.0649436E-4,
2.929777887,529.6909650946],[1.4837605E-4,3.14159265359,0]]],[[[.02268615702,3.55852606721,529.6909650946],[.00109971634,3.90809347197,1059.3819301892],[.00110090358,0,0],[8.101428E-5,3.60509572885,522.5774180938],[6.043996E-5,4.25883108339,1589.0728952838],[6.437782E-5,.30627119215,536.8045120954]],[[7.8203446E-4,1.52377859742,529.6909650946]]],[[[5.20887429326,0,0],[.25209327119,3.49108639871,529.6909650946],[.00610599976,3.84115365948,1059.3819301892],[.00282029458,2.57419881293,632.7837393132],
[.00187647346,2.07590383214,522.5774180938],[8.6792905E-4,.71001145545,419.4846438752],[7.2062974E-4,.21465724607,536.8045120954],[6.5517248E-4,5.9799588479,316.3918696566],[2.9134542E-4,1.67759379655,103.0927742186],[3.0135335E-4,2.16132003734,949.1756089698],[2.3453271E-4,3.54023522184,735.8765135318],[2.2283743E-4,4.19362594399,1589.0728952838],[2.3947298E-4,.2745803748,7.1135470008],[1.3032614E-4,2.96042965363,1162.4747044078],[9.70336E-5,1.90669633585,206.1855484372],[1.2749023E-4,2.71550286592,
1052.2683831884],[7.057931E-5,2.18184839926,1265.5674786264],[6.137703E-5,6.26418240033,846.0828347512],[2.616976E-5,2.00994012876,1581.959348283]],[[.0127180152,2.64937512894,529.6909650946],[6.1661816E-4,3.00076460387,1059.3819301892],[5.3443713E-4,3.89717383175,522.5774180938],[3.1185171E-4,4.88276958012,536.8045120954],[4.1390269E-4,0,0]]]],Saturn:[[[[.87401354025,0,0],[.11107659762,3.96205090159,213.299095438],[.01414150957,4.58581516874,7.1135470008],[.00398379389,.52112032699,206.1855484372],
[.00350769243,3.30329907896,426.598190876],[.00206816305,.24658372002,103.0927742186],[7.92713E-4,3.84007056878,220.4126424388],[2.3990355E-4,4.66976924553,110.2063212194],[1.6573588E-4,.43719228296,419.4846438752],[1.4906995E-4,5.76903183869,316.3918696566],[1.582029E-4,.93809155235,632.7837393132],[1.4609559E-4,1.56518472,3.9321532631],[1.3160301E-4,4.44891291899,14.2270940016],[1.5053543E-4,2.71669915667,639.897286314],[1.3005299E-4,5.98119023644,11.0457002639],[1.0725067E-4,3.12939523827,202.2533951741],
[5.863206E-5,.23656938524,529.6909650946],[5.227757E-5,4.20783365759,3.1813937377],[6.126317E-5,1.76328667907,277.0349937414],[5.019687E-5,3.17787728405,433.7117378768],[4.59255E-5,.61977744975,199.0720014364],[4.005867E-5,2.24479718502,63.7358983034],[2.953796E-5,.98280366998,95.9792272178],[3.87367E-5,3.22283226966,138.5174968707],[2.461186E-5,2.03163875071,735.8765135318],[3.269484E-5,.77492638211,949.1756089698],[1.758145E-5,3.2658010994,522.5774180938],[1.640172E-5,5.5050445305,846.0828347512],
[1.391327E-5,4.02333150505,323.5054166574],[1.580648E-5,4.37265307169,309.2783226558],[1.123498E-5,2.83726798446,415.5524906121],[1.017275E-5,3.71700135395,227.5261894396],[8.48642E-6,3.1915017083,209.3669421749]],[[213.2990952169,0,0],[.01297370862,1.82834923978,213.299095438],[.00564345393,2.88499717272,7.1135470008],[9.3734369E-4,1.06311793502,426.598190876],[.00107674962,2.27769131009,206.1855484372],[4.0244455E-4,2.04108104671,220.4126424388],[1.9941774E-4,1.2795439047,103.0927742186],[1.0511678E-4,
2.7488034213,14.2270940016],[6.416106E-5,.38238295041,639.897286314],[4.848994E-5,2.43037610229,419.4846438752],[4.056892E-5,2.92133209468,110.2063212194],[3.768635E-5,3.6496533078,3.9321532631]],[[.0011644133,1.17988132879,7.1135470008],[9.1841837E-4,.0732519584,213.299095438],[3.6661728E-4,0,0],[1.5274496E-4,4.06493179167,206.1855484372]]],[[[.04330678039,3.60284428399,213.299095438],[.00240348302,2.85238489373,426.598190876],[8.4745939E-4,0,0],[3.0863357E-4,3.48441504555,220.4126424388],[3.4116062E-4,
.57297307557,206.1855484372],[1.473407E-4,2.11846596715,639.897286314],[9.916667E-5,5.79003188904,419.4846438752],[6.993564E-5,4.7360468972,7.1135470008],[4.807588E-5,5.43305312061,316.3918696566]],[[.00198927992,4.93901017903,213.299095438],[3.6947916E-4,3.14159265359,0],[1.7966989E-4,.5197943111,426.598190876]]],[[[9.55758135486,0,0],[.52921382865,2.39226219573,213.299095438],[.01873679867,5.2354960466,206.1855484372],[.01464663929,1.64763042902,426.598190876],[.00821891141,5.93520042303,316.3918696566],
[.00547506923,5.0153261898,103.0927742186],[.0037168465,2.27114821115,220.4126424388],[.00361778765,3.13904301847,7.1135470008],[.00140617506,5.70406606781,632.7837393132],[.00108974848,3.29313390175,110.2063212194],[6.9006962E-4,5.94099540992,419.4846438752],[6.1053367E-4,.94037691801,639.897286314],[4.8913294E-4,1.55733638681,202.2533951741],[3.4143772E-4,.19519102597,277.0349937414],[3.2401773E-4,5.47084567016,949.1756089698],[2.0936596E-4,.46349251129,735.8765135318],[9.796004E-5,5.20477537945,
1265.5674786264],[1.1993338E-4,5.98050967385,846.0828347512],[2.08393E-4,1.52102476129,433.7117378768],[1.5298404E-4,3.0594381494,529.6909650946],[6.465823E-5,.17732249942,1052.2683831884],[1.1380257E-4,1.7310542704,522.5774180938],[3.419618E-5,4.94550542171,1581.959348283]],[[.0618298134,.2584351148,213.299095438],[.00506577242,.71114625261,206.1855484372],[.00341394029,5.79635741658,426.598190876],[.00188491195,.47215589652,220.4126424388],[.00186261486,3.14159265359,0],[.00143891146,1.40744822888,
7.1135470008]],[[.00436902572,4.78671677509,213.299095438]]]],Uranus:[[[[5.48129294297,0,0],[.09260408234,.89106421507,74.7815985673],[.01504247898,3.6271926092,1.4844727083],[.00365981674,1.89962179044,73.297125859],[.00272328168,3.35823706307,149.5631971346],[7.0328461E-4,5.39254450063,63.7358983034],[6.8892678E-4,6.09292483287,76.2660712756],[6.1998615E-4,2.26952066061,2.9689454166],[6.1950719E-4,2.85098872691,11.0457002639],[2.646877E-4,3.14152083966,71.8126531507],[2.5710476E-4,6.11379840493,
454.9093665273],[2.107885E-4,4.36059339067,148.0787244263],[1.7818647E-4,1.74436930289,36.6485629295],[1.4613507E-4,4.73732166022,3.9321532631],[1.1162509E-4,5.8268179635,224.3447957019],[1.099791E-4,.48865004018,138.5174968707],[9.527478E-5,2.95516862826,35.1640902212],[7.545601E-5,5.236265824,109.9456887885],[4.220241E-5,3.23328220918,70.8494453042],[4.0519E-5,2.277550173,151.0476698429],[3.354596E-5,1.0654900738,4.4534181249],[2.926718E-5,4.62903718891,9.5612275556],[3.49034E-5,5.48306144511,146.594251718],
[3.144069E-5,4.75199570434,77.7505439839],[2.922333E-5,5.35235361027,85.8272988312],[2.272788E-5,4.36600400036,70.3281804424],[2.051219E-5,1.51773566586,.1118745846],[2.148602E-5,.60745949945,38.1330356378],[1.991643E-5,4.92437588682,277.0349937414],[1.376226E-5,2.04283539351,65.2203710117],[1.666902E-5,3.62744066769,380.12776796],[1.284107E-5,3.11347961505,202.2533951741],[1.150429E-5,.93343589092,3.1813937377],[1.533221E-5,2.58594681212,52.6901980395],[1.281604E-5,.54271272721,222.8603229936],[1.372139E-5,
4.19641530878,111.4301614968],[1.221029E-5,.1990065003,108.4612160802],[9.46181E-6,1.19253165736,127.4717966068],[1.150989E-5,4.17898916639,33.6796175129]],[[74.7815986091,0,0],[.00154332863,5.24158770553,74.7815985673],[2.4456474E-4,1.71260334156,1.4844727083],[9.258442E-5,.4282973235,11.0457002639],[8.265977E-5,1.50218091379,63.7358983034],[9.15016E-5,1.41213765216,149.5631971346]]],[[[.01346277648,2.61877810547,74.7815985673],[6.23414E-4,5.08111189648,149.5631971346],[6.1601196E-4,3.14159265359,
0],[9.963722E-5,1.61603805646,76.2660712756],[9.92616E-5,.57630380333,73.297125859]],[[3.4101978E-4,.01321929936,74.7815985673]]],[[[19.21264847206,0,0],[.88784984413,5.60377527014,74.7815985673],[.03440836062,.32836099706,73.297125859],[.0205565386,1.7829515933,149.5631971346],[.0064932241,4.52247285911,76.2660712756],[.00602247865,3.86003823674,63.7358983034],[.00496404167,1.40139935333,454.9093665273],[.00338525369,1.58002770318,138.5174968707],[.00243509114,1.57086606044,71.8126531507],[.00190522303,
1.99809394714,1.4844727083],[.00161858838,2.79137786799,148.0787244263],[.00143706183,1.38368544947,11.0457002639],[9.3192405E-4,.17437220467,36.6485629295],[7.1424548E-4,4.24509236074,224.3447957019],[8.9806014E-4,3.66105364565,109.9456887885],[3.9009723E-4,1.66971401684,70.8494453042],[4.6677296E-4,1.39976401694,35.1640902212],[3.9025624E-4,3.36234773834,277.0349937414],[3.6755274E-4,3.88649278513,146.594251718],[3.0348723E-4,.70100838798,151.0476698429],[2.9156413E-4,3.180563367,77.7505439839],
[2.2637073E-4,.72518687029,529.6909650946],[1.1959076E-4,1.7504339214,984.6003316219],[2.5620756E-4,5.25656086672,380.12776796]],[[.01479896629,3.67205697578,74.7815985673]]]],Neptune:[[[[5.31188633046,0,0],[.0179847553,2.9010127389,38.1330356378],[.01019727652,.48580922867,1.4844727083],[.00124531845,4.83008090676,36.6485629295],[4.2064466E-4,5.41054993053,2.9689454166],[3.7714584E-4,6.09221808686,35.1640902212],[3.3784738E-4,1.24488874087,76.2660712756],[1.6482741E-4,7.727998E-5,491.5579294568],
[9.198584E-5,4.93747051954,39.6175083461],[8.99425E-5,.27462171806,175.1660598002]],[[38.13303563957,0,0],[1.6604172E-4,4.86323329249,1.4844727083],[1.5744045E-4,2.27887427527,38.1330356378]]],[[[.03088622933,1.44104372644,38.1330356378],[2.7780087E-4,5.91271884599,76.2660712756],[2.7623609E-4,0,0],[1.5355489E-4,2.52123799551,36.6485629295],[1.5448133E-4,3.50877079215,39.6175083461]]],[[[30.07013205828,0,0],[.27062259632,1.32999459377,38.1330356378],[.01691764014,3.25186135653,36.6485629295],[.00807830553,
5.18592878704,1.4844727083],[.0053776051,4.52113935896,35.1640902212],[.00495725141,1.5710564165,491.5579294568],[.00274571975,1.84552258866,175.1660598002],[1.201232E-4,1.92059384991,1021.2488945514],[.00121801746,5.79754470298,76.2660712756],[.00100896068,.3770272493,73.297125859],[.00135134092,3.37220609835,39.6175083461],[7.571796E-5,1.07149207335,388.4651552382]]]]};e.DeltaT_EspenakMeeus=sa;e.DeltaT_JplHorizons=function(a){return sa(Math.min(a,17*365.24217))};var Wb=sa;e.SetDeltaTFunction=function(a){Wb=
a};var O=function(a){if(a instanceof O)this.date=a.date,this.ut=a.ut,this.tt=a.tt;else if(a instanceof Date&&Number.isFinite(a.getTime()))this.date=a,this.ut=(a.getTime()-dd.getTime())/864E5,this.tt=Vb(this.ut);else if(Number.isFinite(a))this.date=new Date(dd.getTime()+864E5*a),this.ut=a,this.tt=Vb(this.ut);else throw"Argument must be a Date object, an AstroTime object, or a numeric UTC Julian date.";};O.FromTerrestrialTime=function(a){for(var b=new O(a);;){var c=a-b.tt;if(1E-12>Math.abs(c))return b;
b=b.AddDays(c)}};O.prototype.toString=function(){return this.date.toISOString()};O.prototype.AddDays=function(a){return new O(this.ut+a)};e.AstroTime=O;e.MakeTime=v;var $a;e.e_tilt=da;e.CalcMoonCount=0;var ed=function(a,b,c,d,f,g){this.elat=a;this.elon=b;this.mlat=c;this.mlon=d;this.dist_km=f;this.diam_deg=g};e.LibrationInfo=ed;e.Libration=function(a){var b=v(a);a=b.tt/36525;var c=a*a,d=c*a,f=c*c,g=ea(b);b=g.geo_eclip_lon;var h=g.geo_eclip_lat;g=g.distance_au*e.KM_PER_AU;var l=1.543*e.DEG2RAD,k=e.DEG2RAD*
Ga(93.272095+483202.0175233*a-.0036539*c-d/3526E3+f/86331E4),n=e.DEG2RAD*Ga(125.0445479-1934.1362891*a+.0020754*c+d/467441-f/60616E3),p=e.DEG2RAD*Ga(357.5291092+35999.0502909*a-1.536E-4*c+d/2449E4),q=e.DEG2RAD*Ga(134.9633964+477198.8675055*a+.0087414*c+d/69699-f/14712E3);d=e.DEG2RAD*Ga(297.8501921+445267.1114034*a-.0018819*c+d/545868-f/113065E3);c=1-.002516*a-7.4E-6*c;var t=b-n;f=Math.atan2(Math.sin(t)*Math.cos(h)*Math.cos(l)-Math.sin(h)*Math.sin(l),Math.cos(t)*Math.cos(h));var y=Fa(e.RAD2DEG*(f-
k));l=Math.asin(-Math.sin(t)*Math.cos(h)*Math.sin(l)-Math.sin(h)*Math.cos(l));t=-.02752*Math.cos(q)+-.02245*Math.sin(k)+.00684*Math.cos(q-2*k)+-.00293*Math.cos(2*k)+-8.5E-4*Math.cos(2*k-2*d)+-5.4E-4*Math.cos(q-2*d)+-2E-4*Math.sin(q+k)+-2E-4*Math.cos(q+2*k)+-2E-4*Math.cos(q-k)+1.4E-4*Math.cos(q+2*k-2*d);var x=-.02816*Math.sin(q)+.02244*Math.cos(k)+-.00682*Math.sin(q-2*k)+-.00279*Math.sin(2*k)+-8.3E-4*Math.sin(2*k-2*d)+6.9E-4*Math.sin(q-2*d)+4E-4*Math.cos(q+k)+-2.5E-4*Math.sin(2*q)+-2.3E-4*Math.sin(q+
2*k)+2E-4*Math.cos(q-k)+1.9E-4*Math.sin(q-k)+1.3E-4*Math.sin(q+2*k-2*d)+-1E-4*Math.cos(q-3*k);return new ed(e.RAD2DEG*l+(x*Math.cos(f)-t*Math.sin(f)),y+(-(.0252*c*Math.sin(p)+.00473*Math.sin(2*q-2*k)+-.00467*Math.sin(q)+.00396*Math.sin(e.DEG2RAD*(119.75+131.849*a))+.00276*Math.sin(2*q-2*d)+.00196*Math.sin(n)+-.00183*Math.cos(q-k)+.00115*Math.sin(q-2*d)+-9.6E-4*Math.sin(q-d)+4.6E-4*Math.sin(2*k-2*d)+-3.9E-4*Math.sin(q-k)+-3.2E-4*Math.sin(q-p-d)+2.7E-4*Math.sin(2*q-p-2*d)+2.3E-4*Math.sin(e.DEG2RAD*
(72.56+20.186*a))+-1.4E-4*Math.sin(2*d)+1.4E-4*Math.cos(2*q-2*k)+-1.2E-4*Math.sin(q-2*k)+-1.2E-4*Math.sin(2*q)+1.1E-4*Math.sin(2*q-2*p-2*d))+(t*Math.cos(f)+x*Math.sin(f))*Math.tan(l)),e.RAD2DEG*h,e.RAD2DEG*b,g,2*e.RAD2DEG*Math.atan(1737.4/Math.sqrt(g*g-1737.4*1737.4)))};var eb;e.SiderealTime=bc;var E=function(a,b,c,d){this.x=a;this.y=b;this.z=c;this.t=d};E.prototype.Length=function(){return Math.hypot(this.x,this.y,this.z)};e.Vector=E;var I=function(a,b,c,d,f,g,h){this.x=a;this.y=b;this.z=c;this.vx=
d;this.vy=f;this.vz=g;this.t=h};e.StateVector=I;var Ba=function(a,b,c){this.lat=w(a);this.lon=w(b);this.dist=w(c)};e.Spherical=Ba;var gb=function(a,b,c,d){this.ra=w(a);this.dec=w(b);this.dist=w(c);this.vec=d};e.EquatorialCoordinates=gb;var J=function(a){this.rot=a};e.RotationMatrix=J;e.MakeRotation=function(a){if(!qd(a))throw"Argument must be a [3][3] array of numbers";return new J(a)};var ec=function(a,b,c,d){this.azimuth=w(a);this.altitude=w(b);this.ra=w(c);this.dec=w(d)};e.HorizontalCoordinates=
ec;var gc=function(a,b,c){this.vec=a;this.elat=w(b);this.elon=w(c)};e.EclipticCoordinates=gc;e.Horizon=hb;var zb=function(a,b,c){this.latitude=a;this.longitude=b;this.height=c;za(this)};e.Observer=zb;e.SunPosition=fc;e.Equator=Pa;e.ObserverVector=function(a,b,c){a=v(a);var d=ca(a);b=xb(b,d).pos;c||(b=fb(b,a,F.Into2000));return yb(b,a)};e.ObserverState=function(a,b,c){a=v(a);var d=ca(a);b=xb(b,d);b=new I(b.pos[0],b.pos[1],b.pos[2],b.vel[0],b.vel[1],b.vel[2],a);return c?b:(c=F.Into2000,c===F.Into2000?
(d=Na(a,c),b=Ea(d,b),a=Ma(a,c),a=Ea(a,b)):(d=Ma(a,c),b=Ea(d,b),a=Na(a,c),a=Ea(a,b)),a)};e.VectorObserver=function(a,b){var c=ca(a.t),d=[a.x,a.y,a.z];b||(d=wa(d,a.t,F.From2000),d=xa(d,a.t,F.From2000));b=d[0]*e.KM_PER_AU;var f=d[1]*e.KM_PER_AU;d=d[2]*e.KM_PER_AU;a=Math.hypot(b,f);if(1E-6>a){c=0;var g=0<d?90:-90;d=Math.abs(d)-6356.751857971648}else{for(c=e.RAD2DEG*Math.atan2(f,b)-15*c;-180>=c;)c+=360;for(;180<c;)c-=360;g=Math.atan2(d,a);for(var h,l=0;;){if(10<++l)throw"inverse_terra failed to converge.";
b=Math.cos(g);f=Math.sin(g);var k=b*b,n=f*f,p=k+.9933056020041345*n;h=Math.sqrt(p);var q=-42.69778487239616*f*b/h-d*b+a*f;if(1E-8>Math.abs(q))break;g-=q/(-42.69778487239616*((k-n)/h-n*k*-.006694397995865464/(-42.69778487239616*p))+d*f+a*b)}g*=e.RAD2DEG;h=6378.1366/h;d=Math.abs(f)>Math.abs(b)?d/f-.9933056020041345*h:a/b-h}return new zb(g,c,1E3*d)};e.ObserverGravity=function(a,b){a=Math.sin(a*e.DEG2RAD);a*=a;return 9.7803253359*(1+.00193185265241*a)/Math.sqrt(1-.00669437999013*a)*(1-(3.15704E-7-2.10269E-9*
a)*b+7.37452E-14*b*b)};e.Ecliptic=Qa;e.GeoMoon=Y;e.EclipticGeoMoon=ib;e.GeoMoonState=Ra;e.GeoEmbState=Bb;var na=[[-73E4,[-26.118207232108,-14.376168177825,3.384402515299],[.0016339372163656,-.0027861699588508,-.0013585880229445]],[-700800,[41.974905202127,-.448502952929,-12.770351505989],[7.3458569351457E-4,.0022785014891658,4.8619778602049E-4]],[-671600,[14.706930780744,44.269110540027,9.353698474772],[-.00210001479998,2.2295915939915E-4,7.0143443551414E-4]],[-642400,[-29.441003929957,-6.43016153057,
6.858481011305],[8.4495803960544E-4,-.0030783914758711,-.0012106305981192]],[-613200,[39.444396946234,-6.557989760571,-13.913760296463],[.0011480029005873,.0022400006880665,3.5168075922288E-4]],[-584E3,[20.2303809507,43.266966657189,7.382966091923],[-.0019754081700585,5.3457141292226E-4,7.5929169129793E-4]],[-554800,[-30.65832536462,2.093818874552,9.880531138071],[6.1010603013347E-5,-.0031326500935382,-9.9346125151067E-4]],[-525600,[35.737703251673,-12.587706024764,-14.677847247563],[.0015802939375649,
.0021347678412429,1.9074436384343E-4]],[-496400,[25.466295188546,41.367478338417,5.216476873382],[-.0018054401046468,8.328308359951E-4,8.0260156912107E-4]],[-467200,[-29.847174904071,10.636426313081,12.297904180106],[-6.3257063052907E-4,-.0029969577578221,-7.4476074151596E-4]],[-438E3,[30.774692107687,-18.236637015304,-14.945535879896],[.0020113162005465,.0019353827024189,-2.0937793168297E-6]],[-408800,[30.243153324028,38.656267888503,2.938501750218],[-.0016052508674468,.0011183495337525,8.3333973416824E-4]],
[-379600,[-27.288984772533,18.643162147874,14.023633623329],[-.0011856388898191,-.0027170609282181,-4.9015526126399E-4]],[-350400,[24.519605196774,-23.245756064727,-14.626862367368],[.0024322321483154,.0016062008146048,-2.3369181613312E-4]],[-321200,[34.505274805875,35.125338586954,.557361475637],[-.0013824391637782,.0013833397561817,8.4823598806262E-4]],[-292E3,[-23.275363915119,25.818514298769,15.055381588598],[-.0016062295460975,-.0023395961498533,-2.4377362639479E-4]],[-262800,[17.050384798092,
-27.180376290126,-13.608963321694],[.0028175521080578,.0011358749093955,-4.9548725258825E-4]],[-233600,[38.093671910285,30.880588383337,-1.843688067413],[-.0011317697153459,.0016128814698472,8.4177586176055E-4]],[-204400,[-18.197852930878,31.932869934309,15.438294826279],[-.0019117272501813,-.0019146495909842,-1.9657304369835E-5]],[-175200,[8.528924039997,-29.618422200048,-11.805400994258],[.0031034370787005,5.139363329243E-4,-7.7293066202546E-4]],[-146E3,[40.94685725864,25.904973592021,-4.256336240499],
[-8.3652705194051E-4,.0018129497136404,8.156422827306E-4]],[-116800,[-12.326958895325,36.881883446292,15.217158258711],[-.0021166103705038,-.001481442003599,1.7401209844705E-4]],[-87600,[-.633258375909,-30.018759794709,-9.17193287495],[.0032016994581737,-2.5279858672148E-4,-.0010411088271861]],[-58400,[42.936048423883,20.344685584452,-6.588027007912],[-5.0525450073192E-4,.0019910074335507,7.7440196540269E-4]],[-29200,[-5.975910552974,40.61180995846,14.470131723673],[-.0022184202156107,-.0010562361130164,
3.3652250216211E-4]],[0,[-9.875369580774,-27.978926224737,-5.753711824704],[.0030287533248818,-.0011276087003636,-.0012651326732361]],[29200,[43.958831986165,14.214147973292,-8.808306227163],[-1.4717608981871E-4,.0021404187242141,7.1486567806614E-4]],[58400,[.67813676352,43.094461639362,13.243238780721],[-.0022358226110718,-6.3233636090933E-4,4.7664798895648E-4]],[87600,[-18.282602096834,-23.30503958666,-1.766620508028],[.0025567245263557,-.0019902940754171,-.0013943491701082]],[116800,[43.873338744526,
7.700705617215,-10.814273666425],[2.3174803055677E-4,.0022402163127924,6.2988756452032E-4]],[146E3,[7.392949027906,44.382678951534,11.629500214854],[-.002193281545383,-2.1751799585364E-4,5.9556516201114E-4]],[175200,[-24.981690229261,-16.204012851426,2.466457544298],[.001819398914958,-.0026765419531201,-.0013848283502247]],[204400,[42.530187039511,.845935508021,-12.554907527683],[6.5059779150669E-4,.0022725657282262,5.1133743202822E-4]],[233600,[13.999526486822,44.462363044894,9.669418486465],[-.0021079296569252,
1.7533423831993E-4,6.9128485798076E-4]],[262800,[-29.184024803031,-7.371243995762,6.493275957928],[9.3581363109681E-4,-.0030610357109184,-.0012364201089345]],[292E3,[39.831980671753,-6.078405766765,-13.909815358656],[.0011117769689167,.0022362097830152,3.6230548231153E-4]],[321200,[20.294955108476,43.417190420251,7.450091985932],[-.0019742157451535,5.3102050468554E-4,7.5938408813008E-4]],[350400,[-30.66999230216,2.318743558955,9.973480913858],[4.5605107450676E-5,-.0031308219926928,-9.9066533301924E-4]],
[379600,[35.626122155983,-12.897647509224,-14.777586508444],[.0016015684949743,.0021171931182284,1.8002516202204E-4]],[408800,[26.133186148561,41.232139187599,5.00640132622],[-.0017857704419579,8.6046232702817E-4,8.0614690298954E-4]],[438E3,[-29.57674022923,11.863535943587,12.631323039872],[-7.2292830060955E-4,-.0029587820140709,-7.08242964503E-4]],[467200,[29.910805787391,-19.159019294,-15.013363865194],[.0020871080437997,.0018848372554514,-3.8528655083926E-5]],[496400,[31.375957451819,38.050372720763,
2.433138343754],[-.0015546055556611,.0011699815465629,8.3565439266001E-4]],[525600,[-26.360071336928,20.662505904952,14.414696258958],[-.0013142373118349,-.0026236647854842,-4.2542017598193E-4]],[554800,[22.599441488648,-24.508879898306,-14.484045731468],[.0025454108304806,.0014917058755191,-3.0243665086079E-4]],[584E3,[35.877864013014,33.894226366071,-.224524636277],[-.0012941245730845,.0014560427668319,8.4762160640137E-4]],[613200,[-21.538149762417,28.204068269761,15.321973799534],[-.001731211740901,
-.0021939631314577,-1.631691327518E-4]],[642400,[13.971521374415,-28.339941764789,-13.083792871886],[.0029334630526035,9.1860931752944E-4,-5.9939422488627E-4]],[671600,[39.526942044143,28.93989736011,-2.872799527539],[-.0010068481658095,.001702113288809,8.3578230511981E-4]],[700800,[-15.576200701394,34.399412961275,15.466033737854],[-.0020098814612884,-.0017191109825989,7.0414782780416E-5]],[73E4,[4.24325283709,-30.118201690825,-10.707441231349],[.0031725847067411,1.609846120227E-4,-9.0672150593868E-4]]],
B=function(a,b,c){this.x=a;this.y=b;this.z=c};B.prototype.clone=function(){return new B(this.x,this.y,this.z)};B.prototype.ToAstroVector=function(a){return new E(this.x,this.y,this.z,a)};B.zero=function(){return new B(0,0,0)};B.prototype.quadrature=function(){return this.x*this.x+this.y*this.y+this.z*this.z};B.prototype.add=function(a){return new B(this.x+a.x,this.y+a.y,this.z+a.z)};B.prototype.sub=function(a){return new B(this.x-a.x,this.y-a.y,this.z-a.z)};B.prototype.incr=function(a){this.x+=a.x;
this.y+=a.y;this.z+=a.z};B.prototype.decr=function(a){this.x-=a.x;this.y-=a.y;this.z-=a.z};B.prototype.mul=function(a){return new B(a*this.x,a*this.y,a*this.z)};B.prototype.div=function(a){return new B(this.x/a,this.y/a,this.z/a)};B.prototype.mean=function(a){return new B((this.x+a.x)/2,(this.y+a.y)/2,(this.z+a.z)/2)};B.prototype.neg=function(){return new B(-this.x,-this.y,-this.z)};var X=function(a,b,c){this.tt=a;this.r=b;this.v=c};X.prototype.clone=function(){return new X(this.tt,this.r,this.v)};
X.prototype.sub=function(a){return new X(this.tt,this.r.sub(a.r),this.v.sub(a.v))};var Da=function(a){var b=new X(a,new B(0,0,0),new B(0,0,0));this.Jupiter=R(b,a,m.Jupiter,2.825345909524226E-7);this.Saturn=R(b,a,m.Saturn,8.459715185680659E-8);this.Uranus=R(b,a,m.Uranus,1.292024916781969E-8);this.Neptune=R(b,a,m.Neptune,1.524358900784276E-8);this.Jupiter.r.decr(b.r);this.Jupiter.v.decr(b.v);this.Saturn.r.decr(b.r);this.Saturn.v.decr(b.v);this.Uranus.r.decr(b.r);this.Uranus.v.decr(b.v);this.Neptune.r.decr(b.r);
this.Neptune.v.decr(b.v);this.Sun=new X(a,b.r.mul(-1),b.v.mul(-1))};Da.prototype.Acceleration=function(a){var b=Ta(a,2.959122082855911E-4,this.Sun.r);b.incr(Ta(a,2.825345909524226E-7,this.Jupiter.r));b.incr(Ta(a,8.459715185680659E-8,this.Saturn.r));b.incr(Ta(a,1.292024916781969E-8,this.Uranus.r));b.incr(Ta(a,1.524358900784276E-8,this.Neptune.r));return b};var Ua=function(a,b,c,d){this.tt=a;this.r=b;this.v=c;this.a=d};Ua.prototype.clone=function(){return new Ua(this.tt,this.r.clone(),this.v.clone(),
this.a.clone())};var ic=function(a,b){this.bary=a;this.grav=b},Ib=[],rd=new J([[.999432765338654,-.0336771074697641,0],[.0303959428906285,.902057912352809,.430543388542295],[-.0144994559663353,-.430299169409101,.902569881273754]]),tb=[{mu:2.82489428433814E-7,al:[1.446213296021224,3.5515522861824],a:[[.0028210960212903,0,0]],l:[[-1.925258348666E-4,4.9369589722645,.01358483658305],[-9.70803596076E-5,4.3188796477322,.01303413843243],[-8.988174165E-5,1.9080016428617,.00305064867158],[-5.53101050262E-5,
1.4936156681569,.01293892891155]],z:[[.0041510849668155,4.089939635545,-.01290686414666],[6.260521444113E-4,1.446188898627,3.5515522949802],[3.52747346169E-5,2.1256287034578,1.2727416567E-4]],zeta:[[3.142172466014E-4,2.7964219722923,-.002315096098],[9.04169207946E-5,1.0477061879627,-5.6920638196E-4]]},{mu:2.82483274392893E-7,al:[-.3735263437471362,1.76932271112347],a:[[.0044871037804314,0,0],[4.324367498E-7,1.819645606291,1.7822295777568]],l:[[8.576433172936E-4,4.3188693178264,.01303413830805],[4.549582875086E-4,
1.4936531751079,.01293892881962],[3.248939825174E-4,1.8196494533458,1.7822295777568],[-3.074250079334E-4,4.9377037005911,.01358483286724],[1.982386144784E-4,1.907986905476,.00305101212869],[1.834063551804E-4,2.1402853388529,.00145009789338],[-1.434383188452E-4,5.622214036663,.89111478887838],[-7.71939140944E-5,4.300272437235,2.6733443704266]],z:[[-.0093589104136341,4.0899396509039,-.01290686414666],[2.988994545555E-4,5.9097265185595,1.7693227079462],[2.13903639035E-4,2.1256289300016,1.2727418407E-4],
[1.980963564781E-4,2.743516829265,6.7797343009E-4],[1.210388158965E-4,5.5839943711203,3.20566149E-5],[8.37042048393E-5,1.6094538368039,-.90402165808846],[8.23525166369E-5,1.4461887708689,3.5515522949802]],zeta:[[.0040404917832303,1.0477063169425,-5.692064054E-4],[2.200421034564E-4,3.3368857864364,-1.2491307307E-4],[1.662544744719E-4,2.4134862374711,0],[5.90282470983E-5,5.9719930968366,-3.056160225E-5]]},{mu:2.82498184184723E-7,al:[.2874089391143348,.878207923589328],a:[[.0071566594572575,0,0],[1.393029911E-6,
1.1586745884981,2.6733443704266]],l:[[2.310797886226E-4,2.1402987195942,.00145009784384],[-1.828635964118E-4,4.3188672736968,.01303413828263],[1.512378778204E-4,4.9373102372298,.01358483481252],[-1.163720969778E-4,4.300265986149,2.6733443704266],[-9.55478069846E-5,1.4936612842567,.01293892879857],[8.15246854464E-5,5.6222137132535,.89111478887838],[-8.01219679602E-5,1.2995922951532,1.0034433456729],[-6.07017260182E-5,.64978769669238,.50172167043264]],z:[[.0014289811307319,2.1256295942739,1.2727413029E-4],
[7.71093122676E-4,5.5836330003496,3.20643411E-5],[5.925911780766E-4,4.0899396636448,-.01290686414666],[2.045597496146E-4,5.2713683670372,-.12523544076106],[1.785118648258E-4,.28743156721063,.8782079244252],[1.131999784893E-4,1.4462127277818,3.5515522949802],[-6.5877816921E-5,2.2702423990985,-1.7951364394537],[4.97058888328E-5,5.9096792204858,1.7693227129285]],zeta:[[.0015932721570848,3.3368862796665,-1.2491307058E-4],[8.533093128905E-4,2.4133881688166,0],[3.513347911037E-4,5.9720789850127,-3.056101771E-5],
[-1.441929255483E-4,1.0477061764435,-5.6920632124E-4]]},{mu:2.82492144889909E-7,al:[-.3620341291375704,.376486233433828],a:[[.0125879701715314,0,0],[3.595204947E-6,.64965776007116,.50172168165034],[2.7580210652E-6,1.808423578151,3.1750660413359]],l:[[5.586040123824E-4,2.1404207189815,.00145009793231],[-3.805813868176E-4,2.7358844897853,2.972965062E-5],[2.205152863262E-4,.649796525964,.5017216724358],[1.877895151158E-4,1.8084787604005,3.1750660413359],[7.66916975242E-5,6.2720114319755,1.3928364636651],
[7.47056855106E-5,1.2995916202344,1.0034433456729]],z:[[.0073755808467977,5.5836071576084,3.206509914E-5],[2.065924169942E-4,5.9209831565786,.37648624194703],[1.589869764021E-4,.28744006242623,.8782079244252],[-1.561131605348E-4,2.1257397865089,1.2727441285E-4],[1.486043380971E-4,1.4462134301023,3.5515522949802],[6.35073108731E-5,5.9096803285954,1.7693227129285],[5.99351698525E-5,4.1125517584798,-2.7985797954589],[5.40660842731E-5,5.5390350845569,.00286834082283],[-4.89596900866E-5,4.6218149483338,
-.62695712529519]],zeta:[[.0038422977898495,2.4133922085557,0],[.0022453891791894,5.9721736773277,-3.056125525E-5],[-2.604479450559E-4,3.3368746306409,-1.2491309972E-4],[3.3211214323E-5,5.5604137742337,.00290037688507]]}],fd=function(a,b,c,d){this.io=a;this.europa=b;this.ganymede=c;this.callisto=d};e.JupiterMoonsInfo=fd;e.JupiterMoons=function(a){a=new O(a);return new fd(kb(a,tb[0]),kb(a,tb[1]),kb(a,tb[2]),kb(a,tb[3]))};e.HelioVector=Z;e.HelioDistance=oa;e.CorrectLightTravel=lc;var nc=function(a,
b,c,d){this.observerBody=a;this.targetBody=b;this.aberration=c;this.observerPos=d};nc.prototype.Position=function(a){this.aberration&&(this.observerPos=Z(this.observerBody,a));var b=Z(this.targetBody,a);return new E(b.x-this.observerPos.x,b.y-this.observerPos.y,b.z-this.observerPos.z,a)};e.BackdatePosition=mc;e.GeoVector=W;e.BaryState=function(a,b){b=v(b);if(a===m.SSB)return new I(0,0,0,0,0,0,b);if(a===m.Pluto)return Hb(b,!1);var c=new Da(b.tt);switch(a){case m.Sun:return pa(c.Sun,b);case m.Jupiter:return pa(c.Jupiter,
b);case m.Saturn:return pa(c.Saturn,b);case m.Uranus:return pa(c.Uranus,b);case m.Neptune:return pa(c.Neptune,b);case m.Moon:case m.EMB:var d=Sa(M[m.Earth],b.tt);a=a===m.Moon?Ra(b):Bb(b);return new I(a.x+c.Sun.r.x+d.r.x,a.y+c.Sun.r.y+d.r.y,a.z+c.Sun.r.z+d.r.z,a.vx+c.Sun.v.x+d.v.x,a.vy+c.Sun.v.y+d.v.y,a.vz+c.Sun.v.z+d.v.z,b)}if(a in M)return a=Sa(M[a],b.tt),new I(c.Sun.r.x+a.r.x,c.Sun.r.y+a.r.y,c.Sun.r.z+a.r.z,c.Sun.v.x+a.v.x,c.Sun.v.y+a.v.y,c.Sun.v.z+a.v.z,b);throw'BaryState: Unsupported body "'+
a+'"';};e.HelioState=mb;e.Search=K;e.SearchSunLongitude=oc;e.PairLongitude=Jb;e.AngleFromSun=Ha;e.EclipticLongitude=qa;var pc=function(a,b,c,d,f,g,h,l){this.time=a;this.mag=b;this.phase_angle=c;this.helio_dist=d;this.geo_dist=f;this.gc=g;this.hc=h;this.ring_tilt=l;this.phase_fraction=(1+Math.cos(e.DEG2RAD*c))/2};e.IlluminationInfo=pc;e.Illumination=nb;e.SearchRelativeLongitude=Ia;e.MoonPhase=Kb;e.SearchMoonPhase=Wa;var rc=function(a,b){this.quarter=a;this.time=b};e.MoonQuarter=rc;e.SearchMoonQuarter=
qc;e.NextMoonQuarter=function(a){a=new Date(a.time.date.getTime()+5184E5);return qc(a)};var tc=function(a,b,c){this.pressure=a;this.temperature=b;this.density=c};e.AtmosphereInfo=tc;e.Atmosphere=sc;e.SearchRiseSet=function(a,b,c,d,f,g){g=void 0===g?0:g;if(!Number.isFinite(g)||0>g)throw"Invalid value for metersAboveGround: "+g;a:switch(a){case m.Sun:var h=Nc;break a;case m.Moon:h=Dd;break a;default:h=0}var l=sc(b.height-g),k=b.latitude*e.DEG2RAD,n=Math.sin(k);k=Math.cos(k);var p=1/Math.hypot(k,.996647180302104*
n),q=(b.height-g)/1E3,t=.175*Math.pow(1-.0065/283.15*(b.height-2/3*g),3.256);return uc(a,b,c,d,f,h,e.RAD2DEG*-(Math.sqrt(2*(1-t)*g/(1E3*Math.hypot((6378.1366*p+q)*k,(6335.438815127603*p+q)*n)))/(1-t))-Ed*l.density)};e.SearchAltitude=function(a,b,c,d,f,g){if(!Number.isFinite(g)||-90>g||90<g)throw"Invalid altitude angle: "+g;return uc(a,b,c,d,f,0,g)};var ud=function(a,b,c,d){this.tx=a;this.ty=b;this.ax=c;this.ay=d},gd=function(a,b){this.time=a;this.hor=b};e.HourAngleEvent=gd;e.SearchHourAngle=function(a,
b,c,d,f){f=void 0===f?1:f;za(b);d=v(d);var g=0;if(a===m.Earth)throw"Cannot search for hour angle of the Earth.";w(c);if(0>c||24<=c)throw"Invalid hour angle "+c;w(f);if(0===f)throw"Direction must be positive or negative.";for(;;){++g;var h=ca(d),l=Pa(a,d,b,!0,!0);h=(c+l.ra-b.longitude/15-h)%24;1===g?0<f?0>h&&(h+=24):0<h&&(h-=24):-12>h?h+=24:12<h&&(h-=24);if(.1>3600*Math.abs(h))return a=hb(d,b,l.ra,l.dec,"normal"),new gd(d,a);d=d.AddDays(h/24*.9972695717592592)}};e.HourAngle=function(a,b,c){var d=v(b);
b=bc(d);a=Pa(a,d,c,!0,!0);c=(c.longitude/15+b-a.ra)%24;0>c&&(c+=24);return c};var hd=function(a,b,c,d){this.mar_equinox=a;this.jun_solstice=b;this.sep_equinox=c;this.dec_solstice=d};e.SeasonInfo=hd;e.Seasons=function(a){function b(h,l,k){l=new Date(Date.UTC(a,l-1,k));h=oc(h,l,20);if(!h)throw"Cannot find season change near "+l.toISOString();return h}a instanceof Date&&Number.isFinite(a.getTime())&&(a=a.getUTCFullYear());if(!Number.isSafeInteger(a))throw"Cannot calculate seasons because year argument "+
a+" is neither a Date nor a safe integer.";var c=b(0,3,10),d=b(90,6,10),f=b(180,9,10),g=b(270,12,10);return new hd(c,d,f,g)};var wc=function(a,b,c,d){this.time=a;this.visibility=b;this.elongation=c;this.ecliptic_separation=d};e.ElongationEvent=wc;e.Elongation=vc;e.SearchMaxElongation=function(a,b){function c(n){var p=n.AddDays(-.005);n=n.AddDays(.005);p=Ha(a,p);n=Ha(a,n);return(p-n)/.01}b=v(b);var d={Mercury:{s1:50,s2:85},Venus:{s1:40,s2:50}}[a];if(!d)throw"SearchMaxElongation works for Mercury and Venus only.";
for(var f=0;2>=++f;){var g=qa(a,b),h=qa(m.Earth,b),l=Fa(g-h),k=g=h=void 0;l>=-d.s1&&l<+d.s1?(k=0,h=+d.s1,g=+d.s2):l>=+d.s2||l<-d.s2?(k=0,h=-d.s2,g=-d.s1):0<=l?(k=-Va(a)/4,h=+d.s1,g=+d.s2):(k=-Va(a)/4,h=-d.s2,g=-d.s1);l=b.AddDays(k);h=Ia(a,h,l);g=Ia(a,g,h);l=c(h);if(0<=l)throw"SearchMaxElongation: internal error: m1 = "+l;k=c(g);if(0>=k)throw"SearchMaxElongation: internal error: m2 = "+k;l=K(c,h,g,{init_f1:l,init_f2:k,dt_tolerance_seconds:10});if(!l)throw"SearchMaxElongation: failed search iter "+
f+" (t1="+h.toString()+", t2="+g.toString()+")";if(l.tt>=b.tt)return vc(a,l);b=g.AddDays(1)}throw"SearchMaxElongation: failed to find event after 2 tries.";};e.SearchPeakMagnitude=function(a,b){function c(k){var n=k.AddDays(-.005);k=k.AddDays(.005);n=nb(a,n).mag;return(nb(a,k).mag-n)/.01}if(a!==m.Venus)throw"SearchPeakMagnitude currently works for Venus only.";b=v(b);for(var d=0;2>=++d;){var f=qa(a,b),g=qa(m.Earth,b),h=Fa(f-g),l=f=g=void 0;-10<=h&&10>h?(l=0,g=10,f=30):30<=h||-30>h?(l=0,g=-30,f=-10):
0<=h?(l=-Va(a)/4,g=10,f=30):(l=-Va(a)/4,g=-30,f=-10);h=b.AddDays(l);g=Ia(a,g,h);f=Ia(a,f,g);h=c(g);if(0<=h)throw"SearchPeakMagnitude: internal error: m1 = "+h;l=c(f);if(0>=l)throw"SearchPeakMagnitude: internal error: m2 = "+l;h=K(c,g,f,{init_f1:h,init_f2:l,dt_tolerance_seconds:10});if(!h)throw"SearchPeakMagnitude: failed search iter "+d+" (t1="+g.toString()+", t2="+f.toString()+")";if(h.tt>=b.tt)return nb(a,h);b=f.AddDays(1)}throw"SearchPeakMagnitude: failed to find event after 2 tries.";};var Ja;
(function(a){a[a.Pericenter=0]="Pericenter";a[a.Apocenter=1]="Apocenter"})(Ja=e.ApsisKind||(e.ApsisKind={}));var Xa=function(a,b,c){this.time=a;this.kind=b;this.dist_au=c;this.dist_km=c*e.KM_PER_AU};e.Apsis=Xa;e.SearchLunarApsis=xc;e.NextLunarApsis=function(a){var b=xc(a.time.AddDays(11));if(1!==b.kind+a.kind)throw"NextLunarApsis INTERNAL ERROR: did not find alternating apogee/perigee: prev="+a.kind+" @ "+a.time.toString()+", next="+b.kind+" @ "+b.time.toString();return b};e.SearchPlanetApsis=zc;
e.NextPlanetApsis=function(a,b){if(b.kind!==Ja.Pericenter&&b.kind!==Ja.Apocenter)throw"Invalid apsis kind: "+b.kind;var c=b.time.AddDays(.25*aa[a].OrbitalPeriod);a=zc(a,c);if(1!==a.kind+b.kind)throw"Internal error: previous apsis was "+b.kind+", but found "+a.kind+" for next apsis.";return a};e.InverseRotation=Ka;e.CombineRotation=ja;e.IdentityMatrix=function(){return new J([[1,0,0],[0,1,0],[0,0,1]])};e.Pivot=function(a,b,c){if(0!==b&&1!==b&&2!==b)throw"Invalid axis "+b+". Must be [0, 1, 2].";var d=
w(c)*e.DEG2RAD;c=Math.cos(d);d=Math.sin(d);var f=(b+1)%3,g=(b+2)%3,h=[[0,0,0],[0,0,0],[0,0,0]];h[f][f]=c*a.rot[f][f]-d*a.rot[f][g];h[f][g]=d*a.rot[f][f]+c*a.rot[f][g];h[f][b]=a.rot[f][b];h[g][f]=c*a.rot[g][f]-d*a.rot[g][g];h[g][g]=d*a.rot[g][f]+c*a.rot[g][g];h[g][b]=a.rot[g][b];h[b][f]=c*a.rot[b][f]-d*a.rot[b][g];h[b][g]=d*a.rot[b][f]+c*a.rot[b][g];h[b][b]=a.rot[b][b];return new J(h)};e.VectorFromSphere=lb;e.EquatorFromVector=Mb;e.SphereFromVector=Nb;e.HorizonFromVector=function(a,b){a=Nb(a);a.lon=
Ac(a.lon);a.lat+=Oa(b,a.lat);return a};e.VectorFromHorizon=function(a,b,c){b=v(b);var d=Ac(a.lon);c=a.lat+Bc(c,a.lat);a=new Ba(c,d,a.dist);return lb(a,b)};e.Refraction=Oa;e.InverseRefraction=Bc;e.RotateVector=Ya;e.RotateState=Ea;e.Rotation_EQJ_ECL=Cc;e.Rotation_ECL_EQJ=function(){return new J([[1,0,0],[0,.9174821430670688,.3977769691083922],[0,-.3977769691083922,.9174821430670688]])};e.Rotation_EQJ_EQD=ob;e.Rotation_EQJ_ECT=function(a){var b=v(a);a=ob(b);b=Jc(b);return ja(a,b)};e.Rotation_ECT_EQJ=
function(a){var b=v(a);a=Ic(b);b=pb(b);return ja(a,b)};e.Rotation_EQD_EQJ=pb;e.Rotation_EQD_HOR=Ob;e.Rotation_HOR_EQD=Dc;e.Rotation_HOR_EQJ=Ec;e.Rotation_EQJ_HOR=function(a,b){a=Ec(a,b);return Ka(a)};e.Rotation_EQD_ECL=Fc;e.Rotation_ECL_EQD=Gc;e.Rotation_ECL_HOR=Hc;e.Rotation_HOR_ECL=function(a,b){a=Hc(a,b);return Ka(a)};e.Rotation_EQJ_GAL=function(){return new J([[-.0548624779711344,.4941095946388765,-.8676668813529025],[-.8734572784246782,-.4447938112296831,-.1980677870294097],[-.483800052994852,
.7470034631630423,.4559861124470794]])};e.Rotation_GAL_EQJ=function(){return new J([[-.0548624779711344,-.8734572784246782,-.483800052994852],[.4941095946388765,-.4447938112296831,.7470034631630423],[-.8676668813529025,-.1980677870294097,.4559861124470794]])};e.Rotation_ECT_EQD=Ic;e.Rotation_EQD_ECT=Jc;var Fd=[["And","Andromeda"],["Ant","Antila"],["Aps","Apus"],["Aql","Aquila"],["Aqr","Aquarius"],["Ara","Ara"],["Ari","Aries"],["Aur","Auriga"],["Boo","Bootes"],["Cae","Caelum"],["Cam","Camelopardis"],
["Cap","Capricornus"],["Car","Carina"],["Cas","Cassiopeia"],["Cen","Centaurus"],["Cep","Cepheus"],["Cet","Cetus"],["Cha","Chamaeleon"],["Cir","Circinus"],["CMa","Canis Major"],["CMi","Canis Minor"],["Cnc","Cancer"],["Col","Columba"],["Com","Coma Berenices"],["CrA","Corona Australis"],["CrB","Corona Borealis"],["Crt","Crater"],["Cru","Crux"],["Crv","Corvus"],["CVn","Canes Venatici"],["Cyg","Cygnus"],["Del","Delphinus"],["Dor","Dorado"],["Dra","Draco"],["Equ","Equuleus"],["Eri","Eridanus"],["For","Fornax"],
["Gem","Gemini"],["Gru","Grus"],["Her","Hercules"],["Hor","Horologium"],["Hya","Hydra"],["Hyi","Hydrus"],["Ind","Indus"],["Lac","Lacerta"],["Leo","Leo"],["Lep","Lepus"],["Lib","Libra"],["LMi","Leo Minor"],["Lup","Lupus"],["Lyn","Lynx"],["Lyr","Lyra"],["Men","Mensa"],["Mic","Microscopium"],["Mon","Monoceros"],["Mus","Musca"],["Nor","Norma"],["Oct","Octans"],["Oph","Ophiuchus"],["Ori","Orion"],["Pav","Pavo"],["Peg","Pegasus"],["Per","Perseus"],["Phe","Phoenix"],["Pic","Pictor"],["PsA","Pisces Austrinus"],
["Psc","Pisces"],["Pup","Puppis"],["Pyx","Pyxis"],["Ret","Reticulum"],["Scl","Sculptor"],["Sco","Scorpius"],["Sct","Scutum"],["Ser","Serpens"],["Sex","Sextans"],["Sge","Sagitta"],["Sgr","Sagittarius"],["Tau","Taurus"],["Tel","Telescopium"],["TrA","Triangulum Australe"],["Tri","Triangulum"],["Tuc","Tucana"],["UMa","Ursa Major"],["UMi","Ursa Minor"],["Vel","Vela"],["Vir","Virgo"],["Vol","Volans"],["Vul","Vulpecula"]],Gd=[[83,0,8640,2112],[83,2880,5220,2076],[83,7560,8280,2068],[83,6480,7560,2064],[15,
0,2880,2040],[10,3300,3840,1968],[15,0,1800,1920],[10,3840,5220,1920],[83,6300,6480,1920],[33,7260,7560,1920],[15,0,1263,1848],[10,4140,4890,1848],[83,5952,6300,1800],[15,7260,7440,1800],[10,2868,3300,1764],[33,3300,4080,1764],[83,4680,5952,1680],[13,1116,1230,1632],[33,7350,7440,1608],[33,4080,4320,1596],[15,0,120,1584],[83,5040,5640,1584],[15,8490,8640,1584],[33,4320,4860,1536],[33,4860,5190,1512],[15,8340,8490,1512],[10,2196,2520,1488],[33,7200,7350,1476],[15,7393.2,7416,1462],[10,2520,2868,1440],
[82,2868,3030,1440],[33,7116,7200,1428],[15,7200,7393.2,1428],[15,8232,8340,1418],[13,0,876,1404],[33,6990,7116,1392],[13,612,687,1380],[13,876,1116,1368],[10,1116,1140,1368],[15,8034,8232,1350],[10,1800,2196,1344],[82,5052,5190,1332],[33,5190,6990,1332],[10,1140,1200,1320],[15,7968,8034,1320],[15,7416,7908,1316],[13,0,612,1296],[50,2196,2340,1296],[82,4350,4860,1272],[33,5490,5670,1272],[15,7908,7968,1266],[10,1200,1800,1260],[13,8232,8400,1260],[33,5670,6120,1236],[62,735,906,1212],[33,6120,6564,
1212],[13,0,492,1200],[62,492,600,1200],[50,2340,2448,1200],[13,8400,8640,1200],[82,4860,5052,1164],[13,0,402,1152],[13,8490,8640,1152],[39,6543,6564,1140],[33,6564,6870,1140],[30,6870,6900,1140],[62,600,735,1128],[82,3030,3300,1128],[13,60,312,1104],[82,4320,4350,1080],[50,2448,2652,1068],[30,7887,7908,1056],[30,7875,7887,1050],[30,6900,6984,1044],[82,3300,3660,1008],[82,3660,3882,960],[8,5556,5670,960],[39,5670,5880,960],[50,3330,3450,954],[0,0,906,882],[62,906,924,882],[51,6969,6984,876],[62,1620,
1689,864],[30,7824,7875,864],[44,7875,7920,864],[7,2352,2652,852],[50,2652,2790,852],[0,0,720,840],[44,7920,8214,840],[44,8214,8232,828],[0,8232,8460,828],[62,924,978,816],[82,3882,3960,816],[29,4320,4440,816],[50,2790,3330,804],[48,3330,3558,804],[0,258,507,792],[8,5466,5556,792],[0,8460,8550,770],[29,4440,4770,768],[0,8550,8640,752],[29,5025,5052,738],[80,870,978,736],[62,978,1620,736],[7,1620,1710,720],[51,6543,6969,720],[82,3960,4320,696],[30,7080,7530,696],[7,1710,2118,684],[48,3558,3780,684],
[29,4770,5025,684],[0,0,24,672],[80,507,600,672],[7,2118,2352,672],[37,2838,2880,672],[30,7530,7824,672],[30,6933,7080,660],[80,690,870,654],[25,5820,5880,648],[8,5430,5466,624],[25,5466,5820,624],[51,6612,6792,624],[48,3870,3960,612],[51,6792,6933,612],[80,600,690,600],[66,258,306,570],[48,3780,3870,564],[87,7650,7710,564],[77,2052,2118,548],[0,24,51,528],[73,5730,5772,528],[37,2118,2238,516],[87,7140,7290,510],[87,6792,6930,506],[0,51,306,504],[87,7290,7404,492],[37,2811,2838,480],[87,7404,7650,
468],[87,6930,7140,460],[6,1182,1212,456],[75,6792,6840,444],[59,2052,2076,432],[37,2238,2271,420],[75,6840,7140,388],[77,1788,1920,384],[39,5730,5790,384],[75,7140,7290,378],[77,1662,1788,372],[77,1920,2016,372],[23,4620,4860,360],[39,6210,6570,344],[23,4272,4620,336],[37,2700,2811,324],[39,6030,6210,308],[61,0,51,300],[77,2016,2076,300],[37,2520,2700,300],[61,7602,7680,300],[37,2271,2496,288],[39,6570,6792,288],[31,7515,7578,284],[61,7578,7602,284],[45,4146,4272,264],[59,2247,2271,240],[37,2496,
2520,240],[21,2811,2853,240],[61,8580,8640,240],[6,600,1182,238],[31,7251,7308,204],[8,4860,5430,192],[61,8190,8580,180],[21,2853,3330,168],[45,3330,3870,168],[58,6570,6718.4,150],[3,6718.4,6792,150],[31,7500,7515,144],[20,2520,2526,132],[73,6570,6633,108],[39,5790,6030,96],[58,6570,6633,72],[61,7728,7800,66],[66,0,720,48],[73,6690,6792,48],[31,7308,7500,48],[34,7500,7680,48],[61,7680,7728,48],[61,7920,8190,48],[61,7800,7920,42],[20,2526,2592,36],[77,1290,1662,0],[59,1662,1680,0],[20,2592,2910,0],
[85,5280,5430,0],[58,6420,6570,0],[16,954,1182,-42],[77,1182,1290,-42],[73,5430,5856,-78],[59,1680,1830,-96],[59,2100,2247,-96],[73,6420,6468,-96],[73,6570,6690,-96],[3,6690,6792,-96],[66,8190,8580,-96],[45,3870,4146,-144],[85,4146,4260,-144],[66,0,120,-168],[66,8580,8640,-168],[85,5130,5280,-192],[58,5730,5856,-192],[3,7200,7392,-216],[4,7680,7872,-216],[58,6180,6468,-240],[54,2100,2910,-264],[35,1770,1830,-264],[59,1830,2100,-264],[41,2910,3012,-264],[74,3450,3870,-264],[85,4260,4620,-264],[58,
6330,6360,-280],[3,6792,7200,-288.8],[35,1740,1770,-348],[4,7392,7680,-360],[73,6180,6570,-384],[72,6570,6792,-384],[41,3012,3090,-408],[58,5856,5895,-438],[41,3090,3270,-456],[26,3870,3900,-456],[71,5856,5895,-462],[47,5640,5730,-480],[28,4530,4620,-528],[85,4620,5130,-528],[41,3270,3510,-576],[16,600,954,-585.2],[35,954,1350,-585.2],[26,3900,4260,-588],[28,4260,4530,-588],[47,5130,5370,-588],[58,5856,6030,-590],[16,0,600,-612],[11,7680,7872,-612],[4,7872,8580,-612],[16,8580,8640,-612],[41,3510,
3690,-636],[35,1692,1740,-654],[46,1740,2202,-654],[11,7200,7680,-672],[41,3690,3810,-700],[41,4530,5370,-708],[47,5370,5640,-708],[71,5640,5760,-708],[35,1650,1692,-720],[58,6030,6336,-720],[76,6336,6420,-720],[41,3810,3900,-748],[19,2202,2652,-792],[41,4410,4530,-792],[41,3900,4410,-840],[36,1260,1350,-864],[68,3012,3372,-882],[35,1536,1650,-888],[76,6420,6900,-888],[65,7680,8280,-888],[70,8280,8400,-888],[36,1080,1260,-950],[1,3372,3960,-954],[70,0,600,-960],[36,600,1080,-960],[35,1392,1536,-960],
[70,8400,8640,-960],[14,5100,5370,-1008],[49,5640,5760,-1008],[71,5760,5911.5,-1008],[9,1740,1800,-1032],[22,1800,2370,-1032],[67,2880,3012,-1032],[35,1230,1392,-1056],[71,5911.5,6420,-1092],[24,6420,6900,-1092],[76,6900,7320,-1092],[53,7320,7680,-1092],[35,1080,1230,-1104],[9,1620,1740,-1116],[49,5520,5640,-1152],[63,0,840,-1156],[35,960,1080,-1176],[40,1470,1536,-1176],[9,1536,1620,-1176],[38,7680,7920,-1200],[67,2160,2880,-1218],[84,2880,2940,-1218],[35,870,960,-1224],[40,1380,1470,-1224],[63,
0,660,-1236],[12,2160,2220,-1260],[84,2940,3042,-1272],[40,1260,1380,-1276],[32,1380,1440,-1276],[63,0,570,-1284],[35,780,870,-1296],[64,1620,1800,-1296],[49,5418,5520,-1296],[84,3042,3180,-1308],[12,2220,2340,-1320],[14,4260,4620,-1320],[49,5100,5418,-1320],[56,5418,5520,-1320],[32,1440,1560,-1356],[84,3180,3960,-1356],[14,3960,4050,-1356],[5,6300,6480,-1368],[78,6480,7320,-1368],[38,7920,8400,-1368],[40,1152,1260,-1380],[64,1800,1980,-1380],[12,2340,2460,-1392],[63,0,480,-1404],[35,480,780,-1404],
[63,8400,8640,-1404],[32,1560,1650,-1416],[56,5520,5911.5,-1440],[43,7320,7680,-1440],[64,1980,2160,-1464],[18,5460,5520,-1464],[5,5911.5,5970,-1464],[18,5370,5460,-1526],[5,5970,6030,-1526],[64,2160,2460,-1536],[12,2460,3252,-1536],[14,4050,4260,-1536],[27,4260,4620,-1536],[14,4620,5232,-1536],[18,4860,4920,-1560],[5,6030,6060,-1560],[40,780,1152,-1620],[69,1152,1650,-1620],[18,5310,5370,-1620],[5,6060,6300,-1620],[60,6300,6480,-1620],[81,7920,8400,-1620],[32,1650,2370,-1680],[18,4920,5310,-1680],
[79,5310,6120,-1680],[81,0,480,-1800],[42,1260,1650,-1800],[86,2370,3252,-1800],[12,3252,4050,-1800],[55,4050,4920,-1800],[60,6480,7680,-1800],[43,7680,8400,-1800],[81,8400,8640,-1800],[81,270,480,-1824],[42,0,1260,-1980],[17,2760,4920,-1980],[2,4920,6480,-1980],[52,1260,2760,-2040],[57,0,8640,-2160]],Tb,id,jd=function(a,b,c,d){this.symbol=a;this.name=b;this.ra1875=c;this.dec1875=d};e.ConstellationInfo=jd;e.Constellation=function(a,b){w(a);w(b);if(-90>b||90<b)throw"Invalid declination angle. Must be -90..+90.";
a%=24;0>a&&(a+=24);Tb||(Tb=ob(new O(-45655.74141261017)),id=new O(0));a=new Ba(b,15*a,1);a=lb(a,id);a=Ya(Tb,a);a=Mb(a);b=10/240;for(var c=b/15,d=$jscomp.makeIterator(Gd),f=d.next();!f.done;f=d.next()){f=f.value;var g=f[1]*c,h=f[2]*c;if(f[3]*b<=a.dec&&g<=a.ra&&a.ra<h)return b=Fd[f[0]],new jd(b[0],b[1],a.ra,a.dec)}throw"Unable to find constellation for given coordinates.";};var S;(function(a){a.Penumbral="penumbral";a.Partial="partial";a.Annular="annular";a.Total="total"})(S=e.EclipseKind||(e.EclipseKind=
{}));var Pc=function(a,b,c,d,f,g){this.kind=a;this.obscuration=b;this.peak=c;this.sd_penum=d;this.sd_partial=f;this.sd_total=g};e.LunarEclipseInfo=Pc;var xd=function(a,b,c,d,f,g,h){this.time=a;this.u=b;this.r=c;this.k=d;this.p=f;this.target=g;this.dir=h};e.SearchLunarEclipse=Oc;var Rc=function(a,b,c,d,f,g){this.kind=a;this.obscuration=b;this.peak=c;this.distance=d;this.latitude=f;this.longitude=g};e.GlobalSolarEclipseInfo=Rc;e.NextLunarEclipse=function(a){a=v(a);a=a.AddDays(10);return Oc(a)};e.SearchGlobalSolarEclipse=
Qc;e.NextGlobalSolarEclipse=function(a){a=v(a);a=a.AddDays(10);return Qc(a)};var Vc=function(a,b){this.time=a;this.altitude=b};e.EclipseEvent=Vc;var Xc=function(a,b,c,d,f,g,h){this.kind=a;this.obscuration=b;this.partial_begin=c;this.total_begin=d;this.peak=f;this.total_end=g;this.partial_end=h};e.LocalSolarEclipseInfo=Xc;e.SearchLocalSolarEclipse=Wc;e.NextLocalSolarEclipse=function(a,b){a=v(a);a=a.AddDays(10);return Wc(a,b)};var $c=function(a,b,c,d){this.start=a;this.peak=b;this.finish=c;this.separation=
d};e.TransitInfo=$c;e.SearchTransit=Zc;e.NextTransit=function(a,b){b=v(b);b=b.AddDays(100);return Zc(a,b)};var ra;(function(a){a[a.Invalid=0]="Invalid";a[a.Ascending=1]="Ascending";a[a.Descending=-1]="Descending"})(ra=e.NodeEventKind||(e.NodeEventKind={}));var bd=function(a,b){this.kind=a;this.time=b};e.NodeEventInfo=bd;e.SearchMoonNode=ad;e.NextMoonNode=function(a){var b=a.time.AddDays(10);b=ad(b);switch(a.kind){case ra.Ascending:if(b.kind!==ra.Descending)throw"Internal error: previous node was ascending, but this node was: "+
b.kind;break;case ra.Descending:if(b.kind!==ra.Ascending)throw"Internal error: previous node was descending, but this node was: "+b.kind;break;default:throw"Previous node has an invalid node kind: "+a.kind;}return b};var Ub=function(a,b,c,d){this.ra=a;this.dec=b;this.spin=c;this.north=d};e.AxisInfo=Ub;e.RotationAxis=function(a,b){b=v(b);var c=b.tt,d=c/36525;switch(a){case m.Sun:a=286.13;var f=63.87;c=84.176+14.1844*c;break;case m.Mercury:a=281.0103-.0328*d;f=61.4155-.0049*d;c=329.5988+6.1385108*c+
.01067257*Math.sin(e.DEG2RAD*(174.7910857+4.092335*c))-.00112309*Math.sin(e.DEG2RAD*(349.5821714+8.18467*c))-1.104E-4*Math.sin(e.DEG2RAD*(164.3732571+12.277005*c))-2.539E-5*Math.sin(e.DEG2RAD*(339.1643429+16.36934*c))-5.71E-6*Math.sin(e.DEG2RAD*(153.9554286+20.461675*c));break;case m.Venus:a=272.76;f=67.16;c=160.2-1.4813688*c;break;case m.Earth:return a=xa([0,0,1],b,F.Into2000),a=wa(a,b,F.Into2000),a=new E(a[0],a[1],a[2],b),c=Mb(a),new Ub(c.ra,c.dec,190.41375788700253+360.9856122880876*b.ut,a);case m.Moon:var g=
e.DEG2RAD*(125.045-.0529921*c),h=e.DEG2RAD*(250.089-.1059842*c),l=e.DEG2RAD*(260.008+13.0120009*c),k=e.DEG2RAD*(176.625+13.3407154*c),n=e.DEG2RAD*(357.529+.9856003*c),p=e.DEG2RAD*(311.589+26.4057084*c),q=e.DEG2RAD*(134.963+13.064993*c),t=e.DEG2RAD*(276.617+.3287146*c),y=e.DEG2RAD*(34.226+1.7484877*c),x=e.DEG2RAD*(15.134-.1589763*c),z=e.DEG2RAD*(119.743+.0036096*c),ab=e.DEG2RAD*(239.961+.1643573*c),va=e.DEG2RAD*(25.053+12.9590088*c);a=269.9949+.0031*d-3.8787*Math.sin(g)-.1204*Math.sin(h)+.07*Math.sin(l)-
.0172*Math.sin(k)+.0072*Math.sin(p)-.0052*Math.sin(x)+.0043*Math.sin(va);f=66.5392+.013*d+1.5419*Math.cos(g)+.0239*Math.cos(h)-.0278*Math.cos(l)+.0068*Math.cos(k)-.0029*Math.cos(p)+9E-4*Math.cos(q)+8E-4*Math.cos(x)-9E-4*Math.cos(va);c=38.3213+(13.17635815-1.4E-12*c)*c+3.561*Math.sin(g)+.1208*Math.sin(h)-.0642*Math.sin(l)+.0158*Math.sin(k)+.0252*Math.sin(n)-.0066*Math.sin(p)-.0047*Math.sin(q)-.0046*Math.sin(t)+.0028*Math.sin(y)+.0052*Math.sin(x)+.004*Math.sin(z)+.0019*Math.sin(ab)-.0044*Math.sin(va);
break;case m.Mars:a=317.269202-.10927547*d+6.8E-5*Math.sin(e.DEG2RAD*(198.991226+19139.4819985*d))+2.38E-4*Math.sin(e.DEG2RAD*(226.292679+38280.8511281*d))+5.2E-5*Math.sin(e.DEG2RAD*(249.663391+57420.7251593*d))+9E-6*Math.sin(e.DEG2RAD*(266.18351+76560.636795*d))+.419057*Math.sin(e.DEG2RAD*(79.398797+.5042615*d));f=54.432516-.05827105*d+5.1E-5*Math.cos(e.DEG2RAD*(122.433576+19139.9407476*d))+1.41E-4*Math.cos(e.DEG2RAD*(43.058401+38280.8753272*d))+3.1E-5*Math.cos(e.DEG2RAD*(57.663379+57420.7517205*
d))+5E-6*Math.cos(e.DEG2RAD*(79.476401+76560.6495004*d))+1.591274*Math.cos(e.DEG2RAD*(166.325722+.5042615*d));c=176.049863+350.891982443297*c+1.45E-4*Math.sin(e.DEG2RAD*(129.071773+19140.0328244*d))+1.57E-4*Math.sin(e.DEG2RAD*(36.352167+38281.0473591*d))+4E-5*Math.sin(e.DEG2RAD*(56.668646+57420.929536*d))+1E-6*Math.sin(e.DEG2RAD*(67.364003+76560.2552215*d))+1E-6*Math.sin(e.DEG2RAD*(104.79268+95700.4387578*d))+.584542*Math.sin(e.DEG2RAD*(95.391654+.5042615*d));break;case m.Jupiter:f=e.DEG2RAD*(99.360714+
4850.4046*d);g=e.DEG2RAD*(175.895369+1191.9605*d);h=e.DEG2RAD*(300.323162+262.5475*d);l=e.DEG2RAD*(114.012305+6070.2476*d);k=e.DEG2RAD*(49.511251+64.3*d);a=268.056595-.006499*d+1.17E-4*Math.sin(f)+9.38E-4*Math.sin(g)+.001432*Math.sin(h)+3E-5*Math.sin(l)+.00215*Math.sin(k);f=64.495303+.002413*d+5E-5*Math.cos(f)+4.04E-4*Math.cos(g)+6.17E-4*Math.cos(h)-1.3E-5*Math.cos(l)+9.26E-4*Math.cos(k);c=284.95+870.536*c;break;case m.Saturn:a=40.589-.036*d;f=83.537-.004*d;c=38.9+810.7939024*c;break;case m.Uranus:a=
257.311;f=-15.175;c=203.81-501.1600928*c;break;case m.Neptune:d=e.DEG2RAD*(357.85+52.316*d);a=299.36+.7*Math.sin(d);f=43.46-.51*Math.cos(d);c=249.978+541.1397757*c-.48*Math.sin(d);break;case m.Pluto:a=132.993;f=-6.163;c=302.695+56.3625225*c;break;default:throw"Invalid body: "+a;}d=f*e.DEG2RAD;g=a*e.DEG2RAD;h=Math.cos(d);b=new E(h*Math.cos(g),h*Math.sin(g),Math.sin(d),b);return new Ub(a/15,f,c,b)};e.LagrangePoint=function(a,b,c,d){var f=v(b);b=C(c);var g=C(d);c===m.Earth&&d===m.Moon?(c=new I(0,0,0,
0,0,0,f),d=Ra(f)):(c=mb(c,f),d=mb(d,f));return cd(a,c,b,d,g)};e.LagrangePointFast=cd;var H=function(a,b,c){b=v(b);this.originBody=a;for(var d=$jscomp.makeIterator(c),f=d.next();!f.done;f=d.next())if(f.value.t.tt!==b.tt)throw"Inconsistent times in bodyStates";d=[];f=H.CalcSolarSystem(b);this.curr=new kd(b,f,d);a=this.InternalBodyState(a);c=$jscomp.makeIterator(c);for(f=c.next();!f.done;f=c.next()){var g=f.value;f=new B(g.x+a.r.x,g.y+a.r.y,g.z+a.r.z);g=new B(g.vx+a.v.x,g.vy+a.v.y,g.vz+a.v.z);var h=
B.zero();d.push(new Ua(b.tt,f,g,h))}this.CalcBodyAccelerations();this.prev=this.Duplicate()};H.prototype.Update=function(a){a=v(a);var b=a.tt-this.curr.time.tt;if(0===b)this.prev=this.Duplicate();else{this.Swap();this.curr.time=a;this.curr.gravitators=H.CalcSolarSystem(a);for(var c=0;c<this.curr.bodies.length;++c){var d=this.prev.bodies[c];this.curr.bodies[c].r=Ca(b,d.r,d.v,d.a)}this.CalcBodyAccelerations();for(c=0;c<this.curr.bodies.length;++c){d=this.prev.bodies[c];var f=this.curr.bodies[c],g=d.a.mean(f.a);
f.tt=a.tt;f.r=Ca(b,d.r,d.v,g);f.v=Eb(b,d.v,g)}this.CalcBodyAccelerations()}b=[];c=this.InternalBodyState(this.originBody);d=$jscomp.makeIterator(this.curr.bodies);for(f=d.next();!f.done;f=d.next())f=f.value,b.push(new I(f.r.x-c.r.x,f.r.y-c.r.y,f.r.z-c.r.z,f.v.x-c.v.x,f.v.y-c.v.y,f.v.z-c.v.z,a));return b};H.prototype.Swap=function(){var a=this.curr;this.curr=this.prev;this.prev=a};H.prototype.SolarSystemBodyState=function(a){a=this.InternalBodyState(a);var b=this.InternalBodyState(this.originBody);
return pa(a.sub(b),this.curr.time)};H.prototype.InternalBodyState=function(a){if(a===m.SSB)return new X(this.curr.time.tt,B.zero(),B.zero());var b=this.curr.gravitators[a];if(b)return b;throw"Invalid body: "+a;};H.CalcSolarSystem=function(a){var b={},c=new X(a.tt,B.zero(),B.zero());b[m.Mercury]=R(c,a.tt,m.Mercury,4.912547451450812E-11);b[m.Venus]=R(c,a.tt,m.Venus,7.243452486162703E-10);b[m.Earth]=R(c,a.tt,m.Earth,8.997011346712498E-10);b[m.Mars]=R(c,a.tt,m.Mars,9.549535105779258E-11);b[m.Jupiter]=
R(c,a.tt,m.Jupiter,2.825345909524226E-7);b[m.Saturn]=R(c,a.tt,m.Saturn,8.459715185680659E-8);b[m.Uranus]=R(c,a.tt,m.Uranus,1.292024916781969E-8);b[m.Neptune]=R(c,a.tt,m.Neptune,1.524358900784276E-8);for(var d in b)b[d].r.decr(c.r),b[d].v.decr(c.v);b[m.Sun]=new X(a.tt,c.r.neg(),c.v.neg());return b};H.prototype.CalcBodyAccelerations=function(){for(var a=$jscomp.makeIterator(this.curr.bodies),b=a.next();!b.done;b=a.next())b=b.value,b.a=B.zero(),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Sun].r,
2.959122082855911E-4),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Mercury].r,4.912547451450812E-11),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Venus].r,7.243452486162703E-10),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Earth].r,8.997011346712498E-10),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Mars].r,9.549535105779258E-11),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Jupiter].r,2.825345909524226E-7),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Saturn].r,8.459715185680659E-8),
H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Uranus].r,1.292024916781969E-8),H.AddAcceleration(b.a,b.r,this.curr.gravitators[m.Neptune].r,1.524358900784276E-8)};H.AddAcceleration=function(a,b,c,d){var f=c.x-b.x,g=c.y-b.y;b=c.z-b.z;c=f*f+g*g+b*b;d/=c*Math.sqrt(c);a.x+=f*d;a.y+=g*d;a.z+=b*d};H.prototype.Duplicate=function(){var a={};for(b in this.curr.gravitators)a[b]=this.curr.gravitators[b].clone();var b=[];for(var c=$jscomp.makeIterator(this.curr.bodies),d=c.next();!d.done;d=c.next())b.push(d.value.clone());
return new kd(this.curr.time,a,b)};$jscomp.global.Object.defineProperties(H.prototype,{OriginBody:{configurable:!0,enumerable:!0,get:function(){return this.originBody}},Time:{configurable:!0,enumerable:!0,get:function(){return this.curr.time}}});e.GravitySimulator=H;var kd=function(a,b,c){this.time=a;this.gravitators=b;this.bodies=c}},{}]},{},[1])(1)});


;
/* ΔT = TT − UT1, observed where it has been observed.
 *
 * WHY. astronomy-engine's default is Espenak & Meeus (2006): polynomials fitted
 * to the record up to about 2005 and EXTRAPOLATED after it. The extrapolation
 * assumed ΔT would keep rising; it did not — it has sat near 69 s since 2017 as
 * the Earth's rotation sped up. So the default gave 74.0 s for 2024 against an
 * observed 69.2 s, and the gap widens every year after. ΔT does not touch the
 * lagna (that runs on UT), but it does touch every ephemeris position: about
 * 2.6″ on the Moon for a chart cast today, and a few seconds on tithi and
 * nakṣatra end times. timescale-verify.mjs found it by holding the published
 * ΔT to the observed values.
 *
 * WHAT IS USED:
 *   - from 1955.0 to the last observed year: the observed values below,
 *     linearly interpolated (IERS / USNO, ΔT at 1 January of each year, s);
 *   - before 1955: Espenak & Meeus, which was fitted to observation there and
 *     agrees with the 1955 value to a tenth of a second;
 *   - after the last observed year: Espenak & Meeus's SLOPE carried on from the
 *     last observed value — its trend rather than its now-wrong level, so the
 *     curve is continuous and a future date is not five seconds off on day one.
 *
 * This file is loaded immediately after astronomy-engine on every page that
 * loads it, so no two pages can disagree about ΔT. */
(function () {
  "use strict";
  var A = (typeof window !== "undefined" && window.Astronomy) ||
          (typeof Astronomy !== "undefined" ? Astronomy : null);
  if (!A || !A.SetDeltaTFunction || !A.DeltaT_EspenakMeeus) return;
  var OBS = [
    [1955, 31.11], [1960, 33.15], [1965, 35.73], [1970, 40.18], [1975, 45.48],
    [1980, 50.54], [1985, 54.34], [1990, 56.86], [1995, 60.78], [2000, 63.83],
    [2005, 64.69], [2010, 66.07], [2015, 67.64], [2016, 68.10], [2017, 68.59],
    [2018, 68.97], [2019, 69.22], [2020, 69.36], [2021, 69.36], [2022, 69.29],
    [2023, 69.20], [2024, 69.18], [2025, 69.10]
  ];
  var EM = A.DeltaT_EspenakMeeus;
  var Y0 = OBS[0][0], YN = OBS[OBS.length - 1][0], DN = OBS[OBS.length - 1][1];
  /* ut: days since J2000.0 (12h UT, 1 Jan 2000), as astronomy-engine passes it */
  function year(ut) { return 2000 + (ut - 0.5) / 365.2425; }
  function utOf(y) { return (y - 2000) * 365.2425 + 0.5; }
  var emAtYN = EM(utOf(YN));
  function deltaT(ut) {
    var y = year(ut);
    if (y < Y0) return EM(ut);
    if (y >= YN) return DN + (EM(ut) - emAtYN);
    for (var i = 1; i < OBS.length; i++) {
      if (y < OBS[i][0]) {
        var a = OBS[i - 1], b = OBS[i], f = (y - a[0]) / (b[0] - a[0]);
        return a[1] + f * (b[1] - a[1]);
      }
    }
    return DN;
  }
  A.SetDeltaTFunction(deltaT);
  try { window.__deltaT = { fn: deltaT, observed: OBS, model: "observed 1955–" + YN +
        " (IERS/USNO), Espenak–Meeus before 1955 and its slope after " + YN }; } catch (e) {}
})();

/* ===== The Sūrya Siddhānta engine =========================================

   A SECOND, OLDER WAY OF COMPUTING THE SAME SKY — and now a reasonably
   complete one. The first version of this file computed mean places and
   corrected them to true places, which is the first third of what a
   siddhānta is for. A siddhānta is a working astronomy: it has to tell you
   where a graha is, how far north or south of the ecliptic, when the Sun
   rises where you are standing, what the tithi is, how big the Moon looks,
   whether it will be eclipsed, and whether a graha is near enough to the Sun
   to be invisible. All of that is here now.

   WHAT IS DISTINCTIVE ABOUT THIS IMPLEMENTATION.

   IT COMPUTES WITH THE TEXT'S OWN TRIGONOMETRY. The Sūrya Siddhānta does not
   have a sine function; it has a TABLE of twenty-four sines of a circle whose
   radius is 3438 — the number of minutes in a radian, which is why that
   radius and not another — tabulated every 3°45′, with linear interpolation
   between entries and an inverse read backwards through the same table for
   arcs. Computing the equations with Math.sin would give the answers a modern
   reader expects from the method and NOT the answers the method gives. Both
   are offered; the table is the default, and the difference between them is
   itself a quantity this engine will report, because the granularity of that
   table is part of what a classical position IS.

   IT SEPARATES WHAT THE PARAMETERS SAY FROM WHAT I SAY. Every revolution
   count, epicycle, inclination, node, diameter and visibility arc is set out
   as data at the top of its section, where a reader can see it and disagree.
   None of it is attributed to a verse. The project's rule is that a citation
   is either exact or absent, and an implementation written from standard
   parameters is not a reading of the text.

   IT IS CHECKED BY CONSEQUENCE, NOT BY ASSERTION. Several of the tables here
   are things I could get wrong. So each is checked against something it must
   produce and that is independently known: the sine table against the sine
   function; the epoch against the day of the week; the rising times of the
   signs against the obliquity they are supposed to encode; the orbital
   inclinations against the latitudes planets are actually seen to reach; the
   eclipse machinery against eclipses that actually happened. A parameter that
   is wrong does not produce a slightly different answer here. It produces an
   answer that fails one of those.

   WHAT IS DELIBERATELY ABSENT is listed in ABSENT at the foot of the file,
   each with its reason, and the page prints it. */

(function () {
  "use strict";

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var DAY = 86400000;
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* =======================================================================
     1 — THE TRIGONOMETRY OF THE TEXT
     ======================================================================= */

  /* The radius. Not a free choice: 3438 is the number of minutes of arc in a
     radian to four figures, so an arc in minutes and its sine in these units
     are the same number for small angles, and the whole table can be used
     without ever dividing by R. */
  var RAD = 3438;
  var STEP = 3.75;                       /* 225 minutes — a twenty-fourth of 90° */

  /* The twenty-four sines. Each entry is the sine of n × 3°45′ in units of
     the radius above. These are the standard values; the harness asserts each
     one is within a unit of 3438·sin(n·3°45′), which is a check the table
     either passes or fails outright — there is no way for a mistyped entry to
     survive it. */
  var JYA = [0, 225, 449, 671, 890, 1105, 1315, 1520, 1719, 1910, 2093, 2267,
             2431, 2585, 2728, 2859, 2978, 3084, 3177, 3256, 3321, 3372,
             3409, 3431, 3438];

  var OPT = {
    /* "table" computes the way the text does; "exact" uses the modern
       functions in the same formulas, so the ONLY difference between them is
       the granularity of the table above */
    sines: "table",
    /* the precession model — see section 6 */
    ayana: "libration",
    /* a bīja correction to the revolution counts, if one is supplied */
    bija: null
  };

  /* jyā of an angle in degrees, in units of RAD. Linear interpolation inside
     the tabulated interval, which is what the text prescribes — not a better
     interpolation, because a better one would be a different method. */
  function jyaTable(deg) {
    var a = norm(deg);
    var sign = 1;
    if (a > 180) { a -= 180; sign = -1; }
    if (a > 90) a = 180 - a;
    var i = a / STEP;
    var k = Math.floor(i);
    if (k >= 24) return sign * JYA[24];
    var f = i - k;
    return sign * (JYA[k] + (JYA[k + 1] - JYA[k]) * f);
  }
  function jya(deg) {
    return OPT.sines === "exact" ? RAD * Math.sin(deg * D2R) : jyaTable(deg);
  }
  function kojya(deg) { return jya(deg + 90); }

  /* The arc whose jyā is the given value — read backwards through the same
     table, interval by interval, which is how the text inverts it. */
  function arcJyaTable(v) {
    var sign = v < 0 ? -1 : 1, x = Math.abs(v);
    if (x >= JYA[24]) return sign * 90;
    for (var k = 0; k < 24; k++) {
      if (x <= JYA[k + 1]) {
        var span = JYA[k + 1] - JYA[k];
        var f = span === 0 ? 0 : (x - JYA[k]) / span;
        return sign * (k + f) * STEP;
      }
    }
    return sign * 90;
  }
  function arcJya(v) {
    return OPT.sines === "exact"
      ? Math.asin(clamp(v / RAD, -1, 1)) * R2D
      : arcJyaTable(v);
  }

  /* =======================================================================
     2 — THE STRUCTURE OF TIME
     ======================================================================= */

  var YUGA = {
    civilDays: 1577917828,
    years: 4320000,
    rev: {
      "Sūrya":      4320000,
      "Candra":     57753336,
      "Maṅgala":    2296832,
      "Budha":      17937060,     /* its śīghrocca */
      "Guru":       364220,
      "Śukra":      7022376,      /* its śīghrocca */
      "Śani":       146568,
      "candraUcca": 488203,       /* the Moon's apogee, direct */
      "Rāhu":       -232238       /* retrograde */
    }
  };
  /* The larger frame the text sets the Mahāyuga inside. A Kalpa is a thousand
     Mahāyugas with fourteen Manus, each of seventy-one Mahāyugas, and a
     sandhi of one Kṛtayuga before the first Manu and between each pair. The
     arithmetic below is the text's own and is checked by the harness: the
     parts have to add up to the whole. */
  var KALPA = {
    mahayugas: 1000,
    manus: 14,
    mahayugasPerManu: 71,
    /* a Kṛtayuga is four tenths of a Mahāyuga; the sandhis are 15 of them */
    sandhiMahayugas: 15 * 0.4,
    years: 1000 * 4320000
  };
  /* The four yugas of a Mahāyuga, in the 4:3:2:1 proportion the text gives. */
  var YUGAS = [
    { name: "Kṛta", part: 4 / 10 }, { name: "Tretā", part: 3 / 10 },
    { name: "Dvāpara", part: 2 / 10 }, { name: "Kali", part: 1 / 10 }
  ];

  /* The meridian of the tradition, and the epoch on it. */
  var UJJAIN_LON = 75 + 47 / 60;
  var KALI_MIDNIGHT_JD = 588465.5;
  var EPOCH = {
    sunrise:  KALI_MIDNIGHT_JD + 0.25 - UJJAIN_LON / 360,
    midnight: KALI_MIDNIGHT_JD - UJJAIN_LON / 360
  };

  function jdOf(ms) { return ms / 86400000 + 2440587.5; }
  function msOf(jd) { return (jd - 2440587.5) * 86400000; }

  function ahargana(ms, variant) {
    return jdOf(ms) - (EPOCH[variant || "sunrise"] || EPOCH.sunrise);
  }
  /* Elapsed years of the current Kali, and where we stand in the larger
     scheme. Printing these is most of what a reader wants from the kalpa
     arithmetic, and all of it is derived rather than stated. */
  /* Where this moment stands in the scheme the text sets out. The elapsed
     years of the Kalpa at the start of Kali come out of the structure rather
     than being quoted: an opening sandhi, six whole Manus each with a sandhi
     after it, twenty-seven Mahāyugas of the seventh Manu, and the first three
     yugas of the twenty-eighth. The harness checks the total against the
     traditional figure, which is a check on the structure above and not on my
     arithmetic. */
  function era(ms) {
    var K = ahargana(ms, "sunrise");
    var yearDays = YUGA.civilDays / revOf("Sūrya");
    var kaliYears = K / yearDays;
    var MY = YUGA.years;                       /* years in a Mahāyuga */
    var sandhi = 0.4 * MY;                     /* a Kṛtayuga */
    var beforeKali =
      sandhi +                                 /* the opening sandhi */
      6 * (KALPA.mahayugasPerManu * MY + sandhi) +   /* six whole Manus */
      27 * MY +                                /* of the seventh Manu */
      0.9 * MY;                                /* Kṛta, Tretā, Dvāpara */
    return {
      ahargana: K,
      kaliYears: kaliYears,
      kaliElapsed: Math.floor(kaliYears),
      yugaName: "Kali",
      manu: 7,
      mahayugaInManu: 28,
      kalpaYearsAtKaliStart: beforeKali,
      kalpaYears: beforeKali + kaliYears,
      kalpaFraction: (beforeKali + kaliYears) / KALPA.years
    };
  }

  /* THE DAY OF THE WEEK, which is the strongest single check on the epoch
     that exists. The week has run unbroken since long before the epoch, so if
     the ahargaṇa is right then ahargaṇa modulo seven names today correctly,
     and if it is off by a day then it names yesterday — a failure no amount
     of agreement in longitude would reveal. The Kali epoch fell on a Friday,
     and that is the only fact this needs. */
  var VARA = ["Ravi", "Soma", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var VARA_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
                 "Friday", "Saturday"];
  function vara(ms, place) {
    /* the civil day begins at sunrise, so the weekday belongs to the sunrise
       that precedes the instant, not to midnight */
    var a = ahargana(ms, "sunrise");
    if (place) a += (place.lon - UJJAIN_LON) / 360;
    var n = Math.floor(a);
    var i = ((n + 5) % 7 + 7) % 7;       /* 5 = Friday, counting Sunday as 0 */
    return { i: i, name: VARA[i], english: VARA_EN[i], lord: VARA[i] };
  }

  /* =======================================================================
     3 — MEAN PLACES, AND THE FOUR CORRECTIONS TO THE TIME
     ======================================================================= */

  /* A revolution count, with a bīja applied if one has been supplied. The
     mechanism is here because later astronomers corrected these numbers and
     a reader may want to try one; no bīja is shipped, because the ones in
     circulation differ and I will not pick between them silently. */
  function revOf(key) {
    var r = YUGA.rev[key];
    if (r == null) return null;
    if (OPT.bija && OPT.bija[key] != null) r += OPT.bija[key];
    return r;
  }
  /* WHERE EACH GRAHA STOOD AT THE EPOCH. The point of the Kali epoch in this
     system is that the grahas were together at the start of Meṣa, so almost
     every one of them starts from zero and needs no entry here. The node does
     not: it stood at the opposite point.

     This was missing, and the way it was caught is worth recording, because
     no comparison of longitudes would ever have shown it. Rāhu's longitude
     was never checked against anything — it has no manda, no śīghra and
     nothing to disagree with. What gave it away was a CONSEQUENCE: the Moon's
     latitude, computed from this node, came out anti-correlated with the real
     Moon's latitude at −0.987. Not wrong by a degree. Upside down. A graha
     north of the ecliptic when it was south, every time, for sixty days.

     With the node put where it belongs the SS node sits within two or three
     degrees of the true one after two hundred and seventy-five circuits,
     which is what a draconitic month right to two seconds should give.

     THE MOON'S APOGEE WAS THE SAME OMISSION, AND IT COST MORE.
     The paragraph above says "almost every one of them starts from zero" and
     then names only the node. That was wrong by one. The Moon's apsidal line
     stood at 90° at the Kali epoch, not at 0°, and leaving it out put the
     Moon's whole manda equation — amplitude about 5° — a quarter turn out of
     phase for every date this engine computes.

     Source: T. S. Kuppanna Sastry, tr., Pañcasiddhāntikā of Varāhamihira,
     ed. K. V. Sarma (PPST Foundation, Madras, 1993), notes to Ch. XVI: in the
     Āryabhaṭīya, the Ardharātrika-pakṣa, Varāhamihira's Saura, Bhaṭṭotpala's
     Pauliśa AND the Later Sūrya Siddhānta alike, the mean planets stand at
     zero at the beginning of Kali, the Moon's apogee at 90° and its node at
     180°. The node was already here; the apogee is this. NOT a Parāśara
     statement and not from the uploaded BPHS volumes — siddhāntic
     literature, cited as such.

     And it is confirmed without reference to the text. Scoring the bare
     engine's Moon against a modern sky and searching the whole circle for the
     epoch value that fits best lands on 86°, four degrees from the text's
     90°, while 0° — what this shipped — is close to the worst of the range:

         0° (as shipped) 420′      60°  240′      120° 244′
         30°             318′      90°  217′      180° 376′

     So this was halving the accuracy of the bare tier. And because the fitted
     tier carries epoch.candraUcca among its own parameters, the optimiser had
     quietly absorbed the error — it chose 125.6°, trading epoch against bīja
     across the fitted window — which is how a fault in the thing being
     compared against can hide inside the thing doing the comparing.
     ss-verify asserts the value now, both against the text and against that
     independent fit. */
  var EPOCH_LON = { "Rāhu": 180, "candraUcca": 90 };
  function meanOf(key, ahar) {
    var r = revOf(key);
    if (r == null) return null;
    return norm((EPOCH_LON[key] || 0) + r * 360 * ahar / YUGA.civilDays);
  }
  function dailyMotion(key) {
    var r = revOf(key);
    return r == null ? null : r * 360 / YUGA.civilDays;
  }

  /* DEŚĀNTARA — the correction for being east or west of the meridian of the
     tradition. A place an hour east sees every mean place an hour further on,
     and ignoring it is an error of half a degree in the Moon, which is more
     than enough to change a tithi at its boundary. */
  function desantara(place) {
    if (!place || place.lon == null) return 0;
    return (place.lon - UJJAIN_LON) / 360;      /* in days */
  }

  /* THE EQUATION OF TIME, which the text reaches in two named pieces rather
     than as one quantity.

       BHUJĀNTARA  the Sun's own equation of centre, expressed as time: the
                   Sun does not move uniformly along the ecliptic, so true
                   noon is not mean noon.
       UDAYĀNTARA  the obliquity's share: even a Sun moving uniformly along
                   the ecliptic does not move uniformly in right ascension,
                   which is what a clock follows.

     Their sum is the equation of time, and the sum is what sunrise needs.
     Keeping the two apart is not pedantry — they have different periods, one
     annual and one semi-annual, and a reader who has seen them separately
     understands the shape of the combined curve rather than memorising it. */
  function bhujantaraDays(ahar) {
    var sunMean = meanOf("Sūrya", ahar);
    var q = trueLongitude("Sūrya", ahar);
    return sdiff(sunMean, q.lon) / 360;
  }
  /* THE UDAYĀNTARA TAKES THE SĀYANA SUN, and took the sidereal one.

     A right ascension is measured from the equinox, so λ − α is a quantity in
     the equinoctial frame and nothing else. Handing it a sidereal longitude
     shifts the argument of a semi-annual term by the whole ayanāṃśa, which is
     26° on the text's own libration reading — the curve keeps its amplitude
     (10.34 against 10.36 minutes, measured) and moves its phase, which is why
     nothing looked obviously broken.

     It is the blind spot this engine's own structure creates. Sidereal is
     primary here and the frame is converted only where it is needed; but the
     text cannot say where it is needed, because at its epoch of 499 CE the
     ayanāṃśa is zero by construction and the two readings coincide. Every
     omission of the conversion is therefore invisible in the text's own
     century and grows at about 50″ a year. The declination two functions down
     already had the conversion and carried a comment explaining it; this did
     not, which is an inconsistency rather than fidelity.

     Measured against the site's modern almanac, Ujjain, 122 samples over a
     year — sunrise, in minutes:

                       mean   |mean|    rms   worst
         as it was      3.68    5.86    6.90   11.88
         in frame       3.70    3.70    3.84    5.78

     The mean is untouched at 3.7 minutes, and that is the point: 3.7 is the
     sunrise CONVENTION — centre of the disc without refraction against an
     almanac's upper limb with it. Before the fix there was a bias of 3.7 with
     scatter on top; after it the scatter is essentially gone and the bias is
     all that is left. A chunk of what the accuracy figures filed under
     "convention" was this. */
  function udayantaraDays(sayanaSun) {
    return sdiff(sayanaSun, raOfLongitude(sayanaSun)) / 360;
  }
  function equationOfTime(ahar) {
    var q = trueLongitude("Sūrya", ahar);
    /* the ayanāṃśa is a function of the moment, and an ahargaṇa is a moment:
       jd = ahar + the epoch it was reckoned from */
    var ms = msOf(ahar + EPOCH.sunrise);
    return bhujantaraDays(ahar) + udayantaraDays(tropical(q.lon, ms));
  }

  /* =======================================================================
     4 — THE EQUATIONS
     ======================================================================= */

  var EPI = {
    "Sūrya":   { manda: [14, 13 + 40 / 60], sighra: null },
    "Candra":  { manda: [32, 31 + 40 / 60], sighra: null },
    "Maṅgala": { manda: [75, 72], sighra: [235, 232] },
    "Budha":   { manda: [30, 28], sighra: [133, 132] },
    "Guru":    { manda: [33, 32], sighra: [70, 72] },
    "Śukra":   { manda: [12, 11], sighra: [262, 260] },
    "Śani":    { manda: [49, 48], sighra: [39, 40] }
  };
  var MANDOCCA = {
    "Sūrya":   77 + 17 / 60,
    "Maṅgala": 110,
    "Budha":   220,
    "Guru":    160,
    "Śukra":   80,
    "Śani":    240
  };

  /* The epicycle at a given anomaly: interpolated between the odd-quadrant
     and even-quadrant circumferences by the jyā of the anomaly. That
     interpolation is part of the method, not a smoothing of it. */
  function epicycleAt(pair, anomaly) {
    var a = pair[0], b = pair[1];
    return a + (b - a) * Math.abs(jya(anomaly)) / RAD;
  }
  function mandaEquation(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.manda) return 0;
    var c = epicycleAt(E.manda, anomaly);
    var bahu = (c / 360) * jya(anomaly);
    return arcJya(bahu);
  }
  /* The śīghra equation and, with it, the hypotenuse — which is needed again
     later for the latitude and for the apparent diameters, so it is returned
     rather than thrown away. */
  function sighraFull(sa, anomaly) {
    var E = EPI[sa];
    if (!E || !E.sighra) return { eq: 0, karna: RAD };
    var c = epicycleAt(E.sighra, anomaly);
    var r = c / 360;
    var bahu = r * jya(anomaly);
    var koti = r * kojya(anomaly);
    var karna = Math.sqrt((RAD + koti) * (RAD + koti) + bahu * bahu);
    return { eq: arcJya(bahu * RAD / karna), karna: karna };
  }
  function sighraEquation(sa, anomaly) { return sighraFull(sa, anomaly).eq; }

  var INNER = { "Budha": 1, "Śukra": 1 };
  var OUTER = { "Maṅgala": 1, "Guru": 1, "Śani": 1 };

  function trueLongitude(sa, ahar) {
    var sunMean = meanOf("Sūrya", ahar);

    if (sa === "Sūrya") {
      var anom = norm(sunMean - MANDOCCA["Sūrya"]);
      var eq = mandaEquation("Sūrya", anom);
      return { lon: norm(sunMean - eq), mean: sunMean, manda: -eq, sighra: 0,
               karna: RAD, anomaly: anom };
    }
    if (sa === "Candra") {
      var ucca = meanOf("candraUcca", ahar);
      var m = meanOf("Candra", ahar);
      var an = norm(m - ucca);
      var eqm = mandaEquation("Candra", an);
      return { lon: norm(m - eqm), mean: m, manda: -eqm, sighra: 0,
               ucca: ucca, karna: RAD, anomaly: an };
    }
    if (sa === "Rāhu") {
      var rl = meanOf("Rāhu", ahar);
      return { lon: rl, mean: rl, manda: 0, sighra: 0, karna: RAD };
    }
    if (sa === "Ketu") {
      var kl = norm(meanOf("Rāhu", ahar) + 180);
      return { lon: kl, mean: kl, manda: 0, sighra: 0, karna: RAD };
    }

    var mean, sighrocca;
    if (INNER[sa]) { mean = sunMean; sighrocca = meanOf(sa, ahar); }
    else if (OUTER[sa]) { mean = meanOf(sa, ahar); sighrocca = sunMean; }
    else return null;

    var mandocca = MANDOCCA[sa];
    var s1 = sighraEquation(sa, norm(sighrocca - mean));
    var p1 = norm(mean + s1 / 2);
    var m1 = mandaEquation(sa, norm(p1 - mandocca));
    var p2 = norm(p1 - m1 / 2);
    var m2 = mandaEquation(sa, norm(p2 - mandocca));
    var p3 = norm(mean - m2);
    var S = sighraFull(sa, norm(sighrocca - p3));
    return { lon: norm(p3 + S.eq), mean: mean, manda: -m2, sighra: S.eq,
             sighrocca: sighrocca, mandocca: mandocca, karna: S.karna,
             anomaly: norm(sighrocca - p3) };
  }

  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];

  /* =======================================================================
     5 — LATITUDE
     ======================================================================= */

  /* Each star-planet has a node held at a fixed longitude and an inclination
     given in minutes of arc. The Moon's node moves and comes from its own
     revolution count; its inclination is 270′, which is four and a half
     degrees against the five and an eighth that is actually the case.

     The scaling by the śīghra hypotenuse is what turns a small orbital
     inclination into the large latitude a planet is seen at: near opposition
     the planet is close and the same tilt subtends far more. Mars's orbit is
     inclined a degree and a half and Mars is seen seven degrees from the
     ecliptic, and this is how a geocentric scheme gets that right. */
  var NODE = { "Maṅgala": 40, "Budha": 20, "Guru": 80, "Śukra": 60, "Śani": 100 };
  var INCL = { "Candra": 270, "Maṅgala": 90, "Budha": 120, "Guru": 60,
               "Śukra": 120, "Śani": 120 };     /* minutes of arc */

  function latitudeOf(sa, ahar) {
    if (sa === "Sūrya") return 0;
    if (sa === "Candra") {
      var node = norm(meanOf("Rāhu", ahar));
      var m = trueLongitude("Candra", ahar);
      return (INCL["Candra"] / 60) * (jya(norm(m.lon - node)) / RAD);
    }
    if (sa === "Rāhu" || sa === "Ketu") return 0;
    if (NODE[sa] == null) return null;
    var q = trueLongitude(sa, ahar);
    if (!q) return null;
    /* The argument of latitude is measured from the node to where the planet
       sits ON ITS OWN ORBIT — which for an outer graha is the manda-corrected
       place, before the śīghra correction swings it to where we see it, and
       for an inner one is its śīghrocca, because in this scheme that is the
       quantity carrying the planet's own motion. An earlier version used the
       bare mean place for the outer ones, which cost Maṅgala about a third of
       its latitude at the extremes. */
    var arg = INNER[sa] ? norm(q.sighrocca - NODE[sa])
                        : norm(q.mean + q.manda - NODE[sa]);
    var base = (INCL[sa] / 60) * (jya(arg) / RAD);
    return base * (RAD / q.karna);
  }

  /* =======================================================================
     6 — THE OBLIQUITY, DECLINATION, AND PRECESSION
     ======================================================================= */

  /* The text's obliquity is a round twenty-four degrees. The modern value is
     a third of a degree less and shrinking; the difference shows in every
     declination and therefore in every sunrise this engine computes. */
  var OBLIQUITY = 24;

  /* Declination. On the ecliptic it is the text's own one-liner, through the
     sine table. With a latitude — which the planets have and which an eclipse
     turns on — the latitude's contribution is added as a correction, so the
     table still governs the main term and the correction is exact. */
  function declinationOf(lon, lat) {
    var d0 = arcJya(jya(OBLIQUITY) * jya(lon) / RAD);
    if (!lat) return d0;
    var e = OBLIQUITY * D2R, l = lon * D2R, b = lat * D2R;
    var withLat = Math.asin(clamp(
      Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l),
      -1, 1)) * R2D;
    var withoutLat = Math.asin(clamp(Math.sin(e) * Math.sin(l), -1, 1)) * R2D;
    return d0 + (withLat - withoutLat);
  }

  /* Right ascension at the text's obliquity, used for the rising times of the
     signs and for the udayāntara. */
  function raOfLongitude(lon) {
    var l = norm(lon);
    var a = Math.atan2(Math.sin(l * D2R) * Math.cos(OBLIQUITY * D2R),
                       Math.cos(l * D2R)) * R2D;
    return norm(a);
  }

  /* AYANĀṂŚA. The text describes the circle of asterisms as librating rather
     than precessing steadily, and the amplitude and period in circulation
     differ between manuscripts and between commentators. Two readings are
     offered and neither is called the right one:

       "libration"  an oscillation of ±27°, completing in 7200 years, zero in
                    the year 499 — which is the reading that gives the often
                    quoted 54″ a year at the moment of crossing
       "linear"     a steady 54″ a year from the same zero, which is what the
                    rate alone implies if the libration is ignored

     They agree near the zero point and diverge badly far from it, and the
     divergence is a real feature of the question rather than a defect of the
     code. The harness asserts they agree near 499 and disagree far from it,
     which is the only honest thing to assert about a disputed quantity. */
  var AYANA_ZERO_YEAR = 499;
  var AYANA_AMPLITUDE = 27;
  var AYANA_PERIOD = 7200;
  function yearOf(ms) { return new Date(ms).getUTCFullYear() +
    (new Date(ms).getUTCMonth() + 0.5) / 12; }
  function ayanamsa(ms) {
    if (OPT.ayana === "none") return 0;
    var t = yearOf(ms) - AYANA_ZERO_YEAR;
    if (OPT.ayana === "linear") return t * 54 / 3600;
    return AYANA_AMPLITUDE * Math.sin(2 * Math.PI * t / AYANA_PERIOD);
  }
  /* A tropical longitude from the sidereal one this engine computes. */
  function tropical(lon, ms) { return norm(lon + ayanamsa(ms)); }

  /* =======================================================================
     7 — THE DAY WHERE YOU ARE STANDING
     ======================================================================= */

  /* CARA — the ascensional difference. The quantity that makes a summer day
     long: the Sun's declination, worked against the latitude of the place,
     gives the angle by which sunrise runs early and sunset late. The text
     reaches it through the "earth-sine", which is the same thing expressed as
     a length rather than an angle. */
  function cara(decl, lat) {
    var t = Math.tan(lat * D2R) * Math.tan(decl * D2R);
    if (t >= 1) return 90;                /* the Sun does not set */
    if (t <= -1) return -90;              /* the Sun does not rise */
    return arcJya(RAD * t);
  }
  /* The rising times of the signs at the equator, in asus — a sixth of a
     minute of time, 21600 to the day. They are DERIVED from the obliquity
     rather than tabulated, because the canonical integers are a consequence
     of it and a table would let the two drift apart. The harness checks the
     derived values against the canonical 1670, 1795 and 1935. */
  function risingTimesAtEquator() {
    var out = [];
    for (var i = 0; i < 12; i++) {
      var a0 = raOfLongitude(i * 30), a1 = raOfLongitude((i + 1) * 30);
      var d = norm(a1 - a0);
      out.push(d / 360 * 21600);
    }
    return out;
  }
  /* and at a latitude, the equatorial times less or plus the cara of the end
     points — the text's own way of getting oblique ascension */
  /* The signs here are the SĀYANA signs — the thirty-degree arcs measured
     from the equinox — because that is what a rising time is about. The
     sidereal signs rise in the same times, shifted; the lagna routine does
     the shifting. */
  function risingTimes(lat) {
    var eq = risingTimesAtEquator();
    var ch = [];
    for (var i = 0; i < 12; i++) {
      var d0 = declinationOf((i) * 30), d1 = declinationOf((i + 1) * 30);
      var c0 = cara(d0, lat) / 360 * 21600, c1 = cara(d1, lat) / 360 * 21600;
      ch.push(eq[i] - (c1 - c0));
    }
    return ch;
  }

  /* Sunrise and sunset, as the text gets them: half the day is six hours plus
     or minus the cara. The result is mean local apparent time at the place's
     own meridian, converted here to a time value so it can be compared with
     anything else. */
  function sunriseSunset(ms, place) {
    if (!place || place.lat == null) return null;
    var a = ahargana(ms, "sunrise") + desantara(place);
    var q = trueLongitude("Sūrya", a);
    /* THE FRAME THE DECLINATION IS MEASURED IN.

       Everything this engine computes is sidereal — measured from a fixed
       point among the stars, which is what the whole tradition means by a
       longitude. Declination is not: it is measured from the EQUINOX, and
       the equinox moves. So the declination has to be taken of the sāyana
       longitude, the sidereal one plus the ayanāṃśa.

       An earlier version took it of the sidereal longitude directly. The
       result was a seasonal error with a very recognisable shape: almost
       nothing at the solstices, where declination is flat, and half an hour
       at the equinoxes, where it changes fastest — the signature of a whole
       seasonal curve shifted bodily by twenty-four days. */
    var dec = declinationOf(tropical(q.lon, ms));
    var c = cara(dec, place.lat);
    var halfDay = 6 + c / 15;                       /* hours either side of noon */
    var tzh = place.tz == null ? 0 : place.tz;

    /* THE FRAMES, kept apart on purpose. `E` is the equation of time in
       hours. Local apparent noon happens at local mean time 12:00 − E, and
       local mean time runs ahead of UTC by the place's longitude in hours. So
       the UTC instant of apparent noon on a given LOCAL date is that date's
       UTC midnight plus (12 − E − longitude/15) hours. An earlier version
       mixed a local-midnight instant with a UTC clock time and was out by the
       time zone, which on a phone in Abu Dhabi is four hours. */
    var E = equationOfTime(a) * 24;
    var localDay = Math.floor((ms + tzh * 3600000) / DAY);
    var utcMidnightOfLocalDate = localDay * DAY;
    var noon = utcMidnightOfLocalDate + (12 - E - place.lon / 15) * 3600000;
    return {
      sunrise: noon - halfDay * 3600000,
      sunset:  noon + halfDay * 3600000,
      noon: noon,
      dayHours: halfDay * 2,
      declination: dec,
      cara: c,
      equationOfTimeMinutes: E * 60,
      bhujantaraMinutes: bhujantaraDays(a) * 24 * 60,
      /* the sāyana Sun, matching what equationOfTime actually used — this
         reported the sidereal reading while E was computed from it too, so
         the panel agreed with the bug rather than exposing it */
      udayantaraMinutes: udayantaraDays(tropical(q.lon, ms)) * 24 * 60,
      circumpolar: Math.abs(c) >= 90
    };
  }

  /* The lagna — the point of the ecliptic rising. Found by walking the
     oblique ascensions from sunrise, which is how the text does it: so much
     of the first sign remains, then whole signs, then part of the last. */
  function lagna(ms, place) {
    var S = sunriseSunset(ms, place);
    if (!S) return null;
    var a = ahargana(ms, "sunrise") + desantara(place);
    /* the rising times are reckoned from the equinox, so the Sun that walks
       them must be the sāyana one; the lagna is handed back sidereal, which
       is the frame every other longitude on this site is in */
    var sun = tropical(trueLongitude("Sūrya", a).lon, ms);
    var elapsedAsus = (ms - S.sunrise) / DAY * 21600;
    while (elapsedAsus < 0) elapsedAsus += 21600;
    var rt = risingTimes(place.lat);
    /* the part of the Sun's own sign still to rise at sunrise */
    var sIdx = Math.floor(norm(sun) / 30);
    var frac = 1 - (norm(sun) - sIdx * 30) / 30;
    var acc = rt[sIdx] * frac;
    var lon;
    if (elapsedAsus < acc) {
      lon = norm(sun + (elapsedAsus / Math.max(1e-9, rt[sIdx])) * 30);
    } else {
      var rem = elapsedAsus - acc;
      var i = (sIdx + 1) % 12;
      for (var guard = 0; guard < 40; guard++) {
        if (rem < rt[i]) break;
        rem -= rt[i];
        i = (i + 1) % 12;
      }
      lon = norm(i * 30 + (rem / Math.max(1e-9, rt[i])) * 30);
    }
    var sidereal = norm(lon - ayanamsa(ms));
    return { lon: sidereal, tropical: norm(lon),
             sign: Math.floor(sidereal / 30), sunrise: S.sunrise,
             elapsedAsus: elapsedAsus };
  }

  /* =======================================================================
     8 — THE PAÑCĀṄGA, COMPUTED THE OLD WAY
     ======================================================================= */

  var TITHI = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī",
    "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
    "Trayodaśī", "Caturdaśī", "Pūrṇimā"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrva Phalgunī", "Uttara Phalgunī",
    "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
    "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  var YOGA = ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana",
    "Atigaṇḍa", "Sukarman", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva",
    "Vyāghāta", "Harṣaṇa", "Vajra", "Siddhi", "Vyatīpāta", "Varīyān",
    "Parigha", "Śiva", "Siddha", "Sādhya", "Śubha", "Śukla", "Brahman",
    "Indra", "Vaidhṛti"];
  var KARANA_MOV = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija",
    "Viṣṭi"];
  var KARANA_FIX = ["Śakuni", "Catuṣpada", "Nāga", "Kiṃstughna"];

  function panchanga(ms, place) {
    var a = ahargana(ms, "sunrise") + desantara(place);
    var sun = trueLongitude("Sūrya", a).lon;
    var moon = trueLongitude("Candra", a).lon;
    var elong = norm(moon - sun);
    var tIdx = Math.floor(elong / 12);                 /* 0..29 */
    var paksha = tIdx < 15 ? "śukla" : "kṛṣṇa";
    var tName = tIdx === 14 ? "Pūrṇimā"
              : (tIdx === 29 ? "Amāvāsyā" : TITHI[tIdx % 15]);
    var nIdx = Math.floor(norm(moon) / (360 / 27));
    var pada = Math.floor((norm(moon) % (360 / 27)) / (360 / 108)) + 1;
    var yIdx = Math.floor(norm(sun + moon) / (360 / 27));
    /* karaṇa: half-tithis, with four fixed ones at the ends of the month */
    var half = Math.floor(elong / 6);                  /* 0..59 */
    var kName;
    if (half === 0) kName = KARANA_FIX[3];
    else if (half >= 57) kName = KARANA_FIX[half - 57];
    else kName = KARANA_MOV[(half - 1) % 7];
    var V = vara(ms, place);
    return {
      ahargana: a,
      sun: sun, moon: moon, elongation: elong,
      tithi: { n: tIdx + 1, name: tName, paksha: paksha,
               fraction: (elong % 12) / 12 },
      nakshatra: { n: nIdx + 1, name: NAK[nIdx], pada: pada,
                   fraction: (norm(moon) % (360 / 27)) / (360 / 27) },
      yoga: { n: yIdx + 1, name: YOGA[yIdx] },
      karana: { n: half + 1, name: kName },
      vara: V
    };
  }

  /* =======================================================================
     9 — HOW BIG, AND HOW FAR
     ======================================================================= */

  /* Diameters and mean distances in yojanas, the text's own unit. The
     apparent diameter follows the true daily motion: a graha moving fast is
     near and looks big, which is the relation the text uses in place of a
     distance it has no way to measure. */
  var SIZE = {
    earthDiameter: 1600,
    "Sūrya": { diameter: 6500, meanDist: 689377 },
    "Candra": { diameter: 480, meanDist: 51566 }
  };
  function meanDailyMotion(sa) {
    if (sa === "Sūrya") return dailyMotion("Sūrya");
    if (sa === "Candra") return dailyMotion("Candra");
    return null;
  }
  /* The apparent diameter follows the TRUE DAILY MOTION: a graha moving fast
     is near and looks big. It is the relation the text uses in place of a
     distance it has no way to measure, and it is worth knowing that it
     overstates the variation by about a factor of two. The reason is
     structural rather than careless: a single epicycle fitted to reproduce
     the equation of centre has to be about twice the eccentricity, so the
     distance it implies swings twice as far as the real one. The mean is
     close; the extremes are not. */
  function apparentDiameter(sa, ahar) {
    var S = SIZE[sa];
    if (!S) return null;
    var meanAng = S.diameter / S.meanDist * R2D * 60;   /* minutes of arc */
    var mm = meanDailyMotion(sa);
    var tm = trueDailyMotion(sa, ahar);
    if (mm == null || tm == null) return meanAng;
    return meanAng * (tm / mm);
  }
  function trueDailyMotion(sa, ahar) {
    var a = trueLongitude(sa, ahar - 0.5), b = trueLongitude(sa, ahar + 0.5);
    if (!a || !b) return null;
    return sdiff(b.lon, a.lon);
  }
  /* The Earth's shadow where the Moon crosses it — the quantity a lunar
     eclipse is measured against. The text computes it from the Sun's and the
     Earth's diameters and the Moon's distance. */
  function shadowDiameter(ahar) {
    var sunMean = dailyMotion("Sūrya"), moonMean = dailyMotion("Candra");
    var sunTrue = trueDailyMotion("Sūrya", ahar);
    var moonTrue = trueDailyMotion("Candra", ahar);
    var sunDist = SIZE["Sūrya"].meanDist * (sunMean / sunTrue);
    var moonDist = SIZE["Candra"].meanDist * (moonMean / moonTrue);
    /* the shadow narrows from the Earth's diameter at the rate the Sun's
       excess over the Earth sets */
    var d = SIZE.earthDiameter -
      (SIZE["Sūrya"].diameter - SIZE.earthDiameter) * moonDist /
      Math.max(1, sunDist - moonDist);
    return { yojanas: d, minutes: d / moonDist * R2D * 60,
             moonDist: moonDist, sunDist: sunDist };
  }

  /* =======================================================================
     10 — ECLIPSES
     ======================================================================= */

  function syzygy(ahar0, want, dir) {
    /* the instant the elongation reaches `want`, found from `ahar0` */
    function f(a) {
      var s = trueLongitude("Sūrya", a).lon, m = trueLongitude("Candra", a).lon;
      return sdiff(norm(m - s), want);
    }
    var step = 0.25 * (dir || 1), a = ahar0, fa = f(a);
    for (var i = 0; i < 300; i++) {
      var b = a + step, fb = f(b);
      if ((fa < 0) !== (fb < 0) && Math.abs(fa) < 90 && Math.abs(fb) < 90) {
        for (var k = 0; k < 60; k++) {
          var m2 = (a + b) / 2, fm = f(m2);
          if ((fa < 0) === (fm < 0)) { a = m2; fa = fm; } else { b = m2; }
          if (Math.abs(b - a) < 1e-7) break;
        }
        return (a + b) / 2;
      }
      a = b; fa = fb;
    }
    return null;
  }

  /* A lunar eclipse, judged at the opposition: the Moon's latitude against
     the sum of the two half-diameters. */
  function lunarEclipseAt(ahar) {
    var t = syzygy(ahar, 180, 1);
    if (t == null) return null;
    var lat = latitudeOf("Candra", t) * 60;              /* minutes */
    var sh = shadowDiameter(t);
    var moonD = apparentDiameter("Candra", t);
    var sum = (sh.minutes + moonD) / 2;
    var obscured = sum - Math.abs(lat);
    if (obscured <= 0) return { at: msOf(t + (EPOCH.sunrise)), ahar: t,
                                eclipse: false, latitude: lat / 60,
                                shadow: sh.minutes, moon: moonD };
    /* the relative motion sets how long it lasts */
    var rel = trueDailyMotion("Candra", t) - trueDailyMotion("Sūrya", t);
    var halfDur = Math.sqrt(Math.max(0, sum * sum - lat * lat)) /
                  Math.max(1e-6, rel * 60) * 24;          /* hours */
    var diff = (sh.minutes - moonD) / 2;
    var totalHalf = diff > Math.abs(lat)
      ? Math.sqrt(Math.max(0, diff * diff - lat * lat)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    return {
      ahar: t, at: msOf(t + EPOCH.sunrise),
      eclipse: true,
      total: totalHalf > 0,
      magnitude: obscured / moonD,
      latitude: lat / 60,
      shadowMinutes: sh.minutes,
      moonMinutes: moonD,
      halfDurationHours: halfDur,
      totalHalfHours: totalHalf,
      begins: msOf(t + EPOCH.sunrise) - halfDur * 3600000,
      ends: msOf(t + EPOCH.sunrise) + halfDur * 3600000
    };
  }

  /* A solar eclipse is a question about where you are standing, because it is
     parallax that decides it. The text computes a lambana in longitude and a
     nati in latitude; both are given here in the simplified form the method
     uses rather than a rigorous parallax. */
  function solarEclipseAt(ahar, place) {
    var t = syzygy(ahar, 0, 1);
    if (t == null) return null;
    var lat = latitudeOf("Candra", t) * 60;
    var sunD = apparentDiameter("Sūrya", t);
    var moonD = apparentDiameter("Candra", t);
    var sum = (sunD + moonD) / 2;
    /* lambana: the difference of parallax between Sun and Moon, which at its
       largest is about four nāḍīs of time and vanishes at local noon */
    var lam = 0, nati = 0;
    if (place && place.lat != null) {
      var L = lagna(msOf(t + EPOCH.sunrise), place);
      var mid = L ? norm(L.lon - trueLongitude("Sūrya", t).lon) : 0;
      lam = 4 * jya(mid) / RAD;                          /* nāḍīs */
      nati = 0.7 * jya(place.lat) / RAD;                 /* degrees, crudely */
    }
    var tAdj = t + lam * 24 / 60 / 24;
    var effLat = lat / 60 + nati;
    var obscured = sum / 60 - Math.abs(effLat);
    /* how long it lasts, from the same geometry as the lunar case: the
       relative motion carrying the Moon across the chord its latitude cuts
       through the Sun's disc */
    var rel = trueDailyMotion("Candra", t) - trueDailyMotion("Sūrya", t);
    var latMin = effLat * 60;
    var halfDur = obscured > 0
      ? Math.sqrt(Math.max(0, sum * sum - latMin * latMin)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    var diff = Math.abs(moonD - sunD) / 2;
    var totalHalf = (obscured > 0 && diff > Math.abs(latMin))
      ? Math.sqrt(Math.max(0, diff * diff - latMin * latMin)) /
        Math.max(1e-6, rel * 60) * 24 : 0;
    return {
      ahar: tAdj, at: msOf(tAdj + EPOCH.sunrise),
      eclipse: obscured > 0,
      magnitude: obscured > 0 ? obscured * 60 / sunD : 0,
      /* the Moon smaller than the Sun is an annular eclipse, larger a total
         one — a distinction this method is able to make, because both
         diameters follow their own true motion */
      annular: obscured > 0 && totalHalf > 0 && moonD < sunD,
      total: obscured > 0 && totalHalf > 0 && moonD >= sunD,
      latitude: lat / 60, effectiveLatitude: effLat,
      lambanaNadis: lam, nati: nati,
      sunMinutes: sunD, moonMinutes: moonD,
      halfDurationHours: halfDur,
      totalHalfHours: totalHalf,
      begins: msOf(tAdj + EPOCH.sunrise) - halfDur * 3600000,
      ends: msOf(tAdj + EPOCH.sunrise) + halfDur * 3600000
    };
  }

  /* EVERY SYZYGY IN A SPAN, enumerated rather than hunted for.

     The first version of this walked forward from each eclipse it found,
     which meant a span with no eclipse in it advanced by a guess — and a
     walker that guesses can step over a syzygy. Since the whole value of
     this routine is the claim "these are the eclipses and there are no
     others", a walker that might skip is not good enough.

     So the new and full Moons are enumerated independently and exhaustively.
     Their spacing is the one interval this engine knows exactly — it is the
     synodic month, and the synodic month is what the revolution counts are
     best at, agreeing with the modern value to a tenth of a second. Each
     syzygy is then tested on its own. Any eclipse missing from the result is
     missing because the theory does not find it, which is the honest thing
     for this to report and a quantity worth knowing. */
  function syzygies(a0, a1, want) {
    var syn = YUGA.civilDays / (revOf("Candra") - revOf("Sūrya"));
    var out = [];
    /* start half a month early so the first one in the span is not lost */
    var t = a0 - syn;
    for (var i = 0; i < 2000 && t < a1 + syn; i++) {
      var r = syzygy(t, want, 1);
      if (r == null) break;
      if (r > a0 && r <= a1) out.push(r);
      t = r + syn * 0.6;
    }
    return out;
  }
  function eclipsesIn(fromMs, toMs, place) {
    var out = [];
    var a0 = ahargana(fromMs), a1 = ahargana(toMs);
    syzygies(a0, a1, 180).forEach(function (t) {
      var L = lunarEclipseAt(t - 0.4);
      if (L && L.eclipse) out.push({ kind: "lunar", e: L });
    });
    syzygies(a0, a1, 0).forEach(function (t) {
      var S = solarEclipseAt(t - 0.4, place);
      if (S && S.eclipse) out.push({ kind: "solar", e: S });
    });
    out.sort(function (x, y) { return x.e.ahar - y.e.ahar; });
    return out;
  }

  /* HOW FAR THE NODE HAS WANDERED. The revolution count for Rāhu gives a
     draconitic month right to about two seconds, which is the rate; but a
     rate two seconds out, carried across the two hundred and seventy-five
     circuits the node has made since the epoch, is a position tens of degrees
     from the truth. That is the single quantity behind most of what this
     engine gets wrong about eclipses — it finds the great ones and misses the
     slight ones, because an eclipse season sits where the node says it does. */
  function nodeDrift(ms) {
    var a = ahargana(ms);
    var ss = norm(meanOf("Rāhu", a));
    var modern = null;
    try {
      /* recovered from the modern Moon's own latitude and longitude, so this
         needs no second table: the node is where the latitude passes through
         zero going north */
      var lon = window.__kSidAtModern("Moon", new Date(ms));
      var e = window.__kEclipModern("Moon", ms);
      if (e && e.lat != null) {
        var s2 = clamp(Math.sin(e.lat * D2R) / Math.sin(5.145 * D2R), -1, 1);
        var arg = Math.asin(s2) * R2D;
        /* resolve the quadrant with the latitude's own rate */
        var e2 = window.__kEclipModern("Moon", ms + 3600000);
        if (e2 && e2.lat != null && e2.lat < e.lat) arg = 180 - arg;
        modern = norm(lon - arg);
      }
    } catch (x) {}
    return { ss: ss, modern: modern,
             diff: modern == null ? null : sdiff(ss, modern),
             circuits: a / (YUGA.civilDays / Math.abs(revOf("Rāhu"))) };
  }

  /* =======================================================================
     11 — VISIBILITY AND STATIONS
     ======================================================================= */

  /* The kālāṃśas: how far from the Sun, measured in degrees of the equator,
     a graha must be to be seen at all. Śukra is the brightest and needs the
     least; Śani is faint and needs the most. */
  var KALAMSA = { "Candra": 12, "Maṅgala": 17, "Budha": 13, "Guru": 11,
                  "Śukra": 9, "Śani": 15 };
  function heliacal(sa, ahar) {
    if (KALAMSA[sa] == null) return null;
    var s = trueLongitude("Sūrya", ahar), q = trueLongitude(sa, ahar);
    if (!q) return null;
    /* compared in right ascension, which is what "degrees of time" means */
    var d = sdiff(raOfLongitude(q.lon), raOfLongitude(s.lon));
    return { arc: d, needs: KALAMSA[sa], visible: Math.abs(d) >= KALAMSA[sa],
             side: d > 0 ? "east — sets after the Sun" : "west — rises before it" };
  }
  function isRetrograde(sa, ahar) {
    var m = trueDailyMotion(sa, ahar);
    return m == null ? null : m < 0;
  }

  /* =======================================================================
     12 — THE PUBLIC FACE
     ======================================================================= */

  function positions(ms, variant, place) {
    var ahar = ahargana(ms, variant) + (place ? desantara(place) : 0);
    var out = { ahargana: ahar, variant: variant || "sunrise", at: ms,
                grahas: {} };
    SA.forEach(function (sa) {
      var q = trueLongitude(sa, ahar);
      if (!q) return;
      q.latitude = latitudeOf(sa, ahar);
      q.declination = declinationOf(tropical(q.lon, ms), q.latitude || 0);
      q.speed = trueDailyMotion(sa, ahar);
      q.retrograde = q.speed != null && q.speed < 0;
      var h = heliacal(sa, ahar);
      if (h) q.visibility = h;
      var d = apparentDiameter(sa, ahar);
      if (d != null) q.apparentDiameter = d;
      out.grahas[sa] = q;
    });
    return out;
  }
  function motion(sa, ms, variant) {
    return trueDailyMotion(sa, ahargana(ms, variant));
  }

  function constants() {
    var yearDays = YUGA.civilDays / revOf("Sūrya");
    var monthDays = YUGA.civilDays / (revOf("Candra") - revOf("Sūrya"));
    var sidMonth = YUGA.civilDays / revOf("Candra");
    var anomMonth = YUGA.civilDays / (revOf("Candra") - revOf("candraUcca"));
    var nodeMonth = YUGA.civilDays / (revOf("Candra") - revOf("Rāhu"));
    return {
      sidYearDays: yearDays,
      synodicMonthDays: monthDays,
      sidMonthDays: sidMonth,
      anomalisticMonthDays: anomMonth,
      draconiticMonthDays: nodeMonth,
      civilDays: YUGA.civilDays,
      yugaYears: YUGA.years,
      radius: RAD,
      obliquity: OBLIQUITY,
      modernSidYearDays: 365.256363,
      modernSynodicMonth: 29.5305889,
      modernSidMonth: 27.321661547,
      modernAnomalisticMonth: 27.554549878,
      modernDraconiticMonth: 27.212220817,
      yearExcessSeconds: (yearDays - 365.256363) * 86400,
      /* the number of lunar months in a solar year, from which the
         intercalary month follows */
      monthsPerYear: yearDays / monthDays,
      adhikaMasaYears: 1 / (yearDays / monthDays - 12)
    };
  }

  function chart(ms, variant, place) {
    var P = positions(ms, variant, place);
    var out = { source: "Sūrya Siddhānta", variant: P.variant,
                ahargana: P.ahargana, planets: {} };
    SA.forEach(function (sa) {
      var q = P.grahas[sa];
      if (!q) return;
      out.planets[sa] = { lon: q.lon, mean: q.mean, speed: q.speed,
                          lat: q.latitude, manda: q.manda, sighra: q.sighra };
    });
    if (place) {
      var L = lagna(ms, place);
      if (L) out.lagna = L.lon;
      out.day = sunriseSunset(ms, place);
      out.panchanga = panchanga(ms, place);
    }
    return out;
  }

  /* What is not here, and why — printed on the page rather than discovered. */
  var ABSENT = [
    { what: "The yogatārā positions of the nakṣatras",
      why: "the polar longitudes and latitudes of the junction stars are a " +
           "table, and a table I could not verify is worse than no table; the " +
           "machinery for a graha's conjunction with a star is here and takes " +
           "a star's coordinates as an argument" },
    { what: "A bīja correction",
      why: "later astronomers corrected these revolution counts and the " +
           "corrections in circulation differ; the mechanism is implemented " +
           "and takes a bīja as an option, but none is shipped, because " +
           "choosing between them silently would be the wrong kind of help" },
    { what: "Rigorous parallax for solar eclipses",
      why: "the lambana and nati here follow the text's own simplified form " +
           "rather than a true parallax, so a solar eclipse is placed to " +
           "within a fraction of an hour and not to the minute — which is " +
           "what the method itself gives, not an abbreviation of it" },
    { what: "The gnomon and shadow problems",
      why: "the chapter on direction, place and time by shadow is a set of " +
           "constructions rather than a computation, and the quantities it " +
           "reaches — latitude, the equinoctial shadow, the cara — are all " +
           "computed here by other means" },
    { what: "The Moon's second and third inequalities",
      why: "evection and variation are not in this theory at all; their " +
           "absence is most of why the Moon here differs from a modern one by " +
           "degrees rather than minutes, and supplying them would make this a " +
           "different astronomy wearing the same parameters" }
  ];

  /* ===== THE MEASURED TIER ==================================================

     The engine above computes with the text's own constants and lands degrees
     from the modern ephemeris — Śani 6.4° apart in 2026, the Moon 6.3°. That
     is what the method itself gives, and it is reported as a difference, not
     ranked.

     measured() keeps every EQUATION exactly as it is — madhyama, manda,
     śīghra, the epicycle interpolation, the twenty-four-entry sine table —
     and swaps in constants fitted to a modern sky by
     source/test/fit-siddhanta.mjs: a bīja on each body's revolutions, an
     epoch longitude, a scale on each paridhi of the pair the text states, and
     an offset on each mandocca. Every one of those is a quantity the tradition
     itself treats as correctable; no term is added and no formula changes.

     IT IS NOT THE SŪRYA SIDDHĀNTA'S ANSWER. It is the text's method carrying
     measured numbers, and any page showing it must say so. bare() puts every
     constant back, and siddhanta-measured-verify.mjs asserts the restored
     engine is bit-identical to one that never heard of this.

     WHAT IT REACHES, out of sample on 213 instants never seen by the fit:

         Sūrya 1.0′    Guru 6.0′    Śani 7.3′    Śukra 8.4′
         Maṅgala 58′   Candra 62′   Budha 107′

     The split is not a surprise and it is not a shortcoming of the fit. The
     Moon's residual, regressed on the arguments of the two terms this theory
     lacks, yields an evection of 75.9′ against the textbook 76.4′ and a
     variation of 39.7′ against 39.5′, and removing just those two drops its
     rms from 62′ to 14′. The Moon's limit here is the ABSENCE OF TERMS, not
     the value of numbers, and no bīja or paridhi can supply them. Budha's and
     Maṅgala's eccentricities are likewise past what one epicycle can carry.
     Adding the missing terms would make this a different astronomy wearing the
     same parameters, which is the line this tier does not cross. */
  var MEASURED = null;      /* set by setMeasured(), from the fitted data file */
  var BASE_CONST = {
    rev: JSON.parse(JSON.stringify(YUGA.rev)),
    civilDays: YUGA.civilDays,
    epi: JSON.parse(JSON.stringify(EPI)),
    mandocca: JSON.parse(JSON.stringify(MANDOCCA)),
    epoch: JSON.parse(JSON.stringify(EPOCH_LON))
  };
  function restoreConstants(){
    OPT.bija = null;
    PS_ON = false;
    /* YUGA.rev and civilDays go back too. The measured tier never needed that
       — it corrects revolutions through OPT.bija, a multiplicative factor
       applied at use, and leaves YUGA.rev alone — so this function restored
       everything EXCEPT the revolutions it had been snapshotting all along.
       The Pañcasiddhāntikā tier below is a CONSTANTS tier and must mutate
       them, so bare() has to put them back, or the next caller silently gets
       Varāhamihira's numbers under the Later Sūrya Siddhānta's name. */
    for (var r in BASE_CONST.rev) YUGA.rev[r] = BASE_CONST.rev[r];
    YUGA.civilDays = BASE_CONST.civilDays;
    for (var b in BASE_CONST.epi) {
      EPI[b].manda = BASE_CONST.epi[b].manda.slice();
      EPI[b].sighra = BASE_CONST.epi[b].sighra ? BASE_CONST.epi[b].sighra.slice() : null;
    }
    for (var m in BASE_CONST.mandocca) MANDOCCA[m] = BASE_CONST.mandocca[m];
    for (var e in EPOCH_LON) delete EPOCH_LON[e];
    for (var e2 in BASE_CONST.epoch) EPOCH_LON[e2] = BASE_CONST.epoch[e2];
  }
  /* ===== THE PAÑCASIDDHĀNTIKĀ SAURA TIER ====================================

     Varāhamihira's Saura, as condensed in the Pañcasiddhāntikā (Kuppanna
     Sastry tr., Sarma ed., PPST Madras 1993), Ch. XVI–XVII. Of the five
     siddhāntas he abridges, THE SAURA ALONE USES EPICYCLES (Sastry's note to
     Ch. XVI), so it is the only one with a counterpart in this engine — the
     Pauliśa, Romaka, Vāsiṣṭha and Paitāmaha have none, and a Romaka tier in
     particular could compute the Sun, the Moon, the pañcāṅga and eclipses and
     nothing else, because that chapter supplies no star-planets at all.

     Like measured(), this tier keeps EVERY EQUATION as it is and swaps only
     constants. Unlike measured(), the constants are not fitted to anything:
     they are an older recension's own numbers, and the tier exists to show
     what the method gives with them.

     WHAT IS THE TEXT'S, AND WHAT IS BORROWED. The body of that PDF is page
     images; only pages 408–419 carry a text layer, so every figure below was
     OCR'd at 300–400 dpi and checked, and the ones the extraction never
     reached are NOT invented — they are taken from the Later Sūrya Siddhānta
     constants above and NAMED, individually, in panchaSauraInfo().borrowed.
     Any page showing this tier must print that list. A tier that is four
     twentieths someone else's numbers while wearing Varāhamihira's name would
     be a worse object than no tier at all.

     Known differences from the Later SS, all text-verified:

       yuga civil days   1,577,917,800 against 1,577,917,828 — the 28-day
                         Ardharātrika gap (Āryabhaṭa's Audayika is
                         1,577,917,500; +300 the Ardharātrika, +328 the Later
                         SS). Implied year 365.258750 d against 365.258756 d,
                         which is half a second.
       revolutions       Guru identical; Śani −4, Maṅgala −8, Budha −60,
                         Śukra +12 on figures in the millions.
       epicycles         THE OLDER TEXT HAS ONE VALUE, NOT TWO. Six of its ten
                         star-planet figures are exactly this engine's
                         even-quadrant member, which reads as the later
                         recension having added a second circumference beside
                         an inherited one. So the "breathing" epicycle is a
                         later-recension feature, and on this tier it does not
                         breathe: both quadrant entries are set equal.
       mandocca          agrees EXACTLY on all five star-planets, so nothing
                         changes there and the agreement is itself a result.

     NOT IMPLEMENTED, and the tier says so rather than pretending: the PS
     computes on R = 120, not 3438, with its own jyā table. That is a
     different trigonometric base, and this tier runs the engine's sine table.
     It is therefore the PS's PARAMETERS under this engine's trigonometry, not
     a reimplementation of the PS's arithmetic. */
  var PS_ON = false;
  var PS_CONST = {
    /* PS I.14, the Saura minor yuga of 180,000 years, ×24 to the Mahāyuga.
       The ×24 civil-day figure reproduces the Ch. XVI value exactly, which is
       an independent confirmation that the scaling is right. */
    civilDays: 1577917800,
    rev: {
      "Sūrya":   4320000,       /* PS I.14 */
      "Candra":  57753336,      /* PS I.14: 2,406,389 lunar revolutions × 24 */
      "Maṅgala": 2296824,       /* Ch. XVI.2–9, days ÷ 687 */
      "Budha":   17937000,      /* śīghrocca; days × 100 ÷ 8797 */
      "Guru":    364220,        /* days × 100 ÷ 433,232 */
      "Śukra":   7022388,       /* śīghrocca; days × 10 ÷ 2247 */
      "Śani":    146564         /* days × 1000 ÷ 10,766,066 */
    },
    /* One circumference per body, not a pair. Where the text gives one value
       both quadrant entries take it, so the interpolation that makes the
       later recension's epicycle "breathe" collapses to a constant. */
    epi: {
      "Sūrya":   { manda: 14,  sighra: null },   /* the text notes Śukra's
                                                    manda 14° IS the Sun's */
      "Maṅgala": { manda: 70,  sighra: 234 },
      "Budha":   { manda: 28,  sighra: 132 },
      "Guru":    { manda: 32,  sighra: 72 },
      "Śukra":   { manda: 14,  sighra: 260 },
      "Śani":    { manda: 60,  sighra: 40 }
    },
    /* Named individually, because an undisclosed borrow is the whole risk
       here. Each entry says what was wanted and why it is not the text's. */
    borrowed: [
      ["YUGA.rev.candraUcca", "the Moon's apogee revolutions",
       "PS I.14 gives the Moon but neither the apogee nor the node. Ch. XVI " +
       "was not reached by the OCR for them. Only their EPOCH LONGITUDES are " +
       "text-verified (apogee 90°, node 180°), and those are already what " +
       "this engine ships."],
      /* "as above" was the first draft of this, and the harness refused it:
         each entry is rendered on its own in a list, where a back-reference
         explains nothing. */
      ["YUGA.rev.Rāhu", "the node's revolutions",
       "PS I.14 gives the lunar revolutions but not the node's. Ch. XVI was " +
       "not reached by the OCR for it. Its EPOCH LONGITUDE of 180° is " +
       "text-verified — Sastry's notes to Ch. XVI put the node there at Kali " +
       "in the Āryabhaṭīya, the Ardharātrika-pakṣa, Varāhamihira's Saura, " +
       "Bhaṭṭotpala's Pauliśa and the Later Sūrya Siddhānta alike — and that " +
       "is already what this engine ships."],
      ["EPI.Candra", "the Moon's epicycle",
       "the extraction recorded the five star-planets and the Sun's value " +
       "(via Śukra's), not the Moon's. The later recension's pair is kept " +
       "rather than guessing a single value from the one-value pattern."],
      ["MANDOCCA.Sūrya", "the Sun's apogee",
       "the five star-planets' mandocca are text-verified and agree exactly; " +
       "the Sun's was not among them."]
    ]
  };
  function applyPanchaSaura(){
    for (var r in PS_CONST.rev) YUGA.rev[r] = PS_CONST.rev[r];
    YUGA.civilDays = PS_CONST.civilDays;
    for (var b in PS_CONST.epi) {
      var v = PS_CONST.epi[b];
      /* both entries equal: one circumference, so no interpolation */
      EPI[b].manda = [v.manda, v.manda];
      EPI[b].sighra = (v.sighra == null) ? null : [v.sighra, v.sighra];
    }
    OPT.bija = null;          /* a constants tier, never a fitted one */
    PS_ON = true;
    return true;
  }
  /* Hand it the parsed source/data/siddhanta-measured.json. Kept as an
     argument rather than fetched or inlined: this file must stay loadable with
     no network and no build step, and a page that wants the measured tier can
     decide for itself whether to ship 6 KB of fitted constants. */
  function setMeasured(doc){ MEASURED = (doc && doc.params) ? doc : null; return !!MEASURED; }
  function applyMeasured(){
    if (!MEASURED) return false;
    var P = MEASURED.params, bija = {}, k;
    for (k in BASE_CONST.rev) if (P["bija." + k] != null) bija[k] = P["bija." + k];
    OPT.bija = bija;
    for (var b in BASE_CONST.epi) {
      var mo = P["mandaOdd." + b], me = P["mandaEven." + b];
      var so = P["sighraOdd." + b], se = P["sighraEven." + b];
      EPI[b].manda = [BASE_CONST.epi[b].manda[0] * (mo == null ? 1 : mo),
                      BASE_CONST.epi[b].manda[1] * (me == null ? 1 : me)];
      EPI[b].sighra = BASE_CONST.epi[b].sighra
        ? [BASE_CONST.epi[b].sighra[0] * (so == null ? 1 : so),
           BASE_CONST.epi[b].sighra[1] * (se == null ? 1 : se)] : null;
    }
    for (var m in BASE_CONST.mandocca)
      MANDOCCA[m] = BASE_CONST.mandocca[m] + (P["mandocca." + m] || 0);
    for (var e in EPOCH_LON) delete EPOCH_LON[e];
    for (var e2 in BASE_CONST.epoch) EPOCH_LON[e2] = BASE_CONST.epoch[e2];
    for (k in BASE_CONST.rev)
      if (P["epoch." + k] != null)
        EPOCH_LON[k] = (BASE_CONST.epoch[k] || 0) + P["epoch." + k];
    return true;
  }

  window.SSEngine = {
    /* configuration */
    OPT: OPT,
    /* the measured tier — see the note above it */
    setMeasured: setMeasured,
    measured: applyMeasured,
    bare: restoreConstants,
    isMeasured: function(){ return !!(MEASURED && OPT.bija); },
    /* the Pañcasiddhāntikā Saura tier — see the long note above it.
       panchaSauraInfo().borrowed is NOT optional reading for a page that
       displays this tier: four quantities in it are the Later Sūrya
       Siddhānta's because the OCR never reached them, and each is named. */
    panchaSaura: applyPanchaSaura,
    isPanchaSaura: function(){ return PS_ON; },
    panchaSauraInfo: function(){
      return {
        source: "Pañcasiddhāntikā of Varāhamihira, Ch. XVI–XVII; Kuppanna " +
                "Sastry tr., K. V. Sarma ed., PPST Foundation, Madras, 1993",
        civilDays: PS_CONST.civilDays,
        laterSSCivilDays: BASE_CONST.civilDays,
        civilDayGap: BASE_CONST.civilDays - PS_CONST.civilDays,
        impliedYear: PS_CONST.civilDays / YUGA.years,
        rev: JSON.parse(JSON.stringify(PS_CONST.rev)),
        epi: JSON.parse(JSON.stringify(PS_CONST.epi)),
        oneEpicycleNotTwo: true,
        borrowed: PS_CONST.borrowed.map(function (b) {
          return { path: b[0], what: b[1], why: b[2] };
        }),
        notImplemented: "The PS computes on R = 120 with its own jyā table, " +
          "not on 3438. This tier runs the engine's trigonometry, so it is " +
          "the PS's PARAMETERS under this engine's arithmetic, not a " +
          "reimplementation of the PS's own."
      };
    },
    measuredInfo: function(){
      return MEASURED ? { residuals: MEASURED.residuals,
                          lunarDiagnostic: MEASURED.lunarDiagnostic,
                          provenance: MEASURED._provenance } : null;
    },
    options: function (o) {
      if (o) { for (var k in o) if (OPT.hasOwnProperty(k)) OPT[k] = o[k]; }
      return { sines: OPT.sines, ayana: OPT.ayana, bija: OPT.bija };
    },
    /* data, published so it can be read and argued with */
    YUGA: YUGA, KALPA: KALPA, YUGAS: YUGAS, EPI: EPI, MANDOCCA: MANDOCCA,
    EPOCH: EPOCH, EPOCH_LON: EPOCH_LON, SA: SA, UJJAIN_LON: UJJAIN_LON, JYA: JYA, RAD: RAD,
    OBLIQUITY: OBLIQUITY, NODE: NODE, INCL: INCL, SIZE: SIZE,
    KALAMSA: KALAMSA, VARA: VARA, VARA_EN: VARA_EN,
    TITHI: TITHI, NAK: NAK, YOGA: YOGA, ABSENT: ABSENT,
    AYANA: { zero: AYANA_ZERO_YEAR, amplitude: AYANA_AMPLITUDE,
             period: AYANA_PERIOD },
    /* trigonometry */
    jya: jya, kojya: kojya, arcJya: arcJya, jyaTable: jyaTable,
    arcJyaTable: arcJyaTable,
    /* time */
    jdOf: jdOf, msOf: msOf, ahargana: ahargana, era: era, vara: vara,
    desantara: desantara, bhujantara: bhujantaraDays,
    udayantara: udayantaraDays, equationOfTime: equationOfTime,
    /* places */
    meanOf: meanOf, dailyMotion: dailyMotion,
    mandaEquation: mandaEquation, sighraEquation: sighraEquation,
    sighraFull: sighraFull, trueLongitude: trueLongitude,
    trueDailyMotion: trueDailyMotion,
    latitudeOf: latitudeOf, declination: declinationOf,
    raOfLongitude: raOfLongitude, ayanamsa: ayanamsa, tropical: tropical,
    /* the day */
    cara: cara, risingTimes: risingTimes,
    risingTimesAtEquator: risingTimesAtEquator,
    sunriseSunset: sunriseSunset, lagna: lagna, panchanga: panchanga,
    /* sizes and eclipses */
    apparentDiameter: apparentDiameter, shadowDiameter: shadowDiameter,
    syzygy: syzygy, syzygies: syzygies, nodeDrift: nodeDrift,
    lunarEclipseAt: lunarEclipseAt,
    solarEclipseAt: solarEclipseAt, eclipsesIn: eclipsesIn,
    /* visibility */
    heliacal: heliacal, isRetrograde: isRetrograde,
    /* the whole */
    positions: positions, motion: motion, constants: constants, chart: chart,
    norm: norm
  };
})();
;

window.__SS_FIT_DATA={
 "_provenance": {
  "what": "The Sūrya Siddhānta's own constants — revolution counts, epicycle circumferences, apogee longitudes — measured against a modern sky, with the text's equations untouched.",
  "why": "ss-engine.js with the text's constants lands degrees from the real sky, which is the method's own accuracy and makes it a museum piece. This makes the tradition's method castable while keeping its form.",
  "notTheText": "THIS IS NOT THE SŪRYA SIDDHĀNTA'S ANSWER and must never be presented as one. It is the text's METHOD carrying measured numbers. The bare text stays selectable and unchanged; siddhanta-measured-verify.mjs asserts it is still bit-identical.",
  "parameters": "One per classical quantity: a bīja on each body's revolutions, a scale on each manda and śīghra paridhi (which keeps the odd/even interpolation the text prescribes and moves only its size), and an offset on each mandocca. Twenty-seven numbers, every one of them a quantity the tradition has a name for. No free terms were added.",
  "outOfSample": "The 400 reference samples are split by index: even fitted, odd held out and never seen by the optimiser. The holdout figures are the ones to read; a fit judged on its own residuals tells you nothing.",
  "timescale": "The ahargaṇa comes from the civil instant exactly as a caller supplies it, not from TT. A siddhānta has no ΔT, so fitting in TT would have reported residuals no user could reproduce. ΔT stays an unmodelled systematic that the holdout numbers include.",
  "frame": "Sidereal on the site's own Lahiri polynomial, not the text's libration ayanāṃśa, because a measured tier exists to be comparable with the modern engine on the same chart. The text's ayanāṃśa stays on the unfitted path.",
  "reference": "ERFA (IAU SOFA) via astropy: epv00 for the Sun, moon98 for the Moon, plan94 for the five tara-grahas, gst06a and obl06/nut06a for Earth orientation.",
  "span": "1800-2200",
  "generator": "source/test/fit-siddhanta.mjs",
  "checkedBy": "source/test/siddhanta-measured-verify.mjs",
  "fitSamples": 187,
  "holdoutSamples": 213,
  "iterations": 1200
 },
 "lahiri": [
  0.000307083556492,
  1.39688796382,
  23.857092356
 ],
 "baseEpochLon": {
  "Rāhu": 180,
  "candraUcca": 90
 },
 "params": {
  "epoch.Sūrya": -11.495656022938753,
  "bija.Sūrya": 28.316340046775004,
  "mandaOdd.Sūrya": 0.862936607436593,
  "mandaEven.Sūrya": 0.8804439098023978,
  "mandocca.Sūrya": 1.755074276346737,
  "epoch.Candra": -6.7980821427740175,
  "bija.Candra": 23.982437625563826,
  "epoch.candraUcca": 35.5872285432703,
  "bija.candraUcca": -97.49451467831776,
  "mandaOdd.Candra": 1.2355752904452355,
  "mandaEven.Candra": 1.232652528030754,
  "epoch.Maṅgala": -24.175960729163435,
  "bija.Maṅgala": 61.22466644131986,
  "mandaOdd.Maṅgala": 1.0448289321212183,
  "mandaEven.Maṅgala": 1.00926427336411,
  "sighraOdd.Maṅgala": 1.002089479680015,
  "sighraEven.Maṅgala": 1.021151139425689,
  "mandocca.Maṅgala": 19.689307706945222,
  "epoch.Budha": -32.14843828331287,
  "bija.Budha": 63.13564575839088,
  "mandaOdd.Budha": 1.376075011483989,
  "mandaEven.Budha": 1.162068551747379,
  "sighraOdd.Budha": 1.0170294969949158,
  "sighraEven.Budha": 1.0442672923651537,
  "mandocca.Budha": 1.7057313766244038,
  "epoch.Guru": 14.552691562260698,
  "bija.Guru": -45.010815449886174,
  "mandaOdd.Guru": 1.0794027852638806,
  "mandaEven.Guru": 1.0946517099697055,
  "sighraOdd.Guru": 1.0017751827277683,
  "sighraEven.Guru": 0.9588847135110883,
  "mandocca.Guru": 7.864371245029663,
  "epoch.Śukra": 23.109001646469558,
  "bija.Śukra": -72.87216548912119,
  "mandaOdd.Śukra": 0.822049367477661,
  "mandaEven.Śukra": 0.8911454532975249,
  "sighraOdd.Śukra": 0.9935234127408319,
  "sighraEven.Śukra": 1.0017207430640087,
  "mandocca.Śukra": -12.811351451017067,
  "epoch.Śani": -54.99789391040725,
  "bija.Śani": 143.69346659451747,
  "mandaOdd.Śani": 0.800343218673827,
  "mandaEven.Śani": 0.7957841580241336,
  "sighraOdd.Śani": 0.9794449445667087,
  "sighraEven.Śani": 0.9447417904450287,
  "mandocca.Śani": 8.457986163620314
 },
 "residuals": {
  "Sūrya": {
   "params": {
    "epoch.Sūrya": -11.495656022938753,
    "bija.Sūrya": 28.316340046775004,
    "mandaOdd.Sūrya": 0.862936607436593,
    "mandaEven.Sūrya": 0.8804439098023978,
    "mandocca.Sūrya": 1.755074276346737
   },
   "bare": {
    "rms": 39.474,
    "worst": 76.276
   },
   "fit": {
    "rms": 1.0579,
    "worst": 2.4938
   },
   "holdout": {
    "rms": 1.0406,
    "worst": 3.1182,
    "mean": 0.0325
   },
   "gain": 37.9
  },
  "Candra": {
   "params": {
    "epoch.Candra": -6.7980821427740175,
    "bija.Candra": 23.982437625563826,
    "epoch.candraUcca": 35.5872285432703,
    "bija.candraUcca": -97.49451467831776,
    "mandaOdd.Candra": 1.2355752904452355,
    "mandaEven.Candra": 1.232652528030754
   },
   "bare": {
    "rms": 220.635,
    "worst": 444.618
   },
   "fit": {
    "rms": 62.1609,
    "worst": 141.2825
   },
   "holdout": {
    "rms": 61.6158,
    "worst": 147.9572,
    "mean": -2.6672
   },
   "gain": 3.6
  },
  "Maṅgala": {
   "params": {
    "epoch.Maṅgala": -24.175960729163435,
    "bija.Maṅgala": 61.22466644131986,
    "mandaOdd.Maṅgala": 1.0448289321212183,
    "mandaEven.Maṅgala": 1.00926427336411,
    "sighraOdd.Maṅgala": 1.002089479680015,
    "sighraEven.Maṅgala": 1.021151139425689,
    "mandocca.Maṅgala": 19.689307706945222
   },
   "bare": {
    "rms": 206.809,
    "worst": 761.557
   },
   "fit": {
    "rms": 44.8537,
    "worst": 177.0009
   },
   "holdout": {
    "rms": 58.2675,
    "worst": 303.3648,
    "mean": 2.0942
   },
   "gain": 3.5
  },
  "Budha": {
   "params": {
    "epoch.Budha": -32.14843828331287,
    "bija.Budha": 63.13564575839088,
    "mandaOdd.Budha": 1.376075011483989,
    "mandaEven.Budha": 1.162068551747379,
    "sighraOdd.Budha": 1.0170294969949158,
    "sighraEven.Budha": 1.0442672923651537,
    "mandocca.Budha": 1.7057313766244038
   },
   "bare": {
    "rms": 152.778,
    "worst": 503.354
   },
   "fit": {
    "rms": 94.9029,
    "worst": 198.4928
   },
   "holdout": {
    "rms": 107.1138,
    "worst": 232.8319,
    "mean": 8.5345
   },
   "gain": 1.4
  },
  "Guru": {
   "params": {
    "epoch.Guru": 14.552691562260698,
    "bija.Guru": -45.010815449886174,
    "mandaOdd.Guru": 1.0794027852638806,
    "mandaEven.Guru": 1.0946517099697055,
    "sighraOdd.Guru": 1.0017751827277683,
    "sighraEven.Guru": 0.9588847135110883,
    "mandocca.Guru": 7.864371245029663
   },
   "bare": {
    "rms": 284.793,
    "worst": 493.115
   },
   "fit": {
    "rms": 6.0148,
    "worst": 17.4495
   },
   "holdout": {
    "rms": 5.9942,
    "worst": 16.1135,
    "mean": -0.0995
   },
   "gain": 47.5
  },
  "Śukra": {
   "params": {
    "epoch.Śukra": 23.109001646469558,
    "bija.Śukra": -72.87216548912119,
    "mandaOdd.Śukra": 0.822049367477661,
    "mandaEven.Śukra": 0.8911454532975249,
    "sighraOdd.Śukra": 0.9935234127408319,
    "sighraEven.Śukra": 1.0017207430640087,
    "mandocca.Śukra": -12.811351451017067
   },
   "bare": {
    "rms": 365.801,
    "worst": 1627.116
   },
   "fit": {
    "rms": 7.9557,
    "worst": 24.7641
   },
   "holdout": {
    "rms": 8.3882,
    "worst": 26.1288,
    "mean": 2.2868
   },
   "gain": 43.6
  },
  "Śani": {
   "params": {
    "epoch.Śani": -54.99789391040725,
    "bija.Śani": 143.69346659451747,
    "mandaOdd.Śani": 0.800343218673827,
    "mandaEven.Śani": 0.7957841580241336,
    "sighraOdd.Śani": 0.9794449445667087,
    "sighraEven.Śani": 0.9447417904450287,
    "mandocca.Śani": 8.457986163620314
   },
   "bare": {
    "rms": 381.677,
    "worst": 633.466
   },
   "fit": {
    "rms": 7.2841,
    "worst": 19.362
   },
   "holdout": {
    "rms": 7.2984,
    "worst": 22.9315,
    "mean": 1.8913
   },
   "gain": 52.3
  }
 },
 "lunarDiagnostic": {
  "rms": 61.87,
  "correlationWithEvection": 0.86,
  "correlationWithVariation": -0.452,
  "amplitudeArcmin": {
   "evection": 75.9,
   "variation": -39.7,
   "anomaly": 3.4
  },
  "textbookArcmin": {
   "evection": 76.4,
   "variation": 39.5
  },
  "rmsAfterRemovingThem": 13.95,
  "reading": "The Moon's residual after the fit IS the evection and the variation. Regressed on their arguments it yields amplitudes within one per cent of the textbook values, and removing just those two terms drops its rms from 61.9′ to 14.0′. Neither term exists in this theory, and neither can be produced by any choice of revolution count, paridhi or mandocca — so the Moon's limit here is the absence of terms, not the value of numbers. Supplying them would make this a different astronomy wearing the same parameters, which is the line this tier does not cross."
 }
};

/* ===== LearnHoro built-in chart engine (client-side) =====
   Positions: astronomy-engine (MIT). Ayanamsa: Lahiri quadratic fitted to Swiss Ephemeris.
   Produces the same JSON shape the report renderer consumes. */
(function(){
var SIGN=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
var LORD=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
var SK={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",Jupiter:"Guru",Venus:"Śukra",Saturn:"Śani",Rahu:"Rāhu",Ketu:"Ketu"};
var BH=["Tanu","Dhana","Sahaja","Bandhu","Putra","Ripu","Kalatra","Āyu","Bhāgya / Dharma","Karma","Lābha","Vyaya / Mokṣa"];
var VCODES=[["D1","राशि","Body"],["D2","होरा","Wealth"],["D3","द्रेक्काण","Siblings"],["D4","चतुर्थांश","Fortunes / Home"],
["D7","सप्तांश","Progeny"],["D9","नवांश","Spouse / Dharma"],["D10","दशांश","Profession"],["D12","द्वादशांश","Parents"],
["D16","षोडशांश","Vehicles / Comforts"],["D20","विंशांश","Spiritual practice"],["D24","चतुर्विंशांश","Learning"],
["D27","सप्तविंशांश","Strength"],["D30","त्रिंशांश","Evil / Misfortune"],["D40","खवेदांश","Maternal heritage"],
["D45","अक्षवेदांश","Paternal heritage"],["D60","षष्ट्यंश","Past karma"]];
var NAKL=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
var NAKN=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
var norm=function(x){return ((x%360)+360)%360;};
var D2R=Math.PI/180, R2D=180/Math.PI;

function jdFromUTC(y,m,d,ut){if(m<=2){y--;m+=12;}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+ut/24;}
function Tof(jd){return (jd-2451545.0)/36525.0;}

/* ===== THE CERTIFIED WINDOW ===============================================

   1800–2200 is where this engine is CHECKED, not where it stops working. The
   ayanāṃśa polynomials below were fitted over it; source/test/reference-verify
   .mjs holds the positions to an independent ERFA sky across it on 400
   stratified instants. Outside it the engine still answers — and must, because
   the Sūrya Siddhānta page exists precisely to look at 500 CE — but until this
   block existed it answered with exactly the same confidence and said nothing,
   which is the one thing the project's own standard forbids.

   WHAT ACTUALLY DEGRADES, measured rather than assumed. Two surprises:

   The ayanāṃśa is NOT the problem. Its linear and quadratic coefficients turn
   out to match IAU 2006's accumulated precession p_A to five figures
   (5028.7967 vs 5028.7962 ″/cy; 1.105501 vs 1.105435 ″/cy²), so what the
   polynomial omits is only p_A's cubic and higher — worth 0.31″ at 1000 CE,
   0.16″ at 3000 CE, and not 37″ until 1500 BCE. A fitted quadratic had no
   right to extrapolate twenty centuries that well; it does, and saying
   otherwise in a caution would have been a false alarm.

   THE MOON is the limit. Against the independent reference, worst-case
   longitude disagreement by band (source/test/fixtures/reference-ecliptic-
   wide.json, 300 samples 1000–3000, measured by span-verify.mjs):

       band         Moon   tithi end   nakṣatra end
       1000–1399    205″       452 s          416 s
       1400–1799     73″       162 s          148 s
       1800–2200     15″        34 s           31 s   ← the certified window
       2201–2599     56″       123 s          113 s
       2600–3000    164″       359 s          333 s

   The two time columns are what the longitude column is actually worth to a
   reader of this site, and they are MEASURED, not divided out of the Moon
   figure. A tithi, yoga or karaṇa boundary is a condition on the Moon's
   ELONGATION from the Sun, which closes at about 0.45″/s at its slowest, so
   the two errors combine through the elongation rather than through the Moon's
   own motion — estimating it from the Moon alone understated 1000–1399 by a
   fifth. A nakṣatra boundary is the Moon alone at about 0.49″/s.

   Each figure is the measured worst case rounded UP, because a band quoting
   less than it measured would be a false reassurance. span-verify.mjs
   remeasures every one of them and fails on either side: a figure below its
   measurement, or one more than twice it. That check has now caught three real
   slips — two bands quoted a tenth of an arcsecond low, and the certified
   window quoted 10″ because it had been remeasured from the 60 samples the
   WIDE fixture happens to place inside it, when the dense 400-sample fixture
   that actually certifies the window measures 14.8″. Each band is paired with
   the fixture that samples it best now, and the harness asserts the pairing.

   Either side may be responsible — ERFA's own lunar series degrades away from
   1900–2100 too — so this is a DISAGREEMENT and therefore an uncertainty, not
   an engine error. It is quoted as such. Beyond 1000–3000 nothing is quoted at
   all, because ERFA's planetary series is itself only documented over that
   range and a number invented past it would be worse than silence. */
var SPAN=[1800,2200];
var SPAN_BANDS=[
  {from:1000,to:1399,moon:205,instant:452,nak:416,ref:"wide"},
  {from:1400,to:1799,moon:73, instant:162,nak:148,ref:"wide"},
  {from:1800,to:2200,moon:15, instant:34, nak:31, ref:"dense"},
  {from:2201,to:2599,moon:56, instant:123,nak:113,ref:"wide"},
  {from:2600,to:3000,moon:164,instant:359,nak:333,ref:"wide"}
];
function yearOfJd(jd){ return 2000+(jd-2451545.0)/365.25; }
/* The chart's standing relative to the window: the year, whether it is inside,
   and for its band the measured Moon disagreement, the measured worst-case
   error on a tithi/yoga/karaṇa end-instant, the same for a nakṣatra boundary,
   and the Moon figure as a fraction of a D60 aṃśa (1800″). All null outside
   1000–3000, where nothing has been measured. */
function spanStatus(jd){
  var y=yearOfJd(jd), inside=(y>=SPAN[0]&&y<=SPAN[1]), band=null;
  for(var i=0;i<SPAN_BANDS.length;i++)
    if(y>=SPAN_BANDS[i].from&&y<=SPAN_BANDS[i].to){ band=SPAN_BANDS[i]; break; }
  var moon=band?band.moon:null;
  /* FLOOR, not round. A chart dated 21 July 500 CE is decimal year 500.55, and
     rounding it labelled the band "501 CE" — a date the reader never typed.
     Floor also gives the right astronomical-to-BCE conversion: year 0 is 1 BCE,
     so y < 1 maps to (1 − floor y) BCE. */
  var yi=Math.floor(y);
  return {year:y, yearLabel:(yi<1?(1-yi)+" BCE":yi+" CE"),
          inside:inside, span:SPAN.slice(), measured:!!band,
          moonArcsec:moon,
          /* measured, not divided out of the Moon figure — see the note above */
          tithiSeconds:band?band.instant:null,
          nakSeconds:band?band.nak:null,
          d60Fraction:moon==null?null:moon/1800};
}
/* Lahiri ayanamsa — quadratic fitted to Swiss Ephemeris (residual < 0.001") */
/* Ayanamsa. Each set of coefficients was fitted to Swiss Ephemeris over 1800-2200
   (quarterly samples) and the residual measured. Lahiri, Raman and Krishnamurti
   reproduce Swiss Ephemeris to 0.000"; true Chitrapaksha is a moving definition tied
   to Spica's actual position and carries about +/-20" of non-polynomial wobble, which
   is well under an arcminute and far below a nakshatra pada (3000"), but is not exact. */
/* A short tag per mode, for places with no room for the full name.
   The ruler on the Ayanāṃśa pane was taking the first word of the name, which
   is useless here: five of the sixteen begin "Sūrya" or "True", so the strip
   read Tru, Sūr, Ran, Tru, Sūr, Kris, Lah, Fag, Sūr — nine labels naming
   nothing. These are chosen to be distinct from one another at a glance, and
   they live beside the names so the two cannot drift apart. */
var AYAN_MODES={
  lahiri:     {name:"Lahiri (Chitrapakṣa)", s:"Lahiri", note:"the Indian civil standard; matches Swiss Ephemeris to 0.000″",
               c:[0.000307083556492,1.39688796382,23.857092356]},
  raman:      {name:"Raman", s:"Raman", note:"B. V. Raman's value; matches Swiss Ephemeris to 0.000″",
               c:[0.00030705015156,1.39688808364,22.4107910426]},
  kp:         {name:"Krishnamurti (KP)", s:"KP", note:"used in the KP system; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050151567,1.39688808364,23.7602400426]},
  truechitra: {name:"True Chitrapakṣa", s:"T. Citrā", note:"Spica fixed at 180° exactly; a moving definition, within ≈20″ of Swiss Ephemeris",
               c:[0.00030778556054,1.39569673536,23.8413914361]},
  yukteshwar: {name:"Yukteshwar", s:"Yukteśvar", note:"Śrī Yukteswar's value; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050196155334,1.39688808367904,22.4788030300512]},
  bhasin:     {name:"J. N. Bhasin", s:"Bhasin", note:"J. N. Bhasin's value; matches Swiss Ephemeris to 0.000″",
               c:[0.000307050196162532,1.39688808367904,22.7621370300512]},
  fagan:      {name:"Fagan–Bradley", s:"Fagan", note:"the Western sidereal standard, not a Jyotiṣa one; offered for comparison. " +
                    "Matches Swiss Ephemeris to 0.000″",
               c:[0.000307079912515056,1.39688797821407,24.7402999966933]},

  /* ---- two more moving-star definitions ------------------------------------
     Like True Chitrapakṣa these follow a real star rather than a fixed epoch,
     so they carry the same ≈20″ of non-polynomial wobble. A cubic and a quintic
     were both tried and neither helps: the residual is the star's own apparent
     motion, not a shortcoming of the polynomial. */
  truerevati: {name:"True Revatī", s:"T. Revatī", note:"ζ Piscium held at its stated longitude; a moving definition, within ≈20″ of Swiss Ephemeris",
               c:[0.000306512057764597,1.40008230121424,20.0441879052671]},
  truepushya: {name:"True Puṣya", s:"T. Puṣya", note:"δ Cancri held at its stated longitude; a moving definition, within ≈19″ of Swiss Ephemeris",
               c:[0.00030665680272264,1.39808717915315,22.7220173465237]},

  /* ---- the three Sūrya Siddhānta readings ----------------------------------
     "Sūrya Siddhānta ayanāṃśa" is not one number. The text does not describe
     precession at all: it describes the circle of asterisms LIBRATING — an
     oscillation of ±27° completing in 7200 years — so taken at its word the
     ayanāṃśa does not grow without limit, it swings back, and right now it
     sits near the top of its swing and is nearly stationary. Read instead as
     a rate, or anchored to a zero epoch and advanced by modern precession,
     it gives quite different answers. The three differ by about 5° today,
     which is roughly 1.5 nakṣatra pādas — a different chart, not a refinement.

     All three are offered and none is called the right one, which is the same
     stance ss-engine.js already takes on the Sūrya Siddhānta page. The first
     two use that page's own model, so a figure shown here and the same figure
     there come from one definition rather than two; the harness asserts it. */
  ss_text:    {name:"Sūrya Siddhānta — libration", s:"SS libration", unit:"text",
               note:"the text's own model: ±27° oscillating over 7200 years, zero at 499 CE. " +
                    "Near its maximum now and almost stationary — it advances ≈0.35° this century " +
                    "where every modern ayanāṃśa advances ≈1.03°. Not a Swiss Ephemeris quantity.",
               f:function(y){ return 27*Math.sin(2*Math.PI*(y-499)/7200); }},
  ss_rate:    {name:"Sūrya Siddhānta — steady 54″", s:"SS 54″", unit:"text",
               note:"the text's rate with the libration ignored: a constant 54″ a year from 499 CE. " +
                    "This is what is usually meant casually by “the Sūrya Siddhānta ayanāṃśa”, and it " +
                    "agrees with the libration reading only near the zero point. Not a Swiss Ephemeris quantity.",
               f:function(y){ return (y-499)*54/3600; }},
  ss_swiss:   {name:"Sūrya Siddhānta (Swiss Ephemeris)", s:"SS Swiss", note:"Swiss Ephemeris SE_SIDM_SURYASIDDHANTA: " +
                    "zero at 499 CE then advanced by modern precession, not by the text's libration. " +
                    "Quadratic fitted over 1800–2200; matches Swiss Ephemeris to 0.000″",
               c:[0.00030619214892391,1.39688356264496,20.8950588659651]},
  ss_revati:  {name:"Sūrya Siddhānta — Revatī (Swiss)", s:"SS Revatī", note:"Swiss Ephemeris SE_SIDM_SS_REVATI: Revatī at 359°50′, " +
                    "taken at a fixed epoch and then advanced by modern precession. Matches Swiss Ephemeris to 0.000″",
               c:[0.000306192149237889,1.39688356264479,20.1033884059649]},
  ss_citra:   {name:"Sūrya Siddhānta — Citrā (Swiss)", s:"SS Citrā", note:"Swiss Ephemeris SE_SIDM_SS_CITRA: the same scheme with " +
                    "Citrā at 180° instead. Matches Swiss Ephemeris to 0.000″",
               c:[0.000306192149240291,1.39688356264479,23.0057633059649]},
  aryabhata:  {name:"Āryabhaṭa", s:"Āryabhaṭa", note:"Swiss Ephemeris SE_SIDM_ARYABHATA. Measured against its Sūrya Siddhānta mode " +
                    "over 1700–2300 the two never differ by more than 0.003″ — for every practical purpose this is " +
                    "the same series under another name, and it is offered because it is published, not because it " +
                    "is a separate choice",
               c:[0.000306192149196146,1.39688356264424,20.8950597525217]},

  /* ---- this site's own ------------------------------------------------------
     Sidereal zero ten arcminutes east of Revatī (ζ Piscium), which is the
     dhruvaka the Sūrya Siddhānta itself gives for that star: 359°50′. The star
     is propagated to the date by its full space motion (HYG v4.1 — Hipparcos
     astrometry, which for stars this bright is better than Gaia's) and measured
     by POLAR longitude, the convention the siddhāntas record star positions in,
     in the ecliptic and mean equinox of date with no nutation.

     Derived independently here, and then found to agree with Swiss Ephemeris's
     own SS_REVATI to 1.7 arcminutes at 2026 — which is the corroboration, not
     the source. The two differ because that one freezes the star at an epoch
     where this one lets it move; over the 1527 years since 499 CE Revatī has
     drifted 3.8′, less than half the 10′ step the text rounds its own figure
     to, so the text's statement still holds at the precision the text states it.

     Quadratic fitted over 1700–2300, max residual 0.12″ against the derivation.

     NOT a BPHS quantity. BPHS prescribes no ayanāṃśa; it uses one without
     defining it. Lahiri remains the default and the value everything on this
     site is validated against. */
  /* ---- and the same method on the other anchor ----------------------------
     Citrā (Spica, α Virginis) at polar longitude 180°00′ — the anchor the
     Chitrapakṣa family is named for — derived by exactly the pipeline the
     Revatī reading above uses: HYG v4.1 astrometry, the star propagated to the
     date by its full space motion, measured by POLAR longitude in the ecliptic
     and mean equinox of date with no nutation.

     WHY BOTH. The two classical anchors are not consistent with each other.
     Citrā at 180° and Revatī at 359°50′ cannot both be true of the sky: as
     measured here they disagree by about 3.8°, which is a different chart
     rather than a refinement of one. Offering both, derived identically, is
     the only honest way to present that — the difference between these two
     entries is the textual disagreement itself, with the method held constant
     so that nothing else can be blamed for it.

     Derived independently and then found to agree with Swiss Ephemeris's own
     SS_CITRA to 0.9 arcminutes at 2026, which is the corroboration and not the
     source — the same relationship the Revatī reading has to SS_REVATI at 1.7′.

     It sits 49.2′ from True Chitrapakṣa, and that gap is not an error in
     either: True Chitrapakṣa anchors Citrā's ECLIPTIC longitude where this
     anchors its POLAR longitude, and for a star 2° off the ecliptic those two
     differ by exactly that much. The two definitions are answering different
     questions about the same star.

     Quadratic fitted over 1700–2300, max residual 0.023″ against the
     derivation. NOT a BPHS quantity. */
  nirayana_citra: {name:"Nirayana–Chitrapakṣa (this site)", s:"Nir. Citrā",
               note:"this site's own: sidereal zero at Citrā (Spica), the 180° anchor the Chitrapakṣa " +
                    "family is named for, with the star moved by its real space motion and measured by " +
                    "polar longitude. Independent of, and within 0.9′ of, Swiss Ephemeris's SS_CITRA; " +
                    "49.2′ from True Chitrapakṣa, which anchors the same star's ecliptic longitude instead",
               c:[0.00056693400497,1.40165348481417,23.019916795380]},
  nirayana_revati: {name:"Nirayana–Revatī (this site)", s:"Nir. Revatī",
               note:"this site's own: sidereal zero 10′ east of Revatī, from the Sūrya Siddhānta's own dhruvaka " +
                    "of 359°50′, with the star moved by its real space motion and measured by polar longitude. " +
                    "Independent of, and within 1.7′ of, Swiss Ephemeris's Sūrya Siddhānta–Revatī",
               c:[0.00027145885336,1.39822212898,20.132107536527]},
  /* ---- the two Samanvaya readings ------------------------------------------
     Supplied by this site's author from his own multi-constraint synthesis: an
     inverse-variance weighted least-squares centroid over the Sūrya Siddhānta's
     polar dhruvakās and the Pauliśa solar apogee, with the stars propagated by
     Gaia DR3 / Hipparcos space motion and IAU 2006 (P03) precession. That
     derivation is not reproduced on this site, so these two are carried as the
     author's own definitions and the figures describing them are attributed
     rather than asserted — which is why neither note quotes the thesis's RMS
     residual as though this project had measured it. (The thesis gives that
     residual twice and inconsistently: 0.887° over six stars, 0.64° over a set
     that drops Maghā, its single worst residual at −99′.)

     Three things were checked before these were added, and all three are
     asserted in ayanamsa-verify:

     1. BOTH POLYNOMIALS VANISH AT THEIR STATED EPOCH. At the given Julian Days
        they come out at +1.8″ (polar, JD 1868970.25) and +1.4″ (ecliptic, JD
        1903396.75) — zero to well inside the precision either can claim.

     2. THE PROSE AROUND THE POLAR EPOCH CONTRADICTS ITS OWN JULIAN DAY, so the
        note states the epoch the arithmetic actually uses. JD 1868970.25 is 17
        December 404 CE in the Julian calendar, i.e. decimal year 404.96 —
        which agrees with the stated "405.0 CE" and not with the stated
        "March 20" or "vernal equinox". 20 March 405 is JD 1869062.75, ninety-
        two days later, where this polynomial gives +14.4″ rather than zero. The
        decimal year, the JD and the coefficients agree with each other; only
        the month does not, so the month is left out. (The ecliptic epoch's
        words and JD do agree — JD 1903396.75 is 21 March 499 CE. The slip there
        is its separately quoted T₀ of −15.0061122519: the JD gives
        −15.0074811773, fifty days apart. Nothing reads T₀, so it is not
        carried here at all.)

     3. SAMANVAYA–ECLIPTIC IS THE ARYABHATA MODE ALREADY PRESENT. Measured
        against every other mode across 1000–3000 CE, its worst disagreement
        with `aryabhata` is 0.28 ARCSECONDS. That is not a loose near-agreement
        to wave at; it is the same convention reached from different premises,
        and at fifty times finer than this engine's own measured Moon it is not
        a distinguishable alternative. The note says so, because presenting it
        as an independent nineteenth answer without that sentence would make the
        ayanāṃśa page's own argument — that these are genuinely different
        readings — quietly false.

        Samanvaya–Polar is a real addition: nearest neighbour `raman`, 12.5′
        away, and the gap holds across the whole span.

     Neither widens the family's spread — both fall inside the existing
     endpoints (True Revatī 20.41°, SS libration 26.24°) — so the 5.83° figure
     quoted across the site is unaffected. NOT BPHS quantities: BPHS prescribes
     no ayanāṃśa. Lahiri remains the default and the value everything here is
     validated against. */
  /* The short labels are "Sam. Polar" and "Sam. Ecliptic" rather than the
     specification's "Samanvaya (Polar)" and "Samanvaya (Ecliptic)". The ruler
     caps a tag at fourteen characters and self-test asserts it; the requested
     labels are seventeen and twenty, and the suite caught both. The form used
     here follows the house style already set by "Nir. Citrā" and
     "Nir. Revatī" — the full names below are untouched and are what the
     picker, the legend and the comparison table show. */
  samanvaya_polar: {name:"Samanvaya–Polar (ध्रुवक-समन्वय)", s:"Sam. Polar",
               /* RELABELLED, deliberately, and the mode is kept rather than
                  retired so that a reader who has this stored still gets the
                  figures they chose. What changed is the claim: this was
                  presented as a synthesis and it is a five-dhruvakā SUBSET
                  minimum. See claude/samanvaya-ayanamsa-research.md §5–6. */
               note:"this site's own: the armillary-sphere polar reading, sidereal zero at 405.0 CE " +
                    "(JD 1868970.25). An inverse-variance least-squares centroid over FIVE of the Sūrya " +
                    "Siddhānta's polar dhruvakās — Aśvinī 8°, Rohiṇī 49°30′, Puṣya 106°, Citrā 180°, " +
                    "Uttarāṣāḍhā 260° — with the 76° Pauliśa solar apogee, propagated by Gaia DR3 space " +
                    "motion and IAU 2006 precession. 1°39′ west of Lahiri at 2026; nearest neighbour in " +
                    "this family is Raman, 12.5′ away. " +
                    "READ IT AS THAT SUBSET'S MINIMUM, NOT AS A SYNTHESIS. Combining the full 27-star " +
                    "dhruvakā ensemble with the solar apogee of three texts puts the measured sidereal " +
                    "zero at 493.6 ± 23 CE, which excludes this mode's 405.0 CE at 3.9σ — the very " +
                    "constraint set it was said to synthesise. The two textual epochs withheld from that " +
                    "fit, the Sūrya Siddhānta's 499.2 CE and Varāhamihira's 505.0 CE, land at 0.2σ and " +
                    "0.5σ of it. So this reading is a defensible convention over the stars it uses and " +
                    "is not the best-supported one on the available evidence; Samanvaya–Ecliptic is",
               c:[0.00030701309467,1.39688795339,22.202788470]},
  samanvaya_ecliptic: {name:"Samanvaya–Ecliptic (क्रान्तिवृत्त-समन्वय)", s:"Sam. Ecliptic",
               note:"this site's own: the orthogonal ecliptic reading, sidereal zero at Āryabhaṭa's Kaliyuga " +
                    "3600 elapsed — 21 March 499 CE, JD 1903396.75 — advanced by IAU 2006 precession. " +
                    "Reached from the equinoctial conjunction, the gnomon solstice records and the 78° solar " +
                    "apogee rather than from a star. It agrees with this site's Āryabhaṭa mode to 0.28″ " +
                    "across 1000–3000 CE, so read the two as one convention independently derived, not as a " +
                    "choice between them. " +
                    "IT IS ALSO THE BEST-SUPPORTED SIDEREAL ZERO ON THE MEASURABLE EVIDENCE. Combining the " +
                    "27-star dhruvakā ensemble with the solar apogee of three texts gives a measured zero " +
                    "of 493.6 ± 23 CE — a ±19.3′ band — and this mode's epoch sits 0.2σ from it. That is " +
                    "corroboration by independent derivation rather than a new epoch: the single-star " +
                    "anchors are definitions and not measurements, so they are excluded from that fit, and " +
                    "the textual epochs are withheld from it and scored afterwards",
               c:[0.00030701309468,1.39688795339,20.895012118]}
};
/* WHICH PAGES CHOOSE THEIR OWN AYANĀṂŚA, and what each starts on.
   "site" pages follow the ayanāṃśa in Settings; the two comparison pages start
   on Lahiri because that is the frame their engine-against-engine comparisons
   are drawn in. On every one of them the reader can pick another convention for
   that page alone (stored per page under nirayana.pageAyan; the picker lives in
   settings.js). Resolved here, from storage, because engine.js loads before
   site.js: the frame has to be right before the first position is computed,
   not corrected afterwards. Pages not listed keep their own controls (the
   Kundli form, the Ecliptic wheel's menu) and start on Lahiri as before. */
var PAGE_AYAN={"now.html":"site","calendar.html":"site","starwheel.html":"site","studio.html":"site",
  "studio-pro.html":"site","reel.html":"site","director-pro.html":"site","motion.html":"site",
  "siddhanta.html":"lahiri","engine-lab.html":"lahiri"};
function pageFile(){ try{ return (location.pathname.split("/").pop()||"index.html").toLowerCase(); }catch(e){ return ""; } }
function pageAyanRule(){ return PAGE_AYAN[pageFile()]||null; }
function pageAyan(){
  var pg=pageFile(), rule=PAGE_AYAN[pg];
  if(!rule) return null;
  try{
    var o=JSON.parse(localStorage.getItem("nirayana.pageAyan")||"{}")||{};
    if(o[pg]&&AYAN_MODES[o[pg]]) return o[pg];
  }catch(e){}
  if(rule!=="site") return rule;
  try{
    var st=JSON.parse(localStorage.getItem("nirayana.settings")||"{}")||{};
    if(st.ayan&&AYAN_MODES[st.ayan]) return st.ayan;
  }catch(e){}
  return "samanvaya_ecliptic";
}
/* ===== THE ENGINE: which planetary theory places the grahas ==============

   modern  the modern ephemeris (astronomy-engine), the default
   ss      the Sūrya Siddhānta as written — the text's own constants
   ssfit   the Sūrya Siddhānta's equations with constants fitted to the
           modern sky (bīja-style corrections; see ss-engine.js)

   A reader picks one in Settings; any page can override it for itself; a
   chart carries the engine it was cast with as part of its input, exactly as
   it carries its ayanāṃśa. The two pages whose subject IS the comparison of
   engines (the Sūrya Siddhānta page and Engine Lab) are locked to modern for
   their "modern" columns — they read the Siddhānta through their own copy.

   What the choice reaches: the longitude, speed and latitude of the seven
   grahas and the nodes, and so everything computed from them — signs,
   nakṣatras, vargas, daśās, strengths, the pañcāṅga's tithi, nakṣatra, yoga
   and karaṇa. What it does not: sunrise, the lagna's sidereal-time geometry,
   eclipse searches and the drawings of the physical solar system, which the
   Siddhānta engine does not model in a form this site can substitute; those
   stay modern whatever is chosen, and the Settings panel says so.

   THE FRAME (SS_FRAME). "own": the Siddhānta's longitudes are used as the text
   gives them, from its own zero; the lagna is converted with the text's own
   ayanāṃśa (ss_text) so lagna and grahas share one frame. For the fitted tier
   the own frame is Lahiri, the frame it was fitted in. "ayan": the text's
   positions are carried to tropical by its own ayanāṃśa and then read in
   whichever ayanāṃśa the reader has chosen. */
var SITE_SS=(typeof window!=="undefined"&&window.SSEngine)?window.SSEngine:null;
try{ if(SITE_SS&&window.__SS_FIT_DATA) SITE_SS.setMeasured(window.__SS_FIT_DATA); }catch(e){}
var ENGINE_MODES={modern:"Modern ephemeris",ss:"Sūrya Siddhānta — as written",ssfit:"Sūrya Siddhānta — fitted"};
var PAGE_ENGINE_LOCK={"siddhanta.html":1,"engine-lab.html":1};
function readStore(k){ try{ return JSON.parse(localStorage.getItem(k)||"{}")||{}; }catch(e){ return {}; } }
function pageEngine(){
  var pg=pageFile();
  if(PAGE_ENGINE_LOCK[pg]) return "modern";
  var o=readStore("nirayana.pageEngine"); if(o[pg]&&ENGINE_MODES[o[pg]]) return o[pg];
  var st=readStore("nirayana.settings"); return ENGINE_MODES[st.engine]?st.engine:"modern";
}
function siteSsFrame(){ var st=readStore("nirayana.settings"); return st.ssframe==="ayan"?"ayan":"own"; }
var ENGINE_MODE="modern", SS_FRAME="own", REQ_AYAN="lahiri";
function ssTextAyan(jd){
  if(!SITE_SS) return ayanamsaFor("lahiri",jd);
  try{ return SITE_SS.ayanamsa((jd-2440587.5)*86400000); }catch(e){ return ayanamsaFor("lahiri",jd); }
}
/* the ayanāṃśa actually in force: the requested convention, unless a Siddhānta
   engine is being read in its own frame */
function effectiveAyan(req){
  if(ENGINE_MODE!=="modern"&&SS_FRAME==="own") return ENGINE_MODE==="ss"?"ss_engine":"lahiri";
  return AYAN_MODES[req]?req:"lahiri";
}
function setEngineMode(m,frame){
  if(m==null) return ENGINE_MODE;
  ENGINE_MODE=(ENGINE_MODES[m]&&(m==="modern"||SITE_SS))?m:"modern";
  if(frame!=null) SS_FRAME=frame==="ayan"?"ayan":"own";
  /* bare() also forgets the fitted constants, so they are handed back after
     every switch — the same order Engine Lab's withTier() uses */
  if(SITE_SS){ try{
    var FD=window.__SS_FIT_DATA||null;
    SITE_SS.bare(); if(FD) SITE_SS.setMeasured(FD);
    if(ENGINE_MODE==="ssfit"){ if(!FD||!SITE_SS.measured()){ ENGINE_MODE="ss"; } }
  }catch(e){} }
  AYAN_MODE=effectiveAyan(REQ_AYAN);
  return ENGINE_MODE;
}
var AYAN_MODE="lahiri";
function setAyanamsaMode(m){ if(m!=null&&AYAN_MODES[m]) REQ_AYAN=m; AYAN_MODE=effectiveAyan(REQ_AYAN); return AYAN_MODE; }
setEngineMode(pageEngine(),siteSsFrame());
setAyanamsaMode(pageAyan()||"lahiri");
/* The calendar year, computed exactly as ss-engine.js's yearOf does, so the two
   engines cannot drift apart on the two text-based readings. A Julian-year
   approximation from T would be close but not identical, and "close" between
   two implementations of one definition is how they end up disagreeing. */
function ayanYearOf(jd){
  var d=new Date((jd-2440587.5)*86400000);
  return d.getUTCFullYear()+(d.getUTCMonth()+0.5)/12;
}
function ayanamsaFor(mode,jd){
  /* "ss_engine": the Sūrya Siddhānta's own ayanāṃśa (its libration of the
     asterisms), the zero a Siddhānta engine counts from when its positions
     are read in the text's own frame. Not one of the nineteen conventions and
     not offered in their pickers — it exists only for that engine. */
  if(mode==="ss_engine") return ssTextAyan(jd);
  var M=AYAN_MODES[mode]||AYAN_MODES.lahiri, v=0;
  if(M.f) return M.f(ayanYearOf(jd));
  var T=Tof(jd);
  for(var i=0;i<M.c.length;i++) v=v*T+M.c[i];
  return v;
}
function ayanamsa(jd){ return ayanamsaFor(AYAN_MODE,jd); }
/* True (osculating) node: the ascending node of the Moon's instantaneous orbital
   plane, taken in the ecliptic of date. Verified against Swiss Ephemeris TRUE_NODE
   to better than 0.3 arcminutes on the reference charts. */
function trueNodeAt(date){
  /* the Siddhānta gives the mean node only, so a Siddhānta engine answers
     with it whichever node was asked for */
  if(ENGINE_MODE!=="modern") return meanNode(date.getTime()/86400000+2440587.5);
  var dt=0.0005;
  function ec(t){ var e=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,t,false));
                  return e.vec?e.vec:e; }
  var e0=ec(new Date(date.getTime()-dt*86400000)), e1=ec(new Date(date.getTime()+dt*86400000));
  var v={x:e1.x-e0.x,y:e1.y-e0.y,z:e1.z-e0.z};
  var r={x:(e0.x+e1.x)/2,y:(e0.y+e1.y)/2,z:(e0.z+e1.z)/2};
  var h={x:r.y*v.z-r.z*v.y, y:r.z*v.x-r.x*v.z, z:r.x*v.y-r.y*v.x};
  return norm(Math.atan2(h.x,-h.y)*180/Math.PI);
}
/* mean lunar node (tropical) */
function meanNode(jd){
  if(ENGINE_MODE!=="modern"){
    var L=ssLonOf("Rāhu",(jd-2440587.5)*86400000);
    if(L!=null) return norm(L+ssNativeAyan(jd));
  }
  return meanNodeModern(jd);
}
function meanNodeModern(jd){var T=Tof(jd);
  return norm(125.0445479-1934.1362891*T+0.0020754*T*T+T*T*T/467441-T*T*T*T/60616000);}

var BODY={Sun:"Sun",Moon:"Moon",Mars:"Mars",Mercury:"Mercury",Jupiter:"Jupiter",Venus:"Venus",Saturn:"Saturn"};
function tropLonModern(name,date){
  var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[BODY[name]],date,true));
  return norm(ev.elon);
}
var SS_NAME={Sun:"Sūrya",Moon:"Candra",Mars:"Maṅgala",Mercury:"Budha",Jupiter:"Guru",Venus:"Śukra",Saturn:"Śani"};
/* the tropical frame a Siddhānta longitude is carried to: the text's own
   ayanāṃśa for the text as written, Lahiri for the fitted tier */
function ssNativeAyan(jd){ return ENGINE_MODE==="ss"?ssTextAyan(jd):ayanamsaFor("lahiri",jd); }
function ssLonOf(sa,ms){
  try{ var q=SITE_SS.trueLongitude(sa,SITE_SS.ahargana(ms)); return q?q.lon:null; }catch(e){ return null; }
}
function tropLon(name,date){
  if(ENGINE_MODE!=="modern"&&SS_NAME[name]){
    var L=ssLonOf(SS_NAME[name],date.getTime());
    if(L!=null) return norm(L+ssNativeAyan(date.getTime()/86400000+2440587.5));
  }
  return tropLonModern(name,date);
}
/* ecliptic latitude, from the same engine as the longitude */
function eclLat(name,date){
  if(ENGINE_MODE!=="modern"&&SS_NAME[name]){
    try{ var v=SITE_SS.latitudeOf(SS_NAME[name],SITE_SS.ahargana(date.getTime())); if(v!=null) return v; }catch(e){}
  }
  try{ return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[BODY[name]],date,true)).elat; }catch(e){ return null; }
}
function lonAndSpeed(name,date){
  var h=0.5/24, d0=new Date(date.getTime()-h*86400000), d1=new Date(date.getTime()+h*86400000);
  var a=tropLon(name,d0), b=tropLon(name,d1), c=tropLon(name,date);
  var diff=b-a; if(diff>180)diff-=360; if(diff<-180)diff+=360;
  return {lon:c, speed:diff/(2*h)};
}
/* Is the ecliptic point lam RISING — east of the meridian — at this sidereal
   angle and latitude? Needed because the closed form in ascendant() cannot
   tell the ascendant from the descendant everywhere. The point is carried to
   equatorial coordinates and its azimuth taken from north through east, so the
   eastern half of the sky is 0° < A < 180°. */
function isRisingPoint(lam,ramc,eps,phi){
  var x=Math.cos(lam), y=Math.sin(lam)*Math.cos(eps), z=Math.sin(lam)*Math.sin(eps);
  var ra=Math.atan2(y,x), dec=Math.asin(z), H=ramc-ra;
  var az=Math.atan2(-Math.cos(dec)*Math.sin(H),
                     Math.sin(dec)*Math.cos(phi)-Math.cos(dec)*Math.sin(phi)*Math.cos(H));
  az=((az*R2D)%360+360)%360;
  return az>0 && az<180;
}
function ascendant(jd,date,lat,lon,ay){
  var gast=Astronomy.SiderealTime(date);
  var lst=((gast+lon/15)%24+24)%24, ramc=lst*15*D2R;
  var T=Tof(jd), eps=(23.439291111-0.0130041667*T-1.638e-7*T*T)*D2R, phi=lat*D2R;
  var a=Math.atan2(Math.cos(ramc), -(Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)));
  /* The two intersections of the ecliptic with the horizon lie 180° apart, and
     the formula above picks the right one only while tan(phi) stays modest.
     Beyond the polar circles it does not: reference-verify.mjs, comparing
     against the horizon-plane intersection computed as vectors, found this
     returning the DESCENDANT for 41% of sampled instants at Tromsø (69.65°N) —
     every bhāva rotated by six, silently, for anyone born above the Arctic
     circle. The scan that bounded it found zero disagreement at or below 66°,
     4% at 67°, 21% at 70° and 38% at 80°, which is where the ecliptic can lie
     wholly above or below the horizon and the branch stops being decidable
     from the signs alone. So the branch is tested now rather than assumed.
     At or below 66° the flip never fires and the value is unchanged, which
     reference-verify.mjs asserts explicitly rather than leaving to a reading
     of this comment. */
  if(!isRisingPoint(a,ramc,eps,phi)) a+=Math.PI;
  return norm(norm(a*R2D)-ay);
}
function nak(deg){var seg=40/3,x=norm(deg),i=Math.min(Math.floor(x/seg),26);
  return {idx:i,name:NAKN[i],pada:Math.floor((x-i*seg)/(seg/4))+1,lord:NAKL[i%9]};}
function rashiObj(sid){var i=Math.floor(norm(sid)/30)%12;
  return {idx:i,saName:SA[i],saDev:SA[i],iast:SA[i],sa:SA[i],enName:SIGN[i],degInSign:norm(sid)-i*30};}
/* varga sign for a longitude — formulas verified against the reference engine (9/9 on all 16) */
function vargaSign(code,sid){
  var s=Math.floor(norm(sid)/30)%12,d=norm(sid)-s*30,odd=(s%2===0),M=s%3,p;
  switch(code){
    case "D1": return s;
    case "D2": var h=(d<15)?0:1; return odd?(h===0?4:3):(h===0?3:4);
    case "D3": return (s+[0,4,8][Math.floor(d/10)])%12;
    case "D4": return (s+[0,3,6,9][Math.floor(d/7.5)])%12;
    case "D7": p=Math.floor(d/(30/7)); return odd?(s+p)%12:(s+6+p)%12;
    case "D9": return Math.floor(norm(sid)/(30/9))%12;
    case "D10": p=Math.floor(d/3); return odd?(s+p)%12:(s+8+p)%12;
    case "D12": return (s+Math.floor(d/2.5))%12;
    case "D16": return ([0,4,8][M]+Math.floor(d/1.875))%12;
    case "D20": return ([0,8,4][M]+Math.floor(d/1.5))%12;
    case "D24": return ((odd?4:3)+Math.floor(d/1.25))%12;
    case "D27": return ([0,3,6,9][s%4]+Math.floor(d/(30/27)))%12;
    case "D30": if(odd){if(d<5)return 0;if(d<10)return 10;if(d<18)return 8;if(d<25)return 2;return 6;}
                if(d<5)return 1;if(d<12)return 5;if(d<20)return 11;if(d<25)return 9;return 7;
    case "D40": return ((odd?0:6)+Math.floor(d/0.75))%12;
    case "D45": return ([0,4,8][M]+Math.floor(d/(30/45)))%12;
    case "D60": return (s+Math.floor(d*2))%12;
  } return 0;
}
function baladi(sid){var s=Math.floor(norm(sid)/30)%12,d=norm(sid)-s*30,odd=(s%2===0);
  var k=Math.floor(d/6); if(!odd)k=4-k;
  return [["Bāla",50],["Kumāra",100],["Yuvā",100],["Vṛddha",50],["Mṛta",0]][Math.max(0,Math.min(4,k))];}
/* The ārūḍha is counted in RĀŚIS — that is intrinsic to the method and does
   not change. What the house system decides is only which rāśi the bhāva is,
   which is the starting point of the count. Under whole-sign that is
   (lagnaSign + house − 1) mod 12, the original expression, so passing nothing
   reproduces the old behaviour exactly. Under Śrīpati it is the rāśi holding
   the bhāva's madhya. Counting ārūḍhas from a quadrant bhāva is an EXTENSION,
   not classical Jaimini, and the report says so where it is shown. */
function arudhaOf(house,lagnaSign,posBySign,bhavaSign){
  var hs=(bhavaSign==null)?(lagnaSign+house-1)%12:bhavaSign, lord=LORD[hs], lp=posBySign[lord];
  if(lp==null)return hs;
  var dist=((lp-hs)%12+12)%12+1, a=(lp+dist-1)%12;
  if(a===hs) a=(hs+9)%12; else if(((a-hs)%12+12)%12===6) a=(hs+3)%12;
  return a;
}
var PAN_T=["Pratipada","Dvitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dvadashi","Trayodashi","Chaturdashi","Purnima"];
var PAN_Y=["Vishkambha","Preeti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
var KMOV=["Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"],KFIX=["Shakuni","Chatushpada","Naga","Kimstughna"];
var VARA=["Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"];
function panchang(sunSid,moonSid,jd){
  var diff=norm(moonSid-sunSid),ti=Math.floor(diff/12),n=Math.floor(diff/6);
  return {tithi_sa:(ti===29?"Amavasya":(ti===14?"Purnima":PAN_T[ti%15])),
    paksha_sa:(ti<15?"Shukla":"Krishna"),
    vara_sa:VARA[(Math.floor(jd+1.5)%7+7)%7],
    nakshatra_sa:nak(moonSid).name,
    yoga_sa:PAN_Y[Math.floor(norm(moonSid+sunSid)/(800/60))],
    karana_sa:(n===0?"Kimstughna":(n<=56?KMOV[(n-1)%7]:KFIX[n-57]))};
}
/* ===== Quantities the JSON was missing =====
   Each of these is classical chart material that the report already showed on
   screen but never wrote into the downloaded file, so a reader of the JSON alone
   could not reproduce the reading. They live here, in the engine, because the
   engine is what the JSON is built from — and they are exposed on window so the
   report draws them from one implementation rather than keeping a second copy
   that is free to drift. */

/* The lunar month, season and half-year. The month is named for the rāśi the Sun
   held at the new moon that opened it; we step the Sun back by the tithis already
   elapsed at its mean rate rather than searching for that new moon, which is good
   to well under a degree except within hours of a saṅkrānti. Pūrṇimānta names the
   same day for the month ENDING at the coming full moon, so through the dark
   fortnight it runs one ahead. */
var LMONTH=["Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwina","Kartika",
  "Margashirsha","Pausha","Magha","Phalguna","Chaitra"];
var RITU={Chaitra:"Vasanta",Vaishakha:"Vasanta",Jyeshtha:"Grishma",Ashadha:"Grishma",
  Shravana:"Varsha",Bhadrapada:"Varsha",Ashwina:"Sharad",Kartika:"Sharad",
  Margashirsha:"Hemanta",Pausha:"Hemanta",Magha:"Shishira",Phalguna:"Shishira"};
/* THE MONTH IS NAMED FROM WHERE THE SUN WAS AT THE NEW MOON, and the fourth
   argument is how to say that exactly.

   Without it this back-projects: take the tithis elapsed since the new moon,
   multiply by the Sun's MEAN motion and a MEAN tithi length, and subtract.
   Both means are wrong by a little, and the error grows across the month — so
   when the Sun stood within about half a degree of a rasi boundary at the new
   moon, floor(sunAtNM/30) came out one way on some days of that month and the
   other way on others. The month then changed its NAME in the middle of
   itself: April 2029 ran Chaitra, Vaishakha, Chaitra, Vaishakha on successive
   stretches of one lunation, and the festivals whose rule names a month fell
   through the gap. Rama Navami went missing in 2029 and 2048.

   Callers that know the real conjunction pass the Sun's true sidereal
   longitude there, which is constant for every day of the month by
   construction. The approximation stays for callers that have only the two
   longitudes. */
function masaOf(sunSid,moonSid,ayan,sunAtNewMoon){
  var elapsed=norm(moonSid-sunSid)/12;
  var sunAtNM=(sunAtNewMoon!=null&&isFinite(sunAtNewMoon))
    ? norm(sunAtNewMoon)
    : norm(sunSid-elapsed*0.9856*(29.53/30));
  var amanta=LMONTH[Math.floor(sunAtNM/30)%12];
  var krishna=(norm(moonSid-sunSid)/12)>=15;
  var trop=norm(sunSid+(ayan||0));
  return {amanta:amanta,
    purnimanta:(krishna?LMONTH[(Math.floor(sunAtNM/30)+1)%12]:amanta),
    ritu:RITU[amanta]||"",
    ayana:(trop>=90&&trop<270)?"Dakshinayana":"Uttarayana"};
}

/* Combustion. A graha within its own orb of the Sun is astaṅgata — lost in the
   glare — and classically treated as weakened however well it is otherwise
   placed. The orbs are the common Parāśarī set; Rāhu and Ketu, having no disc to
   be swallowed, are not reckoned combust at all. */
var COMB={Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:16};
function combustionOf(name,sid,sunSid){
  var orb=COMB[name]; if(orb==null) return null;
  var sep=Math.abs(norm(sid-sunSid)); if(sep>180) sep=360-sep;
  return {separation_deg:sep, orb_deg:orb, combust:sep<=orb};
}

/* Graha yuddha — planetary war. Two of the five tārā grahas within a degree of
   each other are at war. BPHS does not settle who wins in the verses this engine
   can point to, and the later authorities differ — some give it to the northerly
   graha, some to the brighter — so the fact and the figures needed to judge it
   are reported, and the verdict is left to the reader. */
function yuddhaOf(pos){
  var tara=["Mars","Mercury","Jupiter","Venus","Saturn"], out=[];
  for(var i=0;i<tara.length;i++) for(var j=i+1;j<tara.length;j++){
    var a=pos[tara[i]], b=pos[tara[j]]; if(!a||!b) continue;
    var sep=Math.abs(norm(a.sid-b.sid)); if(sep>180) sep=360-sep;
    if(sep>1) continue;
    out.push({grahas:[SK[tara[i]],SK[tara[j]]], separation_deg:sep,
      latitude_deg:[a.lat==null?null:a.lat, b.lat==null?null:b.lat],
      northerly:(a.lat!=null&&b.lat!=null)?SK[(a.lat>b.lat)?tara[i]:tara[j]]:null,
      note:"within one degree, so in yuddha; authorities differ on which graha prevails"});
  }
  return out;
}

/* How long each rāśi takes to rise at a given latitude — the oblique ascension.
   BPHS asks for exactly this in its first chapter: the ascendant is to be found
   "with the help of Rāśi durations applicable to the respective places". A sign
   spans a certain arc of right ascension, and its declination buys or costs it
   the ascensional difference; what is left is the time it occupies the eastern
   horizon. At the latitudes most charts are cast for the spread is wide — about
   an hour and a half for the quickest rāśi against nearly two and a half for the
   slowest — which is why a chart's lagna is far more sensitive to birth time in
   some signs than in others. */
function risingTimes(latDeg,ayan){
  var eps=23.4392911*D2R, se=Math.sin(eps), ce=Math.cos(eps), phi=latDeg*D2R;
  function oa(lonSid){
    var lt=(lonSid+(ayan||0))*D2R;
    var ra=Math.atan2(ce*Math.sin(lt),Math.cos(lt))*R2D; if(ra<0) ra+=360;
    var dec=Math.asin(se*Math.sin(lt));
    var x=Math.tan(phi)*Math.tan(dec);
    if(x>=1||x<=-1) return null;                  /* the rāśi never rises here */
    return ra-Math.asin(x)*R2D;
  }
  var out=[];
  for(var s=0;s<12;s++){
    var a=oa(s*30), b=oa(s*30+30);
    var nm=rashiObj(s*30+0.001).saName;
    if(a==null||b==null){
      out.push({rashi_idx:s, rashi:nm, oblique_ascension_deg:null, rising_minutes:null,
                note:"never rises at this latitude"});
      continue; }
    var d=b-a; while(d<0) d+=360; while(d>=360) d-=360;
    out.push({rashi_idx:s, rashi:nm, oblique_ascension_deg:d,
      rising_minutes:d*1440/360.9856, share_of_day_percent:d/360*100});
  }
  return out;
}
try{ window.__masaOf=masaOf; window.__COMB=COMB; window.__risingTimes=risingTimes; }catch(e){}

var ASPECTS=[[0,"conjunction"],[60,"sextile"],[90,"square"],[120,"trine"],[180,"opposition"]];
function relations(tr,natal){
  var out=[];
  Object.keys(tr).forEach(function(t){
    Object.keys(natal).forEach(function(n){
      var sep=Math.abs(((tr[t].sid-natal[n].sid+180)%360+360)%360-180);
      ASPECTS.forEach(function(a){
        var orb=Math.abs(sep-a[0]);
        if(orb<=9){
          var sig=orb<1?"exact":(orb<5?"applying":"loose");
          out.push({transit_graha:SK[t],natal_graha:SK[n],aspect:a[1],orb_deg:orb,significance:sig});
        }});});});
  return out.sort(function(a,b){return a.orb_deg-b.orb_deg;});
}


var AVT={
 Sun:{Sun:[1,2,4,7,8,9,10,11],Moon:[3,6,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[3,5,6,9,10,11,12],
      Jupiter:[5,6,9,11],Venus:[6,7,12],Saturn:[1,2,4,7,8,9,10,11],Lagna:[3,4,6,10,11,12]},
 Moon:{Sun:[3,6,7,8,10,11],Moon:[1,3,6,7,10,11],Mars:[2,3,5,6,9,10,11],Mercury:[1,3,4,5,7,8,10,11],
      Jupiter:[1,4,7,8,10,11,12],Venus:[3,4,5,7,9,10,11],Saturn:[3,5,6,11],Lagna:[3,6,10,11]},
 Mars:{Sun:[3,5,6,10,11],Moon:[3,6,11],Mars:[1,2,4,7,8,10,11],Mercury:[3,5,6,11],
      Jupiter:[6,10,11,12],Venus:[6,8,11,12],Saturn:[1,4,7,8,9,10,11],Lagna:[1,3,6,10,11]},
 Mercury:{Sun:[5,6,9,11,12],Moon:[2,4,6,8,10,11],Mars:[1,2,4,7,8,9,10,11],Mercury:[1,3,5,6,9,10,11,12],
      Jupiter:[6,8,11,12],Venus:[1,2,3,4,5,8,9,11],Saturn:[1,2,4,7,8,9,10,11],Lagna:[1,2,4,6,8,10,11]},
 Jupiter:{Sun:[1,2,3,4,7,8,9,10,11],Moon:[2,5,7,9,11],Mars:[1,2,4,7,8,10,11],Mercury:[1,2,4,5,6,9,10,11],
      Jupiter:[1,2,3,4,7,8,10,11],Venus:[2,5,6,9,10,11],Saturn:[3,5,6,12],Lagna:[1,2,4,5,6,7,9,10,11]},
 Venus:{Sun:[8,11,12],Moon:[1,2,3,4,5,8,9,11,12],Mars:[3,5,6,9,11,12],Mercury:[3,5,6,9,11],
      Jupiter:[5,8,9,10,11],Venus:[1,2,3,4,5,8,9,10,11],Saturn:[3,4,5,8,9,10,11],Lagna:[1,2,3,4,5,8,9,11]},
 Saturn:{Sun:[1,2,4,7,8,10,11],Moon:[3,6,11],Mars:[3,5,6,10,11,12],Mercury:[6,8,9,10,11,12],
      Jupiter:[5,6,11,12],Venus:[6,11,12],Saturn:[3,5,6,11],Lagna:[1,3,4,6,10,11]}
};
var AVORDER=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
/* The eight contributors, in the order the kakṣyā division uses — Saturn
   first and the Lagna last. The bhinnāṣṭakavarga sums their rows; the
   prastāra is the same computation with the sum not yet taken, and the
   kakṣyā scanner needs the rows rather than the sum, which is why they are
   kept rather than discarded. */
var AVCONTRIB=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon","Lagna"];
function ashtakavarga(signOf,lagnaSign){
  var bhinna=[],sarva=new Array(12).fill(0),prastara={};
  AVORDER.forEach(function(pl){
    var b=new Array(12).fill(0), rows={};
    AVCONTRIB.forEach(function(c){
      var list=AVT[pl][c]; if(!list) return;
      var from=(c==="Lagna")?lagnaSign:signOf[c];
      var r=new Array(12).fill(0);
      list.forEach(function(h){ r[(from+h-1)%12]=1; });
      rows[c]=r;
      for(var i=0;i<12;i++) b[i]+=r[i];
    });
    prastara[pl]=rows;
    var tot=b.reduce(function(a,x){return a+x;},0);
    bhinna.push({graha:pl,graha_sa:pl,total:tot,bindus:b});
    for(var i=0;i<12;i++) sarva[i]+=b[i];
  });
  return {bhinna:bhinna,sarva:sarva,prastara:prastara,kakshya_order:AVCONTRIB.slice(),
          sarva_total:sarva.reduce(function(a,x){return a+x;},0),
          natal_rashi_idx:(function(){var o={};AVORDER.forEach(function(p){o[p]=signOf[p];});o.Lagna=lagnaSign;return o;})()};
}

/* ---- yogas ---- */
function yogaList(ctx){
  var H=ctx.house, S=ctx.signOf, dig=ctx.dig, LS=ctx.LS, LORD=ctx.LORD, owns=ctx.owns, SKn=ctx.SK;
  var Y=[], kendra=[1,4,7,10], trikona=[1,5,9];
  function add(k,iast,en,cat,present,detail,strength,source){
    Y.push({key:k,iast:iast,en:en,category:cat,present:present,detail:detail,strength:strength,
            source:source||"BPHS"});}
  // Pancha Mahapurusha
  [["Rucaka","Mars"],["Bhadra","Mercury"],["Haṁsa","Jupiter"],["Mālavya","Venus"],["Śaśa","Saturn"]]
  .forEach(function(x){
    var nm=x[0],p=x[1],h=H[p],d=dig[p],ok=(d==="exalted"||d==="own"||d==="moolatrikona")&&kendra.indexOf(h)>=0;
    add(nm,nm,nm+" Yoga — "+p+" in own sign or exaltation in a kendra","Pañca-Mahāpuruṣa",ok,
      p+" at house "+h+(d==="exalted"||d==="own"||d==="moolatrikona"?" ("+d+")":" (neither own nor exalt)")+
      (kendra.indexOf(h)>=0?"":" — not in kendra"), ok?"medium":undefined);
  });
  // aspects (graha drishti) for conjunction/aspect tests
  var ASP={Sun:[6],Moon:[6],Mercury:[6],Venus:[6],Mars:[3,6,7],Jupiter:[4,6,8],Saturn:[2,6,9],Rahu:[6],Ketu:[6]};
  function related(a,b){ if(H[a]===H[b])return true;
    var off=ASP[a]||[6]; for(var i=0;i<off.length;i++) if(((H[a]-1+off[i])%12)+1===H[b]) return true;
    off=ASP[b]||[6]; for(var j=0;j<off.length;j++) if(((H[b]-1+off[j])%12)+1===H[a]) return true;
    return false; }
  function lordOf(h){ return LORD[(LS+h-1)%12]; }
  // Raja: kendra lord related to trikona lord
  var rj=[];
  kendra.forEach(function(k){ trikona.forEach(function(t){
    var a=lordOf(k),b=lordOf(t); if(a!==b&&related(a,b)){var s=a+" ↔ "+b; if(rj.indexOf(s)<0&&rj.indexOf(b+" ↔ "+a)<0)rj.push(s);} });});
  add("Raja","Rāja-yoga","Rāja-yoga — kendra-lord conjunct or aspecting trikona-lord","Rāja",rj.length>0,
      rj.length?"Active combinations: "+rj.join(", "):"No kendra-lord related to a trikona-lord", rj.length>1?"strong":"medium");
  // Dhana: lords of 2/5/9/11 related
  var dh=[],DH=[2,5,9,11];
  for(var i=0;i<DH.length;i++)for(var j=i+1;j<DH.length;j++){
    var a=lordOf(DH[i]),b=lordOf(DH[j]); if(a!==b&&related(a,b)) dh.push(a+"("+DH[i]+") ↔ "+b+"("+DH[j]+")"); }
  add("Dhana","Dhana-yoga","Dhana-yoga — lord of 2/5/9/11 conjunct or aspecting another","Dhana",dh.length>0,
      dh.length?"Active combinations: "+dh.join(", "):"No relation among the wealth-house lords", dh.length>1?"strong":"medium");
  // Gajakesari
  var gk=((H.Jupiter-H.Moon+12)%12+1); var gkk=[1,4,7,10].indexOf(gk)>=0;
  add("Gajakesari","Gaja-kesarī","Gaja-kesarī Yoga — Jupiter in mutual kendra with Moon","Special",gkk,
      "Jupiter is "+gk+" from Moon"+(gkk?" (kendra)":" (not kendra)"), gkk?"strong":undefined);
  // Vipareeta raja: lord of 6/8/12 in another 6/8/12
  var vp=[]; [6,8,12].forEach(function(d){ var l=lordOf(d); if([6,8,12].indexOf(H[l])>=0&&H[l]!==d) vp.push(l+" (lord "+d+") in "+H[l]); });
  add("ViparitaRaja","Viparīta-rāja","Viparīta-rāja Yoga — lord of 6/8/12 placed in another 6/8/12","Special",
      vp.length>0, vp.length?"Active: "+vp.join(", "):"No 6/8/12 lord placed in another 6/8/12", vp.length?"medium":undefined);
  // Nichabhanga: debilitated graha whose dispositor is in kendra/trikona
  var nb=[]; Object.keys(dig).forEach(function(p){ if(dig[p]==="debilitated"){
    var disp=LORD[S[p]]; if(kendra.concat(trikona).indexOf(H[disp])>=0) nb.push(p+" (debil) — dispositor "+disp+" at house "+H[disp]); }});
  var anyDeb=Object.keys(dig).some(function(p){return dig[p]==="debilitated";});
  add("NichabhangaRaja","Nīca-bhaṅga-rāja","Nīca-bhaṅga-rāja Yoga — debilitation cancelled by dispositor in kendra/trikona","Special",
      nb.length>0, nb.length?"Cancelled: "+nb.join(", "):(anyDeb?"A debilitated graha is present but its dispositor is not in a kendra or trikona":"No graha is debilitated in this chart"),
      nb.length?"medium":undefined);
  // Parijata: lagna lord in 9th or 10th
  var ll=lordOf(1), pj=(H[ll]===9||H[ll]===10);
  add("Parijata","Pārijāta-yoga","Pārijāta Yoga — lord of lagna in the 9th or 10th","Special",pj,
      "Lagneśa "+ll+" at house "+H[ll]+(pj?"":" (not 9 or 10)"), pj?"medium":undefined);
  // Lakshmi: Venus in 1st, or Venus + 9th lord together in a kendra
  var n9=lordOf(9), lk=(H.Venus===1)||(H.Venus===H[n9]&&kendra.indexOf(H.Venus)>=0);
  add("Lakshmi","Lakṣmī-yoga","Lakṣmī Yoga — Venus in the 1st, or Venus with the 9th lord in a kendra","Special",lk,
      lk?(H.Venus===1?"Venus placed in 1st house":"Venus + 9th-lord ("+n9+") conjunct in kendra (house "+H.Venus+")")
        :("Venus at house "+H.Venus+"; 9th-lord "+n9+" not co-located in a kendra"), lk?"strong":undefined);
  // Sarasvati: Mercury, Jupiter, Venus all in 1/4/5/7/10
  var good=[1,4,5,7,10], sv=[H.Mercury,H.Jupiter,H.Venus].every(function(h){return good.indexOf(h)>=0;});
  add("Sarasvati","Sarasvatī-yoga","Sarasvatī Yoga — Mercury, Jupiter and Venus all in 1/4/5/7/10","Special",sv,
      "Mercury at "+H.Mercury+", Jupiter at "+H.Jupiter+", Venus at "+H.Venus+(sv?"":" (not all in 1/4/5/7/10)"), sv?"strong":undefined);
  // Harihara-brahma (rare composite)
  var hb=(H.Saturn===6&&H.Mars===7&&H.Jupiter===8);
  add("HariharaBrahma","Harihara-brahma","Harihara-brahma Yoga — Saturn in 6, Mars in 7, Jupiter in 8","Special",hb,
      "Saturn at "+H.Saturn+", Mars at "+H.Mars+", Jupiter at "+H.Jupiter+(hb?"":" (not the 6-7-8 configuration)"), hb?"medium":undefined);
  /* ---- lunar yogas, BPHS Ch. 37 ---- */
  var OTHERS=["Mars","Mercury","Jupiter","Venus","Saturn"];   // "a planet other than the Sun"
  var BEN=["Jupiter","Venus","Mercury","Moon"];
  function fromMoon(p){ return ((H[p]-H.Moon+12)%12)+1; }
  var in2=OTHERS.filter(function(p){return fromMoon(p)===2;});
  var in12=OTHERS.filter(function(p){return fromMoon(p)===12;});
  var withMoon=OTHERS.filter(function(p){return fromMoon(p)===1;});
  var inKendraFromLagna=OTHERS.filter(function(p){return kendra.indexOf(H[p])>=0;});

  add("Sunapha","Sunaphā","Sunaphā Yoga — a graha other than the Sun in the 2nd from the Moon",
      "Lunar", in2.length>0,
      in2.length?in2.join(", ")+" in the 2nd from the Moon":"nothing in the 2nd from the Moon",
      in2.length?"medium":undefined,"BPHS Ch. 37, vv. 7–10");
  add("Anapha","Anaphā","Anaphā Yoga — a graha other than the Sun in the 12th from the Moon",
      "Lunar", in12.length>0,
      in12.length?in12.join(", ")+" in the 12th from the Moon":"nothing in the 12th from the Moon",
      in12.length?"medium":undefined,"BPHS Ch. 37, vv. 7–10");
  add("Durdhara","Durādharā","Durādharā Yoga — grahas other than the Sun in both the 2nd and the 12th from the Moon",
      "Lunar", in2.length>0&&in12.length>0,
      (in2.length&&in12.length)?in2.join(", ")+" in the 2nd and "+in12.join(", ")+" in the 12th"
        :"both sides are not occupied", (in2.length&&in12.length)?"strong":undefined,"BPHS Ch. 37, vv. 7–10");

  /* Kemadruma, in full: excluding the Sun, no graha with the Moon, none in the 2nd or
     12th from it, AND none in a kendra from the ascendant (Ch. 37, vv. 11–13). */
  var kem=(in2.length===0&&in12.length===0&&withMoon.length===0&&inKendraFromLagna.length===0);
  var kemWhy=[];
  if(withMoon.length) kemWhy.push(withMoon.join(", ")+" stands with the Moon");
  if(in2.length) kemWhy.push(in2.join(", ")+" in the 2nd from it");
  if(in12.length) kemWhy.push(in12.join(", ")+" in the 12th from it");
  if(inKendraFromLagna.length) kemWhy.push(inKendraFromLagna.join(", ")+" in a kendra from the lagna");
  add("Kemadruma","Kemadruma",
      "Kemadruma Yoga — the Moon wholly unattended: nothing with it, nothing in the 2nd or 12th from it, and nothing in a kendra from the lagna",
      "Subtractive", kem,
      kem?"Active — the Moon stands entirely alone":"Cancelled — "+kemWhy.join("; "),
      kem?"medium":undefined,"BPHS Ch. 37, vv. 11–13");

  var adhi=[6,7,8].map(function(r){
    return BEN.filter(function(b){ return b!=="Moon" && ((H[b]-H.Moon+12)%12)+1===r; }); });
  var adhiAll=adhi[0].length&&adhi[1].length&&adhi[2].length;
  add("Adhi","Adhi","Adhi Yoga — benefics occupying the 6th, 7th and 8th from the Moon","Lunar",!!adhiAll,
      adhiAll?"6th: "+adhi[0].join(",")+" · 7th: "+adhi[1].join(",")+" · 8th: "+adhi[2].join(",")
        :"benefics do not fill all three of the 6th, 7th and 8th from the Moon",
      adhiAll?"strong":undefined,"BPHS Ch. 37, v. 5");

  /* ---- solar yogas, BPHS Ch. 38 ---- */
  var SOL=["Mars","Mercury","Jupiter","Venus","Saturn"];      // "barring the Moon"
  function fromSun(p){ return ((H[p]-H.Sun+12)%12)+1; }
  var s2=SOL.filter(function(p){return fromSun(p)===2;});
  var s12=SOL.filter(function(p){return fromSun(p)===12;});
  add("Veshi","Veśi","Veśi Yoga — a graha other than the Moon in the 2nd from the Sun","Solar",s2.length>0,
      s2.length?s2.join(", ")+" in the 2nd from the Sun":"nothing in the 2nd from the Sun",
      s2.length?"medium":undefined,"BPHS Ch. 38, v. 1");
  add("Vasi","Vāsi","Vāsi Yoga — a graha other than the Moon in the 12th from the Sun","Solar",s12.length>0,
      s12.length?s12.join(", ")+" in the 12th from the Sun":"nothing in the 12th from the Sun",
      s12.length?"medium":undefined,"BPHS Ch. 38, v. 1");
  add("Obhayachari","Ubhayacārī","Ubhayacārī Yoga — grahas other than the Moon on both sides of the Sun",
      "Solar", s2.length>0&&s12.length>0,
      (s2.length&&s12.length)?s2.join(", ")+" in the 2nd and "+s12.join(", ")+" in the 12th"
        :"the Sun is not flanked on both sides", (s2.length&&s12.length)?"strong":undefined,"BPHS Ch. 38, v. 1");

  /* ---- further yogas of BPHS Ch. 36 ---- */
  var MAL=["Sun","Mars","Saturn","Rahu","Ketu"];
  function occupantsOfHouse(h){ return Object.keys(H).filter(function(p){return H[p]===h;}); }
  var tenthL=occupantsOfHouse(10), tenthM=Object.keys(H).filter(function(p){
    return ((H[p]-H.Moon+12)%12)+1===10; });
  function amalaSide(list){ return list.length>0 && list.every(function(p){return BEN.indexOf(p)>=0;}); }
  var amala=amalaSide(tenthL)||amalaSide(tenthM);
  add("Amala","Amala","Amala Yoga — only a benefic in the 10th from the lagna or from the Moon","Special",amala,
      amala?("10th from "+(amalaSide(tenthL)?"lagna: "+tenthL.join(", "):"Moon: "+tenthM.join(", ")))
        :"the 10th from lagna ("+(tenthL.join(", ")||"empty")+") and from the Moon ("+(tenthM.join(", ")||"empty")+") is not purely benefic",
      amala?"medium":undefined,"BPHS Ch. 36, vv. 5–6");

  var benKendra=BEN.filter(function(b){return kendra.indexOf(H[b])>=0;});
  var occ7=occupantsOfHouse(7), occ8=occupantsOfHouse(8);
  var clean78=occ7.concat(occ8).every(function(p){return BEN.indexOf(p)>=0;});
  var parvata=benKendra.length>0&&clean78;
  add("Parvata","Parvata","Parvata Yoga — benefics in kendras while the 7th and 8th are empty or hold only benefics",
      "Special",parvata,
      parvata?"benefics in kendras: "+benKendra.join(", ")+"; 7th/8th clear"
        :(benKendra.length?"7th/8th hold "+occ7.concat(occ8).join(", "):"no benefic occupies a kendra"),
      parvata?"medium":undefined,"BPHS Ch. 36, vv. 7–8");

  var l4=LORD[(LS+3)%12], l10=LORD[(LS+9)%12], lagL=LORD[LS];
  var kahalaA=(Math.abs(((H[l4]-H.Jupiter+12)%12))%3===0)&&kendra.indexOf(((H[l4]-H.Jupiter+12)%12)+1)>=0;
  var mutualK=(function(){ var r=((H[l4]-H.Jupiter+12)%12)+1; return r===1||r===4||r===7||r===10; })();
  var lagStrong=["exalted","own","moolatrikona"].indexOf(dig[lagL])>=0;
  var kahalaB=(["own","exalted","moolatrikona"].indexOf(dig[l4])>=0)&&(H[l4]===H[l10]);
  var kahala=(mutualK&&lagStrong)||kahalaB;
  add("Kahala","Kahala",
      "Kahala Yoga — the 4th lord and Jupiter in mutual kendras with a strong lagna lord, or the 4th lord in own/exaltation conjunct the 10th lord",
      "Special",kahala,
      kahala?(kahalaB?"4th lord "+l4+" ("+dig[l4]+") conjunct the 10th lord "+l10
        :"4th lord "+l4+" and Jupiter in mutual kendras, lagna lord "+lagL+" "+dig[lagL])
        :"4th lord "+l4+" and Jupiter not in mutual kendras; lagna lord "+lagL+" is "+dig[lagL],
      kahala?"medium":undefined,"BPHS Ch. 36, vv. 9–10");

  /* ---- combinations in common use that the uploaded BPHS text does not define
     under these names. Implemented with the most widely cited rule, and labelled
     so nobody mistakes them for Parāśara's own. ---- */
  /* ================= Nābhasa yogas, BPHS Ch. 35 =================
     The sage counts 32: 3 Āśraya, 2 Dala, 20 Ākṛti and 7 Saṅkhya. All are patterns
     in how the seven grahas distribute — the nodes are excluded, the text saying
     "all the 7 planets". The Saṅkhya seven are counted by how many signs are
     occupied, and v. 17 states none of them operates if another Nābhasa yoga is
     already derivable, which is applied below. */
  var NB=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var nbSigns=NB.map(function(p){return S[p];});
  var nbHouses=NB.map(function(p){return H[p];});
  function nbAllIn(list){ return nbHouses.every(function(h){return list.indexOf(h)>=0;}); }
  function nbAnyIn(list){ return nbHouses.some(function(h){return list.indexOf(h)>=0;}); }
  function nbOccupiedHouses(){ var o=[]; nbHouses.forEach(function(h){if(o.indexOf(h)<0)o.push(h);});
    return o.sort(function(a,b){return a-b;}); }
  function nbOccupiedSigns(){ var o=[]; nbSigns.forEach(function(s){if(o.indexOf(s)<0)o.push(s);});
    return o; }
  function nbRun(start,len){ var l=[]; for(var i=0;i<len;i++) l.push(((start-1+i)%12)+1); return l; }
  function nbModality(m){ return nbSigns.every(function(s){return s%3===m;}); }
  var nbFound=[];
  function nbAdd(key,iast,en,present,detail,cite){
    if(present) nbFound.push(iast);
    add(key,iast,en,"Nābhasa",present,detail,present?"medium":undefined,cite||"BPHS Ch. 35");
  }
  var MODN=["movable","fixed","dual"];
  nbAdd("Rajju","Rajju","Rajju Yoga — every graha in movable signs",nbModality(0),
     nbModality(0)?"all seven in movable signs":"the grahas are not all in movable signs","BPHS Ch. 35, v. 7");
  nbAdd("Musala","Musala","Musala Yoga — every graha in fixed signs",nbModality(1),
     nbModality(1)?"all seven in fixed signs":"the grahas are not all in fixed signs","BPHS Ch. 35, v. 7");
  nbAdd("Nala","Nala","Nala Yoga — every graha in dual signs",nbModality(2),
     nbModality(2)?"all seven in dual signs":"the grahas are not all in dual signs","BPHS Ch. 35, v. 7");

  var BEN2=["Jupiter","Venus","Mercury","Moon"];
  var kendraList=[1,4,7,10];
  var kOcc=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h;}); });
  var kBen=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)>=0;})
    && !NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)<0;}); });
  var kMal=kendraList.filter(function(h){ return NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)<0;})
    && !NB.some(function(p){return H[p]===h&&BEN2.indexOf(p)>=0;}); });
  nbAdd("Maala","Māla","Māla Yoga — three kendras occupied by benefics",kBen.length>=3,
     kBen.length+" kendras hold benefics only","BPHS Ch. 35, v. 8");
  nbAdd("SarpaNabhasa","Sarpa","Sarpa (Bhujaṅga) Yoga — three kendras occupied by malefics",kMal.length>=3,
     kMal.length+" kendras hold malefics only","BPHS Ch. 35, v. 8");

  var gada=[[1,4],[4,7],[7,10],[10,1]].some(function(pr){ return nbAllIn(pr); });
  nbAdd("Gada","Gadā","Gadā Yoga — every graha in two successive kendras",gada,
     gada?"the grahas fill two adjacent kendras":"not confined to two successive kendras","BPHS Ch. 35, vv. 9–11");
  nbAdd("SakataNabhasa","Śakaṭa","Śakaṭa Yoga (Nābhasa) — every graha in the 1st and 7th",nbAllIn([1,7]),
     nbAllIn([1,7])?"all seven across the 1st and 7th":"not confined to the 1st and 7th","BPHS Ch. 35, vv. 9–11");
  nbAdd("Vihaga","Vihaga","Vihaga Yoga — every graha in the 4th and 10th",nbAllIn([4,10]),
     nbAllIn([4,10])?"all seven across the 4th and 10th":"not confined to the 4th and 10th","BPHS Ch. 35, vv. 9–11");
  nbAdd("Sringataka","Śṛṅgāṭaka","Śṛṅgāṭaka Yoga — every graha in the 1st, 5th and 9th",nbAllIn([1,5,9]),
     nbAllIn([1,5,9])?"all seven in the trines":"not confined to the trines","BPHS Ch. 35, vv. 9–11");
  var hala=[[2,6,10],[3,7,11],[4,8,12]].some(function(g){return nbAllIn(g);});
  nbAdd("Hala","Hala","Hala Yoga — every graha in one trinal set: 2/6/10, 3/7/11 or 4/8/12",hala,
     hala?"the grahas fill one trinal set":"not confined to a single trinal set","BPHS Ch. 35, vv. 9–11");
  function allBenIn(list){ return BEN2.every(function(b){return list.indexOf(H[b])>=0;}); }
  function allMalIn(list){ var M=["Sun","Mars","Saturn"];
    return M.every(function(m){return list.indexOf(H[m])>=0;}); }
  var vajra=allBenIn([1,7])||allMalIn([4,10]);
  nbAdd("Vajra","Vajra","Vajra Yoga — benefics in the 1st and 7th, or malefics in the 4th and 10th",vajra,
     vajra?(allBenIn([1,7])?"benefics in the 1st and 7th":"malefics in the 4th and 10th")
       :"neither arrangement holds","BPHS Ch. 35, vv. 9–11");
  var yava=allBenIn([4,10])||allMalIn([1,7]);
  nbAdd("Yava","Yava","Yava Yoga — benefics in the 4th and 10th, or malefics in the 1st and 7th",yava,
     yava?(allBenIn([4,10])?"benefics in the 4th and 10th":"malefics in the 1st and 7th")
       :"neither arrangement holds","BPHS Ch. 35, vv. 9–11");
  nbAdd("Kamala","Kamala","Kamala Yoga — every graha in the four kendras",nbAllIn([1,4,7,10]),
     nbAllIn([1,4,7,10])?"all seven in kendras":"not confined to the kendras","BPHS Ch. 35, v. 12");
  var vapi=nbAllIn([3,6,9,12])||nbAllIn([2,5,8,11]);
  nbAdd("Vapi","Vāpī","Vāpī Yoga — every graha in the cadent houses or in the succedent houses",vapi,
     vapi?(nbAllIn([3,6,9,12])?"all seven in cadent houses":"all seven in succedent houses")
       :"spread across kendras as well","BPHS Ch. 35, v. 12");
  [["Yupa","Yūpa",1],["Sara","Śara",4],["Sakthi","Śakti",7],["Danda","Daṇḍa",10]].forEach(function(x){
    var run=nbRun(x[2],4), ok=nbAllIn(run);
    nbAdd(x[0],x[1],x[1]+" Yoga — every graha within the four houses from the "+x[2]+
       (x[2]===1?"st":x[2]===4?"th":"th"),ok,
       ok?"all seven within houses "+run.join(", "):"not confined to houses "+run.join(", "),
       "BPHS Ch. 35, v. 13");
  });
  [["Nauka","Naukā",1],["Koota","Kūṭa",4],["Chatra","Chatra",7],["Chapa","Chāpa",10]].forEach(function(x){
    var run=nbRun(x[2],7), ok=nbAllIn(run);
    nbAdd(x[0],x[1],x[1]+" Yoga — every graha within the seven houses from the "+x[2]+"th",ok,
       ok?"all seven within houses "+run.join(", "):"not confined to houses "+run.join(", "),
       "BPHS Ch. 35, v. 14");
  });
  nbAdd("Chakra","Chakra","Chakra Yoga — every graha in alternate houses from the lagna",nbAllIn([1,3,5,7,9,11]),
     nbAllIn([1,3,5,7,9,11])?"all seven in the odd houses":"not confined to the odd houses","BPHS Ch. 35, v. 15");
  nbAdd("Samudra","Samudra","Samudra Yoga — every graha in alternate houses from the 2nd",nbAllIn([2,4,6,8,10,12]),
     nbAllIn([2,4,6,8,10,12])?"all seven in the even houses":"not confined to the even houses","BPHS Ch. 35, v. 15");
  /* Ardhachandra is named among the twenty but the uploaded text gives no formation
     verse for it; the widely used rule is seven grahas in seven consecutive houses
     that do not begin at a kendra. Flagged rather than presented as Parāśara's. */
  var ardha=(function(){
    for(var s=1;s<=12;s++){ if([1,4,7,10].indexOf(s)>=0) continue;
      if(nbAllIn(nbRun(s,7))) return s; }
    return 0;
  })();
  nbAdd("Ardhachandra","Ardhacandra",
     "Ardhacandra Yoga — every graha in seven consecutive houses beginning away from a kendra",ardha>0,
     ardha>0?"a run of seven beginning at house "+ardha:"no such run",
     "BPHS Ch. 35 names this among the twenty Ākṛti yogas, but the uploaded text gives "+
     "no formation verse for it; the commonly used rule is applied here");

  var occSigns=nbOccupiedSigns().length;
  var SANKHYA=[[1,"Gola","Gola"],[2,"Yuga","Yuga"],[3,"Soola","Śūla"],[4,"Kedara","Kedāra"],
               [5,"Pasa","Pāśa"],[6,"Dama","Dāma"],[7,"Veena","Vīṇā"]];
  var priorNabhasa=nbFound.length>0;
  SANKHYA.forEach(function(x){
    var forms=(occSigns===x[0])&&!priorNabhasa;
    add(x[1],x[2],x[2]+" Yoga — the seven grahas confined to exactly "+x[0]+" sign"+(x[0]>1?"s":""),
        "Nābhasa (Saṅkhya)",forms,
        (occSigns===x[0])?(priorNabhasa?"the count matches, but "+nbFound.join(", ")+
          " already applies, and v. 17 sets the Saṅkhya yogas aside when another Nābhasa yoga is derivable"
          :"the grahas occupy exactly "+x[0]+" sign"+(x[0]>1?"s":""))
          :"the grahas occupy "+occSigns+" signs",
        forms?"medium":undefined,"BPHS Ch. 35, vv. 16–17");
  });

  /* ============ the remaining yogas of BPHS Ch. 36 ============ */
  function lordOf(h){ return LORD[(LS+h-1)%12]; }
  function houseOfP(p){ return H[p]; }
  function strongP(p){ return ["exalted","own","moolatrikona"].indexOf(dig[p])>=0; }
  function occOf(h){ return Object.keys(H).filter(function(p){return H[p]===h;}); }
  function benOnly(h){ var o=occOf(h); return o.length>0&&o.every(function(p){return BEN2.indexOf(p)>=0;}); }
  function malOnly(h){ var o=occOf(h); return o.length>0&&o.every(function(p){return BEN2.indexOf(p)<0;}); }
  function relFrom(p,n){ return ((H[p]-1+n-1)%12)+1; }
  function benIn(h){ return occOf(h).some(function(p){return BEN2.indexOf(p)>=0;}); }
  function c36(k,iast,en,ok,detail,cite){
    add(k,iast,en,"Ch. 36 Rāja-yoga",ok,detail,ok?"medium":undefined,cite);
  }
  var lagLord=lordOf(1), l2=lordOf(2), l5=lordOf(5), l6=lordOf(6), l7=lordOf(7),
      l9=lordOf(9), l10x=lordOf(10);

  var cham=(dig[lagLord]==="exalted"&&kendra.indexOf(H[lagLord])>=0&&
            ((H.Jupiter-1+6)%12)+1===H[lagLord]) ||
           [1,7,9,10].some(function(h){ return occOf(h).filter(function(p){
             return BEN2.indexOf(p)>=0;}).length>=2; });
  c36("Chamara","Chāmara","Chāmara Yoga — the lagna lord exalted in a kendra and aspected by Jupiter, or two benefics in the 1st, 7th, 9th or 10th",
      cham, cham?"the condition is met":"lagna lord "+lagLord+" is "+dig[lagLord]+
      " at house "+H[lagLord]+", and no two benefics share the 1st, 7th, 9th or 10th","BPHS Ch. 36, vv. 11–12");

  var sankhaA=strongP(lagLord)&&([1,4,7,10].indexOf(((H[l5]-H[l6]+12)%12)+1)>=0);
  var sankhaB=(S[lagLord]%3===0)&&(H[lagLord]===H[l10x])&&strongP(l9);
  c36("Sankha","Śaṅkha","Śaṅkha Yoga — a strong lagna lord with the 5th and 6th lords in mutual kendras, or the lagna and 10th lords together in a movable sign with a strong 9th lord",
      sankhaA||sankhaB, (sankhaA||sankhaB)?"the condition is met"
        :"lagna lord "+lagLord+" ("+dig[lagLord]+"); 5th lord "+l5+" and 6th lord "+l6+" are "+
         (((H[l5]-H[l6]+12)%12)+1)+" apart","BPHS Ch. 36, vv. 13–14");

  var bheriA=[12,1,2,7].every(function(h){return occOf(h).length>0;})&&strongP(l9);
  var bheriB=[H.Venus,H.Jupiter,H[lagLord]].every(function(h){return kendra.indexOf(h)>=0;})&&strongP(l9);
  c36("Bheri","Bherī","Bherī Yoga — the 12th, 1st, 2nd and 7th all occupied with a strong 9th lord, or Venus, Jupiter and the lagna lord in kendras with a strong 9th lord",
      bheriA||bheriB,(bheriA||bheriB)?"the condition is met"
        :"9th lord "+l9+" is "+dig[l9],"BPHS Ch. 36, vv. 15–16");

  var mrid=strongP(lagLord)&&NB.filter(function(p){return p!==lagLord;}).every(function(p){
    return kendra.indexOf(H[p])>=0||trikona.indexOf(H[p])>=0||strongP(p); });
  c36("Mridanga","Mṛdaṅga","Mṛdaṅga Yoga — a strong lagna lord while the other grahas hold kendras, trikoṇas, own signs or exaltation",
      mrid, mrid?"lagna lord "+lagLord+" is "+dig[lagLord]+" and the rest are well placed"
        :"lagna lord "+lagLord+" is "+dig[lagLord]+", or some graha is otherwise placed","BPHS Ch. 36, v. 17");

  var srin=(H[l7]===10)&&(dig[l10x]==="exalted")&&(H[l10x]===H[l9]);
  c36("Srinatha","Śrīnātha","Śrīnātha Yoga — the 7th lord in the 10th while the 10th lord is exalted and joined to the 9th lord",
      srin, srin?"the condition is met":"7th lord "+l7+" at house "+H[l7]+
      ", 10th lord "+l10x+" is "+dig[l10x],"BPHS Ch. 36, v. 18");

  var saradaA=(H[l10x]===5)&&kendra.indexOf(H.Mercury)>=0&&(S.Sun===4)&&strongP("Sun");
  var saradaB=[1,5,9].indexOf(((H.Jupiter-H.Moon+12)%12)+1)>=0||
              [1,5,9].indexOf(((H.Mercury-H.Moon+12)%12)+1)>=0;
  var sarada=saradaA||(saradaB&&H.Mars===11);
  c36("Sarada","Śāradā","Śāradā Yoga — the 10th lord in the 5th with Mercury in a kendra and a strong Sun in Siṃha, or Jupiter/Mercury trinal to the Moon with Mars in the 11th",
      sarada, sarada?"the condition is met":"Mars is at house "+H.Mars+
      "; 10th lord "+l10x+" at "+H[l10x],"BPHS Ch. 36, vv. 19–20");

  var matsya=benIn(9)&&benIn(1)&&occOf(5).length>0&&malOnly(4)&&malOnly(8);
  c36("Matsya","Matsya","Matsya Yoga — benefics in the 1st and 9th, mixed grahas in the 5th, malefics in the 4th and 8th",
      matsya, matsya?"the condition is met":"the 4th holds "+(occOf(4).join(", ")||"nothing")+
      " and the 8th "+(occOf(8).join(", ")||"nothing"),"BPHS Ch. 36, vv. 21–22");

  function wellPlaced(p){ return ["exalted","own","moolatrikona","friend"].indexOf(dig[p])>=0; }
  var koorma=[5,6,7].every(function(h){ var o=occOf(h);
      return o.length>0&&o.every(function(p){return BEN2.indexOf(p)>=0&&wellPlaced(p);}); })&&
    [3,11].every(function(h){ return malOnly(h); })&&strongP(lagLord)&&H[lagLord]===1;
  c36("Koorma","Kūrma","Kūrma Yoga — well-dignified benefics in the 5th, 6th and 7th, malefics in the 3rd and 11th, and the lagna lord strong in the lagna",
      koorma, koorma?"the condition is met":"the 5th, 6th and 7th are not all held by dignified benefics","BPHS Ch. 36, vv. 23–24");

  var khadga=(S[l2]===((LS+8)%12))&&(S[l9]===((LS+1)%12))&&
             (kendra.indexOf(H[lagLord])>=0||trikona.indexOf(H[lagLord])>=0);
  c36("Khadga","Khaḍga","Khaḍga Yoga — an exchange of signs between the 2nd and 9th lords while the lagna lord holds a kendra or trikoṇa",
      khadga, khadga?"2nd lord "+l2+" and 9th lord "+l9+" have exchanged signs"
        :"no exchange between the 2nd lord "+l2+" and the 9th lord "+l9,"BPHS Ch. 36, vv. 25–26");

  var kusuma=(LS%3===1)&&kendra.indexOf(H.Venus)>=0&&
             trikona.indexOf(H.Moon)>=0&&occOf(H.Moon).some(function(p){
               return p!=="Moon"&&BEN2.indexOf(p)>=0; })&&H.Saturn===10;
  c36("Kusuma","Kusuma","Kusuma Yoga — a fixed lagna, Venus in a kendra, the Moon trinal with a benefic, and Saturn in the 10th",
      kusuma, kusuma?"the condition is met":"the lagna is "+MODN[LS%3]+
      "; Venus at "+H.Venus+", Moon at "+H.Moon+", Saturn at "+H.Saturn,"BPHS Ch. 36, vv. 29–30");

  var kalan=[2,5].indexOf(H.Jupiter)>=0&&
    (((H.Mercury-1+6)%12)+1===H.Jupiter||H.Mercury===H.Jupiter)&&
    (((H.Venus-1+6)%12)+1===H.Jupiter||H.Venus===H.Jupiter);
  c36("Kalanidhi","Kalānidhi","Kalānidhi Yoga — Jupiter in the 2nd or 5th, aspected or joined by both Mercury and Venus",
      kalan, kalan?"Jupiter at house "+H.Jupiter+", met by Mercury and Venus"
        :"Jupiter is at house "+H.Jupiter,"BPHS Ch. 36, vv. 31–32");

  var kd=(function(){
    var a=lagLord, b=LORD[S[a]], c=LORD[S[b]], dsp=null;
    try{ dsp=LORD[Math.floor(((ctx.navamsa&&ctx.navamsa[c])!=null?ctx.navamsa[c]:S[c]))]; }catch(e){ dsp=LORD[S[c]]; }
    var chain=[a,b,c,dsp].filter(Boolean);
    return {chain:chain, ok:chain.every(function(x){
      return kendra.indexOf(H[x])>=0||trikona.indexOf(H[x])>=0||dig[x]==="exalted"; })};
  })();
  c36("Kalpadruma","Kalpadruma","Kalpadruma (Pārijāta) Yoga — the lagna lord, its dispositor, that dispositor's dispositor and the last one's navāṃśa dispositor all in kendras, trikoṇas or exaltation",
      kd.ok, "chain: "+kd.chain.join(" → ")+(kd.ok?" — all well placed":" — not all in kendras, trikoṇas or exaltation"),
      "BPHS Ch. 36, vv. 33–34");

  function trioFrom(p,offs){ return offs.every(function(n){
    var h=relFrom(p,n); return occOf(h).some(function(q){return BEN2.indexOf(q)>=0;}); }); }
  var hari=trioFrom(l2,[2,12,8]), hara=trioFrom(l7,[4,9,8]), brahma=trioFrom(lagLord,[4,10,11]);
  c36("Hari","Hari","Hari Yoga — benefics in the 2nd, 12th and 8th from the sign held by the 2nd lord",hari,
      "from "+l2+" at house "+H[l2],"BPHS Ch. 36, vv. 35–36");
  c36("Hara","Hara","Hara Yoga — benefics in the 4th, 9th and 8th from the sign held by the 7th lord",hara,
      "from "+l7+" at house "+H[l7],"BPHS Ch. 36, vv. 35–36");
  c36("Brahma","Brahmā","Brahmā Yoga — benefics in the 4th, 10th and 11th from the sign held by the lagna lord",brahma,
      "from "+lagLord+" at house "+H[lagLord],"BPHS Ch. 36, vv. 35–36");

  var lagnadhiOcc=occOf(7).concat(occOf(8));
  var lagnadhi=lagnadhiOcc.length>0&&lagnadhiOcc.every(function(p){return BEN2.indexOf(p)>=0;});
  c36("Lagnadhi","Lagnādhi","Lagnādhi Yoga — benefics in the 7th and 8th from the lagna, free of malefic company",
      lagnadhi, lagnadhi?"7th and 8th hold only benefics: "+lagnadhiOcc.join(", ")
        :"the 7th and 8th hold "+(lagnadhiOcc.join(", ")||"nothing"),
      "BPHS Ch. 36, v. 37. The sage names only the 7th and 8th; some editions add the 6th.");

  var LATER="later tradition — not found under this name in BPHS";

  var mangalaHouses=[1,2,4,7,8,12];
  var mFromLagna=mangalaHouses.indexOf(H.Mars)>=0;
  var mFromMoon=mangalaHouses.indexOf(((H.Mars-H.Moon+12)%12)+1)>=0;
  var mFromVenus=mangalaHouses.indexOf(((H.Mars-H.Venus+12)%12)+1)>=0;
  var mdCancels=[];
  if(["own","exalted","moolatrikona"].indexOf(dig.Mars)>=0)
    mdCancels.push("Mars is "+dig.Mars);
  if(H.Mars===H.Jupiter||H.Mars===H.Moon)
    mdCancels.push("Mars is with "+(H.Mars===H.Jupiter?"Jupiter":"the Moon"));
  if(((H.Jupiter-1+6)%12)+1===H.Mars) mdCancels.push("Jupiter aspects Mars");
  var md=mFromLagna||mFromMoon||mFromVenus;
  add("MangalaDosha","Maṅgala Doṣa",
      "Maṅgala Doṣa — Mars in the 1st, 2nd, 4th, 7th, 8th or 12th, counted from the lagna, the Moon or Venus",
      "Doṣa (later tradition)", md,
      (md?("Mars falls there from "+[mFromLagna?"the lagna":null,mFromMoon?"the Moon":null,
           mFromVenus?"Venus":null].filter(Boolean).join(", ")):"Mars avoids those houses from all three")+
      (mdCancels.length?" — mitigations present: "+mdCancels.join("; "):""),
      md?(mdCancels.length?"weak":"medium"):undefined,
      LATER+". House sets and cancellations differ widely by region; the 2nd house and the "+
      "reckoning from Venus are included here but are not universal. Treat as a prompt for "+
      "discussion, never as a verdict on a marriage.");

  var nodeSpan=(function(){
    var r=H.Rahu, k=H.Ketu, between=0, tot=0;
    ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].forEach(function(p){
      tot++; var d=((H[p]-r+12)%12); if(d>=0&&d<((k-r+12)%12)) between++; });
    return {between:between, total:tot};
  })();
  var ks=(nodeSpan.between===7||nodeSpan.between===0);
  add("KalaSarpa","Kāla Sarpa",
      "Kāla Sarpa — all seven grahas confined to the semicircle between Rāhu and Ketu",
      "Doṣa (later tradition)", ks,
      ks?"all seven lie on one side of the nodal axis":nodeSpan.between+" of 7 grahas lie between Rāhu and Ketu, so the axis is broken",
      ks?"medium":undefined,
      LATER+". A modern formulation; sources differ on whether the nodes must hem the "+
      "grahas exactly and on what counts as partial.");

  var cm=related("Moon","Mars");
  add("ChandraMangala","Candra-Maṅgala","Candra-Maṅgala Yoga — the Moon and Mars conjunct or in mutual aspect",
      "Special (later tradition)", cm,
      cm?"Moon at "+H.Moon+" and Mars at "+H.Mars+" are "+(H.Moon===H.Mars?"conjunct":"in mutual aspect")
        :"Moon at "+H.Moon+", Mars at "+H.Mars+" — unrelated", cm?"medium":undefined, LATER);

  var shk=[6,8,12].indexOf(((H.Moon-H.Jupiter+12)%12)+1)>=0;
  add("Shakata","Śakaṭa","Śakaṭa Yoga — the Moon in the 6th, 8th or 12th from Jupiter",
      "Subtractive (later tradition)", shk,
      "the Moon is "+(((H.Moon-H.Jupiter+12)%12)+1)+" from Jupiter",
      shk?"medium":undefined,
      LATER+". BPHS Ch. 35 has a Śakaṭa among the Nābhasa yogas, which is a different "+
      "combination altogether; this Moon-and-Jupiter rule comes from later works.");

  var kendraOcc=kendra.filter(function(h){ return occupantsOfHouse(h).length>0; });
  add("Chatussagara","Catuḥsāgara","Catuḥsāgara Yoga — all four kendras occupied",
      "Special (later tradition)", kendraOcc.length===4,
      kendraOcc.length+" of the four kendras are occupied", kendraOcc.length===4?"strong":undefined, LATER);

  var upa=[3,6,10,11];
  var vasu=BEN.filter(function(b){ return upa.indexOf(H[b])>=0; });
  add("Vasumati","Vasumatī","Vasumatī Yoga — benefics in the upachaya houses 3, 6, 10 and 11",
      "Dhana (later tradition)", vasu.length>0,
      vasu.length?vasu.join(", ")+" in upachayas":"no benefic occupies an upachaya",
      vasu.length>=3?"strong":(vasu.length?"medium":undefined), LATER);

  var rl=(BEN.indexOf("Jupiter")>=0&&kendra.indexOf(H.Jupiter)>=0)&&
         (dig.Moon!=="debilitated")&&(kendra.indexOf(H.Venus)>=0||trikona.indexOf(H.Venus)>=0);
  add("Rajalakshana","Rājalakṣaṇa","Rājalakṣaṇa Yoga — Jupiter in a kendra, Venus in a kendra or trikoṇa, the Moon unafflicted by debilitation",
      "Special (later tradition)", rl,
      "Jupiter at "+H.Jupiter+", Venus at "+H.Venus+", Moon "+dig.Moon, rl?"medium":undefined, LATER);

  var dus=[6,8,12];
  var vcb=(dus.indexOf(H[lagL])>=0)&&Object.keys(H).some(function(p){
    return MAL.indexOf(p)>=0&&H[p]===H[lagL]; });
  add("VanchanaChoraBheeti","Vañcana-cora-bhīti",
      "Vañcana-cora-bhīti Yoga — the lagna lord in a dusthāna together with a malefic",
      "Subtractive (later tradition)", vcb,
      "lagna lord "+lagL+" at house "+H[lagL]+(vcb?", with a malefic":""), vcb?"medium":undefined,
      LATER+". Definitions vary considerably; read it as a caution about misplaced trust, "+
      "not as a statement about anyone's honesty.");

  var occHouses=[];
  Object.keys(H).forEach(function(p){ if(occHouses.indexOf(H[p])<0) occHouses.push(H[p]); });
  occHouses.sort(function(a,b){return a-b;});
  var consecutive=(function(){
    if(!occHouses.length) return false;
    for(var i=1;i<occHouses.length;i++) if(occHouses[i]!==occHouses[i-1]+1) return false;
    return true;
  })();
  add("LagnaMallika","Lagna Mallikā","Lagna Mallikā Yoga — every graha in an unbroken run of houses from the lagna",
      "Special (later tradition)", consecutive&&occHouses[0]===1,
      "grahas occupy houses "+occHouses.join(", "),
      (consecutive&&occHouses[0]===1)?"medium":undefined,
      LATER+". Closely related to the Nābhasa Mālā and Sṛṅgāṭaka family in BPHS Ch. 35; "+
      "the name and the exact run differ between authors.");
  return Y;
}

/* ---- Bhayāt / Bhabhoga (needs the Moon's daily speed) ---- */
function bhayat(moonSid,moonSpeed,jd,date,ay){
  if(!moonSpeed||moonSpeed<=0) return null;
  var seg=40/3, x=((moonSid%360)+360)%360, i=Math.floor(x/seg);
  var start=i*seg, end=(i+1)*seg;
  // solve for the instants the Moon actually crosses the nakshatra boundaries
  function moonAt(ms){ var d=new Date(ms);
    var jd2=jd+(ms-date.getTime())/86400000;
    return ((tropLon("Moon",d)-ayanamsa(jd2))%360+360)%360; }
  function cross(target,guessDays){
    var t=date.getTime()+guessDays*86400000;
    for(var k=0;k<40;k++){
      var v=moonAt(t), diff=((v-target+180)%360+360)%360-180;
      if(Math.abs(diff)<1e-7) break;
      t-=diff/moonSpeed*86400000;
    }
    return t; }
  var tIn=cross(start,-(x-start)/moonSpeed), tOut=cross(end,(end-x)/moonSpeed);
  var bhDays=(date.getTime()-tIn)/86400000, bbDays=(tOut-tIn)/86400000;
  return {bhayat_ghatis:bhDays*60, bhabhoga_ghatis:bbDays*60,
          entry_jd:jd-bhDays, exit_jd:jd+(tOut-date.getTime())/86400000};
}



var EXALT={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6},
    DEBIL={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0},
    OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]},
    MTR={Sun:[4,0,20],Moon:[1,3,30],Mars:[0,0,12],Mercury:[5,15,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]},
    FRD={Sun:["Moon","Mars","Jupiter"],Moon:["Sun","Mercury"],Mars:["Sun","Moon","Jupiter"],Mercury:["Sun","Venus"],
         Jupiter:["Sun","Moon","Mars"],Venus:["Mercury","Saturn"],Saturn:["Mercury","Venus"]},
    ENM={Sun:["Venus","Saturn"],Moon:[],Mars:["Mercury"],Mercury:["Moon"],Jupiter:["Mercury","Venus"],
         Venus:["Sun","Moon"],Saturn:["Sun","Moon","Mars"]};
function digOf(p,s,d){ if(p==="Rahu"||p==="Ketu")return "node";
  if(s===EXALT[p])return "exalted"; if(s===DEBIL[p])return "debilitated";
  var m=MTR[p]; if(m&&s===m[0]&&d!=null&&d>=m[1]&&d<m[2])return "moolatrikona";
  if(OWNS[p].indexOf(s)>=0)return "own"; var l=LORD[s];
  if(l===p)return "own"; if(FRD[p].indexOf(l)>=0)return "friend"; if(ENM[p].indexOf(l)>=0)return "enemy"; return "neutral";}


var SB_NAIS={Sun:60,Moon:51.43,Venus:42.86,Jupiter:34.29,Mercury:25.71,Mars:17.14,Saturn:8.57};
var SB_REQ={Sun:6.5,Moon:6.0,Mars:5.0,Mercury:7.0,Jupiter:6.5,Venus:5.5,Saturn:5.0};
var SB_DIG={Sun:10,Mars:10,Moon:4,Venus:4,Mercury:1,Jupiter:1,Saturn:7};   // house of maximum dig bala
var SB_SEVEN=["D1","D2","D3","D7","D9","D12","D30"];
/* Saptavargaja ladders. THE TWO TRADITIONS GENUINELY DIFFER HERE and the
 * difference is not a rounding of one into the other.
 *   BPHS  Ch. 26, vv. 2–4 : 45 / 30 / 20 / 15 / 10 / 4 / 2   (quoted verbatim)
 *   Śrīpati Adh. 3, śl. 2–3: ¾ ½ ⅜ ¼ ⅛ 1/16 1/32 of a rūpa
 *                       = 45 / 30 / 22.5 / 15 / 7.5 / 3.75 / 1.875
 * They agree only at moolatrikona, svakṣetra and mitra. Subrahmanya Sastri
 * quotes the Parāśara ladder at p.28 and says plainly it is NOT the one he
 * adopts, so this is a deliberate divergence in the sources, not an error in
 * either. Neither is "corrected" into the other. */
var SB_VAL={exalted:45,moolatrikona:45,own:30,greatfriend:20,friend:15,neutral:10,enemy:4,greatenemy:2};
var SB_VAL_SP={exalted:45,moolatrikona:45,own:30,greatfriend:22.5,friend:15,neutral:7.5,enemy:3.75,greatenemy:1.875};
var SB_MALE=["Sun","Mars","Jupiter"], SB_FEM=["Moon","Venus"], SB_NEU=["Mercury","Saturn"];
var SB_NIGHT=["Moon","Mars","Saturn"], SB_DAY=["Sun","Jupiter","Venus"];
var SB_BEN=["Jupiter","Venus","Mercury","Moon"];
var DAYLORD=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
var HORA_SEQ=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];   // Chaldean order

function sbDeepDebil(p){ var E={Sun:10,Moon:3,Mars:28,Mercury:15,Jupiter:5,Venus:27,Saturn:20},
  D={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
  return D[p]*30+E[p]; }
function sbUchcha(p,sid){ var d=Math.abs(((sid-sbDeepDebil(p))%360+360)%360);
  if(d>180)d=360-d; return d/3; }                                   // 0 at debilitation, 60 at exaltation
function sbCompound(p,other,houseP,houseO,natFriend){
  var d=((houseO-houseP)%12+12)%12+1;
  var temp=([2,3,4,10,11,12].indexOf(d)>=0)?"friend":"enemy";
  var nat=natFriend(p,other);
  if(nat==="friend"&&temp==="friend")return "greatfriend";
  if(nat==="enemy"&&temp==="enemy")return "greatenemy";
  if(nat==="neutral"&&temp==="friend")return "friend";
  if(nat==="neutral"&&temp==="enemy")return "enemy";
  if(nat==="friend"&&temp==="enemy")return "neutral";
  if(nat==="enemy"&&temp==="friend")return "neutral";
  return "neutral";
}
/* Sphuta Drishti — BPHS Ch. 26, vv. 1–12. The aspectual angle is measured from the
   aspecting planet to the aspected point; the six rules below give the value in Virupas,
   with the extra allowances the sage specifies for Mars, Jupiter and Saturn. */
/* ===== ŚRĪPATI'S DṚṢṬI — Adh. 2, śl. 5–6 and the table at p.18 ============
 *
 * A different function from the BPHS speculum below, not a variant of it.
 * Śrīpati tabulates the aspect in QUARTERS of a rūpa against the excess of
 * the aspected point over the aspecting graha, measured in whole rāśis, and
 * interpolates linearly across the degrees within a rāśi:
 *
 *   excess   1  2  3  4  5  6  7  8  9 10 11 12
 *   quarters 0  1  3  2  0  4  3  2  1  0  0  0
 *
 * Zero at an excess of 1 and 11 is his "planets do not see the 2nd and 12th
 * houses" (p.20); four at an excess of 6 is the full opposition at one rūpa.
 *
 * THE PER-GRAHA SUBSTITUTIONS ARE THE SUPER-ADD, not something beside it.
 * Śloka 5 says to superadd ¾, ½ and ¼ of a rūpa to Saturn, Jupiter and Mars
 * on their special aspects; śloka 6 and the table say to substitute 4 for
 * Saturn at an excess of 2 and 9, for Jupiter at 4 and 8, and for Mars at 3
 * and 7. In quarters those are +3, +2 and +1 on base values of 1, 2 and 3 —
 * the same rule written twice. Recognising that is what makes it safe to
 * implement the table alone and not add the superadd again on top, which
 * would double it.
 *
 * This is the super-add the engine DECLINED under BPHS Ch. 27 v. 19, after
 * deliberation recorded at sphutaDrishti below: there the translator's
 * shortcut would have pushed the value past the one rūpa its own verse
 * ceilings. Here it does not — the table tops out at 4 quarters by
 * construction — and Śrīpati states it in his own text rather than in a
 * note. So the same idea is right in one paddhati and wrong in the other,
 * which is exactly why they are separate functions.
 *
 * VERIFIED: all 21 populated cells of his Grahadrigbala table (p.20) are
 * reproduced to three decimals from his own longitudes. */
var SP_DRG_BASE=[0,1,3,2,0,4,3,2,1,0,0,0];
var SP_DRG_SPECIAL={Jupiter:{4:4,8:4},Saturn:{2:4,9:4},Mars:{3:4,7:4}};
/* ŚRĪPATI'S SECOND IṢṬA/KAṢṬA — through the seven vargas (Adh. 4 śl. 8–11,
   pp. 65–68), the method his commentator credits to the Yavanas.

   THE VERSE (śl. 8–9): the good influence of a graha is 1 rūpa in its
   exaltation, ¾ in its mūlatrikoṇa, ½ in its own house, ⅜ with a very friendly
   lord, ¼ friendly, ⅛ neutral, 1/16 inimical, 1/32 very inimical, nothing in
   its debilitation; the evil influence is 1 less the good; and in the six
   vargas other than the rāśi — horā, drekkāṇa, saptāṃśa, navāṃśa, dvādaśāṃśa,
   triṃśāṃśa — only half is counted.
   THE TABLES (śl. 10–11): each total ÷ 4 is the Gṛha row of the śubha and
   aśubha paṅkti; each of the other six rows takes half of that.

   HIS WORKED TABLE (p. 66) AND HIS VERSE DISAGREE, and the table is followed.
   It scores the Sun in Meṣa — its exaltation sign — as ⅜, "the house of an
   Adhimitra", and Saturn in Meṣa — its debilitation sign — as ⅛. Reconstructed
   independently, all 49 of his cells come out only when mūlatrikoṇa is scored
   and exaltation and debilitation are not; every reading that scores them
   misses cells. This is the same choice already made for his pakṣa, where his
   table does not double the Moon although his text says to. The verse's own
   reading is computed beside it and published as verse_reading, so nothing is
   chosen silently. sripati-paddhati-verify.mjs reproduces the table cell by
   cell.

   The relationship is the compound one, its tātkālika half from the BHĀVA
   chart (his pp. 24–26), as everywhere else under his paddhati. Mūlatrikoṇa is
   by degree and in the rāśi only.

   Pure, so the book check can feed it his own longitudes and bhāvas. */
var SP_IK_VAL={exalted:1,moolatrikona:0.75,own:0.5,greatfriend:0.375,friend:0.25,
               neutral:0.125,enemy:0.0625,greatenemy:0.03125,debilitated:0};
var SP_IK_VARGAS=["D1","D2","D3","D7","D9","D12","D30"];
function sripatiSaptavargaIK(lon, bhavaOf, vsign){
  var G=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], out={};
  function nat(p,l){ return FRD[p].indexOf(l)>=0?"friend":(ENM[p].indexOf(l)>=0?"enemy":"neutral"); }
  function compound(p,l){
    var n=nat(p,l), hp=bhavaOf(p), hl=bhavaOf(l);
    var dist=((hl-hp)%12+12)%12+1, t=[2,3,4,10,11,12].indexOf(dist)>=0?"friend":"enemy";
    if(n==="friend") return t==="friend"?"greatfriend":"neutral";
    if(n==="enemy")  return t==="enemy"?"greatenemy":"neutral";
    return t;
  }
  function classify(p,code,sign,verse){
    var L=lon[p], s0=Math.floor(norm(L)/30)%12, deg=norm(L)-s0*30;
    if(verse){ if(sign===EXALT[p]) return "exalted"; if(sign===DEBIL[p]) return "debilitated"; }
    if(code==="D1"){ var m=MTR[p]; if(sign===m[0]&&deg>=m[1]&&deg<m[2]) return "moolatrikona"; }
    var lord=LORD[sign];
    if(lord===p) return "own";
    return compound(p,lord);
  }
  G.forEach(function(p){
    if(lon[p]==null) return;
    function run(verse){
      var good=[], evil=[], dig=[], gs=0, es=0;
      SP_IK_VARGAS.forEach(function(code){
        var sign=vsign(code,norm(lon[p])), d=classify(p,code,sign,verse);
        var w=(code==="D1")?1:0.5, g=SP_IK_VAL[d]*w, e=(1-SP_IK_VAL[d])*w;
        dig.push(d); good.push(g); evil.push(e); gs+=g; es+=e;
      });
      return {good:good, evil:evil, dignity:dig, good_total:gs, evil_total:es};
    }
    var T=run(false), V=run(true);
    var gr=T.good_total/4, ar=T.evil_total/4;
    out[p]={vargas:SP_IK_VARGAS, dignity:T.dignity, good:T.good, evil:T.evil,
      good_total_rupa:T.good_total, evil_total_rupa:T.evil_total,
      subha_panktee:[gr,gr/2,gr/2,gr/2,gr/2,gr/2,gr/2],
      asubha_panktee:[ar,ar/2,ar/2,ar/2,ar/2,ar/2,ar/2],
      verse_reading:{dignity:V.dignity, good_total_rupa:V.good_total, evil_total_rupa:V.evil_total}};
  });
  return out;
}
function sripatiDrishti(aspector,lonFrom,lonTo){
  var ex=(((lonTo-lonFrom)%360+360)%360)/30;        /* excess in rāśis, 0..12 */
  var t=SP_DRG_BASE.slice(), sp=SP_DRG_SPECIAL[aspector];
  if(sp) for(var k in sp) if(Object.prototype.hasOwnProperty.call(sp,k)) t[(+k)-1]=sp[k];
  var n=Math.floor(ex), frac=ex-n;
  /* value at integer excess n, and at n+1; an excess of 0 is the 12th entry */
  var a=t[(n===0?12:n)-1], b=t[(n+1>12?1:n+1)-1];
  var q=a+(b-a)*frac;                                /* quarters of a rūpa */
  return Math.max(0,Math.min(60,q*15));              /* → virūpas */
}
function sphutaDrishti(aspector,lonFrom,lonTo){
  var d=((lonTo-lonFrom)%360+360)%360, v=0;
  if(d>30&&d<=60)        v=(d-30)/2;
  else if(d>60&&d<=90)   v=(d-60)+15;
  else if(d>90&&d<=120)  v=(120-d)/2+30;
  else if(d>120&&d<=150) v=150-d;
  else if(d>150&&d<=180) v=(d-150)*2;
  else if(d>180&&d<300)  v=(300-d)/2;
  if(aspector==="Mars"    && ((d>=90&&d<=120)||(d>=210&&d<=240))) v+=15;
  if(aspector==="Jupiter" && ((d>=120&&d<=150)||(d>=240&&d<=270))) v+=30;
  if(aspector==="Saturn"  && ((d>=60&&d<=90)  ||(d>=270&&d<=300))) v+=45;
  /* The 60-virupa ceiling is deliberate and the text supports it. Ch. 26's
     Speculum of Aspectual Values peaks at 45.00 at a 90-degree aspect and
     reaches 60 only at the full opposition, and Saturn's own verses (Ch. 26,
     vv. 9-10) compute the 60-90 range as "the degrees etc. (in excess of 2
     signs) be halved and deducted from 60" — descending from 60 to 45, never
     above one rupa. The three special allowances above come from the
     TRANSLATOR'S NOTE, which offers "add 45 virupas to the speculum value"
     for Saturn as a shortcut; in that range the shortcut would yield up to
     90, contradicting the verse it summarises. Where the two disagree we
     follow the verse, so the clamp is what keeps the shortcut inside the
     one-rupa ceiling rather than an arbitrary guard. */
  return Math.max(0,Math.min(60,v));
}
/* ===== THE BHĀVA FRAME ====================================================

   Until now every bhāva on this site was whole-sign: a graha's house was its
   rāśi counted from the lagna's rāśi, written out as
   ((signOf - LS) % 12) + 1 in the two places that needed it. Śrīpati existed
   only as a page of its own. This makes the frame a CHOICE, computed in one
   place, so that a page cannot hold its own opinion about which bhāva a graha
   is in.

   THE DEFAULT IS WHOLE-SIGN AND MUST STAY BIT-IDENTICAL. Whole-sign is the
   right default for a Parāśarī reading, it is what every figure this project
   has ever published was computed with, and house-verify asserts that the
   frame in "whole" mode returns exactly what the old inline arithmetic did,
   for every graha and every house, on the reference charts. If that assertion
   ever fails, the switch is broken, not the expectation.

   WHAT ŚRĪPATI CHANGES, and the one convention it forces. The twelve madhyas
   are unequal, so a bhāva can span two rāśis and "the lord of the 7th" stops
   being unambiguous. The lord is taken from the rāśi containing the bhāva
   MADHYA — the house's own midpoint, which is also the point the Benares
   edition's 15° strength rule measures from, so the two readings agree about
   what the centre of a house is. The alternative, the rāśi on the opening
   sandhi, is a Western cusp reading and is not used here.

   IT CAN DECLINE, AND SAYS SO. build() returns null without an ascendant or a
   meridian, and SPSripati lives in the report bundle, so a page that loads
   engine.js alone cannot compute cusps at all. Note what this is NOT: the MC
   comes out of an atan2 and is defined at every latitude, so unlike Placidus
   there is no latitude at which this construction fails — high latitude makes
   the quadrants very unequal, not undefined. The realistic fallback is the
   missing module. In either case the frame returns whole-sign and sets fellBack,
   which the UI must surface. A house system that quietly invents a meridian
   is worse than one that refuses, and a toggle that silently does nothing is
   worse than one that reports it could not. */
var HOUSE_MODE = "whole";
function setHouseMode(m){ HOUSE_MODE = (m === "sripati") ? "sripati" : "whole"; return HOUSE_MODE; }
window.__setHouseMode = setHouseMode;
window.__houseMode = function(){ return HOUSE_MODE; };
/* One frame per chart. Every consumer asks this and nothing computes its own.
   lagSid and mcSid are sidereal; mcSid may be null. */
function bhavaFrame(lagSid, mcSid){
  var LS = Math.floor(norm(lagSid) / 30) % 12;
  function wholeFrame(fellBack, why){
    return {
      mode: "whole", fellBack: !!fellBack, why: why || null, sripati: null,
      LS: LS,
      houseOfLon: function(sid){
        return ((Math.floor(norm(sid) / 30) % 12 - LS) % 12 + 12) % 12 + 1;
      },
      lordOfHouse: function(h){ return LORD[(LS + h - 1) % 12]; },
      signOfHouse: function(h){ return (LS + h - 1) % 12; },
      /* the bhāva's midpoint in longitude. Under whole-sign a house "begins"
         at its rāśi, so the point Dig Bala measures from is the lagna carried
         round in 30° steps — which is what the Dig Bala code computed inline
         before the frame existed. */
      madhyaOf: function(h){ return norm(lagSid + (h - 1) * 30); },
      /* the rāśi a house's madhya falls in — the same thing as signOfHouse
         under whole-sign, which is why lordOfHouse agrees with the old
         arithmetic exactly */
      madhyaSignOfHouse: function(h){ return (LS + h - 1) % 12; }
    };
  }
  if (HOUSE_MODE !== "sripati") return wholeFrame(false);
  if (!(window.SPSripati && window.SPSripati.build))
    return wholeFrame(true, "the Śrīpati module is not loaded on this page");
  var S = window.SPSripati.build(norm(lagSid), (mcSid == null ? null : norm(mcSid)));
  if (!S || !S.madhya || !S.sandhi)
    return wholeFrame(true, "the meridian for this moment could not be computed");
  return {
    mode: "sripati", fellBack: false, why: null, sripati: S, LS: LS,
    houseOfLon: function(sid){ return S.houseOf(norm(sid)); },
    madhyaSignOfHouse: function(h){ return Math.floor(norm(S.madhya[h]) / 30) % 12; },
    lordOfHouse: function(h){ return LORD[Math.floor(norm(S.madhya[h]) / 30) % 12]; },
    madhyaOf: function(h){ return norm(S.madhya[h]); },
    /* the rāśi a house is "in" for display: the madhya's, for the same
       reason lordship uses it */
    signOfHouse: function(h){ return Math.floor(norm(S.madhya[h]) / 30) % 12; }
  };
}
window.__bhavaFrame = bhavaFrame;
/* The sidereal meridian. Factored out because quickSky computed it inline and
   buildLocalChart did not compute it at all — and the Śrīpati frame needs it
   from both, so two copies of this arithmetic would be two chances to differ
   about where the 10th house starts. */
function mcSidereal(date, lonDeg, epsDeg, ay){
  var gast = Astronomy.SiderealTime(date);
  var lst = ((gast + lonDeg / 15) % 24 + 24) % 24;
  var ramc = lst * 15 * Math.PI / 180;
  var mc = Math.atan2(Math.tan(ramc), Math.cos(epsDeg * Math.PI / 180)) * 180 / Math.PI;
  if (Math.cos(ramc) < 0) mc += 180;
  return norm(mc - ay);
}
window.__kMC = mcSidereal;
function shadbala(ctx){
  var P=ctx.planets, LS=ctx.LS, lagSid=ctx.lagSid, jd=ctx.jd, date=ctx.date,
      sunrise=ctx.sunrise, sunset=ctx.sunset, birthH=ctx.birthH, decl=ctx.decl,
      cheshtaK=ctx.cheshtaK, vargaSign=ctx.vargaSign, digOf=ctx.digOf, LORD=ctx.LORD,
      natFriend=ctx.natFriend, weekday=ctx.weekday, varshaLord=ctx.varshaLord, masaLord=ctx.masaLord;
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var houseOf={}, signOf={};
  /* the frame comes in from the chart builder; a graha's RĀŚI is still its
     rāśi — dignity, which reads signOf, is a rāśi property and must not
     follow the house system. Only the bhāva index does. */
  var FR=ctx.frame||bhavaFrame(lagSid,null);
  names.concat(["Rahu","Ketu"]).forEach(function(n){ if(!P[n])return;
    signOf[n]=Math.floor(P[n].sid/30)%12; houseOf[n]=FR.houseOfLon(P[n].sid); });
  // day/night
  var isDay=(birthH>=sunrise&&birthH<sunset);
  var dayLen=sunset-sunrise, nightLen=24-dayLen;
  // hora lord: 24 planetary hours from sunrise, Chaldean order starting with the weekday lord
  var horaLord=(function(){
    var since=(birthH-sunrise+24)%24;
    var idx=Math.floor(since/ (isDay? dayLen/12 : nightLen/12));
    var hoursFromSunrise=Math.floor(((birthH-sunrise+24)%24)/1);
    var start=HORA_SEQ.indexOf(DAYLORD[weekday]);
    if(start<0)start=0;
    return HORA_SEQ[(start+hoursFromSunrise)%7];
  })();
  // tribhaga lord
  var tribhagaLord=(function(){
    if(isDay){ var k=Math.floor((birthH-sunrise)/(dayLen/3)); return ["Mercury","Sun","Saturn"][Math.min(k,2)]; }
    var t=(birthH<sunrise? birthH+24: birthH)-sunset; var k2=Math.floor(t/(nightLen/3));
    return ["Moon","Venus","Mars"][Math.min(k2,2)];
  })();
  var sunSid=P.Sun.sid, moonSid=P.Moon.sid;
  var pakshaArc=((moonSid-sunSid)%360+360)%360; if(pakshaArc>180)pakshaArc=360-pakshaArc;
  var out=[];
  names.forEach(function(p){
    var sid=P[p].sid, deg=sid%30, sg=signOf[p], h=houseOf[p];
    // --- Sthana ---
    var uchcha=sbUchcha(p,sid);
    var sapta=0;
    SB_SEVEN.forEach(function(v){
      var vs=vargaSign(v,sid), d=digOf(p,vs,null);
      /* the ladder follows the PADDHATI, not the house frame — see SB_VAL.
         Hoisted out of the else branch so the exalted/own values come from
         the same ladder as the relationship values; they happen to agree at
         45 and 30 in both texts, but reading them from different tables
         would be waiting for the day they do not. */
      var LAD=(FR.mode==="sripati")?SB_VAL_SP:SB_VAL;
      if(d==="exalted"||d==="moolatrikona"||d==="own") sapta+=LAD[d==="own"?"own":"exalted"];
      else { var lord=LORD[vs];
        /* The tātkālika half of the pañcadhā relation is reckoned by RĀŚI
           distance, not by bhāva — a graha in the 2nd, 3rd, 4th, 10th, 11th
           or 12th rāśi from another is its temporary friend. This passed the
           HOUSE indices, which was the same number while house was the rāśi
           offset and became wrong the moment the frame could be Śrīpati: it
           moved Saptavargaja Bala, and so Sthāna and the Ṣaḍbala total, for
           grahas whose rāśi had not changed at all. sbCompound only uses the
           difference, so rāśi indices give exactly the classical reckoning. */
        /* ...THAT IS BPHS'S RECKONING, AND ŚRĪPATI'S IS NOT THE SAME.
           Sastri (pp. 24–26) takes the temporal relation from which of the
           twelve BHĀVAS each graha occupies in the lagna-bhāva-kuṇḍalī, and
           records that Śrīpati does not favour the alternative of casting a
           fresh bhāva chakra from each graha in turn. Balabhadra agrees; it
           is Parāśara and Keśava who count rāśis. Under unequal bhāvas the
           two give different answers for a graha that has ingressed across a
           sandhi, which is precisely when it matters.
           So the comment above still describes the BPHS path exactly, and the
           Śrīpati path deliberately passes bhāva indices instead. This feeds
           Saptavargaja → Sthāna → the Ṣaḍbala total, so it is the widest
           reaching of the paddhati differences. */
        var ip=(FR.mode==="sripati")?h:sg,
            io=(FR.mode==="sripati")
              ?(houseOf[lord]==null?h:houseOf[lord])
              :(signOf[lord]==null?sg:signOf[lord]);
        sapta += (lord===p)?LAD.own
          :LAD[sbCompound(p,lord,ip,io,natFriend)]; }
    });
    var oddSign=(sg%2===0), navSign=vargaSign("D9",sid), oddNav=(navSign%2===0);
    var wantOdd=(SB_FEM.indexOf(p)<0);
    var ojha=(wantOdd===oddSign?15:0)+(wantOdd===oddNav?15:0);
    var kendradi=([1,4,7,10].indexOf(h)>=0)?60:(([2,5,8,11].indexOf(h)>=0)?30:15);
    var drek=Math.floor(deg/10);
    var drekBala=((drek===0&&SB_MALE.indexOf(p)>=0)||(drek===1&&SB_FEM.indexOf(p)>=0)||
                  (drek===2&&SB_NEU.indexOf(p)>=0))?15:0;
    var sthana=uchcha+sapta+ojha+kendradi+drekBala;
    // --- Dig ---
    /* Dig Bala is measured from the cusp of the bhāva a graha is strongest
       in — the 1st, 4th, 7th or 10th. That was written inline as
       lagna + (n−1)×30, which IS the bhāva midpoint under whole-sign and is
       not under Śrīpati, where the quadrants are unequal and the 10th sits at
       the meridian rather than 270° from the lagna. Asking the frame keeps
       the default identical and makes the Śrīpati reading honest. */
    var strongCusp=FR.madhyaOf(SB_DIG[p]), weak=(strongCusp+180)%360;
    var dd=Math.abs(((sid-weak)%360+360)%360); if(dd>180)dd=360-dd;
    var dig=dd/3;
    // --- Kala ---
    var x=Math.abs(birthH-12); var frac=1-x/12;                    // 1 at noon, 0 at midnight
    var nath=(p==="Mercury")?60:((SB_DAY.indexOf(p)>=0)?60*frac:60*(1-frac));
    /* PAKṢA BALA — and two places Śrīpati's commentator parts from BPHS.
       BPHS Ch.27 vv.10–11: Mercury is a malefic when conjunct a malefic, the
       Moon is a malefic in the dark half, and the Moon's pakṣa is "always
       doubled just as the Sun's Ayana bala".
       Sastri's Śrīpatipaddhati treats Mercury as ALWAYS benefic and the Moon
       as benefic whether waxing or waning (p.38), and his worked table does
       NOT double the Moon — ·518 there is the undoubled value, and his Kāla
       Bala total of 2·050 for the Moon is built from it. His text does say to
       double; his arithmetic does not. As with the ±1 rūpa in bhāva bala, the
       table is followed over the prose where the table is internally
       consistent and reproducible, and the divergence is recorded rather than
       reconciled. */
    var pakBen=(FR.mode==="sripati")
      ? (["Jupiter","Venus","Mercury","Moon"].indexOf(p)>=0)
      : (SB_BEN.indexOf(p)>=0);
    var paksha=pakBen?pakshaArc/3:60-pakshaArc/3;
    if(p==="Moon" && FR.mode!=="sripati") paksha*=2;
    var tribhaga=(p===tribhagaLord||p==="Jupiter")?60:0;
    var lordBala=0;
    if(p===varshaLord)lordBala+=15; if(p===masaLord)lordBala+=30;
    if(p===DAYLORD[weekday])lordBala+=45; if(p===horaLord)lordBala+=60;
    var dsign=(p==="Moon"||p==="Saturn")?-1:1;
    /* Ayana Bala — BPHS Vol. 1, Ch. 27, vv. 15–17. The sage's Khanda method
       (45/33/12) is summarised in the translator's note as the closed form
       (23°27' ± Kranti) × 1.2793, where 1.2793 = 60 / (2 × 23°27'): the half
       range is the obliquity, so the value is 30 virupas at zero declination,
       a full rupa at maximum favourable declination and nil at maximum
       adverse declination. This used to read 60*(24+decl)/48, whose half
       range of 24° is not the obliquity — it returned 59.3 instead of a full
       rupa at one extreme and 0.7 instead of nil at the other. We use the
       obliquity OF DATE rather than the note's fixed 23°27' because ctx.decl
       is itself computed with the true obliquity, so the two now agree
       exactly at the extremes. Max |difference| from the old constant is
       0.70 virupa (1.40 for the Sun, whose Ayana Bala is doubled). */
    /* ŚRĪPATI USES A DIFFERENT HALF RANGE, AND IT IS NOT A ROUNDING OF THIS.
       Śrīpatipaddhati Adh. 3, śl. 15–15½ (Subrahmanya Sastri 1937, p.44) divides
       by "the maximum declination, i.e. 24°" and fixes the scale with "the
       Ayanabala of a planet at the Equator is ½ a Rupa", which reduces to
       (24 + signed declination)/48 rūpa. His worked example gives the Sun
       ·8099 from a declination of 14°52.6'N and his table prints ·810.
       24° is the classical parama-krānti, a stated constant of that system,
       not an approximation to the true obliquity — so under his paddhati the
       value deliberately does NOT reach exactly 60 or exactly 0 at the real
       extremes, and forcing it to would be modernising his text.
       This is the constant the engine carried before the BPHS correction
       above: it was Śrīpati's number sitting in a BPHS computation. It now
       sits where it belongs. */
    var Tay=Tof(jd), OBL=23.439291111-0.0130041667*Tay-1.638e-7*Tay*Tay;
    var ayHalf=(FR.mode==="sripati")?24:OBL;
    var ayana=60*(ayHalf+dsign*(decl[p]||0))/(2*ayHalf); if(p==="Sun")ayana*=2;
    ayana=Math.max(0,Math.min(p==="Sun"?120:60,ayana));
    var kala=nath+paksha+tribhaga+lordBala+ayana;
    // --- Cheshta ---
    var cheshta;
    if(p==="Sun") cheshta=Math.min(60,ayana); else if(p==="Moon") cheshta=Math.min(60,paksha);
    else cheshta=Math.max(0,Math.min(60,(cheshtaK[p]||0)/3));
    // --- Naisargika & Drik ---
    var nais=SB_NAIS[p];
    /* Drik Bala — BPHS Vol. 1, Ch. 27, v. 19. The verse first gives the
       quarter rule: a quarter of the Drishti Pinda is taken off for malefic
       aspect and a quarter added for benefic. Its last clause is the one at
       issue here: "Super add the entire aspect of Mercury and Jupiter to get
       the net strength of a planet." (Quoted only as far as the decision
       below turns on it; quotation-verify.mjs keeps it that way.)
     *
     * THE QUARTER RULE IS APPLIED. THE SUPER-ADD CLAUSE IS DELIBERATELY NOT,
     * and this is a decision on record, not an oversight — please do not
     * "fix" it without reading claude/bala-and-virupa-audit.md first.
     *
     * Both readings were implemented and measured on the reference charts:
     * adding Mercury's and Jupiter's entire Drishti Pinda ON TOP of the
     * quarter, and adding it IN PLACE of the quarter. Under either, Drik Bala
     * came out positive for every graha in every chart tested (Sun -11.9 ->
     * +36.6, Moon -13.2 -> +79.0 on the 1990 reference), which empties the
     * verse's own first clause of any effect, and nearly every graha then
     * cleared its required minimum, which would leave the thresholds of
     * vv. 32-33 with nothing to measure. Those thresholds are themselves
     * source data, so a reading that voids them is in tension with the text.
     * The clause is terse and its scope is genuinely unclear, so rather than
     * pick a reading silently we keep the unambiguous part and DISCLOSE the
     * omission in the report's Shadbala section. */
    var drik=0;
    /* Śrīpati's dṛṣṭi under his paddhati — a different function, not a
       variant; see sripatiDrishti. He also does not extend dṛṣṭi to the
       nodes, so under his reckoning the list is the seven. */
    var DRGF=(FR.mode==="sripati")?sripatiDrishti:sphutaDrishti;
    var seers=(FR.mode==="sripati")?names:names.concat(["Rahu","Ketu"]);
    seers.forEach(function(q){ if(q===p||!P[q])return;
      var v=DRGF(q,P[q].sid,P[p].sid);
      if(!v)return;
      drik += (SB_BEN.indexOf(q)>=0? v : -v)/4;
    });
    var total=sthana+dig+kala+cheshta+nais+drik;
    out.push({graha:p,sthana:sthana,uchcha:uchcha,saptavargaja:sapta,ojha:ojha,kendradi:kendradi,
      drekkana:drekBala,dig:dig,kala:kala,nathonnatha:nath,paksha:paksha,tribhaga:tribhaga,
      lord_bala:lordBala,ayana:ayana,cheshta:cheshta,naisargika:nais,drik:drik,
      total_virupa:total,total_rupa:total/60,required_rupa:SB_REQ[p],ratio:(total/60)/SB_REQ[p]});
  });
  /* YUDDHA — PLANETARY WAR, applied to strength, by each paddhati's rule.
   *
   * Until now the engine REPORTED a war (yuddhaOf) and changed nothing: no
   * victor, no transfer of strength, under either toggle. Both texts say what
   * to do, and they disagree, so each paddhati gets its own:
   *
   * WHO IS AT WAR. Two of the five tārā grahas — Mars, Mercury, Jupiter, Venus,
   * Saturn — less than one degree apart (BPHS Vol. 2, Ch. 79, v. 9; Śrīpati's
   * commentator, p. 47, the same). The luminaries never fight.
   *
   * WHO WINS.
   *   BPHS Ch. 79 v. 9: "Venus is the conqueror whether he is in North or South,
   *     but amongst the other four only one, who is in the North, is the
   *     conqueror." North = the greater ecliptic latitude.
   *   Śrīpati śl. 15½–16½ (p. 47): the victorious planet is the one "in the
   *     North"; no exception for Venus.
   *
   * HOW MUCH.
   *   BPHS Ch. 27 v. 20: "the difference between the Shadbalas of the two should
   *     be added to the victor's shadbala and deducted from the Shadbala of the
   *     vanquished."
   *   Śrīpati śl. 15½–16½: the difference in total strength "should be divided by
   *     the difference in their latitudes; the result is to be added to the
   *     strength of the victorious planet in the North and subtracted from that
   *     of the vanquished planet in the South."
   *   The verse does not name the unit of latitude, and the book works no
   *     example. DEGREES are taken, and said to be taken: at a 1° difference in
   *     latitude his rule then reduces exactly to Parāśara's, which his own
   *     commentator quotes beside it as the same operation. Strength is in
   *     virūpas, as everywhere in this file.
   *
   * Pairs are judged on the PRE-WAR totals, so the order in which pairs are
   * visited cannot change the answer when three grahas fight at once.
   * Equal latitudes leave no north and no south: no victor, no transfer, and
   * the war is still reported. */
  (function(){
    /* read the frame HERE: `sripatiMode` is declared further down, and a hoisted
       var is undefined at this point — so every Śrīpati chart got the BPHS rule
       until yuddha-bala-verify.mjs named the victor and found it wrong */
    var sripatiMode=(FR.mode==="sripati");
    var TARA=["Mars","Mercury","Jupiter","Venus","Saturn"], byG={}, pre={}, wars=[];
    out.forEach(function(r){ byG[r.graha]=r; pre[r.graha]=r.total_virupa; r.yuddha=0; });
    for(var i=0;i<TARA.length;i++) for(var j=i+1;j<TARA.length;j++){
      var a=TARA[i], b=TARA[j], pa=P[a], pb=P[b];
      if(!pa||!pb||!byG[a]||!byG[b]) continue;
      var sep=Math.abs(((pa.sid-pb.sid)%360+540)%360-180);
      if(!(sep<1)) continue;
      var la=pa.lat, lb=pb.lat, w={grahas:[a,b], separation_deg:sep,
        latitude_deg:[la==null?null:la, lb==null?null:lb], victor:null, vanquished:null,
        transfer_virupas:0};
      if(la!=null&&lb!=null&&la!==lb){
        var north=la>lb?a:b, south=la>lb?b:a;
        var victor=north;
        if(!sripatiMode&&(a==="Venus"||b==="Venus")) victor="Venus";
        var vanq=(victor===a)?b:a;
        var diff=Math.abs(pre[a]-pre[b]);
        var amt=sripatiMode?diff/Math.abs(la-lb):diff;
        w.victor=victor; w.vanquished=vanq; w.transfer_virupas=amt;
        w.rule=sripatiMode
          ?"Śrīpatipaddhati śl. 15½–16½ (Sastri, p. 47): the northern graha wins; "+
           "|Δ ṣaḍbala| ÷ |Δ latitude in degrees| moves from the southern to the northern"
          :"BPHS Vol. 2 Ch. 79 v. 9 (Venus always wins, otherwise the northern graha) "+
           "and Vol. 1 Ch. 27 v. 20 (the full difference of ṣaḍbalas moves to the victor)";
        if(sripatiMode) w.unit_note="The verse does not name the unit of latitude; degrees "+
          "are used, under which a 1° latitude difference reproduces Parāśara's rule.";
        byG[victor].yuddha+=amt; byG[vanq].yuddha-=amt;
      } else w.rule="equal or unknown latitudes: no north or south, so no victor";
      wars.push(w);
    }
    out.forEach(function(r){
      if(!r.yuddha) return;
      r.total_virupa+=r.yuddha; r.total_rupa=r.total_virupa/60;
      r.ratio=r.total_rupa/r.required_rupa;
    });
    out.yuddha=wars;
  })();
  /* IṢṬA AND KAṢṬA PHALA — and the misattribution this replaces.
   *
   * The report computed these itself as √(uchcha × cheṣṭa) and
   * √((60−uchcha) × (60−cheṣṭa)), and told the reader "BPHS derives two
   * opposed potencies … each is the geometric mean of the two rays."
   * The geometric mean is NOT BPHS. It is Śrīpati's, reaching us through
   * Keśava Daivajña's compression of Adh. 4, śl. 6 (Sastri 1937, p.60):
   *     iṣṭa = √(uchchabala × cheṣṭabala),  kaṣṭa = √((1−u) × (1−c)).
   *
   * BPHS Ch. 28, v. 6 states something else entirely, in plain words:
   *     "Reduce 1 from each of Cheshta Rasmi and Uchcha Rasmi. Then multiply
   *      the products by 10 and add together. Half of the sum will represent
   *      the Ishta phala. Reduce Ishta Phala from 60 to obtain the Kashta."
   * With raśmi = 6 × bala_rūpa + 1 (v.2 and vv.3–4), that collapses to the
   * ARITHMETIC mean in virūpas: iṣṭa = (uchcha + cheṣṭa)/2, kaṣṭa = 60 − iṣṭa.
   * Arithmetic, not geometric, and the complement is taken once on the total
   * rather than on each factor — so the two give genuinely different
   * orderings, not a rescaling of one another.
   *
   * Presenting later tradition as an explicit BPHS verse is the one thing
   * this project's source rules forbid outright, so each paddhati now gets
   * its own formula and its own citation, and the report prints what it was
   * given instead of deriving a third thing.
   *
   * One subtlety worth recording: the shortcut raśmi = 6 × bala + 1 does NOT
   * hold for the Sun. Its cheṣṭabala is DEFINED as its ayanabala (Ch. 27, v. 18),
   * while its cheṣṭa RAŚMI comes from a real cheṣṭākendra of sāyana Sun + 3
   * rāśis (Ch.28 vv.3–4). Śrīpati's own worked example shows the gap: ·810
   * would imply a raśmi of 5·86, and his table prints 5·317. Both formulas
   * below are therefore expressed in BALA, which is what this engine has and
   * what both texts' closed forms consume. */
  var sripatiMode=(FR.mode==="sripati");
  out.forEach(function(r){
    var u=Math.max(0,Math.min(60,r.uchcha)), c=Math.max(0,Math.min(60,r.cheshta));
    if(sripatiMode){
      r.ishta=Math.sqrt(u*c);
      r.kashta=Math.sqrt((60-u)*(60-c));
      r.ishta_kashta_rule="geometric";
      r.ishta_kashta_source="Śrīpatipaddhati, Adh. 4, śl. 6 (Keśava Daivajña's form)";
    }else{
      r.ishta=(u+c)/2;
      r.kashta=60-r.ishta;
      r.ishta_kashta_rule="arithmetic";
      r.ishta_kashta_source="BPHS, Vol. 1, Ch. 28, v. 6";
    }
    /* Ch. 28, v. 7 / Adh. 4, śl. 7: both texts then weight the Ṣaḍbala by these. */
    r.ishta_shadbala=r.total_virupa*(r.ishta/60);
    r.kashta_shadbala=r.total_virupa*(r.kashta/60);
  });
  /* MINIMUM STRENGTH UNDER EACH HEAD, not only in the total.
   * BPHS Ch.27 vv.34–36 and Śrīpati p.56 both group the grahas three ways and
   * give five figures each — Sthāna, Dig, Kāla, Cheṣṭa, Ayana. The total
   * requirement (vv.32–33 / p.56) was already here; these were not, so a
   * graha could clear its Ṣaḍbala piṇḍa on one swollen component while
   * failing every other head, and nothing said so.
   * The two texts agree on fourteen of the fifteen figures. They differ on
   * ONE: the Dig Bala required of Mars and Saturn, 30 in BPHS and 20 in
   * Śrīpati. A single digit in two OCR'd editions is exactly the kind of
   * difference not to adjudicate, so each paddhati carries its own and the
   * divergence is named rather than averaged away. */
  var SB_GROUP={Jupiter:"A",Mercury:"A",Sun:"A",Moon:"B",Venus:"B",Mars:"C",Saturn:"C"};
  var SB_COMP_MIN={
    bphs:   {A:{sthana:165,dig:35,kala:50,cheshta:112,ayana:30},
             B:{sthana:133,dig:50,kala:30,cheshta:100,ayana:40},
             C:{sthana:96, dig:30,kala:40,cheshta:67, ayana:20}},
    sripati:{A:{sthana:165,dig:35,kala:50,cheshta:112,ayana:30},
             B:{sthana:133,dig:50,kala:30,cheshta:100,ayana:40},
             C:{sthana:96, dig:20,kala:40,cheshta:67, ayana:20}}};
  out.forEach(function(r){
    var req=SB_COMP_MIN[sripatiMode?"sripati":"bphs"][SB_GROUP[r.graha]];
    r.required_components=req;
    r.components_met={sthana:r.sthana>=req.sthana, dig:r.dig>=req.dig,
      kala:r.kala>=req.kala, cheshta:r.cheshta>=req.cheshta, ayana:r.ayana>=req.ayana};
    r.components_met_count=["sthana","dig","kala","cheshta","ayana"]
      .filter(function(k){return r.components_met[k];}).length;
  });
  out.sort(function(a,b){return b.ratio-a.ratio;});
  return {planets:out,
    /* the wars and what each did to strength (see YUDDHA above); kept here,
       not as a property of the array, which JSON would silently drop */
    yuddha:out.yuddha||[],
    /* Śrīpati's second iṣṭa/kaṣṭa, through the seven vargas (Adh. 4 śl. 8–11).
       His method, so computed only under his paddhati; under BPHS the field says
       why it is absent rather than being missing. */
    saptavarga_ishta_kashta:(FR.mode==="sripati")
      ? (function(){
          var lon={}; ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]
            .forEach(function(g){ if(P[g]) lon[g]=P[g].sid; });
          var res=sripatiSaptavargaIK(lon, function(g){ return FR.houseOfLon(lon[g]); }, vargaSign);
          return {method:"Śrīpatipaddhati, Adh. 4 śl. 8–11 (Sastri pp. 65–68), the Yavana method",
            units:"rūpa", grahas:res,
            note:"Good = 1 exaltation, ¾ mūlatrikoṇa, ½ own, ⅜ very friendly, ¼ friendly, ⅛ neutral, "+
              "1/16 inimical, 1/32 very inimical, 0 debilitation; evil = 1 − good; half weight in the six "+
              "vargas other than the rāśi. Paṅkti: Gṛha = total ÷ 4, the other six rows half of that. "+
              "His worked table (p. 66) scores neither exaltation nor debilitation separately — the Sun in "+
              "Meṣa is ⅜, Saturn in Meṣa ⅛ — and is followed; the verse's own reading, which does score "+
              "them, is given as verse_reading."};
        })()
      : {applies:false, reason:"A Śrīpati method; this chart is cast on the BPHS paddhati, whose "+
          "iṣṭa/kaṣṭa is Ch. 28 v. 6 (ishta/kashta above)."},
    /* WHICH SIX, AND WHERE AYANA SITS. BPHS folds Ayana into Kāla and makes
       Dṛk the sixth head (Ch.27, the list before v.1). Śrīpati counts Ayana
       as its own head and treats dṛṣṭi as a ±¼ modifier on the rest rather
       than as a member (Adh.3 śl.20, and his table p.52).
       The TOTAL is the same number either way — this engine's kala already
       contains ayana and its drik is already quartered — so this is a
       presentational difference and is reported as one. Saying so is the
       point: a reader comparing these columns against either book should not
       have to work out why the headings differ. */
    composition:sripatiMode
      ? {heads:["sthana","kala","dig","ayana","cheshta","naisargika"],
         drishti:"a quarter of the benefic aspect added and a quarter of the "+
                 "malefic subtracted, as a modifier rather than a sixth head",
         source:"Śrīpatipaddhati, Adh. 3, śl. 20"}
      : {heads:["sthana","dig","kala","cheshta","naisargika","drik"],
         drishti:"Dṛk Bala is the sixth head; Ayana Bala is included within "+
                 "Kāla Bala and is also reported separately",
         source:"BPHS, Vol. 1, Ch. 27"},
    required_components_note:sripatiMode
      ? "Per-head minima from Śrīpatipaddhati p.56. These differ from BPHS "+
        "Ch. 27 vv. 34–36 in one figure only: the Dig Bala required of Mars "+
        "and Saturn is 20 here and 30 there."
      : "Per-head minima from BPHS, Vol. 1, Ch. 27, vv. 34–36. Śrīpati p.56 "+
        "gives the same fifteen figures but requires 20 rather than 30 Dig "+
        "Bala of Mars and Saturn.",
    ishta_kashta_note:sripatiMode
      ? "Iṣṭa is the geometric mean of the exaltation and motional strengths and "+
        "Kaṣṭa the geometric mean of their complements — Śrīpati's rule "+
        "(Adh. 4, śl. 6), not BPHS's. BPHS Ch. 28 v. 6 gives an arithmetic rule "+
        "instead, and the two rank the grahas differently."
      : "Iṣṭa is half the sum of the exaltation and motional rays less one, "+
        "times ten, and Kaṣṭa is its complement from 60 — BPHS Ch. 28 v. 6, "+
        "which in bala terms is the arithmetic mean. Śrīpati (Adh. 4, śl. 6) "+
        "uses a geometric mean instead; that is later tradition, not this verse.",
    context:{day_birth:isDay,hora_lord:horaLord,tribhaga_lord:tribhagaLord,
    weekday_lord:DAYLORD[weekday],varsha_lord:varshaLord,masa_lord:masaLord,
    sunrise:sunrise,sunset:sunset,paksha_arc:pakshaArc}};
}


/* astronomical inputs for Shadbala */
function declOf(name,date){
  var eq=Astronomy.Equator(Astronomy.Body[BODY[name]],date,new Astronomy.Observer(0,0,0),true,true);
  return eq.dec;
}
/* ===== the sunrise convention =============================================
   Everything dated in this project hangs off sunrise. The tithi running AT
   sunrise names the day, so the convention chosen here decides festival dates,
   the vāra, the ghaṭikā count and the daśā boundaries that follow from them.
   It was previously implicit — whatever Astronomy.SearchRiseSet happens to do —
   which is a poor state for a number that moves a day label.

   MEASURED, NOT ASSUMED. SearchRiseSet places the Sun's geometric centre at
   −0.8339° at the moment it calls sunrise, which is the classical almanac
   convention: the upper limb touching the horizon, with 34′ of standard
   refraction, using the true semidiameter of the day rather than a mean. That
   is the same convention a printed pañcāṅga and the dṛk-gaṇita almanacs use for
   sūryodaya, so it stays the default — but it is now named on screen and can be
   changed, because the alternatives are defensible and the differences are not
   negligible:

     upper limb + refraction  −(34′ + semidiameter)   the default, ≈ −0.834°
     centre + refraction      −34′                    74 s later at 28.8°N
     geometric centre          0°                     232 s later

   Four minutes is small, and it is not nothing: a tithi boundary falling inside
   that window labels the day differently. Measured over 730 days at 28.8°N, the
   geometric convention moves the tithi-at-sunrise on 2 of them and the centre
   convention on none — about one day a year, which is precisely the sort of
   discrepancy a reader comparing this against their own pañcāṅga would otherwise
   have no way to account for. Sunset moves by the same amount the other way.

   ONE TRAP, for anything that iterates days. Do not search forward from UTC
   midnight. At longitudes where sunrise falls near 00:00 UTC — the whole of India
   in summer — midnight sits between two conventions' answers for the same
   morning, and the search returns sunrises 24 hours apart for a 4-minute
   difference in definition. Anchor on local noon, or walk forward from well
   before, as dayStart() on the now page does. This was found by a measurement
   disagreeing with its own arithmetic by thirteen-fold; nothing threw.

   Refraction is a real atmosphere and 34′ is a convention about it, not a
   measurement of it; temperature and pressure move the true value by minutes.
   The default is the one the almanacs agree on, not the one that is "correct". */
var K_RISE_CONV={
  limb:   {alt:null,    label:"upper limb, 34′ refraction"},
  centre: {alt:-0.5667, label:"centre of disc, 34′ refraction"},
  geom:   {alt:0,       label:"geometric centre, no refraction"}
};
var K_RISE_DEFAULT="limb";
/* One search, one convention, used by the chart report, the now page and the
   calendar alike. `dir` is +1 for rise and −1 for set. Null where there is none
   to find — a polar day has no sunrise and a fiction is worse than a gap. */
function kRiseSet(body,lat,lon,fromDate,days,dir,conv){
  var obs=new Astronomy.Observer(lat,lon,0), r;
  var C=K_RISE_CONV[conv||K_RISE_DEFAULT]||K_RISE_CONV[K_RISE_DEFAULT];
  try{
    if(C.alt==null) r=Astronomy.SearchRiseSet(Astronomy.Body[body],obs,dir,fromDate,days);
    else r=Astronomy.SearchAltitude(Astronomy.Body[body],obs,dir,fromDate,days,C.alt);
  }catch(e){ return null; }
  return r?r.date:null;
}
function sunriseSunset(date,lat,lon,conv){
  var d0=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),0,0,0));
  return {rise:kRiseSet("Sun",lat,lon,d0,2,+1,conv),
          set: kRiseSet("Sun",lat,lon,d0,2,-1,conv)};
}
/* cheshta kendra: arc from the planet's seeghrocca (Sun's mean longitude for outer planets,
   the planet's own heliocentric longitude for Mercury and Venus) */
function cheshtaKendra(date,ay,pos){
  var T=Tof(jdFromUTC(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate(),
        date.getUTCHours()+date.getUTCMinutes()/60));
  var sunMean=norm(280.46646+36000.76983*T);            // tropical mean longitude of the Sun
  var out={};
  ["Mars","Jupiter","Saturn"].forEach(function(p){
    var a=Math.abs(norm(norm(sunMean-ay)-pos[p].sid)); if(a>180)a=360-a; out[p]=a; });
  ["Mercury","Venus"].forEach(function(p){
    var hv=Astronomy.Ecliptic(Astronomy.HelioVector(Astronomy.Body[BODY[p]],date)).elon;
    var a=Math.abs(norm(norm(hv-ay)-pos[p].sid)); if(a>180)a=360-a; out[p]=a; });
  return out;
}
/* weekday lord of the day the Sun entered the current sidereal sign / the sidereal year */
function sankrantiWeekday(jd,date,targetLon){
  var t=date.getTime();
  for(var k=0;k<60;k++){
    var d=new Date(t), j2=jd+(t-date.getTime())/86400000;
    var lon=norm(tropLon("Sun",d)-ayanamsa(j2));
    var diff=((lon-targetLon+180)%360+360)%360-180;
    if(Math.abs(diff)<1e-5)break;
    t-=diff/0.9856*86400000;
  }
  var jdx=jd+(t-date.getTime())/86400000;
  return (Math.floor(jdx+1.5)%7+7)%7;
}

try{ window.__AVT=AVT; window.__ayan=ayanamsa;
     window.__ayanModes=AYAN_MODES; window.__setAyan=setAyanamsaMode;
     window.__pageAyan=function(){ var a=pageAyan(); return a?effectiveAyan(a):a; };
     window.__pageAyanRequested=pageAyan; window.__pageAyanRule=pageAyanRule;
     /* the engine: read, set, and what this page would use */
     window.__engine=function(){ return {mode:ENGINE_MODE, frame:SS_FRAME, name:ENGINE_MODES[ENGINE_MODE],
       ayan:AYAN_MODE, requestedAyan:REQ_AYAN}; };
     window.__setEngine=setEngineMode; window.__pageEngine=pageEngine;
     window.__engineModes=ENGINE_MODES; window.__engineLocked=function(){ return !!PAGE_ENGINE_LOCK[pageFile()]; };
     window.__kTrop=tropLon; window.__kTropModern=tropLonModern; window.__kLat=eclLat;
     /* the name a caption should print for the frame in use */
     window.__ayanName=function(m){ m=m||AYAN_MODE; if(m==="lahiri") return "Lahiri";
       if(m==="ss_engine") return "the Sūrya Siddhānta's own zero";
       return AYAN_MODES[m]?AYAN_MODES[m].name:m; };
     window.__ayanFor=ayanamsaFor;
     /* The star catalogues store sidereal longitude under Lahiri (J2000). In any
        other frame every star moves by the difference between the two
        ayanāṃśas — the re-basing the star wheel has always done; these two
        helpers let every other drawing of the stars do the same. */
     window.__starShift=function(mode,jd){ jd=jd||(Date.now()/86400000+2440587.5);
       return ayanamsaFor("lahiri",jd)-ayanamsaFor(mode||AYAN_MODE,jd); };
     window.__framedStars=function(list,mode,jd){ var d=window.__starShift(mode,jd);
       if(!list||Math.abs(d)<1e-9) return list;
       return list.map(function(y){ var o={},k; for(k in y) o[k]=y[k]; o.sid=norm(y.sid+d);
         if(y.id!=null&&y.nak) o.inside=Math.floor(o.sid/(40/3))===y.id; return o; }); };
     /* The divisional formulas exist twice: here, where a graha's varga sign is
        computed, and in the report's vargaLagna, which does the same arithmetic
        for the lagna. Two copies of sixteen formulas is two chances to diverge,
        and a divergence would be invisible — both would return a plausible
        sign. Exposing this one lets the suite assert that the two agree across
        the whole zodiac, rather than leaving it to a reading of the source. */
     window.__vargaSign=vargaSign;
     /* The certified window, so the report and the ayanāṃśa pane can say what
        a date outside it costs instead of leaving a reader to assume there is
        no cost. SPAN_BANDS travels with it so the band's figures can be
        asserted against the committed measurement rather than retyped. */
     window.__kSpan=spanStatus; window.__kSpanBands=SPAN_BANDS;
     window.__kSpanWindow=SPAN; }catch(e){}
/* sidereal lagna for the birth input shifted by offMin minutes — used by the birth-time check */
/* The pañcāṅga primitives, exposed for pages outside the report bundle. now.html
   and the calendar both need the tithi, the māsa and the ṛtu at an arbitrary
   instant, and they must be the engine's own: a second implementation is free to
   drift, and a calendar that disagreed with the chart report about which tithi it
   is would be worse than no calendar.

   These sit HERE, beside the other window.__k exports, because this file is wrapped
   in an IIFE — appended at the end of the file they are outside it and cannot see
   a single one of the functions they call. */
window.__kPanchang=function(sunSid,moonSid,jd){ return panchang(sunSid,moonSid,jd); };
window.__kMasa=function(sunSid,moonSid,ayan,sunAtNewMoon){
  return masaOf(sunSid,moonSid,ayan,sunAtNewMoon); };
window.__kNak=function(deg){ return nak(deg); };
window.__kJD=function(ms){ return ms/86400000+2440587.5; };
/* Geocentric distance in kilometres, and equatorial coordinates of date.

   Both come straight out of the vendored ephemeris and neither was exposed,
   so anything wanting the Moon's distance (perigee, apogee, the apparent size
   that makes a "supermoon") or a body's right ascension and declination (the
   tilt of the crescent, solar declination, the shadow of a gnomon) had to
   either reach inside this file or re-derive what is already computed here. */
window.__kDist=function(name,ms){
  try{
    var v=Astronomy.GeoVector(Astronomy.Body[BODY[name]],new Date(ms),true);
    return Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z)*149597870.7;
  }catch(e){ return null; }
};
/* Heliocentric ecliptic longitude and radius, which is what a Sun-centred
   drawing needs and what every other export here cannot give: everything else
   in this file is geocentric, because a chart is cast from the Earth. The
   orbit figures — the Venus rose and its relatives — are the one place the
   real heliocentric geometry is the subject rather than a step on the way. */
window.__kHelio=function(name,ms){
  try{
    /* BODY maps the GRAHAS, and Earth is not one — a chart is cast from it,
       never of it. A Sun-centred drawing needs it like any other planet, so the
       name falls through when the map has no entry. Without this the rose drew
       nothing at all and the scene reported a thrown error, which looks on a
       canvas exactly like a scene that is still loading. */
    var key=BODY[name]||name;
    var v=Astronomy.HelioVector(Astronomy.Body[key],new Date(ms));
    var e=Astronomy.Ecliptic(v);
    return {lon:norm(e.elon), lat:e.elat,
            r:Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z)};
  }catch(e){ return null; }
};
/* FULL STATE VECTORS, heliocentric, in AU and AU per day.

   Everything else exported here is an angle, because a chart is made of
   angles. A simulation is not: to integrate the equations of motion you need
   where a body is in three dimensions and how fast it is going, and no
   combination of longitudes will give you that.

   The velocity is a central difference rather than an analytic derivative,
   because the library gives positions and the derivative of a position is
   what a velocity is. The step is a hundredth of a day — small enough that
   the second-order error is below the position accuracy, large enough that
   the subtraction of two nearly equal numbers does not lose precision.

   The Moon is handled apart: its heliocentric place is the Earth's plus its
   own geocentric one, which is both exact and the only form the library is
   certain to supply. */
window.__kState=function(name,ms){
  try{
    var h=0.01;                                  /* days */
    function at(t){
      var d=new Date(t);
      if(name==="Moon"||name==="Candra"){
        var e=Astronomy.HelioVector(Astronomy.Body.Earth,d);
        var m=Astronomy.GeoVector(Astronomy.Body.Moon,d,false);
        return {x:e.x+m.x, y:e.y+m.y, z:e.z+m.z};
      }
      if(name==="Sun"||name==="Sūrya") return {x:0,y:0,z:0};
      var key=BODY[name]||name;
      return Astronomy.HelioVector(Astronomy.Body[key],d);
    }
    /* ROTATED INTO THE ECLIPTIC FRAME. The library returns equatorial J2000
       vectors, in which the Earth's orbit is inclined by the obliquity and
       the Moon's by the obliquity plus its own five degrees — both true and
       both useless for this purpose. The plane this subject lives in is the
       ecliptic: a plan view should be the plane of the solar system, and an
       inclination should be the five degrees everyone means by the Moon's
       inclination. One rotation about x by the obliquity of J2000. */
    var EPS=23.439291111*Math.PI/180, CE=Math.cos(EPS), SE=Math.sin(EPS);
    function ecl(v){ return {x:v.x, y:v.y*CE+v.z*SE, z:-v.y*SE+v.z*CE}; }
    var dt=h*86400000;
    var a=ecl(at(ms-dt)), b=ecl(at(ms+dt)), c=ecl(at(ms));
    return { x:c.x, y:c.y, z:c.z,
             vx:(b.x-a.x)/(2*h), vy:(b.y-a.y)/(2*h), vz:(b.z-a.z)/(2*h) };
  }catch(e){ return null; }
};
window.__kEquator=function(name,ms,lat,lon){
  try{
    var obs=new Astronomy.Observer(lat||0,lon||0,0);
    var eq=Astronomy.Equator(Astronomy.Body[BODY[name]],new Date(ms),obs,true,true);
    return {ra:eq.ra, dec:eq.dec, dist:eq.dist*149597870.7};
  }catch(e){ return null; }
};
/* The sunrise convention, shared rather than reimplemented. The now page and the
   calendar date their days with the same function the chart report does, so the
   two can never drift into disagreeing about which day it is. */
window.__kRiseSet=function(body,lat,lon,fromMs,days,dir,conv){
  var d=kRiseSet(body,lat,lon,new Date(fromMs),days,dir,conv);
  return d?d.getTime():null;
};
window.__kRiseConv=function(){
  var out={def:K_RISE_DEFAULT, list:[]};
  for(var k in K_RISE_CONV) if(K_RISE_CONV.hasOwnProperty(k))
    out.list.push({key:k, label:K_RISE_CONV[k].label, alt:K_RISE_CONV[k].alt});
  return out;
};
window.__kAsc=function(inp,offMin){
  var ut=inp.hour+inp.minute/60+(offMin||0)/60-inp.tzHours;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var date=new Date(Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000);
  return ascendant(jd,date,inp.lat,inp.lon,ayanamsa(jd));
};
/* sidereal longitude of a graha at any instant — used by the timeline, events and Now panel */
/* Sidereal longitude AND geocentric ecliptic latitude together.
   tropLon() has the latitude in hand at line 67 and throws it away, because
   every chart calculation on this site needs only the longitude. The graha
   yuddha scene needs the other one: BPHS Vol. 2, Ch. 79 decides the victor by
   which planet stands to the north, and north of the ECLIPTIC — the śara or
   vikṣepa — is a latitude, not a declination. Returning both from one call
   also guarantees the pair are read at the same instant. */
window.__kEclipModern=function(name,ms){
  var key=BODY[name]||name;
  if(!Astronomy.Body[key]) return null;
  var date=new Date(ms), jd=ms/86400000+2440587.5;
  var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[key],date,true));
  return {lon:norm(ev.elon-ayanamsa(jd)), trop:norm(ev.elon), lat:ev.elat};
};
/* the same, from whichever engine is in force; comparison code that needs the
   modern sky whatever the reader chose calls __kEclipModern */
window.__kEclip=function(name,ms){
  if(ENGINE_MODE==="modern"||!SS_NAME[name]) return window.__kEclipModern(name,ms);
  var date=new Date(ms), jd=ms/86400000+2440587.5, t=tropLon(name,date);
  return {lon:norm(t-ayanamsa(jd)), trop:t, lat:eclLat(name,date)};
};
/* The Śrīpati construction, exposed from the engine under the name the
   build spec asks for. The arithmetic lives in the report module that owns
   it; this is the door, so a caller that has the engine and nothing else
   can still build the houses. */
/* The report bundle needs the aspect formula itself, not only the Drik Bala it feeds,
   to publish a quantitative graha-drishti matrix. Exported rather than copied, so the
   matrix and Drik Bala can never disagree. */
window.sphutaDrishti=sphutaDrishti;
/* exported so the analyst payload can cast its dṛṣṭi matrix with the SAME
   function the Ṣaḍbala used. Without this it built the matrix from the BPHS
   speculum whatever the paddhati, so a Śrīpati export carried a dṛṣṭi table
   that disagreed with its own Drik Bala — under a note claiming the two came
   from one formula. */
window.sripatiDrishti=sripatiDrishti;
window.sripatiSaptavargaIK=function(lon,bhavaOf){ return sripatiSaptavargaIK(lon,bhavaOf,vargaSign); };
/* Dignity, published so a page can ask the engine rather than restate the
   tables. digOf is what every dignity on this site is decided by; exporting
   it means the graha page and the chart report cannot disagree about whether
   a graha is in its own sign. Additive — nothing here changes behaviour. */
window.__kDign={of:digOf,EXALT:EXALT,DEBIL:DEBIL,OWNS:OWNS,MTR:MTR,FRD:FRD,ENM:ENM,LORD:LORD};
/* Viṃśottarī, as a table and as the one function that turns a Moon's sidereal
   longitude into the daśā running at birth. Published for the same reason as
   the dignity tables above: the report has this, and so did two pages, each
   from its own copy. A page that asks here cannot drift from the report, and
   engine-verify asserts the balance this computes equals the one the chart
   report arrives at independently. Additive; nothing in the engine changes. */
var VIMS_ORDER=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"],
    VIMS_YEARS={Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
window.__kVims={
  order:VIMS_ORDER, years:VIMS_YEARS, total:120,
  /* nakṣatra index 0-26 → its lord: the nine in order, three times round */
  lordOfNak:function(i){ return VIMS_ORDER[((i%27)+27)%27%9]; },
  /* the mahādaśā running at birth and its unspent remainder, in years */
  atMoon:function(sid){
    var seg=40/3, mn=((sid%360)+360)%360, ni=Math.floor(mn/seg);
    var lord=VIMS_ORDER[ni%9], full=VIMS_YEARS[lord];
    var frac=(mn-ni*seg)/seg;
    return {nak:ni, lord:lord, full:full, elapsed:frac,
            balance:full*(1-frac)};
  }
};
/* The sixteen divisional signs, as the one function that computes them plus the
   table that names them. Published for the same reason as the dignity and
   Viṃśottarī tables above: the report has this and so do several pages, each
   from its own copy. A page that asks here cannot drift from the report.
   Additive; nothing in the engine changes. Note D30 is NOT a uniform 30/n
   division — its five spans are unequal, as vargaSign shows — so a page that
   wants the width of a division must measure it rather than divide 30 by n. */
window.__kVarga={ sign:vargaSign, codes:VCODES };
window.calculateSripatiHouses=function(ascSid,mcSid){
  if(window.SPSripati&&window.SPSripati.build) return window.SPSripati.build(ascSid,mcSid);
  return null;
};
/* The same, in a NAMED ayanāṃśa, without touching the engine's current mode.
   The almanac pages need their own convention (the site's, or a per-page
   override) and must not be moved by another widget on the page that casts a
   chart in a different mode a moment earlier. */
window.__kSidAtMode=function(name,date,mode){
  /* a Siddhānta engine read in its own frame overrides the convention asked for */
  var m=(ENGINE_MODE!=="modern"&&SS_FRAME==="own")?effectiveAyan(mode):mode;
  var jd=date.getTime()/86400000+2440587.5, ay=ayanamsaFor((AYAN_MODES[m]||m==="ss_engine")?m:"lahiri",jd);
  if(name==="Rahu") return norm(meanNode(jd)-ay);
  if(name==="Ketu") return norm(meanNode(jd)-ay+180);
  return norm(tropLon(name,date)-ay);
};
/* the modern ephemeris, whatever engine is in force — for comparison code */
window.__kSidAtModern=function(name,date){
  var jd=date.getTime()/86400000+2440587.5, ay=ayanamsa(jd);
  if(name==="Rahu") return norm(meanNodeModern(jd)-ay);
  if(name==="Ketu") return norm(meanNodeModern(jd)-ay+180);
  return norm(tropLonModern(name,date)-ay);
};
window.__kSidAt=function(name,date){
  var jd=date.getTime()/86400000+2440587.5, ay=ayanamsa(jd);
  if(name==="Rahu") return norm(meanNode(jd)-ay);
  if(name==="Ketu") return norm(meanNode(jd)-ay+180);
  return norm(tropLon(name,date)-ay);
};
/* A stripped snapshot for the sky view's time scrubber: sidereal longitudes, the
   lagna, and horizon coordinates. No vargas, ashtakavarga, shadbala or dasha, so it
   is cheap enough to recompute on every frame. */
/* a caller that names no ayanāṃśa gets the settings panel's, or the site default */
function defaultEngine(){ return pageEngine(); }
function defaultAyan(){
  var pa=pageAyan(); if(pa) return pa;     /* a page with its own picker uses it */
  try{ var N=window.NSettings&&window.NSettings.get(); if(N&&N.ayan&&AYAN_MODES[N.ayan]) return N.ayan; }catch(e){}
  return "samanvaya_ecliptic";
}
window.quickSky=function(inp){
  setEngineMode(inp.engine||defaultEngine(), inp.ssframe||siteSsFrame());
  setAyanamsaMode(inp.ayanamsa||defaultAyan());
  var tz=inp.tzHours, ut=inp.hour+inp.minute/60+(inp.second||0)/3600-tz;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var ms=Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000;
  var date=new Date(ms), ay=ayanamsa(jd);
  var obs=new Astronomy.Observer(inp.lat,inp.lon,0);
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], out=[];
  names.forEach(function(n){
    var ev={elon:tropLon(n,date), elat:eclLat(n,date)};
    var sid=norm(ev.elon-ay), hz=null;
    try{
      var eq=Astronomy.Equator(Astronomy.Body[BODY[n]],date,obs,true,true);
      var h=Astronomy.Horizon(date,obs,eq.ra,eq.dec,"normal");
      hz={alt:h.altitude,az:h.azimuth};
    }catch(e){}
    /* Apparent speed in degrees per day, measured across an hour centred on the instant.
       The sign of it is retrogression — the wheel marks it, and the Sun and Moon never
       retrograde, so they cost nothing to include. */
    var sp=lonAndSpeed(n,date).speed;
    out.push({en:n,sid:sid,lat:ev.elat,hz:hz,speed:sp,retro:sp<0});
  });
  var nodeTrop=(inp.node==="true")?trueNodeAt(date):meanNode(jd);
  [["Rahu",norm(nodeTrop-ay)],["Ketu",norm(nodeTrop-ay+180)]].forEach(function(x){
    var hz=null;
    try{
      var trop=norm(x[1]+ay), R=Math.PI/180;
      var T=Tof(jd), eps=(23.439291111-0.0130041667*T)*R;
      var ra=Math.atan2(Math.sin(trop*R)*Math.cos(eps),Math.cos(trop*R))/R/15;
      var dec=Math.asin(Math.sin(trop*R)*Math.sin(eps))/R;
      var h=Astronomy.Horizon(date,obs,((ra%24)+24)%24,dec,"normal");
      hz={alt:h.altitude,az:h.azimuth};
    }catch(e){}
    /* The nodes are always retrograde in the mean reckoning; the true node can creep
       forward briefly, but both are drawn with the retrograde mark by convention. */
    out.push({en:x[0],sid:x[1],lat:0,hz:hz,speed:-0.053,retro:true});
  });
  var lag=ascendant(jd,date,inp.lat,inp.lon,ay);
  var gast=Astronomy.SiderealTime(date);
  var lst=((gast+inp.lon/15)%24+24)%24;
  var Tc=Tof(jd), epsd=(23.439291111-0.0130041667*Tc);
  return {jd:jd,date:date,ayanamsa:ay,lagna:lag,mc:mcSidereal(date,inp.lon,epsd,ay),planets:out,
          obliquity:epsd,lst:lst,lat:inp.lat,lon:inp.lon};
};
window.buildLocalChart=function(inp){
  /* the engine, like the ayanāṃśa, is part of the chart's input */
  setEngineMode(inp.engine||defaultEngine(), inp.ssframe||siteSsFrame());
  setAyanamsaMode(inp.ayanamsa||defaultAyan());
  /* The bhāva frame is part of the chart's INPUT, exactly as the ayanāṃśa is,
     rather than a global someone sets beforehand. That way it is saved with
     the chart, round-trips through the stored input, appears in D.input, and
     any page that builds a chart gets the frame the chart was defined with
     instead of whatever the last caller happened to leave set. */
  setHouseMode(inp.houseSystem||"whole");
  var tz=inp.tzHours, ut=inp.hour+inp.minute/60-tz;
  var jd=jdFromUTC(inp.year,inp.month,inp.day,ut);
  var ms=Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000;
  var date=new Date(ms), ay=ayanamsa(jd);
  var names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], pos={},grahas=[];
  names.forEach(function(n){var r=lonAndSpeed(n,date);
    /* Ecliptic latitude as well as longitude. Two grahas at the same longitude may
       be a degree apart in the sky, and latitude is what tells them apart — it is
       also what the later authorities use to settle a planetary war. */
    var lat=null;
    try{ lat=eclLat(n,date); }catch(e){}
    pos[n]={sid:norm(r.lon-ay),speed:r.speed,lat:lat};});
  var nodeMode=(inp.node==="true")?"true":"mean";
  var nodeTrop=(nodeMode==="true")?trueNodeAt(date):meanNode(jd);
  var ra=norm(nodeTrop-ay);
  /* the nodes sit on the ecliptic by definition — they are where Candra crosses it */
  pos.Rahu={sid:ra,speed:-0.0529,lat:0}; pos.Ketu={sid:norm(ra+180),speed:-0.0529,lat:0};
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  var lagSid=ascendant(jd,date,inp.lat,inp.lon,ay), LS=Math.floor(lagSid/30)%12;
  /* the bhāva frame for this chart: whole-sign by default, Śrīpati when the
     mode is set and a meridian exists. Everything downstream asks FRAME and
     nothing recomputes a house from LS.
     The meridian is computed only when Śrīpati is actually selected, and in a
     try: this builder never touched Astronomy.SiderealTime before, and a frame
     that throws would take the whole chart down to supply a house system
     nobody asked for. On failure mcSid stays null and the frame falls back,
     declaring it rather than inventing a meridian. */
  var mcSid=null;
  if(HOUSE_MODE==="sripati"){
    try{ mcSid=mcSidereal(date,inp.lon,(23.439291111-0.0130041667*Tof(jd)),ay); }
    catch(e){ mcSid=null; }
  }
  var FRAME=bhavaFrame(lagSid,mcSid);
  var sunSid=pos.Sun.sid;
  order.forEach(function(n){
    var p=pos[n], nk=nak(p.sid);
    var cmb=combustionOf(n,p.sid,sunSid);
    grahas.push({key:SK[n],sa:SK[n],iast:SK[n],rashi:rashiObj(p.sid),
      /* the bhāva, on the graha itself. Until now a consumer of this JSON had
         to join grahas[] against bhavas[].occupants to learn which house a
         graha was in, which is a join on a Sanskrit display name and the one
         thing an analyst needs most. It follows the frame, so it is the house
         under whichever system is selected. */
      bhava:FRAME.houseOfLon(p.sid),
      /* how much of that bhāva's effect it actually carries — null outside
         Śrīpati, where unequal bhāvas are what make the question meaningful
         (bhavaPhala is a hoisted declaration defined below) */
      bhava_phala:bhavaPhala(p.sid),
      nakshatra_pada:nk.pada,dignity:null,retrograde:p.speed<0,
      sidereal_deg:p.sid, speed_deg_per_day:p.speed,
      ecliptic_latitude_deg:p.lat,
      combust:cmb?cmb.combust:false,
      sun_separation_deg:(n==="Sun")?0:(function(){
        var sp=Math.abs(norm(p.sid-sunSid)); return sp>180?360-sp:sp; })(),
      combustion_orb_deg:cmb?cmb.orb_deg:null});
  });
  /* BHĀVA-PHALA — Śrīpati, Adh. 1, ślokas 8–10.
   *
   * Occupancy alone says a graha is "in the 8th" and stops there. Śrīpati does
   * not stop there: the effect of a bhāva BEGINS at its ārambha-sandhi, reaches
   * FULL at the madhya (the bhāvāṃśa, the half-bhāva point), and falls away to
   * nil at the virāma-sandhi — śl. 10. Between those, śl. 9 says the amount is
   * found "by a rule-of-three process": the graha's distance from its nearest
   * sandhi, over the distance from that same sandhi to the madhya.
   *
   *   before the madhya → ĀROHA   (rising),  measured from the ārambha-sandhi
   *   after  the madhya → AVAROHA (falling), measured from the virāma-sandhi
   *
   * The denominator is HALF OF THIS BHĀVA'S OWN WIDTH ON THAT SIDE, and the two
   * sides differ: a quadrant bhāva is not symmetric about its madhya, because
   * each sandhi is the midpoint to a neighbour of a different width. Using one
   * fixed half-width — or the often-quoted flat 15° — is the whole-sign
   * degenerate case, not the general rule.
   *
   * Śloka 8 adds the boundary case: a graha standing IN a sandhi "produces no
   * effect"; short of the sandhi it gives the preceding bhāva's effect, past it
   * the coming bhāva's. Occupancy already resolves which side of the sandhi the
   * graha is on, so what remains is to report that it is there at all — hence
   * in_sandhi, flagged on the small orb below rather than silently rounded to
   * a near-zero weight.
   *
   * VERIFIED against Śrīpati's own worked horoscope (Subrahmanya Sastri 1937,
   * table p. 14): Sun ·7694, Moon ·5791, Mars ·0313, Mercury ·2579, Jupiter
   * ·3823, Saturn ·0334 — all six reproduced to four decimals, with the correct
   * Āroha/Avaroha on each. Venus is the one disagreement: this rule gives
   * ·9702 where the book prints ·9653. The discrepancy is in the BOOK's
   * arithmetic, not the rule — reproducing ·9653 from its own tabulated bhāva
   * sphuṭas and its own Venus longitude would require the 12|1 sandhi to sit
   * near 0°06′ instead of the 358°23′30″ its own table gives. Six exact matches
   * are not bent to fit one outlier. See the harness, which asserts all seven
   * including Venus's known divergence. */
  function bhavaPhala(lon){
    if(FRAME.mode!=="sripati"||!FRAME.sripati) return null;
    var hn=FRAME.houseOfLon(lon); if(!hn) return null;
    var ar=norm(FRAME.sripati.sandhi[hn===1?12:hn-1]),
        vi=norm(FRAME.sripati.sandhi[hn]),
        md=norm(FRAME.sripati.madhya[hn]);
    var fwd=function(a,b){return ((b-a)%360+360)%360;};
    var toMadhya=fwd(ar,md), ofGraha=fwd(ar,lon);
    var rising=ofGraha<toMadhya, num, den;
    if(rising){ num=ofGraha; den=toMadhya; }
    else      { num=fwd(lon,vi); den=fwd(md,vi); }
    var w=den>0?num/den:0;
    if(w>1) w=1; if(w<0) w=0;
    /* śl. 8: standing in a sandhi, the graha gives no result. An exact hit is
       measure-zero, so this reports the practical neighbourhood of one and
       leaves the judgement to the reader rather than pretending to a knife
       edge the birth time cannot support. */
    var nearest=Math.min(fwd(ar,lon)>180?360-fwd(ar,lon):fwd(ar,lon),
                         fwd(lon,vi)>180?360-fwd(lon,vi):fwd(lon,vi));
    return {bhava:hn, weight:+w.toFixed(6),
            direction:rising?"aroha":"avaroha",
            direction_sa:rising?"ārohā":"avarohā",
            deg_from_sandhi:+num.toFixed(6), bhavamsa_deg:+den.toFixed(6),
            in_sandhi:nearest<0.25,
            note:"Śrīpati, Adh. 1, śl. 8–10: effect begins at the ārambha-sandhi, "+
                 "is full at the madhya and ceases at the virāma-sandhi; the amount "+
                 "between is a rule-of-three on the half-bhāva for that side. "+
                 "Śrīpati's own rule, not BPHS — the bhāva itself is judged by BPHS."};
  }
  var posBySign={}; order.forEach(function(n){posBySign[n]=Math.floor(pos[n].sid/30)%12;});
  var bhavas=[];
  for(var h=0;h<12;h++){
    var hn=h+1, occ=[];
    order.forEach(function(n){ if(FRAME.houseOfLon(pos[n].sid)===hn) occ.push(SK[n]); });
    var sg=FRAME.madhyaSignOfHouse(hn);
    /* whole-sign keeps rashiObj(sg*30+0.001) to the digit: that 0.001 is what
       every published figure was computed with, and bit-identity in the
       default mode is the property house-verify asserts first. Śrīpati reports
       the real madhya instead, because under it a bhāva does not begin at 0°
       of its rāśi and saying it does would be a fiction. */
    var rec={idx:h,sa:BH[h],iast:BH[h],
      rashi:rashiObj(FRAME.mode==="sripati"?norm(FRAME.sripati.madhya[hn]):sg*30+0.001),
      ruler:SK[FRAME.lordOfHouse(hn)],occupants:occ};
    if(FRAME.mode==="sripati"){
      var lo=norm(FRAME.sripati.sandhi[hn===1?12:hn-1]), hi=norm(FRAME.sripati.sandhi[hn]);
      rec.madhya_deg=norm(FRAME.sripati.madhya[hn]);
      rec.sandhi_start_deg=lo; rec.sandhi_end_deg=hi;
      rec.width_deg=((hi-lo)%360+360)%360;
    }
    bhavas.push(rec);}
  var vargas=VCODES.map(function(v){var p={},pb={};
    order.forEach(function(n){p[SK[n]]=vargaSign(v[0],pos[n].sid);
      /* A varga has no cusps: vargaSign returns a rāśi integer, and the
         meridian is an observational quantity of the birth moment that does
         not map through a division. So the varga's own houses stay whole-sign
         from the varga lagna, and the D1 bhāva is carried alongside, labelled
         as what it is. Under the default mode the two agree for D1 and the
         carried value is simply the whole-sign house. */
      pb[SK[n]]=FRAME.houseOfLon(pos[n].sid);});
    /* a varga has its own ascendant; without it the division cannot be read as a
       chart, only as a list of signs */
    return {varga:v[0],sa:v[1],en:v[2],lagna:vargaSign(v[0],lagSid),positions:p,
            d1_bhava:pb, d1_bhava_note:"bhāva carried from the rāśi chart under the "+
              "selected house system; a varga has no cusps of its own"};});
  var ck=names.map(function(n){return {n:n,d:pos[n].sid%30};})
    .sort(function(a,b){return b.d-a.d;})
    .map(function(x,i){return {rank:i+1,label_short:["AK","AmK","BK","MK","PK","GK","DK"][i],
      label_en:["Soul-significator","Minister-significator","Brother-significator","Mother-significator",
                "Children-significator","Cousin-significator","Spouse-significator"][i],
      graha:SK[x.n],deg_in_sign:x.d};});
  var av=names.map(function(n){var b=baladi(pos[n].sid);
    return {graha:SK[n],avastha_iast:b[0],strength_percent:b[1]};});
  var ar=[];
  for(var b2=1;b2<=12;b2++){var sg=arudhaOf(b2,LS,posBySign,FRAME.madhyaSignOfHouse(b2));
    ar.push({bhava_idx:b2-1,bhava_sa:BH[b2-1],arudha_label:(b2===1?"AL":"A"+b2),
      arudha_rashi_idx:sg,arudha_rashi_sa:SA[sg]});}
  // current sky
  var nowD=new Date(), nowJd=jdFromUTC(nowD.getUTCFullYear(),nowD.getUTCMonth()+1,nowD.getUTCDate(),
      nowD.getUTCHours()+nowD.getUTCMinutes()/60+nowD.getUTCSeconds()/3600);
  var nay=ayanamsa(nowJd), tpos={},transits=[];
  names.forEach(function(n){var r=lonAndSpeed(n,nowD); tpos[n]={sid:norm(r.lon-nay),speed:r.speed};});
  var tra=norm(meanNode(nowJd)-nay);
  tpos.Rahu={sid:tra,speed:-0.0529}; tpos.Ketu={sid:norm(tra+180),speed:-0.0529};
  order.forEach(function(n){var nk=nak(tpos[n].sid);
    transits.push({key:n.toLowerCase(),sa:SK[n],iast:SK[n],en:n,sidereal_deg:tpos[n].sid,
      rashi:rashiObj(tpos[n].sid),nakshatra:{en:nk.name,lord:SK[nk.lord]},
      nakshatra_pada:nk.pada,retrograde:tpos[n].speed<0});});
  var natalForRel={}; order.forEach(function(n){natalForRel[n]={sid:pos[n].sid};});
  var trForRel={}; order.forEach(function(n){trForRel[n]={sid:tpos[n].sid};});
  // sade sati: Saturn transiting 12th, 1st or 2nd from natal Moon (dhaiya for 4th/8th)
  var mSign=Math.floor(pos.Moon.sid/30)%12, satSign=Math.floor(tpos.Saturn.sid/30)%12;
  var rel=((satSign-mSign)%12+12)%12;
  var sade={active:(rel===11||rel===0||rel===1),
    phase:(rel===11?"rising":rel===0?"peak":rel===1?"setting":(rel===3?"dhaiya-4th":rel===7?"dhaiya-8th":"inactive")),
    saturn_current_rashi_sa:SA[satSign],natal_moon_rashi_sa:SA[mSign]};
  if(rel===3||rel===7) sade.active=true;
  var HOUSE={},DIGN={};
  order.forEach(function(n){ HOUSE[n]=FRAME.houseOfLon(pos[n].sid);
    DIGN[n]=digOf(n,posBySign[n],pos[n].sid%30); });
  var ownsMap={}; for(var hh=1;hh<=12;hh++){var lo=FRAME.lordOfHouse(hh);(ownsMap[lo]=ownsMap[lo]||[]).push(hh);}
  var avOut=ashtakavarga(posBySign,LS);
  avOut.bhinna.forEach(function(x){x.graha_sa=SK[x.graha]||x.graha;});
  /* A by-house reading of the sarva totals. The BINDUS THEMSELVES ARE RĀŚI
     QUANTITIES and are not touched by the house system — Ashtakavarga counts
     into rāśis, full stop. What follows the frame is only which bhāva each
     rāśi is called, which is what a reader wants when asking "how many bindus
     in my 10th". Under Śrīpati a bhāva can span two rāśis, so the mapping is
     by the bhāva's madhya and one rāśi may carry no bhāva label at all while
     another carries two; the note says so rather than hiding it. */
  avOut.by_house=(function(){
    var rows=[],seen={};
    for(var hh=1;hh<=12;hh++){
      var rs=FRAME.madhyaSignOfHouse(hh); seen[rs]=(seen[rs]||0)+1;
      rows.push({house:hh,rashi_idx:rs,rashi_sa:SA[rs],
                 bindus:avOut.sarva[rs]});
    }
    var doubled=Object.keys(seen).filter(function(k){return seen[k]>1;}).length;
    return {rows:rows,
      note:"bindus are rāśi quantities and do not change with the house "+
           "system; only the bhāva label does. Mapped by each bhāva's madhya."+
           (doubled?" "+doubled+" rāśi(s) carry more than one bhāva's madhya "+
            "under this frame, so their bindus appear twice.":"")};
  })();
  var yg=yogaList({house:HOUSE,signOf:posBySign,dig:DIGN,LS:LS,LORD:LORD,owns:ownsMap,SK:SK});
  var bb=bhayat(pos.Moon.sid,pos.Moon.speed,jd,date,ay);
  grahas.forEach(function(g){var n=null;order.forEach(function(o){if(SK[o]===g.key)n=o;});
    if(n) g.dignity=DIGN[n];});
  // ---- Shadbala ----
  var SBD={}; names.forEach(function(n){ try{SBD[n]=declOf(n,date);}catch(e){SBD[n]=0;} });
  var ev=sunriseSunset(date,inp.lat,inp.lon);
  var srH=ev.rise?((ev.rise.getTime()-Date.UTC(inp.year,inp.month-1,inp.day,0,0,0))/3600000+tz)%24:6;
  var ssH=ev.set?((ev.set.getTime()-Date.UTC(inp.year,inp.month-1,inp.day,0,0,0))/3600000+tz)%24:18;
  var DAYL=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var sbOut=null;
  try{
    var ckend=cheshtaKendra(date,ay,pos);
    var sunSign=Math.floor(pos.Sun.sid/30)%12;
    var masaW=sankrantiWeekday(jd,date,sunSign*30);
    var varshaW=sankrantiWeekday(jd,date,0);
    sbOut=shadbala({planets:pos,LS:LS,lagSid:lagSid,frame:FRAME,jd:jd,date:date,sunrise:srH,sunset:ssH,
      birthH:inp.hour+inp.minute/60,decl:SBD,cheshtaK:ckend,vargaSign:vargaSign,digOf:digOf,LORD:LORD,
      natFriend:function(a,b){ if(FRD[a]&&FRD[a].indexOf(b)>=0)return "friend";
        if(ENM[a]&&ENM[a].indexOf(b)>=0)return "enemy"; return "neutral"; },
      weekday:(Math.floor(jdFromUTC(inp.year,inp.month,inp.day,0)+1.5)%7+7)%7,
      varshaLord:DAYL[varshaW], masaLord:DAYL[masaW]});
  }catch(err){ sbOut={error:String(err&&err.message||err)}; }

  /* ===== BHĀVA BALA, ŚRĪPATI'S EXACT FORM — Adh. 3, śl. 20–23 =============
   *
   * The report has carried a bhāva bala for a long time, and its own note
   * conceded what it was: "the simplified forms; the exact treatment weighs
   * each glance in Virupas by angle." Śrīpati IS that exact treatment, worked
   * through on a real chart with every intermediate printed, so there is no
   * longer a reason to approximate under his paddhati.
   *
   * Four components (Adh. 3, śl. 20–23 and the prose at p.55):
   *
   *   svami   Σ over the rāśis the bhāva spans of (arc in that rāśi ÷ 30°)
   *           × the ṣaḍbala of that rāśi's lord.
   *           DIVIDED BY 30°, NOT BY THE BHĀVA'S OWN WIDTH. His first worked
   *           bhāva happens to be exactly 30° wide so it cannot settle the
   *           question, but his second cannot be read any other way: ÷30
   *           gives 6·9078 against his printed 6·908, while ÷width gives
   *           7·476. So a bhāva narrower than a rāśi carries less than a full
   *           lord, and a wider one carries more. All twelve reproduce exactly.
   *   drg     ¼ × (benefic dṛṣṭi on the bhāva − malefic dṛṣṭi on it), the
   *           same quarter rule the graha dṛk bala uses.
   *   gurubudha  the ENTIRE dṛṣṭi of Jupiter and Mercury on the bhāva, added
   *           again on top of their quarter — his rule, not BPHS's.
   *   dig     by the class of the rāśi holding the MADHYA: biped signs are
   *           strong in the 1st bhāva, quadruped in the 10th, watery in the
   *           4th, keeta in the 7th, and strengthless in the bhāva opposite
   *           that (śl. 22). Distance from the WEAK bhāva, folded at 180°,
   *           ÷3 virūpas. Tulā in the 7th is the instructive case: biped, so
   *           its weak point is the 7th bhāva, which is itself — digbala
   *           exactly nil, and his total confirms it.
   *
   * Dṛṣṭi on a bhāva is measured TO ITS MADHYA (Summary, p.162), which is
   * what makes the quantity meaningful under unequal bhāvas at all.
   *
   * NOT APPLIED, deliberately: the prose at p.55 also adds one rūpa when
   * Jupiter or Mercury occupy the bhāva and subtracts one when Saturn, Mars
   * or the Sun do. His own worked table does not apply it — the Sun and
   * Saturn sit in his first bhāva and no rūpa is deducted — so the edition is
   * internally inconsistent here. Following the prose would break the twelve
   * totals that currently reconcile, so the rule is recorded and left off,
   * and the payload says so rather than silently choosing.
   *
   * Śrīpati-only. Under BPHS the report's existing section is unchanged. */
  var bhavaBalaOut=null;
  if(FRAME.mode==="sripati" && sbOut && sbOut.planets && !sbOut.error){
    try{
      var SBBY={}; sbOut.planets.forEach(function(r){ SBBY[r.graha]=r.total_rupa; });
      var BEN_SP=["Jupiter","Venus","Mercury","Moon"];
      /* sign classes as Sastri adopts them (p.54), following Garga: Vṛścika
         alone is keeta, Kaṭaka is watery, and the whole of Kumbha is biped
         against the view that splits it. Dhanus and Makara ARE split. */
      var signClass=function(sg,degIn){
        if(sg===2||sg===6||sg===5||sg===10) return "biped";     /* Mithuna Kanyā Tulā Kumbha */
        if(sg===8) return degIn<15?"biped":"quadruped";          /* Dhanus */
        if(sg===9) return degIn<15?"quadruped":"watery";         /* Makara */
        if(sg===0||sg===1||sg===4) return "quadruped";           /* Meṣa Vṛṣabha Siṃha */
        if(sg===7) return "keeta";                               /* Vṛścika */
        return "watery";                                         /* Kaṭaka Mīna */
      };
      var WEAKB={biped:7,quadruped:4,watery:10,keeta:1};
      bhavaBalaOut=[];
      for(var bh=1;bh<=12;bh++){
        var lo=norm(FRAME.sripati.sandhi[bh===1?12:bh-1]),
            hi=norm(FRAME.sripati.sandhi[bh]),
            md=norm(FRAME.sripati.madhya[bh]),
            wid=((hi-lo)%360+360)%360;
        /* walk the arc rāśi by rāśi */
        var svami=0, parts=[], cur=lo, done=0;
        while(done<wid-1e-9){
          var sgw=Math.floor(cur/30)%12;
          var toEdge=((sgw+1)*30-cur); if(toEdge<=1e-12)toEdge=30;
          var step=Math.min(toEdge,wid-done);
          var lw=LORD[sgw], sbw=SBBY[lw];
          if(sbw!=null){ svami+=(step/30)*sbw; }
          parts.push({rashi_idx:sgw,arc_deg:+step.toFixed(6),lord:SK[lw]});
          cur=norm(cur+step); done+=step;
        }
        /* dṛṣṭi cast on the madhya */
        var sub=0,pap=0,gb=0;
        /* dṛṣṭi on a bhāva is cast at its MADHYA (Summary p.162), by his own
           dṛṣṭi function — the one his Bhāva Drigbala table p.21 is built on */
        ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].forEach(function(q){
          if(!pos[q])return;
          var v=sripatiDrishti(q,pos[q].sid,md); if(!v)return;
          if(BEN_SP.indexOf(q)>=0) sub+=v; else pap+=v;
          if(q==="Jupiter"||q==="Mercury") gb+=v;
        });
        var drg=(sub-pap)/4;
        var cl=signClass(Math.floor(md/30)%12, md%30);
        var weakMd=norm(FRAME.sripati.madhya[WEAKB[cl]]);
        var ddg=Math.abs(((md-weakMd)%360+360)%360); if(ddg>180)ddg=360-ddg;
        var digb=ddg/3;
        bhavaBalaOut.push({bhava:bh,
          svami_rupa:+(svami).toFixed(6), spans:parts,
          drg_virupa:+drg.toFixed(6), guru_budha_virupa:+gb.toFixed(6),
          dig_virupa:+digb.toFixed(6), dig_class:cl,
          total_rupa:+(svami+(drg+gb+digb)/60).toFixed(6)});
      }
    }catch(e){ bhavaBalaOut={error:String(e&&e.message||e)}; }
  }
  /* The pañcāṅga OF THE BIRTH, which the report has always shown and the JSON has
     never carried — only the pañcāṅga of the moment the file was made, under
     current_phase. The two are different facts and a reader of the file alone
     could not recover the first from the second. */
  var natalPan=panchang(pos.Sun.sid,pos.Moon.sid,jd);
  var natalMasa=masaOf(pos.Sun.sid,pos.Moon.sid,ay);
  var civilWd=(Math.floor(jdFromUTC(inp.year,inp.month,inp.day,0)+1.5)%7+7)%7;
  var beforeSunrise=(inp.hour+inp.minute/60)<srH;
  var elong=norm(pos.Moon.sid-pos.Sun.sid);
  var risingT=null;
  try{ risingT=risingTimes(inp.lat,ay); }catch(e){}
  var lagRashi=Math.floor(lagSid/30)%12;
  /* THE TIME SCALES AND THE FRAME, published rather than used silently.
     A reader who wants to reproduce a figure — or an app that has to give the
     same figure — needs ΔT, the sidereal time and the obliquity, and which
     obliquity went where. They were computed and thrown away. */
  var timeScales=null;
  try{
    var AT=Astronomy.MakeTime(date), tilt=Astronomy.e_tilt(AT);
    var gastH=Astronomy.SiderealTime(date), lstH=((gastH+inp.lon/15)%24+24)%24;
    var Tts=Tof(jd), oblEngine=23.439291111-0.0130041667*Tts-1.638e-7*Tts*Tts;
    timeScales={
      jd_ut:jd, jd_tt:jd+(AT.tt-AT.ut),
      delta_t_sec:(AT.tt-AT.ut)*86400,
      delta_t_model:(window.__deltaT&&window.__deltaT.model)||
        "Espenak–Meeus polynomials (astronomy-engine default; deltat.js not loaded)",
      gast_hours:gastH, lst_hours:lstH, lst_deg:lstH*15,
      obliquity_mean_deg:oblEngine,
      obliquity_true_deg:tilt.tobl,
      nutation_longitude_arcsec:tilt.dpsi, nutation_obliquity_arcsec:tilt.deps,
      note:"The lagna, the MC and the Ayana Bala half-range use the MEAN obliquity "+
           "of date (obliquity_mean_deg, IAU 1976 polynomial) with the APPARENT "+
           "sidereal time (gast_hours). Planetary longitudes, latitudes and "+
           "declinations come from astronomy-engine in the true equinox of date, "+
           "which carries nutation (obliquity_true_deg). jd_tt = jd_ut + ΔT."
    };
  }catch(e){ timeScales=null; }
  return {input:inp, jd_utc:jd, ayanamsha_deg:ay, time_scales:timeScales,
    /* WHICH TRADITION PRODUCED THESE NUMBERS.
     *
     * The house toggle is not only a house toggle: selecting Śrīpati selects
     * his paddhati, and several quantities below are computed from his text
     * rather than from BPHS. Without this block a reader cannot tell which,
     * and a chart that does not say which system produced its figures cannot
     * be checked by whoever receives it — the same argument that put
     * house_system in this payload.
     *
     * It also records the opposite case honestly: Śrīpati is simply silent on
     * much of what this engine computes, and where he is silent BPHS is used
     * and said to be used, rather than letting the toggle imply an authority
     * his text does not claim. */
    paddhati:(function(){
      var sp=(FRAME.mode==="sripati");
      return {
        mode: sp?"sripati":"bphs",
        name: sp?"Śrīpatipaddhati":"Bṛhat Parāśara Horā Śāstra",
        edition: sp
          ? "Śrīpatipaddhati, tr. V. Subrahmanya Sastri, 1937"
          : "BPHS, tr. R. Santhanam (Ranjan), Vols. 1–2",
        follows_this_paddhati: sp
          ? ["bhāva division and sandhis (Adh. 1, śl. 6–8)",
             "bhāva-phala, the graded effect within a bhāva (Adh. 1, śl. 9–10)",
             "Ayana Bala, on a 24° parama-krānti half range (Adh. 3, śl. 15)",
             "Saptavargaja Bala, on the halving ladder (Adh. 3, śl. 2–3)",
             "tātkālika maitrī read from the bhāva chakra, not rāśi distance "+
               "(pp. 24–26) — this feeds Saptavargaja, Sthāna and the "+
               "Ṣaḍbala total, so it is the widest reaching difference",
             "dṛṣṭi on his quarters table, which carries the ¾/½/¼ rūpa "+
               "super-add for Saturn, Jupiter and Mars within it "+
               "(Adh. 2, śl. 5–6) and does not extend dṛṣṭi to the nodes",
             "pakṣa bala with Mercury always benefic, the Moon benefic in "+
               "either half, and the Moon's pakṣa NOT doubled (p. 38)",
             "per-head minimum strengths (p. 56)",
             "bhāva bala in its exact form, with the lord pro-rated across "+
               "the rāśis the bhāva spans (Adh. 3, śl. 20–23)",
             "Iṣṭa and Kaṣṭa phala, geometric (Adh. 4, śl. 6)"]
          : ["bhāva division (whole sign)",
             "Ayana Bala, on the obliquity of date (Ch. 27, vv. 15–17)",
             "Saptavargaja Bala, 45/30/20/15/10/4/2 (Ch. 26, vv. 2–4)",
             "Iṣṭa and Kaṣṭa phala, arithmetic (Ch. 28, v. 6)"],
        bphs_by_default: sp
          ? ["Ashtakavarga and its bindus — Śrīpati does not treat it",
             "the ṣoḍaśa vargas beyond his seven (rāśi, horā, drekkāṇa, "+
               "saptāṃśa, navāṃśa, dvādaśāṃśa, triṃśāṃśa)",
             "pañcāṅga, nakṣatras and all daśā computation",
             "yogas, ārūḍhas, kārakas and avasthās"]
          : [],
        excluded: sp
          ? [{what:"Śrīpati's own daśā system (Adh. 7)",
              why:"its period lengths are each graha's contribution to the "+
                  "āyurdāya, so computing them means computing a lifespan. "+
                  "This project presents longevity as doctrine to study and "+
                  "never as a figure about a person, so the system is "+
                  "described and deliberately not calculated. Viṃśottarī is "+
                  "used for timing and is BPHS's, not his."}]
          : [],
        note: sp
          ? "Śrīpati is an independent 11th-century author, not a commentator "+
            "on BPHS. Where the two differ, neither is corrected into the "+
            "other; this chart follows Śrīpati for the quantities listed and "+
            "BPHS for the rest, and says which is which."
          : "Figures follow BPHS throughout. Selecting Śrīpati houses switches "+
            "several of them to Śrīpati's own rules, which differ from BPHS "+
            "by more than the house division."
      };
    })(),
    birth_panchanga:{
      tithi_sa:natalPan.tithi_sa, paksha_sa:natalPan.paksha_sa,
      tithi_of_30:Math.floor(elong/12)+1,
      /* the vāra turns at sunrise, not at midnight: a birth before sunrise still
         belongs to the previous day's vāra, and that is the one a reading uses */
      vara_civil_sa:VARA[civilWd],
      vara_from_sunrise_sa:VARA[beforeSunrise?((civilWd+6)%7):civilWd],
      born_before_sunrise:beforeSunrise,
      nakshatra_sa:natalPan.nakshatra_sa, nakshatra_pada:nak(pos.Moon.sid).pada,
      yoga_sa:natalPan.yoga_sa, karana_sa:natalPan.karana_sa,
      masa_amanta:natalMasa.amanta, masa_purnimanta:natalMasa.purnimanta,
      ritu:natalMasa.ritu, ayana:natalMasa.ayana,
      sun_moon_elongation_deg:elong,
      moon_illuminated_fraction:(1-Math.cos(elong*D2R))/2,
      sunrise_local_hours:srH, sunset_local_hours:ssH},
    graha_yuddha:(function(){
      /* the war as reported, joined to what this paddhati's rule did with it */
      var W=yuddhaOf(pos), S=(sbOut&&sbOut.yuddha)||[];
      W.forEach(function(w){
        var en=w.grahas.map(function(k){ for(var e in SK) if(SK[e]===k) return e; return k; });
        S.forEach(function(s){
          if(s.grahas.indexOf(en[0])<0||s.grahas.indexOf(en[1])<0) return;
          w.victor=s.victor?SK[s.victor]:null; w.vanquished=s.vanquished?SK[s.vanquished]:null;
          w.transfer_virupas=s.transfer_virupas; w.rule=s.rule;
          if(s.unit_note) w.unit_note=s.unit_note;
          w.note="within one degree, so in yuddha; decided by this chart's paddhati — see rule";
        });
      });
      return W;
    })(),
    rashi_rising_times:{latitude_deg:inp.lat, obliquity_deg:23.4392911,
      note:"oblique ascension — the time each rāśi takes to cross the eastern horizon "+
           "at this latitude, which BPHS 1.8-9 calls for when finding the ascendant",
      lagna_rashi_idx:lagRashi,
      lagna_rashi_rising_minutes:(risingT&&risingT[lagRashi])?risingT[lagRashi].rising_minutes:null,
      rashis:risingT},
    ayanamsa_mode:AYAN_MODE, ayanamsa_name:(AYAN_MODE==="ss_engine"?"Sūrya Siddhānta's own zero (its libration ayanāṃśa)":AYAN_MODES[AYAN_MODE].name), node_mode:nodeMode,
    engine:{mode:ENGINE_MODE, name:ENGINE_MODES[ENGINE_MODE], frame:ENGINE_MODE==="modern"?null:SS_FRAME,
            requested_ayanamsa:REQ_AYAN,
            note:ENGINE_MODE==="modern"?null:("Graha and node positions from the "+ENGINE_MODES[ENGINE_MODE]+
              "; sunrise and the lagna's sidereal time are computed with the modern method.")},
    ayanamsa_note:(AYAN_MODE==="ss_engine"?"the text's own libration of the asterisms, ±27° over 7200 years, zero in 499 CE — used because this chart was cast with a Sūrya Siddhānta engine in its own frame":AYAN_MODES[AYAN_MODE].note), ashtakavarga:avOut, yogas:yg, bhayat:bb, shadbala:sbOut,
    /* Śrīpati's exact bhāva bala; null under BPHS, where the report's own
       simplified section stands. The ±1 rūpa occupancy rule is recorded but
       not applied — his worked table does not apply it either. */
    bhava_bala:bhavaBalaOut,
    bhava_bala_note:bhavaBalaOut&&!bhavaBalaOut.error
      ? "Śrīpati, Adh. 3, śl. 20–23. Bhāva bala = the ṣaḍbala of its lord, "+
        "pro-rated across the rāśis the bhāva spans at a thirtieth of a rūpa "+
        "per degree, plus a quarter of the net dṛṣṭi on its madhya, plus the "+
        "whole dṛṣṭi of Jupiter and Mercury, plus its dig bala by the class "+
        "of the rāśi holding the madhya. The one rūpa added for Jupiter or "+
        "Mercury occupying the bhāva, and deducted for Saturn, Mars or the "+
        "Sun, is stated in the same passage but is NOT applied in the "+
        "edition's own worked table, so it is not applied here either."
      : null,
    lagna:{sidereal_deg:lagSid,rashi:rashiObj(lagSid),nakshatra_pada:nak(lagSid).pada},
    /* The frame this chart was computed in, declared on its face. A chart
       JSON that does not say which house system produced its bhāvas cannot be
       checked by whoever receives it, and once the system is selectable that
       omission turns every bhāva in the file into a guess. mc_sidereal_deg is
       null under whole-sign because the meridian is not computed there — it is
       not a missing value but an unused one. */
    house_system:{mode:FRAME.mode,
      name:FRAME.mode==="sripati"?"Śrīpati bhāva-chalita (quadrant, trisected)"
                                 :"whole-sign (rāśi = bhāva, counted from the lagna)",
      requested:HOUSE_MODE,
      fell_back:FRAME.fellBack, fell_back_reason:FRAME.why,
      lord_rule:FRAME.mode==="sripati"
        ?"the lord of the rāśi containing the bhāva madhya"
        :"the lord of the rāśi, counted from the lagna's rāśi",
      mc_sidereal_deg:FRAME.mode==="sripati"?mcSid:null,
      note:"Śrīpati is later tradition, not BPHS. BPHS judges bhāvas by rāśi "+
           "from the lagna; the quadrant construction and its 15° strength rule "+
           "come from the Benares edition and later authorities. Graha dṛṣṭi, "+
           "Ashtakavarga bindus and the ārūḍhas are counted in rāśis in the "+
           "classical method — where they follow this toggle it is an extension, "+
           "and each says so where it is reported."},
    grahas:grahas, bhavas:bhavas, vargas:vargas,
    chara_karakas:ck, avasthas:av, arudhas:ar,
    current_phase:{asOf_jd_utc:nowJd, asOf_iso:nowD.toISOString(),
      transits:transits, transitRelations:relations(trForRel,natalForRel),
      panchang:panchang(tpos.Sun.sid,tpos.Moon.sid,nowJd), sadeSati:sade},
    /* Identifier, not branding: 99-main.js tests this string by substring to tell
       a locally computed chart from a remote one. The two must agree, so it keeps
       its original spelling through any rename. */
    substrate_stamp:(ENGINE_MODE==="modern"?"LearnHoro built-in engine · astronomy-engine (MIT) · Lahiri ayanāṃśa fitted to Swiss Ephemeris":"LearnHoro built-in engine · grahas from the "+ENGINE_MODES[ENGINE_MODE]+" (ss-engine.js) · sunrise and sidereal time from astronomy-engine (MIT)")};
};
})();


/* ===== Star wheel geometry =====
   A disc of the ecliptic, tilted away from the viewer, with the HORIZON FIXED and
   the ZODIAC ROTATING behind it.

   The rotation happens in the plane of the ecliptic *before* the tilt is applied.
   Rotating the already-projected ellipse instead would spin the ellipse itself —
   the tilt axis would turn with it and the plane would tumble like a flipped coin.

   Plane coordinates, right-handed, origin at the observer:
     phi = lagna - longitude          how far a point has risen, in degrees
     u   = -R*cos(phi)                east at phi=0 (screen left), west at phi=180
     v   =  R*sin(phi)                zero on the horizon, maximum at the meridian
     w   =  R*sin(beta)               ecliptic latitude, out of the plane

   Tilting about the u axis by T, then projecting to the screen:
     up    = v*cos(T) + w*sin(T)      screen height above the horizon line
     depth = v*sin(T) - w*cos(T)      distance away from the viewer

   At phi = 0 the point lands exactly at (cx - R, cy): the eastern horizon. That is
   the invariant the whole view rests on — whatever the engine reports as the lagna
   is, by construction, the longitude sitting on the east point. */
var SW_TILT_DEG=58;

function swProject(lonDeg, lagnaDeg, betaDeg, R, cx, cy, tiltDeg){
  var T=(tiltDeg==null?SW_TILT_DEG:tiltDeg)*Math.PI/180;
  var phi=((lagnaDeg-lonDeg)%360+360)%360*Math.PI/180;
  var beta=(betaDeg||0)*Math.PI/180;
  var u=-R*Math.cos(phi), v=R*Math.sin(phi), w=R*Math.sin(beta);
  var up=v*Math.cos(T)+w*Math.sin(T);
  var depth=v*Math.sin(T)-w*Math.cos(T);
  return {x:cx+u, y:cy-up, depth:depth,
          scale:1/(1+Math.max(-0.9,depth/(R*2.6))),
          above:up>=0};
}
/* the ellipse the ecliptic traces on screen, for drawing rings */
function swRingPath(R, cx, cy, tiltDeg, lagnaDeg, steps){
  var n=steps||180, d=[];
  for(var i=0;i<=n;i++){
    var lon=lagnaDeg-(i/n)*360;
    var p=swProject(lon, lagnaDeg, 0, R, cx, cy, tiltDeg);
    d.push((i?"L":"M")+p.x.toFixed(2)+","+p.y.toFixed(2));
  }
  return d.join(" ")+" Z";
}
/* an arc of the ecliptic between two longitudes, for sign and nakshatra bands */
function swBandPath(lon0, lon1, rIn, rOut, lagnaDeg, cx, cy, tiltDeg, steps){
  var n=steps||12, out=[], back=[];
  for(var i=0;i<=n;i++){
    var lon=lon0+(lon1-lon0)*(i/n);
    var a=swProject(lon, lagnaDeg, 0, rOut, cx, cy, tiltDeg);
    var b=swProject(lon, lagnaDeg, 0, rIn, cx, cy, tiltDeg);
    out.push((i?"L":"M")+a.x.toFixed(2)+","+a.y.toFixed(2));
    back.unshift("L"+b.x.toFixed(2)+","+b.y.toFixed(2));
  }
  return out.concat(back).join(" ")+" Z";
}


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

/* the wheel's geometry and catalogue are used by the report bundle */
try{ window.swProject=swProject; window.swRingPath=swRingPath; window.swBandPath=swBandPath;
     window.SW_TILT_DEG=SW_TILT_DEG; window.YOGATARAS=YOGATARAS; window.BRIGHT_STARS=BRIGHT_STARS; }catch(e){}
;
