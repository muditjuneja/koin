/**
 * Host-side slot & spectator bookkeeping. Pure state — no timers, no
 * network — so the host session drives time (`expire`) and side effects.
 *
 * Player 1 is always the host and never appears here; guest slots are
 * 2..maxPlayers. A guest's session token reclaims its slot on reconnect —
 * including when the host hasn't noticed the drop yet (a phone reloading its
 * page is usually back before the old connection times out).
 */

import { PlayerIndex } from '../../lib/controls/types';
import { generateSessionToken } from './room-code';

export type SlotStatus = 'open' | 'occupied' | 'reserved';

/** Public view of a slot — safe to broadcast (no session token). */
export interface SlotView {
    slot: PlayerIndex;
    status: SlotStatus;
    peerId?: string;
    name?: string;
    /** Epoch ms when a reserved slot reopens. */
    reservedUntil?: number;
}

interface SlotRecord extends SlotView {
    sessionToken?: string;
}

export type JoinResult =
    | { ok: true; role: 'player'; slot: PlayerIndex; sessionToken: string; resumed: boolean; replacedPeerId?: string }
    | { ok: true; role: 'spectator'; sessionToken: string }
    | { ok: false; reason: 'room-full' | 'spectators-full' | 'kicked' };

export interface RoomManagerOptions {
    /** Players including the host, 2-4. Default 4. */
    maxPlayers?: 2 | 3 | 4;
    /** How long a dropped guest's slot is held for them. Default 30 s. */
    reconnectWindowMs?: number;
    /** Default 3 — every spectator costs the host a full video encode. */
    maxSpectators?: number;
}

export class RoomManager {
    readonly guestSlots: readonly PlayerIndex[];
    private readonly slots = new Map<PlayerIndex, SlotRecord>();
    private readonly spectators = new Map<string, { name?: string; sessionToken: string }>();
    private readonly kicked = new Set<string>();
    private readonly reconnectWindowMs: number;
    private readonly maxSpectators: number;

    constructor(options: RoomManagerOptions = {}) {
        const maxPlayers = options.maxPlayers ?? 4;
        this.guestSlots = ([2, 3, 4] as PlayerIndex[]).filter((slot) => slot <= maxPlayers);
        this.reconnectWindowMs = options.reconnectWindowMs ?? 30_000;
        this.maxSpectators = options.maxSpectators ?? 3;
        for (const slot of this.guestSlots) this.slots.set(slot, { slot, status: 'open' });
    }

    getSlots(): SlotView[] {
        return this.guestSlots.map((slot) => {
            const { sessionToken: _token, ...view } = this.slots.get(slot)!;
            return view;
        });
    }

    getSpectators(): { peerId: string; name?: string }[] {
        return [...this.spectators].map(([peerId, { name }]) => ({ peerId, name }));
    }

    /** The slot a peer currently occupies, if any. */
    slotOf(peerId: string): PlayerIndex | undefined {
        for (const record of this.slots.values()) {
            if (record.status === 'occupied' && record.peerId === peerId) return record.slot;
        }
        return undefined;
    }

    isSpectator(peerId: string): boolean {
        return this.spectators.has(peerId);
    }

    join(peerId: string, role: 'player' | 'spectator', options: { sessionToken?: string; name?: string } = {}): JoinResult {
        if (this.kicked.has(peerId)) return { ok: false, reason: 'kicked' };
        const { sessionToken, name } = options;

        // Same peer asking again (e.g. its join message was retried): idempotent.
        const existingSlot = this.slotOf(peerId);
        if (existingSlot !== undefined) {
            const record = this.slots.get(existingSlot)!;
            return { ok: true, role: 'player', slot: existingSlot, sessionToken: record.sessionToken!, resumed: true };
        }
        if (this.spectators.has(peerId)) return { ok: true, role: 'spectator', sessionToken: this.spectators.get(peerId)!.sessionToken };

        if (role === 'player') {
            if (sessionToken) {
                for (const record of this.slots.values()) {
                    if (record.status !== 'open' && record.sessionToken === sessionToken) {
                        const replacedPeerId = record.status === 'occupied' && record.peerId !== peerId ? record.peerId : undefined;
                        this.slots.set(record.slot, { slot: record.slot, status: 'occupied', peerId, name: name ?? record.name, sessionToken });
                        return { ok: true, role: 'player', slot: record.slot, sessionToken, resumed: true, replacedPeerId };
                    }
                }
            }
            const open = this.guestSlots.find((slot) => this.slots.get(slot)!.status === 'open');
            if (open === undefined) return { ok: false, reason: 'room-full' };
            const token = generateSessionToken();
            this.slots.set(open, { slot: open, status: 'occupied', peerId, name, sessionToken: token });
            return { ok: true, role: 'player', slot: open, sessionToken: token, resumed: false };
        }

        if (this.spectators.size >= this.maxSpectators) return { ok: false, reason: 'spectators-full' };
        const token = generateSessionToken();
        this.spectators.set(peerId, { name, sessionToken: token });
        return { ok: true, role: 'spectator', sessionToken: token };
    }

    /**
     * The peer's connection dropped. A player's slot is held for the
     * reconnect window; a spectator is simply removed. Returns the slot that
     * was reserved, if any.
     */
    disconnected(peerId: string, now: number): PlayerIndex | undefined {
        this.spectators.delete(peerId);
        const slot = this.slotOf(peerId);
        if (slot === undefined) return undefined;
        const record = this.slots.get(slot)!;
        this.slots.set(slot, { ...record, status: 'reserved', reservedUntil: now + this.reconnectWindowMs });
        return slot;
    }

    /** The peer said goodbye: free its slot now, no reconnect window. */
    left(peerId: string): PlayerIndex | undefined {
        this.spectators.delete(peerId);
        const slot = this.slotOf(peerId);
        if (slot !== undefined) this.slots.set(slot, { slot, status: 'open' });
        return slot;
    }

    /** Remove a player (by slot) or spectator (by peer id) and keep them out for the rest of the session. */
    kick(target: PlayerIndex | string): string | undefined {
        if (typeof target === 'string') {
            if (!this.spectators.delete(target)) return undefined;
            this.kicked.add(target);
            return target;
        }
        const record = this.slots.get(target);
        if (!record || record.status === 'open') return undefined;
        if (record.peerId) this.kicked.add(record.peerId);
        this.slots.set(target, { slot: target, status: 'open' });
        return record.peerId;
    }

    /** Reopen reservations whose window has passed. Returns the reopened slots. */
    expire(now: number): PlayerIndex[] {
        const reopened: PlayerIndex[] = [];
        for (const record of this.slots.values()) {
            if (record.status === 'reserved' && record.reservedUntil !== undefined && now >= record.reservedUntil) {
                this.slots.set(record.slot, { slot: record.slot, status: 'open' });
                reopened.push(record.slot);
            }
        }
        return reopened;
    }

    /** When the next reservation expires, so the caller can schedule `expire`. */
    nextExpiry(): number | undefined {
        const times = [...this.slots.values()].filter((r) => r.status === 'reserved').map((r) => r.reservedUntil!);
        return times.length ? Math.min(...times) : undefined;
    }
}
