# E2E tests

Real-browser tests that mount the **actual, unmodified `GamePlayer` export**
from `src/index.ts` (the same one a consumer of this package imports) and
drive it with Playwright in headless Chromium — real clicks, real DOM,
real `window.confirm` dialogs, real `React.StrictMode` double-invoke
semantics, matching how `src/web-component.tsx` wraps the tree in
production.

## Why this exists alongside the unit tests

The `tests/*.test.ts` suite (Vitest + jsdom) covers hook logic in
isolation and is the right tool for that — it's fast and it already
catches things like the `StrictMode` double-invoke bug (see
`tests/hooks/use-game-cheats.test.ts`). jsdom is a DOM *emulation*,
though: it doesn't have WebGL, real audio, a real Gamepad API, or a real
`window.confirm` dialog. This suite exists for the things that only a
real browser DOM/API surface can actually verify:

- Clicking a **real rendered button** (found by its real `title`/text, not
  an isolated hook method call) actually reaches the hook through the
  real prop chain — `GamePlayer` → `GameModals` → `SaveSlotModal` /
  `CheatModal` → the callback prop.
- A real native `window.confirm()` dialog, not a jsdom stand-in — see
  `specs/saves.spec.ts`'s three delete-confirmation tests.
- A real (faked) `navigator.getGamepads()` — see `specs/gamepad.spec.ts`.

## What's real and what's faked

Everything is the real package code **except** the `nostalgist` npm
package itself, which is aliased at bundle time (`build.mjs`'s esbuild
`alias` option) to `fixtures/fake-nostalgist.ts`. Real `Nostalgist.prepare()`
downloads a WASM libretro core and a ROM over the network and boots
RetroArch inside an emscripten module — not something to depend on in CI
(network flake, licensing of any ROM fixture, CI minutes). The fake
reaches the same status transitions (`idle → loading → ready → running`)
synchronously with no network calls, so the real `GamePlayer` component
tree, hooks, and UI render and behave exactly as they would with a real
core — everything downstream of "the emulator core is ready" is real.

**Getting the fake's method shapes right matters and is easy to get
wrong silently**: `fake-nostalgist.ts` documents a case where an
incorrect return shape (`saveState()` returning a raw `Uint8Array`
instead of the real `{ state: Blob, thumbnail?: Blob }`) didn't throw
anywhere — `useSaveScheduler.ts` just logged a warning and resolved
`null`, so the save silently no-op'd with no visible error. If bumping
the `nostalgist` package version, diff its `.d.ts` against this fake.

The harness (`fixtures/harness.tsx`) also blocks every cross-origin
request (see `fixtures/test-base.ts`'s `gamePage` fixture) — the real
`GamePlayer` fires a real analytics beacon to
`https://koin.theretrosaga.com/api/telemetry` on mount
(`src/lib/telemetry.ts`), which would otherwise pollute production
telemetry and add a real network dependency to CI. Worth knowing
separately: that beacon fires **twice** per mount, because
`React.StrictMode` double-invokes mount effects and the effect has no
cleanup — since `web-component.tsx` always wraps in `StrictMode`, this
also double-fires in real production usage. That's a pre-existing issue
this PR didn't introduce and doesn't fix.

## Known DOM quirk: buttons are duplicated for responsive layout

`PlayerControls.tsx` renders **two** copies of every control-bar button
at all times (a mobile-drawer copy and a desktop-bar copy) and uses pure
CSS (`sm:hidden` / `hidden sm:flex`) to decide which is visible at the
current viewport — not React conditional rendering. A plain
`button[title="Save"]` always matches two elements. Use the
`controlButton()` helper in `fixtures/test-base.ts`, which appends
`:visible` — don't drop it when adding new selectors.

## Running locally

```bash
npm run test:e2e          # builds the harness bundle, then runs Playwright
npx playwright test --ui  # interactive mode, after an npm run build:e2e
```

Playwright needs a matching Chromium build (`npx playwright install
chromium` if you don't already have one Playwright recognizes).
