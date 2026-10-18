/* ================= CRAFTING =================
   Recipes need materials and a place to work: by hand anywhere, at a lit campfire, at the workbench in the house, or at a
   forge you build there. Some recipes are blueprints you have to find first (relic and landmark caches, epic crates, jobs, levels).
   Crafted things are consumables (quick slot: Z to use, X to switch), placeables (campfires, snares, traps, barricades),
   tools (better axe and pick), gear (armor, warm clothes, boots, binoculars) and ammunition. */
const ITEMS={
  food:{name:'Food',desc:'+25 HP, full stamina',icon:'🍲',use(){eatFood();return false;}},
  bandage:{name:'Bandage',desc:'Heals 25 HP over 5 s',icon:'🩹',use(){addRegen(25,5*(1-.25*PERK('medic')));toast('Bandaged up','good');return true;}},
  repairkit:{name:'Repair kit',desc:'Restores 50% durability to the weapon in your hands',icon:'🔧',use(){const I=curW();if(!I||wdur(I)>=100){toast('Nothing to repair');return false;}I.dur=Math.min(100,wdur(I)+50);Sound.play('reload');toast(`${wstat(I).name} repaired to ${Math.round(I.dur)}%`,'good');return true;}},
  sewingkit:{name:'Sewing kit',desc:'Mends 60% of your armor',icon:'🧵',use(){if(!player.armor||player.armorDur>=100){toast('No armor to mend');return false;}player.armorDur=Math.min(100,player.armorDur+60);player.armorMsg=0;Sound.play('build');toast(`Armor mended to ${Math.round(player.armorDur)}%`,'good');return true;}},
  poultice:{name:'Herbal poultice',desc:'Heals 45 HP over 10 s, cures food poisoning',icon:'🌿',use(){addRegen(45,10);player.sick=0;toast('Poultice applied','good');return true;}},
  stew:{name:'Hearty stew',desc:'+50 HP, full stamina, warms you through',icon:'🥣',use(){player.hp=Math.min(player.maxHp,player.hp+50);player.st=100;player.warm=Math.min(100,(player.warm||100)+45);player.warmBuff=120;Sound.play('heal');toast('Hot stew: +50 HP and warm for two minutes','good');return true;}},
  molotov:{name:'Molotov',desc:'Thrown fire: burns everything in the splash',icon:'🔥',use(){return throwItem('molotov');}},
  pipebomb:{name:'Pipe bomb',desc:'Heavy blast, big radius',icon:'💣',use(){return throwItem('pipebomb');}},
  noisemaker:{name:'Noisemaker',desc:'Thrown rattler: pulls the infected to it for 10 s',icon:'🔔',use(){return throwItem('noise');}},
  campfire:{name:'Campfire',desc:'Place: cook, warm up, keeps wolves off. Rain puts it out.',icon:'🏕',place:true},
  snare:{name:'Rabbit snare',desc:'Place: catches small game while you are away',icon:'🪤',place:true},
  spikes:{name:'Spike trap',desc:'Place: shreds the legs of anything that walks over it (4 uses)',icon:'⚔',place:true},
  beartrap:{name:'Bear trap',desc:'Place: 160 damage and pins the victim. Re-arm with E.',icon:'⛓',place:true},
  barricade:{name:'Barricade',desc:'Place: a solid wall section to block a doorway or path',icon:'🧱',place:true},
};
const QUICK=['food','bandage','poultice','stew','repairkit','sewingkit','molotov','pipebomb','noisemaker','campfire','snare','spikes','beartrap','barricade'];
const STATIONS={hand:'Anywhere',fire:'Campfire',bench:'Workbench',forge:'Forge'};
// gear and tools are one-off upgrades
const GEAR={
  jacket:{name:'Hide jacket',slot:'body',armor:1,warm:.2,desc:'10% less damage, a little warmth'},
  padded:{name:'Padded armor',slot:'body',armor:2,warm:.25,desc:'20% less damage, warm'},
  plate:{name:'Plate carrier',slot:'body',armor:3,warm:.15,desc:'30% less damage'},
  coat:{name:'Winter coat',slot:'coat',warm:.45,desc:'Big cold resistance'},
  boots:{name:'Trail boots',slot:'feet',desc:'No slowdown in snow, quieter footsteps'},
  binoc:{name:'Binoculars',slot:'kit',desc:'Map reveals 40% farther'},
  pack:{name:'Hiking pack',slot:'back',desc:'+50% carry limits'},
};
const RECIPES=[
  // survival
  {id:'cook',cat:'Survival',name:'Cooked meat',out:{food:1},cost:{meat:1},st:'fire',cap:()=>player.food<capOf('food'),desc:'Turn raw meat into food. Raw meat can make you sick.'},
  {id:'cook3',cat:'Survival',name:'Smoked meat ×3',out:{food:4},cost:{meat:3,wood:1},st:'fire',cap:()=>player.food+4<=capOf('food'),desc:'Batch-smoke three cuts: four rations.'},
  {id:'bandage',cat:'Survival',name:'Bandage',item:'bandage',n:2,cost:{cloth:2},st:'hand',desc:ITEMS.bandage.desc},
  {id:'poultice',cat:'Survival',name:'Herbal poultice',item:'poultice',cost:{herbs:2,cloth:1},st:'hand',desc:ITEMS.poultice.desc},
  {id:'stew',cat:'Survival',name:'Hearty stew',item:'stew',cost:{meat:1,food:1,herbs:1},st:'fire',desc:ITEMS.stew.desc},
  {id:'repairkit',cat:'Survival',name:'Repair kit',item:'repairkit',cost:{scrap:14,parts:1,SPR:1},st:'bench',desc:ITEMS.repairkit.desc},
  {id:'sewingkit',cat:'Survival',name:'Sewing kit',item:'sewingkit',cost:{cloth:3,hide:1},st:'hand',desc:ITEMS.sewingkit.desc},
  {id:'medkit',cat:'Survival',name:'Medkit',out:{med:1},cost:{cloth:2,herbs:2,CHM:1,scrap:10},st:'bench',desc:'Restores 55 HP (B / H).',cap:()=>player.med<5},
  // tools
  {id:'axe1',cat:'Tools',name:'Stone hatchet',tool:['axeT',1],cost:{wood:2,stone:3,cloth:1},st:'hand',desc:'Chop trees 60% faster.'},
  {id:'axe2',cat:'Tools',name:'Steel felling axe',tool:['axeT',2],cost:{scrap:30,wood:2,parts:1},st:'forge',desc:'Chop trees 2.4× faster.',req:'axe1'},
  {id:'pick1',cat:'Tools',name:'Stone pick',tool:['pickT',1],cost:{wood:2,stone:4},st:'hand',desc:'Mine rocks 60% faster.'},
  {id:'pick2',cat:'Tools',name:'Steel pickaxe',tool:['pickT',2],cost:{scrap:30,wood:2,parts:1},st:'forge',desc:'Mine rocks 2.4× faster, more scrap from rock.',req:'pick1'},
  {id:'forge',cat:'Tools',name:'Build a forge',special:'forge',cost:{stone:14,scrap:30,parts:2},st:'bench',desc:'Unlocks forge recipes at the house.'},
  // gear
  {id:'jacket',cat:'Gear',name:'Hide jacket',gear:'jacket',cost:{hide:3,cloth:2},st:'bench',desc:GEAR.jacket.desc},
  {id:'padded',cat:'Gear',name:'Padded armor',gear:'padded',cost:{hide:5,cloth:4,scrap:20},st:'bench',desc:GEAR.padded.desc,req:'jacket'},
  {id:'plate',cat:'Gear',name:'Plate carrier',gear:'plate',cost:{scrap:60,parts:4,cloth:3,hide:2},st:'forge',desc:GEAR.plate.desc,bp:1,req:'padded'},
  {id:'coat',cat:'Gear',name:'Winter coat',gear:'coat',cost:{hide:4,cloth:4},st:'bench',desc:GEAR.coat.desc},
  {id:'boots',cat:'Gear',name:'Trail boots',gear:'boots',cost:{hide:2,cloth:1,scrap:6},st:'bench',desc:GEAR.boots.desc},
  {id:'pack',cat:'Gear',name:'Hiking pack',gear:'pack',cost:{hide:3,cloth:6,SPR:1},st:'bench',desc:'+50% carry limits for every material and item'},
  {id:'binoc',cat:'Gear',name:'Binoculars',gear:'binoc',cost:{OPT:2,scrap:12},st:'bench',desc:GEAR.binoc.desc,bp:1},
  // throwables
  {id:'molotov',cat:'Throwables',name:'Molotov',item:'molotov',cost:{cloth:1,CHM:1,scrap:2},st:'hand',desc:ITEMS.molotov.desc},
  {id:'noisemaker',cat:'Throwables',name:'Noisemaker',item:'noisemaker',cost:{SPR:1,scrap:5},st:'hand',desc:ITEMS.noisemaker.desc},
  {id:'pipebomb',cat:'Throwables',name:'Pipe bomb',item:'pipebomb',cost:{BAR:1,CHM:2,scrap:8},st:'bench',desc:ITEMS.pipebomb.desc,bp:1},
  {id:'frag',cat:'Throwables',name:'Frag grenade',out:{gren:1},cost:{scrap:25,CHM:1,parts:1},st:'forge',desc:'Standard frag (G / D-pad down).',cap:()=>player.gren<6},
  // camp and traps
  {id:'campfire',cat:'Camp & traps',name:'Campfire kit',item:'campfire',cost:{wood:4,stone:3},st:'hand',desc:ITEMS.campfire.desc},
  {id:'snare',cat:'Camp & traps',name:'Rabbit snare',item:'snare',cost:{wood:2,cloth:1},st:'hand',desc:ITEMS.snare.desc},
  {id:'spikes',cat:'Camp & traps',name:'Spike trap',item:'spikes',cost:{wood:4,scrap:6},st:'hand',desc:ITEMS.spikes.desc},
  {id:'beartrap',cat:'Camp & traps',name:'Bear trap',item:'beartrap',cost:{scrap:20,SPR:2},st:'bench',desc:ITEMS.beartrap.desc,bp:1},
  {id:'barricade',cat:'Camp & traps',name:'Barricade',item:'barricade',cost:{wood:6,scrap:6},st:'hand',desc:ITEMS.barricade.desc},
  // ammo
  ...Object.entries({'9mm':['hand',{scrap:8,CHM:1}],'45':['bench',{scrap:10,CHM:1}],'357':['bench',{scrap:10,CHM:1}],'12g':['bench',{scrap:10,CHM:1,cloth:1}],
    '556':['forge',{scrap:16,CHM:1}],'308':['forge',{scrap:16,CHM:1}],'40mm':['forge',{scrap:30,CHM:3,parts:1}],'bolt':['hand',{wood:2,scrap:3}]})
    .map(([k,[st,c]])=>({id:'ammo'+k,cat:'Ammo',name:`${AMMO[k].name} ×${AMMO[k].pack}`,ammo:k,cost:c,st,desc:`One pack of ${AMMO[k].name} rounds.`,bp:k==='40mm'?1:0})),
];
const CRAFT_CATS=['Survival','Tools','Gear','Throwables','Camp & traps','Ammo','Build camp'];
const BP=new Set();let craftCat='Survival';
const CRAFT_RES={cloth:'Cloth',herbs:'Herbs',meat:'Raw meat'};
function stationOK(st){if(st==='hand')return true;const home=inBase(player.x,player.z);
  if(st==='fire')return home||PLACED.some(p=>p.type==='campfire'&&p.lit&&Math.hypot(p.x-player.x,p.z-player.z)<4.5);
  if(st==='bench')return home||PLACED.some(p=>p.type==='campbench'&&Math.hypot(p.x-player.x,p.z-player.z)<4.5);return home&&base.forge;}
