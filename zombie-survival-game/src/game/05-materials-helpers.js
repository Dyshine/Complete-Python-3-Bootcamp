/* ================= MATERIALS / HELPERS ================= */
const matCache={},geoCache={};
/* hand-inked look: three-band toon shading, hand-painted tiling textures and black ink outline hulls */
const TOON_GRAD=(()=>{const d=new Uint8Array([95,95,95,255,175,175,175,255,255,255,255,255]);const t=new THREE.DataTexture(d,3,1,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
function M(color,opts){const k=color+'|'+JSON.stringify(opts||{});if(matCache[k])return matCache[k];
  const o=Object.assign({},opts||{});delete o.metalness;delete o.roughness;delete o.flatShading;
  return matCache[k]=new THREE.MeshToonMaterial(Object.assign({color,gradientMap:TOON_GRAD},o));}
const TEXF={grass:'textures/grass.jpg',grassDry:'textures/grass-dry.jpg',water:'textures/water.jpg',asphalt:'textures/asphalt.jpg',concrete:'textures/concrete.jpg',wood:'textures/wood.jpg',metal:'textures/metal.jpg',plaster:'textures/plaster.jpg',bark:'textures/bark.jpg',pine:'textures/pine.jpg',
  soil:'textures/soil.jpg',straw:'textures/straw.jpg',cornleaf:'textures/cornleaf.jpg',kernels:'textures/kernels.jpg',pumpkin:'textures/pumpkin.jpg',cabbage:'textures/cabbage.jpg'};
const TEXI={},texWait={};
function onTex(name,fn){if(TEXI[name])fn(TEXI[name]);else(texWait[name]=texWait[name]||[]).push(fn);}
function texRep(name,rx,ry){const t=TEXI[name];if(!t)return null;const k=name+rx+'x'+ry;if(t.userData[k])return t.userData[k];const c=t.clone();c.needsUpdate=true;c.repeat.set(rx,ry);t.userData[k]=c;return c;}
{const L=new THREE.TextureLoader();for(const [k,u] of Object.entries(TEXF))L.load(u,t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;t.userData={};TEXI[k]=t;(texWait[k]||[]).forEach(f=>f(t));if(typeof segs!=='undefined'&&segs.length)segs.forEach(segVisual);},undefined,()=>{});}
// textured toon material: shows the flat fallback colour until the texture arrives, then the tint over the texture
const texMatCache={};
function TM(name,rx,ry,fallback,tint){const k=[name,rx,ry,fallback,tint].join('|');if(texMatCache[k])return texMatCache[k];
  const m=new THREE.MeshToonMaterial({color:fallback,gradientMap:TOON_GRAD});
  onTex(name,()=>{m.map=texRep(name,rx,ry);m.color.setHex(tint==null?0xffffff:tint);m.needsUpdate=true;});return texMatCache[k]=m;}
const INK=new THREE.MeshBasicMaterial({color:0x0b0a09,side:THREE.BackSide}),inkHulls=new Set();
function ink(mesh,t){const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();const sz=new THREE.Vector3();g.boundingBox.getSize(sz);t=t||.06;
  const o=new THREE.Mesh(g,INK);o.scale.set(1+t/Math.max(sz.x,.05),1+t/Math.max(sz.y,.05),1+t/Math.max(sz.z,.05));o.position.copy(g.boundingBox.getCenter(new THREE.Vector3()).multiplyScalar(-(o.scale.x-1)));
  o.castShadow=o.receiveShadow=false;o.visible=GFX==='high';mesh.add(o);inkHulls.add(o);if(typeof CUR!=='undefined'&&CUR)CUR.inks.push(o);return mesh;}
const lighten=(c,f)=>new THREE.Color(c).lerp(new THREE.Color(0xffffff),f).getHex();
function BOX(w,h,d){const k='b'+w+','+h+','+d;return geoCache[k]||(geoCache[k]=new THREE.BoxGeometry(w,h,d));}
function CYL(a,b,h,s){const k='c'+a+','+b+','+h+','+s;return geoCache[k]||(geoCache[k]=new THREE.CylinderGeometry(a,b,h,s));}
function mki(geo,mat,x,y,z,t){return ink(mk(geo,mat,x,y,z),t);}
function mk(geo,mat,x,y,z,shadow){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(shadow!==false){m.castShadow=true;m.receiveShadow=true;}return m;}
const BASIC=c=>new THREE.MeshBasicMaterial({color:c});

