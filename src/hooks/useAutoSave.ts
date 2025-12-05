import { useState, useCallback, useEffect, useRef } from 'react';
import { UseNostalgistReturn } from './useNostalgist';
import { SaveQueue } from '../lib/save-queue';

interface UseAutoSaveProps {
    nostalgist: UseNostalgistReturn | null;
    onAutoSave?: (blob: Blob, screenshot?: string) => Promise<void>;
    queueRef: React.MutableRefObject<SaveQueue>;
    autoSaveInterval?: number; // Defaults to 60000ms
}

export function useAutoSave({
    nostalgist,
    onAutoSave,
    queueRef,
    autoSaveInterval = 60000,
}: UseAutoSaveProps) {
    const [autoSavePaused, setAutoSavePaused] = useState(false);
    const [autoSaveState, setAutoSaveState] = useState<'idle' | 'counting' | 'saving' | 'done'>('idle');
    const [autoSaveProgress, setAutoSaveProgress] = useState(0);

    // Keep latest callbacks in refs to avoid restarting the timer
    const onAutoSaveRef = useRef(onAutoSave);
    const nostalgistRef = useRef(nostalgist);

    useEffect(() => {
        onAutoSaveRef.current = onAutoSave;
        nostalgistRef.current = nostalgist;
    }, [onAutoSave, nostalgist]);

    // Trigger to restart the auto-save loop
    const [loopTrigger, setLoopTrigger] = useState(0);

    useEffect(() => {
        const currentNostalgist = nostalgist;

        if (!onAutoSave || !currentNostalgist || currentNostalgist.status !== 'running' || autoSavePaused) {
            setAutoSaveState('idle');
            setAutoSaveProgress(0);
            return;
        }

        setAutoSaveState('counting');
        setAutoSaveProgress(0);

        const progressInterval = 1000;
        const startTime = Date.now();

        // Progress updater
        const progressId = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(100, (elapsed / autoSaveInterval) * 100);
            setAutoSaveProgress(progress);
        }, progressInterval);

        // Auto-save trigger
        const saveTimeoutId = setTimeout(async () => {
            if (queueRef.current.isBusy) {
                console.log('[GamePlayer] Skipping auto-save (queue busy)');
                // Retry in 5 seconds if busy, don't full reset
                setTimeout(() => setLoopTrigger(prev => prev + 1), 5000);
                return;
            }

            const activeNostalgist = nostalgistRef.current;
            const activeOnAutoSave = onAutoSaveRef.current;

            if (!activeNostalgist || !activeOnAutoSave) return;

            setAutoSaveState('saving');
            setAutoSaveProgress(100);

            await queueRef.current.add(async () => {
                const result = await activeNostalgist.saveStateWithBlob();
                if (result) {
                    let screen: string | undefined;
                    try {
                        const screenshotData = await activeNostalgist.screenshot();
                        if (screenshotData) screen = screenshotData;
                    } catch (e) {
                        console.warn('Failed to take screenshot for auto-save', e);
                    }

                    await activeOnAutoSave(result.blob, screen);
                    console.log('[GamePlayer] Auto-saved');
                    setAutoSaveState('done');

                    // Restart loop after 2 seconds
                    setTimeout(() => {
                        setLoopTrigger(prev => prev + 1);
                    }, 2000);
                }
            });
        }, autoSaveInterval);

        return () => {
            clearInterval(progressId);
            clearTimeout(saveTimeoutId);
        };
    }, [nostalgist?.status, autoSavePaused, !!onAutoSave, loopTrigger, autoSaveInterval]);

    const handleAutoSaveToggle = useCallback(() => {
        setAutoSavePaused(prev => !prev);
    }, []);

    // Emergency Save Logic (Visibility Change & Unload)
    useEffect(() => {
        if (!onAutoSave || !nostalgist || nostalgist.status !== 'running') return;

        const performEmergencySave = async () => {
            try {
                await queueRef.current.add(async () => {
                    const result = await nostalgist.saveStateWithBlob();
                    if (result) {
                        let screen: string | undefined;
                        try {
                            const screenshotData = await nostalgist.screenshot();
                            if (screenshotData) screen = screenshotData;
                        } catch (e) {
                            console.warn('Failed to take screenshot for emergency save', e);
                        }

                        await onAutoSave(result.blob, screen);
                        console.log('[GamePlayer] Emergency saved');
                    }
                });
            } catch (err) {
                console.error('[GamePlayer] Emergency save failed', err);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                performEmergencySave();
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!document.hidden) {
                performEmergencySave();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [nostalgist?.status, onAutoSave, nostalgist]);

    return {
        autoSaveEnabled: !!onAutoSave,
        autoSavePaused,
        autoSaveState,
        autoSaveProgress,
        handleAutoSaveToggle,
    };
}
