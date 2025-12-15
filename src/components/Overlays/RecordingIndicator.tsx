'use client';

import { memo, useState } from 'react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';
import { Circle, Pause, Play, Square, Download } from 'lucide-react';

interface RecordingIndicatorProps {
    isRecording: boolean;
    isPaused: boolean;
    duration: number; // in seconds
    onPause?: () => void;
    onResume?: () => void;
    onStop?: () => void;
    systemColor?: string;
}

/**
 * Recording Indicator
 * -------------------
 * Shows recording status with interactive controls on hover.
 * Position: Top-left (since performance overlay is top-right)
 */
const RecordingIndicator = memo(function RecordingIndicator({
    isRecording,
    isPaused,
    duration,
    onPause,
    onResume,
    onStop,
    systemColor = '#FF3333',
}: RecordingIndicatorProps) {
    const t = useKoinTranslation();
    const [isHovered, setIsHovered] = useState(false);

    if (!isRecording) return null;

    // Format duration as MM:SS
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div
            className="z-40 select-none"
            style={{ fontFamily: 'monospace' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="flex items-center gap-2 px-3 py-2 rounded transition-all duration-200"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: `2px solid ${isPaused ? '#FFA500' : '#FF3333'}`,
                    boxShadow: isPaused ? '0 0 12px rgba(255, 165, 0, 0.3)' : '0 0 12px rgba(255, 51, 51, 0.3)',
                }}
            >
                {/* Recording dot / status */}
                <div className="relative flex items-center">
                    {isPaused ? (
                        <Pause size={14} className="text-orange-400" />
                    ) : (
                        <>
                            <Circle
                                size={14}
                                fill="#FF3333"
                                className="text-red-500"
                            />
                            {/* Pulsing animation */}
                            <Circle
                                size={14}
                                fill="#FF3333"
                                className="text-red-500 absolute inset-0 animate-ping opacity-75"
                            />
                        </>
                    )}
                </div>

                {/* Status + Duration */}
                <div className="flex flex-col">
                    <span
                        className="text-xs font-bold"
                        style={{ color: isPaused ? '#FFA500' : '#FF3333' }}
                    >
                        {isPaused ? t.overlays.recording.paused : t.overlays.recording.recording}
                    </span>
                    <span className="text-[10px] text-white/60">{timeString}</span>
                </div>

                {/* Controls - show on hover */}
                {isHovered && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/20">
                        {/* Pause/Resume */}
                        {isPaused ? (
                            <button
                                onClick={onResume}
                                className="p-1.5 rounded hover:bg-white/20 transition-colors"
                                title={t.overlays.recording.resume}
                            >
                                <Play size={14} className="text-orange-400" fill="#FFA500" />
                            </button>
                        ) : (
                            <button
                                onClick={onPause}
                                className="p-1.5 rounded hover:bg-white/20 transition-colors"
                                title={t.overlays.recording.pause}
                            >
                                <Pause size={14} className="text-white/80" />
                            </button>
                        )}

                        {/* Stop & Save */}
                        <button
                            onClick={onStop}
                            className="p-1.5 rounded hover:bg-red-500/30 transition-colors flex items-center gap-1"
                            title={t.overlays.recording.stop}
                        >
                            <Square size={12} fill="#FF3333" className="text-red-500" />
                            <Download size={12} className="text-white/60" />
                        </button>
                    </div>
                )}
            </div>

            {/* Hint when not hovered */}
            {!isHovered && (
                <div className="text-[9px] text-white/40 text-center mt-1">
                    {t.overlays.recording.hover}
                </div>
            )}
        </div>
    );
});

export default RecordingIndicator;
