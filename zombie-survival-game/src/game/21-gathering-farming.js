/* ================= GATHERING & FARMING =================
   E (hold to repeat) chops trees and mines rocks; both make noise. Garden beds in the yard grow crops from seeds. */
const FELL=[];
function gatherTarget(){
  let best=null,bd=1e9;
  nearObs(player.x,player.z,1.8,o=>{const t=o.tree||o.rock;if(!t)return;const d=Math.hypot(o.x-player.x,o.z-player.z)-o.r;if(d<1.15&&d<bd){bd=d;best=t;}});
  return best;
}
function floatText(x,y,z,txt,cls){const d=DN[dnI=(dnI+1)%DN.length];Object.assign(d,{tgt:null,amt:0,life:1.2,x,z,y,vx:0,t0:0});d.e.textContent=txt;d.e.className='dmgn '+(cls||'res');d.e.style.display='';}
function gather(t){
  if(player.fireCd>0||player.swim||!player.alive)return;
  const I=curW(),w=I&&wstat(I),melee=w&&w.melee&&!w.saw,axe=melee&&I.tier>=4,saw=w&&w.saw;
  const isTree=!!t.g;player.fireCd=saw?.25:.5;player.swing=.28;WA.chop=isTree?1:0;heroAction('chop',{from:.32,speed:saw?2.6:1.75,dur:saw?.25:.48});if(isTree&&player.axeT)toolWear('axe');else if(!isTree&&player.pickT)toolWear('pick');rumble(.25,.2,70);S.shake=Math.max(S.shake,.05);
  const hit=(isTree?(saw?1.5:axe?2:melee?1.4:1):(melee?1.3:1))*[1,1.6,2.4][isTree?player.axeT||0:player.pickT||0];t.hp-=hit;
  if(isTree){Sound.play('thud',.8);Sound.play(saw?'saw':'swing',.5);burst(t.x,1.1,t.z,5,'debris',4);t.g.rotation.z=rand(-.06,.06);makeNoise(t.x,t.z,saw?40:18);}
  else{Sound.play('clink',1);Sound.play('thud',.6);burst(t.x,.8,t.z,6,'spark',5);burst(t.x,.6,t.z,3,'debris',3);makeNoise(t.x,t.z,24);}
  if(t.hp>0)return;
  delOb(t.ob);const mem=t.ch&&chunkMem.get(t.ch.key);if(mem){(mem.cut||(mem.cut=new Set())).add(cutKey(t.x,t.z));}
  const lst=isTree?trees:rocks,i=lst.indexOf(t);if(i>=0)lst.splice(i,1);
  if(t.ch){const l2=isTree?t.ch.trees:t.ch.rocks,j=l2.indexOf(t);if(j>=0)l2.splice(j,1);}
  gainXP(5);
  if(isTree){const n=Math.round((t.kind==='dead'?2:3)+t.s*1.5+rand(0,1.5))+PERK('lumber')+PERK('wilds');player.wood=(player.wood||0)+n;jobProg('wood',n);floatText(t.x,2.4,t.z,`+${n} wood`);
    const a=Math.atan2(t.x-player.x,t.z-player.z);FELL.push({g:t.g,t:0,ax:Math.cos(a),az:-Math.sin(a)});Sound.play('crash',.6);}
  else{const n=Math.round(2+t.s*2)+PERK('lumber')+PERK('wilds');player.stone=(player.stone||0)+n;jobProg('stone',n);let txt=`+${n} stone`;
    if(Math.random()<.3){const sc=randi(4,8);player.scrap+=sc;txt+=` · +${sc} scrap`;}if(Math.random()<.12){player.parts++;txt+=' · +1 part';}
    floatText(t.x,1.6,t.z,txt);scene.remove(t.m);burst(t.x,.6,t.z,12,'debris',6);Sound.play('crash',.5);}
}
function updateFelling(dt){
  for(let i=FELL.length-1;i>=0;i--){const f=FELL[i];f.t+=dt;const k=Math.min(1,f.t/1.1),a=k*k*1.45;
    f.g.rotation.x=f.ax*a;f.g.rotation.z=f.az*a;if(f.t>1.1)f.g.position.y=-(f.t-1.1)*1.2;
    if(f.t>1.1&&f.t-dt<=1.1){burst(f.g.position.x+Math.sin(Math.atan2(f.az,f.ax))*2,.4,f.g.position.z,8,'debris',5);S.shake=Math.max(S.shake,.12);}
    if(f.t>2.4){scene.remove(f.g);FELL.splice(i,1);}}
}
// ----- garden beds in the yard -----
const CROPS=[{id:'corn',name:'Corn',ready:'Corn is',yield:3},{id:'pumpkin',name:'Pumpkins',ready:'Pumpkins are',yield:4},{id:'cabbage',name:'Cabbages',ready:'Cabbages are',yield:2}];
const PLOTS=[];const GROW_T=50; // seconds per growth stage (3 stages); rain speeds it up
const GSPOT={pump:[2.1,-8.9],crow:[5.75,-12.7],cellar:[11,-12]},GARDEN={scare:false,cellar:false,stored:0,can:0},GM={},CAN_MAX=4,CELLAR_MAX=60;
const GCOST={crow:{wood:6,scrap:10},cellar:{wood:10,stone:8}},gcTxt=c=>Object.entries(c).map(([k,v])=>`${v} ${k}`).join(', ');
(function buildGarden(){
  const soil=TM('soil',1,1,0x4a3626,0xe8e0d8),frame=TM('wood',1,1,0x5a4430,0xa08a70),straw=TM('straw',1,1,0xb8963a,0xffffff);
  for(const [x,z] of [[4.4,-10.3],[7.1,-10.3],[4.4,-7.5],[7.1,-7.5]]){
    const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
    g.add(mk(BOX(2.2,.18,2.2),soil,0,.1,0));
    for(const [a,b,w,d] of [[0,1.12,2.4,.14],[0,-1.12,2.4,.14],[1.12,0,.14,2.4],[-1.12,0,.14,2.4]])g.add(mki(BOX(w,.3,d),frame,a,.15,b,.04));
    g.add(mk(BOX(2.6,.04,2.6),straw,0,.02,0,false));
    const crop=new THREE.Group();g.add(crop);
    const wet=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),new THREE.MeshBasicMaterial({color:0x140c06,transparent:true,opacity:0,depthWrite:false}));wet.rotation.x=-Math.PI/2;wet.position.y=.196;g.add(wet);
    PLOTS.push({x,z,g,crop,wet,type:null,stage:0,t:0,water:0,pest:rand(40,80)});
  }
  // straw bales stacked by the beds
  const bale=TM('straw',1,1,0xb8963a,0xffffff);for(const [x,y,z,r] of [[9.2,.35,-9.6,.1],[9.2,.35,-8.4,-.05],[9.2,1.05,-9,.3]]){const b=mki(BOX(1.1,.7,.7),bale,x,y,z,.05);b.rotation.y=Math.PI/2+r;scene.add(b);}
  addOb({x:9.2,z:-9,r:.75,h:1.4});
  const iron=M(0x3a3f44,{metalness:.5,roughness:.5}),stone=M(0x6e6b63),cloth=M(0x9e2b25),dark=M(0x2a231c);
  // the farm well: draw water for the watering can, and a drink for you
  {const [x,z]=GSPOT.pump,g=wellMesh();g.position.set(x,0,z);scene.add(g);
    const can=new THREE.Group();can.position.set(x-1.4,0,z+.5);can.add(mki(CYL(.13,.15,.3,10),M(0x6f8a7a,{metalness:.4}),0,.15,0,.03));const cs=mki(CYL(.025,.035,.36,6),M(0x6f8a7a,{metalness:.4}),.18,.28,0,.02);cs.rotation.z=-1;can.add(cs);scene.add(can);GM.can=can;
    addOb({x,z,r:1.08,h:.95});}
  // build spots: a stake and a sign until something is built there
  const stake=(x,z)=>{const s=new THREE.Group();s.position.set(x,0,z);s.add(mki(BOX(.08,.8,.08),frame,0,.4,0,.03));s.add(mki(BOX(.5,.3,.04),frame,0,.72,.05,.03));scene.add(s);return s;};
  {const [x,z]=GSPOT.crow;GM.crowMark=stake(x,z);const s=new THREE.Group();s.position.set(x,0,z);
    s.add(mki(CYL(.06,.07,2.1,6),frame,0,1.05,0,.03));s.add(mki(BOX(1.5,.08,.08),frame,0,1.55,0,.03));
    s.add(mki(BOX(.62,.72,.28),cloth,0,1.3,0,.04));for(const sx of [-1,1]){s.add(mki(BOX(.42,.2,.2),cloth,sx*.48,1.55,0,.03));const t=mk(new THREE.ConeGeometry(.09,.22,5),straw,sx*.78,1.5,0,false);t.rotation.z=sx*2.2;s.add(t);}
    s.add(mki(new THREE.SphereGeometry(.21,10,8),straw,0,1.98,0,.03));s.add(mki(CYL(.34,.34,.03,12),dark,0,2.12,0,.02));s.add(mki(CYL(.16,.2,.2,10),dark,0,2.22,0,.02));
    s.visible=false;scene.add(s);GM.scare=s;addOb({x,z,r:.3});}
  {const [x,z]=GSPOT.cellar;GM.cellarMark=stake(x,z);const c=new THREE.Group();c.position.set(x,0,z);
    c.add(mki(BOX(1.9,.36,1.5),stone,0,.18,0,.04));for(const sx of [-1,1]){const dr=mki(BOX(.86,.07,1.3),frame,sx*.44,.43,0,.03);dr.rotation.z=-sx*.2;c.add(dr);c.add(mk(BOX(.06,.05,.25),iron,sx*.25,.5,0,false));}
    c.visible=false;scene.add(c);GM.cellar=c;addOb({x,z,r:.85,h:.5});}
})();
function gardenMeshes(){GM.scare.visible=GARDEN.scare;GM.crowMark.visible=!GARDEN.scare;GM.cellar.visible=GARDEN.cellar;GM.cellarMark.visible=!GARDEN.cellar;}
function nearestGardenSpot(){for(const k in GSPOT){if(k==='crow'&&GARDEN.scare)continue;const [x,z]=GSPOT[k];if(Math.hypot(x-player.x,z-player.z)<(k==='pump'?2.4:1.8))return k;}return null;}
function gardenSpotPrompt(k){
  if(k==='pump')return`Draw water · drink and fill the can (${GARDEN.can}/${CAN_MAX})`;
  if(k==='crow')return`Build a scarecrow · ${gcTxt(GCOST.crow)}`;
  if(!GARDEN.cellar)return`Dig a root cellar · ${gcTxt(GCOST.cellar)}`;
  return(player.food|0)>2?`Store ${Math.min((player.food|0)-2,CELLAR_MAX-GARDEN.stored)} food in the cellar · ${GARDEN.stored}/${CELLAR_MAX}`:GARDEN.stored>0?`Take food from the cellar · ${GARDEN.stored} stored`:'Root cellar is empty';
}
function useGardenSpot(k){const [x,z]=GSPOT[k];
  if(k==='pump'){useWell({x,z});return;}
  if(k==='crow'||!GARDEN.cellar){const c=GCOST[k];if(!afford2(c)){toast(`You need ${gcTxt(c)}.`,'bad');return;}pay2(c);Sound.play('build');gainXP(15);burst(x,.5,z,8,'debris',3);
    if(k==='crow'){GARDEN.scare=true;toast('Scarecrow up. Crows and deer will mostly leave your beds alone.','good');}else{GARDEN.cellar=true;toast('Root cellar dug. Food stored down here never spoils.','good');}gardenMeshes();return;}
  const f=player.food|0;
  if(f>2){const n=Math.min(f-2,CELLAR_MAX-GARDEN.stored);if(n<=0){toast('The cellar is full.');return;}player.food=f-n;GARDEN.stored+=n;Sound.play('door',.6);floatText(x,1,z,`Stored ${n} food`);}
  else if(GARDEN.stored>0){const n=Math.min(GARDEN.stored,capOf('food')-f);if(n<=0){toast('You can\'t carry any more food.');return;}GARDEN.stored-=n;player.food=f+n;Sound.play('door',.6);floatText(x,1,z,`Took ${n} food`);}
  else toast('The cellar is empty. Store food here so it won\'t spoil.');
}
// carried food goes off overnight in the warm months; the cellar keeps it
function spoilFood(){const r=[.12,.25,.1,0][S.season||0],ex=(player.food|0)-3;if(!r||ex<=0)return;const n=Math.max(1,Math.round(ex*r));player.food-=n;
  setTimeout(()=>toast(`${n} food spoiled overnight${S.season===1?' in the heat':''}. ${GARDEN.cellar?'Keep spare food in the root cellar.':'A root cellar would keep it fresh.'}`,'bad'),2600);}
