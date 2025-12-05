import { GamePlayerProps } from '../components/types';
import { useGameUI } from './useGameUI';
import { useGameSession } from './useGameSession';
import { useGameSaves } from './useGameSaves';
import { useGameCheats } from './useGameCheats';

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
        handleToggleCheat,
    } = useGameCheats({
        ...props,
        nostalgist,
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
    };
}
