'use client';


import { X, Cpu, Check, FileCode, AlertCircle, Code } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

export interface BiosOption {
    id: string;
    name: string;
    description?: string;
}

interface BiosSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    biosOptions: BiosOption[];
    currentBiosId?: string;
    onSelectBios: (id: string) => void;
    systemColor?: string;
}

export default function BiosSelectionModal({
    isOpen,
    onClose,
    biosOptions,
    currentBiosId,
    onSelectBios,
    systemColor = '#00FF41',
}: BiosSelectionModalProps) {
    const t = useKoinTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative bg-gray-900 border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]"
                style={{ borderColor: `${systemColor}40` }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50 bg-noise">
                    <div className="flex items-center gap-3">
                        <Cpu size={24} style={{ color: systemColor }} />
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wide">{t.modals.bios.title}</h2>
                            <p className="text-xs text-gray-400">
                                {t.modals.bios.description}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto space-y-2">
                    {/* Warning Notice */}
                    <div className="mb-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                        <AlertCircle className="shrink-0 text-yellow-500 mt-0.5" size={16} />
                        <div className="text-xs text-yellow-200/80">
                            <strong>{t.modals.bios.warningTitle}</strong> {t.modals.bios.warning}
                        </div>
                    </div>

                    {/* System Default Option (Clear Selection) */}
                    <button
                        onClick={() => onSelectBios('')}
                        className={`
                            w-full group flex items-center gap-4 p-4 rounded-lg border transition-all text-left mb-2
                            ${!currentBiosId
                                ? 'bg-white/10'
                                : 'bg-black/20 hover:bg-white/5 border-white/5 hover:border-white/20'
                            }
                        `}
                        style={{
                            borderColor: !currentBiosId ? systemColor : undefined
                        }}
                    >
                        <div
                            className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border transition-colors
                                ${!currentBiosId ? '' : 'border-white/10 bg-black/30 group-hover:border-white/20'}
                            `}
                            style={{
                                backgroundColor: !currentBiosId ? `${systemColor}20` : undefined,
                                borderColor: !currentBiosId ? systemColor : undefined
                            }}
                        >
                            <Cpu size={20} style={{ color: !currentBiosId ? systemColor : '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold truncate ${!currentBiosId ? 'text-white' : 'text-gray-300'}`}>
                                    {t.modals.bios.systemDefault}
                                </span>
                                {!currentBiosId && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                                        {t.modals.bios.active}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {t.modals.bios.defaultDesc}
                            </p>
                        </div>
                        {!currentBiosId && (
                            <Check size={20} style={{ color: systemColor }} />
                        )}
                    </button>

                    {biosOptions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileCode size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t.modals.bios.emptyTitle}</p>
                            <p className="text-[10px] mt-1 text-gray-600">{t.modals.bios.emptyDesc}</p>
                        </div>
                    ) : (
                        biosOptions.map((bios) => {
                            const isSelected = bios.id === currentBiosId;

                            return (
                                <button
                                    key={bios.id}
                                    onClick={() => onSelectBios(bios.id)}
                                    className={`
                                        w-full group flex items-center gap-4 p-4 rounded-lg border transition-all text-left
                                        ${isSelected
                                            ? 'bg-white/10'
                                            : 'bg-black/20 hover:bg-white/5 border-white/5 hover:border-white/20'
                                        }
                                    `}
                                    style={{
                                        borderColor: isSelected ? systemColor : undefined
                                    }}
                                >
                                    {/* Icon */}
                                    <div
                                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border transition-colors
                                            ${isSelected ? '' : 'border-white/10 bg-black/30 group-hover:border-white/20'}
                                        `}
                                        style={{
                                            backgroundColor: isSelected ? `${systemColor}20` : undefined,
                                            borderColor: isSelected ? systemColor : undefined
                                        }}
                                    >
                                        <Code size={20} style={{ color: isSelected ? systemColor : '#6b7280' }} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                {bios.name}
                                            </span>
                                            {isSelected && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                                                    {t.modals.bios.active}
                                                </span>
                                            )}
                                        </div>
                                        {bios.description && (
                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                {bios.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Checkmark */}
                                    {isSelected && (
                                        <Check size={20} style={{ color: systemColor }} />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-black/30 border-t border-white/10 text-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {t.modals.bios.footer}
                    </p>
                </div>
            </div>
        </div>
    );
}
