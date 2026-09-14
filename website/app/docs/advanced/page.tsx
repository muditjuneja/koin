import { CodeBlock } from "@/components/ui/CodeBlock";

export default function AdvancedPage() {
    return (
        <div className="space-y-12">
            <section>
                <h1 className="text-4xl md:text-6xl font-display font-black uppercase mb-6">
                    Advanced Configuration
                </h1>
                <p className="text-xl font-mono">
                    Deep dive into shaders, recording, controls, and performance.
                </p>
            </section>

            {/* Shader Pipeline */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-green pb-2 inline-block">
                    CRT Shader Pipeline
                </h2>

                <p className="font-mono text-sm mb-6">
                    The player includes 10 curated shaders from the libretro glsl-shaders collection.
                    Pass the shader ID to the <code>shader</code> prop or let users change it at runtime.
                </p>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full font-mono text-sm border-4 border-black">
                        <thead className="bg-zinc-900 text-white">
                            <tr>
                                <th className="p-3 text-left">ID</th>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Description</th>
                                <th className="p-3 text-left">Best For</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y-2 divide-black">
                            <tr>
                                <td className="p-3 font-bold text-retro-pink">""</td>
                                <td className="p-3">None</td>
                                <td className="p-3">Sharp pixels, no effects</td>
                                <td className="p-3 text-xs">Pixel art purists</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-lottes</td>
                                <td className="p-3">CRT Lottes</td>
                                <td className="p-3">High-quality shadow mask, phosphor glow</td>
                                <td className="p-3 text-xs">Arcade/CRT authenticity</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-easymode</td>
                                <td className="p-3">CRT Easy</td>
                                <td className="p-3">Balanced performance and looks</td>
                                <td className="p-3 text-xs text-retro-green">Default recommendation</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-geom</td>
                                <td className="p-3">CRT Geom</td>
                                <td className="p-3">Curved screen geometry</td>
                                <td className="p-3 text-xs">Classic TV feel</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-hyllian</td>
                                <td className="p-3">CRT Hyllian</td>
                                <td className="p-3">Sharp with subtle scanlines</td>
                                <td className="p-3 text-xs">Clean CRT look</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-nes-mini</td>
                                <td className="p-3">NES Mini</td>
                                <td className="p-3">Simple scanlines like NES Classic</td>
                                <td className="p-3 text-xs">8-bit games</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/zfast-crt</td>
                                <td className="p-3">zFast CRT</td>
                                <td className="p-3">Extremely lightweight</td>
                                <td className="p-3 text-xs text-retro-cyan">Mobile devices</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">crt/crt-potato-cool</td>
                                <td className="p-3">CRT Potato</td>
                                <td className="p-3">Minimal GPU usage</td>
                                <td className="p-3 text-xs">Weak devices</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">handheld/lcd-grid-v2</td>
                                <td className="p-3">LCD Grid</td>
                                <td className="p-3">Game Boy style LCD effect</td>
                                <td className="p-3 text-xs">GB, GBC, GBA, Game Gear</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-bold">scanlines</td>
                                <td className="p-3">Scanlines</td>
                                <td className="p-3">Simple horizontal lines</td>
                                <td className="p-3 text-xs">Light enhancement</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <CodeBlock
                    filename="Shader usage"
                    language="tsx"
                    code={`<GamePlayer
  shader="crt/crt-lottes"
  onShaderChange={(newShader, requiresRestart) => {
    // Some shaders require restart to take effect
    if (requiresRestart) {
      showToast('Shader will apply on restart');
    }
  }}
/>`}
                />
            </section>

            {/* Gameplay Recording */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-cyan pb-2 inline-block">
                    Gameplay Recording
                </h2>

                <p className="font-mono text-sm mb-4">
                    The player uses the MediaRecorder API to capture canvas gameplay as WebM video.
                    Recording works automatically — users press <kbd className="px-2 py-1 bg-zinc-200 rounded">F5</kbd> to toggle.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-green mb-2">Specs</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• <strong>Format:</strong> WebM (VP9 or VP8)</li>
                            <li>• <strong>Frame Rate:</strong> 30 FPS</li>
                            <li>• <strong>Bitrate:</strong> 5 Mbps</li>
                            <li>• <strong>Features:</strong> Pause/resume, duration tracking</li>
                        </ul>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-pink mb-2">Browser Support</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• Chrome, Edge: ✅ VP9</li>
                            <li>• Firefox: ✅ VP8</li>
                            <li>• Safari: ⚠️ Limited (no VP9)</li>
                            <li>• iOS Safari: ❌ Not supported</li>
                        </ul>
                    </div>
                </div>

                <div className="border-4 border-black p-4 bg-zinc-100">
                    <h4 className="font-bold uppercase mb-2">How It Works</h4>
                    <ol className="font-mono text-sm space-y-2">
                        <li>1. User presses <kbd className="px-2 py-0.5 bg-white rounded border">F5</kbd> → Red recording indicator appears</li>
                        <li>2. Canvas stream captured at 30fps via MediaRecorder</li>
                        <li>3. User presses <kbd className="px-2 py-0.5 bg-white rounded border">F5</kbd> again → File downloads as <code>gameplay-[timestamp].webm</code></li>
                    </ol>
                </div>
            </section>

            {/* Keyboard Shortcuts */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-pink pb-2 inline-block">
                    Keyboard Shortcuts
                </h2>

                <p className="font-mono text-sm mb-6">
                    Player shortcuts (separate from game controls). Users can press <kbd className="px-2 py-1 bg-zinc-200 rounded">F1</kbd> to see these in-game.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">F1</div>
                        <div className="text-xs uppercase mt-2 font-mono">Help / Shortcuts</div>
                    </div>
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">F3</div>
                        <div className="text-xs uppercase mt-2 font-mono">FPS Overlay</div>
                    </div>
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">F4</div>
                        <div className="text-xs uppercase mt-2 font-mono">Input Display</div>
                    </div>
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">F5</div>
                        <div className="text-xs uppercase mt-2 font-mono">Record Toggle</div>
                    </div>
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">F9</div>
                        <div className="text-xs uppercase mt-2 font-mono">Mute / Unmute</div>
                    </div>
                    <div className="border-4 border-black p-4 text-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-bold text-3xl font-display">ESC</div>
                        <div className="text-xs uppercase mt-2 font-mono">Close Modal</div>
                    </div>
                </div>
            </section>

            {/* Control System */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-yellow-500 pb-2 inline-block">
                    Control System
                </h2>

                <p className="font-mono text-sm mb-6">
                    The player includes a sophisticated control system with per-console presets,
                    keyboard remapping, and gamepad support.
                </p>

                <h3 className="font-bold uppercase mb-4 text-retro-green">Default Keyboard Layout</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="border-4 border-black p-4 bg-white font-mono text-sm">
                        <h4 className="font-bold mb-2">D-Pad</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span>Up:</span><span className="text-retro-pink">Arrow Up</span>
                            <span>Down:</span><span className="text-retro-pink">Arrow Down</span>
                            <span>Left:</span><span className="text-retro-pink">Arrow Left</span>
                            <span>Right:</span><span className="text-retro-pink">Arrow Right</span>
                        </div>
                    </div>
                    <div className="border-4 border-black p-4 bg-white font-mono text-sm">
                        <h4 className="font-bold mb-2">Face Buttons</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span>A / Cross:</span><span className="text-retro-pink">X</span>
                            <span>B / Circle:</span><span className="text-retro-pink">Z</span>
                            <span>X / Square:</span><span className="text-retro-pink">A</span>
                            <span>Y / Triangle:</span><span className="text-retro-pink">S</span>
                        </div>
                    </div>
                    <div className="border-4 border-black p-4 bg-white font-mono text-sm">
                        <h4 className="font-bold mb-2">Shoulders</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span>L / L1:</span><span className="text-retro-pink">Q</span>
                            <span>R / R1:</span><span className="text-retro-pink">W</span>
                            <span>L2:</span><span className="text-retro-pink">1</span>
                            <span>R2:</span><span className="text-retro-pink">2</span>
                        </div>
                    </div>
                    <div className="border-4 border-black p-4 bg-white font-mono text-sm">
                        <h4 className="font-bold mb-2">System</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <span>Start:</span><span className="text-retro-pink">Enter</span>
                            <span>Select:</span><span className="text-retro-pink">Shift</span>
                            <span>Coin (Arcade):</span><span className="text-retro-pink">Shift</span>
                        </div>
                    </div>
                </div>

                <h3 className="font-bold uppercase mb-4 text-retro-cyan">Gamepad Detection</h3>
                <p className="font-mono text-sm mb-4">
                    The player automatically detects and themes connected controllers:
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="border-4 border-black px-4 py-2 bg-[#107C10] text-white font-mono text-sm">
                        Xbox Controllers
                    </div>
                    <div className="border-4 border-black px-4 py-2 bg-[#003087] text-white font-mono text-sm">
                        PlayStation Controllers
                    </div>
                    <div className="border-4 border-black px-4 py-2 bg-[#E60012] text-white font-mono text-sm">
                        Nintendo Controllers
                    </div>
                    <div className="border-4 border-black px-4 py-2 bg-zinc-600 text-white font-mono text-sm">
                        Generic / Other
                    </div>
                </div>

                <div className="border-4 border-black p-4 bg-zinc-100">
                    <h4 className="font-bold uppercase mb-2">Note on Browser Security</h4>
                    <p className="font-mono text-sm">
                        Browsers require a button press before reporting gamepads (security feature).
                        The player uses requestAnimationFrame polling to detect connections.
                    </p>
                </div>
            </section>

            {/* Emergency Saves */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-purple-500 pb-2 inline-block">
                    Emergency Save System
                </h2>

                <p className="font-mono text-sm mb-4">
                    To prevent progress loss, the player automatically saves when:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-pink mb-2">Tab Hidden</h3>
                        <p className="font-mono text-xs">
                            When user switches tabs or minimizes browser, the <code>visibilitychange</code>
                            event triggers an immediate save via your <code>onAutoSave</code> handler.
                        </p>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-cyan mb-2">Page Unload</h3>
                        <p className="font-mono text-xs">
                            The <code>beforeunload</code> event attempts a final save when the user
                            navigates away or closes the tab.
                        </p>
                    </div>
                </div>

                <div className="mt-4 border-4 border-yellow-500 p-4 bg-yellow-500/10">
                    <p className="font-mono text-sm">
                        <strong>Important:</strong> Emergency saves are only attempted if <code>onAutoSave</code>
                        is provided. Without this handler, no emergency saves occur.
                    </p>
                </div>
            </section>

            {/* Custom Cores */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-green pb-2 inline-block">
                    Custom Cores
                </h2>

                <p className="font-mono text-sm mb-4">
                    Every system in koin already maps to a sensible default core (see the{" "}
                    <a href="/docs/systems" className="underline">System Compatibility</a> page), but
                    you&apos;re not limited to those. The <code>core</code> prop accepts either:
                </p>

                <ul className="list-disc list-inside font-mono text-sm mb-4 space-y-1">
                    <li>a plain core name (string) to override which built-in core is used, or</li>
                    <li>a fully custom, self-hosted libretro core — bring your own WASM build.</li>
                </ul>

                <CodeBlock
                    filename="Bring your own core"
                    language="tsx"
                    code={`// Memoize the core object so it keeps the same reference across renders —
// an inline object literal would otherwise change identity on every render.
const myCore = useMemo(() => ({
  name: 'my_custom_core',
  js: 'https://my-cdn.example.com/cores/my_custom_core_libretro.js',
  wasm: 'https://my-cdn.example.com/cores/my_custom_core_libretro.wasm',
}), []);

<GamePlayer
  system="SNES"
  core={myCore}
  romUrl={romUrl}
  // ...
/>`}
                />

                <div className="mt-4 border-4 border-yellow-500 p-4 bg-yellow-500/10">
                    <p className="font-mono text-sm">
                        <strong>Note:</strong> koin doesn&apos;t compile cores for you — the <code>js</code>
                        /<code>wasm</code> pair must be an Emscripten build of a libretro core (the same
                        format libretro&apos;s buildbot and projects like{" "}
                        <a href="https://github.com/linuxserver/libretro-cores" className="underline">
                            linuxserver/libretro-cores
                        </a>{" "}
                        produce). Serve both files with CORS enabled so the browser can fetch them.
                    </p>
                </div>
            </section>

            {/* Performance Tips */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-black pb-2 inline-block">
                    Performance Tips
                </h2>

                <div className="space-y-4 font-mono text-sm">
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-green mb-2">Use CHD for CD Games</h3>
                        <p>CHD format is compressed and much faster to load than BIN/CUE pairs.</p>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-cyan mb-2">Match Shader to Device</h3>
                        <p>Use <code>crt/zfast-crt</code> on mobile, <code>crt/crt-lottes</code> on desktop.</p>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-pink mb-2">Host ROMs on Same Origin</h3>
                        <p>Avoids CORS overhead and ensures COEP compliance.</p>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-yellow-600 mb-2">Pre-warm the Emulator</h3>
                        <p>
                            Call <code>Nostalgist.configure</code> early to cache WASM modules
                            before the user opens the player.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
