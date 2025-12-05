'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    KeyboardMapping,
    loadKeyboardMapping,
    saveKeyboardMapping,
    getConsoleKeyboardDefaults,
} from '../lib/controls';
import { ToastType } from './useToast';

export interface UseControlsReturn {
    controls: KeyboardMapping;
    saveControls: (newControls: KeyboardMapping) => void;
    resetToDefaults: () => void;
}

/**
 * Hook for managing keyboard controls
 * Loads/saves per-system mappings from localStorage
 */
export function useControls(
    system?: string,
    onNotify?: (message: string, type?: ToastType) => void
): UseControlsReturn {
    // Get default controls for this system
    const defaultControls = getConsoleKeyboardDefaults(system || 'SNES');

    // Initialize with loaded controls
    const [controls, setControls] = useState<KeyboardMapping>(() => {
        if (typeof window !== 'undefined') {
            return loadKeyboardMapping(system);
        }
        return defaultControls;
    });

    // Reload when system changes
    useEffect(() => {
        const loaded = loadKeyboardMapping(system);
        setControls(loaded);
    }, [system]);

    const saveControls = useCallback((newControls: KeyboardMapping) => {
        setControls(newControls);
        saveKeyboardMapping(newControls, system);
        onNotify?.('Controls saved', 'success');
    }, [system, onNotify]);

    const resetToDefaults = useCallback(() => {
        setControls(defaultControls);
        saveKeyboardMapping(defaultControls, system);
        onNotify?.('Controls reset to defaults', 'info');
    }, [defaultControls, system, onNotify]);

    return {
        controls,
        saveControls,
        resetToDefaults,
    };
}
