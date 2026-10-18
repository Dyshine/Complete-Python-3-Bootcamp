# Dead Acre

A third-person zombie survival game show in three.js. Condemned inmates are dropped into a Midwest quarantine zone and
broadcast live; the show runs until they die.

`dead-acre.html` is the playable game: one self-contained page plus the `models/` and `textures/` folders next to it.
It is **built** from `src/`. Edit the files in `src/`, never `dead-acre.html` directly.

## Commands

```sh
npm install         # once: three.js (for offline tests), Playwright, ESLint
npm run dev         # http://localhost:5173, rebuilds and reloads the page on every save
npm run build       # writes dead-acre.html
npm run check       # build in memory + lint, writes nothing; run before committing
npm test            # browser tests in headless Chromium (about 4 minutes)
npm run test:long   # adds a four-night playthrough
npm test -- house   # only suites whose name contains "house"
```

`npm run dev` shows a syntax error on the page with its source file and line instead of a blank screen. Open
`http://localhost:5173/?test` to get the test hooks in the browser console (`__sim(100, .05)` fast-forwards, `__w().S`
is the game state, `__w().spawnZombie('walker', x, z)` spawns one).

## Layout

```
src/index.html        page markup; /*@STYLES*/ and /*@GAME*/ mark where the build inserts CSS and the game
src/styles/*.css      joined in filename order
src/game/*.js         the game, joined in filename order into one script
tests/hooks.js        test-only hooks, added inside the game's scope by test builds
tests/suites.mjs      the browser test suites; tests/run.mjs runs them
tools/build.mjs       the build; tools/dev.mjs the dev server; tools/lint.mjs the linter
models/, textures/    assets loaded at runtime (see models/houses/LICENSE-kenney.txt)
```

### How the game files fit together

The files in `src/game` are numbered and joined, in order, into **one** script that runs in a single shared scope, exactly
as when the game was one file. Consequences:

- A name declared in any file is visible in every other file. There are no imports.
- **Order matters at load time.** Code that runs immediately (top-level statements, `const` initialisers) can only use
  what earlier files declared. Code inside functions can use anything, because it runs later.
- To add a system, create a file with a number that places it after what it needs at load time, e.g. `27b-traps.js`.
- `npm run lint` checks the joined script, so a misspelled name in any file is reported against that file and line.

The main loop is in `50-ui-wiring-main-loop.js`: `frame()` runs every animation frame and calls `stepWorld(dt)`, the one
list of per-tick updates. Add a new system's `update…(dt)` there; the tests use the same function, so they cover it too.

| Files | What's in them |
|---|---|
| 00–05 | helpers, terrain shader hook, audio engine, gamepad, renderer, materials |
| 06–12 | world generation (towns, farms, landmarks, stores), suburban houses, grass, decals, the cabin, props |
| 13–22 | player, definitions and state, weather, difficulty, floors and stairs, gathering and farming, stealth |
| 23–27 | infected (types, variants, skins), hordes, perimeter fence |
| 29–34 | weapons, crates and pickups, HUD, workshop menu, day/night phases, RPG |
| 35–45 | exploration, wildlife, map and survivor sheet, movement, weapon handling and carries, crafting, seasons, item limits, loot, camps |
| 46–50 | input, per-frame updates, lifecycle, the TV show, UI wiring and the main loop |

## Credits

- Suburban houses: City Kit Suburban by Kenney (www.kenney.nl), CC0.
- Trooper body: the three.js example *Soldier*, a Mixamo character.
- three.js r128.
