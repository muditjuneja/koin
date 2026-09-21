import { test, expect, startEmulator, getUnexpectedConsoleErrors } from '../fixtures/test-base';

test.describe('Volume', () => {
    test('clicking Mute through the real control toggles to Unmute and back', async ({ gamePage: page }) => {
        await startEmulator(page);

        const muteButton = page.locator('button[title="Mute"]:visible');
        await expect(muteButton).toBeVisible();

        await muteButton.click();
        const unmuteButton = page.locator('button[title="Unmute"]:visible');
        await expect(unmuteButton).toBeVisible();

        await unmuteButton.click();
        await expect(page.locator('button[title="Mute"]:visible')).toBeVisible();

        expect(getUnexpectedConsoleErrors(page)).toEqual([]);
    });
});
