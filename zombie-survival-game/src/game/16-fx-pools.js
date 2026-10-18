/* ================= FX POOLS ================= */
const particles=[];
const PART_M={glass:BASIC(0xc4e8f2),blood:BASIC(0x7a1410),acid:BASIC(0x8fd14f),spark:BASIC(0xffc060),debris:BASIC(0x5a5245),gore:BASIC(0x3d5a2a),brass:M(0xc9a23a,{metalness:.7,roughness:.35}),shell:M(0xb02a20),smoke:new THREE.MeshBasicMaterial({color:0x8a8a80,transparent:true,opacity:.5})};
const brassGeo=BOX(.05,.05,.13),partGeo=BOX(.13,.13,.13);
for(let i=0;i<300;i++){const m=new THREE.Mesh(partGeo,PART_M.blood);m.visible=false;scene.add(m);particles.push({m,vx:0,vy:0,vz:0,life:0,bounce:false});}
let pIdx=0;
function burst(x,y,z,n,kind,spd){for(let i=0;i<n;i++){const p=particles[pIdx=(pIdx+1)%particles.length];p.m.material=PART_M[kind];p.m.geometry=partGeo;p.m.visible=true;p.m.position.set(x,y,z);
  const a=rand(0,6.28),s=rand(.3,1)*(spd||5);p.vx=Math.cos(a)*s;p.vz=Math.sin(a)*s;p.vy=rand(1.5,5)*(kind==='smoke'?.4:1);p.life=rand(.4,.9);p.bounce=kind==='debris'||kind==='gore';p.m.scale.setScalar(rand(.6,1.6));}}
function ejectCasing(color){
  const p=particles[pIdx=(pIdx+1)%particles.length];const yaw=player.yaw;const rx=Math.cos(yaw),rz=-Math.sin(yaw);
  p.m.material=color?PART_M.shell:PART_M.brass;p.m.geometry=brassGeo;p.m.scale.setScalar(color?1.6:1);p.m.visible=true;
  p.m.position.set(player.x+Math.sin(yaw)*.5-rx*.2,1.4,player.z+Math.cos(yaw)*.5-rz*.2);
  const s=rand(2.5,4);p.vx=-rx*s+player.vx*.5+rand(-.5,.5);p.vz=-rz*s+player.vz*.5+rand(-.5,.5);p.vy=rand(3,4.5);p.life=rand(1.6,2.4);p.bounce=true;p.casing=true;
}
const tracers=[];
for(let i=0;i<50;i++){const m=new THREE.Mesh(BOX(.06,.06,1),new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);tracers.push({m,life:0});}
let tIdx=0;
function tracer(x0,z0,x1,z1,color,y){const t=tracers[tIdx=(tIdx+1)%tracers.length];y=y||1.35;const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz);if(len<.1)return;
  t.m.position.set((x0+x1)/2,y,(z0+z1)/2);t.m.scale.set(1,1,len);t.m.rotation.set(0,Math.atan2(dx,dz),0);t.m.material.color.setHex(color||0xffe7a0);t.m.material.opacity=1;t.m.visible=true;t.life=.07;}
const blasts=[];
for(let i=0;i<8;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color:0xff9a3a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);blasts.push({m,life:0,max:.45,r:4});}
let bIdx=0;
function blastFx(x,z,r,color){const b=blasts[bIdx=(bIdx+1)%blasts.length];b.m.position.set(x,.8,z);b.m.material.color.setHex(color||0xff9a3a);b.r=r;b.life=b.max;b.m.visible=true;}
const barBg=new THREE.SpriteMaterial({color:0x111111,depthTest:false,transparent:true,opacity:.75});
const barFg=new THREE.SpriteMaterial({color:0xd6432f,depthTest:false});
const barFgBoss=new THREE.SpriteMaterial({color:0xe9c46a,depthTest:false});

