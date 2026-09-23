/**
 * CoopHostSession — everything the host needs to run a co-op room.
 *
 * The host runs the only emulator. Each guest gets its own peer connection
 * carrying the host's video and audio out and the guest's controller in;
 * guest controllers are injected as virtual gamepads for players 2-4.
 *
 * Framework-agnostic: React code uses it through useCoopHost / GamePlayer's
 * `coop` prop, but nothing here depends on React.
 */

import { coopMaxPlayers } from '../../lib/controls/coop';
import type { PlayerIndex } from '../../lib/controls/types';
import { VirtualGamepadHub, type EmulatorEventSource } from '../input/virtual-gamepads';
import { CoopPeerConnection } from '../transport/peer';
import { IceServerSource, type IceServersOption } from '../transport/ice-servers';
import { decodeInputPacket, HOST_PEER_ID, isNewerSeq, type ControlMessage, type HostEvent, type RosterEntry, type SignalPayload } from '../transport/protocol';
import { createWebSocketSignaling, type SignalingToken, type SignalingTransport, type VerifiedIdentity } from '../transport/signaling';
import { applyEncodingProfile, applyVideoCodecPreferences } from '../quality/sender-tuning';
import { DegradationLadder, p90, profileFor } from '../quality/degradation-ladder';
import { RoomManager, type SlotView } from './room-manager';
import { generateRoomCode, generateSessionToken } from './room-code';
import { readTransportStats } from './connection-quality';

/** What the host session needs from the running emulator. */
export interface CoopEmulatorHandle extends EmulatorEventSource {
    canvas: HTMLCanvasElement;
    getAudioStream(): MediaStream | null;
    /** Subscribe to the game's audio becoming available (it only exists after the first sound). */
    onAudioAvailable?(listener: () => void): () => void;
}

export interface CoopHostOptions {
    /** Base URL of the signaling server, or a ready transport (e.g. createMemorySignalingHub().connect('host')). */
    signaling: string | SignalingTransport;
    /** Join token for signaling servers that check who may host (see the reference worker's JOIN_TOKEN_SECRET). */
    signalingToken?: SignalingToken;
    /** Reuse a room code (e.g. after a host page reload); a fresh one is generated otherwise. */
    roomCode?: string;
    /** Core the emulator runs — decides how many players can join (2 unless the core has 4 ports or a multitap). */
    core?: string;
    /**
     * STUN/TURN servers: a fixed list, or a provider called again when
     * credentials age or a connection fails (see turnCredentialsProvider).
     * Default: public STUN only.
     */
    iceServers?: IceServersOption;
    maxSpectators?: number;
    /** How long a dropped player's slot is held for them. Default 30 s. */
    reconnectWindowMs?: number;
}

export interface CoopHostPeer {
    peerId: string;
    role: 'player' | 'spectator';
    slot?: PlayerIndex;
    name?: string;
    /** The integrator's user id, when the signaling server verified one. */
    userId?: string;
    connected: boolean;
    rttMs: number | null;
    relayed: boolean;
}

export interface CoopHostState {
    status: 'idle' | 'starting' | 'hosting' | 'stopped' | 'error';
    error?: string;
    roomCode: string;
    maxPlayers: 2 | 3 | 4;
    slots: SlotView[];
    spectators: { peerId: string; name?: string }[];
    peers: CoopHostPeer[];
    /** Guests (players or spectators) with a live connection. */
    guestsConnected: number;
    emulatorAttached: boolean;
    degradationStep: number;
}

interface PeerEntry {
    peerId: string;
    role: 'player' | 'spectator';
    slot?: PlayerIndex;
    name?: string;
    userId?: string;
    pc: CoopPeerConnection;
    connected: boolean;
    lastSeq: number | null;
    rttMs: number | null;
    relayed: boolean;
    dropTimer?: ReturnType<typeof setTimeout>;
    lastInputAt: number;
    inputStale: boolean;
}

/** A peer reported 'disconnected' may recover on its own (ICE restarts); give it this long first. */
const DISCONNECTED_GRACE_MS = 5000;
const STATS_INTERVAL_MS = 2000;
/**
 * Guests resend their controller every 50 ms. If nothing arrives for this
 * long (tab closed, network gone), release their buttons right away instead
 * of waiting the several seconds WebRTC takes to declare the connection dead.
 */
const INPUT_TIMEOUT_MS = 1000;

