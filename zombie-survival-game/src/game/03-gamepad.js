/* ================= GAMEPAD ================= */
const pad={active:false,connected:false,prev:[],lx:0,ly:0,rx:0,ry:0,rt:0,lt:0,sprint:false,navCd:0,id:''};
const PB={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,LS:10,RS:11,UP:12,DOWN:13,LEFT:14,RIGHT:15};
function dz(v){v=v||0;const d=.2;return Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d);}
function getPad(){const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps)if(p&&p.connected)return p;return null;}
function rumble(strong,weak,ms){if(typeof VIB!=='undefined'&&!VIB)return;if(!pad.active){if(isTouch&&navigator.vibrate&&ms>=80){try{navigator.vibrate(Math.min(ms,200));}catch(e){}}return;}const gp=getPad();const a=gp&&gp.vibrationActuator;if(a&&a.playEffect){try{a.playEffect('dual-rumble',{duration:ms,strongMagnitude:clamp(strong,0,1),weakMagnitude:clamp(weak,0,1)}).catch(()=>{});}catch(e){}}}
function setPadActive(on){if(pad.active===on)return;pad.active=on;$('padBadge').hidden=!on;$('padTip').hidden=!on;
  if(on){$('medKey').className='pb pbb';$('medKey').textContent='B';$('grenKey').className='pl';$('grenKey').textContent='▼';}
  else{$('medKey').className='';$('medKey').textContent='H';$('grenKey').className='';$('grenKey').textContent='G';setPadFocus(null);}
  promptState='?';}
window.addEventListener('gamepadconnected',e=>{pad.connected=true;pad.id=e.gamepad.id;
  if(S.running)toast('Controller connected','good');else $('bestLine').textContent='Controller connected. Press A to start.';});
window.addEventListener('gamepaddisconnected',()=>{pad.connected=!!getPad();if(!pad.connected){setPadActive(false);if(S.running&&!S.over&&!S.paused&&!S.menu)togglePause();}});

