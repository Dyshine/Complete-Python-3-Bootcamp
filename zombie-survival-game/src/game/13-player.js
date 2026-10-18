/* ================= PLAYER ================= */
const pl=new THREE.Group();pl.rotation.order='YXZ';scene.add(pl);
const plLegs=[-1,1].map(s=>{const p=new THREE.Group();p.position.set(s*.18,.85,0);p.add(mk(BOX(.28,.85,.3),M(0x353a30),0,-.42,0));pl.add(p);return p;});
pl.add(mk(BOX(.78,.85,.48),M(0x5d6b4a),0,1.27,0));
pl.add(mk(BOX(.82,.5,.52),M(0xd9822b),0,1.38,0));
pl.add(mk(BOX(.42,.44,.42),M(0xc99a76),0,1.92,0));
pl.add(mk(BOX(.46,.14,.48),M(0x2e3a2c),0,2.18,0));
pl.add(mk(BOX(.46,.05,.28),M(0x2e3a2c),0,2.12,.32));
pl.add(mk(BOX(.6,.65,.3),M(0x4a4436),0,1.3,-.38));
[-1,1].forEach(s=>{const p=new THREE.Group();p.position.set(s*.48,1.62,0);p.add(mk(BOX(.2,.7,.2),M(0x5d6b4a),0,-.33,0));p.rotation.x=-1.35;p.rotation.z=s*.25;pl.add(p);});
const gun=new THREE.Group();gun.position.set(0,1.38,.62);pl.add(gun);
const gunBody=mk(BOX(.12,.16,.8),M(0x1c1e1c,{metalness:.4,roughness:.5}),0,0,.2);gun.add(gunBody);

