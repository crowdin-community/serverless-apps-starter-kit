# Agent guide

This file provides guidance to AI coding agents when working with code in this repository. `AGENTS.md` is a symlink to it.

## What this app is

A hosted Crowdin app: a Cloudflare Worker built with `createCloudflareWorker` from `@crowdin/app-project-module/cloudflare` and run by Crowdin. There is no server to operate and no Cloudflare account to configure: Crowdin supplies the database, the file storage, the hostname and the OAuth client variables.

## Commands

Node `^22.19 || ^24`, pnpm (`pnpm install` first).

```bash
pnpm dev          # copies the SDK UI files, then wrangler dev: open /manifest.json to see what the app declares
pnpm build        # crowdin-serverless-apps build: bundles src/ into dist/
pnpm run publish  # crowdin-serverless-apps publish: build, deploy and install the app
pnpm typecheck    # tsc --noEmit
```

Run `publish` with the explicit `run`: plain `pnpm publish` triggers pnpm's built-in registry publish and never runs the script.

`publish` deploys the app and installs it in the Crowdin organization. Add at least one module before the first publish: Crowdin does not install an app without one. After a later publish that changes modules or scopes, the person applies the update in the app settings in Crowdin. The first publish registers the app's OAuth client and needs `CROWDIN_APP_CLIENT_ID` and `CROWDIN_APP_CLIENT_SECRET` in the environment it runs in. An agent's shell never receives variables the person exports in another terminal, so an agent that finds the two variables missing (publish stops and names them) stops and asks the person to do one of two things: run `crowdin-serverless-apps publish` themselves in a terminal, where it prompts for both values, or start the agent from a shell where both are already exported. An agent never asks for the secret in chat and never types it into a command or a file.

The `dev`, `preview` and `manifest` commands of `crowdin-serverless-apps` do not apply to a hosted app. Use `pnpm dev` for local work.

## Architecture

- `src/index.ts` is the whole app. `createCloudflareWorker` takes a function from the environment to the app configuration (`name`, `identifier`, `clientId`, `clientSecret` and the modules). Modules are added to that configuration; the `@crowdin/app-project-module` documentation lists each module and its options. The identifier is also the Worker name in `wrangler.jsonc` and the package name.
- `wrangler.jsonc` is for building and for local development only. Hosted, the `DB`, `FILES` and `ASSETS` bindings, the hostname and the OAuth client variables come from Crowdin. Do not add `account_id`, `routes` or `triggers`.
- `public/` is the static assets directory. The build uploads this folder by name, so do not rename it or change `assets.directory` in `wrangler.jsonc`. `public/assets` is copied from the SDK by `pnpm dev` and `pnpm build` and is not committed. The app logo is `public/logo.png`; without that file the SDK draws a letter logo from the app name.
- Keep `package.json` dependencies to what the Worker imports. `wrangler` is a dev dependency of the project, so the build uses the version pinned here.

There are no tests.
