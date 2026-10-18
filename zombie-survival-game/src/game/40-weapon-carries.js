/* ================= WEAPON CARRIES =================
   How the survivor holds each weapon when not aiming: a pistol rides low in one hand and comes up to a high port when
   sprinting; rifles and shotguns are carried two-handed at low ready and across the chest at a run; the hunting rifle and
   launcher are cradled; melee hangs at the side and comes up for a sprint; the chainsaw is a heavy two-hand hold.
   Directions are in the character's frame (x = their left, y = up, z = forward), eased so switching weapons and gaits
   flows instead of snapping. Heavier weapons lean the torso and slow the breathing. */
const CARRY={w:0,run:0,move:0,q:new THREE.Quaternion(),off:new V3(),cur:null,v:{},t:{}};
const _cz=new V3(0,0,1),_cq=new THREE.Quaternion(),_cr=new THREE.Quaternion();
// per class: idle/walk pose, run pose; rA/rF = right upper arm and forearm directions, lA/lF the support arm, bar = barrel, roll about it
const CP={
  side:{wt:.1,cas:1,idle:{rA:[.04,-.9,.38],rF:[.1,-.42,.9],bar:[.04,-.62,.78],roll:0},run:{rA:[.06,-.74,.36],rF:[.28,.78,.5],bar:[.12,.92,.36],roll:.15}},
  rev:{wt:.18,cas:1,idle:{rA:[.04,-.9,.38],rF:[.1,-.42,.9],bar:[.04,-.62,.78],roll:0},run:{rA:[.06,-.74,.36],rF:[.28,.78,.5],bar:[.12,.92,.36],roll:.15}},
  smg:{wt:.3,two:1,idle:{rA:[.18,-.78,.58],rF:[.3,-.08,.95],lA:[-.14,-.62,.76],lF:[-.55,-.12,.82],bar:[.18,-.3,.93],roll:0},run:{rA:[.14,-.6,.56],rF:[.6,.48,.5],lA:[-.3,-.5,.7],lF:[-.62,.38,.62],bar:[-.55,.7,.45],roll:.5}},
  ar:{wt:.5,two:1,idle:{rA:[.18,-.78,.58],rF:[.3,-.08,.95],lA:[-.14,-.62,.76],lF:[-.55,-.12,.82],bar:[.16,-.32,.93],roll:0},run:{rA:[.14,-.6,.56],rF:[.6,.48,.5],lA:[-.3,-.5,.7],lF:[-.62,.38,.62],bar:[-.58,.68,.45],roll:.5}},
  shot:{wt:.55,two:1,idle:{rA:[.16,-.8,.56],rF:[.3,-.1,.95],lA:[-.14,-.64,.74],lF:[-.55,-.14,.8],bar:[.14,-.34,.92],roll:0},run:{rA:[.14,-.62,.54],rF:[.58,.46,.5],lA:[-.3,-.52,.68],lF:[-.62,.36,.62],bar:[-.58,.66,.46],roll:.5}},
  bow:{wt:.4,two:1,idle:{rA:[.18,-.78,.58],rF:[.3,-.08,.95],lA:[-.14,-.62,.76],lF:[-.55,-.12,.82],bar:[.16,-.3,.93],roll:0},run:{rA:[.14,-.6,.56],rF:[.6,.48,.5],lA:[-.3,-.5,.7],lF:[-.62,.38,.62],bar:[-.55,.7,.45],roll:.5}},
  hunt:{wt:.7,two:1,idle:{rA:[.1,-.86,.46],rF:[.5,.18,.82],lA:[-.1,-.72,.66],lF:[-.68,.22,.66],bar:[-.78,.36,.5],roll:.3},run:{rA:[.12,-.66,.5],rF:[.6,.5,.48],lA:[-.3,-.52,.66],lF:[-.64,.4,.6],bar:[-.62,.64,.44],roll:.5}},
  gl:{wt:.85,two:1,idle:{rA:[.1,-.86,.46],rF:[.5,.18,.82],lA:[-.1,-.72,.66],lF:[-.68,.22,.66],bar:[-.78,.36,.5],roll:.3},run:{rA:[.12,-.66,.5],rF:[.6,.5,.48],lA:[-.3,-.52,.66],lF:[-.64,.4,.6],bar:[-.62,.64,.44],roll:.5}},
  melee:{wt:.3,cas:1,idle:{rA:[.02,-.97,-.12],rF:[.02,-.9,.3],bar:[.04,-.96,.18],roll:0},run:{rA:[.04,-.8,.32],rF:[.2,.42,.86],bar:[.1,.55,.8],roll:.2}},
  saw:{wt:.9,two:1,idle:{rA:[.12,-.72,.52],rF:[.22,-.14,.96],lA:[-.12,-.68,.6],lF:[-.52,-.2,.8],bar:[.1,-.35,.93],roll:0},run:{rA:[.12,-.68,.5],rF:[.3,.05,.95],lA:[-.14,-.64,.6],lF:[-.55,-.05,.8],bar:[.06,-.25,.96],roll:0}},
};
const _cv=k=>CARRY.v[k]||(CARRY.v[k]=new V3());
function carryProfile(w,I){if(!w)return null;if(w.saw)return CP.saw;if(w.melee)return CP.melee;return CP[I.cls]||CP.ar;}
function carryPose(dt,w,melee,busy){
  const I=curW(),P=carryProfile(w,I);CARRY.cur=P;
  const tw=!P||busy||player.swing>0||WA.throwT>0?0:1-WA.aim;CARRY.w+=(tw-CARRY.w)*Math.min(1,dt*10);
  if(!P||!HB.rArm){CARRY.w=0;return;}
  const run=player.sprinting&&player.moving?1:0;CARRY.run+=(run-CARRY.run)*Math.min(1,dt*7);CARRY.move+=((player.moving?1:0)-CARRY.move)*Math.min(1,dt*6);
  const r=CARRY.run,A=P.idle,B=P.run,ease=Math.min(1,dt*9);
  const mix=(k,def)=>{const a=A[k]||def,b=B[k]||a,v=_cv(k);v.x+=(lerp(a[0],b[0],r)-v.x)*ease;v.y+=(lerp(a[1],b[1],r)-v.y)*ease;v.z+=(lerp(a[2],b[2],r)-v.z)*ease;return v;};
  const t=performance.now()/1000,cw=CARRY.w,breath=Math.sin(t*(1.4+P.wt*.4))*(1-CARRY.move)*.025;
  // arms
  aimBone(HB.rArm,HB.rFore,mix('rA'),cw);aimBone(HB.rFore,HB.rHand,mix('rF'),cw);
  if(P.two){aimBone(HB.lArm,HB.lFore,mix('lA'),cw);aimBone(HB.lFore,HB.lHand,mix('lF'),cw);}
  // body: lean into a sprint, hunch under weight, breathe at rest
  bRot(HB.spine,AX,(r*(.1+.22*P.wt)+(1-r)*CARRY.move*.06*P.wt)*cw);bRot(HB.head,AX,(-r*(.08+.1*P.wt))*cw);
  bRot(HB.spine2,AX,(breath+.05*P.wt)*cw);
  if(P.two&&r>.02)bRot(HB.spine,AY,.12*r*cw); // squared up a little behind a rifle carried across the chest
  // the weapon: pointed along the carry direction, grip in the palm
  const bar=mix('bar'),roll=lerp(A.roll||0,B.roll||0,r);CARRY.q.setFromUnitVectors(_cz,bar.clone().normalize());_cr.setFromAxisAngle(bar.clone().normalize(),roll);CARRY.q.premultiply(_cr);
  CARRY.off.copy(bar).normalize().multiplyScalar(melee?.02:.1).add(_cv('o').set(0,-.03,0));
}
/* ---- doors: open and close, or shoulder them open at a sprint ---- */
function useDoor(d){
  const a=d.a0+d.ang,nx=-Math.sin(a),nz=Math.cos(a),side=(player.x-d.px)*nx+(player.z-d.pz)*nz;
  if(Math.abs(d.ang-d.home)<.55){d.tgt=d.home+(side>0?-1.55:1.55);}else d.tgt=d.home;
  d.tgtT=1.6;Sound.play('door',.55);WA.reachT=.5;S.doorMsg=1;
}
const doorOpen=d=>Math.abs(d.ang-d.home)>=.55;
function stepDoors(dt){for(const d of sdoors){if(d.tgt==null)continue;d.tgtT-=dt;const e=d.tgt-d.ang;d.angV=e*5.5;if(Math.abs(e)<.03||d.tgtT<=0){d.ang=d.tgt;d.angV=0;d.tgt=null;}}}

