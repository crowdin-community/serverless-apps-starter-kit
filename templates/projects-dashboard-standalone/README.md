# Serverless Crowdin app

A frontend-only React app that runs in an iframe inside [Crowdin](https://crowdin.com) / [Crowdin Enterprise](https://crowdin.com/enterprise). There is no backend to deploy: the app talks to the Crowdin API directly through a pre-authenticated client, and Crowdin serves the published bundle.

Scaffolded from the `projects-dashboard-standalone` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). The starter UI is a projects dashboard: it lists the organization's groups and projects with translation progress; replace it with your own app.

The toolchain is part of the project, built on [`@crowdin/serverless-apps-sdk`](https://www.npmjs.com/package/@crowdin/serverless-apps-sdk) alone: `vite.config.ts`, `lingui.config.mjs`, `biome.json`, and the `scripts/{dev,build,compile-i18n}.mjs` scripts are yours to change. The app itself is installed and managed in the Crowdin UI: that is where you upload its app file (`.crowdinapp`: the manifest plus the build) and turn development mode on and off.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- A Crowdin or Crowdin Enterprise account with the app installed

## Getting started

```bash
pnpm install
pnpm dev        # dev server on http://localhost:8080, or the next free port (--port <n> is exact, PORT sets the starting point)
```

Crowdin loads the app straight from the dev server while the app is in **Development mode** with the URL `http://localhost:8080/` (a switch in the app's settings in Crowdin). Everything you edit shows up inside Crowdin instantly, hot reload included: open the app's page in Crowdin; it appears in the UI slots declared in the manifest (here the organization menu and the profile resources menu).

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server on port 8080 (or the next free port) with hot reload; the app loads live inside Crowdin |
| `pnpm build` | Extract strings, build with Vite, compile catalogs, pack `dist/<app-name>.crowdinapp` |
| `pnpm extract` | Scan the source for translatable text and update `locales/*.po` |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

## Publishing

```bash
pnpm build      # produces dist/<app-name>.crowdinapp
```

The app file is named after the manifest's `name`, in lowercase with dashes (`Projects dashboard` → `projects-dashboard.crowdinapp`). It holds `manifest.json` and the build, so one upload updates both.

Open the app's settings in Crowdin, click **Update file**, choose the app file and save. Then turn **Development mode** off so that Crowdin serves the uploaded build. To go back to local development, turn **Development mode** on again.

To install the app for the first time, install it in Crowdin from the same file.

## The manifest

`manifest.json` declares the app to Crowdin: its name, the OAuth scopes it needs and the `modules` (which Crowdin UI slots it fills). It reaches Crowdin inside the app file, so a manifest change (scopes, modules, name, logo) takes effect when you upload a new app file. Keep `scopes` down to what the app's API calls actually need.

Where Crowdin loads the app from is not part of the manifest: it is the app's **Development mode** in Crowdin (on: a URL such as your dev server; off: the uploaded build). The `bundle` field is there for older versions of the CLI; newer ones and Crowdin ignore it.

## Project structure

```
manifest.json                    # app manifest: name, scopes, UI modules
src/
  index.tsx                      # entry: registers a module per manifest slot
  modules/dashboard/index.tsx    # module contract: mounts React into #root
  modules/dashboard/app.tsx      # the UI
  styles.css                     # Tailwind + the SDK theme
locales/*.po                     # Lingui catalogs (en-US is the source locale)
public/logo.svg                  # app logo referenced by the manifest
scripts/dev.mjs                  # dev server: /app.js bootstrap, HMR, CORS allowlist
scripts/build.mjs                # Vite build → compile catalogs → dist/<app-name>.crowdinapp
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
- `scripts/build.mjs` runs Vite first and compiles the translation catalogs after (Vite empties `dist/` on build), then packs `manifest.json` and everything in `dist/` into `dist/<app-name>.crowdinapp` with fixed timestamps so identical input produces an identical archive.

## Learn more

- [Crowdin Developer Portal](https://developer.crowdin.com)
- [`@crowdin/serverless-apps-sdk`](https://www.npmjs.com/package/@crowdin/serverless-apps-sdk): the SDK this app is built on
- [Starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit): the templates this app came from
