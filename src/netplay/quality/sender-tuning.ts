/**
 * Applies codec preferences and per-peer encoding profiles to real WebRTC
 * senders. Decisions live in heuristics.ts / degradation-ladder.ts.
 */

import { reorderCodecsByPriority, VIDEO_CODEC_PRIORITY } from './heuristics';
import { EncodingProfile, scaleDownFor } from './degradation-ladder';

/** Put H.264, then VP8, first in the offer — keeping every other codec (RTX/RED/FEC). */
export function applyVideoCodecPreferences(transceiver: RTCRtpTransceiver): void {
    if (typeof transceiver.setCodecPreferences !== 'function') return;
    // The spec validates against receiver capabilities; senders' is the fallback for older engines.
    const capabilities = RTCRtpReceiver.getCapabilities?.('video') ?? RTCRtpSender.getCapabilities?.('video');
    if (!capabilities) return;
    transceiver.setCodecPreferences(reorderCodecsByPriority(capabilities.codecs, VIDEO_CODEC_PRIORITY));
}

/**
 * Bound the encoded stream to the profile. The host canvas is as large as
 * the host's window (it can be 1080p+ in fullscreen), so the encoder scales it
 * down per peer — encode cost, the per-peer cost, stays fixed however the host
 * sizes the game. Players favour frame rate under congestion; spectators let
 * the encoder balance.
 */
export async function applyEncodingProfile(
    sender: RTCRtpSender,
    profile: EncodingProfile,
    sourceHeight: number,
    role: 'player' | 'spectator',
): Promise<void> {
    const params = sender.getParameters();
    if (!params.encodings?.length) return; // not negotiated yet; called again once connected
    for (const encoding of params.encodings) {
        encoding.maxBitrate = profile.maxBitrate;
        encoding.maxFramerate = profile.maxFramerate;
        encoding.scaleResolutionDownBy = scaleDownFor(sourceHeight, profile.maxHeight);
    }
    params.degradationPreference = role === 'player' ? 'maintain-framerate' : 'balanced';
    try {
        await sender.setParameters(params);
    } catch (err) {
        // Some engines reject degradationPreference; retry with just the encodings.
        delete (params as { degradationPreference?: unknown }).degradationPreference;
        await sender.setParameters(params).catch(() => console.warn('[netplay] could not apply encoding profile:', err));
    }
}
