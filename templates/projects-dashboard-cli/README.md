# Serverless Crowdin app

A frontend-only React app that runs in an iframe inside [Crowdin](https://crowdin.com) / [Crowdin Enterprise](https://crowdin.com/enterprise). There is no backend to deploy: the app talks to the Crowdin API directly through a pre-authenticated client, and Crowdin serves the published bundle.

Scaffolded from the `projects-dashboard-cli` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). The starter UI is a projects dashboard: it lists the organization's groups and projects with translation progress; replace it with your own app.

The [`crowdin-serverless-apps` CLI](https://github.com/crowdin/serverless-apps) owns the toolchain (Vite, Tailwind CSS, Lingui, Biome, base tsconfig), so there are no build config files here; see [Customization](#customization).

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- A Crowdin or Crowdin Enterprise account

## Getting started

```bash
pnpm install
pnpm dev        # the app runs live inside Crowdin with hot reload
```

While `pnpm dev` runs, Crowdin loads the app straight from `http://localhost:8080/`, so everything you edit shows up instantly. Use `npx @crowdin/serverless-apps-cli preview` to open the app's page in Crowdin in the browser.

If this folder was not created via `crowdin-serverless-apps create` (e.g. you cloned it), connect it to an app registered in your Crowdin account first:

```bash
npx @crowdin/serverless-apps-cli login
npx @crowdin/serverless-apps-cli link   # writes CROWDIN_APP_ID to .env (gitignored)
```

No app in Crowdin yet? Run `pnpm install && pnpm build`, install `dist/<app-name>.crowdinapp` in Crowdin, then run `link`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server on port 8080 (or the next free port) with hot reload; the app loads live inside Crowdin |
| `pnpm build` | Production build → `dist/`, packed as `dist/<app-name>.crowdinapp` |
| `pnpm run publish` | Build, send the app file (the manifest and the build) to Crowdin, and switch the app to serve it |
| `pnpm extract` | Scan the source for translatable text and update `locales/*.po` |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Auto-format with Biome |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

Note the explicit `run` in `pnpm run publish`: plain `pnpm publish` invokes pnpm's built-in registry publish and never reaches the script.

The scripts delegate to the `crowdin-serverless-apps` binary, which also provides `login`, `link`, `preview`, and `manifest validate`; see the [CLI README](https://github.com/crowdin/serverless-apps).

## The manifest

`manifest.json` declares the app to Crowdin: its name, the OAuth scopes it needs and the `modules` (which Crowdin UI slots it fills). It reaches Crowdin together with the build, as one app file (`.crowdinapp`), so there is no separate step to sync it:

- `pnpm run publish` sends the manifest and the build in one request.
- `pnpm dev` sends the manifest when it starts, if it differs from the installed one, and again each time you save a valid `manifest.json`.

To check the file without sending it:

```bash
npx @crowdin/serverless-apps-cli manifest validate
```

Where Crowdin loads the app from is not part of the manifest: `dev` points the app at your dev server (development mode), and `publish` offers to switch it back to the build Crowdin hosts. The `bundle` field is there for older versions of the CLI; newer ones and Crowdin ignore it.

Keep `scopes` down to what the app's API calls actually need.

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
.env                             # CROWDIN_APP_ID: your link to the registered app (gitignored)
```

Every module key in `manifest.json` needs a matching `prepare*` call in `src/index.tsx` (`prepareOrganizationMenu`, `prepareProfileResourcesMenu`, …), one per slot.

## Translations (i18n)

Write UI text with Lingui macros (`<Trans>`, `<Plural>`, `` t` ` ``) and run `pnpm extract` to update the `locales/*.po` catalogs. `en-US` is the source locale; translate the other `.po` files (with Crowdin, naturally). The build compiles the catalogs to `dist/locales/<locale>.json`, and the app follows the Crowdin UI language of the person using it.

## Customization

The build needs no configuration: the entry is `src/index.tsx`, the output is `dist/app.js`. To customize it, add a regular `vite.config.ts`; the CLI merges it with the settings the platform requires. Advanced i18n setups can add a `lingui.config.ts`, which replaces the zero-config defaults; keep the PO format and the `locales/{locale}` catalog layout so the CLI can compile the catalogs.

## Learn more

- [Crowdin Developer Portal](https://developer.crowdin.com)
- [`@crowdin/serverless-apps-cli`](https://github.com/crowdin/serverless-apps): the CLI and toolchain
- [Starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit): the templates this app came from
