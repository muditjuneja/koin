'use client';

import { useState, ReactNode } from 'react';
import { X, Users, Copy, Check, UserX, Crown, Eye } from 'lucide-react';
import ConnectionIndicator, { ConnectionQuality } from './ConnectionIndicator';
import { PlayerIndex } from '../../lib/controls/types';

export type CoopSlotStatus = 'open' | 'occupied' | 'reserved';

export interface CoopSlotView {
    slot: PlayerIndex;
    status: CoopSlotStatus;
    displayName?: string;
    connectionQuality?: ConnectionQuality;
    latencyMs?: number | null;
}

export interface CoopSpectatorView {
    peerId: string;
    displayName?: string;
}

export interface CoopPanelProps {
    isOpen: boolean;
    onClose: () => void;
    roomCode: string;
    /** Full joinable URL (room code baked in) — shown with a copy button. QR rendering is left to the integrating app; this just exposes the link. */
    joinUrl?: string;
    /** Guest slots 2-4 — P1 (the host) is never in this list, it's always occupied. */
    slots: CoopSlotView[];
    spectators: CoopSpectatorView[];
    maxSpectators: number;
    onKickSlot: (slot: PlayerIndex) => void;
    onKickSpectator: (peerId: string) => void;
    systemColor?: string;
}

/**
 * Host-side lobby + live session panel. Modeled on RASidebar: fully
 * controlled, presentational, koin-scope wrapper, fixed right panel — this
 * component owns no netplay state itself, it just renders what it's given
 * and calls back on kick. The actual RoomManager/transport wiring lives in
 * the app's own host session hook (see the plan's §3/§3a).
 */
export default function CoopPanel({
    isOpen,
    onClose,
    roomCode,
    joinUrl,
    slots,
    spectators,
    maxSpectators,
    onKickSlot,
    onKickSpectator,
    systemColor = '#00FF41',
}: CoopPanelProps) {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl ?? roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard access denied (e.g. insecure context) — nothing more we can do here.
        }
    };

    return (
        <div className="koin-scope" style={{ display: 'contents' }}>
            <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

            <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-gray-900 border-l border-white/10 z-50 flex flex-col shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="p-3 border-b border-white/10 flex-shrink-0" style={{ background: `linear-gradient(to right, ${systemColor}1a, transparent)` }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={18} style={{ color: systemColor }} />
                            <span className="font-heading text-sm text-white">Co-op</span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Room code */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-black/40 rounded-lg px-3 py-2 font-mono text-lg tracking-[0.3em] text-center text-white">
                            {roomCode}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="p-2 rounded-lg bg-black/40 hover:bg-black/60 transition-colors text-gray-300 hover:text-white flex-shrink-0"
                            title="Copy join link"
                        >
                            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
                    {/* P1 — always the host, never in `slots` */}
                    <SlotRow
                        label="P1"
                        icon={<Crown size={14} style={{ color: systemColor }} />}
                        name="You (Host)"
                        status="occupied"
                        systemColor={systemColor}
                    />

                    {slots.map((slot) => (
                        <SlotRow
                            key={slot.slot}
                            label={`P${slot.slot}`}
                            name={slot.status === 'occupied' ? (slot.displayName ?? `Player ${slot.slot}`) : slot.status === 'reserved' ? 'Reconnecting…' : 'Open'}
                            status={slot.status}
                            connectionQuality={slot.status === 'occupied' ? slot.connectionQuality : undefined}
                            latencyMs={slot.status === 'occupied' ? slot.latencyMs : undefined}
                            onKick={slot.status !== 'open' ? () => onKickSlot(slot.slot) : undefined}
                            systemColor={systemColor}
                        />
                    ))}

                    {/* Spectators */}
                    <div className="pt-3 mt-3 border-t border-white/10">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                                <Eye size={12} />
                                Spectators
                            </div>
                            <span className="text-[10px] font-mono text-gray-500">{spectators.length}/{maxSpectators}</span>
                        </div>
                        {spectators.length === 0 ? (
                            <p className="text-xs text-gray-500 px-1">No spectators yet.</p>
                        ) : (
                            <div className="space-y-1">
                                {spectators.map((spectator) => (
                                    <div key={spectator.peerId} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5">
                                        <span className="text-xs text-gray-300 truncate">{spectator.displayName ?? 'Spectator'}</span>
                                        <button
                                            onClick={() => onKickSpectator(spectator.peerId)}
                                            className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                                            title="Kick spectator"
                                        >
                                            <UserX size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SlotRow({
    label,
    icon,
    name,
    status,
    connectionQuality,
    latencyMs,
    onKick,
    systemColor,
}: {
    label: string;
    icon?: ReactNode;
    name: string;
    status: CoopSlotStatus | 'occupied';
    connectionQuality?: ConnectionQuality;
    latencyMs?: number | null;
    onKick?: () => void;
    systemColor: string;
}) {
    const isOpen = status === 'open';
    const isReserved = status === 'reserved';

    return (
        <div className={`flex items-center gap-2 px-2 py-2 rounded-lg ${isOpen ? 'bg-white/[0.02] border border-dashed border-white/10' : 'bg-white/5'}`}>
            <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: isOpen ? 'transparent' : `${systemColor}22`, color: isOpen ? '#6b7280' : systemColor, border: isOpen ? '1px dashed #4b5563' : 'none' }}
            >
                {icon ?? label}
            </div>
            <span className={`flex-1 text-sm truncate ${isOpen ? 'text-gray-500 italic' : isReserved ? 'text-amber-400' : 'text-white'}`}>
                {name}
            </span>
            {connectionQuality && (
                <ConnectionIndicator quality={connectionQuality} latencyMs={latencyMs} />
            )}
            {onKick && (
                <button onClick={onKick} className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0" title={`Kick ${label}`}>
                    <UserX size={14} />
                </button>
            )}
        </div>
    );
}
