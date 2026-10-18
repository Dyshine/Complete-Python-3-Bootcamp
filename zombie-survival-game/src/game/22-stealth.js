/* ================= STEALTH =================
   Daytime infected wander until they notice you: a forward cone of sight (shorter when you crouch, at night and in fog)
   and hearing all round (sprinting is loud, crouching is silent). Suspicion fills before they commit.
   Unaware infected can be taken down silently from behind; melee on them hits three times as hard. */
let SNEAKF=false;
function zAlert(z,quiet){if(z.aware||z.dying)return;z.aware=true;z.sus=1;z.alertT=1.3;z.lostT=0;
  if(!quiet){Sound.play('groan',.9);for(const o of zombies)if(o!==z&&!o.aware&&!o.dying&&Math.hypot(o.x-z.x,o.z-z.z)<9)o.sus=Math.max(o.sus,.75);}}
function unaware(o,k){return k==='z'?!o.aware:o.h.state!=='hunt'&&!o.h.lured;}
function takedownTarget(){
  if(!player.alive||player.swim||player.lvl)return null;
  const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);let best=null,bd=2.1;
  const ok=(o,k,face)=>{const dx=o.x-player.x,dz=o.z-player.z,d=Math.hypot(dx,dz);if(d>bd||d<.05)return;
    if((dx*fx+dz*fz)/d<.25)return; // has to be in front of you
    const back=((player.x-o.x)*Math.sin(face)+(player.z-o.z)*Math.cos(face))/d;if(back>.35&&!player.crouch)return; // from behind, or crouched beside it
    if(!unaware(o,k))return;bd=d;best={t:o,k};};
  for(const z of zombies){if(z.dying||(z.lvl||0)!==0||z.type==='boss'||(!PERK('assassin')&&(z.type==='brute'||z.type==='boomer')))continue;ok(z,'z',z.yaw);}
  nearAgents(player.x,player.z,2.4,a=>ok(a,'a',a.yaw));
  return best;
}
function doTakedown(o){
  const t=o.t;player.swing=.3;player.fireCd=.6;Sound.play('swing',.6);Sound.play('thud',.7);rumble(.4,.3,120);S.shake=Math.max(S.shake,.1);
  burst(t.x,1.4,t.z,8,'blood',4);decal(t.x,t.z,rand(1,1.4),0x4a0a08,.8);
  if(o.k==='z'){dmgNum(t,t.hp,'sneak',(t.barY||2.35*t.def.scale)+.3);t.hp=0;killZombie(t);}
  else{dmgNum(t,t.hp,'sneak',2.6*t.s);t.hp=0;killAgent(t);}
  S.takedowns=(S.takedowns||0)+1;if(S.takedowns<=2)toast('Silent takedown','good');gainXP(12);jobProg('td',1);
}
const ZM_N=10,ZMK=[];
{const L=document.getElementById('dmgLayer');for(let i=0;i<ZM_N;i++){const e=document.createElement('div');e.className='zmark';e.style.display='none';L.appendChild(e);ZMK.push(e);}}
// HUD: stealth state plus ? / ! markers over the infected that are onto you
let stealthKey='';
function updateStealthHUD(){
  let maxSus=0,spotted=0;const marks=[];
  for(const z of zombies){if(z.dying)continue;const d=Math.hypot(z.x-player.x,z.z-player.z);if(d>40)continue;
    if(z.aware){if(d<28)spotted++;if(z.alertT>0)marks.push({z,t:'x',d});}
    else if(z.sus>.08){maxSus=Math.max(maxSus,z.sus);marks.push({z,t:'q',d});}}
  marks.sort((a,b)=>a.d-b.d);
  for(let i=0;i<ZM_N;i++){const e=ZMK[i],m=marks[i];if(!m){if(e.style.display!=='none')e.style.display='none';continue;}
    projV.set(m.z.x,(m.z.barY||2.35*m.z.def.scale)+.75+gH(m.z.x,m.z.z)+(m.z.lvlY||0),m.z.z).project(camera);
    if(projV.z>1){e.style.display='none';continue;}
    e.style.display='';e.className='zmark '+m.t;e.textContent=m.t==='x'?'!':'?';
    e.style.opacity=m.t==='x'?Math.min(1,m.z.alertT*2):(.35+m.z.sus*.65).toFixed(2);
    e.style.transform=`translate(${((projV.x+1)/2*innerWidth).toFixed(1)}px,${((1-projV.y)/2*innerHeight).toFixed(1)}px) translate(-50%,-50%)`;}
  const el=$('stealth'),night=S.phase==='night';
  let st=null;if(spotted&&!night)st='spot';else if(maxSus>.05)st='sus';else if(player.crouch)st='hid';
  const key=st?st+(st==='sus'?Math.round(maxSus*20):''):'';if(key===stealthKey)return;stealthKey=key;
  el.hidden=!st;if(!st)return;
  el.className='stealth panel '+st;$('stealthTxt').textContent=st==='spot'?'SPOTTED':st==='sus'?'SUSPICIOUS':'HIDDEN';
  $('stealthBar').style.width=(st==='spot'?100:st==='sus'?maxSus*100:0)+'%';
}
function clearStealthHUD(){for(const e of ZMK)e.style.display='none';$('stealth').hidden=true;stealthKey='';}

