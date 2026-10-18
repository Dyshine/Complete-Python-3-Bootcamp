/* ================= INPUT ================= */
const keys={};let mouseDown=false,mouseR=false;const mouse={x:innerWidth/2,y:innerHeight*.35};
const touch={mx:0,mz:0,ax:0,az:0,am:0};
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
  if(e.repeat)return;keys[e.code]=true;setPadActive(false);
  if(!S.running||S.over)return;
  if(S.panel){if(e.code==='Escape'||(e.code==='KeyM'&&S.panel==='map')||(e.code==='KeyK'&&S.panel==='skills')||((e.code==='KeyI'||e.code==='Tab')&&S.panel==='craft'))closePanel();
    else if(e.code==='KeyM'||e.code==='KeyK'||e.code==='KeyI'){closePanel();e.code==='KeyM'?openMap():e.code==='KeyK'?openSkills():openCraft();}
    else if(S.panel==='map'&&(e.code==='Equal'||e.code==='Minus')){mapZ=clamp(mapZ+(e.code==='Minus'?1:-1),0,2);drawMap();}return;}
  if(e.code==='Escape'){if(LOOT){closeLoot();return;}if(BM.on){endBuild();return;}if(S.menu)closeMenu();else togglePause();return;}
  if(e.code==='KeyP'){if(!S.menu)togglePause();return;}
  if(e.code==='KeyN'){toggleMute();return;}
  if(!S.paused&&!S.menu){if(e.code==='KeyM'){openMap();return;}if(e.code==='KeyK'){openSkills();return;}if(e.code==='KeyI'||e.code==='Tab'){openCraft();return;}}
  if(!S.paused&&!S.menu&&!S.panel){if(e.code==='KeyZ'){useQuick();return;}if(e.code==='KeyX'){cycleQuick();return;}}
  if(e.code==='KeyB'){if(S.menu)closeMenu();else if(!S.paused){if(inBase(player.x,player.z))openMenu();else{craftCat='Build camp';openCraft();}}return;}
  if(S.paused||S.menu)return;
  if(e.code==='KeyV'){setView(!TP);return;}
  if(e.code==='KeyC'){player.crouchT=!player.crouchT;return;}
  const n=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0'].indexOf(e.code);if(n>=0)setWeapon(SLOTS[n]);
  if(e.code==='KeyQ')cycleWeapon(1);
  if(e.code==='KeyR'){if(BM.on)BM.rot+=Math.PI/8;else startReload();}
  if(e.code==='KeyE')interact();
  if(e.code==='KeyH')useMed();
  if(e.code==='KeyF')eatFood();
  if(e.code==='KeyG')throwGrenade();
  if(e.code==='Space')tryJump();
  if(e.code==='KeyT')startNight(true);
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouseDown=false;mouseR=false;if(S.running&&!S.over&&!S.menu&&!S.paused)togglePause();});
let lastMouse={x:0,y:0};
window.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;
  if(pad.active&&Math.hypot(e.clientX-lastMouse.x,e.clientY-lastMouse.y)>8){setPadActive(false);if(S.running&&!S.menu&&!S.paused&&!S.over)document.body.classList.add('playing');}
  lastMouse={x:e.clientX,y:e.clientY};
  if(TP){if(S.running&&!S.paused&&!S.menu&&!S.over)tpLook(e.movementX||0,e.movementY||0);}
  else if(!pad.active){const c=$('crosshair');c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';}});
stage.addEventListener('mousedown',e=>{if(BM.on&&S.running&&!S.paused&&!S.panel){if(e.button===0)confirmBuild();else if(e.button===2)endBuild();Sound.init();return;}if(e.button===0){mouseDown=true;setPadActive(false);}if(e.button===2)mouseR=true;Sound.init();if(S.running&&!S.paused&&!S.menu&&!S.over)lockMouse();});
window.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)mouseR=false;});
stage.addEventListener('wheel',e=>{if(S.running&&!S.paused&&!S.menu&&!S.panel){if(BM.on)BM.rot+=(e.deltaY>0?1:-1)*Math.PI/8;else cycleWeapon(e.deltaY>0?1:-1);}},{passive:true});
stage.addEventListener('contextmenu',e=>e.preventDefault());

function setupStick(el,onMove,onEnd){
  const knob=el.querySelector('.knob');let id=null,cx=0,cy=0,R=60;
  function move(e){let dx=(e.clientX-cx)/R,dy=(e.clientY-cy)/R;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}knob.style.transform=`translate(${dx*R*.6}px,${dy*R*.6}px)`;onMove(dx,dy,Math.min(m,1));}
  el.addEventListener('pointerdown',e=>{id=e.pointerId;try{el.setPointerCapture(id);}catch(_){}const r=el.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;R=r.width/2;move(e);e.preventDefault();Sound.init();});
  el.addEventListener('pointermove',e=>{if(e.pointerId===id)move(e);});
  const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';onEnd();};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
