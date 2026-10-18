/* ================= THE HOUSE =================
   You start with a one-room cabin round the workbench instead of a walled compound. Its windows break (the glass
   goes first) and can be boarded up three planks deep from either side; the front door opens, shuts and can be
   smashed in. Upgrades add a bedroom wing and a workshop wing, a stronger door, stronger boards and, if you want
   it, the old perimeter fence. The infected path to the weakest window or door and bash their way in. */
const HOME_H=2.8,HOME_T=.3,WIN_W=1.2,DOOR_W=1.3,GLASS_HP=18,DOOR_HP=[0,250,450,800],BOARD_HP=[0,60,95,150];
const HOME={lv:1,doorLv:1,boardLv:1,win:{},door:{hp:250,alive:true,open:false,amt:0},group:null,recs:[],bed:null,hinge:null,cut:[],doorCut:false},HC={};
const hsegs=[];let ALLSEG=segs.slice();
const HROOMS=[[-4,4,-3,3],[4,9.5,-2.5,2.5],[-10,-4,-3,3]];
const HOME_INFO=['','Cabin: one room round the workbench','Bedroom wing: sleep in the bed to wake at full health','Workshop wing: a wood stove (extra rations when you cook) and a work table'];
// [axis the wall runs along, fixed coord, from, to, outward sign, openings [centre, w=window d=door g=doorway]]
function homeWalls(){const L=HOME.lv,W=[
  ['x',3,-4,4,1,[[-2.6,'w'],[0,'d'],[2.6,'w']]],['x',-3,-4,4,-1,[[-2,'w'],[2,'w']]],
  ['z',-4,-3,3,-1,[[0,L>=3?'g':'w']]],['z',4,-3,3,1,[[0,L>=2?'g':'w']]]];
  if(L>=2)W.push(['x',2.5,4,9.5,1,[[6.75,'w']]],['x',-2.5,4,9.5,-1,[[6.75,'w']]],['z',9.5,-2.5,2.5,1,[[-1.2,'w']]]);
  if(L>=3)W.push(['x',3,-10,-4,1,[[-7,'w']]],['x',-3,-10,-4,-1,[[-7,'w']]],['z',-10,-3,3,-1,[[0,'w']]]);
  return W;}
const HM={};
function homeMats(){if(HM.wall)return;Object.assign(HM,{wall:TM('wood',2,1,0x7a5a3a,0xd8c4a4),trim:FLAT(0xe8e0cc),floor:TM('wood',3,3,0x4a3626,0x9a7a5a),roof:M(0x4e3a30),gable:TM('wood',2,1,0x6a4e34,0xc8b090),
  door:TM('wood',1,1,0x5e4632,0xb89878),steel:TM('metal',1,1,0x5a6066,0xb0b8c0),board:M(0x6a5038),plate:M(0x6a7076,{metalness:.5,roughness:.5}),iron:M(0x2a2826,{metalness:.4})});Object.assign(HM.floor,{polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});}
function hseg(kind,axis,fixed,a,b,out,o){if(b-a<.02)return null;const horiz=axis==='x',t=HOME_T/2;
  const s=Object.assign({home:true,kind,horiz,cx:horiz?(a+b)/2:fixed,cz:horiz?fixed:(a+b)/2,nx:horiz?0:out,nz:horiz?out:0,w:b-a,h:HOME_H,
    x0:horiz?a:fixed-t,x1:horiz?b:fixed+t,z0:horiz?fixed-t:a,z1:horiz?fixed+t:b},o||{});hsegs.push(s);return s;}
function hsegFurn(x0,x1,z0,z1,h){hsegs.push({home:true,kind:'furn',horiz:true,cx:(x0+x1)/2,cz:(z0+z1)/2,nx:0,nz:1,w:x1-x0,h,x0,x1,z0,z1});}
// a box along a wall, in world coordinates
function hbox(G,mat,axis,fixed,a,b,y0,y1,th,off,noInk){if(b-a<.02||y1-y0<.02)return null;const l=b-a,c=(a+b)/2,h=y1-y0,o=off||0,f=noInk?mk:mki;
  const m=axis==='x'?f(BOX(l,h,th),mat,c,(y0+y1)/2,fixed+o,noInk?false:.05):f(BOX(th,h,l),mat,fixed+o,(y0+y1)/2,c,noInk?false:.05);G.add(m);
  if(HC.out&&!noInk)HOME.cut.push({m,y0,y1,axis,fixed,out:HC.out});return m;}
