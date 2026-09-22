import { describe, expect, it } from 'vitest';
import { buildSignalingUrl, createMemorySignalingHub, type SignalingMessage } from './signaling';

const last = <T>(list: T[]): T | undefined => list[list.length - 1];
const ids = { roomCode: 'ABCDEF', peerId: 'p1', secret: 's'.repeat(20) };

describe('buildSignalingUrl', () => {
    it('targets /ws with room, peer id and secret, whatever form the base URL takes', () => {
        for (const url of ['https://sig.example.dev', 'https://sig.example.dev/', 'wss://sig.example.dev/ws', 'http://localhost:8787']) {
            const built = new URL(buildSignalingUrl({ url, ...ids }));
            expect(built.pathname).toBe('/ws');
            expect(built.searchParams.get('room')).toBe('ABCDEF');
            expect(built.searchParams.get('peerId')).toBe('p1');
            expect(built.searchParams.get('secret')).toBe(ids.secret);
        }
    });

    it('switches http(s) to ws(s)', () => {
        expect(buildSignalingUrl({ url: 'https://a.dev', ...ids })).toMatch(/^wss:\/\//);
        expect(buildSignalingUrl({ url: 'http://a.dev', ...ids })).toMatch(/^ws:\/\//);
    });

    it('keeps a path prefix', () => {
        expect(new URL(buildSignalingUrl({ url: 'https://a.dev/koin/', ...ids })).pathname).toBe('/koin/ws');
    });
});

describe('createMemorySignalingHub', () => {
    function collect(transport: { onMessage(h: (m: SignalingMessage) => void): unknown }) {
        const inbox: SignalingMessage[] = [];
        transport.onMessage((m) => inbox.push(m));
        return inbox;
    }

    it('applies the reference server routing rules', () => {
        const hub = createMemorySignalingHub();
        const host = hub.connect('host');
        const hostInbox = collect(host);
        const a = hub.connect('a');
        const b = hub.connect('b');
        const aInbox = collect(a);
        const bInbox = collect(b);

        expect(hostInbox.map((m) => [m.fromPeerId, m.payload.type])).toEqual([['__system__', 'peer-joined'], ['__system__', 'peer-joined']]);

        // A guest can only reach the host, whatever it addresses.
        a.send('b', { type: 'bye' });
        expect(bInbox).toHaveLength(0);
        expect(last(hostInbox)).toEqual({ fromPeerId: 'a', payload: { type: 'bye' } });

        // The host can address one guest, or all.
        host.send('b', { type: 'join-rejected', reason: 'busy' });
        expect(bInbox).toEqual([{ fromPeerId: 'host', payload: { type: 'join-rejected', reason: 'busy' } }]);
        host.send(undefined, { type: 'bye' });
        expect(last(aInbox)?.payload.type).toBe('bye');
        expect(last(bInbox)?.payload.type).toBe('bye');
    });

    it('announces leaves, but not when a peer reconnects under the same id', () => {
        const hub = createMemorySignalingHub();
        const host = hub.connect('host');
        const hostInbox = collect(host);
        hub.connect('a');
        hub.connect('a'); // reconnect replaces the old transport silently
        expect(hostInbox.map((m) => m.payload.type)).toEqual(['peer-joined', 'peer-joined']);

        const b = hub.connect('b');
        b.close();
        expect(last(hostInbox)?.payload).toEqual({ type: 'peer-left', peerId: 'b' });
    });
});
