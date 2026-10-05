import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpSpectatorRelay, LIGHT_LAYER, sharpLayerFor } from './spectator-relay';
import { DEGRADATION_LEVELS } from '../quality/degradation-ladder';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: { status?: number; body?: unknown }) {
    const fetchMock = vi.fn(async () => new Response(
        response.body === undefined ? null : JSON.stringify(response.body),
        { status: response.status ?? 200 },
    ));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

describe('httpSpectatorRelay', () => {
    it('posts to <signaling base>/sfu/<operation> with the join token, from a ws URL or a path', async () => {
        const fetchMock = stubFetch({ body: { sessionId: 's', ticket: 't', answer: { type: 'answer', sdp: 'x' } } });
        const relay = httpSpectatorRelay({ url: 'wss://example.com/netplay/ws', token: async () => 'tok' });
        const offer = { type: 'offer' as const, sdp: 'o' };
        expect(await relay.publish({ offer, tracks: [{ mid: '0', trackName: 'video' }] })).toEqual({ sessionId: 's', ticket: 't', answer: { type: 'answer', sdp: 'x' } });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
        expect(String(url)).toBe('https://example.com/netplay/sfu/publish');
        expect(init.method).toBe('POST');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
        expect(JSON.parse(init.body as string)).toEqual({ offer, tracks: [{ mid: '0', trackName: 'video' }] });

        await httpSpectatorRelay({ url: 'https://example.com/netplay' }).subscribe({ sessionId: 's', ticket: 't', trackNames: ['video'] });
        expect(String((fetchMock.mock.calls as unknown as [URL][])[1][0])).toBe('https://example.com/netplay/sfu/subscribe');
    });

    it('treats an empty 204 answer as done, and fails on HTTP errors', async () => {
        stubFetch({ status: 204 });
        await expect(httpSpectatorRelay({ url: 'https://example.com/netplay' }).answer({ sessionId: 's', answer: { type: 'answer', sdp: 'a' } })).resolves.toBeUndefined();
        stubFetch({ status: 501, body: { error: 'not configured' } });
        await expect(httpSpectatorRelay({ url: 'https://example.com/netplay' }).subscribe({ sessionId: 's', ticket: 't', trackNames: [] })).rejects.toThrow('HTTP 501');
    });
});

describe('relay layers', () => {
    it('serves a sharper layer than direct spectators get when the host is fine, and the ladder under pressure', () => {
        expect(sharpLayerFor(DEGRADATION_LEVELS[0]).maxHeight).toBeGreaterThan(DEGRADATION_LEVELS[0].spectators.maxHeight);
        expect(sharpLayerFor(DEGRADATION_LEVELS[3])).toEqual(DEGRADATION_LEVELS[3].spectators);
        expect(LIGHT_LAYER.maxBitrate).toBeLessThan(sharpLayerFor(DEGRADATION_LEVELS[4]).maxBitrate + 1);
    });
});
