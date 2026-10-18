/* ================= CAMP BUILDING =================
   Light a campfire anywhere, then build a camp around it: a lean-to that keeps you and the fire dry, a bedroll to sleep off the
   night, a cooking spit, a drying rack that turns meat into jerky, a storage chest, torches, log walls the infected have to chew
   through, and a camp workbench. Build mode shows a ghost: green where it fits, red where it doesn't. */
const BUILDS_CAMP={
  campfire:{name:'Campfire',cost:{wood:4,stone:3},desc:'Cook, craft, warm up. Rain puts it out unless it is under a lean-to.',r:.8,any:true},
  leanto:{name:'Lean-to shelter',cost:{wood:8,cloth:3},desc:'Keeps you and a fire under it dry. Counts as shelter for warmth.',r:1.4},
  bedroll:{name:'Bedroll',cost:{cloth:4,hide:2},desc:'Sleep through the night if no infected are hunting you, or rest an hour by day.',r:.7},
  spit:{name:'Cooking spit',cost:{wood:3,stone:2},desc:'Cooking at this camp gives an extra ration.',r:.7},
  rack:{name:'Drying rack',cost:{wood:4,cloth:1},desc:'Hang raw meat: it turns into jerky (food) by itself, no fire needed.',r:.8},
  chest:{name:'Storage chest',cost:{wood:8,scrap:6},desc:'Stash materials here so you can carry more home.',r:.7},
  torch:{name:'Torch post',cost:{wood:1,cloth:1},desc:'Lights the camp at night and keeps wolves off. Burns 6 minutes.',r:.3},
  logwall:{name:'Log wall',cost:{wood:6},desc:'A 3 m wall section. The infected have to batter through it (400 HP).',r:1.6,wall:1},
  campbench:{name:'Camp workbench',cost:{wood:10,scrap:20,parts:2},desc:'Workbench recipes at this camp, away from the farmstead.',r:.9},
};
const BUILD_ORDER=['campfire','leanto','bedroll','spit','rack','chest','torch','logwall','campbench'];
const campCost=k=>{const c={},m=1-.15*PERK('campcraft');for(const [a,b] of Object.entries(BUILDS_CAMP[k].cost))c[a]=Math.max(1,Math.round(b*m));return c;};
function nearFire(x,z,r){return PLACED.find(p=>p.type==='campfire'&&Math.hypot(p.x-x,p.z-z)<(r||12));}
// meshes for every placeable (also used for the build ghost)
function structureMesh(type,g){
  const wd=TM('wood',1,1,0x6a4e34,0xb09878),cl=M(0x8a7a5a),st=M(0x8a867a);
  if(type==='campfire'){for(let i=0;i<8;i++){const a=i/8*6.28;g.add(mk(BOX(.28,.2,.28),st,Math.cos(a)*.6,.1,Math.sin(a)*.6));}
    for(const a of [0,1.05,2.1]){const l=mki(CYL(.08,.08,1,6),M(0x5a3a22),0,.15,0,.03);l.rotation.z=Math.PI/2;l.rotation.y=a;g.add(l);}}
  else if(type==='snare'){g.add(mk(BOX(.05,.5,.05),M(0x6a4e34),0,.25,0));g.add(mk(new THREE.TorusGeometry(.18,.015,4,12),M(0xb8a888),0,.18,.12));}
  else if(type==='spikes'){for(let i=0;i<9;i++)g.add(mk(new THREE.ConeGeometry(.06,.45,4),M(0x8a8a82),(i%3-1)*.35,.2,(Math.floor(i/3)-1)*.35));g.add(mk(BOX(1.1,.05,1.1),M(0x5a4430),0,.03,0));}
  else if(type==='beartrap'){const r=mk(new THREE.TorusGeometry(.32,.04,4,16),M(0x5a5a56),0,.05,0);r.rotation.x=Math.PI/2;g.add(r);for(let i=0;i<10;i++){const a=i/10*6.28;g.add(mk(new THREE.ConeGeometry(.03,.12,3),M(0x8a8a82),Math.cos(a)*.3,.1,Math.sin(a)*.3));}}
  else if(type==='barricade'){for(let i=0;i<4;i++)g.add(mki(BOX(2.4,.28,.14),wd,0,.3+i*.4,0,.04));for(const s of [-1,1])g.add(mki(BOX(.16,1.8,.16),wd,s*1,.9,.1,.04));}
  else if(type==='leanto'){for(const s of [-1,1]){g.add(mki(BOX(.12,1.9,.12),wd,s*1.3,.95,.9,.03));g.add(mki(BOX(.12,.5,.12),wd,s*1.3,.25,-.9,.03));}
    const roof=mki(BOX(2.9,.08,2.3),cl,0,1.2,0,.03);roof.rotation.x=.62;g.add(roof);g.add(mk(BOX(2.8,.06,.1),wd,0,1.9,.9));}
  else if(type==='bedroll'){g.add(mk(BOX(.8,.12,1.9),M(0x4a5a7a),0,.06,0));g.add(mk(CYL(.18,.18,.8,10),M(0x6a7a9a),0,.18,.85));g.children[1].rotation.z=Math.PI/2;g.add(mk(BOX(.7,.04,.8),M(0x3a4a6a),0,.13,-.35));}
  else if(type==='spit'){for(const s of [-1,1]){const a=mki(BOX(.07,1.1,.07),wd,s*.75,.5,0,.02);a.rotation.z=s*.25;g.add(a);const b=mki(BOX(.07,1.1,.07),wd,s*.75,.5,0,.02);b.rotation.z=-s*.25;b.rotation.y=Math.PI/2;g.add(b);}
    const bar=mk(CYL(.03,.03,1.8,6),M(0x5a5a56),0,.95,0);bar.rotation.z=Math.PI/2;g.add(bar);}
  else if(type==='rack'){for(const s of [-1,1])g.add(mki(BOX(.08,1.5,.08),wd,s*.8,.75,0,.02));for(const y of [.8,1.2,1.45]){const b=mk(BOX(1.7,.05,.05),wd,0,y,0);g.add(b);}}
  else if(type==='chest'){g.add(mki(BOX(1.1,.6,.65),wd,0,.3,0,.04));g.add(mk(BOX(1.14,.12,.69),M(0x5a3a22),0,.62,0));g.add(mk(BOX(.16,.16,.05),M(0xb89a4a),0,.45,.34));}
  else if(type==='torch'){g.add(mki(BOX(.1,1.7,.1),wd,0,.85,0,.03));g.add(mk(CYL(.1,.07,.22,6),M(0x3a2a1a),0,1.75,0));}
  else if(type==='logwall'){for(let i=0;i<5;i++){const l=mki(CYL(.2,.2,3,8),TM('bark',1,2,0x4a3a2a,0xffffff),0,.22+i*.4,0,.04);l.rotation.z=Math.PI/2;g.add(l);}for(const s of [-1,1])g.add(mki(BOX(.2,2.2,.2),wd,s*1.4,1.1,.25,.03));}
  else if(type==='campbench'){g.add(mki(BOX(1.8,.12,.8),wd,0,.95,0,.04));for(const [x,z] of [[-.8,-.3],[.8,-.3],[-.8,.3],[.8,.3]])g.add(mk(BOX(.1,.9,.1),wd,x,.45,z));g.add(mk(BOX(.4,.25,.3),M(0x5a5a56),-.4,1.13,0));g.add(mk(BOX(.08,.08,.5),M(0x8a8a82),.4,1.05,0));}
  return g;
}
function placeStructure(type,x,z,rot){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);structureMesh(type,g);const p={type,x,z,g,rot,t:0};
  const c=Math.cos(rot),s=Math.sin(rot),w=(lx,lz)=>({x:x+lx*c+lz*s,z:z-lx*s+lz*c});
  if(type==='campfire'){p.flame=mk(new THREE.ConeGeometry(.42,1,7),fireM,0,.6,0,false);g.add(p.flame);p.lit=true;p.fuel=300*(1+.5*PERK('campcraft'));p.ob=addOb({x,z,r:.7});}
  else if(type==='snare')p.next=rand(70,140);
  else if(type==='spikes')p.uses=4;
  else if(type==='beartrap')p.armed=true;
  else if(type==='barricade'){p.obs=[-.8,0,.8].map(o=>{const q=w(o,0);return addOb({x:q.x,z:q.z,r:.55,h:1.75});});p.hp=300;}
  else if(type==='logwall'){p.obs=[-1.2,-.4,.4,1.2].map(o=>{const q=w(o,0);return addOb({x:q.x,z:q.z,r:.5,h:2.6});});p.hp=400;p.max=400;}
  else if(type==='leanto'){p.obs=[[-1.3,.9],[1.3,.9]].map(([a,b])=>{const q=w(a,b);return addOb({x:q.x,z:q.z,r:.18});});}
  else if(type==='chest'){p.ob=addOb({x,z,r:.6,h:.62});p.loot=[];}
  else if(type==='campbench'){p.ob=addOb({x,z,r:.85,h:1});}
  else if(type==='torch'){p.flame=mk(new THREE.ConeGeometry(.12,.35,6),fireM,0,2,0,false);g.add(p.flame);p.fuel=360;p.lit=true;}
  else if(type==='rack'){p.meat=0;p.dry=0;}
  else if(type==='spit')p.ob=null;
  PLACED.push(p);Sound.play('build',1,x,z);return p;
}
// items placed straight from the quick slot (campfire kits, snares, traps, barricades)
function placeItem(k){
  if(player.lvl||player.jy>.3){toast('Find level ground to set that down.');return false;}
  const x=player.x+Math.sin(player.yaw)*1.8,z=player.z+Math.cos(player.yaw)*1.8;
  if(!spotFree(x,z,BUILDS_CAMP[k]?BUILDS_CAMP[k].r:.6)){toast('No room there.');return false;}
  placeStructure(k,x,z,player.yaw);if(k==='campfire')toast('Campfire lit. Press B here to build a camp around it.','good');return true;
}
function spotFree(x,z,r){if(depthAt(x,z)>-.1)return false;let ok=true;nearObs(x,z,r+.6,o=>{if(Math.hypot(o.x-x,o.z-z)<o.r+r*.8)ok=false;});
  for(const p of PLACED)if(Math.hypot(p.x-x,p.z-z)<r+.5&&p.type!=='torch')ok=false;return ok;}
