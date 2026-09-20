/**
 * SignalingRoom — one Durable Object instance per netplay room (plan §8).
 *
 * Uses the WebSocket Hibernation API (acceptWebSocket, not accept()) so an
 * idle room — nobody talking, connections just open — costs nothing: the
 * DO can be evicted from memory between messages and wakes back up when
 * one arrives. Room state itself (which peerId is on which WebSocket)
 * survives hibernation via the tags passed to acceptWebSocket, not via
 * an in-memory Map that would be lost on eviction.
 *
 * This object relays opaque JSON envelopes between peers in the same
 * room — SDP offers/answers, ICE candidates, and any higher-level
 * room-lifecycle payload the client library (koin.js/netplay's
 * signaling.ts) chooses to send. It does not parse or understand SDP; it
 * only reads `toPeerId` (relay to one peer) vs. its absence (broadcast to
 * everyone else in the room).
 */

export interface SignalingEnvelope {
    roomCode: string;
    fromPeerId: string;
    toPeerId?: string;
    payload: unknown;
}

const MAX_PEERS_PER_ROOM = 8; // 4 players + up to a handful of spectators — matches the plan's stated ceiling before "you need an SFU" territory.

export class SignalingRoom implements DurableObject {
    constructor(private readonly ctx: DurableObjectState, private readonly env: unknown) {}

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const peerId = url.searchParams.get('peerId');
        if (!peerId) {
            return new Response('peerId query parameter is required', { status: 400 });
        }

        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected a WebSocket upgrade', { status: 426 });
        }

        const existingPeers = this.ctx.getWebSockets().length;
        if (existingPeers >= MAX_PEERS_PER_ROOM) {
            return new Response('room is full', { status: 409 });
        }

        // A reconnecting peer (e.g. inside the guest reconnect window) may
        // open a second socket under the same peerId before the old one is
        // cleaned up — close the stale one so messages aren't duplicated.
        for (const socket of this.ctx.getWebSockets(peerId)) {
            socket.close(1000, 'replaced by a new connection');
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

        // Tagging with peerId is what makes this survive hibernation — the
        // runtime persists the tag alongside the socket and getWebSockets(tag)
        // finds it again after an eviction, without any in-memory state here.
        this.ctx.acceptWebSocket(server, [peerId]);

        this.broadcastSystemMessage({ type: 'peer-joined', peerId }, peerId);

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== 'string') return; // signaling is JSON-only; media never touches this DO

        let envelope: SignalingEnvelope;
        try {
            envelope = JSON.parse(message);
        } catch {
            return; // malformed — drop silently, this is a relay, not a validator for the app-level protocol
        }

        if (envelope.toPeerId) {
            for (const socket of this.ctx.getWebSockets(envelope.toPeerId)) {
                this.safeSend(socket, message);
            }
            return;
        }

        // No target — broadcast to every other peer in the room.
        const senderTags = this.ctx.getTags(ws);
        for (const socket of this.ctx.getWebSockets()) {
            if (socket !== ws) this.safeSend(socket, message);
        }
        void senderTags; // kept only for the doc comment's clarity that we know who the sender is; not otherwise needed here.
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
        const [peerId] = this.ctx.getTags(ws);
        try {
            ws.close(code, reason);
        } catch {
            // Already closing.
        }
        void wasClean;
        if (peerId) this.broadcastSystemMessage({ type: 'peer-left', peerId }, peerId);
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        const [peerId] = this.ctx.getTags(ws);
        if (peerId) this.broadcastSystemMessage({ type: 'peer-left', peerId }, peerId);
    }

    private broadcastSystemMessage(payload: unknown, excludePeerId: string): void {
        const envelope: SignalingEnvelope = { roomCode: '', fromPeerId: '__system__', payload };
        const message = JSON.stringify(envelope);
        for (const socket of this.ctx.getWebSockets()) {
            const tags = this.ctx.getTags(socket);
            if (tags.includes(excludePeerId)) continue;
            this.safeSend(socket, message);
        }
    }

    private safeSend(socket: WebSocket, message: string): void {
        try {
            socket.send(message);
        } catch {
            // Socket is closing/closed — the eventual webSocketClose handles cleanup.
        }
    }
}
