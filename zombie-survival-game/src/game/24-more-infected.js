/* ================= MORE INFECTED =================
   A soldier body (the three.js example Soldier, a Mixamo character) is retargeted onto the bone names our shared attack
   and death clips use. The other bodies are remixed per spawn: a forced clothing colour (convict orange, police navy,
   hazmat yellow, scrubs, turnout black), hats and masks hung on the head bone, and bone scaling for lanky or bloated builds. */
const MIXMAP={Spine1:'Spine01',Spine2:'Spine02',Neck:'neck',HeadTop_End:'head_end'};
// the loader strips the colon from 'mixamorig:' names, so match either spelling
const MIXRE=/^mixamorig:?(.+)$/;
function retargetMixamo(gltf){let any=false;const fix=n=>{const m=MIXRE.exec(n);if(!m)return n;any=true;return MIXMAP[m[1]]||m[1];};
  gltf.scene.traverse(o=>{if(o.name)o.name=fix(o.name);});
  if(!any)return;for(const c of gltf.animations)for(const t of c.tracks){const i=t.name.lastIndexOf('.');t.name=fix(t.name.slice(0,i))+t.name.slice(i);}}
const ZVAR={
  plain:{p:30},
  convict:{p:12,force:[.95,.42,.08],not:['grandma']},
  hardhat:{p:9,force:[.85,.8,.12],hat:'hardhat'},
  cop:{p:8,force:[.13,.17,.34],hat:'cap'},
  hazmat:{p:6,force:[.92,.8,.14],hat:'hood'},
  medic:{p:8,force:[.22,.56,.56],hat:'mask'},
  fire:{p:6,force:[.13,.12,.14],hat:'firehelm'},
  biker:{p:6,force:[.09,.09,.11],hat:'halfhelm'},
  lanky:{p:8,bones:{LeftArm:1.22,RightArm:1.22,LeftUpLeg:1.1,RightUpLeg:1.1},lift:.09},
  bloat:{p:7,force:[.46,.58,.3],bones:{Spine01:1.17,Head:.86,LeftArm:.88,RightArm:.88}},
  farmer:{p:9,force:[.2,.3,.52],hat:'straw'},
  hunter:{p:6,force:[.98,.42,.06],hat:'blaze'},
  football:{p:5,force:[.62,.08,.08],hat:'gridiron',bones:{LeftShoulder:1.25,RightShoulder:1.25,Spine02:1.08}},
  nurse:{p:6,force:[.86,.52,.62],hat:'mask'},
  chef:{p:4,force:[.9,.9,.88],hat:'toque'},
  trucker:{p:6,force:[.36,.3,.22],hat:'trucker'},
  runt:{p:5,bones:{Spine01:.9,LeftUpLeg:.9,RightUpLeg:.9,Head:1.12},lift:-.08},
};
function pickVar(model){const L=Object.entries(ZVAR).filter(([k,v])=>!(v.not&&v.not.includes(model)));let s=0;for(const [,v] of L)s+=v.p;let r=Math.random()*s;for(const [k,v] of L){r-=v.p;if(r<=0)return k;}return'plain';}
// a prop hung on a bone, built in metres whatever units the armature uses
function boneProp(inst,name,build){const b=inst.getObjectByName(name);if(!b)return;const ws=new V3();b.getWorldScale(ws);const g=new THREE.Group();g.scale.setScalar(1/(ws.x||1));build(g);b.add(g);}
const HATS={
  hardhat:g=>{const m=M(0xe8c21a);g.add(mki(CYL(.13,.155,.11,12),m,0,.2,0,.02));g.add(mki(CYL(.2,.2,.02,14),m,0,.155,.02,.02));},
  cap:g=>{const m=M(0x1e2a44);g.add(mki(BOX(.2,.09,.21),m,0,.19,0,.02));g.add(mki(BOX(.19,.02,.1),m,0,.155,.15,.02));g.add(mk(BOX(.05,.04,.01),M(0xe9c46a),0,.2,.106,false));},
  hood:g=>{const h=mki(new THREE.SphereGeometry(.17,12,9),M(0xe8cc2a),0,.12,0,.02);h.scale.set(1,1.2,1);g.add(h);g.add(mk(BOX(.13,.07,.03),M(0x2a2a2a),0,.11,.165,false));},
  mask:g=>{g.add(mki(BOX(.14,.09,.05),M(0x9fd4e6),0,.08,.15,.02));},
  firehelm:g=>{const m=M(0x8a1e14);g.add(mki(CYL(.14,.165,.12,12),m,0,.2,0,.02));g.add(mki(CYL(.23,.23,.025,14),m,0,.15,-.02,.02));g.add(mk(BOX(.06,.05,.01),M(0xe9c46a),0,.2,.166,false));},
  straw:g=>{const m=M(0xd8b860);g.add(mki(CYL(.11,.13,.11,10),m,0,.21,0,.02));g.add(mki(CYL(.29,.29,.02,16),m,0,.16,0,.02));g.add(mk(CYL(.132,.132,.025,10),M(0x7a2e22),0,.175,0,false));},
  blaze:g=>{const m=M(0xf05a10);g.add(mki(new THREE.SphereGeometry(.13,10,7,0,Math.PI*2,0,Math.PI*.5),m,0,.15,0,.02));g.add(mki(BOX(.2,.02,.11),m,0,.15,.14,.02));},
  gridiron:g=>{const m=M(0x9a1414,{metalness:.3,roughness:.4});const h=mki(new THREE.SphereGeometry(.175,12,9),m,0,.12,0,.02);h.scale.set(1,1.08,1.12);g.add(h);
    for(const y of [.03,.08])g.add(mk(BOX(.22,.018,.02),M(0xd8d8d0),0,y,.19,false));g.add(mk(BOX(.03,.2,.3),M(0xe8e0c8),0,.25,0,false));},
  toque:g=>{const m=M(0xf2f0ea);g.add(mki(CYL(.12,.115,.16,10),m,0,.24,0,.02));const t=mki(new THREE.SphereGeometry(.14,10,8),m,0,.36,0,.02);t.scale.y=.6;g.add(t);},
  trucker:g=>{g.add(mki(BOX(.2,.1,.21),M(0x2a4a7a),0,.19,0,.02));g.add(mki(BOX(.2,.02,.11),M(0x2a4a7a),0,.15,.15,.02));g.add(mk(BOX(.12,.06,.01),M(0xe8e0d0),0,.2,.106,false));},
  halfhelm:g=>{g.add(mki(new THREE.SphereGeometry(.165,12,8,0,Math.PI*2,0,Math.PI*.5),M(0x151515,{metalness:.4,roughness:.4}),0,.12,0,.02));},
};
function applyVariant(type,inst,gu,T){
  if(type!=='walker'&&type!=='runner'&&type!=='crawler')return null;const k=pickVar(T.key),V=ZVAR[k];if(!V||k==='plain')return null;
  if(V.force)gu.uForce.value.set(V.force[0],V.force[1],V.force[2]);
  if(V.bones)for(const [n,s] of Object.entries(V.bones)){const b=inst.getObjectByName(n);if(b)b.scale.multiplyScalar(s);}
  if(V.lift)inst.position.y+=V.lift;
  if(V.hat&&HATS[V.hat])boneProp(inst,'Head',HATS[V.hat]);
  return k;
}

