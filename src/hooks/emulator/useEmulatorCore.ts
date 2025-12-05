import { useState, useRef, useCallback, MutableRefObject, useEffect } from 'react';
import { Nostalgist } from 'nostalgist';
import { getCore } from '../../lib/emulator-cores';
import {
    KeyboardMapping,
    GamepadMapping,
    buildRetroArchConfig
} from '../../lib/controls';
import { EmulatorStatus, SpeedMultiplier, RetroAchievementsConfig } from './types';

interface UseEmulatorCoreProps {
    system: string;
    romUrl: string;
    core?: string;
    biosUrl?: string;
    initialState?: Blob | Uint8Array;
    getCanvasElement?: () => HTMLCanvasElement | null;
    keyboardControls?: KeyboardMapping;
    gamepadBindings?: GamepadMapping[];
    retroAchievements?: RetroAchievementsConfig;
    initialVolume?: number;
    onReady?: () => void;
    onError?: (error: Error) => void;
}

interface UseEmulatorCoreReturn {
    status: EmulatorStatus;
    setStatus: (status: EmulatorStatus) => void;
    error: string | null;
    isPaused: boolean;
    setIsPaused: (paused: boolean) => void;
    speed: SpeedMultiplier;
    nostalgistRef: MutableRefObject<Nostalgist | null>;

    prepare: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => void;
    restart: () => Promise<void>;
    pause: () => void;
    resume: () => void;
    togglePause: () => void;
    setSpeed: (multiplier: SpeedMultiplier) => void;
    screenshot: () => Promise<string | null>;
    resize: (size: { width: number; height: number }) => void;
    getNostalgistInstance: () => Nostalgist | null;
}

