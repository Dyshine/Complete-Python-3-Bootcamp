/* ================= SHOOTING: WHAT THE RETICLE COVERS IS WHAT YOU HIT =================
   In third and first person every shot is a ray from the camera through the reticle, in three dimensions. Bullets used to
   fly flat along the player's facing and hit anything within about 0.7 m of that line, at any height, so shots well off
   the reticle (over a head, past a shoulder) still landed. Now:
   - each infected carries hitboxes on its skeleton: a head, a torso, upper and lower arms and legs, following the
     animation. Headshots do 2.5x, limbs 0.75x;
   - the spread is a cone round the reticle, like a modern shooter: tight when aiming down the sights, wider from the
     hip, wider still on the move, in the air or sprinting, and it blooms with sustained fire. The reticle opens and
     closes to show it;
   - walls, trees, cars and the ground stop the round; low cover only if the round passes below its top;
   - damage falls off past half the weapon's range;
   - hitmarkers: a white cross on a hit, larger on a headshot, red on a kill, with a tick.
   Bullets leave the muzzle and converge on the point under the reticle. The top-down view keeps its flat shooting. */
const _ra=new V3(),_rb=new V3(),_rc=new V3(),_rd=new V3(),_re=new V3(),_rw=new V3(),_rf=new V3(),_ru=new V3(),_rr=new V3();
// [bone A, bone B (null: a sphere at A), radius as a fraction of the body's scale, part]
let HITINFO=null; // the round being resolved: {part, sub, p (world point), dx/dy/dz (its direction), heavy}
const HB_DEF=[['Head','head_end',.13,'head'],['Hips','neck',.2,'torso'],['LeftArm','LeftForeArm',.065,'limb'],['RightArm','RightForeArm',.065,'limb'],
  ['LeftForeArm','LeftHand',.055,'limb'],['RightForeArm','RightHand',.055,'limb'],['LeftUpLeg','LeftLeg',.085,'limb'],['RightUpLeg','RightLeg',.085,'limb'],
  ['LeftLeg','LeftFoot',.065,'limb'],['RightLeg','RightFoot',.065,'limb']];
