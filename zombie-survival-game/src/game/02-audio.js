/* ================= AUDIO ================= */
const Sound=(()=>{
  /* ---------- audio engine ----------
     Everything is synthesised in WebAudio: layered weapon reports (transient crack + body + low thump + reverb tail), surface
     footsteps, formant-filtered zombie voices, positional panning with distance filtering, a shared convolution reverb that
     gets roomier indoors, a weather/time-of-day ambience bed and an adaptive score that rises with danger. A bus compressor
     and limiter glue it together. Volumes: master, music, effects (pause menu).
     Firearms and reloads play recorded takes from sounds/ (CC0, see sounds/CREDITS.txt) through the same routing; the
     synthesised reports stand in until the recordings have decoded, or if they can't load. */
  let ctx=null,master=null,sfx=null,amb=null,mus=null,rvb=null,rvbIn=null,comp=null,muted=false,voices=0;
  const NB={},last={},vol=store.get('deadacre.vol',{master:.9,music:.55,sfx:.9});
  const GAP={smg:.03,saw:.09,siren:.8,arc:.04,hit:.03,turret:.05,groan:.05,hurt:.18,pick:.04,empty:.12,rifle:.025,thud:.05,clink:.025,door:.15,step:.05,ui:.03};
  function buf(kind){const n=ctx.sampleRate*2,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);let l=0,p=[0,0,0,0,0,0,0];
    for(let i=0;i<n;i++){const w=Math.random()*2-1;
      if(kind==='white')d[i]=w;
      else if(kind==='brown'){l=(l+.02*w)/1.02;d[i]=l*3.5;}
      else{p[0]=.99886*p[0]+w*.0555179;p[1]=.99332*p[1]+w*.0750759;p[2]=.969*p[2]+w*.153852;p[3]=.8665*p[3]+w*.3104856;p[4]=.55*p[4]+w*.5329522;p[5]=-.7616*p[5]-w*.016898;d[i]=(p[0]+p[1]+p[2]+p[3]+p[4]+p[5]+p[6]+w*.5362)*.11;p[6]=w*.115926;}}
    return b;}
  function impulse(sec,decay){const n=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(2,n,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const t=i/n;d[i]=(Math.random()*2-1)*Math.pow(1-t,decay)*(i<ctx.sampleRate*.012?.2:1);}}return b;}
  function init(){
    if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
    try{
      ctx=new (window.AudioContext||window.webkitAudioContext)();
      comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=10;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.22;
      const lim=ctx.createDynamicsCompressor();lim.threshold.value=-2;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.08;
      master=ctx.createGain();master.connect(comp);comp.connect(lim);lim.connect(ctx.destination);
      sfx=ctx.createGain();amb=ctx.createGain();mus=ctx.createGain();sfx.connect(master);amb.connect(master);mus.connect(master);
      rvb=ctx.createConvolver();rvb.buffer=impulse(2.4,3.2);rvbIn=ctx.createGain();rvbIn.gain.value=.9;const rvOut=ctx.createGain();rvOut.gain.value=.55;
      const rvLP=ctx.createBiquadFilter();rvLP.type='lowpass';rvLP.frequency.value=5200;rvbIn.connect(rvb);rvb.connect(rvLP);rvLP.connect(rvOut);rvOut.connect(master);
      for(const k of ['white','pink','brown'])NB[k]=buf(k);
      applyVol();startMusic();loadSamples();
    }catch(e){ctx=null;}
  }
  function applyVol(){if(!ctx)return;const t=ctx.currentTime;master.gain.setTargetAtTime(muted?0:vol.master*.55,t,.05);sfx.gain.setTargetAtTime(vol.sfx,t,.05);amb.gain.setTargetAtTime(vol.sfx*.9,t,.05);mus.gain.setTargetAtTime(vol.music*.5,t,.2);}
  // ---------- voice routing: optional world position → pan, distance lowpass, reverb send ----------
  let LX=0,LZ=0,LYAW=0,INROOM=0;
  function route(o){
    const g=ctx.createGain();g.gain.value=1;let node=g;
    let d=0,pan=0;if(o&&o.x!=null){const dx=o.x-LX,dz=o.z-LZ;d=Math.hypot(dx,dz);const a=Math.atan2(dx,dz)-LYAW;pan=clamp(-Math.sin(a)*Math.min(1,d/4),-1,1)*.85;}
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=clamp(18000/(1+d*d/900),900,18000);node.connect(lp);node=lp;
    if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);node=p;}
    node.connect(o&&o.bus||sfx);
    const send=ctx.createGain();send.gain.value=(o&&o.wet!=null?o.wet:.18)*(1+INROOM*1.4)*(1+Math.min(1.5,d/40));node.connect(send);send.connect(rvbIn);
    voices++;setTimeout(()=>{voices--;try{g.disconnect();}catch(e){}},((o&&o.len)||1.2)*1000+400);
    return g;
  }
  const T=()=>ctx.currentTime;
  // ---------- recorded samples: sounds/<name>_<n>.mp3, decoded once ----------
  const SMP={pistol:4,pistol_far:1,revolver:2,revolver_far:1,smg:4,smg_far:1,rifle:4,rifle_far:1,shotgun:3,shotgun_far:1,sniper:4,sniper_far:1,
    reload_mag:1,reload_rifle:1,pump:1,shell:1};
  const SB={},SLAST={};
  function loadSamples(){if(!window.fetch)return;
    for(const [k,n] of Object.entries(SMP))for(let i=1;i<=n;i++)
      fetch(`sounds/${k}_${i}.mp3`).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status))
        .then(a=>new Promise((res,rej)=>ctx.decodeAudioData(a,res,rej))).then(b=>{(SB[k]||(SB[k]=[])).push(b);}).catch(()=>{});}
  // one take of k into out; never the same take twice running; slight pitch spread so rapid fire doesn't machine-gun
  function sample(out,k,v,delay,rate){const L=SB[k];if(!L||!L.length)return false;
    let i=Math.random()*L.length|0;if(L.length>1&&i===SLAST[k])i=(i+1)%L.length;SLAST[k]=i;
    const s=ctx.createBufferSource();s.buffer=L[i];s.playbackRate.value=rate||rand(.95,1.05);
    const g=ctx.createGain();g.gain.value=v;s.connect(g);g.connect(out);s.start(T()+(delay||0));return true;}
  // per firearm: voice length, reverb send, level, low punch frequency
  const GS={pistol:[1.3,.2,.62,130],revolver:[1.6,.24,.7,110],smg:[.8,.14,.5,140],rifle:[1.5,.2,.62,120],shotgun:[2,.26,.75,85],sniper:[2.6,.3,.8,80]};
  function gunSample(n,v,pos,opt){const G=GS[n];if(!G||!SB[n])return false;const sup=opt&&opt.sup;
    const o=route(Object.assign({len:G[0],wet:sup?G[1]*.5:G[1]},pos||{}));let out=o;
    if(sup){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1500;f.Q.value=.5;f.connect(o);out=f;}
    sample(out,n,v*G[2]*(sup?.4:1));
    tone(o,G[3],G[3]*.3,.11,.3*v*(sup?.3:1),'sine');                       // chest punch small speakers lose from field recordings
    if(!sup&&INROOM<.5&&SB[n+'_far'])sample(o,n+'_far',v*G[2]*.16,rand(.11,.17),1);   // slap-back off the treeline outdoors
    if(n==='shotgun')sample(o,'pump',.55*v,.42,1)||(noise(o,.08,'bandpass',1400,3,.18*v,.5),noise(o,.1,'bandpass',900,3,.2*v,.68));
    if(n==='sniper')noise(o,.05,'bandpass',3400,4,.08*v,.6);
    return true;}
  // reload by weapon class; t is the reload's length so the closing rack lands near its end
  function reloadSample(cls,t){const o=route({len:(t||1.6)+.5,wet:.05});
    switch(cls){
      case 'side':case 'smg':return sample(o,'reload_mag',.5);
      case 'ar':case 'hunt':return sample(o,'reload_rifle',.5);
      case 'shot':case 'rev':{const ok=sample(o,'shell',.45);if(ok&&cls==='shot')sample(o,'pump',.5,Math.max(.5,(t||1.6)-.5),1);return ok;}
    }return false;}
  function noise(out,dur,type,freq,q,vol,delay,kind,f1){
    const t=T()+(delay||0),s=ctx.createBufferSource();s.buffer=NB[kind||'white'];
    const f=ctx.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(freq,t);if(f1)f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);f.Q.value=q||.7;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+Math.min(.004,dur*.2));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(out);s.start(t,Math.random()*1.5);s.stop(t+dur+.05);
  }
  function tone(out,f0,f1,dur,vol,type,delay,att){
    const t=T()+(delay||0),o=ctx.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+(att||.005));g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+dur+.05);return o;
  }
  // inharmonic partials for metal, glass and bells
  function ring(out,base,parts,dur,vol,delay){for(const [m,a] of parts)tone(out,base*m,base*m*.995,dur*(1.2-m*.08),vol*a,'sine',delay,.002);}
  let shaper=null;function drive(out,amt){if(!shaper){shaper=ctx.createWaveShaper();const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/n*2-1;c[i]=Math.tanh(x*3);}shaper.curve=c;}
    const w=ctx.createWaveShaper();w.curve=shaper.curve;const g=ctx.createGain();g.gain.value=amt||1;g.connect(w);w.connect(out);return g;}
  // a formant-filtered throat: zombies, wolves, deer
  function voice(out,f0,f1,dur,vol,formants,vib,delay,src){
    const t=T()+(delay||0),o=ctx.createOscillator();o.type=src||'sawtooth';o.frequency.setValueAtTime(f0,t);o.frequency.linearRampToValueAtTime(f1,t+dur);
    const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=vib||5;lg.gain.value=f0*.04;lfo.connect(lg);lg.connect(o.frequency);
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*.15);g.gain.setValueAtTime(vol,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    for(const [ff,q,a] of formants){const b=ctx.createBiquadFilter();b.type='bandpass';b.frequency.value=ff;b.Q.value=q;const bg=ctx.createGain();bg.gain.value=a;o.connect(b);b.connect(bg);bg.connect(g);}
    noise(g,dur,'bandpass',formants[0][0]*1.5,2,vol*.25,delay,'pink');
    g.connect(out);o.start(t);lfo.start(t);o.stop(t+dur+.05);lfo.stop(t+dur+.05);
  }
  // a gunshot: transient crack, mid body, sub thump, and a long tail sent hard into the reverb
  function gun(out,o){const{crack,body,bodyF,thump,thF,tail,tailF,len}=o;
    noise(out,.018,'highpass',crack[0],.7,crack[1]);
    noise(out,body,'bandpass',bodyF,.9,o.bv);
    tone(out,thF,thF*.35,thump,o.tv,'sine');
    const d=drive(out,.6);noise(d,body*.7,'lowpass',bodyF*1.5,.7,o.bv*.6);
    noise(out,tail,'lowpass',tailF,.6,o.tl,.02,'pink',tailF*.4);
    if(o.mech)noise(out,.05,'bandpass',3400,4,o.mech,o.mechD||.09);
  }
  function play(n,v,x,z,opt){
    if(!ctx||muted||voices>60)return;v=v==null?1:v;if(v<.02)return;const now=ctx.currentTime;
    if(last[n]!=null&&now-last[n]<(GAP[n]==null?.02:GAP[n]))return;last[n]=now;
    const pos=x!=null?{x,z}:null,O=(len,wet)=>route(Object.assign({len,wet},pos||{}));
    if(gunSample(n,v,pos,opt))return;
    if(n==='reload'&&opt&&opt.cls&&reloadSample(opt.cls,opt.t))return;
    let o;
    switch(n){
      case 'pistol':o=O(1.4,.32);gun(o,{crack:[2600,.5*v],body:.11,bodyF:1500,bv:.55*v,thump:.12,thF:150,tv:.5*v,tail:.9,tailF:1400,tl:.16*v,mech:.06*v});break;
      case 'revolver':o=O(1.8,.4);gun(o,{crack:[2200,.7*v],body:.16,bodyF:1100,bv:.75*v,thump:.2,thF:120,tv:.75*v,tail:1.4,tailF:1100,tl:.22*v,mech:.08*v,mechD:.16});break;
      case 'smg':o=O(.9,.2);gun(o,{crack:[3200,.38*v],body:.06,bodyF:1900,bv:.36*v,thump:.06,thF:190,tv:.3*v,tail:.45,tailF:1600,tl:.07*v});break;
      case 'rifle':o=O(1.5,.3);gun(o,{crack:[3600,.55*v],body:.08,bodyF:2100,bv:.45*v,thump:.09,thF:170,tv:.45*v,tail:1,tailF:1700,tl:.14*v,mech:.05*v,mechD:.05});break;
      case 'shotgun':o=O(2,.42);gun(o,{crack:[1800,.6*v],body:.32,bodyF:850,bv:.95*v,thump:.3,thF:95,tv:1*v,tail:1.6,tailF:900,tl:.28*v});noise(o,.08,'bandpass',1400,3,.18*v,.5);noise(o,.1,'bandpass',900,3,.2*v,.68);break;
      case 'sniper':o=O(2.6,.55);gun(o,{crack:[4200,.9*v],body:.22,bodyF:1300,bv:.9*v,thump:.3,thF:110,tv:1*v,tail:2.4,tailF:1200,tl:.35*v,mech:.1*v,mechD:.55});break;
      case 'launcher':o=O(1.4,.3);tone(o,220,70,.22,.5*v,'triangle');noise(o,.3,'bandpass',700,1.2,.4*v,0,'pink',300);noise(o,.6,'highpass',1500,.7,.12*v,.05,'white',4000);break;
      case 'bow':o=O(.8,.12);tone(o,330,150,.12,.25*v,'triangle');tone(o,660,300,.08,.08*v,'sine');noise(o,.18,'bandpass',2600,2,.18*v,0,'white',900);break;
      case 'arc':o=O(.6,.15);noise(o,.14,'highpass',5000,.7,.4*v);tone(o,1800,500,.1,.12*v,'sawtooth');break;
      case 'turret':o=O(.6,.25);noise(o,.05,'bandpass',3200,1.4,.25*v);tone(o,260,120,.05,.12*v,'square');break;
      case 'saw':o=O(.3,.08);{const d=drive(o,1.2);tone(d,rand(95,110),rand(90,105),.13,.18*v,'sawtooth');}noise(o,.1,'bandpass',2600,2,.12*v);break;
      case 'swing':o=O(.4,.06);noise(o,.2,'bandpass',500,1.8,.35*v,0,'pink',1800);break;
      case 'hit':o=O(.4,.08);noise(o,.06,'lowpass',700,.8,.4*v,0,'pink');noise(o,.09,'bandpass',900,4,.2*v,.01,'white',300);tone(o,120,60,.07,.18*v,'sine');break;
      case 'thud':o=O(.5,.12);tone(o,120,55,.14,.35*v,'sine');noise(o,.1,'lowpass',380,.8,.3*v,0,'brown');break;
      case 'clink':o=O(.5,.15);ring(o,rand(2100,2900),[[1,1],[2.76,.4],[5.4,.2]],.18,.05*v);break;
      case 'crash':o=O(1.4,.3);noise(o,.8,'lowpass',420,.8,.6*v,0,'brown');tone(o,70,32,.45,.35*v,'sine');for(let i=0;i<5;i++)noise(o,.08,'bandpass',rand(800,2600),3,.12*v,rand(.05,.5));break;
      case 'boom':o=O(3,.45);noise(o,.04,'highpass',1800,.7,.6*v);{const d=drive(o,1.4);tone(d,85,24,1.1,.9*v,'sine');}noise(o,1.6,'lowpass',260,.8,.9*v,.01,'brown',90);noise(o,2.4,'lowpass',900,.6,.18*v,.25,'pink',200);
        for(let i=0;i<7;i++)noise(o,.06,'bandpass',rand(1500,3500),4,.08*v,rand(.4,1.6));break;
      case 'door':o=O(.9,.2);voice(o,180,140,.45,.08*v,[[700,5,1],[1500,7,.5]],11,0,'sawtooth');noise(o,.15,'lowpass',500,.8,.25*v,.35,'brown');break;
      case 'gate':o=O(1.2,.25);voice(o,95,140,.7,.12*v,[[450,4,1],[1200,6,.4]],7,0,'sawtooth');noise(o,.5,'bandpass',300,2,.3*v,0,'brown');ring(o,180,[[1,.6],[2.4,.3]],.7,.08*v,.6);break;
      case 'pick':o=O(.4,.15);tone(o,880,1320,.08,.1,'sine');tone(o,1320,1760,.1,.07,'sine',.06);break;
      case 'crate':o=O(.7,.2);noise(o,.2,'bandpass',500,1.4,.3,0,'brown');noise(o,.12,'bandpass',1800,3,.12,.12);tone(o,420,880,.25,.06,'triangle',.18);break;
      case 'epic':o=O(1.6,.4);ring(o,523,[[1,1],[2,.35],[3.01,.2]],1.2,.07);ring(o,784,[[1,1],[2,.3]],1.1,.06,.12);ring(o,1046,[[1,1],[2,.25]],1.2,.05,.24);break;
      case 'level':o=O(2.4,.5);[523,659,784,1046].forEach((f,i)=>ring(o,f,[[1,1],[2,.3],[3,.12]],1.3,.08,i*.13));noise(o,1.4,'highpass',6000,.7,.03,.4,'white',9000);break;
      case 'discover':o=O(2.6,.6);[392,587,784].forEach((f,i)=>{tone(o,f,f,1.4,.06,'triangle',i*.2,.08);tone(o,f*2,f*2,1,.02,'sine',i*.2,.1);});break;
      case 'dawn':o=O(2.6,.6);[440,554,659,880].forEach((f,i)=>tone(o,f,f,1.6,.05,'triangle',i*.18,.12));break;
      case 'night':o=O(3,.6);{const d=drive(o,.8);tone(d,55,48,2.6,.35,'sawtooth',0,.4);tone(d,82,74,2.4,.22,'sawtooth',.1,.5);}noise(o,2.4,'lowpass',200,.8,.25,0,'brown');break;
      case 'hurt':o=O(.5,.1);voice(o,190,120,.28,.18,[[600,4,1],[1100,6,.5]],8,0,'sawtooth');noise(o,.08,'lowpass',500,.8,.25,0,'pink');break;
      case 'empty':o=O(.2,.05);noise(o,.015,'bandpass',4200,6,.25);noise(o,.02,'bandpass',2600,6,.15,.04);break;
      case 'reload':o=O(1,.1);noise(o,.03,'bandpass',3000,6,.3);noise(o,.05,'bandpass',1500,3,.22,.18);noise(o,.12,'bandpass',2200,2,.12,.3,'white',900);noise(o,.04,'bandpass',2800,6,.3,.5);tone(o,700,500,.04,.06,'square',.5);break;
      case 'build':o=O(.7,.2);noise(o,.1,'lowpass',700,.8,.4,0,'brown');noise(o,.1,'lowpass',700,.8,.35,.14,'brown');tone(o,440,880,.18,.05,'triangle',.25);break;
      case 'spit':o=O(.5,.12);noise(o,.25,'bandpass',800,4,.25*v,0,'pink',300);voice(o,300,180,.2,.05*v,[[900,6,1]],14);break;
      case 'groan':o=O(1.6,.25);{const f=rand(62,105),fm=rand(.85,1.25);voice(o,f,f*rand(.7,.9),rand(.7,1.3),.16*v,[[520*fm,5,1],[1150*fm,7,.6],[2500*fm,9,.2]],rand(3,7));}break;
      case 'roar':o=O(2.2,.4);{const d=drive(o,1.5);voice(d,88,52,1.1,.35*v,[[420,3,1],[900,4,.7],[2100,6,.3]],6);}noise(o,.9,'lowpass',300,.8,.3*v,0,'brown');break;
      case 'heal':o=O(1,.3);tone(o,520,780,.35,.06,'sine',0,.05);tone(o,780,1040,.35,.04,'sine',.1,.05);noise(o,.3,'highpass',5000,.7,.02,0);break;
      case 'throw':o=O(.4,.06);noise(o,.18,'bandpass',600,1.6,.25,0,'pink',1600);break;
      case 'ui':o=O(.15,.02);tone(o,1250,1100,.04,.05,'sine');noise(o,.01,'bandpass',4000,4,.04);break;
      case 'thunder':o=O(5,.7);noise(o,.08,'highpass',1500,.7,.25*v);noise(o,4,'lowpass',160,.5,1.1*v,.05,'brown',60);noise(o,3,'lowpass',90,.5,.9*v,.4,'brown',40);for(let i=0;i<5;i++)noise(o,rand(.6,1.4),'lowpass',rand(200,500),.6,.4*v,rand(.3,2.6),'brown',80);break;
      case 'zap':o=O(1.2,.4);noise(o,.3,'highpass',4500,.7,.9*v);noise(o,.7,'lowpass',900,.6,.6*v,.02,'pink',200);tone(o,120,40,.4,.4*v,'sine');break;
      case 'siren':o=O(1,.3);tone(o,620,1200,.45,.12*v,'sawtooth');tone(o,1200,620,.45,.12*v,'sawtooth',.45);break;
      case 'caw':o=O(1,.3);for(let i=0;i<3;i++)voice(o,rand(520,600),rand(380,430),.16,.12*v,[[1100,4,1],[2200,6,.6]],22,i*.18,'sawtooth');break;
      case 'howl':o=O(3.4,.7);voice(o,320,520,.8,.12*v,[[800,6,1],[1600,8,.4]],5,0,'triangle');voice(o,520,370,1.4,.12*v,[[800,6,1],[1600,8,.4]],4,.75,'triangle');break;
      case 'bleat':o=O(.7,.15);voice(o,rand(480,600),rand(380,450),.28,.09*v,[[900,5,1],[2000,7,.4]],18);break;
      case 'breath':o=O(1,.05);noise(o,.5,'bandpass',600,1.2,.12*v,0,'pink');noise(o,.4,'bandpass',900,1.4,.08*v,.48,'pink');break;
      case 'heart':o=O(.6,.02);tone(o,62,45,.11,.45*v,'sine');tone(o,58,42,.1,.3*v,'sine',.17);break;
      case 'step':break;
      default:o=O(.3,.1);tone(o,600,400,.05,.05);
    }
  }
  // ---------- footsteps by surface ----------
  function step(surface,v,x,z){if(!ctx||muted)return;const o=route({len:.4,wet:.05,x,z});v=v||1;
    switch(surface){
      case 'grass':noise(o,.09,'highpass',1800,.7,.07*v,0,'white',5000);noise(o,.06,'lowpass',500,.8,.08*v,0,'brown');break;
      case 'road':noise(o,.04,'bandpass',1400,1.5,.14*v);tone(o,110,70,.05,.1*v,'sine');break;
      case 'wood':tone(o,170,110,.08,.18*v,'sine');noise(o,.06,'bandpass',700,2,.12*v,0,'pink');break;
      case 'snow':for(let i=0;i<4;i++)noise(o,.03,'bandpass',rand(2200,3600),2,.07*v,i*.018);noise(o,.12,'lowpass',600,.8,.06*v,0,'brown');break;
      case 'ice':tone(o,1900,1700,.03,.05*v,'sine');noise(o,.04,'bandpass',2600,2,.08*v);break;
      case 'water':noise(o,.18,'bandpass',900,1.2,.15*v,0,'pink',300);noise(o,.12,'highpass',3000,.7,.05*v,.03);break;
    }
  }
  // ---------- continuous beds: wind, rain, fire, birds, crickets, owls, distant horde ----------
  const loops={};
  function bed(name,make){if(!loops[name])loops[name]=make();return loops[name];}
  function loopNoise(kind,type,freq,q){const s=ctx.createBufferSource();s.buffer=NB[kind];s.loop=true;const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(amb);s.start();return{s,f,g,cur:0};}
  function ambient(name,level){if(!ctx)return;
    const L=name==='rain'?bed('rain',()=>loopNoise('pink','bandpass',2400,.4)):name==='wind'?bed('wind',()=>loopNoise('brown','lowpass',380,1.4)):name==='rumble'?bed('rumble',()=>loopNoise('brown','lowpass',120,.8)):bed(name,()=>loopNoise('pink','bandpass',800,.6));
    L.cur+=((muted?0:level)-L.cur)*.05;L.g.gain.value=L.cur;
    if(name==='wind')L.f.frequency.value=260+L.cur*900+Math.sin(ctx.currentTime*.7)*120;
    if(name==='rain')L.f.frequency.value=INROOM>.5?900:2400;}
  let birdT=2,crickT=0,owlT=20,fireT=0,hordeT=8;
  function update(dt,st){
    if(!ctx||muted)return;LX=st.x;LZ=st.z;LYAW=st.yaw;INROOM+=((st.indoor?1:0)-INROOM)*Math.min(1,dt*3);
    ambient('rain',st.rain*.32*(st.indoor?.55:1));ambient('wind',clamp(st.wind-.2,0,1)*.24*(st.indoor?.4:1)+(st.blizzard?.12:0));ambient('rumble',st.storm*.05);
    const day=1-st.night;
    // dawn chorus and daytime birds (not in winter, not in rain)
    birdT-=dt;if(birdT<=0){birdT=rand(1.2,4.5)/Math.max(.2,day);if(day>.4&&st.rain<.2&&st.season!==3&&!st.indoor){const x=LX+rand(-30,30),z=LZ+rand(-30,30),o=route({len:1,wet:.25,x,z,bus:amb}),f=rand(2200,4200),n=randi(2,5);
      for(let i=0;i<n;i++)tone(o,f*rand(.9,1.15),f*rand(.7,1.3),rand(.05,.11),.03*day,'sine',i*rand(.08,.14));}}
    // crickets on warm nights
    crickT-=dt;if(crickT<=0){crickT=rand(.25,.6);if(st.night>.5&&(st.season===1||st.season===2||st.season===0&&st.temp>10)&&st.rain<.3&&!st.indoor){const o=route({len:.5,wet:.1,x:LX+rand(-15,15),z:LZ+rand(-15,15),bus:amb});for(let i=0;i<3;i++)tone(o,4600,4500,.025,.012*st.night,'sine',i*.04);}}
    owlT-=dt;if(owlT<=0){owlT=rand(14,30);if(st.night>.6&&!st.indoor){const o=route({len:2,wet:.4,x:LX+rand(-40,40),z:LZ+rand(-40,40),bus:amb});tone(o,390,370,.35,.05,'sine',0,.08);tone(o,370,340,.5,.05,'sine',.45,.08);}}
    fireT-=dt;if(fireT<=0){fireT=rand(.05,.25);if(st.fireD<12){const o=route({len:.3,wet:.1,x:st.fireX,z:st.fireZ,bus:amb});noise(o,.02,'bandpass',rand(1500,4500),3,.12*clamp(1-st.fireD/12,0,1));}}
    // a distant horde moaning on the wind at night
    hordeT-=dt;if(hordeT<=0){hordeT=rand(6,14);if(st.night>.5&&st.hordeD<160){const a=st.hordeA,o=route({len:2,wet:.7,x:LX+Math.sin(a)*40,z:LZ+Math.cos(a)*40,bus:amb});voice(o,rand(60,80),rand(50,60),rand(1.4,2.2),.05*clamp(1-st.hordeD/160,.2,1),[[480,4,1],[1000,6,.5]],3);}}
    music(dt,st);
  }
  // ---------- adaptive score ----------
  // a slow minor-key pad and sparse plucks while exploring, a pulsing low ostinato when you're hunted, drums in a fight
  const KEY=[0,3,5,7,10],CHORDS=[[0,3,7],[-4,0,3],[-2,2,5],[-5,-2,2]];let M=null;
  function startMusic(){M={chord:0,cT:0,pT:2,beat:0,bT:0,danger:0,fight:0,pad:[]};}
  function music(dt,st){if(!M)return;const t=ctx.currentTime,night=st.night;
    M.danger+=(st.danger-M.danger)*Math.min(1,dt*.8);M.fight+=(st.fight-M.fight)*Math.min(1,dt*(st.fight>M.fight?3:.4));
    const root=night>.5?41:45; // F2 at night, A2 by day (MIDI)
    const hz=m=>440*Math.pow(2,(m-69)/12);
    M.cT-=dt;if(M.cT<=0){M.cT=8;M.chord=(M.chord+1)%CHORDS.length;const ch=CHORDS[M.chord],v=.022*(1-M.fight*.5);
      for(const iv of ch){const f=hz(root+12+iv);for(const det of [-4,4]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=det;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=night>.5?600:900;
        const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+3);g.gain.linearRampToValueAtTime(v*.8,t+6);g.gain.linearRampToValueAtTime(.0001,t+9.5);
        o.connect(lp);lp.connect(g);g.connect(mus);const s=ctx.createGain();s.gain.value=.5;g.connect(s);s.connect(rvbIn);o.start(t);o.stop(t+10);}}}
    M.pT-=dt;if(M.pT<=0){M.pT=rand(1.6,4.2)*(1+M.danger);if(M.fight<.4){const m=root+24+KEY[randi(0,4)]+(Math.random()<.3?12:0),o=ctx.createGain();o.connect(mus);const s=ctx.createGain();s.gain.value=.8;o.connect(s);s.connect(rvbIn);
      tone(o,hz(m),hz(m)*.998,1.8,.03,'triangle',0,.004);tone(o,hz(m)*2,hz(m)*2,.9,.008,'sine',0,.004);}}
    // tension and combat pulse
    const bpm=78+M.fight*40;M.bT-=dt;if(M.bT<=0){M.bT=60/bpm/2;M.beat=(M.beat+1)%8;
      if(M.danger>.25){const o=ctx.createGain();o.connect(mus);tone(o,hz(root-12),hz(root-12)*.98,.22,.12*M.danger,'sine');if(M.beat%4===2)tone(o,hz(root-5),hz(root-5),.2,.05*M.danger,'triangle');}
      if(M.fight>.3){const o=ctx.createGain();o.connect(mus);if(M.beat%4===0)tone(o,110,40,.25,.35*M.fight,'sine');if(M.beat%4===2){noise(o,.12,'bandpass',1800,.8,.12*M.fight,0,'white');}
        if(M.beat%2===1)noise(o,.03,'highpass',7000,.7,.05*M.fight);if(M.beat===7)tone(o,160,80,.18,.18*M.fight,'sine');}}
  }
  function quiet(dt){if(!ctx)return;for(const L of Object.values(loops)){L.cur+=(0-L.cur)*Math.min(1,dt*3);L.g.gain.value=L.cur;}}
  function setVol(k,v){vol[k]=v;store.set('deadacre.vol',vol);applyVol();}
  return{init,play,ambient,step,update,setVol,quiet,get samples(){return Object.keys(SB).length;},get vol(){return vol;},toggle(){muted=!muted;applyVol();return muted;},get muted(){return muted;}};
})();


