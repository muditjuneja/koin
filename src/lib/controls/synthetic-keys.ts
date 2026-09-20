/**
 * Synthetic Keyboard Key Allocation for Netplay
 *
 * Background: `nostalgist.pressDown(button, player)` looks up
 * `input_player{player}_{button}` in the RetroArch config and resolves it to
 * a KeyboardEvent.code, then synthesizes a keydown event for it — koin only
 * ever writes that config key for player 1 (see keyboardToRetroArchConfig's
 * default), so calling pressDown for players 2-4 silently no-ops today.
 *
 * This module allocates a *synthetic* keyboard mapping for guest player
 * slots so that config key exists for them too. "Synthetic" because no real
 * key is ever pressed — the chosen JS codes only ever exist to be translated
 * into a RetroArch key name and round-tripped back into a fake keydown event
 * by nostalgist's own press APIs (see useEmulatorInput.ts). What matters is
 * only that each guest's RetroArch key names are unique and don't collide
 * with the host's real keyboard bindings or koin's global hotkeys — if they
 * did, a guest's button press would also fire whatever the host's key (or a
 * hotkey) is bound to.
 */

import { ALL_BUTTONS, ButtonId, KeyboardMapping, PlayerIndex } from './types';
import { JS_TO_RETROARCH_KEY, toRetroArchKey } from './key-map';

/**
 * RetroArch key names reserved for koin's own global hotkeys, configured
 * unconditionally in useEmulatorCore.ts's prepareOptions.retroarchConfig.
 * These fire on the physical key regardless of which player "owns" it, so a
 * synthetic guest binding must never reuse one — a guest's "select" button
 * landing on 'y', for instance, would also toggle the cheat index every time
 * they pressed it.
 *
 * Kept as a small manual list rather than introspecting the prepare config,
 * since these are static across every session; update this if
 * useEmulatorCore.ts's hotkey bindings ever change.
 */
export const RESERVED_HOTKEY_RA_NAMES: ReadonlySet<string> = new Set([
    'f9',       // input_audio_mute
    'y',        // input_cheat_index_plus
    't',        // input_cheat_index_minus
    'u',        // input_cheat_toggle
    'add',      // input_volume_up
    'subtract', // input_volume_down
]);

/**
 * RetroArch key names that nostalgist's own reverse lookup (RA name -> JS
 * KeyboardEvent.code, used internally by press/pressDown/pressUp) cannot
 * resolve, so a press targeting one silently no-ops. Two distinct failure
 * modes, both fatal for a synthetic binding:
 *   - explicitly mapped to '' in nostalgist's keyboardCodeMap (backslash,
 *     tilde — tilde isn't reachable via koin's own forward table today, kept
 *     here defensively in case that ever changes);
 *   - not in that map at all, and not matched by any of its numeric-prefix
 *     rules (single letter / f1-f12 / 4-char "numN" / 7-char "keypadN") —
 *     this is the entire "kpN"/"kp_multiply"/"kp_divide" family produced by
 *     koin's own Numpad*-to-RA-name entries, plus "apostrophe" (from Quote).
 *
 * This list was found by exhaustively resolving every entry in
 * JS_TO_RETROARCH_KEY through a faithful port of nostalgist's actual
 * resolution logic (see synthetic-keys.test.ts) — not by inspection, since
 * inspection alone missed 12 of these 14. It also means these same JS codes
 * are unsafe for *player 1's own* keyboard remapping if koin ever calls
 * pressDown/pressUp for the host (e.g. the on-screen VirtualController): a
 * user who maps a button to Numpad0-9, NumpadMultiply, NumpadDivide,
 * Backslash or Quote would have real key input work (RetroArch parses its
 * own config independently) but any *synthetic* press for that button
 * silently do nothing. That's a pre-existing bug in koin unrelated to
 * netplay, orthogonal to this allocator, and out of scope here — flagged
 * for a separate fix.
 *
 * Verified against nostalgist@0.21.1's dist/nostalgist.js keyboardCodeMap;
 * re-verify (synthetic-keys.test.ts does this automatically) if the
 * nostalgist dependency version changes.
 */
