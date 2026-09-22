/**
 * Room codes and session tokens.
 *
 * Room codes are typed by people (behind link/QR), so the alphabet drops the
 * lookalikes 0/O and I/1: 32 symbols, 6 characters, ~1.07 billion codes. The
 * alphabet size divides 256, so taking bytes mod 32 has no bias.
 */

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

function randomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

export function generateRoomCode(): string {
    return Array.from(randomBytes(ROOM_CODE_LENGTH), (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

/** Normalizes user-typed codes (case, spaces, dashes) and returns null if it can't be a room code. */
export function normalizeRoomCode(input: string): string | null {
    const code = input.toUpperCase().replace(/[\s-]/g, '');
    return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c)) ? code : null;
}

/** URL-safe random id: session tokens, peer ids and signaling secrets. */
export function generateSessionToken(bytes = 18): string {
    return btoa(String.fromCharCode(...randomBytes(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