const PART_MUL={head:2.5,torso:1,limb:.75};
function zHitboxes(inst){
  // sub: which limb (lArm, rArm, lLeg, rLeg), so a hit can throw that arm back or buckle that knee
  const out=[];for(const [a,b,r,part] of HB_DEF){const A=inst.getObjectByName(a),B=b&&inst.getObjectByName(b),sub=part!=='limb'?part:(a[0]==='L'?'l':'r')+(/Leg/.test(a)?'Leg':'Arm');if(A)out.push({A,B,r,part,sub});}
  return out.length>3?out:null;
}
// closest approach between the ray o+d*t (t>=t0) and the segment AB; returns the entry distance along the ray or -1
function rayCapsule(o,d,A,B,r,t0){
  _ra.subVectors(B,A);_rb.subVectors(o,A);const aa=_ra.dot(_ra),ad=_ra.dot(d),ab=_ra.dot(_rb),db=d.dot(_rb),den=aa-ad*ad;
  let s=aa>1e-8&&den>1e-8?clamp((ab-ad*db)/den,0,1):0,t=s*ad-db;
  if(t<t0){t=t0;s=aa>1e-8?clamp((t*ad+ab)/aa,0,1):0;}
  _rc.copy(A).addScaledVector(_ra,s);_rd.copy(o).addScaledVector(d,t);const dist=_rc.distanceTo(_rd);
  if(dist>r)return-1;return Math.max(t0,t-Math.sqrt(r*r-dist*dist));
}
// the world-space offset the shader adds under an object (terrain height under its origin)
const tOff=(x,z)=>gH(x,z);
// first hit of the ray on one infected: {t, part}
function zRayHit(z,o,d,t0){
  if(z.hbx&&z.mixer){const k=(z.def.scale||1)*(z.g.scale.x||1)*(z.type==='brute'||z.type==='boss'?1.25:1),gy=tOff(z.g.position.x,z.g.position.z);let best=null;
    for(const h of z.hbx){h.A.getWorldPosition(_re);_re.y+=gy;
      if(h.B){h.B.getWorldPosition(_rw);_rw.y+=gy;if(h.part==='head'){_re.lerp(_rw,.45);_rw.copy(_re);}else if(h.part==='torso')_rw.lerp(_re,.15);}else _rw.copy(_re); // the torso stops short of the chin
      const r=h.r*k*(h.part==='torso'&&z.type==='boomer'?1.6:1),t=rayCapsule(o,d,_re,_rw,r,t0);
      if(t>=0&&(!best||(h.part==='head'?t<best.t+.12:t<best.t-.02&&!(best.part==='head'&&t>best.t-.12))))best={t,part:h.part,sub:h.sub};}
    return best;}
  // the drawn infected: a body capsule and a head
  const s=z.def.scale||1,gy=tOff(z.x,z.z)+(z.lvlY||0)+(z.jy||0),cr=z.def.crawl;
  _re.set(z.x,gy+(cr?.25:.3*s),z.z);_rw.set(z.x,gy+(cr?.3:1.55*s),z.z);if(cr){_rw.x+=Math.sin(z.yaw)*1.2;_rw.z+=Math.cos(z.yaw)*1.2;}
  let t=rayCapsule(o,d,_re,_rw,z.def.r*.75,t0),best=t>=0?{t,part:'torso'}:null;
  _re.set(z.x,gy+(cr?.35:1.85*s),z.z);if(cr){_re.x+=Math.sin(z.yaw)*1.4;_re.z+=Math.cos(z.yaw)*1.4;}
  t=rayCapsule(o,d,_re,_re,.2*s,t0);if(t>=0&&(!best||t<=best.t+.05))best={t,part:'head'};
  return best;
}
// the shot's ray: from the camera through the reticle, scattered inside the spread cone (radians)
function shotRay(cone,o,d){
  camera.getWorldPosition(o);camera.getWorldDirection(d);
  if(cone>0){_rr.setFromMatrixColumn(camera.matrixWorld,0);_ru.setFromMatrixColumn(camera.matrixWorld,1);
    const a=Math.random()*Math.PI*2,r=Math.tan(cone*Math.sqrt(Math.random()));d.addScaledVector(_rr,Math.cos(a)*r).addScaledVector(_ru,Math.sin(a)*r).normalize();}
}
// the spread cone right now: tight down the sights, wider from the hip, on the move, in the air, sprinting; blooms with fire
function shotCone(w){
  const base=w.spread||0,ads=player.ads||0,pel=w.pellets>1;
  // pellets: a choke-sized pattern (hip .75 of the gun's spread, sights .45); single rounds: sights almost true
  const hip=pel?base*.75:base*.8+.008,aimed=pel?base*.45:base*.12;
  let c=lerp(hip,aimed,ads);
  const mv=player.air||player.jy>.05?2.4:player.sprinting?2:player.moving?1.35:player.crouch?.8:1;
  c*=lerp(mv,1+(mv-1)*.35,ads)*(1-.15*PERK('steady'))*(1+.35*coldAmt());
  c+=WA.bloom*(base*1.2+.025)*(1-ads*.7);
  return c;
}
const HMK={t:0,kind:''};
function hitMarker(kind){const pri={'':0,head:1,kill:2};if(HMK.t>0&&pri[kind]<pri[HMK.kind])return;HMK.t=kind==='kill'?.32:.2;HMK.kind=kind;Sound.play('ui',kind==='kill'?.7:.45);}
function updateHitMarker(dt){const el=$('hitmark');if(!el)return;HMK.t-=dt;const on=HMK.t>0;el.classList.toggle('on',on);el.classList.toggle('head',on&&HMK.kind==='head');el.classList.toggle('kill',on&&HMK.kind==='kill');}
// 3D tracer between two world points (the tracer mesh rides the terrain under its middle, so take that back off)
function tracer3(a,b,color){const t=tracers[tIdx=(tIdx+1)%tracers.length],len=a.distanceTo(b);if(len<.1)return;
  const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;t.m.rotation.order='YXZ';t.m.position.set(mx,(a.y+b.y)/2-gH(mx,mz),mz);t.m.scale.set(1,1,len);
  t.m.rotation.set(-Math.asin(clamp((b.y-a.y)/len,-1,1)),Math.atan2(b.x-a.x,b.z-a.z),0);t.m.material.color.setHex(color||0xffe7a0);t.m.material.opacity=1;t.m.visible=true;t.life=.07;}
