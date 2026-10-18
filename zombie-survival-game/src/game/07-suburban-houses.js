/* ================= SUBURBAN HOUSES (City Kit Suburban by Kenney, CC0) =================
   21 house shells, restyled in a shader so the toy-bright kit fits a ruined Midwest: the palette swatch a face samples says
   what it is (roof, wall, trim, cladding, glass), and each style swaps those colours and adds a surface: clapboard siding,
   brick courses or board-and-batten on walls, shingle rows on roofs, grime creeping up from the ground, dark broken glass.
   They are solid shells: loot spawns on the porch and in the yard, not inside. */
const SUB={ready:false,types:[],mats:{}};
const SUB_STYLES={
  farmhouse:{wall:0xe8e2d2,roof:0x7a2e22,trim:0xf2eee4,dark:0x4a3a30,wallFx:1,roofFx:2},
  craftsman:{wall:0x8a9a72,roof:0x4a3a30,trim:0xe8dcc0,dark:0x3a3028,wallFx:3,roofFx:1},
  colonial:{wall:0x9fb4c8,roof:0x4a4e56,trim:0xf2f2ee,dark:0x2e3a4a,wallFx:1,roofFx:1},
  brick:{wall:0x8e4a36,roof:0x33302e,trim:0xd8d0c0,dark:0x2a2624,wallFx:2,roofFx:1},
  victorian:{wall:0xd8bc62,roof:0x3c3a40,trim:0xf0ece2,dark:0x5a2e30,wallFx:1,roofFx:1},
  weathered:{wall:0x8a8680,roof:0x5a4a3a,trim:0x6a6560,dark:0x3a3634,wallFx:3,roofFx:2},
  capecod:{wall:0xe6dcc4,roof:0x26282c,trim:0x2f4a3a,dark:0x2a2a2a,wallFx:1,roofFx:1},
};
const SUB_GLSL=`
float sH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(sH(i),sH(i+vec2(1,0)),f.x),mix(sH(i+vec2(0,1)),sH(i+vec2(1,1)),f.x),f.y);}
float subGlass(vec2 uv){return step(.625,uv.x)*step(uv.x,.75)*step(.25,uv.y)*step(uv.y,.5);}
vec3 subStyle(vec3 tex,vec2 uv,vec3 p,vec3 n){
  float lum=dot(tex,vec3(.299,.587,.114));
  float wall=step(.375,uv.x)*step(uv.x,.5)*step(.5,uv.y)*step(uv.y,.75);
  float roof=step(uv.x,.125)*step(.25,uv.y)*step(uv.y,.5);
  float trim=step(uv.x,.125)*step(.5,uv.y)*step(uv.y,.75);
  float dark=step(.125,uv.x)*step(uv.x,.25)*step(.5,uv.y)*step(uv.y,.75);
  float glass=step(.625,uv.x)*step(uv.x,.75)*step(.25,uv.y)*step(uv.y,.5);
  float bush=step(.125,uv.x)*step(uv.x,.25)*step(.75,uv.y);
  vec3 c=tex;
  float h=p.y*uScale;vec2 side=abs(n.x)>abs(n.z)?vec2(p.z,p.y):vec2(p.x,p.y);side*=uScale;
  if(wall>.5){float sh=lum/.93;c=uWall*sh;
    if(uWallFx<1.5){c*=1.-.22*smoothstep(.78,.97,fract(h*3.4));}                                   // clapboard
    else if(uWallFx<2.5){vec2 b=vec2(side.x*2.1+step(.5,fract(side.y*4.6))*.5,side.y*4.6);float m=max(smoothstep(.88,.97,fract(b.x)),smoothstep(.82,.95,fract(b.y)));
      c*=.88+.24*sH(floor(b));c=mix(c,vec3(.62,.6,.56),m*.75);}                                       // brick courses
    else{c*=1.-.25*smoothstep(.86,.97,fract(side.x*2.4));c*=.9+.2*sN(vec2(side.x*2.4,side.y*.3));}     // board and batten
  }
  else if(roof>.5){c=uRoof*(lum/.6);
    float row=fract(h*5.);c*=1.-.28*smoothstep(.72,.98,row);c*=.85+.3*sH(vec2(floor(side.x*3.+floor(h*5.)*.5),floor(h*5.)));
    if(uRoofFx>1.5)c=mix(c,vec3(.35,.4,.24),.35*smoothstep(.55,.85,sN(side*1.3)));}                    // moss
  else if(trim>.5)c=uTrim*(lum/.6);
  else if(dark>.5)c=uDark*(lum/.36);
  else if(bush>.5)c=vec3(.26,.32,.17)*(lum/.55)*(.8+.4*sN(side*2.5));
  else if(glass>.5){c=mix(vec3(.08,.1,.12),vec3(.3,.38,.44),smoothstep(.2,.9,lum))*(.7+.3*sN(side*3.));}
  // grime: rising damp, streaks under the eaves, general wear
  float g=sN(side*.9+uSeed);c*=1.-.35*smoothstep(.55,0.,h)*(.6+.4*g);c*=.9+.12*g;
  c*=1.-.18*smoothstep(.6,.9,sN(vec2(side.x*4.,h*.6)))*(1.-roof);
  return c;}
`;
function subMat(key,base){if(SUB.mats[key])return SUB.mats[key];const S=SUB_STYLES[key];
  const m=new THREE.MeshToonMaterial({map:base.map,gradientMap:TOON_GRAD,side:THREE.DoubleSide});
  const u={uWall:{value:new THREE.Color(S.wall)},uRoof:{value:new THREE.Color(S.roof)},uTrim:{value:new THREE.Color(S.trim)},uDark:{value:new THREE.Color(S.dark)},
    uWallFx:{value:S.wallFx},uRoofFx:{value:S.roofFx},uScale:{value:SUB.scale},uSeed:{value:Object.keys(SUB_STYLES).indexOf(key)*7.3}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
    sh.vertexShader='varying vec3 vSP;varying vec3 vSN;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vSP=position;vSN=normal;');
    sh.fragmentShader='varying vec3 vSP;varying vec3 vSN;uniform vec3 uWall,uRoof,uTrim,uDark;uniform float uWallFx,uRoofFx,uScale,uSeed;\n'+SUB_GLSL+
      sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n if(subGlass(vUv)>.5)discard;\n diffuseColor.rgb=subStyle(diffuseColor.rgb,vUv,vSP,normalize(vSN));\n if(!gl_FrontFacing)diffuseColor.rgb*=.42;');};
  m.customProgramCacheKey=()=>'sub|'+key;return SUB.mats[key]=m;}
