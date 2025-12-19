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
}: CheatModalProps) {
    const t = useKoinTranslation();
    const [copiedId, setCopiedId] = React.useState<number | null>(null);

    const handleCopy = async (code: string, id: number) => {
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
            {/* Cheats List */}
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                {cheats.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Code size={48} className="mx-auto mb-3 opacity-50" />
                        <p className="font-medium">{t.modals.cheats.emptyTitle}</p>
                        <p className="text-sm mt-1">{t.modals.cheats.emptyDesc}</p>
                    </div>
                ) : (
                    cheats.map((cheat) => {
                        const isActive = activeCheats.has(cheat.id);

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
                                    <p className={`font-medium ${isActive ? 'text-purple-300' : 'text-white'}`}>
                                        {cheat.description}
                                    </p>
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
                    })
                )}
            </div>
        </ModalShell>
    );
}

