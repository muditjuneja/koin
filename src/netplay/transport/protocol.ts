/**
 * Wire formats for netplay.
 *
 * Two DataChannels per guest:
 * - `input` (unordered, maxRetransmits 0): fixed-size binary snapshots of the
 *   guest's whole controller. State is absolute, and the guest re-sends it on
 *   a heartbeat, so a dropped packet is corrected within one heartbeat. A
 *   packet overtaken by a newer one is discarded by sequence number, so a
 *   stale "pressed" can never land after the "released" that replaced it.
 * - `control` (reliable, ordered): small JSON messages. Separate so a
 *   retransmission there can never delay input.
 *
 * Signaling payloads (relayed by the signaling server before a peer
 * connection exists) are also defined here.
 */

import { ALL_BUTTONS, ButtonId, PlayerIndex } from '../../lib/controls/types';

const BUTTON_BIT = new Map<ButtonId, number>(ALL_BUTTONS.map((button, index) => [button, index]));

if (ALL_BUTTONS.length > 16) {
    throw new Error(`netplay input packs buttons into 16 bits; ALL_BUTTONS has ${ALL_BUTTONS.length}`);
}

export const INPUT_PACKET_TYPE = 1;
/** type u8 · seq u16 · buttons u16 · axes 4 × i8 (left x/y, right x/y) */
export const INPUT_PACKET_BYTES = 9;

/** Axis values are in [-1, 1]; left stick x/y, right stick x/y. */
export type StickAxes = readonly [number, number, number, number];
export const NEUTRAL_AXES: StickAxes = [0, 0, 0, 0];

export interface ControllerState {
    buttons: ReadonlySet<ButtonId>;
    axes: StickAxes;
}

export interface InputPacket extends ControllerState {
    seq: number;
}

const toI8 = (v: number) => Math.max(-127, Math.min(127, Math.round(v * 127)));

export function encodeInputPacket(packet: InputPacket): ArrayBuffer {
    const buffer = new ArrayBuffer(INPUT_PACKET_BYTES);
    const view = new DataView(buffer);
    let mask = 0;
    for (const button of packet.buttons) {
        const bit = BUTTON_BIT.get(button);
        if (bit !== undefined) mask |= 1 << bit;
    }
    view.setUint8(0, INPUT_PACKET_TYPE);
    view.setUint16(1, packet.seq & 0xffff, true);
    view.setUint16(3, mask, true);
    packet.axes.forEach((axis, i) => view.setInt8(5 + i, toI8(axis)));
    return buffer;
}

/** Returns null for anything that isn't a well-formed input packet — peers are untrusted. */
export function decodeInputPacket(data: ArrayBuffer | ArrayBufferView): InputPacket | null {
    const view = data instanceof ArrayBuffer
        ? new DataView(data)
        : new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (view.byteLength !== INPUT_PACKET_BYTES || view.getUint8(0) !== INPUT_PACKET_TYPE) return null;

    const mask = view.getUint16(3, true);
    const buttons = new Set<ButtonId>();
    for (const [button, bit] of BUTTON_BIT) {
        if (mask & (1 << bit)) buttons.add(button);
    }
    const axes = [0, 1, 2, 3].map((i) => view.getInt8(5 + i) / 127) as unknown as StickAxes;
    return { seq: view.getUint16(1, true), buttons, axes };
}

/**
 * Serial-number comparison for a 16-bit wrapping sequence (RFC 1982 style):
 * true when `seq` is newer than `last`. Half the space ahead counts as newer,
 * so at a 20 Hz heartbeat a sequence wraps safely for ~27 minutes of silence.
 */
export function isNewerSeq(seq: number, last: number): boolean {
    const diff = (seq - last) & 0xffff;
    return diff !== 0 && diff < 0x8000;
}

// --- control channel (reliable, ordered JSON) ---

export interface RosterEntry {
    slot: PlayerIndex;
    status: 'open' | 'occupied' | 'reserved';
    name?: string;
}

export type HostEvent = 'rewind' | 'load-state' | 'speed-change' | 'paused' | 'resumed';

export type ControlMessage =
    | { type: 'welcome'; role: 'player' | 'spectator'; slot?: PlayerIndex }
    | { type: 'roster'; players: RosterEntry[]; spectators: number }
    | { type: 'host-event'; event: HostEvent }
    | { type: 'host-status'; backgrounded: boolean }
    | { type: 'kicked' }
    | { type: 'host-ended' }
    | { type: 'leave' }
    | { type: 'ping'; t: number }
    | { type: 'pong'; t: number };

export function encodeControlMessage(message: ControlMessage): string {
    return JSON.stringify(message);
}

export function decodeControlMessage(data: unknown): ControlMessage | null {
    if (typeof data !== 'string' || data.length > 4096) return null;
    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' && typeof parsed.type === 'string' ? parsed as ControlMessage : null;
    } catch {
        return null;
    }
}

// --- signaling payloads (relayed by the signaling server) ---

/** The host's fixed peer id in every room. */
export const HOST_PEER_ID = 'host';

/** 'unauthorized': the signaling server refused this guest's join token. */
export type JoinRejectReason = 'room-full' | 'spectators-full' | 'busy' | 'kicked' | 'unauthorized';

export type SignalPayload =
    | { type: 'join'; role: 'player' | 'spectator'; sessionToken?: string; name?: string }
    | { type: 'join-accepted'; role: 'player' | 'spectator'; slot?: PlayerIndex; sessionToken: string }
    | { type: 'join-rejected'; reason: JoinRejectReason }
    | { type: 'sdp'; description: { type: 'offer' | 'answer'; sdp: string } }
    | { type: 'ice'; candidate: RTCIceCandidateInit }
    | { type: 'bye' }
    // Sent by the signaling server itself (fromPeerId '__system__').
    | { type: 'peer-joined'; peerId: string }
    | { type: 'peer-left'; peerId: string }
    | { type: 'host-joined' }
    | { type: 'host-left' }
    | { type: 'undeliverable'; to: string };

export function isSignalPayload(value: unknown): value is SignalPayload {
    return !!value && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}
