// Packs firearms from Quaternius' Ultimate Gun Pack (CC0, OBJ folder) into models/guns/guns.json.
//   node tools/pack-guns.mjs "<path to 'Ultimate Gun Pack - July 2019/OBJ'>"
// Each gun is turned to the game's frame (barrel along +z, up +y), scaled to a length and moved so the origin sits at the
// top of the grip, where the hand holds it. Per material: an sRGB colour, Int16 positions in millimetres and Uint16
// triangle indices, both base64. The game builds flat-shaded meshes from them (29b-gun-models.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: node tools/pack-guns.mjs <OBJ folder>'); process.exit(1); }

// game key (class + tier) → source model, length in metres, grip position as a fraction of the length from the butt
const GUNS = {
  side1: ['Pistol_1', .27, .2], side2: ['Pistol_2', .27, .2], side3: ['Pistol_4', .28, .2], side4: ['Pistol_6', .3, .2],
  rev1: ['Revolver_1', .27, .14], rev2: ['Revolver_2', .32, .12], rev3: ['Revolver_3', .34, .12], rev4: ['Revolver_5', .36, .12],
  smg1: ['SubmachineGun_1', .42, .38], smg2: ['SubmachineGun_2', .45, .38], smg3: ['SubmachineGun_3', .6, .5], smg4: ['SubmachineGun_5', .62, .5],
  shot1: ['Shotgun_1', 1.0, .3], shot2: ['Shotgun_2', 1.0, .3], shot3: ['Shotgun_ShortStock', .82, .22], shot4: ['Shotgun_3', 1.0, .3],
  ar1: ['AssaultRifle_1', .82, .3], ar2: ['AssaultRifle2_1', .9, .32], ar3: ['AssaultRifle2_2', .92, .32], ar4: ['AssaultRifle2_4', .78, .36],
  hunt1: ['SniperRifle_3', 1.15, .3], hunt2: ['SniperRifle_4', 1.15, .3], hunt3: ['SniperRifle_1', 1.2, .3], hunt4: ['SniperRifle_2', 1.25, .28],
};

function parse(file) {
  const mtl = {}, objText = fs.readFileSync(file, 'utf8');
  const mtlFile = file.replace(/\.obj$/, '.mtl');
  if (fs.existsSync(mtlFile)) { let cur = null;
    for (const l of fs.readFileSync(mtlFile, 'utf8').split('\n')) { const t = l.trim().split(/\s+/);
      if (t[0] === 'newmtl') cur = t[1]; else if (t[0] === 'Kd' && cur) mtl[cur] = t.slice(1, 4).map(Number); } }
  const V = [], groups = new Map(); let g = null;
  for (const l of objText.split('\n')) { const t = l.trim().split(/\s+/);
    if (t[0] === 'v') V.push(t.slice(1, 4).map(Number));
    else if (t[0] === 'usemtl') { if (!groups.has(t[1])) groups.set(t[1], []); g = groups.get(t[1]); }
    else if (t[0] === 'f') { if (!g) { groups.set('_', []); g = groups.get('_'); }
      const idx = t.slice(1).map(s => { const i = parseInt(s, 10); return i < 0 ? V.length + i : i - 1; });
      for (let i = 1; i < idx.length - 1; i++) g.push(idx[0], idx[i], idx[i + 1]); } }
  return { V, groups, mtl };
}
const srgb = c => Math.round(255 * Math.min(1, Math.pow(Math.max(0, c), 1 / 2.2)));
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

const out = {};
for (const [key, [name, len, grip]] of Object.entries(GUNS)) {
  const { V, groups, mtl } = parse(path.join(SRC, name + '.obj'));
  // Blender OBJ: x along the gun (muzzle +x), y up, z across. Game: z along the gun, y up, x across → (−z, y, x)
  const P = V.map(([x, y, z]) => [-z, y, x]);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of P) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
  const s = len / (mx[2] - mn[2]);
  // origin: grip fraction along the length; height at the top of the receiver behind the grip (the highest point there)
  const gz = mn[2] + (mx[2] - mn[2]) * grip;
  let top = -1e9; for (const p of P) if (Math.abs(p[2] - gz) < (mx[2] - mn[2]) * .06) top = Math.max(top, p[1]);
  const oy = top - (top - mn[1]) * .18, ox = (mn[0] + mx[0]) / 2;
  // sight line: the highest point over the receiver, from just behind the grip to a third of the way up the gun
  let sight = -1e9; const L0 = mx[2] - mn[2];
  for (const p of P) if (p[2] > gz - L0 * .08 && p[2] < gz + L0 * .3) sight = Math.max(sight, p[1]);
  const mats = [];
  for (const [m, tri] of groups) {
    const used = new Map(), pos = [], idx = [];
    for (const i of tri) { if (!used.has(i)) { used.set(i, pos.length / 3); const p = P[i]; pos.push((p[0] - ox) * s * 1000, (p[1] - oy) * s * 1000, (p[2] - gz) * s * 1000); } idx.push(used.get(i)); }
    const kd = mtl[m] || [.5, .5, .5], hex = (srgb(kd[0]) << 16) | (srgb(kd[1]) << 8) | srgb(kd[2]);
    mats.push([hex, b64(Int16Array.from(pos, Math.round)), b64(Uint16Array.from(idx))]);
  }
  out[key] = { src: name, tip: +((mx[2] - gz) * s).toFixed(3), butt: +((gz - mn[2]) * s).toFixed(3), sight: +((sight - oy) * s).toFixed(3), mats };
}
fs.mkdirSync(path.join(ROOT, 'models/guns'), { recursive: true });
const file = path.join(ROOT, 'models/guns/guns.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log(`${Object.keys(out).length} guns → models/guns/guns.json (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
