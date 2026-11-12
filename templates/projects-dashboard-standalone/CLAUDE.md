# Agent guide

This file provides guidance to AI coding agents when working with code in this repository. `AGENTS.md` is a symlink to it.

## What this app is

A serverless Crowdin app: a frontend-only React app that runs in an iframe inside Crowdin / Crowdin Enterprise. There is no backend: the app calls the Crowdin API directly through a pre-authenticated client provided by the SDK.

The toolchain is part of the project (`vite.config.ts`, `lingui.config.mjs`, `biome.json`, `tsconfig.json`, and the custom `scripts/{dev,build,compile-i18n}.mjs`) and is built on `@crowdin/serverless-apps-sdk` alone. The app itself is installed and managed in the Crowdin UI: that is where its app file (`.crowdinapp`: the manifest plus the build) is uploaded and development mode is switched.

## Commands

Node `^22.19 || ^24` and the package manager whose lockfile the project has (`pnpm-lock.yaml`, `package-lock.json`, `bun.lock` or `bun.lockb`): install with it first and run the scripts below through it, as `npm run dev` or `bun run dev`.

```bash
pnpm dev          # local dev server on :8080, or the next free port (--port <n> is exact, PORT sets the starting point)
pnpm build        # lingui extract → Vite build → compile catalogs → dist/<app-name>.crowdinapp
pnpm extract      # Lingui: scan src for translatable text, update locales/*.po
pnpm lint         # Biome
pnpm format       # Biome, writes changes
pnpm typecheck    # tsc --noEmit
```

To publish: `pnpm build`, then in the app's settings in Crowdin click **Update file**, choose `dist/<app-name>.crowdinapp`, save, and turn **Development mode** off. The file is named after the manifest's `name` (`Projects dashboard` → `projects-dashboard.crowdinapp`).

There are no tests.

## The manifest

`manifest.json` declares the app: name, scopes and `modules` (which Crowdin UI slots the app fills; here `organization-menu` and `profile-resources-menu`). It reaches Crowdin inside the app file, so a manifest change (scopes, modules, name, logo) takes effect only when a new app file is uploaded; the local `manifest.json` is the source of truth.

Where Crowdin loads the app from is not part of the manifest: it is the app's **Development mode** in Crowdin (on: a URL, e.g. the dev server at `http://localhost:8080/`; off: the uploaded build). The `bundle` field in `manifest.json` is there for older versions of the CLI; newer ones and Crowdin ignore it, and `scripts/build.mjs` leaves it out of the app file.

`pnpm dev` starts the local server; Crowdin loads the app from it while the app is in **Development mode** with the URL `http://localhost:8080/`.

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
- `scripts/build.mjs` runs Vite first, then `compile-i18n.mjs` (Vite's `emptyOutDir` would wipe the catalogs), then packs `manifest.json` (without `bundle`) and `dist/` into `dist/<app-name>.crowdinapp` deterministically (fixed 1980 mtime in local time, since fflate rejects an earlier date). Keep that ordering.
