/* ================= ITEM LIMITS: durability, carry limits, cooldowns =================
   Weapons wear with use (worn guns jam and hit softer, broken ones don't fire), tools wear out and break, armor tears.
   Repair kits fix the gun in your hands, sewing kits fix armor, the workbench fixes everything for scrap. Every material
   and item has a carry limit (raised by the hiking pack, Pack mule and Strength), and consumables have a use cooldown. */
const wdur=I=>I&&I.dur!=null?I.dur:100;
const WEAR={side:.22,rev:.35,smg:.1,shot:.45,ar:.14,hunt:.55,gl:.8,bow:.25,melee:.9};
function wearWeapon(I,w,mult){if(!I)return;const base=w.saw?.06:(WEAR[I.cls]||.3)*(I.sp?.6:1)*(1-.3*PERK('gunnut'));const before=wdur(I);
  I.dur=Math.max(0,before-base*(mult||1));
  if(before>=25&&I.dur<25)toast(`${w.name} is badly worn: it will jam. Repair it soon.`,'bad');
  if(before>0&&I.dur<=0){toast(`${w.name} broke! Repair it at the workbench or with a repair kit.`,'bad');Sound.play('crash',.4);}}
function toolWear(kind){if(PERK('wilds'))return;const k=kind==='axe'?'axeDur':'pickDur',t=kind==='axe'?'axeT':'pickT';if(!player[t])return;
  player[k]=(player[k]==null?100:player[k])-(player[t]>1?1.1:2.4);
  if(player[k]<=0){toast(`Your ${kind==='axe'?(player[t]>1?'steel axe':'stone hatchet'):(player[t]>1?'steel pickaxe':'stone pick')} broke.`,'bad');player[t]=0;player[k]=100;Sound.play('crash',.4);}}
function armorWear(d){if(!player.armor)return;player.armorDur=Math.max(0,(player.armorDur==null?100:player.armorDur)-d*.35/player.armor);
  if(player.armorDur<=0&&!player.armorMsg){player.armorMsg=1;toast('Your armor is torn to shreds. Mend it with a sewing kit.','bad');}}
const armorOn=()=>player.armor&&(player.armorDur==null||player.armorDur>0)?player.armor:0;
function repairCostOf(I){const miss=100-wdur(I);return{scrap:Math.ceil(miss*.5*(1-.25*PERK('mechanic'))),parts:Math.ceil(miss/60)};}
// carry limits
const CAP={wood:40,stone:40,hide:15,cloth:20,herbs:15,meat:8,food:12,seeds:20,
  bandage:6,poultice:4,stew:3,molotov:4,pipebomb:3,noisemaker:4,campfire:3,snare:4,spikes:4,beartrap:2,barricade:3,repairkit:3,sewingkit:3};
function capOf(k){return Math.floor((CAP[k]||99)*(1+.25*PERK('packmule')+.05*ATTR('str')+(player.gear&&player.gear.pack?.5:0)));}
const carried=k=>k in ITEMS&&k!=='food'?player.items[k]||0:player[k]||0;
let capT=0;
function enforceCaps(dt){capT-=dt;if(capT>0)return;capT=.4;const lost=[];
  for(const k of Object.keys(CAP)){const c=capOf(k);if(k in ITEMS&&k!=='food'){const n=player.items[k]||0;if(n>c){lost.push(`${n-c} ${ITEMS[k].name.toLowerCase()}`);player.items[k]=c;}}
    else if((player[k]||0)>c){lost.push(`${Math.floor(player[k]-c)} ${k}`);player[k]=c;}}
  if(lost.length)toast(`Pack full: left behind ${lost.join(', ')}`,'bad');}
// consumable cooldowns
const ITEM_CD={food:2.5,bandage:4,poultice:6,stew:10,med:5,molotov:1.2,pipebomb:1.5,noisemaker:1,repairkit:2,sewingkit:2};
const cdLeft=k=>Math.max(0,((player.cd&&player.cd[k])||0)-S.time);
function useCD(k){if(cdLeft(k)>0){toast(`${k==='med'?'Medkit':ITEMS[k]?ITEMS[k].name:k} ready in ${cdLeft(k).toFixed(1)} s`);return false;}(player.cd||(player.cd={}))[k]=S.time+(ITEM_CD[k]||1);return true;}

