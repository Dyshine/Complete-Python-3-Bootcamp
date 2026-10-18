/* ================= RURAL KIT =================
   Photo-textured farm homes from drummyfish's "Family house collection" (CC0): six houses, three skins (brick and dark
   tile, fieldstone and dark tile, white siding and red shingle), packed by tools/pack-rural.mjs. And an old open-sided
   hay shed with a straw pile, carlosjorgereis' "Old wood barn" (CC0). Like the Kenney houses they are solid shells: loot
   lands on the porch and in the yard. Until the files load, the drawn buildings stand in. */
const RUR={ready:false,types:[],skins:[],shed:null,scale:3.6};
{const b64=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
  const tex=u=>{const t=new THREE.TextureLoader().load(u);t.anisotropy=4;return t;};
  const geoOf=(pos,uv,idx,uvK)=>{const p=b64(pos,Int16Array),f=new Float32Array(p.length);for(let i=0;i<p.length;i++)f[i]=p[i]/1000;
    const q=uvK?b64(uv,Int16Array):b64(uv,Uint16Array),g=new Float32Array(q.length),k=uvK||65535;for(let i=0;i<q.length;i++)g[i]=q[i]/k;
    let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(f,3));geo.setAttribute('uv',new THREE.BufferAttribute(g,2));
    geo.setIndex(new THREE.BufferAttribute(b64(idx,Uint16Array),1));geo=geo.toNonIndexed();geo.computeVertexNormals();geo.computeBoundingBox();return geo;};
  const mat=(map,col)=>new THREE.MeshToonMaterial({map,color:col||0xe2ddd2,gradientMap:TOON_GRAD});
  fetch('models/rural/houses.json').then(r=>r.ok?r.json():Promise.reject(r.status)).then(d=>{
    RUR.types=d.types.map(t=>({name:t.name,geo:geoOf(t.pos,t.uv,t.idx)}));
    RUR.skins=['a','b','c'].map(s=>mat(tex(`models/rural/skin_${s}.jpg`)));RUR.ready=true;}).catch(()=>{});
  fetch('models/rural/shed.json').then(r=>r.ok?r.json():Promise.reject(r.status)).then(d=>{
    const W=tex('models/rural/shed_wood.jpg'),St=tex('models/rural/shed_straw.jpg');for(const t of [W,St])t.wrapS=t.wrapT=THREE.RepeatWrapping;
    RUR.shed=d.mats.map(m=>({geo:geoOf(m.pos,m.uv,m.idx,4096),mat:mat(m.tex==='straw'?St:W,m.tex==='straw'?0xd0c49a:0x9c9282)}));}).catch(()=>{});}
// a solid footprint: obstacles filling the box so nothing walks through or spawns inside
function rurSolid(x,z,rot,hw,hd){for(let lx=-hw+.8;lx<=hw-.8+.01;lx+=1.5)for(let lz=-hd+.8;lz<=hd-.8+.01;lz+=1.5){const p=l2w(x,z,rot,lx,lz);addOb({x:p.x,z:p.z,r:1.05});}}
// a farm home, front door to local +z (every house in the set is modelled that way). Types 0–3 are the pitched-roof
// houses, 4–5 the flat-roofed ones; towns pass one of the smaller ones. False until loaded.
function addRural(x,z,rot,type,skin){
  if(!RUR.ready)return false;const ti=type!=null?type:Math.floor(RNG()*4),T=RUR.types[ti],si=skin!=null?skin:Math.floor(RNG()*3),s=RUR.scale;
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  const m=new THREE.Mesh(T.geo,RUR.skins[si]);m.scale.setScalar(s);m.castShadow=true;m.receiveShadow=true;g.add(m);
  if(GFX==='high'){const o=new THREE.Mesh(T.geo,SUB_OL);o.scale.copy(m.scale);g.add(o);}
  track(g);
  const bb=T.geo.boundingBox,hw=(bb.max.x-bb.min.x)/2*s,hd=(bb.max.z-bb.min.z)/2*s;
  rurSolid(x,z,rot,hw,hd);
  const c=Math.abs(Math.cos(rot)),sn=Math.abs(Math.sin(rot)),rec={x,z,rot,hw,hd,h:(bb.max.y-bb.min.y)*s,kind:'house',solid:true,style:'rural'+si,type:T.name,ex:c*hw+sn*hd,ez:sn*hw+c*hd};
  houses.push(rec);if(CUR)CUR.houses.push(rec);
  if(RNG()<.6){const p=l2w(x,z,rot,rand(-hw+2,hw-2),hd+rand(2,4));addProp(pick(['carton','crate','tire','can']),p.x,p.z);}
  if(RNG()<.35){const p=l2w(x,z,rot,hw+rand(2,3.5),rand(-hd,hd));if(!blockedSpot(p.x,p.z,2.4))addCar(p.x,p.z,rot+rand(-.3,.3));}
  return rec;
}
const ruralOrFarm=(x,z,r)=>addRural(x,z,r)||(RNG()<.5?bFarmhouse:bFarmhouse2)(x,z,r);
// the open hay shed: about 7.5 m by 5.7 m, solid like the houses
function addHayShed(x,z,rot){
  if(!RUR.shed)return bShed(x,z,rot);const s=1.15,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;
  for(const p of RUR.shed){const m=new THREE.Mesh(p.geo,p.mat);m.scale.setScalar(s);m.castShadow=true;m.receiveShadow=true;g.add(m);}
  track(g);const bb=RUR.shed[0].geo.boundingBox,hw=(bb.max.x-bb.min.x)/2*s,hd=(bb.max.z-bb.min.z)/2*s;
  rurSolid(x,z,rot,hw,hd);
  const c=Math.abs(Math.cos(rot)),sn=Math.abs(Math.sin(rot)),rec={x,z,rot,hw,hd,h:(bb.max.y-bb.min.y)*s,kind:'house',solid:true,style:'shed',type:'hayshed',ex:c*hw+sn*hd,ez:sn*hw+c*hd};
  houses.push(rec);if(CUR)CUR.houses.push(rec);
  return rec;
}
