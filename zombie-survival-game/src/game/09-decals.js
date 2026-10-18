/* ================= DECALS (blood, acid, scorch) ================= */
function splatTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const grd=g.createRadialGradient(64,64,6,64,64,46);grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(.7,'rgba(255,255,255,.85)');grd.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grd;g.beginPath();g.arc(64,64,40,0,6.28);g.fill();
  g.fillStyle='rgba(255,255,255,.9)';
  for(let i=0;i<14;i++){const a=rand(0,6.28),r=rand(28,56),s=rand(3,9);g.beginPath();g.arc(64+Math.cos(a)*r,64+Math.sin(a)*r,s,0,6.28);g.fill();}
  return new THREE.CanvasTexture(c);
}
const splatTex=splatTexture();
const decals=[];
for(let i=0;i<90;i++){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({map:splatTex,color:0x5a0e0a,transparent:true,depthWrite:false,roughness:.35,polygonOffset:true,polygonOffsetFactor:-2,userData:{terrainVertex:true}}));
  m.rotation.x=-Math.PI/2;m.visible=false;m.renderOrder=1;scene.add(m);decals.push({m,life:0});
}
let dIdx=0;
function decal(x,z,size,color,opacity){
  const d=decals[dIdx=(dIdx+1)%decals.length];d.m.position.set(x,.05+dIdx*.0004,z);d.m.rotation.z=rand(0,6.28);d.m.scale.set(size*rand(.8,1.2),size*rand(.8,1.2),1);
  d.m.material.color.setHex(color);d.m.material.opacity=opacity==null?.85:opacity;d.m.visible=true;d.life=90;d.base=d.m.material.opacity;
}

