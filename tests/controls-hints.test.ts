import { describe, it, expect } from 'vitest';
import { getControlsHint, DEFAULT_KEYBOARD } from '../src/lib/controls';

describe('getControlsHint', () => {
    it('tells arcade players which key inserts a coin', () => {
        expect(getControlsHint('ARCADE', DEFAULT_KEYBOARD)).toEqual({
            coin: true,
            message: 'Insert coin: R Shift · Start: Enter',
        });
        expect(getControlsHint('NEOGEO', DEFAULT_KEYBOARD)?.coin).toBe(true);
    });

    it('gives consoles Start and Select', () => {
        expect(getControlsHint('NES', DEFAULT_KEYBOARD)).toEqual({
            coin: false,
            message: 'Start: Enter · Select: R Shift',
        });
    });

    it('leaves Select out where the system has none', () => {
        expect(getControlsHint('N64', DEFAULT_KEYBOARD)?.message).toBe('Start: Enter');
    });

    it('uses what the core does with the button, not its name', () => {
        expect(getControlsHint('ATARI_7800', DEFAULT_KEYBOARD)?.message)
            .toBe('Reset (start game): S · Pause: Enter · Select: R Shift');
        expect(getControlsHint('MASTER_SYSTEM', DEFAULT_KEYBOARD)?.message)
            .toBe('Start game (button 1): Z · Pause: Enter');
    });

    it('resolves aliases and lowercase system names', () => {
        expect(getControlsHint('famicom', DEFAULT_KEYBOARD)?.message).toBe('Start: Enter · Select: R Shift');
    });

    it("follows the player's own mapping and skips unbound buttons", () => {
        expect(getControlsHint('ARCADE', { ...DEFAULT_KEYBOARD, select: 'KeyC' })?.message)
            .toBe('Insert coin: C · Start: Enter');
        expect(getControlsHint('N64', { ...DEFAULT_KEYBOARD, start: '' })).toBeNull();
    });
});
