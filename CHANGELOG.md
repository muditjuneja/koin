# Changelog

All notable changes to `koin.js` (`koin-deck-player`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-09-20

### Added
- **Complete Test Harness**: 27 test suites with 195 automated tests (100% pass rate in ~4s) covering:
  - System definitions, resolution, and tier assignments
  - Controls, RetroArch configurations, key mappings, and gamepad mappings
  - ROM caching, deduplication, and failure recovery
  - Save queues, FIFO ordering, and concurrency backpressure
  - Translations (en, es, fr) with 100% key parity
  - CRT shaders and RetroAchievements URL builders
  - Runtime ErrorBoundary recovery and technical details toggle
  - Volume, toast notifications, gamepad detection, and persistence hooks
  - Gameplay recording with MediaRecorder and canvas stream capture
  - Animated visibility transitions and auto-dismissal
  - Modal input capture and Escape cancellation handling
  - Viewport orientation and mobile detection
  - In-game cheat management, persistence, and Emscripten memory injection
  - Save scheduler, manual rewind buffer, and buffer rollover
  - Emulator core status transitions and error handling
  - Headless server-safety contract and distribution package exports
- **Runtime ErrorBoundary**: `<ErrorBoundary />` component with retro CRT error screen to intercept unhandled emulator, WebGL, or render crashes without unmounting host applications.
- **Bundle Size Budget**: Added `size-limit` config `.size-limit.json` and `npm run size` script to enforce payload baselines on `dist/index.mjs` (450 kB limit) and `dist/systems.mjs` (20 kB limit).
- **CI / CD Quality Gates**: Added `.github/workflows/ci.yml` running tests, linting, and build across Node 20 & Node 22 matrix. Updated publish workflow to enforce `npm run verify`.
- **ESLint v10 Flat Config**: Configured `eslint.config.mjs` for TypeScript and React Hooks.

### Fixed
- **Storage Availability & SSR**: Guarded `localStorage` in `useGameCheats.ts`, `usePlayerPersistence.ts`, and `telemetry.ts` against SSR, disabled cookies, and sandboxed iframe environments.
- **Insecure Context Crash**: Guarded `crypto.randomUUID()` in `useToast.ts` with a resilient timestamp fallback for non-secure HTTP LAN testing (`http://192.168.x.x:3000`).
- **Recording Stale Closure**: Fixed `isPaused` duration counter interval in `useGameRecording.ts` using ref mirroring to prevent stale state captures when paused.
- **AudioNode SSR Safety**: Added `typeof AudioNode !== 'undefined'` guard before Web Audio API monkey-patching in `useEmulatorAudio.ts`.
- **Emergency Save Tab Close**: Added queue-busy guard to the `beforeunload` handler in `useAutoSave.ts` to prevent conflicting save attempts during tab exit.
- **Rewind Buffer Retention**: Fixed `useEmulatorSaves.ts` cleanup effect to preserve the active rewind buffer across component re-renders.

### Changed
- Unified `npm run build` to compile the library (`tsup`), Tailwind CSS, and Web Component (`build:element`) in a single step.
