/* ================= WORLD ================= */
function groundTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  g.fillStyle='#4a5236';g.fillRect(0,0,256,256);
  for(let i=0;i<2800;i++){const v=Math.random();g.fillStyle=v<.4?'#3f4730':v<.7?'#56603e':v<.86?'#5d5238':'#6b6a45';g.globalAlpha=rand(.3,.8);g.fillRect(Math.random()*256,Math.random()*256,rand(1,4),rand(1,4));}
  g.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(34,34);return t;
}
/* ---------- endless ground and highways: big planes that follow the player, snapped to whole texture tiles ---------- */
const WSNAP=42; // multiple of the 7-unit ground/road texture tile and the 6-unit lane-dash spacing
const GSEG=140,groundGeo=new THREE.PlaneGeometry(420,420,GSEG,GSEG);groundGeo.rotateX(-Math.PI/2);
groundGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(groundGeo.attributes.position.count*3).fill(1),3));
const groundXZ=Float32Array.from(groundGeo.attributes.position.array);
const ground=new THREE.Mesh(groundGeo,new THREE.MeshStandardMaterial({map:groundTexture(),roughness:1,vertexColors:true}));
ground.material.userData.noTerrain=true;ground.material.map.repeat.set(60,60);ground.frustumCulled=false;
groundGeo.setAttribute('aDry',new THREE.BufferAttribute(new Float32Array(groundGeo.attributes.position.count),1));
const groundDryU={value:ground.material.map};
ground.material.onBeforeCompile=sh=>{sh.uniforms.map2=groundDryU;sh.uniforms.uTint=groundSeasonU.tint;sh.uniforms.uSnow=groundSeasonU.snow;
  sh.vertexShader='attribute float aDry;varying float vDry;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDry=aDry;');
  sh.fragmentShader='uniform sampler2D map2;varying float vDry;uniform vec3 uTint;uniform float uSnow;\n'+sh.fragmentShader.replace('#include <map_fragment>',
    'vec4 texelColor=mix(texture2D(map,vUv),texture2D(map2,vUv*.73+vec2(.31,.17)),vDry);texelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;diffuseColor.rgb*=uTint;'+
    'float sn=uSnow*smoothstep(.15,.55,uSnow+texelColor.g*.6-vDry*.1);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.86,.92)*(.88+.24*texelColor.g),clamp(sn,0.,1.));');};
ground.receiveShadow=true;scene.add(ground);
function rebuildGround(sx,sz){
  const P=groundGeo.attributes.position,C=groundGeo.attributes.color,n=P.count;
  const D=groundGeo.attributes.aDry;
  for(let i=0;i<n;i++){const wx=sx+groundXZ[i*3],wz=sz+groundXZ[i*3+2],h=gH(wx,wz);P.setY(i,h);
    D.setX(i,clamp(sstep(.36,.6,vnoise(wx*.022+3.3,wz*.022-9.1))*.95+sstep(2.5,7,h)*.35,0,1));}
  D.needsUpdate=true;
  groundGeo.computeVertexNormals();const N=groundGeo.attributes.normal;
  for(let i=0;i<n;i++){const h=P.getY(i),ny=N.getY(i);let r=1,g=1,b=1;
    if(h<WL+.12){r=.52;g=.47;b=.38;}else if(h<WL+.65){r=1.05;g=.95;b=.72;}
    else if(ny<.86){const k=clamp((.86-ny)*5,0,1);r=1+k*.05;g=1-k*.12;b=1-k*.05;}
    C.setXYZ(i,r,g,b);}
  P.needsUpdate=true;C.needsUpdate=true;groundGeo.computeBoundingSphere();
}
const waterTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,128,128);
  g.strokeStyle='rgba(120,170,175,.55)';g.lineWidth=2;for(let i=0;i<22;i++){const x=Math.random()*128,y=Math.random()*128,w=rand(10,30);g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+w/2,y-3,x+w,y);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(70,70);return t;})();
