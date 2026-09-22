/**
 * RetroArch configuration for hosting netplay co-op.
 *
 * Remote players reach RetroArch as virtual standard gamepads at indices
 * 1-3 (see netplay/input/virtual-gamepads.ts), so players 2-4 are bound to
 * DEFAULT_GAMEPAD here, overriding any mapping the host saved for a local
 * second controller — the button indices the host writes must mean what
 * the guest pressed.
 *
 * Consoles that only had two controller ports need a multitap for players
 * 3-4. RetroArch 1.22 reads the per-port device type only from remap files,
 * not from retroarch.cfg, so those are written into the emulator filesystem
 * between prepare() and start(). Entries here are verified against the real
 * cores; others stay at the number of players the console supports natively.
 */

import { PlayerIndex } from './types';
import { DEFAULT_GAMEPAD } from './defaults';
import { gamepadToRetroArchConfig } from './retroarch';

const GUEST_PLAYERS: PlayerIndex[] = [2, 3, 4];

export function coopRetroArchConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {
        input_max_users: 4,
        input_remapping_directory: COOP_REMAP_DIRECTORY,
    };
    for (const player of GUEST_PLAYERS) {
        Object.assign(config, gamepadToRetroArchConfig(DEFAULT_GAMEPAD, player));
        config[`input_player${player}_joypad_index`] = player - 1;
        // Standard Gamepad axes: 0/1 left stick, 2/3 right stick.
        config[`input_player${player}_l_x_plus_axis`] = '+0';
        config[`input_player${player}_l_x_minus_axis`] = '-0';
        config[`input_player${player}_l_y_plus_axis`] = '+1';
        config[`input_player${player}_l_y_minus_axis`] = '-1';
        config[`input_player${player}_r_x_plus_axis`] = '+2';
        config[`input_player${player}_r_x_minus_axis`] = '-2';
        config[`input_player${player}_r_y_plus_axis`] = '+3';
        config[`input_player${player}_r_y_minus_axis`] = '-3';
    }
    return config;
}

/**
 * Remote co-op players reach RetroArch as virtual gamepads with this id
 * prefix. koin's own gamepad UI (connect toasts, the mapper, the controller
 * count) must ignore them — they belong to guests, not to the host.
 */
export const COOP_VIRTUAL_GAMEPAD_ID_PREFIX = 'koin netplay player ';

export function isCoopVirtualGamepad(pad: { id: string } | null | undefined): boolean {
    return !!pad && pad.id.startsWith(COOP_VIRTUAL_GAMEPAD_ID_PREFIX);
}

export const COOP_REMAP_DIRECTORY = '/home/web_user/retroarch/userdata/config/remaps';

interface CoopCoreProfile {
    /** Players the core can take in co-op, including the host. */
    maxPlayers: 2 | 3 | 4;
    /** RetroArch's library_name for the core — the remap directory is named after it. */
    libraryName?: string;
    /** Remap file contents enabling the multitap, when one is needed. */
    remap?: string;
}

const PROFILES: Record<string, CoopCoreProfile> = {
    // Four Score: fceumm's explicit "Gamepad" device (RETRO_DEVICE_SUBCLASS(JOYPAD, 1)) on ports 3-4.
    fceumm: { maxPlayers: 4, libraryName: 'FCEUmm', remap: 'input_libretro_device_p3 = "513"\ninput_libretro_device_p4 = "513"\n' },
    // Super Multitap on port 2 (RETRO_DEVICE_JOYPAD_MULTITAP = 257): RetroArch users 2-5 become multitap pads 2-5.
    snes9x: { maxPlayers: 4, libraryName: 'Snes9x', remap: 'input_libretro_device_p2 = "257"\n' },
    mupen64plus_next: { maxPlayers: 4 },
    parallel_n64: { maxPlayers: 4 },
    fbneo: { maxPlayers: 4 },
    mame2003_plus: { maxPlayers: 4 },
    mame2003: { maxPlayers: 4 },
};

/** How many players (host included) co-op supports on this core. Unknown cores get the 2 every console has. */
export function coopMaxPlayers(core: string | undefined): 2 | 3 | 4 {
    return (core && PROFILES[core]?.maxPlayers) || 2;
}

export function coopRemapFile(core: string | undefined): { path: string; contents: string } | null {
    const profile = core ? PROFILES[core] : undefined;
    if (!profile?.remap || !profile.libraryName) return null;
    return {
        path: `${COOP_REMAP_DIRECTORY}/${profile.libraryName}/${profile.libraryName}.rmp`,
        contents: profile.remap,
    };
}
