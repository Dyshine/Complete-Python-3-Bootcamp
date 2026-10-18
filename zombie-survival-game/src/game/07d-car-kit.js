/* ================= CAR KIT (Kenney Car Kit, CC0) =================
   Sedans, SUVs, vans, pickups, box and delivery trucks, a tractor, and the emergency vehicles of a town that tried to hold
   out. The kit is toy-bright, so a shader reads its palette and weathers it: civilian paint is swapped for a faded colour,
   service liveries keep theirs but bleach, glass goes dark and grimy (or is smashed out), rust blooms over the panels,
   mud climbs the sills and dust settles on the roof. Stripped cars sit on their rims with the hood up. */
const CARKIT={ready:false,types:{},mat:null};
// stretched to real proportions: the kit's cars are short and wide
const CAR_SCALE=[1.28,1.3,1.68];
const CAR_PAINT=[0x7a3a30,0x3e5670,0x8e877a,0x4a5e3a,0xa4844a,0x5e2e36,0xc8c0ac,0x2e3644,0x6a6e70,0x8a5a2e,0x3a4a3e];
const CAR_SERVICE=new Set(['police','taxi','ambulance','firetruck','garbage-truck','delivery','delivery-flat','tractor']);
const CAR_GLSL=`
float cH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cH(i),cH(i+vec2(1,0)),f.x),mix(cH(i+vec2(0,1)),cH(i+vec2(1,1)),f.x),f.y);}
vec3 carStyle(vec3 c,vec3 p,vec3 n,vec2 uv){
  float lum=dot(c,vec3(.299,.587,.114)),mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),sat=(mx-mn)/(mx+.001);
  vec2 sp=abs(n.x)>abs(n.z)?vec2(p.z,p.y):vec2(p.x,p.y);
  float glass=step(uv.x,.125)*step(.75,uv.y); // the palette's ice-white glass swatch, bottom-left
  if(glass>.5){
    float crack=smoothstep(.93,.99,cN(sp*14.+uSeed))+smoothstep(.95,.995,cN(sp*31.-uSeed));
    c=mix(vec3(.06,.07,.08),vec3(.24,.28,.3),smoothstep(.5,.95,lum))*(.7+.4*cN(sp*3.));c+=crack*.25;
    c=mix(c,vec3(.03),uBroken*step(.45,cN(sp*2.3+uSeed*1.7)));
    return c;}
  if(sat>.28&&lum<.9){c=uKeep>.5?mix(vec3(lum),c,.62)*.92:uPaint*(.42+lum*.9);}
  else c*=.88;
  // weather: mud up the sills, dust on the roof, rust blooms, scuffs
  float h=p.y,g=cN(sp*2.2+uSeed);
  c*=1.-.42*smoothstep(.42,.02,h)*(.55+.45*g);
  c=mix(c,vec3(.46,.42,.35),smoothstep(.6,.95,n.y)*.38*(.6+.4*g));
  float r=smoothstep(.58,.78,cN(sp*5.5+uSeed*2.3)*.7+cN(sp*13.-uSeed)*.3)*uRust;
  c=mix(c,vec3(.34,.17,.08)*(.7+.6*cN(sp*20.)),clamp(r,0.,1.));
  c*=.9+.14*cN(sp*9.-uSeed);
  return c;}
`;
function carMaterial(base){
  const m=new THREE.MeshToonMaterial({map:base.map,gradientMap:TOON_GRAD,side:THREE.FrontSide});
  m.userData.u={uPaint:{value:new THREE.Color()},uKeep:{value:0},uRust:{value:.3},uBroken:{value:0},uSeed:{value:0}};
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,m.userData.u);
    sh.vertexShader='varying vec3 vCP;varying vec3 vCN;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vCP=position;vCN=normal;');
    sh.fragmentShader='varying vec3 vCP;varying vec3 vCN;uniform vec3 uPaint;uniform float uKeep,uRust,uBroken,uSeed;\n'+CAR_GLSL+
      sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=carStyle(diffuseColor.rgb,vCP,normalize(vCN),vUv);');};
  m.customProgramCacheKey=()=>'carkit';return m;}
