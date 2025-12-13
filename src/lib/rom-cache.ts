const CACHE_NAME = 'koin-rom-cache-v1';

/**
 * Get a ROM blob from the browser cache
 */
export async function getCachedRom(romId: string): Promise<Blob | null> {
    if (typeof caches === 'undefined') return null;

    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(romId);
        if (response) {
            console.log(`[Cache] Hit for ROM ${romId}`);
            return await response.blob();
        }
    } catch (e) {
        console.warn('[Cache] Read failed:', e);
    }
    return null;
}

/**
 * Fetch a ROM from a URL and cache it
 */
// In-memory map to store in-flight fetch promises to prevent duplicate requests
const pendingFetches = new Map<string, Promise<Blob>>();

export async function fetchAndCacheRom(romId: string, url: string): Promise<Blob> {
    // 1. Return existing promise if already fetching this ROM
    if (pendingFetches.has(romId)) {
        console.log(`[Cache] Joining in-flight fetch for ${romId}`);
        return pendingFetches.get(romId)!;
    }

    // 2. Create new fetch promise
    const fetchPromise = (async () => {
        try {
            // Check cache first (in case another tab/session just cached it)
            const cached = await getCachedRom(romId);
            if (cached) return cached;

            console.log(`[Cache] Fetching ROM ${romId}...`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ROM: ${response.statusText}`);

            const blob = await response.blob();

            // Cache it
            if (typeof caches !== 'undefined') {
                try {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(romId, new Response(blob));
                    console.log(`[Cache] Cached ROM ${romId}`);
                } catch (e) {
                    console.warn('[Cache] Write failed:', e);
                }
            }
            return blob;
        } finally {
            // Cleanup pending promise
            pendingFetches.delete(romId);
        }
    })();

    pendingFetches.set(romId, fetchPromise);
    return fetchPromise;
}
