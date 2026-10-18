/* ================= TERRAIN HOOK =================
   Game logic stays in "height above ground". Every material's vertex shader adds the terrain height,
   read from a 16-bit height texture around the player: objects use the height under their origin (so they
   stay upright), while decals and rain use the height under each vertex. The ground mesh itself is real geometry. */
const WL=-0.7; // water level
const TERR={N:256,cell:2,min:-8,rng:40,ox:-256,oz:-256};
TERR.data=new Uint8Array(TERR.N*TERR.N*4);TERR.grid=new Float32Array(TERR.N*TERR.N);
TERR.tex=new THREE.DataTexture(TERR.data,TERR.N,TERR.N,THREE.RGBAFormat);TERR.tex.magFilter=TERR.tex.minFilter=THREE.NearestFilter;TERR.tex.generateMipmaps=false;TERR.tex.needsUpdate=true;
TERR.mapU={value:TERR.tex};TERR.infoU={value:new THREE.Vector4(TERR.ox,TERR.oz,TERR.N*TERR.cell,0)};
const TERR_GLSL=`uniform sampler2D tMap;uniform vec4 tInfo;float tH;
float tDec(vec2 c){vec4 t=texture2D(tMap,(c+.5)/${TERR.N.toFixed(1)});return (t.r*65280.+t.g*255.)/65535.*${TERR.rng.toFixed(1)}+${TERR.min.toFixed(1)};}
float terrainH(vec2 p){vec2 g=clamp((p-tInfo.xy)/${TERR.cell.toFixed(1)}-.5,vec2(0.),vec2(${(TERR.N-1.001).toFixed(3)}));vec2 i=floor(g),f=g-i;
  return mix(mix(tDec(i),tDec(i+vec2(1.,0.)),f.x),mix(tDec(i+vec2(0.,1.)),tDec(i+vec2(1.,1.)),f.x),f.y);}
`;
const TERR_PROJ=`vec4 tW=vec4(transformed,1.);
#ifdef USE_INSTANCING
tW=instanceMatrix*tW;
#endif
tW=modelMatrix*tW;
#ifdef TERRAIN_VERTEX
tH=terrainH(tW.xz);
#else
vec4 tO=vec4(0.,0.,0.,1.);
#ifdef USE_INSTANCING
tO=instanceMatrix*tO;
#endif
tH=terrainH((modelMatrix*tO).xz);
#endif
tW.y+=tH;
vec4 mvPosition=viewMatrix*tW;
gl_Position=projectionMatrix*mvPosition;`;
function terrainInject(sh,m){
  if(!sh.vertexShader.includes('#include <project_vertex>'))return;
  const ud=m.userData||{};if(ud.noTerrain)return;
  sh.uniforms.tMap=TERR.mapU;sh.uniforms.tInfo=TERR.infoU;
  sh.vertexShader=(ud.terrainVertex?'#define TERRAIN_VERTEX\n':'')+TERR_GLSL+sh.vertexShader.replace('#include <project_vertex>',TERR_PROJ)
    .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )\nworldPosition.y+=tH;\n#endif');
}
{const P=THREE.Material.prototype,HOOK=function(sh){terrainInject(sh,this);};
  Object.defineProperty(P,'onBeforeCompile',{configurable:true,get(){return this._obcW||HOOK;},
    set(f){this._obc=f;this._obcW=function(sh,r){f.call(this,sh,r);terrainInject(sh,this);};}});
  P.customProgramCacheKey=function(){const u=this.userData||{};return(this._obc?this._obc.toString():'')+'|t'+(u.noTerrain?2:u.terrainVertex?1:0);};}

const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};

const MAP=105, BR=14, GRAV=22;
const isTouch=window.matchMedia&&matchMedia('(pointer: coarse)').matches;

