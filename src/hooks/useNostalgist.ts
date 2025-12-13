import { useCallback, useMemo } from 'react';
import { Nostalgist } from 'nostalgist';
import {
    KeyboardMapping,
    GamepadMapping,
} from '../lib/controls';
import { PERFORMANCE_TIER_2_SYSTEMS } from '../lib/systems';
import { useEmulatorCore } from './emulator/useEmulatorCore';
import { useEmulatorAudio } from './emulator/useEmulatorAudio';
import { useEmulatorInput } from './emulator/useEmulatorInput';
import { useEmulatorSaves } from './emulator/useEmulatorSaves';
import { useEmulatorCheats } from './emulator/useEmulatorCheats';
import { EmulatorStatus, SpeedMultiplier, RetroAchievementsConfig } from './emulator/types';

// Re-export types
export type { EmulatorStatus, SpeedMultiplier, RetroAchievementsConfig };

interface UseNostalgistOptions {
    system: string;
    romUrl: string;

    core?: string; // Core override
    biosUrl?: string | { url: string; name: string; location?: 'system' | 'rom_folder' }; // Custom BIOS URL
    initialState?: Blob | Uint8Array; // Initial save state
    getCanvasElement?: () => HTMLCanvasElement | null; // Function to get canvas element (must be in DOM before prepare)
    keyboardControls?: KeyboardMapping; // Custom keyboard mappings
    gamepadBindings?: GamepadMapping[]; // Custom gamepad mappings per player
    retroAchievements?: RetroAchievementsConfig;
    onReady?: () => void;
    onError?: (error: Error) => void;
    initialVolume?: number;
    romFileName?: string;
    shader?: string; // CRT shader preset (e.g., 'crt/crt-lottes')
    romId?: string;
}

export interface UseNostalgistReturn {
    status: EmulatorStatus;
    error: string | null;
    isPaused: boolean;
    speed: SpeedMultiplier;
    isRewinding: boolean;
    rewindBufferSize: number;
    volume: number; // 0-100
    isMuted: boolean;

    // Lifecycle
    prepare: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => void;
    restart: () => Promise<void>;

    // Playback
    pause: () => void;
    resume: () => void;
    togglePause: () => void;

    // Save/Load
    saveState: () => Promise<Uint8Array | null>;
    saveStateWithBlob: () => Promise<{ data: Uint8Array; blob: Blob } | null>;
    loadState: (state: Uint8Array) => Promise<boolean>;

    // Speed & Rewind
    setSpeed: (multiplier: SpeedMultiplier) => void;
    startRewind: () => void;
    stopRewind: () => void;
    rewindEnabled: boolean;

    // Volume
    setVolume: (volume: number) => void;
    toggleMute: () => void;

    // Utils
    screenshot: () => Promise<string | null>;
    pressKey: (key: string) => void;
    resize: (size: { width: number; height: number }) => void;

    // Cheats
    applyCheat: (code: string) => void;
    resetCheats: () => void;

    // RetroAchievements integration - get access to emulator internals
    getNostalgistInstance: () => Nostalgist | null;
    isPerformanceMode: boolean;
}

export const useNostalgist = ({
    system,
    romUrl,
    core,
    biosUrl,
    initialState,
    getCanvasElement,
    keyboardControls,
    gamepadBindings,
    retroAchievements,
    onReady,
    onError,
    initialVolume = 100,
    romFileName,
    shader,
    romId,
}: UseNostalgistOptions): UseNostalgistReturn => {
    // 0. System Analysis
    // Check if system is heavy (Tier 2) to disable expensive features like manual rewind capture
    const isHeavySystem = useMemo(() => {
        return PERFORMANCE_TIER_2_SYSTEMS.has(system.toUpperCase());
    }, [system]);

    // 1. Core Emulator Logic (Lifecycle, Status, Canvas)
    const {
        status,
        setStatus,
        error,
        isPaused,
        setIsPaused,
        speed,
        nostalgistRef,
        prepare,
        start: coreStart,
        stop: coreStop,
        restart,
        pause,
        resume,
        togglePause,
        setSpeed,
        screenshot,
        resize,
        getNostalgistInstance,
        isPerformanceMode,
    } = useEmulatorCore({
        system,
        romUrl,
        romId,
        core,
        biosUrl,
        initialState,
        getCanvasElement,
        keyboardControls,
        gamepadBindings,
        retroAchievements,
        initialVolume,
        romFileName,
        shader,
        onReady,
        onError,
    });

    // 2. Audio Logic (Volume, Mute)
    const {
        volume,
        isMuted,
        setVolume,
        toggleMute,
    } = useEmulatorAudio({
        nostalgistRef,
        initialVolume,
    });

    // 3. Input Logic (Press Key)
    const {
        pressKey,
    } = useEmulatorInput({
        nostalgistRef,
    });

    // 4. Saves Logic (Save/Load, Rewind)
    const {
        isRewinding,
        rewindBufferSize,
        saveState,
        saveStateWithBlob,
        loadState,
        startRewind,
        stopRewind,
        startRewindCapture,
        stopRewindCapture,
    } = useEmulatorSaves({
        nostalgistRef,
        isPaused,
        setIsPaused,
        setStatus,
        rewindEnabled: !isHeavySystem, // Disable manual rewind loop for heavy systems
    });

    // 5. Cheats Logic
    const {
        applyCheat,
        resetCheats,
    } = useEmulatorCheats({
        nostalgistRef,
    });

    // Wrapped Start - coordinates core start with rewind capture
    const start = useCallback(async () => {
        await coreStart();

        // Start rewind capture after a delay if start was successful
        // We check nostalgistRef.current to ensure it's running
        setTimeout(() => {
            if (nostalgistRef.current) {
                startRewindCapture();
            }
        }, 2000);
    }, [coreStart, startRewindCapture, nostalgistRef]);

    // Wrapped Stop - coordinates core stop with rewind cleanup
    const stop = useCallback(() => {
        stopRewindCapture();
        coreStop();
    }, [stopRewindCapture, coreStop]);

    // Memoize the return object to prevent unnecessary re-renders in parents
    const hookReturn = useMemo((): UseNostalgistReturn => ({
        status,
        error,
        isPaused,
        speed,
        isRewinding,
        rewindBufferSize,
        volume,
        isMuted,

        prepare,
        start,
        stop,
        restart,

        pause,
        resume,
        togglePause,

        saveState,
        saveStateWithBlob,
        loadState,

        setSpeed,
        startRewind,
        stopRewind,
        rewindEnabled: !isHeavySystem,

        setVolume,
        toggleMute,

        screenshot,
        pressKey,
        resize,

        applyCheat,
        resetCheats,

        getNostalgistInstance,
        isPerformanceMode,
    }), [
        status, error, isPaused, speed, isRewinding, rewindBufferSize, volume, isMuted,
        prepare, start, stop, restart,
        pause, resume, togglePause,
        saveState, saveStateWithBlob, loadState,
        setSpeed, startRewind, stopRewind,
        isHeavySystem,
        setVolume, toggleMute,
        screenshot, pressKey, resize,
        applyCheat, resetCheats,
        getNostalgistInstance,
        isPerformanceMode
    ]);

    return hookReturn;
};
