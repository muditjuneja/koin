import { useCallback, MutableRefObject } from 'react';
import { Nostalgist } from 'nostalgist';

interface UseEmulatorInputProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
}

interface UseEmulatorInputReturn {
    pressKey: (key: string) => void;
}

export function useEmulatorInput({ nostalgistRef }: UseEmulatorInputProps): UseEmulatorInputReturn {
    // Press key programmatically
    const pressKey = useCallback((key: string) => {
        if (!nostalgistRef.current) return;

        try {
            nostalgistRef.current.press(key);
        } catch (err) {
            console.error('[Nostalgist] Press key error:', err);
        }
    }, [nostalgistRef]);

    return {
        pressKey
    };
}