setupStick($('stickL'),(x,y)=>{touch.mx=x;touch.mz=y;},()=>{touch.mx=touch.mz=0;});
setupStick($('stickR'),(x,y,m)=>{touch.ax=x;touch.az=y;touch.am=m;},()=>{touch.am=0;});
document.querySelectorAll('.tbtns button').forEach(b=>b.addEventListener('click',()=>{
  if(!S.running||S.over)return;const k=b.dataset.k;
  if(k==='pause'){togglePause();return;}if(S.paused||S.menu)return;
  ({interact,base:openMenu,reload:startReload,swap:()=>cycleWeapon(1),med:useMed,gren:throwGrenade,map:openMap,skills:openSkills,jump:tryJump,item:useQuick,craft:openCraft,night:()=>startNight(true)})[k]();
}));

function interact(){
  if(LOOT){lootTake();return true;}
  if(BM.on){confirmBuild();return true;}
  if(player.climb){player.climb=null;player.air=true;player.jvy=0;return true;}
  const ld=nearestLadder();if(ld){startClimb(ld);return true;}
  const td=takedownTarget();if(td){doTakedown(td);return true;}
  const ht=homeTarget();if(ht){useHome(ht);return true;}
  const wl=nearWell();if(wl){useWell(wl);return true;}
  const c=nearestCrate();if(c){openCrate(c);return true;}
  const cc=nearestCarcass();if(cc){butcher(cc);return true;}
  const g=nearestGate();if(g){toggleGate(g);return true;}
  const d=nearestDoor();if(d){useDoor(d);return true;}
  const car=nearestCar();if(car){stripCar(car);return true;}
  const pp=nearestPlaced();if(pp){usePlaced(pp);return true;}
  const hb=nearestHerb();if(hb){pickHerb(hb);return true;}
  const gs=nearestGardenSpot();if(gs){useGardenSpot(gs);return true;}
  const pl=nearestPlot();if(pl){tendPlot(pl);return true;}
  const gt=gatherTarget();if(gt){gather(gt);return true;}
  if(inBase(player.x,player.z)){openMenu();return true;}
  return false;
}
function nearestCrate(){let best=null,bd=2.6;for(const c of crates){if((c.opened&&!(c.loot&&c.loot.length))||(c.lvl||0)!==(player.lvl||0))continue;const d=Math.hypot(c.x-player.x,c.z-player.z);if(d<bd){bd=d;best=c;}}return best;}
function togglePause(){if(S.over||S.panel)return;S.paused=!S.paused;if(S.paused){closeLoot();endBuild();unlockMouse();clearDmgNums();clearStealthHUD();}$('pauseScreen').hidden=!S.paused;document.body.classList.toggle('playing',!S.paused&&!isTouch&&!pad.active);mouseDown=false;
  if(S.paused&&pad.active)setPadFocus($('resumeBtn'));else if(!S.paused)setPadFocus(null);}
function toggleMute(){const m=Sound.toggle();$('muteBtn').textContent=m?'Unmute sound':'Mute sound';toast(m?'Sound off':'Sound on');}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.running&&!S.over&&!S.paused&&!S.menu)togglePause();});

