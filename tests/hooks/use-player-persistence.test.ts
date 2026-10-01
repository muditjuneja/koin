// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerPersistence } from '../../src/hooks/usePlayerPersistence';

describe('usePlayerPersistence Hook', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        vi.useFakeTimers();
        mockStorage = {};
        const localStorageMock = {
            getItem: (k: string) => mockStorage[k] ?? null,
            setItem: (k: string, v: string) => { mockStorage[k] = v; },
            removeItem: (k: string) => { delete mockStorage[k]; },
            clear: () => { mockStorage = {}; },
            key: (i: number) => Object.keys(mockStorage)[i] ?? null,
            get length() { return Object.keys(mockStorage).length; },
        };
        vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('loads default settings when storage is empty', () => {
        const { result } = renderHook(() => usePlayerPersistence());

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.settings.volume).toBe(100);
        expect(result.current.settings.muted).toBe(false);
        expect(result.current.settings.shader).toBe('');
        expect(result.current.settings.hapticsEnabled).toBe(true);
    });

    it('loads saved settings from localStorage on mount', () => {
        mockStorage['koin-player-settings'] = JSON.stringify({
            volume: 65,
            muted: true,
            shader: 'crt/crt-lottes',
            showPerformanceOverlay: true,
            hapticsEnabled: false,
        });

        const { result } = renderHook(() => usePlayerPersistence());

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.settings.volume).toBe(65);
        expect(result.current.settings.muted).toBe(true);
        expect(result.current.settings.shader).toBe('crt/crt-lottes');
        expect(result.current.settings.showPerformanceOverlay).toBe(true);
        expect(result.current.settings.hapticsEnabled).toBe(false);
    });

    it('migrates a volume saved on the old 0-1 default to percent', () => {
        mockStorage['koin-player-settings'] = JSON.stringify({ volume: 1, shader: 'crt/crt-lottes' });
        expect(renderHook(() => usePlayerPersistence()).result.current.settings.volume).toBe(100);

        mockStorage['koin-player-settings'] = JSON.stringify({ volume: 0.8 });
        expect(renderHook(() => usePlayerPersistence()).result.current.settings.volume).toBe(80);

        mockStorage['koin-player-settings'] = JSON.stringify({ volume: 0 });
        expect(renderHook(() => usePlayerPersistence()).result.current.settings.volume).toBe(0);
    });

    it('updates settings, persists to storage, and notifies callback', () => {
        const onSettingsChange = vi.fn();
        const { result } = renderHook(() => usePlayerPersistence(onSettingsChange));

        act(() => {
            result.current.updateSettings({
                shader: 'crt/crt-geom',
                showInputDisplay: true,
            });
        });

        expect(result.current.settings.shader).toBe('crt/crt-geom');
        expect(result.current.settings.showInputDisplay).toBe(true);

        const stored = JSON.parse(mockStorage['koin-player-settings']);
        expect(stored.shader).toBe('crt/crt-geom');
        expect(stored.showInputDisplay).toBe(true);

        // Run timers for scheduled callback
        act(() => {
            vi.runAllTimers();
        });
        expect(onSettingsChange).toHaveBeenCalledTimes(1);
        expect(onSettingsChange.mock.calls[0][0].shader).toBe('crt/crt-geom');
    });

    it('handles corrupted JSON in storage without crashing', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockStorage['koin-player-settings'] = '{malformed-json';

        const { result } = renderHook(() => usePlayerPersistence());

        expect(result.current.isLoaded).toBe(true);
        expect(result.current.settings.volume).toBe(100); // Default preserved
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
