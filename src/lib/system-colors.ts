import { getSupportedSystemsList, SystemInfo } from './emulator-cores';

/**
 * Extract hex color from system color class string
 * @param colorClass - Color class string like 'group-hover:text-[#FF1744]'
 * @returns Hex color string like '#FF1744' or default retro green
 */
export function extractColorFromClass(colorClass?: string): string {
    if (!colorClass) return '#00FF41'; // Default retro green
    const colorMatch = colorClass.match(/text-\[#([A-Fa-f0-9]{6})\]/);
    return colorMatch ? `#${colorMatch[1]}` : '#00FF41';
}

/**
 * Get system color by system name or ID
 * @param systemIdentifier - System name (e.g., 'NES') or ID (e.g., 'nes')
 * @returns Hex color string for the system
 */
export function getSystemColor(systemIdentifier?: string): string {
    if (!systemIdentifier) return '#00FF41'; // Default retro green

    const supportedSystems = getSupportedSystemsList();
    const system = supportedSystems.find(s =>
        s.name === systemIdentifier.toUpperCase() ||
        s.id === systemIdentifier.toLowerCase() ||
        s.value === systemIdentifier.toUpperCase()
    );

    if (!system?.color) return '#00FF41';
    return extractColorFromClass(system.color);
}

/**
 * Get system color from SystemInfo object
 * @param system - SystemInfo object
 * @returns Hex color string for the system
 */
export function getSystemColorFromInfo(system?: SystemInfo): string {
    if (!system?.color) return '#00FF41';
    return extractColorFromClass(system.color);
}

/**
 * Convert hex color to RGB string for CSS opacity support
 * @param hex - Hex color string like '#FF1744'
 * @returns RGB string like '255, 23, 68'
 */
export function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 255, 65';
}
