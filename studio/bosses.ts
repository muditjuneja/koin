/**
 * All-bosses run, driven entirely by a game profile (studio/profiles/*.json).
 *
 *   node studio/bosses.ts super-c [areas...]
 *
 * Per area:
 *   1. scout — boot with the profile's cheats (+ start-at-area code), then
 *      fast-forward with an autopilot that pushes forward and switches
 *      behaviour when progress stalls, until the boss screen comes up
 *      (profile `ram.bossArena`). Keep the state from a few seconds earlier.
 *   2. fight — from that state, run several 1x attempts in parallel, each
 *      with a different fight behaviour, recording until the boss-defeated
 *      flag. Keep the quickest kill.
 *
 * Fights are decided at 1x on purpose: at fast-forward inputs only change once
 * per animation tick (several game frames), so fire rate and timing differ and
 * a fast-forward winner doesn't predict a 1x winner.
 *
 * Output: studio/out/<id>/area-N.webm (+ .json with timings).
 */
import path from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { launch, ensureRom, outDir, type Session } from './lib.ts';

type View = 'side' | 'overhead';

/**
 * A test on one RAM byte. `mask` is applied first; then `changed` (differs
 * from the value when the area started), `eq` or `ne`; with only a mask, any
 * set bit passes.
 */
interface Cond { addr: string; mask?: number; eq?: number; ne?: number; changed?: boolean }

/** One step of getting from power-on to a level: press a button, or set the stage-select byte. */
type StartStep = { tap: string; waitMs: number } | { select: string; waitMs?: number };

interface Profile {
    id: string;
    title: string;
    core: string;
    rom: { store: string; match: string };
    ram: {
        frameCounter: string;
        /** Wait for this before treating the level as started (else just wait a few seconds). */
        gameMode?: { addr: string; playing: number };
        /** Checked against the area number after the start-area cheat. */
        level?: string;
        progress: string[];
    };
    boss: {
        /** Boss screen is up. */
        arena: Cond;
        /** Boss beaten. `afterArena`: only counts once the arena has been seen (e.g. boss HP back to 0). */
        defeated: Cond & { afterArena?: boolean };
    };
    cheats?: { always?: string[]; startArea?: Record<string, string> };
    /** RAM bytes held at a value every frame (infinite health etc.), as {"0xADDR": value}. */
    freeze?: Record<string, number>;
    fastForwardRatio?: number;
    controls: { fire: string; jump?: string };
    start: StartStep[];
    areas: { n: number; view: View; select?: number; name?: string }[];
}

const hex = (s: string) => parseInt(s, 16);
const id = process.argv[2] ?? 'super-c';
const profile: Profile = JSON.parse(readFileSync(path.join(import.meta.dirname, 'profiles', `${id}.json`), 'utf8'));
const only = process.argv.slice(3).map(Number);
const areas = profile.areas.filter((a) => !only.length || only.includes(a.n));
const dir = path.join(outDir, profile.id);
mkdirSync(dir, { recursive: true });
const debug = !!process.env.STUDIO_DEBUG;

const FRAME = hex(profile.ram.frameCounter);
const PROGRESS = profile.ram.progress.map(hex);
const { fire, jump } = profile.controls;
const ALWAYS_CHEATS = profile.cheats?.always ?? [];

type Rule = { buttons: string[]; period: number; on: number; phase?: number; jitter?: number; ticks?: boolean };
/** A named autopilot behaviour, run for `frames` game frames before the next one is tried. */
interface Behaviour { name: string; rules: Rule[]; frames: number }

const FIRE: Rule = { buttons: [fire], period: 2, on: 1, ticks: true }; // rapid fire, one toggle per tick
const hold = (...buttons: string[]): Rule => ({ buttons, period: 1, on: 1 });
const hop: Rule[] = jump ? [{ buttons: [jump], period: 70, on: 14, jitter: 40 }] : [];
const SEC = 60;

