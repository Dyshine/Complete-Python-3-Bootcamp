// Packs the six baked houses of drummyfish's "Family house collection" (CC0) into models/rural/houses.json and their three
// baked skins into models/rural/skin_{a,b,c}.jpg.
//   node tools/pack-rural.mjs "<folder with house1_baked.obj … and house_a_bake.png …>"
// Per house: Int16 positions in millimetres of the source units (the game scales them), Uint16 UVs (0–65535) and Uint16
// triangle indices, all base64, one entry per unique position/UV pair. Needs ffmpeg for the JPEGs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: node tools/pack-rural.mjs <folder>'); process.exit(1); }
const OUT = path.join(ROOT, 'models/rural');
fs.mkdirSync(OUT, { recursive: true });
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

const types = [];
for (let n = 1; n <= 6; n++) {
  const V = [], T = [], key = new Map(), pos = [], uv = [], idx = [];
  for (const l of fs.readFileSync(path.join(SRC, `house${n}_baked.obj`), 'utf8').split('\n')) {
    const t = l.trim().split(/\s+/);
    if (t[0] === 'v') V.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'vt') T.push(t.slice(1, 3).map(Number));
    else if (t[0] === 'f') {
      const c = t.slice(1).map(s => { const [vi, ti] = s.split('/').map(x => parseInt(x, 10) - 1); const k = vi + '/' + ti;
        if (!key.has(k)) { key.set(k, pos.length / 3); pos.push(...V[vi]); const [u, v] = T[ti] || [0, 0]; uv.push(u, v); } return key.get(k); });
      for (let i = 1; i < c.length - 1; i++) idx.push(c[0], c[i], c[i + 1]);
    }
  }
  // sit it on the ground, centred on its footprint
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i + k]); mx[k] = Math.max(mx[k], pos[i + k]); }
  const off = [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2];
  const P = Int16Array.from(pos, (v, i) => Math.round((v - off[i % 3]) * 1000));
  const U = Uint16Array.from(uv, v => Math.round(Math.min(1, Math.max(0, v)) * 65535));
  types.push({ name: `house${n}`, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]].map(v => +v.toFixed(3)), pos: b64(P), uv: b64(U), idx: b64(Uint16Array.from(idx)) });
}
fs.writeFileSync(path.join(OUT, 'houses.json'), JSON.stringify({ types }));
for (const s of ['a', 'b', 'c'])
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(SRC, `house_${s}_bake.png`), '-q:v', '4', path.join(OUT, `skin_${s}.jpg`)]);
console.log(`${types.length} houses → models/rural/houses.json (${(fs.statSync(path.join(OUT, 'houses.json')).size / 1024).toFixed(0)} KB) + 3 skins`);
