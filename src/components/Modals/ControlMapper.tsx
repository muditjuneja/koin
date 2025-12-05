'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Gamepad2, RotateCcw, Check } from 'lucide-react';
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
    const [localControls, setLocalControls] = useState<KeyboardMapping>(controls);
    const [listeningFor, setListeningFor] = useState<ButtonId | null>(null);

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

    useEffect(() => {
        if (!isOpen) {
            setListeningFor(null);
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (!listeningFor) return;

            e.preventDefault();
            e.stopPropagation();

            // Don't allow Escape as a control
            if (e.code === 'Escape') {
                setListeningFor(null);
                return;
            }

            setLocalControls((prev) => ({
                ...prev,
                [listeningFor]: e.code,
            }));
            setListeningFor(null);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, listeningFor]);

    const handleReset = () => {
        setLocalControls(defaultControls);
    };

    const handleSave = () => {
        onSave(localControls);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-retro-primary/30 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
                    <div className="flex items-center gap-3">
                        <Gamepad2 className="text-retro-primary" size={24} />
                        <div>
                            <h2 className="text-lg font-bold text-white">Control Mapping</h2>
                            <p className="text-xs text-gray-400">
                                Click a button and press a key to remap
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
                                        onClick={() => setListeningFor(btn)}
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
                                            {listeningFor === btn ? 'Press...' : formatKeyCode(localControls[btn] || '')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-black/30 border-t border-white/10">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <RotateCcw size={16} />
                        Reset to Default
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-retro-primary text-black font-bold text-sm hover:bg-retro-primary/90 transition-colors"
                    >
                        <Check size={16} />
                        Save Controls
                    </button>
                </div>
            </div>
        </div>
    );
}
