/**
 * One RTCPeerConnection between the host and one guest (star topology).
 *
 * Negotiation follows the WebRTC "perfect negotiation" pattern; the host is
 * the impolite side, creates both DataChannels, and owns ICE restarts.
 *
 * The host adds its video and audio transceivers up front, before the first
 * offer, and later swaps real tracks in with replaceTrack(). That avoids a
 * renegotiation when the game's audio only appears after its first sound,
 * puts both tracks in one MediaStream (one A/V sync group on the receiver),
 * and lets codec preferences apply to the very first offer.
 */

import type { ControlMessage, SignalPayload } from './protocol';
import { decodeControlMessage, encodeControlMessage } from './protocol';

export type PeerRole = 'host' | 'guest';

type PeerSignal = Extract<SignalPayload, { type: 'sdp' | 'ice' }>;

export interface CoopPeerConnectionOptions {
    role: PeerRole;
    iceServers?: RTCIceServer[];
    onSignal: (signal: PeerSignal) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    /** Both DataChannels are open — the connection is usable. */
    onReady?: () => void;
    onInput?: (data: ArrayBuffer) => void;
    onControl?: (message: ControlMessage) => void;
    onTrack?: (event: RTCTrackEvent) => void;
    /** Host only: called once with the video transceiver, before the first offer, to set codec preferences. */
    configureVideoTransceiver?: (transceiver: RTCRtpTransceiver) => void;
}

/** Input is absolute state resent on a heartbeat; if the channel is backed up, skip rather than queue stale state. */
const INPUT_BUFFER_LIMIT_BYTES = 1024;

export class CoopPeerConnection {
    readonly pc: RTCPeerConnection;
    private readonly polite: boolean;
    private makingOffer = false;
    private ignoreOffer = false;
    private settingRemoteAnswer = false;
    private closed = false;
    private inputChannel: RTCDataChannel | null = null;
    private controlChannel: RTCDataChannel | null = null;
    private videoSender: RTCRtpSender | null = null;
    private audioSender: RTCRtpSender | null = null;

    constructor(private readonly options: CoopPeerConnectionOptions) {
        this.polite = options.role === 'guest';
        this.pc = new RTCPeerConnection({
            iceServers: options.iceServers ?? [],
            bundlePolicy: 'max-bundle',
            iceCandidatePoolSize: 2,
        });

        this.pc.onnegotiationneeded = () => void this.negotiate();
        this.pc.onicecandidate = ({ candidate }) => {
            if (candidate) options.onSignal({ type: 'ice', candidate: candidate.toJSON() });
        };
        this.pc.oniceconnectionstatechange = () => {
            if (this.pc.iceConnectionState === 'failed' && !this.polite) this.pc.restartIce();
        };
        this.pc.onconnectionstatechange = () => options.onConnectionStateChange?.(this.pc.connectionState);
        this.pc.ontrack = (event) => options.onTrack?.(event);
        this.pc.ondatachannel = (event) => this.bindChannel(event.channel);

        if (options.role === 'host') {
            const stream = new MediaStream();
            const video = this.pc.addTransceiver('video', { direction: 'sendonly', streams: [stream] });
            const audio = this.pc.addTransceiver('audio', { direction: 'sendonly', streams: [stream] });
            this.videoSender = video.sender;
            this.audioSender = audio.sender;
            try {
                options.configureVideoTransceiver?.(video);
            } catch (err) {
                console.warn('[netplay] could not apply codec preferences:', err);
            }
            this.bindChannel(this.pc.createDataChannel('input', { ordered: false, maxRetransmits: 0 }));
            this.bindChannel(this.pc.createDataChannel('control', { ordered: true }));
        }
    }

    get isReady(): boolean {
        return this.inputChannel?.readyState === 'open' && this.controlChannel?.readyState === 'open';
    }

    get senders(): { video: RTCRtpSender | null; audio: RTCRtpSender | null } {
        return { video: this.videoSender, audio: this.audioSender };
    }

    /** Host: attach (or swap) the streamed tracks. No renegotiation. */
    async setTracks(video: MediaStreamTrack | null, audio: MediaStreamTrack | null): Promise<void> {
        if (this.closed) return;
        try {
            await Promise.all([
                this.videoSender && this.videoSender.track !== video ? this.videoSender.replaceTrack(video) : undefined,
                this.audioSender && this.audioSender.track !== audio ? this.audioSender.replaceTrack(audio) : undefined,
            ]);
        } catch (err) {
            if (!this.closed) console.warn('[netplay] replaceTrack failed:', err);
        }
    }

    async handleSignal(signal: PeerSignal): Promise<void> {
        if (this.closed) return;
        try {
            if (signal.type === 'ice') {
                try {
                    await this.pc.addIceCandidate(signal.candidate);
                } catch (err) {
                    if (!this.ignoreOffer) throw err;
                }
                return;
            }
            const description = signal.description;
            const readyForOffer = !this.makingOffer && (this.pc.signalingState === 'stable' || this.settingRemoteAnswer);
            const collision = description.type === 'offer' && !readyForOffer;
            this.ignoreOffer = !this.polite && collision;
            if (this.ignoreOffer) return;

            this.settingRemoteAnswer = description.type === 'answer';
            await this.pc.setRemoteDescription(description);
            this.settingRemoteAnswer = false;
            if (description.type === 'offer') {
                await this.pc.setLocalDescription();
                const local = this.pc.localDescription;
                if (local) this.options.onSignal({ type: 'sdp', description: { type: local.type as 'answer', sdp: local.sdp } });
            }
        } catch (err) {
            if (!this.closed) console.warn('[netplay] signaling error:', err);
        }
    }

    sendInput(data: ArrayBuffer): void {
        const channel = this.inputChannel;
        if (channel?.readyState === 'open' && channel.bufferedAmount < INPUT_BUFFER_LIMIT_BYTES) channel.send(data);
    }

    sendControl(message: ControlMessage): void {
        if (this.controlChannel?.readyState === 'open') this.controlChannel.send(encodeControlMessage(message));
    }

    close(): void {
        if (this.closed) return;
        this.closed = true;
        this.inputChannel?.close();
        this.controlChannel?.close();
        this.pc.close();
    }

    private async negotiate(): Promise<void> {
        if (this.closed) return;
        try {
            this.makingOffer = true;
            await this.pc.setLocalDescription();
            const local = this.pc.localDescription;
            if (local) this.options.onSignal({ type: 'sdp', description: { type: local.type as 'offer', sdp: local.sdp } });
        } catch (err) {
            if (!this.closed) console.warn('[netplay] negotiation error:', err);
        } finally {
            this.makingOffer = false;
        }
    }

    private bindChannel(channel: RTCDataChannel): void {
        if (channel.label === 'input') {
            this.inputChannel = channel;
            channel.binaryType = 'arraybuffer';
            channel.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) this.options.onInput?.(event.data);
            };
        } else if (channel.label === 'control') {
            this.controlChannel = channel;
            channel.onmessage = (event) => {
                const message = decodeControlMessage(event.data);
                if (message) this.options.onControl?.(message);
            };
        } else {
            channel.close();
            return;
        }
        channel.onopen = () => {
            if (this.isReady) this.options.onReady?.();
        };
        if (this.isReady) this.options.onReady?.();
    }
}
