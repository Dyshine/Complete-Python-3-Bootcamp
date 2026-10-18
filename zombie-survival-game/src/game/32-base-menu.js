/* ================= BASE MENU ================= */
const UPG=[
  {id:'home',name:'Expand the house',max:3,lv:()=>HOME.lv,info:l=>HOME_INFO[l],cost:l=>[null,{scrap:140,wood:24,stone:6,parts:2},{scrap:240,wood:32,stone:12,parts:4}][l],verb:'Build',buy(){HOME.lv++;buildHome();banner('THE HOUSE GROWS',HOME_INFO[HOME.lv]+'. Three more windows to defend.','dawn');}},
  {id:'door',name:'Front door',max:3,lv:()=>HOME.doorLv,info:l=>`${['','Plank door','Braced door','Steel door'][l]}, ${DOOR_HP[l]} HP`,cost:l=>[null,{scrap:80,wood:8,parts:1},{scrap:200,parts:5}][l],verb:'Reinforce',buy(){HOME.doorLv++;Object.assign(HOME.door,{hp:DOOR_HP[HOME.doorLv],alive:true});buildHome();}},
  {id:'boards',name:'Window boards',max:3,lv:()=>HOME.boardLv,info:l=>`${['','Loose planks','Bolted planks','Steel-plated boards'][l]}, ${BOARD_HP[l]} HP per board`,cost:l=>[null,{scrap:70,wood:6},{scrap:180,parts:4}][l],verb:'Upgrade',buy(){const o=BOARD_HP[HOME.boardLv];HOME.boardLv++;for(const st of Object.values(HOME.win))st.bhp*=BOARD_HP[HOME.boardLv]/o;for(const s of hsegs)if(s.kind==='win')winVisual(s);}},
  {id:'walls',name:'Perimeter fence',max:4,lv:()=>base.wallLv,info:l=>l?`${WALL_NAME[l]}, ${WALL_HP[l]} HP per section`:'No fence: the yard is open',cost:l=>[{scrap:150,parts:2,wood:20},{scrap:120,parts:2,wood:8},{scrap:260,parts:5,stone:10,wood:6},{scrap:480,parts:10,stone:18,wood:10}][l],verb:'Build',buy(){base.wallLv++;applyWalls(true);}},
  {id:'turrets',name:'Auto-turrets',max:4,lv:()=>base.turrets,info:l=>l?`${l} of 4 corners covered`:'No turrets yet',cost:l=>[[80,2],[120,3],[170,5],[230,7]][l],verb:'Build',buy(){base.turrets++;applyTurrets();}},
  {id:'calib',name:'Turret calibration',max:3,lv:()=>base.turretLv,req:()=>base.turrets>0,lockText:'Needs a turret',info:l=>`Mk ${l}: ${TUR[l].dmg} damage, ${(1/TUR[l].rate).toFixed(1)} shots/s, ${TUR[l].range}m`,cost:l=>[null,[150,4],[300,8]][l],buy(){base.turretLv++;}},
  {id:'spikes',name:'Spike barricades',max:3,lv:()=>base.spikeLv,req:()=>base.wallLv>0,lockText:'Needs the fence',info:l=>l?`${SPIKE_DPS[l]} damage/s to infected at the walls`:'Walls are bare',cost:l=>[[90,2],[180,4],[320,7]][l],verb:'Install',buy(){base.spikeLv++;applyWalls(false);}},
  {id:'inf',name:'Infirmary',max:3,lv:()=>base.infLv,info:l=>l?`Heal ${INF_REGEN[l]} HP/s at home, +${INF_HP[l]} max HP`:'No medical station',cost:l=>[[80,1],[170,3],[300,6]][l],buy(){base.infLv++;recalcMaxHp();player.hp+=20;}},
  {id:'floods',name:'Floodlights',max:1,lv:()=>base.floods,info:l=>l?'Base lit at night, turret range +30%':'Base is dark at night',cost:l=>[[60,1]][l],verb:'Wire up',buy(){base.floods=1;applyFloods();}},
  {id:'radar',name:'Scavenger radio',max:1,lv:()=>base.radar,info:l=>l?'All crates and infected on the map, +4 crates each day':'Map shows only what you have seen',cost:l=>[[110,3]][l],verb:'Tune in',buy(){base.radar=1;}},
];
const RES_KEYS={wood:'Wood',stone:'Stone',food:'Food',seeds:'Seeds',hide:'Hide',cloth:'Cloth',herbs:'Herbs',meat:'Raw meat'};
const resHave=k=>k==='scrap'||k==='parts'||k in RES_KEYS?(player[k]||0):(comp[k]||0);
const afford=c=>!!c&&(Array.isArray(c)?player.scrap>=c[0]&&player.parts>=(c[1]||0):afford2(c));
function pay(c){if(!Array.isArray(c))return pay2(c);player.scrap-=c[0];player.parts-=c[1]||0;}
function costHTML(c){if(!c)return'';if(!Array.isArray(c))return costHTML2(c);return`<span class="cost ${player.scrap>=c[0]?'':'short'}"><i class="ic-scrap"></i>${c[0]}</span>`+(c[1]?`<span class="cost ${player.parts>=c[1]?'':'short'}"><i class="ic-parts"></i>${c[1]}</span>`:'');}
function pips(l,m){let s='';for(let i=1;i<=m;i++)s+=`<i class="${i<=l?'on':''}"></i>`;return`<div class="pips">${s}</div>`;}
function card(title,lv,max,now,next,cost,act,label,disabled){
  return`<article class="card"><header><h3>${title}</h3>${max?pips(lv,max):''}</header><p class="now">${now}</p>${next?`<p class="next">${next}</p>`:''}<footer>${costHTML(cost)}<button data-act="${act}" ${disabled?'disabled':''}>${label}</button></footer></article>`;
}
/* ----- workshop: armory (upgrades, mods, ammo, crafting) and salvage ----- */
function costHTML2(c){if(!c)return'';let h='';for(const [k,v] of Object.entries(c)){if(!v)continue;
  if(k==='scrap')h+=`<span class="cost ${player.scrap>=v?'':'short'}"><i class="ic-scrap"></i>${v}</span>`;
  else if(k==='parts')h+=`<span class="cost ${player.parts>=v?'':'short'}"><i class="ic-parts"></i>${v}</span>`;
  else if(k in RES_KEYS)h+=`<span class="cost ${resHave(k)>=v?'':'short'}">${k==='seeds'?'':`<i class="ic-${k}"></i>`}${v}${k==='seeds'?' seeds':k==='cloth'||k==='herbs'||k==='meat'?' '+RES_KEYS[k].toLowerCase():''}</span>`;
  else h+=`<span class="cost ${comp[k]>=v?'':'short'}">${v} ${compN(k,v)}</span>`;}return h;}
