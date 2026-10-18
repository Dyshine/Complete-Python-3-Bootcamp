// Lints the game as one script (all src/game files joined, plus the test hooks) and reports problems against the source
// files, e.g. "src/game/23-zombies.js:41  'spawnZombi' is not defined". Catches misspelled names across files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = fs.readdirSync(path.join(ROOT, 'src/game')).filter(f => f.endsWith('.js')).sort().map(f => ['src/game/' + f, fs.readFileSync(path.join(ROOT, 'src/game', f), 'utf8')]);
files.push(['tests/hooks.js', fs.readFileSync(path.join(ROOT, 'tests/hooks.js'), 'utf8')]);
const head = "(function(){\n'use strict';\n", text = head + files.map(f => f[1]).join('') + '})();\n';
fs.mkdirSync(path.join(ROOT, '.lint'), { recursive: true });
fs.writeFileSync(path.join(ROOT, '.lint/game.js'), text);
const where = line => { let at = 3; for (const [f, t] of files) { const n = t.split('\n').length - 1; if (line < at + n) return `${f}:${line - at + 1}`; at += n; } return `game.js:${line}`; };
const [res] = await new ESLint({ cwd: ROOT }).lintFiles(['.lint/game.js']);
for (const m of res.messages) console.log(`${m.severity === 2 ? 'error' : 'warn '}  ${where(m.line)}  ${m.message}`);
console.log(res.errorCount ? `\n${res.errorCount} error(s)` : `lint clean: ${files.length} files`);
process.exit(res.errorCount ? 1 : 0);
