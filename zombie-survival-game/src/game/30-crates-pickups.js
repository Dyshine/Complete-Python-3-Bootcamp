/* ================= LOOT ================= */
const RARITY={relic:{col:0x5a3a14,strap:0xf2a516,label:'Relic'},common:{col:0x6b5134,strap:0xd8cfb8,label:'Common'},rare:{col:0x3e5a6e,strap:0x5fa8d3,label:'Rare'},epic:{col:0x8a6a2a,strap:0xe9c46a,label:'Epic'},drop:{col:0x5a2f2a,strap:0xd6432f,label:'Airdrop'}};
/* ----- loot containers and pickups: each kind gets its own model and painted texture ----- */
const CTEX={};
function cTex(name,draw,w,h){if(CTEX[name])return CTEX[name];const c=document.createElement('canvas');c.width=w||256;c.height=h||256;const g=c.getContext('2d');draw(g,c.width,c.height);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return CTEX[name]=t;}
const cMat=(name,draw,w,h)=>{const k='cm'+name;if(CTEX[k])return CTEX[k];return CTEX[k]=new THREE.MeshToonMaterial({map:cTex(name,draw,w,h),gradientMap:TOON_GRAD});};
// shared painting helpers: grime, scratches, rivets
function cGrime(g,W,H,n,a){for(let i=0;i<n;i++){g.fillStyle=`rgba(20,14,8,${Math.random()*a})`;g.beginPath();g.arc(Math.random()*W,Math.random()*H,Math.random()*18+2,0,6.28);g.fill();}
  g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;for(let i=0;i<n/2;i++){const x=Math.random()*W,y=Math.random()*H;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.random()*30-15,y+Math.random()*8-4);g.stroke();}}
