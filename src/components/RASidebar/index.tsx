'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, Settings, List } from 'lucide-react';
import { RACredentials, RAGameExtended, RAAchievement } from '../../lib/retroachievements';
import LoginForm from './LoginForm';
import SettingsTab from './SettingsTab';
import AchievementsTab from './AchievementsTab';

type TabType = 'achievements' | 'settings';

export interface RASidebarProps {
  isOpen: boolean;
  onClose: () => void;
  // Auth
  isLoggedIn: boolean;
  credentials: RACredentials | null;
  isLoading: boolean;
  error?: string | null;
  onLogin: (username: string, password: string) => Promise<boolean>;
  onLogout: () => void;
  // Hardcore
  hardcoreEnabled: boolean;
  onHardcoreChange: (enabled: boolean) => void;
  // Game & Achievements
  currentGame: RAGameExtended | null;
  achievements: RAAchievement[];
  unlockedIds: Set<number>;
}

export default function RASidebar({
  isOpen,
  onClose,
  isLoggedIn,
  credentials,
  isLoading,
  error,
  onLogin,
  onLogout,
  hardcoreEnabled,
  onHardcoreChange,
  currentGame,
  achievements,
  unlockedIds,
}: RASidebarProps) {
  // If logged in and has game, show achievements tab by default
  const defaultTab: TabType = (isLoggedIn && currentGame && achievements.length > 0) ? 'achievements' : 'settings';
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [filter, setFilter] = useState<'all' | 'locked' | 'unlocked'>('all');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset form and tab when sidebar opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setShowPassword(false);
      setLocalError(null);
    } else {
      // Set default tab based on state
      if (isLoggedIn && currentGame && achievements.length > 0) {
        setActiveTab('achievements');
      } else {
        setActiveTab('settings');
      }
    }
  }, [isOpen, isLoggedIn, currentGame, achievements.length]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!username.trim() || !password.trim()) {
      setLocalError('Username and Password are required');
      return;
    }

    const success = await onLogin(username.trim(), password.trim());
    if (success) {
      setPassword('');
    }
  };

  const handleLogout = () => {
    onLogout();
    setUsername('');
    setPassword('');
  };

  if (!isOpen) return null;

  // Achievement stats
  const totalPoints = achievements.reduce((sum, a) => sum + (a.Points || 0), 0);
  const earnedPoints = achievements
    .filter(a => unlockedIds.has(a.ID))
    .reduce((sum, a) => sum + (a.Points || 0), 0);
  const progress = achievements.length > 0
    ? Math.round((unlockedIds.size / achievements.length) * 100)
    : 0;

  // Sort and filter achievements
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.ID);
    const bUnlocked = unlockedIds.has(b.ID);
    if (aUnlocked && !bUnlocked) return 1;
    if (!aUnlocked && bUnlocked) return -1;
    return (a.DisplayOrder || 0) - (b.DisplayOrder || 0);
  });

  const filteredAchievements = sortedAchievements.filter(a => {
    const unlocked = unlockedIds.has(a.ID);
    if (filter === 'locked') return !unlocked;
    if (filter === 'unlocked') return unlocked;
    return true;
  });

  return (
    <div className="koin-scope" style={{ display: 'contents' }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-gray-900 border-l border-yellow-500/20 z-50 flex flex-col shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={18} />
              <span className="font-heading text-sm text-white">RetroAchievements</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs - only show if logged in */}
          {isLoggedIn && (
            <div className="flex gap-1 mt-2 bg-black/30 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('achievements')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'achievements'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <List size={12} />
                Achievements
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-md transition-colors ${activeTab === 'settings'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Settings size={12} />
                Settings
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!isLoggedIn ? (
            <LoginForm
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              isLoading={isLoading}
              error={error || localError}
              onSubmit={handleLogin}
            />
          ) : activeTab === 'settings' ? (
            <SettingsTab
              credentials={credentials!}
              hardcoreEnabled={hardcoreEnabled}
              onHardcoreChange={onHardcoreChange}
              currentGame={currentGame}
              achievementCount={achievements.length}
              unlockedCount={unlockedIds.size}
              progress={progress}
              onLogout={handleLogout}
            />
          ) : (
            <AchievementsTab
              currentGame={currentGame}
              achievements={filteredAchievements}
              unlockedIds={unlockedIds}
              filter={filter}
              setFilter={setFilter}
              totalCount={achievements.length}
              progress={progress}
              earnedPoints={earnedPoints}
              totalPoints={totalPoints}
              isHardcoreMode={hardcoreEnabled}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-800 bg-gray-900/80 text-[10px] text-gray-500 text-center flex-shrink-0">
          Powered by{' '}
          <a
            href="https://retroachievements.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-500 hover:text-yellow-400"
          >
            RetroAchievements.org
          </a>
        </div>
      </div>
    </div>
  );
}
