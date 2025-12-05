import { RefObject } from 'react';

export function suppressEmulatorWarnings() {
    // Suppress harmless warnings from Emscripten/RetroArch
    const originalWarn = console.warn;
    const originalError = console.error;

    const shouldSuppress = (arg: any) => {
        if (typeof arg !== 'string') return false;
        return (
            arg.includes('FS.syncfs') ||
            arg.includes('AL_INVALID_VALUE') ||
            arg.includes('GL_INVALID_VALUE') ||
            arg.includes('Canvas size should be set using CSS properties!')
        );
    };

    console.warn = (...args) => {
        if (shouldSuppress(args[0])) return;
        originalWarn.apply(console, args);
    };

    console.error = (...args) => {
        if (shouldSuppress(args[0])) return;
        originalError.apply(console, args);
    };
}

export function setupCanvasResize(
    containerRef: RefObject<HTMLDivElement>
) {
    if (!containerRef.current) return;

    // Nostalgist handles canvas resolution internally based on CSS size
    // We just need to ensure the container is properly sized
    // Emscripten/RetroArch will fill the canvas based on CSS width/height: 100%
}

// Volume persistence
const VOLUME_KEY = 'retro-player-volume';
const MUTE_KEY = 'retro-player-muted';

export function loadVolume(): number {
    if (typeof window === 'undefined') return 100;
    const saved = localStorage.getItem(VOLUME_KEY);
    return saved ? parseInt(saved, 10) : 100;
}

export function saveVolume(volume: number) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VOLUME_KEY, volume.toString());
}

export function loadMuteState(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MUTE_KEY) === 'true';
}

export function saveMuteState(muted: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MUTE_KEY, muted.toString());
}
