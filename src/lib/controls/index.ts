/**
 * Unified Control System
 * 
 * Single entry point for all control-related functionality.
 * Import from here instead of individual files.
 */

// Types
export type {
    ButtonId,
    KeyboardMapping,
    GamepadMapping,
    ConsoleCapabilities,
    GamepadInfo,
    ControllerBrand,
    PlayerIndex,
    ControlConfig,
} from './types';

export {
    DPAD_BUTTONS,
    FACE_BUTTONS,
    SHOULDER_BUTTONS,
    TRIGGER_BUTTONS,
    STICK_BUTTONS,
    SYSTEM_BUTTONS,
    ALL_BUTTONS,
} from './types';

// Defaults
export {
    STANDARD_GAMEPAD_BUTTONS,
    DEFAULT_KEYBOARD,
    DEFAULT_GAMEPAD,
    getFullKeyboardMapping,
    getFullGamepadMapping,
} from './defaults';

// Labels
export {
    BUTTON_LABELS,
    BUTTON_GROUPS,
    formatKeyCode,
    formatGamepadButton,
} from './labels';

// Presets
export {
    CONSOLE_CAPABILITIES,
    CONSOLE_KEYBOARD_OVERRIDES,
    getConsoleCapabilities,
    getConsoleButtons,
    getConsoleKeyboardDefaults,
    consoleHasButton,
} from './presets';

// Storage
export {
    loadKeyboardMapping,
    saveKeyboardMapping,
    loadGamepadMapping,
    saveGamepadMapping,
    loadAllGamepadMappings,
    clearAllControls,
} from './storage';

// RetroArch
export {
    keyboardToRetroArchConfig,
    gamepadToRetroArchConfig,
    buildRetroArchConfig,
} from './retroarch';
