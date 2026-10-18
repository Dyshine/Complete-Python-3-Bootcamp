/* ================= BASE ================= */
const baseFloor=new THREE.Mesh(new THREE.PlaneGeometry(BR*2,BR*2),new THREE.MeshStandardMaterial({color:0x56544b,roughness:1}));
onTex('concrete',()=>{baseFloor.material.map=texRep('concrete',6,6);baseFloor.material.color.setHex(0xa8a69e);baseFloor.material.needsUpdate=true;});
baseFloor.rotation.x=-Math.PI/2;baseFloor.position.y=.04;baseFloor.receiveShadow=true;scene.add(baseFloor);
const WB={x:0,z:-1.8};
(function buildCamp(){
  scene.add(mki(BOX(3,.9,1.4),TM('wood',2,1,0x6a4f35,0xc0a888),WB.x,.45,WB.z,.06));addObs({x:WB.x-.8,z:WB.z,r:.75},{x:WB.x+.8,z:WB.z,r:.75});
  scene.add(mk(BOX(.8,.35,.5),M(0xa23b2a),WB.x-.8,1.07,WB.z));
  scene.add(mk(BOX(.5,.2,.8),M(0x3d4a52),WB.x+.6,1,WB.z+.1));
  const lamp=new THREE.Mesh(BOX(.25,.35,.25),new THREE.MeshBasicMaterial({color:0xffd28a}));lamp.position.set(WB.x+1.2,1.1,WB.z-.4);scene.add(lamp);
  scene.add(mki(BOX(1.6,1.1,1),TM('metal',1,1,0x55603f,0x9aa888),6.5,.55,6,.06));scene.add(mk(CYL(.12,.12,1,6),M(0x2a2a28),7,1.5,6));addObs({x:6.5,z:6,r:.85});

  for(let i=0;i<5;i++)scene.add(mki(BOX(.9,.9,.9),TM('wood',1,1,0x5a4632,pick([0xc8b090,0xa8b890])),-8+i*.95,.45,-8,.05));
  scene.add(mki(BOX(.9,.9,.9),TM('wood',1,1,0x5a4632,0xc8b090),-7.5,1.35,-8,.05));
  for(let i=0;i<5;i++)addObs({x:-8+i*.95,z:-8,r:.5});
})();

const SEGN=5,SEGL=BR*2/SEGN;
const WALL_HP=[0,150,300,520,800],WALL_NAME=['','Scrap-wood palisade','Sheet-metal barricade','Poured concrete','Reinforced bunker'];
const WALL_TEX=[null,'wood','metal','concrete','concrete'],WALL_TINT=[0,0xffffff,0xffffff,0xf0ece4,0x8c9c94];
const WALL_COL=[0,0x7a5a3a,0x7c8288,0x9a978d,0x4f5a52],WALL_H=[0,1.8,2.2,2.6,3.0];
const SIDE=[{nx:0,nz:-1,n:'north'},{nx:0,nz:1,n:'south'},{nx:-1,nz:0,n:'west'},{nx:1,nz:0,n:'east'}];
const segs=[],posts=[];
const spikeM=M(0x8f8a80,{metalness:.3,roughness:.6});
const rubbleM=M(0x3a352d),barM=M(0x2a2620);
for(const s of SIDE)for(let i=0;i<SEGN;i++){
  const t=-BR+SEGL/2+i*SEGL,horiz=s.nz!==0,door=i===2;
  const cx=horiz?t:s.nx*BR,cz=horiz?s.nz*BR:t;
  const mat=new THREE.MeshToonMaterial({color:0x7a5a3a,gradientMap:TOON_GRAD});
  const seg={cx,cz,nx:s.nx,nz:s.nz,side:s.n,horiz,door,mat,hp:150,maxHp:150,alive:true,open:false,openAmt:0,
    x0:horiz?cx-SEGL/2:cx-.35,x1:horiz?cx+SEGL/2:cx+.35,z0:horiz?cz-.35:cz-SEGL/2,z1:horiz?cz+.35:cz+SEGL/2};
  if(!door){seg.mesh=mki(BOX(SEGL,1,.7),mat,cx,.5,cz,.08);if(!horiz)seg.mesh.rotation.y=Math.PI/2;scene.add(seg.mesh);}
  else{
    const g=new THREE.Group();g.position.set(cx,0,cz);if(!horiz)g.rotation.y=Math.PI/2;
    const lw=SEGL/2-.06;
    const L=new THREE.Group();L.position.x=-SEGL/2;const R=new THREE.Group();R.position.x=SEGL/2;
    seg.leafL=mki(BOX(lw,1,.4),mat,lw/2,.5,0,.06);seg.leafR=mki(BOX(lw,1,.4),mat,-lw/2,.5,0,.06);
    for(const lf of [seg.leafL,seg.leafR])for(const y of [-.28,.28]){const b=mk(BOX(lw-.2,.1,.46),barM,0,y,0,false);lf.add(b);}
    const brace=mk(BOX(.1,.1,.46),barM,0,0,0,false);brace.scale.x=lw*1.05;brace.rotation.z=.9;seg.leafL.add(brace);
    const brace2=brace.clone();brace2.rotation.z=-.9;seg.leafR.add(brace2);
    L.add(seg.leafL);R.add(seg.leafR);g.add(L,R);scene.add(g);
    seg.gate=g;seg.pL=L;seg.pR=R;seg.phi=-(s.nx+s.nz)*Math.PI/2;
  }
  seg.rubble=mk(BOX(SEGL-.8,.35,1.3),rubbleM,cx,.17,cz);if(!horiz)seg.rubble.rotation.y=Math.PI/2;seg.rubble.visible=false;scene.add(seg.rubble);
  if(!door){
    const spikes=new THREE.Group();spikes.position.set(cx,0,cz);
    for(let k=0;k<5;k++){const off=-SEGL/2+.6+k*(SEGL-1.2)/4;const c=mk(new THREE.ConeGeometry(.1,1.2,5),spikeM,horiz?off:s.nx*.9,.55,horiz?s.nz*.9:off,false);
      if(horiz)c.rotation.x=s.nz*Math.PI/3;else c.rotation.z=-s.nx*Math.PI/3;spikes.add(c);}
    spikes.visible=false;scene.add(spikes);seg.spikes=spikes;
  }
  segs.push(seg);
}
const gates=segs.filter(s=>s.door);
for(let k=0;k<=SEGN;k++){const a=-BR+k*SEGL;for(const [x,z] of [[a,-BR],[a,BR],[-BR,a],[BR,a]]){if(posts.some(p=>Math.abs(p.position.x-x)<.01&&Math.abs(p.position.z-z)<.01))continue;const p=mki(BOX(.6,1,.6),M(0x3d362c),x,.5,z,.06);scene.add(p);posts.push(p);}}

