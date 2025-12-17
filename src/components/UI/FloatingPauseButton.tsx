'use client';

import { Pause, Play } from 'lucide-react';

interface FloatingPauseButtonProps {
    isPaused: boolean;
    onClick: () => void;
    disabled?: boolean;
    systemColor?: string;
}

/**
 * Floating pause/play button that appears in fullscreen mode on the left
 * Styled to match FloatingExitButton for consistency
 */
export default function FloatingPauseButton({ 
    isPaused, 
    onClick, 
    disabled = false,
    systemColor = '#00FF41'
}: FloatingPauseButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                fixed top-3 left-3 z-50
                px-3 py-2 rounded-xl
                bg-black/80 backdrop-blur-md
                border-2
                shadow-xl
                flex items-center gap-2
                transition-all duration-300
                hover:scale-105
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
            `}
            style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                borderColor: isPaused ? systemColor : 'rgba(255,255,255,0.3)',
            }}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
        >
            {isPaused ? (
                <>
                    <Play size={16} style={{ color: systemColor }} fill={systemColor} />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                        Play
                    </span>
                </>
            ) : (
                <>
                    <Pause size={16} className="text-white/80" />
                    <span className="text-white text-xs font-bold uppercase tracking-wider">
                        Pause
                    </span>
                </>
            )}
        </button>
    );
}
