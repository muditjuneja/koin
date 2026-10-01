export type ConnectionQuality = 'connecting' | 'good' | 'fair' | 'poor' | 'reconnecting' | 'disconnected';

/** Buckets an input-to-picture latency estimate and packet loss into what the UI shows. */
export function classifyConnectionQuality(latencyMs: number | null, packetLossRatio: number): ConnectionQuality {
    if (latencyMs === null) return 'connecting';
    if (packetLossRatio > 0.1 || latencyMs > 250) return 'poor';
    if (packetLossRatio > 0.02 || latencyMs > 120) return 'fair';
    return 'good';
}

interface StatsLike {
    forEach(callback: (report: Record<string, unknown>) => void): void;
    get(id: string): Record<string, unknown> | undefined;
}

export interface TransportStats {
    rttMs: number | null;
    relayed: boolean;
}

/** Round-trip time and relay status of the connection's selected candidate pair. */
export function readTransportStats(stats: StatsLike): TransportStats {
    let pair: Record<string, unknown> | undefined;
    stats.forEach((report) => {
        if (report.type === 'transport' && typeof report.selectedCandidatePairId === 'string') {
            pair = stats.get(report.selectedCandidatePairId);
        }
    });
    if (!pair) {
        stats.forEach((report) => {
            if (!pair && report.type === 'candidate-pair' && report.state === 'succeeded' && report.nominated) pair = report;
        });
    }
    if (!pair) return { rttMs: null, relayed: false };
    const remote = typeof pair.remoteCandidateId === 'string' ? stats.get(pair.remoteCandidateId) : undefined;
    const local = typeof pair.localCandidateId === 'string' ? stats.get(pair.localCandidateId) : undefined;
    const rtt = typeof pair.currentRoundTripTime === 'number' ? pair.currentRoundTripTime * 1000 : null;
    return { rttMs: rtt, relayed: remote?.candidateType === 'relay' || local?.candidateType === 'relay' };
}
