'use client';

import { Globe, Check, Settings } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import ModalShell from './ModalShell';

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

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
        { code: 'fr', name: 'Français' },
    ] as const;

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={t.settings.title}
            icon={<Settings size={20} className="text-white" />}
            maxWidth="sm"
            footer={
                <button
                    onClick={onClose}
                    className="text-sm text-gray-500 hover:text-white transition-colors w-full text-center"
                >
                    {t.modals.shortcuts.pressEsc}
                </button>
            }
        >
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
        </ModalShell>
    );
}

