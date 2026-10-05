import { defineConfig } from 'vitest/config';

// End-to-end netplay suite: real browsers, the real RetroArch core, and the
// real signaling worker. Slower and needs network for the first core download,
// so it runs separately from `npm test` — see `npm run test:e2e`.
export default defineConfig({
    test: {
        include: ['tests/e2e/**/*.e2e.ts'],
        globalSetup: ['tests/e2e/setup.ts'],
        environment: 'node',
        testTimeout: 120_000,
        hookTimeout: 180_000,
        fileParallelism: false,
    },
});
