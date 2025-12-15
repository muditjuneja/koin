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
                    flex flex-col items-center justify-center gap-1.5
                    px-3 py-2 rounded-lg
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    hover:bg-white/10 active:bg-white/20
                    ${active ? 'bg-white/10 ring-1 ring-inset' : ''}
                    ${danger ? 'hover:bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-white'}
                    ${className}
                `}
            style={active ? {
                backgroundColor: `${systemColor}20`,
                color: systemColor,
            } : {}}
            title={label}
        >
            <Icon size={iconSize} className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} style={active ? { color: systemColor } : undefined} />
            <span className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: active ? systemColor : undefined }}>
                {label}
            </span>
        </button>
    );
});
