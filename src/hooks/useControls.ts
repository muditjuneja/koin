'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    KeyboardMapping,
    loadKeyboardMapping,
    saveKeyboardMapping,
    getConsoleKeyboardDefaults,
} from '../lib/controls';
import { ToastType } from './useToast';
import { useKoinTranslation } from './useKoinTranslation';

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
    const t = useKoinTranslation();
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
        onNotify?.(t.notifications.controlsSaved, 'success');
    }, [system, onNotify, t]);

    const resetToDefaults = useCallback(() => {
        setControls(defaultControls);
        saveKeyboardMapping(defaultControls, system);
        onNotify?.(t.notifications.controlsReset, 'info');
    }, [defaultControls, system, onNotify, t]);

    return {
        controls,
        saveControls,
        resetToDefaults,
    };
}
