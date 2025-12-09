import { X } from 'lucide-react';

interface FloatingExitButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Floating exit button that appears in fullscreen mode
 * Positioned at top-center to avoid collision with virtual controller buttons
 */
export default function FloatingExitButton({ onClick, disabled = false }: FloatingExitButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                fixed top-3 left-1/2 -translate-x-1/2 z-50
                w-11 h-11 rounded-lg
                bg-black/90 backdrop-blur-sm
                border-2 border-white/80
                shadow-lg
                flex items-center justify-center
                transition-all duration-200
                hover:bg-red-600/30 hover:border-red-400 hover:scale-105
                active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
            `}
            style={{
                paddingTop: 'env(safe-area-inset-top, 0px)'
            }}
            aria-label="Exit fullscreen"
            title="Exit fullscreen"
        >
            <X size={22} className="text-white" />
        </button>
    );
}
