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
