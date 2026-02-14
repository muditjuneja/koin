'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GamepadInfo, ControllerBrand, STANDARD_GAMEPAD_BUTTONS } from '../lib/controls';

// Re-export types for convenience
export type { GamepadInfo, ControllerBrand };
export { STANDARD_GAMEPAD_BUTTONS };

/**
 * Get a clean display name from gamepad id
 */
function getDisplayName(id: string): string {
    // Common patterns to clean up
    // e.g., "Xbox 360 Controller (XInput STANDARD GAMEPAD)" -> "Xbox 360 Controller"
    // e.g., "054c-0ce6-Sony Interactive Entertainment DualSense" -> "DualSense"

    let name = id;

    // Remove vendor/product ID prefix (e.g., "054c-0ce6-")
    name = name.replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '');

    // Remove common suffixes
    name = name.replace(/\s*\(.*\)\s*$/i, '');
    name = name.replace(/\s*STANDARD GAMEPAD\s*/i, '');

    // Clean up specific controller names
    if (/xbox/i.test(name)) {
        if (/series/i.test(name)) return 'Xbox Series Controller';
        if (/one/i.test(name)) return 'Xbox One Controller';
        if (/360/i.test(name)) return 'Xbox 360 Controller';
        return 'Xbox Controller';
    }

    if (/dualsense/i.test(name)) return 'DualSense';
    if (/dualshock\s*4/i.test(name)) return 'DualShock 4';
    if (/dualshock/i.test(name)) return 'DualShock';
    if (/playstation/i.test(name) || /sony/i.test(name)) return 'PlayStation Controller';

    if (/pro\s*controller/i.test(name)) return 'Switch Pro Controller';
    if (/joy-?con/i.test(name)) return 'Joy-Con';
    if (/nintendo/i.test(name)) return 'Nintendo Controller';

    // Fallback: return cleaned name or generic
    return name.trim() || 'Gamepad';
}

/**
 * Detect controller brand from gamepad id for UI theming
 */
export function detectControllerBrand(id: string): ControllerBrand {
    const lowerId = id.toLowerCase();

    if (/xbox|xinput|microsoft/i.test(lowerId)) return 'xbox';
    if (/playstation|sony|dualshock|dualsense/i.test(lowerId)) return 'playstation';
    if (/nintendo|switch|joy-?con|pro controller/i.test(lowerId)) return 'nintendo';

    return 'generic';
}

/**
 * Convert raw Gamepad to GamepadInfo
 */
function toGamepadInfo(gamepad: Gamepad): GamepadInfo {
    return {
        index: gamepad.index,
        id: gamepad.id,
        name: getDisplayName(gamepad.id),
        connected: gamepad.connected,
        buttons: gamepad.buttons.length,
        axes: gamepad.axes.length,
        mapping: gamepad.mapping,
    };
}

export interface UseGamepadOptions {
    /** Callback when a gamepad connects */
    onConnect?: (gamepad: GamepadInfo) => void;
    /** Callback when a gamepad disconnects */
    onDisconnect?: () => void;
}

export interface UseGamepadReturn {
    /** Array of connected gamepads (up to 4) */
    gamepads: GamepadInfo[];
    /** Whether any gamepad is connected */
    isAnyConnected: boolean;
    /** Number of connected gamepads */
    connectedCount: number;
    /** Get raw gamepad by index for reading button states */
    getRawGamepad: (index: number) => Gamepad | null;
    /** Force refresh gamepad list */
    refresh: () => void;
}

/**
 * Hook to track connected gamepads
 * Uses requestAnimationFrame polling since Gamepad API requires active polling
 * 
 * NOTE: Browsers require a button press before reporting gamepads (security feature)
 */
