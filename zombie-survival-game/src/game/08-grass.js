/* ================= GRASS (instanced, wind-swayed in the vertex shader) ================= */
const windU={uTime:{value:0},uWind:{value:.3},uWdir:{value:new THREE.Vector2(1,0)}};
function swayMaterial(mat,amp){
  mat.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,windU);
    sh.vertexShader='uniform float uTime;uniform float uWind;uniform vec2 uWdir;\n'+sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 ip=vec2(instanceMatrix[3].x,instanceMatrix[3].z);
      #else
        vec2 ip=vec2(0.);
      #endif
      vec2 wp=(modelMatrix*vec4(ip.x,0.,ip.y,1.)).xz;
      if((abs(wp.x)<`+(BR+2).toFixed(1)+`&&abs(wp.y)<`+(BR+2).toFixed(1)+`)||abs(wp.x)<4.||abs(wp.y)<4.)transformed*=0.;
      ip=wp;
      float sw=sin(uTime*(1.6+uWind)+ip.x*.35+ip.y*.27)*.5+.5;
      float h=max(position.y,0.)*${amp.toFixed(2)};
      transformed.xz+=uWdir*h*uWind*(.35+sw*.65)+vec2(sin(uTime*3.1+ip.y),cos(uTime*2.7+ip.x))*h*.04;`);
  };
  return mat;
}
let grass=null;const GTILE=64,GMASK=Array.from({length:32},()=>new THREE.Vector4(1e9,1e9,-1e9,-1e9));let gmaskT=0;
// no grass through asphalt, sidewalks, rails or floors: the nearest 32 such rectangles are cut out in the grass shader
function updateGrassMask(){const px=player.x,pz=player.z,L=[];
  for(const P of TPLAN.values()){if(Math.hypot(P.C.x-px,P.C.z-pz)>260)continue;for(const r of [...P.streets,...P.walks,...P.rails]){const dx=Math.max(r.x0-px,0,px-r.x1),dz=Math.max(r.z0-pz,0,pz-r.z1),d=Math.hypot(dx,dz);if(d<70)L.push([d,r.x0-.3,r.z0-.3,r.x1+.3,r.z1+.3]);}}
  for(const h of houses){if(h.ex==null)continue;const m=h.mask,d=m?Math.hypot(Math.max(m[0]-px,0,px-m[2]),Math.max(m[1]-pz,0,pz-m[3])):Math.hypot(h.x-px,h.z-pz)-Math.max(h.ex,h.ez);
    if(d<60)L.push(m?[d,m[0],m[1],m[2],m[3]]:[d,h.x-h.ex,h.z-h.ez,h.x+h.ex,h.z+h.ez]);}
  L.sort((a,b)=>a[0]-b[0]);for(let i=0;i<32;i++){const r=L[i];if(r)GMASK[i].set(r[1],r[2],r[3],r[4]);else GMASK[i].set(1e9,1e9,-1e9,-1e9);}}
// sprite atlas: four hand-painted tufts (lush grass, foxtail, wildflowers, dry prairie grass), drawn on crossed cards
const GRASS_ATLAS=(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d'),R=mulberry(4242),r=(a,b)=>a+R()*(b-a);
  const blade=(cx,col,h,lean,w)=>{const tx=cx+lean,ty=128-h;g.fillStyle=col;g.beginPath();g.moveTo(cx-w,128);g.quadraticCurveTo(cx-w*.4+lean*.3,128-h*.55,tx,ty);g.quadraticCurveTo(cx+w*.4+lean*.3,128-h*.55,cx+w,128);g.closePath();g.fill();
    g.strokeStyle='rgba(12,14,8,.85)';g.lineWidth=1.6;g.stroke();g.strokeStyle='rgba(255,255,230,.25)';g.lineWidth=1;g.beginPath();g.moveTo(cx,126);g.quadraticCurveTo(cx+lean*.3,128-h*.55,tx,ty+4);g.stroke();};
  const greens=['#7d9a48','#93ad55','#6a8a3c','#a8bd62','#5e7e36'],dry=['#c8b468','#b8a058','#d8c47a','#a89048','#c0aa60'];
  const tuft=(ox,pal,n,hmin,hmax)=>{for(let i=0;i<n;i++){const cx=ox+64+r(-30,30);blade(cx,pal[(R()*pal.length)|0],r(hmin,hmax),r(-26,26),r(2.5,5));}};
  tuft(0,greens,26,50,118);
  tuft(128,greens,16,44,96);for(let i=0;i<6;i++){const cx=128+64+r(-26,26),h=r(96,124),lean=r(-14,14);g.strokeStyle='#5e6e30';g.lineWidth=2;g.beginPath();g.moveTo(cx,128);g.quadraticCurveTo(cx+lean*.5,128-h*.5,cx+lean,128-h);g.stroke();
    g.fillStyle='#d8c88a';g.strokeStyle='rgba(12,14,8,.85)';g.lineWidth=1.4;g.beginPath();g.ellipse(cx+lean,128-h+8,4,13,lean*.02,0,6.28);g.fill();g.stroke();}
  tuft(256,greens,18,30,80);for(let i=0;i<9;i++){const cx=256+64+r(-34,34),cy=128-r(40,92),col=['#f2d23a','#f2f0e8','#b88ad8','#f2d23a','#e86a4a'][(R()*5)|0];
    g.strokeStyle='#4e6e2a';g.lineWidth=2;g.beginPath();g.moveTo(cx,128);g.lineTo(cx+r(-4,4),cy);g.stroke();
    for(let k=0;k<6;k++){const a=k/6*6.28;g.fillStyle=col;g.beginPath();g.ellipse(cx+Math.cos(a)*5,cy+Math.sin(a)*5,4.5,2.6,a,0,6.28);g.fill();}
    g.fillStyle='#8a5a1a';g.beginPath();g.arc(cx,cy,3,0,6.28);g.fill();g.strokeStyle='rgba(12,14,8,.8)';g.lineWidth=1.2;g.beginPath();g.arc(cx,cy,9,0,6.28);g.stroke();}
  tuft(384,dry,24,40,112);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;})();
(function buildGrass(){
  const N=2000;
  const a=new THREE.PlaneGeometry(1,.8),b=new THREE.PlaneGeometry(1,.8);b.rotateY(Math.PI/2);
  const geo=new THREE.BufferGeometry();
  for(const n of ['position','uv']){const A=a.toNonIndexed().attributes[n],B=b.toNonIndexed().attributes[n],arr=new Float32Array(A.array.length+B.array.length);arr.set(A.array);arr.set(B.array,A.array.length);geo.setAttribute(n,new THREE.BufferAttribute(arr,A.itemSize));}
  geo.translate(0,.4,0);{const nn=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<nn.length;i+=3)nn[i+1]=1;geo.setAttribute('normal',new THREE.BufferAttribute(nn,3));}
  const cell=new Float32Array(N);
  const mat=swayMaterial(new THREE.MeshStandardMaterial({color:0xffffff,map:GRASS_ATLAS,roughness:1,side:THREE.DoubleSide,alphaTest:.45}),.9);
  {const sway=mat._obc;mat.onBeforeCompile=function(sh){sway.call(this,sh);sh.uniforms.uMask={value:GMASK};sh.uniforms.uGH=grassSeasonU.gh;sh.uniforms.uFlowers=grassSeasonU.flowers;
    sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);');
    sh.vertexShader=sh.vertexShader.replace('ip=wp;','transformed.y*=uGH;for(int i=0;i<32;i++){vec4 r=uMask[i];if(wp.x>r.x&&wp.x<r.z&&wp.y>r.y&&wp.y<r.w)transformed*=0.;}\n ip=wp;')
      .replace('void main() {','attribute float aCell;\nuniform vec4 uMask[32];uniform float uGH;uniform float uFlowers;\nvoid main() {').replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_UV\n float cell=aCell;\n#ifdef USE_INSTANCING\n float hh=fract(sin(dot(instanceMatrix[3].xz,vec2(12.9898,78.233)))*43758.5453);if(cell>1.5&&cell<2.5&&hh>uFlowers)cell=3.;if(uGH<.6&&cell<1.5&&hh>uGH*1.4)cell=3.;\n#endif\n vUv.x=(vUv.x+cell)*.25;\n#endif');};}
  const tmpl=new THREE.InstancedMesh(geo,mat,N);
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new V3(),pos=new V3(),col=new THREE.Color();
  const tints=[0xffffff,0xe8f0d0,0xf4ecd0,0xdce8c0,0xffffff];
  let n=0;
  while(n<N){const cx=rand(0,GTILE),cz=rand(0,GTILE),clump=randi(5,12),kind=Math.random();
    for(let k=0;k<clump&&n<N;k++){const x=((cx+rand(-1.8,1.8))%GTILE+GTILE)%GTILE,z=((cz+rand(-1.8,1.8))%GTILE+GTILE)%GTILE;
      pos.set(x,0,z);q.setFromAxisAngle(new V3(0,1,0),rand(0,6.28));const s=rand(.65,1.35);sc.set(s,s*rand(.75,1.3),s);
      m4.compose(pos,q,sc);tmpl.setMatrixAt(n,m4);col.setHex(pick(tints)).multiplyScalar(rand(.82,1.05));tmpl.setColorAt(n,col);
      cell[n]=kind<.5?(Math.random()<.75?0:1):kind<.72?2:kind<.9?3:(Math.random()<.5?1:0);n++;}}
  geo.setAttribute('aCell',new THREE.InstancedBufferAttribute(cell,1));
  grass=new THREE.Group();
  for(let i=0;i<9;i++){const t=new THREE.InstancedMesh(geo,mat,N);t.instanceMatrix=tmpl.instanceMatrix;t.instanceColor=tmpl.instanceColor;t.frustumCulled=false;t.receiveShadow=true;grass.add(t);}
  scene.add(grass);
})();
function updateGrass(){
  gmaskT-=1;if(gmaskT<=0){gmaskT=20;updateGrassMask();}
  const bx=Math.floor(player.x/GTILE),bz=Math.floor(player.z/GTILE);let i=0;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)grass.children[i++].position.set((bx+a)*GTILE,0,(bz+b)*GTILE);
}

