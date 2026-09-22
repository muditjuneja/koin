import { useState, useCallback, useRef, useEffect } from 'react';
import { UseNostalgistReturn } from './useNostalgist';
import { useKoinTranslation } from './useKoinTranslation';
import { GamePlayerProps, SaveSlot } from '../components/types';
import { SaveQueue } from '../lib/save-queue';
import { useAutoSave } from './useAutoSave';

interface UseGameSavesProps extends Partial<GamePlayerProps> {
    nostalgist: UseNostalgistReturn | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: any) => void;
    pause: () => void;
    resume: () => void;
}

export function useGameSaves({
    nostalgist,
    showToast,
    pause,
    resume,
    title,
    onSaveState,
    onLoadState,
    onAutoSave,
    onGetSaveSlots,
    onDeleteSaveState,
    autoSaveInterval,
}: UseGameSavesProps) {
    const t = useKoinTranslation();

    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const pauseRef = useRef(pause);
    useEffect(() => {
        pauseRef.current = pause;
    }, [pause]);

    const resumeRef = useRef(resume);
    useEffect(() => {
        resumeRef.current = resume;
    }, [resume]);

    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    // Save Slot Modal state
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalMode, setSaveModalMode] = useState<'save' | 'load'>('save');
    const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
    const [isSlotLoading, setIsSlotLoading] = useState(false);
    const [actioningSlot, setActioningSlot] = useState<number | null>(null);

    // Save Queue to prevent race conditions
    const queueRef = useRef(new SaveQueue());

    // Auto-save hook
    const {
        autoSaveEnabled,
        autoSavePaused,
        autoSaveState,
        autoSaveProgress,
        handleAutoSaveToggle,
    } = useAutoSave({
        nostalgist,
        onAutoSave,
        queueRef,
        autoSaveInterval,
    });

    // Fetch slots helper
    const refreshSlots = useCallback(async () => {
        if (!onGetSaveSlots) return;
        setIsSlotLoading(true);
        try {
            const slots = await onGetSaveSlots();
            setSaveSlots(slots);
        } catch (err) {
            console.error('Failed to fetch save slots:', err);
            showToastRef.current(tRef.current.notifications.failedFetch, 'error', { title: tRef.current.overlays.toast.error });
        } finally {
            setIsSlotLoading(false);
        }
    }, [onGetSaveSlots]);


    // Handlers
    const handleSave = useCallback(async () => {
        if (!nostalgist) return;

        if (onGetSaveSlots && onSaveState) {
            // Open modal for slot selection
            setSaveModalMode('save');
            setSaveModalOpen(true);
            pauseRef.current(); // Pause game while in modal
            refreshSlots();
        } else if (onSaveState) {
            // Direct save to slot 0 if no slot system
            await queueRef.current.add(async () => {
                const result = await nostalgist.saveStateWithBlob();
                if (result) {
                    await onSaveState(0, result.blob, undefined);
                    showToastRef.current(tRef.current.notifications.saved, 'success', { title: tRef.current.overlays.toast.saved });
                }
            });
        } else {
            // Default: Download blob
            await queueRef.current.add(async () => {
                const result = await nostalgist.saveStateWithBlob();
                if (result) {
                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const fileName = title || 'game';
                    a.download = `${fileName}.state`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToastRef.current(tRef.current.notifications.downloaded, 'success', { title: tRef.current.overlays.toast.saved });
                }
            });
        }
    }, [nostalgist, onGetSaveSlots, onSaveState, refreshSlots, title]);

    const handleLoad = useCallback(async () => {
        if (!nostalgist) return;

        if (onGetSaveSlots && onLoadState) {
            // Open modal for slot selection
            setSaveModalMode('load');
            setSaveModalOpen(true);
            pauseRef.current();
            refreshSlots();
        } else if (onLoadState) {
            // Direct load from slot 0
            const blob = await onLoadState(0);
            if (blob) {
                const buffer = await blob.arrayBuffer();
                await queueRef.current.add(async () => {
                    await nostalgist.loadState(new Uint8Array(buffer));
                });
                showToastRef.current(tRef.current.notifications.loaded, 'success', { title: tRef.current.overlays.toast.loaded });
            } else {
                showToastRef.current(tRef.current.notifications.noSaveFound, 'error', { title: tRef.current.overlays.toast.error });
            }
        } else {
            // Default: Open file picker
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.state';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const buffer = await file.arrayBuffer();
                    await queueRef.current.add(async () => {
                        await nostalgist.loadState(new Uint8Array(buffer));
                    });
                    showToastRef.current(tRef.current.notifications.loadedFile, 'success', { title: tRef.current.overlays.toast.loaded });
                }
            };
            input.click();
        }
    }, [nostalgist, onGetSaveSlots, onLoadState, refreshSlots]);

    const handleSlotSelect = useCallback(async (slot: number) => {
        if (!nostalgist) return;

        if (saveModalMode === 'save') {
            if (!onSaveState) return;
            setActioningSlot(slot);
            try {
                await queueRef.current.add(async () => {
                    const result = await nostalgist.saveStateWithBlob();
                    if (result) {
                        // Take screenshot
                        let screen: string | undefined;
                        try {
                            const screenshotData = await nostalgist.screenshot();
                            if (screenshotData) {
                                screen = screenshotData;
                            }
                        } catch (e) {
                            console.warn('Screenshot failed', e);
                        }

                        await onSaveState(slot, result.blob, screen);
                        showToastRef.current(tRef.current.notifications.savedSlot.replace('{{num}}', slot.toString()), 'success', { title: tRef.current.overlays.toast.saved });
                        setSaveModalOpen(false);
                        resumeRef.current();
                    }
                });
            } catch (err) {
                console.error('Save failed:', err);
                showToastRef.current(tRef.current.notifications.failedSave, 'error', { title: tRef.current.overlays.toast.error });
            } finally {
                setActioningSlot(null);
            }
        } else {
            if (!onLoadState) return;
            setActioningSlot(slot);
            try {
                const blob = await onLoadState(slot);
                if (blob) {
                    const buffer = await blob.arrayBuffer();
                    await queueRef.current.add(async () => {
                        await nostalgist.loadState(new Uint8Array(buffer));
                    });
                    showToastRef.current(tRef.current.notifications.loadedSlot.replace('{{num}}', slot.toString()), 'success', { title: tRef.current.overlays.toast.loaded });
                    setSaveModalOpen(false);
                    resumeRef.current();
                } else {
                    showToastRef.current(tRef.current.notifications.emptySlot, 'error', { title: tRef.current.overlays.toast.error });
                }
            } catch (err) {
                console.error('Load failed:', err);
                showToastRef.current(tRef.current.notifications.failedLoad, 'error', { title: tRef.current.overlays.toast.error });
            } finally {
                setActioningSlot(null);
            }
        }
    }, [nostalgist, saveModalMode, onSaveState, onLoadState]);

    const handleSlotDelete = useCallback(async (slot: number) => {
        if (!onDeleteSaveState) return;

        // Refuse to delete (rather than silently skip confirmation) when
        // window.confirm isn't available — e.g. SSR or a sandboxed host.
        if (typeof window === 'undefined' || typeof window.confirm !== 'function') return;
        if (!window.confirm('Are you sure you want to delete this save?')) return;

        setActioningSlot(slot);
        try {
            await onDeleteSaveState(slot);
            showToastRef.current(tRef.current.notifications.deletedSlot.replace('{{num}}', slot.toString()), 'success', { title: tRef.current.overlays.toast.saved });
            refreshSlots(); // Refresh list
        } catch (err) {
            console.error('Delete failed:', err);
            showToastRef.current(tRef.current.notifications.failedDelete, 'error', { title: tRef.current.overlays.toast.error });
        } finally {
            setActioningSlot(null);
        }
    }, [onDeleteSaveState, refreshSlots]);

    return {
        saveModalOpen,
        setSaveModalOpen,
        saveModalMode,
        saveSlots,
        isSlotLoading,
        actioningSlot,
        handleSave,
        handleLoad,
        handleSlotSelect,
        handleSlotDelete,
        // Auto-save exports
        autoSaveEnabled,
        autoSavePaused,
        autoSaveState,
        autoSaveProgress,
        handleAutoSaveToggle,
    };
}