export function useEmulatorCore({
    system,
    romUrl,
    core: coreOverride,
    biosUrl,
    initialState,
    getCanvasElement,
    keyboardControls,
    gamepadBindings,
    retroAchievements,
    initialVolume = 100,
    onReady,
    onError,
}: UseEmulatorCoreProps): UseEmulatorCoreReturn {
    const [status, setStatus] = useState<EmulatorStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeedState] = useState<SpeedMultiplier>(1);
    const [isFastForwardOn, setIsFastForwardOn] = useState(false);

    const nostalgistRef = useRef<Nostalgist | null>(null);
    const isStartingRef = useRef(false); // Prevent double start

    // Prepare the emulator (load files without starting)
    const prepare = useCallback(async () => {
        if (!romUrl || !system) {
            console.warn('[Nostalgist] Missing romUrl or system');
            return;
        }

        // Already prepared
        if (nostalgistRef.current) {
            return;
        }

        try {
            setStatus('loading');
            setError(null);

            const core = coreOverride || getCore(system);

            // Build input configuration from custom controls
            const inputConfig = buildRetroArchConfig({
                keyboard: keyboardControls,
                gamepads: gamepadBindings,
            });

            // Convert volume percentage (0-100) to RetroArch dB format
            // RetroArch audio_volume: 0.0 dB = 100%, -20 dB ≈ 10%, -40 dB ≈ 1%
            // Formula: dB = 20 * log10(volume / 100)
            const volumeDb = initialVolume === 0 ? -80 : 20 * Math.log10(initialVolume / 100);

            // Get canvas element at prepare time (not hook initialization time)
            const canvasElement = getCanvasElement?.() || '';

            const prepareOptions: any = {
                core,
                rom: romUrl,
                bios: biosUrl,
                element: canvasElement,
                retroarchConfig: {
                    menu_driver: 'null',
                    rgui_show_start_screen: false,
                    video_font_enable: false,
                    input_menu_toggle_gamepad_combo: 0,
                    rewind_enable: true,
                    rewind_granularity: 1,
                    rewind_buffer_size: 100, // Reduced from 100 to save memory if needed, but 100 is standard
                    fast_forward_ratio: 2.0,
                    fast_forward_frameskip: 0,
                    audio_volume: volumeDb.toFixed(2), // Set initial volume in dB
                    // Enable volume control hotkeys (we'll trigger these programmatically)
                    input_volume_up: 'add',      // Numpad +
                    input_volume_down: 'subtract', // Numpad -
                    input_audio_mute: 'f9',      // F9 for mute toggle
                    // Apply custom input mappings
                    ...inputConfig,
                    // RetroAchievements
                    ...(retroAchievements ? {
                        cheevos_enable: true,
                        cheevos_username: retroAchievements.username,
                        cheevos_token: retroAchievements.token, // Use token instead of password for security
                        cheevos_hardcore_mode_enable: retroAchievements.hardcore ?? false,
                        cheevos_verbose_enable: true, // Enable verbose logging for debugging
                    } : {}),
                } as Record<string, unknown>,
            };

            // Handle initial state
            if (initialState) {
                if (initialState instanceof Blob) {
                    prepareOptions.state = initialState;
                } else {
                    // Convert Uint8Array to Blob if needed, or pass as is if Nostalgist supports it
                    // Nostalgist supports Blob for state
                    prepareOptions.state = new Blob([initialState as any]);
                }
            }

            const nostalgist = await Nostalgist.prepare(prepareOptions);

            nostalgistRef.current = nostalgist;
            setStatus('ready');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to prepare emulator';
            console.error('[Nostalgist] Prepare error:', err);
            setError(errorMessage);
            setStatus('error');
            onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
    }, [system, romUrl, coreOverride, biosUrl, initialState, getCanvasElement, keyboardControls, gamepadBindings, initialVolume, onError, retroAchievements]);

    // Start the emulator (must be called after prepare, ideally from user click)
    const start = useCallback(async () => {
        // Prevent double start
        if (isStartingRef.current) {
            console.log('[Nostalgist] Already starting');
            return;
        }

        // Wait for prepare if needed
        if (!nostalgistRef.current) {
            await prepare();
        }

        // Still no instance? Prepare failed or was cleaned up
        if (!nostalgistRef.current) {
            console.warn('[Nostalgist] No emulator instance available');
            return;
        }

        isStartingRef.current = true;

        try {
            setStatus('loading');

            await nostalgistRef.current.start();

            // Verify instance still exists after await
            if (!nostalgistRef.current) {
                isStartingRef.current = false;
                return;
            }

            setStatus('running');
            setIsPaused(false);

            onReady?.();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start emulator';
            console.error('[Nostalgist] Start error:', err);
            setError(errorMessage);
            setStatus('error');
            onError?.(err instanceof Error ? err : new Error(errorMessage));
        } finally {
            isStartingRef.current = false;
        }
    }, [prepare, onReady, onError]);

    // Stop the emulator
    const stop = useCallback(() => {
        if (nostalgistRef.current) {
            try {
                nostalgistRef.current.exit();
            } catch (err) {
                console.error('[Nostalgist] Exit error:', err);
            }
            nostalgistRef.current = null;
            isStartingRef.current = false;
            setStatus('idle');
            setIsPaused(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (nostalgistRef.current) {
                console.log('[Nostalgist] Cleaning up emulator on unmount');
                stop();
            }
        };
    }, [stop]);

    // Restart the emulator (soft reset)
    const restart = useCallback(async () => {
        if (nostalgistRef.current) {
            try {
                // Restart is synchronous but emulator needs time to process
                nostalgistRef.current.restart();

                // Small delay to let the emulator process the restart
                await new Promise(resolve => setTimeout(resolve, 100));

                // Ensure emulator is running after restart
                nostalgistRef.current.resume();
                setIsPaused(false);
                setStatus('running');
            } catch (err) {
                console.error('[Nostalgist] Restart error:', err);
                // If restart fails, try full stop and start
                stop();
                await start();
            }
        }
    }, [stop, start]);

    // Pause
    const pause = useCallback(() => {
        if (nostalgistRef.current && !isPaused) {
            try {
                nostalgistRef.current.pause();
                setIsPaused(true);
                setStatus('paused');
            } catch (err) {
                console.error('[Nostalgist] Pause error:', err);
            }
        }
    }, [isPaused]);

    // Resume - always attempt to resume, let the emulator handle if already running
    const resume = useCallback(() => {
        if (nostalgistRef.current) {
            try {
                nostalgistRef.current.resume();
                setIsPaused(false);
                setStatus('running');
            } catch (err) {
                console.error('[Nostalgist] Resume error:', err);
            }
        }
    }, []);

    // Toggle pause
    const togglePause = useCallback(() => {
        if (isPaused) {
            resume();
        } else {
            pause();
        }
    }, [isPaused, pause, resume]);

    // Set speed
    const setSpeed = useCallback((multiplier: SpeedMultiplier) => {
        if (!nostalgistRef.current) return;

        try {
            const nostalgist = nostalgistRef.current;

            if (typeof nostalgist.sendCommand === 'function') {
                // Simple toggle logic: only 1x and 2x supported
                if (multiplier === 2 && !isFastForwardOn) {
                    // Enable fast forward
                    nostalgist.sendCommand('FAST_FORWARD');
                    setIsFastForwardOn(true);
                } else if (multiplier === 1 && isFastForwardOn) {
                    // Disable fast forward
                    nostalgist.sendCommand('FAST_FORWARD');
                    setIsFastForwardOn(false);
                }

                setSpeedState(multiplier);
            } else {
                console.warn('[Nostalgist] sendCommand not available');
            }
        } catch (err) {
            console.error('[Nostalgist] Set speed error:', err);
        }
    }, [isFastForwardOn]);

    // Screenshot - use Nostalgist's official screenshot() method
    const screenshot = useCallback(async (): Promise<string | null> => {
        if (!nostalgistRef.current) {
            return null;
        }

        try {
            // Primary method: Use Nostalgist's official screenshot() API
            const screenshotBlob = await nostalgistRef.current.screenshot();

            if (screenshotBlob instanceof Blob) {
                // Convert Blob to data URL
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (reader.result) {
                            resolve(reader.result as string);
                        } else {
                            reject(new Error('FileReader result is null'));
                        }
                    };
                    reader.onerror = () => reject(new Error('FileReader error'));
                    reader.readAsDataURL(screenshotBlob);
                });
            }

            // Fallback: Try to get canvas directly
            const canvas =
                nostalgistRef.current.getCanvas?.() ||
                document.querySelector('.game-canvas-container canvas') as HTMLCanvasElement ||
                document.querySelector('canvas') as HTMLCanvasElement;

            if (canvas) {
                return canvas.toDataURL('image/png');
            }

            return null;
        } catch (err) {
            console.error('[Nostalgist] Screenshot error:', err);
            return null;
        }
    }, []);

    // Resize canvas using Nostalgist's resize API
    const resize = useCallback((size: { width: number; height: number }) => {
        if (!nostalgistRef.current) {
            console.warn('[Nostalgist] Cannot resize: emulator not ready');
            return;
        }
        try {
            nostalgistRef.current.resize(size);
        } catch (err) {
            console.error('[Nostalgist] Resize error:', err);
        }
    }, []);

    // Get raw Nostalgist instance (for advanced usage)
    const getNostalgistInstance = useCallback((): Nostalgist | null => {
        return nostalgistRef.current;
    }, []);

    return {
        status,
        setStatus,
        error,
        isPaused,
        setIsPaused,
        speed,
        nostalgistRef,
        prepare,
        start,
        stop,
        restart,
        pause,
        resume,
        togglePause,
        setSpeed,
        screenshot,
        resize,
        getNostalgistInstance,
    };
}
