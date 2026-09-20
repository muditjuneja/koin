/**
 * Sender-side WebRTC wiring for netplay video quality (plan §4). Thin —
 * all the actual decisions live in heuristics.ts so they're unit-testable;
 * this file just calls the real browser APIs with those results.
 */

import {
    DIRECT_MAX_BITRATE_BPS,
    getPreferredVideoCodecOrder,
    pickMaxBitrate,
    reorderCodecsByPriority,
} from './heuristics';

/**
 * Reorders a video transceiver's codec preferences without dropping any
 * entry (see reorderCodecsByPriority's doc for why that matters). No-op if
 * the browser doesn't expose RTCRtpSender.getCapabilities or
 * setCodecPreferences (older Safari).
 */
export function applyVideoCodecPreferences(transceiver: RTCRtpTransceiver, options: { allowAv1?: boolean } = {}): void {
    if (typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') return;
    if (typeof transceiver.setCodecPreferences !== 'function') return;

    const capabilities = RTCRtpSender.getCapabilities('video');
    if (!capabilities) return;

    const order = getPreferredVideoCodecOrder(!!options.allowAv1);
    transceiver.setCodecPreferences(reorderCodecsByPriority(capabilities.codecs, order));
}

/** Hints the encoder that this is synthetic/screen-like content (pixel art), not a camera feed — implies maintain-resolution and enables screen-content coding tools where available. */
export function applyContentHint(track: MediaStreamTrack): void {
    try {
        (track as unknown as { contentHint: string }).contentHint = 'text';
    } catch {
        // Not supported on this track type/browser — harmless to skip.
    }
}

export interface SenderEncodingOptions {
    /** Whether this connection is currently relayed through TURN — downshifts the bitrate target (plan's cost model). */
    isRelayed?: boolean;
    degradationPreference?: RTCDegradationPreference;
}

/**
 * Applies maxBitrate + degradationPreference via setParameters(). Call again
 * whenever relay status or the degradation decision changes (see
 * heuristics.ts's decideDegradationPreference, driven by observed fps).
 */
export async function applySenderEncodingParameters(sender: RTCRtpSender, options: SenderEncodingOptions = {}): Promise<void> {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
    }

    const maxBitrate = pickMaxBitrate(!!options.isRelayed);
    for (const encoding of params.encodings) {
        encoding.maxBitrate = maxBitrate;
    }

    if (options.degradationPreference) {
        params.degradationPreference = options.degradationPreference;
    }

    await sender.setParameters(params);
}

export { DIRECT_MAX_BITRATE_BPS };
