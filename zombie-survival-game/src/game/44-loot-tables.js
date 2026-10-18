/* ================= LOOT =================
   Containers come in kinds that fit where they sit (kitchen cupboards, medicine cabinets, toolboxes, gun lockers, store
   shelves, landmark caches, military airdrops, zombie remains). Each roll has a rarity (common → legendary) nudged by luck,
   Perception and perks. Opening one shows what's inside; take it all with E (A), or pick. What you can't carry stays put. */
const RARS=['common','uncommon','rare','epic','legendary'],RAR_COL={common:'#c8c2b0',uncommon:'#7fcf5a',rare:'#5fa8d3',epic:'#b48cff',legendary:'#f2a516'};
const CONT={
  crate:{name:'Supply crate',col:0x6b5134,strap:0xd8cfb8},
  cupboard:{name:'Kitchen cupboard',col:0x8a6a48,strap:0xe8dcc0},
  medcab:{name:'Medicine cabinet',col:0xd8d4c8,strap:0xc23a2e},
  toolbox:{name:'Toolbox',col:0x9a2e24,strap:0x3a3a34},
  locker:{name:'Gun locker',col:0x3e4a3a,strap:0xe9c46a},
  shelf:{name:'Store shelf',col:0x5a6a7a,strap:0xd8d0b8},
  cache:{name:'Survivor cache',col:0x5a3a14,strap:0xf2a516},
  military:{name:'Military airdrop',col:0x4a5a3a,strap:0xd6432f},
  remains:{name:'Remains',col:0x3a2a22,strap:0x7a2a22},
};
const TRINKETS={
  rabbitfoot:{name:"Rabbit's foot",desc:'+15% chance of rarer finds',k:'luck',v:.15},
  dogtags:{name:'Dog tags',desc:'+12% XP',k:'xp',v:.12},
  compass:{name:'Brass compass',desc:'Map reveals 30% farther',k:'map',v:.3},
  watch:{name:"Grandpa's pocket watch",desc:'+25% stamina recovery',k:'stam',v:.25},
  medal:{name:'St. Christopher medal',desc:'-15% damage taken at night',k:'night',v:.15},
  bonecharm:{name:'Bone charm',desc:'+8% critical hit chance',k:'crit',v:.08},
  scarf:{name:'Wool scarf',desc:'Lose body heat 25% slower',k:'warm',v:.25},
  patch:{name:"Marksman's patch",desc:'+10% gun damage',k:'gun',v:.1},
  gloves:{name:"Lineman's gloves",desc:'+20% melee damage',k:'melee',v:.2},
  keyring:{name:'Janitor keyring',desc:'+1 find in every container',k:'extra',v:1},
};
const TK=k=>{let s=0;for(const id of player.trinkEq||[])if(TRINKETS[id]&&TRINKETS[id].k===k)s+=TRINKETS[id].v;return s;};
const trinkSlots=()=>2+PERK('trinketeer');
function toggleTrinket(id){const e=player.trinkEq||(player.trinkEq=[]);const i=e.indexOf(id);if(i>=0)e.splice(i,1);else if(e.length<trinkSlots())e.push(id);else{toast(`All ${trinkSlots()} trinket slots are full. Unequip one first.`);return;}Sound.play('ui');}
function trinketHTML(){const own=player.trinkets||[];if(!own.length)return'<p class="next">No trinkets yet. They turn up as epic and legendary finds: caches, lockers, airdrops and the biggest infected.</p>';
  return own.map(id=>{const t=TRINKETS[id],on=(player.trinkEq||[]).includes(id);return`<article class="perk ${on?'has':''}"><header><b>${t.name}</b></header><p>${t.desc}</p><button data-trink="${id}">${on?'Unequip':'Equip'}</button></article>`;}).join('')+`<p class="next">${(player.trinkEq||[]).length} of ${trinkSlots()} slots in use</p>`;}
