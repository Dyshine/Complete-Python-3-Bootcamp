/* ================= PLAYER ACTIONS ================= */
/* ================= WEAPONS: nine classes x four tiers, mods, salvage and special weapons (see design/armory.html) ================= */
const TIER_NAME=['','Rusted','Field','Workshop','Military'],TIER_COL=['','#a8977f','#79c252','#5fa8d3','#b08be6'],SP_COL='#f2a516';
const SLOTS=['side','rev','smg','shot','ar','hunt','gl','bow','melee','special'];
const AMMO={'9mm':{name:'9mm',pack:24,cost:15},'357':{name:'.357',pack:12,cost:18},'45':{name:'.45',pack:50,cost:20},'12g':{name:'12 ga',pack:12,cost:20},
  '556':{name:'5.56',pack:60,cost:25},'308':{name:'.308',pack:10,cost:30},'40mm':{name:'40mm',pack:6,cost:45},'bolt':{name:'bolts',pack:8,cost:16}};
// per tier: [damage, rounds per minute, magazine, reload s]
const CLS={
  side:{name:'Sidearm',short:'SIDE',ammo:'9mm',models:['Junker 9','M9 Service','Ranger 10mm','Viper Mk IV'],s:[[16,210,9,1.2],[20,231,12,1],[26,251,14,.9],[33,272,17,.8]],
    spread:.025,range:42,noise:45,sfx:'pistol',shake:.06,knock:2,kick:0,len:.6,gx:85,rum:[.1,.3,60],salv:{scrap:12,parts:1,BAR:1,REC:1,SPR:2,FUR:1},mods:['sup','comp','ext','dot','trig','inc','hp']},
  rev:{name:'Revolver',short:'REV',ammo:'357',models:['Rust Bucket .38','Ranch .357','Dead-Eye .44','Judge .500'],s:[[52,99,5,2.6],[65,109,6,2.2],[85,118,6,2],[107,128,6,1.7]],pierce:[1,2,2,3],
    spread:.02,range:48,noise:65,sfx:'revolver',shake:.2,knock:5,kick:.8,len:.75,gx:75,rum:[.5,.4,110],salv:{scrap:18,parts:2,BAR:1,REC:1,SPR:1,FUR:1},craft:{scrap:90,parts:3},mods:['comp','dot','trig','inc','hp']},
  smg:{name:'SMG',short:'SMG',ammo:'45',models:['Pipe Rattler','Mac-Stitch','Hornet 45','Wasp Kinetic'],s:[[9,840,26,1.7],[11,923,35,1.4],[14,1003,42,1.3],[18,1085,49,1.1]],
    spread:.07,range:26,noise:50,sfx:'smg',shake:.05,knock:1.2,kick:.1,len:.75,gx:90,rum:[.12,.3,40],salv:{scrap:20,parts:2,BAR:1,REC:1,SPR:3,FUR:1},craft:{scrap:110,parts:4},mods:['sup','comp','ext','drum','dot','stock','trig','inc','hp']},
  shot:{name:'Shotgun',short:'SHOT',ammo:'12g',pellets:8,models:['Barn Pump','Pump 870','Riot Pump','Breacher S-8'],s:[[12,73,4,2.4],[15,80,6,2],[20,87,7,1.8],[22,120,8,1.6]],
    spread:.2,range:17,noise:70,sfx:'shotgun',shake:.3,knock:6,kick:2.2,len:1.1,gx:85,shell:0xb02a20,rum:[.7,.5,140],salv:{scrap:24,parts:2,BAR:1,REC:1,SPR:2,FUR:2},craft:{scrap:70,parts:3},mods:['choke','ext','drum','dot','stock','trig','inc']},
  ar:{name:'Assault rifle',short:'AR',ammo:'556',models:['Scrap Carbine','AR Field','Warden AR','Ghost M4'],s:[[18,575,22,2],[22,632,30,1.7],[29,687,36,1.5],[36,743,42,1.4]],
    spread:.05,range:46,noise:60,sfx:'rifle',shake:.08,knock:2,kick:.2,len:1.2,gx:75,rum:[.15,.35,50],salv:{scrap:30,parts:3,BAR:1,REC:1,SPR:3,OPT:1,FUR:1},craft:{scrap:150,parts:6},mods:['sup','comp','ext','drum','dot','scope','stock','trig','inc','hp']},
  hunt:{name:'Hunting rifle',short:'HUNT',ammo:'308',models:['Bolt Junk .30','Hunting .308','Longshot Mk II','Widowmaker .338'],s:[[120,55,4,2.8],[150,60,5,2.3],[195,65,5,2.1],[248,71,6,1.8]],pierce:[3,5,6,8],
    spread:.004,range:75,noise:85,sfx:'sniper',shake:.4,knock:8,kick:2.6,len:1.6,gx:100,rum:[.9,.6,180],salv:{scrap:34,parts:3,BAR:1,REC:1,SPR:1,OPT:1,FUR:1},craft:{scrap:190,parts:8},heavy:true,mods:['sup','ext','scope','stock','inc','hp']},
  gl:{name:'Grenade launcher',short:'GL',ammo:'40mm',projectile:true,models:['Pipe Popper','M32 Field','Thumper Six','Cyclone MGL'],s:[[104,65,3,3],[130,71,4,2.5],[169,77,5,2.3],[215,83,6,2]],radius:[4,4.8,5.4,6],
    spread:0,range:30,noise:65,sfx:'launcher',shake:.2,knock:0,kick:1.2,len:1,gx:70,rum:[.5,.3,120],salv:{scrap:40,parts:4,BAR:1,REC:1,SPR:2,CHM:2},craft:{scrap:280,parts:12},heavy:true,mods:['stock','dot']},
  bow:{name:'Crossbow',short:'BOW',ammo:'bolt',models:['Bike-Wheel Bow',"Hunter's Crossbow",'Recurve Cross','Silent Partner'],s:[[96,42,1,1.1],[120,46,1,1],[156,50,1,.9],[198,54,1,.8]],pierce:[1,2,2,3],
    spread:.01,range:55,noise:6,sfx:'bow',shake:.04,knock:3,kick:0,len:1,gx:66,rum:[.1,.2,60],salv:{scrap:16,parts:2,SPR:2,FUR:2,OPT:1},craft:{scrap:80,parts:3},mods:['dot','scope','inc']},
  melee:{name:'Melee',short:'MELEE',ammo:null,melee:true,models:['Rebar','Machete','Spiked Bat','Fire Axe'],s:[[36,100],[45,109],[58,100],[74,86]],cleave:[1,1,1,3],
    spread:0,range:2.5,noise:4,sfx:'swing',shake:.05,knock:5,kick:0,len:.9,gx:30,rum:[.2,.3,70],salv:{scrap:6,FUR:1},craft:{scrap:25,parts:0},mods:['inc']},
};
const MODS={
  sup:{slot:'muzzle',name:'Suppressor',cost:{scrap:20,BAR:1,FUR:1},desc:'Noise ×0.35, damage −5%'},
  comp:{slot:'muzzle',name:'Compensator',cost:{scrap:15,BAR:1},desc:'Spread and recoil −30%'},
  choke:{slot:'muzzle',name:'Full choke',cost:{scrap:10,BAR:1},desc:'Pellet spread −40%, range +35%'},
  ext:{slot:'mag',name:'Extended mag',cost:{scrap:15,SPR:2},desc:'Magazine +50%'},
  drum:{slot:'mag',name:'Drum mag',cost:{scrap:35,SPR:4,REC:1},desc:'Magazine +150%, reload 40% slower'},
  dot:{slot:'optic',name:'Red-dot',cost:{scrap:15,OPT:1},desc:'Spread −25%, range +15%'},
  scope:{slot:'optic',name:'4× scope',cost:{scrap:25,OPT:2},desc:'Range +50%, 15% chance of double damage'},
  stock:{slot:'stock',name:'Padded stock',cost:{scrap:10,FUR:2},desc:'Recoil −40%, spread −15%'},
  trig:{slot:'trigger',name:'Hair trigger',cost:{scrap:0,parts:1,SPR:2,REC:1},desc:'Fire rate +15%'},
  inc:{slot:'ammo',name:'Incendiary',cost:{scrap:10,CHM:2},desc:'Sets targets on fire, 8/s for 3 s. Burning horde members scatter.'},
  hp:{slot:'ammo',name:'Hollow points',cost:{scrap:15,CHM:1},desc:'Damage +20%, pierce −1'},
};
const SPECIAL={
  lullaby:{name:'Lullaby',base:'side',ammo:'9mm',dmg:70,rpm:150,mag:8,reload:1.1,noise:0,quiet:true,unaware:true,desc:'Silent. Hits don\'t alert a horde, and it does double damage to infected that haven\'t spotted you.'},
  piper:{name:'Pied Piper',base:'gl',ammo:'40mm',dmg:300,rpm:40,mag:1,reload:3,radius:7,siren:true,desc:'Fires a siren canister. Every horde within 120 m walks to it, then it blows after 12 s.'},
  dawn:{name:'Dawnbreaker',base:'shot',ammo:'12g',dmg:18,pellets:10,rpm:80,mag:5,reload:2.2,burn:12,spreadFire:true,desc:'Incendiary pellets. Fire spreads from zombie to zombie. Half as strong in rain.'},
  thunder:{name:"Grandpa's Thunder",base:'shot',ammo:'12g',dmg:600,pellets:1,spread:.01,rpm:90,mag:2,reload:3.2,pierce:99,knock:14,kick:9,range:40,desc:'4-gauge slugs go through every zombie in a line. Kicks you back.'},
  lineman:{name:'Lineman',base:'ar',ammo:null,dmg:45,rpm:300,mag:40,battery:true,chain:4,noise:40,desc:'Lightning jumps to 4 more targets, 7 in rain. The battery recharges.'},
  harvester:{name:'Harvester',base:'melee',ammo:null,dmg:18,rpm:600,mag:300,saw:true,noise:55,range:2.7,desc:'Chainsaw: 180 damage/s, staggers brutes, loud. Reload burns 1 Chem for fuel.'},
  lastword:{name:'Last Word',base:'hunt',ammo:'308',dmg:300,rpm:50,mag:4,reload:2.4,pierce:6,stacks:true,desc:'Each kill adds 20% damage (5 max) until you reload. A last-round kill puts 2 rounds back.'},
  hive:{name:'Hivemind',base:'smg',ammo:'45',dmg:12,rpm:1000,mag:60,reload:1.6,bounce:true,desc:'Every bullet ricochets to a second infected within 6 m.'},
  digger:{name:'Grave Digger',base:'bow',ammo:'bolt',dmg:220,rpm:50,mag:1,reload:1,radius:3.5,sticky:true,noise:0,desc:'Silent sticky bolts that explode 2 s after they hit.'},
};
const SP_BY_SRC={church:'lullaby',gas:'dawn',farmhouse:'thunder',tower:'lineman',barn:'harvester',apartment:'lastword',cabin:'digger'};
const COMP_NAME={SPR:'Springs',BAR:'Barrels',REC:'Receivers',OPT:'Optics',FUR:'Furniture',CHM:'Chem',RC:'Relic Cores'};
const compN=(k,n)=>n===1?{SPR:'Spring',BAR:'Barrel',REC:'Receiver',OPT:'Optic',RC:'Relic Core'}[k]||COMP_NAME[k]:COMP_NAME[k];
const SLOT_NAME={muzzle:'Muzzle',mag:'Magazine',optic:'Optic',stock:'Stock',trigger:'Trigger',ammo:'Ammo'};

