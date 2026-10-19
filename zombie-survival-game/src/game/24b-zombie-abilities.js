/* ================= INFECTED ABILITIES =================
   Every kind of infected has a trick of its own, and each one is acted out on its skeleton on top of the walk clip:
   walkers howl to wake the street and grab hold of you, runners coil and pounce, crawlers lunge for your ankles,
   troopers raise their armoured arms when you aim at them (and drop a live grenade when they fall), spitters rear back
   before they spit and burst into acid, boomers swell and glow before they pop, brutes beat their chests before a charge
   and rip rocks from the ground to throw, and the Abomination raises its fists for the slam and screams up runners.
   The dead also hunt better: they fan out round you instead of queueing, search where they last saw you, and stop to
   sniff the air while they wander. */
const ZB_NAMES={hips:'Hips',spine:'Spine01',chest:'Spine02',neck:'neck',head:'Head',lArm:'LeftArm',rArm:'RightArm',lFore:'LeftForeArm',rFore:'RightForeArm',lUp:'LeftUpLeg',rUp:'RightUpLeg',lLeg:'LeftLeg',rLeg:'RightLeg'};
function zBones(inst){const b={};for(const [k,n] of Object.entries(ZB_NAMES))b[k]=inst.getObjectByName(n)||null;return b;}
// a throat sac for the spitter and a ridge of bone spurs for the Abomination
function zTypeProps(type,inst){
  if(type==='spitter')boneProp(inst,'neck',g=>{const s=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),BASIC(0x9bff5a));s.position.set(0,.02,.09);s.scale.set(1.1,.8,1);g.add(s);});
  if(type==='boss')boneProp(inst,'Spine02',g=>{const m=M(0xd9d0b8);for(let i=0;i<7;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.08,.5,5),m);c.position.set(rand(-.18,.18),rand(-.05,.25),-.16);c.rotation.x=-1.9+rand(-.3,.3);g.add(c);}});
}
// rotate a bone about an axis of the body's own frame (x: its left, y: up, z: forward), undone before the next mixer pass
const _zq0=new THREE.Quaternion(),_zq1=new THREE.Quaternion(),_zq2=new THREE.Quaternion(),_zq3=new THREE.Quaternion(),_zax=new V3();
const ZAX={x:new V3(1,0,0),y:new V3(0,1,0),z:new V3(0,0,1)};
function zRot(z,b,axis,ang){
  if(!b||!b.parent||Math.abs(ang)<1e-3)return;
  const T=z.touch||(z.touch=new Map());if(!T.has(b))T.set(b,b.quaternion.clone());
  z.g.getWorldQuaternion(_zq0);_zax.copy(ZAX[axis]).applyQuaternion(_zq0);_zq1.setFromAxisAngle(_zax,ang);
  b.parent.getWorldQuaternion(_zq2);_zq3.copy(_zq2).invert();b.quaternion.premultiply(_zq3.multiply(_zq1).multiply(_zq2));b.updateMatrixWorld(true);
}
function zUndo(z){if(!z.touch)return;for(const [b,q] of z.touch)b.quaternion.copy(q);z.touch.clear();}

function zAb(z){return z.ab||(z.ab={s:'',t:0,T:0,f:0,cd:z.type==='runner'||z.type==='crawler'?rand(.2,1.2):rand(2,5),cd2:rand(4,8),vx:0,vz:0,guard:0,chg:0,s0:z.g.scale.x});}
function zSet(z,s,T){const a=zAb(z);a.s=s;a.t=0;a.T=T;a.f=0;}
const zK=a=>clamp(a.t/a.T,0,1),zEnv=(a,i,o)=>clamp(Math.min(a.t/(i||.12),(a.T-a.t)/(o||.15)),0,1);
// states that own the body: no ordinary swipe while one is playing
const ZBUSY=new Set(['howl','grab','coil','leap','lunge','rear','swell','beat','rip','throw','summon']);
const zBusy=z=>!!(z.ab&&ZBUSY.has(z.ab.s));
const FLANKERS=new Set(['walker','runner','trooper']);
const zFirst=(k,msg)=>{if(!S[k]){S[k]=1;toast(msg,'bad');}};

