import { useState, useEffect, useRef } from 'react';
import { Clock, Loader2, Check, PauseCircle } from 'lucide-react';

export type AutoSaveState = 'idle' | 'counting' | 'saving' | 'done';

export interface AutoSaveIndicatorProps {
    progress: number;
    state: AutoSaveState;
    intervalSeconds: number;
    isPaused?: boolean;  // User manually paused auto-save
    onClick?: () => void; // Toggle pause
}

/**
 * Circular progress indicator for auto-save feature.
 * Shows different states: counting down, saving, done, or paused.
 */
export default function AutoSaveIndicator({
    progress,
    state,
    intervalSeconds,
    isPaused = false,
    onClick,
}: AutoSaveIndicatorProps) {
    // Track previous state for smooth transitions
    const prevStateRef = useRef<AutoSaveState>(state);
    const [displayProgress, setDisplayProgress] = useState(progress);
    const displayProgressRef = useRef(displayProgress);
    displayProgressRef.current = displayProgress;
    const [iconOpacity, setIconOpacity] = useState(1);

    // Smooth progress animation when transitioning between states
    useEffect(() => {
        const prevState = prevStateRef.current;

        if (state === 'done' && prevState === 'saving') {
            // Animate progress to 100% smoothly when saving completes
            const startProgress = displayProgressRef.current;
            const targetProgress = 100;
            const duration = 300; // ms
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(1, elapsed / duration);
                const eased = 1 - Math.pow(1 - progressRatio, 3); // ease-out cubic
                const currentProgress = startProgress + (targetProgress - startProgress) * eased;

                setDisplayProgress(currentProgress);

                if (progressRatio < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayProgress(targetProgress);
                }
            };

            requestAnimationFrame(animate);
        } else if (state === 'counting' && prevState === 'done') {
            // Smoothly reset progress from 100% to 0% when restarting
            const startProgress = displayProgressRef.current;
            const targetProgress = 0;
            const duration = 200; // ms - faster reset
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(1, elapsed / duration);
                const eased = progressRatio; // linear for reset
                const currentProgress = startProgress + (targetProgress - startProgress) * eased;

                setDisplayProgress(currentProgress);

                if (progressRatio < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayProgress(targetProgress);
                }
            };

            requestAnimationFrame(animate);
        } else if (state !== 'done') {
            // For other state changes, update progress immediately but smoothly
            setDisplayProgress(progress);
        }

        prevStateRef.current = state;
    }, [state, progress]); // Removed displayProgress from deps to avoid loops

    // Smooth icon transitions with fade
    useEffect(() => {
        if (state !== prevStateRef.current) {
            // Fade out
            setIconOpacity(0);
            // Fade in after brief delay
            const timer = setTimeout(() => {
                setIconOpacity(1);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [state]);

    // Calculate remaining seconds
    const remainingSeconds = Math.ceil((100 - progress) * (intervalSeconds / 100));

    // Determine colors based on state
    const getStateColors = () => {
        if (isPaused) {
            return {
                stroke: 'text-gray-500',
                icon: 'text-gray-500',
                label: 'text-gray-500',
            };
        }
        switch (state) {
            case 'saving':
                return {
                    stroke: 'text-amber-400',
                    icon: 'text-amber-400',
                    label: 'text-amber-400/70',
                };
            case 'done':
                return {
                    stroke: 'text-emerald-400',
                    icon: 'text-emerald-400',
                    label: 'text-emerald-400/70',
                };
            default:
                return {
                    stroke: 'text-emerald-400/70',
                    icon: 'text-emerald-400/70',
                    label: 'text-emerald-400/50',
                };
        }
    };

    const colors = getStateColors();

    // Generate tooltip text
    const getTooltip = () => {
        if (isPaused) return 'Auto-save paused (click to resume)';
        switch (state) {
            case 'saving':
                return 'Saving...';
            case 'done':
                return 'Saved!';
            default:
                return `Auto - save in ${remainingSeconds} s(click to pause)`;
        }
    };

    // Get the appropriate icon based on state
    const renderIcon = () => {
        if (isPaused) {
            return <PauseCircle size={14} className={`${colors.icon} transition-colors duration-300`} />;
        }
        if (state === 'saving') {
            return <Loader2 size={14} className={`${colors.icon} animate-spin transition-colors duration-300`} />;
        }
        if (state === 'done') {
            return <Check size={14} className={`${colors.icon} transition-colors duration-300`} />;
        }
        return <Clock size={12} className={`${colors.icon} transition-colors duration-300`} />;
    };

    return (
        <button
            onClick={onClick}
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1 rounded hover:bg-white/5 transition-colors cursor-pointer group"
            title={getTooltip()}
            type="button"
        >
            <div className="relative w-8 h-8 flex items-center justify-center mb-0.5">
                {/* Progress Ring */}
                {!isPaused && state !== 'saving' && state !== 'done' && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                            cx="16"
                            cy="16"
                            r="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-white/10"
                        />
                        <circle
                            cx="16"
                            cy="16"
                            r="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 12}
                            strokeDashoffset={2 * Math.PI * 12 * (1 - progress / 100)}
                            className="text-emerald-400/50 transition-all duration-1000 linear"
                        />
                    </svg>
                )}

                {/* Icon Container */}
                <div
                    className="flex items-center justify-center transition-opacity duration-200"
                    style={{ opacity: iconOpacity }}
                >
                    {renderIcon()}
                </div>
            </div>

            <span className={`text-[9px] font-bold uppercase tracking-wider ${colors.label} group-hover:text-gray-300 transition-colors`}>
                {isPaused ? 'Paused' : state === 'saving' ? 'Saving' : state === 'done' ? 'Saved' : 'Auto'}
            </span>
        </button>
    );
}
