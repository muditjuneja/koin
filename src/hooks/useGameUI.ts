import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './useToast';
import { useMobile } from './useMobile';
import {
    isFullscreen as checkIsFullscreen,
    setupFullscreenListener,
    toggleFullscreen,
} from '../components/VirtualController/utils/viewport';

export function useGameUI() {
    const { isMobile } = useMobile();
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Toast notifications
    const { toasts, showToast, dismissToast } = useToast(3500);

    // Fullscreen handling
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [raSidebarOpen, setRaSidebarOpen] = useState(false);

    const checkFullscreen = useCallback(() => {
        const fullscreen = checkIsFullscreen();
        setIsFullscreen(fullscreen);
        return fullscreen;
    }, []);

    useEffect(() => {
        checkFullscreen();
        return setupFullscreenListener(checkFullscreen);
    }, [checkFullscreen]);

    const handleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            const nativeWorked = await toggleFullscreen(containerRef.current);
            // If native fullscreen didn't work (e.g. iOS Safari), toggle visual fullscreen
            if (!nativeWorked && !checkIsFullscreen()) {
                setIsFullscreen(prev => !prev);
            }
        } catch (err) {
            console.warn('Fullscreen toggle failed, using visual fallback:', err);
            setIsFullscreen(prev => !prev);
        }
    }, []);

    return {
        containerRef,
        canvasRef,
        isMobile,
        isFullscreen,
        toasts,
        showToast,
        dismissToast,
        handleFullscreen,
        raSidebarOpen,
        setRaSidebarOpen,
    };
}
