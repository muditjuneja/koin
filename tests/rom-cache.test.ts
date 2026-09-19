import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCachedRom, fetchAndCacheRom } from '../src/lib/rom-cache';

describe('ROM Cache & Concurrency Deduplication', () => {
    let mockCacheStorage: Record<string, Response> = {};
    let fetchCallCount = 0;

    beforeEach(() => {
        mockCacheStorage = {};
        fetchCallCount = 0;

        // Mock global fetch
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            fetchCallCount++;
            if (url.includes('fail-url')) {
                return {
                    ok: false,
                    statusText: 'Not Found',
                };
            }
            return {
                ok: true,
                statusText: 'OK',
                blob: async () => new Blob(['dummy-rom-bytes'], { type: 'application/octet-stream' }),
            };
        }));

        // Mock CacheStorage API
        const cacheMock = {
            match: async (key: string) => mockCacheStorage[key] ?? null,
            put: async (key: string, res: Response) => {
                mockCacheStorage[key] = res;
            },
        };

        vi.stubGlobal('caches', {
            open: async () => cacheMock,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('coalesces concurrent requests for the same ROM ID into a single network fetch', async () => {
        const romId = 'smb-123';
        const url = 'https://assets.retrosaga.com/roms/smb.nes';

        // Fire 10 requests concurrently
        const concurrentFetches = Array.from({ length: 10 }, () =>
            fetchAndCacheRom(romId, url)
        );

        const results = await Promise.all(concurrentFetches);

        // All 10 callers get a Blob
        expect(results.length).toBe(10);
        for (const blob of results) {
            expect(blob).toBeInstanceOf(Blob);
        }

        // Only ONE actual fetch was fired over the network
        expect(fetchCallCount).toBe(1);
    });

    it('cleans up in-flight promise map on fetch failure so retries can re-attempt', async () => {
        const failId = 'failing-rom-999';
        const failUrl = 'https://assets.retrosaga.com/fail-url';

        await expect(fetchAndCacheRom(failId, failUrl)).rejects.toThrow('Failed to fetch ROM: Not Found');
        expect(fetchCallCount).toBe(1);

        // Second attempt after failure: should trigger a new network fetch, not reuse failed cached promise
        await expect(fetchAndCacheRom(failId, failUrl)).rejects.toThrow('Failed to fetch ROM: Not Found');
        expect(fetchCallCount).toBe(2);
    });

    it('returns cached blob directly on cache hit', async () => {
        const romId = 'cached-game-1';
        const cachedBlob = new Blob(['pre-existing-rom']);
        mockCacheStorage[romId] = new Response(cachedBlob);

        const retrieved = await getCachedRom(romId);
        expect(retrieved).not.toBeNull();
        expect(await retrieved?.text()).toBe('pre-existing-rom');
    });

    it('falls back gracefully when Cache API is unavailable (private browsing / Node)', async () => {
        vi.stubGlobal('caches', undefined);

        const romId = 'no-cache-api-game';
        const url = 'https://assets.retrosaga.com/roms/game.nes';

        // getCachedRom returns null
        const cached = await getCachedRom(romId);
        expect(cached).toBeNull();

        // fetchAndCacheRom still successfully downloads and returns blob
        const fetchedBlob = await fetchAndCacheRom(romId, url);
        expect(fetchedBlob).toBeInstanceOf(Blob);
    });
});
