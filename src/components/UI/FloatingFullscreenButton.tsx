import { Maximize } from 'lucide-react';

interface FloatingFullscreenButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Floating fullscreen button for mobile devices
 * Positioned at top-left - away from virtual controller buttons and EXIT (top-right)
 */
export default function FloatingFullscreenButton({ onClick, disabled = false }: FloatingFullscreenButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                absolute top-3 left-3 z-50
                w-9 h-9 rounded-lg
                bg-black/70 backdrop-blur-sm
                border-2 border-white/50
                shadow-md
                flex items-center justify-center
                transition-all duration-200
                hover:bg-white/20 hover:border-white
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
            `}
            aria-label="Enter fullscreen"
            title="Enter fullscreen"
        >
            <Maximize size={16} className="text-white/80" />
        </button>
    );
}
