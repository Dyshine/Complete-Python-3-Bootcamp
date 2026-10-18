// Each suite gets a freshly started game (player made invulnerable, nearby infected cleared) and returns a short note.
// Inside page.evaluate, __w() reaches any game binding by name; see tests/hooks.js.
export const suites = [
  {
    name: 'boot',
    async run(page, { expect }) {
      const r = await page.evaluate(() => { __sim(100, .05); const S = __w().S; return { samples: __w().Sound.samples, day: document.getElementById('phaseLabel').textContent, inHome: __w().inHome(__P.x, __P.z), chunks: __w().chunks.size, live: document.getElementById('liveView').textContent }; });
      expect(/DAY 1/.test(r.day), 'HUD should read DAY 1, got ' + r.day);
      expect(r.inHome, 'player should start inside the cabin');
      expect(r.chunks > 4, 'world chunks should stream in');
      expect(r.samples === 16, 'all 16 recorded weapon sounds decode, got ' + r.samples);
      return `${r.chunks} chunks, ${r.samples} sound sets, ${r.live} watching`;
    },
  },
  {
    name: 'climbing',
    async run(page, { expect }) {
      // jump onto a crate: walk at it, jump, land on top
      const crate = await page.evaluate(async () => {
        const w = __w(); __P.x = 40; __P.z = 40; __P.jy = 0; __P.yaw = Math.PI / 2; w.spawnCrate(42.2, 40, 'common');
        w.keys.KeyW = true; let top = 0;
        for (let i = 0; i < 26; i++) { if (i === 4) w.tryJump(); __sim(1, .05); top = Math.max(top, __P.jy); }
        w.keys.KeyW = false; __sim(10, .05); return { top, jy: __P.jy };
      });
      expect(crate.top > .8, 'should get on top of the crate, max height ' + crate.top.toFixed(2));
      // mantle a car roof
      const car = await page.evaluate(() => {
        const w = __w(); const c = w.carSpots.find(c => c.g && !c.stripped); if (!c) return null;
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot); __P.jy = 0; __P.x = c.x + cs * 2.3; __P.z = c.z - sn * 2.3; __P.yaw = Math.atan2(c.x - __P.x, c.z - __P.z);
        w.tryJump(); let top = 0; for (let i = 0; i < 24; i++) { __sim(1, .05); top = Math.max(top, __P.jy); } return top;
      });
      expect(car === null || car > 1.2, 'should mantle onto the car roof, reached ' + car);
      return `crate ${crate.top.toFixed(2)} m, car ${car === null ? 'n/a' : car.toFixed(2) + ' m'}`;
    },
  },
  {
    name: 'house',
    async run(page, { expect }) {
      const r = await page.evaluate(() => {
        const w = __w(), o = {};
        const win = w.hsegs.find(s => s.kind === 'win' && s.cz === 3 && s.cx < 0);
        __P.x = win.cx; __P.z = win.cz - .8; __P.wood = 10; w.useHome(w.homeTarget()); w.S.boardT = 0; w.useHome(w.homeTarget()); o.boards = win.st.boards;
        __P.x = 0; __P.z = 2; const t = w.homeTarget(); w.useHome(t); o.opened = w.HOME.door.open; w.useHome(t); o.closed = !w.HOME.door.open;
        const glass = w.hsegs.find(s => s.kind === 'win' && s.cz === -3 && s.cx > 0); w.hitscan(glass.cx, 0, 0, -1, 40, 10, 1, 0, 0xffffff); o.shattered = !glass.st.glass;
        o.wall = +w.homeRay(0, 0, 0, -1, 50, false).toFixed(2);
        __P.scrap = 2000; __P.wood = 200; __P.stone = 100; __P.parts = 50; const up = w.UPG.find(u => u.id === 'home'); up.buy(); up.buy();
        o.lv = w.HOME.lv; o.wins = w.hsegs.filter(s => s.kind === 'win').length; o.wing = w.inHome(7, 0) && w.inHome(-7, 0);
        return o;
      });
      expect(r.boards === 2, 'two boards nailed up, got ' + r.boards);
      expect(r.opened && r.closed, 'front door opens and closes');
      expect(r.shattered, 'a shot through the window breaks the glass');
      expect(r.wall < 4, 'house walls stop bullets');
      expect(r.lv === 3 && r.wins === 10 && r.wing, 'both wings build, with 10 windows');
      return `boards, door, glass, walls, wings`;
    },
  },
  {
    name: 'first-person',
    async run(page, { expect, shot }) {
      const r = await page.evaluate(() => {
        const w = __w(); __P.x = 30; __P.z = 30; w.setView('fp'); w.camYaw = 0; w.camPitch = .05; __sim(30, .05); w.updateCamera(.05);
        const o = { eye: +(__cam.position.y - w.gH(__P.x, __P.z)).toFixed(2), vm: w.gun.parent === w.VM, body: w.pl.visible };
        const z = __spawn('walker', __P.x, __P.z + 9); z.hp = 1; z.aware = 0; w.updateCamera(.05);
        for (let i = 0; i < 60 && !z.dying; i++) { w.tryFire(); __sim(1, .05); } o.killed = !!z.dying || z.hp <= 0;
        return o;
      });
      await shot('first-person');
      const back = await page.evaluate(() => { const w = __w(); w.setView('top'); w.setView('tp'); __sim(5, .05); return { vm: w.gun.parent === w.VM, body: w.pl.visible, view: localStorage.getItem('deadacre.view') }; });
      expect(r.eye > 1.4 && r.eye < 1.9, 'eye height ' + r.eye);
      expect(r.vm && !r.body, 'gun on the viewmodel rig and the body hidden');
      expect(r.killed, 'shooting straight ahead hits an infected');
      expect(!back.vm && back.body, 'third person gets the body and the gun back');
      return `eye ${r.eye} m, hit, back to third person`;
    },
  },
  {
    name: 'doors-and-windows',
    async run(page, { expect }) {
      const r = await page.evaluate(() => {
        const w = __w(); let d = null;
        for (let t = 60; t < 700 && !d; t += 48) { __P.x = t; __P.z = t; __sim(1, .05); d = w.sdoors.find(q => Math.hypot(q.px - __P.x, q.pz - __P.z) < 40); }
        if (!d) return { door: null };
        const a = d.a0 + d.ang, nx = -Math.sin(a), nz = Math.cos(a), mx = d.px + Math.cos(a) * d.len / 2, mz = d.pz + Math.sin(a) * d.len / 2;
        __P.x = mx + nx * 1.2; __P.z = mz + nz * 1.2; __sim(2, .05);
        w.useDoor(d); __sim(40, .05); const opened = w.doorOpen(d); w.useDoor(d); __sim(40, .05); const closed = !w.doorOpen(d);
        // shoot a building window
        let W = null; w.nearObs(__P.x, __P.z, 40, o => { if (!W && o.win && !o.win.broken && o.lvl === undefined && o.win.obs.length >= 2) W = o.win; });
        let broke = null;
        if (W) { const o0 = W.obs[0], o1 = W.obs[W.obs.length - 1], ux = o1.x - o0.x, uz = o1.z - o0.z, l = Math.hypot(ux, uz) || 1, wx = -uz / l, wz = ux / l;
          for (const s of [1, -1]) { w.hitscan(W.x + wx * s * 5, W.z + wz * s * 5, -wx * s, -wz * s, 30, 10, 1, 0, 0xffffff); if (W.broken) break; } broke = W.broken; }
        return { door: true, opened, closed, broke };
      });
      expect(r.door, 'found a building door');
      expect(r.opened && r.closed, 'building door opens and closes');
      expect(r.broke !== false, 'a shot breaks a building window');
      return `door ok, window ${r.broke === null ? 'none nearby' : 'broken'}`;
    },
  },
  {
    name: 'loot-placement',
    async run(page, { expect }) {
      const r = await page.evaluate(() => {
        const w = __w(); const P = [...w.TPLAN.values()][0]; if (!P) return null;
        const lot = P.items.find(i => i.type === 'bungalow'); __P.x = lot.x; __P.z = lot.z; __sim(3, .05);
        const subs = w.houses.filter(h => h.solid);
        const inside = w.crates.filter(c => subs.some(h => { const dx = c.x - h.x, dz = c.z - h.z, cs = Math.cos(h.rot), sn = Math.sin(h.rot), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; return Math.abs(lx) < h.hw - .2 && Math.abs(lz) < h.hd - .2; }));
        return { subs: subs.length, inside: inside.length, kit: w.SUB.ready };
      });
      expect(r && r.kit, 'suburban house kit loaded');
      expect(r.inside === 0, `${r.inside} crates spawned inside solid houses`);
      return `${r.subs} kit houses nearby, no crates inside`;
    },
  },
  {
    name: 'night-and-restart',
    async run(page, { expect }) {
      const night = await page.evaluate(() => {
        const w = __w(); __P.x = 0; __P.z = 0; w.startNight(true);
        for (let i = 0; i < 400; i++) __sim(1, .05);
        return { phase: w.S.phase, alive: w.zombies.filter(z => !z.dying).length, wedged: w.zombies.filter(z => !z.dying && w.hsegs.some(s => s.kind !== 'furn' && w.homeSolid(s) && z.x > s.x0 + .05 && z.x < s.x1 - .05 && z.z > s.z0 + .05 && z.z < s.z1 - .05)).length };
      });
      expect(night.phase === 'night' && night.alive > 0, 'night 1 spawns infected');
      expect(night.wedged === 0, `${night.wedged} infected stuck inside walls`);
      await page.evaluate(() => { __P.hp = 0; __w().die(); });
      await page.waitForSelector('#againBtn', { state: 'visible', timeout: 20000 });
      await page.click('#againBtn'); await page.waitForTimeout(2500);
      const r = await page.evaluate(() => { const w = __w(); return { running: w.S.running, wave: w.S.wave, lv: w.HOME.lv, door: w.HOME.door.hp, glass: w.hsegs.filter(s => s.kind === 'win').every(s => s.st.glass), inside: w.inHome(__P.x, __P.z) }; });
      expect(r.running && r.wave === 0 && r.lv === 1 && r.glass && r.inside, 'a new run resets the house and the clock: ' + JSON.stringify(r));
      return `${night.alive} infected on night 1, restart clean`;
    },
  },
  {
    name: 'four-nights',
    long: true,
    async run(page, { expect }) {
      const out = [];
      for (let n = 1; n <= 4; n++) {
        const r = await page.evaluate(async () => {
          const w = __w();
          for (const [x, z] of [[80, 30], [-60, 120], [150, -90]]) { __P.x = x; __P.z = z; __sim(40, .05); }
          __P.x = 0; __P.z = 2; w.startNight(false); let t = 0, kills0 = w.S.kills;
          while (w.S.phase === 'night' && t < 9000) {
            __sim(20, .05); t += 20; __P.hp = 1e7;
            for (const z of __Z) if (!z.dying && Math.hypot(z.x - __P.x, z.z - __P.z) < 22) __kill(z);
            for (const a of w.agents) if (!a.dying && Math.hypot(a.x, a.z) < 26) w.killAgent(a);
            if ([__P.x, __P.z].some(v => !Number.isFinite(v))) return { nan: true };
          }
          return { ended: w.S.phase === 'day', kills: w.S.kills - kills0, ticks: t };
        });
        expect(!r.nan, 'NaN position on night ' + n);
        expect(r.ended, 'night ' + n + ' never ended');
        out.push(r.kills);
      }
      return 'kills per night ' + out.join(' / ');
    },
  },
];