// steering on top of the chase: fan out round the player, search the last place they were seen, stop and sniff
function zSteer(z,dt,tx,tz,lu){
  const a=zAb(z);if(lu||!player.alive)return null;
  if(!z.aware){
    if(a.srch>0&&a.lkx!==undefined&&z.sus<=.3){a.srch-=dt;
      if(Math.hypot(a.lkx-z.x,a.lkz-z.z)>1.6)return[a.lkx,a.lkz];
      a.srch=0;if(!a.s)zSet(z,'look',rand(2.2,3.2));}
    else if(!a.s&&z.sus<.3&&Math.random()<dt*.05)zSet(z,'sniff',rand(1.6,2.8));
    return null;
  }
  if(!FLANKERS.has(z.type)||tx!==player.x||tz!==player.z)return null;
  const dx=tx-z.x,dz=tz-z.z,d=Math.hypot(dx,dz);if(d<2.2||d>11)return null;
  if(a.flank===undefined)a.flank=rand(-1,1);const o=a.flank*Math.min(3.2,(d-2)*.5);
  return[tx-dz/d*o,tz+dx/d*o];
}

// per-type abilities; returns the speed to move at this frame
function zAbility(z,dt,pd,pdx,pdz,sp,reach){
  const a=zAb(z),d=z.def,live=player.alive&&z.aware,n=pd||1,ux=pdx/n,uz=pdz/n,wm=1+.04*Math.max(0,S.wave-1);
  a.cd-=dt;a.cd2-=dt;
  if(z.aware&&!a.was){a.srch=0;if(a.s==='look'||a.s==='sniff')zSet(z,'',0);if(z.type==='walker'&&!z.always&&!a.s&&Math.random()<.45)zSet(z,'howl',1.05);}
  if(!z.aware&&a.was&&player.alive)a.srch=14;
  a.was=z.aware;if(z.aware&&pd<38){a.lkx=player.x;a.lkz=player.z;}
  // what sets each trick off
  if(!a.s&&!(z.climbT>0)){
    if(z.type==='runner'&&live&&reach&&a.cd<=0&&pd>3.5&&pd<8.5&&!(z.jy>0)){zSet(z,'coil',.38);a.cd=rand(4,7);}
    else if(z.type==='crawler'&&live&&reach&&a.cd<=0&&pd>1.8&&pd<4.2){zSet(z,'coil',.45);a.cd=rand(4,6);}
    else if(z.type==='spitter'&&live&&pd<16&&z.spitCd<=0){zSet(z,'rear',.8);z.spitCd=rand(2.8,3.6);}
    else if(z.type==='boomer'&&player.alive&&(z.blocked||live&&pd<4.2||z.aware&&z.hp<z.maxHp*.35)){zSet(z,'swell',z.blocked||pd<2.2?.65:1.25);Sound.play('groan',1,z.x,z.z);}
    else if(z.type==='brute'&&live&&reach&&!(z.chargeT>0)){
      if(z.chargeCd<=0&&pd<15&&pd>4){zSet(z,'beat',.95);z.chargeCd=rand(5,8);Sound.play('roar',.6,z.x,z.z);}
      else if(a.cd2<=0&&pd>9&&pd<24){zSet(z,'rip',.55);a.cd2=rand(7,11);}}
  }
  if(z.type==='trooper'){const face=Math.sin(z.yaw)*ux+Math.cos(z.yaw)*uz;
    a.guard+=((live&&pd<26&&face>.7&&player.ads>.4?1:0)-a.guard)*Math.min(1,dt*7);sp*=1-.3*a.guard;}
  if(z.type==='spitter'&&live&&!a.s){if(pd<7){z.x-=ux*1.7*dt;z.z-=uz*1.7*dt;sp=0;}else if(pd<10)sp=0;}
  if(z.type==='brute'){if(live&&z.chargeT>0){z.chargeT-=dt;sp*=3.4;burst(z.x,.2,z.z,1,'debris',2);}a.chg+=((z.chargeT>0?1:0)-a.chg)*Math.min(1,dt*8);}
  if(!a.s)return sp;
  a.t+=dt;const done=a.t>=a.T;
  switch(a.s){
    case 'howl':sp=0;
      if(!a.f&&a.t>.3){a.f=1;Sound.play('groan',1.2,z.x,z.z);for(const o of zombies)if(o!==z&&!o.dying&&!o.aware&&Math.hypot(o.x-z.x,o.z-z.z)<18)zAlert(o,true);}
      if(done)zSet(z,'',0);break;
    case 'grab':
      if(!live||pd>2.3||done){zSet(z,'',0);a.cd=rand(6,9);z.atkCd=Math.max(z.atkCd,.6);break;}
      sp=pd>1.1?sp*.8:0;player.grabT=Math.max(player.grabT||0,.25);
      if(a.t>=.35+a.f*.42&&a.f<3){a.f++;hurtPlayer(d.dmg*.4*wm);burst(player.x,1.3,player.z,2,'blood',2);}
      break;
    case 'coil':sp=0;
      if(done){const T=z.type==='crawler'?.4:.46;
        if(z.type==='crawler'){zSet(z,'lunge',T);a.vx=ux*8.5;a.vz=uz*8.5;Sound.play('groan',.6,z.x,z.z);}
        else{zSet(z,'leap',.9);const v=clamp(pd/T,7,15);a.vx=ux*v;a.vz=uz*v;z.jy=Math.max(z.jy||0,.02);z.jvy=GRAV*T/2;Sound.play('groan',.8,z.x,z.z);}
        z.atkCd=Math.max(z.atkCd,.6);}
      break;
    case 'leap':case 'lunge':{sp=0;z.x+=a.vx*dt;z.z+=a.vz*dt;
      if(live&&!a.f&&pd<1.25&&Math.abs((player.jy||0)-(z.jy||0))<1.3){a.f=1;a.vx*=.2;a.vz*=.2;z.atkCd=Math.max(z.atkCd,1);
        if(a.s==='leap'){hurtPlayer(d.dmg*1.7*wm);knockPlayer(ux,uz,11);player.grabT=Math.max(player.grabT||0,.6);S.shake=Math.max(S.shake,.35);zFirst('pounceMsg','Runners pounce! Sidestep when one crouches.');}
        else{hurtPlayer(d.dmg*1.2*wm);player.grabT=Math.max(player.grabT||0,1.8);zFirst('grabMsg','A crawler has your ankle! Shake it off.');}}
      const landed=a.s==='leap'&&a.t>.15&&!(z.jy>0&&z.jvy);
      if(done||landed){if(a.s==='leap'){zSet(z,'stumble',a.f?.45:.7);Sound.play('thud',.5,z.x,z.z);burst(z.x,.2,z.z,4,'debris',3);}else zSet(z,'',0);}
      break;}
    case 'stumble':sp*=.25;if(done)zSet(z,'',0);break;
    case 'rear':sp=0;
      if(!a.f&&a.t>.52&&live){a.f=1;const T=clamp(pd/14,.5,1.2);spitAcid(z.x,z.z,player.x+player.vx*T*.6,player.z+player.vz*T*.6);}
      if(done)zSet(z,'',0);break;
    case 'swell':sp*=.45;if(done){z.hp=0;killZombie(z);}break;
    case 'beat':sp=0;
      if(a.f<3&&a.t>.22+a.f*.25){a.f++;Sound.play('thud',.9,z.x,z.z);if(pd<20)S.shake=Math.max(S.shake,.12);}
      if(done){zSet(z,'',0);z.chargeT=1.1;zFirst('chargeMsg','A brute beats its chest before it charges. Get out of its line!');}
      break;
    case 'rip':sp=0;if(!a.f&&a.t>.3){a.f=1;burst(z.x+Math.sin(z.yaw)*.8,.2,z.z+Math.cos(z.yaw)*.8,8,'debris',4);Sound.play('crash',.5,z.x,z.z);}
      if(done)zSet(z,'throw',.5);break;
    case 'throw':sp=0;if(!a.f&&a.t>.24){a.f=1;zRock(z);}if(done)zSet(z,'',0);break;
    case 'summon':sp=0;
      if(done){zSet(z,'',0);S.shake=Math.max(S.shake,.4);for(let i=0;i<3;i++){const x=z.x+rand(-3,3),q=z.z+rand(-3,3);burst(x,.2,q,10,'debris',5);spawnZombie('runner',x,q);}}
      break;
    case 'look':case 'sniff':sp=0;if(done||z.aware||z.sus>.3)zSet(z,'',0);break;
    default:if(done)zSet(z,'',0);
  }
  return sp;
}
// the walker's grab replaces an ordinary swipe now and then; true when the ability took the attack
function zOnAttack(z){const a=zAb(z);
  if(z.type==='walker'&&a.cd<=0&&Math.random()<.35){zSet(z,'grab',1.5);a.cd=rand(6,9);player.grabT=Math.max(player.grabT||0,.4);zFirst('wgrabMsg','A walker has hold of you! Break away.');return true;}
  return false;}
