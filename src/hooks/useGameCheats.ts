import { useState } from 'react';
import { UseNostalgistReturn } from './useNostalgist';
import { GamePlayerProps } from '../components/types';

interface UseGameCheatsProps extends Partial<GamePlayerProps> {
    nostalgist: UseNostalgistReturn | null;
}

export function useGameCheats({
    nostalgist,
    cheats = [],
    onToggleCheat,
}: UseGameCheatsProps) {
    const [cheatsModalOpen, setCheatsModalOpen] = useState(false);
    const [activeCheats, setActiveCheats] = useState<Set<number>>(new Set());

    const handleToggleCheat = (cheatId: number) => {
        if (!nostalgist) return;

        const newActiveCheats = new Set(activeCheats);
        const isActive = newActiveCheats.has(cheatId);

        if (isActive) {
            newActiveCheats.delete(cheatId);
        } else {
            newActiveCheats.add(cheatId);
        }
        setActiveCheats(newActiveCheats);

        // Notify external handler
        onToggleCheat?.(cheatId, !isActive);

        // Re-apply all active cheats
        nostalgist.resetCheats();

        // Small delay to ensure reset is processed
        setTimeout(() => {
            newActiveCheats.forEach((id) => {
                const cheat = cheats.find((c) => c.id === id);
                if (cheat) {
                    nostalgist.applyCheat(cheat.code);
                }
            });
        }, 50);
    };

    return {
        cheatsModalOpen,
        setCheatsModalOpen,
        activeCheats,
        handleToggleCheat,
    };
}
