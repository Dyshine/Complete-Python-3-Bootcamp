// Strips a rigged GLB down to its skeleton + animation clips and writes self-contained glTF JSON.
// usage: node tools/anim-only.mjs in.glb out.gltf.json clipName
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [inp, out, name] = process.argv.slice(2);
const doc = await io.read(inp); const root = doc.getRoot();
for (const n of root.listNodes()) { n.setMesh(null); n.setSkin(null); }
for (const m of root.listMeshes()) for (const prim of m.listPrimitives()) prim.dispose();
for (const x of [...root.listMeshes(), ...root.listSkins(), ...root.listMaterials(), ...root.listTextures()]) x.dispose();
for (const a of root.listAnimations()) if (name) a.setName(name);
// drop accessors nothing references any more (mesh attributes, skin matrices)
for (const acc of root.listAccessors()) if (!acc.listParents().some(p => p.propertyType !== 'Root')) acc.dispose();
const { json, resources } = await io.writeJSON(doc, { format: 'json', basename: 'a' });
for (const b of json.buffers || []) if (b.uri && resources[b.uri]) b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64');
fs.writeFileSync(out, JSON.stringify(json));