/** Getting through a level: tried in order while progress is stalled; progress resets to the first. */
const PUSH: Record<View, Behaviour[]> = {
    side: [
        { name: 'push-right', rules: [hold('right'), FIRE, ...hop], frames: 6 * SEC },
        { name: 'push-up-right', rules: [hold('up', 'right'), FIRE, ...hop], frames: 6 * SEC },
        { name: 'stand-fire-up', rules: [hold('up'), FIRE], frames: 8 * SEC }, // clears blockers above
        { name: 'push-left', rules: [hold('left'), FIRE, ...hop], frames: 4 * SEC },
        { name: 'push-down-right', rules: [hold('down', 'right'), FIRE, ...hop], frames: 6 * SEC },
        // vertical (climbing) levels: jump up through platforms, drifting sideways to find the next one
        ...(jump ? [
            { name: 'climb', rules: [hold('up'), FIRE, { buttons: [jump], period: 50, on: 16 }, { buttons: ['left'], period: 240, on: 60 }, { buttons: ['right'], period: 240, on: 60, phase: 120 }], frames: 12 * SEC },
            { name: 'climb-wide', rules: [hold('up'), FIRE, { buttons: [jump], period: 60, on: 18, jitter: 20 }, { buttons: ['left'], period: 400, on: 140, jitter: 100 }, { buttons: ['right'], period: 400, on: 140, phase: 200, jitter: 100 }], frames: 15 * SEC },
        ] : []),
    ],
    // Top-down stages are small mazes: walls need a sideways detour before pushing up again.
    overhead: [
        { name: 'push-up', rules: [hold('up'), FIRE], frames: 6 * SEC },
        { name: 'detour-right', rules: [FIRE, { buttons: ['right'], period: 270, on: 90 }, { buttons: ['up'], period: 270, on: 180, phase: 180 }], frames: 9 * SEC },
        { name: 'detour-left', rules: [FIRE, { buttons: ['left'], period: 270, on: 90 }, { buttons: ['up'], period: 270, on: 180, phase: 180 }], frames: 9 * SEC },
        { name: 'detour-right-wide', rules: [FIRE, { buttons: ['right'], period: 360, on: 180 }, { buttons: ['up'], period: 360, on: 180, phase: 180 }], frames: 12 * SEC },
        { name: 'detour-left-wide', rules: [FIRE, { buttons: ['left'], period: 360, on: 180 }, { buttons: ['up'], period: 360, on: 180, phase: 180 }], frames: 12 * SEC },
        { name: 'back-out-right', rules: [FIRE, { buttons: ['down'], period: 300, on: 60 }, { buttons: ['right'], period: 300, on: 120, phase: 240 }, { buttons: ['up'], period: 300, on: 120, phase: 120 }], frames: 10 * SEC },
        { name: 'back-out-left', rules: [FIRE, { buttons: ['down'], period: 300, on: 60 }, { buttons: ['left'], period: 300, on: 120, phase: 240 }, { buttons: ['up'], period: 300, on: 120, phase: 120 }], frames: 10 * SEC },
        // Random walks with an upward bias: co-prime periods + re-rolled phases, so the
        // mix of directions keeps changing and eventually finds the way around.
        { name: 'wander', rules: [FIRE, { buttons: ['up'], period: 97, on: 60, jitter: 97 }, { buttons: ['left'], period: 173, on: 55, jitter: 173 }, { buttons: ['right'], period: 151, on: 55, phase: 70, jitter: 151 }, { buttons: ['down'], period: 211, on: 30, jitter: 211 }], frames: 25 * SEC },
        { name: 'wander-wide', rules: [FIRE, { buttons: ['up'], period: 131, on: 70, jitter: 131 }, { buttons: ['left'], period: 263, on: 110, jitter: 263 }, { buttons: ['right'], period: 241, on: 110, phase: 120, jitter: 241 }, { buttons: ['down'], period: 307, on: 50, jitter: 307 }], frames: 25 * SEC },
    ],
};