export function useGamepad(options?: UseGamepadOptions): UseGamepadReturn {
    const { onConnect, onDisconnect } = options || {};
    const [gamepads, setGamepads] = useState<GamepadInfo[]>([]);
    const gamepadsRef = useRef<GamepadInfo[]>([]); // Current state ref for stale-closure-safe comparison
    const rafRef = useRef<number | null>(null);
    const prevCountRef = useRef<number>(0);

    // Store callbacks in refs to avoid re-running effect when they change
    const onConnectRef = useRef(onConnect);
    const onDisconnectRef = useRef(onDisconnect);

    // Update refs when callbacks change
    useEffect(() => {
        onConnectRef.current = onConnect;
        onDisconnectRef.current = onDisconnect;
    }, [onConnect, onDisconnect]);

    // Get current gamepad state
    const getGamepads = useCallback((): GamepadInfo[] => {
        if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
            return [];
        }

        const rawGamepads = navigator.getGamepads() ?? [];
        const connected: GamepadInfo[] = [];

        for (let i = 0; i < rawGamepads.length; i++) {
            const gp = rawGamepads[i];
            if (gp && gp.connected) {
                connected.push(toGamepadInfo(gp));
            }
        }

        return connected;
    }, []);

    // Get raw gamepad for button state reading
    const getRawGamepad = useCallback((index: number): Gamepad | null => {
        const rawGamepads = navigator.getGamepads?.() ?? [];
        return rawGamepads[index] ?? null;
    }, []);

    // Refresh function
    const refresh = useCallback(() => {
        // Force refresh
        setGamepads(getGamepads());
    }, [getGamepads]);

    // Polling loop - only update state when connections change
    useEffect(() => {
        // Check if we're in browser and Gamepad API is supported
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return;
        }

        if (typeof navigator.getGamepads !== 'function') {
            console.warn('[useGamepad] Gamepad API not supported in this browser');
            return;
        }

        let isActive = true;

        const poll = () => {
            if (!isActive) return;

            const current = getGamepads();
            // Create a simple state signature to compare
            // Optimized comparison: check length first, then IDs
            // Allocating strings every frame is expensive
            let hasChanged = current.length !== prevCountRef.current;

            if (!hasChanged) {
                // Deep check only if counts match
                // Use ref instead of state to avoid stale closure
                const prev = gamepadsRef.current;
                for (let i = 0; i < current.length; i++) {
                    const saved = prev[i];
                    if (!saved || saved.id !== current[i].id || saved.connected !== current[i].connected) {
                        hasChanged = true;
                        break;
                    }
                }
            }

            if (hasChanged) {
                const prevCount = prevCountRef.current;
                const currentCount = current.length;

                // Detect connection/disconnection logic remains same
                if (currentCount > prevCount && prevCount >= 0 && onConnectRef.current) {
                    const newGamepad = current[current.length - 1];
                    onConnectRef.current(newGamepad);
                } else if (currentCount < prevCount && prevCount > 0 && onDisconnectRef.current) {
                    onDisconnectRef.current();
                }

                prevCountRef.current = currentCount;
                gamepadsRef.current = current;
                setGamepads(current);
            }

            rafRef.current = requestAnimationFrame(poll);
        };

        // Handle connect/disconnect events
        const handleConnect = (e: GamepadEvent) => {
            console.log('[useGamepad] 🎮 Gamepad connected:', e.gamepad.id);
            // Force immediate update
            const current = getGamepads();
            const prevCount = prevCountRef.current;
            prevCountRef.current = current.length;
            gamepadsRef.current = current;

            setGamepads(current);

            // Trigger callback if provided
            if (onConnectRef.current && current.length > prevCount) {
                const newGamepad = current[current.length - 1];
                onConnectRef.current(newGamepad);
            }
        };

        const handleDisconnect = (e: GamepadEvent) => {
            console.log('[useGamepad] 🎮 Gamepad disconnected:', e.gamepad.id);
            // Force immediate update
            const current = getGamepads();
            const prevCount = prevCountRef.current;
            prevCountRef.current = current.length;
            gamepadsRef.current = current;

            setGamepads(current);

            // Trigger callback if provided
            if (onDisconnectRef.current && current.length < prevCount) {
                onDisconnectRef.current();
            }
        };

        window.addEventListener('gamepadconnected', handleConnect);
        window.addEventListener('gamepaddisconnected', handleDisconnect);

        // Start polling
        rafRef.current = requestAnimationFrame(poll);

        // Initial check - gamepads may already be connected
        const initial = getGamepads();
        if (initial.length > 0) {
            console.log('[useGamepad] Initial gamepads found:', initial.map(g => g.name).join(', '));
            prevCountRef.current = initial.length;
            gamepadsRef.current = initial;
            setGamepads(initial);
        } else {
            prevCountRef.current = 0;
        }

        return () => {
            isActive = false;
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            window.removeEventListener('gamepadconnected', handleConnect);
            window.removeEventListener('gamepaddisconnected', handleDisconnect);
        };
    }, [getGamepads]); // Callbacks are stored in refs, so they don't need to be in deps

    return {
        gamepads,
        isAnyConnected: gamepads.length > 0,
        connectedCount: gamepads.length,
        getRawGamepad,
        refresh,
    };
}

/**
 * Standard gamepad axis indices
 */
export const STANDARD_AXIS_MAP = {
    leftStickX: 0,
    leftStickY: 1,
    rightStickX: 2,
    rightStickY: 3,
} as const;

export type StandardAxis = keyof typeof STANDARD_AXIS_MAP;
