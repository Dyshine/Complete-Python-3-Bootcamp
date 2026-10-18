/* ================= OVERLAYS: world map (M) and survivor sheet (K) ================= */
let mapZ=1;const MAPZ=[1,2,4],mapCv=$('worldMap'),mapCtx=mapCv.getContext('2d');
function openPanel(id){if(!S.running||S.over||S.menu||S.paused||S.panel)return;closeLoot();S.panel=id;unlockMouse();clearDmgNums();clearStealthHUD();mouseDown=false;mouseR=false;
  $(PANEL_ID[id]).hidden=false;document.body.classList.remove('playing');if(id==='map')drawMap();else if(id==='craft')renderCraft();else renderSkills();
  if(pad.active)setPadFocus(document.querySelector(`#${PANEL_ID[id]} ${id==='craft'?'[data-craft]':'button'}:not([disabled])`)||document.querySelector(`#${PANEL_ID[id]} button`));Sound.play('ui');}
const PANEL_ID={map:'mapScreen',skills:'skillScreen',craft:'craftScreen'};
function openCraft(){if(S.panel==='craft')closePanel();else if(!S.panel)openPanel('craft');}
function closePanel(){if(!S.panel)return;$('mapScreen').hidden=true;$('skillScreen').hidden=true;$('craftScreen').hidden=true;S.panel=null;setPadFocus(null);if(!isTouch&&!pad.active)document.body.classList.add('playing');}
function openMap(){if(S.panel==='map')closePanel();else if(!S.panel)openPanel('map');}
function openSkills(){if(S.panel==='skills')closePanel();else if(!S.panel)openPanel('skills');}
function drawMap(){
  const W2=mapCv.width,mpp=MAPZ[mapZ],cx=player.x,cz=player.z,X=x=>(x-cx)/mpp+W2/2,Z=z=>(z-cz)/mpp+W2/2;
  const c=mapCtx;c.fillStyle='#10130d';c.fillRect(0,0,W2,W2);c.imageSmoothingEnabled=false;
  const span=W2*mpp,sx=(cx-span/2)/FOG_C+FOG_N/2,sz=(cz-span/2)/FOG_C+FOG_N/2;c.drawImage(EXP.cvs,sx,sz,span/FOG_C,span/FOG_C,0,0,W2,W2);
  c.strokeStyle='rgba(232,226,208,.06)';c.lineWidth=1;const gs=96;for(let g=Math.ceil((cx-span/2)/gs)*gs;g<cx+span/2;g+=gs){c.beginPath();c.moveTo(X(g),0);c.lineTo(X(g),W2);c.stroke();}
  for(let g=Math.ceil((cz-span/2)/gs)*gs;g<cz+span/2;g+=gs){c.beginPath();c.moveTo(0,Z(g));c.lineTo(W2,Z(g));c.stroke();}
  c.fillStyle='#e9c46a';c.fillRect(X(-BR),Z(-BR),BR*2/mpp,BR*2/mpp);c.fillStyle='#14170f';c.fillRect(X(-BR)+3,Z(-BR)+3,BR*2/mpp-6,BR*2/mpp-6);c.fillStyle='#e9c46a';c.fillRect(X(0)-3,Z(0)-3,6,6);
  c.font='600 15px "Barlow Condensed",sans-serif';c.textAlign='center';
  const label=(t,x,y,col)=>{c.lineWidth=4;c.strokeStyle='rgba(8,9,7,.9)';c.strokeText(t,x,y);c.fillStyle=col;c.fillText(t,x,y);};
  label('FARMSTEAD',X(0),Z(-BR)-6,'#e9c46a');
  for(const cr of crates){if(cr.opened||cr.rar!=='drop')continue;c.fillStyle='#d6432f';c.beginPath();c.arc(X(cr.x),Z(cr.z),6,0,6.28);c.fill();label('Airdrop',X(cr.x),Z(cr.z)-10,'#ff8a70');}
  for(const p of EXP.found.values()){const x=X(p.x),y=Z(p.z);if(x<-40||y<-40||x>W2+40||y>W2+40)continue;
    if(p.kind==='town'){c.font='700 17px "Barlow Condensed",sans-serif';label(p.name.toUpperCase(),x,y,'#e8e2d0');c.font='600 15px "Barlow Condensed",sans-serif';}
    else{c.fillStyle=LM_T[p.type].col;c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-6,-6,12,12);c.strokeStyle='#0c0e0b';c.lineWidth=2;c.strokeRect(-6,-6,12,12);c.restore();label(p.name,x,y-12,LM_T[p.type].col);}}
  for(const j of RPG.jobs){if(j.k!=='scout')continue;const [x,y]=[clamp(X(j.x),14,W2-14),clamp(Z(j.z),14,W2-14)];c.strokeStyle='#f2a516';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();c.arc(x,y,16,0,6.28);c.stroke();c.setLineDash([]);
    c.font='700 18px "Barlow Condensed",sans-serif';label('?',x,y+6,'#f2a516');c.font='600 15px "Barlow Condensed",sans-serif';label(j.name,x,y-20,'#f2a516');}
  for(const h of hordes){if(h.alive<=0||!(h.known||base.radar))continue;c.fillStyle='rgba(214,67,47,.55)';c.beginPath();c.arc(X(h.cx),Z(h.cz),Math.max(5,h.radius/mpp),0,6.28);c.fill();}
  c.save();c.translate(W2/2,W2/2);c.rotate(-player.yaw+Math.PI);c.fillStyle='#f2a516';c.strokeStyle='#0c0e0b';c.lineWidth=2;c.beginPath();c.moveTo(0,-11);c.lineTo(8,8);c.lineTo(-8,8);c.closePath();c.fill();c.stroke();c.restore();
  c.textAlign='left';c.font='600 13px "Barlow Condensed",sans-serif';c.fillStyle='rgba(232,226,208,.7)';c.fillText(`${mpp*96|0} m grid · north is up`,10,W2-10);
  const lm=[...EXP.found.values()];$('mapHere').textContent=EXP.here||BIOME_NAME[bioC(Math.floor(player.x/CH),Math.floor(player.z/CH))];
  $('mapStats').innerHTML=`<b>${lm.filter(p=>p.kind==='town').length}</b> towns · <b>${lm.filter(p=>p.kind==='lm').length}</b> landmarks found · ${clockStr()} on day ${S.wave+1}`;
  $('mapJobs').innerHTML=RPG.jobs.length?RPG.jobs.map(j=>`<li>${jobLine(j)}</li>`).join(''):'<li>No jobs. Check back at dawn.</li>';
  $('mapNight').hidden=S.phase!=='day';
}
$('mapScreen').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='mapClose')closePanel();else if(b.id==='mapNight'){closePanel();startNight(true);}else if(b.dataset.z){mapZ=clamp(mapZ+(+b.dataset.z),0,2);drawMap();Sound.play('ui');}});
mapCv.addEventListener('wheel',e=>{mapZ=clamp(mapZ+(e.deltaY>0?1:-1),0,2);drawMap();e.preventDefault();},{passive:false});

