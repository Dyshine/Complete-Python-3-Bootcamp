/* ================= UPDATE ================= */
const ray=new THREE.Raycaster(),aimPlane=new THREE.Plane(new V3(0,1,0),-1.2),ndc=new THREE.Vector2(),camTarget=new V3(),projV=new V3();
function updatePlayer(dt){
  if(!player.alive)return;
  let mx=0,mz=0;
  if(keys.KeyW||keys.ArrowUp)mz-=1;if(keys.KeyS||keys.ArrowDown)mz+=1;if(keys.KeyA||keys.ArrowLeft)mx-=1;if(keys.KeyD||keys.ArrowRight)mx+=1;
  mx+=touch.mx+pad.lx;mz+=touch.mz+pad.ly;const rawMz=mz;
  if(player.climb||player.mantle>0){mx=0;mz=0;}
  const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml;}
  if(TP){const fx=Math.sin(camYaw),fz=Math.cos(camYaw),wx=-fz*mx-fx*mz,wz=fx*mx-fz*mz;mx=wx;mz=wz;}
  const moving=ml>.1;
  const dep=walkDepth(player.x,player.z),wasSwim=player.swim;player.swim=dep>1.25;
  if(player.swim&&!wasSwim)toast('Swimming: you can\'t shoot, and stamina drains. Infected won\'t follow you into deep water.');
  const adsWant=!player.swim&&!S.menu&&((mouseR&&!isTouch&&!pad.active)||(pad.active&&pad.lt>.35));
  player.ads=(player.ads||0)+((adsWant?1:0)-(player.ads||0))*Math.min(1,dt*11);if(player.ads<.002)player.ads=0;
  const sprint=(keys.ShiftLeft||keys.ShiftRight||(isTouch&&ml>.95)||(pad.active&&pad.sprint))&&player.st>0&&moving&&!player.swim&&!adsWant&&!player.winded;
  if(sprint)player.crouchT=false;player.crouch=!player.swim&&!!player.crouchT;player.sprinting=sprint;player.moving=moving;
  if(sprint)player.st=Math.max(0,player.st-28*(1+.45*W.rain)*(1-.2*PERK('lungs'))*(player.hot?1.35:1)*(PERK('laststand')&&player.hp<player.maxHp*.25?0:1)*dt);else player.st=Math.min(100,player.st+16*(1+.05*ATTR('agi')+TK('stam'))*(1-.45*coldAmt())*(player.sick>0?.5:1)*(player.hot?.8:1)*dt);
  if(player.sick>0){player.sick-=dt;if(player.sick<=0)toast('Your stomach settles.');}
  updateRegen(dt);
  if(player.swim){player.st=Math.max(0,player.st-19*dt);if(Math.random()<dt*(moving?6:2))splash(player.x+rand(-.6,.6),player.z+rand(-.6,.6),WL-gH(player.x,player.z)+.03);
    if(player.st<=0){player.hurtT=Math.max(player.hurtT,.12);if(!player.drownMsg){player.drownMsg=1;toast('Drowning. Get to shore.','bad');}if(loseHP(9*dt))return;}else player.drownMsg=0;}
  if(player.grabT>0)player.grabT-=dt;const sp=(sprint?10.5:6.5)*(player.acidT>0?.6:1)*(player.grabT>0?.45:1)*(player.swim?.45:dep>.3?1-.35*Math.min(1,(dep-.3)/.95):1)*(player.crouch?.45:1)*(1-player.ads*(.48-.1*PERK('steady')))*(1+.06*PERK('path'))*(player.winded?.8:1)*(1+.02*ATTR('agi'))*(PERK('laststand')&&player.hp<player.maxHp*.25?1.2:1);
  {const snowSlow=1-(player.gear&&player.gear.boots?0:.14*SEA.blend.snowCover)-(W.type==='blizzard'?.07:0),tx=mx*sp*snowSlow,tz=mz*sp*snowSlow;
    if(ICE&&depthAt(player.x,player.z)>.05&&!player.climb){const k=Math.min(1,dt*2.2);player.vx+=(tx-player.vx)*k;player.vz+=(tz-player.vz)*k;}else{player.vx=tx;player.vz=tz;}}
  player.x+=(player.vx+player.kx)*dt;player.z+=(player.vz+player.kz)*dt;
  const kd=Math.pow(.004,dt);player.kx*=kd;player.kz*=kd;
  updateLevel(player);
  if(player.climb)updateClimb(dt,rawMz);
  collideCircles(player,.5);
  for(const s of ALLSEG){if(!solidSeg(s))continue;if(Math.abs(player.x-s.cx)>4.5||Math.abs(player.z-s.cz)>4.5)continue;collideSeg(player,.5,s);}
  if(!player.lvl&&!player.climb)doorCollide(player,.5,1.2);
  if(player.climb){player.x=player.climb.bx;player.z=player.climb.bz;}
  else if(player.jy>2)for(const s of SURFS){if(player.jy<s.h-.1)continue;const dx=player.x-s.x,dz=player.z-s.z,c=Math.cos(s.rot),sn=Math.sin(s.rot);let lx=dx*c-dz*sn,lz=dx*sn+dz*c;
    if(Math.abs(lx)>s.hw+.6||Math.abs(lz)>s.hd+.6)continue;const m=.35;lx=clamp(lx,-s.hw+m,s.hw-m);lz=clamp(lz,-s.hd+m,s.hd-m);player.x=s.x+lx*c+lz*sn;player.z=s.z-lx*sn+lz*c;}
  updateVertical(dt);updateWinded(dt);
  // aim
  if(TP){const ad=aimDist();aim.set(player.x+Math.sin(camYaw)*ad,1.2,player.z+Math.cos(camYaw)*ad);}
  else if(pad.active){const rm=Math.hypot(pad.rx,pad.ry);if(rm>.25)aim.set(player.x+pad.rx/rm*12,1.2,player.z+pad.ry/rm*12);else if(moving)aim.set(player.x+mx/ml*12,1.2,player.z+mz/ml*12);else aim.set(player.x+Math.sin(player.yaw)*12,1.2,player.z+Math.cos(player.yaw)*12);}
  else if(isTouch){if(touch.am>.2){aim.set(player.x+touch.ax*12,1.2,player.z+touch.az*12);}else if(moving){aim.set(player.x+mx*12,1.2,player.z+mz*12);}}
  else{ndc.set(mouse.x/innerWidth*2-1,-(mouse.y/innerHeight)*2+1);aimPlane.constant=-(1.2+gH(player.x,player.z));ray.setFromCamera(ndc,camera);ray.ray.intersectPlane(aimPlane,aim);}
  player.yaw=Math.atan2(aim.x-player.x,aim.z-player.z);
  player.fireCd-=dt;
  if(player.reloadT>0){player.reloadT-=dt;if(player.reloadT<=0){player.reloadT=0;finishReload();}}
  if(!BM.on&&((mouseDown&&!isTouch&&!pad.active)||(isTouch&&touch.am>.55)||(pad.active&&pad.rt>.3)))tryFire();
  if(base.infLv&&inBase(player.x,player.z))player.hp=Math.min(player.maxHp,player.hp+INF_REGEN[base.infLv]*dt);
  player.acidT-=dt;
  for(const a of acids){if(Math.hypot(a.x-player.x,a.z-player.z)<a.r){player.hp-=13*dt;player.acidT=.2;player.hurtT=Math.max(player.hurtT,.15);if(player.hp<=0){player.hp=0;die();return;}}}
  for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.t+=dt;
    if(p.y>.01||p.vy>0){p.vy-=GRAV*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;if(p.y<=.01){p.y=.01;p.vy=p.vy<-2?-p.vy*.35:0;p.vx*=.5;p.vz*=.5;}}
    const dx=player.x-p.x,dz=player.z-p.z,d=Math.hypot(dx,dz);
    if(d<3.2&&p.t>.4){p.x+=dx/d*12*dt;p.z+=dz/d*12*dt;}
    if(d<.9&&p.t>.3){collectPickup(p);scene.remove(p.m);pickups.splice(i,1);continue;}
    if(p.t>50){scene.remove(p.m);pickups.splice(i,1);continue;}
    p.m.position.set(p.x,p.y,p.z);if(p.vy!==0)p.m.rotation.y+=dt*6;}
  player.walk+=dt*(moving?sp*1.6:0);footstep(moving);const sw=moving?Math.sin(player.walk):0;
  plLegs[0].rotation.x=sw*.7;plLegs[1].rotation.x=-sw*.7;
  player.recoil=Math.max(0,player.recoil-dt);
  if(player.climb)player.yaw=player.climb.yaw;
  {const pitch=bodyPose(dt),flat=clamp(pitch/1.32,0,1);let ox=0,oz=0;if(player.swim&&flat>.05){ox=-Math.sin(player.yaw)*.95*flat;oz=-Math.cos(player.yaw)*.95*flat;}
    pl.position.set(player.x+ox,(player.swim?depthAt(player.x,player.z)-lerp(1.35,.42,flat):moving&&!HERO.ready?Math.abs(Math.cos(player.walk))*.07:0)-(player.crouch?.22:0)+(player.lvlY||0)+(player.jy||0)+(ICE&&!player.swim?Math.max(0,depthAt(player.x,player.z)):0)-(player.tired>.5&&!moving&&!player.swim?.2*player.tired:0),player.z+oz);pl.rotation.x=pitch;}
  gun.visible=!player.swim&&!HERO.dead&&!player.climb&&!(player.mantle>0);pl.rotation.y=player.yaw;gun.position.z=.62-player.recoil*2;
  player.swing=Math.max(0,(player.swing||0)-dt);gun.rotation.y=player.swing>0?Math.sin(player.swing/.25*Math.PI)*1.1:0;
  if(HERO.ready)updateHero(dt,moving,sprint,moving?(mx*Math.sin(player.yaw)+mz*Math.cos(player.yaw))/(ml||1):1,sp);
  player.hurtT-=dt;
  if((keys.KeyE||(pad.active&&pad.aHeld))&&!nearestCrate()&&!nearestCarcass()&&!nearestGate()&&!nearestDoor()){const cr=nearestCar();if(cr&&cr.left>0&&player.fireCd<=0)stripCar(cr);}
  if((keys.KeyE||(pad.active&&pad.aHeld))&&!nearestCrate()&&!nearestCarcass()&&!nearestCar()){const gt=gatherTarget();if(gt)gather(gt);}
  // prompt
  const c=nearestCrate(),tdn=takedownTarget();let ps='';
  const lad=!player.climb&&nearestLadder();
  if(player.climb)ps=`<span>${glyph('use')}Let go</span>`;
  else if(lad)ps=`<span>${glyph('use')}${lad.top?'Climb down':'Climb the ladder'}</span>`;
  else if(tdn)ps=`<span>${glyph('use')}Takedown</span>`;
  else if(homeTarget())ps=`<span>${homePrompt(homeTarget())}</span>`;
  else if(nearWell())ps=`<span>${glyph('use')}Draw water · drink${GARDEN.can<CAN_MAX?' and fill the can':''}</span>`;
  else if(!c&&nearestPlaced()){const p=nearestPlaced();ps=`<span>${glyph('use')}${p.type==='campfire'?(p.lit?'Stoke the fire (1 wood)':'Relight the fire (1 wood)'):p.type==='snare'?(p.caught?'Collect the catch':'Snare set · nothing yet'):p.type==='beartrap'?(p.armed?'Bear trap · armed':'Re-arm the trap'):p.type==='barricade'?'Take down the barricade':p.type==='bedroll'?(S.phase==='night'?'Sleep until dawn':'Rest for an hour'):p.type==='rack'?(player.meat>0?'Hang raw meat to dry':p.jerky?`Take ${p.jerky} jerky`:p.meat?`Drying ${p.meat} meat…`:'Drying rack'):p.type==='chest'?'Open the storage chest':p.type==='torch'?(p.lit?'Torch post':'Relight torch (1 cloth)'):p.type==='logwall'?`Shore up the wall (2 wood) · ${Math.max(0,Math.round(p.hp))}/${p.max}`:p.type==='campbench'?'Use the camp workbench':BUILDS_CAMP[p.type]?BUILDS_CAMP[p.type].name:''}</span>`;}
  else if(!c&&nearestHerb())ps=`<span>${glyph('use')}Pick herbs</span>`;
  else if(LOOT)ps=`<span>${glyph('use')}Take all</span>`;
  else if(c)ps=`<span>${glyph('use')}${c.opened?'Search':'Open'} ${c.rar==='drop'?'airdrop':((CONT[c.kind]||CONT.crate).name.toLowerCase()+(c.kind==='crate'?' ('+RARITY[c.rar].label.toLowerCase()+')':''))}</span>`;
  else if(nearestCarcass())ps=`<span>${glyph('use')}Butcher the ${nearestCarcass().d.name.toLowerCase()}</span>`;
  else if(!nearestGate()&&!nearestDoor()&&nearestCar()){const cr=nearestCar();ps=`<span>${cr.left>0?glyph('use'):''}${cr.left>0?`Strip the ${cr.model} for parts · hold`:`Stripped ${cr.model}`}</span>`;}
  else{const g=nearestGate();
    if(g)ps=`<span>${glyph('use')}${g.open?'Close':'Open'} the ${g.side} gate</span>`;
    else{const d=nearestDoor();if(d)ps=`<span>${glyph('use')}${doorOpen(d)?'Close':'Open'} the door${player.sprinting?'':' · sprint into it to kick'}</span>`;
      else{const gs=nearestGardenSpot(),pl=nearestPlot();if(gs)ps=`<span>${glyph('use')}${gardenSpotPrompt(gs)}</span>`;else if(pl)ps=`<span>${plotActionable(pl)?glyph('use'):''}${plotPrompt(pl)}</span>`;
        else{const gt=gatherTarget();if(gt)ps=`<span>${glyph('use')}${gt.g?'Chop tree':'Mine rock'} · hold</span>`;}}}}
  if(inBase(player.x,player.z))ps+=`<span>${glyph('base')}Workshop</span>`;
  if(ps!==promptState){promptState=ps;$('prompt').innerHTML=ps;$('prompt').hidden=!ps;}
  if(pad.active){projV.copy(aim).project(camera);const c2=$('crosshair');c2.style.left=((projV.x+1)/2*innerWidth)+'px';c2.style.top=((1-projV.y)/2*innerHeight)+'px';}
}
function updateTurrets(dt){
  const lv=TUR[base.turretLv];const range=lv.range*(base.floods?1.3:1)*(1-.3*W.fog);
  for(let i=0;i<base.turrets;i++){const t=turrets[i];t.cd-=dt;
    let best=null,bd=range;for(const z of zombies){if(z.dying)continue;const d=Math.hypot(z.x-t.x,z.z-t.z);if(d<bd){bd=d;best=z;}}
    if(!best)nearAgents(t.x,t.z,range,a=>{const d=Math.hypot(a.x-t.x,a.z-t.z);if(d<bd){bd=d;best=a;}});
    if(!best){t.head.rotation.y+=dt*.6;continue;}
    const ty=Math.atan2(best.x-t.x,best.z-t.z);let dy=ty-t.head.rotation.y;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;t.head.rotation.y+=dy*Math.min(1,dt*12);
    if(t.cd<=0&&Math.abs(dy)<.3){t.cd=lv.rate;const a=t.head.rotation.y+rand(-.02,.02);hitscan(t.x+Math.sin(a)*1.4,t.z+Math.cos(a)*1.4,Math.sin(a),Math.cos(a),range,lv.dmg,1,.6,0x9fe0ff,true);
      Sound.play('turret',clamp(1-Math.hypot(t.x-player.x,t.z-player.z)/60,.15,1));}
  }
}
function updateWorld(dt){
  for(const p of particles){if(p.life<=0)continue;p.life-=dt;p.vy-=GRAV*.7*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;
    if(p.casing){p.m.rotation.x+=dt*18;p.m.rotation.y+=dt*9;}
    if(p.m.position.y<.04){p.m.position.y=.04;
      if(p.bounce&&p.vy<-1.5){p.vy=-p.vy*.42;p.vx*=.6;p.vz*=.6;if(p.casing)Sound.play('clink',clamp(1-Math.hypot(p.m.position.x-player.x,p.m.position.z-player.z)/20,0,1));}
      else{p.vx*=.5;p.vz*=.5;p.vy=0;if(p.casing){p.m.rotation.x=Math.PI/2;}}}
    if(p.life<=0){p.m.visible=false;p.casing=false;}}
  for(const t of tracers){if(t.life<=0)continue;t.life-=dt;t.m.material.opacity=Math.max(0,t.life/.07);if(t.life<=0)t.m.visible=false;}
  for(const b of blasts){if(b.life<=0)continue;b.life-=dt;const k=1-b.life/b.max;b.m.scale.setScalar(b.r*(.3+k*.9));b.m.material.opacity=.8*(1-k);if(b.life<=0)b.m.visible=false;}
  muzzleLight.intensity=Math.max(0,muzzleLight.intensity-dt*40);boomLight.intensity=Math.max(0,boomLight.intensity-dt*8);
  for(let i=projs.length-1;i>=0;i--){const p=projs[i];p.vy-=GRAV*dt;if(p.kind==='gren'){p.vx+=Math.cos(W.wdir)*W.wind*1.4*dt;p.vz+=Math.sin(W.wdir)*W.wind*1.4*dt;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(p.kind==='acid'){if(Math.random()<.4)burst(p.x,p.y,p.z,1,'acid',1);
      if(p.y<=.2){scene.remove(p.m);projs.splice(i,1);burst(p.x,.3,p.z,8,'acid',4);addAcid(p.x,p.z);if(Math.hypot(p.x-player.x,p.z-player.z)<1.4)hurtPlayer(10);continue;}}
    else{
      let boom=false;
      if(p.impact){if(p.y<=.2)boom=true;else for(const z of zombies){if(z.dying)continue;if(p.y<2.4*z.def.scale&&Math.hypot(z.x-p.x,z.z-p.z)<z.def.r+.3){boom=true;break;}}}
      else{
        p.fuse-=dt;if(p.fuse<=0)boom=true;
        if(p.y<=.16){p.y=.16;if(p.vy<-2){p.vy=-p.vy*.45;p.vx*=.65;p.vz*=.65;Sound.play('clink',.8);}else{p.vy=0;const f=Math.exp(-2.5*dt);p.vx*=f;p.vz*=f;}}
        const ox=p.x,oz=p.z;collideCircles(p,.16);for(const s of ALLSEG){if(!solidSeg(s)||p.y>(s.home?s.h:WALL_H[base.wallLv]))continue;if(Math.abs(p.x-s.cx)>4||Math.abs(p.z-s.cz)>4)continue;collideSeg(p,.16,s);}
        if(p.x!==ox||p.z!==oz){const nx=p.x-ox,nz=p.z-oz,nl=Math.hypot(nx,nz);const ux=nx/nl,uz=nz/nl,vn=p.vx*ux+p.vz*uz;if(vn<0){p.vx-=1.6*vn*ux;p.vz-=1.6*vn*uz;Sound.play('clink',.6);}}
        p.m.rotation.x+=p.vz*dt*3;p.m.rotation.z-=p.vx*dt*3;
      }
      if(boom){scene.remove(p.m);projs.splice(i,1);if(onThrownLand(p))continue;if(p.siren)addLure(p.x,p.z,p.dmg,p.radius);else explode(p.x,p.z,p.radius,p.dmg,{color:0xff9a3a});continue;}
    }
    p.m.position.set(p.x,p.y,p.z);}
  for(let i=acids.length-1;i>=0;i--){const a=acids[i];a.t-=dt;a.m.material.opacity=Math.min(.6,a.t/2*.6);if(a.t<=0){scene.remove(a.m);a.m.material.dispose();acids.splice(i,1);}}
  for(const b of barrels){if(!b.alive||b.fuse<0)continue;b.fuse-=dt;if(b.fuse<=0){b.alive=false;b.g.visible=false;b.ob.r=0;explode(b.x,b.z,5.5,140,{hurt:35,wall:60,color:0xff7a2a});}}
  for(let i=crates.length-1;i>=0;i--){const c=crates[i];if(c.beam){c.beam.material.opacity=.2+.12*Math.sin(performance.now()/300+i);}
    if(c.opened){c.t+=dt;if(c.lid)c.lid.rotation.x=Math.max(-2,c.lid.rotation.x-dt*8);if(c.door)c.door.rotation.y=Math.max(-1.9,c.door.rotation.y-dt*6);if(c.t>(c.loot&&c.loot.length?150:18)){if(LOOT&&LOOT.src===c)closeLoot();dropCrate(c);crates.splice(i,1);}}
    else if(!c.chunk&&c.rar==='drop'&&S.running&&Math.hypot(c.x-player.x,c.z-player.z)>260){dropCrate(c);crates.splice(i,1);}
    else if(c.rar==='drop'&&Math.random()<dt*6)burst(c.x,1.5,c.z,1,'smoke',1);}
  S.groanT-=dt;if(S.groanT<=0){S.groanT=rand(1.2,3);let near=null,nd=30;for(const z of zombies){if(z.dying)continue;const d=Math.hypot(z.x-player.x,z.z-player.z);if(d<nd){nd=d;near=z;}}if(near)Sound.play('groan',1-nd/30,near.x,near.z);}
  S.breachMsgT-=dt;
}
const acidGeo=new THREE.CircleGeometry(1,16);
function addAcid(x,z){const m=new THREE.Mesh(acidGeo,new THREE.MeshBasicMaterial({userData:{terrainVertex:true},color:0x8fd14f,transparent:true,opacity:.6,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);m.scale.setScalar(1.7);scene.add(m);acids.push({m,x,z,r:1.7,t:4});}

const fogCol=new THREE.Color(),wxCol=new THREE.Color();
function updateEnv(dt){
  S.env+=(S.envT-S.env)*Math.min(1,dt*.6);const v=S.env;
  fogCol.copy(DAY_FOG).lerp(NIGHT_FOG,v);
  wxCol.copy(STORM_FOG).lerp(NIGHT_FOG,v*.85);fogCol.lerp(wxCol,Math.min(1,W.cloud*.55+W.fog*.25));
  wxCol.copy(ASH_FOG).lerp(NIGHT_FOG,v*.8);fogCol.lerp(wxCol,W.ash*.6);
  wxCol.setHex(0xc8d0d8).lerp(NIGHT_FOG,v*.85);fogCol.lerp(wxCol,clamp((W.snow||0)*.7+SEA.blend.snowCover*.25,0,1));
  scene.fog.color.copy(fogCol);
  scene.fog.near=lerp(lerp(40,16,v),23,W.fog);scene.fog.far=lerp(lerp(125,68,v),lerp(54,46,v),W.fog);
  const fl=W.flash*(Math.random()<.3?.45:1);
  hemi.intensity=lerp(.78,.16,v)*(1-.28*W.cloud)+fl*2.4;sun.intensity=lerp(1,.18,v)*(1-.65*W.cloud);sun.color.copy(SUN_DAY).lerp(SUN_NIGHT,v);
  if(gradePass){gradePass.uniforms.flash.value=fl*.35;gradePass.uniforms.night.value=v;gradePass.uniforms.time.value=W.time;gradePass.uniforms.sat.value=.95-.14*W.cloud-.18*W.ash;}
  flash.intensity=lerp(0,2.6,v);lantern.intensity=lerp(0,1.1,v)+W.fog*.4;lantern.position.set(player.x,2.6+gH(player.x,player.z),player.z);
  for(const f of floods)f.intensity=base.floods?lerp(.15,1.7,v):0;
}
const camGoal=new V3();let camGY=0;
/* ---------- third-person chase camera (default) · V switches to the classic top-down view ---------- */
let TP=!isTouch&&store.get('deadacre.view','tp')==='tp';
let camYaw=Math.PI,camPitch=.3;const TPD=4.8,TP_SENS=.0024;
const _cp=new V3(),_cd=new V3(),_ct=new V3();
const aimDist=()=>lerp(28,5,clamp((camPitch+.12)/1.07,0,1));
function setView(tp){
  TP=tp&&!isTouch;store.set('deadacre.view',TP?'tp':'top');camera.near=TP?.15:.5;camera.updateProjectionMatrix();
  if(TP){camYaw=player.yaw;lockMouse();}else{if(document.pointerLockElement)document.exitPointerLock();const c=$('crosshair');c.style.left=mouse.x+'px';c.style.top=mouse.y+'px';}
  toast(TP?'Third-person view: move the mouse to look. V for top-down.':'Top-down view. V for third-person.');
}
function lockMouse(){if(!TP||document.pointerLockElement||!stage.requestPointerLock)return;try{const r=stage.requestPointerLock();if(r&&r.catch)r.catch(()=>{});}catch(e){}}
function unlockMouse(){if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();}
// losing the pointer lock (Esc) pauses, like Esc does in top-down
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&TP&&S.running&&!S.over&&!S.menu&&!S.paused&&!S.panel)togglePause();});
const adsSens=()=>1-(player.ads||0)*(scoped()?.72:.5);
function tpLook(dx,dy){const k=TP_SENS*adsSens();camYaw-=dx*k;camPitch=clamp(camPitch+dy*k,-.12,.95);}
function scoped(){const I=curW();return!!I&&(I.cls==='hunt'||(I.mods&&I.mods.optic==='scope'));}
function camBlocked(x,y,z){
  if(y<gH(x,z)+.35)return true;let hit=false;
  nearObs(x,z,.3,o=>{if(!hit&&!(o.h!=null&&o.lvl===undefined&&y>gH(x,z)+o.h+.25)&&Math.hypot(o.x-x,o.z-z)<o.r+.3)hit=true;});
  if(!hit&&Math.abs(x)<BR+2&&Math.abs(z)<BR+2)for(const sg of ALLSEG)if(solidSeg(sg)&&y<(sg.home?sg.h:WALL_H[base.wallLv])+.6&&segDist(sg,x,z)<.45){hit=true;break;}
  return hit;
}
// hide a tree while the camera is inside its leaves (up on a car or a roof), like roofs hide when you're upstairs
const CANOPY_HID=new Set(),_canNow=new Set();
function canopyFade(){const c=camera.position;_canNow.clear();
  nearObs(c.x,c.z,2.6,o=>{const t=o.tree;if(!t||t.kind==='dead')return;if(Math.hypot(t.x-c.x,t.z-c.z)<1.9*t.s+.4&&c.y>gH(c.x,c.z)+1.9*t.s)_canNow.add(t);});
  for(const t of CANOPY_HID)if(!_canNow.has(t)){t.g.visible=true;CANOPY_HID.delete(t);}
  for(const t of _canNow){t.g.visible=false;CANOPY_HID.add(t);}}
