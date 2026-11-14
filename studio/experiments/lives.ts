import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';
import { writeFileSync } from 'node:fs';

/** Extract the 2KB NES RAM block from a raw (uncompressed) fceumm state. */
function nesRam(state: Buffer): Buffer {
  const i = state.indexOf(Buffer.from('RAM\0', 'latin1'));
  if (i < 0 || state.readUInt32LE(i + 4) !== 0x800) throw new Error('no RAM chunk');
  return state.subarray(i + 8, i + 8 + 0x800);
}

const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(2500);
await s.call('tap', 'start', 120); await s.wait(500);
await s.call('tap', 'start', 120); await s.wait(5000);
const state = Buffer.from(await s.call<string>('saveState'), 'base64');
writeFileSync(path.join(outDir, 'superc-stage1.state'), state);
const ram = nesRam(state);
const ptr = await s.call<number | null>('findRam', ram.toString('base64'));
console.log('RAM ptr in heap:', ptr);
if (ptr == null) process.exit(1);
// Timeline: stand still and let the enemies win
const frames: string[] = [];
for (let t = 0; t < 160; t++) {
  frames.push(await s.call<string>('ramAll', 0x800));
  if (t % 20 === 0) await s.screenshot(path.join(outDir, `lives-${String(t).padStart(3, '0')}.png`));
  await s.wait(250);
}
writeFileSync(path.join(outDir, 'lives-timeline.json'), JSON.stringify(frames));
await s.close();
