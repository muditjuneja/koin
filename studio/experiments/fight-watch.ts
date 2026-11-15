// Load a saved state at 1x, run an autopilot rule set, screenshot every 2s.
//   STEPS=20 node studio/experiments/fight-watch.ts <state> <policy>
import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const [stateFile, policy = 'up'] = process.argv.slice(2);
const FIRE = { buttons: ['b'], period: 2, on: 1, ticks: true };
const hold = (...buttons: string[]) => ({ buttons, period: 1, on: 1 });
const POLICIES: Record<string, object[]> = {
    up: [FIRE, hold('up')],
    upright: [FIRE, hold('up', 'right')],
    right: [FIRE, hold('right')],
    'face-up': [FIRE, { buttons: ['down'], period: 240, on: 14 }, { buttons: ['up'], period: 240, on: 4, phase: 226 }],
    'down-fire': [FIRE, hold('down')],
};
const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName, width: 512, height: 480 });
await s.wait(1000);
await s.call('cheats', ['AUUEPGEY', 'TEUEZGZE', 'AOSAGPEP', 'AOVEELEP', 'EUUTGIYS', 'YSXTPSEL', 'ZEUTZIAA', 'GZVAZTSP', 'SUEAGIVI']);
await s.call('loadState', readFileSync(stateFile).toString('base64'));
await s.wait(500);
await s.locateRam();
await s.call('autopilot', { frameAddr: 0x5b, rules: POLICIES[policy] });
for (let k = 0; k < Number(process.env.STEPS ?? 8); k++) {
    await s.wait(2000);
    const [boss] = await s.call<number[]>('ram', 0x5c);
    const [scroll] = await s.call<number[]>('ram', 0x61);
    console.log(`t=${(k + 1) * 2}s boss=$5c:${boss.toString(2)} scroll=$61:${scroll}`);
    await s.page.screenshot({ path: path.join(outDir, `fw-${String(k).padStart(2, '0')}.png`) });
}
await s.close();
