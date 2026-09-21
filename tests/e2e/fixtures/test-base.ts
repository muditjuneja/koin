import { test as base, expect, type Page } from '@playwright/test';

type SaveSlot = { slot: number; timestamp: string; size: number; screenshot?: string | null };
type Counters = Record<string, number>;

const consoleErrorsByPage = new WeakMap<Page, string[]>();

type Options = { fakeGamepadId: string | null };

export const test = base.extend<Options & { gamePage: Page }>({
    // Option fixture (set via test.use({ fakeGamepadId: '...' })) — must be
    // installed with page.addInitScript() BEFORE the gamePage fixture
    // navigates, so it has to live upstream of it, not be poked at from
    // inside a test body (by then the page has already loaded).
    fakeGamepadId: [null, { option: true }],

    gamePage: async ({ page, baseURL, fakeGamepadId }, use) => {
        if (fakeGamepadId) {
            await page.addInitScript((id) => {
                const fakeGamepad = {
                    index: 0,
                    id,
                    connected: true,
                    mapping: 'standard',
                    buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
                    axes: [0, 0, 0, 0],
                    timestamp: performance.now(),
                };
                // @ts-ignore - overriding the real Gamepad API for the test
                navigator.getGamepads = () => [fakeGamepad];
            }, fakeGamepadId);
        }

        // The harness runs the REAL GamePlayer component, which fires a
        // fire-and-forget telemetry beacon to the project's real production
        // endpoint (src/lib/telemetry.ts) — twice per mount, once per
        // React StrictMode's intentional double-invoke of mount effects
        // (see the E2E README: this also means it double-fires in real
        // production usage, since web-component.tsx always wraps in
        // StrictMode — a separate, pre-existing issue outside this PR's
        // scope). Block everything except our own local harness server so
        // these tests never depend on, or pollute, the outside world.
        const local = new URL(baseURL!);
        await page.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.hostname === local.hostname && url.port === local.port) {
                route.continue();
            } else {
                route.abort();
            }
        });

        const errors: string[] = [];
        consoleErrorsByPage.set(page, errors);
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

        await page.goto('/index.html');
        await page.waitForSelector('text=PLAY');
        await use(page);
    },
});

/**
 * Console/page errors seen so far, minus the two expected aborted-telemetry
 * failures (see the `gamePage` fixture above). Assert this is empty at the
 * end of a test to catch anything genuinely unexpected.
 */
export function getUnexpectedConsoleErrors(page: Page): string[] {
    const errors = consoleErrorsByPage.get(page) ?? [];
    return errors.filter((e) => !e.includes('net::ERR_FAILED'));
}

export { expect };

export async function getCounters(page: Page): Promise<Counters> {
    return page.evaluate(() => window.__e2e.counters);
}

export async function getSaveSlots(page: Page): Promise<SaveSlot[]> {
    return page.evaluate(() => window.__e2e.saveSlots);
}

/** Clicks the "Press PLAY" overlay and waits for the control bar to appear. */
export async function startEmulator(page: Page) {
    await page.getByText('PLAY', { exact: true }).click();
    await controlButton(page, 'Save').waitFor();
}

/**
 * PlayerControls renders BOTH a desktop bar and a mobile drawer copy of
 * every control button at all times — CSS (`sm:hidden` / `hidden sm:flex`)
 * decides which one is visible at the current viewport, not React. So a
 * plain `button[title="Save"]` always matches two elements. Every helper
 * here scopes to `:visible` for exactly that reason — don't drop it when
 * adding new selectors.
 */
export function controlButton(page: Page, title: string) {
    return page.locator(`button[title="${title}"]:visible`);
}
