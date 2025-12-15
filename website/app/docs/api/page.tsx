export default function ApiPage() {
    return (
        <div className="space-y-12">
            <section>
                <h1 className="text-4xl md:text-6xl font-display font-black uppercase mb-6">
                    API Reference
                </h1>
                <p className="text-xl font-mono">
                    Complete props reference for the <code>GamePlayer</code> component.
                </p>
            </section>

            {/* Core Props */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-green pb-2 inline-block">
                    Core Configuration
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Required</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold text-retro-pink">romId</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-retro-green">Yes</td>
                                <td className="p-3">Unique identifier for this ROM (used for saving)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold text-retro-pink">romUrl</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-retro-green">Yes</td>
                                <td className="p-3">URL to the ROM file</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold text-retro-pink">system</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-retro-green">Yes</td>
                                <td className="p-3">Console key (NES, SNES, GBA, PS1, etc.)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold text-retro-pink">title</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-retro-green">Yes</td>
                                <td className="p-3">Display name for the game</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">romFileName</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-zinc-400">No</td>
                                <td className="p-3">Original filename (important for Arcade/MAME)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">core</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-zinc-400">No</td>
                                <td className="p-3">Override automatic core selection (e.g., 'gpsp' vs 'mgba')</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">biosUrl</td>
                                <td className="p-3">string | object</td>
                                <td className="p-3 text-zinc-400">No</td>
                                <td className="p-3">BIOS URL or config with location option</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">shader</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-zinc-400">No</td>
                                <td className="p-3">Initial shader (e.g., 'crt/crt-lottes')</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">systemColor</td>
                                <td className="p-3">string</td>
                                <td className="p-3 text-zinc-400">No</td>
                                <td className="p-3">Hex color for UI accents (e.g., '#FF3333')</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Save Props */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-cyan pb-2 inline-block">
                    Save System
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">onSaveState</td>
                                <td className="p-3 text-xs">(slot: number, blob: Blob, screenshot?: string) ={">"} Promise</td>
                                <td className="p-3">Save state to your backend</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onLoadState</td>
                                <td className="p-3 text-xs">(slot: number) ={">"} Promise{"<"}Blob | null{">"}</td>
                                <td className="p-3">Load state from your backend</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onAutoSave</td>
                                <td className="p-3 text-xs">(blob: Blob, screenshot?: string) ={">"} Promise</td>
                                <td className="p-3">Periodic auto-save callback</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onGetSaveSlots</td>
                                <td className="p-3 text-xs">() ={">"} Promise{"<"}SaveSlot[]{">"}</td>
                                <td className="p-3">Fetch available save slots</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onDeleteSaveState</td>
                                <td className="p-3 text-xs">(slot: number) ={">"} Promise</td>
                                <td className="p-3">Delete a save slot</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">autoSaveInterval</td>
                                <td className="p-3">number</td>
                                <td className="p-3">Auto-save interval in ms (default: 60000)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">initialSaveState</td>
                                <td className="p-3">Blob</td>
                                <td className="p-3">Pre-load a save state on boot</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">maxSlots</td>
                                <td className="p-3">number</td>
                                <td className="p-3">Limit available slots (for tiered access)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">currentTier</td>
                                <td className="p-3">string</td>
                                <td className="p-3">User tier label (shown in upgrade prompt)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onUpgrade</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">Called when user clicks upgrade button</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Lifecycle Props */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-pink pb-2 inline-block">
                    Lifecycle Events
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">onReady</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">Emulator core fully loaded</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onError</td>
                                <td className="p-3">(error: Error) ={">"} void</td>
                                <td className="p-3">Fatal error (WASM crash, etc.)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onExit</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">User clicked Exit button</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onSessionStart</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">Game loop started</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onSessionEnd</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">Game session ended</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onScreenshotCaptured</td>
                                <td className="p-3">(image: string | Blob) ={">"} void</td>
                                <td className="p-3">Screenshot taken by user</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onShaderChange</td>
                                <td className="p-3">(shader: string, requiresRestart: boolean) ={">"} void</td>
                                <td className="p-3">User changed shader preset</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* RA Props */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-yellow-500 pb-2 inline-block">
                    RetroAchievements
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">retroAchievementsConfig</td>
                                <td className="p-3 text-xs">{"{ username, token, hardcore? }"}</td>
                                <td className="p-3">Enable RA integration</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raUser</td>
                                <td className="p-3">RACredentials | null</td>
                                <td className="p-3">Logged-in user data</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raGame</td>
                                <td className="p-3">RAGameExtended | null</td>
                                <td className="p-3">Current game RA data</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raAchievements</td>
                                <td className="p-3">RAAchievement[]</td>
                                <td className="p-3">Achievement list</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raUnlockedAchievements</td>
                                <td className="p-3">Set{"<"}number{">"}</td>
                                <td className="p-3">IDs of unlocked achievements</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raIsLoading</td>
                                <td className="p-3">boolean</td>
                                <td className="p-3">RA data loading state</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">raError</td>
                                <td className="p-3">string | null</td>
                                <td className="p-3">RA error message</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onRALogin</td>
                                <td className="p-3">(user, pass) ={">"} Promise{"<"}boolean{">"}</td>
                                <td className="p-3">Login handler</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onRALogout</td>
                                <td className="p-3">() ={">"} void</td>
                                <td className="p-3">Logout handler</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onRAHardcoreChange</td>
                                <td className="p-3">(enabled: boolean) ={">"} void</td>
                                <td className="p-3">Hardcore toggle handler</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Cheats */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-purple-500 pb-2 inline-block">
                    Cheats
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">cheats</td>
                                <td className="p-3 text-xs">Cheat[]</td>
                                <td className="p-3">Available cheats: {"{ id, code, description }"}</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onToggleCheat</td>
                                <td className="p-3 text-xs">(id: number, active: boolean) ={">"} void</td>
                                <td className="p-3">Called when user toggles a cheat</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* BIOS Selection */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-black pb-2 inline-block">
                    BIOS Selection
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">availableBios</td>
                                <td className="p-3 text-xs">{"{ id, name, description? }[]"}</td>
                                <td className="p-3">List of available BIOS options</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">currentBiosId</td>
                                <td className="p-3">string</td>
                                <td className="p-3">Currently selected BIOS ID</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">onSelectBios</td>
                                <td className="p-3">(biosId: string) ={">"} void</td>
                                <td className="p-3">BIOS selection handler</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Styling */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-black pb-2 inline-block">
                    Styling
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">className</td>
                                <td className="p-3">string</td>
                                <td className="p-3">Additional CSS classes for container</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">style</td>
                                <td className="p-3">React.CSSProperties</td>
                                <td className="p-3">Inline styles for container</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
            {/* Internationalization */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-cyan pb-2 inline-block">
                    Internationalization
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">Prop</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Description</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold">initialLanguage</td>
                                <td className="p-3">{`'en' | 'es' | 'fr'`}</td>
                                <td className="p-3">Initial language (default: &apos;en&apos;)</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">translations</td>
                                <td className="p-3 text-xs">RecursivePartial{`<KoinTranslations>`}</td>
                                <td className="p-3">Partial translation overrides for custom text</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 border-4 border-black p-4 bg-zinc-100">
                    <h4 className="font-bold uppercase mb-2">Exported i18n Utilities</h4>
                    <div className="font-mono text-sm space-y-2">
                        <p><code className="text-retro-pink">en, es, fr</code> — Built-in translation objects</p>
                        <p><code className="text-retro-pink">KoinTranslations</code> — TypeScript interface for translations</p>
                        <p><code className="text-retro-pink">useKoinTranslation()</code> — React hook to access translations</p>
                        <p><code className="text-retro-pink">KoinI18nProvider</code> — Context provider for custom components</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
