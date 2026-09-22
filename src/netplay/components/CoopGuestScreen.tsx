'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Maximize, Play, Volume2, VolumeX } from 'lucide-react';
import CabinetLoading from '../../components/Overlays/CabinetLoading';
import VirtualController from '../../components/VirtualController/VirtualController';
import ConnectionIndicator from './ConnectionIndicator';
import { useSessionState } from '../react/hooks';
import { GuestInputController, type GuestInputOptions } from '../input/guest-input';
import type { CoopGuestSession } from '../session/guest-session';
import type { HostEvent } from '../transport/protocol';

export interface CoopGuestScreenProps {
    session: CoopGuestSession;
    /** System of the game being hosted — picks the on-screen controller layout. */
    system: string;
    systemColor?: string;
    /** Called when the guest leaves, or taps "Back" after the session ends. */
    onExit?: () => void;
    /** Keyboard/gamepad mapping for this guest (defaults to koin's). */
    input?: GuestInputOptions;
}

const HOST_EVENT_TEXT: Record<HostEvent, string> = {
    'rewind': 'Host is rewinding',
    'load-state': 'Host loaded a save state',
    'speed-change': 'Host changed the game speed',
    'paused': 'Host paused the game',
    'resumed': 'Host resumed the game',
};

const REJECT_TEXT: Record<string, string> = {
    'room-full': 'All player slots are taken.',
    'spectators-full': 'The spectator seats are full.',
    'busy': "The host's computer is at capacity right now.",
    'kicked': 'The host removed you from this session.',
};

/** A guest's whole screen: the host's stream, their controller, and connection status. */
export default function CoopGuestScreen({ session, system, systemColor = '#00FF41', onExit, input }: CoopGuestScreenProps) {
    const state = useSessionState(session);
    const [video, setVideo] = useState<HTMLVideoElement | null>(null);
    const [needsTap, setNeedsTap] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [toast, setToast] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mediaStream = state?.mediaStream ?? null;
    const isPlayer = state?.role !== 'spectator';

    // The <video> only exists while connected, and the stream usually arrives
    // before that — so (re)attach whenever either side changes.
    useEffect(() => {
        if (!video) return;
        if (video.srcObject !== mediaStream) video.srcObject = mediaStream;
        if (!mediaStream) return;
        video.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    }, [video, mediaStream]);

    useEffect(() => {
        if (!video) return;
        video.muted = muted;
        video.volume = volume / 100;
    }, [video, muted, volume]);

    const controller = useMemo(
        () => new GuestInputController((controllerState) => session.setInput(controllerState), input),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mapping is read once per session
        [session],
    );
    useEffect(() => {
        if (!isPlayer) return;
        controller.attach(window);
        return () => controller.detach();
    }, [controller, isPlayer]);

    const lastEvent = state?.lastHostEvent;
    useEffect(() => {
        if (!lastEvent) return;
        setToast(HOST_EVENT_TEXT[lastEvent.event] ?? null);
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }, [lastEvent]);

    if (!state) return null;

    const leave = () => {
        session.leave();
        onExit?.();
    };

    if (['connecting', 'waiting-for-host', 'joining', 'reconnecting'].includes(state.status)) {
        const text = {
            'connecting': ['CONNECTING...', `Joining room ${state.roomCode}`],
            'waiting-for-host': ['WAITING...', 'The host has not opened the room yet'],
            'joining': ['JOINING...', 'Setting up the connection'],
            'reconnecting': ['RECONNECTING...', 'Connection dropped — keeping your seat'],
        }[state.status as 'connecting'];
        return <CabinetLoading system={system} systemColor={systemColor} loadingText={text[0]} subtitle={text[1]} />;
    }

    if (state.status !== 'connected') {
        const title = { rejected: "Couldn't join", kicked: 'Removed from the session', ended: 'Session ended', error: "Couldn't connect" }[state.status as 'ended'];
        const detail = state.status === 'rejected'
            ? REJECT_TEXT[state.rejectReason ?? ''] ?? 'The host could not take you right now.'
            : state.status === 'kicked'
                ? REJECT_TEXT.kicked
                : state.status === 'error'
                    ? state.error ?? 'Something went wrong.'
                    : 'The host ended the session or could not be reached.';
        return (
            <div className="koin-scope bg-black min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
                <p className="text-white font-heading text-lg">{title}</p>
                <p className="text-gray-400 text-sm max-w-xs">{detail}</p>
                {onExit && (
                    <button onClick={onExit} className="mt-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider" style={{ backgroundColor: systemColor, color: '#000' }}>
                        Back
                    </button>
                )}
            </div>
        );
    }

    const fullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.();
    };

    return (
        <div ref={containerRef} className="koin-scope relative bg-black min-h-screen overflow-hidden select-none" style={{ touchAction: 'none' }}>
            <video
                ref={setVideo}
                autoPlay
                playsInline
                data-testid="coop-guest-video"
                className="absolute inset-0 w-full h-full object-contain"
                // Scaled-up pixel art must stay sharp.
                style={{ imageRendering: 'pixelated' }}
            />

            {needsTap && (
                <button
                    onClick={() => video?.play().then(() => setNeedsTap(false)).catch(() => {})}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 text-white"
                >
                    <Play size={48} style={{ color: systemColor }} />
                    <span className="text-sm font-bold uppercase tracking-wider">Tap to start</span>
                </button>
            )}

            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent z-10">
                <div className="flex items-center gap-3">
                    <ConnectionIndicator quality={state.quality} latencyMs={state.latencyMs} />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                        {state.role === 'spectator' ? 'Watching' : state.slot ? `Player ${state.slot}` : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setMuted((m) => !m)} className="p-2 text-white/80 hover:text-white" title={muted ? 'Unmute' : 'Mute'}>
                        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-16 accent-white hidden sm:block"
                        aria-label="Volume"
                    />
                    <button onClick={fullscreen} className="p-2 text-white/80 hover:text-white" title="Fullscreen">
                        <Maximize size={18} />
                    </button>
                    <button onClick={leave} className="p-2 text-white/80 hover:text-red-400" title="Leave session">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {(toast || state.hostBackgrounded) && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-black/80 text-xs text-white">
                    {toast ?? "The host's tab is in the background — the game may slow down"}
                </div>
            )}

            {isPlayer && (
                <VirtualController
                    system={system}
                    isRunning
                    systemColor={systemColor}
                    onButtonDown={(button) => controller.pressVirtual(button)}
                    onButtonUp={(button) => controller.releaseVirtual(button)}
                    onPause={() => {}}
                    onResume={() => {}}
                />
            )}
        </div>
    );
}