function recipeState(r){
  if(r.bp&&!BP.has(r.id))return{ok:false,why:'Blueprint needed'};
  if(r.req&&!crafted(r.req))return{ok:false,why:`Needs ${RECIPES.find(q=>q.id===r.req).name}`};
  if(r.gear&&player.gear[r.gear])return{ok:false,why:'Owned'};
  if(r.tool&&(player[r.tool[0]]||0)>=r.tool[1])return{ok:false,why:'Owned'};
  if(r.special==='forge'&&base.forge)return{ok:false,why:'Built'};
  if(r.cap&&!r.cap())return{ok:false,why:'Carrying the max'};
  if(r.item&&carried(r.item)+(r.n||1)>capOf(r.item))return{ok:false,why:'Pack full'};
  if(!stationOK(r.st))return{ok:false,why:`Needs a ${STATIONS[r.st].toLowerCase()}`};
  if(!afford2(r.cost))return{ok:false,why:'Missing materials'};
  return{ok:true};
}
const crafted=id=>{const r=RECIPES.find(q=>q.id===id);return r&&(r.gear?!!player.gear[r.gear]:r.tool?(player[r.tool[0]]||0)>=r.tool[1]:true);};
function craft(id){
  const r=RECIPES.find(q=>q.id===id);if(!r||!recipeState(r).ok)return;pay2(r.cost);
  if(Math.random()<.15*PERK('tinker')+.02*ATTR('int')){for(const [k,v] of Object.entries(r.cost)){if(k==='scrap'||k==='parts'||k in RES_KEYS)player[k]=(player[k]||0)+v;else comp[k]=(comp[k]||0)+v;}toast('Tinkerer: no materials used','rare');}
  if((id==='cook'||id==='cook3')&&(PLACED.some(p=>p.type==='spit'&&Math.hypot(p.x-player.x,p.z-player.z)<7)||HOME.lv>=3&&inHome(player.x,player.z))){player.food=(player.food||0)+1;toast(HOME.lv>=3&&inHome(player.x,player.z)?'The stove gives an extra ration':'The spit gives an extra ration','good');}
  if(r.item)player.items[r.item]=(player.items[r.item]||0)+(r.n||1);
  if(r.out)for(const [k,v] of Object.entries(r.out))player[k]=(player[k]||0)+v;
  if(r.ammo)grantAmmo(r.ammo,1);
  if(r.tool){player[r.tool[0]]=r.tool[1];player[r.tool[0]==='axeT'?'axeDur':'pickDur']=100;}
  if(r.gear){player.gear[r.gear]=true;applyGear();if(GEAR[r.gear].armor){player.armorDur=100;player.armorMsg=0;}}
  if(r.special==='forge'){base.forge=true;toast('Forge built. Steel tools, plate armor and rifle rounds unlocked.','epic');}
  Sound.play('build');gainXP(4);jobProg('craft',1);toast(`Crafted: ${r.name}`,'good');refreshSlots();
}
function applyGear(){const g=player.gear;player.armor=Math.max(g.plate?3:g.padded?2:g.jacket?1:0);player.insul=(g.coat?.45:0)+(g.plate?.15:g.padded?.25:g.jacket?.2:0);}
function learnBP(src){const pool=RECIPES.filter(r=>r.bp&&!BP.has(r.id));if(!pool.length)return false;const r=pick(pool);BP.add(r.id);
  setTimeout(()=>toast(`Blueprint learned${src?' ('+src+')':''}: ${r.name}. Craft it with ${pad.active?'Y away from the house':'I'}.`,'epic'),900);return true;}
