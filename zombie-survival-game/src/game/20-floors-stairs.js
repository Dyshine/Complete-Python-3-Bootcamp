/* ================= FLOORS & STAIRS =================
   Two-story buildings: anything inside one has a floor level (0 or 1) and a height. Walking along the stair rectangle
   raises you smoothly; elsewhere you stay on your floor. Infected path through the front door and up the stairs. */
const LVL_B=[];
const bLocal=(b,x,z)=>{const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rot),s=Math.sin(b.rot);return[dx*c-dz*s,dx*s+dz*c];};
const bWorld=(b,lx,lz)=>l2w(b.x,b.z,b.rot,lx,lz);
const inFoot=(b,x,z,m)=>{const [lx,lz]=bLocal(b,x,z);return Math.abs(lx)<b.hw0+m&&Math.abs(lz)<b.hd0+m;};
function updateLevel(e){
  let b=e.bld;
  if(!b||!inFoot(b,e.x,e.z,.1)){b=null;for(const bb of LVL_B){if(Math.abs(bb.x-e.x)<bb.ex+1&&Math.abs(bb.z-e.z)<bb.ez+1&&inFoot(bb,e.x,e.z,0)){b=bb;break;}}e.bld=b;}
  if(!b){e.lvl=0;e.lvlY=0;return;}
  const [lx,lz]=bLocal(b,e.x,e.z),st=b.stair;
  if(lx>st.x0&&lx<st.x1&&lz>st.z0-.05&&lz<st.z1+.05){const t=clamp((st.z1-lz)/(st.z1-st.z0),0,1);e.lvlY=t*b.fh;e.lvl=e.lvl?(t>.4?1:0):(t>.6?1:0);}
  else e.lvlY=(e.lvl||0)*b.fh;
}
// where an infected should walk to reach the player across floors (null = straight at the player)
function lvlNav(z){
  const pb=player.bld,zb=z.bld,pl=player.lvl||0,zl=z.lvl||0;
  if(pb&&pl===1&&zb!==pb){ // get to the front door, round the corner if needed, then inside
    const [lx,lz]=bLocal(pb,z.x,z.z),hw=pb.hw0,hd=pb.hd0,dx=pb.doorX,side=lx<0?-1:1;
    let tl;
    if(lz>hd-.6)tl=Math.abs(lx-dx)>.6&&lz>hd+.2?[dx,hd+1.4]:[dx,hd-1.6]; // in front: line up with the door, then walk in
    else tl=Math.abs(lx)<hw+.9?[side*(hw+1.7),lz]:[side*(hw+1.7),hd+1.7]; // behind or beside: out to the side, round the front corner
    const w=bWorld(pb,tl[0],tl[1]);return[w.x,w.z];}
  const b=zb;if(!b)return null;const st=b.stair,cx=(st.x0+st.x1)/2,[lx,lz]=bLocal(b,z.x,z.z);
  const onSt=lx>st.x0&&lx<st.x1&&lz>st.z0-.1&&lz<st.z1+.1,up=pb===b&&pl===1,B=[cx,st.z1+.85],T=[cx,st.z0-.8];
  const near=q=>Math.hypot(lx-q[0],lz-q[1])<.8,go=q=>{const w=bWorld(b,q[0],q[1]);return[w.x,w.z];};
  if(onSt)return go(up?T:B);                       // finish the flight before doing anything else
  if(zl===0&&up)return go(near(B)?T:B);            // to the foot of the stairs, then up
  if(zl===1&&up&&lx<st.x1+.8)return go([st.x1+1.5,lz]);                    // off the landing, clear of the railing
  if(zl===1&&!up){if(lx>st.x1+.2&&lz>st.z0+.9)return go([st.x1+1.1,st.z0+.2]); // round the railing to the landing
    return go(near(T)?B:T);}                        // then down
  if(zl===0&&pb!==b){const tl=Math.abs(lx-b.doorX)>.7&&lz<b.hd0-.4?[b.doorX,b.hd0-1.6]:[b.doorX,b.hd0+1.8];const w=bWorld(b,tl[0],tl[1]);return[w.x,w.z];}
  return null;
}
// a two-story shell: ground floor with a front door, stairs up the west wall, an open upper floor with railings, gable roof
function twoStory(x,z,rot,o){
  const K=Kit(x,z,rot),hw=o.hw,hd=o.hd,fh=3.2,h2=2.8,wall=o.wall,trim=o.trim||FLAT(0xe8e0cc),floorM=ITM('wood',0x5b4a39,0xa89880,3),dark=FLAT(0x4a3a2c);
  const st={x0:-hw+.3,x1:-hw+1.95,z0:-hd+1.5,z1:hd-2.3}; // wide enough for a body past the wall's collision
  kBox(K,0,floorM,hw*2,.2,hd*2,0,.1,0);
  // ground floor
  kWall(K,'x',hd,-hw,hw,fh,wall,o.front,{trim});
  kWall(K,'x',-hd,-hw,hw,fh,wall,[[1.6,1.3,'w'],[hw-1.4,1.1,'b']],{trim});
  kWall(K,'z',-hw,-hd+.15,hd-.15,fh,wall,[],{trim});
  kWall(K,'z',hw,-hd+.15,hd-.15,fh,wall,[[-1.6,1.3,'w'],[1.8,1.3,RNG()<.5?'b':'w']],{trim});
  for(const [c,w,k] of o.front)if(k==='d'||k==='g')for(let s=c-w/2;s<=c+w/2+.01;s+=.55)kSolid(K,s,hd,.38,1); // door gaps are wall upstairs
  // upper floor walls (no extra obstacles: the ground-floor walls already block both floors)
  const U={grp:2,y0:fh,noSolid:true,trim,sill:.8,top:2.1};
  kWall(K,'x',hd,-hw,hw,h2,wall,[[-1.8,1.2,'w'],[1,1.2,'w'],[hw-1.2,1,'w']],U);
  kWall(K,'x',-hd,-hw,hw,h2,wall,[[0,1.2,'w'],[hw-1.5,1.2,RNG()<.4?'b':'w']],U);
  kWall(K,'z',-hw,-hd+.15,hd-.15,h2,wall,[[hd-1.4,1,'w']],U);
  kWall(K,'z',hw,-hd+.15,hd-.15,h2,wall,[[-1.4,1.2,'w'],[1.6,1.2,'w']],U);
  for(const sg of [-1,1]){kBox(K,2,trim,hw*2+.36,.22,.1,0,fh+.02,sg*(hd+.2));kBox(K,2,trim,.1,.22,hd*2+.36,sg*(hw+.2),fh+.02,0);} // trim band between floors
  // upper floor slab around the stairwell
  const slab=(x0,x1,z0,z1)=>{if(x1-x0>.05&&z1-z0>.05)kBox(K,2,floorM,x1-x0,.24,z1-z0,(x0+x1)/2,fh-.12,(z0+z1)/2);};
  slab(-hw,st.x0,-hd,hd);slab(st.x1,hw,-hd,hd);slab(st.x0,st.x1,-hd,st.z0);slab(st.x0,st.x1,st.z1,hd);
  // stairs: solid treads rising north
  const n=12,sl=(st.z1-st.z0)/n;for(let i=0;i<n;i++){const top=(i+1)*fh/n;kBox(K,0,floorM,st.x1-st.x0,top,sl+.02,(st.x0+st.x1)/2,top/2,st.z1-sl*(i+.5));}
  kBox(K,0,dark,.08,.9,st.z1-st.z0,st.x1+.04,fh/2+.45,(st.z0+st.z1)/2,0,Math.atan2(fh,st.z1-st.z0),0); // banister
  for(let zz=st.z0;zz<=st.z1-1;zz+=.45)kSolid(K,st.x1+.3,zz,.3,0);       // can't walk under or onto the stairs from the side
  for(let xx=st.x0+.1;xx<=st.x1;xx+=.45)kSolid(K,xx,st.z0-.2,.32,0);
  // railing round the stairwell upstairs (open at the top, north end)
  for(let zz=st.z0+1.1;zz<=st.z1+.01;zz+=.6){kBox(K,2,dark,.08,1,.08,st.x1+.05,fh+.5,zz);kSolid(K,st.x1+.3,zz,.3,1);kSolid(K,st.x1+.3,zz+.3,.3,1);}
  kBox(K,2,dark,.1,.08,st.z1-st.z0-1.1,st.x1+.05,fh+1,(st.z0+1.1+st.z1)/2); // railing starts past the top step so the landing stays walkable
  for(let xx=st.x0;xx<=st.x1+.01;xx+=.5){kBox(K,2,dark,.08,1,.08,xx,fh+.5,st.z1+.05);kSolid(K,xx,st.z1+.2,.32,1);}
  kBox(K,2,dark,st.x1-st.x0,.08,.1,(st.x0+st.x1)/2,fh+1,st.z1+.05);
  // furniture: kitchen and table below, beds and a dresser above
  kBox(K,0,FLAT(0x6a5a48),2.6,.95,.7,hw-1.6,.48,-hd+.6);kSolid(K,hw-2.4,-hd+.6,.45,0);kSolid(K,hw-.9,-hd+.6,.45,0);
  kBox(K,0,dark,1.4,.8,.9,1.6,.4,-.6);kSolid(K,1.2,-.6,.55,0);kSolid(K,2,-.6,.55,0);
  kBox(K,2,FLAT(pick([0x8a3a30,0x3a5a7a,0x5a6a3a])),1.4,.5,2.1,hw-1,fh+.25,-hd+1.4);kSolid(K,hw-1,-hd+.9,.6,1);kSolid(K,hw-1,-hd+1.9,.6,1);
  kBox(K,2,FLAT(0xe8e0cc),1.3,.15,.5,hw-1,fh+.55,-hd+.55);
  kBox(K,2,dark,1.6,1.1,.5,.4,fh+.55,-hd+.4);kSolid(K,0,-hd+.45,.4,1);kSolid(K,.8,-hd+.45,.4,1);
  kBox(K,2,FLAT(0x5a4a6a),1.1,.45,1.9,hw-1,fh+.22,hd-1.4);kSolid(K,hw-1,hd-.9,.6,1);kSolid(K,hw-1,hd-1.9,.6,1);
  if(o.extra)o.extra(K,hw,hd,fh,h2);
  kGable(K,o.roof,wall,hw*2,hd*2,fh+h2,2.2,false,.5);
  if(o.chimney)kBox(K,1,CTM('brick',0xd0c0b0,2),.9,4.4,.9,hw-1.4,fh+h2+1.8,-hd+1.6);
  K.lv={fh,stair:st,doorX:o.doorX,hw0:hw,hd0:hd,lootUp:[[1.5,1.4],[-1,-hd+1.6],[hw-2.4,hd-.9]]};
  kDoor(K,o.doorX-.65,hd,1.3);
  return kFinish(K,hw,o.hdRec||hd,fh+h2+2.4,o.kind);
}
function bTownhouse(x,z,rot){
  const R=RNG,brick=R()<.5;
  return twoStory(x,z,rot,{hw:4.6,hd:4.4,kind:'townhouse',doorX:1,
    wall:brick?CTM('brick',pick([0xffffff,0xd8c8b8,0xb8a898]),2):CTM('siding',pick([0xf2ede0,0xc8d8e0,0xe8e0b8,0xd8c0c0]),2),
    roof:CTM('shingle',pick([0x8a7f78,0x6a5048,0x5a6670]),2),chimney:R()<.6,
    front:[[1,1.3,'d'],[-2.4,1.3,R()<.4?'b':'w'],[3.3,1.1,'w']],
    extra:(K,hw,hd)=>{kBox(K,0,FLAT(0x3a3a38),2.4,.15,1.3,1,2.6,hd+.65);for(const px of [0,2]){kBox(K,0,FLAT(0xe8e0cc),.14,2.6,.14,px,1.3,hd+1.2);}}});
}
function bFarmhouse2(x,z,rot){
  return twoStory(x,z,rot,{hw:5,hd:4.5,hdRec:6.7,kind:'farmhouse2',doorX:.8,
    wall:CTM('siding',pick([0xf2ede0,0xe8e0b8,0xc8d8e0,0xd8e0c8]),2),roof:CTM('shingle',pick([0x8a7f78,0x6a5048,0x5a6670]),2),chimney:true,
    front:[[.8,1.3,'d'],[-2.6,1.3,'w'],[3.2,1.3,RNG()<.4?'b':'w']],
    extra:(K,hw,hd)=>{const wood=ITM('wood',0x5b4a39,0xa89880,3),wt=FLAT(0xf0e8d8);
      kBox(K,0,wood,hw*2,.25,2.2,0,.12,hd+1.1);
      for(const px of [-4.7,-1.6,1.6,4.7]){kBox(K,0,wt,.2,2.7,.2,px,1.35,hd+2.05);kSolid(K,px,hd+2.05,.25);}
      kBox(K,0,CTM('metalwall',0x9a9a98,2),hw*2+.4,.15,2.6,0,2.85,hd+1.25,0,.16,0);}});
}

