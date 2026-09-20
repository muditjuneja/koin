'use client';

import { useEffect, useRef } from 'react';
import { LogOut, Maximize, Volume2, VolumeX } from 'lucide-react';
import CabinetLoading from '../../components/Overlays/CabinetLoading';
import VirtualController from '../../components/VirtualController/VirtualController';
import ConnectionIndicator, { ConnectionQuality } from './ConnectionIndicator';

export type CoopGuestConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'kicked';

export interface CoopGuestProps {
    connectionState: CoopGuestConnectionState;
    /** The host's streamed video+audio, or null before it arrives. */
    mediaStream: MediaStream | null;
    system: string;
    systemColor?: string;
    connectionQuality?: ConnectionQuality;
    latencyMs?: number | null;
    volume: number;
    isMuted: boolean;
    onVolumeChange?: (volume: number) => void;
    onToggleMute?: () => void;
    onFullscreen?: () => void;
    onLeave: () => void;
    /** Wired to the network — see protocol.ts's absolute input state. */
    onButtonDown: (button: string) => void;
    onButtonUp: (button: string) => void;
    hapticsEnabled?: boolean;
}

/**
 * A guest's entire screen: the host's streamed video, the existing
 * VirtualController reused as-is (its onButtonDown/onButtonUp already point
 * wherever the caller wants — here, at the network instead of a local
 * emulator), and CabinetLoading reclaimed (finding #14 — it had zero
 * importers before this) as the "connecting to host" screen.
 */
export default function CoopGuest({
    connectionState,
    mediaStream,
    system,
    systemColor = '#00FF41',
    connectionQuality = 'connecting',
    latencyMs,
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
    onFullscreen,
    onLeave,
    onButtonDown,
    onButtonUp,
    hapticsEnabled = true,
}: CoopGuestProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
        }
    }, [mediaStream]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = Math.max(0, Math.min(1, volume / 100));
        }
    }, [volume, isMuted]);

    if (connectionState === 'connecting' || connectionState === 'reconnecting') {
        return (
            <CabinetLoading
                system={system}
                systemColor={systemColor}
                loadingText={connectionState === 'reconnecting' ? 'RECONNECTING...' : 'CONNECTING...'}
                subtitle={connectionState === 'reconnecting' ? "Host's connection dropped — hang tight" : 'Joining the host…'}
            />
        );
    }

    if (connectionState === 'disconnected' || connectionState === 'kicked') {
        return (
            <div className="bg-black min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-white font-heading text-lg">
                    {connectionState === 'kicked' ? 'Removed from the session' : 'Disconnected'}
                </p>
                <p className="text-gray-400 text-sm max-w-xs">
                    {connectionState === 'kicked'
                        ? 'The host removed you from this co-op session.'
                        : "Lost connection to the host and couldn't reconnect."}
                </p>
                <button
                    onClick={onLeave}
                    className="mt-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors"
                    style={{ backgroundColor: systemColor, color: '#000' }}
                >
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className="koin-scope relative bg-black min-h-screen overflow-hidden" style={{ touchAction: 'none' }}>
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-contain" />

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent z-10">
                <ConnectionIndicator quality={connectionQuality} latencyMs={latencyMs} />
                <div className="flex items-center gap-1">
                    <button onClick={onToggleMute} className="p-2 text-white/80 hover:text-white transition-colors" title={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    {onVolumeChange && (
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={volume}
                            onChange={(e) => onVolumeChange(Number(e.target.value))}
                            className="w-16 accent-white hidden sm:block"
                            aria-label="Volume"
                        />
                    )}
                    {onFullscreen && (
                        <button onClick={onFullscreen} className="p-2 text-white/80 hover:text-white transition-colors" title="Fullscreen">
                            <Maximize size={18} />
                        </button>
                    )}
                    <button onClick={onLeave} className="p-2 text-white/80 hover:text-red-400 transition-colors" title="Leave session">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <VirtualController
                system={system}
                isRunning
                systemColor={systemColor}
                hapticsEnabled={hapticsEnabled}
                onButtonDown={onButtonDown}
                onButtonUp={onButtonUp}
                onPause={() => {}}
                onResume={() => {}}
            />
        </div>
    );
}
