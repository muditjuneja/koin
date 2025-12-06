import { useState, useMemo, useEffect, RefObject } from 'react';
import { useNostalgist } from './useNostalgist';
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

    // Controls management
    const { controls, saveControls } = useControls(system, showToast);

    // Modals state
    const [gamepadModalOpen, setGamepadModalOpen] = useState(false);
    const [controlsModalOpen, setControlsModalOpen] = useState(false);

    // Gamepad detection
    const { gamepads, connectedCount } = useGamepad({
        onConnect: (gamepad) => {
            showToast(
                gamepad.name || 'Controller ready to use',
                'gamepad',
                {
                    title: 'Controller Connected',
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
                'Controller was disconnected',
                'warning',
                {
                    title: 'Controller Lost',
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
        romFileName,
        core,
        biosUrl,
        initialState: initialSaveState,
        getCanvasElement: () => canvasRef.current,
        keyboardControls: controls,
        gamepadBindings: gamepadBindings.length > 0 ? gamepadBindings : undefined,
        retroAchievements: retroAchievementsConfig,
        onReady: () => {
            console.log('[GamePlayer] Emulator started');
            onSessionStart?.();
            onReady?.();
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
        const isHardcore = retroAchievementsConfig?.hardcore;
        return {
            canUseSaveStates: !isHardcore,
            canUseRewind: !isHardcore,
            canUseCheats: !isHardcore,
            canUseSlowMotion: !isHardcore,
        };
    }, [retroAchievementsConfig?.hardcore]);

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
