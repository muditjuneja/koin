import { describe, expect, it } from 'vitest';
import { DEGRADATION_LEVELS, DegradationLadder, p90, profileFor, RELAYED_MAX_BITRATE, scaleDownFor } from './degradation-ladder';

const BUDGET = 1000 / 60;
const overloaded = BUDGET * 2;
const comfortable = BUDGET;

function feed(ladder: DegradationLadder, value: number, times: number) {
    const changes: number[] = [];
    for (let i = 0; i < times; i++) if (ladder.sample(value)) changes.push(ladder.level.step);
    return changes;
}

describe('degradation levels', () => {
    it('never gets better as the step increases', () => {
        for (let i = 1; i < DEGRADATION_LEVELS.length; i++) {
            const [prev, next] = [DEGRADATION_LEVELS[i - 1], DEGRADATION_LEVELS[i]];
            for (const role of ['players', 'spectators'] as const) {
                expect(next[role].maxHeight).toBeLessThanOrEqual(prev[role].maxHeight);
                expect(next[role].maxFramerate).toBeLessThanOrEqual(prev[role].maxFramerate);
                expect(next[role].maxBitrate).toBeLessThanOrEqual(prev[role].maxBitrate);
            }
        }
    });

    it('sheds spectators before players, and refuses new peers only at the last step', () => {
        expect(DEGRADATION_LEVELS[1].players).toEqual(DEGRADATION_LEVELS[0].players);
        expect(DEGRADATION_LEVELS[1].spectators.maxFramerate).toBeLessThan(DEGRADATION_LEVELS[0].spectators.maxFramerate);
        expect(DEGRADATION_LEVELS.slice(0, -1).every((level) => level.acceptNewPeers)).toBe(true);
        expect(DEGRADATION_LEVELS[DEGRADATION_LEVELS.length - 1].acceptNewPeers).toBe(false);
    });

    it('caps relayed bitrate and leaves direct connections alone', () => {
        const level = DEGRADATION_LEVELS[0];
        expect(profileFor(level, 'player', false).maxBitrate).toBe(level.players.maxBitrate);
        expect(profileFor(level, 'player', true).maxBitrate).toBe(RELAYED_MAX_BITRATE);
        expect(profileFor(level, 'spectator', true).maxBitrate).toBeLessThanOrEqual(RELAYED_MAX_BITRATE / 2);
    });
});

describe('scaleDownFor', () => {
    it('scales a large host canvas down to the cap and never upscales', () => {
        expect(scaleDownFor(1080, 480)).toBe(2.25);
        expect(scaleDownFor(448, 480)).toBe(1);
    });
});

describe('DegradationLadder', () => {
    it('ignores a single bad second', () => {
        const ladder = new DegradationLadder(BUDGET);
        expect(feed(ladder, overloaded, 2)).toEqual([]);
    });

    it('reset returns to full quality and forgets streaks', () => {
        const ladder = new DegradationLadder(BUDGET);
        feed(ladder, overloaded, 3 * 4);
        expect(ladder.level.acceptNewPeers).toBe(false);
        feed(ladder, overloaded, 2);
        ladder.reset();
        expect(ladder.level.step).toBe(0);
        expect(feed(ladder, overloaded, 2)).toEqual([]);
    });

    it('steps down one level per sustained overload, never skipping, and stops at the bottom', () => {
        const ladder = new DegradationLadder(BUDGET);
        expect(feed(ladder, overloaded, 3 * 10)).toEqual([1, 2, 3, 4]);
        expect(ladder.level.acceptNewPeers).toBe(false);
    });

    it('recovers more slowly than it degrades', () => {
        const ladder = new DegradationLadder(BUDGET);
        feed(ladder, overloaded, 3);
        expect(feed(ladder, comfortable, 14)).toEqual([]);
        expect(feed(ladder, comfortable, 1)).toEqual([0]);
    });

    it('treats borderline seconds as neither, resetting both streaks', () => {
        const ladder = new DegradationLadder(BUDGET);
        feed(ladder, overloaded, 2);
        feed(ladder, BUDGET * 1.3, 1);
        expect(feed(ladder, overloaded, 2)).toEqual([]);
    });
});

describe('p90', () => {
    it('picks the 90th percentile and handles empty input', () => {
        expect(p90([])).toBe(0);
        expect(p90(Array.from({ length: 10 }, (_, i) => i + 1))).toBe(10);
        expect(p90([16, 16, 16, 16, 16, 16, 16, 16, 16, 100])).toBe(100);
    });
});
