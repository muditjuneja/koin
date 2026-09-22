/**
 * A guest's controller: keyboard, a physical gamepad, and the on-screen
 * touch controller, merged into one absolute ControllerState.
 *
 * Everything held is released when the window loses focus or the tab is
 * hidden — otherwise alt-tabbing away mid-press leaves a button held on the
 * host (the keyup goes to another window).
 */

import { ALL_BUTTONS, ButtonId, GamepadMapping, KeyboardMapping } from '../../lib/controls/types';
import { DEFAULT_GAMEPAD, DEFAULT_KEYBOARD } from '../../lib/controls/defaults';
import { NEUTRAL_AXES, type ControllerState, type StickAxes } from '../transport/protocol';

export interface GuestInputOptions {
    keyboard?: KeyboardMapping;
    gamepad?: GamepadMapping;
    /** Stick values below this magnitude read as 0. Default 0.15. */
    deadzone?: number;
}

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

export class GuestInputController {
    private readonly keyToButton = new Map<string, ButtonId>();
    private readonly gamepadMapping: GamepadMapping;
    private readonly deadzone: number;
    private readonly keys = new Set<ButtonId>();
    private readonly touch = new Set<ButtonId>();
    private padButtons = new Set<ButtonId>();
    private padAxes: StickAxes = NEUTRAL_AXES;
    private last: ControllerState = { buttons: new Set(), axes: NEUTRAL_AXES };
    private raf = 0;
    private target: Window | null = null;
    private detachListeners?: () => void;

    constructor(private readonly onChange: (state: ControllerState) => void, options: GuestInputOptions = {}) {
        for (const [button, code] of Object.entries(options.keyboard ?? DEFAULT_KEYBOARD)) {
            if (code) this.keyToButton.set(code, button as ButtonId);
        }
        this.gamepadMapping = options.gamepad ?? DEFAULT_GAMEPAD;
        this.deadzone = options.deadzone ?? 0.15;
    }

    attach(target: Window = window): void {
        if (this.detachListeners) return;
        this.target = target;
        const onKey = (down: boolean) => (event: KeyboardEvent) => {
            const button = this.keyToButton.get(event.code);
            if (!button) return;
            const el = event.target as HTMLElement | null;
            if (el && (EDITABLE.test(el.tagName) || el.isContentEditable)) return;
            event.preventDefault(); // arrows/space must not scroll the page
            if (event.repeat) return;
            if (down) this.keys.add(button);
            else this.keys.delete(button);
            this.publish();
        };
        const keydown = onKey(true);
        const keyup = onKey(false);
        const releaseAll = () => {
            this.keys.clear();
            this.touch.clear();
            this.padButtons.clear();
            this.padAxes = NEUTRAL_AXES;
            this.publish();
        };
        const visibility = () => {
            if (target.document.hidden) releaseAll();
        };
        target.addEventListener('keydown', keydown);
        target.addEventListener('keyup', keyup);
        target.addEventListener('blur', releaseAll);
        target.document.addEventListener('visibilitychange', visibility);
        this.detachListeners = () => {
            target.removeEventListener('keydown', keydown);
            target.removeEventListener('keyup', keyup);
            target.removeEventListener('blur', releaseAll);
            target.document.removeEventListener('visibilitychange', visibility);
        };
        const poll = () => {
            this.pollGamepad(target.navigator);
            this.raf = target.requestAnimationFrame(poll);
        };
        this.raf = target.requestAnimationFrame(poll);
    }

    detach(): void {
        this.detachListeners?.();
        this.detachListeners = undefined;
        this.target?.cancelAnimationFrame(this.raf);
        this.target = null;
        this.keys.clear();
        this.touch.clear();
        this.padButtons.clear();
        this.padAxes = NEUTRAL_AXES;
        this.publish();
    }

    /** From the on-screen controller. */
    pressVirtual(button: string): void {
        if (!isButton(button)) return;
        this.touch.add(button);
        this.publish();
    }

    releaseVirtual(button: string): void {
        if (!isButton(button)) return;
        this.touch.delete(button);
        this.publish();
    }

    private pollGamepad(nav: Navigator): void {
        const pad = Array.from(nav.getGamepads?.() ?? []).find((p): p is Gamepad => !!p && p.connected && p.mapping === 'standard')
            ?? Array.from(nav.getGamepads?.() ?? []).find((p): p is Gamepad => !!p && p.connected);
        const buttons = new Set<ButtonId>();
        let axes: StickAxes = NEUTRAL_AXES;
        if (pad) {
            for (const button of ALL_BUTTONS) {
                const index = this.gamepadMapping[button];
                if (index !== undefined && pad.buttons[index]?.pressed) buttons.add(button);
            }
            const dz = (v: number | undefined) => (v === undefined || Math.abs(v) < this.deadzone ? 0 : v);
            axes = [dz(pad.axes[0]), dz(pad.axes[1]), dz(pad.axes[2]), dz(pad.axes[3])];
        }
        const changed = axes.some((a, i) => a !== this.padAxes[i]) || !sameSet(buttons, this.padButtons);
        this.padButtons = buttons;
        this.padAxes = axes;
        if (changed) this.publish();
    }

    private publish(): void {
        const buttons = new Set<ButtonId>([...this.keys, ...this.touch, ...this.padButtons]);
        const next: ControllerState = { buttons, axes: this.padAxes };
        if (sameSet(buttons, this.last.buttons) && next.axes.every((a, i) => a === this.last.axes[i])) return;
        this.last = next;
        this.onChange(next);
    }
}

function isButton(value: string): value is ButtonId {
    return (ALL_BUTTONS as string[]).includes(value);
}

function sameSet<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
    if (a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
}
