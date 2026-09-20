/**
 * Tracks which buttons are currently held per guest slot, from the absolute
 * input-state messages arriving on the input DataChannel (protocol.ts).
 *
 * Exists for one reason (plan §3 reliability rule / §3a): "On guest
 * disconnect, release every button that slot held — otherwise a dropped
 * guest leaves a key stuck down forever." Input state is absolute, so once
 * a guest's messages stop arriving there is nothing that will naturally
 * clear a held button — RetroArch just keeps seeing the last state it was
 * told. The host must explicitly call pressUp() for whatever this tracker
 * says was held, exactly once, when RoomManager reports the slot
 * disconnected.
 */

import { ButtonId, PlayerIndex } from '../../lib/controls/types';
import { InputState } from '../transport/protocol';

export class HeldButtonsTracker {
    private held = new Map<PlayerIndex, ReadonlySet<ButtonId>>();

    /** Call on every input message received for `slot`. */
    update(slot: PlayerIndex, state: InputState): void {
        this.held.set(slot, state.buttons);
    }

    /** What's currently held for `slot`, without clearing it. */
    getHeld(slot: PlayerIndex): ReadonlySet<ButtonId> {
        return this.held.get(slot) ?? new Set();
    }

    /**
     * Clears `slot`'s tracked state and returns what was held immediately
     * before clearing — the caller should pressUp() each of these exactly
     * once. Call this when a slot disconnects, is kicked, or is released.
     */
    releaseAll(slot: PlayerIndex): ButtonId[] {
        const buttons = this.held.get(slot);
        this.held.delete(slot);
        return buttons ? Array.from(buttons) : [];
    }
}