const _ro=new V3(),_rdir=new V3(),_rend=new V3(),_rmz=new V3();
// one round along the reticle ray; returns {first, end}
function hitscan3(w,dmg,pierce,knock,color,cone){
  shotRay(cone,_ro,_rdir);const o=_ro,d=_rdir,shLvl=player.lvl||0;
  // nothing between the camera and the shooter can be hit
  const t0=Math.max(.2,(player.x-o.x)*d.x+(gH(player.x,player.z)+1.4+(player.lvlY||0)+(player.jy||0)-o.y)*d.y+(player.z-o.z)*d.z-.4);
  const range=w.range,tMax=t0+range,hl=Math.hypot(d.x,d.z)||1e-6,hx=d.x/hl,hz=d.z/hl;
  let block=tMax;const seenOb=new Set(),wwins=[];
  // walls, trees, cars, low cover and the ground, walked out horizontally from the shooter's end of the ray
  for(let ts=t0;ts<=block;ts+=OGC*.6/hl){const px=o.x+d.x*ts,pz=o.z+d.z*ts,py=o.y+d.y*ts;
    if(py<gH(px,pz)-.05){block=ts;break;}
    nearObs(px,pz,0,ob=>{if(seenOb.has(ob))return;if(ob.lvl!==undefined&&ob.lvl!==shLvl)return;seenOb.add(ob);
      const vx=ob.x-o.x,vz=ob.z-o.z,t=(vx*d.x+vz*d.z)/(hl*hl);if(t<t0||t>block)return;const cx=vx-d.x*t,cz=vz-d.z*t,r=ob.r;
      if(ob.win&&!ob.win.broken){if(cx*cx+cz*cz<r*r*1.2)wwins.push([t,ob.win]);return;}
      if(cx*cx+cz*cz>r*r*.6)return;
      if(ob.h!=null&&o.y+d.y*t>gH(ob.x,ob.z)+ob.h+(ob.lvl!==undefined?0:0))return; // the round clears its top
      block=t;});}
  {const sx=o.x+d.x*t0,sz=o.z+d.z*t0,hb=homeRay(sx,sz,hx,hz,(block-t0)*hl,true);block=Math.min(block,t0+hb/hl);}
  const hits=[];
  for(const z of zombies){if(z.dying||(z.lvl||0)!==shLvl)continue;const vx=z.x-o.x,vz=z.z-o.z,t=(vx*d.x+vz*d.z)/(hl*hl);
    if(t<t0-2||t>block+2)continue;const cx=vx-d.x*t,cz=vz-d.z*t;if(cx*cx+cz*cz>(z.def.r*2.4+1.4)**2)continue;
    const h=zRayHit(z,o,d,t0);if(h&&h.t<=block)hits.push({z,t:h.t,part:h.part,sub:h.sub});}
  for(const b of barrels){if(!b.alive)continue;const gy=gH(b.x,b.z);_re.set(b.x,gy+.05,b.z);_rw.set(b.x,gy+1.05,b.z);const t=rayCapsule(o,d,_re,_rw,.45,t0);if(t>=0&&t<=block)hits.push({b,t});}
  for(const p of props){const gy=gH(p.x,p.z);_re.set(p.x,gy+(p.y||0)+.25,p.z);const t=rayCapsule(o,d,_re,_re,p.r*.8,t0);if(t>=0&&t<=block)hits.push({p,t});}
  if(!shLvl){const seenA=new Set();for(let ts=t0;ts<=block;ts+=AHC*.7/hl)nearAgents(o.x+d.x*ts,o.z+d.z*ts,.8,a=>{if(seenA.has(a))return;seenA.add(a);const gy=gH(a.x,a.z),s=a.s||1;
      _re.set(a.x,gy+.15,a.z);_rw.set(a.x,gy+1.45*s,a.z);let t=rayCapsule(o,d,_re,_rw,.28*s,t0),part='torso';_re.set(a.x,gy+1.66*s,a.z);const th=rayCapsule(o,d,_re,_re,.14*s,t0);
      if(th>=0&&(t<0||th<=t+.05)){t=th;part='head';}if(t>=0&&t<=block)hits.push({a,t,part});});
    for(const an of animals){if(an.dead||an.state==='fly')continue;const gy=gH(an.x,an.z),h=an.d.h||1;_re.set(an.x,gy+h*.55,an.z);const t=rayCapsule(o,d,_re,_re,Math.max(an.d.r,h*.4),t0);if(t>=0&&t<=block)hits.push({an,t});}}
  hits.sort((a,b)=>a.t-b.t);
  let end=block,n=0,first=null;const kx=hx*knock,kz=hz*knock;
  for(const h of hits){
    if(h.b){h.b.hp-=dmg;if(h.b.hp<=0&&h.b.fuse<0)h.b.fuse=.05;end=h.t;n=pierce;break;}
    if(h.an){hitAnimal(h.an,dmg,kx,kz);n++;end=h.t;hitMarker('');if(n>=pierce)break;continue;}
    if(h.p){const f=(knock*.9+dmg*.04);impulseProp(h.p,hx*f,hz*f,f*.35);_re.copy(o).addScaledVector(d,h.t);burst(_re.x,_re.y-gH(_re.x,_re.z),_re.z,2,'debris',3);Sound.play('thud',.4);end=h.t;n=pierce;break;}
    const tg=h.z||h.a,k=h.z?'z':'a',fall=h.t-t0>range*.5?lerp(1,.65,clamp((h.t-t0-range*.5)/(range*.5),0,1)):1,head=h.part==='head';
    const dd=dmg*(PART_MUL[h.part]||1)*fall;if(head&&!CRITF)CRITF=true;
    // where and how hard it landed, for the hit reaction and the blood (damageZombie reads it)
    HITINFO={part:h.part,sub:h.sub||h.part,p:_rf.copy(o).addScaledVector(d,h.t),dx:d.x,dy:d.y,dz:d.z,heavy:knock>=5||dd>=60};
    dmgTarget(tg,k,dd,kx,kz);HITINFO=null;onHit(tg,k,dd);CRITF=false;if(!first)first={t:tg,k};
    hitMarker(tg.dying||tg.hp<=0?'kill':head?'head':'');n++;end=h.t;if(n>=pierce)break;}
  for(const [t,s] of HRAY)if(t0+t/hl<=end+.01)shatter(s);HRAY.length=0;for(const [t,Wn] of wwins)if(t<=end+.01)breakWin(Wn);
  _rend.copy(o).addScaledVector(d,end);
  if(n<pierce&&end<tMax-.01)burst(_rend.x,_rend.y-gH(_rend.x,_rend.z),_rend.z,2,'spark',3);
  // the round leaves the muzzle and meets the reticle's point
  const mp=muzzlePos();_rmz.set(mp.x,gH(mp.x,mp.z)+1.38+(player.lvlY||0)+(player.jy||0),mp.z);tracer3(_rmz,_rend,color);
  if(SHOT&&SHOT.w.chain&&first)chainFrom(first.t,first.k,dmg);
  return{x:_rend.x,z:_rend.z,first};
}
// where the reticle is pointing on the ground (for the hero's aim and anything that wants a target point)
function reticlePoint(out){shotRay(0,_ro,_rdir);const hl=Math.hypot(_rdir.x,_rdir.z)||1e-6;let t=40;
  for(let ts=.5;ts<40;ts+=1.5/hl){if(_ro.y+_rdir.y*ts<gH(_ro.x+_rdir.x*ts,_ro.z+_rdir.z*ts)){t=ts;break;}}
  out.set(_ro.x+_rdir.x*t,1.2,_ro.z+_rdir.z*t);return out;}
