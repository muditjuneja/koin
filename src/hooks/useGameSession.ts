import { useState, useMemo, useEffect, RefObject } from 'react';
import { useNostalgist } from './useNostalgist';
import { useKoinTranslation } from './useKoinTranslation';
import { useGamepad } from './useGamepad';
import { useVolume } from './useVolume';
import { useControls } from './useControls';
import { suppressEmulatorWarnings } from '../lib/game-player-utils';
import { GamePlayerProps } from '../components/types';

interface UseGameSessionProps extends GamePlayerProps {
    canvasRef: RefObject<HTMLCanvasElement>;
    showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning' | 'gamepad', options?: any) => void;
}

export function useGameSession(props: UseGameSessionProps) {
    const {
        romUrl,
        romId,
        romFileName,
        system,
        core,
        biosUrl,
        initialSaveState,
        retroAchievementsConfig,
        onSessionStart,
        onSessionEnd,
        onReady,
        onError,
        canvasRef,
        showToast,
    } = props;

    const t = useKoinTranslation();

    // Controls management
    const { controls, saveControls } = useControls(system, showToast);

    // Modals state
    const [gamepadModalOpen, setGamepadModalOpen] = useState(false);
    const [controlsModalOpen, setControlsModalOpen] = useState(false);

    // Gamepad detection
    const { gamepads, connectedCount } = useGamepad({
        onConnect: (gamepad) => {
            showToast(
                gamepad.name || t.notifications.controllerReady,
                'gamepad',
                {
                    title: t.notifications.controllerConnected,
                    duration: 4000,
                    action: {
                        label: 'Configure',
                        onClick: () => setGamepadModalOpen(true),
                    },
                }
            );
        },
        onDisconnect: () => {
            showToast(
                t.notifications.controllerDisconnected,
                'warning',
                {
                    title: t.notifications.controllerDisconnected, // Title repeats or generic? Using same for now
                    duration: 3000,
                }
            );
        },
    });

    // Load gamepad bindings
    const gamepadBindings = useMemo(() => {
        // We need to implement loadGamepadMapping in useControls or similar
        // For now, passing empty array or implementing a simple loader
        return [];
    }, [gamepads.length]);

    // Emulator state
    const nostalgist = useNostalgist({
        system,
        romUrl,
        romId,
        romFileName,
        core,
        biosUrl,
        initialState: initialSaveState,
        getCanvasElement: () => canvasRef.current,
        keyboardControls: controls,
        gamepadBindings: gamepadBindings.length > 0 ? gamepadBindings : undefined,
        retroAchievements: retroAchievementsConfig,
        shader: props.shader,
        onReady: () => {
            console.log('[GamePlayer] Emulator started');
            onSessionStart?.();
            onReady?.();

            // Show coin hint for arcade systems
            const arcadeSystems = ['arcade', 'neogeo', 'fba', 'mame'];
            if (arcadeSystems.includes(system.toLowerCase())) {
                setTimeout(() => {
                    showToast(
                        t.notifications.insertCoin,
                        'info',
                        {
                            title: t.notifications.insertCoinTitle,
                            duration: 5000,
                        }
                    );
                }, 1500); // Delay to let the game load first
            }
        },
        onError: (err) => {
            console.error('[GamePlayer] Emulator error:', err);
            onError?.(err);
        },
    });

    const {
        status,
        setVolume: setVolumeInHook,
        toggleMute: toggleMuteInHook,
        prepare,
    } = nostalgist;

    // Session End tracking
    useEffect(() => {
        return () => {
            if (status === 'running' || status === 'paused') {
                onSessionEnd?.();
            }
        };
    }, [status, onSessionEnd]);

    // Volume management
    const volumeState = useVolume({
        setVolume: setVolumeInHook,
        toggleMute: toggleMuteInHook,
    });

    // Suppress warnings
    useEffect(() => suppressEmulatorWarnings(), []);

    // Prepare emulator loop
    useEffect(() => {
        if (!romUrl || !system || status !== 'idle') return;

        const checkAndPrepare = async () => {
            if (canvasRef.current && canvasRef.current.isConnected) {
                prepare();
            } else {
                requestAnimationFrame(checkAndPrepare);
            }
        };

        const rafId = requestAnimationFrame(checkAndPrepare);
        return () => cancelAnimationFrame(rafId);
    }, [romUrl, system, status, prepare]);

    // Hardcore Restrictions
    const hardcoreRestrictions = useMemo(() => {
        const isHardcore = !!retroAchievementsConfig?.hardcore;
        return {
            isHardcore,
            canUseSaveStates: !isHardcore,
            canUseRewind: !isHardcore && (nostalgist.rewindEnabled ?? true),
            canUseCheats: !isHardcore,
            canUseSlowMotion: !isHardcore,
        };
    }, [retroAchievementsConfig?.hardcore, nostalgist.rewindEnabled]);

    return {
        nostalgist,
        volumeState,
        controls,
        saveControls,
        gamepads,
        connectedCount,
        gamepadModalOpen,
        setGamepadModalOpen,
        controlsModalOpen,
        setControlsModalOpen,
        hardcoreRestrictions,
    };
}