function addRegen(n,t){player.regen=(player.regen||[]);player.regen.push({n,t,rate:n/t});Sound.play('heal');}
function updateRegen(dt){if(!player.regen||!player.regen.length)return;for(let i=player.regen.length-1;i>=0;i--){const r=player.regen[i];const d=Math.min(r.t,dt);r.t-=dt;player.hp=Math.min(player.maxHp,player.hp+r.rate*d);if(r.t<=0)player.regen.splice(i,1);}}
// ---- quick slot ----
function quickList(){return QUICK.filter(k=>k==='food'?(player.food||0)>0:(player.items[k]||0)>0);}
function cycleQuick(){const L=quickList();if(!L.length){toast('Nothing to use. Craft something (I).');return;}const i=L.indexOf(player.quick);player.quick=L[(i+1)%L.length];Sound.play('ui');updateQuickHUD();}
function useQuick(){const L=quickList();if(!L.includes(player.quick))player.quick=L[0];const k=player.quick;if(!k){toast('Quick slot is empty. Craft something (I).');return;}
  if(!player.alive||player.swim||player.climb)return;const it=ITEMS[k];
  if(ITEM_CD[k]&&k!=='food'&&cdLeft(k)>0){toast(`${it.name} ready in ${cdLeft(k).toFixed(1)} s`);return;}
  if(it.place){if(placeItem(k)){player.items[k]--;}}
  else if(k!=='food'&&ITEM_CD[k]&&it.use()){useCD(k);player.items[k]--;}
  else if(k==='food'||!ITEM_CD[k]){if(it.use()&&k!=='food')player.items[k]--;}
  updateQuickHUD();}
