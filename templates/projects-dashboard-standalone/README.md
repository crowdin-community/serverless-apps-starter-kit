# Serverless Crowdin app

A frontend-only React app that runs in an iframe inside [Crowdin](https://crowdin.com) / [Crowdin Enterprise](https://crowdin.com/enterprise). There is no backend to deploy: the app talks to the Crowdin API directly through a pre-authenticated client, and Crowdin serves the published bundle.

Scaffolded from the `projects-dashboard-standalone` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). The starter UI is a projects dashboard: it lists the organization's groups and projects with translation progress; replace it with your own app.

The toolchain is part of the project, built on [`@crowdin/serverless-apps-sdk`](https://www.npmjs.com/package/@crowdin/serverless-apps-sdk) alone: `vite.config.ts`, `lingui.config.mjs`, `biome.json`, and the `scripts/{dev,build,compile-i18n}.mjs` scripts are yours to change. The app itself is registered and managed in the Crowdin UI: that is where you upload the bundle and edit the manifest.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- A Crowdin or Crowdin Enterprise account with the app registered

## Getting started

```bash
pnpm install
pnpm dev        # dev server on http://localhost:8080 (pass --port <n> or set PORT to change)
```

Crowdin loads the app straight from the dev server while the registered app's bundle is set to `external` → `http://localhost:8080/`. Everything you edit shows up inside Crowdin instantly, hot reload included: open the app's page in Crowdin; it appears in the UI slots declared in the manifest (here the organization menu and the profile resources menu).

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server on port 8080 with hot reload; the app loads live inside Crowdin |
| `pnpm build` | Extract strings, build with Vite, compile catalogs, package `dist/bundle.zip` |
| `pnpm extract` | Scan the source for translatable text and update `locales/*.po` |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

## Publishing

```bash
pnpm build      # produces dist/bundle.zip
```

Upload `dist/bundle.zip` in the Crowdin UI where the app is registered and switch the app's bundle to the uploaded archive (`internal` mode). To go back to local development, point the bundle back at your dev server (`external` → `http://localhost:8080/`).

## The manifest

`manifest.json` declares the app to Crowdin: its name, the OAuth scopes it needs, the `modules` (which Crowdin UI slots it fills), and the bundle, which is either `external` (Crowdin loads the app from a URL) or `internal` (Crowdin serves the uploaded `dist/bundle.zip`).

Manifest changes (scopes, modules, name, logo, bundle mode) are applied in the Crowdin UI; keep the local `manifest.json` matching the registered app: it is the source of truth for what the code must register. Keep `scopes` down to what the app's API calls actually need.

## Project structure

```
manifest.json                    # app manifest: name, scopes, UI modules, bundle mode
src/
  index.tsx                      # entry: registers a module per manifest slot
  modules/dashboard/index.tsx    # module contract: mounts React into #root
  modules/dashboard/app.tsx      # the UI
  styles.css                     # Tailwind + the SDK theme
locales/*.po                     # Lingui catalogs (en-US is the source locale)
public/logo.png                  # app logo referenced by the manifest
scripts/dev.mjs                  # dev server: /app.js bootstrap, HMR, CORS allowlist
scripts/build.mjs                # Vite build → compile catalogs → dist/bundle.zip
scripts/compile-i18n.mjs         # compiles locales/*.po → dist/locales/<locale>.json
vite.config.ts                   # library mode, single IIFE dist/app.js, CSS injected by JS
lingui.config.mjs                # locales list, PO catalogs
biome.json                       # lint/format rules
```

Every module key in `manifest.json` needs a matching `prepare*` call in `src/index.tsx` (`prepareOrganizationMenu`, `prepareProfileResourcesMenu`, …), one per slot.

## Translations (i18n)

Write UI text with Lingui macros (`<Trans>`, `<Plural>`, `` t` ` ``) and run `pnpm extract` to update the `locales/*.po` catalogs. Locales are declared in `lingui.config.mjs` (`en-US` is the source locale); to add one, extend the `locales` array there and run `pnpm extract`. Translate the `.po` files (with Crowdin, naturally); the build compiles them to `dist/locales/<locale>.json`, and the app follows the Crowdin UI language of the person using it.

## How the toolchain works

Crowdin loads the bundle via a classic `<script>` tag, not ESM. That constraint shapes the setup:

- Vite runs in library mode and emits a single `dist/app.js` IIFE; CSS is injected by JS at runtime, so there is no separate stylesheet to declare.
- In dev, `scripts/dev.mjs` serves `/app.js` as a small bootstrap that wires up react-refresh and the Vite client, so hot reload works inside the Crowdin iframe. Cross-origin requests are limited to localhost and `*.bundle.crowdin.net`; add extra origins via the `CROWDIN_DEV_CORS_ORIGIN` env variable.
- `scripts/build.mjs` runs Vite first and compiles the translation catalogs after (Vite empties `dist/` on build), then zips everything into `dist/bundle.zip` with fixed timestamps so identical input produces an identical archive.

## Learn more

- [Crowdin Developer Portal](https://developer.crowdin.com)
- [`@crowdin/serverless-apps-sdk`](https://www.npmjs.com/package/@crowdin/serverless-apps-sdk): the SDK this app is built on
- [Starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit): the templates this app came from
