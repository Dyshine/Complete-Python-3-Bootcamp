// Browser tests: builds game-test.html, serves the project folder, and drives the real game in headless Chromium.
//   npm test               quick suite (about 3-5 minutes in a software-rendered browser)
//   npm test -- --long     adds a four-night playthrough
//   npm test -- house      only suites whose name contains "house"
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../tools/build.mjs';
import { suites } from './suites.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), LONG = argv.includes('--long'), only = argv.filter(a => !a.startsWith('--'));
fs.writeFileSync(path.join(ROOT, 'game-test.html'), build({ test: true }).html);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const URL0 = `http://127.0.0.1:${server.address().port}/game-test.html`;

const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
fs.mkdirSync(path.join(ROOT, 'test-results'), { recursive: true });

// a fresh page with the game started; errors are collected and fail the suite
async function newGame({ diff } = {}) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 240)); });
  await page.goto(URL0);
  await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await page.waitForSelector('#startBtn', { state: 'visible', timeout: 60000 });
  if (diff) await page.click(`[data-diff="${diff}"]`);
  await page.click('#startBtn');
  await page.waitForFunction(() => __w().S.running, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { __P.hp = 1e6; for (const z of __Z) __kill(z); __sim(60, .05); });
  return { page, errors };
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

let failed = 0;
const t0 = Date.now();
for (const s of suites) {
  if (s.long && !LONG) continue;
  if (only.length && !only.some(o => s.name.includes(o))) continue;
  const start = Date.now();
  let g;
  try {
    g = await newGame(s.opts);
    const notes = await s.run(g.page, { expect, shot: n => g.page.screenshot({ path: path.join(ROOT, 'test-results', n + '.png') }) });
    expect(!g.errors.length, 'page errors: ' + g.errors.slice(0, 3).join(' | '));
    console.log(`  ok    ${s.name} (${((Date.now() - start) / 1000).toFixed(0)}s)${notes ? '  ' + notes : ''}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${s.name}: ${e.message.split('\n')[0]}`);
    if (g) await g.page.screenshot({ path: path.join(ROOT, 'test-results', 'FAIL-' + s.name + '.png') }).catch(() => {});
  } finally { if (g) await g.page.close().catch(() => {}); }
}
await browser.close(); server.close();
console.log(failed ? `\n${failed} failed` : `\nall passed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
