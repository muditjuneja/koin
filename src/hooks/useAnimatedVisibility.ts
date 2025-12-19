/**
 * Hook for managing animated visibility with enter/exit transitions
 * Used by popups, toasts, and other elements that need smooth in/out animations
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseAnimatedVisibilityOptions {
    /** Duration in ms before calling onExit after triggerExit (default: 200) */
    exitDuration?: number;
    /** Callback when exit animation completes */
    onExit?: () => void;
    /** Auto-dismiss after this many ms (optional) */
    autoDismissMs?: number;
}

export interface UseAnimatedVisibilityReturn {
    /** True after component mounts and enter animation should play */
    isVisible: boolean;
    /** True when exit animation is in progress */
    isExiting: boolean;
    /** Call to start exit animation */
    triggerExit: () => void;
    /** Ready-to-use class string for common slide-in-right pattern */
    slideInRightClasses: string;
}

export function useAnimatedVisibility({
    exitDuration = 200,
    onExit,
    autoDismissMs,
}: UseAnimatedVisibilityOptions = {}): UseAnimatedVisibilityReturn {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Animate in on mount
    useEffect(() => {
        requestAnimationFrame(() => {
            setIsVisible(true);
        });
    }, []);

    // Auto-dismiss timer
    useEffect(() => {
        if (!autoDismissMs) return;

        const timer = setTimeout(() => {
            triggerExit();
        }, autoDismissMs);

        return () => clearTimeout(timer);
    }, [autoDismissMs]);

    const triggerExit = useCallback(() => {
        if (isExiting) return; // Prevent double-exit

        setIsExiting(true);
        setTimeout(() => {
            onExit?.();
        }, exitDuration);
    }, [isExiting, exitDuration, onExit]);

    // Common transition classes for slide-in-right pattern
    const slideInRightClasses = isVisible && !isExiting
        ? 'translate-x-0 opacity-100'
        : 'translate-x-full opacity-0';

    return {
        isVisible,
        isExiting,
        triggerExit,
        slideInRightClasses,
    };
}