const water=new THREE.Mesh(new THREE.PlaneGeometry(420,420),new THREE.MeshStandardMaterial({color:0x2f6268,map:waterTex,transparent:true,opacity:.82,roughness:.18,metalness:.2,depthWrite:false}));
water.material.userData.noTerrain=true;water.rotation.x=-Math.PI/2;water.position.y=WL;water.renderOrder=2;scene.add(water);
const waterT={value:0};
water.material.onBeforeCompile=sh=>{sh.uniforms.uT=waterT;sh.uniforms.uIce=waterIceU;sh.uniforms.tMap=TERR.mapU;sh.uniforms.tInfo=TERR.infoU;
  sh.vertexShader='varying vec2 vWXZ;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  sh.fragmentShader='uniform float uT;uniform float uIce;varying vec2 vWXZ;\n'+TERR_GLSL+sh.fragmentShader.replace('#include <map_fragment>',`
    vec4 wa=texture2D(map,vUv+vec2(uT*.012,uT*.005)),wb=texture2D(map,vUv*1.37+vec2(-uT*.008,uT*.011));
    vec4 texelColor=mapTexelToLinear(mix(wa,wb,.42));diffuseColor*=texelColor;
    float dep=${WL.toFixed(2)}-terrainH(vWXZ);
    diffuseColor.a*=mix(.38,1.,smoothstep(.0,1.3,dep));
    float fw=.22+.08*sin(uT*1.6+vWXZ.x*.45+vWXZ.y*.3);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.95,.93),(1.-smoothstep(fw*.4,fw,dep))*.9);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.03,.04,.04),1.-smoothstep(.0,.05,dep));
    diffuseColor.a=max(diffuseColor.a,(1.-smoothstep(.0,fw,dep))*.95);
    float crack=step(.93,fract(sin(dot(floor(vWXZ*1.7),vec2(12.9,78.2)))*43758.5))*.18;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.84,.9)*(.86+.2*wa.r)-crack,uIce);diffuseColor.a=mix(diffuseColor.a,.97,uIce);`);};
onTex('water',()=>{water.material.map=texRep('water',52,52);water.material.color.setHex(0xffffff);water.material.needsUpdate=true;});
onTex('grass',()=>{ground.material.map=texRep('grass',60,60);ground.material.color.setHex(0xcfcab4);if(!TEXI.grassDry)groundDryU.value=ground.material.map;ground.material.needsUpdate=true;});
onTex('grassDry',()=>{groundDryU.value=texRep('grassDry',60,60);});
const roadM=new THREE.MeshStandardMaterial({color:0x2d302c,roughness:1}),roadM2=new THREE.MeshStandardMaterial({color:0x2d302c,roughness:1}),roadMats=[roadM,roadM2];
const dashM=new THREE.MeshBasicMaterial({color:0x8e7f48});
for(const m of [roadM,roadM2,dashM])m.userData.noTerrain=true;
const roadV=new THREE.Mesh(new THREE.PlaneGeometry(7,420),roadM),roadH=new THREE.Mesh(new THREE.PlaneGeometry(420,7),roadM2);
for(const r of [roadV,roadH]){r.rotation.x=-Math.PI/2;r.position.y=.02;r.receiveShadow=true;scene.add(r);}
onTex('asphalt',()=>{roadM.map=texRep('asphalt',1,60);roadM2.map=texRep('asphalt',60,1);for(const m of roadMats)m.needsUpdate=true;});
const dashV=new THREE.Group(),dashH=new THREE.Group();scene.add(dashV,dashH);
for(let t=-210;t<210;t+=6){
  const a=new THREE.Mesh(new THREE.PlaneGeometry(.25,2.2),dashM);a.rotation.x=-Math.PI/2;a.position.set(0,.03,t);dashV.add(a);
  const b=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.25),dashM);b.rotation.x=-Math.PI/2;b.position.set(t,.03,0);dashH.add(b);}
let lastSnap='';
function updateGroundWindow(){
  const sx=Math.round(player.x/WSNAP)*WSNAP,sz=Math.round(player.z/WSNAP)*WSNAP,k=sx+','+sz;if(k===lastSnap)return;lastSnap=k;
  ground.position.set(sx,0,sz);rebuildGround(sx,sz);water.position.x=sx;water.position.z=sz;roadV.position.z=sz;roadH.position.x=sx;dashV.position.z=sz;dashH.position.x=sx;
  for(const d of dashV.children)d.visible=Math.abs(d.position.z+sz)>BR+3;
  for(const d of dashH.children)d.visible=Math.abs(d.position.x+sx)>BR+3;
  updateEdgeLines(sx,sz);
}

/* ---------- obstacle spatial grid (collision, bullets and placement only look at nearby cells) ---------- */
const OGC=4,OG=new Map();
const ogk=(ix,iz)=>(ix+50000)*100000+(iz+50000);
function addOb(o){o.k=ogk(Math.floor(o.x/OGC),Math.floor(o.z/OGC));let a=OG.get(o.k);if(!a)OG.set(o.k,a=[]);a.push(o);if(CUR)CUR.obs.push(o);return o;}
function addObs(...os){for(const o of os)addOb(o);}
function delOb(o){const a=OG.get(o.k);if(!a)return;const i=a.indexOf(o);if(i>=0)a.splice(i,1);if(!a.length)OG.delete(o.k);}
function nearObs(x,z,r,fn){const R=r+1.8;const x0=Math.floor((x-R)/OGC),x1=Math.floor((x+R)/OGC),z0=Math.floor((z-R)/OGC),z1=Math.floor((z+R)/OGC);
  for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const a=OG.get(ogk(i,j));if(a)for(const o of a)if(o.r>0)fn(o);}}
function blockedSpot(x,z,r){if(Math.max(Math.abs(x),Math.abs(z))<BR+9)return true;if(depthAt(x,z)>-.3)return true;let hit=false;
  nearObs(x,z,r,o=>{if(hit)return;const dx=o.x-x,dz=o.z-z;if(dx*dx+dz*dz<(o.r+r)*(o.r+r))hit=true;});return hit;}
function l2w(x,z,rot,lx,lz){const c=Math.cos(rot),s=Math.sin(rot);return{x:x+lx*c+lz*s,z:z-lx*s+lz*c};}

/* ---------- hand-painted sprite sheets (canvas): vehicles and animal coats, inked to match the rest of the world ---------- */
const SPR_C={};
function sprite(key,w,h,paint){if(SPR_C[key])return SPR_C[key];const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');const R=mulberry(key.length*7919+key.charCodeAt(0)*31+(key.charCodeAt(key.length-1)||0));
  paint(g,w,h,(a,b)=>a+R()*(b-a));const t=new THREE.CanvasTexture(c);t.anisotropy=4;return SPR_C[key]=t;}
const SPR_M={};
function sprMat(key,w,h,paint,o){if(SPR_M[key])return SPR_M[key];const m=new THREE.MeshToonMaterial(Object.assign({map:sprite(key,w,h,paint),gradientMap:TOON_GRAD},o||{}));return SPR_M[key]=m;}
const hexCss=(c,k)=>{const col=new THREE.Color(c);if(k)col.multiplyScalar(k);return'#'+col.getHexString();};
// grime, rust blooms and ink scratches shared by every painted panel
function weather(g,w,h,r,rust){
  for(let k=0;k<(rust||6);k++){const x=r(0,w),y=r(h*.3,h),rx=r(4,w*.08),ry=r(3,h*.12);
    g.fillStyle=`rgba(${r(110,150)|0},${r(52,70)|0},${r(18,30)|0},${r(.35,.7)})`;g.beginPath();g.ellipse(x,y,rx,ry,r(0,3),0,6.28);g.fill();
    g.fillStyle='rgba(40,20,8,.45)';for(let j=0;j<4;j++){g.beginPath();g.arc(x+r(-rx,rx),y+r(-ry,ry),r(1,2.5),0,6.28);g.fill();}}
  const gr=g.createLinearGradient(0,h*.55,0,h);gr.addColorStop(0,'rgba(60,45,30,0)');gr.addColorStop(1,'rgba(60,45,30,.55)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='rgba(15,10,6,.4)';g.lineWidth=1.2;for(let k=0;k<26;k++){const x=r(0,w),y=r(0,h);g.beginPath();g.moveTo(x,y);g.lineTo(x+r(4,9),y-r(4,9));g.stroke();}
}
const INKC='#120d09';
function carSide(g,w,h,r,col,model){
  g.fillStyle=hexCss(col);g.fillRect(0,0,w,h);
  g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,h*.12,w,h*.1);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(0,h*.62,w,h*.38);
  g.fillStyle='#d8d4c8';g.fillRect(0,h*.46,w,h*.05);g.strokeStyle=INKC;g.lineWidth=2;g.strokeRect(0,h*.46,w,h*.05);
  // wheel arches
  g.fillStyle='#14110e';for(const x of model==='pickup'?[.2,.8]:[.18,.8]){g.beginPath();g.arc(x*w,h,h*.48,Math.PI,0);g.fill();}
  // door seams + handles
  g.strokeStyle=INKC;g.lineWidth=3;const doors=model==='pickup'?[.36,.56]:model==='wagon'?[.3,.5,.7]:[.32,.52,.7];
  for(const x of doors){g.beginPath();g.moveTo(x*w,h*.05);g.lineTo(x*w,h*.86);g.stroke();}
  g.fillStyle='#bab6aa';for(let i=0;i<doors.length-1;i++){g.fillRect((doors[i]+.03)*w,h*.36,w*.04,h*.05);}
  if(model==='pickup'){g.lineWidth=3;g.beginPath();g.moveTo(.58*w,h*.02);g.lineTo(.58*w,h*.9);g.stroke();}
  weather(g,w,h,r,model==='pickup'?9:6);
  g.strokeStyle=INKC;g.lineWidth=6;g.strokeRect(0,0,w,h);
}
function carFront(g,w,h,r,col){
  g.fillStyle=hexCss(col);g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,h*.6,w,h*.4);
  g.fillStyle='#2a2a26';g.fillRect(w*.26,h*.22,w*.48,h*.36);g.strokeStyle='#8a8678';g.lineWidth=3;for(let i=1;i<6;i++){g.beginPath();g.moveTo(w*.26+i*w*.08,h*.22);g.lineTo(w*.26+i*w*.08,h*.58);g.stroke();}
  g.strokeStyle=INKC;g.lineWidth=4;g.strokeRect(w*.26,h*.22,w*.48,h*.36);
  for(const x of [.12,.88]){g.fillStyle='#f4e7b0';g.beginPath();g.arc(x*w,h*.38,h*.15,0,6.28);g.fill();g.lineWidth=4;g.stroke();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.arc(x*w-3,h*.33,h*.05,0,6.28);g.fill();}
  g.fillStyle='#c8c4b8';g.fillRect(0,h*.68,w,h*.14);g.strokeRect(0,h*.68,w,h*.14);
  g.fillStyle='#e8e2d0';g.fillRect(w*.38,h*.72,w*.24,h*.12);g.fillStyle='#2a3a6a';g.font=`bold ${h*.1|0}px sans-serif`;g.textAlign='center';g.fillText('IA 4·'+(r(100,999)|0),w*.5,h*.82);
  weather(g,w,h,r,3);g.strokeStyle=INKC;g.lineWidth=6;g.strokeRect(0,0,w,h);
}
function carBack(g,w,h,r,col){
  g.fillStyle=hexCss(col);g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,h*.6,w,h*.4);
  for(const x of [.03,.79]){g.fillStyle='#b3261e';g.fillRect(x*w,h*.2,w*.18,h*.22);g.fillStyle='#f0a030';g.fillRect(x*w,h*.42,w*.18,h*.08);g.strokeStyle=INKC;g.lineWidth=4;g.strokeRect(x*w,h*.2,w*.18,h*.3);}
  g.fillStyle='#c8c4b8';g.fillRect(0,h*.7,w,h*.13);g.strokeRect(0,h*.7,w,h*.13);g.fillStyle='#e8e2d0';g.fillRect(w*.38,h*.38,w*.24,h*.16);g.strokeRect(w*.38,h*.38,w*.24,h*.16);
  g.fillStyle='#2a3a6a';g.font=`bold ${h*.1|0}px sans-serif`;g.textAlign='center';g.fillText('IOWA',w*.5,h*.5);
  weather(g,w,h,r,4);g.strokeStyle=INKC;g.lineWidth=6;g.strokeRect(0,0,w,h);
}
function carTop(g,w,h,r,col){
  g.fillStyle=hexCss(col);g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.14)';g.fillRect(w*.1,0,w*.2,h);
  g.fillStyle='rgba(120,100,70,.35)';for(let k=0;k<30;k++){g.beginPath();g.arc(r(0,w),r(0,h),r(2,10),0,6.28);g.fill();}
  g.fillStyle='rgba(40,60,20,.4)';for(let k=0;k<6;k++){g.beginPath();g.ellipse(r(0,w),r(0,h),r(4,14),r(2,6),r(0,3),0,6.28);g.fill();}
  weather(g,w,h,r,5);g.strokeStyle=INKC;g.lineWidth=6;g.strokeRect(0,0,w,h);
}
function carGlass(g,w,h,r){
  g.fillStyle='#3c4a4c';g.fillRect(0,0,w,h);g.fillStyle='#1d2526';g.fillRect(w*.05,h*.12,w*.9,h*.78);
  g.fillStyle='rgba(200,225,230,.32)';g.beginPath();g.moveTo(w*.1,h*.9);g.lineTo(w*.3,h*.9);g.lineTo(w*.55,h*.12);g.lineTo(w*.35,h*.12);g.fill();
  g.strokeStyle='rgba(230,240,240,.5)';g.lineWidth=1.5;if(r(0,1)<.6){const cx=r(w*.2,w*.8),cy=r(h*.3,h*.7);for(let k=0;k<9;k++){const a=r(0,6.28);g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(a)*r(10,40),cy+Math.sin(a)*r(6,26));g.stroke();}}
  g.fillStyle='rgba(120,90,60,.4)';g.fillRect(0,h*.82,w,h*.18);
  g.strokeStyle=INKC;g.lineWidth=7;g.strokeRect(0,0,w,h);g.lineWidth=5;g.beginPath();g.moveTo(w*.5,0);g.lineTo(w*.5,h);g.stroke();
}
function carRust(g,w,h,r){
  g.fillStyle='#3e2e24';g.fillRect(0,0,w,h);
  for(let k=0;k<90;k++){g.fillStyle=`rgba(${r(95,130)|0},${r(50,66)|0},${r(24,36)|0},${r(.25,.55)})`;g.beginPath();g.arc(r(0,w),r(0,h),r(2,12),0,6.28);g.fill();}
  g.fillStyle='rgba(20,12,8,.6)';for(let k=0;k<14;k++){g.beginPath();g.ellipse(r(0,w),r(0,h),r(3,10),r(2,6),r(0,3),0,6.28);g.fill();}
  g.strokeStyle=INKC;g.lineWidth=6;g.strokeRect(0,0,w,h);
}
function tireFace(g,w,h){g.fillStyle='#1a1917';g.fillRect(0,0,w,h);g.fillStyle='#3a3934';g.beginPath();g.arc(w/2,h/2,w*.3,0,6.28);g.fill();g.fillStyle='#8a877c';g.beginPath();g.arc(w/2,h/2,w*.17,0,6.28);g.fill();
  g.strokeStyle=INKC;g.lineWidth=4;g.beginPath();g.arc(w/2,h/2,w*.3,0,6.28);g.stroke();g.fillStyle=INKC;for(let i=0;i<5;i++){const a=i/5*6.28;g.beginPath();g.arc(w/2+Math.cos(a)*w*.1,h/2+Math.sin(a)*w*.1,3,0,6.28);g.fill();}}
const CAR_COLS=[0x8a3a2e,0x3e5d78,0x9a9284,0x4e6a3c,0xb08a3a,0x6a2f3a,0xd8d0bc,0x2f3a4a];
function carMats(col,model){
  const k=col+'|'+model;if(SPR_M['car'+k])return SPR_M['car'+k];
  const side=sprMat('cs'+k,256,96,(g,w,h,r)=>carSide(g,w,h,r,col,model)),front=sprMat('cf'+col,128,80,(g,w,h,r)=>carFront(g,w,h,r,col)),
    back=sprMat('cb'+col,128,80,(g,w,h,r)=>carBack(g,w,h,r,col)),top=sprMat('ct'+col,128,128,(g,w,h,r)=>carTop(g,w,h,r,col)),dark=M(0x1d1b18);
  // BoxGeometry face order: +x, -x, +y, -y, +z (front), -z (back)
  return SPR_M['car'+k]={body:[side,side,top,dark,front,back],glass:sprMat('cg',128,64,carGlass),rust:sprMat('crust',128,128,carRust),tire:sprMat('tire',64,64,tireFace),top};
}

/* ---------- vehicles: sedans, station wagons and pickups. Strip them for parts (E). ---------- */
const CAR_LOOT=[
  {t:'Pried off the leaf springs',give:{SPR:2}},{t:'Pulled the alternator',give:{parts:1}},{t:'Siphoned the gas tank',give:{CHM:1}},
  {t:'Hauled out the battery',give:{CHM:1,scrap:4}},{t:'Stripped the wiring harness',give:{scrap:10}},{t:'Cut out the exhaust pipe',give:{BAR:1}},
  {t:'Took the radiator',give:{scrap:8,parts:1}},{t:'Cut up the seats',give:{FUR:1,cloth:2}},{t:'Popped the trunk',give:'trunk'},{t:'Jacked the rims',give:{scrap:12}},
];
function addCar(x,z,rot,model){
  model=model||(RNG()<.34?'pickup':RNG()<.3?'wagon':'sedan');
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.rotation.z=rand(-.04,.04);track(g);
  const KC=kitCarBody(g,model);
  if(KC){const obs=[],n=Math.max(2,Math.round(KC.len/1.8)),r=KC.wid/2*1.12;
    for(let i=0;i<n;i++){const lz=-KC.len/2+r*.8+(KC.len-r*1.6)*i/(n-1),p=l2w(x,z,rot,0,lz);obs.push(addOb({x:p.x,z:p.z,r,h:Math.min(KC.hgt,2.6)}));}
    const key='car'+cutKey(x,z),mem=CUR&&chunkMem.get(CUR.key),left=mem&&mem.cars&&mem.cars.has(key)?mem.cars.get(key):randi(2,4)+PERK('mechanic')+(KC.len>5?1:0);
    const c={x,z,rot,g,model:KC.name,kit:true,mat:KC.mat,body:KC.body,wheels:KC.wheels,wid:KC.wid,hgt:KC.hgt,left,key,ch:CUR,alarm:RNG()<.18&&!CAR_SERVICE.has(KC.name),len:KC.len};
    carSpots.push(c);if(CUR)CUR.cars.push(c);if(!left)stripLook(c);return c;}
  const col=pick(CAR_COLS),mt=carMats(col,model),len=model==='pickup'?4.9:model==='wagon'?4.6:4.3;
  const body=mki(BOX(2,.78,len),mt.body,0,.74,0,.07);g.add(body);
  let cab;
  if(model==='pickup'){cab=mki(BOX(1.84,.78,1.6),mt.glass,0,1.5,.5,.06);g.add(cab);g.add(mk(BOX(1.88,.1,1.64),mt.top,0,1.92,.5));
    g.add(mk(BOX(1.86,.5,.12),mt.body,0,1.38,-.95));g.add(mk(BOX(.12,.5,2.1),mt.body,.94,1.38,-1.4));g.add(mk(BOX(.12,.5,2.1),mt.body,-.94,1.38,-1.4));g.add(mk(BOX(1.86,.5,.12),mt.body,0,1.38,-2.4));
    g.add(mk(BOX(1.7,.05,2),M(0x2a2622),0,1.14,-1.4));if(RNG()<.5)g.add(mki(BOX(.8,.6,.9),TM('wood',1,1,0x6a4e34,0xb09878),rand(-.3,.3),1.45,-1.6,.04));}
  else{const cl=model==='wagon'?2.9:2.2,cz=model==='wagon'?-.55:-.2;cab=mki(BOX(1.82,.72,cl),mt.glass,0,1.49,cz,.06);g.add(cab);g.add(mk(BOX(1.86,.08,cl+.04),mt.top,0,1.89,cz));
    if(model==='wagon'&&RNG()<.6)for(const s of [-.6,.6])g.add(mk(BOX(.06,.06,cl*.9),M(0x8a8a82),s,1.96,cz));}
  const wheels=[],wz=len/2-.95;
  for(const [wx,wzz] of [[-1,wz],[1,wz],[-1,-wz],[1,-wz]]){const w=mki(CYL(.38,.38,.3,12),[M(0x1d1d1b),mt.tire,mt.tire],wx,.38,wzz,.04);w.rotation.z=Math.PI/2;g.add(w);wheels.push(w);}
  const obs=[];for(const lz of model==='pickup'?[-1.6,0,1.6]:[-1.1,1.1]){const p=l2w(x,z,rot,0,lz);obs.push(addOb({x:p.x,z:p.z,r:1.25,h:1.6}));}
  const key='car'+cutKey(x,z),mem=CUR&&chunkMem.get(CUR.key),left=mem&&mem.cars&&mem.cars.has(key)?mem.cars.get(key):randi(2,4)+PERK('mechanic');
  const c={x,z,rot,g,model,mt,body,cab,wheels,left,key,ch:CUR,alarm:RNG()<.18,len};carSpots.push(c);if(CUR)CUR.cars.push(c);
  if(!left)stripLook(c);
  return c;
}
function stripLook(c){
  if(c.stripped)return;c.stripped=true;if(c.kit){kitStripLook(c);return;}
  c.body.material=[c.mt.rust,c.mt.rust,c.mt.rust,c.body.material[3],c.mt.rust,c.mt.rust];
  for(const w of c.wheels)w.visible=false;c.g.position.y=-.3;
  const hood=mk(BOX(1.9,.06,1.2),c.mt.rust,0,1.55,c.len/2-.1);hood.rotation.x=-1.1;c.g.add(hood);
}
function nearestCar(){let best=null,bd=1e9;
  for(const c of carSpots){if(!c.g||(player.lvl||0))continue;const dx=player.x-c.x,dz=player.z-c.z;if(Math.abs(dx)>5||Math.abs(dz)>5)continue;
    const cs=Math.cos(c.rot),sn=Math.sin(c.rot),lx=dx*cs-dz*sn,lz=dx*sn+dz*cs;const ex=Math.max(0,Math.abs(lx)-1),ez=Math.max(0,Math.abs(lz)-c.len/2),d=Math.hypot(ex,ez);
    if(d<1.15&&d<bd){bd=d;best=c;}}
  return best;}
function stripCar(c){
  if(player.fireCd>0||!player.alive||player.swim)return;
  if(c.left<=0){toast('Nothing left worth taking.');player.fireCd=.6;return;}
  player.fireCd=1.1;player.swing=.3;heroAction('fix',{from:1.1,dur:1.05,still:true});rumble(.3,.3,90);S.shake=Math.max(S.shake,.06);
  Sound.play('clink');Sound.play('thud',.7);burst(c.x,1,c.z,6,'spark',4);burst(c.x,.8,c.z,3,'debris',3);
  makeNoise(c.x,c.z,22);
  if(c.alarm){c.alarm=false;carAlarm(c);}
  const L=pick(CAR_LOOT),out=[];
  if(L.give==='trunk'){const roll=Math.random();if(roll<.35&&player.med<5){player.med++;out.push('medkit');}else if(roll<.6){const am=ownedAmmo();if(am.length){const k=pick(am);grantAmmo(k,1);out.push(`${AMMO[k].name} ammo`);}else{player.scrap+=10;out.push('+10 scrap');}}
    else if(roll<.8){player.food=(player.food||0)+2;out.push('+2 food');}else{player.scrap+=15;out.push('+15 scrap');}}
  else for(const [k,v] of Object.entries(L.give)){if(k==='scrap'||k==='parts'||k in RES_KEYS)player[k]=(player[k]||0)+v;else comp[k]=(comp[k]||0)+v;out.push(`+${v} ${k==='scrap'?'scrap':k==='parts'?(v>1?'parts':'part'):k in RES_KEYS?RES_KEYS[k].toLowerCase():compN(k,v).toLowerCase()}`);}
  c.left--;floatText(c.x,2.2,c.z,out.join(' · '));toast(`${L.t}: ${out.join(', ')}`);gainXP(6);
  const mem=c.ch&&chunkMem.get(c.ch.key);if(mem){(mem.cars||(mem.cars=new Map())).set(c.key,c.left);}
  if(c.left<=0){stripLook(c);jobProg('salvage',1);floatText(c.x,2.8,c.z,'Stripped');Sound.play('crash',.5);}
}
const ALARMS=[];
function carAlarm(c){ALARMS.push({c,t:7,beep:0});makeNoise(c.x,c.z,75);toast('Car alarm! Every infected nearby heard that.','bad');}
function updateAlarms(dt){for(let i=ALARMS.length-1;i>=0;i--){const a=ALARMS[i];a.t-=dt;a.beep-=dt;
  if(a.beep<=0){a.beep=.45;Sound.play('empty',clamp(1-Math.hypot(a.c.x-player.x,a.c.z-player.z)/60,.15,1));Sound.play('ui');
    const on=(a.t*2.2|0)%2===0,em=carEmissive(a.c);if(em)em.setHex(on?0x8a7020:0);if((a.t*2|0)%3===0)makeNoise(a.c.x,a.c.z,40);}
  if(a.t<=0){const em=carEmissive(a.c);if(em)em.setHex(0);ALARMS.splice(i,1);}}}
const carEmissive=c=>c.kit?c.mat.emissive:c.body.material[4]&&c.body.material[4].emissive;

/* ---------- streamed world chunks ---------- */
const CH=48,CH_LOAD=2,CH_KEEP=3,chunks=new Map(),chunkMem=new Map(),chunkQueue=[];
let CUR=null,WORLD_SEED=1,lastPC='';
function track(o){scene.add(o);if(CUR)CUR.objs.push(o);return o;}
const sdoors=[],houses=[],carSpots=[],trees=[],barrels=[];
const doorM=TM('wood',1,1,0x5e4632,0xb8a890);
function addSwingDoor(px,pz,a0,len){
  const g=new THREE.Group();g.position.set(px,0,pz);g.rotation.y=-a0;
  g.add(mki(BOX(len,2.3,.12),doorM,len/2,1.15,0,.05));
  g.add(mk(BOX(.12,.12,.25),M(0xb89a4a,{metalness:.5}),len-.35,1.1,0,false));
  track(g);const d={g,px,pz,a0,len,ang:RNG()<.25?rand(-.45,.45):0,angV:0,home:0};d.home=d.ang;sdoors.push(d);if(CUR)CUR.doors.push(d);return d;
}
function addHouse(x,z,rot){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;track(g);
  const wallM=TM('plaster',2,1,pick([0x8a7f6c,0x7d7466,0x8f7a62]),pick([0xffffff,0xf0e8dc,0xe4e8e0])),trim=TM('wood',2,1,0x4a3f33,0x8a7a68);
  const fl=mk(BOX(8,.2,8),TM('wood',3,3,0x5b4a39,0xa89880),0,.1,0);fl.castShadow=false;g.add(fl);
  const pieces=[[0,-4,8,.3,2.8],[-4,0,.3,8,2.8],[4,-1.4,.3,5.2,2.8],[4,2.6,.3,2.8,1.1],[-2.6,4,2.8,.3,2.8],[2.9,4,2.2,.3,1.6]];
  for(const [lx,lz,w,d,h] of pieces){
    g.add(mki(BOX(w,h,d),wallM,lx,h/2,lz,.08));
    const len=Math.max(w,d),horiz=w>d,n=Math.ceil(len);
    for(let i=0;i<=n;i++){const t=-len/2+i*len/n;const p=l2w(x,z,rot,lx+(horiz?t:0),lz+(horiz?0:t));addOb({x:p.x,z:p.z,r:.55});}
  }
  for(const [lx,lz,w,d,y0] of [[4,2.6,.3,2.8,1.1],[2.9,4,2.2,.3,1.6]]){g.add(mki(BOX(w,2.8-2.2,d),wallM,lx,2.5,lz,.08));
    g.add(mk(BOX(w>d?w-.1:.08,2.2-y0,w>d?.08:d-.1),GLASS,lx,(y0+2.2)/2,lz,false));g.add(mk(BOX(w>d?w:.36,.1,w>d?.36:d),trim,lx,y0,lz));}
  g.add(mki(BOX(8.4,.25,.4),trim,0,2.9,-1.5,.05));
  const beam2=mki(BOX(.4,.25,6.5),trim,-1.2,2.75,.4,.05);beam2.rotation.z=.12;g.add(beam2);
  g.add(mki(BOX(1.6,.8,1),TM('wood',1,1,0x5a4430,0x9a8870),-2.2,.5,-2.6,.05));
  const hinge=l2w(x,z,rot,-1.15,4);
  addSwingDoor(hinge.x,hinge.z,Math.atan2(-Math.sin(rot),Math.cos(rot)),2.85);
  const K={g,x,z,rot,b:new Map(),r:new Map(),ob:[]};
  kGable(K,CTM('shingle',pick([0x8a7f78,0x6a5048,0x5a6670,0x7a5a4a]),2),ITM('plaster',0x8a7f6c,0xf0e8dc),8,8,2.8,2,false,.5);
  const roof=kBake(K,1),c=Math.abs(Math.cos(rot)),sn=Math.abs(Math.sin(rot));
  const h={x,z,rot,hw:4,hd:4,h:4.8,roof,kind:'house',ex:c*4+sn*4,ez:sn*4+c*4};houses.push(h);BUILDS.push(h);if(CUR){CUR.houses.push(h);CUR.builds.push(h);}
  return h;
}
/* ---------- building kit: pieces are baked into one mesh per material; roofs and upper floors sit in a group that hides when it would cover the player ---------- */
const BUILDS=[],SPIN=[];
const BTEXC={};
function btex(name){if(BTEXC[name])return BTEXC[name];
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),R=mulberry(name.length*977+13),r=(a,b)=>a+R()*(b-a);
  const ink='#140e0a';
  const hatch=(x,y,w,h,col,n,len)=>{g.strokeStyle=col;g.lineWidth=1.5;g.beginPath();for(let k=0;k<n;k++){const a=x+R()*w,b=y+R()*h;g.moveTo(a,b);g.lineTo(a+len,b-len);}g.stroke();};
  if(name==='brick'){g.fillStyle='#2a1f19';g.fillRect(0,0,256,256);
    for(let row=0;row<8;row++)for(let i=-1;i<4;i++){const x=i*64+(row%2?32:0),y=row*32;const v=r(.8,1.15);
      g.fillStyle=`rgb(${150*v|0},${70*v|0},${52*v|0})`;g.fillRect(x+3,y+3,58,26);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(x+3,y+22,58,7);}
    hatch(0,0,256,256,'rgba(20,10,5,.35)',60,6);}
  else if(name==='shingle'){g.fillStyle='#1d1a18';g.fillRect(0,0,256,256);
    for(let row=0;row<8;row++)for(let i=-1;i<5;i++){const x=i*52+(row%2?26:0),y=row*32,v=r(.75,1.1);g.fillStyle=`rgb(${120*v|0},${118*v|0},${112*v|0})`;
      g.beginPath();g.moveTo(x+2,y);g.lineTo(x+50,y);g.lineTo(x+50,y+26);g.quadraticCurveTo(x+26,y+33,x+2,y+26);g.closePath();g.fill();g.strokeStyle=ink;g.lineWidth=2;g.stroke();}
    hatch(0,0,256,256,'rgba(0,0,0,.3)',50,6);}
  else if(name==='siding'){g.fillStyle='#e8e2d4';g.fillRect(0,0,256,256);
    for(let row=0;row<8;row++){const y=row*32;g.fillStyle='rgba(0,0,0,.16)';g.fillRect(0,y+22,256,10);g.fillStyle=ink;g.fillRect(0,y+30,256,2.5);
      if(R()<.5){g.fillStyle='rgba(60,45,30,.35)';g.fillRect(r(0,200),y+4,r(20,60),18);}}
    hatch(0,0,256,256,'rgba(40,30,20,.3)',40,6);}
  else if(name==='logs'){g.fillStyle='#3a2a1c';g.fillRect(0,0,256,256);
    for(let row=0;row<8;row++){const y=row*32;const gr=g.createLinearGradient(0,y,0,y+32);gr.addColorStop(0,'#5a4330');gr.addColorStop(.35,'#9a7a56');gr.addColorStop(1,'#3e2c1c');
      g.fillStyle=gr;g.fillRect(0,y+1,256,30);g.strokeStyle=ink;g.lineWidth=2.5;g.beginPath();g.moveTo(0,y+31);g.lineTo(256,y+31);g.stroke();
      g.strokeStyle='rgba(30,20,10,.5)';g.lineWidth=1.2;for(let k=0;k<5;k++){g.beginPath();const x=r(0,230);g.moveTo(x,y+r(8,22));g.lineTo(x+r(20,50),y+r(8,22));g.stroke();}}}
  else if(name==='metalwall'){g.fillStyle='#9aa0a0';g.fillRect(0,0,256,256);
    for(let i=0;i<16;i++){const x=i*16;g.fillStyle='rgba(255,255,255,.22)';g.fillRect(x,0,5,256);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(x+9,0,6,256);g.fillStyle=ink;g.fillRect(x+15,0,1.5,256);}
    for(let k=0;k<9;k++){g.fillStyle=`rgba(${r(110,150)|0},${r(50,70)|0},20,${r(.12,.3)})`;g.beginPath();g.ellipse(r(0,256),r(0,256),r(6,22),r(10,40),0,0,6.28);g.fill();}}
  else if(name==='awning'){for(let i=0;i<8;i++){g.fillStyle=i%2?'#efe6d2':'#ffffff';g.fillRect(i*32,0,32,256);}g.fillStyle='rgba(0,0,0,.15)';for(let i=0;i<8;i++)g.fillRect(i*32+26,0,6,256);hatch(0,0,256,256,'rgba(0,0,0,.2)',40,6);}
  else if(name==='hay'){g.fillStyle='#c9a54a';g.fillRect(0,0,256,256);g.strokeStyle='#8a6a22';g.lineWidth=2;
    for(let k=0;k<260;k++){g.beginPath();const x=r(0,256),y=r(0,256),a=r(-.4,.4);g.moveTo(x,y);g.lineTo(x+Math.cos(a)*20,y+Math.sin(a)*20);g.stroke();}
    g.fillStyle='#5a3e16';g.fillRect(0,80,256,5);g.fillRect(0,170,256,5);}
  else if(name==='stained'){g.fillStyle=ink;g.fillRect(0,0,256,256);const cols=['#b8322a','#2f5fa8','#d9a520','#3f8f4a','#7a3f9a'];
    for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){g.fillStyle=cols[(R()*cols.length)|0];g.fillRect(x+3,y+3,26,26);}}
  else if(name==='glass'){ // see-through: a faint tint, two highlight streaks, grime settled along the bottom
    g.fillStyle='rgba(150,182,192,.2)';g.fillRect(0,0,256,256);g.fillStyle='rgba(225,242,248,.38)';
    g.beginPath();g.moveTo(40,256);g.lineTo(110,256);g.lineTo(256,110);g.lineTo(256,40);g.fill();g.fillStyle='rgba(225,242,248,.22)';g.beginPath();g.moveTo(140,256);g.lineTo(160,256);g.lineTo(256,160);g.lineTo(256,140);g.fill();
    const gr=g.createLinearGradient(0,256,0,170);gr.addColorStop(0,'rgba(70,62,44,.4)');gr.addColorStop(1,'rgba(70,62,44,0)');g.fillStyle=gr;g.fillRect(0,170,256,86);
    for(let k=0;k<40;k++){g.fillStyle=`rgba(80,70,50,${r(.05,.18)})`;g.beginPath();g.arc(r(0,256),r(0,256),r(1,5),0,6.28);g.fill();}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return BTEXC[name]=t;}
const BMAT={};
// canvas-textured toon material; T = metres covered by one texture tile
function CTM(name,tint,T){const k=name+'|'+tint+'|'+T;if(BMAT[k])return BMAT[k];const m=new THREE.MeshToonMaterial({map:btex(name),color:tint==null?0xffffff:tint,gradientMap:TOON_GRAD});m.userData.T=T||2;return BMAT[k]=m;}
// image-textured toon material (the loaded .jpg set)
function ITM(name,fallback,tint,T){const k='i'+name+'|'+fallback+'|'+tint+'|'+T;if(BMAT[k])return BMAT[k];const m=new THREE.MeshToonMaterial({color:fallback,gradientMap:TOON_GRAD});m.userData.T=T||3;
  onTex(name,t=>{m.map=t;m.color.setHex(tint==null?0xffffff:tint);m.needsUpdate=true;});return BMAT[k]=m;}
function FLAT(hex,noInk){const k='f'+hex+(noInk?'n':'');if(BMAT[k])return BMAT[k];const m=new THREE.MeshToonMaterial({color:hex,gradientMap:TOON_GRAD});m.userData.noInk=!!noInk;return BMAT[k]=m;}
const GLASS=(()=>{const m=new THREE.MeshToonMaterial({map:btex('glass'),gradientMap:TOON_GRAD,emissive:0x050a0c,transparent:true,depthWrite:false,side:THREE.DoubleSide});m.userData.T=1.6;m.userData.noInk=true;return m;})();
const STAINED=(()=>{const m=new THREE.MeshToonMaterial({map:btex('stained'),gradientMap:TOON_GRAD,emissive:0x2a1a10,transparent:true,opacity:.82,depthWrite:false,side:THREE.DoubleSide});m.userData.T=1.2;m.userData.noInk=true;return m;})();
const SIGNS={};
function signMat(text,bg,fg){const k=text+bg;if(SIGNS[k])return SIGNS[k].m;
  const c=document.createElement('canvas');c.width=512;c.height=128;const t=new THREE.CanvasTexture(c);t.anisotropy=4;
  const draw=()=>{const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,512,128);g.strokeStyle='#140e0a';g.lineWidth=10;g.strokeRect(5,5,502,118);
    g.fillStyle=fg;g.font=`bold ${text.length>9?64:80}px "Stardos Stencil", Impact, sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(text,256,68);
    g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;for(let i=0;i<30;i++){const x=Math.random()*512,y=Math.random()*128;g.beginPath();g.moveTo(x,y);g.lineTo(x+8,y-8);g.stroke();}
    g.fillStyle='rgba(60,30,10,.35)';for(let i=0;i<4;i++){g.beginPath();g.ellipse(Math.random()*512,Math.random()*128,20,10,0,0,6.28);g.fill();}t.needsUpdate=true;};
  draw();const m=new THREE.MeshToonMaterial({map:t,gradientMap:TOON_GRAD,emissive:0x111111});m.userData.noInk=true;m.userData.sign=1;SIGNS[k]={m,draw};return m;}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{for(const s of Object.values(SIGNS))s.draw();});

