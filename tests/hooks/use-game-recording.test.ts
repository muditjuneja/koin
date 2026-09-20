// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameRecording } from '../../src/hooks/useGameRecording';

// ---------------------------------------------------------------------------
// MediaRecorder mock — rebuilt fresh inside beforeEach so state never leaks
// ---------------------------------------------------------------------------
let mockMediaRecorder: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    state: string;
    ondataavailable: ((e: { data: { size: number } }) => void) | null;
    onstop: (() => void) | null;
};

let MockMediaRecorder: any;

// ---------------------------------------------------------------------------
// Canvas mock
// ---------------------------------------------------------------------------
const mockCanvas = { captureStream: vi.fn(() => ({})) };
const getCanvasElement = () => mockCanvas as unknown as HTMLCanvasElement;

// ---------------------------------------------------------------------------
// Helper — fires onstop synchronously to resolve stopRecording's promise
// ---------------------------------------------------------------------------
function fireStop() {
    if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
    }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('useGameRecording', () => {
    beforeEach(() => {
        // Fresh recorder instance — avoids cross-test state pollution
        mockMediaRecorder = {
            start: vi.fn(() => {
                mockMediaRecorder.state = 'recording';
            }),
            stop: vi.fn(() => {
                mockMediaRecorder.state = 'inactive';
            }),
            pause: vi.fn(() => {
                mockMediaRecorder.state = 'paused';
            }),
            resume: vi.fn(() => {
                mockMediaRecorder.state = 'recording';
            }),
            state: 'inactive',
            ondataavailable: null,
            onstop: null,
        };

        MockMediaRecorder = class {
            static isTypeSupported = vi.fn(() => true);
            constructor() {
                return mockMediaRecorder;
            }
        };

        vi.stubGlobal('MediaRecorder', MockMediaRecorder);
        mockCanvas.captureStream.mockClear();
    });


    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    // -----------------------------------------------------------------------
    // 1. isSupported — MediaRecorder undefined
    // -----------------------------------------------------------------------
    it('reports isSupported as false when MediaRecorder is undefined', () => {
        vi.stubGlobal('MediaRecorder', undefined);

        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        expect(result.current.isSupported).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 2. isSupported — MediaRecorder present + isTypeSupported returns true
    // -----------------------------------------------------------------------
    it('reports isSupported as true when MediaRecorder.isTypeSupported returns true', () => {
        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        expect(result.current.isSupported).toBe(true);
        expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalledWith('video/webm');
    });

    // -----------------------------------------------------------------------
    // 3. startRecording sets isRecording to true
    // -----------------------------------------------------------------------
    it('sets isRecording to true after startRecording is called', () => {
        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(true);
    });

    // -----------------------------------------------------------------------
    // 4. stopRecording calls stop() and resolves with a Blob when onstop fires
    // -----------------------------------------------------------------------
    it('stopRecording calls mediaRecorder.stop() and resolves with a Blob when onstop fires', async () => {
        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        // Advance mock state so the guard inside stopRecording does not bail early
        mockMediaRecorder.state = 'recording';

        let blobResult: Blob | null | undefined;

        await act(async () => {
            const promise = result.current.stopRecording();
            // Synchronously trigger onstop so the internal Promise resolves
            fireStop();
            blobResult = await promise;
        });

        expect(mockMediaRecorder.stop).toHaveBeenCalledTimes(1);
        expect(blobResult).toBeInstanceOf(Blob);
        expect(result.current.isRecording).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 5. pauseRecording sets isPaused = true and calls mediaRecorder.pause()
    // -----------------------------------------------------------------------
    it('pauseRecording sets isPaused to true and calls mediaRecorder.pause()', () => {
        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        // The hook guards pauseRecording with state === 'recording'
        mockMediaRecorder.state = 'recording';

        act(() => {
            result.current.pauseRecording();
        });

        expect(result.current.isPaused).toBe(true);
        expect(mockMediaRecorder.pause).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 6. resumeRecording sets isPaused = false and calls mediaRecorder.resume()
    // -----------------------------------------------------------------------
    it('resumeRecording sets isPaused to false and calls mediaRecorder.resume()', () => {
        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        mockMediaRecorder.state = 'recording';
        act(() => {
            result.current.pauseRecording();
        });
        expect(result.current.isPaused).toBe(true);

        // The hook guards resumeRecording with state === 'paused'
        mockMediaRecorder.state = 'paused';
        act(() => {
            result.current.resumeRecording();
        });

        expect(result.current.isPaused).toBe(false);
        expect(mockMediaRecorder.resume).toHaveBeenCalledTimes(1);
    });

    // -----------------------------------------------------------------------
    // 7. Duration does NOT increment while paused (stale-closure fix via isPausedRef)
    //
    //    The hook stores isPaused in a ref (isPausedRef) that the setInterval
    //    closure reads. If the stale-closure fix is absent, the interval would
    //    capture the original isPaused === false and keep ticking even when paused.
    // -----------------------------------------------------------------------
    it('does not increment recordingDuration while paused', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        // Pause immediately — isPausedRef.current is set to true synchronously
        mockMediaRecorder.state = 'recording';
        act(() => {
            result.current.pauseRecording();
        });

        // Advance 5 s — the interval fires 5 times but skips because isPausedRef === true
        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.recordingDuration).toBe(0);
    });

    // -----------------------------------------------------------------------
    // 8. Duration increments every second while recording and not paused
    // -----------------------------------------------------------------------
    it('increments recordingDuration every second while recording and not paused', () => {
        vi.useFakeTimers();

        const { result } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(result.current.recordingDuration).toBe(3);
    });

    // -----------------------------------------------------------------------
    // 9. Cleanup on unmount calls stop() if recording is active
    // -----------------------------------------------------------------------
    it('calls mediaRecorder.stop() on unmount when recording is active', () => {
        const { result, unmount } = renderHook(() => useGameRecording({ getCanvasElement }));

        act(() => {
            result.current.startRecording();
        });

        // Reflect active state so the cleanup guard (state !== 'inactive') passes
        mockMediaRecorder.state = 'recording';

        unmount();

        expect(mockMediaRecorder.stop).toHaveBeenCalledTimes(1);
    });
});
