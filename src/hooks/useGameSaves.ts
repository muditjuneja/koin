import { useState, useCallback, useRef } from 'react';
import { UseNostalgistReturn } from './useNostalgist';
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
            showToast('Failed to load save slots', 'error');
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
                    showToast('State saved successfully', 'success');
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
                    showToast('State downloaded', 'success');
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
                showToast('State loaded successfully', 'success');
            } else {
                showToast('No save found', 'error');
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
                    showToast('State loaded from file', 'success');
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
                        showToast(`Saved to slot ${slot}`, 'success');
                        setSaveModalOpen(false);
                        resume();
                    }
                });
            } catch (err) {
                console.error('Save failed:', err);
                showToast('Failed to save', 'error');
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
                    showToast(`Loaded from slot ${slot}`, 'success');
                    setSaveModalOpen(false);
                    resume();
                } else {
                    showToast('Empty slot', 'error');
                }
            } catch (err) {
                console.error('Load failed:', err);
                showToast('Failed to load', 'error');
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
            showToast(`Deleted slot ${slot}`, 'success');
            refreshSlots(); // Refresh list
        } catch (err) {
            console.error('Delete failed:', err);
            showToast('Failed to delete', 'error');
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
