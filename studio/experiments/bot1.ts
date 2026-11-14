import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(1500);
const state = readFileSync(path.join(outDir, 'superc-stage1.state'));
await s.call('loadState', state.toString('base64'));
await s.wait(500);
const i = state.indexOf(Buffer.from('RAM\0', 'latin1'));
await s.call('findRam', state.subarray(i + 8, i + 8 + 0x800).toString('base64'));
await s.call('freeze', 0x53, 2);
await s.call('down', ['right', 'b']);
const t0 = Date.now();
const log: string[] = [];
for (let k = 0; k < 50; k++) {
  // jump roughly every 1.2s
  await s.call('tap', 'a', 200);
  for (let w = 0; w < 4; w++) { await s.wait(560); log.push(await s.call<string>('ramAll', 0x800)); }
  const [lives] = await s.call<number[]>('ram', 0x53);
  if (k % 3 === 0) {
    await s.screenshot(path.join(outDir, `bot1-${String(k).padStart(2, '0')}.png`));
    console.log(`t=${((Date.now() - t0) / 1000).toFixed(0)}s lives=${lives}`);
  }
}
(await import('node:fs')).writeFileSync(path.join(outDir, 'bot1-ram.json'), JSON.stringify(log));
await s.close();
