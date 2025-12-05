export type EmulatorStatus = 'idle' | 'loading' | 'ready' | 'running' | 'paused' | 'error';
export type SpeedMultiplier = 1 | 2; // Only 1x (normal) and 2x (fast forward) work reliably in browser

export interface RetroAchievementsConfig {
    username: string;
    token: string;
    hardcore?: boolean;
}
