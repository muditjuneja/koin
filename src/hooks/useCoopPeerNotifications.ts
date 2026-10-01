import { useEffect, useRef } from 'react';
import type { CoopHostBinding, CoopPeerSummary } from '../components/types';
import type { ToastType, ShowToastOptions } from './useToast';
import { useKoinTranslation } from './useKoinTranslation';

type ShowToast = (message: string, type?: ToastType, options?: ShowToastOptions) => void;

/**
 * Tells the host when a guest joins or leaves the co-op session. A guest
 * counts once its connection is up; a short drop while it reconnects is not
 * announced, only leaving for good (gone from the session's peer list).
 */
export function useCoopPeerNotifications(coop: CoopHostBinding | undefined, showToast: ShowToast): void {
    const t = useKoinTranslation();
    const tRef = useRef(t);
    tRef.current = t;
    const showToastRef = useRef(showToast);
    showToastRef.current = showToast;

    useEffect(() => {
        if (!coop) return;
        // Guests already announced, by peer id
        const announced = new Map<string, CoopPeerSummary>();

        const describe = (peer: CoopPeerSummary) => {
            const name = peer.name || tRef.current.notifications.coopGuestFallbackName;
            return peer.role === 'player' && peer.slot
                ? tRef.current.notifications.coopPlayerJoined.replace('{{name}}', name).replace('{{slot}}', String(peer.slot))
                : tRef.current.notifications.coopSpectatorJoined.replace('{{name}}', name);
        };

        const update = (peers: readonly CoopPeerSummary[] | undefined) => {
            if (!peers) return;
            const present = new Set(peers.map((peer) => peer.peerId));
            for (const peer of peers) {
                if (peer.connected && !announced.has(peer.peerId)) {
                    announced.set(peer.peerId, peer);
                    showToastRef.current(describe(peer), peer.role === 'player' ? 'gamepad' : 'info', {
                        title: tRef.current.notifications.coopJoinedTitle,
                        duration: 4000,
                    });
                }
            }
            for (const [peerId, peer] of announced) {
                if (present.has(peerId)) continue;
                announced.delete(peerId);
                const name = peer.name || tRef.current.notifications.coopGuestFallbackName;
                showToastRef.current(tRef.current.notifications.coopGuestLeft.replace('{{name}}', name), 'info', { duration: 3000 });
            }
        };

        // Guests connected before this mounted (e.g. after a soft restart) are not news
        for (const peer of coop.state.peers ?? []) {
            if (peer.connected) announced.set(peer.peerId, peer);
        }
        return coop.subscribe((state) => update(state.peers));
    }, [coop]);
}
