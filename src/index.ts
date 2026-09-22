export { default as GamePlayer } from './components/GamePlayer';
export * from './components/types';
export * from './hooks/useNostalgist';
export * from './hooks/useGamepad';
export * from './hooks/useToast';
export * from './lib/controls';
export * from './lib/retroachievements';
export * from './lib/systems';
export { default as RASidebar } from './components/RASidebar';
export { default as AchievementPopup } from './components/Overlays/AchievementPopup';
export { default as ToastContainer } from './components/Overlays/ToastContainer';
export { SHADER_PRESETS, type ShaderPresetId } from './lib/shader-presets';
export { default as ShortcutsReference } from './components/UI/ShortcutsReference';
export * from './hooks/useGameRecording';
export * from './lib/rom-cache';
export { ErrorBoundary } from './components/UI/ErrorBoundary';
export type { ErrorBoundaryProps } from './components/UI/ErrorBoundary';

// i18n exports
export { en, es, fr } from './locales';
export type { KoinTranslations, RecursivePartial } from './locales';
export { useKoinTranslation, KoinI18nProvider } from './hooks/useKoinTranslation';
