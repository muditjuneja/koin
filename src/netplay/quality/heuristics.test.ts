import { describe, expect, it } from 'vitest';
import {
    reorderCodecsByPriority,
    getPreferredVideoCodecOrder,
    pickMaxBitrate,
    isRelayedCandidateType,
    decideDegradationPreference,
    adaptJitterBufferTarget,
    MIN_JITTER_BUFFER_TARGET_MS,
    MAX_JITTER_BUFFER_TARGET_MS,
    DIRECT_MAX_BITRATE_BPS,
    RELAYED_MAX_BITRATE_BPS,
    LOW_FPS_THRESHOLD,
} from './heuristics';

describe('reorderCodecsByPriority', () => {
    const codecs = [
        { mimeType: 'video/VP9' },
        { mimeType: 'video/rtx' },
        { mimeType: 'video/H264' },
        { mimeType: 'video/red' },
        { mimeType: 'video/VP8' },
        { mimeType: 'video/ulpfec' },
        { mimeType: 'video/AV1' },
    ];

    it('moves priority codecs to the front in priority order', () => {
        const result = reorderCodecsByPriority(codecs, ['video/H264', 'video/VP8']);
        expect(result[0].mimeType).toBe('video/H264');
        expect(result[1].mimeType).toBe('video/VP8');
    });

    it('never drops a codec — RTX/RED/ULPFEC survive reordering', () => {
        const result = reorderCodecsByPriority(codecs, ['video/H264', 'video/VP8']);
        expect(result).toHaveLength(codecs.length);
        expect(new Set(result.map((c) => c.mimeType))).toEqual(new Set(codecs.map((c) => c.mimeType)));
    });

    it('preserves the relative order of non-priority codecs', () => {
        const result = reorderCodecsByPriority(codecs, ['video/H264']);
        const nonPriority = result.filter((c) => c.mimeType !== 'video/H264').map((c) => c.mimeType);
        const originalNonPriority = codecs.filter((c) => c.mimeType !== 'video/H264').map((c) => c.mimeType);
        expect(nonPriority).toEqual(originalNonPriority);
    });

    it('is case-insensitive when matching mime types', () => {
        const result = reorderCodecsByPriority(codecs, ['video/h264']);
        expect(result[0].mimeType).toBe('video/H264');
    });

    it('is a no-op ordering-wise when no codec matches any priority entry', () => {
        const result = reorderCodecsByPriority(codecs, ['video/DOES-NOT-EXIST']);
        expect(result.map((c) => c.mimeType)).toEqual(codecs.map((c) => c.mimeType));
    });

    it('handles an empty codec list', () => {
        expect(reorderCodecsByPriority([], ['video/H264'])).toEqual([]);
    });
});

describe('getPreferredVideoCodecOrder', () => {
    it('puts H264 first, then VP8, with no AV1 by default', () => {
        expect(getPreferredVideoCodecOrder(false)).toEqual(['video/H264', 'video/VP8']);
    });

    it('appends AV1 last when explicitly opted in', () => {
        expect(getPreferredVideoCodecOrder(true)).toEqual(['video/H264', 'video/VP8', 'video/AV1']);
    });
});

describe('pickMaxBitrate / isRelayedCandidateType', () => {
    it('picks the direct bitrate when not relayed', () => {
        expect(pickMaxBitrate(false)).toBe(DIRECT_MAX_BITRATE_BPS);
    });

    it('picks the lower relayed bitrate when relayed', () => {
        expect(pickMaxBitrate(true)).toBe(RELAYED_MAX_BITRATE_BPS);
        expect(RELAYED_MAX_BITRATE_BPS).toBeLessThan(DIRECT_MAX_BITRATE_BPS);
    });

    it('identifies "relay" candidate type and nothing else', () => {
        expect(isRelayedCandidateType('relay')).toBe(true);
        expect(isRelayedCandidateType('srflx')).toBe(false);
        expect(isRelayedCandidateType('host')).toBe(false);
        expect(isRelayedCandidateType(undefined)).toBe(false);
    });
});

describe('decideDegradationPreference', () => {
    it('defaults to maintain-resolution when fps is unknown', () => {
        expect(decideDegradationPreference(null)).toBe('maintain-resolution');
    });

    it('stays maintain-resolution at a healthy framerate', () => {
        expect(decideDegradationPreference(60)).toBe('maintain-resolution');
        expect(decideDegradationPreference(LOW_FPS_THRESHOLD)).toBe('maintain-resolution');
    });

    it('flips to maintain-framerate once fps drops below the threshold', () => {
        expect(decideDegradationPreference(LOW_FPS_THRESHOLD - 1)).toBe('maintain-framerate');
        expect(decideDegradationPreference(10)).toBe('maintain-framerate');
    });
});

describe('adaptJitterBufferTarget', () => {
    it('never goes below MIN_JITTER_BUFFER_TARGET_MS, even with zero loss repeatedly', () => {
        let target = MIN_JITTER_BUFFER_TARGET_MS;
        for (let i = 0; i < 50; i++) {
            target = adaptJitterBufferTarget({ currentTargetMs: target, packetsLostSincePreviousPoll: 0 });
        }
        expect(target).toBe(MIN_JITTER_BUFFER_TARGET_MS);
        expect(target).toBeGreaterThan(0);
    });

    it('never exceeds MAX_JITTER_BUFFER_TARGET_MS, even under sustained loss', () => {
        let target = MIN_JITTER_BUFFER_TARGET_MS;
        for (let i = 0; i < 50; i++) {
            target = adaptJitterBufferTarget({ currentTargetMs: target, packetsLostSincePreviousPoll: 3 });
        }
        expect(target).toBe(MAX_JITTER_BUFFER_TARGET_MS);
    });

    it('increases on fresh packet loss', () => {
        const next = adaptJitterBufferTarget({ currentTargetMs: 25, packetsLostSincePreviousPoll: 1 });
        expect(next).toBeGreaterThan(25);
    });

    it('decays slowly back down when loss stops', () => {
        const next = adaptJitterBufferTarget({ currentTargetMs: 40, packetsLostSincePreviousPoll: 0 });
        expect(next).toBeLessThan(40);
        expect(next).toBeGreaterThanOrEqual(MIN_JITTER_BUFFER_TARGET_MS);
    });
});
