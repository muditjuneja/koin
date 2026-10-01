/**
 * CoopGuestSession — joins a host's room, receives the game's video and
 * audio, and sends this guest's controller back.
 *
 * Input is absolute controller state, sent immediately on every change and
 * re-sent on a 20 Hz heartbeat, so a lost or reordered packet is corrected
 * within 50 ms and a released button can never stay stuck on the host.
 *
 * Identity (peer id, signaling secret, slot token) is kept per tab in
 * sessionStorage, so reloading the page reclaims the same player slot.
 */

import type { PlayerIndex } from '../../lib/controls/types';
import { CoopPeerConnection } from '../transport/peer';
import { IceServerSource, type IceServersOption } from '../transport/ice-servers';
import {
    encodeInputPacket,
    HOST_PEER_ID,
    NEUTRAL_AXES,
    type ControlMessage,
    type ControllerState,
    type HostEvent,
    type JoinRejectReason,
    type RosterEntry,
    type SignalPayload,
} from '../transport/protocol';
import { createWebSocketSignaling, type SignalingToken, type SignalingTransport } from '../transport/signaling';
import { JitterBufferController } from '../quality/receiver-tuning';
import { generateSessionToken, normalizeRoomCode } from './room-code';
import { classifyConnectionQuality, readTransportStats, type ConnectionQuality } from './connection-quality';

export interface CoopGuestOptions {
    /** Base URL of the signaling server, or a factory for a ready transport (called per identity). */
    signaling: string | ((identity: { peerId: string; secret: string }) => SignalingTransport);
    roomCode: string;
    /** Join token for signaling servers that check who may join (see the reference worker's JOIN_TOKEN_SECRET). */
    signalingToken?: SignalingToken;
    role?: 'player' | 'spectator';
    name?: string;
    /**
     * STUN/TURN servers: a fixed list, or a provider called again when
     * credentials age or a connection fails (see turnCredentialsProvider).
     * Default: public STUN only.
     */
    iceServers?: IceServersOption;
    /** Where the per-tab identity is kept. Default sessionStorage; null to keep nothing. */
    storage?: Storage | null;
    /** How long to wait for a vanished host before giving up. Default 20 s. */
    hostGraceMs?: number;
}

export type CoopGuestStatus =
    | 'connecting'        // reaching the signaling server
    | 'waiting-for-host'  // server reached, host not in the room (yet)
    | 'joining'           // accepted; setting up the peer connection
    | 'connected'
    | 'reconnecting'
    | 'rejected'
    | 'kicked'
    | 'ended'
    | 'error';

export interface CoopGuestState {
    status: CoopGuestStatus;
    roomCode: string;
    role: 'player' | 'spectator';
    slot?: PlayerIndex;
    rejectReason?: JoinRejectReason;
    error?: string;
    roster: RosterEntry[];
    spectators: number;
    mediaStream: MediaStream | null;
    /** Round-trip time to the host, ms. */
    rttMs: number | null;
    /** Estimated press-to-picture latency: round trip + jitter buffer + one frame. */
    latencyMs: number | null;
    quality: ConnectionQuality;
    hostBackgrounded: boolean;
    lastHostEvent?: { event: HostEvent; at: number };
}

interface Identity {
    peerId: string;
    secret: string;
    sessionToken?: string;
}

const HEARTBEAT_MS = 50;
const JOIN_RETRY_MS = 3000;
const PING_MS = 2000;
const DISCONNECTED_GRACE_MS = 3000;
const FRAME_MS = 1000 / 60;

export class CoopGuestSession {
    readonly roomCode: string;
    /** What we asked for, until the host says otherwise (a spectator-only token makes us a spectator). */
    private role: 'player' | 'spectator';
    private readonly listeners = new Set<(state: CoopGuestState) => void>();
    private readonly identity: Identity;
    private readonly storageKey: string;
    private signaling: SignalingTransport | null = null;
    private peer: CoopPeerConnection | null = null;
    private mediaStream: MediaStream | null = null;
    private jitter: JitterBufferController | null = null;
    private input: ControllerState = { buttons: new Set(), axes: NEUTRAL_AXES };
    private seq = 0;
    private timers: ReturnType<typeof setInterval>[] = [];
    private joinTimer?: ReturnType<typeof setInterval>;
    private graceTimer?: ReturnType<typeof setTimeout>;
    private dropTimer?: ReturnType<typeof setTimeout>;
    private lastPacketsLost = 0;
    private lastPacketsReceived = 0;
    private pingRttMs: number | null = null;
    private snapshot: CoopGuestState;

