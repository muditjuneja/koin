/**
 * Spectator relay: spectators watch through an SFU (Cloudflare Realtime SFU)
 * instead of a stream of their own from the host.
 *
 * Without it the host encodes and uploads one video per guest, so every
 * spectator costs the host as much as a player. With it the host publishes
 * once — two simulcast layers, 'h' (sharp) and 'l' (light) — and the SFU
 * fans that out, so watching costs the host nothing per viewer. Players keep
 * their direct peer connections: the extra hop would add delay to every
 * button press, and there are at most three of them.
 *
 * Talking to the SFU needs its app secret, so the integrator's backend makes
 * the API calls; koin only needs the three operations of `SpectatorRelay`.
 * `httpSpectatorRelay` speaks to a backend serving them over HTTP. The
 * backend also picks the layer per viewer (e.g. 'l' for anonymous ones).
 */

import { DegradationLevel, EncodingProfile, scaleDownFor } from '../quality/degradation-ladder';

/** What a spectator needs to watch the host's published stream. */
export interface RelayInfo {
    /** The host's SFU session */
    sessionId: string;
    /** Issued by the backend with the publish: proves the session belongs to this room */
    ticket: string;
    trackNames: string[];
}

export interface SpectatorRelay {
    /** Host: publish the tracks in `offer`; returns the SFU's answer and what spectators need to watch. */
    publish(request: {
        offer: RTCSessionDescriptionInit;
        tracks: { mid: string; trackName: string }[];
    }): Promise<{ answer: RTCSessionDescriptionInit } & Omit<RelayInfo, 'trackNames'>>;
    /** Spectator: subscribe to the host's tracks; returns the SFU's offer for a new session. */
    subscribe(request: RelayInfo): Promise<{ sessionId: string; offer: RTCSessionDescriptionInit }>;
    /** Spectator: complete the subscription with the answer to that offer. */
    answer(request: { sessionId: string; answer: RTCSessionDescriptionInit }): Promise<void>;
}

export interface HttpSpectatorRelayOptions {
    /** Base URL of the signaling server; the relay endpoints are `<base>/sfu/{publish,subscribe,answer}`. */
    url: string;
    /** Sent as a Bearer token: the same join token the signaling server takes. */
    token?: string | (() => string | Promise<string>);
}

/** A SpectatorRelay for a backend serving POST <base>/sfu/publish, /sfu/subscribe and /sfu/answer. */
export function httpSpectatorRelay({ url, token }: HttpSpectatorRelayOptions): SpectatorRelay {
    const call = async <T>(operation: 'publish' | 'subscribe' | 'answer', body: unknown): Promise<T> => {
        const endpoint = new URL(url, typeof location !== 'undefined' ? location.href : undefined);
        if (endpoint.protocol === 'ws:') endpoint.protocol = 'http:';
        if (endpoint.protocol === 'wss:') endpoint.protocol = 'https:';
        endpoint.pathname = `${endpoint.pathname.replace(/\/(ws)?\/*$/, '')}/sfu/${operation}`;
        const bearer = typeof token === 'function' ? await token() : token;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`spectator relay ${operation}: HTTP ${response.status}`);
        return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
    };
    return {
        publish: (request) => call('publish', request),
        subscribe: (request) => call('subscribe', request),
        answer: (request) => call('answer', request).then(() => undefined),
    };
}

/** The SFU is reached directly; its own STUN is all it takes. */
const SFU_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];
const CONNECT_TIMEOUT_MS = 15_000;
const TRACK_NAMES = { video: 'video', audio: 'audio' } as const;

/** The sharp layer at full quality; under host CPU pressure it follows the ladder's spectator profile. */
const SHARP_LAYER: EncodingProfile = { maxHeight: 480, maxFramerate: 30, maxBitrate: 1_000_000 };
/** The light layer: what anonymous viewers get, and the fallback for weak connections. */
export const LIGHT_LAYER: EncodingProfile = { maxHeight: 240, maxFramerate: 15, maxBitrate: 250_000 };

export function sharpLayerFor(level: DegradationLevel): EncodingProfile {
    return level.step === 0 ? SHARP_LAYER : level.spectators;
}

function waitConnected(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve, reject) => {
        if (pc.connectionState === 'connected') return resolve();
        const timer = setTimeout(() => fail(new Error('timed out connecting to the relay')), CONNECT_TIMEOUT_MS);
        const fail = (err: Error) => {
            clearTimeout(timer);
            pc.removeEventListener('connectionstatechange', onChange);
            reject(err);
        };
        const onChange = () => {
            if (pc.connectionState === 'connected') {
                clearTimeout(timer);
                pc.removeEventListener('connectionstatechange', onChange);
                resolve();
            } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                fail(new Error(`relay connection ${pc.connectionState}`));
            }
        };
        pc.addEventListener('connectionstatechange', onChange);
    });
}