// the reticle opens to show the spread cone (in pixels at the screen centre)
function reticleSize(){const I=curW();if(!I)return;const w=wstat(I);if(w.melee)return;
  const px=Math.tan(shotCone(w))/Math.tan(camera.fov*Math.PI/360)*innerHeight/2;
  return clamp((px*2+10)/26,.45,6);}
// controller aim assist, the way console shooters do it: the stick slows down while the reticle is on or just off one
// of the infected, and down the sights it drifts gently toward the chest. Mouse aim is left alone.
const AA={slow:1,tgt:null};
function aimAssist(dt){
  AA.slow=1;AA.tgt=null;if(!pad.active||!TP||!player.alive)return;
  camera.getWorldPosition(_ro);camera.getWorldDirection(_rdir);let best=null,ba=1e9;
  for(const z of zombies){if(z.dying||(z.lvl||0)!==(player.lvl||0))continue;const gy=gH(z.x,z.z)+(z.lvlY||0)+(z.jy||0);
    _re.set(z.x,gy+(z.def.crawl?.35:1.25*(z.def.scale||1)),z.z).sub(_ro);const dist=_re.length();if(dist>45||dist<1)continue;
    const ang=Math.acos(clamp(_re.dot(_rdir)/dist,-1,1)),win=Math.atan(.75/dist)+.015;if(ang<win&&ang<ba){ba=ang;best={z,dir:_re.clone().divideScalar(dist)};}}
  if(!best)return;AA.slow=.5;AA.tgt=best.z;
  if((player.ads||0)>.5){const yaw=Math.atan2(best.dir.x,best.dir.z),pit=Math.asin(-best.dir.y);let dy=yaw-camYaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;
    const k=Math.min(1,dt*2.2);camYaw+=dy*k;camPitch=clamp(camPitch+(pit-camPitch)*k*.6,pitchLo(),pitchHi());}
}
