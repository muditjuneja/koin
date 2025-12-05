/**
 * RetroArch Input Configuration
 * 
 * Converts our control mappings to RetroArch config format.
 */

import { ButtonId, KeyboardMapping, GamepadMapping, ControlConfig } from './types';

/**
 * Map JavaScript KeyboardEvent.code to RetroArch key names
 * RetroArch uses lowercase key names without prefixes
 */
const JS_TO_RETROARCH_KEY: Record<string, string> = {
    // Letters
    KeyA: 'a', KeyB: 'b', KeyC: 'c', KeyD: 'd', KeyE: 'e', KeyF: 'f',
    KeyG: 'g', KeyH: 'h', KeyI: 'i', KeyJ: 'j', KeyK: 'k', KeyL: 'l',
    KeyM: 'm', KeyN: 'n', KeyO: 'o', KeyP: 'p', KeyQ: 'q', KeyR: 'r',
    KeyS: 's', KeyT: 't', KeyU: 'u', KeyV: 'v', KeyW: 'w', KeyX: 'x',
    KeyY: 'y', KeyZ: 'z',

    // Numbers
    Digit0: 'num0', Digit1: 'num1', Digit2: 'num2', Digit3: 'num3',
    Digit4: 'num4', Digit5: 'num5', Digit6: 'num6', Digit7: 'num7',
    Digit8: 'num8', Digit9: 'num9',

    // Numpad
    Numpad0: 'kp0', Numpad1: 'kp1', Numpad2: 'kp2', Numpad3: 'kp3',
    Numpad4: 'kp4', Numpad5: 'kp5', Numpad6: 'kp6', Numpad7: 'kp7',
    Numpad8: 'kp8', Numpad9: 'kp9',
    NumpadEnter: 'kp_enter', NumpadAdd: 'kp_plus', NumpadSubtract: 'kp_minus',
    NumpadMultiply: 'kp_multiply', NumpadDivide: 'kp_divide', NumpadDecimal: 'kp_period',

    // Arrow keys
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',

    // Modifiers
    ShiftLeft: 'shift', ShiftRight: 'rshift',
    ControlLeft: 'ctrl', ControlRight: 'rctrl',
    AltLeft: 'alt', AltRight: 'ralt',

    // Special keys
    Enter: 'enter', Space: 'space', Tab: 'tab', Escape: 'escape',
    Backspace: 'backspace', Delete: 'del', Insert: 'insert',
    Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',

    // Function keys
    F1: 'f1', F2: 'f2', F3: 'f3', F4: 'f4', F5: 'f5', F6: 'f6',
    F7: 'f7', F8: 'f8', F9: 'f9', F10: 'f10', F11: 'f11', F12: 'f12',

    // Punctuation
    Comma: 'comma', Period: 'period', Slash: 'slash', Backslash: 'backslash',
    BracketLeft: 'leftbracket', BracketRight: 'rightbracket',
    Semicolon: 'semicolon', Quote: 'apostrophe', Backquote: 'backquote',
    Minus: 'minus', Equal: 'equals',
};

/**
 * Map our button IDs to RetroArch input names
 */
const BUTTON_TO_RETROARCH: Record<ButtonId, string> = {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    a: 'a',
    b: 'b',
    x: 'x',
    y: 'y',
    l: 'l',
    r: 'r',
    l2: 'l2',
    r2: 'r2',
    l3: 'l3',
    r3: 'r3',
    start: 'start',
    select: 'select',
};

/**
 * Convert a JS key code to RetroArch key name
 */
function toRetroArchKey(jsKeyCode: string): string {
    return JS_TO_RETROARCH_KEY[jsKeyCode] || jsKeyCode.toLowerCase();
}

/**
 * Convert keyboard mapping to RetroArch config for a player
 */
export function keyboardToRetroArchConfig(
    mapping: KeyboardMapping,
    playerIndex: number = 1
): Record<string, string> {
    const config: Record<string, string> = {};

    for (const [button, jsKeyCode] of Object.entries(mapping)) {
        const raButton = BUTTON_TO_RETROARCH[button as ButtonId];
        if (raButton && jsKeyCode) {
            const raKey = toRetroArchKey(jsKeyCode);
            config[`input_player${playerIndex}_${raButton}`] = raKey;
        }
    }

    return config;
}

/**
 * Convert gamepad mapping to RetroArch config for a player
 * Uses _btn suffix for button indices
 */
export function gamepadToRetroArchConfig(
    mapping: GamepadMapping,
    playerIndex: number = 1
): Record<string, number | string> {
    const config: Record<string, number | string> = {};

    for (const [button, buttonIndex] of Object.entries(mapping)) {
        if (buttonIndex === undefined) continue;

        const raButton = BUTTON_TO_RETROARCH[button as ButtonId];
        if (raButton) {
            config[`input_player${playerIndex}_${raButton}_btn`] = buttonIndex;
        }
    }

    return config;
}

/**
 * Build complete RetroArch input config from control configuration
 */
export function buildRetroArchConfig(config: ControlConfig): Record<string, unknown> {
    const raConfig: Record<string, unknown> = {};

    // Keyboard controls (player 1 only)
    if (config.keyboard) {
        Object.assign(raConfig, keyboardToRetroArchConfig(config.keyboard, 1));
    }

    // Gamepad controls for each player
    if (config.gamepads) {
        config.gamepads.forEach((mapping, index) => {
            if (mapping) {
                Object.assign(raConfig, gamepadToRetroArchConfig(mapping, index + 1));
            }
        });
    }

    // Enable analog stick → D-pad for all players
    raConfig.input_player1_analog_dpad_mode = 1;
    raConfig.input_player2_analog_dpad_mode = 1;
    raConfig.input_player3_analog_dpad_mode = 1;
    raConfig.input_player4_analog_dpad_mode = 1;

    return raConfig;
}
