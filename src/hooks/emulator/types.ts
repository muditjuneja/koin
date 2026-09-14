export type EmulatorStatus = 'idle' | 'loading' | 'ready' | 'running' | 'paused' | 'error';
export type SpeedMultiplier = 1 | 2; // Only 1x (normal) and 2x (fast forward) work reliably in browser

/**
 * A self-hosted libretro core, compiled to WebAssembly.
 *
 * Pass this instead of a core name string to use a core that isn't part of
 * koin's built-in system mapping — e.g. one you compiled yourself, or one
 * hosted on your own CDN (see https://github.com/muditjuneja/koin/issues/3).
 * `js`/`wasm` are fetched directly, the same way koin already loads
 * `linuxserver/libretro-cores` cores under the hood.
 */
export interface CustomCoreSource {
    name: string;
    js: string;
    wasm: string;
}

export interface RetroAchievementsConfig {
    username: string;
    token: string;
    hardcore?: boolean;
}