let LO={},stash=[],ammo={},comp={},SPOWN=new Set(),uidN=0,SHOT=null;
const LURES=[],STICKY=[],wdrops=[];
const mkW=(cls,tier,sp)=>({uid:++uidN,cls:sp?SPECIAL[sp].base:cls,tier:sp?3:tier,sp:sp||null,mk:1,mods:{},mag:0,stacks:0,_st:null});
const slotOf=I=>I.sp?'special':I.cls;
const curW=()=>LO[player.weapon];
function wstat(I){
  if(I._st)return I._st;
  const sp=I.sp&&SPECIAL[I.sp],c=CLS[I.cls],t=I.tier,s=c.s[t-1];
  const w={I,cls:I.cls,sp:I.sp,name:sp?sp.name:c.models[t-1],short:sp?sp.name.replace(/^.*\s/,'').toUpperCase().slice(0,8):c.short,
    col:sp?SP_COL:TIER_COL[t],tierName:sp?'Special Mk '+['I','II','III'][(I.mk||1)-1]:TIER_NAME[t],
    dmg:s[0],rate:60/s[1],mag:s[2]||0,reload:s[3]||0,pellets:c.pellets||1,spread:c.spread,range:c.range,pierce:c.pierce?c.pierce[t-1]:1,radius:c.radius?c.radius[t-1]:0,
    projectile:!!c.projectile,melee:!!c.melee,cleave:c.cleave?c.cleave[t-1]:1,noise:c.noise,sfx:c.sfx,shake:c.shake,knock:c.knock,kick:c.kick,len:c.len,shell:c.shell,rum:c.rum,ammo:c.ammo,
    infinite:!sp&&I.cls==='side'&&t<=2,jam:!sp&&t===1&&!c.melee,crit:0,burn:0};
  if(sp){for(const k of ['dmg','mag','reload','pellets','spread','range','pierce','radius','noise','knock','kick'])if(sp[k]!=null)w[k]=sp[k];
    w.rate=60/sp.rpm;w.ammo=sp.ammo;w.cleave=sp.saw?4:w.cleave;
    for(const k of ['quiet','unaware','siren','spreadFire','battery','chain','saw','stacks','bounce','sticky'])w[k]=sp[k];w.burn=sp.burn||0;
    w.dmg*=1+.2*((I.mk||1)-1);}
  for(const id of Object.values(I.mods)){
    switch(id){case 'sup':w.noise*=.35;w.dmg*=.95;w.sup=true;break;case 'comp':w.spread*=.7;w.kick*=.7;w.shake*=.7;break;case 'choke':w.spread*=.6;w.range*=1.35;break;
      case 'ext':w.mag=Math.round(w.mag*1.5);break;case 'drum':w.mag=Math.round(w.mag*2.5);w.reload*=1.4;break;case 'dot':w.spread*=.75;w.range*=1.15;break;
      case 'scope':w.range*=1.5;w.crit=.15;break;case 'stock':w.kick*=.6;w.spread*=.85;break;case 'trig':w.rate/=1.15;break;
      case 'inc':if(!w.burn)w.burn=8;break;case 'hp':w.dmg*=1.2;w.pierce=Math.max(1,w.pierce-1);break;}}
  w.dmg=Math.round(w.dmg);return I._st=w;
}
const fillMag=I=>{I.mag=wstat(I).mag;};
const dirty=I=>{I._st=null;};
function resetInv(){
  LO={};stash=[];ammo={};for(const k in AMMO)ammo[k]=0;comp={SPR:0,BAR:0,REC:0,OPT:0,FUR:0,CHM:0,RC:0};SPOWN=new Set();
  for(const l of LURES){scene.remove(l.m);l.m.material.dispose();}for(const st of STICKY)scene.remove(st.m);for(const a of [LURES,STICKY])a.length=0;for(const d of wdrops)dropWD(d);wdrops.length=0;
  const p=mkW('side',2);fillMag(p);LO.side=p;player.weapon='side';equipVisual();
}
function ownedAmmo(){const s=new Set();for(const I of Object.values(LO)){const w=wstat(I);if(w.ammo&&!w.infinite)s.add(w.ammo);}return[...s];}
function grantAmmo(k,packs){ammo[k]+=Math.round(AMMO[k].pack*packs);}
const better=(a,b)=>a.tier>b.tier;
function stashPush(I){
  stash.push(I);
  if(stash.length>12){stash.sort((a,b)=>(b.sp?9:b.tier)-(a.sp?9:a.tier));const x=stash.pop();const y=salvage(x);toast(`Stash full: scrapped ${wstat(x).name} (${yieldText(y)})`);}
}
// a new weapon goes into its slot if that's empty or it's a better tier; otherwise into the stash
function acquire(I){
  dirty(I);fillMag(I);const w=wstat(I),sl=slotOf(I),old=LO[sl];
  if(I.sp)SPOWN.add(I.sp);
  if(w.ammo&&!w.infinite)grantAmmo(w.ammo,2);
  const tag=`<b style="color:${w.col}">${w.name}</b>`;
  if(!old){LO[sl]=I;setTimeout(()=>toast(`New weapon: ${tag}. ${pad.active?'LB / RB to switch.':'Press '+((SLOTS.indexOf(sl)+1)%10)+'.'}`,'epic'),300);}
  else if(!I.sp&&better(I,old)){stashPush(old);LO[sl]=I;if(player.weapon===sl){player.reloadT=0;equipVisual();}setTimeout(()=>toast(`Upgraded to ${tag}. ${wstat(old).name} went to your stash.`,'epic'),300);}
  else{stashPush(I);setTimeout(()=>toast(`${tag} sent to your stash. Salvage it at the workshop.`),300);}
  refreshSlots();return tag;
}
function rollWeapon(rar,forceTier){
  const r=Math.random()*100;let tier=forceTier;
  if(!tier){if(rar==='common')tier=r<70?1:2;else if(rar==='rare')tier=r<60?2:3;else if(rar==='epic')tier=r<65?3:4;
    else{if(r<15){const sp=randomSpecial();if(sp)return mkW(null,0,sp);}tier=4;}}
  const pool=['side','rev','smg','shot','ar','hunt','gl','bow','melee'].filter(c=>!(c==='gl'&&tier===1));
  return mkW(pick(pool),tier);
}
function randomSpecial(pref){if(pref&&!SPOWN.has(pref))return pref;const ids=Object.keys(SPECIAL).filter(k=>!SPOWN.has(k));return ids.length?pick(ids):null;}
function salvageYield(I){
  if(I.sp)return{scrap:60,parts:8,RC:1};
  const b=CLS[I.cls].salv,m=[0,.5,1,1.5,2][I.tier],y={};
  for(const k in b){if(I.tier===1&&k!=='scrap'&&k!=='parts'){y[k]=0;for(let i=0;i<b[k];i++)if(Math.random()<.5)y[k]++;}else y[k]=Math.round(b[k]*m);}
  if(I.tier>=3)for(const id of Object.values(I.mods))if(I.tier===4||Math.random()<.5)for(const [k,v] of Object.entries(MODS[id].cost))y[k]=(y[k]||0)+v;
  return y;
}
function salvage(I){const y=salvageYield(I);for(const [k,v] of Object.entries(y)){if(!v)continue;if(k==='scrap')player.scrap+=v;else if(k==='parts')player.parts+=v;else comp[k]+=v;}if(I.sp)SPOWN.delete(I.sp);return y;}
const yieldText=y=>Object.entries(y).filter(e=>e[1]).map(([k,v])=>`${v} ${k==='scrap'?'scrap':k==='parts'?(v===1?'part':'parts'):compN(k,v).toLowerCase()}`).join(', ');