const ZMODEL_FOR={walker:['office','grandma','office','grandma','soldier'],trooper:['soldier'],crawler:['office','grandma'],runner:['office','grandma'],boomer:['trucker'],brute:['hulk'],spitter:['office','grandma'],boss:['hulk']};
const ZSHARED={attack:'models/zombies/anim/attack.gltf.json',death:'models/zombies/anim/death.gltf.json',
  extra:'models/zombies/anim/extra.gltf.json'}; // extra: crawl, shamble, swipe, fall (keyed in Blender, tools/blender/zombie_anims.py)
const ZEXTRA=['crawl','shamble','swipe','fall','jog','sprint','feral','charge'];
const ZM={},ZCLIP={},zOlMats={};
function prepZModel(k,gltf,h){retargetMixamo(gltf);
  const root=gltf.scene;const fit=rigFit(root,h);const s=fit.s;
  const grad=toonGradient(),ws=new V3();let rootBone=null;
  root.traverse(o=>{
    if(o.isBone&&!rootBone&&!(o.parent&&o.parent.isBone))rootBone=o.name;
    if(!o.isMesh)return;const old=Array.isArray(o.material)?o.material[0]:o.material;
    o.material=new THREE.MeshToonMaterial({map:old&&old.map||null,color:old&&old.map?0xffffff:0xcccccc,gradientMap:grad,skinning:!!o.isSkinnedMesh});
    o.castShadow=true;o.frustumCulled=false;o.getWorldScale(ws);o.geometry.computeBoundingBox();{const bb=o.geometry.boundingBox;o.userData.gmn=bb.min.clone();o.userData.ginv=1/((bb.max.y-bb.min.y)||1);}o.userData.olTh=o.isSkinnedMesh?fit.th:(.02/(s*(ws.x||1))).toFixed(5);
  });
  const wc=gltf.animations.find(a=>/walk/i.test(a.name))||gltf.animations[0];
  ZM[k]={root,s,h,key:k,offX:fit.offX,offY:fit.offY,offZ:fit.offZ,rootBone,walk:wc?stripRootMotion(wc.clone(),rootBone):null};
}
function zOutlineMat(sk,th){
  const key=sk+'|'+th;if(zOlMats[key])return zOlMats[key];
  const m=new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide,skinning:sk});
  m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed += normal * '+th+';');};
  m.customProgramCacheKey=()=>key;return zOlMats[key]=m;
}
if(THREE.GLTFLoader&&THREE.SkeletonUtils){try{
  const L=new THREE.GLTFLoader();
  for(const [k,[url,h]] of Object.entries(ZMODEL_FILES))L.load(url,g=>{try{prepZModel(k,g,h);}catch(e){console.warn('Zombie model '+k+' failed; using box infected.',e);}},undefined,()=>{});
  for(const [k,url] of Object.entries(ZSHARED))L.load(url,g=>{if(k==='extra'){for(const a of g.animations)ZCLIP[a.name]=a;}else if(g.animations[0])ZCLIP[k]=g.animations[0];},undefined,()=>{});
}catch(e){}}
function makeZombieGLB(type){
  const opts=ZMODEL_FOR[type];if(!opts)return null;const avail=opts.filter(k=>ZM[k]);if(!avail.length)return null;
  const T=ZM[pick(avail)];
  const g=new THREE.Group();g.rotation.order='YXZ';
  const inst=THREE.SkeletonUtils.clone(T.root);inst.scale.setScalar(T.s);inst.position.set(T.offX,T.offY,T.offZ);g.add(inst);
  const mats=[],meshes=[];const gu={uSeed:{value:rand(0,50)},uBlood:{value:rand(.12,.4)},uHue:{value:pick([0,0,.4,.8,2.5,3.0])},uForce:{value:new THREE.Vector3(0,0,0)}};
  inst.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.emissive=new THREE.Color(0);o.material.userData.grime=gu;applyGrime(o.material,o.userData.gmn,o.userData.ginv);mats.push(o.material);meshes.push(o);}});
  const variant=applyVariant(type,inst,gu,T);zTypeProps(type,inst);
  if(type==='boss'){gu.uHue.value=.8;gu.uBlood.value=.75;}
  if(GFX==='high')for(const o of meshes){const sk=!!o.isSkinnedMesh;const ol=sk?new THREE.SkinnedMesh(o.geometry,zOutlineMat(sk,o.userData.olTh)):new THREE.Mesh(o.geometry,zOutlineMat(sk,o.userData.olTh));
    if(sk){ol.bind(o.skeleton,o.bindMatrix);ol.bindMode=o.bindMode;}ol.position.copy(o.position);ol.quaternion.copy(o.quaternion);ol.scale.copy(o.scale);ol.frustumCulled=false;o.parent.add(ol);}
  const mixer=new THREE.AnimationMixer(inst),acts={};
  if(T.walk){acts.walk=mixer.clipAction(T.walk);if(type!=='crawler'){acts.walk.play();acts.walk.time=Math.random()*T.walk.duration;}} // crawlers are posed by hand (zCrawlPose)
  // the Blender clips are keyed on the skeleton the office, grandma, trucker and hulk share (not the soldier's)
  if(T.key!=='soldier')for(const n of ZEXTRA){if(!T[n]&&ZCLIP[n])T[n]=stripRootMotion(ZCLIP[n].clone(),T.rootBone);
    if(T[n]){const a=mixer.clipAction(T[n]);if(n==='swipe'||n==='fall'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}acts[n]=a;}}
  // crawlers crawl; about half the walkers shamble, dragging a leg, instead of walking
  const loco=type==='crawler'&&acts.crawl?acts.crawl:type==='walker'&&acts.shamble&&Math.random()<.5?acts.shamble:null;
  if(loco){if(acts.walk)acts.walk.stop();loco.play();loco.time=Math.random()*loco.getClip().duration;acts.loco=loco;}
  for(const n of ['attack','death']){if(!T[n]&&ZCLIP[n])T[n]=stripRootMotion(ZCLIP[n].clone(),T.rootBone);
    if(T[n]){const a=mixer.clipAction(T[n]);a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;acts[n]=a;}}
  const v=type==='runner'?rand(.84,.94):type==='walker'?rand(.9,1.1):type==='boss'?1.45:1;g.scale.setScalar(v);
  return{g,mats,mixer,acts,glb:true,barY:T.h*v+.35,bones:zBones(inst),hbx:zHitboxes(inst)};
}
function zAttackAnim(z){
  // now and then the wound-up two-handed swipe instead of the quick claw
  const sw=z.acts&&z.acts.swipe&&!z.def.crawl&&Math.random()<.45,a=z.acts&&(sw?z.acts.swipe:z.acts.attack);if(!a)return;a.reset();a.setEffectiveWeight(1);a.fadeIn(.08);a.play();
  setTimeout(()=>{if(a.isRunning())a.fadeOut(.25);},sw?700:520);
}
function makeZombie(type){
  const gm=makeZombieGLB(type);if(gm)return gm;
  const d=ZT[type];const g=new THREE.Group();g.rotation.order='YXZ';
  const skin=new THREE.MeshStandardMaterial({color:d.skin,roughness:.9,flatShading:true,emissive:0x000000});
  const shirt=new THREE.MeshStandardMaterial({color:d.shirt,roughness:.95,flatShading:true,emissive:0x000000});
  const pants=M(0x2f3436);
  const eye=eyeMats[type]||(eyeMats[type]=BASIC(d.eye));
  const legs=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.17,.8,0);p.add(mk(BOX(.27,.8,.29),pants,0,-.4,0,false));g.add(p);return p;});
  const torso=new THREE.Group();torso.position.y=.8;g.add(torso);
  const tw=type==='brute'||type==='boss'?1.1:.74;
  torso.add(mk(BOX(tw,.85,.45),shirt,0,.42,0));
  const head=mk(BOX(.45,.45,.45),skin,0,1.1,.05,false);torso.add(head);
  for(const s of [-1,1]){const e=new THREE.Mesh(BOX(.08,.06,.04),eye);e.position.set(s*.11,1.14,.29);torso.add(e);}
  const arms=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*(tw/2+.12),.78,0);p.add(mk(BOX(.21,.78,.21),skin,0,-.36,0,false));p.rotation.x=-1.4;torso.add(p);return p;});
  if(type==='runner'){torso.rotation.x=.35;}
  if(type==='boomer'){const belly=mk(new THREE.SphereGeometry(.6,10,8),skin,0,.35,.18);belly.scale.set(1,1,1.1);torso.add(belly);
    for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(.1,6,5),eye);b.position.set(rand(-.4,.4),rand(.1,.7),rand(.5,.75));torso.add(b);}}
  if(type==='spitter'){head.scale.set(1,1.4,1);const sac=new THREE.Mesh(new THREE.SphereGeometry(.22,8,6),eye);sac.position.set(0,.82,.2);torso.add(sac);}
  if(type==='brute'||type==='boss'){torso.add(mk(BOX(1.3,.3,.6),M(0x4a4a44,{metalness:.3}),0,.85,0));}
  if(type==='boss'){for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.08,.6,5),M(0xd9d0b8));c.position.set(rand(-.45,.45),rand(.4,.95),-.3);c.rotation.x=-1.1;torso.add(c);}}
  g.scale.setScalar(d.scale);
  return{g,legs,arms,torso,mats:[skin,shirt]};
}
function spawnZombie(type,x,z){
  const d=ZT[type];const m=makeZombie(type);m.g.position.set(x,0,z);scene.add(m.g);
  const hpMul=(1+.13*Math.max(0,S.wave-1))*D.hp;
  const bw=type==='boss'?3.4:d.r*1.8;
  const bg=new THREE.Sprite(barBg);bg.center.set(0,.5);bg.scale.set(bw,.14,1);bg.visible=false;bg.renderOrder=10;scene.add(bg);
  const fg=new THREE.Sprite(type==='boss'?barFgBoss:barFg);fg.center.set(0,.5);fg.scale.set(bw,.14,1);fg.visible=false;fg.renderOrder=11;scene.add(fg);
  const hunt=S.phase==='night'||type==='boss';
  const z0={type,def:d,...m,x,z,y:0,aware:hunt,always:hunt,sus:0,wx:x,wz:z,wT:0,alertT:0,lostT:0,yaw:0,hp:d.hp*hpMul,maxHp:d.hp*hpMul,kx:0,kz:0,atkCd:0,wallT:0,spitCd:rand(1,2),chargeCd:rand(3,6),chargeT:0,slamCd:3,slamT:0,summonCd:10,
    walk:rand(0,6),flash:0,blocked:null,breach:null,reT:0,dying:false,dieT:0,bg,fg,bw,lunge:0,jy:0,spikeT:0,hx:0,hz:0,lift:0,dvx:0,dvy:0,dvz:0,dspin:0,sink:0};
  zombies.push(z0);
  if(type==='boss'){banner('THE ABOMINATION','It walks with the horde tonight. Aim for the bulk.','night');Sound.play('roar',1);rumble(.8,.8,500);}
  return z0;
}
function edgeSpawn(){
  const home=Math.hypot(player.x,player.z)<45,cx=home?0:player.x,cz=home?0:player.z;
  for(let i=0;i<30;i++){const a=rand(0,Math.PI*2),r=home?rand(55,78):rand(42,66);const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;
    if(Math.hypot(x-player.x,z-player.z)<34)continue;if(blockedSpot(x,z,1.2))continue;return{x,z};}
  return{x:cx+60,z:cz+60};
}
function buildWave(n){
  const list=[],total=Math.round((5+n*2.6+n*n*.12)*D.count),sp=D.spec;
  for(let i=0;i<total;i++){
    // night specials arrive earlier and grow every night
    const w={walker:1,runner:(n>=2?.15+.06*n:.06)*sp,crawler:n>=2?(.1+.02*n)*sp:0,spitter:n>=2?(.1+.015*n)*sp:0,trooper:n>=3?(.06+.015*n)*sp:0,boomer:n>=3?(.09+.012*n)*sp:0,brute:n>=4?(.035+.01*n)*sp:0};
    let sum=0;for(const k in w)sum+=w[k];let r=Math.random()*sum,t='walker';for(const k in w){r-=w[k];if(r<=0){t=k;break;}}
    list.push(t);
  }
  if(n%5===0)for(let i=0;i<n/5;i++)list.splice(Math.floor(list.length*.6),0,'boss');
  return list;
}
const inYard=(x,z)=>Math.abs(x)<BR&&Math.abs(z)<BR,inBase=(x,z)=>base.wallLv>0?inYard(x,z):inHome(x,z);
function nearestBreach(x,z){let best=null,bd=1e9;for(const s of segs){if(solidSeg(s))continue;const d=Math.hypot(s.cx-x,s.cz-z);if(d<bd){bd=d;best=s;}}return best?{s:best,d:bd}:null;}
function collideCircles(o,r){nearObs(o.x,o.z,r,ob=>{if(ob.lvl!==undefined&&ob.lvl!==(o.lvl||0))return;if(ob.h!==undefined&&(o.jy||0)>=ob.h-.3)return;const dx=o.x-ob.x,dz=o.z-ob.z,rr=ob.r+r;if(Math.abs(dx)>rr||Math.abs(dz)>rr)return;const d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);o.x=ob.x+dx/d*rr;o.z=ob.z+dz/d*rr;}});}
function collideSeg(o,r,s){
  const px=clamp(o.x,s.x0,s.x1),pz=clamp(o.z,s.z0,s.z1);const dx=o.x-px,dz=o.z-pz,d2=dx*dx+dz*dz;
  if(d2>=r*r)return false;
  if(d2<1e-6){const side=((o.x-s.cx)*s.nx+(o.z-s.cz)*s.nz)>=0?1:-1;if(s.nx!==0)o.x=side>0?s.x1+r:s.x0-r;else o.z=side>0?s.z1+r:s.z0-r;}
  else{const d=Math.sqrt(d2);o.x=px+dx/d*r;o.z=pz+dz/d*r;}
  return true;
}
function damageZombie(z,dmg,kx,kz,silent,lift){
  if(z.dying)return;dmg=zArmor(z,dmg,kx,kz);z.hp-=dmg;
  if(!silent)dmgNum(z,dmg,z.hp<=0?'kill':SNEAKF?'sneak':CRITF?'crit':'',(z.barY||2.35*z.def.scale)+.25);
  if(!z.aware&&!silent)zAlert(z);
  if(!silent){bloodUp(z,dmg/z.maxHp*.7);z.flash=.09;if(Math.random()<.3)decal(z.x+rand(-.5,.5),z.z+rand(-.5,.5),rand(.4,.8),z.type==='spitter'?0x3f6a14:0x4a0a08,.7);burst(z.x,1.3*z.def.scale,z.z,3,z.type==='spitter'?'acid':'blood',4);Sound.play('hit',.7,z.x,z.z);
    const kr=z.type==='boss'?.1:z.type==='brute'?.3:1;z.kx+=(kx||0)*kr;z.kz+=(kz||0)*kr;z.hx=kx||0;z.hz=kz||0;z.lift=lift||0;}
  if(z.hp<=0)killZombie(z);
}
function killZombie(z){
  if(z.dying)return;z.dying=true;z.dieT=0;zOnDeath(z);z.y=z.jy||0;S.kills++;z.bg.visible=z.fg.visible=false;gainXP(z.def.score*.8);jobProg('kill',1);
  const d=z.def;burst(z.x,1,z.z,10,z.type==='spitter'?'acid':'gore',5);
  if(z.type!=='boomer')decal(z.x+z.hx*.12,z.z+z.hz*.12,rand(1.3,2.1)*Math.sqrt(d.scale),z.type==='spitter'?0x3f6a14:0x4a0a08,.85);
  // ragdoll fling
  const heavy=z.type==='boss'?.12:z.type==='brute'?.4:1;
  const hl=Math.hypot(z.hx,z.hz);
  z.dvx=z.hx*1.4*heavy;z.dvz=z.hz*1.4*heavy;z.dvy=(z.lift?z.lift:rand(1,2.5)+hl*.25)*heavy;z.dspin=rand(-6,6)*heavy*(z.lift?1.5:.4);
  if(hl>.5)z.yaw=Math.atan2(-z.hx,-z.hz);
  if(z.acts&&z.acts.death){if(z.acts.walk)z.acts.walk.fadeOut(.12);if(z.acts.loco)z.acts.loco.fadeOut(.12);if(z.gait&&z.gait!==z.acts.loco&&z.gait!==z.acts.walk)z.gait.fadeOut(.12);if(z.acts.attack)z.acts.attack.stop();if(z.acts.swipe)z.acts.swipe.stop();
    const a=z.acts.fall&&!z.def.crawl&&Math.random()<.5?z.acts.fall:z.acts.death;a.reset();a.fadeIn(.08);a.play();z.animDeath=true;}
  spawnPickup('scrap',z.x+rand(-.4,.4),z.z+rand(-.4,.4),randi(d.drop[0],d.drop[1]));
  if(d.parts)spawnPickup('parts',z.x+rand(-.6,.6),z.z+rand(-.6,.6),d.parts);
  if(Math.random()<.16&&ownedAmmo().length)spawnPickup('ammo',z.x+rand(-.6,.6),z.z+rand(-.6,.6),1);
  if(Math.random()<.035)spawnPickup('med',z.x+rand(-.6,.6),z.z+rand(-.6,.6),1);
  if(z.type==='boomer'){z.g.visible=false;explode(z.x,z.z,4.6,70,{hurt:45,wall:120,color:0xb8d050});}
  zombieDrop(z);
  if(z.type==='brute'&&Math.random()<.1)spawnWDrop(rollWeapon(null,3),z.x+rand(-.8,.8),z.z+rand(-.8,.8));
  if(z.type==='boss'){const sp=randomSpecial('hive');if(sp)spawnWDrop(mkW(null,0,sp),z.x,z.z);banner('IT FALLS','The Abomination is down. Collect its parts.','dawn');S.shake=1;Sound.play('roar',.6);rumble(1,1,600);}
}
function removeZombie(z){if(z.mixer){z.mixer.stopAllAction();z.mixer.uncacheRoot(z.mixer.getRoot());}
  else z.g.traverse(o=>{if(o.isMesh&&o.geometry&&(o.geometry.type==='SphereGeometry'||o.geometry.type==='ConeGeometry'))o.geometry.dispose();});scene.remove(z.g);scene.remove(z.bg);scene.remove(z.fg);z.mats.forEach(m=>m.dispose());}

