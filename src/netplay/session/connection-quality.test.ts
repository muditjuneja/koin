import { describe, expect, it } from 'vitest';
import { classifyConnectionQuality, readTransportStats } from './connection-quality';

describe('classifyConnectionQuality', () => {
    it('buckets latency and loss, with poor taking priority', () => {
        expect(classifyConnectionQuality(null, 0)).toBe('connecting');
        expect(classifyConnectionQuality(40, 0)).toBe('good');
        expect(classifyConnectionQuality(130, 0)).toBe('fair');
        expect(classifyConnectionQuality(40, 0.05)).toBe('fair');
        expect(classifyConnectionQuality(260, 0)).toBe('poor');
        expect(classifyConnectionQuality(300, 0.2)).toBe('poor');
    });
});

function statsOf(reports: Record<string, unknown>[]) {
    const byId = new Map(reports.map((r) => [r.id as string, r]));
    return { forEach: (cb: (r: Record<string, unknown>) => void) => reports.forEach(cb), get: (id: string) => byId.get(id) };
}

describe('readTransportStats', () => {
    it('reads RTT and relay status from the selected candidate pair', () => {
        const stats = statsOf([
            { id: 't', type: 'transport', selectedCandidatePairId: 'p' },
            { id: 'p', type: 'candidate-pair', currentRoundTripTime: 0.042, remoteCandidateId: 'r', localCandidateId: 'l' },
            { id: 'r', type: 'remote-candidate', candidateType: 'relay' },
            { id: 'l', type: 'local-candidate', candidateType: 'host' },
        ]);
        expect(readTransportStats(stats)).toEqual({ rttMs: 42, relayed: true });
    });

    it('falls back to the nominated succeeded pair when there is no transport report (Firefox)', () => {
        const stats = statsOf([
            { id: 'p', type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.01, remoteCandidateId: 'r' },
            { id: 'r', type: 'remote-candidate', candidateType: 'srflx' },
        ]);
        expect(readTransportStats(stats)).toEqual({ rttMs: 10, relayed: false });
    });

    it('reports nothing before a pair is selected', () => {
        expect(readTransportStats(statsOf([]))).toEqual({ rttMs: null, relayed: false });
    });
});
