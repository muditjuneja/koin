import { describe, it, expect } from 'vitest';
import { SHADER_PRESETS } from '../src/lib/shader-presets';
import {
    getAchievementBadgeUrl,
    getUserAvatarUrl,
    RA_MEDIA_BASE,
} from '../src/lib/retroachievements';

describe('Shader Presets Invariants', () => {
    it('contains exactly 10 distinct shader options with unique IDs', () => {
        expect(SHADER_PRESETS.length).toBe(10);
        const ids = SHADER_PRESETS.map(s => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('ensures every preset has a non-empty name and description', () => {
        for (const preset of SHADER_PRESETS) {
            expect(preset.name.trim().length).toBeGreaterThan(0);
            expect(preset.description.trim().length).toBeGreaterThan(0);
        }
    });

    it('first preset represents the "None" option with empty string id', () => {
        expect(SHADER_PRESETS[0].id).toBe('');
        expect(SHADER_PRESETS[0].name).toBe('None');
    });

    it('validates common CRT shaders are present with correct paths', () => {
        const idSet = new Set(SHADER_PRESETS.map(s => s.id));
        expect(idSet.has('crt/crt-lottes')).toBe(true);
        expect(idSet.has('crt/crt-geom')).toBe(true);
        expect(idSet.has('crt/crt-easymode')).toBe(true);
        expect(idSet.has('crt/zfast-crt')).toBe(true);
        expect(idSet.has('handheld/lcd-grid-v2')).toBe(true);
    });
});

describe('RetroAchievements URL Helpers', () => {
    it('constructs badge URLs for unlocked and locked states', () => {
        const unlockedUrl = getAchievementBadgeUrl('12345');
        expect(unlockedUrl).toBe(`${RA_MEDIA_BASE}/Badge/12345.png`);

        const lockedUrl = getAchievementBadgeUrl('12345', true);
        expect(lockedUrl).toBe(`${RA_MEDIA_BASE}/Badge/12345_lock.png`);
    });

    it('constructs user avatar URLs properly', () => {
        const avatarUrl = getUserAvatarUrl('muditjuneja');
        expect(avatarUrl).toBe(`${RA_MEDIA_BASE}/UserPic/muditjuneja.png`);
    });
});
