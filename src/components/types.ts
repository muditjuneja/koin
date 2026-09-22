import { SpeedMultiplier, CustomCoreSource } from '../hooks/useNostalgist';
import { ShaderPresetId } from '../lib/shader-presets';
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
    // A known core name (e.g. 'snes9x'), or a self-hosted core: { name, js, wasm }.
    // See CustomCoreSource for bringing your own libretro core build.
    core?: string | CustomCoreSource;
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

    /**
     * Host netplay co-op: pass a session from `koin.js/netplay` (e.g.
     * `useCoopHost`). The emulator is prepared for remote players and
     * connected to the session while it runs; actions that would restart the
     * emulator (shader change, reset, remapping) are blocked while guests are
     * connected.
     */
    coop?: CoopHostBinding;
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
    // Co-op session restrictions (see GamePlayerProps.coop)
    coopRestrictions?: CoopRestrictions;
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
    // Layout override
    isMobile?: boolean;
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
    activeCheats: Set<string>;
    onToggle: (cheatId: string) => void;
    onClose: () => void;
    onAddManualCheat?: (code: string, description: string) => void;
}

export type CheatSource = 'database' | 'manual';

export interface Cheat {
    id: string;
    code: string;
    description: string;
    source?: CheatSource; // Optional for backwards compatibility during migration
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

/** Actions blocked while co-op guests are connected — each would restart the emulator and drop them. */
export interface CoopRestrictions {
    isCoopActive: boolean;
    canChangeShader: boolean;
    canManualRestart: boolean;
    canOpenControlsModal: boolean;
    canOpenGamepadModal: boolean;
}

/** The running emulator, as handed to a co-op host session. */
export interface CoopEmulatorHandle {
    canvas: HTMLCanvasElement;
    getEmscripten(): any;
    getAudioStream(): MediaStream | null;
    onAudioAvailable?(listener: () => void): () => void;
}

/**
 * What GamePlayer needs from a co-op host session. Declared structurally here
 * so the main bundle never imports netplay code; `CoopHostSession` from
 * `koin.js/netplay` satisfies it.
 */
export interface CoopHostBinding {
    readonly state: { guestsConnected: number };
    subscribe(listener: (state: { guestsConnected: number }) => void): () => void;
    attachEmulator(emulator: CoopEmulatorHandle): () => void;
    announce?(event: 'rewind' | 'load-state' | 'speed-change' | 'paused' | 'resumed'): void;
}
