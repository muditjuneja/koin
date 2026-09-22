import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VirtualGamepadHub } from './virtual-gamepads';
import { DEFAULT_GAMEPAD } from '../../lib/controls/defaults';

type Pad = { index: number; id: string; buttons: { pressed: boolean; value: number }[]; axes: number[]; connected: boolean; mapping: string };

let realPads: (Pad | null)[];
const events: { type: string; index: number }[] = [];
const emulator = {
    getEmscripten: () => ({
        JSEvents: {
            eventHandlers: ['gamepadconnected', 'gamepaddisconnected', 'keydown'].map((type) => ({
                eventTypeString: type,
                eventListenerFunc: (event: unknown) => events.push({ type, index: (event as { gamepad: Pad }).gamepad.index }),
            })),
        },
    }),
};
const nav = globalThis.navigator as Navigator & { getGamepads: () => (Pad | null)[] };
let original: typeof nav.getGamepads;

beforeEach(() => {
    realPads = [{ index: 0, id: 'host pad', buttons: [], axes: [], connected: true, mapping: 'standard' }, null, null, null];
    original = nav.getGamepads;
    Object.defineProperty(nav, 'getGamepads', { value: () => realPads, configurable: true, writable: true });
    events.length = 0;
});

afterEach(() => {
    Object.defineProperty(nav, 'getGamepads', { value: original, configurable: true, writable: true });
});

describe('VirtualGamepadHub', () => {
    it("serves remote players at indices 1-3, keeps the host's own pad at 0, and announces them to RetroArch", () => {
        const hub = new VirtualGamepadHub([2, 3, 4]);
        hub.install(emulator);
        const pads = nav.getGamepads();
        expect(pads[0]?.id).toBe('host pad');
        expect([1, 2, 3].map((i) => pads[i]?.index)).toEqual([1, 2, 3]);
        expect(events).toEqual([1, 2, 3].map((index) => ({ type: 'gamepadconnected', index })));
        hub.uninstall();
    });

    it('maps controller state onto standard-mapping button indices and axes', () => {
        const hub = new VirtualGamepadHub([2, 3, 4]);
        hub.install(emulator);
        hub.setState(3, { buttons: new Set(['a', 'start', 'up']), axes: [0.5, -1, 0, 0] });
        const pad = nav.getGamepads()[2]!;
        const pressed = pad.buttons.map((b, i) => (b.pressed ? i : -1)).filter((i) => i >= 0);
        expect(pressed).toEqual([DEFAULT_GAMEPAD.a, DEFAULT_GAMEPAD.start, DEFAULT_GAMEPAD.up].sort((x, y) => x! - y!));
        expect(pad.axes).toEqual([0.5, -1, 0, 0]);
        // other players untouched
        expect(nav.getGamepads()[1]!.buttons.some((b) => b.pressed)).toBe(false);

        hub.release(3);
        expect(nav.getGamepads()[2]!.buttons.some((b) => b.pressed)).toBe(false);
        hub.uninstall();
    });

    it('only takes the indices of players that exist on this core', () => {
        const hub = new VirtualGamepadHub([2]);
        hub.install(emulator);
        realPads[2] = { index: 2, id: 'second local pad', buttons: [], axes: [], connected: true, mapping: 'standard' };
        expect(nav.getGamepads()[2]?.id).toBe('second local pad');
        hub.uninstall();
    });

    it('restores the real getGamepads and hands indices back on uninstall', () => {
        const hub = new VirtualGamepadHub([2, 3, 4]);
        hub.install(emulator);
        realPads[1] = { index: 1, id: 'local pad 2', buttons: [], axes: [], connected: true, mapping: 'standard' };
        events.length = 0;
        hub.uninstall();
        expect(nav.getGamepads()[1]?.id).toBe('local pad 2');
        expect(events.filter((e) => e.type === 'gamepaddisconnected').map((e) => e.index)).toEqual([1, 2, 3]);
        // the real pad at index 1 is re-announced so it keeps working
        expect(events.filter((e) => e.type === 'gamepadconnected').map((e) => e.index)).toEqual([1]);
    });
});
