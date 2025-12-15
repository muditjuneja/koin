import React, { useState } from 'react';
import { Gauge } from 'lucide-react';
import { SpeedMultiplier } from '../../hooks/emulator/types';

const SPEED_OPTIONS: SpeedMultiplier[] = [1, 2]; // Normal, Fast (browser limitations)

interface SpeedMenuProps {
    speed: SpeedMultiplier;
    onSpeedChange: (speed: SpeedMultiplier) => void;
    disabled?: boolean;
}

export default function SpeedMenu({ speed, onSpeedChange, disabled = false }: SpeedMenuProps) {
    const [showMenu, setShowMenu] = useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const getMenuPosition = () => {
        if (!buttonRef.current) return {};
        const rect = buttonRef.current.getBoundingClientRect();
        return {
            bottom: `${window.innerHeight - rect.top + 8}px`,
            left: `${rect.left + rect.width / 2}px`,
            transform: 'translateX(-50%)'
        };
    };

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setShowMenu(!showMenu)}
                disabled={disabled}
                className={`
          group relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg select-none
          transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
          ${speed !== 1
                        ? 'text-white'
                        : 'hover:bg-white/10 text-gray-400 hover:text-white'
                    }
        `}
                title="Speed Control"
                style={speed !== 1 ? {
                    backgroundColor: `rgba(217, 119, 6, 0.2)`, // amber-500/20
                    color: '#fbbf24', // amber-400
                    borderColor: 'rgba(245, 158, 11, 0.4)' // amber-500/40
                } : {}}
            >
                <Gauge size={20} className={`transition-transform ${showMenu || speed !== 1 ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                    {speed}x
                </span>
            </button>

            {showMenu && (
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
                    <div
                        className="fixed z-[9999] bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-1.5 shadow-xl flex flex-col gap-1 min-w-[80px]"
                        style={getMenuPosition()}
                    >
                        {SPEED_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    onSpeedChange(s);
                                    setShowMenu(false);
                                }}
                                className={`
                                    px-3 py-2 rounded text-xs font-mono font-bold text-center transition-colors
                                    ${speed === s
                                        ? 'bg-white/20 text-white'
                                        : 'hover:bg-white/10 text-gray-400 hover:text-white'
                                    }
                                `}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
