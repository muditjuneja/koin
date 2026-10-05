import { describe, it, expect } from 'vitest';
import { coopMaxPlayersFor } from '../src/lib/controls/coop';

describe('coopMaxPlayersFor', () => {
    it('makes single-player handhelds watch-only', () => {
        for (const system of ['GB', 'GBC', 'GBA', 'NDS', 'GAME_GEAR', 'LYNX', 'WONDERSWAN', 'NEOGEO_POCKET_COLOR', 'VIRTUAL_BOY']) {
            expect(coopMaxPlayersFor({ system })).toBe(1);
        }
    });

    it('tells Master System and Game Gear apart although they share a core', () => {
        expect(coopMaxPlayersFor({ system: 'MASTER_SYSTEM', core: 'gearsystem' })).toBe(2);
        expect(coopMaxPlayersFor({ system: 'GAME_GEAR', core: 'gearsystem' })).toBe(1);
    });

    it('uses the core profile for consoles, by system alone too', () => {
        expect(coopMaxPlayersFor({ system: 'NES' })).toBe(4);
        expect(coopMaxPlayersFor({ system: 'snes' })).toBe(4);
        expect(coopMaxPlayersFor({ system: 'GENESIS' })).toBe(2);
        expect(coopMaxPlayersFor({ core: 'fceumm' })).toBe(4);
    });
});
