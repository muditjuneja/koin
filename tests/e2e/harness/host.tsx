import { createRoot } from 'react-dom/client';
import GamePlayer from '../../../src/components/GamePlayer';
import { useCoopHost } from '../../../src/netplay/react/hooks';

const params = new URLSearchParams(location.search);
const signaling = params.get('signal')!;
const roomCode = params.get('room') ?? undefined;

function Host() {
    const { session } = useCoopHost({ signaling, core: 'fceumm', roomCode, reconnectWindowMs: Number(params.get('reconnectMs') ?? 30000) });
    (window as unknown as { __host?: unknown }).__host = session;
    if (!session) return null;
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <GamePlayer
                romId="input-test"
                romUrl={`${location.origin}/fixtures/input-test.nes`}
                romFileName="input-test.nes"
                system="NES"
                title="Input test"
                core={{ name: 'fceumm', js: `${location.origin}/cores/fceumm_libretro.js`, wasm: `${location.origin}/cores/fceumm_libretro.wasm` }}
                coop={session}
            />
        </div>
    );
}

createRoot(document.getElementById('root')!).render(<Host />);
