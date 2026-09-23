/**
 * Where a session gets its STUN/TURN servers.
 *
 * TURN credentials are short-lived (the reference worker mints 1-hour
 * ones), so besides a fixed list a session accepts a provider function. It
 * is called when a connection is created and again before recovering a
 * failed one, so a session that outlives its credentials keeps working.
 */

export type IceServersProvider = () => Promise<RTCIceServer[]>;
export type IceServersOption = RTCIceServer[] | IceServersProvider;

/**
 * Public STUN, used when the integrator passes nothing. Without any STUN
 * server only same-network peers can connect; with it most home networks
 * work, and symmetric NATs still need TURN.
 */
export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

/** Credentials older than this are fetched again before they're used. */
const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

export class IceServerSource {
    private cached: RTCIceServer[] | null = null;
    private fetchedAt = 0;
    private pending: Promise<RTCIceServer[]> | null = null;

    constructor(
        private readonly option: IceServersOption | undefined,
        private readonly maxAgeMs = DEFAULT_MAX_AGE_MS,
        private readonly now: () => number = Date.now,
    ) {}

    /**
     * The best servers known right now, without waiting — for creating a
     * connection synchronously. Starts a background refresh when stale.
     */
    current(): RTCIceServer[] {
        const option = this.option;
        if (option === undefined) return DEFAULT_ICE_SERVERS;
        if (Array.isArray(option)) return option;
        if (!this.cached || this.now() - this.fetchedAt >= this.maxAgeMs) void this.get();
        return this.cached ?? DEFAULT_ICE_SERVERS;
    }

    /** Current servers; `fresh` forces a provider call (after a connection failed). */
    async get(fresh = false): Promise<RTCIceServer[]> {
        const option = this.option;
        if (option === undefined) return DEFAULT_ICE_SERVERS;
        if (Array.isArray(option)) return option;
        if (!fresh && this.cached && this.now() - this.fetchedAt < this.maxAgeMs) return this.cached;
        this.pending ??= option()
            .then((servers) => {
                this.cached = servers;
                this.fetchedAt = this.now();
                return servers;
            })
            .catch((err) => {
                // Keep playing on what we had (or plain STUN) rather than failing the join.
                console.warn('[netplay] could not fetch ICE servers:', err);
                return this.cached ?? DEFAULT_ICE_SERVERS;
            })
            .finally(() => {
                this.pending = null;
            });
        return this.pending;
    }
}

export interface TurnCredentialsProviderOptions {
    /** Base URL of the reference signaling worker (or anything serving the same /turn-credentials endpoint). */
    url: string;
    /** Sent as a Bearer token — required when the worker has JOIN_TOKEN_SECRET set. */
    token?: string | (() => string | Promise<string>);
    /** Servers to use alongside the fetched ones. Default: DEFAULT_ICE_SERVERS. */
    stun?: RTCIceServer[];
}

/**
 * An IceServersProvider for the reference worker's /turn-credentials
 * endpoint (Cloudflare Realtime TURN). Pass it as a session's `iceServers`.
 */
export function turnCredentialsProvider({ url, token, stun = DEFAULT_ICE_SERVERS }: TurnCredentialsProviderOptions): IceServersProvider {
    return async () => {
        const endpoint = new URL(url, typeof location !== 'undefined' ? location.href : undefined);
        if (endpoint.protocol === 'ws:') endpoint.protocol = 'http:';
        if (endpoint.protocol === 'wss:') endpoint.protocol = 'https:';
        endpoint.pathname = `${endpoint.pathname.replace(/\/(ws)?\/*$/, '')}/turn-credentials`;
        const bearer = typeof token === 'function' ? await token() : token;
        const response = await fetch(endpoint, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined });
        if (!response.ok) throw new Error(`TURN credentials: HTTP ${response.status}`);
        return [...stun, ...normalizeIceServers(await response.json())];
    };
}

/** Cloudflare returns `{ iceServers: {...} }` (one object); the standard shape is an array. Accept both. */
export function normalizeIceServers(body: unknown): RTCIceServer[] {
    const value = (body as { iceServers?: unknown } | null)?.iceServers ?? body;
    const list = Array.isArray(value) ? value : [value];
    return list.filter((s): s is RTCIceServer => !!s && typeof s === 'object' && 'urls' in s);
}
