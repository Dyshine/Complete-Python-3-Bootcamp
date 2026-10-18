/* ================= PHYSICS PROPS ================= */
const PK={
  crate:{geo:BOX(.9,.9,.9),col:0x7a5a38,r:.55,h:.45,mass:1.6},
  carton:{geo:BOX(.7,.55,.6),col:0xa8875a,r:.42,h:.28,mass:.5},
  tire:{geo:new THREE.TorusGeometry(.34,.15,6,12),col:0x1c1c1a,r:.48,h:.15,mass:.8,rot:[Math.PI/2,0,0]},
  cone:{geo:new THREE.ConeGeometry(.24,.7,8),col:0xe0662a,r:.3,h:.35,mass:.3},
  can:{geo:CYL(.32,.3,.9,10),col:0x5e6a6e,r:.38,h:.45,mass:.9},
  plank:{geo:BOX(1.6,.18,.45),col:0x7a5a3a,r:.55,h:.09,mass:.6},
};
const props=[];
function addProp(kind,x,z,o){
  o=o||{};const k=PK[kind];const g=new THREE.Group();const m=new THREE.Mesh(k.geo,o.mat||M(k.col));m.castShadow=true;m.receiveShadow=true;if(k.rot)m.rotation.set(k.rot[0],k.rot[1],k.rot[2]);g.add(m);
  g.position.set(x,k.h,z);g.rotation.y=rand(0,6.28);scene.add(g);
  const p={g,kind,x,y:k.h,z,vx:o.vx||0,vy:o.vy||0,vz:o.vz||0,r:k.r,h:k.h,mass:k.mass,spin:o.spin||0,tx:o.tx||0,tz:o.tz||0,hx:x,hz:z,temp:o.life||0,ground:false,chunk:CUR};
  props.push(p);if(CUR)CUR.props.push(p);return p;
}
function seedYardProps(){for(const [x,z] of [[-11,7],[-10,8.5],[11.2,-4.5],[8,8.5]])addProp(pick(['carton','crate']),x,z);}
function solidSeg(s){return s.home?homeSolid(s):base.wallLv>0&&s.alive&&!(s.door&&s.open);}
function updateProps(dt){
  for(let i=props.length-1;i>=0;i--){
    const p=props[i];
    if(p.temp){p.temp-=dt;if(p.temp<=0){scene.remove(p.g);props.splice(i,1);continue;}}
    p.vy-=GRAV*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    p.ground=false;
    if(p.y<=p.h){p.y=p.h;if(p.vy<-2.5){p.vy=-p.vy*.35;Sound.play('thud',clamp(-p.vy/8,.1,.6)*clamp(1-dist2p(p)/40,0,1));p.spin*=.6;}else p.vy=0;
      p.ground=true;const f=Math.exp(-(p.kind==='tire'?1.4:4.5)*dt);p.vx*=f;p.vz*=f;p.spin*=Math.exp(-4*dt);}
    const ox=p.x,oz=p.z;collideCircles(p,p.r);
    for(const s of ALLSEG){if(!solidSeg(s))continue;if(Math.abs(p.x-s.cx)>4.5||Math.abs(p.z-s.cz)>4.5)continue;collideSeg(p,p.r,s);}
    const mx=p.x-ox,mz=p.z-oz,ml=Math.hypot(mx,mz);
    if(ml>1e-4){const nx=mx/ml,nz=mz/ml,vn=p.vx*nx+p.vz*nz;if(vn<0){p.vx-=1.5*vn*nx;p.vz-=1.5*vn*nz;if(vn<-3)Sound.play('thud',.3);}}
    doorCollide(p,p.r,p.mass*.6);
    if(player.alive){const dx=p.x-player.x,dz=p.z-player.z,rr=p.r+.5,d2=dx*dx+dz*dz;
      if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,pen=rr-d;const pv=Math.max(0,player.vx*nx+player.vz*nz);
        p.x+=nx*pen;p.z+=nz*pen;const push=(pv*1.15+1.2)/Math.sqrt(p.mass);const cur=p.vx*nx+p.vz*nz;if(cur<push){p.vx+=nx*(push-cur);p.vz+=nz*(push-cur);}
        p.spin+=(Math.random()-.5)*pv*.8/p.mass;}}
    for(const z of zombies){if(z.dying)continue;const dx=p.x-z.x,dz=p.z-z.z,rr=p.r+z.def.r;if(Math.abs(dx)>rr||Math.abs(dz)>rr)continue;const d2=dx*dx+dz*dz;
      if(d2<rr*rr&&d2>1e-6){const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,pen=rr-d;const zm=z.def.scale*z.def.scale*1.5;const w=zm/(zm+p.mass);
        p.x+=nx*pen*w;p.z+=nz*pen*w;z.x-=nx*pen*(1-w);z.z-=nz*pen*(1-w);p.vx+=nx*pen*10*w;p.vz+=nz*pen*10*w;}}
  }
  for(let i=0;i<props.length;i++){const a=props[i];for(let j=i+1;j<props.length;j++){const b=props[j];const dx=b.x-a.x,dz=b.z-a.z,rr=a.r+b.r;if(Math.abs(dx)>rr||Math.abs(dz)>rr)continue;
    if(Math.abs(a.y-b.y)>(a.h+b.h)*1.4)continue;const d2=dx*dx+dz*dz;if(d2>=rr*rr||d2<1e-6)continue;const d=Math.sqrt(d2),nx=dx/d,nz=dz/d,pen=rr-d,wa=b.mass/(a.mass+b.mass);
    a.x-=nx*pen*wa;a.z-=nz*pen*wa;b.x+=nx*pen*(1-wa);b.z+=nz*pen*(1-wa);
    const rv=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(rv<0){const j2=-(1.4)*rv/(1/a.mass+1/b.mass);a.vx-=j2*nx/a.mass;a.vz-=j2*nz/a.mass;b.vx+=j2*nx/b.mass;b.vz+=j2*nz/b.mass;}}}
  for(const p of props){
    p.g.position.set(p.x,p.y,p.z);
    if(!p.ground){p.g.rotation.x+=p.tx*dt;p.g.rotation.z+=p.tz*dt;}
    else{const q=Math.PI/2;p.g.rotation.x=lerp(p.g.rotation.x,Math.round(p.g.rotation.x/q)*q,Math.min(1,dt*7));p.g.rotation.z=lerp(p.g.rotation.z,Math.round(p.g.rotation.z/q)*q,Math.min(1,dt*7));p.tx*=.5;p.tz*=.5;}
    p.g.rotation.y+=p.spin*dt;
  }
}
const dist2p=o=>Math.hypot(o.x-player.x,o.z-player.z);
function impulseProp(p,ix,iz,iy){p.vx+=ix/p.mass;p.vz+=iz/p.mass;p.vy+=(iy||0)/p.mass;p.spin+=rand(-1,1)*Math.hypot(ix,iz)/p.mass;p.tx+=rand(-1,1)*(iy||1)*1.5;p.tz+=rand(-1,1)*(iy||1)*1.5;}
function doorCollide(o,r,mass){
  for(const d of sdoors){const a=d.a0+d.ang,cx=Math.cos(a),cz=Math.sin(a);const vx=o.x-d.px,vz=o.z-d.pz;const lim=d.len+r+.3;if(vx*vx+vz*vz>lim*lim)continue;
    const t=clamp(vx*cx+vz*cz,0,d.len);const qx=d.px+cx*t,qz=d.pz+cz*t;let nx=o.x-qx,nz=o.z-qz;const dist=Math.hypot(nx,nz);const R=r+.08;if(dist>=R||dist<1e-5)continue;
    nx/=dist;nz/=dist;const pen=R-dist;const dotp=-cz*nx+cx*nz;
    const imp=dotp*pen*55*mass*(t/d.len+.25);d.angV-=imp;if(Math.abs(imp)>.9)d.tgt=null;
    if(o===player&&player.sprinting&&!doorOpen(d)&&(S.time-(d.bargeT||-9))>.6){d.bargeT=S.time;d.tgt=null;d.angV-=Math.sign(dotp||1)*7;Sound.play('door',1);S.shake=Math.max(S.shake,.1);rumble(.3,.2,90);}
    o.x+=nx*pen*.7;o.z+=nz*pen*.7;
    if(Math.abs(d.angV)>2)Sound.play('door',.4*clamp(1-dist2p(o)/30,0,1));}
}
function updateDoors(dt){stepDoors(dt);
  for(const d of sdoors){d.ang+=d.angV*dt;d.angV*=Math.exp(-2.2*dt);
    if(d.ang>1.85){d.ang=1.85;d.angV*=-.35;}if(d.ang<-1.85){d.ang=-1.85;d.angV*=-.35;}
    d.g.rotation.y=-(d.a0+d.ang);}
  for(const s of gates){const tgt=s.open?1:0;s.openAmt+=(tgt-s.openAmt)*Math.min(1,dt*5);s.pL.rotation.y=s.phi*s.openAmt;s.pR.rotation.y=-s.phi*s.openAmt;}
}

