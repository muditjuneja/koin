import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';
import { useSaveScheduler } from '../useSaveScheduler';

interface UseEmulatorSavesProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
    setStatus: (status: any) => void; // Using any to avoid circular dependency with types, or import types
}

interface UseEmulatorSavesReturn {
    isRewinding: boolean;
    rewindBufferSize: number;
    saveState: () => Promise<Uint8Array | null>;
    saveStateWithBlob: () => Promise<{ data: Uint8Array; blob: Blob } | null>;
    loadState: (state: Uint8Array) => Promise<boolean>;
    startRewind: () => void;
    stopRewind: () => void;
    startRewindCapture: () => void;
    stopRewindCapture: () => void;
}

export function useEmulatorSaves({ nostalgistRef, isPaused, setIsPaused, setStatus }: UseEmulatorSavesProps): UseEmulatorSavesReturn {
    const [isRewinding, setIsRewinding] = useState(false);
    const [rewindBufferSize, setRewindBufferSize] = useState(0); // Track buffer size for UI

    const rewindIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rewindBufferRef = useRef<Uint8Array[]>([]); // Manual rewind buffer using savestates
    const rewindCaptureIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Centralized save scheduler - all FS operations go through here
    const saveScheduler = useSaveScheduler(nostalgistRef);

    // Save state - uses scheduler for serialized FS access (used by rewind buffer)
    const saveState = useCallback(async (): Promise<Uint8Array | null> => {
        if (!nostalgistRef.current) return null;
        const result = await saveScheduler.queueRewindCapture();
        return result?.data ?? null;
    }, [saveScheduler, nostalgistRef]);

    // Save state with blob - high priority, returns both data and blob
    // Used by auto-save and manual save
    const saveStateWithBlob = useCallback(async (): Promise<{ data: Uint8Array; blob: Blob } | null> => {
        if (!nostalgistRef.current) return null;
        return saveScheduler.save();
    }, [saveScheduler, nostalgistRef]);

    // Load state - also resumes the emulator after loading
    const loadState = useCallback(async (state: Uint8Array): Promise<boolean> => {
        if (!nostalgistRef.current) {
            console.warn('[Nostalgist] Cannot load state: emulator not running');
            return false;
        }

        try {
            // loadState expects a Blob, convert Uint8Array to Blob
            const buffer = new ArrayBuffer(state.length);
            const view = new Uint8Array(buffer);
            view.set(state);
            const stateBlob = new Blob([buffer], { type: 'application/octet-stream' });

            await nostalgistRef.current.loadState(stateBlob);

            // Small delay to let the emulator process the state load before resuming
            await new Promise(resolve => setTimeout(resolve, 50));

            // After loading state, ensure emulator is running and state is synced
            nostalgistRef.current.resume();
            setIsPaused(false);
            setStatus('running');

            return true;
        } catch (err) {
            console.error('[Nostalgist] Load state error:', err);
            return false;
        }
    }, [nostalgistRef, setIsPaused, setStatus]);

    // Start capturing rewind buffer (Afterplay.io style)
    const startRewindCapture = useCallback(() => {
        if (rewindCaptureIntervalRef.current) {
            return;
        }

        if (!nostalgistRef.current) {
            return;
        }

        const MAX_BUFFER_SIZE = 60; // Keep last 30 seconds at 2 saves/sec
        let captureAttempts = 0;
        let successfulCaptures = 0;

        rewindCaptureIntervalRef.current = setInterval(async () => {
            if (!nostalgistRef.current || isPaused) return;

            captureAttempts++;
            // Scheduler handles all FS serialization - no try/catch needed for FS errors
            const state = await saveState();
            if (state) {
                rewindBufferRef.current.push(state);
                successfulCaptures++;

                // Keep buffer size manageable
                if (rewindBufferRef.current.length > MAX_BUFFER_SIZE) {
                    rewindBufferRef.current.shift(); // Remove oldest
                }

                // Update buffer size for UI
                setRewindBufferSize(rewindBufferRef.current.length);

                // Log progress every 50 captures (less verbose)
                if (successfulCaptures % 50 === 0) {
                    console.log(`[Nostalgist] 📹 Rewind buffer: ${rewindBufferRef.current.length} states`);
                }
            }
            // If state is null, scheduler either dropped it (backpressure) or failed - that's fine
        }, 500); // Capture every 500ms
    }, [isPaused, saveState, nostalgistRef]);

    // Stop capturing rewind buffer
    const stopRewindCapture = useCallback(() => {
        if (rewindCaptureIntervalRef.current) {
            clearInterval(rewindCaptureIntervalRef.current);
            rewindCaptureIntervalRef.current = null;
        }
    }, []);

    // Stop rewind (release) - defined before startRewind to avoid closure issues
    const stopRewind = useCallback(() => {
        if (!isRewinding) {
            return;
        }

        try {
            setIsRewinding(false);

            // Clear the rewind interval
            if (rewindIntervalRef.current) {
                clearInterval(rewindIntervalRef.current);
                rewindIntervalRef.current = null;
            }

            // Clear old buffer
            rewindBufferRef.current = [];
            setRewindBufferSize(0);

            // Wait a bit before restarting capture - FS needs time to settle after rapid state loads
            setTimeout(() => {
                // Check if emulator is still available (don't check status - it might be stale in closure)
                if (nostalgistRef.current) {
                    startRewindCapture();
                }
            }, 1000); // Wait 1 second for FS to settle
        } catch (err) {
            console.error('[Nostalgist] Stop rewind error:', err);
        }
    }, [isRewinding, startRewindCapture, nostalgistRef]);

    // Start rewind (hold) - Manual implementation like Afterplay.io
    const startRewind = useCallback(() => {
        if (!nostalgistRef.current || isRewinding) {
            return;
        }

        if (rewindBufferRef.current.length === 0) {
            return;
        }

        try {
            setIsRewinding(true);
            // Stop capturing while rewinding
            stopRewindCapture();

            // Load states backwards from buffer
            let rewindIndex = rewindBufferRef.current.length - 1;
            let isLoadingState = false; // Prevent overlapping loads

            rewindIntervalRef.current = setInterval(async () => {
                // Skip if already loading or no more states
                if (isLoadingState || rewindIndex < 0 || !nostalgistRef.current) {
                    if (rewindIndex < 0) {
                        // Reached beginning of buffer, auto-stop
                        stopRewind();
                    }
                    return;
                }

                try {
                    const state = rewindBufferRef.current[rewindIndex];
                    if (state) {
                        isLoadingState = true;
                        await loadState(state);
                        rewindIndex--;
                        isLoadingState = false;
                    } else {
                        // Invalid state, stop rewinding
                        stopRewind();
                    }
                } catch (err) {
                    isLoadingState = false;
                    // Silently handle errors (likely FS issues when switching states fast)
                }
            }, 200); // Load state every 200ms for smoother rewind
        } catch (err) {
            console.error('[Nostalgist] Start rewind error:', err);
            setIsRewinding(false);
            startRewindCapture(); // Resume capturing
        }
    }, [isRewinding, loadState, stopRewindCapture, startRewindCapture, stopRewind, nostalgistRef]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear save queue
            saveScheduler.clearQueue();

            // Clean up rewind intervals
            if (rewindIntervalRef.current) {
                clearInterval(rewindIntervalRef.current);
                rewindIntervalRef.current = null;
            }
            if (rewindCaptureIntervalRef.current) {
                clearInterval(rewindCaptureIntervalRef.current);
                rewindCaptureIntervalRef.current = null;
            }

            // Clear rewind buffer
            rewindBufferRef.current = [];
        };
    }, [saveScheduler]);

    // Expose startRewindCapture to be called when emulator starts
    // We can't export it directly because it's used internally, but we can trigger it via effect if needed
    // Or we can export it and let useEmulatorCore call it.
    // For now, let's export it as a ref or just expose it.
    // Actually, `useNostalgist` called `startRewindCapture` in `start`.
    // So we should expose it.

    return {
        isRewinding,
        rewindBufferSize,
        saveState,
        saveStateWithBlob,
        loadState,
        startRewind,
        stopRewind,
        // Internal but needed by core
        startRewindCapture,
        stopRewindCapture
    };
}