/** Boss fights: one parallel 1x attempt per behaviour; each falls back to the others in turn. */
const FIGHT: Record<View, Behaviour[]> = {
    side: [
        { name: 'fight-up', rules: [hold('up'), FIRE], frames: 50 * SEC },
        // aim sweep, 12s cycle: up, up-right, right, left, up-left, up — covers bosses on
        // either side, at ground level (robot spider) or up high (the wall's core)
        { name: 'fight-sweep', rules: [
            FIRE,
            { buttons: ['up'], period: 720, on: 240 },
            { buttons: ['up'], period: 720, on: 240, phase: 240 },
            { buttons: ['right'], period: 720, on: 240, phase: 600 },
            { buttons: ['left'], period: 720, on: 240, phase: 360 },
            ...hop,
        ], frames: 50 * SEC },
        // diagonals both ways: targets above and to the side
        { name: 'fight-diagonals', rules: [FIRE, hold('up'), { buttons: ['left'], period: 360, on: 180 }, { buttons: ['right'], period: 360, on: 180, phase: 180 }], frames: 40 * SEC },
    ],
    // Top-down: holding up walks you past a boss at the top of the screen, so
    // fights step back down, tap up to face it, then stand and fire.
    overhead: [
        { name: 'fight-face-up', rules: [FIRE, { buttons: ['down'], period: 240, on: 14 }, { buttons: ['up'], period: 240, on: 4, phase: 226 }], frames: 50 * SEC },
        { name: 'fight-sweep-below', rules: [
            FIRE,
            { buttons: ['down'], period: 480, on: 10 },
            { buttons: ['left'], period: 480, on: 40, phase: 470 },
            { buttons: ['up'], period: 480, on: 4, phase: 430 },
            { buttons: ['right'], period: 480, on: 80, phase: 240 },
            { buttons: ['up'], period: 480, on: 4, phase: 160 },
        ], frames: 50 * SEC },
        { name: 'fight-diagonals', rules: [FIRE, { buttons: ['down'], period: 300, on: 12 }, { buttons: ['up', 'left'], period: 300, on: 4, phase: 288 }, { buttons: ['up', 'right'], period: 300, on: 4, phase: 138 }], frames: 40 * SEC },
    ],
};

const readProgress = async (s: Session) => (await Promise.all(PROGRESS.map((a) => s.call<number[]>('ram', a)))).map((r) => r[0]).join(',');
const readByte = async (s: Session, addr: string) => (await s.call<number[]>('ram', hex(addr)))[0];

/** Values of the arena byte when the area starts, for `changed` conditions. */
type Base = number;
function test(c: Cond, value: number, base: Base): boolean {
    const v = c.mask !== undefined ? value & c.mask : value;
    if (c.changed) return v !== (c.mask !== undefined ? base & c.mask : base);
    if (c.eq !== undefined) return v === c.eq;
    if (c.ne !== undefined) return v !== c.ne;
    return v !== 0;
}
const inArena = async (s: Session, base: Base) => test(profile.boss.arena, await readByte(s, profile.boss.arena.addr), base);
/** `seenArena` gates conditions like "boss HP is 0", which is also true before the fight starts. */
const bossDown = async (s: Session, base: Base, seenArena: boolean) =>
    (!profile.boss.defeated.afterArena || seenArena) && test(profile.boss.defeated, await readByte(s, profile.boss.defeated.addr), base);

async function applyFreezes(s: Session) {
    for (const [addr, value] of Object.entries(profile.freeze ?? {})) await s.call('freeze', hex(addr), value);
}

async function newSession(): Promise<Session> {
    const romName = await ensureRom(profile.rom.store, { ext: new RegExp(profile.rom.match, 'i') });
    // Capped fast-forward: at "unlimited" (~40x) dozens of frames pass per bot
    // tick and short taps blur into long holds. 8x keeps inputs precise.
    // 512x480 = 2x NES: crisp after a nearest-neighbour upscale in render.ts, and
    // much cheaper to encode than 3x when several attempts record in parallel.
    return launch({ core: profile.core, romName, width: 512, height: 480, retroarchConfig: { fastforward_ratio: profile.fastForwardRatio ?? 8 } });
}

