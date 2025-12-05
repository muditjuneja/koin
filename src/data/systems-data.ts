export interface SystemConfig {
    // Canonical key - the internal identifier (e.g., 'NES', 'GB', 'GBA')
    key: string;

    // Display info
    label: string;           // User-friendly name (e.g., 'Nintendo (NES)')
    fullName: string;        // Full name (e.g., 'Nintendo Entertainment System')
    slug: string;            // URL-friendly (e.g., 'nes')

    // File detection
    extensions: string[];    // File extensions (e.g., ['.nes'])

    // Emulation
    core: string;            // RetroArch core (e.g., 'fceumm')

    // Database matching (LaunchBox)
    dbNames: string[];       // Possible DB names to search for

    // UI
    iconName: string;        // ConsoleIcon component name
    color: string;           // Tailwind hover color class
    accentHex: string;       // Hex color for accents

    // Aliases - other names that should map to this system
    aliases: string[];
}

/**
 * The master system configuration
 * Order matters for display in dropdowns
 */
export const SYSTEMS: SystemConfig[] = [
    // ============ Nintendo ============
    {
        key: 'NES',
        label: 'Nintendo (NES)',
        fullName: 'Nintendo Entertainment System',
        slug: 'nes',
        extensions: ['.nes'],
        core: 'fceumm',
        dbNames: ['NES', 'Nintendo Entertainment System'],
        iconName: 'NES',
        color: 'group-hover:text-[#FF3333]',
        accentHex: '#FF3333',
        aliases: ['NINTENDO ENTERTAINMENT SYSTEM', 'FAMICOM'],
    },
    {
        key: 'SNES',
        label: 'Super Nintendo (SNES)',
        fullName: 'Super Nintendo Entertainment System',
        slug: 'snes',
        extensions: ['.snes', '.smc', '.sfc'],
        core: 'snes9x',
        dbNames: ['SNES', 'Super Nintendo Entertainment System'],
        iconName: 'SNES',
        color: 'group-hover:text-[#AA00FF]',
        accentHex: '#AA00FF',
        aliases: ['SUPER NINTENDO', 'SUPER NINTENDO ENTERTAINMENT SYSTEM', 'SUPER FAMICOM'],
    },
    {
        key: 'N64',
        label: 'Nintendo 64',
        fullName: 'Nintendo 64',
        slug: 'n64',
        extensions: ['.n64', '.z64', '.v64'],
        core: 'mupen64plus_next',
        dbNames: ['N64', 'Nintendo 64'],
        iconName: 'N64',
        color: 'group-hover:text-[#FFD600]',
        accentHex: '#FFD600',
        aliases: ['NINTENDO 64'],
    },
    {
        key: 'GB',
        label: 'Game Boy',
        fullName: 'Game Boy',
        slug: 'gb',
        extensions: ['.gb'],
        core: 'gambatte',
        dbNames: ['Nintendo Game Boy'],
        iconName: 'GB',
        color: 'group-hover:text-[#76FF03]',
        accentHex: '#76FF03',
        aliases: ['GAME BOY', 'GAMEBOY', 'NINTENDO GAME BOY'],
    },
    {
        key: 'GBC',
        label: 'Game Boy Color',
        fullName: 'Game Boy Color',
        slug: 'gbc',
        extensions: ['.gbc'],
        core: 'gambatte',
        dbNames: ['Nintendo Game Boy Color'],
        iconName: 'GBC',
        color: 'group-hover:text-[#F50057]',
        accentHex: '#F50057',
        aliases: ['GAME BOY COLOR', 'GAMEBOY COLOR', 'NINTENDO GAME BOY COLOR'],
    },
    {
        key: 'GBA',
        label: 'Game Boy Advance',
        fullName: 'Game Boy Advance',
        slug: 'gba',
        extensions: ['.gba'],
        core: 'mgba',
        dbNames: ['Nintendo Game Boy Advance'],
        iconName: 'GBA',
        color: 'group-hover:text-[#304FFE]',
        accentHex: '#304FFE',
        aliases: ['GAME BOY ADVANCE', 'GAMEBOY ADVANCE', 'NINTENDO GAME BOY ADVANCE'],
    },
    {
        key: 'VIRTUAL_BOY',
        label: 'Virtual Boy',
        fullName: 'Virtual Boy',
        slug: 'virtualboy',
        extensions: ['.vb'],
        core: 'mednafen_vb',
        dbNames: ['Nintendo Virtual Boy'],
        iconName: 'VIRTUAL_BOY',
        color: 'group-hover:text-[#D50000]',
        accentHex: '#D50000',
        aliases: ['VIRTUAL BOY', 'NINTENDO VIRTUAL BOY'],
    },

    // ============ Sega ============
    {
        key: 'GENESIS',
        label: 'Sega Genesis',
        fullName: 'Sega Genesis / Mega Drive',
        slug: 'genesis',
        extensions: ['.gen', '.md', '.smd', '.bin'],
        core: 'genesis_plus_gx',
        dbNames: ['GENESIS', 'Sega Genesis', 'Sega Mega Drive'],
        iconName: 'GENESIS',
        color: 'group-hover:text-[#2979FF]',
        accentHex: '#2979FF',
        aliases: ['SEGA GENESIS', 'MEGA DRIVE', 'SEGA MEGA DRIVE', 'MEGADRIVE'],
    },
    {
        key: 'MASTER_SYSTEM',
        label: 'Sega Master System',
        fullName: 'Sega Master System',
        slug: 'mastersystem',
        extensions: ['.sms'],
        core: 'gearsystem',
        dbNames: ['Sega Master System'],
        iconName: 'MASTER_SYSTEM',
        color: 'group-hover:text-[#FF3D00]',
        accentHex: '#FF3D00',
        aliases: ['MASTER SYSTEM', 'SEGA MASTER SYSTEM', 'SMS'],
    },
    {
        key: 'GAME_GEAR',
        label: 'Sega Game Gear',
        fullName: 'Sega Game Gear',
        slug: 'gamegear',
        extensions: ['.gg'],
        core: 'gearsystem',
        dbNames: ['Sega Game Gear'],
        iconName: 'GAME_GEAR',
        color: 'group-hover:text-[#1DE9B6]',
        accentHex: '#1DE9B6',
        aliases: ['GAME GEAR', 'SEGA GAME GEAR', 'GG'],
    },

    // ============ Sony ============
    {
        key: 'PS1',
        label: 'PlayStation',
        fullName: 'Sony PlayStation',
        slug: 'ps1',
        extensions: ['.iso', '.cue', '.pbp'],
        core: 'pcsx_rearmed',
        dbNames: ['PLAYSTATION', 'Sony Playstation', 'Sony PlayStation'],
        iconName: 'PS1',
        color: 'group-hover:text-[#448AFF]',
        accentHex: '#448AFF',
        aliases: ['PLAYSTATION', 'PSX', 'PS', 'SONY PLAYSTATION'],
    },

    // ============ NEC ============
    {
        key: 'PC_ENGINE',
        label: 'PC Engine / TurboGrafx-16',
        fullName: 'PC Engine / TurboGrafx-16',
        slug: 'pcengine',
        extensions: ['.pce'],
        core: 'mednafen_pce_fast',
        dbNames: ['PC Engine', 'TurboGrafx-16', 'NEC PC Engine', 'NEC TurboGrafx-16'],
        iconName: 'PC_ENGINE',
        color: 'group-hover:text-[#FF9100]',
        accentHex: '#FF9100',
        aliases: ['PC ENGINE', 'TURBOGRAFX-16', 'TURBOGRAFX', 'PCE', 'TG16'],
    },

    // ============ SNK ============
    {
        key: 'NEOGEO',
        label: 'Neo Geo',
        fullName: 'SNK Neo Geo',
        slug: 'neogeo',
        extensions: ['.neo'],
        core: 'fbalpha2012_neogeo',
        dbNames: ['SNK Neo Geo MVS', 'SNK Neo Geo AES', 'SNK Neo Geo CD', 'Neo Geo'],
        iconName: 'NEOGEO',
        color: 'group-hover:text-[#C62828]',
        accentHex: '#C62828',
        aliases: ['NEO GEO', 'NEO-GEO', 'SNK NEO GEO'],
    },
    {
        key: 'NEOGEO_POCKET',
        label: 'Neo Geo Pocket',
        fullName: 'SNK Neo Geo Pocket',
        slug: 'neogeopocket',
        extensions: ['.ngp'],
        core: 'mednafen_ngp',
        dbNames: ['SNK Neo Geo Pocket'],
        iconName: 'NEOGEO_POCKET',
        color: 'group-hover:text-[#00B0FF]',
        accentHex: '#00B0FF',
        aliases: ['NEO GEO POCKET', 'NGP'],
    },
    {
        key: 'NEOGEO_POCKET_COLOR',
        label: 'Neo Geo Pocket Color',
        fullName: 'SNK Neo Geo Pocket Color',
        slug: 'neogeopocketcolor',
        extensions: ['.ngc'],
        core: 'mednafen_ngp',
        dbNames: ['SNK Neo Geo Pocket Color'],
        iconName: 'NEOGEO_POCKET',
        color: 'group-hover:text-[#FF4081]',
        accentHex: '#FF4081',
        aliases: ['NEO GEO POCKET COLOR', 'NGPC'],
    },

    // ============ Atari ============
    {
        key: 'LYNX',
        label: 'Atari Lynx',
        fullName: 'Atari Lynx',
        slug: 'lynx',
        extensions: ['.lnx'],
        core: 'handy',
        dbNames: ['Atari Lynx'],
        iconName: 'LYNX',
        color: 'group-hover:text-[#FFC400]',
        accentHex: '#FFC400',
        aliases: ['ATARI LYNX'],
    },
    {
        key: 'ATARI_2600',
        label: 'Atari 2600',
        fullName: 'Atari 2600',
        slug: 'atari2600',
        extensions: ['.a26'],
        core: 'stella',
        dbNames: ['Atari 2600'],
        iconName: 'ATARI_2600',
        color: 'group-hover:text-[#E64A19]',
        accentHex: '#E64A19',
        aliases: ['ATARI 2600', 'ATARI2600'],
    },
    {
        key: 'ATARI_7800',
        label: 'Atari 7800',
        fullName: 'Atari 7800',
        slug: 'atari7800',
        extensions: ['.a78'],
        core: 'prosystem',
        dbNames: ['Atari 7800'],
        iconName: 'ATARI_7800',
        color: 'group-hover:text-[#BF360C]',
        accentHex: '#BF360C',
        aliases: ['ATARI 7800', 'ATARI7800'],
    },

    // ============ Other ============
    {
        key: 'WONDERSWAN',
        label: 'WonderSwan',
        fullName: 'Bandai WonderSwan',
        slug: 'wonderswan',
        extensions: ['.ws'],
        core: 'mednafen_wswan',
        dbNames: ['Bandai WonderSwan'],
        iconName: 'WONDERSWAN',
        color: 'group-hover:text-[#00E5FF]',
        accentHex: '#00E5FF',
        aliases: ['WONDERSWAN', 'WONDER SWAN', 'BANDAI WONDERSWAN'],
    },
    {
        key: 'WONDERSWAN_COLOR',
        label: 'WonderSwan Color',
        fullName: 'Bandai WonderSwan Color',
        slug: 'wonderswancolor',
        extensions: ['.wsc'],
        core: 'mednafen_wswan',
        dbNames: ['Bandai WonderSwan Color'],
        iconName: 'WONDERSWAN',
        color: 'group-hover:text-[#00BCD4]',
        accentHex: '#00BCD4',
        aliases: ['WONDERSWAN COLOR', 'WONDER SWAN COLOR', 'BANDAI WONDERSWAN COLOR', 'WSC'],
    },
    {
        key: 'ARCADE',
        label: 'Arcade (MAME)',
        fullName: 'Arcade',
        slug: 'arcade',
        extensions: [],
        core: 'mame2003_plus',
        dbNames: ['Arcade', 'MAME'],
        iconName: 'ARCADE',
        color: 'group-hover:text-[#D500F9]',
        accentHex: '#D500F9',
        aliases: ['MAME', 'CPS1', 'CPS2', 'CPS3'],
    },
];