function makeWindow(G,axis,fixed,c,out){const s0=c-WIN_W/2,s1=c+WIN_W/2,id=axis+fixed+':'+c;
  hbox(G,HM.wall,axis,fixed,s0,s1,0,.9,HOME_T);hbox(G,HM.wall,axis,fixed,s0,s1,2.1,HOME_H,HOME_T);
  hbox(G,HM.trim,axis,fixed,s0-.08,s1+.08,.82,.92,HOME_T+.12);hbox(G,HM.trim,axis,fixed,s0-.08,s1+.08,2.08,2.18,HOME_T+.12);
  const st=HOME.win[id]||(HOME.win[id]={glass:true,ghp:GLASS_HP,boards:0,bhp:0});
  const glass=hbox(G,GLASS,axis,fixed,s0+.04,s1-.04,.92,2.08,.05,0,true);
  // jagged shards left in the frame once it's broken
  const shards=new THREE.Group();G.add(shards);
  for(const [u,v,sx,sy,r] of [[.08,.1,.32,.26,.5],[.9,.12,.26,.38,-.4],[.12,.92,.3,.28,.8],[.9,.88,.24,.32,-.7],[.5,.04,.42,.12,.1],[.5,.97,.36,.1,-.15]]){
    const p=new THREE.Mesh(BOX(sx,sy,.03),GLASS),al=s0+.04+u*(WIN_W-.08),y=.92+v*1.16;
    if(axis==='x')p.position.set(al,y,fixed);else p.position.set(fixed,y,al);p.rotation.set(0,axis==='z'?Math.PI/2:0,r);shards.add(p);}
  const planks=[];for(const [y,r] of [[1.12,.1],[1.5,-.07],[1.88,.12]]){const p=new THREE.Mesh(BOX(WIN_W+.4,.2,.07),HM.board);p.castShadow=true;
    const o=out*(HOME_T/2+.06);if(axis==='x')p.position.set(c,y,fixed+o);else p.position.set(fixed+o,y,c);p.rotation.set(0,axis==='z'?Math.PI/2:0,r);G.add(ink(p,.03));planks.push(p);}
  const s=hseg('win',axis,fixed,s0,s1,out,{id,st,glass,shards,planks});HOME.cut.push({win:s,axis,fixed,out});winVisual(s);return s;}
function makeDoor(G,axis,fixed,c,out){const s0=c-DOOR_W/2,hinge=new THREE.Group();hinge.position.set(s0+.05,0,fixed);G.add(hinge);
  const mat=HOME.doorLv>=3?HM.steel:HM.door,lw=DOOR_W-.1,leaf=new THREE.Group();hinge.add(leaf);
  leaf.add(mki(BOX(lw,2.3,.09),mat,lw/2,1.15,0,.04));leaf.add(mk(BOX(.08,.08,.22),HM.iron,lw-.16,1.05,0,false));
  if(HOME.doorLv>=2)for(const y of [.45,1.15,1.85])leaf.add(mk(BOX(lw-.1,.12,.14),HOME.doorLv>=3?HM.iron:HM.board,lw/2,y,0,false));
  HOME.hinge=hinge;HOME.leaf=leaf;hseg('door',axis,fixed,s0,c+DOOR_W/2,out);HOME.cut.push({door:true,axis,fixed,out});doorVisual();}
