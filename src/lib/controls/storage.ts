/**
 * Control Storage Utilities
 * 
 * Load and save keyboard/gamepad mappings from localStorage.
 */

import { KeyboardMapping, GamepadMapping, PlayerIndex } from './types';
import { DEFAULT_KEYBOARD, DEFAULT_GAMEPAD } from './defaults';
import { getConsoleKeyboardDefaults } from './presets';

// Storage key prefixes
const KEYBOARD_KEY_PREFIX = 'retrosaga-controls';
const GAMEPAD_KEY_PREFIX = 'retrosaga-gamepad';

/**
 * Get localStorage key for keyboard controls
 * Per-system storage: retrosaga-controls-NES, retrosaga-controls-SNES, etc.
 */
function getKeyboardStorageKey(system?: string): string {
    if (system) {
        return `${KEYBOARD_KEY_PREFIX}-${system.toUpperCase()}`;
    }
    return KEYBOARD_KEY_PREFIX; // Legacy global key
}

/**
 * Get localStorage key for gamepad bindings
 * Per-player storage: retrosaga-gamepad-p1, retrosaga-gamepad-p2, etc.
 */
function getGamepadStorageKey(playerIndex: PlayerIndex): string {
    return `${GAMEPAD_KEY_PREFIX}-p${playerIndex}`;
}

/**
 * Load keyboard mapping from localStorage
 * Falls back to console-specific defaults if not found
 */
export function loadKeyboardMapping(system?: string): KeyboardMapping {
    if (typeof window === 'undefined' || !window.localStorage) {
        return system ? getConsoleKeyboardDefaults(system) : DEFAULT_KEYBOARD;
    }

    const storageKey = getKeyboardStorageKey(system);

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored) as KeyboardMapping;
        }

        // Fallback: check legacy global key
        if (system) {
            const legacyStored = localStorage.getItem(KEYBOARD_KEY_PREFIX);
            if (legacyStored) {
                return JSON.parse(legacyStored) as KeyboardMapping;
            }
        }
    } catch (e) {
        console.error('[Controls] Failed to load keyboard mapping:', e);
    }

    // Return console-specific defaults
    return system ? getConsoleKeyboardDefaults(system) : DEFAULT_KEYBOARD;
}

/**
 * Save keyboard mapping to localStorage
 */
export function saveKeyboardMapping(mapping: KeyboardMapping, system?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('[Controls] localStorage not available');
        return;
    }

    const storageKey = getKeyboardStorageKey(system);

    try {
        localStorage.setItem(storageKey, JSON.stringify(mapping));
    } catch (e) {
        console.error('[Controls] Failed to save keyboard mapping:', e);
    }
}

/**
 * Load gamepad mapping from localStorage
 * Falls back to standard defaults if not found
 */
export function loadGamepadMapping(playerIndex: PlayerIndex = 1): GamepadMapping {
    if (typeof window === 'undefined' || !window.localStorage) {
        return { ...DEFAULT_GAMEPAD };
    }

    const storageKey = getGamepadStorageKey(playerIndex);

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return JSON.parse(stored) as GamepadMapping;
        }
    } catch (e) {
        console.error('[Controls] Failed to load gamepad mapping:', e);
    }

    return { ...DEFAULT_GAMEPAD };
}

/**
 * Save gamepad mapping to localStorage
 */
export function saveGamepadMapping(mapping: GamepadMapping, playerIndex: PlayerIndex = 1): void {
    if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('[Controls] localStorage not available');
        return;
    }

    const storageKey = getGamepadStorageKey(playerIndex);

    try {
        localStorage.setItem(storageKey, JSON.stringify(mapping));
    } catch (e) {
        console.error('[Controls] Failed to save gamepad mapping:', e);
    }
}

/**
 * Load all gamepad mappings for connected players
 */
export function loadAllGamepadMappings(playerCount: number): GamepadMapping[] {
    const mappings: GamepadMapping[] = [];
    for (let i = 1; i <= Math.min(playerCount, 4); i++) {
        mappings.push(loadGamepadMapping(i as PlayerIndex));
    }
    return mappings;
}

/**
 * Clear all saved controls (keyboard and gamepad)
 */
export function clearAllControls(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Clear keyboard
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(KEYBOARD_KEY_PREFIX) || key?.startsWith(GAMEPAD_KEY_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
}
