# Agent guide

This file provides guidance to AI coding agents when working with code in this repository. `AGENTS.md` is a symlink to it.

## What this app is

A serverless Crowdin app: a frontend-only React app that runs in an iframe inside Crowdin / Crowdin Enterprise. There is no backend: the app calls the Crowdin API directly through a pre-authenticated client provided by the SDK.

The [`crowdin-serverless-apps` CLI](https://github.com/crowdin/serverless-apps) (`@crowdin/serverless-apps-cli`) owns the entire toolchain: Vite, Tailwind CSS, Lingui, Biome, and the base tsconfig (`extends: @crowdin/serverless-apps-cli/tsconfig.base.json`). Do not add `vite.config.ts`, `lingui.config.ts`, or `biome.json` unless you deliberately need to override the zero-config defaults (a local `vite.config.ts` is merged with the platform-required settings; a local `lingui.config.ts` replaces the defaults; keep the PO format and the `locales/{locale}` catalog layout).

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # dev server on :8080 with HMR; the app loads live inside Crowdin
pnpm build        # production build → dist/ (incl. dist/<app-name>.crowdinapp)
pnpm run publish  # build + send the app file (manifest and build) + switch the app to the Crowdin-hosted build
pnpm extract      # Lingui: scan src for translatable text, update locales/*.po
pnpm lint         # Biome
pnpm format       # Biome, writes changes
pnpm typecheck    # tsc --noEmit
```

All scripts delegate to the `crowdin-serverless-apps` binary, which also provides `login`, `link`, `preview [--module <key>]`, and `manifest validate` (run via `npx @crowdin/serverless-apps-cli ...`).

There are no tests.

## Manifest changes travel with the build

`manifest.json` (scopes, modules, name, logo) reaches Crowdin only together with the build, as one app file (`.crowdinapp`). `pnpm run publish` sends both in one request. `pnpm dev` sends the manifest when it starts, if it differs from the installed one, and again on every save of a valid `manifest.json`. There is no `manifest push` any more, so do not look for a separate sync step.

Where Crowdin loads the app from is not part of the manifest: `dev` points the app at your dev server (development mode), `publish` switches it back to the build Crowdin hosts. The `bundle` field in `manifest.json` is kept for older versions of the CLI; newer ones and Crowdin ignore it, so leave it alone.

After editing `manifest.json`, check it:

```bash
npx @crowdin/serverless-apps-cli manifest validate
```

Keep `scopes` least-privilege: declare only what the app's API calls actually need.

## Architecture

- `manifest.json` declares the app to Crowdin: name, scopes and `modules` (which Crowdin UI slots the app fills; here `organization-menu` and `profile-resources-menu`). See above for how it reaches Crowdin.
- `src/index.tsx` is the entry point. One `prepare*` call per manifest module (`prepareOrganizationMenu`, `prepareProfileResourcesMenu`, …); keep these in sync with the `modules` section of `manifest.json`.
- `src/modules/dashboard/index.tsx` is a `ModuleContract` (`{ render }`) that mounts React into `#root`, wrapped in `AppI18nProvider` + `AppUiProvider`.
- `src/modules/dashboard/app.tsx` is the actual UI.
- `.env` with `CROWDIN_APP_ID` is the per-developer link to the registered app, written by `create`/`link`, gitignored.

### SDK surface (`@crowdin/serverless-apps-sdk`)

- root exports host-iframe interactions: `prepare*Menu`, `resize()` (call it after layout changes; the iframe does not grow on its own), `redirect(url)`
- `/api`: `createCrowdinClient()`, a pre-authenticated `@crowdin/crowdin-api-client`; use `.withFetchAll()` on list calls to page through results
- `/react`: `useCrowdinContext()`, which detects Crowdin vs Enterprise via its `isEnterprise` flag (never infer the edition from module type or URL)
- `/ui`: shadcn-style component kit + `theme.css` (imported in `src/styles.css` alongside Tailwind) + `styles.css`
- `/i18n`: `AppI18nProvider`, wires Lingui to the host locale

### i18n (Lingui)

Source strings live in code via macros (`<Trans>`, `<Plural>`, `` t` ` ``); `pnpm extract` regenerates `locales/*.po`. `en-US` is the source locale; other `.po` files hold translations. The build compiles catalogs to `dist/locales/<locale>.json`.
