/**
 * Turn recorded boss fights into postable videos.
 *
 *   node studio/render.ts super-c [--cta-top "PLAY IT IN YOUR BROWSER"] [--cta "WEPLAYRETRO.GAMES"]
 *
 * Reads studio/out/<id>/area-N.webm (+ .json from bosses.ts) and writes:
 *   area-N-vertical.mp4   1080x1920 short per boss (Reels / Shorts / X)
 *   <id>-all-bosses.mp4   1920x1080 compilation with an intro card
 */
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { outDir, cache } from './lib.ts';

const args = process.argv.slice(2);
const id = args[0] ?? 'super-c';
const flag = (name: string, fallback: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
};
const ctaTop = flag('cta-top', 'PLAY IT IN YOUR BROWSER');
const cta = flag('cta', 'WEPLAYRETRO.GAMES');
const profile = JSON.parse(readFileSync(path.join(import.meta.dirname, 'profiles', `${id}.json`), 'utf8'));
const title: string = profile.title.toUpperCase();
const dir = path.join(outDir, id);
const font = path.join(cache, 'fonts', 'PressStart2P-Regular.ttf');
if (!existsSync(font)) throw new Error(`missing ${font} (Press Start 2P, OFL) — see studio/README.md`);

const YELLOW = '0xFFD600';
const ENCODE = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart'];

/** drawtext with the pixel font; text must avoid ':' and '\'' (ffmpeg filter syntax). */
function text(t: string, opts: { size: number; y: string; x?: string; color?: string; enable?: string; box?: boolean }) {
    const parts = [
        `fontfile=${font}`, `text='${t}'`, `fontsize=${opts.size}`, `fontcolor=${opts.color ?? 'white'}`,
        `x=${opts.x ?? '(w-text_w)/2'}`, `y=${opts.y}`, 'borderw=5', 'bordercolor=black',
    ];
    if (opts.box) parts.push('box=1', 'boxcolor=black@0.65', 'boxborderw=24');
    if (opts.enable) parts.push(`enable='${opts.enable}'`);
    return `drawtext=${parts.join(':')}`;
}

function ffmpeg(argv: string[]) {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { stdio: 'inherit' });
}

const clips = readdirSync(dir)
    .map((f) => /^area-(\d+)\.webm$/.exec(f))
    .filter((m): m is RegExpExecArray => !!m && existsSync(path.join(dir, `area-${m[1]}.json`)))
    .map((m) => ({ n: Number(m[1]), file: path.join(dir, m[0]), meta: JSON.parse(readFileSync(path.join(dir, `area-${m[1]}.json`), 'utf8')) }))
    .sort((a, b) => a.n - b.n);
if (!clips.length) throw new Error(`no recorded fights in ${dir} — run studio/bosses.ts first`);
const total = profile.areas.length;

for (const clip of clips) {
    const kill = clip.meta.killedAt as number;
    // Keep shorts under a minute: if the fight ran long, keep the last 58s (the kill is at the end).
    const ss = Math.max(0, kill + 3.5 - 58);

    // --- vertical short --------------------------------------------------------------
    const vertical = [
        `[0:v]fps=60,split=2[a][b]`,
        `[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:6,eq=brightness=-0.28[bg]`,
        `[b]scale=1080:-2:flags=neighbor[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2,` + [
            text(title, { size: 92, y: '210' }),
            text(`BOSS ${clip.n} OF ${total}`, { size: 46, y: '345', color: YELLOW }),
            text('BOSS DOWN!', { size: 72, y: '(h-text_h)/2', color: YELLOW, enable: `gte(t,${(kill - ss).toFixed(2)})`, box: true }),
            text(ctaTop, { size: 34, y: '1560' }),
            text(cta, { size: 46, y: '1635', color: YELLOW }),
        ].join(',') + '[v]',
    ].join(';');
    const vOut = path.join(dir, `area-${clip.n}-vertical.mp4`);
    ffmpeg(['-ss', ss.toFixed(2), '-i', clip.file, '-filter_complex', vertical, '-map', '[v]', '-map', '0:a', ...ENCODE, vOut]);

    // --- 16:9 compilation segment ------------------------------------------------------------------------------
    const wide = [
        `[0:v]fps=60,split=2[a][b]`,
        `[a]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=24:6,eq=brightness=-0.3[bg]`,
        `[b]scale=-2:1080:flags=neighbor[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2,` + [
            text(`BOSS ${clip.n}`, { size: 40, x: '(384-text_w)/2', y: '80' }),
            text(`OF ${total}`, { size: 28, x: '(384-text_w)/2', y: '140', color: YELLOW }),
            text(cta, { size: 18, x: 'w-384+(384-text_w)/2', y: 'h-90', color: YELLOW }),
            text(`BOSS ${clip.n}`, { size: 72, y: '(h-text_h)/2', enable: 'lt(t,2.2)', box: true }),
            text('BOSS DOWN!', { size: 72, y: '(h-text_h)/2', color: YELLOW, enable: `gte(t,${kill.toFixed(2)})`, box: true }),
        ].join(',') + '[v]',
    ].join(';');
    ffmpeg(['-i', clip.file, '-filter_complex', wide, '-map', '[v]', '-map', '0:a', ...ENCODE, path.join(dir, `seg-${clip.n}.mp4`)]);
    console.log(`area ${clip.n}: ${path.basename(vOut)} + seg-${clip.n}.mp4`);
}

// --- intro card + compilation ---------------------------------------------------------------------------------------
const intro = path.join(dir, 'seg-0.mp4');
ffmpeg([
    '-f', 'lavfi', '-i', 'color=c=0x0b0b10:s=1920x1080:d=3:r=60',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-vf', [text(title, { size: 120, y: '(h/2)-150' }), text(clips.length === total ? 'ALL BOSSES' : 'BOSS FIGHTS', { size: 64, y: '(h/2)+20', color: YELLOW }), text(cta, { size: 28, y: 'h-140' })].join(','),
    '-t', '3', '-shortest', ...ENCODE, intro,
]);
const list = path.join(dir, 'concat.txt');
writeFileSync(list, [intro, ...clips.map((c) => path.join(dir, `seg-${c.n}.mp4`))].map((f) => `file '${f}'`).join('\n'));
const comp = path.join(dir, clips.length === total ? `${id}-all-bosses.mp4` : `${id}-boss-fights.mp4`);
ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', comp]);
console.log(`compilation: ${comp}`);
