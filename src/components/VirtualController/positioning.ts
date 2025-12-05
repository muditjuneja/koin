/**
 * Positioning system for virtual controller buttons
 * Adjusts button positions based on orientation and fullscreen state
 */

import { ButtonConfig, ButtonType } from './layouts';

export interface PositioningContext {
  isLandscape: boolean;
  isFullscreen: boolean;
  containerWidth: number;
  containerHeight: number;
}

// Constants
const CONTROL_BAR_HEIGHT = 60; // pixels
const NAVBAR_HEIGHT = 40; // pixels
const FULLSCREEN_SIZE_MULTIPLIER = 1;
const BOTTOM_MARGIN = 8; // percentage
const TOP_MARGIN = 4; // percentage

// Button position configurations for landscape mode
const LANDSCAPE_POSITIONS: Record<ButtonType, (baseY: number, navbarPercent: number) => { x: number; y: number }> = {
  // D-pad buttons - left side, bottom area
  up: (baseY) => ({ x: 12, y: baseY - 8 }),
  down: (baseY) => ({ x: 12, y: baseY + 8 }),
  left: (baseY) => ({ x: 4, y: baseY }),
  right: (baseY) => ({ x: 20, y: baseY }),

  // Action buttons - right side, bottom area
  a: (baseY) => ({ x: 92, y: baseY }),
  b: (baseY) => ({ x: 82, y: baseY }),
  x: (baseY) => ({ x: 82, y: baseY - 10 }),
  y: (baseY) => ({ x: 92, y: baseY - 10 }),
  c: (baseY) => ({ x: 72, y: baseY }),

  // System buttons - top corners
  select: (_, navbarPercent) => ({ x: 8, y: navbarPercent + TOP_MARGIN }),
  start: (_, navbarPercent) => ({ x: 88, y: navbarPercent + TOP_MARGIN }),

  // Shoulder buttons - top corners
  l: (_, navbarPercent) => ({ x: 8, y: navbarPercent + TOP_MARGIN }),
  r: (_, navbarPercent) => ({ x: 88, y: navbarPercent + TOP_MARGIN }),
};

/**
 * Calculate button position for landscape mode
 */
function calculateLandscapePosition(
  buttonType: ButtonType,
  baseY: number,
  navbarPercent: number
): { x: number; y: number } {
  const positionFn = LANDSCAPE_POSITIONS[buttonType];
  if (positionFn) {
    return positionFn(baseY, navbarPercent);
  }
  // Fallback to default (shouldn't happen)
  return { x: 50, y: 50 };
}

/**
 * Adjust button position based on orientation and fullscreen state
 */
export function adjustButtonPosition(
  config: ButtonConfig,
  context: PositioningContext
): ButtonConfig {
  const { isLandscape, isFullscreen, containerHeight } = context;

  // In portrait mode, use original positions
  if (!isLandscape) {
    return config;
  }

  // Calculate safe areas based on viewport
  const controlBarHeight = isFullscreen ? 0 : CONTROL_BAR_HEIGHT;
  const controlBarPercent = (controlBarHeight / containerHeight) * 100;
  const navbarPercent = (NAVBAR_HEIGHT / containerHeight) * 100;

  // Base Y position for game buttons (D-pad and action buttons)
  const baseY = isFullscreen
    ? 82 // Lower in fullscreen (no control bar)
    : 100 - controlBarPercent - BOTTOM_MARGIN; // Above control bar with margin

  // Calculate adjusted position
  const { x: adjustedX, y: adjustedY } = calculateLandscapePosition(
    config.type,
    baseY,
    navbarPercent
  );

  // Size multiplier for fullscreen
  const adjustedSize = isFullscreen
    ? Math.floor(config.size * FULLSCREEN_SIZE_MULTIPLIER)
    : config.size;

  return {
    ...config,
    x: adjustedX,
    y: adjustedY,
    size: adjustedSize,
  };
}