const _bm=new THREE.Matrix4(),_be=new THREE.Euler(),_bq=new THREE.Quaternion(),_bp=new V3(),_bs=new V3(1,1,1);
function Kit(x,z,rot){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;track(g);return{g,x,z,rot,b:new Map(),r:new Map(),u:new Map(),ob:[]};}
// add a piece (local coords); roof=1 puts it in the hideable roof group, 2 in the upper-floor group
function kAdd(K,roof,mat,geo,x,y,z,ry,rx,rz,sx,sy,sz){
  const g=geo.index?geo.toNonIndexed():geo.clone();
  _be.set(rx||0,ry||0,rz||0,'YXZ');_bq.setFromEuler(_be);_bm.compose(_bp.set(x,y,z),_bq,_bs.set(sx||1,sy||1,sz||1));g.applyMatrix4(_bm);
  if(sx||sy||sz)g.computeVertexNormals();
  // box-projected uvs in metres, so every piece shows the texture at the same scale
  const P=g.attributes.position,N=g.attributes.normal,uv=new Float32Array(P.count*2),T=mat.userData.T||2;
  if(mat.userData.sign){const s=g.attributes.uv;for(let i=0;i<P.count;i++){uv[i*2]=s.getX(i);uv[i*2+1]=s.getY(i);}}
  else for(let i=0;i<P.count;i++){const ax=Math.abs(N.getX(i)),ay=Math.abs(N.getY(i)),az=Math.abs(N.getZ(i));let u,v;
    if(ay>=ax&&ay>=az){u=P.getX(i);v=P.getZ(i);}else if(ax>=az){u=P.getZ(i);v=P.getY(i);}else{u=P.getX(i);v=P.getY(i);}
    uv[i*2]=u/T;uv[i*2+1]=v/T;}
  g.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const m=roof===2?K.u:roof?K.r:K.b;let l=m.get(mat);if(!l)m.set(mat,l=[]);l.push(g);
}
const kBox=(K,roof,mat,w,h,d,x,y,z,ry,rx,rz)=>{K._lb=[w,h,d,x,y,z,ry||0];return kAdd(K,roof,mat,BOX(w,h,d),x,y,z,ry,rx,rz);};
function mergeSimple(list){const out=new THREE.BufferGeometry();
  for(const n of ['position','normal','uv']){const sz=list[0].attributes[n].itemSize;let tot=0;for(const g of list)tot+=g.attributes[n].array.length;
    const a=new Float32Array(tot);let o=0;for(const g of list){a.set(g.attributes[n].array,o);o+=g.attributes[n].array.length;g.dispose();}out.setAttribute(n,new THREE.BufferAttribute(a,sz));}
  out.computeBoundingSphere();return out;}
