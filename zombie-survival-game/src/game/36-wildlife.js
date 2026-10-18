/* ================= WILDLIFE =================
   Deer and rabbits graze and bolt when they see or hear you; crows burst into the air cawing (and the infected hear them);
   wolf packs stalk the woods and hunt you, more often after dark. Kill game, then butcher it (E) for food and hide. */
const AN={
  deer:{name:'Deer',hp:45,run:9.5,walk:1.5,r:.55,flee:24,meat:2,hide:1,xp:22,h:1.9},
  rabbit:{name:'Rabbit',hp:8,run:8.5,walk:1.3,r:.28,flee:10,meat:1,hide:0,xp:8,h:.7},
  wolf:{name:'Wolf',hp:65,run:8.3,walk:2.1,r:.5,meat:1,hide:2,xp:32,dmg:10,aggro:24,h:1.35},
  crow:{name:'Crow',hp:3,run:7,walk:.5,r:.18,flee:11,meat:0,hide:0,xp:2,h:.45},
};
const animals=[];let packN=0,wolfWarned=false,butcherTip=false;
// painted coats: hair strokes over a back-to-belly gradient, plus face sprites with eyes and nose on the head's front
function coat(key,top,base,belly,o){o=o||{};return sprMat('coat'+key,128,128,(g,w,h,r)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,top);gr.addColorStop(.55,base);gr.addColorStop(1,belly);g.fillStyle=gr;g.fillRect(0,0,w,h);
  if(o.saddle){g.fillStyle=o.saddle;g.beginPath();g.ellipse(w/2,0,w*.55,h*.35,0,0,6.28);g.fill();}
  if(o.spots)for(let k=0;k<o.spots;k++){g.fillStyle='rgba(245,238,220,.75)';g.beginPath();g.arc(r(10,w-10),r(10,h*.5),r(2,4),0,6.28);g.fill();}
  for(let k=0;k<420;k++){const x=r(0,w),y=r(0,h),l=r(3,7);g.strokeStyle=k%3?'rgba(20,12,6,.28)':'rgba(255,240,210,.18)';g.lineWidth=1;g.beginPath();g.moveTo(x,y);g.lineTo(x+l*.4,y+l);g.stroke();}
  if(o.feather){g.strokeStyle='rgba(120,140,200,.35)';g.lineWidth=2;for(let k=0;k<10;k++){const y=r(0,h);g.beginPath();g.moveTo(0,y);g.quadraticCurveTo(w/2,y-10,w,y);g.stroke();}}
  g.strokeStyle=INKC;g.lineWidth=5;g.strokeRect(0,0,w,h);});}
function face(key,base,eye,nose){return sprMat('face'+key,64,64,(g,w,h,r)=>{g.fillStyle=base;g.fillRect(0,0,w,h);for(let k=0;k<80;k++){g.strokeStyle='rgba(20,12,6,.25)';g.lineWidth=1;const x=r(0,w),y=r(0,h);g.beginPath();g.moveTo(x,y);g.lineTo(x+2,y+4);g.stroke();}
  for(const x of [.27,.73]){g.fillStyle=INKC;g.beginPath();g.ellipse(x*w,h*.36,w*.1,h*.11,0,0,6.28);g.fill();g.fillStyle=eye;g.beginPath();g.ellipse(x*w,h*.36,w*.06,h*.07,0,0,6.28);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x*w-2,h*.32,2,0,6.28);g.fill();}
  g.fillStyle=nose;g.beginPath();g.ellipse(w/2,h*.78,w*.16,h*.1,0,0,6.28);g.fill();g.strokeStyle=INKC;g.lineWidth=4;g.strokeRect(0,0,w,h);});}
const COATS={};
function animalMats(type){if(COATS[type])return COATS[type];let c;
  if(type==='deer'){const s=coat('deer','#6a4226','#9a6a3e','#e8dcc4'),t=coat('deerT','#5a3820','#7a5030','#8a5e38'),f=face('deer','#8a5e38','#2a1a10','#1a1410');c={body:[s,s,t,coat('deerB','#e8dcc4','#efe6d6','#f4ecdc'),s,s],head:[s,s,t,s,f,s],leg:coat('deerL','#5a3a22','#6a4428','#3a2618')};}
  else if(type==='rabbit'){const s=coat('rab','#6a5a48','#9a8a72','#e8e0d0',{spots:0}),f=face('rab','#8a7a66','#3a2a1a','#d89a9a');c={body:[s,s,coat('rabT','#5a4a3a','#7a6a56','#8a7a66'),s,s,s],head:[s,s,s,s,f,s]};}
  else if(type==='wolf'){const s=coat('wolf','#4a4846','#7a7874','#c8c4bc',{saddle:'rgba(30,28,26,.6)'}),t=coat('wolfT','#2e2c2a','#4a4846','#5a5854'),f=face('wolf','#6a6864','#e8b830','#141210');c={body:[s,s,t,coat('wolfB','#c8c4bc','#d8d4cc','#e0dcd4'),s,s],head:[s,s,t,s,f,s],leg:coat('wolfL','#3a3836','#5a5854','#2a2826')};}
  else{const s=coat('crow','#0e0f12','#17181d','#22232a',{feather:true});c={body:[s,s,s,s,s,s],head:[s,s,s,s,face('crow','#17181d','#c8a040','#3a3a3a'),s]};}
  return COATS[type]=c;}
