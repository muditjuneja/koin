import { describe, expect, it } from 'vitest';
import {
    adaptJitterBufferTarget,
    isRelayedCandidateType,
    MAX_JITTER_BUFFER_TARGET_MS,
    MIN_JITTER_BUFFER_TARGET_MS,
    reorderCodecsByPriority,
    VIDEO_CODEC_PRIORITY,
} from './heuristics';

describe('reorderCodecsByPriority', () => {
    const codecs = ['video/VP9', 'video/rtx', 'video/H264', 'video/red', 'video/VP8', 'video/ulpfec', 'video/H264'].map((mimeType) => ({ mimeType }));

    it('moves preferred codecs to the front in order, keeping every entry', () => {
        const result = reorderCodecsByPriority(codecs, VIDEO_CODEC_PRIORITY).map((c) => c.mimeType);
        expect(result.slice(0, 3)).toEqual(['video/H264', 'video/H264', 'video/VP8']);
        expect(result).toHaveLength(codecs.length);
        expect(result.slice(3)).toEqual(['video/VP9', 'video/rtx', 'video/red', 'video/ulpfec']);
    });

    it('matches case-insensitively and leaves order alone when nothing matches', () => {
        expect(reorderCodecsByPriority(codecs, ['video/h264'])[0].mimeType).toBe('video/H264');
        expect(reorderCodecsByPriority(codecs, ['video/none'])).toEqual(codecs);
    });
});

describe('isRelayedCandidateType', () => {
    it('is true only for relay candidates', () => {
        expect(isRelayedCandidateType('relay')).toBe(true);
        expect(['host', 'srflx', 'prflx', undefined].some((t) => isRelayedCandidateType(t))).toBe(false);
    });
});

describe('adaptJitterBufferTarget', () => {
    it('stays within bounds and never reaches 0', () => {
        let target = MIN_JITTER_BUFFER_TARGET_MS;
        for (let i = 0; i < 50; i++) target = adaptJitterBufferTarget(target, 0);
        expect(target).toBe(MIN_JITTER_BUFFER_TARGET_MS);
        for (let i = 0; i < 50; i++) target = adaptJitterBufferTarget(target, 2);
        expect(target).toBe(MAX_JITTER_BUFFER_TARGET_MS);
    });

    it('grows on loss faster than it decays', () => {
        expect(adaptJitterBufferTarget(30, 1)).toBe(35);
        expect(adaptJitterBufferTarget(30, 0)).toBe(29);
    });
});
