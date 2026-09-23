/**
 * Global setup for the netplay end-to-end suite (vitest.e2e.config.mts).
 *
 * - Fetches the real RetroArch fceumm core nostalgist uses (cached under
 *   tests/e2e/.cache) — the suite exercises real emulation, not a mock.
 * - Bundles the harness pages straight from src/ with esbuild, plus the
 *   Tailwind CSS GamePlayer needs to lay out its canvas.
 * - Serves pages, cores and the test ROM from a local static server.
 * - Runs the real signaling server (server/cloudflare) under `wrangler dev`.
 */

import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, writeFileSync, createReadStream, copyFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';
import { build } from 'esbuild';
import { randomBytes } from 'node:crypto';
import { signJoinToken } from '../../server/cloudflare/src/join-token';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const cache = path.join(here, '.cache');
const www = path.join(cache, 'www');
const coresDir = path.join(cache, 'cores');
const CORE_VERSION = 'v1.22.2';
const CORES = ['fceumm'];
/** The worker runs with access control on; the static server plays the integrator's backend and mints tokens. */
const JOIN_TOKEN_SECRET = randomBytes(24).toString('base64url');

declare module 'vitest' {
    export interface ProvidedContext {
        baseUrl: string;
        signalUrl: string;
    }
}

/** Minimal ZIP reader (stored + deflate) — enough for libretro core archives, no dependency. */
function unzip(buffer: Buffer): Map<string, Buffer> {
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

async function fetchCores() {
    mkdirSync(coresDir, { recursive: true });
    for (const core of CORES) {
        if (existsSync(path.join(coresDir, `${core}_libretro.wasm`))) continue;
        const url = `https://raw.githubusercontent.com/arianrhodsandlot/retroarch-emscripten-build/${CORE_VERSION}/retroarch/${core}_libretro.zip`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`fetching ${url}: HTTP ${response.status}`);
        for (const [name, data] of unzip(Buffer.from(await response.arrayBuffer()))) {
            writeFileSync(path.join(coresDir, path.basename(name)), data);
        }
    }
}

async function buildPages() {
    mkdirSync(www, { recursive: true });
    await build({
        entryPoints: { host: path.join(here, 'harness/host.tsx'), guest: path.join(here, 'harness/guest.tsx') },
        bundle: true,
        format: 'esm',
        outdir: www,
        jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"development"' },
        sourcemap: 'inline',
        logLevel: 'warning',
        absWorkingDir: root,
    });
    for (const page of ['host.html', 'guest.html']) copyFileSync(path.join(here, 'harness', page), path.join(www, page));
    execFileSync(path.join(root, 'node_modules/.bin/tailwindcss'), ['-i', 'src/styles.css', '-o', path.join(www, 'styles.css')], { cwd: root, stdio: 'ignore' });
}

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.nes': 'application/octet-stream',
};

function serveStatic(): Promise<Server> {
    const mounts: [string, string][] = [['/cores/', coresDir], ['/fixtures/', path.join(here, 'fixtures')], ['/', www]];
    const server = createServer(async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname === '/token') {
            // Stand-in for a site's backend: GET /token?room=&peer=host|guest[&name=&sub=&role=&expired=1&forge=1]
            const q = url.searchParams;
            const claims = {
                room: q.get('room') ?? '',
                peer: q.get('peer') === 'host' ? 'host' as const : 'guest' as const,
                exp: Math.floor(Date.now() / 1000) + (q.get('expired') ? -60 : 600),
                ...(q.get('name') && { name: q.get('name')! }),
                ...(q.get('sub') && { sub: q.get('sub')! }),
                ...(q.get('role') === 'spectator' && { role: 'spectator' as const }),
            };
            const token = await signJoinToken(q.get('forge') ? 'not-the-secret' : JOIN_TOKEN_SECRET, claims);
            res.writeHead(200, { 'Content-Type': 'text/plain' }).end(token);
            return;
        }
        for (const [prefix, dir] of mounts) {
            if (!url.pathname.startsWith(prefix)) continue;
            const file = path.join(dir, path.normalize(url.pathname.slice(prefix.length)));
            if (!file.startsWith(dir) || !existsSync(file)) continue;
            res.writeHead(200, { 'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream' });
            createReadStream(file).pipe(res);
            return;
        }
        res.writeHead(404).end();
    });
    return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function startSignaling(): Promise<{ process: ChildProcess; url: string }> {
    const dir = path.join(root, 'server/cloudflare');
    if (!existsSync(path.join(dir, 'node_modules'))) execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'ignore' });
    const port = 8700 + Math.floor(Math.random() * 200);
    const child = spawn(path.join(dir, 'node_modules/.bin/wrangler'), ['dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', path.join(cache, 'wrangler-state'), '--var', `JOIN_TOKEN_SECRET:${JOIN_TOKEN_SECRET}`], {
        cwd: dir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    let log = '';
    child.stdout?.on('data', (d) => { log += d; });
    child.stderr?.on('data', (d) => { log += d; });
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 120; i++) {
        try {
            if ((await fetch(`${url}/health`)).ok) return { process: child, url };
        } catch {
            // not up yet
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    child.kill();
    throw new Error(`wrangler dev did not start:\n${log}`);
}

export default async function setup(project: TestProject) {
    await Promise.all([fetchCores(), buildPages()]);
    const [server, signaling] = await Promise.all([serveStatic(), startSignaling()]);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    project.provide('baseUrl', `http://127.0.0.1:${port}`);
    project.provide('signalUrl', signaling.url);
    return async () => {
        signaling.process.kill();
        await new Promise((resolve) => server.close(resolve));
    };
}
