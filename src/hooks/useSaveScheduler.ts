import { useRef, useCallback } from 'react';

export type SavePriority = 'low' | 'high';

export interface SaveResult {
    data: Uint8Array;
    blob: Blob;
}

interface QueuedSave {
    priority: SavePriority;
    resolve: (result: SaveResult | null) => void;
    timestamp: number;
}

// Minimum delay between saves to let FS settle (ms)
const MIN_SAVE_INTERVAL = 100;

// How long to wait for a queued save before timing out (ms)
const SAVE_TIMEOUT = 5000;

export function useSaveScheduler(nostalgistRef: React.MutableRefObject<any>) {
    // Queue of pending save requests
    const queueRef = useRef<QueuedSave[]>([]);

    // Is a save currently in progress?
    const savingRef = useRef(false);

    // Timestamp of last successful save
    const lastSaveTimeRef = useRef(0);

    // Process the next item in the queue
    const processQueue = useCallback(async () => {
        // Already processing or empty queue
        if (savingRef.current || queueRef.current.length === 0) {
            return;
        }

        // Sort by priority (high first) then by timestamp (oldest first)
        queueRef.current.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority === 'high' ? -1 : 1;
            }
            return a.timestamp - b.timestamp;
        });

        // Get next item
        const item = queueRef.current.shift();
        if (!item) return;

        // Check if timed out
        if (Date.now() - item.timestamp > SAVE_TIMEOUT) {
            item.resolve(null);
            // Continue processing
            setTimeout(() => processQueue(), 0);
            return;
        }

        savingRef.current = true;

        try {
            // Ensure minimum interval between saves
            const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
            if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
                await new Promise(resolve => setTimeout(resolve, MIN_SAVE_INTERVAL - timeSinceLastSave));
            }

            // Perform the save
            if (!nostalgistRef.current) {
                console.warn('[SaveScheduler] Nostalgist instance not available');
                item.resolve(null);
                return;
            }

            // Only log for high-priority saves (manual/auto/emergency), not rewind captures
            const isHighPriority = item.priority === 'high';
            if (isHighPriority) {
                console.log('[SaveScheduler] Processing high-priority save...');
            }

            const result = await nostalgistRef.current.saveState();
            const stateBlob = result?.state;

            if (!stateBlob) {
                console.warn('[SaveScheduler] saveState() returned null or no state blob', { result, priority: item.priority });
                item.resolve(null);
                return;
            }

            // Convert Blob to Uint8Array
            const arrayBuffer = await stateBlob.arrayBuffer();
            const stateData = new Uint8Array(arrayBuffer);

            // Only log success for high-priority saves to reduce console noise
            if (isHighPriority) {
                console.log('[SaveScheduler] Save successful', { size: stateData.length, priority: item.priority });
            }

            lastSaveTimeRef.current = Date.now();
            item.resolve({ data: stateData, blob: stateBlob });
        } catch (err) {
            console.error('[SaveScheduler] Save failed with error:', err);
            item.resolve(null);
        } finally {
            savingRef.current = false;

            // Process next item after a brief delay
            setTimeout(() => processQueue(), MIN_SAVE_INTERVAL);
        }
    }, [nostalgistRef]);

    // Queue a high-priority save (auto-save, manual save)
    const save = useCallback((): Promise<SaveResult | null> => {
        return new Promise((resolve) => {
            queueRef.current.push({
                priority: 'high',
                resolve,
                timestamp: Date.now(),
            });
            processQueue();
        });
    }, [processQueue]);

    // Queue a low-priority save (rewind buffer)
    const queueRewindCapture = useCallback((): Promise<SaveResult | null> => {
        // Drop if queue has too many low-priority items (backpressure)
        const lowPriorityCount = queueRef.current.filter(q => q.priority === 'low').length;
        if (lowPriorityCount >= 3) {
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            queueRef.current.push({
                priority: 'low',
                resolve,
                timestamp: Date.now(),
            });
            processQueue();
        });
    }, [processQueue]);

    // Check if a save is currently in progress
    const isSaving = useCallback(() => savingRef.current, []);

    // Get queue length (for debugging)
    const getQueueLength = useCallback(() => queueRef.current.length, []);

    // Clear queue (on unmount or stop)
    const clearQueue = useCallback(() => {
        queueRef.current.forEach(item => item.resolve(null));
        queueRef.current = [];
    }, []);

    const resultRef = useRef({
        save,
        queueRewindCapture,
        isSaving,
        getQueueLength,
        clearQueue,
    });

    resultRef.current.save = save;
    resultRef.current.queueRewindCapture = queueRewindCapture;
    resultRef.current.isSaving = isSaving;
    resultRef.current.getQueueLength = getQueueLength;
    resultRef.current.clearQueue = clearQueue;

    return resultRef.current;
}
