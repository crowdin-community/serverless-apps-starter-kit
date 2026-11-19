# Hosted Crowdin app

A Crowdin app that Crowdin hosts for you. The app is a [Cloudflare Worker](https://developers.cloudflare.com/workers/) built with `createCloudflareWorker` from [`@crowdin/app-project-module`](https://www.npmjs.com/package/@crowdin/app-project-module), so there is no server to run and no Cloudflare account to set up.

Scaffolded from the `hosted-base` template of the [serverless apps starter kit](https://github.com/crowdin-community/serverless-apps-starter-kit). It declares no modules yet: add the ones your app needs in `src/index.ts`.

## Requirements

- Node.js `^22.19 || ^24`
- [pnpm](https://pnpm.io)
- A Crowdin or Crowdin Enterprise account

## Getting started

```bash
pnpm install
pnpm dev        # runs the app locally with wrangler
```

`pnpm dev` reads the app's OAuth client from a `.dev.vars` file, which is not committed. Without it the app answers with an error. Create the file before the first run:

```txt
CROWDIN_CLIENT_ID=local
CROWDIN_CLIENT_SECRET=local
```

These placeholder values are enough to look at the app: while `pnpm dev` runs, open the address it prints followed by `/manifest.json` to see what the app declares to Crowdin.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run the app locally with `wrangler dev` |
| `pnpm build` | Bundle `src/` into `dist/` |
| `pnpm run publish` | Build, deploy the app and install it in your Crowdin organization |
| `pnpm logs` | Show what the deployed app wrote to the console, its errors and its requests |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |

Note the explicit `run` in `pnpm run publish`: plain `pnpm publish` invokes pnpm's built-in registry publish and never reaches the script.

`build`, `publish` and `logs` are commands of [`@crowdin/serverless-apps-cli`](https://www.npmjs.com/package/@crowdin/serverless-apps-cli), a dev dependency of the app. `pnpm logs` shows the last 15 minutes; options go after the command, for example `pnpm logs --minutes 120 --search timeout`.

The first publish also creates the app's OAuth app in Crowdin, with the scopes that `scopes` in `src/index.ts` lists. Crowdin gives an OAuth app only scopes that your token has:

- After `crowdin-serverless-apps login`, the first publish works for an app that lists `project` scopes or none.
- An app that lists other scopes needs a personal access token with those scopes, `oauth-client` and `application` for its first publish. Create it in Crowdin and export it in your own terminal:

```bash
export CROWDIN_PERSONAL_TOKEN=...
pnpm run publish
```

Later publishes work with the login. On Crowdin Enterprise only an organization admin can publish. Never paste a token into a chat with an AI agent: run that first publish yourself.

To use an OAuth app that you created in Crowdin yourself, export `CROWDIN_APP_CLIENT_ID` and `CROWDIN_APP_CLIENT_SECRET` before the first publish.

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
