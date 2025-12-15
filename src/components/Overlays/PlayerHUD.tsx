'use client';

import { memo, useState } from 'react';
import { Circle, Pause, Play, Square, Download } from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface PlayerHUDProps {
    systemColor?: string;
    // Performance Overlay
    showFPS: boolean;
    coreName?: string;
    // Input Display
    showInputDisplay: boolean;
    system: string;
    // Recording
    isRecording: boolean;
    isRecordingPaused: boolean;
    recordingDuration: number;
    onPauseRecording?: () => void;
    onResumeRecording?: () => void;
    onStopRecording?: () => void;
}

/**
 * Player HUD
 * ----------
 * Unified heads-up display in the top-right corner.
 * Shows: FPS, Input Display, Recording status.
 */
const PlayerHUD = memo(function PlayerHUD({
    systemColor = '#00FF41',
    showFPS,
    coreName = 'Unknown',
    showInputDisplay,
    system,
    isRecording,
    isRecordingPaused,
    recordingDuration,
    onPauseRecording,
    onResumeRecording,
    onStopRecording,
}: PlayerHUDProps) {
    const t = useKoinTranslation();
    const [fps, setFps] = useState(60);
    const [isHoveredRecording, setIsHoveredRecording] = useState(false);

    // FPS calculation effect would be here (simplified for now)
    // In production, use requestAnimationFrame to measure

    // Format recording duration as MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // If nothing to show, return null
    if (!showFPS && !showInputDisplay && !isRecording) return null;

    return (
        <div
            className="absolute top-2 right-2 z-40 flex flex-col items-end gap-2"
            style={{ fontFamily: 'monospace' }}
        >
            {/* Recording Indicator with controls */}
            {isRecording && (
                <div
                    className="select-none"
                    onMouseEnter={() => setIsHoveredRecording(true)}
                    onMouseLeave={() => setIsHoveredRecording(false)}
                >
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded transition-all duration-200"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            border: `2px solid ${isRecordingPaused ? '#FFA500' : '#FF3333'}`,
                            boxShadow: isRecordingPaused ? '0 0 12px rgba(255, 165, 0, 0.3)' : '0 0 12px rgba(255, 51, 51, 0.3)',
                        }}
                    >
                        {/* Recording status */}
                        <div className="relative flex items-center">
                            {isRecordingPaused ? (
                                <Pause size={14} className="text-orange-400" />
                            ) : (
                                <>
                                    <Circle size={14} fill="#FF3333" className="text-red-500" />
                                    <Circle size={14} fill="#FF3333" className="text-red-500 absolute inset-0 animate-ping opacity-75" />
                                </>
                            )}
                        </div>

                        {/* Duration */}
                        <div className="flex flex-col">
                            <span className="text-xs font-bold" style={{ color: isRecordingPaused ? '#FFA500' : '#FF3333' }}>
                                {isRecordingPaused ? t.overlays.recording.paused : 'REC'}
                            </span>
                            <span className="text-[10px] text-white/60">{formatDuration(recordingDuration)}</span>
                        </div>

                        {/* Hover controls */}
                        {isHoveredRecording && (
                            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/20">
                                {isRecordingPaused ? (
                                    <button onClick={onResumeRecording} className="p-1.5 rounded hover:bg-white/20" title={t.overlays.recording.resume}>
                                        <Play size={14} className="text-orange-400" fill="#FFA500" />
                                    </button>
                                ) : (
                                    <button onClick={onPauseRecording} className="p-1.5 rounded hover:bg-white/20" title={t.overlays.recording.pause}>
                                        <Pause size={14} className="text-white/80" />
                                    </button>
                                )}
                                <button onClick={onStopRecording} className="p-1.5 rounded hover:bg-red-500/30 flex items-center gap-1" title={t.overlays.recording.stop}>
                                    <Square size={12} fill="#FF3333" className="text-red-500" />
                                    <Download size={12} className="text-white/60" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FPS Overlay */}
            {showFPS && (
                <div
                    className="flex items-center gap-3 px-2 py-1 rounded text-xs pointer-events-none select-none"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: systemColor,
                        border: `1px solid ${systemColor}40`,
                    }}
                >
                    <div className="flex items-center gap-1">
                        <span className="opacity-60">{t.overlays.performance.fps}</span>
                        <span className="font-bold">{fps}</span>
                    </div>
                    <div className="w-px h-3 bg-white/20" />
                    <div className="flex items-center gap-1">
                        <span className="opacity-60">{t.overlays.performance.core}</span>
                        <span className="font-bold text-white/80">{coreName}</span>
                    </div>
                </div>
            )}

            {/* Input Display - simplified indicator */}
            {showInputDisplay && (
                <div
                    className="flex items-center gap-2 px-2 py-1 rounded text-xs pointer-events-none select-none"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        border: `1px solid ${systemColor}40`,
                    }}
                >
                    <span className="text-white/60">{t.overlays.performance.input}</span>
                    <span className="font-bold" style={{ color: systemColor }}>{t.overlays.performance.active}</span>
                </div>
            )}
        </div>
    );
});

export default PlayerHUD;
