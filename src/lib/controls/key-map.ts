/**
 * JS KeyboardEvent.code -> RetroArch key name
 *
 * Split out from retroarch.ts so synthetic-keys.ts can reuse the exact same
 * table (rather than duplicating it) without a circular import between the
 * two — synthetic-keys.ts needs this to compute the netplay guest candidate
 * pool, and retroarch.ts needs synthetic-keys.ts to build guest config.
 */

/**
 * Map JavaScript KeyboardEvent.code to RetroArch key names
 * RetroArch uses lowercase key names without prefixes
 */
export const JS_TO_RETROARCH_KEY: Record<string, string> = {
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
 * Convert a JS key code to RetroArch key name
 */
export function toRetroArchKey(jsKeyCode: string): string {
    return JS_TO_RETROARCH_KEY[jsKeyCode] || jsKeyCode.toLowerCase();
}