function cFrame(g,W,H,col,lw){g.strokeStyle=col;g.lineWidth=lw;g.strokeRect(lw/2,lw/2,W-lw,H-lw);}
function cRivets(g,W,H,col){g.fillStyle=col;for(const [x,y] of [[10,10],[W-10,10],[10,H-10],[W-10,H-10]]){g.beginPath();g.arc(x,y,4,0,6.28);g.fill();}}
const CPAINT={
  cupboard:(g,W,H)=>{g.fillStyle='#8a6a48';g.fillRect(0,0,W,H);g.strokeStyle='rgba(60,40,24,.55)';g.lineWidth=2;for(let y=8;y<H;y+=16){g.beginPath();g.moveTo(0,y+Math.random()*3);g.lineTo(W,y+Math.random()*3);g.stroke();}
    g.strokeStyle='#4a321e';g.lineWidth=6;g.strokeRect(14,14,W/2-20,H-28);g.strokeRect(W/2+6,14,W/2-20,H-28);g.fillStyle='#d8c890';for(const x of [W/2-18,W/2+18]){g.beginPath();g.arc(x,H/2,6,0,6.28);g.fill();}cGrime(g,W,H,30,.25);cFrame(g,W,H,'#2a1a10',6);},
  medcab:(g,W,H)=>{g.fillStyle='#e6e2d6';g.fillRect(0,0,W,H);g.fillStyle='#c4281e';g.fillRect(W/2-22,H*.28-60,44,120);g.fillRect(W/2-60,H*.28-22,120,44);
    g.fillStyle='#2a2a28';g.font='bold 30px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.fillText('FIRST AID',W/2,H*.68);g.fillRect(W-30,H/2-26,8,52);cGrime(g,W,H,40,.18);cFrame(g,W,H,'#8a8678',6);},
  toolbox:(g,W,H)=>{g.fillStyle='#a8302a';g.fillRect(0,0,W,H);g.fillStyle='#7a1e18';g.fillRect(0,H*.42,W,10);g.fillStyle='#222';g.fillRect(W/2-34,H*.2,68,18);
    g.fillStyle='#e8e0c8';g.font='bold 34px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.fillText('TOOLS',W/2,H*.78);cRivets(g,W,H,'#d8d0c0');cGrime(g,W,H,40,.3);cFrame(g,W,H,'#3a0e0a',6);},
  locker:(g,W,H)=>{g.fillStyle='#4a5a40';g.fillRect(0,0,W,H);g.fillStyle='#2a3424';for(let i=0;i<6;i++)g.fillRect(W*.25,H*.1+i*12,W*.5,5);for(let i=0;i<6;i++)g.fillRect(W*.25,H*.78+i*8,W*.5,4);
    g.fillStyle='#e9c46a';g.font='bold 30px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.fillText('ARMORY',W/2,H*.52);g.fillStyle='#bbb';g.fillRect(W-34,H/2-30,10,60);cGrime(g,W,H,50,.3);cFrame(g,W,H,'#1c2418',8);},
  military:(g,W,H)=>{g.fillStyle='#4f5a38';g.fillRect(0,0,W,H);g.strokeStyle='rgba(30,36,20,.6)';g.lineWidth=3;for(let x=0;x<W;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke();}
    g.fillStyle='#e8dcb0';g.font='bold 40px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.fillText('U.S. SUPPLY',W/2,H*.62);g.save();g.translate(W/2,H*.3);g.beginPath();for(let i=0;i<10;i++){const r=i%2?14:34,a=-Math.PI/2+i*Math.PI/5;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.restore();
    g.fillStyle='#d6432f';g.fillRect(0,H-22,W,10);cGrime(g,W,H,40,.3);cFrame(g,W,H,'#20261a',8);},
  cache:(g,W,H)=>{g.fillStyle='#5a3a1c';g.fillRect(0,0,W,H);g.strokeStyle='rgba(30,18,8,.6)';g.lineWidth=3;for(let y=0;y<H;y+=36){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    g.fillStyle='#3a3a36';g.fillRect(28,0,22,H);g.fillRect(W-50,0,22,H);g.fillStyle='#b89a40';g.fillRect(W/2-16,H*.35,32,40);cRivets(g,W,H,'#8a8a80');cGrime(g,W,H,40,.3);},
  bag:(g,W,H)=>{g.fillStyle='#2e3236';g.fillRect(0,0,W,H);g.strokeStyle='#8a8a84';g.lineWidth=5;g.beginPath();g.moveTo(10,H/2);g.lineTo(W-10,H/2);g.stroke();g.setLineDash([4,6]);g.lineWidth=3;g.strokeStyle='#5a5e62';
    g.beginPath();g.moveTo(10,H/2-8);g.lineTo(W-10,H/2-8);g.moveTo(10,H/2+8);g.lineTo(W-10,H/2+8);g.stroke();g.setLineDash([]);g.fillStyle='#e8e2d0';g.fillRect(W*.7,H/2+18,44,28);g.fillStyle='#7a2a22';g.fillRect(W*.2,H*.2,60,20);cGrime(g,W,H,40,.25);},
  ammo:(g,W,H)=>{g.fillStyle='#55603a';g.fillRect(0,0,W,H);g.fillStyle='#e9c46a';g.font='bold 54px Barlow Condensed, Arial Narrow, sans-serif';g.textAlign='center';g.fillText('AMMO',W/2,H*.62);cRivets(g,W,H,'#2a3020');cGrime(g,W,H,25,.3);cFrame(g,W,H,'#2a3020',8);},
  med:(g,W,H)=>{g.fillStyle='#ece8de';g.fillRect(0,0,W,H);g.fillStyle='#c4281e';g.fillRect(W/2-22,H/2-62,44,124);g.fillRect(W/2-62,H/2-22,124,44);cGrime(g,W,H,20,.12);cFrame(g,W,H,'#b8b2a4',8);},
  parts:(g,W,H)=>{g.fillStyle='#4a86b0';g.fillRect(0,0,W,H);g.strokeStyle='#2a5a7a';g.lineWidth=6;for(let i=0;i<5;i++){g.beginPath();g.arc(W/2,H/2,20+i*22,0,6.28);g.stroke();}cGrime(g,W,H,20,.2);},
};
const cM=k=>cMat(k,CPAINT[k]);
// a hinged door that swings open (local +z is the front)
function cDoor(g,w,h,x,y,z,mat,side){const hinge=new THREE.Group();hinge.position.set(x-side*w/2,y,z);hinge.userData.side=side;const d=mki(BOX(w,h,.05),mat,side*w/2,0,0,.03);hinge.add(d);g.add(hinge);return hinge;}
// a box with walls, so an open lid or door shows the inside: open at the top (lidded) or the front (doors); dark lining
const LINING=M(0x231f1b);
function hollow(g,mat,w,h,d,y0,open){const t=.05,y=y0+h/2;
  for(const s of [-1,1])g.add(mki(BOX(t,h,d),mat,s*(w/2-t/2),y,0,.04));
  g.add(mki(BOX(w,h,t),mat,0,y,-d/2+t/2,.04));if(open!=='front')g.add(mki(BOX(w,h,t),mat,0,y,d/2-t/2,.04));
  g.add(mk(BOX(w,t,d),mat,0,y0+t/2,0));if(open!=='top')g.add(mki(BOX(w,t,d),mat,0,y0+h-t/2,0,.04));
  // lining just inside the walls so the interior reads as shadowed
  const i=.012;g.add(mk(BOX(w-2*t-i,t*.4,d-2*t-i),LINING,0,y0+t+.01,0,false));g.add(mk(BOX(w-2*t-i,h-2*t,.01),LINING,0,y,-d/2+t+.01,false));}
// returns {lid, door, strap} parts for spawnCrate's open animation and opened tint; inner = the space loot is shown in
function containerModel(kind,g,R){
  const metal=TM('metal',1,1,0x6a6e70,0xb8bcc0),dark=M(0x26282a),strapM=new THREE.MeshBasicMaterial({color:R.strap});
  if(kind==='cupboard'){hollow(g,cM('cupboard'),1.3,.95,.62,0,'front');g.add(mki(BOX(1.4,.06,.7),TM('wood',1,1,0x5a4430,0xc8b090),0,.98,0,.03));
    const door=cDoor(g,.62,.8,-.32,.48,.32,cM('cupboard'),1);const st=new THREE.Mesh(BOX(.5,.05,.02),strapM);st.position.set(0,.98,.36);g.add(st);return{door,strapM,h:1.02,r:.8,inner:{w:1.1,d:.45,ys:[.06,.5],z:-.02}};}
  if(kind==='medcab'){hollow(g,cM('medcab'),.95,1.25,.45,.125,'front');g.add(mk(BOX(.85,.03,.36),cM('medcab'),0,.75,0,false));for(const x of [-.38,.38])g.add(mk(BOX(.06,.12,.06),dark,x,.06,0,false));
    const door=cDoor(g,.9,1.15,0,.75,.24,cM('medcab'),1);const st=new THREE.Mesh(BOX(.9,.05,.02),strapM);st.position.set(0,1.4,.23);g.add(st);return{door,strapM,h:1.4,r:.62,inner:{w:.8,d:.3,ys:[.18,.77],z:0}};}
  if(kind==='toolbox'){hollow(g,cM('toolbox'),1.1,.48,.55,0,'top');const lid=new THREE.Group();lid.position.set(0,.48,-.275);lid.add(mki(BOX(1.14,.1,.58),cM('toolbox'),0,.05,.275,.03));
    const hd=mk(BOX(.4,.06,.06),dark,0,.16,.275,false);lid.add(hd);g.add(lid);const st=new THREE.Mesh(BOX(1.12,.05,.05),strapM);st.position.set(0,.43,.285);g.add(st);return{lid,strapM,h:.6,r:.7,inner:{w:.95,d:.42,ys:[.06],z:0}};}
  if(kind==='locker'){hollow(g,cM('locker'),.85,1.9,.6,0,'front');g.add(mk(BOX(.75,.03,.5),cM('locker'),0,1.35,0,false));const door=cDoor(g,.8,1.8,0,.95,.31,cM('locker'),1);
    const st=new THREE.Mesh(BOX(.85,.06,.02),strapM);st.position.set(0,1.88,.31);g.add(st);return{door,strapM,h:1.9,r:.62,inner:{w:.7,d:.45,ys:[.06,1.37],z:0}};}
  if(kind==='shelf'){const fr=M(0x6a7480,{metalness:.4,roughness:.5});for(const [x,z] of [[-.6,-.25],[.6,-.25],[-.6,.25],[.6,.25]])g.add(mk(BOX(.06,1.7,.06),fr,x,.85,z,false));
    for(const y of [.15,.65,1.15,1.65])g.add(mki(BOX(1.3,.05,.6),fr,0,y,0,.03));
    const goods=[cM('ammo'),cM('med'),TM('wood',1,1,0x9a7a52,0xd8c8a0),M(0xc8602a),M(0x3f7a3a)];
    for(const y of [.18,.68,1.18])for(let i=0;i<3;i++){if(Math.random()<.25)continue;const b=mki(BOX(.32,.28+Math.random()*.12,.36),pick(goods),-.42+i*.42+rand(-.04,.04),y+.17,rand(-.05,.05),.02);b.rotation.y=rand(-.3,.3);g.add(b);}
    const st=new THREE.Mesh(BOX(1.3,.06,.02),strapM);st.position.set(0,1.62,.31);g.add(st);return{strapM,h:1.7,r:.78};}
  if(kind==='cache'){hollow(g,cM('cache'),1.2,.6,.75,0,'top');const lid=new THREE.Group();lid.position.set(0,.6,-.375);
    const top=mki(new THREE.CylinderGeometry(.375,.375,1.2,12,1,false,0,Math.PI),cM('cache'),0,0,.375,.03);top.rotation.z=Math.PI/2;lid.add(top);g.add(lid);
    for(const sz of [-1,1]){const st=new THREE.Mesh(BOX(.12,.62,.02),strapM);st.position.set(0,.31,sz*.385);g.add(st);}return{lid,strapM,h:.95,r:.78,inner:{w:1.05,d:.6,ys:[.06],z:0}};}
  if(kind==='remains'){const bag=mki(BOX(.62,.3,1.7),cM('bag'),0,.15,0,.04);g.add(bag);for(const z of [-.85,.85]){const e=mk(new THREE.SphereGeometry(.31,10,6),M(0x2e3236),0,.15,z,false);e.scale.set(1,.48,.35);g.add(e);}
    const st=new THREE.Mesh(BOX(.2,.02,.12),strapM);st.position.set(.18,.31,.4);g.add(st);return{strapM,h:.3,r:.7};}
  // supply crates and airdrops: planks and straps, airdrops stencilled
  const body=kind==='military'?cM('military'):TM('wood',1,1,R.col,lighten(R.col,.55));
  hollow(g,body,1.3,.9,.9,0,'top');
  const lid=new THREE.Group();lid.position.set(0,.9,-.45);lid.add(mk(BOX(1.36,.16,.96),kind==='military'?cM('military'):M(R.col),0,.08,.45));g.add(lid);
  // straps run down the outside of the walls only, so they don't fill the box
  for(const sx of [-.4,.4])for(const sz of [-1,1]){const st=new THREE.Mesh(BOX(.1,.92,.02),strapM);st.position.set(sx,.46,sz*.46);g.add(st);}
  return{lid,strapM,h:.95,r:.78,inner:{w:1.15,d:.75,ys:[.06],z:0}};
}
// pickups: a scrap pile, a gear, an ammo can and a medkit
function pickupModel(type){const g=new THREE.Group();
  if(type==='scrap'){const m=TM('metal',1,1,0x8a7a5a,0xc8b090);for(let i=0;i<4;i++){const b=mki(i%2?BOX(.26,.05,.14):CYL(.05,.05,.24,6),m,rand(-.1,.1),.04+i*.035,rand(-.1,.1),.02);b.rotation.set(rand(-.4,.4),rand(0,6),rand(-.4,.4));g.add(b);}
    g.add(mki(BOX(.16,.12,.16),M(0x9a6a2a,{metalness:.5}),0,.07,0,.02));}
  else if(type==='parts'){const m=cM('parts');g.add(mki(CYL(.2,.2,.08,12),m,0,.05,0,.02));for(let i=0;i<8;i++){const t=mk(BOX(.08,.08,.08),m,Math.cos(i*.785)*.22,.05,Math.sin(i*.785)*.22,false);t.rotation.y=-i*.785;g.add(t);}
    g.add(mk(CYL(.07,.07,.1,8),M(0x22303a),0,.05,0,false));}
  else if(type==='ammo'){g.add(mki(BOX(.45,.3,.24),cM('ammo'),0,.15,0,.03));g.add(mk(BOX(.22,.04,.05),M(0x2a3020),0,.33,0,false));}
  else{g.add(mki(BOX(.4,.26,.32),cM('med'),0,.13,0,.03));g.add(mk(BOX(.16,.05,.05),M(0x8a8a84),0,.29,0,false));}
  return g;}
/* ----- breakable windows in every building ----- */
// glass from kWall is kept per window; each kit merges its glass into one mesh per material and remembers where each pane lives
function kWins(K,baseG,upperG){const groups=new Map();
  K.wins.forEach((W,i)=>{const k=(W.G===2&&upperG?'u':'b')+'|'+W.mat.uuid;let e=groups.get(k);if(!e)groups.set(k,e={mat:W.mat,grp:W.G===2&&upperG?upperG:baseG,list:[],ws:[]});e.list.push(W.geo);e.ws.push(W);});
  for(const e of groups.values()){let v=0;for(let i=0;i<e.list.length;i++){const W=e.ws[i];W.start=v;W.count=e.list[i].attributes.position.count;v+=W.count;}
    const geo=mergeSimple(e.list);if(CUR)CUR.geos.push(geo);const m=new THREE.Mesh(geo,e.mat);m.receiveShadow=true;e.grp.add(m);for(const W of e.ws){W.geo=geo;W.mesh=m;}}
  for(const W of K.wins){const p=l2w(K.x,K.z,K.rot,W.lc[0],W.lc[1]);W.x=p.x;W.z=p.z;W.key=cutKey(p.x,p.z)+'|'+Math.round(W.Y*2);W.ch=CUR;W.pre=!!(CUR&&CUR.wb&&CUR.wb.has(W.key));}}
function breakWin(W,silent){if(!W||W.broken||!W.geo)return;W.broken=true;
  const a=W.geo.attributes.position.array,s=W.start*3,e=(W.start+W.count)*3,cx=a[s],cy=a[s+1],cz=a[s+2];for(let i=s;i<e;i+=3){a[i]=cx;a[i+1]=cy;a[i+2]=cz;}W.geo.attributes.position.needsUpdate=true;
  if(!W.shell)for(const ob of W.obs)if(ob.lvl===undefined)ob.h=Math.max(.3,W.sill); // the empty frame: jump or climb through (kit houses stay shut)
  if(silent)return;
  const y=(W.sill+W.top)/2;burst(W.x,y,W.z,12,'glass',4);Sound.play('crash',.5,W.x,W.z);Sound.play('clink',.8,W.x,W.z);makeNoise(W.x,W.z,14);
  if(W.ch){let mem=chunkMem.get(W.ch.key);if(!mem)chunkMem.set(W.ch.key,mem={day:-1,saved:[],cut:W.ch.cut||new Set()});(mem.wb||(mem.wb=new Set())).add(W.key);}}
// a melee swing breaks glass in reach
function meleeWindows(range){const fx=Math.sin(player.yaw),fz=Math.cos(player.yaw);
  nearObs(player.x,player.z,range+.6,o=>{if(!o.win||o.win.broken||(o.lvl!==undefined&&o.lvl!==(player.lvl||0)))return;const dx=o.x-player.x,dz=o.z-player.z,d=Math.hypot(dx,dz);if(d<range+o.r&&(dx*fx+dz*fz)/(d||1)>.35)breakWin(o.win);});}
function spawnCrate(x,z,rar,kind){
  kind=kind||(rar==='drop'?'military':rar==='relic'?'cache':'crate');const CK=CONT[kind]||CONT.crate,R0=RARITY[rar],R={col:kind==='crate'||kind==='military'||kind==='cache'?R0.col:CK.col,strap:kind==='crate'?R0.strap:CK.strap};const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rand(0,6.28);
  g.scale.setScalar(rar==='drop'?1.4:1);
  const CM=containerModel(kind,g,R),lid=CM.lid,strapM=CM.strapM;
  let beam=null;
  if(rar!=='common'){beam=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,rar==='drop'?30:14,6,1,true),new THREE.MeshBasicMaterial({color:R.strap,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.y=rar==='drop'?15:7;g.add(beam);}
  scene.add(g);const c={g,lid,door:CM.door,inner:CM.inner,beam,strapM,x,z,rar,opened:false,t:0,seen:false,chunk:null,ob:addOb({x,z,r:rar==='drop'?1.05:CM.r,h:rar==='drop'?1.3:CM.h}),kind};crates.push(c);
  for(const b of LVL_B)if(inFoot(b,x,z,0)){c.ob.lvl=0;break;}
  return c;
}
const RES_LOOK={scrap:[0x8a7a5a,'pile'],parts:[0x4a86b0,'gear'],cloth:[0xb8a888,'roll'],food:[0xc8602a,'can'],seeds:[0xb89a5a,'sack'],herbs:[0x5a8a3a,'sack'],wood:[0x8a6a44,'logs'],stone:[0x9a968a,'pile']};
function lootLook(e){const g=new THREE.Group();
  if(e.t==='weapon'){const m=gunModel(e.I);m.rotation.set(0,Math.PI/2,Math.PI/2);const b=new THREE.Box3().setFromObject(m),s=Math.min(1,.95/Math.max(.01,b.max.x-b.min.x));m.scale.setScalar(s);g.add(m);g.userData.w=.95;return g;}
  if(e.t==='ammo'){g.add(pickupModel('ammo'));g.scale.setScalar(.7);return g;}
  if(e.t==='med'||e.k==='bandage'||e.k==='poultice'){g.add(pickupModel('med'));g.scale.setScalar(.7);return g;}
  if(e.t==='comp'){g.add(pickupModel('parts'));g.scale.setScalar(.7);return g;}
  if(e.t==='gren'||e.k==='pipebomb'){const m=M(0x3f5a2a);g.add(mki(new THREE.SphereGeometry(.07,8,6),m,0,.07,0,.01));g.add(mk(BOX(.03,.05,.03),M(0x8a8a84),0,.15,0,false));return g;}
  if(e.k==='molotov'){g.add(mki(CYL(.05,.06,.2,8),M(0x4a6a3a),0,.1,0,.01));g.add(mk(BOX(.04,.06,.04),M(0xd8d0c0),0,.23,0,false));return g;}
  if(e.t==='res'){const [col,shape]=RES_LOOK[e.k]||[0x8a8a84,'pile'],m=M(col);
    if(shape==='pile'){g.add(pickupModel('scrap'));}else if(shape==='gear'){g.add(pickupModel('parts'));g.scale.setScalar(.7);}
    else if(shape==='can')for(let i=0;i<Math.min(3,e.n||1);i++)g.add(mk(CYL(.05,.05,.12,8),m,i*.11-.11,.06,0,false));
    else if(shape==='roll'){const r=mk(CYL(.07,.07,.3,8),m,0,.07,0,false);r.rotation.z=Math.PI/2;g.add(r);}
    else if(shape==='logs')for(let i=0;i<3;i++){const r=mk(CYL(.05,.05,.32,6),m,0,.05+(i>1?.08:0),i%2*.1-.05,false);r.rotation.z=Math.PI/2;g.add(r);}
    else{const s=mk(new THREE.SphereGeometry(.12,8,6),m,0,.09,0,false);s.scale.set(1,.75,.9);g.add(s);}
    return g;}
  // tools, trinkets, blueprints: a small labelled box or a folded paper
  if(e.t==='bp'){g.add(mk(BOX(.22,.01,.16),M(0x3a5a8a),0,.01,0,false));return g;}
  g.add(mki(BOX(.2,.12,.14),M(e.t==='trinket'?0xc8a040:0x8a3a2e),0,.06,0,.01));return g;}
function crateContents(c){
  if(c.contents){c.g.remove(c.contents);c.contents=null;}const I=c.inner;if(!I||!c.loot||!c.loot.length)return;
  const g=new THREE.Group();c.contents=g;c.g.add(g);
  const per=Math.max(1,Math.ceil(c.loot.length/I.ys.length)),cols=Math.min(per,3),rows=Math.ceil(per/cols);
  c.loot.forEach((e,i)=>{const sh=Math.floor(i/per),k=i%per,col=k%cols,row=Math.floor(k/cols),it=lootLook(e);
    it.position.set(e.t==='weapon'?0:-I.w/2+I.w*(col+.5)/cols,I.ys[Math.min(sh,I.ys.length-1)]+.02,I.z-I.d/2+I.d*(row+.5)/Math.max(rows,1));
    if(e.t!=='weapon')it.rotation.y=rand(-.5,.5);g.add(it);});}
function crateUp(c,b){c.lvl=1;c.bld=b;c.g.position.y=b.fh;if(c.ob)c.ob.lvl=1;b.upCrates.push(c);c.g.visible=!!(b.upper&&b.upper.visible);}
function dropCrate(c){scene.remove(c.g);if(c.beam){c.beam.geometry.dispose();c.beam.material.dispose();c.beam=null;}c.strapM.dispose();if(c.ob){delOb(c.ob);c.ob=null;}if(c.bld){const i=c.bld.upCrates.indexOf(c);if(i>=0)c.bld.upCrates.splice(i,1);c.bld=null;}
}
function openCrate(c){
  if(!c.loot)heroAction('pickup',{speed:1.25,still:true});
  if(!c.loot){c.opened=true;c.t=0;S.looted++;gainXP({common:6,rare:14,epic:28,drop:30,relic:40}[c.rar]||6);jobProg('crate',1);if(c.beam){c.g.remove(c.beam);c.beam.geometry.dispose();c.beam=null;}c.strapM.color.setHex(0x3a3a34);
    c.loot=rollLoot(c.kind,c.rar,c.x,c.z);
    if(c.rar==='relic'){const sp=c.sp&&!SPOWN.has(c.sp)?c.sp:null;if(sp)c.loot.unshift({t:'weapon',I:mkW(null,0,sp),rar:'legendary'});else c.loot.unshift({t:'comp',k:'RC',n:1,rar:'legendary'});}
    rumble(.2,.4,120);crateContents(c);}
  const CK=CONT[c.kind]||CONT.crate;openLoot(c,c.rar==='drop'?'Military airdrop':c.rar==='relic'?'Relic cache':`${CK.name}${c.rar!=='common'&&c.kind!=='remains'?' · '+RARITY[c.rar].label.toLowerCase():''}`);
}
const PICK_M={scrap:new THREE.MeshStandardMaterial({color:0x9a8a6a,emissive:0x5a3a00,flatShading:true}),parts:new THREE.MeshStandardMaterial({color:0x5fa8d3,emissive:0x0a3a5a,flatShading:true}),
  ammo:new THREE.MeshStandardMaterial({color:0x5a6a3a,emissive:0x2a3010,flatShading:true}),med:new THREE.MeshStandardMaterial({color:0xeeeeee,emissive:0x5a1010,flatShading:true})};
const PICK_G={scrap:new THREE.DodecahedronGeometry(.22,0),parts:new THREE.CylinderGeometry(.22,.22,.15,6),ammo:new THREE.BoxGeometry(.45,.28,.3),med:new THREE.BoxGeometry(.38,.3,.38)};
function spawnPickup(type,x,z,amt){const m=pickupModel(type);m.position.set(x,.4,z);m.rotation.y=rand(0,6.28);scene.add(m);pickups.push({type,m,x,z,y:1.2,vy:rand(3,5),vx:rand(-1.5,1.5),vz:rand(-1.5,1.5),amt,t:0});}
function collectPickup(p){
  if(p.type==='scrap'){player.scrap+=p.amt;}
  else if(p.type==='parts'){player.parts+=p.amt;toast(`+${p.amt} parts`,'rare');}
  else if(p.type==='ammo'){const g=ownedAmmo();if(g.length){const k=pick(g);grantAmmo(k,.5);toast(`${AMMO[k].name} ammo`);}else player.scrap+=4;}
  else if(p.type==='med'){if(player.med<5){player.med++;toast('Found a medkit','good');}else player.scrap+=10;}
  Sound.play('pick');
}

