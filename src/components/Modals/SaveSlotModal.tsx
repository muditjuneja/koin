'use client';

import { Save, Download, Trash2, Clock, HardDrive, Loader2, RefreshCw, Lock, Zap } from 'lucide-react';
import { SaveSlotModalProps, SaveSlot } from '../types';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import ModalShell from './ModalShell';

// Slot 5 is reserved for auto-save
const AUTO_SAVE_SLOT = 5;

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimestamp(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute
        if (diff < 60000) return 'Just now';
        // Less than 1 hour
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        // Less than 24 hours
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        // Otherwise show date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Unknown';
    }
}

export default function SaveSlotModal({
    isOpen,
    mode,
    slots,
    isLoading,
    actioningSlot,
    onSelect,
    onDelete,
    onClose,
    maxSlots = 5,
    onUpgrade,
}: SaveSlotModalProps) {
    const t = useKoinTranslation();

    const isSaveMode = mode === 'save';
    const allSlots = [1, 2, 3, 4, 5];
    const isUnlimited = maxSlots === -1 || maxSlots >= 5;

    // For load mode, sort slots to show most recently saved first
    // For save mode, keep original order (1-5) so users know which slot is which
    const displaySlots = isSaveMode
        ? allSlots
        : [...allSlots].sort((a, b) => {
            const slotA = slots.find(s => s.slot === a);
            const slotB = slots.find(s => s.slot === b);
            // Empty slots go to the end
            if (!slotA && !slotB) return a - b;
            if (!slotA) return 1;
            if (!slotB) return -1;
            // Sort by timestamp descending (most recent first)
            return new Date(slotB.timestamp).getTime() - new Date(slotA.timestamp).getTime();
        });

    const getSlotData = (slotNum: number): SaveSlot | undefined => {
        return slots.find((s) => s.slot === slotNum);
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={isSaveMode ? t.modals.saveSlots.saveTitle : t.modals.saveSlots.loadTitle}
            subtitle={isSaveMode ? t.modals.saveSlots.subtitleSave : t.modals.saveSlots.subtitleLoad}
            icon={isSaveMode
                ? <Save className="text-retro-primary" size={24} />
                : <Download className="text-retro-primary" size={24} />
            }
            maxWidth="md"
            footer={
                <p className="text-xs text-gray-500 text-center w-full">
                    {isSaveMode
                        ? t.modals.saveSlots.footerSave
                        : t.modals.saveSlots.footerLoad
                    }
                </p>
            }
        >

            {/* Slots List */}
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <span className="text-sm">{t.modals.saveSlots.loading}</span>
                    </div>
                ) : (
                    displaySlots.map((slotNum) => {
                        const slotData = getSlotData(slotNum);
                        const isEmpty = !slotData;
                        const isAutoSaveSlot = slotNum === AUTO_SAVE_SLOT;
                        // Check if slot is locked by tier (only for manual slots 1-4)
                        const isLockedByTier = !isUnlimited && !isAutoSaveSlot && slotNum > maxSlots && isEmpty;
                        const isDisabled = (!isSaveMode && isEmpty) || (isSaveMode && isAutoSaveSlot) || (isSaveMode && isLockedByTier);
                        const isActioning = actioningSlot === slotNum;

                        // Locked slot - show upgrade prompt
                        if (isLockedByTier && isSaveMode) {
                            return (
                                <div
                                    key={slotNum}
                                    onClick={() => onUpgrade?.()}
                                    className={`group relative flex items-center gap-4 p-4 rounded-lg border border-gray-700 bg-gray-800/50 transition-all ${onUpgrade ? 'cursor-pointer hover:border-retro-primary/30' : 'cursor-default'}`}
                                >
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl bg-gray-700 text-gray-500">
                                        <Lock size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-400 group-hover:text-white transition-colors">
                                            {t.modals.saveSlots.locked.replace('{{num}}', slotNum.toString())}
                                        </p>
                                        <p className="text-xs text-gray-500 group-hover:text-retro-primary transition-colors flex items-center gap-1">
                                            <Zap size={10} />
                                            {t.modals.saveSlots.upgrade}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={slotNum}
                                className={`
                                        group relative flex items-center gap-4 p-4 rounded-lg border transition-all
                                        ${isAutoSaveSlot && isSaveMode
                                        ? 'border-retro-primary/20 bg-retro-primary/5 cursor-not-allowed'
                                        : isDisabled
                                            ? 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                                            : isActioning
                                                ? 'border-retro-primary bg-retro-primary/10 cursor-wait'
                                                : 'border-white/10 bg-white/5 hover:border-retro-primary/50 hover:border-retro-primary/10 cursor-pointer'
                                    }
                                      `}
                                onClick={() => !isDisabled && !isActioning && onSelect(slotNum)}
                            >
                                {/* Slot Number / Auto-save badge */}
                                <div className={`
                                            flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl
                                            ${isAutoSaveSlot
                                        ? 'bg-retro-primary/20 text-retro-primary'
                                        : isEmpty
                                            ? 'bg-gray-800 text-gray-600'
                                            : 'bg-retro-primary/20 text-retro-primary'
                                    }
                                          `}>
                                    {isActioning ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : isAutoSaveSlot ? (
                                        <RefreshCw size={20} />
                                    ) : (
                                        slotNum
                                    )}
                                </div>

                                {/* Slot Info */}
                                <div className="flex-1 min-w-0">
                                    {isAutoSaveSlot ? (
                                        // Auto-save slot - special display
                                        isEmpty ? (
                                            <div className="text-retro-primary/70">
                                                <p className="font-medium">{t.modals.saveSlots.autoSave}</p>
                                                <p className="text-xs text-retro-primary/50">{t.modals.saveSlots.autoSaveDesc}</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                {slotData.screenshot && (
                                                    <div className="flex-shrink-0 w-16 h-12 rounded border border-retro-primary/30 overflow-hidden bg-black">
                                                        <img
                                                            src={slotData.screenshot}
                                                            alt="Auto-save"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-retro-primary truncate">
                                                        {t.modals.saveSlots.autoSave}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-retro-primary/60 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatTimestamp(slotData.timestamp)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <HardDrive size={12} />
                                                            {formatBytes(slotData.size)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    ) : isEmpty ? (
                                        <div className="text-gray-500">
                                            <p className="font-medium">{t.modals.saveSlots.emptySlot}</p>
                                            <p className="text-xs">{t.modals.saveSlots.noData}</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            {/* Screenshot */}
                                            {slotData.screenshot && (
                                                <div className="flex-shrink-0 w-16 h-12 rounded border border-white/10 overflow-hidden bg-black">
                                                    <img
                                                        src={slotData.screenshot}
                                                        alt={`Save slot ${slotNum}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            // Hide image if it fails to load
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-white truncate">
                                                    {t.modals.saveSlots.slot.replace('{{num}}', slotNum.toString())}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatTimestamp(slotData.timestamp)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <HardDrive size={12} />
                                                        {formatBytes(slotData.size)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Delete button - only for non-empty slots, hide for auto-save in save mode */}
                                {!isEmpty && !(isAutoSaveSlot && isSaveMode) && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(slotNum);
                                        }}
                                        className="flex-shrink-0 p-2.5 rounded-lg bg-retro-tertiary/10 hover:bg-retro-tertiary/20 text-retro-tertiary hover:text-retro-tertiary transition-all border border-retro-tertiary/20"
                                        title="Delete save"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </ModalShell>
    );
}
