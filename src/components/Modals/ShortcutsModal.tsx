'use client';

import { memo, useMemo } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
    systemColor?: string;
}

/**
 * Shortcuts Modal
 * ---------------
 * Shows PLAYER shortcuts (F-keys only).
 * Game controls are configured separately in the Controls modal.
 */
const ShortcutsModal = memo(function ShortcutsModal({
    isOpen,
    onClose,
    systemColor = '#00FF41',
}: ShortcutsModalProps) {
    const t = useKoinTranslation();

    // F-key shortcuts - these are PLAYER features, not game controls
    const shortcuts = useMemo(() => [
        {
            section: t.modals.shortcuts.overlays, items: [
                { key: 'F1', description: t.modals.shortcuts.showHelp },
                { key: 'F3', description: t.modals.shortcuts.perfOverlay },
                { key: 'F4', description: t.modals.shortcuts.inputDisplay },
            ]
        },
        {
            section: t.modals.shortcuts.recording, items: [
                { key: 'F5', description: t.modals.shortcuts.toggleRec },
            ]
        },
        {
            section: t.settings.audio, items: [
                { key: 'F9', description: t.modals.shortcuts.toggleMute },
            ]
        },
    ], [t]);

    if (!isOpen) return null;

    return (
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="max-w-sm w-full mx-4 bg-black/95 border rounded-lg overflow-hidden"
                style={{ borderColor: `${systemColor}40` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: `${systemColor}20`, backgroundColor: `${systemColor}10` }}
                >
                    <div className="flex items-center gap-2">
                        <Keyboard size={18} style={{ color: systemColor }} />
                        <span className="font-bold text-white">{t.modals.shortcuts.playerShortcuts}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                        <X size={18} className="text-white/60 hover:text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                    {shortcuts.map(({ section, items }) => (
                        <div key={section}>
                            <h3
                                className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-60"
                                style={{ color: systemColor }}
                            >
                                {section}
                            </h3>
                            <div className="space-y-1">
                                {items.map(({ key, description }) => (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="text-white/70">{description}</span>
                                        <kbd
                                            className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                                            style={{
                                                backgroundColor: `${systemColor}20`,
                                                color: systemColor,
                                                border: `1px solid ${systemColor}40`,
                                            }}
                                        >
                                            {key}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Note about game controls */}
                    <div className="pt-2 border-t border-white/10 text-xs text-white/40">
                        Game controls can be configured in <strong className="text-white/60">{t.controls.keys}</strong> settings.
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-4 py-2 text-center text-xs text-white/40 border-t"
                    style={{ borderColor: `${systemColor}20` }}
                >
                    {t.modals.shortcuts.pressEsc}
                </div>
            </div>
        </div>
    );
});

export default ShortcutsModal;
