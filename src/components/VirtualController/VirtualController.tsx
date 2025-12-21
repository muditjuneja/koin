'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMobile } from '../../hooks/useMobile';
import { getLayoutForSystem } from './layouts';
import VirtualButton from './VirtualButton';
import Dpad from './Dpad';
import { ControlMapping } from '../../lib/controls/types';
import { adjustButtonPosition, PositioningContext } from './positioning';
import { useOrientationBehavior } from './useOrientationBehavior';
import { getKeyboardCode } from './utils/keyboardEvents';
import {
  isFullscreen,
  setupFullscreenListener,
  getViewportSize,
  createOrientationChangeHandler,
} from './utils/viewport';
import ControlsHint from './ControlsHint';
import LayoutButton from './LayoutButton';
import HoldButton from './HoldButton';
import TurboButton from './TurboButton';
import ModeOverlay from './ModeOverlay';
import OrientationOverlay from './OrientationOverlay';
import { useControllerModes } from './hooks/useControllerModes';
import { useControllerLayout } from './hooks/useControllerLayout';

export interface VirtualControllerProps {
  system: string;
  isRunning: boolean;
  controls?: ControlMapping;
  systemColor?: string; // Console-specific color for theming
  hapticsEnabled?: boolean;
  /** Callback when button is pressed down - uses Nostalgist API */
  onButtonDown: (button: string) => void;
  /** Callback when button is released - uses Nostalgist API */
  onButtonUp: (button: string) => void;
  /** Pause game (for hold mode) */
  onPause: () => void;
  /** Resume game (after hold mode exit) */
  onResume: () => void;
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
  hapticsEnabled = true,
  onButtonDown,
  onButtonUp,
  onPause,
  onResume,
}: VirtualControllerProps) {
  const { isMobile, isLandscape, isPortrait } = useMobile();
  const [pressedButtons, setPressedButtons] = useState<Set<string>>(new Set());
  const pressedButtonsRef = useRef<Set<string>>(new Set()); // Ref for turbo effect to avoid stale closure
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isFullscreenState, setIsFullscreenState] = useState(false);

  // Layout Management Hook
  const { isLocked, toggleLock, getPosition, savePosition } = useControllerLayout({
    onPause,
    onResume
  });

  // Mode Management Hook (Hold, Turbo)
  const {
    isHoldMode,
    heldButtons,
    toggleHoldMode,
    isTurboMode,
    turboButtons,
    toggleTurboMode,
    handleModePress,
    shouldBlockRelease
  } = useControllerModes({
    isRunning,
    hapticsEnabled,
    onPause,
    onResume,
    onButtonUp,
    onButtonDown
  });

  const { isDismissed, dismissOverlay } = useOrientationBehavior({
    isPortrait,
    isRunning,
    onPause
  });

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

      // Dispatch press using Nostalgist API
      onButtonDown(buttonType);
      setTimeout(() => {
        onButtonUp(buttonType);
        setPressedButtons((prev) => {
          const next = new Set(prev);
          next.delete(buttonType);
          return next;
        });
      }, 100);
    },
    [isRunning, getButtonKeyboardCode, onButtonDown, onButtonUp]
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

      // Try to handle with special modes first (Hold/Turbo)
      // returns true if the event was intercepted/handled by a mode
      if (handleModePress(buttonType)) {
        return;
      }

      // Optimization: Only update state if not already pressed to avoid re-renders
      setPressedButtons((prev) => {
        if (prev.has(buttonType)) return prev;
        const next = new Set(prev);
        next.add(buttonType);
        return next;
      });

      // If already held via Hold Mode, don't dispatch keydown again
      if (!heldButtons.has(buttonType)) {
        onButtonDown(buttonType);
      }
    },
    [isRunning, getButtonKeyboardCode, handleModePress, heldButtons, onButtonDown]
  );

  const handleRelease = useCallback(
    (buttonType: string) => {
      // System buttons use handlePress() instead
      const isSystemButton = SYSTEM_BUTTONS.includes(buttonType);
      if (isSystemButton) return;

      const keyboardCode = getButtonKeyboardCode(buttonType);
      if (!keyboardCode) return;

      // Check if release event should be blocked (e.g. by specialized modes)
      if (shouldBlockRelease(buttonType)) {
        return;
      }

      // Optimization: Only update state if actually pressed
      setPressedButtons((prev) => {
        if (!prev.has(buttonType)) return prev;
        const next = new Set(prev);
        next.delete(buttonType);
        return next;
      });

      onButtonUp(buttonType);
    },
    [getButtonKeyboardCode, shouldBlockRelease, onButtonUp]
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

  // Turbo Fire effect - rapidly press/release buttons using Nostalgist API
  const TURBO_RATE = 15; // 15 presses per second

  // Keep ref in sync with state (for turbo effect to read without stale closure)
  useEffect(() => {
    pressedButtonsRef.current = pressedButtons;
  }, [pressedButtons]);

  useEffect(() => {
    // Run if NOT in config mode AND has buttons
    if (isTurboMode || turboButtons.size === 0) return;

    const interval = setInterval(() => {
      turboButtons.forEach(buttonType => {
        // TURBO LOGIC: Only fire if the button is physically pressed!
        // Use ref to get latest pressed state without recreating interval
        if (pressedButtonsRef.current.has(buttonType)) {
          onButtonDown(buttonType);
          setTimeout(() => onButtonUp(buttonType), 25);
        }
      });
    }, 1000 / TURBO_RATE);

    return () => clearInterval(interval);
  }, [isTurboMode, turboButtons, onButtonDown, onButtonUp]);

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

  // Responsive sizing for D-pad
  const dpadSize = containerSize.width > containerSize.height ? 160 : 180;
  const dpadY = containerSize.width > containerSize.height ? 55 : 62;

  // For Neo Geo, D-pad might need to be slightly higher to avoid overlap if 4 buttons are curved
  const finalDpadY = system.toUpperCase() === 'NEOGEO' ? dpadY - 5 : dpadY;


  // Create stable position change handlers to preserve React.memo on buttons
  // This prevents all buttons from re-rendering when one button is pressed (which updates pressedButtons state)
  const positionHandlerMap = useMemo(() => {
    if (isLocked) return {};

    const handlers: Record<string, (x: number, y: number) => void> = {};

    // Handler for D-pad
    handlers['up'] = (x, y) => savePosition('up', x, y, isLandscape); // 'up' key is used for D-pad root

    // Handlers for other buttons
    visibleButtons.forEach(btn => {
      handlers[btn.type] = (x, y) => savePosition(btn.type, x, y, isLandscape);
    });

    return handlers;
  }, [isLocked, visibleButtons, savePosition, isLandscape]);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // PORTRAIT MODE: Show orientation warning overlay instead of controls
  if (isPortrait) {
    if (isDismissed) {
      return null;
    }
    return <OrientationOverlay systemColor={systemColor} onDismiss={dismissOverlay} />;
  }

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex gap-4">
        <LayoutButton
          isActive={!isLocked}
          onToggle={toggleLock}
          systemColor={systemColor}
        />
        <HoldButton
          isActive={isHoldMode}
          onToggle={toggleHoldMode}
          systemColor={systemColor}
        />
        <TurboButton
          isActive={isTurboMode}
          onToggle={toggleTurboMode}
          systemColor={systemColor}
        />
      </div>

      {/* Unified D-pad */}
      <Dpad
        size={dpadSize}
        x={14}
        y={finalDpadY}
        containerWidth={containerSize.width || window.innerWidth}
        containerHeight={containerSize.height || window.innerHeight}
        systemColor={systemColor}
        isLandscape={isLandscape}
        customPosition={getPosition('up', isLandscape)} // 'up' acts as dpad position key
        onPositionChange={isLocked ? undefined : positionHandlerMap['up']}
        hapticsEnabled={hapticsEnabled}
        onButtonDown={onButtonDown}
        onButtonUp={onButtonUp}
      />

      {/* Other buttons (A, B, Start, Select, etc.) */}
      {memoizedButtonElements
        .filter(({ buttonConfig }) => !DPAD_TYPES.includes(buttonConfig.type))
        .map(({ buttonConfig, adjustedConfig, customPosition, width, height }) => (
          <VirtualButton
            key={buttonConfig.type}
            config={adjustedConfig}
            isPressed={pressedButtons.has(buttonConfig.type) || heldButtons.has(buttonConfig.type)}
            onPress={handlePress}
            onPressDown={handlePressDown}
            onRelease={handleRelease}
            containerWidth={width}
            containerHeight={height}
            customPosition={customPosition}
            onPositionChange={isLocked ? undefined : positionHandlerMap[buttonConfig.type]}
            isLandscape={isLandscape}
            console={layout.console}
            hapticsEnabled={hapticsEnabled}
            mode={isHoldMode ? 'hold' : isTurboMode ? 'turbo' : 'normal'}
            isHeld={heldButtons.has(buttonConfig.type)}
            isInTurbo={turboButtons.has(buttonConfig.type)}
          />))}

      {/* Mode Overlay (Hold, Turbo, or Layout) */}
      {(isHoldMode || isTurboMode || !isLocked) && (
        <ModeOverlay
          mode={isHoldMode ? 'hold' : isTurboMode ? 'turbo' : 'layout'}
          heldButtons={heldButtons}
          turboButtons={turboButtons}
          systemColor={systemColor}
          onExit={isHoldMode ? toggleHoldMode : isTurboMode ? toggleTurboMode : toggleLock}
        />
      )}

      {/* First-time hint */}
      <ControlsHint isVisible={isRunning} systemColor={systemColor} />
    </div>
  );
}

