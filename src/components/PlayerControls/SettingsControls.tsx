import { memo } from 'react';
import { Maximize, Gamepad2, Joystick, Code, Power, HelpCircle, Settings } from 'lucide-react';
import { ControlButton } from './ControlButton';
import ShaderDropdown from './ShaderDropdown';
import RAButton from '../RASidebar/RAButton';
import HardcoreTooltip from '../UI/HardcoreTooltip';
import { ShaderPresetId } from '../UI/ShaderSelector';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import { RAHardcodeRestrictions } from '../types';

interface SettingsControlsProps {
    onFullscreen: () => void;
    onControls: () => void;
    onGamepadSettings?: () => void;
    onSettings?: () => void;
    onCheats: () => void;
    onRetroAchievements: () => void;
    onShowShortcuts?: () => void;
    onExit: () => void;
    // Shader controls
    currentShader?: ShaderPresetId;
    onShaderChange?: (shader: ShaderPresetId, requiresRestart: boolean) => void;
    isRunning?: boolean; // Passed to ShaderDropdown for restart warning
    disabled?: boolean;
    systemColor?: string;
    gamepadCount?: number;
    hardcoreRestrictions?: RAHardcodeRestrictions;
    raConnected?: boolean;
    raGameFound?: boolean;
    raAchievementCount?: number;
    raIsIdentifying?: boolean;
}

export const SettingsControls = memo(function SettingsControls({
    onFullscreen,
    onControls,
    onGamepadSettings,
    onSettings,
    onCheats,
    onRetroAchievements,
    onShowShortcuts,
    onExit,
    currentShader,
    onShaderChange,
    isRunning = false,
    disabled = false,
    systemColor = '#00FF41',
    gamepadCount = 0,
    hardcoreRestrictions,
    raConnected = false,
    raGameFound = false,
    raAchievementCount = 0,
    raIsIdentifying = false,
}: SettingsControlsProps) {
    const t = useKoinTranslation();

    // Build gamepad indicator text - simple replacement
    const gamepadIndicatorText = gamepadCount > 0
        ? Array.from({ length: gamepadCount }, (_, i) => `P${i + 1}`).join(' ')
        : '';

    const gamepadConnectedTitle = t.controls.gamepadConnected
        .replace('{{count}}', gamepadCount.toString())
        .replace('{{plural}}', gamepadCount > 1 ? 's' : '');

    return (
        <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto sm:flex-nowrap sm:gap-3 flex-shrink-0">
            {/* Shader Selector */}
            <ShaderDropdown
                currentShader={currentShader}
                onShaderChange={onShaderChange}
                isRunning={isRunning}
                systemColor={systemColor}
                disabled={disabled}
            />

            {/* Help / Shortcuts button */}
            {onShowShortcuts && (
                <ControlButton onClick={onShowShortcuts} icon={HelpCircle} label={t.controls.help} disabled={disabled} className="hidden sm:flex" systemColor={systemColor} />
            )}

            {/* Fullscreen button - hidden on mobile (we have floating button) */}
            <ControlButton onClick={onFullscreen} icon={Maximize} label={t.controls.full} disabled={disabled} className="hidden sm:flex" systemColor={systemColor} />
            {/* Hide some buttons on mobile to save space */}
            <ControlButton onClick={onControls} icon={Gamepad2} label={t.controls.keys} disabled={disabled} className="hidden sm:flex" systemColor={systemColor} />

            {/* Gamepad indicator - shows connected controllers OR hint to press button */}
            {gamepadCount > 0 ? (
                <button
                    onClick={onGamepadSettings}
                    className="relative group flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/10 flex-shrink-0 hidden sm:flex"
                    title={gamepadConnectedTitle}
                >
                    <div className="relative">
                        <Joystick size={20} style={{ color: systemColor }} className="transition-transform group-hover:scale-110" />
                        {/* Connection indicator dot */}
                        <div
                            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: systemColor }}
                        />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70" style={{ color: systemColor }}>
                        {gamepadIndicatorText}
                    </span>
                </button>
            ) : (
                /* Neo-brutalist hint for users with no detected gamepad */
                <button
                    onClick={onGamepadSettings}
                    className="relative group flex-col items-center gap-1 px-3 py-2 transition-all duration-200 flex-shrink-0"
                    title={t.controls.noGamepad}
                    style={{
                        border: '2px dashed #6b7280',
                        backgroundColor: 'transparent',
                    }}
                >
                    <div className="relative flex items-center gap-2">
                        <Gamepad2 size={18} className="text-gray-400 transition-transform group-hover:scale-110 group-hover:text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white whitespace-nowrap">
                            {t.controls.press}
                        </span>
                        {/* Circle representing a button */}
                        <div className="w-5 h-5 rounded-full border-2 border-gray-400 group-hover:border-white flex items-center justify-center animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-gray-400 group-hover:bg-white" />
                        </div>
                    </div>
                </button>
            )}

            <div className="relative group hidden sm:block">
                <ControlButton
                    onClick={hardcoreRestrictions?.canUseCheats === false ? undefined : onCheats}
                    icon={Code}
                    label={t.settings.cheats}
                    disabled={disabled || hardcoreRestrictions?.canUseCheats === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip
                    show={hardcoreRestrictions?.canUseCheats === false}
                    message={hardcoreRestrictions?.isHardcore ? t.common.disabledInHardcore : t.common.notSupported}
                />
            </div>
            <RAButton
                onClick={onRetroAchievements}
                disabled={disabled}
                isConnected={raConnected}
                isGameFound={raGameFound}
                isIdentifying={raIsIdentifying}
                achievementCount={raAchievementCount}
                className="hidden sm:flex"
            />
            {onSettings && (
                <ControlButton
                    onClick={onSettings}
                    icon={Settings}
                    label={t.settings.title}
                    disabled={disabled}
                    systemColor={systemColor}
                    className="hidden sm:flex"
                />
            )}
            <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />
            <ControlButton onClick={onExit} icon={Power} label={t.settings.exit} danger disabled={disabled} systemColor={systemColor} />
        </div>
    );
});
