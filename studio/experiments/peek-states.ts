// Print selected RAM bytes from saved states (raw fceumm states: the RAM chunk), no emulator needed.
//   node studio/experiments/peek-states.ts 0x61,0x5c,0x65 file1.state file2.state ...
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [addrs, ...files] = process.argv.slice(2);
const list = addrs.split(',').map((a) => parseInt(a, 16));
for (const f of files) {
    const st = readFileSync(f);
    const i = st.indexOf(Buffer.from([0x52, 0x41, 0x4d, 0x00]));
    const ram = st.subarray(i + 8, i + 8 + 0x800);
    console.log(path.basename(f).padEnd(28), list.map((a) => `$${a.toString(16)}=${ram[a].toString(16).padStart(2, '0')}`).join(' '));
}