/* gamepad: overlays + gameplay */
let padFocus=null;
function setPadFocus(b){document.querySelectorAll('.padfocus').forEach(x=>x.classList.remove('padfocus'));padFocus=b||null;if(b){b.classList.add('padfocus');try{b.scrollIntoView({block:'nearest'});}catch(e){}}}
function visibleOverlay(){for(const id of ['mapScreen','skillScreen','craftScreen','menu','pauseScreen','overScreen','startScreen']){const el=$(id);if(!el.hidden)return el;}return null;}
function navButtons(ov){return[...ov.querySelectorAll('button')].filter(b=>b.offsetParent!==null);}
function navMove(dx,dy){
  const ov=visibleOverlay();if(!ov)return;const bs=navButtons(ov);if(!bs.length)return;
  if(!padFocus||!bs.includes(padFocus)){setPadFocus(bs.find(b=>!b.disabled)||bs[0]);return;}
  const r=padFocus.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bsc=1e9;
  for(const b of bs){if(b===padFocus)continue;const q=b.getBoundingClientRect(),qx=q.left+q.width/2-cx,qy=q.top+q.height/2-cy;const prim=qx*dx+qy*dy;if(prim<=4)continue;
    const sec=Math.abs(qx*dy)+Math.abs(qy*dx);const sc=prim+sec*2.5;if(sc<bsc){bsc=sc;best=b;}}
  if(best){setPadFocus(best);Sound.play('ui');}
}
function pollPad(dt){
  const gp=getPad();if(!gp){pad.lx=pad.ly=pad.rx=pad.ry=pad.rt=0;pad.aHeld=false;return;}
  pad.connected=true;
  const b=gp.buttons.map(x=>x&&(x.pressed||x.value>.5));const P=i=>b[i]&&!pad.prev[i];pad.aHeld=!!b[PB.A]&&!S.menu&&!S.paused;
  const ax=gp.axes;pad.lx=dz(ax[0]);pad.ly=dz(ax[1]);pad.rx=dz(ax[2]);pad.ry=dz(ax[3]);
  pad.rt=gp.buttons[PB.RT]?gp.buttons[PB.RT].value:0;pad.lt=gp.buttons[PB.LT]?gp.buttons[PB.LT].value:0;
  const any=b.some(Boolean)||Math.abs(pad.lx)+Math.abs(pad.ly)+Math.abs(pad.rx)+Math.abs(pad.ry)>0;
  if(any&&!pad.active){setPadActive(true);Sound.init();document.body.classList.remove('playing');}
  if(!pad.active){pad.prev=b;return;}
  const ov=visibleOverlay();
  if(ov){
    pad.navCd-=dt;
    let nx=(b[PB.RIGHT]?1:0)-(b[PB.LEFT]?1:0),ny=(b[PB.DOWN]?1:0)-(b[PB.UP]?1:0);
    if(!nx&&!ny){if(Math.abs(pad.lx)>.55)nx=Math.sign(pad.lx);else if(Math.abs(pad.ly)>.55)ny=Math.sign(pad.ly);}
    const dpadEdge=P(PB.UP)||P(PB.DOWN)||P(PB.LEFT)||P(PB.RIGHT);
    if((nx||ny)&&(dpadEdge||pad.navCd<=0)){navMove(nx,ny);pad.navCd=dpadEdge?.3:.22;}
    if(!nx&&!ny)pad.navCd=0;
    if(!padFocus||!navButtons(ov).includes(padFocus)){if(!(nx||ny))setPadFocus(navButtons(ov).find(x=>!x.disabled)||null);}
    if(P(PB.A)&&padFocus&&!padFocus.disabled){padFocus.click();}
    if(ov.id==='menu'){
      if(P(PB.B)||P(PB.Y))closeMenu();
      if(P(PB.LB)||P(PB.RB)){const t=['def','arm','salv','sup','jobs'];S.menuTab=t[(t.indexOf(S.menuTab)+(P(PB.RB)?1:4))%5];S.armSel=null;setPadFocus(null);renderMenu();Sound.play('ui');}
    }else if(ov.id==='mapScreen'){if(P(PB.B)||P(PB.VIEW))closePanel();else if(P(PB.LB)||P(PB.RB)){mapZ=clamp(mapZ+(P(PB.RB)?1:-1),0,2);drawMap();}}
    else if(ov.id==='craftScreen'){if(P(PB.B)||P(PB.Y))closePanel();else if(P(PB.LB)||P(PB.RB)){craftCat=CRAFT_CATS[(CRAFT_CATS.indexOf(craftCat)+(P(PB.RB)?1:CRAFT_CATS.length-1))%CRAFT_CATS.length];renderCraft();setPadFocus(document.querySelector('#craftScreen [data-craft]:not([disabled])')||$('crClose'));Sound.play('ui');}}
    else if(ov.id==='skillScreen'){if(P(PB.B)||P(PB.RIGHT)&&!padFocus)closePanel();}
    else if(ov.id==='pauseScreen'){if(P(PB.B)||P(PB.MENU))togglePause();}
    else if(ov.id==='startScreen'||ov.id==='overScreen'){if(P(PB.MENU))startGame();}
  }else if(S.running&&!S.over){
    if(P(PB.MENU)){togglePause();}
    else{
      if(P(PB.A)&&!interact())tryJump();
      if(P(PB.UP))useQuick();
      if(P(PB.X))startReload();
      if(P(PB.Y)){if(inBase(player.x,player.z))openMenu();else openCraft();}
      if(P(PB.B)){if(LOOT)closeLoot();else if(BM.on)endBuild();else useMed();}
      if(BM.on){if(pad.rt>.5&&!pad.rtPrev)confirmBuild();if(P(PB.LB))BM.rot-=Math.PI/8;if(P(PB.RB))BM.rot+=Math.PI/8;}
      if(!BM.on){if(P(PB.RB))cycleWeapon(1);if(P(PB.LB))cycleWeapon(-1);}if(P(PB.LEFT))cycleQuick();
      if(P(PB.VIEW))openMap();
      if(P(PB.RIGHT))openSkills();
      if(P(PB.DOWN))throwGrenade();
      if(P(PB.LS))pad.sprint=!pad.sprint;
      if(P(PB.RS))player.crouchT=!player.crouchT;
      if(Math.hypot(pad.lx,pad.ly)<.2)pad.sprint=false;
    }
  }
  pad.rtPrev=pad.rt>.5;pad.prev=b;
}

