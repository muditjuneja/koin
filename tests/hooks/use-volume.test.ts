// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVolume } from '../../src/hooks/useVolume';

describe('useVolume Hook', () => {
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

    it('initializes with stored or default volume and calls setVolume on mount', () => {
        const setVolumeSpy = vi.fn();
        const toggleMuteSpy = vi.fn();

        const { result } = renderHook(() => useVolume({
            setVolume: setVolumeSpy,
            toggleMute: toggleMuteSpy,
        }));

        expect(result.current.volume).toBe(100);
        expect(result.current.isMuted).toBe(false);
        expect(setVolumeSpy).toHaveBeenCalledWith(100);
    });

    it('clamps volume updates between 0 and 100 and persists to storage', () => {
        const setVolumeSpy = vi.fn();
        const toggleMuteSpy = vi.fn();

        const { result } = renderHook(() => useVolume({
            setVolume: setVolumeSpy,
            toggleMute: toggleMuteSpy,
        }));

        // Set to 80
        act(() => {
            result.current.setVolume(80);
        });
        expect(result.current.volume).toBe(80);
        expect(mockStorage['retro-player-volume']).toBe('80');
        expect(setVolumeSpy).toHaveBeenCalledWith(80);

        // Clamp below 0
        act(() => {
            result.current.setVolume(-25);
        });
        expect(result.current.volume).toBe(0);
        expect(mockStorage['retro-player-volume']).toBe('0');

        // Clamp above 100
        act(() => {
            result.current.setVolume(150);
        });
        expect(result.current.volume).toBe(100);
        expect(mockStorage['retro-player-volume']).toBe('100');
    });

    it('toggles mute state, persists, and invokes toggleMute callback', async () => {
        const setVolumeSpy = vi.fn();
        const toggleMuteSpy = vi.fn();

        const { result } = renderHook(() => useVolume({
            setVolume: setVolumeSpy,
            toggleMute: toggleMuteSpy,
        }));

        expect(result.current.isMuted).toBe(false);

        // Toggle mute to true
        act(() => {
            result.current.toggleMute();
        });
        expect(result.current.isMuted).toBe(true);
        expect(mockStorage['retro-player-muted']).toBe('true');

        // Fast forward timers for scheduled callback
        act(() => {
            vi.runAllTimers();
        });
        expect(toggleMuteSpy).toHaveBeenCalledTimes(1);

        // Toggle mute back to false
        act(() => {
            result.current.toggleMute();
        });
        expect(result.current.isMuted).toBe(false);
        expect(mockStorage['retro-player-muted']).toBe('false');
    });
});
