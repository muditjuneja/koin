import React from 'react';
import { createRoot } from 'react-dom/client';
// This is the REAL, unmodified koin.js public entry point — the same
// import path a consumer of the package would use. Only the `nostalgist`
// module underneath it is faked (see build.mjs's esbuild alias).
import { GamePlayer, SaveSlot, Cheat } from '../../../src/index';

// ---------------------------------------------------------------------------
// Instrumentation exposed on window for Playwright to read/reset between
// assertions. Counters only — real assertions still happen against the
// actual rendered DOM wherever possible (see the specs).
// ---------------------------------------------------------------------------
declare global {
    interface Window {
        __e2e: {
            counters: Record<string, number>;
            saveSlots: SaveSlot[];
        };
    }
}

window.__e2e = {
    counters: {
        onReady: 0,
        onToggleCheat: 0,
        onSaveState: 0,
        onLoadState: 0,
        onDeleteSaveState: 0,
        onGetSaveSlots: 0,
    },
    // Slot 1 pre-populated so the SaveSlotModal's delete button is visible
    // without needing a real save round-trip first.
    saveSlots: [
        { slot: 1, timestamp: new Date().toISOString(), size: 1024, screenshot: null },
    ],
};

function bump(name: string) {
    window.__e2e.counters[name] = (window.__e2e.counters[name] ?? 0) + 1;
}

function App() {
    return (
        <GamePlayer
            // No romId: that opts into rom-cache's own fetch-and-cache path,
            // which would try (and fail) to fetch romUrl over the real
            // network before falling back — noisy and irrelevant to what
            // these tests cover (UI wiring, not ROM caching).
            romId=""
            romUrl="fake://rom"
            system="nes"
            title="E2E Fixture Game"
            onReady={() => bump('onReady')}
            // `Cheat.id` is typed `string`, but useGameCheats.ts explicitly
            // special-cases a runtime numeric id (`typeof c.id === 'number'`)
            // to prefix it as `db-<id>` — that's the only path that feeds a
            // numeric id back through onToggleCheat's `(cheatId: number, ...)`
            // signature, so a numeric id here is what actually exercises it
            // (matches the existing unit tests' `makeExternalCheat`).
            cheats={[{ id: 7, code: 'CODE0007', description: 'Speed Boost' }] as unknown as Cheat[]}
            onToggleCheat={(_id, _active) => bump('onToggleCheat')}
            onGetSaveSlots={async () => {
                bump('onGetSaveSlots');
                return window.__e2e.saveSlots;
            }}
            onSaveState={async (slot, _blob, _screenshot) => {
                bump('onSaveState');
                window.__e2e.saveSlots = [
                    ...window.__e2e.saveSlots.filter((s) => s.slot !== slot),
                    { slot, timestamp: new Date().toISOString(), size: 2048, screenshot: null },
                ];
            }}
            onLoadState={async (slot) => {
                bump('onLoadState');
                const exists = window.__e2e.saveSlots.some((s) => s.slot === slot);
                return exists ? new Blob([new Uint8Array([1, 2, 3])]) : null;
            }}
            onDeleteSaveState={async (slot) => {
                bump('onDeleteSaveState');
                window.__e2e.saveSlots = window.__e2e.saveSlots.filter((s) => s.slot !== slot);
            }}
        />
    );
}

const root = createRoot(document.getElementById('root')!);
// Matches src/web-component.tsx's real production wrapping — StrictMode is
// how the double-invoked-updater class of bug (see PR #7) actually surfaces.
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
