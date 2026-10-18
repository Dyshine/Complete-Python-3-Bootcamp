// Builds the game into one self-contained page.
//
//   node tools/build.mjs            -> dead-acre.html   (what gets published)
//   node tools/build.mjs --test     -> game-test.html   (adds tests/hooks.js; uses the local three.js from node_modules when installed)
//   node tools/build.mjs --check    -> builds in memory and reports, writes nothing
//
// The game is plain browser JavaScript split into numbered files under src/game. They are joined in filename order into a
// single classic <script>, so every file shares one scope, exactly as when the game was one file. Stylesheets in src/styles
// are joined the same way. Order matters: a file may use anything declared in an earlier file at load time, and anything at
// all from inside functions that run later.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = new Set(process.argv.slice(2));
const TEST = args.has('--test'), CHECK = args.has('--check');

const joinDir = (dir, ext) => fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort()
  .map(f => ({ f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));

export function build({ test = false } = {}) {
  const styles = joinDir(path.join(SRC, 'styles'), '.css');
  const game = joinDir(path.join(SRC, 'game'), '.js');
  if (test) game.push({ f: '../../tests/hooks.js', text: fs.readFileSync(path.join(ROOT, 'tests', 'hooks.js'), 'utf8') });
  const css = styles.map(s => s.text).join('').replace(/\n$/, '');
  const js = game.map(s => s.text).join('').replace(/\n$/, '');

  // a syntax error names the source file and line, not a line in a 6,000-line page
  try { new vm.Script(`(function(){'use strict';\n${js}\n})`, { filename: 'game.js' }); }
  catch (e) {
    const m = /game\.js:(\d+)/.exec(e.stack || ''), line = m ? +m[1] - 1 : 0;
    let where = '';let at = 1; for (const s of game) { const n = s.text.split('\n').length - 1; if (line < at + n) { where = `src/game/${s.f}:${line - at + 1}`; break; } at += n; }
    console.error(`${e.name}: ${e.message}\n    at ${where || 'game.js:' + line}`);process.exit(1);
  }

  let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  for (const [mark, body] of [['/*@STYLES*/', css], ['/*@GAME*/', js]]) {
    if (html.split(mark).length !== 2) throw new Error(`src/index.html must contain ${mark} exactly once`);
    html = html.replace(mark, () => body);
  }
  if (test) {
    // offline test runs: serve three.js r128 from node_modules when it is installed
    const local = path.join(ROOT, 'node_modules', 'three', 'build', 'three.min.js');
    if (fs.existsSync(local)) html = html
      .replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'node_modules/three/build/three.min.js')
      .replaceAll('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/', 'node_modules/three/examples/js/');
  }
  return { html, files: game.length, styles: styles.length, bytes: Buffer.byteLength(html) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build({ test: TEST });
  const target = path.join(ROOT, TEST ? 'game-test.html' : 'dead-acre.html');
  if (!CHECK) fs.writeFileSync(target, out.html);
  console.log(`${CHECK ? 'checked' : 'built ' + path.relative(ROOT, target)}: ${out.files} game files, ${out.styles} stylesheets, ${(out.bytes / 1024).toFixed(0)} KB`);
}
