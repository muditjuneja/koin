/**
 * What the host sends to each peer, and how it backs off under CPU pressure.
 *
 * Every step changes only things that can change mid-session without a
 * restart — per-sender resolution scale, frame rate and bitrate, and whether
 * new peers are accepted. (Run-Ahead is fixed at emulator start, so it is not
 * a runtime knob.) Encoding is per peer, so spectators are shed first, then
 * players' frame rate, then their resolution, then new joins.
 *
 * The pressure signal is the host page's own frame pacing: the emulator runs
 * on requestAnimationFrame, so when emulation plus encoding overruns the CPU,
 * frame intervals stretch. Samples are per-second aggregates, and samples
 * from a hidden tab (where the browser throttles rAF on purpose) must not be
 * fed in.
 */

export interface EncodingProfile {
    /** Encoded height cap; the host canvas is scaled down to fit. */
    maxHeight: number;
    maxFramerate: number;
    maxBitrate: number;
}

export interface DegradationLevel {
    step: number;
    players: EncodingProfile;
    spectators: EncodingProfile;
    acceptNewPeers: boolean;
}

export const DEGRADATION_LEVELS: readonly DegradationLevel[] = [
    { step: 0, players: { maxHeight: 480, maxFramerate: 60, maxBitrate: 2_500_000 }, spectators: { maxHeight: 360, maxFramerate: 30, maxBitrate: 800_000 }, acceptNewPeers: true },
    { step: 1, players: { maxHeight: 480, maxFramerate: 60, maxBitrate: 2_500_000 }, spectators: { maxHeight: 240, maxFramerate: 15, maxBitrate: 400_000 }, acceptNewPeers: true },
    { step: 2, players: { maxHeight: 480, maxFramerate: 30, maxBitrate: 1_800_000 }, spectators: { maxHeight: 240, maxFramerate: 15, maxBitrate: 400_000 }, acceptNewPeers: true },
    { step: 3, players: { maxHeight: 360, maxFramerate: 30, maxBitrate: 1_200_000 }, spectators: { maxHeight: 240, maxFramerate: 15, maxBitrate: 300_000 }, acceptNewPeers: true },
    { step: 4, players: { maxHeight: 360, maxFramerate: 30, maxBitrate: 1_200_000 }, spectators: { maxHeight: 240, maxFramerate: 15, maxBitrate: 300_000 }, acceptNewPeers: false },
];

/** A relayed (TURN) connection costs the integrator per byte — cap it. */
export const RELAYED_MAX_BITRATE = 800_000;

export function profileFor(level: DegradationLevel, role: 'player' | 'spectator', relayed: boolean): EncodingProfile {
    const base = role === 'player' ? level.players : level.spectators;
    return relayed ? { ...base, maxBitrate: Math.min(base.maxBitrate, role === 'player' ? RELAYED_MAX_BITRATE : RELAYED_MAX_BITRATE / 2) } : base;
}

/** scaleResolutionDownBy that fits `sourceHeight` under `maxHeight` (never upscales). */
export function scaleDownFor(sourceHeight: number, maxHeight: number): number {
    return sourceHeight > maxHeight ? sourceHeight / maxHeight : 1;
}

export interface PressureThresholds {
    /** A second is "overloaded" when its 90th-percentile frame interval exceeds budget × this. */
    overloadedRatio: number;
    /** A second is "comfortable" below budget × this. */
    comfortableRatio: number;
    /** Consecutive overloaded seconds before stepping down. */
    escalateAfter: number;
    /** Consecutive comfortable seconds before stepping back up — deliberately slower, so quality doesn't flap. */
    relaxAfter: number;
}

export const DEFAULT_PRESSURE_THRESHOLDS: PressureThresholds = {
    overloadedRatio: 1.5,
    comfortableRatio: 1.15,
    escalateAfter: 3,
    relaxAfter: 15,
};

export class DegradationLadder {
    private step = 0;
    private overloadedStreak = 0;
    private comfortableStreak = 0;

    constructor(
        private readonly frameBudgetMs = 1000 / 60,
        private readonly thresholds: PressureThresholds = DEFAULT_PRESSURE_THRESHOLDS,
    ) {}

    get level(): DegradationLevel {
        return DEGRADATION_LEVELS[this.step];
    }

    reset(): void {
        this.step = 0;
        this.overloadedStreak = 0;
        this.comfortableStreak = 0;
    }

    /** Feed one second's 90th-percentile frame interval. Returns true if the level changed. */
    sample(p90FrameIntervalMs: number): boolean {
        if (p90FrameIntervalMs > this.frameBudgetMs * this.thresholds.overloadedRatio) {
            this.overloadedStreak++;
            this.comfortableStreak = 0;
        } else if (p90FrameIntervalMs < this.frameBudgetMs * this.thresholds.comfortableRatio) {
            this.comfortableStreak++;
            this.overloadedStreak = 0;
        } else {
            this.overloadedStreak = 0;
            this.comfortableStreak = 0;
        }

        if (this.overloadedStreak >= this.thresholds.escalateAfter && this.step < DEGRADATION_LEVELS.length - 1) {
            this.step++;
            this.overloadedStreak = 0;
            return true;
        }
        if (this.comfortableStreak >= this.thresholds.relaxAfter && this.step > 0) {
            this.step--;
            this.comfortableStreak = 0;
            return true;
        }
        return false;
    }
}

/** 90th percentile of a list of frame intervals; 0 for an empty list. */
export function p90(values: readonly number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}