function buildHome(){homeMats();
  if(HOME.group){scene.remove(HOME.group);HOME.group.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();});}
  for(const r of HOME.recs){const i=BUILDS.indexOf(r);if(i>=0)BUILDS.splice(i,1);}HOME.recs=[];
  hsegs.length=0;HOME.cut=[];HOME.doorCut=false;const G=HOME.group=new THREE.Group();scene.add(G);
  for(const [axis,fixed,a0,a1,out,ops] of homeWalls()){HC.out=out;
    const horiz=axis==='x',A1=horiz?a1+HOME_T/2:a1;let cur=horiz?a0-HOME_T/2:a0;
    for(const [c,kind] of ops){const w=kind==='d'?DOOR_W:WIN_W,s0=c-w/2,s1=c+w/2;
      hbox(G,HM.wall,axis,fixed,cur,s0,0,HOME_H,HOME_T);hseg('wall',axis,fixed,cur,s0,out);
      if(kind==='g')hbox(G,HM.wall,axis,fixed,s0,s1,2.3,HOME_H,HOME_T);
      else if(kind==='d'){hbox(G,HM.wall,axis,fixed,s0,s1,2.35,HOME_H,HOME_T);hbox(G,HM.trim,axis,fixed,s0-.08,s1+.08,2.32,2.42,HOME_T+.12);makeDoor(G,axis,fixed,c,out);}
      else makeWindow(G,axis,fixed,c,out);
      cur=s1;}
    hbox(G,HM.wall,axis,fixed,cur,A1,0,HOME_H,HOME_T);hseg('wall',axis,fixed,cur,A1,out);}
  HC.out=0;
  // a floor and a gable roof per room; roofs lift away while you're inside, like any other building
  HROOMS.slice(0,HOME.lv).forEach(([x0,x1,z0,z1],i)=>{const cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0;
    G.add(mk(BOX(w-.1,.07,d-.1),HM.floor,cx,.035,cz,false));
    const roof=new THREE.Group();G.add(roof);const rise=i?1.1:1.5,span=d/2+.35,sl=Math.hypot(span,rise)+.1,a=Math.atan2(rise,span);
    for(const s of [-1,1]){const p=mki(BOX(w+.7,.16,sl),HM.roof,cx,HOME_H+rise/2-.05,cz+s*span/2,.05);p.rotation.x=s*a;roof.add(p);}
    const sh=new THREE.Shape();sh.moveTo(-d/2,0);sh.lineTo(d/2,0);sh.lineTo(0,rise);sh.closePath();const tg=new THREE.ExtrudeGeometry(sh,{depth:HOME_T,bevelEnabled:false});
    for(const x of [x0,x1]){const e=mki(tg,HM.gable,x-HOME_T/2,HOME_H,cz,.04);e.rotation.y=Math.PI/2;roof.add(e);}
    const rec={x:cx,z:cz,rot:0,hw:w/2,hd:d/2,ex:w/2,ez:d/2,h:HOME_H,roof};BUILDS.push(rec);HOME.recs.push(rec);});
  // furniture that comes with each wing
  HOME.bed=null;
  if(HOME.lv>=2){const bx=8.8,bz=1.3;G.add(mki(BOX(1,.35,2),HM.door,bx,.28,bz,.04));G.add(mk(BOX(.95,.14,1.45),M(0x7a2a24),bx,.52,bz+.25,false));
    G.add(mk(BOX(.75,.12,.38),M(0xe8e0d0),bx,.52,bz-.72,false));G.add(mki(BOX(1.04,.85,.08),HM.door,bx,.42,bz-1.02,.03));HOME.bed={x:bx,z:bz};hsegFurn(bx-.5,bx+.5,bz-1.05,bz+1,.6);}
  if(HOME.lv>=3){const sx=-9.25,sz=-2.3;G.add(mki(BOX(.8,.9,.7),HM.iron,sx,.45,sz,.04));G.add(mk(BOX(.5,.22,.04),new THREE.MeshBasicMaterial({color:0xff8a3a}),sx,.4,sz+.36,false));
    G.add(mki(CYL(.09,.09,HOME_H+1.3,8),HM.iron,sx,(HOME_H+1.3)/2+.6,sz,.03));hsegFurn(sx-.4,sx+.4,sz-.35,sz+.35,1);
    G.add(mki(BOX(1.6,.08,.9),HM.door,-6.6,.78,1.6,.03));for(const [ox,oz] of [[-.7,-.38],[.7,-.38],[-.7,.38],[.7,.38]])G.add(mk(BOX(.08,.75,.08),HM.door,-6.6+ox,.37,1.6+oz,false));hsegFurn(-7.4,-5.8,1.15,2.05,.86);}
  ALLSEG=segs.concat(hsegs);
}
function homeSolid(s){if(s.kind==='win')return s.st.glass||s.st.boards>0;if(s.kind==='door')return HOME.door.alive&&!HOME.door.open;return true;}
function inHome(x,z){for(let i=0;i<HOME.lv;i++){const r=HROOMS[i];if(x>r[0]&&x<r[1]&&z>r[2]&&z<r[3])return true;}return false;}
// keep camp structures off the house and the ground its wings will be built on
function nearHomeFoot(x,z,r){for(const q of HROOMS)if(x>q[0]-r-.3&&x<q[1]+r+.3&&z>q[2]-r-.3&&z<q[3]+r+.3)return true;return false;}
function winVisual(s){const st=s.st,cut=!!s.cut;s.glass.visible=!cut&&st.glass;s.shards.visible=!cut&&!st.glass;
  s.planks.forEach((p,i)=>{p.visible=!cut&&i<st.boards;p.material=HOME.boardLv>=3?HM.plate:HM.board;});}
