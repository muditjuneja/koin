import { useState, useCallback, useRef } from 'react';
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
            showToast(t.notifications.failedFetch, 'error', { title: t.overlays.toast.error });
        } finally {
            setIsSlotLoading(false);
        }
    }, [onGetSaveSlots, showToast]);

    // Handlers
    const handleSave = async () => {
        if (!nostalgist) return;

        if (onGetSaveSlots && onSaveState) {
            // Open modal for slot selection
            setSaveModalMode('save');
            setSaveModalOpen(true);
            pause(); // Pause game while in modal
            refreshSlots();
        } else if (onSaveState) {
            // Direct save to slot 0 if no slot system
            await queueRef.current.add(async () => {
                const result = await nostalgist.saveStateWithBlob();
                if (result) {
                    await onSaveState(0, result.blob, undefined);
                    showToast(t.notifications.saved, 'success', { title: t.overlays.toast.saved });
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
                    showToast(t.notifications.downloaded, 'success', { title: t.overlays.toast.saved });
                }
            });
        }
    };

    const handleLoad = async () => {
        if (!nostalgist) return;

        if (onGetSaveSlots && onLoadState) {
            // Open modal for slot selection
            setSaveModalMode('load');
            setSaveModalOpen(true);
            pause();
            refreshSlots();
        } else if (onLoadState) {
            // Direct load from slot 0
            const blob = await onLoadState(0);
            if (blob) {
                const buffer = await blob.arrayBuffer();
                await queueRef.current.add(async () => {
                    await nostalgist.loadState(new Uint8Array(buffer));
                });
                showToast(t.notifications.loaded, 'success', { title: t.overlays.toast.loaded });
            } else {
                showToast(t.notifications.noSaveFound, 'error', { title: t.overlays.toast.error });
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
                    showToast(t.notifications.loadedFile, 'success', { title: t.overlays.toast.loaded });
                }
            };
            input.click();
        }
    };

    const handleSlotSelect = async (slot: number) => {
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
                        showToast(t.notifications.savedSlot.replace('{{num}}', slot.toString()), 'success', { title: t.overlays.toast.saved });
                        setSaveModalOpen(false);
                        resume();
                    }
                });
            } catch (err) {
                console.error('Save failed:', err);
                showToast(t.notifications.failedSave, 'error', { title: t.overlays.toast.error });
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
                    showToast(t.notifications.loadedSlot.replace('{{num}}', slot.toString()), 'success', { title: t.overlays.toast.loaded });
                    setSaveModalOpen(false);
                    resume();
                } else {
                    showToast(t.notifications.emptySlot, 'error', { title: t.overlays.toast.error });
                }
            } catch (err) {
                console.error('Load failed:', err);
                showToast(t.notifications.failedLoad, 'error', { title: t.overlays.toast.error });
            } finally {
                setActioningSlot(null);
            }
        }
    };

    const handleSlotDelete = async (slot: number) => {
        if (!onDeleteSaveState) return;
        if (!confirm('Are you sure you want to delete this save?')) return;

        setActioningSlot(slot);
        try {
            await onDeleteSaveState(slot);
            showToast(t.notifications.deletedSlot.replace('{{num}}', slot.toString()), 'success', { title: t.overlays.toast.saved });
            refreshSlots(); // Refresh list
        } catch (err) {
            console.error('Delete failed:', err);
            showToast(t.notifications.failedDelete, 'error', { title: t.overlays.toast.error });
        } finally {
            setActioningSlot(null);
        }
    };

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
