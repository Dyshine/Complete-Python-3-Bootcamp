/* ================= RENDERER ================= */
const stage=$('stage');
let GFX=store.get('deadacre.gfx',isTouch?'low':'high');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,GFX==='high'?1.75:1));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const DAY_FOG=new THREE.Color(0x8b9686),NIGHT_FOG=new THREE.Color(0x0a0f14),STORM_FOG=new THREE.Color(0x5d6670),ASH_FOG=new THREE.Color(0x8a8278);
scene.fog=new THREE.Fog(DAY_FOG.clone(),40,120);
scene.background=scene.fog.color;
const camera=new THREE.PerspectiveCamera(46,1,.5,300);
const CAM_OFF=new V3(0,25,16);

/* post-processing: bloom + film grade (vignette, grain, split tone, filmic curve, lightning flash) */
const GradeShader={
  uniforms:{tDiffuse:{value:null},time:{value:0},flash:{value:0},grain:{value:.045},vig:{value:1.15},sat:{value:.92},night:{value:0},res:{value:new THREE.Vector2(1,1)},expo:{value:1.0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:[
    'uniform sampler2D tDiffuse;uniform float time,flash,grain,vig,sat,night,expo;uniform vec2 res;varying vec2 vUv;',
    'float rnd(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}',
    'vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}',
    'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*expo;',
    ' c=mix(c,smoothstep(0.,1.,c),.45);c=mix(c,aces(c*1.6),.3);',
    ' float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);',
    ' c+=(1.-l)*vec3(-.012,.006,.026)*(1.+night)+l*vec3(.02,.008,-.018);',
    ' vec2 d=vUv-.5;c*=1.-dot(d,d)*vig;',
    ' c+=(rnd(floor(vUv*res)+fract(time)*61.)-.5)*grain;',
    ' c+=flash*vec3(.72,.78,.95);',
    ' gl_FragColor=vec4(c,1.);}'].join('\n')
};
let composer=null,bloomPass=null,gradePass=null;
const postOK=!!(THREE.EffectComposer&&THREE.RenderPass&&THREE.ShaderPass&&THREE.UnrealBloomPass);
function buildPost(){
  if(!postOK||GFX!=='high'){composer=null;return;}
  if(composer)return;
  composer=new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene,camera));
  bloomPass=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.45,.8);composer.addPass(bloomPass);
  gradePass=new THREE.ShaderPass(GradeShader);composer.addPass(gradePass);
  composer.setSize(innerWidth,innerHeight);
}
function resize(){
  const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h);
  camera.aspect=w/h;camera.fov=w<h?66:46;camera.updateProjectionMatrix();
  if(composer){composer.setSize(w,h);gradePass.uniforms.res.value.set(w,h);}
}
window.addEventListener('resize',resize);
buildPost();resize();

const hemi=new THREE.HemisphereLight(0xc9d6c4,0x3a3626,.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d0,1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-42,right:42,top:42,bottom:-42,near:1,far:150});sun.shadow.bias=-.0006;
scene.add(sun,sun.target);
const SUN_DAY=new THREE.Color(0xfff0d0),SUN_NIGHT=new THREE.Color(0x6f86b0);
const flash=new THREE.SpotLight(0xfff2cc,0,38,.55,.45,1);scene.add(flash,flash.target);
const muzzleLight=new THREE.PointLight(0xffb950,0,12,2);scene.add(muzzleLight);
const lantern=new THREE.PointLight(0xffd9a0,0,8,1.6);scene.add(lantern);
const boomLight=new THREE.PointLight(0xff8a30,0,30,2);scene.add(boomLight);
const floods=[[-4,-BR+1.6],[4,BR-1.6],[-BR+1.6,4],[BR-1.6,-4]].map(([x,z])=>{const l=new THREE.PointLight(0xfff0c0,0,36,1.4);l.position.set(x,6.5,z);scene.add(l);return l;});

