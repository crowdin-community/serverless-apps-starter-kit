# Hosted Crowdin app

A Crowdin app that Crowdin hosts for you. The app is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) built with `createCloudflareWorker` from [`@crowdin/app-project-module`](https://www.npmjs.com/package/@crowdin/app-project-module), so there is no server to run and no Cloudflare account to set up.

Scaffolded from the `hosted-base` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). It declares no modules yet: add the ones your app needs in `src/index.ts`.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- The [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli) for `build` and `publish`
- A Crowdin or Crowdin Enterprise account

## Getting started

```bash
pnpm install
pnpm dev        # runs the app locally with wrangler
```

While `pnpm dev` runs, open the address it prints followed by `/manifest.json` to see what the app declares to Crowdin.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run the app locally with `wrangler dev` |
| `pnpm build` | Bundle `src/` into `dist/` |
| `pnpm run publish` | Build, deploy the app and install it in your Crowdin organization |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

Note the explicit `run` in `pnpm run publish`: plain `pnpm publish` invokes pnpm's built-in registry publish and never reaches the script.

The first publish registers the app's OAuth client and needs `CROWDIN_APP_CLIENT_ID` and `CROWDIN_APP_CLIENT_SECRET`. Run it in a terminal and it prompts for both values, or export them first:

```bash
export CROWDIN_APP_CLIENT_ID=...
export CROWDIN_APP_CLIENT_SECRET=...
pnpm run publish
```

An AI agent's shell does not receive variables you export in another terminal. When an agent publishes for you, either run the first publish yourself in a terminal, or start the agent from a shell where both variables are already exported. Never paste the secret into the chat.

## Adding modules

Modules are properties of the configuration returned in `src/index.ts`, for example `projectTools`, `organizationMenu` or `customMT`. The [Crowdin Apps documentation](https://crowdin.github.io/app-project-module/) describes every module and its options. Routes of your own go in the `setup` option of `createCloudflareWorker`.

## Project layout

```
src/
  index.ts           # the app: configuration and modules
public/              # static files; add logo.png for the app logo
  assets/            # SDK UI files, copied by dev and build (not committed)
wrangler.jsonc       # build and local-dev configuration
```