/* ----- in-hand and dropped gun models: the design page's flat drawings, extruded ----- */
const PAL={
  1:{metal:'#7d6656',metal2:'#5c4c40',wood:'#8a6a44',dark:'#3a312a',tape:'#b9b2a2',accent:'#a8977f',glow:'#d8c8a0'},
  2:{metal:'#5a6264',metal2:'#3f4749',wood:'#7d5433',dark:'#24292a',tape:'#6a5a44',accent:'#79c252',glow:'#d6432f'},
  3:{metal:'#4d575c',metal2:'#363e42',wood:'#3e7fae',dark:'#1f2528',tape:'#5fa8d3',accent:'#5fa8d3',glow:'#ff5040'},
  4:{metal:'#2c2e31',metal2:'#1d1f21',wood:'#36393d',dark:'#141516',tape:'#f2a516',accent:'#f2a516',glow:'#c9a0ff'},
};
function shapes(cls,t,sp){
  const S=[],R=(x,y,w,h,r)=>S.push(['r',x,y,w,h,r]),P=(p,r)=>S.push(['p',p,r]),C=(x,y,rad,r)=>S.push(['c',x,y,rad,r]),L=(a,b,c,d,w,r)=>S.push(['l',a,b,c,d,w,r]);
  const tape=(x,y,w,h)=>{if(t===1)R(x,y,w,h,'tape');};
  const reddot=(x,y)=>{R(x,y,22,10,'dark');C(x+16,y+5,2.6,'glow');};
  const scope=(x,y,l)=>{R(x,y,l,10,'dark');R(x-6,y-2,10,14,'dark');R(x+l-4,y-2,10,14,'dark');R(x+l*.3,y+10,6,6,'metal2');R(x+l*.65,y+10,6,6,'metal2');};
  const stripes=(x,y,w,h)=>{if(t===4)for(let i=0;i<w;i+=10)P([[x+i,y+h],[x+i+5,y+h],[x+i+10,y],[x+i+5,y]],'tape');};
  switch(cls){
    case 'side':
      if(t===4)R(162,27,58,16,'metal2');
      R(62,24,104,18,'metal');R(70,40,86,10,'metal2');P([[78,46],[104,46],[98,78],[70,78]],'wood');
      R(100,50,26,3,'dark');R(124,44,3,10,'dark');R(164,28,8,10,'dark');
      tape(76,58,26,5);tape(73,68,26,5);if(t>=3&&!sp)reddot(108,15);stripes(70,26,40,5);
      if(t===3)R(120,26,40,6,'tape');break;
    case 'rev':
      R(112,28,t===1?50:(t===4?104:88),10,'metal');R(112,24,t===1?50:(t===4?104:88),5,'metal2');
      if(t===4)for(let i=0;i<4;i++)R(196+i*5,25,2.5,6,'dark');
      P([[66,24],[114,24],[114,48],[98,52],[66,46]],'metal');R(80,25,32,22,'metal2');L(86,28,86,44,2,'dark');L(96,28,96,44,2,'dark');L(106,28,106,44,2,'dark');
      P([[66,44],[92,48],[84,80],[58,78]],'wood');P([[62,22],[70,16],[74,28]],'dark');R(90,50,20,3,'dark');
      tape(62,58,26,5);tape(60,68,26,5);if(t===3)reddot(130,14);if(t===3)R(130,29,40,4,'tape');stripes(66,40,30,5);break;
    case 'smg':
      if(t===4)R(186,28,50,16,'metal2');
      L(70,30,26,36,4,'dark');L(26,36,26,54,4,'dark');L(70,46,26,54,4,'dark');
      R(68,24,96,24,'metal');R(162,31,26,9,'dark');P([[116,46],[132,46],[138,80],[122,82]],'metal2');
      P([[84,46],[102,46],[96,74],[80,74]],'wood');R(146,46,10,20,'wood');
      tape(70,30,8,14);tape(88,30,8,14);tape(118,60,16,5);if(t>=3)reddot(98,15);if(t===3)R(70,40,90,4,'tape');stripes(100,26,50,6);break;
    case 'shot':{
      const bl=t===1?96:120;
      P([[6,34],[70,28],[70,46],[18,62],[6,60]],'wood');R(70,26,42,22,'metal');
      R(112,27,bl,9,'metal');R(112,37,bl-18,7,'metal2');
      if(t<4)R(140,35,42,13,'wood');else{R(96,46,14,24,'metal2');for(let i=0;i<4;i++)R(74+i*8,30,5,10,'glow');}
      R(84,48,18,3,'dark');R(100,46,3,8,'dark');
      if(t===3){for(let i=0;i<6;i++)R(126+i*14,21,9,6,'tape');reddot(76,15);}
      tape(24,44,30,6);tape(150,36,16,12);stripes(16,40,40,6);break;}
    case 'ar':
      if(t===4)R(218,28,28,12,'metal2');
      P([[6,30],[62,30],[62,44],[16,58],[6,58]],'wood');R(62,25,64,22,'metal');
      if(t<=2){R(80,15,34,9,'metal2');R(84,12,4,6,'dark');}
      P([[98,46],[114,46],[122,78],[106,80]],'metal2');P([[70,46],[84,46],[80,70],[66,70]],'dark');
      R(126,25,58,17,t===3?'tape':'wood');R(184,30,36,6,'dark');R(178,17,4,12,'dark');
      tape(100,58,18,5);tape(20,40,30,6);if(t===3)reddot(86,14);if(t===4)scope(76,11,50);stripes(130,27,50,6);break;
    case 'hunt':
      if(t===4){R(230,23,14,12,'dark');L(170,40,158,72,3,'dark');L(176,40,188,72,3,'dark');}
      P([[4,40],[82,32],[88,46],[20,64],[4,62]],'wood');R(82,32,104,12,'wood');R(86,23,40,12,'metal');
      L(114,30,106,44,4,'dark');C(106,46,4.5,'dark');R(126,25,t===4?104:110,7,'metal');R(98,44,14,3,'dark');
      if(t<=2)R(222,19,3,8,'dark');if(t>=3)scope(92,8,t===4?66:54);
      if(t===1){R(40,40,6,18,'tape');R(150,31,6,14,'tape');}stripes(22,44,40,6);break;
    case 'gl':
      P([[8,34],[56,34],[56,46],[18,58],[8,58]],'wood');R(56,30,32,18,'metal');
      if(t===1){R(88,30,120,14,'metal');R(60,46,14,24,'wood');tape(120,30,10,14);tape(160,30,10,14);}
      else{R(86,20,48,34,'metal2');C(98,30,4,'dark');C(110,30,4,'dark');C(122,30,4,'dark');C(98,44,4,'dark');C(110,44,4,'dark');C(122,44,4,'dark');
        R(134,22,72,26,'metal');C(206,35,9,'dark');R(150,48,10,18,'wood');R(66,48,14,22,'dark');
        if(t>=3)R(100,10,20,10,'dark');if(t>=3)C(116,15,2.6,'glow');}
      if(t===3)R(134,22,72,5,'tape');stripes(140,40,60,6);break;
    case 'bow':
      P([[8,38],[124,32],[124,42],[22,58],[8,56]],'wood');R(124,32,92,7,'metal');
      L(182,34,206,4,t===1?6:5,'metal2');L(182,38,206,68,t===1?6:5,'metal2');
      if(t===4){C(206,6,6,'dark');C(206,66,6,'dark');}
      L(206,4,150,35,1.6,'tape');L(206,68,150,35,1.6,'tape');
      R(150,29,82,3,'dark');P([[232,26],[242,30.5],[232,35]],'metal');
      P([[60,42],[76,42],[72,66],[58,66]],'dark');
      tape(186,24,10,6);if(t>=3&&!sp)reddot(130,18);if(t===4)scope(128,16,40);stripes(30,40,40,6);break;
    case 'melee':
      if(t===1){L(20,64,226,22,7,'metal');for(let i=0;i<10;i++){const x=40+i*18;L(x,64-(x-20)*.2-4,x+4,64-(x-20)*.2+4,1.5,'dark');}R(14,58,34,12,'tape');}
      else if(t===2){R(16,36,60,13,'wood');R(10,34,8,17,'dark');R(74,32,8,21,'dark');P([[82,33],[200,26],[228,38],[204,50],[82,49]],'metal');L(90,44,200,44,1.5,'dark');}
      else if(t===3){P([[14,38],[60,36],[226,26],[232,40],[226,56],[60,46],[14,46]],'wood');R(14,36,40,12,'tape');
        for(let i=0;i<9;i++){const x=120+i*12;L(x,30-(i%2)*2,x+4,20,2,'metal');L(x+5,52,x+9,62,2,'metal');}}
      else{R(14,40,186,10,'wood');stripes(20,40,60,10);R(14,40,22,10,'tape');P([[186,20],[212,20],[230,45],[212,70],[196,70],[200,45]],'metal');P([[186,24],[168,32],[186,40]],'metal');}
      break;
  }
  return S;
}
const SPAL={
  lullaby:{metal:'#e8e2d0',metal2:'#c9c0aa',wood:'#b89ab0',dark:'#3a3238',tape:'#d8b8c8',glow:'#ffffff'},
  piper:{metal:'#8a6a3a',metal2:'#6a4e2a',wood:'#5a3a22',dark:'#2a1e14',tape:'#c9a54a',glow:'#ff3a2a'},
  dawn:{metal:'#d06a1c',metal2:'#a24e14',wood:'#5a2e1a',dark:'#2a1a12',tape:'#f2c21b',glow:'#ffde5a'},
  thunder:{metal:'#4a4f52',metal2:'#33383a',wood:'#6a3e22',dark:'#1e1a16',tape:'#d9b24a',glow:'#d9b24a'},
  lineman:{metal:'#3a4a52',metal2:'#2a363c',wood:'#c87a3a',dark:'#161c20',tape:'#e8e4d8',glow:'#7ad8ff'},
  harvester:{metal:'#8a9090',metal2:'#5a6060',wood:'#b8322a',dark:'#1d1d1b',tape:'#e0c060',glow:'#f2a516'},
  lastword:{metal:'#26282a',metal2:'#18191a',wood:'#2c2a28',dark:'#0f1010',tape:'#d8d0b8',glow:'#ff4030'},
  hive:{metal:'#2a2a24',metal2:'#1c1c18',wood:'#e9c02a',dark:'#141410',tape:'#e9c02a',glow:'#ffd84a'},
  digger:{metal:'#4a4640',metal2:'#33302c',wood:'#5a4a3a',dark:'#1a1714',tape:'#9a9488',glow:'#d6432f'},
};
function specialShapes(sp){
  const base={lullaby:'side',piper:'gl',dawn:'shot',thunder:'shot',lineman:'ar',harvester:null,lastword:'hunt',hive:'smg',digger:'bow'}[sp];
  let S=base?shapes(base,base==='hunt'||base==='ar'?3:2,true):[];
  const R=(x,y,w,h,r)=>S.push(['r',x,y,w,h,r]),P=(p,r)=>S.push(['p',p,r]),C=(x,y,rad,r)=>S.push(['c',x,y,rad,r]),L=(a,b,c,d,w,r)=>S.push(['l',a,b,c,d,w,r]);
  switch(sp){
    case 'lullaby':C(70,34,7,'metal2');L(70,34,56,22,3,'dark');C(56,22,3,'tape');for(let i=0;i<5;i++)L(80+i*16,30,88+i*16,36,1.4,'tape');break;
    case 'piper':S=S.filter(s=>!(s[0]==='c'&&s[1]===206));P([[200,22],[238,4],[238,68],[200,48]],'tape');L(238,4,238,68,3,'dark');C(70,38,7,'tape');C(70,38,3,'dark');C(112,14,7,'glow');break;
    case 'dawn':for(let i=0;i<7;i++){const a=-1.4+i*.47;L(90,37,90+Math.cos(a)*22,37+Math.sin(a)*22,2,'tape');}C(90,37,6,'glow');break;
    case 'thunder':S=[];P([[4,30],[74,24],[74,48],[16,64],[4,62]],'wood');R(74,22,40,28,'metal');R(114,20,118,13,'metal');R(114,33,118,13,'metal2');
      R(30,40,26,8,'tape');R(4,34,10,26,'dark');R(88,48,20,3,'dark');C(232,26.5,5,'dark');C(232,39.5,5,'dark');break;
    case 'lineman':for(let i=0;i<6;i++)R(188+i*7,27,4,14,'wood');C(150,22,5,'tape');C(166,22,5,'tape');
      L(212,34,226,24,1.8,'glow');L(226,24,234,38,1.8,'glow');L(234,38,242,28,1.8,'glow');break;
    case 'harvester':R(30,22,78,40,'wood');R(40,14,44,10,'dark');L(24,30,30,62,5,'dark');P([[108,30],[226,30],[236,38],[226,46],[108,46]],'metal');
      for(let i=0;i<14;i++){const x=112+i*8.4;P([[x,30],[x+4,24],[x+8,30]],'dark');P([[x,46],[x+4,52],[x+8,46]],'dark');}R(50,36,40,10,'tape');L(130,36,200,40,2,'tape');break;
    case 'lastword':for(let i=0;i<12;i++)L(16+i*4,46,18+i*4,56,1.2,'tape');L(14,51,64,47,1.2,'tape');R(222,22,22,13,'dark');C(160,13,3,'glow');break;
    case 'hive':for(let r=0;r<2;r++)for(let i=0;i<6;i++)C(168+i*10+(r%2)*5,30+r*9,5,i%2?'wood':'dark');for(let i=0;i<6;i++)R(70+i*15,26,7,20,'wood');break;
    case 'digger':P([[8,36],[34,30],[40,56],[14,62],[2,50]],'metal');L(182,34,206,4,6,'dark');L(182,38,206,68,6,'dark');R(232,27,10,8,'glow');L(242,31,248,24,1.4,'tape');break;
  }
  return S;
}