const _va=new V3(),_vb=new V3(),_vd=new V3(),_qw=new THREE.Quaternion(),_qi=new THREE.Quaternion();
function aimBone(b,child,dir,w){
  if(!b||!child||!b.parent||w<.01)return;
  if(!HTOUCH.has(b))HTOUCH.set(b,b.quaternion.clone());
  b.getWorldPosition(_va);child.getWorldPosition(_vb);_vb.sub(_va);if(_vb.lengthSq()<1e-8)return;_vb.normalize();
  pl.getWorldQuaternion(_hq1);_vd.copy(dir).normalize().applyQuaternion(_hq1);
  _qw.setFromUnitVectors(_vb,_vd);_qi.identity().slerp(_qw,Math.min(1,w));
  b.parent.getWorldQuaternion(_hq3);const inv=_hq3.clone().invert();b.quaternion.premultiply(inv.multiply(_qi).multiply(_hq3));b.updateMatrixWorld(true);
}
const _d1=new V3(),_d2=new V3(),_d3=new V3(),_d4=new V3();
const dirP=(v,x,y,z,pitch,yaw)=>{v.set(x,y,z).normalize();if(pitch)v.applyAxisAngle(AX,pitch);if(yaw)v.applyAxisAngle(AY,yaw);return v;};
function weaponPose(dt){
  if(!HB.rArm||HERO.dead)return;
  const I=curW(),w=I&&wstat(I),melee=w&&w.melee&&!w.saw,busy=player.swim||player.climb||player.mantle>0;
  // how much of the shouldered pose: full when firing or aiming, low-ready otherwise; the walk clip already shoulders the gun
  const firing=player.fireCd>-.6&&!melee,reloading=player.reloadT>0;
  const want=busy||!w?0:melee?0:(firing||player.ads>.1||reloading)?1:0;
  WA.aim+=(want-WA.aim)*Math.min(1,dt*(want?12:7));
  carryPose(dt,w,melee,busy);
  const sw=WA.swap>0?Math.sin(Math.PI*WA.swap/.35):0,aim=WA.aim*(1-sw*.8);
  const reload=player.reloadT>0&&player.reloadMax?1-player.reloadT/player.reloadMax:-1,rl=reload>=0?Math.sin(Math.PI*reload):0;
  const low=firing||player.ads>.1?0:.42,pitch=(TP?clamp(camPitch-.3,-.4,.6)*.45:0)+low-WA.kick*.55+rl*.55;
  if(aim>.01){
    bRot(HB.spine2,AX,-WA.kick*.12);
    aimBone(HB.rArm,HB.rFore,dirP(_d1,.28,-.38,.88,pitch),aim);
    aimBone(HB.rFore,HB.rHand,dirP(_d2,.22,.12,1,pitch),aim);
    // the support hand: on the foregrip, or down to the magazine well while reloading
    aimBone(HB.lArm,HB.lFore,dirP(_d3,-.12,-.32-rl*.25,.95,pitch),aim);
    aimBone(HB.lFore,HB.lHand,dirP(_d4,-.5,.08-rl*.5,.86,pitch),aim);
  }
  // melee: a full swing from the right shoulder across the body (or an overhead chop when felling trees)
  if(player.swing>0&&(melee||WA.chop)){const t=1-player.swing/.28,s=clamp(t,0,1);
    if(WA.chop){const p=lerp(-2.2,.7,s*s);aimBone(HB.rArm,HB.rFore,dirP(_d1,.2,.2,1,p),1);aimBone(HB.rFore,HB.rHand,dirP(_d2,.15,.2,1,p+.3),1);aimBone(HB.lArm,HB.lFore,dirP(_d3,-.2,.1,1,p+.1),.8);}
    else{const yaw=lerp(-1.7,1,s*s*(3-2*s));aimBone(HB.rArm,HB.rFore,dirP(_d1,0,-.15,1,.1,yaw),1);aimBone(HB.rFore,HB.rHand,dirP(_d2,0,0,1,0,yaw+.4),1);bRot(HB.spine,AY,yaw*.35);}}
  // grenade throw: arm cocked back and over the top
  if(WA.throwT>0){const t=1-WA.throwT/.45,p=t<.45?lerp(-.6,-2.6,t/.45):lerp(-2.6,.4,(t-.45)/.55);aimBone(HB.rArm,HB.rFore,dirP(_d1,.1,.1,1,p),1);aimBone(HB.rFore,HB.rHand,dirP(_d2,.1,.1,1,p+.2),1);}
  // reaching for a door handle
  if(WA.reachT>0){const k=Math.sin(Math.PI*(1-WA.reachT/.5));aimBone(HB.lArm,HB.lFore,dirP(_d3,-.06,-.22,.97),k);aimBone(HB.lFore,HB.lHand,dirP(_d4,-.1,.08,1),k);}
}
// gun transform: follows the right hand, points down the line of fire, kicks, rolls for reloads, drops for swaps
const muzzleFlash=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(255,255,230,1)');gr.addColorStop(.25,'rgba(255,210,110,.95)');gr.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=gr;g.beginPath();
  for(let i=0;i<16;i++){const a=i/16*6.28,r=i%2?12:31;g.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}g.closePath();g.fill();
  const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});m.userData.noTerrain=false;
  const grp=new THREE.Group();const a=new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),m),b=a.clone(),f=new THREE.Mesh(new THREE.PlaneGeometry(.38,.38),m);b.rotation.z=Math.PI/2;
  a.rotation.y=Math.PI/2;b.rotation.y=Math.PI/2;b.rotation.x=Math.PI/2;grp.add(a,b,f);grp.visible=false;gun.add(grp);return{grp,t:0};})();
