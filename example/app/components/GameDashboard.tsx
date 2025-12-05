'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GamePlayer, Cheat, RACredentials } from 'koin-deck-retro-player';
import { Settings, Gamepad2, Upload, Play, Disc, User, X, ChevronDown } from 'lucide-react';
import * as SaveManager from '../lib/save-manager';

// System Data
const SYSTEMS = [
    { id: 'nes', name: 'Nintendo Entertainment System', shortName: 'NES', color: '#FF3333', core: 'fceumm' },
    { id: 'snes', name: 'Super Nintendo', shortName: 'SNES', color: '#AA00FF', core: 'snes9x' },
    { id: 'n64', name: 'Nintendo 64', shortName: 'N64', color: '#FFD600', core: 'mupen64plus_next' },
    { id: 'gb', name: 'Game Boy', shortName: 'GB', color: '#76FF03', core: 'gambatte' },
    { id: 'gbc', name: 'Game Boy Color', shortName: 'GBC', color: '#F50057', core: 'gambatte' },
    { id: 'gba', name: 'Game Boy Advance', shortName: 'GBA', color: '#304FFE', core: 'mgba' },
    { id: 'genesis', name: 'Sega Genesis', shortName: 'Genesis', color: '#2979FF', core: 'genesis_plus_gx' },
    { id: 'mastersystem', name: 'Sega Master System', shortName: 'SMS', color: '#FF3D00', core: 'gearsystem' },
    { id: 'gamegear', name: 'Sega Game Gear', shortName: 'GG', color: '#1DE9B6', core: 'gearsystem' },
    { id: 'ps1', name: 'PlayStation', shortName: 'PS1', color: '#448AFF', core: 'pcsx_rearmed' },
    { id: 'pcengine', name: 'PC Engine', shortName: 'PCE', color: '#FF9100', core: 'mednafen_pce_fast' },
    { id: 'neogeo', name: 'Neo Geo', shortName: 'NeoGeo', color: '#C62828', core: 'fbalpha2012_neogeo' },
    { id: 'atari2600', name: 'Atari 2600', shortName: '2600', color: '#E64A19', core: 'stella' },
];

const MOCK_CHEATS: Record<string, Cheat[]> = {
    nes: [
        { id: 1, code: '0000-0000', description: 'Infinite Lives (Mock)' },
        { id: 2, code: '0000-0001', description: 'Invincibility (Mock)' },
    ],
    snes: [
        { id: 1, code: '7E000000', description: 'Max Gold (Mock)' },
    ],
};

const SAMPLE_ROMS: Record<string, string> = {
    nes: '/flappybird.nes', // Local file to avoid CORS
    snes: 'https://raw.githubusercontent.com/retrobrews/snes-games/master/AstroHawk/AstroHawk.sfc',
    gb: 'https://raw.githubusercontent.com/retrobrews/gb-games/master/TobuTobuGirl/TobuTobuGirl.gb', // Tobu Tobu Girl (Homebrew)
    gba: 'https://raw.githubusercontent.com/retrobrews/gba-games/master/Anguna/Anguna.gba', // Anguna (Homebrew)
    genesis: 'https://raw.githubusercontent.com/retrobrews/md-games/master/OldTowers/OldTowers.bin',
    mastersystem: 'https://raw.githubusercontent.com/retrobrews/sms-games/master/DiggerChan/DiggerChan.sms',
    gamegear: 'https://raw.githubusercontent.com/retrobrews/gg-games/master/WingWarriors/WingWarriors.gg',
    n64: 'https://raw.githubusercontent.com/retrobrews/n64-games/master/Dexanoid/Dexanoid.z64', // Dexanoid (Homebrew)
    ps1: 'https://github.com/PeterLemon/PSX/raw/master/Demo/Texture/Texture.exe',
    pcengine: 'https://raw.githubusercontent.com/retrobrews/pce-games/master/Reflectron/Reflectron.pce',
};

