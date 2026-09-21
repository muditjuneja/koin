import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
    testDir: './tests/e2e/specs',
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // CI images may pin an older/newer @playwright/test than the
                // browser revision bundled on the runner. Point at whatever
                // Chromium is actually installed instead of the exact
                // revision this package version would otherwise try to
                // download, so `npx playwright install` isn't required.
                launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
                    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
                    : {},
            },
        },
    ],
    webServer: {
        command: `node tests/e2e/serve.mjs`,
        url: `http://localhost:${PORT}/index.html`,
        reuseExistingServer: !process.env.CI,
        env: { E2E_PORT: String(PORT) },
    },
});
