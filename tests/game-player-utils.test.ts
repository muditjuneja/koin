import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    describeRomLoadError,
    loadVolume,
    saveVolume,
    loadMuteState,
    saveMuteState,
} from '../src/lib/game-player-utils';

describe('ROM Load Error Diagnostics (describeRomLoadError)', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            location: {
                href: 'https://theretrosaga.com/play',
                protocol: 'https:',
                origin: 'https://theretrosaga.com',
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('diagnoses mixed-content HTTP request on an HTTPS page', () => {
        const error = new TypeError('Failed to fetch');
        const romUrl = 'http://insecure-cdn.com/roms/smb.nes';

        const message = describeRomLoadError(error, romUrl);

        expect(message).toContain('mixed content');
        expect(message).toContain('HTTPS');
        expect(message).toContain('Failed to fetch');
    });

    it('diagnoses CORS failure for cross-origin ROM fetch', () => {
        const error = new TypeError('Failed to fetch');
        const romUrl = 'https://external-storage.r2.cloudflarestorage.com/roms/smb.nes';

        const message = describeRomLoadError(error, romUrl);

        expect(message).toContain('Access-Control-Allow-Origin');
        expect(message).toContain('https://external-storage.r2.cloudflarestorage.com');
        expect(message).toContain('Failed to fetch');
    });

    it('handles generic network errors on same origin', () => {
        const error = new TypeError('Failed to fetch');
        const romUrl = 'https://theretrosaga.com/api/roms/game.nes';

        const message = describeRomLoadError(error, romUrl);

        expect(message).toContain('Could not download the ROM');
        expect(message).toContain('cross-origin requests (CORS)');
    });

    it('passes standard custom Error messages through unchanged if not network error', () => {
        const error = new Error('Invalid ROM format: header corrupt');
        expect(describeRomLoadError(error)).toBe('Invalid ROM format: header corrupt');
    });

    it('handles non-Error objects like strings or numbers cleanly', () => {
        expect(describeRomLoadError('Custom string error')).toBe('Custom string error');
        expect(describeRomLoadError(500)).toBe('500');
    });

    it('operates safely when window is undefined (SSR)', () => {
        vi.unstubAllGlobals();
        const error = new TypeError('Failed to fetch');
        const message = describeRomLoadError(error, 'https://cdn.example.com/game.nes');
        expect(message).toContain('Could not download the ROM');
    });
});

describe('Volume and Mute Persistence', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        const localStorageMock = {
            getItem: (k: string) => mockStorage[k] ?? null,
            setItem: (k: string, v: string) => { mockStorage[k] = v; },
            removeItem: (k: string) => { delete mockStorage[k]; },
            clear: () => { mockStorage = {}; },
            key: (i: number) => Object.keys(mockStorage)[i] ?? null,
            get length() { return Object.keys(mockStorage).length; },
        };
        vi.stubGlobal('window', { localStorage: localStorageMock });
        vi.stubGlobal('localStorage', localStorageMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('loads and saves volume levels', () => {
        expect(loadVolume()).toBe(100); // Default volume

        saveVolume(75);
        expect(loadVolume()).toBe(75);

        saveVolume(0);
        expect(loadVolume()).toBe(0);
    });

    it('loads and saves mute state', () => {
        expect(loadMuteState()).toBe(false); // Default unmuted

        saveMuteState(true);
        expect(loadMuteState()).toBe(true);

        saveMuteState(false);
        expect(loadMuteState()).toBe(false);
    });

    it('returns safe defaults in SSR when window is undefined', () => {
        vi.unstubAllGlobals();
        expect(loadVolume()).toBe(100);
        expect(loadMuteState()).toBe(false);
        expect(() => saveVolume(80)).not.toThrow();
        expect(() => saveMuteState(true)).not.toThrow();
    });
});
