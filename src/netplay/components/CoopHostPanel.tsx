'use client';

import CoopPanel, { type CoopSlotView } from './CoopPanel';
import { useSessionState } from '../react/hooks';
import type { CoopHostSession } from '../session/host-session';
import { classifyConnectionQuality } from '../session/connection-quality';

export interface CoopHostPanelProps {
    session: CoopHostSession;
    isOpen: boolean;
    onClose: () => void;
    /** The link guests open to join — typically your guest page with the room code in it. */
    joinUrl?: string;
    maxSpectators?: number;
    systemColor?: string;
}

/** The host's lobby: room code, who is in which slot, their connection quality, and kick. */
export default function CoopHostPanel({ session, isOpen, onClose, joinUrl, maxSpectators = 3, systemColor }: CoopHostPanelProps) {
    const state = useSessionState(session);
    if (!state) return null;

    const slots: CoopSlotView[] = state.slots.map((slot) => {
        const peer = state.peers.find((p) => p.peerId === slot.peerId);
        const latencyMs = peer?.rttMs ?? null;
        return {
            slot: slot.slot,
            status: slot.status,
            displayName: slot.name,
            latencyMs,
            connectionQuality: peer ? (peer.connected ? classifyConnectionQuality(latencyMs, 0) : 'connecting') : undefined,
        };
    });

    return (
        <CoopPanel
            isOpen={isOpen}
            onClose={onClose}
            roomCode={state.roomCode}
            joinUrl={joinUrl}
            slots={slots}
            spectators={state.spectators.map(({ peerId, name }) => ({ peerId, displayName: name }))}
            maxSpectators={maxSpectators}
            onKickSlot={(slot) => session.kick(slot)}
            onKickSpectator={(peerId) => session.kick(peerId)}
            systemColor={systemColor}
        />
    );
}
