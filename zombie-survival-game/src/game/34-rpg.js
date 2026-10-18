/* ================= RPG: experience, levels, perks, contracts ================= */
const RPG={xp:0,lv:1,pts:0,perks:{},jobs:[],jobN:0,done:0,pop:0,popT:0};
function PERK(id){return RPG.perks[id]||0;}
const xpNeed=l=>100+l*l*25+l*50;
/* ---------- the skill tree: five branches, four tiers each, prerequisites and capstones; plus five attributes ----------
   A tier opens once you've spent enough points in that branch (0, 3, 6, 10). Some perks need another perk first.
   Every level gives one perk point and one attribute point. */
const BRANCHES=[
  {id:'surv',name:'Survivor',col:'#9bd651',blurb:'Health, healing, endurance and the cold'},
  {id:'gun',name:'Gunslinger',col:'#e9c46a',blurb:'Firearms: damage, crits, handling and upkeep'},
  {id:'brawl',name:'Brawler',col:'#d6432f',blurb:'Melee, stealth and up-close survival'},
  {id:'scav',name:'Scavenger',col:'#5fa8d3',blurb:'Loot, salvage, carrying and luck'},
  {id:'out',name:'Outdoorsman',col:'#c08a5a',blurb:'Gathering, hunting, crafting and camps'},
];
const TIER_GATE=[0,0,3,6,10];
const PERKS=[
  // Survivor
  {id:'tough',br:'surv',t:1,name:'Thick skin',max:3,desc:r=>`+${15*r} max HP`},
  {id:'lungs',br:'surv',t:1,name:'Iron lungs',max:2,desc:r=>`Sprinting burns ${20*r}% less stamina`},
  {id:'medic',br:'surv',t:2,name:'Field medic',max:2,req:['tough'],desc:r=>`Medkits heal +${20*r} HP, bandages and poultices work ${25*r}% faster`},
  {id:'irongut',br:'surv',t:2,name:'Iron gut',max:1,desc:()=>'Raw meat never makes you sick, and food heals 10 more'},
  {id:'coldblood',br:'surv',t:3,name:'Cold-blooded',max:2,req:['lungs'],desc:r=>`Lose body heat ${20*r}% slower`},
  {id:'secondwind',br:'surv',t:3,name:'Second wind',max:1,req:['medic'],desc:()=>'Once a day, a killing blow leaves you at 30 HP instead'},
  {id:'laststand',br:'surv',t:4,name:'Last stand',max:1,cap:1,req:['secondwind'],desc:()=>'Below 25% HP: +30% damage, +20% speed, no stamina cost to sprint'},
  // Gunslinger
  {id:'marks',br:'gun',t:1,name:'Marksman',max:3,desc:r=>`+${8*r}% gun damage`},
  {id:'hands',br:'gun',t:1,name:'Quick hands',max:2,desc:r=>`Reload ${12*r}% faster`},
  {id:'steady',br:'gun',t:2,name:'Steady aim',max:2,req:['marks'],desc:r=>`Aiming down sights is ${15*r}% tighter, and you move faster while aiming`},
  {id:'deadeye',br:'gun',t:2,name:'Deadeye',max:2,desc:r=>`+${5*r}% critical hit chance (double damage)`},
  {id:'gunnut',br:'gun',t:3,name:'Gun nut',max:2,req:['hands'],desc:r=>`Guns wear ${30*r}% slower and jam half as often`},
  {id:'scrounge',br:'gun',t:3,name:'Scrounged rounds',max:2,req:['deadeye'],desc:r=>`${10*r}% of shots don't use a round`},
  {id:'chamber',br:'gun',t:4,name:'One in the chamber',max:1,cap:1,req:['scrounge'],desc:()=>'Gun kills put a round back in the magazine and speed up your next shot'},
  // Brawler
  {id:'brawler',br:'brawl',t:1,name:'Brawler',max:3,desc:r=>`+${20*r}% melee damage`},
  {id:'hide',br:'brawl',t:1,name:'Hard as nails',max:2,desc:r=>`Take ${6*r}% less damage from everything`},
  {id:'ghost',br:'brawl',t:2,name:'Ghost',max:3,desc:r=>`Infected and wolves notice you ${12*r}% later`},
  {id:'bonebreak',br:'brawl',t:2,name:'Bone breaker',max:1,req:['brawler'],desc:()=>'Melee hits knock the infected back 50% further'},
  {id:'assassin',br:'brawl',t:3,name:'Assassin',max:1,req:['ghost'],desc:()=>'Silent takedowns also work on boomers and brutes'},
  {id:'whirl',br:'brawl',t:3,name:'Whirlwind',max:1,req:['bonebreak'],desc:()=>'Melee swings hit one more target'},
  {id:'butcher',br:'brawl',t:4,name:'Butcher',max:1,cap:1,req:['whirl'],desc:()=>'Melee kills heal 4 HP and give back 12 stamina'},
  // Scavenger
  {id:'scav',br:'scav',t:1,name:'Scavenger',max:3,desc:r=>`+${20*r}% scrap from crates and containers`},
  {id:'packmule',br:'scav',t:1,name:'Pack mule',max:2,desc:r=>`Carry limits +${25*r}%`},
  {id:'keeneye',br:'scav',t:2,name:'Keen eye',max:2,desc:r=>`${30*r}% chance of an extra find in every container`},
  {id:'mechanic',br:'scav',t:2,name:'Mechanic',max:2,req:['packmule'],desc:r=>`+${r} pull from every vehicle, repairs cost ${25*r}% less`},
  {id:'lucky',br:'scav',t:3,name:'Lucky find',max:3,req:['keeneye'],desc:r=>`${8*r}% chance each find is one rarity higher`},
  {id:'trinketeer',br:'scav',t:3,name:'Trinketeer',max:1,desc:()=>'One more trinket slot'},
  {id:'treasure',br:'scav',t:4,name:'Treasure hunter',max:1,cap:1,req:['lucky'],desc:()=>'Containers within 60 m show on the minimap; legendary finds twice as likely'},
  // Outdoorsman
  {id:'lumber',br:'out',t:1,name:'Woodsman',max:2,desc:r=>`+${r} wood or stone from every tree and rock`},
  {id:'hunter',br:'out',t:1,name:'Hunter',max:2,desc:r=>`Game spooks ${20*r}% later · +${r} hide per kill`},
  {id:'path',br:'out',t:2,name:'Pathfinder',max:2,desc:r=>`+${6*r}% move speed · you map ${25*r}% more of the land around you`},
  {id:'forager',br:'out',t:2,name:'Forager',max:2,req:['hunter'],desc:r=>`Food heals ${30*r}% more · +${r} food from crops and game`},
  {id:'campcraft',br:'out',t:3,name:'Campcraft',max:2,req:['path'],desc:r=>`Fires burn ${50*r}% longer, camp buildings cost ${15*r}% less`},
  {id:'tinker',br:'out',t:3,name:'Tinkerer',max:2,req:['lumber'],desc:r=>`${15*r}% chance crafting gives back its materials`},
  {id:'wilds',br:'out',t:4,name:'Child of the wild',max:1,cap:1,req:['campcraft'],desc:()=>'Tools never wear out, +1 from every gather and hunt, camps keep you twice as warm'},
];
const ATTRS=[
  {id:'str',name:'Strength',desc:'+5% melee damage, +5% carry limits'},
  {id:'agi',name:'Agility',desc:'+2% move speed, +5% stamina recovery'},
  {id:'end',name:'Endurance',desc:'+6 max HP, lose heat 4% slower'},
  {id:'per',name:'Perception',desc:'+1.5% crit chance, better odds of rare finds'},
  {id:'int',name:'Intellect',desc:'+5% XP, +2% chance crafting is free'},
];
const ATTR=k=>(RPG.attr&&RPG.attr[k])||0;
const branchPts=br=>PERKS.filter(p=>p.br===br).reduce((s,p)=>s+PERK(p.id),0);
function perkState(p){const r=PERK(p.id);
  if(r>=p.max)return{ok:false,why:'Mastered'};
  if(branchPts(p.br)<TIER_GATE[p.t])return{ok:false,why:`Tier ${p.t}: ${TIER_GATE[p.t]} pts in branch`};
  const miss=(p.req||[]).find(q=>!PERK(q));if(miss)return{ok:false,why:`Needs ${PERKS.find(x=>x.id===miss).name}`};
  if(RPG.pts<=0)return{ok:false,why:'No points'};return{ok:true};}