const INK_PUSH=(()=>{const m=new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed+=normal*.045;');};m.customProgramCacheKey=()=>'inkpush';return m;})();
function kBake(K,roof){const grp=new THREE.Group();
  for(const [mat,list] of (roof===2?K.u:roof?K.r:K.b)){const geo=mergeSimple(list);if(CUR)CUR.geos.push(geo);const m=new THREE.Mesh(geo,mat);m.castShadow=!mat.transparent;m.receiveShadow=true;grp.add(m);
    if(!mat.userData.noInk){const o=new THREE.Mesh(geo,INK_PUSH);o.castShadow=o.receiveShadow=false;o.visible=GFX==='high';m.add(o);inkHulls.add(o);if(CUR)CUR.inks.push(o);}}
  K.g.add(grp);return grp;}
// wall along local x (z fixed) or local z (x fixed). openings: [centre, width, kind] d=door gap, w=window, b=boarded window, s=stained window, g=wide opening
function kWall(K,axis,fixed,a0,a1,h,mat,ops,o){
  o=o||{};const t=o.t||.3,sill=o.sill||.9,top=o.top||2.2,win=o.glass||GLASS,out=Math.sign(fixed)||1,G=o.grp||0,Y=o.y0||0;
  ops=(ops||[]).slice().sort((p,q)=>p[0]-q[0]);
  const piece=(s0,s1,y0,y1,m,tt,off)=>{if(s1-s0<.02||y1-y0<.02)return;const c=(s0+s1)/2,l=s1-s0;
    if(axis==='x')kBox(K,G,m,l,y1-y0,tt||t,c,Y+(y0+y1)/2,fixed+(off||0));else kBox(K,G,m,tt||t,y1-y0,l,fixed+(off||0),Y+(y0+y1)/2,c);};
  const solid=(s0,s1)=>{if(o.noSolid)return;const l=s1-s0;if(l<.05)return;const n=Math.max(1,Math.ceil(l));for(let i=0;i<=n;i++){const s=s0+l*i/n;K.ob.push(axis==='x'?[s,fixed,0,o.lvl]:[fixed,s,0,o.lvl]);}};
  // collision circles stop short of doorways so a person can actually fit through
  let cur=a0,inset=0;
  for(const [c,w,kind] of ops){const s0=c-w/2,s1=c+w/2,gap=kind==='d'||kind==='g';piece(cur,s0,0,h,mat);solid(cur+inset,s0-(gap?.56:0));inset=gap?.56:0;
    if(kind==='d'){piece(s0,s1,2.4,h,mat);if(!G&&!Y)(K.dops||(K.dops=[])).push([axis,fixed,s0,w]);}
    else if(kind==='g'){const gt=o.gTop||3.3;piece(s0,s1,gt,h,mat);
      // a roll-up door stuck a third of the way down
      if(!o.noRoll){const down=gt*rand(.3,.4),rm=CTM('metalwall',pick([0xb8b4a8,0x8a8e88,0xa89a80]),1.2);piece(s0+.05,s1-.05,gt-down,gt,rm,.1,-out*.05);}}
    else{piece(s0,s1,0,sill,mat);piece(s0,s1,top,h,mat);
      const gm=kind==='s'?STAINED:win;piece(s0,s1,sill,top,gm,.08);
      if(kind==='b')solid(s0,s1);
      else{const L=G===2?K.u:G?K.r:K.b,gl=L.get(gm),geo=gl.pop();if(!gl.length)L.delete(gm);const wi=(K.wins||(K.wins=[])).push({geo,mat:gm,G,lc:axis==='x'?[c,fixed]:[fixed,c],sill:Y+sill,top:Y+top,Y,obs:[]})-1;
        const n0=K.ob.length;solid(s0,s1);for(let q=n0;q<K.ob.length;q++)K.ob[q][5]=wi;}
      const trim=o.trim||FLAT(0xe8e0cc);piece(s0-.08,s1+.08,sill-.1,sill,trim,t+.16);piece(s0-.08,s1+.08,top,top+.1,trim,t+.16);
      if(kind==='b'){const bw=FLAT(0x6a5038);const cx=c,cy=(sill+top)/2,len=Math.hypot(w,top-sill)*.92,a=Math.atan2(top-sill,w);
        for(const sgn of [1,-1]){if(axis==='x')kBox(K,G,bw,len,.18,.06,cx,Y+cy,fixed+out*(t/2+.05),0,0,a*sgn);else kBox(K,G,bw,.06,.18,len,fixed+out*(t/2+.05),Y+cy,cx,0,a*sgn,0);}}}
    cur=s1;}
  piece(cur,a1,0,h,mat);solid(cur+inset,a1);
}
// gable roof over w x d, eaves at height y; ridge along local x (or z when alongZ)
function kGable(K,mat,endMat,w,d,y,rise,alongZ,oh){
  oh=oh==null?.5:oh;const span=(alongZ?w:d)/2,len=(alongZ?d:w)+oh*2,sl=Math.hypot(span+oh,rise*(span+oh)/span),a=Math.atan2(rise,span);
  for(const s of [-1,1]){const cx=s*(span+oh)/2,cy=y+rise/2-rise*oh/span/2+.12;
    if(alongZ)kBox(K,1,mat,sl,.2,len,cx,cy,0,0,0,-s*a);else kBox(K,1,mat,len,.2,sl,0,cy,cx,0,s*a,0);}
  const sh=new THREE.Shape();sh.moveTo(-span,0);sh.lineTo(span,0);sh.lineTo(0,rise);sh.closePath();
  const tri=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false});
  const e=(alongZ?d:w)/2-.15;
  for(const s of [-1,1]){if(alongZ)kAdd(K,1,endMat,tri,0,y,s*e-.15,0);else kAdd(K,1,endMat,tri,s*e-.15,y,0,Math.PI/2);}
  tri.dispose();
}
function kFlatRoof(K,mat,w,d,y,lip){kBox(K,1,mat,w,.25,d,0,y+.12,0);const L=lip||.6,pm=FLAT(0x5a5650);
  kBox(K,1,pm,w,L,.25,0,y+L/2,d/2-.12);kBox(K,1,pm,w,L,.25,0,y+L/2,-d/2+.12);kBox(K,1,pm,.25,L,d,w/2-.12,y+L/2,0);kBox(K,1,pm,.25,L,d,-w/2+.12,y+L/2,0);}
