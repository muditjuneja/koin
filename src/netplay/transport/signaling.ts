/**
 * Signaling transport for netplay (plan §3 / §8).
 *
 * koin never requires a backend, so this is deliberately pluggable: give a
 * `signalingUrl` to talk to koin's reference Cloudflare Worker + Durable
 * Object (or any compatible WebSocket endpoint), or give an `onSignal`
 * callback to relay messages through your own app's existing transport
 * (a REST call, a different socket, a queue — koin never opens a
 * connection itself in that mode). Exactly one of the two is required.
 *
 * This module only carries opaque envelopes between peers in the same
 * room; it does not interpret them. peer.ts's SDP offers/answers/ICE
 * candidates and higher-level room events (join/roster/kick) are both
 * just payloads here.
 */

export type SignalingState = 'connecting' | 'open' | 'closed';

export interface SignalingMessage {
    roomCode: string;
    /** The sending peer's id. */
    fromPeerId: string;
    /** Omit to broadcast to everyone else currently in the room (used for host discovery / roster events). */
    toPeerId?: string;
    /** Opaque payload — an SDP offer/answer, an ICE candidate, or a room-level event. Never inspected here. */
    payload: unknown;
}

export interface SignalingClient {
    readonly state: SignalingState;
    send(message: SignalingMessage): void;
    /** Register a handler for inbound messages. Returns an unsubscribe function. */
    subscribe(handler: (message: SignalingMessage) => void): () => void;
    /**
     * Feed an inbound message into this client. Required when the client was
     * constructed from an `onSignal` callback (there is no socket for koin to
     * listen on) — the host app calls this whenever its own transport
     * receives something for this room. WebSocket-backed clients call this
     * internally and a caller normally never needs to.
     */
    receive(message: SignalingMessage): void;
    close(): void;
}

export interface CreateSignalingClientOptions {
    roomCode: string;
    peerId: string;
    /** Connect over WebSocket to koin's reference signaling server or any compatible endpoint. */
    signalingUrl?: string;
    /** Bring your own transport instead of a WebSocket URL — see module docs. */
    onSignal?: (message: SignalingMessage) => void;
}

abstract class BaseSignalingClient implements SignalingClient {
    protected handlers = new Set<(message: SignalingMessage) => void>();
    abstract readonly state: SignalingState;
    abstract send(message: SignalingMessage): void;
    abstract close(): void;

    subscribe(handler: (message: SignalingMessage) => void): () => void {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    receive(message: SignalingMessage): void {
        for (const handler of this.handlers) {
            try {
                handler(message);
            } catch (err) {
                console.error('[netplay] signaling handler threw:', err);
            }
        }
    }
}

class WebSocketSignalingClient extends BaseSignalingClient {
    private socket: WebSocket;
    private _state: SignalingState = 'connecting';
    private queue: SignalingMessage[] = [];

    constructor(url: string, private roomCode: string, private peerId: string) {
        super();
        this.socket = new WebSocket(url);
        this.socket.onopen = () => {
            this._state = 'open';
            for (const message of this.queue.splice(0)) this.socket.send(JSON.stringify(message));
        };
        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as SignalingMessage;
                this.receive(message);
            } catch (err) {
                console.error('[netplay] malformed signaling message:', err);
            }
        };
        this.socket.onclose = () => {
            this._state = 'closed';
        };
        this.socket.onerror = (err) => {
            console.error('[netplay] signaling socket error:', err);
        };
    }

    get state(): SignalingState {
        return this._state;
    }

    send(message: SignalingMessage): void {
        const withRoom: SignalingMessage = { ...message, roomCode: this.roomCode, fromPeerId: this.peerId };
        if (this._state === 'open') {
            this.socket.send(JSON.stringify(withRoom));
        } else {
            this.queue.push(withRoom);
        }
    }

    close(): void {
        this._state = 'closed';
        this.queue = [];
        this.socket.close();
    }
}

class CallbackSignalingClient extends BaseSignalingClient {
    private _state: SignalingState = 'open';

    constructor(private onSignal: (message: SignalingMessage) => void, private roomCode: string, private peerId: string) {
        super();
    }

    get state(): SignalingState {
        return this._state;
    }

    send(message: SignalingMessage): void {
        if (this._state !== 'open') return;
        this.onSignal({ ...message, roomCode: this.roomCode, fromPeerId: this.peerId });
    }

    close(): void {
        this._state = 'closed';
    }
}

export function createSignalingClient(options: CreateSignalingClientOptions): SignalingClient {
    const { roomCode, peerId, signalingUrl, onSignal } = options;
    if (signalingUrl) return new WebSocketSignalingClient(signalingUrl, roomCode, peerId);
    if (onSignal) return new CallbackSignalingClient(onSignal, roomCode, peerId);
    throw new Error('createSignalingClient requires either signalingUrl or onSignal');
}
