/* ================= PHASES ================= */
const UNLOCK={2:'Runners are fast, and crawlers hide low in the grass.',3:'Spitters lob acid over walls. Troopers in body armor take twice the punishment.',4:'Boomers explode on contact.',5:'Brutes charge. The Abomination walks.'};
function startNight(early){
  if(S.phase!=='day')return;
  if(early&&S.dayT>3){const b=Math.floor(S.dayT/10);player.scrap+=b;toast(`Skipped to nightfall: +${b} scrap`);}
  S.clock=DAY_LEN;S.cleared=false;
  for(const z of zombies)if(!z.dying){z.aware=true;z.always=true;z.sus=1;}S.tailT=0;
  S.wave++;S.phase='night';S.queue=buildWave(S.wave);S.spawnT=1;
  setTimeout(()=>setWeather(rollWeather(true),true),2200);
  banner(`NIGHT ${S.wave}`,UNLOCK[S.wave]||`${S.queue.length} infected incoming. Hold the house.`,'night');Sound.play('night');rumble(.5,.5,400);
  if(Math.random()<D.nightHorde*(S.wave>=2?.55:.2)){let hh=null,hd=1e9;for(const h of hordes){if(h.alive>0&&h.state==='roam'){const d=Math.hypot(h.cx,h.cz);if(d<hd){hd=d;hh=h;}}}
    if(hh){hh.state='siege';hh.siege=true;hh.known=true;setTimeout(()=>banner('HORDE INCOMING',`${hh.alive} infected are marching on the farmstead from the ${compass(Math.atan2(hh.cx,hh.cz))}.`,'night'),3400);}}
  if((S.wave>=2||diffKey==='nightmare')&&hordes.filter(h=>h.alive>0).length<4&&Math.random()<.2+.35*D.nightHorde){
    const nh=spawnHorde(Math.round((12+S.wave*6)*D.horde));nh.night=true;nh.known=true;nh.state=Math.hypot(player.x,player.z)<40?'siege':'roam';nh.siege=nh.state==='siege';
    setTimeout(()=>toast(`A night horde of ${nh.alive} is moving in from the ${compass(Math.atan2(nh.cx-player.x,nh.cz-player.z))}.`,'bad'),5200);}
  if(HOME.door.alive&&HOME.door.open)setTimeout(()=>toast('Your front door is still open','bad'),1200);
  const open=base.wallLv?gates.filter(g=>g.alive&&g.open):[];if(open.length)setTimeout(()=>toast(`The ${open.map(g=>g.side).join(' and ')} gate${open.length>1?'s are':' is'} still open`,'bad'),800);
}
function endNight(){
  S.phase='day';S.clock=0;onDawnSeason();S.dayT=DAY_LEN;S.daySpawnT=10;
  for(const z of zombies)if(!z.dying){z.always=false;if(pd0(z)>45){z.dying=true;z.dieT=2.9;z.g.visible=false;z.bg.visible=z.fg.visible=false;}}
  postJobs();
  const sc=20+S.wave*10,pa=1+Math.floor(S.wave/2);player.scrap+=sc;player.parts+=pa;
  banner('DAWN',`Night ${S.wave} survived. +${sc} scrap, +${pa} parts.`,'dawn');Sound.play('dawn');
  store.set('deadacre.best',Math.max(store.get('deadacre.best',0),S.wave));
  refreshLoot();spoilFood();
  for(const h of hordes)if(h.alive>0)addAgents(h,Math.round((5+S.wave*2)*D.horde),h.cx,h.cz);
  if(hordes.length<(S.wave>=3?3:2)){const h=spawnHorde(Math.round((20+S.wave*9)*D.horde));setTimeout(()=>toast(`A new horde of ${h.alive} is roaming the ${compass(Math.atan2(h.cx,h.cz))}.`,'bad'),4200);}
  setTimeout(()=>setWeather(rollWeather(false),true),2400);
  for(let i=0;i<30;i++){const a=rand(0,6.28),r=rand(70,140),x=Math.cos(a)*r,z=Math.sin(a)*r;if(blockedSpot(x,z,2))continue;
    spawnCrate(x,z,'drop');setTimeout(()=>toast(`Network supply drop ${Math.round(r)}m ${compass(Math.atan2(x-player.x,z-player.z))}. Follow the red flare.`,'bad'),1500);break;}
}
/* the clock: one full day is 12 real minutes. 06:00 dawn → 20:00 dusk is 8 minutes of daylight, then 4 minutes of night.
   Nights are timed: survive (or keep exploring) until dawn; clearing the wave just makes the rest of the night quieter. */