export class CoopHostSession {
    readonly roomCode: string;
    private readonly room: RoomManager;
    private readonly pads: VirtualGamepadHub;
    private readonly peers = new Map<string, PeerEntry>();
    private readonly listeners = new Set<(state: CoopHostState) => void>();
    private readonly ladder = new DegradationLadder();
    private readonly maxPlayers: 2 | 3 | 4;
    private signaling: SignalingTransport | null = null;
    private emulator: CoopEmulatorHandle | null = null;
    private videoTrack: MediaStreamTrack | null = null;
    private audioTrack: MediaStreamTrack | null = null;
    private status: CoopHostState['status'] = 'idle';
    private error: string | undefined;
    private expiryTimer?: ReturnType<typeof setTimeout>;
    private statsTimer?: ReturnType<typeof setInterval>;
    private livenessTimer?: ReturnType<typeof setInterval>;
    private stopFramePacing?: () => void;
    private detachAudio?: () => void;
    private removeVisibilityListener?: () => void;
    private snapshot: CoopHostState;

    private readonly ice: IceServerSource;

    constructor(private readonly options: CoopHostOptions) {
        this.ice = new IceServerSource(options.iceServers);
        this.roomCode = options.roomCode ?? generateRoomCode();
        this.maxPlayers = coopMaxPlayers(options.core);
        this.room = new RoomManager({ maxPlayers: this.maxPlayers, maxSpectators: options.maxSpectators, reconnectWindowMs: options.reconnectWindowMs });
        this.pads = new VirtualGamepadHub(this.room.guestSlots);
        this.snapshot = this.buildState();
    }

    get state(): CoopHostState {
        return this.snapshot;
    }

