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
    const radius = 8;
    const circumference = 2 * Math.PI * radius;

    // Track previous state for smooth transitions
    const prevStateRef = useRef<AutoSaveState>(state);
    const [displayProgress, setDisplayProgress] = useState(progress);
    const [iconOpacity, setIconOpacity] = useState(1);

    // Smooth progress animation when transitioning between states
    useEffect(() => {
        const prevState = prevStateRef.current;

        if (state === 'done' && prevState === 'saving') {
            // Animate progress to 100% smoothly when saving completes
            const startProgress = displayProgress;
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
            const startProgress = displayProgress;
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

    // When paused, show empty circle (no progress)
    const effectiveProgress = isPaused ? 0 : (state === 'done' ? displayProgress : progress);
    const strokeDashoffset = circumference - (effectiveProgress / 100) * circumference;

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
        const iconStyle = {
            opacity: iconOpacity,
            transition: 'opacity 0.2s ease-in-out',
        };

        if (isPaused) {
            return (
                <PauseCircle
                    size={8}
                    className={`absolute inset-0 m-auto ${colors.icon} transition-colors duration-300`}
                    style={iconStyle}
                />
            );
        }
        if (state === 'saving') {
            return (
                <Loader2
                    size={10}
                    className={`absolute inset-0 m-auto ${colors.icon} animate-spin transition-colors duration-300`}
                    style={iconStyle}
                />
            );
        }
        if (state === 'done') {
            return (
                <Check
                    size={10}
                    className={`absolute inset-0 m-auto ${colors.icon} transition-colors duration-300`}
                    style={{
                        ...iconStyle,
                        animation: iconOpacity === 1 ? 'checkmarkPop 0.3s ease-out' : 'none',
                    }}
                />
            );
        }
        return (
            <Clock
                size={10}
                className={`absolute inset - 0 m - auto ${colors.icon} transition - colors duration - 300`}
                style={iconStyle}
            />
        );
    };

    return (
        <button
            onClick={onClick}
            className="relative flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer group"
            title={getTooltip()}
            type="button"
        >
            <div className="relative w-7 h-7 flex items-center justify-center">
                {/* Progress Ring */}
                {!isPaused && state !== 'saving' && state !== 'done' && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                        <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-white/10"
                        />
                        <circle
                            cx="14"
                            cy="14"
                            r="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 11}
                            strokeDashoffset={2 * Math.PI * 11 * (1 - progress / 100)}
                            className="text-emerald-400/50 transition-all duration-1000 linear"
                        />
                    </svg>
                )}

                {isPaused ? (
                    <PauseCircle size={14} className="text-gray-500" />
                ) : state === 'saving' ? (
                    <Loader2 size={14} className="text-emerald-400 animate-spin" />
                ) : state === 'done' ? (
                    <Check size={14} className="text-emerald-400" />
                ) : (
                    <Clock size={12} className="text-emerald-400/70" />
                )}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 group-hover:text-gray-300">
                Auto
            </span>
        </button>
    );
}