function updateQuickHUD(){const L=quickList();if(!L.includes(player.quick))player.quick=L[0]||null;const k=player.quick,el=$('quickSlot');
  if(!k){el.innerHTML=`<kbd>${pad.active?'▲':'Z'}</kbd>Quick slot <b>empty</b>`;return;}
  const n=k==='food'?player.food|0:player.items[k]|0;el.innerHTML=`<kbd>${pad.active?'▲':'Z'}</kbd>${ITEMS[k].name} <b>${n}</b> <small>${pad.active?'◀':'X'} switch</small>`;}
// ---- throwables ----
function throwItem(kind){if(!player.alive)return false;const dist=clamp(Math.hypot(aim.x-player.x,aim.z-player.z),3,16);WA.throwT=.45;Sound.play('throw');
  const tx=player.x+Math.sin(player.yaw)*dist*.85,tz=player.z+Math.cos(player.yaw)*dist*.85;
  if(kind==='molotov')lob('gren',player.x,1.8,player.z,tx,tz,15,{impact:true,molotov:true,dmg:0,radius:0});
  else if(kind==='pipebomb')lob('gren',player.x,1.8,player.z,tx,tz,14,{dmg:260,radius:7.5,fuse:2.2});
  else lob('gren',player.x,1.8,player.z,tx,tz,15,{noise:true,fuse:.9,dmg:0,radius:0});
  return true;}
