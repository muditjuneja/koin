import { useState, useCallback } from 'react';
import { useButtonPositions } from '../useButtonPositions';

interface UseControllerLayoutProps {
    onPause: () => void;
    onResume: () => void;
}

export const useControllerLayout = ({
    onPause,
    onResume,
}: UseControllerLayoutProps) => {
    const [isLocked, setIsLocked] = useState(true); // Default locked
    const { getPosition, savePosition } = useButtonPositions();

    // Toggle lock and persist - pause game on exit (entering layout mode), resume on lock
    const toggleLock = useCallback(() => {
        if (isLocked) {
            // Unlocking (entering layout mode) -> Pause game
            onPause();
        } else {
            // Locking (exiting layout mode) -> Resume game
            onResume();
        }
        setIsLocked(prev => !prev);
    }, [isLocked, onPause, onResume]);

    return {
        isLocked,
        toggleLock,
        getPosition,
        savePosition,
    };
};
