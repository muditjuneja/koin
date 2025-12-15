'use client';

import { X, Globe, Check, Settings } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: string;
    onLanguageChange: (lang: 'en' | 'es' | 'fr') => void;
    systemColor?: string;
}

export default function SettingsModal({
    isOpen,
    onClose,
    currentLanguage,
    onLanguageChange,
    systemColor = '#00FF41',
}: SettingsModalProps) {
    const t = useKoinTranslation();

    if (!isOpen) return null;

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
    ] as const;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
                    <div className="flex items-center gap-3">
                        <Settings className="text-white" size={20} />
                        <h2 className="text-lg font-bold text-white">
                            {t.settings.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Language Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
                            <Globe size={16} />
                            <span>{t.settings.language}</span>
                        </div>

                        <div className="grid gap-2">
                            {languages.map((lang) => {
                                const isActive = currentLanguage === lang.code;
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => onLanguageChange(lang.code)}
                                        className={`
                                            flex items-center justify-between px-4 py-3 rounded-lg border transition-all
                                            ${isActive
                                                ? 'bg-white/10 border-white/20 text-white'
                                                : 'bg-black/20 border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                                            }
                                        `}
                                    >
                                        <span>{lang.name}</span>
                                        {isActive && (
                                            <Check size={16} style={{ color: systemColor }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-black/30 border-t border-white/10 text-center">
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                        {t.modals.shortcuts.pressEsc}
                    </button>
                </div>
            </div>
        </div>
    );
}