/* rarity: an explicit table per tier, leaned on by the container's quality, how far into the run you are, luck
   (Perception, trinkets, perks) and a pity counter that grows with every container that gave nothing rare and resets
   when something does. Roughly, a plain crate on day one: 58% common, 27% uncommon, 11% rare, 3% epic, 0.6% legendary. */
const LOOTSTATE={pity:0,recent:[]};
function rarWeights(q){q=clamp(q+Math.min(.25,(S.wave||0)*.025),0,1.3);
  const luck=.15*ATTR('per')/10+TK('luck')+(PERK('treasure')?.1:0)+LOOTSTATE.pity;
  const W=[58-30*q,27+2*q,11+13*q,3+10*q,.6+3.5*q];for(let i=1;i<5;i++)W[i]*=1+luck*i*.55;if(PERK('treasure'))W[4]*=2;return W;}
function rollRar(q,floor){const W=rarWeights(q);let t=0;for(let i=(floor||0);i<5;i++)t+=W[i];let r=Math.random()*t,i=floor||0;
  for(;i<4;i++){r-=W[i];if(r<=0)break;}
  if(Math.random()<.08*PERK('lucky'))i=Math.min(4,i+1);return RARS[i];}
const ri=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
// what each rarity of find looks like, by category
const GEN={
  scrap:r=>({t:'res',k:'scrap',n:Math.round(ri(...{common:[6,12],uncommon:[10,18],rare:[16,28],epic:[26,44],legendary:[45,70]}[r])*(1+.2*PERK('scav')))}),
  parts:r=>({t:'res',k:'parts',n:{common:1,uncommon:1,rare:ri(1,2),epic:ri(2,4),legendary:ri(4,6)}[r]}),
  cloth:r=>({t:'res',k:'cloth',n:ri(1,2)+RARS.indexOf(r)}),
  food:r=>({t:'res',k:'food',n:1+Math.floor(RARS.indexOf(r)/2)}),
  seeds:r=>({t:'res',k:'seeds',n:ri(1,3)}),
  herbs:r=>({t:'res',k:'herbs',n:ri(1,2)+Math.floor(RARS.indexOf(r)/2)}),
  comp:r=>({t:'comp',k:pick(RARS.indexOf(r)>=2?['SPR','BAR','FUR','OPT','REC','CHM']:['SPR','BAR','FUR','CHM']),n:1+Math.floor(RARS.indexOf(r)/3)}),
  ammo:r=>{const am=ownedAmmo();return am.length?{t:'ammo',k:pick(am),n:RARS.indexOf(r)>=2?2:1}:{t:'res',k:'scrap',n:8};},
  med:r=>({t:'med',n:1}),bandage:r=>({t:'item',k:'bandage',n:ri(1,2)}),poultice:r=>({t:'item',k:'poultice',n:1}),
  gren:r=>({t:'gren',n:RARS.indexOf(r)>=3?2:1}),molotov:r=>({t:'item',k:'molotov',n:1}),pipebomb:r=>({t:'item',k:'pipebomb',n:1}),
  repairkit:r=>({t:'item',k:'repairkit',n:1}),sewingkit:r=>({t:'item',k:'sewingkit',n:1}),
  weapon:r=>({t:'weapon',I:rollWeapon({common:'common',uncommon:'common',rare:'rare',epic:'epic',legendary:'drop'}[r])}),
  bp:r=>({t:'bp'}),
  trinket:r=>{const own=new Set(player.trinkets||[]),pool=Object.keys(TRINKETS).filter(k=>!own.has(k));return pool.length?{t:'trinket',id:pick(pool)}:{t:'res',k:'scrap',n:40};},
};
const TABLES={
  crate:[['scrap',3.5],['parts',2],['ammo',3],['cloth',2],['comp',2.5],['food',1.5],['seeds',1],['bandage',1],['med',.8],['gren',.5],['weapon',.7],['repairkit',.5]],
  cupboard:[['food',5],['cloth',3],['seeds',2],['scrap',2],['herbs',1.2],['bandage',1],['molotov',.3],['sewingkit',.4],['comp',.6]],
  medcab:[['bandage',4],['med',2.5],['herbs',3],['poultice',2],['cloth',1.5],['comp',.8],['scrap',.6]],
  toolbox:[['scrap',4],['parts',3],['comp',4],['repairkit',1.5],['sewingkit',.6],['ammo',.8],['pipebomb',.3]],
  locker:[['ammo',5],['weapon',2.2],['gren',1.2],['comp',2],['repairkit',1],['parts',1],['trinket',.25]],
  shelf:[['food',4],['cloth',3],['ammo',1.5],['bandage',1.5],['comp',1.5],['scrap',2],['seeds',1],['molotov',.4]],
  cache:[['weapon',2.5],['ammo',2],['med',1.5],['parts',2],['comp',2],['bp',1.2],['trinket',.9],['gren',1],['repairkit',1]],
  military:[['ammo',4],['gren',2.5],['med',2],['weapon',2.5],['parts',2],['bp',.8],['trinket',.5],['pipebomb',.8],['repairkit',1]],
  remains:[['scrap',3],['cloth',2],['ammo',1.5],['comp',1.5],['parts',.8],['trinket',.6],['weapon',.6],['bandage',1]],
};
const QUAL={common:0,rare:.35,epic:.7,relic:1,drop:.8};
// which container fits the building a crate spawns in
function kindFor(k){if(!k)return'crate';if(k==='car')return Math.random()<.6?'toolbox':'crate';if(k==='store')return Math.random()<.7?'shelf':'cupboard';if(k==='grocery')return Math.random()<.8?'shelf':'cupboard';
  if(k==='supercenter'){const r=Math.random();return r<.45?'shelf':r<.6?'medcab':r<.75?'toolbox':r<.88?'locker':'cupboard';}
  if(k==='gas'||k==='garage'||k==='depot')return Math.random()<.75?'toolbox':'locker';if(k==='church')return'cupboard';
  const r=Math.random();return r<.5?'cupboard':r<.75?'medcab':r<.85?'locker':r<.93?'toolbox':'crate';}