const SUB_OL=(()=>{const m=new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide});m.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed+=normal*.006;');};m.customProgramCacheKey=()=>'subol';return m;})();
if(THREE.GLTFLoader){try{new THREE.GLTFLoader().load('models/houses/suburban.gltf.json',g=>{try{
  let base=null;g.scene.traverse(o=>{if(o.isMesh){if(!base)base=o.material;o.geometry.computeBoundingBox();const bb=o.geometry.boundingBox;
    SUB.types.push({name:o.name||o.parent.name,geo:o.geometry,min:bb.min.clone(),max:bb.max.clone()});}});
  // one scale for the whole kit: the widest house becomes 13 m across
  let mx=0;for(const t of SUB.types)mx=Math.max(mx,t.max.x-t.min.x,t.max.z-t.min.z);SUB.scale=13/mx;
  // the panes, cut out of the palette's glass swatch (07e-house-glass.js)
  for(const t of SUB.types)t.glass=shellPanes(t.geo,(u,v)=>u>=.62&&u<=.755&&v>=.245&&v<=.505,1.6/SUB.scale);
  for(const k in SUB_STYLES)subMat(k,base);SUB.ready=SUB.types.length>0;
}catch(e){console.warn('Suburban houses failed; using built-in houses.',e);}},undefined,()=>{});}catch(e){}}
// a kit house on a lot, facing local +z (the street); returns false when the kit isn't loaded yet
const subOrHouse=(x,z,r)=>addSuburb(x,z,r)||addHouse(x,z,r);
function addSuburb(x,z,rot,styleKey){
  if(!SUB.ready)return false;const T=SUB.types[Math.floor(RNG()*SUB.types.length)],keys=Object.keys(SUB_STYLES),key=styleKey||keys[Math.floor(RNG()*keys.length)],s=SUB.scale;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  const m=new THREE.Mesh(T.geo,SUB.mats[key]);m.scale.setScalar(s);m.position.set(-(T.min.x+T.max.x)/2*s,0,-(T.min.z+T.max.z)/2*s);m.castShadow=true;m.receiveShadow=true;g.add(m);
  if(GFX==='high'){const o=new THREE.Mesh(T.glass.hull,SUB_OL);o.scale.copy(m.scale);o.position.copy(m.position);g.add(o);}
  track(g);
  // solid footprint: a ring of obstacles round the walls and a fill inside so nothing spawns in the shell
  const hw=(T.max.x-T.min.x)/2*s,hd=(T.max.z-T.min.z)/2*s;addPad(x,z,rot,hw,hd);
  shellGlass(g,m,x,z,rot,T.glass,hw,hd);
  for(let lx=-hw+.8;lx<=hw-.8+.01;lx+=1.5)for(let lz=-hd+.8;lz<=hd-.8+.01;lz+=1.5){const p=l2w(x,z,rot,lx,lz);addOb({x:p.x,z:p.z,r:1.05});}
  const c=Math.abs(Math.cos(rot)),sn=Math.abs(Math.sin(rot)),rec={x,z,rot,hw,hd,h:(T.max.y-T.min.y)*s,kind:'house',solid:true,style:key,type:T.name,ex:c*hw+sn*hd,ez:sn*hw+c*hd};
  houses.push(rec);if(CUR)CUR.houses.push(rec);
  // a porch light that stays on, now and then, and junk in the yard
  if(RNG()<.5){const p=l2w(x,z,rot,rand(-hw+2,hw-2),hd+rand(2,4));addProp(pick(['carton','crate','tire','can']),p.x,p.z);}
  if(RNG()<.22){const s=RNG()<.5?-1:1,p=l2w(x,z,rot,s*(hw+1.7),hd-1.5);if(!blockedSpot(p.x,p.z,2.2))addCar(p.x,p.z,rot+(RNG()<.6?0:Math.PI)+rand(-.06,.06),pick(['sedan','wagon','pickup']));}
  return rec;
}
function bApartment(x,z,rot){
  const K=Kit(x,z,rot),hw=6,hd=5,fh=3.2,floors=randi(3,4),R=RNG;
  const wall=R()<.6?CTM('brick',pick([0xffffff,0xd8c8b8,0xb8a898]),2):ITM('plaster',0x7d7466,pick([0xe8e0d0,0xd0d8e0]));
  const band=ITM('concrete',0x6a675e,0xc8c4b8,3),trim=FLAT(0xd8d0c0);
  kBox(K,0,band,hw*2,.15,hd*2,0,.075,0);
  kWall(K,'x',hd,-hw,hw,fh,wall,[[-4,1.4,'b'],[-1.5,1.4,'w'],[1,1.6,'d'],[4,1.4,R()<.5?'b':'w']]);
  kWall(K,'x',-hd,-hw,hw,fh,wall,[[-3,1.4,'w'],[0,1.2,'d'],[3,1.4,'b']]);
  kWall(K,'z',-hw,-hd+.15,hd-.15,fh,wall,[[-2,1.4,'w'],[2,1.4,'b']]);kWall(K,'z',hw,-hd+.15,hd-.15,fh,wall,[[0,1.4,'w']]);
  // stairwell and mailboxes inside
  kBox(K,0,FLAT(0x5a524a),2.4,2.4,3,-4.4,1.2,-3.2);kSolid(K,-4.4,-2.2,1);kSolid(K,-4.4,-4,1);
  kBox(K,0,FLAT(0x6f7a80),1.4,1.2,.4,4.6,1.4,-4.6);
  kBox(K,0,FLAT(0x3a3a38),2.6,.15,1.4,1,2.7,hd+.7);
  // upper floors (hideable)
  const top=fh*floors;
  for(const [axis,fx,len,n] of [['x',hd,hw*2,4],['x',-hd,hw*2,4],['z',hw,hd*2,3],['z',-hw,hd*2,3]]){
    if(axis==='x')kBox(K,1,wall,len,top-fh,.3,0,fh+(top-fh)/2,fx);else kBox(K,1,wall,.3,top-fh,len-.3,fx,fh+(top-fh)/2,0);
    for(let f=1;f<floors;f++){const y=f*fh;
      if(axis==='x')kBox(K,1,band,len+.2,.25,.5,0,y,fx);else kBox(K,1,band,.5,.25,len+.2,fx,y,0);
      for(let i=0;i<n;i++){const c=-len/2+len*(i+.5)/n,o=Math.sign(fx)*.18,gm=R()<.25?FLAT(0x6a5038):GLASS;
        if(axis==='x'){kBox(K,1,trim,1.5,1.7,.1,c,y+1.55,fx+o);kBox(K,1,gm,1.2,1.4,.12,c,y+1.55,fx+o*1.3);}
        else{kBox(K,1,trim,.1,1.7,1.5,fx+o,y+1.55,c);kBox(K,1,gm,.12,1.4,1.2,fx+o*1.3,y+1.55,c);}}}}
  kFlatRoof(K,band,hw*2,hd*2,top,.8);
  // fire escape on the +x side
  const fe=FLAT(0x2a2a2c);
  for(let f=1;f<floors;f++){const y=f*fh+.1;kBox(K,1,fe,1.2,.08,4,hw+.7,y,0);kBox(K,1,fe,.06,1,4,hw+1.3,y+.5,0);
    kBox(K,1,fe,.5,.06,2.4,hw+.7,y+fh/2,0,0,Math.atan2(fh,4)*.9,0);}
  // rooftop water tank
  kAdd(K,1,ITM('wood',0x5a4430,0xa08a70,2),CYL(1.1,1.1,2,10),-3,top+1.9,-2);kAdd(K,1,FLAT(0x3a3530),new THREE.ConeGeometry(1.25,.8,10),-3,top+3.3,-2);
  for(const [a,b] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]])kBox(K,1,fe,.12,.9,.12,-3+a,top+.45,-2+b);
  return kFinish(K,hw,hd,top+.8,'apartment');
}
function bGas(x,z,rot,name){
  const K=Kit(x,z,rot),hw=7,hd=6;
  kBox(K,0,ITM('concrete',0x6a675e,0xb0aca0,3),hw*2,.06,hd*2,0,.03,0);
  // kiosk at the back
  const wall=ITM('plaster',0x8a7f6c,pick([0xf0e8dc,0xe0e8f0])),kz=-3.6;
  const sub=(axis,fixed,a0,a1,ops)=>kWall(K,axis,fixed,a0,a1,3,wall,ops,{sill:.6,top:2.4});
  sub('x',kz+2,-3,3,[[-1.6,1.8,'w'],[1,1.2,'d']]);sub('x',kz-2,-3,3,[]);sub('z',-3,kz-1.85,kz+1.85,[]);sub('z',3,kz-1.85,kz+1.85,[[0,1.2,'b']]);
  kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,3),6,4,3,.4);
  kBox(K,0,signMat(name||'GAS & GO','#c23a2e','#f6eedc'),4.6,.9,.2,0,3.5,kz+2.15);
  kBox(K,0,FLAT(0x4a3a2c),2.4,1,.7,1.2,.5,kz-.9);kSolid(K,.6,kz-.9,.5);kSolid(K,1.8,kz-.9,.5);
  // canopy + pumps
  const cm=FLAT(0xb8b0a0),red=FLAT(0xb8322a);
  kBox(K,1,cm,9,.5,5.4,0,4.6,2.6);kBox(K,1,red,9.1,.3,5.5,0,4.3,2.6);
  for(const [px,pz] of [[-3.6,.6],[3.6,.6],[-3.6,4.6],[3.6,4.6]]){kBox(K,0,cm,.35,4.2,.35,px,2.1,pz);kSolid(K,px,pz,.35);}
  for(const px of [-1.6,1.6]){kBox(K,0,ITM('concrete',0x6a675e,0xc8c4b8,3),1,.2,3.2,px,.1,2.6);
    for(const pz of [1.6,3.6]){kBox(K,0,red,.6,1.5,.45,px,.95,pz);kBox(K,0,FLAT(0x1d1d1b),.4,.3,.47,px,1.3,pz);kSolid(K,px,pz,.45);}}
  // price sign pole
  kBox(K,0,FLAT(0x3a3a38),.25,6,.25,hw-.6,3,hd-.6);kBox(K,0,signMat('$9.99','#1d1d1b','#f2a516'),2.4,1.1,.2,hw-.6,6,hd-.6);kSolid(K,hw-.6,hd-.6,.3);
  const door=l2w(x,z,rot,.4,kz+2);addSwingDoor(door.x,door.z,-rot,1.2);
  if(RNG()<.45){const s=RNG()<.5?-1:1,p=l2w(x,z,rot,s*3.05,2.6);addCar(p.x,p.z,rot+(RNG()<.5?0:Math.PI)+rand(-.05,.05),RNG()<.3?'pickup':null);}
  return kFinish(K,hw,hd,5,'gas');
}
function bChurch(x,z,rot){
  const K=Kit(x,z,rot),hw=5,hd=7.5,h=4.5,R=RNG;
  const wall=R()<.5?CTM('siding',0xf2ede0,2):CTM('brick',0xd8c8b8,2);
  kBox(K,0,ITM('wood',0x5b4a39,0xa89880,3),hw*2,.15,hd*2,0,.075,0);
  kWall(K,'x',hd,-hw,hw,h,wall,[[0,2,'d']]);
  kWall(K,'x',-hd,-hw,hw,h,wall,[]);
  for(const sx of [-hw,hw])kWall(K,'z',sx,-hd+.15,hd-.15,h,wall,[[-4.5,1.1,'s'],[-1.5,1.1,'s'],[1.5,1.1,R()<.3?'b':'s'],[4.5,1.1,'s']],{sill:1.3,top:3.8});
  for(let i=0;i<5;i++){const pz=-4.8+i*2;for(const px of [-2.4,2.4]){kBox(K,0,FLAT(0x5a4430),3,.9,.5,px,.45,pz);kSolid(K,px-1,pz,.4);kSolid(K,px+1,pz,.4);}}
  kBox(K,0,FLAT(0x6a5a48),3,1.1,1,0,.55,-6.2);kSolid(K,-1,-6.2,.6);kSolid(K,1,-6.2,.6);
  kGable(K,CTM('shingle',0x9a8a80,2),wall,hw*2,hd*2,h,3.2,true,.5);
  // steeple over the entrance
  kBox(K,1,wall,2.6,5,2.6,0,h+2.5,hd-1.6);kBox(K,1,FLAT(0x2a2a2c),1.2,1.6,2.7,0,h+3.6,hd-1.6);kBox(K,1,FLAT(0x2a2a2c),2.7,1.6,1.2,0,h+3.6,hd-1.6);
  kAdd(K,1,CTM('shingle',0x7a6a60,2),new THREE.ConeGeometry(2,4.5,4),0,h+7.25,hd-1.6,Math.PI/4);
  kBox(K,1,FLAT(0xd9c27a),.18,1.4,.18,0,h+10.1,hd-1.6);kBox(K,1,FLAT(0xd9c27a),.8,.18,.18,0,h+10.3,hd-1.6);
  kBox(K,1,STAINED,1.3,1.3,.1,0,h+1.25,hd+.17,0,0,Math.PI/4);kBox(K,1,FLAT(0xf0e8d8),1.6,1.6,.06,0,h+1.25,hd+.12,0,0,Math.PI/4);
  const step=ITM('concrete',0x6a675e,0xc0bcb0,2);kBox(K,0,step,3.2,.18,1.1,0,.09,hd+.55);kBox(K,0,step,2.6,.18,.6,0,.27,hd+.3);
  {const st=FLAT(0x8a8a84);for(const gz of [-hd-1.6,-hd-3.1])for(const gx of [-3,-1,1,3]){if(RNG()<.2)continue;const t=rand(-.15,.15);kBox(K,0,st,.6,.75,.14,gx+rand(-.2,.2),.37,gz,t,0,rand(-.08,.08));kSolid(K,gx,gz,.35,null,.75);}
    const ir=FLAT(0x2a2a2c);for(const s of [-1,1])kBox(K,0,ir,.05,.7,4.2,s*4.4,.35,-hd-2.4);kBox(K,0,ir,8.8,.05,.05,0,.65,-hd-4.5);}
  const d=l2w(x,z,rot,-1,hd);addSwingDoor(d.x,d.z,-rot,2);
  return kFinish(K,hw,hd,h+10,'church');
}
function bGarage(x,z,rot){
  const K=Kit(x,z,rot),hw=7,hd=5,h=4.2;
  const wall=CTM('metalwall',pick([0xffffff,0xd8e0e8,0xe8d8c8]),2);
  kBox(K,0,ITM('concrete',0x6a675e,0xa8a498,3),hw*2,.12,hd*2,0,.06,0);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-3.4,3.6,'g'],[3.4,3.6,'g']],{gTop:3.4});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[4.6,1.2,'d']]);
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[[0,1.6,'w']]);kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[]);
  const roll=FLAT(0x8a8f8c);
  kBox(K,0,roll,3.6,1.2,.12,-3.4,2.8,hd-.05); // half-open bay
  kBox(K,0,roll,3.6,3.4,.12,3.4,1.7,hd-.05);for(let i=0;i<5;i++)kSolid(K,3.4-1.6+i*.8,hd,.5); // closed bay
  kBox(K,0,signMat(pick(['AUTO REPAIR','TIRES','BODY SHOP']),'#e9c46a','#1d1d1b'),6,1,.2,0,h-.5,hd+.2);
  kBox(K,0,FLAT(0x5a4a3a),3,1,.8,0,.5,-hd+.8);kSolid(K,-1,-hd+.8,.5);kSolid(K,1,-hd+.8,.5);
  kGable(K,CTM('metalwall',0xb8bcb8,2),wall,hw*2,hd*2,h,.9,false,.4);
  const d=l2w(x,z,rot,4,-hd);addSwingDoor(d.x,d.z,-rot,1.2);
  if(RNG()<.7){const p=l2w(x,z,rot,-3.4,-.5);addCar(p.x,p.z,rot+rand(-.15,.15));}
  for(let i=randi(1,3);i>0;i--){const p=l2w(x,z,rot,rand(1.5,6),rand(-4,-1));addProp('tire',p.x,p.z);}
  if(RNG()<.6){const p=l2w(x,z,rot,6,-3.8);addBarrel(p.x,p.z);}
  return kFinish(K,hw,hd,h+1,'garage');
}
/* ----- rural ----- */
function bBarn(x,z,rot){
  const K=Kit(x,z,rot),hw=6,hd=8,h=4,R=RNG;
  const red=CTM('siding',pick([0xc0473a,0xa8382c,0x8a4a3a,0xb85a3a]),2),wt=FLAT(0xf0e8d8);
  kBox(K,0,ITM('wood',0x5b4a39,0x8a7a62,3),hw*2,.12,hd*2,0,.06,0);
  kWall(K,'x',hd,-hw,hw,h,red,[[0,4.4,'g']],{gTop:3.6,noRoll:true});
  kWall(K,'x',-hd,-hw,hw,h,red,[[0,1.4,'d']]);
  for(const sx of [-hw,hw])kWall(K,'z',sx,-hd+.15,hd-.15,h,red,[[-4,1,'w'],[0,1,R()<.5?'b':'w'],[4,1,'w']],{sill:2,top:3.1,trim:wt});
  for(const [cx,cz] of [[-hw,hd],[hw,hd],[-hw,-hd],[hw,-hd]])kBox(K,0,wt,.4,h,.4,cx,h/2,cz);
  // big sliding door pushed open beside the opening, white X brace
  kBox(K,0,red,2.3,3.5,.15,-3.4,1.75,hd+.25);kBox(K,0,wt,2.9,.2,.18,-3.4,1.75,hd+.3,0,0,.95);kBox(K,0,wt,2.9,.2,.18,-3.4,1.75,hd+.3,0,0,-.95);
  kBox(K,0,wt,4.8,.25,.2,0,3.75,hd+.1);
  // hay bales and stalls
  const hay=CTM('hay',0xffffff,1.5);
  for(let i=0;i<randi(3,6);i++){const bx=rand(1.5,4.5),bz=rand(-6.5,2),stack=R()<.4;kBox(K,0,hay,1.3,.75,.85,bx,.375,bz,R()*.4);if(stack)kBox(K,0,hay,1.3,.75,.85,bx,1.125,bz,R()*.4);kSolid(K,bx,bz,.75);}
  const fence=FLAT(0x5a4430);for(let i=0;i<3;i++){const sz=-5.5+i*3;kBox(K,0,fence,3,.15,.15,-4.4,1.1,sz+1.5);kBox(K,0,fence,3,.15,.15,-4.4,.6,sz+1.5);kSolid(K,-3.2,sz+1.5,.3);}
  // gambrel roof, ridge along z
  const rm=CTM('metalwall',pick([0x8a6a60,0x7a7a78,0x9a5a48]),2.5),len=hd*2+.8,ey=h,kx=4.1,ky=h+2.3,ry=h+3.4;
  const slab=(x0,y0,x1,y1)=>{const l=Math.hypot(x1-x0,y1-y0)+.25,a=Math.atan2(y1-y0,x1-x0);kBox(K,1,rm,l,.2,len,(x0+x1)/2,(y0+y1)/2+.1,0,0,0,a);};
  for(const s of [-1,1]){slab(s*(hw+.4),ey-.2,s*kx,ky);slab(s*kx,ky,0,ry);}
  const sh=new THREE.Shape();sh.moveTo(-hw,0);sh.lineTo(hw,0);sh.lineTo(kx,ky-ey);sh.lineTo(0,ry-ey);sh.lineTo(-kx,ky-ey);sh.closePath();
  const pent=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false});kAdd(K,1,red,pent,0,ey,hd-.3);kAdd(K,1,red,pent,0,ey,-hd);pent.dispose();
  kBox(K,1,wt,2,1.6,.1,0,ey+1.5,hd+.05);kBox(K,1,FLAT(0x2a1f18),1.6,1.2,.12,0,ey+1.5,hd+.08);
  kBox(K,1,wt,.26,.26,1.8,0,ry-.35,hd+.6);kBox(K,1,FLAT(0x2a2a2c),.06,.5,.06,0,ry-.65,hd+1.4);
  kBox(K,1,red,1.5,1.2,1.5,0,ry+.55,0);for(const s of [-1,1]){kBox(K,1,FLAT(0x2a1f18),1,.7,.08,0,ry+.55,s*.77);kBox(K,1,wt,1.56,.1,.1,0,ry+.95,s*.77);}
  kAdd(K,1,rm,new THREE.ConeGeometry(1.25,1,4),0,ry+1.65,0,Math.PI/4);
  kBox(K,1,FLAT(0x2a2a2c),.06,1,.06,0,ry+2.6,0);kBox(K,1,FLAT(0x2a2a2c),.9,.06,.06,0,ry+2.9,0);kBox(K,1,FLAT(0x2a2a2c),.5,.3,.04,.32,ry+3.05,0);
  return kFinish(K,hw,hd,ry+3,'barn');
}
function bFarmhouse(x,z,rot){
  const K=Kit(x,z,rot),hw=5,hd=4.5,h=3,R=RNG;
  const wall=CTM('siding',pick([0xf2ede0,0xe8e0b8,0xc8d8e0,0xd8e0c8]),2),wood=ITM('wood',0x5b4a39,0xa89880,3),wt=FLAT(0xf0e8d8);
  kBox(K,0,wood,hw*2,.2,hd*2,0,.1,0);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-3,1.4,R()<.4?'b':'w'],[0,1.5,'d'],[3,1.4,'w']],{trim:wt});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[-3,1.2,'d'],[2,1.4,'w']],{trim:wt});
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[[-1.5,1.3,'w'],[1.8,1.3,'b']],{trim:wt});kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[[0,1.3,'w']],{trim:wt});
  // interior wall with a doorway, table, sofa, stove
  kWall(K,'z',.5,-hd+.15,-.6,h,ITM('plaster',0x8a7f6c,0xe8dcc8),[[-2.4,1.2,'d']]);
  kBox(K,0,FLAT(0x5a4430),1.6,.8,1,2.6,.4,1.6);kSolid(K,2.2,1.6,.6);kSolid(K,3,1.6,.6);
  kBox(K,0,FLAT(pick([0x6a3a30,0x3a5a4a,0x5a5a7a])),2.4,.9,.9,-2.6,.45,2.8);kSolid(K,-3.3,2.8,.5);kSolid(K,-1.9,2.8,.5);
  kBox(K,0,FLAT(0x2a2a2c),1,1,.8,3.6,.5,-3.4);kSolid(K,3.6,-3.4,.6);
  // porch
  kBox(K,0,wood,hw*2,.25,2.2,0,.12,hd+1.1);
  for(const px of [-4.7,-1.2,1.2,4.7]){kBox(K,0,wt,.2,2.6,.2,px,1.3,hd+2.05);kSolid(K,px,hd+2.05,.25);}
  kBox(K,0,wt,3.3,.12,.1,-2.95,.9,hd+2.05);kBox(K,0,wt,3.3,.12,.1,2.95,.9,hd+2.05);
  kBox(K,1,CTM('metalwall',0x9a9a98,2.5),hw*2+.4,.15,2.6,0,2.75,hd+1.25,0,.18,0);
  kGable(K,CTM('shingle',pick([0x8a7f78,0x6a5048,0x5a6670]),2),wall,hw*2,hd*2,h,2.4,false,.5);
  kBox(K,1,CTM('brick',0xd0c0b0,2),.9,4.2,.9,-3,h+1.6,-1.6);
  kDoor(K,-.75,hd,1.5);kDoor(K,-3.6,-hd,1.2);
  return kFinish(K,hw,hd+2.2,h+2.6,'farmhouse');
}
function bSilo(x,z,rot){
  const K=Kit(x,z,rot),r=2.1,h=rand(8,10.5),m=CTM('metalwall',pick([0xd8dcd8,0xc8ccc0,0xb8c0c8]),3);
  kAdd(K,0,ITM('concrete',0x6a675e,0xb0aca0,3),CYL(r+.3,r+.3,.5,16),0,.25,0);
  kAdd(K,1,m,CYL(r,r,h,16),0,h/2,0);
  kAdd(K,1,FLAT(0x6a6d6a),new THREE.SphereGeometry(r,16,8,0,Math.PI*2,0,Math.PI/2),0,h,0);
  for(let y=1.5;y<h;y+=2)kAdd(K,1,FLAT(0x5a5d5a),CYL(r+.06,r+.06,.12,16),0,y,0);
  for(const s of [-.25,.25])kBox(K,1,FLAT(0x3a3a38),.06,h,.06,s,h/2,r+.15);
  for(let y=.6;y<h;y+=.45)kBox(K,1,FLAT(0x3a3a38),.55,.05,.05,0,y,r+.15);
  kSolid(K,0,0,r+.35);
  return kFinish(K,r,r,h+r,'silo',false);
}
function bWaterTower(x,z,rot){
  const K=Kit(x,z,rot),leg=FLAT(0x6a6d6a),top=8;
  for(const [a,b] of [[-2,-2],[2,-2],[-2,2],[2,2]]){kAdd(K,0,leg,CYL(.14,.2,top,6),a*.85,top/2,b*.85,0,b*.06,-a*.06);kSolid(K,a,b,.35);}
  for(const y of [2.5,5.5])for(const [w,d,px,pz] of [[3.6,.08,0,1.75],[3.6,.08,0,-1.75],[.08,3.6,1.75,0],[.08,3.6,-1.75,0]])kBox(K,0,leg,w,.08,d,px*(1-y/30),y,pz*(1-y/30));
  const tm=CTM('metalwall',pick([0xc8ccc0,0xd8c8b0,0xb8c8d0]),3);
  kAdd(K,1,tm,CYL(2.6,2.6,3.2,16),0,top+1.6,0);kAdd(K,1,FLAT(0x5a5d5a),new THREE.ConeGeometry(2.8,1.4,16),0,top+3.9,0);
  kBox(K,1,signMat(pick(['DEAD ACRE','PINE HOLLOW','MILLER CO.']),'#d8d0b8','#5a2a24'),4,.9,.1,0,top+1.8,2.62);
  return kFinish(K,2.6,2.6,top+4.6,'tower',false);
}
function bWindmill(x,z,rot){
  const K=Kit(x,z,rot),leg=FLAT(0x5a5d5a),top=9;
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){kAdd(K,0,leg,CYL(.07,.1,top,5),a*.7,top/2,b*.7,0,b*.1,-a*.1);kSolid(K,a*1.1,b*1.1,.25);}
  for(let y=1.5;y<top;y+=2){const s=1.3*(1-y/top*.6);kBox(K,0,leg,s*2,.05,.05,0,y,s);kBox(K,0,leg,s*2,.05,.05,0,y,-s);kBox(K,0,leg,.05,.05,s*2,s,y,0);kBox(K,0,leg,.05,.05,s*2,-s,y,0);}
  kBox(K,0,FLAT(0x3a3a38),.5,.5,1.2,0,top+.2,0);kBox(K,0,FLAT(0xb8322a),.05,1.2,2,0,top+.4,-1.6);
  kFinish(K,1.2,1.2,top,'windmill',false);
  // rotor: its own baked kit so it can spin
  const R2={g:new THREE.Group(),x,z,rot,b:new Map(),r:new Map(),ob:[]};
  const bl=FLAT(0xd8d0c0);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;kBox(R2,0,bl,.3,1.6,.04,Math.sin(a)*1.25,Math.cos(a)*1.25,0,0,0,-a);}
  kAdd(R2,0,FLAT(0x3a3a38),CYL(.25,.25,.3,8),0,0,0,0,Math.PI/2);
  R2.g.position.set(0,top+.4,.75);K.g.add(R2.g);kBake(R2,0);
  const s={g:R2.g,k:rand(.8,1.2)};SPIN.push(s);if(CUR)CUR.spin.push(s);
}
function bShed(x,z,rot){
  const K=Kit(x,z,rot),hw=1.6,hd=1.4,h=2.4;const w=ITM('wood',0x5a4430,pick([0xb8a080,0x9a8a70,0xa89880]),2);
  kBox(K,0,w,hw*2,.12,hd*2,0,.06,0);
  kWall(K,'x',hd,-hw,hw,h,w,[[0,1.1,'d']]);kWall(K,'x',-hd,-hw,hw,h,w,[]);kWall(K,'z',-hw,-hd+.15,hd-.15,h,w,[]);kWall(K,'z',hw,-hd+.15,hd-.15,h,w,[]);
  kGable(K,CTM('metalwall',0x9a9a98,2),w,hw*2,hd*2,h,.8,false,.3);
  return kFinish(K,hw,hd,h+1,'shed');
}
function bCabin(x,z,rot){
  const K=Kit(x,z,rot),hw=4,hd=3.4,h=2.8;const logs=CTM('logs',0xffffff,2.5),R=RNG;
  kBox(K,0,ITM('wood',0x5b4a39,0x9a8a72,3),hw*2,.25,hd*2,0,.12,0);
  kWall(K,'x',hd,-hw,hw,h,logs,[[-2,1.2,R()<.5?'b':'w'],[1,1.2,'d']],{t:.45,trim:FLAT(0x4a3a2a)});
  kWall(K,'x',-hd,-hw,hw,h,logs,[[1.5,1.2,'w']],{t:.45,trim:FLAT(0x4a3a2a)});
  kWall(K,'z',-hw,-hd+.2,hd-.2,h,logs,[[0,1.1,'b']],{t:.45});kWall(K,'z',hw,-hd+.2,hd-.2,h,logs,[],{t:.45});
  const bk=ITM('bark',0x4a3a2a,0xb0a090,1.5);
  for(const [cx,cz] of [[-hw,hd],[hw,hd],[-hw,-hd],[hw,-hd]])for(let y=.2;y<h;y+=.36)kAdd(K,0,bk,CYL(.2,.2,.9,7),cx,y,cz,0,0,Math.PI/2);
  kBox(K,0,FLAT(0x5a4430),1.8,.6,1,-2.4,.3,-2.2);kSolid(K,-2.4,-2.2,.7);
  kBox(K,0,FLAT(0x6a5a48),1.2,.8,.8,2.4,.4,-2.4);kSolid(K,2.4,-2.4,.6);
  kGable(K,ITM('wood',0x4a3a2a,0x8a7a60,2),logs,hw*2,hd*2,h,2,false,.6);
  kBox(K,1,ITM('concrete',0x5a5850,0x9a968a,2),1.1,5,1.1,hw+.3,2.5,-1);kSolid(K,hw+.3,-1,.7);
  kDoor(K,.4,hd,1.2);
  return kFinish(K,hw,hd,h+2,'cabin');
}
const URBAN=[[bStore,28],[bTownhouse,22],[addHouse,16],[bApartment,16],[bGarage,14],[bGas,8],[bChurch,5]];
const URBAN_SIZE=new Map([[bTownhouse,[4.6,4.4]],[bStore,[5,4]],[addHouse,[4,4]],[bApartment,[6,5]],[bGarage,[7,5]],[bGas,[7,6]],[bChurch,[5,7.5]]]);
function pickW(list){let t=0;for(const [,w] of list)t+=w;let r=RNG()*t;for(const [f,w] of list){r-=w;if(r<=0)return f;}return list[0][0];}
// a farmstead: farmhouse, barn, silos, windmill or water tower and a shed, laid out around a yard
function addFarmstead(cx,cz,r0,clear){
  const at=(lx,lz)=>l2w(cx,cz,r0,lx,lz);
  const tryB=(fn,lx,lz,e,rr)=>{const p=at(lx,lz);if(clear(p.x,p.z,e))return fn(p.x,p.z,r0+(rr||0)),true;return false;};
  {const r=RNG();tryB(r<.45?ruralOrFarm:r<.72?bFarmhouse2:bFarmhouse,-8,5,7.5);}
  tryB(bBarn,7,-2,9,Math.PI/2);
  tryB(bSilo,18.5,-9,3);if(RNG()<.6)tryB(bSilo,18.5,-4.2,3);
  if(RNG()<.6)tryB(bWindmill,-12,-8,2);else tryB(bWaterTower,-12,-8,3.5);
  if(RNG()<.7)tryB(bShed,-1,10,2.5,Math.PI);
  tryB(addWell,3.8,8,1.4);
  if(RNG()<.6)tryB(addHayShed,-3,-15,4.5);
  if(RNG()<.4){const p=at(7,8.6);if(!blockedSpot(p.x,p.z,2.2))addCar(p.x,p.z,r0+rand(-.2,.2),'tractor');}
  if(RNG()<.3){const p=at(-1.5,4.5);if(!blockedSpot(p.x,p.z,2.2))addCar(p.x,p.z,r0+(RNG()<.5?0:Math.PI)+rand(-.1,.1),'pickup');}
}
// a lone farm building gets its truck or tractor parked alongside, square to the building
function farmVehicles(ch){if(RNG()>.28)return;const h=ch.houses.find(h=>h.hw>3);if(!h)return;
  const side=RNG()<.5?1:-1,p=l2w(h.x,h.z,h.rot,side*(h.hw+2.6),rand(-h.hd*.4,h.hd*.4));if(blockedSpot(p.x,p.z,2.2))return;
  addCar(p.x,p.z,h.rot+(RNG()<.5?0:Math.PI)+rand(-.08,.08),h.kind==='barn'?(RNG()<.6?'tractor':'pickup'):pick(['pickup','pickup','sedan','wagon']));}