function updateDying(z,dt){
  z.dieT+=dt;if(z.type==='boomer')return;
  z.dvy-=GRAV*dt;z.x+=z.dvx*dt;z.z+=z.dvz*dt;z.y+=z.dvy*dt;
  if(z.y<=0){z.y=0;if(z.dvy<-3){z.dvy=-z.dvy*.3;Sound.play('thud',.4*clamp(1-dist2p(z)/40,0,1));burst(z.x,.2,z.z,2,'debris',2);}else z.dvy=0;
    const f=Math.pow(.015,dt);z.dvx*=f;z.dvz*=f;z.dspin*=f;}
  const ox=z.x,oz=z.z;collideCircles(z,z.def.r*.7);
  for(const s of ALLSEG){if(!solidSeg(s))continue;if(Math.abs(z.x-s.cx)>4.5||Math.abs(z.z-s.cz)>4.5)continue;collideSeg(z,z.def.r*.7,s);}
  if(z.x!==ox||z.z!==oz){z.dvx*=-.3;z.dvz*=-.3;}
  z.yaw+=z.dspin*dt;
  if(z.mixer)z.mixer.update(dt);
  if(!z.animDeath)z.g.rotation.x=lerp(z.g.rotation.x,-Math.PI/2,Math.min(1,dt*(z.y>0?5:9)));
  if(z.dieT>1.6)z.sink+=dt*.7;
  z.g.position.set(z.x,z.y*.9+(z.animDeath?0:.15*Math.min(1,z.dieT*3)*z.def.scale)-z.sink+(z.lvlY||0),z.z);z.g.rotation.y=z.yaw;
}

