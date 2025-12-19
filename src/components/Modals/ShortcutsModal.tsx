'use client';

import { memo, useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import ModalShell from './ModalShell';

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

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={t.modals.shortcuts.playerShortcuts}
            icon={<Keyboard size={20} style={{ color: systemColor }} />}
            maxWidth="sm"
            systemColor={systemColor}
            footer={
                <span className="text-xs text-gray-500 w-full text-center">
                    {t.modals.shortcuts.pressEsc}
                </span>
            }
        >
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
        </ModalShell>
    );
});

export default ShortcutsModal;

