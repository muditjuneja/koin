/**
 * Controls Hints
 *
 * What the "system" buttons do on each console, so a player can be told at
 * game start which key inserts a coin, starts or resets the game. Labels
 * follow each libretro core's RetroPad mapping (docs.libretro.com/library),
 * which is not always what the button is called: on the Atari 2600 Start is
 * the console's Reset switch, on the 7800 the game starts from Reset (X).
 */

import { getSystem } from '../systems';
import { formatKeyCode } from './labels';
import type { ButtonId, KeyboardMapping } from './types';

interface SystemHint {
    /** Buttons to mention, in display order, with what they do on this system */
    buttons: Array<[ButtonId, string]>;
    /** Arcade-style: the hint is about inserting a coin */
    coin?: boolean;
}

const DEFAULT_HINT: SystemHint = { buttons: [['start', 'Start'], ['select', 'Select']] };
const START_ONLY: SystemHint = { buttons: [['start', 'Start']] };
const ARCADE_HINT: SystemHint = { buttons: [['select', 'Insert coin'], ['start', 'Start']], coin: true };

/** Keyed by canonical system key (systems-data.ts); anything not listed gets DEFAULT_HINT */
const SYSTEM_HINTS: Record<string, SystemHint> = {
    N64: START_ONLY,
    SATURN: START_ONLY,
    GAME_GEAR: START_ONLY,
    GENESIS: { buttons: [['start', 'Start'], ['select', 'Mode']] },
    MASTER_SYSTEM: { buttons: [['b', 'Start game (button 1)'], ['start', 'Pause']] },
    PC_ENGINE: { buttons: [['start', 'Run'], ['select', 'Select']] },
    ARCADE: ARCADE_HINT,
    NEOGEO: ARCADE_HINT,
    NEOGEO_POCKET: { buttons: [['start', 'Option']] },
    NEOGEO_POCKET_COLOR: { buttons: [['start', 'Option']] },
    WONDERSWAN: { buttons: [['start', 'Start'], ['select', 'Rotate screen']] },
    WONDERSWAN_COLOR: { buttons: [['start', 'Start'], ['select', 'Rotate screen']] },
    ATARI_2600: { buttons: [['start', 'Reset (start game)'], ['select', 'Game select']] },
    ATARI_7800: { buttons: [['x', 'Reset (start game)'], ['start', 'Pause'], ['select', 'Select']] },
    ATARI_5200: { buttons: [['start', 'Start'], ['select', 'Select'], ['l', 'Option']] },
    LYNX: { buttons: [['start', 'Pause'], ['l', 'Option 1'], ['r', 'Option 2']] },
    C64: { buttons: [['start', 'Return'], ['select', 'Virtual keyboard'], ['l2', 'Run/Stop']] },
};

export interface ControlsHint {
    /** True when the hint is about inserting a coin (arcade systems) */
    coin: boolean;
    /** e.g. "Insert coin: R Shift · Start: Enter" */
    message: string;
}

/**
 * The game-start hint for a system, using the player's own key mapping.
 * Buttons with no key bound are left out; null if nothing is left to say.
 */
export function getControlsHint(system: string, keyboard: KeyboardMapping): ControlsHint | null {
    const key = getSystem(system)?.key ?? system.toUpperCase();
    const hint = SYSTEM_HINTS[key] ?? DEFAULT_HINT;
    const parts = hint.buttons.flatMap(([button, label]) => {
        const code = keyboard[button];
        return code ? [`${label}: ${formatKeyCode(code)}`] : [];
    });
    if (parts.length === 0) return null;
    return { coin: !!hint.coin, message: parts.join(' · ') };
}
