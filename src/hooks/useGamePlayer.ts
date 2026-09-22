import { GamePlayerProps } from '../components/types';
import { useGameUI } from './useGameUI';
import { useGameSession } from './useGameSession';
import { useGameSaves } from './useGameSaves';
import { useGameCheats } from './useGameCheats';
import { useGameRecording } from './useGameRecording';

export function useGamePlayer(props: GamePlayerProps) {
    // 1. UI State (Toasts, Fullscreen, Refs)
    const {
        containerRef,
        canvasRef,
        isMobile,
        isFullscreen,
        toasts,
        showToast,
        dismissToast,
        handleFullscreen,
        raSidebarOpen,
        setRaSidebarOpen,
    } = useGameUI();

    // 2. Session State (Emulator, Controls, Gamepads, Volume)
    const {
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
    } = useGameSession({
        ...props,
        canvasRef,
        showToast,
    });

    const {
        pause,
        resume,
    } = nostalgist;

    // 3. Saves State (Save/Load, Slots, Auto-save)
    const {
        saveModalOpen,
        setSaveModalOpen,
        saveModalMode,
        saveSlots,
        isSlotLoading,
        actioningSlot,
        handleSave,
        handleLoad,
        handleSlotSelect,
        handleSlotDelete,
        autoSaveEnabled,
        autoSavePaused,
        autoSaveState,
        autoSaveProgress,
        handleAutoSaveToggle,
    } = useGameSaves({
        ...props,
        nostalgist,
        showToast,
        pause,
        resume,
    });

    // 4. Cheats State (Modal, Toggling)
    const {
        cheatsModalOpen,
        setCheatsModalOpen,
        activeCheats,
        allCheats,
        handleToggleCheat,
        handleAddManualCheat,
    } = useGameCheats({
        ...props,
        nostalgist,
        showToast,
    });

    // 5. Recording State (Capture gameplay as video)
    const {
        isRecording,
        isPaused: isRecordingPaused,
        recordingDuration,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        isSupported: recordingSupported,
    } = useGameRecording({
        getCanvasElement: () => canvasRef.current,
    });

    return {
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
        reloadGamepadBindings,

        // Co-op
        onAudioAvailable,

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
        allCheats,
        handleToggleCheat,
        handleAddManualCheat,

        // Emulator
        nostalgist,
        volumeState,

        // Handlers
        handleFullscreen,
        handleSave,
        handleLoad,

        // Actions
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
    };
}
