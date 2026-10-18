/* ================= HORDES (Days Gone-style swarms: instanced bodies, flocking, sight + noise) ================= */
const HCAP=GFX==='high'?520:300;
const hordes=[],agents=[];let hordeSeq=0,hordeGroanT=0;
const compass=a=>['S','SE','E','NE','N','NW','W','SW'][((Math.round(a/(Math.PI/4))%8)+8)%8];
function mergeGeos(list){const out=new THREE.BufferGeometry();
  for(const name of ['position','normal','uv','color','aPart']){const size=list[0].attributes[name].itemSize;const tot=list.reduce((a,g)=>a+g.attributes[name].array.length,0);const m=new Float32Array(tot);let o=0;
    for(const g of list){m.set(g.attributes[name].array,o);o+=g.attributes[name].array.length;}out.setAttribute(name,new THREE.BufferAttribute(m,size));}
  return out;}
function hordeGeometry(){
  const parts=[];
  const add=(w,h,d,x,y,z,col,part,rot,reg)=>{const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();
    const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const b=HCELL[typeof reg==='string'?reg:reg[Math.floor(i/6)]];
      uv.setXY(i,b[0]+uv.getX(i)*(b[2]-b[0]),1-b[3]+uv.getY(i)*(b[3]-b[1]));}
    if(rot){g.translate(0,-h/2,0);g.rotateX(rot);}g.translate(x,y,z);
    const n=g.attributes.position.count,c=new THREE.Color(col),ca=new Float32Array(n*3),pa=new Float32Array(n).fill(part);
    for(let i=0;i<n;i++){ca[i*3]=c.r;ca[i*3+1]=c.g;ca[i*3+2]=c.b;}
    g.setAttribute('color',new THREE.BufferAttribute(ca,3));g.setAttribute('aPart',new THREE.BufferAttribute(pa,1));parts.push(g);};
  // BoxGeometry face order: +x -x +y -y +z(front) -z(back)
  add(.27,.8,.29,-.17,.4,0,0xffffff,1,0,'LG');add(.27,.8,.29,.17,.4,0,0xffffff,2,0,'LG');
  add(.74,.85,.45,0,1.22,0,0xffffff,0,0,['TS','TS','TS','TS','TF','TB']);
  add(.45,.45,.45,0,1.88,.05,0xffffff,0,0,['HS','HS','HS','HS','HF','HS']);
  add(.08,.06,.04,-.11,1.92,.29,0xffd23f,0,0,'EY');add(.08,.06,.04,.11,1.92,.29,0xffd23f,0,0,'EY');
  add(.21,.78,.21,-.49,1.58,0,0xffffff,3,-1.4,'AR');add(.21,.78,.21,.49,1.58,0,0xffffff,4,-1.4,'AR');
  return mergeGeos(parts);
}
const HATLAS=paintHordeAtlas();
function hordeMat(outline){
  const m=outline?new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide}):new THREE.MeshToonMaterial({vertexColors:true,gradientMap:TOON_GRAD,map:HATLAS});
  m.onBeforeCompile=sh=>{sh.vertexShader='attribute float aPart;attribute vec3 aAnim;attribute vec3 aVar;varying vec3 vGP;varying vec3 vVar;\n'+sh.vertexShader.replace('#include <color_vertex>',`#ifdef USE_COLOR
    vColor=color;
    #ifdef USE_INSTANCING_COLOR
    vColor*=mix(vec3(1.),instanceColor*2.2,.12);
    #endif
    #endif`).replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\n vUv=(vUv+vec2(mod(aVar.x,4.),1.-floor(aVar.x/4.)))*vec2(.25,.5);\n#endif').replace('#include <begin_vertex>',`#include <begin_vertex>
    float ph=aAnim.x,amp=aAnim.y,fall=aAnim.z;vGP=position/2.1;vVar=aVar;
    if(aPart>.5&&aPart<2.5){float s=(aPart<1.5?1.:-1.)*sin(ph)*.65*amp;vec3 p=transformed-vec3(0.,.8,0.);transformed=vec3(p.x,p.y*cos(s)-p.z*sin(s),p.y*sin(s)+p.z*cos(s))+vec3(0.,.8,0.);}
    else if(aPart>2.5){float s=(aPart<3.5?1.:-1.)*sin(ph*.5)*.2;vec3 p=transformed-vec3(0.,1.58,0.);transformed=vec3(p.x,p.y*cos(s)-p.z*sin(s),p.y*sin(s)+p.z*cos(s))+vec3(0.,1.58,0.);}
    transformed.y+=abs(cos(ph))*.07*amp;
    if(fall>0.){float a=-1.5*fall;vec3 p=transformed;transformed=vec3(p.x,p.y*cos(a)-p.z*sin(a),p.y*sin(a)+p.z*cos(a));transformed.y+=.15*fall;}
    ${outline?'transformed+=normal*.035;':''}`);
    if(!outline)sh.fragmentShader='varying vec3 vGP;varying vec3 vVar;\n'+GRIME_GLSL+sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=grime(diffuseColor.rgb,vGP,vVar.z,vVar.y,0.);');};
  m.customProgramCacheKey=()=>'horde'+(outline?1:0);
  return m;
}
const hGeo=hordeGeometry(),hAnim=new THREE.InstancedBufferAttribute(new Float32Array(HCAP*3),3);
hAnim.setUsage(THREE.DynamicDrawUsage);hGeo.setAttribute('aAnim',hAnim);
const hVar=new THREE.InstancedBufferAttribute(new Float32Array(HCAP*3),3);hVar.setUsage(THREE.DynamicDrawUsage);hGeo.setAttribute('aVar',hVar);
const hMesh=new THREE.InstancedMesh(hGeo,hordeMat(false),HCAP);hMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
hMesh.setColorAt(0,new THREE.Color(1,1,1));hMesh.castShadow=true;hMesh.receiveShadow=true;hMesh.frustumCulled=false;hMesh.count=0;
const hInk=new THREE.InstancedMesh(hGeo,hordeMat(true),HCAP);hInk.instanceMatrix=hMesh.instanceMatrix;hInk.frustumCulled=false;hInk.count=0;
hInk.visible=GFX==='high';inkHulls.add(hInk);scene.add(hMesh,hInk);
// spatial hash of live agents, rebuilt each frame
const AH=new Map(),AHC=2,ahk=(ix,iz)=>(ix+50000)*100000+(iz+50000);
function rebuildAH(){if(AH.size>5000)AH.clear();for(const l of AH.values())l.length=0;
  for(const a of agents){if(a.dying)continue;const k=ahk(Math.floor(a.x/AHC),Math.floor(a.z/AHC));let l=AH.get(k);if(!l)AH.set(k,l=[]);l.push(a);}}
function nearAgents(x,z,r,fn){const x0=Math.floor((x-r)/AHC),x1=Math.floor((x+r)/AHC),z0=Math.floor((z-r)/AHC),z1=Math.floor((z+r)/AHC);
  for(let i=x0;i<=x1;i++)for(let j=z0;j<=z1;j++){const l=AH.get(ahk(i,j));if(l)for(const a of l)if(!a.dying)fn(a);}}
function addAgents(h,k,cx,cz){
  k=Math.min(k,HCAP-agents.length);
  for(let i=0;i<k;i++){const a=rand(0,6.28),r=Math.sqrt(Math.random())*h.radius,ox=Math.cos(a)*r,oz=Math.sin(a)*r;
    const dry=depthAt(cx+ox,cz+oz)<-.2;
    agents.push({h,x:dry?cx+ox+rand(-.3,.3):cx+rand(-.5,.5),z:dry?cz+oz+rand(-.3,.3):cz+rand(-.5,.5),vx:0,vz:0,ox,oz,hp:30+S.wave*4,ph:rand(0,6.28),amp:0,yaw:rand(0,6.28),s:rand(.86,1.14),
      spd:rand(5.6,7.4),atk:rand(0,1),wallT:rand(0,1.3),dying:false,dieT:0,outfit:Math.floor(Math.random()*OUTFITS.length),blood:rand(.1,.35),seed:rand(0,40),col:new THREE.Color().setHSL(pick([.02,.08,.11,.3,.55,.6,.95,Math.random()]),rand(.12,.45),rand(.2,.42))});}
  h.alive+=k;h.total+=k;h.radius=Math.sqrt(h.alive)*.9+2;
}
function spawnHorde(size){
  let cx=150,cz=0;
  for(let i=0;i<30;i++){const a=rand(0,6.28),r=rand(140,220);cx=Math.cos(a)*r;cz=Math.sin(a)*r;if(Math.hypot(cx-player.x,cz-player.z)>100&&depthAt(cx,cz)<-.6)break;}
  const h={id:++hordeSeq,cx,cz,tx:cx,tz:cz,state:'roam',alertT:0,wpT:rand(8,20),total:0,alive:0,radius:2,siege:false,known:false,sx:0,sz:0,n:0};
  hordes.push(h);addAgents(h,size,cx,cz);return h;
}
function resetHordes(){hordes.length=0;agents.length=0;hMesh.count=hInk.count=0;AH.clear();}
function alertHorde(h,why){
  if(h.alive<=0)return;const was=h.state==='hunt';h.state='hunt';h.alertT=why==='noise'?16:12;h.known=true;
  if(!was&&S.running){Sound.play('roar',.8);rumble(.5,.4,400);banner('HORDE',`${h.alive} infected ${why==='noise'?'heard you':'spotted you'}. Run, or find a choke point.`,'night');}
}
function makeNoise(x,z,r){scareAnimals(x,z,r*.9);for(const h of hordes)if(h.alive>0&&Math.hypot(h.cx-x,h.cz-z)<r+h.radius)alertHorde(h,'noise');
  for(const zb of zombies)if(!zb.aware&&!zb.dying&&Math.hypot(zb.x-x,zb.z-z)<r*.8)zAlert(zb);}
function hitAgent(a,dmg,kx,kz,quiet){
  if(a.dying)return;a.hp-=dmg;dmgNum(a,dmg,a.hp<=0?'kill':SNEAKF?'sneak':CRITF?'crit':'',2.3*a.s);a.blood=Math.min(1,a.blood+.2);a.vx+=(kx||0)*.6;a.vz+=(kz||0)*.6;burst(a.x,1.2,a.z,2,'blood',4);Sound.play('hit',.5,a.x,a.z);
  if(a.h.state!=='hunt'&&!quiet)alertHorde(a.h,'noise');if(a.hp<=0)killAgent(a);
}
function killAgent(a){
  a.dying=true;a.dieT=0;S.kills++;gainXP(4);jobProg('kill',1);const h=a.h;h.alive--;h.radius=Math.sqrt(Math.max(1,h.alive))*.9+2;
  decal(a.x,a.z,rand(1,1.6),0x4a0a08,.8);burst(a.x,1,a.z,6,'gore',4);
  if(Math.random()<.12)spawnPickup('scrap',a.x,a.z,randi(1,3));
  if(h.alive<=0)hordeDestroyed(h);
}
function hordeDestroyed(h){
  const sc=40+Math.round(h.total*.6),pa=2+Math.floor(h.total/25);player.scrap+=sc;player.parts+=pa;
  banner('HORDE DESTROYED',`${h.total} infected put down. +${sc} scrap, +${pa} parts.`,'dawn');
  if(Math.random()<.35){const sp=randomSpecial('piper');if(sp){spawnWDrop(mkW(null,0,sp),player.x+rand(-2,2),player.z+rand(-2,2));toast('Something special dropped near you','epic');}}Sound.play('dawn');rumble(.6,.6,500);
  const i=hordes.indexOf(h);if(i>=0)hordes.splice(i,1);
}
const _hm=new THREE.Matrix4(),_hq=new THREE.Quaternion(),_hpos=new V3(),_hs=new V3(),_up=new V3(0,1,0);
function updateHordes(dt){
  if(!agents.length&&!hordes.length)return;
  rebuildAH();
  const night=S.phase==='night',px=player.x,pz=player.z;let chorus=1e9;
  for(const h of hordes){
    if(h.n){h.cx=h.sx/h.n;h.cz=h.sz/h.n;}h.sx=h.sz=0;h.n=0;
    const lu=lureFor(h.cx,h.cz,120);h.lured=!!lu;if(lu){h.tx=lu.x;h.tz=lu.z;continue;}
    const dP=Math.hypot(px-h.cx,pz-h.cz);
    if(h.state!=='hunt'&&player.alive&&S.running&&(dP<(night?34:28)*(1-.4*W.fog)*(player.crouch?.5:1)*(1-.12*PERK('ghost'))+h.radius||(player.sprinting&&dP<10+h.radius)))alertHorde(h,'spotted');
    if(h.state==='hunt'){h.alertT-=dt;if(player.alive&&dP<45)h.alertT=Math.max(h.alertT,3);chorus=Math.min(chorus,dP);
      if(h.alertT<=0||!player.alive){h.state=h.siege?'siege':'roam';h.wpT=0;if(player.alive)toast('The horde lost your trail','good');}
      else{h.tx=px;h.tz=pz;}}
    else if(h.state==='siege'){h.tx=0;h.tz=0;chorus=Math.min(chorus,dP);if(!night){h.state='roam';h.siege=false;h.wpT=0;}}
    else{h.wpT-=dt;if(h.wpT<=0||Math.hypot(h.tx-h.cx,h.tz-h.cz)<5){
      for(let i=0;i<12;i++){const a=rand(0,6.28),r=rand(25,60),x=h.cx+Math.cos(a)*r,z=h.cz+Math.sin(a)*r;if(Math.hypot(x,z)<70||depthAt(x,z)>-.3)continue;h.tx=x;h.tz=z;break;}
      h.wpT=rand(25,50);}}
  }
  for(const a of agents){
    if(a.dying){a.dieT+=dt;continue;}
    if(a.burn>0){burnTick(a,'a',dt);if(a.dying)continue;a.vx+=rand(-1,1)*dt*40;a.vz+=rand(-1,1)*dt*40;}
    const h=a.h;h.sx+=a.x;h.sz+=a.z;h.n++;
    const hunt=h.state==='hunt'||h.lured,siege=h.state==='siege',spread=hunt?.5:siege?.7:1;
    let dx=h.tx+a.ox*spread-a.x,dz=h.tz+a.oz*spread-a.z;const dist=Math.hypot(dx,dz)||1;dx/=dist;dz/=dist;
    let sp=hunt?a.spd*(night?1.15:1)*(1-.12*W.ash):siege?2.8:(dist>1.5?1.15:0);
    const pd=Math.hypot(px-a.x,pz-a.z),near=pd<100;
    let sx=0,sz=0;
    if(near)nearAgents(a.x,a.z,.9,b=>{if(b===a)return;const ex=a.x-b.x,ez=a.z-b.z,d2=ex*ex+ez*ez;if(d2<.64&&d2>1e-6){const d=Math.sqrt(d2);sx+=ex/d*(.8-d);sz+=ez/d*(.8-d);}});
    const k=Math.min(1,dt*3.5);a.vx+=(dx*sp-a.vx)*k+sx*dt*28;a.vz+=(dz*sp-a.vz)*k+sz*dt*28;
    a.x+=a.vx*dt;a.z+=a.vz*dt;
    if(near&&depthAt(a.x,a.z)>1.15){a.x-=a.vx*dt;a.z-=a.vz*dt;a.vx*=.2;a.vz*=.2;}
    if(near){
      collideCircles(a,.38);
      if(Math.abs(a.x)<BR+2&&Math.abs(a.z)<BR+2){let blk=null;
        for(const sg of ALLSEG){if(!solidSeg(sg)||Math.abs(a.x-sg.cx)>4||Math.abs(a.z-sg.cz)>4)continue;if(collideSeg(a,.38,sg)&&(!blk||sg.kind==='win'||sg.kind==='door'))blk=sg;}
        if(blk){a.wallT-=dt;if(a.wallT<=0){a.wallT=1.3;hitSeg(blk,4+S.wave*.4);}}}
      a.atk-=dt;
      if(player.alive&&!player.lvl&&(PERCH?player.jy<1.7&&pd<PERCH.r+1:!playerHigh()&&pd<.95)&&a.atk<=0&&homeLOS(a.x,a.z,px,pz)){a.atk=1.3;hurtPlayer(4+S.wave*.35);knockPlayer((px-a.x)/(pd||1),(pz-a.z)/(pd||1),1.6);}
      if(!player.lvl&&pd<.85&&pd>1e-4){a.x=px-(px-a.x)/pd*.85;a.z=pz-(pz-a.z)/pd*.85;}
    }
    const v=Math.hypot(a.vx,a.vz);if(v>.3)a.yaw=Math.atan2(a.vx,a.vz);
    a.ph+=dt*(v*2.2+.6);a.amp=Math.min(1,v/2);
  }
  let j=0;
  for(const a of agents){
    if(a.dying&&a.dieT>3.2)continue;
    _hpos.set(a.x,a.dying?-Math.max(0,a.dieT-1.8)*.5:0,a.z);_hq.setFromAxisAngle(_up,a.yaw);_hs.setScalar(a.s);_hm.compose(_hpos,_hq,_hs);
    hMesh.setMatrixAt(j,_hm);hMesh.setColorAt(j,a.col);hAnim.setXYZ(j,a.ph,a.dying?0:a.amp,a.dying?Math.min(1,a.dieT*2.2):0);hVar.setXYZ(j,a.outfit,a.blood,a.seed);
    agents[j++]=a;
  }
  agents.length=j;hMesh.count=hInk.count=j;
  hMesh.instanceMatrix.needsUpdate=true;hAnim.needsUpdate=true;hVar.needsUpdate=true;if(hMesh.instanceColor)hMesh.instanceColor.needsUpdate=true;
  if(chorus<60){hordeGroanT-=dt;if(hordeGroanT<=0){hordeGroanT=rand(.25,.6);Sound.play('groan',clamp(1-chorus/60,.25,1));}}
}

