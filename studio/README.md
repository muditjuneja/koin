# koin studio (prototype)

Headless gameplay automation for making clips: boots a game in Chromium with
Nostalgist (the emulator koin wraps), and lets a Node script drive it —
inputs, save states, RAM reads/freezes, an in-page autopilot, fast-forward and
recording (video + emulator audio).

Not part of the published `koin.js` package.

## Run

```bash
npm ci                                   # repo root
node studio/experiments/title-input.ts   # boots Super C, presses Start/Select, writes screenshots
node studio/experiments/scout.ts         # bot plays Super C stage 1 at fast-forward, saves a state per screen
node studio/experiments/inspect.ts studio/out/superc-scout   # screenshot each saved state at 1x
```

ROMs are fetched from the weplayretro.games store (`ROM_STORE` in `lib.ts`);
cores from the same RetroArch emscripten builds the e2e suite uses. Both are
cached in `studio/.cache/` (gitignored); output goes to `studio/out/`
(gitignored). Uses the system Chromium at `/opt/pw-browsers/chromium` when
present, or `STUDIO_CHROMIUM`.

## Layout

- `page.ts` — browser side; exposes `window.studio`:
  `launch`, `down/up/tap`, `fastForward`, `saveState/loadState` (base64),
  `findRam` (locate system RAM in the wasm heap from a save-state snapshot),
  `ram/ramAll/poke/freeze`, `autopilot` (button rules clocked by the game's
  frame counter, so it behaves the same at 1x and fast-forward),
  `startRecording/stopRecording`.
- `lib.ts` — Node side: fetch/unzip ROMs and cores, bundle `page.ts`, serve,
  launch Chromium, `Session.call()/record()/screenshot()`.
- `experiments/` — the scripts used to prove the pieces out on Super C.

## What works so far

- Boots at a steady 60fps headless; fast-forward runs NES at ~21x.
- Save states are raw (compression off), so NES RAM is the `RAM\0` chunk
  (2KB) and can be matched in the heap — `findRam`.
- Super C (USA): with lives frozen, a hold-right/rapid-fire/jump autopilot
  reaches the stage 1 boss on its own (~15s wall time at fast-forward).

### Super C (USA) RAM notes (found by hand)

| Address | Meaning |
|---|---|
| `$0053` | P1 lives remaining (medals shown) |
| `$0016` (mirrors `$0063`, `$0092`) | screens progressed in the stage |
| `$001B` (mirror `$005B`) | frame counter |

Finding these by hand per game doesn't scale. Next step is to source cheats
from the libretro cheat database and progress/boss signals from generic
methods (see the discussion in the PR/session) instead.

## Not done yet

- Recording verified end-to-end (WebM with audio) and the ffmpeg 9:16 render.
- Game Genie codes (most libretro `.cht` entries) need koin's core-level cheat
  path (`_cmd_cheat_set_code`), not the RAM freeze.
- Screenshots during fast-forward come out black; take them at 1x
  (`experiments/inspect.ts`).
