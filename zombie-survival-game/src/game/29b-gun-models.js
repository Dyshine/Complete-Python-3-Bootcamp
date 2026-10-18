/* ================= GUN MODELS =================
   Firearms from Quaternius' Ultimate Gun Pack (CC0), packed by tools/pack-guns.mjs into models/guns/guns.json: one model
   per class and tier, barrel along +z with the origin at the grip, like the drawn guns they replace. The drawn guns stay
   for the bow, launcher, melee and the specials, and stand in until the file has loaded. */
const GUNKIT={ready:false,data:null,built:{}};
fetch('models/guns/guns.json').then(r=>r.ok?r.json():Promise.reject(r.status)).then(d=>{GUNKIT.data=d;GUNKIT.ready=true;
  for(const k in GUNMODEL)if(d[k])delete GUNMODEL[k];if(typeof equipVisual==='function'&&S.running)equipVisual();}).catch(()=>{});
const b64arr=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
function kitGun(k){
  if(!GUNKIT.ready||!GUNKIT.data[k])return null;
  if(!GUNKIT.built[k]){const g=new THREE.Group();
    for(const [hex,p,ix] of GUNKIT.data[k].mats){const q=b64arr(p,Int16Array),f=new Float32Array(q.length);for(let i=0;i<q.length;i++)f[i]=q[i]/1000;
      let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(f,3));geo.setIndex(new THREE.BufferAttribute(b64arr(ix,Uint16Array),1));
      geo=geo.toNonIndexed();geo.computeVertexNormals();
      const m=new THREE.Mesh(geo,FLAT(hex,true));m.castShadow=true;g.add(m);}
    GUNKIT.built[k]=g;}
  return GUNKIT.built[k];
}
