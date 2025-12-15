import { CodeBlock } from "@/components/ui/CodeBlock";

export default function I18nPage() {
    return (
        <div className="space-y-12">
            <section>
                <h1 className="text-4xl md:text-6xl font-display font-black uppercase mb-6">
                    Internationalization
                </h1>
                <p className="text-xl font-mono">
                    Built-in multilingual support with English, Spanish, and French translations.
                </p>
            </section>

            {/* Overview */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-green pb-2 inline-block">
                    Overview
                </h2>

                <p className="font-mono text-sm mb-6">
                    The player ships with complete translations for all UI elements in 3 languages.
                    You can use the built-in languages, provide custom overrides, or even implement
                    your own complete translation set.
                </p>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="border-4 border-black p-6 bg-white text-center">
                        <div className="text-6xl mb-4">🇺🇸</div>
                        <div className="font-bold text-lg mb-2">English</div>
                        <code className="text-sm text-retro-pink">en</code>
                        <p className="text-xs mt-2 text-gray-600">Default language</p>
                    </div>
                    <div className="border-4 border-black p-6 bg-white text-center">
                        <div className="text-6xl mb-4">🇪🇸</div>
                        <div className="font-bold text-lg mb-2">Español</div>
                        <code className="text-sm text-retro-pink">es</code>
                        <p className="text-xs mt-2 text-gray-600">Spanish translation</p>
                    </div>
                    <div className="border-4 border-black p-6 bg-white text-center">
                        <div className="text-6xl mb-4">🇫🇷</div>
                        <div className="font-bold text-lg mb-2">Français</div>
                        <code className="text-sm text-retro-pink">fr</code>
                        <p className="text-xs mt-2 text-gray-600">French translation</p>
                    </div>
                </div>
            </section>

            {/* Quick Start */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-cyan pb-2 inline-block">
                    Quick Start
                </h2>

                <p className="font-mono text-sm mb-4">
                    Set the initial language using the <code>initialLanguage</code> prop:
                </p>

                <CodeBlock
                    filename="App.tsx"
                    language="tsx"
                    code={`import { GamePlayer } from 'koin.js';

<GamePlayer
  romUrl="/game.nes"
  system="NES"
  title="Super Mario Bros."
  initialLanguage="es"  // Spanish UI
/>`}
                />
            </section>

            {/* Translation Coverage */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-retro-pink pb-2 inline-block">
                    What's Translated
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-green mb-3">Controls & UI</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• Play, Pause, Reset buttons</li>
                            <li>• Save/Load controls</li>
                            <li>• Speed, Mute, Recording labels</li>
                            <li>• Fullscreen, Help, Keys</li>
                            <li>• Gamepad connection status</li>
                        </ul>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-cyan mb-3">Modals</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• Keyboard shortcuts reference</li>
                            <li>• Control remapping UI</li>
                            <li>• Gamepad configuration</li>
                            <li>• Save slot manager</li>
                            <li>• BIOS selection</li>
                            <li>• Cheat code browser</li>
                        </ul>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-retro-pink mb-3">Overlays</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• Loading & error states</li>
                            <li>• Pause screen</li>
                            <li>• Recording indicator</li>
                            <li>• Performance stats</li>
                            <li>• Toast notifications</li>
                        </ul>
                    </div>
                    <div className="border-4 border-black p-4 bg-white">
                        <h3 className="font-bold uppercase text-yellow-600 mb-3">RetroAchievements</h3>
                        <ul className="font-mono text-sm space-y-1">
                            <li>• Login form</li>
                            <li>• Achievement browser</li>
                            <li>• Hardcore mode toggle</li>
                            <li>• Connection status</li>
                            <li>• Unlock notifications</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Custom Translations */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-yellow-500 pb-2 inline-block">
                    Custom Translations
                </h2>

                <p className="font-mono text-sm mb-4">
                    Override specific strings while keeping the rest of the language intact:
                </p>

                <CodeBlock
                    filename="Partial Override"
                    language="tsx"
                    code={`import { GamePlayer, en, type KoinTranslations } from 'koin.js';

const customTranslations: Partial<KoinTranslations> = {
  controls: {
    ...en.controls,
    play: 'START GAME',
    save: 'CHECKPOINT',
  },
  notifications: {
    ...en.notifications,
    saved: '💾 Progress Saved!',
  }
};

<GamePlayer
  translations={customTranslations}
/>`}
                />

                <div className="mt-6 border-4 border-yellow-500 p-4 bg-yellow-500/10">
                    <p className="font-mono text-sm">
                        <strong>Note:</strong> Custom translations merge deeply with the base language,
                        so you only need to specify the strings you want to change.
                    </p>
                </div>
            </section>

            {/* Advanced Usage */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-black pb-2 inline-block">
                    Advanced: Using the Hook
                </h2>

                <p className="font-mono text-sm mb-4">
                    Access translations in custom components using the exported hook:
                </p>

                <CodeBlock
                    filename="CustomComponent.tsx"
                    language="tsx"
                    code={`import { useKoinTranslation } from 'koin.js';

function CustomButton() {
  const t = useKoinTranslation();
  
  return (
    <button>
      {t.controls.play}
    </button>
  );
}`}
                />

                <h3 className="font-bold uppercase mb-4 mt-6 text-retro-cyan">Using the Provider</h3>
                <p className="font-mono text-sm mb-4">
                    Wrap your custom components with the i18n provider:
                </p>

                <CodeBlock
                    filename="App.tsx"
                    language="tsx"
                    code={`import { KoinI18nProvider, es } from 'koin.js';
import CustomButton from './CustomButton';

<KoinI18nProvider translations={es}>
  <CustomButton />
</KoinI18nProvider>`}
                />

                <div className="mt-6 border-4 border-black p-4 bg-zinc-100">
                    <h4 className="font-bold uppercase mb-2">When to Use</h4>
                    <p className="font-mono text-sm">
                        The <code>GamePlayer</code> component automatically wraps its children in the provider.
                        Only use <code>KoinI18nProvider</code> directly if you're building custom UI outside
                        of the player component.
                    </p>
                </div>
            </section>

            {/* Complete Translation Set */}
            <section>
                <h2 className="text-2xl font-display font-black uppercase mb-4 border-b-4 border-purple-500 pb-2 inline-block">
                    Creating a Complete Translation
                </h2>

                <p className="font-mono text-sm mb-4">
                    To add a new language, implement the full <code>KoinTranslations</code> interface:
                </p>

                <CodeBlock
                    filename="locales/pt.ts"
                    language="typescript"
                    code={`import { KoinTranslations } from 'koin.js';

export const pt: KoinTranslations = {
  controls: {
    play: 'Jogar',
    pause: 'Pausar',
    reset: 'Reiniciar',
    // ... all other control strings
  },
  notifications: {
    saved: 'Estado salvo',
    loaded: 'Estado carregado',
    // ... all notification strings
  },
  // ... implement all required sections
};`}
                />

                <div className="mt-6 border-4 border-black p-4 bg-white">
                    <h4 className="font-bold uppercase mb-2">TypeScript Guarantee</h4>
                    <p className="font-mono text-sm">
                        The <code>KoinTranslations</code> type ensures you don't miss any strings.
                        TypeScript will error if any required translation key is missing.
                    </p>
                </div>
            </section>

            {/* API Reference */}
            <section className="bg-zinc-900 text-white p-6 border-4 border-black">
                <h2 className="text-retro-green font-display text-2xl uppercase mb-4">
                    {"> API Reference_"}
                </h2>
                <div className="font-mono text-sm space-y-4">
                    <div>
                        <code className="text-retro-pink">initialLanguage?: &apos;en&apos; | &apos;es&apos; | &apos;fr&apos;</code>
                        <p className="text-gray-400 mt-1">Set the initial UI language (default: &apos;en&apos;)</p>
                    </div>
                    <div>
                        <code className="text-retro-cyan">translations?: RecursivePartial{`<KoinTranslations>`}</code>
                        <p className="text-gray-400 mt-1">Partial or complete translation overrides</p>
                    </div>
                    <div>
                        <code className="text-retro-pink">useKoinTranslation()</code>
                        <p className="text-gray-400 mt-1">React hook to access current translations</p>
                    </div>
                    <div>
                        <code className="text-retro-cyan">KoinI18nProvider</code>
                        <p className="text-gray-400 mt-1">Context provider for custom components</p>
                    </div>
                    <div>
                        <code className="text-retro-pink">en, es, fr</code>
                        <p className="text-gray-400 mt-1">Built-in translation objects</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
