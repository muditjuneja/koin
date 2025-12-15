'use client';

import React from 'react';
import {
  Trophy,
  User,
  Lock,
  ExternalLink,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useKoinTranslation } from '../../hooks/useKoinTranslation';

export interface LoginFormProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginForm({
  username,
  setUsername,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  error,
  onSubmit,
}: LoginFormProps) {
  const t = useKoinTranslation();

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-3">
      <div className="text-center mb-4">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
          <Trophy className="text-yellow-400" size={32} />
        </div>
        <p className="text-gray-400 text-xs">
          {t.retroAchievements.connectAccount}
        </p>
        <a
          href="https://retroachievements.org/createaccount.php"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 hover:text-yellow-300 text-xs inline-flex items-center gap-1 mt-1"
        >
          {t.retroAchievements.createAccount}
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Username */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{t.retroAchievements.username}</label>
        <div className="relative">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.retroAchievements.yourUsername}
            className="w-full pl-8 pr-3 py-2 text-sm bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none transition-colors"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-[10px] text-gray-500 mb-1 uppercase tracking-wider">
          {t.retroAchievements.password}
        </label>
        <div className="relative">
          <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.retroAchievements.yourPassword}
            className="w-full pl-8 pr-9 py-2 text-sm bg-black/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none transition-colors"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="text-red-400 flex-shrink-0" size={12} />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={14} />
            <span>{t.retroAchievements.connecting}</span>
          </>
        ) : (
          <>
            <Trophy size={14} />
            <span>{t.retroAchievements.login}</span>
          </>
        )}
      </button>

      {/* Privacy notice */}
      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-[10px] text-blue-300 leading-relaxed">
          <strong>🔒 {t.retroAchievements.privacy}</strong> {t.retroAchievements.privacyText}
        </p>
      </div>
    </form>
  );
}
