import { describe, it, expect } from 'vitest';
import {
    SYSTEMS,
    getSystem,
    getSystemByKey,
    getSystemFromExtension,
    getSystemByDbName,
    getCore,
    getCoreSource,
    getDBSystemNames,
    isSystemSupported,
    getSupportedExtensions,
    getSystemsList,
    detectSystem,
    systemsMatch,
    normalizeSystemKey,
    getMaxFileSizeMB,
    PERFORMANCE_TIER_1_SYSTEMS,
    PERFORMANCE_TIER_2_SYSTEMS,
} from '../src/lib/systems';

describe('SYSTEMS Invariant & Configuration Integrity', () => {
    it('contains at least 24 active systems with unique canonical keys', () => {
        expect(SYSTEMS.length).toBeGreaterThanOrEqual(24);
        const keys = SYSTEMS.map(s => s.key);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
    });

    it('ensures every system has valid core, label, and extensions', () => {
        for (const sys of SYSTEMS) {
            expect(sys.key).toBeTruthy();
            expect(sys.label).toBeTruthy();
            expect(sys.core).toBeTruthy();
            expect(sys.extensions).toBeInstanceOf(Array);
            expect(sys.extensions.length).toBeGreaterThan(0);
            for (const ext of sys.extensions) {
                expect(ext.startsWith('.')).toBe(true);
            }
        }
    });

    it('ensures no alias collisions exist across different systems', () => {
        const aliasMap = new Map<string, string>();
        for (const sys of SYSTEMS) {
            const allAliases = [sys.key, ...sys.aliases];
            for (const alias of allAliases) {
                const normalized = alias.toUpperCase().trim();
                const existingKey = aliasMap.get(normalized);
                if (existingKey) {
                    expect(existingKey).toBe(sys.key);
                } else {
                    aliasMap.set(normalized, sys.key);
                }
            }
        }
    });

    it('ensures performance tiers 1 and 2 are mutually disjoint', () => {
        const intersection = [...PERFORMANCE_TIER_1_SYSTEMS].filter(x => PERFORMANCE_TIER_2_SYSTEMS.has(x));
        expect(intersection).toEqual([]);
    });

    it('verifies 8/16-bit systems belong to Tier 1 and 32-bit+ belong to Tier 2', () => {
        expect(PERFORMANCE_TIER_1_SYSTEMS.has('NES')).toBe(true);
        expect(PERFORMANCE_TIER_1_SYSTEMS.has('SNES')).toBe(true);
        expect(PERFORMANCE_TIER_1_SYSTEMS.has('GENESIS')).toBe(true);
        expect(PERFORMANCE_TIER_1_SYSTEMS.has('GB')).toBe(true);

        expect(PERFORMANCE_TIER_2_SYSTEMS.has('PS1')).toBe(true);
        expect(PERFORMANCE_TIER_2_SYSTEMS.has('N64')).toBe(true);
        expect(PERFORMANCE_TIER_2_SYSTEMS.has('SATURN')).toBe(true);
    });
});

describe('System Resolution & Alias Matching', () => {
    it('resolves systems by exact key', () => {
        const nes = getSystemByKey('NES');
        expect(nes).toBeDefined();
        expect(nes?.key).toBe('NES');
        expect(nes?.core).toBe('fceumm');
    });

    it('resolves systems case-insensitively and trims whitespace', () => {
        expect(getSystem('nes')?.key).toBe('NES');
        expect(getSystem('  NES  ')?.key).toBe('NES');
        expect(getSystem('snes')?.key).toBe('SNES');
        expect(getSystem('gba')?.key).toBe('GBA');
        expect(getSystem('genesis')?.key).toBe('GENESIS');
    });

    it('resolves common colloquial aliases', () => {
        expect(getSystem('Super Nintendo')?.key).toBe('SNES');
        expect(getSystem('Mega Drive')?.key).toBe('GENESIS');
        expect(getSystem('PlayStation')?.key).toBe('PS1');
        expect(getSystem('PSX')?.key).toBe('PS1');
        expect(getSystem('Game Boy')?.key).toBe('GB');
        expect(getSystem('Game Boy Advance')?.key).toBe('GBA');
        expect(getSystem('Nintendo 64')?.key).toBe('N64');
    });

    it('returns undefined for unknown systems', () => {
        expect(getSystem('non_existent_system_123')).toBeUndefined();
        expect(getSystemByKey('INVALID_KEY')).toBeUndefined();
    });

    it('normalizes system names to canonical keys', () => {
        expect(normalizeSystemKey('Super Nintendo')).toBe('SNES');
        expect(normalizeSystemKey('mega drive')).toBe('GENESIS');
        expect(normalizeSystemKey('psx')).toBe('PS1');
        expect(normalizeSystemKey('CustomUnknownPlatform')).toBe('CustomUnknownPlatform');
    });

    it('evaluates systemsMatch correctly across aliases', () => {
        expect(systemsMatch('snes', 'Super Nintendo')).toBe(true);
        expect(systemsMatch('GENESIS', 'Mega Drive')).toBe(true);
        expect(systemsMatch('ps1', 'PlayStation')).toBe(true);
        expect(systemsMatch('nes', 'snes')).toBe(false);
        expect(systemsMatch('unknown1', 'unknown2')).toBe(false);
    });

    it('correctly reports isSystemSupported', () => {
        expect(isSystemSupported('NES')).toBe(true);
        expect(isSystemSupported('snes')).toBe(true);
        expect(isSystemSupported('Mega Drive')).toBe(true);
        expect(isSystemSupported('xbox360')).toBe(false);
    });
});

