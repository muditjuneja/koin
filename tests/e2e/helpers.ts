import type { Browser, Locator, Page } from 'playwright';

/** Read order of an NES controller — the input-test ROM draws one tile per bit in this order. */
export const NES_BUTTONS = ['a', 'b', 'select', 'start', 'up', 'down', 'left', 'right'] as const;
export type NesButton = (typeof NES_BUTTONS)[number];

/** A grid row (8 chars of 0/1) with only `buttons` held. */
export function row(...buttons: NesButton[]): string {
    return NES_BUTTONS.map((b) => (buttons.includes(b) ? '1' : '0')).join('');
}
export const IDLE = row();

/**
 * Screenshots `target` and decodes the input-test ROM's grid: one 8-bit row
 * per player (P1..P4) as the emulated game read its controllers. Works on the
 * host's canvas and on the guest's received video alike — the lit-pixel
 * bounding box is the calibration-tile frame, whatever the scaling.
 */
export async function readGrid(page: Page, target: Locator): Promise<string[] | null> {
    const png = (await target.screenshot()).toString('base64');
    return page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
        const lit = (x: number, y: number) => {
            const i = (y * width + x) * 4;
            return data[i] + data[i + 1] + data[i + 2] > 384;
        };
        // Bounding box over rows/columns with at least 2 lit pixels, so stray
        // compression noise in the video can't stretch it.
        const cols = new Array(width).fill(0);
        const rows = new Array(height).fill(0);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (lit(x, y)) { cols[x]++; rows[y]++; }
        const x0 = cols.findIndex((c) => c >= 2);
        const x1 = cols.length - 1 - [...cols].reverse().findIndex((c) => c >= 2);
        const y0 = rows.findIndex((c) => c >= 2);
        const y1 = rows.length - 1 - [...rows].reverse().findIndex((c) => c >= 2);
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
    throw new Error(`grid never matched.\n  expected: ${JSON.stringify(expected)}\n  last:     ${JSON.stringify(last)}`);
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