const FIRES=[];
function addFirePatch(x,z,r,t,spread){FIRES.push({x,z,r,t,max:t,tick:0,spread:spread||0});burst(x,.5,z,14,'spark',6);Sound.play('boom',.35);makeNoise(x,z,30);}
function updateFires(dt){
  for(let i=FIRES.length-1;i>=0;i--){const f=FIRES[i];f.t-=dt*(1+W.rain*2.5+W.snow*1.5);f.tick-=dt;
    if(Math.random()<dt*20)burst(f.x+rand(-f.r,f.r)*.7,.3,f.z+rand(-f.r,f.r)*.7,1,'spark',3);if(Math.random()<dt*6)burst(f.x+rand(-1,1),.6,f.z+rand(-1,1),1,'smoke',1);
    if(f.tick<=0){f.tick=.25;
      for(const zb of zombies)if(!zb.dying&&Math.hypot(zb.x-f.x,zb.z-f.z)<f.r+zb.def.r){zb.burn=3;zb.burnD=14;zAlert(zb);}
      nearAgents(f.x,f.z,f.r+.5,a=>{if(!a.dying){a.burn=3;a.burnD=14;}});
      for(const an of animals)if(!an.dead&&Math.hypot(an.x-f.x,an.z-f.z)<f.r)hitAnimal(an,6,0,0);
      if(player.alive&&!playerHigh(1)&&Math.hypot(player.x-f.x,player.z-f.z)<f.r){hurtPlayer(4);}
      // dry weather and wind carry the fire downwind
      if(f.spread>0&&W.rain<.1&&W.snow<.1&&Math.random()<.18*(S.season===1||S.season===2?1.6:.6)){f.spread--;const a=W.wdir+rand(-.6,.6),d=f.r*1.3;addFirePatch(f.x+Math.cos(a)*d,f.z+Math.sin(a)*d,f.r*.85,f.max*.7,f.spread);}}
    if(f.t<=0)FIRES.splice(i,1);}
}
const NOISERS=[];
function updateNoisers(dt){for(let i=NOISERS.length-1;i>=0;i--){const n=NOISERS[i];n.t-=dt;n.p-=dt;if(n.p<=0){n.p=.6;Sound.play('clink',clamp(1-Math.hypot(n.x-player.x,n.z-player.z)/50,.15,1),n.x,n.z);
    if(!n.lure){n.lure={x:n.x,z:n.z,t:n.t+.2,snd:99,dmg:0,r:0,m:n.m,quiet:true};LURES.push(n.lure);}}
  if(n.t<=0){scene.remove(n.m);NOISERS.splice(i,1);}}}
