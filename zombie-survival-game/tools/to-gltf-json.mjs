// GLB -> self-contained glTF JSON (buffers and images embedded as data: URIs)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [inp, out] = process.argv.slice(2);
const doc = await io.read(inp);
const { json, resources } = await io.writeJSON(doc, { format: 'json', basename: 'm' });
const mime = u => /\.png$/i.test(u) ? 'image/png' : /\.jpe?g$/i.test(u) ? 'image/jpeg' : 'application/octet-stream';
for (const b of json.buffers || []) if (b.uri && resources[b.uri]) b.uri = 'data:application/octet-stream;base64,' + Buffer.from(resources[b.uri]).toString('base64');
for (const im of json.images || []) if (im.uri && resources[im.uri]) im.uri = `data:${mime(im.uri)};base64,` + Buffer.from(resources[im.uri]).toString('base64');
fs.writeFileSync(out, JSON.stringify(json));
