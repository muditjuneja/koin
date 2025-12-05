import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from './useToast';
import { useMobile } from './useMobile';
import { isFullscreen as checkIsFullscreen, setupFullscreenListener } from '../components/VirtualController/utils/viewport';

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

    const handleFullscreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
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