if(THREE.GLTFLoader){try{new THREE.GLTFLoader().load('models/cars/cars.gltf.json',g=>{try{
  const root=g.scene.getObjectByName('cars')||g.scene;let base=null;
  for(const t of root.children){const parts={body:[],wheels:[]};t.updateMatrixWorld(true);
    t.traverse(o=>{if(!o.isMesh)return;if(!base)base=o.material;const geo=o.geometry.clone();o.updateMatrixWorld(true);geo.applyMatrix4(new THREE.Matrix4().copy(t.matrixWorld).invert().multiply(o.matrixWorld));
      geo.computeBoundingBox();(/wheel/.test(o.name||o.parent.name)?parts.wheels:parts.body).push(geo);});
    const b=new THREE.Box3();for(const geo of [...parts.body,...parts.wheels])b.union(geo.boundingBox);
    CARKIT.types[t.name]={...parts,min:b.min.clone(),max:b.max.clone()};}
  CARKIT.mat=base;CARKIT.ready=!!CARKIT.types.sedan;
}catch(e){console.warn('Car kit failed; keeping the drawn cars.',e);}},undefined,()=>{});}catch(e){}}
// which kit model plays each of the game's car roles
const CAR_ROLE={sedan:['sedan','sedan','hatchback-sports','sedan-sports','suv-luxury'],wagon:['suv','suv-luxury','van'],pickup:['truck-flat','truck-flat','truck'],
  van:['van','delivery'],truck:['truck','delivery','delivery-flat','garbage-truck'],police:['police'],taxi:['taxi'],ambulance:['ambulance'],fire:['firetruck'],tractor:['tractor']};
// builds the visible car (body, wheels, outline); returns null when the kit isn't loaded
function kitCarBody(g,role){
  if(!CARKIT.ready)return null;const opts=CAR_ROLE[role]||CAR_ROLE.sedan,name=pick(opts),T=CARKIT.types[name]||CARKIT.types.sedan;
  const mat=carMaterial(CARKIT.mat),u=mat.userData.u;
  u.uPaint.value.setHex(pick(CAR_PAINT));u.uKeep.value=CAR_SERVICE.has(name)?1:0;u.uRust.value=rand(.04,.32);u.uSeed.value=rand(0,50);u.uBroken.value=RNG()<.3?1:0;
  const k=new THREE.Group();k.scale.set(...CAR_SCALE);k.position.set(-(T.min.x+T.max.x)/2*CAR_SCALE[0],0,-(T.min.z+T.max.z)/2*CAR_SCALE[2]);g.add(k);
  let body=null;for(const geo of T.body){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;k.add(m);body=body||m;
    if(GFX==='high'){const o=new THREE.Mesh(geo,SUB_OL);k.add(o);}}
  const wheels=T.wheels.map(geo=>{const w=new THREE.Mesh(geo,mat);w.castShadow=true;k.add(w);return w;});
  const len=(T.max.z-T.min.z)*CAR_SCALE[2],wid=(T.max.x-T.min.x)*CAR_SCALE[0],hgt=(T.max.y-T.min.y)*CAR_SCALE[1];
  return{name,mat,body,wheels,len,wid,hgt,k};
}
// a stripped wreck: on its rims, rust everywhere, glass gone, the hood thrown up and a door on the ground
function kitStripLook(c){
  const u=c.mat.userData.u;u.uRust.value=1;u.uBroken.value=1;for(const w of c.wheels)w.visible=false;c.g.position.y=-.32;
  const hood=mk(BOX(c.wid*.86,.06,1.1),CTM('metalwall',0x7a4a34,1.5),0,c.hgt*.62,c.len/2-.6);hood.rotation.x=-1.05;c.g.add(hood);
  const D=CARKIT.types['debris-door'];if(D&&!c.door){c.door=new THREE.Mesh(D.body[0]||D.wheels[0],c.mat);c.door.scale.set(...CAR_SCALE);c.door.rotation.set(-Math.PI/2,0,rand(-.5,.5));c.door.position.set(c.wid/2+.8,.08-c.g.position.y,rand(-.6,.6));c.g.add(c.door);}
}