function pestHit(pl,night){const who=night?'Deer':'Crows',nm=pl.type.name.toLowerCase();
  if(pl.stage>=3)pl.pecked=Math.min(pl.type.yield-1,(pl.pecked||0)+1);else{pl.t=0;if(pl.stage>1){pl.stage--;cropVisual(pl);}}
  if(!night){Sound.play('caw',.8,pl.x,pl.z);burst(pl.x,.8,pl.z,6,'debris',3);}
  if(!(S.time-(S.pestMsgT||-1e9)<60)){S.pestMsgT=S.time;toast(`${who} got into the ${nm}${GARDEN.scare?'':'. A scarecrow would keep them off'}.`,'bad');}}
const plotActionable=pl=>pl.dead||(!pl.type&&player.seeds>0)||pl.stage>=3||(!!pl.type&&pl.water<=.6&&GARDEN.can>0);
const leafMat=(name,col,tint)=>{const m=new THREE.MeshToonMaterial({color:col,gradientMap:TOON_GRAD,side:THREE.DoubleSide});onTex(name,()=>{m.map=texRep(name,1,1);m.color.setHex(tint);m.needsUpdate=true;});return m;};
const cropMats={stalk:TM('cornleaf',1,3,0x5a7a2c,0xb8d098),leaf:leafMat('cornleaf',0x4f6e26,0xffffff),vine:leafMat('cabbage',0x3e6a2a,0x7aa060),corn:TM('kernels',1,2,0xd0a024,0xffffff),husk:leafMat('cornleaf',0xb8b070,0xe8d890),
  pumpkin:TM('pumpkin',2,1,0xc05a1a,0xffffff),cabbage:TM('cabbage',1,1,0x6a9440,0xffffff),cabOut:leafMat('cabbage',0x5a8a3a,0xc8e0b0),sprout:M(0x5f8a32),stem:M(0x4a5a22),dead:M(0x6a5236)};
