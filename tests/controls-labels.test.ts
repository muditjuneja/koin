import { describe, it, expect } from 'vitest';
import {
    BUTTON_LABELS,
    BUTTON_GROUPS,
    formatKeyCode,
    formatGamepadButton,
} from '../src/lib/controls/labels';
import { ButtonId } from '../src/lib/controls/types';

describe('Control Labels & UI Formatters', () => {
    it('provides descriptive human-readable labels for all 16 buttons', () => {
        const expectedButtons: ButtonId[] = [
            'up', 'down', 'left', 'right',
            'a', 'b', 'x', 'y',
            'l', 'r', 'l2', 'r2',
            'l3', 'r3',
            'start', 'select',
        ];

        for (const button of expectedButtons) {
            expect(BUTTON_LABELS[button]).toBeDefined();
            expect(BUTTON_LABELS[button].length).toBeGreaterThan(0);
        }
    });

    it('organizes buttons into logical UI groups', () => {
        expect(BUTTON_GROUPS.length).toBe(5);
        const groupLabels = BUTTON_GROUPS.map(g => g.label);
        expect(groupLabels).toEqual(['Movement', 'Face Buttons', 'Shoulders', 'Triggers', 'System']);

        const allGroupedButtons = BUTTON_GROUPS.flatMap(g => g.buttons);
        expect(allGroupedButtons.length).toBe(14);
    });

    it('formats JavaScript KeyboardEvent codes cleanly for UI display', () => {
        expect(formatKeyCode('KeyA')).toBe('A');
        expect(formatKeyCode('KeyZ')).toBe('Z');
        expect(formatKeyCode('Digit1')).toBe('1');
        expect(formatKeyCode('Digit9')).toBe('9');

        expect(formatKeyCode('ArrowUp')).toBe('↑');
        expect(formatKeyCode('ArrowDown')).toBe('↓');
        expect(formatKeyCode('ArrowLeft')).toBe('←');
        expect(formatKeyCode('ArrowRight')).toBe('→');

        expect(formatKeyCode('Space')).toBe('Space');
        expect(formatKeyCode('ShiftLeft')).toBe('Shift');
        expect(formatKeyCode('ShiftRight')).toBe('Shift');
        expect(formatKeyCode('ControlLeft')).toBe('Ctrl');
        expect(formatKeyCode('AltLeft')).toBe('Alt');
        expect(formatKeyCode('Enter')).toBe('Enter');
        expect(formatKeyCode('Tab')).toBe('Tab');
        expect(formatKeyCode('Escape')).toBe('Esc');

        // Unrecognized code is returned as-is
        expect(formatKeyCode('F12')).toBe('F12');
    });

    it('formats gamepad button indices to recognizable controller symbols', () => {
        expect(formatGamepadButton(0)).toBe('A / ✕');
        expect(formatGamepadButton(1)).toBe('B / ○');
        expect(formatGamepadButton(2)).toBe('X / □');
        expect(formatGamepadButton(3)).toBe('Y / △');
        expect(formatGamepadButton(4)).toBe('LB / L1');
        expect(formatGamepadButton(5)).toBe('RB / R1');
        expect(formatGamepadButton(6)).toBe('LT / L2');
        expect(formatGamepadButton(7)).toBe('RT / R2');
        expect(formatGamepadButton(8)).toBe('Back / Share');
        expect(formatGamepadButton(9)).toBe('Start / Options');
        expect(formatGamepadButton(12)).toBe('D-Up');
        expect(formatGamepadButton(16)).toBe('Home');

        expect(formatGamepadButton(undefined)).toBe('—');
        expect(formatGamepadButton(99)).toBe('Btn 99');
    });
});
