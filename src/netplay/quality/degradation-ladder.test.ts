import { describe, expect, it } from 'vitest';
import {
    CpuPressureDegradationLadder,
    getDegradationConfig,
    DEGRADATION_STEP_NAMES,
    DEFAULT_PRESSURE_THRESHOLDS,
    MIN_DEGRADATION_STEP,
    MAX_DEGRADATION_STEP,
    SPECTATOR_FPS_NORMAL,
    SPECTATOR_FPS_DEGRADED,
    PLAYER_FPS_NORMAL,
    PLAYER_FPS_DEGRADED,
    RUN_AHEAD_FRAMES_NORMAL,
    RUN_AHEAD_FRAMES_REDUCED,
    RUN_AHEAD_FRAMES_DISABLED,
} from './degradation-ladder';

const TARGET_60FPS_MS = 1000 / 60;

function stepFor(ladder: CpuPressureDegradationLadder, frameTimeMs: number, times: number): boolean {
    let changed = false;
    for (let i = 0; i < times; i++) {
        if (ladder.recordFrame(frameTimeMs)) changed = true;
    }
    return changed;
}

describe('getDegradationConfig', () => {
    it('step 0 is the full-quality baseline', () => {
        const config = getDegradationConfig(0);
        expect(config).toMatchObject({
            spectatorFps: SPECTATOR_FPS_NORMAL,
            playerFps: PLAYER_FPS_NORMAL,
            runAheadFrames: RUN_AHEAD_FRAMES_NORMAL,
            refuseNewPeers: false,
        });
    });

    it('step 1 drops only spectator quality', () => {
        const config = getDegradationConfig(1);
        expect(config.spectatorFps).toBe(SPECTATOR_FPS_DEGRADED);
        expect(config.playerFps).toBe(PLAYER_FPS_NORMAL);
        expect(config.runAheadFrames).toBe(RUN_AHEAD_FRAMES_NORMAL);
    });

    it('step 2 additionally drops player framerate, spectator stays degraded', () => {
        const config = getDegradationConfig(2);
        expect(config.spectatorFps).toBe(SPECTATOR_FPS_DEGRADED);
        expect(config.playerFps).toBe(PLAYER_FPS_DEGRADED);
        expect(config.runAheadFrames).toBe(RUN_AHEAD_FRAMES_NORMAL);
    });

    it('step 3 reduces Run-Ahead before step 4 disables it', () => {
        expect(getDegradationConfig(3).runAheadFrames).toBe(RUN_AHEAD_FRAMES_REDUCED);
        expect(getDegradationConfig(4).runAheadFrames).toBe(RUN_AHEAD_FRAMES_DISABLED);
    });

    it('every step below 5 still accepts new peers; only step 5 refuses', () => {
        for (let step = 0; step <= 4; step++) {
            expect(getDegradationConfig(step as 0 | 1 | 2 | 3 | 4).refuseNewPeers).toBe(false);
        }
        expect(getDegradationConfig(5).refuseNewPeers).toBe(true);
    });

    it('degradation is strictly cumulative — nothing already shed comes back at a later step', () => {
        for (let step = MIN_DEGRADATION_STEP; step < MAX_DEGRADATION_STEP; step++) {
            const current = getDegradationConfig(step as 0 | 1 | 2 | 3 | 4 | 5);
            const next = getDegradationConfig((step + 1) as 0 | 1 | 2 | 3 | 4 | 5);
            expect(next.spectatorFps).toBeLessThanOrEqual(current.spectatorFps);
            expect(next.playerFps).toBeLessThanOrEqual(current.playerFps);
            expect(next.runAheadFrames).toBeLessThanOrEqual(current.runAheadFrames);
        }
    });

    it('has a name for every step', () => {
        for (let step = MIN_DEGRADATION_STEP; step <= MAX_DEGRADATION_STEP; step++) {
            expect(DEGRADATION_STEP_NAMES[step as 0 | 1 | 2 | 3 | 4 | 5]).toBeTruthy();
        }
    });
});

describe('CpuPressureDegradationLadder', () => {
    it('stays at step 0 under a healthy, fast frame time', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS);
        stepFor(ladder, TARGET_60FPS_MS * 0.5, 100);
        expect(ladder.getStep()).toBe(0);
    });

    it('does not escalate on a single slow frame', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS);
        stepFor(ladder, TARGET_60FPS_MS * 5, 1);
        expect(ladder.getStep()).toBe(0);
    });

    it('escalates exactly one step after a sustained over-budget streak', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 5, deescalateAfterSamples: 30,
        });
        const changed = stepFor(ladder, TARGET_60FPS_MS * 2, 5);
        expect(changed).toBe(true);
        expect(ladder.getStep()).toBe(1);
    });

    it('walks the ladder one step at a time under continued pressure, never skipping a rung', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 3, deescalateAfterSamples: 30,
        });
        const seenSteps: number[] = [ladder.getStep()];
        for (let i = 0; i < 3 * MAX_DEGRADATION_STEP + 2; i++) {
            if (ladder.recordFrame(TARGET_60FPS_MS * 3)) seenSteps.push(ladder.getStep());
        }
        expect(seenSteps).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('never escalates past step 5', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 2, deescalateAfterSamples: 30,
        });
        stepFor(ladder, TARGET_60FPS_MS * 5, 200);
        expect(ladder.getStep()).toBe(MAX_DEGRADATION_STEP);
    });

    it('de-escalates after a sustained comfortable streak', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 2, deescalateAfterSamples: 4,
        });
        stepFor(ladder, TARGET_60FPS_MS * 5, 4); // escalate to step 2
        expect(ladder.getStep()).toBe(2);

        const changed = stepFor(ladder, TARGET_60FPS_MS * 0.3, 4);
        expect(changed).toBe(true);
        expect(ladder.getStep()).toBe(1);
    });

    it('never de-escalates below step 0', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 5, deescalateAfterSamples: 3,
        });
        stepFor(ladder, TARGET_60FPS_MS * 0.3, 100);
        expect(ladder.getStep()).toBe(0);
    });

    it('de-escalation requires more sustained comfort than escalation requires pressure (asymmetric by design)', () => {
        expect(DEFAULT_PRESSURE_THRESHOLDS.deescalateAfterSamples).toBeGreaterThan(DEFAULT_PRESSURE_THRESHOLDS.escalateAfterSamples);
    });

    it('a borderline frame (neither clearly over nor under budget) does not itself trigger a step change', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 2, deescalateAfterSamples: 2,
        });
        // 1.1x budget is neither >1.5x (over) nor <0.7x (under).
        stepFor(ladder, TARGET_60FPS_MS * 1.1, 50);
        expect(ladder.getStep()).toBe(0);
    });

    it('reset() returns to step 0', () => {
        const ladder = new CpuPressureDegradationLadder(TARGET_60FPS_MS, {
            overBudgetRatio: 1.5, underBudgetRatio: 0.7, escalateAfterSamples: 2, deescalateAfterSamples: 30,
        });
        stepFor(ladder, TARGET_60FPS_MS * 5, 10);
        expect(ladder.getStep()).toBeGreaterThan(0);
        ladder.reset();
        expect(ladder.getStep()).toBe(0);
    });
});
