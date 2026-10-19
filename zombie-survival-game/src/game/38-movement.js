/* ================= MOVEMENT: jumping, climbing, falling, exhaustion =================
   Low obstacles carry a height (crates, barrels, rocks, vehicles): jump onto the short ones, and jump into the taller ones to
   mantle up. Fire lookouts have ladders up to their decks. Stamina that hits zero leaves you winded until you get your breath back. */
const LADDERS=[],SURFS=[];
function supportAt(x,z,jy){
  let h=0;
  nearObs(x,z,.1,o=>{if(o.h===undefined||o.lvl!==undefined)return;if(Math.hypot(o.x-x,o.z-z)<o.r*.92&&jy>=o.h-.5&&o.h>h)h=o.h;});
  for(const s of SURFS){if(jy<s.h-.7)continue;const dx=x-s.x,dz=z-s.z,c=Math.cos(s.rot),sn=Math.sin(s.rot),lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<s.hw&&Math.abs(lz)<s.hd&&s.h>h)h=s.h;}
  return h;
}
// the tallest climbable thing just ahead of you (for mantling)
function mantleTarget(){
  const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),moveYaw=player.moving?Math.atan2(player.vx,player.vz):player.yaw,mx=Math.sin(moveYaw),mz=Math.cos(moveYaw);
  let best=null;
  for(const [dx,dz] of [[mx,mz],[fx,fz]]){const px=player.x+dx*1.1,pz=player.z+dz*1.1;
    nearObs(px,pz,.6,o=>{if(o.h===undefined||o.lvl!==undefined||o.h<=player.jy+.4||o.h>player.jy+2.15)return;const d=Math.hypot(o.x-player.x,o.z-player.z);if(d>o.r+1.6)return;if(!best||o.h>best.h)best={o,h:o.h,dx,dz,d};});
    if(best)break;}
  return best;
}
function tryJump(){
  if(!player.alive||player.air||player.climb||player.mantle>0||player.swim||S.menu||S.paused||S.panel)return;
  if(player.st<6){toast('Too winded to jump');return;}
  player.crouchT=false;const m=mantleTarget();
  if(m){const o=m.o,k=Math.min(m.d,o.r*.4)/(m.d||1);player.mantle=.62;player.mT=.62;player.m0=player.jy;player.mH=m.h;
    player.ms={x:player.x,z:player.z};player.me={x:o.x+(player.x-o.x)*k,z:o.z+(player.z-o.z)*k};player.st=Math.max(0,player.st-12);Sound.play('swing',.5);Sound.play('thud',.35);return;}
  player.jvy=7.4;player.air=true;player.st=Math.max(0,player.st-8);player.jumpT=0;Sound.play('swing',.45);
}
function nearestLadder(){let best=null,bd=1.5;
  for(const L of LADDERS){const top=player.jy>L.h-.8;const x=top?L.tx:L.bx,z=top?L.tz:L.bz;const d=Math.hypot(x-player.x,z-player.z);if(d<bd&&(top||player.jy<1)){bd=d;best={L,top};}}
  return best;}
