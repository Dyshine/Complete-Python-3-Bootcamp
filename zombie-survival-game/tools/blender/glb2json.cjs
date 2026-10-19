// GLB -> embedded glTF JSON (one base64 buffer), the format the game ships as *.gltf.json
const fs=require('fs');const [src,dst]=process.argv.slice(2);const b=fs.readFileSync(src);
let o=12,json=null,bin=null;while(o<b.length){const len=b.readUInt32LE(o),type=b.readUInt32LE(o+4);const d=b.slice(o+8,o+8+len);if(type===0x4E4F534A)json=JSON.parse(d.toString());else bin=d;o+=8+len;}
if(bin){json.buffers[0].uri='data:application/octet-stream;base64,'+bin.toString('base64');}
fs.writeFileSync(dst,JSON.stringify(json));
