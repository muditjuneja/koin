'use client';

import React from 'react';
import { Trophy, Loader2 } from 'lucide-react';

interface RAButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isConnected: boolean;
  isGameFound: boolean;
  isIdentifying: boolean;
  achievementCount: number;
  className?: string;
}

/**
 * RetroAchievements button with status indicators and tooltips.
 */
export default function RAButton({
  onClick,
  disabled = false,
  isConnected,
  isGameFound,
  isIdentifying,
  achievementCount,
  className = '',
}: RAButtonProps) {
  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          group relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg
          transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
          select-none
          ${isGameFound 
            ? 'bg-gradient-to-b from-yellow-500/30 to-orange-500/20 text-yellow-400 ring-1 ring-yellow-500/50 shadow-[0_0_12px_rgba(234,179,8,0.3)]' 
            : isConnected
              ? 'bg-yellow-500/10 text-yellow-400/70 ring-1 ring-yellow-500/30' 
              : 'hover:bg-white/10 text-gray-400 hover:text-white'
          }
        `}
        title={isGameFound ? `RetroAchievements (${achievementCount} achievements)` : isConnected ? 'RetroAchievements (connected)' : 'RetroAchievements'}
      >
        {isIdentifying ? (
          <Loader2 size={20} className="animate-spin text-yellow-400" />
        ) : (
          <Trophy 
            size={20} 
            className={`
              transition-all group-hover:scale-110 
              ${isGameFound ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.7)] text-yellow-400' : ''}
              ${isConnected && !isGameFound ? 'opacity-70' : ''}
            `} 
          />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
          {isIdentifying ? '...' : isGameFound ? achievementCount : 'RA'}
        </span>
      </button>
      
      {/* Status indicator dot */}
      {isConnected && (
        <div className={`
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-black
          ${isGameFound 
            ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' 
            : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]'
          }
        `}>
          {isGameFound && (
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-50" />
          )}
        </div>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/95 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10">
        {isIdentifying 
          ? 'Identifying game...' 
          : isGameFound 
            ? `${achievementCount} achievements available`
            : isConnected 
              ? 'Connected - Game not in RA database' 
              : 'Connect RetroAchievements'
        }
      </div>
    </div>
  );
}

