/* ================= EXPLORATION: named places, landmarks, fog-of-war map =================
   Towns get names; landmarks (radio masts, fire lookouts, crash sites, camps, chapels) are placed by a seeded hash per chunk,
   so the map and job board know where they are before the chunk ever loads. Finding one pays XP and a cache. */
function hash2(a,b,s){let n=(Math.imul(a,374761393)+Math.imul(b,668265263)+Math.imul(WORLD_SEED+s*7919,982451653))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
const NAME_A=['Mill','Ash','Raven','Cold','Hollow','Pine','Stone','Marsh','Elder','Gray','Crow','Briar','Thorn','Dust','Kettle','Fallow','Black','Willow','Harrow','Red','Wolf','Iron','Silver','Bitter'];
const NAME_B=['brook','ford','field','ridge','wick','haven','vale','moor','creek','stead','dale','gate','hollow','bury','well','ton','crossing','bend'];
function placeName(a,b,s){return NAME_A[Math.floor(hash2(a,b,s)*NAME_A.length)]+NAME_B[Math.floor(hash2(a,b,s+1)*NAME_B.length)];}
const LM_T={
  tower:{label:'Radio Mast',col:'#5fa8d3',reveal:170,xp:110},
  lookout:{label:'Fire Lookout',col:'#e9c46a',reveal:210,xp:110},
  heli:{label:'Downed Medevac',col:'#d6432f',reveal:0,xp:120},
  camp:{label:'Survivor Camp',col:'#9bd651',reveal:0,xp:90},
  chapel:{label:'Chapel',col:'#c9b8f0',reveal:0,xp:90},
};
const LM_CACHE=new Map(),TOWN_REP=new Map(),LM_LIVE=[];
function lmAt(cx,cz){
  const k=cx+','+cz;if(LM_CACHE.has(k))return LM_CACHE.get(k);let r=null;
  if(Math.max(Math.abs(cx),Math.abs(cz))>=2&&cx!==0&&cx!==-1&&cz!==0&&cz!==-1&&bioC(cx,cz)!=='town'&&hash2(cx,cz,7)<.07){
    const x=cx*CH+CH/2+(hash2(cx,cz,8)-.5)*14,z=cz*CH+CH/2+(hash2(cx,cz,9)-.5)*14;
    if(depthAt(x,z)<-.35&&flatOK(x,z,5)){
      const types=bioC(cx,cz)==='forest'?['lookout','camp','heli','tower','lookout']:['tower','chapel','heli','camp','lookout'];
      const type=types[Math.floor(hash2(cx,cz,10)*types.length)],nm=placeName(cx,cz,11),L=LM_T[type].label;
      r={type,x,z,cx,cz,key:'lm:'+k,name:type==='heli'?L:type==='camp'?`${nm} ${L}`:`${nm} ${L}`};}
  }
  LM_CACHE.set(k,r);return r;
}
function townRep(cx,cz){
  const k=cx+','+cz;if(TOWN_REP.has(k))return TOWN_REP.get(k);
  const seen=new Set([k]),q=[[cx,cz]];let best=[cx,cz],sx=0,sz=0;
  while(q.length&&seen.size<80){const [a,b]=q.pop();sx+=a;sz+=b;if(a<best[0]||(a===best[0]&&b<best[1]))best=[a,b];
    for(const [da,db] of [[1,0],[-1,0],[0,1],[0,-1]]){const na=a+da,nb=b+db,nk=na+','+nb;if(seen.has(nk)||bioC(na,nb)!=='town')continue;seen.add(nk);q.push([na,nb]);}}
  const n=seen.size,r={key:'town:'+best.join(','),name:placeName(best[0],best[1],3),x:(sx/n+.5)*CH,z:(sz/n+.5)*CH,n};
  for(const s of seen)TOWN_REP.set(s,r);return r;
}
// ---- landmark models (built into the chunk that owns them) ----
const LMM={metal:()=>TM('metal',1,1,0x7a7c78,0xb8bab4),wood:()=>TM('wood',1,1,0x6a4e34,0xb09878),plaster:()=>TM('plaster',1,1,0xd8d0bc,0xe8e0cc)};
const blinkM=new THREE.MeshBasicMaterial({color:0xff3020}),fireM=new THREE.MeshBasicMaterial({color:0xff8a2a,transparent:true,opacity:.9});
function buildLandmark(lm){
  const g=new THREE.Group();g.position.set(lm.x,0,lm.z);g.rotation.y=Math.floor(hash2(lm.cx,lm.cz,12)*4)*Math.PI/2;track(g);
  const ob=(lx,lz,r,h)=>{const c=Math.cos(g.rotation.y),s=Math.sin(g.rotation.y);const o={x:lm.x+lx*c+lz*s,z:lm.z-lx*s+lz*c,r};if(h)o.h=h;addOb(o);};
  const live={lm,ch:CUR,g,smokeT:0,fire:null};
  if(lm.type==='tower'){
    const mt=LMM.metal(),H=17;
    for(const [x,z] of [[-1.1,-1.1],[1.1,-1.1],[-1.1,1.1],[1.1,1.1]]){g.add(mki(BOX(.2,H,.2),mt,x,H/2,z,.04));ob(x,z,.35);}
    for(let y=2;y<H;y+=2.4){g.add(mk(BOX(2.4,.1,.1),mt,0,y,-1.1));g.add(mk(BOX(2.4,.1,.1),mt,0,y,1.1));g.add(mk(BOX(.1,.1,2.4),mt,-1.1,y,0));g.add(mk(BOX(.1,.1,2.4),mt,1.1,y,0));}
    g.add(mk(CYL(.06,.06,4,6),mt,0,H+2,0));const bl=mk(new THREE.SphereGeometry(.28,8,6),blinkM,0,H+4.1,0,false);g.add(bl);live.blink=bl;
    for(const [y,a] of [[H-2,0],[H-3.4,1.6]]){const d=mk(CYL(.55,.55,.18,12),M(0xd8d4c8),0,y,1.25);d.rotation.x=Math.PI/2;d.rotation.z=a;g.add(d);}
    g.add(mki(BOX(3,2.4,2.6),M(0x8a8f80),4,1.2,0,.06));g.add(mk(BOX(3.3,.2,2.9),M(0x4a4e46),4,2.5,0));g.add(mk(BOX(.9,1.8,.08),M(0x2a2c28),4,.9,1.32));ob(4,0,1.6);
  }else if(lm.type==='lookout'){
    const wd=LMM.wood(),H=7.5;
    for(const [x,z] of [[-1.5,-1.5],[1.5,-1.5],[-1.5,1.5],[1.5,1.5]]){g.add(mki(BOX(.3,H,.3),wd,x,H/2,z,.05));ob(x,z,.4);}
    for(const y of [2.4,4.8]){g.add(mk(BOX(3.2,.14,.14),wd,0,y,-1.5));g.add(mk(BOX(3.2,.14,.14),wd,0,y,1.5));g.add(mk(BOX(.14,.14,3.2),wd,-1.5,y,0));g.add(mk(BOX(.14,.14,3.2),wd,1.5,y,0));}
    g.add(mki(BOX(4,.3,4),wd,0,H,0,.06));
    for(const [x,z,w,d] of [[0,-1.95,4,.08],[1.95,0,.08,4],[-1.95,0,.08,4],[-1.25,1.95,1.5,.08],[1.25,1.95,1.5,.08]]){g.add(mk(BOX(w,.08,d),wd,x,H+1,z));g.add(mk(BOX(w,.08,d),wd,x,H+.55,z));}
    for(const [x,z] of [[-1.95,-1.95],[1.95,-1.95],[-1.95,1.95],[1.95,1.95],[-.5,1.95],[.5,1.95]])g.add(mk(BOX(.1,1.05,.1),wd,x,H+.55,z));
    // open lookout cab: corner posts, waist-high panels, a gap where the ladder comes up
    {const cab=M(0x9a7a52);for(const [x,z] of [[-1.7,-1.7],[1.7,-1.7],[-1.7,1.7],[1.7,1.7]])g.add(mki(BOX(.16,2.3,.16),cab,x,H+1.3,z,.04));
      for(const [x,z,w,d] of [[0,-1.7,3.4,.1],[1.7,0,.1,3.4],[-1.7,0,.1,3.4],[-1.15,1.7,1.1,.1],[1.15,1.7,1.1,.1]])g.add(mki(BOX(w,.95,d),cab,x,H+.62,z,.03));
      g.add(mk(BOX(.9,.8,.6),M(0x5a4430),-1,H+.55,-1.2));}
    const rf=mki(new THREE.ConeGeometry(3.2,1.6,4),M(0x5a3a2a),0,H+3.15,0,.06);rf.rotation.y=Math.PI/4;g.add(rf);live.roof=rf;
    for(let y=.4;y<H;y+=.5)g.add(mk(BOX(.8,.07,.07),wd,0,y,1.75));g.add(mk(BOX(.07,H,.07),wd,-.4,H/2,1.75));g.add(mk(BOX(.07,H,.07),wd,.4,H/2,1.75));
    {const c=Math.cos(g.rotation.y),s=Math.sin(g.rotation.y),w=(lx,lz)=>({x:lm.x+lx*c+lz*s,z:lm.z-lx*s+lz*c}),b=w(0,2.3),t=w(0,.9),ld=w(0,1.75);
      live.ladder={bx:b.x,bz:b.z,tx:t.x,tz:t.z,h:H+.15,yaw:Math.atan2(ld.x-b.x,ld.z-b.z),ch:CUR};live.surf={x:lm.x,z:lm.z,rot:g.rotation.y,hw:1.95,hd:1.95,h:H+.15,ch:CUR};
      LADDERS.push(live.ladder);SURFS.push(live.surf);}
  }else if(lm.type==='heli'){
    const hull=M(0x4f5e3c),dark=M(0x262a22);
    const body=new THREE.Group();body.rotation.z=.32;body.rotation.y=.4;body.position.y=.9;g.add(body);
    body.add(mki(BOX(2.2,1.9,4.6),hull,0,.4,0,.07));body.add(mk(BOX(2,1.2,1.2),BASIC(0x7fa8b0),0,.7,2.6,false));
    body.add(mki(BOX(.55,.55,4.6),hull,0,.9,-4.4,.05));body.add(mki(BOX(.12,1.6,1),hull,0,1.6,-6.5,.04));
    body.add(mk(BOX(2.3,.4,.4),M(0xf2f0e8),0,.6,.2));body.add(mk(BOX(.4,.4,2.3),M(0xd6432f),0,.6,.2));
    for(const s of [-1,1])body.add(mk(BOX(.12,.12,3.6),dark,s*1.15,-.6,0));
    const r1=mk(BOX(.3,.06,7.5),dark,0,1.5,.2);r1.rotation.y=.7;r1.rotation.z=.25;body.add(r1);const r2=mk(BOX(.3,.06,5),dark,0,1.48,.2);r2.rotation.y=-.9;r2.rotation.x=-.3;body.add(r2);
    ob(0,0,1.7,2);ob(-.6,-2.6,.8,1.9);ob(-1.2,-4.6,.6,1.6);
    for(let i=0;i<5;i++)g.add(mk(BOX(rand(.3,.7),.12,rand(.3,.7)),dark,rand(-4,4),.06,rand(-4,4)));
    live.smoke=true;
  }else if(lm.type==='camp'){
    const cols=[0x7a6a4a,0x5a6a4a,0x6a4a3a];
    [[-3.2,-1,.4],[3,-1.4,-.5],[0,-3.8,0]].forEach(([x,z,r],i)=>{const t=mki(new THREE.ConeGeometry(1.5,1.9,4),M(cols[i]),x,.95,z,.06);t.rotation.y=Math.PI/4+r;g.add(t);ob(x,z,1.2);});
    for(let i=0;i<7;i++){const a=i/7*6.28;g.add(mk(BOX(.3,.22,.3),M(0x8a867a),Math.cos(a)*.75,.11,Math.sin(a)*.75));}
    for(const a of [0,1.1,2.2]){const l=mk(CYL(.08,.08,1.1,6),M(0x5a3a22),0,.15,0);l.rotation.z=Math.PI/2;l.rotation.y=a;g.add(l);}
    const f=mk(new THREE.ConeGeometry(.45,1,6),fireM,0,.55,0,false);g.add(f);live.fire=f;ob(0,0,.8);
    g.add(mki(BOX(1.1,.7,.8),LMM.wood(),2.2,.35,2.4,.05));ob(2.2,2.4,.7,.7);g.add(mki(BOX(.9,1.1,.9),M(0x3a4a5a),-2.4,.55,2.2,.05));ob(-2.4,2.2,.65,1.1);
    g.add(mk(BOX(.05,1.8,.05),M(0x3a3a34),4.6,.9,1));g.add(mk(BOX(1.1,.7,.02),M(0xd8d0bc),5.15,1.45,1));
    live.smoke=true;
  }else{
    const pl=LMM.plaster(),rf=M(0x4a3a34);
    g.add(mki(BOX(5.6,4.4,8.4),pl,0,2.2,0,.08));
    for(const s of [-1,1]){const r=mki(BOX(3.6,.25,8.9),rf,s*1.48,5.2,0,.05);r.rotation.z=-s*.72;g.add(r);}
    g.add(mki(BOX(2,4,2),pl,0,5.6,3.2,.06));const sp=mki(new THREE.ConeGeometry(1.5,3,4),rf,0,9.1,3.2,.06);sp.rotation.y=Math.PI/4;g.add(sp);
    g.add(mk(BOX(.08,1.4,.08),M(0x2a2a26),0,11.2,3.2));g.add(mk(BOX(.7,.08,.08),M(0x2a2a26),0,11.4,3.2));
    g.add(mk(BOX(1.4,2.4,.1),M(0x3a2618),0,1.2,4.22));for(const z of [-2.4,0,2.4])for(const s of [-1,1])g.add(mk(BOX(.06,1.4,.7),BASIC(0x8a7ab0),s*2.82,2.6,z,false));
    for(const z of [-3,-1,1,3])for(const s of [-1,1])ob(s*2.3,z,1.35);
    for(let i=0;i<6;i++){const x=rand(-6,6),z=rand(-8,-5);g.add(mk(BOX(.5,.8,.12),M(0x8a8a82),x,.4,z));}
  }
  LM_LIVE.push(live);
}
function updateLandmarks(dt){
  const bl=(performance.now()/600|0)%2===0;blinkM.color.setHex(bl?0xff3020:0x401008);
  for(const L of LM_LIVE){const d=Math.hypot(L.lm.x-player.x,L.lm.z-player.z);if(L.roof)L.roof.visible=!(d<6&&(player.jy>4||player.climb));if(d>90)continue;
    if(L.fire){const f=.85+Math.sin(performance.now()/90+L.lm.x)*.15;L.fire.scale.set(f,1+(1-f)*2,f);if(Math.random()<dt*3)burst(L.lm.x+rand(-.2,.2),1,L.lm.z+rand(-.2,.2),1,'spark',2);}
    if(L.smoke){L.smokeT-=dt;if(L.smokeT<=0){L.smokeT=.25;burst(L.lm.x+rand(-.5,.5),L.fire?1.4:2.4,L.lm.z+rand(-.5,.5),1,'smoke',1);}}}
}
// ---- fog-of-war: 8 m cells, painted once as you reveal them ----
const FOG_C=8,FOG_N=400,EXP={grid:new Uint8Array(FOG_N*FOG_N),cvs:document.createElement('canvas'),found:new Map(),names:new Set(),t:0,here:''};
EXP.cvs.width=EXP.cvs.height=FOG_N;const fctx=EXP.cvs.getContext('2d');
function cellCol(x,z){
  const d=depthAt(x,z);if(d>.05)return d>1.2?'#284e60':'#3a6a78';
  if(Math.abs(x)<5||Math.abs(z)<5)return'#5c5a50';
  if(Math.abs(x)<BR+1&&Math.abs(z)<BR+1)return'#6a6450';
  const b=bioC(Math.floor(x/CH),Math.floor(z/CH)),h=gH(x,z),k=1+clamp(h/16,-.2,.35);
  const c=b==='forest'?[44,72,42]:b==='town'?[96,90,76]:[104,116,62];return`rgb(${c[0]*k|0},${c[1]*k|0},${c[2]*k|0})`;
}
function reveal(x,z,r){
  const c0=Math.floor(x/FOG_C)+FOG_N/2,r0=Math.floor(z/FOG_C)+FOG_N/2,n=Math.ceil(r/FOG_C);
  for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){if(i*i+j*j>n*n)continue;const ci=c0+i,cj=r0+j;if(ci<0||cj<0||ci>=FOG_N||cj>=FOG_N)continue;const o=cj*FOG_N+ci;if(EXP.grid[o])continue;
    EXP.grid[o]=1;fctx.fillStyle=cellCol((ci-FOG_N/2+.5)*FOG_C,(cj-FOG_N/2+.5)*FOG_C);fctx.fillRect(ci,cj,1,1);}
}
const revealed=(x,z)=>{const ci=Math.floor(x/FOG_C)+FOG_N/2,cj=Math.floor(z/FOG_C)+FOG_N/2;return ci>=0&&cj>=0&&ci<FOG_N&&cj<FOG_N&&EXP.grid[cj*FOG_N+ci]===1;};
function resetExplore(){EXP.grid.fill(0);fctx.clearRect(0,0,FOG_N,FOG_N);EXP.found.clear();EXP.names.clear();EXP.here='';LM_CACHE.clear();TOWN_REP.clear();TPLAN.clear();EXP.t=0;}
function discover(p,kind){
  if(EXP.found.has(p.key))return;EXP.found.set(p.key,{key:p.key,name:p.name,x:p.x,z:p.z,kind,type:p.type});
  const xp=kind==='town'?60:LM_T[p.type].xp;
  banner(p.name.toUpperCase(),`Discovered · +${xp} XP${kind==='lm'?' · a supply cache is stashed here':''}`,'dawn');Sound.play('discover');gainXP(xp);jobProg('scout',1,p.key);
  if(kind==='lm'){learnBP('landmark cache');const R=LM_T[p.type].reveal;if(R){reveal(p.x,p.z,R);setTimeout(()=>toast(`From up here you can see for miles. The map around ${p.name} is filled in.`,'rare'),1500);}
    for(let i=0;i<24;i++){const a=rand(0,6.28),r=rand(3.5,6.5),x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;if(blockedSpot(x,z,.9))continue;
      const cr=spawnCrate(x,z,Math.random()<.3?'relic':'epic','cache');cr.chunk=chunks.get(Math.floor(x/CH)+','+Math.floor(z/CH))||null;break;}}
}
function scoutTarget(){
  const pcx=Math.floor(player.x/CH),pcz=Math.floor(player.z/CH);let best=null,bd=1e9;
  for(let i=-7;i<=7;i++)for(let j=-7;j<=7;j++){const cx=pcx+i,cz=pcz+j;let p=null;
    if(bioC(cx,cz)==='town')p=townRep(cx,cz);else p=lmAt(cx,cz);
    if(!p||EXP.found.has(p.key)||RPG.jobs.some(q=>q.key===p.key))continue;const d=Math.hypot(p.x-player.x,p.z-player.z);if(d<70)continue;if(d<bd){bd=d;best=p;}}
  return best;
}
function placeAt(x,z){const cx=Math.floor(x/CH),cz=Math.floor(z/CH);if(bioC(cx,cz)==='town')return townRep(cx,cz).name;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const lm=lmAt(cx+i,cz+j);if(lm&&Math.hypot(lm.x-x,lm.z-z)<30)return lm.name;}return'';}
function updateExplore(dt){
  EXP.t-=dt;if(EXP.t>0)return;EXP.t=.35;
  const night=S.env>.5;reveal(player.x,player.z,(night?26:44)*(1+.25*PERK('path')+(player.gear&&player.gear.binoc?.4:0)+TK('map'))*(1-.35*W.fog));
  const cx=Math.floor(player.x/CH),cz=Math.floor(player.z/CH);
  if(bioC(cx,cz)==='town'){const t=townRep(cx,cz);if(!EXP.found.has(t.key))discover(t,'town');}
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const lm=lmAt(cx+i,cz+j);if(lm&&!EXP.found.has(lm.key)&&Math.hypot(lm.x-player.x,lm.z-player.z)<24)discover(lm,'lm');}
  const here=placeAt(player.x,player.z);
  if(here!==EXP.here){if(here&&EXP.names.has(here))toast(`Entering ${here}`);if(here)EXP.names.add(here);EXP.here=here;}
}

