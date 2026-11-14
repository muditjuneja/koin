/**
 * Studio page — runs inside headless Chromium.
 *
 * Boots a game with Nostalgist (the same emulator koin wraps) and exposes
 * `window.studio`, a small control surface the Node runner drives through
 * Playwright: inputs, save states, RAM reads, cheats and recording.
 */
import { Nostalgist } from 'nostalgist';
import { keyboardToRetroArchConfig } from '../src/lib/controls/retroarch';
import { DEFAULT_KEYBOARD } from '../src/lib/controls/defaults';

declare global {
    interface Window {
        studio: typeof studio;
        __chunk?: (b64: string) => Promise<void>;
    }
}

// ---------------------------------------------------------------------------
// Audio tap: RetroArch connects its graph to ctx.destination; mirror every
// such connection into a MediaStream destination so recordings have sound.
// ---------------------------------------------------------------------------
let audioDest: MediaStreamAudioDestinationNode | null = null;
const originalConnect = AudioNode.prototype.connect;
(AudioNode.prototype as any).connect = function (this: AudioNode, destination: AudioNode | AudioParam, ...rest: unknown[]) {
    if (destination instanceof AudioNode && destination === this.context.destination) {
        if (!audioDest || audioDest.context !== this.context) {
            audioDest = (this.context as AudioContext).createMediaStreamDestination();
        }
        (originalConnect as Function).call(this, audioDest);
    }
    return (originalConnect as Function).call(this, destination, ...rest);
};

let nostalgist: Nostalgist | null = null;
let ramPtr: number | null = null;
let recorder: MediaRecorder | null = null;
const freezes = new Map<number, number>();
let freezeLoop = 0;
let autopilotLoop = 0;
let autopilotHeld = new Set<string>();

