/**
 * Pure helpers for netplay media tuning, kept free of WebRTC globals so they
 * are unit-testable. sender-tuning.ts / receiver-tuning.ts apply them.
 */

export interface CodecLike {
    mimeType: string;
}

/**
 * Moves codecs matching `priorityMimeTypes` (in that order) to the front
 * WITHOUT dropping anything: passing a filtered list to setCodecPreferences
 * silently disables RTX/RED/ULPFEC that weren't in it.
 */
export function reorderCodecsByPriority<T extends CodecLike>(codecs: readonly T[], priorityMimeTypes: readonly string[]): T[] {
    let remaining = [...codecs];
    const result: T[] = [];
    for (const mimeType of priorityMimeTypes) {
        const wanted = mimeType.toLowerCase();
        result.push(...remaining.filter((codec) => codec.mimeType.toLowerCase() === wanted));
        remaining = remaining.filter((codec) => codec.mimeType.toLowerCase() !== wanted);
    }
    return [...result, ...remaining];
}

/** H.264 has hardware encode nearly everywhere and is what Safari/iOS decode best; VP8 next. */
export const VIDEO_CODEC_PRIORITY: readonly string[] = ['video/H264', 'video/VP8'];

export function isRelayedCandidateType(remoteCandidateType: string | undefined): boolean {
    return remoteCandidateType === 'relay';
}

/**
 * Receiver jitter buffer target. Never 0: a zeroed target makes the buffer
 * keep trying to grow and get forced back, which stutters. Grows on fresh
 * packet loss, decays slowly toward the floor while the link is calm.
 */
export const MIN_JITTER_BUFFER_TARGET_MS = 20;
export const MAX_JITTER_BUFFER_TARGET_MS = 50;

export function adaptJitterBufferTarget(currentTargetMs: number, packetsLostSinceLastPoll: number): number {
    const next = packetsLostSinceLastPoll > 0 ? currentTargetMs + 5 : currentTargetMs - 1;
    return Math.min(MAX_JITTER_BUFFER_TARGET_MS, Math.max(MIN_JITTER_BUFFER_TARGET_MS, next));
}
