# Agent guide

This file provides guidance to AI coding agents when working with code in this repository. `AGENTS.md` is a symlink to it.

## What this app is

A hosted Crowdin app: a Cloudflare Worker built with `createCloudflareWorker` from `@crowdin/app-project-module/cloudflare` and run by Crowdin. There is no server to operate and no Cloudflare account to configure: Crowdin supplies the database, the file storage, the hostname and the OAuth client variables.

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # copies the SDK UI files, then wrangler dev: open /manifest.json to see what the app declares (needs .dev.vars)
pnpm build        # crowdin-serverless-apps build: bundles src/ into dist/
pnpm run publish  # crowdin-serverless-apps publish: build, deploy and install the app
pnpm logs         # crowdin-serverless-apps logs: what the deployed app wrote to the console, its errors and its requests
pnpm typecheck    # tsc --noEmit
pnpm exec crowdin-serverless-apps manifest validate  # checks `scopes` against the Crowdin API calls in src/; publish runs it first
```

Run `publish` with the explicit `run`: plain `pnpm publish` triggers pnpm's built-in registry publish and never runs the script.

`publish` deploys the app and installs it in the Crowdin organization. Add at least one module before the first publish: Crowdin does not install an app without one. After a later publish that changes modules or scopes, the person applies the update in the app settings in Crowdin; a scope that is new to the app is first added to the app's OAuth app in Crowdin, by the person.

The first publish also creates the app's OAuth app in Crowdin, with the scopes that `scopes` in `src/index.ts` lists. A `crowdin-serverless-apps login` covers `project` scopes. An app that lists any other scope needs, for its first publish only, a personal access token with those scopes, `oauth-client` and `application` in `CROWDIN_PERSONAL_TOKEN`. That run is the person's, in their own terminal: an agent never asks for a token or a secret in chat and never types one into a command or a file.

The `dev`, `preview`, `link` and `extract` commands of `crowdin-serverless-apps` do not apply to a hosted app. Use `pnpm dev` for local work. It reads `CROWDIN_CLIENT_ID` and `CROWDIN_CLIENT_SECRET` from `.dev.vars`, which is not committed, and answers with an error when they are missing. To read the manifest, the placeholder value `local` for both is enough; an agent writes only such placeholders there, never a real secret.

## Architecture

- `src/index.ts` is the whole app. `createCloudflareWorker` takes a function from the environment to the app configuration (`name`, `identifier`, `clientId`, `clientSecret`, `scopes` and the modules). Modules are added to that configuration; the `@crowdin/app-project-module` documentation lists each module and its options. The identifier is not in the code: Crowdin gives it to the app as the `APP_IDENTIFIER` variable, so keep `identifier: env.APP_IDENTIFIER`. For local work the value comes from `vars` in `wrangler.jsonc`.
- `wrangler.jsonc` is for building and for local development only. Hosted, the `DB`, `FILES` and `ASSETS` bindings, the hostname, the app identifier and the OAuth client variables come from Crowdin. Do not add `account_id`, `routes` or `triggers`.
- `public/` is the static assets directory. The build uploads this folder by name, so do not rename it or change `assets.directory` in `wrangler.jsonc`. `public/assets` is copied from the SDK by `pnpm dev` and `pnpm build` and is not committed. The app logo is `public/logo.png`; without that file the SDK draws a letter logo from the app name.
- Keep `package.json` dependencies to what the Worker imports. `wrangler` is a dev dependency of the project, so the build uses the version pinned here. `@crowdin/serverless-apps-cli` is a dev dependency too: it provides `build`, `publish` and `logs`.

There are no tests.