const afford2=c=>!!c&&Object.entries(c).every(([k,v])=>!v||resHave(k)>=v);
function pay2(c){for(const [k,v] of Object.entries(c)){if(!v)continue;if(k==='scrap'||k==='parts'||k in RES_KEYS)player[k]-=v;else comp[k]-=v;}}
function tierCost(I){
  if(I.sp)return(I.mk||1)<3?{scrap:100,parts:4,RC:1}:null;if(I.tier>=4)return null;
  const c={...{2:{scrap:30,parts:1,SPR:1},3:{scrap:90,parts:4,REC:1,BAR:1},4:{scrap:200,parts:10,REC:2,BAR:1,OPT:1}}[I.tier+1]};
  if(CLS[I.cls].heavy){c.scrap=Math.round(c.scrap*1.3);c.parts=Math.round(c.parts*1.3);}
  if(I.cls==='gl'&&c.OPT){c.CHM=c.OPT;delete c.OPT;}return c;}
const modSlots=I=>I.sp?3:I.tier-1;
function statLine(w){
  if(w.saw)return`${w.dmg*10} dmg/s · fuel ${Math.ceil(w.I.mag/10)} s`;
  if(w.melee)return`${w.dmg} dmg · ${Math.round(60/w.rate)} swings/min${w.cleave>1?' · hits '+w.cleave:''}${w.burn?' · burns':''}`;
  return`${w.dmg}${w.pellets>1?'×'+w.pellets:''} dmg · ${Math.round(60/w.rate)} rpm · ${w.mag} mag${w.pierce>1?' · pierce '+(w.pierce>50?'all':w.pierce):''}${w.radius?' · '+w.radius+' m blast':''}${w.burn?' · burns':''} · noise ${Math.round(w.noise)} m`;}
