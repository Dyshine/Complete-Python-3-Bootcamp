/* ================= STREETS =================
   What makes a road read as a road: white fog lines along the highway edges, wooden power poles with sagging lines on one
   side and the odd green route sign or orange quarantine notice; in town, a double yellow line down Main Street, dashed
   centre lines and crosswalks on the cross streets, cobra-head street lamps (a few still on, one or two flickering), stop
   signs on the side streets and fire hydrants at the corners. Everything is a kit (baked per chunk) so it costs a few draw
   calls per chunk. Pieces follow the terrain under their own origin, so each pole and sign is its own little kit. */
const STREET={wood:null,steel:null,dark:null,lit:null,flick:null,off:null};
function streetMats(){if(STREET.wood)return STREET;
  STREET.wood=ITM('wood',0x4a3a2a,0x8a7a62,2);STREET.steel=FLAT(0x8a8c88);STREET.dark=FLAT(0x1c1c1a,true);
  STREET.lit=new THREE.MeshBasicMaterial({color:0x3a3830});STREET.flick=new THREE.MeshBasicMaterial({color:0x3a3830});STREET.off=FLAT(0x4a4a46,true);
  return STREET;}
const LAMP_OFF=new THREE.Color(0x3a3830),LAMP_ON=new THREE.Color(0xffe2a0);
// called with the night amount (0 day … 1 night) from the lighting update
function streetLights(v){if(!STREET.lit)return;STREET.lit.color.copy(LAMP_OFF).lerp(LAMP_ON,clamp(v*1.4-.2,0,1));
  const f=Math.random()<.12?.25:1;STREET.flick.color.copy(LAMP_OFF).lerp(LAMP_ON,clamp(v*1.4-.2,0,1)*f);}

/* ---------- highway fog lines: two per road, split around the base, resized when the ground window moves ---------- */
const EDGE=(()=>{const geo=new THREE.PlaneGeometry(1,1);geo.rotateX(-Math.PI/2);const m=new THREE.MeshBasicMaterial({color:0xb8b4a6});m.userData.noTerrain=true;
  const L=[];for(const road of ['v','h'])for(const side of [-1,1])for(const half of [0,1]){const e=new THREE.Mesh(geo,m);e.position.y=.031;e.userData={road,side,half};scene.add(e);L.push(e);}
  return L;})();
function updateEdgeLines(sx,sz){const gap=BR+3;
  for(const e of EDGE){const{road,side,half}=e.userData,c=road==='v'?sz:sx,lo=half?Math.max(c-210,gap):c-210,hi=half?c+210:Math.min(c+210,-gap),len=hi-lo;
    e.visible=len>.5;if(!e.visible)continue;
    if(road==='v'){e.scale.set(.14,1,len);e.position.set(side*3.18,.031,(lo+hi)/2);}else{e.scale.set(len,1,.14);e.position.set((lo+hi)/2,.031,side*3.18);}}}

/* ---------- highway power line and signs (built per chunk from genChunk) ---------- */
const POLE_STEP=32,POLE_OFF=7.4,POLE_H=8.2;
function powerPole(x,z,rot,nx,nz){
  const S=streetMats(),K=Kit(x,z,rot),top=POLE_H;
  kAdd(K,0,S.wood,CYL(.12,.17,top,7),0,top/2,0);kSolid(K,0,0,.3);
  kBox(K,0,S.wood,2.3,.14,.16,0,top-.55,0);kBox(K,0,S.wood,.1,.9,.1,.7,top-.95,0,0,0,.75);
  for(const ox of [-1,0,1])kAdd(K,0,S.dark,CYL(.05,.06,.18,6),ox*.95,top-.38,0);
  if(RNG()<.35)kAdd(K,0,FLAT(0x6a6c68),CYL(.32,.32,.9,10),-.45,top-1.9,.28); // a transformer can
  // three lines to the next pole down the road, sagging between them (heights relative to this pole's ground)
  if(nx!=null){const dh=gH(nx,nz)-gH(x,z),c=Math.cos(rot),s=Math.sin(rot),dx=nx-x,dz=nz-z,lx=dx*c-dz*s,lz=dx*s+dz*c;
    for(const ox of [-.95,0,.95]){const a=new V3(ox,top-.3,0),b=new V3(lx+ox,top-.3+dh,lz),m=a.clone().lerp(b,.5);m.y-=.9;
      const tube=new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a,m,b),12,.022,4,false);kAdd(K,0,S.dark,tube,0,0,0);tube.dispose();}}
  return kFinish(K,.2,.2,top,'pole',false);
}
const HWY_SIGNS=[['QUARANTINE ZONE','#e07a1f','#1a1208'],['TURN BACK','#e07a1f','#1a1208'],['ROAD CLOSED','#e07a1f','#1a1208'],['ROUTE 9','#1f5a3a','#f2efe4'],
  ['DEAD ACRE 12 MI','#1f5a3a','#f2efe4'],['EVACUATE EAST','#1f5a3a','#f2efe4'],['SPEED LIMIT 55','#efece2','#141210'],['NO SERVICES','#1f5a3a','#f2efe4']];
