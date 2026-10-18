$('diffBtn').addEventListener('click',()=>{setTicker();S.running=false;S.over=false;clearStealthHUD();$('overScreen').hidden=true;$('hud').hidden=true;$('crosshair').hidden=true;clearDmgNums();$('startScreen').hidden=false;if(pad.active)setPadFocus($('startBtn'));});
$('resumeBtn').addEventListener('click',togglePause);
$('muteBtn').addEventListener('click',toggleMute);
{const steps=[0,.25,.5,.75,1],lab={master:'Volume',music:'Music',sfx:'Effects'},ids={master:'volMaster',music:'volMusic',sfx:'volSfx'};
  const show=()=>{for(const k in ids)$(ids[k]).textContent=`${lab[k]}: ${Math.round(Sound.vol[k]*100)}%`;};show();
  for(const k in ids)$(ids[k]).addEventListener('click',()=>{const v=Sound.vol[k],i=steps.findIndex(s=>s>=v-.01);Sound.setVol(k,steps[(i+1)%steps.length]);show();Sound.play('ui');});}
$('vibBtn').textContent=`Vibration: ${VIB?'On':'Off'}`;$('vibBtn').addEventListener('click',()=>{VIB=!VIB;store.set('deadacre.vib',VIB);$('vibBtn').textContent=`Vibration: ${VIB?'On':'Off'}`;if(VIB)haptic(.6,.6,150,.6);});
$('quitBtn').addEventListener('click',()=>{S.paused=false;startGame();});
const best0=store.get('deadacre.best',0);$('bestLine').textContent=best0?`Best run: ${best0} night${best0===1?'':'s'} survived`:'';

function applyGfx(){
  const high=GFX==='high';store.set('deadacre.gfx',GFX);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,high?1.75:1));
  sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}
  grass.visible=high;for(const o of inkHulls)o.visible=high;if(high)buildPost();resize();
  $('gfxBtn').textContent=`Graphics: ${high?'High':'Low'}`;
}
$('gfxBtn').addEventListener('click',()=>{GFX=GFX==='high'?'low':'high';applyGfx();});
applyGfx();
resetGame();S.running=false;
setWeather('storm');W.boltT=2;
let last=performance.now(),hudT=0,mapT=0,idleA=0;
// one tick of the running game: streaming, the player, the infected and every other system, then the camera. The page loop
// calls it once per frame; the test harness calls it directly to fast-forward.
function stepWorld(dt){
    updateTerrain();updateChunks(false);updateGroundWindow();updateGrass();updateRoofs();updateSpin(dt);
    updatePhase(dt);updatePlayer(dt);updateZombies(dt);updateHordes(dt);updateProps(dt);updateDoors(dt);updateTurrets(dt);updateSpecials(dt);updateGarden(dt);updateHome(dt);updateShow(dt);updateFelling(dt);updateWDrops(dt);updateAnimals(dt);updateLandmarks(dt);updateExplore(dt);updateAlarms(dt);updateSeasons(dt);updateWarmth(dt);updateFootprints(dt);updateBurning(dt);updateFires(dt);updateNoisers(dt);updatePlaced(dt);updateCamp(dt);updateWeaponFx(dt);enforceCaps(dt);updateLootWin();audioTick(dt);updateWorld(dt);updateWeather(dt,player.x,player.z-2);updateEnv(dt);updateCamera(dt);
}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  pollPad(dt);
  if(S.running&&!S.paused&&!S.menu&&!S.over&&!S.panel){
    stepWorld(dt);
    hudT-=dt;if(hudT<=0){hudT=.08;updateHUD();}
    mapT-=dt;if(mapT<=0){mapT=.12;drawMinimap();}
    $('vignette').style.opacity=player.hurtT>0?Math.min(1,player.hurtT*2.5):0;
    crossT-=dt;$('crosshair').classList.toggle('hit',crossT>0);updateDmgNums(dt);updateStealthHUD();
  }else if(S.over){Sound.quiet(dt);if(HERO.ready)HERO.mixer.update(dt);updateZombies(dt);updateHordes(dt);updateProps(dt);updateDoors(dt);updateWorld(dt);updateWeather(dt,player.x,player.z-2);updateEnv(dt);}
  else if(!S.running){Sound.quiet(dt);idleA+=dt*.05;camera.position.set(Math.sin(idleA)*34,22,Math.cos(idleA)*34);camera.lookAt(0,0,0);updateWorld(dt);updateDoors(dt);updateWeather(dt,0,0);updateEnv(dt);
    sun.position.set(22,40,12);sun.target.position.set(0,0,0);}
  else{Sound.quiet(dt);if(gradePass)gradePass.uniforms.time.value=now/1000;}
  if(composer&&GFX==='high')composer.render();else renderer.render(scene,camera);
}
requestAnimationFrame(frame);