// door that swings: hinge at local (x0, z) on a wall along local x
function kDoor(K,x0,z,w){const p=l2w(K.x,K.z,K.rot,x0,z);addSwingDoor(p.x,p.z,-K.rot,w);(K.kd||(K.kd=[])).push([x0+w/2,z]);}
// every ground-floor doorway gets a door unless the builder already hung one there
function kAutoDoors(K){if(!K.dops)return;
  for(const [axis,fixed,s0,w] of K.dops){const cx=axis==='x'?s0+w/2:fixed,cz=axis==='x'?fixed:s0+w/2;
    if(K.kd&&K.kd.some(([x,z])=>Math.abs(x-cx)<.6&&Math.abs(z-cz)<.6))continue;
    const len=Math.min(w-.08,1.6);
    if(axis==='x'){const p=l2w(K.x,K.z,K.rot,s0+.04,fixed);addSwingDoor(p.x,p.z,-K.rot,len);}
    else{const p=l2w(K.x,K.z,K.rot,fixed,s0+.04),c=Math.cos(K.rot),s=Math.sin(K.rot);addSwingDoor(p.x,p.z,Math.atan2(c,s),len);}}}
function kFinish(K,hw,hd,h,kind,loot){
  kAutoDoors(K);
  const baseG=kBake(K,0);const roof=K.r.size?kBake(K,1):null,upper=K.u&&K.u.size?kBake(K,2):null;
  if(K.wins)kWins(K,baseG,upper);
  for(const [lx,lz,r,lvl,h,wi] of K.ob){const p=l2w(K.x,K.z,K.rot,lx,lz),ob={x:p.x,z:p.z,r:r||.55};if(lvl!=null)ob.lvl=lvl;if(h!=null&&lvl==null)ob.h=h;addOb(ob);if(wi!=null&&K.wins){ob.win=K.wins[wi];K.wins[wi].obs.push(ob);}}
  if(K.wins)for(const W of K.wins)if(W.pre)breakWin(W,true);
  const c=Math.abs(Math.cos(K.rot)),s=Math.abs(Math.sin(K.rot));
  const rec={x:K.x,z:K.z,rot:K.rot,hw,hd,h,roof,upper,kind,ex:c*hw+s*hd,ez:s*hw+c*hd};
  if(K.lv){Object.assign(rec,K.lv,{upCrates:[]});LVL_B.push(rec);if(CUR)CUR.lvlb.push(rec);}
  if(roof||upper){BUILDS.push(rec);if(CUR)CUR.builds.push(rec);}
  if(loot!==false){houses.push(rec);if(CUR)CUR.houses.push(rec);}
  return rec;
}
// hide roofs/upper floors when the player is inside or standing where the building blocks the camera (camera sits 16m south, 25m up)
let INDOOR=0;
function updateRoofs(){const px=player.x,pz=player.z;let inAny=false;
  for(const b of BUILDS){const dx=px-b.x,dz=pz-b.z;let hide=false;
    if(dx*dx+dz*dz<1600){const c=Math.cos(b.rot),s=Math.sin(b.rot),lx=dx*c-dz*s,lz=dx*s+dz*c;
      hide=(Math.abs(lx)<b.hw+.5&&Math.abs(lz)<b.hd+.5);
      if(!hide&&TP){const cx=camera.position.x-b.x,cz=camera.position.z-b.z,clx=cx*c-cz*s,clz=cx*s+cz*c;hide=Math.abs(clx)<b.hw+1.2&&Math.abs(clz)<b.hd+1.2;}
      else if(!hide)hide=Math.abs(dx)<b.ex+.7&&dz<b.ez&&dz>-(b.ez+b.h*.64+.5);}
    if(hide&&dx*dx+dz*dz<1600){const c2=Math.cos(b.rot),s2=Math.sin(b.rot);if(Math.abs(dx*c2-dz*s2)<b.hw+.2&&Math.abs(dx*s2+dz*c2)<b.hd+.2)inAny=true;}
    if(FP)hide=false;   // first person keeps roofs and ceilings: you're under them, not looking down through them
    let hideUp=hide;
    if(b.upper&&hide){const inside=Math.abs(dx*Math.cos(b.rot)-dz*Math.sin(b.rot))<b.hw+.5&&Math.abs(dx*Math.sin(b.rot)+dz*Math.cos(b.rot))<b.hd+.5;
      hideUp=inside?!player.lvl:TP?camera.position.y-gH(b.x,b.z)<b.fh+.6:true;}
    if(b.roof&&b.roof.visible===hide)b.roof.visible=!hide;
    if(b.upper&&b.upper.visible===hideUp){b.upper.visible=!hideUp;for(const c of b.upCrates)c.g.visible=!hideUp;}}
  INDOOR=inAny?Math.min(1,INDOOR+.08):Math.max(0,INDOOR-.05);
}
function updateSpin(dt){for(const s of SPIN)s.g.rotation.z+=dt*(.6+W.wind*3.2)*s.k;}
const kSolid=(K,lx,lz,r,lvl,h)=>{const b=K._lb;if(h==null&&b&&!b[6]){const top=b[4]+b[1]/2;if(top>.3&&top<=2.2&&Math.abs(lx-b[3])<=b[0]/2+.05&&Math.abs(lz-b[5])<=b[2]/2+.05)h=top;}K.ob.push([lx,lz,r,lvl,h]);};
const SHOP_NAMES=['GROCERY','PHARMACY','HARDWARE','LIQUOR','PAWN SHOP','DINER','BAIT & AMMO','LAUNDRY','GUNS','DRUGS'];