describe('Filename and Extension Detection', () => {
    it('detects systems from filename extensions', () => {
        expect(getSystemFromExtension('SuperMarioBros.nes')?.key).toBe('NES');
        expect(getSystemFromExtension('Chrono Trigger.sfc')?.key).toBe('SNES');
        expect(getSystemFromExtension('Pokemon.gba')?.key).toBe('GBA');
        expect(getSystemFromExtension('Sonic.md')?.key).toBe('GENESIS');
        expect(getSystemFromExtension('Sonic.gen')?.key).toBe('GENESIS');
        expect(getSystemFromExtension('game.v1.0.smc')?.key).toBe('SNES');
        expect(getSystemFromExtension('disc.iso')?.key).toBe('PS1');
    });

    it('detects case-insensitive extensions', () => {
        expect(getSystemFromExtension('MARIO.NES')?.key).toBe('NES');
        expect(getSystemFromExtension('zelda.GBA')?.key).toBe('GBA');
    });

    it('returns undefined for filenames without extensions or unknown extensions', () => {
        expect(getSystemFromExtension('filename_without_extension')).toBeUndefined();
        expect(getSystemFromExtension('file.unknownextension')).toBeUndefined();
    });

    it('detectSystem explicitly returns undefined for .zip files', () => {
        // Zip files require manual user/manifest inspection
        expect(detectSystem('archive.zip')).toBeUndefined();
        expect(detectSystem('ROM.ZIP')).toBeUndefined();
    });

    it('detectSystem works for non-zip files', () => {
        expect(detectSystem('smb.nes')?.key).toBe('NES');
    });

    it('getSupportedExtensions returns unique extensions including .zip', () => {
        const exts = getSupportedExtensions();
        expect(exts).toContain('.zip');
        expect(exts).toContain('.nes');
        expect(exts).toContain('.gba');
        expect(new Set(exts).size).toBe(exts.length);
    });
});

describe('Database & Core Configuration', () => {
    it('resolves systems by DB names for metadata scraping', () => {
        const snes = getSystemByDbName('Super Nintendo Entertainment System');
        expect(snes?.key).toBe('SNES');
        expect(getDBSystemNames('SNES')).toContain('Super Nintendo Entertainment System');
    });

    it('gets core and falls back to fceumm for unknown system', () => {
        expect(getCore('GBA')).toBe('mgba');
        expect(getCore('N64')).toBe('mupen64plus_next');
        expect(getCore('PS1')).toBe('pcsx_rearmed');
        expect(getCore('UNKNOWN_CONSOLE')).toBe('fceumm');
    });

    it('reports coreSource properly', () => {
        // Default coreSource is undefined (nostalgist) unless specified
        expect(getCoreSource('NES')).toBeUndefined();
        expect(getCoreSource('N64')).toBe('linuxserver');
        expect(getCoreSource('SATURN')).toBe('linuxserver');
    });

    it('enforces file size boundaries (CD vs Cartridge)', () => {
        expect(getMaxFileSizeMB('NES')).toBe(100);
        expect(getMaxFileSizeMB('SNES')).toBe(100);
        expect(getMaxFileSizeMB('PS1')).toBe(700);
        expect(getMaxFileSizeMB('SATURN')).toBe(700);
        expect(getMaxFileSizeMB('UNKNOWN_SYSTEM')).toBe(100);
    });

    it('provides formatted systems list for UI dropdowns', () => {
        const list = getSystemsList();
        expect(list.length).toBe(SYSTEMS.length);
        for (const item of list) {
            expect(item).toHaveProperty('value');
            expect(item).toHaveProperty('label');
            expect(item).toHaveProperty('iconName');
            expect(item).toHaveProperty('color');
        }
    });
});
