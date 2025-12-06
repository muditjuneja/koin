import { useEffect, useRef } from 'react';
import GameOverlay from './Overlays/GameOverlay';
import { EmulatorStatus } from '../hooks/emulator/types';
import { setupCanvasResize } from '../lib/game-player-utils';

interface GameCanvasProps {
    status: EmulatorStatus;
    system: string;
    error: string | null;
    isPaused: boolean;
    onStart: () => Promise<void>;
    systemColor: string;
    isFullscreen: boolean;
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
    onSelectBios?: () => void;
}

export default function GameCanvas({
    status,
    system,
    error,
    isPaused,
    onStart,
    systemColor,
    isFullscreen,
    canvasRef,
    onSelectBios
}: GameCanvasProps) {
    const canvasContainerRef = useRef<HTMLDivElement>(null);

    // Create canvas
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (!container || canvasRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.id = 'canvas';
        // Use CSS to size the canvas display, not width/height attributes
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.style.imageRendering = 'pixelated'; // Crisp pixel art

        // Emscripten may try to set style on the canvas, so we use important if needed
        // but typically just setting it here works. Explicitly NOT setting width/height attributes
        // lets emscripten manage internal resolution vs display size.

        container.appendChild(canvas);
        canvasRef.current = canvas;

        return () => {
            if (canvasRef.current && canvasRef.current.parentNode) {
                canvasRef.current.parentNode.removeChild(canvasRef.current);
            }
            canvasRef.current = null;
        };
    }, [canvasRef]);

    // Canvas resize
    useEffect(() => {
        if (status !== 'ready' && status !== 'running' && status !== 'paused') return;
        return setupCanvasResize(canvasContainerRef);
    }, [status]);

    return (
        <div className="absolute inset-0 bg-black overflow-hidden flex items-center justify-center">
            <div ref={canvasContainerRef} className="game-canvas-container w-full h-full flex items-center justify-center"></div>

            <GameOverlay
                status={status}
                system={system}
                error={error}
                isPaused={isPaused}
                onStart={onStart}
                systemColor={systemColor}
                onSelectBios={onSelectBios}
            />
        </div>
    );
}