const PINE=[0x2f4a32,0x3a5236,0x2a3f2e,0x46573a];
const CONE_A=new THREE.ConeGeometry(1.6,3.2,7),CONE_B=new THREE.ConeGeometry(1.1,2.4,7),ROCK_G=new THREE.DodecahedronGeometry(1,0);
const TREE_MODEL={};
function treeBody(g,dead){
  const tm=TREE_MODEL[dead?'dead':'pine'];
  if(tm){const inst=tm.root.clone(true);g.add(inst);inst.traverse(o=>{if(o.isMesh&&o.material!==INK)ink(o,.05/tm.s);});return;}
  g.add(mki(CYL(.16,.3,dead?3.4:1.8,6),dead?TM('bark',1,2,0x4b4136,0xb0a89a):TM('bark',1,1,0x4a3a2a,0xffffff),0,dead?1.7:.9,0,.07));
  if(!dead){const c=pick(PINE);const fm=TM('pine',2,1,c,lighten(c,.62));g.add(mki(CONE_A,fm,0,2.9,0,.1));g.add(mki(CONE_B,fm,0,4.2,0,.1));}
  else{for(let b=0;b<3;b++){const br=mki(BOX(.12,1.4,.12),TM('bark',1,2,0x4b4136,0xb0a89a),0,rand(1.8,3),0,.05);br.rotation.z=rand(-.9,.9);br.rotation.y=rand(0,6.28);br.position.x=Math.sin(br.rotation.z)*-.5;g.add(br);}}
}
function addTree(x,z,s,dead){
  const ry=rand(0,6.28),ph=rand(0,6.28);
  if(CUR&&CUR.cut&&CUR.cut.has(cutKey(x,z))){CUR.ghosts.push(addOb({x,z,r:.55*s}));return;}
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);g.rotation.y=ry;
  // the tree's own look comes from a position-seeded generator, so the world's random stream never depends on it
  const rs=RNG;RNG=mulberry((Math.imul(Math.round(x*10),73856093)^Math.imul(Math.round(z*10),19349663))|0);try{treeBody(g,dead);}finally{RNG=rs;}
  track(g);const ob=addOb({x,z,r:.55*s});
  const t={g,ph,k:dead?.6:1/s,kind:dead?'dead':'pine',x,z,s,hp:dead?3:4.5,ob,ch:CUR};ob.tree=t;trees.push(t);if(CUR)CUR.trees.push(t);
}
const rocks=[];
// how far a thing of half-size hx by hz must sink so its downhill edge meets a slope (it is drawn at the height under its middle)
function slopeSink(x,z,hx,hz,max){const h0=terrainH(x,z);let lo=h0;for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]])lo=Math.min(lo,terrainH(x+a*hx,z+b*hz));return clamp(h0-lo,0,max);}
const cutKey=(x,z)=>Math.round(x*2)+','+Math.round(z*2);
function addRock(x,z,s){
  const tint=pick([0xb8b4a8,0xa8a498,0xc4bfb2]),k1=rand(.9,1.4),k2=rand(.5,.9),r1=rand(0,3),r2=rand(0,3);
  if(CUR&&CUR.cut&&CUR.cut.has(cutKey(x,z))){CUR.ghosts.push(addOb({x,z,r:1.05*s}));return;}
  const r=mki(ROCK_G,TM('concrete',1,1,0x6d6a60,tint),x,.35*s-slopeSink(x,z,.9*s*k1,.9*s,.9),z,.07);r.scale.set(s*k1,s*k2,s);r.rotation.set(r1,r2,0);
  track(r);const ob=addOb({x,z,r:1.05*s,h:.62*s});const rk={m:r,x,z,s,hp:3+s*1.5,ob,ch:CUR,sc:r.scale.clone()};ob.rock=rk;rocks.push(rk);if(CUR)CUR.rocks.push(rk);
}
const barrelM=M(0x8a2e22),bandM=new THREE.MeshStandardMaterial({color:0xf2a516,roughness:.7,emissive:0x3a2200});
function addBarrel(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(mki(CYL(.45,.45,1.1,10),barrelM,0,.55,0,.06));g.add(mk(CYL(.46,.46,.16,10),bandM,0,.7,0));track(g);
  const ob=addOb({x,z,r:.55,h:1.1});const b={x,z,g,ob,hp:25,alive:true,fuse:-1};barrels.push(b);if(CUR)CUR.barrels.push(b);
}
// model trees: once a Higgsfield tree loads, it replaces the procedural trees of that kind (loaded now and generated later)
const TREE_FILES={pine:['models/trees/pine.gltf.json',5.4],dead:['models/trees/dead.gltf.json',4.8]};
function swapTrees(kind,gltf,h){
  const root=gltf.scene;root.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(root);const s=h/((b.max.y-b.min.y)||1);const c=b.getCenter(new THREE.Vector3());
  root.traverse(o=>{if(!o.isMesh)return;const old=Array.isArray(o.material)?o.material[0]:o.material;
    o.material=new THREE.MeshToonMaterial({map:old&&old.map||null,color:old&&old.map?0xffffff:(old&&old.color?old.color.getHex():0x6b5a48),gradientMap:TOON_GRAD});
    o.castShadow=true;o.receiveShadow=true;});
  root.scale.setScalar(s);root.position.set(-c.x*s,-b.min.y*s,-c.z*s);
  TREE_MODEL[kind]={root,s};
  for(const t of trees){if(t.kind!==kind)continue;t.g.traverse(o=>{if(inkHulls.has(o))inkHulls.delete(o);});t.g.clear();treeBody(t.g,kind==='dead');}
}
if(THREE.GLTFLoader){const L=new THREE.GLTFLoader();for(const [k,[u,h]] of Object.entries(TREE_FILES))L.load(u,g=>{try{swapTrees(k,g,h);}catch(e){console.warn('Tree model '+k+' failed; keeping procedural trees.',e);}},undefined,()=>{});}

