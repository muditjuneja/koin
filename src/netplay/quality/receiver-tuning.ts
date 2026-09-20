/**
 * Receiver-side WebRTC wiring for netplay (plan §4). Thin — jitter buffer
 * decisions live in heuristics.ts (adaptJitterBufferTarget); this file
 * applies the result and provides glass-to-glass instrumentation.
 */

import { adaptJitterBufferTarget, MIN_JITTER_BUFFER_TARGET_MS } from './heuristics';

/**
 * Sets the receiver's jitter buffer target. Prefers the standard
 * jitterBufferTarget (ms); falls back to playoutDelayHint (seconds) on
 * Safari <=26, which shipped jitterBufferTarget starting with Safari 27.
 * No-op if neither is available.
 */
export function applyJitterBufferTarget(receiver: RTCRtpReceiver, targetMs: number): void {
    const r = receiver as unknown as { jitterBufferTarget?: number; playoutDelayHint?: number };
    if ('jitterBufferTarget' in r) {
        r.jitterBufferTarget = targetMs;
    } else if ('playoutDelayHint' in r) {
        r.playoutDelayHint = targetMs / 1000;
    }
}

/**
 * Polls a receiver's stats once and returns the next jitter buffer target,
 * given the previous poll's cumulative packetsLost. Callers should keep
 * calling this periodically (e.g. every couple of seconds) and feed the
 * result back into applyJitterBufferTarget.
 */
export async function pollAndAdaptJitterBufferTarget(
    receiver: RTCRtpReceiver,
    currentTargetMs: number,
    previousPacketsLost: number
): Promise<{ nextTargetMs: number; packetsLost: number }> {
    let packetsLost = previousPacketsLost;
    try {
        const stats = await receiver.getStats();
        stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && typeof report.packetsLost === 'number') {
                packetsLost = report.packetsLost;
            }
        });
    } catch {
        // getStats can throw on a torn-down connection — hold the previous value.
    }

    const nextTargetMs = adaptJitterBufferTarget({
        currentTargetMs,
        packetsLostSincePreviousPoll: Math.max(0, packetsLost - previousPacketsLost),
    });

    return { nextTargetMs, packetsLost };
}

export { MIN_JITTER_BUFFER_TARGET_MS };

// --- glass-to-glass instrumentation ---

export interface VideoFrameSample {
    /** When the frame was captured on the sender, if the browser reports it (RTCP-derived). */
    captureTime?: number;
    /** When the frame was received locally. */
    receiveTime?: number;
    /** When the frame is/was expected to be presented — the number that actually matters for glass-to-glass latency. */
    presentationTime: number;
}

/**
 * Observes presented video frames purely for latency instrumentation —
 * never use this to drive rendering; let <video> composite on its own.
 * Returns a stop function. No-op (stop does nothing) if the browser
 * doesn't support requestVideoFrameCallback.
 */
export function observeVideoFrames(videoElement: HTMLVideoElement, onSample: (sample: VideoFrameSample) => void): () => void {
    if (typeof videoElement.requestVideoFrameCallback !== 'function') return () => {};

    let stopped = false;
    let handle: number;

    const tick: VideoFrameRequestCallback = (_now, metadata) => {
        if (stopped) return;
        onSample({
            captureTime: metadata.captureTime,
            receiveTime: metadata.receiveTime,
            presentationTime: metadata.presentationTime ?? metadata.expectedDisplayTime,
        });
        handle = videoElement.requestVideoFrameCallback(tick);
    };
    handle = videoElement.requestVideoFrameCallback(tick);

    return () => {
        stopped = true;
        videoElement.cancelVideoFrameCallback?.(handle);
    };
}
