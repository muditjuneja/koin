/**
 * Room codes and session tokens (plan §3a).
 *
 * Room codes are typed by a human (the fallback join path behind link/QR),
 * so the alphabet excludes visually-ambiguous characters: 0/O and I/1.
 * 6 chars from the remaining 32-symbol alphabet is 32^6 ≈ 1.07 billion
 * combinations — the plan's target — while staying short enough to read
 * off a screen and type on a phone keyboard.
 */

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1
export const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(random: () => number = Math.random): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
    }
    return code;
}

/**
 * Opaque per-guest token issued at join, presented on reconnect to resume
 * the same reserved slot (plan §3a) instead of being treated as a fresh
 * joiner. Not a security boundary beyond "harder to guess than the slot
 * number" — the room code is the only access control in v1.
 */
export function generateSessionToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Unreachable in any browser or Node version koin targets — kept only
    // so this never throws in an unusual embedding.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
