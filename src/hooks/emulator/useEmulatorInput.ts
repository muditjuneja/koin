import { useCallback, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';
import { PlayerIndex } from '../../lib/controls';

interface UseEmulatorInputProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
}

interface UseEmulatorInputReturn {
    pressKey: (key: string) => void;
    /** Press and hold a button via the player's keyboard binding. `player` defaults to 1. */
    pressDown: (button: string, player?: PlayerIndex) => void;
    pressUp: (button: string, player?: PlayerIndex) => void;
}

export function useEmulatorInput({ nostalgistRef }: UseEmulatorInputProps): UseEmulatorInputReturn {
    // Press key programmatically (press and release)
    const pressKey = useCallback((key: string) => {
        if (!nostalgistRef.current) return;

        try {
            nostalgistRef.current.press(key);
        } catch (err) {
            console.error('[Nostalgist] Press key error:', err);
        }
    }, [nostalgistRef]);

    // Press and hold a button
    const pressDown = useCallback((button: string, player?: PlayerIndex) => {
        if (!nostalgistRef.current) return;

        try {
            // Nostalgist's two-argument form ignores `player`; only the object form routes it.
            nostalgistRef.current.pressDown({ button, player });
        } catch (err) {
            console.error('[Nostalgist] Press down error:', err);
        }
    }, [nostalgistRef]);

    // Release a button
    const pressUp = useCallback((button: string, player?: PlayerIndex) => {
        if (!nostalgistRef.current) return;

        try {
            nostalgistRef.current.pressUp({ button, player });
        } catch (err) {
            console.error('[Nostalgist] Press up error:', err);
        }
    }, [nostalgistRef]);

    return {
        pressKey,
        pressDown,
        pressUp,
    };
}
