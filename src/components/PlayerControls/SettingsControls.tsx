import { memo } from 'react';
import { Maximize, Gamepad2, Joystick, Code, Power } from 'lucide-react';
import { ControlButton } from './ControlButton';
import RAButton from '../RASidebar/RAButton';
import HardcoreTooltip from '../UI/HardcoreTooltip';

interface SettingsControlsProps {
    onFullscreen: () => void;
    onControls: () => void;
    onGamepadSettings?: () => void;
    onCheats: () => void;
    onRetroAchievements: () => void;
    onExit: () => void;
    disabled?: boolean;
    systemColor?: string;
    gamepadCount?: number;
    hardcoreRestrictions?: {
        canUseCheats?: boolean;
    };
    raConnected?: boolean;
    raGameFound?: boolean;
    raAchievementCount?: number;
    raIsIdentifying?: boolean;
}

export const SettingsControls = memo(function SettingsControls({
    onFullscreen,
    onControls,
    onGamepadSettings,
    onCheats,
    onRetroAchievements,
    onExit,
    disabled = false,
    systemColor = '#00FF41',
    gamepadCount = 0,
    hardcoreRestrictions,
    raConnected = false,
    raGameFound = false,
    raAchievementCount = 0,
    raIsIdentifying = false,
}: SettingsControlsProps) {
    // Build gamepad indicator text - show "P1 P2" etc for each connected pad
    const gamepadIndicatorText = gamepadCount > 0
        ? Array.from({ length: gamepadCount }, (_, i) => `P${i + 1}`).join(' ')
        : '';

    return (
        <div className="flex items-center gap-1 flex-shrink-0">
            {/* Fullscreen button - hidden on mobile (we have floating button) */}
            <ControlButton onClick={onFullscreen} icon={Maximize} label="Full" disabled={disabled} className="hidden sm:flex" systemColor={systemColor} />
            {/* Hide some buttons on mobile to save space */}
            <ControlButton onClick={onControls} icon={Gamepad2} label="Keys" disabled={disabled} className="hidden sm:flex" systemColor={systemColor} />

            {/* Gamepad indicator - shows connected controllers OR hint to press button */}
            {gamepadCount > 0 ? (
                <button
                    onClick={onGamepadSettings}
                    className="relative group flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/10 flex-shrink-0 hidden sm:flex"
                    title={`${gamepadCount} controller${gamepadCount > 1 ? 's' : ''} connected - click to configure`}
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
                    className="relative group flex-col items-center gap-1 px-3 py-2 transition-all duration-200 flex-shrink-0 hidden sm:flex"
                    title="No controller detected - press any button on your gamepad to connect"
                    style={{
                        border: '2px dashed #6b7280',
                        backgroundColor: 'transparent',
                    }}
                >
                    <div className="relative flex items-center gap-2">
                        <Gamepad2 size={18} className="text-gray-400 transition-transform group-hover:scale-110 group-hover:text-white" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white whitespace-nowrap">
                            Press
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
                    label="Cheats"
                    disabled={disabled || hardcoreRestrictions?.canUseCheats === false}
                    systemColor={systemColor}
                />
                <HardcoreTooltip show={hardcoreRestrictions?.canUseCheats === false} />
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
            <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />
            <ControlButton onClick={onExit} icon={Power} label="Exit" danger disabled={disabled} systemColor={systemColor} />
        </div>
    );
});
