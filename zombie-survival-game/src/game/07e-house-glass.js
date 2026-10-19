/* ================= GLASS IN THE KIT HOUSES =================
   The Kenney and farm houses come with their windows painted on. At load each model's panes are cut out into a small mesh
   of see-through glass, the painted glass is dropped from the walls (discarded in the shader, so frames and muntins stay),
   and the shell is drawn from the inside as well, darker, so a window shows a dim empty room rather than the field behind
   the house. Every pane is a breakable window like the ones in the drawn buildings: shoot it, swing at it or blow it in,
   and the chunk remembers it broken. */
const _gv=new V3(),_gn=new V3();
// split a kit model into its window panes (triangles whose corners all pass isWin(u,v)) and an outline hull without them
function shellPanes(geo,isWin,uvK){
  const P=geo.attributes.position,U=geo.attributes.uv,N=geo.attributes.normal,I=geo.index,n=I?I.count:P.count,vi=k=>I?I.getX(k):k;
  const win=[],keep=[];
  for(let t=0;t<n;t+=3){let w=true;for(let k=0;k<3;k++){const v=vi(t+k);if(!isWin(U.getX(v),U.getY(v)))w=false;}(w?win:keep).push(t);}
  // the outline hull leaves the glass out, or it would paint the far windows black when you look in through the near ones
  const hull=new THREE.BufferGeometry();hull.setAttribute('position',P);if(N)hull.setAttribute('normal',N);
  const hi=[];for(const t of keep)for(let k=0;k<3;k++)hi.push(vi(t+k));hull.setIndex(hi);
  // panes are the glass triangles that share corners
  const key=v=>Math.round(P.getX(v)*500)+','+Math.round(P.getY(v)*500)+','+Math.round(P.getZ(v)*500);
  const par=new Map(),f=x=>{while(par.get(x)!==x){par.set(x,par.get(par.get(x)));x=par.get(x);}return x;};
  for(const t of win){const ks=[0,1,2].map(k=>key(vi(t+k)));for(const k of ks)if(!par.has(k))par.set(k,k);for(let k=1;k<3;k++)par.set(f(ks[k]),f(ks[0]));}
  const groups=new Map();for(const t of win){const r=f(key(vi(t)));if(!groups.has(r))groups.set(r,[]);groups.get(r).push(t);}
  const pos=[],nor=[],uv=[],panes=[];
  for(const ts of groups.values()){const min=new V3(1e9,1e9,1e9),max=new V3(-1e9,-1e9,-1e9),nn=new V3();
    for(const t of ts)for(let k=0;k<3;k++){const v=vi(t+k);_gv.fromBufferAttribute(P,v);min.min(_gv);max.max(_gv);if(N)nn.add(_gn.fromBufferAttribute(N,v));}
    if(nn.lengthSq()<1e-8)nn.set(0,0,1);nn.normalize();const side=Math.abs(nn.x)>Math.abs(nn.z),start=pos.length/3;
    for(const t of ts)for(let k=0;k<3;k++){const v=vi(t+k);_gv.fromBufferAttribute(P,v);pos.push(_gv.x,_gv.y,_gv.z);nor.push(nn.x,nn.y,nn.z);
      // planar UVs, so the streaks and the grime land the right way up on every pane
      uv.push((side?_gv.z-min.z:_gv.x-min.x)/uvK,(_gv.y-min.y)/uvK);}
    panes.push({start,count:pos.length/3-start,min,max,c:min.clone().add(max).multiplyScalar(.5),n:nn});}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return{geo:g,panes,hull};
}
// one house's glass: its own copy of the panes (breaking one collapses it in place), a breakable window per pane and a floor
function shellGlass(g,body,x,z,rot,G,hw,hd){
  if(!G||!G.panes.length)return;
  const geo=G.geo.clone(),m=new THREE.Mesh(geo,GLASS);m.scale.copy(body.scale);m.position.copy(body.position);m.renderOrder=2;g.add(m);if(CUR)CUR.geos.push(geo);
  const s=body.scale.x,o=body.position;let low=1e9;
  for(const p of G.panes){const sill=p.min.y*s+o.y,top=p.max.y*s+o.y;low=Math.min(low,sill);
    const wp=l2w(x,z,rot,p.c.x*s+o.x-p.n.x*.2,p.c.z*s+o.z-p.n.z*.2);
    const W={geo,start:p.start,count:p.count,x:wp.x,z:wp.z,sill,top,Y:0,obs:[],shell:true,mesh:m};
    const ob={x:wp.x,z:wp.z,r:clamp(Math.hypot(p.max.x-p.min.x,p.max.z-p.min.z)*s*.32,.3,.6),win:W};
    if(sill>2.3)ob.lvl=1; // upstairs: out of reach of shots and swings from the ground; a blast still takes it
    addOb(ob);W.obs.push(ob);
    W.key=cutKey(wp.x,wp.z)+'|'+Math.round(sill*2);W.ch=CUR;if(CUR&&CUR.wb&&CUR.wb.has(W.key))breakWin(W,true);}
  // a bare floor for the empty rooms you can now see into
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(1,hw*2-.5),Math.max(1,hd*2-.5)),FLAT(0x2c241d,true));
  fl.rotation.x=-Math.PI/2;fl.position.y=clamp(low-.9,.04,.6);fl.receiveShadow=true;g.add(fl);if(CUR)CUR.geos.push(fl.geometry);
  furnish(g,G.panes,s,o,hw,hd,fl.position.y+.01,Math.imul(Math.round(x*7),73856093)^Math.imul(Math.round(z*7),19349663));
}
// the farm skins paint different windows in the same corner of the atlas: pane rectangles in pixels from (764, 0),
// [x0, y0, x1, y1, dark] where dark keeps the light muntins and drops only the dark glass between them
const RUR_PANES={a:[[22,12,245,238,1],[30,265,126,470,0],[155,265,240,470,0]],b:[[23,15,250,238,1],[20,258,128,478,0],[142,258,252,478,0]],c:[[28,10,248,228,0],[30,265,120,470,0],[152,265,243,470,0]]};
function rurWinMat(m,skin){
  const test=RUR_PANES[skin].map(([x0,y0,x1,y1,dark])=>`if(px>${x0}.&&px<${x1}.&&py>${y0}.&&py<${y1}.${dark?'&&dot(diffuseColor.rgb,vec3(.3,.59,.11))<.4':''})discard;`).join('');
  m.side=THREE.DoubleSide;
  m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',
    '#include <map_fragment>\n {float px=vUv.x*1024.-764.,py=(1.-vUv.y)*1024.;if(px>0.&&py<500.){'+test+'}}\n if(!gl_FrontFacing)diffuseColor.rgb*=.42;');};
  m.customProgramCacheKey=()=>'rurwin'+skin;return m;
}

