/* ================= FOUR SEASONS =================
   Each season lasts three days. Day length, temperature, weather, the look of the land and what lives on it all change:
   spring rain and wildflowers, long hot summers, a short golden fall, and winters with snow cover, frozen lakes and wolves. */
const SEASONS=[
  {id:'spring',name:'Spring',day:480,temp:13,tint:[.96,1.06,.86],treeTint:0x000000,tk:0,gh:1,flowers:1,grow:1.35,banner:'Rain, mud and wildflowers. Crops grow fast.'},
  {id:'summer',name:'Summer',day:540,temp:27,tint:[1.06,1.02,.74],treeTint:0x000000,tk:0,gh:1.05,flowers:.6,grow:1,banner:'Long days and heat waves. Rest in the shade.'},
  {id:'fall',name:'Fall',day:450,temp:9,tint:[1.18,.86,.52],treeTint:0xc88a3a,tk:.28,gh:.9,flowers:.15,grow:.75,banner:'Harvest time. The nights draw in, and the wind picks up.'},
  {id:'winter',name:'Winter',day:390,temp:-7,tint:[1.1,1.12,1.18],treeTint:0xf0f4f8,tk:.42,gh:.38,flowers:0,grow:0,banner:'Lakes freeze over. Stay warm: campfires, coats and shelter.'},
];
const SEASON_WEATHER=[
  [['clear',2.4],['overcast',2],['rain',2.6],['storm',1],['fog',1.2]],
  [['clear',3.6],['heat',2.2],['overcast',1],['storm',1.4],['rain',.5]],
  [['overcast',2.4],['windy',2],['rain',1.6],['fog',1.6],['clear',1.5],['snow',.25]],
  [['snow',3],['blizzard',1.2],['overcast',1.6],['clear',1.6],['fog',1]],
];
Object.assign(WEATHER,{
  snow:{name:'Snowfall',rain:0,ash:0,snow:.65,fog:.35,cloud:.75,wind:.35,note:'snow muffles footsteps, cold bites'},
  blizzard:{name:'Blizzard',rain:0,ash:0,snow:1,fog:.9,cloud:1,wind:1.35,note:'whiteout: freezing cold, short sightlines'},
  heat:{name:'Heat wave',rain:0,ash:0,snow:0,fog:.1,cloud:0,wind:.08,note:'sprinting in the sun wears you out, the dead are sluggish'},
  windy:{name:'High winds',rain:0,ash:0,snow:0,fog:.05,cloud:.45,wind:1.15,note:'wind drowns out footsteps and carries thrown things'},
});
for(const w of Object.values(WEATHER))if(w.snow==null)w.snow=0;
const seasonIdx=()=>Math.floor(Math.max(0,S.wave-(S.phase==='night'?1:0))/3)%4;
const SEA={cur:0,blend:{tint:[...SEASONS[0].tint],gh:1,flowers:1,tk:0,snowCover:0,ice:0},treeMats:null,temp:13};
const groundSeasonU={tint:{value:new THREE.Vector3(...SEASONS[0].tint)},snow:{value:0}},grassSeasonU={gh:{value:1},flowers:{value:1}},waterIceU={value:0};
// season colour on tree foliage: remember each material's own colour once
function treeSeasonMats(){const L=[];const seen=new Set();
  for(const tm of Object.values(TREE_MODEL))tm.root.traverse(o=>{if(o.isMesh&&o.material&&o.material!==INK&&!seen.has(o.material)){seen.add(o.material);L.push(o.material);}});
  for(const [k,m] of Object.entries(texMatCache))if(k.startsWith('pine|')&&!seen.has(m)){seen.add(m);L.push(m);}
  for(const m of L)if(!m.userData.baseCol)m.userData.baseCol=m.color.clone();return L;}
function seasonDayLen(){return SEASONS[seasonIdx()].day;}
function onDawnSeason(){const i=seasonIdx();if(i!==SEA.cur){SEA.cur=i;const s=SEASONS[i];setTimeout(()=>banner(s.name.toUpperCase(),s.banner,'dawn'),3800);}
  S.season=i;DAY_LEN=SEASONS[i].day;}