function onThrownLand(p){
  if(p.molotov){addFirePatch(p.x,p.z,2.6,7,2);Sound.play('crash',.5);return true;}
  if(p.noise){const m=mk(CYL(.12,.12,.25,8),M(0xb8b4a8),p.x,.15,p.z);scene.add(m);NOISERS.push({x:p.x,z:p.z,t:10,p:0,m});toast('Noisemaker rattling','rare');return true;}
  return false;
}
// ---- placeables ----
const PLACED=[];const fireLight=new THREE.PointLight(0xff9a3a,0,16,1.6);scene.add(fireLight);
function removePlaced(p){scene.remove(p.g);if(p.ob)delOb(p.ob);if(p.obs)for(const o of p.obs)delOb(o);const i=PLACED.indexOf(p);if(i>=0)PLACED.splice(i,1);}
function nearestPlaced(){let best=null,bd=2.2;for(const p of PLACED){const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<bd&&(p.type!=='spikes')){bd=d;best=p;}}return best;}
function usePlaced(p){if(useCamp(p))return;
  if(p.type==='campfire'){if(!(player.wood>0)){toast('Need wood to feed the fire.');return;}player.wood--;p.fuel=Math.min(600,p.fuel+150);if(!p.lit){p.lit=true;p.flame.visible=true;toast('Fire relit');}else toast('Fire stoked');Sound.play('thud',.5);return;}
  if(p.type==='snare'){if(p.caught){p.caught=false;p.next=rand(80,160);const m=randi(1,2);player.meat=(player.meat||0)+m;floatText(p.x,1,p.z,`+${m} raw meat`);gainXP(8);if(p.rab){scene.remove(p.rab);p.rab=null;}jobProg('hunt',0);}else toast('Nothing in the snare yet.');return;}
  if(p.type==='beartrap'){if(!p.armed){p.armed=true;p.g.children[0].scale.setScalar(1);toast('Trap re-armed');Sound.play('clink');}return;}
  if(p.type==='barricade'){removePlaced(p);player.wood=(player.wood||0)+3;toast('Barricade taken down (+3 wood)');}
}
function updatePlaced(dt){
  let near=null,nd=30;
  for(const p of [...PLACED]){
    if(p.type==='campfire'){if(p.lit){p.fuel-=dt*(underLeanto(p.x,p.z)?1:1+W.rain*3+W.snow*1.5+(W.type==='storm'?3:0))/(1+.5*PERK('campcraft'));const f=.85+Math.sin(performance.now()/90+p.x)*.15;p.flame.scale.set(f,1+(1-f)*2,f);
        if(Math.random()<dt*4)burst(p.x,1,p.z,1,'spark',2);if(Math.random()<dt*2)burst(p.x,1.4,p.z,1,'smoke',1);
        if(p.fuel<=0||(W.rain>.75&&!underLeanto(p.x,p.z)&&Math.random()<dt*.04)){p.lit=false;p.flame.visible=false;burst(p.x,.8,p.z,8,'smoke',2);if(Math.hypot(p.x-player.x,p.z-player.z)<40)toast(p.fuel<=0?'Your campfire burned out':'The rain put your campfire out','bad');}
        const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<nd){nd=d;near=p;}
        for(const a of animals)if(a.type==='wolf'&&!a.dead&&a.state==='chase'&&Math.hypot(a.x-p.x,a.z-p.z)<9){a.state='flee';a.t=6;const l=Math.hypot(a.x-p.x,a.z-p.z)||1;a.fx=(a.x-p.x)/l;a.fz=(a.z-p.z)/l;}}}
    else if(p.type==='snare'&&!p.caught){p.next-=dt*(S.season===3?.5:1);if(p.next<=0){p.caught=true;p.rab=makeAnimal('rabbit').g;p.rab.position.set(.2,0,.1);p.rab.rotation.z=1.4;p.g.add(p.rab);}}
    else if(p.type==='spikes'||p.type==='beartrap'){if(p.type==='beartrap'&&!p.armed)continue;
      for(const zb of zombies){if(zb.dying||Math.hypot(zb.x-p.x,zb.z-p.z)>.85)continue;
        if(p.type==='spikes'){if(zb._spk&&performance.now()-zb._spk<900)continue;zb._spk=performance.now();damageZombie(zb,55,0,0);p.uses--;burst(p.x,.4,p.z,6,'blood',3);}
        else{damageZombie(zb,160,0,0);zb.pinT=4;p.armed=false;p.g.children[0].scale.setScalar(.7);Sound.play('clink');Sound.play('thud');burst(p.x,.4,p.z,8,'blood',3);}
        break;}
      if(p.armed!==false)nearAgents(p.x,p.z,.9,a=>{if(a.dying)return;if(p.type==='spikes'){if(a._spk&&performance.now()-a._spk<900)return;a._spk=performance.now();hitAgent(a,55,0,0,true);p.uses--;}else if(p.armed){hitAgent(a,160,0,0,true);p.armed=false;p.g.children[0].scale.setScalar(.7);}});
      if(p.type==='spikes'&&p.uses<=0){removePlaced(p);continue;}}
    else if(p.type==='barricade'&&p.hp<=0){burst(p.x,1,p.z,12,'debris',5);Sound.play('crash',.5);removePlaced(p);}
  }
  const night=S.env;fireLight.intensity=near?lerp(.5,2.2,night)*(.85+Math.random()*.15):0;if(near)fireLight.position.set(near.x,1.5+gH(near.x,near.z),near.z);
  S.nearFire=near&&nd<5;
}
function clearPlaced(){for(const p of [...PLACED])removePlaced(p);for(const n of NOISERS)scene.remove(n.m);NOISERS.length=0;FIRES.length=0;}
// ---- herbs: little flowering bushes in fields and woods, picked with E ----
const herbs=[];
function addHerb(x,z){
  if(CUR&&CUR.cut&&CUR.cut.has(cutKey(x,z)))return;
  const g=new THREE.Group();g.position.set(x,0,z);const lf=M(0x4e7a3a),fl=M(pick([0xb88ad8,0xf2f0e8,0xe8c84a]));
  for(let i=0;i<5;i++){const s=mk(new THREE.ConeGeometry(.12,.55,4),lf,rand(-.2,.2),.27,rand(-.2,.2));s.rotation.z=rand(-.3,.3);g.add(s);g.add(mk(new THREE.SphereGeometry(.07,5,4),fl,s.position.x,.58,s.position.z));}
  track(g);const h={x,z,g,ch:CUR};herbs.push(h);if(CUR)(CUR.herbs||(CUR.herbs=[])).push(h);
}
function nearestHerb(){let best=null,bd=1.6;for(const h of herbs){const d=Math.hypot(h.x-player.x,h.z-player.z);if(d<bd){bd=d;best=h;}}return best;}
function pickHerb(h){const n=randi(1,2)+(S.season===0?1:0);player.herbs=(player.herbs||0)+n;floatText(h.x,1,h.z,`+${n} herbs`);Sound.play('pick');
  scene.remove(h.g);herbs.splice(herbs.indexOf(h),1);const mem=h.ch&&chunkMem.get(h.ch.key);if(mem)(mem.cut||(mem.cut=new Set())).add(cutKey(h.x,h.z));gainXP(3);}
