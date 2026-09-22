import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser, Locator, Page } from 'playwright';

const FAILURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache/failures');

/** Read order of an NES controller — the input-test ROM draws one tile per bit in this order. */
export const NES_BUTTONS = ['a', 'b', 'select', 'start', 'up', 'down', 'left', 'right'] as const;
export type NesButton = (typeof NES_BUTTONS)[number];

/** A grid row (8 chars of 0/1) with only `buttons` held. */
export function row(...buttons: NesButton[]): string {
    return NES_BUTTONS.map((b) => (buttons.includes(b) ? '1' : '0')).join('');
}
export const IDLE = row();

/**
 * Decodes the input-test ROM's grid from `target`: one 8-bit row per player
 * (P1..P4) as the emulated game read its controllers. The host's canvas is
 * screenshotted (WebGL, no preserved drawing buffer); the guest's <video> is
 * read directly, so only what was received counts, not UI drawn over it.
 * Either way the calibration-tile frame gives the scale.
 */
export async function readGrid(page: Page, target: Locator): Promise<string[] | null> {
    const isVideo = await target.evaluate((el) => el.tagName === 'VIDEO');
    const png = isVideo ? null : (await target.screenshot()).toString('base64');
    return target.evaluate(async (el, b64) => {
        let source: CanvasImageSource;
        let w: number;
        let h: number;
        if (b64) {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            [source, w, h] = [img, img.width, img.height];
        } else {
            const video = el as HTMLVideoElement;
            [source, w, h] = [video, video.videoWidth, video.videoHeight];
        }
        if (!w || !h) return null;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(source, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, w, h);
        const lit = (x: number, y: number) => {
            const i = (y * width + x) * 4;
            return data[i] + data[i + 1] + data[i + 2] > 384;
        };
        // The calibration frame is found from solid lit blocks only: the ROM's
        // tiles are filled squares at any scale, while UI overlays drawn over
        // the canvas (badges, text) and video compression noise are not.
        const K = 4;
        const sat = new Int32Array((width + 1) * (height + 1));
        for (let y = 0; y < height; y++) {
            let rowSum = 0;
            for (let x = 0; x < width; x++) {
                rowSum += lit(x, y) ? 1 : 0;
                sat[(y + 1) * (width + 1) + x + 1] = sat[y * (width + 1) + x + 1] + rowSum;
            }
        }
        const solid = (x: number, y: number) =>
            sat[(y + K) * (width + 1) + x + K] - sat[y * (width + 1) + x + K] - sat[(y + K) * (width + 1) + x] + sat[y * (width + 1) + x] === K * K;
        let x0 = -1, y0 = -1, x1 = -1, y1 = -1;
        for (let y = 0; y + K <= height; y++) {
            for (let x = 0; x + K <= width; x++) {
                if (!solid(x, y)) continue;
                if (x0 < 0 || x < x0) x0 = x;
                if (y0 < 0 || y < y0) y0 = y;
                x1 = Math.max(x1, x + K - 1);
                y1 = Math.max(y1, y + K - 1);
            }
        }
        if (x0 < 0 || y0 < 0) return null;
        // Calibration tiles span NES tile columns 11-20 (80 px) and rows 8-18 (88 px).
        const sx = (x1 + 1 - x0) / 80;
        const sy = (y1 + 1 - y0) / 88;
        const result: string[] = [];
        for (let player = 0; player < 4; player++) {
            let bits = '';
            for (let bit = 0; bit < 8; bit++) {
                const nx = (12 + bit) * 8 + 4 - 88;
                const ny = (10 + 2 * player) * 8 + 4 - 64;
                bits += lit(Math.round(x0 + nx * sx), Math.round(y0 + ny * sy)) ? '1' : '0';
            }
            result.push(bits);
        }
        return result;
    }, png);
}

/** Polls readGrid until it matches `expected` (per player; undefined entries are not checked). */
export async function waitForGrid(page: Page, target: Locator, expected: (string | undefined)[], timeoutMs = 8000): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;
    let last: string[] | null = null;
    while (Date.now() < deadline) {
        last = await readGrid(page, target);
        if (last && expected.every((want, i) => want === undefined || last![i] === want)) return last;
        await page.waitForTimeout(100);
    }
    const shot = path.join(FAILURE_DIR, `grid-${Date.now()}.png`);
    mkdirSync(FAILURE_DIR, { recursive: true });
    await target.screenshot({ path: shot }).catch(() => {});
    throw new Error(`grid never matched (screenshot: ${shot}).\n  expected: ${JSON.stringify(expected)}\n  last:     ${JSON.stringify(last)}`);
}

export async function waitFor<T>(page: Page, fn: () => T | Promise<T>, what: string, timeoutMs = 20_000): Promise<T> {
    try {
        const handle = await page.waitForFunction(fn, undefined, { timeout: timeoutMs, polling: 100 });
        return (await handle.jsonValue()) as T;
    } catch (err) {
        throw new Error(`timed out waiting for ${what}: ${(err as Error).message.split('\n')[0]}`);
    }
}

export interface HostPage {
    page: Page;
    room: string;
    canvas: Locator;
}

export async function startHost(browser: Browser, baseUrl: string, signalUrl: string, query: Record<string, string> = {}, viewport = { width: 1280, height: 960 }): Promise<HostPage> {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error('[host pageerror]', err.message));
    const params = new URLSearchParams({ signal: signalUrl, ...query });
    await page.goto(`${baseUrl}/host.html?${params}`);
    await waitFor(page, () => (window as any).__host?.state.status === 'hosting', 'host signaling');
    await page.getByRole('button', { name: /play/i }).click();
    await waitFor(page, () => (window as any).__host?.state.emulatorAttached === true, 'emulator attached to co-op session', 30_000);
    const room = await page.evaluate(() => (window as any).__host.state.roomCode as string);
    const canvas = page.locator('#canvas');
    await waitForGrid(page, canvas, [IDLE, IDLE, IDLE, IDLE], 15_000);
    return { page, room, canvas };
}

export interface GuestPage {
    page: Page;
    video: Locator;
}

export async function startGuest(browser: Browser, baseUrl: string, signalUrl: string, room: string, query: Record<string, string> = {}): Promise<GuestPage> {
    const context = await browser.newContext({ viewport: { width: 800, height: 700 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.error('[guest pageerror]', err.message));
    const params = new URLSearchParams({ signal: signalUrl, room, ...query });
    await page.goto(`${baseUrl}/guest.html?${params}`);
    const video = page.getByTestId('coop-guest-video');
    await waitFor(page, () => (window as any).__guest?.state.status === 'connected', 'guest connected');
    await waitFor(page, () => {
        const el = document.querySelector('[data-testid="coop-guest-video"]') as HTMLVideoElement | null;
        return !!el && el.videoWidth > 0 && !el.paused;
    }, 'guest video playing');
    return { page, video };
}

/** RMS level of the guest's received audio over ~300 ms. */
export async function guestAudioLevel(page: Page): Promise<number> {
    return page.evaluate(async () => {
        const stream = (window as any).__guest.state.mediaStream as MediaStream;
        const ctx = new AudioContext();
        await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        let peak = 0;
        for (let i = 0; i < 6; i++) {
            await new Promise((r) => setTimeout(r, 50));
            analyser.getFloatTimeDomainData(buffer);
            peak = Math.max(peak, Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length));
        }
        await ctx.close();
        return peak;
    });
}
