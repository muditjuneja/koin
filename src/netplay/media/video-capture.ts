/**
 * Host-side video capture for netplay streaming.
 *
 * Three strategies, tried in order (plan §2). `MediaStreamTrackGenerator` is
 * not yet in TypeScript's bundled DOM lib, so it's accessed via `globalThis`
 * with a runtime feature check rather than a global type augmentation —
 * matches how the rest of the codebase already reaches past Nostalgist's
 * public types (see useEmulatorAudio.ts, useEmulatorInput.ts).
 */

export type VideoCaptureStrategy =
    | 'video-track-generator'
    | 'capture-stream-on-demand'
    | 'capture-stream-fixed-fps';

export interface VideoCaptureHandle {
    track: MediaStreamTrack;
    strategy: VideoCaptureStrategy;
    /**
     * Call this right after the emulator presents a new frame to capture it
     * immediately, for the on-demand strategies. koin has no post-frame hook
     * into Emscripten's render loop today, so both on-demand strategies also
     * drive themselves off requestAnimationFrame as a baseline — this is an
     * extra, tighter-timed capture on top, and a no-op for the fixed-fps
     * strategy (which has nothing to trigger on demand).
     */
    notifyFramePresented: () => void;
    stop: () => void;
}

export interface VideoCaptureOptions {
    /** Frames per second for the capture-stream-fixed-fps fallback. Default 60. */
    fps?: number;
}

function supportsVideoTrackGenerator(): boolean {
    const g = globalThis as any;
    return typeof g.VideoFrame === 'function' && typeof g.MediaStreamTrackGenerator === 'function';
}

function supportsCaptureStreamOnDemand(canvas: HTMLCanvasElement): boolean {
    // captureStream(0) + track.requestFrame() — Chromium-only today. Flagged
    // in the plan: unverified whether captureStream(0) reliably waits for
    // requestFrame() rather than emitting on its own cadence
    // (issues.chromium.org/issues/40671698) — probe for the method's mere
    // presence here; correctness is a real-hardware verification item.
    if (typeof canvas.captureStream !== 'function') return false;
    try {
        const probe = canvas.captureStream(0);
        const track = probe.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
        const ok = !!track && typeof track.requestFrame === 'function';
        probe.getTracks().forEach((t) => t.stop());
        return ok;
    } catch {
        return false;
    }
}

function startVideoTrackGenerator(canvas: HTMLCanvasElement): VideoCaptureHandle {
    const g = globalThis as any;
    const generator = new g.MediaStreamTrackGenerator({ kind: 'video' });
    const writer = generator.writable.getWriter();
    let stopped = false;
    let rafId: number | null = null;

    const captureFrame = () => {
        if (stopped) return;
        try {
            // VideoFrame(canvas) is a zero-copy reference into the canvas's
            // current backing buffer — avoids the GPU->CPU readback that
            // captureStream() does internally (plan §2 / Mozilla bug 1340142).
            const frame = new g.VideoFrame(canvas, { timestamp: performance.now() * 1000 });
            writer.write(frame).catch(() => {
                // Backpressure or the writer was closed mid-flight — drop this frame.
            }).finally(() => frame.close());
        } catch {
            // Canvas not paintable yet (e.g. zero size) — skip this frame, try again next tick.
        }
    };

    const loop = () => {
        if (stopped) return;
        captureFrame();
        rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return {
        track: generator,
        strategy: 'video-track-generator',
        notifyFramePresented: captureFrame,
        stop: () => {
            stopped = true;
            if (rafId !== null) cancelAnimationFrame(rafId);
            writer.close().catch(() => {});
            generator.stop?.();
        },
    };
}

function startCaptureStreamOnDemand(canvas: HTMLCanvasElement): VideoCaptureHandle {
    const stream = canvas.captureStream(0);
    const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame: () => void };
    let stopped = false;
    let rafId: number | null = null;

    const requestFrame = () => {
        if (!stopped) track.requestFrame();
    };

    const loop = () => {
        if (stopped) return;
        requestFrame();
        rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return {
        track,
        strategy: 'capture-stream-on-demand',
        notifyFramePresented: requestFrame,
        stop: () => {
            stopped = true;
            if (rafId !== null) cancelAnimationFrame(rafId);
            track.stop();
        },
    };
}

function startCaptureStreamFixedFps(canvas: HTMLCanvasElement, fps: number): VideoCaptureHandle {
    const stream = canvas.captureStream(fps);
    const track = stream.getVideoTracks()[0];
    return {
        track,
        strategy: 'capture-stream-fixed-fps',
        notifyFramePresented: () => {},
        stop: () => track.stop(),
    };
}

/**
 * Start capturing `canvas` as a MediaStreamTrack, using the cheapest
 * available strategy the current browser supports (plan §2). Always
 * succeeds if `canvas.captureStream` exists at all — the fixed-fps path is
 * supported everywhere koin already runs (useGameRecording.ts uses it today).
 */
export function startVideoCapture(canvas: HTMLCanvasElement, options: VideoCaptureOptions = {}): VideoCaptureHandle {
    const { fps = 60 } = options;

    if (supportsVideoTrackGenerator()) {
        try {
            return startVideoTrackGenerator(canvas);
        } catch (err) {
            console.error('[netplay] VideoTrackGenerator capture failed, falling back:', err);
        }
    }

    if (supportsCaptureStreamOnDemand(canvas)) {
        try {
            return startCaptureStreamOnDemand(canvas);
        } catch (err) {
            console.error('[netplay] captureStream(0) on-demand capture failed, falling back:', err);
        }
    }

    return startCaptureStreamFixedFps(canvas, fps);
}
