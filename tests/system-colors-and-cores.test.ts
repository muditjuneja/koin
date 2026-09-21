import { describe, it, expect } from 'vitest';
import {
    extractColorFromClass,
    getSystemColor,
    getSystemColorFromInfo,
    hexToRgb,
} from '../src/lib/system-colors';
import {
    PLATFORM_CORES,
    getCore,
    isSystemSupported,
    getSupportedSystems,
    getSupportedSystemsList,
} from '../src/lib/emulator-cores';

describe('System Colors Utilities', () => {
    it('extracts hex colors from Tailwind class strings correctly', () => {
        expect(extractColorFromClass('group-hover:text-[#FF1744]')).toBe('#FF1744');
        expect(extractColorFromClass('text-[#514689]')).toBe('#514689');
        expect(extractColorFromClass('')).toBe('#00FF41');
        expect(extractColorFromClass(undefined)).toBe('#00FF41');
        expect(extractColorFromClass('group-hover:text-red-500')).toBe('#00FF41');
    });

    it('resolves system colors by system name, alias, and id', () => {
        const nesColor = getSystemColor('NES');
        expect(nesColor.startsWith('#')).toBe(true);
        expect(nesColor).not.toBe('');

        // Case insensitivity
        expect(getSystemColor('nes')).toBe(nesColor);
        expect(getSystemColor('snes')).toBe(getSystemColor('SNES'));

        // Fallback for unknown platform
        expect(getSystemColor('UNKNOWN_PLATFORM')).toBe('#00FF41');
        expect(getSystemColor(undefined)).toBe('#00FF41');
    });

    it('resolves system color from SystemInfo object', () => {
        expect(getSystemColorFromInfo({ value: 'NES', label: 'NES', name: 'NES', id: 'nes', color: 'group-hover:text-[#E60012]' })).toBe('#E60012');
        expect(getSystemColorFromInfo(undefined)).toBe('#00FF41');
    });

    it('converts hex colors to RGB triplets for CSS variable and opacity use', () => {
        expect(hexToRgb('#FF1744')).toBe('255, 23, 68');
        expect(hexToRgb('#000000')).toBe('0, 0, 0');
        expect(hexToRgb('#FFFFFF')).toBe('255, 255, 255');
        // Invalid hex fallback
        expect(hexToRgb('invalid-hex')).toBe('0, 255, 65');
    });
});

describe('Legacy Emulator Cores Compatibility (emulator-cores.ts)', () => {
    it('maintains backwards-compatible PLATFORM_CORES lookup map', () => {
        expect(PLATFORM_CORES['NES']).toBe('fceumm');
        expect(PLATFORM_CORES['SNES']).toBe('snes9x');
        expect(PLATFORM_CORES['GBA']).toBe('mgba');
        expect(PLATFORM_CORES['SUPER NINTENDO']).toBe('snes9x');
    });

    it('getCore returns valid RetroArch core or falls back to fceumm', () => {
        expect(getCore('NES')).toBe('fceumm');
        expect(getCore('SNES')).toBe('snes9x');
        expect(getCore('NON_EXISTENT')).toBe('fceumm');
    });

    it('isSystemSupported validates platform names', () => {
        expect(isSystemSupported('NES')).toBe(true);
        expect(isSystemSupported('snes')).toBe(true);
        expect(isSystemSupported('fake_system')).toBe(false);
    });

    it('getSupportedSystems returns array of all platform keys and aliases', () => {
        const systems = getSupportedSystems();
        expect(systems.length).toBeGreaterThan(20);
        expect(systems).toContain('NES');
        expect(systems).toContain('SNES');
    });

    it('getSupportedSystemsList returns properly structured SystemInfo objects', () => {
        const list = getSupportedSystemsList();
        expect(list.length).toBeGreaterThan(20);

        for (const item of list) {
            expect(item.value).toBeDefined();
            expect(item.label).toBeDefined();
            expect(item.name).toBeDefined();
            expect(item.id).toBeDefined();
        }
    });
});
