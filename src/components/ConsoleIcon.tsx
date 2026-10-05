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

/** Each drawing's grid and the largest size it is used at; bigger icons fall through to the next. */
const TIERS = [
    { tier: 'xs', grid: 16, maxSize: 18 },
    { tier: 'sm', grid: 20, maxSize: 26 },
    { tier: 'lg', grid: 64, maxSize: Infinity },
] as const;

/** Single-colour console icon; takes the surrounding text colour. */
export const ConsoleIcon: React.FC<ConsoleIconProps> = ({ system, className = '', size = 48 }) => {
    const { tier, grid } = TIERS.find((t) => size <= t.maxSize) ?? TIERS[TIERS.length - 1];
    const paths = CONSOLE_ICON_PATHS[getConsoleIconKey(system)][tier];
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${grid} ${grid}`}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label={`${system} icon`}
        >
            {paths.map((d, i) => (
                <path key={i} d={d} fill="currentColor" fillRule="evenodd" />
            ))}
        </svg>
    );
};
