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

    // Co-op: whether guests are connected right now, read at click time by
    // actions that would restart the emulator (and drop them).
    const coopActiveRef = useRef(false);
    useEffect(() => {
        const coop = props.coop;
        coopActiveRef.current = (coop?.state.guestsConnected ?? 0) > 0;
        if (!coop) return;
        return coop.subscribe((state) => {
            coopActiveRef.current = state.guestsConnected > 0;
        });
    }, [props.coop]);

    // The game's audio only exists after its first sound; co-op hosting needs
    // to know when it appears so guests can hear it.
    const audioListenersRef = useRef(new Set<() => void>());
    const onAudioAvailable = useCallback((listener: () => void) => {
        audioListenersRef.current.add(listener);
        return () => {
            audioListenersRef.current.delete(listener);
        };
    }, []);

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
                        // Saving a remap restarts the emulator, which would drop co-op guests.
                        onClick: () => {
                            if (!coopActiveRef.current) setGamepadModalOpen(true);
                        },
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
    const gamepadsCount = gamepads.length;
    const gamepadBindings = useMemo(() => {
        void gamepadBindingsVersion;
        const playerCount = Math.max(gamepadsCount, 1);
        return loadAllGamepadMappings(playerCount);
    }, [gamepadsCount, gamepadBindingsVersion]);

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
        coop: !!props.coop,
        onGainNodeReady: () => audioListenersRef.current.forEach((listener) => listener()),
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

    const nostalgistRef = useRef(nostalgist);
    useEffect(() => {
        nostalgistRef.current = nostalgist;
    }, [nostalgist]);

    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const tRef = useRef(t);
    useEffect(() => {
        tRef.current = t;
    }, [t]);

    // Effect: runs after React renders with updated bindings → performs the actual restart
    useEffect(() => {
        if (!softRestartPending) return;
        setSoftRestartPending(false);

        const doSoftRestart = async () => {
            try {
                showToastRef.current(tRef.current.notifications.controlsSaved, 'info', { duration: 2000 });

                await nostalgistRef.current.restart();

                // Wait for the emulator to fully initialize and render first frames
                await new Promise(resolve => setTimeout(resolve, 500));

                // Restore saved state so the user picks up where they left off
                const saved = savedStateForRestart.current;
                if (saved) {
                    await nostalgistRef.current.loadState(saved);
                    savedStateForRestart.current = null;
                }
            } catch (err) {
                console.error('[GameSession] Soft restart failed:', err);
            }
        };

        doSoftRestart();
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
        onAudioAvailable,
    };
}