/* ----- urban ----- */
function bStore(x,z,rot){
  const K=Kit(x,z,rot),hw=5,hd=4,h=3.6,R=RNG;
  const wall=R()<.55?CTM('brick',pick([0xffffff,0xe0d0c0,0xc8b8a8]),2):ITM('plaster',0x8a7f6c,pick([0xf0e0c8,0xd8e0d0,0xe8d0c0]));
  const tr=FLAT(pick([0x2f4a3a,0x5a2a24,0x2a3a52,0x3a3530]));
  kBox(K,0,ITM('concrete',0x6a675e,0xb8b4a8,3),hw*2,.15,hd*2,0,.075,0);
  const wk=()=>R()<.45?'b':'w';
  kWall(K,'x',hd,-hw,hw,h,wall,[[-3,2.8,wk()],[0,1.6,'d'],[3,2.8,wk()]],{sill:.5,top:2.7,trim:tr});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[pick([-3,3]),1.2,'d']]);
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[[0,1.6,wk()]]);kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,R()<.5?[[0,1.6,wk()]]:[]);
  // awning and sign
  kBox(K,0,CTM('awning',pick([0xc23a2e,0x2e6a8a,0x3f7a3a,0xd09a2a]),2),hw*2-.4,.12,1.8,0,2.95,hd+.85,0,-.35);
  kBox(K,0,signMat(pick(SHOP_NAMES),pick(['#e9c46a','#d8d0b8','#c8e0d0','#f0a060']),'#2a1a10'),6,1,.2,0,3.55,hd+.22);
  // shelves and counter
  kBox(K,0,FLAT(0x6a5a48),.6,1.7,4,-2.6,.85,-.6);kSolid(K,-2.6,-2,.5);kSolid(K,-2.6,-.6,.5);kSolid(K,-2.6,.8,.5);
  kBox(K,0,FLAT(0x6a5a48),.6,1.7,4,.4,.85,-.6);kSolid(K,.4,-2,.5);kSolid(K,.4,-.6,.5);kSolid(K,.4,.8,.5);
  kBox(K,0,FLAT(0x4a3a2c),2.8,1,.8,3,.5,-2.2);kSolid(K,2.2,-2.2,.5);kSolid(K,3.6,-2.2,.5);
  kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,3),hw*2,hd*2,h);
  kBox(K,1,ITM('metal',0x7a7d7a,0xc8ccc8,2),1.6,1,1.2,pick([-2.5,2.5]),h+.75,-1);
  const door=l2w(x,z,rot,-.8,hd);addSwingDoor(door.x,door.z,-rot,1.6);
  for(let i=randi(1,3);i>0;i--){const p=l2w(x,z,rot,rand(-4,4),hd+rand(1.5,2.6));addProp(pick(['carton','can','crate','tire']),p.x,p.z);}
  return kFinish(K,hw,hd,h+.6,'store');
}
/* ----- out by the highway: a grocery store and a big-box supercenter, each with its own parking lot ----- */
const GROCERS=['PRAIRIE FOODS','HOMETOWN GROCERY','FRESH ACRES','CORNER MARKET','VALLEY FOODS','HARVEST MARKET'];
const SUPERS=['PRAIRIE VALUE','BIG SKY','HEARTLAND','THRIFTWAY','PLAINS DEPOT'];
const PRODUCE=[0x6a9a3a,0xc8602a,0xd8b030,0xa83030,0x8a5a9a];
// a row of goods along a shelf, both faces
function kShelf(K,x,z,len,h,alongZ){const sh=FLAT(0xd8d4c8);if(alongZ)kBox(K,0,sh,.9,h,len,x,h/2,z);else kBox(K,0,sh,len,h,.9,x,h/2,z);
  for(let y=.45;y<h-.2;y+=.55)for(const s of [-1,1]){const c=FLAT(pick(PRODUCE));if(alongZ)kBox(K,0,c,.1,.32,len-.3,x+s*.46,y,z);else kBox(K,0,c,len-.3,.32,.1,x,y,z+s*.46);}
  for(let t=-len/2+.5;t<=len/2-.4;t+=1.4)kSolid(K,alongZ?x:x+t,alongZ?z+t:z,.55,null,h);}