function vnoise(x,z){
  const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;
  const h=(a,b)=>{let n=(a*374761393+b*668265263+WORLD_SEED*982451653)|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
  const sm=t=>t*t*(3-2*t),u=sm(xf),v=sm(zf);return lerp(lerp(h(xi,zi),h(xi+1,zi),u),lerp(h(xi,zi+1),h(xi+1,zi+1),u),v);
}
function biomeAt(cx,cz){
  if(Math.abs(cx)<=1&&Math.abs(cz)<=1)return'farm';
  if(vnoise(cx*.5+40,cz*.5-17)>.7)return'town';
  return vnoise(cx*.3,cz*.3)<.4?'forest':'farm';
}
const BIOME_NAME={farm:'Farmland',forest:'Pine forest',town:'Abandoned town'};
/* ---------- terrain: rolling hills (steeper in forests), lakes and rivers; flat around the base, highways and towns ---------- */
const _bio=new Map();
function bioC(cx,cz){const k=cx*100003+cz;let b=_bio.get(k);if(b===undefined){b=biomeAt(cx,cz);if(_bio.size>60000)_bio.clear();_bio.set(k,b);}return b;}
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function townW(x,z){const cx=Math.floor(x/CH),cz=Math.floor(z/CH);if(bioC(cx,cz)==='town')return 1;let w=0;
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){if((!i&&!j)||bioC(cx+i,cz+j)!=='town')continue;
    const x0=(cx+i)*CH,z0=(cz+j)*CH,dx=Math.max(x0-x,0,x-(x0+CH)),dz=Math.max(z0-z,0,z-(z0+CH));w=Math.max(w,1-sstep(0,14,Math.hypot(dx,dz)));}
  return w;}
