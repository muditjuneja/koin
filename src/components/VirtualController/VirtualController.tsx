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
import ControlsHint from './ControlsHint';
import LockButton from './LockButton';

const LOCK_KEY = 'koin-controls-locked';

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
  const [isLocked, setIsLocked] = useState(true); // Default locked
  const { getPosition, savePosition } = useButtonPositions();

  // Load lock state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCK_KEY);
    if (stored !== null) {
      setIsLocked(stored === 'true');
    }
  }, []);

  // Toggle lock and persist
  const toggleLock = useCallback(() => {
    setIsLocked(prev => {
      const newValue = !prev;
      localStorage.setItem(LOCK_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Get layout for current system
  const layout = getLayoutForSystem(system);

  // Filter buttons based on orientation
  const visibleButtons = layout.buttons.filter((btn) => {
    if (isPortrait) {
      return btn.showInPortrait;
    }
    return btn.showInLandscape;
  });

  // Separate D-pad buttons from other buttons (though we rely on the Dpad component for directions)
  // We keep them in the layout definition for completeness or future fallback
  const DPAD_TYPES = ['up', 'down', 'left', 'right'];

  // NOTE: Unlike before, we don't render individual d-pad buttons from the layout array.
  // The Dpad component handles all directional input.

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
  const SYSTEM_BUTTONS = ['start', 'select', 'menu'];

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

  // Responsive sizing for D-pad
  const dpadSize = containerSize.width > containerSize.height ? 160 : 180;
  const dpadY = containerSize.width > containerSize.height ? 55 : 62;

  // For Neo Geo, D-pad might need to be slightly higher to avoid overlap if 4 buttons are curved
  const finalDpadY = system.toUpperCase() === 'NEOGEO' ? dpadY - 5 : dpadY;

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      {/* Lock/Unlock button */}
      <LockButton
        isLocked={isLocked}
        onToggle={toggleLock}
        systemColor={systemColor}
      />

      {/* Unified D-pad */}
      <Dpad
        size={dpadSize}
        x={14}
        y={finalDpadY}
        containerWidth={containerSize.width || window.innerWidth}
        containerHeight={containerSize.height || window.innerHeight}
        controls={controls}
        systemColor={systemColor}
        isLandscape={isLandscape}
        customPosition={getPosition('up', isLandscape)} // 'up' acts as dpad position key
        onPositionChange={isLocked ? undefined : (x, y) => savePosition('up', x, y, isLandscape)}
      />

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
            onPositionChange={isLocked ? undefined : (x, y) => savePosition(buttonConfig.type, x, y, isLandscape)}
            isLandscape={isLandscape}
            console={layout.console} // Important: pass the specific console for styling
          />))}

      {/* First-time hint */}
      <ControlsHint isVisible={isRunning} />
    </div>
  );
}
