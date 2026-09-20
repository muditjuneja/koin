import { describe, expect, it, vi } from 'vitest';
import { RoomManager, GUEST_SLOTS } from './room-manager';
import { HeldButtonsTracker } from './held-buttons-tracker';
import { generateRoomCode, ROOM_CODE_LENGTH } from './room-code';

function makeClock(start = 0) {
    let t = start;
    return {
        now: () => t,
        advance: (ms: number) => { t += ms; },
    };
}

describe('generateRoomCode', () => {
    it('produces codes of the documented length', () => {
        expect(generateRoomCode()).toHaveLength(ROOM_CODE_LENGTH);
    });

    it('never contains visually-ambiguous characters (0/O/I/1)', () => {
        for (let i = 0; i < 200; i++) {
            const code = generateRoomCode();
            expect(code).not.toMatch(/[0OI1]/);
        }
    });

    it('is deterministic given a deterministic random source', () => {
        const seq = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.99];
        const makeRandom = () => {
            let i = 0;
            return () => seq[i++ % seq.length];
        };
        expect(generateRoomCode(makeRandom())).toBe(generateRoomCode(makeRandom()));
    });
});

describe('RoomManager: player slots', () => {
    it('assigns guest slots in order 2, 3, 4', () => {
        const room = new RoomManager();
        const a = room.joinAsPlayer('peer-a');
        const b = room.joinAsPlayer('peer-b');
        const c = room.joinAsPlayer('peer-c');
        expect(a).toMatchObject({ ok: true, slot: 2 });
        expect(b).toMatchObject({ ok: true, slot: 3 });
        expect(c).toMatchObject({ ok: true, slot: 4 });
    });

    it('rejects a 4th guest once all of 2-4 are occupied (room full — P1 is always the host)', () => {
        const room = new RoomManager();
        room.joinAsPlayer('a');
        room.joinAsPlayer('b');
        room.joinAsPlayer('c');
        const fourth = room.joinAsPlayer('d');
        expect(fourth).toEqual({ ok: false, reason: 'room-full' });
    });

    it('issues a distinct session token per join', () => {
        const room = new RoomManager();
        const a = room.joinAsPlayer('a');
        const b = room.joinAsPlayer('b');
        if (!a.ok || !b.ok) throw new Error('expected both joins to succeed');
        expect(a.sessionToken).not.toBe(b.sessionToken);
    });

    it('fires onSlotAssigned with the correct slot and peerId', () => {
        const onSlotAssigned = vi.fn();
        const room = new RoomManager({ onSlotAssigned });
        room.joinAsPlayer('peer-a');
        expect(onSlotAssigned).toHaveBeenCalledWith(2, 'peer-a');
    });
});

describe('RoomManager: disconnect / reconnect lifecycle', () => {
    it('reserves (does not free) a slot on unexpected disconnect', () => {
        const room = new RoomManager();
        const join = room.joinAsPlayer('a');
        if (!join.ok) throw new Error('join failed');

        room.handleGuestDisconnected(join.slot);
        const slot = room.getSlot(join.slot);
        expect(slot?.status).toBe('reserved');

        // Room is still "full" for a brand new joiner with no token.
        room.joinAsPlayer('b');
        room.joinAsPlayer('c');
        const fourthNewcomer = room.joinAsPlayer('d');
        expect(fourthNewcomer).toEqual({ ok: false, reason: 'room-full' });
    });

    it('resumes the same slot when the correct session token reconnects within the window', () => {
        const clock = makeClock();
        const room = new RoomManager({ now: clock.now, guestReconnectWindowMs: 30_000 });
        const join = room.joinAsPlayer('peer-a');
        if (!join.ok) throw new Error('join failed');

        room.handleGuestDisconnected(join.slot);
        clock.advance(10_000); // inside the 30s window

        const reconnect = room.joinAsPlayer('peer-a-new-connection', join.sessionToken);
        expect(reconnect).toEqual({ ok: true, slot: join.slot, sessionToken: join.sessionToken, resumed: true });
        expect(room.getSlot(join.slot)?.status).toBe('occupied');
    });

    it('releases the slot to anyone once the reconnect window expires', () => {
        const clock = makeClock();
        const room = new RoomManager({ now: clock.now, guestReconnectWindowMs: 30_000 });
        const join = room.joinAsPlayer('peer-a');
        if (!join.ok) throw new Error('join failed');

        room.handleGuestDisconnected(join.slot);
        clock.advance(30_001); // just past the window

        expect(room.getSlot(join.slot)?.status).toBe('open');

        // A late reconnect with the old token is now treated as a fresh join, not a resume.
        const late = room.joinAsPlayer('peer-a-late', join.sessionToken);
        expect(late).toMatchObject({ ok: true, resumed: false });
    });

    it('fires onSlotReleased exactly when a reservation expires', () => {
        const onSlotReleased = vi.fn();
        const clock = makeClock();
        const room = new RoomManager({ now: clock.now, guestReconnectWindowMs: 1000, onSlotReleased });
        const join = room.joinAsPlayer('a');
        if (!join.ok) throw new Error('join failed');
        room.handleGuestDisconnected(join.slot);
        expect(onSlotReleased).not.toHaveBeenCalled();

        clock.advance(1001);
        room.getSlots(); // any read lazily expires stale reservations
        expect(onSlotReleased).toHaveBeenCalledWith(join.slot);
    });

    it('a wrong session token does not resume someone else\'s reserved slot', () => {
        const room = new RoomManager();
        const a = room.joinAsPlayer('a');
        if (!a.ok) throw new Error('join failed');
        room.handleGuestDisconnected(a.slot);

        const impostor = room.joinAsPlayer('impostor', 'not-the-real-token');
        // No open slots exist yet (only a's, which is reserved) other than 3 and 4.
        expect(impostor).toMatchObject({ ok: true, resumed: false });
        expect(impostor.ok && impostor.slot).not.toBe(a.slot);
    });
});

