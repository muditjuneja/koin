import Link from "next/link";
import { NeoButton } from "@/components/ui/NeoButton";
import { NeoCard } from "@/components/ui/NeoCard";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { LiveDemo } from "@/components/LiveDemo";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-zinc-900 text-white">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(204,255,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(204,255,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-retro-green/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-retro-pink/20 rounded-full blur-[80px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-12 py-20 md:py-32">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-retro-green/50 bg-retro-green/10 mb-8">
            <span className="w-2 h-2 bg-retro-green rounded-full animate-pulse" />
            <span className="font-mono text-sm text-retro-green">v1.0 — Now on npm!</span>
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-9xl font-display font-black uppercase tracking-tighter leading-[0.85]">
            <span className="bg-retro-green text-black px-2">koin</span>
            <span className="text-white">.js</span>
          </h1>

          <p className="text-xl md:text-3xl font-mono max-w-3xl mt-8 leading-relaxed text-zinc-300">
            The <span className="text-retro-cyan">drop-in React component</span> for
            browser-based retro game emulation. 28 systems. Cloud saves.
            Zero backend required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mt-10">
            <Link href="/docs">
              <NeoButton variant="primary" className="text-lg px-8 py-4">
                Get Started →
              </NeoButton>
            </Link>
            <a href="https://www.npmjs.com/package/koin.js" target="_blank" rel="noopener noreferrer">
              <NeoButton variant="secondary" className="text-lg px-8 py-4">
                npm ↗
              </NeoButton>
            </a>
            <a href="https://github.com/muditjuneja/koin" target="_blank" rel="noopener noreferrer">
              <NeoButton variant="secondary" className="text-lg px-8 py-4">
                GitHub ↗
              </NeoButton>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-8 border-t border-white/10">
            <div>
              <div className="text-4xl font-display font-black text-retro-green">28</div>
              <div className="font-mono text-sm text-zinc-500 uppercase">Systems</div>
            </div>
            <div>
              <div className="text-4xl font-display font-black text-retro-cyan">10</div>
              <div className="font-mono text-sm text-zinc-500 uppercase">CRT Shaders</div>
            </div>
            <div>
              <div className="text-4xl font-display font-black text-retro-pink">~55KB</div>
              <div className="font-mono text-sm text-zinc-500 uppercase">Gzipped</div>
            </div>
            <div>
              <div className="text-4xl font-display font-black text-yellow-400">∞</div>
              <div className="font-mono text-sm text-zinc-500 uppercase">Nostalgia</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-16 bg-zinc-100 border-y-4 border-black">
        <div className="max-w-5xl mx-auto px-4 md:px-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-display font-black uppercase">
              Try It <span className="bg-retro-green px-2">Now</span>
            </h2>
            <p className="font-mono text-zinc-600 mt-2">
              Flappy Bird (NES Homebrew) — fully playable in your browser
            </p>
          </div>

          <LiveDemo />

          <div className="mt-6 text-center">
            <div className="inline-flex flex-wrap justify-center gap-2 font-mono text-xs">
              <span className="border-4 border-black px-3 py-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <kbd className="font-bold">↑↓←→</kbd> Move
              </span>
              <span className="border-4 border-black px-3 py-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <kbd className="font-bold">X</kbd> / <kbd className="font-bold">Z</kbd> Buttons
              </span>
              <span className="border-4 border-black px-3 py-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <kbd className="font-bold">Enter</kbd> Start
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase mb-12 text-center">
            Batteries <span className="bg-retro-cyan px-2">Included</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">Universal Emulation</h3>
              <p className="font-mono text-sm text-zinc-600">
                NES to PlayStation. Game Boy to Arcade. Automatic core selection based on file extension.
              </p>
            </NeoCard>

            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">☁️</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">Cloud-Ready Saves</h3>
              <p className="font-mono text-sm text-zinc-600">
                Slot-based saves with screenshots. Auto-save. Emergency saves on tab close. You provide the backend.
              </p>
            </NeoCard>

            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">Touch Controls</h3>
              <p className="font-mono text-sm text-zinc-600">
                GPU-accelerated virtual D-pad. Multi-touch combos. Per-system button layouts.
              </p>
            </NeoCard>

            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">RetroAchievements</h3>
              <p className="font-mono text-sm text-zinc-600">
                Official RA integration. Unlock achievements. Hardcore mode with restrictions.
              </p>
            </NeoCard>

            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">⏪</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">Rewind Time</h3>
              <p className="font-mono text-sm text-zinc-600">
                Made a mistake? Rewind. Auto-enabled for lightweight 8/16-bit systems.
              </p>
            </NeoCard>

            <NeoCard className="p-6 bg-zinc-50">
              <div className="text-4xl mb-4">📹</div>
              <h3 className="font-display font-bold text-xl uppercase mb-2">Gameplay Recording</h3>
              <p className="font-mono text-sm text-zinc-600">
                Capture gameplay as WebM video. VP9 codec at 30fps. Just press F5.
              </p>
            </NeoCard>
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 bg-zinc-100 border-y-4 border-black">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase mb-12 text-center">
            <span className="bg-retro-pink px-2 text-black">Simple</span> by Design
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-display font-bold text-2xl uppercase mb-4">Minimal Setup</h3>
              <CodeBlock
                filename="App.tsx"
                language="tsx"
                code={`import { GamePlayer } from 'koin.js';

export default function App() {
  return (
    <GamePlayer
      romId="game-123"
      romUrl="/roms/mario.nes"
      system="NES"
      title="Super Mario Bros."
    />
  );
}`}
              />
            </div>

            <div>
              <h3 className="font-display font-bold text-2xl uppercase mb-4">Cloud Integration</h3>
              <CodeBlock
                filename="App.tsx"
                language="tsx"
                code={`<GamePlayer
  romId="game-123"
  romUrl="/roms/game.nes"
  system="NES"
  title="My Game"
  
  // Your backend handlers
  onSaveState={handleSave}
  onLoadState={handleLoad}
  onAutoSave={handleAutoSave}
  
  // Optional theming
  systemColor="#FF3333"
  shader="crt/crt-lottes"
/>`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-12 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black uppercase mb-6">
            Ready to <span className="text-retro-green">Play</span>?
          </h2>
          <p className="font-mono text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Start building your retro gaming platform in minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/docs/installation">
              <NeoButton variant="primary" className="text-lg px-8 py-4">
                Read the Docs
              </NeoButton>
            </Link>
            <Link href="/docs/systems">
              <NeoButton variant="accent" className="text-lg px-8 py-4">
                View All 28 Systems
              </NeoButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-zinc-100 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-display font-black text-2xl uppercase">
            <span className="bg-retro-green text-black px-1">koin</span>.js
          </div>
          <div className="font-mono text-sm text-zinc-500 flex gap-4">
            <a href="https://www.npmjs.com/package/koin.js" target="_blank" className="hover:text-black">npm</a>
            <span>•</span>
            <a href="https://github.com/muditjuneja/koin" target="_blank" className="hover:text-black">GitHub</a>
            <span>•</span>
            <span>MIT Licensed</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
