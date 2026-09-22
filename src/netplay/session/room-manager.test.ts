import { describe, expect, it } from 'vitest';
import { RoomManager } from './room-manager';
import { generateRoomCode, generateSessionToken, normalizeRoomCode, ROOM_CODE_LENGTH } from './room-code';

function joinPlayer(room: RoomManager, peerId: string, sessionToken?: string) {
    const result = room.join(peerId, 'player', { sessionToken });
    if (!result.ok || result.role !== 'player') throw new Error(`join failed: ${JSON.stringify(result)}`);
    return result;
}

describe('room codes and tokens', () => {
    it('uses only the unambiguous alphabet', () => {
        for (let i = 0; i < 500; i++) {
            const code = generateRoomCode();
            expect(code).toHaveLength(ROOM_CODE_LENGTH);
            expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
        }
    });

    it('normalizes typed codes and rejects impossible ones', () => {
        expect(normalizeRoomCode(' abc-def ')).toBe('ABCDEF');
        expect(normalizeRoomCode('ABCDE0')).toBeNull(); // 0 is not in the alphabet
        expect(normalizeRoomCode('ABC')).toBeNull();
    });

    it('generates distinct URL-safe tokens that satisfy the signaling server', () => {
        const tokens = new Set(Array.from({ length: 200 }, () => generateSessionToken()));
        expect(tokens.size).toBe(200);
        for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
    });
});

describe('RoomManager', () => {
    it('fills guest slots 2, 3, 4 in order and then reports room-full', () => {
        const room = new RoomManager();
        expect([joinPlayer(room, 'a').slot, joinPlayer(room, 'b').slot, joinPlayer(room, 'c').slot]).toEqual([2, 3, 4]);
        expect(room.join('d', 'player')).toEqual({ ok: false, reason: 'room-full' });
    });

    it('limits slots to what the core supports', () => {
        const room = new RoomManager({ maxPlayers: 2 });
        expect(room.guestSlots).toEqual([2]);
        joinPlayer(room, 'a');
        expect(room.join('b', 'player')).toEqual({ ok: false, reason: 'room-full' });
    });

    it('is idempotent for a peer that asks to join twice', () => {
        const room = new RoomManager();
        const first = joinPlayer(room, 'a');
        const again = joinPlayer(room, 'a');
        expect(again.slot).toBe(first.slot);
        expect(room.getSlots().filter((s) => s.status === 'occupied')).toHaveLength(1);
    });

    it('never exposes session tokens in the public slot view', () => {
        const room = new RoomManager();
        const { sessionToken } = joinPlayer(room, 'a');
        expect(JSON.stringify(room.getSlots())).not.toContain(sessionToken);
    });

    it('holds a dropped player\'s slot and gives it back to their token', () => {
        const room = new RoomManager({ reconnectWindowMs: 30_000 });
        const a = joinPlayer(room, 'a');
        joinPlayer(room, 'b');
        expect(room.disconnected('a', 1000)).toBe(2);
        expect(room.getSlots()[0]).toMatchObject({ slot: 2, status: 'reserved', reservedUntil: 31_000 });

        const back = joinPlayer(room, 'a-reloaded', a.sessionToken);
        expect(back).toMatchObject({ slot: 2, resumed: true, replacedPeerId: undefined });
    });

    it('lets a token reclaim a slot the host still thinks is occupied (reconnect before the drop is noticed)', () => {
        const room = new RoomManager();
        const a = joinPlayer(room, 'a');
        const back = joinPlayer(room, 'a-reloaded', a.sessionToken);
        expect(back).toMatchObject({ slot: 2, resumed: true, replacedPeerId: 'a' });
        expect(room.slotOf('a')).toBeUndefined();
        expect(room.slotOf('a-reloaded')).toBe(2);
    });

    it('does not let a wrong token take a reserved slot', () => {
        const room = new RoomManager();
        joinPlayer(room, 'a');
        room.disconnected('a', 0);
        const impostor = joinPlayer(room, 'x', 'not-the-token');
        expect(impostor.slot).toBe(3);
        expect(room.getSlots()[0].status).toBe('reserved');
    });

    it('reopens reservations only once their window has passed, and reports when that is', () => {
        const room = new RoomManager({ reconnectWindowMs: 1000 });
        const a = joinPlayer(room, 'a');
        room.disconnected('a', 5000);
        expect(room.nextExpiry()).toBe(6000);
        expect(room.expire(5999)).toEqual([]);
        expect(room.expire(6000)).toEqual([2]);
        expect(room.nextExpiry()).toBeUndefined();
        // The old token no longer resumes anything; they get a fresh slot.
        expect(joinPlayer(room, 'a2', a.sessionToken)).toMatchObject({ resumed: false });
    });

    it('frees a slot immediately when the guest leaves', () => {
        const room = new RoomManager();
        const a = joinPlayer(room, 'a');
        expect(room.left('a')).toBe(2);
        expect(room.getSlots()[0].status).toBe('open');
        expect(joinPlayer(room, 'b', a.sessionToken)).toMatchObject({ resumed: false, slot: 2 });
    });

    it('kicks a player even mid-reservation and keeps that peer out', () => {
        const room = new RoomManager();
        joinPlayer(room, 'a');
        room.disconnected('a', 0);
        expect(room.kick(2)).toBe('a');
        expect(room.getSlots()[0].status).toBe('open');
        expect(room.join('a', 'player')).toEqual({ ok: false, reason: 'kicked' });
    });

    it('caps spectators and kicks them by peer id', () => {
        const room = new RoomManager({ maxSpectators: 1 });
        expect(room.join('s1', 'spectator')).toMatchObject({ ok: true, role: 'spectator' });
        expect(room.join('s2', 'spectator')).toEqual({ ok: false, reason: 'spectators-full' });
        expect(room.kick('s1')).toBe('s1');
        expect(room.join('s2', 'spectator')).toMatchObject({ ok: true });
        expect(room.join('s1', 'spectator')).toEqual({ ok: false, reason: 'kicked' });
    });

    it('drops a spectator on disconnect without reserving anything', () => {
        const room = new RoomManager();
        room.join('s', 'spectator');
        expect(room.disconnected('s', 0)).toBeUndefined();
        expect(room.getSpectators()).toEqual([]);
    });
});
