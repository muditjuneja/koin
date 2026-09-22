import { describe, it, expect } from 'vitest';
import * as systemsSrc from '../src/systems';
import fs from 'fs';
import path from 'path';

describe('Server-Safety Boundary Contract', () => {
    it('verifies src/systems.ts exports only pure data and functions with zero browser dependencies', () => {
        // Confirm window and document are not defined in pure node
        expect(typeof window).toBe('undefined');
        expect(typeof document).toBe('undefined');

        // All key exports must exist and be functions or arrays
        expect(systemsSrc.SYSTEMS).toBeInstanceOf(Array);
        expect(typeof systemsSrc.getSystem).toBe('function');
        expect(typeof systemsSrc.normalizeSystemKey).toBe('function');
        expect(typeof systemsSrc.getMaxFileSizeMB).toBe('function');
        expect(typeof systemsSrc.getCore).toBe('function');

        // Invoking them in server environment succeeds without ReferenceError
        const snes = systemsSrc.getSystem('snes');
        expect(snes?.key).toBe('SNES');
        expect(systemsSrc.normalizeSystemKey('Super Nintendo')).toBe('SNES');
        expect(systemsSrc.getMaxFileSizeMB('PS1')).toBe(700);
    });

    it('ensures no React components or hooks are leaked into systems module', () => {
        const exports = Object.keys(systemsSrc);
        for (const exp of exports) {
            // No hooks
            expect(exp.startsWith('use')).toBe(false);
            // No React component conventions (Capitalized PascalCase function components like GamePlayer, Canvas, etc.)
            if (typeof (systemsSrc as any)[exp] === 'function') {
                expect(['getSystem', 'getSystemByKey', 'getSystemFromExtension', 'getSystemByDbName',
                    'getCore', 'getCoreSource', 'getDBSystemNames', 'isSystemSupported',
                    'getSupportedExtensions', 'getSystemsList', 'detectSystem', 'systemsMatch',
                    'normalizeSystemKey', 'getMaxFileSizeMB'
                ]).toContain(exp);
            }
        }
    });

    it('verifies dist/systems.js bundle has zero DOM global leaks if dist exists', () => {
        const distCjsPath = path.resolve(__dirname, '../dist/systems.js');
        if (fs.existsSync(distCjsPath)) {
            // Dynamically require CJS bundle in pure Node
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const distSystems = require(distCjsPath);
            expect(typeof distSystems.getSystem).toBe('function');
            const gba = distSystems.getSystem('gba');
            expect(gba?.key).toBe('GBA');
            expect(distSystems.normalizeSystemKey('Genesis')).toBe('GENESIS');
        }
    });
});
