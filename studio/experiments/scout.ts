import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dir = path.join(outDir, 'superc-scout'); mkdirSync(dir, { recursive: true });
const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(1500);
const state = readFileSync(path.join(outDir, 'superc-stage1.state'));
await s.call('loadState', state.toString('base64'));
await s.wait(300);
const i = state.indexOf(Buffer.from('RAM\0', 'latin1'));
await s.call('findRam', state.subarray(i + 8, i + 8 + 0x800).toString('base64'));
await s.call('freeze', 0x53, 2);
await s.call('autopilot', { frameAddr: 0x1b, rules: [
  { buttons: ['right'], period: 1, on: 1 },
  { buttons: ['b'], period: 8, on: 4 },
  { buttons: ['a'], period: 70, on: 14, jitter: 40 },
  { buttons: ['up'], period: 300, on: 60, phase: 150, jitter: 100 },
]});
await s.call('fastForward', true);
let lastScreen = -1, lastChangeFrame = 0, lastLog = 0;
const t0 = Date.now();
while (Date.now() - t0 < 240_000) {
  await s.wait(400);
  const f = await s.call<number>('frames');
  const [scr] = await s.call<number[]>('ram', 0x16);
  if (scr !== lastScreen) {
    lastScreen = scr; lastChangeFrame = f;
    writeFileSync(path.join(dir, `screen-${String(scr).padStart(2, '0')}.state`), Buffer.from(await s.call<string>('saveState'), 'base64'));
    await s.screenshot(path.join(dir, `screen-${String(scr).padStart(2, '0')}.png`));
  }
  if (Date.now() - lastLog > 10_000) { lastLog = Date.now(); console.log(`wall=${((Date.now() - t0) / 1000).toFixed(0)}s frames=${f} (${(f / ((Date.now() - t0) / 1000) / 60).toFixed(1)}x) screen=${scr}`); }
  if (f - lastChangeFrame > 60 * 45) { // 45 game-seconds without a new screen: boss arena (or stuck)
    console.log(`stalled on screen ${scr} at frame ${f}`);
    writeFileSync(path.join(dir, `stall-${String(scr).padStart(2, '0')}.state`), Buffer.from(await s.call<string>('saveState'), 'base64'));
    await s.screenshot(path.join(dir, `stall-${String(scr).padStart(2, '0')}.png`));
    break;
  }
}
await s.close();
