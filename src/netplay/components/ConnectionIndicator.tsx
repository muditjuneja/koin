'use client';

import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import type { ConnectionQuality } from '../session/connection-quality';

export type { ConnectionQuality };

export interface ConnectionIndicatorProps {
    quality: ConnectionQuality;
    /** Estimated press-to-picture latency in ms, when known. */
    latencyMs?: number | null;
    onClick?: () => void;
}

/**
 * Live connection status, modeled on AutoSaveIndicator's icon + label idiom
 * rather than introducing a new one. Unlike AutoSaveIndicator's progress
 * ring (which tracks a known countdown), quality here comes from the
 * network, so it's colour + icon + a number, not a ring animation.
 */
export default function ConnectionIndicator({ quality, latencyMs, onClick }: ConnectionIndicatorProps) {
    const { icon: Icon, colorClass, label, spin } = getPresentation(quality);

    return (
        <button
            onClick={onClick}
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1 rounded hover:bg-white/5 transition-colors cursor-pointer group"
            title={getTooltip(quality, latencyMs)}
            type="button"
        >
            <Icon size={14} className={`${colorClass} transition-colors duration-300 ${spin ? 'animate-spin' : ''}`} />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}>
                {label}
            </span>
            {typeof latencyMs === 'number' && quality !== 'connecting' && quality !== 'disconnected' && (
                <span className="text-[8px] font-mono text-white/50">{Math.round(latencyMs)}ms</span>
            )}
        </button>
    );
}

function getPresentation(quality: ConnectionQuality): { icon: typeof Wifi; colorClass: string; label: string; spin: boolean } {
    switch (quality) {
        case 'connecting':
            return { icon: Loader2, colorClass: 'text-gray-400', label: 'Connecting', spin: true };
        case 'reconnecting':
            return { icon: Loader2, colorClass: 'text-amber-400', label: 'Reconnecting', spin: true };
        case 'good':
            return { icon: Wifi, colorClass: 'text-emerald-400', label: 'Good', spin: false };
        case 'fair':
            return { icon: Wifi, colorClass: 'text-amber-400', label: 'Fair', spin: false };
        case 'poor':
            return { icon: AlertTriangle, colorClass: 'text-orange-500', label: 'Poor', spin: false };
        case 'disconnected':
            return { icon: WifiOff, colorClass: 'text-red-500', label: 'Offline', spin: false };
    }
}

function getTooltip(quality: ConnectionQuality, latencyMs?: number | null): string {
    if (quality === 'connecting') return 'Connecting…';
    if (quality === 'reconnecting') return 'Reconnecting…';
    if (quality === 'disconnected') return 'Disconnected';
    if (typeof latencyMs === 'number') return `~${Math.round(latencyMs)} ms from button press to picture (estimated)`;
    return 'Connected';
}
