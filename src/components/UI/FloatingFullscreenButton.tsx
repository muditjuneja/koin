import { Maximize } from 'lucide-react';

interface FloatingFullscreenButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Floating fullscreen button for mobile devices
 * Positioned in top-left corner for easy access
 */
export default function FloatingFullscreenButton({ onClick, disabled = false }: FloatingFullscreenButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        absolute top-2 left-2 z-50
        w-10 h-10 rounded-lg
        bg-black/90 backdrop-blur-sm
        border-4 border-white
        shadow-hard
        flex items-center justify-center
        transition-all duration-200
        hover:bg-retro-primary/20 hover:border-retro-primary
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
        disabled:opacity-40 disabled:cursor-not-allowed
        touch-manipulation
      `}
            aria-label="Enter fullscreen"
            title="Enter fullscreen"
        >
            <Maximize size={20} className="text-white" />
        </button>
    );
}
