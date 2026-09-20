import { describe, expect, it } from 'vitest';
import { getCoopRestrictions } from './coop-restrictions';

describe('getCoopRestrictions', () => {
    it('blocks nothing when co-op is not active', () => {
        const restrictions = getCoopRestrictions(false);
        expect(restrictions).toEqual({
            isCoopActive: false,
            canChangeShader: true,
            canManualRestart: true,
            canOpenControlsModal: true,
            canOpenGamepadModal: true,
        });
    });

    it('blocks every session-killer once co-op is active', () => {
        const restrictions = getCoopRestrictions(true);
        expect(restrictions).toEqual({
            isCoopActive: true,
            canChangeShader: false,
            canManualRestart: false,
            canOpenControlsModal: false,
            canOpenGamepadModal: false,
        });
    });
});
