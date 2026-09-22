/**
 * Unified Control System Types
 * 
 * Single source of truth for all control-related type definitions.
 */

/**
 * All possible button identifiers (superset of all consoles)
 */
export type ButtonId =
    | 'up' | 'down' | 'left' | 'right'  // D-pad
    | 'a' | 'b' | 'x' | 'y'              // Face buttons (standard RetroPad)
    | 'l' | 'r'                          // Shoulder buttons
    | 'l2' | 'r2'                        // Triggers (PS1, Saturn, etc.)
    | 'l3' | 'r3'                        // Stick clicks (PS1 analog)
    | 'start' | 'select';                // System buttons

/**
 * D-pad buttons
 */
export const DPAD_BUTTONS: ButtonId[] = ['up', 'down', 'left', 'right'];

/**
 * Face buttons
 */
export const FACE_BUTTONS: ButtonId[] = ['a', 'b', 'x', 'y'];

/**
 * Shoulder buttons (L/R only)
 */
export const SHOULDER_BUTTONS: ButtonId[] = ['l', 'r'];

/**
 * Trigger buttons (L2/R2)
 */
export const TRIGGER_BUTTONS: ButtonId[] = ['l2', 'r2'];

/**
 * Stick click buttons
 */
export const STICK_BUTTONS: ButtonId[] = ['l3', 'r3'];

/**
 * System buttons
 */
export const SYSTEM_BUTTONS: ButtonId[] = ['start', 'select'];

/**
 * All buttons in display order
 */
export const ALL_BUTTONS: ButtonId[] = [
    ...DPAD_BUTTONS,
    ...FACE_BUTTONS,
    ...SHOULDER_BUTTONS,
    ...TRIGGER_BUTTONS,
    ...STICK_BUTTONS,
    ...SYSTEM_BUTTONS,
];

/**
 * Keyboard mapping: button → JavaScript KeyboardEvent.code
 * Partial because not all consoles have all buttons
 */
export type KeyboardMapping = Partial<Record<ButtonId, string>>;

export type ControlMapping = KeyboardMapping;

/**
 * Gamepad mapping: button → physical button index (W3C Gamepad API)
 * Partial because users may not map all buttons
 */
export type GamepadMapping = Partial<Record<ButtonId, number>>;

/**
 * Which buttons a console actually has
 */
export interface ConsoleCapabilities {
    /** Console key (e.g., 'NES', 'SNES') */
    console: string;
    /** List of buttons this console supports */
    buttons: ButtonId[];
}

/**
 * Information about a connected gamepad
 */
export interface GamepadInfo {
    /** Gamepad index (0-3) */
    index: number;
    /** Raw gamepad identifier string */
    id: string;
    /** Cleaned up display name */
    name: string;
    /** Whether currently connected */
    connected: boolean;
    /** Number of buttons */
    buttons: number;
    /** Number of axes */
    axes: number;
    /** Mapping type from Gamepad API */
    mapping: GamepadMappingType;
}

/**
 * Detected controller brand for UI theming
 */
export type ControllerBrand = 'xbox' | 'playstation' | 'nintendo' | 'generic';

/**
 * Player index (1-4)
 */
export type PlayerIndex = 1 | 2 | 3 | 4;

/**
 * Full control configuration for the emulator
 */
export interface ControlConfig {
    /** Keyboard controls (usually player 1 only) */
    keyboard?: KeyboardMapping;
    /** Gamepad controls per player */
    gamepads?: GamepadMapping[];
}
