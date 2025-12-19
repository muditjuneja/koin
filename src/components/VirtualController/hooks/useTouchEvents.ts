/**
 * Hook for attaching touch event listeners to an element
 * Handles touchstart, touchmove, touchend, and touchcancel with proper cleanup
 */

import { useEffect, useCallback, useRef } from 'react';

export interface TouchEventHandlers {
    onTouchStart?: (e: TouchEvent) => void;
    onTouchMove?: (e: TouchEvent) => void;
    onTouchEnd?: (e: TouchEvent) => void;
    onTouchCancel?: (e: TouchEvent) => void;
}

export interface UseTouchEventsOptions {
    /** Additional cleanup function to call on unmount */
    cleanup?: () => void;
    /** Whether the listeners are passive (default: false for game controls) */
    passive?: boolean;
}

/**
 * Attaches touch event listeners to the provided ref element
 * All listeners use { passive: false } by default to allow preventDefault
 */
export function useTouchEvents<T extends HTMLElement>(
    ref: React.RefObject<T | null>,
    handlers: TouchEventHandlers,
    options: UseTouchEventsOptions = {}
): void {
    const { cleanup, passive = false } = options;

    // Keep stable references to handlers
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    // Memoized event handlers that use refs
    const handleTouchStart = useCallback((e: TouchEvent) => {
        handlersRef.current.onTouchStart?.(e);
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        handlersRef.current.onTouchMove?.(e);
    }, []);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        handlersRef.current.onTouchEnd?.(e);
    }, []);

    const handleTouchCancel = useCallback((e: TouchEvent) => {
        handlersRef.current.onTouchCancel?.(e);
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const listenerOptions = { passive };

        element.addEventListener('touchstart', handleTouchStart, listenerOptions);
        element.addEventListener('touchmove', handleTouchMove, listenerOptions);
        element.addEventListener('touchend', handleTouchEnd, listenerOptions);
        element.addEventListener('touchcancel', handleTouchCancel, listenerOptions);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchCancel);
            cleanup?.();
        };
    }, [ref, passive, cleanup, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);
}