function doorVisual(){if(HOME.leaf)HOME.leaf.visible=HOME.door.alive&&!HOME.doorCut;}
const sideName=s=>s.nz>0?'south':s.nz<0?'north':s.nx>0?'east':'west';
function homeMsg(t){if(!S.running||(S.time-(S.homeMsgT||-1e9))<4)return;S.homeMsgT=S.time;toast(t,'bad');}
function shatter(s){const st=s.st;if(!st.glass)return;st.glass=false;st.ghp=0;Sound.play('crash',.55,s.cx,s.cz);Sound.play('clink',.9,s.cx,s.cz);
  burst(s.cx,1.5,s.cz,12,'glass',4);winVisual(s);if(S.phase==='night')homeMsg(`Glass breaking: the ${sideName(s)} window`);}
function damageHome(s,d){
  if(s.kind==='win'){const st=s.st;
    if(st.boards>0){st.bhp-=d;burst(s.cx+s.nx*.4,1.5,s.cz+s.nz*.4,2,'debris',3);Sound.play('thud',.5,s.cx,s.cz);
      const nb=st.bhp<=0?0:Math.min(st.boards,Math.ceil(st.bhp/BOARD_HP[HOME.boardLv]));
      if(nb<st.boards){const side=Math.random()<.5?-1:1;addProp('plank',s.cx+s.nx*side*.6,s.cz+s.nz*side*.6,{life:10,mat:HM.board,vx:s.nx*side*rand(1,3),vz:s.nz*side*rand(1,3),vy:rand(2,4),spin:rand(-5,5)}).y=1.5;
        st.boards=nb;Sound.play('crash',.6,s.cx,s.cz);if(!nb){st.bhp=0;homeMsg(`The boards on the ${sideName(s)} window gave way`);}}}
    else if(st.glass){st.ghp-=d;if(st.ghp<=0)shatter(s);}
    winVisual(s);return;}
  if(s.kind==='door'){const st=HOME.door;if(!st.alive)return;st.hp-=d;burst(s.cx+s.nx*.4,1.2,s.cz+s.nz*.4,2,'debris',3);Sound.play('thud',.6,s.cx,s.cz);
    if(st.hp<=0){st.hp=0;st.alive=false;st.open=false;Sound.play('crash',.9,s.cx,s.cz);burst(s.cx,1.2,s.cz,16,'debris',6);rumble(.4,.2,200);
      for(let i=0;i<3;i++)addProp('plank',s.cx+rand(-.5,.5),s.cz-s.nz*.6,{life:12,mat:HM.door,vx:-s.nx*rand(1,4),vz:-s.nz*rand(1,4),vy:rand(2,5),spin:rand(-5,5)}).y=1.2;
      homeMsg('The front door has been smashed in!');}
    doorVisual();}
}
function hitSeg(s,d){if(s.home)damageHome(s,d);else damageSeg(s,d);}
// a 2D ray against an axis-aligned box: distance to the first hit, or null
function rayBox(ox,oz,dx,dz,x0,x1,z0,z1){let a=0,b=1e9;
  if(Math.abs(dx)<1e-9){if(ox<x0||ox>x1)return null;}else{let p=(x0-ox)/dx,q=(x1-ox)/dx;if(p>q){const t=p;p=q;q=t;}a=Math.max(a,p);b=Math.min(b,q);}
  if(Math.abs(dz)<1e-9){if(oz<z0||oz>z1)return null;}else{let p=(z0-oz)/dz,q=(z1-oz)/dz;if(p>q){const t=p;p=q;q=t;}a=Math.max(a,p);b=Math.min(b,q);}
  return b<a?null:a;}
