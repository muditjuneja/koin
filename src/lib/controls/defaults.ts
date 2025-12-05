/**
 * Default Control Mappings
 * 
 * Single source of truth for all default button mappings.
 */

import { ButtonId, KeyboardMapping, GamepadMapping } from './types';

/**
 * Standard W3C Gamepad API button indices
 * https://w3c.github.io/gamepad/#remapping
 */
export const STANDARD_GAMEPAD_BUTTONS: Record<ButtonId, number> = {
    // Face buttons (Xbox/PlayStation layout)
    a: 0,       // A / Cross (bottom)
    b: 1,       // B / Circle (right)
    x: 2,       // X / Square (left)
    y: 3,       // Y / Triangle (top)

    // Shoulders
    l: 4,       // LB / L1
    r: 5,       // RB / R1

    // Triggers
    l2: 6,      // LT / L2
    r2: 7,      // RT / R2

    // System
    select: 8,  // Back / Select / Share
    start: 9,   // Start / Options

    // Stick clicks
    l3: 10,     // Left stick click
    r3: 11,     // Right stick click

    // D-pad
    up: 12,
    down: 13,
    left: 14,
    right: 15,
};

/**
 * Default keyboard mapping (SNES-like, works for most consoles)
 */
export const DEFAULT_KEYBOARD: KeyboardMapping = {
    // D-pad → Arrow keys
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',

    // Face buttons → ZXAS cluster (natural hand position)
    a: 'KeyX',      // Primary action (right side)
    b: 'KeyZ',      // Secondary action (left side)
    x: 'KeyS',      // Top right
    y: 'KeyA',      // Top left

    // Shoulders → Q/W
    l: 'KeyQ',
    r: 'KeyW',

    // Triggers → E/R (for PS1/Saturn)
    l2: 'KeyE',
    r2: 'KeyR',

    // Stick clicks → 1/2 (rarely used)
    l3: 'Digit1',
    r3: 'Digit2',

    // System
    start: 'Enter',
    select: 'ShiftRight',
};

/**
 * Default gamepad mapping (uses standard W3C indices)
 */
export const DEFAULT_GAMEPAD: GamepadMapping = { ...STANDARD_GAMEPAD_BUTTONS };

/**
 * Get a complete keyboard mapping with all buttons filled in
 * Uses defaults for any missing buttons
 */
export function getFullKeyboardMapping(partial?: Partial<KeyboardMapping>): KeyboardMapping {
    return { ...DEFAULT_KEYBOARD, ...partial };
}

/**
 * Get a complete gamepad mapping with all buttons filled in
 * Uses defaults for any missing buttons
 */
export function getFullGamepadMapping(partial?: Partial<GamepadMapping>): GamepadMapping {
    return { ...DEFAULT_GAMEPAD, ...partial };
}
