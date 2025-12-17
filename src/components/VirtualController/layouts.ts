/**
 * Console-specific virtual controller layouts
 * 
 * IMPORTANT: Button `type` maps to RetroPad standard buttons.
 * Button `label` is what the user sees on screen.
 * 
 * POSITIONING (percentage of screen):
 * - D-pad: Bottom-left (~14%, ~62%)
 * - Action buttons: Bottom-right (~75-95%, ~45-70%)
 * - System buttons: Top center (~38-62%, ~8%)
 * - Shoulders: Top corners (~8%, ~92%, ~20%)
 */

import { ButtonId } from '../../lib/controls/types';

export type ButtonType = ButtonId | 'menu';

export interface ButtonConfig {
  type: ButtonType;
  label: string;
  x: number;
  y: number;
  size: number;
  showInPortrait: boolean;
  showInLandscape: boolean;
  shape?: 'circle' | 'square' | 'rect' | 'pill';
}

export interface ControllerLayout {
  console: string;
  buttons: ButtonConfig[];
}

// --- SIZE CONSTANTS ---
const BUTTON_SMALL = 44;
const BUTTON_MEDIUM = 56;
const BUTTON_LARGE = 68;

// --- POSITION CONSTANTS ---
const START_SELECT_Y = 8;
const SELECT_X = 38;
const START_X = 62;