// ---------- build mode ----------
const BM={on:false,type:null,ghost:null,rot:0,ok:false,x:0,z:0};
const ghostOK=new THREE.MeshBasicMaterial({color:0x7fe07f,transparent:true,opacity:.42,depthWrite:false}),ghostBad=new THREE.MeshBasicMaterial({color:0xe05a4a,transparent:true,opacity:.42,depthWrite:false});
function startBuild(type){if(!BUILDS_CAMP[type])return;closePanel();endBuild();BM.on=true;BM.type=type;BM.rot=player.yaw;
  const g=new THREE.Group();structureMesh(type,g);g.traverse(o=>{if(o.isMesh){if(o.material===INK||inkHulls.has(o)){o.visible=false;}else o.material=ghostOK;}});scene.add(g);BM.ghost=g;
  toast(pad.active?'RT to build · LB / RB to turn · B to cancel':'Click to build · R or the wheel to turn · right-click or Esc to cancel');}
function endBuild(){if(BM.ghost){scene.remove(BM.ghost);BM.ghost=null;}BM.on=false;BM.type=null;}
function updateBuild(dt){if(!BM.on)return;const B=BUILDS_CAMP[BM.type];
  const d=clamp(Math.hypot(aim.x-player.x,aim.z-player.z),2,6),x=player.x+Math.sin(player.yaw)*d,z=player.z+Math.cos(player.yaw)*d;BM.x=x;BM.z=z;
  const inCamp=B.any||inYard(x,z)||nearFire(x,z,12),fits=!player.lvl&&spotFree(x,z,B.r)&&!(inYard(x,z)&&B.wall&&base.wallLv>0)&&!nearHomeFoot(x,z,B.r),afford=afford2(campCost(BM.type));
  BM.ok=inCamp&&fits&&afford;BM.why=!afford?'Missing materials':!inCamp?'Build within 12 m of a campfire':!fits?'No room here':'';
  BM.ghost.position.set(x,0,z);BM.ghost.rotation.y=BM.rot;const m=BM.ok?ghostOK:ghostBad;BM.ghost.traverse(o=>{if(o.isMesh&&o.visible)o.material=m;});
  $('prompt').innerHTML=`<span>${BUILDS_CAMP[BM.type].name}: ${BM.ok?`${pad.active?'RT':'click'} to build`:BM.why}</span><span>${costHTML2(campCost(BM.type))}</span>`;$('prompt').hidden=false;promptState='build';
}
function confirmBuild(){if(!BM.on)return;if(!BM.ok){toast(BM.why||"Can't build there",'bad');Sound.play('empty');return;}
  const k=BM.type;pay2(campCost(k));placeStructure(k,BM.x,BM.z,BM.rot);gainXP(6);jobProg('craft',1);
  if(k==='campfire')toast('Campfire lit. Keep building around it.','good');
  if(!afford2(campCost(k))||k==='campfire'||k==='campbench'||k==='bedroll')endBuild();}
