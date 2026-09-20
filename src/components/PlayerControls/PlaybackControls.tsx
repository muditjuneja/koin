import { memo } from 'react';
import { Play, Pause, RotateCcw, Rewind } from 'lucide-react';
import { ControlButton } from './ControlButton';
import SpeedMenu from '../UI/SpeedMenu';
import VolumeControl from '../UI/VolumeControl';
import HardcoreTooltip from '../UI/HardcoreTooltip';
import { PortalTooltip } from '../UI/PortalTooltip';
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
    coopRestrictions?: {
        canManualRestart?: boolean;
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
    coopRestrictions,
}: PlaybackControlsProps) {
    const t = useKoinTranslation();
    const hasRewindHistory = rewindBufferSize > 0;
    const restartBlocked = coopRestrictions?.canManualRestart === false;

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
            <div className="relative group">
                <ControlButton
                    onClick={restartBlocked ? undefined : onRestart}
                    icon={RotateCcw}
                    label={t.controls.reset}
                    disabled={disabled || restartBlocked}
                    systemColor={systemColor}
                />
                <HardcoreTooltip show={restartBlocked} message={t.common.disabledDuringCoop} />
            </div>

            {/* Speed Control */}
            <SpeedMenu speed={speed} onSpeedChange={onSpeedChange} disabled={disabled} />

            <PortalTooltip
                content={t.common.playToEnableRewind}
                show={hardcoreRestrictions?.canUseRewind !== false && !hasRewindHistory}
                className="relative group"
            >
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
            </PortalTooltip>

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