/** Fresh game at the start of `area`, with cheats and freezes on and RAM located. */
async function bootArea(area: { n: number; select?: number }): Promise<Session> {
    const s = await newSession();
    await s.wait(1000);
    const areaCode = profile.cheats?.startArea?.[String(area.n)];
    const codes = [...ALWAYS_CHEATS, ...(areaCode ? [areaCode] : [])];
    if (codes.length) await s.call('cheats', codes);
    await s.wait(1500);
    let located = false;
    for (const step of profile.start) {
        if ('select' in step) {
            // stage-select screen: point the cursor at this area's stage
            if (!located) { await s.locateRam(); located = true; }
            if (area.select === undefined) throw new Error(`area ${area.n}: profile has a select step but no areas[].select`);
            await s.call('poke', hex(step.select), area.select);
            await s.wait(step.waitMs ?? 200);
        } else {
            await s.call('tap', step.tap, 120);
            await s.wait(step.waitMs);
        }
    }
    if (!located) await s.locateRam();
    if (profile.ram.gameMode) await s.waitRam(hex(profile.ram.gameMode.addr), (v) => v === profile.ram.gameMode!.playing, 20_000);
    if (profile.ram.level && areaCode) {
        const level = await readByte(s, profile.ram.level);
        if (level !== area.n - 1) throw new Error(`area ${area.n}: game started on level index ${level} (start-area code wrong?)`);
    }
    await applyFreezes(s);
    return s;
}

/** Session resumed from a saved state (cheats live in the core, not the state, so re-apply them). */
async function bootState(state: string): Promise<Session> {
    const s = await newSession();
    await s.wait(1000);
    if (ALWAYS_CHEATS.length) await s.call('cheats', ALWAYS_CHEATS);
    await s.call('loadState', state);
    await s.wait(300);
    await s.locateRam();
    await applyFreezes(s);
    return s;
}

const LEAD_IN = 3 * SEC;
/**
 * Fight mode starts when the arena byte says "boss" AND the screen has stopped
 * scrolling this long (Super C's scroll-type byte also flips for vertical
 * sections, which keep scrolling), or after a stall longer than a full cycle
 * of push behaviours. It ends when scrolling resumes without the arena signal
 * (a mid-boss died) — so the bot carries on to the real boss.
 */
const ARENA_STALL = 4 * SEC;
const stallLimit = (list: Behaviour[]) => Math.max(90 * SEC, 1.3 * list.reduce((t, b) => t + b.frames, 0));

type Snap = { frame: number; state: string };

/** Push/fight state machine shared by the fast-forward scout and the 1x attempts. */
class Driver {
    mode: 'push' | 'fight' = 'push';
    behaviour: Behaviour;
    private index = 0;
    private since = 0;
    private progress = '';
    lastProgress = 0;
    private fights: Behaviour[];
    private s: Session;
    private view: View;
    private arenaBase: Base;
    constructor(s: Session, view: View, arenaBase: Base, opts: { approach?: Behaviour; fightOrder?: Behaviour[] } = {}) {
        this.s = s;
        this.view = view;
        this.arenaBase = arenaBase;
        this.fights = opts.fightOrder ?? FIGHT[view];
        this.behaviour = opts.approach ?? PUSH[view][0];
    }
    private get list() { return this.mode === 'push' ? PUSH[this.view] : this.fights; }
    private async use(b: Behaviour, f: number) {
        this.behaviour = b;
        this.since = f;
        await this.s.call('autopilot', { frameAddr: FRAME, rules: b.rules });
    }
    async start() {
        const f = await this.s.call<number>('frames');
        this.progress = await readProgress(this.s);
        this.lastProgress = f;
        await this.use(this.behaviour, f);
    }
    /** One control tick. Returns 'fight' on the tick fight mode begins. */
    async tick(f: number): Promise<'fight' | null> {
        const now = await readProgress(this.s);
        const moved = now !== this.progress;
        if (moved) { this.progress = now; this.lastProgress = f; }
        const arena = await inArena(this.s, this.arenaBase);
        const stalled = f - this.lastProgress;
        if (this.mode === 'push') {
            if ((arena && stalled > ARENA_STALL) || stalled > stallLimit(PUSH[this.view])) {
                this.mode = 'fight';
                this.index = 0;
                await this.use(this.fights[0], f);
                return 'fight';
            }
            if (moved && this.behaviour !== PUSH[this.view][0] && PUSH[this.view].includes(this.behaviour)) {
                this.index = 0;
                await this.use(PUSH[this.view][0], f);
            } else if (f - this.since > this.behaviour.frames) {
                this.index = (this.index + 1) % this.list.length;
                await this.use(this.list[this.index], f);
            }
        } else {
            if (moved && !arena) { // screen scrolls again: that was a mid-boss, carry on
                this.mode = 'push';
                this.index = 0;
                await this.use(PUSH[this.view][0], f);
            } else if (f - this.since > this.behaviour.frames) {
                this.index = (this.index + 1) % this.list.length;
                await this.use(this.list[this.index], f);
            }
        }
        return null;
    }
}

