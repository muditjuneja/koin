'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

interface PerformanceOverlayProps {
    isVisible: boolean;
    coreName?: string;
    systemColor?: string;
}

/**
 * Performance Overlay
 * -------------------
 * A subtle HUD displaying real-time performance metrics.
 * Useful for debugging, power users, and streamers.
 * 
 * Metrics displayed:
 * - FPS (frames per second)
 * - Frame time (ms per frame)
 * - Core name
 */
const PerformanceOverlay = memo(function PerformanceOverlay({
    isVisible,
    coreName = 'Unknown',
    systemColor = '#00FF41',
}: PerformanceOverlayProps) {
    const t = useKoinTranslation();
    const [fps, setFps] = useState(0);
    const [frameTime, setFrameTime] = useState(0);

    const frameTimesRef = useRef<number[]>([]);
    const lastTimeRef = useRef<number>(performance.now());
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isVisible) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return;
        }

        const measureFrame = () => {
            const now = performance.now();
            const delta = now - lastTimeRef.current;
            lastTimeRef.current = now;

            // Keep last 60 frame times for smoothing
            frameTimesRef.current.push(delta);
            if (frameTimesRef.current.length > 60) {
                frameTimesRef.current.shift();
            }

            // Calculate average
            const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
            const currentFps = 1000 / avgFrameTime;

            setFps(Math.round(currentFps));
            setFrameTime(Number(avgFrameTime.toFixed(1)));

            rafIdRef.current = requestAnimationFrame(measureFrame);
        };

        rafIdRef.current = requestAnimationFrame(measureFrame);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div
            className="z-40 pointer-events-none select-none"
            style={{ fontFamily: 'monospace' }}
        >
            <div
                className="flex items-center gap-3 px-2 py-1 rounded text-xs"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: systemColor,
                    border: `1px solid ${systemColor}40`,
                }}
            >
                {/* FPS */}
                <div className="flex items-center gap-1">
                    <span className="opacity-60 text-[10px] uppercase">{t.overlays.performance.fps}</span>
                    <span className="font-bold">{fps}</span>
                </div>

                <div className="w-px h-3 bg-white/20" />

                {/* Frame Time */}
                <div className="flex items-center gap-1">
                    <span className="opacity-60 text-[10px] uppercase">{t.overlays.performance.frameTime}</span>
                    <span className="font-bold">{frameTime}ms</span>
                </div>

                <div className="w-px h-3 bg-white/20" />

                {/* Core */}
                <div className="flex items-center gap-1">
                    <span className="opacity-60 text-[10px] uppercase">{t.overlays.performance.core}</span>
                    <span className="font-bold text-white/80">{coreName}</span>
                </div>
            </div>
        </div>
    );
});

export default PerformanceOverlay;
