import { useState, useEffect, useMemo } from 'react';
import { UseNostalgistReturn } from './useNostalgist';
import { GamePlayerProps } from '../components/types';
import { Cheat } from '../components/types';

interface UseGameCheatsProps extends Partial<GamePlayerProps> {
    nostalgist: UseNostalgistReturn | null;
    showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: any) => void;
}

// Helper to generate unique manual cheat ID
const generateManualId = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Safe localStorage wrappers — no-ops when storage is unavailable
 * (SSR, sandboxed iframes, strict incognito, QuotaExceeded).
 */
const safeGetItem = (key: string): string | null => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
};

const safeSetItem = (key: string, value: string): void => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        window.localStorage.setItem(key, value);
    } catch {
        // QuotaExceeded, SecurityError — silently skip
    }
};

export function useGameCheats({
    nostalgist,
    cheats = [],
    onToggleCheat,
    showToast,
    romId,
}: UseGameCheatsProps) {
    const [cheatsModalOpen, setCheatsModalOpen] = useState(false);
    const [activeCheats, setActiveCheats] = useState<Set<string>>(new Set());
    const [manualCheatsInternal, setManualCheatsInternal] = useState<Cheat[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Persistence key
    const cheatStorageKey = romId ? `koin_cheats_${romId}` : null;

    // Load manual cheats from storage
    useEffect(() => {
        if (!cheatStorageKey) return;
        setIsLoaded(false);
        try {
            const stored = safeGetItem(cheatStorageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setManualCheatsInternal(parsed);
                }
            }
        } catch (e) {
            console.error('[Cheats] Failed to load cheats:', e);
        } finally {
            setIsLoaded(true);
        }
    }, [cheatStorageKey]);

    // Save manual cheats to storage
    useEffect(() => {
        if (!cheatStorageKey || !isLoaded) return;
        safeSetItem(cheatStorageKey, JSON.stringify(manualCheatsInternal));
    }, [manualCheatsInternal, cheatStorageKey, isLoaded]);


    // Unified cheat list: normalize external cheats + include manual cheats
    const allCheats = useMemo<Cheat[]>(() => {
        const normalizedExternal: Cheat[] = cheats.map((c) => ({
            id: typeof c.id === 'number' ? `db-${c.id}` : c.id,
            code: c.code,
            description: c.description,
            source: 'database' as const,
        }));
        return [...normalizedExternal, ...manualCheatsInternal];
    }, [cheats, manualCheatsInternal]);

    const handleAddManualCheat = (code: string, description: string) => {
        if (!nostalgist) return;

        const newCheat: Cheat = {
            id: generateManualId(),
            code,
            description,
            source: 'manual',
        };

        setManualCheatsInternal((prev) => [...prev, newCheat]);
        setActiveCheats((prev) => new Set(prev).add(newCheat.id));
        setCheatsModalOpen(false);

        // Inject the newly active cheat immediately - full list needed
        const currentActiveCheats = [...activeCheats, newCheat.id];
        const cheatsToInject = allCheats
            .filter(c => currentActiveCheats.includes(c.id) || c.id === newCheat.id)
            .concat([newCheat]);
        nostalgist.injectCheats(cheatsToInject.map(c => ({ code: c.code })));
        nostalgist.resume();
        showToast?.('Cheat added!', 'success');
    };

    const handleToggleCheat = (cheatId: string) => {
        if (!nostalgist) return;

        const newActiveCheats = new Set(activeCheats);
        const isActive = newActiveCheats.has(cheatId);

        if (isActive) {
            newActiveCheats.delete(cheatId);
            showToast?.('Cheat Disabled');
        } else {
            newActiveCheats.add(cheatId);
            showToast?.('Cheat Enabled', 'success');
        }
        setActiveCheats(newActiveCheats);

        // Notify external handler (convert back to number if it's a DB cheat)
        if (onToggleCheat) {
            const numericId = cheatId.startsWith('db-') ? parseInt(cheatId.slice(3), 10) : undefined;
            if (numericId !== undefined) {
                onToggleCheat(numericId, !isActive);
            }
        }

        // Re-inject all active cheats
        const cheatsToInject = allCheats
            .filter(c => newActiveCheats.has(c.id))
            .map(c => ({ code: c.code }));
        nostalgist.injectCheats(cheatsToInject);
    };

    return {
        cheatsModalOpen,
        setCheatsModalOpen,
        activeCheats,
        allCheats, // Unified list - replaces separate cheats + manualCheats
        handleToggleCheat,
        handleAddManualCheat,
    };
}