interface Scouted {
    /** State LEAD_IN before the last fight that ended in the level's boss kill. */
    entrance: string;
    /** Arena byte's normal value in this area. */
    arenaBase: Base;
    /** Push behaviour in use when that fight began — replayed at 1x to walk back in. */
    approach: Behaviour;
}

/** Fast-forward until the level's boss is defeated; remember where its fight began. */
async function scout(s: Session, area: { n: number; view: View }): Promise<Scouted> {
    const arenaBase = await readByte(s, profile.boss.arena.addr);
    const driver = new Driver(s, area.view, arenaBase);
    await driver.start();
    await s.call('fastForward', true);
    const ring: Snap[] = [];
    const leadBefore = (frame: number) => [...ring].reverse().find((r) => r.frame <= frame - LEAD_IN) ?? ring[0];
    let lastFight: { entrance: Snap; approach: Behaviour } | null = null;
    let pushing = driver.behaviour;
    let seenArena = false;
    const t0 = Date.now();
    let lastLog = 0;
    for (;;) {
        if (Date.now() - t0 > Number(process.env.STUDIO_SCOUT_MS ?? 300_000)) throw new Error(`area ${area.n}: boss not beaten in time${lastFight ? ' (fights started but none finished)' : ''}`);
        await s.wait(100);
        const f = await s.call<number>('frames');
        if (!ring.length || f - ring[ring.length - 1].frame >= SEC) {
            ring.push({ frame: f, state: await s.call<string>('saveState') });
            if (ring.length > 15) ring.shift();
        }
        seenArena ||= await inArena(s, arenaBase);
        if (await bossDown(s, arenaBase, seenArena)) break;
        if (driver.mode === 'push') pushing = driver.behaviour;
        if ((await driver.tick(f)) === 'fight') {
            // the fight began where scrolling stopped: lead in from just before that
            lastFight = { entrance: leadBefore(driver.lastProgress), approach: pushing };
            if (debug) console.log(`    fight mode at frame ${f}`);
        }
        if (debug && Date.now() - lastLog > 5000) {
            lastLog = Date.now();
            console.log(`    t=${((Date.now() - t0) / 1000).toFixed(0)}s frames=${f} mode=${driver.mode} behaviour=${driver.behaviour.name}`);
        }
    }
    await s.call('fastForward', false);
    await s.call('stopAutopilot');
    if (!lastFight) throw new Error(`area ${area.n}: boss beaten without a recognisable fight`);
    console.log(`  scout: boss beaten after ${((Date.now() - t0) / 1000).toFixed(0)}s wall (approach "${lastFight.approach.name}")`);
    return { entrance: lastFight.entrance.state, arenaBase, approach: lastFight.approach };
}

interface Attempt { file: string; arenaAt: number; killedAt: number; behaviour: string }

