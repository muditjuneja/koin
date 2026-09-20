import { describe, expect, it } from 'vitest';
import {
    encodeInputState,
    decodeInputState,
    encodeControlMessage,
    decodeControlMessage,
    INPUT_MESSAGE_BYTE_LENGTH,
    ControlMessage,
} from './protocol';
import { ALL_BUTTONS, ButtonId } from '../../lib/controls/types';

describe('input state encode/decode round-trip', () => {
    it('round-trips an empty button set', () => {
        const decoded = decodeInputState(encodeInputState({ buttons: new Set(), seq: 0, timestamp: 0 }));
        expect(decoded.buttons.size).toBe(0);
        expect(decoded.seq).toBe(0);
        expect(decoded.timestamp).toBe(0);
    });

    it('round-trips every individual button', () => {
        for (const button of ALL_BUTTONS) {
            const decoded = decodeInputState(encodeInputState({ buttons: new Set([button]), seq: 1, timestamp: 123.5 }));
            expect(decoded.buttons).toEqual(new Set([button]));
        }
    });

    it('round-trips all buttons pressed simultaneously', () => {
        const buttons = new Set<ButtonId>(ALL_BUTTONS);
        const decoded = decodeInputState(encodeInputState({ buttons, seq: 42, timestamp: 999 }));
        expect(decoded.buttons).toEqual(buttons);
        expect(decoded.seq).toBe(42);
    });

    it('wraps the sequence number at 256, not overflowing into the button mask', () => {
        const decoded = decodeInputState(encodeInputState({ buttons: new Set(['a']), seq: 256, timestamp: 0 }));
        expect(decoded.seq).toBe(0);
        expect(decoded.buttons).toEqual(new Set(['a']));

        const decoded2 = decodeInputState(encodeInputState({ buttons: new Set(['a']), seq: 257, timestamp: 0 }));
        expect(decoded2.seq).toBe(1);
    });

    it('produces a fixed-size buffer regardless of how many buttons are set', () => {
        expect(encodeInputState({ buttons: new Set(), seq: 0, timestamp: 0 }).byteLength).toBe(INPUT_MESSAGE_BYTE_LENGTH);
        expect(encodeInputState({ buttons: new Set(ALL_BUTTONS), seq: 0, timestamp: 0 }).byteLength).toBe(INPUT_MESSAGE_BYTE_LENGTH);
    });

    it('preserves timestamp to float32 precision', () => {
        const decoded = decodeInputState(encodeInputState({ buttons: new Set(), seq: 0, timestamp: 1234567.25 }));
        expect(decoded.timestamp).toBeCloseTo(1234567.25, 1);
    });

    it('decodes from a DataChannel-style ArrayBufferView (Uint8Array), not just a bare ArrayBuffer', () => {
        const buffer = encodeInputState({ buttons: new Set(['start', 'select']), seq: 5, timestamp: 10 });
        const view = new Uint8Array(buffer);
        const decoded = decodeInputState(view);
        expect(decoded.buttons).toEqual(new Set(['start', 'select']));
    });

    it('rejects a truncated message instead of silently misreading it', () => {
        const short = new ArrayBuffer(INPUT_MESSAGE_BYTE_LENGTH - 1);
        expect(() => decodeInputState(short)).toThrow();
    });
});

describe('control message encode/decode round-trip', () => {
    const samples: ControlMessage[] = [
        { type: 'join', displayName: 'p2', sessionToken: 'abc123' },
        { type: 'joined', slot: 2, sessionToken: 'abc123' },
        { type: 'join-rejected', reason: 'room-full' },
        { type: 'slot-assigned', slot: 3, peerId: 'peer-xyz' },
        { type: 'slot-reserved', slot: 4, expiresAt: 1234567890 },
        { type: 'slot-released', slot: 2 },
        { type: 'leave' },
        { type: 'kick', slot: 3 },
        { type: 'kicked', reason: 'inactivity' },
        { type: 'host-event', event: 'rewind-start' },
        { type: 'host-status', backgrounded: true },
        { type: 'ping', ts: 42 },
        { type: 'pong', ts: 43 },
    ];

    it.each(samples)('round-trips %o', (message) => {
        expect(decodeControlMessage(encodeControlMessage(message))).toEqual(message);
    });

    it('rejects a message with no "type" field', () => {
        expect(() => decodeControlMessage(JSON.stringify({ slot: 2 }))).toThrow();
    });

    it('rejects malformed JSON', () => {
        expect(() => decodeControlMessage('{not json')).toThrow();
    });
});
