// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../../src/hooks/useAutoSave';

// ---------------------------------------------------------------------------
// Helpers / Factories
// ---------------------------------------------------------------------------

function makeMockNostalgist(status: 'idle' | 'running' | 'paused' = 'running') {
    return {
        status,
        saveStateWithBlob: vi.fn(async () => ({ blob: new Blob(['save-data']) })),
        screenshot: vi.fn(async () => 'data:image/png;base64,ABC'),
    };
}

function makeQueueRef(isBusy = false) {
    return {
        current: {
            isBusy,
            add: vi.fn(async (fn: () => Promise<unknown>) => fn()),
        },
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAutoSave hook', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // 1. autoSaveEnabled is false when onAutoSave is undefined
    // -----------------------------------------------------------------------
    it('returns autoSaveEnabled = false when onAutoSave is undefined', () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave: undefined })
        );

        expect(result.current.autoSaveEnabled).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 2. autoSaveEnabled is true when onAutoSave is provided
    // -----------------------------------------------------------------------
    it('returns autoSaveEnabled = true when onAutoSave is provided', () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        expect(result.current.autoSaveEnabled).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 3. autoSaveState is 'idle' when nostalgist status is not 'running'
    // -----------------------------------------------------------------------
    it('autoSaveState is "idle" when nostalgist status is "paused"', () => {
        const nostalgist = makeMockNostalgist('paused');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        expect(result.current.autoSaveState).toBe('idle');
    });

    it('autoSaveState is "idle" when nostalgist is null', () => {
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist: null, queueRef, onAutoSave })
        );

        expect(result.current.autoSaveState).toBe('idle');
    });

    // -----------------------------------------------------------------------
    // 4. autoSaveState transitions to 'counting' when emulator is running
    //    and onAutoSave is set
    // -----------------------------------------------------------------------
    it('autoSaveState is "counting" when emulator is running and onAutoSave is provided', () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave, autoSaveInterval: 60000 })
        );

        expect(result.current.autoSaveState).toBe('counting');
    });

    // -----------------------------------------------------------------------
    // 5. handleAutoSaveToggle toggles autoSavePaused
    // -----------------------------------------------------------------------
    it('handleAutoSaveToggle toggles autoSavePaused from false to true and back', () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { result } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        expect(result.current.autoSavePaused).toBe(false);

        act(() => {
            result.current.handleAutoSaveToggle();
        });
        expect(result.current.autoSavePaused).toBe(true);

        act(() => {
            result.current.handleAutoSaveToggle();
        });
        expect(result.current.autoSavePaused).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 6. Auto-save is skipped when queueRef.current.isBusy is true
    // -----------------------------------------------------------------------
    it('skips auto-save when queue is busy: add() and saveStateWithBlob are never called', async () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef(/* isBusy */ true);
        const onAutoSave = vi.fn(async () => {});

        renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave, autoSaveInterval: 1000 })
        );

        // Advance past the save timeout
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1001);
        });

        // add() should never have been called because isBusy was true
        expect(queueRef.current.add).not.toHaveBeenCalled();
        expect(nostalgist.saveStateWithBlob).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // 7. Emergency save fires when 'visibilitychange' fires with document.hidden=true
    // -----------------------------------------------------------------------
    it('performs an emergency save when the page becomes hidden (visibilitychange)', async () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        // Simulate page going hidden
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: true,
        });

        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
            // Flush microtasks without running the infinite progressId interval
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(nostalgist.saveStateWithBlob).toHaveBeenCalled();
        expect(onAutoSave).toHaveBeenCalled();

        // Restore document.hidden
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
        });
    });

    // -----------------------------------------------------------------------
    // 8. Emergency save is skipped on 'beforeunload' when queue is busy
    // -----------------------------------------------------------------------
    it('skips emergency save on beforeunload when queueRef.current.isBusy is true', async () => {
        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef(/* isBusy */ true);
        const onAutoSave = vi.fn(async () => {});

        // Ensure document.hidden = false so only the isBusy guard blocks the save
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: false,
        });

        renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        await act(async () => {
            window.dispatchEvent(new Event('beforeunload'));
            await Promise.resolve();
        });


        // handleBeforeUnload has: if (!document.hidden && !queueRef.current.isBusy)
        // isBusy=true means the condition is false, so the emergency save is skipped
        expect(nostalgist.saveStateWithBlob).not.toHaveBeenCalled();
        expect(onAutoSave).not.toHaveBeenCalled();
    });

    // -----------------------------------------------------------------------
    // Bonus: listeners are removed on unmount (cleanup verification)
    // -----------------------------------------------------------------------
    it('removes visibilitychange and beforeunload listeners on unmount', () => {
        const removeSpy = vi.spyOn(document, 'removeEventListener');
        const removeWinSpy = vi.spyOn(window, 'removeEventListener');

        const nostalgist = makeMockNostalgist('running');
        const queueRef = makeQueueRef();
        const onAutoSave = vi.fn(async () => {});

        const { unmount } = renderHook(() =>
            useAutoSave({ nostalgist, queueRef, onAutoSave })
        );

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        expect(removeWinSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
});
