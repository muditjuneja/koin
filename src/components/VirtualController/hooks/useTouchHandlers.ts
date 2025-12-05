/**
 * Hook for handling touch events on virtual buttons
 * Handles both button presses and drag functionality
 */

import { useRef, useCallback } from 'react';
import { ButtonType } from '../layouts';

export interface UseTouchHandlersProps {
  buttonType: ButtonType;
  isSystemButton: boolean;
  buttonSize: number;
  displayX: number;
  displayY: number;
  containerWidth: number;
  containerHeight: number;
  onPress: (buttonType: string) => void;
  onPressDown?: (buttonType: string) => void;
  onRelease: (buttonType: string) => void;
  onPositionChange?: (x: number, y: number) => void;
}

export interface TouchHandlers {
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent) => void;
  handleTouchCancel: (e: TouchEvent) => void;
  cleanup: () => void;
}

const DRAG_HOLD_DELAY = 300; // ms
const DRAG_MOVE_THRESHOLD = 10; // pixels
const DRAG_CENTER_THRESHOLD = 0.4; // 40% of button size

export function useTouchHandlers({
  buttonType,
  isSystemButton,
  buttonSize,
  displayX,
  displayY,
  containerWidth,
  containerHeight,
  onPress,
  onPressDown,
  onRelease,
  onPositionChange,
}: UseTouchHandlersProps): TouchHandlers {
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const clearDragTimer = useCallback(() => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
  }, []);

  const startDragging = useCallback(
    (touchX: number, touchY: number) => {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: touchX - (displayX / 100) * containerWidth,
        y: touchY - (displayY / 100) * containerHeight,
      };
      // Release button press when drag starts
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    [displayX, displayY, containerWidth, containerHeight, isSystemButton, buttonType, onRelease]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Always allow button press first
      e.preventDefault();
      e.stopPropagation();

      if (isSystemButton) {
        onPress(buttonType);
      } else if (onPressDown) {
        onPressDown(buttonType);
      }

      // Setup drag detection if enabled
      if (onPositionChange) {
        const target = e.currentTarget as HTMLElement;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(touch.clientX - centerX, 2) + Math.pow(touch.clientY - centerY, 2)
        );
        const dragThreshold = buttonSize * DRAG_CENTER_THRESHOLD;

        // Only enable drag if touch is near center
        if (distance < dragThreshold) {
          // Start drag timer - if user holds for delay, enable dragging
          dragTimerRef.current = setTimeout(() => {
            if (!isDraggingRef.current) {
              startDragging(touch.clientX, touch.clientY);
            }
          }, DRAG_HOLD_DELAY);
        }
      }
    },
    [isSystemButton, buttonType, onPress, onPressDown, onPositionChange, buttonSize, startDragging]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];

      // Check if user moved significantly (start drag immediately if moved)
      if (onPositionChange && !isDraggingRef.current) {
        const moveDistance = Math.sqrt(
          Math.pow(touch.clientX - touchStartPosRef.current.x, 2) +
          Math.pow(touch.clientY - touchStartPosRef.current.y, 2)
        );

        // If moved more than threshold, start dragging immediately
        if (moveDistance > DRAG_MOVE_THRESHOLD) {
          clearDragTimer();
          startDragging(touch.clientX, touch.clientY);
        }
      }

      // Handle drag movement
      if (isDraggingRef.current && onPositionChange) {
        e.preventDefault();
        e.stopPropagation();

        const newX = touch.clientX - dragStartRef.current.x;
        const newY = touch.clientY - dragStartRef.current.y;

        // Convert to percentage
        const newXPercent = (newX / containerWidth) * 100;
        const newYPercent = (newY / containerHeight) * 100;

        // Constrain to screen bounds (with margin for button size)
        const margin = (buttonSize / 2 / Math.min(containerWidth, containerHeight)) * 100;
        const constrainedX = Math.max(margin, Math.min(100 - margin, newXPercent));
        const constrainedY = Math.max(margin, Math.min(100 - margin, newYPercent));

        onPositionChange(constrainedX, constrainedY);
      }
    },
    [onPositionChange, clearDragTimer, startDragging, containerWidth, containerHeight, buttonSize]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      clearDragTimer();

      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = false;
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Only release if not a system button (system buttons use press() which auto-releases)
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    [clearDragTimer, isSystemButton, buttonType, onRelease]
  );

  const handleTouchCancel = useCallback(
    (e: TouchEvent) => {
      clearDragTimer();

      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = false;
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Only release if not a system button
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    [clearDragTimer, isSystemButton, buttonType, onRelease]
  );

  const cleanup = useCallback(() => {
    clearDragTimer();
  }, [clearDragTimer]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    cleanup,
  };
}

