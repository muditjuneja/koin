import React from 'react';
import { getSystem } from '../lib/systems';
import { CONSOLE_ICON_PATHS, type ConsoleIconKey } from './console-icon-paths';

export type ConsoleSystem = ConsoleIconKey;

interface ConsoleIconProps {
    /** System key, alias or display name ('SNES', 'Super Nintendo', 'snes'), or an icon key ('FLOPPY'). */
    system: string;
    className?: string;
    size?: number;
}

const LEGACY_KEYS: Record<string, ConsoleIconKey> = {
    ATARI: 'ATARI_2600',
};

export function getConsoleIconKey(system: string): ConsoleIconKey {
    const upper = (system ?? '').toUpperCase().trim();
    if (upper in CONSOLE_ICON_PATHS) return upper as ConsoleIconKey;
    if (LEGACY_KEYS[upper]) return LEGACY_KEYS[upper];
    const iconName = upper && getSystem(upper)?.iconName;
    return iconName && iconName in CONSOLE_ICON_PATHS ? (iconName as ConsoleIconKey) : 'DEFAULT';
}

/** Single-colour console icon; takes the surrounding text colour. */
export const ConsoleIcon: React.FC<ConsoleIconProps> = ({ system, className = '', size = 48 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`${system} icon`}
    >
        {CONSOLE_ICON_PATHS[getConsoleIconKey(system)].map((d, i) => (
            <path key={i} d={d} fill="currentColor" fillRule="evenodd" />
        ))}
    </svg>
);