function roadSign(x,z,rot,i){
  const S=streetMats(),K=Kit(x,z,rot),[t,bg,fg]=HWY_SIGNS[i%HWY_SIGNS.length];
  for(const ox of [-1.1,1.1]){kBox(K,0,S.steel,.1,2.6,.1,ox,1.3,0);kSolid(K,ox,0,.2);}
  kBox(K,0,signMat(t,bg,fg),3,.75,.06,0,2.3,.06);kBox(K,0,S.steel,3.08,.83,.04,0,2.3,0);
  return kFinish(K,1.6,.2,2.8,'sign',false);
}
// inside (or within m of) a building's footprint: enterable buildings are hollow, so the obstacle grid alone misses them
function inFootprint(x,z,m){for(const h of houses){const dx=x-h.x,dz=z-h.z;if(Math.abs(dx)>h.ex+m||Math.abs(dz)>h.ez+m)continue;
  const c=Math.cos(h.rot),s=Math.sin(h.rot);if(Math.abs(dx*c-dz*s)<h.hw+m&&Math.abs(dx*s+dz*c)<h.hd+m)return true;}return false;}
// called inside genChunk for a chunk the highway crosses: poles every 32 m on one side, a sign now and then
function highwayFurniture(axis,x0,z0){
  const t0=axis==='x'?x0:z0;
  for(let t=Math.ceil(t0/POLE_STEP)*POLE_STEP;t<t0+CH;t+=POLE_STEP){if(Math.abs(t)<BR+24)continue;
    const p=axis==='x'?{x:t,z:POLE_OFF}:{x:POLE_OFF,z:t},n=axis==='x'?{x:t+POLE_STEP,z:POLE_OFF}:{x:POLE_OFF,z:t+POLE_STEP};
    if(depthAt(p.x,p.z)>.05||blockedSpot(p.x,p.z,.6)||inFootprint(p.x,p.z,1.5))continue;
    const last=Math.abs(t+POLE_STEP)<BR+24||depthAt(n.x,n.z)>.05||inFootprint(n.x,n.z,1.5);
    powerPole(p.x,p.z,axis==='x'?Math.PI/2:0,last?null:n.x,last?null:n.z);}
  if(RNG()<.4){const t=t0+rand(6,CH-6),side=RNG()<.5?-1:1;if(Math.abs(t)>BR+30){
    const p=axis==='x'?{x:t,z:side*6.3}:{x:side*6.3,z:t};
    if(depthAt(p.x,p.z)<.05&&!blockedSpot(p.x,p.z,1.8)&&!inFootprint(p.x,p.z,1))roadSign(p.x,p.z,axis==='x'?(side<0?Math.PI/2:-Math.PI/2):(side<0?0:Math.PI),randi(0,HWY_SIGNS.length-1));}}
}

