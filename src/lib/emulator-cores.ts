/**
 * Platform to RetroArch core mapping
 * 
 * NOTE: This file is maintained for backward compatibility.
 * The canonical system configuration is now in lib/systems.ts
 * 
 * Consider using imports from lib/systems.ts directly for new code.
 */

import {
    SYSTEMS,
    getCore as getCoreFromSystems,
    getSystem,
    getSystemsList,
} from './systems';

// Build PLATFORM_CORES map from unified config for backward compatibility
export const PLATFORM_CORES: Record<string, string> = {};
for (const sys of SYSTEMS) {
    // Add canonical key
    PLATFORM_CORES[sys.key] = sys.core;
    // Add all aliases
    for (const alias of sys.aliases) {
        PLATFORM_CORES[alias] = sys.core;
    }
}

/**
 * Get the RetroArch core for a given system name
 * @param system - System name (case-insensitive)
 * @returns Core identifier, defaults to 'fceumm' (NES) if not found
 */
export function getCore(system: string): string {
    return getCoreFromSystems(system);
}

/**
 * Check if a system is supported
 */
export function isSystemSupported(system: string): boolean {
    return getSystem(system) !== undefined;
}

/**
 * Get all supported system names
 */
export function getSupportedSystems(): string[] {
    return Object.keys(PLATFORM_CORES);
}

/**
 * System metadata for UI display
 */
export interface SystemInfo {
    value: string; // System key (e.g., 'NES', 'SNES')
    label: string; // User-friendly name (e.g., 'Nintendo (NES)')
    name: string;  // ConsoleIcon system name (e.g., 'NES', 'MASTER_SYSTEM')
    id: string;    // URL-friendly ID (e.g., 'nes', 'mastersystem')
    color?: string; // Optional hover color class
}

/**
 * Get all supported systems with metadata for UI display
 * Returns systems from unified config
 */
export function getSupportedSystemsList(): SystemInfo[] {
    return getSystemsList().map(sys => ({
        value: sys.value,
        label: sys.label,
        name: sys.iconName,
        id: sys.value.toLowerCase().replace(/_/g, ''),
        color: sys.color,
    }));
}

export default PLATFORM_CORES;
