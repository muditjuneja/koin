// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedVisibility } from '../../src/hooks/useAnimatedVisibility';

// ---------------------------------------------------------------------------
// requestAnimationFrame mock
//
// The hook calls requestAnimationFrame on mount to defer setIsVisible(true).
// We synchronously invoke the callback so tests can assert the post-raf state
// without needing real animation frames.
// ---------------------------------------------------------------------------
function stubRaf() {
    vi.stubGlobal(
        'requestAnimationFrame',
        (cb: FrameRequestCallback) => {
            cb(0);
            return 0;
        },
    );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('useAnimatedVisibility', () => {
    beforeEach(() => {
        stubRaf();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // -----------------------------------------------------------------------
    // 1. isVisible: false immediately on mount, true after requestAnimationFrame
    //
    //    Because we stub rAF to fire synchronously, the renderHook call itself
    //    drives the enter animation. We first test the *pre-stub* state by
    //    overriding with a no-op rAF, then restore.
    // -----------------------------------------------------------------------
    it('isVisible is false immediately on mount, then true after requestAnimationFrame runs', () => {
        // Override rAF to be a no-op so we can observe the initial false state
        vi.stubGlobal('requestAnimationFrame', (_cb: FrameRequestCallback) => 0);

        const { result } = renderHook(() => useAnimatedVisibility({}));

        // Before rAF callback fires: isVisible should still be false
        expect(result.current.isVisible).toBe(false);

        // Now swap in the synchronous rAF stub and re-render to trigger the effect again
        // (Easier: simply check that, with the synchronous stub, isVisible becomes true)
        stubRaf();
        const { result: result2 } = renderHook(() => useAnimatedVisibility({}));
        expect(result2.current.isVisible).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 2. isExiting is false initially
    // -----------------------------------------------------------------------
    it('isExiting is false initially', () => {
        const { result } = renderHook(() => useAnimatedVisibility({}));
        expect(result.current.isExiting).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 3. triggerExit sets isExiting = true
    // -----------------------------------------------------------------------
    it('triggerExit sets isExiting to true', () => {
        const { result } = renderHook(() => useAnimatedVisibility({}));

        act(() => {
            result.current.triggerExit();
        });

        expect(result.current.isExiting).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 4. triggerExit calls onExit after exitDuration ms
    // -----------------------------------------------------------------------
    it('triggerExit calls onExit after exitDuration ms', () => {
        vi.useFakeTimers();

        const onExit = vi.fn();
        const exitDuration = 300;

        const { result } = renderHook(() =>
            useAnimatedVisibility({ exitDuration, onExit }),
        );

        act(() => {
            result.current.triggerExit();
        });

        expect(onExit).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(exitDuration);
        });

        expect(onExit).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 5. Calling triggerExit twice does NOT call onExit twice (double-exit guard)
    // -----------------------------------------------------------------------
    it('calling triggerExit twice does not call onExit twice', () => {
        vi.useFakeTimers();

        const onExit = vi.fn();

        const { result } = renderHook(() =>
            useAnimatedVisibility({ exitDuration: 200, onExit }),
        );

        act(() => {
            result.current.triggerExit();
        });

        // Second call — isExiting is already true, the guard should block it
        act(() => {
            result.current.triggerExit();
        });

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(onExit).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 6. autoDismissMs triggers triggerExit automatically after the delay
    // -----------------------------------------------------------------------
    it('autoDismissMs triggers triggerExit automatically after the specified delay', () => {
        vi.useFakeTimers();

        const autoDismissMs = 3000;
        const exitDuration = 100;
        const onExit = vi.fn();

        const { result } = renderHook(() =>
            useAnimatedVisibility({ autoDismissMs, onExit, exitDuration }),
        );

        expect(result.current.isExiting).toBe(false);

        act(() => {
            vi.advanceTimersByTime(autoDismissMs);
        });

        // triggerExit should have fired, setting isExiting = true
        expect(result.current.isExiting).toBe(true);

        // Advance exitDuration for onExit to be called
        act(() => {
            vi.advanceTimersByTime(exitDuration);
        });
        expect(onExit).toHaveBeenCalledTimes(1);
    });


    // -----------------------------------------------------------------------
    // 7. slideInRightClasses is 'translate-x-full opacity-0' while not visible
    // -----------------------------------------------------------------------
    it("slideInRightClasses is 'translate-x-full opacity-0' while not visible", () => {
        // Keep rAF as no-op so isVisible stays false
        vi.stubGlobal('requestAnimationFrame', (_cb: FrameRequestCallback) => 0);

        const { result } = renderHook(() => useAnimatedVisibility({}));

        expect(result.current.isVisible).toBe(false);
        expect(result.current.slideInRightClasses).toBe('translate-x-full opacity-0');
    });

    // -----------------------------------------------------------------------
    // 8. slideInRightClasses is 'translate-x-0 opacity-100' when visible and not exiting
    // -----------------------------------------------------------------------
    it("slideInRightClasses is 'translate-x-0 opacity-100' when visible and not exiting", () => {
        // Synchronous rAF stub → isVisible becomes true on mount
        const { result } = renderHook(() => useAnimatedVisibility({}));

        expect(result.current.isVisible).toBe(true);
        expect(result.current.isExiting).toBe(false);
        expect(result.current.slideInRightClasses).toBe('translate-x-0 opacity-100');
    });

    // -----------------------------------------------------------------------
    // 9. slideInRightClasses is 'translate-x-full opacity-0' when exiting
    // -----------------------------------------------------------------------
    it("slideInRightClasses is 'translate-x-full opacity-0' when exiting", () => {
        const { result } = renderHook(() => useAnimatedVisibility({}));

        // Visible + not exiting → slide-in classes
        expect(result.current.slideInRightClasses).toBe('translate-x-0 opacity-100');

        act(() => {
            result.current.triggerExit();
        });

        // Now exiting → slide-out classes, regardless of isVisible
        expect(result.current.isExiting).toBe(true);
        expect(result.current.slideInRightClasses).toBe('translate-x-full opacity-0');
    });
});
