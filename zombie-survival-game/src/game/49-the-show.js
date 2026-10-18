/* ================= THE SHOW =================
   DEAD ACRE is a live broadcast. Under the Condemned Labor & Entertainment Act, death-row inmates are dropped into
   active quarantine zones with a pistol and a cabin, and the cameras roll until they die. Nights survived are the score.
   The audience grows when things get exciting and drifts off when they don't. Hype earns sponsor supply drops;
   a dull broadcast gets a "producers' twist". A camera drone never leaves the contestant's side. */
const MILESTONE=10,SHOW_HOST='Rex Dalton',SHOW_NET='Liberty Broadcast Network';
const INM_FIRST=['Dale','Marcus','Cody','Earl','Luis','Travis','Wade','Ray','Andre','Billy','Hank','Darnell','Jesse','Clint','Tommy'];
const INM_LAST=['Rucker','Haskins','Doyle','Vance','Pruitt','Moreno','Crane','Tate','Boone','Shaw','Kessler','Whitlock','Odom','Barlow','Speck'];
const INM_CRIME=['two counts of first-degree murder','the murder of a sheriff\'s deputy','a bank robbery that left three people dead','the Route 9 truck-stop killings',
  'a killing during a prison escape','the murder of a business partner','an armored-car heist that ended in a shootout'];
const SPONSORS=[['VoltCola','Stay charged. Stay alive.'],['Prairie Gold Jerky','Real meat for real survivors.'],['Patriot Tactical','Gear that outlasts you.'],
  ['Sunny Acres Life Insurance','Peace of mind, whatever happens.'],['IronCore Ammunition','When every round counts.'],['Mama Lou\'s Frozen Dinners','Just like home. Almost.']];
const SHOW={inm:null,view:0,disp:0,peak:0,hype:0,spons:0,dropsDay:-1,dropsToday:0,quietT:0,twistDay:-1,said:{},cd:{},streak:[],rec0:0,uiT:0,drone:null,droneA:0};
function newInmate(){const n=String(randi(1000,9999))+'-'+'ABCDEFGHJKLMNPRSTVW'[randi(0,18)];
  return{first:pick(INM_FIRST),last:pick(INM_LAST),num:n,age:randi(24,61),crime:pick(INM_CRIME),innocent:Math.random()<.35,season:randi(3,6)};}
const inmName=()=>SHOW.inm?SHOW.inm.last:'our contestant';
// the host on air: a toast with an ON AIR tag, rate-limited per topic
function onAir(msg,key,cd){if(!S.running||S.over)return;if(key){if((S.time||0)<(SHOW.cd[key]||0))return;SHOW.cd[key]=(S.time||0)+(cd||30);}
  toast(`<b class="onair">ON AIR</b> ${msg}`,'show');}
// anything exciting: the crowd grows and sponsors get interested
function hype(n){SHOW.hype=Math.min(400,SHOW.hype+n);SHOW.spons+=n;SHOW.quietT=0;}
const nightsDone=()=>Math.max(0,S.wave-(S.phase==='night'?1:0));
function resetShow(){Object.assign(SHOW,{view:5200,disp:5200,peak:5200,hype:0,spons:0,dropsDay:-1,dropsToday:0,quietT:0,twistDay:-1,said:{},cd:{},streak:[],rec0:store.get('deadacre.best',0)});if(!SHOW.inm)SHOW.inm=newInmate();}
const bestNights=()=>Math.max(SHOW.rec0,nightsDone());
function sponsorDrop(){
  if(SHOW.dropsDay!==S.wave){SHOW.dropsDay=S.wave;SHOW.dropsToday=0;}if(SHOW.dropsToday>=2)return false;
  for(let i=0;i<30;i++){const a=rand(0,6.28),r=rand(14,26),x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;if(blockedSpot(x,z,1.2)&&!inYard(x,z))continue;if(inHome(x,z)||nearHomeFoot(x,z,.6))continue;
    if(depthAt(x,z)>-.3)continue;const [nm,tag]=pick(SPONSORS);spawnCrate(x,z,'drop');SHOW.dropsToday++;Sound.play('epic',.7);
    onAir(`This supply drop comes courtesy of <b>${nm}</b>. ${tag} It landed ${Math.round(r)}m ${compass(Math.atan2(x-player.x,z-player.z))}: follow the red flare.`);return true;}
  return false;}
