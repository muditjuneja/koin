import React, { memo } from 'react';

export interface ControlButtonProps {
    onClick?: () => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    onMouseLeave?: () => void;
    onTouchStart?: () => void;
    onTouchEnd?: () => void;
    icon: React.ElementType;
    label: string;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    className?: string;
    systemColor?: string; // Console-specific color for theming
}

export const ControlButton = memo(function ControlButton({
    onClick,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    icon: Icon,
    label,
    active = false,
    danger = false,
    disabled = false,
    className = '',
    systemColor = '#00FF41',
    iconSize = 20,
}: ControlButtonProps & { iconSize?: number }) {
    return (
        <button
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            disabled={disabled}
            className={`
        group relative flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg
        transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
        select-none flex-shrink-0
        ${active
                    ? ''
                    : danger
                        ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
                        : 'hover:bg-white/10 text-gray-400 hover:text-white'
                }
        ${className}
      `}
            style={active ? {
                backgroundColor: `${systemColor}20`,
                color: systemColor,
            } : {}}
            title={label}
        >
            <Icon size={iconSize} className="transition-transform group-hover:scale-110" />
            <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {label}
            </span>
        </button>
    );
});
