'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Joystick, RotateCcw, Check, User } from 'lucide-react';
import { GamepadInfo, detectControllerBrand, STANDARD_GAMEPAD_BUTTONS } from '../../hooks/useGamepad';
import {
    GamepadMapping,
    ButtonId,
    PlayerIndex,
    BUTTON_LABELS,
    BUTTON_GROUPS,
    DEFAULT_GAMEPAD,
    loadGamepadMapping,
    saveGamepadMapping,
    formatGamepadButton,
} from '../../lib/controls';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

export interface GamepadMapperProps {
    isOpen: boolean;
    gamepads: GamepadInfo[];
    onClose: () => void;
    onSave?: (bindings: GamepadMapping, playerIndex: number) => void;
    systemColor?: string;
}

export default function GamepadMapper({
    isOpen,
    gamepads,
    onClose,
    onSave,
    systemColor = '#00FF41',
}: GamepadMapperProps) {
    const t = useKoinTranslation();
    // Selected player for remapping (1-indexed)
    const [selectedPlayer, setSelectedPlayer] = useState(1);

    // Local bindings state (per-player)
    const [bindings, setBindings] = useState<Record<number, GamepadMapping>>({});

    // Which button we're listening for
    const [listeningFor, setListeningFor] = useState<ButtonId | null>(null);

    // Animation frame ref for gamepad polling
    const rafRef = useRef<number | null>(null);

    // Load bindings for all connected players when modal opens
    useEffect(() => {
        if (isOpen) {
            const loadedBindings: Record<number, GamepadMapping> = {};
            for (let i = 1; i <= 4; i++) {
                loadedBindings[i] = loadGamepadMapping(i as PlayerIndex);
            }
            setBindings(loadedBindings);

            // Select first connected gamepad's player
            if (gamepads.length > 0) {
                setSelectedPlayer(gamepads[0].index + 1);
            }
        }
    }, [isOpen, gamepads]);

    // Poll gamepad for button presses when listening
    useEffect(() => {
        if (!isOpen || !listeningFor) {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            return;
        }

        const poll = () => {
            const rawGamepads = navigator.getGamepads?.() ?? [];
            const gamepad = rawGamepads[selectedPlayer - 1];

            if (gamepad) {
                // Check for any button press
                for (let i = 0; i < gamepad.buttons.length; i++) {
                    if (gamepad.buttons[i].pressed) {
                        // Found a pressed button - map it
                        setBindings(prev => ({
                            ...prev,
                            [selectedPlayer]: {
                                ...prev[selectedPlayer],
                                [listeningFor]: i,
                            }
                        }));
                        setListeningFor(null);
                        return; // Stop polling
                    }
                }
            }

            rafRef.current = requestAnimationFrame(poll);
        };

        rafRef.current = requestAnimationFrame(poll);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isOpen, listeningFor, selectedPlayer]);

    // Handle keyboard escape to cancel listening
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape') {
                if (listeningFor) {
                    setListeningFor(null);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, listeningFor, onClose]);

    const handleReset = () => {
        setBindings(prev => ({
            ...prev,
            [selectedPlayer]: { ...DEFAULT_GAMEPAD },
        }));
    };

    const handleSave = () => {
        // Save bindings for all players
        Object.entries(bindings).forEach(([player, playerBindings]) => {
            const playerIdx = parseInt(player) as PlayerIndex;
            saveGamepadMapping(playerBindings, playerIdx);
        });
        onSave?.(bindings[selectedPlayer], selectedPlayer);
        onClose();
    };

    if (!isOpen) return null;

    const currentBindings = bindings[selectedPlayer] ?? DEFAULT_GAMEPAD;
    const currentGamepad = gamepads.find(g => g.index === selectedPlayer - 1);
    const brand = currentGamepad ? detectControllerBrand(currentGamepad.id) : 'generic';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => !listeningFor && onClose()}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-retro-primary/30 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
                    <div className="flex items-center gap-3">
                        <Joystick className="text-retro-primary" size={24} style={{ color: systemColor }} />
                        <div>
                            <h2 className="text-lg font-bold text-white">{t.modals.gamepad.title}</h2>
                            <p className="text-xs text-gray-400">
                                {gamepads.length > 0
                                    ? t.modals.gamepad.connected.replace('{{count}}', gamepads.length.toString())
                                    : t.modals.gamepad.none}
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

                {/* Player selector (if multiple gamepads) */}
                {gamepads.length > 1 && (
                    <div className="px-6 py-3 border-b border-white/10 bg-black/30">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium">{t.modals.gamepad.player}</span>
                            <div className="flex gap-1">
                                {gamepads.map((gp) => (
                                    <button
                                        key={gp.index}
                                        onClick={() => setSelectedPlayer(gp.index + 1)}
                                        className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${selectedPlayer === gp.index + 1
                                                ? 'bg-retro-primary/20 text-retro-primary'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                            }
                    `}
                                        style={selectedPlayer === gp.index + 1 ? {
                                            backgroundColor: `${systemColor}20`,
                                            color: systemColor
                                        } : {}}
                                    >
                                        <User size={14} />
                                        P{gp.index + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {currentGamepad && (
                            <p className="text-xs text-gray-500 mt-1">
                                {currentGamepad.name}
                            </p>
                        )}
                    </div>
                )}

                {/* Single gamepad info */}
                {gamepads.length === 1 && currentGamepad && (
                    <div className="px-6 py-2 border-b border-white/10 bg-black/30">
                        <p className="text-xs text-gray-400">
                            {currentGamepad.name} • Player 1
                        </p>
                    </div>
                )}

                {/* No gamepads warning */}
                {gamepads.length === 0 && (
                    <div className="px-6 py-10 text-center">
                        <div className="relative inline-block mb-4">
                            <Joystick size={56} className="text-gray-600 animate-pulse" />
                            {/* Animated ring */}
                            <div className="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-gray-600 animate-spin" style={{ animationDuration: '8s' }} />
                        </div>
                        <p className="text-gray-300 font-medium mb-2">{t.modals.gamepad.noController}</p>
                        <p className="text-sm text-gray-500 mb-4">
                            {t.modals.gamepad.pressAny}
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                            <span className="text-xs text-gray-400">{t.modals.gamepad.waiting}</span>
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Button mapping grid */}
                {gamepads.length > 0 && (
                    <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                        {listeningFor && (
                            <div className="p-4 rounded-lg bg-black/50 border border-retro-primary/50 text-center animate-pulse" style={{ borderColor: `${systemColor}50` }}>
                                <p className="text-sm text-white mb-1">
                                    {t.modals.gamepad.pressButton.replace('{{button}}', BUTTON_LABELS[listeningFor])}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {t.modals.gamepad.pressEsc}
                                </p>
                            </div>
                        )}

                        {BUTTON_GROUPS.map((group) => (
                            <div key={group.label}>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    {group.label}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.buttons.map((btn) => (
                                        <button
                                            key={btn}
                                            onClick={() => setListeningFor(btn)}
                                            disabled={!!listeningFor && listeningFor !== btn}
                                            className={`
                        flex items-center justify-between px-4 py-3 rounded-lg border transition-all
                        disabled:opacity-50
                        ${listeningFor === btn
                                                    ? 'border-retro-primary bg-retro-primary/20 ring-2 ring-retro-primary/50'
                                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                                }
                      `}
                                            style={listeningFor === btn ? {
                                                borderColor: systemColor,
                                                backgroundColor: `${systemColor}20`,
                                                boxShadow: `0 0 0 2px ${systemColor}50`,
                                            } : {}}
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
                                                style={listeningFor === btn ? {
                                                    backgroundColor: `${systemColor}30`,
                                                    color: systemColor,
                                                } : {}}
                                            >
                                                {listeningFor === btn ? t.controls.press : formatGamepadButton(currentBindings[btn])}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                {gamepads.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 bg-black/30 border-t border-white/10">
                        <button
                            onClick={handleReset}
                            disabled={!!listeningFor}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={16} />
                            {t.modals.gamepad.reset}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!!listeningFor}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-retro-primary text-black font-bold text-sm hover:bg-retro-primary/90 transition-colors disabled:opacity-50"
                            style={{ backgroundColor: systemColor }}
                        >
                            <Check size={16} />
                            {t.modals.gamepad.save}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
