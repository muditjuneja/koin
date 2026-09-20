/**
 * RetroArch Input Configuration
 * 
 * Converts our control mappings to RetroArch config format.
 */

import { ButtonId, KeyboardMapping, GamepadMapping, ControlConfig, PlayerIndex } from './types';
import { allocateSyntheticKeyboardMappings } from './synthetic-keys';
import { JS_TO_RETROARCH_KEY, toRetroArchKey } from './key-map';

// Re-exported for backward compatibility — the table and converter now live
// in key-map.ts (shared with synthetic-keys.ts to avoid a circular import),
// but this remains the public import path.
export { JS_TO_RETROARCH_KEY, toRetroArchKey };

/**
 * Map our button IDs to RetroArch input names
 */
const BUTTON_TO_RETROARCH: Record<ButtonId, string> = {
    up: 'up',
    down: 'down',
    left: 'left',
    right: 'right',
    a: 'a',
    b: 'b',
    x: 'x',
    y: 'y',
    l: 'l',
    r: 'r',
    l2: 'l2',
    r2: 'r2',
    l3: 'l3',
    r3: 'r3',
    start: 'start',
    select: 'select',
};

/**
 * Convert keyboard mapping to RetroArch config for a player
 */
export function keyboardToRetroArchConfig(
    mapping: KeyboardMapping,
    playerIndex: number = 1
): Record<string, string> {
    const config: Record<string, string> = {};

    for (const [button, jsKeyCode] of Object.entries(mapping)) {
        const raButton = BUTTON_TO_RETROARCH[button as ButtonId];
        if (raButton && jsKeyCode) {
            const raKey = toRetroArchKey(jsKeyCode);
            config[`input_player${playerIndex}_${raButton}`] = raKey;
        }
    }

    return config;
}

/**
 * Convert gamepad mapping to RetroArch config for a player
 * Uses _btn suffix for button indices
 */
export function gamepadToRetroArchConfig(
    mapping: GamepadMapping,
    playerIndex: number = 1
): Record<string, number | string> {
    const config: Record<string, number | string> = {};

    for (const [button, buttonIndex] of Object.entries(mapping)) {
        if (buttonIndex === undefined) continue;

        const raButton = BUTTON_TO_RETROARCH[button as ButtonId];
        if (raButton) {
            config[`input_player${playerIndex}_${raButton}_btn`] = buttonIndex;
        }
    }

    return config;
}

/**
 * Build complete RetroArch input config from control configuration
 */
export function buildRetroArchConfig(config: ControlConfig): Record<string, unknown> {
    const raConfig: Record<string, unknown> = {};

    // Keyboard controls (player 1 only)
    if (config.keyboard) {
        Object.assign(raConfig, keyboardToRetroArchConfig(config.keyboard, 1));
    }

    // Gamepad controls for each player
    if (config.gamepads) {
        config.gamepads.forEach((mapping, index) => {
            if (mapping) {
                Object.assign(raConfig, gamepadToRetroArchConfig(mapping, index + 1));
            }
        });
    }

    // Netplay: give each guest player slot a private, collision-free synthetic
    // keyboard binding so the host can inject their input via
    // nostalgist.pressDown(button, player) — see synthetic-keys.ts. Written up
    // front (rather than only once a guest actually joins) because retroarchConfig
    // is only ever read once, at Nostalgist.prepare() time; there is no live
    // reconfiguration path short of a full restart, and a mid-session guest join
    // must not require one.
    if (config.netplaySlots && config.netplaySlots.length > 0) {
        const { mappings } = allocateSyntheticKeyboardMappings(config.netplaySlots, config.keyboard ?? {});
        for (const [player, mapping] of Object.entries(mappings)) {
            Object.assign(raConfig, keyboardToRetroArchConfig(mapping, Number(player) as PlayerIndex));
        }
    }

    // Explicitly assign gamepads to player slots (required when autodetect is off)
    raConfig.input_player1_joypad_index = 0;
    raConfig.input_player2_joypad_index = 1;
    raConfig.input_player3_joypad_index = 2;
    raConfig.input_player4_joypad_index = 3;

    // Enable analog stick → D-pad for all players
    raConfig.input_player1_analog_dpad_mode = 1;
    raConfig.input_player2_analog_dpad_mode = 1;
    raConfig.input_player3_analog_dpad_mode = 1;
    raConfig.input_player4_analog_dpad_mode = 1;

    return raConfig;
}