// ---- crafting screen (I) ----
function renderCraft(){
  const hd=$('crTabs');hd.innerHTML=CRAFT_CATS.map(c=>`<button data-cat="${c}" class="${c===craftCat?'on':''}">${c}</button>`).join('');
  const where=[inBase(player.x,player.z)?'Workbench'+(base.forge?' + forge':''):null,S.nearFire?'Campfire':null].filter(Boolean);
  $('crWhere').textContent=`Working at: ${where.length?where.join(', '):'by hand only'}${!base.forge?' · build a forge at the workbench for steel recipes':''}`;
  let h=craftCat==='Build camp'?campHTML():'';for(const r of RECIPES.filter(q=>q.cat===craftCat)){const s=recipeState(r),lock=r.bp&&!BP.has(r.id);
    h+=`<article class="card ${lock?'lock':''}"><header><h3>${lock?'??? ':''}${r.name}</h3><span class="wtag st-${r.st}">${STATIONS[r.st]}</span></header><p class="now">${lock?'Find this blueprint in relic caches, landmark caches, epic crates or job rewards.':r.desc}</p>
      ${r.item?`<p class="next">You have ${player.items[r.item]|0}</p>`:''}<footer>${lock?'':costHTML2(r.cost)}<button data-craft="${r.id}" ${s.ok?'':'disabled'}>${s.ok?'Craft':s.why}</button></footer></article>`;}
  $('crGrid').innerHTML=h;
  const mats=['scrap','parts','wood','stone','hide','cloth','herbs','meat','food'].map(k=>`<span><b>${(k==='scrap'||k==='parts'?player[k]:player[k]||0)|0}${CAP[k]?'/'+capOf(k):''}</b> ${k==='meat'?'raw meat':k}</span>`).join('')+
    Object.entries(COMP_NAME).map(([k,n])=>`<span><b>${comp[k]|0}</b> ${n.toLowerCase()}</span>`).join('');
  $('crMats').innerHTML=mats;
  $('crItems').innerHTML=QUICK.filter(k=>k!=='food'&&player.items[k]).map(k=>`<span><b>${player.items[k]}/${capOf(k)}</b> ${ITEMS[k].name}</span>`).join('')||'<span>No crafted items yet.</span>';
  $('crGear').innerHTML=Object.entries(GEAR).filter(([k])=>player.gear[k]).map(([k,g])=>`<span>${g.name}${g.armor?` (${Math.round(player.armorDur==null?100:player.armorDur)}%)`:''}</span>`).join('')+(player.axeT?`<span>${player.axeT>1?'Steel axe':'Stone hatchet'} (${Math.round(player.axeDur)}%)</span>`:'')+(player.pickT?`<span>${player.pickT>1?'Steel pickaxe':'Stone pick'} (${Math.round(player.pickDur)}%)</span>`:'')||'<span>Nothing yet.</span>';
  $('crBP').textContent=`${BP.size} of ${RECIPES.filter(r=>r.bp).length} blueprints found`;
}
$('craftScreen').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.cat){craftCat=b.dataset.cat;Sound.play('ui');renderCraft();}
  else if(b.dataset.craft){craft(b.dataset.craft);renderCraft();updateQuickHUD();}
  else if(b.dataset.build){startBuild(b.dataset.build);}
  else if(b.id==='crClose')closePanel();
  if(pad.active&&!padFocus)setPadFocus(document.querySelector('#craftScreen [data-craft]:not([disabled])')||$('crClose'));});
function resetCraft(){BP.clear();clearPlaced();for(const h of herbs)scene.remove(h.g);herbs.length=0;
  Object.assign(player,{cloth:2,herbs:0,meat:0,items:{bandage:1},gear:{},axeT:0,pickT:0,quick:'food',regen:[],sick:0,warm:100,warmBuff:0,insul:0});base.forge=false;applyGear();}