const wtitle=w=>`<span style="color:${w.col}">${w.name}</span>`;
function modList(I){const m=Object.values(I.mods).map(id=>MODS[id].name);const n=modSlots(I);
  return m.length?'Mods: '+m.join(', ')+'.':n?`${n} empty mod slot${n>1?'s':''}.`:'No mod slots until it\'s repaired to Field tier.';}
function wcard(title,tag,now,next,cost,btns){
  return`<article class="card"><header><h3>${title}</h3><span class="wtag" style="color:${tag[1]}">${tag[0]}</span></header><p class="now">${now}</p>${next?`<p class="next">${next}</p>`:''}<footer>${costHTML2(cost)}${btns.map(b=>`<button data-act="${b[0]}" ${b[2]?'disabled':''}>${b[1]}</button>`).join('')}</footer></article>`;}
function armoryHTML(){
  let h='';
  if(S.armSel&&LO[S.armSel]){const I=LO[S.armSel],w=wstat(I),cap=modSlots(I),used=Object.keys(I.mods).length;
    h+=wcard(wtitle(w),[w.tierName,w.col],statLine(w),`${used} of ${cap} mod slots used. Fitting a mod into a used slot replaces the old one.`,null,[['wback','Back']]);
    for(const id of CLS[I.cls].mods){const md=MODS[id],inSlot=I.mods[md.slot],fitted=inSlot===id,full=!inSlot&&used>=cap;
      h+=wcard(md.name,[SLOT_NAME[md.slot],'var(--mute)'],md.desc,fitted?'Fitted.':inSlot?`Replaces ${MODS[inSlot].name}.`:full?'All mod slots are in use.':'',fitted?null:md.cost,
        [['wfit:'+id,fitted?'Fitted':inSlot?'Replace':'Fit',fitted||full||!afford2(md.cost)]]);}
    return h;}
  for(const sl of SLOTS){const I=LO[sl];
    if(I){const w=wstat(I),tc=tierCost(I),am=w.ammo&&!w.infinite&&AMMO[w.ammo];
      const nxt=I.sp?((I.mk||1)<3?`Next: Mk ${['II','III'][(I.mk||1)-1]}, +20% damage.`:'Fully upgraded.'):I.tier<4?`Next: ${CLS[I.cls].models[I.tier]} (${TIER_NAME[I.tier+1]}).`:'Top tier.';
      const btns=[];if(tc)btns.push(['wup:'+sl,I.sp?'Upgrade Mk':'Upgrade',!afford2(tc)]);
      if(modSlots(I)&&CLS[I.cls].mods.length)btns.push(['wmods:'+sl,'Mods',false]);
      if(am)btns.push(['wammo:'+w.ammo,`+${am.pack} ${am.name} · ${am.cost}`,player.scrap<am.cost]);
      h+=wcard(wtitle(w),[w.tierName,w.col],statLine(w)+(am?` · carrying ${I.mag} + ${ammo[w.ammo]}`:''),`${modList(I)} ${nxt}`,tc,btns);}
    else if(sl!=='special'&&CLS[sl].craft){const c=CLS[sl];
      h+=wcard(`<span style="color:var(--mute)">${c.name}</span>`,['Empty','var(--mute)'],`Craft a ${c.models[1]} (Field tier).`,'Or find one in crates.',c.craft,[['wcraft:'+sl,'Craft',!afford2(c.craft)]]);}
  }
  return h;
}
function salvageHTML(){
  let h=wcard('Components',['Workshop','var(--hazard)'],Object.entries(comp).map(([k,v])=>`${COMP_NAME[k]} <b>${v}</b>`).join(' · '),'Salvage spare guns for components. Mods and upgrades use them.',null,[]);
  if(!stash.length)h+=wcard('Stash is empty',['0 / 12','var(--mute)'],'Guns you pick up that are no better than the ones you carry land here.','',null,[]);
  for(const I of stash){const w=wstat(I),y=salvageYield(I),eq=LO[slotOf(I)];
    h+=wcard(wtitle(w),[w.tierName,w.col],statLine(w),`Salvage for ${!I.sp&&I.tier===1?'about ':''}${yieldText(y)}.${eq?' Equip swaps it with your '+wstat(eq).name+'.':''}`,null,[['sequip:'+I.uid,'Equip',false],['ssalv:'+I.uid,'Salvage',false]]);}
  return h;
}
function armoryAct(a,k){
  if(a==='wup'){const I=LO[k],c=I&&tierCost(I);if(!c||!afford2(c))return;pay2(c);if(I.sp)I.mk=(I.mk||1)+1;else I.tier++;dirty(I);fillMag(I);if(player.weapon===k)equipVisual();toast(`Upgraded to ${wstat(I).name}`,'good');}
  else if(a==='wmods')S.armSel=k;
  else if(a==='wback')S.armSel=null;
  else if(a==='wfit'){const I=LO[S.armSel],md=MODS[k];if(!I||!afford2(md.cost))return;if(!I.mods[md.slot]&&Object.keys(I.mods).length>=modSlots(I))return;pay2(md.cost);I.mods[md.slot]=k;dirty(I);I.mag=Math.min(I.mag,wstat(I).mag);toast(`${md.name} fitted`,'good');}
  else if(a==='wammo'){const am=AMMO[k];if(player.scrap<am.cost)return;player.scrap-=am.cost;grantAmmo(k,1);}
  else if(a==='wcraft'){const c=CLS[k].craft;if(!afford2(c)||LO[k])return;pay2(c);acquire(mkW(k,2));setWeapon(k);}
  else if(a==='sequip'){const i=stash.findIndex(x=>x.uid==k);if(i<0)return;const I=stash[i],sl=slotOf(I);stash.splice(i,1);if(LO[sl])stash.push(LO[sl]);LO[sl]=I;dirty(I);if(player.weapon===sl){player.reloadT=0;equipVisual();}toast(`Equipped ${wstat(I).name}`,'good');}
  else if(a==='ssalv'){const i=stash.findIndex(x=>x.uid==k);if(i<0)return;const I=stash.splice(i,1)[0];toast(`Salvaged ${wstat(I).name}: ${yieldText(salvage(I))}`,'good');}
}
function repairCost(){let miss=0;if(base.wallLv)for(const s of segs)miss+=s.maxHp-s.hp;return Math.ceil(miss/5)+homeRepairCost();}
function renderMenu(){
  const keep=padFocus&&padFocus.dataset.act;
  $('mScrap').textContent=player.scrap;$('mParts').textContent=player.parts;
  $('menuSub').textContent=S.phase==='day'?`Nightfall in ${fmtT(S.dayT)}. Time is paused while you plan.`:`Night ${S.wave} is underway. Time is paused while you plan.`;
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.act==='tab:'+S.menuTab));
  let h='';
  if(S.menuTab==='def'){
    const rc=repairCost(),broken=base.wallLv?segs.filter(s=>!s.alive).length:0,hg=hsegs.filter(s=>s.kind==='win'&&!s.st.glass).length,dm=DOOR_HP[HOME.doorLv]-HOME.door.hp;
    const why=[hg?`${hg} broken window${hg>1?'s':''}`:'',!HOME.door.alive?'the door is smashed':dm>0?`the door is at ${Math.round(HOME.door.hp/DOOR_HP[HOME.doorLv]*100)}%`:'',broken?`${broken} fence sections down`:''].filter(Boolean);
    h+=card('Repair crew',0,0,rc?`${why.length?why.join(', ')+'. ':''}Repairs cost ${rc} scrap.`:`The house${base.wallLv?' and fence are':' is'} in good repair.`,`Re-glazes windows and fixes the door${base.wallLv?' and fence':''}. Boards go up by hand: E at a window.`,rc?[rc,0]:null,'repair',rc?'Repair all':'Intact',!rc||player.scrap<rc);
    {const need=hsegs.filter(s=>s.kind==='win').reduce((n,s)=>n+3-s.st.boards,0);h+=card('Board up the windows',0,0,need?`${need} more board${need>1?'s':''} would cover every window three deep.`:'Every window is boarded three deep.',`1 wood per board, ${BOARD_HP[HOME.boardLv]} HP each. You have ${player.wood|0} wood.`,need?{wood:Math.min(need,Math.max(1,player.wood|0))}:null,'boardall',need?'Board up':'Done',!need||(player.wood|0)<1);}
    if(rc)h+=card('Timber patch',0,0,`Nail planks over the damage: 4 wood repairs 100 HP.`,`You have ${player.wood|0} wood.`,{wood:4},'timber','Patch',!afford({wood:4}));
    const anyOpen=(base.wallLv&&gates.some(g=>g.alive&&g.open))||(HOME.door.alive&&HOME.door.open);
    h+=card(base.wallLv?'Doors and gates':'Front door',0,0,anyOpen?'Something is standing open.':'Everything is shut.','Infected walk straight in through an open door.',null,'gates',anyOpen?'Shut all':'All shut',!anyOpen);
    for(const u of UPG){const l=u.lv(),maxed=l>=u.max,locked=u.req&&!u.req(),c=maxed?null:u.cost(l);
      h+=card(u.name,l,u.max,u.info(l),maxed?'Fully upgraded':`Next: ${u.info(l+1)}`,c,'up:'+u.id,maxed?'Maxed':locked?u.lockText:(u.verb||'Upgrade'),maxed||locked||!afford(c));}
  }else if(S.menuTab==='arm'){h+=armoryHTML();
  }else if(S.menuTab==='salv'){h+=salvageHTML();
  }else if(S.menuTab==='jobs'){
    if(!RPG.jobs.length)h+=card('Board is empty',0,0,'Every posted job is done. New ones go up at dawn.','',null,'close','Back',false);
    for(const j of RPG.jobs)h+=card(j.k==='scout'?'Scouting':j.k==='hunt'||j.k==='wolf'?'Hunting':j.k==='wood'||j.k==='stone'?'Supply run':'Contract',j.n>1?Math.round(j.p/j.n*10):0,j.n>1?10:0,jobLine(j),`Reward: ${j.sc} scrap and ${j.xp} XP.`,[10,0],'swapjob:'+j.id,'Swap job',player.scrap<10);
  }else{
    h+=card('Cook a meal',0,0,`Hot food: +45 HP and full stamina. You have ${player.food|0} food.`,'Or press F to eat 1 food on the go (+25 HP).',{food:2},'buy:cook','Cook',!afford({food:2})||player.hp>=player.maxHp);
    h+=card('Seed packets',0,0,`Two packets for the garden beds. You have ${player.seeds|0} seeds.`,'Crops are ready after about a day; rain helps.',[20,0],'buy:seeds','Buy',player.scrap<20);
    h+=card('Crafting bench',0,0,'Armor, coats, tools, traps, throwables, medicine and ammo are made at the crafting bench.',pad.active?'Press Y away from the house, or from here.':'Press I anywhere.',null,'craftopen','Open crafting',false);
    h+=card('Sell hides',0,0,'Trade 2 hides for 30 scrap.',`You have ${player.hide|0} hide.`,{hide:2},'buy:hides','Sell',!afford({hide:2}));
    h+=card('Sell timber',0,0,'Trade 5 wood for 25 scrap.',`You have ${player.wood|0} wood.`,{wood:5},'buy:timber','Sell',!afford({wood:5}));
    h+=card('Crush stone',0,0,'Grind 4 stone for 1 part.',`You have ${player.stone|0} stone.`,{stone:4},'buy:stone','Crush',!afford({stone:4}));
    h+=card('Medkit',0,0,`Restores 55 HP. Carrying ${player.med} of 5.`,pad.active?'Use with B.':'Use with H.',[40,0],'buy:med','Buy',player.scrap<40||player.med>=5);
    h+=card('Frag grenade',0,0,`Bounces, then blows. Carrying ${player.gren} of 6.`,pad.active?'Throw with D-pad down.':'Throw with G toward the cursor.',[35,1],'buy:gren','Buy',!afford([35,1])||player.gren>=6);
    h+=card('Salvage parts',0,0,'Strip scrap down into precision parts.','Exchange rate: 45 scrap for 1 part.',[45,0],'buy:part','Convert',player.scrap<45);
    h+=card('Field rations',0,0,'Eat and rest. Restores 30 HP.','Cheaper than a medkit, used on the spot.',[18,0],'buy:food','Eat',player.scrap<18||player.hp>=player.maxHp);
  }
  $('menuGrid').innerHTML=h;
  if(pad.active){const b=keep&&document.querySelector(`#menu [data-act="${keep}"]`);setPadFocus(b||document.querySelector('#menuGrid button:not([disabled])')||document.querySelector('#menu [data-act="close"]'));}
}
$('menu').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;const [a,k]=b.dataset.act.split(':');
  if(a==='close'){closeMenu();return;}
  if(a==='tab'){S.menuTab=k;S.armSel=null;renderMenu();Sound.play('ui');return;}
  if(a==='swapjob'){swapJob(+k);renderMenu();updateHUD();return;}
  if(a==='craftopen'){closeMenu();openCraft();return;}
  if(a==='timber'){if(!afford({wood:4}))return;pay({wood:4});let left=100;{const d=HOME.door,mx=DOOR_HP[HOME.doorLv],add=Math.min(mx-d.hp,left);if(add>0){d.hp+=add;d.alive=true;left-=add;doorVisual();}}if(base.wallLv)for(const sg of segs){if(left<=0)break;const need=sg.maxHp-sg.hp;if(need<=0)continue;const add=Math.min(need,left);sg.hp+=add;sg.alive=true;left-=add;}applyWalls(false);toast('Walls patched with timber','good');}
  else if(a==='repair'){const c=repairCost();if(player.scrap<c)return;player.scrap-=c;if(base.wallLv){for(const s of segs){s.hp=s.maxHp;s.alive=true;}applyWalls(false);}repairHome();toast('Repairs done','good');}
  else if(a==='boardall')boardAll();
  else if(a==='gates'){for(const g of gates)g.open=false;HOME.door.open=false;Sound.play('door');toast('All shut','good');}
  else if(a==='up'){const u=UPG.find(x=>x.id===k);const c=u.cost(u.lv());if(!afford(c))return;pay(c);u.buy();toast(`${u.name} upgraded`,'good');}
  else if(a[0]==='w'||a[0]==='s'&&a!=='sup')armoryAct(a,k);
  else if(a==='buy'){
    if(k==='armor'){const al=player.armor||0,ac=[{hide:3,scrap:30},{hide:6,scrap:60},{hide:10,scrap:100}][al];if(ac&&afford(ac)){pay(ac);player.armor=al+1;toast(`Leather armor ${al+1}: ${(al+1)*10}% less damage`,'good');}}
    else if(k==='hides'&&afford({hide:2})){pay({hide:2});player.scrap+=30;}
    else if(k==='cook'&&afford({food:2})){pay({food:2});player.hp=Math.min(player.maxHp,player.hp+45);player.st=100;}
    else if(k==='seeds'&&player.scrap>=20){player.scrap-=20;player.seeds=(player.seeds||0)+2;}
    else if(k==='timber'&&afford({wood:5})){pay({wood:5});player.scrap+=25;}
    else if(k==='stone'&&afford({stone:4})){pay({stone:4});player.parts++;}
    else if(k==='med'&&player.scrap>=40&&player.med<5){player.scrap-=40;player.med++;}
    else if(k==='gren'&&afford([35,1])&&player.gren<6){pay([35,1]);player.gren++;}
    else if(k==='part'&&player.scrap>=45){player.scrap-=45;player.parts++;}
    else if(k==='food'&&player.scrap>=18){player.scrap-=18;player.hp=Math.min(player.maxHp,player.hp+30);}
  }
  Sound.play('build');rumble(.2,.3,80);renderMenu();updateHUD();refreshSlots();
});
function openMenu(){if(!S.running||S.over||S.panel)return;if(!inBase(player.x,player.z)){toast(base.wallLv?'Get inside your walls to use the workshop':'Go inside the house to use the workshop');return;}unlockMouse();S.menu=true;$('menu').hidden=false;document.body.classList.remove('playing');renderMenu();}
function closeMenu(){S.menu=false;$('menu').hidden=true;setPadFocus(null);if(!isTouch&&!pad.active)document.body.classList.add('playing');}

