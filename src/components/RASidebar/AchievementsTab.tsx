'use client';

import React from 'react';
import { Trophy, ExternalLink, CheckCircle } from 'lucide-react';
import { RAGameExtended, RAAchievement, getAchievementBadgeUrl } from '../../lib/retroachievements';

export interface AchievementsTabProps {
  currentGame: RAGameExtended | null;
  achievements: RAAchievement[];
  unlockedIds: Set<number>;
  filter: 'all' | 'locked' | 'unlocked';
  setFilter: (f: 'all' | 'locked' | 'unlocked') => void;
  totalCount: number;
  progress: number;
  earnedPoints: number;
  totalPoints: number;
  isHardcoreMode: boolean;
}

export default function AchievementsTab({
  currentGame,
  achievements,
  unlockedIds,
  filter,
  setFilter,
  totalCount,
  progress,
  earnedPoints,
  totalPoints,
}: AchievementsTabProps) {
  if (!currentGame) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
          <Trophy className="text-gray-600" size={24} />
        </div>
        <p className="text-sm text-gray-400">No game loaded</p>
        <p className="text-xs text-gray-500 mt-1">Load a game to see achievements</p>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800 flex items-center justify-center">
          <Trophy className="text-gray-600" size={24} />
        </div>
        <p className="text-sm text-gray-400">No achievements found</p>
        <p className="text-xs text-gray-500 mt-1">This game may not be supported</p>
      </div>
    );
  }

  return (
    <div>
      {/* Game Header + Progress */}
      <div className="p-3 border-b border-gray-800/50 bg-black/20">
        <div className="flex items-center gap-2 mb-2">
          {currentGame.ImageIcon && (
            <img
              src={`https://media.retroachievements.org${currentGame.ImageIcon}`}
              alt={currentGame.Title}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{currentGame.Title}</p>
            <p className="text-[10px] text-gray-500">{currentGame.ConsoleName}</p>
          </div>
          <a
            href={`https://retroachievements.org/game/${currentGame.ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-yellow-400 transition-colors p-1"
          >
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-yellow-400 font-medium whitespace-nowrap">
            {unlockedIds.size}/{totalCount}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400 whitespace-nowrap">{earnedPoints} pts</span>
        </div>

        {/* Filters */}
        <div className="flex gap-1 mt-2">
          {(['all', 'locked', 'unlocked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${filter === f
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Achievement List */}
      <div className="divide-y divide-gray-800/50">
        {achievements.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.ID);

          return (
            <div
              key={achievement.ID}
              className={`flex items-center gap-2 p-2 transition-colors ${unlocked ? 'bg-yellow-500/5' : 'hover:bg-gray-800/30'
                }`}
            >
              {/* Badge */}
              <div className="relative flex-shrink-0">
                <img
                  src={getAchievementBadgeUrl(achievement.BadgeName, !unlocked)}
                  alt=""
                  className={`w-8 h-8 rounded border ${unlocked
                      ? 'border-yellow-500/50'
                      : 'border-gray-700 opacity-40 grayscale'
                    }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {unlocked && (
                  <div className="absolute -top-0.5 -right-0.5">
                    <CheckCircle className="text-green-500 bg-gray-900 rounded-full" size={10} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${unlocked ? 'text-white' : 'text-gray-400'}`}>
                  {achievement.Title}
                </p>
                <p className={`text-[10px] truncate ${unlocked ? 'text-gray-500' : 'text-gray-600'}`}>
                  {achievement.Description}
                </p>
              </div>

              {/* Points */}
              <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${unlocked
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-gray-800 text-gray-500'
                }`}>
                {achievement.Points}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2 text-[10px] text-gray-500 text-center border-t border-gray-800/50">
        {progress}% complete • {totalPoints - earnedPoints} pts remaining
      </div>
    </div>
  );
}
