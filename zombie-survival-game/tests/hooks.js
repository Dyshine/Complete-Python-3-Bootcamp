// Test-only hooks, appended inside the game's scope by `node tools/build.mjs --test`. Never part of the published page.
//   __P player, __Z zombies, __H hero, __cam camera
//   __sim(n, dt)  run n game ticks of dt seconds through the real stepWorld (headless browsers render ~4 fps)
//   __w()         any game binding by name: __w().S.wave, __w().spawnZombie('walker', x, z), __w().keys.KeyW = true
//   __spawn, __kill, __zatk  shortcuts for spawnZombie, killZombie, zAttackAnim
//   __camHook = c => {...}   take over the third-person camera for screenshots
// The broadcast intro is skipped unless the URL has ?intro.
window.__P = player; window.__Z = zombies; window.__H = HERO; window.__cam = camera;
window.__spawn = spawnZombie; window.__kill = killZombie; window.__zatk = zAttackAnim;
window.__sim = function (n, dt) {
  for (let i = 0; i < n; i++) {
    if (!S.running || S.paused || S.menu || S.over || S.panel) return;
    stepWorld(dt); updateDmgNums(dt); updateStealthHUD();
  }
  updateHUD(); drawMinimap();
};
window.__w = () => new Proxy({}, { get: (_, k) => typeof k === 'string' ? eval(k) : undefined });
if (!location.search.includes('intro')) showIntro = go => go();
{ const tp = updateCameraTP; updateCameraTP = function (dt) { if (window.__camHook) { window.__camHook(camera); return; } tp(dt); }; }
window.__ready = true;