// shots stop at the house walls and a shut door; glass in the way shatters; boards have gaps you can shoot through
function homeRay(ox,oz,dx,dz,block,brk){let b=block;const wins=[];
  for(const s of hsegs){if(s.kind==='furn')continue;const t=rayBox(ox,oz,dx,dz,s.x0,s.x1,s.z0,s.z1);if(t==null||t>b)continue;
    if(s.kind==='win'){if(s.st.glass&&!s.st.boards)wins.push([t,s]);continue;}if(homeSolid(s))b=t;}
  HRAY.length=0;if(brk)for(const w of wins)if(w[0]<b)HRAY.push(w);return b;}
const HRAY=[];
function homeLOS(ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=Math.hypot(dx,dz)||1e-6,ux=dx/l,uz=dz/l;
  for(const s of hsegs){if(s.kind==='furn'||!homeSolid(s))continue;const t=rayBox(ax,az,ux,uz,s.x0,s.x1,s.z0,s.z1);if(t!=null&&t<l)return false;}return true;}
// where the infected try to get in (or out): the cheapest opening on the way to you
function homeEntry(x,z){let best=null,bc=1e9;for(const s of hsegs){if(s.kind!=='win'&&s.kind!=='door')continue;
  const c=Math.hypot(s.cx-x,s.cz-z)+Math.hypot(s.cx-player.x,s.cz-player.z)+(s.kind==='door'?(HOME.door.alive&&!HOME.door.open?HOME.door.hp/25:0):(s.st.boards?s.st.bhp/12:s.st.glass?2:0));
  if(c<bc){bc=c;best=s;}}return best;}
function updateHome(dt){const d=HOME.door;d.amt+=((d.open&&d.alive?1:0)-d.amt)*Math.min(1,dt*7);if(HOME.hinge)HOME.hinge.rotation.y=d.amt*1.65;
  const on=TP&&!FP&&inHome(player.x,player.z),c=camera.position;
  for(const e of HOME.cut){const cut=on&&(e.axis==='x'?(c.z-e.fixed)*e.out:(c.x-e.fixed)*e.out)>.1;if(cut===!!e.cutNow)continue;e.cutNow=cut;
    if(e.win){e.win.cut=cut;winVisual(e.win);}else if(e.door){HOME.doorCut=cut;doorVisual();}
    else if(e.y0>=.85)e.m.visible=!cut;
    else if(e.y1>1){if(cut){e.m.scale.y=.9/(e.y1-e.y0);e.m.position.y=e.y0+.45;}else{e.m.scale.y=1;e.m.position.y=(e.y0+e.y1)/2;}}}}
/* ---- using the house ---- */
function homeTarget(){const px=player.x,pz=player.z;if(Math.abs(px)>13||Math.abs(pz)>8||player.jy>.4||player.climb)return null;let best=null,bd=1e9;
  for(const s of hsegs){if(s.kind!=='win'&&s.kind!=='door')continue;const d=segDist(s,px,pz),lim=s.kind==='door'?1.3:1.05;if(d<lim&&d<bd){bd=d;best={k:s.kind,s};}}
  if(!best&&HOME.bed&&Math.hypot(HOME.bed.x-px,HOME.bed.z-pz)<1.7)best={k:'bed'};return best;}
function homePrompt(t){
  if(t.k==='door'){const d=HOME.door;return d.alive?`${glyph('use')}${d.open?'Close':'Open'} the door`:'Door smashed · repair it at the workshop';}
  if(t.k==='bed')return`${glyph('use')}Sleep in the bed`;
  const st=t.s.st;return st.boards<3?`${glyph('use')}Board up the window · 1 wood (${st.boards}/3)${st.glass?'':' · glass broken'}`:`Window boarded up${st.glass?'':' · glass broken'}`;}
