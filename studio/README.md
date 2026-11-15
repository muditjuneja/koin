# koin studio (prototype)

Headless gameplay automation for making clips: boots a game in Chromium with
Nostalgist (the emulator koin wraps), and lets a Node script drive it —
inputs, save states, RAM reads/freezes, an in-page autopilot, fast-forward and
recording (video + emulator audio).

Not part of the published `koin.js` package.

## Run

```bash
npm ci                                   # repo root
node studio/bosses.ts super-c            # every area: find the boss, record the kill -> studio/out/super-c/area-N.webm
node studio/bosses.ts super-c 1 3        # just areas 1 and 3
node studio/render.ts super-c            # -> area-N-vertical.mp4 (1080x1920) + super-c-all-bosses.mp4 (1920x1080)
node studio/render.ts super-c --cta-top "PLAY IT IN YOUR BROWSER" --cta "WEPLAYRETRO.GAMES"
```

`render.ts` needs the Press Start 2P font (SIL OFL) at
`studio/.cache/fonts/PressStart2P-Regular.ttf`:

```bash
mkdir -p studio/.cache/fonts && curl -o studio/.cache/fonts/PressStart2P-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf
```

## Game profiles (`profiles/*.json`)

Everything game-specific lives in a profile, assembled from published
sources (not found by hand): RAM addresses from Data Crystal / Gym Retro,
cheat codes from the libretro database and cheat guides. Each source is
linked in the profile. The pipeline checks what it can in-game (the game
reaches the "playing" mode, the start-area code lands on the right level).

| Field | Used for |
|---|---|
| `ram.frameCounter` | autopilot clock (works at 1x and fast-forward) |
| `ram.gameMode` | (optional) wait until gameplay has started |
| `ram.level` | (optional) verify the start-area cheat |
| `ram.progress` | bytes that change as the level scrolls: a stall = obstacle or boss arena |
| `boss.arena` | byte test for "boss screen" (`changed` since the area started, `eq`, `ne`, `mask`) |
| `boss.defeated` | byte test for the kill; `afterArena` for tests like "boss HP is 0" |
| `cheats.always` | (optional) core cheat codes: invincibility, weapon, lives |
| `cheats.startArea` | (optional) cheat code per area to start there |
| `freeze` | (optional) RAM bytes held every frame, e.g. `{"0x6c0": 28}` for full health |
| `start` | power-on to gameplay: `{"tap": "start", "waitMs": 600}` steps, or `{"select": "0x2a"}` to set a stage-select byte to `areas[].select` |
| `areas[].view` | `side` or `overhead`: picks the bot's behaviour sets |

## How a boss run works (`bosses.ts`)

1. **Scout (8x fast-forward).** Boot with the profile's cheats/freezes and
   start-area code (or stage select). A push/fight state machine drives the
   autopilot:
   - *push*: cycle push behaviours (side view: right / up-right / stand and
     shoot up / left / climb; top-down: up, sideways detours, back-outs,
     up-biased wanders); any scroll resets to the first.
   - *fight* starts when `boss.arena` holds and the screen has stopped
     scrolling for 4s (or after a stall longer than a full push cycle), and
     cycles fight behaviours. If scrolling resumes without the arena signal
     it was a mid-boss: back to push.
   The scout runs until `boss.defeated`; the last fight before the kill is the
   one to record. A rolling buffer of save states gives it a 3s lead-in.
2. **Fight (1x, in parallel).** One browser per fight behaviour, each loading
   the lead-in state and running the same state machine with that behaviour
   first. Each records until `boss.defeated` (+3.5s for the explosion). The
   quickest kill is kept.

Fights are decided at 1x on purpose: at fast-forward inputs only change once
per animation tick (several game frames), so a fast-forward winner doesn't
predict a 1x winner. Fast-forward is capped at 8x for the same reason.

## Experiments

```bash
node studio/experiments/title-input.ts   # boots Super C, presses Start/Select, writes screenshots
node studio/experiments/scout.ts         # first scout: stage 1 at fast-forward, a state per screen
node studio/experiments/inspect.ts studio/out/superc-scout   # screenshot each saved state at 1x
node studio/experiments/fight-watch.ts studio/out/super-c/area-1-boss.state up   # watch a fight at 1x
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

## Gotchas

- `findRam` must run with the emulator paused (`locateRam` does this): the
  heap also holds stale copies of RAM (the save-state buffer), and only live
  RAM keeps changing once resumed.
- Nostalgist's `pressDown` only fires keys that exist in the RetroArch config,
  so the page passes koin's default bindings explicitly.
- Rapid fire toggles per animation tick (`ticks: true`), not per game frame:
  at fast-forward many frames pass per tick and frame-based toggling aliases.
- Screenshots during fast-forward come out black; take them at 1x.
