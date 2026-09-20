/**
 * Wire protocol for the two netplay DataChannels (plan §3).
 *
 * - `input` channel: unordered, unreliable (`{ordered: false,
 *   maxRetransmits: 0}`). Carries ABSOLUTE controller state, not deltas, so
 *   a dropped packet self-heals on the next one rather than desyncing a
 *   button forever. Binary, fixed-size, for minimum per-packet overhead —
 *   this is sent on every input event, not batched to a frame boundary.
 * - `control` channel: reliable, ordered. Carries JSON — join/leave, slot
 *   assignment, kick, host events. Kept separate from `input` specifically
 *   so a resend on the reliable channel can never head-of-line-block input.
 */

import { ALL_BUTTONS, ButtonId, PlayerIndex } from '../../lib/controls/types';

const BUTTON_BIT_INDEX = new Map<ButtonId, number>(ALL_BUTTONS.map((button, index) => [button, index]));

// ALL_BUTTONS has exactly 16 entries today (verified by the assertion
// below) — a coincidence worth pinning down explicitly, since it's what
// lets the whole button state fit a single uint16.
if (ALL_BUTTONS.length > 16) {
    throw new Error(`netplay input protocol assumes <=16 buttons, ALL_BUTTONS has ${ALL_BUTTONS.length}`);
}

/** byte 0-1: button bitmask (u16 LE) · byte 2: sequence (u8, wraps) · byte 3-6: sender timestamp, ms (f32 LE) */
export const INPUT_MESSAGE_BYTE_LENGTH = 7;

export interface InputState {
    buttons: ReadonlySet<ButtonId>;
    /** Wraps mod 256. Used for packet-loss/jitter stats only — state is absolute, so an out-of-order or skipped seq never corrupts input. */
    seq: number;
    /** Sender's `performance.now()` at capture time, for glass-to-glass latency measurement. */
    timestamp: number;
}

export function encodeInputState(state: InputState): ArrayBuffer {
    const buffer = new ArrayBuffer(INPUT_MESSAGE_BYTE_LENGTH);
    const view = new DataView(buffer);

    let mask = 0;
    for (const button of state.buttons) {
        const bit = BUTTON_BIT_INDEX.get(button);
        if (bit !== undefined) mask |= 1 << bit;
    }

    view.setUint16(0, mask, true);
    view.setUint8(2, state.seq & 0xff);
    view.setFloat32(3, state.timestamp, true);
    return buffer;
}

export function decodeInputState(data: ArrayBuffer | ArrayBufferView): InputState {
    const view = data instanceof ArrayBuffer
        ? new DataView(data)
        : new DataView(data.buffer, data.byteOffset, data.byteLength);

    if (view.byteLength < INPUT_MESSAGE_BYTE_LENGTH) {
        throw new Error(`netplay input message too short: ${view.byteLength} bytes, expected ${INPUT_MESSAGE_BYTE_LENGTH}`);
    }

    const mask = view.getUint16(0, true);
    const buttons = new Set<ButtonId>();
    for (const button of ALL_BUTTONS) {
        const bit = BUTTON_BIT_INDEX.get(button)!;
        if (mask & (1 << bit)) buttons.add(button);
    }

    return {
        buttons,
        seq: view.getUint8(2),
        timestamp: view.getFloat32(3, true),
    };
}

// --- control channel: reliable, ordered JSON ---

export type ControlMessage =
    | { type: 'join'; displayName?: string; sessionToken?: string }
    | { type: 'joined'; slot: PlayerIndex | 'spectator'; sessionToken: string }
    | { type: 'join-rejected'; reason: 'room-full' | 'invalid-token' | 'kicked' }
    | { type: 'slot-assigned'; slot: PlayerIndex; peerId: string }
    | { type: 'slot-reserved'; slot: PlayerIndex; expiresAt: number }
    | { type: 'slot-released'; slot: PlayerIndex }
    | { type: 'leave' }
    | { type: 'kick'; slot: PlayerIndex }
    | { type: 'kicked'; reason?: string }
    | { type: 'host-event'; event: 'rewind-start' | 'rewind-stop' | 'load-state' | 'save-state' | 'speed-change'; detail?: unknown }
    | { type: 'host-status'; backgrounded: boolean }
    | { type: 'ping'; ts: number }
    | { type: 'pong'; ts: number };

export function encodeControlMessage(message: ControlMessage): string {
    return JSON.stringify(message);
}

export function decodeControlMessage(data: string): ControlMessage {
    const parsed = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.type !== 'string') {
        throw new Error('netplay control message missing "type"');
    }
    return parsed as ControlMessage;
}
