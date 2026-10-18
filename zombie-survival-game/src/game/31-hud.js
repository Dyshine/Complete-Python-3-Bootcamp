/* ================= HUD ================= */
const toasts=$('toasts');
function toast(html,cls){const d=document.createElement('div');d.className='toast '+(cls||'');d.innerHTML=html;toasts.appendChild(d);
  while(toasts.children.length>5)toasts.firstChild.remove();setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),500);},3600);}
let bannerTimer=null;
function banner(h,p,cls){const b=$('banner');b.className=cls||'';b.querySelector('h2').textContent=h;b.querySelector('p').textContent=p||'';b.style.opacity='1';clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>b.style.opacity='0',3200);}
function refreshSlots(){
  $('slots').innerHTML=SLOTS.map((k,i)=>{const I=LO[k];if(!I)return'';const w=wstat(I);return`<div class="slot ${player.weapon===k?'on':''}" style="border-color:${w.col}">${(i+1)%10} ${w.short}</div>`;}).join('');
}
const fmtT=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
function glyph(act){
  if(pad.active)return{use:'<kbd class="pb pa">A</kbd>',base:'<kbd class="pb py">Y</kbd>',night:'<kbd class="pb pl">View</kbd>'}[act];
  if(isTouch)return`<kbd class="k">${{use:'Use',base:'Base',night:'Night'}[act]}</kbd>`;
  return`<kbd class="k">${{use:'E',base:'B',night:'T'}[act]}</kbd>`;
}
function updateHUD(){
  const I=curW(),w=wstat(I);
  $('hpNum').textContent=Math.ceil(player.hp);$('hpBar').style.width=(player.hp/player.maxHp*100)+'%';$('stBar').style.width=player.st+'%';
  $('medNum').textContent=player.med;$('grenNum').textContent=player.gren;
  $('scrapNum').textContent=player.scrap;$('partsNum').textContent=player.parts;$('woodNum').textContent=player.wood|0;$('stoneNum').textContent=player.stone|0;$('foodNum').textContent=player.food|0;$('hideNum').textContent=player.hide|0;
  $('wName').innerHTML=`<span style="color:${w.col}">${w.name}</span>`;
  $('wAmmo').innerHTML=w.saw?`${Math.ceil(I.mag/10)}s <small>fuel · ${comp.CHM} chem</small>`:w.melee?'<small>melee</small>':w.battery?`${Math.floor(I.mag)} <small>/ battery</small>`:`${I.mag} <small>/ ${w.infinite?'∞':ammo[w.ammo]}</small>`;
  {const d=wdur(I);$('durBar').style.width=d+'%';$('durBar').style.background=d<=0?'#6a2a24':d<25?'#d6432f':d<60?'#f2a516':'#9bd651';$('durTxt').textContent=d<=0?'BROKEN':`${Math.round(d)}%`;}
  $('reloadFill').style.width=player.reloadT>0?((1-player.reloadT/(player.reloadMax||1))*100)+'%':'0';
  const pct=homeIntegrity();
  $('wallBar').style.width=pct+'%';$('wallPct').textContent=pct+'%';
  {const hd=HOME.door,wins=hsegs.filter(s=>s.kind==='win'),wb=wins.filter(s=>!homeSolid(s)).length,bo=wins.filter(s=>s.st.boards).length,go=base.wallLv?gates.filter(g=>g.alive&&g.open).map(g=>g.side):[];
  $('gateLine').innerHTML=`Door: ${!hd.alive?'<b class="warn">smashed</b>':hd.open?`<b class="${S.phase==='night'?'warn':''}">open</b>`:'<b>shut</b>'} · windows: ${wb?`<b class="warn">${wb} open</b>`:'<b>secure</b>'}${bo?` · ${bo} boarded`:''}${go.length?` · <b class="warn">${go.join(', ')} gate open</b>`:''}`;}
  const bd=Math.hypot(player.x,player.z),ch=chunks.get(Math.floor(player.x/CH)+','+Math.floor(player.z/CH));
  $('zoneLine').textContent=`${EXP.here||BIOME_NAME[ch?ch.biome:'farm']} · ${bd<BR+4?'at the farmstead':`base ${Math.round(bd)}m ${compass(Math.atan2(-player.x,-player.z))}`}`;
  let hh=null,hd=1e9;for(const h of hordes){if(h.alive<=0)continue;const d=Math.hypot(h.cx-player.x,h.cz-player.z);if(d<hd){hd=d;hh=h;}}
  if(hh&&(hd<110||base.radar||hh.known)){const st=hh.state==='hunt'?'hunting you':hh.state==='siege'?'marching on the farmstead':'roaming';
    $('hordeLine').innerHTML=`Horde: <b class="${hh.state==='roam'?'':'warn'}">${hh.alive}</b> · ${Math.round(hd)}m ${compass(Math.atan2(hh.cx-player.x,hh.cz-player.z))} · ${st}`;}
  else $('hordeLine').innerHTML='Horde: <span>none in range</span>';
  $('seasonLine').innerHTML=seasonHUD();$('warmBar').style.width=(player.warm==null?100:player.warm)+'%';$('warmBar').className=(player.warm==null?100:player.warm)<35?'cold':'';updateQuickHUD();
  const wd=WEATHER[W.type];$('weatherLine').innerHTML=`Weather: <b>${wd.name}</b>${wd.note?` · <span>${wd.note}</span>`:''}`;
  const pl=$('phaseLabel');
  if(S.phase==='day'){pl.textContent=`DAY ${S.wave+1}`;pl.className='';$('phaseSub').textContent=`${clockStr()} · nightfall in ${fmtT(S.dayT)}`;$('phaseHint').innerHTML=`${glyph('night')} skip to nightfall`;$('phaseHint').hidden=pad.active;}
  else{pl.textContent=`NIGHT ${S.wave}`;pl.className='night';const left=S.queue.length+zombies.filter(z=>!z.dying&&z.always).length;$('phaseSub').textContent=`${clockStr()} · dawn in ${fmtT(CYCLE-S.clock)}${S.cleared?'':` · ${left} hunting`}`;$('phaseHint').hidden=true;}
  {const need=xpNeed(RPG.lv);$('lvTag').textContent=`LV ${RPG.lv}`;$('xpBar').style.width=(RPG.xp/need*100)+'%';$('ptsTag').textContent=RPG.pts?`${RPG.pts} PERK${RPG.pts>1?'S':''} · ${pad.active?'▶':'K'}`:'';
    RPG.popT-=.08;const xp=$('xpPop');if(RPG.pop>0&&RPG.popT>0){xp.textContent=`+${RPG.pop} XP`;xp.style.opacity=1;}else{xp.style.opacity=0;if(RPG.popT<=0)RPG.pop=0;}
    const jl=RPG.jobs.slice(0,3).map(j=>`<span><i>JOB</i> ${jobLine(j)}</span>`).join('');if(jl!==S.jobHTML){S.jobHTML=jl;$('jobLine').innerHTML=jl;}}
  $('lowhp').style.opacity=player.hp<35?(.5+.5*Math.sin(performance.now()/180))*(1-player.hp/35):0;
}
const mm=$('minimap'),mctx=mm.getContext('2d');
const MMR=70;
function drawMinimap(){
  const MW=mm.width,sc=MW/(MMR*2),px=player.x,pz=player.z,X=x=>(x-px)*sc+MW/2,Z=z=>(z-pz)*sc+MW/2;
  const edge=(x,z,pad)=>{const dx=x-px,dz=z-pz,m=Math.max(Math.abs(dx),Math.abs(dz))||1,k=Math.min(1,(MMR-(pad||5))/m);return[X(px+dx*k),Z(pz+dz*k),k<1];};
  mctx.fillStyle='#1b2016';mctx.fillRect(0,0,MW,MW);
  mctx.fillStyle='#2c302a';if(Math.abs(px)<MMR+4)mctx.fillRect(X(-3.5),0,7*sc,MW);if(Math.abs(pz)<MMR+4)mctx.fillRect(0,Z(-3.5),MW,7*sc);
  mctx.fillStyle='#3a3a30';for(const h of houses){const ex=h.ex||4,ez=h.ez||4;mctx.fillRect(X(h.x)-ex*sc,Z(h.z)-ez*sc,ex*2*sc,ez*2*sc);}
  if(base.wallLv){mctx.fillStyle='#4a4840';mctx.fillRect(X(-BR),Z(-BR),BR*2*sc,BR*2*sc);}
  mctx.fillStyle='#6a6050';for(let i=0;i<HOME.lv;i++){const r=HROOMS[i];mctx.fillRect(X(r[0]),Z(r[2]),(r[1]-r[0])*sc,(r[3]-r[2])*sc);}
  mctx.lineWidth=3;for(const s of hsegs){if(s.kind!=='win'&&s.kind!=='door')continue;mctx.strokeStyle=s.kind==='door'?(!HOME.door.alive?'#d6432f':HOME.door.open?'#f2a516':'#9bd651'):s.st.boards?'#e9c46a':s.st.glass?'#9fd4e6':'#d6432f';
    mctx.beginPath();if(s.horiz){mctx.moveTo(X(s.x0),Z(s.cz));mctx.lineTo(X(s.x1),Z(s.cz));}else{mctx.moveTo(X(s.cx),Z(s.z0));mctx.lineTo(X(s.cx),Z(s.z1));}mctx.stroke();}
  for(const s of (base.wallLv?segs:[])){
    if(s.door&&s.alive&&s.open)continue;
    mctx.strokeStyle=!s.alive?'#d6432f':s.door?'#9bd651':s.hp/s.maxHp<.4?'#f2a516':'#e9c46a';mctx.beginPath();
    if(s.horiz){mctx.moveTo(X(s.x0),Z(s.cz));mctx.lineTo(X(s.x1),Z(s.cz));}else{mctx.moveTo(X(s.cx),Z(s.z0));mctx.lineTo(X(s.cx),Z(s.z1));}mctx.stroke();}
  for(const c of crates){if(c.opened)continue;const d=Math.hypot(c.x-px,c.z-pz);if(d<(PERK('treasure')?60:32))c.seen=true;if(!(c.seen||base.radar||c.rar==='drop'))continue;
    const [cx,cz,off]=edge(c.x,c.z,4);if(off&&c.rar!=='drop')continue;
    mctx.fillStyle=c.rar==='relic'?'#f2a516':c.rar==='drop'?'#d6432f':c.rar==='epic'?'#e9c46a':c.rar==='rare'?'#5fa8d3':'#e8e2d0';const s=c.rar==='drop'?9:6;mctx.fillRect(cx-s/2,cz-s/2,s,s);}
  const vis=MMR*(1-.45*W.fog);
  for(const p of EXP.found.values()){if(p.kind!=='lm')continue;const [lx,lz]=edge(p.x,p.z,6);mctx.fillStyle=LM_T[p.type].col;mctx.save();mctx.translate(lx,lz);mctx.rotate(Math.PI/4);mctx.fillRect(-5,-5,10,10);mctx.restore();}
  for(const j of RPG.jobs){if(j.k!=='scout')continue;const [jx,jz]=edge(j.x,j.z,8);mctx.strokeStyle='#f2a516';mctx.lineWidth=2;mctx.beginPath();mctx.arc(jx,jz,7,0,6.28);mctx.stroke();}
  for(const a of animals){if(a.dead||a.type==='crow'||Math.hypot(a.x-px,a.z-pz)>vis*.7)continue;mctx.fillStyle=a.type==='wolf'?'#b0a8a0':'#c08a5a';mctx.beginPath();mctx.arc(X(a.x),Z(a.z),a.type==='wolf'?3.2:2.4,0,6.28);mctx.fill();}
  mctx.fillStyle='#d6432f';for(const z of zombies){if(z.dying)continue;if(!base.radar&&Math.hypot(z.x-px,z.z-pz)>vis)continue;if(Math.abs(z.x-px)>MMR||Math.abs(z.z-pz)>MMR)continue;
    const r=z.type==='boss'?6:z.type==='brute'?4:2.6;mctx.beginPath();mctx.arc(X(z.x),Z(z.z),r,0,6.28);mctx.fill();}
  mctx.fillStyle='#ff4a33';
  for(const a of agents){if(a.dying||Math.abs(a.x-px)>MMR||Math.abs(a.z-pz)>MMR)continue;if(!base.radar&&!a.h.known&&Math.hypot(a.x-px,a.z-pz)>vis*.8)continue;mctx.fillRect(X(a.x)-1.5,Z(a.z)-1.5,3,3);}
  for(const h of hordes){if(h.alive<=0||!(h.known||base.radar))continue;const [hx,hz,off]=edge(h.cx,h.cz,7);if(!off)continue;
    mctx.fillStyle=h.state==='roam'?'rgba(214,67,47,.6)':'#d6432f';mctx.beginPath();mctx.arc(hx,hz,6,0,6.28);mctx.fill();}
  const [bx,bz,boff]=edge(0,0,7);
  if(boff){mctx.fillStyle='#e9c46a';mctx.fillRect(bx-5,bz-5,10,10);mctx.fillStyle='#14170f';mctx.fillRect(bx-2,bz-2,4,4);}
  mctx.save();mctx.translate(MW/2,MW/2);mctx.rotate(-player.yaw+Math.PI);mctx.fillStyle='#f2a516';mctx.beginPath();mctx.moveTo(0,-8);mctx.lineTo(5.5,6);mctx.lineTo(-5.5,6);mctx.closePath();mctx.fill();mctx.restore();
}

