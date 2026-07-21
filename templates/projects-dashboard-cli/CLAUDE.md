# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

A serverless Crowdin app: a frontend-only React app that runs in an iframe inside Crowdin / Crowdin Enterprise. There is no backend: the app calls the Crowdin API directly through a pre-authenticated client provided by the SDK.

The [`crowdin-serverless-apps` CLI](https://github.com/crowdin/serverless-apps) (`@crowdin/serverless-apps-cli`) owns the entire toolchain: Vite, Tailwind CSS, Lingui, Biome, and the base tsconfig (`extends: @crowdin/serverless-apps-cli/tsconfig.base.json`). Do not add `vite.config.ts`, `lingui.config.ts`, or `biome.json` unless you deliberately need to override the zero-config defaults (a local `vite.config.ts` is merged with the platform-required settings; a local `lingui.config.ts` replaces the defaults; keep the PO format and the `locales/{locale}` catalog layout).

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # dev server on :8080 with HMR; the app loads live inside Crowdin
pnpm build        # production build → dist/ (incl. dist/bundle.zip)
pnpm run publish  # build + upload dist/bundle.zip + switch the app to the Crowdin-served bundle
pnpm extract      # Lingui: scan src for translatable text, update locales/*.po
pnpm lint         # Biome
pnpm format       # Biome, writes changes
pnpm typecheck    # tsc --noEmit
```

All scripts delegate to the `crowdin-serverless-apps` binary, which also provides `login`, `link`, `preview [--module <key>]`, and `manifest status|pull|push` (run via `npx @crowdin/serverless-apps-cli ...`).

There are no tests.

## Manifest changes: use `manifest push`, not `publish`

`publish` (and `dev`) update **only** where Crowdin loads the bundle from (`bundle.mode` / `bundle.url`: `external` = your dev server, `internal` = the uploaded `dist/bundle.zip`). They do **not** sync the rest of `manifest.json`: scopes, modules, name, logo.

After editing anything else in `manifest.json`, sync it explicitly:

```bash
npx @crowdin/serverless-apps-cli manifest status   # diff local manifest.json vs the registered app
npx @crowdin/serverless-apps-cli manifest push     # apply local manifest.json to Crowdin
npx @crowdin/serverless-apps-cli manifest pull     # overwrite local manifest.json from Crowdin
```

Keep `scopes` least-privilege: declare only what the app's API calls actually need.

## Architecture

- `manifest.json` declares the app to Crowdin: name, scopes, `modules` (which Crowdin UI slots the app fills; here `organization-menu` and `profile-resources-menu`), and the bundle mode (see above).
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
