/* ================= WALLS & GATES ================= */
function segDist(s,x,z){const px=clamp(x,s.x0,s.x1),pz=clamp(z,s.z0,s.z1);return Math.hypot(x-px,z-pz);}
const tmpCol=new THREE.Color(),darkCol=new THREE.Color(0x1d1a16);
function segVisual(s){
  if(!base.wallLv){s.rubble.visible=false;if(s.door)s.gate.visible=false;else{s.mesh.visible=false;s.spikes.visible=false;}return;}
  const h=WALL_H[base.wallLv];s.rubble.visible=!s.alive;
  if(s.door){s.gate.visible=s.alive;for(const lf of [s.leafL,s.leafR]){lf.scale.y=h;lf.position.y=h/2;}}
  else{s.mesh.visible=s.alive;s.mesh.scale.y=h;s.mesh.position.y=h/2;s.spikes.visible=s.alive&&base.spikeLv>0;s.spikes.scale.setScalar(.8+base.spikeLv*.2);}
  const tn=s.door&&base.wallLv<3?'wood':WALL_TEX[base.wallLv],tx=texRep(tn,s.door?1:2,1);
  if(tx){if(s.mat.map!==tx){s.mat.map=tx;s.mat.needsUpdate=true;}tmpCol.setHex(s.door?0xd8c8b0:WALL_TINT[base.wallLv]);}
  else{tmpCol.setHex(s.door?0x5e4632:WALL_COL[base.wallLv]);if(s.door&&base.wallLv>=2)tmpCol.multiplyScalar(.8);}
  tmpCol.lerp(darkCol,(1-s.hp/s.maxHp)*.65);s.mat.color.copy(tmpCol);
}
function applyWalls(full){
  for(const s of segs){const old=s.maxHp;s.maxHp=WALL_HP[base.wallLv];if(full){s.hp=s.maxHp;s.alive=true;}else s.hp=Math.min(s.maxHp,s.hp*s.maxHp/old);segVisual(s);}
  const h=WALL_H[base.wallLv]+.3;for(const p of posts){p.scale.y=h;p.position.y=h/2;p.visible=base.wallLv>0;}
}
function damageSeg(s,d){
  if(!s.alive||!base.wallLv)return;s.hp-=d;burst(s.cx+s.nx*.6,1,s.cz+s.nz*.6,2,'debris',3);
  if(s.hp<=0){s.hp=0;s.alive=false;Sound.play('crash',.8);burst(s.cx,1,s.cz,18,'debris',6);
    for(let i=0;i<4;i++){const off=rand(-SEGL/2+.5,SEGL/2-.5);const x=s.cx+(s.horiz?off:0),z=s.cz+(s.horiz?0:off);const side=Math.random()<.6?-1:1;
      addProp('plank',x,z,{life:12,mat:M(s.door?0x5e4632:WALL_COL[base.wallLv]),vx:s.nx*side*rand(2,6)+rand(-1,1),vz:s.nz*side*rand(2,6)+rand(-1,1),vy:rand(4,8),tx:rand(-8,8),tz:rand(-8,8),spin:rand(-5,5)}).y=1.2;}
    if(S.breachMsgT<=0){toast(s.door?`The ${s.side} gate has been smashed`:`The ${s.side} wall is breached`,'bad');S.breachMsgT=4;}
    rumble(.4,.2,200);}
  segVisual(s);
}
function toggleGate(s){
  if(!s.alive)return;s.open=!s.open;Sound.play('gate');
  toast(`${s.side[0].toUpperCase()+s.side.slice(1)} gate ${s.open?'opened':'closed'}`,s.open&&S.phase==='night'?'bad':'');
}
function nearestGate(){if(!base.wallLv)return null;let best=null,bd=3.4;for(const s of gates){if(!s.alive)continue;const d=Math.hypot(s.cx-player.x,s.cz-player.z);if(d<bd){bd=d;best=s;}}return best;}
function nearestDoor(){let best=null,bd=2.6;for(const d of sdoors){const a=d.a0+d.ang;const mx=d.px+Math.cos(a)*d.len/2,mz=d.pz+Math.sin(a)*d.len/2;const dd=Math.hypot(mx-player.x,mz-player.z);if(dd<bd){bd=dd;best=d;}}return best;}
function kickDoor(d){
  const a=d.a0+d.ang;const nx=-Math.sin(a),nz=Math.cos(a);const side=(player.x-d.px)*nx+(player.z-d.pz)*nz;
  d.angV+=side>0?-9:9;Sound.play('door',1);S.shake=Math.max(S.shake,.12);rumble(.3,.2,90);
}
function applyTurrets(){turrets.forEach((t,i)=>t.g.visible=i<base.turrets);}
function applyFloods(){floodPoles.forEach(p=>p.visible=!!base.floods);}