const pd0=z=>Math.hypot(player.x-z.x,player.z-z.z);
let PERCH=null;
// the object the player is standing on, if it's one the dead could climb or shake
function perchOf(){if(!player.alive||!(player.jy>.3)||player.climb||player.lvl||player.mantle>0)return null;let best=null;
  nearObs(player.x,player.z,.1,o=>{if(o.h===undefined||o.lvl!==undefined||Math.abs(o.h-player.jy)>.35)return;if(Math.hypot(o.x-player.x,o.z-player.z)<o.r+.2&&(!best||o.h>best.h))best=o;});return best;}
const CLIMB={walker:[1.85,1.15],runner:[1.85,.6],spitter:[1.3,1.4]}; // [highest perch they can scale, seconds to climb]
function zClimb(z,dt,pd){
  if(z.climbT>0){z.climbT-=dt;const k=1-Math.max(0,z.climbT)/z.climbD,kk=clamp((k-.5)/.5,0,1);z.jy=z.cy0+(z.cyH-z.cy0)*Math.min(1,k*1.5);
    z.x+=(z.cx-z.x)*kk*Math.min(1,dt*8);z.z+=(z.cz-z.z)*kk*Math.min(1,dt*8);if(z.climbT<=0){z.jy=z.cyH;z.climbT=0;}return true;}
  const o=PERCH;if(!o||!z.aware||!player.alive||(z.jy||0)>=o.h-.3)return false;
  // climb whatever part of that object is in reach (a car's hood, then its roof), not only the circle you stand on
  let t=o,od=Math.hypot(z.x-o.x,z.z-o.z);
  if(od>o.r+z.def.r+.5){t=null;nearObs(z.x,z.z,1.6,q=>{if(t||q.h===undefined||q.lvl!==undefined||q.h<(z.jy||0)+.3||q.h>o.h+.05)return;
      if(Math.hypot(q.x-z.x,q.z-z.z)>q.r+z.def.r+.5||Math.hypot(q.x-o.x,q.z-o.z)>q.r+o.r+.6)return;t=q;});
    if(!t)return false;od=Math.hypot(z.x-t.x,z.z-t.z);}
  const c=CLIMB[z.type];
  if(c&&t.h<=c[0]){const n=od||1;z.climbD=z.climbT=c[1]*clamp(t.h/1.2,.7,1.4);z.cy0=z.jy||0;z.cyH=t.h;z.cx=t.x+(z.x-t.x)/n*t.r*.45;z.cz=t.z+(z.z-t.z)/n*t.r*.45;z.lunge=.3;zAttackAnim(z);Sound.play('thud',.45,z.x,z.z);
    if(!S.climbMsg){S.climbMsg=1;toast('They\'re climbing up after you!','bad');}return true;}
  // too heavy to climb: brutes and the Abomination shake you off instead
  if((z.type==='brute'||z.type==='boss')&&z.atkCd<=0){z.atkCd=1.7;z.lunge=.3;zAttackAnim(z);S.shake=Math.max(S.shake,.45);Sound.play('crash',.8,z.x,z.z);rumble(.6,.5,250);burst(o.x,o.h,o.z,6,'debris',4);
    if(!S.rockMsg){S.rockMsg=1;toast('It\'s rocking your perch. Hold on, or jump clear!','bad');}
    if(Math.random()<.5){const n=pd||1;knockPlayer((player.x-z.x)/n,(player.z-z.z)/n,12);player.air=true;player.jvy=5;player.fall0=player.jy;}}
  return false;
}
// up on top of something: walk off an edge and you fall, like anyone else
function zVertical(z,dt){if(z.climbT>0||!(z.jy>0))return;const s=supportAt(z.x,z.z,z.jy);
  if(s<z.jy-.02){z.jvy=(z.jvy||0)-GRAV*dt;z.jy=Math.max(s,z.jy+z.jvy*dt);if(z.jy<=s)z.jvy=0;}else{z.jy=s;z.jvy=0;}}