// troopers' armour turns hits from the front, more so with their arms up
function zArmor(z,dmg,kx,kz){
  if(z.type!=='trooper')return dmg;const k=Math.hypot(kx||0,kz||0);if(k<.01)return dmg;
  if((kx*Math.sin(z.yaw)+kz*Math.cos(z.yaw))/k>-.45)return dmg;
  if(Math.random()<.5)burst(z.x,1.4,z.z,3,'spark',4);Sound.play('clink',.5,z.x,z.z);zFirst('armorMsg','Troopers are armoured in front. Flank them.');
  return dmg*(.55-.25*(z.ab?z.ab.guard:0));
}
function zOnDeath(z){
  zUndo(z);
  if(z.type==='trooper'&&Math.random()<.4){lob('gren',z.x,1.2,z.z,z.x+rand(-.8,.8),z.z+rand(-.8,.8),4,{dmg:90,radius:4.5,fuse:1.6,hurt:30});Sound.play('clink',.9,z.x,z.z);zFirst('trGrenMsg','That trooper dropped a live grenade!');}
  if(z.type==='spitter'){for(let i=0;i<2;i++)addAcid(z.x+rand(-1,1),z.z+rand(-1,1));burst(z.x,1,z.z,12,'acid',6);}
}
// brutes' thrown rocks
const ZROCKS=[];let zRockGeo=null;
function zRock(z){
  zRockGeo=zRockGeo||new THREE.DodecahedronGeometry(.34,0);const m=new THREE.Mesh(zRockGeo,M(0x6e665a));m.castShadow=true;scene.add(m);
  const x=z.x-Math.cos(z.yaw)*.7+Math.sin(z.yaw)*.6,q=z.z+Math.sin(z.yaw)*.7+Math.cos(z.yaw)*.6,y=2.9,d=Math.hypot(player.x-x,player.z-q),T=clamp(d/16,.5,1.3);
  const tx=player.x+player.vx*T*.5,tz=player.z+player.vz*T*.5;
  ZROCKS.push({m,x,y,z:q,vx:(tx-x)/T,vz:(tz-q)/T,vy:(.3-y+.5*GRAV*T*T)/T,sp:rand(-8,8)});Sound.play('throw',.9,x,q);
  zFirst('rockMsg','Brutes throw rocks. Keep moving!');
}
function updateZRocks(dt){
  for(let i=ZROCKS.length-1;i>=0;i--){const r=ZROCKS[i];r.vy-=GRAV*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.z+=r.vz*dt;r.m.rotation.x+=r.sp*dt;r.m.rotation.z+=r.sp*.7*dt;
    const hp=player.alive&&r.y<2.2+(player.jy||0)&&Math.hypot(player.x-r.x,player.z-r.z)<.95;
    if(hp||r.y<=.3){
      if(hp||Math.hypot(player.x-r.x,player.z-r.z)<1.4){const d=Math.hypot(player.x-r.x,player.z-r.z)||1;hurtPlayer(22*(1+.04*Math.max(0,S.wave-1)));knockPlayer((player.x-r.x)/d,(player.z-r.z)/d,10);}
      burst(r.x,.4,r.z,9,'debris',5);Sound.play('crash',.6,r.x,r.z);S.shake=Math.max(S.shake,clamp(.5-Math.hypot(player.x-r.x,player.z-r.z)/30,0,.4));
      for(const p of props){const pd=Math.hypot(p.x-r.x,p.z-r.z);if(pd<2.2)impulseProp(p,(p.x-r.x)/(pd||1)*3,(p.z-r.z)/(pd||1)*3,4);}
      scene.remove(r.m);ZROCKS.splice(i,1);continue;}
    r.m.position.set(r.x,r.y,r.z);}
}
function clearZRocks(){for(const r of ZROCKS)scene.remove(r.m);ZROCKS.length=0;}

