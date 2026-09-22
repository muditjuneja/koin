import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Nostalgist } from 'nostalgist';
import type { CoopHostBinding } from '../components/types';

interface UseCoopHostBindingOptions {
    coop?: CoopHostBinding;
    /** True from the moment the emulator starts until it stops (pausing keeps it live). */
    live: boolean;
    getNostalgistInstance: () => Nostalgist | null;
    getAudioStream: () => MediaStream | null;
    onAudioAvailable: (listener: () => void) => () => void;
    isPaused: boolean;
    isRewinding: boolean;
}

/**
 * Connects a running emulator to a co-op host session and reports how many
 * guests are connected. Lives in the core bundle but depends only on the
 * CoopHostBinding shape, never on netplay code.
 */
export function useCoopHostBinding({ coop, live, getNostalgistInstance, getAudioStream, onAudioAvailable, isPaused, isRewinding }: UseCoopHostBindingOptions): number {
    const guestsConnected = useSyncExternalStore(
        (onChange) => (coop ? coop.subscribe(onChange) : () => {}),
        () => coop?.state.guestsConnected ?? 0,
        () => 0,
    );

    // Read through a ref so the attachment only follows the session and the
    // emulator's lifetime, never the identity of the callbacks passed in.
    const emulatorRef = useRef({ getNostalgistInstance, getAudioStream, onAudioAvailable });
    emulatorRef.current = { getNostalgistInstance, getAudioStream, onAudioAvailable };

    useEffect(() => {
        if (!coop || !live) return;
        const instance = emulatorRef.current.getNostalgistInstance();
        const canvas = instance?.getCanvas();
        if (!instance || !canvas) return;
        return coop.attachEmulator({
            canvas,
            getEmscripten: () => instance.getEmscripten(),
            getAudioStream: () => emulatorRef.current.getAudioStream(),
            onAudioAvailable: (listener) => emulatorRef.current.onAudioAvailable(listener),
        });
    }, [coop, live]);

    // Guests see the picture freeze or jump; tell them why.
    useEffect(() => {
        if (coop && live && guestsConnected > 0) coop.announce?.(isPaused ? 'paused' : 'resumed');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- announce only on pause changes
    }, [isPaused]);
    useEffect(() => {
        if (coop && live && isRewinding && guestsConnected > 0) coop.announce?.('rewind');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- announce only when rewinding starts
    }, [isRewinding]);

    return guestsConnected;
}
