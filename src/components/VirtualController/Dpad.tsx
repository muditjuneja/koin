'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { dispatchKeyboardEvent } from './utils/keyboardEvents';
import { ControlMapping } from '../../lib/controls/types';

interface DpadProps {
    size: number;
    x: number;
    y: number;
    containerWidth: number;
    containerHeight: number;
    controls?: ControlMapping;
    systemColor?: string;
    isLandscape?: boolean;
}

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Optimized D-pad component
 * - Uses refs instead of state to avoid re-renders during rapid input
 * - Individual direction highlighting (not entire bars)
 * - Diagonal support with overlapping angle ranges
 */
const Dpad = React.memo(function Dpad({
    size,
    x,
    y,
    containerWidth,
    containerHeight,
    controls,
    systemColor = '#00FF41',
    isLandscape = false,
}: DpadProps) {
    const dpadRef = useRef<HTMLDivElement>(null);
    const activeTouchRef = useRef<number | null>(null);
    // Use refs for active directions to avoid re-renders
    const activeDirectionsRef = useRef<Set<Direction>>(new Set());
    // Refs for SVG elements to update directly (no React re-render)
    const upRef = useRef<SVGRectElement>(null);
    const downRef = useRef<SVGRectElement>(null);
    const leftRef = useRef<SVGRectElement>(null);
    const rightRef = useRef<SVGRectElement>(null);

    const getKeyCode = useCallback((direction: Direction): string => {
        if (!controls) {
            const defaults: Record<Direction, string> = {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
            };
            return defaults[direction];
        }
        return controls[direction] || '';
    }, [controls]);

    // Calculate directions from touch position
    const getDirectionsFromTouch = useCallback((touchX: number, touchY: number, rect: DOMRect): Set<Direction> => {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touchX - centerX;
        const dy = touchY - centerY;

        const deadZone = rect.width * 0.12;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < deadZone) return new Set();

        const directions = new Set<Direction>();
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Overlapping ranges for diagonal support
        if (angle >= -157.5 && angle <= -22.5) directions.add('up');
        if (angle >= 22.5 && angle <= 157.5) directions.add('down');
        if (angle >= 112.5 || angle <= -112.5) directions.add('left');
        if (angle >= -67.5 && angle <= 67.5) directions.add('right');

        return directions;
    }, []);

    // Update visual feedback directly via DOM (no React re-render)
    const updateVisuals = useCallback((directions: Set<Direction>) => {
        const activeColor = systemColor;
        const inactiveColor = '#1a1a1a';

        if (upRef.current) upRef.current.style.fill = directions.has('up') ? activeColor : inactiveColor;
        if (downRef.current) downRef.current.style.fill = directions.has('down') ? activeColor : inactiveColor;
        if (leftRef.current) leftRef.current.style.fill = directions.has('left') ? activeColor : inactiveColor;
        if (rightRef.current) rightRef.current.style.fill = directions.has('right') ? activeColor : inactiveColor;
    }, [systemColor]);

    // Update directions and dispatch keyboard events
    const updateDirections = useCallback((newDirections: Set<Direction>) => {
        const prev = activeDirectionsRef.current;

        // Release directions no longer pressed
        prev.forEach(dir => {
            if (!newDirections.has(dir)) {
                const keyCode = getKeyCode(dir);
                if (keyCode) dispatchKeyboardEvent('keyup', keyCode);
            }
        });

        // Press new directions
        newDirections.forEach(dir => {
            if (!prev.has(dir)) {
                const keyCode = getKeyCode(dir);
                if (keyCode) {
                    if (navigator.vibrate) navigator.vibrate(5);
                    dispatchKeyboardEvent('keydown', keyCode);
                }
            }
        });

        activeDirectionsRef.current = newDirections;
        updateVisuals(newDirections);
    }, [getKeyCode, updateVisuals]);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const touch = e.touches[0];
        activeTouchRef.current = touch.identifier;

        const rect = dpadRef.current?.getBoundingClientRect();
        if (!rect) return;

        updateDirections(getDirectionsFromTouch(touch.clientX, touch.clientY, rect));
    }, [getDirectionsFromTouch, updateDirections]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        e.preventDefault();

        let touch: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === activeTouchRef.current) {
                touch = e.touches[i];
                break;
            }
        }
        if (!touch) return;

        const rect = dpadRef.current?.getBoundingClientRect();
        if (!rect) return;

        updateDirections(getDirectionsFromTouch(touch.clientX, touch.clientY, rect));
    }, [getDirectionsFromTouch, updateDirections]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        e.preventDefault();

        let touchEnded = true;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === activeTouchRef.current) {
                touchEnded = false;
                break;
            }
        }

        if (touchEnded) {
            activeTouchRef.current = null;
            // Release all directions
            activeDirectionsRef.current.forEach(dir => {
                const keyCode = getKeyCode(dir);
                if (keyCode) dispatchKeyboardEvent('keyup', keyCode);
            });
            activeDirectionsRef.current = new Set();
            updateVisuals(new Set());
        }
    }, [getKeyCode, updateVisuals]);

    useEffect(() => {
        const dpad = dpadRef.current;
        if (!dpad) return;

        dpad.addEventListener('touchstart', handleTouchStart, { passive: false });
        dpad.addEventListener('touchmove', handleTouchMove, { passive: false });
        dpad.addEventListener('touchend', handleTouchEnd, { passive: false });
        dpad.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        return () => {
            dpad.removeEventListener('touchstart', handleTouchStart);
            dpad.removeEventListener('touchmove', handleTouchMove);
            dpad.removeEventListener('touchend', handleTouchEnd);
            dpad.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const leftPx = (x / 100) * containerWidth - size / 2;
    const topPx = (y / 100) * containerHeight - size / 2;

    return (
        <div
            ref={dpadRef}
            className="absolute pointer-events-auto touch-manipulation"
            style={{
                top: 0,
                left: 0,
                transform: `translate3d(${leftPx}px, ${topPx}px, 0)`,
                width: size,
                height: size,
                opacity: isLandscape ? 0.85 : 1,
                WebkitTouchCallout: 'none',
                userSelect: 'none',
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* D-pad with 4 SEPARATE directional segments */}
            <svg width={size} height={size} viewBox="0 0 100 100">
                {/* Up segment */}
                <rect ref={upRef} x="35" y="5" width="30" height="30" rx="4" fill="#1a1a1a" stroke="white" strokeWidth="2" />
                {/* Down segment */}
                <rect ref={downRef} x="35" y="65" width="30" height="30" rx="4" fill="#1a1a1a" stroke="white" strokeWidth="2" />
                {/* Left segment */}
                <rect ref={leftRef} x="5" y="35" width="30" height="30" rx="4" fill="#1a1a1a" stroke="white" strokeWidth="2" />
                {/* Right segment */}
                <rect ref={rightRef} x="65" y="35" width="30" height="30" rx="4" fill="#1a1a1a" stroke="white" strokeWidth="2" />
                {/* Center */}
                <rect x="35" y="35" width="30" height="30" fill="#000" stroke="white" strokeWidth="2" />
                {/* Direction arrows */}
                <text x="50" y="25" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">↑</text>
                <text x="50" y="85" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">↓</text>
                <text x="20" y="55" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">←</text>
                <text x="80" y="55" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold">→</text>
            </svg>
        </div>
    );
});

export default Dpad;