function recalcMaxHp(){player.maxHp=100+(base.infLv?INF_HP[base.infLv]:0)+15*PERK('tough')+6*ATTR('end');player.hp=Math.min(player.hp,player.maxHp);}
function learnPerk(id){const p=PERKS.find(q=>q.id===id);if(!p||!perkState(p).ok)return;
  RPG.pts--;RPG.perks[id]=PERK(id)+1;recalcMaxHp();if(id==='tough')player.hp+=15;Sound.play(p.cap?'level':'build');toast(`${p.name}${p.max>1?' '+PERK(id):''}: ${p.desc(PERK(id))}`,p.cap?'epic':'good');}
function raiseAttr(k){if(!(RPG.apts>0)||ATTR(k)>=10)return;RPG.apts--;RPG.attr[k]=ATTR(k)+1;recalcMaxHp();if(k==='end')player.hp+=6;Sound.play('build');}
function respec(){const n=Object.values(RPG.perks).reduce((s,v)=>s+v,0);if(!n||player.scrap<100)return;player.scrap-=100;RPG.pts+=n;RPG.perks={};recalcMaxHp();if(player.trinkEq)player.trinkEq.length=Math.min(player.trinkEq.length,trinkSlots());toast(`Perks refunded: ${n} points back`,'rare');}
function renderSkills(){
  const need=xpNeed(RPG.lv);
  $('skHead').textContent=`Level ${RPG.lv}`;$('skXp').style.width=(RPG.xp/need*100)+'%';$('skXpTxt').textContent=`${RPG.xp} / ${need} XP`;
  $('skPts').innerHTML=(RPG.pts||RPG.apts)?`<b>${RPG.pts}</b> perk point${RPG.pts===1?'':'s'} · <b>${RPG.apts||0}</b> attribute point${RPG.apts===1?'':'s'} to spend`:'Earn XP to level up: kills, takedowns, hunting, gathering, crafting, discovering places and finishing jobs.';
  let a='<div class="attrs">';for(const at of ATTRS){const v=ATTR(at.id);a+=`<div class="attr"><b>${at.name}</b><span class="av">${v}</span><button data-attr="${at.id}" ${RPG.apts>0&&v<10?'':'disabled'}>+</button><small>${at.desc}</small></div>`;}a+='</div>';
  let h=a+'<div class="tree">';
  for(const br of BRANCHES){const bp=branchPts(br.id);h+=`<div class="branch" style="--bc:${br.col}"><h3>${br.name} <small>${bp} pts</small></h3><p class="blurb">${br.blurb}</p>`;
    for(let t=1;t<=4;t++){const open=bp>=TIER_GATE[t];h+=`<div class="tier ${open?'':'shut'}"><span class="tlab">Tier ${t}${TIER_GATE[t]?` · ${TIER_GATE[t]} pts`:''}</span>`;
      for(const p of PERKS.filter(q=>q.br===br.id&&q.t===t)){const r=PERK(p.id),s=perkState(p);
        h+=`<article class="perk ${r?'has':''} ${p.cap?'capst':''}"><header><b>${p.name}</b>${pips(r,p.max)}</header><p>${p.desc(Math.max(1,r))}</p>${p.req?`<p class="req">Requires ${p.req.map(q=>PERKS.find(x=>x.id===q).name).join(', ')}</p>`:''}<button data-perk="${p.id}" ${s.ok?'':'disabled'}>${s.ok?'Learn':s.why}</button></article>`;}
      h+='</div>';}
    h+='</div>';}
  h+='</div>';$('skGrid').innerHTML=h;
  $('skJobs').innerHTML=RPG.jobs.length?RPG.jobs.map(j=>`<li>${jobLine(j)} <span class="rw">+${j.sc} scrap · +${j.xp} XP</span></li>`).join(''):'<li>No open jobs. New ones are posted at dawn.</li>';
  $('skTrink').innerHTML=trinketHTML();
  $('skStats').innerHTML=`<span><b>${S.kills}</b> kills</span><span><b>${S.takedowns||0}</b> takedowns</span><span><b>${S.looted}</b> containers</span><span><b>${RPG.done}</b> jobs</span><span><b>${[...EXP.found.values()].length}</b> places</span><span><button class="btn ghost" id="skRespec" ${player.scrap>=100&&Object.keys(RPG.perks).length?'':'disabled'}>Refund perks (100 scrap)</button></span>`;
}
$('skillScreen').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.perk)learnPerk(b.dataset.perk);else if(b.dataset.attr)raiseAttr(b.dataset.attr);else if(b.dataset.trink)toggleTrinket(b.dataset.trink);else if(b.id==='skRespec')respec();else if(b.id==='skClose'){closePanel();return;}
  renderSkills();if(pad.active)setPadFocus(document.querySelector('#skillScreen [data-perk]:not([disabled]),#skillScreen [data-attr]:not([disabled])')||$('skClose'));});

