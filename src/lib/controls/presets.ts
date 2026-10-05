/**
 * Per-Console Control Presets
 * 
 * Defines which buttons each console supports and
 * console-specific default keyboard layouts.
 */

import { ButtonId, KeyboardMapping, ConsoleCapabilities, DPAD_BUTTONS } from './types';
import { DEFAULT_KEYBOARD } from './defaults';
import { getSystem } from '../systems';

/**
 * Console capabilities - which buttons each system has
 * Keyed by canonical system key (systems-data.ts). Button lists follow each
 * libretro core's RetroPad mapping: a button that is missing here gets no key.
 */
export const CONSOLE_CAPABILITIES: Record<string, ConsoleCapabilities> = {
    // ============ Nintendo ============
    NES: {
        console: 'NES',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'],
    },
    SNES: {
        console: 'SNES',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'],
    },
    N64: {
        console: 'N64',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'l', 'r', 'l2', 'start'], // No select; Z trigger is l2
    },
    GB: {
        console: 'GB',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'],
    },
    GBC: {
        console: 'GBC',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'],
    },
    GBA: {
        console: 'GBA',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'l', 'r', 'start', 'select'],
    },

    NDS: {
        console: 'NDS',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'],
    },

    // ============ Sega ============
    MASTER_SYSTEM: {
        console: 'MASTER_SYSTEM',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start'], // 1, 2, Pause
    },
    GENESIS: {
        console: 'GENESIS',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'], // 6-button: A/B/C + X/Y/Z, Mode
    },
    GAME_GEAR: {
        console: 'GAME_GEAR',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start'],
    },
    SATURN: {
        console: 'SATURN',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'l2', 'r2', 'start'], // Full 8-button
    },

    // ============ Sony ============
    PS1: {
        console: 'PS1',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'l2', 'r2', 'l3', 'r3', 'start', 'select'],
    },

    // ============ NEC ============
    PC_ENGINE: {
        console: 'PC_ENGINE', // TurboGrafx-16
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'], // I, II, Run, Select
    },

    // ============ Atari ============
    ATARI_2600: {
        console: 'ATARI_2600',
        buttons: [...DPAD_BUTTONS, 'a', 'start', 'select', 'l', 'r', 'l2', 'r2'], // Fire, Reset, Select, difficulty switches
    },
    ATARI_5200: {
        console: 'ATARI_5200',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select', 'l'], // Fire 1/2, Start, Select, Option
    },
    ATARI_7800: {
        console: 'ATARI_7800',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'start', 'select', 'l', 'r'], // Fire 1/2, Reset, Pause, Select, difficulty
    },
    LYNX: {
        console: 'LYNX',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'l', 'r'], // A, B, Pause, Option 1, Option 2
    },

    // ============ SNK ============
    NEOGEO: {
        console: 'NEOGEO',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'start', 'select'], // A-D, Start, Coin
    },
    NEOGEO_POCKET: {
        console: 'NEOGEO_POCKET',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start'], // A, B, Option
    },
    NEOGEO_POCKET_COLOR: {
        console: 'NEOGEO_POCKET_COLOR',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start'],
    },

    // ============ Other ============
    WONDERSWAN: {
        console: 'WONDERSWAN',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'start', 'select'], // Select rotates the screen
    },
    WONDERSWAN_COLOR: {
        console: 'WONDERSWAN_COLOR',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'start', 'select'],
    },
    ARCADE: {
        console: 'ARCADE',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'], // Generic 6-button, Coin
    },
};

/**
 * Console-specific keyboard overrides
 * Only specify keys that differ from DEFAULT_KEYBOARD
 */
export const CONSOLE_KEYBOARD_OVERRIDES: Partial<Record<string, Partial<KeyboardMapping>>> = {
    // Genesis: Different layout for 6-button pad
    GENESIS: {
        // Genesis A/B/C maps to our a/b/x (C is like a third action button)
        // Genesis X/Y/Z maps to our y/l/r
        x: 'KeyC',      // C button
        y: 'KeyA',      // X button
        l: 'KeyS',      // Y button
        r: 'KeyD',      // Z button
    },
};

/**
 * Get capabilities for a console
 * Falls back to SNES-like if unknown
 */
/** Canonical system key for any name or alias ('nes', 'Famicom', 'MASTER_SYSTEM' -> its key) */
function systemKey(system: string): string {
    return getSystem(system)?.key ?? system.toUpperCase();
}

export function getConsoleCapabilities(system: string): ConsoleCapabilities {
    const normalized = systemKey(system);
    return CONSOLE_CAPABILITIES[normalized] ?? {
        console: normalized,
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'],
    };
}

/**
 * Get the list of buttons for a console
 */
export function getConsoleButtons(system: string): ButtonId[] {
    return getConsoleCapabilities(system).buttons;
}

/**
 * Get default keyboard mapping for a console
 * Merges console-specific overrides with defaults
 */
export function getConsoleKeyboardDefaults(system: string): KeyboardMapping {
    const normalized = systemKey(system);
    const overrides = CONSOLE_KEYBOARD_OVERRIDES[normalized] ?? {};
    const capabilities = getConsoleCapabilities(system);

    // Start with defaults, apply overrides, filter to only supported buttons
    const full = { ...DEFAULT_KEYBOARD, ...overrides };

    // Only include buttons this console actually has
    const filtered: KeyboardMapping = {};
    for (const button of capabilities.buttons) {
        if (full[button]) {
            filtered[button] = full[button];
        }
    }

    return filtered;
}

/**
 * Check if a console supports a specific button
 */
export function consoleHasButton(system: string, button: ButtonId): boolean {
    return getConsoleButtons(system).includes(button);
}
