/* ================= WEATHER FRONTS AND GROUND FOG =================
   Weather no longer only changes at dusk and dawn: fronts roll through all day. Each front lasts a few minutes and picks
   its successor from the season's table, weighted toward what weather can plausibly turn into next (clear clouds over,
   overcast rains, rain builds to a storm or clears, fog burns off), with its own strength and a gusting wind.
   Ground fog is its own layer: soft banks of mist that drift with the wind and hug the ground. They gather on calm
   mornings and in hollows and by water, thicken into a real fog in fog weather and blizzards, and thin out with wind
   and sun. */
const WX_NEXT={
  clear:{clear:2,overcast:2.2,windy:1,heat:1,fog:.6},overcast:{overcast:1.6,clear:1.4,rain:2.2,windy:1,fog:1,snow:1.5},
  rain:{rain:1.6,storm:1.4,overcast:1.8,fog:.8},storm:{rain:2.4,overcast:1,storm:.8},fog:{fog:1.4,overcast:1.8,clear:1.3,rain:.6},
  windy:{windy:1.2,overcast:1.6,clear:1.6,rain:1},heat:{heat:1.6,clear:2,storm:1.1},snow:{snow:1.8,blizzard:1.1,overcast:1.4,fog:.8},
  blizzard:{snow:2.2,blizzard:.8,overcast:1},ash:{ash:1,overcast:2,fog:1}};
const FRONT={t:150,str:1,gust:0,gustT:0};
function nextFront(night){
  const pool=typeof SEASON_WEATHER!=='undefined'&&S.running?SEASON_WEATHER[seasonIdx()]:[['clear',3],['overcast',2.5],['rain',1.6],['fog',.9]];
  const aff=WX_NEXT[W.type]||{},L=pool.map(([t,w])=>[t,w*(aff[t]==null?.35:aff[t])*(night&&(t==='fog'||t==='storm')?1.3:1)]);
  if(Math.random()<.03&&S.wave>=2)L.push(['ash',1]);
  let s=0;for(const p of L)s+=p[1];let r=Math.random()*s;for(const p of L){r-=p[1];if(r<=0)return p[0];}return W.type;}
// called every frame from updateWeather: count down the front, roll the next, gust the wind
function updateFronts(dt){
  if(!S.running||S.over)return;FRONT.t-=dt;
  if(FRONT.t<=0){const was=W.type,t=nextFront(S.phase==='night');FRONT.t=rand(110,260)*(t==='storm'||t==='blizzard'?.6:1);FRONT.str=rand(.65,1.2);
    if(t!==was)setWeather(t,true);}
  FRONT.gustT-=dt;if(FRONT.gustT<=0){FRONT.gustT=rand(2,7);FRONT.gust=Math.random()<.35?rand(.2,.7)*(W.type==='clear'||W.type==='heat'?.5:1):0;}
}
/* ---- ground fog: big soft billboards, faded out near the camera so you walk through a bank rather than into a card ---- */
const MIST_N=GFX==='high'?70:40;
const MIST_TEX=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  for(let i=0;i<26;i++){const x=rand(30,98),y=rand(40,88),r=rand(14,40),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);}
  const m=g.createRadialGradient(64,64,20,64,64,64);m.addColorStop(0,'rgba(0,0,0,0)');m.addColorStop(1,'rgba(0,0,0,1)');g.globalCompositeOperation='destination-out';g.fillStyle=m;g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);})();
const MIST=[];
for(let i=0;i<MIST_N;i++){const m=new THREE.SpriteMaterial({map:MIST_TEX,color:0xdfe3e2,transparent:true,opacity:0,depthWrite:false,fog:true});m.userData.noTerrain=true;
  const s=new THREE.Sprite(m);s.visible=false;s.renderOrder=3;scene.add(s);MIST.push({s,x:rand(-55,55),z:rand(-55,55),h:rand(.5,2.6),k:rand(10,22),ph:rand(0,6.28),o:rand(.5,1)});}
let MIST_AMT=0;
function updateMist(dt){
  const h=clockHours(),morning=h>=4.5&&h<9?1-sstep(7.5,9,h):0,night=S.env||0;
  const calm=1-clamp((W.wind+FRONT.gust-.25)/.8,0,1);
  // how misty it is: fog weather and blizzards, calm mornings and nights, a little in rain; low ground and water gather more
  let want=Math.max(W.fog*1.05,(morning*.75+night*.35)*calm,W.rain*.25,W.snow*.4)*(1-.6*(W.type==='heat'?1:0));
  MIST_AMT+=(want-MIST_AMT)*Math.min(1,dt*.15);
  const vis=MIST_AMT>.02;const cx=player.x,cz=player.z,c=camera.position,wx=Math.cos(W.wdir)*(W.wind+FRONT.gust)*1.6,wz=Math.sin(W.wdir)*(W.wind+FRONT.gust)*1.6;
  const col=_mc.copy(scene.fog.color).lerp(_mw,.55);
  for(const M of MIST){if(!vis){M.s.visible=false;continue;}
    M.x+=wx*dt;M.z+=wz*dt;
    if(M.x>60)M.x-=120;else if(M.x<-60)M.x+=120;if(M.z>60)M.z-=120;else if(M.z<-60)M.z+=120;
    const x=cx+M.x,z=cz+M.z,gy=gH(x,z),low=clamp((2-gy)/6,0,1)+clamp(depthAt(x,z)+1.5,0,1)*.5;
    const amt=MIST_AMT*(.55+.45*low+.25*Math.sin(W.time*.2+M.ph));
    const dc=Math.hypot(x-c.x,z-c.z),near=clamp((dc-3)/8,0,1),far=1-clamp((Math.hypot(M.x,M.z)-42)/18,0,1);
    M.s.material.opacity=clamp(amt*.32*M.o*near*far,0,.5);M.s.visible=M.s.material.opacity>.01;
    M.s.material.color.copy(col);
    M.s.position.set(x,gy+M.h+Math.sin(W.time*.3+M.ph)*.2,z);M.s.scale.set(M.k,M.k*.42,1);}
  // the scene fog closes in with the mist
  if(MIST_AMT>.05){scene.fog.near*=1-.45*MIST_AMT;scene.fog.far*=1-.35*MIST_AMT;}
}
const _mc=new THREE.Color(),_mw=new THREE.Color(0xe6eae8);