/** One 1x attempt from the entrance with a given fight order; records until the boss-defeated flag. */
async function attempt(area: { n: number; view: View }, scouted: Scouted, order: Behaviour[], tag: string): Promise<Attempt | null> {
    const s = await bootState(scouted.entrance);
    try {
        const driver = new Driver(s, area.view, scouted.arenaBase, { approach: scouted.approach, fightOrder: order });
        await driver.start();
        const file = path.join(dir, `area-${area.n}.${tag}.webm`);
        const rec = await s.record(file);
        const t0 = Date.now();
        const startFrames = await s.call<number>('frames');
        let arenaAt: number | null = null;
        let seenArena = false;
        while (Date.now() - t0 < Number(process.env.STUDIO_FIGHT_MS ?? 120_000)) {
            await s.wait(100);
            seenArena ||= await inArena(s, scouted.arenaBase);
            if (await bossDown(s, scouted.arenaBase, seenArena)) {
                const killedAt = (Date.now() - t0) / 1000;
                const speed = ((await s.call<number>('frames')) - startFrames) / SEC / killedAt;
                if (debug || speed < 0.9) console.log(`    ${tag}: game ran at ${(speed * 100).toFixed(0)}% speed while recording`);
                await s.wait(3500); // let the explosion play out
                await rec.stop();
                return { file, arenaAt: arenaAt ?? 0, killedAt, behaviour: driver.behaviour.name };
            }
            if ((await driver.tick(await s.call<number>('frames'))) === 'fight') arenaAt = (Date.now() - t0) / 1000;
        }
        await rec.stop();
        if (debug) renameSync(file, file.replace('.webm', '.fail.webm')); // keep for inspection
        else rmSync(file, { force: true });
        return null;
    } finally {
        await s.close();
    }
}

/** Parallel 1x attempts, one per fight behaviour; keep the quickest kill. */
async function fight(area: { n: number; view: View }, scouted: Scouted): Promise<void> {
    const fights = FIGHT[area.view];
    const results = await Promise.all(fights.map((_, i) => {
        const order = [...fights.slice(i), ...fights.slice(0, i)];
        return attempt(area, scouted, order, fights[i].name).catch((err) => { console.error(`  ${fights[i].name}: ${err.message}`); return null; });
    }));
    const wins = results.filter((r): r is Attempt => !!r).sort((a, b) => (a.killedAt - a.arenaAt) - (b.killedAt - b.arenaAt));
    for (const r of results) console.log(r ? `  ${path.basename(r.file)}: boss down ${(r.killedAt - r.arenaAt).toFixed(1)}s after the boss screen ("${r.behaviour}")` : '  attempt: no kill');
    if (!wins.length) throw new Error(`area ${area.n}: no attempt killed the boss`);
    const best = wins[0];
    const file = path.join(dir, `area-${area.n}.webm`);
    renameSync(best.file, file);
    for (const w of wins.slice(1)) rmSync(w.file, { force: true });
    writeFileSync(path.join(dir, `area-${area.n}.json`), JSON.stringify({ area: area.n, view: area.view, arenaAt: best.arenaAt, killedAt: best.killedAt, behaviour: best.behaviour }, null, 2));
    console.log(`  area ${area.n}: kept "${best.behaviour}" → ${path.basename(file)}`);
}

for (const area of areas) {
    console.log(`${profile.title} — area ${area.n} (${area.view})`);
    let scouted: Scouted;
    const s = await bootArea(area);
    try {
        scouted = await scout(s, area);
        writeFileSync(path.join(dir, `area-${area.n}-boss.state`), Buffer.from(scouted.entrance, 'base64'));
    } catch (err) {
        console.error(`  ${(err as Error).message}`);
        await s.call('fastForward', false).catch(() => {}); // frames aren't drawn during fast-forward
        await s.wait(500);
        await s.page.screenshot({ path: path.join(dir, `area-${area.n}-error.png`) }).catch(() => {});
        continue;
    } finally {
        await s.close();
    }
    await fight(area, scouted).catch((err) => console.error(`  ${err.message}`));
}