function startClimb(n){
  const L=n.L;player.climb=L;player.climbDir=n.top?-1:1;player.air=false;player.jvy=0;player.mantle=0;player.crouchT=false;
  player.x=L.bx;player.z=L.bz;player.yaw=L.yaw;if(n.top)player.jy=L.h-.05;Sound.play('clink',.6);
  toast(pad.active?'Left stick up and down to climb.':'W / S to climb.');
}
function updateClimb(dt,mzIn){
  const L=player.climb;let v=-mzIn;if(Math.abs(v)<.2)v=0;
  player.x=L.bx;player.z=L.bz;player.yaw=L.yaw;player.climbPh=(player.climbPh||0)+v*dt*5;
  player.jy=clamp(player.jy+v*2.4*dt,0,L.h);if(v)player.st=Math.max(0,player.st-3*dt);
  if(player.jy>=L.h-.02&&v>0){player.climb=null;player.x=L.tx;player.z=L.tz;player.jy=L.h;Sound.play('thud',.4);}
  else if(player.jy<=0&&v<0){player.climb=null;player.jy=0;}
  if(Math.random()<dt*Math.abs(v)*2.5)Sound.play('clink',.35);
}
function updateVertical(dt){
  if(player.climb)return;
  if(player.mantle>0){player.mantle-=dt;const k=1-Math.max(0,player.mantle)/player.mT;
    player.jy=player.m0+(player.mH-player.m0)*Math.min(1,k*1.6);const kk=clamp((k-.35)/.65,0,1);player.x=player.ms.x+(player.me.x-player.ms.x)*kk;player.z=player.ms.z+(player.me.z-player.ms.z)*kk;
    if(player.mantle<=0){player.mantle=0;player.jy=player.mH;player.landT=.15;}return;}
  const sup=supportAt(player.x,player.z,player.jy);
  // jumping into something you can't clear: grab the edge and pull up
  if(player.air&&player.jvy<4&&player.moving&&!player.swim){const m=mantleTarget();if(m&&m.h-player.jy<=1.45&&m.h-player.jy>.15){const o=m.o,k=Math.min(m.d,o.r*.4)/(m.d||1);
    Object.assign(player,{mantle:.45,mT:.45,m0:player.jy,mH:m.h,air:false,jvy:0,ms:{x:player.x,z:player.z},me:{x:o.x+(player.x-o.x)*k,z:o.z+(player.z-o.z)*k}});Sound.play('thud',.35);return;}}
  if(player.air||player.jy>sup+.02){
    if(!player.air){player.air=true;player.jvy=0;player.fall0=player.jy;}
    if(player.fall0==null||player.jvy>0)player.fall0=Math.max(player.fall0||0,player.jy);
    player.jvy-=GRAV*dt;player.jy+=player.jvy*dt;player.jumpT=(player.jumpT||0)+dt;
    if(player.jy<=sup&&player.jvy<=0){const drop=(player.fall0||0)-sup;player.jy=sup;player.air=false;player.jvy=0;player.fall0=null;player.landT=.2;
      Sound.play('thud',clamp(drop/4,.25,1));if(drop>1.5)S.shake=Math.max(S.shake,Math.min(.4,drop*.05));
      if(drop>4.2&&!player.swim){const dmg=(drop-4)*9;player.hurtT=.4;Sound.play('hurt');toast(`Hard landing: −${Math.round(dmg)} HP`,'bad');loseHP(dmg);}
      if(drop>.8)makeNoise(player.x,player.z,6+drop*2);}
  }else{player.jy=sup;player.jvy=0;}
  if(player.swim){player.jy=0;player.air=false;player.jvy=0;}
}
// exhaustion: empty the stamina bar and you're winded (no sprinting or jumping) until it's back to 45
function updateWinded(dt){
  if(player.st<=0.5&&!player.winded&&(player.sprinting||player.swim||player.climb)){player.winded=true;toast('Winded. Catch your breath.','bad');}
  if(player.winded&&player.st>=45)player.winded=false;
  const want=player.winded?1:player.st<30?(30-player.st)/30*.55:0;player.tired=(player.tired||0)+(want-(player.tired||0))*Math.min(1,dt*3);
  if(player.tired>.35){player.breathT=(player.breathT||0)-dt;if(player.breathT<=0){player.breathT=player.winded?.9:1.4;Sound.play('breath',player.tired);}}
}
// is the player out of reach of things on the ground?
const playerHigh=r=>(player.jy||0)>(r||2.2);

/* ---------- procedural animation layer over the hero's clips ----------
   Rotations are given in the character's own frame (x = their left, y = up, z = forward) and converted to each bone's local
   space, so they work whatever the rig's bone axes are. Last frame's offsets are undone before the mixer runs again. */
