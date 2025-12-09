'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import PlayerControls from './PlayerControls';
import ToastContainer from './Overlays/ToastContainer';
import PerformanceOverlay from './Overlays/PerformanceOverlay';
import InputDisplay from './Overlays/InputDisplay';
import RecordingIndicator from './Overlays/RecordingIndicator';
import ShortcutsModal from './Modals/ShortcutsModal';
import { VirtualController } from './VirtualController';
import FloatingExitButton from './UI/FloatingExitButton';
import FloatingFullscreenButton from './UI/FloatingFullscreenButton';
import GameCanvas from './GameCanvas';
import GameModals from './GameModals';
import RASidebar from './RASidebar';

import { useGamePlayer } from '../hooks/useGamePlayer';
import { usePlayerPersistence } from '../hooks/usePlayerPersistence';
import { GamePlayerProps } from './types';
import { KeyboardMapping } from '../lib/controls';

export const GamePlayer = memo(function GamePlayer(
    props: GamePlayerProps & {
        controls?: KeyboardMapping; // Allow passing pre-loaded controls
        saveControls?: (controls: KeyboardMapping) => void;
    }
) {
    // -- Persistence Hook --
    const { settings, updateSettings, isLoaded: settingsLoaded } = usePlayerPersistence();

    // -- Internal State --
    const [biosModalOpen, setBiosModalOpen] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);

    // -- Derived Props from Persistence (if not overridden by direct props) --
    // Use props.shader if provided, otherwise persistent shader
    const effectiveShader = props.shader !== undefined ? props.shader : settings.shader;

    const {
        // Refs
        containerRef,
        canvasRef,

        // State

        isMobile,
        isFullscreen,
        toasts,
        dismissToast,
        raSidebarOpen,
        setRaSidebarOpen,

        // Controls
        controls,
        saveControls,

        // Gamepads
        gamepads,
        connectedCount,

        // Modals
        gamepadModalOpen,
        setGamepadModalOpen,
        controlsModalOpen,
        setControlsModalOpen,
        cheatsModalOpen,
        setCheatsModalOpen,

        // Save Modal
        saveModalOpen,
        setSaveModalOpen,
        saveModalMode,
        saveSlots,
        isSlotLoading,
        actioningSlot,
        handleSlotSelect,
        handleSlotDelete,
        autoSaveEnabled,
        autoSavePaused,
        autoSaveState,
        autoSaveProgress,
        handleAutoSaveToggle,

        // Restrictions
        hardcoreRestrictions,

        // Cheats
        activeCheats,
        handleToggleCheat,

        // Emulator Instance & State
        nostalgist, // Contains start, restart, etc.
        volumeState: {
            volume,
            isMuted: muted,
            setVolume,
            toggleMute,
        },

        // Handlers
        handleFullscreen,
        handleSave, // Use handleSave instead of handleSaveState
        handleLoad, // Use handleLoad instead of handleLoadState

        // Actions (Destructured from nostalgist wrapper in useGamePlayer)
        pause,
        resume,

        // Recording
        isRecording,
        isRecordingPaused,
        recordingDuration,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        recordingSupported,
    } = useGamePlayer({
        ...props,
        onToggleCheat: props.onToggleCheat,
        onSessionStart: props.onSessionStart,
        onSessionEnd: props.onSessionEnd,
        shader: effectiveShader, // Pass effective shader to hook
    });

    // Destructure remaining emulator actions from nostalgist instance
    const {
        start,
        restart,
        togglePause,
        setSpeed,
        startRewind,
        stopRewind,
        screenshot,
        speed,
        isRewinding,
        rewindBufferSize,
        error,
        isPaused,
        status,
        isPerformanceMode,
    } = nostalgist;

    // Sync volume from persistence on load
    useEffect(() => {
        if (settingsLoaded) {
            setVolume(settings.volume);
            if (muted !== settings.muted) toggleMute();
        }
    }, [settingsLoaded]); // Run once when loaded

    const { system, systemColor = '#00FF41', cheats = [], onExit } = props;

    // -- Memoized Handlers --

    const handlePauseToggle = useCallback(() => {
        status === 'ready' ? start() : togglePause();
    }, [status, start, togglePause]);

    const handleScreenshot = useCallback(async () => {
        const result = await screenshot();
        if (result && props.onScreenshotCaptured) {
            props.onScreenshotCaptured(result);
        }
    }, [screenshot, props.onScreenshotCaptured]);

    const handleShowControls = useCallback(() => {
        pause();
        setControlsModalOpen(true);
    }, [pause, setControlsModalOpen]);

    const handleShowCheats = useCallback(() => {
        pause();
        setCheatsModalOpen(true);
    }, [pause, setCheatsModalOpen]);

    const handleShowRA = useCallback(() => {
        pause();
        setRaSidebarOpen(true);
    }, [pause, setRaSidebarOpen]);

    const handleShowGamepadSettings = useCallback(() => {
        pause();
        setGamepadModalOpen(true);
    }, [pause, setGamepadModalOpen]);

    const handleExitClick = useCallback(() => {
        onExit?.();
    }, [onExit]);

    const handleBiosSelection = useCallback(() => {
        setBiosModalOpen(true);
    }, [setBiosModalOpen]);

    // -- Persistence Updaters --

    const handleVolumeChange = useCallback((val: number) => {
        setVolume(val);
        updateSettings({ volume: val });
    }, [setVolume, updateSettings]);

    const handleToggleMute = useCallback(() => {
        toggleMute();
        updateSettings({ muted: !muted }); // Current muted state toggled
    }, [toggleMute, updateSettings, muted]);

    const handleShaderChange = useCallback((newShader: string, requiresRestart: boolean) => {
        updateSettings({ shader: newShader as any });
        if (props.onShaderChange) {
            props.onShaderChange(newShader, requiresRestart);
        }
    }, [updateSettings, props.onShaderChange]);

    const handleTogglePerformanceOverlay = useCallback(() => {
        updateSettings({ showPerformanceOverlay: !settings.showPerformanceOverlay });
    }, [updateSettings, settings.showPerformanceOverlay]);

    const handleToggleInputDisplay = useCallback(() => {
        updateSettings({ showInputDisplay: !settings.showInputDisplay });
    }, [updateSettings, settings.showInputDisplay]);

    // Recording Toggle Handler (F5) - with auto-download
    const handleToggleRecording = useCallback(async () => {
        if (!recordingSupported) {
            console.warn('[Recording] Not supported in this browser');
            return;
        }

        if (isRecording) {
            const blob = await stopRecording();
            if (blob) {
                // Auto-download the recording
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gameplay-${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } else {
            startRecording();
        }
    }, [isRecording, recordingSupported, startRecording, stopRecording]);

    // Shortcuts Modal Toggle (F1) - pauses game when opening, resumes when closing
    const handleToggleShortcuts = useCallback(() => {
        setShowShortcutsModal(prev => {
            if (!prev) pause();
            else resume();
            return !prev;
        });
    }, [pause, resume]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                handleToggleShortcuts();
            }
            if (e.key === 'F3') {
                e.preventDefault();
                handleTogglePerformanceOverlay();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                handleToggleInputDisplay();
            }
            if (e.key === 'F5') {
                e.preventDefault();
                handleToggleRecording();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                handleToggleMute();
            }
            if (e.key === 'Escape' && showShortcutsModal) {
                setShowShortcutsModal(false);
                resume(); // Resume when closing with Escape
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleToggleShortcuts, handleTogglePerformanceOverlay, handleToggleInputDisplay, handleToggleRecording, handleToggleMute, showShortcutsModal, resume]);

    return (
        <div
            ref={containerRef}
            className={`absolute inset-0 bg-black overflow-hidden select-none flex flex-col ${isFullscreen ? 'fixed !inset-0 z-[9999] w-screen h-screen touch-none' : ''
                } ${props.className || ''}`}
            style={props.style}
        >
            {/* Game canvas area */}
            <div className="flex-1 relative min-h-0">
                <GameCanvas
                    status={status}
                    system={system}
                    error={error}
                    isPaused={isPaused}
                    onStart={start}
                    systemColor={systemColor}
                    isFullscreen={isFullscreen}
                    canvasRef={canvasRef}
                    onSelectBios={props.onSelectBios ? handleBiosSelection : undefined}
                />

                <VirtualController
                    system={system}
                    isRunning={status === 'running' || status === 'paused'}
                    controls={controls}
                    systemColor={systemColor}
                />

                {!isFullscreen && isMobile && (
                    <FloatingFullscreenButton
                        onClick={handleFullscreen}
                        disabled={status === 'loading' || status === 'error'}
                    />
                )}

                {isFullscreen && isMobile && (
                    <FloatingExitButton
                        onClick={handleFullscreen}
                        disabled={status === 'loading' || status === 'error'}
                    />
                )}

                {/* ===== UNIFIED TOP-RIGHT HUD ===== */}
                <div className="absolute top-2 right-2 z-40 flex flex-col items-end gap-2 pointer-events-auto">
                    {/* Recording Indicator */}
                    <RecordingIndicator
                        isRecording={isRecording}
                        isPaused={isRecordingPaused}
                        duration={recordingDuration}
                        onPause={pauseRecording}
                        onResume={resumeRecording}
                        onStop={handleToggleRecording}
                    />

                    {/* Performance Overlay */}
                    {settings.showPerformanceOverlay && (status === 'running' || status === 'paused') && (
                        <PerformanceOverlay
                            isVisible={true}
                            coreName={props.core}
                            systemColor={systemColor}
                        />
                    )}

                    {/* Performance Mode Badge (Always visible when active) */}
                    {isPerformanceMode && (status === 'running' || status === 'paused') && (
                        <div
                            className="bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 flex items-center gap-1.5"
                            style={{ borderColor: `${systemColor}40` }}
                            title="High Performance Mode Active (Threaded Video)"
                        >
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: systemColor, boxShadow: `0 0 8px ${systemColor}` }} />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/90">
                                High Perf
                            </span>
                        </div>
                    )}

                    {/* Input Display */}
                    {settings.showInputDisplay && (status === 'running' || status === 'paused') && (
                        <InputDisplay
                            isVisible={true}
                            system={system}
                            systemColor={systemColor}
                            position="inline"
                        />
                    )}
                </div>
            </div>

            {/* Controls bar */}
            {!isFullscreen && (
                <div className="shrink-0 z-50">
                    <PlayerControls
                        isPaused={isPaused}
                        isRunning={status === 'running' || status === 'paused'}
                        speed={speed}
                        isRewinding={isRewinding}
                        rewindBufferSize={rewindBufferSize}
                        onPauseToggle={handlePauseToggle}
                        onRestart={restart}
                        onSave={handleSave}
                        onLoad={handleLoad}
                        onSpeedChange={setSpeed}
                        onRewindStart={startRewind}
                        onRewindStop={stopRewind}
                        onScreenshot={handleScreenshot}
                        onFullscreen={handleFullscreen}
                        onControls={handleShowControls}
                        onCheats={handleShowCheats}
                        onRetroAchievements={handleShowRA}
                        onExit={handleExitClick}
                        disabled={status === 'loading' || status === 'error'}
                        loadDisabled={status === 'loading' || status === 'error'}
                        saveDisabled={status === 'ready'}
                        systemColor={systemColor}
                        gamepadCount={connectedCount}
                        onGamepadSettings={handleShowGamepadSettings}
                        volume={volume}
                        isMuted={muted} // Use local 'muted' which is aliased from 'isMuted'
                        onVolumeChange={handleVolumeChange} // Wrapped
                        onToggleMute={handleToggleMute} // Wrapped
                        hardcoreRestrictions={hardcoreRestrictions}
                        raConnected={!!props.raUser}
                        raGameFound={!!props.raGame}
                        raAchievementCount={props.raAchievements?.length}
                        raIsIdentifying={props.raIsLoading}
                        autoSaveEnabled={autoSaveEnabled}
                        autoSavePaused={autoSavePaused}
                        autoSaveState={autoSaveState}
                        autoSaveProgress={autoSaveProgress}
                        onAutoSaveToggle={handleAutoSaveToggle}
                        onShowShortcuts={handleToggleShortcuts}
                        onRecordToggle={handleToggleRecording}
                        isRecording={isRecording}
                        currentShader={effectiveShader as import('./UI/ShaderSelector').ShaderPresetId}
                        onShaderChange={handleShaderChange} // Wrapped
                    />
                </div>
            )}

            {/* Modals */}
            <ShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => {
                    setShowShortcutsModal(false);
                    resume();
                }}
                systemColor={systemColor}
            />

            <GameModals
                controlsModalOpen={controlsModalOpen}
                setControlsModalOpen={setControlsModalOpen}
                controls={controls}
                saveControls={saveControls}
                system={system}
                onResume={resume}

                gamepadModalOpen={gamepadModalOpen}
                setGamepadModalOpen={setGamepadModalOpen}
                gamepads={gamepads}
                systemColor={systemColor}

                cheatsModalOpen={cheatsModalOpen}
                setCheatsModalOpen={setCheatsModalOpen}
                cheats={cheats}
                activeCheats={activeCheats}
                onToggleCheat={handleToggleCheat}

                saveModalOpen={saveModalOpen}
                setSaveModalOpen={setSaveModalOpen}
                saveModalMode={saveModalMode}
                saveSlots={saveSlots}
                isSlotLoading={isSlotLoading}
                actioningSlot={actioningSlot}
                onSlotSelect={handleSlotSelect}
                onSlotDelete={handleSlotDelete}
                maxSlots={props.maxSlots}
                currentTier={props.currentTier}
                onUpgrade={props.onUpgrade}

                biosModalOpen={biosModalOpen}
                setBiosModalOpen={setBiosModalOpen}
                availableBios={props.availableBios}
                currentBiosId={props.currentBiosId}
                onSelectBios={props.onSelectBios}
            />

            {/* RASidebar */}
            {!isMobile && (
                <RASidebar
                    isOpen={raSidebarOpen}
                    onClose={() => setRaSidebarOpen(false)}
                    isLoggedIn={!!props.raUser}
                    credentials={props.raUser || null}
                    isLoading={props.raIsLoading || false}
                    error={props.raError}
                    onLogin={props.onRALogin || (async () => false)}
                    onLogout={props.onRALogout || (() => { })}
                    hardcoreEnabled={props.retroAchievementsConfig?.hardcore || false}
                    onHardcoreChange={props.onRAHardcoreChange || (() => { })}
                    currentGame={props.raGame || null}
                    achievements={props.raAchievements || []}
                    unlockedIds={props.raUnlockedAchievements || new Set()}
                />
            )}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
});

export default GamePlayer;
