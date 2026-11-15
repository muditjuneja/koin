// Start-at-area + invincibility + spray gun codes, and an 8s recording (video + audio).
import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';

const area = Number(process.argv[2] ?? 2);
const AREA_CODES: Record<number, string> = { 2: 'PEETLIAA', 3: 'ZEETLIAA', 4: 'LEETLIAA', 5: 'GEETLIAA', 6: 'IEETLIAA', 7: 'TEETLIAA', 8: 'YEETLIAA' };
const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(1000);
const codes = [
    ...(AREA_CODES[area] ? [AREA_CODES[area]] : []),
    'AUUEPGEY', 'TEUEZGZE', 'AOSAGPEP', 'AOVEELEP', // non-blinking invincibility
    'EUUTGIYS', 'YSXTPSEL', 'ZEUTZIAA', // start with spray gun
    'GZVAZTSP', // keep weapon after dying
];
console.log('cheats:', await s.call('cheats', codes));
await s.wait(1500);
await s.locateRam();
await s.call('tap', 'start', 120); await s.wait(600);
await s.call('tap', 'start', 120);
await s.waitRam(0x18, (v) => v === 4, 20_000);
console.log('playing; level $50 =', (await s.call<number[]>('ram', 0x50))[0], ' weapon $b8 =', (await s.call<number[]>('ram', 0xb8))[0].toString(16));
await s.wait(2500);
await s.screenshot(path.join(outDir, `cc-area${area}.png`));
await s.call('autopilot', { frameAddr: 0x1b, rules: [
    { buttons: ['right'], period: 1, on: 1 },
    { buttons: ['b'], period: 8, on: 4 },
    { buttons: ['a'], period: 70, on: 14, jitter: 40 },
] });
const rec = await s.record(path.join(outDir, `cc-area${area}.webm`));
await s.wait(8000);
console.log('saved', await rec.stop());
await s.close();