/* hero model: loads hero.glb (rigged character) if it ships with the page, else keeps the box survivor */
const HERO={ready:false,mixer:null,root:null,acts:{},cur:null,hand:null,hitT:0,dead:false};
const boxParts=pl.children.slice();
// extra clips, each exported on its own copy of the same rig; matched to the hero skeleton by bone name
const HERO_ANIMS={idle:'anim/idle.glb',walk:'anim/walk_shoot.glb',back:'anim/walk_back_shoot.glb',run:'anim/run.glb',hit:'anim/hit.glb',death:'anim/death.glb'}; // used only for clips not packed in hero.glb
function toonGradient(){const d=new Uint8Array([70,70,70,255,150,150,150,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;}
function stripRootMotion(clip,rootName){
  // keep the hips' vertical bob, drop horizontal travel (the game moves the player itself)
  for(const t of clip.tracks){
    if(!t.name.endsWith('.position'))continue;const node=t.name.slice(0,-9);
    if(rootName&&node!==rootName)continue;
    const v=t.values,x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0;v[i+2]=z0;}
  }
  return clip;
}
function addHeroClip(name,clip){
  if(!HERO.mixer||!clip)return;
  clip=stripRootMotion(clip.clone(),HERO.rootBone);clip.name=name;
  const a=HERO.mixer.clipAction(clip);
  if(name==='hit'||name==='death'){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
  HERO.acts[name]=a;
  if(name==='idle'&&HERO.cur===HERO.acts.walk&&!HERO.dead)heroPlay('idle',.3);
}
function heroPlay(name,fade){
  const a=HERO.acts[name];if(!a||HERO.cur===a)return;
  a.reset();a.setEffectiveWeight(1);a.play();
  if(HERO.cur)HERO.cur.crossFadeTo(a,fade==null?.2:fade,false);
  HERO.cur=a;
}
function heroHit(){if(!HERO.ready||HERO.dead||!HERO.acts.hit||HERO.hitT>0)return;HERO.hitT=1.2;const a=HERO.acts.hit;a.reset();a.setEffectiveWeight(.85);a.fadeIn(.06);a.play();setTimeout(()=>{if(a.isRunning())a.fadeOut(.25);},380);}
function heroDeath(){if(!HERO.ready||!HERO.acts.death)return false;HERO.dead=true;if(HERO.acts.hit)HERO.acts.hit.stop();heroPlay('death',.12);return true;}
function heroReset(){if(!HERO.ready)return;HERO.dead=false;HERO.hitT=0;HERO.mixer.stopAllAction();HERO.cur=null;heroPlay(HERO.acts.idle?'idle':'walk',0);}
// size a rig from its skeleton: skinned geometry and bones can live in different units (Meshy: metres vs a 0.01 cm armature)
function rigFit(root,targetH){
  root.updateMatrixWorld(true);
  const v=new V3();let minY=1e9,maxY=-1e9,hips=null;
  root.traverse(o=>{if(!o.isBone)return;o.getWorldPosition(v);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);if(!hips&&/hips/i.test(o.name))hips=v.clone();});
  if(!(maxY>minY)){const b=new THREE.Box3().setFromObject(root);minY=b.min.y;maxY=b.max.y;}
  const s=targetH/((maxY-minY)*1.05);
  let geoH=0;root.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox;geoH=Math.max(geoH,bb.max.y-bb.min.y);}});
  return{s,offX:hips?-hips.x*s:0,offY:-minY*s+.02,offZ:hips?-hips.z*s:0,th:((.022*(geoH||targetH))/targetH).toFixed(5)};
}
function setupHero(gltf){
  const root=gltf.scene;const fit=rigFit(root,1.95);
  root.scale.setScalar(fit.s);root.position.set(fit.offX,fit.offY,fit.offZ);
  pl.add(root);pl.updateMatrixWorld(true);
  const grad=toonGradient(),meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const ws=new V3();
  for(const o of meshes){
    const old=Array.isArray(o.material)?o.material[0]:o.material;const sk=!!o.isSkinnedMesh;
    o.material=new THREE.MeshToonMaterial({map:old&&old.map||null,color:old&&old.map?0xffffff:(old&&old.color?old.color.getHex():0xcccccc),gradientMap:grad,skinning:sk});
    o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;
    // inked comic outline: inverted hull pushed out along normals
    o.getWorldScale(ws);const th=sk?fit.th:(.022/(ws.x||1)).toFixed(5);
    const om=new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide,skinning:sk});
    om.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed += normal * '+th+';');};
    const ol=sk?new THREE.SkinnedMesh(o.geometry,om):new THREE.Mesh(o.geometry,om);
    if(sk){ol.bind(o.skeleton,o.bindMatrix);ol.bindMode=o.bindMode;}
    ol.position.copy(o.position);ol.quaternion.copy(o.quaternion);ol.scale.copy(o.scale);ol.frustumCulled=false;o.parent.add(ol);
  }
  // skeleton landmarks: root bone (for root-motion stripping) and right hand (gun anchor)
  root.traverse(o=>{if(!o.isBone)return;if(!HERO.rootBone&&!(o.parent&&o.parent.isBone))HERO.rootBone=o.name;
    if(!HERO.hand&&/right.?hand|hand.?r(ight)?$|r_?hand/i.test(o.name))HERO.hand=o;});
  HERO.mixer=new THREE.AnimationMixer(root);HERO.root=root;heroBones(root);
  // clips may ship packed in hero.glb (named idle/walk/back/run/hit/death) or as separate anim/*.glb files
  const packed=new Set();
  for(const k of Object.keys(HERO_ANIMS)){const c=gltf.animations.find(a=>a.name===k);if(c){addHeroClip(k,c);packed.add(k);}}
  {const cas=gltf.animations.find(a=>a.name==='walk_casual');if(cas)addHeroClip('casual',cas);}
  if(!HERO.acts.walk){const base=gltf.animations.find(a=>/walk/i.test(a.name))||gltf.animations[0];
    if(base){addHeroClip('walk',base);if(/idle/i.test(base.name))HERO.acts.idle=HERO.acts.walk;}}
  for(const p of boxParts)if(p!==gun)p.visible=false;
  HERO.ready=true;heroPlay(HERO.acts.idle?'idle':'walk',0);
  const L=new THREE.GLTFLoader();
  for(const [k,url] of Object.entries(HERO_ANIMS))if(!packed.has(k))L.load(url,g=>{if(g.animations[0])addHeroClip(k,g.animations[0]);},undefined,()=>{});
}
const _hp=new V3();
function updateHero(dt,moving,sprint,fwd,sp){
  if(!HERO.ready)return;HERO.hitT-=dt;
  if(!HERO.dead){
    const A=HERO.acts;
    // one-handed carries walk with a natural arm swing; rifles use the shouldered walk
    const cas=A.casual&&CARRY.cur&&CARRY.cur.cas&&WA.aim<.5;
    if(player.swim||player.climb)heroPlay(A.idle?'idle':'walk',.3);
    else if(!moving)heroPlay(A.idle?'idle':'walk',.25);
    else if(sprint&&A.run)heroPlay('run',.18);
    else if(fwd<-.3&&A.back)heroPlay('back',.2);
    else heroPlay(cas?'casual':'walk',.2);
    const c=HERO.cur;
    if(c===A.walk||c===A.back||c===A.casual)c.timeScale=A.idle?clamp(sp/6.5,.6,1.6):(moving?(sp/6.5)*1.15*(fwd<-.3?-1:1):0);
    else if(c===A.run)c.timeScale=clamp(sp/10.5,.7,1.3);
    else if(c)c.timeScale=1;
  }
  heroUndo();HERO.mixer.update(dt);heroProcedural(dt,moving);
  // keep the gun in the right hand, pointed where the player aims
  if(HERO.hand&&!FP){HERO.hand.getWorldPosition(_hp);pl.worldToLocal(_hp);const cw=CARRY.w;gun.position.set(lerp(_hp.x*.6,_hp.x+CARRY.off.x,cw),lerp(_hp.y,_hp.y+CARRY.off.y,cw),lerp(Math.max(.25,_hp.z+.25),_hp.z+CARRY.off.z,cw));
    if(WA.aim>.01){gun.position.x=lerp(gun.position.x,_hp.x,WA.aim);gun.position.z=lerp(gun.position.z,_hp.z+.04,WA.aim);}placeGun(dt);gun.visible=!HERO.dead&&!player.swim&&!player.climb&&!(player.mantle>0);}
}
if(THREE.GLTFLoader){try{new THREE.GLTFLoader().load('models/hero.gltf.json',g=>{try{setupHero(g);}catch(e){console.warn('Hero model setup failed; using box survivor.',e);}},undefined,()=>{});}catch(e){}}

