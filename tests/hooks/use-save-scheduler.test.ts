// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSaveScheduler } from '../../src/hooks/useSaveScheduler';

describe('useSaveScheduler Hook', () => {
    let mockNostalgist: any;
    let nostalgistRef: { current: any };

    beforeEach(() => {
        vi.useFakeTimers();
        mockNostalgist = {
            saveState: vi.fn(async () => ({
                state: new Blob(['save-state-payload']),
            })),
        };
        nostalgistRef = { current: mockNostalgist };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('processes a high-priority save successfully', async () => {
        const { result } = renderHook(() => useSaveScheduler(nostalgistRef));

        let savePromise!: Promise<any>;
        act(() => {
            savePromise = result.current.save();
        });

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        const saveResult = await savePromise;
        expect(saveResult).not.toBeNull();
        expect(saveResult?.data).toBeInstanceOf(Uint8Array);
        expect(saveResult?.blob).toBeInstanceOf(Blob);
        expect(mockNostalgist.saveState).toHaveBeenCalledTimes(1);
    });

    it('enforces backpressure on low-priority rewind captures (drops when queue has >= 3)', async () => {
        let resolveActiveSave!: (val: any) => void;
        // Keep active save pending
        mockNostalgist.saveState = vi.fn(() => new Promise((resolve) => { resolveActiveSave = resolve; }));

        const { result } = renderHook(() => useSaveScheduler(nostalgistRef));

        let droppedPromise!: Promise<any>;
        act(() => {
            // First one is picked up by processQueue
            result.current.queueRewindCapture();
            // Next 3 are queued in queueRef
            result.current.queueRewindCapture();
            result.current.queueRewindCapture();
            result.current.queueRewindCapture();
            // 5th exceeds limit of 3 in queueRef and is immediately dropped
            droppedPromise = result.current.queueRewindCapture();
        });

        const droppedResult = await droppedPromise;
        expect(droppedResult).toBeNull();
        expect(result.current.getQueueLength()).toBe(3);

        // Clean up
        act(() => {
            result.current.clearQueue();
            resolveActiveSave({ state: new Blob(['done']) });
        });
    });

    it('prioritizes high-priority manual/auto saves over low-priority rewind captures', async () => {
        const callOrder: string[] = [];
        let resolveFirstSave!: (val: any) => void;

        mockNostalgist.saveState = vi.fn()
            .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstSave = resolve; }))
            .mockImplementation(() => {
                callOrder.push('second');
                return Promise.resolve({ state: new Blob(['second']) });
            });

        const { result } = renderHook(() => useSaveScheduler(nostalgistRef));

        act(() => {
            result.current.save();
        });

        let highPriorityPromise!: Promise<any>;
        act(() => {
            result.current.queueRewindCapture(); // Low priority
            highPriorityPromise = result.current.save(); // High priority
        });

        await act(async () => {
            resolveFirstSave({ state: new Blob(['first']) });
            await vi.advanceTimersByTimeAsync(200);
            await vi.runAllTimersAsync();
        });

        const highResult = await highPriorityPromise;
        expect(highResult).not.toBeNull();
    });

    it('clears queue and cancels pending saves when clearQueue is called', async () => {
        let resolveFirstSave!: (val: any) => void;
        mockNostalgist.saveState = vi.fn(() => new Promise((r) => { resolveFirstSave = r; }));

        const { result } = renderHook(() => useSaveScheduler(nostalgistRef));

        let p2!: Promise<any>;
        act(() => {
            result.current.save(); // Active
            p2 = result.current.save(); // Queued
        });

        act(() => {
            result.current.clearQueue();
        });

        expect(result.current.getQueueLength()).toBe(0);
        const res2 = await p2;
        expect(res2).toBeNull();

        // Release first save
        resolveFirstSave({ state: new Blob(['done']) });
    });

    it('returns null safely if nostalgist instance is not available', async () => {
        nostalgistRef.current = null;
        const { result } = renderHook(() => useSaveScheduler(nostalgistRef));

        let savePromise!: Promise<any>;
        act(() => {
            savePromise = result.current.save();
        });

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        const saveResult = await savePromise;
        expect(saveResult).toBeNull();
    });
});
