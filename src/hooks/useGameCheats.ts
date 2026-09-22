import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GamePlayerProps, Cheat } from '../components/types';
import { UseNostalgistReturn } from './useNostalgist';

interface UseGameCheatsProps extends Partial<GamePlayerProps> {
    nostalgist: UseNostalgistReturn | null;
    showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning', options?: any) => void;
    romId?: string;
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

    const showToastRef = useRef(showToast);
    useEffect(() => {
        showToastRef.current = showToast;
    }, [showToast]);

    const onToggleCheatRef = useRef(onToggleCheat);
    useEffect(() => {
        onToggleCheatRef.current = onToggleCheat;
    }, [onToggleCheat]);

    // Persistence key
    const cheatStorageKey = romId ? `koin_cheats_${romId}` : null;

    // Load manual cheats from storage on mount/key change
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
            console.error('Failed to load manual cheats', e);
        }
        setIsLoaded(true);
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

    const handleAddManualCheat = useCallback((code: string, description: string) => {
        if (!nostalgist) return;

        const newCheat: Cheat = {
            id: generateManualId(),
            code,
            description,
            source: 'manual',
        };

        setManualCheatsInternal((prev) => [...prev, newCheat]);

        // Compute the new set up front and pass a plain value to setState —
        // not an updater function — since the side effects below (injecting
        // cheats into the core, showing a toast) must run exactly once.
        // React StrictMode invokes updater functions twice in dev, which
        // would double-fire those side effects.
        const next = new Set(activeCheats);
        next.add(newCheat.id);
        setActiveCheats(next);

        const cheatsToInject = allCheats
            .filter(c => next.has(c.id) && c.id !== newCheat.id)
            .concat([newCheat])
            .map(c => ({ code: c.code }));
        nostalgist.injectCheats(cheatsToInject);

        setCheatsModalOpen(false);
        nostalgist.resume();
        showToastRef.current?.('Cheat added!', 'success');
    }, [nostalgist, allCheats, activeCheats]);

    const handleToggleCheat = useCallback((cheatId: string) => {
        if (!nostalgist) return;

        // See handleAddManualCheat: compute the new set and pass a plain
        // value to setState so the side effects below run exactly once,
        // even under React StrictMode's double-invoked updater functions.
        const newActiveCheats = new Set(activeCheats);
        const isActive = newActiveCheats.has(cheatId);

        if (isActive) {
            newActiveCheats.delete(cheatId);
        } else {
            newActiveCheats.add(cheatId);
        }

        setActiveCheats(newActiveCheats);

        if (isActive) {
            showToastRef.current?.('Cheat Disabled');
        } else {
            showToastRef.current?.('Cheat Enabled', 'success');
        }

        if (onToggleCheatRef.current) {
            const numericId = cheatId.startsWith('db-') ? parseInt(cheatId.slice(3), 10) : undefined;
            if (numericId !== undefined) {
                onToggleCheatRef.current(numericId, !isActive);
            }
        }

        const cheatsToInject = allCheats
            .filter(c => newActiveCheats.has(c.id))
            .map(c => ({ code: c.code }));
        nostalgist.injectCheats(cheatsToInject);
    }, [nostalgist, allCheats, activeCheats]);

    return {
        cheatsModalOpen,
        setCheatsModalOpen,
        activeCheats,
        allCheats, // Unified list - replaces separate cheats + manualCheats
        handleToggleCheat,
        handleAddManualCheat,
    };
}
