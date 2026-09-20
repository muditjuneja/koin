/**
 * Run-Ahead / CPU-budget degradation ladder (plan §5).
 *
 * Run-Ahead costs (N+1)x emulation and runs concurrently with per-peer
 * encoding (confirmed per-sender, not shared — spike 1a/1b in the plan), so
 * a full 4-player + spectators session on a mid-range host needs an
 * explicit shedding order rather than hoping it fits. The plan's stated
 * priority: shed encode cost before Run-Ahead, since Run-Ahead buys ~16ms
 * of latency per frame for a fraction of what a second encode stream
 * costs. Ladder, in order:
 *   1. Drop spectator quality (15fps / 400kbps floor)
 *   2. Drop player framerate 60 -> 30
 *   3. Reduce Run-Ahead 2 -> 1 frame
 *   4. Disable Run-Ahead
 *   5. Refuse additional peers
 */

export type DegradationStep = 0 | 1 | 2 | 3 | 4 | 5;

export const MIN_DEGRADATION_STEP: DegradationStep = 0;
export const MAX_DEGRADATION_STEP: DegradationStep = 5;

export const DEGRADATION_STEP_NAMES: Record<DegradationStep, string> = {
    0: 'none',
    1: 'spectator-quality-reduced',
    2: 'player-fps-reduced',
    3: 'run-ahead-reduced',
    4: 'run-ahead-disabled',
    5: 'refuse-new-peers',
};

export interface DegradationConfig {
    step: DegradationStep;
    spectatorFps: number;
    spectatorBitrateBps: number;
    playerFps: number;
    /** 0 = disabled. */
    runAheadFrames: number;
    refuseNewPeers: boolean;
}

// Baseline (step 0). Spectators already run a differentiated, lighter
// profile from day one per the spike 1a/1b decision — these are that
// baseline, not the further-reduced floor step 1 drops to.
export const SPECTATOR_FPS_NORMAL = 24;
export const SPECTATOR_BITRATE_NORMAL_BPS = 600_000;
// The plan's explicit step-1 floor.
export const SPECTATOR_FPS_DEGRADED = 15;
export const SPECTATOR_BITRATE_DEGRADED_BPS = 400_000;

export const PLAYER_FPS_NORMAL = 60;
export const PLAYER_FPS_DEGRADED = 30;

// Matches koin's existing Tier-1 Run-Ahead default (useEmulatorCore.ts).
export const RUN_AHEAD_FRAMES_NORMAL = 2;
export const RUN_AHEAD_FRAMES_REDUCED = 1;
export const RUN_AHEAD_FRAMES_DISABLED = 0;

export function getDegradationConfig(step: DegradationStep): DegradationConfig {
    return {
        step,
        spectatorFps: step >= 1 ? SPECTATOR_FPS_DEGRADED : SPECTATOR_FPS_NORMAL,
        spectatorBitrateBps: step >= 1 ? SPECTATOR_BITRATE_DEGRADED_BPS : SPECTATOR_BITRATE_NORMAL_BPS,
        playerFps: step >= 2 ? PLAYER_FPS_DEGRADED : PLAYER_FPS_NORMAL,
        runAheadFrames: step >= 4 ? RUN_AHEAD_FRAMES_DISABLED : step >= 3 ? RUN_AHEAD_FRAMES_REDUCED : RUN_AHEAD_FRAMES_NORMAL,
        refuseNewPeers: step >= 5,
    };
}

export interface PressureThresholds {
    /** A frame counts "over budget" past targetFrameBudgetMs * this ratio. */
    overBudgetRatio: number;
    /** A frame counts "comfortable" under targetFrameBudgetMs * this ratio. */
    underBudgetRatio: number;
    /** Consecutive over-budget frames required before escalating — a single slow frame shouldn't degrade the whole session. */
    escalateAfterSamples: number;
    /** Consecutive comfortable frames required before de-escalating — much slower than escalation on purpose, to avoid oscillating. */
    deescalateAfterSamples: number;
}

export const DEFAULT_PRESSURE_THRESHOLDS: PressureThresholds = {
    overBudgetRatio: 1.5,
    underBudgetRatio: 0.7,
    escalateAfterSamples: 5,
    deescalateAfterSamples: 30,
};

/**
 * Hysteresis-based state machine driving the ladder from observed
 * frame-time samples (host emulate+encode time per frame). Deliberately
 * asymmetric: quick to react to real pressure, slow to relax — recovering
 * from step 5 back to step 0 on every brief lull would make the session's
 * quality visibly flap.
 */
export class CpuPressureDegradationLadder {
    private step: DegradationStep = MIN_DEGRADATION_STEP;
    private overBudgetStreak = 0;
    private underBudgetStreak = 0;

    constructor(
        private readonly targetFrameBudgetMs: number = 1000 / 60,
        private readonly thresholds: PressureThresholds = DEFAULT_PRESSURE_THRESHOLDS
    ) {}

    getStep(): DegradationStep {
        return this.step;
    }

    getConfig(): DegradationConfig {
        return getDegradationConfig(this.step);
    }

    /** Feed one frame-time sample (ms). Returns true if the step changed. */
    recordFrame(frameTimeMs: number): boolean {
        const over = frameTimeMs > this.targetFrameBudgetMs * this.thresholds.overBudgetRatio;
        const under = frameTimeMs < this.targetFrameBudgetMs * this.thresholds.underBudgetRatio;

        if (over) {
            this.overBudgetStreak++;
            this.underBudgetStreak = 0;
        } else if (under) {
            this.underBudgetStreak++;
            this.overBudgetStreak = 0;
        } else {
            // Neutral zone — a borderline frame resets both streaks rather
            // than nudging either one, so it can't slowly drift a decision.
            this.overBudgetStreak = 0;
            this.underBudgetStreak = 0;
        }

        if (this.overBudgetStreak >= this.thresholds.escalateAfterSamples && this.step < MAX_DEGRADATION_STEP) {
            this.step = (this.step + 1) as DegradationStep;
            this.overBudgetStreak = 0;
            return true;
        }

        if (this.underBudgetStreak >= this.thresholds.deescalateAfterSamples && this.step > MIN_DEGRADATION_STEP) {
            this.step = (this.step - 1) as DegradationStep;
            this.underBudgetStreak = 0;
            return true;
        }

        return false;
    }

    reset(): void {
        this.step = MIN_DEGRADATION_STEP;
        this.overBudgetStreak = 0;
        this.underBudgetStreak = 0;
    }
}