function campHTML(){return BUILD_ORDER.map(k=>{const B=BUILDS_CAMP[k],c=campCost(k),ok=afford2(c);
  return`<article class="card"><header><h3>${B.name}</h3><span class="wtag st-fire">${B.any?'Anywhere':'Near a campfire'}</span></header><p class="now">${B.desc}</p><footer>${costHTML2(c)}<button data-build="${k}" ${ok?'':'disabled'}>${ok?'Build':'Missing materials'}</button></footer></article>`;}).join('');}
// ---------- camp life ----------
function campAt(x,z){return inYard(x,z)?{base:true}:nearFire(x,z,10);}
const underLeanto=(x,z)=>PLACED.some(p=>p.type==='leanto'&&Math.hypot(p.x-x,p.z-z)<2.1);
function sleep(p){
  const threat=zombies.some(z=>!z.dying&&z.aware&&Math.hypot(z.x-player.x,z.z-player.z)<40)||animals.some(a=>a.type==='wolf'&&a.state==='chase');
  if(threat){toast("You can't sleep with them this close.",'bad');return;}
  if(!(campAt(p.x,p.z)&&(inYard(p.x,p.z)||nearFire(p.x,p.z,8)&&nearFire(p.x,p.z,8).lit))){toast('Sleep next to a lit campfire, or at home.','bad');return;}
  if(S.sleeping)return;const night=S.phase==='night';
  if(!night&&(S.time||0)<(S.restT||0)){toast(`You can't rest again yet (${Math.ceil(S.restT-S.time)} s).`);return;}
  S.sleeping=true;$('fadeOut').classList.add('on');Sound.play('dawn',.5);
  setTimeout(()=>{S.sleeping=false;$('fadeOut').classList.remove('on');if(!player.alive||!S.running||S.over)return;if(p.bed){player.hp=player.maxHp;player.st=100;}
    if(night){S.clock=CYCLE-1;S.queue.length=0;}else{S.clock=Math.max(S.clock,Math.min(DAY_LEN-20,S.clock+DAY_LEN/14));S.restT=(S.time||0)+90;}
    player.hp=Math.min(player.maxHp,player.hp+(night?player.maxHp:30));player.st=100;player.warm=100;player.tired=0;player.winded=false;
    toast(night?'You sleep until first light. Fully rested.':'You rest an hour. +30 HP.','good');},700);
}
function useCamp(p){
  if(p.type==='bedroll'){sleep(p);return true;}
  if(p.type==='rack'){if(player.meat>0){p.meat+=player.meat;toast(`Hung ${player.meat} raw meat to dry`);player.meat=0;}else if(p.jerky){player.food=(player.food||0)+p.jerky;toast(`Took ${p.jerky} jerky`,'good');p.jerky=0;}else toast('Nothing drying. Bring raw meat.');Sound.play('pick');return true;}
  if(p.type==='chest'){openLoot(p,'Storage chest');return true;}
  if(p.type==='torch'){if(!p.lit&&player.cloth>0){player.cloth--;p.lit=true;p.fuel=360;p.flame.visible=true;toast('Torch relit (1 cloth)');}else toast(p.lit?'Torch burning':'Need 1 cloth to relight the torch');return true;}
  if(p.type==='logwall'){if(p.hp<p.max&&player.wood>=2){player.wood-=2;p.hp=Math.min(p.max,p.hp+150);toast('Wall shored up (+150, 2 wood)');Sound.play('build');}else if(p.hp>=p.max)toast(`Log wall: ${p.hp}/${p.max}`);else toast('Need 2 wood to repair');return true;}
  if(p.type==='campbench'){openCraft();return true;}
  if(p.type==='spit'||p.type==='leanto'){toast(BUILDS_CAMP[p.type].desc);return true;}
  return false;
}
const torchLights=[0,1].map(()=>{const l=new THREE.PointLight(0xffa04a,0,12,1.8);scene.add(l);return l;});
let zWallT=0;
function updateCamp(dt){
  updateBuild(dt);
  const torches=[];
  for(const p of PLACED){
    if(p.type==='torch'&&p.lit){p.fuel-=dt*(underLeanto(p.x,p.z)?1:1+W.rain*1.5);const f=.85+Math.sin(performance.now()/80+p.x)*.15;p.flame.scale.set(f,1+(1-f)*2,f);if(Math.random()<dt*2)burst(p.x,2.1,p.z,1,'spark',1);
      if(p.fuel<=0){p.lit=false;p.flame.visible=false;}else torches.push(p);
      for(const a of animals)if(a.type==='wolf'&&!a.dead&&a.state==='chase'&&Math.hypot(a.x-p.x,a.z-p.z)<7){a.state='flee';a.t=5;const l=Math.hypot(a.x-p.x,a.z-p.z)||1;a.fx=(a.x-p.x)/l;a.fz=(a.z-p.z)/l;}}
    if(p.type==='rack'&&p.meat>0){p.dry+=dt*(W.rain>.4&&!underLeanto(p.x,p.z)?.3:1);if(p.dry>=45){p.dry=0;p.meat--;p.jerky=(p.jerky||0)+1;}}
    if((p.type==='logwall'||p.type==='barricade')&&p.hp<=0){burst(p.x,1,p.z,14,'debris',5);Sound.play('crash',.6,p.x,p.z);removePlaced(p);}
  }
  torches.sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  torchLights.forEach((l,i)=>{const t=torches[i];if(t&&Math.hypot(t.x-player.x,t.z-player.z)<45){l.intensity=lerp(.3,1.6,S.env);l.position.set(t.x,2.2+gH(t.x,t.z),t.z);}else l.intensity=0;});
  // the infected batter walls that stand between them and you
  zWallT-=dt;if(zWallT<=0){zWallT=.5;for(const zb of zombies){if(zb.dying||!zb.aware)continue;for(const p of PLACED){if(p.hp==null)continue;if(Math.hypot(zb.x-p.x,zb.z-p.z)<1.9){p.hp-=zb.def.wall*1.2;zb.atkCd=Math.max(zb.atkCd,.5);if(Math.random()<.4)Sound.play('thud',.6,p.x,p.z);break;}}}}
  const c=!inBase(player.x,player.z)&&nearFire(player.x,player.z,10);S.atCamp=!!c;
}
function stashAll(p){const keys=['wood','stone','hide','cloth','herbs','meat','seeds'];let n=0;
  for(const k of keys){const v=Math.floor(player[k]||0);if(v>0){const e=p.loot.find(q=>q.t==='res'&&q.k===k);if(e)e.n+=v;else p.loot.push({t:'res',k,n:v,rar:'common'});player[k]=0;n+=v;}}
  toast(n?`Stashed ${n} materials`:'Nothing to stash',n?'good':'');if(n)Sound.play('build');}
