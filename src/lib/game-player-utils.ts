import { RefObject } from 'react';

/**
 * Turn a raw ROM-loading error into an actionable message.
 *
 * The browser's `fetch()` throws a generic `TypeError` (e.g. "Failed to
 * fetch", "NetworkError when attempting to fetch resource.", or Safari's
 * "Load failed") whenever a cross-origin ROM request is blocked by CORS,
 * blocked as mixed content (https page requesting an http:// ROM), or
 * simply can't reach the host. That message alone gives users nothing to
 * act on (see https://github.com/muditjuneja/koin/issues/4), so we detect
 * this class of failure and explain the likely cause instead.
 */
export function describeRomLoadError(err: unknown, romUrl?: string): string {
    const rawMessage = err instanceof Error ? err.message : String(err);
    const isGenericNetworkError =
        err instanceof TypeError &&
        /failed to fetch|networkerror|load failed/i.test(rawMessage);

    if (!isGenericNetworkError) return rawMessage;

    let hint =
        'Could not download the ROM. This is almost always caused by the ROM host ' +
        'either not being reachable or not allowing cross-origin requests (CORS).';

    if (romUrl) {
        try {
            const url = new URL(romUrl, typeof window !== 'undefined' ? window.location.href : undefined);
            if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.protocol === 'http:') {
                hint =
                    'Could not download the ROM: this page is served over HTTPS but the ROM URL uses ' +
                    'plain HTTP. Browsers block this "mixed content" request. Serve the ROM over HTTPS instead.';
            } else if (typeof window !== 'undefined' && url.origin !== window.location.origin) {
                hint =
                    `Could not download the ROM from ${url.origin}. Make sure that server responds with ` +
                    "an 'Access-Control-Allow-Origin' header allowing this site, or host the ROM on the same domain.";
            }
        } catch {
            // Not a parseable absolute/relative URL — keep the generic hint above.
        }
    }

    return `${hint} (${rawMessage})`;
}

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
