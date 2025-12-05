import { useCallback, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';

interface UseEmulatorCheatsProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
}

interface UseEmulatorCheatsReturn {
    applyCheat: (code: string) => void;
    resetCheats: () => void;
}

export function useEmulatorCheats({ nostalgistRef }: UseEmulatorCheatsProps): UseEmulatorCheatsReturn {
    // Apply cheat code
    const applyCheat = useCallback((code: string) => {
        if (!nostalgistRef.current) return;
        try {
            (nostalgistRef.current as any).addCheat(code);
        } catch (err) {
            console.error('[Nostalgist] Apply cheat error:', err);
        }
    }, [nostalgistRef]);

    // Reset cheats
    const resetCheats = useCallback(() => {
        if (!nostalgistRef.current) return;
        try {
            (nostalgistRef.current as any).resetCheats();
        } catch (err) {
            console.error('[Nostalgist] Reset cheats error:', err);
        }
    }, [nostalgistRef]);

    return {
        applyCheat,
        resetCheats
    };
}
