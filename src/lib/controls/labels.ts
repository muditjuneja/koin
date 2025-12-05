/**
 * Button Labels for UI Display
 * 
 * Single source of truth for button display names.
 */

import { ButtonId } from './types';

/**
 * Human-readable labels for each button
 */
export const BUTTON_LABELS: Record<ButtonId, string> = {
    // D-pad
    up: 'D-Pad Up',
    down: 'D-Pad Down',
    left: 'D-Pad Left',
    right: 'D-Pad Right',

    // Face buttons
    a: 'A Button',
    b: 'B Button',
    x: 'X Button',
    y: 'Y Button',

    // Shoulders
    l: 'L Shoulder',
    r: 'R Shoulder',

    // Triggers
    l2: 'L Trigger',
    r2: 'R Trigger',

    // Stick clicks
    l3: 'L Stick Click',
    r3: 'R Stick Click',

    // System
    start: 'Start',
    select: 'Select',
};

/**
 * Button groups for organized UI display
 */
export const BUTTON_GROUPS = [
    { label: 'Movement', buttons: ['up', 'down', 'left', 'right'] as ButtonId[] },
    { label: 'Face Buttons', buttons: ['a', 'b', 'x', 'y'] as ButtonId[] },
    { label: 'Shoulders', buttons: ['l', 'r'] as ButtonId[] },
    { label: 'Triggers', buttons: ['l2', 'r2'] as ButtonId[] },
    { label: 'System', buttons: ['start', 'select'] as ButtonId[] },
];

/**
 * Format a JavaScript key code for display
 */
export function formatKeyCode(code: string): string {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowRight') return '→';
    if (code === 'Space') return 'Space';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
    if (code === 'AltLeft' || code === 'AltRight') return 'Alt';
    if (code === 'Enter') return 'Enter';
    if (code === 'Tab') return 'Tab';
    if (code === 'Escape') return 'Esc';
    return code;
}

/**
 * Get human-readable name for a gamepad button index
 */
export function formatGamepadButton(index: number | undefined): string {
    if (index === undefined) return '—';

    const names: Record<number, string> = {
        0: 'A / ✕',
        1: 'B / ○',
        2: 'X / □',
        3: 'Y / △',
        4: 'LB / L1',
        5: 'RB / R1',
        6: 'LT / L2',
        7: 'RT / R2',
        8: 'Back / Share',
        9: 'Start / Options',
        10: 'L3',
        11: 'R3',
        12: 'D-Up',
        13: 'D-Down',
        14: 'D-Left',
        15: 'D-Right',
        16: 'Home',
    };

    return names[index] ?? `Btn ${index}`;
}
