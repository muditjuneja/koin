/**
 * Console-specific virtual controller layouts
 * Defines button positions, sizes, and visibility for different consoles
 */

export type ButtonType = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'l' | 'r' | 'start' | 'select' | 'c';

export interface ButtonConfig {
  type: ButtonType;
  label: string;
  x: number; // Position as percentage of container width (0-100)
  y: number; // Position as percentage of container height (0-100)
  size: number; // Size in pixels (minimum 44px for touch)
  showInPortrait: boolean; // Whether to show in portrait mode
  showInLandscape: boolean; // Whether to show in landscape mode
}

export interface ControllerLayout {
  console: string;
  buttons: ButtonConfig[];
}

// Button sizes (reduced for better space efficiency)
const BUTTON_SMALL = 42;
const BUTTON_MEDIUM = 50;
const BUTTON_LARGE = 56;

/**
 * NES Layout
 * D-pad (left), A/B buttons (right), Start/Select (top corners in landscape)
 */
export const NES_LAYOUT: ControllerLayout = {
  console: 'NES',
  buttons: [
    // D-pad (bottom-left) - Portrait: y: 75-85
    { type: 'up', label: '↑', x: 10, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 10, y: 85, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 15, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons (bottom-right) - Portrait: y: 80
    { type: 'b', label: 'B', x: 85, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 95, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    // System buttons - Portrait: bottom center, Landscape: top corners (adjusted in positioning.ts)
    { type: 'select', label: 'SELECT', x: 45, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'start', label: 'START', x: 55, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

/**
 * SNES Layout
 * D-pad (left), A/B/X/Y buttons (right), L/R (top), Start/Select (center-bottom)
 * Landscape positions adjusted higher to avoid control bar
 */
export const SNES_LAYOUT: ControllerLayout = {
  console: 'SNES',
  buttons: [
    // D-pad (bottom-left) - Portrait: y: 70-80, Landscape: y: 50-60
    { type: 'up', label: '↑', x: 10, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 10, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 15, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons (bottom-right) - SNES diamond layout - Portrait: y: 70-80, Landscape: y: 50-60
    { type: 'y', label: 'Y', x: 80, y: 70, size: BUTTON_MEDIUM, showInPortrait: false, showInLandscape: true },
    { type: 'x', label: 'X', x: 90, y: 70, size: BUTTON_MEDIUM, showInPortrait: false, showInLandscape: true },
    { type: 'b', label: 'B', x: 85, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 95, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Shoulder buttons (top corners) - stay at top
    { type: 'l', label: 'L', x: 10, y: 10, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },
    { type: 'r', label: 'R', x: 90, y: 10, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },

    // System buttons - Portrait: y: 90, Landscape: y: 65
    { type: 'select', label: 'SELECT', x: 45, y: 90, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },
    { type: 'start', label: 'START', x: 55, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

/**
 * Game Boy / Game Boy Color Layout
 * Similar to NES but optimized for handheld
 * Landscape positions adjusted higher
 */
export const GB_LAYOUT: ControllerLayout = {
  console: 'GB',
  buttons: [
    // D-pad (bottom-left) - Portrait: y: 75-85, Landscape: y: 55-65
    { type: 'up', label: '↑', x: 10, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 10, y: 85, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 15, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons (bottom-right) - Portrait: y: 80, Landscape: y: 60
    { type: 'b', label: 'B', x: 85, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 95, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    // System buttons - Portrait: y: 90, Landscape: y: 65
    { type: 'select', label: 'SELECT', x: 45, y: 90, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },
    { type: 'start', label: 'START', x: 55, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

/**
 * Game Boy Advance Layout
 * D-pad, A/B, L/R, Start/Select
 * Landscape positions adjusted higher
 */
export const GBA_LAYOUT: ControllerLayout = {
  console: 'GBA',
  buttons: [
    // D-pad (bottom-left) - Portrait: y: 70-80, Landscape: y: 50-60
    { type: 'up', label: '↑', x: 10, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 10, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 15, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons (bottom-right) - Portrait: y: 80, Landscape: y: 60
    { type: 'b', label: 'B', x: 85, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 95, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    // Shoulder buttons (top corners) - stay at top
    { type: 'l', label: 'L', x: 10, y: 10, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },
    { type: 'r', label: 'R', x: 90, y: 10, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },

    // System buttons - Portrait: y: 90, Landscape: y: 65
    { type: 'select', label: 'SELECT', x: 45, y: 90, size: BUTTON_SMALL, showInPortrait: false, showInLandscape: true },
    { type: 'start', label: 'START', x: 55, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

/**
 * Sega Genesis Layout
 * D-pad, A/B/C, Start
 * Landscape positions adjusted higher
 */
export const GENESIS_LAYOUT: ControllerLayout = {
  console: 'GENESIS',
  buttons: [
    // D-pad (bottom-left) - Portrait: y: 70-80, Landscape: y: 50-60
    { type: 'up', label: '↑', x: 10, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 10, y: 80, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 15, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons (bottom-right) - Genesis has A/B/C in a row - Portrait: y: 75-80, Landscape: y: 55-60
    { type: 'c', label: 'C', x: 80, y: 75, size: BUTTON_MEDIUM, showInPortrait: false, showInLandscape: true },
    { type: 'b', label: 'B', x: 90, y: 75, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 95, y: 80, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    // System button - Portrait: y: 90, Landscape: y: 65
    { type: 'start', label: 'START', x: 55, y: 90, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

/**
 * Get the appropriate layout for a given console/system
 */
export function getLayoutForSystem(system: string): ControllerLayout {
  const normalized = system.toUpperCase().trim();

  // Map system names to layouts
  if (normalized.includes('NES') || normalized.includes('NINTENDO ENTERTAINMENT SYSTEM')) {
    return NES_LAYOUT;
  }

  if (normalized.includes('SNES') || normalized.includes('SUPER NINTENDO')) {
    return SNES_LAYOUT;
  }

  if (normalized.includes('GAME BOY') || normalized.includes('GAMEBOY') || normalized === 'GB' || normalized === 'GBC') {
    // Check if it's GBA
    if (normalized.includes('ADVANCE') || normalized === 'GBA') {
      return GBA_LAYOUT;
    }
    return GB_LAYOUT;
  }

  if (normalized.includes('GENESIS') || normalized.includes('MEGA DRIVE') || normalized.includes('SEGA GENESIS')) {
    return GENESIS_LAYOUT;
  }

  // Default to SNES layout (most buttons, works for most systems)
  return SNES_LAYOUT;
}

