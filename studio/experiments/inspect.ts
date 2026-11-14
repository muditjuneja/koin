import { launch, ensureRom } from '../lib.ts';
import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
const dir = process.argv[2];
const romName = await ensureRom('Super-C-USA.zip', { ext: /\.nes$/i });
const s = await launch({ core: 'fceumm', romName });
await s.wait(1500);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.state')).sort()) {
  await s.call('loadState', readFileSync(path.join(dir, f)).toString('base64'));
  await s.wait(350);
  await s.page.screenshot({ path: path.join(dir, f.replace('.state', '.png')) });
}
await s.close();
