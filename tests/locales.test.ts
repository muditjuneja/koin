import { describe, it, expect } from 'vitest';
import { en } from '../src/locales/en';
import { es } from '../src/locales/es';
import { fr } from '../src/locales/fr';
import { deepMerge } from '../src/lib/common-utils';

function collectKeys(obj: Record<string, any>, prefix = ''): string[] {
    let keys: string[] = [];
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const currentPath = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            keys = keys.concat(collectKeys(val, currentPath));
        } else {
            keys.push(currentPath);
        }
    }
    return keys.sort();
}

describe('i18n Translation Parity & Schema Invariants', () => {
    const enKeys = collectKeys(en);

    it('ensures Spanish (es) has 100% key parity with English (en)', () => {
        const esKeys = collectKeys(es);

        const missingInEs = enKeys.filter(k => !esKeys.includes(k));
        const extraInEs = esKeys.filter(k => !enKeys.includes(k));

        expect(missingInEs, `Missing translation keys in Spanish (es): ${missingInEs.join(', ')}`).toEqual([]);
        expect(extraInEs, `Extraneous translation keys in Spanish (es): ${extraInEs.join(', ')}`).toEqual([]);
    });

    it('ensures French (fr) has 100% key parity with English (en)', () => {
        const frKeys = collectKeys(fr);

        const missingInFr = enKeys.filter(k => !frKeys.includes(k));
        const extraInFr = frKeys.filter(k => !enKeys.includes(k));

        expect(missingInFr, `Missing translation keys in French (fr): ${missingInFr.join(', ')}`).toEqual([]);
        expect(extraInFr, `Extraneous translation keys in French (fr): ${extraInFr.join(', ')}`).toEqual([]);
    });

    it('ensures no translation strings are empty in en, es, or fr', () => {
        const checkNonEmptyStrings = (obj: any, lang: string, path = '') => {
            for (const key of Object.keys(obj)) {
                const val = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                if (typeof val === 'string') {
                    expect(val.trim().length, `Empty translation string at ${lang}:${currentPath}`).toBeGreaterThan(0);
                } else if (val && typeof val === 'object') {
                    checkNonEmptyStrings(val, lang, currentPath);
                }
            }
        };

        checkNonEmptyStrings(en, 'en');
        checkNonEmptyStrings(es, 'es');
        checkNonEmptyStrings(fr, 'fr');
    });
});

describe('deepMerge Utility for Partial Translations', () => {
    it('deeply merges nested override objects without wiping sibling keys', () => {
        const base = {
            controls: {
                play: 'Play',
                pause: 'Pause',
                nested: {
                    alpha: 'A',
                    beta: 'B',
                },
            },
            status: 'ready',
        };

        const overrides = {
            controls: {
                play: 'Start Game',
                nested: {
                    alpha: 'Alpha 1',
                },
            },
        };

        const merged = deepMerge(base, overrides);

        // Overridden keys
        expect(merged.controls.play).toBe('Start Game');
        expect(merged.controls.nested.alpha).toBe('Alpha 1');

        // Preserved sibling keys
        expect(merged.controls.pause).toBe('Pause');
        expect(merged.controls.nested.beta).toBe('B');
        expect(merged.status).toBe('ready');
    });

    it('replaces arrays entirely instead of merging indices', () => {
        const base = { tags: ['retro', 'action'] };
        const override = { tags: ['arcade'] };

        const merged = deepMerge(base, override);
        expect(merged.tags).toEqual(['arcade']);
    });

    it('does not mutate original target or source objects (pure immutability)', () => {
        const base = { a: { b: 1 } };
        const source = { a: { b: 2 } };

        const result = deepMerge(base, source);
        expect(result.a.b).toBe(2);
        expect(base.a.b).toBe(1);
        expect(source.a.b).toBe(2);
    });

    it('handles non-object and null/undefined values safely', () => {
        expect(deepMerge(null as any, { a: 1 })).toEqual({ a: 1 });
        expect(deepMerge({ a: 1 }, null as any)).toBeNull();
        expect(deepMerge(42 as any, 'text')).toBe('text');
    });
});
