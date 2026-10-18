/* ================= DAMAGE NUMBERS ================= */
const DN=[];let dnI=0,CRITF=false;
{const L=document.getElementById('dmgLayer');for(let i=0;i<56;i++){const e=document.createElement('div');e.className='dmgn';e.style.display='none';L.appendChild(e);DN.push({e,life:0,x:0,y:0,z:0,vx:0,amt:0,tgt:null,t0:0});}}
function dmgNum(t,amt,kind,y){
  if(!S.running||!(amt>0)||!t)return;if(Math.hypot(t.x-player.x,t.z-player.z)>48)return;
  const now=performance.now();
  // rapid hits on the same target (SMG, chainsaw, pellets) add up on one rising number
  if(t._dn&&t._dn.tgt===t&&t._dn.life>0&&now-t._dn.t0<380&&kind!=='kill'){const d=t._dn;d.amt+=amt;d.t0=now;d.life=Math.max(d.life,.8);d.e.textContent=Math.round(d.amt);if(kind)d.e.className='dmgn '+kind;return;}
  const d=DN[dnI=(dnI+1)%DN.length];
  Object.assign(d,{tgt:t,amt,life:.95,x:t.x+rand(-.25,.25),z:t.z+rand(-.25,.25),y:y+(t.lvlY||0),vx:rand(-.5,.5),t0:now});
  d.e.textContent=Math.round(amt);d.e.className='dmgn '+(kind||'');d.e.style.display='';if(kind!=='kill')t._dn=d;else t._dn=null;
}
function updateDmgNums(dt){
  for(const d of DN){if(d.life<=0)continue;d.life-=dt;if(d.life<=0){d.e.style.display='none';continue;}
    const k=1-d.life/.95;projV.set(d.x+d.vx*k,d.y+gH(d.x,d.z)+k*1.4,d.z).project(camera);
    if(projV.z>1||Math.abs(projV.x)>1.2||Math.abs(projV.y)>1.2){d.e.style.opacity=0;continue;}
    const sc=k<.12?1.5-k*4.2:1;
    d.e.style.transform=`translate(${((projV.x+1)/2*innerWidth).toFixed(1)}px,${((1-projV.y)/2*innerHeight).toFixed(1)}px) translate(-50%,-50%) scale(${sc.toFixed(2)})`;
    d.e.style.opacity=Math.min(1,d.life*2.6);}
}
function clearDmgNums(){for(const d of DN){d.life=0;d.e.style.display='none';}}