function gainXP(n){
  if(!S.running||S.over||!(n>0))return;n=Math.round(n*(1+.05*ATTR('int')+TK('xp')));RPG.xp+=n;RPG.pop+=n;RPG.popT=1.6;
  while(RPG.xp>=xpNeed(RPG.lv)){RPG.xp-=xpNeed(RPG.lv);RPG.lv++;RPG.pts++;RPG.apts=(RPG.apts||0)+1;
    recalcMaxHp();player.hp=Math.min(player.maxHp,player.hp+30);
    if(RPG.lv===3||RPG.lv===5||RPG.lv===8)learnBP('level '+RPG.lv);
    banner(`LEVEL ${RPG.lv}`,`Perk point earned. ${pad.active?'D-pad right':'Press K'} to spend it.`,'dawn');Sound.play('level');rumble(.3,.5,300);}
}
const JOB_T=[
  {k:'kill',w:3,mk(){const n=randi(3,6)*5;return{n,txt:`Put down ${n} infected`,xp:60+n*4,sc:20+n*2};}},
  {k:'td',w:2,mk(){const n=randi(2,5);return{n,txt:`Silent takedowns: ${n}`,xp:60+n*25,sc:15+n*8};}},
  {k:'hunt',w:2.5,mk(){const n=randi(1,3);return{n,txt:`Hunt ${n} deer`,xp:60+n*35,sc:15+n*10};}},
  {k:'wolf',w:1.2,mk(){const n=randi(2,4);return{n,txt:`Cull ${n} wolves`,xp:80+n*40,sc:20+n*12};}},
  {k:'wood',w:2,mk(){const n=randi(3,6)*5;return{n,txt:`Bring in ${n} wood`,xp:50+n*3,sc:10+n};}},
  {k:'stone',w:1.6,mk(){const n=randi(3,5)*5;return{n,txt:`Quarry ${n} stone`,xp:50+n*3,sc:10+n};}},
  {k:'salvage',w:2.2,mk(){const n=randi(2,4);return{n,txt:`Strip ${n} vehicles for parts`,xp:60+n*30,sc:15+n*10};}},
  {k:'craft',w:1.6,mk(){const n=randi(3,6);return{n,txt:`Craft ${n} things`,xp:50+n*15,sc:10+n*5};}},
  {k:'crate',w:2,mk(){const n=randi(3,7);return{n,txt:`Loot ${n} crates`,xp:50+n*15,sc:10+n*5};}},
  {k:'scout',w:3.5,mk(){const t=scoutTarget();if(!t)return null;return{n:1,txt:`Scout ${t.name}`,xp:150,sc:45,key:t.key,x:t.x,z:t.z,name:t.name};}},
];
function pickWt(list){let s=0;for(const t of list)s+=t.w;let r=Math.random()*s;for(const t of list){r-=t.w;if(r<=0)return t;}return list[0];}
function newJob(){for(let i=0;i<12;i++){const T=pickWt(JOB_T);if(RPG.jobs.some(j=>j.k===T.k))continue;const j=T.mk();if(!j)continue;j.k=T.k;j.p=0;j.id=++RPG.jobN;return j;}return null;}
function postJobs(){while(RPG.jobs.length<3){const j=newJob();if(!j)break;RPG.jobs.push(j);}}
function jobProg(k,amt,key){
  for(const j of [...RPG.jobs]){if(j.k!==k||(k==='scout'&&j.key!==key))continue;j.p=Math.min(j.n,j.p+amt);if(j.p>=j.n)finishJob(j);}
}
function finishJob(j){
  const i=RPG.jobs.indexOf(j);if(i<0)return;RPG.jobs.splice(i,1);player.scrap+=j.sc;RPG.done++;
  toast(`Job done: ${j.txt}. +${j.sc} scrap, +${j.xp} XP`,'epic');Sound.play('epic');gainXP(j.xp);if(Math.random()<.3)learnBP('job reward');
  setTimeout(()=>{if(S.running&&!S.over&&RPG.jobs.length<3){const n=newJob();if(n){RPG.jobs.push(n);toast(`New job on the board: ${n.txt}`);}}},5000);
}
function swapJob(id){const i=RPG.jobs.findIndex(j=>j.id===id);if(i<0||player.scrap<10)return;player.scrap-=10;const old=RPG.jobs.splice(i,1)[0];
  let n=null;for(let k=0;k<8&&!n;k++){n=newJob();if(n&&n.k===old.k)n=null;}RPG.jobs.splice(i,0,n||old);Sound.play('ui');}
function jobLine(j){return`${j.txt}${j.n>1?` <b>${j.p}/${j.n}</b>`:''}${j.k==='scout'?` · ${Math.round(Math.hypot(j.x-player.x,j.z-player.z))}m ${compass(Math.atan2(j.x-player.x,j.z-player.z))}`:''}`;}
function resetRPG(){Object.assign(RPG,{xp:0,lv:1,pts:0,apts:0,attr:{},perks:{},jobs:[],jobN:0,done:0,pop:0,popT:0});Object.assign(player,{hide:0,armor:0,armorDur:100,armorMsg:0,trinkets:[],trinkEq:[],cd:{},axeDur:100,pickDur:100});S.swDay=-1;}

