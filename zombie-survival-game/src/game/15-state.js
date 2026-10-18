/* ================= STATE ================= */
const S={running:false,paused:false,menu:false,over:false,phase:'day',dayT:75,wave:0,queue:[],spawnT:0,daySpawnT:8,kills:0,looted:0,shake:0,menuTab:'def',env:0,envT:0,groanT:2,breachMsgT:0};
const player={x:0,z:1,vx:0,vz:0,kx:0,kz:0,yaw:0,hp:100,maxHp:100,st:100,alive:true,scrap:40,parts:0,med:1,gren:0,weapon:'pistol',fireCd:0,reloadT:0,walk:0,hurtT:0,acidT:0,recoil:0};
let inv={};
const base={wallLv:0,turrets:0,turretLv:1,spikeLv:0,infLv:0,floods:0,radar:0};
const zombies=[],crates=[],pickups=[],projs=[],acids=[];
const aim=new V3(0,1,10);
let promptState='';