const GUNMODEL={};
function buildGun(I){
  const S=I.sp?specialShapes(I.sp):shapes(I.cls,I.tier),pal=I.sp?SPAL[I.sp]:PAL[I.tier],L=wstat(I).len*.85,s=L/240,th=Math.max(.03,L*.05),gx=CLS[I.cls].gx;
  const K={g:new THREE.Group(),b:new Map(),r:new Map(),ob:[]};
  const X=x=>(x-gx)*s,Y=y=>-(y-42)*s,mat=r=>FLAT(parseInt((pal[r]||'#888888').slice(1),16),true);
  for(const sh of S){const role=sh[sh.length-1],m=mat(role);
    if(sh[0]==='r')kAdd(K,0,m,BOX(th,sh[4]*s,sh[3]*s),0,Y(sh[2]+sh[4]/2),X(sh[1]+sh[3]/2));
    else if(sh[0]==='c')kAdd(K,0,m,CYL(sh[3]*s,sh[3]*s,th*1.15,10),0,Y(sh[2]),X(sh[1]),0,0,Math.PI/2);
    else if(sh[0]==='l'){const dz=X(sh[3])-X(sh[1]),dy=Y(sh[4])-Y(sh[2]),len=Math.hypot(dz,dy);if(len<1e-4)continue;
      kAdd(K,0,m,BOX(th*.9,Math.max(sh[5]*s,.006),len),0,(Y(sh[2])+Y(sh[4]))/2,(X(sh[1])+X(sh[3]))/2,0,Math.atan2(-dy,dz),0);}
    else{const shp=new THREE.Shape();sh[1].forEach((p,i)=>i?shp.lineTo(X(p[0]),Y(p[1])):shp.moveTo(X(p[0]),Y(p[1])));
      const geo=new THREE.ExtrudeGeometry(shp,{depth:th,bevelEnabled:false});kAdd(K,0,m,geo,th/2,0,0,-Math.PI/2);geo.dispose();}}
  kBake(K,0);return K.g;
}
function gunModel(I){const k=I.sp||I.cls+I.tier;if(!GUNMODEL[k])GUNMODEL[k]=(!I.sp&&kitGun(k))||buildGun(I);return GUNMODEL[k].clone();}
function equipVisual(){gun.clear();const I=curW();if(I)gun.add(gunModel(I));if(typeof muzzleFlash!=='undefined')gun.add(muzzleFlash.grp);}
function spawnWDrop(I,x,z){
  const g=new THREE.Group();g.position.set(x,.12,z);const m=gunModel(I);m.rotation.z=Math.PI/2;m.rotation.y=rand(0,6.28);m.scale.setScalar(1.5);g.add(m);
  const col=new THREE.Color(wstat(I).col);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,12,6,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=6;g.add(beam);
  scene.add(g);wdrops.push({I,g,x,z,t:0});
}
function updateWDrops(dt){
  for(let i=wdrops.length-1;i>=0;i--){const d=wdrops[i];d.t+=dt;
    const pd=Math.hypot(d.x-player.x,d.z-player.z);
    if(player.alive&&pd<1.4){dropWD(d);wdrops.splice(i,1);Sound.play('epic');acquire(d.I);}
    else if(pd>260||d.t>600){dropWD(d);wdrops.splice(i,1);}}
}
function dropWD(d){scene.remove(d.g);const bm=d.g.children[1];if(bm){bm.geometry.dispose();bm.material.dispose();}
}

