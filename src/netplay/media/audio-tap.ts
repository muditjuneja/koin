/**
 * Host-side audio capture for netplay streaming.
 *
 * Wraps useEmulatorAudio's GainNode (the same node the volume slider
 * controls) in a MediaStreamAudioDestinationNode, giving guests a live
 * MediaStreamTrack of the host's actual game audio without a second tap
 * point. Plan §2 / finding #6.
 */

export interface AudioTapHandle {
    stream: MediaStream;
    stop: () => void;
}

/**
 * Attach a MediaStreamAudioDestinationNode downstream of `gainNode` and
 * return the resulting stream. Connecting a second destination does not
 * disturb the existing speaker path — useEmulatorAudio's monkey-patched
 * `connect` only special-cases connections to `ctx.destination` itself, so
 * this additional fan-out is invisible to it.
 *
 * Caveat (plan §2, finding #6): koin's mute toggle fires F9 into the
 * emulator rather than zeroing the GainNode, so a muted host silences the
 * source audio for every guest too, not just local playback. This module
 * doesn't work around that — it documents it, per the plan, as a follow-up
 * fix (making mute gain-based) rather than something to paper over here.
 */
export function tapAudio(gainNode: GainNode): AudioTapHandle {
    // createMediaStreamDestination is AudioContext-only, not on the
    // BaseAudioContext supertype — the emulator's context is always live.
    const destination = (gainNode.context as AudioContext).createMediaStreamDestination();
    gainNode.connect(destination);

    return {
        stream: destination.stream,
        stop: () => {
            try {
                gainNode.disconnect(destination);
            } catch {
                // Already disconnected (e.g. gainNode's context was torn down) — nothing to do.
            }
        },
    };
}