function terrainBase(x,z){
  const hw=1-sstep(6,18,Math.min(Math.abs(x),Math.abs(z))),bm=1-sstep(BR+8,BR+30,Math.max(Math.abs(x),Math.abs(z))),keep=(1-hw)*(1-bm);
  if(keep<=0)return 0;
  const amp=3+9.5*sstep(.47,.33,vnoise(x/CH*.3,z/CH*.3));
  const n=vnoise(x*.011+5.3,z*.011-2.1)*.55+vnoise(x*.027-8.4,z*.027+3.7)*.3+vnoise(x*.07+1.9,z*.07-6.6)*.15;
  // broad rolling swells under the hills, so even the farmland climbs and dips
  const roll=Math.max(0,vnoise(x*.0045-17.3,z*.0045+8.8)-.36)*11;
  let h=(n-.3)*amp*2.1+roll;if(h<0)h*=.1;
  // scattered clearings settle onto the gentle swell (level enough for cabins and farms); towns sit flat on the plain
  h=lerp(h,roll*.5,sstep(.5,.6,vnoise(x*.02+31.1,z*.02-7.7)))*(1-townW(x,z));
  const cm=sstep(36,72,Math.max(Math.abs(x),Math.abs(z))); // no water right next to the farmstead
  const lk=sstep(.21,.11,vnoise(x*.0065+51.2,z*.0065-33.7))*cm,rv=sstep(.03,.01,Math.abs(vnoise(x*.0042-71.3,z*.0042+19.9)-.5))*cm;
  return(h*(1-Math.max(lk,rv))-Math.max(lk*3.6,rv*2.6))*keep;
}
// graded lots: a building or landmark levels the ground under it to the height at its centre, with a sloped shoulder
// round it, so the building, its doors and everything inside share one height instead of the downhill side hanging in
// the air. Pads are kept for the whole run (a chunk rebuilt later finds its own pads already there).
const PADS=new Map(),PAD_IDS=new Map(),PAD_CELL=16,padK=(i,j)=>i*100003+j;
let PAD_NEW=null;
function terrainH(x,z){let h=terrainBase(x,z);const L=PADS.get(padK(Math.floor(x/PAD_CELL),Math.floor(z/PAD_CELL)));
  if(L)for(const p of L){const dx=x-p.x,dz=z-p.z,ox=Math.max(0,Math.abs(dx*p.c-dz*p.s)-p.hw),oz=Math.max(0,Math.abs(dx*p.s+dz*p.c)-p.hd);
    if(ox<p.m&&oz<p.m){const d=Math.hypot(ox,oz);if(d<p.m)h=lerp(h,p.h,1-sstep(0,p.m,d));}}
  return h;}
function addPad(x,z,rot,hw,hd,m){
  const id=x.toFixed(2)+','+z.toFixed(2);if(PAD_IDS.has(id))return PAD_IDS.get(id).h;
  const p={x,z,c:Math.cos(rot),s:Math.sin(rot),hw:hw+.4,hd:hd+.4,m:m||3.5,h:terrainH(x,z)};PAD_IDS.set(id,p);
  const R=Math.hypot(p.hw,p.hd)+p.m;
  for(let i=Math.floor((x-R)/PAD_CELL);i<=Math.floor((x+R)/PAD_CELL);i++)for(let j=Math.floor((z-R)/PAD_CELL);j<=Math.floor((z+R)/PAD_CELL);j++){const k=padK(i,j);let L=PADS.get(k);if(!L)PADS.set(k,L=[]);L.push(p);}
  (PAD_NEW||(PAD_NEW=[])).push(p);return p.h;}
// re-level the height grid (and the one being built in the background) under pads added since the last flush
function padFlush(){if(!PAD_NEW)return;const N=TERR.N,c=TERR.cell;
  const patch=(G,ox,oz,data)=>{for(const p of PAD_NEW){const R=Math.hypot(p.hw,p.hd)+p.m+c;
    const i0=Math.max(0,Math.floor((p.x-R-ox)/c)),i1=Math.min(N-1,Math.ceil((p.x+R-ox)/c)),j0=Math.max(0,Math.floor((p.z-R-oz)/c)),j1=Math.min(N-1,Math.ceil((p.z+R-oz)/c));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const h=terrainH(ox+(i+.5)*c,oz+(j+.5)*c),k=j*N+i;G[k]=h;
      if(data){const v=Math.round(clamp((h-TERR.min)/TERR.rng,0,1)*65535);data[k*4]=v>>8;data[k*4+1]=v&255;}}}};
  patch(TERR.grid,TERR.ox,TERR.oz,TERR.data);TERR.tex.needsUpdate=true;if(terrJob)patch(terrJob.grid,terrJob.ox,terrJob.oz,null);
  PAD_NEW=null;lastSnap='';}
let terrJob=null;
function terrainRows(job,n){const N=TERR.N,c=TERR.cell;for(let k=0;k<n&&job.row<N;k++,job.row++){const j=job.row,z=job.oz+(j+.5)*c;for(let i=0;i<N;i++)job.grid[j*N+i]=terrainH(job.ox+(i+.5)*c,z);}}
function terrainCommit(job){
  const N=TERR.N,d=TERR.data;TERR.grid=job.grid;TERR.ox=job.ox;TERR.oz=job.oz;
  for(let i=0;i<N*N;i++){const v=Math.round(clamp((job.grid[i]-TERR.min)/TERR.rng,0,1)*65535);d[i*4]=v>>8;d[i*4+1]=v&255;d[i*4+2]=0;d[i*4+3]=255;}
  TERR.tex.needsUpdate=true;TERR.infoU.value.set(job.ox,job.oz,N*TERR.cell,0);terrJob=null;lastSnap='';
}
function terrainRecenter(px,pz,now){
  const N=TERR.N,c=TERR.cell,job={ox:Math.round(px/c)*c-N*c/2,oz:Math.round(pz/c)*c-N*c/2,grid:new Float32Array(N*N),row:0};
  if(now){terrainRows(job,N);terrainCommit(job);}else terrJob=job;
}
// re-centre the height grid in the background (a few rows per frame) once the player wanders off
function updateTerrain(){
  waterT.value=performance.now()/1000%1000;
  if(terrJob){terrainRows(terrJob,20);if(terrJob.row>=TERR.N)terrainCommit(terrJob);return;}
  const half=TERR.N*TERR.cell/2;if(Math.abs(player.x-(TERR.ox+half))>90||Math.abs(player.z-(TERR.oz+half))>90)terrainRecenter(player.x,player.z,false);
}
function gH(x,z){
  const N=TERR.N,gx=(x-TERR.ox)/TERR.cell-.5,gz=(z-TERR.oz)/TERR.cell-.5;
  if(gx<0||gz<0||gx>N-1.001||gz>N-1.001)return terrainH(x,z);
  const i=Math.floor(gx),j=Math.floor(gz),fx=gx-i,fz=gz-j,G=TERR.grid,o=j*N+i;
  return(G[o]*(1-fx)+G[o+1]*fx)*(1-fz)+(G[o+N]*(1-fx)+G[o+N+1]*fx)*fz;
}
const depthAt=(x,z)=>WL-gH(x,z);
// level, dry ground for a building of half-size e
function lotFlat(x,z,ex,ez){let lo=1e9,hi=-1e9;for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){const h=gH(x+i*ex/2,z+j*ez/2);if(WL-h>-.35)return false;lo=Math.min(lo,h);hi=Math.max(hi,h);}return hi-lo<1.4;}
function flatOK(x,z,e){const h0=gH(x,z);for(const [a,b] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]){const h=gH(x+a*e,z+b*e);if(Math.abs(h-h0)>.3||WL-h>-.35)return false;}return true;}
terrainRecenter(0,0,true);

const streetM=new THREE.MeshStandardMaterial({color:0x34362f,roughness:1,userData:{noTerrain:true}}),streetMH=new THREE.MeshStandardMaterial({color:0x34362f,roughness:1});
const STREET_V=new THREE.PlaneGeometry(5,CH),STREET_H=new THREE.PlaneGeometry(CH,5);
onTex('asphalt',()=>{streetM.map=texRep('asphalt',1,7);streetMH.map=texRep('asphalt',7,1);for(const m of [streetM,streetMH]){m.color.setHex(0xc8c8c4);m.needsUpdate=true;}});
/* ---------- Midwest railroad towns ----------
   Laid out like the plains "T-town": the railroad and a row of grain elevators form the top bar of the T, a wide brick
   Main Street of two-story commercial blocks runs at right angles away from the depot, and a grid of residential streets
   (Foursquares, bungalows, porches, shade trees) sits past the business district, with a church, a co-op station and a
   water tower painted with the town's name. Each town is planned once in world space; every chunk builds its own share. */