/* ----- firing ----- */
function setWeapon(k){if(!LO[k]||player.weapon===k)return;WA.swap=.35;player.weapon=k;player.reloadT=0;player.fireCd=.25;LO[k].stacks=0;equipVisual();Sound.play('reload');refreshSlots();}
function cycleWeapon(dir){const own=SLOTS.filter(k=>LO[k]);let i=own.indexOf(player.weapon);i=(i+dir+own.length)%own.length;setWeapon(own[i]);}
function startReload(){
  const I=curW(),w=wstat(I);if(player.reloadT>0||I.mag>=w.mag||w.battery)return;
  if(w.melee&&!w.saw)return;
  if(w.saw){if(comp.CHM<=0){Sound.play('empty');toast('No Chem to refuel the Harvester','bad');return;}}
  else if(!w.infinite&&ammo[w.ammo]<=0){Sound.play('empty');return;}
  player.reloadT=player.reloadMax=w.saw?1.5:w.reload*(1-.12*PERK('hands'));Sound.play('reload',1,null,null,{cls:w.cls,t:player.reloadMax});
  if(!w.saw&&w.cls!=='shot'&&w.cls!=='bow'&&w.cls!=='rev'&&w.cls!=='gl')setTimeout(()=>{if(player.reloadT<=0)return;const p=particles[pIdx=(pIdx+1)%particles.length];gun.getWorldPosition(_va);
    p.m.material=PART_M.debris||p.m.material;p.m.geometry=BOX(.06,.16,.1);p.m.scale.setScalar(1);p.m.visible=true;p.m.position.set(_va.x,_va.y-.1-gH(_va.x,_va.z),_va.z);p.vx=rand(-.4,.4);p.vz=rand(-.4,.4);p.vy=.5;p.life=3;p.bounce=true;p.casing=false;Sound.play('clink',.6);},player.reloadMax*280);
}
function finishReload(){
  const I=curW(),w=wstat(I);I.stacks=0;
  if(w.saw){if(comp.CHM>0){comp.CHM--;I.mag=w.mag;}return;}
  const need=w.mag-I.mag;if(w.infinite)I.mag=w.mag;else{const take=Math.min(need,ammo[w.ammo]);I.mag+=take;ammo[w.ammo]-=take;}
}
function muzzlePos(){const dx=Math.sin(player.yaw),dz=Math.cos(player.yaw);const L=.62+wstat(curW()).len;return{x:player.x+dx*L,z:player.z+dz*L};}
function tryFire(){
  if(!player.alive||player.swim||player.climb||player.mantle>0)return;const I=curW(),w=wstat(I);
  if(player.reloadT>0||player.fireCd>0)return;
  if(w.melee&&!w.saw){meleeSwing(w);return;}
  if(wdur(I)<=0){player.fireCd=.5;Sound.play('empty');toast(`${w.name} is broken. Repair it.`,'bad');return;}
  if(I.mag<=0){player.fireCd=.3;if(w.saw)startReload();else if(w.battery){}else if(w.infinite||ammo[w.ammo]>0)startReload();else{Sound.play('empty');toast(`${w.name} is out of ammo`,'bad');}return;}
  I.mag--;player.fireCd=w.rate;if(Math.random()<.1*PERK('scrounge'))I.mag++;
  if(w.saw){sawTick(w);return;}
  if((w.jam&&Math.random()<1/40)||(wdur(I)<25&&Math.random()<(1/18)*(1-.5*Math.min(1,PERK('gunnut'))))){player.fireCd=1;Sound.play('empty');toast(`${w.name} jammed`,'bad');return;}
  const mp=muzzlePos();SHOT={w,I,kills:0};
  const dmg=w.dmg*(w.stacks?1+.2*I.stacks:1)*(1+.08*PERK('marks')+TK('gun'))*(wdur(I)<30?.85:1)*(PERK('laststand')&&player.hp<player.maxHp*.25?1.3:1);
  const spr=w.spread*(1-player.ads*(w.pellets>1?.35:.7)*(1+.15*PERK('steady')))*(player.crouch?.85:1)*(player.sprinting?1.5:1)*(1+.35*coldAmt());
  if(w.projectile){const dist=clamp(Math.hypot(aim.x-player.x,aim.z-player.z),3,w.range);const a=player.yaw;
    lob('gren',mp.x,1.4,mp.z,player.x+Math.sin(a)*dist,player.z+Math.cos(a)*dist,26,{dmg,radius:w.radius,impact:true,siren:w.siren});}
  else{const cone=TP?shotCone(w):0;
    for(let i=0;i<w.pellets;i++){const a=player.yaw+(TP?0:WA.yawOff)+rand(-spr,spr);
      CRITF=Math.random()<(w.crit||0)+.05*PERK('deadeye')+.015*ATTR('per')+TK('crit');
      // third and first person: a 3D ray through the reticle (29c-aim3d.js); the top-down view keeps the flat shot
      const r=TP?hitscan3(w,w.sticky?20:dmg*(CRITF?2:1),w.pierce||1,w.knock||2,w.chain?0x7ad8ff:w.burn?0xffa040:0xffe7a0,cone):hitscan(mp.x,mp.z,Math.sin(a),Math.cos(a),w.range,w.sticky?20:dmg*(CRITF?2:1),w.pierce||1,w.knock||2,w.chain?0x7ad8ff:w.burn?0xffa040:0xffe7a0);
      CRITF=false;
      if(w.sticky)STICKY.push({x:r.x,z:r.z,t:2,tgt:r.first,dmg,r:w.radius,m:stickyMesh(r.x,r.z)});}
    if(!w.sticky&&w.cls!=='bow'&&!w.chain)ejectCasing(w.shell);}
  if(PERK('chamber')&&SHOT.kills&&w.mag){I.mag=Math.min(w.mag,I.mag+1);player.fireCd*=.7;}
  wearWeapon(I,w);
  if(w.stacks){if(SHOT.kills)I.stacks=Math.min(5,I.stacks+SHOT.kills);if(I.mag===0&&SHOT.kills){I.mag=2;toast('Last Word: 2 rounds back','epic');}}
  SHOT=null;
  muzzleLight.position.set(mp.x,1.5+gH(mp.x,mp.z),mp.z);muzzleLight.intensity=w.noise<10?.6:3;
  if(w.kick)knockPlayer(-Math.sin(player.yaw),-Math.cos(player.yaw),w.kick);
  S.shake=Math.max(S.shake,w.shake);Sound.play(w.chain?'arc':w.sfx,w.noise<10?.5:1,null,null,w.sup?{sup:true}:null);if(w.noise>1)makeNoise(player.x,player.z,w.noise*noiseMask());onShotFx(w);
  player.recoil=.08;
  if(I.mag===0&&!w.battery&&(w.infinite||ammo[w.ammo]>0))startReload();
}
function meleeTargets(range,max){
  const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),out=[];
  for(const z of zombies){if(z.dying)continue;const dx=z.x-player.x,dz=z.z-player.z,d=Math.hypot(dx,dz);if(d<range+z.def.r&&(dx*fx+dz*fz)/(d||1)>.3)out.push({t:z,k:'z',d});}
  nearAgents(player.x,player.z,range+.5,a=>{const dx=a.x-player.x,dz=a.z-player.z,d=Math.hypot(dx,dz);if(d<range+.4&&(dx*fx+dz*fz)/(d||1)>.3)out.push({t:a,k:'a',d});});
  out.sort((a,b)=>a.d-b.d);return out.slice(0,max);
}
function meleeSwing(w){
  player.fireCd=w.rate;player.swing=.25;heroAction('chop',{from:.36,speed:clamp(1/Math.max(.25,w.rate),1.4,2.6),dur:Math.min(.55,w.rate)});Sound.play('swing');rumble(w.rum[0],w.rum[1],w.rum[2]);
  const T=meleeTargets(w.range,w.cleave+PERK('whirl')),fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);SHOT={w,I:curW(),kills:0};
  const md=w.dmg*(1+.2*PERK('brawler')+.05*ATTR('str')+TK('melee'))*(wdur(curW())<=0?.3:1)*(PERK('laststand')&&player.hp<player.maxHp*.25?1.3:1),kn=w.knock*(PERK('bonebreak')?1.5:1);
  for(const o of T){dmgTarget(o.t,o.k,md,fx*kn,fz*kn,true);onHit(o.t,o.k,md,true);}
  if(T.length)wearWeapon(curW(),w);
  if(PERK('butcher')){const k=T.filter(o=>o.t.dying).length;if(k){player.hp=Math.min(player.maxHp,player.hp+4*k);player.st=Math.min(100,player.st+12*k);}}
  for(const an of animalsInArc(w.range+.4))hitAnimal(an,md,fx*w.knock,fz*w.knock);
  SHOT=null;meleeWindows(w.range);makeNoise(player.x,player.z,w.noise);if(T.length){Sound.play('thud',.8);S.shake=Math.max(S.shake,.12);}
}
function sawTick(w){
  player.swing=.06;Sound.play('saw');if(Math.random()<.3)makeNoise(player.x,player.z,w.noise);
  const T=meleeTargets(w.range,w.cleave),fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);
  if(T.length)wearWeapon(curW(),w);
  for(const o of T){const brute=o.k==='z'&&(o.t.type==='brute'||o.t.type==='boss');dmgTarget(o.t,o.k,w.dmg,fx*(brute?2.5:1.2),fz*(brute?2.5:1.2),true);
    if(Math.random()<.4)burst(o.t.x,1.2,o.t.z,2,'blood',4);}
  if(T.length){S.shake=Math.max(S.shake,.08);rumble(.3,.5,60);}
}
function dmgTarget(o,k,d,kx,kz,quiet){
  if(SHOT&&unaware(o,k)){const m=SHOT.w.melee&&!SHOT.w.saw?3:SHOT.w.cls==='bow'?2:1;if(m>1){d*=m;SNEAKF=true;}}
  if(k==='z')damageZombie(o,d,kx,kz);
  else{if(SHOT&&SHOT.w.unaware&&o.h.state!=='hunt')d*=2;hitAgent(o,d,kx,kz,quiet||(SHOT&&SHOT.w.quiet));}
  SNEAKF=false;
}
function nearestTarget(x,z,r,skip){
  let best=null,bd=r;
  for(const zb of zombies){if(zb.dying||skip.has(zb))continue;const d=Math.hypot(zb.x-x,zb.z-z);if(d<bd){bd=d;best={t:zb,k:'z'};}}
  nearAgents(x,z,r,a=>{if(skip.has(a))return;const d=Math.hypot(a.x-x,a.z-z);if(d<bd){bd=d;best={t:a,k:'a'};}});
  return best;
}
// on-hit effects for the shot being fired: kill count, fire, ricochet
function onHit(o,k,d,isMelee){
  if(!SHOT)return;const w=SHOT.w;
  if(o.dying)SHOT.kills++;
  if(w.burn&&!o.dying){o.burn=3;o.burnD=w.burn;o.burnSpread=!!w.spreadFire;}
  if(w.bounce&&!isMelee){const n=nearestTarget(o.x,o.z,6,new Set([o]));if(n){tracer(o.x,o.z,n.t.x,n.t.z,0xffd84a,1.3);dmgTarget(n.t,n.k,d*.6,0,0);if(n.t.dying)SHOT.kills++;}}
  if(w.cls==='bow'&&!w.sticky&&Math.random()<.7)ammo.bolt++;
}
function chainFrom(o,k,d){
  const w=SHOT.w,rain=W.rain>.3,n=rain?7:w.chain,seen=new Set([o]);let c=o;d*=rain?1.3:1;
  for(let i=0;i<n;i++){const nx=nearestTarget(c.x,c.z,6,seen);if(!nx)break;seen.add(nx.t);d*=.8;
    tracer(c.x,c.z,nx.t.x,nx.t.z,0x7ad8ff,1.4);dmgTarget(nx.t,nx.k,d,0,0);if(nx.t.dying)SHOT.kills++;burst(nx.t.x,1.3,nx.t.z,2,'spark',3);c=nx.t;}
}
const stickyGeo=new THREE.BoxGeometry(.18,.18,.3),stickyMat=new THREE.MeshBasicMaterial({color:0xd6432f});
function stickyMesh(x,z){const m=new THREE.Mesh(stickyGeo,stickyMat);m.position.set(x,1.1,z);scene.add(m);return m;}
const lureGeo=new THREE.CylinderGeometry(.22,.22,.6,8),lureMat=new THREE.MeshBasicMaterial({color:0xff3a2a});
function updateSpecials(dt){
  // lineman battery recharges when you stop firing
  const L=LO.special;if(L){const w=wstat(L);if(w.battery&&player.fireCd<-.6)L.mag=Math.min(w.mag,L.mag+dt*12);}
  for(let i=STICKY.length-1;i>=0;i--){const s=STICKY[i];s.t-=dt;
    if(s.tgt&&!s.tgt.t.dying){s.x=s.tgt.t.x;s.z=s.tgt.t.z;}s.m.position.set(s.x,1.1,s.z);s.m.visible=(s.t*6|0)%2===0;
    if(s.t<=0){scene.remove(s.m);STICKY.splice(i,1);explode(s.x,s.z,s.r,s.dmg,{color:0xff7a2a,hurt:30});}}
  for(let i=LURES.length-1;i>=0;i--){const l=LURES[i];l.t-=dt;l.snd-=dt;l.m.material.color.setHex((l.t*4|0)%2?0xff3a2a:0x6a1010);
    if(l.quiet){if(l.t<=0)LURES.splice(i,1);continue;}
    if(l.snd<=0){l.snd=.9;Sound.play('siren',clamp(1-Math.hypot(l.x-player.x,l.z-player.z)/90,.15,1));}
    if(l.t<=0){scene.remove(l.m);l.m.material.dispose();LURES.splice(i,1);explode(l.x,l.z,l.r,l.dmg,{color:0xff9a3a,hurt:40});}}
}
const lureFor=(x,z,r)=>LURES.find(l=>Math.hypot(l.x-x,l.z-z)<r);
function addLure(x,z,dmg,r){const m=new THREE.Mesh(lureGeo,lureMat.clone());m.position.set(x,.3,z);scene.add(m);
  LURES.push({x,z,t:12,snd:0,dmg,r,m});banner('SIREN','Every horde within 120 m is coming to the canister.','night');}
