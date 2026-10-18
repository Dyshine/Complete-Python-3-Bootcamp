const $=id=>document.getElementById(id);
const V3=THREE.Vector3;
let RNG=Math.random; // swapped for a seeded generator while a world chunk is built
const rand=(a,b)=>a+RNG()*(b-a);
const randi=(a,b)=>Math.floor(a+RNG()*(b-a+1));
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const pick=a=>a[Math.floor(RNG()*a.length)];