// the poses, laid over whatever the walk clip did this frame
function zPose(z,dt,pd,pdx,pdz){
  const a=z.ab;if(!a)return;const s=a.s,B=z.bones;
  // the boomer's swell is drawn on the whole body (and works on the box infected too)
  if(z.type==='boomer'){const k=s==='swell'?zK(a):0,p=s==='swell'?.55+.45*Math.sin(a.t*(14+k*34)):0;z.glow=p*(.25+.6*k);if(s==='swell')z.g.scale.setScalar(a.s0*(1+(.06+.16*k)*p));}
  if(!B)return;
  const look=z.aware&&pd<20&&s!=='howl'&&s!=='summon'&&s!=='swell'&&!z.def.crawl;
  if(!s&&!z.def.crawl&&!look&&a.guard<.02&&a.chg<.02&&!(z.slamT>0))return;
  const e=s?zEnv(a):0,k=s?zK(a):0,t=a.t,R=(b,ax,an)=>zRot(z,b,ax,an);
  if(s==='coil')z.g.position.y-=(z.type==='crawler'?.06:.24)*e;
  if(s==='leap')z.g.rotation.x+=.5*Math.sin(Math.PI*k);
  if(s==='rip')z.g.position.y-=.15*e;
  z.g.updateMatrixWorld(true);
  if(look){let r=Math.atan2(pdx,pdz)-z.yaw;while(r>Math.PI)r-=Math.PI*2;while(r<-Math.PI)r+=Math.PI*2;R(B.neck,'y',clamp(r,-.9,.9)*.6);}
  if(z.def.crawl&&!(z.acts&&z.acts.crawl))zCrawlPose(z,B,s==='lunge'||s==='coil'?.35:1); // the Blender crawl clip, when loaded, does this
  if(a.guard>.02){const g=a.guard;R(B.chest,'x',.15*g);R(B.lArm,'x',-1.3*g);R(B.rArm,'x',-1.3*g);R(B.lArm,'y',-.55*g);R(B.rArm,'y',.55*g);R(B.lFore,'x',-1*g);R(B.rFore,'x',-1*g);}
  if(a.chg>.02){const g=a.chg;R(B.chest,'x',.55*g);R(B.neck,'x',-.3*g);R(B.lArm,'x',.55*g);R(B.rArm,'x',.55*g);R(B.lArm,'z',.3*g);R(B.rArm,'z',-.3*g);}
  if(z.slamT>0){const q=1-z.slamT/.7,up=q<.78?q/.78:1-(q-.78)/.22;const arm=q<.78?-2.7*up:-2.7+3.2*((q-.78)/.22),ch=q<.78?-.4*up:-.4+1.1*((q-.78)/.22);
    R(B.chest,'x',ch);R(B.lArm,'x',arm);R(B.rArm,'x',arm);R(B.lArm,'y',-.3);R(B.rArm,'y',.3);R(B.neck,'x',-.3*up);}
  switch(s){
    case 'howl':R(B.chest,'x',-.35*e);R(B.chest,'z',Math.sin(t*40)*.03*e);R(B.neck,'x',-.45*e);R(B.head,'x',-.3*e);R(B.lArm,'z',.7*e);R(B.rArm,'z',-.7*e);R(B.lArm,'x',-.4*e);R(B.rArm,'x',-.4*e);break;
    case 'grab':{const bite=Math.max(0,Math.sin(t*7));R(B.chest,'x',.25*e);R(B.lArm,'x',-.5*e);R(B.rArm,'x',-.5*e);R(B.lArm,'y',-.45*e);R(B.rArm,'y',.45*e);R(B.lFore,'x',-.6*e);R(B.rFore,'x',-.6*e);R(B.neck,'x',.4*e*bite);break;}
    case 'coil':if(z.type==='crawler'){R(B.chest,'x',-.35*e);R(B.lArm,'x',.45*e);R(B.rArm,'x',.45*e);R(B.neck,'x',-.3*e);}
      else{R(B.spine,'x',.4*e);R(B.chest,'x',.8*e);R(B.lArm,'x',.75*e);R(B.rArm,'x',.75*e);R(B.lUp,'x',-.75*e);R(B.rUp,'x',-.75*e);R(B.lLeg,'x',1.05*e);R(B.rLeg,'x',1.05*e);R(B.neck,'x',-.35*e);}break;
    case 'leap':{const f=Math.min(1,a.t/.1);R(B.lArm,'x',-1.3*f);R(B.rArm,'x',-1.3*f);R(B.lArm,'z',.25*f);R(B.rArm,'z',-.25*f);R(B.lUp,'x',.5*f);R(B.rUp,'x',-.6*f);R(B.lLeg,'x',.8*f);R(B.rLeg,'x',.6*f);R(B.neck,'x',-.35*f);break;}
    case 'lunge':R(B.lArm,'x',-1.1*e);R(B.rArm,'x',-1.1*e);R(B.neck,'x',-.4*e);R(B.chest,'x',-.2*e);break;
    case 'stumble':R(B.chest,'x',(.45+Math.sin(t*11)*.12)*e);R(B.chest,'z',Math.sin(t*9)*.2*e);R(B.lArm,'z',.45*e);R(B.rArm,'z',-.45*e);break;
    case 'rear':{const pre=clamp(k/.62,0,1),post=clamp((k-.62)/.14,0,1),ang=(-.55*pre+1.0*post)*e;
      R(B.chest,'x',ang);R(B.neck,'x',ang*.8);R(B.head,'x',-.2*pre*e);R(B.lArm,'z',.6*pre*e);R(B.rArm,'z',-.6*pre*e);break;}
    case 'swell':R(B.chest,'x',-.3*e);R(B.chest,'z',Math.sin(t*45)*.05*e);R(B.lArm,'z',1.05*e);R(B.rArm,'z',-1.05*e);R(B.lArm,'x',-.3*e);R(B.rArm,'x',-.3*e);R(B.neck,'x',-.2*e);R(B.head,'z',Math.sin(t*5)*.3*e);break;
    case 'beat':{const c=Math.sin(t*14);R(B.chest,'x',-.3*e);R(B.neck,'x',-.35*e);R(B.lArm,'x',(-.7+.3*c)*e);R(B.rArm,'x',(-.7-.3*c)*e);R(B.lArm,'y',-.8*e);R(B.rArm,'y',.8*e);R(B.lFore,'x',-1.1*e);R(B.rFore,'x',-1.1*e);break;}
    case 'rip':R(B.spine,'x',.3*e);R(B.chest,'x',.9*e);R(B.rArm,'x',-.3*e);R(B.lArm,'x',-.2*e);break;
    case 'throw':{const w=clamp((k-.25)/.3,0,1),sw=w*w*(3-2*w);R(B.chest,'x',(-.3+.8*sw)*e);R(B.chest,'y',(.4-.7*sw)*e);R(B.rArm,'x',(-2.8+1.8*sw)*e);R(B.lArm,'x',-.6*e);R(B.lArm,'z',.4*e);break;}
    case 'summon':R(B.chest,'x',-.4*e);R(B.chest,'z',Math.sin(t*30)*.06*e);R(B.neck,'x',-.5*e);R(B.lArm,'z',1.3*e);R(B.rArm,'z',-1.3*e);R(B.lArm,'x',-.9*e);R(B.rArm,'x',-.9*e);break;
    case 'look':case 'sniff':R(B.chest,'x',.25*e);R(B.neck,'y',Math.sin(t*1.7)*.7*e);R(B.head,'x',(s==='sniff'?.25:-.1)*e);break;
  }
}