function gunTip(){const m=gun.children.find(c=>c!==muzzleFlash.grp);if(!m)return .6;if(m.userData.tip==null){const b=new THREE.Box3().setFromObject(m);gun.updateMatrixWorld(true);const inv=gun.matrixWorld.clone().invert();b.applyMatrix4(inv);m.userData.tip=b.max.z;}return m.userData.tip;}
function placeGun(dt){
  const I=curW(),w=I&&wstat(I),melee=w&&w.melee&&!w.saw;
  const reload=player.reloadT>0&&player.reloadMax?1-player.reloadT/player.reloadMax:-1,rl=reload>=0?Math.sin(Math.PI*reload):0;
  const sw=WA.swap>0?Math.sin(Math.PI*WA.swap/.35):0;
  let rx=-WA.kick*.5+rl*.45+sw*1.1+(TP&&!FP&&WA.aim>.5?clamp(camPitch-.3,-.4,.6)*.4:0),ry=0,rz=rl*.7;
  if(player.swing>0&&melee&&!WA.chop){const t=1-player.swing/.28;ry=lerp(-1.4,1.1,t);rx=-.3+t*.3;}
  if(player.swing>0&&WA.chop){const t=1-player.swing/.28;rx=lerp(-1.6,.9,t*t);}
  if(w&&w.saw&&player.fireCd>-.2){gun.position.x+=rand(-.012,.012);gun.position.y+=rand(-.012,.012);}
  gun.rotation.set(rx,ry,rz);
  if(!FP&&CARRY.w>.01&&!(player.swing>0)&&!(WA.throwT>0)){_cq.setFromEuler(gun.rotation);gun.quaternion.copy(CARRY.q).slerp(_cq,1-CARRY.w);}
  gun.position.z-=WA.kick*(FP?.07:.16);gun.position.y-=sw*(FP?.3:.45)+rl*.08;
  // muzzle flash at the barrel tip
  if(muzzleFlash.t>0){muzzleFlash.t-=dt;const g=muzzleFlash.grp;g.visible=true;g.position.set(0,.02,gunTip()+.18);g.scale.setScalar(rand(.75,1.25)*muzzleFlash.s);g.rotation.z=rand(0,6.28);if(muzzleFlash.t<=0)g.visible=false;}
}
// called once per shot
function onShotFx(w){S.lastShot=S.time;
  const k=clamp(.18+w.kick*.22+w.shake*1.3,.15,1)*(1-.45*(player.ads||0))*(player.crouch?.8:1);
  WA.kick=Math.min(1.2,WA.kick+k);WA.bloom=Math.min(1,WA.bloom+.12+w.shake*.8);WA.fov=Math.min(5,WA.fov+.6+w.shake*5+w.kick*.6);
  if(TP){const ck=(.008+w.kick*.012+w.shake*.05)*(1-.5*(player.ads||0));camPitch=clamp(camPitch-ck,pitchLo(),pitchHi());WA.camRec+=ck*.7;camYaw+=rand(-1,1)*ck*.25;}
  if(w.noise>=10&&w.cls!=='bow'){muzzleFlash.t=.05;muzzleFlash.s=clamp(.6+w.dmg/60,.6,1.8);}
  haptic(w.rum[0],w.rum[1],w.rum[2],clamp(.25+w.rum[0]*.8,.2,1));
}
function updateWeaponFx(dt){
  WA.kick*=Math.exp(-dt*11);WA.bloom*=Math.exp(-dt*4);WA.fov*=Math.exp(-dt*12);WA.swap=Math.max(0,WA.swap-dt);WA.throwT=Math.max(0,WA.throwT-dt);WA.reachT=Math.max(0,WA.reachT-dt);
  if(WA.camRec>1e-4){const r=WA.camRec*Math.min(1,dt*9);camPitch=clamp(camPitch+r,pitchLo(),pitchHi());WA.camRec-=r;}
  if(player.swing<=0)WA.chop=0;
  const ch=$('crosshair');const sc=((player.ads||0)>.5?.62:1)*(1+WA.bloom*.9);ch.style.transform=`scale(${sc.toFixed(3)})`;
}
// rumble for pads (including the Xbox impulse triggers) and phones; off switch in the pause menu
let VIB=store.get('deadacre.vib',true),lastVib=0;
function haptic(strong,weak,ms,trig){
  if(!VIB)return;
  if(pad.active){const gp=getPad(),a=gp&&gp.vibrationActuator;if(a&&a.playEffect){
    try{if(trig&&a.effects&&a.effects.includes&&a.effects.includes('trigger-rumble'))a.playEffect('trigger-rumble',{duration:Math.min(ms,120),rightTrigger:clamp(trig,0,1),leftTrigger:clamp(trig*.3*(player.ads||0),0,1),strongMagnitude:clamp(strong,0,1),weakMagnitude:clamp(weak,0,1)}).catch(()=>{});
      a.playEffect('dual-rumble',{duration:ms,strongMagnitude:clamp(strong,0,1),weakMagnitude:clamp(weak,0,1)}).catch(()=>{});}catch(e){}}}
  else if(isTouch&&navigator.vibrate){const now=performance.now();if(now-lastVib>70){lastVib=now;try{navigator.vibrate(Math.round(clamp(ms*.6*(.4+strong),12,90)));}catch(e){}}}
}