const MAIN_SIGNS=['CAFE','HARDWARE','STATE BANK','DRUG STORE','TAVERN','FEED & SEED','BARBER','VARIETY','THEATRE','POST OFFICE','IMPLEMENT CO.','GROCERY','HOTEL','V.F.W.','LUMBER','BAKERY','5 & 10','DINER','TV & RADIO','INSURANCE'];
const TPLAN=new Map();
function townPlan(rep){
  if(TPLAN.has(rep.key))return TPLAN.get(rep.key);
  const [rcx,rcz]=rep.key.slice(5).split(',').map(Number);
  // centre the plan on the town chunk nearest the cluster's middle
  let best=[rcx,rcz],bd=1e9;for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){const a=Math.floor(rep.x/CH)+i,b=Math.floor(rep.z/CH)+j;if(bioC(a,b)!=='town')continue;const d=Math.hypot((a+.5)*CH-rep.x,(b+.5)*CH-rep.z);if(d<bd){bd=d;best=[a,b];}}
  const ax=hash2(rcx,rcz,21)<.5,flip=hash2(rcx,rcz,22)<.5?1:-1,C={x:(best[0]+.5)*CH,z:(best[1]+.5)*CH};
  // local (u along the tracks, v down Main Street) -> world
  const W=(u,v)=>ax?{x:C.x+u,z:C.z+v*flip}:{x:C.x+v*flip,z:C.z+u};
  const rotV=ax?(flip>0?0:Math.PI):(flip>0?Math.PI/2:-Math.PI/2); // a building with rot=rotV faces +v
  const rotU=s=>rotV+(s>0?-Math.PI/2:Math.PI/2);                  // faces toward u=0 from side s
  const rect=(u0,u1,v0,v1)=>{const a=W(u0,v0),b=W(u1,v1);return{x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),z0:Math.min(a.z,b.z),z1:Math.max(a.z,b.z)};};
  const P={name:rep.name,C,ax,flip,W,rotV,streets:[],walks:[],rails:[],items:[]};
  const it=(type,u,v,rot,e,o)=>{const p=W(u,v);P.items.push(Object.assign({type,x:p.x,z:p.z,rot,e},o||{}));};
  // the railroad and its elevators
  P.rails.push(rect(-120,120,-27.5,-24.5));
  it('elevator',14,-38,rotV,7,{name:rep.name});it('bin',27,-36,0,3.2);it('bin',35,-36,0,3.2);it('bin',27,-44,0,3.2);
  it('depot',-11,-18.5,rotV+Math.PI,5.2,{name:rep.name});
  it('tower',-27,-12,rotV,3.2,{name:rep.name});
  // Main Street: wide, with diagonal parking and brick blocks on both sides
  P.streets.push(rect(-5.5,5.5,-22,92));
  for(const s of [-1,1]){P.walks.push(rect(s>0?5.5:-7.5,s>0?7.5:-5.5,-14,22));
    for(let k=0;k<4;k++){const v=-10+k*8.2;it('block',s*14,v,rotU(s),5.6,{sign:MAIN_SIGNS[Math.floor(hash2(rcx*7+k,rcz+s*3,23)*MAIN_SIGNS.length)],two:hash2(rcx+k,rcz-s,24)<.55,tone:hash2(rcx-k,rcz+s,25)});}
    for(let k=0;k<8;k++)if(hash2(rcx+k*3,rcz+s,26)<.4)it('park',s*3.4,-8+k*3.4,rotV+s*Math.PI*.25+(s>0?0:Math.PI),1.5);}
  // cross streets and the residential grid
  for(const v of [30,72]){P.streets.push(rect(-110,110,v-3.5,v+3.5));
    for(const u of [-88,-72,-56,-40,-24,24,40,56,72,88])for(const s of [-1,1]){if(Math.abs(u)<30&&!(v===72&&s>0))continue;
      const kind=hash2(rcx+u,rcz+v+s,27);it(kind<.4?'foursquare':kind<.7?'bungalow':'porch',u,v+s*13.5,s>0?rotV+Math.PI:rotV,7.2);
      if(hash2(u,v*s,28)<.6)it('stree',u+8,v+s*5.4,0,1);}}
  it('church',-17,46,rotU(-1),8.2);it('well',9.6,24,rotV,1.5);it('coop',18,46,rotU(1),8);
  for(const v of [54,62,82,90])for(const s of [-1,1])if(hash2(v,s,29)<.7)it('stree',s*7.2,v,0,1);
  // street furniture: lamps down Main and along the cross streets, stop signs and hydrants at the corners, road paint
  const lampState=(a,b)=>{const h=hash2(a,b,30);return h<.25?1:h<.33?2:0;};
  for(const s of [-1,1])for(let v=-12;v<=88;v+=14)if(Math.abs(v-30)>6&&Math.abs(v-72)>6)it('lamp',s*6.9,v,rotU(s),.5,{state:lampState(s,v)});
  for(const v0 of [30,72]){
    for(const [i,u] of [-100,-68,-36,36,68,100].entries()){const s=i%2?1:-1;it('lamp',u,v0+s*4.9,s<0?rotV:rotV+Math.PI,.5,{state:lampState(u,v0)});}
    it('stop',7.6,v0-4.7,rotU(-1),.5);it('stop',-7.6,v0+4.7,rotU(1),.5);
    it('hydrant',6.6,v0+6.5,0,.5);it('hydrant',-6.6,v0-6.5,0,.5);}
  it('hydrant',-6.6,8,0,.5);
  P.paint=townPaint(P,W,ax);
  TPLAN.set(rep.key,P);return P;
}
const inRect=(r,x,z,m)=>x>r.x0-(m||0)&&x<r.x1+(m||0)&&z>r.z0-(m||0)&&z<r.z1+(m||0);
function onTownStreet(P,x,z,m){for(const r of P.streets)if(inRect(r,x,z,m))return true;for(const r of P.rails)if(inRect(r,x,z,(m||0)+1))return true;return false;}
function townFits(x,z,e){
  if(Math.abs(x)<e+6||Math.abs(z)<e+6)return false; // clear of the highways
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1],[0,0]])if(bioC(Math.floor((x+a*e)/CH),Math.floor((z+b*e)/CH))!=='town')return false;
  return true;
}
function genTown(ch){
  const P=townPlan(townRep(ch.cx,ch.cz)),x0=ch.cx*CH,z0=ch.cz*CH,x1=x0+CH,z1=z0+CH;
  // ground: asphalt, sidewalks, ballast, rails and ties, parking stripes — clipped to this chunk and merged into one kit
  const K=Kit(x0,z0,0),asph=ITM('asphalt',0x34362f,0xc8c8c4,6),walk=ITM('concrete',0x6a675e,0xc0bcb0,3),stripe=FLAT(0xe8e2d0,true),ballast=ITM('concrete',0x5a564e,0x8a867a,2),
    tie=FLAT(0x4a3a2a),steel=FLAT(0x6a6866);let any=false;
  const clip=r=>{const a=Math.max(r.x0,x0),b=Math.min(r.x1,x1),c=Math.max(r.z0,z0),d=Math.min(r.z1,z1);return a<b-.05&&c<d-.05?{a,b,c,d}:null;};
  const road=(x,z)=>Math.abs(x)<5||Math.abs(z)<5;
  for(const r of P.streets){const q=clip(r);if(!q)continue;any=true;kBox(K,0,asph,q.b-q.a,.05,q.d-q.c,(q.a+q.b)/2-x0,.025,(q.c+q.d)/2-z0);}
  for(const r of P.walks){const q=clip(r);if(!q)continue;any=true;kBox(K,0,walk,q.b-q.a,.14,q.d-q.c,(q.a+q.b)/2-x0,.07,(q.c+q.d)/2-z0);}
  for(const r of P.rails){const q=clip(r);if(!q)continue;any=true;const alongX=(r.x1-r.x0)>(r.z1-r.z0),cx=(q.a+q.b)/2-x0,cz=(q.c+q.d)/2-z0,len=alongX?q.b-q.a:q.d-q.c;
    kBox(K,0,ballast,q.b-q.a,.12,q.d-q.c,cx,.06,cz);
    for(const o of [-.72,.72]){if(alongX)kBox(K,0,steel,len,.14,.1,cx,.25,cz+o);else kBox(K,0,steel,.1,.14,len,cx+o,.25,cz);}
    for(let t=.45;t<len;t+=.9){if(alongX)kBox(K,0,tie,.24,.1,2.4,q.a+t-x0,.15,cz);else kBox(K,0,tie,2.4,.1,.24,cx,.15,q.c+t-z0);}}
  // road paint: centre lines, crosswalks, stop bars
  {const yl=FLAT(0xc8a838,true);for(const p of P.paint)if(p.x>=x0&&p.x<x1&&p.z>=z0&&p.z<z1){kBox(K,0,p.col==='y'?yl:stripe,p.w,.012,p.d,p.x-x0,.057,p.z-z0);any=true;}}
  // diagonal parking lines along Main
  for(const p of P.items)if(p.type==='park'&&p.x>=x0&&p.x<x1&&p.z>=z0&&p.z<z1){kBox(K,0,stripe,.12,.02,4.2,p.x-x0+Math.sin(p.rot)*0,.06,p.z-z0,p.rot+Math.PI/4);any=true;}
  if(any)kFinish(K,0,0,0,'street',false);else scene.remove(K.g);
  // buildings and props whose anchor falls in this chunk
  for(const p of P.items){if(p.x<x0||p.x>=x1||p.z<z0||p.z>=z1)continue;if(!townFits(p.x,p.z,p.e))continue;if(blockedSpot(p.x,p.z,Math.min(p.e*.5,2.5))&&p.type!=='park'&&p.type!=='stree')continue;
    switch(p.type){
      case 'elevator':bElevator(p.x,p.z,p.rot,p.name);break;
      case 'bin':bBin(p.x,p.z);break;
      case 'depot':bDepot(p.x,p.z,p.rot,p.name);break;
      case 'tower':bTownTower(p.x,p.z,p.rot,p.name);break;
      case 'block':bMainBlock(p.x,p.z,p.rot,p);break;
      case 'foursquare':{const r=RNG();if(!(r<.3&&addSuburb(p.x,p.z,p.rot)))bTownhouse(p.x,p.z,p.rot);break;}
      case 'bungalow':{const r=RNG();if(!(r<.4&&addSuburb(p.x,p.z,p.rot))&&!(r<.7&&addRural(p.x,p.z,p.rot,randi(2,5))))addHouse(p.x,p.z,p.rot);break;}
      case 'porch':bFarmhouse2(p.x,p.z,p.rot);break;
      case 'church':bChurch(p.x,p.z,p.rot);break;
      case 'well':addWell(p.x,p.z,p.rot);break;
      case 'coop':bGas(p.x,p.z,p.rot,'CO-OP');break;
      case 'park':if(RNG()<.45)addCar(p.x,p.z,p.rot+rand(-.12,.12),RNG()<.45?'pickup':null);break;
      case 'stree':addTree(p.x,p.z,rand(.95,1.35),RNG()<.2);break;
      case 'lamp':bLamp(p.x,p.z,p.rot,p.state);break;
      case 'stop':bStopSign(p.x,p.z,p.rot);break;
      case 'hydrant':bHydrant(p.x,p.z);break;}}
  // the leftovers of a quarantine: barrels, litter and wrecks, kept off the streets
  const spot=(r,m)=>{for(let i=0;i<30;i++){const x=x0+rand(m,CH-m),z=z0+rand(m,CH-m);if(road(x,z)||onTownStreet(P,x,z,.5))continue;if(!blockedSpot(x,z,r))return{x,z};}return null;};
  for(let i=randi(1,3);i>0;i--){const p=spot(.8,3);if(p)addBarrel(p.x,p.z);}
  for(let i=5;i>0;i--){const p=spot(.6,3);if(p)addProp(pick(['crate','carton','carton','tire','cone','can']),p.x,p.z);}
  townCurbCars(P,x0,z0,x1,z1);
}
// a two-story brick commercial block: storefront glass, recessed door, sign band, cornice and a false-front parapet
function bMainBlock(x,z,rot,o){
  const K=Kit(x,z,rot),hw=4,hd=5.6,h=4.2,two=o.two,R=RNG;
  const wall=o.tone<.62?CTM('brick',pick([0xffffff,0xe8c8a0,0xd8b090,0xc8a8a0]),2):ITM('plaster',0x8a7f6c,pick([0xf0e0c8,0xd8e0d0,0xe8d0c0,0xe0e8f0]));
  const tr=FLAT(pick([0x2f4a3a,0x5a2a24,0x2a3a52,0x3a3530,0x6a4a2a]));
  kBox(K,0,ITM('wood',0x5b4a39,0xa89880,3),hw*2,.15,hd*2,0,.075,0);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-2.2,2.6,R()<.25?'b':'w'],[.6,1.4,'d'],[2.8,1.5,R()<.25?'b':'w']],{sill:.45,top:3,trim:tr});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[pick([-2.4,2.4]),1.2,'d']]);
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[]);kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[]);
  // sign band, kick plates and transom
  kBox(K,0,signMat(o.sign,pick(['#e9c46a','#d8d0b8','#c8e0d0','#f0a060','#1d2a3a']),'#2a1a10'),6.6,.85,.14,0,3.55,hd+.2);
  kBox(K,0,tr,hw*2,.2,.3,0,3.05,hd+.1);
  if(R()<.55)kBox(K,0,CTM('awning',pick([0xc23a2e,0x2e6a8a,0x3f7a3a,0xd09a2a]),2),hw*2-.4,.1,1.6,0,2.95,hd+.8,0,-.35);
  const top=two?h+3.3:h+1.5;
  if(two){kBox(K,1,wall,hw*2,3.3,hd*2,0,h+1.65,0);
    for(const wx of [-2.6,0,2.6]){kBox(K,1,GLASS,1.1,1.8,.08,wx,h+1.6,hd+.02);kBox(K,1,tr,1.4,.18,.24,wx,h+2.6,hd+.08);kBox(K,1,tr,1.3,.12,.22,wx,h+.66,hd+.08);}
    kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,3),hw*2,hd*2,h+3.3,.3);}
  else kFlatRoof(K,ITM('concrete',0x5a5850,0x9a968a,3),hw*2,hd*2,h,.3);
  // false front parapet with a pressed-metal cornice
  kBox(K,1,wall,hw*2+.1,1.3,.3,0,top+.45,hd-.1);kBox(K,1,FLAT(0xd8d0bc),hw*2+.5,.3,.6,0,top+1.15,hd);
  for(let i=-3;i<=3;i++)kBox(K,1,FLAT(0xd8d0bc),.25,.25,.3,i*1.15,top+.85,hd+.12);
  if(R()<.5)kBox(K,1,signMat(String(1888+Math.floor(R()*40)),'#d8d0bc','#5a2a24'),1.6,.5,.06,0,top+.5,hd+.08);
  // inside: counter and shelving
  kBox(K,0,FLAT(0x6a5a48),.6,1.7,5,-2.8,.85,-1.2);for(const lz of [-3,-1.2,.6])kSolid(K,-2.8,lz,.5);
  kBox(K,0,FLAT(0x4a3a2c),.8,1,3.4,2.4,.5,-1.6);for(const lz of [-2.8,-1.6,-.4])kSolid(K,2.4,lz,.5);
  const door=l2w(x,z,rot,-.1,hd);addSwingDoor(door.x,door.z,-rot,1.4);
  return kFinish(K,hw,hd,top+1.3,'store');
}
// concrete grain elevator: four tall bins, a headhouse with the town name, a tin annex and a loading spout over the tracks
function bElevator(x,z,rot,name){
  const K=Kit(x,z,rot),cm=ITM('concrete',0x8a867a,0xd8d4c8,4),H=24,r=2.6,dark=FLAT(0x4a4a46);
  kBox(K,0,ITM('concrete',0x6a675e,0xb0aca0,3),11.6,.5,11.6,0,.25,0);
  for(const [a,b] of [[-r,-r],[r,-r],[-r,r],[r,r]]){kAdd(K,1,cm,CYL(r,r,H,18),a,H/2,b);kSolid(K,a,b,r+.2);}
  kBox(K,1,cm,6,6.5,6,0,H+3.25,0);kBox(K,1,cm,2.4,4,2.4,0,H+8.5,0);kBox(K,1,dark,6.4,.3,6.4,0,H+6.6,0);
  kBox(K,1,signMat(name.toUpperCase(),'#d8d4c8','#2a3a6a'),5.6,1.6,.1,0,H+3.6,3.06);
  for(const s of [-1,1])kBox(K,1,FLAT(0x8a8678),.12,H+8,.12,s*.35,(H+8)/2,r*2+.2);
  for(let y=.8;y<H+6;y+=.5)kBox(K,1,FLAT(0x8a8678),.7,.06,.06,0,y,r*2+.2);
  kAdd(K,1,dark,CYL(.22,.22,9,8),0,H-1,r*2+3.2,0,-.72,0);
  // tin annex
  const tin=CTM('metalwall',pick([0xc8ccc0,0xb8c0c8]),3);kBox(K,0,tin,7,5.5,6,-9,2.75,0);kGable(K,FLAT(0x6a6d6a),tin,7,6,5.5,1.6,false,.3);
  kSolid(K,-9,-1.6,2.2);kSolid(K,-9,1.6,2.2);kSolid(K,-11,0,1.8);kSolid(K,-7,0,1.8);
  return kFinish(K,12,6,H+11,'elevator',false);
}
function bBin(x,z){
  const K=Kit(x,z,0),r=3,h=rand(5.5,7.5),m=CTM('metalwall',pick([0xd8dcd8,0xc8ccc0,0xb8c0c8]),2);
  kAdd(K,0,ITM('concrete',0x6a675e,0xb0aca0,3),CYL(r+.3,r+.3,.3,18),0,.15,0);kAdd(K,1,m,CYL(r,r,h,18),0,h/2,0);
  kAdd(K,1,FLAT(0x8a8d8a),new THREE.ConeGeometry(r+.2,1.8,18),0,h+.9,0);kAdd(K,1,FLAT(0x5a5d5a),CYL(.4,.4,.5,8),0,h+1.9,0);
  for(let y=1;y<h;y+=1.2)kAdd(K,1,FLAT(0x6a6d6a),CYL(r+.05,r+.05,.1,18),0,y,0);
  kSolid(K,0,0,r+.3);return kFinish(K,r,r,h+2.2,'bin',false);
}
// wooden depot with deep bracketed eaves, a platform on the track side and the town's name on the gable ends
function bDepot(x,z,rot,name){
  const K=Kit(x,z,rot),hw=5,hd=3,h=3.4,wall=CTM('siding',pick([0xe8d8a8,0xd8c0a0,0xc8b890]),2),tr=FLAT(0x5a3a24);
  kBox(K,0,ITM('wood',0x5b4a39,0xa89880,3),hw*2,.15,hd*2,0,.075,0);kBox(K,0,ITM('concrete',0x6a675e,0xb8b4a8,3),hw*2+4,.2,3,0,.1,hd+1.6);
  kWall(K,'x',hd,-hw,hw,h,wall,[[-2.8,1.2,'w'],[0,1.4,'d'],[2.8,1.2,'w']],{sill:.9,top:2.3,trim:tr});
  kWall(K,'x',-hd,-hw,hw,h,wall,[[-2,1.2,'w'],[2,1.2,'b']],{sill:.9,top:2.3,trim:tr});
  kWall(K,'z',-hw,-hd+.15,hd-.15,h,wall,[[0,1.1,'w']],{trim:tr});kWall(K,'z',hw,-hd+.15,hd-.15,h,wall,[[0,1.4,'d']]);
  kGable(K,CTM('shingle',pick([0x6a5048,0x5a6670,0x7a4a3a]),2),wall,hw*2,hd*2,h,1.8,false,1.6);
  for(const s of [-1,1])kBox(K,1,signMat(name.toUpperCase(),'#e8e0c8','#2a1a10'),3.6,.7,.08,s*(hw+.05),h+.7,0,Math.PI/2);
  kBox(K,0,FLAT(0x5a4430),3.6,.5,.6,0,.25,-1.8);kSolid(K,-1.2,-1.8,.45);kSolid(K,1.2,-1.8,.45);
  const d=l2w(x,z,rot,-.7,hd);addSwingDoor(d.x,d.z,-rot,1.4);
  return kFinish(K,hw,hd,h+1.8,'depot');
}
// the riveted steel water tower with the town's name painted round the tank
const TOWERM={};
function towerBand(name){if(TOWERM[name])return TOWERM[name];const c=document.createElement('canvas');c.width=1024;c.height=128;const t=new THREE.CanvasTexture(c);t.anisotropy=4;
  const draw=()=>{const g=c.getContext('2d');g.fillStyle='#d8d4c8';g.fillRect(0,0,1024,128);g.fillStyle='#2a3a6a';g.font='bold 78px "Stardos Stencil", Impact, sans-serif';g.textAlign='center';g.textBaseline='middle';
    for(const x of [256,768])g.fillText(name.toUpperCase(),x,70);g.fillStyle='rgba(90,60,30,.3)';for(let i=0;i<40;i++){g.fillRect(Math.random()*1024,Math.random()*128,2,Math.random()*40);}t.needsUpdate=true;};
  draw();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(draw);
  const m=new THREE.MeshToonMaterial({map:t,gradientMap:TOON_GRAD});m.userData.sign=1;m.userData.noInk=true;return TOWERM[name]=m;}
