import { describe, expect, it } from 'vitest';
import { signJoinToken, verifyJoinToken, type JoinClaims } from './join-token';

const SECRET = 'test-secret-with-enough-entropy';
const now = 1_800_000_000;
const claims: JoinClaims = { room: 'ABC123', peer: 'guest', exp: now + 600, sub: 'user-42', name: 'Ada', role: 'spectator' };

describe('join tokens', () => {
    it('round-trips claims signed with the same secret', async () => {
        const token = await signJoinToken(SECRET, claims);
        expect(await verifyJoinToken(SECRET, token, now)).toEqual(claims);
    });

    it('rejects another secret, a tampered body or signature, and expired tokens', async () => {
        const token = await signJoinToken(SECRET, claims);
        const [body, signature] = token.split('.');
        expect(await verifyJoinToken('other-secret', token, now)).toBeNull();

        const forged = btoa(JSON.stringify({ ...claims, peer: 'host' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        expect(await verifyJoinToken(SECRET, `${forged}.${signature}`, now)).toBeNull();
        expect(await verifyJoinToken(SECRET, `${body}.${signature.slice(0, -2)}AA`, now)).toBeNull();
        expect(await verifyJoinToken(SECRET, token, claims.exp)).toBeNull();
    });

    it('rejects malformed tokens and claims without throwing', async () => {
        for (const bad of ['', 'abc', 'a.b.c', '!!!.???', 'x'.repeat(5000)]) {
            expect(await verifyJoinToken(SECRET, bad, now)).toBeNull();
        }
        for (const bad of [
            { room: 'ABC123', peer: 'admin', exp: now + 60 },
            { room: 'ABC123', peer: 'guest' },
            { room: 'ABC123', peer: 'guest', exp: now + 60, role: 'host' },
            { room: 7, peer: 'guest', exp: now + 60 },
        ]) {
            expect(await verifyJoinToken(SECRET, await signJoinToken(SECRET, bad as unknown as JoinClaims), now)).toBeNull();
        }
    });

    it('caps the length of user-supplied fields', async () => {
        const token = await signJoinToken(SECRET, { ...claims, name: 'n'.repeat(100), sub: 's'.repeat(500) });
        const verified = await verifyJoinToken(SECRET, token, now);
        expect(verified?.name).toHaveLength(32);
        expect(verified?.sub).toHaveLength(128);
    });
});
