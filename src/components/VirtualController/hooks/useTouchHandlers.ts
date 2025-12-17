/**
 * Hook for handling touch events on virtual buttons
 * Handles both button presses and drag functionality via useDrag
 */

import { useRef, useCallback } from 'react';
import { ButtonType } from '../layouts';
import { useDrag } from './useDrag';

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

  // Use shared drag hook
  const drag = useDrag({
    elementSize: buttonSize,
    displayX,
    displayY,
    containerWidth,
    containerHeight,
    onPositionChange,
    centerThreshold: 0.4,
    onDragStart: () => {
      isDraggingRef.current = true;
      // Release button press when drag starts
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    onDragEnd: () => {
      isDraggingRef.current = false;
    },
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];

      // Always prevent default to avoid delays and context menus
      e.preventDefault();
      e.stopPropagation();

      // Haptic feedback for tactile response
      if (navigator.vibrate) {
        navigator.vibrate(8); // Very short 8ms pulse
      }

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
        drag.checkDragStart(touch.clientX, touch.clientY, rect);
      }
    },
    [isSystemButton, buttonType, onPress, onPressDown, onPositionChange, drag]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];

      // Check if user moved significantly (start drag immediately if moved)
      if (onPositionChange && !isDraggingRef.current) {
        drag.checkMoveThreshold(touch.clientX, touch.clientY);
      }

      // Handle drag movement
      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        drag.handleDragMove(touch.clientX, touch.clientY);
      }
    },
    [onPositionChange, drag]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      drag.clearDragTimer();

      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        drag.handleDragEnd();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Only release if not a system button (system buttons use press() which auto-releases)
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    [drag, isSystemButton, buttonType, onRelease]
  );

  const handleTouchCancel = useCallback(
    (e: TouchEvent) => {
      drag.clearDragTimer();

      if (isDraggingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        drag.handleDragEnd();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Only release if not a system button
      if (!isSystemButton) {
        onRelease(buttonType);
      }
    },
    [drag, isSystemButton, buttonType, onRelease]
  );

  const cleanup = useCallback(() => {
    drag.clearDragTimer();
  }, [drag]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    cleanup,
  };
}