function bTownTower(x,z,rot,name){
  const K=Kit(x,z,rot),leg=FLAT(0x8a9090),top=15,R=3.6;
  for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){kAdd(K,0,leg,CYL(.16,.22,top,6),a*2.1,top/2,b*2.1,0,b*.05,-a*.05);kSolid(K,a*2.3,b*2.3,.35);}
  for(const y of [4,9])for(const [w,d,px,pz] of [[4.4,.08,0,2],[4.4,.08,0,-2],[.08,4.4,2,0],[.08,4.4,-2,0]])kBox(K,0,leg,w,.1,d,px,y,pz);
  kAdd(K,0,leg,CYL(.5,.5,top,8),0,top/2,0);
  const tank=CTM('metalwall',0xe0e4e0,4);kAdd(K,1,tank,new THREE.SphereGeometry(R,20,12),0,top+R*.85,0);
  kAdd(K,1,towerBand(name),new THREE.CylinderGeometry(R+.03,R+.03,1.6,24,1,true),0,top+R*.85,0);
  kAdd(K,1,FLAT(0x6a6d6a),new THREE.ConeGeometry(1.4,1.2,12),0,top+R*1.75+.4,0);
  kAdd(K,1,FLAT(0x6a6d6a),new THREE.TorusGeometry(R*.95,.08,4,24),0,top+R*.15,0,0,Math.PI/2);
  return kFinish(K,R,R,top+R*2,'tower',false);
}