/** Host side: one connection to the SFU carrying the game, in two layers. */
export class RelayPublisher {
    private pc: RTCPeerConnection | null = null;
    private video: RTCRtpTransceiver | null = null;
    private audio: RTCRtpTransceiver | null = null;

    constructor(private readonly relay: SpectatorRelay, private readonly onLost: () => void) {}

    async start(videoTrack: MediaStreamTrack | null, audioTrack: MediaStreamTrack | null): Promise<RelayInfo> {
        const pc = new RTCPeerConnection({ iceServers: SFU_ICE_SERVERS, bundlePolicy: 'max-bundle' });
        this.pc = pc;
        this.video = pc.addTransceiver(videoTrack ?? 'video', {
            direction: 'sendonly',
            sendEncodings: [
                { rid: 'h', maxBitrate: SHARP_LAYER.maxBitrate, maxFramerate: SHARP_LAYER.maxFramerate },
                { rid: 'l', maxBitrate: LIGHT_LAYER.maxBitrate, maxFramerate: LIGHT_LAYER.maxFramerate, scaleResolutionDownBy: 2 },
            ],
        });
        this.audio = pc.addTransceiver(audioTrack ?? 'audio', { direction: 'sendonly' });
        await pc.setLocalDescription(await pc.createOffer());
        const published = await this.relay.publish({
            offer: { type: 'offer', sdp: pc.localDescription!.sdp },
            tracks: [
                { mid: this.video.mid!, trackName: TRACK_NAMES.video },
                { mid: this.audio.mid!, trackName: TRACK_NAMES.audio },
            ],
        });
        if (this.pc !== pc) throw new Error('relay closed while publishing');
        await pc.setRemoteDescription(published.answer);
        await waitConnected(pc);
        pc.addEventListener('connectionstatechange', () => {
            if (this.pc === pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) this.onLost();
        });
        return { sessionId: published.sessionId, ticket: published.ticket, trackNames: [TRACK_NAMES.video, TRACK_NAMES.audio] };
    }

    async setTracks(videoTrack: MediaStreamTrack | null, audioTrack: MediaStreamTrack | null): Promise<void> {
        await Promise.all([
            this.video?.sender.replaceTrack(videoTrack),
            this.audio?.sender.replaceTrack(audioTrack),
        ]).catch((err) => console.warn('[netplay] relay replaceTrack failed:', err));
    }

    /** Size both layers for the host canvas: the sharp one per the ladder, the light one fixed. */
    async applyLayers(sourceHeight: number, sharp: EncodingProfile): Promise<void> {
        const sender = this.video?.sender;
        if (!sender || !sourceHeight) return;
        const params = sender.getParameters();
        if (!params.encodings?.length) return;
        for (const encoding of params.encodings) {
            const layer = encoding.rid === 'l' ? LIGHT_LAYER : sharp;
            encoding.maxBitrate = layer.maxBitrate;
            encoding.maxFramerate = layer.maxFramerate;
            encoding.scaleResolutionDownBy = scaleDownFor(sourceHeight, layer.maxHeight);
        }
        await sender.setParameters(params).catch((err) => console.warn('[netplay] relay layers:', err));
    }

    close(): void {
        const pc = this.pc;
        this.pc = null;
        this.video = null;
        this.audio = null;
        pc?.close();
    }
}

/** Spectator side: watch the host's published stream through the SFU. */
export class RelaySubscriber {
    private pc: RTCPeerConnection | null = null;

    constructor(private readonly relay: SpectatorRelay, private readonly onLost: () => void) {}

    /** Resolves with the stream once the connection is up; the receiver is passed on for jitter tuning. */
    async start(info: RelayInfo, onVideoReceiver?: (receiver: RTCRtpReceiver) => void): Promise<MediaStream> {
        const pc = new RTCPeerConnection({ iceServers: SFU_ICE_SERVERS, bundlePolicy: 'max-bundle' });
        this.pc = pc;
        const stream = new MediaStream();
        pc.addEventListener('track', (event) => {
            if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
            if (event.track.kind === 'video') onVideoReceiver?.(event.receiver);
        });
        const subscription = await this.relay.subscribe(info);
        if (this.pc !== pc) throw new Error('relay closed while subscribing');
        await pc.setRemoteDescription(subscription.offer);
        await pc.setLocalDescription(await pc.createAnswer());
        await this.relay.answer({ sessionId: subscription.sessionId, answer: { type: 'answer', sdp: pc.localDescription!.sdp } });
        await waitConnected(pc);
        pc.addEventListener('connectionstatechange', () => {
            if (this.pc === pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) this.onLost();
        });
        return stream;
    }

    get peerConnection(): RTCPeerConnection | null {
        return this.pc;
    }

    close(): void {
        const pc = this.pc;
        this.pc = null;
        pc?.close();
    }
}