/* ----- the crawl: arm over arm on the belly, legs dragging -----
   Crawlers have no walk clip; the whole body is posed here from rest every frame. Each arm reaches out ahead, plants,
   and hauls the body forward, then swings back up and over for the next reach, the other arm half a cycle behind.
   The body surges on each haul instead of gliding, and the cycle runs off the ground actually covered, so hands don't
   skate. Directions are in the body's own frame: x its left, y toward the head (ahead, lying down), z its front (the ground). */
const _za=new V3(),_zb=new V3(),_zc=new V3(),_zd=new V3(),_ze=new V3(),_zf=new V3();
const CRAWL_STRIDE=1.05; // metres covered by one full cycle (two hauls)
function zAim(z,b,dir,w){
  if(!b||!b.parent||w<=0)return;const c=b.children.find(o=>o.isBone);if(!c)return;
  const T=z.touch||(z.touch=new Map());if(!T.has(b))T.set(b,b.quaternion.clone());
  b.getWorldPosition(_za);c.getWorldPosition(_zb);_zb.sub(_za).normalize();
  z.g.getWorldQuaternion(_zq0);_zc.copy(dir).normalize().applyQuaternion(_zq0);
  _zq1.setFromUnitVectors(_zb,_zc);if(w<1)_zq1.slerp(_zq3.identity(),1-w);
  b.parent.getWorldQuaternion(_zq2);_zq3.copy(_zq2).invert();b.quaternion.premultiply(_zq3.multiply(_zq1).multiply(_zq2));b.updateMatrixWorld(true);
}
const crawlPull=u=>u<.55?Math.sin(Math.PI*u/.55):0;
// advances the crawl cycle and returns the speed multiplier for this moment of it (about 1.25 on average)
function zCrawlSurge(z,dt,sp){
  const a=zAb(z);a.cph=(a.cph===undefined?Math.random():a.cph)+dt*Math.max(.12,sp*1.3)/CRAWL_STRIDE;
  const p=a.cph%1;a.pull=Math.max(crawlPull(p),crawlPull((p+.5)%1));return .3+1.55*a.pull;
}
const CR_F=new V3(.35,.85,.4),CR_B=new V3(.3,-.05,.95),CR_L=new V3(.55,.45,-.25);
function crawlArm(u,side,up,fore){
  if(u<.55){const t=u/.55,e=t*t*(3-2*t);up.lerpVectors(CR_F,CR_B,e);fore.copy(up).add(_zf.set(0,.25,1).multiplyScalar(Math.sin(Math.PI*t)*.7));}
  else{const t=(u-.55)/.45;_zd.lerpVectors(CR_B,CR_L,t);_ze.lerpVectors(CR_L,CR_F,t);up.lerpVectors(_zd,_ze,t);fore.copy(up).add(_zf.set(0,.5,-.2));}
  up.x*=side;fore.x*=side;
}
function zCrawlPose(z,B,w){
  const a=zAb(z),p=(a.cph||0)%1,pl=crawlPull(p),pr=crawlPull((p+.5)%1),R=(b,ax,an)=>zRot(z,b,ax,an);
  const up=new V3(),fore=new V3();
  crawlArm(p,1,up,fore);zAim(z,B.lArm,up,w);zAim(z,B.lFore,fore,w);
  crawlArm((p+.5)%1,-1,up,fore);zAim(z,B.rArm,up,w);zAim(z,B.rFore,fore,w);
  // the haul twists the chest toward the pulling arm; hips counter-twist and the legs drag, one knee twitching
  R(B.chest,'y',.2*(pl-pr));R(B.spine,'z',.09*(pl-pr));R(B.hips,'y',-.1*(pl-pr));
  const kl=Math.max(0,Math.sin(Math.PI*2*(p+.25)))*.8,kr=Math.max(0,Math.sin(Math.PI*2*(p+.75)))*.8;
  zAim(z,B.lUp,up.set(.14,-1,.06),1);zAim(z,B.rUp,up.set(-.14,-1,.06),1);
  zAim(z,B.lLeg,up.set(.1,-.9,-.35*kl),1);zAim(z,B.rLeg,up.set(-.1,-.9,-.35*kr),1);
  // head up, watching where it's going
  R(B.neck,'x',-.7);R(B.head,'x',-.25+.08*Math.sin(Math.PI*2*p));
}