/* what a container holds leans toward what you need: low ammo for the guns you carry, wounded with no medkit, an empty
   larder. What you're full on, and what you've been finding a lot of lately, turns up less. Farms run to seeds, food and
   tools, towns to medicine and ammunition, the woods to herbs; winter trades food for cloth. */
const BIOME_LOOT={farm:{seeds:1.9,food:1.3,comp:1.2,repairkit:1.2,ammo:.85},town:{med:1.4,bandage:1.3,poultice:1.2,ammo:1.15,cloth:1.2,seeds:.6},forest:{herbs:1.7,food:.8,weapon:.9,cloth:.8}};
function lootWeight(cat,w,biome){
  const RES={scrap:'scrap',parts:'parts',cloth:'cloth',food:'food',seeds:'seeds',herbs:'herbs'};
  if(cat==='ammo'){const am=ownedAmmo();if(!am.length)w*=.3;else{const low=Math.min(...am.map(k=>(ammo[k]||0)/(AMMO[k].pack*4)));w*=low<.25?2.6:low<.6?1.6:low>2?.5:1;}}
  if(cat==='med'){w*=player.med>=5?.15:player.med===0||player.hp<player.maxHp*.5?2:1;}
  if(cat==='bandage'||cat==='poultice'){if(player.hp<player.maxHp*.5)w*=1.6;}
  if(cat==='food'&&(player.food||0)<2)w*=1.7;
  if(RES[cat]&&cat!=='scrap'&&cat!=='parts'&&(player[cat]||0)>=capOf(cat))w*=.25;
  if(cat==='weapon')w*=Object.keys(LO).length<3?1.5:1;
  if(cat==='trinket'){const own=new Set(player.trinkets||[]);if(Object.keys(TRINKETS).every(k=>own.has(k)))w=0;}
  const B=BIOME_LOOT[biome];if(B&&B[cat])w*=B[cat];
  if(S.season===3){if(cat==='food')w*=.7;if(cat==='herbs')w*=.45;if(cat==='cloth')w*=1.5;}
  let seen=0;for(const c of LOOTSTATE.recent)if(c===cat)seen++;w*=Math.pow(.8,seen);
  return w;}
