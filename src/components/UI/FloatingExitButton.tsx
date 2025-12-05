import { X } from 'lucide-react';

interface FloatingExitButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

/**
 * Floating exit button that appears in fullscreen mode
 * Positioned in top-right corner for easy access
 */
export default function FloatingExitButton({ onClick, disabled = false }: FloatingExitButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        fixed top-4 right-4 z-50
        w-12 h-12 rounded-lg
        bg-black/90 backdrop-blur-sm
        border-4 border-white
        shadow-hard
        flex items-center justify-center
        transition-all duration-200
        hover:bg-red-600/20 hover:border-red-400
        active:translate-x-[3px] active:translate-y-[3px] active:shadow-none
        disabled:opacity-40 disabled:cursor-not-allowed
        touch-manipulation
      `}
            aria-label="Exit fullscreen"
            title="Exit fullscreen"
        >
            <X size={24} className="text-white" />
        </button>
    );
}
