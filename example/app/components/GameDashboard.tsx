'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GamePlayer, Cheat, RACredentials } from 'koin-deck-retro-player';
import { Settings, Save, Upload, Gamepad2, Trophy, Disc, Play, FileCode, User } from 'lucide-react';
import * as SaveManager from '../lib/save-manager';

// System Data matching the main package
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

// Legal Homebrew / Test Suite ROMs
const SAMPLE_ROMS: Record<string, string> = {
    nes: 'https://github.com/pinobatch/240p-test-mini/releases/download/v0.23/240pee.nes', // 240p Test Suite
    gb: 'https://github.com/pinobatch/240p-test-mini/releases/download/v0.23/gb240p.gb', // 240p Test Suite
    gba: 'https://github.com/pinobatch/240p-test-mini/releases/download/v0.23/240pee_mb.gba', // 240p Test Suite
    genesis: 'https://raw.githubusercontent.com/retrobrews/md-games/master/OldTowers/OldTowers.bin', // Old Towers (Homebrew, checking if valid)
};

export default function GameDashboard() {
    // State
    const [selectedSystem, setSelectedSystem] = useState(SYSTEMS[0]);
    const [romFile, setRomFile] = useState<File | null>(null);
    const [biosFile, setBiosFile] = useState<File | null>(null);
    const [romUrl, setRomUrl] = useState<string | null>(null);
    const [biosUrl, setBiosUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // RA State
    const [raUser, setRaUser] = useState<RACredentials | null>(null);

    // Handle File Upload
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
            setRomFile(null); // Clear file if using URL
            setIsPlaying(true);
        } else {
            alert('No sample game available for this system. Please upload a ROM.');
        }
    };

    // Cleanup URL on unmount or change
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

    // RA Login Handler
    const handleRALogin = async (username: string, token: string) => {
        // In a real app, you might verify this token with a server proxy
        // For this demo, we just accept it and set the user
        if (username && token) {
            setRaUser({
                username,
                connectToken: token,
                score: 12345, // Mock score
                avatarUrl: 'https://media.retroachievements.org/UserPic/mudit.png' // Mock avatar
            });
            return true;
        }
        return false;
    };

    if (isPlaying && romUrl) {
        return (
            <div className="fixed inset-0 bg-black z-50">
                <GamePlayer
                    romUrl={romUrl}
                    romId={romFile?.name || romUrl || 'unknown'}
                    system={selectedSystem.id}
                    core={selectedSystem.core}
                    title={romFile?.name || 'Game'}
                    systemColor={selectedSystem.color}
                    biosUrl={biosUrl || undefined}
                    onExit={() => setIsPlaying(false)}

                    // Save Management
                    onSaveState={handleSaveState}
                    onLoadState={handleLoadState}
                    onGetSaveSlots={handleGetSlots}
                    onDeleteSaveState={handleDeleteSlot}

                    // RetroAchievements
                    raUser={raUser}
                    onRALogin={handleRALogin}
                    onRALogout={() => setRaUser(null)}

                    // Cheats
                    cheats={MOCK_CHEATS[selectedSystem.id] || []}

                    // Auto-Save
                    autoSaveInterval={30000}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans selection:bg-purple-500/30">
            <header className="max-w-6xl mx-auto mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent tracking-tight">
                        RETRO SAGA
                    </h1>
                    <p className="text-neutral-400 mt-2 font-medium tracking-wide">NEXT-GEN WEB EMULATION</p>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-full transition-all ${showSettings ? 'bg-purple-500 text-white' : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'}`}
                >
                    <Settings className="w-6 h-6" />
                </button>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: System Selection */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-neutral-200">
                            <Gamepad2 className="text-purple-500" /> SELECT SYSTEM
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {SYSTEMS.map((sys) => (
                                <button
                                    key={sys.id}
                                    onClick={() => setSelectedSystem(sys)}
                                    className={`
                                        p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group
                                        ${selectedSystem.id === sys.id
                                            ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
                                            : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                                        }
                                    `}
                                >
                                    <div className="font-bold text-lg mb-1 relative z-10">{sys.shortName}</div>
                                    <div className="text-xs text-neutral-500 relative z-10">{sys.name}</div>
                                    {selectedSystem.id === sys.id && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="bg-neutral-900/50 rounded-2xl p-8 border border-neutral-800 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Disc className="w-64 h-64" />
                        </div>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-neutral-200 relative z-10">
                            <Disc className="text-pink-500" /> LOAD GAME
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {/* File Upload */}
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 rounded-xl p-8 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group cursor-pointer relative h-64">
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                    accept=".nes,.snes,.smc,.gba,.bin,.gen,.md,.z64,.n64,.iso,.cue,.pbp"
                                />
                                <Upload className="w-12 h-12 text-neutral-600 group-hover:text-purple-400 mb-4 transition-colors" />
                                <p className="text-lg font-medium text-neutral-300 text-center">
                                    {romFile ? romFile.name : 'Drop ROM file here'}
                                </p>
                                <p className="text-sm text-neutral-500 mt-2 text-center">
                                    Supports .nes, .snes, .gba, .gen, .z64, .iso
                                </p>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-4">
                                <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800">
                                    <h3 className="text-sm font-bold text-neutral-400 mb-3 flex items-center gap-2">
                                        <FileCode className="w-4 h-4" /> BIOS FILE (Optional)
                                    </h3>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={handleBiosUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                        />
                                        <button className="w-full py-2 px-4 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors text-left flex items-center justify-between">
                                            <span className="truncate">{biosFile ? biosFile.name : 'Select BIOS...'}</span>
                                            <Upload className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-neutral-950/50 rounded-xl p-4 border border-neutral-800">
                                    <h3 className="text-sm font-bold text-neutral-400 mb-3 flex items-center gap-2">
                                        <Play className="w-4 h-4" /> QUICK PLAY
                                    </h3>
                                    <button
                                        onClick={handleQuickPlay}
                                        disabled={!SAMPLE_ROMS[selectedSystem.id]}
                                        className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors flex items-center justify-center gap-2 font-medium"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Load Sample Game
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        {(romFile || romUrl) && (
                            <div className="mt-8 flex justify-end relative z-10 animate-in slide-in-from-bottom fade-in duration-300">
                                <button
                                    onClick={() => setIsPlaying(true)}
                                    className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/25 hover:scale-105 transition-all flex items-center gap-3 text-lg"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    START GAME
                                </button>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Settings & Info */}
                <div className="space-y-8">
                    {/* RetroAchievements Status */}
                    <section className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-200">
                            <Trophy className="text-yellow-500" /> RETROACHIEVEMENTS
                        </h2>
                        {raUser ? (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <User className="text-green-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-green-400">{raUser.username}</div>
                                    <div className="text-xs text-green-500/70">Logged In</div>
                                </div>
                                <button
                                    onClick={() => setRaUser(null)}
                                    className="ml-auto text-xs text-neutral-500 hover:text-white underline"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-neutral-400">
                                <p className="mb-4">Login to track achievements and compete on leaderboards.</p>
                                <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs text-neutral-500">
                                    Login is handled inside the player interface.
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="bg-neutral-900/50 rounded-2xl p-6 border border-neutral-800">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-200">
                            <Save className="text-green-500" /> FEATURES
                        </h2>
                        <ul className="space-y-4 text-sm text-neutral-400">
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>
                                <div>
                                    <strong className="text-neutral-200 block">Robust Save System</strong>
                                    IndexedDB storage with screenshots and timestamps.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></span>
                                <div>
                                    <strong className="text-neutral-200 block">Controller Support</strong>
                                    Auto-detection for Xbox, PS, and generic gamepads.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></span>
                                <div>
                                    <strong className="text-neutral-200 block">Reliability</strong>
                                    Optimized file system with heavy-load protection.
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5"></span>
                                <div>
                                    <strong className="text-neutral-200 block">RetroAchievements</strong>
                                    Full integration with login, hardcore mode, and popups.
                                </div>
                            </li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}
