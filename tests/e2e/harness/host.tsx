import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import GamePlayer from '../../../src/components/GamePlayer';
import { useCoopHost } from '../../../src/netplay/react/hooks';

const params = new URLSearchParams(location.search);
const signaling = params.get('signal')!;
const roomCode = params.get('room') ?? undefined;
/** ?late=1 boots the game single-player; hosting starts when the test calls __startHosting(). */
const late = params.has('late');

/** The page's "backend" (the e2e static server) mints join tokens. ?tokenPeer=guest tries to host with a guest token. */
const signalingToken = ({ roomCode }: { roomCode: string }) =>
    fetch(`/token?${new URLSearchParams({ room: roomCode, peer: params.get('tokenPeer') ?? 'host' })}`).then((r) => r.text());

function Host() {
    const [hosting, setHosting] = useState(!late);
    const { session } = useCoopHost(hosting ? { signaling, signalingToken, core: 'fceumm', roomCode, reconnectWindowMs: Number(params.get('reconnectMs') ?? 30000) } : null);
    Object.assign(window, { __host: session, __startHosting: () => setHosting(true) });
    if (!session && !late) return null;
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <GamePlayer
                romId="input-test"
                romUrl={`${location.origin}/fixtures/input-test.nes`}
                romFileName="input-test.nes"
                system="NES"
                title="Input test"
                core={{ name: 'fceumm', js: `${location.origin}/cores/fceumm_libretro.js`, wasm: `${location.origin}/cores/fceumm_libretro.wasm` }}
                coop={session ?? undefined}
            />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<Host />);