const HB={},_hq1=new THREE.Quaternion(),_hq2=new THREE.Quaternion(),_hq3=new THREE.Quaternion(),_hax=new V3(),HTOUCH=new Map();
const AX=new V3(1,0,0),AY=new V3(0,1,0),AZ=new V3(0,0,1);
function heroBones(root){const want={hips:/^hips$/i,spine:/^spine$/i,spine1:/^spine0?1$/i,spine2:/^spine0?2$/i,neck:/^neck$/i,head:/^head$/i,
  lSh:/^leftshoulder$/i,rSh:/^rightshoulder$/i,lArm:/^leftarm$/i,rArm:/^rightarm$/i,lFore:/^leftforearm$/i,rFore:/^rightforearm$/i,
  lUp:/^leftupleg$/i,rUp:/^rightupleg$/i,lLeg:/^leftleg$/i,rLeg:/^rightleg$/i,lFoot:/^leftfoot$/i,rFoot:/^rightfoot$/i};
  Object.assign(want,{lHand:/^lefthand$/i,rHand:/^righthand$/i});
  root.traverse(o=>{if(!o.isBone)return;for(const [k,re] of Object.entries(want))if(!HB[k]&&re.test(o.name))HB[k]=o;});}
function bRot(b,axis,ang){
  if(!b||!b.parent||Math.abs(ang)<1e-4)return;
  if(!HTOUCH.has(b))HTOUCH.set(b,b.quaternion.clone());
  pl.getWorldQuaternion(_hq1);_hax.copy(axis).applyQuaternion(_hq1);_hq2.setFromAxisAngle(_hax,ang);
  b.parent.getWorldQuaternion(_hq3);const inv=_hq3.clone().invert();b.quaternion.premultiply(inv.multiply(_hq2).multiply(_hq3));b.updateMatrixWorld(true);
}
function heroUndo(){for(const [b,q] of HTOUCH)b.quaternion.copy(q);HTOUCH.clear();}
function heroSave(){for(const b of Object.values(HB))if(b)HTOUCH.set(b,b.quaternion.clone());}
const HA={swim:0,climb:0,air:0,tired:0,land:0,sf:0};
let SWIM_Y=1.2; // how far below the surface the hero's feet ride while doing the crawl (the clip's body lies at hip height)
function heroProcedural(dt,moving){
  if(!HB.hips||HERO.dead)return;
  const t=performance.now()/1000,ease=(k,v,r)=>{HA[k]+=(v-HA[k])*Math.min(1,dt*(r||8));return HA[k];};
  const swim=ease('swim',player.swim?1:0,5),climb=ease('climb',player.climb?1:0,10),air=ease('air',player.air&&!player.swim?1:0,12),
    tired=ease('tired',player.swim||player.climb?0:player.tired||0,4),mant=player.mantle>0?Math.sin((1-player.mantle/player.mT)*Math.PI):0;
  player.landT=Math.max(0,(player.landT||0)-dt);const land=player.landT>0?Math.sin(player.landT/.2*Math.PI):0;
  HERO.root.updateMatrixWorld(true);heroSave();
  // exhaustion: hunched, heaving chest; standing still it's hands-on-knees
  if(tired>.02){const still=moving?0:1,br=Math.sin(t*(player.winded?7:4.5))*.06*tired;
    bRot(HB.spine,AX,(.28+.42*still)*tired+br);bRot(HB.spine1,AX,(.1+.25*still)*tired);bRot(HB.spine2,AX,.12*tired-br*.6);bRot(HB.head,AX,(-.45*still+.15)*tired);
    if(still){bRot(HB.lUp,AX,-.55*tired);bRot(HB.rUp,AX,-.55*tired);bRot(HB.lLeg,AX,.85*tired);bRot(HB.rLeg,AX,.85*tired);bRot(HB.lFoot,AX,-.3*tired);bRot(HB.rFoot,AX,-.3*tired);
      bRot(HB.lArm,AX,-.95*tired);bRot(HB.rArm,AX,-.95*tired);bRot(HB.lArm,AZ,-.2*tired);bRot(HB.rArm,AZ,.2*tired);bRot(HB.lFore,AX,-.25*tired);bRot(HB.rFore,AX,-.25*tired);}
    else{bRot(HB.lArm,AZ,-.15*tired);bRot(HB.rArm,AZ,.15*tired);}}
  // jumping: tuck the legs, arms up for balance; landing squats
  if(air>.02||land>.02||mant>.02){const up=player.jvy>0?1:.6,a=air*up;
    bRot(HB.lUp,AX,-.75*a-.5*land-.9*mant);bRot(HB.rUp,AX,-.45*a-.5*land-.4*mant);bRot(HB.lLeg,AX,1.05*a+.8*land+1.1*mant);bRot(HB.rLeg,AX,.7*a+.8*land+.5*mant);
    bRot(HB.lArm,AZ,.5*a);bRot(HB.rArm,AZ,-.5*a);bRot(HB.spine,AX,.12*a+.25*land+.45*mant);
    if(mant>.02){bRot(HB.lArm,AX,-1.7*mant);bRot(HB.rArm,AX,-1.7*mant);}}
  // ladder: alternating reach-and-step
  if(climb>.02){const ph=player.climbPh||0,s=Math.sin(ph),c=climb;
    bRot(HB.lArm,AX,(-2.3-.45*s)*c);bRot(HB.rArm,AX,(-2.3+.45*s)*c);bRot(HB.lFore,AX,(-.5+.4*s)*c);bRot(HB.rFore,AX,(-.5-.4*s)*c);
    bRot(HB.lUp,AX,(-.55+.5*s)*c);bRot(HB.rUp,AX,(-.55-.5*s)*c);bRot(HB.lLeg,AX,(.8-.4*s)*c);bRot(HB.rLeg,AX,(.8+.4*s)*c);bRot(HB.head,AX,-.35*c);}
  // shivering in the cold
  {const c=coldAmt();if(c>.05&&!player.swim){bRot(HB.spine2,AZ,Math.sin(t*38)*.035*c);bRot(HB.lSh,AZ,Math.sin(t*41)*.05*c);bRot(HB.rSh,AZ,-Math.sin(t*37)*.05*c);}}
  weaponPose(dt);
  // swimming: front crawl when moving, treading water when still
  if(swim>.02&&!(HERO.acts&&HERO.acts.swim)){const sp=player.moving?1:0,ph=t*(sp?5.2:3); // the hand-made strokes, until the swim clips load
    if(sp){bRot(HB.lArm,AX,(-Math.PI*.5+Math.sin(ph)*2.2)*swim);bRot(HB.rArm,AX,(-Math.PI*.5+Math.sin(ph+Math.PI)*2.2)*swim);
      bRot(HB.lUp,AX,Math.sin(ph*2)*.35*swim);bRot(HB.rUp,AX,-Math.sin(ph*2)*.35*swim);bRot(HB.head,AX,(-.9+Math.sin(ph)*.15)*swim);bRot(HB.head,AY,Math.sin(ph)*.35*swim);}
    else{bRot(HB.lArm,AZ,(.9+Math.sin(ph)*.35)*swim);bRot(HB.rArm,AZ,(-.9-Math.sin(ph)*.35)*swim);bRot(HB.lFore,AX,-.4*swim);bRot(HB.rFore,AX,-.4*swim);
      bRot(HB.lUp,AX,(-.5+Math.sin(ph)*.45)*swim);bRot(HB.rUp,AX,(-.5-Math.sin(ph)*.45)*swim);bRot(HB.lLeg,AX,(.7+Math.sin(ph+1)*.3)*swim);bRot(HB.rLeg,AX,(.7-Math.sin(ph+1)*.3)*swim);}}
}
// whole-body pose: lie flat to swim, lean into the ladder, sink a little when exhausted
function bodyPose(dt){
  // the swim clips lie the body flat themselves; HA.sf eases between treading water (0) and swimming (1)
  const swimMove=player.swim&&player.moving?1:0,clip=!!(HERO.acts&&HERO.acts.swim);HA.sf=(HA.sf||0)+(swimMove-(HA.sf||0))*Math.min(1,dt*5);
  HA.pitch=(HA.pitch||0)+((swimMove&&!clip?1.32:player.swim&&!clip?.18:player.crouch&&!HERO.ual?.22:0)-(HA.pitch||0))*Math.min(1,dt*6);
  return HA.pitch;
}

