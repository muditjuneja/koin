import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/web-component.tsx'],
    format: ['iife'], // IIFE for direct script tag usage
    outDir: 'dist',
    name: 'retro-game-player-element',
    globalName: 'RetroGamePlayer', // Global variable name
    minify: true,
    dts: false, // No legacy dts for the bundle
    splitting: false,
    sourcemap: true,
    clean: false, // Don't clean existing dist
    external: [], // Bundle EVERYTHING (React, ReactDOM, Nostalgist)
    noExternal: ['react', 'react-dom', 'nostalgist', 'lucide-react', 'clsx', 'tailwind-merge', 'framer-motion'],
    injectStyle: true, // Inject CSS into the JS
});
