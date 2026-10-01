/**
 * Guest-side jitter buffer control. Decisions live in heuristics.ts.
 */

import { adaptJitterBufferTarget, MIN_JITTER_BUFFER_TARGET_MS } from './heuristics';

/** Sets the receiver's jitter buffer target: jitterBufferTarget (ms), or Safari's older playoutDelayHint (s). */
export function applyJitterBufferTarget(receiver: RTCRtpReceiver, targetMs: number): void {
    const r = receiver as unknown as { jitterBufferTarget?: number | null; playoutDelayHint?: number | null };
    if ('jitterBufferTarget' in r) r.jitterBufferTarget = targetMs;
    else if ('playoutDelayHint' in r) r.playoutDelayHint = targetMs / 1000;
}

/** Tracks one receiver's packet loss and keeps its jitter buffer target adapted. */
export class JitterBufferController {
    private targetMs = MIN_JITTER_BUFFER_TARGET_MS;
    private lastPacketsLost = 0;

    constructor(private readonly receiver: RTCRtpReceiver) {
        applyJitterBufferTarget(receiver, this.targetMs);
    }

    /** Feed the receiver's latest cumulative packetsLost (from inbound-rtp stats). */
    update(packetsLost: number): void {
        const next = adaptJitterBufferTarget(this.targetMs, Math.max(0, packetsLost - this.lastPacketsLost));
        this.lastPacketsLost = packetsLost;
        if (next !== this.targetMs) {
            this.targetMs = next;
            applyJitterBufferTarget(this.receiver, next);
        }
    }
}
