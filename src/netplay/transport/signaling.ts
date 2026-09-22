/**
 * Signaling transport: carries join/SDP/ICE messages between the host and
 * guests until their WebRTC connections are up (and again on reconnects).
 *
 * koin needs no backend of its own. Give a `signalingUrl` for koin's
 * reference Cloudflare Worker (server/cloudflare) or anything speaking the
 * same protocol, or plug in your own transport with `createCallbackSignaling`.
 *
 * Wire protocol (JSON text frames):
 *   client -> server  { toPeerId?: string, payload }
 *   server -> client  { fromPeerId: string, toPeerId?: string, payload }
 * The server stamps fromPeerId itself and only lets guests talk to "host".
 */

import type { SignalPayload } from './protocol';

export type SignalingState = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface SignalingMessage {
    fromPeerId: string;
    payload: SignalPayload;
}

export interface SignalingTransport {
    readonly state: SignalingState;
    /** Why the transport closed for good, when it did (e.g. 'peer-id-taken'). */
    readonly closeReason: string | null;
    send(toPeerId: string | undefined, payload: SignalPayload): void;
    onMessage(handler: (message: SignalingMessage) => void): () => void;
    onStateChange(handler: (state: SignalingState) => void): () => void;
    close(): void;
}

class Emitter<T> {
    private handlers = new Set<(value: T) => void>();
    on(handler: (value: T) => void): () => void {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    emit(value: T): void {
        for (const handler of [...this.handlers]) {
            try {
                handler(value);
            } catch (err) {
                console.error('[netplay] signaling handler threw:', err);
            }
        }
    }
}

/** Server close codes after which reconnecting cannot help. */
const FATAL_CLOSE_CODES: Record<number, string> = {
    4009: 'peer-id-taken',
    4013: 'room-full',
    4029: 'rate-limited',
};

export interface WebSocketSignalingOptions {
    /** Base URL of the signaling server, e.g. "wss://koin-signaling.example.workers.dev". http(s) is accepted too. */
    url: string;
    roomCode: string;
    peerId: string;
    /** Proves ownership of peerId across reconnects. Generate once per session. */
    secret: string;
    /** Messages sent while not connected are queued up to this many (oldest dropped). Default 64. */
    maxQueue?: number;
}

export function buildSignalingUrl({ url, roomCode, peerId, secret }: Pick<WebSocketSignalingOptions, 'url' | 'roomCode' | 'peerId' | 'secret'>): string {
    const base = new URL(url, typeof location !== 'undefined' ? location.href : undefined);
    if (base.protocol === 'http:') base.protocol = 'ws:';
    if (base.protocol === 'https:') base.protocol = 'wss:';
    if (!base.pathname.endsWith('/ws')) base.pathname = `${base.pathname.replace(/\/+$/, '')}/ws`;
    base.searchParams.set('room', roomCode);
    base.searchParams.set('peerId', peerId);
    base.searchParams.set('secret', secret);
    return base.toString();
}

export function createWebSocketSignaling(options: WebSocketSignalingOptions): SignalingTransport {
    const url = buildSignalingUrl(options);
    const maxQueue = options.maxQueue ?? 64;
    const messages = new Emitter<SignalingMessage>();
    const states = new Emitter<SignalingState>();
    let state: SignalingState = 'connecting';
    let closeReason: string | null = null;
    let socket: WebSocket | null = null;
    let queue: string[] = [];
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const setState = (next: SignalingState) => {
        if (state === next) return;
        state = next;
        states.emit(next);
    };

    const connect = () => {
        const ws = new WebSocket(url);
        socket = ws;
        ws.onopen = () => {
            attempt = 0;
            setState('open');
            for (const frame of queue.splice(0)) ws.send(frame);
        };
        ws.onmessage = (event) => {
            if (typeof event.data !== 'string') return;
            try {
                const message = JSON.parse(event.data);
                if (message && typeof message.fromPeerId === 'string' && message.payload && typeof message.payload.type === 'string') {
                    messages.emit({ fromPeerId: message.fromPeerId, payload: message.payload });
                }
            } catch {
                // not JSON — ignore
            }
        };
        ws.onclose = (event) => {
            if (socket !== ws || state === 'closed') return;
            socket = null;
            const fatal = FATAL_CLOSE_CODES[event.code];
            if (fatal) {
                closeReason = fatal;
                setState('closed');
                return;
            }
            setState('reconnecting');
            const delay = Math.min(5000, 250 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
            attempt++;
            retryTimer = setTimeout(connect, delay);
        };
    };
    connect();

    return {
        get state() { return state; },
        get closeReason() { return closeReason; },
        send(toPeerId, payload) {
            if (state === 'closed') return;
            const frame = JSON.stringify({ toPeerId, payload });
            if (state === 'open' && socket?.readyState === WebSocket.OPEN) {
                socket.send(frame);
                return;
            }
            queue.push(frame);
            if (queue.length > maxQueue) queue = queue.slice(-maxQueue);
        },
        onMessage: (handler) => messages.on(handler),
        onStateChange: (handler) => states.on(handler),
        close() {
            if (state === 'closed') return;
            closeReason = 'closed';
            setState('closed');
            if (retryTimer) clearTimeout(retryTimer);
            queue = [];
            const ws = socket;
            socket = null;
            ws?.close(1000);
        },
    };
}

export interface CallbackSignalingOptions {
    peerId: string;
    /** Called for every outgoing message; deliver it to the peer however you like. */
    onSend: (toPeerId: string | undefined, payload: SignalPayload) => void;
}

/**
 * Bring-your-own transport. koin opens no connection; call `receive()` with
 * every message your transport delivers for this peer (including who sent
 * it — you are responsible for that being trustworthy).
 */
export function createCallbackSignaling(options: CallbackSignalingOptions): SignalingTransport & { receive(message: SignalingMessage): void } {
    const messages = new Emitter<SignalingMessage>();
    const states = new Emitter<SignalingState>();
    let state: SignalingState = 'open';
    return {
        get state() { return state; },
        get closeReason() { return state === 'closed' ? 'closed' : null; },
        send(toPeerId, payload) {
            if (state === 'open') options.onSend(toPeerId, payload);
        },
        receive(message) {
            if (state === 'open') messages.emit(message);
        },
        onMessage: (handler) => messages.on(handler),
        onStateChange: (handler) => states.on(handler),
        close() {
            if (state === 'closed') return;
            state = 'closed';
            states.emit(state);
        },
    };
}

/**
 * An in-page signaling hub with the reference server's routing rules
 * (guests can only reach "host"; the hub stamps the sender). For demos and
 * tests where host and guests share one page.
 */
export function createMemorySignalingHub() {
    const peers = new Map<string, ReturnType<typeof createCallbackSignaling>>();
    const deliver = (to: string, message: SignalingMessage) => peers.get(to)?.receive(message);
    const toGuests = (message: SignalingMessage) => {
        for (const [id, peer] of peers) if (id !== 'host') peer.receive(message);
    };
    return {
        connect(peerId: string): SignalingTransport {
            // Same peer reconnecting: retire the old transport without a peer-left.
            const previous = peers.get(peerId);
            if (previous) {
                peers.delete(peerId);
                previous.close();
            }
            const transport = createCallbackSignaling({
                peerId,
                onSend: (toPeerId, payload) => {
                    if (peerId !== 'host') deliver('host', { fromPeerId: peerId, payload });
                    else if (toPeerId) deliver(toPeerId, { fromPeerId: 'host', payload });
                    else toGuests({ fromPeerId: 'host', payload });
                },
            });
            peers.set(peerId, transport);
            if (peerId === 'host') toGuests({ fromPeerId: '__system__', payload: { type: 'host-joined' } });
            else deliver('host', { fromPeerId: '__system__', payload: { type: 'peer-joined', peerId } });
            const close = transport.close.bind(transport);
            transport.close = () => {
                if (peers.get(peerId) !== transport) return close();
                peers.delete(peerId);
                close();
                if (peerId === 'host') toGuests({ fromPeerId: '__system__', payload: { type: 'host-left' } });
                else deliver('host', { fromPeerId: '__system__', payload: { type: 'peer-left', peerId } });
            };
            return transport;
        },
    };
}
