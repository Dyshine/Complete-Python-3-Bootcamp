/* ================= ZOMBIE SKINS (hand-inked outfit atlas + grime/blood shader) ================= */
// shared GLSL: value noise for grime, rot and blood, driven per zombie by seed/blood/hue
const GRIME_GLSL=`
float gH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float gN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(gH(i),gH(i+vec3(1,0,0)),f.x),mix(gH(i+vec3(0,1,0)),gH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(gH(i+vec3(0,0,1)),gH(i+vec3(1,0,1)),f.x),mix(gH(i+vec3(0,1,1)),gH(i+vec3(1,1,1)),f.x),f.y),f.z);}
// forced clothing colour: the band between the shoes and the collar, hands excluded (p is bind-pose space, feet 0, head 1)
vec3 gForce(vec3 c,vec3 p,vec3 f){if(f.x+f.y+f.z<.01)return c;float band=smoothstep(.06,.1,p.y)*(1.-smoothstep(.76,.8,p.y))*(1.-smoothstep(.3,.36,abs(p.x)));float lum=dot(c,vec3(.3,.59,.11));return mix(c,f*(.25+1.25*lum),band*.92);}
vec3 gHue(vec3 c,float a){const vec3 k=vec3(.57735);float ca=cos(a);return c*ca+cross(k,c)*sin(a)+k*dot(k,c)*(1.-ca);}
vec3 grime(vec3 col,vec3 p,float seed,float blood,float hue){
  float mx=max(col.r,max(col.g,col.b)),mn=min(col.r,min(col.g,col.b));float sat=(mx-mn)/(mx+.001);
  col=mix(col,gHue(col,hue),smoothstep(.3,.6,sat));
  float n=gN(p*6.+seed),n2=gN(p*19.+seed*1.7);
  col*=1.-(smoothstep(.42,0.,p.y)*.45+smoothstep(.55,.85,n)*.3);
  col=mix(col,col*vec3(.86,.98,.74),.35*n2);
  float b=n*.6+n2*.4+(p.y>.5&&p.y<.86?.1:0.);
  float bm=smoothstep(1.02-blood*.6,1.08-blood*.6,b);
  return mix(col,vec3(.34,.03,.02)*(.65+n2*.6),bm*.92);}
`;
function grimeUniforms(m){const u={uSeed:{value:rand(0,50)},uBlood:{value:rand(.12,.4)},uHue:{value:pick([0,0,.4,.8,2.5,3.0])},uForce:{value:new THREE.Vector3(0,0,0)}};m.userData.grime=u;return u;}
// GLB zombies: grime in normalised bind-pose space (feet y=0, head y=1)
function applyGrime(m,mn,inv){
  const u=m.userData.grime||grimeUniforms(m);
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
    sh.vertexShader='varying vec3 vGP;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vGP=(position-vec3(${mn.x.toFixed(4)},${mn.y.toFixed(4)},${mn.z.toFixed(4)}))*${inv.toFixed(5)};`);
    sh.fragmentShader='varying vec3 vGP;uniform float uSeed,uBlood,uHue;uniform vec3 uForce;\n'+GRIME_GLSL+sh.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\n diffuseColor.rgb=gForce(grime(diffuseColor.rgb,vGP,uSeed,uBlood,uHue),vGP,uForce);');};
  m.customProgramCacheKey=()=>'grime'+mn.y.toFixed(3)+inv.toFixed(4);
  return u;
}
function bloodUp(z,amt){const seen=new Set();for(const m of z.mats||[]){const g=m.userData.grime;if(g&&!seen.has(g)){seen.add(g);g.uBlood.value=Math.min(1,g.uBlood.value+amt);}}}

