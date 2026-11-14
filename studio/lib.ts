/**
 * Studio runtime (Node side): fetches ROMs and libretro cores, bundles the
 * studio page, serves it locally and drives it in headless Chromium.
 */
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, writeFileSync, readFileSync, createReadStream, appendFileSync, rmSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium, type Browser, type Page } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '..');
export const cache = path.join(here, '.cache');
export const outDir = path.join(here, 'out');
const www = path.join(cache, 'www');
const coresDir = path.join(cache, 'cores');
const romsDir = path.join(cache, 'roms');

/** Same core builds koin's e2e suite uses. */
const CORE_VERSION = 'v1.22.2';
/** Where weplayretro.games serves its library from (see src/templates/game.js there). */
export const ROM_STORE = 'https://store.theretrosaga.com/weplayretro/';

/** Minimal ZIP reader (stored + deflate). */
export function unzip(buffer: Buffer): Map<string, Buffer> {
    const files = new Map<string, Buffer>();
    const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    const count = buffer.readUInt16LE(eocd + 10);
    let offset = buffer.readUInt32LE(eocd + 16);
    for (let i = 0; i < count; i++) {
        const method = buffer.readUInt16LE(offset + 10);
        const compressedSize = buffer.readUInt32LE(offset + 20);
        const nameLength = buffer.readUInt16LE(offset + 28);
        const extraLength = buffer.readUInt16LE(offset + 30);
        const commentLength = buffer.readUInt16LE(offset + 32);
        const localOffset = buffer.readUInt32LE(offset + 42);
        const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const data = buffer.subarray(dataStart, dataStart + compressedSize);
        files.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return files;
}

async function download(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`fetching ${url}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
}

export async function ensureCore(core: string): Promise<void> {
    mkdirSync(coresDir, { recursive: true });
    if (existsSync(path.join(coresDir, `${core}_libretro.wasm`))) return;
    const url = `https://raw.githubusercontent.com/arianrhodsandlot/retroarch-emscripten-build/${CORE_VERSION}/retroarch/${core}_libretro.zip`;
    for (const [name, data] of unzip(await download(url))) writeFileSync(path.join(coresDir, path.basename(name)), data);
}

/**
 * Fetch a ROM zip from the store and extract the first file matching `ext`.
 * Arcade sets (Neo Geo etc.) stay zipped — pass `keepZip`.
 */
export async function ensureRom(zipName: string, opts: { ext?: RegExp; keepZip?: boolean } = {}): Promise<string> {
    mkdirSync(romsDir, { recursive: true });
    const zipPath = path.join(romsDir, zipName);
    if (!existsSync(zipPath)) writeFileSync(zipPath, await download(ROM_STORE + zipName));
    if (opts.keepZip) return zipName;
    const files = unzip(readFileSync(zipPath));
    const ext = opts.ext ?? /\.(nes|sfc|smc|md|gen|bin|gb|gbc|gba|a26)$/i;
    const entry = [...files.keys()].find((n) => ext.test(n));
    if (!entry) throw new Error(`${zipName}: no ROM matching ${ext} in [${[...files.keys()].join(', ')}]`);
    const romName = path.basename(entry);
    writeFileSync(path.join(romsDir, romName), files.get(entry)!);
    return romName;
}

async function buildPage(): Promise<void> {
    mkdirSync(www, { recursive: true });
    await build({
        entryPoints: { studio: path.join(here, 'page.ts') },
        bundle: true,
        format: 'esm',
        outdir: www,
        logLevel: 'warning',
        absWorkingDir: root,
    });
    writeFileSync(path.join(www, 'index.html'), `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;background:#000}canvas{display:block;image-rendering:pixelated}</style>
<canvas id="screen"></canvas><script type="module" src="/studio.js"></script>`);
}

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };

function serve(): Promise<{ server: Server; url: string }> {
    const mounts: [string, string][] = [['/cores/', coresDir], ['/roms/', romsDir], ['/', www]];
    const server = createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
        for (const [prefix, dir] of mounts) {
            if (!pathname.startsWith(prefix)) continue;
            const file = path.join(dir, path.normalize(decodeURIComponent(pathname.slice(prefix.length))));
            if (!file.startsWith(dir) || !existsSync(file)) continue;
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
            createReadStream(file).pipe(res);
            return;
        }
        res.writeHead(404).end();
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    }));
}

export interface Session {
    page: Page;
    url: string;
    /** Evaluate a studio method in the page. */
    call<T = unknown>(method: string, ...args: unknown[]): Promise<T>;
    wait(ms: number): Promise<void>;
    record(file: string): Promise<{ stop(): Promise<string> }>;
    screenshot(file: string): Promise<void>;
    close(): Promise<void>;
}

export interface LaunchOptions {
    core: string;
    romName: string;
    shader?: string;
    width?: number;
    height?: number;
    retroarchConfig?: Record<string, unknown>;
}

export async function launch(opts: LaunchOptions): Promise<Session> {
    await ensureCore(opts.core);
    await buildPage();
    const { server, url } = await serve();
    const browser: Browser = await chromium.launch({
        // STUDIO_CHROMIUM: use a system Chromium when the pinned Playwright's own browser isn't installed
        executablePath: process.env.STUDIO_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
        args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    });
    const page = await browser.newPage({ viewport: { width: opts.width ?? 768, height: opts.height ?? 720 } });
    page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
    page.on('pageerror', (e) => console.error('[page error]', e.message));

    let sink: string | null = null;
    await page.exposeFunction('__chunk', (b64: string) => { if (sink) appendFileSync(sink, Buffer.from(b64, 'base64')); });

    await page.goto(url);
    await page.waitForFunction(() => !!window.studio);
    await page.evaluate((o) => window.studio.launch(o), {
        rom: `${url}/roms/${encodeURIComponent(opts.romName)}`,
        romName: opts.romName,
        core: { name: opts.core, js: `${url}/cores/${opts.core}_libretro.js`, wasm: `${url}/cores/${opts.core}_libretro.wasm` },
        shader: opts.shader,
        width: opts.width,
        height: opts.height,
        retroarchConfig: opts.retroarchConfig,
    });

    const session: Session = {
        page,
        url,
        call: (method, ...args) => page.evaluate(([m, a]) => (window.studio as any)[m as string](...(a as unknown[])), [method, args] as const) as any,
        wait: (ms) => new Promise((r) => setTimeout(r, ms)),
        async record(file) {
            mkdirSync(path.dirname(file), { recursive: true });
            rmSync(file, { force: true });
            sink = file;
            const info = await session.call<{ mimeType: string; audio: boolean }>('startRecording');
            console.log(`[studio] recording ${path.basename(file)} (${info.mimeType}, audio=${info.audio})`);
            return {
                async stop() {
                    await session.call('stopRecording');
                    sink = null;
                    return file;
                },
            };
        },
        async screenshot(file) {
            mkdirSync(path.dirname(file), { recursive: true });
            writeFileSync(file, Buffer.from(await session.call<string>('screenshot'), 'base64'));
        },
        async close() {
            await browser.close();
            server.close();
        },
    };
    return session;
}
