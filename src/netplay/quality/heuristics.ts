/**
 * Pure decision logic for netplay's latency/quality tuning (plan §4).
 * Kept free of WebRTC globals so it's unit-testable in Node — the actual
 * getStats()/RTCRtpSender wiring lives in sender-tuning.ts / receiver-tuning.ts
 * and just calls these functions with real numbers.
 */

// --- codec preference ordering ---

export interface CodecLike {
    mimeType: string;
}

/**
 * Moves codecs matching `priorityMimeTypes` (in that order) to the front of
 * the list, WITHOUT dropping anything else — since Chrome M124, passing a
 * filtered/hand-built array to setCodecPreferences silently disables
 * RTX/RED/ULPFEC entries that weren't in it. Every input codec is present
 * in the output, just reordered.
 */
export function reorderCodecsByPriority<T extends CodecLike>(codecs: readonly T[], priorityMimeTypes: readonly string[]): T[] {
    let remaining = [...codecs];
    const result: T[] = [];
    for (const mimeType of priorityMimeTypes) {
        const matched: T[] = [];
        const rest: T[] = [];
        for (const codec of remaining) {
            (codec.mimeType.toLowerCase() === mimeType.toLowerCase() ? matched : rest).push(codec);
        }
        result.push(...matched);
        remaining = rest;
    }
    result.push(...remaining);
    return result;
}

/** H.264 first (near-universal hardware encode, effectively mandatory on Safari/iOS) → VP8 → AV1 only if explicitly opted in (desktop only, ~2x VP8 CPU cost the host can't always spare). */
export const VIDEO_CODEC_PRIORITY_DEFAULT: readonly string[] = ['video/H264', 'video/VP8'];
export const VIDEO_CODEC_PRIORITY_WITH_AV1: readonly string[] = ['video/H264', 'video/VP8', 'video/AV1'];

export function getPreferredVideoCodecOrder(allowAv1: boolean): readonly string[] {
    return allowAv1 ? VIDEO_CODEC_PRIORITY_WITH_AV1 : VIDEO_CODEC_PRIORITY_DEFAULT;
}

// --- bitrate ---

/** Direct (non-relayed) connection target — 2-3 Mbps range from the plan; picks the middle. */
export const DIRECT_MAX_BITRATE_BPS = 2_500_000;
/** Auto-downshift when the connection is relayed through TURN (plan §4 / cost model). */
export const RELAYED_MAX_BITRATE_BPS = 800_000;

export function pickMaxBitrate(isRelayed: boolean): number {
    return isRelayed ? RELAYED_MAX_BITRATE_BPS : DIRECT_MAX_BITRATE_BPS;
}

export function isRelayedCandidateType(remoteCandidateType: string | undefined): boolean {
    return remoteCandidateType === 'relay';
}

// --- degradation preference ---

export type DegradationPreference = 'maintain-resolution' | 'maintain-framerate' | 'balanced';

/**
 * Default is maintain-resolution — deliberately the opposite of the usual
 * "games = maintain-framerate" advice, which assumes spare resolution to
 * shed (720p+ camera content). At ~240p there is none: any downscale, then
 * nearest-neighbour upscale on the guest, destroys the pixel grid. Flips to
 * maintain-framerate only if observed fps actually drops below threshold —
 * the maxBitrate hedge (DIRECT_MAX_BITRATE_BPS) should make that rare.
 */
export const LOW_FPS_THRESHOLD = 40;

export function decideDegradationPreference(observedFps: number | null): DegradationPreference {
    if (observedFps !== null && observedFps < LOW_FPS_THRESHOLD) return 'maintain-framerate';
    return 'maintain-resolution';
}

// --- receiver jitter buffer target ---

/**
 * Hard-won finding from Selkies (closest published browser-game-streaming
 * prior art, plan §4): setting jitterBufferTarget to 0 causes stutter — the
 * buffer keeps wanting to grow and gets forced back down. Never go below
 * MIN. Adapts upward on fresh packet loss, decays slowly back down toward
 * MIN otherwise so a calm connection stays tight.
 */
export const MIN_JITTER_BUFFER_TARGET_MS = 20;
export const MAX_JITTER_BUFFER_TARGET_MS = 50;
const JITTER_BUFFER_STEP_UP_MS = 5;
const JITTER_BUFFER_STEP_DOWN_MS = 1;

export function adaptJitterBufferTarget(params: { currentTargetMs: number; packetsLostSincePreviousPoll: number }): number {
    const { currentTargetMs, packetsLostSincePreviousPoll } = params;
    const next = packetsLostSincePreviousPoll > 0
        ? currentTargetMs + JITTER_BUFFER_STEP_UP_MS
        : currentTargetMs - JITTER_BUFFER_STEP_DOWN_MS;
    return Math.min(MAX_JITTER_BUFFER_TARGET_MS, Math.max(MIN_JITTER_BUFFER_TARGET_MS, next));
}
