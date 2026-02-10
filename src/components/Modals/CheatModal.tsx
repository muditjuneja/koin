'use client';

import React from 'react';
import { Code, Check, Copy } from 'lucide-react';
import { CheatModalProps } from '../types';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import ModalShell from './ModalShell';

export default function CheatModal({
    isOpen,
    cheats,
    activeCheats,
    onToggle,
    onClose,
    onAddManualCheat,
}: CheatModalProps) {
    const t = useKoinTranslation();
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    const handleCopy = async (code: string, id: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={t.modals.cheats.title}
            subtitle={t.modals.cheats.available.replace('{{count}}', cheats.length.toString())}
            icon={<Code size={24} className="text-purple-400" />}
            footer={
                <p className="text-xs text-gray-500 text-center w-full">
                    {activeCheats.size > 0
                        ? t.modals.cheats.active.replace('{{count}}', activeCheats.size.toString())
                        : t.modals.cheats.toggleHint
                    }
                </p>
            }
        >
            <div className="p-4 space-y-4">
                {/* Manual Entry Form */}
                {onAddManualCheat && (
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t.modals.cheats.codePlaceholder || "Enter cheat code"}
                                className="flex-1 bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = e.currentTarget;
                                        const code = input.value.trim();
                                        if (code) {
                                            const descInput = input.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                                            const desc = descInput?.value.trim() || 'Custom Cheat';
                                            onAddManualCheat(code, desc);
                                            input.value = '';
                                            if (descInput) descInput.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder={t.modals.cheats.descPlaceholder || "Description (optional)"}
                                className="flex-1 bg-black/50 border border-white/20 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                            <button
                                onClick={(e) => {
                                    const descInput = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    const codeInput = e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement;
                                    const code = codeInput?.value.trim();
                                    const desc = descInput?.value.trim() || 'Custom Cheat';
                                    if (code) {
                                        onAddManualCheat(code, desc);
                                        codeInput.value = '';
                                        descInput.value = '';
                                    }
                                }}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-colors"
                            >
                                {t.modals.cheats.add || "Add"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Unified Cheats List */}
                {cheats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Code size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">{t.modals.cheats.emptyTitle}</p>
                        <p className="text-sm mt-1">{t.modals.cheats.emptyDesc}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {cheats.map((cheat) => {
                            const isActive = activeCheats.has(cheat.id);
                            const isManual = cheat.source === 'manual';

                            return (
                                <div
                                    key={cheat.id}
                                    className={`
                                        group flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer
                                        ${isActive
                                            ? 'border-purple-500/50 bg-purple-500/10'
                                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }
                                    `}
                                    onClick={() => onToggle(cheat.id)}
                                >
                                    {/* Toggle */}
                                    <div
                                        className={`
                                            flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                                            ${isActive
                                                ? 'border-purple-500 bg-purple-500'
                                                : 'border-gray-600 group-hover:border-gray-400'
                                            }
                                        `}
                                    >
                                        {isActive && <Check size={14} className="text-white" />}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {isManual && (
                                                <span className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">USER</span>
                                            )}
                                            <p className={`font-medium ${isActive ? 'text-purple-300' : 'text-white'}`}>
                                                {cheat.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <code className="px-2 py-1 bg-black/50 rounded text-xs font-mono text-gray-400 truncate max-w-[200px]">
                                                {cheat.code}
                                            </code>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCopy(cheat.code, cheat.id);
                                                }}
                                                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                                                title={t.modals.cheats.copy}
                                            >
                                                {copiedId === cheat.id ? (
                                                    <Check size={14} className="text-green-400" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </ModalShell>
    );
}
