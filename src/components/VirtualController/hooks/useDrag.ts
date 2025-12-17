/**
 * Hook for handling drag-to-reposition functionality
 * Shared between virtual buttons and D-pad
 */

import { useRef, useCallback, useState } from 'react';
import { constrainToViewport } from '../utils/dragConstraints';

export interface UseDragOptions {
    elementSize: number;
    displayX: number;
    displayY: number;
    containerWidth: number;
    containerHeight: number;
    onPositionChange?: (x: number, y: number) => void;
    holdDelay?: number;
    centerThreshold?: number;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export interface UseDragReturn {
    isDragging: boolean;
    checkDragStart: (touchX: number, touchY: number, elementRect: DOMRect) => boolean;
    handleDragMove: (touchX: number, touchY: number) => void;
    handleDragEnd: () => void;
    clearDragTimer: () => void;
    checkMoveThreshold: (touchX: number, touchY: number) => boolean;
}

const DEFAULT_HOLD_DELAY = 350;
const DEFAULT_CENTER_THRESHOLD = 0.4;
const DRAG_MOVE_THRESHOLD = 10;

export function useDrag({
    elementSize,
    displayX,
    displayY,
    containerWidth,
    containerHeight,
    onPositionChange,
    holdDelay = DEFAULT_HOLD_DELAY,
    centerThreshold = DEFAULT_CENTER_THRESHOLD,
    onDragStart,
    onDragEnd,
}: UseDragOptions): UseDragReturn {
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const touchStartPosRef = useRef({ x: 0, y: 0 });
    const dragStartRef = useRef({
        elementX: 0,
        elementY: 0,
        touchX: 0,
        touchY: 0
    });

    const clearDragTimer = useCallback(() => {
        if (dragTimerRef.current) {
            clearTimeout(dragTimerRef.current);
            dragTimerRef.current = null;
        }
    }, []);

    const startDragging = useCallback(
        (touchX: number, touchY: number) => {
            isDraggingRef.current = true;
            setIsDragging(true);
            dragStartRef.current = {
                elementX: displayX,
                elementY: displayY,
                touchX,
                touchY,
            };

            // Haptic feedback for drag activation
            if (navigator.vibrate) {
                navigator.vibrate([10, 30, 10]);
            }

            onDragStart?.();
        },
        [displayX, displayY, onDragStart]
    );

    /**
     * Check if a touch should start drag mode
     * Returns true if touch is in center zone and timer was started
     */
    const checkDragStart = useCallback(
        (touchX: number, touchY: number, elementRect: DOMRect): boolean => {
            if (!onPositionChange) return false;

            touchStartPosRef.current = { x: touchX, y: touchY };

            const centerX = elementRect.left + elementRect.width / 2;
            const centerY = elementRect.top + elementRect.height / 2;
            const distFromCenter = Math.sqrt(
                Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2)
            );
            const centerRadius = elementSize * centerThreshold;

            if (distFromCenter < centerRadius) {
                // Start drag timer - if user holds for delay, enable dragging
                dragTimerRef.current = setTimeout(() => {
                    if (!isDraggingRef.current) {
                        startDragging(touchX, touchY);
                    }
                }, holdDelay);
                return true;
            }

            return false;
        },
        [onPositionChange, elementSize, centerThreshold, holdDelay, startDragging]
    );

    /**
     * Check if move distance exceeds threshold to start immediate drag
     * Returns true if drag was started
     */
    const checkMoveThreshold = useCallback(
        (touchX: number, touchY: number): boolean => {
            if (!onPositionChange || isDraggingRef.current) return false;

            const moveDistance = Math.sqrt(
                Math.pow(touchX - touchStartPosRef.current.x, 2) +
                Math.pow(touchY - touchStartPosRef.current.y, 2)
            );

            if (moveDistance > DRAG_MOVE_THRESHOLD) {
                clearDragTimer();
                startDragging(touchX, touchY);
                return true;
            }

            return false;
        },
        [onPositionChange, clearDragTimer, startDragging]
    );

    const handleDragMove = useCallback(
        (touchX: number, touchY: number) => {
            if (!isDraggingRef.current || !onPositionChange) return;

            const deltaX = touchX - dragStartRef.current.touchX;
            const deltaY = touchY - dragStartRef.current.touchY;

            const newXPercent = dragStartRef.current.elementX + (deltaX / containerWidth) * 100;
            const newYPercent = dragStartRef.current.elementY + (deltaY / containerHeight) * 100;

            const constrained = constrainToViewport({
                newXPercent,
                newYPercent,
                elementSize,
                containerWidth,
                containerHeight,
            });

            onPositionChange(constrained.x, constrained.y);
        },
        [onPositionChange, containerWidth, containerHeight, elementSize]
    );

    const handleDragEnd = useCallback(() => {
        clearDragTimer();

        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            setIsDragging(false);
            onDragEnd?.();
        }
    }, [clearDragTimer, onDragEnd]);

    return {
        isDragging,
        checkDragStart,
        handleDragMove,
        handleDragEnd,
        clearDragTimer,
        checkMoveThreshold,
    };
}
