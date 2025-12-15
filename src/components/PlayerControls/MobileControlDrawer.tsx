'use client';

import { memo, useState, useEffect, ReactNode } from 'react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface MobileControlDrawerProps {
    children: ReactNode;
    systemColor?: string;
}

/**
 * Mobile Control Drawer
 * FAB button at bottom-center that opens a slide-up drawer with controls
 * Only visible on mobile (hidden on sm+ screens)
 */
const MobileControlDrawer = memo(function MobileControlDrawer({
    children,
    systemColor = '#00FF41',
}: MobileControlDrawerProps) {
    const t = useKoinTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    // Close drawer when clicking outside
    useEffect(() => {
        if (isExpanded) {
            const handleInteract = (e: MouseEvent | TouchEvent) => {
                const target = e.target as HTMLElement;
                const isInside = target.closest('.player-controls-drawer') || target.closest('.player-controls-fab');
                if (!isInside) {
                    setIsExpanded(false);
                }
            };
            window.addEventListener('mousedown', handleInteract);
            window.addEventListener('touchstart', handleInteract);
            return () => {
                window.removeEventListener('mousedown', handleInteract);
                window.removeEventListener('touchstart', handleInteract);
            };
        }
    }, [isExpanded]);

    return (
        <>
            {/* FAB (Floating Action Button) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] sm:hidden player-controls-fab">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`
            w-14 h-14 rounded-full shadow-lg
            flex items-center justify-center
            transition-all duration-300 ease-out
            active:scale-90
            ${isExpanded
                            ? 'bg-white text-black rotate-45'
                            : 'bg-black/70 backdrop-blur-md text-white border border-white/20'
                        }
          `}
                    style={{
                        boxShadow: isExpanded
                            ? `0 0 20px ${systemColor}60, 0 4px 20px rgba(0,0,0,0.5)`
                            : '0 4px 20px rgba(0,0,0,0.5)',
                        borderColor: isExpanded ? systemColor : undefined
                    }}
                    aria-label={isExpanded ? t.controls.menuClose : t.controls.menuOpen}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>

            {/* Slide-up Drawer */}
            <div
                className={`
          fixed inset-x-0 bottom-0 z-50 sm:hidden
          transform transition-all duration-300 ease-out
          player-controls-drawer
          ${isExpanded
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-full opacity-0 pointer-events-none'
                    }
        `}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-black/95 to-black/70 backdrop-blur-xl"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}
                />

                {/* Content */}
                <div
                    className="relative flex flex-col items-center px-4 py-6 pb-20"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}
                >
                    {children}
                </div>

                {/* Drag handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full" />
            </div>
        </>
    );
});

export default MobileControlDrawer;
