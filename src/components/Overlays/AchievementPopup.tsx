'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { RAAchievement, getAchievementBadgeUrl } from '../../lib/retroachievements';

interface AchievementPopupProps {
  achievement: RAAchievement;
  hardcore: boolean;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function AchievementPopup({
  achievement,
  hardcore,
  onDismiss,
  autoDismissMs = 5000,
}: AchievementPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] transition-all duration-300 ${isVisible && !isExiting
        ? 'translate-x-0 opacity-100'
        : 'translate-x-full opacity-0'
        }`}
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 blur-lg opacity-50 animate-pulse" />

      {/* Main container */}
      <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 p-[2px] rounded-lg">
        <div className="bg-gray-900 rounded-lg p-4 flex items-center gap-4 min-w-[320px]">
          {/* Badge */}
          <div className="relative flex-shrink-0">
            <img
              src={getAchievementBadgeUrl(achievement.BadgeName)}
              alt={achievement.Title}
              className="w-16 h-16 rounded-lg border-2 border-yellow-500/50"
              onError={(e) => {
                // Fallback to placeholder
                (e.target as HTMLImageElement).src = '/placeholder-badge.png';
              }}
            />
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-lg pointer-events-none" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="text-yellow-400 flex-shrink-0" size={14} />
              <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">
                {hardcore ? 'Hardcore ' : ''}Achievement Unlocked!
              </span>
            </div>
            <p className="font-bold text-white truncate">{achievement.Title}</p>
            <p className="text-sm text-gray-400 truncate">{achievement.Description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-400 font-bold">{achievement.Points}</span>
              <span className="text-xs text-gray-500">points</span>
              {hardcore && (
                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/30">
                  2x
                </span>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Queue manager for multiple achievement popups
interface QueuedAchievement {
  id: number;
  achievement: RAAchievement;
  hardcore: boolean;
}

interface AchievementPopupQueueProps {
  achievements: QueuedAchievement[];
  onDismiss: (id: number) => void;
}

export function AchievementPopupQueue({ achievements, onDismiss }: AchievementPopupQueueProps) {
  // Only show one at a time
  const current = achievements[0];

  if (!current) return null;

  return (
    <AchievementPopup
      key={current.id}
      achievement={current.achievement}
      hardcore={current.hardcore}
      onDismiss={() => onDismiss(current.id)}
    />
  );
}
