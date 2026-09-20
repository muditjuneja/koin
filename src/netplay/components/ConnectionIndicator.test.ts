import { describe, expect, it } from 'vitest';
import { classifyConnectionQuality } from './ConnectionIndicator';

describe('classifyConnectionQuality', () => {
    it('is "connecting" when latency is not yet known', () => {
        expect(classifyConnectionQuality(null, 0)).toBe('connecting');
    });

    it('is "good" at low latency and no loss', () => {
        expect(classifyConnectionQuality(40, 0)).toBe('good');
    });

    it('is "fair" once latency or loss crosses the fair threshold', () => {
        expect(classifyConnectionQuality(130, 0)).toBe('fair');
        expect(classifyConnectionQuality(40, 0.05)).toBe('fair');
    });

    it('is "poor" once latency or loss crosses the poor threshold', () => {
        expect(classifyConnectionQuality(260, 0)).toBe('poor');
        expect(classifyConnectionQuality(40, 0.15)).toBe('poor');
    });

    it('poor takes priority over fair when both thresholds are crossed', () => {
        expect(classifyConnectionQuality(300, 0.2)).toBe('poor');
    });
});
