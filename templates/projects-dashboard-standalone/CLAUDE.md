# Agent guide

This file provides guidance to AI coding agents when working with code in this repository. `AGENTS.md` is a symlink to it.

## What this app is

A serverless Crowdin app: a frontend-only React app that runs in an iframe inside Crowdin / Crowdin Enterprise. There is no backend: the app calls the Crowdin API directly through a pre-authenticated client provided by the SDK.

The toolchain is part of the project (`vite.config.ts`, `lingui.config.mjs`, `biome.json`, `tsconfig.json`, and the custom `scripts/{dev,build,compile-i18n}.mjs`) and is built on `@crowdin/serverless-apps-sdk` alone. The app itself is registered and managed in the Crowdin UI: that is where the bundle is uploaded and the manifest is edited.

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # local dev server on :8080, or the next free port (--port <n> is exact, PORT sets the starting point)
pnpm build        # lingui extract → Vite build → compile catalogs → dist/bundle.zip
pnpm extract      # Lingui: scan src for translatable text, update locales/*.po
pnpm lint         # Biome
pnpm format       # Biome, writes changes
pnpm typecheck    # tsc --noEmit
```

To publish: `pnpm build`, then upload `dist/bundle.zip` in the Crowdin UI and switch the app's bundle to the uploaded archive.

There are no tests.

## The manifest

`manifest.json` declares the app: name, scopes, `modules` (which Crowdin UI slots the app fills; here `organization-menu` and `profile-resources-menu`), and the bundle, which is either `external` (Crowdin loads the app from a URL, e.g. the dev server at `http://localhost:8080/`) or `internal` (Crowdin serves the uploaded `dist/bundle.zip`).

Manifest changes (scopes, modules, name, logo, bundle mode) are applied by hand in the Crowdin UI; keep the local `manifest.json` matching the registered app: it is the source of truth for what the code must register.

`pnpm dev` starts the local server; Crowdin loads the app from it while the registered app's bundle is `external` → `http://localhost:8080/`.

Keep `scopes` least-privilege: declare only what the app's API calls actually need.

## Architecture

- `manifest.json` is described above.
- `src/index.tsx` is the entry point. One `prepare*` call per manifest module (`prepareOrganizationMenu`, `prepareProfileResourcesMenu`, …); keep these in sync with the `modules` section of `manifest.json`.
- `src/modules/dashboard/index.tsx` is a `ModuleContract` (`{ render }`) that mounts React into `#root`, wrapped in `AppI18nProvider` + `AppUiProvider`.
- `src/modules/dashboard/app.tsx` is the actual UI.

### SDK surface (`@crowdin/serverless-apps-sdk`)

- root exports host-iframe interactions: `prepare*Menu`, `resize()` (call it after layout changes; the iframe does not grow on its own), `redirect(url)`
- `/api`: `createCrowdinClient()`, a pre-authenticated `@crowdin/crowdin-api-client`; use `.withFetchAll()` on list calls to page through results
- `/react`: `useCrowdinContext()`, which detects Crowdin vs Enterprise via its `isEnterprise` flag (never infer the edition from module type or URL)
- `/ui`: shadcn-style component kit + `theme.css` (imported in `src/styles.css` alongside Tailwind) + `styles.css`
- `/i18n`: `AppI18nProvider`, wires Lingui to the host locale

### i18n (Lingui)

Source strings live in code via macros (`<Trans>`, `<Plural>`, `` t` ` ``); `pnpm extract` regenerates `locales/*.po`. Locales are declared in `lingui.config.mjs` (`en-US` is the source locale); to add one, extend `locales` there and run `pnpm extract`. `scripts/compile-i18n.mjs` compiles the catalogs to `dist/locales/<locale>.json`.

### Toolchain constraints

The host loads the bundle via a **classic `<script>` tag**, not ESM. This drives most of the config; keep these invariants when touching it:

- Vite library mode, `iife` format, single `dist/app.js`; CSS is injected by JS (`vite-plugin-css-injected-by-js`), no separate stylesheet.
- `process.env.NODE_ENV` is replaced via `define` (an IIFE has no `process`).
- `scripts/dev.mjs` hand-rolls the react-refresh preamble + Vite client bootstrap served as `/app.js`, serves `/locales/` from `dist/`, and applies a CORS allowlist (localhost, `*.bundle.crowdin.net`, plus origins from `CROWDIN_DEV_CORS_ORIGIN`). It passes its own http server to Vite as `server.ws.server` so HMR shares the app's port: in `middlewareMode` Vite would otherwise open a second server on a fixed 24678, which breaks the moment two dev servers run.
- `scripts/build.mjs` runs Vite first, then `compile-i18n.mjs` (Vite's `emptyOutDir` would wipe the catalogs), then zips `dist/` into `dist/bundle.zip` deterministically (fixed 1980 mtime, since fflate rejects mtime 0). Keep that ordering.