describe('RoomManager: leave and kick', () => {
    it('leave frees the slot immediately, with no reconnect grace', () => {
        const room = new RoomManager();
        const join = room.joinAsPlayer('a');
        if (!join.ok) throw new Error('join failed');

        room.handleGuestLeft(join.slot);
        expect(room.getSlot(join.slot)?.status).toBe('open');

        // The old session token no longer resumes anything — the slot was never reserved.
        const rejoin = room.joinAsPlayer('someone-else', join.sessionToken);
        expect(rejoin).toMatchObject({ ok: true, resumed: false });
    });

    it('kick frees a slot even mid-reservation, ahead of the grace window', () => {
        const room = new RoomManager({ guestReconnectWindowMs: 30_000 });
        const join = room.joinAsPlayer('a');
        if (!join.ok) throw new Error('join failed');
        room.handleGuestDisconnected(join.slot);
        expect(room.getSlot(join.slot)?.status).toBe('reserved');

        room.kick(join.slot);
        expect(room.getSlot(join.slot)?.status).toBe('open');
    });
});

describe('RoomManager: spectators', () => {
    it('caps spectators at the configured maximum', () => {
        const room = new RoomManager({ maxSpectators: 2 });
        expect(room.joinAsSpectator('s1')).toEqual({ ok: true });
        expect(room.joinAsSpectator('s2')).toEqual({ ok: true });
        expect(room.joinAsSpectator('s3')).toEqual({ ok: false, reason: 'spectators-full' });
        expect(room.spectatorCount).toBe(2);
    });

    it('freeing a spectator slot allows another to join', () => {
        const room = new RoomManager({ maxSpectators: 1 });
        room.joinAsSpectator('s1');
        expect(room.joinAsSpectator('s2')).toEqual({ ok: false, reason: 'spectators-full' });
        room.leaveSpectator('s1');
        expect(room.joinAsSpectator('s2')).toEqual({ ok: true });
    });

    it('defaults the spectator cap within the plan\'s documented 2-3 range', () => {
        const room = new RoomManager();
        for (let i = 0; i < 3; i++) expect(room.joinAsSpectator(`s${i}`)).toEqual({ ok: true });
        expect(room.joinAsSpectator('overflow')).toEqual({ ok: false, reason: 'spectators-full' });
    });
});

describe('RoomManager x HeldButtonsTracker: the stuck-key rule', () => {
    it('a slot\'s held buttons are recoverable for release exactly once on disconnect', () => {
        const room = new RoomManager();
        const tracker = new HeldButtonsTracker();
        const join = room.joinAsPlayer('a');
        if (!join.ok) throw new Error('join failed');

        tracker.update(join.slot, { buttons: new Set(['a', 'up']), seq: 1, timestamp: 0 });
        room.handleGuestDisconnected(join.slot);

        const released = tracker.releaseAll(join.slot);
        expect(new Set(released)).toEqual(new Set(['a', 'up']));

        // A second release for the same slot (e.g. a duplicate disconnect event) finds nothing left to release.
        expect(tracker.releaseAll(join.slot)).toEqual([]);
    });

    it('slots with no input yet release nothing', () => {
        const tracker = new HeldButtonsTracker();
        expect(tracker.releaseAll(2)).toEqual([]);
    });
});

describe('GUEST_SLOTS', () => {
    it('is exactly players 2-4, never including the host\'s own P1', () => {
        expect(GUEST_SLOTS).toEqual([2, 3, 4]);
    });
});