function updateCameraTP(dt){
  if(!document.pointerLockElement&&!pad.active){const ex=mouse.x/innerWidth;if(ex<.05)camYaw+=dt*2.2;else if(ex>.95)camYaw-=dt*2.2;}
  if(pad.active){const k=adsSens();camYaw-=pad.rx*2.8*dt*k;camPitch=clamp(camPitch+pad.ry*1.8*dt*k,-.12,.95);}
  const fx=Math.sin(camYaw),fz=Math.cos(camYaw),rx=-Math.cos(camYaw),rz=Math.sin(camYaw);
  const gy=gH(player.x,player.z)+(player.swim?depthAt(player.x,player.z)-1.35:ICE?Math.max(0,depthAt(player.x,player.z)):0);
  camGY+=(gy-camGY)*Math.min(1,dt*8);
  const ad=player.ads||0,sh=.75+.3*ad;
  _ct.set(player.x+rx*sh,camGY+(player.crouch?1.35:1.75)+.1*ad+(player.lvlY||0)+(player.jy||0),player.z+rz*sh);
  const pit=lerp(camPitch,Math.max(camPitch,.95),INDOOR),cp=Math.cos(pit),sp=Math.sin(pit);_cd.set(fx*cp,-sp,fz*cp);
  // pull the camera in front of walls, trees and hillsides (indoors it rises over the walls instead)
  const D=lerp(lerp(TPD,2.15,ad),6.2,INDOOR*(1-ad*.6));let d=D;
  if(INDOOR<.5){for(let t=.6;t<=D;t+=.3){if(camBlocked(_ct.x-_cd.x*t,_ct.y-_cd.y*t,_ct.z-_cd.z*t)){d=Math.max(.6,t-.35);break;}}}
  _cp.set(_ct.x-_cd.x*d,_ct.y-_cd.y*d,_ct.z-_cd.z*d);
  camera.position.lerp(_cp,Math.min(1,dt*14));canopyFade();
  if(S.shake>0){camera.position.x+=rand(-1,1)*S.shake*.22;camera.position.y+=rand(-1,1)*S.shake*.18;S.shake=Math.max(0,S.shake-dt*2.2);}
  camera.lookAt(camera.position.x+_cd.x,camera.position.y+_cd.y,camera.position.z+_cd.z);
  // the crosshair marks where the gun is actually pointing
  const adi=aimDist(),ax=player.x+fx*adi,az=player.z+fz*adi;projV.set(ax,gH(ax,az)+1.3,az).project(camera);
  const c=$('crosshair'),cxp=((projV.x+1)/2*innerWidth),cyp=((1-projV.y)/2*innerHeight);c.style.left=cxp+'px';c.style.top=cyp+'px';
  if(player.ads>.3){const sf=$('scopeFx').style;sf.setProperty('--sx',cxp.toFixed(0)+'px');sf.setProperty('--sy',cyp.toFixed(0)+'px');}
}
function updateCamera(dt){
  {const ad=player.ads||0,f=(TP?46-ad*(scoped()?28:15):46-ad*7)+WA.fov;if(Math.abs(camera.fov-f)>.02){camera.fov=f;camera.updateProjectionMatrix();}
    const ch=$('crosshair');ch.classList.toggle('ads',ad>.5);$('scopeFx').style.opacity=TP&&scoped()?clamp((ad-.5)*2,0,1):0;}
  if(TP)updateCameraTP(dt);else{
  const look=isTouch?0:.18;
  camTarget.set(player.x+(aim.x-player.x)*look,0,player.z+(aim.z-player.z)*look);
  camGY+=(gH(camTarget.x,camTarget.z)-camGY)*Math.min(1,dt*3);
  camGoal.set(camTarget.x+CAM_OFF.x,CAM_OFF.y+camGY,camTarget.z+CAM_OFF.z);
  camera.position.lerp(camGoal,Math.min(1,dt*6));
  if(S.shake>0){camera.position.x+=rand(-1,1)*S.shake*.6;camera.position.z+=rand(-1,1)*S.shake*.6;S.shake=Math.max(0,S.shake-dt*2.2);}
  camera.lookAt(camera.position.x-CAM_OFF.x,camera.position.y-CAM_OFF.y,camera.position.z-CAM_OFF.z);}
  {const a=sunAngle();sun.position.set(player.x+Math.cos(a)*34,16+Math.abs(Math.sin(a))*28,player.z+12+Math.sin(a)*6);}sun.target.position.set(player.x,0,player.z);
  {const fh=gH(player.x,player.z);flash.position.set(player.x,2.4+fh,player.z);flash.target.position.set(player.x+Math.sin(player.yaw)*12,fh,player.z+Math.cos(player.yaw)*12);}
}

