'use client';

import {
  Trophy,
  User,
  LogOut,
  ExternalLink,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { RACredentials, RAGameExtended, getUserAvatarUrl } from '../../lib/retroachievements';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

export interface SettingsTabProps {
  credentials: RACredentials;
  hardcoreEnabled: boolean;
  onHardcoreChange: (enabled: boolean) => void;
  currentGame: RAGameExtended | null;
  achievementCount: number;
  unlockedCount: number;
  progress: number;
  onLogout: () => void;
}

export default function SettingsTab({
  credentials,
  hardcoreEnabled,
  onHardcoreChange,
  currentGame,
  achievementCount,
  unlockedCount,
  progress,
  onLogout,
}: SettingsTabProps) {
  const t = useKoinTranslation();

  return (
    <div className="p-3 space-y-3">
      {/* User Card */}
      <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-yellow-500/20">
        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden border-2 border-yellow-500/50 flex-shrink-0">
          {credentials.avatarUrl ? (
            <img
              src={getUserAvatarUrl(credentials.avatarUrl)}
              alt={credentials.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="text-gray-600" size={24} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-white truncate">{credentials.username}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Trophy className="text-yellow-400" size={12} />
            <span className="text-xs text-yellow-400">{credentials.score?.toLocaleString() || 0}</span>
          </div>
        </div>
        <a
          href={`https://retroachievements.org/user/${credentials.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-yellow-400 transition-colors p-1"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Current Game */}
      {currentGame && (
        <div className="p-3 bg-black/30 rounded-lg border border-green-500/20">
          <div className="flex items-center gap-2">
            {currentGame.ImageIcon && (
              <img
                src={`https://media.retroachievements.org${currentGame.ImageIcon}`}
                alt={currentGame.Title}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentGame.Title}</p>
              <p className="text-[10px] text-gray-500">{currentGame.ConsoleName}</p>
            </div>
          </div>
          {achievementCount > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">{progress}%</span>
                <span className="text-yellow-400">{unlockedCount}/{achievementCount}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hardcore Mode */}
      <div className="p-3 bg-black/30 rounded-lg border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={hardcoreEnabled ? 'text-red-500' : 'text-gray-500'} size={16} />
            <div>
              <p className="text-xs font-medium text-white">{t.retroAchievements.hardcore}</p>
              <p className="text-[10px] text-gray-500">2x points, no savestates</p>
            </div>
          </div>
          <button
            onClick={() => onHardcoreChange(!hardcoreEnabled)}
            className={`relative w-10 h-5 rounded-full transition-colors ${hardcoreEnabled ? 'bg-red-500' : 'bg-gray-600'
              }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${hardcoreEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
          </button>
        </div>

        {hardcoreEnabled && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-300">
            {t.common.disabledInHardcore}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 text-xs px-1">
        <CheckCircle className="text-green-500" size={12} />
        <span className="text-green-400">{t.retroAchievements.connectedStatus}</span>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors border border-white/10"
      >
        <LogOut size={14} />
        <span>{t.retroAchievements.logout}</span>
      </button>
    </div>
  );
}
