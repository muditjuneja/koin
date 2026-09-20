import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { allocateSyntheticKeyboardMappings, RESERVED_HOTKEY_RA_NAMES, UNRESOLVABLE_RA_NAMES } from './synthetic-keys';
import { toRetroArchKey, JS_TO_RETROARCH_KEY } from './key-map';
import { ALL_BUTTONS, KeyboardMapping, PlayerIndex } from './types';
import { DEFAULT_KEYBOARD } from './defaults';

/**
 * nostalgist's own RA-name -> JS KeyboardEvent.code resolution
 * (dist/nostalgist.js's `getKeyboardCode`) is the exact logic that decides
 * whether a synthetic guest press actually does anything at runtime — a
 * hand-transcribed copy of its `keyboardCodeMap` would drift silently on a
 * dependency bump, and a manual transcription already caught two real bugs
 * once (kp0-kp9/kp_multiply/kp_divide/apostrophe weren't in the first draft's
 * copy). So this extracts the *actual* table straight out of the installed
 * package at test time — if the installed nostalgist version ever changes
 * this table, these tests fail loudly instead of quietly trusting stale data.
 */
let nostalgistKeyboardCodeMap: Record<string, string>;

beforeAll(() => {
    const require = createRequire(import.meta.url);
    // nostalgist's package.json "exports" only opens up the "." subpath (no
    // reaching into dist/ or package.json directly), so resolve that subpath
    // and use its directory to find nostalgist.js as a sibling file.
    const nostalgistEntryPath = require.resolve('nostalgist');
    const nostalgistDistPath = path.join(path.dirname(nostalgistEntryPath), 'nostalgist.js');
    const source = readFileSync(nostalgistDistPath, 'utf8');
    const match = source.match(/const keyboardCodeMap = (\{[\s\S]*?\n\};)/);
    if (!match) {
        throw new Error(
            'Could not find keyboardCodeMap in the installed nostalgist package — its dist output shape ' +
            'may have changed. Re-check node_modules/nostalgist/dist/nostalgist.js and update this extraction.'
        );
    }
    // The object literal source is plain JS (string keys/values only) — safe to
    // evaluate directly, it's read from our own pinned node_modules, not user input.
    // eslint-disable-next-line no-eval
    nostalgistKeyboardCodeMap = eval(`(${match[1].replace(/;\s*$/, '')})`);
});

function resolveViaNostalgist(raName: string): string {
    if (!raName || raName === 'nul') return '';
    const { length } = raName;
    if (length === 1) return `Key${raName.toUpperCase()}`;
    if (raName.startsWith('f') && (length === 2 || length === 3)) return raName.toUpperCase();
    if (length === 4 && raName.startsWith('num')) return `Numpad${raName[length - 1]}`;
    if (length === 7 && raName.startsWith('keypad')) return `Digit${raName[length - 1]}`;
    return nostalgistKeyboardCodeMap[raName] ?? '';
}

const GUEST_PLAYERS: PlayerIndex[] = [2, 3, 4];

describe('UNRESOLVABLE_RA_NAMES (regression guard against JS_TO_RETROARCH_KEY drift)', () => {
    it('covers every JS_TO_RETROARCH_KEY entry that dead-ends in nostalgist\'s reverse lookup', () => {
        // If this fails after someone edits JS_TO_RETROARCH_KEY (key-map.ts), it
        // means a newly added JS code produces an RA name nostalgist can't
        // resolve back to a code, and it's missing from UNRESOLVABLE_RA_NAMES —
        // add it there. (Not exact-equality: UNRESOLVABLE_RA_NAMES also carries
        // 'tilde' defensively, which isn't reachable via the table today.)
        const actuallyDead = new Set(
            Object.values(JS_TO_RETROARCH_KEY).filter((raName) => resolveViaNostalgist(raName) === '')
        );
        for (const raName of actuallyDead) {
            expect(UNRESOLVABLE_RA_NAMES.has(raName), `"${raName}" resolves to '' but isn't in UNRESOLVABLE_RA_NAMES`).toBe(true);
        }
    });

    it('every JS_TO_RETROARCH_KEY entry NOT in UNRESOLVABLE_RA_NAMES resolves to a real code', () => {
        for (const [jsCode, raName] of Object.entries(JS_TO_RETROARCH_KEY)) {
            if (UNRESOLVABLE_RA_NAMES.has(raName)) continue;
            expect(resolveViaNostalgist(raName), `${jsCode} -> "${raName}"`).not.toBe('');
        }
    });
});

