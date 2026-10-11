// Packs the hero mesh and every animation clip into one small GLB the game loads as hero.glb.
// usage: npm i @gltf-transform/core@4 @gltf-transform/extensions@4
//        node tools/merge-hero.mjs out.glb base.glb 1024 idle.glb:idle walk_shoot.glb:walk walk_back_shoot.glb:back run.glb:run hit.glb:hit death.glb:death
// (needs ImageMagick `convert` for the texture resize)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { execFileSync } from 'child_process';
import fs from 'fs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const [out, base, texSize, ...pairs] = process.argv.slice(2);
const doc = await io.read(base); const root = doc.getRoot(); const buf = root.listBuffers()[0];
const nodes = new Map(root.listNodes().map(n => [n.getName(), n]));
for (const a of root.listAnimations()) a.setName('walk_casual');
for (const p of pairs) {
  const [file, label] = p.split(':'); const src = await io.read(file);
  for (const a of src.getRoot().listAnimations()) {
    const na = doc.createAnimation(label);
    for (const ch of a.listChannels()) {
      const target = nodes.get(ch.getTargetNode()?.getName()); if (!target) continue;
      const s = ch.getSampler();
      const inp = doc.createAccessor().setArray(s.getInput().getArray().slice()).setType('SCALAR').setBuffer(buf);
      const outp = doc.createAccessor().setArray(s.getOutput().getArray().slice()).setType(s.getOutput().getType()).setBuffer(buf);
      const ns = doc.createAnimationSampler().setInput(inp).setOutput(outp).setInterpolation(s.getInterpolation());
      na.addSampler(ns).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(ns));
    }
  }
}
for (const t of root.listTextures()) {
  fs.writeFileSync('/tmp/tin.jpg', Buffer.from(t.getImage()));
  execFileSync('convert', ['/tmp/tin.jpg', '-resize', `${texSize}x${texSize}`, '-quality', '82', '/tmp/tout.jpg']);
  t.setImage(new Uint8Array(fs.readFileSync('/tmp/tout.jpg'))).setMimeType('image/jpeg');
}
await io.write(out, doc);