/* ----- gaits: the infected break into a run by speed -----
   Keyed in Blender (tools/blender/zombie_anims.py): a lurching jog, an all-out sprint with the arms clawing ahead, a feral
   bound low to the ground with the hands slapping down (some runners run like that), and a brute's shoulder-down charge.
   The clip follows the ground the body is really covering, cross-fades as the speed crosses a band, and plays faster or
   slower to keep the feet planted. Returns true when a run is playing (the walk or shamble otherwise keeps its own pace). */
const GAIT={jog:3.0,sprint:6.2,feral:6.6,charge:6.0}; // metres a second each run clip was keyed to cover
function zGait(z){
  const A=z.acts;if(!A||!A.jog||z.def.crawl)return false;const base=A.loco||A.walk,fv=z.fv||0,cur=z.gait&&z.gait!==base?z.gait:null;
  if(z.gs===undefined)z.gs=z.type==='runner'&&Math.random()<.4?'feral':'sprint';
  // into a run above a speed, out of it a little below (so it doesn't flicker at the edge)
  const runAt=z.type==='runner'?2.6:2.5,fastAt=3.9,hold=cur?.4:0;let want=null;
  if(z.type==='brute'&&z.chargeT>0&&A.charge)want=A.charge;
  else if(fv>runAt-hold)want=fv>fastAt-(cur&&cur!==A.jog?.5:0)?A[z.gs]||A.sprint:A.jog;
  const next=want||base;
  if(next!==(z.gait||base)){const prev=z.gait||base;next.enabled=true;next.setEffectiveWeight(1);next.play();if(next!==base)next.time=Math.random()*next.getClip().duration;next.fadeIn(.22);prev.fadeOut(.22);z.gait=next;}
  if(!want)return false;
  const name=want===A.charge?'charge':want===A.jog?'jog':want===A.feral?'feral':'sprint';
  want.timeScale=clamp(Math.max(fv,1)/GAIT[name],.55,1.75);return true;
}
