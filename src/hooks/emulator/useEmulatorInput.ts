import { useCallback, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';
import { PlayerIndex } from '../../lib/controls';

interface UseEmulatorInputProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
}

interface UseEmulatorInputReturn {
    pressKey: (key: string) => void;
    /**
     * Press and hold a button. `player` defaults to 1 (Nostalgist's own
     * default) — pass 2-4 to inject input for a netplay guest slot, which
     * only resolves to anything once that slot has a synthetic keyboard
     * binding (see lib/controls/synthetic-keys.ts and buildRetroArchConfig's
     * netplaySlots option). Without one, Nostalgist silently no-ops the
     * press, same as it always has for players 2-4.
     */
    pressDown: (button: string, player?: PlayerIndex) => void;
    /** Release a button. See pressDown for the `player` parameter. */
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
            (nostalgistRef.current as any).pressDown(button, player);
        } catch (err) {
            console.error('[Nostalgist] Press down error:', err);
        }
    }, [nostalgistRef]);

    // Release a button
    const pressUp = useCallback((button: string, player?: PlayerIndex) => {
        if (!nostalgistRef.current) return;

        try {
            (nostalgistRef.current as any).pressUp(button, player);
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