/* ---------- town furniture ---------- */
// a cobra-head street lamp; the arm reaches over the street along local +z
function bLamp(x,z,rot,state){
  const S=streetMats(),K=Kit(x,z,rot);
  kAdd(K,0,S.steel,CYL(.07,.11,7,8),0,3.5,0);kAdd(K,0,S.steel,CYL(.16,.2,.5,8),0,.25,0);kSolid(K,0,0,.25);
  kBox(K,0,S.steel,.09,.09,2.1,0,6.95,1,0,-.12);kBox(K,0,S.steel,.42,.16,.75,0,7.05,2.2);
  kBox(K,0,state===2?S.flick:state===1?S.lit:S.off,.3,.05,.55,0,6.96,2.2);
  return kFinish(K,.3,.3,7.3,'lamp',false);
}
// the octagon face: a square canvas so the lettering keeps its shape (circle UVs span the whole texture)
let STOP_M=null;
function stopMat(){if(STOP_M)return STOP_M;const c=document.createElement('canvas');c.width=c.height=256;const t=new THREE.CanvasTexture(c);t.anisotropy=4;
  const draw=()=>{const g=c.getContext('2d'),oct=r=>{g.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;g.lineTo(128+Math.cos(a)*r,128+Math.sin(a)*r);}g.closePath();};
    g.fillStyle='#f0ece4';g.fillRect(0,0,256,256);g.fillStyle='#a8231d';oct(118);g.fill();
    g.fillStyle='#f0ece4';g.font='bold 78px "Stardos Stencil", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('STOP',128,134);
    g.fillStyle='rgba(60,30,10,.3)';for(let i=0;i<5;i++){g.beginPath();g.ellipse(Math.random()*256,Math.random()*256,16,9,Math.random()*3,0,6.28);g.fill();}t.needsUpdate=true;};
  draw();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
  STOP_M=new THREE.MeshToonMaterial({map:t,gradientMap:TOON_GRAD,emissive:0x111111});STOP_M.userData.noInk=true;STOP_M.userData.sign=1;return STOP_M;}
function bStopSign(x,z,rot){
  const S=streetMats(),K=Kit(x,z,rot),face=new THREE.CircleGeometry(.4,8,Math.PI/8);
  kBox(K,0,S.steel,.07,2.3,.07,0,1.15,0);kSolid(K,0,0,.18);
  kAdd(K,0,stopMat(),face,0,2.35,.05);kAdd(K,0,FLAT(0x7a7a76),face,0,2.35,.035,Math.PI,0,0,1.04,1.04,1);face.dispose();
  return kFinish(K,.4,.2,2.8,'stop',false);
}
function bHydrant(x,z){
  const K=Kit(x,z,0),red=FLAT(pick([0xb8322a,0xc8a020,0xb8322a]));
  kAdd(K,0,red,CYL(.16,.19,.7,8),0,.35,0);kAdd(K,0,red,new THREE.SphereGeometry(.17,8,6,0,Math.PI*2,0,Math.PI/2),0,.7,0);
  kAdd(K,0,red,CYL(.07,.07,.5,6),0,.45,0,0,0,Math.PI/2);kSolid(K,0,0,.25,undefined,.8);
  return kFinish(K,.2,.2,.9,'hydrant',false);
}
// road paint for a town plan, in plan coordinates (u along the tracks, v down Main Street)
function townPaint(P,W,ax){
  const paint=[],add=(u,v,lu,lv,col)=>{const p=W(u,v);paint.push({x:p.x,z:p.z,w:ax?lu:lv,d:ax?lv:lu,col});};
  // Main Street: double yellow centre line, crosswalks where each cross street meets it
  for(const [a,b] of [[-22,23.6],[36.4,65.6],[78.4,92]])for(let v=a;v<b-.1;v+=6){const e=Math.min(b,v+6);for(const o of [-.14,.14])add(o,(v+e)/2,.11,e-v-.1,'y');}
  for(const v0 of [30,72]){for(const s of [-1,1])for(let k=0;k<10;k++)add(-4.95+k*1.1,v0+s*5.3,.5,2.2,'w');
    // the cross street: dashed centre line, crosswalk and stop bar on each side of Main
    for(let u=-108;u<108;u+=6)if(Math.abs(u+1.1)>9)add(u+1.1,v0,2.2,.15,'y');
    for(const s of [-1,1]){for(let k=0;k<6;k++)add(s*7.2,v0-2.9+k*1.15,2.2,.5,'w');add(s*8.9,v0+s*1.75,.3,3.2,'w');}}
  return paint;
}

