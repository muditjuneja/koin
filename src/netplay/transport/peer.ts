/**
 * One RTCPeerConnection per guest (star topology — plan §3). The host holds
 * one CoopPeerConnection per connected guest/spectator; guests hold exactly
 * one, to the host. There is never a guest<->guest connection.
 *
 * Uses the canonical "perfect negotiation" pattern (WebRTC WG /
 * w3.org/TR/webrtc/#perfect-negotiation-example) so offer/answer glare on
 * renegotiation (e.g. an ICE restart racing a track change) resolves
 * deterministically instead of both sides guessing. The host is always the
 * impolite side and always owns creating the DataChannels — that mirrors
 * the plan's host-authoritative architecture and avoids a coin flip over
 * who initiates.
 */

import { ControlMessage, decodeControlMessage, encodeControlMessage } from './protocol';

export type PeerRole = 'host' | 'guest';

export type PeerSignal =
    | { type: 'offer'; sdp: string }
    | { type: 'answer'; sdp: string }
    | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

export interface CoopPeerConnectionOptions {
    role: PeerRole;
    iceServers?: RTCIceServer[];
    /** Send a signal to the remote side of this connection (relayed via signaling.ts). */
    onSignal: (signal: PeerSignal) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    /** Host: raw guest input bytes arrive here (see protocol.ts's decodeInputState). Guest: unused. */
    onInputMessage?: (data: ArrayBuffer) => void;
    onControlMessage?: (message: ControlMessage) => void;
    /** Guest: the host's incoming media tracks arrive here. Host: unused. */
    onTrack?: (event: RTCTrackEvent) => void;
}

export class CoopPeerConnection {
    readonly pc: RTCPeerConnection;
    private readonly polite: boolean;
    private makingOffer = false;
    private ignoreOffer = false;

    private inputChannel: RTCDataChannel | null = null;
    private controlChannel: RTCDataChannel | null = null;

    constructor(private options: CoopPeerConnectionOptions) {
        // Host is impolite (its offers win a collision) — deterministic
        // without needing a separate negotiation for who leads.
        this.polite = options.role === 'guest';

        this.pc = new RTCPeerConnection({
            iceServers: options.iceServers ?? [],
            bundlePolicy: 'max-bundle',
            iceCandidatePoolSize: 2,
        });

        this.pc.onnegotiationneeded = () => {
            void this.handleNegotiationNeeded();
        };

        this.pc.onicecandidate = ({ candidate }) => {
            if (candidate) this.options.onSignal({ type: 'ice-candidate', candidate: candidate.toJSON() });
        };

        this.pc.oniceconnectionstatechange = () => {
            if (this.pc.iceConnectionState === 'failed') {
                this.pc.restartIce();
            }
        };

        this.pc.onconnectionstatechange = () => {
            this.options.onConnectionStateChange?.(this.pc.connectionState);
        };

        this.pc.ontrack = (event) => {
            this.options.onTrack?.(event);
        };

        this.pc.ondatachannel = (event) => {
            this.bindChannel(event.channel);
        };

        if (options.role === 'host') {
            // Host always creates both channels; the guest receives them via ondatachannel.
            this.bindChannel(this.pc.createDataChannel('input', { ordered: false, maxRetransmits: 0 }));
            this.bindChannel(this.pc.createDataChannel('control', { ordered: true }));
        }
    }

    private bindChannel(channel: RTCDataChannel): void {
        if (channel.label === 'input') {
            this.inputChannel = channel;
            channel.binaryType = 'arraybuffer';
            channel.onmessage = (event) => this.options.onInputMessage?.(event.data as ArrayBuffer);
        } else if (channel.label === 'control') {
            this.controlChannel = channel;
            channel.onmessage = (event) => {
                try {
                    this.options.onControlMessage?.(decodeControlMessage(event.data));
                } catch (err) {
                    console.error('[netplay] malformed control message:', err);
                }
            };
        }
    }

    private async handleNegotiationNeeded(): Promise<void> {
        try {
            this.makingOffer = true;
            await this.pc.setLocalDescription();
            this.options.onSignal({ type: 'offer', sdp: this.pc.localDescription!.sdp });
        } catch (err) {
            console.error('[netplay] negotiation error:', err);
        } finally {
            this.makingOffer = false;
        }
    }

    /** Feed in a signal received from the remote peer via signaling.ts. */
    async handleSignal(signal: PeerSignal): Promise<void> {
        if (signal.type === 'ice-candidate') {
            try {
                await this.pc.addIceCandidate(signal.candidate);
            } catch (err) {
                if (!this.ignoreOffer) console.error('[netplay] failed to add ICE candidate:', err);
            }
            return;
        }

        const description: RTCSessionDescriptionInit = { type: signal.type, sdp: signal.sdp };
        const offerCollision = description.type === 'offer'
            && (this.makingOffer || this.pc.signalingState !== 'stable');

        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;

        await this.pc.setRemoteDescription(description);

        if (description.type === 'offer') {
            await this.pc.setLocalDescription();
            this.options.onSignal({ type: 'answer', sdp: this.pc.localDescription!.sdp });
        }
    }

    /**
     * Host: attach the streamed video+audio. Both tracks must share the same
     * MediaStream object (addTrack(v, stream) + addTrack(a, stream)) — tracks
     * registered under different stream ids land in different sync groups on
     * the receiver (webrtc bug 5912), which is exactly the audio/video split
     * this call exists to prevent.
     */
    addMediaStream(stream: MediaStream): void {
        for (const track of stream.getTracks()) {
            this.pc.addTrack(track, stream);
        }
    }

    sendInput(data: ArrayBuffer): void {
        if (this.inputChannel?.readyState === 'open') {
            this.inputChannel.send(data);
        }
    }

    sendControl(message: ControlMessage): void {
        if (this.controlChannel?.readyState === 'open') {
            this.controlChannel.send(encodeControlMessage(message));
        }
    }

    close(): void {
        this.inputChannel?.close();
        this.controlChannel?.close();
        this.pc.close();
    }
}
