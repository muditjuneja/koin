/**
 * Session-killer blocking during co-op (plan §7).
 *
 * Mirrors useGameSession.ts's hardcoreRestrictions shape/pattern exactly —
 * a small derived-flags object, computed with the same "disabled +
 * tooltip" convention already used throughout PlayerControls/*, rather
 * than a new UI idiom. Every restart-triggering action is blocked for the
 * same underlying reason: it would kill the session for every connected
 * guest, not just the host (plan findings #8, #11; §1's synthetic key
 * allocation is also computed once against P1's map at prepare time, so a
 * P1 remap mid-session could silently collide with a guest's reserved
 * keys — blocking the remap modal is the fix for both problems at once).
 */

export interface CoopRestrictions {
    isCoopActive: boolean;
    /** Shader changes always set requiresRestart mid-session (ShaderDropdown.tsx). */
    canChangeShader: boolean;
    /** Manual restart silently drops active cheats and would end the game for every guest. */
    canManualRestart: boolean;
    /** Saving the GamepadMapper calls reloadGamepadBindings() -> restart(), and a changed P1 map could collide with a guest's synthetic key allocation (§1). */
    canOpenControlsModal: boolean;
    canOpenGamepadModal: boolean;
}

export function getCoopRestrictions(isCoopActive: boolean): CoopRestrictions {
    return {
        isCoopActive,
        canChangeShader: !isCoopActive,
        canManualRestart: !isCoopActive,
        canOpenControlsModal: !isCoopActive,
        canOpenGamepadModal: !isCoopActive,
    };
}