function rollSeasonWeather(night){const pool=SEASON_WEATHER[seasonIdx()].map(([t,w])=>[t,w*(night&&(t==='storm'||t==='blizzard'||t==='fog')?1.4:1)]);
  let s=0;for(const p of pool)s+=p[1];let r=Math.random()*s;for(const p of pool){r-=p[1];if(r<=0)return p[0];}return'clear';}
// air temperature in °C: season, time of day, weather
function airTemp(){const s=SEASONS[S.season||0],h=clockHours();
  return s.temp+4*Math.sin((h-9)/24*Math.PI*2)-7*S.env-3*W.rain-6*W.snow-(W.type==='blizzard'?6:0)+(W.type==='heat'?9*(1-S.env):0)-2.5*Math.max(0,W.wind-.5);}
const seasonEase=(k,v,r)=>{SEA.blend[k]+=(v-SEA.blend[k])*r;return SEA.blend[k];};
function updateSeasons(dt){
  const si=S.season||0,s=SEASONS[si],r=Math.min(1,dt*.25);
  for(let i=0;i<3;i++)SEA.blend.tint[i]+=(s.tint[i]-SEA.blend.tint[i])*r;
  seasonEase('gh',s.gh,r);seasonEase('flowers',s.flowers,r);seasonEase('tk',s.tk,r);
  SEA.temp=airTemp();
  // snow cover builds while it snows and in deep cold, melts in the warm
  const cover=si===3?clamp(.7+W.snow*.3,0,1):W.snow>.3&&SEA.temp<1?Math.min(.8,SEA.blend.snowCover+dt*.01):0;
  SEA.blend.snowCover+=(cover-SEA.blend.snowCover)*Math.min(1,dt*(cover>SEA.blend.snowCover?.08:.02));
  // lakes freeze after a stretch of hard cold
  SEA.blend.ice=clamp(SEA.blend.ice+(SEA.temp<-2&&si===3?dt*.01:SEA.temp>2?-dt*.02:0),0,1);
  groundSeasonU.tint.value.set(...SEA.blend.tint);groundSeasonU.snow.value=SEA.blend.snowCover;grassSeasonU.gh.value=SEA.blend.gh*(1-.55*SEA.blend.snowCover);grassSeasonU.flowers.value=SEA.blend.flowers;
  grass.children[0].material.color.setRGB(...SEA.blend.tint).lerp(_white,SEA.blend.snowCover*.5);
  waterIceU.value=SEA.blend.ice;
  if(!SEA.treeMats||SEA.treeMats.n!==Object.keys(TREE_MODEL).length){SEA.treeMats=treeSeasonMats();SEA.treeMats.n=Object.keys(TREE_MODEL).length;}
  const tc=_tc.setHex(si===3?0xf0f4f8:s.treeTint||0x808080),tk=Math.max(SEA.blend.tk,SEA.blend.snowCover*.42);
  for(const m of SEA.treeMats){m.color.copy(m.userData.baseCol).lerp(tc,tk);}
  ICE=SEA.blend.ice>.85;
}
const _white=new THREE.Color(1,1,1),_tc=new THREE.Color();let ICE=false;
// walkable depth: frozen lakes carry the player
const walkDepth=(x,z)=>ICE?-1:depthAt(x,z);

/* ---------- body temperature ---------- */
function updateWarmth(dt){
  const t=SEA.temp,shelter=underLeanto(player.x,player.z),inside=INDOOR>.5||inBase(player.x,player.z)||shelter,fire=S.nearFire;player.warmBuff=Math.max(0,(player.warmBuff||0)-dt);
  let d=0;
  if(t<12&&!inside&&!fire&&!player.warmBuff){d=-(12-t)*.055*(1-(player.insul||0))*(1-.2*PERK('coldblood'))*(1-.04*ATTR('end'))*(1-TK('warm'))*(1+W.wet*.8+(player.swim?2.5:0)+Math.max(0,W.wind-.4)*.6);if(player.sprinting)d*=.6;}
  else d=(fire?7*(PERK('wilds')?2:1)*(shelter?1.3:1):inside?3.5:player.warmBuff?3:1.2);
  player.warm=clamp((player.warm==null?100:player.warm)+d*dt,0,100);
  player.hot=t>29&&!inside&&S.env<.4&&W.cloud<.3;
  if(player.warm<12&&player.alive){if(loseHP(1.6*dt))return;player.hurtT=Math.max(player.hurtT,.05);if(!player.freezeMsg){player.freezeMsg=1;toast('Freezing! Get to a fire, indoors or into a coat.','bad');}}
  else if(player.warm>25)player.freezeMsg=0;
  if(player.warm<35&&!player.coldMsg){player.coldMsg=1;toast('You\'re cold: stamina recovers slower and your aim shakes.','bad');}else if(player.warm>60)player.coldMsg=0;
  // breath fog in the cold
  if(t<4&&Math.random()<dt*1.4)burst(player.x+Math.sin(player.yaw)*.35,1.75+(player.jy||0),player.z+Math.cos(player.yaw)*.35,1,'smoke',.4);
}
const coldAmt=()=>clamp((40-(player.warm==null?100:player.warm))/40,0,1);

