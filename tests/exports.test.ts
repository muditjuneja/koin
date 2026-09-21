import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Package Distribution & Export Contract', () => {
    const rootDir = path.resolve(__dirname, '..');
    const pkgJsonPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    const distExists = fs.existsSync(path.resolve(rootDir, 'dist/index.d.ts'));

    it('declares valid package metadata, version, and main entry points', () => {
        expect(pkg.name).toBe('koin.js');
        expect(pkg.version).toBeTruthy();
        expect(pkg.main).toBe('dist/index.js');
        expect(pkg.module).toBe('dist/index.mjs');
        expect(pkg.types).toBe('dist/index.d.ts');
        expect(pkg.files).toContain('dist');
    });

    it.skipIf(!distExists)('ensures all files defined in package.json exports exist on disk with content', () => {
        const exportsMap = pkg.exports;
        expect(exportsMap).toBeDefined();

        for (const [subpath, target] of Object.entries<any>(exportsMap)) {
            if (typeof target === 'string') {
                const fullPath = path.resolve(rootDir, target);
                expect(fs.existsSync(fullPath), `Target for export ${subpath} does not exist: ${target}`).toBe(true);
                const stat = fs.statSync(fullPath);
                expect(stat.size, `Export ${subpath} file is empty: ${target}`).toBeGreaterThan(0);
            } else if (typeof target === 'object' && target !== null) {
                for (const [condition, condTarget] of Object.entries<string>(target)) {
                    const fullPath = path.resolve(rootDir, condTarget);
                    expect(fs.existsSync(fullPath), `Target for export ${subpath} [${condition}] does not exist: ${condTarget}`).toBe(true);
                    const stat = fs.statSync(fullPath);
                    expect(stat.size, `Export ${subpath} [${condition}] file is empty: ${condTarget}`).toBeGreaterThan(0);
                }
            }
        }
    });

    it.skipIf(!distExists)('verifies dist/systems.js is loadable as CommonJS and exports correct APIs', () => {
        const cjsSystemsPath = path.resolve(rootDir, 'dist/systems.js');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cjsSystems = require(cjsSystemsPath);

        expect(typeof cjsSystems.getSystem).toBe('function');
        expect(typeof cjsSystems.normalizeSystemKey).toBe('function');
        expect(typeof cjsSystems.getMaxFileSizeMB).toBe('function');
        expect(cjsSystems.SYSTEMS).toBeInstanceOf(Array);

        expect(cjsSystems.getSystem('nes')?.key).toBe('NES');
    });

    it.skipIf(!distExists)('verifies dist/systems.mjs is dynamically importable as ESM', async () => {
        const esmSystemsPath = path.resolve(rootDir, 'dist/systems.mjs');
        const esmSystems = await import(esmSystemsPath);

        expect(typeof esmSystems.getSystem).toBe('function');
        expect(typeof esmSystems.normalizeSystemKey).toBe('function');
        expect(esmSystems.SYSTEMS).toBeInstanceOf(Array);

        expect(esmSystems.getSystem('snes')?.key).toBe('SNES');
    });

    it.skipIf(!distExists)('verifies typescript declaration files export required types', () => {
        const indexDts = fs.readFileSync(path.resolve(rootDir, 'dist/index.d.ts'), 'utf8');
        expect(indexDts).toContain('GamePlayer');
        expect(indexDts).toContain('GamePlayerProps');
        expect(indexDts).toContain('SaveSlot');
        expect(indexDts).toContain('ErrorBoundary');

        const systemsDts = fs.readFileSync(path.resolve(rootDir, 'dist/systems.d.ts'), 'utf8');
        expect(systemsDts).toContain('getSystem');
        expect(systemsDts).toContain('SystemConfig');
        expect(systemsDts).toContain('normalizeSystemKey');
    });
});