describe('allocateSyntheticKeyboardMappings', () => {
    it('is deterministic for the same inputs', () => {
        const a = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        const b = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        expect(a.usedRaNames).toEqual(b.usedRaNames);
        expect(a.mappings).toEqual(b.mappings);
    });

    it('assigns every button for every requested guest player', () => {
        const { mappings } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        for (const player of GUEST_PLAYERS) {
            const mapping = mappings[player];
            expect(mapping).toBeDefined();
            for (const button of ALL_BUTTONS) {
                expect(mapping![button]).toBeTruthy();
            }
        }
    });

    it('every allocated RA key name actually resolves through nostalgist\'s own reverse lookup', () => {
        const { mappings } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        for (const player of GUEST_PLAYERS) {
            for (const button of ALL_BUTTONS) {
                const jsCode = mappings[player]![button]!;
                const raName = toRetroArchKey(jsCode);
                const resolvedCode = resolveViaNostalgist(raName);
                expect(resolvedCode, `player ${player} "${button}" (RA name "${raName}") must resolve to a real code`).not.toBe('');
            }
        }
    });

    it('never allocates a name reserved for koin\'s own hotkeys', () => {
        const { usedRaNames } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        for (const name of usedRaNames) {
            expect(RESERVED_HOTKEY_RA_NAMES.has(name)).toBe(false);
        }
    });

    it('never allocates a name nostalgist cannot resolve back to a code', () => {
        const { usedRaNames } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        for (const name of usedRaNames) {
            expect(UNRESOLVABLE_RA_NAMES.has(name)).toBe(false);
        }
    });

    it('never allocates a name already used by the host\'s own keyboard map', () => {
        const hostRaNames = new Set(Object.values(DEFAULT_KEYBOARD).map((code) => toRetroArchKey(code!)));
        const { usedRaNames } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        for (const name of usedRaNames) {
            expect(hostRaNames.has(name)).toBe(false);
        }
    });

    it('allocates fully distinct RA names across all guest players (no cross-player collisions)', () => {
        const { usedRaNames } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        expect(new Set(usedRaNames).size).toBe(usedRaNames.length);
        expect(usedRaNames.length).toBe(GUEST_PLAYERS.length * ALL_BUTTONS.length);
    });

    it('resolved JS codes are pairwise unique across all guest players (defense in depth beyond RA-name uniqueness)', () => {
        const { mappings } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, DEFAULT_KEYBOARD);
        const allCodes: string[] = [];
        for (const player of GUEST_PLAYERS) {
            for (const button of ALL_BUTTONS) {
                allCodes.push(mappings[player]![button]!);
            }
        }
        expect(new Set(allCodes).size).toBe(allCodes.length);
    });

    it('adapts to a fully custom host keyboard mapping, not just the default', () => {
        // A deliberately unusual host map, still avoiding real collisions with itself.
        const customHost: KeyboardMapping = {
            up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL',
            a: 'KeyF', b: 'KeyG', x: 'KeyH', y: 'KeyN',
            l: 'Digit1', r: 'Digit2', l2: 'Digit3', r2: 'Digit4',
            l3: 'Digit5', r3: 'Digit6', start: 'Space', select: 'Tab',
        };
        const hostRaNames = new Set(Object.values(customHost).map((code) => toRetroArchKey(code!)));

        const { usedRaNames } = allocateSyntheticKeyboardMappings(GUEST_PLAYERS, customHost);
        expect(new Set(usedRaNames).size).toBe(usedRaNames.length);
        for (const name of usedRaNames) {
            expect(hostRaNames.has(name)).toBe(false);
            expect(RESERVED_HOTKEY_RA_NAMES.has(name)).toBe(false);
        }
    });

    it('works with a single guest player and with an empty host mapping', () => {
        const single = allocateSyntheticKeyboardMappings([2], {});
        expect(Object.keys(single.mappings)).toEqual(['2']);
        expect(single.usedRaNames.length).toBe(ALL_BUTTONS.length);
    });

    it('returns an empty allocation for an empty guest list', () => {
        const empty = allocateSyntheticKeyboardMappings([], DEFAULT_KEYBOARD);
        expect(empty.mappings).toEqual({});
        expect(empty.usedRaNames).toEqual([]);
    });
});
