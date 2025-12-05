'use client';

import { useState, useCallback, useEffect } from 'react';
import { loadVolume, saveVolume, loadMuteState, saveMuteState } from '../lib/game-player-utils';

export interface UseVolumeOptions {
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

export interface UseVolumeReturn {
    volume: number; // 0-100
    isMuted: boolean;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
}

/**
 * Hook to manage volume and mute state with localStorage persistence
 */
export function useVolume({
    setVolume: setVolumeInHook,
    toggleMute: toggleMuteInHook,
}: UseVolumeOptions): UseVolumeReturn {
    const [volume, setVolumeState] = useState(() => loadVolume());
    const [isMuted, setIsMutedState] = useState(() => loadMuteState());

    // Sync hook's internal volume state with our state on mount and when volume changes
    useEffect(() => {
        // Initialize hook's volume to match our loaded volume
        setVolumeInHook(volume);
    }, [setVolumeInHook]); // Sync when hook function is available

    const setVolume = useCallback((newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(100, newVolume));
        setVolumeState(clampedVolume);
        saveVolume(clampedVolume);
        setVolumeInHook(clampedVolume);
    }, [setVolumeInHook]);

    const toggleMute = useCallback(() => {
        setIsMutedState(prev => {
            const newMuted = !prev;
            saveMuteState(newMuted);
            toggleMuteInHook();
            return newMuted;
        });
    }, [toggleMuteInHook]);

    return {
        volume,
        isMuted,
        setVolume,
        toggleMute,
    };
}
