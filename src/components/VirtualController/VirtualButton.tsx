'use client';

import React, { useRef, useEffect } from 'react';
import { ButtonConfig } from './layouts';
import { useTouchHandlers } from './hooks/useTouchHandlers';
import { getButtonStyles } from './utils/buttonStyles';

import { useKoinTranslation } from '../../hooks/useKoinTranslation';

export interface VirtualButtonProps {
  config: ButtonConfig;
  isPressed: boolean;
  onPress: (buttonType: string) => void;
  onPressDown?: (buttonType: string) => void;
  onRelease: (buttonType: string) => void;
  containerWidth: number;
  containerHeight: number;
  customPosition?: { x: number; y: number } | null; // Custom position from drag
  onPositionChange?: (x: number, y: number) => void; // Callback when position changes
  isLandscape?: boolean; // For semi-transparency in landscape
  systemColor?: string; // Console-specific color for theming
}

/**
 * Individual virtual button component
 * Handles touch events and provides visual feedback
 */
// Memoize to prevent re-renders when other buttons are pressed
const VirtualButton = React.memo(function VirtualButton({
  config,
  isPressed,
  onPress,
  onPressDown,
  onRelease,
  containerWidth,
  containerHeight,
  customPosition,
  onPositionChange,
  isLandscape = false,
  systemColor = '#00FF41', // Default retro green
}: VirtualButtonProps) {
  const t = useKoinTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isSystemButton = config.type === 'start' || config.type === 'select';
  const displayX = customPosition ? customPosition.x : config.x;
  const displayY = customPosition ? customPosition.y : config.y;

  let label = config.label;
  if (config.type === 'start') label = t.controls.startBtn;
  if (config.type === 'select') label = t.controls.selectBtn;

  // Setup touch handlers
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    cleanup,
  } = useTouchHandlers({
    buttonType: config.type,
    isSystemButton,
    buttonSize: config.size,
    displayX,
    displayY,
    containerWidth,
    containerHeight,
    onPress,
    onPressDown,
    onRelease,
    onPositionChange,
  });

  // Setup event listeners
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    button.addEventListener('touchstart', handleTouchStart, { passive: false });
    button.addEventListener('touchmove', handleTouchMove, { passive: false });
    button.addEventListener('touchend', handleTouchEnd, { passive: false });
    button.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchmove', handleTouchMove);
      button.removeEventListener('touchend', handleTouchEnd);
      button.removeEventListener('touchcancel', handleTouchCancel);
      cleanup();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, cleanup]);

  // Calculate position (percentage based)
  const leftPercent = (displayX / 100) * containerWidth - config.size / 2;
  const topPercent = (displayY / 100) * containerHeight - config.size / 2;

  // Use transform for hardware acceleration
  // We use translate3d to force GPU layer promotion
  const transform = `translate3d(${leftPercent.toFixed(1)}px, ${topPercent.toFixed(1)}px, 0)`;

  // Get button styles
  const styles = getButtonStyles(config.type, isPressed);

  // A/B buttons are circular, others are square
  const isActionButton = config.type === 'a' || config.type === 'b';
  const borderRadius = isActionButton ? '50%' : '0';

  // When pressed, use system color
  const pressedStyle = isPressed ? {
    backgroundColor: systemColor,
    color: '#000000',
    borderColor: '#FFFFFF',
  } : {};

  return (
    <button
      ref={buttonRef}
      className={`
        absolute border-4 font-heading font-bold uppercase tracking-wider
        transition-all duration-100 select-none
        pointer-events-auto touch-manipulation
        ${isPressed ? '' : `${styles.bg} ${styles.text} ${styles.border} ${styles.shadow}`} ${styles.transform}
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
      `}
      style={{
        // Remove left/top and use transform instead for high performance (compositor only)
        top: 0,
        left: 0,
        transform,
        willChange: 'transform',
        width: `${config.size}px`,
        height: `${config.size}px`,
        minWidth: `${config.size}px`,
        minHeight: `${config.size}px`,
        fontSize: config.size < 50 ? '10px' : '12px',
        borderRadius,
        lineHeight: '1',
        // Semi-transparent in landscape mode
        opacity: isLandscape ? 0.85 : 1,
        // Prevent context menu on long-press
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        ...pressedStyle,
      }}
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
});

export default VirtualButton;

