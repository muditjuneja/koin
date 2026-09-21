import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    keyboardToRetroArchConfig,
    gamepadToRetroArchConfig,
    buildRetroArchConfig,
} from '../src/lib/controls/retroarch';
import {
    getConsoleCapabilities,
    getConsoleButtons,
    getConsoleKeyboardDefaults,
    consoleHasButton,
} from '../src/lib/controls/presets';
import {
    loadKeyboardMapping,
    saveKeyboardMapping,
    loadGamepadMapping,
    saveGamepadMapping,
    loadAllGamepadMappings,
    clearAllControls,
} from '../src/lib/controls/storage';
import { DEFAULT_KEYBOARD, DEFAULT_GAMEPAD } from '../src/lib/controls/defaults';
import { KeyboardMapping, GamepadMapping } from '../src/lib/controls/types';

describe('RetroArch Input Config Generator', () => {
    it('converts JS keycodes to RetroArch input keys correctly', () => {
        const mapping: KeyboardMapping = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            a: 'KeyX',
            b: 'KeyZ',
            start: 'Enter',
            select: 'ShiftRight',
            l: 'KeyQ',
            r: 'KeyW',
        };

        const ra = keyboardToRetroArchConfig(mapping, 1);
        expect(ra.input_player1_up).toBe('up');
        expect(ra.input_player1_down).toBe('down');
        expect(ra.input_player1_left).toBe('left');
        expect(ra.input_player1_right).toBe('right');
        expect(ra.input_player1_a).toBe('x');
        expect(ra.input_player1_b).toBe('z');
        expect(ra.input_player1_start).toBe('enter');
        expect(ra.input_player1_select).toBe('rshift');
        expect(ra.input_player1_l).toBe('q');
        expect(ra.input_player1_r).toBe('w');
    });

    it('translates special keys, numpads, and punctuation accurately', () => {
        const mapping: KeyboardMapping = {
            a: 'Space',
            b: 'Numpad0',
            x: 'NumpadEnter',
            y: 'Digit5',
            l: 'F1',
            r: 'Comma',
        };

        const ra = keyboardToRetroArchConfig(mapping, 1);
        expect(ra.input_player1_a).toBe('space');
        expect(ra.input_player1_b).toBe('kp0');
        expect(ra.input_player1_x).toBe('kp_enter');
        expect(ra.input_player1_y).toBe('num5');
        expect(ra.input_player1_l).toBe('f1');
        expect(ra.input_player1_r).toBe('comma');
    });

    it('converts gamepad button indices to RetroArch config format', () => {
        const gamepadMapping: GamepadMapping = {
            a: 0,
            b: 1,
            x: 2,
            y: 3,
            l: 4,
            r: 5,
            start: 9,
            select: 8,
        };

        const ra = gamepadToRetroArchConfig(gamepadMapping, 2);
        expect(ra.input_player2_a_btn).toBe(0);
        expect(ra.input_player2_b_btn).toBe(1);
        expect(ra.input_player2_x_btn).toBe(2);
        expect(ra.input_player2_start_btn).toBe(9);
    });

    it('builds a unified RetroArch configuration with player joypads and analog dpad mode', () => {
        const config = {
            keyboard: DEFAULT_KEYBOARD,
            gamepads: [DEFAULT_GAMEPAD, DEFAULT_GAMEPAD],
        };

        const raConfig = buildRetroArchConfig(config);
        // Player 1 keyboard
        expect(raConfig.input_player1_a).toBeDefined();
        // Joypad indexes for all 4 slots
        expect(raConfig.input_player1_joypad_index).toBe(0);
        expect(raConfig.input_player2_joypad_index).toBe(1);
        expect(raConfig.input_player3_joypad_index).toBe(2);
        expect(raConfig.input_player4_joypad_index).toBe(3);
        // Analog d-pad modes
        expect(raConfig.input_player1_analog_dpad_mode).toBe(1);
        expect(raConfig.input_player2_analog_dpad_mode).toBe(1);
        expect(raConfig.input_player3_analog_dpad_mode).toBe(1);
        expect(raConfig.input_player4_analog_dpad_mode).toBe(1);
    });
});

