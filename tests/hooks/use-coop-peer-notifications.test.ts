// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoopPeerNotifications } from '../../src/hooks/useCoopPeerNotifications';
import type { CoopHostBinding, CoopPeerSummary } from '../../src/components/types';

function fakeSession(initial: CoopPeerSummary[] = []) {
    let state = { guestsConnected: 0, peers: initial };
    const listeners = new Set<(s: typeof state) => void>();
    const binding: CoopHostBinding = {
        get state() { return state; },
        subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
        attachEmulator: () => () => {},
    };
    const set = (peers: CoopPeerSummary[]) => {
        state = { guestsConnected: peers.filter((p) => p.connected).length, peers };
        listeners.forEach((l) => l(state));
    };
    return { binding, set };
}

const ana = { peerId: 'p1', role: 'player', slot: 2, name: 'ana', connected: true } as const;

describe('useCoopPeerNotifications', () => {
    it('announces a player once their connection is up, and when they leave', () => {
        const { binding, set } = fakeSession();
        const showToast = vi.fn();
        renderHook(() => useCoopPeerNotifications(binding, showToast));

        act(() => set([{ ...ana, connected: false }]));
        expect(showToast).not.toHaveBeenCalled();

        act(() => set([ana]));
        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast.mock.calls[0][0]).toBe('ana joined as Player 2');
        expect(showToast.mock.calls[0][1]).toBe('gamepad');

        act(() => set([ana]));
        expect(showToast).toHaveBeenCalledTimes(1);

        act(() => set([]));
        expect(showToast).toHaveBeenCalledTimes(2);
        expect(showToast.mock.calls[1][0]).toBe('ana left the session');
    });

    it('does not re-announce a guest who drops briefly and reconnects', () => {
        const { binding, set } = fakeSession();
        const showToast = vi.fn();
        renderHook(() => useCoopPeerNotifications(binding, showToast));
        act(() => set([ana]));
        act(() => set([{ ...ana, connected: false }]));
        act(() => set([ana]));
        expect(showToast).toHaveBeenCalledTimes(1);
    });

    it('names spectators as watching and falls back when there is no name', () => {
        const { binding, set } = fakeSession();
        const showToast = vi.fn();
        renderHook(() => useCoopPeerNotifications(binding, showToast));
        act(() => set([{ peerId: 's1', role: 'spectator', connected: true }]));
        expect(showToast.mock.calls[0][0]).toBe('A friend is watching');
    });

    it('stays quiet about guests already connected when it mounts', () => {
        const { binding, set } = fakeSession([ana]);
        const showToast = vi.fn();
        renderHook(() => useCoopPeerNotifications(binding, showToast));
        act(() => set([ana]));
        expect(showToast).not.toHaveBeenCalled();
    });
});
