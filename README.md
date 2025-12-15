# koin.js

## Browser Retro Game Emulation for React

> **28 systems. Cloud saves. Multi-language. Zero backend required.**

[![Try the Demo](https://img.shields.io/badge/PLAY-TRY%20THE%20DEMO-FFD600?style=for-the-badge&logoColor=black&labelColor=black)](https://koin.js.org/)
[![NPM Version](https://img.shields.io/npm/v/koin.js?style=for-the-badge&color=white&labelColor=black)](https://www.npmjs.com/package/koin.js)
[![License](https://img.shields.io/npm/l/koin.js?style=for-the-badge&color=white&labelColor=black)](LICENSE)

The drop-in React component for browser-based retro game emulation. Built on [Nostalgist.js](https://github.com/arianrhodsandlot/nostalgist), adding production-ready features like cloud saves, touch controls, gameplay recording, and RetroAchievements.

![koin.js](./koin-player.png)

## Features

### 🎮 Core Emulation
- **28 Consoles** — NES to PlayStation, Game Boy to Dreamcast
- **Automatic Core Selection** — Best emulator core per system
- **BIOS Management** — Multi-file BIOS support with UI selection
- **Performance Optimized** — SharedArrayBuffer for maximum speed

### ☁️ Save System
- **Slot-Based Saves** — Multiple save states with screenshots
- **Auto-Save** — Periodic background saves (configurable interval)
- **Emergency Saves** — Automatic save on tab hide/close
- **Cloud-Ready API** — Bring your own backend with async handlers

### 🎨 Display & Effects
- **10 CRT Shaders** — Lottes, Geom, Easymode, Hyllian, zFast, and more
- **Runtime Shader Switching** — Change filters without restart
- **System Theming** — Per-console accent colors
- **Screenshot Capture** — PNG snapshots with hotkey support

### 🕹️ Controls
- **Keyboard Remapping** — Per-console custom key bindings
- **Gamepad Support** — Auto-detect Xbox, PlayStation, Nintendo controllers
- **Touch Controls** — GPU-accelerated virtual D-pad and buttons for mobile
- **Control Persistence** — Saves user preferences across sessions

### ⏪ Special Features
- **Rewind** — Time-travel gameplay (auto-enabled for 8/16-bit)
- **Speed Control** — 0.25x to 4x with hotkey toggle
- **Fast-Forward** — Turbo mode for grinding

### 📹 Recording & Overlays
- **Gameplay Recording** — VP9/VP8 WebM capture at 30fps
- **Performance Overlay** — FPS, frame time, memory stats
- **Input Display** — Virtual controller overlay for streaming
- **Toast Notifications** — Non-intrusive save/load feedback

### 🏆 RetroAchievements
- **Official RA Integration** — Track unlocks across sessions
- **Hardcore Mode** — Disable saves/cheats for leaderboard eligibility
- **Achievement Browser** — Filter by locked/unlocked status
- **Progress Tracking** — Points remaining per game

### 🌍 Internationalization
- **3 Built-in Languages** — English, Spanish, French
- **Type-Safe Translations** — Full TypeScript support
- **Partial Overrides** — Customize specific strings
- **Custom Languages** — Implement your own translation set

### 🎯 Developer Experience
- **TypeScript First** — Complete type definitions
- **Zero Config** — Works out of the box
- **Customizable UI** — Accent colors, shaders, controls
- **Web Component** — Use without React

## Installation

```bash
npm install koin.js
# or
yarn add koin.js
# or
pnpm add koin.js
```

## Quick Start

```tsx
import { GamePlayer } from 'koin.js';
import 'koin.js/styles.css';

export default function App() {
  return (
    <GamePlayer
      romId="game-123"
      romUrl="/roms/mario.nes"
      system="NES"
      title="Super Mario Bros."
    />
  );
}
```

## Cloud Integration

```tsx
import { GamePlayer } from 'koin.js';

<GamePlayer
  romId="game-123"
  romUrl="/roms/game.nes"
  system="NES"
  title="My Game"
  
  // Cloud save handlers
  onSaveState={async (slot, blob, screenshot) => {
    await fetch(`/api/saves/${slot}`, {
      method: 'POST',
      body: blob,
    });
  }}
  onLoadState={async (slot) => {
    const res = await fetch(`/api/saves/${slot}`);
    return res.ok ? await res.blob() : null;
  }}
  onAutoSave={async (blob, screenshot) => {
    await fetch('/api/autosave', { method: 'POST', body: blob });
  }}
  
  // Customization
  systemColor="#FF3333"
  shader="crt/crt-lottes"
  initialLanguage="es"
/>
```

## Internationalization

```tsx
<GamePlayer
  initialLanguage="es"  // Spanish UI
/>

// Or provide custom translations
import { en } from 'koin.js';

<GamePlayer
  translations={{
    controls: {
      ...en.controls,
      play: 'START GAME',
    }
  }}
/>
```

## Web Component

```html
<script src="https://unpkg.com/koin.js/dist/web-component.global.js"></script>

<retro-game-player
  rom-url="./game.nes"
  system="nes"
  title="My Game"
  rom-id="game-1"
></retro-game-player>
```

## Supported Systems

| System | Key | Core |
|--------|-----|------|
| NES / Famicom | `NES` | fceumm |
| Super Nintendo | `SNES` | snes9x |
| Nintendo 64 | `N64` | mupen64plus_next |
| Game Boy / Color | `GB`, `GBC` | gambatte |
| Game Boy Advance | `GBA` | mgba |
| Nintendo DS | `NDS` | desmume |
| PlayStation | `PS1` | pcsx_rearmed |
| PSP | `PSP` | ppsspp |
| Sega Genesis / Mega Drive | `GENESIS` | genesis_plus_gx |
| Sega Master System | `MASTER_SYSTEM` | gearsystem |
| Game Gear | `GAME_GEAR` | gearsystem |
| Sega Saturn | `SATURN` | yabasanshiro |
| Sega Dreamcast | `DREAMCAST` | flycast |
| Sega CD | `SEGA_CD` | genesis_plus_gx |
| Neo Geo | `NEOGEO` | fbalpha2012_neogeo |
| Arcade (MAME) | `ARCADE` | mame2003_plus |
| Atari 2600 | `ATARI2600` | stella |
| Atari 7800 | `ATARI7800` | prosystem |
| Atari Lynx | `LYNX` | handy |
| PC Engine / TurboGrafx-16 | `PCE` | mednafen_pce |
| WonderSwan / Color | `WS`, `WSC` | mednafen_wswan |
| Virtual Boy | `VB` | mednafen_vb |
| Vectrex | `VECTREX` | vecx |
| Commodore 64 | `C64` | vice_x64 |
| DOS | `DOS` | dosbox_pure |

[Full system details →](https://koin.js.org/docs/systems)

## Requirements

**COOP/COEP Headers Required** for `SharedArrayBuffer`:

```js
// next.config.js
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ],
  }];
}
```

## Documentation

- **[Quick Start](https://koin.js.org/docs/installation)** — Get up and running
- **[Usage Guide](https://koin.js.org/docs/usage)** — Cloud saves, BIOS, RA integration
- **[API Reference](https://koin.js.org/docs/api)** — Complete props documentation
- **[Advanced Guide](https://koin.js.org/docs/advanced)** — Shaders, recording, controls, i18n
- **[Systems List](https://koin.js.org/docs/systems)** — Per-console configuration

## License

MIT © Mudit Juneja
