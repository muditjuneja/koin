// Bundles the E2E fixture harness (tests/e2e/fixtures/harness.tsx), which
// mounts the REAL src/index.ts `GamePlayer` export, with `nostalgist`
// aliased to the deterministic fake in fixtures/fake-nostalgist.ts so no
// network/WASM emulator core is needed. Also compiles the real Tailwind
// stylesheet so the rendered page matches production layout/visibility
// closely enough for Playwright's actionability checks to behave like a
// real browser session would.
import * as esbuild from 'esbuild';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(__dirname, '.dist');

await esbuild.build({
    entryPoints: [path.join(__dirname, 'fixtures', 'harness.tsx')],
    bundle: true,
    outfile: path.join(outDir, 'harness.js'),
    format: 'iife',
    jsx: 'automatic',
    sourcemap: true,
    alias: {
        nostalgist: path.join(__dirname, 'fixtures', 'fake-nostalgist.ts'),
    },
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'info',
});

execSync(
    `npx tailwindcss -i "${path.join(root, 'src', 'styles.css')}" -o "${path.join(outDir, 'styles.css')}"`,
    { cwd: root, stdio: 'inherit' }
);