const zLift=z=>(z.jy||0)+(z.def.crawl?.2:0);
function updateZombies(dt){
  const px=player.x,pz=player.z,pIn=inYard(px,pz),pH=inHome(px,pz);PERCH=perchOf();updateZRocks(dt);
  for(const z of zombies){
    const d=z.def;
    if(z.dying){updateDying(z,dt);continue;}
    if(z.burn>0){burnTick(z,'z',dt);if(z.dying)continue;}
    z.atkCd-=dt;z.flash-=dt;z.spitCd-=dt;if(z.pinT>0)z.pinT-=dt;z.chargeCd-=dt;z.slamCd-=dt;z.summonCd-=dt;z.lunge-=dt;
    const zIn=inYard(z.x,z.z),zH=inHome(z.x,z.z);
    let tx=px,tz=pz;z.alertT-=dt;
    const lu=lureFor(z.x,z.z,45);if(lu){tx=lu.x;tz=lu.z;}
    if(!z.aware&&player.alive){
      const sdx=px-z.x,sdz=pz-z.z,sd=Math.hypot(sdx,sdz)||1,fwd=(sdx*Math.sin(z.yaw)+sdz*Math.cos(z.yaw))/sd;
      const gst=1-.12*PERK('ghost'),vis=(player.crouch?9:17)*(S.phase==='night'?.65:1)*(1-.45*W.fog)*(player.swim?.6:1)*gst;
      const hear=(player.crouch?1.5:player.sprinting?13:player.moving?5:2)*gst*noiseMask()*(player.gear&&player.gear.boots?.85:1);
      let gain=0;if(fwd>.35&&sd<vis)gain=(1.35-sd/vis)*(player.crouch?1:2.2);if(sd<hear)gain=Math.max(gain,(1-sd/hear)*3.2);
      z.sus=clamp(z.sus+(gain>0?gain*dt:-dt*.2),0,1);if(z.sus>=1)zAlert(z);
    }else if(z.aware&&!z.always&&S.phase==='day'){if(pd0(z)>38){z.lostT+=dt;if(z.lostT>9){z.aware=false;z.sus=.25;z.lostT=0;}}else z.lostT=0;}
    if(!z.aware&&!lu){
      z.wT-=dt;if(z.wT<=0||Math.hypot(z.wx-z.x,z.wz-z.z)<1){z.wT=rand(3,7);const a=rand(0,6.28),r=rand(3,9);z.wx=z.x+(px-z.x)*.1+Math.cos(a)*r;z.wz=z.z+(pz-z.z)*.1+Math.sin(a)*r;}
      if(z.sus>.3){tx=px;tz=pz;}else{tx=z.wx;tz=z.wz;}
    }
    if(!player.alive){tx=0;tz=0;}
    else if(z.aware&&base.wallLv>0&&pIn!==zIn){
      z.reT-=dt;if(z.reT<=0){z.reT=.8;z.breach=nearestBreach(z.x,z.z);}
      const b=z.breach;
      if(b&&!solidSeg(b.s)&&b.d<Math.hypot(px-z.x,pz-z.z)+30){
        const s=b.s,dd=Math.hypot(z.x-s.cx,z.z-s.cz),o=zIn?-1:1;
        if(dd<2.8){tx=s.cx-s.nx*3*o;tz=s.cz-s.nz*3*o;}else{tx=s.cx+s.nx*2.5*o;tz=s.cz+s.nz*2.5*o;}
      }
    }
    if(player.alive&&z.aware&&!lu&&pH!==zH&&!(base.wallLv>0&&pIn!==zIn)){
      z.hT=(z.hT||0)-dt;if(z.hT<=0||!z.hOp){z.hT=1.2;z.hOp=homeEntry(z.x,z.z);}
      const o=z.hOp;if(o){const sd=zH?-1:1,lat=o.horiz?z.x-o.cx:z.z-o.cz,al=(z.x-o.cx)*o.nx+(z.z-o.cz)*o.nz;
        if(Math.abs(lat)<o.w/2-.15&&Math.abs(al)<2){tx=o.cx-o.nx*2.2*sd;tz=o.cz-o.nz*2.2*sd;}else{tx=o.cx+o.nx*1.4*sd;tz=o.cz+o.nz*1.4*sd;}}}
    if(z.aware&&player.alive&&!lu&&(player.bld||z.bld)){const nv=lvlNav(z);if(nv){tx=nv[0];tz=nv[1];}}
    {const st=zSteer(z,dt,tx,tz,lu);if(st){tx=st[0];tz=st[1];}}
    let dx=tx-z.x,dz=tz-z.z;const dist=Math.hypot(dx,dz)||1;dx/=dist;dz/=dist;
    // unstick: if an aware infected has barely moved for a while, slide sideways round whatever is in the way
    if(z.aware){z.stT=(z.stT||0)+dt;if(z.stT>2.5){const mv=Math.hypot(z.x-(z.stX??z.x),z.z-(z.stZ??z.z));
        if(mv<.7&&dist>3&&!z.blocked){z.stuck=(z.stuck||0)+1;z.side=Math.random()<.5?-1:1;z.sideT=1.6;}else z.stuck=0;z.stT=0;z.stX=z.x;z.stZ=z.z;
        if(z.stuck>=4&&S.phase==='night'&&pd0(z)>28){const q=edgeSpawn();z.x=q.x;z.z=q.z;z.stuck=0;z.bld=null;z.lvl=0;z.lvlY=0;}}
      if(z.sideT>0){z.sideT-=dt;const sx=-dz*z.side,sz=dx*z.side;dx=dx*.35+sx;dz=dz*.35+sz;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;}}
    const pdx=px-z.x,pdz=pz-z.z,pd=Math.hypot(pdx,pdz);
    const nightRage=S.phase==='night'?1.06+Math.min(.12,.015*S.wave):.8;
    let sp=d.speed*nightRage*(1-.15*W.ash)*(SEA.temp<0?.85:W.type==='heat'?.9:1)*(z.pinT>0?0:1)*(z.aware||lu?1:z.sus>.3?.45:.32);
    // climbing in through a broken window is slow going
    if(Math.abs(z.x)<12&&Math.abs(z.z)<6)for(const s of hsegs)if(s.kind==='win'&&!homeSolid(s)&&segDist(s,z.x,z.z)<.5){sp*=.4;break;}
    if(z.type==='boss'&&player.alive){
      if(z.slamT>0){z.slamT-=dt;sp=0;if(z.slamT<=0){blastFx(z.x,z.z,6,0xc0a080);S.shake=Math.max(S.shake,.7);Sound.play('crash',1);burst(z.x,.3,z.z,20,'debris',9);rumble(.9,.6,300);
        const bd=Math.hypot(px-z.x,pz-z.z);if(bd<6.5){hurtPlayer(35);knockPlayer((px-z.x)/(bd||1),(pz-z.z)/(bd||1),16);}
        for(const s of ALLSEG)if((s.home||s.alive)&&segDist(s,z.x,z.z)<6.5)hitSeg(s,90);
        for(const p of props){const pd2=Math.hypot(p.x-z.x,p.z-z.z);if(pd2<7)impulseProp(p,(p.x-z.x)/(pd2||1)*4,(p.z-z.z)/(pd2||1)*4,7);}}}
      else if(z.slamCd<=0&&pd<6){z.slamT=.7;z.slamCd=4.5;}
      if(z.summonCd<=0&&!(z.slamT>0)&&!zBusy(z)){z.summonCd=12;zSet(z,'summon',1.3);Sound.play('roar',1,z.x,z.z);}
    }
    sp=zAbility(z,dt,pd,pdx,pdz,sp,zH===pH&&pIn===zIn);if(z.dying)continue;
    // in reach: stop and swing instead of walking into the player and being shoved back (which reads as walking backwards)
    z.halt=player.alive&&z.aware&&!lu&&pd<d.r+.7&&zH===pH&&Math.abs((player.jy||0)-(z.jy||0))<1&&!zBusy(z);if(z.halt)sp=0;
    if(d.crawl&&z.bones)sp*=zCrawlSurge(z,dt,sp);
    // crowding in: when one of the dead nearer the player is in the way, work round it to the side instead of shoving into
    // it (the crowd's push-apart would throw this one backwards); the pack spreads into a ring round the player
    if(z.aware&&sp>0&&pd<7){let bs=0;for(const o of zombies){if(o===z||o.dying)continue;const ox=o.x-z.x,oz=o.z-z.z,rr=d.r+o.def.r+.3;if(Math.abs(ox)>rr||Math.abs(oz)>rr)continue;
        const dd=Math.hypot(ox,oz)||1;if(dd<rr&&(ox*dx+oz*dz)/dd>.45&&pd0(o)<pd-.2){bs=(ox*dz-oz*dx)>0?-1:1;break;}}
      if(bs){const nx=dx*.25-dz*bs,nz=dz*.25+dx*bs,nl=Math.hypot(nx,nz)||1;dx=nx/nl;dz=nz/nl;sp*=.55;}}
    // at night they charge the last few metres
    if(S.phase==='night'&&z.aware&&pd<4.5&&pd>1.2&&zH===pH)sp*=1.28;
    if(zClimb(z,dt,pd))sp=0;
    const ozx=z.x,ozz=z.z;z.x+=dx*sp*dt+z.kx*dt;z.z+=dz*sp*dt+z.kz*dt;
    if(depthAt(z.x,z.z)>1.15){z.x=ozx;z.z=ozz;}else{z.dryX=z.x;z.dryZ=z.z;}
    const kd=Math.pow(.01,dt);z.kx*=kd;z.kz*=kd;
    updateLevel(z);
    collideCircles(z,d.r);
    doorCollide(z,d.r,d.scale);
    zVertical(z,dt);
    z.blocked=null;
    for(const s of ALLSEG){if(!solidSeg(s))continue;if(Math.abs(z.x-s.cx)>5.5||Math.abs(z.z-s.cz)>5.5)continue;if(collideSeg(z,d.r,s)&&(!z.blocked||s.kind==='win'||s.kind==='door'))z.blocked=s;}
    if(z.blocked){
      z.wallT-=dt;if(z.wallT<=0&&!(z.blocked.home&&(z.blocked.kind==='wall'||z.blocked.kind==='furn'))){z.wallT=1.1;hitSeg(z.blocked,d.wall*(1+.06*S.wave)*(S.phase==='night'?1.35:1));z.lunge=.25;zAttackAnim(z);}
      if(base.spikeLv&&!z.blocked.door&&!z.blocked.home){damageZombie(z,SPIKE_DPS[base.spikeLv]*dt,0,0,true);z.spikeT-=dt;if(z.spikeT<=0){z.spikeT=.5;burst(z.x,.8,z.z,2,'blood',3);}}
      if(z.dying)continue;
    }
    if(player.alive&&z.aware&&pd<d.r+.85&&z.atkCd<=0&&Math.abs((z.lvlY||0)-(player.lvlY||0))<1.3&&Math.abs((player.jy||0)-(z.jy||0))<1.25&&!(z.climbT>0)&&!zBusy(z)&&(zH===pH||homeLOS(z.x,z.z,px,pz))){z.atkCd=(z.type==='runner'?.75:1.1)*(S.phase==='night'?.78:1);z.lunge=.25;zAttackAnim(z);
      if(!zOnAttack(z)){hurtPlayer(d.dmg*(1+.04*(S.wave-1)));
      if(d.crawl){player.grabT=1.2;if(!S.grabMsg){S.grabMsg=1;toast('A crawler has your ankle! Shake it off.','bad');}}
      const kf=z.type==='brute'?(z.chargeT>0?20:9):z.type==='boss'?12:2.5;knockPlayer(pdx/(pd||1),pdz/(pd||1),kf);if(z.type==='brute')z.chargeT=0;}}
    const fy=sp>0?Math.atan2(dx,dz):z.aware?Math.atan2(pdx,pdz):z.yaw;
    let dy=fy-z.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;z.yaw+=dy*Math.min(1,dt*8);
    z.walk+=dt*(sp+.5)*2.2;const sw=Math.sin(z.walk);
    // the legs follow the ground actually covered: shoved backwards, they step backwards rather than walking on the spot
    {const ax=(z.x-(z.lx??z.x))/dt,az=(z.z-(z.lz??z.z))/dt,jump=Math.hypot(ax,az)*dt>.6;z.lx=z.x;z.lz=z.z; // a teleport (spawn, unstick) is not a sprint
      if(!jump)z.fv=lerp(z.fv||0,clamp(ax*Math.sin(z.yaw)+az*Math.cos(z.yaw),-12,12),Math.min(1,dt*8));}
    if(z.mixer){
      // a crawler's clip is scrubbed to its crawl cycle, so the hauls and the surges in speed line up
      if(z.acts.crawl&&z.acts.loco===z.acts.crawl&&z.ab){z.acts.crawl.timeScale=0;z.acts.crawl.time=((z.ab.cph||0)%1)*z.acts.crawl.getClip().duration;}
      else if(zGait(z)){}
      else if(z.acts.loco||z.acts.walk){const f=clamp(z.fv,-d.speed,d.speed*3)/(d.speed*.8);(z.acts.loco||z.acts.walk).timeScale=(z.fv<-.25?-clamp(-f,.3,1.2):clamp(Math.max(f,sp/(d.speed*.8)*.3),.2,2.4))*(z.type==='runner'?1.5:1);}
      zUndo(z);z.mixer.update(dt);z.g.position.set(z.x,(z.lvlY||0)+zLift(z),z.z);
    }else{
      z.legs[0].rotation.x=sw*.6;z.legs[1].rotation.x=-sw*.6;
      z.arms[0].rotation.x=-1.4+Math.sin(z.walk*.7)*.15-(z.lunge>0?.5:0);z.arms[1].rotation.x=-1.4-Math.sin(z.walk*.7)*.15-(z.lunge>0?.5:0);
      z.g.position.set(z.x,Math.abs(Math.cos(z.walk))*.06+(z.lvlY||0)+zLift(z),z.z);
    }
    z.g.rotation.y=z.yaw;
    z.g.rotation.x=z.type==='boss'&&z.slamT>0?-.35:d.crawl?(z.bones?1.42:1.32):z.climbT>0?.55*Math.sin(Math.PI*(1-z.climbT/z.climbD)):0;
    if(d.crawl){z.g.position.x-=Math.sin(z.yaw)*.8;z.g.position.z-=Math.cos(z.yaw)*.8;if(z.ab)z.g.position.y+=.05*(z.ab.pull||0);}
    zPose(z,dt,pd,pdx,pdz);
    const fl=z.flash>0?.7:0,gl=z.glow||0;for(const m of z.mats)if(m.emissive)m.emissive.setRGB(fl+gl,fl*.2+gl*.5,fl*.1+gl*.08);
    const dmgd=z.hp<z.maxHp;z.bg.visible=z.fg.visible=dmgd;
    if(dmgd){const y=(d.crawl?.95:(z.barY||(z.type==='boss'?2.6:2.35)*d.scale))+gH(z.x,z.z)+(z.lvlY||0)+(z.jy||0);z.bg.position.set(z.x-z.bw/2,y,z.z);z.fg.position.set(z.x-z.bw/2,y,z.z+.01);z.fg.scale.x=z.bw*Math.max(0,z.hp/z.maxHp);}
  }
  for(let i=0;i<zombies.length;i++){const a=zombies[i];if(a.dying)continue;
    for(let j=i+1;j<zombies.length;j++){const b=zombies[j];if(b.dying)continue;const dx=b.x-a.x,dz=b.z-a.z,rr=a.def.r+b.def.r;if(Math.abs(dx)>rr||Math.abs(dz)>rr)continue;
      const d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),o=(rr-d)/2,ux=dx/d,uz=dz/d;const wa=a.halt!==b.halt?(a.halt?0:1):a.def.r>b.def.r?.25:a.def.r<b.def.r?.75:.5; // one already at the player holds its ground
        a.x-=ux*o*2*wa;a.z-=uz*o*2*wa;b.x+=ux*o*2*(1-wa);b.z+=uz*o*2*(1-wa);}}
    if(player.alive&&Math.abs((a.jy||0)-(player.jy||0))<1&&inHome(a.x,a.z)===pH){const dx=a.x-player.x,dz=a.z-player.z,rr=a.def.r+.5,d2=dx*dx+dz*dz;if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2);a.x=player.x+dx/d*rr;a.z=player.z+dz/d*rr;}}
  }
  for(const z of zombies)if(!z.dying&&z.dryX!==undefined&&depthAt(z.x,z.z)>1.15){z.x=z.dryX;z.z=z.dryZ;} // shoves can't push anyone into deep water
  for(let i=zombies.length-1;i>=0;i--){const z=zombies[i];if(z.dying&&z.dieT>3){removeZombie(z);zombies.splice(i,1);}}
}

