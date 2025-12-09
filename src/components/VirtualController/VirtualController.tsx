'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMobile } from '../../hooks/useMobile';
import { getLayoutForSystem } from './layouts';
import VirtualButton from './VirtualButton';
import Dpad from './Dpad';
import { ControlMapping } from '../../lib/controls/types';
import { adjustButtonPosition, PositioningContext } from './positioning';
import { useButtonPositions } from './useButtonPositions';
import { getKeyboardCode, dispatchKeyboardEvent } from './utils/keyboardEvents';
import {
  isFullscreen,
  setupFullscreenListener,
  getViewportSize,
  createOrientationChangeHandler,
} from './utils/viewport';

export interface VirtualControllerProps {
  system: string;
  isRunning: boolean;
  controls?: ControlMapping;
  systemColor?: string; // Console-specific color for theming
}

/**
 * Virtual gamepad controller for mobile devices
 * Renders console-specific button layouts and handles touch input
 */
export default function VirtualController({
  system,
  isRunning,
  controls,
  systemColor = '#00FF41', // Default retro green
}: VirtualControllerProps) {
  const { isMobile, isLandscape, isPortrait } = useMobile();
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isFullscreenState, setIsFullscreenState] = useState(false);
  const { getPosition, savePosition } = useButtonPositions();

  // Get layout for current system
  const layout = getLayoutForSystem(system);

  // Filter buttons based on orientation
  const visibleButtons = layout.buttons.filter((btn) => {
    if (isPortrait) {
      return btn.showInPortrait;
    }
    return btn.showInLandscape;
  });

  // Separate D-pad buttons from other buttons
  const DPAD_TYPES = ['up', 'down', 'left', 'right'];
  const dpadButtons = visibleButtons.filter(btn => DPAD_TYPES.includes(btn.type));

  // Update container size and fullscreen state
  useEffect(() => {
    const updateSize = () => {
      const { width, height } = getViewportSize();
      setContainerSize({ width, height });
      setIsFullscreenState(isFullscreen());
    };

    // Initial size
    updateSize();

    // Handle resize
    const handleResize = () => updateSize();

    // Check if viewport is ready (has valid dimensions)
    const checkViewportReady = (): boolean => {
      const { width, height } = getViewportSize();
      return width > 0 && height > 0;
    };

    // Handle orientation change with iOS-specific timing
    const handleOrientationChange = createOrientationChangeHandler(
      updateSize,
      checkViewportReady,
      3 // maxRafs
    );

    // Handle fullscreen changes
    const handleFullscreenChange = () => updateSize();

    // Listen to visual viewport changes (iOS Safari address bar show/hide)
    const handleVisualViewportResize = () => {
      // Only update if it's a significant change (not just address bar)
      const { height } = getViewportSize();
      const heightDiff = Math.abs(height - containerSize.height);
      if (heightDiff > 50) { // Threshold to ignore small address bar changes
        updateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Visual viewport API (iOS Safari address bar handling)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
      window.visualViewport.addEventListener('scroll', handleVisualViewportResize);
    }

    // Use centralized fullscreen listener utility
    const cleanupFullscreen = setupFullscreenListener(handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportResize);
      }
      cleanupFullscreen();
    };
  }, [containerSize.height]); // Include containerSize.height to check for significant changes

  // Get keyboard code for button type
  const getButtonKeyboardCode = useCallback(
    (buttonType: string): string | null => {
      return getKeyboardCode(buttonType, controls);
    },
    [controls]
  );

  // System buttons that work with tap (press + release)
  const SYSTEM_BUTTONS = ['start', 'select'];

  // Handle system buttons (start/select) - tap to press and release
  const handlePress = useCallback(
    (buttonType: string) => {
      // System buttons work as long as emulator exists
      // Game buttons only work when game is running
      const isSystemButton = SYSTEM_BUTTONS.includes(buttonType);
      if (!isSystemButton && !isRunning) {
        return;
      }

      const keyboardCode = getButtonKeyboardCode(buttonType);
      if (!keyboardCode) {
        return;
      }

      // Add to pressed set for visual feedback
      setPressedButtons((prev) => new Set(prev).add(buttonType));

      // Dispatch keydown
      dispatchKeyboardEvent('keydown', keyboardCode);

      // Dispatch keyup after a delay (simulates a tap)
      setTimeout(() => {
        dispatchKeyboardEvent('keyup', keyboardCode);
        setPressedButtons((prev) => {
          const next = new Set(prev);
          next.delete(buttonType);
          return next;
        });
      }, 100);
    },
    [isRunning, getButtonKeyboardCode]
  );

  // Handle game buttons (D-pad, A, B, etc.) - hold for continuous input
  const handlePressDown = useCallback(
    (buttonType: string) => {
      if (!isRunning) return;

      // System buttons use handlePress() instead
      const isSystemButton = SYSTEM_BUTTONS.includes(buttonType);
      if (isSystemButton) return;

      const keyboardCode = getButtonKeyboardCode(buttonType);
      if (!keyboardCode) return;

      // Optimization: Only update state if not already pressed to avoid re-renders
      setPressedButtons((prev) => {
        if (prev.has(buttonType)) return prev;
        const next = new Set(prev);
        next.add(buttonType);
        return next;
      });
      dispatchKeyboardEvent('keydown', keyboardCode);
    },
    [isRunning, getButtonKeyboardCode]
  );

  const handleRelease = useCallback(
    (buttonType: string) => {
      // System buttons use handlePress() instead
      const isSystemButton = SYSTEM_BUTTONS.includes(buttonType);
      if (isSystemButton) return;

      const keyboardCode = getButtonKeyboardCode(buttonType);
      if (!keyboardCode) return;

      // Optimization: Only update state if actually pressed
      setPressedButtons((prev) => {
        if (!prev.has(buttonType)) return prev;
        const next = new Set(prev);
        next.delete(buttonType);
        return next;
      });
      dispatchKeyboardEvent('keyup', keyboardCode);
    },
    [getButtonKeyboardCode]
  );

  // Release all buttons when game stops (only non-system buttons)
  useEffect(() => {
    if (!isRunning && pressedButtons.size > 0) {
      pressedButtons.forEach((buttonType) => {
        if (!SYSTEM_BUTTONS.includes(buttonType)) {
          handleRelease(buttonType);
        }
      });
      setPressedButtons(new Set());
    }
  }, [isRunning, pressedButtons, handleRelease]);

  // Optimize: Memoize button configurations to prevent creating new objects on every render
  // This ensures VirtualButton's React.memo works correctly when only 'isPressed' changes
  const memoizedButtonElements = useMemo(() => {
    // Use window dimensions if container size not yet calculated
    const width = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
    const height = containerSize.height || (typeof window !== 'undefined' ? window.innerHeight : 0);

    const context: PositioningContext = {
      isFullscreen: isFullscreenState,
    };

    return visibleButtons.map((buttonConfig) => {
      const adjustedConfig = adjustButtonPosition(buttonConfig, context);
      const customPosition = getPosition(buttonConfig.type, isLandscape);

      return {
        buttonConfig,
        adjustedConfig,
        customPosition,
        width,
        height
      };
    });
  }, [visibleButtons, containerSize, isLandscape, isFullscreenState, getPosition]); // Dependencies that actually change layout

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Don't render if no visible buttons
  if (visibleButtons.length === 0) {
    return null;
  }


  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      {/* Unified D-pad */}
      {dpadButtons.length > 0 && (
        <Dpad
          size={containerSize.width > containerSize.height ? 120 : 130}
          x={12}
          y={containerSize.width > containerSize.height ? 52 : 62}
          containerWidth={containerSize.width || window.innerWidth}
          containerHeight={containerSize.height || window.innerHeight}
          controls={controls}
          systemColor={systemColor}
          isLandscape={isLandscape}
        />
      )}

      {/* Other buttons (A, B, Start, Select, etc.) */}
      {memoizedButtonElements
        .filter(({ buttonConfig }) => !DPAD_TYPES.includes(buttonConfig.type))
        .map(({ buttonConfig, adjustedConfig, customPosition, width, height }) => (
          <VirtualButton
            key={buttonConfig.type}
            config={adjustedConfig}
            isPressed={pressedButtons.has(buttonConfig.type)}
            onPress={handlePress}
            onPressDown={handlePressDown}
            onRelease={handleRelease}
            containerWidth={width}
            containerHeight={height}
            customPosition={customPosition}
            onPositionChange={(x, y) => savePosition(buttonConfig.type, x, y, isLandscape)}
            isLandscape={isLandscape}
            systemColor={systemColor}
          />
        ))}
    </div>
  );
}

