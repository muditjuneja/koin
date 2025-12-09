/**
 * Console-specific virtual controller layouts
 * 
 * POSITIONING:
 * - D-pad: Bottom-left, y: 55-70% (above control bar)
 * - Action: Bottom-right, y: 50-65%
 * - System: Top center (x:38/62, y:8)
 */

export type ButtonType = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'l' | 'r' | 'start' | 'select' | 'c';

export interface ButtonConfig {
  type: ButtonType;
  label: string;
  x: number;
  y: number;
  size: number;
  showInPortrait: boolean;
  showInLandscape: boolean;
}

export interface ControllerLayout {
  console: string;
  buttons: ButtonConfig[];
}

const BUTTON_SMALL = 44;
const BUTTON_MEDIUM = 52;
const BUTTON_LARGE = 60;

/**
 * NES Layout
 */
export const NES_LAYOUT: ControllerLayout = {
  console: 'NES',
  buttons: [
    // D-pad - y:55-70 to stay above control bar
    { type: 'up', label: '↑', x: 12, y: 55, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 12, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 62, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 19, y: 62, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    // Action buttons
    { type: 'b', label: 'B', x: 80, y: 64, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 92, y: 56, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    // System buttons - top center
    { type: 'select', label: 'SEL', x: 38, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'start', label: 'START', x: 62, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

export const SNES_LAYOUT: ControllerLayout = {
  console: 'SNES',
  buttons: [
    { type: 'up', label: '↑', x: 12, y: 45, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 12, y: 60, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 19, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'y', label: 'Y', x: 76, y: 45, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'X', x: 88, y: 37, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 88, y: 53, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 96, y: 45, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'l', label: 'L', x: 8, y: 18, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'r', label: 'R', x: 92, y: 18, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },

    { type: 'select', label: 'SEL', x: 38, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'start', label: 'START', x: 62, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

export const GB_LAYOUT: ControllerLayout = {
  console: 'GB',
  buttons: [
    { type: 'up', label: '↑', x: 12, y: 55, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 12, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 62, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 19, y: 62, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'b', label: 'B', x: 80, y: 64, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 92, y: 56, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    { type: 'select', label: 'SEL', x: 38, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'start', label: 'START', x: 62, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

export const GBA_LAYOUT: ControllerLayout = {
  console: 'GBA',
  buttons: [
    { type: 'up', label: '↑', x: 12, y: 45, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 12, y: 60, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 19, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'b', label: 'B', x: 82, y: 55, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 94, y: 45, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },

    { type: 'l', label: 'L', x: 8, y: 18, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'r', label: 'R', x: 92, y: 18, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },

    { type: 'select', label: 'SEL', x: 38, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
    { type: 'start', label: 'START', x: 62, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

export const GENESIS_LAYOUT: ControllerLayout = {
  console: 'GENESIS',
  buttons: [
    { type: 'up', label: '↑', x: 12, y: 45, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'down', label: '↓', x: 12, y: 60, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'left', label: '←', x: 5, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'right', label: '→', x: 19, y: 52, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'a', label: 'A', x: 74, y: 56, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 85, y: 48, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'c', label: 'C', x: 96, y: 40, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },

    { type: 'start', label: 'START', x: 50, y: 8, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true },
  ],
};

export function getLayoutForSystem(system: string): ControllerLayout {
  const n = system.toUpperCase();
  if (n.includes('NES') || n.includes('FAMICOM')) return NES_LAYOUT;
  if (n.includes('SNES') || n.includes('SUPER')) return SNES_LAYOUT;
  if (n.includes('GBA') || n.includes('ADVANCE')) return GBA_LAYOUT;
  if (n.includes('GB') || n.includes('GAME BOY')) return GB_LAYOUT;
  if (n.includes('GENESIS') || n.includes('MEGA')) return GENESIS_LAYOUT;
  return NES_LAYOUT;
}
