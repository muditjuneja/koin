import { SpeedMultiplier } from '../hooks/useNostalgist';
import { ShaderPresetId } from './UI/ShaderSelector';
// Re-export from unified controls module for backwards compatibility
import { KeyboardMapping, DEFAULT_KEYBOARD } from '../lib/controls';
import { RACredentials, RAGameExtended, RAAchievement } from '../lib/retroachievements';
import { KoinTranslations, RecursivePartial } from '../locales/types';

export interface SaveSlot {
    slot: number;
    timestamp: string;
    size: number;
    screenshot?: string | null;
}

/**
 * @deprecated Use `KeyboardMapping` from `@/lib/controls` instead
 */
export type ControlMapping = KeyboardMapping;

/**
 * @deprecated Use `DEFAULT_KEYBOARD` from `@/lib/controls` instead
 */
export const DEFAULT_CONTROLS = DEFAULT_KEYBOARD;

export interface GamePlayerProps {
    className?: string;
    style?: React.CSSProperties;
    romId: string;
    romUrl: string;
    romFileName?: string;
    system: string;
    title: string;
    core?: string;
    biosUrl?: string | { url: string; name: string; location?: 'system' | 'rom_folder' };

    // Manual BIOS Selection
    availableBios?: { id: string; name: string; description?: string }[];
    currentBiosId?: string;
    onSelectBios?: (biosId: string) => void;

    onReady?: () => void;
    onError?: (error: Error) => void;
    onExit?: () => void;
    systemColor?: string; // Console-specific color for theming
    shader?: string; // CRT shader preset (e.g., 'crt/crt-lottes')
    onShaderChange?: (shader: string, requiresRestart: boolean) => void; // Called when user changes shader mid-game
    initialSlot?: number; // Auto-load save from this slot on start

    // Save/Load Handlers
    onSaveState?: (slot: number, blob: Blob, screenshot?: string) => Promise<void>;
    onLoadState?: (slot: number) => Promise<Blob | null>;
    onAutoSave?: (blob: Blob, screenshot?: string) => Promise<void>;
    onGetSaveSlots?: () => Promise<SaveSlot[]>;
    onDeleteSaveState?: (slot: number) => Promise<void>;
    initialSaveState?: Blob;
    onScreenshotCaptured?: (image: string | Blob) => void;
    autoSaveInterval?: number; // Time in ms for auto-save (default: 60000)

    // Tier Limits
    maxSlots?: number;
    currentTier?: string;
    onUpgrade?: () => void;

    // RetroAchievements
    retroAchievementsConfig?: {
        username: string;
        token: string; // User token, not password
        hardcore?: boolean;
    };

    // Cheats
    cheats?: Cheat[];
    onToggleCheat?: (cheatId: number, active: boolean) => void;

    // Session Management
    onSessionStart?: () => void;
    onSessionEnd?: () => void;

    // RetroAchievements UI
    raUser?: RACredentials | null;
    raGame?: RAGameExtended | null;
    raAchievements?: RAAchievement[];
    raUnlockedAchievements?: Set<number>;
    raIsLoading?: boolean;
    raError?: string | null;
    onRALogin?: (username: string, password: string) => Promise<boolean>;
    onRALogout?: () => void;
    onRAHardcoreChange?: (enabled: boolean) => void;

    // Internationalization
    translations?: RecursivePartial<KoinTranslations>;
}

export interface PlayerControlsProps {
    isPaused: boolean;
    isRunning: boolean; // Whether the game is actually running (vs ready/loading)
    speed: SpeedMultiplier;
    isRewinding: boolean;
    rewindBufferSize: number; // Number of states in rewind buffer
    onPauseToggle: () => void;
    onRestart: () => void;
    onSave: () => void;
    onLoad: () => void;
    onSpeedChange: (speed: SpeedMultiplier) => void;
    onRewindStart: () => void;
    onRewindStop: () => void;
    onScreenshot: () => void;
    onFullscreen: () => void;
    onControls: () => void;
    onCheats: () => void;
    onRetroAchievements: () => void;
    onExit: () => void;
    disabled?: boolean;
    // Hardcore mode restrictions
    hardcoreRestrictions?: RAHardcodeRestrictions;
    raConnected?: boolean;
    raGameFound?: boolean;
    raAchievementCount?: number;
    raIsIdentifying?: boolean;
    // Auto-save indicator
    autoSaveEnabled?: boolean;
    autoSaveProgress?: number; // 0-100, percentage until next auto-save
    autoSaveState?: 'idle' | 'counting' | 'saving' | 'done';
    autoSavePaused?: boolean;  // User manually paused auto-save
    onAutoSaveToggle?: () => void; // Toggle auto-save pause
    systemColor?: string; // Console-specific color for theming
    // Gamepad indicator
    gamepadCount?: number; // Number of connected gamepads
    onGamepadSettings?: () => void; // Open gamepad settings modal
    onSettings?: () => void;
    // Volume controls
    volume?: number; // 0-100
    isMuted?: boolean;
    onVolumeChange?: (volume: number) => void;
    onToggleMute?: () => void;
    onShowShortcuts?: () => void; // Toggle shortcuts panel
    // Recording
    onRecordToggle?: () => void;
    isRecording?: boolean;
    // Shader controls
    currentShader?: ShaderPresetId;
    onShaderChange?: (shader: ShaderPresetId, requiresRestart: boolean) => void;
}

export interface SaveSlotModalProps {
    isOpen: boolean;
    mode: 'save' | 'load';
    slots: SaveSlot[];
    isLoading: boolean;
    actioningSlot?: number | null;
    onSelect: (slot: number) => void;
    onDelete: (slot: number) => void;
    onClose: () => void;
    // Tier limits for save slots
    maxSlots?: number; // -1 for unlimited
    currentTier?: string;
    onUpgrade?: () => void;
}

export interface ControlMapperProps {
    isOpen: boolean;
    controls: ControlMapping;
    onSave: (controls: ControlMapping) => void;
    onClose: () => void;
    system?: string; // Console type for showing only relevant buttons
}

export interface CheatModalProps {
    isOpen: boolean;
    cheats: Cheat[];
    activeCheats: Set<number>;
    onToggle: (cheatId: number) => void;
    onClose: () => void;
}

export interface Cheat {
    id: number;
    code: string;
    description: string;
}

// Toast interface removed to avoid duplication with useToast hook

// RetroAchievements types
export interface RAHardcodeRestrictions {
    isHardcore?: boolean;
    canUseSaveStates: boolean;
    canUseRewind: boolean;
    canUseCheats: boolean;
    canUseSlowMotion: boolean;
}