/* ---------- traffic that stopped: what an evacuation leaves on a two-lane highway ----------
   Right-hand traffic: heading +t the lane is on the right. Per chunk, maybe one scene: a line of stalled cars nose to
   tail in one lane, a pile-up of a few cars knocked askew across both lanes, a car run off into the ditch, or a police
   roadblock (cruisers across the lanes, cones). */
function highwayTraffic(axis,x0,z0){
  const t0=axis==='x'?x0:z0,along=axis==='x'?Math.PI/2:0;
  // world position for distance t along the road and offset o across it
  const P=(t,o)=>axis==='x'?{x:t,z:o}:{x:o,z:t};
  const put=(t,o,rot,role)=>{if(Math.abs(t)<BR+14)return null;const p=P(t,o);if(blockedSpot(p.x,p.z,2.2))return null;return addCar(p.x,p.z,rot,role);};
  const r=RNG();
  if(r<.32){// stalled line, facing the same way in one lane (an evacuation that ran out of road)
    const dir=RNG()<.5?1:-1,lane=-dir*1.75*(axis==='x'?-1:1),rot=along+(dir>0?0:Math.PI);let t=t0+rand(5,12);
    for(let n=randi(2,4);n>0&&t<t0+CH-4;n--){put(t,lane+rand(-.25,.25),rot+rand(-.06,.06),pick(['sedan','sedan','wagon','pickup','van','truck']));t+=rand(6.5,8.5)*dir*dir;}
    if(RNG()<.4){const p=P(t0+rand(6,CH-6),-lane*.2);addProp('cone',p.x,p.z);}
  }else if(r<.5){// pile-up: two or three cars knocked across the lanes
    const t=t0+rand(10,CH-10);for(let i=0;i<randi(2,3);i++){const c=put(t+rand(-3.5,3.5),rand(-2.2,2.2),along+rand(-.9,.9)+(RNG()<.5?Math.PI:0),pick(['sedan','wagon','pickup','van']));if(c&&RNG()<.5)stripLook(c);}
    for(let i=0;i<randi(1,3);i++){const p=P(t+rand(-5,5),rand(-3,3));addProp(pick(['tire','cone','can']),p.x,p.z);}
  }else if(r<.68){// off into the ditch, nose down the bank
    const side=RNG()<.5?1:-1,t=t0+rand(6,CH-6),c=put(t,side*rand(5.4,6.4),along+side*rand(.35,.7)*(axis==='x'?-1:1)+(RNG()<.5?Math.PI:0),pick(['sedan','wagon','pickup']));
    if(c){c.g.rotation.z=side*rand(.12,.22);c.g.rotation.x=rand(-.12,.12);}
  }else if(r<.76&&Math.abs(t0)>140){// roadblock: cruisers parked across the road, cones between them
    const t=t0+CH/2;put(t,-1.9,along+Math.PI/2+rand(-.15,.15),'police');put(t+rand(-1,1),1.9,along-Math.PI/2+rand(-.15,.15),RNG()<.7?'police':'ambulance');
    for(let o=-3;o<=3;o+=1.5){const p=P(t+4,o);addProp('cone',p.x,p.z);}
  }
}
// curbside parking on a town plan's cross streets, parallel to the kerb, facing the way the lane runs
function townCurbCars(P,x0,z0,x1,z1){
  for(const v0 of [30,72])for(let u=-100;u<=100;u+=9){if(Math.abs(u)<12)continue;
    for(const s of [-1,1]){if(hash2(u*7+v0,s*13,41)>.24)continue;const p=P.W(u+rand(-1,1),v0+s*2.35);if(p.x<x0||p.x>=x1||p.z<z0||p.z>=z1)continue;
      if(!townFits(p.x,p.z,2)||blockedSpot(p.x,p.z,2.2))continue;
      addCar(p.x,p.z,P.rotV+(s>0?Math.PI/2:-Math.PI/2)+rand(-.04,.04),pick(['sedan','sedan','wagon','pickup','van','taxi']));}}}