let DAY_LEN=480;const CYCLE=720;
function clockHours(c){c=c==null?S.clock:c;return(6+(c<DAY_LEN?c/DAY_LEN*14:14+(c-DAY_LEN)/(CYCLE-DAY_LEN)*10))%24;}
function clockStr(){const h=clockHours(),hh=Math.floor(h),mm=Math.floor((h-hh)*60);return String(hh).padStart(2,'0')+':'+String(mm-mm%5).padStart(2,'0');}
// sun arc: east at 06:00, overhead at 13:00, west at 20:00; the moon takes over at night
function sunAngle(){const h=clockHours();return h>=6&&h<20?(h-6)/14*Math.PI:((h+4)%24)/10*Math.PI;}
function nightAmt(c){c=c==null?S.clock:c;return c<(DAY_LEN+CYCLE)/2?sstep(DAY_LEN-35,DAY_LEN+12,c):1-sstep(CYCLE-36,CYCLE,c);}
function updatePhase(dt){
  S.clock+=dt;S.time=(S.time||0)+dt;S.envT=nightAmt();
  for(let i=zombies.length-1;i>=0;i--){const z=zombies[i];if(!z.dying&&!z.always&&Math.hypot(z.x-player.x,z.z-player.z)>150){removeZombie(z);zombies.splice(i,1);}}
  if(S.phase==='day'){
    S.dayT=DAY_LEN-S.clock;if(S.clock>=DAY_LEN)startNight(false);
    trickle(dt,D.day);
  }else{
    S.spawnT-=dt;const alive=zombies.filter(z=>!z.dying).length;
    if(S.queue.length&&S.spawnT<=0&&alive<45){S.spawnT=Math.max(.5,2.4-S.wave*.1);const p=edgeSpawn();spawnZombie(S.queue.shift(),p.x,p.z);}
    if(!S.queue.length&&!S.cleared&&alive===0){S.cleared=true;const sc=10+S.wave*5;player.scrap+=sc;gainXP(40+S.wave*15);toast(`Night ${S.wave} wave cleared. The dark goes quiet until dawn (+${sc} scrap).`,'good');}
    if(S.cleared)trickle(dt,Math.ceil(D.day*.6));
    if(S.clock>=CYCLE)endNight();
  }
}
// what wanders in by day: mostly walkers, with crawlers from the start and the specials joining as the nights go by
function roamerType(){const w=S.wave,s=D.spec,T=[['walker',60],['crawler',10],['runner',w>=1?10*s:3],['trooper',w>=2?6*s:0],['spitter',w>=2?5*s:0],['boomer',w>=3?4*s:0]];
  let t=0;for(const [,p] of T)t+=p;let r=Math.random()*t;for(const [k,p] of T){r-=p;if(r<=0)return k;}return'walker';}
function trickle(dt,cap){
  // towns are busier
  const town=bioC(Math.floor(player.x/CH),Math.floor(player.z/CH))==='town';if(town)cap=Math.round(cap*1.5);
  S.daySpawnT-=dt;if(S.daySpawnT<=0){S.daySpawnT=rand(4,7);const alive=zombies.filter(z=>!z.dying).length;if(alive<cap){
    // a straggler, or a little knot of them shuffling together
    const p=edgeSpawn(),n=Math.min(cap-alive,Math.random()<.35?randi(2,4):1),t0=roamerType();
    for(let i=0;i<n;i++){const x=p.x+rand(-2.5,2.5),zz=p.z+rand(-2.5,2.5);if(i&&blockedSpot(x,zz,.8))continue;const z=spawnZombie(i&&Math.random()<.6?t0:roamerType(),i?x:p.x,i?zz:p.z);z.aware=z.always=false;}}}
}

