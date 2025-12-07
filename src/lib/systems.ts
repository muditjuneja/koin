/**
 * Unified System Configuration
 * 
 * SINGLE SOURCE OF TRUTH for all system-related data:
 * - Canonical system keys (used internally)
 * - File extensions → system detection
 * - System → RetroArch emulator core
 * - System → Database names (for LaunchBox matching)
 * - System → Display metadata (UI labels, colors, icons)
 * 
 * All other files should import from here instead of maintaining their own mappings.
 */

import { SYSTEMS, SystemConfig } from '../data/systems-data';

export type { SystemConfig };
export { SYSTEMS };

// ============ Lookup Maps (built from SYSTEMS) ============

// Key → System config
const systemByKey = new Map<string, SystemConfig>();

// Alias (uppercase) → System config
const systemByAlias = new Map<string, SystemConfig>();

// Extension (lowercase) → System config
const systemByExtension = new Map<string, SystemConfig>();

// DB name (lowercase) → System config
const systemByDbName = new Map<string, SystemConfig>();

// Build all lookup maps
for (const sys of SYSTEMS) {
    // By key
    systemByKey.set(sys.key, sys);

    // By aliases (include key itself)
    systemByAlias.set(sys.key.toUpperCase(), sys);
    for (const alias of sys.aliases) {
        systemByAlias.set(alias.toUpperCase(), sys);
    }

    // By extension
    for (const ext of sys.extensions) {
        systemByExtension.set(ext.toLowerCase(), sys);
    }

    // By DB name
    for (const dbName of sys.dbNames) {
        systemByDbName.set(dbName.toLowerCase(), sys);
    }
}

// ============ Public API ============

/**
 * Get system by canonical key (e.g., 'NES', 'GBA')
 */
export function getSystemByKey(key: string): SystemConfig | undefined {
    return systemByKey.get(key);
}

/**
 * Get system by any name/alias (case-insensitive)
 * Tries: exact key match, then alias match
 */
export function getSystem(name: string): SystemConfig | undefined {
    const upper = name.toUpperCase().trim();
    return systemByAlias.get(upper);
}

/**
 * Get system from file extension (e.g., '.nes', '.gba')
 */
export function getSystemFromExtension(filename: string): SystemConfig | undefined {
    const match = filename.match(/\.[^.]+$/);
    if (!match) return undefined;
    return systemByExtension.get(match[0].toLowerCase());
}

/**
 * Get system by database name (for LaunchBox matching)
 */
export function getSystemByDbName(dbName: string): SystemConfig | undefined {
    return systemByDbName.get(dbName.toLowerCase());
}

/**
 * Get RetroArch core for a system name (case-insensitive)
 * Falls back to 'fceumm' (NES) if not found
 */
export function getCore(systemName: string): string {
    const sys = getSystem(systemName);
    return sys?.core ?? 'fceumm';
}

/**
 * Get DB names for matching (used in game search)
 */
export function getDBSystemNames(systemKey: string): string[] {
    const sys = getSystem(systemKey);
    return sys?.dbNames ?? [systemKey];
}

/**
 * Check if a system is supported
 */
export function isSystemSupported(name: string): boolean {
    return getSystem(name) !== undefined;
}

/**
 * Get all supported extensions
 */
export function getSupportedExtensions(): string[] {
    const exts = new Set<string>();
    for (const sys of SYSTEMS) {
        for (const ext of sys.extensions) {
            exts.add(ext);
        }
    }
    // Add .zip as special case (handled separately)
    exts.add('.zip');
    return Array.from(exts);
}

/**
 * Get all systems for UI dropdown
 */
export function getSystemsList(): Array<{ value: string; label: string; iconName: string; color: string }> {
    return SYSTEMS.map(sys => ({
        value: sys.key,
        label: sys.label,
        iconName: sys.iconName,
        color: sys.color,
    }));
}

/**
 * Detect system from filename
 * Returns null for ZIP files (user must select)
 */
export function detectSystem(filename: string): SystemConfig | undefined {
    const ext = filename.match(/\.[^.]+$/)?.[0]?.toLowerCase();
    if (ext === '.zip') return undefined;
    return getSystemFromExtension(filename);
}

/**
 * Check if two system names refer to the same platform
 */
export function systemsMatch(name1: string, name2: string): boolean {
    const sys1 = getSystem(name1);
    const sys2 = getSystem(name2);
    if (!sys1 || !sys2) return false;
    return sys1.key === sys2.key;
}

/**
 * Normalize a system name to its canonical key
 */
export function normalizeSystemKey(name: string): string {
    const sys = getSystem(name);
    return sys?.key ?? name;
}

// Legacy export names for backward compatibility
export const SUPPORTED_EXTENSIONS = getSupportedExtensions();

// Performance Optimization Tiers
// ===============================
// Systems are grouped by CPU complexity to apply optimal RetroArch settings.
// See useEmulatorCore.ts getOptimizedConfig() for the actual settings applied.

/**
 * TIER 1: "Zero Lag" - Lightweight Systems
 * ----------------------------------------
 * These 8-bit and 16-bit systems have low CPU requirements in WASM,
 * allowing us to enable Run-Ahead (frame prediction) for near-zero input latency.
 * 
 * Run-Ahead works by running the emulator ahead by 1 frame and using that
 * result for display, effectively cutting 1 frame (~16ms) of input lag.
 */
export const PERFORMANCE_TIER_1_SYSTEMS = new Set([
    'NES', 'SNES', 'GENESIS', 'GB', 'GBC',
    'MASTER_SYSTEM', 'GAME_GEAR', 'PC_ENGINE',
    'ATARI_2600', 'ATARI_7800', 'LYNX',
    'NEOGEO_POCKET', 'NEOGEO_POCKET_COLOR',
    'WONDERSWAN', 'WONDERSWAN_COLOR'
]);

/**
 * TIER 2: "Max Smoothness" - Heavy Systems
 * ----------------------------------------
 * These 32-bit+ systems push WASM hard. Run-Ahead would cause stuttering.
 * Instead, we optimize for smooth, consistent frame delivery:
 * - Threaded video rendering to prevent UI freezes
 * - Larger audio buffers to prevent crackling
 * - Disabled manual rewind capture (saves RAM and CPU cycles)
 */
export const PERFORMANCE_TIER_2_SYSTEMS = new Set([
    'PS1', 'N64', 'GBA', 'SATURN', 'DREAMCAST',
    'NDS', 'PSP', 'ARCADE', 'DOS', 'NEOGEO'
]);