// a dull broadcast: the producers release a few infected near the contestant
function producersTwist(){SHOW.twistDay=S.wave;let n=0;
  for(let i=0;i<24&&n<5;i++){const a=rand(0,6.28),r=rand(20,28),x=player.x+Math.cos(a)*r,z=player.z+Math.sin(a)*r;if(blockedSpot(x,z,1)&&!inYard(x,z))continue;if(depthAt(x,z)>-.3||inHome(x,z))continue;
    const zb=spawnZombie(n===4?'runner':'walker',x,z);zb.aware=true;n++;}
  if(n){onAir(`Viewers are drifting off, folks, so the producers just opened Pen ${randi(2,9)}. ${inmName()}, you've got company.`);Sound.play('siren',.5);}}
// the camera drone that follows the contestant
function makeDrone(){const g=new THREE.Group(),dk=M(0x24272a,{metalness:.5,roughness:.4}),wh=M(0xd8dcd8,{metalness:.2}),lt=new THREE.MeshBasicMaterial({color:0xff2a1a});
  const body=mki(new THREE.SphereGeometry(.2,12,8),wh,0,0,0,.03);body.scale.set(1,.45,1.35);g.add(body);g.add(mk(BOX(.22,.05,.3),dk,0,.07,0,false));
  const rot=[];for(const [x,z] of [[-.38,-.32],[.38,-.32],[-.38,.32],[.38,.32]]){const arm=mki(BOX(Math.hypot(x,z)*2,.04,.05),dk,x/2,0,z/2,.02);arm.rotation.y=-Math.atan2(z,x);g.add(arm);
    g.add(mki(CYL(.05,.05,.08,8),dk,x,.03,z,.02));const p=new THREE.Group();p.position.set(x,.09,z);for(const r of [0,Math.PI/2]){const b=mk(BOX(.34,.01,.035),M(0x1a1c1e),0,0,0,false);b.rotation.y=r;p.add(b);}
    const disc=new THREE.Mesh(new THREE.CircleGeometry(.18,14),new THREE.MeshBasicMaterial({color:0xb8c0c4,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false}));disc.rotation.x=-Math.PI/2;p.add(disc);g.add(p);rot.push(p);}
  const gim=new THREE.Group();gim.position.set(0,-.12,.18);gim.add(mki(new THREE.SphereGeometry(.07,10,8),dk,0,0,0,.02));const lens=new THREE.Mesh(new THREE.CircleGeometry(.035,10),new THREE.MeshBasicMaterial({color:0x4a8ab0}));lens.position.z=.072;gim.add(lens);g.add(gim);
  const nav=(c,x)=>{const n=new THREE.Mesh(BOX(.04,.04,.04),new THREE.MeshBasicMaterial({color:c}));n.position.set(x,.02,-.28);g.add(n);};nav(0x30ff60,-.12);
  const led=new THREE.Mesh(BOX(.05,.05,.05),lt);led.position.set(.12,.02,-.28);g.add(led);g.scale.setScalar(1.25);g.visible=false;scene.add(g);return{g,led,rot,gim};}
function updateDrone(dt){const D=SHOW.drone||(SHOW.drone=makeDrone());D.g.visible=S.running&&!S.over;if(!D.g.visible)return;
  SHOW.droneA+=dt*.25;const a=SHOW.droneA,inside=inHome(player.x,player.z),R=inside?3.2:3.4,h=(inside?4.6:4.2)+(player.jy||0)+Math.sin(a*3.1)*.18;
  // it films the contestant from the front, drifting side to side, so it stays in the viewer's shot
  const fx=Math.sin(camYaw),fz=Math.cos(camYaw),sw=-(4.6+Math.sin(a*1.7)*1.2),tx=player.x+fx*(R+1)+fz*sw,tz=player.z+fz*(R+1)-fx*sw,k=Math.min(1,dt*2.2);
  const hh=nearHomeFoot(D.g.position.x,D.g.position.z,.6)?Math.max(h,HOME_H+2.4):h; // up and over the house, never through it
  D.g.position.x+=(tx-D.g.position.x)*k;D.g.position.z+=(tz-D.g.position.z)*k;D.g.position.y+=(hh+Math.max(0,WL-gH(D.g.position.x,D.g.position.z))-D.g.position.y)*k; // the terrain shader adds ground height; keep clear of water
  D.g.rotation.y=Math.atan2(player.x-D.g.position.x,player.z-D.g.position.z);
  for(const r of D.rot)r.rotation.y+=dt*45;D.g.rotation.x=0;D.g.rotation.z=Math.sin(a*1.7)*.08;D.led.visible=Math.floor((S.time||0)*2)%2===0;}
