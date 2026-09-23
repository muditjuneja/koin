/**
 * Netplay co-op, end to end: the real <GamePlayer coop> host running the real
 * RetroArch fceumm core, real guests in separate browser contexts, and the
 * real signaling worker. Input is verified from what the emulated game reads
 * (the input-test ROM draws each controller's bits), both on the host's
 * canvas and in the video the guest receives.
 */

import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { guestAudioLevel, IDLE, readGrid, row, startGuest, startHost, waitFor, waitForGrid } from './helpers';

const baseUrl = inject('baseUrl');
const signalUrl = inject('signalUrl');

let browser: Browser;

beforeAll(async () => {
    browser = await chromium.launch({
        args: ['--autoplay-policy=no-user-gesture-required'],
    });
});

afterAll(async () => {
    await browser?.close();
});

describe('netplay co-op', () => {
    it('a guest sees the game and drives player 2', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room);

        expect(await guest.page.evaluate(() => (window as any).__guest.state.slot)).toBe(2);

        await guest.page.keyboard.down('KeyX'); // A
        await guest.page.keyboard.down('ArrowRight');
        // What the emulated game read, on the host...
        await waitForGrid(host.page, host.canvas, [IDLE, row('a', 'right'), IDLE, IDLE]);
        // ...and the same frame arriving back in the guest's own video.
        await waitForGrid(guest.page, guest.video, [IDLE, row('a', 'right'), IDLE, IDLE]);

        await guest.page.keyboard.up('KeyX');
        await guest.page.keyboard.up('ArrowRight');
        await waitForGrid(host.page, host.canvas, [IDLE, IDLE, IDLE, IDLE]);

        await host.page.context().close();
        await guest.page.context().close();
    });

    it('three guests drive players 2, 3 and 4 independently (NES Four Score)', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guests = [];
        for (let i = 0; i < 3; i++) guests.push(await startGuest(browser, baseUrl, signalUrl, host.room));
        const slots = await Promise.all(guests.map((g) => g.page.evaluate(() => (window as any).__guest.state.slot)));
        expect(slots).toEqual([2, 3, 4]);

        await guests[0].page.keyboard.down('KeyZ'); // B
        await guests[1].page.keyboard.down('Enter'); // Start
        await guests[2].page.keyboard.down('ArrowUp');
        await waitForGrid(host.page, host.canvas, [IDLE, row('b'), row('start'), row('up')]);

        await guests[1].page.keyboard.up('Enter');
        await waitForGrid(host.page, host.canvas, [IDLE, row('b'), IDLE, row('up')]);

        // A fourth player has nowhere to go.
        const extra = await browser.newContext();
        const extraPage = await extra.newPage();
        await extraPage.goto(`${baseUrl}/guest.html?${new URLSearchParams({ signal: signalUrl, room: host.room })}`);
        await waitFor(extraPage, () => (window as any).__guest?.state.status === 'rejected', 'fifth player rejected');
        expect(await extraPage.evaluate(() => (window as any).__guest.state.rejectReason)).toBe('room-full');

        await extra.close();
        for (const g of guests) await g.page.context().close();
        await host.page.context().close();
    });

    it('a spectator watches but cannot play', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const spectator = await startGuest(browser, baseUrl, signalUrl, host.room, { role: 'spectator' });
        expect(await spectator.page.evaluate(() => (window as any).__guest.state.role)).toBe('spectator');

        await spectator.page.keyboard.down('KeyX');
        await spectator.page.waitForTimeout(500);
        expect(await readGrid(host.page, host.canvas)).toEqual([IDLE, IDLE, IDLE, IDLE]);
        // ...and a player can still take slot 2.
        const player = await startGuest(browser, baseUrl, signalUrl, host.room);
        expect(await player.page.evaluate(() => (window as any).__guest.state.slot)).toBe(2);

        await spectator.page.context().close();
        await player.page.context().close();
        await host.page.context().close();
    });

    it('the guest hears the game', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room);
        // The ROM plays a steady square wave; the audio track is swapped in
        // when the host's audio appears, without renegotiating.
        await waitFor(guest.page, () => ((window as any).__guest.state.mediaStream as MediaStream | null)?.getAudioTracks().length === 1, 'audio track');
        let level = 0;
        for (let i = 0; i < 20 && level < 0.02; i++) level = await guestAudioLevel(guest.page);
        expect(level).toBeGreaterThan(0.02);

        await guest.page.context().close();
        await host.page.context().close();
    });

    it("releases a vanished guest's buttons within about a second", async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room);
        await guest.page.keyboard.down('ArrowLeft');
        await waitForGrid(host.page, host.canvas, [IDLE, row('left'), IDLE, IDLE]);

        const closedAt = Date.now();
        await guest.page.context().close(); // no goodbye, mid-press
        await waitForGrid(host.page, host.canvas, [IDLE, IDLE, IDLE, IDLE], 3000);
        expect(Date.now() - closedAt).toBeLessThan(2500);

        await host.page.context().close();
    });

    it('a guest that reloads its page gets its slot back', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const first = await startGuest(browser, baseUrl, signalUrl, host.room);
        const second = await startGuest(browser, baseUrl, signalUrl, host.room);
        expect(await first.page.evaluate(() => (window as any).__guest.state.slot)).toBe(2);
        expect(await second.page.evaluate(() => (window as any).__guest.state.slot)).toBe(3);

        // Reload well inside the reconnect window — before the host has even
        // noticed the old connection dropping.
        await first.page.reload();
        await waitFor(first.page, () => (window as any).__guest?.state.status === 'connected', 'reconnected');
        expect(await first.page.evaluate(() => (window as any).__guest.state.slot)).toBe(2);

        await first.page.keyboard.down('KeyX');
        await waitForGrid(host.page, host.canvas, [IDLE, row('a'), IDLE, IDLE]);
        await first.page.keyboard.up('KeyX');

        await first.page.context().close();
        await second.page.context().close();
        await host.page.context().close();
    });

    it('a kicked guest is removed and stays out', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room);
        await guest.page.keyboard.down('KeyX');
        await waitForGrid(host.page, host.canvas, [IDLE, row('a'), IDLE, IDLE]);

        await host.page.evaluate(() => (window as any).__host.kick(2));
        await waitFor(guest.page, () => (window as any).__guest.state.status === 'kicked', 'guest sees kick');
        await waitForGrid(host.page, host.canvas, [IDLE, IDLE, IDLE, IDLE], 3000);

        await guest.page.reload();
        await waitFor(guest.page, () => ['kicked', 'rejected'].includes((window as any).__guest?.state.status), 'kicked guest refused on rejoin');

        await guest.page.context().close();
        await host.page.context().close();
    });

    it('caps the streamed resolution however large the host window is', async () => {
        const host = await startHost(browser, baseUrl, signalUrl, {}, { width: 1920, height: 1200 });
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room);
        const canvasHeight = await host.page.evaluate(() => (document.querySelector('#canvas') as HTMLCanvasElement).height);
        expect(canvasHeight).toBeGreaterThan(480);

        const sentHeight = await waitFor(host.page, async () => {
            const session = (window as any).__host;
            for (const entry of session.peers.values()) {
                const stats: RTCStatsReport = await entry.pc.pc.getStats();
                for (const report of stats.values()) {
                    if (report.type === 'outbound-rtp' && report.kind === 'video' && report.frameHeight) return report.frameHeight as number;
                }
            }
            return 0;
        }, 'outbound video stats');
        expect(sentHeight).toBeLessThanOrEqual(480);
        expect(await guest.page.evaluate(() => (document.querySelector('[data-testid="coop-guest-video"]') as HTMLVideoElement).videoHeight)).toBeLessThanOrEqual(480);

        await guest.page.context().close();
        await host.page.context().close();
    });
});