function genChunk(cx,cz){
  const key=cx+','+cz;if(chunks.has(key))return;
  const ch={cx,cz,key,biome:biomeAt(cx,cz),objs:[],obs:[],inks:[],houses:[],lvlb:[],ghosts:[],cars:[],trees:[],rocks:[],barrels:[],props:[],doors:[],builds:[],spin:[],geos:[]};
  {const m0=chunkMem.get(key);ch.cut=m0&&m0.cut;ch.wb=m0&&m0.wb;}
  chunks.set(key,ch);CUR=ch;RNG=mulberry((Math.imul(WORLD_SEED,1000003)^Math.imul(cx,73856093)^Math.imul(cz,19349663))|0);
  const x0=cx*CH,z0=cz*CH,road=(x,z)=>Math.abs(x)<5||Math.abs(z)<5;
  const spot=(r,m,roadOK)=>{for(let i=0;i<40;i++){const x=x0+rand(m,CH-m),z=z0+rand(m,CH-m);if(!roadOK&&road(x,z))continue;if(!blockedSpot(x,z,r))return{x,z};}return null;};
  const kinds=['crate','carton','carton','tire','cone','cone','can'];
  // room for a building of half-size e: off the highways, away from the base, not on top of anything
  const clear=(x,z,e)=>!(Math.abs(x)<4.5+e||Math.abs(z)<4.5+e)&&Math.max(Math.abs(x),Math.abs(z))>BR+9+e&&!blockedSpot(x,z,e*.85)&&flatOK(x,z,e);
  try{
    const b=ch.biome,lm=lmAt(cx,cz);
    if(lm){buildLandmark(lm);
      for(let i=randi(4,9);i>0;i--){const p=spot(1.2,2);if(p&&Math.hypot(p.x-lm.x,p.z-lm.z)>11)addTree(p.x,p.z,rand(.85,1.4),RNG()<.3);}
      for(let i=randi(1,3);i>0;i--){const p=spot(1.6,2);if(p&&Math.hypot(p.x-lm.x,p.z-lm.z)>11)addRock(p.x,p.z,rand(.6,1.3));}
    }else if(b==='town'){genTown(ch);
    }else if(b==='forest'){
      if(RNG()<.22){const p=spot(5.5,8);if(p&&clear(p.x,p.z,5))bCabin(p.x,p.z,randi(0,3)*Math.PI/2);}
      else if(RNG()<.12){const p=spot(2.5,6);if(p&&clear(p.x,p.z,2))bShed(p.x,p.z,rand(0,6.28));}
      for(let i=randi(20,28);i>0;i--){const p=spot(1.2,1.5);if(p)addTree(p.x,p.z,rand(.85,1.5),RNG()<.22);}
      for(let i=randi(3,6);i>0;i--){const p=spot(1.6,2);if(p)addRock(p.x,p.z,rand(.6,1.5));}
      for(let i=randi(1,3);i>0;i--){const p=spot(.6,2);if(p)addHerb(p.x,p.z);}
      if(RNG()<.5){const p=spot(.8,3,true);if(p)addBarrel(p.x,p.z);}
      if(RNG()<.6){const p=spot(.6,3,true);if(p)addProp(pick(['crate','tire','can']),p.x,p.z);}
    }else{
      // now and then a grocery store or a supercenter sits out by the highway, facing the road across its parking lot
      let big=false;
      {const hx=(cz===0||cz===-1)&&!(cx===0||cx===-1),hz=(cx===0||cx===-1)&&!(cz===0||cz===-1);
        if((hx||hz)&&Math.hypot(x0+CH/2,z0+CH/2)>140&&RNG()<.3){const sup=RNG()<.45,s=hx?(cz===0?1:-1):(cx===0?1:-1),dep=sup?35:22,rot=hx?(s>0?Math.PI:0):(s>0?-Math.PI/2:Math.PI/2),e=sup?15:9;
          for(const off of [0,-3,3]){const al=(hx?x0:z0)+CH/2+off,bx=hx?al:s*dep,bz=hx?s*dep:al;
            if(lotFlat(bx,bz,hx?e+5:e+3,hx?e+3:e+5)&&!blockedSpot(bx,bz,e*.5)){(sup?bSupercenter:bGrocery)(bx,bz,rot);big=true;break;}}}}
      const fr=big?1:RNG(),r0=randi(0,3)*Math.PI/2;
      if(fr<.35){const p=spot(10,18);if(p)addFarmstead(p.x,p.z,r0,clear);}
      else if(fr<.7){const f=pickW([[bFarmhouse,14],[bFarmhouse2,14],[ruralOrFarm,22],[addHouse,8],[subOrHouse,12],[bBarn,20],[addHayShed,7],[bSilo,10],[bWindmill,10],[bWaterTower,6],[bShed,4],[addWell,7]]);
        const e=f===bBarn?8:f===ruralOrFarm?7.5:f===addHayShed?4.5:f===bFarmhouse||f===bFarmhouse2||f===subOrHouse?6.7:f===addHouse?5:f===addWell?1.4:3.5,p=spot(e+1,e+2);if(p&&clear(p.x,p.z,e))f(p.x,p.z,r0);}
      for(let i=big?0:randi(4,8);i>0;i--){const p=spot(1.2,2);if(p)addTree(p.x,p.z,rand(.8,1.45),RNG()<.4);}
      for(let i=big?0:randi(2,4);i>0;i--){const p=spot(1.6,2);if(p)addRock(p.x,p.z,rand(.6,1.5));}
      for(let i=randi(0,2);i>0;i--){const p=spot(.6,2);if(p)addHerb(p.x,p.z);}
      if(RNG()<.5){const p=spot(.8,3,true);if(p)addBarrel(p.x,p.z);}
      for(let i=randi(1,3);i>0;i--){const p=spot(.6,3,true);if(p)addProp(pick(kinds),p.x,p.z);}
      farmVehicles(ch);
    }
    // wrecks along the two highways
    for(const axis of ['x','z']){
      const on=axis==='x'?(z0<=0&&z0+CH>0):(x0<=0&&x0+CH>0);if(!on)continue;
      highwayTraffic(axis,x0,z0);
      let RK=null;const t0=axis==='x'?x0:z0,railM=FLAT(0xa8a49a);
      for(let t=t0+2;t<t0+CH;t+=4){if(Math.abs(t)<BR+20)continue;
        for(const side of [-1,1]){const wx=axis==='x'?t:side*9.5,wz=axis==='x'?side*9.5:t;if(depthAt(wx,wz)<.05)continue;
          if(!RK)RK=Kit(0,0,0);const px=axis==='x'?t:side*4.6,pz=axis==='x'?side*4.6:t;
          kBox(RK,0,railM,.16,.9,.16,px,.45,pz);if(axis==='x')kBox(RK,0,railM,4,.22,.1,px,.78,pz);else kBox(RK,0,railM,.1,.22,4,px,.78,pz);kSolid(RK,px,pz,.35);}}
      if(RK)kFinish(RK,0,0,0,'rail',false);
      highwayFurniture(axis,x0,z0);
    }
  }finally{RNG=Math.random;for(const o of ch.ghosts)delOb(o);ch.ghosts.length=0;CUR=null;padFlush();}
  chunkLoot(ch);
}
function unloadChunk(ch){
  for(const o of ch.objs){scene.remove(o);}
  for(const o of ch.inks)inkHulls.delete(o);
  for(const o of ch.obs)delOb(o);
  const drop=(arr,list)=>{for(const x of list){const i=arr.indexOf(x);if(i>=0)arr.splice(i,1);}};
  drop(houses,ch.houses);drop(BUILDS,ch.builds);drop(SPIN,ch.spin);for(const g of ch.geos)g.dispose();drop(carSpots,ch.cars);drop(trees,ch.trees);drop(rocks,ch.rocks);drop(LVL_B,ch.lvlb);drop(barrels,ch.barrels);drop(sdoors,ch.doors);if(ch.herbs)drop(herbs,ch.herbs);
  for(let i=props.length-1;i>=0;i--){const p=props[i];if(p.chunk===ch){scene.remove(p.g);props.splice(i,1);}}
  for(let i=LM_LIVE.length-1;i>=0;i--)if(LM_LIVE[i].ch===ch)LM_LIVE.splice(i,1);
  for(const A of [LADDERS,SURFS])for(let i=A.length-1;i>=0;i--)if(A[i].ch===ch)A.splice(i,1);
  const mem=chunkMem.get(ch.key);if(mem)mem.saved=[];
  for(let i=crates.length-1;i>=0;i--){const c=crates[i];if(c.chunk!==ch)continue;if(!c.opened&&mem&&!c.bag)mem.saved.push({x:c.x,z:c.z,rar:c.rar,sp:c.sp,lvl:c.lvl,kind:c.kind});dropCrate(c);crates.splice(i,1);}
  chunks.delete(ch.key);
}
// loot restocks every dawn; unopened crates are remembered while a chunk is unloaded
function chunkLoot(ch){
  let mem=chunkMem.get(ch.key);if(!mem)chunkMem.set(ch.key,mem={day:-1,saved:[],cut:ch.cut||new Set()});ch.cut=mem.cut;
  if(mem.day===S.wave){for(const c of mem.saved){const cr=spawnCrate(c.x,c.z,c.rar,c.kind);cr.chunk=ch;cr.sp=c.sp;if(c.lvl){const b=ch.lvlb.find(b=>inFoot(b,c.x,c.z,0));if(b)crateUp(cr,b);}}mem.saved=[];return;}
  mem.day=S.wave;mem.saved=[];
  let n=ch.biome==='town'?randi(2,4):ch.biome==='forest'?(Math.random()<.35?1:0):(ch.houses.length?randi(1,2):(Math.random()<.4?1:0));
  if(base.radar&&Math.random()<.5)n++;
  for(const h of ch.houses)n+=h.extra||0;
  if(Math.abs(ch.cx)<=1&&Math.abs(ch.cz)<=1)n=Math.max(n,1);
  for(let i=0;i<n;i++){
    let p=null;
    let hk=null;
    if(ch.houses.length&&Math.random()<.7){const h=pick(ch.houses);hk=h.kind||'house';p=h.solid?l2w(h.x,h.z,h.rot,rand(-h.hw+1.5,h.hw-1.5),h.hd+rand(1.6,3.2)):l2w(h.x,h.z,h.rot,rand(-(h.hw||4)+1.5,(h.hw||4)-1.5),rand(-(h.hd||4)+1.5,(h.hd||4)-1.5));if(blockedSpot(p.x,p.z,.6))p=null;
      if(p&&h.stair){const [lx,lz]=bLocal(h,p.x,p.z),st=h.stair;if(lx>st.x0-.8&&lx<st.x1+.8&&lz>st.z0-1.2&&lz<st.z1+1.4)p=null;}}
    else if(ch.cars.length&&Math.random()<.5){hk='car';const c=pick(ch.cars);const a=rand(0,6.28);p={x:c.x+Math.cos(a)*3,z:c.z+Math.sin(a)*3};if(blockedSpot(p.x,p.z,.8))p=null;}
    if(!p){for(let k=0;k<20&&!p;k++){const x=ch.cx*CH+rand(3,CH-3),z=ch.cz*CH+rand(3,CH-3);if(!blockedSpot(x,z,1))p={x,z};}}
    if(!p||crates.some(c=>!c.opened&&Math.hypot(c.x-p.x,c.z-p.z)<3))continue;
    const roll=Math.random(),cr=spawnCrate(p.x,p.z,roll<.08?'epic':roll<.32?'rare':'common',kindFor(hk));cr.chunk=ch;
  }
  for(const b of ch.lvlb)if(Math.random()<.6){const q=pick(b.lootUp),w=bWorld(b,q[0],q[1]),roll=Math.random();if(crates.some(c=>!c.opened&&Math.hypot(c.x-w.x,c.z-w.z)<1.2))continue;
    const cr=spawnCrate(w.x,w.z,roll<.14?'epic':roll<.45?'rare':'common');cr.chunk=ch;crateUp(cr,b);}
  for(const b of new Set([...ch.houses,...ch.builds])){const sp=SP_BY_SRC[b.kind];if(!sp||SPOWN.has(sp)||Math.random()>(b.kind==='tower'||b.kind==='cabin'?.25:.12))continue;
    const p=b.kind==='tower'?l2w(b.x,b.z,b.rot,0,3.4):l2w(b.x,b.z,b.rot,rand(-b.hw+1.6,b.hw-1.6),rand(-b.hd+1.6,b.hd-1.6));if(blockedSpot(p.x,p.z,.7))continue;
    const cr=spawnCrate(p.x,p.z,'relic');cr.sp=sp;cr.chunk=ch;}
}
function refreshLoot(){for(const ch of chunks.values())chunkLoot(ch);}
function updateChunks(force){
  const pcx=Math.floor(player.x/CH),pcz=Math.floor(player.z/CH),k=pcx+','+pcz;
  if(force||k!==lastPC){lastPC=k;
    chunkQueue.length=0;
    for(let i=-CH_LOAD;i<=CH_LOAD;i++)for(let j=-CH_LOAD;j<=CH_LOAD;j++){if(!chunks.has((pcx+i)+','+(pcz+j)))chunkQueue.push([pcx+i,pcz+j,i*i+j*j]);}
    chunkQueue.sort((a,b)=>b[2]-a[2]);
    for(const ch of [...chunks.values()])if(Math.abs(ch.cx-pcx)>CH_KEEP||Math.abs(ch.cz-pcz)>CH_KEEP)unloadChunk(ch);
  }
  // build the nearest missing chunk each frame (all at once when forced) so crossing a border never hitches
  if(force)while(chunkQueue.length){const c=chunkQueue.pop();genChunk(c[0],c[1]);}
  else if(chunkQueue.length){const c=chunkQueue.pop();genChunk(c[0],c[1]);}
}
function resetWorld(){
  for(const ch of [...chunks.values()])unloadChunk(ch);
  chunkMem.clear();chunkQueue.length=0;lastPC='';lastSnap='';
  for(let i=props.length-1;i>=0;i--){scene.remove(props[i].g);props.splice(i,1);}
  WORLD_SEED=(Math.random()*1e9)|0;_bio.clear();PADS.clear();PAD_IDS.clear();PAD_NEW=null;terrainRecenter(0,0,true);lastSnap='';
  setTimeout(()=>{if(S.running)toast(`New world generated · seed ${WORLD_SEED}`);},1800);
}

