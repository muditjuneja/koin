// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmulatorCore } from '../../src/hooks/emulator/useEmulatorCore';

const { mockNostalgistInstance } = vi.hoisted(() => {
    const mockNostalgistInstance = {
        start: vi.fn().mockResolvedValue(undefined),
        exit: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        sendCommand: vi.fn(),
        screenshot: vi.fn().mockResolvedValue(new Blob([])),
        resize: vi.fn(),
        getCanvas: vi.fn(() => null),
        getEmscripten: vi.fn(() => null),
    };
    return { mockNostalgistInstance };
});

vi.mock('nostalgist', () => ({
    Nostalgist: {
        prepare: vi.fn().mockResolvedValue(mockNostalgistInstance),
    },
}));


vi.mock('../../src/lib/emulator-cores', () => ({
    getCore: vi.fn(() => 'snes9x'),
}));

vi.mock('../../src/lib/systems', () => ({
    PERFORMANCE_TIER_1_SYSTEMS: new Set(['NES', 'SNES', 'GB']),
    PERFORMANCE_TIER_2_SYSTEMS: new Set(['N64', 'PS1', 'DREAMCAST']),
    getSystem: vi.fn(() => null),
}));

vi.mock('../../src/lib/controls', () => ({
    buildRetroArchConfig: vi.fn(() => ({})),
}));

vi.mock('../../src/lib/rom-cache', () => ({
    getCachedRom: vi.fn().mockResolvedValue(null),
    fetchAndCacheRom: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/lib/game-player-utils', () => ({
    describeRomLoadError: vi.fn((err: Error) => err.message),
}));

import { Nostalgist } from 'nostalgist';

describe('useEmulatorCore status machine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (Nostalgist.prepare as any).mockResolvedValue(mockNostalgistInstance);
        mockNostalgistInstance.start.mockResolvedValue(undefined);
    });

    const createProps = (overrides?: any) => ({
        system: 'SNES',
        romUrl: 'https://example.com/game.sfc',
        getCanvasElement: () => document.createElement('canvas'),
        onReady: vi.fn(),
        onError: vi.fn(),
        ...overrides,
    });

    it('initial status is idle and error is null', () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));
        expect(result.current.status).toBe('idle');
        expect(result.current.error).toBe(null);
        expect(result.current.isPaused).toBe(false);
    });

    it('prepare transitions status from idle to ready', async () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));

        await act(async () => {
            await result.current.prepare();
        });

        expect(Nostalgist.prepare).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('ready');
        expect(result.current.error).toBe(null);
    });

    it('start transitions status from ready to running and calls onReady', async () => {
        const onReady = vi.fn();
        const { result } = renderHook(() => useEmulatorCore(createProps({ onReady })));

        await act(async () => {
            await result.current.prepare();
        });

        await act(async () => {
            await result.current.start();
        });

        expect(mockNostalgistInstance.start).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('running');
        expect(result.current.isPaused).toBe(false);
        expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('sets error state and calls onError when prepare fails', async () => {
        const onError = vi.fn();
        (Nostalgist.prepare as any).mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useEmulatorCore(createProps({ onError })));

        await act(async () => {
            await result.current.prepare();
        });

        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Network error');
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('stop resets status to idle and isPaused to false', async () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));

        await act(async () => {
            await result.current.prepare();
            await result.current.start();
        });

        expect(result.current.status).toBe('running');

        act(() => {
            result.current.stop();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.isPaused).toBe(false);
        expect(mockNostalgistInstance.exit).toHaveBeenCalledTimes(1);
    });

    it('pause transitions running to paused', async () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));

        await act(async () => {
            await result.current.prepare();
            await result.current.start();
        });

        act(() => {
            result.current.pause();
        });

        expect(result.current.status).toBe('paused');
        expect(result.current.isPaused).toBe(true);
        expect(mockNostalgistInstance.pause).toHaveBeenCalledTimes(1);
    });

    it('resume transitions paused back to running', async () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));

        await act(async () => {
            await result.current.prepare();
            await result.current.start();
        });

        act(() => {
            result.current.pause();
        });
        expect(result.current.status).toBe('paused');

        act(() => {
            result.current.resume();
        });

        expect(result.current.status).toBe('running');
        expect(result.current.isPaused).toBe(false);
        expect(mockNostalgistInstance.resume).toHaveBeenCalledTimes(1);
    });

    it('togglePause toggles between running and paused', async () => {
        const { result } = renderHook(() => useEmulatorCore(createProps()));

        await act(async () => {
            await result.current.prepare();
            await result.current.start();
        });

        act(() => {
            result.current.togglePause();
        });
        expect(result.current.status).toBe('paused');

        act(() => {
            result.current.togglePause();
        });
        expect(result.current.status).toBe('running');
    });

    it('calling start() auto-prepares if prepare was not called beforehand', async () => {
        const onReady = vi.fn();
        const { result } = renderHook(() => useEmulatorCore(createProps({ onReady })));

        await act(async () => {
            await result.current.start();
        });

        expect(Nostalgist.prepare).toHaveBeenCalledTimes(1);
        expect(mockNostalgistInstance.start).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('running');
        expect(onReady).toHaveBeenCalledTimes(1);
    });
});