function toB64(bytes: Uint8Array): string {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}
function fromB64(b64: string): Uint8Array {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const studio = {
    async launch(opts: {
        rom: string;
        romName: string;
        core: { name: string; js: string; wasm: string };
        shader?: string;
        width?: number;
        height?: number;
        retroarchConfig?: Record<string, unknown>;
    }) {
        const canvas = document.getElementById('screen') as HTMLCanvasElement;
        canvas.width = opts.width ?? 768;
        canvas.height = opts.height ?? 720;
        nostalgist = await Nostalgist.launch({
            core: opts.core,
            rom: { fileName: opts.romName, fileContent: await (await fetch(opts.rom)).blob() },
            element: canvas,
            respondToGlobalEvents: false,
            shader: opts.shader,
            size: { width: canvas.width, height: canvas.height },
            retroarchConfig: {
                menu_driver: 'null',
                rgui_show_start_screen: false,
                video_font_enable: false,
                notification_show_fast_forward: false,
                video_smooth: false,
                rewind_enable: false,
                savestate_file_compression: false, // raw states: RAM is readable/patchable
                savestate_thumbnail_enable: false,
                fastforward_ratio: 0, // unlimited when fast-forwarding
                // koin's default key bindings — Nostalgist's pressDown() looks buttons up here
                ...keyboardToRetroArchConfig(DEFAULT_KEYBOARD, 1),
                ...opts.retroarchConfig,
            },
        } as any);
        return true;
    },

    status: () => nostalgist?.getStatus() ?? 'none',
    debugHandlers() {
        const { JSEvents } = nostalgist!.getEmscripten() as any;
        const cfg = (nostalgist as any).getEmulator?.().getCurrentRetroarchConfig?.() ?? {};
        return {
            handlers: JSEvents.eventHandlers.map((h: any) => ({ type: h.eventTypeString, target: h.target === document ? 'document' : h.target === window ? 'window' : h.target?.tagName ?? String(h.target) })),
            activeElement: document.activeElement?.tagName,
            input: Object.fromEntries(Object.entries(cfg).filter(([k]) => /input_(driver|player1_(start|a|b|right))$/.test(k))),
        };
    },

    // --- input --------------------------------------------------------------
    down(buttons: string[], player = 1) { for (const button of buttons) nostalgist!.pressDown({ button, player }); },
    up(buttons: string[], player = 1) { for (const button of buttons) nostalgist!.pressUp({ button, player }); },
    async tap(button: string, ms = 80, player = 1) {
        nostalgist!.pressDown({ button, player });
        await sleep(ms);
        nostalgist!.pressUp({ button, player });
    },
    fastForward(on: boolean) {
        // FAST_FORWARD toggles; track state so callers can be idempotent
        if (on !== studio._ff) { nostalgist!.sendCommand('FAST_FORWARD' as any); studio._ff = on; }
    },
    _ff: false,
    pause: () => nostalgist!.pause(),
    resume: () => nostalgist!.resume(),

    // --- save states --------------------------------------------------------
    async saveState(): Promise<string> {
        const { state } = await nostalgist!.saveState();
        return toB64(new Uint8Array(await state.arrayBuffer()));
    },
    async loadState(b64: string) {
        await nostalgist!.loadState(new Blob([fromB64(b64) as any]));
    },

    // --- memory -------------------------------------------------------------
    /** Names of exported functions on the emscripten module that look memory/cheat related (diagnostics). */
    exports(): string[] {
        const m = nostalgist!.getEmscriptenModule() as any;
        return Object.keys(m).filter((k) => /memory|serial|cheat|retro_/i.test(k));
    },
    /** Locate system RAM in the wasm heap by matching a known RAM snapshot (from a save state). */
    findRam(snapshotB64: string): number | null {
        const m = nostalgist!.getEmscriptenModule() as any;
        const heap: Uint8Array = m.HEAPU8;
        const needle = fromB64(snapshotB64);
        // Match on a distinctive 64-byte window with the most distinct values
        let best = 0, bestScore = -1;
        for (let i = 0; i + 64 <= needle.length; i += 16) {
            const score = new Set(needle.subarray(i, i + 64)).size;
            if (score > bestScore) { bestScore = score; best = i; }
        }
        const probe = needle.subarray(best, best + 64);
        const hits: number[] = [];
        outer: for (let i = 0; i + needle.length <= heap.length; i++) {
            if (heap[i] !== probe[0]) continue;
            for (let j = 1; j < probe.length; j++) if (heap[i + j] !== probe[j]) continue outer;
            hits.push(i - best);
            if (hits.length > 4) break;
        }
        ramPtr = hits.length ? hits[0] : null;
        return ramPtr;
    },
    setRamPtr(ptr: number) { ramPtr = ptr; },
    ram(addr: number, len = 1): number[] {
        const m = nostalgist!.getEmscriptenModule() as any;
        return Array.from((m.HEAPU8 as Uint8Array).subarray(ramPtr! + addr, ramPtr! + addr + len));
    },
    ramAll(len: number): string {
        const m = nostalgist!.getEmscriptenModule() as any;
        return toB64((m.HEAPU8 as Uint8Array).slice(ramPtr!, ramPtr! + len));
    },
    /** Hold RAM bytes at fixed values every animation frame (a RAM "freeze" cheat, core-agnostic). */
    freeze(addr: number, value: number) {
        freezes.set(addr, value);
        if (!freezeLoop) {
            const tick = () => {
                if (ramPtr != null) {
                    const heap = (nostalgist!.getEmscriptenModule() as any).HEAPU8 as Uint8Array;
                    for (const [a, v] of freezes) heap[ramPtr + a] = v;
                }
                freezeLoop = requestAnimationFrame(tick);
            };
            freezeLoop = requestAnimationFrame(tick);
        }
    },
    unfreeze(addr?: number) { if (addr === undefined) freezes.clear(); else freezes.delete(addr); },
    poke(addr: number, value: number) {
        const m = nostalgist!.getEmscriptenModule() as any;
        (m.HEAPU8 as Uint8Array)[ramPtr! + addr] = value;
    },

    // --- autopilot ----------------------------------------------------------
    /**
     * A tiny in-page bot clocked by the game's own frame counter, so it
     * behaves the same at 1x and fast-forward. Each rule is a button held
     * for `on` frames out of every `period` frames (offset by `phase`).
     */
    autopilot(cfg: { frameAddr: number; rules: { buttons: string[]; period: number; on: number; phase?: number; jitter?: number }[] }) {
        studio.stopAutopilot();
        let last = studio.ram(cfg.frameAddr)[0];
        let clock = 0;
        const held = new Set<string>();
        const phases = cfg.rules.map((r) => r.phase ?? 0);
        const tick = () => {
            const now = studio.ram(cfg.frameAddr)[0];
            clock += (now - last + 256) % 256;
            last = now;
            const want = new Set<string>();
            cfg.rules.forEach((r, i) => {
                const t = (clock + phases[i]) % r.period;
                if (t < r.on) r.buttons.forEach((b) => want.add(b));
                // re-roll phase once per cycle for some unpredictability
                if (r.jitter && t >= r.period - 1) phases[i] = (phases[i] + Math.floor(Math.random() * r.jitter)) % r.period;
            });
            for (const b of held) if (!want.has(b)) { nostalgist!.pressUp({ button: b, player: 1 }); held.delete(b); }
            for (const b of want) if (!held.has(b)) { nostalgist!.pressDown({ button: b, player: 1 }); held.add(b); }
            autopilotLoop = requestAnimationFrame(tick);
        };
        autopilotLoop = requestAnimationFrame(tick);
        autopilotHeld = held;
        studio._clock = () => clock;
    },
    _clock: () => 0,
    frames: () => studio._clock(),
    stopAutopilot() {
        if (autopilotLoop) cancelAnimationFrame(autopilotLoop);
        autopilotLoop = 0;
        for (const b of autopilotHeld) nostalgist!.pressUp({ button: b, player: 1 });
        autopilotHeld.clear();
    },

    // --- capture ------------------------------------------------------------
    async screenshot(): Promise<string> {
        const blob = await nostalgist!.screenshot();
        return toB64(new Uint8Array(await blob.arrayBuffer()));
    },
    startRecording(fps = 60, videoBitsPerSecond = 8_000_000) {
        const canvas = nostalgist!.getCanvas();
        const stream = canvas.captureStream(fps);
        if (audioDest) for (const t of audioDest.stream.getAudioTracks()) stream.addTrack(t);
        const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
            .find((t) => MediaRecorder.isTypeSupported(t))!;
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond, audioBitsPerSecond: 192_000 });
        recorder.ondataavailable = async (e) => {
            if (e.data.size) await window.__chunk!(toB64(new Uint8Array(await e.data.arrayBuffer())));
        };
        recorder.start(1000);
        return { mimeType, audio: !!audioDest };
    },
    stopRecording(): Promise<void> {
        return new Promise((resolve) => {
            if (!recorder) return resolve();
            recorder.onstop = () => setTimeout(resolve, 500); // let the last chunk flush
            recorder.stop();
            recorder = null;
        });
    },
};

window.studio = studio;
