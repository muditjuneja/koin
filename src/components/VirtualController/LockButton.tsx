'use client';

import { Lock, Unlock } from 'lucide-react';

interface LockButtonProps {
    isLocked: boolean;
    onToggle: () => void;
    systemColor?: string;
}

/**
 * Floating lock button to toggle virtual control repositioning
 */
export default function LockButton({
    isLocked,
    onToggle,
    systemColor = '#00FF41',
}: LockButtonProps) {
    const Icon = isLocked ? Lock : Unlock;

    return (
        <button
            onClick={onToggle}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto p-2 rounded-full backdrop-blur-sm transition-all active:scale-95"
            style={{
                backgroundColor: isLocked ? 'rgba(0,0,0,0.6)' : `${systemColor}20`,
                border: `1px solid ${isLocked ? 'rgba(255,255,255,0.2)' : systemColor}`,
            }}
            aria-label={isLocked ? 'Unlock controls for repositioning' : 'Lock controls'}
        >
            <Icon
                size={18}
                style={{ color: isLocked ? 'rgba(255,255,255,0.6)' : systemColor }}
            />
        </button>
    );
}
