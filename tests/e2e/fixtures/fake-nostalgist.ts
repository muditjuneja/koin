/**
 * A drop-in double for the `nostalgist` package's default export, used only
 * in the E2E harness bundle (see ../build.mjs, which aliases the bare
 * `nostalgist` import to this file).
 *
 * Real Nostalgist.prepare() fetches a WASM libretro core and a ROM over the
 * network and boots RetroArch inside an emscripten module — none of that is
 * available (or desirable) in CI. This fake reaches the same state machine
 * transitions (idle -> loading -> ready -> running) synchronously so the
 * REAL GamePlayer component tree, hooks, and UI can be driven end-to-end in
 * a real browser without any network dependency or emulator core.
 *
 * Method shapes below are copied from node_modules/nostalgist/dist/nostalgist.d.ts
 * (the real, installed version) — not guessed. Notably: `saveState()`
 * resolves `{ state: Blob, thumbnail?: Blob }` (not a raw Uint8Array), and
 * there is no `saveStateWithBlob` on the real instance at all — that name
 * only exists on koin's own `UseNostalgistReturn` hook wrapper
 * (src/hooks/useNostalgist.ts), which gets there via
 * useSaveScheduler.ts -> nostalgistRef.current.saveState(). Getting this
 * wrong here silently breaks the save flow with no thrown error (the
 * scheduler just logs a warning and resolves null) — worth knowing if this
 * ever needs updating alongside a `nostalgist` version bump.
 */

type FakeCheat = { code: string; desc?: string };

function fakeBlob(content: string, type = 'application/octet-stream'): Blob {
    return new Blob([content], { type });
}

export class FakeNostalgistInstance {
    rewindEnabled = false;
    private paused = false;

    async start(): Promise<void> {}

    pause = () => { this.paused = true; };
    resume = () => { this.paused = false; };

    restart(): void {}
    exit(_statusCode?: number): void {}

    async saveState(): Promise<{ state: Blob; thumbnail: Blob | undefined }> {
        return { state: fakeBlob('fake-save-state'), thumbnail: undefined };
    }

    async saveSRAM(): Promise<Blob> {
        return fakeBlob('fake-sram');
    }

    async loadState(_state: unknown): Promise<void> {}

    injectCheats(_cheats: FakeCheat[]): void {}

    async screenshot(): Promise<Blob> {
        return fakeBlob('fake-screenshot', 'image/png');
    }

    async press(_button: string, _player?: number, _time?: number): Promise<void> {}
    pressDown(_button: string, _player?: number): void {}
    pressUp(_button: string, _player?: number): void {}

    resize(_size: { width: number; height: number }): void {}

    getCanvas(): HTMLCanvasElement | null {
        return document.querySelector('canvas');
    }

    getEmscripten(): Record<string, unknown> {
        return {};
    }

    getEmscriptenModule(): Record<string, unknown> {
        return {};
    }

    sendCommand(_command: string): void {}
}

export class Nostalgist {
    static async prepare(_options: unknown): Promise<FakeNostalgistInstance> {
        return new FakeNostalgistInstance();
    }
}