describe('Console Capabilities and Defaults', () => {
    it('restricts NES default buttons strictly to NES capabilities', () => {
        const nesCapabilities = getConsoleCapabilities('NES');
        expect(nesCapabilities.buttons).toEqual(['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select']);
        expect(consoleHasButton('NES', 'a')).toBe(true);
        expect(consoleHasButton('NES', 'x')).toBe(false);
        expect(consoleHasButton('NES', 'l2')).toBe(false);

        const nesDefaults = getConsoleKeyboardDefaults('NES');
        expect(nesDefaults.a).toBeDefined();
        expect(nesDefaults.b).toBeDefined();
        expect(nesDefaults.x).toBeUndefined();
        expect(nesDefaults.l).toBeUndefined();
    });

    it('filters out unsupported buttons for N64 and applies Genesis overrides', () => {
        const n64Defaults = getConsoleKeyboardDefaults('N64');
        expect(n64Defaults.a).toBeDefined();
        expect(n64Defaults.b).toBeDefined();
        expect(n64Defaults.select).toBeUndefined(); // N64 has no select button

        const genesisDefaults = getConsoleKeyboardDefaults('GENESIS');
        expect(genesisDefaults.x).toBe('KeyC');
        expect(genesisDefaults.y).toBe('KeyA');
        expect(genesisDefaults.l).toBe('KeyS');
        expect(genesisDefaults.r).toBe('KeyD');
    });

    it('falls back to SNES-like capabilities for unknown platforms', () => {
        const unknown = getConsoleCapabilities('RANDOM_UNKNOWN');
        expect(unknown.buttons).toContain('a');
        expect(unknown.buttons).toContain('x');
        expect(unknown.buttons).toContain('l');
        expect(unknown.buttons).toContain('r');
    });
});

describe('Controls Storage & SSR Resilience', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        // Mock global window and localStorage
        const localStorageMock = {
            getItem: (key: string) => mockStorage[key] ?? null,
            setItem: (key: string, val: string) => { mockStorage[key] = val; },
            removeItem: (key: string) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; },
            key: (index: number) => Object.keys(mockStorage)[index] ?? null,
            get length() { return Object.keys(mockStorage).length; },
        };

        vi.stubGlobal('window', { localStorage: localStorageMock });
        vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('saves and loads keyboard mappings per system', () => {
        const customNES: KeyboardMapping = { ...DEFAULT_KEYBOARD, a: 'KeyK', b: 'KeyJ' };
        saveKeyboardMapping(customNES, 'NES');

        const loaded = loadKeyboardMapping('NES');
        expect(loaded.a).toBe('KeyK');
        expect(loaded.b).toBe('KeyJ');

        // Other system still uses default
        const snes = loadKeyboardMapping('SNES');
        expect(snes.a).toBe(DEFAULT_KEYBOARD.a);
    });

    it('saves and loads gamepad mappings for multiple players', () => {
        const customP2: GamepadMapping = { ...DEFAULT_GAMEPAD, a: 5 };
        saveGamepadMapping(customP2, 2);

        const loadedP2 = loadGamepadMapping(2);
        expect(loadedP2.a).toBe(5);

        const loadedP1 = loadGamepadMapping(1);
        expect(loadedP1.a).toBe(DEFAULT_GAMEPAD.a);

        const all = loadAllGamepadMappings(2);
        expect(all.length).toBe(2);
        expect(all[1].a).toBe(5);
    });

    it('recovers gracefully from corrupted JSON in storage without throwing', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        localStorage.setItem('retrosaga-controls-NES', '{invalid_json_content');

        const loaded = loadKeyboardMapping('NES');
        expect(loaded).toBeDefined();
        expect(loaded.a).toBe(DEFAULT_KEYBOARD.a); // Falls back to default
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('handles localStorage QuotaExceededError when saving without crashing', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => {
            saveKeyboardMapping(DEFAULT_KEYBOARD, 'NES');
        }).not.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('clears all controls while preserving unrelated localStorage entries', () => {
        mockStorage['unrelated_user_session'] = '12345';
        mockStorage['retrosaga-controls-NES'] = JSON.stringify(DEFAULT_KEYBOARD);
        mockStorage['retrosaga-gamepad-p1'] = JSON.stringify(DEFAULT_GAMEPAD);

        clearAllControls();

        expect(mockStorage['retrosaga-controls-NES']).toBeUndefined();
        expect(mockStorage['retrosaga-gamepad-p1']).toBeUndefined();
        expect(mockStorage['unrelated_user_session']).toBe('12345');
    });

    it('behaves safely in pure SSR when window is undefined', () => {
        vi.unstubAllGlobals(); // removes window and localStorage
        const keyboard = loadKeyboardMapping('SNES');
        expect(keyboard).toBeDefined();
        const gamepad = loadGamepadMapping(1);
        expect(gamepad).toEqual(DEFAULT_GAMEPAD);

        expect(() => saveKeyboardMapping(DEFAULT_KEYBOARD, 'NES')).not.toThrow();
        expect(() => saveGamepadMapping(DEFAULT_GAMEPAD, 1)).not.toThrow();
        expect(() => clearAllControls()).not.toThrow();
    });
});
