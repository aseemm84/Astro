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
if(typeof module!=="undefined") module.exports={swProject,swRingPath,swBandPath,SW_TILT_DEG};