    subscribe(listener: (state: CoopHostState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    start(): void {
        void this.ice.get(); // have TURN credentials ready before anyone joins
        if (this.status !== 'idle') return;
        this.status = 'starting';
        const { signaling } = this.options;
        this.signaling = typeof signaling === 'string'
            ? createWebSocketSignaling({ url: signaling, roomCode: this.roomCode, peerId: HOST_PEER_ID, secret: this.hostSecret(), token: this.options.signalingToken })
            : signaling;
        this.signaling.onMessage(({ fromPeerId, payload, identity }) => this.handleSignal(fromPeerId, payload, identity));
        this.signaling.onStateChange((state) => {
            if (state === 'open' && this.status === 'starting') this.status = 'hosting';
            if (state === 'closed' && this.signaling?.closeReason && this.signaling.closeReason !== 'closed') {
                this.status = 'error';
                this.error = this.signaling.closeReason === 'peer-id-taken'
                    ? 'This room is already hosted from another tab or device.'
                    : this.signaling.closeReason === 'unauthorized'
                        ? 'Not allowed to host this room (the signaling server refused the join token).'
                        : `Signaling closed: ${this.signaling.closeReason}`;
            }
            this.emit();
        });
        if (this.signaling.state === 'open') this.status = 'hosting';
        this.statsTimer = setInterval(() => void this.pollStats(), STATS_INTERVAL_MS);
        this.livenessTimer = setInterval(() => this.releaseSilentPlayers(), INPUT_TIMEOUT_MS / 4);
        // A hidden host tab throttles the emulator for everyone; tell guests why.
        if (typeof document !== 'undefined') {
            const onVisibility = () => this.broadcast({ type: 'host-status', backgrounded: document.hidden });
            document.addEventListener('visibilitychange', onVisibility);
            this.removeVisibilityListener = () => document.removeEventListener('visibilitychange', onVisibility);
        }
        this.emit();
    }

    /**
     * Connect the running emulator: capture its canvas and audio for every
     * guest, and take over gamepad indices 1-3 for remote players. Call again
     * whenever the emulator instance changes (e.g. after a restart). Returns a
     * detach function.
     */
    attachEmulator(emulator: CoopEmulatorHandle): () => void {
        this.detachEmulator();
        this.emulator = emulator;
        this.pads.install(emulator);
        this.videoTrack = emulator.canvas.captureStream().getVideoTracks()[0] ?? null;
        this.refreshAudioTrack();
        this.detachAudio = emulator.onAudioAvailable?.(() => this.refreshAudioTrack());
        for (const entry of this.peers.values()) void entry.pc.setTracks(this.videoTrack, this.audioTrack);
        this.stopFramePacing = this.monitorFramePacing();
        this.emit();
        return () => {
            if (this.emulator === emulator) this.detachEmulator();
        };
    }

    kick(target: PlayerIndex | string): void {
        const peerId = typeof target === 'string' ? target : this.room.getSlots().find((s) => s.slot === target)?.peerId;
        const kicked = this.room.kick(target);
        const entry = peerId ? this.peers.get(peerId) : undefined;
        const slot = typeof target === 'number' ? target : entry?.slot;
        if (entry) {
            // Its connection stays open briefly so the kick notice arrives;
            // input still in flight must not press the slot's buttons again.
            entry.slot = undefined;
        }
        if (slot !== undefined) this.pads.release(slot);
        if (entry) {
            entry.pc.sendControl({ type: 'kicked' });
            this.signaling?.send(entry.peerId, { type: 'join-rejected', reason: 'kicked' });
            // Let the kicked message flush before tearing the connection down.
            setTimeout(() => this.closePeer(entry.peerId), 250);
        } else if (kicked) {
            this.signaling?.send(kicked, { type: 'join-rejected', reason: 'kicked' });
        }
        this.broadcastRoster();
        this.emit();
    }

    /** Tell every guest something happened on the host (shown as a toast). */
    announce(event: HostEvent): void {
        this.broadcast({ type: 'host-event', event });
    }

    stop(): void {
        if (this.status === 'stopped') return;
        this.status = 'stopped';
        this.broadcast({ type: 'host-ended' });
        for (const entry of [...this.peers.values()]) this.closePeer(entry.peerId);
        this.detachEmulator();
        clearInterval(this.statsTimer);
        clearInterval(this.livenessTimer);
        clearTimeout(this.expiryTimer);
        this.removeVisibilityListener?.();
        this.signaling?.close();
        this.emit();
    }

    // --- internals ---

    /**
     * The signaling server pins the "host" id to the first secret it sees for
     * a room. Keep it per tab so a reload (or a remount) can host the same
     * room code again, while any other tab or device is refused.
     */
    private hostSecret(): string {
        const key = `koin-netplay-host:${this.roomCode}`;
        try {
            const saved = sessionStorage.getItem(key);
            if (saved) return saved;
            const secret = generateSessionToken();
            sessionStorage.setItem(key, secret);
            return secret;
        } catch {
            return generateSessionToken();
        }
    }

    private detachEmulator(): void {
        if (!this.emulator) return;
        this.stopFramePacing?.();
        this.detachAudio?.();
        this.stopFramePacing = undefined;
        this.detachAudio = undefined;
        for (const entry of this.peers.values()) void entry.pc.setTracks(null, null);
        this.videoTrack?.stop();
        this.videoTrack = null;
        this.audioTrack = null;
        this.pads.uninstall();
        this.emulator = null;
        this.emit();
    }

    private refreshAudioTrack(): void {
        const track = this.emulator?.getAudioStream()?.getAudioTracks()[0] ?? null;
        if (track === this.audioTrack) return;
        this.audioTrack = track;
        for (const entry of this.peers.values()) void entry.pc.setTracks(this.videoTrack, this.audioTrack);
    }

    private handleSignal(from: string, payload: SignalPayload, identity?: VerifiedIdentity): void {
        switch (payload.type) {
            case 'join': {
                // A server-verified identity outranks what the guest says about itself.
                const role = identity?.role === 'spectator' || payload.role === 'spectator' ? 'spectator' : 'player';
                this.handleJoin(from, role, payload.sessionToken, identity?.name ?? payload.name, identity?.userId);
                break;
            }
            case 'sdp':
            case 'ice':
                void this.peers.get(from)?.pc.handleSignal(payload);
                break;
            case 'bye':
                this.handleLeave(from);
                break;
            case 'peer-left': {
                // The guest's signaling socket went away. Its peer connection may
                // well be fine (signaling isn't needed once connected) — only act
                // if that isn't connected either.
                const entry = this.peers.get(payload.peerId);
                if (entry && !entry.connected) this.handleDrop(entry.peerId);
                break;
            }
            default:
                break;
        }
    }

    private handleJoin(peerId: string, role: 'player' | 'spectator', sessionToken?: string, name?: string, userId?: string): void {
        if (peerId === HOST_PEER_ID || peerId.startsWith('__')) return;
        const existing = this.peers.get(peerId);
        const result = this.room.join(peerId, role, { sessionToken, name: typeof name === 'string' ? name.slice(0, 32) : undefined });
        if (!result.ok) {
            this.signaling?.send(peerId, { type: 'join-rejected', reason: result.reason });
            return;
        }
        // Under CPU pressure the host stops taking newcomers, but never turns
        // away someone reclaiming their own slot or retrying their join.
        const isNewcomer = !existing && !(result.role === 'player' && result.resumed);
        if (isNewcomer && !this.ladder.level.acceptNewPeers) {
            this.room.left(peerId);
            this.signaling?.send(peerId, { type: 'join-rejected', reason: 'busy' });
            return;
        }
        if (result.role === 'player' && result.replacedPeerId) this.closePeer(result.replacedPeerId);

        // A retried join from a peer we already have: start over with a fresh
        // connection (its old one is what it gave up on).
        if (existing) this.closePeer(peerId);

        const slot = result.role === 'player' ? result.slot : undefined;
        this.signaling?.send(peerId, { type: 'join-accepted', role: result.role, slot, sessionToken: result.sessionToken });
        if (slot !== undefined) this.pads.release(slot);

        const entry: PeerEntry = {
            peerId,
            role: result.role,
            slot,
            name,
            userId,
            connected: false,
            lastSeq: null,
            rttMs: null,
            relayed: false,
            lastInputAt: 0,
            inputStale: false,
            pc: new CoopPeerConnection({
                role: 'host',
                iceServers: this.ice.current(),
                refreshIceServers: () => this.ice.get(true),
                configureVideoTransceiver: applyVideoCodecPreferences,
                onSignal: (signal) => this.signaling?.send(peerId, signal),
                onConnectionStateChange: (state) => this.handlePeerState(peerId, state),
                onReady: () => this.handlePeerReady(peerId),
                onInput: (data) => this.handleInput(peerId, data),
                onControl: (message) => this.handleControl(peerId, message),
            }),
        };
        this.peers.set(peerId, entry);
        void entry.pc.setTracks(this.videoTrack, this.audioTrack);
        this.scheduleExpiry();
        this.emit();
    }

    private handlePeerReady(peerId: string): void {
        const entry = this.peers.get(peerId);
        if (!entry) return;
        entry.pc.sendControl({ type: 'welcome', role: entry.role, slot: entry.slot });
        if (typeof document !== 'undefined' && document.hidden) entry.pc.sendControl({ type: 'host-status', backgrounded: true });
        this.broadcastRoster();
    }

    private handlePeerState(peerId: string, state: RTCPeerConnectionState): void {
        const entry = this.peers.get(peerId);
        if (!entry) return;
        clearTimeout(entry.dropTimer);
        if (state === 'connected') {
            entry.connected = true;
            void this.applyProfile(entry);
        } else if (state === 'disconnected') {
            entry.dropTimer = setTimeout(() => this.handleDrop(peerId), DISCONNECTED_GRACE_MS);
        } else if (state === 'failed' || state === 'closed') {
            this.handleDrop(peerId);
            return;
        }
        this.emit();
    }

    private handleInput(peerId: string, data: ArrayBuffer): void {
        const entry = this.peers.get(peerId);
        if (!entry || entry.role !== 'player' || entry.slot === undefined) return;
        const packet = decodeInputPacket(data);
        if (!packet) return;
        if (entry.lastSeq !== null && !isNewerSeq(packet.seq, entry.lastSeq)) return;
        entry.lastSeq = packet.seq;
        entry.lastInputAt = performance.now();
        entry.inputStale = false;
        this.pads.setState(entry.slot, packet);
    }

    private releaseSilentPlayers(): void {
        const now = performance.now();
        for (const entry of this.peers.values()) {
            if (entry.slot === undefined || entry.inputStale || entry.lastInputAt === 0) continue;
            if (now - entry.lastInputAt > INPUT_TIMEOUT_MS) {
                entry.inputStale = true;
                this.pads.release(entry.slot);
            }
        }
    }

    private handleControl(peerId: string, message: ControlMessage): void {
        const entry = this.peers.get(peerId);
        if (!entry) return;
        if (message.type === 'ping' && typeof message.t === 'number') entry.pc.sendControl({ type: 'pong', t: message.t });
        else if (message.type === 'leave') this.handleLeave(peerId);
    }

    /** The connection is gone: hold a player's slot for the reconnect window. */
    private handleDrop(peerId: string): void {
        const entry = this.peers.get(peerId);
        if (!entry) return;
        if (entry.slot !== undefined) this.pads.release(entry.slot);
        this.closePeer(peerId);
        this.room.disconnected(peerId, Date.now());
        this.scheduleExpiry();
        this.broadcastRoster();
        this.emit();
    }

    /** The guest said goodbye: free the slot now. */
    private handleLeave(peerId: string): void {
        const entry = this.peers.get(peerId);
        if (entry?.slot !== undefined) this.pads.release(entry.slot);
        this.closePeer(peerId);
        this.room.left(peerId);
        this.broadcastRoster();
        this.emit();
    }

    private closePeer(peerId: string): void {
        const entry = this.peers.get(peerId);
        if (!entry) return;
        clearTimeout(entry.dropTimer);
        this.peers.delete(peerId);
        entry.pc.close();
        // With nobody left there is no encoding to shed; start the next
        // session from full quality.
        if (this.peers.size === 0) this.ladder.reset();
        this.emit();
    }

    private scheduleExpiry(): void {
        clearTimeout(this.expiryTimer);
        const next = this.room.nextExpiry();
        if (next === undefined) return;
        this.expiryTimer = setTimeout(() => {
            if (this.room.expire(Date.now()).length) {
                this.broadcastRoster();
                this.emit();
            }
            this.scheduleExpiry();
        }, Math.max(0, next - Date.now()) + 10);
    }

    private roster(): RosterEntry[] {
        return this.room.getSlots().map(({ slot, status, name }) => ({ slot, status, name }));
    }

    private broadcastRoster(): void {
        this.broadcast({ type: 'roster', players: this.roster(), spectators: this.room.getSpectators().length });
    }

    private broadcast(message: ControlMessage): void {
        for (const entry of this.peers.values()) entry.pc.sendControl(message);
    }

    private async applyProfile(entry: PeerEntry): Promise<void> {
        const sender = entry.pc.senders.video;
        const height = this.emulator?.canvas.height ?? 0;
        if (!sender || !height || !entry.connected) return;
        try {
            await applyEncodingProfile(sender, profileFor(this.ladder.level, entry.role, entry.relayed), height, entry.role);
        } catch (err) {
            console.warn('[netplay] applying encoding profile failed:', err);
        }
    }

    private async pollStats(): Promise<void> {
        let changed = false;
        await Promise.all([...this.peers.values()].map(async (entry) => {
            if (!entry.connected) return;
            try {
                const stats = readTransportStats(await entry.pc.pc.getStats() as unknown as Parameters<typeof readTransportStats>[0]);
                const relayChanged = stats.relayed !== entry.relayed;
                if (stats.rttMs !== entry.rttMs || relayChanged) changed = true;
                entry.rttMs = stats.rttMs;
                entry.relayed = stats.relayed;
                // Reapply every poll: cheap, and picks up host canvas resizes (fullscreen).
                await this.applyProfile(entry);
            } catch {
                // connection torn down mid-poll
            }
        }));
        if (changed) this.emit();
    }

    /**
     * Feeds the degradation ladder with per-second frame pacing while the page
     * is visible and someone is being streamed to. The ladder can only shed
     * encoding, so a host that is slow on its own must not climb it (and end
     * up refusing its first guest).
     */
    private monitorFramePacing(): () => void {
        let last = performance.now();
        let intervals: number[] = [];
        let windowStart = last;
        let raf = 0;
        const tick = (now: number) => {
            const hidden = typeof document !== 'undefined' && document.hidden;
            if (!hidden) intervals.push(now - last);
            last = now;
            if (now - windowStart >= 1000) {
                if (!hidden && this.peers.size > 0 && intervals.length > 10 && this.ladder.sample(p90(intervals))) {
                    for (const entry of this.peers.values()) void this.applyProfile(entry);
                    this.emit();
                }
                intervals = [];
                windowStart = now;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }

    private buildState(): CoopHostState {
        const peers = [...this.peers.values()].map(({ peerId, role, slot, name, userId, connected, rttMs, relayed }) => ({ peerId, role, slot, name, userId, connected, rttMs, relayed }));
        return {
            status: this.status,
            error: this.error,
            roomCode: this.roomCode,
            maxPlayers: this.maxPlayers,
            slots: this.room.getSlots(),
            spectators: this.room.getSpectators(),
            peers,
            guestsConnected: peers.filter((p) => p.connected).length,
            emulatorAttached: this.emulator !== null,
            degradationStep: this.ladder.level.step,
        };
    }

    private emit(): void {
        this.snapshot = this.buildState();
        for (const listener of [...this.listeners]) {
            try {
                listener(this.snapshot);
            } catch (err) {
                console.error('[netplay] host state listener threw:', err);
            }
        }
    }
}
