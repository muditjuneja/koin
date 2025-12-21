'use client';

import { useState, useEffect } from 'react';
import {
    isMobileDevice,
    getCurrentOrientation,
    createOrientationChangeHandler,
} from '../components/VirtualController/utils/viewport';

export interface UseMobileReturn {
    isMobile: boolean;
    isLandscape: boolean;
    isPortrait: boolean;
}

/**
 * Hook to detect mobile devices and screen orientation
 * Uses touch capability and screen size to determine if device is mobile
 */
export function useMobile(): UseMobileReturn {
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(false);
    const [isPortrait, setIsPortrait] = useState(true);

    useEffect(() => {
        let lastOrientation: 'portrait' | 'landscape' | null = null;

        // Check orientation with debouncing to avoid rapid updates
        let orientationTimeout: ReturnType<typeof setTimeout> | null = null;
        const checkOrientation = () => {
            if (orientationTimeout) clearTimeout(orientationTimeout);

            orientationTimeout = setTimeout(() => {
                const currentOrientation = getCurrentOrientation();

                // Only update if orientation actually changed
                if (lastOrientation !== currentOrientation) {
                    lastOrientation = currentOrientation;
                    const landscape = currentOrientation === 'landscape';
                    setIsLandscape(landscape);
                    setIsPortrait(!landscape);
                }
            }, 100); // Small debounce to avoid rapid updates during transition
        };

        // Initial check
        setIsMobile(isMobileDevice());
        const initialOrientation = getCurrentOrientation();
        lastOrientation = initialOrientation;
        const initialLandscape = initialOrientation === 'landscape';
        setIsLandscape(initialLandscape);
        setIsPortrait(!initialLandscape);

        // Listen for resize/orientation changes
        const handleResize = () => {
            setIsMobile(isMobileDevice());
            checkOrientation();
        };

        // Handle orientation change with iOS-specific timing
        const handleOrientationChange = createOrientationChangeHandler(() => {
            handleResize();
        });

        window.addEventListener('resize', handleResize, { passive: true });
        window.addEventListener('orientationchange', handleOrientationChange);

        // Screen Orientation API change event (modern standard, more reliable than orientationchange)
        const handleScreenOrientation = () => handleResize();
        if (window.screen?.orientation) {
            window.screen.orientation.addEventListener('change', handleScreenOrientation);
        }

        // Visual viewport changes (iOS Safari address bar)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }
        return () => {
            if (orientationTimeout) clearTimeout(orientationTimeout);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
            if (window.screen?.orientation) {
                window.screen.orientation.removeEventListener('change', handleScreenOrientation);
            }
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    return {
        isMobile,
        isLandscape,
        isPortrait,
    };
}
