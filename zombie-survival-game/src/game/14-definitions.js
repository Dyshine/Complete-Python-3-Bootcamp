/* ================= DEFINITIONS ================= */
const ZT={
  walker:{name:'Walker',hp:45,speed:2.2,dmg:9,wall:7,r:.55,scale:1,skin:0x7c9a6a,shirt:0x4b5a6b,eye:0xffd23f,drop:[2,4],score:10},
  runner:{name:'Runner',hp:28,speed:5.4,dmg:7,wall:4,r:.5,scale:.92,skin:0x9aa77a,shirt:0x7a3b2e,eye:0xff5a3a,drop:[2,4],score:15},
  crawler:{name:'Crawler',hp:32,speed:1.35,dmg:6,wall:3,r:.5,scale:1,skin:0x8a9670,shirt:0x5a5040,eye:0xffd23f,drop:[2,4],score:12,crawl:1},
  trooper:{name:'Trooper',hp:110,speed:2.0,dmg:12,wall:9,r:.58,scale:1,skin:0x6a7a5a,shirt:0x3a4a34,eye:0xffd23f,drop:[4,7],parts:1,score:25},
  spitter:{name:'Spitter',hp:55,speed:2.0,dmg:14,wall:5,r:.55,scale:1.05,skin:0x6aa03a,shirt:0x2f3d2a,eye:0x9bff5a,drop:[4,7],score:25},
  boomer:{name:'Boomer',hp:70,speed:2.6,dmg:50,wall:140,r:.85,scale:1.15,skin:0xb08a5a,shirt:0x6a4a3a,eye:0xffa03a,drop:[4,8],score:25},
  brute:{name:'Brute',hp:380,speed:1.7,dmg:28,wall:45,r:1.0,scale:1.75,skin:0x6d7a5e,shirt:0x3a2f2a,eye:0xff3030,drop:[12,20],parts:1,score:60},
  boss:{name:'The Abomination',hp:2600,speed:2.1,dmg:40,wall:90,r:1.6,scale:2.7,skin:0x7a4a52,shirt:0x2a1a1e,eye:0xff2020,drop:[60,90],parts:6,score:500},
};
const SPIKE_DPS=[0,8,16,28],INF_REGEN=[0,1.5,3,5],INF_HP=[0,20,40,60];

