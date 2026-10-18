/* ================= LIFECYCLE ================= */
function die(){
  unlockMouse();clearDmgNums();clearStealthHUD();closePanel();closeLoot();endBuild();player.alive=false;S.over=true;if(!heroDeath()){pl.rotation.x=-Math.PI/2;pl.position.y=.3;}burst(player.x,1,player.z,20,'blood',6);rumble(1,1,700);
  const nights=Math.max(0,S.wave-(S.phase==='night'?1:0));
  const best=Math.max(store.get('deadacre.best',0),nights);store.set('deadacre.best',best);if(typeof setTicker==='function')setTicker();
  setTimeout(()=>{$('stNights').textContent=nights;$('stKills').textContent=S.kills;$('stCrates').textContent=S.looted;
    {const I=SHOW.inm||{num:'0000',first:'',last:'The contestant'};$('stPeak').textContent=Math.round(SHOW.peak).toLocaleString('en-US');
      $('overLine').textContent=`Inmate #${I.num} ${I.first} ${I.last} was ${S.phase==='night'?`overrun on night ${S.wave}`:`caught in the open on day ${S.wave+1}`}, after ${nights} night${nights===1?'':'s'} on air${nights>SHOW.rec0&&nights>0?', a new all-time record':`. The record is ${best}`}. ${SHOW_HOST}: "What a run, folks. Next week: a brand-new contestant."`;}
    $('bestLine2').textContent=`Best run: ${best} night${best===1?'':'s'} survived`;
    $('overScreen').hidden=false;document.body.classList.remove('playing');if(pad.active)setPadFocus($('againBtn'));},1400);
}
function resetGame(){
  camYaw=Math.PI;camPitch=.3;camera.near=TP?.15:.5;camera.updateProjectionMatrix();
  for(const z of zombies)removeZombie(z);zombies.length=0;
  for(const c of crates)dropCrate(c);crates.length=0;
  for(const p of pickups)scene.remove(p.m);pickups.length=0;
  for(const p of projs)scene.remove(p.m);projs.length=0;
  for(const a of acids)scene.remove(a.m);acids.length=0;
  closePanel();closeLoot();endBuild();resetSeasons();clearAnimals();resetRPG();resetWorld();resetExplore();resetHordes();resetGarden();
  Object.assign(base,{wallLv:0,turrets:0,turretLv:1,spikeLv:0,infLv:0,floods:0,radar:0});
  for(const s of segs){s.maxHp=WALL_HP[0];s.open=false;s.openAmt=0;}applyWalls(true);resetHome();applyTurrets();applyFloods();
  Object.assign(player,{x:0,z:1,vx:0,vz:0,kx:0,kz:0,yaw:0,hp:100,maxHp:100,st:100,alive:true,scrap:40,parts:0,med:1,gren:0,weapon:'pistol',fireCd:0,reloadT:0,hurtT:0,acidT:0,recoil:0});
  resetInv();pl.rotation.x=0;heroReset();
  Object.assign(player,{bld:null,wood:0,stone:0,food:1,seeds:3,swim:false,swing:0,drownMsg:0,crouch:false,crouchT:false,sprinting:false,moving:false,lvl:0,lvlY:0});S.takedowns=0;ALARMS.length=0;Object.assign(player,{jy:0,jvy:0,air:false,climb:null,mantle:0,winded:false,tired:0,landT:0,fall0:null});resetCraft();clearStealthHUD();S.armSel=null;clearDmgNums();
  Object.assign(S,{paused:false,menu:false,over:false,phase:'day',clock:25,cleared:false,dayT:DAY_LEN-25,wave:0,queue:[],spawnT:0,daySpawnT:14,kills:0,looted:0,shake:0,env:0,envT:0});
  updateGroundWindow();updateGrass();updateChunks(true);seedYardProps();spawnHorde(Math.round((GFX==='high'?40:28)*D.horde));
  refreshSlots();toasts.innerHTML='';postJobs();updateQuickHUD();
  setWeather('clear');W.rain=W.ash=W.fog=W.cloud=0;W.wet=0;W.flash=0;for(const d of decals)d.m.visible=false;
  camera.position.set(player.x+CAM_OFF.x,CAM_OFF.y,player.z+CAM_OFF.z);
}
function startGame(){
  Sound.init();resetGame();resetShow();S.running=true;setPadFocus(null);
  $('startScreen').hidden=true;$('overScreen').hidden=true;$('pauseScreen').hidden=true;$('menu').hidden=true;$('hud').hidden=false;
  if(isTouch&&!pad.active){$('touch').hidden=false;}else{$('crosshair').hidden=false;if(!pad.active)document.body.classList.add('playing');}
  banner('LIVE · DAY 1',`${D.name}. Survive as many nights as you can. Board up the cabin before dark, and give the audience a show.`,'dawn');
  const u=pad.active?'A':isTouch?'Use':'E';
  setTimeout(()=>toast(pad.active?'Left stick moves, right stick aims, RT fires.':isTouch?'Left stick moves, right stick aims and fires.':'WASD to move, mouse to aim, hold click to fire.'),900);
  setTimeout(()=>toast(`This cabin is home. Press ${u} at a window to nail boards over it (1 wood each) before night.`),2600);
}
$('startBtn').addEventListener('click',()=>{Sound.init();showIntro(startGame);});
{const t0=Date.now(),p=n=>String(n).padStart(2,'0');setInterval(()=>{const s=Math.floor((Date.now()-t0)/1000),txt=`${p(Math.floor(s/3600))}:${p(Math.floor(s/60)%60)}:${p(s%60)}`;document.querySelectorAll('.tvtc').forEach(e=>e.textContent=txt);},1000);}
function setTicker(){const b=store.get('deadacre.best',0),items=[`Zone 7 quarantine enters its third year`,b?`Longest run on record: ${b} night${b===1?'':'s'}`:`No contestant has set a record yet. Will tonight's?`,
  `Sponsored by VoltCola: stay charged, stay alive`,`Network denies reports of contestants being "encouraged" by drones`,`Hordes of over a hundred sighted near the Route 9 highway`,`Prairie Gold Jerky: real meat for real survivors`,`Viewers vote: board up, or go out swinging?`];
  $('tickerText').innerHTML=items.map(t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;')).join('<em>◆</em>');}
setTicker();
document.querySelectorAll('#diffPick button').forEach(b=>b.addEventListener('click',()=>{pickDiff(b.dataset.diff);Sound.init();Sound.play('ui');}));pickDiff(diffKey);
$('againBtn').addEventListener('click',()=>{showIntro(startGame);});
