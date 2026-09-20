/**
 * koin.js netplay reference signaling server (plan §8).
 *
 * Deliberately thin: routes a room's WebSocket connections to its
 * SignalingRoom Durable Object, and mints short-lived Cloudflare Realtime
 * TURN credentials on request. Nothing here is required — koin.js/netplay
 * accepts any `signalingUrl` (or a custom `onSignal` transport), this is
 * just the one-click-deployable default so integrators don't need to
 * stand up their own before trying co-op.
 */

import { SignalingRoom } from './signaling-room';

export { SignalingRoom };

export interface Env {
    SIGNALING_ROOM: DurableObjectNamespace;
    /** Cloudflare Realtime TURN Key ID — see https://developers.cloudflare.com/realtime/turn/ */
    CF_TURN_KEY_ID?: string;
    /** API token scoped to that TURN key, kept as a Worker secret (never committed). */
    CF_TURN_API_TOKEN?: string;
    /** Restrict which origins may fetch TURN credentials or open signaling sockets. Comma-separated; "*" allows any origin (fine for a public demo, not for production). */
    ALLOWED_ORIGINS?: string;
}

const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,12}$/;
const TURN_CREDENTIAL_TTL_SECONDS = 3600;

function isOriginAllowed(origin: string | null, env: Env): boolean {
    if (!env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS === '*') return true;
    if (!origin) return false;
    return env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).includes(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
    return {
        'Access-Control-Allow-Origin': origin ?? '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders(origin) });
        }

        if (!isOriginAllowed(origin, env)) {
            return new Response('origin not allowed', { status: 403 });
        }

        if (url.pathname === '/ws') {
            const roomCode = (url.searchParams.get('room') ?? '').toUpperCase();
            if (!ROOM_CODE_PATTERN.test(roomCode)) {
                return new Response('invalid or missing room code', { status: 400 });
            }

            const id = env.SIGNALING_ROOM.idFromName(roomCode);
            const room = env.SIGNALING_ROOM.get(id);
            return room.fetch(request);
        }

        if (url.pathname === '/turn-credentials' && request.method === 'GET') {
            return handleTurnCredentials(env, origin);
        }

        if (url.pathname === '/health') {
            return new Response('ok', { headers: corsHeaders(origin) });
        }

        return new Response('not found', { status: 404, headers: corsHeaders(origin) });
    },
};

/**
 * Mints short-lived Cloudflare Realtime TURN credentials so the client
 * never sees a long-lived secret — this endpoint is the reason a server
 * is needed at all for TURN (plan's decisions table: "Cloudflare Realtime
 * TURN as the first-class documented path"). Returns whatever shape
 * Cloudflare's API gives back (iceServers-compatible) so the client can
 * pass it straight into RTCPeerConnection's iceServers option.
 */
async function handleTurnCredentials(env: Env, origin: string | null): Promise<Response> {
    if (!env.CF_TURN_KEY_ID || !env.CF_TURN_API_TOKEN) {
        return new Response(
            JSON.stringify({ error: 'TURN not configured on this deployment — set CF_TURN_KEY_ID and CF_TURN_API_TOKEN, or omit TURN and ship STUN-only (see the plan\'s cost model on relay rates).' }),
            { status: 501, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
        );
    }

    const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.CF_TURN_KEY_ID}/credentials/generate`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.CF_TURN_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL_SECONDS }),
        }
    );

    if (!response.ok) {
        return new Response(JSON.stringify({ error: 'failed to mint TURN credentials' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
    }

    const body = await response.text();
    return new Response(body, { headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
}