// Neo-Brutalism Button Component
const NeoButton = ({ onClick, children, className = '', variant = 'primary', disabled = false }: any) => {
    const baseStyle = "border-2 border-black font-bold uppercase transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-[#FFD600] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
        secondary: "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
        danger: "bg-[#FF3333] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
        outline: "bg-transparent border-black shadow-none hover:bg-black hover:text-white"
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className} py-3 px-6 flex items-center justify-center gap-2`}
        >
            {children}
        </button>
    );
};

export default function GameDashboard() {
    const [selectedSystem, setSelectedSystem] = useState(SYSTEMS[0]);
    const [romFile, setRomFile] = useState<File | null>(null);
    const [biosFile, setBiosFile] = useState<File | null>(null);
    const [romUrl, setRomUrl] = useState<string | null>(null);
    const [biosUrl, setBiosUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // RA State
    const [raUser, setRaUser] = useState<RACredentials | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRomFile(file);
            const url = URL.createObjectURL(file);
            setRomUrl(url);
        }
    };

    const handleBiosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBiosFile(file);
            const url = URL.createObjectURL(file);
            setBiosUrl(url);
        }
    };

    const handleQuickPlay = () => {
        const sampleUrl = SAMPLE_ROMS[selectedSystem.id];
        if (sampleUrl) {
            setRomUrl(sampleUrl);
            setRomFile(null);
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        return () => {
            if (romUrl && !romUrl.startsWith('http')) URL.revokeObjectURL(romUrl);
            if (biosUrl) URL.revokeObjectURL(biosUrl);
        };
    }, [romUrl, biosUrl]);

    // Save Handlers
    const handleSaveState = useCallback(async (slot: number, blob: Blob, screenshot?: string) => {
        const id = romFile?.name || romUrl || 'unknown';
        await SaveManager.saveState(id, slot, blob, screenshot);
    }, [romFile, romUrl]);

    const handleLoadState = useCallback(async (slot: number) => {
        const id = romFile?.name || romUrl || 'unknown';
        return await SaveManager.loadState(id, slot);
    }, [romFile, romUrl]);

    const handleGetSlots = useCallback(async () => {
        const id = romFile?.name || romUrl || 'unknown';
        return await SaveManager.getSlots(id);
    }, [romFile, romUrl]);

    const handleDeleteSlot = useCallback(async (slot: number) => {
        const id = romFile?.name || romUrl || 'unknown';
        await SaveManager.deleteSlot(id, slot);
    }, [romFile, romUrl]);

    const handleRALogin = async (username: string, token: string) => {
        if (username && token) {
            setRaUser({
                username,
                connectToken: token,
                score: 12345,
                avatarUrl: 'https://media.retroachievements.org/UserPic/mudit.png'
            });
            return true;
        }
        return false;
    };

    if (isPlaying && romUrl) {
        return (
            <div className="fixed inset-0 bg-[#0f0f0f] z-50">
                <GamePlayer
                    romUrl={romUrl}
                    romId={romFile?.name || romUrl || 'unknown'}
                    system={selectedSystem.id}
                    core={selectedSystem.core}
                    title={romFile?.name || 'Game'}
                    systemColor={selectedSystem.color}
                    biosUrl={biosUrl || undefined}
                    onExit={() => setIsPlaying(false)}
                    onSaveState={handleSaveState}
                    onLoadState={handleLoadState}
                    onGetSaveSlots={handleGetSlots}
                    onDeleteSaveState={handleDeleteSlot}
                    raUser={raUser}
                    onRALogin={handleRALogin}
                    onRALogout={() => setRaUser(null)}
                    cheats={MOCK_CHEATS[selectedSystem.id] || []}
                    autoSaveInterval={30000}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-black font-sans selection:bg-[#FFD600] p-4 flex flex-col justify-center">
            {/* Header */}
            <header className="max-w-xl mx-auto w-full flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center border-4 border-black shadow-[3px_3px_0px_0px_#FFD600]">
                        <Gamepad2 size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase leading-none tracking-tighter">KOIN PLAYER</h1>
                        <p className="text-[9px] font-black bg-black text-[#FFD600] px-1 inline-block tracking-widest mt-0.5">BY THE RETRO SAGA</p>
                    </div>
                </div>

                {raUser ? (
                    <div className="flex items-center gap-3 border-2 border-black bg-white px-3 py-1.5 shadow-[3px_3px_0px_0px_#000]">
                        <div className="w-6 h-6 bg-green-500 border-2 border-black rounded-full flex items-center justify-center">
                            <User size={12} className="text-white" />
                        </div>
                        <div className="hidden md:block">
                            <div className="font-bold text-xs uppercase">{raUser.username}</div>
                            <div className="text-[9px] font-mono leading-none">SCORE: {raUser.score}</div>
                        </div>
                        <button
                            onClick={() => setRaUser(null)}
                            className="ml-2 hover:bg-black hover:text-white p-1 rounded-sm transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="border-2 border-black bg-[#E0E0E0] px-3 py-1 text-[10px] font-bold text-gray-500 shadow-[2px_2px_0px_0px_#000]">
                        GUEST MODE
                    </div>
                )}
            </header>

            {/* Main Command Center */}
            <main className="flex-none w-full">
                <div className="w-full max-w-xl mx-auto">
                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-2 relative">
                        {/* Decorative header strip */}
                        <div className="h-5 bg-black w-full mb-4 flex items-center justify-between px-2">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FF3333]"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FFD600]"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#76FF03]"></div>
                            </div>
                            <span className="text-white font-mono text-[9px] uppercase">v3.0.0 // LAUNCHER</span>
                        </div>

                        <div className="px-6 pb-6 space-y-6">

                            {/* System Selector */}
                            <section>
                                <label className="block font-black text-xs uppercase mb-1.5 flex items-center gap-2">
                                    <Disc size={14} /> Select Platform
                                </label>
                                <div className="relative group">
                                    <select
                                        value={selectedSystem.id}
                                        onChange={(e) => setSelectedSystem(SYSTEMS.find(s => s.id === e.target.value) || SYSTEMS[0])}
                                        className="w-full appearance-none bg-white border-2 border-black p-3 font-bold uppercase cursor-pointer hover:bg-gray-50 focus:bg-[#FFD600]/10 outline-none transition-colors text-sm"
                                    >
                                        {SYSTEMS.map(sys => (
                                            <option key={sys.id} value={sys.id}>
                                                {sys.name} ({sys.shortName})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ChevronDown size={16} />
                                    </div>
                                    <div className="absolute inset-0 border-2 border-black pointer-events-none translate-x-[4px] translate-y-[4px] -z-10 bg-black group-hover:translate-x-[5px] group-hover:translate-y-[5px] transition-transform"></div>
                                </div>
                            </section>

                            <hr className="border-t-2 border-dashed border-gray-300" />

                            {/* ROM Loader */}
                            <section className="space-y-3">
                                <label className="block font-black text-xs uppercase mb-1.5 flex items-center gap-2">
                                    <Upload size={14} /> Load Cartridge
                                </label>

                                <div className="relative group cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".nes,.snes,.smc,.gba,.bin,.gen,.md,.z64,.n64,.iso,.cue,.pbp"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                                    />
                                    <div className={`
                                        border-2 border-black border-dashed p-6 text-center transition-all
                                        ${romFile ? 'bg-[#76FF03]/20 border-solid' : 'bg-gray-50 hover:bg-white'}
                                    `}>
                                        <div className="flex flex-col items-center gap-1.5">
                                            {romFile ? (
                                                <>
                                                    <span className="font-bold text-base break-all">{romFile.name}</span>
                                                    <span className="text-[10px] font-mono bg-black text-white px-2 py-0.5">READY TO BOOT</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="font-bold text-sm text-gray-400 group-hover:text-black">DROP FILE HERE</span>
                                                    <span className="text-[10px] text-gray-400">OR CLICK TO BROWSE</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Hard shadow for dropzone */}
                                    <div className="absolute inset-0 border-2 border-black pointer-events-none translate-x-[4px] translate-y-[4px] -z-10 bg-[#E0E0E0]"></div>
                                </div>

                                {/* BIOS Loader (Mini) */}
                                <div className="flex items-center gap-2">
                                    <div className="relative overflow-hidden flex-1">
                                        <input type="file" onChange={handleBiosUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                        <button className="w-full text-[10px] font-bold border-2 border-black px-3 py-2 text-left hover:bg-gray-100 flex justify-between items-center bg-white">
                                            <span className="truncate">{biosFile ? biosFile.name : 'LOAD BIOS (OPTIONAL)'}</span>
                                            <Upload size={10} />
                                        </button>
                                        <div className="absolute inset-0 border-2 border-black pointer-events-none translate-x-[2px] translate-y-[2px] -z-10 bg-black"></div>
                                    </div>
                                </div>
                            </section>

                            {/* Actions */}
                            <div className="pt-2 flex flex-col gap-3">
                                {romFile || romUrl ? (
                                    <NeoButton onClick={() => setIsPlaying(true)} variant="primary" className="w-full py-3 text-lg">
                                        <Play fill="currentColor" size={20} /> POWER ON
                                    </NeoButton>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <NeoButton
                                            onClick={handleQuickPlay}
                                            variant="secondary"
                                            className="w-full text-xs"
                                            disabled={!SAMPLE_ROMS[selectedSystem.id]}
                                        >
                                            <Play size={14} /> QUICK DEMO
                                        </NeoButton>
                                        <NeoButton variant="outline" disabled className="w-full text-xs opacity-50">
                                            INSERT DISK
                                        </NeoButton>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest space-y-1">
                        <div>
                            <a href="https://koin.theretrosaga.com/" target="_blank" rel="noopener noreferrer" className="hover:text-black hover:underline transition-colors">
                                POWERED BY KOIN DECK
                            </a>
                        </div>
                        <div className="text-[9px] text-gray-300">
                            CORE BUILT ON <a href="https://nostalgist.js.org/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-500 underline">NOSTALGIST.JS</a>
                        </div>
                        <div>v0.1.4</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
