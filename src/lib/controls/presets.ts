/**
 * Per-Console Control Presets
 * 
 * Defines which buttons each console supports and
 * console-specific default keyboard layouts.
 */

import { ButtonId, KeyboardMapping, ConsoleCapabilities, DPAD_BUTTONS } from './types';
import { DEFAULT_KEYBOARD } from './defaults';

/**
 * Console capabilities - which buttons each system has
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
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'l', 'r', 'start'], // No select, has Z trigger (mapped to l2)
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

    // ============ Sega ============
    SMS: {
        console: 'SMS',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start'], // 1, 2, Pause
    },
    GENESIS: {
        console: 'GENESIS',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start'], // 6-button: A/B/C + X/Y/Z
    },
    GG: {
        console: 'GG',
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
    PCE: {
        console: 'PCE', // TurboGrafx-16
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'], // I, II, Run, Select
    },

    // ============ Atari ============
    ATARI2600: {
        console: 'ATARI2600',
        buttons: [...DPAD_BUTTONS, 'a', 'select'], // Fire, Select/Reset
    },
    ATARI7800: {
        console: 'ATARI7800',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'select'],
    },
    LYNX: {
        console: 'LYNX',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'], // A, B, Option 1, Option 2
    },

    // ============ SNK ============
    NGPC: {
        console: 'NGPC', // Neo Geo Pocket
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'start', 'select'],
    },

    // ============ Other ============
    WSC: {
        console: 'WSC', // WonderSwan
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'start'],
    },
    ARCADE: {
        console: 'ARCADE',
        buttons: [...DPAD_BUTTONS, 'a', 'b', 'x', 'y', 'l', 'r', 'start', 'select'], // Generic 6-button
    },
};

/**
 * Console-specific keyboard overrides
 * Only specify keys that differ from DEFAULT_KEYBOARD
 */
export const CONSOLE_KEYBOARD_OVERRIDES: Partial<Record<string, Partial<KeyboardMapping>>> = {
    // N64: Remap select since N64 has no select button
    N64: {
        select: 'KeyC', // Free up ShiftRight
        l2: 'KeyQ',     // Z trigger
    },

    // Genesis: Different layout for 6-button pad
    GENESIS: {
        // Genesis A/B/C maps to our a/b/x (C is like a third action button)
        // Genesis X/Y/Z maps to our y/l/r
        x: 'KeyC',      // C button
        y: 'KeyA',      // X button
        l: 'KeyS',      // Y button
        r: 'KeyD',      // Z button
    },

    // Atari: Simple fire button
    ATARI2600: {
        select: 'Tab', // Select/Reset
        start: 'KeyR', // Reset
    },
    ATARI7800: {
        select: 'Tab',
        start: 'KeyR',
    },
};

/**
 * Get capabilities for a console
 * Falls back to SNES-like if unknown
 */
export function getConsoleCapabilities(system: string): ConsoleCapabilities {
    const normalized = system.toUpperCase();
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
    const normalized = system.toUpperCase();
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