function rollLoot(kind,rar,x,z){
  const biome=x!=null?bioC(Math.floor(x/CH),Math.floor(z/CH)):null;
  const T0=TABLES[kind]||TABLES.crate,T=T0.map(([k,w])=>[k,lootWeight(k,w,biome)]),q=QUAL[rar]||0,n=ri(...{common:[2,3],rare:[3,5],epic:[5,6],relic:[5,7],drop:[6,7]}[rar]||[2,3])+(Math.random()<.3*PERK('keeneye')?1:0)+TK('extra');
  const out=[];let tw=0;for(const [,w] of T)tw+=w;
  for(let i=0;i<n;i++){let r=Math.random()*tw,cat='scrap';for(const [k,w] of T){r-=w;if(r<=0){cat=k;break;}}
    const F={common:0,rare:1,epic:2,relic:3,drop:2}[rar]||0,ra=rollRar(q,i===0?F:Math.max(0,F-1)),e=GEN[cat](ra);e.rar=cat==='trinket'?(Math.random()<.4?'legendary':'epic'):cat==='bp'?'epic':ra;
    LOOTSTATE.recent.push(cat);if(LOOTSTATE.recent.length>14)LOOTSTATE.recent.shift();
    const same=out.find(o=>o.t===e.t&&o.k&&o.k===e.k);if(same&&e.n){same.n+=e.n;if(RARS.indexOf(e.rar)>RARS.indexOf(same.rar))same.rar=e.rar;}else out.push(e);}
  // the pity counter: a dry spell raises the odds until something rare turns up
  if(out.some(o=>RARS.indexOf(o.rar)>=2))LOOTSTATE.pity=0;else LOOTSTATE.pity=Math.min(.9,LOOTSTATE.pity+.07);
  if(rar==='relic'&&!out.some(o=>o.t==='trinket'))out.push(Object.assign(GEN.trinket(),{rar:'legendary'}));
  out.sort((a,b)=>RARS.indexOf(b.rar)-RARS.indexOf(a.rar));return out;
}
function lootLabel(e){
  switch(e.t){case 'res':return`${e.n} ${e.k==='parts'&&e.n===1?'part':e.k==='meat'?'raw meat':e.k}`;case 'comp':return`${e.n} ${compN(e.k,e.n).toLowerCase()}`;
    case 'ammo':return`${AMMO[e.k].name} ammo ×${AMMO[e.k].pack*e.n}`;case 'med':return'Medkit';case 'gren':return`${e.n} frag grenade${e.n>1?'s':''}`;
    case 'item':return`${e.n} ${ITEMS[e.k].name}`;case 'weapon':{const w=wstat(e.I);return w.name;}case 'trinket':return`Trinket: ${TRINKETS[e.id].name}`;case 'bp':return'Blueprint';}return'?';}