    private readonly ice: IceServerSource;

    constructor(private readonly options: CoopGuestOptions) {
        this.ice = new IceServerSource(options.iceServers);
        const code = normalizeRoomCode(options.roomCode);
        if (!code) throw new Error(`"${options.roomCode}" is not a valid room code`);
        this.roomCode = code;
        this.role = options.role ?? 'player';
        this.storageKey = `koin-netplay:${code}`;
        this.identity = this.loadIdentity();
        this.snapshot = {
            status: 'connecting',
            roomCode: code,
            role: this.role,
            roster: [],
            spectators: 0,
            mediaStream: null,
            rttMs: null,
            latencyMs: null,
            quality: 'connecting',
            hostBackgrounded: false,
        };
    }

    get state(): CoopGuestState {
        return this.snapshot;
    }

    subscribe(listener: (state: CoopGuestState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start(): void {
        void this.ice.get(); // have TURN credentials ready before anyone joins
        if (this.signaling) return;
        const { signaling } = this.options;
        const { peerId, secret } = this.identity;
        this.signaling = typeof signaling === 'string'
            ? createWebSocketSignaling({ url: signaling, roomCode: this.roomCode, peerId, secret, token: this.options.signalingToken })
            : signaling({ peerId, secret });
        this.signaling.onMessage(({ fromPeerId, payload }) => this.handleSignal(fromPeerId, payload));
        this.signaling.onStateChange((state) => {
            if (state === 'open' && this.isActive()) this.requestJoin();
            if (state === 'closed' && this.signaling?.closeReason && this.signaling.closeReason !== 'closed' && this.isActive()) {
                if (this.signaling.closeReason === 'unauthorized') this.finish('rejected', { rejectReason: 'unauthorized' });
                else this.finish('error', { error: `Could not join: ${this.signaling.closeReason}` });
            }
        });
        if (this.signaling.state === 'open') this.requestJoin();
        this.timers.push(setInterval(() => this.sendInput(), HEARTBEAT_MS));
        this.timers.push(setInterval(() => this.peer?.sendControl({ type: 'ping', t: performance.now() }), PING_MS));
        this.timers.push(setInterval(() => void this.pollStats(), 1000));
    }

    /** Replace this guest's controller state. Sent immediately if it changed, then on every heartbeat. */
    setInput(state: ControllerState): void {
        const changed = !sameState(state, this.input);
        this.input = { buttons: new Set(state.buttons), axes: state.axes };
        if (changed) this.sendInput();
    }

    /** Leave for good: frees the slot on the host immediately. */
    leave(): void {
        if (!this.isActive()) return;
        this.peer?.sendControl({ type: 'leave' });
        this.signaling?.send(HOST_PEER_ID, { type: 'bye' });
        this.identity.sessionToken = undefined;
        this.saveIdentity();
        this.finish('ended');
    }

    // --- internals ---

    private isActive(): boolean {
        return !['rejected', 'kicked', 'ended', 'error'].includes(this.snapshot.status);
    }

    private requestJoin(): void {
        clearInterval(this.joinTimer);
        const send = () => this.signaling?.send(HOST_PEER_ID, {
            type: 'join',
            role: this.role,
            sessionToken: this.identity.sessionToken,
            name: this.options.name,
        });
        send();
        // Keep asking until the host answers — it may not have joined the room yet.
        this.joinTimer = setInterval(send, JOIN_RETRY_MS);
    }

    private handleSignal(from: string, payload: SignalPayload): void {
        if (!this.isActive()) return;
        if (from !== HOST_PEER_ID && from !== '__system__') return;
        switch (payload.type) {
            case 'join-accepted':
                clearInterval(this.joinTimer);
                this.identity.sessionToken = payload.sessionToken;
                this.saveIdentity();
                this.role = payload.role;
                this.createPeer();
                this.update({ status: this.snapshot.status === 'reconnecting' ? 'reconnecting' : 'joining', role: payload.role, slot: payload.slot });
                break;
            case 'join-rejected':
                clearInterval(this.joinTimer);
                if (payload.reason === 'kicked') {
                    this.identity.sessionToken = undefined;
                    this.saveIdentity();
                    this.finish('kicked');
                } else {
                    this.finish('rejected', { rejectReason: payload.reason });
                }
                break;
            case 'sdp':
            case 'ice':
                void this.peer?.handleSignal(payload);
                break;
            case 'undeliverable':
                if (this.snapshot.status === 'connecting') this.update({ status: 'waiting-for-host' });
                break;
            case 'host-left':
                // The host's signaling socket is gone. If our media is still
                // flowing it's just a signaling blip; otherwise start the grace.
                if (this.snapshot.status !== 'connected') this.beginHostGrace();
                break;
            case 'host-joined':
                if (this.snapshot.status !== 'connected') this.requestJoin();
                break;
            default:
                break;
        }
    }

    private createPeer(): void {
        this.peer?.close();
        this.mediaStream = null;
        this.jitter = null;
        this.lastPacketsLost = 0;
        this.lastPacketsReceived = 0;
        this.peer = new CoopPeerConnection({
            role: 'guest',
            iceServers: this.ice.current(),
                refreshIceServers: () => this.ice.get(true),
            onSignal: (signal) => this.signaling?.send(HOST_PEER_ID, signal),
            onTrack: (event) => {
                if (!this.mediaStream) this.mediaStream = event.streams[0] ?? new MediaStream();
                if (!this.mediaStream.getTracks().includes(event.track)) this.mediaStream.addTrack(event.track);
                if (event.track.kind === 'video') this.jitter = new JitterBufferController(event.receiver);
                this.update({ mediaStream: this.mediaStream });
            },
            onConnectionStateChange: (state) => this.handlePeerState(state),
            onReady: () => this.sendInput(),
            onControl: (message) => this.handleControl(message),
        });
    }

    private handlePeerState(state: RTCPeerConnectionState): void {
        clearTimeout(this.dropTimer);
        if (state === 'connected') {
            clearTimeout(this.graceTimer);
            this.graceTimer = undefined;
            this.update({ status: 'connected' });
        } else if (state === 'disconnected') {
            this.dropTimer = setTimeout(() => this.reconnect(), DISCONNECTED_GRACE_MS);
        } else if (state === 'failed') {
            this.reconnect();
        }
    }

    /** Lost the host: rejoin with our session token (same slot) until the grace period runs out. */
    private reconnect(): void {
        if (!this.isActive()) return;
        this.peer?.close();
        this.peer = null;
        this.update({ status: 'reconnecting', mediaStream: null, quality: 'reconnecting' });
        this.beginHostGrace();
        this.requestJoin();
    }

    private beginHostGrace(): void {
        if (this.graceTimer) return;
        if (this.snapshot.status === 'connected') this.update({ status: 'reconnecting', quality: 'reconnecting' });
        this.graceTimer = setTimeout(() => this.finish('ended'), this.options.hostGraceMs ?? 20_000);
    }

    private handleControl(message: ControlMessage): void {
        switch (message.type) {
            case 'welcome':
                this.update({ role: message.role, slot: message.slot });
                break;
            case 'roster':
                this.update({ roster: Array.isArray(message.players) ? message.players : [], spectators: Number(message.spectators) || 0 });
                break;
            case 'host-event':
                this.update({ lastHostEvent: { event: message.event, at: Date.now() } });
                break;
            case 'host-status':
                this.update({ hostBackgrounded: !!message.backgrounded });
                break;
            case 'pong':
                if (typeof message.t === 'number') this.pingRttMs = performance.now() - message.t;
                break;
            case 'kicked':
                this.identity.sessionToken = undefined;
                this.saveIdentity();
                this.finish('kicked');
                break;
            case 'host-ended':
                this.identity.sessionToken = undefined;
                this.saveIdentity();
                this.finish('ended');
                break;
            default:
                break;
        }
    }

    private sendInput(): void {
        if (this.role !== 'player' || !this.peer?.isReady) return;
        this.seq = (this.seq + 1) & 0xffff;
        this.peer.sendInput(encodeInputPacket({ seq: this.seq, ...this.input }));
    }

    private async pollStats(): Promise<void> {
        const pc = this.peer?.pc;
        if (!pc || this.snapshot.status !== 'connected') return;
        try {
            const stats = await pc.getStats();
            let jitterBufferMs: number | null = null;
            let packetsLost = 0;
            let packetsReceived = 0;
            stats.forEach((report) => {
                if (report.type === 'inbound-rtp' && report.kind === 'video') {
                    packetsLost = report.packetsLost ?? 0;
                    packetsReceived = report.packetsReceived ?? 0;
                    if (report.jitterBufferEmittedCount > 0) jitterBufferMs = (report.jitterBufferDelay / report.jitterBufferEmittedCount) * 1000;
                }
            });
            this.jitter?.update(packetsLost);
            const lost = Math.max(0, packetsLost - this.lastPacketsLost);
            const received = Math.max(0, packetsReceived - this.lastPacketsReceived);
            this.lastPacketsLost = packetsLost;
            this.lastPacketsReceived = packetsReceived;
            // The ICE candidate pair's RTT is the transport's own measurement;
            // the ping/pong round trip is the fallback where stats lack it.
            const rttMs = readTransportStats(stats as unknown as Parameters<typeof readTransportStats>[0]).rttMs ?? this.pingRttMs;
            if (rttMs === null) return;
            const latencyMs = rttMs + (jitterBufferMs ?? 0) + FRAME_MS;
            this.update({ rttMs, latencyMs, quality: classifyConnectionQuality(latencyMs, lost / Math.max(1, lost + received)) });
        } catch {
            // connection torn down mid-poll
        }
    }

    private finish(status: 'rejected' | 'kicked' | 'ended' | 'error', extra: Partial<CoopGuestState> = {}): void {
        for (const timer of this.timers) clearInterval(timer);
        this.timers = [];
        clearInterval(this.joinTimer);
        clearTimeout(this.graceTimer);
        clearTimeout(this.dropTimer);
        this.peer?.close();
        this.peer = null;
        this.signaling?.close();
        this.update({ ...extra, status, mediaStream: null, quality: 'disconnected' });
    }

    private loadIdentity(): Identity {
        const storage = this.storage();
        try {
            const saved = storage && JSON.parse(storage.getItem(this.storageKey) ?? 'null');
            if (saved && typeof saved.peerId === 'string' && typeof saved.secret === 'string') return saved;
        } catch {
            // unreadable — start fresh
        }
        const identity = { peerId: generateSessionToken(12), secret: generateSessionToken() };
        this.persist(identity);
        return identity;
    }

    private saveIdentity(): void {
        this.persist(this.identity);
    }

    private persist(identity: Identity): void {
        try {
            this.storage()?.setItem(this.storageKey, JSON.stringify(identity));
        } catch {
            // storage full or blocked — reconnects just won't survive a reload
        }
    }

    private storage(): Storage | null {
        if (this.options.storage !== undefined) return this.options.storage;
        try {
            return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
        } catch {
            return null;
        }
    }

    private update(patch: Partial<CoopGuestState>): void {
        this.snapshot = { ...this.snapshot, ...patch };
        for (const listener of [...this.listeners]) {
            try {
                listener(this.snapshot);
            } catch (err) {
                console.error('[netplay] guest state listener threw:', err);
            }
        }
    }
}

function sameState(a: ControllerState, b: ControllerState): boolean {
    if (a.buttons.size !== b.buttons.size) return false;
    for (const button of a.buttons) if (!b.buttons.has(button)) return false;
    return a.axes.every((axis, i) => Math.abs(axis - b.axes[i]) < 1 / 127);
}
