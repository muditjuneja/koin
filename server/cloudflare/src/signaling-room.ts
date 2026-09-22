/**
 * SignalingRoom — one Durable Object per netplay room.
 *
 * Relays JSON envelopes between the room's host (peer id "host") and its
 * guests until their WebRTC connections are up. Uses the WebSocket
 * Hibernation API, so an idle room costs nothing between messages; the
 * peer id rides on each socket as a tag and survives hibernation.
 *
 * Trust model — the server, not the client, decides who a message is from:
 * - `fromPeerId` is stamped from the socket's tag; whatever the client wrote
 *   is ignored.
 * - Guests can only address the host. Only the host can address a guest
 *   (or broadcast). Guests never see each other's signaling.
 * - The first socket to claim a peer id registers a secret for it; later
 *   sockets must present the same secret, so nobody can take over the
 *   host's (or anyone's) identity by connecting with the same id.
 * - Join attempts per room are rate-limited.
 */

export interface Envelope {
    fromPeerId: string;
    toPeerId?: string;
    payload: unknown;
}

const HOST_ID = 'host';
const SYSTEM_ID = '__system__';
const MAX_PEERS_PER_ROOM = 12;
const MAX_MESSAGE_BYTES = 16 * 1024;
const JOIN_LIMIT_PER_MINUTE = 60;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const PEER_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SECRET = /^[A-Za-z0-9_-]{16,128}$/;

/** WebSocket close codes the client treats as final (no reconnect). */
export const CLOSE_PEER_ID_TAKEN = 4009;
export const CLOSE_ROOM_FULL = 4013;
export const CLOSE_RATE_LIMITED = 4029;
const CLOSE_REPLACED = 4000;

interface Attachment {
    peerId: string;
    announcedLeave?: boolean;
}

export class SignalingRoom implements DurableObject {
    private joinAttempts: number[] = [];

    constructor(private readonly ctx: DurableObjectState, _env: unknown) {}

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected a WebSocket upgrade', { status: 426 });
        }
        const url = new URL(request.url);
        const peerId = url.searchParams.get('peerId') ?? '';
        const secret = url.searchParams.get('secret') ?? '';
        if (!PEER_ID.test(peerId) || !SECRET.test(secret)) {
            return new Response('peerId and secret are required', { status: 400 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

        // Rejections are delivered as close codes on an accepted socket: a
        // browser can't read the HTTP status of a failed WebSocket upgrade,
        // and the client needs to know not to retry.
        const reject = (code: number, reason: string) => {
            server.accept();
            server.close(code, reason);
            return new Response(null, { status: 101, webSocket: client });
        };

        const now = Date.now();
        this.joinAttempts = this.joinAttempts.filter((t) => now - t < 60_000);
        if (this.joinAttempts.length >= JOIN_LIMIT_PER_MINUTE) return reject(CLOSE_RATE_LIMITED, 'too many join attempts');
        this.joinAttempts.push(now);

        const storedSecret = await this.ctx.storage.get<string>(`secret:${peerId}`);
        if (storedSecret && storedSecret !== secret) return reject(CLOSE_PEER_ID_TAKEN, 'peer id in use');

        const stale = this.ctx.getWebSockets(peerId);
        const others = this.ctx.getWebSockets().length - stale.length;
        if (others >= MAX_PEERS_PER_ROOM) return reject(CLOSE_ROOM_FULL, 'room is full');

        if (!storedSecret) await this.ctx.storage.put(`secret:${peerId}`, secret);
        await this.ctx.storage.deleteAlarm();

        // Same peer reconnecting before its old socket noticed: retire the old
        // one silently (no peer-left — the peer never actually left).
        for (const socket of stale) {
            socket.serializeAttachment({ peerId, announcedLeave: true } satisfies Attachment);
            try { socket.close(CLOSE_REPLACED, 'replaced by a newer connection'); } catch { /* already closing */ }
        }

        this.ctx.acceptWebSocket(server, [peerId]);
        server.serializeAttachment({ peerId } satisfies Attachment);

        if (peerId === HOST_ID) this.toGuests(SYSTEM_ID, { type: 'host-joined' });
        else this.toPeer(HOST_ID, { fromPeerId: SYSTEM_ID, payload: { type: 'peer-joined', peerId } });

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        if (typeof message !== 'string' || message.length > MAX_MESSAGE_BYTES) return;
        const sender = (ws.deserializeAttachment() as Attachment | null)?.peerId;
        if (!sender) return;

        let parsed: { toPeerId?: unknown; payload?: unknown };
        try {
            parsed = JSON.parse(message);
        } catch {
            return;
        }
        const payload = parsed?.payload;
        if (!payload || typeof payload !== 'object' || typeof (payload as { type?: unknown }).type !== 'string') return;

        if (sender !== HOST_ID) {
            this.deliver(ws, HOST_ID, { fromPeerId: sender, toPeerId: HOST_ID, payload });
            return;
        }
        const to = typeof parsed.toPeerId === 'string' ? parsed.toPeerId : undefined;
        if (to === undefined) {
            this.toGuests(HOST_ID, payload);
            return;
        }
        this.deliver(ws, to, { fromPeerId: HOST_ID, toPeerId: to, payload });
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
        try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch { /* already closed */ }
        await this.handleGone(ws);
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        await this.handleGone(ws);
    }

    async alarm(): Promise<void> {
        if (this.ctx.getWebSockets().length === 0) await this.ctx.storage.deleteAll();
    }

    private async handleGone(ws: WebSocket): Promise<void> {
        const attachment = ws.deserializeAttachment() as Attachment | null;
        if (!attachment || attachment.announcedLeave) return;
        ws.serializeAttachment({ ...attachment, announcedLeave: true } satisfies Attachment);

        const { peerId } = attachment;
        const stillConnected = this.ctx.getWebSockets(peerId).some((socket) => socket !== ws && socket.readyState === WebSocket.OPEN);
        if (!stillConnected) {
            if (peerId === HOST_ID) this.toGuests(SYSTEM_ID, { type: 'host-left' });
            else this.toPeer(HOST_ID, { fromPeerId: SYSTEM_ID, payload: { type: 'peer-left', peerId } });
        }

        const open = this.ctx.getWebSockets().filter((socket) => socket !== ws && socket.readyState === WebSocket.OPEN);
        if (open.length === 0) await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }

    private deliver(from: WebSocket, to: string, envelope: Envelope): void {
        if (!this.toPeer(to, envelope)) {
            this.send(from, { fromPeerId: SYSTEM_ID, payload: { type: 'undeliverable', to } });
        }
    }

    private toPeer(peerId: string, envelope: Envelope): boolean {
        let delivered = false;
        for (const socket of this.ctx.getWebSockets(peerId)) delivered = this.send(socket, envelope) || delivered;
        return delivered;
    }

    private toGuests(fromPeerId: string, payload: unknown): void {
        for (const socket of this.ctx.getWebSockets()) {
            const peerId = (socket.deserializeAttachment() as Attachment | null)?.peerId;
            if (peerId && peerId !== HOST_ID) this.send(socket, { fromPeerId, toPeerId: peerId, payload });
        }
    }

    private send(socket: WebSocket, envelope: Envelope): boolean {
        if (socket.readyState !== WebSocket.OPEN) return false;
        try {
            socket.send(JSON.stringify(envelope));
            return true;
        } catch {
            return false;
        }
    }
}