/* ----- furniture behind the glass -----
   A low-poly kit modelled in Blender (tools/blender/interiors.py): sofas, armchairs, beds, a kitchen run and fridge,
   a dining set, a dresser, a bookshelf, a TV, rugs, a lamp, a knocked-over chair, junk on the floor and wall panels.
   Each kit house gets a living room on one side and a kitchen or a bedroom on the other (a partition between them in
   the wider houses), laid out from a seed of its position. Tall pieces only go against walls with no window there.
   A house's furniture is merged into one mesh in one material, drawn but not solid: the houses stay sealed. */
const FURN={ready:false,P:{},mat:null,wait:[]};
if(THREE.GLTFLoader){try{new THREE.GLTFLoader().load('models/interiors/furniture.gltf.json',g=>{try{
  g.scene.traverse(o=>{if(!o.isMesh)return;let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    // the kit's colours come as RGBA shorts; keep RGB floats so pieces merge into one attribute
    const C=geo.attributes.color,n=geo.attributes.position.count,c3=new Float32Array(n*3);
    // normalised shorts or bytes: this three.js hands back the raw integers, so scale them here
    const k=C&&C.normalized?(C.array instanceof Uint16Array?1/65535:C.array instanceof Uint8Array?1/255:1):1;
    for(let i=0;i<n;i++){c3[i*3]=C?C.getX(i)*k:.6;c3[i*3+1]=C?C.getY(i)*k:.6;c3[i*3+2]=C?C.getZ(i)*k:.6;}
    const out=new THREE.BufferGeometry();out.setAttribute('position',geo.attributes.position);out.setAttribute('normal',geo.attributes.normal);out.setAttribute('color',new THREE.BufferAttribute(c3,3));
    out.computeBoundingBox();FURN.P[o.name]=out;});
  FURN.mat=new THREE.MeshToonMaterial({vertexColors:true,gradientMap:TOON_GRAD});FURN.ready=!!FURN.P.sofa_a;
  if(FURN.ready){for(const a of FURN.wait)if(a[0].parent)furnish(...a);FURN.wait.length=0;}
}catch(e){console.warn('Furniture kit failed; the houses stay empty.',e);}},undefined,()=>{});}catch(e){}}
const _fm=new THREE.Matrix4(),_fr=new THREE.Matrix4(),_fs=new THREE.Matrix4(),_fn=new THREE.Matrix3(),_fv=new V3();
// lays out and merges one house's furniture; x/z in the house's frame (front +z), floor at y
function furnish(g,panes,s,o,hw,hd,y,seed,ch){
  if(hw<2.6||hd<2.4)return;ch=ch||CUR;
  if(!FURN.ready){FURN.wait.push([g,panes,s,o,hw,hd,y,seed,ch]);return;} // houses built before the kit loaded get theirs when it does
  const R=mulberry(seed|0),rr=(a,b)=>a+R()*(b-a),W=hw-.42,D=hd-.42,parts=[];
  // ground-floor panes in the house's frame: [x, z, nx, nz]
  const P=panes.filter(p=>p.min.y*s+o.y<2.3).map(p=>[p.c.x*s+o.x,p.c.z*s+o.z,p.n.x,p.n.z]);
  // a wall is free between a and b if no window on it overlaps that span
  const free=(wall,a,b)=>!P.some(([px,pz,nx,nz])=>wall==='back'?nz<-.6&&px>a-.3&&px<b+.3:wall==='front'?nz>.6&&px>a-.3&&px<b+.3:wall==='left'?nx<-.6&&pz>a-.3&&pz<b+.3:nx>.6&&pz>a-.3&&pz<b+.3);
  const put=(name,x,z,ry,sx)=>{if(FURN.P[name])parts.push([name,x,z,ry||0,sx||1]);};
  const dims=n=>{const b=FURN.P[n].boundingBox;return[b.max.x-b.min.x,b.max.z-b.min.z];};
  const split=hw*2>=7.2,L0=-W,L1=split?-.15:W,R0=.15,R1=W,lc=(L0+L1)/2,rc=(R0+R1)/2,lw=L1-L0;
  // living room
  put(R()<.5?'rug_a':'rug_b',lc,rr(-.3,.3),0);
  const sofa=R()<.5&&lw>2.8?'sofa_a':'sofa_b',[sw,sd]=dims(sofa);
  put(sofa,lc,-D+sd/2+.05,0);put('coffee_table',lc+rr(-.2,.2),-D+sd+.75,rr(-.15,.15));
  if(lw>3.2)put(R()<.5?'armchair_a':'armchair_b',lc+Math.min(lw/2-.6,sw/2+.55),-D+sd+.8,-Math.PI/2+rr(-.4,.2));
  if(free('front',lc-.7,lc+.7))put('tv',lc,D-.25,Math.PI);else if(lw>3.6)put('tv',L0+.25,0,Math.PI/2);
  if(free('left',-D,-D+1))put('bookshelf',L0+.18,-D+.6,Math.PI/2);
  put('lamp',L0+.35,-D+.35,0);
  if(split){const doorZ=rr(-D+1.4,D-1.4);   // a partition with a doorway in it
    for(const [a,b] of [[-D,doorZ-.55],[doorZ+.55,D]])if(b-a>.2)put('wall',0,(a+b)/2,Math.PI/2,b-a);}
  // the other side: a kitchen and dining table, or a bedroom
  const kit=R()<.55,rw=split?R1-R0:0;
  if(split&&kit){
    if(free('back',rc-1.3,rc+1.3)&&rw>2.6){put('kitchen',rc-.2,-D+.32,0);put('fridge',Math.min(R1-.4,rc+1.4),-D+.38,0);}
    else if(free('right',-D,-D+2.5)){put('kitchen',R1-.32,-D+1.35,-Math.PI/2);put('fridge',R1-.38,-D+.4+2.55,-Math.PI/2);}
    put('dining',rc,rr(.2,D-1.2),rr(-.3,.3));
  }else if(split){
    put(R()<.5?'bed_a':'bed_b',rc,-D+1.08,0);
    if(free('right',.2,1.4))put('dresser',R1-.28,.8,-Math.PI/2);else put('dresser',rc+rr(-.4,.4),D-.3,Math.PI);
    put(R()<.5?'rug_a':'rug_b',rc,.9,Math.PI/2);
  }
  // signs of the end: a chair on its side, papers and boards, sometimes
  if(R()<.6)put('chair_down',rr(-W+.8,W-.8),rr(-D+2,D-.8),rr(0,6.28));
  if(R()<.7)put('debris',rr(-W+1,W-1),rr(-D+1.5,D-1),rr(0,6.28));
  let n=0;for(const p of parts)n+=FURN.P[p[0]].attributes.position.count;
  const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let k=0;
  const tint=.85+R()*.25;
  for(const [name,x,z,ry,sx] of parts){const G=FURN.P[name],A=G.attributes.position,N=G.attributes.normal,C=G.attributes.color;
    _fm.makeTranslation(x,y,z).multiply(_fr.makeRotationY(ry)).multiply(_fs.makeScale(sx,1,1));_fn.getNormalMatrix(_fm);
    for(let i=0;i<A.count;i++,k++){_fv.fromBufferAttribute(A,i).applyMatrix4(_fm);pos[k*3]=_fv.x;pos[k*3+1]=_fv.y;pos[k*3+2]=_fv.z;
      _fv.fromBufferAttribute(N,i).applyMatrix3(_fn).normalize();nor[k*3]=_fv.x;nor[k*3+1]=_fv.y;nor[k*3+2]=_fv.z;
      col[k*3]=C.getX(i)*tint;col[k*3+1]=C.getY(i)*tint;col[k*3+2]=C.getZ(i)*tint;}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.Mesh(geo,FURN.mat);m.receiveShadow=true;g.add(m);if(ch)ch.geos.push(geo);
}
