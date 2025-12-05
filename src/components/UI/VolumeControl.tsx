import { Volume2, VolumeX, Volume1 } from 'lucide-react';

interface VolumeControlProps {
    volume: number; // 0-100
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
    disabled?: boolean;
    systemColor?: string;
}

export default function VolumeControl({
    volume,
    isMuted,
    onVolumeChange,
    onToggleMute,
    disabled = false,
    systemColor = '#00FF41',
}: VolumeControlProps) {
    // Choose icon based on volume level
    const VolumeIcon = isMuted || volume === 0
        ? VolumeX
        : volume < 50
            ? Volume1
            : Volume2;

    const displayVolume = isMuted ? 0 : volume;

    return (
        <div className="flex items-center gap-2">
            {/* Mute button */}
            <button
                onClick={onToggleMute}
                disabled={disabled}
                className={`
          flex items-center justify-center w-8 h-8 transition-all duration-200
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isMuted || volume === 0
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-gray-400 hover:text-white'
                    }
        `}
                title={isMuted ? 'Unmute' : 'Mute'}
            >
                <VolumeIcon size={18} />
            </button>

            {/* Slider - always visible */}
            <div className="relative flex items-center w-20">
                {/* Track background */}
                <div className="absolute inset-y-0 left-0 right-0 h-1 my-auto bg-white/20" />
                {/* Track fill */}
                <div
                    className="absolute inset-y-0 left-0 h-1 my-auto transition-all"
                    style={{
                        width: `${displayVolume}%`,
                        backgroundColor: isMuted ? '#6b7280' : systemColor,
                    }}
                />
                {/* Input */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={displayVolume}
                    onChange={(e) => {
                        const newVolume = parseInt(e.target.value);
                        onVolumeChange(newVolume);
                        // If volume was muted and user moves slider, unmute
                        if (isMuted && newVolume > 0) {
                            onToggleMute();
                        }
                    }}
                    disabled={disabled}
                    className="
            relative w-full h-4 appearance-none cursor-pointer bg-transparent z-10
            disabled:opacity-40 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-3 
            [&::-webkit-slider-thumb]:h-3 
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-moz-range-thumb]:w-3 
            [&::-moz-range-thumb]:h-3 
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:shadow-lg
          "
                />
            </div>
        </div>
    );
}