export const UNRESOLVABLE_RA_NAMES: ReadonlySet<string> = new Set([
    'kp0', 'kp1', 'kp2', 'kp3', 'kp4', 'kp5', 'kp6', 'kp7', 'kp8', 'kp9',
    'kp_multiply', 'kp_divide',
    'backslash',
    'apostrophe',
    'tilde',
]);

/**
 * Every JS KeyboardEvent.code koin knows how to translate to a RetroArch key
 * name, in a fixed order, used as the synthetic-key candidate pool. Object
 * key order is insertion order for string keys in JS, so this is stable
 * across runs as long as JS_TO_RETROARCH_KEY's literal isn't reordered.
 */
const CANDIDATE_JS_CODES: readonly string[] = Object.keys(JS_TO_RETROARCH_KEY);

export interface SyntheticKeyboardAllocation {
    /** guest player index -> synthetic KeyboardMapping, ready to pass through keyboardToRetroArchConfig */
    mappings: Partial<Record<PlayerIndex, KeyboardMapping>>;
    /** RetroArch key names actually consumed by this allocation (diagnostics/tests) */
    usedRaNames: string[];
}

/**
 * Allocate a private, collision-free synthetic keyboard mapping for each
 * given guest player slot.
 *
 * Deterministic: the same `guestPlayers` + `hostKeyboardMapping` always
 * produce the same allocation, since the candidate pool order is fixed and
 * players/buttons are walked in a fixed order.
 *
 * @param guestPlayers Player slots (2-4) needing a synthetic mapping, in the
 *   order they should be allocated.
 * @param hostKeyboardMapping The host's own (player 1) keyboard mapping —
 *   its JS codes are excluded so a guest's synthetic binding can never also
 *   be bound to the host's real controls.
 * @throws if the candidate pool is exhausted before every button for every
 *   requested player is allocated. Should not happen with the standard
 *   pool (96 JS codes) and up to 3 guest players (48 buttons needed) even
 *   after excluding the host's map and koin's hotkeys — see the design
 *   notes in the netplay plan for the margin calculation.
 */
export function allocateSyntheticKeyboardMappings(
    guestPlayers: PlayerIndex[],
    hostKeyboardMapping: KeyboardMapping
): SyntheticKeyboardAllocation {
    const reserved = new Set<string>([...RESERVED_HOTKEY_RA_NAMES, ...UNRESOLVABLE_RA_NAMES]);
    for (const jsCode of Object.values(hostKeyboardMapping)) {
        if (jsCode) reserved.add(toRetroArchKey(jsCode));
    }

    const mappings: Partial<Record<PlayerIndex, KeyboardMapping>> = {};
    const usedRaNames: string[] = [];
    let poolIndex = 0;

    for (const player of guestPlayers) {
        const mapping: KeyboardMapping = {};

        for (const button of ALL_BUTTONS) {
            let allocatedJsCode: string | undefined;

            while (poolIndex < CANDIDATE_JS_CODES.length) {
                const candidate = CANDIDATE_JS_CODES[poolIndex++];
                const raName = toRetroArchKey(candidate);
                if (reserved.has(raName)) continue;

                reserved.add(raName);
                usedRaNames.push(raName);
                allocatedJsCode = candidate;
                break;
            }

            if (!allocatedJsCode) {
                throw new Error(
                    `[koin/netplay] Ran out of synthetic keyboard codes while allocating player ${player}'s ` +
                    `"${button as ButtonId}" button (${CANDIDATE_JS_CODES.length}-code pool, ${reserved.size} already reserved). ` +
                    `This should not happen with koin's standard button set and up to 3 guest players — ` +
                    `check for an unusually large host keyboard mapping.`
                );
            }

            mapping[button] = allocatedJsCode;
        }

        mappings[player] = mapping;
    }

    return { mappings, usedRaNames };
}
