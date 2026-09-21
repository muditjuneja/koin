'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShaderPresetId } from '../lib/shader-presets';

const STORAGE_KEY = 'koin-player-settings';

export interface PlayerSettings {
    volume: number;
    muted: boolean;
    shader: ShaderPresetId;
    showPerformanceOverlay: boolean;
    showInputDisplay: boolean;
    hapticsEnabled: boolean;
}

const DEFAULT_SETTINGS: PlayerSettings = {
    volume: 1,
    muted: false,
    shader: '',
    showPerformanceOverlay: false,
    showInputDisplay: false,
    hapticsEnabled: true,
};

/**
 * Hook to manage persistent player settings (Volume, Shader, Overlays)
 * Synchronizes with localStorage and optional external callback.
 */
export function usePlayerPersistence(
    onSettingsChange?: (settings: PlayerSettings) => void
) {
    // Initialize state function to avoid hydration mismatch if possible, 
    // but for localStorage we usually need useEffect or a specific strategy.
    // For simplicity, we start with defaults and load in effect.
    const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    const onSettingsChangeRef = useRef(onSettingsChange);
    useEffect(() => {
        onSettingsChangeRef.current = onSettingsChange;
    }, [onSettingsChange]);

    const callbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (callbackTimeoutRef.current) clearTimeout(callbackTimeoutRef.current);
        };
    }, []);

    // Load from storage on mount
    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setSettings(prev => ({ ...prev, ...parsed }));
                }
            }
        } catch (e) {
            console.error('Failed to load player settings', e);
        }
        setIsLoaded(true);
    }, []);

    // Save to storage whenever settings change
    const updateSettings = useCallback((updates: Partial<PlayerSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...updates };

            // Persist
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                }
            } catch (e) {
                console.error('Failed to save player settings', e);
            }

            // Schedule callback AFTER state update completes
            if (onSettingsChangeRef.current) {
                if (callbackTimeoutRef.current) clearTimeout(callbackTimeoutRef.current);
                callbackTimeoutRef.current = setTimeout(() => {
                    onSettingsChangeRef.current?.(next);
                }, 0);
            }

            return next;
        });
    }, []);

    return {
        settings,
        isLoaded,
        updateSettings,
    };
}
