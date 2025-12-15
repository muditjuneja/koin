import { memo } from 'react';
import { Play, Pause, RotateCcw, Rewind } from 'lucide-react';
import { ControlButton } from './ControlButton';
import SpeedMenu from '../UI/SpeedMenu';
import VolumeControl from '../UI/VolumeControl';
import HardcoreTooltip from '../UI/HardcoreTooltip';
import { SpeedMultiplier } from '../../hooks/emulator/types';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface PlaybackControlsProps {
    isPaused: boolean;
    isRunning: boolean;
    speed: SpeedMultiplier;
    isRewinding: boolean;
    rewindBufferSize: number;
    onPauseToggle: () => void;
    onRestart: () => void;
    onSpeedChange: (speed: SpeedMultiplier) => void;
    onRewindStart: () => void;
    onRewindStop: () => void;
    volume: number;
    isMuted: boolean;
    onVolumeChange?: (volume: number) => void;
    onToggleMute?: () => void;
    disabled?: boolean;
    systemColor?: string;
    hardcoreRestrictions?: {
        canUseRewind?: boolean;
        isHardcore?: boolean;
    };
}

export const PlaybackControls = memo(function PlaybackControls({
    isPaused,
    isRunning,
    speed,
    isRewinding,
    rewindBufferSize,
    onPauseToggle,
    onRestart,
    onSpeedChange,
    onRewindStart,
    onRewindStop,
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
    disabled = false,
    systemColor = '#00FF41',
    hardcoreRestrictions,
}: PlaybackControlsProps) {
    const t = useKoinTranslation();
    const hasRewindHistory = rewindBufferSize > 0;

    return (
        <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto sm:flex-nowrap sm:gap-3 flex-shrink-0">
            <ControlButton
                onClick={onPauseToggle}
                icon={(!isRunning || isPaused) ? Play : Pause}
                label={(!isRunning || isPaused) ? t.controls.play : t.controls.pause}
                active={isPaused}
                disabled={disabled}
                systemColor={systemColor}
            />
            <ControlButton
                onClick={onRestart}
                icon={RotateCcw}
                label={t.controls.reset}
                disabled={disabled}
                systemColor={systemColor}
            />

            {/* Speed Control */}
            <SpeedMenu speed={speed} onSpeedChange={onSpeedChange} disabled={disabled} />

            <div className="relative group">
                <ControlButton
                    onMouseDown={hasRewindHistory && hardcoreRestrictions?.canUseRewind !== false ? onRewindStart : undefined}
                    onMouseUp={hasRewindHistory && hardcoreRestrictions?.canUseRewind !== false ? onRewindStop : undefined}
                    onMouseLeave={hasRewindHistory && hardcoreRestrictions?.canUseRewind !== false ? onRewindStop : undefined}
                    onTouchStart={hasRewindHistory && hardcoreRestrictions?.canUseRewind !== false ? onRewindStart : undefined}
                    onTouchEnd={hasRewindHistory && hardcoreRestrictions?.canUseRewind !== false ? onRewindStop : undefined}
                    icon={Rewind}
                    label={t.controls.rewind}
                    active={isRewinding}
                    disabled={disabled || !hasRewindHistory || hardcoreRestrictions?.canUseRewind === false}
                    systemColor={systemColor}
                />
                {/* Subtle pulse animation when available */}
                {hasRewindHistory && !isRewinding && hardcoreRestrictions?.canUseRewind !== false && (
                    <div className="absolute inset-0 rounded-lg animate-pulse pointer-events-none" style={{ backgroundColor: `${systemColor}20` }} />
                )}
                {/* Tooltips */}
                <HardcoreTooltip
                    show={hardcoreRestrictions?.canUseRewind === false}
                    message={hardcoreRestrictions?.isHardcore ? t.common.disabledInHardcore : t.common.notSupported}
                />
                {hardcoreRestrictions?.canUseRewind !== false && !hasRewindHistory && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {t.common.playToEnableRewind}
                    </div>
                )}
            </div>

            {/* Volume Controls */}
            <div className="w-px h-8 bg-white/10 mx-1" />
            <VolumeControl
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={onVolumeChange || (() => { })}
                onToggleMute={onToggleMute || (() => { })}
                disabled={disabled}
                systemColor={systemColor}
            />
        </div>
    );
});
