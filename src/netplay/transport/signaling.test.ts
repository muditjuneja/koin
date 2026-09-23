import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSignalingUrl, createMemorySignalingHub, createWebSocketSignaling, type SignalingMessage } from './signaling';

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

/** Minimal stand-in for the browser WebSocket: records instances; tests drive open/message/close. */
class FakeSocket {
    static OPEN = 1;
    static instances: FakeSocket[] = [];
    readyState = 0;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onclose: ((e: { code: number }) => void) | null = null;
    constructor(readonly url: string) {
        FakeSocket.instances.push(this);
    }
    send(frame: string) { this.sent.push(frame); }
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen?.(); }
    receive(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) }); }
    drop(code: number) { this.readyState = 3; this.onclose?.({ code }); }
}

describe('createWebSocketSignaling with join tokens', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        FakeSocket.instances = [];
    });

    const flush = () => new Promise((r) => setTimeout(r, 0));

    it('sends a fixed token, and gives up on "unauthorized" without retrying', async () => {
        vi.stubGlobal('WebSocket', FakeSocket);
        const transport = createWebSocketSignaling({ url: 'https://sig.dev', ...ids, token: 'fixed' });
        await flush();
        expect(new URL(FakeSocket.instances[0].url).searchParams.get('token')).toBe('fixed');
        FakeSocket.instances[0].open();
        FakeSocket.instances[0].drop(4401);
        expect(transport.state).toBe('closed');
        expect(transport.closeReason).toBe('unauthorized');
    });

    it('asks a token provider again on every reconnect, and stops after repeated refusals', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('WebSocket', FakeSocket);
        const provider = vi.fn(async ({ roomCode, peerId }: { roomCode: string; peerId: string }) => `${roomCode}:${peerId}:${provider.mock.calls.length}`);
        const transport = createWebSocketSignaling({ url: 'https://sig.dev', ...ids, token: provider });
        await vi.runOnlyPendingTimersAsync();
        expect(new URL(FakeSocket.instances[0].url).searchParams.get('token')).toBe('ABCDEF:p1:1');

        // A normal drop reconnects with a freshly minted token.
        FakeSocket.instances[0].open();
        FakeSocket.instances[0].receive({ fromPeerId: '__system__', payload: { type: 'host-joined' } });
        FakeSocket.instances[0].drop(1006);
        await vi.runOnlyPendingTimersAsync();
        await vi.runOnlyPendingTimersAsync();
        expect(new URL(FakeSocket.instances[1].url).searchParams.get('token')).toBe('ABCDEF:p1:2');

        // Refused three times in a row: the provider isn't going to fix it.
        for (let i = 1; i <= 3; i++) {
            FakeSocket.instances[i].drop(4401);
            await vi.runOnlyPendingTimersAsync();
            await vi.runOnlyPendingTimersAsync();
        }
        expect(transport.state).toBe('closed');
        expect(transport.closeReason).toBe('unauthorized');
        expect(FakeSocket.instances).toHaveLength(4);
    });

    it('passes on a server-verified identity and nothing else from the envelope', async () => {
        vi.stubGlobal('WebSocket', FakeSocket);
        const transport = createWebSocketSignaling({ url: 'https://sig.dev', ...ids });
        const inbox: SignalingMessage[] = [];
        transport.onMessage((m) => inbox.push(m));
        await flush();
        const socket = FakeSocket.instances[0];
        socket.open();
        socket.receive({ fromPeerId: 'g1', payload: { type: 'bye' }, identity: { userId: 'u1', name: 'Ada', role: 'spectator', admin: true } });
        socket.receive({ fromPeerId: 'g2', payload: { type: 'bye' }, identity: { role: 'owner' } });
        expect(inbox).toEqual([
            { fromPeerId: 'g1', payload: { type: 'bye' }, identity: { userId: 'u1', name: 'Ada', role: 'spectator' } },
            { fromPeerId: 'g2', payload: { type: 'bye' } },
        ]);
    });
});
