'use client';

import { useState, useEffect, useMemo } from 'react';
import { Gamepad2, RotateCcw, Check } from 'lucide-react';
import { ControlMapperProps } from '../types';
import {
    KeyboardMapping,
    ButtonId,
    BUTTON_LABELS,
    BUTTON_GROUPS,
    formatKeyCode,
    getConsoleButtons,
    getConsoleKeyboardDefaults,
} from '../../lib/controls';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import { useInputCapture } from '../../hooks/useInputCapture';
import ModalShell from './ModalShell';

// Filter control groups to only show buttons available for this system
function getFilteredGroups(activeButtons: ButtonId[]) {
    return BUTTON_GROUPS.map(group => ({
        ...group,
        buttons: group.buttons.filter(btn => activeButtons.includes(btn))
    })).filter(group => group.buttons.length > 0);
}

export default function ControlMapper({
    isOpen,
    controls,
    onSave,
    onClose,
    system,
}: ControlMapperProps) {
    const t = useKoinTranslation();
    const [localControls, setLocalControls] = useState<KeyboardMapping>(controls);

    // Use shared input capture hook for listening state
    const { listeningFor, startListening, stopListening, isListening } = useInputCapture<ButtonId>({
        isOpen,
        onClose,
    });

    // Get active buttons for this system
    const activeButtons = useMemo(() => {
        return getConsoleButtons(system || 'SNES');
    }, [system]);

    // Filter control groups to only show buttons available for this system
    const controlGroups = useMemo(() => {
        return getFilteredGroups(activeButtons);
    }, [activeButtons]);

    // Get default controls for this system
    const defaultControls = useMemo(() => {
        return getConsoleKeyboardDefaults(system || 'SNES');
    }, [system]);

    // Sync localControls with controls prop when modal opens or controls change
    useEffect(() => {
        if (isOpen) {
            setLocalControls(controls);
        }
    }, [isOpen, controls]);

    // Capture keyboard input when listening (separate from Escape handling in hook)
    useEffect(() => {
        if (!isOpen || !listeningFor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape is handled by useInputCapture
            if (e.code === 'Escape') return;

            e.preventDefault();
            e.stopPropagation();

            setLocalControls((prev) => ({
                ...prev,
                [listeningFor]: e.code,
            }));
            stopListening();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, listeningFor, stopListening]);

    const handleReset = () => {
        setLocalControls(defaultControls);
    };

    const handleSave = () => {
        onSave(localControls);
        onClose();
    };

    return (
        <ModalShell
            isOpen={isOpen}
            onClose={onClose}
            title={t.modals.controls.title}
            subtitle={t.modals.controls.description}
            icon={<Gamepad2 className="text-retro-primary" size={24} />}
            closeOnBackdrop={!isListening}
            footer={
                <>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RotateCcw size={16} />
                        {t.modals.controls.reset}
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-retro-primary text-black font-bold text-sm hover:bg-retro-primary/90 transition-colors"
                    >
                        <Check size={16} />
                        {t.modals.controls.save}
                    </button>
                </>
            }
        >
            {/* Controls Grid */}
            <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                {controlGroups.map((group) => (
                    <div key={group.label}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {group.label}
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {group.buttons.map((btn) => (
                                <button
                                    key={btn}
                                    onClick={() => startListening(btn)}
                                    className={`
                                        flex items-center justify-between px-4 py-3 rounded-lg border transition-all
                                        ${listeningFor === btn
                                            ? 'border-retro-primary bg-retro-primary/20 ring-2 ring-retro-primary/50'
                                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                        }
                                    `}
                                >
                                    <span className="text-sm text-gray-300">
                                        {BUTTON_LABELS[btn]}
                                    </span>
                                    <span
                                        className={`
                                            px-2 py-1 rounded text-xs font-mono
                                            ${listeningFor === btn
                                                ? 'bg-retro-primary/30 text-retro-primary animate-pulse'
                                                : 'bg-black/50 text-white'
                                            }
                                        `}
                                    >
                                        {listeningFor === btn ? t.modals.controls.pressKey : formatKeyCode(localControls[btn] || '')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </ModalShell>
    );
}