/* ---------- interactive weather ---------- */
// rain, snow, wind and thunder cover the sound you make
function noiseMask(){return clamp(1-.32*W.rain-.3*W.snow-.25*Math.max(0,W.wind-.5)-(S.thunderT>0?.45:0),.35,1);}
// footprints in the snow
let fpDist=0,fpSide=1;
function updateFootprints(dt){if(SEA.blend.snowCover<.35||player.swim||player.jy>.2||!player.moving)return;fpDist+=Math.hypot(player.vx,player.vz)*dt;
  if(fpDist>.75){fpDist=0;fpSide=-fpSide;const rx=Math.cos(player.yaw)*.14*fpSide,rz=-Math.sin(player.yaw)*.14*fpSide;decal(player.x+rx,player.z+rz,.2,0x8a96a6,.55);}}
// lightning prefers tall things: people on rooftops and lookouts, lone trees
function lightningTarget(cx,cz){
  if(player.alive&&(player.jy>3||player.climb)&&Math.random()<.4)return{x:player.x+rand(-1.5,1.5),z:player.z+rand(-1.5,1.5),player:true};
  if(Math.random()<.35){let best=null,bd=1e9;for(const t of trees){const d=Math.hypot(t.x-cx,t.z-cz);if(d>10&&d<36&&d<bd&&!t.burnt){bd=d;best=t;}}if(best){igniteTree(best);return{x:best.x,z:best.z};}}
  return null;
}
const BURNING=[];
function igniteTree(t){t.burnt=true;BURNING.push({t,life:12});addFirePatch(t.x,t.z,2.2,9,W.rain>.3?0:2);toast('Lightning set a tree on fire','bad');}
function updateBurning(dt){for(let i=BURNING.length-1;i>=0;i--){const b=BURNING[i];b.life-=dt;if(Math.random()<dt*14)burst(b.t.x+rand(-.8,.8),rand(1.5,4)*b.t.s,b.t.z+rand(-.8,.8),1,'spark',3);if(Math.random()<dt*5)burst(b.t.x,4*b.t.s,b.t.z,1,'smoke',2);
  if(b.life<=0){b.t.g.traverse(o=>{if(o.isMesh&&o.material!==INK&&!inkHulls.has(o))o.material=M(0x1c1814);});BURNING.splice(i,1);}}}
function seasonHUD(){const s=SEASONS[S.season||0],dIn=Math.max(0,S.wave-(S.phase==='night'?1:0))%3+1,t=Math.round(SEA.temp);
  const w=player.warm==null?100:player.warm,state=w<12?'<b class="warn">Freezing</b>':w<35?'<b class="warn">Cold</b>':player.hot?'<b class="hot">Hot</b>':player.warmBuff>0||S.nearFire?'<b class="ok">Warm</b>':'';
  return`${s.name} · day ${dIn} of 3 · ${t}°C${state?' · '+state:''}${ICE?' · lakes frozen':''}`;}
function resetSeasons(){SEA.cur=0;S.season=0;DAY_LEN=SEASONS[0].day;Object.assign(SEA.blend,{tint:[...SEASONS[0].tint],gh:1,flowers:1,tk:0,snowCover:0,ice:0});ICE=false;BURNING.length=0;S.thunderT=0;}