function makeAnimal(type){
  const g=new THREE.Group(),legs=[],wings=[],AM=animalMats(type);
  const leg=(x,y,z,h,w,m)=>{const p=new THREE.Group();p.position.set(x,y,z);p.add(mk(BOX(w,h,w),m,0,-h/2,0));g.add(p);legs.push(p);};
  if(type==='deer'){const c=AM.body[0],dk=AM.leg,wh=M(0xeee6d6);
    g.add(mki(BOX(.5,.55,1.25),AM.body,0,1.05,0,.04));const n=mki(BOX(.22,.62,.26),c,0,1.45,.55,.03);n.rotation.x=-.5;g.add(n);
    const hd=mki(BOX(.22,.26,.46),AM.head,0,1.76,.76,.03);g.add(hd);g.add(mk(BOX(.06,.18,.1),c,.13,1.92,.66));g.add(mk(BOX(.06,.18,.1),c,-.13,1.92,.66));
    g.add(mk(BOX(.12,.14,.06),wh,0,1.2,-.64));
    if(Math.random()<.5)for(const s of [-1,1]){const a=mk(CYL(.022,.03,.5,4),M(0xd8ccb0),s*.12,2.08,.66);a.rotation.z=s*.45;g.add(a);const t=mk(CYL(.02,.02,.24,4),M(0xd8ccb0),s*.2,2.2,.74);t.rotation.x=.6;g.add(t);}
    for(const [x,z] of [[.17,.45],[-.17,.45],[.17,-.45],[-.17,-.45]])leg(x,.82,z,.82,.1,dk);
  }else if(type==='rabbit'){const c=AM.body[0],wh=M(0xeee6d6);
    g.add(mki(BOX(.26,.24,.42),AM.body,0,.2,0,.03));g.add(mki(BOX(.18,.18,.2),AM.head,0,.34,.22,.02));g.add(mk(BOX(.05,.22,.04),c,.05,.52,.2));g.add(mk(BOX(.05,.22,.04),c,-.05,.52,.2));g.add(mk(BOX(.1,.1,.06),wh,0,.25,-.23));
  }else if(type==='wolf'){const c=AM.body[0],dk=AM.leg;
    g.add(mki(BOX(.42,.44,1.05),AM.body,0,.8,0,.04));g.add(mki(BOX(.3,.28,.36),AM.head,0,1.02,.66,.03));g.add(mk(BOX(.16,.14,.26),dk,0,.95,.9));
    g.add(mk(BOX(.08,.15,.05),dk,.1,1.2,.58));g.add(mk(BOX(.08,.15,.05),dk,-.1,1.2,.58));const tl=mk(BOX(.1,.1,.55),c,0,.84,-.72);tl.rotation.x=.55;g.add(tl);
    g.add(mk(BOX(.05,.04,.02),BASIC(0xffd23f),.08,1.06,.85,false));g.add(mk(BOX(.05,.04,.02),BASIC(0xffd23f),-.08,1.06,.85,false));
    for(const [x,z] of [[.14,.38],[-.14,.38],[.14,-.38],[-.14,-.38]])leg(x,.6,z,.6,.1,dk);
  }else{const c=AM.body[0];
    g.add(mk(BOX(.14,.12,.26),c,0,.14,0));g.add(mk(BOX(.1,.1,.1),AM.head,0,.22,.15));g.add(mk(BOX(.03,.03,.08),M(0x3a3a3a),0,.21,.23));
    for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*.07,.17,0);p.add(mk(BOX(.3,.02,.16),c,s*.15,0,0));g.add(p);wings.push(p);}
  }
  return{g,legs,wings};
}
function spawnAnimal(type,x,z,pack){
  const d=AN[type],m=makeAnimal(type);m.g.position.set(x,0,z);scene.add(m.g);
  const a={type,d,...m,x,z,y:0,yaw:rand(0,6.28),hp:d.hp,state:'graze',t:rand(0,4),tx:x,tz:z,ph:rand(0,6),dead:false,deadT:0,pack,atkCd:0,flash:0,vx:0,vz:0,vy:0};
  animals.push(a);return a;
}
function removeAnimal(i){const a=animals[i];scene.remove(a.g);a.g.traverse(o=>{if(o.material===INK)inkHulls.delete(o);});animals.splice(i,1);}
function clearAnimals(){for(let i=animals.length-1;i>=0;i--)removeAnimal(i);}
function spawnAnimals(){
  let n=0;const packs=new Set();for(const a of animals){if(a.dead)continue;n++;if(a.type==='wolf')packs.add(a.pack);}
  const night=S.phase==='night';if(n>=(night?10:15))return;
  for(let k=0;k<8;k++){const ang=rand(0,6.28),r=rand(62,112),x=player.x+Math.cos(ang)*r,z=player.z+Math.sin(ang)*r;
    if(blockedSpot(x,z,1.4))continue;
    const b=bioC(Math.floor(x/CH),Math.floor(z/CH));
    const w=b==='forest'?{deer:4,rabbit:2,wolf:night?4.5:1.4,crow:1.2}:b==='town'?{crow:5,rabbit:1.5,wolf:night?2.4:.6,deer:.4}:{rabbit:3.5,deer:3,crow:2.6,wolf:night?2.4:.6};
    if(S.season===3){w.deer*=.5;w.rabbit*=.6;w.wolf*=1.7;w.crow*=.6;}else if(S.season===0){w.deer*=1.25;w.rabbit*=1.3;}else if(S.season===2)w.crow*=1.5;
    if(packs.size>=(night?3:2)||(S.wave===0&&!night&&RPG.lv<2))w.wolf=0;
    let s=0;for(const t in w)s+=w[t];let rr=Math.random()*s,t='deer';for(const q in w){rr-=w[q];if(rr<=0){t=q;break;}}
    const cnt=t==='deer'?randi(2,4):t==='rabbit'?randi(1,3):t==='wolf'?randi(2,4):randi(5,8),pack={id:++packN,howled:false,flown:false};
    for(let i=0;i<cnt;i++){const ax=x+rand(-3,3),az=z+rand(-3,3);if(depthAt(ax,az)>-.15||blockedSpot(ax,az,.6))continue;spawnAnimal(t,ax,az,pack);}
    return;}
}
function scareAnimals(x,z,r){
  for(const a of animals){if(a.dead)continue;const d=Math.hypot(a.x-x,a.z-z);if(d>r)continue;
    if(a.type==='wolf'){if(d<r*.6&&a.state!=='chase'&&a.state!=='flee')packAggro(a.pack);}
    else if(a.type==='crow')crowFly(a);
    else{a.state='flee';a.t=rand(4,7);const l=d||1;a.fx=(a.x-x)/l;a.fz=(a.z-z)/l;}}
}
function crowFly(a){
  if(a.state==='fly')return;a.state='fly';a.t=6;a.vy=rand(3,5);const ang=Math.atan2(a.x-player.x,a.z-player.z)+rand(-.8,.8);a.vx=Math.sin(ang)*rand(5,8);a.vz=Math.cos(ang)*rand(5,8);
  if(!a.pack.flown){a.pack.flown=true;Sound.play('caw',clamp(1-Math.hypot(a.x-player.x,a.z-player.z)/60,.2,1));
    for(const zb of zombies)if(!zb.aware&&!zb.dying&&Math.hypot(zb.x-a.x,zb.z-a.z)<24){zb.sus=Math.min(1,zb.sus+.65);if(zb.sus>=1)zAlert(zb);}
    for(const o of animals)if(o.pack===a.pack)crowFly(o);}
}
function packAggro(pack){
  for(const a of animals)if(a.pack===pack&&!a.dead&&a.state!=='flee'){a.state='chase';a.t=0;}
  if(!pack.howled){pack.howled=true;Sound.play('howl');if(!wolfWarned){wolfWarned=true;toast('Wolves are hunting you. Get high, get inside, or fight.','bad');}}
}
function anMove(a,vx,vz,dt){
  const ox=a.x,oz=a.z;a.x+=vx*dt;a.z+=vz*dt;
  if(depthAt(a.x,a.z)>.4||(Math.abs(a.x)<BR+1.5&&Math.abs(a.z)<BR+1.5)){a.x=ox;a.z=oz;return false;}
  collideCircles(a,a.d.r);return true;
}
function hitAnimal(a,dmg,kx,kz){
  if(a.dead)return;a.hp-=dmg;a.flash=.1;dmgNum(a,dmg,a.hp<=0?'kill':'',a.d.h+.3);burst(a.x,a.d.h*.6,a.z,3,'blood',3);Sound.play('hit',.6,a.x,a.z);
  if(a.type==='wolf'){if(a.state!=='chase'&&a.state!=='flee')packAggro(a.pack);}
  else if(a.type==='crow')crowFly(a);
  else{a.state='flee';a.t=rand(5,8);const l=Math.hypot(a.x-player.x,a.z-player.z)||1;a.fx=(a.x-player.x)/l;a.fz=(a.z-player.z)/l;if(a.type==='deer')Sound.play('bleat');}
  a.x+=(kx||0)*.04;a.z+=(kz||0)*.04;
  if(a.hp<=0)killAnimal(a);
}
function killAnimal(a){
  a.dead=true;a.deadT=0;a.state='dead';gainXP(a.d.xp);
  if(a.type==='deer')jobProg('hunt',1);if(a.type==='wolf')jobProg('wolf',1);
  if(a.type==='crow'){a.deadT=99;burst(a.x,a.y+.3,a.z,6,'debris',3);return;}
  if(!butcherTip){butcherTip=true;setTimeout(()=>toast(`Walk up to the carcass and press ${pad.active?'A':'E'} to butcher it for food and hide.`),700);}
}
function nearestCarcass(){let best=null,bd=2.3;for(const a of animals){if(!a.dead||a.done||a.type==='crow')continue;const d=Math.hypot(a.x-player.x,a.z-player.z);if(d<bd){bd=d;best=a;}}return best;}
function butcher(a){
  a.done=true;a.deadT=Math.max(a.deadT,40);const f=a.d.meat+(a.d.meat?PERK('forager')+PERK('wilds'):0),h=a.d.hide?a.d.hide+PERK('hunter'):0;
  player.meat=(player.meat||0)+f;player.hide=(player.hide||0)+h;floatText(a.x,1.2,a.z,`+${f} raw meat${h?` · +${h} hide`:''}`);
  burst(a.x,.5,a.z,8,'blood',3);decal(a.x,a.z,rand(.8,1.1),0x4a0a08,.75);Sound.play('swing',.6);player.swing=.25;gainXP(5);
}
function animalsInArc(range){const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw),out=[];
  for(const a of animals){if(a.dead||a.state==='fly')continue;const dx=a.x-player.x,dz=a.z-player.z,d=Math.hypot(dx,dz);if(d<range+a.d.r&&(dx*fx+dz*fz)/(d||1)>.3)out.push(a);}return out;}