function updateShow(dt){
  if(!SHOW.inm)resetShow();
  const night=S.phase==='night';SHOW.hype=Math.max(0,SHOW.hype-dt*SHOW.hype*.035);SHOW.quietT+=dt;
  const target=(5200+2600*S.wave+(night?3800:0))*(1+SHOW.hype/90)*(nightsDone()>SHOW.rec0&&SHOW.rec0>0?1.25:1);
  SHOW.view+=(target-SHOW.view)*Math.min(1,dt*.35);SHOW.peak=Math.max(SHOW.peak,SHOW.view);
  if(SHOW.spons>=110){if(sponsorDrop())SHOW.spons=0;else SHOW.spons=80;}
  // a long quiet day: the producers step in (once a day, never on day 1's first minutes)
  if(!night&&SHOW.quietT>200&&SHOW.twistDay!==S.wave&&(S.wave>0||S.clock>300)&&player.alive)producersTwist();
  else if(!night&&SHOW.quietT>140&&!SHOW.said['bored'+S.wave]){SHOW.said['bored'+S.wave]=1;onAir(`Not much happening out there, ${inmName()}. The audience is reaching for the remote.`);}
  if(player.alive&&player.hp<player.maxHp*.25)onAir(pick([`${inmName()} is hurt bad! Phones are ringing off the hook!`,`Oh, that's a lot of blood. The crowd is on its feet!`,`Somebody get ${inmName()} a medkit! Not us, of course. We're just watching.`]),'lowhp',45);
  updateDrone(dt);
  SHOW.uiT-=dt;if(SHOW.uiT<=0){SHOW.uiT=.25;SHOW.disp=Math.round(SHOW.view*(1+(Math.random()-.5)*.004));
    const n=nightsDone();$('liveView').textContent=SHOW.disp.toLocaleString('en-US');
    $('liveGoal').textContent=`${n} night${n===1?'':'s'} survived · record ${bestNights()}`;
    $('liveWho').textContent=`#${SHOW.inm.num} ${SHOW.inm.last.toUpperCase()}`;}
}
/* ---- hooking the show into what happens in the game ---- */
const NIGHT_LINES=['The sun is down and the dead are up. Good luck, {n}!','Night {w}! Our sponsors would like to remind {n}: the infected can smell fear. And blood. Mostly blood.',
  'Night {w}, America. Can {n} make it to morning? Don\'t blink!','Here they come! Night {w} in Quarantine Zone 7!'];
