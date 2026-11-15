// Super C's Game Genie stage select: which button changes the area, and where is it stored?
import { launch, ensureRom, outDir } from '../lib.ts';
import path from 'node:path';

const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(1000);
await s.call('cheats', ['ENXVYGEI']);
await s.wait(1500);
await s.locateRam();
const snap = async () => Buffer.from(await s.call<string>('ramAll', 0x800), 'base64');
const NOISY = new Set([0x1b, 0x5b, 0x1c, 0x1d]); // frame counters / NMI flags

await s.call('tap', 'start', 120); await s.wait(600);
await s.call('tap', 'start', 120); await s.wait(1200);
for (const b of ['up', 'up', 'down', 'right', 'right', 'left', 'select', 'select']) {
    const before = await snap();
    await s.call('tap', b, 120);
    await s.wait(300);
    const after = await snap();
    const diffs: string[] = [];
    for (let a = 0; a < 0x800; a++) {
        if (NOISY.has(a) || a >= 0x100 && a < 0x200 /* stack/sound */ || a >= 0x200 && a < 0x300 /* OAM */) continue;
        if (before[a] !== after[a]) diffs.push(`$${a.toString(16)}:${before[a]}->${after[a]}`);
    }
    console.log(b.padEnd(7), diffs.slice(0, 14).join(' '));
}
await s.screenshot(path.join(outDir, 'ss-area.png'));
await s.close();