const LEAF_G=(()=>{const g=new THREE.PlaneGeometry(.13,.95,1,4);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i)+.475;p.setZ(i,y*y*.55);p.setX(i,p.getX(i)*(1-y*.6));}g.translate(0,.475,0);g.computeVertexNormals();return g;})();
const PAD_G=new THREE.CircleGeometry(.3,9);
function cropVisual(pl){
  pl.crop.clear();if(!pl.type)return;const st=pl.stage,c=pl.type.id,R=mulberry(Math.round(pl.x*31+pl.z*17)+st);
  for(const [a,b] of [[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55]]){
    if(st===0){for(let i=0;i<3;i++){const l=mk(LEAF_G,cropMats.leaf,a+(R()-.5)*.1,.2,b+(R()-.5)*.1,false);l.scale.set(.5,.25,.5);l.rotation.y=R()*6.28;l.rotation.x=-.2;pl.crop.add(l);}continue;}
    const k=st/3;
    if(c==='corn'){const H=1.7*k+.25;pl.crop.add(mki(CYL(.04,.06,H,6),cropMats.stalk,a,.2+H/2,b,.03));
      for(let i=0;i<2+st*2;i++){const l=mk(LEAF_G,cropMats.leaf,a,.25+H*(.15+.7*i/(2+st*2)),b,false);l.rotation.y=i*2.4+R();l.rotation.x=-.35-R()*.3;l.scale.setScalar(.6+.5*k);pl.crop.add(l);}
      if(st>=2){const e=mki(CYL(.07,.05,.32,8),cropMats.corn,a+.11,.3+H*.62,b,.03);e.rotation.z=-.35;pl.crop.add(e);for(const s of [-1,1]){const h=mk(LEAF_G,cropMats.husk,a+.1,.25+H*.5,b+s*.03,false);h.scale.set(.6,.4,.6);h.rotation.y=s*.6;pl.crop.add(h);}}
      if(st===3){const t=mk(CYL(.012,.03,.25,4),M(0xc8a858),a,.2+H+.1,b,false);pl.crop.add(t);}}
    else if(c==='pumpkin'){for(let i=0;i<2+st*2;i++){const l=mk(PAD_G,cropMats.vine,a+(R()-.5)*.6*k,.24+R()*.12,b+(R()-.5)*.6*k,false);l.rotation.x=-Math.PI/2+(R()-.5)*.5;l.rotation.z=R()*6.28;l.scale.setScalar(.6+.5*k);pl.crop.add(l);}
      if(st>=2){const r=.1+.14*k,p=mki(new THREE.SphereGeometry(r,14,10),cropMats.pumpkin,a,.2+r*.8,b,.03);p.scale.set(1.15,.82,1.15);pl.crop.add(p);pl.crop.add(mk(CYL(.02,.03,.12,5),cropMats.stem,a,.2+r*1.55,b,false));}}
    else{const r=.08+.16*k;pl.crop.add(mki(new THREE.SphereGeometry(r,12,9),st===3?cropMats.cabbage:cropMats.cabOut,a,.2+r,b,.03));
      for(let i=0;i<3+st;i++){const l=mk(PAD_G,cropMats.cabOut,a+Math.cos(i*2.1)*r*.8,.24+r*.3,b+Math.sin(i*2.1)*r*.8,false);l.rotation.x=-Math.PI/2+.7;l.rotation.z=i*2.1;l.lookAt&&0;l.scale.setScalar(.5+.6*k);pl.crop.add(l);}}
  }
  // killed by frost: brown, slumped
  if(pl.dead){pl.crop.traverse(o=>{if(o.isMesh&&o.material!==INK&&!inkHulls.has(o))o.material=cropMats.dead;});pl.crop.scale.y=.7;}else pl.crop.scale.y=1;
}
function updateSeasonTick(dt){S.thunderT=Math.max(0,(S.thunderT||0)-dt);}
function updateGarden(dt){updateSeasonTick(dt);
  const si=S.season||0,night=S.phase==='night',dry=[.005,.009,.004,.002][si]*(W.type==='heat'?1.8:1),wetting=Math.max(W.rain,W.snow*.5);let frost=false;
  for(const pl of PLOTS){
    // beds dry out, faster in summer; rain waters them for you
    pl.water=clamp(pl.water+(wetting>.15?dt*.06*wetting:-dt*dry),0,1);pl.wet.material.opacity=pl.water*.42;
    if(!pl.type||pl.dead)continue;
    // a hard frost in fall or winter kills what's still growing and bites what's left unpicked
    if(si>=2&&SEA.temp<-1){if(pl.stage<3){pl.dead=true;cropVisual(pl);frost=true;}else pl.frost=1;continue;}
    // crows by day, deer by night
    if(pl.stage>=1){pl.pest-=dt;if(pl.pest<=0){pl.pest=rand(50,95);if(Math.random()<(GARDEN.scare?.06:.32))pestHit(pl,night);}}
    if(pl.stage>=3)continue;
    pl.t+=dt*(1+W.rain*.8)*SEASONS[si].grow*(pl.water>.05?1:.2);if(pl.t>=GROW_T){pl.t=0;pl.stage++;cropVisual(pl);if(pl.stage===3)toast(`${pl.type.ready} ready to harvest`,'good');}}
  if(frost&&!S.frostMsg){S.frostMsg=1;toast('A hard frost killed the crops still growing. Clear the beds and replant in spring.','bad');}
  if(SEA.temp>2)S.frostMsg=0;
  const dIn=Math.max(0,S.wave-(night?1:0))%3+1;
  if(si===2&&dIn===3&&!S.frostWarn&&PLOTS.some(p=>p.type&&!p.dead)){S.frostWarn=1;toast('First frost is coming. Harvest what you can before winter.','bad');}
  if(si!==2)S.frostWarn=0;
}
function nearestPlot(){let best=null,bd=1.9;for(const pl of PLOTS){const d=Math.hypot(pl.x-player.x,pl.z-player.z);if(d<bd){bd=d;best=pl;}}return best;}
function plotPrompt(pl){
  if(pl.dead)return'Clear the frost-killed plants';
  if(!pl.type)return player.seeds>0?(S.season===3?'Ground is frozen until spring':`Plant seeds (${player.seeds} left)`):'Bed is empty · find seeds in crates';
  if(pl.stage>=3)return`Harvest ${pl.type.name.toLowerCase()}${pl.frost?' · frost-bitten':''}`;
  const pct=Math.round(((pl.stage+pl.t/GROW_T)/3)*100);
  if(pl.water<=.05)return`${pl.type.name} ${pct}% · dry, barely growing · ${GARDEN.can?'water it':'fill the can at the well'}`;
  return`${pl.type.name} growing · ${pct}% · ${pl.water>.6?'well watered':GARDEN.can?'water it':'needs water soon'}`;
}
function tendPlot(pl){
  if(pl.dead){pl.dead=false;pl.type=null;pl.stage=0;pl.t=0;cropVisual(pl);Sound.play('pick');floatText(pl.x,.9,pl.z,'Cleared the dead plants');return;}
  if(!pl.type){if(player.seeds<=0){toast('No seeds. Crates and farmhouses have them.','bad');return;}
    if(S.season===3||SEA.temp<0){toast('The ground is frozen. Nothing can be planted until spring.','bad');return;}
    player.seeds--;pl.type=pick(CROPS);pl.stage=0;pl.t=0;pl.pecked=0;pl.frost=0;pl.water=Math.max(pl.water,.5);cropVisual(pl);Sound.play('pick');floatText(pl.x,.9,pl.z,`Planted ${pl.type.name.toLowerCase()}`);return;}
  if(pl.stage<3){if(pl.water>.6){toast(`The ${pl.type.name.toLowerCase()} bed is well watered.`);return;}if(GARDEN.can<=0){toast('The watering can is empty. Fill it at a well.','bad');return;}
    GARDEN.can--;pl.water=1;Sound.play('clink',.4);for(let i=0;i<5;i++)splash(pl.x+rand(-.9,.9),pl.z+rand(-.9,.9),.22);floatText(pl.x,.9,pl.z,`Watered · can ${GARDEN.can}/${CAN_MAX}`);return;}
  const f=Math.max(1,Math.round((pl.type.yield-(pl.pecked||0)+randi(0,1))*(pl.frost?.5:1))+PERK('forager')),sd=randi(1,2);gainXP(8);player.food=(player.food||0)+f;player.seeds=(player.seeds||0)+sd;
  floatText(pl.x,1.4,pl.z,`+${f} food · +${sd} seeds`);Sound.play('heal');pl.type=null;pl.stage=0;pl.t=0;cropVisual(pl);
}
function resetGarden(){for(const pl of PLOTS){Object.assign(pl,{type:null,stage:0,t:0,water:0,dead:false,frost:0,pecked:0});cropVisual(pl);}Object.assign(GARDEN,{scare:false,cellar:false,stored:0,can:0});gardenMeshes();S.frostMsg=S.frostWarn=0;for(const f of FELL)scene.remove(f.g);FELL.length=0;}
function eatFood(){
  if(!player.alive)return;
  if(!(player.food>0)&&player.meat>0){if(!useCD('food'))return;player.meat--;player.hp=Math.min(player.maxHp,player.hp+8);if(!PERK('irongut')&&Math.random()<.45){player.sick=60;toast('Raw meat: food poisoning. Stamina recovers slowly for a minute.','bad');}else toast('Ate raw meat (+8 HP). Cook it next time.');return;}
  if(!(player.food>0)){toast('No food. Grow it, hunt and cook it, or find it in crates.','bad');return;}
  if(player.hp>=player.maxHp&&player.st>=100){toast('Not hungry');return;}
  if(!useCD('food'))return;
  const hl=Math.round(25*(1+.3*PERK('forager')))+(PERK('irongut')?10:0);player.food--;player.hp=Math.min(player.maxHp,player.hp+hl);player.st=100;Sound.play('heal');toast(`Ate a meal (+${hl} HP, full stamina)`,'good');
}

