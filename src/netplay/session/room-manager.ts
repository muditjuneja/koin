/**
 * Host-side slot & spectator lifecycle (plan §3a).
 *
 * Deliberately transport- and emulator-agnostic — it tracks *who occupies
 * what*, not WebRTC connections or held buttons. The host wires its events
 * to the actual side effects: onSlotAssigned drives a synthetic keyboard
 * allocation, onSlotDisconnected drives releasing that slot's held buttons
 * (see held-buttons-tracker.ts) before the slot goes into its reconnect
 * grace window.
 */

import { PlayerIndex } from '../../lib/controls/types';
import { generateRoomCode, generateSessionToken } from './room-code';

export const GUEST_SLOTS: readonly PlayerIndex[] = [2, 3, 4];

export type SlotStatus = 'open' | 'occupied' | 'reserved';

export interface SlotState {
    slot: PlayerIndex;
    status: SlotStatus;
    peerId?: string;
    sessionToken?: string;
    /** Only set while status === 'reserved' — epoch ms after which the slot reverts to 'open'. */
    reservedUntil?: number;
}

export type JoinPlayerResult =
    | { ok: true; slot: PlayerIndex; sessionToken: string; resumed: boolean }
    | { ok: false; reason: 'room-full' };

export type JoinSpectatorResult =
    | { ok: true }
    | { ok: false; reason: 'spectators-full' };

export interface RoomManagerEvents {
    onSlotAssigned?: (slot: PlayerIndex, peerId: string) => void;
    /** Unexpected drop — the slot is now reserved for reconnectWindowMs. The host should release any buttons still held for this slot. */
    onSlotDisconnected?: (slot: PlayerIndex) => void;
    /** A reservation expired, or a guest explicitly left / was kicked — the slot is open again. */
    onSlotReleased?: (slot: PlayerIndex) => void;
    onSpectatorJoined?: (peerId: string) => void;
    onSpectatorLeft?: (peerId: string) => void;
}

export interface RoomManagerOptions extends RoomManagerEvents {
    /** How long a disconnected guest's slot stays reserved before opening up. Default 30s (plan §3a). */
    guestReconnectWindowMs?: number;
    /** Default 3 — see plan §3a: encoding is confirmed per-peer, so each spectator has a real CPU cost. */
    maxSpectators?: number;
    /** Injection point for tests; defaults to Date.now. */
    now?: () => number;
    /** Injection point for tests; defaults to Math.random via generateRoomCode. */
    randomForRoomCode?: () => number;
}

export class RoomManager {
    readonly roomCode: string;
    private readonly slots: Map<PlayerIndex, SlotState>;
    private readonly spectators = new Set<string>();
    private readonly now: () => number;
    private readonly guestReconnectWindowMs: number;
    private readonly maxSpectators: number;
    private readonly events: RoomManagerEvents;

    constructor(options: RoomManagerOptions = {}) {
        this.roomCode = generateRoomCode(options.randomForRoomCode);
        this.now = options.now ?? (() => Date.now());
        this.guestReconnectWindowMs = options.guestReconnectWindowMs ?? 30_000;
        this.maxSpectators = options.maxSpectators ?? 3;
        this.events = options;
        this.slots = new Map(GUEST_SLOTS.map((slot) => [slot, { slot, status: 'open' as const }]));
    }

    private expireStale(): void {
        const t = this.now();
        for (const state of this.slots.values()) {
            if (state.status === 'reserved' && state.reservedUntil !== undefined && t >= state.reservedUntil) {
                this.slots.set(state.slot, { slot: state.slot, status: 'open' });
                this.events.onSlotReleased?.(state.slot);
            }
        }
    }

    getSlots(): SlotState[] {
        this.expireStale();
        return GUEST_SLOTS.map((slot) => ({ ...this.slots.get(slot)! }));
    }

    getSlot(slot: PlayerIndex): SlotState | undefined {
        this.expireStale();
        const state = this.slots.get(slot);
        return state ? { ...state } : undefined;
    }

    get spectatorCount(): number {
        return this.spectators.size;
    }

    /**
     * A new peer wants a player slot. If it presents a sessionToken that
     * matches a currently-reserved slot, it resumes that exact slot rather
     * than taking a fresh one — a late reconnect inside the grace window
     * doesn't renegotiate who is P2.
     */
    joinAsPlayer(peerId: string, sessionToken?: string): JoinPlayerResult {
        this.expireStale();

        if (sessionToken) {
            for (const state of this.slots.values()) {
                if (state.status === 'reserved' && state.sessionToken === sessionToken) {
                    this.slots.set(state.slot, { slot: state.slot, status: 'occupied', peerId, sessionToken });
                    this.events.onSlotAssigned?.(state.slot, peerId);
                    return { ok: true, slot: state.slot, sessionToken, resumed: true };
                }
            }
        }

        const openSlot = GUEST_SLOTS.find((slot) => this.slots.get(slot)!.status === 'open');
        if (openSlot === undefined) return { ok: false, reason: 'room-full' };

        const newToken = generateSessionToken();
        this.slots.set(openSlot, { slot: openSlot, status: 'occupied', peerId, sessionToken: newToken });
        this.events.onSlotAssigned?.(openSlot, peerId);
        return { ok: true, slot: openSlot, sessionToken: newToken, resumed: false };
    }

    joinAsSpectator(peerId: string): JoinSpectatorResult {
        if (this.spectators.size >= this.maxSpectators) return { ok: false, reason: 'spectators-full' };
        this.spectators.add(peerId);
        this.events.onSpectatorJoined?.(peerId);
        return { ok: true };
    }

    leaveSpectator(peerId: string): void {
        if (this.spectators.delete(peerId)) {
            this.events.onSpectatorLeft?.(peerId);
        }
    }

    /** Unexpected drop (ICE failure, tab closed without a "leave") — reserve the slot rather than freeing it immediately. */
    handleGuestDisconnected(slot: PlayerIndex): void {
        const state = this.slots.get(slot);
        if (!state || state.status !== 'occupied') return;
        this.slots.set(slot, {
            slot,
            status: 'reserved',
            sessionToken: state.sessionToken,
            reservedUntil: this.now() + this.guestReconnectWindowMs,
        });
        this.events.onSlotDisconnected?.(slot);
    }

    /** Explicit "leave" message, or nothing to reconnect to — free the slot immediately, no grace window. */
    handleGuestLeft(slot: PlayerIndex): void {
        const state = this.slots.get(slot);
        if (!state || state.status === 'open') return;
        this.slots.set(slot, { slot, status: 'open' });
        this.events.onSlotReleased?.(slot);
    }

    /** Host-initiated kick — same effect as a leave, freeing the slot immediately even mid-reservation. */
    kick(slot: PlayerIndex): void {
        this.handleGuestLeft(slot);
    }
}