// fire: burning zombies take damage, and with spreading fire (Dawnbreaker) ignite their neighbours
function burnTick(o,k,dt){
  o.burn-=dt;const mul=1-.5*W.rain,d=o.burnD*dt*mul;
  if(k==='z')damageZombie(o,d,0,0,true);else{o.hp-=d;if(o.hp<=0)killAgent(o);}
  o._ba=(o._ba||0)+d;if(o._ba>=6||o.dying){dmgNum(o,o._ba,'burn',k==='z'?(o.barY||2.35*o.def.scale):2.3*o.s);o._ba=0;}
  if(Math.random()<dt*7)burst(o.x,1.3+Math.random()*.6,o.z,1,'spark',2);
  if(o.burnSpread&&Math.random()<dt*3*mul){const n=nearestTarget(o.x,o.z,1.6,new Set([o]));if(n&&!(n.t.burn>0)){n.t.burn=3;n.t.burnD=o.burnD;n.t.burnSpread=true;}}
}

function knockPlayer(nx,nz,f){player.kx+=nx*f;player.kz+=nz*f;}
function hitscan(ox,oz,dx,dz,range,dmg,pierce,knock,color,fromTurret){
  let block=range;
  const seenOb=new Set();
  const wwins=[];
  for(let st=0;st<=block;st+=OGC*.75){nearObs(ox+dx*st,oz+dz*st,0,o=>{if(seenOb.has(o))return;if(o.lvl!==undefined&&o.lvl!==(fromTurret?0:(player.lvl||0)))return;seenOb.add(o);
    if(o.win&&!o.win.broken){if(!fromTurret){const vx=o.x-ox,vz=o.z-oz,t=vx*dx+vz*dz;if(t>.3&&t<block){const px=vx-dx*t,pz=vz-dz*t;if(px*px+pz*pz<o.r*o.r*1.2)wwins.push([t,o.win]);}}return;}if(o.h!=null&&o.h<1.25+(fromTurret?1:(player.jy||0)))return;const vx=o.x-ox,vz=o.z-oz,t=vx*dx+vz*dz;if(t<.5||t>block)return;const px=vx-dx*t,pz=vz-dz*t;if(px*px+pz*pz<o.r*o.r*.6)block=t;});}
  block=homeRay(ox,oz,dx,dz,block,!fromTurret);
  const hits=[];
  const shLvl=fromTurret?0:(player.lvl||0);
  for(const z of zombies){if(z.dying||(z.lvl||0)!==shLvl)continue;const vx=z.x-ox,vz=z.z-oz,t=vx*dx+vz*dz;if(t<0||t>block+((z.jy||0)>.5?2.5:0))continue;const px=vx-dx*t,pz=vz-dz*t,r=z.def.r*1.05+.12;if(px*px+pz*pz<r*r)hits.push({z,t});}
  for(const b of barrels){if(!b.alive)continue;const vx=b.x-ox,vz=b.z-oz,t=vx*dx+vz*dz;if(t<0||t>block+.6)continue;const px=vx-dx*t,pz=vz-dz*t;if(px*px+pz*pz<.36)hits.push({b,t});}
  if(!fromTurret)for(const p of props){const vx=p.x-ox,vz=p.z-oz,t=vx*dx+vz*dz;if(t<.3||t>block)continue;const px=vx-dx*t,pz=vz-dz*t;if(px*px+pz*pz<p.r*p.r*.8)hits.push({p,t});}
  const seenA=new Set();
  for(let st=0;st<=block;st+=AHC*.8)nearAgents(ox+dx*st,oz+dz*st,.6,a=>{if(seenA.has(a)||shLvl)return;seenA.add(a);const vx=a.x-ox,vz=a.z-oz,t=vx*dx+vz*dz;if(t<0||t>block)return;const px=vx-dx*t,pz=vz-dz*t;if(px*px+pz*pz<.3)hits.push({a,t});});
  if(!fromTurret&&!shLvl)for(const an of animals){if(an.dead||an.state==='fly')continue;const vx=an.x-ox,vz=an.z-oz,t=vx*dx+vz*dz;if(t<0||t>block)continue;const px=vx-dx*t,pz=vz-dz*t,r=an.d.r+.18;if(px*px+pz*pz<r*r)hits.push({an,t});}
  hits.sort((a,b)=>a.t-b.t);
  let end=block,n=0,first=null;
  for(const h of hits){
    if(h.b){h.b.hp-=dmg;if(h.b.hp<=0&&h.b.fuse<0)h.b.fuse=.05;end=h.t;n=pierce;break;}
    if(h.an){hitAnimal(h.an,dmg,dx*knock,dz*knock);n++;end=h.t;crossHit();if(n>=pierce)break;continue;}
    if(h.p){const f=(knock*.9+dmg*.04);impulseProp(h.p,dx*f,dz*f,f*.35);burst(ox+dx*h.t,h.p.y+.2,oz+dz*h.t,2,'debris',3);Sound.play('thud',.4);end=h.t;n=pierce;break;}
    const o=h.a||h.z,k=h.a?'a':'z';dmgTarget(o,k,dmg,dx*knock,dz*knock);onHit(o,k,dmg);if(!first)first={t:o,k};n++;end=h.t;if(!fromTurret)crossHit();if(n>=pierce)break;
  }
  for(const [t,s] of HRAY)if(t<=end+.01)shatter(s);HRAY.length=0;for(const [t,W] of wwins)if(t<=end+.01)breakWin(W);
  if(n<pierce&&end===block&&block<range)burst(ox+dx*block,1.2,oz+dz*block,2,'spark',3);
  tracer(ox,oz,ox+dx*end,oz+dz*end,color,fromTurret?2:1.38);
  if(SHOT&&SHOT.w.chain&&first)chainFrom(first.t,first.k,dmg);
  return{x:ox+dx*end,z:oz+dz*end,first};
}
let crossT=0;function crossHit(){crossT=.1;}
const grenGeo=new THREE.SphereGeometry(.16,8,6),acidBallGeo=new THREE.SphereGeometry(.22,8,6);
function lob(kind,x,y,z,tx,tz,speed,o){
  const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);const T=clamp(d/speed,.35,1.4);
  const m=new THREE.Mesh(kind==='acid'?acidBallGeo:grenGeo,kind==='acid'?BASIC(0x9bff5a):M(0x2f3a2a));m.position.set(x,y,z);m.castShadow=true;scene.add(m);
  projs.push(Object.assign({kind,m,x,y,z,vx:dx/T,vz:dz/T,vy:(.2-y+.5*GRAV*T*T)/T,fuse:1.7},o||{}));
}
function spitAcid(x,z,tx,tz){Sound.play('spit',.7);lob('acid',x,1.9,z,tx,tz,14,{});}
function throwGrenade(){
  if(!player.alive)return;if(player.gren<=0){toast('No grenades. Find or buy some.','bad');return;}
  player.gren--;WA.throwT=.45;const dist=clamp(Math.hypot(aim.x-player.x,aim.z-player.z),3,15);
  lob('gren',player.x,1.8,player.z,player.x+Math.sin(player.yaw)*dist*.82,player.z+Math.cos(player.yaw)*dist*.82,15,{dmg:160,radius:5.5,fuse:1.8});Sound.play('throw');
}
function useMed(){
  if(!player.alive)return;if(player.med<=0){toast('No medkits left','bad');return;}
  if(player.hp>=player.maxHp){toast('Already at full health');return;}
  if(!useCD('med'))return;
  const hl=55+20*PERK('medic');player.med--;player.hp=Math.min(player.maxHp,player.hp+hl);Sound.play('heal');toast(`Patched up (+${hl} HP)`,'good');
}
function explode(x,z,r,dmg,o){
  o=o||{};
  for(const zb of zombies){if(zb.dying)continue;const d=Math.hypot(zb.x-x,zb.z-z);if(d<r+zb.def.r){const f=1-.5*Math.min(1,d/r);const ux=(zb.x-x)/(d||1),uz=(zb.z-z)/(d||1);damageZombie(zb,dmg*f,ux*11*f,uz*11*f,false,rand(6,10)*f);}}
  for(const b of barrels){if(b.alive&&b.fuse<0&&Math.hypot(b.x-x,b.z-z)<r)b.fuse=.18;}
  nearAgents(x,z,r+.5,a=>{const d=Math.hypot(a.x-x,a.z-z);if(d<r+.4){const f=1-.5*Math.min(1,d/r);hitAgent(a,dmg*f,(a.x-x)/(d||1)*9*f,(a.z-z)/(d||1)*9*f);}});
  for(const an of animals){if(an.dead)continue;const d=Math.hypot(an.x-x,an.z-z);if(d<r+an.d.r)hitAnimal(an,dmg*(1-.5*Math.min(1,d/r)),0,0);}
  for(const p of PLACED)if(p.type==='barricade'&&Math.hypot(p.x-x,p.z-z)<r+1)p.hp-=dmg;
  makeNoise(x,z,85);
  for(const p of props){const d=Math.hypot(p.x-x,p.z-z);if(d<r*1.6){const f=(1-d/(r*1.6));const ux=(p.x-x)/(d||1),uz=(p.z-z)/(d||1);impulseProp(p,ux*14*f,uz*14*f,9*f);}}
  for(const dr of sdoors){const d=Math.hypot(dr.px-x,dr.pz-z);if(d<r*1.5)dr.angV+=rand(-1,1)*14*(1-d/(r*1.5));}
  if(player.alive){const d=Math.hypot(player.x-x,player.z-z);if(d<r*1.3){if(o.hurt&&d<r)hurtPlayer(o.hurt*(1-.5*d/r));knockPlayer((player.x-x)/(d||1),(player.z-z)/(d||1),14*(1-d/(r*1.3)));}}
  if(o.wall)for(const s of ALLSEG)if(s.home||s.alive){const d=segDist(s,x,z);if(d<r)hitSeg(s,o.wall*(1-.5*d/r));}
  for(const s of hsegs)if(s.kind==='win'&&s.st.glass&&segDist(s,x,z)<r+1.5)shatter(s);
  nearObs(x,z,r+1.5,o=>{if(o.win&&!o.win.broken&&Math.hypot(o.x-x,o.z-z)<r+1.5)breakWin(o.win);});
  blastFx(x,z,r,o.color);decal(x,z,r*.95,0x0f0d0b,.75);burst(x,.6,z,14,'spark',9);burst(x,.6,z,8,'smoke',3);burst(x,.4,z,8,'debris',7);
  boomLight.position.set(x,2.5+gH(x,z),z);boomLight.intensity=4;
  const pd=Math.hypot(player.x-x,player.z-z);S.shake=Math.max(S.shake,clamp(1-pd/40,.15,.8));
  Sound.play('boom',clamp(1-pd/70,.2,1),x,z);rumble(clamp(1-pd/35,0,1),clamp(1-pd/50,0,1)*.7,350);
}
// health loss that isn't a hit (falls, cold, drowning): still honours Second wind
function loseHP(d){player.hp-=d;if(player.hp<=0&&PERK('secondwind')&&S.swDay!==S.wave){S.swDay=S.wave;player.hp=30;toast('Second wind! Back on your feet with 30 HP.','epic');Sound.play('level');}if(player.hp<=0){player.hp=0;die();return true;}return false;}
function hurtPlayer(d){
  if(!player.alive)return;d*=D.dmg*(1-.1*armorOn())*(1-.06*PERK('hide'))*(S.env>.5?1-TK('night'):1);armorWear(d);S.lastHurt=S.time;player.hp-=d;
  if(player.hp<=0&&PERK('secondwind')&&S.swDay!==S.wave){S.swDay=S.wave;player.hp=30;toast('Second wind! Back on your feet with 30 HP.','epic');Sound.play('level');}player.hurtT=.35;Sound.play('hurt');heroHit();if(Math.random()<.4)decal(player.x+rand(-.4,.4),player.z+rand(-.4,.4),rand(.4,.7),0x5a0e0a,.7);S.shake=Math.max(S.shake,.2);burst(player.x,1.3,player.z,3,'blood',3);rumble(.6,.3,160);
  if(player.hp<=0){player.hp=0;die();}
}

