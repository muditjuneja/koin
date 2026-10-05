import { createRoot } from 'react-dom/client';
import { useCoopGuest } from '../../../src/netplay/react/hooks';
import CoopGuestScreen from '../../../src/netplay/components/CoopGuestScreen';

const params = new URLSearchParams(location.search);

/**
 * Tokens come from the page's "backend" (the e2e static server). Test knobs:
 * ?token=none sends none; ?tokenRoom, ?tokenPeer, ?tokenName, ?tokenSub,
 * ?tokenRole, ?tokenExpired, ?tokenForged shape the token that gets minted.
 */
const signalingToken = params.get('token') === 'none'
    ? undefined
    : ({ roomCode }: { roomCode: string }) => {
        const q = new URLSearchParams({ room: params.get('tokenRoom') ?? roomCode, peer: params.get('tokenPeer') ?? 'guest' });
        for (const [param, claim] of [['tokenName', 'name'], ['tokenSub', 'sub'], ['tokenRole', 'role'], ['tokenExpired', 'expired'], ['tokenForged', 'forge']]) {
            const value = params.get(param);
            if (value) q.set(claim, value);
        }
        return fetch(`/token?${q}`).then((r) => r.text());
    };

function Guest() {
    const { session } = useCoopGuest({
        signaling: params.get('signal')!,
        roomCode: params.get('room')!,
        signalingToken,
        role: params.get('role') === 'spectator' ? 'spectator' : 'player',
        name: params.get('name') ?? undefined,
        hostGraceMs: Number(params.get('graceMs') ?? 20000),
    });
    (window as unknown as { __guest?: unknown }).__guest = session;
    if (!session) return null;
    return <CoopGuestScreen session={session} system="NES" />;
}

createRoot(document.getElementById('root')!).render(<Guest />);