// give one entry; returns true when fully taken
function takeEntry(e){
  if(e.t==='res'){const room=e.k==='scrap'||e.k==='parts'?1e9:capOf(e.k)-(player[e.k]||0);const n=Math.min(e.n,Math.max(0,room));player[e.k]=(player[e.k]||0)+n;e.n-=n;return e.n<=0;}
  if(e.t==='comp'){comp[e.k]=(comp[e.k]||0)+e.n;return true;}
  if(e.t==='ammo'){grantAmmo(e.k,e.n);return true;}
  if(e.t==='med'){if(player.med>=5)return false;player.med++;return true;}
  if(e.t==='gren'){const n=Math.min(e.n,6-player.gren);player.gren+=n;e.n-=n;return e.n<=0;}
  if(e.t==='item'){const room=capOf(e.k)-(player.items[e.k]||0);const n=Math.min(e.n,Math.max(0,room));player.items[e.k]=(player.items[e.k]||0)+n;e.n-=n;return e.n<=0;}
  if(e.t==='weapon'){toast(acquire(e.I),'epic');refreshSlots();return true;}
  if(e.t==='trinket'){if((player.trinkets||[]).includes(e.id)){player.scrap+=40;toast(`Duplicate ${TRINKETS[e.id].name} broken down for 40 scrap`);return true;}(player.trinkets||(player.trinkets=[])).push(e.id);if((player.trinkEq||[]).length<trinkSlots())(player.trinkEq||(player.trinkEq=[])).push(e.id);toast(`Trinket: ${TRINKETS[e.id].name}. ${TRINKETS[e.id].desc}.`,'epic');return true;}
  if(e.t==='bp'){learnBP('found');return true;}
  return true;}
let LOOT=null;
function openLoot(src,title){LOOT={src,title};renderLoot();$('lootWin').hidden=false;Sound.play(src.loot.some(e=>RARS.indexOf(e.rar)>=3)?'epic':'crate');}
function closeLoot(){LOOT=null;$('lootWin').hidden=true;}
function renderLoot(){if(!LOOT)return;const L=LOOT.src.loot;if(LOOT.src.inner)crateContents(LOOT.src);
  $('lootTitle').textContent=LOOT.title;
  $('lootList').innerHTML=L.length?L.map((e,i)=>`<li data-li="${i}" style="--rc:${RAR_COL[e.rar]}"><i></i><span>${lootLabel(e)}</span><small>${e.rar}</small></li>`).join(''):'<li class="empty">Empty</li>';
  $('lootTake').innerHTML=`${glyph('use')}Take all`;$('lootStash').hidden=LOOT.src.type!=='chest';}
function lootTake(i){if(!LOOT)return;const L=LOOT.src.loot,idx=i==null?[...L.keys()]:[i],taken=[],left=[];
  for(const j of idx){const e=L[j];if(!e)continue;const lbl=lootLabel(e);if(takeEntry(e)){taken.push(j);}else left.push(lbl);}
  for(const j of taken.sort((a,b)=>b-a))L.splice(j,1);
  if(taken.length)Sound.play('pick');if(left.length)toast(`No room for: ${left.join(', ')}`,'bad');
  updateHUD();updateQuickHUD();if(!L.length&&LOOT.src.type!=='chest'){closeLoot();}else renderLoot();}
$('lootWin').addEventListener('click',e=>{const li=e.target.closest('[data-li]');if(li){lootTake(+li.dataset.li);return;}if(e.target.closest('#lootTake'))lootTake();if(e.target.closest('#lootClose'))closeLoot();if(e.target.closest('#lootStash')&&LOOT){stashAll(LOOT.src);renderLoot();}});
function updateLootWin(){if(!LOOT)return;const s=LOOT.src;if(Math.hypot(s.x-player.x,s.z-player.z)>3.4||!player.alive)closeLoot();}
// zombies sometimes leave something on the body: a small bag for walkers, a real stash on brutes and the Abomination
function zombieDrop(z){const ch=z.type==='boss'?1:z.type==='brute'?.55:z.type==='spitter'||z.type==='boomer'?.12:.05;if(Math.random()>ch)return;
  const c=spawnCrate(z.x+rand(-.5,.5),z.z+rand(-.5,.5),z.type==='boss'?'relic':z.type==='brute'?'epic':'common','remains');c.chunk=chunks.get(Math.floor(c.x/CH)+','+Math.floor(c.z/CH))||null;c.bag=true;}

