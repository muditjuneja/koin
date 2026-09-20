// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMobile } from '../../src/hooks/useMobile';
import {
    isMobileDevice,
    getCurrentOrientation,
    createOrientationChangeHandler,
} from '../../src/components/VirtualController/utils/viewport';

vi.mock('../../src/components/VirtualController/utils/viewport', () => ({
    isMobileDevice: vi.fn(() => false),
    getCurrentOrientation: vi.fn(() => 'portrait' as const),
    createOrientationChangeHandler: vi.fn((cb: () => void) => cb),
}));

const mockIsMobileDevice = isMobileDevice as ReturnType<typeof vi.fn>;
const mockGetCurrentOrientation = getCurrentOrientation as ReturnType<typeof vi.fn>;
const mockCreateOrientationChangeHandler = createOrientationChangeHandler as ReturnType<typeof vi.fn>;

describe('useMobile', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockIsMobileDevice.mockReturnValue(false);
        mockGetCurrentOrientation.mockReturnValue('portrait');
        // createOrientationChangeHandler: just call the callback synchronously
        mockCreateOrientationChangeHandler.mockImplementation((cb: () => void) => cb);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // 1. Initial isMobile matches isMobileDevice()
    it('initial isMobile reflects isMobileDevice() return value (false)', () => {
        mockIsMobileDevice.mockReturnValue(false);
        const { result } = renderHook(() => useMobile());
        expect(result.current.isMobile).toBe(false);
    });

    it('initial isMobile reflects isMobileDevice() return value (true)', () => {
        mockIsMobileDevice.mockReturnValue(true);
        const { result } = renderHook(() => useMobile());
        expect(result.current.isMobile).toBe(true);
    });

    // 2. Initial portrait state
    it('isPortrait = true and isLandscape = false when getCurrentOrientation() returns portrait', () => {
        mockGetCurrentOrientation.mockReturnValue('portrait');
        const { result } = renderHook(() => useMobile());
        expect(result.current.isPortrait).toBe(true);
        expect(result.current.isLandscape).toBe(false);
    });

    // 3. Initial landscape state
    it('isLandscape = true and isPortrait = false when getCurrentOrientation() returns landscape', () => {
        mockGetCurrentOrientation.mockReturnValue('landscape');
        const { result } = renderHook(() => useMobile());
        expect(result.current.isLandscape).toBe(true);
        expect(result.current.isPortrait).toBe(false);
    });

    // 4. resize event updates isMobile
    it('resize event updates isMobile when isMobileDevice() changes', () => {
        mockIsMobileDevice.mockReturnValue(false);
        const { result } = renderHook(() => useMobile());
        expect(result.current.isMobile).toBe(false);

        mockIsMobileDevice.mockReturnValue(true);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        // advance debounce timer used inside checkOrientation
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current.isMobile).toBe(true);
    });

    // 5. Orientation changes update isLandscape/isPortrait via getCurrentOrientation
    it('resize event switches orientation from portrait to landscape', () => {
        mockGetCurrentOrientation.mockReturnValue('portrait');
        const { result } = renderHook(() => useMobile());
        expect(result.current.isPortrait).toBe(true);

        mockGetCurrentOrientation.mockReturnValue('landscape');
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current.isLandscape).toBe(true);
        expect(result.current.isPortrait).toBe(false);
    });

    it('resize event switches orientation from landscape to portrait', () => {
        mockGetCurrentOrientation.mockReturnValue('landscape');
        const { result } = renderHook(() => useMobile());
        expect(result.current.isLandscape).toBe(true);

        mockGetCurrentOrientation.mockReturnValue('portrait');
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(result.current.isPortrait).toBe(true);
        expect(result.current.isLandscape).toBe(false);
    });

    // 6. Cleanup: event listeners removed on unmount
    it('removes resize and orientationchange listeners on unmount', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useMobile());

        const addedTypes = addSpy.mock.calls.map(([type]) => type);
        expect(addedTypes).toContain('resize');
        expect(addedTypes).toContain('orientationchange');

        unmount();

        const removedTypes = removeSpy.mock.calls.map(([type]) => type);
        expect(removedTypes).toContain('resize');
        expect(removedTypes).toContain('orientationchange');
    });

    // SSR safety: no window access error when running in SSR-like environment is
    // handled by the 'use client' directive — confirm the hook renders without throwing in jsdom.
    it('renders without throwing in a jsdom environment', () => {
        expect(() => renderHook(() => useMobile())).not.toThrow();
    });
});
