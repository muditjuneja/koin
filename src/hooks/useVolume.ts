'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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
    const lastSyncedVolumeRef = useRef<number | null>(null);

    useEffect(() => {
        // Initialize hook's volume to match our loaded volume
        if (lastSyncedVolumeRef.current !== volume) {
            lastSyncedVolumeRef.current = volume;
            setVolumeInHook(volume);
        }
    }, [setVolumeInHook, volume]);

    const setVolume = useCallback((newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(100, newVolume));
        lastSyncedVolumeRef.current = clampedVolume;
        setVolumeState(clampedVolume);
        saveVolume(clampedVolume);
        setVolumeInHook(clampedVolume);
    }, [setVolumeInHook]);


    const toggleMute = useCallback(() => {
        setIsMutedState(prev => {
            const newMuted = !prev;
            saveMuteState(newMuted);
            // Schedule side effect AFTER state update completes
            setTimeout(() => toggleMuteInHook(), 0);
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
