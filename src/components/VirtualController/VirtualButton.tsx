'use client';

import React, { useRef } from 'react';
import { ButtonConfig } from './layouts';
import { useTouchHandlers } from './hooks/useTouchHandlers';
import { useTouchEvents } from './hooks/useTouchEvents';
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
  console?: string; // The specific console identifier (e.g. 'PSX', 'SNES')
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
  console = '',
}: VirtualButtonProps) {
  const t = useKoinTranslation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isSystemButton = config.type === 'start' || config.type === 'select' || config.type === 'menu';
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

  // Use shared touch events hook for event listener management
  useTouchEvents(buttonRef, {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  }, { cleanup });

  // Calculate position (percentage based)
  const leftPercent = (displayX / 100) * containerWidth - config.size / 2;
  const topPercent = (displayY / 100) * containerHeight - config.size / 2;

  // Use transform for hardware acceleration
  const transform = `translate3d(${leftPercent.toFixed(1)}px, ${topPercent.toFixed(1)}px, 0)`;

  // Get button styles
  const styles = getButtonStyles(config.type, isPressed, console);

  // Shape handling
  let borderRadius = '50%'; // Default circle
  let width = `${config.size}px`;
  // Aspect ratio adjustments for non-circle shapes
  if (config.shape === 'pill') {
    borderRadius = '20px';
    width = `${config.size * 1.8}px`; // Wider
  } else if (config.shape === 'rect') {
    borderRadius = '8px';
    width = `${config.size * 2.5}px`; // Much wider (shoulders)
  } else if (config.shape === 'square') {
    borderRadius = '12px';
  } else {
    // Default to circle, but check type if shape not explicitly set
    // A/B/X/Y/C/D/Z are typically circles
    // L/R are typically rects or specialized shapes
    if (['l', 'r', 'l2', 'r2'].includes(config.type)) {
      borderRadius = '10px';
      width = `${config.size * 2}px`;
    }
  }



  return (
    <button
      ref={buttonRef}
      className={`
        absolute flex items-center justify-center
        font-heading font-bold uppercase tracking-wider
        transition-all duration-75 select-none
        pointer-events-auto touch-manipulation
        backdrop-blur-sm
        ${isPressed ? '' : `${styles.bg} ${styles.border} ${styles.shadow}`} 
        ${styles.text}
        active:shadow-none
      `}
      style={{
        top: 0,
        left: 0,
        transform: transform + (isPressed ? ' scale(0.95)' : ''),
        willChange: 'transform',
        width: width,
        height: `${config.size}px`, // Height stays consistent
        minWidth: `${config.size}px`,
        fontSize: config.size < 50 ? '11px' : '16px',
        borderRadius,
        borderWidth: isPressed ? '0px' : '1.5px', // slightly thicker border
        lineHeight: '1',
        // Semi-transparent in landscape mode
        opacity: isLandscape ? 0.85 : 1,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // Direct style overrides if needed from getButtonStyles (for exact hex colors)
        backgroundColor: isPressed ? styles.bg.startsWith('bg-') ? undefined : styles.bg : styles.bg.startsWith('bg-') ? undefined : styles.bg,
        borderColor: isPressed ? undefined : styles.border.startsWith('border-') ? undefined : styles.border,
        color: styles.text.startsWith('text-') ? undefined : styles.text,
      }}
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Icon rendering logic could go here, for now using label */}
      <span className="drop-shadow-md">{label}</span>
    </button>
  );
});

export default VirtualButton;
