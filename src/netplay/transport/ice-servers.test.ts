import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ICE_SERVERS, IceServerSource, normalizeIceServers, turnCredentialsProvider } from './ice-servers';

const turn = (n: number): RTCIceServer[] => [{ urls: `turn:turn.example.com:3478?n=${n}`, username: 'u', credential: `c${n}` }];

afterEach(() => vi.unstubAllGlobals());

describe('IceServerSource', () => {
    it('defaults to public STUN, and passes a fixed list through', async () => {
        expect(new IceServerSource(undefined).current()).toBe(DEFAULT_ICE_SERVERS);
        const fixed = turn(0);
        expect(await new IceServerSource(fixed).get(true)).toBe(fixed);
    });

    it('caches a provider until its credentials age, and refetches on demand', async () => {
        let clock = 0;
        let calls = 0;
        const source = new IceServerSource(async () => turn(++calls), 1000, () => clock);
        expect(source.current()).toBe(DEFAULT_ICE_SERVERS); // nothing fetched yet — kicks off a fetch
        expect(await source.get()).toEqual(turn(1));
        expect(source.current()).toEqual(turn(1));
        clock = 999;
        expect(await source.get()).toEqual(turn(1));
        clock = 1000;
        expect(await source.get()).toEqual(turn(2));
        expect(await source.get(true)).toEqual(turn(3));
    });

    it('shares one in-flight fetch', async () => {
        let calls = 0;
        const source = new IceServerSource(async () => turn(++calls));
        const [a, b] = await Promise.all([source.get(), source.get()]);
        expect(a).toBe(b);
        expect(calls).toBe(1);
    });

    it('keeps the last good servers (or STUN) when the provider fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        let fail = true;
        const source = new IceServerSource(async () => {
            if (fail) throw new Error('offline');
            return turn(1);
        });
        expect(await source.get()).toBe(DEFAULT_ICE_SERVERS);
        fail = false;
        expect(await source.get(true)).toEqual(turn(1));
        fail = true;
        expect(await source.get(true)).toEqual(turn(1));
    });
});

describe('turnCredentialsProvider', () => {
    it('calls /turn-credentials with the bearer token and merges STUN with the returned server', async () => {
        const fetchMock = vi.fn(async (..._args: unknown[]) => new Response(JSON.stringify({ iceServers: turn(7)[0] })));
        vi.stubGlobal('fetch', fetchMock);
        const provider = turnCredentialsProvider({ url: 'wss://sig.example.dev/ws', token: async () => 'tok' });
        expect(await provider()).toEqual([...DEFAULT_ICE_SERVERS, ...turn(7)]);
        const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
        expect(url.toString()).toBe('https://sig.example.dev/turn-credentials');
        expect(init.headers).toEqual({ Authorization: 'Bearer tok' });
    });

    it('throws on an HTTP error so the session falls back', async () => {
        vi.stubGlobal('fetch', async () => new Response('nope', { status: 401 }));
        await expect(turnCredentialsProvider({ url: 'https://sig.example.dev' })()).rejects.toThrow('401');
    });
});

describe('normalizeIceServers', () => {
    it('accepts the Cloudflare object shape, arrays, and drops junk', () => {
        expect(normalizeIceServers({ iceServers: turn(1)[0] })).toEqual(turn(1));
        expect(normalizeIceServers({ iceServers: [...turn(1), ...turn(2)] })).toEqual([...turn(1), ...turn(2)]);
        expect(normalizeIceServers(turn(3))).toEqual(turn(3));
        expect(normalizeIceServers({ iceServers: [null, 5, { nope: 1 }] })).toEqual([]);
        expect(normalizeIceServers(null)).toEqual([]);
    });
});
