// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameCheats } from '../../src/hooks/useGameCheats';

// ---------------------------------------------------------------------------
// Helpers / Factories
// ---------------------------------------------------------------------------

function makeMockNostalgist() {
    return {
        status: 'running' as const,
        injectCheats: vi.fn(),
        resume: vi.fn(),
    };
}

/**
 * Minimal Cheat fixture matching the src/components/types.ts interface.
 * The id field in GamePlayerProps.cheats is typed as string, but the hook
 * also handles numeric ids (converts them via `db-${id}`).
 */
function makeExternalCheat(id: string | number, code = '007E1234', description = 'Test cheat') {
    return { id, code, description };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGameCheats hook', () => {
    let getItemSpy: ReturnType<typeof vi.spyOn>;
    let setItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Fresh spies on Storage prototype for each test
        getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
        setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // 1. allCheats includes normalized external cheats from the cheats prop
    // -----------------------------------------------------------------------
    it('normalizes external cheats and includes them in allCheats', () => {
        const nostalgist = makeMockNostalgist();
        const cheats = [
            makeExternalCheat(1, 'AABBCCDD', 'Infinite Lives'),
            makeExternalCheat('custom-id', 'EEFF0011', 'Max Score'),
        ];

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats, romId: 'game-1' })
        );

        const { allCheats } = result.current;

        // Numeric id → 'db-1'
        expect(allCheats.find((c) => c.id === 'db-1')).toBeDefined();
        expect(allCheats.find((c) => c.id === 'db-1')?.description).toBe('Infinite Lives');

        // String id preserved as-is
        expect(allCheats.find((c) => c.id === 'custom-id')).toBeDefined();
        expect(allCheats.find((c) => c.id === 'custom-id')?.description).toBe('Max Score');
    });

    // -----------------------------------------------------------------------
    // 2. Loads manual cheats from localStorage on mount when romId is provided
    // -----------------------------------------------------------------------
    it('loads manual cheats from localStorage under koin_cheats_<romId> on mount', () => {
        const storedCheats = [
            { id: 'manual-1', code: 'AABBCC', description: 'Manual cheat', source: 'manual' },
        ];
        getItemSpy.mockReturnValue(JSON.stringify(storedCheats));

        const nostalgist = makeMockNostalgist();

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats: [], romId: 'rom-abc' })
        );

        expect(getItemSpy).toHaveBeenCalledWith('koin_cheats_rom-abc');
        expect(result.current.allCheats).toHaveLength(1);
        expect(result.current.allCheats[0].id).toBe('manual-1');
    });

    // -----------------------------------------------------------------------
    // 3. Saves manual cheats back to localStorage when they change
    // -----------------------------------------------------------------------
    it('saves manual cheats to localStorage when they change', async () => {
        const nostalgist = makeMockNostalgist();

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats: [], romId: 'rom-xyz' })
        );

        await act(async () => {
            result.current.handleAddManualCheat('DEADBEEF', 'God Mode');
        });

        expect(setItemSpy).toHaveBeenCalledWith(
            'koin_cheats_rom-xyz',
            expect.stringContaining('God Mode')
        );
    });

    // -----------------------------------------------------------------------
    // 4. Skips storage when romId is not provided
    // -----------------------------------------------------------------------
    it('does not touch localStorage when romId is undefined', () => {
        const nostalgist = makeMockNostalgist();

        renderHook(() =>
            useGameCheats({ nostalgist, cheats: [], romId: undefined })
        );

        expect(getItemSpy).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 5. Handles corrupt JSON in localStorage gracefully
    // -----------------------------------------------------------------------
    it('falls back to empty array and does not crash on corrupt JSON in localStorage', () => {
        getItemSpy.mockReturnValue('{{{not-valid-json');
        const nostalgist = makeMockNostalgist();

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats: [], romId: 'rom-broken' })
        );

        // Should not crash; allCheats should be empty (no external cheats either)
        expect(result.current.allCheats).toHaveLength(0);
    });

    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // 6. Storage unavailability: no crash when localStorage access is restricted
    // -----------------------------------------------------------------------
    it('does not crash when localStorage is unavailable or throws (sandboxed/restricted environment)', () => {
        const originalLocalStorage = window.localStorage;
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new Error('SecurityError: localStorage is disabled');
            },
        });

        try {
            const nostalgist = makeMockNostalgist();
            expect(() => {
                renderHook(() =>
                    useGameCheats({ nostalgist, cheats: [], romId: 'ssr-test' })
                );
            }).not.toThrow();
        } finally {
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                value: originalLocalStorage,
            });
        }
    });


    // -----------------------------------------------------------------------
    // 7. handleToggleCheat adds a cheat to activeCheats when toggling on
    // -----------------------------------------------------------------------
    it('handleToggleCheat adds cheat to activeCheats when toggling on', () => {
        const nostalgist = makeMockNostalgist();
        const cheats = [makeExternalCheat(42, 'ABCD1234', 'Extra Lives')];

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats, romId: 'rom-1' })
        );

        const cheatId = 'db-42';
        expect(result.current.activeCheats.has(cheatId)).toBe(false);

        act(() => {
            result.current.handleToggleCheat(cheatId);
        });

        expect(result.current.activeCheats.has(cheatId)).toBe(true);
        expect(nostalgist.injectCheats).toHaveBeenCalledWith(
            expect.arrayContaining([{ code: 'ABCD1234' }])
        );
    });

    // -----------------------------------------------------------------------
    // 8. handleToggleCheat removes a cheat from activeCheats when toggling off
    // -----------------------------------------------------------------------
    it('handleToggleCheat removes cheat from activeCheats when toggling off', () => {
        const nostalgist = makeMockNostalgist();
        const cheats = [makeExternalCheat(42, 'ABCD1234', 'Extra Lives')];

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats, romId: 'rom-1' })
        );

        const cheatId = 'db-42';

        // Toggle on first
        act(() => {
            result.current.handleToggleCheat(cheatId);
        });
        expect(result.current.activeCheats.has(cheatId)).toBe(true);

        // Toggle off
        act(() => {
            result.current.handleToggleCheat(cheatId);
        });
        expect(result.current.activeCheats.has(cheatId)).toBe(false);

        // injectCheats should have been called with an empty array (no active cheats)
        const lastCall = nostalgist.injectCheats.mock.calls.at(-1);
        expect(lastCall?.[0]).toEqual([]);
    });

    // -----------------------------------------------------------------------
    // 9. handleAddManualCheat adds a cheat to allCheats and auto-activates it
    // -----------------------------------------------------------------------
    it('handleAddManualCheat adds cheat to allCheats and immediately activates it', async () => {
        const nostalgist = makeMockNostalgist();

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats: [], romId: 'rom-manual' })
        );

        await act(async () => {
            result.current.handleAddManualCheat('99999999', 'Invincibility');
        });

        // The new cheat should appear in allCheats
        const added = result.current.allCheats.find((c) => c.description === 'Invincibility');
        expect(added).toBeDefined();
        expect(added?.source).toBe('manual');
        expect(added?.code).toBe('99999999');

        // The new cheat should be auto-activated
        expect(result.current.activeCheats.has(added!.id)).toBe(true);

        // injectCheats should have been called with the new cheat's code
        expect(nostalgist.injectCheats).toHaveBeenCalledWith(
            expect.arrayContaining([{ code: '99999999' }])
        );

        // The modal should be closed after adding
        expect(result.current.cheatsModalOpen).toBe(false);
    });

    // -----------------------------------------------------------------------
    // Extra: onToggleCheat external callback is invoked with numeric id for DB cheats
    // -----------------------------------------------------------------------
    it('calls onToggleCheat with numeric id when toggling a database cheat', () => {
        const nostalgist = makeMockNostalgist();
        const onToggleCheat = vi.fn();
        const cheats = [makeExternalCheat(7, 'CODE0007', 'Speed Boost')];

        const { result } = renderHook(() =>
            useGameCheats({ nostalgist, cheats, onToggleCheat, romId: 'rom-cb' })
        );

        act(() => {
            result.current.handleToggleCheat('db-7');
        });

        expect(onToggleCheat).toHaveBeenCalledWith(7, true);
    });

    // -----------------------------------------------------------------------
    // StrictMode: side effects in handleToggleCheat / handleAddManualCheat
    // must not double-fire when React double-invokes state updaters.
    // -----------------------------------------------------------------------
    it('under StrictMode, handleToggleCheat calls onToggleCheat and injectCheats exactly once', () => {
        const nostalgist = makeMockNostalgist();
        const onToggleCheat = vi.fn();
        const cheats = [makeExternalCheat(7, 'CODE0007', 'Speed Boost')];

        const { result } = renderHook(
            () => useGameCheats({ nostalgist, cheats, onToggleCheat, romId: 'rom-strict' }),
            { wrapper: React.StrictMode }
        );

        nostalgist.injectCheats.mockClear();

        act(() => {
            result.current.handleToggleCheat('db-7');
        });

        expect(onToggleCheat).toHaveBeenCalledTimes(1);
        expect(onToggleCheat).toHaveBeenCalledWith(7, true);
        expect(nostalgist.injectCheats).toHaveBeenCalledTimes(1);
    });

    it('under StrictMode, handleAddManualCheat calls injectCheats and showToast exactly once', async () => {
        const nostalgist = makeMockNostalgist();
        const showToast = vi.fn();

        const { result } = renderHook(
            () => useGameCheats({ nostalgist, cheats: [], showToast, romId: 'rom-strict-add' }),
            { wrapper: React.StrictMode }
        );

        await act(async () => {
            result.current.handleAddManualCheat('99999999', 'Invincibility');
        });

        expect(nostalgist.injectCheats).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('Cheat added!', 'success');
    });
});
