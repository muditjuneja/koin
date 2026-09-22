// @vitest-environment jsdom
/**
 * tests/hooks/use-emulator-saves.test.ts
 *
 * Tests for the `useEmulatorSaves` hook.
 * Covers: saveState, saveStateWithBlob, loadState, rewind capture lifecycle,
 *         buffer rollover at MAX_BUFFER_SIZE, stopRewindCapture, startRewind guards.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmulatorSaves } from '../../src/hooks/emulator/useEmulatorSaves';

// ---------------------------------------------------------------------------
// Module mock – useSaveScheduler
// Instances are reset in beforeEach so each test gets fresh call counts.
// ---------------------------------------------------------------------------
const mockSave = vi.fn();
const mockQueueRewindCapture = vi.fn();
const mockClearQueue = vi.fn();

vi.mock('../../src/hooks/useSaveScheduler', () => ({
    useSaveScheduler: vi.fn(() => ({
        save: mockSave,
        queueRewindCapture: mockQueueRewindCapture,
        clearQueue: mockClearQueue,
    })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockNostalgist() {
    return {
        loadState: vi.fn().mockResolvedValue(undefined),
        resume: vi.fn(),
    };
}

function makeProps(overrides?: Partial<Parameters<typeof useEmulatorSaves>[0]>) {
    const mockNostalgist = makeMockNostalgist();
    const nostalgistRef = { current: mockNostalgist as any };
    return {
        nostalgistRef,
        mockNostalgist,
        props: {
            nostalgistRef,
            isPaused: false,
            setIsPaused: vi.fn(),
            setStatus: vi.fn(),
            rewindEnabled: true,
            ...overrides,
        },
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useEmulatorSaves', () => {
    beforeEach(() => {
        mockSave.mockResolvedValue({ data: new Uint8Array([1, 2, 3]), blob: new Blob([]) });
        mockQueueRewindCapture.mockResolvedValue({ data: new Uint8Array([1, 2, 3]) });
        mockClearQueue.mockReset();
        vi.clearAllTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // 1. saveStateWithBlob delegates to saveScheduler.save()
    it('saveStateWithBlob delegates to saveScheduler.save()', async () => {
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        let returnValue: { data: Uint8Array; blob: Blob } | null = null;
        await act(async () => {
            returnValue = await result.current.saveStateWithBlob();
        });

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(returnValue).toEqual({ data: new Uint8Array([1, 2, 3]), blob: expect.any(Blob) });
    });

    // 2. saveState delegates to saveScheduler.queueRewindCapture()
    it('saveState delegates to saveScheduler.queueRewindCapture()', async () => {
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        let returnValue: Uint8Array | null = null;
        await act(async () => {
            returnValue = await result.current.saveState();
        });

        expect(mockQueueRewindCapture).toHaveBeenCalledTimes(1);
        expect(returnValue).toEqual(new Uint8Array([1, 2, 3]));
    });

    // 3. loadState calls nostalgist.loadState(), resume(), setIsPaused(false), setStatus('running')
    it('loadState calls nostalgist.loadState, resume, setIsPaused(false), setStatus(running)', async () => {
        vi.useFakeTimers();
        const { props, mockNostalgist } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        let success: boolean | undefined;
        await act(async () => {
            const promise = result.current.loadState(new Uint8Array([10, 20, 30]));
            // Advance past the 50ms settle delay inside loadState
            await vi.advanceTimersByTimeAsync(100);
            success = await promise;
        });

        expect(mockNostalgist.loadState).toHaveBeenCalledTimes(1);
        // Hook converts Uint8Array → Blob before calling nostalgist.loadState
        expect(mockNostalgist.loadState.mock.calls[0][0]).toBeInstanceOf(Blob);
        expect(mockNostalgist.resume).toHaveBeenCalledTimes(1);
        expect(props.setIsPaused).toHaveBeenCalledWith(false);
        expect(props.setStatus).toHaveBeenCalledWith('running');
        expect(success).toBe(true);
    });

    // 4. loadState returns false when nostalgistRef.current is null
    it('loadState returns false when nostalgistRef.current is null', async () => {
        const { props } = makeProps();
        props.nostalgistRef.current = null;

        const { result } = renderHook(() => useEmulatorSaves(props));

        let returnValue: boolean | undefined;
        await act(async () => {
            returnValue = await result.current.loadState(new Uint8Array([1]));
        });

        expect(returnValue).toBe(false);
    });

    // 5. startRewindCapture fills buffer: 3 captures at 500ms each → bufferSize = 3
    it('startRewindCapture fills buffer at 500ms intervals (3 captures in 1500ms)', async () => {
        vi.useFakeTimers();
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        await act(async () => {
            result.current.startRewindCapture();
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
        });

        expect(result.current.rewindBufferSize).toBe(3);
    });

    // 6. Buffer rolls over at MAX_BUFFER_SIZE (60): 65 captures → size ≤ 60
    it('buffer rolls over at MAX_BUFFER_SIZE=60 and stays ≤ 60 after 65 captures', async () => {
        vi.useFakeTimers();
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        await act(async () => {
            result.current.startRewindCapture();
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(65 * 500); // 65 interval ticks
        });

        expect(result.current.rewindBufferSize).toBeLessThanOrEqual(60);
        expect(result.current.rewindBufferSize).toBeGreaterThan(0);
    });

    // 7. stopRewindCapture clears the interval – buffer stops growing
    it('stopRewindCapture stops buffer growth after being called', async () => {
        vi.useFakeTimers();
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        await act(async () => {
            result.current.startRewindCapture();
        });

        // Let 4 captures accumulate
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        const sizeAtStop = result.current.rewindBufferSize;
        expect(sizeAtStop).toBeGreaterThan(0);

        await act(async () => {
            result.current.stopRewindCapture();
        });

        // Advance another 2s – buffer must NOT grow
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
        });

        expect(result.current.rewindBufferSize).toBe(sizeAtStop);
    });

    // 8. startRewind with empty buffer is a no-op (isRewinding stays false)
    it('startRewind with empty buffer is a no-op and does not set isRewinding', async () => {
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        await act(async () => {
            result.current.startRewind();
        });

        expect(result.current.isRewinding).toBe(false);
    });

    // 9. startRewind with a populated buffer sets isRewinding = true
    it('startRewind with populated buffer sets isRewinding to true', async () => {
        vi.useFakeTimers();
        const { props } = makeProps();
        const { result } = renderHook(() => useEmulatorSaves(props));

        // Populate the buffer (3 captures)
        act(() => {
            result.current.startRewindCapture();
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1500);
        });
        // Now trigger rewind
        act(() => {
            result.current.startRewind();
        });

        expect(result.current.isRewinding).toBe(true);
    });
});


