import { useCallback, MutableRefObject, useRef } from 'react';
import { Nostalgist } from 'nostalgist';

interface UseEmulatorCheatsProps {
    nostalgistRef: MutableRefObject<Nostalgist | null>;
}

interface UseEmulatorCheatsReturn {
    /**
     * Inject a list of cheat codes into the running emulator.
     * This replaces any previously active cheats.
     */
    injectCheats: (cheats: { code: string }[]) => void;

    /**
     * Clear all active cheats from the emulator.
     */
    clearCheats: () => void;
}

/**
 * Low-level cheat injection hook.
 * 
 * This is a stateless "executor" that directly calls Emscripten/RetroArch
 * internal commands (_cmd_cheat_*) to inject cheats into memory.
 * 
 * State management (which cheats are active) is handled by the higher-level
 * useGameCheats hook.
 */
export function useEmulatorCheats({
    nostalgistRef,
}: UseEmulatorCheatsProps): UseEmulatorCheatsReturn {

    // Track allocated string pointers to free them later
    const allocatedPointersRef = useRef<number[]>([]);

    const injectCheats = useCallback((cheats: { code: string }[]) => {
        if (!nostalgistRef.current) return;

        const module = nostalgistRef.current.getEmscriptenModule() as any;
        if (!module) return;

        // 1. Free previous pointers
        if (module._free && allocatedPointersRef.current.length > 0) {
            allocatedPointersRef.current.forEach(ptr => {
                try { module._free(ptr); } catch { /* ignore */ }

            });
            allocatedPointersRef.current = [];
        }

        // 2. Reallocate cheat slots
        if (module._cmd_cheat_realloc) {
            module._cmd_cheat_realloc(0); // Clear first
            if (cheats.length > 0) {
                module._cmd_cheat_realloc(cheats.length);
            }
        }

        // 3. Inject new cheats
        if (cheats.length > 0 && module.stringToNewUTF8 && module._cmd_cheat_set_code) {
            cheats.forEach((cheat, index) => {
                try {
                    const ptr = module.stringToNewUTF8(cheat.code);
                    allocatedPointersRef.current.push(ptr);
                    module._cmd_cheat_set_code(index, ptr);

                    if (module._cmd_cheat_toggle_index) {
                        module._cmd_cheat_toggle_index(index, true); // Enable
                    }
                } catch (err) {
                    console.error('[Cheats] Failed to inject cheat:', index, err);
                }
            });
        }

        // 4. Apply changes
        if (module._cmd_cheat_apply_cheats) {
            module._cmd_cheat_apply_cheats();
        }
    }, [nostalgistRef]);

    const clearCheats = useCallback(() => {
        injectCheats([]);
    }, [injectCheats]);

    return {
        injectCheats,
        clearCheats,
    };
}