function boardWindow(s){const st=s.st;if(st.boards>=3){toast('That window is boarded three deep.');return;}
  if((S.time||0)<(S.boardT||0))return;
  if((player.wood|0)<1){toast('You need wood to board up a window. Chop a tree.','bad');return;}
  S.boardT=(S.time||0)+.45;player.wood--;st.boards++;st.bhp+=BOARD_HP[HOME.boardLv];Sound.play('build',.7);Sound.play('thud',.5,s.cx,s.cz);
  burst(s.cx,1.5,s.cz,4,'debris',2);winVisual(s);floatText(s.cx,2.3,s.cz,`Boarded ${st.boards}/3`);}
function useHome(t){
  if(t.k==='door'){const d=HOME.door;if(!d.alive){toast('The door is smashed. Repair it at the workshop.','bad');return;}d.open=!d.open;Sound.play('door',.7);return;}
  if(t.k==='bed'){sleep({x:HOME.bed.x,z:HOME.bed.z,bed:true});return;}
  boardWindow(t.s);}
function homeIntegrity(){let a=HOME.door.hp/DOOR_HP[HOME.doorLv]*2,n=2;for(const s of hsegs)if(s.kind==='win'){n++;a+=s.st.boards||s.st.glass?1:0;}
  if(base.wallLv){let hp=0,mx=0;for(const g of segs){hp+=g.hp;mx+=g.maxHp;}a+=hp/mx*4;n+=4;}return Math.round(a/n*100);}
function homeRepairCost(){let c=Math.ceil((DOOR_HP[HOME.doorLv]-HOME.door.hp)/5);for(const s of hsegs)if(s.kind==='win'&&!s.st.glass)c+=12;return c;}
function repairHome(){Object.assign(HOME.door,{hp:DOOR_HP[HOME.doorLv],alive:true});for(const s of hsegs)if(s.kind==='win'){s.st.glass=true;s.st.ghp=GLASS_HP;winVisual(s);}doorVisual();}
function boardAll(){let w=player.wood|0,n=0;const wins=hsegs.filter(s=>s.kind==='win');
  while(w>0){const s=wins.filter(s=>s.st.boards<3).sort((a,b)=>a.st.boards-b.st.boards)[0];if(!s)break;s.st.boards++;s.st.bhp+=BOARD_HP[HOME.boardLv];winVisual(s);w--;n++;}
  player.wood-=n;if(n){Sound.play('build');toast(`Nailed up ${n} board${n>1?'s':''}`,'good');}}
function resetHome(){Object.assign(HOME,{lv:1,doorLv:1,boardLv:1,win:{},door:{hp:DOOR_HP[1],alive:true,open:false,amt:0}});buildHome();}
buildHome();

const floodPoles=floods.map(l=>{const g=new THREE.Group();g.position.set(l.position.x,0,l.position.z);g.add(mk(CYL(.1,.12,6.5,6),M(0x2f312c),0,3.25,0));
  const head=new THREE.Mesh(BOX(.7,.35,.5),new THREE.MeshBasicMaterial({color:0xfff2c0}));head.position.y=6.5;g.add(head);g.visible=false;scene.add(g);return g;});

const TUR=[null,{dmg:9,rate:.32,range:20},{dmg:16,rate:.22,range:23},{dmg:28,rate:.15,range:26}];
const turrets=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz])=>{
  const x=sx*(BR-2.4),z=sz*(BR-2.4);const g=new THREE.Group();g.position.set(x,0,z);
  g.add(mk(CYL(.8,1,.5,8),M(0x3c4038),0,.25,0));g.add(mk(CYL(.16,.2,1.2,6),M(0x2b2e29),0,1,0));
  const head=new THREE.Group();head.position.y=1.75;
  head.add(mk(BOX(.9,.6,1.1),M(0x55604a)));
  const bar=mk(CYL(.08,.08,1.4,6),M(0x1f211f),.18,.05,.9);bar.rotation.x=Math.PI/2;head.add(bar);
  const bar2=mk(CYL(.08,.08,1.4,6),M(0x1f211f),-.18,.05,.9);bar2.rotation.x=Math.PI/2;head.add(bar2);
  const eye=new THREE.Mesh(BOX(.2,.12,.05),new THREE.MeshBasicMaterial({color:0xff4030}));eye.position.set(0,.18,.56);head.add(eye);
  g.add(head);g.visible=false;scene.add(g);return{g,head,x,z,cd:0,yaw:0};
});

