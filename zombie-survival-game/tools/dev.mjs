// Dev server: http://localhost:5173 serves the game built in memory from src/ and reloads the page whenever a source file
// changes. A syntax error shows on the page and in the terminal instead of a blank screen. Add ?test for the test hooks
// (__sim, __w, ...) in the browser console. Nothing is written to disk; run `npm run build` before publishing.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 5173);
const clients = new Set();
const RELOAD = `<script>new EventSource('/__reload').onmessage=()=>location.reload();</script>`;

// build in a child process so a syntax error can't take the server down, and the error text is the build's own
function render(test) {
  const r = spawnSync(process.execPath, ['-e', `import('./tools/build.mjs').then(m=>process.stdout.write(m.build({test:${test}}).html))`], { cwd: ROOT, maxBuffer: 64 << 20, encoding: 'utf8' });
  if (r.status !== 0) return { error: (r.stderr || 'build failed').trim() };
  return { html: r.stdout + RELOAD };
}
const errorPage = e => `<!doctype html><meta charset=utf-8><body style="background:#140c0c;color:#f2d0c8;font:15px/1.5 monospace;padding:24px"><h2 style="color:#ff6a55">Build error</h2><pre>${e.replace(/</g, '&lt;')}</pre>${RELOAD}</body>`;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.css': 'text/css' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__reload') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }); res.write('\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
  if (u.pathname === '/' || u.pathname === '/index.html') {
    const out = render(u.searchParams.has('test'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(out.error ? errorPage(out.error) : out.html); return;
  }
  const p = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(PORT, () => console.log(`Dead Acre dev server: http://localhost:${PORT}  (watching src/, tests/hooks.js)`));

let timer = null;
const kick = file => { clearTimeout(timer); timer = setTimeout(() => {
  const out = render(false); console.log(out.error ? `\x1b[31m${out.error}\x1b[0m` : `rebuilt (${file})`);
  for (const c of clients) c.write('data: reload\n\n'); }, 120); };
fs.watch(path.join(ROOT, 'src'), { recursive: true }, (_, f) => kick(f));
fs.watch(path.join(ROOT, 'tests', 'hooks.js'), () => kick('tests/hooks.js'));
