import { useState, useMemo, useCallback, useEffect, useRef, RefObject } from 'react';
import { useNostalgist } from './useNostalgist';
import { useKoinTranslation } from './useKoinTranslation';
import { useGamepad } from './useGamepad';
import { useVolume } from './useVolume';
import { useControls } from './useControls';
import { loadAllGamepadMappings } from '../lib/controls';
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
        raUser,
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

    // Load gamepad bindings — counter triggers reload after remapping
    const [gamepadBindingsVersion, setGamepadBindingsVersion] = useState(0);
    const gamepadBindings = useMemo(() => {
        const playerCount = Math.max(gamepads.length, 1);
        return loadAllGamepadMappings(playerCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gamepads.length, gamepadBindingsVersion]);

    // Soft restart state — logic defined after nostalgist hook below
    const savedStateForRestart = useRef<Uint8Array | null>(null);
    const [softRestartPending, setSoftRestartPending] = useState(false);

    // RetroAchievements: `raUser` (login/session state used to drive the RA sidebar UI)
    // and `retroAchievementsConfig` (what actually gets wired into the RetroArch core's
    // cheevos_* options) are two separate props. Consumers commonly set up `raUser` +
    // `onRALogin` to show the sidebar/unlocks list, but never realize they also need to
    // pass `retroAchievementsConfig` for achievements to actually be tracked/unlocked by
    // the core — resulting in a fully working RA login UI where nothing ever unlocks
    // (see https://github.com/muditjuneja/koin/issues/2). Fall back to deriving it from
    // `raUser` so logging in is enough by default; an explicit `retroAchievementsConfig`
    // still always wins (e.g. to control hardcore mode).
    const resolvedRetroAchievementsConfig = useMemo(() => {
        if (retroAchievementsConfig) return retroAchievementsConfig;
        if (raUser?.username && raUser?.connectToken) {
            return { username: raUser.username, token: raUser.connectToken };
        }
        return undefined;
    }, [retroAchievementsConfig, raUser?.username, raUser?.connectToken]);

    const getCanvasElement = useCallback(() => canvasRef.current, [canvasRef]);

    // Emulator state
    const nostalgist = useNostalgist({
        system,
        romUrl,
        romId,
        romFileName,
        core,
        biosUrl,
        initialState: initialSaveState,
        getCanvasElement,
        keyboardControls: controls,

        gamepadBindings: gamepadBindings.length > 0 ? gamepadBindings : undefined,
        retroAchievements: resolvedRetroAchievementsConfig,
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
    }, [romUrl, system, status, prepare, canvasRef]);


    // Soft restart: reload gamepad bindings and seamlessly restart emulator
    const reloadGamepadBindings = useCallback(async () => {
        const isRunning = status === 'running' || status === 'paused';

        if (isRunning) {
            // Save current state before restart
            const stateData = await nostalgist.saveState();
            savedStateForRestart.current = stateData ?? null;
        }

        // Bump version → next render recomputes gamepadBindings → prepare gets new config
        setGamepadBindingsVersion(v => v + 1);

        if (isRunning) {
            setSoftRestartPending(true);
        }
    }, [status, nostalgist]);

    // Effect: runs after React renders with updated bindings → performs the actual restart
    useEffect(() => {
        if (!softRestartPending) return;
        setSoftRestartPending(false);

        const doSoftRestart = async () => {
            try {
                showToast(t.notifications.controlsSaved, 'info', { duration: 2000 });

                await nostalgist.restart();

                // Wait for the emulator to fully initialize and render first frames
                await new Promise(resolve => setTimeout(resolve, 500));

                // Restore saved state so the user picks up where they left off
                const saved = savedStateForRestart.current;
                if (saved) {
                    await nostalgist.loadState(saved);
                    savedStateForRestart.current = null;
                }
            } catch (err) {
                console.error('[GameSession] Soft restart failed:', err);
            }
        };

        doSoftRestart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [softRestartPending]);

    // Hardcore Restrictions
    const hardcoreRestrictions = useMemo(() => {
        const isHardcore = !!resolvedRetroAchievementsConfig?.hardcore;
        return {
            isHardcore,
            canUseSaveStates: !isHardcore,
            canUseRewind: !isHardcore && (nostalgist.rewindEnabled ?? true),
            canUseCheats: !isHardcore,
            canUseSlowMotion: !isHardcore,
        };
    }, [resolvedRetroAchievementsConfig?.hardcore, nostalgist.rewindEnabled]);

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
        reloadGamepadBindings,
    };
}
