import { describe, expect, it } from 'vitest';
import {
    decodeControlMessage,
    decodeInputPacket,
    encodeControlMessage,
    encodeInputPacket,
    INPUT_PACKET_BYTES,
    isNewerSeq,
    NEUTRAL_AXES,
} from './protocol';
import { ALL_BUTTONS, ButtonId } from '../../lib/controls/types';

const packet = (buttons: ButtonId[], seq = 1, axes = NEUTRAL_AXES) => ({ buttons: new Set(buttons), seq, axes });

describe('input packets', () => {
    it('round-trips every button on its own and all together', () => {
        for (const button of ALL_BUTTONS) {
            expect(decodeInputPacket(encodeInputPacket(packet([button])))!.buttons).toEqual(new Set([button]));
        }
        expect(decodeInputPacket(encodeInputPacket(packet([...ALL_BUTTONS])))!.buttons).toEqual(new Set(ALL_BUTTONS));
    });

    it('is a fixed 9 bytes', () => {
        expect(encodeInputPacket(packet([])).byteLength).toBe(INPUT_PACKET_BYTES);
        expect(encodeInputPacket(packet([...ALL_BUTTONS])).byteLength).toBe(INPUT_PACKET_BYTES);
    });

    it('wraps seq to 16 bits without touching the button bits', () => {
        const decoded = decodeInputPacket(encodeInputPacket(packet(['start'], 0x10001)))!;
        expect(decoded.seq).toBe(1);
        expect(decoded.buttons).toEqual(new Set(['start']));
    });

    it('round-trips analog axes to within one step and clamps out-of-range values', () => {
        const decoded = decodeInputPacket(encodeInputPacket(packet([], 1, [0.5, -1, 2, -3])))!;
        expect(decoded.axes[0]).toBeCloseTo(0.5, 1);
        expect(decoded.axes[1]).toBe(-1);
        expect(decoded.axes[2]).toBe(1);
        expect(decoded.axes[3]).toBe(-1);
    });

    it('accepts a Uint8Array view (what some DataChannel paths deliver)', () => {
        const bytes = new Uint8Array(encodeInputPacket(packet(['a', 'up'], 7)));
        expect(decodeInputPacket(bytes)!.buttons).toEqual(new Set(['a', 'up']));
    });

    it('rejects packets of the wrong size or type instead of misreading them', () => {
        expect(decodeInputPacket(new ArrayBuffer(8))).toBeNull();
        expect(decodeInputPacket(new ArrayBuffer(10))).toBeNull();
        const wrongType = new Uint8Array(encodeInputPacket(packet(['a'])));
        wrongType[0] = 99;
        expect(decodeInputPacket(wrongType)).toBeNull();
    });
});

describe('isNewerSeq', () => {
    it('orders ordinary increments', () => {
        expect(isNewerSeq(2, 1)).toBe(true);
        expect(isNewerSeq(1, 2)).toBe(false);
        expect(isNewerSeq(5, 5)).toBe(false);
    });

    it('treats a wrap from 65535 to 0 as newer', () => {
        expect(isNewerSeq(0, 0xffff)).toBe(true);
        expect(isNewerSeq(3, 0xfffe)).toBe(true);
        expect(isNewerSeq(0xffff, 0)).toBe(false);
    });

    it('rejects a late packet overtaken on the unordered channel', () => {
        // press (seq 10) arrives after release (seq 11): must be dropped
        expect(isNewerSeq(10, 11)).toBe(false);
    });
});

describe('control messages', () => {
    it('round-trips', () => {
        const message = { type: 'roster' as const, players: [{ slot: 2 as const, status: 'occupied' as const, name: 'Ana' }], spectators: 1 };
        expect(decodeControlMessage(encodeControlMessage(message))).toEqual(message);
    });

    it('returns null for malformed, oversized, or non-string input', () => {
        expect(decodeControlMessage('{nope')).toBeNull();
        expect(decodeControlMessage(JSON.stringify({ slot: 2 }))).toBeNull();
        expect(decodeControlMessage('x'.repeat(5000))).toBeNull();
        expect(decodeControlMessage(new ArrayBuffer(4))).toBeNull();
    });
});
