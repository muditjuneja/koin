/**
 * Join tokens — optional access control for the signaling server.
 *
 * When the worker has JOIN_TOKEN_SECRET set, every signaling connection
 * (and every TURN credential request) must carry a token your own backend
 * minted with the same secret. That is how a site with logins decides who
 * may host a room, who may join it, and who may only watch — the signaling
 * server itself knows nothing about your users.
 *
 * Format (compact, JWT-like, easy to mint from any language):
 *
 *   base64url(JSON claims) + "." + base64url(HMAC-SHA256(secret, base64url(JSON claims)))
 *
 * Claims:
 *   room  — the room code this token is for (upper case), or "*" for the TURN endpoint only
 *   peer  — "host" or "guest": which seat it opens
 *   exp   — expiry, Unix seconds (checked only when connecting; a live socket isn't cut off)
 *   sub   — optional: your user id, passed to the host as the guest's verified userId
 *   name  — optional: display name, shown in the room instead of whatever the guest claims
 *   role  — optional, guests: "spectator" limits the guest to watching
 *
 * Uses only Web Crypto, so this module runs unchanged in Workers, Node 18+,
 * Deno and Bun — import signJoinToken from your backend to mint tokens.
 */

export interface JoinClaims {
    room: string;
    peer: 'host' | 'guest';
    exp: number;
    sub?: string;
    name?: string;
    role?: 'player' | 'spectator';
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
    if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
    try {
        const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
        return Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } catch {
        return null;
    }
}

function importKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
    return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signJoinToken(secret: string, claims: JoinClaims): Promise<string> {
    const body = toBase64Url(encoder.encode(JSON.stringify(claims)));
    const signature = await crypto.subtle.sign('HMAC', await importKey(secret, 'sign'), encoder.encode(body));
    return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** The token's claims if the signature is valid and it hasn't expired; null otherwise. */
export async function verifyJoinToken(secret: string, token: string, nowSeconds = Date.now() / 1000): Promise<JoinClaims | null> {
    if (token.length > 4096) return null;
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra !== undefined) return null;
    const signatureBytes = fromBase64Url(signature);
    const bodyBytes = fromBase64Url(body);
    if (!signatureBytes || !bodyBytes) return null;
    // crypto.subtle.verify compares in constant time.
    const valid = await crypto.subtle.verify('HMAC', await importKey(secret, 'verify'), signatureBytes, encoder.encode(body));
    if (!valid) return null;

    let claims: Partial<JoinClaims>;
    try {
        claims = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
        return null;
    }
    if (!claims || typeof claims !== 'object') return null;
    if (typeof claims.room !== 'string' || (claims.peer !== 'host' && claims.peer !== 'guest')) return null;
    if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null;
    if (claims.sub !== undefined && typeof claims.sub !== 'string') return null;
    if (claims.name !== undefined && typeof claims.name !== 'string') return null;
    if (claims.role !== undefined && claims.role !== 'player' && claims.role !== 'spectator') return null;
    return {
        room: claims.room,
        peer: claims.peer,
        exp: claims.exp,
        ...(claims.sub !== undefined && { sub: claims.sub.slice(0, 128) }),
        ...(claims.name !== undefined && { name: claims.name.slice(0, 32) }),
        ...(claims.role !== undefined && { role: claims.role }),
    };
}