function updateAnimals(dt){
  S.anT=(S.anT||0)-dt;if(S.anT<=0){S.anT=1.6;spawnAnimals();}
  const px=player.x,pz=player.z,night=S.phase==='night';
  for(let i=animals.length-1;i>=0;i--){const a=animals[i],d0=Math.hypot(a.x-px,a.z-pz);
    if(d0>170){removeAnimal(i);continue;}
    if(a.dead){a.deadT+=dt;const k=Math.min(1,a.deadT/.45);a.g.rotation.z=k*1.45;a.g.position.y=-k*.15-(a.deadT>60?(a.deadT-60)*.1:0);
      if(a.deadT>75||(a.done&&a.deadT>44)){removeAnimal(i);}continue;}
    a.flash-=dt;a.atkCd-=dt;let vx=0,vz=0,moving=0;
    if(a.type==='crow'){
      if(a.state==='fly'){a.t-=dt;a.vy=Math.max(1,a.vy-dt*1.2);a.y+=a.vy*dt;a.x+=a.vx*dt;a.z+=a.vz*dt;for(const w of a.wings)w.rotation.z=Math.sin(performance.now()/45+a.ph)*.9*(w.position.x>0?1:-1);
        a.yaw=Math.atan2(a.vx,a.vz);if(a.t<=0){removeAnimal(i);continue;}}
      else{a.ph+=dt*6;a.g.children[1].position.y=.22-Math.max(0,Math.sin(a.ph))*.06;
        if(player.alive&&d0<a.d.flee*(player.crouch?.45:1)*(player.sprinting?1.4:1))crowFly(a);
        a.t-=dt;if(a.t<=0){a.t=rand(1,3);a.tx=a.x+rand(-1.5,1.5);a.tz=a.z+rand(-1.5,1.5);}
        const dx=a.tx-a.x,dz=a.tz-a.z,l=Math.hypot(dx,dz);if(l>.2){vx=dx/l*a.d.walk;vz=dz/l*a.d.walk;moving=1;}}
    }else if(a.type==='wolf'){
      const ag=a.d.aggro*(night?1.6:1)*(player.crouch?.6:1)*(1-.12*PERK('ghost'));
      if(a.state!=='chase'&&a.state!=='flee'&&player.alive&&d0<ag&&!inBase(px,pz))packAggro(a.pack);
      if(a.hp<a.d.hp*.3&&a.state!=='flee'){a.state='flee';a.t=9;const l=d0||1;a.fx=(a.x-px)/l;a.fz=(a.z-pz)/l;}
      if(a.state==='chase'){
        if(!player.alive||d0>75||inBase(px,pz)||(player.lvl||0)>0){a.state='walk';a.t=rand(3,6);a.tx=a.x+rand(-12,12);a.tz=a.z+rand(-12,12);}
        else{const k=animals.indexOf(a)%3-1,ox=d0>5?-(pz-a.z)/d0*k*2.5:0,oz=d0>5?(px-a.x)/d0*k*2.5:0,dx=px+ox-a.x,dz=pz+oz-a.z,l=Math.hypot(dx,dz)||1;
          if(d0>1.5){vx=dx/l*a.d.run;vz=dz/l*a.d.run;moving=2;}
          if(d0<1.9&&a.atkCd<=0&&!playerHigh(.9)){a.atkCd=rand(1,1.4);hurtPlayer(a.d.dmg*(1-.1*(player.armor||0)));knockPlayer((px-a.x)/(d0||1),(pz-a.z)/(d0||1),3);a.lunge=.25;Sound.play('thud',.6);}}
      }
    }else if(player.alive&&a.state!=='flee'&&d0<a.d.flee*(player.crouch?.45:1)*(player.sprinting?1.35:1)*(1-.2*PERK('hunter'))*(night?.8:1)){
      a.state='flee';a.t=rand(4,7);const l=d0||1;a.fx=(a.x-px)/l;a.fz=(a.z-pz)/l;if(a.type==='deer'&&Math.random()<.5)Sound.play('bleat',clamp(1-d0/40,.2,1));}
    if(a.type!=='crow'){
      if(a.state==='flee'){a.t-=dt;const j=Math.sin(performance.now()/400+a.ph)*.35,c=Math.cos(j),s=Math.sin(j);vx=(a.fx*c-a.fz*s)*a.d.run;vz=(a.fx*s+a.fz*c)*a.d.run;moving=2;
        if(a.t<=0){a.state='graze';a.t=rand(2,5);if(a.type==='wolf'&&a.hp<a.d.hp*.3)a.hp=a.d.hp*.31;}}
      else if(a.state==='walk'){a.t-=dt;const dx=a.tx-a.x,dz=a.tz-a.z,l=Math.hypot(dx,dz);if(l<.6||a.t<=0){a.state='graze';a.t=rand(2,6);}else{vx=dx/l*a.d.walk;vz=dz/l*a.d.walk;moving=1;}}
      else if(a.state==='graze'){a.t-=dt;if(a.t<=0){a.state='walk';a.t=rand(4,8);const g=Math.atan2(px-a.x,pz-a.z)+Math.PI+rand(-1.6,1.6),r=rand(4,12);a.tx=a.x+Math.sin(g)*r;a.tz=a.z+Math.cos(g)*r;}}
      if(moving&&!anMove(a,vx,vz,dt)){if(a.state==='flee'){const t=a.fx;a.fx=-a.fz;a.fz=t;}else if(a.state==='walk'){a.state='graze';a.t=rand(1,2);}}
    }else if(moving)anMove(a,vx,vz,dt);
    if(moving){const ty=Math.atan2(vx,vz);let dy=ty-a.yaw;while(dy>Math.PI)dy-=Math.PI*2;while(dy<-Math.PI)dy+=Math.PI*2;a.yaw+=dy*Math.min(1,dt*(moving>1?10:4));}
    a.ph+=dt*(moving===2?a.d.run*1.6:moving?a.d.walk*3:0);
    const sw=moving?Math.sin(a.ph):0,amp=moving===2?.85:.4;
    for(let k=0;k<a.legs.length;k++)a.legs[k].rotation.x=sw*amp*(k===0||k===3?1:-1);
    let bob=0;if(a.type==='rabbit'&&moving)bob=Math.abs(Math.sin(a.ph*.6))*(moving===2?.35:.12);
    a.lunge=Math.max(0,(a.lunge||0)-dt);
    a.g.position.set(a.x,a.y+bob,a.z);a.g.rotation.y=a.yaw;a.g.rotation.x=a.type!=='crow'&&a.state==='graze'&&a.type==='deer'?.12:(a.lunge>0?-.25:0);
  }
}

