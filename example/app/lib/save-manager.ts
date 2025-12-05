import { SaveSlot } from 'retro-game-player';

const DB_NAME = 'RetroSagaSaves';
const STORE_NAME = 'saves';
const DB_VERSION = 1;

interface SaveData {
    id: string; // romId-slot
    romId: string;
    slot: number;
    blob: Blob;
    timestamp: string;
    screenshot?: string;
}

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('romId', 'romId', { unique: false });
            }
        };
    });
};

export const saveState = async (romId: string, slot: number, blob: Blob, screenshot?: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const data: SaveData = {
            id: `${romId}-${slot}`,
            romId,
            slot,
            blob,
            timestamp: new Date().toISOString(),
            screenshot
        };

        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const loadState = async (romId: string, slot: number): Promise<Blob | null> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(`${romId}-${slot}`);

        request.onsuccess = () => {
            const data = request.result as SaveData;
            resolve(data ? data.blob : null);
        };
        request.onerror = () => reject(request.error);
    });
};

export const getSlots = async (romId: string): Promise<SaveSlot[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('romId');
        const request = index.getAll(IDBKeyRange.only(romId));

        request.onsuccess = () => {
            const results = request.result as SaveData[];
            const slots: SaveSlot[] = results.map(item => ({
                slot: item.slot,
                timestamp: item.timestamp,
                size: item.blob.size,
                screenshot: item.screenshot
            }));
            resolve(slots.sort((a, b) => a.slot - b.slot));
        };
        request.onerror = () => reject(request.error);
    });
};

export const deleteSlot = async (romId: string, slot: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(`${romId}-${slot}`);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