// The worker runs with JOIN_TOKEN_SECRET set and the test server plays the
// site's backend minting tokens — the setup for a service with accounts.
// Every scenario above already went through that path.
describe('access control (join tokens)', () => {
    async function openGuest(room: string, query: Record<string, string>) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(`${baseUrl}/guest.html?${new URLSearchParams({ signal: signalUrl, room, ...query })}`);
        return page;
    }

    it('refuses guests without a valid token for this room', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        for (const query of [{ token: 'none' }, { tokenForged: '1' }, { tokenExpired: '1' }, { tokenRoom: 'ZZZZZZ' }]) {
            const page = await openGuest(host.room, query);
            await waitFor(page, () => (window as any).__guest?.state.status === 'rejected', `rejected with ${JSON.stringify(query)}`);
            expect(await page.evaluate(() => (window as any).__guest.state.rejectReason)).toBe('unauthorized');
            await page.context().close();
        }
        expect(await host.page.evaluate(() => (window as any).__host.state.peers.length)).toBe(0);
        await host.page.context().close();
    });

    it("a guest's token can't take the host seat, and TURN credentials need a token", async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const page = await (await browser.newContext()).newPage();
        await page.goto(`${baseUrl}/guest.html?${new URLSearchParams({ signal: signalUrl, room: 'AAAAAA', token: 'none' })}`);
        const probe = await page.evaluate(async ({ signalUrl, room }) => {
            const guestToken = await (await fetch(`/token?room=${room}&peer=guest`)).text();
            const url = new URL('/ws', signalUrl.replace(/^http/, 'ws'));
            url.search = new URLSearchParams({ room, peerId: 'host', secret: 'x'.repeat(24), token: guestToken }).toString();
            const closeCode = await new Promise<number>((resolve) => {
                const ws = new WebSocket(url);
                ws.onclose = (e) => resolve(e.code);
            });
            const turnStatus = (await fetch(`${signalUrl}/turn-credentials`)).status;
            return { closeCode, turnStatus };
        }, { signalUrl, room: host.room });
        expect(probe.closeCode).toBe(4401);
        expect(probe.turnStatus).toBe(401);
        // The real host is unaffected.
        expect(await host.page.evaluate(() => (window as any).__host.state.status)).toBe('hosting');

        // Nor can a host page holding only a guest token open a room.
        const impostor = await (await browser.newContext()).newPage();
        await impostor.goto(`${baseUrl}/host.html?${new URLSearchParams({ signal: signalUrl, tokenPeer: 'guest' })}`);
        await waitFor(impostor, () => (window as any).__host?.state.status === 'error', 'impostor host refused');

        await impostor.context().close();
        await page.context().close();
        await host.page.context().close();
    });

    it('the host sees the verified name and user, and a spectator-only token cannot play', async () => {
        const host = await startHost(browser, baseUrl, signalUrl);
        const guest = await startGuest(browser, baseUrl, signalUrl, host.room, {
            name: 'Mallory', // what the guest claims
            tokenName: 'Ada', tokenSub: 'user-7', tokenRole: 'spectator', // what the backend vouched for
        });
        expect(await guest.page.evaluate(() => (window as any).__guest.state.role)).toBe('spectator');
        const peer = await host.page.evaluate(() => (window as any).__host.state.peers[0]);
        expect(peer).toMatchObject({ name: 'Ada', userId: 'user-7', role: 'spectator' });

        await guest.page.keyboard.down('KeyX');
        await guest.page.waitForTimeout(500);
        expect(await readGrid(host.page, host.canvas)).toEqual([IDLE, IDLE, IDLE, IDLE]);

        await guest.page.context().close();
        await host.page.context().close();
    });
});

