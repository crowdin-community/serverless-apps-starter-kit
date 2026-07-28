# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Starter templates for **serverless Crowdin apps**: frontend-only apps that run in an iframe inside Crowdin / Crowdin Enterprise. The templates are consumed by `crowdin-serverless-apps create --template <name>` from [`@crowdin/serverless-apps-cli`](https://github.com/crowdin/serverless-apps). This is not a runnable app at the root: there is no root package.json; each directory under `templates/` is an independent pnpm project.

Both templates implement the **same app** (a projects dashboard) and differ only in who owns the toolchain:

- `templates/projects-dashboard-cli` contains app code only. The `crowdin-serverless-apps` CLI owns Vite, Lingui, Biome, and the base tsconfig (`extends: @crowdin/serverless-apps-cli/tsconfig.base.json`). **Do not add toolchain config files (vite.config, lingui.config, biome.json) to this template**: their absence is the point.
- `templates/projects-dashboard-standalone` owns its full toolchain: `vite.config.ts`, `lingui.config.mjs`, `biome.json`, and custom `scripts/{dev,build,compile-i18n}.mjs` built on `@crowdin/serverless-apps-sdk` alone.

**Invariant: `src/` and `locales/` are byte-identical between the two templates.** When changing app code or catalogs, apply the same change to both (verify with `diff -r`). Only toolchain files may differ.

## Commands

Run inside a template directory. Node `^22.19 || ^24`, pnpm (`pnpm install` first; lockfiles are intentionally gitignored: templates must not pin dependency trees).

Both templates:

```bash
pnpm dev          # dev server on :8080 (or the next free port) with HMR; the app loads live inside Crowdin
pnpm build        # production build → dist/ (incl. dist/bundle.zip)
pnpm extract      # Lingui: scan src for translatable text, update locales/*.po
pnpm lint         # Biome
pnpm format       # Biome, writes changes
pnpm typecheck    # tsc --noEmit
```

CLI template only: `pnpm run publish` (build + upload bundle to Crowdin; the explicit `run` matters: plain `pnpm publish` triggers pnpm's built-in registry publish and never runs the script). All its scripts delegate to the `crowdin-serverless-apps` binary, which also provides `login`, `create`, `link`, `preview`, `manifest status|pull|push`; see the CLI README.

There are no tests.

## Architecture

### App structure (both templates)

- `manifest.json` declares the app: name, scopes, `modules` (which Crowdin UI slots it fills; here `organization-menu` and `profile-resources-menu`), and `bundle.mode`: `external` (dev: Crowdin loads `http://localhost:8080/app.js` from your machine) vs `internal` (published: Crowdin serves the uploaded `dist/bundle.zip`). The CLI syncs it with the registered app (`manifest push|pull`).
- `src/index.tsx` is the entry point: calls `prepareOrganizationMenu(module)` / `prepareProfileResourcesMenu(module)` from the SDK, one per manifest module.
- `src/modules/dashboard/index.tsx` is a `ModuleContract` (`{ render }`) that mounts React into `#root`, wrapped in `AppI18nProvider` + `AppUiProvider`.
- `src/modules/dashboard/app.tsx` is the actual UI.
- `.env` with `CROWDIN_APP_ID` is the per-developer link to the registered app, written by `create`/`link`, gitignored.

### SDK surface (`@crowdin/serverless-apps-sdk`)

- root exports host-iframe interactions: `prepare*Menu`, `resize()`, `redirect(url)`
- `/api`: `createCrowdinClient()`, a pre-authenticated `@crowdin/crowdin-api-client`
- `/react`: `useCrowdinContext()`, which detects Crowdin vs Enterprise via its `isEnterprise` flag (never infer edition from module type or URL)
- `/ui`: shadcn-style component kit + `theme.css` (imported in `src/styles.css` alongside Tailwind) + `styles.css`
- `/i18n`: `AppI18nProvider`, wires Lingui to the host locale

### i18n (Lingui)

Source strings live in code via macros (`<Trans>`, `<Plural>`, `` t` ` ``); `pnpm extract` regenerates `locales/*.po`. `en-US` is the source locale; other `.po` files hold translations. The build compiles catalogs to `dist/locales/<locale>.json`.

### Standalone toolchain constraints

The host loads the bundle via a **classic `<script>` tag**, not ESM. This drives most of the standalone config:

- Vite library mode, `iife` format, single `dist/app.js`; CSS is injected by JS (`vite-plugin-css-injected-by-js`), no separate stylesheet.
- `process.env.NODE_ENV` is replaced via `define` (an IIFE has no `process`).
- `scripts/dev.mjs` hand-rolls the react-refresh preamble + Vite client bootstrap for `/app.js`, and applies a CORS allowlist (localhost, `*.bundle.crowdin.net`, plus origins from `CROWDIN_DEV_CORS_ORIGIN`).
- `scripts/build.mjs` runs Vite, then `compile-i18n.mjs` (Vite's `emptyOutDir` would wipe the catalogs), then zips `dist/` into `dist/bundle.zip` deterministically (fixed 1980 mtime, since fflate rejects mtime 0).
