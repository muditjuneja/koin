/**
 * Remote players appear to RetroArch as ordinary standard-mapping gamepads.
 *
 * RetroArch's web joypad driver polls `navigator.getGamepads()` every frame
 * for any index it has seen a `gamepadconnected` event for. We wrap
 * `getGamepads` so indices 1-3 return in-memory pads driven by the network,
 * and announce them through RetroArch's own Emscripten handler. Compared to
 * injecting synthetic keyboard events this has no key pool to exhaust, can't
 * collide with RetroArch hotkeys, can't be triggered by the host's physical
 * keyboard, and carries analog sticks.
 *
 * Player N is gamepad index N-1, matching `input_playerN_joypad_index`. The
 * host must bind players 2-4 to DEFAULT_GAMEPAD (see coopRetroArchConfig) so
 * the indices written here mean the buttons we think they mean.
 */

import { ALL_BUTTONS, ButtonId, PlayerIndex } from '../../lib/controls/types';
import { DEFAULT_GAMEPAD } from '../../lib/controls/defaults';
import { COOP_VIRTUAL_GAMEPAD_ID_PREFIX } from '../../lib/controls/coop';
import type { ControllerState } from '../transport/protocol';

interface VirtualButton { pressed: boolean; touched: boolean; value: number }

interface VirtualPad {
    id: string;
    index: number;
    connected: boolean;
    mapping: 'standard';
    timestamp: number;
    axes: number[];
    buttons: VirtualButton[];
    vibrationActuator: null;
    hapticActuators: [];
}

interface JSEventsLike {
    eventHandlers: { eventTypeString: string; eventListenerFunc: (event: unknown) => void }[];
}

export interface EmulatorEventSource {
    getEmscripten(): { JSEvents?: JSEventsLike } | undefined;
}

const STANDARD_BUTTON_COUNT = 17;
const BUTTON_INDEX = new Map<ButtonId, number>(
    ALL_BUTTONS.map((button) => [button, DEFAULT_GAMEPAD[button]]).filter((e): e is [ButtonId, number] => typeof e[1] === 'number'),
);

function makePad(player: PlayerIndex): VirtualPad {
    return {
        id: `${COOP_VIRTUAL_GAMEPAD_ID_PREFIX}${player} (STANDARD GAMEPAD)`,
        index: player - 1,
        connected: true,
        mapping: 'standard',
        timestamp: performance.now(),
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: STANDARD_BUTTON_COUNT }, () => ({ pressed: false, touched: false, value: 0 })),
        vibrationActuator: null,
        hapticActuators: [],
    };
}

export class VirtualGamepadHub {
    private readonly pads = new Map<number, VirtualPad>();
    private originalGetGamepads: Navigator['getGamepads'] | null = null;
    private emulator: EmulatorEventSource | null = null;

    constructor(private readonly players: readonly PlayerIndex[]) {}

    /** Take over the players' gamepad indices and announce them to RetroArch. Idempotent. */
    install(emulator: EmulatorEventSource): void {
        if (this.originalGetGamepads) {
            this.emulator = emulator;
            this.announce('gamepadconnected');
            return;
        }
        for (const player of this.players) this.pads.set(player - 1, makePad(player));

        const original = navigator.getGamepads?.bind(navigator) ?? (() => []);
        this.originalGetGamepads = original;
        navigator.getGamepads = () => {
            const real = Array.from(original() ?? []);
            const length = Math.max(real.length, ...[...this.pads.keys()].map((i) => i + 1));
            return Array.from({ length }, (_, i) => this.pads.get(i) ?? real[i] ?? null) as unknown as (Gamepad | null)[];
        };

        this.emulator = emulator;
        this.announce('gamepadconnected');
    }

    setState(player: PlayerIndex, state: ControllerState): void {
        const pad = this.pads.get(player - 1);
        if (!pad) return;
        for (const [button, index] of BUTTON_INDEX) {
            const pressed = state.buttons.has(button);
            pad.buttons[index] = { pressed, touched: pressed, value: pressed ? 1 : 0 };
        }
        for (let i = 0; i < 4; i++) pad.axes[i] = Math.max(-1, Math.min(1, state.axes[i] ?? 0));
        pad.timestamp = performance.now();
    }

    /** Neutral stick, nothing held. Used when a guest drops, leaves or is kicked. */
    release(player: PlayerIndex): void {
        this.setState(player, { buttons: new Set(), axes: [0, 0, 0, 0] });
    }

    /** Restore the real `getGamepads` and hand indices 1-3 back to any real pads. */
    uninstall(): void {
        if (!this.originalGetGamepads) return;
        for (const player of this.players) this.release(player);
        this.announce('gamepaddisconnected');
        navigator.getGamepads = this.originalGetGamepads;
        const real = Array.from(this.originalGetGamepads() ?? []);
        this.originalGetGamepads = null;
        this.pads.clear();
        for (const pad of real) {
            if (pad && pad.index > 0) this.dispatch('gamepadconnected', pad);
        }
        this.emulator = null;
    }

    private announce(type: 'gamepadconnected' | 'gamepaddisconnected'): void {
        for (const pad of this.pads.values()) this.dispatch(type, pad);
    }

    // RetroArch only polls indices it saw a connected event for. A real
    // GamepadEvent can't carry a synthetic pad, so call Emscripten's
    // registered handler directly, as nostalgist does for keyboard input.
    private dispatch(type: string, gamepad: unknown): void {
        const handlers = this.emulator?.getEmscripten()?.JSEvents?.eventHandlers ?? [];
        const event = { type, gamepad, preventDefault() {}, stopPropagation() {} };
        for (const handler of handlers) {
            if (handler.eventTypeString !== type) continue;
            try {
                handler.eventListenerFunc(event);
            } catch (err) {
                console.error('[netplay] gamepad event handler failed:', err);
            }
        }
    }
}
