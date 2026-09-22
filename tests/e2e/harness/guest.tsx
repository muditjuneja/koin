import { createRoot } from 'react-dom/client';
import { useCoopGuest } from '../../../src/netplay/react/hooks';
import CoopGuestScreen from '../../../src/netplay/components/CoopGuestScreen';

const params = new URLSearchParams(location.search);

function Guest() {
    const { session } = useCoopGuest({
        signaling: params.get('signal')!,
        roomCode: params.get('room')!,
        role: params.get('role') === 'spectator' ? 'spectator' : 'player',
        name: params.get('name') ?? undefined,
        hostGraceMs: Number(params.get('graceMs') ?? 20000),
    });
    (window as unknown as { __guest?: unknown }).__guest = session;
    if (!session) return null;
    return <CoopGuestScreen session={session} system="NES" />;
}

createRoot(document.getElementById('root')!).render(<Guest />);
