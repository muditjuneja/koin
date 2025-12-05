// RetroAchievements Types & Helpers
// Extracted from main app for package use

export const RA_MEDIA_BASE = 'https://media.retroachievements.org';

// ==================== Types ====================

export interface RACredentials {
    username: string;
    connectToken: string; // Token from password login (for dorequest.php/Connect API)
    apiKey?: string; // Web API Key (optional, for legacy public API calls)
    score?: number;
    softcoreScore?: number;
    avatarUrl?: string;
}

export interface RAUser {
    User: string;
    Token: string;
    Score: number;
    SoftcoreScore: number;
    Messages: number;
    Permissions: number;
    AccountType: string;
}

export interface RAAchievement {
    ID: number;
    NumAwarded: number;
    NumAwardedHardcore: number;
    Title: string;
    Description: string;
    Points: number;
    TrueRatio: number;
    Author: string;
    DateModified: string;
    DateCreated: string;
    BadgeName: string;
    DisplayOrder: number;
    MemAddr: string; // Achievement trigger conditions
    type: string | null;
    // User progress
    DateEarned?: string;
    DateEarnedHardcore?: string;
}

export interface RAGame {
    ID: number;
    Title: string;
    ConsoleID: number;
    ConsoleName: string;
    ForumTopicID: number;
    Flags: number;
    ImageIcon: string;
    ImageTitle: string;
    ImageIngame: string;
    ImageBoxArt: string;
    Publisher: string;
    Developer: string;
    Genre: string;
    Released: string;
    IsFinal: boolean;
    RichPresencePatch?: string;
    NumAchievements?: number;
    NumDistinctPlayersCasual?: number;
    NumDistinctPlayersHardcore?: number;
}

export interface RAGameExtended extends RAGame {
    Achievements: Record<string, RAAchievement>;
    NumAwardedToUser?: number;
    NumAwardedToUserHardcore?: number;
    UserCompletion?: string;
    UserCompletionHardcore?: string;
}

// ==================== Helpers ====================

/**
 * Get achievement badge URL
 */
export function getAchievementBadgeUrl(badgeName: string, locked = false): string {
    const suffix = locked ? '_lock' : '';
    return `${RA_MEDIA_BASE}/Badge/${badgeName}${suffix}.png`;
}

/**
 * Get user avatar URL
 */
export function getUserAvatarUrl(userPic: string): string {
    return `${RA_MEDIA_BASE}/UserPic/${userPic}.png`;
}