// --- SHARED D-PAD BUTTONS (filtered out, handled by Dpad component) ---
const DPAD_BUTTONS: ButtonConfig[] = [
  { type: 'up', label: '↑', x: 14, y: 55, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
  { type: 'down', label: '↓', x: 14, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
  { type: 'left', label: '←', x: 6, y: 62.5, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
  { type: 'right', label: '→', x: 22, y: 62.5, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
];

// --- LAYOUTS ---

/**
 * 2-Button Layout (NES, GB, GBC, Master System, Game Gear, TG-16, Atari)
 */
export const TWO_BUTTON_LAYOUT: ControllerLayout = {
  console: '2BUTTON',
  buttons: [
    ...DPAD_BUTTONS,
    { type: 'b', label: 'B', x: 78, y: 66, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 90, y: 56, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * SNES Layout (4 Face + L/R)
 */
export const SNES_LAYOUT: ControllerLayout = {
  console: 'SNES',
  buttons: [
    ...DPAD_BUTTONS,
    // Diamond: Y-X-B-A (left-top-bottom-right)
    { type: 'y', label: 'Y', x: 74, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'X', x: 84, y: 46, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 84, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 94, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // Shoulders
    { type: 'l', label: 'L', x: 8, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r', label: 'R', x: 92, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * GBA Layout (A/B + L/R)
 */
export const GBA_LAYOUT: ControllerLayout = {
  console: 'GBA',
  buttons: [
    ...DPAD_BUTTONS,
    { type: 'b', label: 'B', x: 80, y: 62, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 92, y: 52, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'l', label: 'L', x: 8, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r', label: 'R', x: 92, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * Genesis 6-Button Layout
 * RetroPad mapping: A=Y, B=B, C=A, X=L, Y=X, Z=R
 */
export const SIX_BUTTON_LAYOUT: ControllerLayout = {
  console: '6BUTTON',
  buttons: [
    ...DPAD_BUTTONS,
    // Top row (X, Y, Z) → mapped to L, X, R
    { type: 'l', label: 'X', x: 74, y: 48, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'Y', x: 84, y: 44, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'r', label: 'Z', x: 94, y: 40, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // Bottom row (A, B, C) → mapped to Y, B, A
    { type: 'y', label: 'A', x: 72, y: 64, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 82, y: 60, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'C', x: 92, y: 56, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * Saturn Layout (6-Button + L/R triggers)
 * Same face buttons as Genesis, plus dedicated L/R shoulders
 */
export const SATURN_LAYOUT: ControllerLayout = {
  console: 'SATURN',
  buttons: [
    ...DPAD_BUTTONS,
    // Face buttons (same as 6-button but uses standard buttons)
    // X/Y/Z on top
    { type: 'x', label: 'X', x: 74, y: 48, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'y', label: 'Y', x: 84, y: 44, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'l', label: 'Z', x: 94, y: 40, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // A/B/C on bottom
    { type: 'b', label: 'A', x: 72, y: 64, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'B', x: 82, y: 60, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'r', label: 'C', x: 92, y: 56, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // Triggers (L2/R2 for Saturn L/R)
    { type: 'l2', label: 'L', x: 8, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r2', label: 'R', x: 92, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * Neo Geo 4-Button Curved Layout
 * RetroPad mapping: A→B, B→A, C→Y, D→X
 */
export const NEOGEO_LAYOUT: ControllerLayout = {
  console: 'NEOGEO',
  buttons: [
    ...DPAD_BUTTONS,
    // Curved A-B-C-D layout (maps to b-a-y-x for RetroPad)
    { type: 'b', label: 'A', x: 68, y: 68, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'B', x: 78, y: 62, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'y', label: 'C', x: 88, y: 56, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'D', x: 96, y: 48, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'select', label: 'COIN', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * PlayStation Layout (4 Face + L1/R1 + L2/R2)
 */
export const PSX_LAYOUT: ControllerLayout = {
  console: 'PSX',
  buttons: [
    ...DPAD_BUTTONS,
    // PS symbols: △◯✕□ → y, b, a, x (triangle-circle-cross-square)
    { type: 'y', label: '△', x: 84, y: 46, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: '○', x: 94, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: '✕', x: 84, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: '□', x: 74, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // Shoulders
    { type: 'l', label: 'L1', x: 8, y: 25, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r', label: 'R1', x: 92, y: 25, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'l2', label: 'L2', x: 8, y: 15, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r2', label: 'R2', x: 92, y: 15, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * N64 Layout (A/B + C-buttons + L/R/Z)
 */
export const N64_LAYOUT: ControllerLayout = {
  console: 'N64',
  buttons: [
    ...DPAD_BUTTONS,
    // A/B
    { type: 'a', label: 'A', x: 80, y: 68, size: BUTTON_LARGE, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 72, y: 76, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // C-buttons (use x/y as C-left/C-up, l2/r2 as C-down/C-right)
    { type: 'y', label: 'C↑', x: 92, y: 50, size: 36, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'C←', x: 86, y: 56, size: 36, showInPortrait: true, showInLandscape: true },
    { type: 'l2', label: 'C↓', x: 92, y: 62, size: 36, showInPortrait: true, showInLandscape: true },
    { type: 'r2', label: 'C→', x: 98, y: 56, size: 36, showInPortrait: true, showInLandscape: true },
    // Shoulders
    { type: 'l', label: 'L', x: 8, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r', label: 'R', x: 92, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    // Z trigger (use l3 button for Z trigger)
    { type: 'l3', label: 'Z', x: 8, y: 35, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

/**
 * Dreamcast Layout (A/B/X/Y + L/R)
 */
export const DREAMCAST_LAYOUT: ControllerLayout = {
  console: 'DREAMCAST',
  buttons: [
    ...DPAD_BUTTONS,
    // Standard diamond
    { type: 'y', label: 'Y', x: 74, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'x', label: 'X', x: 84, y: 46, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'b', label: 'B', x: 84, y: 70, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    { type: 'a', label: 'A', x: 94, y: 58, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true },
    // Triggers
    { type: 'l', label: 'L', x: 8, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'r', label: 'R', x: 92, y: 20, size: BUTTON_MEDIUM, showInPortrait: true, showInLandscape: true, shape: 'rect' },
    { type: 'select', label: 'SELECT', x: SELECT_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
    { type: 'start', label: 'START', x: START_X, y: START_SELECT_Y, size: BUTTON_SMALL, showInPortrait: true, showInLandscape: true, shape: 'pill' },
  ],
};

// --- SYSTEM LOOKUP ---

export function getLayoutForSystem(system: string): ControllerLayout {
  const s = system.toUpperCase();

  // Sony
  if (s === 'PS1' || s === 'PSX' || s === 'PSP') return PSX_LAYOUT;

  // Nintendo
  if (s === 'N64') return N64_LAYOUT;
  if (s === 'SNES' || s === 'NDS') return SNES_LAYOUT;
  if (s === 'GBA') return GBA_LAYOUT;
  if (s === 'NES' || s === 'GB' || s === 'GBC' || s === 'VIRTUAL_BOY') return TWO_BUTTON_LAYOUT;

  // Sega
  if (s === 'DREAMCAST') return DREAMCAST_LAYOUT;
  if (s === 'SATURN') return SATURN_LAYOUT;
  if (s === 'GENESIS') return SIX_BUTTON_LAYOUT;
  if (s === 'MASTER_SYSTEM' || s === 'GAME_GEAR') return TWO_BUTTON_LAYOUT;

  // SNK
  if (s === 'NEOGEO') return NEOGEO_LAYOUT;
  if (s.includes('NEOGEO_POCKET')) return TWO_BUTTON_LAYOUT;

  // Others
  if (s === 'ARCADE') return SIX_BUTTON_LAYOUT;
  if (s === 'PC_ENGINE' || s === 'TURBOGRAFX') return TWO_BUTTON_LAYOUT;
  if (s.includes('WONDERSWAN')) return TWO_BUTTON_LAYOUT;
  if (s.includes('ATARI')) return TWO_BUTTON_LAYOUT;

  return TWO_BUTTON_LAYOUT;
}
