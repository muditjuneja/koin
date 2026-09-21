import { test, expect, getCounters, getSaveSlots, startEmulator, controlButton, getUnexpectedConsoleErrors } from '../fixtures/test-base';

test.describe('Save / Load slots', () => {
    test('save mode: selecting slot 1 through the real modal calls onSaveState and closes the modal', async ({ gamePage: page }) => {
        await startEmulator(page);

        await controlButton(page, 'Save').click();
        await expect(page.getByRole('heading', { name: 'Save Game' })).toBeVisible();

        await page.getByText('Slot 1', { exact: false }).click();

        await expect(page.getByRole('heading', { name: 'Save Game' })).toBeHidden();
        const counters = await getCounters(page);
        expect(counters.onSaveState).toBe(1);

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });

    test('load mode: selecting slot 1 through the real modal calls onLoadState and closes the modal', async ({ gamePage: page }) => {
        await startEmulator(page);

        await controlButton(page, 'Load').click();
        await expect(page.getByRole('heading', { name: 'Load Game' })).toBeVisible();

        await page.getByText('Slot 1', { exact: false }).click();

        await expect(page.getByRole('heading', { name: 'Load Game' })).toBeHidden();
        const counters = await getCounters(page);
        expect(counters.onLoadState).toBe(1);

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });

    test('delete: confirming the real browser dialog calls onDeleteSaveState', async ({ gamePage: page }) => {
        await startEmulator(page);

        page.once('dialog', (dialog) => dialog.accept());

        await controlButton(page, 'Load').click();
        await page.getByTitle('Delete save').click();

        await expect.poll(async () => (await getCounters(page)).onDeleteSaveState).toBe(1);
        expect((await getSaveSlots(page)).find((s) => s.slot === 1)).toBeUndefined();

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });

    test('delete: dismissing the real browser dialog does NOT call onDeleteSaveState', async ({ gamePage: page }) => {
        await startEmulator(page);

        // No dialog listener registered -> Playwright's default behavior is
        // to dismiss (Cancel) any dialog automatically.
        await controlButton(page, 'Load').click();
        await page.getByTitle('Delete save').click();
        await page.waitForTimeout(200);

        expect((await getCounters(page)).onDeleteSaveState).toBe(0);
        expect((await getSaveSlots(page)).find((s) => s.slot === 1)).toBeDefined();

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });

    test('delete: with window.confirm missing entirely, fails closed (real browser, no dialog, no delete)', async ({ gamePage: page }) => {
        await startEmulator(page);

        let dialogFired = false;
        page.once('dialog', () => { dialogFired = true; });

        await page.evaluate(() => { delete (window as any).confirm; });

        await controlButton(page, 'Load').click();
        await page.getByTitle('Delete save').click();
        await page.waitForTimeout(200);

        expect(dialogFired).toBe(false);
        expect((await getCounters(page)).onDeleteSaveState).toBe(0);
        expect((await getSaveSlots(page)).find((s) => s.slot === 1)).toBeDefined();

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });
});
