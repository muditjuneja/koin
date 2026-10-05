'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { CoopHostSession, type CoopHostOptions, type CoopHostState } from '../session/host-session';
import { CoopGuestSession, type CoopGuestOptions, type CoopGuestState } from '../session/guest-session';

/**
 * Creates a host session for the component's lifetime and starts it.
 * Pass the session to <GamePlayer coop={session} /> to connect the emulator,
 * and to <CoopHostPanel session={session} /> for the lobby UI.
 *
 * Options are read once, when the session is created; remount (change the
 * component's key) to host with different options.
 */
export function useCoopHost(options: CoopHostOptions | null): { session: CoopHostSession | null; state: CoopHostState | null } {
    const [session, setSession] = useState<CoopHostSession | null>(null);
    const enabled = options !== null;

    useEffect(() => {
        if (!enabled || !options) return;
        const created = new CoopHostSession(options);
        created.start();
        setSession(created);
        return () => {
            created.stop();
            setSession(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- options are read once per session by design
    }, [enabled]);

    return { session, state: useSessionState(session) };
}

/** Joins a room as a guest for the component's lifetime. See useCoopHost for how options are read. */
export function useCoopGuest(options: CoopGuestOptions | null): { session: CoopGuestSession | null; state: CoopGuestState | null } {
    const [session, setSession] = useState<CoopGuestSession | null>(null);
    const key = options ? `${options.roomCode}:${options.role ?? 'player'}` : null;

    useEffect(() => {
        if (!key || !options) return;
        const created = new CoopGuestSession(options);
        created.start();
        setSession(created);
        return () => {
            created.leave();
            setSession(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- a new room/role means a new session; other options are read once
    }, [key]);

    return { session, state: useSessionState(session) };
}

interface Subscribable<T> {
    state: T;
    subscribe(listener: (state: T) => void): () => void;
}

/** Subscribes a component to a session's state snapshots. */
export function useSessionState<T>(session: Subscribable<T> | null): T | null {
    return useSyncExternalStore(
        (onChange) => (session ? session.subscribe(onChange) : () => {}),
        () => (session ? session.state : null),
        () => (session ? session.state : null),
    );
}