// a shopping cart: wire basket on a base, no collision (you can shove past them)
function kCart(K,x,z,ry){const m=FLAT(0x9aa0a4);kBox(K,0,m,.62,.42,.9,x,.82,z,ry);kBox(K,0,m,.5,.05,.75,x,.28,z,ry);kBox(K,0,FLAT(0xc23a2e),.6,.06,.06,x+Math.sin(ry)*-.5,1.08,z+Math.cos(ry)*-.5,ry);}
function kLot(K,w,z0,d,stalls){const asph=ITM('asphalt',0x34362f,0xc8c8c4,6),stripe=FLAT(0xe8e2d0,true);
  kBox(K,0,asph,w,.05,d,0,.025,z0+d/2);for(const zr of stalls)for(let sx=-w/2+1.5;sx<=w/2-1.5;sx+=2.8)kBox(K,0,stripe,.12,.02,4.4,sx,.06,zr);}
// world-space box covering a building and its lot, so grass doesn't grow up through the asphalt
function lotMask(x,z,rot,hx,z0,z1){const P=[[-hx,z0],[hx,z0],[-hx,z1],[hx,z1]].map(([a,b])=>l2w(x,z,rot,a,b));return[Math.min(...P.map(p=>p.x)),Math.min(...P.map(p=>p.z)),Math.max(...P.map(p=>p.x)),Math.max(...P.map(p=>p.z))];}
function kLight(K,x,z){const m=FLAT(0x5a5c5a);kBox(K,0,m,.24,7,.24,x,3.5,z);kBox(K,0,m,1.6,.22,.5,x,7,z);kBox(K,0,FLAT(0xfff2c0),1.2,.06,.36,x,6.86,z);kSolid(K,x,z,.3);}
function lotCars(K,x,z,rot,spots,p){p*=.55;for(const [lx,lz] of spots)if(RNG()<p){const q=l2w(x,z,rot,lx+rand(-.15,.15),lz+rand(-.3,.3));addCar(q.x,q.z,rot+(RNG()<.5?0:Math.PI)+rand(-.08,.08),RNG()<.4?'pickup':null);}}
function bGrocery(x,z,rot){
  const K=Kit(x,z,rot),hw=9,hd=7,h=4.6,R=RNG,lot=10,wk=()=>R()<.3?'b':'w';
  const wall=R()<.5?CTM('brick',pick([0xe8d8c8,0xd0b8a8,0xf0e8dc]),2):CTM('metalwall',pick([0xe8e0d0,0xd8dcd0]),2),band=FLAT(pick([0x2f5a3a,0x8a2a24,0x2a4a6a]));
  kBox(K,0,ITM('concrete',0x6a675e,0xb8b4a8,4),hw*2,.15,hd*2,0,.075,0);
  kBox(K,0,ITM('concrete',0x6a675e,0xc0bcb0,3),hw*2+1,.16,1.8,0,.08,hd+.9);
  kLot(K,hw*2+5,hd+1.8,lot,[hd+4.2,hd+9.4]);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-5.5,4.2,wk()],[0,2.8,'g'],[5.5,4.2,wk()]],{sill:.45,top:3,trim:band,gTop:3});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[6,1.2,'d']]);
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[]);kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[[2.5,1.2,'d']]);
  // sign band, raised sign panel, a bench and the cart corral out front
  kBox(K,0,band,hw*2+.2,.8,.28,0,h-.45,hd+.16);kBox(K,0,wall,10,1.8,.3,0,h+.7,hd-.1);
  kBox(K,0,signMat(pick(GROCERS),pick(['#f0e8d0','#e9c46a','#d8e8d0']),'#2a1a10'),9,1.3,.2,0,h+.7,hd+.12);
  kBox(K,0,FLAT(0x5a4430),1.8,.45,.5,-4,.4,hd+1.2);kSolid(K,-4,hd+1.2,.6,null,.45);
  {const m=FLAT(0x9aa0a4);for(const s of [-1,1])kBox(K,0,m,.08,.9,3.4,6+s*.6,.45,hd+6);kBox(K,0,m,1.3,.08,.08,6,.9,hd+4.3);kSolid(K,6,hd+5,.6);kSolid(K,6,hd+6.6,.6);
    for(let i=0;i<randi(1,3);i++)kCart(K,6,hd+5+i*.7,0);kCart(K,rand(-8,8),hd+rand(3,9),rand(0,6.28));}
  kLight(K,-hw-1.5,hd+lot/2+1.8);
  // inside: produce bins by the door, three aisles, coolers along the back, two checkouts
  for(const px of [-6.6,-3.9]){kBox(K,0,FLAT(0x6a5038),2.2,.8,1.3,px,.4,4.4);kBox(K,0,FLAT(pick(PRODUCE)),2,.22,1.1,px,.92,4.4,0,.12);kSolid(K,px-.55,4.4,.6,null,.95);kSolid(K,px+.55,4.4,.6,null,.95);}
  for(const ax of [-5.5,-2,1.5])kShelf(K,ax,-1.8,6.6,1.8,true);
  kBox(K,0,FLAT(0xe8ecee),hw*2-2.4,2.3,1,0,1.15,-hd+.75);kBox(K,0,FLAT(0x9fc8d8),hw*2-3,1.6,.05,0,1.3,-hd+1.27);for(let t=-7;t<=7;t+=2)kSolid(K,t,-hd+.8,.6);
  for(const cx of [4.6,7.2]){kBox(K,0,FLAT(0x4a4a48),.8,1,2.4,cx,.5,3.2);kBox(K,0,FLAT(0x222224),.4,.35,.35,cx,1.2,2.6);kSolid(K,cx,2.6,.55,null,1);kSolid(K,cx,3.8,.55,null,1);}
  kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,3),hw*2,hd*2,h);
  kBox(K,1,ITM('metal',0x7a7d7a,0xc8ccc8,2),2,1.2,1.6,-3,h+.85,-2);kBox(K,1,ITM('metal',0x7a7d7a,0xc8ccc8,2),1.4,.9,1.2,4,h+.7,-3.5);
  const d=l2w(x,z,rot,5.4,-hd);addSwingDoor(d.x,d.z,-rot,1.2);
  lotCars(K,x,z,rot,[-7.8,-5,-2.2,2.2,5,7.8].flatMap(u=>[[u,hd+4.2],[u,hd+9.4]]),.3);
  const rec=kFinish(K,hw,hd,h+1.6,'grocery');rec.extra=2;rec.mask=lotMask(x,z,rot,hw+3,-hd-.5,hd+lot+2);return rec;
}
function bSupercenter(x,z,rot){
  const K=Kit(x,z,rot),hw=20,hd=12,h=6.5,R=RNG,lot=15,wk=()=>R()<.35?'b':'w',name=pick(SUPERS);
  const wall=CTM('metalwall',pick([0xe8dcc8,0xd8d0c0,0xc8ccd0]),3),acc=FLAT(pick([0x2a4a6a,0x3a5a3a,0x7a2a24])),post=FLAT(0xd8d4c8);
  kBox(K,0,ITM('concrete',0x6a675e,0xb8b4a8,6),hw*2,.15,hd*2,0,.075,0);
  kBox(K,0,ITM('concrete',0x6a675e,0xc0bcb0,4),hw*2+1,.16,3,0,.08,hd+1.5);
  kLot(K,hw*2+6,hd+3,lot,[hd+5.4,hd+12.6]);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-12,3.4,'g'],[-6.5,3.4,wk()],[6.5,3.4,wk()],[12,3.4,'g']],{sill:.5,top:2.9,trim:acc,gTop:3.3});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[-15,1.2,'d'],[8,3.8,'g'],[13.5,3.8,'g']],{gTop:3.5});
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[[5,1.2,'d']]);kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[]);
  // the facade: a raised centre panel with the store name, a colour band, and canopies over both entrances
  kBox(K,0,wall,18,2.6,.5,0,h+1.3,hd-.1);kBox(K,0,acc,hw*2+.2,.8,.3,0,h-.4,hd+.14);
  kBox(K,0,signMat(name,'#f4efe2','#1d2a3a'),14,1.8,.2,0,h+1.35,hd+.22);
  kBox(K,0,signMat('SUPERCENTER','#1d2a3a','#f4efe2'),8,.75,.2,0,h-.4,hd+.33);
  for(const ex of [-12,12]){kBox(K,0,acc,5.4,.4,3,ex,3.7,hd+1.5);for(const s of [-1,1]){kBox(K,0,post,.36,3.5,.36,ex+s*2.4,1.75,hd+2.7);kSolid(K,ex+s*2.4,hd+2.7,.32);}
    kBox(K,0,signMat(ex<0?'ENTRANCE':'EXIT','#f4efe2','#1d2a3a'),2.4,.45,.12,ex,3.25,hd+.25);}
  // back: a loading dock with one roll door half up, one down
  const roll=FLAT(0x8a8f8c);kBox(K,0,roll,3.8,1.6,.12,8,2.8,-hd-.05);kBox(K,0,roll,3.8,3.5,.12,13.5,1.75,-hd-.05);for(let i=0;i<5;i++)kSolid(K,11.9+i*.8,-hd,.5);
  kBox(K,0,ITM('concrete',0x6a675e,0xa8a498,3),12,1.1,3,10.75,.55,-hd-1.6);for(let t=5.5;t<=16;t+=1.5)kSolid(K,t,-hd-1.6,.75,null,1.1);
  // inside: nine long aisles, a checkout row by the doors, pharmacy counter and coolers along the back
  for(let ax=-16.2;ax<=15;ax+=3.6)if(Math.abs(ax-.0)>.5)kShelf(K,ax,-2.8,12,2.2,true);
  for(let cx=-9;cx<=9;cx+=3){kBox(K,0,FLAT(0x4a4a48),.8,1,2.4,cx,.5,7);kBox(K,0,FLAT(0x222224),.4,.35,.35,cx,1.2,6.4);kSolid(K,cx,6.4,.55,null,1);kSolid(K,cx,7.6,.55,null,1);}
  kBox(K,0,FLAT(0x6a5a48),7,1.1,.9,-14.5,.55,-9.6);for(let t=-17.5;t<=-11.5;t+=1.5)kSolid(K,t,-9.6,.55,null,1.1);
  kBox(K,0,signMat('PHARMACY','#f4efe2','#2a6a4a'),4,.8,.12,-14.5,3.6,-hd+.25);
  kBox(K,0,FLAT(0xe8ecee),12,2.4,1,8,1.2,-hd+.75);kBox(K,0,FLAT(0x9fc8d8),11.4,1.7,.05,8,1.35,-hd+1.27);for(let t=2.5;t<=13.5;t+=2)kSolid(K,t,-hd+.8,.6);
  for(let i=0;i<4;i++)kCart(K,rand(-14,14),rand(3.5,9.5),rand(0,6.28));
  kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,4),hw*2,hd*2,h,.9);
  for(const [rx,rz] of [[-12,-5],[-4,3],[6,-6],[14,2]])kBox(K,1,ITM('metal',0x7a7d7a,0xc8ccc8,2),2.6,1.4,2,rx,h+.95,rz);
  // the lot: light poles, cart corrals, loose carts and a scatter of abandoned cars
  for(const lx of [-14,0,14])kLight(K,lx,hd+9);
  {const m=FLAT(0x9aa0a4);for(const cxr of [-7,7]){for(const s of [-1,1])kBox(K,0,m,.08,.9,3.6,cxr+s*.6,.45,hd+9);kBox(K,0,m,1.3,.08,.08,cxr,.9,hd+7.2);kSolid(K,cxr,hd+8.2,.6);kSolid(K,cxr,hd+9.8,.6);
    for(let i=0;i<randi(1,4);i++)kCart(K,cxr,hd+7.8+i*.7,0);}}
  for(let i=0;i<randi(2,5);i++)kCart(K,rand(-18,18),hd+rand(4,17),rand(0,6.28));
  lotCars(K,x,z,rot,[-18,-15.2,-12.4,-9.6,-4,-1.2,1.6,4.4,9.6,12.4,15.2,18].flatMap(u=>[[u,hd+5.4],[u,hd+12.6]]),.28);
  const rec=kFinish(K,hw,hd,h+2.6,'supercenter');rec.extra=5;rec.mask=lotMask(x,z,rot,hw+3.5,-hd-3.5,hd+lot+3.5);return rec;
}
/* ----- a fieldstone well with a little shingled roof, crank, rope and bucket ----- */
let WELL_MAT=null;
function wellMesh(){
  if(!WELL_MAT){WELL_MAT={stone:new THREE.MeshToonMaterial({map:btex('brick'),color:0xb8b0a0,gradientMap:TOON_GRAD,side:THREE.DoubleSide}),water:new THREE.MeshBasicMaterial({color:0x14252c}),
    wood:TM('wood',1,1,0x5e4632,0xb89878),roof:CTM('shingle',0x8a6a5a,1),rope:M(0xc8b088),bucket:M(0x6a5038),iron:M(0x2a2826,{metalness:.4})};}
  const W=WELL_MAT,g=new THREE.Group();
  g.add(mki(new THREE.CylinderGeometry(1,1.06,.9,16,1,true),W.stone,0,.45,0,.05));
  g.add(mki(new THREE.TorusGeometry(1.02,.09,6,16),W.stone,0,.9,0,.03).rotateX(Math.PI/2));
  g.add(mk(new THREE.CircleGeometry(.96,16),W.water,0,.35,0,false).rotateX(-Math.PI/2));
  for(const s of [-1,1])g.add(mki(BOX(.14,2.2,.14),W.wood,s*1.02,1.1,0,.04));
  const ax=mki(CYL(.06,.06,2.3,8),W.wood,0,1.62,0,.03);ax.rotation.z=Math.PI/2;g.add(ax);
  g.add(mki(BOX(.06,.36,.06),W.iron,1.22,1.48,0,.02));g.add(mki(BOX(.24,.06,.06),W.iron,1.34,1.3,0,.02));
  g.add(mk(CYL(.016,.016,.5,5),W.rope,0,1.35,0,false));g.add(mki(CYL(.17,.13,.26,10),W.bucket,0,.98,0,.03));
  for(const s of [-1,1]){const r=mki(BOX(2.6,.08,1.05),W.roof,0,2.22,s*.4,.04);r.rotation.x=s*.62;g.add(r);}
  return g;
}
function addWell(x,z,rot){const g=wellMesh();g.position.set(x,0,z);g.rotation.y=rot||0;track(g);addOb({x,z,r:1.08,h:.95,well:true});}
function nearWell(){let w=null;nearObs(player.x,player.z,2.4,o=>{if(o.well&&Math.hypot(o.x-player.x,o.z-player.z)<2.4)w=o;});return w;}
// a cool drink: some health and your wind back, then a short wait; also fills the garden's watering can
function drinkWell(x,z){if((S.time||0)<(S.wellT||0))return false;S.wellT=(S.time||0)+45;player.hp=Math.min(player.maxHp,player.hp+15);player.st=100;
  Sound.play('clink',.5,x,z);for(let i=0;i<3;i++)splash(x+rand(-.4,.4),z+rand(-.4,.4),.36);floatText(x,1.7,z,'+15 HP · fresh water');return true;}
function useWell(o){const had=GARDEN.can,drank=drinkWell(o.x,o.z);GARDEN.can=CAN_MAX;
  if(!drank)toast(had<CAN_MAX?`Watering can filled. You've drunk your fill for now (${Math.ceil(S.wellT-S.time)} s).`:`You've drunk your fill for now (${Math.ceil(S.wellT-S.time)} s).`);
  else if(had<CAN_MAX)toast('Drank deep and filled the watering can','good');}
