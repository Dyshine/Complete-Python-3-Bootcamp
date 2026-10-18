/* ================= WEATHER ================= */
const WEATHER={
  clear:{name:'Clear',rain:0,ash:0,fog:0,cloud:0,wind:.22,note:''},
  overcast:{name:'Overcast',rain:0,ash:0,fog:.12,cloud:.65,wind:.45,note:''},
  rain:{name:'Rain',rain:.55,ash:0,fog:.28,cloud:.8,wind:.55,note:'slick ground: sprinting tires you faster'},
  storm:{name:'Thunderstorm',rain:1,ash:0,fog:.38,cloud:1,wind:1.25,note:'lightning strikes the field'},
  fog:{name:'Dense fog',rain:0,ash:0,fog:1,cloud:.5,wind:.06,note:'turret range −30%, short sightlines'},
  ash:{name:'Ashfall',rain:0,ash:1,fog:.35,cloud:.45,wind:.5,note:'infected move 15% slower'},
};
const W={type:'clear',rain:0,ash:0,fog:0,cloud:0,wind:.22,wdir:rand(0,6.28),wet:0,boltT:6,flash:0,boltLife:0,time:0};
function setWeather(t,announce){
  W.type=t;if(t==='storm')W.boltT=rand(3,6);
  if(announce){const w=WEATHER[t];toast(`Weather: ${w.name}${w.note?'. '+w.note[0].toUpperCase()+w.note.slice(1)+'.':''}`,t==='storm'||t==='fog'?'bad':'rare');}
}
function rollWeather(night){if(S.running)return rollSeasonWeather(night);
  const pool=night?[['overcast',2],['rain',2.4],['storm',S.wave>=2?2.2:0],['fog',S.wave>=2?2:.6],['ash',1.2],['clear',.7]]
                  :[['clear',3],['overcast',2.5],['rain',1.6],['fog',.9],['ash',.8]];
  let sum=0;for(const p of pool)sum+=p[1];let r=Math.random()*sum;for(const p of pool){r-=p[1];if(r<=0)return p[0];}return'clear';
}
// rain streaks
const RAIN_N=2400,rainPos=new Float32Array(RAIN_N*6),rainGeo=new THREE.BufferGeometry();
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainLines=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xaabdcc,transparent:true,opacity:.42,depthWrite:false,userData:{terrainVertex:true}}));
rainLines.frustumCulled=false;rainLines.visible=false;scene.add(rainLines);
const drops=[];for(let i=0;i<RAIN_N;i++)drops.push({x:rand(-32,32),y:rand(0,26),z:rand(-28,24),s:rand(.8,1.2)});
// ash flakes
const ASH_N=1600,ashPos=new Float32Array(ASH_N*3),ashGeo=new THREE.BufferGeometry();
ashGeo.setAttribute('position',new THREE.BufferAttribute(ashPos,3));
const ashPts=new THREE.Points(ashGeo,new THREE.PointsMaterial({color:0xc4bcae,size:.17,transparent:true,opacity:.85,depthWrite:false,userData:{terrainVertex:true}}));
ashPts.frustumCulled=false;ashPts.visible=false;scene.add(ashPts);
const flakes=[];for(let i=0;i<ASH_N;i++)flakes.push({x:rand(-32,32),y:rand(0,22),z:rand(-28,24),p:rand(0,6.28),s:rand(.6,1.3)});
// splashes
const splashes=[];const ringGeo=new THREE.RingGeometry(.05,.11,10);
for(let i=0;i<50;i++){const m=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xcfdde8,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.visible=false;scene.add(m);splashes.push({m,life:0});}
let sIdx=0;
function splash(x,z,y){const s=splashes[sIdx=(sIdx+1)%splashes.length];s.m.position.set(x,y==null?.07:y,z);s.life=.3;s.m.visible=true;}
// lightning bolt
const boltPos=new Float32Array(14*3),boltGeo=new THREE.BufferGeometry();boltGeo.setAttribute('position',new THREE.BufferAttribute(boltPos,3));
const bolt=new THREE.Line(boltGeo,new THREE.LineBasicMaterial({color:0xeef4ff,transparent:true}));bolt.frustumCulled=false;bolt.visible=false;scene.add(bolt);
const bolt2=new THREE.Line(boltGeo,new THREE.LineBasicMaterial({color:0x9fc0ff,transparent:true,opacity:.6}));bolt2.frustumCulled=false;bolt2.visible=false;bolt2.position.x=.12;scene.add(bolt2);
function lightning(cx,cz,strike){
  W.flash=1;
  if(!strike){setTimeout(()=>Sound.play('thunder',.55),rand(900,2200));return;}
  let tx,tz;const lt=S.running&&lightningTarget(cx,cz);
  const near=lt?[]:zombies.filter(z=>!z.dying&&Math.hypot(z.x-player.x,z.z-player.z)>8&&Math.hypot(z.x-cx,z.z-cz)<38);
  if(lt){tx=lt.x;tz=lt.z;}
  else if(near.length&&Math.random()<.55){const z=pick(near);tx=z.x;tz=z.z;}
  else{for(let i=0;i<20;i++){const a=rand(0,6.28),r=rand(10,34);tx=cx+Math.cos(a)*r;tz=cz+Math.sin(a)*r;if(Math.hypot(tx-player.x,tz-player.z)>8&&!inYard(tx,tz))break;}}
  let x=tx+rand(-6,6),z=tz+rand(-6,6);
  for(let i=0;i<14;i++){const t=i/13;const y=46*(1-t);x=lerp(x,tx,.35)+(i<13?rand(-1.3,1.3):0);z=lerp(z,tz,.35)+(i<13?rand(-1.3,1.3):0);if(i===13){x=tx;z=tz;}boltPos[i*3]=x;boltPos[i*3+1]=y;boltPos[i*3+2]=z;}
  boltGeo.attributes.position.needsUpdate=true;bolt.visible=bolt2.visible=true;W.boltLife=.22;
  for(const zb of zombies){if(zb.dying)continue;const d=Math.hypot(zb.x-tx,zb.z-tz);if(d<3.4){const ux=(zb.x-tx)/(d||1),uz=(zb.z-tz)/(d||1);damageZombie(zb,zb.type==='boss'?220:140,ux*8,uz*8,false,8);}}
  for(const p of props){const d=Math.hypot(p.x-tx,p.z-tz);if(d<4)impulseProp(p,(p.x-tx)/(d||1)*5,(p.z-tz)/(d||1)*5,8);}
  for(const b of barrels){if(b.alive&&Math.hypot(b.x-tx,b.z-tz)<3)b.fuse=.1;}
  if(player.alive&&Math.hypot(player.x-tx,player.z-tz)<3){hurtPlayer(30);}
  decal(tx,tz,3.2,0x0d0c0b,.8);burst(tx,.5,tz,22,'spark',10);burst(tx,.5,tz,8,'smoke',3);
  boomLight.position.set(tx,3+gH(tx,tz),tz);boomLight.intensity=6;
  const d=Math.hypot(player.x-tx,player.z-tz);Sound.play('zap',clamp(1-d/50,.25,1));
  setTimeout(()=>{Sound.play('thunder',clamp(1-d/80,.4,1));S.thunderT=3;},clamp(d*18,120,900));
  S.shake=Math.max(S.shake,clamp(.6-d/60,.1,.5));rumble(clamp(1-d/40,.2,1),.5,400);
}
function updateWeather(dt,cx,cz){
  W.time+=dt;const T=WEATHER[W.type];
  for(const k of ['rain','ash','fog','cloud','wind','snow'])W[k]=(W[k]||0)+((T[k]||0)-(W[k]||0))*Math.min(1,dt*.18);
  W.wdir+=dt*.025;
  W.wet=clamp(W.wet+(W.rain>.1?dt*.07*W.rain:-dt*.012),0,1);
  // wind uniforms + trees
  windU.uTime.value=W.time;windU.uWind.value=W.wind;windU.uWdir.value.set(Math.cos(W.wdir),Math.sin(W.wdir));
  const wx=Math.cos(W.wdir),wz=Math.sin(W.wdir);
  for(const t of trees){const g=Math.sin(W.time*(1.1+W.wind)+t.ph)*.5+.5;const a=(.02+.05*g)*W.wind*t.k;t.g.rotation.x=wz*a;t.g.rotation.z=-wx*a;}
  // rain
  const nR=Math.floor(RAIN_N*W.rain*(GFX==='high'?1:.5));rainLines.visible=nR>0;
  if(nR){rainGeo.setDrawRange(0,nR*2);const vx=wx*W.wind*8,vz=wz*W.wind*8,vy=-27;
    for(let i=0;i<nR;i++){const d=drops[i];d.y+=vy*d.s*dt;d.x+=vx*dt;d.z+=vz*dt;
      if(d.y<0){if(Math.random()<.07*(GFX==='high'?1:.4))splash(cx+d.x,cz+d.z);d.y+=rand(22,27);d.x=rand(-32,32);d.z=rand(-28,24);}
      if(d.x>32)d.x-=64;else if(d.x<-32)d.x+=64;if(d.z>24)d.z-=52;else if(d.z<-28)d.z+=52;
      const k=i*6,px=cx+d.x,pz=cz+d.z;rainPos[k]=px;rainPos[k+1]=d.y;rainPos[k+2]=pz;rainPos[k+3]=px-vx*.04;rainPos[k+4]=d.y-vy*d.s*.04;rainPos[k+5]=pz-vz*.04;}
    rainGeo.attributes.position.needsUpdate=true;}
  // ash
  const leaves=S.season===2?clamp(W.wind-.3,0,1)*.18:0,pAmt=Math.max(W.ash,W.snow,leaves),pk=W.snow>=W.ash&&W.snow>=leaves?'snow':W.ash>=leaves?'ash':'leaf';
  if(ashPts.userData.k!==pk){ashPts.userData.k=pk;ashPts.material.color.setHex(pk==='snow'?0xf4f8ff:pk==='ash'?0xc4bcae:0xd0782a);ashPts.material.size=pk==='snow'?.2:pk==='leaf'?.3:.17;}
  const fall=pk==='snow'?1.7:pk==='leaf'?1.1:1.3,swy=pk==='leaf'?1.8:pk==='snow'?.9:.6;
  const nA=Math.floor(ASH_N*pAmt*(GFX==='high'?1:.5));ashPts.visible=nA>0;
  if(nA){ashGeo.setDrawRange(0,nA);const vx=wx*W.wind*3,vz=wz*W.wind*3;
    for(let i=0;i<nA;i++){const f=flakes[i];f.y-=fall*f.s*dt;f.x+=(vx*(pk==='snow'?2:1)+Math.sin(W.time*1.3+f.p)*swy)*dt;f.z+=(vz*(pk==='snow'?2:1)+Math.cos(W.time*1.1+f.p)*swy)*dt;
      if(f.y<0){f.y+=22;f.x=rand(-32,32);f.z=rand(-28,24);}
      if(f.x>32)f.x-=64;else if(f.x<-32)f.x+=64;if(f.z>24)f.z-=52;else if(f.z<-28)f.z+=52;
      ashPos[i*3]=cx+f.x;ashPos[i*3+1]=f.y;ashPos[i*3+2]=cz+f.z;}
    ashGeo.attributes.position.needsUpdate=true;}
  for(const s of splashes){if(s.life<=0)continue;s.life-=dt;const k=1-s.life/.3;s.m.scale.setScalar(1+k*3);s.m.material.opacity=.55*(1-k);if(s.life<=0)s.m.visible=false;}
  // lightning
  if(W.type==='storm'&&W.rain>.6){W.boltT-=dt;if(W.boltT<=0){W.boltT=rand(4,11);lightning(cx,cz,S.running&&Math.random()<.7);}}
  if(W.boltLife>0){W.boltLife-=dt;const o=Math.random()<.35?.3:1;bolt.material.opacity=o;bolt2.material.opacity=o*.6;if(W.boltLife<=0)bolt.visible=bolt2.visible=false;}
  W.flash=Math.max(0,W.flash-dt*3.2);
  // wet ground: darker, glossier
  ground.material.roughness=1-.55*W.wet;ground.material.color.setScalar(1-.3*W.wet);
  for(const m of roadMats){m.roughness=1-.75*W.wet;m.color.setHex(m.map?0xd0d0cc:0x2d302c).multiplyScalar(1-.25*W.wet);}
  baseFloor.material.roughness=1-.6*W.wet;
  // decals fade (rain washes them faster)
  for(const d of decals){if(!d.m.visible)continue;d.life-=dt*(1+W.wet*2);if(d.life<12)d.m.material.opacity=d.base*Math.max(0,d.life/12);if(d.life<=0)d.m.visible=false;}

}

