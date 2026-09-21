import { test, expect, startEmulator, getUnexpectedConsoleErrors } from '../fixtures/test-base';

const FAKE_GAMEPAD_ID = 'Xbox 360 Controller (XInput STANDARD GAMEPAD)';

test.describe('Gamepad', () => {
    test.describe('with a controller connected', () => {
        test.use({ fakeGamepadId: FAKE_GAMEPAD_ID });

        test('shows in the controls bar and opens the mapper with its real display name', async ({ gamePage: page }) => {
            await startEmulator(page);

            // src/hooks/useGamepad.ts's mount-time "initial gamepad check"
            // picks up the faked navigator.getGamepads() before first paint,
            // via addInitScript in the fixture (see test-base.ts) — no
            // 'gamepadconnected' event needs to be simulated.
            const gamepadButton = page.locator('button[title*="controller"][title*="connected"]:visible');
            await expect(gamepadButton).toBeVisible();
            await expect(gamepadButton).toHaveAttribute('title', /1 controller/);

            await gamepadButton.click();
            await expect(page.getByRole('heading', { name: 'Gamepad Settings' })).toBeVisible();
            // getDisplayName() in useGamepad.ts strips the "(XInput STANDARD
            // GAMEPAD)" suffix from the real id string we injected above.
            await expect(page.getByText('Xbox 360 Controller', { exact: false })).toBeVisible();

            expect(getUnexpectedConsoleErrors(page)).toEqual([]);
        });
    });

    test.describe('with no controller connected', () => {
        // Headless Chromium's real Gamepad API naturally reports zero
        // connected gamepads — no fake needed for this branch.

        test('the controls bar shows the disconnected state', async ({ gamePage: page }) => {
            await startEmulator(page);

            const noGamepadButton = page.locator(
                'button[title="No controller detected - press any button on your gamepad to connect"]:visible'
            );
            await expect(noGamepadButton).toBeVisible();

            expect(getUnexpectedConsoleErrors(page)).toEqual([]);
        });
    });
});
