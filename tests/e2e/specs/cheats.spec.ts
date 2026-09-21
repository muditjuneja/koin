import { test, expect, getCounters, startEmulator, controlButton, getUnexpectedConsoleErrors } from '../fixtures/test-base';

test.describe('Cheats', () => {
    test('toggling a cheat through the real modal fires onToggleCheat and updates the UI exactly once per click', async ({ gamePage: page }) => {
        await startEmulator(page);

        await controlButton(page, 'Cheats').click();
        await expect(page.getByRole('heading', { name: 'Cheats' })).toBeVisible();

        const cheatRow = page.locator('text=Speed Boost').locator('xpath=ancestor::div[@class and contains(@class, "cursor-pointer")][1]');
        await expect(cheatRow).toBeVisible();

        // Off -> on
        await cheatRow.click();
        let counters = await getCounters(page);
        expect(counters.onToggleCheat).toBe(1);
        await expect(cheatRow.locator('svg.lucide-check')).toBeVisible(); // check-mark icon appears

        // On -> off (proves the fix holds under real StrictMode: exactly 2
        // total calls, never 3 or 4 from a double-invoked updater)
        await cheatRow.click();
        counters = await getCounters(page);
        expect(counters.onToggleCheat).toBe(2);

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });

    test('adding a manual cheat through the real form appears in the list and is auto-activated', async ({ gamePage: page }) => {
        await startEmulator(page);

        await controlButton(page, 'Cheats').click();
        await expect(page.getByRole('heading', { name: 'Cheats' })).toBeVisible();

        await page.getByPlaceholder('Enter cheat code (e.g. 00C-048-E6E)').fill('DEADBEEF');
        await page.getByPlaceholder('Cheat description (optional)').fill('God Mode');
        await page.getByRole('button', { name: 'Add Cheat' }).click();

        // handleAddManualCheat closes the modal as part of adding (see
        // src/hooks/useGameCheats.ts) and resumes the game — reopen it to
        // see the new cheat in the (now unified) list.
        await expect(page.getByRole('heading', { name: 'Cheats' })).toBeHidden();
        await controlButton(page, 'Cheats').click();
        await expect(page.getByRole('heading', { name: 'Cheats' })).toBeVisible();

        const newRow = page.locator('text=God Mode').locator('xpath=ancestor::div[contains(@class, "cursor-pointer")][1]');
        await expect(newRow).toBeVisible();
        await expect(newRow.locator('svg.lucide-check')).toBeVisible(); // auto-activated -> check-mark visible

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });
});
