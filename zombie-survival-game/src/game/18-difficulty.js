/* ================= DIFFICULTY ================= */
const DIFFS={
  easy:{name:'Easy',count:.65,horde:.6,dmg:.7,hp:.85,spec:.6,nightHorde:.25,day:6},
  normal:{name:'Normal',count:1,horde:1,dmg:1,hp:1,spec:1,nightHorde:.55,day:10},
  hard:{name:'Hard',count:1.45,horde:1.5,dmg:1.2,hp:1.1,spec:1.4,nightHorde:.85,day:14},
  nightmare:{name:'Nightmare',count:2,horde:2.2,dmg:1.4,hp:1.25,spec:1.9,nightHorde:1,day:18},
};
let diffKey=store.get('deadacre.diff','normal');if(!DIFFS[diffKey])diffKey='normal';let D=DIFFS[diffKey];
function pickDiff(k){diffKey=k;D=DIFFS[k];store.set('deadacre.diff',k);
  document.querySelectorAll('#diffPick button').forEach(b=>{const on=b.dataset.diff===k;b.classList.toggle('on',on);b.setAttribute('aria-checked',on);});}

