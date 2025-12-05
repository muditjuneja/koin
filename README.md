# Koin Deck Retro Player

A modern, opinionated React component for playing retro games in the browser, built for the **Koin Deck** ecosystem. Built on top of [Nostalgist.js](https://nostalgist.js.org/) and [RetroArch](https://www.retroarch.com/).

![Retro Game Player Screenshot](https://raw.githubusercontent.com/beingmudit/retro-game-player/main/screenshot.png)

## Features

- 🎮 **Multi-System Support**: NES, SNES, Genesis, Game Boy, GBA, N64, PlayStation, and more.
- 💾 **Save States**: Save and load your game progress instantly.
- ⏪ **Rewind**: Mistakes happen. Rewind time to fix them.
- 🎮 **Gamepad Support**: Plug and play support for standard controllers.
- ⌨️ **Customizable Controls**: Remap keyboard and gamepad inputs.
- 🏆 **RetroAchievements**: Login to track your achievements (requires account).
- 🎨 **Theming**: System-specific colors and icons.
- 📱 **Mobile Friendly**: Touch controls and responsive design.

## Installation

```bash
npm install koin-deck-retro-player
# or
yarn add koin-deck-retro-player
# or
pnpm add koin-deck-retro-player
```

## Usage

### React (Recommended)

```tsx
import { GamePlayer } from 'koin-deck-retro-player';
// ...
```

### Vanilla HTML / Web Component

You can use the player in any HTML page using the bundled Web Component.

1.  Include the script:
    ```html
    <script src="https://unpkg.com/koin-deck-retro-player/dist/web-component.global.js"></script>
    ```

2.  Use the tag:
    ```html
    <retro-game-player 
        rom-url="path/to/game.nes" 
        system="nes" 
        title="My Game"
    ></retro-game-player>
    ```

3.  Advanced properties (via JS):
    ```js
    const player = document.querySelector('retro-game-player');
    player.onSaveState = async (slot, blob) => {
        console.log('Saved!', blob);
    };
    ```

### Basic Example (React)

```tsx
import { GamePlayer } from 'koin-deck-retro-player';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GamePlayer
        romUrl="https://example.com/roms/mario.nes"
        system="NES"
        title="Super Mario Bros."
      />
    </div>
  );
}
```

### Advanced Usage

```tsx
import { GamePlayer } from 'koin-deck-retro-player';

function App() {
  return (
    <GamePlayer
      romUrl="https://example.com/roms/sonic.md"
      system="GENESIS"
      title="Sonic the Hedgehog"
      // Optional: Custom core
      core="genesis_plus_gx"
      // Optional: BIOS URL (needed for some systems like GBA, PS1)
      biosUrl="https://example.com/bios/bios.bin"
      // Optional: Start with a specific save state
      initialSaveState={myBlob}
      // Optional: Auto-save interval (defaults to 60s)
      autoSaveInterval={30000}
      // Optional: RetroAchievements
      retroAchievementsConfig={{
        username: 'myuser',
        token: 'mytoken', // Use token, NOT password
        hardcore: false,
      }}
      // Optional: Handle save states externally
      onSaveState={async (blob) => {
        await uploadSave(blob);
      }}
    />
  );
}
```

## Supported Systems

| System | Key | Core | Extensions |
|--------|-----|------|------------|
| Nintendo Entertainment System | `NES` | fceumm | .nes |
| Super Nintendo | `SNES` | snes9x | .sfc, .smc |
| Nintendo 64 | `N64` | mupen64plus_next | .n64, .z64 |
| Game Boy | `GB` | gambatte | .gb |
| Game Boy Color | `GBC` | gambatte | .gbc |
| Game Boy Advance | `GBA` | mgba | .gba |
| Sega Genesis / Mega Drive | `GENESIS` | genesis_plus_gx | .md, .gen |
| Sega Master System | `MASTER_SYSTEM` | gearsystem | .sms |
| Sega Game Gear | `GAME_GEAR` | gearsystem | .gg |
| PlayStation | `PS1` | pcsx_rearmed | .iso, .cue, .pbp |
| PC Engine / TurboGrafx-16 | `PC_ENGINE` | mednafen_pce_fast | .pce |
| Neo Geo Pocket | `NEOGEO_POCKET` | mednafen_ngp | .ngp, .ngc |
| WonderSwan | `WONDERSWAN` | mednafen_wswan | .ws, .wsc |
| Atari 2600 | `ATARI_2600` | stella | .a26 |
| Atari 7800 | `ATARI_7800` | prosystem | .a78 |
| Atari Lynx | `LYNX` | handy | .lnx |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `romUrl` | `string` | **Required** | URL to the ROM file. |
| `system` | `string` | **Required** | System key (e.g., 'NES', 'GBA'). |
| `title` | `string` | **Required** | Game title for display. |
| `core` | `string` | (Auto) | Specific Libretro core to use. |
| `biosUrl` | `string` | `undefined` | URL to BIOS file (required for some systems). |
| `systemColor` | `string` | (Auto) | Theme color for UI accents. |
| `onExit` | `() => void` | `undefined` | Callback when exit button is clicked. |
| `onSaveState` | `(slot, blob) => Promise` | `undefined` | Handler for saving state. |
| `onLoadState` | `(slot) => Promise<Blob>` | `undefined` | Handler for loading state. |
| `onAutoSave` | `(blob) => Promise` | `undefined` | Handler for auto-save (every 60s default). |
| `autoSaveInterval` | `number` | `60000` | Interval for auto-save in ms. |
| `onToggleCheat` | `(id, active) => void` | `undefined` | Handler for cheat toggle. |
| `onSessionStart` | `() => void` | `undefined` | Callback when emulator starts. |
| `onSessionEnd` | `() => void` | `undefined` | Callback when session ends. |
| `onGetSaveSlots` | `() => Promise<SaveSlot[]>` | `undefined` | Handler for listing save slots. |
| `onDeleteSaveState` | `(slot) => Promise` | `undefined` | Handler for deleting a save slot. |
| `maxSlots` | `number` | `undefined` | Maximum number of save slots allowed (for tier limits). |
| `currentTier` | `string` | `undefined` | Current user tier (for UI display). |
| `retroAchievementsConfig` | `object` | `undefined` | Configuration for RetroAchievements (hardcore mode, etc.). |
| `raUser` | `object` | `undefined` | RetroAchievements user object (username, token, etc.). |
| `raGame` | `object` | `undefined` | RetroAchievements game object. |
| `raAchievements` | `object` | `undefined` | List of achievements. |
| `onRALogin` | `(user) => void` | `undefined` | Callback for RA login. |
| `onRALogout` | `() => void` | `undefined` | Callback for RA logout. |
| `onEmergencySave` | `(blob) => Promise` | `undefined` | Handler for emergency saves (tab close/hide). |

## Reliability Features

-   **Save Queue**: Built-in queue system prevents save corruption by serializing all save/load operations.
-   **Optimized File System**: Includes a patched version of Nostalgist.js to eliminate file system timeouts during heavy load (e.g., rewind buffering).
-   **Emergency Saves**: Automatically attempts to save progress when the tab is closed or hidden.

## License

MIT © [Mudit Juneja](https://github.com/muditjuneja)
