import { useState } from 'react';
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

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={disabled}
                className={`
          group relative flex flex - col items - center gap - 1 px - 3 py - 2 rounded - lg
transition - all duration - 200 disabled: opacity - 40 disabled: cursor - not - allowed
          ${speed !== 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'hover:bg-white/10 text-gray-400 hover:text-white border border-transparent'}
`}
                title="Speed Control"
            >
                <div className="flex items-center gap-1.5">
                    <Gauge size={20} />
                    <span className="text-xs font-mono font-bold">{speed}x</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Speed</span>
            </button>

            {showMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-white/20 rounded-lg p-2 shadow-xl z-50">
                    <div className="flex flex-col gap-1">
                        {SPEED_OPTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    onSpeedChange(s);
                                    setShowMenu(false);
                                }}
                                className={`
px - 4 py - 1.5 rounded text - sm font - mono text - left whitespace - nowrap
                  ${speed === s
                                        ? 'bg-retro-primary text-black'
                                        : 'hover:bg-white/10 text-gray-300'
                                    }
`}
                            >
                                {s}x {s === 1 && '(Normal)'}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
