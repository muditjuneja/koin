import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendTelemetry } from '../src/lib/telemetry';

describe('Telemetry Service (sendTelemetry)', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            location: {
                href: 'https://theretrosaga.com/cabinet/123',
            },
        });
        vi.stubGlobal('document', {
            referrer: 'https://google.com',
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends telemetry beacon with event name and enriched metadata', () => {
        sendTelemetry('game_start', {
            system: 'NES',
            core: 'fceumm',
            game: 'Super Mario Bros.',
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, options] = (fetch as any).mock.calls[0];

        expect(url).toBe('https://koin.theretrosaga.com/api/telemetry');
        expect(options.method).toBe('POST');
        expect(options.headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(options.body);
        expect(body.event_name).toBe('game_start');
        expect(body.params.system).toBe('NES');
        expect(body.params.core).toBe('fceumm');
        expect(body.params.game).toBe('Super Mario Bros.');
        expect(body.params.url).toBe('https://theretrosaga.com/cabinet/123');
        expect(body.params.referrer).toBe('https://google.com');
        expect(body.params.timestamp).toBeDefined();
    });

    it('silently ignores network errors when fetch rejects', () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

        expect(() => {
            sendTelemetry('test_event', {});
        }).not.toThrow();
    });

    it('does nothing in SSR environments where window is undefined', () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);
        vi.stubGlobal('window', undefined);

        expect(() => {
            sendTelemetry('ssr_event', {});
        }).not.toThrow();

        expect(mockFetch).not.toHaveBeenCalled();
    });
});