// horde outfit atlas: 4x2 outfits, each cell laid out as torso front/back/side, face, head, arm, leg
const HCELL={TF:[0,0,.5,.5],TB:[.5,0,1,.5],TS:[.5,.5,.75,.75],HF:[0,.5,.25,.75],HS:[.25,.5,.5,.75],EY:[.75,.5,1,.75],AR:[0,.75,.25,1],LG:[.25,.75,.5,1]};
const OUTFITS=[
  {n:'office',  skin:'#a3ad86',shirt:'#e4dccb',pants:'#3b3d42',shoe:'#1c1a18',tie:'#a3282a'},
  {n:'flannel', skin:'#6f5a3f',shirt:'#9e2b25',plaid:'#2a1d1a',pants:'#3f5878',shoe:'#4a3423'},
  {n:'hazard',  skin:'#8b7a59',shirt:'#c85a1a',stripe:'#d8c95a',pants:'#475a76',shoe:'#3a2c1e',hat:'#f2c21b'},
  {n:'hoodie',  skin:'#9cab7c',shirt:'#4f6b3a',pants:'#2b2c2f',shoe:'#d8d2c2',pocket:1},
  {n:'tank',    skin:'#5b4a35',shirt:'#d9d2b9',pants:'#5c6140',shoe:'#2a241c',tank:1,camo:'#3e432a'},
  {n:'scrubs',  skin:'#b0a585',shirt:'#3f8f8a',pants:'#3f8f8a',shoe:'#e0ddd2',vneck:1},
  {n:'cop',     skin:'#76664a',shirt:'#2b3a5e',pants:'#212a40',shoe:'#121212',badge:'#e9c46a'},
  {n:'farmer',  skin:'#8f8a68',shirt:'#e0b43c',pants:'#3d5f8e',shoe:'#4a3423',overalls:1},
];
function paintHordeAtlas(){
  const C=256,cv=document.createElement('canvas');cv.width=C*4;cv.height=C*2;const g=cv.getContext('2d');
  const R=mulberry(9173),r=(a,b)=>a+R()*(b-a);
  const shade=(hex,k)=>{const c=new THREE.Color(hex);c.multiplyScalar(k);return '#'+c.getHexString();};
  const ink='#120d0a';
  OUTFITS.forEach((o,i)=>{
    const ox=(i%4)*C,oy=Math.floor(i/4)*C;
    const box=k=>{const b=HCELL[k];return [ox+b[0]*C,oy+b[1]*C,(b[2]-b[0])*C,(b[3]-b[1])*C];};
    const hatch=(x,y,w,h,col,n,len)=>{g.strokeStyle=col;g.lineWidth=1.6;g.beginPath();for(let k=0;k<n;k++){const a=r(x,x+w),b=r(y,y+h);g.moveTo(a,b);g.lineTo(a+len,b-len);}g.stroke();};
    const splat=(x,y,s)=>{g.fillStyle=pick2(['#5e0c08','#7a120c','#4a0806']);g.beginPath();g.arc(x,y,s,0,6.28);g.fill();
      for(let k=0;k<6;k++){const a=r(0,6.28),d=r(s,s*2.4);g.beginPath();g.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,r(s*.15,s*.4),0,6.28);g.fill();}
      g.fillRect(x-s*.15,y,s*.3,r(s,s*3));};
    const pick2=a=>a[Math.floor(R()*a.length)];
    const tear=(x,y,w,h)=>{g.fillStyle=o.skin;g.strokeStyle=ink;g.lineWidth=2.5;g.beginPath();
      for(let k=0;k<9;k++){const a=k/9*6.28,rr=(k%2?.55:1)*r(.8,1.1);g.lineTo(x+Math.cos(a)*w*rr,y+Math.sin(a)*h*rr);}g.closePath();g.fill();g.stroke();
      g.fillStyle='#6d1610';g.beginPath();g.arc(x,y,Math.min(w,h)*.35,0,6.28);g.fill();};
    const frame=(x,y,w,h)=>{g.strokeStyle=ink;g.lineWidth=5;g.strokeRect(x+2.5,y+2.5,w-5,h-5);};
    // ---- torso (front, back, side) ----
    for(const k of ['TF','TB','TS']){const [x,y,w,h]=box(k);
      g.fillStyle=o.tank?o.skin:o.shirt;g.fillRect(x,y,w,h);
      if(o.tank){g.fillStyle=o.shirt;g.fillRect(x+w*.2,y+h*.12,w*.6,h*.88);}
      if(o.plaid){g.globalAlpha=.55;g.fillStyle=o.plaid;for(let q=0;q<w;q+=w/5)g.fillRect(x+q,y,w/14,h);for(let q=0;q<h;q+=h/5)g.fillRect(x,y+q,w,h/14);g.globalAlpha=1;}
      if(o.stripe){g.fillStyle=o.stripe;g.fillRect(x,y+h*.55,w,h*.09);g.fillRect(x,y+h*.75,w,h*.09);if(k!=='TS'){g.fillRect(x+w*.18,y,w*.1,h);g.fillRect(x+w*.72,y,w*.1,h);}}
      if(o.overalls){g.fillStyle=o.pants;g.fillRect(x,y+h*.5,w,h*.5);if(k==='TF')g.fillRect(x+w*.25,y+h*.25,w*.5,h*.3);if(k!=='TS'){g.fillRect(x+w*.22,y,w*.1,h*.5);g.fillRect(x+w*.68,y,w*.1,h*.5);}
        g.fillStyle='#d9c27a';if(k==='TF'){g.fillRect(x+w*.24,y+h*.22,w*.06,w*.06);g.fillRect(x+w*.7,y+h*.22,w*.06,w*.06);}}
      if(k==='TF'){
        if(o.tie){g.fillStyle='#cfc6b2';g.beginPath();g.moveTo(x+w*.38,y);g.lineTo(x+w*.5,y+h*.14);g.lineTo(x+w*.62,y);g.fill();
          g.fillStyle=o.tie;g.beginPath();g.moveTo(x+w*.46,y+h*.08);g.lineTo(x+w*.54,y+h*.08);g.lineTo(x+w*.57,y+h*.6);g.lineTo(x+w*.5,y+h*.68);g.lineTo(x+w*.43,y+h*.6);g.fill();g.strokeStyle=ink;g.lineWidth=2;g.stroke();
          g.fillStyle=ink;for(let q=0;q<4;q++)g.fillRect(x+w*.5-2,y+h*(.72+q*.07),4,4);}
        if(o.pocket){g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(x+w*.25,y+h*.6,w*.5,h*.25);g.beginPath();g.moveTo(x+w*.42,y);g.lineTo(x+w*.4,y+h*.3);g.moveTo(x+w*.58,y);g.lineTo(x+w*.6,y+h*.3);g.stroke();}
        if(o.vneck){g.fillStyle=o.skin;g.beginPath();g.moveTo(x+w*.36,y);g.lineTo(x+w*.5,y+h*.24);g.lineTo(x+w*.64,y);g.fill();g.strokeStyle=ink;g.lineWidth=2.5;g.stroke();g.strokeRect(x+w*.62,y+h*.32,w*.18,h*.14);}
        if(o.badge){g.fillStyle=o.badge;g.beginPath();for(let q=0;q<10;q++){const a=q/10*6.28-1.57,rr=q%2?6:13;g.lineTo(x+w*.3+Math.cos(a)*rr,y+h*.3+Math.sin(a)*rr);}g.fill();g.strokeStyle=ink;g.lineWidth=2;g.stroke();
          g.strokeRect(x+w*.58,y+h*.24,w*.2,h*.14);g.fillStyle=ink;g.fillRect(x+w*.48,y,3,h);}
      }
      if(o.camo){}
      hatch(x,y+h*.55,w,h*.45,shade(o.overalls?o.pants:o.shirt,.55),18,8);
      hatch(x+w*.75,y,w*.25,h,shade(o.shirt,.6),10,7);
      for(let q=0;q<(k==='TS'?1:2);q++)if(R()<.8)tear(x+r(w*.2,w*.8),y+r(h*.25,h*.8),r(8,16),r(7,13));
      for(let q=0;q<(k==='TS'?1:3);q++)splat(x+r(w*.1,w*.9),y+r(h*.1,h*.7),r(4,10));
      frame(x,y,w,h);
    }
    // ---- face ----
    {const [x,y,w,h]=box('HF');g.fillStyle=o.skin;g.fillRect(x,y,w,h);
      if(o.hat){g.fillStyle=o.hat;g.fillRect(x,y,w,h*.24);g.fillStyle=ink;g.fillRect(x,y+h*.22,w,4);}
      g.fillStyle=shade(o.skin,.45);for(const s of [-1,1]){g.beginPath();g.ellipse(x+w*(.5+s*.22),y+h*.42,w*.15,h*.12,0,0,6.28);g.fill();}
      g.strokeStyle=ink;g.lineWidth=3.5;g.beginPath();g.moveTo(x+w*.12,y+h*.3);g.lineTo(x+w*.42,y+h*.36);g.moveTo(x+w*.88,y+h*.3);g.lineTo(x+w*.58,y+h*.36);g.stroke();
      g.fillStyle='#2a0d0a';g.fillRect(x+w*.22,y+h*.66,w*.56,h*.16);
      g.fillStyle='#d9cfa8';for(let q=0;q<6;q++)if(R()<.8)g.fillRect(x+w*(.24+q*.09),y+h*(.66+(q%2)*.1),w*.06,h*.06);
      g.strokeStyle=ink;g.lineWidth=3;g.strokeRect(x+w*.22,y+h*.66,w*.56,h*.16);
      g.lineWidth=2;g.beginPath();g.moveTo(x+w*.48,y+h*.48);g.lineTo(x+w*.44,y+h*.58);g.lineTo(x+w*.52,y+h*.58);g.stroke();
      if(R()<.6)tear(x+w*r(.18,.82),y+h*r(.5,.6),r(5,8),r(4,7));
      hatch(x+w*.72,y+h*.3,w*.28,h*.7,shade(o.skin,.5),9,6);splat(x+w*r(.2,.8),y+h*.86,r(3,6));frame(x,y,w,h);}
    {const [x,y,w,h]=box('HS');g.fillStyle=o.skin;g.fillRect(x,y,w,h);if(o.hat){g.fillStyle=o.hat;g.fillRect(x,y,w,h*.24);}
      g.fillStyle=shade(o.skin,.4);g.fillRect(x,y+h*(o.hat?.24:0),w,h*.18);
      hatch(x,y+h*.4,w,h*.6,shade(o.skin,.5),14,6);if(R()<.7)tear(x+w*.5,y+h*.6,8,6);frame(x,y,w,h);}
    {const [x,y,w,h]=box('EY');g.fillStyle='#ffffff';g.fillRect(x,y,w,h);}
    // ---- arm: sleeve on top, rotting skin and hand below ----
    {const [x,y,w,h]=box('AR');g.fillStyle=o.skin;g.fillRect(x,y,w,h);
      const sl=o.tank?0:o.vneck||o.overalls?.3:.55;g.fillStyle=o.overalls?o.shirt:o.shirt;g.fillRect(x,y,w,h*sl);
      if(o.plaid){g.globalAlpha=.55;g.fillStyle=o.plaid;for(let q=0;q<w;q+=w/3)g.fillRect(x+q,y,w/10,h*sl);g.globalAlpha=1;}
      if(sl){g.fillStyle=ink;g.fillRect(x,y+h*sl-3,w,5);}
      g.fillStyle=shade(o.skin,.6);g.fillRect(x,y+h*.86,w,h*.14);
      hatch(x,y+h*sl,w,h*(1-sl),shade(o.skin,.5),10,5);tear(x+w*.5,y+h*r(.6,.8),6,7);splat(x+w*.5,y+h*.92,4);frame(x,y,w,h);}
    // ---- leg: pants and shoes ----
    {const [x,y,w,h]=box('LG');g.fillStyle=o.pants;g.fillRect(x,y,w,h);
      if(o.camo){g.fillStyle=o.camo;for(let q=0;q<8;q++){g.beginPath();g.ellipse(x+r(0,w),y+r(0,h*.8),r(6,14),r(4,9),r(0,3),0,6.28);g.fill();}}
      g.fillStyle=o.shoe;g.fillRect(x,y+h*.8,w,h*.2);g.fillStyle=ink;g.fillRect(x,y+h*.8-2,w,4);
      hatch(x,y,w,h*.8,shade(o.pants,.55),12,6);if(R()<.7)tear(x+w*.5,y+h*r(.3,.6),7,9);splat(x+w*r(.3,.7),y+h*.2,r(3,6));frame(x,y,w,h);}
  });
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t;
}