const DAWN_LINES=['{n} made it through night {w}! {r}','Dawn breaks and {n} is still breathing. Night {w}: survived.','Another night in the books for {n}. Same time tomorrow, folks. If there is a tomorrow.'];
const fillL=s=>s.replace(/\{n\}/g,inmName()).replace(/\{w\}/g,S.wave).replace(/\{r\}/g,nightsDone()>SHOW.rec0?'Every night from here is a new record.':`The record to beat: ${SHOW.rec0}.`);
{const _kz=killZombie;killZombie=function(z){const was=z.dying;_kz(z);if(was||!z.dying)return;
  const t=z.type,pts=t==='boss'?60:t==='brute'?14:t==='walker'||t==='crawler'?2:5;hype(pts);
  const now=S.time||0;SHOW.streak=SHOW.streak.filter(x=>now-x<8);SHOW.streak.push(now);
  if(t==='boss')onAir(`${inmName()} just brought down the Abomination! I have never seen anything like it!`,'boss',5);
  else if(t==='brute')onAir(`A Brute goes down! Ratings just spiked!`,'brute',40);
  else if(!SHOW.said.first){SHOW.said.first=1;onAir(`First blood for ${inmName()}! And we are under way, folks!`);}
  else if(SHOW.streak.length>=5){SHOW.streak.length=0;hype(15);onAir(pick([`Five in a row! ${inmName()} is on fire!`,`What a streak! The chat is going wild!`]),'streak',25);}};}
{const _ka=killAgent;killAgent=function(a){const was=a.dying;_ka(a);if(!was&&a.dying)hype(1.2);};}
{const _td=doTakedown;doTakedown=function(o){_td(o);hype(9);onAir(pick([`A silent takedown! Cold-blooded, ${inmName()}. The viewers love it.`,`Lights out, quietly. That's showmanship.`]),'takedown',60);};}
{const _ah=alertHorde;alertHorde=function(h,why){const was=h.state==='hunt';_ah(h,why);if(!was&&h.state==='hunt'&&S.running){hype(12);onAir(`A horde of ${h.alive} has ${inmName()}'s scent! This is what you tuned in for!`,'horde',40);}};}
{const _sn=startNight;startNight=function(e){const was=S.phase;_sn(e);if(was==='day'&&S.phase==='night'){hype(10);setTimeout(()=>onAir(fillL(NIGHT_LINES[(S.wave-1)%NIGHT_LINES.length])),2600);}};}
{const _en=endNight;endNight=function(){const was=S.phase;_en();if(was!=='night'||S.phase!=='day')return;hype(22);
  const n=nightsDone();
  // milestones and records keep an endless run exciting
  if(n>SHOW.rec0&&SHOW.rec0>0&&!SHOW.said.record){SHOW.said.record=1;hype(40);setTimeout(()=>{banner('NEW RECORD',`${n} nights. Nobody has lasted this long in Zone 7.`,'dawn');onAir(`${inmName()} just broke the all-time record! ${n} nights and counting! The switchboard is melting!`);},3800);}
  else if(n%MILESTONE===0){hype(30);setTimeout(()=>{banner(`${n} NIGHTS`,`Episode ${n}. The network renews ${inmName()} for another season.`,'dawn');onAir(`${n} nights! That calls for a celebration, and maybe a sponsor drop.`);sponsorDrop();},3800);}
  else setTimeout(()=>onAir(fillL(DAWN_LINES[S.wave%DAWN_LINES.length])),4200);};}
{const _hp=hurtPlayer;hurtPlayer=function(d){const h0=player.hp;_hp(d);if(player.hp<h0)hype(Math.min(8,(h0-player.hp)*.25));};}
{const _bw=boardWindow;boardWindow=function(s){const b=s.st.boards;_bw(s);if(s.st.boards>b&&!SHOW.said.board){SHOW.said.board=1;onAir(`${inmName()} is nailing up the windows. Smart. Boring, but smart.`);}};}
{const _gx=gainXP;gainXP=function(n){const lv=RPG.lv;_gx(n);if(RPG.lv>lv)onAir(`${inmName()} is getting the hang of this. Level ${RPG.lv}!`,'lvl',20);};}
/* ---- the opening: a case file, then the host ---- */
function showIntro(go){
  SHOW.inm=newInmate();const I=SHOW.inm;
  const lines=[`<div class="ilogo">${SHOW_NET} presents</div>`,`<div class="ititle">DEAD <span>ACRE</span> <small>Season ${I.season}</small></div>`,
    `<div class="ccard"><div class="mug"><svg viewBox="0 0 100 110"><circle cx="50" cy="34" r="22"/><path d="M8 110c2-30 20-44 42-44s40 14 42 44z"/></svg><div class="plate">#${I.num}</div></div>
      <div class="icase"><div class="icn">Tonight's contestant</div><div class="inm">${I.first} ${I.last}, ${I.age}</div><div>Convicted of ${I.crime}. Sentenced to death, Hollow Creek State Penitentiary.</div>${I.innocent?'<div class="iinn">Maintains innocence.</div>':''}</div></div>`,
    `<p>Under the Condemned Labor &amp; Entertainment Act, death-row inmates may be transferred to an active quarantine zone for broadcast. <b>There is no pardon and no finish line: the show runs until the contestant dies.</b> ${store.get('deadacre.best',0)?`The record stands at ${store.get('deadacre.best',0)} nights.`:'Nobody has set a record yet.'}</p>`,
    `<div class="lower">${SHOW_HOST.toUpperCase()} · YOUR HOST</div><p class="ihost">"Good evening, America! Tonight ${I.first} ${I.last} drops into Quarantine Zone 7 with a pistol, a cabin and forty pieces of scrap. Board those windows, ${I.last}. The infected don't sleep, and neither do our cameras."</p>`];
  $('introBody').innerHTML=lines.map((l,i)=>`<div class="iln" style="animation-delay:${(i*.7).toFixed(1)}s">${l}</div>`).join('');
  $('startScreen').hidden=true;$('overScreen').hidden=true;$('introScreen').hidden=false;
  const done=()=>{$('introScreen').hidden=true;$('introGo').onclick=null;go();};$('introGo').onclick=done;if(pad.active)setPadFocus($('introGo'));}

