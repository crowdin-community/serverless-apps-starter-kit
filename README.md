# Crowdin Serverless Apps Starter Kit

[![License](https://img.shields.io/github/license/crowdin-community/serverless-apps-starter-kit?cacheSeconds=3600)](LICENSE)

Starter templates for [serverless Crowdin apps](https://github.com/crowdin/serverless-apps) — frontend-only apps that run inside Crowdin and Crowdin Enterprise without any backend of your own.

These templates are the ones scaffolded by the `create` command of [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli). You can also browse them here to see what a complete serverless app looks like end to end.

## What's inside

Both templates implement the same sample app — a **projects dashboard** that fills the `organization-menu` and `profile-resources-menu` slots in the Crowdin UI: it lists project groups and projects, shows live translation progress per project, supports sorting and navigation through nested groups, and is localized with Lingui (English source, Japanese translation included). It adapts automatically to Crowdin (crowdin.com) vs Crowdin Enterprise.

The two templates differ only in who owns the build toolchain:

| Template | Toolchain | Pick it when |
|----------|-----------|--------------|
| [`templates/projects-dashboard-cli`](templates/projects-dashboard-cli) | Zero-config: [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli) provides Vite, Tailwind CSS, Lingui, Biome, and the base tsconfig. The project contains app code only. | You want the batteries-included path and CLI-managed upgrades |
| [`templates/projects-dashboard-standalone`](templates/projects-dashboard-standalone) | Self-owned: the project carries its own `vite.config.ts`, `lingui.config.mjs`, `biome.json`, and build/dev scripts, built on [`@crowdin/serverless-apps-sdk`](https://www.npmjs.com/package/@crowdin/serverless-apps-sdk) alone. | You need full control over the toolchain or want to integrate an existing setup |

The application source (`src/` and `locales/`) is identical between the two — the templates are a like-for-like comparison of the two toolchain approaches.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io/)
- A [Crowdin](https://crowdin.com/) or [Crowdin Enterprise](https://crowdin.com/enterprise) account

## Quick start

The recommended way to start from these templates is the CLI — it scaffolds the project, registers the app in Crowdin, and links the folder to it:

```bash
npm install --global @crowdin/serverless-apps-cli

crowdin-serverless-apps login
crowdin-serverless-apps create my-app --template projects-dashboard-cli   # or projects-dashboard-standalone
cd my-app
pnpm install
pnpm dev          # the app now runs live inside Crowdin with hot reload
pnpm run publish  # build, upload, and serve the app from Crowdin
```

To work on the templates in this repository directly, run `pnpm install` inside a template directory and use `crowdin-serverless-apps link` to connect it to an app registered in your Crowdin account.

## Commands

Available in both templates:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server on port 8080 with hot reload; the app loads live inside Crowdin |
| `pnpm build` | Production build → `dist/`, packaged as `dist/bundle.zip` |
| `pnpm extract` | Scan the source for translatable text and update `locales/*.po` |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

The CLI template additionally has `pnpm run publish` (build, upload the bundle to Crowdin, and switch the app to serve it). Note the explicit `run`: plain `pnpm publish` invokes pnpm's built-in registry publish, which never reaches the script.

## Anatomy of a template

```
manifest.json                    # app manifest: name, scopes, UI modules, bundle mode
src/
  index.tsx                      # entry: registers a module per manifest slot
  styles.css                     # Tailwind + SDK theme
  modules/dashboard/
    index.tsx                    # ModuleContract: mounts React with SDK providers
    app.tsx                      # the dashboard UI
locales/                         # Lingui .po catalogs (en-US source, ja-JP)
public/logo.png                  # app logo referenced by the manifest
```

Key pieces of the SDK used by the sample app:

- `prepareOrganizationMenu` / `prepareProfileResourcesMenu` — register a module for a manifest slot
- `@crowdin/serverless-apps-sdk/api` — `createCrowdinClient()`, a pre-authenticated [Crowdin API client](https://www.npmjs.com/package/@crowdin/crowdin-api-client)
- `@crowdin/serverless-apps-sdk/react` — `useCrowdinContext()`, including the `isEnterprise` flag
- `@crowdin/serverless-apps-sdk/ui` — the UI component kit and theme
- `@crowdin/serverless-apps-sdk/i18n` — `AppI18nProvider`, wiring Lingui to the host locale
- `resize()` / `redirect()` — iframe-to-host interactions

## License

[MIT](LICENSE) © Crowdin