function clearCamp(){endBuild();}

// ---------- audio hookup: listener, ambience state, footsteps, heartbeat ----------
let stepPh=0,heartT=0;
function onAnyStreet(x,z){for(const P of TPLAN.values())if(Math.hypot(P.C.x-x,P.C.z-z)<200&&onTownStreet(P,x,z))return true;return false;}
function audioTick(dt){
  let fd=99,fx=0,fz=0;for(const p of PLACED)if((p.type==='campfire'||p.type==='torch')&&p.lit){const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<fd){fd=d;fx=p.x;fz=p.z;}}
  for(const f of FIRES){const d=Math.hypot(f.x-player.x,f.z-player.z);if(d<fd){fd=d;fx=f.x;fz=f.z;}}
  let hd=1e9,ha=0;for(const h of hordes){if(h.alive<=0)continue;const d=Math.hypot(h.cx-player.x,h.cz-player.z);if(d<hd){hd=d;ha=Math.atan2(h.cx-player.x,h.cz-player.z);}}
  let aware=0;for(const z of zombies)if(!z.dying&&z.aware&&Math.hypot(z.x-player.x,z.z-player.z)<35)aware++;for(const h of hordes)if(h.state==='hunt')aware+=3;
  const now=S.time||0,fight=(now-(S.lastShot||-99)<4||now-(S.lastHurt||-99)<5)&&aware>0?1:0;
  Sound.update(dt,{x:player.x,z:player.z,yaw:TP?camYaw:Math.PI,indoor:INDOOR>.5||(player.lvl>0),rain:W.rain,wind:W.wind,blizzard:W.type==='blizzard',storm:W.type==='storm'?1:0,night:S.env,season:S.season||0,temp:SEA.temp,
    fireD:fd,fireX:fx,fireZ:fz,hordeD:hd,hordeA:ha,danger:Math.min(1,aware/5+(S.phase==='night'?.15:0)),fight});
  heartT-=dt;if(player.alive&&player.hp<player.maxHp*.3&&heartT<=0){heartT=.45+player.hp/player.maxHp*1.6;Sound.play('heart',clamp(1-player.hp/(player.maxHp*.3),.3,1));}
}
function footstep(moving){const ph=Math.floor(player.walk/Math.PI);if(ph===stepPh)return;stepPh=ph;if(!moving||player.air||player.climb||player.mantle>0)return;
  const sf=player.swim?'water':ICE&&depthAt(player.x,player.z)>.05?'ice':SEA.blend.snowCover>.4&&INDOOR<.5?'snow':(INDOOR>.5||player.lvl||player.jy>.3)?'wood':(Math.abs(player.x)<5||Math.abs(player.z)<5||inBase(player.x,player.z)||onAnyStreet(player.x,player.z))?'road':depthAt(player.x,player.z)>-.05?'water':'grass';
  Sound.step(sf,player.sprinting?1:player.crouch?.3:.65);}

